#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')
const gate = 'P151_EDGE_ONLY_DATA_API_STRICT_INTAKE'
const localEnvRel = 'deploy/runtime-production/runtime-assignment.intent.env.local'
const localIntentRel = 'deploy/runtime-production/runtime-assignment.intent.local.json'
const contractRel = 'deploy/runtime-production/generated/remote-assignment.contract.json'
const healthResultRel = 'deploy/runtime-production/generated/remote-health-evidence.result.json'
const required = process.env.REQUIRE_EDGE_ONLY_DATA_API_STRICT_INTAKE_READY === 'true'
const runChain = process.env.RUN_EDGE_ONLY_DATA_API_STRICT_INTAKE_CHAIN === 'true'
const runRemoteHealth = process.env.RUN_EDGE_ONLY_DATA_API_REMOTE_HEALTH_CHECK === 'true'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function path(rel) {
  return join(root, rel)
}

function read(rel) {
  return readFileSync(path(rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
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

function runNpm(args, extraEnv = {}) {
  execFileSync('npm', args, {
    cwd: root,
    stdio: 'inherit',
    timeout: 120000,
    env: {
      ...process.env,
      ...extraEnv,
    },
  })
}

function gitIgnored(rel) {
  try {
    execFileSync('git', ['check-ignore', '--quiet', rel], {
      cwd: root,
      stdio: 'ignore',
      timeout: 8000,
    })
    return true
  } catch {
    return existsSync(path('.gitignore')) && read('.gitignore').includes(rel)
  }
}

function isPlaceholder(value) {
  return !String(value || '').trim() || /<[^>]+>|REPLACE_ME|YOUR_|TODO_|FILL_|unknown|example/i.test(String(value || ''))
}

function isHttpsProductionOrigin(value) {
  if (isPlaceholder(value)) return false
  try {
    const url = new URL(String(value).trim())
    return url.protocol === 'https:'
      && !url.username
      && !url.password
      && !url.search
      && !url.hash
      && !['localhost', '127.0.0.1', '0.0.0.0', '::1', 'example.com'].includes(url.hostname)
      && !url.hostname.endsWith('.local')
      && !url.hostname.endsWith('.invalid')
      && !url.hostname.includes('supabase-project-ref')
  } catch {
    return false
  }
}

function parseEnvFile(rel) {
  if (!existsSync(path(rel))) return { present: false, values: {}, keyCount: 0 }
  const values = {}
  const seen = new Set()
  for (const [index, rawLine] of read(rel).split(/\r?\n/).entries()) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line)
    assert(match, `${rel} line ${index + 1} must be KEY=value`)
    const [, key, rawValue] = match
    assert(!seen.has(key), `${rel} contains duplicate key ${key}`)
    seen.add(key)
    values[key] = rawValue.trim()
  }
  return { present: true, values, keyCount: seen.size }
}

function loadEnvPresenceFromFile(rel) {
  if (!existsSync(path(rel))) return new Set()
  const keys = new Set()
  for (const rawLine of read(rel).split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line)
    if (match && !isPlaceholder(match[2])) keys.add(match[1])
  }
  return keys
}

function publishableKeyPresent() {
  const supportedKeys = [
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_ANON_KEY',
    'SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_ANON_KEY',
  ]
  const envHasKey = supportedKeys.some(key => !isPlaceholder(process.env[key]))
  const fileKeys = new Set([
    ...loadEnvPresenceFromFile('.env.local'),
    ...loadEnvPresenceFromFile('.env.local.sync'),
  ])
  const fileHasKey = supportedKeys.some(key => fileKeys.has(key))
  return {
    present: envHasKey || fileHasKey,
    processEnvPresent: envHasKey,
    localFilePresent: fileHasKey,
    supportedKeyCount: supportedKeys.length,
    valuesIncluded: false,
  }
}

function latestArtifact(prefix, predicate = null) {
  if (!existsSync(artifactDir)) return null
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .map(name => join(artifactDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  for (const file of files) {
    const payload = JSON.parse(readFileSync(file, 'utf8'))
    if (!predicate || predicate(payload)) return { file, payload }
  }
  return null
}

function scanNoPrivateTerms(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL=(?!<)/,
    /postgres(ql)?:\/\/[^<]/i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/i,
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
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(String)
}

function safeEnvStatus(env) {
  const serviceId = env.RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID || env.SUPABASE_PROJECT_REF || ''
  const origin = env.RUNTIME_ASSIGNMENT_DATA_API_ORIGIN || env.SUPABASE_URL || ''
  return {
    present: Boolean(env && Object.keys(env).length),
    serviceIdPresent: !isPlaceholder(serviceId),
    originPresent: !isPlaceholder(origin),
    originLooksProductionHttps: isHttpsProductionOrigin(origin),
    configuredFlagTrue: env.RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED === 'true',
    probeTableHealthProbe: (env.RUNTIME_ASSIGNMENT_DATA_PROBE_TABLE || 'health_probe') === 'health_probe',
    probeIdReader: (env.RUNTIME_ASSIGNMENT_DATA_PROBE_ID || 'reader') === 'reader',
    valuesIncluded: false,
  }
}

function safeIntentStatus() {
  if (!existsSync(path(localIntentRel))) return { present: false, valuesIncluded: false }
  const intent = readJson(localIntentRel)
  const data = intent.data_api || {}
  return {
    present: true,
    runtimeModeEdgeOnly: intent.runtime_mode === 'edge-only',
    serviceIdPresent: !isPlaceholder(data.service_id),
    originPresent: !isPlaceholder(data.origin),
    originLooksProductionHttps: isHttpsProductionOrigin(data.origin),
    configuredFlagTrue: data.secrets_configured === true,
    remoteAgentRequired: intent.agent?.remote_required === true,
    cloudAiRuntime: intent.agent?.ai_generation_cloud_runtime === true,
    readerCanTriggerAi: intent.agent?.reader_can_trigger_ai === true,
    valuesIncluded: false,
  }
}

function safeContractStatus() {
  if (!existsSync(path(contractRel))) return { present: false, valuesIncluded: false }
  const contract = readJson(contractRel)
  const data = contract.topology?.data_api || {}
  return {
    present: true,
    runtimeModeEdgeOnly: contract.runtime_mode === 'edge-only',
    serviceIdPresent: !isPlaceholder(data.service_id),
    originPresent: !isPlaceholder(data.origin),
    originLooksProductionHttps: isHttpsProductionOrigin(data.origin),
    configuredFlagTrue: data.secrets_configured === true,
    remoteAgentRequired: contract.topology?.agent?.remote_required === true,
    remoteAgentHealthRequired: contract.health?.remote_agent_health_required === true,
    valuesIncluded: false,
  }
}

function safeHealthStatus() {
  if (!existsSync(path(healthResultRel))) return { present: false, ready: false, valuesIncluded: false }
  const health = readJson(healthResultRel)
  return {
    present: true,
    ready: health.status === 'ok'
      && health.runtime_mode === 'edge-only'
      && health.data_api?.table === 'health_probe'
      && health.data_api?.probe?.id === 'reader'
      && health.data_api?.probe?.status === 'ok'
      && health.remote_agent?.required === false,
    runtimeModeEdgeOnly: health.runtime_mode === 'edge-only',
    tableHealthProbe: health.data_api?.table === 'health_probe',
    probeIdReader: health.data_api?.probe?.id === 'reader',
    probeStatusOk: health.data_api?.probe?.status === 'ok',
    remoteAgentRequired: health.remote_agent?.required === true,
    valuesIncluded: false,
  }
}

function latestGateStatus(prefix, gateName) {
  const artifact = latestArtifact(prefix, payload => payload.gate === gateName)
  if (!artifact) return { present: false }
  return {
    present: true,
    status: artifact.payload.status,
    decision: artifact.payload.decision || null,
    selectedGoal: artifact.payload.selectedGoal || null,
    healthReady: artifact.payload.healthReady === true,
    missingStages: Array.isArray(artifact.payload.missingStages) ? artifact.payload.missingStages : [],
    blockedStages: Array.isArray(artifact.payload.blockedStages) ? artifact.payload.blockedStages : [],
    valuesIncluded: false,
  }
}

function writeArtifact(payload) {
  mkdirSync(artifactDir, { recursive: true })
  const artifactPath = join(artifactDir, `edge-only-data-api-strict-intake-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(artifactPath, `${JSON.stringify(payload, null, 2)}\n`)
  return artifactPath
}

for (const file of [
  'package.json',
  '.gitignore',
  'deploy/runtime-production/runtime-assignment.intent.env.example',
  'docs/backend/P142_EDGE_ONLY_DATA_API_EVIDENCE_INTAKE.md',
  'docs/backend/P145_REMOTE_HEALTH_EVIDENCE_ARTIFACT_GATE.md',
  'docs/backend/P150_EDGE_ONLY_DATA_API_EVIDENCE_READINESS.md',
  'docs/backend/P151_EDGE_ONLY_DATA_API_STRICT_INTAKE.md',
  'docs/design-system/DEVELOPMENT_NOTES.md',
  '.github/workflows/pages.yml',
  'scripts/check-github-actions-artifacts.mjs',
  'scripts/check-ci-artifact-content-coverage.mjs',
]) {
  assert(existsSync(path(file)), `missing P151 prerequisite: ${file}`)
}

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:edge-only-data-api-strict-intake'] === 'node scripts/check-edge-only-data-api-strict-intake.mjs',
  'package.json must expose check:edge-only-data-api-strict-intake',
)
assert(
  String(packageJson.scripts.test || '').includes('npm run check:remote-health-evidence-artifact && npm run check:edge-only-data-api-strict-intake && npm run check:remote-assignment-image-drift'),
  'root test must run P151 after P145 and before image drift / downstream operator packets',
)

for (const [rel, terms] of Object.entries({
  'docs/backend/P142_EDGE_ONLY_DATA_API_EVIDENCE_INTAKE.md': [
    'check:edge-only-data-api-strict-intake',
    'REQUIRE_EDGE_ONLY_DATA_API_STRICT_INTAKE_READY=true',
  ],
  'docs/backend/P150_EDGE_ONLY_DATA_API_EVIDENCE_READINESS.md': [
    'check:edge-only-data-api-strict-intake',
  ],
  'docs/backend/P151_EDGE_ONLY_DATA_API_STRICT_INTAKE.md': [
    'P151 Edge-Only Data API Strict Intake',
    'check:edge-only-data-api-strict-intake',
    'RUN_EDGE_ONLY_DATA_API_STRICT_INTAKE_CHAIN=true',
    'REQUIRE_EDGE_ONLY_DATA_API_STRICT_INTAKE_READY=true',
  ],
  'docs/design-system/DEVELOPMENT_NOTES.md': [
    'P151 Edge-Only Data API Strict Intake',
    'check:edge-only-data-api-strict-intake',
  ],
  '.github/workflows/pages.yml': [
    'edge-only-data-api-strict-intake',
  ],
  'scripts/check-github-actions-artifacts.mjs': [
    'edge-only-data-api-strict-intake',
  ],
  'scripts/check-ci-artifact-content-coverage.mjs': [
    'edge-only-data-api-strict-intake',
  ],
})) {
  const body = read(rel)
  for (const term of terms) assert(body.includes(term), `${rel} must include ${term}`)
}

const envFile = parseEnvFile(localEnvRel)

if (runChain) {
  assert(envFile.present, `${localEnvRel} is required before running the P151 chain`)
  assert(gitIgnored(localEnvRel), `${localEnvRel} must be ignored by Git`)
  runNpm(['run', 'prepare:runtime-assignment-intent'], {
    RUNTIME_ASSIGNMENT_INTENT_ENV_FILE: localEnvRel,
    RUNTIME_ASSIGNMENT_INTENT_FORCE: 'true',
  })
  runNpm(['run', 'remote-assignment:prepare'])
  runNpm(['run', 'check:remote-assignment-compiler-coherence'])
  if (runRemoteHealth) runNpm(['run', 'remote-health:check'])
  runNpm(['run', 'check:remote-health-evidence-artifact'])
  runNpm(['run', 'check:edge-only-data-api-evidence-readiness'])
  runNpm(['run', 'check:remote-runtime-assignment-intake'])
  runNpm(['run', 'check:loop-next-goal-ledger'])
}

const envStatus = safeEnvStatus(envFile.values)
const intentStatus = safeIntentStatus()
const contractStatus = safeContractStatus()
const healthStatus = safeHealthStatus()
const keyStatus = publishableKeyPresent()
const p145 = latestGateStatus('remote-health-evidence-attestation-', 'P145_REMOTE_HEALTH_EVIDENCE_ARTIFACT_GATE')
const p150 = latestGateStatus('edge-only-data-api-evidence-readiness-', 'P150_EDGE_ONLY_DATA_API_EVIDENCE_READINESS')
const p75 = latestGateStatus('remote-runtime-assignment-intake-', 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE')
const p121 = latestGateStatus('loop-next-goal-ledger-', 'P121_LOOP_NEXT_GOAL_LEDGER')

const missingStages = []
if (!envFile.present) missingStages.push('local-intent-env-file')
if (envFile.present && !gitIgnored(localEnvRel)) missingStages.push('local-intent-env-gitignored')
if (!envStatus.serviceIdPresent) missingStages.push('data-api-service-id')
if (!envStatus.originPresent) missingStages.push('data-api-origin')
if (!envStatus.originLooksProductionHttps) missingStages.push('data-api-production-origin')
if (!envStatus.configuredFlagTrue) missingStages.push('data-api-configured')
if (!envStatus.probeTableHealthProbe) missingStages.push('health-probe-table')
if (!envStatus.probeIdReader) missingStages.push('health-probe-id')
if (!keyStatus.present) missingStages.push('publishable-key-local')
if (!intentStatus.present) missingStages.push('prepared-intent')
if (intentStatus.present && !intentStatus.runtimeModeEdgeOnly) missingStages.push('prepared-intent-edge-only')
if (intentStatus.remoteAgentRequired || intentStatus.cloudAiRuntime || intentStatus.readerCanTriggerAi) missingStages.push('prepared-intent-edge-boundary')
if (!contractStatus.present) missingStages.push('compiled-contract')
if (contractStatus.present && !contractStatus.runtimeModeEdgeOnly) missingStages.push('compiled-contract-edge-only')
if (contractStatus.remoteAgentRequired || contractStatus.remoteAgentHealthRequired) missingStages.push('compiled-contract-agent-boundary')
if (!healthStatus.ready) missingStages.push('remote-health-ready')
if (!p145.present || p145.status !== 'passed' || !p145.healthReady) missingStages.push('p145-health-attestation-ready')
if (!p150.present || p150.status !== 'passed' || p150.missingStages.length > 0) missingStages.push('p150-readiness-ready')
if (!p75.present || p75.blockedStages.includes('data-api-service-id') || p75.blockedStages.includes('data-api-origin') || p75.blockedStages.includes('data-api-secrets-ready') || p75.blockedStages.includes('data-api-health-ready')) {
  missingStages.push('p75-data-api-blockers-cleared')
}
if (!p121.present || p121.selectedGoal === 'operator-assignment-evidence-intake') missingStages.push('loop-next-goal-advanced')

const ready = missingStages.length === 0
if (required && !ready) {
  throw new Error(`P151 strict intake required but not ready: ${missingStages.join(', ')}`)
}

const artifact = {
  version: 1,
  gate,
  generatedAt: new Date().toISOString(),
  headSha: currentHead(),
  status: ready ? 'passed' : 'passed_waiting_for_edge_only_data_api_strict_intake',
  decision: ready ? 'edge_only_data_api_strict_intake_ready' : 'edge_only_data_api_strict_intake_waiting_for_operator_input',
  required,
  runChain,
  runRemoteHealth,
  missingStages,
  localIntentEnv: {
    present: envFile.present,
    ignoredByGit: envFile.present ? gitIgnored(localEnvRel) : false,
    keyCount: envFile.keyCount,
    valuesIncluded: false,
  },
  dataApi: envStatus,
  publishableKey: keyStatus,
  preparedIntent: intentStatus,
  compiledContract: contractStatus,
  healthEvidence: healthStatus,
  gates: {
    p145,
    p150,
    p75,
    p121,
  },
  boundary: {
    createsRemoteServices: false,
    setsGitHubVariables: false,
    writesCanon: false,
    promotesLiveRuntime: false,
    storesProviderSecrets: false,
    storesServiceRoleKey: false,
    storesWriterPassword: false,
    requiresRemoteAgent: false,
    valuesIncluded: false,
  },
  nextStrictCommand: 'RUN_EDGE_ONLY_DATA_API_STRICT_INTAKE_CHAIN=true RUN_EDGE_ONLY_DATA_API_REMOTE_HEALTH_CHECK=true REQUIRE_EDGE_ONLY_DATA_API_STRICT_INTAKE_READY=true npm run check:edge-only-data-api-strict-intake',
}

const privateMatches = scanNoPrivateTerms(artifact)
assert(privateMatches.length === 0, `P151 artifact leaked private terms: ${privateMatches.join(', ')}`)
const artifactPath = writeArtifact(artifact)

console.log(JSON.stringify({
  status: artifact.status,
  gate,
  decision: artifact.decision,
  missingStages,
  artifactPath: relative(root, artifactPath),
}, null, 2))
