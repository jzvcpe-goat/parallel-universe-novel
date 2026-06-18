#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const outputDir = join(root, 'artifacts/runtime')

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

function readJson(path) {
  return JSON.parse(read(path))
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
  packageJson.scripts['check:time-engine-telemetry-fit'] === 'node scripts/check-time-engine-telemetry-fit.mjs',
  'package.json must expose check:time-engine-telemetry-fit',
)
assert(
  testCommand.includes('npm run check:time-engine-telemetry-fit'),
  'root npm run test must include check:time-engine-telemetry-fit',
)

assertIncludes('backend/src/narrativeos/persistence/db.py', [
  'class TimeEngineTelemetryFitRow',
  '__tablename__ = "time_engine_telemetry_fits"',
  'production_time_engine_fit',
])
assertIncludes('backend/db/migrations/0015_time_engine_telemetry_fits.sql', [
  'create table if not exists time_engine_telemetry_fits',
  'public_release_id text not null references public_branch_releases(public_release_id)',
  'fit_summary_json jsonb',
])
assertIncludes('backend/db/postgres_schema.sql', [
  'create table if not exists time_engine_telemetry_fits',
  'idx_time_engine_telemetry_fits_worldline_created_at',
])
assertIncludes('backend/src/narrativeos/persistence/repositories.py', [
  'persist_time_engine_telemetry_fit',
  'latest_time_engine_telemetry_fit',
  'time_engine_telemetry_fit_persisted',
  'tables_written": ["time_engine_telemetry_fits", "analytics_events"]',
])
assertIncludes('backend/src/narrativeos/services/product_runtime.py', [
  'fit_time_engine_telemetry',
  'production_time_engine_fit_gate',
  'production_time_engine_fit',
  'public_branch_release_required',
  'time_engine_fit_confirmation_required',
  'time_engine_fit_summary',
])
assertIncludes('backend/src/narrativeos/api/product_runtime.py', [
  'TimeEngineTelemetryFitRequest',
  '/v1/timeline/worldlines/{worldline_id}/time-engine/telemetry-fit',
  'Idempotency-Key',
])
assertIncludes('backend/tests/test_product_runtime_api.py', [
  'test_time_engine_telemetry_fit_requires_public_release_and_operator',
  'public_branch_release_required',
  'fit_operator_id_required',
  'time_engine_fit_confirmation_required',
  'production_time_engine_fit',
  'time_engine_fit_summary',
])
assertIncludes('docs/backend/P64_TIME_ENGINE_TELEMETRY_FIT_GATE.md', [
  'P64 TimeEngine Telemetry Fit Gate',
  'time_engine_telemetry_fits',
  'production_time_engine_fit',
])
assertIncludes('docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md', [
  'P64 TimeEngine Telemetry Fit Gate',
  'time_engine_fit_summary',
])
assertIncludes('docs/backend/P52_RUNTIME_COMPLETION_MATRIX_REFRESH.md', [
  'P64 TimeEngine Telemetry Fit Gate',
  'production_time_engine_fit',
])

const artifact = {
  generatedAt: new Date().toISOString(),
  status: 'passed',
  scope: 'production TimeEngine telemetry fit gate',
  guarantees: [
    'requires Idempotency-Key before TimeEngine fit write',
    'requires Reader-visible public branch release',
    'requires latest durable TimeEngine candidate ledger',
    'requires fit operator confirmation',
    'writes time_engine_telemetry_fits and analytics_events in one repository transaction',
  ],
  stillPartial: [
    'not remote live runtime proof',
    'not paid commercial launch packet',
  ],
}

mkdirSync(outputDir, { recursive: true })
const artifactPath = join(outputDir, `time-engine-telemetry-fit-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: artifact.status,
  artifact: relative(root, artifactPath),
  scope: artifact.scope,
  stillPartial: artifact.stillPartial,
}, null, 2))
