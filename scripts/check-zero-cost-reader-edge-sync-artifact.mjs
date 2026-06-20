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
const artifactName = 'zero-cost-reader-edge-sync'
const required = process.env.CHECK_ZERO_COST_READER_EDGE_SYNC_ARTIFACT_REQUIRED === 'true'
const checkCurrentRun = process.env.CHECK_CURRENT_GITHUB_RUN_ARTIFACTS === 'true'
const source = process.env.CHECK_ZERO_COST_READER_EDGE_SYNC_ARTIFACT_SOURCE || (checkCurrentRun ? 'github' : 'local')

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
    .filter(name => name.startsWith('zero-cost-reader-edge-sync-'))
    .filter(name => !name.startsWith('zero-cost-reader-edge-sync-attestation-'))
    .filter(name => name.endsWith('.json'))
    .sort()
  return files.length ? join(artifactDir, files[files.length - 1]) : null
}

function githubRun(runId) {
  return JSON.parse(run('gh', ['api', `repos/${repo}/actions/runs/${runId}`]))
}

function downloadGithubPacket(runId) {
  const dir = mkdtempSync(join(tmpdir(), 'p136-zero-cost-reader-'))
  try {
    run('gh', ['run', 'download', String(runId), '--repo', repo, '--name', artifactName, '--dir', dir], {
      timeout: 60000,
    })
    const jsonFiles = collectFiles(dir)
      .filter(file => /zero-cost-reader-edge-sync-.*\.json$/.test(file.split('/').pop() || ''))
      .filter(file => !/zero-cost-reader-edge-sync-attestation-.*\.json$/.test(file.split('/').pop() || ''))
      .sort()
    assert(jsonFiles.length === 1, `expected exactly one P135 JSON in GitHub artifact, got ${jsonFiles.length}`)
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
    /postgres(ql)?:\/\/[^<]/i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/,
    /SUPABASE_SERVICE_ROLE_KEY/i,
    /SUPABASE_SECRET_KEY/i,
    /SUPABASE_WRITER_PASSWORD/i,
    /OPENAI_API_KEY/i,
    /DEEPSEEK_API_KEY/i,
    /MOONSHOT_API_KEY/i,
    /KIMI_API_KEY/i,
    /ANTHROPIC_API_KEY/i,
    /\/api\/generate/i,
    /\/api\/write/i,
    /system prompt/i,
    /provider prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /sourceRefs/,
    /source_refs/,
    /profile\.id/,
    /kernel\.id/,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function validatePacket(payload) {
  const privateMatches = scanNoPrivateText(JSON.stringify(payload))
  assert(payload.status === 'passed', 'P135 artifact status must be passed')
  assert(payload.gate === 'P135_ZERO_COST_READER_EDGE_SYNC_GATE', 'P135 artifact gate mismatch')
  assert(payload.boundary === 'Zero-Cost Reader Edge Sync', 'P135 artifact boundary mismatch')
  for (const key of [
    'rootTestIncludesGate',
    'keepAliveWorkflowPresent',
    'keepAliveQueriesSupabaseHealthProbe',
    'keepAliveSkipsWhenSecretsMissing',
    'workflowUsesPublishableKeyOnly',
    'localSyncEnvIgnored',
    'backupsIgnored',
    'p134RunbookAligned',
    'p135GateDocumented',
    'operationalKeepAliveNeedsKeepAlive',
    'syncEnvSinglePointFailureDocumented',
    'historyManualRecoverySqlDocumented',
    'publicCloudAiRoutesAbsent',
  ]) {
    assert(payload.checks?.[key] === true, `P135 check ${key} must be true`)
  }
  assert(payload.publicBoundary?.cloudHosting === 'static_reader_storage_read_health_only', 'P135 cloud hosting boundary mismatch')
  assert(payload.publicBoundary?.cloudAiRuntime === 'absent', 'P135 cloud AI runtime must be absent')
  assert(payload.publicBoundary?.cloudAiApiKeys === 'absent', 'P135 cloud AI API keys must be absent')
  assert(payload.publicBoundary?.edgeAiRuntime === 'user_device_only', 'P135 edge AI runtime mismatch')
  assert(payload.publicBoundary?.readerCanTriggerAi === false, 'P135 reader must not trigger AI')
  assert(payload.publicBoundary?.historyRecoveryMode === 'manual_sql', 'P135 recovery mode mismatch')
  assert(payload.publicBoundary?.syncEnvBackupRequired === true, 'P135 sync env backup requirement mismatch')
  assert(payload.publicBoundary?.manualWorkflowKeepAliveRequired === true, 'P135 manual workflow keep-alive requirement mismatch')
  assert(Number(payload.scanStats?.publicFilesScanned || 0) > 0, 'P135 must scan public files')
  assert(Number(payload.scanStats?.violationCount || 0) === 0, 'P135 violation count must be 0')
  assert(payload.redaction?.secretsIncluded === false, 'P135 must not include secrets')
  assert(payload.redaction?.providerKeysIncluded === false, 'P135 must not include provider keys')
  assert(payload.redaction?.writerPasswordIncluded === false, 'P135 must not include writer password')
  assert(privateMatches.length === 0, `P135 artifact leaked private terms: ${privateMatches.join(', ')}`)
}

function writeAttestation(result) {
  mkdirSync(artifactDir, { recursive: true })
  const path = join(artifactDir, `zero-cost-reader-edge-sync-attestation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`)
  return path
}

let downloaded
try {
  let packetPath
  let runId = null
  let runUrl = null
  let expectedHeadSha = currentHead()
  let mode = 'local'

  if (source === 'github') {
    runId = String(process.env.GITHUB_RUN_ID || process.env.CHECK_GITHUB_ARTIFACTS_RUN_ID || '').trim()
    if (!runId) {
      if (required) throw new Error('GitHub artifact mode requires GITHUB_RUN_ID or CHECK_GITHUB_ARTIFACTS_RUN_ID')
      const artifactPath = writeAttestation({
        status: 'skipped',
        gate: 'P136_ZERO_COST_READER_EDGE_SYNC_ARTIFACT_ATTESTATION',
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
      if (required) throw new Error('No local zero-cost-reader-edge-sync artifact found')
      const artifactPath = writeAttestation({
        status: 'skipped',
        gate: 'P136_ZERO_COST_READER_EDGE_SYNC_ARTIFACT_ATTESTATION',
        reason: 'missing_local_packet_artifact',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
  }

  const payload = readJson(packetPath)
  validatePacket(payload)
  const result = {
    version: 1,
    gate: 'P136_ZERO_COST_READER_EDGE_SYNC_ARTIFACT_ATTESTATION',
    generatedAt: new Date().toISOString(),
    repository: repo,
    mode,
    required,
    runId,
    runUrl,
    expectedHeadSha,
    status: 'passed',
    sourceGate: payload.gate,
    publicBoundary: payload.publicBoundary,
    scanStats: payload.scanStats,
    redaction: payload.redaction,
  }
  const privateMatches = scanNoPrivateText(JSON.stringify(result))
  assert(privateMatches.length === 0, `P136 attestation leaked private terms: ${privateMatches.join(', ')}`)
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
