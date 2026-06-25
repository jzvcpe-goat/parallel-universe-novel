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
const artifactName = 'operator-operations-continuity'
const required = process.env.CHECK_OPERATOR_OPERATIONS_CONTINUITY_ARTIFACT_REQUIRED === 'true'
const checkCurrentRun = process.env.CHECK_CURRENT_GITHUB_RUN_ARTIFACTS === 'true'
const source = process.env.CHECK_OPERATOR_OPERATIONS_CONTINUITY_ARTIFACT_SOURCE || (checkCurrentRun ? 'github' : 'local')

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

function latestLocalContinuity() {
  if (!existsSync(artifactDir)) return null
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith('operator-operations-continuity-') && name.endsWith('.json'))
    .filter(name => !name.startsWith('operator-operations-continuity-attestation-'))
    .map(name => join(artifactDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  return files.length ? files[0] : null
}

function githubRun(runId) {
  return JSON.parse(run('gh', ['api', `repos/${repo}/actions/runs/${runId}`]))
}

function downloadGithubContinuity(runId) {
  const dir = mkdtempSync(join(tmpdir(), 'p172-operator-continuity-'))
  try {
    run('gh', ['run', 'download', String(runId), '--repo', repo, '--name', artifactName, '--dir', dir], {
      timeout: 60000,
    })
    const jsonFiles = collectFiles(dir)
      .filter(file => /operator-operations-continuity-.*\.json$/.test(file))
      .filter(file => !/operator-operations-continuity-attestation-.*\.json$/.test(file))
      .sort()
    assert(jsonFiles.length === 1, `expected exactly one P170 JSON in GitHub artifact, got ${jsonFiles.length}`)
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

function scanNoPrivateTerms(payload) {
  const text = JSON.stringify(payload)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /postgres(?:ql)?:\/\/[^<\s`]+/i,
    /DATABASE_URL\s*[:=]\s*(?!<)/i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/,
    /Authorization:\s*Bearer\s+(?!<shared-tool-bridge-secret>|<token>|dev-local-token)/i,
    /[a-z0-9-]{12,}\.supabase\.co/i,
    /eyJ[A-Za-z0-9_-]{20,}/,
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

function validateContinuity(payload) {
  assert(payload.version === 1, 'P170 artifact version must be 1')
  assert(payload.gate === 'P170_OPERATOR_OPERATIONS_CONTINUITY', 'P170 artifact gate mismatch')
  assert(payload.status === 'passed', 'P170 artifact status mismatch')
  assert(payload.nextGoal === 'operator-assignment-evidence-intake', 'P170 next goal must stay on operator evidence intake')
  assert(payload.valuesIncluded === false, 'P170 must not include operator values')

  const continuity = payload.continuity || {}
  for (const key of [
    'keepaliveDirectHealthProbe',
    'keepaliveManualDispatch',
    'keepaliveSchedule',
    'envLocalSyncBackupDocumented',
    'novelsHistoryManualRestoreDocumented',
    'p134ToP136Linked',
    'p147Linked',
    'p168Linked',
    'p170InRootTest',
  ]) {
    assert(continuity[key] === true, `P170 continuity.${key} must be true`)
  }

  const boundary = payload.boundary || {}
  for (const key of [
    'createsRemoteServices',
    'writesLocalEnvValues',
    'uploadsSecrets',
    'promotesLiveRuntime',
    'marksOperatorEvidenceComplete',
  ]) {
    assert(boundary[key] === false, `P170 boundary.${key} must be false`)
  }

  const privateHits = scanNoPrivateTerms(payload)
  assert(privateHits.length === 0, `P170 artifact leaked private terms: ${privateHits.join(', ')}`)
}

function writeAttestation(result) {
  mkdirSync(artifactDir, { recursive: true })
  const path = join(artifactDir, `operator-operations-continuity-attestation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`)
  return path
}

let downloaded
try {
  let packetPath
  let runId = null
  let runUrl = null
  let mode = 'local'

  if (source === 'github') {
    runId = String(process.env.GITHUB_RUN_ID || process.env.CHECK_GITHUB_ARTIFACTS_RUN_ID || '').trim()
    if (!runId) {
      if (required) throw new Error('GitHub artifact mode requires GITHUB_RUN_ID or CHECK_GITHUB_ARTIFACTS_RUN_ID')
      const artifactPath = writeAttestation({
        status: 'skipped',
        gate: 'P172_OPERATOR_OPERATIONS_CONTINUITY_ARTIFACT_ATTESTATION',
        reason: 'missing_github_run_id',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
    const runInfo = githubRun(runId)
    runUrl = runInfo.html_url
    downloaded = downloadGithubContinuity(runId)
    packetPath = downloaded.jsonPath
    mode = 'github_current_run'
  } else {
    packetPath = latestLocalContinuity()
    if (!packetPath) {
      if (required) throw new Error('No local operator-operations-continuity artifact found')
      const artifactPath = writeAttestation({
        status: 'skipped',
        gate: 'P172_OPERATOR_OPERATIONS_CONTINUITY_ARTIFACT_ATTESTATION',
        reason: 'missing_local_operator_operations_continuity_artifact',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
  }

  const payload = readJson(packetPath)
  validateContinuity(payload)

  const result = {
    version: 1,
    gate: 'P172_OPERATOR_OPERATIONS_CONTINUITY_ARTIFACT_ATTESTATION',
    generatedAt: new Date().toISOString(),
    repository: repo,
    mode,
    required,
    runId,
    runUrl,
    status: 'passed',
    sourceArtifact: source === 'github' ? artifactName : relative(root, packetPath),
    sourceGate: payload.gate,
    continuityChecks: Object.keys(payload.continuity || {}).length,
    nextGoal: payload.nextGoal,
    boundary: payload.boundary,
    valuesIncluded: payload.valuesIncluded,
  }
  const artifactPath = writeAttestation(result)
  console.log(JSON.stringify({
    status: result.status,
    gate: result.gate,
    mode,
    runId,
    artifactPath: relative(root, artifactPath),
    continuityChecks: result.continuityChecks,
    nextGoal: result.nextGoal,
  }, null, 2))
} finally {
  downloaded?.cleanup?.()
}
