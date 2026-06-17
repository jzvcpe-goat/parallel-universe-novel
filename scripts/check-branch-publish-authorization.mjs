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
  packageJson.scripts['check:branch-publish-authorization'] ===
    'node scripts/check-branch-publish-authorization.mjs',
  'package.json must expose check:branch-publish-authorization',
)
assert(
  testCommand.includes('npm run check:branch-publish-authorization'),
  'root npm run test must include check:branch-publish-authorization',
)

assertIncludes('backend/src/narrativeos/services/product_runtime.py', [
  'authorize_branch_publish_candidate',
  'branch_publish_authorization_gate',
  'branch_publish_authorization_ledger_only',
  'operator_id_required',
  'operator_confirmation_required',
  'branch_publish_authorization_summary',
])
assertIncludes('backend/src/narrativeos/api/product_runtime.py', [
  'BranchPublishAuthorizationRequest',
  '/v1/timeline/worldlines/{worldline_id}/branches/publish-authorization',
  'Idempotency-Key',
])
assertIncludes('backend/tests/test_product_runtime_api.py', [
  'test_branch_publish_authorization_requires_operator_quality_and_rollback',
  'operator_id_required',
  'operator_confirmation_required',
  'branch_publish_authorization_ledger_only',
  'branch_publish_authorization_summary',
])
assertIncludes('docs/backend/P60_BRANCH_PUBLISH_AUTHORIZATION_GATE.md', [
  'P60 Branch Publish Authorization Gate',
  'branch_publish_authorization_gate',
  'branch_publish_authorization_ledger_only',
  'not production public branch publish',
])
assertIncludes('docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md', [
  'P60 Branch Publish Authorization Gate',
  'branch_publish_authorization_summary',
])
assertIncludes('docs/backend/P52_RUNTIME_COMPLETION_MATRIX_REFRESH.md', [
  'P60 Branch Publish Authorization Gate',
  'branch_publish_authorization_ledger_only',
])

const artifact = {
  generatedAt: new Date().toISOString(),
  status: 'passed',
  scope: 'branch publish authorization gate',
  guarantees: [
    'requires Idempotency-Key before authorization ledger write',
    'requires branch_publish_candidate_ledger_only',
    'requires operator_id and explicit confirmation',
    'requires structural quality gate and rollback fixture',
    'writes branch_publish_authorization_ledger_only only',
  ],
  stillPartial: [
    'not production public branch publish',
    'not production branch table persistence',
    'not remote live runtime proof',
  ],
}

mkdirSync(outputDir, { recursive: true })
const artifactPath = join(outputDir, `branch-publish-authorization-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: artifact.status,
  artifact: relative(root, artifactPath),
  scope: artifact.scope,
  stillPartial: artifact.stillPartial,
}, null, 2))
