#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const gate = 'P166_NARRATIVE_OKF_RUNTIME_CONSUMPTION'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function read(relPath) {
  return readFileSync(join(root, relPath), 'utf8')
}

function readJson(relPath) {
  return JSON.parse(read(relPath))
}

function scanForbidden(label, text) {
  const forbidden = [
    /《[^》]+》/,
    /代表作品[:：]\s*\S+/,
    /sourceRefs\s*[:=]\s*\[/,
    /source_refs\s*[:=]\s*\[/,
    /profile\.id/,
    /kernel\.id/,
    /sourceAuthority/,
    /source_authority/,
    /provider prompt/i,
    /system prompt/i,
    /DATABASE_URL\s*[:=]\s*(?!<)/i,
    /postgres(?:ql)?:\/\/[^<\s`]+/i,
    /SERVICE_ROLE_KEY/i,
    /SUPABASE_SECRET_KEY/i,
    /SUPABASE_WRITER_PASSWORD\s*[:=]\s*(?!<)/i,
    /sk-[A-Za-z0-9_-]{10,}/,
    /eyJ[A-Za-z0-9_-]{20,}/,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => `${label}: ${String(pattern)}`)
}

const packageJson = readJson('package.json')
const testScript = String(packageJson.scripts.test || '')
assert(
  packageJson.scripts['check:narrative-okf-runtime-consumption'] === 'node scripts/check-narrative-okf-runtime-consumption.mjs',
  'package.json must expose check:narrative-okf-runtime-consumption',
)
assert(
  testScript.includes('npm run check:narrative-okf-knowledge-layer && npm run check:narrative-okf-runtime-consumption && npm run check:okf-runtime-image-context && npm run check:runtime-artifact-contract'),
  'root npm run test must run P166 after P165 and before runtime artifact contract',
)

const requiredFiles = [
  'docs/backend/P166_NARRATIVE_OKF_RUNTIME_CONSUMPTION.md',
  'docs/backend/P167_OKF_RUNTIME_IMAGE_CONTEXT.md',
  'packages/agent-runtime/src/okf.ts',
  'packages/agent-runtime/src/workflows.ts',
  'packages/agent-runtime/src/workflows.test.ts',
  'packages/agent-runtime/src/types.ts',
]
for (const relPath of requiredFiles) {
  assert(existsSync(join(root, relPath)), `missing required P166 file: ${relPath}`)
}

const manifest = readJson('docs/baseline/RELEASE_SYNC_MANIFEST.json')
const syncAsIs = new Set(manifest.syncAsIs)
for (const relPath of [
  'docs/backend/P166_NARRATIVE_OKF_RUNTIME_CONSUMPTION.md',
  'docs/backend/P167_OKF_RUNTIME_IMAGE_CONTEXT.md',
  'packages/agent-runtime/src/okf.ts',
  'scripts/check-narrative-okf-runtime-consumption.mjs',
  'scripts/check-okf-runtime-image-context.mjs',
]) {
  assert(syncAsIs.has(relPath), `release sync manifest must include ${relPath}`)
}

const workflowSource = read('packages/agent-runtime/src/workflows.ts')
const typeSource = read('packages/agent-runtime/src/types.ts')
const testSource = read('packages/agent-runtime/src/workflows.test.ts')
assert(workflowSource.includes("import { narrativeOkfRuntimeSummary } from './okf.js'"), 'workflows must import OKF runtime summary')
assert(workflowSource.includes("okfKnowledge: 'rule_engine'"), 'workflow source labels must include okfKnowledge as rule_engine')
assert(workflowSource.includes("publicProjection: 'hidden_from_public_projection'"), 'workflow must mark OKF knowledge hidden from public projection')
assert(typeSource.includes('okfKnowledge:'), 'SocraticCreateOutput must include internal okfKnowledge')
assert(testSource.includes('agent runtime consumes OKF cards as an internal read-only knowledge layer'), 'agent tests must cover OKF runtime consumption')
assert(testSource.includes("!('okfKnowledge' in projected)"), 'agent tests must assert public projection hides OKF knowledge')

execFileSync('npm', ['--workspace', '@narrativeos/agent-runtime', 'run', 'build'], {
  cwd: root,
  stdio: 'inherit',
  timeout: 120000,
})

const okfModule = await import(pathToFileURL(join(root, 'packages/agent-runtime/dist/src/okf.js')).href)
const workflowModule = await import(pathToFileURL(join(root, 'packages/agent-runtime/dist/src/workflows.js')).href)

const cards = okfModule.loadNarrativeOkfCards()
const summary = okfModule.narrativeOkfRuntimeSummary
assert(cards.length === 7, 'runtime OKF loader must read seven cards')
assert(summary.cardCount === cards.length, 'runtime OKF summary cardCount mismatch')
assert(summary.representativeWorkNames === 'encrypted_vault_only', 'runtime OKF summary must keep representative work names encrypted only')
assert(summary.publicProjection === 'redacted_story_guidance_only', 'runtime OKF summary must keep public projection redacted')

const internalOutput = await workflowModule.socraticCreateWorkflow({
  seed: '现代悬疑旧案，主角收到一份矛盾证据。',
  genre: '现代悬疑',
}, { preferToolBridge: false })
assert(internalOutput.okfKnowledge?.cardIds?.length === 7, 'socratic workflow must carry internal OKF card ids')
assert(internalOutput.okfKnowledge?.publicProjection === 'hidden_from_public_projection', 'workflow OKF knowledge must be hidden from public projection')
assert(internalOutput.okfKnowledge?.representativeWorkNames === 'encrypted_vault_only', 'workflow OKF knowledge must preserve encrypted representative work boundary')
assert(internalOutput.sourceLabels?.okfKnowledge === 'rule_engine', 'workflow source labels must classify OKF knowledge as rule_engine')

const publicProjection = workflowModule.projectPublicSocraticCreateOutput(internalOutput)
const publicText = JSON.stringify(publicProjection)
assert(!Object.hasOwn(publicProjection, 'okfKnowledge'), 'public projection must not expose okfKnowledge')
assert(!Object.hasOwn(publicProjection, 'narrativeOkf'), 'public projection must not expose narrativeOkf')
const publicLeaks = scanForbidden('public projection', publicText)
assert(publicLeaks.length === 0, `public projection leaked internal OKF/private terms: ${publicLeaks.join(', ')}`)

const runtimeMetaText = JSON.stringify(workflowModule.agentRuntimeMeta.narrativeOkf)
assert(workflowModule.agentRuntimeMeta.narrativeOkf.cardCount === 7, 'agent runtime meta must expose only safe OKF summary count')
assert(!runtimeMetaText.includes('body'), 'agent runtime meta must not expose OKF card bodies')
assert(!runtimeMetaText.includes('sourceAuthority'), 'agent runtime meta must not expose source authority paths')
assert(!runtimeMetaText.includes('source_authority'), 'agent runtime meta must not expose source authority keys')

const docText = read('docs/backend/P166_NARRATIVE_OKF_RUNTIME_CONSUMPTION.md')
assert(docText.includes('check:narrative-okf-runtime-consumption'), 'P166 doc must include the check command')
assert(docText.includes('FastAPI remains the business fact owner'), 'P166 doc must preserve FastAPI sovereignty')
assert(read('docs/design-system/DEVELOPMENT_NOTES.md').includes('P166 Narrative OKF Runtime Consumption'), 'development notes must record P166')

mkdirSync(artifactDir, { recursive: true })
const result = {
  version: 1,
  gate,
  status: 'passed',
  generatedAt: new Date().toISOString(),
  checkedCardCount: cards.length,
  workflowCarriesInternalOkfKnowledge: true,
  publicProjectionHidesOkfKnowledge: true,
  runtimeMetaExposesOnlySafeSummary: true,
  boundary: {
    fastApiBusinessFactOwner: true,
    rewritesRuntimeRules: false,
    writesCanon: false,
    exposesRepresentativeWorkNames: false,
    exposesSourceAuthorityToPublicProjection: false,
    deploysRemoteServices: false,
  },
}
const artifactPath = join(artifactDir, `narrative-okf-runtime-consumption-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(result, null, 2)}\n`)

console.log(JSON.stringify({
  status: result.status,
  gate,
  checkedCardCount: cards.length,
  artifactPath: relative(root, artifactPath),
}, null, 2))
