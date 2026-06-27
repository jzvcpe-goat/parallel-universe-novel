import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const strict = process.env.REQUIRE_ZERO_COST_PMF_LIVE_SCHEMA === 'true'

const requiredTables = [
  'health_probe',
  'creator_authorizations',
  'works',
  'branches',
  'chapters',
  'reader_requests',
  'feature_flags',
]

function redactError(error) {
  return String(error?.message || error || 'unknown error')
    .replace(/https:\/\/[a-z0-9-]+\.supabase\.co/gi, '<supabase-url>')
    .replace(/sb_publishable_[A-Za-z0-9_-]+/g, '<supabase-publishable-key>')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '<jwt-like-token>')
}

async function probeTable(table) {
  if (!supabaseUrl || !supabaseKey) {
    return {
      table,
      status: 'skipped',
      httpStatus: null,
      ok: false,
      code: 'MISSING_PUBLIC_SUPABASE_CONFIG',
    }
  }

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/${table}?select=*&limit=1`, {
      headers: {
        apikey: supabaseKey,
        authorization: `Bearer ${supabaseKey}`,
      },
    })
    let body = null
    try {
      body = await response.json()
    } catch {
      body = null
    }

    return {
      table,
      status: response.ok ? 'ready' : 'blocked',
      httpStatus: response.status,
      ok: response.ok,
      code: body?.code || null,
    }
  } catch (error) {
    return {
      table,
      status: 'error',
      httpStatus: null,
      ok: false,
      code: redactError(error),
    }
  }
}

const tableResults = []
for (const table of requiredTables) {
  tableResults.push(await probeTable(table))
}

const missingConfig = !supabaseUrl || !supabaseKey
const missingTables = tableResults.filter(result => result.code === 'PGRST205').map(result => result.table)
const failedTables = tableResults.filter(result => !result.ok).map(result => result.table)
const ready = !missingConfig && failedTables.length === 0
const status = ready ? 'passed_zero_cost_pmf_live_schema' : 'blocked_zero_cost_pmf_live_schema'
const onlyMissingCreatorAuthorizations =
  !missingConfig
  && missingTables.length === 1
  && missingTables[0] === 'creator_authorizations'
  && failedTables.length === 1
  && failedTables[0] === 'creator_authorizations'
const nextAction = ready
  ? 'Reader request / Local Creator sync / publish trace E2E can proceed.'
  : onlyMissingCreatorAuthorizations
    ? 'Run npm run prepare:zero-cost-pmf-author-boundary-sql, apply the copied delta in the Supabase SQL Editor, then rerun with REQUIRE_ZERO_COST_PMF_LIVE_SCHEMA=true.'
    : 'Apply deploy/supabase/zero_cost_pmf_loop.sql in the Supabase SQL Editor, then rerun with REQUIRE_ZERO_COST_PMF_LIVE_SCHEMA=true.'

const artifact = {
  gate: 'ZERO_COST_PMF_LIVE_SCHEMA',
  status,
  strict,
  evidence: {
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasPublishableKey: Boolean(supabaseKey),
    checkedTables: requiredTables,
    missingTables,
    failedTables,
    tableResults,
  },
  nextAction,
}

mkdirSync(join(process.cwd(), 'artifacts/runtime'), { recursive: true })
const artifactPath = join(
  process.cwd(),
  'artifacts/runtime',
  `zero-cost-pmf-live-schema-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify(artifact, null, 2))

if (!ready && strict) {
  throw new Error(`zero-cost PMF live schema is not ready: ${failedTables.join(', ') || 'missing Supabase public config'}`)
}
