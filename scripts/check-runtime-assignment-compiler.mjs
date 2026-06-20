#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertIncludes(file, terms) {
  const body = read(file)
  for (const term of terms) assert(body.includes(term), `${file} must include ${term}`)
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
    /WRITER_PASSWORD/i,
    /NARRATIVEOS_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/i,
    /MASTRA_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/i,
    /system prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(String)
}

const requiredFiles = [
  'deploy/runtime-production/runtime-assignment.intent.example.json',
  'deploy/runtime-production/generated/.gitkeep',
  'scripts/remote-assignment/lib/io.mjs',
  'scripts/remote-assignment/lib/validators.mjs',
  'scripts/remote-assignment/lib/env.mjs',
  'scripts/remote-assignment/compile-runtime-assignment.mjs',
  'scripts/remote-assignment/validate-runtime-assignment-contract.mjs',
  'scripts/remote-assignment/generate-legacy-remote-env.mjs',
  'scripts/remote-assignment/generate-operator-evidence.mjs',
  'scripts/remote-assignment/generate-ledger-patch.mjs',
  'scripts/remote-assignment/check-remote-health-evidence.mjs',
  'docs/backend/P138_REMOTE_ASSIGNMENT_COMPILER_V3.md',
]
for (const file of requiredFiles) assert(existsSync(join(root, file)), `missing runtime assignment compiler file: ${file}`)

const packageJson = readJson('package.json')
const scripts = packageJson.scripts || {}
const expected = {
  'remote-assignment:compile': 'node scripts/remote-assignment/compile-runtime-assignment.mjs',
  'remote-assignment:validate': 'node scripts/remote-assignment/validate-runtime-assignment-contract.mjs',
  'remote-assignment:legacy-env': 'node scripts/remote-assignment/generate-legacy-remote-env.mjs',
  'remote-assignment:evidence': 'node scripts/remote-assignment/generate-operator-evidence.mjs',
  'remote-assignment:ledger-patch': 'node scripts/remote-assignment/generate-ledger-patch.mjs',
  'remote-assignment:prepare': 'npm run remote-assignment:compile && npm run remote-assignment:validate && npm run remote-assignment:legacy-env && npm run remote-assignment:evidence && npm run remote-assignment:ledger-patch',
  'remote-health:check': 'node scripts/remote-assignment/check-remote-health-evidence.mjs',
  'check:runtime-assignment-compiler': 'node scripts/check-runtime-assignment-compiler.mjs',
}
for (const [key, value] of Object.entries(expected)) {
  assert(scripts[key] === value, `package.json must expose ${key}`)
}
assert(String(scripts.test || '').includes('npm run check:runtime-assignment-compiler'), 'root npm run test must include check:runtime-assignment-compiler')
assertIncludes('.gitignore', [
  'deploy/runtime-production/runtime-assignment.intent.local.json',
  'deploy/runtime-production/generated/*',
  '!deploy/runtime-production/generated/.gitkeep',
])
assertIncludes('docs/backend/P138_REMOTE_ASSIGNMENT_COMPILER_V3.md', [
  'P138 Remote Assignment Compiler v3',
  'edge-only',
  'REMOTE_RUNTIME_MODE=edge-only',
  'remote-health:check',
  'service_role_in_frontend_allowed: false',
])

const example = readJson('deploy/runtime-production/runtime-assignment.intent.example.json')
assert(example.schema_version === 1, 'intent example schema version must be 1')
assert(example.runtime_mode === 'edge-only', 'intent example must show edge-only')
assert(example.agent?.remote_required === false, 'edge-only example must not require remote agent')
assert(example.agent?.ai_generation_cloud_runtime === false, 'edge-only example must keep AI off cloud runtime')
assert(example.agent?.reader_can_trigger_ai === false, 'edge-only example reader must not trigger AI')
const privateHits = scanNoPrivateTerms(example)
assert(privateHits.length === 0, `runtime assignment example leaks private terms: ${privateHits.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifact = {
  version: 1,
  gate: 'P138_REMOTE_ASSIGNMENT_COMPILER_V3',
  status: 'passed',
  generatedAt: new Date().toISOString(),
  localIntentPresent: existsSync(join(root, 'deploy/runtime-production/runtime-assignment.intent.local.json')),
  generatedContractPresent: existsSync(join(root, 'deploy/runtime-production/generated/remote-assignment.contract.json')),
  compilerScriptsPresent: true,
}
const artifactPath = join(artifactDir, `runtime-assignment-compiler-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)
console.log(JSON.stringify({ status: 'passed', artifactPath }, null, 2))
