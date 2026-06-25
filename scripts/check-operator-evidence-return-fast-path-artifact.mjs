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
const artifactName = 'operator-evidence-return-fast-path'
const required = process.env.CHECK_OPERATOR_EVIDENCE_RETURN_FAST_PATH_ARTIFACT_REQUIRED === 'true'
const checkCurrentRun = process.env.CHECK_CURRENT_GITHUB_RUN_ARTIFACTS === 'true'
const source = process.env.CHECK_OPERATOR_EVIDENCE_RETURN_FAST_PATH_ARTIFACT_SOURCE || (checkCurrentRun ? 'github' : 'local')
const attestationGate = 'P174_OPERATOR_EVIDENCE_RETURN_FAST_PATH_ARTIFACT_ATTESTATION'

const requiredScripts = [
  'check:edge-only-data-api-local-secret-guard',
  'prepare:runtime-assignment-intent',
  'remote-assignment:prepare',
  'remote-health:check',
  'prepare:edge-only-data-api-strict-intake',
  'prepare:current-head-operator-evidence',
]

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

function latestLocalFastPath() {
  if (!existsSync(artifactDir)) return null
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith('operator-evidence-return-fast-path-contract-') && name.endsWith('.json'))
    .map(name => join(artifactDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  return files.length ? files[0] : null
}

function githubRun(runId) {
  return JSON.parse(run('gh', ['api', `repos/${repo}/actions/runs/${runId}`]))
}

function downloadGithubFastPath(runId) {
  const dir = mkdtempSync(join(tmpdir(), 'p174-operator-evidence-fast-path-'))
  try {
    run('gh', ['run', 'download', String(runId), '--repo', repo, '--name', artifactName, '--dir', dir], {
      timeout: 60000,
    })
    const jsonFiles = collectFiles(dir)
      .filter(file => /operator-evidence-return-fast-path-contract-.*\.json$/.test(file))
      .sort()
    assert(jsonFiles.length === 1, `expected exactly one P168 contract JSON in GitHub artifact, got ${jsonFiles.length}`)
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
    /SUPABASE_SERVICE_ROLE/i,
    /SERVICE_ROLE_KEY/i,
    /SUPABASE_SECRET_KEY/i,
    /SUPABASE_WRITER_PASSWORD\s*[:=]\s*(?!<)/i,
    /WRITER_PASSWORD\s*[:=]\s*(?!false|<)/i,
    /OPENAI_API_KEY\s*[:=]\s*(?!<)/i,
    /DEEPSEEK_API_KEY\s*[:=]\s*(?!<)/i,
    /MOONSHOT_API_KEY\s*[:=]\s*(?!<)/i,
    /KIMI_API_KEY\s*[:=]\s*(?!<)/i,
    /ANTHROPIC_API_KEY\s*[:=]\s*(?!<)/i,
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

function validateFastPath(payload) {
  assert(payload.version === 1, 'P168 contract version must be 1')
  assert(payload.gate === 'P168_OPERATOR_EVIDENCE_RETURN_FAST_PATH', 'P168 contract gate mismatch')
  assert(payload.status === 'passed', 'P168 contract status mismatch')
  assert(payload.prepareCommand === 'npm run prepare:operator-evidence-return-fast-path', 'P168 prepare command mismatch')
  assert(Array.isArray(payload.checkedSequence), 'P168 checkedSequence must be an array')

  for (const script of requiredScripts) {
    assert(
      payload.checkedSequence.includes(`script: '${script}'`),
      `P168 checkedSequence must include ${script}`,
    )
  }
  assert(payload.checkedSequence.length === requiredScripts.length, 'P168 checkedSequence length must match the required fast-path sequence')

  const boundary = payload.boundary || {}
  assert(boundary.rootTestRunsPrepareCommand === false, 'P168 root test must not run the operator-only prepare command')
  for (const key of [
    'commandValuesIncluded',
    'createsRemoteServices',
    'setsGitHubVariables',
    'storesProviderSecrets',
    'writesCanon',
  ]) {
    assert(boundary[key] === false, `P168 boundary.${key} must be false`)
  }

  const privateHits = scanNoPrivateTerms(payload)
  assert(privateHits.length === 0, `P168 contract leaked private terms: ${privateHits.join(', ')}`)
}

function writeAttestation(result) {
  mkdirSync(artifactDir, { recursive: true })
  const path = join(artifactDir, `operator-evidence-return-fast-path-attestation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
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
        gate: attestationGate,
        reason: 'missing_github_run_id',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
    const runInfo = githubRun(runId)
    runUrl = runInfo.html_url
    downloaded = downloadGithubFastPath(runId)
    packetPath = downloaded.jsonPath
    mode = 'github_current_run'
  } else {
    packetPath = latestLocalFastPath()
    if (!packetPath) {
      if (required) throw new Error('No local operator-evidence-return-fast-path contract artifact found')
      const artifactPath = writeAttestation({
        status: 'skipped',
        gate: attestationGate,
        reason: 'missing_local_operator_evidence_return_fast_path_artifact',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
  }

  const payload = readJson(packetPath)
  validateFastPath(payload)

  const result = {
    version: 1,
    gate: attestationGate,
    generatedAt: new Date().toISOString(),
    repository: repo,
    mode,
    required,
    runId,
    runUrl,
    status: 'passed',
    sourceArtifact: source === 'github' ? artifactName : relative(root, packetPath),
    sourceGate: payload.gate,
    checkedSequenceCount: payload.checkedSequence.length,
    prepareCommand: payload.prepareCommand,
    boundary: payload.boundary,
    nextGoalPreserved: 'operator-assignment-evidence-intake',
  }
  const privateHits = scanNoPrivateTerms(result)
  assert(privateHits.length === 0, `P174 attestation leaked private terms: ${privateHits.join(', ')}`)
  const artifactPath = writeAttestation(result)
  console.log(JSON.stringify({
    status: result.status,
    gate: result.gate,
    mode,
    runId,
    artifactPath: relative(root, artifactPath),
    checkedSequenceCount: result.checkedSequenceCount,
    nextGoalPreserved: result.nextGoalPreserved,
  }, null, 2))
} finally {
  downloaded?.cleanup?.()
}
