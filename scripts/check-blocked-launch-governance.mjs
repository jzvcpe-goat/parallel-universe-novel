#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const root = join(new URL('.', import.meta.url).pathname, '..')
const failures = []

function fail(message) {
  failures.push(message)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

function readRequired(path, label = path) {
  assert(existsSync(path), `${label} is missing`)
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

function readJsonRequired(path, label = path) {
  const body = readRequired(path, label)
  try {
    return JSON.parse(body)
  } catch (error) {
    fail(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
    return {}
  }
}

const dashboardPath = join(root, 'docs/product/P29_BLOCKED_LAUNCH_GOVERNANCE_DASHBOARD_20260613.md')
const ledgerPath = join(root, 'artifacts/integration/p29-blocked-launch-evidence-ledger.json')
const p13Path = join(root, 'docs/product/P13_EIGHT_HOUR_ACCEPTANCE_CHECKLIST_20260612.md')
const handoffPath = join(root, 'PARALLEL_UNIVERSE_PROTOTYPE_HANDOFF.md')
const notesPath = join(root, 'docs/design-system/DEVELOPMENT_NOTES.md')

const dashboard = readRequired(dashboardPath, 'P29 governance dashboard')
for (const required of [
  'public paid production launch: blocked',
  'preview / staging testing: allowed',
  'Machine-readable ledger',
  'Governance Summary',
  'Evidence Ledger Contract',
  'Update Protocol',
  'Provisioning Entry Criteria',
  'Do not merge `apps/web`',
  'P30 Recommendation',
]) {
  assert(dashboard.includes(required), `P29 governance dashboard is missing ${required}`)
}

const ledger = readJsonRequired(ledgerPath, 'P29 evidence ledger')
assert(ledger.name === 'p29-blocked-launch-evidence-ledger', 'P29 ledger must have the expected name')
assert(ledger.decision?.public_paid_production_launch === 'blocked', 'P29 ledger must keep public paid production launch blocked')
assert(ledger.decision?.preview_staging_testing === 'allowed', 'P29 ledger must allow preview / staging testing')
assert(ledger.frontend_policy?.current_frontend === 'app', 'P29 ledger must preserve current frontend source of truth')
assert(ledger.frontend_policy?.external_frontend_merge_approved === false, 'P29 ledger must reject external frontend merge')
assert(ledger.review_cadence?.gate_command === 'npm --prefix app run check:governance', 'P29 ledger must name the governance gate command')

const requiredAreas = new Set([
  'product_alias',
  'vercel_env_cors',
  'database_recovery',
  'payment_provider',
  'privacy_legal',
  'security_review',
  'rollback',
])
const entries = Array.isArray(ledger.entries) ? ledger.entries : []
assert(entries.length === requiredAreas.size, 'P29 ledger must contain one entry per governance area')
for (const entry of entries) {
  assert(requiredAreas.has(entry.area), `P29 ledger contains unexpected area ${entry.area}`)
  assert(entry.status === 'blocked', `P29 ledger area ${entry.area} must remain blocked until acceptance artifacts exist`)
  assert(typeof entry.owner === 'string' && entry.owner.length > 0, `P29 ledger area ${entry.area} must have owner`)
  assert(Array.isArray(entry.missing_inputs) && entry.missing_inputs.length > 0, `P29 ledger area ${entry.area} must list missing inputs`)
  assert(typeof entry.blocked_reason === 'string' && entry.blocked_reason.length > 0, `P29 ledger area ${entry.area} must have blocked reason`)
  assert(typeof entry.next_action === 'string' && entry.next_action.length > 0, `P29 ledger area ${entry.area} must have next action`)
  assert(typeof entry.acceptance_artifact === 'string' && entry.acceptance_artifact.startsWith('artifacts/integration/'), `P29 ledger area ${entry.area} must name an acceptance artifact path`)
  for (const evidence of entry.current_evidence || []) {
    assert(existsSync(join(root, evidence)), `P29 ledger evidence is missing for ${entry.area}: ${evidence}`)
  }
}

for (const sourceArtifact of ledger.source_artifacts || []) {
  assert(existsSync(join(root, sourceArtifact)), `P29 source artifact is missing: ${sourceArtifact}`)
}

const combined = [dashboard, JSON.stringify(ledger)].join('\n')
for (const forbidden of [
  'public paid production launch: ready',
  'public_paid_production_launch": "ready"',
  'external_frontend_merge_approved": true',
  'merge apps/web',
  'apps/web is approved',
]) {
  assert(!combined.includes(forbidden), `P29 governance materials contain forbidden claim: ${forbidden}`)
}

const secretPatterns = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /whsec_[A-Za-z0-9_-]{20,}/,
  /(?:OPENAI_API_KEY|KIMI_API_KEY|MOONSHOT_API_KEY)=\S+/,
  /DATABASE_URL=.*:\/\/[^<\n ]+:[^<\n ]+@/,
  /WEBHOOK_SECRET=\S+/,
]
for (const pattern of secretPatterns) {
  assert(!pattern.test(combined), 'P29 governance materials appear to contain a secret-like value')
}

const p13 = readRequired(p13Path, 'P13 eight-hour checklist')
for (const required of ['P29: Blocked launch governance dashboard', 'p29-blocked-launch-evidence-ledger.json', 'check:governance']) {
  assert(p13.includes(required), `P13 checklist is missing P29 learning: ${required}`)
}

const handoff = readRequired(handoffPath, 'prototype handoff')
for (const required of ['P29 blocked launch governance dashboard', 'P29_BLOCKED_LAUNCH_GOVERNANCE_DASHBOARD_20260613.md', 'check-blocked-launch-governance.mjs']) {
  assert(handoff.includes(required), `Prototype handoff is missing P29 handoff entry: ${required}`)
}

const notes = readRequired(notesPath, 'development notes')
for (const required of ['P29 blocked launch governance dashboard', 'evidence ledger', 'check-blocked-launch-governance.mjs']) {
  assert(notes.includes(required), `Development notes are missing P29 system lesson: ${required}`)
}

if (failures.length) {
  console.error('[blocked-launch-governance] failed')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[blocked-launch-governance] PASS')
