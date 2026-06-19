#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const targetAssignmentPath = 'deploy/runtime-production/remote-assignment.local.json'
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

function assertIncludes(file, terms) {
  const text = read(file)
  for (const term of terms) assert(text.includes(term), `${file} must include ${term}`)
}

function evidenceSummary(item, extraFields = []) {
  const summary = {
    file: relative(root, item.file),
    gate: item.payload.gate || null,
    status: item.payload.status || null,
    decision: item.payload.decision
      || item.payload.executionDecision
      || item.payload.provisioningDecision
      || item.payload.releaseDecision
      || null,
    predicateMatched: item.predicateMatched,
  }
  for (const field of extraFields) {
    if (item.payload[field] !== undefined) summary[field] = item.payload[field]
  }
  return summary
}

function scanNoPrivateTerms(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL=(?!<)/,
    /postgres(ql)?:\/\/[^<]/i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/,
    /dev-local-token/,
    /NARRATIVEOS_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/,
    /MASTRA_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/,
    /NARRATIVEOS_CREATOR_API_KEY\s*[:=]\s*(?!<)/,
    /Authorization:\s*Bearer\s+(?!<shared-tool-bridge-secret>)/i,
    /system prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
    /sourceRefs/,
    /source_refs/,
    /profile\.id/,
    /kernel\.id/,
    /prompt_id/,
    /prompt_version/,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function renderMarkdown(packet) {
  const taskRows = packet.operatorTasks.map(task => (
    `| ${task.label} | ${task.owner} | ${task.gate} | \`${task.command}\` | ${task.blockedUntil} |`
  ))
  const evidenceRows = Object.entries(packet.sourceEvidence).map(([key, value]) => (
    `| ${key} | ${value.gate || 'n/a'} | ${value.status || 'n/a'} | ${value.decision || 'n/a'} | \`${value.file}\` |`
  ))
  return `# P119 Remote Operator Readiness Packet

Generated: ${packet.generatedAt}

Status: \`${packet.status}\`

Decision: \`${packet.decision}\`

Repository: \`${packet.repository}\`

Head: \`${packet.headSha}\`

Target local file: \`${packet.targetAssignmentPath}\`

## Current Images

| Service | Image |
| --- | --- |
| API | \`${packet.currentImages.api}\` |
| Agent Runtime | \`${packet.currentImages.agent}\` |

## Operator Tasks

| Task | Owner | Gate | Command | Blocked Until |
| --- | --- | --- | --- | --- |
${taskRows.join('\n')}

## Preserved Blockers

${packet.blockedStages.map(stage => `- \`${stage}\``).join('\n') || '- none'}

## Source Evidence

| Evidence | Gate | Status | Decision | File |
| --- | --- | --- | --- | --- |
${evidenceRows.join('\n')}

## Boundary

This packet is safe to hand to a deployment operator. It does not create
remote services, write the ignored assignment file, set GitHub variables,
store provider credentials, promote live runtime, or treat fixture evidence as
production readiness.
`
}

const packageJson = readJson('package.json')
const rootTest = String(packageJson.scripts.test || '')
assert(
  packageJson.scripts['check:remote-operator-readiness-packet'] === 'node scripts/check-remote-operator-readiness-packet.mjs',
  'package.json must expose check:remote-operator-readiness-packet',
)
assert(rootTest.includes('npm run check:remote-operator-readiness-packet'), 'root npm run test must include check:remote-operator-readiness-packet')
assert(
  rootTest.includes('npm run check:remote-assignment-strict-run-package-artifact && npm run check:remote-operator-readiness-packet'),
  'root test must run P119 after P118 strict-run artifact attestation',
)

for (const file of [
  'docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md',
  'docs/backend/P43_CI_ARTIFACT_EVIDENCE_GATE.md',
  'docs/backend/P85_REMOTE_RUNTIME_BLOCKER_NORMALIZATION.md',
  'docs/backend/P118_REMOTE_ASSIGNMENT_STRICT_RUN_PACKAGE.md',
  'docs/backend/P119_REMOTE_OPERATOR_READINESS_PACKET.md',
  '.github/workflows/pages.yml',
]) {
  assert(existsSync(join(root, file)), `missing P119 prerequisite: ${file}`)
}

assertIncludes('docs/backend/P119_REMOTE_OPERATOR_READINESS_PACKET.md', [
  'P119 Remote Operator Readiness Packet',
  'check:remote-operator-readiness-packet',
  'check:remote-operator-readiness-packet-artifact',
  targetAssignmentPath,
  'does not create remote services',
])
assertIncludes('.github/workflows/pages.yml', [
  'Upload remote operator readiness packet',
  'remote-operator-readiness-packet',
  'artifacts/runtime/remote-operator-readiness-packet-*.json',
  'artifacts/runtime/remote-operator-readiness-packet-*.md',
])
assertIncludes('scripts/check-github-actions-artifacts.mjs', [
  'remote-operator-readiness-packet',
])

const headSha = currentHead()
const sourceWorkspaceNoGit = headSha === 'source-workspace-no-git'
const strictRunPackage = latest(
  'remote-assignment-strict-run-package-',
  payload => payload.gate === 'P118_REMOTE_ASSIGNMENT_STRICT_RUN_PACKAGE' && payload.headSha === headSha,
  'current P118 strict-run package',
  { allowFallback: sourceWorkspaceNoGit },
)
const strictRunAttestation = latest(
  'remote-assignment-strict-run-package-attestation-',
  payload => payload.gate === 'P118_REMOTE_ASSIGNMENT_STRICT_RUN_PACKAGE_ATTESTATION' && payload.expectedHeadSha === headSha,
  'current P118 strict-run attestation',
  { allowFallback: sourceWorkspaceNoGit },
)
const blockerLedger = latest(
  'remote-runtime-blockers-',
  payload => payload.headSha === headSha || sourceWorkspaceNoGit,
  'current P85 blocker ledger',
  { allowFallback: true },
)
const blockerAttestation = latest(
  'remote-blocker-artifact-attestation-',
  payload => payload.gate === 'P90_REMOTE_RUNTIME_BLOCKER_ARTIFACT_ATTESTATION' && (payload.expectedHeadSha === headSha || sourceWorkspaceNoGit),
  'current P90 blocker attestation',
  { allowFallback: true },
)
const fillPlan = latest(
  'remote-assignment-fill-plan-',
  payload => payload.gate === 'P105_REMOTE_ASSIGNMENT_FILL_PLAN_GATE' && (payload.headSha === headSha || sourceWorkspaceNoGit),
  'current P105 fill plan',
  { allowFallback: true },
)
const fillPlanAttestation = latest(
  'remote-assignment-fill-plan-attestation-',
  payload => payload.gate === 'P106_REMOTE_ASSIGNMENT_FILL_PLAN_ARTIFACT_ATTESTATION' && (payload.expectedHeadSha === headSha || sourceWorkspaceNoGit),
  'current P106 fill-plan attestation',
  { allowFallback: true },
)
const handoff = latest(
  'remote-assignment-handoff-',
  payload => payload.gate === 'P87_REMOTE_ASSIGNMENT_HANDOFF' && (payload.images?.api?.includes(headSha) || sourceWorkspaceNoGit),
  'current P87 handoff',
  { allowFallback: true },
)
const imageEvidence = latest(
  'runtime-image-publish-evidence-',
  payload => payload.headSha === headSha || sourceWorkspaceNoGit,
  'current P72 runtime image evidence',
  { allowFallback: true },
)
const readiness = latest('live-runtime-readiness-', payload => payload.status, 'latest P23 live readiness')
const activationControl = latest('remote-activation-control-', payload => payload.gate === 'P78_REMOTE_RUNTIME_ACTIVATION_CONTROL', 'latest P78 activation control')

const p118 = strictRunPackage.payload
assert(p118.gate === 'P118_REMOTE_ASSIGNMENT_STRICT_RUN_PACKAGE', 'P119 requires P118 strict-run package')
assert(p118.status === 'passed_with_operator_inputs_required', 'P119 requires P118 operator-input status')
assert(p118.decision === 'strict_run_package_ready_waiting_for_operator_inputs', 'P119 requires P118 waiting-for-operator decision')
assert(p118.writesLocalAssignment === false, 'P119 requires P118 no local writes')
assert(p118.createsRemoteServices === false, 'P119 requires P118 no remote service creation')
assert(p118.setsGitHubVariables === false, 'P119 requires P118 no GitHub variable writes')
assert(p118.storesProviderSecrets === false, 'P119 requires P118 no provider secret storage')
assert(p118.promotesLiveRuntime === false, 'P119 requires P118 no live promotion')
assert(p118.treatsFixtureAsReady === false, 'P119 requires P118 not to treat fixture as ready')

const blockedStages = Array.isArray(blockerLedger.payload.blockedStages)
  ? blockerLedger.payload.blockedStages
  : Array.isArray(p118.blockedStages)
    ? p118.blockedStages
    : []
assert(blockedStages.includes('activation-control'), 'P119 must preserve activation-control blocker')
assert(
  blockedStages.includes('remote-assignment-health-ready') || blockedStages.includes('remote-assignment-file-present'),
  'P119 must preserve remote assignment file or health blocker',
)
assert(blockedStages.includes('live-readiness'), 'P119 must preserve live-readiness blocker')

const commands = Array.isArray(p118.strictRunPackage) ? p118.strictRunPackage : []
const requiredCommandFragments = [
  'check:remote-assignment-env-dry-run',
  'apply:remote-assignment-env',
  'check:remote-runtime-assignment-intake',
  'check:remote-assignment-execution-pack',
  'check:remote-origin-execution',
  'check:remote-origin-provisioning',
  'audit:live-runtime-readiness',
  'check:remote-live-runtime-trace',
  'check:live-cutover-attestation',
  'check:remote-runtime-activation-control',
  'check:remote-runtime-blockers',
]
const commandText = commands.map(item => item.command).join('\n')
for (const fragment of requiredCommandFragments) {
  assert(commandText.includes(fragment), `P119 requires P118 command sequence to include ${fragment}`)
}

const operatorTasks = [
  {
    id: 'share-packet',
    label: 'Share this packet and P118 strict-run package with the deployment operator',
    owner: 'release owner',
    gate: 'P119',
    command: 'npm run check:remote-operator-readiness-packet-artifact',
    blockedUntil: 'packet artifact content is attested',
  },
  {
    id: 'confirm-owner',
    label: 'Confirm remote service owner and deployment provider',
    owner: 'deployment operator',
    gate: 'P117',
    command: 'REMOTE_ASSIGNMENT_ENV_FILE=deploy/runtime-production/remote-assignment.env.local REQUIRE_REMOTE_ASSIGNMENT_ENV_DRY_RUN_READY=true npm run check:remote-assignment-env-dry-run',
    blockedUntil: 'REMOTE_OPERATOR_OWNER and provider are supplied outside Git',
  },
  {
    id: 'fill-env',
    label: 'Fill operator environment without committing secrets',
    owner: 'deployment operator',
    gate: 'P117',
    command: 'REMOTE_ASSIGNMENT_ENV_FILE=deploy/runtime-production/remote-assignment.env.local REQUIRE_REMOTE_ASSIGNMENT_ENV_DRY_RUN_READY=true npm run check:remote-assignment-env-dry-run',
    blockedUntil: 'all required REMOTE_* inputs are present',
  },
  {
    id: 'apply-ignored-assignment',
    label: 'Materialize ignored assignment file',
    owner: 'deployment operator',
    gate: 'P116',
    command: 'REMOTE_ASSIGNMENT_ENV_FILE=deploy/runtime-production/remote-assignment.env.local REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true npm run apply:remote-assignment-env',
    blockedUntil: 'P117 reports ready for apply',
  },
  {
    id: 'validate-assignment',
    label: 'Validate remote assignment health and secret-store confirmations',
    owner: 'backend runtime owner',
    gate: 'P75',
    command: 'REQUIRE_REMOTE_ASSIGNMENT_READY=true npm run check:remote-runtime-assignment-intake',
    blockedUntil: 'remote API and Agent health are reachable over HTTPS',
  },
  {
    id: 'generate-execution-pack',
    label: 'Generate the remote assignment execution pack',
    owner: 'deployment operator',
    gate: 'P79',
    command: 'REMOTE_RUNTIME_ASSIGNMENT_FILE=deploy/runtime-production/remote-assignment.local.json REQUIRE_REMOTE_ASSIGNMENT_EXECUTION_READY=true npm run check:remote-assignment-execution-pack',
    blockedUntil: 'assignment service ids, origins, images and secret-store confirmations are complete',
  },
  {
    id: 'execute-origins',
    label: 'Run remote origin execution and provisioning gates',
    owner: 'deployment operator',
    gate: 'P73/P66',
    command: 'REQUIRE_REMOTE_ORIGIN_EXECUTED=true npm run check:remote-origin-execution && REQUIRE_REMOTE_ORIGIN_PROVISIONED=true npm run check:remote-origin-provisioning',
    blockedUntil: 'remote origins are provisioned and healthy',
  },
  {
    id: 'prove-live-readiness',
    label: 'Prove live runtime readiness and trace',
    owner: 'release owner',
    gate: 'P23/P65',
    command: 'REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness && REQUIRE_REMOTE_LIVE_TRACE_READY=true npm run check:remote-live-runtime-trace',
    blockedUntil: 'live candidate workflow is ready without public leakage',
  },
  {
    id: 'attest-cutover',
    label: 'Attest live cutover and rollback',
    owner: 'release owner',
    gate: 'P76/P77',
    command: 'REQUIRE_LIVE_CUTOVER_ATTESTED=true npm run check:live-cutover-attestation && npm run check:live-rollback-rehearsal',
    blockedUntil: 'assignment, origin, readiness and rollback evidence are attested',
  },
  {
    id: 'unlock-activation',
    label: 'Unlock remote runtime activation control',
    owner: 'release owner',
    gate: 'P78',
    command: 'REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true npm run check:remote-runtime-activation-control',
    blockedUntil: 'activation control reports ready',
  },
  {
    id: 'converge-blockers',
    label: 'Confirm blocker ledger and completion matrix converge',
    owner: 'release owner',
    gate: 'P85/P96',
    command: 'REQUIRE_REMOTE_RUNTIME_BLOCKERS_READY=true npm run check:remote-runtime-blockers && npm run check:runtime-completion-blocker-convergence',
    blockedUntil: 'remote runtime blocker ledger is empty',
  },
]

const packet = {
  version: 1,
  gate: 'P119_REMOTE_OPERATOR_READINESS_PACKET',
  generatedAt: new Date().toISOString(),
  status: 'passed_with_operator_inputs_required',
  decision: 'operator_packet_ready_waiting_for_remote_services',
  publicReleaseBlocking: false,
  repository: repo,
  headSha,
  targetAssignmentPath,
  writesLocalAssignment: false,
  createsRemoteServices: false,
  setsGitHubVariables: false,
  storesProviderSecrets: false,
  promotesLiveRuntime: false,
  treatsFixtureAsReady: false,
  currentImages: {
    api: p118.currentImages?.api,
    agent: p118.currentImages?.agent,
  },
  sourceEvidence: {
    strictRunPackage: evidenceSummary(strictRunPackage, ['headSha']),
    strictRunAttestation: evidenceSummary(strictRunAttestation, ['expectedHeadSha']),
    blockerLedger: evidenceSummary(blockerLedger, ['headSha', 'blockerCount']),
    blockerAttestation: evidenceSummary(blockerAttestation, ['expectedHeadSha', 'blockerCount']),
    fillPlan: evidenceSummary(fillPlan, ['headSha']),
    fillPlanAttestation: evidenceSummary(fillPlanAttestation, ['expectedHeadSha']),
    handoff: evidenceSummary(handoff),
    imageEvidence: evidenceSummary(imageEvidence, ['headSha', 'runId']),
    liveReadiness: evidenceSummary(readiness, ['required']),
    activationControl: evidenceSummary(activationControl, ['required']),
  },
  blockedStages,
  operatorTasks,
  requiredExternalInputs: [
    'REMOTE_OPERATOR_OWNER',
    'REMOTE_OPERATOR_PROVIDER',
    'REMOTE_API_SERVICE_ID',
    'REMOTE_AGENT_SERVICE_ID',
    'REMOTE_API_ORIGIN',
    'REMOTE_AGENT_ORIGIN',
    'REMOTE_API_SECRETS_CONFIGURED',
    'REMOTE_AGENT_SECRETS_CONFIGURED',
    'remote API /health',
    'remote Agent /health',
    'release owner live cutover attestation',
  ],
  nextStrictCommand: 'REQUIRE_REMOTE_ASSIGNMENT_READY=true npm run check:remote-runtime-assignment-intake',
  boundary: {
    shareableWithDeploymentOperator: true,
    containsSecrets: false,
    containsPrivateResearchTitles: false,
    exposesModelProviderPlumbing: false,
    containsProviderPromptPlumbing: false,
    containsCandidateText: false,
  },
}

for (const flag of ['writesLocalAssignment', 'createsRemoteServices', 'setsGitHubVariables', 'storesProviderSecrets', 'promotesLiveRuntime', 'treatsFixtureAsReady']) {
  assert(packet[flag] === false, `P119 must keep ${flag}=false`)
}
assert(packet.currentImages.api?.includes('parallel-universe-novel-api:'), 'P119 API image ref is missing')
assert(packet.currentImages.agent?.includes('parallel-universe-novel-agent-runtime:'), 'P119 Agent image ref is missing')
assert(operatorTasks.length >= 10, 'P119 must include the full operator handoff task chain')
const privateMatches = scanNoPrivateTerms(packet)
const markdown = renderMarkdown(packet)
const markdownPrivateMatches = scanNoPrivateTerms(markdown)
assert(privateMatches.length === 0, `P119 packet leaks private terms: ${privateMatches.join(', ')}`)
assert(markdownPrivateMatches.length === 0, `P119 Markdown leaks private terms: ${markdownPrivateMatches.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const jsonPath = join(artifactDir, `remote-operator-readiness-packet-${stamp}.json`)
const mdPath = join(artifactDir, `remote-operator-readiness-packet-${stamp}.md`)
writeFileSync(jsonPath, `${JSON.stringify(packet, null, 2)}\n`)
writeFileSync(mdPath, markdown)

console.log(JSON.stringify({
  status: packet.status,
  gate: packet.gate,
  decision: packet.decision,
  blockedStages,
  operatorTaskCount: operatorTasks.length,
  artifactPath: relative(root, jsonPath),
  markdownArtifactPath: relative(root, mdPath),
}, null, 2))
