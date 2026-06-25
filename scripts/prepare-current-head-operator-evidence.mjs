#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const gate = 'P164_CURRENT_HEAD_OPERATOR_EVIDENCE_REFRESH'

const sequence = [
  { id: 'p163-data-api-card', script: 'check:edge-only-data-api-evidence-card' },
  { id: 'p137-local-tail', script: 'prepare:loop-next-goal-local-tail', writesLocalIgnoredFiles: true },
  { id: 'p130-command-consistency', script: 'check:operator-assignment-loop-command-consistency' },
  { id: 'p131-command-consistency-artifact', script: 'check:operator-assignment-loop-command-consistency-artifact' },
  { id: 'p132-current-head-coherence', script: 'check:operator-assignment-current-head-coherence' },
]

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function readJson(relPath) {
  return JSON.parse(readFileSync(join(root, relPath), 'utf8'))
}

function currentHead() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 8000,
    }).trim()
  } catch {
    return 'source-workspace-no-git'
  }
}

function scanNoPrivateTerms(payload) {
  const text = JSON.stringify(payload)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL=(?!<)/,
    /postgres(?:ql)?:\/\/[^<]/i,
    /BEGIN (?:RSA|OPENSSH|PRIVATE) KEY/,
    /SUPABASE_SERVICE_ROLE_KEY/i,
    /SUPABASE_SECRET_KEY/i,
    /SUPABASE_WRITER_PASSWORD/i,
    /NARRATIVEOS_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/i,
    /MASTRA_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/i,
    /NARRATIVEOS_CREATOR_API_KEY\s*[:=]\s*(?!<)/i,
    /system prompt/i,
    /provider prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
    /sourceRefs/,
    /source_refs/,
    /profile\.id/,
    /kernel\.id/,
    /https?:\/\/[^\s"<]+/i,
    /[a-z0-9-]{12,}\.supabase\.co/i,
    /eyJ[A-Za-z0-9_-]{20,}/,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function runStep(step) {
  const startedAt = Date.now()
  const result = spawnSync('npm', ['run', step.script], {
    cwd: root,
    env: { ...process.env, ...(step.env || {}) },
    stdio: 'inherit',
    timeout: 240000,
  })
  const record = {
    id: step.id,
    npmScript: step.script,
    status: result.status === 0 ? 'passed' : 'failed',
    exitCode: result.status,
    signal: result.signal,
    durationMs: Date.now() - startedAt,
    writesLocalIgnoredFiles: Boolean(step.writesLocalIgnoredFiles),
  }
  if (record.status !== 'passed') {
    const details = result.error ? `: ${result.error.message}` : ''
    throw new Error(`${step.script} failed${details}`)
  }
  return record
}

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['prepare:current-head-operator-evidence'] === 'node scripts/prepare-current-head-operator-evidence.mjs',
  'package.json must expose prepare:current-head-operator-evidence',
)
assert(
  packageJson.scripts['check:current-head-operator-evidence-refresh'] === 'node scripts/check-current-head-operator-evidence-refresh.mjs',
  'package.json must expose check:current-head-operator-evidence-refresh',
)
assert(
  !String(packageJson.scripts.test || '').includes('prepare:current-head-operator-evidence'),
  'root npm run test must not run prepare:current-head-operator-evidence because it refreshes local and network evidence',
)
assert(existsSync(join(root, 'docs/backend/P164_CURRENT_HEAD_OPERATOR_EVIDENCE_REFRESH.md')), 'missing P164 document')

const steps = []
for (const step of sequence) {
  steps.push(runStep(step))
}

mkdirSync(artifactDir, { recursive: true })
const artifact = {
  version: 1,
  gate,
  status: 'passed',
  generatedAt: new Date().toISOString(),
  headSha: currentHead(),
  localOnly: true,
  writesTrackedFiles: false,
  createsRemoteServices: false,
  setsGitHubVariables: false,
  storesProviderSecrets: false,
  promotesLiveRuntime: false,
  selectedGoal: 'operator-assignment-evidence-intake',
  commands: steps.map(step => step.npmScript),
  steps,
  nextRequiredExternalEvidence: 'managed Data API origin/configuration/local publishable key/reader health probe',
}

const privateHits = scanNoPrivateTerms(artifact)
assert(privateHits.length === 0, `P164 artifact leaked private terms: ${privateHits.join(', ')}`)

const artifactPath = join(artifactDir, `current-head-operator-evidence-refresh-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: artifact.status,
  gate: artifact.gate,
  headSha: artifact.headSha,
  steps: artifact.steps.length,
  artifactPath: relative(root, artifactPath),
}, null, 2))
