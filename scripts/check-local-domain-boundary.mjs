#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const failures = []

const domainRoots = [
  'app/src/agent-surface',
  'app/src/features/creator-pivot',
  'app/src/local-db',
]

const cloudAdapterPath = 'app/src/features/creator-pivot/publishBundleAdapter.ts'

function collectSourceFiles(path) {
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) {
    failures.push(`Missing local-domain root: ${path}`)
    return []
  }

  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = `${path}/${entry.name}`
    if (entry.isDirectory()) return collectSourceFiles(child)
    if (!entry.isFile() || !/\.(?:ts|tsx)$/.test(entry.name)) return []
    return [child]
  })
}

const files = domainRoots.flatMap(collectSourceFiles)
const cloudDependencyPattern = /(?:from\s+|import\s*\()\s*['"](?:@\/lib\/(?:pmfSupabase|supabase)|@supabase\/supabase-js)['"]/
const directNetworkPatterns = [
  [/\bgetSupabaseBrowserClient\b/, 'the browser Supabase client'],
  [/\bcreateClient\s*\(/, 'a direct Supabase client constructor'],
  [/\bfetch\s*\(/, 'fetch()'],
  [/\bnew\s+(?:WebSocket|EventSource|XMLHttpRequest)\b/, 'a direct browser network transport'],
]

for (const path of files) {
  const body = readFileSync(resolve(root, path), 'utf8')
  if (path !== cloudAdapterPath && cloudDependencyPattern.test(body)) {
    failures.push(`${path} imports a cloud facade or Supabase client outside the named cloud adapter`)
  }
  for (const [pattern, description] of directNetworkPatterns) {
    if (pattern.test(body)) failures.push(`${path} uses ${description} inside a local/domain owner`)
  }
}

if (!files.includes(cloudAdapterPath)) {
  failures.push(`Missing named cloud adapter: ${cloudAdapterPath}`)
} else {
  const adapter = readFileSync(resolve(root, cloudAdapterPath), 'utf8')
  for (const marker of [
    "import type {",
    "from '@/lib/pmfSupabase'",
    "await import('@/lib/pmfSupabase')",
    'publishBundleTransaction(input)',
  ]) {
    if (!adapter.includes(marker)) failures.push(`${cloudAdapterPath} missing ${marker}`)
  }
  for (const [pattern, description] of directNetworkPatterns) {
    if (pattern.test(adapter)) failures.push(`${cloudAdapterPath} bypasses the facade with ${description}`)
  }
}

if (failures.length) {
  console.error('[local-domain-boundary] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[local-domain-boundary] PASS (${files.length} local/domain files, 1 named cloud adapter)`)
