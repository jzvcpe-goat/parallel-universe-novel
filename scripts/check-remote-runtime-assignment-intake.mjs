#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'
const defaultAssignmentPath = 'deploy/runtime-production/remote-assignment.local.json'
const assignmentPath = process.env.REMOTE_RUNTIME_ASSIGNMENT_FILE || defaultAssignmentPath

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function maybeReadJson(rel) {
  const path = join(root, rel)
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
  return /<.+>/.test(String(value || ''))
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
const assignment = maybeReadJson(assignmentPath)
const artifact = assignment
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
  assignmentPath,
  blockedStages: artifact.blockedStages,
  artifactPath,
}, null, 2))
