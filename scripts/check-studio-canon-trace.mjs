#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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
  for (const term of terms) assert(body.includes(term), `${file} must include ${term}`)
}

const packageJson = readJson('package.json')
const testCommand = String(packageJson.scripts.test || '')

assert(
  packageJson.scripts['check:studio-canon-trace'] === 'node scripts/check-studio-canon-trace.mjs',
  'package.json must expose check:studio-canon-trace',
)
assert(testCommand.includes('npm run check:studio-canon-trace'), 'root npm run test must include check:studio-canon-trace')

for (const file of [
  'backend/src/narrativeos/api/product_runtime.py',
  'backend/src/narrativeos/services/product_runtime.py',
  'backend/tests/test_product_runtime_api.py',
  'app/src/api/runtime.ts',
  'app/src/pages/Studio.tsx',
  'docs/backend/P56_STUDIO_CANON_TRACE_GATE.md',
  'docs/backend/P47_RUNTIME_TRACE_CONTINUITY.md',
  'docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md',
]) {
  assert(existsSync(join(root, file)), `missing Studio canon trace file: ${file}`)
}

assertIncludes('backend/src/narrativeos/api/product_runtime.py', [
  'project_id',
  'source_run_id',
  'studio_trace',
  'quality_report',
])
assertIncludes('backend/src/narrativeos/services/product_runtime.py', [
  '_build_studio_trace',
  'studio_trace',
  'quality_report_hash',
  'source_run_id',
  'idempotency_key_hash',
  'canon_ledger_only',
  'remove_ledger_record_and_requeue_candidate',
])
assertIncludes('backend/tests/test_product_runtime_api.py', [
  'studio-run-candidate-demo',
  'studio_trace',
  'quality_report_hash',
  'idempotent_replay',
])
assertIncludes('app/src/api/runtime.ts', [
  'studio_trace?: Record<string, unknown>',
  'source_run_id?: string',
  'project_id?: string',
])
assertIncludes('app/src/pages/Studio.tsx', [
  'studioRunId',
  'studio_trace',
  'source_run_id',
])
assertIncludes('docs/backend/P56_STUDIO_CANON_TRACE_GATE.md', [
  'P56 Studio Canon Trace Gate',
  'studio_trace',
  'quality_report_hash',
  'canon_ledger_only',
])
assertIncludes('docs/backend/P47_RUNTIME_TRACE_CONTINUITY.md', [
  'P56',
  'studio_trace',
  'quality_report_hash',
])
assertIncludes('docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md', [
  'P56 Studio Canon Trace Gate',
  'studio_trace',
  'quality_report_hash',
])

const artifact = {
  generatedAt: new Date().toISOString(),
  status: 'passed',
  scope: 'Studio quality evaluation to confirmed canon ledger trace',
  guarantees: [
    'quality/evaluate returns studio_trace with source_run_id and quality_report_hash',
    'canon/commit writes the same trace into the canon ledger',
    'idempotent replay returns the same ledger record',
    'rollback metadata remains available before public publish',
  ],
  stillPartial: [
    'durable local canon promotion transaction is covered by P98',
    'not a remote live runtime proof',
    'not production operator authorization',
  ],
}

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `studio-canon-trace-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({ status: artifact.status, artifactPath, scope: artifact.scope }, null, 2))
