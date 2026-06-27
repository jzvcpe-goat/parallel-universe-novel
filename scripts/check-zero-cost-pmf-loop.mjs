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
  'docs/backend/P170_ZERO_COST_PMF_LOOP.md',
]

requiredFiles.forEach(assertFile)

assertIncludes('app/vite.config.ts', '"@app-surface"', 'reader/creator app surface alias')
assertIncludes('app/package.json', '"dev:reader"', 'reader dev script')
assertIncludes('app/package.json', '"dev:creator"', 'creator dev script')
assertIncludes('app/package.json', '"build:reader"', 'reader build script')
assertIncludes('app/package.json', '"build:creator"', 'creator build script')
assertIncludes('package.json', '"check:zero-cost-pmf-loop"', 'root PMF check script')
assertIncludes('package.json', '"check:public-reader-bundle-boundary"', 'root Reader bundle boundary script')
assertIncludes('package.json', 'npm run check:zero-cost-pmf-loop', 'root test chain includes PMF check')
assertIncludes('package.json', 'npm run check:public-reader-bundle-boundary', 'root test chain includes Reader bundle boundary check')
assertIncludes('.github/workflows/pages.yml', 'VITE_SUPABASE_URL', 'Pages Reader build receives Supabase URL')
assertIncludes('.github/workflows/pages.yml', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'Pages Reader build receives Supabase publishable key')
assertMinOccurrences('.github/workflows/pages.yml', 'VITE_SUPABASE_URL:', 4, 'VITE_SUPABASE_URL env binding')
assertMinOccurrences('.github/workflows/pages.yml', 'VITE_SUPABASE_PUBLISHABLE_KEY:', 4, 'VITE_SUPABASE_PUBLISHABLE_KEY env binding')
assertIncludes('.github/workflows/keep-supabase-alive.yml', 'vars.VITE_SUPABASE_URL', 'keep-alive accepts repository variables')
assertIncludes('.github/workflows/keep-supabase-alive.yml', 'vars.VITE_SUPABASE_PUBLISHABLE_KEY', 'keep-alive accepts repository variables')

assertNotIncludes('app/src/App.tsx', "import Create from '@/pages/Create'", 'Reader App must not import Create page')
assertNotIncludes('app/src/App.tsx', "import Studio from '@/pages/Studio'", 'Reader App must not import Studio page')
assertNotIncludes('app/src/pages/Home.tsx', '/create', 'public Home must not link to Creator')
assertNotIncludes('app/src/pages/Library.tsx', '/create', 'public Library must not link to Creator')
assertNotIncludes('app/src/pages/Account.tsx', '/create', 'public Account must not link to Creator')
assertIncludes('app/src/apps/reader/ReaderRequestPanel.tsx', '@/lib/pmfSupabaseReader', 'Reader must use reader-only Supabase wrapper')
assertNotIncludes('app/src/apps/reader/ReaderRequestPanel.tsx', "@/lib/pmfSupabase'", 'Reader must not import creator-capable Supabase wrapper')
assertNotIncludes('app/src/apps/reader/ReaderRequestPanel.tsx', 'Local Creator App', 'Reader copy must not expose internal app name')

const sqlFile = 'deploy/supabase/zero_cost_pmf_loop.sql'
for (const table of [
  'public.profiles',
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
assertIncludes(sqlFile, 'private.bump_reader_request_vote_count', 'private vote count trigger')
assertNotIncludes(sqlFile, 'service_role', 'service role must not appear in PMF SQL')
assertNotIncludes(sqlFile, 'provider_response', 'provider response must not be stored')
assertNotIncludes(sqlFile, 'system_prompt', 'system prompt must not be stored')
assertNotIncludes(sqlFile, 'api_key', 'provider key must not be stored')

assertIncludes('app/src/lib/pmfSupabase.ts', 'signInAnonymously', 'reader lightweight identity')
assertIncludes('app/src/lib/pmfSupabase.ts', 'LOCAL_AI_SETTINGS_KEY', 'local-only AI settings')
assertIncludes('app/src/lib/pmfSupabase.ts', 'local_draft_ref', 'local draft ref trace')
assertNotIncludes('app/src/lib/pmfSupabase.ts', 'service_role', 'service role must not appear in client')
assertIncludes('app/src/lib/pmfSupabaseReader.ts', 'signInAnonymously', 'reader lightweight identity in reader wrapper')
assertNotIncludes('app/src/lib/pmfSupabaseReader.ts', 'creator_clients', 'reader wrapper must not touch creator client heartbeats')
assertNotIncludes('app/src/lib/pmfSupabaseReader.ts', 'LOCAL_AI_SETTINGS_KEY', 'reader wrapper must not touch local AI settings')

assertIncludes('app/src/apps/creator/LocalCreatorApp.tsx', 'localhost mode', 'Local Creator localhost boundary')
assertIncludes('app/src/apps/creator/LocalCreatorApp.tsx', '人工确认并发布', 'manual publish confirmation')
assertIncludes('app/src/apps/reader/ReaderRequestPanel.tsx', '作者确认后更新正文或支线', 'Reader request handoff copy')

console.log('zero-cost PMF loop gate passed')
