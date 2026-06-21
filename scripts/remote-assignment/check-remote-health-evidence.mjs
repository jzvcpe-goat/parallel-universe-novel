#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { defaultPaths, nowIso, readJson, writeJson } from './lib/io.mjs'
import { assertNoPrivateTerms } from './lib/validators.mjs'

loadEnvFile('.env.local')
loadEnvFile('.env.local.sync')

const paths = defaultPaths()
const contract = await readJson(paths.contract)
const supabaseUrl = process.env.VITE_SUPABASE_URL
  || process.env.SUPABASE_URL
  || contract.topology.data_api.origin
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || process.env.VITE_SUPABASE_ANON_KEY
  || process.env.SUPABASE_PUBLISHABLE_KEY
  || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl) throw new Error('Missing Supabase URL')
if (!supabaseKey) throw new Error('Missing Supabase publishable/anon key')

const table = encodeURIComponent(contract.health.data_probe_table)
const id = encodeURIComponent(contract.health.data_probe_id)
const url = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/${table}?id=eq.${id}&select=id,status,updated_at`
const response = await fetch(url, {
  headers: {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    Accept: 'application/json',
  },
})
const payload = await response.json().catch(() => null)
if (!response.ok) throw new Error(`Remote health evidence failed: HTTP ${response.status}`)
const row = Array.isArray(payload) ? payload[0] : payload
if (!row) throw new Error('Remote health probe returned no row')
if (row.status !== 'ok') throw new Error(`Remote health probe status is not ok: ${row.status}`)

const healthEvidence = {
  status: 'ok',
  checked_at: nowIso(),
  runtime_mode: contract.runtime_mode,
  frontend: {
    url: contract.health.frontend_url,
    evidence_type: 'deployment-url',
  },
  data_api: {
    provider: contract.topology.data_api.provider,
    origin: contract.topology.data_api.origin,
    table: contract.health.data_probe_table,
    probe: {
      id: row.id,
      status: row.status,
      updated_at: row.updated_at || null,
    },
  },
  remote_agent: {
    required: contract.health.remote_agent_health_required,
    evidence: contract.health.remote_agent_health_required ? 'pending' : 'not-required-edge-only',
  },
}

assertNoPrivateTerms(healthEvidence, 'remote health evidence')
await writeJson(paths.healthResult, healthEvidence)
console.log(JSON.stringify({
  status: 'passed',
  runtimeMode: contract.runtime_mode,
  healthResultPath: paths.healthResult,
}, null, 2))

function loadEnvFile(path) {
  if (!existsSync(path)) return
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line)
    if (!match) continue
    const [, key, value] = match
    if (process.env[key] == null) process.env[key] = value.trim()
  }
}
