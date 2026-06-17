#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function latestLedgerPath() {
  assert(existsSync(artifactDir), 'runtime artifact directory is missing; run audit:live-runtime-readiness first')
  const files = readdirSync(artifactDir)
    .filter(name => /^live-runtime-readiness-.*\.json$/.test(name))
    .sort()
  assert(files.length > 0, 'no live runtime readiness ledger found; run audit:live-runtime-readiness first')
  return join(artifactDir, files[files.length - 1])
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function walk(value, visit, path = []) {
  visit(path, value)
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visit, [...path, String(index)]))
    return
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) walk(child, visit, [...path, key])
  }
}

const ledgerPath = latestLedgerPath()
const ledger = readJson(ledgerPath)
const packageJson = readJson(join(root, 'package.json'))
const workflow = readFileSync(join(root, '.github/workflows/pages.yml'), 'utf8')

const requiredTopLevel = [
  'generatedAt',
  'status',
  'required',
  'repo',
  'publicUrl',
  'repoVariables',
  'runtimeConfig',
  'health',
  'checks',
  'blockedChecks',
  'commands',
]

for (const key of requiredTopLevel) {
  assert(Object.hasOwn(ledger, key), `readiness ledger missing top-level key: ${key}`)
}

assert(['ready', 'blocked'].includes(ledger.status), `invalid readiness ledger status: ${ledger.status}`)
assert(!Number.isNaN(Date.parse(ledger.generatedAt)), 'readiness ledger generatedAt must be ISO-like')
assert(typeof ledger.required === 'boolean', 'readiness ledger required must be boolean')
assert(ledger.repo === 'jzvcpe-goat/parallel-universe-novel', `unexpected readiness repo: ${ledger.repo}`)
assert(
  ledger.publicUrl === 'https://jzvcpe-goat.github.io/parallel-universe-novel/#/create',
  `unexpected publicUrl: ${ledger.publicUrl}`,
)
assert(
  ledger.repoVariables && typeof ledger.repoVariables.checked === 'boolean',
  'repoVariables.checked must be present',
)
assert(ledger.runtimeConfig && typeof ledger.runtimeConfig === 'object', 'runtimeConfig must be an object')
assert(ledger.health && typeof ledger.health === 'object', 'health must be an object')
assert(ledger.health.api && ledger.health.agent, 'health must include api and agent sections')
assert(Array.isArray(ledger.checks) && ledger.checks.length >= 7, 'checks must include runtime readiness checks')
assert(Array.isArray(ledger.blockedChecks), 'blockedChecks must be an array')
assert(ledger.commands && typeof ledger.commands === 'object', 'commands must be an object')

const checkIds = new Set(ledger.checks.map(item => item.id))
for (const requiredCheck of [
  'public-runtime-mode',
  'api-origin',
  'agent-origin',
  'api-base-url',
  'local-fallback-disabled',
  'api-health',
  'agent-health',
]) {
  assert(checkIds.has(requiredCheck), `readiness ledger missing check: ${requiredCheck}`)
}

for (const item of ledger.checks) {
  assert(typeof item.id === 'string' && item.id, 'readiness check id must be non-empty')
  assert(['passed', 'blocked'].includes(item.status), `invalid check status for ${item.id}: ${item.status}`)
  assert(typeof item.detail === 'string', `readiness check ${item.id} detail must be string`)
  assert(typeof item.nextAction === 'string', `readiness check ${item.id} nextAction must be string`)
}

if (ledger.status === 'ready') {
  assert(ledger.blockedChecks.length === 0, 'ready ledger must not contain blockedChecks')
} else {
  assert(ledger.blockedChecks.length > 0, 'blocked ledger must explain blockedChecks')
}

const forbiddenKeyPattern = /(api.?key|secret|password|token|authorization|cookie|database.?url|system.?prompt|provider|model|raw.?state|representative|source.?refs|vault)/i
const forbiddenValuePattern = /(sk-[A-Za-z0-9_-]{10,}|DATABASE_URL=|BEGIN (RSA|OPENSSH|PRIVATE) KEY|system prompt|provider secret|reference-work-vault|representative work)/i
const violations = []

walk(ledger, (path, value) => {
  const key = path[path.length - 1] || ''
  if (forbiddenKeyPattern.test(key)) {
    violations.push(`forbidden key ${path.join('.')}`)
  }
  if (typeof value === 'string' && forbiddenValuePattern.test(value)) {
    violations.push(`forbidden value at ${path.join('.')}`)
  }
})

assert(violations.length === 0, `readiness ledger privacy violations:\n${violations.join('\n')}`)

assert(
  packageJson.scripts['check:runtime-readiness-ledger'] === 'node scripts/check-runtime-readiness-ledger.mjs',
  'package.json must expose check:runtime-readiness-ledger',
)
assert(
  String(packageJson.scripts.test).includes('npm run audit:live-runtime-readiness && npm run check:runtime-readiness-ledger'),
  'npm run test must validate the readiness ledger immediately after generating it',
)
assert(
  workflow.includes('Upload runtime readiness ledger')
    && workflow.includes('runtime-readiness-ledger'),
  'GitHub Pages workflow must upload the validated readiness ledger artifact',
)

console.log(JSON.stringify({
  status: 'passed',
  ledgerPath,
  readinessStatus: ledger.status,
  checkCount: ledger.checks.length,
  blockedChecks: ledger.blockedChecks,
}, null, 2))
