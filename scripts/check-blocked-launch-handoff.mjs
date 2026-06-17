#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
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

function walkFiles(dir) {
  const output = []
  if (!existsSync(dir)) return output
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) output.push(...walkFiles(path))
    else if (stat.isFile()) output.push(path)
  }
  return output
}

function hasForbiddenPath(path) {
  const normalized = path.split('/').filter(Boolean)
  if (normalized.includes('node_modules')) return true
  if (normalized.includes('dist')) return true
  if (normalized.includes('.vercel')) return true
  if (normalized.includes('.venv')) return true
  if (normalized.includes('__pycache__')) return true
  if (path.includes('/apps/web/')) return true
  const file = basename(path)
  return file === '.env' || file.startsWith('.env.')
}

const manifestPath = join(root, 'artifacts/integration/p27-blocked-launch-package-manifest.json')
const manifest = readJsonRequired(manifestPath, 'P27 package manifest')
const packageName = typeof manifest.package_name === 'string' ? manifest.package_name : ''
const packageDir = join(root, 'artifacts/handoff', packageName)
const archivePath = join(root, 'artifacts/handoff', `${packageName}.tar.gz`)
const checksumPath = join(root, 'artifacts/handoff', `${packageName}.tar.gz.sha256`)

assert(packageName.startsWith('parallel-universe-blocked-launch-handoff-p27-'), 'P27 package name must identify blocked launch handoff')
assert(manifest.decision?.public_paid_production_launch === 'blocked', 'P27 manifest must keep public paid production launch blocked')
assert(manifest.decision?.preview_staging_testing === 'allowed', 'P27 manifest must allow preview / staging testing')
assert(manifest.preview_targets?.frontend === 'https://app-638zzda7k-james-projects-97742675.vercel.app', 'P27 manifest must keep the P25 frontend preview target')
assert(manifest.preview_targets?.api === 'https://pun-api-p25.vercel.app', 'P27 manifest must keep the P25 API preview target')

for (const owner of ['product_owner', 'backend_team', 'ops_team', 'payment_owner', 'legal_privacy_owner', 'security_owner']) {
  assert(Array.isArray(manifest.blockers_by_owner?.[owner]), `P27 manifest must assign blockers for ${owner}`)
}

for (const command of [
  'npm --prefix app run check:production-gate',
  'npm --prefix app run check:blocked-launch',
  'node scripts/check-design-system-boundary.mjs',
  'node scripts/check-backend-compatibility-bridge.mjs',
]) {
  assert(manifest.validation_commands?.includes(command), `P27 manifest validation commands must include ${command}`)
}

const p27Doc = readRequired(join(root, 'docs/product/P27_BLOCKED_LAUNCH_HANDOFF_20260613.md'), 'P27 blocked launch handoff doc')
for (const required of [
  'P27 produces a blocked launch handoff package',
  'not public-production-ready',
  'No external frontend should be merged',
  'scripts/check-blocked-launch-handoff.mjs',
  'public_paid_production_launch: blocked',
]) {
  assert(p27Doc.includes(required), `P27 handoff doc is missing ${required}`)
}

const runbook = readRequired(join(root, 'docs/product/P27_OPERATOR_RUNBOOK_20260613.md'), 'P27 operator runbook')
for (const required of [
  'This runbook turns the blocked production launch into operator-owned actions',
  'DATABASE_URL',
  'Payment Provider Acceptance',
  'Privacy, Legal and Security Signoff',
  'Do not run promotion commands without explicit product-owner approval',
  'blocked; preview / staging testing may continue',
]) {
  assert(runbook.includes(required), `P27 operator runbook is missing ${required}`)
}

const readme = readRequired(join(packageDir, 'README.md'), 'P27 package README')
assert(readme.includes('blocked launch handoff'), 'P27 package README must name the artifact as blocked launch handoff')
assert(readme.includes('not a production launch approval'), 'P27 package README must avoid implying production approval')

for (const required of [
  'PARALLEL_UNIVERSE_PROTOTYPE_HANDOFF.md',
  'docs/product/P13_EIGHT_HOUR_ACCEPTANCE_CHECKLIST_20260612.md',
  'docs/product/P25_DEPLOYMENT_EXECUTION_ROLLBACK_REHEARSAL_20260613.md',
  'docs/product/P26_PUBLIC_PRODUCTION_RELEASE_GATE_20260613.md',
  'docs/product/P27_BLOCKED_LAUNCH_HANDOFF_20260613.md',
  'docs/product/P27_OPERATOR_RUNBOOK_20260613.md',
  'docs/design-system/DEVELOPMENT_NOTES.md',
  'artifacts/integration/launch-readiness-20260614T043013Z.json',
  'artifacts/integration/p25-deployment-execution',
  'artifacts/integration/p26-production-resource-audit.json',
  'artifacts/integration/p27-blocked-launch-package-manifest.json',
  'artifacts/visual-qa/p25-remote-routes-mqda04cd',
  'scripts/check-production-release-gate.mjs',
  'scripts/check-blocked-launch-handoff.mjs',
  'scripts/check-launch-readiness.sh',
  'scripts/smoke-deployed-api.sh',
  'scripts/package-vercel-preview.sh',
  'scripts/package-vercel-backend-api.sh',
  'app/vercel.json',
  'app/package.json',
]) {
  assert(existsSync(join(packageDir, required)), `P27 package is missing ${required}`)
}

const packageFiles = walkFiles(packageDir)
assert(packageFiles.length >= 30, 'P27 package should contain the expected docs, scripts and evidence files')
for (const file of packageFiles) {
  const rel = `/${relative(packageDir, file)}`
  assert(!hasForbiddenPath(rel), `P27 package contains forbidden path ${rel}`)
}

const secretPatterns = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /whsec_[A-Za-z0-9_-]{20,}/,
  /(?:OPENAI_API_KEY|KIMI_API_KEY|MOONSHOT_API_KEY)=\S+/,
  /DATABASE_URL=.*:\/\/[^<\n ]+:[^<\n ]+@/,
  /WEBHOOK_SECRET=\S+/,
]
for (const file of packageFiles) {
  if (basename(file) === 'check-blocked-launch-handoff.mjs') continue
  const body = readFileSync(file, 'utf8')
  for (const pattern of secretPatterns) {
    assert(!pattern.test(body), `P27 package may contain a secret-like value in ${relative(packageDir, file)}`)
  }
}

assert(existsSync(archivePath), 'P27 tar.gz archive is missing')
assert(existsSync(checksumPath), 'P27 tar.gz checksum file is missing')
if (existsSync(archivePath) && existsSync(checksumPath)) {
  const expectedHash = readFileSync(checksumPath, 'utf8').trim().split(/\s+/)[0]
  const actualHash = createHash('sha256').update(readFileSync(archivePath)).digest('hex')
  assert(expectedHash === actualHash, 'P27 tar.gz checksum does not match archive contents')
}

if (existsSync(archivePath)) {
  try {
    const listing = execFileSync('tar', ['-tzf', archivePath], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
    assert(listing.length >= packageFiles.length, 'P27 archive listing is unexpectedly small')
    for (const entry of listing) {
      assert(!hasForbiddenPath(`/${entry}`), `P27 archive contains forbidden path /${entry}`)
    }
  } catch (error) {
    fail(`P27 archive could not be inspected: ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (failures.length) {
  console.error('[blocked-launch-handoff] failed')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[blocked-launch-handoff] PASS')
