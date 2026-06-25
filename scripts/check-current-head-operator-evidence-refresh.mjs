#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const gate = 'P164_CURRENT_HEAD_OPERATOR_EVIDENCE_REFRESH'

const expectedScripts = [
  'check:edge-only-data-api-evidence-card',
  'prepare:loop-next-goal-local-tail',
  'check:operator-assignment-loop-command-consistency',
  'check:operator-assignment-loop-command-consistency-artifact',
  'check:operator-assignment-current-head-coherence',
]

const requiredDocs = [
  'docs/backend/P164_CURRENT_HEAD_OPERATOR_EVIDENCE_REFRESH.md',
  'docs/backend/P168_OPERATOR_EVIDENCE_RETURN_FAST_PATH.md',
  'docs/backend/P132_OPERATOR_ASSIGNMENT_CURRENT_HEAD_COHERENCE.md',
  'docs/backend/P137_LOOP_NEXT_GOAL_LOCAL_REHYDRATION.md',
  'docs/backend/P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE.md',
  'docs/backend/P147_EDGE_ONLY_OPERATOR_EVIDENCE_PACKET.md',
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

function scanNoPrivateTerms(label, text) {
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
    /NARRATIVEOS_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/i,
    /MASTRA_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/i,
    /[a-z0-9-]{12,}\.supabase\.co/i,
    /eyJ[A-Za-z0-9_-]{20,}/,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => `${label}: ${String(pattern)}`)
}

const packageJson = readJson('package.json')
const testScript = String(packageJson.scripts.test || '')

assert(
  packageJson.scripts['prepare:current-head-operator-evidence'] === 'node scripts/prepare-current-head-operator-evidence.mjs',
  'package.json must expose prepare:current-head-operator-evidence',
)
assert(
  packageJson.scripts['check:current-head-operator-evidence-refresh'] === 'node scripts/check-current-head-operator-evidence-refresh.mjs',
  'package.json must expose check:current-head-operator-evidence-refresh',
)
assert(
  !testScript.includes('prepare:current-head-operator-evidence'),
  'root npm run test must not run the P164 local/network refresh command',
)
assert(
  testScript.includes('npm run check:current-head-operator-evidence-refresh && npm run check:operator-evidence-return-fast-path && npm run check:operator-evidence-return-fast-path-artifact && npm run check:operator-operations-continuity && npm run check:operator-operations-continuity-artifact && npm run check:loop-next-goal-ledger'),
  'root npm run test must run the lightweight P164, P168, P174, P170 and P172 checks before P121',
)

const prepareScript = read('scripts/prepare-current-head-operator-evidence.mjs')
const checkScript = read('scripts/check-current-head-operator-evidence-refresh.mjs')
const p137PrepareScript = read('scripts/prepare-loop-next-goal-local.mjs')
assertInOrder('P164 prepare sequence', prepareScript, expectedScripts.map(script => `script: '${script}'`))
assertInOrder('P164 check sequence', checkScript, expectedScripts.map(script => `'${script}'`))
assert(p137PrepareScript.includes("'prepare:remote-assignment-local', { REMOTE_ASSIGNMENT_DRAFT_FORCE: 'true' }"), 'P137 prepare must force-refresh the ignored local assignment draft delegated by P164')
assert(prepareScript.includes('writesTrackedFiles: false'), 'P164 prepare artifact must declare no tracked writes')
assert(prepareScript.includes("selectedGoal: 'operator-assignment-evidence-intake'"), 'P164 prepare artifact must keep the selected loop goal explicit')

for (const docPath of requiredDocs) {
  assert(existsSync(join(root, docPath)), `missing P164 related doc: ${docPath}`)
  const text = read(docPath)
  assert(text.includes('prepare:current-head-operator-evidence'), `${docPath} must mention the P164 sequential refresh command`)
  assert(text.includes('operator-assignment-evidence-intake'), `${docPath} must keep the selected assignment goal visible`)
  const leaks = scanNoPrivateTerms(docPath, text)
  assert(leaks.length === 0, `${docPath} contains forbidden private/public-boundary text: ${leaks.join(', ')}`)
}
assertInOrder('P164 doc command order', read('docs/backend/P164_CURRENT_HEAD_OPERATOR_EVIDENCE_REFRESH.md'), expectedScripts.map(script => `npm run ${script}`))

const manifest = readJson('docs/baseline/RELEASE_SYNC_MANIFEST.json')
const requiredManifestEntries = [
  'docs/backend/P164_CURRENT_HEAD_OPERATOR_EVIDENCE_REFRESH.md',
  'scripts/prepare-current-head-operator-evidence.mjs',
  'scripts/check-current-head-operator-evidence-refresh.mjs',
]
for (const relPath of requiredManifestEntries) {
  assert(manifest.syncAsIs.includes(relPath), `release sync manifest must include ${relPath}`)
}

const result = {
  version: 1,
  gate,
  generatedAt: new Date().toISOString(),
  status: 'passed',
  prepareCommand: 'npm run prepare:current-head-operator-evidence',
  checkedScripts: expectedScripts,
  boundary: {
    rootTestRunsLocalRefresh: false,
    valuesIncluded: false,
    createsRemoteServices: false,
    setsGitHubVariables: false,
    storesProviderSecrets: false,
    promotesLiveRuntime: false,
  },
}

const resultLeaks = scanNoPrivateTerms('P164 result', JSON.stringify(result))
assert(resultLeaks.length === 0, `P164 result contains forbidden private/public-boundary text: ${resultLeaks.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `current-head-operator-evidence-refresh-contract-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(result, null, 2)}\n`)

console.log(JSON.stringify({
  status: result.status,
  gate,
  checkedScriptCount: expectedScripts.length,
  artifactPath: relative(root, artifactPath),
}, null, 2))
