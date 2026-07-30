import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const targets = [
  'app/src/apps/creator',
  'app/src/components/creator',
  'app/src/lib/pmfSupabase.ts',
]

const bannedTerms = [
  'Supabase',
  'RLS',
  'trace',
  'provider',
  'fallback',
  'API key',
  '后端',
  '接口',
  '同步',
  '回写',
  '数据库',
  'AI',
  '模型',
  'LLM',
]

type Finding = {
  file: string
  line: number
  term: string
  text: string
}

function collectFiles(path: string): string[] {
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) return []
  const stat = statSync(absolute)
  if (stat.isFile()) return [absolute]
  return readdirSync(absolute)
    .flatMap(name => collectFiles(join(path, name)))
    .filter(file => /\.(tsx?|jsx?)$/.test(file))
}

function visibleFragments(body: string) {
  const fragments: Array<{ text: string; index: number }> = []
  function looksLikeCodeFragment(text: string) {
    return /=>|\bconst\b|\blet\b|\bfunction\b|\buseState\b|\bnew URLSearchParams\b|\bset[A-Z]\w*\b|;\s*$/.test(text)
  }
  for (const match of body.matchAll(/(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g)) {
    const index = match.index || 0
    const lineStart = body.lastIndexOf('\n', index) + 1
    const lineEnd = body.indexOf('\n', index)
    const line = body.slice(lineStart, lineEnd === -1 ? body.length : lineEnd).trim()
    const before = body.slice(Math.max(0, index - 2), index)
    const after = body.slice(index + match[0].length, index + match[0].length + 2)
    if (/^(import|export)\s/.test(line)) continue
    if (/\bfrom\s+['"`]/.test(line) && /^[.@\w/-]+$/.test(match[2] || '')) continue
    if (before.endsWith('[') && after.startsWith(']')) continue
    fragments.push({ text: match[2] || '', index: match.index || 0 })
  }
  for (const match of body.matchAll(/>([^<>{}][^<>{}]*)</g)) {
    const text = match[1] || ''
    const index = match.index || 0
    const lineStart = body.lastIndexOf('\n', index) + 1
    const lineEnd = body.indexOf('\n', index)
    const line = body.slice(lineStart, lineEnd === -1 ? body.length : lineEnd).trim()
    if (/^(export\s+)?(async\s+)?function\b|^(export\s+)?(interface|type)\b|^\w+\s*<[^>]+>/.test(line)) continue
    if (looksLikeCodeFragment(text)) continue
    fragments.push({ text, index })
  }
  return fragments
}

function lineForIndex(body: string, index: number) {
  return body.slice(0, index).split(/\r?\n/).length
}

const findings: Finding[] = []

for (const file of targets.flatMap(collectFiles)) {
  const body = readFileSync(file, 'utf8')
  for (const fragment of visibleFragments(body)) {
    for (const term of bannedTerms) {
      if (fragment.text.includes(term)) {
        findings.push({
          file: relative(root, file),
          line: lineForIndex(body, fragment.index),
          term,
          text: fragment.text.trim().replace(/\s+/g, ' ').slice(0, 180),
        })
      }
    }
  }
}

if (findings.length) {
  console.error('[ui-copy] banned Creator UI copy found')
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} ${finding.term} :: ${finding.text}`)
  }
  process.exit(1)
}

console.log(`[ui-copy] PASS (${targets.length} target groups)`)
