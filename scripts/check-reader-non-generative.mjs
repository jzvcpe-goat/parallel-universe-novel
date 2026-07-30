#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = process.cwd()
const targets = [
  'app/src/apps/reader',
  'app/src/components/reader',
  'app/src/pages/Home.tsx',
  'app/src/pages/Library.tsx',
  'app/src/pages/Story.tsx',
  'app/src/pages/Account.tsx',
  'app/src/lib/pmfSupabaseReader.ts',
]
const forbidden = [
  '写作助手',
  '云端生成',
  '生成正文',
  '个人分支已生成',
  '模型',
  'LLM',
  'system prompt',
  'provider response',
  '/creator/login',
  '/creator/editor',
  '/creator/publish',
]
const failures = []

function collect(path) {
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) return []
  const stat = statSync(absolute)
  if (stat.isFile()) return [absolute]
  return readdirSync(absolute).flatMap(name => collect(join(path, name)))
}

for (const file of targets.flatMap(collect).filter(file => /\.(tsx?|jsx?)$/.test(file))) {
  const body = readFileSync(file, 'utf8')
  for (const marker of forbidden) {
    if (body.includes(marker)) failures.push(`${relative(root, file)} contains Reader generative/internal marker: ${marker}`)
  }
}

if (failures.length) {
  console.error('[reader-non-generative] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[reader-non-generative] PASS')
