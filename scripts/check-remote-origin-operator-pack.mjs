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

function commandOutput(command, args) {
  return execFileSync(command, args, {
    cwd: root,
    stdio: ['ignore', 'pipe', 'ignore'],
    encoding: 'utf8',
    timeout: 8000,
  }).trim()
}

function currentImageTag() {
  if (process.env.RUNTIME_IMAGE_TAG) return process.env.RUNTIME_IMAGE_TAG
  try {
    return commandOutput('git', ['rev-parse', 'HEAD'])
  } catch {
    return 'source-workspace-no-git'
  }
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

function serviceById(services, id) {
  const service = services.find(item => item.id === id)
  assert(service, `missing service ${id}`)
  return service
}

function envValue(name) {
  return normalizeOrigin(process.env[name] || '')
}

function assignmentStatus() {
  const apiOrigin = envValue('REMOTE_API_ORIGIN')
  const agentOrigin = envValue('REMOTE_AGENT_ORIGIN')
  return {
    apiServiceAssigned: Boolean(process.env.REMOTE_API_SERVICE_ID),
    agentServiceAssigned: Boolean(process.env.REMOTE_AGENT_SERVICE_ID),
    apiOriginConfigured: isRemoteHttps(apiOrigin),
    agentOriginConfigured: isRemoteHttps(agentOrigin),
    apiSecretsConfigured: boolEnv('REMOTE_API_SECRETS_CONFIGURED'),
    agentSecretsConfigured: boolEnv('REMOTE_AGENT_SECRETS_CONFIGURED'),
  }
}

function buildPack({ headSha, hostProfiles, manifest, plan }) {
  const api = serviceById(manifest.services, 'api')
  const agent = serviceById(manifest.services, 'agent')
  const status = assignmentStatus()
  const blockedStages = [
    ['api-service-assigned', status.apiServiceAssigned],
    ['agent-service-assigned', status.agentServiceAssigned],
    ['api-origin-configured', status.apiOriginConfigured],
    ['agent-origin-configured', status.agentOriginConfigured],
    ['api-provider-secrets-ready', status.apiSecretsConfigured],
    ['agent-provider-secrets-ready', status.agentSecretsConfigured],
  ].filter(([, ready]) => !ready).map(([id]) => id)

  const runtimeImages = [api, agent].map(service => ({
    serviceId: service.id,
    serviceName: service.serviceName,
    image: `${service.imageName}:${headSha}`,
    latestImage: `${service.imageName}:runtime-latest`,
    dockerfile: service.dockerfile,
    containerPort: service.containerPort,
    healthPath: service.healthPath,
  }))

  return {
    version: 1,
    gate: 'P74_REMOTE_RUNTIME_OPERATOR_HANDOFF',
    generatedAt: new Date().toISOString(),
    repository: repo,
    headSha,
    hostTargetProfile: manifest.hostTargetProfile,
    hostTargetDecision: hostProfiles.decision,
    dependsOn: [
      'P70_REMOTE_RUNTIME_DEPLOY_MANIFEST_GATE',
      'P72_RUNTIME_IMAGE_PUBLISH_EVIDENCE_GATE',
      'P73_REMOTE_RUNTIME_ORIGIN_EXECUTION_GATE',
    ],
    handoffDecision: blockedStages.length === 0
      ? 'operator_pack_ready_for_strict_origin_execution'
      : 'operator_pack_waiting_for_service_assignment',
    blockedStages,
    runtimeImages,
    serviceAssignments: [
      {
        serviceId: 'api',
        requiredOperatorInputs: [
          'REMOTE_API_SERVICE_ID',
          'REMOTE_API_ORIGIN',
          'REMOTE_API_SECRETS_CONFIGURED=true',
        ],
        providerSecretNames: api.requiredSecretEnv,
        runtimeEnvNames: api.requiredRuntimeEnv.map(item => item.split('=')[0]),
        publicOriginVariable: api.publicOriginVariable,
        healthCheck: '${REMOTE_API_ORIGIN}/health',
      },
      {
        serviceId: 'agent',
        requiredOperatorInputs: [
          'REMOTE_AGENT_SERVICE_ID',
          'REMOTE_AGENT_ORIGIN',
          'REMOTE_AGENT_SECRETS_CONFIGURED=true',
        ],
        providerSecretNames: agent.requiredSecretEnv,
        runtimeEnvNames: agent.requiredRuntimeEnv.map(item => item.split('=')[0]),
        publicOriginVariable: agent.publicOriginVariable,
        healthCheck: '${REMOTE_AGENT_ORIGIN}/health',
        dependsOn: ['api'],
      },
    ],
    publicPagesVariableCommands: [
      `gh variable set VITE_PUBLIC_RUNTIME_MODE --repo ${repo} --body live`,
      `gh variable set VITE_API_ORIGIN --repo ${repo} --body "$REMOTE_API_ORIGIN"`,
      `gh variable set VITE_API_BASE_URL --repo ${repo} --body "$REMOTE_API_ORIGIN/v1"`,
      `gh variable set VITE_AGENT_RUNTIME_BASE_URL --repo ${repo} --body "$REMOTE_AGENT_ORIGIN"`,
    ],
    verificationCommands: [
      'REQUIRE_RUNTIME_IMAGE_PUBLISHED=true npm run check:runtime-image-publish-evidence',
      'REMOTE_API_SERVICE_ID=<provider-service-id> REMOTE_AGENT_SERVICE_ID=<provider-service-id> REMOTE_API_ORIGIN=https://<api-host> REMOTE_AGENT_ORIGIN=https://<agent-host> REMOTE_API_SECRETS_CONFIGURED=true REMOTE_AGENT_SECRETS_CONFIGURED=true REQUIRE_REMOTE_ORIGIN_EXECUTED=true npm run check:remote-origin-execution',
      'REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness',
      'npm run qa:live-runtime-browser',
    ],
    rollbackCommands: plan.rollbackCommands,
    forbiddenPublicVariables: plan.forbiddenPublicVariables,
    operatorNotes: [
      'Do not place provider secrets in GitHub Pages variables.',
      'Set Pages live mode only after both /health endpoints pass over HTTPS.',
      'Use the commit-sha image first; keep runtime-latest only as an operator convenience tag.',
      'Mastra Agent Runtime must call FastAPI through the Tool Bridge; it must not connect to the database.',
    ],
  }
}

function renderMarkdown(pack) {
  const imageRows = pack.runtimeImages
    .map(item => `| ${item.serviceId} | \`${item.image}\` | \`${item.containerPort}\` | \`${item.healthPath}\` |`)
    .join('\n')
  const assignmentRows = pack.serviceAssignments
    .map(item => `| ${item.serviceId} | ${item.requiredOperatorInputs.map(value => `\`${value}\``).join('<br>')} | ${item.providerSecretNames.map(value => `\`${value}\``).join('<br>')} |`)
    .join('\n')
  const commands = pack.verificationCommands.map(command => `\n\`\`\`bash\n${command}\n\`\`\``).join('\n')
  const rollback = pack.rollbackCommands.map(command => `\n\`\`\`bash\n${command}\n\`\`\``).join('\n')

  return `# Remote Runtime Operator Handoff

- Gate: \`${pack.gate}\`
- Repository: \`${pack.repository}\`
- Head SHA: \`${pack.headSha}\`
- Decision: \`${pack.handoffDecision}\`
- Blocked stages: ${pack.blockedStages.length ? pack.blockedStages.map(item => `\`${item}\``).join(', ') : 'none'}

## Runtime Images

| Service | Image | Port | Health |
| --- | --- | --- | --- |
${imageRows}

## Service Assignments

| Service | Operator Inputs | Provider Secret Names |
| --- | --- | --- |
${assignmentRows}

## Public Pages Variables

${pack.publicPagesVariableCommands.map(command => `- \`${command}\``).join('\n')}

## Verification
${commands}

## Rollback
${rollback}
`
}

const requiredFiles = [
  'deploy/runtime-production/host-profiles.json',
  'deploy/runtime-production/service-manifest.json',
  'deploy/runtime-production/origin-execution-plan.json',
  'docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md',
  'docs/backend/P73_REMOTE_RUNTIME_ORIGIN_EXECUTION_GATE.md',
  'docs/backend/P74_REMOTE_RUNTIME_OPERATOR_HANDOFF.md',
]

for (const file of requiredFiles) assert(existsSync(join(root, file)), `missing operator handoff file: ${file}`)

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:remote-origin-operator-pack'] === 'node scripts/check-remote-origin-operator-pack.mjs',
  'package.json must expose check:remote-origin-operator-pack',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-origin-operator-pack'),
  'root npm run test must include check:remote-origin-operator-pack',
)

const headSha = currentImageTag()
const hostProfiles = readJson('deploy/runtime-production/host-profiles.json')
const manifest = readJson('deploy/runtime-production/service-manifest.json')
const plan = readJson('deploy/runtime-production/origin-execution-plan.json')
const pack = buildPack({ headSha, hostProfiles, manifest, plan })

assert(pack.repository === repo, 'operator pack repository mismatch')
assert(pack.hostTargetProfile === manifest.hostTargetProfile, 'operator pack host target mismatch')
assert(pack.runtimeImages.every(item => item.image.includes(headSha)), 'operator pack must use current HEAD images')
assert(pack.runtimeImages.some(item => item.serviceId === 'api'), 'operator pack must include API image')
assert(pack.runtimeImages.some(item => item.serviceId === 'agent'), 'operator pack must include Agent image')
assert(JSON.stringify(pack.serviceAssignments).includes('REMOTE_API_SERVICE_ID'), 'operator pack must request API service id')
assert(JSON.stringify(pack.serviceAssignments).includes('REMOTE_AGENT_SERVICE_ID'), 'operator pack must request Agent service id')
assert(JSON.stringify(pack.serviceAssignments).includes('REMOTE_API_SECRETS_CONFIGURED=true'), 'operator pack must require API secret confirmation')
assert(JSON.stringify(pack.serviceAssignments).includes('REMOTE_AGENT_SECRETS_CONFIGURED=true'), 'operator pack must require Agent secret confirmation')
assert(pack.publicPagesVariableCommands.join('\n').includes('VITE_PUBLIC_RUNTIME_MODE'), 'operator pack must include public runtime mode command')
assert(pack.verificationCommands.join('\n').includes('REQUIRE_REMOTE_ORIGIN_EXECUTED=true'), 'operator pack must include strict P73 command')
assert(pack.verificationCommands.join('\n').includes('REQUIRE_LIVE_RUNTIME_READY=true'), 'operator pack must include strict live readiness command')
assert(pack.rollbackCommands.join('\n').includes('VITE_PUBLIC_RUNTIME_MODE'), 'operator pack must include rollback commands')
assert(pack.operatorNotes.join('\n').includes('Do not place provider secrets in GitHub Pages variables'), 'operator pack must preserve secret boundary')

const privateMatches = scanNoPrivateTerms(pack)
assert(privateMatches.length === 0, `operator pack leaks private terms: ${privateMatches.join(', ')}`)

assertContains('docs/backend/P74_REMOTE_RUNTIME_OPERATOR_HANDOFF.md', [
  'P74 Remote Runtime Operator Handoff',
  'check:remote-origin-operator-pack',
  'operator_pack_waiting_for_service_assignment',
  'operator_pack_ready_for_strict_origin_execution',
  'REQUIRE_REMOTE_ORIGIN_EXECUTED=true',
])
assertContains('docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md', [
  'Operator Handoff',
  'npm run check:remote-origin-operator-pack',
])
assertContains('docs/backend/P73_REMOTE_RUNTIME_ORIGIN_EXECUTION_GATE.md', [
  'P74 Remote Runtime Operator Handoff',
  'check:remote-origin-operator-pack',
])

mkdirSync(artifactDir, { recursive: true })
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const jsonArtifactPath = join(artifactDir, `remote-origin-operator-pack-${timestamp}.json`)
const markdownArtifactPath = join(artifactDir, `remote-origin-operator-pack-${timestamp}.md`)
writeFileSync(jsonArtifactPath, `${JSON.stringify(pack, null, 2)}\n`)
writeFileSync(markdownArtifactPath, renderMarkdown(pack))

if (process.env.REQUIRE_REMOTE_OPERATOR_PACK_READY === 'true' && pack.blockedStages.length > 0) {
  throw new Error(`remote operator pack is not ready: ${pack.blockedStages.join(', ')}`)
}

console.log(JSON.stringify({
  status: pack.blockedStages.length ? 'passed_with_operator_blockers' : 'passed',
  gate: pack.gate,
  decision: pack.handoffDecision,
  blockedStages: pack.blockedStages,
  images: pack.runtimeImages.map(item => item.image),
  artifactPath: jsonArtifactPath,
  markdownArtifactPath,
}, null, 2))
