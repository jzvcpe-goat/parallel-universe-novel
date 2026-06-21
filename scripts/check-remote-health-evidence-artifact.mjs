#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
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
const artifactName = 'remote-health-evidence'
const required = process.env.CHECK_REMOTE_HEALTH_EVIDENCE_ARTIFACT_REQUIRED === 'true'
const readyRequired = process.env.REQUIRE_REMOTE_HEALTH_EVIDENCE_READY === 'true'
const checkCurrentRun = process.env.CHECK_CURRENT_GITHUB_RUN_ARTIFACTS === 'true'
const source = process.env.CHECK_REMOTE_HEALTH_EVIDENCE_ARTIFACT_SOURCE || (checkCurrentRun ? 'github' : 'local')
const healthResultPath = join(root, 'deploy/runtime-production/generated/remote-health-evidence.result.json')
const contractPath = join(root, 'deploy/runtime-production/generated/remote-assignment.contract.json')

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

function githubRun(runId) {
  return JSON.parse(run('gh', ['api', `repos/${repo}/actions/runs/${runId}`]))
}

function downloadGithubAttestation(runId) {
  const dir = mkdtempSync(join(tmpdir(), 'p145-remote-health-'))
  try {
    run('gh', ['run', 'download', String(runId), '--repo', repo, '--name', artifactName, '--dir', dir], {
      timeout: 60000,
    })
    const jsonFiles = collectFiles(dir)
      .filter(file => /remote-health-evidence-attestation-.*\.json$/.test(file))
      .sort()
    assert(jsonFiles.length === 1, `expected exactly one P145 attestation JSON in GitHub artifact, got ${jsonFiles.length}`)
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
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function assertHttpsProductionOrigin(value, label) {
  assert(typeof value === 'string' && value.trim(), `${label} must be a non-empty string`)
  const url = new URL(value)
  assert(url.protocol === 'https:', `${label} must use https`)
  assert(!url.username && !url.password && !url.search && !url.hash, `${label} must not contain credentials, query or hash`)
  assert(
    !['localhost', '127.0.0.1', '0.0.0.0', '::1', 'example.com'].includes(url.hostname)
      && !url.hostname.endsWith('.local')
      && !url.hostname.endsWith('.invalid')
      && !url.hostname.includes('supabase-project-ref'),
    `${label} must be a production-ready origin`,
  )
}

function validateHealthResult(health, contract) {
  const privateMatches = scanNoPrivateText(JSON.stringify(health))
  assert(privateMatches.length === 0, `remote health result leaked private terms: ${privateMatches.join(', ')}`)
  assert(health.status === 'ok', 'remote health result status must be ok')
  assert(health.runtime_mode === 'edge-only', 'remote health result runtime mode must be edge-only')
  assert(health.runtime_mode === contract.runtime_mode, 'remote health result runtime mode must match contract')
  assert(health.data_api?.origin === contract.topology?.data_api?.origin, 'remote health origin must match compiled contract')
  assert(health.data_api?.table === contract.health?.data_probe_table, 'remote health table must match compiled contract')
  assert(health.data_api?.table === 'health_probe', 'remote health table must be health_probe')
  assert(health.data_api?.probe?.id === contract.health?.data_probe_id, 'remote health probe id must match compiled contract')
  assert(health.data_api?.probe?.id === 'reader', 'remote health probe id must be reader')
  assert(health.data_api?.probe?.status === 'ok', 'remote health probe status must be ok')
  assert(health.remote_agent?.required === false, 'edge-only remote health must not require remote Agent')
  assert(health.remote_agent?.evidence === 'not-required-edge-only', 'edge-only remote Agent evidence mismatch')
  assertHttpsProductionOrigin(health.data_api.origin, 'remote health data API origin')
}

function writeArtifact(result) {
  mkdirSync(artifactDir, { recursive: true })
  const path = join(artifactDir, `remote-health-evidence-attestation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`)
  return path
}

function validateAttestation(payload) {
  const privateMatches = scanNoPrivateText(JSON.stringify(payload))
  assert(privateMatches.length === 0, `P145 attestation leaked private terms: ${privateMatches.join(', ')}`)
  assert(payload.version === 1, 'P145 attestation version must be 1')
  assert(payload.gate === 'P145_REMOTE_HEALTH_EVIDENCE_ARTIFACT_GATE', 'P145 attestation gate mismatch')
  assert(['passed', 'waiting_for_remote_health_evidence'].includes(payload.status), 'P145 attestation status mismatch')
  assert(payload.runtimeMode === 'edge-only', 'P145 runtime mode must be edge-only')
  assert(payload.publicBoundary?.containsSecrets === false, 'P145 must not contain secrets')
  assert(payload.publicBoundary?.containsProviderKeys === false, 'P145 must not contain provider keys')
  assert(payload.publicBoundary?.containsWriterPassword === false, 'P145 must not contain writer password')
  assert(payload.publicBoundary?.containsCloudAiGeneration === false, 'P145 must not contain cloud AI generation evidence')
  assert(payload.publicBoundary?.remoteAgentRequired === false, 'P145 edge-only path must not require remote Agent')
  assert(payload.nextCommand === 'npm run remote-health:check', 'P145 next command must point to remote-health:check')

  if (payload.status === 'waiting_for_remote_health_evidence') {
    assert(payload.healthReady === false, 'waiting P145 attestation must have healthReady=false')
    assert(payload.rawHealthEvidenceIncluded === false, 'waiting P145 attestation must not include raw health evidence')
    if (readyRequired) throw new Error('Remote health evidence is required but P145 is still waiting for remote-health:check')
    return
  }

  assert(payload.healthReady === true, 'passed P145 attestation must have healthReady=true')
  assert(payload.sourceGate === 'remote-health:check', 'passed P145 attestation must cite remote-health:check')
  assert(payload.dataApi?.table === 'health_probe', 'passed P145 data API table mismatch')
  assert(payload.dataApi?.probeId === 'reader', 'passed P145 probe id mismatch')
  assert(payload.dataApi?.probeStatus === 'ok', 'passed P145 probe status mismatch')
  assert(payload.remoteAgent?.required === false, 'passed P145 remote Agent must be false')
  assert(payload.remoteAgent?.evidence === 'not-required-edge-only', 'passed P145 remote Agent evidence mismatch')
  assertHttpsProductionOrigin(payload.dataApi.origin, 'P145 attested data API origin')
}

function makeWaitingAttestation(expectedHeadSha, mode = 'local') {
  return {
    version: 1,
    gate: 'P145_REMOTE_HEALTH_EVIDENCE_ARTIFACT_GATE',
    generatedAt: new Date().toISOString(),
    repository: repo,
    mode,
    required,
    readyRequired,
    expectedHeadSha,
    status: 'waiting_for_remote_health_evidence',
    healthReady: false,
    runtimeMode: 'edge-only',
    rawHealthEvidenceIncluded: false,
    sourceGate: null,
    reason: 'remote-health:check has not produced deploy/runtime-production/generated/remote-health-evidence.result.json in this environment',
    nextCommand: 'npm run remote-health:check',
    publicBoundary: {
      containsSecrets: false,
      containsProviderKeys: false,
      containsWriterPassword: false,
      containsCloudAiGeneration: false,
      remoteAgentRequired: false,
      dataApiHealthEvidenceRequiredForP142Completion: true,
    },
  }
}

function makePassedAttestation(health, expectedHeadSha) {
  const stableEvidence = JSON.stringify({
    runtime_mode: health.runtime_mode,
    data_api: {
      origin: health.data_api.origin,
      table: health.data_api.table,
      probe: health.data_api.probe,
    },
    remote_agent: health.remote_agent,
  })
  return {
    version: 1,
    gate: 'P145_REMOTE_HEALTH_EVIDENCE_ARTIFACT_GATE',
    generatedAt: new Date().toISOString(),
    repository: repo,
    mode: 'local',
    required,
    readyRequired,
    expectedHeadSha,
    status: 'passed',
    healthReady: true,
    runtimeMode: health.runtime_mode,
    sourceGate: 'remote-health:check',
    sourceEvidenceDigest: createHash('sha256').update(stableEvidence).digest('hex'),
    nextCommand: 'npm run remote-health:check',
    dataApi: {
      provider: health.data_api.provider,
      origin: health.data_api.origin,
      table: health.data_api.table,
      probeId: health.data_api.probe.id,
      probeStatus: health.data_api.probe.status,
      probeUpdatedAtPresent: Boolean(health.data_api.probe.updated_at),
    },
    remoteAgent: health.remote_agent,
    rawHealthEvidenceIncluded: false,
    publicBoundary: {
      containsSecrets: false,
      containsProviderKeys: false,
      containsWriterPassword: false,
      containsCloudAiGeneration: false,
      remoteAgentRequired: false,
      dataApiHealthEvidenceRequiredForP142Completion: true,
    },
  }
}

let downloaded
try {
  if (source === 'github') {
    const runId = String(process.env.GITHUB_RUN_ID || process.env.CHECK_GITHUB_ARTIFACTS_RUN_ID || '').trim()
    if (!runId) {
      if (required) throw new Error('GitHub artifact mode requires GITHUB_RUN_ID or CHECK_GITHUB_ARTIFACTS_RUN_ID')
      const artifactPath = writeArtifact(makeWaitingAttestation(currentHead(), 'github_missing_run_id'))
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
    const runInfo = githubRun(runId)
    downloaded = downloadGithubAttestation(runId)
    const payload = readJson(downloaded.jsonPath)
    validateAttestation(payload)
    const result = {
      ...payload,
      mode: 'github_current_run',
      runId,
      runUrl: runInfo.html_url,
      expectedHeadSha: runInfo.head_sha,
      checkedAt: new Date().toISOString(),
    }
    validateAttestation(result)
    console.log(JSON.stringify({
      status: result.status,
      gate: result.gate,
      mode: result.mode,
      runId,
      healthReady: result.healthReady,
      expectedHeadSha: result.expectedHeadSha,
    }, null, 2))
    process.exit(0)
  }

  const expectedHeadSha = currentHead()
  let result
  if (existsSync(healthResultPath)) {
    assert(existsSync(contractPath), 'remote health evidence requires compiled assignment contract')
    const health = readJson(healthResultPath)
    const contract = readJson(contractPath)
    validateHealthResult(health, contract)
    result = makePassedAttestation(health, expectedHeadSha)
  } else {
    if (required && readyRequired) throw new Error('Missing remote health evidence result; run npm run remote-health:check')
    result = makeWaitingAttestation(expectedHeadSha)
  }
  validateAttestation(result)
  const artifactPath = writeArtifact(result)
  console.log(JSON.stringify({
    status: result.status,
    gate: result.gate,
    healthReady: result.healthReady,
    artifactPath: relative(root, artifactPath),
    nextCommand: result.nextCommand,
  }, null, 2))
} finally {
  downloaded?.cleanup?.()
}
