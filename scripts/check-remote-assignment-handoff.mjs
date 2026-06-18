#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'
const required = process.env.REQUIRE_REMOTE_ASSIGNMENT_HANDOFF_READY === 'true'

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function currentHead() {
  if (process.env.RUNTIME_IMAGE_HEAD_SHA) return process.env.RUNTIME_IMAGE_HEAD_SHA.trim()
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
      timeout: 8000,
    }).trim()
  } catch {
    return 'source-workspace-no-git'
  }
}

function latest(prefix) {
  if (!existsSync(artifactDir)) return null
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .sort()
  if (!files.length) return null
  const file = join(artifactDir, files[files.length - 1])
  try {
    return { file, payload: JSON.parse(readFileSync(file, 'utf8')) }
  } catch {
    return { file, payload: null }
  }
}

function serviceById(manifest, id) {
  const service = manifest.services.find(item => item.id === id)
  assert(service, `missing service manifest entry: ${id}`)
  return service
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
    /sourceRefs/,
    /profile\.id/,
    /kernel\.id/,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function assignmentTemplate({ manifest, apiImage, agentImage }) {
  return {
    version: 1,
    gate: 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE',
    repository: repo,
    hostTargetProfile: manifest.hostTargetProfile,
    operator: {
      owner: 'FILL_DEPLOYMENT_OWNER',
      provider: 'FILL_PROVIDER',
      environment: 'preview-or-production',
    },
    services: {
      api: {
        serviceId: 'FILL_API_SERVICE_ID',
        origin: 'https://FILL_API_HOST',
        image: apiImage,
        providerSecretsConfigured: false,
        healthPath: '/health',
      },
      agent: {
        serviceId: 'FILL_AGENT_SERVICE_ID',
        origin: 'https://FILL_AGENT_HOST',
        image: agentImage,
        providerSecretsConfigured: false,
        healthPath: '/health',
        dependsOn: ['api'],
      },
    },
    pagesVariablesAfterHealth: {
      VITE_PUBLIC_RUNTIME_MODE: 'live',
      VITE_API_ORIGIN: 'https://FILL_API_HOST',
      VITE_API_BASE_URL: 'https://FILL_API_HOST/v1',
      VITE_AGENT_RUNTIME_BASE_URL: 'https://FILL_AGENT_HOST',
    },
    notes: [
      'Copy this object into deploy/runtime-production/remote-assignment.local.json only after remote services exist.',
      'Set providerSecretsConfigured to true only after the provider-side secret store is configured.',
      'Do not write database URLs, Tool Bridge token values, model keys, private keys, provider API tokens, private prompt plumbing or reference vault contents into this file.',
    ],
  }
}

function renderMarkdown(artifact) {
  const template = JSON.stringify(artifact.assignmentTemplate, null, 2)
  const commands = artifact.validationCommands.map(command => `\n\`\`\`bash\n${command}\n\`\`\``).join('\n')
  return `# P87 Remote Assignment Handoff

Generated: ${artifact.generatedAt}

Decision: \`${artifact.decision}\`

Status: \`${artifact.status}\`

## Current Images

| Service | Image |
| --- | --- |
| API | \`${artifact.images.api}\` |
| Agent Runtime | \`${artifact.images.agent}\` |

## Required Operator Inputs

${artifact.requiredOperatorInputs.map(item => `- ${item}`).join('\n')}

## Assignment Template

Write this shape to \`${artifact.targetAssignmentPath}\` after replacing every \`FILL_*\` value with real non-secret deployment evidence.

\`\`\`json
${template}
\`\`\`

## Validation Commands
${commands}

## Boundary

This handoff is not a deployment attestation. It does not mark assignment,
origin execution, live readiness, cutover, or activation as ready. It contains
only non-secret service evidence fields and current image references.
`
}

const requiredFiles = [
  'deploy/runtime-production/service-manifest.json',
  'deploy/runtime-production/remote-assignment.example.json',
  'docs/backend/P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE.md',
  'docs/backend/P79_REMOTE_ASSIGNMENT_EXECUTION_PACK.md',
  'docs/backend/P85_REMOTE_RUNTIME_BLOCKER_NORMALIZATION.md',
]
for (const file of requiredFiles) assert(existsSync(join(root, file)), `missing P87 prerequisite file: ${file}`)

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:remote-assignment-handoff'] === 'node scripts/check-remote-assignment-handoff.mjs',
  'package.json must expose check:remote-assignment-handoff',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-assignment-handoff'),
  'root npm run test must include check:remote-assignment-handoff',
)

const manifest = readJson('deploy/runtime-production/service-manifest.json')
const apiService = serviceById(manifest, 'api')
const agentService = serviceById(manifest, 'agent')
const headSha = currentHead()
const imageEvidence = latest('runtime-image-publish-evidence-')
const imageEvidenceReady = imageEvidence?.payload?.status === 'passed'
const imageEvidenceHeadSha = imageEvidence?.payload?.headSha || null
const imageEvidenceMatchesHead = imageEvidenceReady && imageEvidenceHeadSha === headSha
const apiImage = imageEvidenceMatchesHead
  ? imageEvidence.payload.images.find(item => item.includes('/parallel-universe-novel-api:'))
  : `${apiService.imageName}:${headSha}`
const agentImage = imageEvidenceMatchesHead
  ? imageEvidence.payload.images.find(item => item.includes('/parallel-universe-novel-agent-runtime:'))
  : `${agentService.imageName}:${headSha}`

assert(apiImage, 'P87 could not resolve API image reference')
assert(agentImage, 'P87 could not resolve Agent Runtime image reference')
assert(apiImage.includes('parallel-universe-novel-api:'), 'P87 API image ref mismatch')
assert(agentImage.includes('parallel-universe-novel-agent-runtime:'), 'P87 Agent image ref mismatch')

const blockers = []
if (!imageEvidenceReady) blockers.push('runtime-image-evidence-ready')
if (imageEvidenceReady && !imageEvidenceMatchesHead) blockers.push('runtime-image-evidence-current-head')
const decision = blockers.length
  ? 'assignment_handoff_waiting_for_images'
  : 'assignment_handoff_ready_for_operator'

const artifact = {
  version: 1,
  gate: 'P87_REMOTE_ASSIGNMENT_HANDOFF',
  generatedAt: new Date().toISOString(),
  repository: repo,
  headSha,
  status: blockers.length ? 'blocked' : 'ready',
  decision,
  blockedStages: blockers,
  targetAssignmentPath: 'deploy/runtime-production/remote-assignment.local.json',
  sourceEvidence: {
    imagePublishEvidence: imageEvidence
      ? {
          file: imageEvidence.file,
          status: imageEvidence.payload?.status || null,
          runId: imageEvidence.payload?.runId || null,
          headSha: imageEvidence.payload?.headSha || null,
        }
      : null,
  },
  images: {
    api: apiImage,
    agent: agentImage,
  },
  requiredOperatorInputs: [
    'API service id',
    'Agent Runtime service id',
    'API remote HTTPS origin',
    'Agent Runtime remote HTTPS origin',
    'API provider secret-store confirmation',
    'Agent Runtime provider secret-store confirmation',
    'API /health response over HTTPS',
    'Agent Runtime /health response over HTTPS',
  ],
  assignmentTemplate: assignmentTemplate({ manifest, apiImage, agentImage }),
  validationCommands: [
    'REQUIRE_RUNTIME_IMAGE_PUBLISHED=true npm run check:runtime-image-publish-evidence',
    'REQUIRE_REMOTE_ASSIGNMENT_READY=true npm run check:remote-runtime-assignment-intake',
    'REMOTE_RUNTIME_ASSIGNMENT_FILE=deploy/runtime-production/remote-assignment.local.json REQUIRE_REMOTE_ASSIGNMENT_EXECUTION_READY=true npm run check:remote-assignment-execution-pack',
    'REQUIRE_REMOTE_ORIGIN_EXECUTED=true npm run check:remote-origin-execution',
    'REQUIRE_REMOTE_ORIGIN_PROVISIONED=true npm run check:remote-origin-provisioning',
    'REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness',
    'REQUIRE_LIVE_CUTOVER_ATTESTED=true npm run check:live-cutover-attestation',
    'REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true npm run check:remote-runtime-activation-control',
  ],
  publicBoundary: {
    writesLocalAssignmentFile: false,
    treatsFixtureAsReady: false,
    containsSecrets: false,
    containsReferenceWorkNames: false,
    exposesProviderPromptPlumbing: false,
  },
}

const privateMatches = scanNoPrivateTerms(artifact)
assert(privateMatches.length === 0, `P87 artifact leaks private terms: ${privateMatches.join(', ')}`)
assert(artifact.assignmentTemplate.services.api.image === apiImage, 'P87 API image not copied into assignment template')
assert(artifact.assignmentTemplate.services.agent.image === agentImage, 'P87 Agent image not copied into assignment template')
assert(artifact.assignmentTemplate.services.agent.dependsOn.includes('api'), 'P87 Agent assignment must depend on API')
assert(artifact.publicBoundary.writesLocalAssignmentFile === false, 'P87 must not write local assignment file')
assert(artifact.publicBoundary.treatsFixtureAsReady === false, 'P87 must not treat fixture as ready')

mkdirSync(artifactDir, { recursive: true })
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const jsonArtifactPath = join(artifactDir, `remote-assignment-handoff-${timestamp}.json`)
const markdownArtifactPath = join(artifactDir, `remote-assignment-handoff-${timestamp}.md`)
writeFileSync(jsonArtifactPath, `${JSON.stringify(artifact, null, 2)}\n`)
writeFileSync(markdownArtifactPath, renderMarkdown(artifact))

if (required && artifact.status !== 'ready') {
  throw new Error(`remote assignment handoff is not ready: ${artifact.blockedStages.join(', ')}`)
}

console.log(JSON.stringify({
  status: artifact.status === 'ready' ? 'passed' : 'passed_with_assignment_handoff_blockers',
  gate: artifact.gate,
  decision: artifact.decision,
  blockedStages: artifact.blockedStages,
  targetAssignmentPath: artifact.targetAssignmentPath,
  images: artifact.images,
  artifactPath: jsonArtifactPath,
  markdownArtifactPath,
}, null, 2))
