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
const gate = 'P150_EDGE_ONLY_DATA_API_EVIDENCE_READINESS'
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'
const readyRequired = process.env.REQUIRE_EDGE_ONLY_DATA_API_EVIDENCE_READY === 'true'
const localEnvRel = 'deploy/runtime-production/runtime-assignment.intent.env.local'
const templateRel = 'deploy/runtime-production/runtime-assignment.intent.env.example'
const intentRel = 'deploy/runtime-production/runtime-assignment.intent.local.json'
const contractRel = 'deploy/runtime-production/generated/remote-assignment.contract.json'
const healthResultRel = 'deploy/runtime-production/generated/remote-health-evidence.result.json'

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

function gitIgnored(rel) {
  try {
    execFileSync('git', ['check-ignore', '--quiet', rel], {
      cwd: root,
      stdio: 'ignore',
      timeout: 8000,
    })
    return true
  } catch {
    const ignoreText = existsSync(path('.gitignore')) ? read('.gitignore') : ''
    return ignoreText.includes('deploy/runtime-production/*.intent.env.local')
      || ignoreText.includes('deploy/runtime-production/runtime-assignment.intent.env.local')
  }
}

function isPlaceholder(value) {
  return !String(value || '').trim() || /<[^>]+>|REPLACE_ME|YOUR_|TODO_|FILL_/i.test(String(value || ''))
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

function parseEnv(rel) {
  if (!existsSync(path(rel))) return { present: false, values: {}, keys: [] }
  const values = {}
  const keys = []
  for (const [index, rawLine] of read(rel).split(/\r?\n/).entries()) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line)
    assert(match, `${rel} line ${index + 1} must be KEY=value`)
    const [, key, rawValue] = match
    assert(!keys.includes(key), `${rel} contains duplicate key ${key}`)
    keys.push(key)
    values[key] = rawValue.trim()
  }
  return { present: true, values, keys }
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

function safeDataApiStatusFromEnv(values) {
  const serviceId = values.RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID || values.SUPABASE_PROJECT_REF || ''
  const origin = values.RUNTIME_ASSIGNMENT_DATA_API_ORIGIN || values.SUPABASE_URL || ''
  return {
    serviceIdPresent: !isPlaceholder(serviceId),
    originPresent: !isPlaceholder(origin),
    originLooksProductionHttps: isHttpsProductionOrigin(origin),
    configuredFlagTrue: values.RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED === 'true',
    probeTableConfigured: (values.RUNTIME_ASSIGNMENT_DATA_PROBE_TABLE || 'health_probe') === 'health_probe',
    probeIdConfigured: (values.RUNTIME_ASSIGNMENT_DATA_PROBE_ID || 'reader') === 'reader',
    valuesIncluded: false,
  }
}

function safeDataApiStatusFromIntent(intent) {
  const data = intent?.data_api || {}
  return {
    present: Boolean(intent),
    runtimeModeEdgeOnly: intent?.runtime_mode === 'edge-only',
    serviceIdPresent: !isPlaceholder(data.service_id),
    originPresent: !isPlaceholder(data.origin),
    originLooksProductionHttps: isHttpsProductionOrigin(data.origin),
    configuredFlagTrue: data.secrets_configured === true,
    remoteAgentRequired: intent?.agent?.remote_required === true,
    cloudAiRuntime: intent?.agent?.ai_generation_cloud_runtime === true,
    valuesIncluded: false,
  }
}

function safeDataApiStatusFromContract(contract) {
  const data = contract?.topology?.data_api || {}
  return {
    present: Boolean(contract),
    runtimeModeEdgeOnly: contract?.runtime_mode === 'edge-only',
    serviceIdPresent: !isPlaceholder(data.service_id),
    originPresent: !isPlaceholder(data.origin),
    originLooksProductionHttps: isHttpsProductionOrigin(data.origin),
    configuredFlagTrue: data.secrets_configured === true,
    remoteAgentRequired: contract?.topology?.agent?.remote_required === true,
    remoteAgentHealthRequired: contract?.health?.remote_agent_health_required === true,
    valuesIncluded: false,
  }
}

function healthReady() {
  if (existsSync(path(healthResultRel))) {
    const health = readJson(healthResultRel)
    return health?.status === 'ok'
      && health?.runtime_mode === 'edge-only'
      && health?.data_api?.table === 'health_probe'
      && health?.data_api?.probe?.id === 'reader'
      && health?.data_api?.probe?.status === 'ok'
      && health?.remote_agent?.required === false
  }
  const attestation = latestArtifact(
    'remote-health-evidence-attestation-',
    payload => payload.gate === 'P145_REMOTE_HEALTH_EVIDENCE_ARTIFACT_GATE',
  )
  return attestation?.payload?.status === 'passed' && attestation?.payload?.healthReady === true
}

function requireFile(rel) {
  assert(existsSync(path(rel)), `missing P150 prerequisite: ${rel}`)
}

for (const file of [
  templateRel,
  'docs/backend/P142_EDGE_ONLY_DATA_API_EVIDENCE_INTAKE.md',
  'docs/backend/P145_REMOTE_HEALTH_EVIDENCE_ARTIFACT_GATE.md',
  'docs/backend/P147_EDGE_ONLY_OPERATOR_EVIDENCE_PACKET.md',
  'docs/backend/P149_RUNTIME_ASSIGNMENT_INTENT_ENV_LOCAL_BOOTSTRAP.md',
  'docs/backend/P150_EDGE_ONLY_DATA_API_EVIDENCE_READINESS.md',
  'docs/design-system/DEVELOPMENT_NOTES.md',
  '.github/workflows/pages.yml',
  'scripts/check-github-actions-artifacts.mjs',
  'scripts/check-ci-artifact-content-coverage.mjs',
]) {
  requireFile(file)
}

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:edge-only-data-api-evidence-readiness'] === 'node scripts/check-edge-only-data-api-evidence-readiness.mjs',
  'package.json must expose check:edge-only-data-api-evidence-readiness',
)
assert(
  String(packageJson.scripts.test || '').includes('npm run check:runtime-assignment-intent-env-local-bootstrap && npm run check:edge-only-data-api-evidence-readiness && npm run check:runtime-assignment-intent-env-template'),
  'root test must run P150 after P149 and before P146',
)

for (const [rel, requiredTerms] of Object.entries({
  'docs/backend/P142_EDGE_ONLY_DATA_API_EVIDENCE_INTAKE.md': [
    'check:edge-only-data-api-evidence-readiness',
    'REQUIRE_EDGE_ONLY_DATA_API_EVIDENCE_READY=true',
  ],
  'docs/backend/P147_EDGE_ONLY_OPERATOR_EVIDENCE_PACKET.md': [
    'check:edge-only-data-api-evidence-readiness',
  ],
  'docs/backend/P149_RUNTIME_ASSIGNMENT_INTENT_ENV_LOCAL_BOOTSTRAP.md': [
    'check:edge-only-data-api-evidence-readiness',
  ],
  'docs/backend/P150_EDGE_ONLY_DATA_API_EVIDENCE_READINESS.md': [
    'P150 Edge-Only Data API Evidence Readiness',
    'check:edge-only-data-api-evidence-readiness',
    'does not mark P142 complete',
  ],
  'docs/design-system/DEVELOPMENT_NOTES.md': [
    'P150 Edge-Only Data API Evidence Readiness',
  ],
  '.github/workflows/pages.yml': [
    'Upload edge-only Data API evidence readiness',
    'edge-only-data-api-evidence-readiness',
    'artifacts/runtime/edge-only-data-api-evidence-readiness-*.json',
  ],
  'scripts/check-github-actions-artifacts.mjs': [
    'edge-only-data-api-evidence-readiness',
  ],
  'scripts/check-ci-artifact-content-coverage.mjs': [
    'edge-only-data-api-evidence-readiness',
  ],
  'docs/backend/P43_CI_ARTIFACT_EVIDENCE_GATE.md': [
    'edge-only-data-api-evidence-readiness',
  ],
  'docs/backend/P16_PAGES_LIVE_RELEASE_GATE.md': [
    'edge-only-data-api-evidence-readiness',
  ],
  'docs/backend/P107_CI_ARTIFACT_CONTENT_COVERAGE_MATRIX.md': [
    'edge-only-data-api-evidence-readiness',
    'check:edge-only-data-api-evidence-readiness',
  ],
})) {
  requireFile(rel)
  const text = read(rel)
  for (const term of requiredTerms) assert(text.includes(term), `${rel} must include ${term}`)
}

const localEnv = parseEnv(localEnvRel)
assert(!localEnv.present || gitIgnored(localEnvRel), `${localEnvRel} must remain ignored by Git`)
const template = parseEnv(templateRel)
const missingTemplateKeys = [
  'RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID',
  'RUNTIME_ASSIGNMENT_DATA_API_ORIGIN',
  'RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED',
  'RUNTIME_ASSIGNMENT_DATA_PROBE_TABLE',
  'RUNTIME_ASSIGNMENT_DATA_PROBE_ID',
].filter(key => !template.keys.includes(key))
assert(missingTemplateKeys.length === 0, `P146 template missing keys: ${missingTemplateKeys.join(', ')}`)

const envStatus = safeDataApiStatusFromEnv(localEnv.values)
const intent = existsSync(path(intentRel)) ? readJson(intentRel) : null
const contract = existsSync(path(contractRel)) ? readJson(contractRel) : null
const intentStatus = safeDataApiStatusFromIntent(intent)
const contractStatus = safeDataApiStatusFromContract(contract)
const dataApiEvidenceReady = envStatus.serviceIdPresent
  && envStatus.originPresent
  && envStatus.originLooksProductionHttps
  && envStatus.configuredFlagTrue
const compiledIntentReady = intentStatus.present
  && intentStatus.runtimeModeEdgeOnly
  && intentStatus.serviceIdPresent
  && intentStatus.originLooksProductionHttps
  && intentStatus.configuredFlagTrue
  && intentStatus.remoteAgentRequired === false
  && intentStatus.cloudAiRuntime === false
const compiledContractReady = contractStatus.present && (
  contractStatus.runtimeModeEdgeOnly
  && contractStatus.serviceIdPresent
  && contractStatus.originLooksProductionHttps
  && contractStatus.configuredFlagTrue
  && contractStatus.remoteAgentRequired === false
  && contractStatus.remoteAgentHealthRequired === false
)
const remoteHealthReady = healthReady()
const missingStages = []
if (!envStatus.serviceIdPresent) missingStages.push('data-api-service-id')
if (!envStatus.originLooksProductionHttps) missingStages.push('data-api-origin')
if (!envStatus.configuredFlagTrue) missingStages.push('data-api-configured')
if (!remoteHealthReady) missingStages.push('data-api-health-ready')

const status = missingStages.length === 0 && dataApiEvidenceReady && compiledIntentReady && compiledContractReady
  ? 'passed_ready_for_p142_completion_checks'
  : 'passed_waiting_for_edge_only_data_api_evidence'

if (readyRequired && status !== 'passed_ready_for_p142_completion_checks') {
  throw new Error(`Edge-only Data API evidence is required but still missing: ${missingStages.join(', ')}`)
}

const payload = {
  version: 1,
  gate,
  status,
  generatedAt: new Date().toISOString(),
  repository: repo,
  headSha: currentHead(),
  readyRequired,
  localEnv: {
    path: localEnvRel,
    present: localEnv.present,
    ignoredByGit: !localEnv.present || gitIgnored(localEnvRel),
    keyCount: localEnv.keys.length,
    valuesIncluded: false,
  },
  dataApiEvidence: envStatus,
  compiledIntent: intentStatus,
  compiledContract: contractStatus,
  remoteHealth: {
    ready: remoteHealthReady,
    source: existsSync(path(healthResultRel)) ? healthResultRel : 'latest P145 attestation or waiting state',
    valuesIncluded: false,
  },
  missingStages,
  decision: status === 'passed_ready_for_p142_completion_checks'
    ? 'edge_only_data_api_evidence_ready_for_strict_p142_chain'
    : 'edge_only_data_api_evidence_waiting_for_operator_input',
  nextCommands: [
    'npm run prepare:runtime-assignment-intent-env-local',
    `RUNTIME_ASSIGNMENT_INTENT_ENV_FILE=${localEnvRel} RUNTIME_ASSIGNMENT_INTENT_FORCE=true npm run prepare:runtime-assignment-intent`,
    'npm run remote-assignment:prepare',
    'npm run check:remote-runtime-assignment-intake',
    'npm run remote-health:check',
    'REQUIRE_REMOTE_HEALTH_EVIDENCE_READY=true npm run check:remote-health-evidence-artifact',
    'REQUIRE_EDGE_ONLY_DATA_API_EVIDENCE_READY=true npm run check:edge-only-data-api-evidence-readiness',
  ],
  publicBoundary: {
    containsSecrets: false,
    containsValues: false,
    createsRemoteServices: false,
    setsGitHubVariables: false,
    writesCanon: false,
    promotesLiveRuntime: false,
    requiresRemoteAgentRuntime: false,
    treatsFixtureAsProduction: false,
    marksP142Complete: false,
  },
}

const privateMatches = scanNoPrivateTerms(payload)
assert(privateMatches.length === 0, `P150 artifact leaked private terms: ${privateMatches.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `edge-only-data-api-evidence-readiness-${payload.generatedAt.replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(payload, null, 2)}\n`)

console.log(JSON.stringify({
  status: payload.status,
  gate: payload.gate,
  decision: payload.decision,
  missingStages: payload.missingStages,
  localEnvPresent: payload.localEnv.present,
  remoteHealthReady,
  artifactPath: relative(root, artifactPath),
}, null, 2))
