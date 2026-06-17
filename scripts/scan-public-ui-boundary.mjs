#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)

const scanEntries = [
  'app/src/pages/Home.tsx',
  'app/src/pages/Library.tsx',
  'app/src/pages/Story.tsx',
  'app/src/pages/Create.tsx',
  'app/src/pages/Welcome.tsx',
  'app/src/components/design-system',
  'app/src/components/patterns',
  'app/src/features/creator',
  'app/src/features/market',
]

const allowedFiles = new Set([
  'app/src/components/design-system/CapabilityMapPanel.tsx',
  'app/src/components/design-system/StudioTrendOpsPanel.tsx',
])

const blockedTerms = [
  'runtimeRules',
  'runtime_rules',
  'profileCount',
  'profile_count',
  'kernelCount',
  'kernel_count',
  'representativeWorks',
  'representative_works',
  'sourceRefs',
  'source_refs',
  'genre_constraint_facts',
  'activeConstraints',
  'activeKernels',
  'sourceLabels',
  'runTrace',
  'harness_trace',
  'canon_written',
  'branch_written',
  'rawHash',
  'StateVector',
  'AgentRun',
  'CHANGES JSON',
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
        if (['node_modules', 'dist', '.git'].includes(child)) continue
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
const files = scanEntries.flatMap(collectFiles)

for (const file of files) {
  const rel = relative(root, file)
  if (allowedFiles.has(rel)) continue
  const text = readFileSync(file, 'utf8')
  for (const term of blockedTerms) {
    let start = 0
    while (true) {
      const index = text.indexOf(term, start)
      if (index === -1) break
      violations.push(`${rel}:${lineNumber(text, index)} public UI must not consume runtime/debug field: ${term}`)
      start = index + term.length
    }
  }
}

if (violations.length) {
  console.error(`public UI boundary scan failed (${violations.length})`)
  for (const violation of violations.slice(0, 80)) console.error(`- ${violation}`)
  if (violations.length > 80) console.error(`... ${violations.length - 80} more`)
  process.exit(1)
}

console.log('public UI boundary scan passed')
