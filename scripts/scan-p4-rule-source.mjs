#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)

const scanRoots = [
  'packages/agent-runtime/src',
  'backend/src/narrativeos/services/creator_dialogue.py',
  'backend/src/narrativeos/services/market_trends.py',
  'backend/tests/test_creator_dialogue_api.py',
  'backend/tests/test_market_trends_api.py',
  'app/src/features/market',
  'app/src/features/parallel-universe/data.ts',
  'docs/product/rules',
  'docs/product/breakpoints/00_NARRATIVE_RUNTIME_ENGINE.md',
  'docs/product/reviews/BACKEND_COMPLETE_ASSET_REUSE_REVIEW_20260615.md',
  'docs/design-system/DEVELOPMENT_NOTES.md',
]

const retiredTerms = [
  'western-dungeon-crossing',
  'black-gate-translator',
  '西幻穿越',
  '西方玄幻',
  '非游戏化',
  '古代官署',
  '清河县',
  '仵作',
  '县衙',
]

function collectFiles(entry) {
  const absolute = join(root, entry)
  if (!existsSync(absolute)) return []
  const stat = statSync(absolute)
  if (stat.isFile()) return [absolute]
  const files = []
  function walk(current) {
    for (const child of readdirSync(current)) {
      const full = join(current, child)
      const childStat = statSync(full)
      if (childStat.isDirectory()) {
        if (['node_modules', 'dist', '.git', '.venv'].includes(child)) continue
        walk(full)
      } else {
        files.push(full)
      }
    }
  }
  walk(absolute)
  return files
}

function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length
}

const violations = []
const files = scanRoots.flatMap(collectFiles)

for (const file of files) {
  const text = readFileSync(file, 'utf8')
  for (const term of retiredTerms) {
    const index = text.indexOf(term)
    if (index >= 0) {
      violations.push(`${relative(root, file)}:${lineNumber(text, index)} retired P4 one-off term appears: ${term}`)
    }
  }
}

if (violations.length) {
  console.error(`P4 rule source scan failed (${violations.length})`)
  for (const violation of violations.slice(0, 80)) console.error(`- ${violation}`)
  if (violations.length > 80) console.error(`... ${violations.length - 80} more`)
  process.exit(1)
}

console.log('P4 rule source scan passed')
