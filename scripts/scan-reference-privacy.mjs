#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { createDecipheriv } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')
const vaultPath = join(root, 'docs/product/rules/reference-work-vault.enc.json')
const publicRefsPath = join(root, 'docs/product/rules/reference-work-public-refs.json')
const runtimeRulesPath = join(root, 'docs/product/rules/genre-runtime-rules.v1.json')
const defaultKeyPath = '/Users/james/Documents/PUF/private/reference-work-vault.key'

const scanRoots = [
  'packages/agent-runtime/src',
  'backend/src/narrativeos',
  'app/src',
  'app/dist',
  'artifacts/runtime',
  'docs/product/rules',
  'docs/product/breakpoints',
]

const allowedFiles = new Set([
  'docs/product/rules/reference-work-vault.enc.json',
  'docs/product/rules/reference-work-public-refs.json',
])

const binaryExtensions = new Set([
  '.avif',
  '.gif',
  '.ico',
  '.jpeg',
  '.jpg',
  '.pdf',
  '.png',
  '.webp',
  '.woff',
  '.woff2',
  '.zip',
])

function allScanFiles() {
  const files = []
  for (const rootDir of scanRoots) {
    const absolute = join(root, rootDir)
    function walk(current) {
      if (!existsSync(current)) return
      for (const entry of readdirSync(current)) {
        const full = join(current, entry)
        const stat = statSync(full)
        if (stat.isDirectory()) {
          if (entry === 'node_modules' || entry === 'dist' || entry === '.venv' || entry === '.git') continue
          walk(full)
        } else {
          files.push(full)
        }
      }
    }
    walk(absolute)
  }
  return files
}

function allTrackedFiles() {
  try {
    return execFileSync('git', ['ls-files', '-z'], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString('utf8')
      .split('\0')
      .filter(Boolean)
      .map(file => join(root, file))
      .filter(file => existsSync(file))
  } catch {
    return allScanFiles()
  }
}

function isTextCandidate(file) {
  return !binaryExtensions.has(extname(file).toLowerCase())
}

function isLikelyTextBuffer(buffer) {
  return !buffer.includes(0)
}

function uniqueFiles(files) {
  return [...new Set(files)]
}

function decryptVault() {
  const keyValue = process.env.REFERENCE_WORK_VAULT_KEY
    || (existsSync(defaultKeyPath) ? readFileSync(defaultKeyPath, 'utf8').trim() : '')
  if (!keyValue || !existsSync(vaultPath)) return []
  const key = Buffer.from(keyValue, 'base64')
  const vault = JSON.parse(readFileSync(vaultPath, 'utf8'))
  const decipher = createDecipheriv(vault.algorithm.toLowerCase().replaceAll('-', '-'), key, Buffer.from(vault.iv, 'base64'))
  decipher.setAAD(Buffer.from(vault.aad))
  decipher.setAuthTag(Buffer.from(vault.tag, 'base64'))
  const plain = Buffer.concat([
    decipher.update(Buffer.from(vault.ciphertext, 'base64')),
    decipher.final(),
  ])
  return JSON.parse(plain.toString('utf8')).refs || []
}

function gitOutput(args, options = {}) {
  return execFileSync('git', args, {
    cwd: root,
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: options.maxBuffer || 32 * 1024 * 1024,
  })
}

function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length
}

const violations = []
const files = allScanFiles()
const trackedFiles = allTrackedFiles().filter(isTextCandidate)
let decryptedVaultRefsCount = 0
let decryptedVaultScan = false
let gitHistoryPrivacyChecked = false

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function writePrivacyArtifact(status, publicIds) {
  mkdirSync(artifactDir, { recursive: true })
  const artifact = {
    status,
    scope: 'reference privacy scan',
    generatedAt: new Date().toISOString(),
    artifactContract: 'P80_REFERENCE_PRIVACY_ARTIFACT_GATE',
    publicBoundary: {
      representativeWorks: 'encrypted_vault_only',
      publicReferenceField: 'sourceRefs',
      publicRefCount: publicIds.size,
    },
    checks: {
      vaultShape: true,
      publicRefsAnonymousOnly: true,
      runtimeSourceRefsAnonymousOnly: true,
      publicRuleTextNoTitleMarkers: true,
      noCommittedVaultKey: true,
      currentFilesAgainstVault: true,
      gitHistoryPrivacy: gitHistoryPrivacyChecked,
      decryptedVaultScan,
    },
    scanStats: {
      scanRoots,
      currentFilesScanned: files.length,
      trackedTextFilesScanned: trackedFiles.length,
      decryptedVaultRefsCount,
      violationCount: violations.length,
    },
    redaction: {
      violationDetailsIncluded: false,
      titlesIncluded: false,
      authorsIncluded: false,
      decryptedMappingsIncluded: false,
      keyValuesIncluded: false,
    },
  }
  const artifactPath = join(artifactDir, `reference-privacy-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)
  return artifactPath
}

function validateVaultShape() {
  if (!existsSync(vaultPath)) {
    violations.push('docs/product/rules/reference-work-vault.enc.json missing encrypted vault')
    return
  }
  const vault = readJson(vaultPath)
  for (const key of ['algorithm', 'iv', 'tag', 'ciphertext']) {
    if (!vault[key]) violations.push(`docs/product/rules/reference-work-vault.enc.json missing encrypted field: ${key}`)
  }
  for (const forbidden of ['refs', 'titles', 'works', 'items', 'representativeWorks']) {
    if (Object.prototype.hasOwnProperty.call(vault, forbidden)) {
      violations.push(`docs/product/rules/reference-work-vault.enc.json must not contain plaintext field: ${forbidden}`)
    }
  }
}

function validatePublicRefs() {
  if (!existsSync(publicRefsPath)) {
    violations.push('docs/product/rules/reference-work-public-refs.json missing public ref map')
    return new Set()
  }
  const publicRefs = readJson(publicRefsPath)
  const refs = Array.isArray(publicRefs.refs) ? publicRefs.refs : []
  if (Number(publicRefs.refCount || 0) !== refs.length) {
    violations.push('docs/product/rules/reference-work-public-refs.json refCount does not match refs length')
  }
  const ids = new Set()
  for (const ref of refs) {
    const id = String(ref.id || '')
    if (!/^rwref_\d{4}$/.test(id)) {
      violations.push(`docs/product/rules/reference-work-public-refs.json invalid anonymous ref id: ${id || '<missing>'}`)
    }
    if (ids.has(id)) violations.push(`docs/product/rules/reference-work-public-refs.json duplicate ref id: ${id}`)
    ids.add(id)
    for (const key of Object.keys(ref)) {
      if (key !== 'id') {
        violations.push(`docs/product/rules/reference-work-public-refs.json ${id} exposes forbidden public key: ${key}`)
      }
    }
  }
  return ids
}

function validateVaultPublicCount(publicIds) {
  if (!existsSync(vaultPath)) return
  const vault = readJson(vaultPath)
  const vaultRefCount = Number(vault.refCount || 0)
  if (!Number.isFinite(vaultRefCount) || vaultRefCount <= 0) {
    violations.push('docs/product/rules/reference-work-vault.enc.json refCount must be a positive number')
    return
  }
  if (vaultRefCount !== publicIds.size) {
    violations.push('reference-work-vault.enc.json refCount must match reference-work-public-refs.json refCount')
  }
}

function validateDecryptedRefs(refs, publicIds) {
  const vault = existsSync(vaultPath) ? readJson(vaultPath) : {}
  const vaultRefCount = Number(vault.refCount || 0)
  if (vaultRefCount && refs.length !== vaultRefCount) {
    violations.push('decrypted reference vault refs length must match encrypted vault refCount')
  }
  if (refs.length !== publicIds.size) {
    violations.push('decrypted reference vault refs length must match public anonymous ref count')
  }

  const decryptedIds = new Set()
  for (const ref of refs) {
    const id = String(ref.id || '')
    if (!/^rwref_\d{4}$/.test(id)) {
      violations.push(`decrypted reference vault contains invalid anonymous ref id: ${id || '<missing>'}`)
      continue
    }
    if (decryptedIds.has(id)) violations.push(`decrypted reference vault contains duplicate ref id: ${id}`)
    decryptedIds.add(id)
    if (!publicIds.has(id)) {
      violations.push(`decrypted reference vault contains id missing from public refs: ${id}`)
    }
    if (typeof ref.title !== 'string' || ref.title.trim().length < 2) {
      violations.push(`decrypted reference vault ${id} must contain a private title for local-only leak scanning`)
    }
  }

  for (const id of publicIds) {
    if (!decryptedIds.has(id)) {
      violations.push(`public refs contain id missing from decrypted reference vault: ${id}`)
    }
  }
}

function validateRuntimeSourceRefs(publicIds) {
  if (!existsSync(runtimeRulesPath)) {
    violations.push('docs/product/rules/genre-runtime-rules.v1.json missing runtime rule source')
    return
  }
  const runtimeRules = readJson(runtimeRulesPath)
  if (runtimeRules.privacy?.representativeWorks !== 'encrypted_vault_only') {
    violations.push('docs/product/rules/genre-runtime-rules.v1.json privacy.representativeWorks must be encrypted_vault_only')
  }
  if (runtimeRules.privacy?.publicReferenceField !== 'sourceRefs') {
    violations.push('docs/product/rules/genre-runtime-rules.v1.json privacy.publicReferenceField must be sourceRefs')
  }
  for (const section of ['constraintProfiles', 'genreKernels']) {
    const items = Array.isArray(runtimeRules[section]) ? runtimeRules[section] : []
    for (const item of items) {
      for (const ref of item.sourceRefs || []) {
        if (!/^rwref_\d{4}$/.test(String(ref))) {
          violations.push(`docs/product/rules/genre-runtime-rules.v1.json ${section}.${item.id || item.name} has non-anonymous sourceRef: ${ref}`)
        } else if (!publicIds.has(String(ref))) {
          violations.push(`docs/product/rules/genre-runtime-rules.v1.json ${section}.${item.id || item.name} references unknown sourceRef: ${ref}`)
        }
      }
    }
  }
}

function validateMarkdownSourceRefs(publicIds) {
  for (const rel of ['docs/product/rules/GENRE_CONSTRAINT_RULES.md', 'docs/product/rules/GENRE_KERNEL_RULES.md']) {
    const absolute = join(root, rel)
    if (!existsSync(absolute)) continue
    const text = readFileSync(absolute, 'utf8')
    for (const match of text.matchAll(/rwref_\d{4}/g)) {
      if (!publicIds.has(match[0])) {
        violations.push(`${rel}:${lineNumber(text, match.index || 0)} unknown sourceRef in public rule doc: ${match[0]}`)
      }
    }
  }
}

function validatePublicRuleTextNoTitleMarkers() {
  const publicRuleFiles = [
    'docs/product/rules/genre-runtime-rules.v1.json',
    'docs/product/rules/GENRE_CONSTRAINT_RULES.md',
    'docs/product/rules/GENRE_KERNEL_RULES.md',
    'docs/product/rules/reference-work-public-refs.json',
  ]
  for (const rel of publicRuleFiles) {
    const absolute = join(root, rel)
    if (!existsSync(absolute)) continue
    const text = readFileSync(absolute, 'utf8')
    for (const match of text.matchAll(/《[^》]{1,80}》/g)) {
      violations.push(`${rel}:${lineNumber(text, match.index || 0)} public rule artifact must not expose representative work title marker: ${match[0]}`)
    }
    const authorMarker = text.match(/代表作|代表作品|作品名|书名|作者名|authorName|workTitle|representativeWorkTitle/)
    if (authorMarker?.index !== undefined) {
      violations.push(`${rel}:${lineNumber(text, authorMarker.index)} public rule artifact must not expose representative work title/author metadata`)
    }
  }
}

function validateNoCommittedVaultKey() {
  for (const file of trackedFiles) {
    const rel = relative(root, file)
    if (/reference-work-vault\.key$|\/private\/|^private\//.test(rel)) {
      violations.push(`${rel} must not be committed; keep reference vault keys outside the public repository`)
      continue
    }
    const text = readFileSync(file, 'utf8')
    const keyAssignments = [
      /^\s*REFERENCE_WORK_VAULT_KEY\s*=\s*["']?[A-Za-z0-9+/=]{32,}["']?\s*$/gm,
      /["']REFERENCE_WORK_VAULT_KEY["']\s*:\s*["'][A-Za-z0-9+/=]{32,}["']/g,
      /^\s*reference_work_vault_key\s*:\s*["']?[A-Za-z0-9+/=]{32,}["']?\s*$/gim,
    ]
    for (const pattern of keyAssignments) {
      const match = text.match(pattern)
      if (match) {
        violations.push(`${rel} appears to contain a committed REFERENCE_WORK_VAULT_KEY value`)
        break
      }
    }
  }
}

function validateCurrentTextFilesAgainstVault(refs) {
  const currentTextFiles = uniqueFiles([
    ...trackedFiles,
    ...files.filter(isTextCandidate),
  ])
  for (const file of currentTextFiles) {
    const rel = relative(root, file)
    if (rel === 'docs/product/rules/reference-work-vault.enc.json') continue
    if (!existsSync(file) || !isTextCandidate(file)) continue
    const text = readFileSync(file, 'utf8')
    for (const ref of refs) {
      if (!ref.title || ref.title.length < 2) continue
      const index = text.indexOf(ref.title)
      if (index >= 0) {
        violations.push(`${rel}:${lineNumber(text, index)} encrypted representative work title appears in public current file`)
      }
    }
  }
}

function validateGitHistoryPrivacy(refs) {
  let objectRows = []
  try {
    objectRows = gitOutput(['rev-list', '--objects', '--all'])
      .toString('utf8')
      .split(/\r?\n/)
      .filter(Boolean)
  } catch {
    return
  }
  gitHistoryPrivacyChecked = true

  const objectsBySha = new Map()
  for (const row of objectRows) {
    const [sha, ...pathParts] = row.split(' ')
    const objectPath = pathParts.join(' ')
    if (!sha || !objectPath) continue
    if (!objectsBySha.has(sha)) objectsBySha.set(sha, new Set())
    objectsBySha.get(sha).add(objectPath)
  }

  const publicRuleArtifacts = new Set([
    'docs/product/rules/genre-runtime-rules.v1.json',
    'docs/product/rules/GENRE_CONSTRAINT_RULES.md',
    'docs/product/rules/GENRE_KERNEL_RULES.md',
    'docs/product/rules/reference-work-public-refs.json',
  ])
  const titleMarker = /《[^》]{1,80}》/g
  const metadataMarker = /代表作|代表作品|作品名|书名|作者名|authorName|workTitle|representativeWorkTitle/
  const keyAssignments = [
    /^\s*REFERENCE_WORK_VAULT_KEY\s*=\s*["']?[A-Za-z0-9+/=]{32,}["']?\s*$/gm,
    /["']REFERENCE_WORK_VAULT_KEY["']\s*:\s*["'][A-Za-z0-9+/=]{32,}["']/g,
    /^\s*reference_work_vault_key\s*:\s*["']?[A-Za-z0-9+/=]{32,}["']?\s*$/gim,
  ]

  for (const [sha, pathSet] of objectsBySha.entries()) {
    const paths = [...pathSet]
    for (const objectPath of paths) {
      if (/reference-work-vault\.key$|\/private\/|^private\//.test(objectPath)) {
        violations.push(`${objectPath} appears in git history; keep reference vault keys outside the public repository`)
      }
    }
    if (!paths.some(isTextCandidate)) continue

    let type = ''
    try {
      type = gitOutput(['cat-file', '-t', sha]).toString('utf8').trim()
    } catch {
      continue
    }
    if (type !== 'blob') continue

    let size = 0
    try {
      size = Number(gitOutput(['cat-file', '-s', sha]).toString('utf8').trim())
    } catch {
      continue
    }
    if (!Number.isFinite(size) || size > 4 * 1024 * 1024) continue

    let buffer
    try {
      buffer = gitOutput(['cat-file', '-p', sha], { maxBuffer: Math.max(8 * 1024 * 1024, size + 1024) })
    } catch {
      continue
    }
    if (!isLikelyTextBuffer(buffer)) continue
    const text = buffer.toString('utf8')

    for (const pattern of keyAssignments) {
      if (pattern.test(text)) {
        violations.push(`${paths[0]} appears to contain a concrete REFERENCE_WORK_VAULT_KEY value in git history`)
        break
      }
    }

    for (const objectPath of paths) {
      if (!publicRuleArtifacts.has(objectPath)) continue
      for (const match of text.matchAll(titleMarker)) {
        violations.push(`${objectPath}:${lineNumber(text, match.index || 0)} public rule artifact history must not expose title marker`)
      }
      const marker = text.match(metadataMarker)
      if (marker?.index !== undefined) {
        violations.push(`${objectPath}:${lineNumber(text, marker.index)} public rule artifact history must not expose title/author metadata`)
      }
    }

    if (refs.length) {
      for (const ref of refs) {
        if (!ref.title || ref.title.length < 2) continue
        const index = text.indexOf(ref.title)
        if (index >= 0) {
          violations.push(`${paths[0]}:${lineNumber(text, index)} encrypted representative work title appears in git history`)
        }
      }
    }
  }
}

validateVaultShape()
const publicIds = validatePublicRefs()
validateVaultPublicCount(publicIds)
validateRuntimeSourceRefs(publicIds)
validateMarkdownSourceRefs(publicIds)
validatePublicRuleTextNoTitleMarkers()
validateNoCommittedVaultKey()

for (const file of files) {
  const rel = relative(root, file)
  if (allowedFiles.has(rel)) continue
  if (!isTextCandidate(file)) continue
  const text = readFileSync(file, 'utf8')
  const sourceEvidenceMatch = text.match(/source_evidence\s*:\s*(?!rwref_)[^\n\r]+/)
  if (sourceEvidenceMatch?.index !== undefined) {
    violations.push(`${rel}:${lineNumber(text, sourceEvidenceMatch.index)} source_evidence must use encrypted rwref IDs only`)
  }
}

try {
  const refs = decryptVault()
  decryptedVaultRefsCount = refs.length
  decryptedVaultScan = refs.length > 0
  if (refs.length) validateDecryptedRefs(refs, publicIds)
  validateCurrentTextFilesAgainstVault(refs)
  validateGitHistoryPrivacy(refs)
} catch (error) {
  violations.push(`reference-work-vault decrypt failed: ${error instanceof Error ? error.message : String(error)}`)
}

const artifactPath = writePrivacyArtifact(violations.length ? 'failed' : 'passed', publicIds)

if (violations.length) {
  console.error(`reference privacy scan failed (${violations.length}); artifact: ${relative(root, artifactPath)}`)
  for (const violation of violations.slice(0, 80)) console.error(`- ${violation}`)
  if (violations.length > 80) console.error(`... ${violations.length - 80} more`)
  process.exit(1)
}

console.log(JSON.stringify({
  status: 'passed',
  artifact: relative(root, artifactPath),
  publicRefCount: publicIds.size,
  currentFilesScanned: files.length,
  trackedTextFilesScanned: trackedFiles.length,
  decryptedVaultScan,
  gitHistoryPrivacyChecked,
}, null, 2))
