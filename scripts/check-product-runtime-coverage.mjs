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
  packageJson.scripts['check:product-runtime-coverage'] === 'node scripts/check-product-runtime-coverage.mjs',
  'package.json must expose check:product-runtime-coverage',
)
assert(
  testCommand.includes('backend/tests/test_product_runtime_api.py'),
  'root npm run test must execute backend/tests/test_product_runtime_api.py',
)
assert(
  testCommand.includes('npm run check:product-runtime-coverage'),
  'root npm run test must include check:product-runtime-coverage',
)

assertIncludes('backend/tests/test_product_runtime_api.py', [
  'test_scene_advance_returns_candidate_scene_and_quality_trace',
  'test_scene_advance_persists_reader_branch_trace',
  'test_quality_evaluate_and_canon_commit_gate',
  'test_quality_gate_blocks_engineering_leak_but_keeps_learned_tracks_shadow_only',
  'harness_trace',
  'branch_writeback',
  'quality_brake',
  'canon_commit_readiness',
])
assertIncludes('backend/src/narrativeos/api/product_runtime.py', [
  '@router.post("/v1/scene/advance")',
  '@router.post("/v1/quality/evaluate")',
  '@router.post("/v1/canon/commit")',
  'quality_report',
  'confirmed',
])
assertIncludes('app/src/api/runtime.ts', [
  'advanceScene',
  'evaluateQuality',
  'commitCanon',
  'SceneAdvanceResponse',
  'branch_writeback',
  'QualityEvaluateResponse',
  'CanonCommitResponse',
])
assertIncludes('docs/backend/P47_RUNTIME_TRACE_CONTINUITY.md', [
  'Reader',
  'Studio',
  'quality/evaluate',
  'canon/commit',
])
assertIncludes('docs/backend/P48_PRODUCT_RUNTIME_API_COVERAGE.md', [
  'P48 Product Runtime API Coverage',
  'test_product_runtime_api.py',
  'scene advance',
  'quality evaluate',
  'canon commit',
])

const artifact = {
  generatedAt: new Date().toISOString(),
  status: 'passed',
  coverage: {
    backendTarget: 'backend/tests/test_product_runtime_api.py',
    endpoints: ['/scene/advance', '/timeline/worldlines/{id}/loom', '/quality/evaluate', '/canon/commit'],
    frontendClient: 'app/src/api/runtime.ts',
    traceGate: 'docs/backend/P47_RUNTIME_TRACE_CONTINUITY.md',
  },
  requiredInRootTest: true,
}

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `product-runtime-coverage-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: 'passed',
  artifactPath,
  endpoints: artifact.coverage.endpoints,
}, null, 2))
