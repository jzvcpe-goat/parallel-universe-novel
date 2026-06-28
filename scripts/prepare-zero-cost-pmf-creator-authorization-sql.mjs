#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')
const sqlEditorUrl = 'https://supabase.com/dashboard/project/ubvufgzojztmxlltsegn/sql/new'
const creatorEmail = process.env.ZERO_COST_PMF_CREATOR_EMAIL
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

function escapeSqlLiteral(value) {
  return String(value).replace(/'/g, "''")
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

function buildSql(email) {
  const escapedEmail = escapeSqlLiteral(email)
  return `-- P0 Local Creator author allowlist SQL.
-- Scope: maps an existing non-anonymous Supabase Auth user to public.creator_authorizations.
-- Safe to rerun: updates only the allowlist row for this author.
-- Does not grant privileged database access, store model keys, or touch public content.

do $$
declare
  creator_email text := '${escapedEmail}';
  creator_user_id uuid;
begin
  select id into creator_user_id
  from auth.users
  where lower(email) = lower(creator_email)
  order by created_at desc
  limit 1;

  if creator_user_id is null then
    raise exception 'creator auth user not found for provided email';
  end if;

  insert into public.creator_authorizations (user_id, note)
  values (creator_user_id, 'P0 Local Creator author')
  on conflict (user_id) do update
  set note = excluded.note;
end $$;

notify pgrst, 'reload schema';

select exists (
  select 1
  from public.creator_authorizations a
  join auth.users u on u.id = a.user_id
  where lower(u.email) = lower('${escapedEmail}')
) as creator_authorized;
`
}

const templateSql = buildSql('creator@example.invalid')
assert(templateSql.includes('public.creator_authorizations'), 'SQL must write creator_authorizations')
assert(templateSql.includes('from auth.users'), 'SQL must resolve author through auth.users')
assert(templateSql.includes('raise exception'), 'SQL must fail clearly when the auth user is missing')
assert(templateSql.includes('creator_authorized'), 'SQL must return a boolean verification row')
assertNoForbiddenTerms(templateSql, 'creator authorization SQL template')

let sql = templateSql
let copiedToClipboard = false
let openedSqlEditor = false
let clipboardError = null
let openError = null
let status = 'checked'
let nextAction = 'Set ZERO_COST_PMF_CREATOR_EMAIL locally, then run npm run prepare:zero-cost-pmf-creator-authorization-sql.'

if (!checkOnly) {
  assert(creatorEmail, 'ZERO_COST_PMF_CREATOR_EMAIL is required to prepare creator authorization SQL')
  sql = buildSql(creatorEmail)
  assertNoForbiddenTerms(sql, 'creator authorization SQL')
  status = 'prepared'
  nextAction = 'Run the copied SQL in Supabase SQL Editor, then run RUN_ZERO_COST_PMF_LIVE_AUTHOR_TRACE=true npm run check:zero-cost-pmf-live-author-trace.'

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
}

const artifact = {
  gate: 'ZERO_COST_PMF_CREATOR_AUTHORIZATION_SQL_PREP',
  status,
  generatedAt: new Date().toISOString(),
  sqlSha256: createHash('sha256').update(sql).digest('hex'),
  sqlLineCount: sql.split(/\r?\n/).length,
  copiedToClipboard,
  openedSqlEditor,
  sqlEditorUrl,
  valuesIncluded: !checkOnly,
  hasCreatorEmail: Boolean(creatorEmail),
  emailPrinted: false,
  boundary: {
    requiresExistingAuthUser: true,
    requiresServiceRole: false,
    requiresDatabasePassword: false,
    storesProviderKeys: false,
    storesPromptOrProviderResponse: false,
    writesPublicContent: false,
  },
  nextAction,
}

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(
  artifactDir,
  `zero-cost-pmf-creator-authorization-sql-prep-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status,
  mode: checkOnly ? 'check' : 'operator',
  hasCreatorEmail: Boolean(creatorEmail),
  emailPrinted: false,
  copiedToClipboard,
  openedSqlEditor,
  clipboardError,
  openError,
  sqlEditorUrl,
  artifactPath: artifactPath.replace(`${root}/`, ''),
  nextAction,
}, null, 2))
