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

const ownerBoardPath = join(root, 'docs/product/P28_BLOCKED_LAUNCH_REVIEW_OWNER_BOARD_20260613.md')
const meetingBriefPath = join(root, 'docs/product/P28_LAUNCH_REVIEW_MEETING_BRIEF_20260613.md')
const schemaPath = join(root, 'artifacts/integration/p28-production-resource-intake.schema.json')
const p13Path = join(root, 'docs/product/P13_EIGHT_HOUR_ACCEPTANCE_CHECKLIST_20260612.md')
const handoffPath = join(root, 'PARALLEL_UNIVERSE_PROTOTYPE_HANDOFF.md')
const notesPath = join(root, 'docs/design-system/DEVELOPMENT_NOTES.md')

const ownerBoard = readRequired(ownerBoardPath, 'P28 owner board')
for (const required of [
  'Public paid production launch remains blocked',
  'blocked; preview / staging testing may continue',
  'current product frontend remains the Vite + React + TypeScript app',
  'Product Owner: Production Alias Decision',
  'Ops Team: Vercel Domains, Env and CORS',
  'Backend Team: Persistent Database, Migration and Recovery',
  'Payment Owner: Provider Operations',
  'Legal / Privacy Owner: Policy and Data Rights',
  'Security Owner: Launch Security Review',
  'p28-production-resource-intake.schema.json',
  'Do not commit real secrets',
]) {
  assert(ownerBoard.includes(required), `P28 owner board is missing ${required}`)
}

const meetingBrief = readRequired(meetingBriefPath, 'P28 launch review meeting brief')
for (const required of [
  'public paid production launch: blocked',
  'preview / staging testing: allowed',
  'not a UI review and not a merge review for another frontend',
  'Required Attendees',
  'Go Criteria',
  'No-Go Criteria',
  'Commands That Must Not Run Automatically',
  'P29: Production provisioning execution approved',
  'P29: Blocked launch governance dashboard required',
]) {
  assert(meetingBrief.includes(required), `P28 launch review meeting brief is missing ${required}`)
}

const schema = readJsonRequired(schemaPath, 'P28 production resource intake schema')
assert(schema.title === 'P28 Production Resource Intake', 'P28 intake schema must have the expected title')
assert(schema.properties?.decision?.properties?.public_paid_production_launch?.const === 'blocked', 'P28 intake schema must keep production launch blocked')
assert(schema.properties?.decision?.properties?.preview_staging_testing?.const === 'allowed', 'P28 intake schema must allow preview / staging testing')
assert(schema.properties?.no_duplicate_frontend?.properties?.current_frontend?.const === 'app', 'P28 intake schema must preserve current frontend source of truth')
assert(schema.properties?.no_duplicate_frontend?.properties?.external_frontend_merge_approved?.const === false, 'P28 intake schema must reject external frontend merge by default')

for (const ownerKey of ['frontend', 'api', 'database', 'payment', 'privacy_legal', 'security', 'rollback']) {
  assert(schema.required?.includes(ownerKey), `P28 intake schema must require ${ownerKey}`)
}

const combined = [ownerBoard, meetingBrief, JSON.stringify(schema)].join('\n')
for (const forbidden of [
  'public paid production launch: ready',
  'public_paid_production_launch": "ready"',
  'external_frontend_merge_approved": true',
  'apps/web is approved',
  'merge apps/web',
]) {
  assert(!combined.includes(forbidden), `P28 materials contain forbidden launch or frontend claim: ${forbidden}`)
}

const secretPatterns = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /whsec_[A-Za-z0-9_-]{20,}/,
  /(?:OPENAI_API_KEY|KIMI_API_KEY|MOONSHOT_API_KEY)=\S+/,
  /DATABASE_URL=.*:\/\/[^<\n ]+:[^<\n ]+@/,
  /WEBHOOK_SECRET=\S+/,
]
for (const pattern of secretPatterns) {
  assert(!pattern.test(combined), 'P28 materials appear to contain a secret-like value')
}

const p13 = readRequired(p13Path, 'P13 eight-hour checklist')
for (const required of ['P28: Blocked launch review owner board', 'p28-production-resource-intake.schema.json', 'check:launch-review']) {
  assert(p13.includes(required), `P13 checklist is missing P28 learning: ${required}`)
}

const handoff = readRequired(handoffPath, 'prototype handoff')
for (const required of ['P28 blocked launch review owner board', 'P28_LAUNCH_REVIEW_MEETING_BRIEF_20260613.md', 'check-launch-review-intake.mjs']) {
  assert(handoff.includes(required), `Prototype handoff is missing P28 handoff entry: ${required}`)
}

const notes = readRequired(notesPath, 'development notes')
for (const required of ['P28 blocked launch review', 'owner card', 'production resource intake', 'check-launch-review-intake.mjs']) {
  assert(notes.includes(required), `Development notes are missing P28 system lesson: ${required}`)
}

if (failures.length) {
  console.error('[launch-review-intake] failed')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[launch-review-intake] PASS')
