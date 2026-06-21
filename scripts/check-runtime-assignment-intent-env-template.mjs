#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')
const templateRel = 'deploy/runtime-production/runtime-assignment.intent.env.example'
const localRel = 'deploy/runtime-production/runtime-assignment.intent.env.local'
const fixtureRel = 'deploy/runtime-production/runtime-assignment.p146.intent.env.local'
const fixturePath = join(root, fixtureRel)
const intentRel = 'deploy/runtime-production/runtime-assignment.intent.local.json'
const intentPath = join(root, intentRel)

const allowedKeys = [
  'RUNTIME_ASSIGNMENT_ENVIRONMENT',
  'RUNTIME_ASSIGNMENT_OPERATOR_OWNER',
  'RUNTIME_ASSIGNMENT_OPERATOR_PROVIDER',
  'RUNTIME_ASSIGNMENT_FRONTEND_PROVIDER',
  'RUNTIME_ASSIGNMENT_FRONTEND_SERVICE_ID',
  'RUNTIME_ASSIGNMENT_FRONTEND_ORIGIN',
  'RUNTIME_ASSIGNMENT_FRONTEND_URL',
  'RUNTIME_ASSIGNMENT_FRONTEND_CONFIGURED',
  'RUNTIME_ASSIGNMENT_DATA_API_PROVIDER',
  'RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID',
  'SUPABASE_PROJECT_REF',
  'RUNTIME_ASSIGNMENT_DATA_API_ORIGIN',
  'SUPABASE_URL',
  'RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED',
  'RUNTIME_ASSIGNMENT_DATA_PROBE_TABLE',
  'RUNTIME_ASSIGNMENT_DATA_PROBE_ID',
]

const blankKeys = new Set([
  'RUNTIME_ASSIGNMENT_OPERATOR_OWNER',
  'RUNTIME_ASSIGNMENT_FRONTEND_PROVIDER',
  'RUNTIME_ASSIGNMENT_FRONTEND_SERVICE_ID',
  'RUNTIME_ASSIGNMENT_FRONTEND_ORIGIN',
  'RUNTIME_ASSIGNMENT_FRONTEND_URL',
  'RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID',
  'SUPABASE_PROJECT_REF',
  'RUNTIME_ASSIGNMENT_DATA_API_ORIGIN',
  'SUPABASE_URL',
])

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function gitCheckIgnore(rel) {
  const result = spawnSync('git', ['check-ignore', '--quiet', rel], {
    cwd: root,
    stdio: 'ignore',
    timeout: 8000,
  })
  return result.status === 0
}

function parseEnvTemplate(text) {
  const entries = []
  const seen = new Set()
  for (const [index, rawLine] of text.split(/\r?\n/).entries()) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    assert(!line.startsWith('export '), `template line ${index + 1} must not use export`)
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line)
    assert(match, `template line ${index + 1} must be KEY=value`)
    const [, key, value] = match
    assert(!seen.has(key), `duplicate env key ${key}`)
    seen.add(key)
    entries.push({ key, value })
  }
  return entries
}

function privateMatches(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL\s*=/i,
    /postgres(ql)?:\/\//i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/i,
    /SUPABASE_SERVICE_ROLE/i,
    /SERVICE_ROLE_KEY/i,
    /WRITER_PASSWORD/i,
    /NARRATIVEOS_TOOL_BRIDGE_TOKEN/i,
    /MASTRA_TOOL_BRIDGE_TOKEN/i,
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
    /https?:\/\/[^\s<]+/i,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function assertIncludes(file, terms) {
  const body = read(file)
  for (const term of terms) assert(body.includes(term), `${file} must include ${term}`)
}

function writeEnvFile(path, entries) {
  mkdirSync(dirname(path), { recursive: true })
  const body = Object.entries(entries).map(([key, value]) => `${key}=${value}`).join('\n')
  writeFileSync(path, `${body}\n`)
}

function runPrepare(extraEnv) {
  return spawnSync(process.execPath, ['scripts/prepare-runtime-assignment-intent.mjs', '--force'], {
    cwd: root,
    env: {
      ...process.env,
      ...extraEnv,
    },
    encoding: 'utf8',
    timeout: 30000,
  })
}

const requiredFiles = [
  templateRel,
  'docs/backend/P146_EDGE_ONLY_INTENT_ENV_TEMPLATE_GATE.md',
  'docs/backend/P140_RUNTIME_ASSIGNMENT_INTENT_PREPARATION.md',
  'docs/backend/P138_REMOTE_ASSIGNMENT_COMPILER_V3.md',
  'docs/backend/P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE.md',
  'scripts/prepare-runtime-assignment-intent.mjs',
]
for (const file of requiredFiles) assert(existsSync(join(root, file)), `missing P146 prerequisite: ${file}`)

const packageJson = readJson('package.json')
const rootTest = String(packageJson.scripts.test || '')
assert(
  packageJson.scripts['check:runtime-assignment-intent-env-template'] === 'node scripts/check-runtime-assignment-intent-env-template.mjs',
  'package.json must expose check:runtime-assignment-intent-env-template',
)
assert(
  rootTest.includes('npm run check:runtime-assignment-intent-env-template && npm run check:runtime-assignment-intent-prep'),
  'root npm run test must run P146 immediately before P140 intent prep',
)

const gitignore = read('.gitignore')
assert(gitignore.includes(localRel), `.gitignore must ignore ${localRel}`)
assert(gitignore.includes('deploy/runtime-production/runtime-assignment.*.intent.env.local'), '.gitignore must ignore variant runtime intent env files')
assert(gitCheckIgnore(localRel), `${localRel} must be ignored by Git`)
assert(gitCheckIgnore(fixtureRel), `${fixtureRel} must be ignored by Git`)

for (const [file, terms] of [
  ['docs/backend/P146_EDGE_ONLY_INTENT_ENV_TEMPLATE_GATE.md', [
    'P146 Edge-Only Intent Env Template Gate',
    'check:runtime-assignment-intent-env-template',
    'RUNTIME_ASSIGNMENT_INTENT_ENV_FILE',
    localRel,
  ]],
  ['docs/backend/P140_RUNTIME_ASSIGNMENT_INTENT_PREPARATION.md', [
    'RUNTIME_ASSIGNMENT_INTENT_ENV_FILE',
    'runtime-assignment.intent.env.example',
    'P146',
  ]],
  ['docs/backend/P138_REMOTE_ASSIGNMENT_COMPILER_V3.md', [
    'P146',
    'runtime-assignment.intent.env.example',
  ]],
  ['docs/backend/P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE.md', [
    'P146',
    'RUNTIME_ASSIGNMENT_INTENT_ENV_FILE',
  ]],
]) {
  assertIncludes(file, terms)
}

const templateText = read(templateRel)
const entries = parseEnvTemplate(templateText)
const keys = entries.map(entry => entry.key)
assert(keys.length === allowedKeys.length, `template must contain exactly ${allowedKeys.length} entries`)
for (const key of allowedKeys) assert(keys.includes(key), `template missing ${key}`)
for (const key of keys) assert(allowedKeys.includes(key), `template contains unexpected key ${key}`)
for (const { key, value } of entries) {
  if (blankKeys.has(key)) assert(value === '', `${key} must be blank in the tracked template`)
  if (key === 'RUNTIME_ASSIGNMENT_ENVIRONMENT') assert(value === 'production', `${key} must default to production`)
  if (key === 'RUNTIME_ASSIGNMENT_OPERATOR_PROVIDER') assert(value === 'github-pages-supabase-managed', `${key} default mismatch`)
  if (key === 'RUNTIME_ASSIGNMENT_FRONTEND_CONFIGURED') assert(value === 'true', `${key} must default to true`)
  if (key === 'RUNTIME_ASSIGNMENT_DATA_API_PROVIDER') assert(value === 'supabase', `${key} default mismatch`)
  if (key === 'RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED') assert(value === 'false', `${key} must default to false`)
  if (key === 'RUNTIME_ASSIGNMENT_DATA_PROBE_TABLE') assert(value === 'health_probe', `${key} default mismatch`)
  if (key === 'RUNTIME_ASSIGNMENT_DATA_PROBE_ID') assert(value === 'reader', `${key} default mismatch`)
}
const templatePrivateHits = privateMatches(templateText)
assert(templatePrivateHits.length === 0, `template leaked private terms: ${templatePrivateHits.join(', ')}`)

const originalIntent = existsSync(intentPath) ? readFileSync(intentPath) : null
try {
  writeEnvFile(fixturePath, {
    RUNTIME_ASSIGNMENT_ENVIRONMENT: 'production',
    RUNTIME_ASSIGNMENT_OPERATOR_OWNER: 'p146-owner',
    RUNTIME_ASSIGNMENT_OPERATOR_PROVIDER: 'github-pages-supabase-managed',
    RUNTIME_ASSIGNMENT_FRONTEND_PROVIDER: '',
    RUNTIME_ASSIGNMENT_FRONTEND_SERVICE_ID: '',
    RUNTIME_ASSIGNMENT_FRONTEND_ORIGIN: '',
    RUNTIME_ASSIGNMENT_FRONTEND_URL: '',
    RUNTIME_ASSIGNMENT_FRONTEND_CONFIGURED: 'true',
    RUNTIME_ASSIGNMENT_DATA_API_PROVIDER: 'supabase',
    RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID: 'parallel-universe-reader-data',
    SUPABASE_PROJECT_REF: '',
    RUNTIME_ASSIGNMENT_DATA_API_ORIGIN: 'https://parallel-universe-reader-data.supabase.co',
    SUPABASE_URL: '',
    RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED: 'true',
    RUNTIME_ASSIGNMENT_DATA_PROBE_TABLE: 'health_probe',
    RUNTIME_ASSIGNMENT_DATA_PROBE_ID: 'reader',
  })
  const result = runPrepare({ RUNTIME_ASSIGNMENT_INTENT_ENV_FILE: fixtureRel })
  assert(result.status === 0, `P140 fixture prepare should pass: ${result.stderr || result.stdout}`)
  const stdout = JSON.parse(result.stdout)
  assert(stdout.status === 'prepared', 'P140 fixture prepare must report prepared')
  const intent = JSON.parse(readFileSync(intentPath, 'utf8'))
  assert(intent.runtime_mode === 'edge-only', 'generated intent must stay edge-only')
  assert(intent.data_api?.service_id === 'parallel-universe-reader-data', 'generated intent must use fixture data API service id')
  assert(intent.data_api?.origin === 'https://parallel-universe-reader-data.supabase.co', 'generated intent must use fixture data API origin')
  assert(intent.data_api?.secrets_configured === true, 'generated intent must use fixture data API configured flag')
  assert(intent.agent?.remote_required === false, 'generated intent must not require remote Agent')
  assert(intent.agent?.ai_generation_cloud_runtime === false, 'generated intent must not move AI generation to cloud runtime')
  assert(intent.agent?.reader_can_trigger_ai === false, 'generated intent must keep reader cloud AI trigger disabled')
} finally {
  if (originalIntent == null) {
    try { unlinkSync(intentPath) } catch {}
  } else {
    mkdirSync(dirname(intentPath), { recursive: true })
    writeFileSync(intentPath, originalIntent)
  }
  try { unlinkSync(fixturePath) } catch {}
}

const payload = {
  version: 1,
  gate: 'P146_EDGE_ONLY_INTENT_ENV_TEMPLATE_GATE',
  status: 'passed',
  generatedAt: new Date().toISOString(),
  templatePath: templateRel,
  localTargetPath: localRel,
  acceptedKeyCount: allowedKeys.length,
  blankValueKeys: [...blankKeys],
  defaults: {
    RUNTIME_ASSIGNMENT_ENVIRONMENT: 'production',
    RUNTIME_ASSIGNMENT_OPERATOR_PROVIDER: 'github-pages-supabase-managed',
    RUNTIME_ASSIGNMENT_FRONTEND_CONFIGURED: 'true',
    RUNTIME_ASSIGNMENT_DATA_API_PROVIDER: 'supabase',
    RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED: 'false',
    RUNTIME_ASSIGNMENT_DATA_PROBE_TABLE: 'health_probe',
    RUNTIME_ASSIGNMENT_DATA_PROBE_ID: 'reader',
  },
  boundaries: {
    writesTrackedFiles: false,
    createsRemoteServices: false,
    setsGitHubVariables: false,
    storesProviderSecrets: false,
    promotesLiveRuntime: false,
    requiresRemoteAgent: false,
    containsConcreteDataApiServiceId: false,
    containsConcreteDataApiOrigin: false,
    containsProviderCredentials: false,
    containsPromptPlumbing: false,
    containsPrivateTitleMaterial: false,
    containsRuntimeRuleIdentifiers: false,
  },
  nextCommands: [
    'copy template to ignored runtime-assignment.intent.env.local',
    'fill ignored local env with non-secret managed data API evidence',
    'RUNTIME_ASSIGNMENT_INTENT_ENV_FILE=deploy/runtime-production/runtime-assignment.intent.env.local RUNTIME_ASSIGNMENT_INTENT_FORCE=true npm run prepare:runtime-assignment-intent',
    'npm run remote-assignment:prepare',
    'npm run remote-health:check',
    'REQUIRE_REMOTE_HEALTH_EVIDENCE_READY=true npm run check:remote-health-evidence-artifact',
  ],
}

const payloadPrivateHits = privateMatches(payload)
assert(payloadPrivateHits.length === 0, `P146 artifact leaked private terms: ${payloadPrivateHits.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `runtime-assignment-intent-env-template-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(payload, null, 2)}\n`)

console.log(JSON.stringify({
  status: 'passed',
  gate: payload.gate,
  templatePath: templateRel,
  localTargetPath: localRel,
  acceptedKeyCount: allowedKeys.length,
  artifactPath: relative(root, artifactPath),
}, null, 2))
