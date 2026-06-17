#!/usr/bin/env node
import { createDecipheriv } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const vaultPath = join(root, 'docs/product/rules/reference-work-vault.enc.json')
const publicRefsPath = join(root, 'docs/product/rules/reference-work-public-refs.json')
const runtimeRulesPath = join(root, 'docs/product/rules/genre-runtime-rules.v1.json')
const defaultKeyPath = '/Users/james/Documents/PUF/private/reference-work-vault.key'

const scanRoots = [
  'packages/agent-runtime/src',
  'backend/src/narrativeos',
  'app/src',
  'docs/product/rules',
  'docs/product/breakpoints',
]

const allowedFiles = new Set([
  'docs/product/rules/reference-work-vault.enc.json',
  'docs/product/rules/reference-work-public-refs.json',
  'docs/product/rules/REFERENCE_WORK_PRIVACY.md',
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

function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length
}

const violations = []
const files = allScanFiles()

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
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
      if (!['id', 'source_pdfs'].includes(key)) {
        violations.push(`docs/product/rules/reference-work-public-refs.json ${id} exposes forbidden public key: ${key}`)
      }
    }
    const sourcePdfs = Array.isArray(ref.source_pdfs) ? ref.source_pdfs : []
    for (const sourcePdf of sourcePdfs) {
      if (!String(sourcePdf).endsWith('.pdf')) {
        violations.push(`docs/product/rules/reference-work-public-refs.json ${id} has invalid source pdf label`)
      }
    }
  }
  return ids
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

validateVaultShape()
const publicIds = validatePublicRefs()
validateRuntimeSourceRefs(publicIds)
validateMarkdownSourceRefs(publicIds)
validatePublicRuleTextNoTitleMarkers()

for (const file of files) {
  const rel = relative(root, file)
  if (allowedFiles.has(rel)) continue
  const text = readFileSync(file, 'utf8')
  const sourceEvidenceMatch = text.match(/source_evidence\s*:\s*(?!rwref_)[^\n\r]+/)
  if (sourceEvidenceMatch?.index !== undefined) {
    violations.push(`${rel}:${lineNumber(text, sourceEvidenceMatch.index)} source_evidence must use encrypted rwref IDs only`)
  }
}

try {
  const refs = decryptVault()
  for (const file of files) {
    const rel = relative(root, file)
    if (allowedFiles.has(rel)) continue
    const text = readFileSync(file, 'utf8')
    for (const ref of refs) {
      if (!ref.title || ref.title.length < 2) continue
      const index = text.indexOf(ref.title)
      if (index >= 0) {
        violations.push(`${rel}:${lineNumber(text, index)} encrypted representative work title appears in public source`)
      }
    }
  }
} catch (error) {
  violations.push(`reference-work-vault decrypt failed: ${error instanceof Error ? error.message : String(error)}`)
}

if (violations.length) {
  console.error(`reference privacy scan failed (${violations.length})`)
  for (const violation of violations.slice(0, 80)) console.error(`- ${violation}`)
  if (violations.length > 80) console.error(`... ${violations.length - 80} more`)
  process.exit(1)
}

console.log('reference privacy scan passed')
