#!/usr/bin/env node
import { existsSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs'
import { Buffer } from 'node:buffer'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const vaultPath = join(root, 'docs/product/rules/reference-work-vault.enc.json')
const publicRefsPath = join(root, 'docs/product/rules/reference-work-public-refs.json')
const runtimeRulesPath = join(root, 'docs/product/rules/genre-runtime-rules.v1.json')
const localKeyPath = '/Users/james/Documents/PUF/private/reference-work-vault.key'

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJsonPath(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertContains(file, terms) {
  const body = read(file)
  for (const term of terms) assert(body.includes(term), `${file} must include ${term}`)
}

function base64Bytes(value) {
  try {
    return Buffer.from(String(value || ''), 'base64')
  } catch {
    return Buffer.alloc(0)
  }
}

function isWithinRoot(path) {
  const rel = relative(root, path)
  return rel && !rel.startsWith('..') && !rel.startsWith('/')
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

function scanNoPrivateTerms(payload) {
  const text = JSON.stringify(payload)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/,
    /system prompt/i,
    /provider secret/i,
    /database_url/i,
    /reference-work-vault\.key.*[A-Za-z0-9+/=]{32,}/i,
    /"title"\s*:/i,
    /"author"\s*:/i,
    /"works"\s*:/i,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:reference-vault-access'] === 'node scripts/check-reference-vault-access.mjs',
  'package.json must expose check:reference-vault-access',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:reference-vault-access'),
  'root npm run test must include check:reference-vault-access',
)

for (const file of [
  '.gitignore',
  'docs/product/rules/reference-work-vault.enc.json',
  'docs/product/rules/reference-work-public-refs.json',
  'docs/product/rules/REFERENCE_WORK_PRIVACY.md',
  'docs/product/rules/REFERENCE_WORK_VAULT_ACCESS.md',
  'docs/product/rules/REFERENCE_WORK_PRIVACY_AUDIT_20260617.md',
  'docs/backend/P67_REFERENCE_VAULT_ACCESS_HARDENING_GATE.md',
  'scripts/scan-reference-privacy.mjs',
]) {
  assert(existsSync(join(root, file)), `missing reference vault access file: ${file}`)
}

assertContains('.gitignore', [
  'private/',
  'reference-work-vault.key',
  '**/reference-work-vault.key',
])
assertContains('docs/product/rules/REFERENCE_WORK_PRIVACY.md', [
  'Plain titles stay outside the public repository',
  'REFERENCE_WORK_VAULT_KEY',
  'GitHub Pages output must not expose representative work titles',
])
assertContains('docs/product/rules/REFERENCE_WORK_VAULT_ACCESS.md', [
  'Local file outside the repo',
  'CI or deployment secret',
  'The key is never committed',
  'Rotation Workflow',
])
assertContains('docs/backend/P67_REFERENCE_VAULT_ACCESS_HARDENING_GATE.md', [
  'P67 Reference Vault Access Hardening Gate',
  'team_only_decryption',
  'zero_plaintext_public_refs',
  'key_outside_public_repository',
])
assertContains('scripts/scan-reference-privacy.mjs', [
  'validateCurrentTextFilesAgainstVault',
  'validateGitHistoryPrivacy',
  'validateNoCommittedVaultKey',
  'decryptVault',
  'reference-work-vault.key',
])

const vault = readJsonPath(vaultPath)
assert(vault.version === 1, 'reference vault version must be 1')
assert(vault.algorithm === 'AES-256-GCM', 'reference vault algorithm must be AES-256-GCM')
assert(vault.aad === 'parallel-universe-reference-work-vault:v1', 'reference vault AAD must be stable and versioned')
assert(vault.keyEnv === 'REFERENCE_WORK_VAULT_KEY', 'reference vault keyEnv must be REFERENCE_WORK_VAULT_KEY')
assert(Number(vault.refCount) > 0, 'reference vault refCount must be positive')
for (const field of ['iv', 'tag', 'ciphertext']) {
  assert(typeof vault[field] === 'string' && vault[field].length > 0, `reference vault ${field} must be base64 text`)
  assert(base64Bytes(vault[field]).length > 0, `reference vault ${field} must decode as base64`)
}
for (const forbidden of ['refs', 'titles', 'works', 'items', 'representativeWorks', 'authors']) {
  assert(!Object.hasOwn(vault, forbidden), `reference vault must not expose plaintext field ${forbidden}`)
}

const publicRefs = readJsonPath(publicRefsPath)
const refs = Array.isArray(publicRefs.refs) ? publicRefs.refs : []
assert(publicRefs.refCount === refs.length, 'public reference refCount must match refs length')
assert(vault.refCount === refs.length, 'encrypted vault refCount must match public reference count')
const refIds = new Set()
for (const ref of refs) {
  assert(Object.keys(ref).length === 1 && typeof ref.id === 'string', 'public refs must expose only id')
  assert(/^rwref_\d{4}$/.test(ref.id), `public ref id must be anonymous rwref_0000: ${ref.id}`)
  assert(!refIds.has(ref.id), `public ref id must be unique: ${ref.id}`)
  refIds.add(ref.id)
}

const runtimeRules = readJsonPath(runtimeRulesPath)
assert(runtimeRules.privacy?.representativeWorks === 'encrypted_vault_only', 'runtime privacy must keep representative works encrypted only')
assert(runtimeRules.privacy?.publicReferenceField === 'sourceRefs', 'runtime privacy public reference field must be sourceRefs')
for (const ref of sourceRefsFromRuntime(runtimeRules)) {
  assert(/^rwref_\d{4}$/.test(ref), `runtime sourceRef must be anonymous: ${ref}`)
  assert(refIds.has(ref), `runtime sourceRef must exist in public refs: ${ref}`)
}

assert(!isWithinRoot(localKeyPath), 'local reference vault key path must be outside the public repository')
const keyState = {
  pathPolicy: 'outside_public_repository',
  exists: existsSync(localKeyPath),
  mode: null,
  keyBytes: null,
}
if (existsSync(localKeyPath)) {
  const stat = statSync(localKeyPath)
  const mode = stat.mode & 0o777
  const keyValue = readFileSync(localKeyPath, 'utf8').trim()
  const keyBytes = base64Bytes(keyValue).length
  assert((mode & 0o077) === 0, 'local reference vault key must not be readable, writable or executable by group/other')
  assert(keyBytes === 32, 'local reference vault key must decode to a 32-byte AES-256 key')
  keyState.mode = mode.toString(8).padStart(3, '0')
  keyState.keyBytes = keyBytes
}

const artifact = {
  generatedAt: new Date().toISOString(),
  status: 'passed',
  scope: 'reference vault access hardening',
  decisions: [
    'team_only_decryption',
    'zero_plaintext_public_refs',
    'key_outside_public_repository',
  ],
  vault: {
    version: vault.version,
    algorithm: vault.algorithm,
    aad: vault.aad,
    keyEnv: vault.keyEnv,
    refCount: vault.refCount,
    plaintextFields: 'forbidden',
  },
  publicRefs: {
    refCount: refs.length,
    exposedFields: ['id'],
  },
  runtimeRules: {
    representativeWorks: runtimeRules.privacy?.representativeWorks,
    publicReferenceField: runtimeRules.privacy?.publicReferenceField,
    sourceRefCount: sourceRefsFromRuntime(runtimeRules).length,
  },
  localKey: keyState,
  requiredCommands: [
    'npm run scan:reference-privacy',
    'npm run check:reference-vault-access',
  ],
}

const privateViolations = scanNoPrivateTerms(artifact)
assert(privateViolations.length === 0, `reference vault access artifact privacy violations: ${privateViolations.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `reference-vault-access-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: 'passed',
  artifactPath,
  vault: {
    algorithm: artifact.vault.algorithm,
    refCount: artifact.vault.refCount,
    plaintextFields: artifact.vault.plaintextFields,
  },
  publicRefs: artifact.publicRefs,
  localKey: artifact.localKey.exists
    ? { pathPolicy: artifact.localKey.pathPolicy, mode: artifact.localKey.mode, keyBytes: artifact.localKey.keyBytes }
    : { pathPolicy: artifact.localKey.pathPolicy, exists: false },
}, null, 2))
