#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'
const artifactName = 'operator-assignment-current-head-coherence'
const required = process.env.CHECK_OPERATOR_ASSIGNMENT_CURRENT_HEAD_COHERENCE_REQUIRED === 'true'
const checkCurrentRun = process.env.CHECK_CURRENT_GITHUB_RUN_ARTIFACTS === 'true'
const source = process.env.CHECK_OPERATOR_ASSIGNMENT_CURRENT_HEAD_COHERENCE_SOURCE || (checkCurrentRun ? 'github' : 'local')
const targetAssignmentPath = 'deploy/runtime-production/remote-assignment.local.json'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function run(cmd, args, options = {}) {
  return execFileSync(cmd, args, {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    timeout: options.timeout || 30000,
    env: process.env,
  })
}

function currentHead() {
  if (process.env.RUNTIME_IMAGE_HEAD_SHA) return process.env.RUNTIME_IMAGE_HEAD_SHA.trim()
  try {
    return run('git', ['rev-parse', 'HEAD']).trim()
  } catch {
    return 'source-workspace-no-git'
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function readRel(relPath) {
  return readFileSync(join(root, relPath), 'utf8')
}

function readJsonRel(relPath) {
  return JSON.parse(readRel(relPath))
}

function assertIncludes(relPath, terms) {
  const body = readRel(relPath)
  for (const term of terms) assert(body.includes(term), `${relPath} must include ${term}`)
}

function collectFiles(dir) {
  const files = []
  function walk(current) {
    const stat = statSync(current)
    if (stat.isFile()) {
      files.push(current)
      return
    }
    for (const child of readdirSync(current)) walk(join(current, child))
  }
  if (existsSync(dir)) walk(dir)
  return files
}

function latestArtifact(prefix, predicate = null, label = prefix) {
  assert(existsSync(artifactDir), 'runtime artifact directory is missing; run root runtime gates first')
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .map(name => join(artifactDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  for (const file of files) {
    const payload = readJson(file)
    if (!predicate || predicate(payload)) return { file, payload }
  }
  throw new Error(`missing ${label} artifact`)
}

function rel(file) {
  return relative(root, file)
}

function githubRun(runId) {
  return JSON.parse(run('gh', ['api', `repos/${repo}/actions/runs/${runId}`]))
}

function downloadGithubCoherence(runId) {
  const dir = mkdtempSync(join(tmpdir(), 'p132-current-head-'))
  try {
    run('gh', ['run', 'download', String(runId), '--repo', repo, '--name', artifactName, '--dir', dir], {
      timeout: 60000,
    })
    const jsonFiles = collectFiles(dir)
      .filter(file => /operator-assignment-current-head-coherence-.*\.json$/.test(file))
      .sort()
    assert(jsonFiles.length === 1, `expected exactly one P132 JSON in GitHub artifact, got ${jsonFiles.length}`)
    return {
      dir,
      jsonPath: jsonFiles[0],
      cleanup: () => rmSync(dir, { recursive: true, force: true }),
    }
  } catch (error) {
    rmSync(dir, { recursive: true, force: true })
    throw error
  }
}

function scanNoPrivateTerms(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL=(?!<)/,
    /postgres(ql)?:\/\/[^<]/i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/,
    /dev-local-token/,
    /NARRATIVEOS_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/,
    /MASTRA_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/,
    /NARRATIVEOS_CREATOR_API_KEY\s*[:=]\s*(?!<)/,
    /Authorization:\s*Bearer\s+(?!<shared-tool-bridge-secret>)/i,
    /system prompt/i,
    /provider prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
    /sourceRefs/,
    /source_refs/,
    /profile\.id/,
    /kernel\.id/,
    /prompt_id/,
    /prompt_version/,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function validateCoherence(payload, expectedHeadSha) {
  assert(payload.version === 1, 'P132 artifact version must be 1')
  assert(payload.gate === 'P132_OPERATOR_ASSIGNMENT_CURRENT_HEAD_COHERENCE', 'P132 artifact gate mismatch')
  if (payload.status === 'skipped_not_current_goal') {
    assert(payload.repository === repo, 'P132 repository mismatch')
    assert(payload.headSha === expectedHeadSha, `P132 headSha must match expected head ${expectedHeadSha}`)
    assert(payload.selectedGoal && payload.selectedGoal !== 'operator-assignment-evidence-intake', 'P132 skipped artifact must name the advanced selected goal')
    assert(payload.reason === 'P121 has advanced beyond operator-assignment-evidence-intake', 'P132 skipped reason mismatch')
    assert(payload.evidence?.loopNextGoalLedger?.selectedGoal === payload.selectedGoal, 'P132 skipped ledger selected goal mismatch')
    assert(payload.boundary?.writesLocalAssignment === false, 'P132 must not write local assignment')
    assert(payload.boundary?.createsRemoteServices === false, 'P132 must not create remote services')
    assert(payload.boundary?.setsGitHubVariables === false, 'P132 must not set GitHub variables')
    assert(payload.boundary?.storesProviderSecrets === false, 'P132 must not store provider secrets')
    assert(payload.boundary?.promotesLiveRuntime === false, 'P132 must not promote live runtime')
    const privateHits = scanNoPrivateTerms(payload)
    assert(privateHits.length === 0, `P132 artifact leaked private terms: ${privateHits.join(', ')}`)
    return
  }
  assert(payload.status === 'passed', 'P132 artifact status mismatch')
  assert(payload.repository === repo, 'P132 repository mismatch')
  assert(payload.headSha === expectedHeadSha, `P132 headSha must match expected head ${expectedHeadSha}`)
  assert(payload.selectedGoal === 'operator-assignment-evidence-intake', 'P132 selected goal mismatch')
  assert(payload.targetAssignmentPath === targetAssignmentPath, 'P132 target assignment path mismatch')
  assert(payload.currentImages?.api?.endsWith(`:${expectedHeadSha}`), 'P132 API image must use current head')
  assert(payload.currentImages?.agent?.endsWith(`:${expectedHeadSha}`), 'P132 Agent image must use current head')
  assert(payload.evidence?.runtimeImages?.headSha === expectedHeadSha, 'P132 runtime image evidence head mismatch')
  assert(payload.evidence?.imageDrift?.currentHead === expectedHeadSha, 'P132 image drift currentHead mismatch')
  assert(
    ['remote_assignment_images_current', 'remote_assignment_local_absent'].includes(payload.evidence?.imageDrift?.decision),
    'P132 image drift decision must be current or waiting for local assignment',
  )
  if (payload.evidence?.imageDrift?.decision === 'remote_assignment_local_absent') {
    assert(payload.assignmentState?.localAssignmentFilePresent === false, 'P132 waiting mode requires missing local assignment')
    assert(payload.evidence?.operatorReturnIntake?.decision === 'operator_return_waiting_for_assignment', 'P132 waiting mode requires P120 waiting decision')
    assert(payload.evidence?.operatorReturnIntake?.assignmentFilePresent === false, 'P132 waiting mode requires P120 missing assignment file')
    assert(payload.evidence?.operatorAssignmentIntake?.assignmentFilePresent === false, 'P132 waiting mode requires P123 missing assignment file')
  }
  assert(payload.evidence?.operatorReadinessPacket?.headSha === expectedHeadSha, 'P132 P119 head mismatch')
  assert(payload.evidence?.operatorReturnIntake?.headSha === expectedHeadSha, 'P132 P120 head mismatch')
  assert(payload.evidence?.operatorAssignmentIntake?.headSha === expectedHeadSha, 'P132 P123 head mismatch')
  assert(payload.evidence?.loopNextGoalLedger?.selectedGoal === 'operator-assignment-evidence-intake', 'P132 P121 selected goal mismatch')
  assert(payload.evidence?.commandConsistency?.sourceLedgerArtifact === payload.evidence?.loopNextGoalLedger?.file, 'P132 P130 must point at current P121 ledger')
  assert(payload.evidence?.commandConsistencyAttestation?.packetPath === payload.evidence?.commandConsistency?.file, 'P132 P131 must attest current P130 artifact')
  assert(payload.boundary?.writesLocalAssignment === false, 'P132 must not write local assignment')
  assert(payload.boundary?.createsRemoteServices === false, 'P132 must not create remote services')
  assert(payload.boundary?.setsGitHubVariables === false, 'P132 must not set GitHub variables')
  assert(payload.boundary?.storesProviderSecrets === false, 'P132 must not store provider secrets')
  assert(payload.boundary?.promotesLiveRuntime === false, 'P132 must not promote live runtime')
  const privateHits = scanNoPrivateTerms(payload)
  assert(privateHits.length === 0, `P132 artifact leaked private terms: ${privateHits.join(', ')}`)
}

function assertStaticWiring() {
  const packageJson = readJsonRel('package.json')
  const rootTest = String(packageJson.scripts.test || '')
  assert(
    packageJson.scripts['check:operator-assignment-current-head-coherence'] === 'node scripts/check-operator-assignment-current-head-coherence.mjs',
    'package.json must expose check:operator-assignment-current-head-coherence',
  )
  assert(
    rootTest.includes('npm run check:operator-assignment-loop-command-consistency-artifact && npm run check:operator-assignment-current-head-coherence && npm run check:operator-assignment-transition-fixture && npm run check:operator-assignment-transition-fixture-artifact && npm run audit:dependencies'),
    'root test must run P132 after P131, then P133 before dependency audit',
  )
  for (const file of [
    'docs/backend/P132_OPERATOR_ASSIGNMENT_CURRENT_HEAD_COHERENCE.md',
    'docs/backend/P121_LOOP_NEXT_GOAL_LEDGER.md',
    'docs/backend/P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE.md',
    'docs/backend/P130_OPERATOR_ASSIGNMENT_LOOP_COMMAND_CONSISTENCY.md',
    'docs/backend/P131_OPERATOR_ASSIGNMENT_COMMAND_CONSISTENCY_ARTIFACT_ATTESTATION.md',
    '.github/workflows/pages.yml',
  ]) {
    assert(existsSync(join(root, file)), `missing P132 prerequisite: ${file}`)
  }
  assertIncludes('docs/backend/P132_OPERATOR_ASSIGNMENT_CURRENT_HEAD_COHERENCE.md', [
    'P132 Operator Assignment Current-Head Coherence',
    'check:operator-assignment-current-head-coherence',
    artifactName,
    'P119',
    'P120',
    'P121',
    'P123',
    'P130',
    'P131',
    'current head',
    'does not write',
  ])
  assertIncludes('docs/backend/P121_LOOP_NEXT_GOAL_LEDGER.md', ['P132'])
  assertIncludes('docs/backend/P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE.md', ['P132'])
  assertIncludes('docs/backend/P130_OPERATOR_ASSIGNMENT_LOOP_COMMAND_CONSISTENCY.md', ['P132'])
  assertIncludes('docs/backend/P131_OPERATOR_ASSIGNMENT_COMMAND_CONSISTENCY_ARTIFACT_ATTESTATION.md', ['P132'])
  assertIncludes('.github/workflows/pages.yml', [
    'Upload operator assignment current-head coherence',
    artifactName,
    'artifacts/runtime/operator-assignment-current-head-coherence-*.json',
    'Check operator assignment current-head coherence artifact content',
    'CHECK_OPERATOR_ASSIGNMENT_CURRENT_HEAD_COHERENCE_REQUIRED: true',
    'npm run check:operator-assignment-current-head-coherence',
  ])
}

function buildLocalCoherence() {
  const headSha = currentHead()
  assert(headSha !== 'source-workspace-no-git', 'P132 requires git head in release repo mode')
  const currentP121 = latestArtifact(
    'loop-next-goal-ledger-',
    payload => payload.gate === 'P121_LOOP_NEXT_GOAL_LEDGER'
      && (payload.headSha === headSha || !payload.headSha),
    'current P121 loop next-goal ledger',
  )
  if (currentP121.payload.selectedGoal?.id !== 'operator-assignment-evidence-intake') {
    const payload = {
      version: 1,
      gate: 'P132_OPERATOR_ASSIGNMENT_CURRENT_HEAD_COHERENCE',
      status: 'skipped_not_current_goal',
      generatedAt: new Date().toISOString(),
      repository: repo,
      headSha,
      selectedGoal: currentP121.payload.selectedGoal?.id || null,
      reason: 'P121 has advanced beyond operator-assignment-evidence-intake',
      targetAssignmentPath,
      evidence: {
        loopNextGoalLedger: {
          file: rel(currentP121.file),
          selectedGoal: currentP121.payload.selectedGoal?.id || null,
        },
      },
      boundary: {
        writesLocalAssignment: false,
        createsRemoteServices: false,
        setsGitHubVariables: false,
        storesProviderSecrets: false,
        promotesLiveRuntime: false,
        emitsProviderPromptPlumbing: false,
        emitsPrivateTitleMaterial: false,
      },
    }
    validateCoherence(payload, headSha)
    mkdirSync(artifactDir, { recursive: true })
    const path = join(artifactDir, `operator-assignment-current-head-coherence-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
    writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`)
    return { payload, path, mode: 'local', runId: null, runUrl: null }
  }

  const runtimeImages = latestArtifact(
    'runtime-image-publish-evidence-',
    payload => payload.headSha === headSha && payload.status === 'passed',
    'current P72 runtime image evidence',
  )
  const imageDrift = latestArtifact(
    'remote-assignment-image-drift-',
    payload => payload.currentHead === headSha
      && ['remote_assignment_images_current', 'remote_assignment_local_absent'].includes(payload.decision)
      && payload.imageDriftDetected === false,
    'current P113 image drift evidence',
  )
  const p119 = latestArtifact(
    'remote-operator-readiness-packet-',
    payload => payload.gate === 'P119_REMOTE_OPERATOR_READINESS_PACKET' && payload.headSha === headSha,
    'current P119 operator readiness packet',
  )
  const actualLocalAssignmentFilePresent = existsSync(join(root, targetAssignmentPath))
  assert(
    imageDrift.payload.localAssignmentFilePresent === actualLocalAssignmentFilePresent,
    'P132 requires P113 local assignment file presence to match current workspace state',
  )
  const p120 = latestArtifact(
    'remote-operator-return-intake-',
    payload => payload.gate === 'P120_REMOTE_OPERATOR_RETURN_INTAKE' && payload.headSha === headSha,
    'current P120 operator return intake',
  )
  const p121 = latestArtifact(
    'loop-next-goal-ledger-',
    payload => payload.gate === 'P121_LOOP_NEXT_GOAL_LEDGER'
      && payload.selectedGoal?.id === 'operator-assignment-evidence-intake'
      && payload.sourceEvidence?.operatorReadinessPacket?.file === rel(p119.file)
      && payload.sourceEvidence?.operatorReturnIntake?.file === rel(p120.file)
      && payload.sourceEvidence?.imageDrift?.file === rel(imageDrift.file),
    'current P121 loop next-goal ledger',
  )
  const p123 = latestArtifact(
    'operator-assignment-evidence-intake-',
    payload => payload.gate === 'P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE'
      && payload.headSha === headSha
      && payload.sourceEvidence?.loopNextGoalLedger?.file === rel(p121.file)
      && payload.sourceEvidence?.operatorReturnIntake?.file === rel(p120.file)
      && payload.sourceEvidence?.imageDrift?.file === rel(imageDrift.file),
    'current P123 operator assignment evidence intake',
  )
  const p130 = latestArtifact(
    'operator-assignment-loop-command-consistency-',
    payload => payload.gate === 'P130_OPERATOR_ASSIGNMENT_LOOP_COMMAND_CONSISTENCY'
      && payload.sourceReadinessPacketArtifact === rel(p119.file)
      && payload.sourceLedgerArtifact === rel(p121.file),
    'current P130 command consistency artifact',
  )
  const p131 = latestArtifact(
    'operator-assignment-loop-command-consistency-attestation-',
    payload => payload.gate === 'P131_OPERATOR_ASSIGNMENT_COMMAND_CONSISTENCY_ARTIFACT_ATTESTATION'
      && payload.expectedHeadSha === headSha
      && payload.packet?.path === rel(p130.file),
    'current P131 command consistency artifact attestation',
  )

  const payload = {
    version: 1,
    gate: 'P132_OPERATOR_ASSIGNMENT_CURRENT_HEAD_COHERENCE',
    status: 'passed',
    generatedAt: new Date().toISOString(),
    repository: repo,
    headSha,
    selectedGoal: p121.payload.selectedGoal.id,
    targetAssignmentPath,
    currentImages: {
      api: runtimeImages.payload.images?.find(image => image.includes('-api:')) || null,
      agent: runtimeImages.payload.images?.find(image => image.includes('-agent-runtime:')) || null,
    },
    evidence: {
      runtimeImages: {
        file: rel(runtimeImages.file),
        headSha: runtimeImages.payload.headSha,
        runId: runtimeImages.payload.runId,
      },
      imageDrift: {
        file: rel(imageDrift.file),
        currentHead: imageDrift.payload.currentHead,
        decision: imageDrift.payload.decision,
        localAssignmentFilePresent: imageDrift.payload.localAssignmentFilePresent,
      },
      operatorReadinessPacket: {
        file: rel(p119.file),
        headSha: p119.payload.headSha,
        decision: p119.payload.decision,
      },
      operatorReturnIntake: {
        file: rel(p120.file),
        headSha: p120.payload.headSha,
        decision: p120.payload.decision,
        assignmentFilePresent: p120.payload.assignmentFilePresent,
      },
      loopNextGoalLedger: {
        file: rel(p121.file),
        selectedGoal: p121.payload.selectedGoal.id,
      },
      operatorAssignmentIntake: {
        file: rel(p123.file),
        headSha: p123.payload.headSha,
        selectedGoal: p123.payload.selectedGoal,
        assignmentFilePresent: p123.payload.assignmentFilePresent,
      },
      commandConsistency: {
        file: rel(p130.file),
        sourceReadinessPacketArtifact: p130.payload.sourceReadinessPacketArtifact,
        sourceLedgerArtifact: p130.payload.sourceLedgerArtifact,
      },
      commandConsistencyAttestation: {
        file: rel(p131.file),
        expectedHeadSha: p131.payload.expectedHeadSha,
        packetPath: p131.payload.packet?.path,
      },
    },
    boundary: {
      writesLocalAssignment: false,
      createsRemoteServices: false,
      setsGitHubVariables: false,
      storesProviderSecrets: false,
      promotesLiveRuntime: false,
      emitsProviderPromptPlumbing: false,
      emitsPrivateTitleMaterial: false,
    },
    assignmentState: {
      localAssignmentFilePresent: actualLocalAssignmentFilePresent,
      mode: imageDrift.payload.decision === 'remote_assignment_local_absent'
        ? 'waiting_for_operator_assignment'
        : 'assignment_images_current',
    },
  }
  validateCoherence(payload, headSha)
  mkdirSync(artifactDir, { recursive: true })
  const path = join(artifactDir, `operator-assignment-current-head-coherence-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`)
  return { payload, path, mode: 'local', runId: null, runUrl: null }
}

let downloaded
try {
  let result
  assertStaticWiring()
  if (source === 'github') {
    const runId = String(process.env.GITHUB_RUN_ID || process.env.CHECK_GITHUB_ARTIFACTS_RUN_ID || '').trim()
    if (!runId) {
      if (required) throw new Error('GitHub artifact mode requires GITHUB_RUN_ID or CHECK_GITHUB_ARTIFACTS_RUN_ID')
      console.log(JSON.stringify({ status: 'skipped', reason: 'missing_github_run_id', required }, null, 2))
      process.exit(0)
    }
    const runInfo = githubRun(runId)
    downloaded = downloadGithubCoherence(runId)
    const payload = readJson(downloaded.jsonPath)
    validateCoherence(payload, runInfo.head_sha)
    result = { payload, path: downloaded.jsonPath, mode: 'github_current_run', runId, runUrl: runInfo.html_url }
  } else {
    result = buildLocalCoherence()
  }

  console.log(JSON.stringify({
    status: result.payload.status,
    gate: result.payload.gate,
    mode: result.mode,
    runId: result.runId,
    headSha: result.payload.headSha,
    selectedGoal: result.payload.selectedGoal,
    artifactPath: result.mode === 'local' ? rel(result.path) : artifactName,
  }, null, 2))
} finally {
  downloaded?.cleanup?.()
}
