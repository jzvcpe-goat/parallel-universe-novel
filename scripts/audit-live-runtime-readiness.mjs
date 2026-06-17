#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'
const publicUrl = process.env.PUBLIC_CREATOR_URL || 'https://jzvcpe-goat.github.io/parallel-universe-novel/#/create'
const artifactDir = join(root, 'artifacts', 'runtime')
const generatedAt = new Date().toISOString()
const required = process.env.REQUIRE_LIVE_RUNTIME_READY === 'true'

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function isRemoteHttps(value) {
  return /^https:\/\//.test(value)
    && !/localhost|127\.0\.0\.1|0\.0\.0\.0|\[?::1\]?/.test(value)
    && !/example\.com/.test(value)
}

function tryRepoVariables() {
  try {
    const output = execFileSync('gh', ['variable', 'list', '--repo', repo, '--json', 'name,value'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
      timeout: 8000,
    })
    const values = {}
    for (const item of JSON.parse(output || '[]')) {
      values[String(item.name)] = String(item.value || '')
    }
    return { checked: true, values }
  } catch {
    return { checked: false, values: {} }
  }
}

function envOrRepo(name, repoValues) {
  return normalizeOrigin(process.env[name] || repoValues[name] || '')
}

function healthUrl(origin) {
  return `${normalizeOrigin(origin)}/health`
}

async function fetchHealth(origin) {
  if (!isRemoteHttps(origin)) {
    return {
      status: 'skipped',
      reason: 'remote https origin not configured',
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), Number(process.env.LIVE_RUNTIME_HEALTH_TIMEOUT_MS || 10000))
  try {
    const response = await fetch(healthUrl(origin), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    const text = await response.text()
    let payload = null
    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      payload = { raw: text.slice(0, 200) }
    }
    const serviceStatus = payload && typeof payload === 'object' ? payload.status : null
    const ok = response.ok && (serviceStatus === 'ok' || serviceStatus === 'healthy')
    return {
      status: ok ? 'passed' : 'failed',
      httpStatus: response.status,
      serviceStatus,
      url: healthUrl(origin),
    }
  } catch (error) {
    return {
      status: 'failed',
      url: healthUrl(origin),
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    clearTimeout(timer)
  }
}

function check(id, passed, detail, nextAction) {
  return {
    id,
    status: passed ? 'passed' : 'blocked',
    detail,
    nextAction,
  }
}

const repoVars = tryRepoVariables()
const mode = envOrRepo('VITE_PUBLIC_RUNTIME_MODE', repoVars.values) || 'disabled'
const apiOrigin = envOrRepo('VITE_API_ORIGIN', repoVars.values)
const apiBaseUrl = envOrRepo('VITE_API_BASE_URL', repoVars.values)
const agentOrigin = envOrRepo('VITE_AGENT_RUNTIME_BASE_URL', repoVars.values)
const allowFallback = String(process.env.VITE_ALLOW_LOCAL_CREATOR_FALLBACK || 'false')

const checks = [
  check(
    'public-runtime-mode',
    mode === 'live',
    `current=${mode}`,
    'Set GitHub repository variable VITE_PUBLIC_RUNTIME_MODE=live only after API and Agent health are green.',
  ),
  check(
    'api-origin',
    isRemoteHttps(apiOrigin),
    apiOrigin ? `configured=${apiOrigin}` : 'missing VITE_API_ORIGIN',
    'Deploy FastAPI runtime and set VITE_API_ORIGIN to its remote HTTPS origin.',
  ),
  check(
    'agent-origin',
    isRemoteHttps(agentOrigin),
    agentOrigin ? `configured=${agentOrigin}` : 'missing VITE_AGENT_RUNTIME_BASE_URL',
    'Deploy Agent Runtime and set VITE_AGENT_RUNTIME_BASE_URL to its remote HTTPS origin.',
  ),
  check(
    'api-base-url',
    !apiBaseUrl || isRemoteHttps(apiBaseUrl),
    apiBaseUrl ? `configured=${apiBaseUrl}` : 'optional VITE_API_BASE_URL not set',
    'If set, VITE_API_BASE_URL must be a remote HTTPS URL, normally https://<api-host>/v1.',
  ),
  check(
    'local-fallback-disabled',
    allowFallback === 'false',
    `current=${allowFallback}`,
    'Public live builds must keep VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false.',
  ),
]

const [apiHealth, agentHealth] = await Promise.all([
  fetchHealth(apiOrigin),
  fetchHealth(agentOrigin),
])

checks.push(check(
  'api-health',
  apiHealth.status === 'passed',
  JSON.stringify(apiHealth),
  'Fix FastAPI /health or runtime hosting before enabling public live mode.',
))
checks.push(check(
  'agent-health',
  agentHealth.status === 'passed',
  JSON.stringify(agentHealth),
  'Fix Agent Runtime /health or Tool Bridge hosting before enabling public live mode.',
))

const blocked = checks.filter(item => item.status !== 'passed')
const status = blocked.length === 0 ? 'ready' : 'blocked'
const artifact = {
  generatedAt,
  status,
  required,
  repo,
  publicUrl,
  repoVariables: {
    checked: repoVars.checked,
    present: {
      VITE_PUBLIC_RUNTIME_MODE: Boolean(repoVars.values.VITE_PUBLIC_RUNTIME_MODE),
      VITE_API_ORIGIN: Boolean(repoVars.values.VITE_API_ORIGIN),
      VITE_API_BASE_URL: Boolean(repoVars.values.VITE_API_BASE_URL),
      VITE_AGENT_RUNTIME_BASE_URL: Boolean(repoVars.values.VITE_AGENT_RUNTIME_BASE_URL),
    },
  },
  runtimeConfig: {
    VITE_PUBLIC_RUNTIME_MODE: mode,
    VITE_API_ORIGIN: apiOrigin || null,
    VITE_API_BASE_URL: apiBaseUrl || null,
    VITE_AGENT_RUNTIME_BASE_URL: agentOrigin || null,
    VITE_ALLOW_LOCAL_CREATOR_FALLBACK: allowFallback,
  },
  health: {
    api: apiHealth,
    agent: agentHealth,
  },
  checks,
  blockedChecks: blocked.map(item => item.id),
  commands: {
    strictConfig: 'REQUIRE_PUBLIC_LIVE_CONFIG=true VITE_PUBLIC_RUNTIME_MODE=live VITE_API_ORIGIN=https://<api-host> VITE_AGENT_RUNTIME_BASE_URL=https://<agent-host> VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false npm run check:public-live-config',
    liveSmoke: 'REQUIRE_PUBLIC_RUNTIME=true VITE_API_ORIGIN=https://<api-host> VITE_AGENT_RUNTIME_BASE_URL=https://<agent-host> VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false npm run qa:live-runtime-browser',
    readinessLedger: 'REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness',
  },
}

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `live-runtime-readiness-${generatedAt.replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status,
  required,
  artifactPath,
  blockedChecks: artifact.blockedChecks,
  publicUrl,
}, null, 2))

if (required && status !== 'ready') {
  throw new Error(`Live runtime readiness is blocked: ${artifact.blockedChecks.join(', ')}`)
}
