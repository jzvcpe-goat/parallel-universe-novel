#!/usr/bin/env node
import { createDecipheriv } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const vaultPath = join(root, 'docs/product/rules/reference-work-vault.enc.json')
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
