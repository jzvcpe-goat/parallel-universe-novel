#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function isRemoteHttps(value) {
  return /^https:\/\//.test(value)
    && !/localhost|127\.0\.0\.1|0\.0\.0\.0|\[?::1\]?/.test(value)
    && !/example\.com|<.+>/.test(value)
}

function tryGhVariables() {
  if (process.env.CHECK_GITHUB_REPO_VARS === 'false') {
    return { checked: false, source: 'disabled_by_env', values: {} }
  }
  try {
    const output = execFileSync('gh', ['variable', 'list', '--repo', repo, '--json', 'name,value'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
      timeout: 8000,
    })
    const values = {}
    for (const item of JSON.parse(output || '[]')) values[String(item.name)] = String(item.value || '')
    return { checked: true, source: 'gh_variable_list', values }
  } catch {
    return { checked: false, source: 'not_checked', values: {} }
  }
}

function envOrRepo(name, repoValues) {
  return normalizeOrigin(process.env[name] || repoValues[name] || '')
}

async function fetchHealth(origin, expectedService) {
  if (!isRemoteHttps(origin)) {
    return {
      status: 'skipped',
      reason: 'remote https origin not configured',
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), Number(process.env.REMOTE_ORIGIN_HEALTH_TIMEOUT_MS || 10000))
  const url = `${origin}/health`
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    const text = await response.text()
    let payload = null
    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      payload = { raw: text.slice(0, 160) }
    }
    const serviceStatus = payload && typeof payload === 'object' ? payload.status : null
    const service = payload && typeof payload === 'object' ? payload.service : null
    const statusOk = response.ok && (serviceStatus === 'ok' || serviceStatus === 'healthy')
    const serviceOk = !expectedService || service === expectedService || service == null
    return {
      status: statusOk && serviceOk ? 'passed' : 'failed',
      httpStatus: response.status,
      serviceStatus,
      service: service || null,
      url,
    }
  } catch (error) {
    return {
      status: 'failed',
      url,
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    clearTimeout(timer)
  }
}

function stage(id, passed, detail, nextAction) {
  return {
    id,
    status: passed ? 'ready' : 'blocked',
    detail,
    nextAction,
  }
}

function assertContains(file, terms) {
  const body = read(file)
  for (const term of terms) assert(body.includes(term), `${file} must include ${term}`)
}

function scanNoPrivateTerms(payload) {
  const text = JSON.stringify(payload)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL=(?!<)/,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/,
    /system prompt/i,
    /provider secret/i,
    /dev-local-token/,
    /reference-work-vault/i,
    /representative work/i,
    /rawState/i,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

const packageJson = readJson('package.json')
const requiredFiles = [
  'deploy/api/Dockerfile',
  'deploy/agent-runtime/Dockerfile',
  'deploy/runtime-preview/docker-compose.yml',
  'deploy/runtime-production/host-profiles.json',
  'deploy/runtime-production/service-manifest.json',
  'deploy/runtime-production/origin.env.example',
  'docs/backend/P14_REMOTE_RUNTIME_DEPLOYMENT_PACKAGE.md',
  'docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md',
  'docs/backend/P65_REMOTE_LIVE_RUNTIME_TRACE_GATE.md',
  'docs/backend/P66_REMOTE_RUNTIME_ORIGIN_PROVISIONING_GATE.md',
  'docs/backend/P69_REMOTE_RUNTIME_HOST_TARGET_GATE.md',
]

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `missing remote origin provisioning file: ${file}`)
}

assert(
  packageJson.scripts['check:remote-origin-provisioning'] === 'node scripts/check-remote-origin-provisioning.mjs',
  'package.json must expose check:remote-origin-provisioning',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-origin-provisioning'),
  'root npm run test must include check:remote-origin-provisioning',
)

assertContains('deploy/runtime-production/origin.env.example', [
  'NARRATIVEOS_DEPLOY_ENV=production',
  'NARRATIVEOS_TOOL_BRIDGE_TOKEN=<shared-tool-bridge-secret>',
  'MASTRA_TOOL_BRIDGE_BASE_URL=https://<api-host>',
  'MASTRA_TOOL_BRIDGE_TOKEN=<shared-tool-bridge-secret>',
  'VITE_PUBLIC_RUNTIME_MODE=live',
  'VITE_API_ORIGIN=https://<api-host>',
  'VITE_AGENT_RUNTIME_BASE_URL=https://<agent-host>',
  'VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false',
])
assertContains('deploy/runtime-production/host-profiles.json', [
  'docker-compatible-two-service-paas',
  'fastapi_business_sovereign_agent_runtime_orchestrates',
  'provider_secret_store_only',
])
assertContains('deploy/runtime-production/service-manifest.json', [
  'P70_REMOTE_RUNTIME_DEPLOY_MANIFEST_GATE',
  'docker-compatible-two-service-paas',
  'provider_secret_store_only',
  'VITE_API_ORIGIN',
  'VITE_AGENT_RUNTIME_BASE_URL',
])
assertContains('docs/backend/P66_REMOTE_RUNTIME_ORIGIN_PROVISIONING_GATE.md', [
  'P66 Remote Runtime Origin Provisioning Gate',
  'remote_origin_unprovisioned',
  'remote_origin_health_ready',
  'pages_variables_ready',
  'ready_for_public_live_runtime',
  'check:remote-host-target',
  'check:remote-deploy-manifest',
])
assertContains('docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md', [
  'GitHub Repository Variables',
  'Activation Sequence',
  'curl -fsS https://<api-host>/health',
])

const repoVariables = tryGhVariables()
const mode = envOrRepo('VITE_PUBLIC_RUNTIME_MODE', repoVariables.values) || 'disabled'
const apiOrigin = envOrRepo('VITE_API_ORIGIN', repoVariables.values)
const apiBaseUrl = envOrRepo('VITE_API_BASE_URL', repoVariables.values)
const agentOrigin = envOrRepo('VITE_AGENT_RUNTIME_BASE_URL', repoVariables.values)
const allowFallback = String(process.env.VITE_ALLOW_LOCAL_CREATOR_FALLBACK || 'false')

const [apiHealth, agentHealth] = await Promise.all([
  fetchHealth(apiOrigin),
  fetchHealth(agentOrigin, 'narrativeos-agent-runtime'),
])

const stages = [
  stage(
    'api-origin-configured',
    isRemoteHttps(apiOrigin),
    apiOrigin ? `configured=${apiOrigin}` : 'missing VITE_API_ORIGIN',
    'Deploy FastAPI runtime to a remote HTTPS origin and set VITE_API_ORIGIN.',
  ),
  stage(
    'agent-origin-configured',
    isRemoteHttps(agentOrigin),
    agentOrigin ? `configured=${agentOrigin}` : 'missing VITE_AGENT_RUNTIME_BASE_URL',
    'Deploy Agent Runtime to a remote HTTPS origin and set VITE_AGENT_RUNTIME_BASE_URL.',
  ),
  stage(
    'api-health-ready',
    apiHealth.status === 'passed',
    JSON.stringify(apiHealth),
    'Make FastAPI /health return ok over the configured remote HTTPS origin.',
  ),
  stage(
    'agent-health-ready',
    agentHealth.status === 'passed',
    JSON.stringify(agentHealth),
    'Make Agent Runtime /health return ok over the configured remote HTTPS origin.',
  ),
  stage(
    'pages-runtime-mode-ready',
    mode === 'live',
    `current=${mode}`,
    'Set GitHub repository variable VITE_PUBLIC_RUNTIME_MODE=live only after both origins are healthy.',
  ),
  stage(
    'pages-api-base-url-safe',
    !apiBaseUrl || isRemoteHttps(apiBaseUrl),
    apiBaseUrl ? `configured=${apiBaseUrl}` : 'optional VITE_API_BASE_URL not set',
    'If VITE_API_BASE_URL is set, it must be remote HTTPS.',
  ),
  stage(
    'local-fallback-disabled',
    allowFallback === 'false',
    `current=${allowFallback}`,
    'Keep VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false for public Pages.',
  ),
]

const blockedStages = stages.filter(item => item.status !== 'ready')
let provisioningDecision = 'remote_origin_unprovisioned'
if (
  stages.find(item => item.id === 'api-health-ready')?.status === 'ready'
  && stages.find(item => item.id === 'agent-health-ready')?.status === 'ready'
) {
  provisioningDecision = 'remote_origin_health_ready'
}
if (
  provisioningDecision === 'remote_origin_health_ready'
  && stages.find(item => item.id === 'pages-runtime-mode-ready')?.status === 'ready'
  && stages.find(item => item.id === 'local-fallback-disabled')?.status === 'ready'
) {
  provisioningDecision = 'pages_variables_ready'
}
if (blockedStages.length === 0) provisioningDecision = 'ready_for_public_live_runtime'

const artifact = {
  generatedAt: new Date().toISOString(),
  status: provisioningDecision === 'ready_for_public_live_runtime' ? 'ready' : 'blocked',
  provisioningDecision,
  repo,
  repoVariables: {
    checked: repoVariables.checked,
    source: repoVariables.source,
    present: {
      VITE_PUBLIC_RUNTIME_MODE: Boolean(repoVariables.values.VITE_PUBLIC_RUNTIME_MODE),
      VITE_API_ORIGIN: Boolean(repoVariables.values.VITE_API_ORIGIN),
      VITE_API_BASE_URL: Boolean(repoVariables.values.VITE_API_BASE_URL),
      VITE_AGENT_RUNTIME_BASE_URL: Boolean(repoVariables.values.VITE_AGENT_RUNTIME_BASE_URL),
    },
  },
  publicRuntimeConfig: {
    VITE_PUBLIC_RUNTIME_MODE: mode,
    VITE_API_ORIGIN: apiOrigin || null,
    VITE_API_BASE_URL: apiBaseUrl || null,
    VITE_AGENT_RUNTIME_BASE_URL: agentOrigin || null,
    VITE_ALLOW_LOCAL_CREATOR_FALLBACK: allowFallback,
  },
  stages,
  blockedStages: blockedStages.map(item => ({
    id: item.id,
    nextAction: item.nextAction,
  })),
  commands: {
    setPagesMode: 'gh variable set VITE_PUBLIC_RUNTIME_MODE --repo jzvcpe-goat/parallel-universe-novel --body live',
    setApiOrigin: 'gh variable set VITE_API_ORIGIN --repo jzvcpe-goat/parallel-universe-novel --body https://<api-host>',
    setAgentOrigin: 'gh variable set VITE_AGENT_RUNTIME_BASE_URL --repo jzvcpe-goat/parallel-universe-novel --body https://<agent-host>',
    validateReadiness: 'REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness',
    validateTrace: 'npm run check:remote-live-runtime-trace',
  },
}

const privateViolations = scanNoPrivateTerms(artifact)
assert(privateViolations.length === 0, `remote origin provisioning artifact privacy violations: ${privateViolations.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `remote-origin-provisioning-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: provisioningDecision === 'ready_for_public_live_runtime' ? 'passed' : 'passed_with_origin_blockers',
  artifactPath,
  provisioningDecision,
  blockedStages: blockedStages.map(item => item.id),
}, null, 2))

if (process.env.REQUIRE_REMOTE_ORIGIN_PROVISIONED === 'true' && provisioningDecision !== 'ready_for_public_live_runtime') {
  throw new Error(`Remote origin provisioning is blocked: ${blockedStages.map(item => item.id).join(', ')}`)
}
