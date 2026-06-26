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
const artifactDir = join(root, 'artifacts/runtime')
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'
const artifactName = 'operator-assignment-transition-fixture'
const required = process.env.CHECK_OPERATOR_ASSIGNMENT_TRANSITION_FIXTURE_ARTIFACT_REQUIRED === 'true'
const checkCurrentRun = process.env.CHECK_CURRENT_GITHUB_RUN_ARTIFACTS === 'true'
const source = process.env.CHECK_OPERATOR_ASSIGNMENT_TRANSITION_FIXTURE_ARTIFACT_SOURCE || (checkCurrentRun ? 'github' : 'local')

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
    .filter(name => name.startsWith('operator-assignment-transition-fixture-') && !name.startsWith('operator-assignment-transition-fixture-attestation-') && name.endsWith('.json'))
    .sort()
  return files.length ? join(artifactDir, files[files.length - 1]) : null
}

function githubRun(runId) {
  return JSON.parse(run('gh', ['api', `repos/${repo}/actions/runs/${runId}`]))
}

function downloadGithubPacket(runId) {
  const dir = mkdtempSync(join(tmpdir(), 'p133-transition-'))
  try {
    run('gh', ['run', 'download', String(runId), '--repo', repo, '--name', artifactName, '--dir', dir], {
      timeout: 60000,
    })
    const jsonFiles = collectFiles(dir)
      .filter(file => /operator-assignment-transition-fixture-.*\.json$/.test(file))
      .filter(file => !/operator-assignment-transition-fixture-attestation-.*\.json$/.test(file))
      .sort()
    assert(jsonFiles.length === 1, `expected exactly one P133 JSON in GitHub artifact, got ${jsonFiles.length}`)
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

function validatePacket(payload, expectedHeadSha) {
  const privateMatches = scanNoPrivateText(JSON.stringify(payload))

  assert(payload.version === 1, 'P133 artifact version must be 1')
  assert(payload.gate === 'P133_OPERATOR_ASSIGNMENT_TRANSITION_FIXTURE', 'P133 artifact gate mismatch')
  if (payload.status === 'skipped_not_current_goal') {
    assert(payload.repository === repo, 'P133 repository mismatch')
    assert(payload.headSha === expectedHeadSha, `P133 headSha must match expected head ${expectedHeadSha}`)
    assert(payload.selectedGoal && payload.selectedGoal !== 'operator-assignment-evidence-intake', 'P133 skipped artifact must name the advanced selected goal')
    assert(payload.reason === 'P121 has advanced beyond operator-assignment-evidence-intake', 'P133 skipped reason mismatch')
    assert(payload.sourceEvidence?.loopNextGoalLedger?.selectedGoal === payload.selectedGoal, 'P133 skipped ledger selected goal mismatch')
    assert(payload.boundary?.writesProductionAssignment === false, 'P133 must not write production assignment')
    assert(payload.boundary?.temporaryAssignmentOnly === false, 'P133 skipped path must not write temporary assignment')
    assert(payload.boundary?.temporaryEnvOnly === false, 'P133 skipped path must not write temporary env')
    assert(payload.boundary?.tempFilesRemoved === true, 'P133 temp files must be absent after skipped path')
    assert(payload.boundary?.createsRemoteServices === false, 'P133 must not create remote services')
    assert(payload.boundary?.setsGitHubVariables === false, 'P133 must not set GitHub variables')
    assert(payload.boundary?.storesProviderSecrets === false, 'P133 must not store provider secrets')
    assert(payload.boundary?.promotesLiveRuntime === false, 'P133 must not promote live runtime')
    assert(payload.boundary?.treatsFixtureAsReady === false, 'P133 must not treat fixture as readiness')
    assert(payload.boundary?.valuesIncluded === false, 'P133 must redact fixture values')
    assert(privateMatches.length === 0, `P133 artifact leaked private terms: ${privateMatches.join(', ')}`)
    return
  }
  assert(payload.status === 'passed', 'P133 artifact status mismatch')
  assert(payload.repository === repo, 'P133 repository mismatch')
  assert(payload.headSha === expectedHeadSha, `P133 headSha must match expected head ${expectedHeadSha}`)
  assert(payload.transition?.p117Decision === 'operator_env_ready_for_p116_apply', 'P133 must prove P117 ready state')
  assert(payload.transition?.p116Mode === 'applied', 'P133 must prove P116 apply mode')
  assert(payload.transition?.p75Decision === 'remote_assignment_pending_health', 'P133 must stop at P75 pending health')
  assert(payload.transition?.expectedNextGoalAfterOperatorReturn === 'remote-health-evidence-intake', 'P133 next goal mismatch')
  assert(payload.sourceEvidence?.envDryRun?.gate === 'P117_REMOTE_ASSIGNMENT_ENV_DRY_RUN_GATE', 'P133 must cite P117')
  assert(payload.sourceEvidence?.envApply?.gate === 'P116_REMOTE_ASSIGNMENT_ENV_APPLY_GATE', 'P133 must cite P116')
  assert(payload.sourceEvidence?.assignmentIntake?.gate === 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE', 'P133 must cite P75')
  assert(payload.sourceEvidence?.assignmentIntake?.decision === 'remote_assignment_pending_health', 'P133 P75 evidence must be pending health')
  assert(payload.sourceEvidence?.assignmentIntake?.blockedStages?.includes('api-health-ready'), 'P133 must preserve API health blocker')
  assert(payload.sourceEvidence?.assignmentIntake?.blockedStages?.includes('agent-health-ready'), 'P133 must preserve Agent health blocker')
  assert(payload.boundary?.writesProductionAssignment === false, 'P133 must not write production assignment')
  assert(payload.boundary?.temporaryAssignmentOnly === true, 'P133 must use temporary assignment only')
  assert(payload.boundary?.temporaryEnvOnly === true, 'P133 must use temporary env only')
  assert(payload.boundary?.tempFilesRemoved === true, 'P133 temp files must be removed')
  assert(payload.boundary?.createsRemoteServices === false, 'P133 must not create remote services')
  assert(payload.boundary?.setsGitHubVariables === false, 'P133 must not set GitHub variables')
  assert(payload.boundary?.storesProviderSecrets === false, 'P133 must not store provider secrets')
  assert(payload.boundary?.promotesLiveRuntime === false, 'P133 must not promote live runtime')
  assert(payload.boundary?.treatsFixtureAsReady === false, 'P133 must not treat fixture as readiness')
  assert(payload.boundary?.valuesIncluded === false, 'P133 must redact fixture values')
  assert(privateMatches.length === 0, `P133 artifact leaked private terms: ${privateMatches.join(', ')}`)
}

function writeAttestation(result) {
  mkdirSync(artifactDir, { recursive: true })
  const path = join(artifactDir, `operator-assignment-transition-fixture-attestation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`)
  return path
}

let downloaded
try {
  let packetPath
  let expectedHeadSha = currentHead()
  let runId = null
  let runUrl = null
  let mode = 'local'

  if (source === 'github') {
    runId = String(process.env.GITHUB_RUN_ID || process.env.CHECK_GITHUB_ARTIFACTS_RUN_ID || '').trim()
    if (!runId) {
      if (required) throw new Error('GitHub artifact mode requires GITHUB_RUN_ID or CHECK_GITHUB_ARTIFACTS_RUN_ID')
      const artifactPath = writeAttestation({
        status: 'skipped',
        gate: 'P133_OPERATOR_ASSIGNMENT_TRANSITION_FIXTURE_ATTESTATION',
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
    mode = 'github_current_run'
  } else {
    packetPath = latestLocalPacket()
    if (!packetPath) {
      if (required) throw new Error('No local operator-assignment-transition-fixture artifact found')
      const artifactPath = writeAttestation({
        status: 'skipped',
        gate: 'P133_OPERATOR_ASSIGNMENT_TRANSITION_FIXTURE_ATTESTATION',
        reason: 'missing_local_packet_artifact',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
  }

  const payload = readJson(packetPath)
  if (source !== 'github' && payload?.headSha !== expectedHeadSha && !required) {
    const artifactPath = writeAttestation({
      status: 'skipped',
      gate: 'P133_OPERATOR_ASSIGNMENT_TRANSITION_FIXTURE_ATTESTATION',
      reason: 'stale_local_packet_artifact',
      required,
      expectedHeadSha,
      packetHeadSha: payload?.headSha || null,
      packetPath: relative(root, packetPath),
    })
    console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
    process.exit(0)
  }

  validatePacket(payload, expectedHeadSha)
  const result = {
    version: 1,
    gate: 'P133_OPERATOR_ASSIGNMENT_TRANSITION_FIXTURE_ATTESTATION',
    generatedAt: new Date().toISOString(),
    repository: repo,
    mode,
    required,
    runId,
    runUrl,
    expectedHeadSha,
    status: 'passed',
    transition: payload.transition,
    boundary: payload.boundary,
  }
  const artifactPath = writeAttestation(result)
  console.log(JSON.stringify({
    status: result.status,
    gate: result.gate,
    mode,
    runId,
    expectedHeadSha,
    artifactPath: relative(root, artifactPath),
  }, null, 2))
} finally {
  downloaded?.cleanup?.()
}
