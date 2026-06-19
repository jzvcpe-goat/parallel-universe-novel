#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')
const dryRunScript = join(root, 'scripts/check-remote-assignment-env-dry-run.mjs')
const applyScript = join(root, 'scripts/apply-remote-assignment-env.mjs')
const envFixtureRel = 'deploy/runtime-production/remote-assignment.p129-fixture.env.local'
const envFixturePath = join(root, envFixtureRel)
const unknownKeyEnvRel = 'deploy/runtime-production/remote-assignment.p129-unknown.env.local'
const unknownKeyEnvPath = join(root, unknownKeyEnvRel)
const unignoredEnvRel = 'deploy/runtime-production/p129-unignored.env.local'
const unignoredEnvPath = join(root, unignoredEnvRel)
const assignmentFixtureRel = 'artifacts/runtime/operator-assignment-env-file-loader.local.json'
const assignmentFixturePath = join(root, assignmentFixtureRel)
const exampleAssignmentPath = join(root, 'deploy/runtime-production/remote-assignment.example.json')

const safeEnv = {
  REMOTE_OPERATOR_OWNER: 'loader-owner',
  REMOTE_OPERATOR_PROVIDER: 'loader-paas',
  REMOTE_RUNTIME_ENVIRONMENT: 'production',
  REMOTE_API_SERVICE_ID: 'api-service-loader',
  REMOTE_AGENT_SERVICE_ID: 'agent-service-loader',
  REMOTE_API_ORIGIN: 'https://api.loader-pu-novel.net',
  REMOTE_AGENT_ORIGIN: 'https://agent.loader-pu-novel.net',
  REMOTE_API_SECRETS_CONFIGURED: 'true',
  REMOTE_AGENT_SECRETS_CONFIGURED: 'true',
}

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
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: 8000,
  })
  return result.status === 0 ? result.stdout.trim() : 'source-workspace-no-git'
}

function writeEnvFile(path, entries) {
  mkdirSync(dirname(path), { recursive: true })
  const body = Object.entries(entries).map(([key, value]) => `${key}=${value}`).join('\n')
  writeFileSync(path, `${body}\n`)
}

function resetAssignmentFixture() {
  mkdirSync(dirname(assignmentFixturePath), { recursive: true })
  writeFileSync(assignmentFixturePath, readFileSync(exampleAssignmentPath))
  return fileFingerprint(assignmentFixturePath)
}

function cleanup() {
  for (const path of [envFixturePath, unknownKeyEnvPath, unignoredEnvPath, assignmentFixturePath]) {
    if (existsSync(path)) unlinkSync(path)
  }
}

process.on('exit', cleanup)

function fileFingerprint(path) {
  if (!existsSync(path)) return null
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function runNode(script, extraEnv, args = []) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    env: {
      ...process.env,
      ...extraEnv,
    },
    encoding: 'utf8',
    timeout: 30000,
  })
}

function latestArtifact(prefix) {
  assert(existsSync(artifactDir), 'artifact directory is missing')
  const candidates = readdirSync(artifactDir)
    .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .map(name => join(artifactDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  assert(candidates.length > 0, `missing ${prefix} artifact`)
  const file = candidates[0]
  return {
    file,
    payload: JSON.parse(readFileSync(file, 'utf8')),
  }
}

function assertNoLeak(text, label) {
  const forbiddenValues = Object.values(safeEnv)
    .filter(value => !['true', 'false', 'production'].includes(String(value).toLowerCase()))
  for (const value of forbiddenValues) {
    assert(!String(text).includes(value), `${label} leaked env-file fixture value ${value}`)
  }
  const privatePatterns = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL=(?!<)/,
    /postgres(ql)?:\/\/[^<]/i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/,
    /NARRATIVEOS_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/,
    /MASTRA_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/,
    /NARRATIVEOS_CREATOR_API_KEY\s*[:=]\s*(?!<)/,
    /Authorization:\s*Bearer\s+(?!<shared-tool-bridge-secret>)/i,
    /system prompt/i,
    /provider prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
    /sourceRefs/,
    /profile\.id/,
    /kernel\.id/,
  ]
  const hits = privatePatterns.filter(pattern => pattern.test(String(text))).map(pattern => String(pattern))
  assert(hits.length === 0, `${label} leaked private terms: ${hits.join(', ')}`)
}

function assertIncludes(file, terms) {
  const body = read(file)
  for (const term of terms) assert(body.includes(term), `${file} must include ${term}`)
}

const packageJson = readJson('package.json')
const rootTest = String(packageJson.scripts.test || '')
assert(
  packageJson.scripts['check:operator-assignment-env-file-loader'] === 'node scripts/check-operator-assignment-env-file-loader.mjs',
  'package.json must expose check:operator-assignment-env-file-loader',
)
assert(
  rootTest.includes('npm run check:operator-assignment-env-template && npm run check:operator-assignment-env-file-loader && npm run audit:dependencies'),
  'root test must run P129 after P128 and before dependency audit',
)

for (const file of [
  'scripts/operator-assignment-env-file.mjs',
  'scripts/check-remote-assignment-env-dry-run.mjs',
  'scripts/apply-remote-assignment-env.mjs',
  'docs/backend/P116_REMOTE_ASSIGNMENT_ENV_APPLY_GATE.md',
  'docs/backend/P117_REMOTE_ASSIGNMENT_ENV_DRY_RUN_GATE.md',
  'docs/backend/P128_OPERATOR_ASSIGNMENT_ENV_TEMPLATE_GATE.md',
  'docs/backend/P129_OPERATOR_ASSIGNMENT_ENV_FILE_LOADER.md',
  'deploy/runtime-production/remote-assignment.env.example',
  'deploy/runtime-production/remote-assignment.example.json',
]) {
  assert(existsSync(join(root, file)), `missing P129 prerequisite: ${file}`)
}

assertIncludes('docs/backend/P129_OPERATOR_ASSIGNMENT_ENV_FILE_LOADER.md', [
  'P129 Operator Assignment Env File Loader',
  'check:operator-assignment-env-file-loader',
  'REMOTE_ASSIGNMENT_ENV_FILE',
  'deploy/runtime-production/*.env.local',
  'does not write tracked files',
])
assertIncludes('docs/backend/P116_REMOTE_ASSIGNMENT_ENV_APPLY_GATE.md', [
  'REMOTE_ASSIGNMENT_ENV_FILE',
  'P129',
])
assertIncludes('docs/backend/P117_REMOTE_ASSIGNMENT_ENV_DRY_RUN_GATE.md', [
  'REMOTE_ASSIGNMENT_ENV_FILE',
  'P129',
])
assertIncludes('docs/backend/P128_OPERATOR_ASSIGNMENT_ENV_TEMPLATE_GATE.md', [
  'P129',
])

cleanup()
writeEnvFile(envFixturePath, safeEnv)
const productionAssignmentBefore = fileFingerprint(join(root, 'deploy/runtime-production/remote-assignment.local.json'))

const dryRun = runNode(dryRunScript, {
  REMOTE_ASSIGNMENT_ENV_FILE: envFixtureRel,
  REQUIRE_REMOTE_ASSIGNMENT_ENV_DRY_RUN_READY: 'true',
})
assert(dryRun.status === 0, `env-file dry-run fixture should pass: ${dryRun.stderr || dryRun.stdout}`)
const dryRunOutput = JSON.parse(dryRun.stdout)
assert(dryRunOutput.status === 'passed_operator_env_ready', 'env-file dry-run must report passed_operator_env_ready')
assert(dryRunOutput.operatorEnvFileLoaded === true, 'env-file dry-run must report loader usage')
assert(dryRunOutput.readyForApply === true, 'env-file dry-run must be ready for apply')
assertNoLeak(dryRun.stdout, 'env-file dry-run stdout')

const dryRunArtifact = latestArtifact('remote-assignment-env-dry-run-')
assert(dryRunArtifact.payload.operatorEnvFile?.loaded === true, 'P117 artifact must record loaded env file')
assert(dryRunArtifact.payload.operatorEnvFile?.path === envFixtureRel, 'P117 artifact must record redacted env file path')
assert(dryRunArtifact.payload.operatorEnvFile?.valuesIncluded === false, 'P117 artifact must not include env file values')
assertNoLeak(JSON.stringify(dryRunArtifact.payload), 'env-file dry-run artifact')

const assignmentBefore = resetAssignmentFixture()
const apply = runNode(applyScript, {
  REMOTE_ASSIGNMENT_ENV_FILE: envFixtureRel,
  REMOTE_RUNTIME_ASSIGNMENT_FILE: assignmentFixtureRel,
  REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM: 'true',
})
assert(apply.status === 0, `env-file apply fixture should pass: ${apply.stderr || apply.stdout}`)
const applyOutput = JSON.parse(apply.stdout)
assert(applyOutput.status === 'passed', 'env-file apply must pass')
assert(applyOutput.targetPath === assignmentFixtureRel, 'env-file apply must write only fixture assignment')
assert(fingerprintChanged(assignmentFixturePath, assignmentBefore), 'env-file apply must change fixture assignment')
assertNoLeak(apply.stdout, 'env-file apply stdout')

const applyArtifact = latestArtifact('remote-assignment-env-apply-')
assert(applyArtifact.payload.operatorEnvFile?.loaded === true, 'P116 artifact must record loaded env file')
assert(applyArtifact.payload.operatorEnvFile?.valuesIncluded === false, 'P116 artifact must not include env file values')
assertNoLeak(JSON.stringify(applyArtifact.payload), 'env-file apply artifact')

const negativeCases = [
  {
    id: 'tracked-template',
    prepare: () => {},
    envFile: 'deploy/runtime-production/remote-assignment.env.example',
    expected: /must point to an ignored \.env\.local file|must not point at the tracked template/,
  },
  {
    id: 'unknown-key',
    prepare: () => writeEnvFile(unknownKeyEnvPath, { ...safeEnv, UNEXPECTED_PROVIDER_TOKEN: 'not-a-token' }),
    envFile: unknownKeyEnvRel,
    expected: /unsupported key UNEXPECTED_PROVIDER_TOKEN/,
  },
  {
    id: 'unignored-file',
    prepare: () => writeEnvFile(unignoredEnvPath, safeEnv),
    envFile: unignoredEnvRel,
    expected: /target must be ignored by Git/,
  },
]

for (const item of negativeCases) {
  item.prepare()
  const result = runNode(dryRunScript, {
    REMOTE_ASSIGNMENT_ENV_FILE: item.envFile,
    REQUIRE_REMOTE_ASSIGNMENT_ENV_DRY_RUN_READY: 'true',
  })
  assert(result.status !== 0, `${item.id} negative env-file fixture should fail`)
  const combined = `${result.stdout}\n${result.stderr}`
  assert(item.expected.test(combined), `${item.id} failure did not include expected guardrail`)
  assertNoLeak(result.stdout, `${item.id} stdout`)
}

const productionAssignmentAfter = fileFingerprint(join(root, 'deploy/runtime-production/remote-assignment.local.json'))
assert(productionAssignmentBefore === productionAssignmentAfter, 'P129 must not modify production remote-assignment.local.json')

cleanup()
assert(!existsSync(envFixturePath), 'P129 fixture env file must be removed')
assert(!existsSync(assignmentFixturePath), 'P129 assignment fixture must be removed')

mkdirSync(artifactDir, { recursive: true })
const artifact = {
  version: 1,
  gate: 'P129_OPERATOR_ASSIGNMENT_ENV_FILE_LOADER',
  status: 'passed',
  generatedAt: new Date().toISOString(),
  headSha: currentHead(),
  dryRunFixture: {
    status: dryRunOutput.status,
    operatorEnvFileLoaded: dryRunOutput.operatorEnvFileLoaded,
    p117Artifact: relative(root, dryRunArtifact.file),
  },
  applyFixture: {
    status: applyOutput.status,
    targetPath: assignmentFixtureRel,
    p116Artifact: relative(root, applyArtifact.file),
  },
  negativeFixtures: negativeCases.map(item => ({
    id: item.id,
    rejected: true,
  })),
  productionAssignmentUnchanged: true,
  temporaryFilesRemoved: true,
  publicBoundary: {
    envValuesIncluded: false,
    serviceIdsIncluded: false,
    originsIncluded: false,
    providerSecretsIncluded: false,
    promptPlumbingIncluded: false,
    referenceVaultIncluded: false,
  },
}

assertNoLeak(JSON.stringify(artifact), 'P129 artifact')
const artifactPath = join(artifactDir, `operator-assignment-env-file-loader-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: artifact.status,
  gate: artifact.gate,
  dryRunFixture: artifact.dryRunFixture.status,
  applyFixture: artifact.applyFixture.status,
  negativeFixtureCount: artifact.negativeFixtures.length,
  productionAssignmentUnchanged: true,
  temporaryFilesRemoved: true,
  artifactPath: relative(root, artifactPath),
}, null, 2))

function fingerprintChanged(path, before) {
  return fileFingerprint(path) !== before
}
