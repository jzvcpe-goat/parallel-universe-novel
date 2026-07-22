#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const matrixPath = 'docs/launch/043_SLICE_OWNERSHIP_MATRIX.md'
const matrix = readFileSync(join(root, matrixPath), 'utf8')
const failures = []

function extractAllowlist() {
  const marker = '## Current Compatibility Allowlist'
  const start = matrix.indexOf(marker)
  if (start === -1) return []
  const blockStart = matrix.indexOf('```text', start)
  const blockEnd = matrix.indexOf('```', blockStart + 1)
  if (blockStart === -1 || blockEnd === -1) return []
  return matrix
    .slice(blockStart + '```text'.length, blockEnd)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

const allowlist = extractAllowlist()

function isAllowed(path) {
  return allowlist.includes(path)
}

function walk(path, files = []) {
  const absolute = join(root, path)
  if (!existsSync(absolute)) return files
  const stat = statSync(absolute)
  if (stat.isFile()) {
    files.push(path)
    return files
  }
  for (const entry of readdirSync(absolute)) {
    if (entry === 'node_modules' || entry === '.git' || entry.startsWith('dist')) continue
    walk(join(path, entry), files)
  }
  return files
}

const files = [
  ...walk('app/src'),
].filter((path) => /\.(tsx?|mjs|json)$/.test(path))

const oldFramingPattern = /(请求队列|今日创作(?!路径)|发布检查|创作设置|(?<!list)CreatorRequest|(?<!list)CreatorPublish(?!Bundle)|publishChapter)/

if (allowlist.length === 0) {
  failures.push(`${matrixPath} has no current compatibility allowlist`)
}

if (new Set(allowlist).size !== allowlist.length) {
  failures.push(`${matrixPath} contains duplicate compatibility allowlist entries`)
}

for (const path of allowlist) {
  if (!path.startsWith('app/src/')) {
    failures.push(`${path} is outside the app/src scan boundary and must not be allowlisted here`)
    continue
  }
  const absolute = join(root, path)
  if (!existsSync(absolute) || !statSync(absolute).isFile()) {
    failures.push(`${path} is missing or is not a file`)
    continue
  }
  const body = readFileSync(absolute, 'utf8')
  if (!oldFramingPattern.test(body)) {
    failures.push(`${path} no longer contains classified compatibility framing and must leave the allowlist`)
  }
}

for (const path of files) {
  if (isAllowed(path)) continue
  const body = readFileSync(join(root, path), 'utf8')
  if (oldFramingPattern.test(body)) {
    failures.push(`${path} contains old Creator request/publish framing but is not classified in ${matrixPath}`)
  }
}

if (failures.length) {
  console.error('[no-old-request-framing] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[no-old-request-framing] PASS (${files.length} files scanned, ${allowlist.length} classified compatibility owners)`)
