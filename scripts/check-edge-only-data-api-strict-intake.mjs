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
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'
const gate = 'P151_EDGE_ONLY_DATA_API_STRICT_INTAKE'
const localEnvRel = 'deploy/runtime-production/runtime-assignment.intent.env.local'
const localIntentRel = 'deploy/runtime-production/runtime-assignment.intent.local.json'
const contractRel = 'deploy/runtime-production/generated/remote-assignment.contract.json'
const healthResultRel = 'deploy/runtime-production/generated/remote-health-evidence.result.json'
const required = process.env.REQUIRE_EDGE_ONLY_DATA_API_STRICT_INTAKE_READY === 'true'
const runChain = process.env.RUN_EDGE_ONLY_DATA_API_STRICT_INTAKE_CHAIN === 'true'
const runRemoteHealth = process.env.RUN_EDGE_ONLY_DATA_API_REMOTE_HEALTH_CHECK === 'true'
const sealedStrictCommand = 'npm run prepare:edge-only-data-api-strict-intake'
const expandedStrictCommand = 'RUN_EDGE_ONLY_DATA_API_STRICT_INTAKE_CHAIN=true RUN_EDGE_ONLY_DATA_API_REMOTE_HEALTH_CHECK=true REQUIRE_EDGE_ONLY_DATA_API_STRICT_INTAKE_READY=true npm run check:edge-only-data-api-strict-intake'

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
  return execFileSync('npm', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 120000,
    env: {
      ...process.env,
      ...extraEnv,
    },
  })
}

function runChainStep(step, args, extraEnv, blockerStage, chainFailures) {
  try {
    runNpm(args, extraEnv)
    return true
  } catch (error) {
    chainFailures.push({
      step,
      blockerStage,
      exitStatus: typeof error.status === 'number' ? error.status : null,
      signal: error.signal || null,
      outputIncluded: false,
    })
    return false
  }
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

function localIntentFileIgnored() {
  return !existsSync(path(localIntentRel)) || gitIgnored(localIntentRel)
}

function semanticLocalInputStatus(envStatus, intentStatus, contractStatus) {
  return {
    present: envStatus.present || intentStatus.present || contractStatus.present,
    serviceIdPresent: envStatus.serviceIdPresent || intentStatus.serviceIdPresent || contractStatus.serviceIdPresent,
    originPresent: envStatus.originPresent || intentStatus.originPresent || contractStatus.originPresent,
    originLooksProductionHttps: envStatus.originLooksProductionHttps || intentStatus.originLooksProductionHttps || contractStatus.originLooksProductionHttps,
    configuredFlagTrue: envStatus.configuredFlagTrue || intentStatus.configuredFlagTrue || contractStatus.configuredFlagTrue,
    runtimeModeEdgeOnly: intentStatus.runtimeModeEdgeOnly === true || contractStatus.runtimeModeEdgeOnly === true,
    remoteAgentRequired: intentStatus.remoteAgentRequired === true || contractStatus.remoteAgentRequired === true,
    cloudAiRuntime: intentStatus.cloudAiRuntime === true,
    readerCanTriggerAi: intentStatus.readerCanTriggerAi === true,
    envAdapterPresent: envStatus.present,
    intentPresent: intentStatus.present,
    contractPresent: contractStatus.present,
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
  'docs/backend/P155_EDGE_ONLY_DATA_API_STRICT_INTAKE_ARTIFACT_ATTESTATION.md',
  'docs/design-system/DEVELOPMENT_NOTES.md',
  '.github/workflows/pages.yml',
  'scripts/check-github-actions-artifacts.mjs',
  'scripts/check-ci-artifact-content-coverage.mjs',
  'scripts/check-edge-only-data-api-strict-intake-artifact.mjs',
  'scripts/remote-assignment/check-remote-health-evidence.mjs',
]) {
  assert(existsSync(path(file)), `missing P151 prerequisite: ${file}`)
}

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:edge-only-data-api-strict-intake'] === 'node scripts/check-edge-only-data-api-strict-intake.mjs',
  'package.json must expose check:edge-only-data-api-strict-intake',
)
assert(
  packageJson.scripts['prepare:edge-only-data-api-strict-intake'] === expandedStrictCommand,
  'package.json must expose sealed prepare:edge-only-data-api-strict-intake command',
)
assert(
  packageJson.scripts['check:edge-only-data-api-strict-intake-artifact'] === 'node scripts/check-edge-only-data-api-strict-intake-artifact.mjs',
  'package.json must expose check:edge-only-data-api-strict-intake-artifact',
)
assert(
  String(packageJson.scripts.test || '').includes('npm run check:remote-health-evidence-artifact && npm run check:edge-only-data-api-strict-intake && npm run check:edge-only-data-api-strict-intake-artifact && npm run check:remote-assignment-image-drift'),
  'root test must run P151 then P155 after P145 and before image drift / downstream operator packets',
)
assert(
  !String(packageJson.scripts.test || '').includes('prepare:edge-only-data-api-strict-intake'),
  'root test must not run the strict operator-only Data API intake command',
)
assert(
  read('scripts/remote-assignment/check-remote-health-evidence.mjs').includes('process.env.SUPABASE_ANON_KEY'),
  'remote-health:check must support SUPABASE_ANON_KEY like P151 docs and key-presence checks',
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
    'check:edge-only-data-api-strict-intake-artifact',
    'prepare:edge-only-data-api-strict-intake',
    'RUN_EDGE_ONLY_DATA_API_STRICT_INTAKE_CHAIN=true',
    'REQUIRE_EDGE_ONLY_DATA_API_STRICT_INTAKE_READY=true',
    'SUPABASE_ANON_KEY',
    'localInputProjection',
    'runtime-assignment.intent.local.json',
  ],
  'docs/backend/P155_EDGE_ONLY_DATA_API_STRICT_INTAKE_ARTIFACT_ATTESTATION.md': [
    'P155 Edge-Only Data API Strict Intake Artifact Attestation',
    'check:edge-only-data-api-strict-intake-artifact',
    'edge-only-data-api-strict-intake',
  ],
  'docs/design-system/DEVELOPMENT_NOTES.md': [
    'P155 Strict Intake Artifact Content Attestation',
    'P151 Edge-Only Data API Strict Intake',
    'P153 Sealed Edge-Only Data API Strict Intake Command',
    'prepare:edge-only-data-api-strict-intake',
    'check:edge-only-data-api-strict-intake',
    'check:edge-only-data-api-strict-intake-artifact',
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
const chainFailures = []
const envStatusBeforeChain = safeEnvStatus(envFile.values)
const intentStatusBeforeChain = safeIntentStatus()

if (runChain) {
  let chainReady = true
  const envReadyForPrepare = envFile.present
    && gitIgnored(localEnvRel)
    && envStatusBeforeChain.serviceIdPresent
    && envStatusBeforeChain.originLooksProductionHttps
    && envStatusBeforeChain.configuredFlagTrue
  const intentReadyForCompile = intentStatusBeforeChain.present
    && localIntentFileIgnored()
    && intentStatusBeforeChain.runtimeModeEdgeOnly
    && intentStatusBeforeChain.serviceIdPresent
    && intentStatusBeforeChain.originLooksProductionHttps
    && intentStatusBeforeChain.configuredFlagTrue
    && intentStatusBeforeChain.remoteAgentRequired === false
    && intentStatusBeforeChain.cloudAiRuntime === false
    && intentStatusBeforeChain.readerCanTriggerAi === false

  if (!envReadyForPrepare && !intentReadyForCompile) {
    chainFailures.push({
      step: 'load-local-assignment-input',
      blockerStage: 'local-assignment-input',
      exitStatus: null,
      signal: null,
      outputIncluded: false,
    })
    chainReady = false
  } else if (envFile.present && !gitIgnored(localEnvRel)) {
    chainFailures.push({
      step: 'verify-local-intent-env-gitignored',
      blockerStage: 'local-intent-env-gitignored',
      exitStatus: null,
      signal: null,
      outputIncluded: false,
    })
    chainReady = false
  }

  if (chainReady && envReadyForPrepare) {
    chainReady = runChainStep(
      'prepare-runtime-assignment-intent',
      ['run', 'prepare:runtime-assignment-intent'],
      {
        RUNTIME_ASSIGNMENT_INTENT_ENV_FILE: localEnvRel,
        RUNTIME_ASSIGNMENT_INTENT_FORCE: 'true',
      },
      'prepared-intent',
      chainFailures,
    )
  }
  if (chainReady) {
    chainReady = runChainStep(
      'remote-assignment-prepare',
      ['run', 'remote-assignment:prepare'],
      {},
      'compiled-contract',
      chainFailures,
    )
  }
  if (chainReady) {
    chainReady = runChainStep(
      'remote-assignment-compiler-coherence',
      ['run', 'check:remote-assignment-compiler-coherence'],
      {},
      'compiled-contract-coherence',
      chainFailures,
    )
  }
  if (chainReady && runRemoteHealth) {
    chainReady = runChainStep(
      'remote-health-check',
      ['run', 'remote-health:check'],
      {},
      'remote-health-ready',
      chainFailures,
    )
  }
  if (chainReady) {
    chainReady = runChainStep(
      'remote-health-evidence-artifact',
      ['run', 'check:remote-health-evidence-artifact'],
      {},
      'p145-health-attestation-ready',
      chainFailures,
    )
  }
  if (chainReady) {
    chainReady = runChainStep(
      'edge-only-data-api-evidence-readiness',
      ['run', 'check:edge-only-data-api-evidence-readiness'],
      {},
      'p150-readiness-ready',
      chainFailures,
    )
  }
  if (chainReady) {
    chainReady = runChainStep(
      'remote-runtime-assignment-intake',
      ['run', 'check:remote-runtime-assignment-intake'],
      {},
      'p75-data-api-blockers-cleared',
      chainFailures,
    )
  }
  if (chainReady) {
    runChainStep(
      'loop-next-goal-ledger',
      ['run', 'check:loop-next-goal-ledger'],
      {},
      'loop-next-goal-advanced',
      chainFailures,
    )
  }
}

const envStatus = safeEnvStatus(envFile.values)
const intentStatus = safeIntentStatus()
const contractStatus = safeContractStatus()
const localInputProjection = semanticLocalInputStatus(envStatus, intentStatus, contractStatus)
const healthStatus = safeHealthStatus()
const keyStatus = publishableKeyPresent()
const p145 = latestGateStatus('remote-health-evidence-attestation-', 'P145_REMOTE_HEALTH_EVIDENCE_ARTIFACT_GATE')
const p150 = latestGateStatus('edge-only-data-api-evidence-readiness-', 'P150_EDGE_ONLY_DATA_API_EVIDENCE_READINESS')
const p75 = latestGateStatus('remote-runtime-assignment-intake-', 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE')
const p121 = latestGateStatus('loop-next-goal-ledger-', 'P121_LOOP_NEXT_GOAL_LEDGER')

const missingStages = []
if (!localInputProjection.present) missingStages.push('local-assignment-input')
if (envFile.present && !gitIgnored(localEnvRel)) missingStages.push('local-intent-env-gitignored')
if (intentStatus.present && !localIntentFileIgnored()) missingStages.push('runtime-assignment-intent-gitignored')
if (!localInputProjection.serviceIdPresent) missingStages.push('data-api-service-id')
if (!localInputProjection.originPresent) missingStages.push('data-api-origin')
if (!localInputProjection.originLooksProductionHttps) missingStages.push('data-api-production-origin')
if (!localInputProjection.configuredFlagTrue) missingStages.push('data-api-configured')
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
for (const failure of chainFailures) {
  if (!missingStages.includes(failure.blockerStage)) missingStages.push(failure.blockerStage)
}

const ready = missingStages.length === 0
const artifact = {
  version: 1,
  gate,
  generatedAt: new Date().toISOString(),
  repository: repo,
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
  localInputProjection: {
    acceptsRuntimeIntentAsSemanticInput: true,
    envAdapterRequiredForReadiness: false,
    ...localInputProjection,
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
  chainFailures,
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
  sealedStrictCommand,
  expandedStrictCommand,
  nextStrictCommand: sealedStrictCommand,
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

if (required && !ready) {
  console.error(JSON.stringify({
    status: 'failed_required_not_ready',
    gate,
    decision: artifact.decision,
    missingStages,
    chainFailures,
    artifactPath: relative(root, artifactPath),
  }, null, 2))
  process.exit(1)
}
