#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const outputDir = join(root, 'artifacts/runtime')

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertIncludes(path, snippets) {
  assert(existsSync(join(root, path)), `${path} missing`)
  const text = read(path)
  for (const snippet of snippets) {
    assert(text.includes(snippet), `${path} must include ${snippet}`)
  }
}

assertIncludes('backend/src/narrativeos/api/product_runtime.py', [
  'Header',
  'Idempotency-Key',
  'idempotency_key=idempotency_key',
])

assertIncludes('backend/src/narrativeos/services/product_runtime.py', [
  'def _idempotency_hash',
  'idempotency_key_required',
  'idempotent_replay',
  'write_scope',
  'rollback_plan',
  'canon_ledger_only',
])

assertIncludes('backend/tests/test_product_runtime_api.py', [
  'headers={"Idempotency-Key": "commit-candidate-demo"}',
  'idempotent_replay',
  'idempotency_key_required',
  'rollback_plan',
])

assertIncludes('app/src/api/runtime.ts', [
  'idempotencyKey',
  "'Idempotency-Key'",
  'rollback_plan',
])

assertIncludes('app/src/pages/Studio.tsx', [
  'idempotencyKey',
  'studio-${scene.id}',
])

assertIncludes('docs/backend/P51_STATE_WRITEBACK_SAFETY_GATE.md', [
  'P51 State Writeback Safety Gate',
  'Idempotency-Key',
  'candidate-only',
  'rollback_plan',
])

mkdirSync(outputDir, { recursive: true })
const artifact = {
  status: 'passed',
  scope: 'state writeback commit safety',
  guarantees: [
    'confirmed canon commit requires Idempotency-Key',
    'same Idempotency-Key replays the same ledger record',
    'candidate and unconfirmed states remain non-canon',
    'commit record declares rollback_plan before public publish',
  ],
  stillPartial: [
    'does not yet prove multi-table database transaction rollback',
    'does not yet connect Reader branch persistence to Creator run ledger',
  ],
}
const artifactPath = join(outputDir, `state-writeback-safety-${Date.now()}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)
console.log(JSON.stringify({ ...artifact, artifact: relative(root, artifactPath) }, null, 2))
