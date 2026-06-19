#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')
const dryRunScript = join(root, 'scripts/check-remote-assignment-env-dry-run.mjs')
const assignmentPath = join(root, 'deploy/runtime-production/remote-assignment.local.json')

const safeEnv = {
  REMOTE_OPERATOR_OWNER: 'release-owner',
  REMOTE_OPERATOR_PROVIDER: 'runtime-paas',
  REMOTE_RUNTIME_ENVIRONMENT: 'production',
  REMOTE_API_SERVICE_ID: 'api-service-current',
  REMOTE_AGENT_SERVICE_ID: 'agent-service-current',
  REMOTE_API_ORIGIN: 'https://api.pu-novel-runtime.net',
  REMOTE_AGENT_ORIGIN: 'https://agent.pu-novel-runtime.net',
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

function fileFingerprint(path) {
  if (!existsSync(path)) return null
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function runDryRun(extraEnv, { strict = false } = {}) {
  const env = {
    ...process.env,
    ...extraEnv,
  }
  if (strict) env.REQUIRE_REMOTE_ASSIGNMENT_ENV_DRY_RUN_READY = 'true'
  else delete env.REQUIRE_REMOTE_ASSIGNMENT_ENV_DRY_RUN_READY

  return spawnSync(process.execPath, [dryRunScript], {
    cwd: root,
    env,
    encoding: 'utf8',
    timeout: 30000,
  })
}

function latestArtifact(prefix) {
  assert(existsSync(artifactDir), 'artifact directory is missing')
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .map(name => join(artifactDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  assert(files.length > 0, `missing ${prefix} artifact`)
  const file = files[0]
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
  packageJson.scripts['check:operator-assignment-env-validation-fixture'] === 'node scripts/check-operator-assignment-env-validation-fixture.mjs',
  'package.json must expose check:operator-assignment-env-validation-fixture',
)
assert(
  String(packageJson.scripts.test || '').includes('npm run check:operator-assignment-env-validation-fixture && npm run audit:dependencies'),
  'root test must run P125 after P124 and before dependency audit',
)

for (const file of [
  'docs/backend/P117_REMOTE_ASSIGNMENT_ENV_DRY_RUN_GATE.md',
  'docs/backend/P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE.md',
  'docs/backend/P125_OPERATOR_ASSIGNMENT_ENV_VALIDATION_FIXTURE.md',
  'scripts/check-remote-assignment-env-dry-run.mjs',
]) {
  assert(existsSync(join(root, file)), `missing P125 prerequisite: ${file}`)
}

assertIncludes('docs/backend/P125_OPERATOR_ASSIGNMENT_ENV_VALIDATION_FIXTURE.md', [
  'P125 Operator Assignment Env Validation Fixture',
  'check:operator-assignment-env-validation-fixture',
  'does not write',
  'positive strict fixture',
  'negative fixture',
])
assertIncludes('docs/backend/P117_REMOTE_ASSIGNMENT_ENV_DRY_RUN_GATE.md', [
  'P125',
  'positive strict fixture',
])
assertIncludes('docs/backend/P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE.md', [
  'P125',
  'validation fixture',
])

const beforeFingerprint = fileFingerprint(assignmentPath)

const positive = runDryRun(safeEnv, { strict: true })
assert(positive.status === 0, `positive strict fixture should pass: ${positive.stderr || positive.stdout}`)
const positiveOutput = JSON.parse(positive.stdout)
assert(positiveOutput.status === 'passed_operator_env_ready', 'positive fixture must report passed_operator_env_ready')
assert(positiveOutput.readyForApply === true, 'positive fixture must be ready for P116 apply')
assert(Array.isArray(positiveOutput.missingRequiredKeys) && positiveOutput.missingRequiredKeys.length === 0, 'positive fixture must have no missing keys')
assertNoLeak(positive.stdout, 'positive stdout')

const positiveArtifact = latestArtifact('remote-assignment-env-dry-run-')
assert(positiveArtifact.payload.gate === 'P117_REMOTE_ASSIGNMENT_ENV_DRY_RUN_GATE', 'positive artifact must be a P117 artifact')
assert(positiveArtifact.payload.decision === 'operator_env_ready_for_p116_apply', 'positive artifact decision mismatch')
assert(positiveArtifact.payload.p116ApplyPreflight?.readyForApply === true, 'positive artifact must be ready for apply')
assert(positiveArtifact.payload.redaction?.serviceIdsIncluded === false, 'positive artifact must redact service ids')
assert(positiveArtifact.payload.redaction?.originsIncluded === false, 'positive artifact must redact origins')
assertNoLeak(JSON.stringify(positiveArtifact.payload), 'positive artifact')

const followup = runDryRun({
  ...safeEnv,
  REMOTE_API_SECRETS_CONFIGURED: 'false',
})
assert(followup.status === 0, `follow-up fixture should pass without strict ready: ${followup.stderr || followup.stdout}`)
const followupOutput = JSON.parse(followup.stdout)
assert(followupOutput.status === 'passed_with_operator_env_followup_required', 'false secret confirmation must stay follow-up-required')
assert(followupOutput.readyForApply === false, 'false secret confirmation must not be ready for apply')
assertNoLeak(followup.stdout, 'follow-up stdout')

const negativeCases = [
  {
    id: 'partial-env',
    env: {
      REMOTE_OPERATOR_OWNER: 'release-owner',
    },
    expected: /partial operator env supplied/,
  },
  {
    id: 'localhost-origin',
    env: {
      ...safeEnv,
      REMOTE_API_ORIGIN: 'https://localhost',
    },
    expected: /REMOTE_API_ORIGIN must be a remote HTTPS origin/,
  },
  {
    id: 'placeholder-origin',
    env: {
      ...safeEnv,
      REMOTE_AGENT_ORIGIN: 'https://<agent-host>',
    },
    expected: /REMOTE_AGENT_ORIGIN must be a remote HTTPS origin/,
  },
  {
    id: 'secret-like-service-id',
    env: {
      ...safeEnv,
      REMOTE_API_SERVICE_ID: 'sk-testfixture1234567890',
    },
    expected: /REMOTE_API_SERVICE_ID looks like secret or private material/,
  },
]

for (const item of negativeCases) {
  const result = runDryRun(item.env, { strict: true })
  assert(result.status !== 0, `${item.id} negative fixture should fail`)
  const combined = `${result.stdout}\n${result.stderr}`
  assert(item.expected.test(combined), `${item.id} failure did not include expected guardrail message`)
  assertNoLeak(result.stdout, `${item.id} stdout`)
}

const afterFingerprint = fileFingerprint(assignmentPath)
assert(beforeFingerprint === afterFingerprint, 'P125/P117 fixture must not modify remote-assignment.local.json')

mkdirSync(artifactDir, { recursive: true })
const artifact = {
  version: 1,
  gate: 'P125_OPERATOR_ASSIGNMENT_ENV_VALIDATION_FIXTURE',
  status: 'passed',
  generatedAt: new Date().toISOString(),
  headSha: currentHead(),
  positiveStrictFixture: {
    status: positiveOutput.status,
    readyForApply: positiveOutput.readyForApply,
    missingRequiredKeyCount: positiveOutput.missingRequiredKeys.length,
    p117Artifact: relative(root, positiveArtifact.file),
  },
  followupFixture: {
    status: followupOutput.status,
    readyForApply: followupOutput.readyForApply,
  },
  negativeFixtures: negativeCases.map(item => ({
    id: item.id,
    rejected: true,
  })),
  writesLocalAssignment: false,
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

assertNoLeak(JSON.stringify(artifact), 'P125 artifact')
const artifactPath = join(artifactDir, `operator-assignment-env-validation-fixture-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: artifact.status,
  gate: artifact.gate,
  positiveStrictFixture: artifact.positiveStrictFixture.status,
  negativeFixtureCount: artifact.negativeFixtures.length,
  writesLocalAssignment: false,
  artifactPath: relative(root, artifactPath),
}, null, 2))
