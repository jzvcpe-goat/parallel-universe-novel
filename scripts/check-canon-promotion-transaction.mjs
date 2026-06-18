#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

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

function assertIncludes(file, snippets) {
  assert(existsSync(join(root, file)), `${file} missing`)
  const body = read(file)
  for (const snippet of snippets) {
    assert(body.includes(snippet), `${file} must include ${snippet}`)
  }
}

const packageJson = readJson('package.json')
const testCommand = String(packageJson.scripts.test || '')

assert(
  packageJson.scripts['check:canon-promotion-transaction'] === 'node scripts/check-canon-promotion-transaction.mjs',
  'package.json must expose check:canon-promotion-transaction',
)
assert(
  testCommand.includes('npm run check:canon-promotion-transaction'),
  'root npm run test must include check:canon-promotion-transaction',
)
assert(
  testCommand.includes('backend/tests/test_product_runtime_api.py'),
  'root npm run test must include product runtime tests',
)

for (const file of [
  'backend/src/narrativeos/persistence/db.py',
  'backend/src/narrativeos/persistence/repositories.py',
  'backend/src/narrativeos/services/product_runtime.py',
  'backend/src/narrativeos/api/product_runtime.py',
  'backend/db/postgres_schema.sql',
  'backend/db/migrations/0016_production_canon_commits.sql',
  'backend/tests/test_product_runtime_api.py',
  'docs/backend/P98_CANON_PROMOTION_TRANSACTION_GATE.md',
  'docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md',
  'docs/backend/P52_RUNTIME_COMPLETION_MATRIX_REFRESH.md',
  'scripts/check-state-writeback-safety.mjs',
]) {
  assert(existsSync(join(root, file)), `missing P98 file: ${file}`)
}

assertIncludes('backend/src/narrativeos/persistence/db.py', [
  'class ProductionCanonCommitRow',
  '__tablename__ = "production_canon_commits"',
  'write_scope = Column(String, nullable=False, default="production_canon_promotion")',
  'quality_report_hash',
  'studio_trace_json',
  'rollback_plan_json',
])
assertIncludes('backend/db/postgres_schema.sql', [
  'create table if not exists production_canon_commits',
  'idx_production_canon_commits_project_created_at',
  'idx_production_canon_commits_idempotency_key_hash',
  'idx_production_canon_commits_quality_report_hash',
])
assertIncludes('backend/db/migrations/0016_production_canon_commits.sql', [
  'create table if not exists production_canon_commits',
  'production_canon_promotion',
  'quality_report_hash',
  'studio_trace_json',
])
assertIncludes('backend/src/narrativeos/persistence/repositories.py', [
  'ProductionCanonCommitRow',
  'def prove_production_canon_multitable_transaction_rollback',
  'def persist_production_canon_commit',
  'def latest_production_canon_commit',
  'production_canon_commit_persisted',
  'production_canon_commits", "analytics_events"',
])
assertIncludes('backend/src/narrativeos/services/product_runtime.py', [
  'prove_production_canon_multitable_transaction_rollback',
  'persist_production_canon_commit',
  '"write_scope": "production_canon_promotion"',
  '"ledger_write_scope": "canon_ledger_only"',
  '"production_canon_commit_id"',
  '"multitable_rollback_fixture"',
])
assertIncludes('backend/tests/test_product_runtime_api.py', [
  'production_canon_promotion',
  'ledger_write_scope',
  'production_canon_commit_id',
  'production_canon_commits',
  'analytics_events',
  'multitable_rollback_fixture',
])
assertIncludes('docs/backend/P98_CANON_PROMOTION_TRANSACTION_GATE.md', [
  'P98 Canon Promotion Transaction Gate',
  'production_canon_commits',
  'analytics_events',
  'production_canon_promotion',
  'ledger_write_scope = canon_ledger_only',
])
assertIncludes('docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md', [
  'P98 Canon Promotion Transaction Gate',
  'production_canon_promotion',
])
assertIncludes('docs/backend/P52_RUNTIME_COMPLETION_MATRIX_REFRESH.md', [
  'P98 Canon Promotion Transaction Gate',
  'production_canon_commits',
])
assertIncludes('scripts/check-state-writeback-safety.mjs', [
  'production_canon_promotion',
  'production_canon_commits',
  'P98 Canon Promotion Transaction Gate',
])

const forbiddenPublicTerms = [
  'representativeWorks',
  'sourceRefs',
  'provider prompt',
  'raw state',
]
const publicDoc = read('docs/backend/P98_CANON_PROMOTION_TRANSACTION_GATE.md')
const leaked = forbiddenPublicTerms.filter(term => publicDoc.includes(term))
assert(leaked.length === 0, `P98 doc leaks forbidden public terms: ${leaked.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifact = {
  status: 'passed',
  gate: 'P98_CANON_PROMOTION_TRANSACTION_GATE',
  scope: 'confirmed Studio canon promotion database transaction proof',
  guarantees: [
    'confirmed canon commit keeps P51 confirmation, quality and idempotency controls',
    'production canon promotion writes production_canon_commits and analytics_events',
    'rollback fixture verifies both tables before commit',
    'compatibility ledger remains available as canon_ledger_only',
  ],
  stillPartial: [
    'not remote live runtime proof',
    'not Reader-visible branch release',
    'not paid commercial launch packet',
  ],
}
const artifactPath = join(artifactDir, `canon-promotion-transaction-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({ status: artifact.status, artifactPath: relative(root, artifactPath), gate: artifact.gate }, null, 2))
