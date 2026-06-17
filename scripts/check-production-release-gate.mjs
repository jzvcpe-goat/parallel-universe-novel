#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const root = join(new URL('.', import.meta.url).pathname, '..')

function fail(message) {
  console.error(`[production-release-gate] ${message}`)
  process.exitCode = 1
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

const p26DocPath = join(root, 'docs/product/P26_PUBLIC_PRODUCTION_RELEASE_GATE_20260613.md')
const p25DocPath = join(root, 'docs/product/P25_DEPLOYMENT_EXECUTION_ROLLBACK_REHEARSAL_20260613.md')
const p13Path = join(root, 'docs/product/P13_EIGHT_HOUR_ACCEPTANCE_CHECKLIST_20260612.md')
const handoffPath = join(root, 'PARALLEL_UNIVERSE_PROTOTYPE_HANDOFF.md')
const notesPath = join(root, 'docs/design-system/DEVELOPMENT_NOTES.md')
const auditPath = join(root, 'artifacts/integration/p26-production-resource-audit.json')
const vercelConfigPath = join(root, 'app/vercel.json')

const p26Doc = readRequired(p26DocPath, 'P26 production release gate doc')
for (const required of [
  'P26 is blocked for public paid production launch',
  'Vite + React + TypeScript',
  'artifacts/integration/p26-production-resource-audit.json',
  'Persistent Database',
  'Domain and CORS',
  'Vercel Env',
  'Payment Provider',
  'Privacy, Legal and Security',
  'Do not run these without product-owner approval',
  'P27 Recommendation',
]) {
  assert(p26Doc.includes(required), `P26 doc is missing ${required}`)
}

const p25Doc = readRequired(p25DocPath, 'P25 deployment rehearsal doc')
assert(p25Doc.includes('preview / staging deployment rehearsal'), 'P25 doc must keep preview/staging boundary clear')
assert(p25Doc.includes('not approval for public paid production launch'), 'P25 doc must not imply production launch approval')

const p13 = readRequired(p13Path, 'P13 eight-hour checklist')
assert(p13.includes('P26: Public production release gate'), 'P13 checklist must include P26')
assert(p13.includes('Promote nothing automatically from P25'), 'P13 checklist must preserve no-auto-promotion rule')

const handoff = readRequired(handoffPath, 'prototype handoff')
assert(handoff.includes('P25 production deployment execution and rollback rehearsal'), 'Handoff must include P25 deployment result before P26')
assert(handoff.includes('P26 public production release gate'), 'Handoff must include P26 production release gate')
assert(handoff.includes('public paid production launch is blocked'), 'Handoff must preserve the P26 blocked production decision')

const notes = readRequired(notesPath, 'development notes')
assert(notes.includes('P25 部署执行必须把 preview、RC 和 production 分清'), 'Development notes must preserve P25 preview/production lesson')
assert(notes.includes('P26 生产发布门禁必须允许明确 blocked'), 'Development notes must preserve P26 blocked-gate lesson')

const audit = readJsonRequired(auditPath, 'P26 resource audit')
assert(audit.decision === 'blocked', 'P26 audit decision must remain blocked until real production resources exist')
assert(audit.result?.can_promote_public_paid_production === false, 'P26 audit must not allow public paid production promotion')
assert(audit.resource_audit?.vercel_domains?.domains_found === 0, 'P26 audit must record current missing custom domains')
assert(audit.resource_audit?.vercel_app_env?.env_vars_found === 0, 'P26 audit must record current missing frontend project env')
assert(audit.resource_audit?.vercel_api_env?.env_vars_found === 0, 'P26 audit must record current missing API project env')
for (const key of ['persistent_database', 'payment_provider', 'privacy_legal', 'security_audit', 'production_alias_approval']) {
  assert(audit.resource_audit?.[key]?.status === 'blocked', `P26 audit must mark ${key} as blocked`)
}

const vercelConfig = readJsonRequired(vercelConfigPath, 'frontend Vercel config')
const headerEntries = (vercelConfig.headers || []).flatMap((entry) => entry.headers || [])
const headerKeys = new Set(headerEntries.map((header) => header.key))
for (const header of ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy']) {
  assert(headerKeys.has(header), `Frontend Vercel config is missing security header ${header}`)
}

if (!process.exitCode) {
  console.log('[production-release-gate] PASS')
}
