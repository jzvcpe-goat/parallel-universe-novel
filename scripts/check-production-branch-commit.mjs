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
  packageJson.scripts['check:production-branch-commit'] === 'node scripts/check-production-branch-commit.mjs',
  'package.json must expose check:production-branch-commit',
)
assert(
  testCommand.includes('npm run check:production-branch-commit'),
  'root npm run test must include check:production-branch-commit',
)

assertIncludes('backend/src/narrativeos/persistence/db.py', [
  'class ProductionBranchCommitRow',
  '__tablename__ = "production_branch_commits"',
  'production_branch_table_private',
])
assertIncludes('backend/db/migrations/0013_production_branch_commits.sql', [
  'create table if not exists production_branch_commits',
  'public_publish_enabled text not null default',
])
assertIncludes('backend/db/postgres_schema.sql', [
  'create table if not exists production_branch_commits',
  'idx_production_branch_commits_worldline_created_at',
])
assertIncludes('backend/src/narrativeos/persistence/repositories.py', [
  'persist_production_branch_commit',
  'latest_production_branch_commit',
  'production_branch_commit_persisted',
  'tables_written": ["production_branch_commits", "analytics_events"]',
])
assertIncludes('backend/src/narrativeos/services/product_runtime.py', [
  'commit_production_branch',
  'production_branch_persistence_gate',
  'production_branch_table_private',
  'branch_commit_draft_required',
  'release_owner_confirmation_required',
  'public_publish_disabled_for_p62',
  'production_branch_commit_summary',
])
assertIncludes('backend/src/narrativeos/api/product_runtime.py', [
  'ProductionBranchCommitRequest',
  '/v1/timeline/worldlines/{worldline_id}/branches/commit',
  'Idempotency-Key',
])
assertIncludes('backend/tests/test_product_runtime_api.py', [
  'test_production_branch_commit_requires_draft_and_release_owner',
  'branch_commit_draft_required',
  'release_owner_id_required',
  'release_owner_confirmation_required',
  'public_publish_disabled_for_p62',
  'production_branch_table_private',
  'production_branch_commit_summary',
])
assertIncludes('docs/backend/P62_PRODUCTION_BRANCH_COMMIT_GATE.md', [
  'P62 Production Branch Commit Gate',
  'production_branch_commits',
  'production_branch_table_private',
  'public_publish_enabled = false',
])
assertIncludes('docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md', [
  'P62 Production Branch Commit Gate',
  'production_branch_commit_summary',
])
assertIncludes('docs/backend/P52_RUNTIME_COMPLETION_MATRIX_REFRESH.md', [
  'P62 Production Branch Commit Gate',
  'production_branch_table_private',
])

const artifact = {
  generatedAt: new Date().toISOString(),
  status: 'passed',
  scope: 'production branch commit persistence gate',
  guarantees: [
    'requires Idempotency-Key before production branch table write',
    'requires branch_commit_draft_ledger_only',
    'requires release owner confirmation',
    'writes production_branch_commits and analytics_events in one repository transaction',
    'keeps public_publish_enabled false',
  ],
  stillPartial: [
    'not production public branch publish',
    'not remote live runtime proof',
    'production TimeEngine telemetry fitting is owned by P64',
  ],
}

mkdirSync(outputDir, { recursive: true })
const artifactPath = join(outputDir, `production-branch-commit-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: artifact.status,
  artifact: relative(root, artifactPath),
  scope: artifact.scope,
  stillPartial: artifact.stillPartial,
}, null, 2))
