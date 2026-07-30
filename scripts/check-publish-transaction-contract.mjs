import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const failures = []

function requireMatch(value, pattern, message) {
  if (!pattern.test(value)) failures.push(message)
}

function forbidMatch(value, pattern, message) {
  if (pattern.test(value)) failures.push(message)
}

const migrationPath = 'deploy/supabase/zero_cost_pmf_publish_transaction.sql'
const rollbackPath = 'deploy/supabase/zero_cost_pmf_publish_transaction_rollback.sql'
const databaseScopeIncluded = fs.existsSync(path.join(root, migrationPath)) && fs.existsSync(path.join(root, rollbackPath))
const migration = databaseScopeIncluded ? read(migrationPath) : ''
const rollback = databaseScopeIncluded ? read(rollbackPath) : ''
const adapter = read('app/src/features/creator-pivot/publishBundleAdapter.ts')
const cloudAdapter = read('app/src/lib/pmfSupabase.ts')
const fixture = read('app/src/__fixtures__/pmfSupabase.creator-qa.ts')
const packageJson = JSON.parse(read('package.json'))

if (databaseScopeIncluded) {
requireMatch(migration, /create table if not exists public\.publish_receipts/i, 'publish_receipts table is missing')
requireMatch(migration, /unique\s*\(bundle_id\)|bundle_id[^\n]+unique/i, 'bundle idempotency boundary is missing')
requireMatch(migration, /idempotency_key[^\n]+unique/i, 'authoritative idempotency key is not unique')
requireMatch(migration, /alter table public\.publish_receipts enable row level security/i, 'publish_receipts RLS is missing')
requireMatch(migration, /revoke insert, update on public\.chapters from authenticated/i, 'direct chapter writes are not revoked')
requireMatch(migration, /revoke insert on public\.publish_events from authenticated/i, 'direct publish-event writes are not revoked')
requireMatch(migration, /revoke update \([\s\S]+publish_event_id[\s\S]+\) on public\.reader_requests from authenticated/i, 'direct request publication-link writes are not revoked')
requireMatch(migration, /status <> 'published'[\s\S]+private\.has_authoritative_publish_receipt/i, 'direct published status must require an authoritative receipt')
requireMatch(migration, /private\.is_authorized_work_owner[\s\S]+security definer[\s\S]+set search_path = ''/i, 'RLS ownership helper must be private and use a fixed search_path')
requireMatch(migration, /create table if not exists private\.author_audit_events/i, 'private author audit table is missing')
requireMatch(migration, /create or replace function public\.publish_bundle_transaction/i, 'publish RPC is missing')
requireMatch(migration, /security definer\s+set search_path = ''/i, 'publish RPC must use a fixed empty search_path')
requireMatch(migration, /creator_authorizations/i, 'publish RPC must require creator authorization')
requireMatch(migration, /profile\.role = 'creator'/i, 'publish RPC must require the creator profile role')
requireMatch(migration, /work\.author_id = v_actor_id/i, 'publish RPC must verify work ownership')
requireMatch(migration, /v_is_anonymous/i, 'publish RPC must reject anonymous authenticated sessions')
requireMatch(migration, /sha256\s*\(convert_to\s*\(trim\(p_content\)/i, 'publish RPC must validate the body SHA-256')
requireMatch(migration, /pg_advisory_xact_lock[\s\S]+publish-idempotency:/i, 'publish RPC must serialize idempotent retries')
requireMatch(migration, /pg_advisory_xact_lock[\s\S]+publish-work:/i, 'publish RPC must serialize work publication writes')
requireMatch(migration, /insert into public\.branches[\s\S]+insert into public\.chapters[\s\S]+insert into public\.publish_events[\s\S]+insert into public\.publish_receipts/i, 'atomic publish write sequence is incomplete')
requireMatch(migration, /update public\.reader_requests[\s\S]+status = 'published'/i, 'linked public feedback update is missing')
requireMatch(migration, /local_draft_ref,[\s\S]{0,240}\n\s*null,/i, 'publish event must not store a local draft reference')
requireMatch(migration, /grant execute on function public\.publish_bundle_transaction[\s\S]+to authenticated/i, 'authenticated RPC grant is missing')
requireMatch(migration, /revoke all on function public\.publish_bundle_transaction[\s\S]+from public, anon, authenticated/i, 'RPC default execute revocation is missing')
forbidMatch(migration.match(/create or replace function public\.publish_bundle_transaction[\s\S]+?\n\$\$;/i)?.[0] || '', /p_(?:local_draft|prompt|provider|model|agent_reasoning)/i, 'publish RPC accepts forbidden private input')
requireMatch(rollback, /revoke execute on function public\.publish_bundle_transaction[\s\S]+from authenticated/i, 'rollback must disable the RPC')
requireMatch(rollback, /grant insert, update on public\.chapters to authenticated/i, 'rollback must restore the previous chapter grant')
requireMatch(rollback, /grant insert on public\.publish_events to authenticated/i, 'rollback must restore the previous publish-event grant')
forbidMatch(rollback, /drop table|delete from public\.publish_receipts|truncate/i, 'rollback must preserve public content and receipt evidence')
} else {
  console.log('[publish-transaction-contract] database migrations are excluded from Creator R0 review scope')
}

requireMatch(cloudAdapter, /export async function publishBundleTransaction/i, 'cloud adapter does not own the RPC boundary')
requireMatch(cloudAdapter, /\.rpc\('publish_bundle_transaction'/i, 'cloud adapter does not call the publish RPC')
forbidMatch(cloudAdapter, /export async function publishChapter/i, 'legacy browser-owned publishChapter implementation still exists')
requireMatch(adapter, /publishBundleTransaction\(input\)/i, 'PublishBundle adapter does not call the RPC adapter')
requireMatch(adapter, /result\.data\.receipt\.created_at/i, 'PublishBundle adapter does not consume the authoritative server receipt')
requireMatch(adapter, /replayed: result\.data\.replayed/i, 'PublishBundle adapter does not preserve authoritative replay state')
requireMatch(fixture, /export async function publishBundleTransaction/i, 'Creator QA fixture does not model the RPC boundary')
forbidMatch(fixture, /export async function publishChapter/i, 'Creator QA fixture still exposes the legacy direct publish path')

for (const script of [
  'check:publish-transaction-contract',
  'test:publish-transaction',
  'test:publish-authorization',
  'test:publish-idempotency',
  'test:publish-deployment-rollback',
  'test:publish-wp6',
]) {
  if (!packageJson.scripts?.[script]) failures.push(`package script ${script} is missing`)
}

if (failures.length) {
  console.error(`Publish transaction contract failed:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}

console.log('Publish transaction contract passed.')
