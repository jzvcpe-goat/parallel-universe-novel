#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
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
  packageJson.scripts['check:world-instance-writeback'] === 'node scripts/check-world-instance-writeback.mjs',
  'package.json must expose check:world-instance-writeback',
)
assert(
  testCommand.includes('npm run check:world-instance-writeback'),
  'root npm run test must include check:world-instance-writeback',
)

assertIncludes('backend/src/narrativeos/services/product_runtime.py', [
  'def _world_instance_patch_candidate',
  'state_before',
  'state_after',
  'world_instance_patch_candidate',
  'world_instance_writeback_summary',
  'world_instance_patch_candidate_only',
  'discard_world_instance_patch_candidate',
])
assertIncludes('backend/tests/test_product_runtime_api.py', [
  'world_instance_writeback',
  'world_instance_patch_candidate',
  'world_instance_patch_candidate_only',
  'relationship_graph',
  'world_instance_writeback_summary',
])
assertIncludes('docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md', [
  'P55 WorldInstance Writeback Candidate Gate',
  'world_instance_patch_candidate_only',
  'branch publish candidate',
  'not production public branch',
])
assertIncludes('docs/backend/P55_WORLD_INSTANCE_WRITEBACK_GATE.md', [
  'WorldInstance relationship and memory writeback',
  'world_instance_patch_candidate',
  'Non-Claims',
])
assertIncludes('docs/design-system/DEVELOPMENT_NOTES.md', [
  'P55 WorldInstance 关系/记忆候选写回',
  'world_instance_patch_candidate_only',
])

const artifact = {
  generatedAt: new Date().toISOString(),
  status: 'passed',
  gate: 'world instance writeback candidate gate',
  writeScope: 'world_instance_patch_candidate_only',
  proves: [
    'reader route choice can produce a WorldInstance patch candidate',
    'snapshot/worldline can read back patch candidate summaries',
    'relationship, promise, fact, and route fingerprint refs remain candidate-only',
  ],
  nonClaims: [
    'not production public branch publish',
    'not canon write',
    'not a multi-table database transaction rollback proof',
    'not remote live runtime proof',
  ],
}

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `world-instance-writeback-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: artifact.status,
  artifactPath,
  writeScope: artifact.writeScope,
}, null, 2))
