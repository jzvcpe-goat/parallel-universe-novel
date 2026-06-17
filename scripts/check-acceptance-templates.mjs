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

const indexPath = join(root, 'docs/product/P31_ACCEPTANCE_ARTIFACT_TEMPLATE_PACK_20260613.md')
const matrixPath = join(root, 'artifacts/integration/p30-owner-escalation-matrix.json')
const templateDir = join(root, 'artifacts/integration/p31-acceptance-templates')
const p13Path = join(root, 'docs/product/P13_EIGHT_HOUR_ACCEPTANCE_CHECKLIST_20260612.md')
const handoffPath = join(root, 'PARALLEL_UNIVERSE_PROTOTYPE_HANDOFF.md')
const notesPath = join(root, 'docs/design-system/DEVELOPMENT_NOTES.md')

const index = readRequired(indexPath, 'P31 acceptance template index')
for (const required of [
  'Acceptance Artifact Template Pack',
  'public paid production launch: blocked',
  'preview / staging testing: allowed',
  'Template directory',
  'Fill Rules',
  'npm --prefix app run check:templates',
  'P32 Recommendation',
]) {
  assert(index.includes(required), `P31 template index is missing ${required}`)
}

const matrix = readJsonRequired(matrixPath, 'P30 owner escalation matrix')
const requiredFinalArtifacts = new Set((matrix.escalations || []).map((entry) => entry.required_artifact))
const templates = [
  'product-alias-approval.template.json',
  'vercel-domain-env-cors-acceptance.template.json',
  'production-database-recovery-acceptance.template.json',
  'payment-provider-acceptance.template.json',
  'privacy-legal-signoff.template.json',
  'security-signoff.template.json',
  'rollback-rehearsal-acceptance.template.json',
]

const combined = [index]
for (const templateFile of templates) {
  const path = join(templateDir, templateFile)
  const template = readJsonRequired(path, `P31 template ${templateFile}`)
  combined.push(JSON.stringify(template))
  assert(template.status === 'pending', `${templateFile} must default to pending`)
  assert(template.public_paid_production_launch === 'blocked', `${templateFile} must keep production launch blocked`)
  assert(template.preview_staging_testing === 'allowed', `${templateFile} must allow preview / staging testing`)
  assert(template.external_frontend_merge_approved === false, `${templateFile} must reject external frontend merge`)
  assert(requiredFinalArtifacts.has(template.final_artifact_path), `${templateFile} final artifact path must match P30 matrix`)
  assert(typeof template.owner === 'string' && template.owner.length > 0, `${templateFile} must name owner`)
  assert(typeof template.secret_policy === 'string' && template.secret_policy.includes('Do not'), `${templateFile} must include secret policy`)
  assert(template.fields && typeof template.fields === 'object', `${templateFile} must include fields object`)
  assert(typeof template.fields.verification_output_path === 'string' || typeof template.fields.rollback_rehearsal_output_path === 'string', `${templateFile} must include verification output path`)
}
assert(templates.length === requiredFinalArtifacts.size, 'P31 must provide one template per P30 required artifact')

const combinedText = combined.join('\n')
for (const forbidden of [
  'public paid production launch: ready',
  'public_paid_production_launch": "ready"',
  'external_frontend_merge_approved": true',
  'merge apps/web',
  'apps/web is approved',
]) {
  assert(!combinedText.includes(forbidden), `P31 templates contain forbidden claim: ${forbidden}`)
}

const secretPatterns = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /whsec_[A-Za-z0-9_-]{20,}/,
  /(?:OPENAI_API_KEY|KIMI_API_KEY|MOONSHOT_API_KEY)=\S+/,
  /DATABASE_URL=.*:\/\/[^<\n ]+:[^<\n ]+@/,
  /WEBHOOK_SECRET=\S+/,
]
for (const pattern of secretPatterns) {
  assert(!pattern.test(combinedText), 'P31 templates appear to contain a secret-like value')
}

const p13 = readRequired(p13Path, 'P13 eight-hour checklist')
for (const required of ['P31: Production owner acceptance artifact template pack', 'p31-acceptance-templates', 'check:templates']) {
  assert(p13.includes(required), `P13 checklist is missing P31 learning: ${required}`)
}

const handoff = readRequired(handoffPath, 'prototype handoff')
for (const required of ['P31 acceptance artifact template pack', 'P31_ACCEPTANCE_ARTIFACT_TEMPLATE_PACK_20260613.md', 'check-acceptance-templates.mjs']) {
  assert(handoff.includes(required), `Prototype handoff is missing P31 handoff entry: ${required}`)
}

const notes = readRequired(notesPath, 'development notes')
for (const required of ['P31 acceptance artifact template pack', 'p31-acceptance-templates', 'check-acceptance-templates.mjs']) {
  assert(notes.includes(required), `Development notes are missing P31 system lesson: ${required}`)
}

if (failures.length) {
  console.error('[acceptance-templates] failed')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[acceptance-templates] PASS')
