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
const required = process.env.CHECK_REMOTE_OPERATOR_RETURN_INTAKE_ARTIFACT_REQUIRED === 'true'
const checkCurrentRun = process.env.CHECK_CURRENT_GITHUB_RUN_ARTIFACTS === 'true'
const source = process.env.CHECK_REMOTE_OPERATOR_RETURN_INTAKE_ARTIFACT_SOURCE || (checkCurrentRun ? 'github' : 'local')
const artifactName = 'remote-operator-return-intake'
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
    .filter(name => name.startsWith('remote-operator-return-intake-') && !name.startsWith('remote-operator-return-intake-attestation-') && name.endsWith('.json'))
    .sort()
  return files.length ? join(artifactDir, files[files.length - 1]) : null
}

function githubRun(runId) {
  return JSON.parse(run('gh', ['api', `repos/${repo}/actions/runs/${runId}`]))
}

function downloadGithubPacket(runId) {
  const dir = mkdtempSync(join(tmpdir(), 'p120-operator-return-'))
  try {
    run('gh', ['run', 'download', String(runId), '--repo', repo, '--name', artifactName, '--dir', dir], {
      timeout: 60000,
    })
    const jsonFiles = collectFiles(dir)
      .filter(file => /remote-operator-return-intake-.*\.json$/.test(file))
      .filter(file => !/remote-operator-return-intake-attestation-.*\.json$/.test(file))
      .sort()
    assert(jsonFiles.length === 1, `expected exactly one P120 JSON in GitHub artifact, got ${jsonFiles.length}`)
    const markdownFiles = collectFiles(dir)
      .filter(file => /remote-operator-return-intake-.*\.md$/.test(file))
      .sort()
    assert(markdownFiles.length === 1, `expected exactly one P120 Markdown in GitHub artifact, got ${markdownFiles.length}`)
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
  const acceptedAssignmentPaths = new Set([
    targetAssignmentPath,
    preferredAssignmentPath,
    edgeOnlyExampleAssignmentPath,
    generatedContractPath,
  ])
  const allowedStatuses = [
    'passed_waiting_for_operator_return',
    'passed_waiting_for_remote_health',
    'passed_ready_for_strict_activation',
  ]
  const allowedDecisions = [
    'operator_return_waiting_for_assignment',
    'operator_return_waiting_for_health',
    'operator_return_ready_for_strict_activation',
  ]
  const commandText = Array.isArray(payload.nextStrictGateCommands)
    ? payload.nextStrictGateCommands.join('\n')
    : ''
  const privateMatches = scanNoPrivateText(JSON.stringify(payload))
  const markdownPrivateMatches = scanNoPrivateText(markdownText)

  assert(payload.version === 1, 'P120 packet version must be 1')
  assert(payload.gate === 'P120_REMOTE_OPERATOR_RETURN_INTAKE', 'P120 packet gate mismatch')
  assert(payload.repository === repo, 'P120 packet repository mismatch')
  assert(payload.headSha === expectedHeadSha, `P120 packet headSha must match expected head ${expectedHeadSha}`)
  assert(allowedStatuses.includes(payload.status), `P120 packet status mismatch: ${payload.status}`)
  assert(allowedDecisions.includes(payload.decision), `P120 packet decision mismatch: ${payload.decision}`)
  assert(payload.publicReleaseBlocking === false, 'P120 packet must not block static public release')
  assert(payload.targetAssignmentPath === targetAssignmentPath, 'P120 target assignment path mismatch')
  assert(payload.preferredAssignmentPath === preferredAssignmentPath, 'P120 preferred assignment path mismatch')
  assert(payload.edgeOnlyExampleAssignmentPath === edgeOnlyExampleAssignmentPath, 'P120 tracked edge-only projection path mismatch')
  assert(payload.generatedContractPath === generatedContractPath, 'P120 generated contract path mismatch')
  for (const flag of ['writesLocalAssignment', 'createsRemoteServices', 'setsGitHubVariables', 'storesProviderSecrets', 'promotesLiveRuntime', 'treatsFixtureAsReady']) {
    assert(payload.boundary?.[flag] === false, `P120 packet must keep boundary.${flag}=false`)
  }
  assert(payload.boundary?.shareableWithDeploymentOperator === true, 'P120 packet must be operator-shareable')
  assert(payload.boundary?.containsSecrets === false, 'P120 packet must not contain secrets')
  assert(payload.boundary?.containsPrivateResearchTitles === false, 'P120 packet must not contain private research titles')
  assert(payload.boundary?.exposesModelProviderPlumbing === false, 'P120 packet must not expose provider plumbing')
  assert(payload.boundary?.containsProviderPromptPlumbing === false, 'P120 packet must not contain prompt plumbing')
  assert(payload.boundary?.containsCandidateText === false, 'P120 packet must not contain candidate text')
  assert(payload.sourceEvidence?.operatorReadinessPacket?.gate === 'P119_REMOTE_OPERATOR_READINESS_PACKET' || expectedHeadSha === 'source-workspace-no-git', 'P120 must cite P119 operator packet')
  assert(payload.sourceEvidence?.assignmentIntake?.gate === 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE', 'P120 must cite P75 assignment intake')
  assert(
    acceptedAssignmentPaths.has(payload.sourceEvidence?.assignmentIntake?.assignmentPath),
    'P120 must cite a current production assignment path, not fixture assignment path',
  )
  assert(payload.sourceEvidence?.envDryRun?.gate === 'P117_REMOTE_ASSIGNMENT_ENV_DRY_RUN_GATE', 'P120 must cite P117 env dry-run')
  assert(payload.sourceEvidence?.blockerLedger?.gate === 'P85_REMOTE_RUNTIME_BLOCKER_NORMALIZATION', 'P120 must cite P85 blocker ledger')
  assert(payload.sourceEvidence?.activationControl?.gate === 'P78_REMOTE_RUNTIME_ACTIVATION_CONTROL', 'P120 must cite P78 activation control')
  for (const fragment of [
    'check:remote-runtime-assignment-intake',
    'check:remote-origin-execution',
    'check:remote-origin-provisioning',
    'audit:live-runtime-readiness',
    'check:remote-live-runtime-trace',
    'check:live-cutover-attestation',
    'check:remote-runtime-activation-control',
    'check:remote-runtime-blockers',
  ]) {
    assert(commandText.includes(fragment), `P120 strict command sequence must include ${fragment}`)
  }
  assert(!commandText.includes('gh variable set'), 'P120 commands must not set GitHub variables')
  assert(!commandText.includes('docker run'), 'P120 commands must not create local services')
  assert(privateMatches.length === 0, `P120 packet leaked private terms: ${privateMatches.join(', ')}`)
  assert(markdownPrivateMatches.length === 0, `P120 Markdown leaked private terms: ${markdownPrivateMatches.join(', ')}`)
  assert(markdownText.includes('P120 Remote Operator Return Intake'), 'P120 Markdown must have title')
  assert(markdownText.includes(targetAssignmentPath), 'P120 Markdown must include target assignment path')
  assert(markdownText.includes(preferredAssignmentPath), 'P120 Markdown must include preferred assignment path')
  assert(markdownText.includes(edgeOnlyExampleAssignmentPath), 'P120 Markdown must include tracked edge-only projection path')

  return {
    blockedStages: Array.isArray(payload.blockedStages) ? payload.blockedStages : [],
    commandCount: payload.nextStrictGateCommands.length,
  }
}

function writeAttestationArtifact(result) {
  mkdirSync(artifactDir, { recursive: true })
  const path = join(artifactDir, `remote-operator-return-intake-attestation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
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
        gate: 'P120_REMOTE_OPERATOR_RETURN_INTAKE_ATTESTATION',
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
      if (required) throw new Error('No local remote-operator-return-intake artifact found')
      const artifactPath = writeAttestationArtifact({
        status: 'skipped',
        gate: 'P120_REMOTE_OPERATOR_RETURN_INTAKE_ATTESTATION',
        reason: 'missing_local_packet_artifact',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
    markdownPath = packetPath.replace(/\.json$/, '.md')
  }

  assert(expectedHeadSha, 'expected head sha unavailable')
  assert(existsSync(markdownPath), 'P120 Markdown artifact is missing')
  const payload = readJson(packetPath)
  if (source !== 'github' && payload?.headSha !== expectedHeadSha && !required) {
    const artifactPath = writeAttestationArtifact({
      status: 'skipped',
      gate: 'P120_REMOTE_OPERATOR_RETURN_INTAKE_ATTESTATION',
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
    gate: 'P120_REMOTE_OPERATOR_RETURN_INTAKE_ATTESTATION',
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
      preferredAssignmentPath: payload.preferredAssignmentPath,
      edgeOnlyExampleAssignmentPath: payload.edgeOnlyExampleAssignmentPath,
      generatedContractPath: payload.generatedContractPath,
      assignmentSource: payload.assignmentSource,
      assignmentDecision: payload.assignmentDecision,
      blockedStages: validation.blockedStages,
      commandCount: validation.commandCount,
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
    status: payload.status,
    gate: result.gate,
    mode,
    runId,
    expectedHeadSha,
    decision: payload.decision,
    assignmentDecision: payload.assignmentDecision,
    blockedStages: validation.blockedStages,
    artifactPath: relative(root, artifactPath),
  }, null, 2))
} finally {
  if (downloaded) downloaded.cleanup()
}
