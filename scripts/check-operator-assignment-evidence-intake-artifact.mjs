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
const required = process.env.CHECK_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE_ARTIFACT_REQUIRED === 'true'
const checkCurrentRun = process.env.CHECK_CURRENT_GITHUB_RUN_ARTIFACTS === 'true'
const source = process.env.CHECK_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE_ARTIFACT_SOURCE || (checkCurrentRun ? 'github' : 'local')
const artifactName = 'operator-assignment-evidence-intake'
const targetAssignmentPath = 'deploy/runtime-production/remote-assignment.local.json'
const preferredAssignmentPath = 'deploy/runtime-production/runtime-assignment.intent.local.json'
const edgeOnlyExampleAssignmentPath = 'deploy/runtime-production/runtime-assignment.intent.example.json'
const generatedContractPath = 'deploy/runtime-production/generated/remote-assignment.contract.json'

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

function latestLocalPacket() {
  if (!existsSync(artifactDir)) return null
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith('operator-assignment-evidence-intake-') && !name.startsWith('operator-assignment-evidence-intake-attestation-') && name.endsWith('.json'))
    .sort()
  return files.length ? join(artifactDir, files[files.length - 1]) : null
}

function githubRun(runId) {
  return JSON.parse(run('gh', ['api', `repos/${repo}/actions/runs/${runId}`]))
}

function downloadGithubPacket(runId) {
  const dir = mkdtempSync(join(tmpdir(), 'p124-operator-assignment-'))
  try {
    run('gh', ['run', 'download', String(runId), '--repo', repo, '--name', artifactName, '--dir', dir], {
      timeout: 60000,
    })
    const jsonFiles = collectFiles(dir)
      .filter(file => /operator-assignment-evidence-intake-.*\.json$/.test(file))
      .filter(file => !/operator-assignment-evidence-intake-attestation-.*\.json$/.test(file))
      .sort()
    assert(jsonFiles.length === 1, `expected exactly one P123 JSON in GitHub artifact, got ${jsonFiles.length}`)
    const markdownFiles = collectFiles(dir)
      .filter(file => /operator-assignment-evidence-intake-.*\.md$/.test(file))
      .sort()
    assert(markdownFiles.length === 1, `expected exactly one P123 Markdown in GitHub artifact, got ${markdownFiles.length}`)
    return {
      dir,
      jsonPath: jsonFiles[0],
      markdownPath: markdownFiles[0],
      cleanup: () => rmSync(dir, { recursive: true, force: true }),
    }
  } catch (error) {
    rmSync(dir, { recursive: true, force: true })
    throw error
  }
}

function scanNoPrivateText(text) {
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

function validatePacket(payload, markdownText, expectedHeadSha) {
  const requiredEnv = new Set((payload.requiredOperatorEvidence || []).map(item => item.env))
  const commandText = Array.isArray(payload.nextCommands) ? payload.nextCommands.join('\n') : ''
  const privateMatches = scanNoPrivateText(JSON.stringify(payload))
  const markdownPrivateMatches = scanNoPrivateText(markdownText)
  const acceptedAssignmentPaths = new Set([
    targetAssignmentPath,
    preferredAssignmentPath,
    edgeOnlyExampleAssignmentPath,
    generatedContractPath,
  ])

  assert(payload.version === 1, 'P123 packet version must be 1')
  assert(payload.gate === 'P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE', 'P123 packet gate mismatch')
  assert(payload.headSha === expectedHeadSha, `P123 packet headSha must match expected head ${expectedHeadSha}`)
  assert(payload.status === 'passed_waiting_for_operator_assignment_evidence', 'P123 packet status mismatch')
  assert(payload.selectedGoal === 'operator-assignment-evidence-intake', 'P123 selected goal mismatch')
  assert(payload.runtimeTopology === 'edge-only-preferred', 'P123 runtime topology must prefer edge-only')
  assert(payload.preferredAssignmentPath === preferredAssignmentPath, 'P123 preferred assignment path mismatch')
  assert(payload.edgeOnlyExampleAssignmentPath === edgeOnlyExampleAssignmentPath, 'P123 tracked edge-only projection path mismatch')
  assert(payload.generatedContractPath === generatedContractPath, 'P123 generated contract path mismatch')
  assert(payload.legacyTargetAssignmentPath === targetAssignmentPath, 'P123 legacy full-remote assignment path mismatch')
  assert(['remote_assignment_missing', 'remote_assignment_incomplete'].includes(payload.assignmentDecision), 'P123 assignment decision must be missing or incomplete')
  assert(typeof payload.assignmentFilePresent === 'boolean', 'P123 must record assignmentFilePresent as boolean')
  assert(Array.isArray(payload.requiredOperatorEvidence) && payload.requiredOperatorEvidence.length === 11, 'P123 must list exactly eleven edge-only operator evidence inputs')
  for (const env of [
    'RUNTIME_ASSIGNMENT_OPERATOR_OWNER',
    'RUNTIME_ASSIGNMENT_FRONTEND_PROVIDER',
    'RUNTIME_ASSIGNMENT_FRONTEND_SERVICE_ID',
    'RUNTIME_ASSIGNMENT_FRONTEND_ORIGIN',
    'RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID or SUPABASE_PROJECT_REF',
    'RUNTIME_ASSIGNMENT_DATA_API_ORIGIN or SUPABASE_URL',
    'RUNTIME_ASSIGNMENT_FRONTEND_CONFIGURED',
    'RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED',
    'agent.remote_required',
    'agent.ai_generation_cloud_runtime',
    'agent.reader_can_trigger_ai',
  ]) {
    assert(requiredEnv.has(env), `P123 missing required operator evidence ${env}`)
  }
  for (const env of [
    'REMOTE_AGENT_SERVICE_ID',
    'REMOTE_AGENT_ORIGIN',
    'REMOTE_AGENT_SECRETS_CONFIGURED',
  ]) {
    assert(!requiredEnv.has(env), `P123 edge-only evidence must not require ${env}`)
  }
  for (const stage of payload.blockedStages || []) {
    assert(!/^assignment-agent-/i.test(stage), `P123 edge-only blocked stages must not require legacy remote Agent assignment: ${stage}`)
    assert(!/^agent-(service-id|origin|provider-secrets-ready|health-ready)$/i.test(stage), `P123 edge-only blocked stages must not require remote Agent evidence: ${stage}`)
  }
  assert(
    (payload.blockedStages || []).some(stage => String(stage).startsWith('data-api-')),
    'P123 edge-only blocked stages must keep the managed data API evidence visible',
  )
  for (const item of payload.requiredOperatorEvidence) {
    assert(item.publicSafe === true, `P123 operator evidence ${item.env} must be public-safe metadata`)
    assert(!/secret value|token value|database url/i.test(`${item.label} ${item.validation}`), `P123 operator evidence ${item.env} must not request secret values`)
  }
  for (const [key, gate] of [
    ['loopNextGoalLedger', 'P121_LOOP_NEXT_GOAL_LEDGER'],
    ['fixtureIsolation', 'P122_OPERATOR_RETURN_FIXTURE_ISOLATION'],
    ['operatorReturnIntake', 'P120_REMOTE_OPERATOR_RETURN_INTAKE'],
    ['envDryRun', 'P117_REMOTE_ASSIGNMENT_ENV_DRY_RUN_GATE'],
    ['assignmentIntake', 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE'],
    ['imageDrift', 'P113_REMOTE_ASSIGNMENT_IMAGE_DRIFT_GATE'],
    ['localBoundary', 'P108_REMOTE_ASSIGNMENT_LOCAL_BOUNDARY_GUARD'],
    ['fillPlan', 'P105_REMOTE_ASSIGNMENT_FILL_PLAN_GATE'],
  ]) {
    assert(payload.sourceEvidence?.[key]?.gate === gate, `P123 must cite ${gate}`)
  }
  assert(
    acceptedAssignmentPaths.has(payload.sourceEvidence?.assignmentIntake?.assignmentPath),
    'P123 must cite a current production assignment path, not fixture assignment path',
  )
  for (const flag of ['writesLocalAssignment', 'createsRemoteServices', 'setsGitHubVariables', 'storesProviderSecrets', 'promotesLiveRuntime', 'treatsFixtureAsReady']) {
    assert(payload.boundary?.[flag] === false, `P123 packet must keep boundary.${flag}=false`)
  }
  assert(payload.boundary?.containsSecrets === false, 'P123 packet must not contain secrets')
  assert(payload.boundary?.containsPrivateResearchMaterial === false, 'P123 packet must not contain private research material')
  assert(payload.boundary?.exposesProviderPlumbing === false, 'P123 packet must not expose provider plumbing')
  assert(payload.boundary?.containsCandidateText === false, 'P123 packet must not contain candidate text')
  for (const fragment of [
    'prepare:runtime-assignment-intent-env-local',
    'REQUIRE_EDGE_ONLY_DATA_API_LOCAL_SECRET_GUARD_READY=true npm run check:edge-only-data-api-local-secret-guard',
    'RUNTIME_ASSIGNMENT_INTENT_ENV_FILE=deploy/runtime-production/runtime-assignment.intent.env.local',
    'prepare:runtime-assignment-intent',
    'remote-assignment:prepare',
    'check:remote-runtime-assignment-intake',
    'remote-health:check',
    'prepare:edge-only-data-api-strict-intake',
    'check:remote-operator-return-intake',
    'check:loop-next-goal-ledger',
  ]) {
    assert(commandText.includes(fragment), `P123 next command sequence must include ${fragment}`)
  }
  assert(!commandText.includes('apply:remote-assignment-env'), 'P123 primary next command sequence must not use legacy full-remote apply')
  assert(privateMatches.length === 0, `P123 packet leaked private terms: ${privateMatches.join(', ')}`)
  assert(markdownPrivateMatches.length === 0, `P123 Markdown leaked private terms: ${markdownPrivateMatches.join(', ')}`)
  assert(markdownText.includes('P123 Operator Assignment Evidence Intake'), 'P123 Markdown must have title')
  assert(markdownText.includes(preferredAssignmentPath), 'P123 Markdown must include preferred assignment path')
  assert(markdownText.includes(edgeOnlyExampleAssignmentPath), 'P123 Markdown must include tracked edge-only projection path')
  assert(markdownText.includes('edge-only-preferred'), 'P123 Markdown must include runtime topology')

  return {
    blockedStages: Array.isArray(payload.blockedStages) ? payload.blockedStages : [],
    requiredOperatorEvidenceCount: payload.requiredOperatorEvidence.length,
    runtimeTopology: payload.runtimeTopology,
    assignmentDecision: payload.assignmentDecision,
    assignmentFilePresent: payload.assignmentFilePresent,
  }
}

function writeAttestationArtifact(result) {
  mkdirSync(artifactDir, { recursive: true })
  const path = join(artifactDir, `operator-assignment-evidence-intake-attestation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`)
  return path
}

let downloaded
try {
  let packetPath
  let markdownPath
  let expectedHeadSha = currentHead()
  let runId = null
  let runUrl = null
  let mode = 'local'

  if (source === 'github') {
    runId = String(process.env.GITHUB_RUN_ID || process.env.CHECK_GITHUB_ARTIFACTS_RUN_ID || '').trim()
    if (!runId) {
      if (required) throw new Error('GitHub artifact mode requires GITHUB_RUN_ID or CHECK_GITHUB_ARTIFACTS_RUN_ID')
      const artifactPath = writeAttestationArtifact({
        status: 'skipped',
        gate: 'P124_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE_ATTESTATION',
        reason: 'missing_github_run_id',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
    const runInfo = githubRun(runId)
    expectedHeadSha = runInfo.head_sha
    runUrl = runInfo.html_url
    downloaded = downloadGithubPacket(runId)
    packetPath = downloaded.jsonPath
    markdownPath = downloaded.markdownPath
    mode = 'github_current_run'
  } else {
    packetPath = latestLocalPacket()
    if (!packetPath) {
      if (required) throw new Error('No local operator-assignment-evidence-intake artifact found')
      const artifactPath = writeAttestationArtifact({
        status: 'skipped',
        gate: 'P124_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE_ATTESTATION',
        reason: 'missing_local_packet_artifact',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
    markdownPath = packetPath.replace(/\.json$/, '.md')
  }

  assert(expectedHeadSha, 'expected head sha unavailable')
  assert(existsSync(markdownPath), 'P123 Markdown artifact is missing')
  const payload = readJson(packetPath)
  if (source !== 'github' && payload?.headSha !== expectedHeadSha && !required) {
    const artifactPath = writeAttestationArtifact({
      status: 'skipped',
      gate: 'P124_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE_ATTESTATION',
      reason: 'stale_local_packet_artifact',
      required,
      expectedHeadSha,
      packetHeadSha: payload?.headSha || null,
      packetPath: relative(root, packetPath),
    })
    console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
    process.exit(0)
  }

  const validation = validatePacket(payload, readFileSync(markdownPath, 'utf8'), expectedHeadSha)
  const result = {
    version: 1,
    gate: 'P124_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE_ATTESTATION',
    generatedAt: new Date().toISOString(),
    repository: repo,
    mode,
    required,
    runId,
    runUrl,
    expectedHeadSha,
    packet: {
      path: source === 'github' ? artifactName : relative(root, packetPath),
      status: payload.status,
      selectedGoal: payload.selectedGoal,
      runtimeTopology: payload.runtimeTopology,
      preferredAssignmentPath: payload.preferredAssignmentPath,
      edgeOnlyExampleAssignmentPath: payload.edgeOnlyExampleAssignmentPath,
      generatedContractPath: payload.generatedContractPath,
      legacyTargetAssignmentPath: payload.legacyTargetAssignmentPath,
      ...validation,
    },
    publicReleaseBlocking: false,
    boundary: {
      downloadedContentChecked: source === 'github',
      containsSecrets: false,
      containsPrivateResearchMaterial: false,
      exposesProviderPlumbing: false,
      containsCandidateText: false,
      writesLocalAssignment: false,
    },
  }
  const artifactPath = writeAttestationArtifact(result)
  console.log(JSON.stringify({
    status: result.packet.status,
    gate: result.gate,
    mode,
    runId,
    assignmentDecision: validation.assignmentDecision,
    assignmentFilePresent: validation.assignmentFilePresent,
    runtimeTopology: validation.runtimeTopology,
    requiredOperatorEvidenceCount: validation.requiredOperatorEvidenceCount,
    blockedStageCount: validation.blockedStages.length,
    artifactPath: relative(root, artifactPath),
  }, null, 2))
} finally {
  downloaded?.cleanup?.()
}
