#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const sqlRel = 'deploy/supabase/zero_cost_pmf_loop.sql'
const demoSeedRel = 'deploy/supabase/seeds/demo_works.sql'
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
assert(existsSync(join(root, demoSeedRel)), `missing demo seed file: ${demoSeedRel}`)
const sql = readFileSync(join(root, sqlRel), 'utf8')
const demoSeed = readFileSync(join(root, demoSeedRel), 'utf8')
assert(sql.includes('create table if not exists public.works'), 'SQL must create public.works')
assert(sql.includes('create table if not exists public.creator_authorizations'), 'SQL must create public.creator_authorizations')
assert(sql.includes('create table if not exists public.branches'), 'SQL must create public.branches')
assert(sql.includes('create table if not exists public.chapters'), 'SQL must create public.chapters')
assert(sql.includes('create table if not exists public.reader_requests'), 'SQL must create public.reader_requests')
assert(sql.includes('create table if not exists public.feature_flags'), 'SQL must create public.feature_flags')
assert(sql.includes('alter table public.reader_requests enable row level security'), 'SQL must enable RLS on reader_requests')
assert(sql.includes('grant usage on schema public to anon, authenticated'), 'SQL must grant Data API schema usage')
assert(sql.includes("('cloud_ai_runtime_enabled', false"), 'SQL must keep cloud AI runtime disabled')
assert(sql.includes("('creator_app_enabled', true"), 'SQL must use neutral creator app feature flag')
assert(sql.includes("app_mode = 'local'"), 'SQL must use local app mode')
assert(sql.includes("version set default 'local-v1'"), 'SQL must normalize local creator version')
assert(!sql.includes('author_id is null'), 'production SQL must not allow unowned demo work claiming')
assert(!sql.includes("id in ('beacon-beyond', 'rain-bridge', 'jade-contract')"), 'production SQL must not hard-code demo work ids')
assert(!sql.includes('/parallel-assets/covers'), 'production SQL must not seed demo cover paths')
assert(!sql.includes('p0-localhost'), 'production SQL must not contain legacy p0-localhost value')
assert(!sql.includes("app_mode = 'localhost'"), 'production SQL policy must not allow legacy localhost app mode')
assert(!sql.includes("default 'localhost'"), 'production SQL default must not use legacy localhost mode')
assert(!sql.includes("default 'Local Creator App'"), 'production SQL default must not use internal app label')
assert(sql.includes('with check') && sql.includes('author_id = (select auth.uid())'), 'creator work writes must bind ownership to the current creator')
assert(sql.includes("auth.jwt()) ->> 'is_anonymous'"), 'SQL must distinguish anonymous readers from non-anonymous creators')
assert(sql.includes('Reader request and vote flows may be anonymous, but creator privileges'), 'SQL must document the anonymous reader vs creator boundary')
assert(sql.includes('creator authorizations self select'), 'SQL must expose creator authorizations only to the current authorized user')
assert(sql.includes('creator_authorizations a where a.user_id = (select auth.uid())'), 'SQL must gate creator profile elevation through the creator_authorizations allowlist')
assert(sql.includes('reader_requests_creator_client_id_fkey'), 'SQL must add creator client FK consistency')
assert(sql.includes('reader_requests_publish_event_id_fkey'), 'SQL must add publish event FK consistency')
assert(sql.includes('private.touch_updated_at'), 'SQL must define updated_at trigger function')
assert(sql.includes('grant insert (work_id, branch_id, chapter_id, request_type, request_text)'), 'SQL must column-scope reader request insert grant')
assert(sql.includes('grant update (\n  status,'), 'SQL must column-scope reader request update grant')
assertNoForbiddenTerms(sql, sqlRel)
assert(demoSeed.includes('beacon-beyond'), 'demo seed must carry starter work data outside production SQL')
assert(demoSeed.includes('Do not run this seed in production.'), 'demo seed must be marked non-production')

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
