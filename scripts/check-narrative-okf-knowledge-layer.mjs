#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const gate = 'P165_NARRATIVE_OKF_KNOWLEDGE_LAYER'
const baseDir = 'docs/product/knowledge/narrative-okf'

const cards = [
  'genre-kernel',
  'constraint-profile',
  'creator-socratic-flow',
  'quality-brake',
  'runtime-tool-bridge',
  'public-projection-policy',
  'market-template-refresh',
]

const requiredFrontmatterKeys = [
  'okf_version',
  'kind',
  'id',
  'title',
  'status',
  'visibility',
  'runtime_boundary',
  'source_authority',
  'public_projection',
  'representative_work_names',
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

function parseFrontmatter(relPath) {
  const text = read(relPath)
  const match = text.match(/^---\n([\s\S]*?)\n---\n/)
  assert(match, `${relPath} must start with YAML frontmatter`)
  const frontmatter = {}
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/)
    assert(kv, `${relPath} frontmatter line is not key: value: ${line}`)
    frontmatter[kv[1]] = kv[2].trim()
  }
  return { text, frontmatter }
}

function scanForbidden(relPath, text) {
  const forbidden = [
    /《[^》]+》/,
    /代表作品[:：]\s*\S+/,
    /sourceRefs\s*[:=]\s*\[/,
    /source_refs\s*[:=]\s*\[/,
    /profile\.id/,
    /kernel\.id/,
    /DATABASE_URL\s*[:=]\s*(?!<)/i,
    /postgres(?:ql)?:\/\/[^<\s`]+/i,
    /SUPABASE_SERVICE_ROLE/i,
    /SERVICE_ROLE_KEY/i,
    /SUPABASE_SECRET_KEY/i,
    /SUPABASE_WRITER_PASSWORD\s*[:=]\s*(?!<)/i,
    /sk-[A-Za-z0-9_-]{10,}/,
    /eyJ[A-Za-z0-9_-]{20,}/,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => `${relPath}: ${String(pattern)}`)
}

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:narrative-okf-knowledge-layer'] === 'node scripts/check-narrative-okf-knowledge-layer.mjs',
  'package.json must expose check:narrative-okf-knowledge-layer',
)
assert(
  String(packageJson.scripts.test || '').includes('npm run check:runtime-rule-handshake && npm run check:narrative-okf-knowledge-layer && npm run check:narrative-okf-runtime-consumption && npm run check:okf-runtime-image-context && npm run check:narrative-okf-release-artifacts && npm run check:runtime-artifact-contract'),
  'root npm run test must run P165/P166/P167/P176 between runtime rule handshake and runtime artifact contract',
)

const readmePath = `${baseDir}/README.md`
assert(existsSync(join(root, readmePath)), `missing ${readmePath}`)
const readme = read(readmePath)
for (const id of cards) assert(readme.includes(`${id}.md`), `README must list ${id}.md`)

const manifest = readJson('docs/baseline/RELEASE_SYNC_MANIFEST.json')
const syncAsIs = new Set(manifest.syncAsIs)
const requiredSyncEntries = [
  readmePath,
  'docs/backend/P165_NARRATIVE_OKF_KNOWLEDGE_LAYER.md',
  'scripts/check-narrative-okf-knowledge-layer.mjs',
  ...cards.map(id => `${baseDir}/${id}.md`),
]
for (const entry of requiredSyncEntries) {
  assert(syncAsIs.has(entry), `release sync manifest must include ${entry}`)
}

const runtimeRules = readJson('docs/product/rules/genre-runtime-rules.v1.json')
assert(runtimeRules.documentCore?.runtimeTruth === 'docs/product/rules/genre-runtime-rules.v1.json', 'runtime rule truth must stay document registry based')
assert(runtimeRules.privacy?.representativeWorks === 'encrypted_vault_only', 'runtime rules must keep representative works encrypted only')

const checkedCards = []
for (const id of cards) {
  const relPath = `${baseDir}/${id}.md`
  assert(existsSync(join(root, relPath)), `missing OKF card: ${relPath}`)
  const { text, frontmatter } = parseFrontmatter(relPath)
  for (const key of requiredFrontmatterKeys) {
    assert(Object.hasOwn(frontmatter, key), `${relPath} missing frontmatter key: ${key}`)
  }
  assert(frontmatter.okf_version === '1', `${relPath} okf_version must be 1`)
  assert(frontmatter.kind === 'narrative.knowledge.card', `${relPath} kind must be narrative.knowledge.card`)
  assert(frontmatter.id === id, `${relPath} id must match file name`)
  assert(frontmatter.status === 'active', `${relPath} status must be active`)
  assert(frontmatter.visibility === 'internal_agent_readable', `${relPath} visibility must be internal_agent_readable`)
  assert(frontmatter.public_projection === 'redacted_story_guidance_only', `${relPath} public projection must be redacted story guidance only`)
  assert(frontmatter.representative_work_names === 'encrypted_vault_only', `${relPath} representative work names must stay encrypted only`)
  assert(existsSync(join(root, frontmatter.source_authority)), `${relPath} source_authority must point at an existing file`)
  assert(text.includes('## Agent Use') || text.includes('## Public Surface May Show'), `${relPath} must describe agent or public projection use`)
  const leaks = scanForbidden(relPath, text)
  assert(leaks.length === 0, `${relPath} contains forbidden private/public-boundary text: ${leaks.join(', ')}`)
  checkedCards.push(relPath)
}

const p165Doc = read('docs/backend/P165_NARRATIVE_OKF_KNOWLEDGE_LAYER.md')
assert(p165Doc.includes('check:narrative-okf-knowledge-layer'), 'P165 doc must include the check command')
assert(p165Doc.includes('operator-assignment-evidence-intake') === false, 'P165 should not redefine the operator evidence loop')
assert(read('docs/design-system/DEVELOPMENT_NOTES.md').includes('P165 Narrative OKF Knowledge Layer'), 'development notes must record P165')

mkdirSync(artifactDir, { recursive: true })
const result = {
  version: 1,
  gate,
  status: 'passed',
  generatedAt: new Date().toISOString(),
  checkedCards,
  runtimeTruth: 'docs/product/rules/genre-runtime-rules.v1.json',
  boundary: {
    rewritesRuntimeRules: false,
    exposesRepresentativeWorkNames: false,
    changesPublicProjection: false,
    changesCanonState: false,
    deploysRemoteServices: false,
  },
}
const artifactPath = join(artifactDir, `narrative-okf-knowledge-layer-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(result, null, 2)}\n`)

console.log(JSON.stringify({
  status: result.status,
  gate,
  checkedCardCount: checkedCards.length,
  artifactPath: relative(root, artifactPath),
}, null, 2))
