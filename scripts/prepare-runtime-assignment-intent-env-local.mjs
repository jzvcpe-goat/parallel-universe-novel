#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')
const templateRel = 'deploy/runtime-production/runtime-assignment.intent.env.example'
const localRel = 'deploy/runtime-production/runtime-assignment.intent.env.local'
const scriptName = 'prepare:runtime-assignment-intent-env-local'
const checkScriptName = 'check:runtime-assignment-intent-env-local-bootstrap'
const writeMode = process.argv.includes('--write') || process.env.RUNTIME_ASSIGNMENT_INTENT_ENV_LOCAL_WRITE === 'true'
const force = process.argv.includes('--force') || process.env.RUNTIME_ASSIGNMENT_INTENT_ENV_LOCAL_FORCE === 'true'

const requiredTerms = [
  'RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID',
  'SUPABASE_PROJECT_REF',
  'RUNTIME_ASSIGNMENT_DATA_API_ORIGIN',
  'SUPABASE_URL',
  'RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED=false',
  'RUNTIME_ASSIGNMENT_DATA_PROBE_TABLE=health_probe',
  'RUNTIME_ASSIGNMENT_DATA_PROBE_ID=reader',
]

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
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 8000,
  })
  if (result.status === 0) return true
  const output = `${result.stdout || ''}\n${result.stderr || ''}`
  if (result.status === 128 && /not a git repository/i.test(output)) {
    return read('.gitignore').includes(rel)
  }
  return false
}

function assertNoPrivateTerms(value, label) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL\s*=/i,
    /postgres(ql)?:\/\//i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/i,
    /SUPABASE_SERVICE_ROLE/i,
    /SERVICE_ROLE_KEY/i,
    /SUPABASE_SECRET_KEY/i,
    /SUPABASE_WRITER_PASSWORD/i,
    /WRITER_PASSWORD/i,
    /OPENAI_API_KEY/i,
    /DEEPSEEK_API_KEY/i,
    /MOONSHOT_API_KEY/i,
    /KIMI_API_KEY/i,
    /ANTHROPIC_API_KEY/i,
    /NARRATIVEOS_TOOL_BRIDGE_TOKEN/i,
    /MASTRA_TOOL_BRIDGE_TOKEN/i,
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

function assertIncludes(rel, terms) {
  const body = read(rel)
  for (const term of terms) assert(body.includes(term), `${rel} must include ${term}`)
}

function parseEnvKeys(text) {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.split('=')[0])
    .filter(Boolean)
}

function writeArtifact(payload) {
  mkdirSync(artifactDir, { recursive: true })
  const artifactPath = join(artifactDir, `runtime-assignment-intent-env-local-bootstrap-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(artifactPath, `${JSON.stringify(payload, null, 2)}\n`)
  return artifactPath
}

for (const file of [
  templateRel,
  '.gitignore',
  'package.json',
  'docs/backend/P149_RUNTIME_ASSIGNMENT_INTENT_ENV_LOCAL_BOOTSTRAP.md',
  'docs/backend/P146_EDGE_ONLY_INTENT_ENV_TEMPLATE_GATE.md',
  'docs/backend/P147_EDGE_ONLY_OPERATOR_EVIDENCE_PACKET.md',
  'docs/design-system/DEVELOPMENT_NOTES.md',
]) {
  assert(existsSync(join(root, file)), `missing P149 prerequisite: ${file}`)
}

const packageJson = readJson('package.json')
const rootTest = String(packageJson.scripts?.test || '')
assert(
  packageJson.scripts?.[scriptName] === 'node scripts/prepare-runtime-assignment-intent-env-local.mjs --write',
  `package.json must expose ${scriptName}`,
)
assert(
  packageJson.scripts?.[checkScriptName] === 'node scripts/prepare-runtime-assignment-intent-env-local.mjs --check',
  `package.json must expose ${checkScriptName}`,
)
assert(
  rootTest.includes(`npm run ${checkScriptName} && npm run check:runtime-assignment-intent-env-template`),
  `root npm run test must run ${checkScriptName} immediately before P146`,
)

assert(read('.gitignore').includes(localRel), `${localRel} must be ignored`)
assert(gitCheckIgnore(localRel), `${localRel} must be ignored by Git`)

assertIncludes('docs/backend/P146_EDGE_ONLY_INTENT_ENV_TEMPLATE_GATE.md', [
  'P149',
  scriptName,
])
assertIncludes('docs/backend/P147_EDGE_ONLY_OPERATOR_EVIDENCE_PACKET.md', [
  'P149',
  scriptName,
])
assertIncludes('docs/backend/P149_RUNTIME_ASSIGNMENT_INTENT_ENV_LOCAL_BOOTSTRAP.md', [
  'P149 Runtime Assignment Intent Env Local Bootstrap',
  scriptName,
  checkScriptName,
  localRel,
])
assertIncludes('docs/design-system/DEVELOPMENT_NOTES.md', [
  'P149 Runtime Assignment Intent Env Local Bootstrap',
  scriptName,
])

const templateBody = read(templateRel)
for (const term of requiredTerms) assert(templateBody.includes(term), `${templateRel} must include ${term}`)
assertNoPrivateTerms(templateBody, 'runtime assignment intent env template')
const templateKeys = parseEnvKeys(templateBody)
assert(templateKeys.length >= 16, 'runtime assignment intent env template must contain the P140 key set')

let wroteLocalEnv = false
if (writeMode) {
  const localPath = join(root, localRel)
  assert(force || !existsSync(localPath), `${localRel} already exists; use --force only if you intend to overwrite local operator notes`)
  mkdirSync(dirname(localPath), { recursive: true })
  writeFileSync(localPath, templateBody)
  wroteLocalEnv = true
}

if (existsSync(join(root, localRel))) {
  const localBody = read(localRel)
  assertNoPrivateTerms(localBody, 'runtime assignment intent env local')
  for (const key of templateKeys) assert(localBody.includes(`${key}=`), `${localRel} missing ${key}`)
}

const artifact = {
  status: 'passed',
  gate: 'P149_RUNTIME_ASSIGNMENT_INTENT_ENV_LOCAL_BOOTSTRAP',
  generatedAt: new Date().toISOString(),
  templatePath: templateRel,
  localPath: localRel,
  writeMode,
  wroteLocalEnv,
  localEnvPresent: existsSync(join(root, localRel)),
  localEnvIgnoredByGit: gitCheckIgnore(localRel),
  valuesIncluded: false,
  boundary: {
    writesTrackedFiles: false,
    writesLocalIgnoredEnvOnly: writeMode,
    createsRemoteServices: false,
    setsGitHubVariables: false,
    storesSupabaseKeys: false,
    storesProviderSecrets: false,
    promotesLiveRuntime: false,
    treatsLegacyFullRemoteEnvAsPrimary: false,
  },
  nextCommand: `RUNTIME_ASSIGNMENT_INTENT_ENV_FILE=${localRel} RUNTIME_ASSIGNMENT_INTENT_FORCE=true npm run prepare:runtime-assignment-intent`,
}
assertNoPrivateTerms(artifact, 'P149 artifact')
const artifactPath = writeArtifact(artifact)

console.log(JSON.stringify({
  status: artifact.status,
  gate: artifact.gate,
  mode: writeMode ? 'write' : 'check',
  localEnvPresent: artifact.localEnvPresent,
  wroteLocalEnv,
  artifactPath: relative(root, artifactPath),
  nextCommand: artifact.nextCommand,
}, null, 2))
