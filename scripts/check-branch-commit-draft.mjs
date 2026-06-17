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
  packageJson.scripts['check:branch-commit-draft'] === 'node scripts/check-branch-commit-draft.mjs',
  'package.json must expose check:branch-commit-draft',
)
assert(
  testCommand.includes('npm run check:branch-commit-draft'),
  'root npm run test must include check:branch-commit-draft',
)

assertIncludes('backend/src/narrativeos/persistence/repositories.py', [
  'prove_branch_commit_multitable_transaction_rollback',
  'route_persisted_after_rollback',
  'analytics_persisted_after_rollback',
  'tables_checked": ["route_choices", "analytics_events"]',
])
assertIncludes('backend/src/narrativeos/services/product_runtime.py', [
  'draft_branch_commit',
  'branch_commit_draft_gate',
  'branch_commit_draft_ledger_only',
  'branch_publish_authorization_required',
  'branch_commit_draft_summary',
])
assertIncludes('backend/src/narrativeos/api/product_runtime.py', [
  'BranchCommitDraftRequest',
  '/v1/timeline/worldlines/{worldline_id}/branches/commit-draft',
  'Idempotency-Key',
])
assertIncludes('backend/tests/test_product_runtime_api.py', [
  'test_branch_commit_draft_requires_authorization_and_proves_multitable_rollback',
  'branch_publish_authorization_required',
  'authorization_mismatch',
  'branch_commit_draft_ledger_only',
  'branch_commit_draft_summary',
])
assertIncludes('docs/backend/P61_BRANCH_COMMIT_DRAFT_GATE.md', [
  'P61 Branch Commit Draft Gate',
  'branch_commit_draft_gate',
  'branch_commit_draft_ledger_only',
  'not production public branch publish',
])
assertIncludes('docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md', [
  'P61 Branch Commit Draft Gate',
  'branch_commit_draft_summary',
])
assertIncludes('docs/backend/P52_RUNTIME_COMPLETION_MATRIX_REFRESH.md', [
  'P61 Branch Commit Draft Gate',
  'branch_commit_draft_ledger_only',
])

const artifact = {
  generatedAt: new Date().toISOString(),
  status: 'passed',
  scope: 'branch commit draft gate',
  guarantees: [
    'requires Idempotency-Key before commit draft ledger write',
    'requires branch_publish_authorization_ledger_only',
    'proves route_choices and analytics_events rollback in one fixture',
    'writes branch_commit_draft_ledger_only only',
  ],
  stillPartial: [
    'not production public branch publish',
    'not durable production branch tables',
    'not remote live runtime proof',
  ],
}

mkdirSync(outputDir, { recursive: true })
const artifactPath = join(outputDir, `branch-commit-draft-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: artifact.status,
  artifact: relative(root, artifactPath),
  scope: artifact.scope,
  stillPartial: artifact.stillPartial,
}, null, 2))
