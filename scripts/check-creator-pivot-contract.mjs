#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const failures = []

function read(path) {
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) {
    failures.push(`Missing ${path}`)
    return ''
  }
  return readFileSync(absolute, 'utf8')
}

function requireIncludes(path, marker, label = marker) {
  const body = read(path)
  if (!body.includes(marker)) failures.push(`${path} missing ${label}`)
}

function requireAll(path, markers) {
  const body = read(path)
  for (const marker of markers) {
    if (!body.includes(marker)) failures.push(`${path} missing ${marker}`)
  }
}

requireAll('docs/product/creator-pivot-v2-contract.md', [
  'working-agent-operable localhost writing space',
  'External Echo',
  'CreativeReminder',
  'Publish bundles',
  'Reader remains non-generative',
])

requireAll('AGENTS.md', [
  'Creator Pivot V2 Rules',
  'Do not redesign Creator pages before the relevant contract',
  '<unrelated-project>',
])

requireAll('app/src/features/creator-pivot/featureFlags.ts', [
  'creatorPivotV2: false',
  'creatorEcho: false',
  'localWritingLibrary: false',
  'publishBundles: false',
  'agentSurface: false',
  'stuckRescue: false',
])

requireIncludes('docs/data-contracts/local-creator-storage-v2.md', 'IndexedDB / Dexie', 'local storage target')
requireIncludes('docs/data-contracts/publish-bundle-v2.md', 'P0 does not claim automated external platform publishing', 'external publishing boundary')
requireIncludes('docs/agent-protocol/creator-agent-action-surface.md', 'High-risk actions must expose confirmation gates', 'agent confirmation boundary')

if (failures.length) {
  console.error('[creator-pivot-contract] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[creator-pivot-contract] PASS')
