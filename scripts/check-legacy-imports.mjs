#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const scanRoots = ['app/src', 'package.json']
const forbidden = [
  '<legacy-integration-harness>',
  '<external-artifacts-root>',
  '<legacy-static-ui-reference>',
  '<legacy-novel-package>',
  'artifacts/handoff',
  'frontend-source',
  'frontend-touchpoints',
]
const failures = []

function walk(path, files = []) {
  const absolute = join(root, path)
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

const files = scanRoots.flatMap((path) => walk(path))

for (const path of files) {
  const body = readFileSync(join(root, path), 'utf8')
  for (const marker of forbidden) {
    if (body.includes(marker)) {
      failures.push(`${relative(root, join(root, path))} references forbidden legacy source ${marker}`)
    }
  }
}

if (failures.length) {
  console.error('[legacy-imports] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[legacy-imports] PASS (${files.length} files scanned)`)
