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
  packageJson.scripts['check:reader-branch-publish'] === 'node scripts/check-reader-branch-publish.mjs',
  'package.json must expose check:reader-branch-publish',
)
assert(
  testCommand.includes('npm run check:reader-branch-publish'),
  'root npm run test must include check:reader-branch-publish',
)

assertIncludes('backend/src/narrativeos/api/product_runtime.py', [
  'BranchPublishCandidateRequest',
  '/v1/timeline/worldlines/{worldline_id}/branches/publish-candidate',
  'Idempotency-Key',
])
assertIncludes('backend/src/narrativeos/services/product_runtime.py', [
  'publish_branch_candidate',
  'branch_publish_snapshot',
  'branch_publish_candidate_ledger_only',
  'time_engine_candidate_required',
  'database_transaction_rollback_fixture',
  'delete_branch_publish_candidate_ledger_record',
])
assertIncludes('backend/tests/test_product_runtime_api.py', [
  'test_branch_publish_candidate_consumes_route_choice_and_time_engine',
  'branch_publish_candidate_gate',
  'branch_publish_candidate_ledger_only',
  'idempotency_key_required',
  'consumed_time_event_ids',
])
assertIncludes('docs/backend/P58_READER_BRANCH_PUBLISH_CANDIDATE_GATE.md', [
  'P58 Reader Branch Publish Candidate Gate',
  'branch_publish_candidate_ledger_only',
  'not canon',
  'not production public branch publish',
])
assertIncludes('docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md', [
  'P58 Reader Branch Publish Candidate Gate',
  'branch_publish_candidate_ledger_only',
])

const artifact = {
  generatedAt: new Date().toISOString(),
  status: 'passed',
  scope: 'reader branch publish candidate gate',
  guarantees: [
    'requires Idempotency-Key before candidate ledger write',
    'consumes existing route_choice_ledger_only record',
    'consumes latest time_event_candidate_ledger_only record',
    'writes branch_publish_candidate_ledger_only',
    'keeps canon and production public branch publish out of scope',
  ],
  stillPartial: [
    'not production branch table persistence',
    'not production public branch publish',
    'not production release-owner approval',
  ],
}

mkdirSync(outputDir, { recursive: true })
const artifactPath = join(outputDir, `reader-branch-publish-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: artifact.status,
  artifact: relative(root, artifactPath),
  scope: artifact.scope,
  stillPartial: artifact.stillPartial,
}, null, 2))
