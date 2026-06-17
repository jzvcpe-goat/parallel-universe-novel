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
  packageJson.scripts['check:reader-branch-trace'] === 'node scripts/check-reader-branch-trace.mjs',
  'package.json must expose check:reader-branch-trace',
)
assert(
  testCommand.includes('npm run check:reader-branch-trace'),
  'root npm run test must include check:reader-branch-trace',
)

assertIncludes('backend/src/narrativeos/persistence/db.py', [
  'class RouteChoiceRow',
  '__tablename__ = "route_choices"',
])
assertIncludes('backend/src/narrativeos/persistence/repositories.py', [
  'def save_route_choice',
  'def list_route_choices',
  'RouteChoiceRow',
])
assertIncludes('backend/src/narrativeos/api/product_runtime.py', [
  'source_run_id',
  'branch_id',
  '@router.post("/v1/scene/advance")',
])
assertIncludes('backend/src/narrativeos/services/product_runtime.py', [
  '_stable_reader_run_id',
  'branch_writeback',
  'branch_writeback_summary',
  'route_choice_ledger_only',
  'save_route_choice',
  'list_route_choices',
])
assertIncludes('backend/tests/test_product_runtime_api.py', [
  'test_scene_advance_persists_reader_branch_trace',
  'reader-run-branch-proof',
  'branch_writeback',
  'route_choice_ledger_only',
  'branch_writeback_summary',
])
assertIncludes('app/src/api/runtime.ts', [
  'source_run_id',
  'branch_id',
  'branch_writeback',
  'branch_writeback_summary',
])
assertIncludes('app/src/pages/Story.tsx', [
  'source_run_id',
  'worldline_id',
  'branch_id',
])
assertIncludes('docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md', [
  'P53 Reader Branch Trace Gate',
  'route_choice_ledger_only',
  'branch_writeback_summary',
])
assertIncludes('docs/backend/P53_READER_BRANCH_TRACE_GATE.md', [
  'Reader choices must no longer be only local UI state',
  'route_choice_ledger_only',
  'Non-Claims',
])

const artifact = {
  generatedAt: new Date().toISOString(),
  status: 'passed',
  gate: 'reader branch trace gate',
  writeScope: 'route_choice_ledger_only',
  backend: {
    persistence: 'RouteChoiceRow',
    service: 'ProductRuntimeService.advance_scene',
    endpoint: '/v1/scene/advance',
    tests: 'backend/tests/test_product_runtime_api.py',
  },
  frontend: {
    client: 'app/src/api/runtime.ts',
    surface: 'app/src/pages/Story.tsx',
    publicUi: 'no internal trace vocabulary should be displayed',
  },
  nonClaims: [
    'no canon write',
    'no public branch publish',
    'no production transaction rollback proof',
    'no remote live runtime proof',
  ],
}

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `reader-branch-trace-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: artifact.status,
  artifactPath,
  writeScope: artifact.writeScope,
}, null, 2))
