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

const docPath = join(root, 'docs/product/P32_ACCEPTANCE_ARTIFACT_INTAKE_VALIDATOR_20260613.md')
const statusPath = join(root, 'artifacts/integration/p32-acceptance-artifact-intake-status.json')
const p13Path = join(root, 'docs/product/P13_EIGHT_HOUR_ACCEPTANCE_CHECKLIST_20260612.md')
const handoffPath = join(root, 'PARALLEL_UNIVERSE_PROTOTYPE_HANDOFF.md')
const notesPath = join(root, 'docs/design-system/DEVELOPMENT_NOTES.md')

const doc = readRequired(docPath, 'P32 intake validator doc')
for (const required of [
  'Acceptance Artifact Intake Validator',
  'public paid production launch: blocked',
  'preview / staging testing: allowed',
  'Missing artifacts are not a script failure',
  'npm --prefix app run check:intake',
  'P33 Recommendation',
]) {
  assert(doc.includes(required), `P32 intake validator doc is missing ${required}`)
}

const status = readJsonRequired(statusPath, 'P32 intake status')
assert(status.name === 'p32-acceptance-artifact-intake-status', 'P32 status must have expected name')
assert(status.decision?.public_paid_production_launch === 'blocked', 'P32 status must keep public paid production launch blocked')
assert(status.decision?.preview_staging_testing === 'allowed', 'P32 status must allow preview / staging testing')
assert(status.frontend_policy?.current_frontend === 'app', 'P32 status must preserve current frontend')
assert(status.frontend_policy?.external_frontend_merge_approved === false, 'P32 status must reject external frontend merge')

const entries = Array.isArray(status.entries) ? status.entries : []
assert(entries.length === 7, 'P32 status must contain seven expected artifact entries')

const secretPatterns = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /whsec_[A-Za-z0-9_-]{20,}/,
  /(?:OPENAI_API_KEY|KIMI_API_KEY|MOONSHOT_API_KEY)=\S+/,
  /DATABASE_URL=.*:\/\/[^<\n ]+:[^<\n ]+@/,
  /WEBHOOK_SECRET=\S+/,
]

function assertNoSecrets(body, label) {
  for (const pattern of secretPatterns) {
    assert(!pattern.test(body), `${label} appears to contain a secret-like value`)
  }
}

assertNoSecrets([doc, JSON.stringify(status)].join('\n'), 'P32 intake materials')

for (const entry of entries) {
  assert(typeof entry.area === 'string' && entry.area.length > 0, 'P32 entry must have area')
  assert(typeof entry.owner === 'string' && entry.owner.length > 0, `P32 entry ${entry.area} must have owner`)
  assert(typeof entry.expected_artifact === 'string' && entry.expected_artifact.startsWith('artifacts/integration/'), `P32 entry ${entry.area} must name expected artifact`)
  assert(typeof entry.template === 'string' && entry.template.includes('p31-acceptance-templates'), `P32 entry ${entry.area} must reference P31 template`)
  assert(existsSync(join(root, entry.template)), `P32 entry ${entry.area} template is missing`)

  const artifactExists = existsSync(join(root, entry.expected_artifact))
  if (!artifactExists) {
    assert(entry.submission_status === 'missing', `P32 entry ${entry.area} must be missing when artifact does not exist`)
    assert(entry.validation_result === 'not_submitted', `P32 entry ${entry.area} must be not_submitted when artifact does not exist`)
    assert(entry.ledger_impact === 'blocked', `P32 entry ${entry.area} must keep ledger impact blocked when artifact is missing`)
    continue
  }

  assert(entry.submission_status === 'submitted', `P32 entry ${entry.area} must be submitted when artifact exists`)
  const artifact = readJsonRequired(join(root, entry.expected_artifact), `P32 submitted artifact ${entry.expected_artifact}`)
  const artifactBody = JSON.stringify(artifact)
  assertNoSecrets(artifactBody, `P32 submitted artifact ${entry.expected_artifact}`)
  assert(artifact.public_paid_production_launch === 'blocked', `P32 submitted artifact ${entry.expected_artifact} must not approve production alone`)
  assert(artifact.external_frontend_merge_approved === false, `P32 submitted artifact ${entry.expected_artifact} must not approve external frontend`)
  assert(typeof artifact.owner === 'string' && artifact.owner.length > 0, `P32 submitted artifact ${entry.expected_artifact} must name owner`)
  assert(typeof artifact.fields?.approval_timestamp === 'string' && artifact.fields.approval_timestamp.length > 0, `P32 submitted artifact ${entry.expected_artifact} must include approval timestamp`)
  const verificationPath = artifact.fields?.verification_output_path || artifact.fields?.rollback_rehearsal_output_path
  assert(typeof verificationPath === 'string' && verificationPath.startsWith('artifacts/integration/'), `P32 submitted artifact ${entry.expected_artifact} must include verification output path`)
}

const combined = [doc, JSON.stringify(status)].join('\n')
for (const forbidden of [
  'public paid production launch: ready',
  'public_paid_production_launch": "ready"',
  'external_frontend_merge_approved": true',
  'merge apps/web',
  'apps/web is approved',
]) {
  assert(!combined.includes(forbidden), `P32 intake materials contain forbidden claim: ${forbidden}`)
}

const p13 = readRequired(p13Path, 'P13 eight-hour checklist')
for (const required of ['P32: Submitted acceptance artifact intake validator', 'p32-acceptance-artifact-intake-status.json', 'check:intake']) {
  assert(p13.includes(required), `P13 checklist is missing P32 learning: ${required}`)
}

const handoff = readRequired(handoffPath, 'prototype handoff')
for (const required of ['P32 acceptance artifact intake validator', 'P32_ACCEPTANCE_ARTIFACT_INTAKE_VALIDATOR_20260613.md', 'check-acceptance-intake.mjs']) {
  assert(handoff.includes(required), `Prototype handoff is missing P32 handoff entry: ${required}`)
}

const notes = readRequired(notesPath, 'development notes')
for (const required of ['P32 acceptance artifact intake validator', 'missing artifacts are not a script failure', 'check-acceptance-intake.mjs']) {
  assert(notes.includes(required), `Development notes are missing P32 system lesson: ${required}`)
}

if (failures.length) {
  console.error('[acceptance-intake] failed')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[acceptance-intake] PASS')
