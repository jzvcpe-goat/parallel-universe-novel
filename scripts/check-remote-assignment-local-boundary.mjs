#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const localAssignmentPath = 'deploy/runtime-production/remote-assignment.local.json'
const localAssignmentGlob = 'deploy/runtime-production/remote-assignment.*.local.json'
const fixturePath = 'deploy/runtime-production/remote-assignment.fixture.json'

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

function run(command, args, env = {}) {
  return execFileSync(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30000,
  })
}

function gitTrackedFiles() {
  if (!existsSync(join(root, '.git'))) return { mode: 'source_workspace_no_git', files: [] }
  const output = run('git', ['ls-files', 'deploy/runtime-production'])
  return {
    mode: 'git',
    files: output.split(/\r?\n/).map(line => line.trim()).filter(Boolean),
  }
}

function localFilesOnDisk() {
  const dir = join(root, 'deploy/runtime-production')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter(name => /^remote-assignment(?:\..+)?\.local\.json$/.test(name))
    .map(name => `deploy/runtime-production/${name}`)
    .sort()
}

function scanNoPrivateTerms(payload) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL=(?!<)/,
    /postgres(ql)?:\/\/[^<]/i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/,
    /dev-local-token/,
    /NARRATIVEOS_TOOL_BRIDGE_TOKEN=(?!<)/,
    /MASTRA_TOOL_BRIDGE_TOKEN=(?!<)/,
    /NARRATIVEOS_CREATOR_API_KEY=(?!<)/,
    /Authorization:\s*Bearer\s+(?!<shared-tool-bridge-secret>)/i,
    /system prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
    /sourceRefs/,
    /profile\.id/,
    /kernel\.id/,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function isPlaceholder(value) {
  return /<.+>/.test(String(value || ''))
}

function strictFixtureP75Fails() {
  try {
    run('node', ['scripts/check-remote-runtime-assignment-intake.mjs'], {
      REMOTE_RUNTIME_ASSIGNMENT_FILE: fixturePath,
      REMOTE_ASSIGNMENT_HEALTH_TIMEOUT_MS: '500',
      REQUIRE_REMOTE_ASSIGNMENT_READY: 'true',
    })
    return {
      status: 'failed',
      reason: 'fixture unexpectedly satisfied strict P75 readiness',
    }
  } catch (error) {
    const stdout = String(error?.stdout || '')
    const stderr = String(error?.stderr || '')
    const combined = `${stdout}\n${stderr}`
    return {
      status: 'passed',
      reason: 'fixture remains blocked by health readiness',
      evidence: /remote assignment is not ready|api-health-ready|agent-health-ready/.test(combined)
        ? 'strict_p75_rejected_fixture'
        : 'strict_p75_rejected_fixture_without_expected_text',
    }
  }
}

const requiredFiles = [
  '.gitignore',
  'deploy/runtime-production/remote-assignment.example.json',
  'deploy/runtime-production/remote-assignment.fixture.json',
  'docs/backend/P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE.md',
  'docs/backend/P79_REMOTE_ASSIGNMENT_EXECUTION_PACK.md',
  'docs/backend/P105_REMOTE_ASSIGNMENT_FILL_PLAN_GATE.md',
  'docs/backend/P108_REMOTE_ASSIGNMENT_LOCAL_BOUNDARY_GUARD.md',
  'docs/baseline/RELEASE_SYNC_MANIFEST.json',
]
for (const file of requiredFiles) assert(existsSync(join(root, file)), `missing P108 boundary file: ${file}`)

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:remote-assignment-local-boundary'] === 'node scripts/check-remote-assignment-local-boundary.mjs',
  'package.json must expose check:remote-assignment-local-boundary',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-assignment-local-boundary'),
  'root npm run test must include check:remote-assignment-local-boundary',
)

const gitignore = read('.gitignore')
assert(gitignore.includes(localAssignmentPath), `.gitignore must include ${localAssignmentPath}`)
assert(gitignore.includes(localAssignmentGlob), `.gitignore must include ${localAssignmentGlob}`)

const tracked = gitTrackedFiles()
const trackedLocalAssignments = tracked.files.filter(file => /^deploy\/runtime-production\/remote-assignment(?:\..+)?\.local\.json$/.test(file))
assert(trackedLocalAssignments.length === 0, `local assignment files must not be tracked: ${trackedLocalAssignments.join(', ')}`)

const example = readJson('deploy/runtime-production/remote-assignment.example.json')
assert(example.services?.api?.providerSecretsConfigured === false, 'example must not claim API provider secrets are configured')
assert(example.services?.agent?.providerSecretsConfigured === false, 'example must not claim Agent provider secrets are configured')
assert(isPlaceholder(example.operator?.owner), 'example owner must stay placeholder-only')
assert(isPlaceholder(example.services?.api?.serviceId), 'example API serviceId must stay placeholder-only')
assert(isPlaceholder(example.services?.agent?.serviceId), 'example Agent serviceId must stay placeholder-only')
assert(isPlaceholder(example.services?.api?.origin), 'example API origin must stay placeholder-only')
assert(isPlaceholder(example.services?.agent?.origin), 'example Agent origin must stay placeholder-only')
assert(scanNoPrivateTerms(example).length === 0, 'example assignment must not contain private terms')

const fixture = readJson(fixturePath)
assert(String(fixture.services?.api?.origin || '').endsWith('.invalid'), 'fixture API origin must use reserved .invalid domain')
assert(String(fixture.services?.agent?.origin || '').endsWith('.invalid'), 'fixture Agent origin must use reserved .invalid domain')
assert(fixture.services?.api?.providerSecretsConfigured === true, 'fixture API provider secret flag must be true only for contract execution-pack coverage')
assert(fixture.services?.agent?.providerSecretsConfigured === true, 'fixture Agent provider secret flag must be true only for contract execution-pack coverage')
assert(scanNoPrivateTerms(fixture).length === 0, 'fixture assignment must not contain private terms')

const fixtureStrict = strictFixtureP75Fails()
assert(fixtureStrict.status === 'passed', fixtureStrict.reason)
assert(fixtureStrict.evidence === 'strict_p75_rejected_fixture', 'strict P75 fixture rejection must mention readiness blockers')

assertIncludes('docs/backend/P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE.md', [
  'remote-assignment.local.json',
  'ignored by Git',
  'P108 Remote Assignment Local Boundary Guard',
  'fixture cannot unblock production readiness',
])
assertIncludes('docs/backend/P79_REMOTE_ASSIGNMENT_EXECUTION_PACK.md', [
  'P108 Remote Assignment Local Boundary Guard',
  'fixture can generate commands but cannot satisfy P75 strict readiness',
])
assertIncludes('docs/backend/P105_REMOTE_ASSIGNMENT_FILL_PLAN_GATE.md', [
  'P108 Remote Assignment Local Boundary Guard',
  'ignored local assignment',
])
assertIncludes('docs/backend/P108_REMOTE_ASSIGNMENT_LOCAL_BOUNDARY_GUARD.md', [
  'P108 Remote Assignment Local Boundary Guard',
  'check:remote-assignment-local-boundary',
  localAssignmentPath,
  localAssignmentGlob,
  'fixture cannot unblock production readiness',
])

const syncManifest = readJson('docs/baseline/RELEASE_SYNC_MANIFEST.json')
for (const required of [
  'docs/backend/P108_REMOTE_ASSIGNMENT_LOCAL_BOUNDARY_GUARD.md',
  'scripts/check-remote-assignment-local-boundary.mjs',
]) {
  assert(syncManifest.syncAsIs.includes(required), `release sync manifest must include ${required}`)
}

const localFiles = localFilesOnDisk()
const artifact = {
  status: 'passed',
  gate: 'P108_REMOTE_ASSIGNMENT_LOCAL_BOUNDARY_GUARD',
  generatedAt: new Date().toISOString(),
  trackedMode: tracked.mode,
  ignoredPatterns: [localAssignmentPath, localAssignmentGlob],
  trackedLocalAssignments,
  localAssignmentFilePresent: localFiles.length > 0,
  localAssignmentFileCount: localFiles.length,
  example: {
    placeholderOnly: true,
    providerSecretsConfigured: false,
    containsSecrets: false,
  },
  fixture: {
    reservedInvalidOrigins: true,
    strictP75Readiness: 'rejected',
    fixtureCanGenerateCommands: true,
    fixtureCannotUnblockProductionReadiness: true,
  },
}

const artifactPrivateHits = scanNoPrivateTerms(artifact)
assert(artifactPrivateHits.length === 0, `P108 artifact contains private terms: ${artifactPrivateHits.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `remote-assignment-local-boundary-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: 'passed',
  gate: artifact.gate,
  trackedMode: tracked.mode,
  trackedLocalAssignments,
  localAssignmentFilePresent: artifact.localAssignmentFilePresent,
  fixtureStrictP75: fixtureStrict.evidence,
  artifactPath,
}, null, 2))
