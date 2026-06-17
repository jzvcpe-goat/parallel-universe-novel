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
  'scripts/check-state-writeback-safety.mjs',
  'scripts/check-reader-branch-trace.mjs',
  'docs/backend/P51_STATE_WRITEBACK_SAFETY_GATE.md',
  'docs/backend/P53_READER_BRANCH_TRACE_GATE.md',
  'idempotent_replay',
  'rollback_plan',
  'route_choice_ledger_only',
  'Transactional multi-table',
]) {
  assert(script.includes(required), `runtime completion script must include ${required}`)
}

for (const required of [
  'deterministic TimeEngine',
  'idempotent canon ledger',
  'check:state-writeback-safety',
  'P52 Runtime Completion Matrix Refresh',
  'P53 Reader Branch Trace Gate',
  'branch_writeback_summary',
]) {
  assert(doc.includes(required), `P45 audit doc must include refreshed phrase: ${required}`)
}

for (const stale of [
  'Non-homogeneous Poisson and Hawkes simulation are not yet a durable backend engine.',
  'Canon/branch commit and rollback are not proven.',
  'Canon publishing is not yet gated by author confirmation plus quality brake.',
]) {
  assert(!doc.includes(stale), `P45 audit doc still contains stale gap: ${stale}`)
}

mkdirSync(outputDir, { recursive: true })
const artifact = {
  status: 'passed',
  scope: 'runtime completion matrix refresh',
  refreshedBy: ['P49 Time Engine Contract', 'P51 State Writeback Safety Gate', 'P55 WorldInstance Writeback Candidate Gate'],
  remainingGaps: [
    'durable FastAPI TimeEngine service',
    'database transaction rollback',
    'Reader public branch publish and durable multi-table WorldInstance writeback',
    'production operator authorization',
  ],
}
const artifactPath = join(outputDir, `runtime-completion-refresh-${Date.now()}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)
console.log(JSON.stringify({ ...artifact, artifact: relative(root, artifactPath) }, null, 2))
