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
const artifactName = 'edge-only-data-api-evidence-transition-fixture'
const required = process.env.CHECK_EDGE_ONLY_DATA_API_EVIDENCE_TRANSITION_FIXTURE_ARTIFACT_REQUIRED === 'true'
const checkCurrentRun = process.env.CHECK_CURRENT_GITHUB_RUN_ARTIFACTS === 'true'
const source = process.env.CHECK_EDGE_ONLY_DATA_API_EVIDENCE_TRANSITION_FIXTURE_ARTIFACT_SOURCE || (checkCurrentRun ? 'github' : 'local')

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
    .filter(name => name.startsWith('edge-only-data-api-evidence-transition-fixture-') && !name.startsWith('edge-only-data-api-evidence-transition-fixture-attestation-') && name.endsWith('.json'))
    .sort()
  return files.length ? join(artifactDir, files[files.length - 1]) : null
}

function githubRun(runId) {
  return JSON.parse(run('gh', ['api', `repos/${repo}/actions/runs/${runId}`]))
}

function downloadGithubPacket(runId) {
  const dir = mkdtempSync(join(tmpdir(), 'p148-data-api-fixture-'))
  try {
    run('gh', ['run', 'download', String(runId), '--repo', repo, '--name', artifactName, '--dir', dir], {
      timeout: 60000,
    })
    const jsonFiles = collectFiles(dir)
      .filter(file => /edge-only-data-api-evidence-transition-fixture-.*\.json$/.test(file))
      .filter(file => !/edge-only-data-api-evidence-transition-fixture-attestation-.*\.json$/.test(file))
      .sort()
    assert(jsonFiles.length === 1, `expected exactly one P148 JSON in GitHub artifact, got ${jsonFiles.length}`)
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
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/i,
    /SUPABASE_SERVICE_ROLE/i,
    /SERVICE_ROLE_KEY/i,
    /SUPABASE_SECRET_KEY/i,
    /SUPABASE_WRITER_PASSWORD/i,
    /OPENAI_API_KEY/i,
    /DEEPSEEK_API_KEY/i,
    /MOONSHOT_API_KEY/i,
    /KIMI_API_KEY/i,
    /ANTHROPIC_API_KEY/i,
    /NARRATIVEOS_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/i,
    /MASTRA_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/i,
    /Authorization:\s*Bearer/i,
    /system prompt/i,
    /provider prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
    /sourceRefs/i,
    /source_refs/i,
    /profile\.id/i,
    /kernel\.id/i,
    /prompt_id/i,
    /prompt_version/i,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(String)
}

function validatePacket(payload, expectedHeadSha) {
  const privateMatches = scanNoPrivateText(JSON.stringify(payload))
  assert(privateMatches.length === 0, `P148 artifact leaked private terms: ${privateMatches.join(', ')}`)
  assert(payload.version === 1, 'P148 artifact version must be 1')
  assert(payload.gate === 'P148_EDGE_ONLY_DATA_API_EVIDENCE_TRANSITION_FIXTURE', 'P148 artifact gate mismatch')
  assert(payload.status === 'passed', 'P148 artifact status mismatch')
  assert(payload.repository === repo, 'P148 repository mismatch')
  assert(payload.headSha === expectedHeadSha, `P148 headSha must match expected head ${expectedHeadSha}`)
  assert(payload.transition?.preparedIntent === true, 'P148 must prove runtime intent preparation')
  assert(payload.transition?.compiledEdgeOnlyContract === true, 'P148 must prove edge-only contract compilation')
  assert(payload.transition?.pendingDecisionBeforeHealth === 'remote_assignment_pending_health', 'P148 must prove pending-health state')
  assert(payload.transition?.strictHealthReady === true, 'P148 must prove strict P145 health-ready fixture')
  assert(payload.transition?.readyDecisionAfterFixtureHealth === 'remote_assignment_ready', 'P148 must prove health evidence makes P75 ready')
  assert(payload.transition?.restoredDecisionAfterCleanup !== 'remote_assignment_ready', 'P148 must restore non-ready current state after cleanup')
  assert(payload.transition?.expectedNextGoalWithRealEvidence === 'remote-health-evidence-intake', 'P148 next goal mismatch')
  assert(payload.sourceEvidence?.pendingAssignmentIntake?.gate === 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE', 'P148 must cite pending P75')
  assert(payload.sourceEvidence?.pendingAssignmentIntake?.decision === 'remote_assignment_pending_health', 'P148 pending P75 decision mismatch')
  assert(payload.sourceEvidence?.strictHealthAttestation?.gate === 'P145_REMOTE_HEALTH_EVIDENCE_ARTIFACT_GATE', 'P148 must cite strict P145')
  assert(payload.sourceEvidence?.strictHealthAttestation?.healthReady === true, 'P148 strict P145 must be healthReady=true')
  assert(payload.sourceEvidence?.readyAssignmentIntake?.decision === 'remote_assignment_ready', 'P148 ready P75 decision mismatch')
  assert(payload.sourceEvidence?.restoredHealthAttestation?.status === 'waiting_for_remote_health_evidence', 'P148 must restore waiting P145')
  assert(payload.sourceEvidence?.restoredHealthAttestation?.healthReady === false, 'P148 restored P145 must be healthReady=false')
  assert(payload.sourceEvidence?.restoredAssignmentIntake?.decision !== 'remote_assignment_ready', 'P148 restored P75 must not be ready')
  assert(payload.boundary?.fixtureOnly === true, 'P148 must be fixture-only')
  assert(payload.boundary?.writesProductionIntent === false, 'P148 must not write production intent')
  assert(payload.boundary?.writesProductionAssignment === false, 'P148 must not write production assignment')
  assert(payload.boundary?.createsRemoteServices === false, 'P148 must not create remote services')
  assert(payload.boundary?.setsGitHubVariables === false, 'P148 must not set GitHub variables')
  assert(payload.boundary?.storesProviderSecrets === false, 'P148 must not store provider secrets')
  assert(payload.boundary?.includesPublishableKey === false, 'P148 must not include publishable keys')
  assert(payload.boundary?.promotesLiveRuntime === false, 'P148 must not promote live runtime')
  assert(payload.boundary?.leavesHealthReadyArtifactAsCurrentState === false, 'P148 must not leave fixture health as current state')
  assert(payload.boundary?.restoresRuntimeProductionFiles === true, 'P148 must restore runtime-production files')
  assert(payload.boundary?.valuesIncluded === false, 'P148 must not include fixture values')
}

function writeAttestation(result) {
  mkdirSync(artifactDir, { recursive: true })
  const path = join(artifactDir, `edge-only-data-api-evidence-transition-fixture-attestation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
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
        gate: 'P148_EDGE_ONLY_DATA_API_EVIDENCE_TRANSITION_FIXTURE_ATTESTATION',
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
      if (required) throw new Error('No local edge-only Data API evidence transition fixture artifact found')
      const artifactPath = writeAttestation({
        status: 'skipped',
        gate: 'P148_EDGE_ONLY_DATA_API_EVIDENCE_TRANSITION_FIXTURE_ATTESTATION',
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
      gate: 'P148_EDGE_ONLY_DATA_API_EVIDENCE_TRANSITION_FIXTURE_ATTESTATION',
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
    gate: 'P148_EDGE_ONLY_DATA_API_EVIDENCE_TRANSITION_FIXTURE_ATTESTATION',
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
