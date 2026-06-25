#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const gate = 'P168_OPERATOR_EVIDENCE_RETURN_FAST_PATH'

const sequence = [
  {
    id: 'p156-local-secret-guard',
    script: 'check:edge-only-data-api-local-secret-guard',
    env: { REQUIRE_EDGE_ONLY_DATA_API_LOCAL_SECRET_GUARD_READY: 'true' },
    blockerStage: 'local-secret-guard-ready',
  },
  {
    id: 'p140-intent-prepare',
    script: 'prepare:runtime-assignment-intent',
    env: {
      RUNTIME_ASSIGNMENT_INTENT_ENV_FILE: 'deploy/runtime-production/runtime-assignment.intent.env.local',
      RUNTIME_ASSIGNMENT_INTENT_FORCE: 'true',
    },
    blockerStage: 'runtime-assignment-intent-ready',
  },
  {
    id: 'p138-remote-assignment-prepare',
    script: 'remote-assignment:prepare',
    blockerStage: 'remote-assignment-contract-ready',
  },
  {
    id: 'p145-remote-health-check',
    script: 'remote-health:check',
    blockerStage: 'data-api-health-ready',
  },
  {
    id: 'p151-strict-intake',
    script: 'prepare:edge-only-data-api-strict-intake',
    blockerStage: 'strict-intake-ready',
  },
  {
    id: 'p164-current-head-refresh',
    script: 'prepare:current-head-operator-evidence',
    blockerStage: 'current-head-evidence-ready',
  },
]

function assert(condition, message) {
  if (!condition) throw new Error(message)
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
    /BEGIN (?:RSA|OPENSSH|PRIVATE) KEY/i,
    /SUPABASE_SERVICE_ROLE/i,
    /SERVICE_ROLE_KEY/i,
    /SUPABASE_SECRET_KEY/i,
    /SUPABASE_WRITER_PASSWORD/i,
    /WRITER_PASSWORD\s*[:=]\s*(?!false|<)/i,
    /OPENAI_API_KEY/i,
    /DEEPSEEK_API_KEY/i,
    /MOONSHOT_API_KEY/i,
    /KIMI_API_KEY/i,
    /ANTHROPIC_API_KEY/i,
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
    /https?:\/\/[^\s"<]+/i,
    /[a-z0-9-]{12,}\.supabase\.co/i,
    /eyJ[A-Za-z0-9_-]{20,}/,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(String)
}

function writeArtifact(payload) {
  mkdirSync(artifactDir, { recursive: true })
  const artifactPath = join(
    artifactDir,
    `operator-evidence-return-fast-path-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  )
  const hits = scanNoPrivateTerms(payload)
  assert(hits.length === 0, `P168 artifact leaked private terms: ${hits.join(', ')}`)
  writeFileSync(artifactPath, `${JSON.stringify(payload, null, 2)}\n`)
  return artifactPath
}

function runStep(step) {
  const startedAt = Date.now()
  const result = spawnSync('npm', ['run', step.script], {
    cwd: root,
    env: { ...process.env, ...(step.env || {}) },
    stdio: 'inherit',
    timeout: 300000,
  })
  return {
    id: step.id,
    npmScript: step.script,
    blockerStage: step.blockerStage,
    status: result.status === 0 ? 'passed' : 'failed',
    exitCode: result.status,
    signal: result.signal,
    durationMs: Date.now() - startedAt,
    outputIncluded: false,
  }
}

assert(existsSync(join(root, 'docs/backend/P168_OPERATOR_EVIDENCE_RETURN_FAST_PATH.md')), 'missing P168 document')

const steps = []
for (const step of sequence) {
  const record = runStep(step)
  steps.push(record)
  if (record.status !== 'passed') {
    const payload = {
      version: 1,
      gate,
      status: 'failed_waiting_for_external_evidence',
      generatedAt: new Date().toISOString(),
      headSha: currentHead(),
      failedStep: record.id,
      blockedStage: record.blockerStage,
      steps,
      commandValuesIncluded: false,
      createsRemoteServices: false,
      setsGitHubVariables: false,
      storesProviderSecrets: false,
      promotesLiveRuntime: false,
      writesCanon: false,
    }
    const artifactPath = writeArtifact(payload)
    console.error(JSON.stringify({
      status: payload.status,
      gate,
      failedStep: payload.failedStep,
      blockedStage: payload.blockedStage,
      artifactPath: relative(root, artifactPath),
    }, null, 2))
    process.exit(record.exitCode || 1)
  }
}

const payload = {
  version: 1,
  gate,
  status: 'passed',
  generatedAt: new Date().toISOString(),
  headSha: currentHead(),
  steps,
  commands: steps.map(step => step.npmScript),
  commandValuesIncluded: false,
  createsRemoteServices: false,
  setsGitHubVariables: false,
  storesProviderSecrets: false,
  promotesLiveRuntime: false,
  writesCanon: false,
  nextExpectedLoopDecision: 'operator-assignment-evidence-intake no longer selected after strict evidence is accepted',
}

const artifactPath = writeArtifact(payload)
console.log(JSON.stringify({
  status: payload.status,
  gate,
  steps: payload.steps.length,
  artifactPath: relative(root, artifactPath),
}, null, 2))
