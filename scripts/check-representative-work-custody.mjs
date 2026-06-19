#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')
const violations = []

const paths = {
  constraintDoc: 'docs/product/rules/GENRE_CONSTRAINT_RULES.md',
  kernelDoc: 'docs/product/rules/GENRE_KERNEL_RULES.md',
  runtimeRules: 'docs/product/rules/genre-runtime-rules.v1.json',
  publicRefs: 'docs/product/rules/reference-work-public-refs.json',
  encryptedVault: 'docs/product/rules/reference-work-vault.enc.json',
  privacyMatrix: 'docs/product/rules/PRIVACY_BOUNDARY_MATRIX.md',
  referencePrivacyDoc: 'docs/product/rules/REFERENCE_WORK_PRIVACY.md',
  vaultAccessDoc: 'docs/product/rules/REFERENCE_WORK_VAULT_ACCESS.md',
  p80Doc: 'docs/backend/P80_REFERENCE_PRIVACY_ARTIFACT_GATE.md',
  p92Doc: 'docs/backend/P92_PUBLIC_PRIVACY_ARTIFACT_ATTESTATION.md',
  p111Doc: 'docs/backend/P111_REFERENCE_WORK_ENCRYPTION_COMPLETION_GATE.md',
  p127Doc: 'docs/backend/P127_REPRESENTATIVE_WORK_CUSTODY_GATE.md',
  developmentNotes: 'docs/design-system/DEVELOPMENT_NOTES.md',
  pagesWorkflow: '.github/workflows/pages.yml',
  p43Doc: 'docs/backend/P43_CI_ARTIFACT_EVIDENCE_GATE.md',
  p107Doc: 'docs/backend/P107_CI_ARTIFACT_CONTENT_COVERAGE_MATRIX.md',
}

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function assert(condition, message) {
  if (!condition) violations.push(message)
}

function assertExists(rel) {
  assert(existsSync(join(root, rel)), `missing required file: ${rel}`)
}

function assertIncludes(rel, terms) {
  const text = read(rel)
  for (const term of terms) assert(text.includes(term), `${rel} must include ${term}`)
}

function latestArtifact(prefix) {
  if (!existsSync(artifactDir)) return null
  const candidates = readdirSync(artifactDir)
    .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .map(name => join(artifactDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  return candidates[0] || null
}

function sourceRefsFromRuntime(runtimeRules) {
  const refs = []
  for (const section of ['constraintProfiles', 'genreKernels']) {
    for (const item of runtimeRules[section] || []) {
      for (const ref of item.sourceRefs || []) refs.push(String(ref))
    }
  }
  return refs
}

function assertNoPlainWorkMetadata(rel) {
  const text = read(rel)
  const forbidden = [
    { pattern: /《[^》]+》/, label: 'Chinese title marker' },
    { pattern: /\b(workTitle|representativeWorkTitle|authorName|source_evidence|sourceEvidence)\b/, label: 'representative work metadata field' },
    { pattern: /"title"\s*:/, label: 'title JSON field' },
    { pattern: /"author"\s*:/, label: 'author JSON field' },
    { pattern: /plaintext[_ -]?mapping/i, label: 'plaintext mapping marker' },
    { pattern: /decrypted[_ -]?mapping/i, label: 'decrypted mapping marker' },
  ]
  for (const check of forbidden) {
    assert(!check.pattern.test(text), `${rel} must not expose ${check.label}`)
  }
}

function assertOrder(haystack, orderedTerms, label) {
  let cursor = -1
  for (const term of orderedTerms) {
    const index = haystack.indexOf(term)
    assert(index >= 0, `${label} missing ${term}`)
    assert(index > cursor, `${label} must place ${term} after previous custody term`)
    cursor = index
  }
}

function validateLatestArtifact(prefix, expectedContract, label, extra = () => {}) {
  const file = latestArtifact(prefix)
  assert(Boolean(file), `${label} latest artifact is missing`)
  if (!file) return
  const payload = JSON.parse(readFileSync(file, 'utf8'))
  assert(payload.status === 'passed', `${label} latest artifact must be passed`)
  assert(payload.artifactContract === expectedContract, `${label} artifact contract mismatch`)
  const text = JSON.stringify(payload)
  assert(!/《[^》]+》/.test(text), `${label} artifact must not include representative title markers`)
  assert(!/"(workTitle|representativeWorkTitle|authorName)"\s*:/i.test(text), `${label} artifact must not include representative metadata fields`)
  assert(!/"(titles|authors|decryptedMappings|keyValues|representativeNames|sourceRefMappings|providerPayload|vaultMetadata)Included"\s*:\s*true/i.test(text), `${label} artifact redaction flags must stay false`)
  extra(payload, relative(root, file))
}

for (const rel of Object.values(paths)) assertExists(rel)

const packageJson = readJson('package.json')
const rootTest = String(packageJson.scripts?.test || '')
assert(
  packageJson.scripts?.['check:representative-work-custody'] === 'node scripts/check-representative-work-custody.mjs',
  'package.json must expose check:representative-work-custody',
)
assertOrder(rootTest, [
  'npm run scan:reference-privacy',
  'npm run check:reference-work-encryption-completion',
  'npm run check:representative-work-custody',
  'npm run check:public-privacy-artifacts',
], 'root npm run test')

const workflow = read(paths.pagesWorkflow)
assertOrder(workflow, [
  'npm run scan:reference-privacy',
  'PUBLIC_PROJECTION_PRIVACY_SKIP_BUILD=true npm run check:public-projection-privacy',
  'npm run check:reference-work-encryption-completion',
  'npm run check:representative-work-custody',
], 'Pages built privacy scan')
assertIncludes(paths.pagesWorkflow, [
  'Upload reference work encryption completion evidence',
  'reference-work-encryption-completion',
  'artifacts/runtime/reference-work-encryption-completion-*.json',
  'Upload representative work custody evidence',
  'representative-work-custody',
  'artifacts/runtime/representative-work-custody-*.json',
])

for (const rel of [paths.constraintDoc, paths.kernelDoc, paths.runtimeRules, paths.publicRefs]) {
  assertNoPlainWorkMetadata(rel)
}

const publicRefs = readJson(paths.publicRefs)
const publicRefList = Array.isArray(publicRefs.refs) ? publicRefs.refs : []
const publicIds = new Set()
assert(publicRefs.refCount === publicRefList.length, 'public refCount must match refs length')
for (const ref of publicRefList) {
  const keys = Object.keys(ref)
  assert(keys.length === 1 && keys[0] === 'id', 'public refs must expose id only')
  assert(/^rwref_\d{4}$/.test(ref.id || ''), `public ref must be anonymous: ${ref.id || '<missing>'}`)
  publicIds.add(ref.id)
}

const vault = readJson(paths.encryptedVault)
assert(vault.algorithm === 'AES-256-GCM', 'encrypted vault must use AES-256-GCM')
assert(vault.keyEnv === 'REFERENCE_WORK_VAULT_KEY', 'encrypted vault must use REFERENCE_WORK_VAULT_KEY')
assert(vault.refCount === publicIds.size, 'encrypted vault refCount must match public refs')
for (const field of ['iv', 'tag', 'ciphertext']) {
  assert(typeof vault[field] === 'string' && vault[field].length > 0, `encrypted vault missing ${field}`)
}
for (const forbidden of ['refs', 'titles', 'works', 'items', 'representativeWorks', 'authors', 'mappings']) {
  assert(!Object.hasOwn(vault, forbidden), `encrypted vault must not expose plaintext field ${forbidden}`)
}

const runtimeRules = readJson(paths.runtimeRules)
assert(runtimeRules.privacy?.representativeWorks === 'encrypted_vault_only', 'runtime privacy must be encrypted_vault_only')
assert(runtimeRules.privacy?.publicReferenceField === 'sourceRefs', 'runtime public reference field must be sourceRefs')
for (const ref of sourceRefsFromRuntime(runtimeRules)) {
  assert(/^rwref_\d{4}$/.test(ref), `runtime sourceRef must be anonymous: ${ref}`)
  assert(publicIds.has(ref), `runtime sourceRef must exist in public refs: ${ref}`)
}

assertIncludes(paths.privacyMatrix, [
  'Reference Work Privacy Boundary',
  'Public Projection Boundary',
  'Public API',
  'UI',
  'Preview build',
  'Git history',
  'representative work names',
  '`rwref_*` to plaintext mapping',
])
assertIncludes(paths.referencePrivacyDoc, [
  'Plain titles stay outside the public repository',
  'REFERENCE_WORK_VAULT_KEY',
])
assertIncludes(paths.vaultAccessDoc, [
  'Local file outside the repo',
  'The key is never committed',
])
assertIncludes(paths.p80Doc, [
  'Public users, non-team members',
  'representative work names',
  'artifact is redacted',
])
assertIncludes(paths.p111Doc, [
  'GitHub visitors',
  'non-team operators',
  'ordinary runtime clients',
  'never see representative work names',
  'check:reference-work-encryption-completion',
  'check:representative-work-custody',
])
assertIncludes(paths.p127Doc, [
  'P127 Representative Work Custody Gate',
  'check:representative-work-custody',
  '| Area | Checked | Issue Found | Fix Applied | Gate |',
  'reference-work-vault.enc.json',
  'reference-work-public-refs.json',
  'non-team',
])
assertIncludes(paths.developmentNotes, [
  'P127 Representative Work Custody Gate',
  'check:representative-work-custody',
])
assertIncludes(paths.p43Doc, [
  'representative-work-custody',
  'reference-work-encryption-completion',
  'check:public-privacy-artifacts',
])
assertIncludes(paths.p92Doc, [
  'reference-work-encryption-completion',
  'representative-work-custody',
  'P127_REPRESENTATIVE_WORK_CUSTODY_GATE',
])
assertIncludes(paths.p107Doc, [
  'reference-work-encryption-completion',
  'representative-work-custody',
  'P127_REPRESENTATIVE_WORK_CUSTODY_GATE',
])

validateLatestArtifact('reference-privacy-', 'P80_REFERENCE_PRIVACY_ARTIFACT_GATE', 'reference privacy', payload => {
  assert(payload.publicBoundary?.representativeWorks === 'encrypted_vault_only', 'reference privacy artifact boundary mismatch')
  assert(payload.scanStats?.violationCount === 0, 'reference privacy artifact violation count must be 0')
  assert(payload.redaction?.titlesIncluded === false, 'reference privacy artifact must not include titles')
  assert(payload.redaction?.authorsIncluded === false, 'reference privacy artifact must not include authors')
  assert(payload.redaction?.decryptedMappingsIncluded === false, 'reference privacy artifact must not include decrypted mappings')
})
validateLatestArtifact('public-projection-privacy-', 'PUBLIC_PROJECTION_PRIVACY_AUDIT', 'public projection privacy', payload => {
  assert(payload.violationCount === 0, 'public projection privacy artifact violation count must be 0')
  assert(payload.redaction?.representativeNamesIncluded === false, 'public projection artifact must not include representative names')
  assert(payload.redaction?.sourceRefMappingsIncluded === false, 'public projection artifact must not include sourceRef mappings')
})
validateLatestArtifact('reference-work-encryption-completion-', 'P111_REFERENCE_WORK_ENCRYPTION_COMPLETION_GATE', 'reference work encryption completion', payload => {
  assert(payload.publicBoundary?.representativeWorks === 'encrypted_vault_only', 'P111 artifact boundary mismatch')
  assert(payload.redaction?.representativeNamesIncluded === false, 'P111 artifact must not include representative names')
  assert(payload.redaction?.decryptedMappingsIncluded === false, 'P111 artifact must not include decrypted mappings')
})

mkdirSync(artifactDir, { recursive: true })
const artifact = {
  status: violations.length ? 'failed' : 'passed',
  generatedAt: new Date().toISOString(),
  artifactContract: 'P127_REPRESENTATIVE_WORK_CUSTODY_GATE',
  scope: 'representative work custody and non-team access boundary',
  custodyBoundary: {
    plaintextNamesAllowedOnlyIn: 'team_only_decrypted_memory_or_private_files_outside_public_repository',
    publicRepository: 'anonymous_rwref_ids_and_encrypted_vault_ciphertext_only',
    publicClients: 'no_sourceRefs_profileIds_kernelIds_providerPromptPlumbing_or_representative_names',
    keyEnv: vault.keyEnv,
    vaultAlgorithm: vault.algorithm,
    publicRefCount: publicIds.size,
  },
  checkedArtifacts: [
    'reference-privacy',
    'public-projection-privacy',
    'reference-work-encryption-completion',
  ],
  redaction: {
    representativeNamesIncluded: false,
    authorNamesIncluded: false,
    decryptedMappingsIncluded: false,
    sourceRefMappingsIncluded: false,
    keyValuesIncluded: false,
    providerPayloadIncluded: false,
    violationDetailsIncluded: false,
  },
  violationCount: violations.length,
}
const artifactPath = join(artifactDir, `representative-work-custody-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

if (violations.length) {
  console.error(`representative work custody gate failed (${violations.length}); artifact: ${relative(root, artifactPath)}`)
  for (const violation of violations.slice(0, 80)) console.error(`- ${violation}`)
  if (violations.length > 80) console.error(`... ${violations.length - 80} more`)
  process.exit(1)
}

console.log(JSON.stringify({
  status: 'passed',
  gate: 'P127_REPRESENTATIVE_WORK_CUSTODY_GATE',
  artifactPath: relative(root, artifactPath),
  publicRefCount: publicIds.size,
  checkedArtifacts: artifact.checkedArtifacts,
}, null, 2))
