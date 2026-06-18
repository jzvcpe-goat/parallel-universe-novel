#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

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

function checkPythonDeps(deps) {
  const python = process.env.PYTHON_BIN || 'python3'
  const code = `
import importlib.util, json
deps = ${JSON.stringify(deps)}
missing = [name for name in deps if importlib.util.find_spec(name) is None]
print(json.dumps({"python": ${JSON.stringify(python)}, "missing": missing}))
`
  const result = spawnSync(python, ['-c', code], {
    cwd: root,
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    return {
      python,
      missing: deps,
      error: (result.stderr || result.stdout || 'python_dependency_probe_failed').trim(),
    }
  }
  try {
    return JSON.parse(result.stdout.trim())
  } catch {
    return {
      python,
      missing: deps,
      error: 'python_dependency_probe_unparseable',
      raw: result.stdout,
    }
  }
}

const packageJson = readJson('package.json')
const testCommand = String(packageJson.scripts?.test || '')
const strictPromotionSuite = [
  'backend/tests/test_learned_promotion_workflow.py',
  'backend/tests/test_learned_reranker_promotion_workflow.py',
  'backend/tests/test_learned_rollout.py',
  'backend/tests/test_learned_training_automation.py',
  'backend/tests/test_learned_assisted_gate.py',
  'backend/tests/test_learned_assisted_rerank.py',
]

assert(
  packageJson.scripts?.['check:learned-eval-strict-suite-readiness'] ===
    'node scripts/check-learned-eval-strict-suite-readiness.mjs',
  'package.json must expose check:learned-eval-strict-suite-readiness',
)
assert(
  testCommand.includes('npm run check:learned-eval-strict-suite-readiness'),
  'root npm run test must include check:learned-eval-strict-suite-readiness',
)
for (const testFile of strictPromotionSuite) {
  assert(existsSync(join(root, testFile)), `strict promotion suite file missing: ${testFile}`)
}
assert(
  !testCommand.includes('backend/tests/test_learned_rollout.py') &&
    !testCommand.includes('backend/tests/test_learned_training_automation.py') &&
    !testCommand.includes('backend/tests/test_learned_assisted_gate.py') &&
    !testCommand.includes('backend/tests/test_learned_assisted_rerank.py'),
  'root npm run test must not directly execute strict learned promotion suite files',
)

const docs = [
  'docs/backend/P101_LEARNED_EVAL_OPTIONAL_DEPENDENCY_BOUNDARY.md',
  'docs/backend/P103_LEARNED_EVAL_PROMOTION_WORKFLOW_GATE.md',
  'docs/backend/P104_LEARNED_EVAL_STRICT_SUITE_READINESS.md',
]
for (const doc of docs) {
  assert(existsSync(join(root, doc)), `${doc} must exist`)
}
assert(read('docs/backend/P104_LEARNED_EVAL_STRICT_SUITE_READINESS.md').includes('blocked_optional_ml_dependencies'), 'P104 doc must name blocked_optional_ml_dependencies')
assert(read('docs/backend/P103_LEARNED_EVAL_PROMOTION_WORKFLOW_GATE.md').includes('Optional strict promotion suite'), 'P103 doc must keep strict suite as optional')
assert(read('docs/backend/P101_LEARNED_EVAL_OPTIONAL_DEPENDENCY_BOUNDARY.md').includes('joblib'), 'P101 doc must keep optional joblib boundary')

const dependencyProbe = checkPythonDeps(['joblib', 'sklearn', 'scipy'])
const missingDeps = Array.isArray(dependencyProbe.missing) ? dependencyProbe.missing : ['joblib', 'sklearn', 'scipy']
const status = missingDeps.length === 0 ? 'ready' : 'blocked_optional_ml_dependencies'
const strictCommand = [
  'PYTHON_BIN=/path/to/python',
  'node scripts/run-backend-python.mjs -m pytest',
  ...strictPromotionSuite,
].join(' ')

const artifact = {
  generatedAt: new Date().toISOString(),
  status,
  gate: 'P104_LEARNED_EVAL_STRICT_SUITE_READINESS',
  publicReleaseBlocking: false,
  productionGateActivated: false,
  dependencyProbe,
  strictPromotionSuite,
  strictCommand,
  nextAction:
    status === 'ready'
      ? 'Run the strict promotion suite in an intentionally provisioned ML environment.'
      : 'Install or select an intentional ML environment with joblib, scikit-learn and scipy before running the strict promotion suite.',
}

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `learned-eval-strict-suite-readiness-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: artifact.status,
  gate: artifact.gate,
  publicReleaseBlocking: false,
  missingDeps,
  artifactPath,
}, null, 2))
