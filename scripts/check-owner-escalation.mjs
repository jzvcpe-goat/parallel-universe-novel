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

const docPath = join(root, 'docs/product/P30_OWNER_ESCALATION_GOVERNANCE_MAINTENANCE_20260613.md')
const matrixPath = join(root, 'artifacts/integration/p30-owner-escalation-matrix.json')
const ledgerPath = join(root, 'artifacts/integration/p29-blocked-launch-evidence-ledger.json')
const ownerBoardPath = join(root, 'docs/product/P28_BLOCKED_LAUNCH_REVIEW_OWNER_BOARD_20260613.md')
const p13Path = join(root, 'docs/product/P13_EIGHT_HOUR_ACCEPTANCE_CHECKLIST_20260612.md')
const handoffPath = join(root, 'PARALLEL_UNIVERSE_PROTOTYPE_HANDOFF.md')
const notesPath = join(root, 'docs/design-system/DEVELOPMENT_NOTES.md')

const doc = readRequired(docPath, 'P30 owner escalation doc')
for (const required of [
  'public paid production launch: blocked',
  'preview / staging testing: allowed',
  'Escalation Summary',
  'Owner Messages',
  'Governance Maintenance Protocol',
  'npm --prefix app run check:escalation',
  'P31 Recommendation',
]) {
  assert(doc.includes(required), `P30 owner escalation doc is missing ${required}`)
}

const matrix = readJsonRequired(matrixPath, 'P30 owner escalation matrix')
const ledger = readJsonRequired(ledgerPath, 'P29 evidence ledger')
assert(existsSync(ownerBoardPath), 'P28 owner board must exist for P30 escalation')
assert(matrix.name === 'p30-owner-escalation-matrix', 'P30 matrix must have the expected name')
assert(matrix.decision?.public_paid_production_launch === 'blocked', 'P30 matrix must keep public paid production launch blocked')
assert(matrix.decision?.preview_staging_testing === 'allowed', 'P30 matrix must allow preview / staging testing')
assert(matrix.source_ledger === 'artifacts/integration/p29-blocked-launch-evidence-ledger.json', 'P30 matrix must reference the P29 ledger')
assert(matrix.source_owner_board === 'docs/product/P28_BLOCKED_LAUNCH_REVIEW_OWNER_BOARD_20260613.md', 'P30 matrix must reference the P28 owner board')
assert(matrix.frontend_policy?.current_frontend === 'app', 'P30 matrix must preserve current frontend source of truth')
assert(matrix.frontend_policy?.external_frontend_merge_approved === false, 'P30 matrix must reject external frontend merge')

const ledgerAreas = new Set((ledger.entries || []).map((entry) => entry.area))
const escalations = Array.isArray(matrix.escalations) ? matrix.escalations : []
assert(escalations.length === ledgerAreas.size, 'P30 matrix must contain one escalation per P29 ledger area')
for (const escalation of escalations) {
  assert(ledgerAreas.has(escalation.ledger_area), `P30 escalation references unknown ledger area ${escalation.ledger_area}`)
  assert(escalation.severity === 'launch-blocking', `P30 escalation ${escalation.ledger_area} must remain launch-blocking`)
  assert(typeof escalation.owner === 'string' && escalation.owner.length > 0, `P30 escalation ${escalation.ledger_area} must have owner`)
  assert(typeof escalation.required_artifact === 'string' && escalation.required_artifact.startsWith('artifacts/integration/'), `P30 escalation ${escalation.ledger_area} must name required artifact`)
  assert(typeof escalation.escalation_message === 'string' && escalation.escalation_message.length > 0, `P30 escalation ${escalation.ledger_area} must have message`)
  assert(typeof escalation.blocked_release_impact === 'string' && escalation.blocked_release_impact.length > 0, `P30 escalation ${escalation.ledger_area} must have release impact`)
}

const combined = [doc, JSON.stringify(matrix)].join('\n')
for (const forbidden of [
  'public paid production launch: ready',
  'public_paid_production_launch": "ready"',
  'external_frontend_merge_approved": true',
  'merge apps/web',
  'apps/web is approved',
]) {
  assert(!combined.includes(forbidden), `P30 escalation materials contain forbidden claim: ${forbidden}`)
}

const secretPatterns = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /whsec_[A-Za-z0-9_-]{20,}/,
  /(?:OPENAI_API_KEY|KIMI_API_KEY|MOONSHOT_API_KEY)=\S+/,
  /DATABASE_URL=.*:\/\/[^<\n ]+:[^<\n ]+@/,
  /WEBHOOK_SECRET=\S+/,
]
for (const pattern of secretPatterns) {
  assert(!pattern.test(combined), 'P30 escalation materials appear to contain a secret-like value')
}

const p13 = readRequired(p13Path, 'P13 eight-hour checklist')
for (const required of ['P30: Owner escalation and governance maintenance', 'p30-owner-escalation-matrix.json', 'check:escalation']) {
  assert(p13.includes(required), `P13 checklist is missing P30 learning: ${required}`)
}

const handoff = readRequired(handoffPath, 'prototype handoff')
for (const required of ['P30 owner escalation and governance maintenance', 'P30_OWNER_ESCALATION_GOVERNANCE_MAINTENANCE_20260613.md', 'check-owner-escalation.mjs']) {
  assert(handoff.includes(required), `Prototype handoff is missing P30 handoff entry: ${required}`)
}

const notes = readRequired(notesPath, 'development notes')
for (const required of ['P30 owner escalation', 'escalation matrix', 'check-owner-escalation.mjs']) {
  assert(notes.includes(required), `Development notes are missing P30 system lesson: ${required}`)
}

if (failures.length) {
  console.error('[owner-escalation] failed')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[owner-escalation] PASS')
