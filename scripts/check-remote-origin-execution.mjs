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

function assertContains(file, terms) {
  const body = read(file)
  for (const term of terms) assert(body.includes(term), `${file} must include ${term}`)
}

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function isRemoteHttps(value) {
  return /^https:\/\//.test(value)
    && !/localhost|127\.0\.0\.1|0\.0\.0\.0|\[?::1\]?/.test(value)
    && !/example\.com|<.+>/.test(value)
}

function boolEnv(name) {
  return String(process.env[name] || '').toLowerCase() === 'true'
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
    return { status: 'skipped', reason: 'remote https origin not configured' }
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

function scanNoPrivateTerms(payload) {
  const text = JSON.stringify(payload)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL=(?!<)/,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/,
    /dev-local-token/,
    /system prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

const requiredFiles = [
  'deploy/runtime-production/host-profiles.json',
  'deploy/runtime-production/service-manifest.json',
  'deploy/runtime-production/origin-execution-plan.json',
  'docs/backend/P66_REMOTE_RUNTIME_ORIGIN_PROVISIONING_GATE.md',
  'docs/backend/P70_REMOTE_RUNTIME_DEPLOY_MANIFEST_GATE.md',
  'docs/backend/P71_RUNTIME_IMAGE_PUBLISH_GATE.md',
  'docs/backend/P72_RUNTIME_IMAGE_PUBLISH_EVIDENCE_GATE.md',
  'docs/backend/P73_REMOTE_RUNTIME_ORIGIN_EXECUTION_GATE.md',
  'scripts/check-remote-origin-provisioning.mjs',
  'scripts/check-runtime-image-publish-evidence.mjs',
]

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `missing remote origin execution file: ${file}`)
}

const packageJson = readJson('package.json')
const hostProfiles = readJson('deploy/runtime-production/host-profiles.json')
const manifest = readJson('deploy/runtime-production/service-manifest.json')
const plan = readJson('deploy/runtime-production/origin-execution-plan.json')

assert(
  packageJson.scripts['check:remote-origin-execution'] === 'node scripts/check-remote-origin-execution.mjs',
  'package.json must expose check:remote-origin-execution',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-origin-execution'),
  'root npm run test must include check:remote-origin-execution',
)

assert(plan.version === 1, 'origin execution plan must use version 1')
assert(plan.gate === 'P73_REMOTE_RUNTIME_ORIGIN_EXECUTION_GATE', 'origin execution plan gate mismatch')
for (const dependency of [
  'P66_REMOTE_RUNTIME_ORIGIN_PROVISIONING_GATE',
  'P70_REMOTE_RUNTIME_DEPLOY_MANIFEST_GATE',
  'P71_RUNTIME_IMAGE_PUBLISH_GATE',
  'P72_RUNTIME_IMAGE_PUBLISH_EVIDENCE_GATE',
]) {
  assert(plan.dependsOn?.includes(dependency), `origin execution plan must depend on ${dependency}`)
}
assert(plan.repository === repo, 'origin execution plan repository mismatch')
assert(plan.hostTargetProfile === manifest.hostTargetProfile, 'origin execution plan must target the service manifest host profile')
assert(plan.hostTargetProfile === hostProfiles.defaultTarget, 'origin execution plan must target the default host profile')
assert(
  plan.imageEvidenceCommand === 'REQUIRE_RUNTIME_IMAGE_PUBLISHED=true npm run check:runtime-image-publish-evidence',
  'origin execution plan must require strict image evidence before provisioning',
)

const manifestServices = new Map((manifest.services || []).map(service => [service.id, service]))
const planServices = new Map((plan.services || []).map(service => [service.id, service]))
for (const id of ['api', 'agent']) {
  const manifestService = manifestServices.get(id)
  const planService = planServices.get(id)
  assert(manifestService, `service manifest missing ${id}`)
  assert(planService, `origin execution plan missing ${id}`)
  assert(planService.serviceName === manifestService.serviceName, `${id} serviceName mismatch`)
  assert(planService.role === manifestService.role, `${id} role mismatch`)
  assert(planService.imageName === manifestService.imageName, `${id} imageName mismatch`)
  assert(planService.containerPort === manifestService.containerPort, `${id} containerPort mismatch`)
  assert(planService.healthPath === manifestService.healthPath, `${id} healthPath mismatch`)
  assert(planService.publicOriginVariable === manifestService.publicOriginVariable, `${id} publicOriginVariable mismatch`)
  assert(planService.imageTagPolicy === 'commit_sha_or_runtime_latest_after_p72', `${id} imageTagPolicy must reference P72 evidence`)
}

const apiPlan = planServices.get('api')
const agentPlan = planServices.get('agent')
assert(apiPlan.operatorInputs.includes('REMOTE_API_SERVICE_ID'), 'api operator inputs must include REMOTE_API_SERVICE_ID')
assert(apiPlan.operatorInputs.includes('REMOTE_API_ORIGIN'), 'api operator inputs must include REMOTE_API_ORIGIN')
assert(apiPlan.operatorInputs.includes('REMOTE_API_SECRETS_CONFIGURED'), 'api operator inputs must include REMOTE_API_SECRETS_CONFIGURED')
assert(apiPlan.providerSecretNames.includes('DATABASE_URL'), 'api provider secret names must include DATABASE_URL')
assert(apiPlan.providerSecretNames.includes('NARRATIVEOS_TOOL_BRIDGE_TOKEN'), 'api provider secret names must include Tool Bridge token')
assert(agentPlan.operatorInputs.includes('REMOTE_AGENT_SERVICE_ID'), 'agent operator inputs must include REMOTE_AGENT_SERVICE_ID')
assert(agentPlan.operatorInputs.includes('REMOTE_AGENT_ORIGIN'), 'agent operator inputs must include REMOTE_AGENT_ORIGIN')
assert(agentPlan.operatorInputs.includes('REMOTE_AGENT_SECRETS_CONFIGURED'), 'agent operator inputs must include REMOTE_AGENT_SECRETS_CONFIGURED')
assert(agentPlan.providerSecretNames.includes('MASTRA_TOOL_BRIDGE_TOKEN'), 'agent provider secret names must include Tool Bridge token')
assert(agentPlan.dependsOn.includes('api'), 'agent execution plan must depend on api')
assert(agentPlan.runtimeEnv.includes('MASTRA_TOOL_BRIDGE_BASE_URL=https://<api-host>'), 'agent runtime env must point to API host placeholder')

const executionText = JSON.stringify(plan.executionSteps || [])
for (const required of [
  'verify-current-images',
  'REQUIRE_RUNTIME_IMAGE_PUBLISHED=true npm run check:runtime-image-publish-evidence',
  'provision-api-service',
  'provision-agent-service',
  'configure-provider-secret-store',
  'REQUIRE_REMOTE_ORIGIN_PROVISIONED=true npm run check:remote-origin-provisioning',
  'gh variable set VITE_PUBLIC_RUNTIME_MODE',
  'REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness',
  'npm run qa:live-runtime-browser',
]) {
  assert(executionText.includes(required), `origin execution steps must include ${required}`)
}

const forbiddenPublic = new Set(plan.forbiddenPublicVariables || [])
for (const forbidden of [
  'DATABASE_URL',
  'NARRATIVEOS_TOOL_BRIDGE_TOKEN',
  'MASTRA_TOOL_BRIDGE_TOKEN',
  'NARRATIVEOS_CREATOR_API_KEY',
  'REFERENCE_WORK_VAULT_KEY',
]) {
  assert(forbiddenPublic.has(forbidden), `origin execution plan forbidden public variables must include ${forbidden}`)
}
const rollbackText = JSON.stringify(plan.rollbackCommands || [])
assert(rollbackText.includes('VITE_PUBLIC_RUNTIME_MODE'), 'rollback must disable public runtime mode')
assert(rollbackText.includes('VITE_API_ORIGIN'), 'rollback must remove API origin')
assert(rollbackText.includes('VITE_AGENT_RUNTIME_BASE_URL'), 'rollback must remove Agent origin')
assert(rollbackText.includes('Deploy Creator Studio Preview'), 'rollback must redeploy Pages')

assertContains('docs/backend/P73_REMOTE_RUNTIME_ORIGIN_EXECUTION_GATE.md', [
  'P73 Remote Runtime Origin Execution Gate',
  'deploy/runtime-production/origin-execution-plan.json',
  'check:remote-origin-execution',
  'remote_origin_execution_unassigned',
  'remote_origin_execution_pending_health',
  'remote_origin_execution_ready',
  'REQUIRE_REMOTE_ORIGIN_EXECUTED=true',
  'REQUIRE_RUNTIME_IMAGE_PUBLISHED=true npm run check:runtime-image-publish-evidence',
  'REQUIRE_REMOTE_ORIGIN_PROVISIONED=true npm run check:remote-origin-provisioning',
])
assertContains('docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md', [
  'Origin Execution Gate',
  'npm run check:remote-origin-execution',
  'deploy/runtime-production/origin-execution-plan.json',
])
assertContains('docs/backend/P66_REMOTE_RUNTIME_ORIGIN_PROVISIONING_GATE.md', [
  'P73 Remote Runtime Origin Execution Gate',
  'check:remote-origin-execution',
])

const repoVariables = tryGhVariables()
const apiOrigin = normalizeOrigin(process.env.REMOTE_API_ORIGIN || repoVariables.values.VITE_API_ORIGIN || '')
const agentOrigin = normalizeOrigin(process.env.REMOTE_AGENT_ORIGIN || repoVariables.values.VITE_AGENT_RUNTIME_BASE_URL || '')
const mode = normalizeOrigin(process.env.VITE_PUBLIC_RUNTIME_MODE || repoVariables.values.VITE_PUBLIC_RUNTIME_MODE || 'disabled')
const apiServiceId = String(process.env.REMOTE_API_SERVICE_ID || '').trim()
const agentServiceId = String(process.env.REMOTE_AGENT_SERVICE_ID || '').trim()
const apiSecretsReady = boolEnv('REMOTE_API_SECRETS_CONFIGURED')
const agentSecretsReady = boolEnv('REMOTE_AGENT_SECRETS_CONFIGURED')

const [apiHealth, agentHealth] = await Promise.all([
  fetchHealth(apiOrigin),
  fetchHealth(agentOrigin, 'narrativeos-agent-runtime'),
])

const stages = [
  stage(
    'execution-plan-present',
    true,
    'origin execution plan validated against service manifest',
    'Keep origin execution plan in sync with service manifest.',
  ),
  stage(
    'runtime-image-evidence-command-ready',
    true,
    plan.imageEvidenceCommand,
    'Run strict P72 before deploying or updating remote services.',
  ),
  stage(
    'api-service-assigned',
    Boolean(apiServiceId),
    apiServiceId ? `service=${apiServiceId}` : 'missing REMOTE_API_SERVICE_ID',
    'Create or identify the remote FastAPI service and export REMOTE_API_SERVICE_ID.',
  ),
  stage(
    'agent-service-assigned',
    Boolean(agentServiceId),
    agentServiceId ? `service=${agentServiceId}` : 'missing REMOTE_AGENT_SERVICE_ID',
    'Create or identify the remote Agent Runtime service and export REMOTE_AGENT_SERVICE_ID.',
  ),
  stage(
    'api-provider-secrets-ready',
    apiSecretsReady,
    apiSecretsReady ? 'provider secret evidence marked ready' : 'missing REMOTE_API_SECRETS_CONFIGURED=true',
    'Configure FastAPI provider secret store, then set REMOTE_API_SECRETS_CONFIGURED=true for verification.',
  ),
  stage(
    'agent-provider-secrets-ready',
    agentSecretsReady,
    agentSecretsReady ? 'provider secret evidence marked ready' : 'missing REMOTE_AGENT_SECRETS_CONFIGURED=true',
    'Configure Agent Runtime provider secret store, then set REMOTE_AGENT_SECRETS_CONFIGURED=true for verification.',
  ),
  stage(
    'api-origin-configured',
    isRemoteHttps(apiOrigin),
    apiOrigin ? `configured=${apiOrigin}` : 'missing REMOTE_API_ORIGIN or VITE_API_ORIGIN',
    'Assign FastAPI remote HTTPS origin.',
  ),
  stage(
    'agent-origin-configured',
    isRemoteHttps(agentOrigin),
    agentOrigin ? `configured=${agentOrigin}` : 'missing REMOTE_AGENT_ORIGIN or VITE_AGENT_RUNTIME_BASE_URL',
    'Assign Agent Runtime remote HTTPS origin.',
  ),
  stage(
    'api-health-ready',
    apiHealth.status === 'passed',
    JSON.stringify(apiHealth),
    'Make FastAPI /health pass on the remote origin.',
  ),
  stage(
    'agent-health-ready',
    agentHealth.status === 'passed',
    JSON.stringify(agentHealth),
    'Make Agent Runtime /health pass on the remote origin.',
  ),
  stage(
    'pages-live-vars-after-health-safe',
    mode !== 'live' || (apiHealth.status === 'passed' && agentHealth.status === 'passed'),
    `current=${mode}`,
    'Only set VITE_PUBLIC_RUNTIME_MODE=live after both remote health checks pass.',
  ),
]

const blockedStages = stages.filter(item => item.status !== 'ready')
const healthReady = stages.find(item => item.id === 'api-health-ready')?.status === 'ready'
  && stages.find(item => item.id === 'agent-health-ready')?.status === 'ready'
const assigned = Boolean(apiServiceId && agentServiceId && apiSecretsReady && agentSecretsReady && isRemoteHttps(apiOrigin) && isRemoteHttps(agentOrigin))

let executionDecision = plan.defaultDecision || 'remote_origin_execution_unassigned'
if (assigned && !healthReady) executionDecision = 'remote_origin_execution_pending_health'
if (assigned && healthReady) executionDecision = 'remote_origin_execution_ready'

const artifact = {
  generatedAt: new Date().toISOString(),
  status: executionDecision === 'remote_origin_execution_ready' && blockedStages.length === 0 ? 'ready' : 'blocked',
  gate: 'P73 Remote Runtime Origin Execution Gate',
  executionDecision,
  repo,
  repoVariables: {
    checked: repoVariables.checked,
    source: repoVariables.source,
    present: {
      VITE_PUBLIC_RUNTIME_MODE: Boolean(repoVariables.values.VITE_PUBLIC_RUNTIME_MODE),
      VITE_API_ORIGIN: Boolean(repoVariables.values.VITE_API_ORIGIN),
      VITE_AGENT_RUNTIME_BASE_URL: Boolean(repoVariables.values.VITE_AGENT_RUNTIME_BASE_URL),
    },
  },
  services: [
    {
      id: 'api',
      serviceAssigned: Boolean(apiServiceId),
      origin: apiOrigin || null,
      imageName: apiPlan.imageName,
      health: apiHealth,
      providerSecretsConfigured: apiSecretsReady,
    },
    {
      id: 'agent',
      serviceAssigned: Boolean(agentServiceId),
      origin: agentOrigin || null,
      imageName: agentPlan.imageName,
      health: agentHealth,
      providerSecretsConfigured: agentSecretsReady,
    },
  ],
  stages,
  blockedStages: blockedStages.map(item => ({
    id: item.id,
    nextAction: item.nextAction,
  })),
  nextCommands: {
    verifyImages: plan.imageEvidenceCommand,
    verifyOrigins: 'REQUIRE_REMOTE_ORIGIN_PROVISIONED=true npm run check:remote-origin-provisioning',
    verifyReadiness: 'REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness',
    verifyBrowser: 'npm run qa:live-runtime-browser',
  },
}

const privacyViolations = scanNoPrivateTerms(artifact)
assert(privacyViolations.length === 0, `remote origin execution artifact privacy violations: ${privacyViolations.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `remote-origin-execution-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: artifact.status === 'ready' ? 'passed' : 'passed_with_execution_blockers',
  artifactPath,
  executionDecision,
  blockedStages: blockedStages.map(item => item.id),
}, null, 2))

if (process.env.REQUIRE_REMOTE_ORIGIN_EXECUTED === 'true' && artifact.status !== 'ready') {
  throw new Error(`Remote origin execution is blocked: ${blockedStages.map(item => item.id).join(', ')}`)
}
