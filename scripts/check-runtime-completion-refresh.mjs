#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const outputDir = join(root, 'artifacts/runtime')

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const script = read('scripts/check-runtime-engine-completion.mjs')
const doc = read('docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md')

for (const required of [
  'packages/agent-runtime/src/timeEngine.ts',
  'scripts/check-time-engine-contract.mjs',
  'docs/backend/P57_FASTAPI_TIME_ENGINE_SERVICE.md',
  'scripts/check-state-writeback-safety.mjs',
  'scripts/check-reader-branch-trace.mjs',
  'scripts/check-reader-branch-publish.mjs',
  'scripts/check-branch-publish-rollback-fixture.mjs',
  'scripts/check-branch-publish-authorization.mjs',
  'scripts/check-branch-commit-draft.mjs',
  'scripts/check-production-branch-commit.mjs',
  'scripts/check-public-branch-publish.mjs',
  'scripts/check-studio-canon-trace.mjs',
  'docs/backend/P51_STATE_WRITEBACK_SAFETY_GATE.md',
  'docs/backend/P53_READER_BRANCH_TRACE_GATE.md',
  'docs/backend/P58_READER_BRANCH_PUBLISH_CANDIDATE_GATE.md',
  'docs/backend/P59_DATABASE_TRANSACTION_ROLLBACK_FIXTURE.md',
  'docs/backend/P60_BRANCH_PUBLISH_AUTHORIZATION_GATE.md',
  'docs/backend/P61_BRANCH_COMMIT_DRAFT_GATE.md',
  'docs/backend/P62_PRODUCTION_BRANCH_COMMIT_GATE.md',
  'docs/backend/P63_PRODUCTION_PUBLIC_PUBLISH_GATE.md',
  'docs/backend/P56_STUDIO_CANON_TRACE_GATE.md',
  'time_event_candidate_ledger_only',
  'branch_publish_candidate_ledger_only',
  'database_transaction_rollback_fixture',
  'rollback_fixture_only',
  'branch_publish_authorization_ledger_only',
  'branch_commit_draft_ledger_only',
  'production_branch_table_private',
  'production_branch_commit_summary',
  'reader_visible_branch_release',
  'public_branch_release_summary',
  'fastapi_durable_time_engine',
  'idempotent_replay',
  'rollback_plan',
  'studio_trace',
  'quality_report_hash',
  'route_choice_ledger_only',
  'remote live runtime trace',
  'Production TimeEngine telemetry fitting',
]) {
  assert(script.includes(required), `runtime completion script must include ${required}`)
}

for (const required of [
  'deterministic TimeEngine',
  'FastAPI TimeEngine candidate ledger',
  'idempotent canon ledger',
  'check:state-writeback-safety',
  'P52 Runtime Completion Matrix Refresh',
  'P57 FastAPI TimeEngine Service',
  'P58 Reader Branch Publish Candidate Gate',
  'P59 Database Transaction Rollback Fixture',
  'P60 Branch Publish Authorization Gate',
  'P61 Branch Commit Draft Gate',
  'P62 Production Branch Commit Gate',
  'P63 Production Public Publish Gate',
  'P53 Reader Branch Trace Gate',
  'P56 Studio Canon Trace Gate',
  'branch_writeback_summary',
  'branch_publish_summary',
  'production_branch_commit_summary',
  'public_branch_release_summary',
  'studio_trace',
  'quality_report_hash',
]) {
  assert(doc.includes(required), `P45 audit doc must include refreshed phrase: ${required}`)
}

for (const stale of [
  'Non-homogeneous Poisson and Hawkes simulation are not yet a durable backend engine.',
  'not yet a durable backend time service',
  'Durable FastAPI TimeEngine and fitted event-density for Reader branch publish are not yet proven.',
  'Reader branch publish candidate gate not connected to TimeEngine candidate events.',
  'Database transaction rollback fixture not proven after branch publish candidate.',
  'Branch publish operator authorization not proven after rollback fixture.',
  'Branch commit draft not proven after authorization.',
  'Canon/branch commit and rollback are not proven.',
  'Canon publishing is not yet gated by author confirmation plus quality brake.',
]) {
  assert(!doc.includes(stale), `P45 audit doc still contains stale gap: ${stale}`)
}

mkdirSync(outputDir, { recursive: true })
const artifact = {
  status: 'passed',
  scope: 'runtime completion matrix refresh',
  refreshedBy: [
    'P49 Time Engine Contract',
    'P51 State Writeback Safety Gate',
    'P55 WorldInstance Writeback Candidate Gate',
    'P56 Studio Canon Trace Gate',
    'P57 FastAPI TimeEngine Service',
    'P58 Reader Branch Publish Candidate Gate',
    'P59 Database Transaction Rollback Fixture',
    'P60 Branch Publish Authorization Gate',
    'P61 Branch Commit Draft Gate',
    'P62 Production Branch Commit Gate',
    'P63 Production Public Publish Gate',
  ],
  remainingGaps: [
    'remote live runtime trace',
    'TimeEngine production telemetry fitting',
  ],
}
const artifactPath = join(outputDir, `runtime-completion-refresh-${Date.now()}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)
console.log(JSON.stringify({ ...artifact, artifact: relative(root, artifactPath) }, null, 2))
