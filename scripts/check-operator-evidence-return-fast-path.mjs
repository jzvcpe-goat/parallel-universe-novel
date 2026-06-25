#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const gate = 'P168_OPERATOR_EVIDENCE_RETURN_FAST_PATH'

const orderedPrepareNeedles = [
  "id: 'p156-local-secret-guard'",
  "script: 'check:edge-only-data-api-local-secret-guard'",
  'REQUIRE_EDGE_ONLY_DATA_API_LOCAL_SECRET_GUARD_READY',
  "id: 'p140-intent-prepare'",
  "script: 'prepare:runtime-assignment-intent'",
  'RUNTIME_ASSIGNMENT_INTENT_ENV_FILE',
  'deploy/runtime-production/runtime-assignment.intent.env.local',
  'RUNTIME_ASSIGNMENT_INTENT_FORCE',
  "id: 'p138-remote-assignment-prepare'",
  "script: 'remote-assignment:prepare'",
  "id: 'p145-remote-health-check'",
  "script: 'remote-health:check'",
  "id: 'p151-strict-intake'",
  "script: 'prepare:edge-only-data-api-strict-intake'",
  "id: 'p164-current-head-refresh'",
  "script: 'prepare:current-head-operator-evidence'",
]

const docs = [
  'docs/backend/P168_OPERATOR_EVIDENCE_RETURN_FAST_PATH.md',
  'docs/backend/P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE.md',
  'docs/backend/P147_EDGE_ONLY_OPERATOR_EVIDENCE_PACKET.md',
  'docs/backend/P164_CURRENT_HEAD_OPERATOR_EVIDENCE_REFRESH.md',
  'docs/design-system/DEVELOPMENT_NOTES.md',
]

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function read(relPath) {
  return readFileSync(join(root, relPath), 'utf8')
}

function readJson(relPath) {
  return JSON.parse(read(relPath))
}

function assertInOrder(label, text, needles) {
  let cursor = -1
  for (const needle of needles) {
    const index = text.indexOf(needle, cursor + 1)
    assert(index > cursor, `${label} must include ${needle} after the previous required item`)
    cursor = index
  }
}

function scanNoPrivateTerms(label, value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL\s*[:=]\s*(?!<)/i,
    /postgres(?:ql)?:\/\/[^<\s`]+/i,
    /SUPABASE_SERVICE_ROLE/i,
    /SERVICE_ROLE_KEY/i,
    /SUPABASE_SECRET_KEY/i,
    /SUPABASE_WRITER_PASSWORD\s*[:=]\s*(?!<)/i,
    /WRITER_PASSWORD\s*[:=]\s*(?!false|<)/i,
    /OPENAI_API_KEY/i,
    /DEEPSEEK_API_KEY/i,
    /MOONSHOT_API_KEY/i,
    /KIMI_API_KEY/i,
    /ANTHROPIC_API_KEY/i,
    /Authorization:\s*Bearer/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
    /sourceRefs/i,
    /source_refs/i,
    /profile\.id/i,
    /kernel\.id/i,
    /prompt_id/i,
    /prompt_version/i,
    /[a-z0-9-]{12,}\.supabase\.co/i,
    /eyJ[A-Za-z0-9_-]{20,}/,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => `${label}: ${String(pattern)}`)
}

function scanNoSecretValues(label, value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL\s*[:=]\s*(?!<)/i,
    /postgres(?:ql)?:\/\/[^<\s`]+/i,
    /SUPABASE_SERVICE_ROLE/i,
    /SERVICE_ROLE_KEY/i,
    /SUPABASE_SECRET_KEY/i,
    /SUPABASE_WRITER_PASSWORD\s*[:=]\s*(?!<)/i,
    /WRITER_PASSWORD\s*[:=]\s*(?!false|<)/i,
    /OPENAI_API_KEY\s*[:=]\s*(?!<)/i,
    /DEEPSEEK_API_KEY\s*[:=]\s*(?!<)/i,
    /MOONSHOT_API_KEY\s*[:=]\s*(?!<)/i,
    /KIMI_API_KEY\s*[:=]\s*(?!<)/i,
    /ANTHROPIC_API_KEY\s*[:=]\s*(?!<)/i,
    /Authorization:\s*Bearer\s+(?!<token>|<shared-tool-bridge-secret>|dev-local-token)/i,
    /[a-z0-9-]{12,}\.supabase\.co/i,
    /eyJ[A-Za-z0-9_-]{20,}/,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => `${label}: ${String(pattern)}`)
}

const packageJson = readJson('package.json')
const rootTest = String(packageJson.scripts.test || '')

assert(
  packageJson.scripts['prepare:operator-evidence-return-fast-path'] === 'node scripts/prepare-operator-evidence-return-fast-path.mjs',
  'package.json must expose prepare:operator-evidence-return-fast-path',
)
assert(
  packageJson.scripts['check:operator-evidence-return-fast-path'] === 'node scripts/check-operator-evidence-return-fast-path.mjs',
  'package.json must expose check:operator-evidence-return-fast-path',
)
assert(
  !rootTest.includes('prepare:operator-evidence-return-fast-path'),
  'root npm run test must not run the evidence-return fast path because it needs real external Data API evidence',
)
assert(
  rootTest.includes('npm run check:ci-artifact-content-coverage && npm run check:current-head-operator-evidence-refresh && npm run check:operator-evidence-return-fast-path && npm run check:operator-evidence-return-fast-path-artifact && npm run check:operator-operations-continuity && npm run check:operator-operations-continuity-artifact && npm run check:loop-next-goal-ledger'),
  'root npm run test must run the lightweight P168, P174, P170 and P172 checks between P164 and P121',
)

const prepareScript = read('scripts/prepare-operator-evidence-return-fast-path.mjs')
const checkScript = read('scripts/check-operator-evidence-return-fast-path.mjs')
assertInOrder('P168 prepare sequence', prepareScript, orderedPrepareNeedles)
assertInOrder('P168 check sequence', checkScript, orderedPrepareNeedles)
assert(prepareScript.includes('failed_waiting_for_external_evidence'), 'P168 prepare must preserve external-evidence failure semantics')
assert(prepareScript.includes('commandValuesIncluded: false'), 'P168 prepare must never include env values in artifacts')
assert(prepareScript.includes('createsRemoteServices: false'), 'P168 prepare must not create remote services')
assert(prepareScript.includes('setsGitHubVariables: false'), 'P168 prepare must not set GitHub variables or secrets')
assert(prepareScript.includes('storesProviderSecrets: false'), 'P168 prepare must not store provider secrets')
assert(prepareScript.includes('writesCanon: false'), 'P168 prepare must not write canon')

for (const docPath of docs) {
  assert(existsSync(join(root, docPath)), `missing P168 related doc: ${docPath}`)
  const text = read(docPath)
  assert(text.includes('prepare:operator-evidence-return-fast-path'), `${docPath} must mention the P168 fast-path command`)
  assert(text.includes('operator-assignment-evidence-intake'), `${docPath} must keep the selected assignment goal visible`)
  const leaks = scanNoSecretValues(docPath, text)
  assert(leaks.length === 0, `${docPath} contains forbidden private/public-boundary text: ${leaks.join(', ')}`)
}

const manifest = readJson('docs/baseline/RELEASE_SYNC_MANIFEST.json')
const manifestEntries = [
  'docs/backend/P168_OPERATOR_EVIDENCE_RETURN_FAST_PATH.md',
  'scripts/prepare-operator-evidence-return-fast-path.mjs',
  'scripts/check-operator-evidence-return-fast-path.mjs',
]
for (const relPath of manifestEntries) {
  assert(manifest.syncAsIs.includes(relPath), `release sync manifest must include ${relPath}`)
}

const result = {
  version: 1,
  gate,
  generatedAt: new Date().toISOString(),
  status: 'passed',
  prepareCommand: 'npm run prepare:operator-evidence-return-fast-path',
  checkedSequence: orderedPrepareNeedles.filter(needle => needle.startsWith("script: '")),
  boundary: {
    rootTestRunsPrepareCommand: false,
    commandValuesIncluded: false,
    createsRemoteServices: false,
    setsGitHubVariables: false,
    storesProviderSecrets: false,
    writesCanon: false,
  },
}

const leaks = scanNoPrivateTerms('P168 result', result)
assert(leaks.length === 0, `P168 result contains forbidden private/public-boundary text: ${leaks.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(
  artifactDir,
  `operator-evidence-return-fast-path-contract-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
)
writeFileSync(artifactPath, `${JSON.stringify(result, null, 2)}\n`)

console.log(JSON.stringify({
  status: result.status,
  gate,
  checkedSequenceItems: result.checkedSequence.length,
  artifactPath: relative(root, artifactPath),
}, null, 2))
