import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

function assertIncludes(file, text, label = text) {
  const body = read(file)
  if (!body.includes(text)) {
    throw new Error(`${file} missing required marker: ${label}`)
  }
}

function assertNotIncludes(file, text, label = text) {
  const body = read(file)
  if (body.includes(text)) {
    throw new Error(`${file} contains forbidden marker: ${label}`)
  }
}

function assertMinOccurrences(file, text, minimum, label = text) {
  const body = read(file)
  const count = body.split(text).length - 1
  if (count < minimum) {
    throw new Error(`${file} expected at least ${minimum} occurrences of ${label}; found ${count}`)
  }
}

function assertFile(file) {
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error(`Missing required file: ${file}`)
  }
}

const requiredFiles = [
  'app/src/apps/creator/LocalCreatorApp.tsx',
  'app/src/apps/reader/ReaderRequestPanel.tsx',
  'app/src/lib/pmfSupabase.ts',
  'app/src/lib/pmfSupabaseReader.ts',
  'app/src/features/pmf/types.ts',
  'deploy/supabase/zero_cost_pmf_loop.sql',
  'deploy/supabase/zero_cost_pmf_author_boundary_delta.sql',
  'deploy/supabase/zero_cost_pmf_publish_transaction.sql',
  'deploy/supabase/zero_cost_pmf_publish_transaction_rollback.sql',
  'deploy/supabase/zero_cost_pmf_external_echo.sql',
  'deploy/supabase/zero_cost_pmf_external_echo_rollback.sql',
  'deploy/supabase/seeds/demo_works.sql',
  'docs/backend/P170_ZERO_COST_PMF_LOOP.md',
  'scripts/prepare-zero-cost-pmf-supabase-sql.mjs',
  'scripts/prepare-zero-cost-pmf-author-boundary-sql.mjs',
  'scripts/prepare-zero-cost-pmf-publish-transaction-sql.mjs',
  'scripts/prepare-zero-cost-pmf-external-echo-sql.mjs',
  'scripts/check-zero-cost-pmf-live-schema.mjs',
  'scripts/check-zero-cost-pmf-live-external-echo.mjs',
]

requiredFiles.forEach(assertFile)

assertIncludes('app/vite.config.ts', '"@app-surface"', 'reader/creator app surface alias')
assertIncludes('app/package.json', '"dev:reader"', 'reader dev script')
assertIncludes('app/package.json', '"dev:creator"', 'creator dev script')
assertIncludes('app/package.json', '"build:reader"', 'reader build script')
assertIncludes('app/package.json', '"build:creator"', 'creator build script')
assertIncludes('package.json', '"check:zero-cost-pmf-loop"', 'root PMF check script')
assertIncludes('package.json', '"prepare:zero-cost-pmf-supabase-sql"', 'root PMF Supabase SQL prepare script')
assertIncludes('package.json', '"check:zero-cost-pmf-supabase-sql"', 'root PMF Supabase SQL check script')
assertIncludes('package.json', '"prepare:zero-cost-pmf-author-boundary-sql"', 'root PMF author boundary SQL prepare script')
assertIncludes('package.json', '"check:zero-cost-pmf-author-boundary-sql"', 'root PMF author boundary SQL check script')
assertIncludes('package.json', '"prepare:zero-cost-pmf-publish-transaction-sql"', 'root PMF publish transaction SQL prepare script')
assertIncludes('package.json', '"check:zero-cost-pmf-publish-transaction-sql"', 'root PMF publish transaction SQL check script')
assertIncludes('package.json', '"prepare:zero-cost-pmf-external-echo-sql"', 'root PMF External Echo SQL prepare script')
assertIncludes('package.json', '"check:zero-cost-pmf-external-echo-sql"', 'root PMF External Echo SQL check script')
assertIncludes('package.json', '"check:zero-cost-pmf-live-external-echo"', 'root PMF live External Echo check script')
assertIncludes('package.json', '"check:zero-cost-pmf-live-schema"', 'root PMF live schema check script')
assertIncludes('package.json', '"check:public-reader-bundle-boundary"', 'root Reader bundle boundary script')
assertIncludes('package.json', 'npm run check:zero-cost-pmf-loop', 'root test chain includes PMF check')
assertIncludes('package.json', 'npm run check:zero-cost-pmf-supabase-sql', 'root test chain includes PMF Supabase SQL check')
assertIncludes('package.json', 'npm run check:zero-cost-pmf-live-schema', 'root test chain includes PMF live schema check')
assertIncludes('package.json', 'npm run check:public-reader-bundle-boundary', 'root test chain includes Reader bundle boundary check')
assertIncludes('.github/workflows/pages.yml', 'VITE_SUPABASE_URL', 'Pages Reader build receives Supabase URL')
assertIncludes('.github/workflows/pages.yml', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'Pages Reader build receives Supabase publishable key')
assertMinOccurrences('.github/workflows/pages.yml', 'VITE_SUPABASE_URL:', 4, 'VITE_SUPABASE_URL env binding')
assertMinOccurrences('.github/workflows/pages.yml', 'VITE_SUPABASE_PUBLISHABLE_KEY:', 4, 'VITE_SUPABASE_PUBLISHABLE_KEY env binding')
assertIncludes('.github/workflows/keep-supabase-alive.yml', 'vars.VITE_SUPABASE_URL', 'keep-alive accepts repository variables')
assertIncludes('.github/workflows/keep-supabase-alive.yml', 'vars.VITE_SUPABASE_PUBLISHABLE_KEY', 'keep-alive accepts repository variables')

assertNotIncludes('app/src/App.tsx', "import Create from '@/pages/Create'", 'Reader App must not import Create page')
assertNotIncludes('app/src/App.tsx', "import Studio from '@/pages/Studio'", 'Reader App must not import Studio page')
assertNotIncludes('app/src/App.tsx', 'StudioOpsSurface', 'Reader App must not import the internal Studio ops surface')
assertNotIncludes('app/src/pages/Home.tsx', '/create', 'public Home must not link to Creator')
assertNotIncludes('app/src/pages/Library.tsx', '/create', 'public Library must not link to Creator')
assertNotIncludes('app/src/pages/Account.tsx', '/create', 'public Account must not link to Creator')
assertIncludes('app/src/apps/reader/ReaderRequestPanel.tsx', '@/lib/pmfSupabaseReader', 'Reader must use reader-only Supabase wrapper')
assertNotIncludes('app/src/apps/reader/ReaderRequestPanel.tsx', "@/lib/pmfSupabase'", 'Reader must not import creator-capable Supabase wrapper')
assertNotIncludes('app/src/apps/reader/ReaderRequestPanel.tsx', 'Local Creator App', 'Reader copy must not expose internal app name')

const sqlFile = 'deploy/supabase/zero_cost_pmf_loop.sql'
for (const table of [
  'public.profiles',
  'public.creator_authorizations',
  'public.works',
  'public.branches',
  'public.chapters',
  'public.reader_requests',
  'public.request_votes',
  'public.publish_events',
  'public.creator_clients',
  'public.feature_flags',
]) {
  assertIncludes(sqlFile, `alter table ${table} enable row level security`, `${table} RLS`)
}

assertIncludes(sqlFile, 'grant select (id, work_id, branch_id, chapter_id, request_type, request_text, status, vote_count', 'reader_requests column-level public grant')
assertIncludes(sqlFile, "('cloud_ai_runtime_enabled', false", 'cloud AI runtime disabled flag')
assertIncludes(sqlFile, "('creator_app_enabled', true", 'neutral creator app feature flag')
assertNotIncludes(sqlFile, "('local_creator_app_enabled'", 'legacy local creator feature flag must not remain in baseline flags')
assertIncludes(sqlFile, 'private.bump_reader_request_vote_count', 'private vote count trigger')
assertIncludes(sqlFile, 'private.touch_updated_at', 'updated_at trigger')
assertIncludes(sqlFile, 'branches_parent_chapter_id_fkey', 'branches parent chapter FK')
assertIncludes(sqlFile, 'chapters_source_request_id_fkey', 'chapters source request FK')
assertIncludes(sqlFile, 'reader_requests_creator_client_id_fkey', 'reader request creator client FK')
assertIncludes(sqlFile, 'reader_requests_publish_event_id_fkey', 'reader request publish event FK')
assertIncludes(sqlFile, 'grant insert (work_id, branch_id, chapter_id, request_type, request_text)', 'reader request insert column grant')
assertIncludes(sqlFile, 'grant update (\n  status,', 'reader request update column grant')
assertIncludes(sqlFile, "auth.jwt()) ->> 'is_anonymous'", 'anonymous readers must be separated from creator privileges')
assertIncludes(sqlFile, 'Reader request and vote flows may be anonymous, but creator privileges', 'SQL must document author-session boundary')
assertIncludes(sqlFile, 'creator_authorizations', 'creator privileges must require an explicit author allowlist')
assertNotIncludes(sqlFile, "id in ('beacon-beyond', 'rain-bridge', 'jade-contract')", 'production SQL must not hard-code demo work ids')
assertNotIncludes(sqlFile, 'author_id is null', 'production SQL must not allow unowned demo work claiming')
assertNotIncludes(sqlFile, '/parallel-assets/covers', 'production SQL must not contain demo cover paths')
assertNotIncludes(sqlFile, "app_mode = 'localhost'", 'production SQL must not allow legacy localhost app mode')
assertNotIncludes(sqlFile, "default 'localhost'", 'production SQL must not default to legacy localhost app mode')
assertNotIncludes(sqlFile, 'p0-localhost', 'production SQL must not contain legacy P0 creator version')
assertNotIncludes(sqlFile, 'service_role', 'service role must not appear in PMF SQL')
assertNotIncludes(sqlFile, 'provider_response', 'provider response must not be stored')
assertNotIncludes(sqlFile, 'system_prompt', 'system prompt must not be stored')
assertNotIncludes(sqlFile, 'api_key', 'provider key must not be stored')

assertIncludes('deploy/supabase/seeds/demo_works.sql', 'Do not run this seed in production.', 'demo seed must be marked non-production')
assertIncludes('deploy/supabase/seeds/demo_works.sql', 'beacon-beyond', 'demo work seed must live outside production SQL')
assertIncludes('deploy/supabase/seeds/demo_works.sql', '/parallel-assets/covers', 'demo cover paths must live outside production SQL')

const deltaSqlFile = 'deploy/supabase/zero_cost_pmf_author_boundary_delta.sql'
assertIncludes(deltaSqlFile, 'create table if not exists public.creator_authorizations', 'delta creates creator authorizations')
assertIncludes(deltaSqlFile, 'alter table public.creator_authorizations enable row level security', 'delta enables authorizations RLS')
assertIncludes(deltaSqlFile, 'creator_authorizations a where a.user_id = (select auth.uid())', 'delta gates creator elevation by allowlist')
assertIncludes(deltaSqlFile, 'creators manage own clients', 'delta hardens creator heartbeat')
assertIncludes(deltaSqlFile, "app_mode = 'local'", 'delta must use local app mode')
assertIncludes(deltaSqlFile, "version = 'local-v1'", 'delta must normalize local creator version')
assertNotIncludes(deltaSqlFile, "and app_mode = 'localhost'", 'delta policy must not allow legacy localhost app mode')
assertNotIncludes(deltaSqlFile, "default 'localhost'", 'delta default must not use legacy localhost app mode')
assertNotIncludes(deltaSqlFile, 'service_role', 'service role must not appear in PMF delta SQL')
assertNotIncludes(deltaSqlFile, 'provider_response', 'provider response must not be stored in PMF delta SQL')
assertNotIncludes(deltaSqlFile, 'system_prompt', 'system prompt must not be stored in PMF delta SQL')
assertNotIncludes(deltaSqlFile, 'api_key', 'provider key must not be stored in PMF delta SQL')

const publishTransactionSqlFile = 'deploy/supabase/zero_cost_pmf_publish_transaction.sql'
assertIncludes(publishTransactionSqlFile, 'create table if not exists public.publish_receipts', 'publish transaction receipts')
assertIncludes(publishTransactionSqlFile, 'create table if not exists private.author_audit_events', 'private author audit events')
assertIncludes(publishTransactionSqlFile, 'create or replace function public.publish_bundle_transaction', 'server publish RPC')
assertIncludes(publishTransactionSqlFile, "set search_path = ''", 'fixed publish function search path')
assertIncludes(publishTransactionSqlFile, 'revoke insert, update on public.chapters from authenticated', 'direct chapter publication revoked')
assertIncludes(publishTransactionSqlFile, 'revoke insert on public.publish_events from authenticated', 'direct publish-event creation revoked')
assertIncludes(publishTransactionSqlFile, 'grant execute on function public.publish_bundle_transaction', 'explicit publish RPC grant')
assertNotIncludes(publishTransactionSqlFile, 'service_role', 'service role must not appear in publish transaction SQL')
assertNotIncludes(publishTransactionSqlFile, 'provider_response', 'provider response must not appear in publish transaction SQL')
assertNotIncludes(publishTransactionSqlFile, 'system_prompt', 'system prompt must not appear in publish transaction SQL')
assertNotIncludes(publishTransactionSqlFile, 'api_key', 'provider key must not appear in publish transaction SQL')

const publishRollbackSqlFile = 'deploy/supabase/zero_cost_pmf_publish_transaction_rollback.sql'
assertIncludes(publishRollbackSqlFile, 'revoke execute on function public.publish_bundle_transaction', 'rollback disables publish RPC')
assertIncludes(publishRollbackSqlFile, 'grant insert, update on public.chapters to authenticated', 'rollback restores prior chapter grant')
assertNotIncludes(publishRollbackSqlFile, 'drop table', 'rollback must preserve public and audit evidence')

const externalEchoSqlFile = 'deploy/supabase/zero_cost_pmf_external_echo.sql'
for (const table of ['reader_comments', 'reader_highlights', 'reader_reactions', 'reader_questions']) {
  assertIncludes(externalEchoSqlFile, `alter table public.${table} enable row level security`, `${table} RLS`)
  assertIncludes(externalEchoSqlFile, `public.${table}`, `${table} cloud source`)
}
assertIncludes(externalEchoSqlFile, 'reader_is_anonymous', 'reader identity classification')
assertIncludes(externalEchoSqlFile, 'private.enforce_reader_signal_insert', 'reader signal rate limiter')
assertIncludes(externalEchoSqlFile, 'private.reader_signal_moderation_events', 'private moderation audit')
assertIncludes(externalEchoSqlFile, 'with (security_invoker = true)', 'RLS-preserving reader signal projection')
assertIncludes(externalEchoSqlFile, 'create or replace function public.list_creator_reader_signals', 'Creator cursor RPC')
assertIncludes(externalEchoSqlFile, '(signal.updated_at, signal.id) >', 'stable reader signal cursor')
assertNotIncludes(externalEchoSqlFile, 'service_role', 'service role must not appear in External Echo SQL')
assertNotIncludes(externalEchoSqlFile, 'api_key', 'provider key must not appear in External Echo SQL')

const externalEchoRollbackSqlFile = 'deploy/supabase/zero_cost_pmf_external_echo_rollback.sql'
assertIncludes(externalEchoRollbackSqlFile, 'revoke insert on public.reader_comments from authenticated', 'External Echo rollback disables intake')
assertIncludes(externalEchoRollbackSqlFile, 'revoke execute on function public.list_creator_reader_signals', 'External Echo rollback disables Creator source RPC')
assertNotIncludes(externalEchoRollbackSqlFile, 'drop table', 'External Echo rollback must preserve source and audit evidence')

assertNotIncludes('app/src/lib/pmfSupabase.ts', 'signInAnonymously', 'Creator/cloud facade must not own Reader anonymous identity')
assertNotIncludes('app/src/lib/pmfSupabase.ts', 'export async function createReaderRequest', 'Creator/cloud facade must not duplicate Reader request writes')
assertNotIncludes('app/src/lib/pmfSupabase.ts', 'export async function listPublicRequests', 'Creator/cloud facade must not duplicate public request reads')
assertNotIncludes('app/src/lib/pmfSupabase.ts', 'export async function voteForRequest', 'Creator/cloud facade must not duplicate Reader vote writes')
assertIncludes('app/src/lib/pmfSupabase.ts', "from '@/local-db/creatorLocalSettingsRepository'", 'PMF adapter delegates local settings to repository')
assertIncludes('app/src/local-db/creatorLocalSettingsRepository.ts', 'readLocalMetaValue', 'local settings read through local repository')
assertIncludes('app/src/local-db/legacyCreatorToolSettings.ts', 'readLegacyCreatorToolSettings', 'retired tool settings remain read-only migration data')
assertNotIncludes('app/src/lib/pmfSupabase.ts', 'readLocalAiSettings', 'PMF adapter must not expose retired author-facing tool settings')
assertNotIncludes('app/src/lib/pmfSupabase.ts', 'writeLocalAiSettings', 'PMF adapter must not expose retired author-facing tool setting writes')
assertIncludes('app/src/lib/pmfSupabase.ts', 'local_draft_ref', 'local draft ref trace')
assertNotIncludes('app/src/lib/pmfSupabase.ts', 'service_role', 'service role must not appear in client')
assertNotIncludes('app/src/lib/pmfSupabase.ts', 'localStorage.setItem', 'PMF adapter must not directly write localStorage')
assertIncludes('app/src/lib/pmfSupabase.ts', "rpc('list_creator_reader_signals'", 'Creator must read live cloud sources through the cursor RPC')
assertIncludes('app/src/lib/pmfSupabase.ts', 'unavailableCloudExternalEchoBatch', 'source failure must preserve local cache and cursor')
assertIncludes('app/src/lib/pmfSupabaseReader.ts', 'signInAnonymously', 'reader lightweight identity in reader wrapper')
assertNotIncludes('app/src/lib/pmfSupabaseReader.ts', 'creator_clients', 'reader wrapper must not touch creator client heartbeats')
assertNotIncludes('app/src/lib/pmfSupabaseReader.ts', 'LOCAL_AI_SETTINGS_KEY', 'reader wrapper must not touch local AI settings')
assertIncludes('docs/backend/P170_ZERO_COST_PMF_LOOP.md', 'Enable `Allow anonymous sign-ins`', 'P170 must include Supabase Auth anonymous setup')
assertIncludes('docs/backend/P170_ZERO_COST_PMF_LOOP.md', "auth.jwt()->>'is_anonymous'", 'P170 must document anonymous reader vs creator RLS boundary')
assertIncludes('docs/backend/P170_ZERO_COST_PMF_LOOP.md', 'creator_authorizations', 'P170 must document explicit creator authorization')

assertIncludes('app/src/components/creator/CreatorShell.tsx', '私有写作', 'Creator App local boundary')
assertIncludes('app/src/apps/creator/routes/CreatorEditorRoute.tsx', 'runEditorPublishCheckThroughAgent({', 'editor must route drafts through Agent-owned publish check flow')
assertIncludes('app/src/apps/creator/routes/creatorEditorPublishCheckService.ts', 'prepareEditorPublishHandoff(result.draft', 'publish check service must route drafts through publish bundle handoff service')
assertIncludes('app/src/apps/creator/routes/creatorEditorPublishHandoffController.ts', "kind: 'publish-bundle-draft-handoff'", 'publish handoff must preserve local bundle draft boundary')
assertIncludes('app/src/apps/creator/routes/creatorEditorPublishHandoffService.ts', 'saveBundleDraft: upsertLocalPublishBundle', 'publish handoff must persist local bundle drafts before navigation')
assertIncludes('app/src/apps/creator/routes/CreatorEditorManuscriptStage.tsx', '进入发布检查', 'editor UI must expose publish check handoff')
assertIncludes('app/src/apps/creator/routes/CreatorPublishBundleRoute.tsx', 'title="确认这份发布包"', 'publish bundle must require local author confirmation')
assertIncludes('app/src/apps/creator/routes/CreatorPublishBundleRoute.tsx', '这一步只保存作者确认，不会公开', 'local confirmation must not imply publication')
assertIncludes('app/src/apps/creator/routes/CreatorPublishBundleRoute.tsx', 'data-agent-action="confirm_publish_bundle"', 'local confirmation must use the registered Agent action')
assertIncludes('app/src/apps/creator/routes/CreatorPublishBundleRoute.tsx', 'data-agent-action="submit_publish_bundle"', 'public submission must use a separate registered Agent action')
assertIncludes('app/src/apps/reader/ReaderRequestPanel.tsx', '请求已送达', 'Reader request handoff copy')

console.log('zero-cost PMF loop gate passed')
