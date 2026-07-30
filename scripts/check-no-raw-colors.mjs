#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = process.cwd()
const targets = [
  'app/src/apps/creator',
  'app/src/components/creator',
  'app/src/features/creator-pivot',
  'app/src/agent-surface',
  'app/src/local-db',
]
const failures = []
const rawColorPattern = /(?:#[0-9a-fA-F]{3,8}|bg-\[#|text-\[#|border-\[#|stroke="#|fill="#)/

function collect(path) {
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) return []
  const stat = statSync(absolute)
  if (stat.isFile()) return [absolute]
  return readdirSync(absolute).flatMap(name => collect(join(path, name)))
}

for (const file of targets.flatMap(collect).filter(file => /\.(tsx?|jsx?)$/.test(file))) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  lines.forEach((line, index) => {
    if (rawColorPattern.test(line)) failures.push(`${relative(root, file)}:${index + 1} raw color marker`)
  })
}

if (failures.length) {
  console.error('[no-raw-colors] FAIL')
  for (const failure of failures.slice(0, 80)) console.error(`- ${failure}`)
  if (failures.length > 80) console.error(`... ${failures.length - 80} more`)
  process.exit(1)
}

console.log('[no-raw-colors] PASS')
