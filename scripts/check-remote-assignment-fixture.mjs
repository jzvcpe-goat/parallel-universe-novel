#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')
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

function runJson(command, args, env) {
  const output = execFileSync(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30000,
  })
  const start = output.indexOf('{')
  assert(start >= 0, `${args.join(' ')} did not return JSON`)
  return JSON.parse(output.slice(start))
}

function scanNoPrivateTerms(payload) {
  const text = JSON.stringify(payload)
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
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function assertDoc(rel, terms) {
  const body = read(rel)
  for (const term of terms) assert(body.includes(term), `${rel} must include ${term}`)
}

assert(existsSync(join(root, fixturePath)), `missing ${fixturePath}`)
const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:remote-assignment-fixture'] === 'node scripts/check-remote-assignment-fixture.mjs',
  'package.json must expose check:remote-assignment-fixture',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-assignment-fixture'),
  'root npm run test must include check:remote-assignment-fixture',
)

const fixture = readJson(fixturePath)
const privateHits = scanNoPrivateTerms(fixture)
assert(privateHits.length === 0, `fixture contains private terms: ${privateHits.join(', ')}`)
assert(fixture.gate === 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE', 'fixture must target P75 assignment intake')
assert(fixture.hostTargetProfile === 'docker-compatible-two-service-paas', 'fixture host profile must match deploy manifest')
assert(fixture.services?.api?.providerSecretsConfigured === true, 'fixture API secret-store flag must be true')
assert(fixture.services?.agent?.providerSecretsConfigured === true, 'fixture Agent secret-store flag must be true')
assert(String(fixture.services?.api?.origin || '').endsWith('.invalid'), 'fixture API origin must use .invalid reserved domain')
assert(String(fixture.services?.agent?.origin || '').endsWith('.invalid'), 'fixture Agent origin must use .invalid reserved domain')
assert(fixture.pagesVariablesAfterHealth?.VITE_PUBLIC_RUNTIME_MODE === 'live', 'fixture Pages mode must be live after health')
assert(
  fixture.pagesVariablesAfterHealth?.VITE_API_ORIGIN === fixture.services.api.origin
    && fixture.pagesVariablesAfterHealth?.VITE_AGENT_RUNTIME_BASE_URL === fixture.services.agent.origin,
  'fixture Pages origins must match service origins',
)

assertDoc('docs/backend/P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE.md', [
  'remote-assignment.fixture.json',
  'reserved `.invalid` origins',
  'remote_assignment_pending_health',
])
assertDoc('docs/backend/P79_REMOTE_ASSIGNMENT_EXECUTION_PACK.md', [
  'remote-assignment.fixture.json',
  'assignment_execution_pack_ready',
])
assertDoc('docs/backend/P81_REMOTE_ASSIGNMENT_FIXTURE_GATE.md', [
  'P81 Remote Assignment Fixture Gate',
  'P79 strict execution pack',
  'P75 pending health',
])

const fixtureEnv = {
  REMOTE_RUNTIME_ASSIGNMENT_FILE: fixturePath,
  REMOTE_ASSIGNMENT_HEALTH_TIMEOUT_MS: '500',
}
const p79 = runJson('node', ['scripts/check-remote-assignment-execution-pack.mjs'], {
  ...fixtureEnv,
  REQUIRE_REMOTE_ASSIGNMENT_EXECUTION_READY: 'true',
})
assert(p79.status === 'passed', 'P79 fixture execution pack must pass strict mode')
assert(p79.decision === 'assignment_execution_pack_ready', 'P79 fixture decision must be assignment_execution_pack_ready')

const p75 = runJson('node', ['scripts/check-remote-runtime-assignment-intake.mjs'], fixtureEnv)
assert(p75.status === 'passed_with_assignment_blockers', 'P75 fixture must not claim remote assignment ready')
assert(p75.decision === 'remote_assignment_pending_health', 'P75 fixture must stop at pending health')
assert(p75.blockedStages.includes('api-health-ready'), 'P75 fixture must block API health')
assert(p75.blockedStages.includes('agent-health-ready'), 'P75 fixture must block Agent health')

const artifact = {
  status: 'passed',
  gate: 'P81_REMOTE_ASSIGNMENT_FIXTURE_GATE',
  generatedAt: new Date().toISOString(),
  fixturePath,
  contract: {
    fixtureIsNoSecret: true,
    fixtureOriginsAreReservedInvalidDomains: true,
    p79StrictExecutionPack: p79.decision,
    p75HealthBoundary: p75.decision,
    liveRuntimeClaimed: false,
  },
  evidence: {
    p79: {
      status: p79.status,
      decision: p79.decision,
      artifactPath: p79.artifactPath,
      markdownArtifactPath: p79.markdownArtifactPath,
    },
    p75: {
      status: p75.status,
      decision: p75.decision,
      blockedStages: p75.blockedStages,
      artifactPath: p75.artifactPath,
    },
  },
}

const artifactPrivateHits = scanNoPrivateTerms(artifact)
assert(artifactPrivateHits.length === 0, `P81 artifact contains private terms: ${artifactPrivateHits.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `remote-assignment-fixture-gate-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: artifact.status,
  gate: artifact.gate,
  fixturePath,
  p79Decision: p79.decision,
  p75Decision: p75.decision,
  artifactPath,
}, null, 2))
