#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'
const defaultAssignmentPath = 'deploy/runtime-production/remote-assignment.local.json'
const assignmentPath = process.env.REMOTE_RUNTIME_ASSIGNMENT_FILE || defaultAssignmentPath
const intentPath = 'deploy/runtime-production/runtime-assignment.intent.local.json'
const intentExamplePath = 'deploy/runtime-production/runtime-assignment.intent.example.json'
const generatedContractPath = 'deploy/runtime-production/generated/remote-assignment.contract.json'
const explicitAssignmentPath = Boolean(process.env.REMOTE_RUNTIME_ASSIGNMENT_FILE)

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function runtimePath(path) {
  return String(path || '').startsWith('/') ? String(path) : join(root, path)
}

function maybeReadJson(rel) {
  const path = runtimePath(rel)
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf8'))
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

function isPlaceholder(value) {
  const text = String(value || '').trim()
  return /<[^>]+>/.test(text)
    || /\bFILL_[A-Z0-9_]+\b/i.test(text)
    || /\bREPLACE_ME\b/i.test(text)
    || /\bYOUR[_-][A-Z0-9_-]+\b/i.test(text)
    || /\bTODO[_-][A-Z0-9_-]+\b/i.test(text)
}

function isRemoteHttps(value) {
  const normalized = normalizeOrigin(value)
  return /^https:\/\//.test(normalized)
    && !/localhost|127\.0\.0\.1|0\.0\.0\.0|\[?::1\]?/.test(normalized)
    && !/example\.com/.test(normalized)
    && !isPlaceholder(normalized)
}

function scanNoPrivateTerms(payload) {
  const text = JSON.stringify(payload)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL=(?!<)/,
    /postgres(ql)?:\/\/[^<]/i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/,
    /dev-local-token/,
    /NARRATIVEOS_TOOL_BRIDGE_TOKEN=(?!<)/,
    /MASTRA_TOOL_BRIDGE_TOKEN=(?!<)/,
    /NARRATIVEOS_CREATOR_API_KEY=(?!<)/,
    /system prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function edgeOnlyHealthReady() {
  const health = maybeReadJson('deploy/runtime-production/generated/remote-health-evidence.result.json')
  if (!health) return false
  return health.status === 'ok'
    && health.runtime_mode === 'edge-only'
    && health.remote_agent?.required === false
    && health.remote_agent?.evidence === 'not-required-edge-only'
}

async function fetchHealth(origin, healthPath, expectedService) {
  if (!isRemoteHttps(origin)) return { status: 'blocked', reason: 'remote https origin not configured' }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), Number(process.env.REMOTE_ASSIGNMENT_HEALTH_TIMEOUT_MS || 10000))
  const url = `${normalizeOrigin(origin)}${healthPath || '/health'}`
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
      status: statusOk && serviceOk ? 'ready' : 'blocked',
      url,
      httpStatus: response.status,
      serviceStatus,
      service: service || null,
    }
  } catch (error) {
    return {
      status: 'blocked',
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

function buildMissingArtifact() {
  return {
    version: 1,
    gate: 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE',
    generatedAt: new Date().toISOString(),
    repository: repo,
    assignmentPath,
    decision: 'remote_assignment_missing',
    blockedStages: ['assignment-file-present'],
    stages: [
      stage(
        'assignment-file-present',
        false,
        `${assignmentPath} does not exist`,
        `Copy deploy/runtime-production/remote-assignment.example.json to ${defaultAssignmentPath} and fill non-secret service evidence.`,
      ),
    ],
  }
}

function buildContractArtifact(contract) {
  const isEdgeOnly = contract.runtime_mode === 'edge-only'
  const healthReady = edgeOnlyHealthReady()
  const frontend = contract.topology?.frontend || {}
  const dataApi = contract.topology?.data_api || {}
  const agent = contract.topology?.agent || {}
  const apiOrigin = normalizeOrigin(dataApi.origin)
  const frontendOrigin = normalizeOrigin(frontend.origin)
  const agentOrigin = normalizeOrigin(agent.remote_origin)
  const stages = [
    stage('runtime-contract-present', true, generatedContractPath, 'Compiled runtime assignment contract was read.'),
    stage('runtime-contract-version', contract.schema_version === 1, String(contract.schema_version), 'Use runtime assignment contract schema_version=1.'),
    stage('runtime-mode', ['edge-only', 'hybrid', 'full-remote'].includes(contract.runtime_mode), String(contract.runtime_mode), 'Use edge-only, hybrid, or full-remote runtime mode.'),
    stage('operator-owner', Boolean(contract.operator?.owner), contract.operator?.owner ? 'provided' : 'missing', 'Fill operator.owner in runtime assignment intent.'),
    stage('operator-provider', Boolean(contract.operator?.provider), contract.operator?.provider ? 'provided' : 'missing', 'Fill operator.provider in runtime assignment intent.'),
    stage('frontend-service-id', Boolean(frontend.service_id), frontend.service_id ? 'provided' : 'missing', 'Fill frontend.service_id.'),
    stage('frontend-origin', isRemoteHttps(frontendOrigin), frontendOrigin || 'missing', 'Fill frontend.origin with production HTTPS origin.'),
    stage('frontend-secrets-ready', frontend.secrets_configured === true, String(frontend.secrets_configured), 'Confirm frontend provider config is ready.'),
    stage('data-api-service-id', Boolean(dataApi.service_id), dataApi.service_id ? 'provided' : 'missing', 'Fill data_api.service_id.'),
    stage('data-api-origin', isRemoteHttps(apiOrigin), apiOrigin || 'missing', 'Fill data_api.origin with production HTTPS origin.'),
    stage('data-api-secrets-ready', dataApi.secrets_configured === true, String(dataApi.secrets_configured), 'Confirm data API publishable/RLS config is ready.'),
    stage('secret-boundary', contract.secret_boundary?.service_role_in_frontend_allowed === false && contract.secret_boundary?.writer_password_in_frontend_allowed === false && contract.secret_boundary?.cloud_ai_api_keys_allowed === false, 'public boundary checked', 'Keep service role, writer password and AI keys out of frontend.'),
  ]

  if (isEdgeOnly) {
    stages.push(stage('remote-agent-not-required', agent.remote_required === false, String(agent.remote_required), 'Edge-only runtime must not require remote agent.'))
    stages.push(stage('remote-agent-service-absent', agent.remote_service_id == null && agent.remote_origin == null, 'not-required-edge-only', 'Do not fabricate remote Agent service evidence for edge-only.'))
    stages.push(stage('cloud-ai-runtime-disabled', agent.ai_generation_cloud_runtime === false, String(agent.ai_generation_cloud_runtime), 'AI generation must stay on the user-owned edge device.'))
    stages.push(stage('reader-ai-trigger-disabled', agent.reader_can_trigger_ai === false, String(agent.reader_can_trigger_ai), 'Reader cloud path must not trigger AI generation.'))
    stages.push(stage('data-api-health-ready', healthReady, healthReady ? 'ready' : 'pending', 'Run npm run remote-health:check after data API evidence is configured.'))
  } else {
    stages.push(stage('remote-agent-required', agent.remote_required === true, String(agent.remote_required), 'Hybrid/full-remote requires remote Agent service.'))
    stages.push(stage('agent-service-id', Boolean(agent.remote_service_id), agent.remote_service_id ? 'provided' : 'missing', 'Fill agent.service_id.'))
    stages.push(stage('agent-origin', isRemoteHttps(agentOrigin), agentOrigin || 'missing', 'Fill agent.origin with remote HTTPS origin.'))
    stages.push(stage('agent-provider-secrets-ready', agent.remote_secrets_configured === true, String(agent.remote_secrets_configured), 'Confirm Agent provider secrets are configured.'))
  }

  const blockedStages = stages.filter(item => item.status !== 'ready').map(item => item.id)
  const nonHealthBlocked = blockedStages.filter(item => !item.endsWith('health-ready'))
  return {
    version: 1,
    gate: 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE',
    generatedAt: new Date().toISOString(),
    repository: repo,
    assignmentPath: generatedContractPath,
    assignmentSource: 'runtime-assignment-compiler',
    preferredAssignmentPath: intentPath,
    legacyAssignmentPath: defaultAssignmentPath,
    runtimeMode: contract.runtime_mode,
    remoteAgentRequired: !isEdgeOnly,
    assignmentFilePresent: existsSync(join(root, defaultAssignmentPath)),
    assignmentEvidencePresent: true,
    decision: nonHealthBlocked.length
      ? 'remote_assignment_incomplete'
      : blockedStages.length
      ? 'remote_assignment_pending_health'
      : 'remote_assignment_ready',
    blockedStages,
    services: {
      api: {
        serviceIdProvided: Boolean(dataApi.service_id),
        origin: apiOrigin || null,
        image: null,
        providerSecretsConfigured: dataApi.secrets_configured === true,
      },
      frontend: {
        serviceIdProvided: Boolean(frontend.service_id),
        origin: frontendOrigin || null,
        providerSecretsConfigured: frontend.secrets_configured === true,
      },
      agent: isEdgeOnly
        ? {
            serviceIdProvided: false,
            origin: null,
            providerSecretsConfigured: false,
            absenceExpected: true,
            absenceReason: 'edge-only runtime: AI generation occurs on user-owned edge device',
          }
        : {
            serviceIdProvided: Boolean(agent.remote_service_id),
            origin: agentOrigin || null,
            providerSecretsConfigured: agent.remote_secrets_configured === true,
            absenceExpected: false,
          },
    },
    health: {
      frontend: { status: 'pending_remote_health_check', url: contract.health?.frontend_url || null },
      dataApi: {
        status: 'pending_remote_health_check',
        origin: apiOrigin || null,
        table: contract.health?.data_probe_table || null,
        id: contract.health?.data_probe_id || null,
      },
      agent: isEdgeOnly
        ? { status: 'not-required-edge-only', required: false }
        : { status: 'pending_remote_health_check', required: true, origin: agentOrigin || null },
    },
    stages,
    exportCommandsForP73: isEdgeOnly
      ? [
          'export REMOTE_RUNTIME_MODE=edge-only',
          `export REMOTE_API_SERVICE_ID=${dataApi.service_id || '<supabase-project-ref>'}`,
          `export REMOTE_API_ORIGIN=${apiOrigin || 'https://<supabase-project-ref>.supabase.co'}`,
          `export REMOTE_API_SECRETS_CONFIGURED=${dataApi.secrets_configured === true ? 'true' : '<true-after-rls-and-publishable-key>'}`,
          'export REMOTE_AGENT_REMOTE_REQUIRED=false',
          'export REMOTE_AGENT_SECRETS_CONFIGURED=false',
          'npm run remote-health:check',
        ]
      : [
          `export REMOTE_API_SERVICE_ID=${dataApi.service_id || '<provider-api-service-id>'}`,
          `export REMOTE_AGENT_SERVICE_ID=${agent.remote_service_id || '<provider-agent-service-id>'}`,
          `export REMOTE_API_ORIGIN=${apiOrigin || 'https://<api-host>'}`,
          `export REMOTE_AGENT_ORIGIN=${agentOrigin || 'https://<agent-host>'}`,
          `export REMOTE_API_SECRETS_CONFIGURED=${dataApi.secrets_configured === true ? 'true' : '<true-after-provider-secret-store>'}`,
          `export REMOTE_AGENT_SECRETS_CONFIGURED=${agent.remote_secrets_configured === true ? 'true' : '<true-after-provider-secret-store>'}`,
          'REQUIRE_REMOTE_ORIGIN_EXECUTED=true npm run check:remote-origin-execution',
        ],
  }
}

function buildIntentArtifact(intent, sourcePath = intentPath, source = 'runtime-assignment-intent') {
  const isEdgeOnly = intent.runtime_mode === 'edge-only'
  const healthReady = edgeOnlyHealthReady()
  const dataOrigin = normalizeOrigin(intent.data_api?.origin)
  const frontendOrigin = normalizeOrigin(intent.frontend?.origin)
  const stages = [
    stage('runtime-assignment-intent-present', true, sourcePath, 'Runtime assignment intent was read.'),
    stage('runtime-assignment-intent-version', intent.schema_version === 1, String(intent.schema_version), 'Use runtime assignment intent schema_version=1.'),
    stage('runtime-mode', isEdgeOnly, String(intent.runtime_mode), 'Current launch topology must use edge-only.'),
    stage('operator-owner', Boolean(intent.operator?.owner) && !isPlaceholder(intent.operator.owner), intent.operator?.owner ? 'provided' : 'missing', 'Fill operator.owner in runtime assignment intent.'),
    stage('operator-provider', Boolean(intent.operator?.provider) && !isPlaceholder(intent.operator.provider), intent.operator?.provider ? 'provided' : 'missing', 'Fill operator.provider in runtime assignment intent.'),
    stage('frontend-provider', Boolean(intent.frontend?.provider) && !isPlaceholder(intent.frontend.provider), intent.frontend?.provider ? 'provided' : 'missing', 'Fill frontend.provider.'),
    stage('frontend-service-id', Boolean(intent.frontend?.service_id) && !isPlaceholder(intent.frontend.service_id), intent.frontend?.service_id ? 'provided' : 'missing', 'Fill frontend.service_id.'),
    stage('frontend-origin', isRemoteHttps(frontendOrigin), frontendOrigin || 'missing', 'Fill frontend.origin with production HTTPS origin.'),
    stage('frontend-secrets-ready', intent.frontend?.secrets_configured === true, String(intent.frontend?.secrets_configured), 'Confirm frontend public config is ready.'),
    stage('data-api-provider', Boolean(intent.data_api?.provider) && !isPlaceholder(intent.data_api.provider), intent.data_api?.provider ? 'provided' : 'missing', 'Fill data_api.provider.'),
    stage('data-api-service-id', Boolean(intent.data_api?.service_id) && !isPlaceholder(intent.data_api.service_id), intent.data_api?.service_id ? 'provided' : 'missing', 'Fill data_api.service_id.'),
    stage('data-api-origin', isRemoteHttps(dataOrigin), dataOrigin || 'missing', 'Fill data_api.origin with production HTTPS origin.'),
    stage('data-api-secrets-ready', intent.data_api?.secrets_configured === true, String(intent.data_api?.secrets_configured), 'Confirm data API publishable/RLS config is ready.'),
    stage('remote-agent-not-required', intent.agent?.remote_required === false, String(intent.agent?.remote_required), 'Edge-only runtime must not require remote Agent service evidence.'),
    stage('cloud-ai-runtime-disabled', intent.agent?.ai_generation_cloud_runtime === false, String(intent.agent?.ai_generation_cloud_runtime), 'AI generation must stay on the user-owned edge device.'),
    stage('reader-ai-trigger-disabled', intent.agent?.reader_can_trigger_ai === false, String(intent.agent?.reader_can_trigger_ai), 'Reader cloud path must not trigger AI generation.'),
    stage('data-api-health-ready', healthReady, healthReady ? 'ready' : 'pending', 'Run npm run remote-health:check after data API evidence is configured.'),
  ]

  const blockedStages = stages.filter(item => item.status !== 'ready').map(item => item.id)
  const nonHealthBlocked = blockedStages.filter(item => !item.endsWith('health-ready'))
  return {
    version: 1,
    gate: 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE',
    generatedAt: new Date().toISOString(),
    repository: repo,
    assignmentPath: sourcePath,
    assignmentSource: source,
    preferredAssignmentPath: intentPath,
    legacyAssignmentPath: defaultAssignmentPath,
    runtimeMode: intent.runtime_mode,
    remoteAgentRequired: !isEdgeOnly,
    assignmentFilePresent: existsSync(join(root, defaultAssignmentPath)),
    assignmentEvidencePresent: true,
    decision: nonHealthBlocked.length
      ? 'remote_assignment_incomplete'
      : blockedStages.length
      ? 'remote_assignment_pending_health'
      : 'remote_assignment_ready',
    blockedStages,
    services: {
      frontend: {
        serviceIdProvided: Boolean(intent.frontend?.service_id) && !isPlaceholder(intent.frontend.service_id),
        origin: frontendOrigin || null,
        providerSecretsConfigured: intent.frontend?.secrets_configured === true,
      },
      api: {
        serviceIdProvided: Boolean(intent.data_api?.service_id) && !isPlaceholder(intent.data_api.service_id),
        origin: dataOrigin || null,
        image: null,
        providerSecretsConfigured: intent.data_api?.secrets_configured === true,
      },
      agent: {
        serviceIdProvided: false,
        origin: null,
        providerSecretsConfigured: false,
        absenceExpected: true,
        absenceReason: 'edge-only runtime: AI generation occurs on user-owned edge device',
      },
    },
    health: {
      frontend: { status: 'pending_remote_health_check', url: intent.health?.frontend_url || null },
      dataApi: {
        status: healthReady ? 'ready' : 'pending_remote_health_check',
        origin: dataOrigin || null,
        table: intent.health?.data_probe_table || null,
        id: intent.health?.data_probe_id || null,
      },
      agent: { status: 'not-required-edge-only', required: false },
    },
    stages,
    exportCommandsForP73: [
      'export REMOTE_RUNTIME_MODE=edge-only',
      `export REMOTE_API_SERVICE_ID=${intent.data_api?.service_id || '<supabase-project-ref>'}`,
      `export REMOTE_API_ORIGIN=${dataOrigin || 'https://<supabase-project-ref>.supabase.co'}`,
      `export REMOTE_API_SECRETS_CONFIGURED=${intent.data_api?.secrets_configured === true ? 'true' : '<true-after-rls-and-publishable-key>'}`,
      'export REMOTE_AGENT_REMOTE_REQUIRED=false',
      'export REMOTE_AGENT_SECRETS_CONFIGURED=false',
      'npm run remote-health:check',
    ],
  }
}

function expectedImage(serviceManifest, id) {
  const service = serviceManifest.services.find(item => item.id === id)
  assert(service, `service manifest missing ${id}`)
  return service.imageName
}

async function buildAssignmentArtifact({ assignment, serviceManifest }) {
  const api = assignment.services?.api || {}
  const agent = assignment.services?.agent || {}
  const apiOrigin = normalizeOrigin(api.origin)
  const agentOrigin = normalizeOrigin(agent.origin)
  const stages = [
    stage('assignment-file-present', true, assignmentPath, 'Assignment file was read.'),
    stage('assignment-version', assignment.version === 1, String(assignment.version), 'Use assignment version 1.'),
    stage('assignment-gate', assignment.gate === 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE', assignment.gate, 'Use the P75 gate name.'),
    stage('repository', assignment.repository === repo, assignment.repository, `Set repository to ${repo}.`),
    stage('host-target', assignment.hostTargetProfile === serviceManifest.hostTargetProfile, assignment.hostTargetProfile, `Set hostTargetProfile to ${serviceManifest.hostTargetProfile}.`),
    stage('api-service-id', Boolean(api.serviceId) && !isPlaceholder(api.serviceId), api.serviceId ? 'provided' : 'missing', 'Fill services.api.serviceId.'),
    stage('agent-service-id', Boolean(agent.serviceId) && !isPlaceholder(agent.serviceId), agent.serviceId ? 'provided' : 'missing', 'Fill services.agent.serviceId.'),
    stage('api-origin', isRemoteHttps(apiOrigin), apiOrigin || 'missing', 'Fill services.api.origin with remote HTTPS origin.'),
    stage('agent-origin', isRemoteHttps(agentOrigin), agentOrigin || 'missing', 'Fill services.agent.origin with remote HTTPS origin.'),
    stage('api-provider-secrets-ready', api.providerSecretsConfigured === true, String(api.providerSecretsConfigured), 'Confirm API provider secrets are configured in provider secret store.'),
    stage('agent-provider-secrets-ready', agent.providerSecretsConfigured === true, String(agent.providerSecretsConfigured), 'Confirm Agent provider secrets are configured in provider secret store.'),
    stage('api-image', String(api.image || '').startsWith(expectedImage(serviceManifest, 'api')), api.image || 'missing', 'Use the API GHCR image from service manifest.'),
    stage('agent-image', String(agent.image || '').startsWith(expectedImage(serviceManifest, 'agent')), agent.image || 'missing', 'Use the Agent GHCR image from service manifest.'),
    stage('agent-depends-on-api', Array.isArray(agent.dependsOn) && agent.dependsOn.includes('api'), JSON.stringify(agent.dependsOn || []), 'Agent assignment must depend on API.'),
    stage('pages-api-origin', normalizeOrigin(assignment.pagesVariablesAfterHealth?.VITE_API_ORIGIN) === apiOrigin, normalizeOrigin(assignment.pagesVariablesAfterHealth?.VITE_API_ORIGIN), 'Pages API origin must match API service origin.'),
    stage('pages-agent-origin', normalizeOrigin(assignment.pagesVariablesAfterHealth?.VITE_AGENT_RUNTIME_BASE_URL) === agentOrigin, normalizeOrigin(assignment.pagesVariablesAfterHealth?.VITE_AGENT_RUNTIME_BASE_URL), 'Pages Agent origin must match Agent service origin.'),
    stage('pages-live-mode', assignment.pagesVariablesAfterHealth?.VITE_PUBLIC_RUNTIME_MODE === 'live', String(assignment.pagesVariablesAfterHealth?.VITE_PUBLIC_RUNTIME_MODE), 'Pages live mode can only be live after health.'),
  ]

  const health = {
    api: await fetchHealth(apiOrigin, api.healthPath || '/health'),
    agent: await fetchHealth(agentOrigin, agent.healthPath || '/health', 'narrativeos-agent-runtime'),
  }
  stages.push(stage('api-health-ready', health.api.status === 'ready', health.api.url || health.api.reason, 'Make API /health return ok over HTTPS.'))
  stages.push(stage('agent-health-ready', health.agent.status === 'ready', health.agent.url || health.agent.reason, 'Make Agent /health return ok over HTTPS.'))

  const blockedStages = stages.filter(item => item.status !== 'ready').map(item => item.id)
  let decision = 'remote_assignment_ready'
  if (blockedStages.some(id => id.endsWith('health-ready'))) decision = 'remote_assignment_pending_health'
  if (blockedStages.some(id => !id.endsWith('health-ready'))) decision = 'remote_assignment_incomplete'

  return {
    version: 1,
    gate: 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE',
    generatedAt: new Date().toISOString(),
    repository: repo,
    assignmentPath,
    decision,
    blockedStages,
    services: {
      api: {
        serviceIdProvided: Boolean(api.serviceId) && !isPlaceholder(api.serviceId),
        origin: apiOrigin || null,
        image: api.image || null,
        providerSecretsConfigured: api.providerSecretsConfigured === true,
      },
      agent: {
        serviceIdProvided: Boolean(agent.serviceId) && !isPlaceholder(agent.serviceId),
        origin: agentOrigin || null,
        image: agent.image || null,
        providerSecretsConfigured: agent.providerSecretsConfigured === true,
      },
    },
    health,
    stages,
    exportCommandsForP73: [
      `export REMOTE_API_SERVICE_ID=${api.serviceId || '<provider-api-service-id>'}`,
      `export REMOTE_AGENT_SERVICE_ID=${agent.serviceId || '<provider-agent-service-id>'}`,
      `export REMOTE_API_ORIGIN=${apiOrigin || 'https://<api-host>'}`,
      `export REMOTE_AGENT_ORIGIN=${agentOrigin || 'https://<agent-host>'}`,
      `export REMOTE_API_SECRETS_CONFIGURED=${api.providerSecretsConfigured === true ? 'true' : '<true-after-provider-secret-store>'}`,
      `export REMOTE_AGENT_SECRETS_CONFIGURED=${agent.providerSecretsConfigured === true ? 'true' : '<true-after-provider-secret-store>'}`,
      'REQUIRE_REMOTE_ORIGIN_EXECUTED=true npm run check:remote-origin-execution',
    ],
  }
}

const requiredFiles = [
  '.gitignore',
  'deploy/runtime-production/remote-assignment.example.json',
  'deploy/runtime-production/service-manifest.json',
  'deploy/runtime-production/runtime-assignment.intent.example.json',
  'docs/backend/P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE.md',
  'docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md',
  'docs/backend/P74_REMOTE_RUNTIME_OPERATOR_HANDOFF.md',
]
for (const file of requiredFiles) assert(existsSync(join(root, file)), `missing assignment intake file: ${file}`)

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:remote-runtime-assignment-intake'] === 'node scripts/check-remote-runtime-assignment-intake.mjs',
  'package.json must expose check:remote-runtime-assignment-intake',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-runtime-assignment-intake'),
  'root npm run test must include check:remote-runtime-assignment-intake',
)

assert(read('.gitignore').includes('deploy/runtime-production/remote-assignment.local.json'), '.gitignore must ignore local assignment file')

const example = readJson('deploy/runtime-production/remote-assignment.example.json')
assert(example.gate === 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE', 'assignment example gate mismatch')
assert(example.services?.api?.providerSecretsConfigured === false, 'example must not claim API secrets configured')
assert(example.services?.agent?.providerSecretsConfigured === false, 'example must not claim Agent secrets configured')
assert(scanNoPrivateTerms(example).length === 0, 'assignment example must not contain private terms')

assertContains('docs/backend/P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE.md', [
  'P75 Remote Runtime Assignment Intake',
  'remote-assignment.example.json',
  'remote-assignment.local.json',
  'runtime-assignment.intent.example.json',
  'check:remote-runtime-assignment-intake',
  'remote_assignment_missing',
  'remote_assignment_incomplete',
  'remote_assignment_pending_health',
  'remote_assignment_ready',
])
assertContains('docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md', [
  'Assignment Intake',
  'npm run check:remote-runtime-assignment-intake',
])
assertContains('docs/backend/P74_REMOTE_RUNTIME_OPERATOR_HANDOFF.md', [
  'P75 Remote Runtime Assignment Intake',
  'check:remote-runtime-assignment-intake',
])

const serviceManifest = readJson('deploy/runtime-production/service-manifest.json')
const contract = explicitAssignmentPath ? null : maybeReadJson(generatedContractPath)
const localIntent = explicitAssignmentPath || contract ? null : maybeReadJson(intentPath)
const exampleIntent = explicitAssignmentPath || contract || localIntent ? null : maybeReadJson(intentExamplePath)
const assignment = maybeReadJson(assignmentPath)
const artifact = contract
  ? buildContractArtifact(contract)
  : localIntent
  ? buildIntentArtifact(localIntent, intentPath, 'runtime-assignment-intent')
  : exampleIntent
  ? buildIntentArtifact(exampleIntent, intentExamplePath, 'runtime-assignment-intent-example')
  : assignment
  ? await buildAssignmentArtifact({ assignment, serviceManifest })
  : buildMissingArtifact()

const privateMatches = scanNoPrivateTerms(artifact)
assert(privateMatches.length === 0, `assignment artifact leaks private terms: ${privateMatches.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const artifactPath = join(artifactDir, `remote-runtime-assignment-intake-${timestamp}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

if (process.env.REQUIRE_REMOTE_ASSIGNMENT_READY === 'true' && artifact.decision !== 'remote_assignment_ready') {
  throw new Error(`remote assignment is not ready: ${artifact.blockedStages.join(', ')}`)
}

console.log(JSON.stringify({
  status: artifact.decision === 'remote_assignment_ready' ? 'passed' : 'passed_with_assignment_blockers',
  gate: artifact.gate,
  decision: artifact.decision,
  assignmentPath: artifact.assignmentPath || assignmentPath,
  runtimeMode: artifact.runtimeMode || 'full-remote',
  blockedStages: artifact.blockedStages,
  artifactPath,
}, null, 2))
