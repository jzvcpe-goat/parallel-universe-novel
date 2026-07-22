import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(new URL('..', import.meta.url).pathname)

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8')
}

function requireAll(source, markers, label) {
  for (const marker of markers) {
    if (!source.includes(marker)) throw new Error(`${label} missing contract marker: ${marker}`)
  }
}

function forbid(source, patterns, label) {
  for (const pattern of patterns) {
    if (pattern.test(source)) throw new Error(`${label} contains forbidden pattern: ${pattern}`)
  }
}

const sqlPath = 'deploy/supabase/zero_cost_pmf_external_echo.sql'
const rollbackPath = 'deploy/supabase/zero_cost_pmf_external_echo_rollback.sql'
const databaseScopeIncluded = fs.existsSync(path.join(root, sqlPath)) && fs.existsSync(path.join(root, rollbackPath))
const sql = databaseScopeIncluded ? read(sqlPath) : ''
const rollback = databaseScopeIncluded ? read(rollbackPath) : ''
const projection = read('app/src/features/creator-pivot/externalEchoCloudProjection.ts')
const api = read('app/src/lib/pmfSupabase.ts')
const loadService = read('app/src/apps/creator/routes/creatorEchoLoadService.ts')

if (databaseScopeIncluded) {
requireAll(sql, [
  'create table if not exists public.reader_comments',
  'create table if not exists public.reader_highlights',
  'create table if not exists public.reader_reactions',
  'create table if not exists public.reader_questions',
  'alter table public.reader_comments enable row level security',
  'reader_is_anonymous',
  "auth.jwt()) ->> 'is_anonymous'",
  'private.is_published_reader_signal_target',
  'private.is_valid_reader_highlight',
  'private.prepare_reader_highlight_anchor',
  'private.enforce_reader_signal_insert',
  'pg_advisory_xact_lock',
  'reader_signal_daily_limit',
  'reader_signal_burst_limit',
  'private.reader_signal_moderation_events',
  'create or replace function public.moderate_reader_signal',
  'create or replace view public.reader_signals',
  'with (security_invoker = true)',
  'create or replace function public.list_creator_reader_signals',
  'security invoker',
  '(signal.updated_at, signal.id) >',
  'revoke all on public.reader_signals from public, anon, authenticated',
  'grant execute on function public.list_creator_reader_signals',
], 'External Echo SQL')

forbid(sql, [
  /service[_-]?role/i,
  /api[_-]?key/i,
  /model[_-]?credential/i,
  /agent[_-]?reasoning\s+(text|json|jsonb)/i,
  /creative[_-]?reminder\s+(text|json|jsonb)/i,
  /draft[_-]?body\s+(text|json|jsonb)/i,
], 'External Echo SQL')

requireAll(rollback, [
  'revoke insert on public.reader_comments from authenticated',
  'revoke insert on public.reader_questions from authenticated',
  'revoke insert on public.reader_highlights from authenticated',
  'revoke insert on public.reader_reactions from authenticated',
  'revoke execute on function public.moderate_reader_signal',
  'revoke execute on function public.list_creator_reader_signals',
  "values ('reader_echo_enabled', false",
], 'External Echo rollback')
forbid(rollback, [/drop table/i, /truncate/i, /delete from public\.reader_/i], 'External Echo rollback')
} else {
  console.log('[external-echo-cloud-contract] database migrations are excluded from Creator R0 review scope')
}

requireAll(projection, [
  'CloudExternalEchoRow',
  'encodeExternalEchoCloudCursor',
  'decodeExternalEchoCloudCursor',
  'cloudExternalEchoBatch',
  'unavailableCloudExternalEchoBatch',
  "source: 'comment'",
  "source: 'highlight'",
  "source: 'reaction'",
  "source: 'question'",
], 'External Echo cloud projection')

requireAll(api, [
  "const sources: CloudExternalEchoSource[] = ['comment', 'highlight', 'reaction', 'question']",
  "supabase.rpc('list_creator_reader_signals'",
  'decodeExternalEchoCloudCursor(previousCursor)',
  'unavailableCloudExternalEchoBatch(',
  '...requestBatches, ...cloudBatches',
  '外界回声读取失败。',
], 'Creator cloud adapter')
forbid(api, [/请求队列读取失败。/], 'Creator cloud adapter')

requireAll(loadService, [
  'const currentSignalSources = local.readReaderSignalSources()',
  'api.listSignalBatches(requestResult.data, currentSignalSources)',
], 'External Echo load service')

console.log(JSON.stringify({
  status: 'passed',
  gate: 'EPIC5_EXTERNAL_ECHO_CLOUD_CONTRACT',
  sources: ['comment', 'highlight', 'reaction', 'question'],
  privateAuthorInterpretation: 'local-only',
}, null, 2))
