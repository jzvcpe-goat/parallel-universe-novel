#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const gate = 'P170_OPERATOR_OPERATIONS_CONTINUITY'

const files = {
  packageJson: 'package.json',
  p134: 'docs/backend/P134_ZERO_COST_READER_EDGE_SYNC_RUNBOOK.md',
  p135: 'docs/backend/P135_ZERO_COST_READER_EDGE_SYNC_GATE.md',
  p136: 'docs/backend/P136_ZERO_COST_READER_EDGE_SYNC_ARTIFACT_ATTESTATION.md',
  p147: 'docs/backend/P147_EDGE_ONLY_OPERATOR_EVIDENCE_PACKET.md',
  p168: 'docs/backend/P168_OPERATOR_EVIDENCE_RETURN_FAST_PATH.md',
  p169: 'docs/backend/P169_OPERATOR_EVIDENCE_RETURN_ARTIFACT_COVERAGE.md',
  p170: 'docs/backend/P170_OPERATOR_OPERATIONS_CONTINUITY.md',
  p172: 'docs/backend/P172_OPERATOR_OPERATIONS_CONTINUITY_ARTIFACT_ATTESTATION.md',
  keepAlive: '.github/workflows/keep-supabase-alive.yml',
  pages: '.github/workflows/pages.yml',
  evidenceCard: 'deploy/runtime-production/edge-only-data-api.evidence-card.example.md',
  zeroCostGate: 'scripts/check-zero-cost-reader-edge-sync.mjs',
  developmentNotes: 'docs/design-system/DEVELOPMENT_NOTES.md',
  releaseSyncManifest: 'docs/baseline/RELEASE_SYNC_MANIFEST.json',
}

function read(relPath) {
  return readFileSync(join(root, relPath), 'utf8')
}

function readJson(relPath) {
  return JSON.parse(read(relPath))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertIncludes(relPath, terms) {
  const body = read(relPath)
  for (const term of terms) assert(body.includes(term), `${relPath} must include ${term}`)
}

function assertInOrder(label, text, needles) {
  let cursor = -1
  for (const needle of needles) {
    const index = text.indexOf(needle, cursor + 1)
    assert(index > cursor, `${label} must include ${needle} after the previous required item`)
    cursor = index
  }
}

function scanNoValues(label, payload) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /postgres(?:ql)?:\/\/[^<\s`]+/i,
    /DATABASE_URL\s*[:=]\s*(?!<)/i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/,
    /Authorization:\s*Bearer\s+(?!<shared-tool-bridge-secret>|<token>|dev-local-token)/i,
    /[a-z0-9-]{12,}\.supabase\.co/i,
    /eyJ[A-Za-z0-9_-]{20,}/,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => `${label}: ${String(pattern)}`)
}

for (const [label, relPath] of Object.entries(files)) {
  assert(existsSync(join(root, relPath)), `missing ${label}: ${relPath}`)
}

const packageJson = readJson(files.packageJson)
const testScript = String(packageJson.scripts.test || '')
assert(
  packageJson.scripts['check:operator-operations-continuity'] === 'node scripts/check-operator-operations-continuity.mjs',
  'package.json must expose check:operator-operations-continuity',
)
assert(
  packageJson.scripts['check:operator-operations-continuity-artifact'] === 'node scripts/check-operator-operations-continuity-artifact.mjs',
  'package.json must expose check:operator-operations-continuity-artifact',
)
assert(
  testScript.includes('npm run check:operator-evidence-return-fast-path && npm run check:operator-evidence-return-fast-path-artifact && npm run check:operator-operations-continuity && npm run check:operator-operations-continuity-artifact && npm run check:loop-next-goal-ledger'),
  'root npm run test must run P174, P170 and P172 after P168 and before P121',
)

assertIncludes(files.p134, [
  'GitHub Actions keep-alive also needs keep-alive',
  'health_probe',
  'roughly 60',
  '.env.local.sync',
  'single point of failure',
  'trusted password manager',
  'encrypted personal',
  'novels_history',
  'supports recovery',
  'not one-click rollback',
  'select *',
  'from public.novels_history',
  'old_content',
])

assertIncludes(files.p135, [
  'health_probe',
  '.env.local.sync',
  'novels_history',
  'manual recovery material',
  'monthly release checks',
  'encrypted/password-manager backup',
])

assertIncludes(files.p136, [
  'manual workflow keep-alive',
  'sync env backup',
  'manual recovery SQL',
  '.env.local.sync',
  'local/operator',
])

assertIncludes(files.keepAlive, [
  'schedule:',
  'workflow_dispatch:',
  'health_probe',
  ".from('health_probe')",
  ".eq('id', 'reader')",
  "configured=false",
])

assertIncludes(files.evidenceCard, [
  '.env.local.sync',
  'health_probe: id=reader,status=ok',
  'strict_command: npm run prepare:edge-only-data-api-strict-intake',
  'local_publishable_key_locations',
  'values_included: false',
])

assertIncludes(files.zeroCostGate, [
  'operationalKeepAliveNeedsKeepAlive',
  'syncEnvSinglePointFailureDocumented',
  'historyManualRecoverySqlDocumented',
  'manualWorkflowKeepAliveRequired',
  'syncEnvBackupRequired',
])

for (const relPath of [files.p147, files.p168, files.p170, files.developmentNotes]) {
  assertIncludes(relPath, [
    'P134',
    'P135',
    'P136',
    'health_probe',
    '.env.local.sync',
    'novels_history',
    'manual',
    'operator-assignment-evidence-intake',
  ])
}

assertIncludes(files.p169, [
  'operator-evidence-return-fast-path',
  'P168',
  'without changing runtime behavior',
])

assertIncludes(files.p170, [
  'P170 Operator Operations Continuity',
  'check:operator-operations-continuity',
  'prepare:operator-evidence-return-fast-path',
  'keep-alive',
  'password manager',
  'encrypted',
  'manual SQL',
  'npm run test',
  'no secrets',
])

assertIncludes(files.p172, [
  'P172 Operator Operations Continuity Artifact Attestation',
  'check:operator-operations-continuity-artifact',
  'P170_OPERATOR_OPERATIONS_CONTINUITY',
  'valuesIncluded',
  'operator-assignment-evidence-intake',
])

const manifest = readJson(files.releaseSyncManifest)
for (const relPath of [
  files.p170,
  files.p172,
  'scripts/check-operator-operations-continuity.mjs',
  'scripts/check-operator-operations-continuity-artifact.mjs',
]) {
  assert(manifest.syncAsIs.includes(relPath), `release sync manifest must include ${relPath}`)
}

assertInOrder('root test operator operations sequence', testScript, [
  'npm run check:ci-artifact-content-coverage',
  'npm run check:current-head-operator-evidence-refresh',
  'npm run check:operator-evidence-return-fast-path',
  'npm run check:operator-operations-continuity',
  'npm run check:operator-operations-continuity-artifact',
  'npm run check:loop-next-goal-ledger',
])

assertInOrder('P170 doc acceptance sequence', read(files.p170), [
  'P134',
  'P135',
  'P136',
  'P147',
  'P168',
])

const result = {
  version: 1,
  gate,
  status: 'passed',
  generatedAt: new Date().toISOString(),
  continuity: {
    keepaliveDirectHealthProbe: true,
    keepaliveManualDispatch: true,
    keepaliveSchedule: true,
    envLocalSyncBackupDocumented: true,
    novelsHistoryManualRestoreDocumented: true,
    p134ToP136Linked: true,
    p147Linked: true,
    p168Linked: true,
    p170InRootTest: true,
  },
  boundary: {
    createsRemoteServices: false,
    writesLocalEnvValues: false,
    uploadsSecrets: false,
    promotesLiveRuntime: false,
    marksOperatorEvidenceComplete: false,
  },
  nextGoal: 'operator-assignment-evidence-intake',
  valuesIncluded: false,
}

const leaks = scanNoValues('P170 result', result)
assert(leaks.length === 0, `P170 result leaked secret-like values: ${leaks.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(
  artifactDir,
  `operator-operations-continuity-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
)
writeFileSync(artifactPath, `${JSON.stringify(result, null, 2)}\n`)

console.log(JSON.stringify({
  status: result.status,
  gate,
  artifactPath: relative(root, artifactPath),
  continuityChecks: Object.keys(result.continuity).length,
}, null, 2))
