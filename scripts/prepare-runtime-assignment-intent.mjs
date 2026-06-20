#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const intentRel = 'deploy/runtime-production/runtime-assignment.intent.local.json'
const intentPath = join(root, intentRel)
const checkOnly = process.argv.includes('--check') || process.env.RUNTIME_ASSIGNMENT_INTENT_CHECK === 'true'
const force = process.argv.includes('--force') || process.env.RUNTIME_ASSIGNMENT_INTENT_FORCE === 'true'

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function envFlag(name, fallback = false) {
  const value = process.env[name]
  if (value == null || value === '') return fallback
  return value === 'true'
}

function repoSlug() {
  const explicit = process.env.RUNTIME_ASSIGNMENT_REPOSITORY
  if (explicit) return explicit.trim()

  try {
    const url = execFileSync('git', ['remote', 'get-url', 'origin'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 8000,
    }).trim()
    const match = /github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/i.exec(url)
    if (match) return `${match[1]}/${match[2]}`
  } catch {
    // Fall through to the package default below.
  }

  return 'jzvcpe-goat/parallel-universe-novel'
}

function noTrailingSlash(value) {
  return String(value).replace(/\/+$/, '')
}

function isPlaceholder(value) {
  return /<[^>]+>/.test(String(value || ''))
}

function scanNoSecretLikePayload(payload) {
  const text = JSON.stringify(payload)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /postgres(ql)?:\/\/[^<]/i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/i,
    /SUPABASE_SERVICE_ROLE/i,
    /SERVICE_ROLE_KEY/i,
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
    /profile\.id/i,
    /kernel\.id/i,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(String)
}

function inferIntent({ fixture = false } = {}) {
  const [owner, repo] = repoSlug().split('/')
  assert(owner && repo, 'repository slug must be owner/repo')

  const frontendOrigin = noTrailingSlash(
    process.env.RUNTIME_ASSIGNMENT_FRONTEND_ORIGIN
      || `https://${owner}.github.io`,
  )
  const frontendServiceId = process.env.RUNTIME_ASSIGNMENT_FRONTEND_SERVICE_ID
    || `${owner}/${repo}`
  const frontendUrl = process.env.RUNTIME_ASSIGNMENT_FRONTEND_URL
    || `${frontendOrigin}/${repo}/`

  const dataServiceId = process.env.RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID
    || process.env.SUPABASE_PROJECT_REF
    || (fixture ? 'fixture-supabase-project' : '<supabase-project-ref>')
  const dataOrigin = noTrailingSlash(
    process.env.RUNTIME_ASSIGNMENT_DATA_API_ORIGIN
      || process.env.SUPABASE_URL
      || (isPlaceholder(dataServiceId)
        ? 'https://<supabase-project-ref>.supabase.co'
        : `https://${dataServiceId}.supabase.co`),
  )

  return {
    schema_version: 1,
    goal: 'parallel-universe-novel-reader',
    environment: process.env.RUNTIME_ASSIGNMENT_ENVIRONMENT || 'production',
    runtime_mode: 'edge-only',
    operator: {
      owner: process.env.RUNTIME_ASSIGNMENT_OPERATOR_OWNER || owner,
      provider: process.env.RUNTIME_ASSIGNMENT_OPERATOR_PROVIDER || 'github-pages-supabase-managed',
    },
    frontend: {
      provider: process.env.RUNTIME_ASSIGNMENT_FRONTEND_PROVIDER || 'github-pages',
      service_id: frontendServiceId,
      origin: frontendOrigin,
      secrets_configured: envFlag('RUNTIME_ASSIGNMENT_FRONTEND_CONFIGURED', true),
    },
    data_api: {
      provider: process.env.RUNTIME_ASSIGNMENT_DATA_API_PROVIDER || 'supabase',
      service_id: dataServiceId,
      origin: dataOrigin,
      secrets_configured: envFlag('RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED', fixture),
      public_key_model: 'publishable-or-legacy-anon-with-rls',
    },
    agent: {
      remote_required: false,
      location: 'user-owned-edge-device',
      ai_generation_cloud_runtime: false,
      reader_can_trigger_ai: false,
    },
    health: {
      frontend_url: frontendUrl,
      data_probe_table: process.env.RUNTIME_ASSIGNMENT_DATA_PROBE_TABLE || 'health_probe',
      data_probe_id: process.env.RUNTIME_ASSIGNMENT_DATA_PROBE_ID || 'reader',
    },
  }
}

for (const file of [
  '.gitignore',
  'deploy/runtime-production/runtime-assignment.intent.example.json',
  'docs/backend/P138_REMOTE_ASSIGNMENT_COMPILER_V3.md',
  'docs/backend/P140_RUNTIME_ASSIGNMENT_INTENT_PREPARATION.md',
]) {
  assert(existsSync(join(root, file)), `missing P140 prerequisite: ${file}`)
}

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['prepare:runtime-assignment-intent'] === 'node scripts/prepare-runtime-assignment-intent.mjs',
  'package.json must expose prepare:runtime-assignment-intent',
)
assert(
  packageJson.scripts['check:runtime-assignment-intent-prep'] === 'node scripts/prepare-runtime-assignment-intent.mjs --check',
  'package.json must expose check:runtime-assignment-intent-prep',
)
assert(
  String(packageJson.scripts.test || '').includes('npm run check:runtime-assignment-intent-prep'),
  'root npm run test must include check:runtime-assignment-intent-prep',
)
assert(read('.gitignore').includes(intentRel), `${intentRel} must be ignored`)
for (const term of [
  'P140 Runtime Assignment Intent Preparation',
  'prepare:runtime-assignment-intent',
  'check:runtime-assignment-intent-prep',
  'RUNTIME_ASSIGNMENT_INTENT_FORCE=true npm run prepare:runtime-assignment-intent',
  'RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID',
  'SUPABASE_PROJECT_REF',
  'RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED=true',
]) {
  assert(read('docs/backend/P140_RUNTIME_ASSIGNMENT_INTENT_PREPARATION.md').includes(term), `P140 doc must include ${term}`)
}
for (const term of [
  'prepare:runtime-assignment-intent',
  'check:runtime-assignment-intent-prep',
]) {
  assert(read('docs/backend/P138_REMOTE_ASSIGNMENT_COMPILER_V3.md').includes(term), `P138 doc must include ${term}`)
}

if (checkOnly) {
  const fixtureIntent = inferIntent({ fixture: true })
  const hits = scanNoSecretLikePayload(fixtureIntent)
  assert(hits.length === 0, `fixture intent leaked secret-like terms: ${hits.join(', ')}`)
  assert(fixtureIntent.runtime_mode === 'edge-only', 'fixture intent must use edge-only')
  assert(fixtureIntent.agent.remote_required === false, 'fixture intent must not require remote agent')
  assert(fixtureIntent.frontend.origin === 'https://jzvcpe-goat.github.io', 'fixture intent must infer GitHub Pages origin')
  assert(fixtureIntent.frontend.service_id === 'jzvcpe-goat/parallel-universe-novel', 'fixture intent must infer repository service id')
  console.log(JSON.stringify({
    status: 'passed',
    mode: 'check',
    writesIntent: false,
    inferredFrontendOrigin: fixtureIntent.frontend.origin,
    inferredFrontendServiceId: fixtureIntent.frontend.service_id,
    remainingOperatorFields: [
      'RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID or SUPABASE_PROJECT_REF',
      'RUNTIME_ASSIGNMENT_DATA_API_ORIGIN or SUPABASE_URL',
      'RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED=true after publishable key and RLS are ready',
    ],
  }, null, 2))
  process.exit(0)
}

if (existsSync(intentPath) && !force) {
  throw new Error(`${intentRel} already exists; set RUNTIME_ASSIGNMENT_INTENT_FORCE=true to refresh it`)
}

const intent = inferIntent()
const hits = scanNoSecretLikePayload(intent)
assert(hits.length === 0, `intent leaked secret-like terms: ${hits.join(', ')}`)

mkdirSync(dirname(intentPath), { recursive: true })
writeFileSync(intentPath, `${JSON.stringify(intent, null, 2)}\n`)

const missingFields = []
if (isPlaceholder(intent.data_api.service_id)) missingFields.push('data-api-service-id')
if (isPlaceholder(intent.data_api.origin)) missingFields.push('data-api-origin')
if (intent.data_api.secrets_configured !== true) missingFields.push('data-api-configured')

console.log(JSON.stringify({
  status: missingFields.length ? 'prepared_waiting_for_data_api_evidence' : 'prepared',
  mode: 'prepared',
  intentPath: intentRel,
  frontend: {
    provider: intent.frontend.provider,
    serviceId: intent.frontend.service_id,
    origin: intent.frontend.origin,
  },
  dataApiMissing: missingFields,
  nextCommand: 'npm run remote-assignment:prepare',
  note: missingFields.length
    ? 'Fill Supabase/data API evidence in the ignored local intent before running the compiler.'
    : 'Intent is ready for compiler validation.',
  relativePath: relative(root, intentPath),
}, null, 2))
