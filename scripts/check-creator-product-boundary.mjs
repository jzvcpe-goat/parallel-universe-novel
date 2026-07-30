#!/usr/bin/env node
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
  'system prompt',
  'raw hash',
  'service switches',
  '预览版',
]

const requiredProductTerms = [
  {
    file: 'app/src/components/creator/CreatorWorkspacePreferencesPanel.tsx',
    terms: ['显示偏好', '减少动态效果', '重置显示偏好'],
  },
  {
    file: 'app/src/apps/creator/routes/CreatorPublishBundleRoute.tsx',
    terms: ['发布未完成，正文仍', '发布包确认'],
  },
  {
    file: 'app/src/apps/creator/routes/CreatorEditorManuscriptStage.tsx',
    terms: ['进入发布检查', '只保存草稿'],
  },
  {
    file: 'app/src/components/creator/workspace/CreatorAgentAssistantPanels.tsx',
    terms: ['候选建议'],
  },
  {
    file: 'app/src/components/creator/workspace/CreatorInlineAssistantPanels.tsx',
    terms: ['采纳后影响'],
  },
]

function collectFiles(path) {
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) return []
  const stat = statSync(absolute)
  if (stat.isFile()) return [absolute]
  return readdirSync(absolute)
    .flatMap(name => collectFiles(join(path, name)))
    .filter(file => /\.(tsx?|jsx?)$/.test(file))
}

function isLikelyNonVisibleString(line) {
  return [
    'import ',
    'export ',
    'className=',
    'className:',
    'data-',
    'aria-',
    'id=',
    'key=',
    'href:',
    'path:',
    'pathname',
    'querySelector',
    'localStorage',
    'from(',
    '.from(',
    'code:',
    'type:',
  ].some(marker => line.includes(marker))
}

function visibleFragments(body) {
  const fragments = []
  function looksLikeCodeFragment(text) {
    return /=>|\bconst\b|\blet\b|\bfunction\b|\buseState\b|\bnew URLSearchParams\b|\bPmf[A-Z]\w*\b|\bPromise\b|;\s*$/.test(text)
  }

  for (const match of body.matchAll(/>([^<>{}][^<>{}]*)</g)) {
    const text = (match[1] || '').trim()
    if (looksLikeCodeFragment(text)) continue
    if (text) fragments.push({ text, index: match.index || 0 })
  }

  for (const match of body.matchAll(/(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g)) {
    const index = match.index || 0
    const lineStart = body.lastIndexOf('\n', index) + 1
    const lineEnd = body.indexOf('\n', index)
    const line = body.slice(lineStart, lineEnd === -1 ? body.length : lineEnd).trim()
    const text = match[2] || ''
    if (!text.trim()) continue
    if (isLikelyNonVisibleString(line)) continue
    if (looksLikeCodeFragment(text)) continue
    if (/^[.@\w/:-]+$/.test(text)) continue
    if (text.length > 260) continue
    fragments.push({ text, index })
  }

  return fragments
}

function lineForIndex(body, index) {
  return body.slice(0, index).split(/\r?\n/).length
}

const findings = []

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

for (const requirement of requiredProductTerms) {
  const body = readFileSync(resolve(root, requirement.file), 'utf8')
  for (const term of requirement.terms) {
    if (!body.includes(term)) {
      findings.push({
        file: requirement.file,
        line: 0,
        term,
        text: `Missing required Creator product term: ${term}`,
      })
    }
  }
}

if (findings.length) {
  console.error('[creator-product-boundary] Creator product boundary violations found')
  for (const finding of findings) {
    const location = finding.line > 0 ? `${finding.file}:${finding.line}` : finding.file
    console.error(`${location} ${finding.term} :: ${finding.text}`)
  }
  process.exit(1)
}

console.log(`[creator-product-boundary] PASS (${targets.length} target groups)`)
