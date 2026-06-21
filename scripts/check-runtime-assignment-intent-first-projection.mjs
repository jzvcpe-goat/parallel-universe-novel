#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')
const gate = 'P162_RUNTIME_ASSIGNMENT_INTENT_FIRST_PROJECTION'
const intentRel = 'deploy/runtime-production/runtime-assignment.intent.local.json'
const envRel = 'deploy/runtime-production/runtime-assignment.intent.env.local'
const contractRel = 'deploy/runtime-production/generated/remote-assignment.contract.json'
const healthRel = 'deploy/runtime-production/generated/remote-health-evidence.result.json'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
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

function runNpm(script) {
  execFileSync('npm', ['run', script], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 120000,
  })
}

function latestArtifact(prefix) {
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .map(name => join(artifactDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  assert(files.length > 0, `missing artifact for ${prefix}`)
  return JSON.parse(readFileSync(files[0], 'utf8'))
}

function snapshot(rel) {
  const abs = join(root, rel)
  return existsSync(abs) ? readFileSync(abs) : null
}

function restore(rel, content) {
  const abs = join(root, rel)
  if (content == null) {
    rmSync(abs, { force: true })
    return
  }
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, content)
}

function assertNoPrivateTerms(value, label) {
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
  const matches = forbidden.filter(pattern => pattern.test(text)).map(String)
  assert(matches.length === 0, `${label} leaked private terms: ${matches.join(', ')}`)
}

function writeFixtureIntent() {
  const intent = {
    schema_version: 1,
    goal: 'parallel-universe-novel-reader',
    environment: 'production',
    runtime_mode: 'edge-only',
    operator: {
      owner: 'jzvcpe-goat',
      provider: 'github-pages-supabase-managed',
    },
    frontend: {
      provider: 'github-pages',
      service_id: 'jzvcpe-goat/parallel-universe-novel',
      origin: 'https://jzvcpe-goat.github.io',
      secrets_configured: true,
    },
    data_api: {
      provider: 'supabase',
      service_id: 'readerdata12345',
      origin: 'https://readerdata12345.supabase.co',
      secrets_configured: true,
      public_key_model: 'publishable-or-legacy-anon-with-rls',
    },
    agent: {
      remote_required: false,
      location: 'user-owned-edge-device',
      ai_generation_cloud_runtime: false,
      reader_can_trigger_ai: false,
    },
    health: {
      frontend_url: 'https://jzvcpe-goat.github.io/parallel-universe-novel/',
      data_probe_table: 'health_probe',
      data_probe_id: 'reader',
    },
  }
  assertNoPrivateTerms(intent, 'P162 fixture intent')
  mkdirSync(dirname(join(root, intentRel)), { recursive: true })
  writeFileSync(join(root, intentRel), `${JSON.stringify(intent, null, 2)}\n`)
}

function assertIncludes(file, terms) {
  const body = read(file)
  for (const term of terms) assert(body.includes(term), `${file} must include ${term}`)
}

for (const file of [
  'package.json',
  'docs/backend/P138_REMOTE_ASSIGNMENT_COMPILER_V3.md',
  'docs/backend/P150_EDGE_ONLY_DATA_API_EVIDENCE_READINESS.md',
  'docs/backend/P151_EDGE_ONLY_DATA_API_STRICT_INTAKE.md',
  'docs/backend/P162_RUNTIME_ASSIGNMENT_INTENT_FIRST_PROJECTION.md',
  'docs/design-system/DEVELOPMENT_NOTES.md',
  'scripts/check-edge-only-data-api-evidence-readiness.mjs',
  'scripts/check-edge-only-data-api-strict-intake.mjs',
]) {
  assert(existsSync(join(root, file)), `missing P162 prerequisite: ${file}`)
}

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:runtime-assignment-intent-first-projection'] === 'node scripts/check-runtime-assignment-intent-first-projection.mjs',
  'package.json must expose check:runtime-assignment-intent-first-projection',
)
assert(
  String(packageJson.scripts.test || '').includes('npm run check:remote-assignment-image-drift && npm run check:runtime-assignment-intent-first-projection && npm run check:remote-assignment-strict-run-package'),
  'root npm run test must run P162 after P113 and before P118 strict run package',
)
assertIncludes('docs/backend/P150_EDGE_ONLY_DATA_API_EVIDENCE_READINESS.md', [
  'localInputProjection',
  'runtime-assignment.intent.local.json',
  'authoring adapter',
])
assertIncludes('docs/backend/P151_EDGE_ONLY_DATA_API_STRICT_INTAKE.md', [
  'localInputProjection',
  'envAdapterRequiredForReadiness=false',
  'runtime-assignment.intent.local.json',
])
assertIncludes('docs/backend/P162_RUNTIME_ASSIGNMENT_INTENT_FIRST_PROJECTION.md', [
  'P162 Runtime Assignment Intent-First Projection',
  'check:runtime-assignment-intent-first-projection',
  'runtime-assignment.intent.local.json',
  'env adapter is blank',
])
assertIncludes('docs/backend/P138_REMOTE_ASSIGNMENT_COMPILER_V3.md', [
  'semantic local input',
  'env file is an authoring adapter',
])
assertIncludes('docs/design-system/DEVELOPMENT_NOTES.md', [
  'P162 Runtime Assignment Intent-First Projection',
  'runtime-assignment.intent.local.json',
  'envAdapterRequiredForReadiness=false',
])
assertIncludes('scripts/check-edge-only-data-api-evidence-readiness.mjs', [
  'localInputProjection',
  'acceptsRuntimeIntentAsSemanticInput',
])
assertIncludes('scripts/check-edge-only-data-api-strict-intake.mjs', [
  'semanticLocalInputStatus',
  'envAdapterRequiredForReadiness',
])

const snapshots = new Map([
  [intentRel, snapshot(intentRel)],
  [envRel, snapshot(envRel)],
  [contractRel, snapshot(contractRel)],
  [healthRel, snapshot(healthRel)],
])

let p150
let p151
try {
  writeFixtureIntent()
  restore(contractRel, null)
  restore(healthRel, null)
  runNpm('check:edge-only-data-api-evidence-readiness')
  runNpm('check:edge-only-data-api-strict-intake')
  p150 = latestArtifact('edge-only-data-api-evidence-readiness-')
  p151 = latestArtifact('edge-only-data-api-strict-intake-')
} finally {
  for (const [rel, content] of snapshots.entries()) restore(rel, content)
}

const noLongerMissing = [
  'data-api-service-id',
  'data-api-origin',
  'data-api-production-origin',
  'data-api-configured',
]
const p150Regressions = noLongerMissing.filter(stage => p150.missingStages.includes(stage))
const p151Regressions = noLongerMissing.filter(stage => p151.missingStages.includes(stage))
assert(p150Regressions.length === 0, `P150 ignored filled semantic intent: ${p150Regressions.join(', ')}`)
assert(p151Regressions.length === 0, `P151 ignored filled semantic intent: ${p151Regressions.join(', ')}`)
assert(p150.localInputProjection?.acceptsRuntimeIntentAsSemanticInput === true, 'P150 must expose intent-first local input projection')
assert(p151.localInputProjection?.acceptsRuntimeIntentAsSemanticInput === true, 'P151 must expose intent-first local input projection')
assert(p151.localInputProjection?.envAdapterRequiredForReadiness === false, 'P151 must not require env adapter when semantic intent is filled')

const artifact = {
  version: 1,
  gate,
  status: 'passed',
  generatedAt: new Date().toISOString(),
  headSha: currentHead(),
  fixture: 'intent-filled-env-empty',
  verified: {
    p150AcceptsSemanticIntent: true,
    p151AcceptsSemanticIntent: true,
    envAdapterRequiredForReadiness: false,
    ignoredLocalFilesRestored: true,
  },
  remainingExpectedStages: {
    p150: p150.missingStages,
    p151: p151.missingStages,
  },
  valuesIncluded: false,
}
assertNoPrivateTerms(artifact, 'P162 artifact')
mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `runtime-assignment-intent-first-projection-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: 'passed',
  gate,
  artifactPath: relative(root, artifactPath),
  p150MissingStages: p150.missingStages,
  p151MissingStages: p151.missingStages,
}, null, 2))
