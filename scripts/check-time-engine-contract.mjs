#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')

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
  for (const term of terms) {
    assert(body.includes(term), `${file} must include ${term}`)
  }
}

const packageJson = readJson('package.json')
const testCommand = String(packageJson.scripts.test || '')

assert(
  packageJson.scripts['check:time-engine-contract'] === 'node scripts/check-time-engine-contract.mjs',
  'package.json must expose check:time-engine-contract',
)
assert(
  testCommand.includes('npm run check:time-engine-contract'),
  'root npm run test must include check:time-engine-contract',
)

assertIncludes('packages/agent-runtime/src/timeEngine.ts', [
  'simulateKernelEventDensity',
  'baseRate',
  'burst',
  'decay',
  'foreshadowPressure',
  'hawkesBoost',
  'deterministicJitter',
])
assertIncludes('packages/agent-runtime/src/timeEngine.test.ts', [
  'deterministic Poisson and Hawkes style event density',
  'assert.deepEqual',
  'hawkesBoost',
])
assertIncludes('packages/agent-runtime/src/workflows.ts', [
  'simulateKernelEventDensity',
  "source: 'time_engine'",
  'acceptedTimeEvents',
])
assertIncludes('packages/agent-runtime/src/types.ts', [
  "'time_engine'",
  'timeControls',
  'timeConsistencyReport',
])
assertIncludes('packages/agent-runtime/src/workflows.test.ts', [
  "event.source === 'time_engine'",
])
assertIncludes('scripts/check-runtime-artifact-contract.mjs', [
  'timeConsistencyReport must pass',
])
assertIncludes('backend/src/narrativeos/services/product_runtime.py', [
  'plan_time_events',
  'time_engine_snapshot',
  'time_event_candidate_ledger_only',
  'fastapi_durable_time_engine',
])
assertIncludes('backend/src/narrativeos/api/product_runtime.py', [
  'TimeEngineCandidateRequest',
  '/v1/timeline/worldlines/{worldline_id}/time-engine/candidates',
  '/v1/timeline/worldlines/{worldline_id}/time-engine',
])
assertIncludes('backend/tests/test_product_runtime_api.py', [
  'test_time_engine_persists_durable_candidate_events',
  'time_event_candidate_ledger_only',
  'idempotent_replay',
])
assertIncludes('docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md', [
  'time-engine',
  'deterministic TimeEngine',
  'Poisson/Hawkes-style',
  'FastAPI TimeEngine candidate ledger',
])
assertIncludes('docs/backend/P49_TIME_ENGINE_CONTRACT.md', [
  'P49 Time Engine Contract',
  'deterministic',
  'Poisson',
  'Hawkes',
  'candidate-only',
])
assertIncludes('docs/backend/P57_FASTAPI_TIME_ENGINE_SERVICE.md', [
  'P57 FastAPI TimeEngine Service',
  'time_event_candidate_ledger_only',
  'not canon',
])

const artifact = {
  generatedAt: new Date().toISOString(),
  status: 'passed',
  scope: 'agent-runtime density plus FastAPI durable candidate event ledger',
  inputs: ['GenreKernel.timeControls', 'BeatPlan', 'runId seed', 'worldlineId', 'Idempotent timeEngineRunId'],
  outputs: [
    'candidateEvents.source=time_engine',
    'acceptedTimeEvents',
    'timeConsistencyReport',
    'time_event_candidate_ledger_only',
  ],
  serviceScope: 'fastapi_durable_candidate_ledger',
  stillPartial: [
    'not yet connected to Reader branch publish',
    'not yet writing canon or branch state',
    'not yet fitted from production telemetry',
  ],
}

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `time-engine-contract-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: 'passed',
  artifactPath,
  scope: artifact.scope,
  stillPartial: artifact.stillPartial,
}, null, 2))
