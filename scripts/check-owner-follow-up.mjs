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

const docPath = join(root, 'docs/product/P33_EXTERNAL_OWNER_FOLLOW_UP_LOG_20260613.md')
const ledgerPath = join(root, 'artifacts/integration/p33-external-owner-follow-up-ledger.json')
const intakeStatusPath = join(root, 'artifacts/integration/p32-acceptance-artifact-intake-status.json')
const p13Path = join(root, 'docs/product/P13_EIGHT_HOUR_ACCEPTANCE_CHECKLIST_20260612.md')
const handoffPath = join(root, 'PARALLEL_UNIVERSE_PROTOTYPE_HANDOFF.md')
const notesPath = join(root, 'docs/design-system/DEVELOPMENT_NOTES.md')

const doc = readRequired(docPath, 'P33 owner follow-up doc')
for (const required of [
  'External Owner Follow-Up Log',
  'public paid production launch: blocked',
  'preview / staging testing: allowed',
  'waiting_on_owner',
  'Escalation Rule',
  'P34 Recommendation',
]) {
  assert(doc.includes(required), `P33 follow-up doc is missing ${required}`)
}

const ledger = readJsonRequired(ledgerPath, 'P33 follow-up ledger')
const intakeStatus = readJsonRequired(intakeStatusPath, 'P32 intake status')
assert(ledger.name === 'p33-external-owner-follow-up-ledger', 'P33 ledger must have expected name')
assert(ledger.decision?.public_paid_production_launch === 'blocked', 'P33 ledger must keep production launch blocked')
assert(ledger.decision?.preview_staging_testing === 'allowed', 'P33 ledger must allow preview / staging testing')
assert(ledger.source_intake_status === 'artifacts/integration/p32-acceptance-artifact-intake-status.json', 'P33 ledger must reference P32 intake status')
assert(ledger.source_template_directory === 'artifacts/integration/p31-acceptance-templates/', 'P33 ledger must reference P31 templates')
assert(ledger.frontend_policy?.current_frontend === 'app', 'P33 ledger must preserve current frontend')
assert(ledger.frontend_policy?.external_frontend_merge_approved === false, 'P33 ledger must reject external frontend merge')

const expectedArtifacts = new Set((intakeStatus.entries || []).map((entry) => entry.expected_artifact))
const followUps = Array.isArray(ledger.follow_ups) ? ledger.follow_ups : []
assert(followUps.length === expectedArtifacts.size, 'P33 ledger must contain one follow-up per P32 expected artifact')
for (const followUp of followUps) {
  assert(expectedArtifacts.has(followUp.required_artifact), `P33 follow-up references unexpected artifact ${followUp.required_artifact}`)
  assert(followUp.follow_up_status === 'waiting_on_owner', `P33 follow-up ${followUp.area} must wait on owner until artifact is submitted`)
  assert(followUp.ledger_impact === 'blocked', `P33 follow-up ${followUp.area} must keep ledger impact blocked`)
  assert(typeof followUp.contact_placeholder === 'string' && followUp.contact_placeholder.startsWith('<'), `P33 follow-up ${followUp.area} must use contact placeholder`)
  assert(typeof followUp.next_review_at === 'string' && followUp.next_review_at === '<next-review-at>', `P33 follow-up ${followUp.area} must use next review placeholder`)
  assert(typeof followUp.blocked_release_impact === 'string' && followUp.blocked_release_impact.length > 0, `P33 follow-up ${followUp.area} must state blocked impact`)
}

const combined = [doc, JSON.stringify(ledger)].join('\n')
for (const forbidden of [
  'public paid production launch: ready',
  'public_paid_production_launch": "ready"',
  'external_frontend_merge_approved": true',
  'merge apps/web',
  'apps/web is approved',
]) {
  assert(!combined.includes(forbidden), `P33 follow-up materials contain forbidden claim: ${forbidden}`)
}

const secretPatterns = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /whsec_[A-Za-z0-9_-]{20,}/,
  /(?:OPENAI_API_KEY|KIMI_API_KEY|MOONSHOT_API_KEY)=\S+/,
  /DATABASE_URL=.*:\/\/[^<\n ]+:[^<\n ]+@/,
  /WEBHOOK_SECRET=\S+/,
]
for (const pattern of secretPatterns) {
  assert(!pattern.test(combined), 'P33 follow-up materials appear to contain a secret-like value')
}

const p13 = readRequired(p13Path, 'P13 eight-hour checklist')
for (const required of ['P33: External owner follow-up log', 'p33-external-owner-follow-up-ledger.json', 'check:follow-up']) {
  assert(p13.includes(required), `P13 checklist is missing P33 learning: ${required}`)
}

const handoff = readRequired(handoffPath, 'prototype handoff')
for (const required of ['P33 external owner follow-up log', 'P33_EXTERNAL_OWNER_FOLLOW_UP_LOG_20260613.md', 'check-owner-follow-up.mjs']) {
  assert(handoff.includes(required), `Prototype handoff is missing P33 handoff entry: ${required}`)
}

const notes = readRequired(notesPath, 'development notes')
for (const required of ['P33 external owner follow-up log', 'waiting_on_owner', 'check-owner-follow-up.mjs']) {
  assert(notes.includes(required), `Development notes are missing P33 system lesson: ${required}`)
}

if (failures.length) {
  console.error('[owner-follow-up] failed')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[owner-follow-up] PASS')
