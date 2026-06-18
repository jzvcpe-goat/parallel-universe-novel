#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')

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
const testCommand = String(packageJson.scripts?.test || '')

assert(
  packageJson.scripts?.['check:learned-eval-optional-boundary'] === 'node scripts/check-learned-eval-optional-boundary.mjs',
  'package.json must expose check:learned-eval-optional-boundary',
)
assert(
  testCommand.includes('npm run check:learned-eval-optional-boundary'),
  'root npm run test must include check:learned-eval-optional-boundary',
)
assert(
  !testCommand.includes('backend/tests/test_learned_assisted_gate.py'),
  'root npm run test must not directly require learned assisted gate promotion tests',
)

assertIncludes('backend/tests/test_learned_assisted_gate.py', [
  '_require_optional_ml_deps',
  'pytest.importorskip("joblib"',
  'pytest.importorskip("sklearn"',
  'test_assisted_gate_can_block_publish_only_after_rollout_and_enablement',
])

assertIncludes('docs/backend/P100_AGENT_EVAL_PUBLISH_DECISION_BOUNDARY.md', [
  'outside the required P100 gate',
  'test_learned_assisted_gate.py',
])

assertIncludes('docs/backend/P101_LEARNED_EVAL_OPTIONAL_DEPENDENCY_BOUNDARY.md', [
  'P101 Learned Eval Optional Dependency Boundary',
  'optional learned eval dependency',
  'check:learned-eval-optional-boundary',
])

assertIncludes('docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md', [
  'P101 Learned Eval Optional Dependency Boundary',
  'learned promotion suite',
])

const artifact = {
  generatedAt: new Date().toISOString(),
  status: 'passed',
  gate: 'P101_LEARNED_EVAL_OPTIONAL_DEPENDENCY_BOUNDARY',
  rootTestDirectLearnedPromotion: false,
  optionalDeps: ['joblib', 'sklearn'],
  learnedPromotionSuiteRequired: false,
}

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `learned-eval-optional-boundary-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: 'passed',
  gate: artifact.gate,
  artifactPath,
}, null, 2))
