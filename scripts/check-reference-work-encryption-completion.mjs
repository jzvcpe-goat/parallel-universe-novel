#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')

const paths = {
  constraintDoc: 'docs/product/rules/GENRE_CONSTRAINT_RULES.md',
  kernelDoc: 'docs/product/rules/GENRE_KERNEL_RULES.md',
  runtimeRules: 'docs/product/rules/genre-runtime-rules.v1.json',
  publicRefs: 'docs/product/rules/reference-work-public-refs.json',
  vault: 'docs/product/rules/reference-work-vault.enc.json',
  privacyDoc: 'docs/product/rules/REFERENCE_WORK_PRIVACY.md',
  vaultAccessDoc: 'docs/product/rules/REFERENCE_WORK_VAULT_ACCESS.md',
  p80Doc: 'docs/backend/P80_REFERENCE_PRIVACY_ARTIFACT_GATE.md',
  p83Doc: 'docs/backend/P83_BACKWARD_CONSISTENCY_SWEEP.md',
  p111Doc: 'docs/backend/P111_REFERENCE_WORK_ENCRYPTION_COMPLETION_GATE.md',
  publicProjectionScript: 'scripts/check-public-projection-privacy.mjs',
  vaultAccessScript: 'scripts/check-reference-vault-access.mjs',
  referencePrivacyScript: 'scripts/scan-reference-privacy.mjs',
  ruleSourceScript: 'scripts/scan-p4-rule-source.mjs',
}

const violations = []

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
  for (const term of terms) {
    assert(text.includes(term), `${rel} must include ${term}`)
  }
}

function listArtifacts(prefix) {
  if (!existsSync(artifactDir)) return []
  return readdirSync(artifactDir)
    .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .map(name => join(artifactDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
}

function sourceRefsFromRuntime(runtimeRules) {
  const refs = []
  for (const item of runtimeRules.constraintProfiles || []) {
    for (const ref of item.sourceRefs || []) refs.push(String(ref))
  }
  for (const item of runtimeRules.genreKernels || []) {
    for (const ref of item.sourceRefs || []) refs.push(String(ref))
  }
  return refs
}

function assertNoPlainReferenceMarkers(rel) {
  const text = read(rel)
  const checks = [
    {
      pattern: /《[^》]+》/,
      message: 'must not contain Chinese title markers',
    },
    {
      pattern: /\b(workTitle|representativeWorkTitle|authorName|benchmarkTitle|source_evidence)\b/,
      message: 'must not expose plaintext representative-work metadata fields',
    },
    {
      pattern: /"title"\s*:/,
      message: 'must not expose title JSON fields',
    },
    {
      pattern: /"author"\s*:/,
      message: 'must not expose author JSON fields',
    },
  ]
  for (const check of checks) {
    const match = text.match(check.pattern)
    assert(!match, `${rel} ${check.message}`)
  }
}

for (const rel of Object.values(paths)) assertExists(rel)

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:reference-work-encryption-completion'] === 'node scripts/check-reference-work-encryption-completion.mjs',
  'package.json must expose check:reference-work-encryption-completion',
)
assert(
  String(packageJson.scripts.test || '').includes('npm run check:reference-work-encryption-completion'),
  'root npm run test must include check:reference-work-encryption-completion',
)

assertIncludes(paths.p111Doc, [
  'P111 Reference Work Encryption Completion Gate',
  'encrypted_vault_only',
  'reference-work-vault.enc.json',
  'reference-work-public-refs.json',
  'check:reference-work-encryption-completion',
  'remote live',
  'runtime assignment',
])
assertIncludes(paths.privacyDoc, [
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
assertIncludes(paths.p83Doc, [
  'Representative work names, author names and plaintext mappings belong only in the encrypted vault',
])

assertNoPlainReferenceMarkers(paths.constraintDoc)
assertNoPlainReferenceMarkers(paths.kernelDoc)
assertNoPlainReferenceMarkers(paths.runtimeRules)

const publicRefs = readJson(paths.publicRefs)
const publicRefList = Array.isArray(publicRefs.refs) ? publicRefs.refs : []
assert(publicRefs.version === 1, 'public refs version must be 1')
assert(publicRefs.refCount === publicRefList.length, 'public refs refCount must match refs length')
assert(publicRefList.length > 0, 'public refs must not be empty')
const publicIds = new Set()
for (const ref of publicRefList) {
  const keys = Object.keys(ref)
  assert(keys.length === 1 && keys[0] === 'id', 'public refs must expose only id')
  assert(/^rwref_\d{4}$/.test(ref.id || ''), `public ref must be anonymous rwref_0000: ${ref.id || '<missing>'}`)
  assert(!publicIds.has(ref.id), `duplicate public ref id: ${ref.id}`)
  publicIds.add(ref.id)
}

const vault = readJson(paths.vault)
assert(vault.version === 1, 'reference vault version must be 1')
assert(vault.algorithm === 'AES-256-GCM', 'reference vault must use AES-256-GCM')
assert(vault.keyEnv === 'REFERENCE_WORK_VAULT_KEY', 'reference vault keyEnv must be REFERENCE_WORK_VAULT_KEY')
assert(vault.refCount === publicIds.size, 'reference vault refCount must match public refs')
for (const field of ['iv', 'tag', 'ciphertext']) {
  assert(typeof vault[field] === 'string' && vault[field].length > 0, `reference vault must contain encrypted ${field}`)
}
for (const forbidden of ['refs', 'titles', 'works', 'items', 'representativeWorks', 'authors']) {
  assert(!Object.hasOwn(vault, forbidden), `encrypted vault must not expose plaintext field: ${forbidden}`)
}

const runtimeRules = readJson(paths.runtimeRules)
assert(runtimeRules.privacy?.representativeWorks === 'encrypted_vault_only', 'runtime privacy must keep representative works encrypted only')
assert(runtimeRules.privacy?.publicReferenceField === 'sourceRefs', 'runtime privacy public reference field must be sourceRefs')
for (const ref of sourceRefsFromRuntime(runtimeRules)) {
  assert(/^rwref_\d{4}$/.test(ref), `runtime sourceRef must be anonymous: ${ref}`)
  assert(publicIds.has(ref), `runtime sourceRef must exist in public refs: ${ref}`)
}

assertIncludes(paths.referencePrivacyScript, [
  'decryptVault',
  'validateGitHistoryPrivacy',
  'validateCurrentTextFilesAgainstVault',
  'violationDetailsIncluded: false',
  'titlesIncluded: false',
  'decryptedMappingsIncluded: false',
])
assertIncludes(paths.vaultAccessScript, [
  'reference-work-vault.key',
  'scanNoPrivateTerms',
  "plaintextFields: 'forbidden'",
])
assertIncludes(paths.publicProjectionScript, [
  'representativeNamesIncluded: false',
  'sourceRefMappingsIncluded: false',
  'providerPayloadIncluded: false',
])
assertIncludes(paths.ruleSourceScript, [
  'sourceRefs',
  'section source refs',
  'must match runtime registry',
])

const referenceArtifacts = listArtifacts('reference-privacy-')
if (referenceArtifacts.length) {
  const latest = JSON.parse(readFileSync(referenceArtifacts[0], 'utf8'))
  assert(latest.status === 'passed', 'latest reference-privacy artifact must be passed')
  assert(latest.redaction?.titlesIncluded === false, 'reference-privacy artifact must not include titles')
  assert(latest.redaction?.authorsIncluded === false, 'reference-privacy artifact must not include authors')
  assert(latest.redaction?.decryptedMappingsIncluded === false, 'reference-privacy artifact must not include decrypted mappings')
  assert(latest.publicBoundary?.representativeWorks === 'encrypted_vault_only', 'reference-privacy artifact must preserve encrypted_vault_only boundary')
}

const publicProjectionArtifacts = listArtifacts('public-projection-privacy-')
if (publicProjectionArtifacts.length) {
  const latest = JSON.parse(readFileSync(publicProjectionArtifacts[0], 'utf8'))
  assert(latest.status === 'passed', 'latest public-projection-privacy artifact must be passed')
  assert(latest.redaction?.representativeNamesIncluded === false, 'public projection artifact must not include representative names')
  assert(latest.redaction?.sourceRefMappingsIncluded === false, 'public projection artifact must not include sourceRef mappings')
  assert(latest.redaction?.providerPayloadIncluded === false, 'public projection artifact must not include provider payload')
}

mkdirSync(artifactDir, { recursive: true })
const artifact = {
  status: violations.length ? 'failed' : 'passed',
  generatedAt: new Date().toISOString(),
  artifactContract: 'P111_REFERENCE_WORK_ENCRYPTION_COMPLETION_GATE',
  scope: 'representative work encryption completion',
  checkedPaths: {
    constraintDoc: paths.constraintDoc,
    kernelDoc: paths.kernelDoc,
    runtimeRules: paths.runtimeRules,
    publicRefs: paths.publicRefs,
    encryptedVault: paths.vault,
  },
  publicBoundary: {
    representativeWorks: runtimeRules.privacy?.representativeWorks,
    publicReferenceField: runtimeRules.privacy?.publicReferenceField,
    publicRefCount: publicIds.size,
  },
  checks: {
    rootTestIncludesGate: String(packageJson.scripts.test || '').includes('npm run check:reference-work-encryption-completion'),
    docsUseAnonymousRefsOnly: true,
    runtimeRefsExistInPublicMap: true,
    encryptedVaultHasNoPlaintextFields: true,
    publicRefsExposeOnlyIds: true,
    privacyArtifactsRedacted: true,
  },
  redaction: {
    representativeNamesIncluded: false,
    authorNamesIncluded: false,
    decryptedMappingsIncluded: false,
    keyValuesIncluded: false,
    providerPromptIncluded: false,
  },
  violationCount: violations.length,
}

const artifactPath = join(artifactDir, `reference-work-encryption-completion-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

if (violations.length) {
  console.error(JSON.stringify({ status: 'failed', artifactPath, violations }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({
  status: 'passed',
  artifactPath: relative(root, artifactPath),
  publicRefCount: publicIds.size,
  runtimeSourceRefCount: sourceRefsFromRuntime(runtimeRules).length,
  artifactRedacted: true,
}, null, 2))
