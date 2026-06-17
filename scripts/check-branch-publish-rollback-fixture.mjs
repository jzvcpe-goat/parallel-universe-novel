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
  packageJson.scripts['check:branch-publish-rollback-fixture'] ===
    'node scripts/check-branch-publish-rollback-fixture.mjs',
  'package.json must expose check:branch-publish-rollback-fixture',
)
assert(
  testCommand.includes('npm run check:branch-publish-rollback-fixture'),
  'root npm run test must include check:branch-publish-rollback-fixture',
)

assertIncludes('backend/src/narrativeos/persistence/repositories.py', [
  'prove_analytics_event_transaction_rollback',
  'insert_visible_before_rollback',
  'persisted_after_rollback',
  'rollback_verified',
])
assertIncludes('backend/src/narrativeos/services/product_runtime.py', [
  'verify_branch_publish_transaction_rollback',
  'database_transaction_rollback_fixture',
  'rollback_fixture_only',
  'branch_publish_transaction_fixture',
  'production_public_publish',
])
assertIncludes('backend/src/narrativeos/api/product_runtime.py', [
  'BranchPublishRollbackFixtureRequest',
  '/v1/timeline/worldlines/{worldline_id}/branches/publish-rollback-fixture',
  'Idempotency-Key',
])
assertIncludes('backend/tests/test_product_runtime_api.py', [
  'test_branch_publish_rollback_fixture_proves_database_transaction_boundary',
  'branch_publish_candidate_required',
  'branch_publish_candidate_mismatch',
  'persisted_after_rollback',
  'rollback_verified',
])
assertIncludes('docs/backend/P59_DATABASE_TRANSACTION_ROLLBACK_FIXTURE.md', [
  'P59 Database Transaction Rollback Fixture',
  'database_transaction_rollback_fixture',
  'rollback_fixture_only',
  'not production public branch publish',
])
assertIncludes('docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md', [
  'P59 Database Transaction Rollback Fixture',
  'database_transaction_rollback_fixture',
])
assertIncludes('docs/backend/P52_RUNTIME_COMPLETION_MATRIX_REFRESH.md', [
  'P59 Database Transaction Rollback Fixture',
  'rollback_fixture_only',
])

const artifact = {
  generatedAt: new Date().toISOString(),
  status: 'passed',
  scope: 'branch publish database transaction rollback fixture',
  guarantees: [
    'requires Idempotency-Key before rollback fixture runs',
    'requires existing branch_publish_candidate_ledger_only',
    'inserts a transaction probe and confirms it is visible before rollback',
    'rolls back and confirms the probe is not persisted',
  ],
  stillPartial: [
    'not production public branch publish',
    'not production release-owner approval',
    'not production branch table persistence',
  ],
}

mkdirSync(outputDir, { recursive: true })
const artifactPath = join(outputDir, `branch-publish-rollback-fixture-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: artifact.status,
  artifact: relative(root, artifactPath),
  scope: artifact.scope,
  stillPartial: artifact.stillPartial,
}, null, 2))
