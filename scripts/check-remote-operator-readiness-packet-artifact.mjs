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
const required = process.env.CHECK_REMOTE_OPERATOR_READINESS_PACKET_ARTIFACT_REQUIRED === 'true'
const checkCurrentRun = process.env.CHECK_CURRENT_GITHUB_RUN_ARTIFACTS === 'true'
const source = process.env.CHECK_REMOTE_OPERATOR_READINESS_PACKET_ARTIFACT_SOURCE || (checkCurrentRun ? 'github' : 'local')
const artifactName = 'remote-operator-readiness-packet'
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
    .filter(name => name.startsWith('remote-operator-readiness-packet-') && !name.startsWith('remote-operator-readiness-packet-attestation-') && name.endsWith('.json'))
    .sort()
  return files.length ? join(artifactDir, files[files.length - 1]) : null
}

function githubRun(runId) {
  return JSON.parse(run('gh', ['api', `repos/${repo}/actions/runs/${runId}`]))
}

function downloadGithubPacket(runId) {
  const dir = mkdtempSync(join(tmpdir(), 'p119-operator-packet-'))
  try {
    run('gh', ['run', 'download', String(runId), '--repo', repo, '--name', artifactName, '--dir', dir], {
      timeout: 60000,
    })
    const jsonFiles = collectFiles(dir)
      .filter(file => /remote-operator-readiness-packet-.*\.json$/.test(file))
      .filter(file => !/remote-operator-readiness-packet-attestation-.*\.json$/.test(file))
      .sort()
    assert(jsonFiles.length === 1, `expected exactly one P119 JSON in GitHub artifact, got ${jsonFiles.length}`)
    const markdownFiles = collectFiles(dir)
      .filter(file => /remote-operator-readiness-packet-.*\.md$/.test(file))
      .sort()
    assert(markdownFiles.length === 1, `expected exactly one P119 Markdown in GitHub artifact, got ${markdownFiles.length}`)
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

function imageRef(service, headSha) {
  return `ghcr.io/jzvcpe-goat/parallel-universe-novel-${service}:${headSha}`
}

function validatePacket(payload, markdownText, expectedHeadSha) {
  const sourceWorkspaceNoGit = expectedHeadSha === 'source-workspace-no-git'
  const blockedStages = Array.isArray(payload.blockedStages) ? payload.blockedStages : []
  const operatorTasks = Array.isArray(payload.operatorTasks) ? payload.operatorTasks : []
  const commandText = operatorTasks.map(task => task.command).join('\n')
  const privateMatches = scanNoPrivateText(JSON.stringify(payload))
  const markdownPrivateMatches = scanNoPrivateText(markdownText)

  assert(payload.version === 1, 'P119 packet version must be 1')
  assert(payload.gate === 'P119_REMOTE_OPERATOR_READINESS_PACKET', 'P119 packet gate mismatch')
  assert(payload.repository === repo, 'P119 packet repository mismatch')
  assert(payload.headSha === expectedHeadSha, `P119 packet headSha must match expected head ${expectedHeadSha}`)
  assert(payload.status === 'passed_with_operator_inputs_required', 'P119 packet status mismatch')
  assert(payload.decision === 'operator_packet_ready_waiting_for_remote_services', 'P119 packet decision mismatch')
  assert(payload.publicReleaseBlocking === false, 'P119 packet must not block static public release')
  assert(payload.targetAssignmentPath === targetAssignmentPath, 'P119 target assignment path mismatch')
  for (const flag of ['writesLocalAssignment', 'createsRemoteServices', 'setsGitHubVariables', 'storesProviderSecrets', 'promotesLiveRuntime', 'treatsFixtureAsReady']) {
    assert(payload[flag] === false, `P119 packet must keep ${flag}=false`)
  }
  assert(payload.boundary?.shareableWithDeploymentOperator === true, 'P119 packet must be operator-shareable')
  assert(payload.boundary?.containsSecrets === false, 'P119 packet must not contain secrets')
  assert(payload.boundary?.containsPrivateResearchTitles === false, 'P119 packet must not contain private research titles')
  assert(payload.boundary?.exposesModelProviderPlumbing === false, 'P119 packet must not expose provider plumbing')
  assert(payload.boundary?.containsProviderPromptPlumbing === false, 'P119 packet must not contain prompt plumbing')
  assert(payload.boundary?.containsCandidateText === false, 'P119 packet must not contain candidate text')
  assert(payload.currentImages?.api?.includes('parallel-universe-novel-api:'), 'P119 API image ref mismatch')
  assert(payload.currentImages?.agent?.includes('parallel-universe-novel-agent-runtime:'), 'P119 Agent image ref mismatch')
  if (!sourceWorkspaceNoGit) {
    assert(payload.currentImages.api === imageRef('api', expectedHeadSha), 'P119 API image must match current head')
    assert(payload.currentImages.agent === imageRef('agent-runtime', expectedHeadSha), 'P119 Agent image must match current head')
  }

  assert(operatorTasks.length >= 10, 'P119 packet must include at least ten operator tasks')
  for (const id of [
    'share-packet',
    'confirm-owner',
    'fill-env',
    'apply-ignored-assignment',
    'validate-assignment',
    'generate-execution-pack',
    'execute-origins',
    'prove-live-readiness',
    'attest-cutover',
    'unlock-activation',
    'converge-blockers',
  ]) {
    assert(operatorTasks.some(task => task.id === id), `P119 packet must include ${id}`)
  }
  for (const fragment of [
    'check:remote-assignment-env-dry-run',
    'apply:remote-assignment-env',
    'check:remote-runtime-assignment-intake',
    'check:remote-assignment-execution-pack',
    'check:remote-origin-execution',
    'check:remote-origin-provisioning',
    'audit:live-runtime-readiness',
    'check:remote-live-runtime-trace',
    'check:live-cutover-attestation',
    'check:remote-runtime-activation-control',
    'check:remote-runtime-blockers',
    'check:runtime-completion-blocker-convergence',
  ]) {
    assert(commandText.includes(fragment), `P119 operator task sequence must include ${fragment}`)
  }
  assert(blockedStages.includes('activation-control'), 'P119 packet must preserve activation-control blocker')
  assert(blockedStages.includes('live-readiness'), 'P119 packet must preserve live-readiness blocker')
  assert(
    blockedStages.includes('remote-assignment-health-ready') || blockedStages.includes('remote-assignment-file-present'),
    'P119 packet must preserve remote assignment file or health blocker',
  )
  assert(payload.sourceEvidence?.strictRunPackage?.gate === 'P118_REMOTE_ASSIGNMENT_STRICT_RUN_PACKAGE', 'P119 must cite P118 strict-run package')
  assert(payload.sourceEvidence?.strictRunAttestation?.gate === 'P118_REMOTE_ASSIGNMENT_STRICT_RUN_PACKAGE_ATTESTATION', 'P119 must cite P118 attestation')
  assert(payload.sourceEvidence?.blockerLedger?.gate === 'P85_REMOTE_RUNTIME_BLOCKER_NORMALIZATION', 'P119 must cite P85 blocker ledger')
  assert(payload.sourceEvidence?.fillPlan?.gate === 'P105_REMOTE_ASSIGNMENT_FILL_PLAN_GATE', 'P119 must cite P105 fill plan')
  assert(Array.isArray(payload.requiredExternalInputs) && payload.requiredExternalInputs.length >= 10, 'P119 must list required external inputs')
  assert(payload.nextStrictCommand === 'REQUIRE_REMOTE_ASSIGNMENT_READY=true npm run check:remote-runtime-assignment-intake', 'P119 next strict command mismatch')
  assert(privateMatches.length === 0, `P119 packet leaked private terms: ${privateMatches.join(', ')}`)
  assert(markdownPrivateMatches.length === 0, `P119 Markdown leaked private terms: ${markdownPrivateMatches.join(', ')}`)
  assert(markdownText.includes('P119 Remote Operator Readiness Packet'), 'P119 Markdown must have title')
  assert(markdownText.includes(targetAssignmentPath), 'P119 Markdown must include target assignment path')

  return {
    blockedStages,
    operatorTaskCount: operatorTasks.length,
  }
}

function writeAttestationArtifact(result) {
  mkdirSync(artifactDir, { recursive: true })
  const path = join(artifactDir, `remote-operator-readiness-packet-attestation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
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
        gate: 'P119_REMOTE_OPERATOR_READINESS_PACKET_ATTESTATION',
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
      if (required) throw new Error('No local remote-operator-readiness-packet artifact found')
      const artifactPath = writeAttestationArtifact({
        status: 'skipped',
        gate: 'P119_REMOTE_OPERATOR_READINESS_PACKET_ATTESTATION',
        reason: 'missing_local_packet_artifact',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
    markdownPath = packetPath.replace(/\.json$/, '.md')
  }

  assert(expectedHeadSha, 'expected head sha unavailable')
  assert(existsSync(markdownPath), 'P119 Markdown artifact is missing')
  const payload = readJson(packetPath)
  if (source !== 'github' && payload?.headSha !== expectedHeadSha && !required) {
    const artifactPath = writeAttestationArtifact({
      status: 'skipped',
      gate: 'P119_REMOTE_OPERATOR_READINESS_PACKET_ATTESTATION',
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
    gate: 'P119_REMOTE_OPERATOR_READINESS_PACKET_ATTESTATION',
    generatedAt: new Date().toISOString(),
    repository: repo,
    mode,
    required,
    runId,
    runUrl,
    expectedHeadSha,
    packet: {
      path: source === 'github' ? artifactName : relative(root, packetPath),
      decision: payload.decision,
      status: payload.status,
      targetAssignmentPath: payload.targetAssignmentPath,
      blockedStages: validation.blockedStages,
      operatorTaskCount: validation.operatorTaskCount,
    },
    publicBoundary: {
      artifactContentsIncluded: false,
      containsSecrets: false,
      containsPrivateResearchTitles: false,
      exposesModelProviderPlumbing: false,
      containsCandidateText: false,
    },
  }
  const artifactPath = writeAttestationArtifact(result)
  console.log(JSON.stringify({
    status: 'passed_with_operator_inputs_required',
    gate: result.gate,
    mode,
    runId,
    expectedHeadSha,
    decision: payload.decision,
    blockedStages: validation.blockedStages,
    artifactPath: relative(root, artifactPath),
  }, null, 2))
} finally {
  if (downloaded) downloaded.cleanup()
}
