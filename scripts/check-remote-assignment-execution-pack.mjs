#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'
const defaultAssignmentPath = 'deploy/runtime-production/remote-assignment.local.json'
const assignmentPath = process.env.REMOTE_RUNTIME_ASSIGNMENT_FILE || defaultAssignmentPath
const required = process.env.REQUIRE_REMOTE_ASSIGNMENT_EXECUTION_READY === 'true'

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
  return /<.+>/.test(String(value || ''))
}

function isProvided(value) {
  return Boolean(String(value || '').trim()) && !isPlaceholder(value)
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
    /Authorization:\s*Bearer\s+(?!<shared-tool-bridge-secret>)/i,
    /system prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function stage(id, passed, detail, nextAction) {
  return {
    id,
    status: passed ? 'ready' : 'blocked',
    detail,
    nextAction,
  }
}

function shellQuote(value) {
  const text = String(value || '')
  if (/^[A-Za-z0-9_./:=@%+,-]+$/.test(text)) return text
  return `'${text.replace(/'/g, "'\\''")}'`
}

function ghSet(name, value) {
  return `gh variable set ${name} --repo ${repo} --body ${shellQuote(value)}`
}

function ghDelete(name) {
  return `gh variable delete ${name} --repo ${repo} --confirm`
}

function markdownList(items) {
  if (!items.length) return '- Waiting for a completed non-secret remote assignment.'
  return items.map(item => `- \`${item}\``).join('\n')
}

function renderMarkdown(artifact) {
  const healthCommands = markdownList(artifact.commands.health)
  const githubCommands = markdownList(artifact.commands.githubVariables)
  const strictCommands = markdownList(artifact.commands.strictGates)
  const rollbackCommands = markdownList(artifact.commands.rollback)
  const checklist = artifact.operatorChecklist.map((item, index) => `${index + 1}. ${item}`).join('\n')
  return `# P79 Remote Assignment Execution Pack

Generated: ${artifact.generatedAt}

Decision: \`${artifact.decision}\`

## Summary

- Repository: \`${artifact.repository}\`
- Assignment path: \`${artifact.assignmentPath}\`
- API origin: \`${artifact.services.api.origin || 'missing'}\`
- Agent origin: \`${artifact.services.agent.origin || 'missing'}\`
- API image: \`${artifact.services.api.image || 'missing'}\`
- Agent image: \`${artifact.services.agent.image || 'missing'}\`

## Health Commands

${healthCommands}

## GitHub Variable Commands

${githubCommands}

## Strict Gate Commands

${strictCommands}

## Rollback Commands

${rollbackCommands}

## Operator Checklist

${checklist}
`
}

function buildMissingArtifact() {
  return {
    version: 1,
    gate: 'P79_REMOTE_ASSIGNMENT_EXECUTION_PACK',
    generatedAt: new Date().toISOString(),
    repository: repo,
    required,
    assignmentPath,
    decision: 'assignment_execution_waiting_for_assignment',
    status: 'blocked',
    blockedStages: ['assignment-file-present'],
    services: {
      api: { origin: null, image: null, serviceIdProvided: false },
      agent: { origin: null, image: null, serviceIdProvided: false },
    },
    commands: {
      health: [],
      githubVariables: [],
      strictGates: [
        `cp deploy/runtime-production/remote-assignment.example.json ${defaultAssignmentPath}`,
        `REMOTE_RUNTIME_ASSIGNMENT_FILE=${assignmentPath} npm run check:remote-assignment-execution-pack`,
      ],
      rollback: [
        ghSet('VITE_PUBLIC_RUNTIME_MODE', 'disabled'),
        ghDelete('VITE_API_ORIGIN'),
        ghDelete('VITE_AGENT_RUNTIME_BASE_URL'),
        `gh workflow run "Deploy Creator Studio Preview" --repo ${repo}`,
      ],
    },
    stages: [
      stage(
        'assignment-file-present',
        false,
        `${assignmentPath} does not exist`,
        `Copy deploy/runtime-production/remote-assignment.example.json to ${defaultAssignmentPath} and fill non-secret remote service evidence.`,
      ),
    ],
    operatorChecklist: [
      `Copy deploy/runtime-production/remote-assignment.example.json to ${defaultAssignmentPath}.`,
      'Fill owner, provider, service ids, HTTPS origins, image refs and provider-secret-store confirmation flags.',
      'Do not place database URLs, Tool Bridge tokens, model keys, provider API tokens or private keys in the assignment file.',
      'Run npm run check:remote-assignment-execution-pack again.',
    ],
  }
}

function expectedImage(serviceManifest, id) {
  const service = serviceManifest.services.find(item => item.id === id)
  assert(service, `service manifest missing ${id}`)
  return service.imageName
}

function buildExecutionArtifact({ assignment, serviceManifest }) {
  const api = assignment.services?.api || {}
  const agent = assignment.services?.agent || {}
  const pages = assignment.pagesVariablesAfterHealth || {}
  const apiOrigin = normalizeOrigin(api.origin)
  const agentOrigin = normalizeOrigin(agent.origin)
  const apiBaseUrl = normalizeOrigin(pages.VITE_API_BASE_URL || `${apiOrigin}/v1`)

  const stages = [
    stage('assignment-file-present', true, assignmentPath, 'Assignment file was read.'),
    stage('assignment-version', assignment.version === 1, String(assignment.version), 'Use assignment version 1.'),
    stage('assignment-gate', assignment.gate === 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE', assignment.gate, 'Use the P75 assignment gate name.'),
    stage('repository', assignment.repository === repo, assignment.repository, `Set repository to ${repo}.`),
    stage('host-target', assignment.hostTargetProfile === serviceManifest.hostTargetProfile, assignment.hostTargetProfile, `Set hostTargetProfile to ${serviceManifest.hostTargetProfile}.`),
    stage('api-service-id', isProvided(api.serviceId), api.serviceId ? 'provided' : 'missing', 'Fill services.api.serviceId.'),
    stage('agent-service-id', isProvided(agent.serviceId), agent.serviceId ? 'provided' : 'missing', 'Fill services.agent.serviceId.'),
    stage('api-origin', isRemoteHttps(apiOrigin), apiOrigin || 'missing', 'Fill services.api.origin with a remote HTTPS origin.'),
    stage('agent-origin', isRemoteHttps(agentOrigin), agentOrigin || 'missing', 'Fill services.agent.origin with a remote HTTPS origin.'),
    stage('api-provider-secrets-ready', api.providerSecretsConfigured === true, String(api.providerSecretsConfigured), 'Confirm API provider secrets are configured in the provider secret store.'),
    stage('agent-provider-secrets-ready', agent.providerSecretsConfigured === true, String(agent.providerSecretsConfigured), 'Confirm Agent provider secrets are configured in the provider secret store.'),
    stage('api-image', String(api.image || '').startsWith(expectedImage(serviceManifest, 'api')), api.image || 'missing', 'Use the API GHCR image from the service manifest.'),
    stage('agent-image', String(agent.image || '').startsWith(expectedImage(serviceManifest, 'agent')), agent.image || 'missing', 'Use the Agent GHCR image from the service manifest.'),
    stage('agent-depends-on-api', Array.isArray(agent.dependsOn) && agent.dependsOn.includes('api'), JSON.stringify(agent.dependsOn || []), 'Agent assignment must depend on api.'),
    stage('pages-mode-live', pages.VITE_PUBLIC_RUNTIME_MODE === 'live', String(pages.VITE_PUBLIC_RUNTIME_MODE), 'Set pagesVariablesAfterHealth.VITE_PUBLIC_RUNTIME_MODE to live.'),
    stage('pages-api-origin-match', normalizeOrigin(pages.VITE_API_ORIGIN) === apiOrigin, normalizeOrigin(pages.VITE_API_ORIGIN), 'Pages API origin must match services.api.origin.'),
    stage('pages-agent-origin-match', normalizeOrigin(pages.VITE_AGENT_RUNTIME_BASE_URL) === agentOrigin, normalizeOrigin(pages.VITE_AGENT_RUNTIME_BASE_URL), 'Pages Agent origin must match services.agent.origin.'),
  ]

  const blockedStages = stages.filter(item => item.status !== 'ready').map(item => item.id)
  const assignmentReadyForExecution = blockedStages.length === 0
  const decision = assignmentReadyForExecution
    ? 'assignment_execution_pack_ready'
    : 'assignment_execution_incomplete'

  const healthCommands = isRemoteHttps(apiOrigin) && isRemoteHttps(agentOrigin)
    ? [
        `curl -fsS ${apiOrigin}${api.healthPath || '/health'}`,
        `curl -fsS ${agentOrigin}${agent.healthPath || '/health'}`,
      ]
    : []

  const githubVariables = assignmentReadyForExecution
    ? [
        ghSet('VITE_PUBLIC_RUNTIME_MODE', 'live'),
        ghSet('VITE_API_ORIGIN', apiOrigin),
        ghSet('VITE_API_BASE_URL', apiBaseUrl),
        ghSet('VITE_AGENT_RUNTIME_BASE_URL', agentOrigin),
        ghSet('REMOTE_API_SERVICE_ID', api.serviceId),
        ghSet('REMOTE_AGENT_SERVICE_ID', agent.serviceId),
        ghSet('REMOTE_API_SECRETS_CONFIGURED', 'true'),
        ghSet('REMOTE_AGENT_SECRETS_CONFIGURED', 'true'),
      ]
    : []

  const strictGates = [
    `REMOTE_RUNTIME_ASSIGNMENT_FILE=${assignmentPath} REQUIRE_REMOTE_ASSIGNMENT_READY=true npm run check:remote-runtime-assignment-intake`,
    `REMOTE_API_SERVICE_ID=${shellQuote(api.serviceId || '<provider-api-service-id>')} REMOTE_AGENT_SERVICE_ID=${shellQuote(agent.serviceId || '<provider-agent-service-id>')} REMOTE_API_ORIGIN=${shellQuote(apiOrigin || 'https://<api-host>')} REMOTE_AGENT_ORIGIN=${shellQuote(agentOrigin || 'https://<agent-host>')} REMOTE_API_SECRETS_CONFIGURED=${api.providerSecretsConfigured === true ? 'true' : '<true-after-provider-secret-store>'} REMOTE_AGENT_SECRETS_CONFIGURED=${agent.providerSecretsConfigured === true ? 'true' : '<true-after-provider-secret-store>'} REQUIRE_REMOTE_ORIGIN_EXECUTED=true npm run check:remote-origin-execution`,
    `VITE_PUBLIC_RUNTIME_MODE=live VITE_API_ORIGIN=${shellQuote(apiOrigin || 'https://<api-host>')} VITE_API_BASE_URL=${shellQuote(apiBaseUrl || 'https://<api-host>/v1')} VITE_AGENT_RUNTIME_BASE_URL=${shellQuote(agentOrigin || 'https://<agent-host>')} REMOTE_API_SERVICE_ID=${shellQuote(api.serviceId || '<provider-api-service-id>')} REMOTE_AGENT_SERVICE_ID=${shellQuote(agent.serviceId || '<provider-agent-service-id>')} REMOTE_API_SECRETS_CONFIGURED=${api.providerSecretsConfigured === true ? 'true' : '<true-after-provider-secret-store>'} REMOTE_AGENT_SECRETS_CONFIGURED=${agent.providerSecretsConfigured === true ? 'true' : '<true-after-provider-secret-store>'} REQUIRE_LIVE_CUTOVER_ATTESTED=true npm run check:live-cutover-attestation`,
    'REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true npm run check:remote-runtime-activation-control',
  ]

  const rollback = [
    ghSet('VITE_PUBLIC_RUNTIME_MODE', 'disabled'),
    ghDelete('VITE_API_ORIGIN'),
    ghDelete('VITE_API_BASE_URL'),
    ghDelete('VITE_AGENT_RUNTIME_BASE_URL'),
    `gh workflow run "Deploy Creator Studio Preview" --repo ${repo}`,
    'npm run check:live-rollback-rehearsal',
  ]

  return {
    version: 1,
    gate: 'P79_REMOTE_ASSIGNMENT_EXECUTION_PACK',
    generatedAt: new Date().toISOString(),
    repository: repo,
    required,
    assignmentPath,
    decision,
    status: assignmentReadyForExecution ? 'ready' : 'blocked',
    blockedStages,
    operator: {
      ownerProvided: isProvided(assignment.operator?.owner),
      providerProvided: isProvided(assignment.operator?.provider),
      environment: assignment.operator?.environment || null,
    },
    services: {
      api: {
        serviceIdProvided: isProvided(api.serviceId),
        origin: apiOrigin || null,
        image: api.image || null,
        providerSecretsConfigured: api.providerSecretsConfigured === true,
      },
      agent: {
        serviceIdProvided: isProvided(agent.serviceId),
        origin: agentOrigin || null,
        image: agent.image || null,
        providerSecretsConfigured: agent.providerSecretsConfigured === true,
      },
    },
    pagesVariablesAfterHealth: {
      VITE_PUBLIC_RUNTIME_MODE: pages.VITE_PUBLIC_RUNTIME_MODE || null,
      VITE_API_ORIGIN: normalizeOrigin(pages.VITE_API_ORIGIN) || null,
      VITE_API_BASE_URL: apiBaseUrl || null,
      VITE_AGENT_RUNTIME_BASE_URL: normalizeOrigin(pages.VITE_AGENT_RUNTIME_BASE_URL) || null,
    },
    commands: {
      health: healthCommands,
      githubVariables,
      strictGates,
      rollback,
    },
    stages,
    operatorChecklist: [
      'Run the health commands and confirm both endpoints return ok or healthy JSON.',
      'Run the strict assignment intake command before setting public live variables.',
      'Set the GitHub Variables only after provider secret stores and remote health are confirmed.',
      'Run the strict cutover and activation-control commands before dispatching Pages.',
      'Keep the rollback commands ready before public live mode is enabled.',
    ],
  }
}

const requiredFiles = [
  '.gitignore',
  'deploy/runtime-production/remote-assignment.example.json',
  'deploy/runtime-production/service-manifest.json',
  'docs/backend/P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE.md',
  'docs/backend/P78_REMOTE_RUNTIME_ACTIVATION_CONTROL.md',
  'docs/backend/P79_REMOTE_ASSIGNMENT_EXECUTION_PACK.md',
]
for (const file of requiredFiles) assert(existsSync(join(root, file)), `missing assignment execution pack file: ${file}`)

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:remote-assignment-execution-pack'] === 'node scripts/check-remote-assignment-execution-pack.mjs',
  'package.json must expose check:remote-assignment-execution-pack',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-assignment-execution-pack'),
  'root npm run test must include check:remote-assignment-execution-pack',
)
assert(read('.gitignore').includes(defaultAssignmentPath), '.gitignore must ignore local assignment file')
assertContains('docs/backend/P79_REMOTE_ASSIGNMENT_EXECUTION_PACK.md', [
  'P79 Remote Assignment Execution Pack',
  'check:remote-assignment-execution-pack',
  'assignment_execution_waiting_for_assignment',
  'assignment_execution_pack_ready',
  'REQUIRE_REMOTE_ASSIGNMENT_EXECUTION_READY=true',
])
assertContains('docs/backend/P78_REMOTE_RUNTIME_ACTIVATION_CONTROL.md', [
  'Remote Assignment Execution Pack',
  'check:remote-assignment-execution-pack',
])

const assignment = maybeReadJson(assignmentPath)
if (assignment) {
  const privateHits = scanNoPrivateTerms(assignment)
  assert(privateHits.length === 0, `assignment file contains private terms: ${privateHits.join(', ')}`)
}

const serviceManifest = readJson('deploy/runtime-production/service-manifest.json')
const artifact = assignment
  ? buildExecutionArtifact({ assignment, serviceManifest })
  : buildMissingArtifact()

const artifactPrivateHits = scanNoPrivateTerms(artifact)
assert(artifactPrivateHits.length === 0, `assignment execution artifact leaked private terms: ${artifactPrivateHits.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const artifactPath = join(artifactDir, `remote-assignment-execution-pack-${timestamp}.json`)
const markdownArtifactPath = join(artifactDir, `remote-assignment-execution-pack-${timestamp}.md`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)
writeFileSync(markdownArtifactPath, renderMarkdown(artifact))

if (required && artifact.status !== 'ready') {
  console.error(JSON.stringify({ ...artifact, artifactPath, markdownArtifactPath }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({
  status: artifact.status === 'ready' ? 'passed' : 'passed_with_assignment_execution_blockers',
  gate: artifact.gate,
  decision: artifact.decision,
  blockedStages: artifact.blockedStages,
  artifactPath,
  markdownArtifactPath,
}, null, 2))
