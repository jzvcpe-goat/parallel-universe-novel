#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const targetAssignmentPath = 'deploy/runtime-production/remote-assignment.local.json'

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
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 8000,
    }).trim()
  } catch {
    return 'source-workspace-no-git'
  }
}

function latest(prefix, predicate = null, label = prefix, options = {}) {
  assert(existsSync(artifactDir), 'runtime artifact directory is missing; run root runtime gates first')
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .sort()
  assert(files.length > 0, `missing ${label} artifact`)
  let fallback = null
  for (const filename of files.toReversed()) {
    const file = join(artifactDir, filename)
    const payload = JSON.parse(readFileSync(file, 'utf8'))
    if (!fallback) fallback = { file, payload, predicateMatched: false }
    if (!predicate || predicate(payload)) return { file, payload, predicateMatched: true }
  }
  if (options.allowFallback) return fallback
  throw new Error(`missing ${label} artifact matching expected predicate`)
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

function assertIncludes(file, terms) {
  const text = read(file)
  for (const term of terms) assert(text.includes(term), `${file} must include ${term}`)
}

function servicePlan({ id, label, fields, healthPath, strictCommand, nextAction }) {
  return {
    id,
    label,
    requiredFields: fields,
    healthPath,
    strictCommand,
    nextAction,
  }
}

function renderMarkdown(artifact) {
  const rows = artifact.fillPlan.map(item => (
    `| ${item.label} | ${item.requiredFields.join(', ')} | \`${item.strictCommand}\` | ${item.nextAction} |`
  ))
  return `# P105 Remote Assignment Fill Plan

Generated: ${artifact.generatedAt}

Decision: \`${artifact.decision}\`

Status: \`${artifact.status}\`

Target local file: \`${artifact.targetAssignmentPath}\`

## Current Images

| Service | Image |
| --- | --- |
| API | \`${artifact.currentImages.api}\` |
| Agent Runtime | \`${artifact.currentImages.agent}\` |

## Fill Plan

| Area | Required fields | Gate | Next action |
| --- | --- | --- | --- |
${rows.join('\n')}

## Validation Sequence

${artifact.validationSequence.map(command => `\`\`\`bash\n${command}\n\`\`\``).join('\n\n')}

## Boundary

This plan is operator-safe. It does not create services, write the ignored local
assignment file, set GitHub variables, store secrets, mark live runtime ready, or
promote a fixture as production evidence.
`
}

const packageJson = readJson('package.json')
const rootTest = String(packageJson.scripts.test || '')
assert(
  packageJson.scripts['check:remote-assignment-fill-plan'] === 'node scripts/check-remote-assignment-fill-plan.mjs',
  'package.json must expose check:remote-assignment-fill-plan',
)
assert(rootTest.includes('npm run check:remote-assignment-fill-plan'), 'root npm run test must include check:remote-assignment-fill-plan')
assert(
  rootTest.includes('npm run check:runtime-completion-blocker-convergence && npm run check:remote-assignment-fill-plan'),
  'root test must run P105 after P96 blocker convergence',
)

for (const file of [
  'deploy/runtime-production/service-manifest.json',
  'deploy/runtime-production/remote-assignment.schema.json',
  'deploy/runtime-production/remote-assignment.example.json',
  'docs/backend/P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE.md',
  'docs/backend/P85_REMOTE_RUNTIME_BLOCKER_NORMALIZATION.md',
  'docs/backend/P87_REMOTE_ASSIGNMENT_HANDOFF_GATE.md',
  'docs/backend/P90_REMOTE_RUNTIME_BLOCKER_ARTIFACT_ATTESTATION.md',
  'docs/backend/P96_RUNTIME_COMPLETION_BLOCKER_CONVERGENCE.md',
  'docs/backend/P105_REMOTE_ASSIGNMENT_FILL_PLAN_GATE.md',
  '.github/workflows/pages.yml',
]) {
  assert(existsSync(join(root, file)), `missing P105 prerequisite: ${file}`)
}

assertIncludes('docs/backend/P105_REMOTE_ASSIGNMENT_FILL_PLAN_GATE.md', [
  'P105 Remote Assignment Fill Plan Gate',
  'check:remote-assignment-fill-plan',
  targetAssignmentPath,
  'does not write',
  'remote-assignment-fill-plan',
])
assertIncludes('.github/workflows/pages.yml', [
  'Upload remote assignment fill plan',
  'remote-assignment-fill-plan',
  'artifacts/runtime/remote-assignment-fill-plan-*.json',
  'artifacts/runtime/remote-assignment-fill-plan-*.md',
])
assertIncludes('scripts/check-github-actions-artifacts.mjs', [
  'remote-assignment-fill-plan',
])

const headSha = currentHead()
const serviceManifest = readJson('deploy/runtime-production/service-manifest.json')
const schema = readJson('deploy/runtime-production/remote-assignment.schema.json')
const example = readJson('deploy/runtime-production/remote-assignment.example.json')
const runtimeImages = latest('runtime-image-publish-evidence-', payload => payload.headSha === headSha, 'current runtime image evidence', { allowFallback: true })
const handoff = latest('remote-assignment-handoff-', payload => payload.gate === 'P87_REMOTE_ASSIGNMENT_HANDOFF' && payload.headSha === headSha, 'current P87 handoff', { allowFallback: true })
const blockerLedger = latest('remote-runtime-blockers-', payload => payload.headSha === headSha, 'current P85 blocker ledger', { allowFallback: true })
const p90 = latest('remote-blocker-artifact-attestation-', payload => payload.expectedHeadSha === (blockerLedger.payload.headSha || headSha), 'current P90 blocker attestation', { allowFallback: true })

assert(serviceManifest.services?.some(item => item.id === 'api'), 'service manifest must include api service')
assert(serviceManifest.services?.some(item => item.id === 'agent'), 'service manifest must include agent service')
assert(schema.title === 'Parallel Universe Novel Remote Runtime Assignment', 'remote assignment schema title mismatch')
assert(example.gate === 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE', 'remote assignment example gate mismatch')
assert(example.services?.agent?.dependsOn?.includes('api'), 'remote assignment example must keep agent depending on api')

const apiImage = handoff.payload.images?.api || runtimeImages.payload.images?.find(item => item.includes('/parallel-universe-novel-api:'))
const agentImage = handoff.payload.images?.agent || runtimeImages.payload.images?.find(item => item.includes('/parallel-universe-novel-agent-runtime:'))
assert(apiImage, 'P105 could not resolve API image')
assert(agentImage, 'P105 could not resolve Agent Runtime image')

const normalizedBlockedStages = Array.isArray(blockerLedger.payload.blockedStages)
  ? blockerLedger.payload.blockedStages
  : Array.isArray(blockerLedger.payload.stages)
    ? blockerLedger.payload.stages
        .filter(stage => stage?.status === 'blocked')
        .map(stage => stage.id)
    : []
const normalizedReadyStages = Array.isArray(blockerLedger.payload.stages)
  ? blockerLedger.payload.stages
      .filter(stage => stage?.status === 'ready')
      .map(stage => stage.id)
  : []
const runtimeAssignmentEvidence = blockerLedger.payload.sourceEvidence?.runtimeAssignment || {}

const fillPlan = [
  servicePlan({
    id: 'deployment-owner',
    label: 'Deployment ownership',
    fields: ['operator.owner', 'operator.provider', 'operator.environment'],
    healthPath: null,
    strictCommand: 'npm run check:remote-assignment-schema',
    nextAction: 'Assign a human owner and provider before filling service evidence.',
  }),
  servicePlan({
    id: 'api-service',
    label: 'FastAPI service',
    fields: ['services.api.serviceId', 'services.api.origin', 'services.api.image', 'services.api.providerSecretsConfigured'],
    healthPath: '/health',
    strictCommand: 'REQUIRE_REMOTE_ASSIGNMENT_READY=true npm run check:remote-runtime-assignment-intake',
    nextAction: 'Create or identify the API service, deploy the current API image, configure provider-side secrets, and verify HTTPS health.',
  }),
  servicePlan({
    id: 'agent-service',
    label: 'Agent Runtime service',
    fields: ['services.agent.serviceId', 'services.agent.origin', 'services.agent.image', 'services.agent.providerSecretsConfigured', 'services.agent.dependsOn'],
    healthPath: '/health',
    strictCommand: 'REQUIRE_REMOTE_ASSIGNMENT_READY=true npm run check:remote-runtime-assignment-intake',
    nextAction: 'Create or identify the Agent Runtime service, deploy the current Agent image, point it at API via provider config, and verify HTTPS health.',
  }),
  servicePlan({
    id: 'origin-execution',
    label: 'Remote origin execution',
    fields: ['REMOTE_API_SERVICE_ID', 'REMOTE_AGENT_SERVICE_ID', 'REMOTE_API_ORIGIN', 'REMOTE_AGENT_ORIGIN'],
    healthPath: '/health',
    strictCommand: 'REQUIRE_REMOTE_ORIGIN_EXECUTED=true npm run check:remote-origin-execution',
    nextAction: 'Run the origin execution gate only after both service origins and secret-store attestations exist.',
  }),
  servicePlan({
    id: 'pages-runtime-vars',
    label: 'GitHub Pages runtime variables',
    fields: ['VITE_PUBLIC_RUNTIME_MODE', 'VITE_API_ORIGIN', 'VITE_API_BASE_URL', 'VITE_AGENT_RUNTIME_BASE_URL'],
    healthPath: null,
    strictCommand: 'REQUIRE_LIVE_CUTOVER_ATTESTED=true npm run check:live-cutover-attestation',
    nextAction: 'Set public runtime variables only after remote health and assignment gates are ready.',
  }),
  servicePlan({
    id: 'activation-control',
    label: 'Live activation control',
    fields: ['assignment attestation', 'rollback evidence', 'live browser QA'],
    healthPath: null,
    strictCommand: 'REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true npm run check:remote-runtime-activation-control',
    nextAction: 'Promote to live only after assignment, origin execution, readiness, cutover, rollback and browser QA pass together.',
  }),
]

const validationSequence = [
  'npm run check:remote-assignment-schema',
  'npm run check:remote-assignment-env-dry-run',
  'REQUIRE_REMOTE_ASSIGNMENT_READY=true npm run check:remote-runtime-assignment-intake',
  'REMOTE_RUNTIME_ASSIGNMENT_FILE=deploy/runtime-production/remote-assignment.local.json REQUIRE_REMOTE_ASSIGNMENT_EXECUTION_READY=true npm run check:remote-assignment-execution-pack',
  'REQUIRE_REMOTE_ORIGIN_EXECUTED=true npm run check:remote-origin-execution',
  'REQUIRE_REMOTE_ORIGIN_PROVISIONED=true npm run check:remote-origin-provisioning',
  'REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness',
  'REQUIRE_LIVE_CUTOVER_ATTESTED=true npm run check:live-cutover-attestation',
  'REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true npm run check:remote-runtime-activation-control',
  'REQUIRE_REMOTE_RUNTIME_BLOCKERS_READY=true npm run check:remote-runtime-blockers',
]

const artifact = {
  version: 1,
  gate: 'P105_REMOTE_ASSIGNMENT_FILL_PLAN_GATE',
  generatedAt: new Date().toISOString(),
  status: 'passed_with_operator_inputs_required',
  decision: 'remote_assignment_fill_plan_ready',
  publicReleaseBlocking: false,
  repository: packageJson.repository?.url || 'jzvcpe-goat/parallel-universe-novel',
  headSha,
  targetAssignmentPath,
  writesLocalAssignment: false,
  createsRemoteServices: false,
  setsGitHubVariables: false,
  promotesLiveRuntime: false,
  treatsFixtureAsReady: false,
  currentImages: {
    api: apiImage,
    agent: agentImage,
  },
  upstreamEvidence: {
    runtimeImages: {
      file: relative(root, runtimeImages.file),
      status: runtimeImages.payload.status || null,
      headSha: runtimeImages.payload.headSha || null,
      predicateMatched: runtimeImages.predicateMatched,
    },
    handoff: {
      file: relative(root, handoff.file),
      status: handoff.payload.status || null,
      decision: handoff.payload.decision || null,
      headSha: handoff.payload.headSha || null,
      predicateMatched: handoff.predicateMatched,
    },
    blockerLedger: {
      file: relative(root, blockerLedger.file),
      status: blockerLedger.payload.status || null,
      decision: blockerLedger.payload.decision || null,
      blockedStages: normalizedBlockedStages,
      runtimeAssignment: {
        runtimeMode: runtimeAssignmentEvidence.runtimeMode || null,
        assignmentPath: runtimeAssignmentEvidence.assignmentPath || null,
        selectedEdgeOnlyCurrentPath: runtimeAssignmentEvidence.selectedEdgeOnlyCurrentPath === true,
      },
      predicateMatched: blockerLedger.predicateMatched,
    },
    blockerAttestation: {
      file: relative(root, p90.file),
      status: p90.payload.status || null,
      expectedHeadSha: p90.payload.expectedHeadSha || null,
      predicateMatched: p90.predicateMatched,
    },
  },
  fillPlan,
  validationSequence,
  forbiddenLocalFields: [
    'DATABASE_URL',
    'Tool Bridge token values',
    'model keys',
    'private keys',
    'provider API tokens',
    'private prompt plumbing',
    'raw runtime state',
    'private research vault payloads',
  ],
  boundary: {
    shareableWithDeploymentOperator: true,
    containsSecrets: false,
    containsPrivateResearchTitles: false,
    exposesProviderPromptPlumbing: false,
  },
}

assert(fillPlan.length >= 6, 'P105 fill plan must cover ownership, services, origin, Pages variables and activation')
assert(validationSequence.length >= 8, 'P105 validation sequence must cover all strict runtime assignment gates')
const localAssignmentExists = existsSync(join(root, targetAssignmentPath))
const currentEdgeOnlyProjection = runtimeAssignmentEvidence.runtimeMode === 'edge-only'
  && runtimeAssignmentEvidence.selectedEdgeOnlyCurrentPath === true
const assignmentHealthReady = normalizedReadyStages.includes('remote-assignment-health-ready')
if (localAssignmentExists) {
  assert(!normalizedBlockedStages.includes('remote-assignment-file-present'), 'P105 must clear only the file-present blocker when a local assignment draft exists')
  assert(
    assignmentHealthReady || normalizedBlockedStages.includes('remote-assignment-health-ready'),
    'P105 must preserve assignment health status until operator input is complete',
  )
} else if (currentEdgeOnlyProjection) {
  assert(!normalizedBlockedStages.includes('remote-assignment-file-present'), 'P105 must not reintroduce file-present blocker for tracked edge-only projection evidence')
  assert(
    assignmentHealthReady || normalizedBlockedStages.includes('remote-assignment-health-ready'),
    'P105 must preserve edge-only Data API health status until operator input is complete',
  )
} else {
  assert(normalizedBlockedStages.includes('remote-assignment-file-present'), 'P105 must preserve the remote assignment file blocker until operator input exists')
}
assert(normalizedBlockedStages.includes('activation-control'), 'P105 must preserve activation-control as blocked until live cutover gates pass')
assert(artifact.writesLocalAssignment === false, 'P105 must not write remote-assignment.local.json')
assert(!existsSync(join(root, targetAssignmentPath)) || statSync(join(root, targetAssignmentPath)).isFile(), 'P105 must not create assignment directory state')
assert(artifact.currentImages.api.includes('parallel-universe-novel-api:'), 'P105 API image ref mismatch')
assert(artifact.currentImages.agent.includes('parallel-universe-novel-agent-runtime:'), 'P105 Agent image ref mismatch')
for (const command of [
  'check:remote-assignment-env-dry-run',
  'check:remote-runtime-assignment-intake',
  'check:remote-assignment-execution-pack',
  'check:remote-origin-execution',
  'check:remote-origin-provisioning',
  'audit:live-runtime-readiness',
  'check:live-cutover-attestation',
  'check:remote-runtime-activation-control',
  'check:remote-runtime-blockers',
]) {
  assert(validationSequence.some(item => item.includes(command)), `P105 validation sequence must include ${command}`)
}

const privateTerms = scanNoPrivateTerms(artifact)
assert(privateTerms.length === 0, `P105 artifact leaks private terms: ${privateTerms.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const jsonPath = join(artifactDir, `remote-assignment-fill-plan-${stamp}.json`)
const mdPath = join(artifactDir, `remote-assignment-fill-plan-${stamp}.md`)
writeFileSync(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`)
writeFileSync(mdPath, renderMarkdown(artifact))

console.log(JSON.stringify({
  status: artifact.status,
  gate: artifact.gate,
  decision: artifact.decision,
  targetAssignmentPath,
  blockedStages: normalizedBlockedStages,
  fillPlanCount: fillPlan.length,
  artifactPath: relative(root, jsonPath),
  markdownArtifactPath: relative(root, mdPath),
}, null, 2))
