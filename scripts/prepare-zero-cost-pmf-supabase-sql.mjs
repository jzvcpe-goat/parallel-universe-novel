#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const sqlRel = 'deploy/supabase/zero_cost_pmf_loop.sql'
const artifactDir = join(root, 'artifacts/runtime')
const sqlEditorUrl = 'https://supabase.com/dashboard/project/ubvufgzojztmxlltsegn/sql/new'
const checkOnly = process.argv.includes('--check')
const shouldCopy = process.argv.includes('--copy') || (!checkOnly && !process.argv.includes('--no-copy'))
const shouldOpen = process.argv.includes('--open') || (!checkOnly && !process.argv.includes('--no-open'))

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function run(command, args, input = null) {
  const result = spawnSync(command, args, {
    cwd: root,
    input,
    encoding: 'utf8',
    stdio: input == null ? ['ignore', 'pipe', 'pipe'] : ['pipe', 'pipe', 'pipe'],
    timeout: 10000,
  })
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  }
}

function assertNoForbiddenTerms(text, label) {
  const forbidden = [
    /service[_-]?role/i,
    /SUPABASE_SERVICE_ROLE/i,
    /SUPABASE_SECRET_KEY/i,
    /provider_response/i,
    /system_prompt/i,
    /api_key/i,
    /OPENAI_API_KEY/i,
    /DEEPSEEK_API_KEY/i,
    /MOONSHOT_API_KEY/i,
    /KIMI_API_KEY/i,
    /ANTHROPIC_API_KEY/i,
  ]
  const matches = forbidden.filter(pattern => pattern.test(text)).map(String)
  assert(matches.length === 0, `${label} contains forbidden private markers: ${matches.join(', ')}`)
}

assert(existsSync(join(root, sqlRel)), `missing SQL file: ${sqlRel}`)
const sql = readFileSync(join(root, sqlRel), 'utf8')
assert(sql.includes('create table if not exists public.works'), 'SQL must create public.works')
assert(sql.includes('create table if not exists public.branches'), 'SQL must create public.branches')
assert(sql.includes('create table if not exists public.chapters'), 'SQL must create public.chapters')
assert(sql.includes('create table if not exists public.reader_requests'), 'SQL must create public.reader_requests')
assert(sql.includes('create table if not exists public.feature_flags'), 'SQL must create public.feature_flags')
assert(sql.includes('alter table public.reader_requests enable row level security'), 'SQL must enable RLS on reader_requests')
assert(sql.includes('grant usage on schema public to anon, authenticated'), 'SQL must grant Data API schema usage')
assert(sql.includes("('cloud_ai_runtime_enabled', false"), 'SQL must keep cloud AI runtime disabled')
assert(sql.includes('author_id is null'), 'SQL must allow the first creator to claim unowned starter works')
assert(sql.includes("id in ('beacon-beyond', 'rain-bridge', 'jade-contract')"), 'starter work claim policy must be scoped to P0 seed works')
assert(sql.includes('with check') && sql.includes('author_id = (select auth.uid())'), 'starter work claim must write ownership to the current creator')
assert(sql.includes("auth.jwt()) ->> 'is_anonymous'"), 'SQL must distinguish anonymous readers from non-anonymous creators')
assert(sql.includes('Reader request/vote flows may be anonymous, but creator privileges require'), 'SQL must document the anonymous reader vs creator boundary')
assertNoForbiddenTerms(sql, sqlRel)

let copiedToClipboard = false
let openedSqlEditor = false
let clipboardError = null
let openError = null

if (shouldCopy) {
  const result = run('pbcopy', [], sql)
  copiedToClipboard = result.ok
  if (!result.ok) clipboardError = result.stderr.trim() || `pbcopy exited with ${result.status}`
}

if (shouldOpen) {
  const result = run('open', [sqlEditorUrl])
  openedSqlEditor = result.ok
  if (!result.ok) openError = result.stderr.trim() || `open exited with ${result.status}`
}

const artifact = {
  gate: 'ZERO_COST_PMF_SUPABASE_SQL_PREP',
  status: 'prepared',
  generatedAt: new Date().toISOString(),
  sqlPath: sqlRel,
  sqlSha256: createHash('sha256').update(sql).digest('hex'),
  sqlLineCount: sql.split(/\r?\n/).length,
  copiedToClipboard,
  openedSqlEditor,
  sqlEditorUrl,
  valuesIncluded: false,
  boundary: {
    createsRemoteResources: false,
    requiresServiceRole: false,
    requiresDatabasePassword: false,
    storesProviderKeys: false,
    storesPromptOrProviderResponse: false,
  },
  nextStrictCheck: 'REQUIRE_ZERO_COST_PMF_LIVE_SCHEMA=true npm run check:zero-cost-pmf-live-schema',
}

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(
  artifactDir,
  `zero-cost-pmf-supabase-sql-prep-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: 'prepared',
  mode: checkOnly ? 'check' : 'operator',
  sqlPath: sqlRel,
  copiedToClipboard,
  openedSqlEditor,
  clipboardError,
  openError,
  sqlEditorUrl,
  artifactPath: relative(root, artifactPath),
  nextStrictCheck: artifact.nextStrictCheck,
}, null, 2))
