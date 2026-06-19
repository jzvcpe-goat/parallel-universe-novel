#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')
const applyScript = join(root, 'scripts/apply-remote-assignment-env.mjs')
const productionAssignmentPath = join(root, 'deploy/runtime-production/remote-assignment.local.json')
const fixtureRel = 'artifacts/runtime/operator-assignment-env-apply-fixture.local.json'
const fixturePath = join(root, fixtureRel)
const examplePath = join(root, 'deploy/runtime-production/remote-assignment.example.json')

const safeEnv = {
  REMOTE_OPERATOR_OWNER: 'fixture-owner',
  REMOTE_OPERATOR_PROVIDER: 'fixture-paas',
  REMOTE_RUNTIME_ENVIRONMENT: 'production',
  REMOTE_API_SERVICE_ID: 'api-service-fixture',
  REMOTE_AGENT_SERVICE_ID: 'agent-service-fixture',
  REMOTE_API_ORIGIN: 'https://api.fixture-pu-novel.net',
  REMOTE_AGENT_ORIGIN: 'https://agent.fixture-pu-novel.net',
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
  try {
    const result = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 8000,
    })
    return result.status === 0 ? result.stdout.trim() : 'source-workspace-no-git'
  } catch {
    return 'source-workspace-no-git'
  }
}

function fingerprint(path) {
  if (!existsSync(path)) return null
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function resetFixture() {
  mkdirSync(dirname(fixturePath), { recursive: true })
  writeFileSync(fixturePath, readFileSync(examplePath))
  return fingerprint(fixturePath)
}

function cleanupFixture() {
  if (existsSync(fixturePath)) unlinkSync(fixturePath)
}

process.on('exit', cleanupFixture)

function runApply(extraEnv, { confirm = false } = {}) {
  const env = {
    ...process.env,
    ...extraEnv,
    REMOTE_RUNTIME_ASSIGNMENT_FILE: fixtureRel,
  }
  if (confirm) env.REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM = 'true'
  else delete env.REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM

  return spawnSync(process.execPath, [applyScript], {
    cwd: root,
    env,
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
    assert(!String(text).includes(value), `${label} leaked fixture value ${value}`)
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
assert(
  packageJson.scripts['check:operator-assignment-env-apply-fixture'] === 'node scripts/check-operator-assignment-env-apply-fixture.mjs',
  'package.json must expose check:operator-assignment-env-apply-fixture',
)
assert(
  String(packageJson.scripts.test || '').includes('npm run check:operator-assignment-env-validation-fixture && npm run check:operator-assignment-env-apply-fixture && npm run audit:dependencies'),
  'root test must run P126 after P125 and before dependency audit',
)

for (const file of [
  'docs/backend/P116_REMOTE_ASSIGNMENT_ENV_APPLY_GATE.md',
  'docs/backend/P125_OPERATOR_ASSIGNMENT_ENV_VALIDATION_FIXTURE.md',
  'docs/backend/P126_OPERATOR_ASSIGNMENT_ENV_APPLY_FIXTURE.md',
  'scripts/apply-remote-assignment-env.mjs',
]) {
  assert(existsSync(join(root, file)), `missing P126 prerequisite: ${file}`)
}

assertIncludes('docs/backend/P126_OPERATOR_ASSIGNMENT_ENV_APPLY_FIXTURE.md', [
  'P126 Operator Assignment Env Apply Fixture',
  'check:operator-assignment-env-apply-fixture',
  'temporary fixture target',
  'does not write',
])
assertIncludes('docs/backend/P116_REMOTE_ASSIGNMENT_ENV_APPLY_GATE.md', [
  'P126',
  'temporary fixture target',
])
assertIncludes('docs/backend/P125_OPERATOR_ASSIGNMENT_ENV_VALIDATION_FIXTURE.md', [
  'P126',
  'apply fixture',
])

const productionBefore = fingerprint(productionAssignmentPath)
const fixtureBefore = resetFixture()
const positive = runApply(safeEnv, { confirm: true })
assert(positive.status === 0, `positive apply fixture should pass: ${positive.stderr || positive.stdout}`)
const positiveOutput = JSON.parse(positive.stdout)
assert(positiveOutput.status === 'passed', 'positive fixture must pass')
assert(positiveOutput.mode === 'applied', 'positive fixture must run P116 apply mode')
assert(positiveOutput.targetPath === fixtureRel, 'positive fixture must write only the temporary target')
assert(positiveOutput.writesLocalAssignment === true, 'positive fixture must prove P116 write path')
assertNoLeak(positive.stdout, 'positive stdout')

const appliedFixture = JSON.parse(readFileSync(fixturePath, 'utf8'))
assert(appliedFixture.operator.owner === safeEnv.REMOTE_OPERATOR_OWNER, 'fixture owner must be applied')
assert(appliedFixture.services.api.origin === safeEnv.REMOTE_API_ORIGIN, 'fixture API origin must be applied')
assert(appliedFixture.services.agent.origin === safeEnv.REMOTE_AGENT_ORIGIN, 'fixture Agent origin must be applied')
assert(appliedFixture.services.api.providerSecretsConfigured === true, 'fixture API provider secret confirmation must be applied')
assert(appliedFixture.services.agent.providerSecretsConfigured === true, 'fixture Agent provider secret confirmation must be applied')
assert(fingerprint(fixturePath) !== fixtureBefore, 'temporary fixture target must change after positive apply')

const positiveArtifact = latestArtifact('remote-assignment-env-apply-')
assert(positiveArtifact.payload.gate === 'P116_REMOTE_ASSIGNMENT_ENV_APPLY_GATE', 'positive artifact must be P116')
assert(positiveArtifact.payload.mode === 'applied', 'positive artifact must be applied mode')
assert(positiveArtifact.payload.targetPath === fixtureRel, 'positive artifact must cite temporary target')
assert(positiveArtifact.payload.redaction?.serviceIdsIncluded === false, 'positive artifact must redact service ids')
assert(positiveArtifact.payload.redaction?.originsIncluded === false, 'positive artifact must redact origins')
assertNoLeak(JSON.stringify(positiveArtifact.payload), 'positive P116 artifact')

const negativeCases = [
  {
    id: 'missing-confirm',
    env: safeEnv,
    confirm: false,
    expected: /apply mode requires REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true/,
  },
  {
    id: 'placeholder-origin',
    env: {
      ...safeEnv,
      REMOTE_AGENT_ORIGIN: 'https://<agent-host>',
    },
    confirm: true,
    expected: /REMOTE_AGENT_ORIGIN must be a remote HTTPS origin/,
  },
  {
    id: 'secret-like-service-id',
    env: {
      ...safeEnv,
      REMOTE_API_SERVICE_ID: 'sk-testfixture1234567890',
    },
    confirm: true,
    expected: /REMOTE_API_SERVICE_ID looks like secret or private material/,
  },
]

for (const item of negativeCases) {
  const before = resetFixture()
  const result = runApply(item.env, { confirm: item.confirm })
  assert(result.status !== 0, `${item.id} negative fixture should fail`)
  const combined = `${result.stdout}\n${result.stderr}`
  assert(item.expected.test(combined), `${item.id} failure did not include expected guardrail message`)
  assert(fingerprint(fixturePath) === before, `${item.id} must not modify temporary fixture target`)
  assertNoLeak(result.stdout, `${item.id} stdout`)
}

cleanupFixture()
assert(!existsSync(fixturePath), 'temporary fixture target must be removed')
const productionAfter = fingerprint(productionAssignmentPath)
assert(productionBefore === productionAfter, 'P126 must not modify production remote-assignment.local.json')

mkdirSync(artifactDir, { recursive: true })
const artifact = {
  version: 1,
  gate: 'P126_OPERATOR_ASSIGNMENT_ENV_APPLY_FIXTURE',
  status: 'passed',
  generatedAt: new Date().toISOString(),
  headSha: currentHead(),
  positiveApplyFixture: {
    status: positiveOutput.status,
    mode: positiveOutput.mode,
    targetPath: fixtureRel,
    p116Artifact: relative(root, positiveArtifact.file),
  },
  negativeFixtures: negativeCases.map(item => ({
    id: item.id,
    rejected: true,
  })),
  productionAssignmentUnchanged: true,
  temporaryFixtureRemoved: true,
  writesProductionLocalAssignment: false,
  createsRemoteServices: false,
  setsGitHubVariables: false,
  storesProviderSecrets: false,
  publicBoundary: {
    serviceIdsIncluded: false,
    originsIncluded: false,
    providerSecretsIncluded: false,
    promptPlumbingIncluded: false,
    referenceVaultIncluded: false,
  },
}

assertNoLeak(JSON.stringify(artifact), 'P126 artifact')
const artifactPath = join(artifactDir, `operator-assignment-env-apply-fixture-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: artifact.status,
  gate: artifact.gate,
  positiveApplyFixture: artifact.positiveApplyFixture.status,
  negativeFixtureCount: artifact.negativeFixtures.length,
  productionAssignmentUnchanged: true,
  temporaryFixtureRemoved: true,
  artifactPath: relative(root, artifactPath),
}, null, 2))
