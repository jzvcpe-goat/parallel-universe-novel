#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = process.cwd()
const targets = [
  'app/src/features/creator-pivot',
  'app/src/agent-surface',
  'app/src/local-db',
]
const failures = []

function collect(path) {
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) return []
  const stat = statSync(absolute)
  if (stat.isFile()) return [absolute]
  return readdirSync(absolute).flatMap(name => collect(join(path, name)))
}

for (const file of targets.flatMap(collect).filter(file => /\.(tsx?|jsx?|css)$/.test(file))) {
  const relativePath = relative(root, file)
  const body = readFileSync(file, 'utf8')
  if (/\.css$/.test(file)) failures.push(`${relativePath} is page-local CSS; add tokens/components instead`)
  if (/import\s+['"].+\.css['"]/.test(body)) failures.push(`${relativePath} imports page-local CSS`)
  if (/style=\{\{/.test(body)) failures.push(`${relativePath} uses inline style`)
}

const contract = readFileSync(resolve(root, 'docs/product/creator-pivot-v2-contract.md'), 'utf8')
if (!contract.includes('Atomic UI system')) failures.push('pivot contract must include Atomic UI system milestone')

if (failures.length) {
  console.error('[no-page-local-css] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[no-page-local-css] PASS')
