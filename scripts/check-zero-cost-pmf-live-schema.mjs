import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const strict = process.env.REQUIRE_ZERO_COST_PMF_LIVE_SCHEMA === 'true'

const publicTableProbeColumns = {
  health_probe: 'id',
  creator_authorizations: 'user_id',
  works: 'id',
  branches: 'id',
  chapters: 'id',
  reader_requests: 'id',
  feature_flags: 'key',
  reader_comments: 'id',
  reader_highlights: 'id',
  reader_reactions: 'id',
  reader_questions: 'id',
}
const protectedTableProbeColumns = {
  publish_receipts: 'id',
  reader_signals: 'id',
}
const requiredFunctions = [
  {
    name: 'publish_bundle_transaction',
    args: {
      p_bundle_id: 'presence-probe',
      p_idempotency_key: '0'.repeat(64),
      p_content_checksum: '0'.repeat(64),
      p_work_id: 'presence-probe',
      p_target_kind: 'mainline',
      p_chapter_title: 'presence probe',
      p_content: 'presence probe',
      p_branch_id: null,
      p_branch_title: null,
      p_hook_chapter_id: null,
      p_reader_request_ids: [],
      p_creator_client_id: null,
    },
  },
  {
    name: 'list_creator_reader_signals',
    args: {
      p_source: 'comment',
      p_after_updated_at: null,
      p_after_id: '',
      p_work_id: null,
      p_limit: 1,
    },
  },
  {
    name: 'moderate_reader_signal',
    args: {
      p_source: 'comment',
      p_signal_id: '00000000-0000-4000-8000-000000000000',
      p_decision: 'hide',
    },
  },
]

function redactError(error) {
  return String(error?.message || error || 'unknown error')
    .replace(/https:\/\/[a-z0-9-]+\.supabase\.co/gi, '<supabase-url>')
    .replace(/sb_publishable_[A-Za-z0-9_-]+/g, '<supabase-publishable-key>')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '<jwt-like-token>')
}

async function probeTable(table, column, protectedObject = false) {
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
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/${table}?select=${column}&limit=1`, {
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

    const permissionBlocked = protectedObject
      && response.status !== 404
      && body?.code !== 'PGRST205'
      && (body?.code === '42501' || response.status === 401 || response.status === 403)
    return {
      table,
      status: response.ok ? 'ready' : permissionBlocked ? 'ready_protected' : 'blocked',
      httpStatus: response.status,
      ok: response.ok || permissionBlocked,
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

async function probeFunction({ name, args }) {
  if (!supabaseUrl || !supabaseKey) {
    return { function: name, status: 'skipped', httpStatus: null, ok: false, code: 'MISSING_PUBLIC_SUPABASE_CONFIG' }
  }
  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        authorization: `Bearer ${supabaseKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(args),
    })
    let body = null
    try {
      body = await response.json()
    } catch {
      body = null
    }
    const existsButDenied = response.status !== 404
      && body?.code !== 'PGRST202'
      && (body?.code === '42501' || body?.code === 'P0001' || response.status === 401 || response.status === 403)
    return {
      function: name,
      status: response.ok ? 'ready' : existsButDenied ? 'ready_protected' : 'blocked',
      httpStatus: response.status,
      ok: response.ok || existsButDenied,
      code: body?.code || null,
    }
  } catch (error) {
    return { function: name, status: 'error', httpStatus: null, ok: false, code: redactError(error) }
  }
}

const tableResults = []
for (const [table, column] of Object.entries(publicTableProbeColumns)) {
  tableResults.push(await probeTable(table, column, false))
}
for (const [table, column] of Object.entries(protectedTableProbeColumns)) {
  tableResults.push(await probeTable(table, column, true))
}
const functionResults = []
for (const functionContract of requiredFunctions) {
  functionResults.push(await probeFunction(functionContract))
}

const missingConfig = !supabaseUrl || !supabaseKey
const missingTables = tableResults.filter(result => result.code === 'PGRST205').map(result => result.table)
const failedTables = tableResults.filter(result => !result.ok).map(result => result.table)
const missingFunctions = functionResults.filter(result => result.code === 'PGRST202').map(result => result.function)
const failedFunctions = functionResults.filter(result => !result.ok).map(result => result.function)
const ready = !missingConfig && failedTables.length === 0 && failedFunctions.length === 0
const status = ready ? 'passed_zero_cost_pmf_live_schema' : 'blocked_zero_cost_pmf_live_schema'
const onlyMissingCreatorAuthorizations =
  !missingConfig
  && missingTables.length === 1
  && missingTables[0] === 'creator_authorizations'
  && failedTables.length === 1
  && failedTables[0] === 'creator_authorizations'
const nextAction = ready
  ? 'Strict WP6 author-to-Reader and External Echo live proofs can proceed.'
  : onlyMissingCreatorAuthorizations
    ? 'Run npm run prepare:zero-cost-pmf-author-boundary-sql, apply the copied delta in the Supabase SQL Editor, then rerun with REQUIRE_ZERO_COST_PMF_LIVE_SCHEMA=true.'
    : 'Apply the base, author-boundary, WP6 publish-transaction, and External Echo SQL deltas in order, then rerun this strict gate.'

const artifact = {
  gate: 'ZERO_COST_PMF_LIVE_SCHEMA',
  status,
  strict,
  evidence: {
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasPublishableKey: Boolean(supabaseKey),
    checkedTables: [...Object.keys(publicTableProbeColumns), ...Object.keys(protectedTableProbeColumns)],
    checkedFunctions: requiredFunctions.map(item => item.name),
    missingTables,
    missingFunctions,
    failedTables,
    failedFunctions,
    tableResults,
    functionResults,
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
  throw new Error(`zero-cost PMF live schema is not ready: ${[...failedTables, ...failedFunctions].join(', ') || 'missing Supabase public config'}`)
}
