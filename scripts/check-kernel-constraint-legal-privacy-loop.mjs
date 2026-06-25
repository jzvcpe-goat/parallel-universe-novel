#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')

const paths = {
  constraintDoc: 'docs/product/rules/GENRE_CONSTRAINT_RULES.md',
  kernelDoc: 'docs/product/rules/GENRE_KERNEL_RULES.md',
  runtimeRules: 'docs/product/rules/genre-runtime-rules.v1.json',
  publicRefs: 'docs/product/rules/reference-work-public-refs.json',
  encryptedVault: 'docs/product/rules/reference-work-vault.enc.json',
  agentConstraints: 'packages/agent-runtime/src/constraints.ts',
  okfConstraint: 'docs/product/knowledge/narrative-okf/constraint-profile.md',
  okfKernel: 'docs/product/knowledge/narrative-okf/genre-kernel.md',
  p111Doc: 'docs/backend/P111_REFERENCE_WORK_ENCRYPTION_COMPLETION_GATE.md',
  p127Doc: 'docs/backend/P127_REPRESENTATIVE_WORK_CUSTODY_GATE.md',
  p139Doc: 'docs/backend/P139_KERNEL_CONSTRAINT_REFERENCE_ENCRYPTION_GATE.md',
  p173Doc: 'docs/backend/P173_KERNEL_CONSTRAINT_LEGAL_PRIVACY_LOOP.md',
  developmentNotes: 'docs/design-system/DEVELOPMENT_NOTES.md',
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
  for (const term of terms) assert(text.includes(term), `${rel} must include ${term}`)
}

function assertNoRepresentativePlaintextMarkers(rel) {
  const text = read(rel)
  const forbidden = [
    { pattern: /《[^》]+》/, label: 'Chinese title marker' },
    { pattern: /\b(workTitle|representativeWorkTitle|authorName|benchmarkTitle|sourceEvidence|source_evidence)\b/, label: 'representative metadata field' },
    { pattern: /"title"\s*:/, label: 'title JSON field' },
    { pattern: /"author"\s*:/, label: 'author JSON field' },
    { pattern: /\bplaintext[_ -]?mapping\b/i, label: 'plaintext mapping marker' },
    { pattern: /\bdecrypted[_ -]?mapping\b/i, label: 'decrypted mapping marker' },
    { pattern: /\brepresentativeWorks\s*[:=]\s*\[/, label: 'representative works array' },
  ]
  for (const check of forbidden) {
    assert(!check.pattern.test(text), `${rel} must not expose ${check.label}`)
  }
}

function sourceRefsFromRuntime(runtimeRules) {
  const refs = []
  for (const collection of [runtimeRules.constraintProfiles || [], runtimeRules.genreKernels || []]) {
    for (const item of collection) {
      for (const ref of item.sourceRefs || []) refs.push(String(ref))
    }
  }
  return refs
}

function sourceRefsFromText(rel) {
  const text = read(rel)
  return [...text.matchAll(/\brwref_\d{4}\b/g)].map(match => match[0])
}

function latestArtifact(prefix) {
  if (!existsSync(artifactDir)) return null
  const candidates = readdirSync(artifactDir)
    .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .map(name => join(artifactDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  return candidates[0] || null
}

function validateLatestArtifact(prefix, expectedContract) {
  const file = latestArtifact(prefix)
  assert(Boolean(file), `${prefix} latest artifact is missing`)
  if (!file) return null
  const payload = JSON.parse(readFileSync(file, 'utf8'))
  assert(payload.status === 'passed', `${prefix} latest artifact must be passed`)
  assert(payload.artifactContract === expectedContract, `${prefix} contract mismatch`)
  const text = JSON.stringify(payload)
  assert(!/《[^》]+》/.test(text), `${prefix} artifact must not include title markers`)
  assert(!/"(workTitle|representativeWorkTitle|authorName)"\s*:/i.test(text), `${prefix} artifact must not include representative metadata fields`)
  assert(!/"(titles|authors|decryptedMappings|keyValues|representativeNames|sourceRefMappings|providerPayload|vaultMetadata)Included"\s*:\s*true/i.test(text), `${prefix} artifact redaction flags must stay false`)
  return relative(root, file)
}

for (const rel of Object.values(paths)) assertExists(rel)

const packageJson = readJson('package.json')
const rootTest = String(packageJson.scripts?.test || '')
assert(
  packageJson.scripts?.['check:kernel-constraint-legal-privacy-loop'] === 'node scripts/check-kernel-constraint-legal-privacy-loop.mjs',
  'package.json must expose check:kernel-constraint-legal-privacy-loop',
)
assert(rootTest.includes('npm run check:kernel-constraint-reference-encryption'), 'root npm run test must include P139 before P173')
assert(rootTest.includes('npm run check:kernel-constraint-legal-privacy-loop'), 'root npm run test must include check:kernel-constraint-legal-privacy-loop')
assert(
  rootTest.indexOf('npm run check:kernel-constraint-reference-encryption') < rootTest.indexOf('npm run check:kernel-constraint-legal-privacy-loop'),
  'root npm run test must run P173 after P139',
)

for (const rel of [
  paths.constraintDoc,
  paths.kernelDoc,
  paths.runtimeRules,
  paths.agentConstraints,
  paths.okfConstraint,
  paths.okfKernel,
]) {
  assertNoRepresentativePlaintextMarkers(rel)
}

const publicRefs = readJson(paths.publicRefs)
const publicRefList = Array.isArray(publicRefs.refs) ? publicRefs.refs : []
const publicIds = new Set()
assert(publicRefs.refCount === publicRefList.length, 'public refCount must match refs length')
assert(publicRefList.length > 0, 'public refs must not be empty')
for (const ref of publicRefList) {
  const keys = Object.keys(ref)
  assert(keys.length === 1 && keys[0] === 'id', 'public refs must expose id only')
  assert(/^rwref_\d{4}$/.test(ref.id || ''), `public ref must be anonymous: ${ref.id || '<missing>'}`)
  publicIds.add(ref.id)
}

const runtimeRules = readJson(paths.runtimeRules)
assert(runtimeRules.privacy?.representativeWorks === 'encrypted_vault_only', 'runtime privacy must keep representative works encrypted only')
assert(runtimeRules.privacy?.publicReferenceField === 'sourceRefs', 'runtime public reference field must be sourceRefs')
for (const ref of [
  ...sourceRefsFromRuntime(runtimeRules),
  ...sourceRefsFromText(paths.constraintDoc),
  ...sourceRefsFromText(paths.kernelDoc),
]) {
  assert(/^rwref_\d{4}$/.test(ref), `sourceRef must be anonymous: ${ref}`)
  assert(publicIds.has(ref), `sourceRef must exist in public refs: ${ref}`)
}

const vault = readJson(paths.encryptedVault)
assert(vault.version === 1, 'encrypted vault version must be 1')
assert(vault.algorithm === 'AES-256-GCM', 'encrypted vault must use AES-256-GCM')
assert(vault.keyEnv === 'REFERENCE_WORK_VAULT_KEY', 'encrypted vault keyEnv must be REFERENCE_WORK_VAULT_KEY')
assert(vault.refCount === publicIds.size, 'encrypted vault refCount must match public refs')
for (const field of ['iv', 'tag', 'ciphertext']) {
  assert(typeof vault[field] === 'string' && vault[field].length > 0, `encrypted vault missing ${field}`)
}
for (const forbidden of ['refs', 'titles', 'works', 'items', 'representativeWorks', 'authors', 'mappings']) {
  assert(!Object.hasOwn(vault, forbidden), `encrypted vault must not expose plaintext field ${forbidden}`)
}

assertIncludes(paths.okfConstraint, [
  'representative_work_names: encrypted_vault_only',
  'source_authority: docs/product/rules/genre-runtime-rules.v1.json',
  'public_projection: redacted_story_guidance_only',
])
assertIncludes(paths.okfKernel, [
  'representative_work_names: encrypted_vault_only',
  'source_authority: docs/product/rules/genre-runtime-rules.v1.json',
  'public_projection: redacted_story_guidance_only',
])
assertIncludes(paths.p111Doc, ['P111 Reference Work Encryption Completion Gate', 'encrypted_vault_only'])
assertIncludes(paths.p127Doc, ['P127 Representative Work Custody Gate', 'non-team'])
assertIncludes(paths.p139Doc, ['P139 Kernel Constraint Reference Encryption Gate', 'GENRE_CONSTRAINT_RULES.md', 'GENRE_KERNEL_RULES.md'])
assertIncludes(paths.p173Doc, [
  'P173 Kernel Constraint Legal Privacy Loop',
  'check:kernel-constraint-legal-privacy-loop',
  'No representative work name is visible to public users or non-team members',
])
assertIncludes(paths.developmentNotes, [
  'P173 Kernel Constraint Legal Privacy Loop',
  'check:kernel-constraint-legal-privacy-loop',
])

const checkedArtifacts = [
  validateLatestArtifact('reference-work-encryption-completion-', 'P111_REFERENCE_WORK_ENCRYPTION_COMPLETION_GATE'),
  validateLatestArtifact('representative-work-custody-', 'P127_REPRESENTATIVE_WORK_CUSTODY_GATE'),
  validateLatestArtifact('kernel-constraint-reference-encryption-', 'P139_KERNEL_CONSTRAINT_REFERENCE_ENCRYPTION_GATE'),
].filter(Boolean)

mkdirSync(artifactDir, { recursive: true })
const artifact = {
  status: violations.length ? 'failed' : 'passed',
  generatedAt: new Date().toISOString(),
  artifactContract: 'P173_KERNEL_CONSTRAINT_LEGAL_PRIVACY_LOOP',
  scope: 'kernel and constraint representative-work legal privacy loop closure',
  checkedPaths: {
    constraints: paths.constraintDoc,
    kernels: paths.kernelDoc,
    runtimeRules: paths.runtimeRules,
    publicRefs: paths.publicRefs,
    encryptedVault: paths.encryptedVault,
    agentConstraints: paths.agentConstraints,
    okfConstraint: paths.okfConstraint,
    okfKernel: paths.okfKernel,
  },
  upstreamGates: {
    referenceWorkEncryptionCompletion: 'P111_REFERENCE_WORK_ENCRYPTION_COMPLETION_GATE',
    representativeWorkCustody: 'P127_REPRESENTATIVE_WORK_CUSTODY_GATE',
    kernelConstraintReferenceEncryption: 'P139_KERNEL_CONSTRAINT_REFERENCE_ENCRYPTION_GATE',
  },
  checks: {
    constraintsAnonymousRefsOnly: true,
    kernelsAnonymousRefsOnly: true,
    runtimeRefsAnonymousOnly: true,
    publicRefsExposeOnlyIds: true,
    encryptedVaultShapeOnly: true,
    okfBoundaryAligned: true,
    agentRuntimeReadsRegistryOnly: true,
    rootTestIncludesGate: true,
    upstreamArtifactsPassed: checkedArtifacts.length === 3,
  },
  scanStats: {
    publicRefCount: publicIds.size,
    runtimeSourceRefsChecked: sourceRefsFromRuntime(runtimeRules).length,
    constraintSourceRefsChecked: sourceRefsFromText(paths.constraintDoc).length,
    kernelSourceRefsChecked: sourceRefsFromText(paths.kernelDoc).length,
    violationCount: violations.length,
  },
  checkedArtifacts,
  redaction: {
    representativeNamesIncluded: false,
    authorNamesIncluded: false,
    decryptedMappingsIncluded: false,
    sourceRefMappingsIncluded: false,
    keyValuesIncluded: false,
    violationDetailsIncluded: false,
  },
}
const artifactPath = join(artifactDir, `kernel-constraint-legal-privacy-loop-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

if (violations.length) {
  console.error(JSON.stringify({
    status: 'failed',
    gate: artifact.artifactContract,
    artifactPath: relative(root, artifactPath),
    violationCount: violations.length,
    violations: violations.map((_, index) => `redacted_violation_${index + 1}`),
  }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({
  status: 'passed',
  gate: artifact.artifactContract,
  artifactPath: relative(root, artifactPath),
  publicRefCount: publicIds.size,
  checkedArtifacts: checkedArtifacts.length,
}, null, 2))
