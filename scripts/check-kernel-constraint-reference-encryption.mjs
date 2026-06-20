#!/usr/bin/env node
import { createDecipheriv } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')
const defaultKeyPath = '/Users/james/Documents/PUF/private/reference-work-vault.key'

const paths = {
  constraintDoc: 'docs/product/rules/GENRE_CONSTRAINT_RULES.md',
  kernelDoc: 'docs/product/rules/GENRE_KERNEL_RULES.md',
  runtimeRules: 'docs/product/rules/genre-runtime-rules.v1.json',
  publicRefs: 'docs/product/rules/reference-work-public-refs.json',
  vault: 'docs/product/rules/reference-work-vault.enc.json',
  p139Doc: 'docs/backend/P139_KERNEL_CONSTRAINT_REFERENCE_ENCRYPTION_GATE.md',
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

function assertNoPlainMarkers(rel) {
  const text = read(rel)
  const checks = [
    { pattern: /《[^》]+》/, label: 'Chinese title marker' },
    { pattern: /\b(workTitle|representativeWorkTitle|authorName|benchmarkTitle|sourceEvidence|source_evidence)\b/, label: 'representative metadata field' },
    { pattern: /"title"\s*:/, label: 'title JSON field' },
    { pattern: /"author"\s*:/, label: 'author JSON field' },
    { pattern: /\bplaintext[_ -]?mapping\b/i, label: 'plaintext mapping marker' },
    { pattern: /\bdecrypted[_ -]?mapping\b/i, label: 'decrypted mapping marker' },
  ]
  for (const check of checks) {
    assert(!check.pattern.test(text), `${rel} must not expose ${check.label}`)
  }
}

function vaultKey() {
  const fromEnv = String(process.env.REFERENCE_WORK_VAULT_KEY || '').trim()
  if (fromEnv) return fromEnv
  if (existsSync(defaultKeyPath)) return readFileSync(defaultKeyPath, 'utf8').trim()
  return ''
}

function decryptVault() {
  const keyValue = vaultKey()
  if (!keyValue) return { checked: false, refs: [] }
  const vault = readJson(paths.vault)
  const key = Buffer.from(keyValue, 'base64')
  const decipher = createDecipheriv(vault.algorithm.toLowerCase(), key, Buffer.from(vault.iv, 'base64'))
  if (vault.aad) decipher.setAAD(Buffer.from(vault.aad))
  decipher.setAuthTag(Buffer.from(vault.tag, 'base64'))
  const plain = Buffer.concat([
    decipher.update(Buffer.from(vault.ciphertext, 'base64')),
    decipher.final(),
  ])
  return { checked: true, refs: JSON.parse(plain.toString('utf8')).refs || [] }
}

function collectNeedles(value, parentKey = '') {
  const needles = []
  if (Array.isArray(value)) {
    for (const item of value) needles.push(...collectNeedles(item, parentKey))
    return needles
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      needles.push(...collectNeedles(nested, key))
    }
    return needles
  }
  if (typeof value !== 'string') return needles
  const key = parentKey.toLowerCase()
  const likelyPrivateName = /(title|author|work|name|source)/i.test(key)
  const text = value.trim()
  if (likelyPrivateName && text.length >= 2 && !/^rwref_\d{4}$/.test(text)) needles.push(text)
  return needles
}

function scanNeedlesInPublicFiles(needles) {
  const uniqueNeedles = [...new Set(needles)].filter(Boolean)
  const publicFiles = [paths.constraintDoc, paths.kernelDoc, paths.runtimeRules]
  for (const rel of publicFiles) {
    const text = read(rel)
    for (const needle of uniqueNeedles) {
      if (text.includes(needle)) {
        violations.push(`${rel} contains a decrypted representative-work needle; value redacted`)
      }
    }
  }
  return uniqueNeedles.length
}

function latestArtifact(prefix) {
  if (!existsSync(artifactDir)) return null
  const candidates = readdirSync(artifactDir)
    .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .map(name => join(artifactDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  return candidates[0] || null
}

for (const rel of Object.values(paths)) assertExists(rel)

const packageJson = readJson('package.json')
assert(
  packageJson.scripts?.['check:kernel-constraint-reference-encryption'] === 'node scripts/check-kernel-constraint-reference-encryption.mjs',
  'package.json must expose check:kernel-constraint-reference-encryption',
)
assert(
  String(packageJson.scripts?.test || '').includes('npm run check:kernel-constraint-reference-encryption'),
  'root npm run test must include check:kernel-constraint-reference-encryption',
)

for (const rel of [paths.constraintDoc, paths.kernelDoc, paths.runtimeRules]) assertNoPlainMarkers(rel)

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

const runtimeRules = readJson(paths.runtimeRules)
assert(runtimeRules.privacy?.representativeWorks === 'encrypted_vault_only', 'runtime privacy must be encrypted_vault_only')
assert(runtimeRules.privacy?.publicReferenceField === 'sourceRefs', 'runtime public reference field must be sourceRefs')

for (const ref of [
  ...sourceRefsFromRuntime(runtimeRules),
  ...sourceRefsFromText(paths.constraintDoc),
  ...sourceRefsFromText(paths.kernelDoc),
]) {
  assert(/^rwref_\d{4}$/.test(ref), `sourceRef must be anonymous: ${ref}`)
  assert(publicIds.has(ref), `sourceRef must exist in public refs: ${ref}`)
}

const vault = readJson(paths.vault)
assert(vault.version === 1, 'reference vault version must be 1')
assert(vault.algorithm === 'AES-256-GCM', 'reference vault must use AES-256-GCM')
assert(vault.keyEnv === 'REFERENCE_WORK_VAULT_KEY', 'reference vault keyEnv must be REFERENCE_WORK_VAULT_KEY')
assert(vault.refCount === publicIds.size, 'reference vault refCount must match public refs')
for (const field of ['iv', 'tag', 'ciphertext']) {
  assert(typeof vault[field] === 'string' && vault[field].length > 0, `reference vault missing encrypted ${field}`)
}
for (const forbidden of ['refs', 'titles', 'works', 'items', 'representativeWorks', 'authors', 'mappings']) {
  assert(!Object.hasOwn(vault, forbidden), `encrypted vault must not expose plaintext field ${forbidden}`)
}

let decryptedVaultScan = false
let decryptedNeedlesChecked = 0
try {
  const decrypted = decryptVault()
  decryptedVaultScan = decrypted.checked
  decryptedNeedlesChecked = scanNeedlesInPublicFiles(decrypted.refs.flatMap(ref => collectNeedles(ref)))
} catch {
  violations.push('vault decryption failed when REFERENCE_WORK_VAULT_KEY was available')
}

assertIncludes(paths.p139Doc, [
  'P139 Kernel Constraint Reference Encryption Gate',
  'GENRE_CONSTRAINT_RULES.md',
  'GENRE_KERNEL_RULES.md',
  'genre-runtime-rules.v1.json',
  'check:kernel-constraint-reference-encryption',
])
assertIncludes(paths.developmentNotes, [
  'P139 Kernel Constraint Reference Encryption Gate',
  'check:kernel-constraint-reference-encryption',
])

for (const prefix of [
  'reference-privacy-',
  'reference-work-encryption-completion-',
  'representative-work-custody-',
]) {
  const file = latestArtifact(prefix)
  if (!file) continue
  const payload = JSON.parse(readFileSync(file, 'utf8'))
  assert(payload.status === 'passed', `${prefix} latest artifact must be passed`)
  assert(!/《[^》]+》/.test(JSON.stringify(payload)), `${prefix} latest artifact must not include title markers`)
}

mkdirSync(artifactDir, { recursive: true })
const artifact = {
  status: violations.length ? 'failed' : 'passed',
  generatedAt: new Date().toISOString(),
  artifactContract: 'P139_KERNEL_CONSTRAINT_REFERENCE_ENCRYPTION_GATE',
  scope: 'kernel and constraint representative-work encryption boundary',
  checkedPaths: {
    constraints: paths.constraintDoc,
    kernels: paths.kernelDoc,
    runtimeRules: paths.runtimeRules,
    publicRefs: paths.publicRefs,
    encryptedVault: paths.vault,
  },
  checks: {
    constraintsAnonymousRefsOnly: true,
    kernelsAnonymousRefsOnly: true,
    runtimeRefsAnonymousOnly: true,
    publicRefsExposeOnlyIds: true,
    encryptedVaultShapeOnly: true,
    rootTestIncludesGate: true,
    docsDescribeGate: true,
    decryptedVaultScan,
  },
  scanStats: {
    publicRefCount: publicIds.size,
    runtimeSourceRefsChecked: sourceRefsFromRuntime(runtimeRules).length,
    constraintSourceRefsChecked: sourceRefsFromText(paths.constraintDoc).length,
    kernelSourceRefsChecked: sourceRefsFromText(paths.kernelDoc).length,
    decryptedNeedlesChecked,
    violationCount: violations.length,
  },
  redaction: {
    representativeNamesIncluded: false,
    authorNamesIncluded: false,
    decryptedMappingsIncluded: false,
    sourceRefMappingsIncluded: false,
    keyValuesIncluded: false,
    violationDetailsIncluded: false,
  },
}
const artifactPath = join(artifactDir, `kernel-constraint-reference-encryption-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
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
  decryptedVaultScan,
  decryptedNeedlesChecked,
}, null, 2))
