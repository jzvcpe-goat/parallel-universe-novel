#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))

const knownIdentities = [
  {
    marker: '/workspaces/integration-harness',
    name: 'integration-harness',
    description: 'Reuse-first NarrativeOS integration harness for Creator Studio, FastAPI runtime, and Mastra agent orchestration.',
  },
  {
    marker: '/releases/parallel-universe-novel-github',
    name: 'parallel-universe-novel',
    description: '平行宇宙小说 Creator Studio, FastAPI runtime, and Mastra agent orchestration.',
  },
]

const identity = knownIdentities.find(item => root.includes(item.marker))

if (!identity) {
  console.log(JSON.stringify({
    status: 'skipped',
    reason: 'unknown_workspace_identity',
    root,
    packageName: pkg.name,
  }, null, 2))
  process.exit(0)
}

const violations = []
if (pkg.name !== identity.name) {
  violations.push(`expected package name ${identity.name}, got ${pkg.name}`)
}
if (pkg.description !== identity.description) {
  violations.push(`expected package description "${identity.description}", got "${pkg.description}"`)
}

if (violations.length) {
  console.error(`package identity check failed for ${root}`)
  for (const violation of violations) console.error(`- ${violation}`)
  process.exit(1)
}

console.log(JSON.stringify({
  status: 'passed',
  root,
  packageName: pkg.name,
}, null, 2))
