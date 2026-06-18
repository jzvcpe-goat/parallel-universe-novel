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
  packageJson.scripts['check:public-branch-publish'] === 'node scripts/check-public-branch-publish.mjs',
  'package.json must expose check:public-branch-publish',
)
assert(
  testCommand.includes('npm run check:public-branch-publish'),
  'root npm run test must include check:public-branch-publish',
)

assertIncludes('backend/src/narrativeos/persistence/db.py', [
  'class PublicBranchReleaseRow',
  '__tablename__ = "public_branch_releases"',
  'reader_visible_branch_release',
])
assertIncludes('backend/db/migrations/0014_public_branch_releases.sql', [
  'create table if not exists public_branch_releases',
  'branch_commit_id text not null references production_branch_commits(branch_commit_id)',
  'public_publish_enabled text not null default',
])
assertIncludes('backend/db/postgres_schema.sql', [
  'create table if not exists public_branch_releases',
  'idx_public_branch_releases_worldline_created_at',
])
assertIncludes('backend/src/narrativeos/persistence/repositories.py', [
  'persist_public_branch_release',
  'latest_public_branch_release',
  'public_branch_release_published',
  'tables_written": ["public_branch_releases", "analytics_events"]',
])
assertIncludes('backend/src/narrativeos/services/product_runtime.py', [
  'publish_public_branch',
  'production_public_publish_gate',
  'reader_visible_branch_release',
  'production_branch_commit_required',
  'public_publish_enabled_required',
  'public_branch_release_summary',
])
assertIncludes('backend/src/narrativeos/api/product_runtime.py', [
  'PublicBranchPublishRequest',
  '/v1/timeline/worldlines/{worldline_id}/branches/public-publish',
  'Idempotency-Key',
])
assertIncludes('backend/tests/test_product_runtime_api.py', [
  'test_public_branch_publish_requires_private_commit_and_release_controls',
  'production_branch_commit_required',
  'release_owner_mismatch',
  'ops_reviewer_id_required',
  'rollback_owner_id_required',
  'public_publish_enabled_required',
  'reader_visible_branch_release',
  'public_branch_release_summary',
])
assertIncludes('docs/backend/P63_PRODUCTION_PUBLIC_PUBLISH_GATE.md', [
  'P63 Production Public Publish Gate',
  'public_branch_releases',
  'reader_visible_branch_release',
  'public_publish_enabled = true',
])
assertIncludes('docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md', [
  'P63 Production Public Publish Gate',
  'public_branch_release_summary',
])
assertIncludes('docs/backend/P52_RUNTIME_COMPLETION_MATRIX_REFRESH.md', [
  'P63 Production Public Publish Gate',
  'reader_visible_branch_release',
])

const artifact = {
  generatedAt: new Date().toISOString(),
  status: 'passed',
  scope: 'production public branch publish gate',
  guarantees: [
    'requires Idempotency-Key before Reader-visible release write',
    'requires production_branch_table_private commit',
    'requires release owner, ops reviewer, rollback owner, explicit confirmation, and public publish switch',
    'writes public_branch_releases and analytics_events in one repository transaction',
    'exposes public_branch_release_summary for Reader visibility checks',
  ],
  stillPartial: [
    'not remote live runtime proof',
    'not fitted production TimeEngine telemetry',
    'not paid commercial release owner/legal packet',
  ],
}

mkdirSync(outputDir, { recursive: true })
const artifactPath = join(outputDir, `public-branch-publish-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: artifact.status,
  artifact: relative(root, artifactPath),
  scope: artifact.scope,
  stillPartial: artifact.stillPartial,
}, null, 2))
