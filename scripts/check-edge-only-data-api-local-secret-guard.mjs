#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')
const gate = 'P156_EDGE_ONLY_DATA_API_LOCAL_SECRET_GUARD'
const readyRequired = process.env.REQUIRE_EDGE_ONLY_DATA_API_LOCAL_SECRET_GUARD_READY === 'true'
const intentEnvRel = 'deploy/runtime-production/runtime-assignment.intent.env.local'
const intentEnvTemplateRel = 'deploy/runtime-production/runtime-assignment.intent.env.example'
const localEnvRels = ['.env.local', '.env.local.sync']
const supportedPublishableKeys = [
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_ANON_KEY',
]
const readyNextCommand = 'npm run remote-health:check'
const waitingNextCommand = 'npm run check:edge-only-data-api-evidence-readiness'
const requiredIntentKeys = [
  'RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID',
  'SUPABASE_PROJECT_REF',
  'RUNTIME_ASSIGNMENT_DATA_API_ORIGIN',
  'SUPABASE_URL',
  'RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED',
  'RUNTIME_ASSIGNMENT_DATA_PROBE_TABLE',
  'RUNTIME_ASSIGNMENT_DATA_PROBE_ID',
]

function path(rel) {
  return join(root, rel)
}

function read(rel) {
  return readFileSync(path(rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

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

function gitIgnored(rel) {
  try {
    execFileSync('git', ['check-ignore', '--quiet', rel], {
      cwd: root,
      stdio: 'ignore',
      timeout: 8000,
    })
    return true
  } catch {
    const body = existsSync(path('.gitignore')) ? read('.gitignore') : ''
    return body.includes(rel) || body.includes('*.local') || body.includes('.env.local')
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
  if (!existsSync(path(rel))) return { present: false, rel, ignoredByGit: true, keys: [], values: {}, lineCount: 0 }
  const values = {}
  const keys = []
  let lineCount = 0
  for (const [index, rawLine] of read(rel).split(/\r?\n/).entries()) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    lineCount += 1
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line)
    assert(match, `${rel} line ${index + 1} must be KEY=value`)
    const [, key, rawValue] = match
    assert(!keys.includes(key), `${rel} contains duplicate key ${key}`)
    keys.push(key)
    values[key] = rawValue.trim()
  }
  return { present: true, rel, ignoredByGit: gitIgnored(rel), keys, values, lineCount }
}

function forbiddenHitsForEnv(rel, parsed) {
  if (!parsed.present) return []
  const raw = read(rel)
  const forbidden = [
    { id: 'service-role-key', pattern: /\b(SUPABASE_SERVICE_ROLE|SERVICE_ROLE_KEY|service_role)\b/i },
    { id: 'supabase-secret-key', pattern: /\b(SUPABASE_SECRET_KEY|SUPABASE_JWT_SECRET)\b/i },
    { id: 'writer-password', pattern: /\b(SUPABASE_WRITER_PASSWORD|WRITER_PASSWORD)\b/i },
    { id: 'database-url', pattern: /\b(DATABASE_URL|POSTGRES_URL|POSTGRES_PRISMA_URL)\b|postgres(ql)?:\/\//i },
    { id: 'provider-key', pattern: /\b(OPENAI_API_KEY|DEEPSEEK_API_KEY|MOONSHOT_API_KEY|KIMI_API_KEY|ANTHROPIC_API_KEY)\b/i },
    { id: 'tool-bridge-token', pattern: /\b(NARRATIVEOS_TOOL_BRIDGE_TOKEN|MASTRA_TOOL_BRIDGE_TOKEN)\b/i },
    { id: 'authorization-header', pattern: /Authorization:\s*Bearer/i },
    { id: 'private-key', pattern: /BEGIN (RSA|OPENSSH|PRIVATE) KEY/i },
    { id: 'prompt-plumbing', pattern: /\b(system prompt|provider prompt|rawState|sourceRefs|profile\.id|kernel\.id)\b/i },
  ]
  return forbidden
    .filter(({ pattern }) => pattern.test(raw))
    .map(({ id }) => ({ file: rel, id }))
}

function publicProjection(parsed) {
  return {
    present: parsed.present,
    ignoredByGit: parsed.ignoredByGit,
    keyCount: parsed.keys.length,
    supportedPublishableKeyPresent: supportedPublishableKeys.some(key => !isPlaceholder(parsed.values[key])),
    forbiddenKeyPresent: forbiddenHitsForEnv(parsed.rel, parsed).length > 0,
    valuesIncluded: false,
  }
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
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(String)
}

for (const file of [
  intentEnvTemplateRel,
  '.gitignore',
  'package.json',
  'docs/backend/P142_EDGE_ONLY_DATA_API_EVIDENCE_INTAKE.md',
  'docs/backend/P145_REMOTE_HEALTH_EVIDENCE_ARTIFACT_GATE.md',
  'docs/backend/P149_RUNTIME_ASSIGNMENT_INTENT_ENV_LOCAL_BOOTSTRAP.md',
  'docs/backend/P150_EDGE_ONLY_DATA_API_EVIDENCE_READINESS.md',
  'docs/backend/P156_EDGE_ONLY_DATA_API_LOCAL_SECRET_GUARD.md',
  'docs/design-system/DEVELOPMENT_NOTES.md',
]) {
  assert(existsSync(path(file)), `missing P156 prerequisite: ${file}`)
}

const packageJson = readJson('package.json')
const testScript = String(packageJson.scripts?.test || '')
assert(
  packageJson.scripts?.['check:edge-only-data-api-local-secret-guard'] === 'node scripts/check-edge-only-data-api-local-secret-guard.mjs',
  'package.json must expose check:edge-only-data-api-local-secret-guard',
)
assert(
  testScript.includes('npm run check:runtime-assignment-intent-env-local-bootstrap && npm run check:edge-only-data-api-local-secret-guard && npm run check:edge-only-data-api-evidence-card && npm run check:edge-only-data-api-evidence-readiness && npm run check:runtime-assignment-intent-env-template'),
  'root npm run test must run P156 after P149 and before P163/P150',
)
for (const [rel, terms] of Object.entries({
  'docs/backend/P142_EDGE_ONLY_DATA_API_EVIDENCE_INTAKE.md': [
    'check:edge-only-data-api-local-secret-guard',
    'REQUIRE_EDGE_ONLY_DATA_API_LOCAL_SECRET_GUARD_READY=true',
  ],
  'docs/backend/P145_REMOTE_HEALTH_EVIDENCE_ARTIFACT_GATE.md': [
    'P156',
    'check:edge-only-data-api-local-secret-guard',
  ],
  'docs/backend/P149_RUNTIME_ASSIGNMENT_INTENT_ENV_LOCAL_BOOTSTRAP.md': [
    'P156',
    'check:edge-only-data-api-local-secret-guard',
  ],
  'docs/backend/P150_EDGE_ONLY_DATA_API_EVIDENCE_READINESS.md': [
    'P156',
    'check:edge-only-data-api-local-secret-guard',
  ],
  'docs/backend/P156_EDGE_ONLY_DATA_API_LOCAL_SECRET_GUARD.md': [
    'P156 Edge-Only Data API Local Secret Guard',
    'check:edge-only-data-api-local-secret-guard',
    waitingNextCommand,
    '.env.local.sync',
    'does not mark P142 complete',
  ],
  'docs/design-system/DEVELOPMENT_NOTES.md': [
    'P156 Edge-Only Data API Local Secret Guard',
  ],
})) {
  const body = read(rel)
  for (const term of terms) assert(body.includes(term), `${rel} must include ${term}`)
}

const intentTemplate = parseEnvFile(intentEnvTemplateRel)
const intentLocal = parseEnvFile(intentEnvRel)
const localSecretFiles = localEnvRels.map(parseEnvFile)
const allParsed = [intentLocal, ...localSecretFiles]
const forbiddenHits = allParsed.flatMap(parsed => forbiddenHitsForEnv(parsed.rel, parsed))
const unignoredFiles = allParsed.filter(parsed => parsed.present && !parsed.ignoredByGit).map(parsed => parsed.rel)
const missingTemplateKeys = requiredIntentKeys.filter(key => !intentTemplate.keys.includes(key))
const missingIntentKeys = intentLocal.present
  ? requiredIntentKeys.filter(key => !intentLocal.keys.includes(key))
  : requiredIntentKeys
const localIntentDataApi = {
  present: intentLocal.present,
  ignoredByGit: intentLocal.ignoredByGit,
  serviceIdPresent: !isPlaceholder(intentLocal.values.RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID || intentLocal.values.SUPABASE_PROJECT_REF),
  originPresent: !isPlaceholder(intentLocal.values.RUNTIME_ASSIGNMENT_DATA_API_ORIGIN || intentLocal.values.SUPABASE_URL),
  originLooksProductionHttps: isHttpsProductionOrigin(intentLocal.values.RUNTIME_ASSIGNMENT_DATA_API_ORIGIN || intentLocal.values.SUPABASE_URL),
  configuredFlagTrue: intentLocal.values.RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED === 'true',
  probeTableHealthProbe: (intentLocal.values.RUNTIME_ASSIGNMENT_DATA_PROBE_TABLE || 'health_probe') === 'health_probe',
  probeIdReader: (intentLocal.values.RUNTIME_ASSIGNMENT_DATA_PROBE_ID || 'reader') === 'reader',
  valuesIncluded: false,
}
const publishableKeyPresent = localSecretFiles.some(file => supportedPublishableKeys.some(key => !isPlaceholder(file.values[key])))
const ready = forbiddenHits.length === 0
  && unignoredFiles.length === 0
  && missingTemplateKeys.length === 0
  && missingIntentKeys.length === 0
  && localIntentDataApi.serviceIdPresent
  && localIntentDataApi.originLooksProductionHttps
  && localIntentDataApi.configuredFlagTrue
  && localIntentDataApi.probeTableHealthProbe
  && localIntentDataApi.probeIdReader
  && publishableKeyPresent

const missingStages = []
if (!intentLocal.present) missingStages.push('intent-env-local')
if (missingIntentKeys.length) missingStages.push('intent-env-required-keys')
if (!localIntentDataApi.serviceIdPresent) missingStages.push('data-api-service-id')
if (!localIntentDataApi.originLooksProductionHttps) missingStages.push('data-api-origin')
if (!localIntentDataApi.configuredFlagTrue) missingStages.push('data-api-configured')
if (!publishableKeyPresent) missingStages.push('publishable-key-local')
if (forbiddenHits.length) missingStages.push('forbidden-secret-key')
if (unignoredFiles.length) missingStages.push('local-env-git-boundary')

if (missingTemplateKeys.length) {
  throw new Error(`${intentEnvTemplateRel} missing required P156 keys: ${missingTemplateKeys.join(', ')}`)
}
if (forbiddenHits.length) {
  throw new Error(`P156 blocked forbidden local secret material in Data API health inputs: ${forbiddenHits.map(hit => `${hit.file}:${hit.id}`).join(', ')}`)
}
if (unignoredFiles.length) {
  throw new Error(`P156 local evidence files must stay ignored by Git: ${unignoredFiles.join(', ')}`)
}
if (readyRequired && !ready) {
  throw new Error(`P156 strict mode requires local Data API evidence before remote-health:check: ${missingStages.join(', ')}`)
}

const status = ready
  ? 'passed_ready_for_remote_health_check'
  : 'passed_waiting_for_local_data_api_evidence'
const nextCommand = ready
  ? readyNextCommand
  : waitingNextCommand
const payload = {
  version: 1,
  gate,
  status,
  generatedAt: new Date().toISOString(),
  repository: process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel',
  headSha: currentHead(),
  readyRequired,
  localFiles: {
    intentEnv: publicProjection(intentLocal),
    dotenvFiles: localSecretFiles.map(publicProjection),
    valuesIncluded: false,
  },
  dataApiEvidence: localIntentDataApi,
  publishableKey: {
    present: publishableKeyPresent,
    supportedKeyCount: supportedPublishableKeys.length,
    valuesIncluded: false,
  },
  forbiddenSecretMaterial: {
    present: false,
    hitCount: 0,
    valuesIncluded: false,
  },
  missingStages,
  decision: ready ? 'local_data_api_evidence_ready_for_remote_health_check' : 'local_data_api_evidence_waiting_for_operator_input',
  nextCommand,
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
assert(privateMatches.length === 0, `P156 artifact leaked private terms: ${privateMatches.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `edge-only-data-api-local-secret-guard-${payload.generatedAt.replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(payload, null, 2)}\n`)

console.log(JSON.stringify({
  status: payload.status,
  gate: payload.gate,
  decision: payload.decision,
  missingStages: payload.missingStages,
  publishableKeyPresent,
  artifactPath: relative(root, artifactPath),
  nextCommand,
}, null, 2))
