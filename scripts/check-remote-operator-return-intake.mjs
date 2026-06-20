#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'
const targetAssignmentPath = 'deploy/runtime-production/remote-assignment.local.json'
const preferredAssignmentPath = 'deploy/runtime-production/runtime-assignment.intent.local.json'
const generatedContractPath = 'deploy/runtime-production/generated/remote-assignment.contract.json'

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

function latestArtifact(prefix, predicate = null, label = prefix, options = {}) {
  if (!existsSync(artifactDir)) {
    if (options.optional) return null
    throw new Error('runtime artifact directory is missing; run root runtime gates first')
  }
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .map(name => join(artifactDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  for (const file of files) {
    const payload = JSON.parse(readFileSync(file, 'utf8'))
    if (!predicate || predicate(payload)) return { file, payload }
  }
  if (options.optional) return null
  throw new Error(`missing ${label} artifact`)
}

function assertIncludes(file, terms) {
  const text = read(file)
  for (const term of terms) assert(text.includes(term), `${file} must include ${term}`)
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
    /provider prompt/i,
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

function summarizeArtifact(item) {
  if (!item) return null
  return {
    file: relative(root, item.file),
    gate: item.payload.gate || null,
    status: item.payload.status || null,
    assignmentPath: item.payload.assignmentPath || null,
    decision: item.payload.decision
      || item.payload.executionDecision
      || item.payload.provisioningDecision
      || item.payload.releaseDecision
      || null,
    blockedStages: Array.isArray(item.payload.blockedStages) ? item.payload.blockedStages : [],
  }
}

function isCurrentAssignmentIntake(payload) {
  return payload.gate === 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE'
    && [
      targetAssignmentPath,
      preferredAssignmentPath,
      generatedContractPath,
    ].includes(payload.assignmentPath)
}

function renderMarkdown(packet) {
  const evidenceRows = Object.entries(packet.sourceEvidence).map(([key, value]) => (
    `| ${key} | ${value?.gate || 'n/a'} | ${value?.status || 'n/a'} | ${value?.decision || 'n/a'} | \`${value?.file || 'n/a'}\` |`
  ))
  const commandRows = packet.nextStrictGateCommands.map(command => `| \`${command}\` |`)
  return `# P120 Remote Operator Return Intake

Generated: ${packet.generatedAt}

Status: \`${packet.status}\`

Decision: \`${packet.decision}\`

Repository: \`${packet.repository}\`

Head: \`${packet.headSha}\`

Target local file: \`${packet.targetAssignmentPath}\`

Preferred edge-only intent: \`${packet.preferredAssignmentPath}\`

Assignment source: \`${packet.assignmentSource}\`

## Preserved Blockers

${packet.blockedStages.map(stage => `- \`${stage}\``).join('\n') || '- none'}

## Next Strict Gate Commands

| Command |
| --- |
${commandRows.join('\n')}

## Source Evidence

| Evidence | Gate | Status | Decision | File |
| --- | --- | --- | --- | --- |
${evidenceRows.join('\n')}

## Boundary

P120 is a return-intake verifier. It does not create remote services, write the
ignored assignment file, set GitHub variables, store credentials, promote live
runtime, or treat fixture evidence as production readiness.
`
}

const packageJson = readJson('package.json')
const rootTest = String(packageJson.scripts.test || '')
assert(
  packageJson.scripts['check:remote-operator-return-intake'] === 'node scripts/check-remote-operator-return-intake.mjs',
  'package.json must expose check:remote-operator-return-intake',
)
assert(
  packageJson.scripts['check:remote-operator-return-intake-artifact'] === 'node scripts/check-remote-operator-return-intake-artifact.mjs',
  'package.json must expose check:remote-operator-return-intake-artifact',
)
assert(rootTest.includes('npm run check:remote-operator-return-intake'), 'root npm run test must include check:remote-operator-return-intake')
assert(
  rootTest.includes('npm run check:remote-operator-readiness-packet-artifact && npm run check:remote-operator-return-intake'),
  'root test must run P120 after P119 artifact attestation',
)

for (const file of [
  'docs/backend/P119_REMOTE_OPERATOR_READINESS_PACKET.md',
  'docs/backend/P120_REMOTE_OPERATOR_RETURN_INTAKE.md',
  'deploy/runtime-production/remote-assignment.schema.json',
  'deploy/runtime-production/remote-assignment.example.json',
  '.github/workflows/pages.yml',
]) {
  assert(existsSync(join(root, file)), `missing P120 prerequisite: ${file}`)
}

assertIncludes('docs/backend/P120_REMOTE_OPERATOR_RETURN_INTAKE.md', [
  'P120 Remote Operator Return Intake',
  'check:remote-operator-return-intake',
  'check:remote-operator-return-intake-artifact',
  targetAssignmentPath,
  preferredAssignmentPath,
  'does not create remote services',
])
assertIncludes('.github/workflows/pages.yml', [
  'Upload remote operator return intake',
  'remote-operator-return-intake',
  'Check remote operator return intake artifact content',
])

const headSha = currentHead()
const sourceWorkspaceNoGit = headSha === 'source-workspace-no-git'
const p119 = latestArtifact(
  'remote-operator-readiness-packet-',
  payload => payload.gate === 'P119_REMOTE_OPERATOR_READINESS_PACKET' && (payload.headSha === headSha || sourceWorkspaceNoGit),
  'current P119 operator readiness packet',
  { optional: sourceWorkspaceNoGit },
)
const p75 = latestArtifact(
  'remote-runtime-assignment-intake-',
  isCurrentAssignmentIntake,
  'latest P75 assignment intake for current operator assignment path',
)
const p117 = latestArtifact('remote-assignment-env-dry-run-', payload => payload.gate === 'P117_REMOTE_ASSIGNMENT_ENV_DRY_RUN_GATE', 'latest P117 env dry-run')
const p113 = latestArtifact('remote-assignment-image-drift-', payload => payload.gate === 'P113_REMOTE_ASSIGNMENT_IMAGE_DRIFT_GATE', 'latest P113 image drift', { optional: true })
const p85 = latestArtifact('remote-runtime-blockers-', payload => payload.gate === 'P85_REMOTE_RUNTIME_BLOCKER_NORMALIZATION', 'latest P85 blocker ledger')
const p78 = latestArtifact('remote-activation-control-', payload => payload.gate === 'P78_REMOTE_RUNTIME_ACTIVATION_CONTROL', 'latest P78 activation control')
const p23 = latestArtifact(
  'live-runtime-readiness-',
  payload => typeof payload.status === 'string' && Array.isArray(payload.checks),
  'latest P23 live readiness',
)

if (!sourceWorkspaceNoGit) {
  assert(p119, 'P120 requires current-head P119 packet')
  assert(p119.payload.headSha === headSha, 'P120 requires current-head P119 packet head')
}
assert(p75.payload.repository === repo, 'P75 repository mismatch')
assert(p119?.payload?.targetAssignmentPath === targetAssignmentPath || sourceWorkspaceNoGit, 'P119 target assignment path mismatch')
assert(p119?.payload?.decision === 'operator_packet_ready_waiting_for_remote_services' || sourceWorkspaceNoGit, 'P119 packet must still be waiting for remote services')

const p75Decision = p75.payload.decision
const p117Decision = p117.payload.decision
const p85Blockers = Array.isArray(p85.payload.blockedStages) ? p85.payload.blockedStages : []
const p75Blockers = Array.isArray(p75.payload.blockedStages) ? p75.payload.blockedStages : []
const p78Blockers = Array.isArray(p78.payload.blockedStages) ? p78.payload.blockedStages : []
const assignmentFilePresent = Boolean(p75.payload.assignmentFilePresent)
const assignmentEvidencePresent = Boolean(p75.payload.assignmentEvidencePresent ?? (p75Decision !== 'remote_assignment_missing'))
const healthPending = p75Decision === 'remote_assignment_pending_health'
const assignmentReady = p75Decision === 'remote_assignment_ready'

let status = 'passed_waiting_for_operator_return'
let decision = 'operator_return_waiting_for_assignment'
if (healthPending) {
  status = 'passed_waiting_for_remote_health'
  decision = 'operator_return_waiting_for_health'
}
if (assignmentReady) {
  status = 'passed_ready_for_strict_activation'
  decision = 'operator_return_ready_for_strict_activation'
}

const blockedStages = [...new Set([
  ...p85Blockers,
  ...p75Blockers.map(stage => `assignment-${stage}`),
  ...p78Blockers.map(stage => `activation-${stage}`),
])]

const nextStrictGateCommands = [
  'npm run check:remote-runtime-assignment-intake',
  'REQUIRE_REMOTE_ORIGIN_EXECUTED=true npm run check:remote-origin-execution',
  'REQUIRE_REMOTE_ORIGIN_PROVISIONED=true npm run check:remote-origin-provisioning',
  'REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness',
  'REQUIRE_REMOTE_LIVE_TRACE_READY=true npm run check:remote-live-runtime-trace',
  'REQUIRE_LIVE_CUTOVER_ATTESTED=true npm run check:live-cutover-attestation',
  'REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true npm run check:remote-runtime-activation-control',
  'npm run check:remote-runtime-blockers',
  'npm run check:runtime-completion-blocker-convergence',
]

const packet = {
  version: 1,
  gate: 'P120_REMOTE_OPERATOR_RETURN_INTAKE',
  generatedAt: new Date().toISOString(),
  repository: repo,
  headSha,
  status,
  decision,
  publicReleaseBlocking: false,
  targetAssignmentPath,
  preferredAssignmentPath,
  generatedContractPath,
  assignmentSource: p75.payload.assignmentSource || 'legacy-full-remote-assignment',
  assignmentFilePresent,
  assignmentEvidencePresent,
  assignmentDecision: p75Decision,
  envDryRunDecision: p117Decision,
  imageDriftDecision: p113?.payload?.decision || null,
  blockedStages,
  nextStrictGateCommands,
  boundary: {
    shareableWithDeploymentOperator: true,
    containsSecrets: false,
    containsPrivateResearchTitles: false,
    exposesModelProviderPlumbing: false,
    containsProviderPromptPlumbing: false,
    containsCandidateText: false,
    writesLocalAssignment: false,
    createsRemoteServices: false,
    setsGitHubVariables: false,
    storesProviderSecrets: false,
    promotesLiveRuntime: false,
    treatsFixtureAsReady: false,
  },
  sourceEvidence: {
    operatorReadinessPacket: summarizeArtifact(p119),
    assignmentIntake: summarizeArtifact(p75),
    envDryRun: summarizeArtifact(p117),
    imageDrift: summarizeArtifact(p113),
    blockerLedger: summarizeArtifact(p85),
    activationControl: summarizeArtifact(p78),
    liveReadiness: summarizeArtifact(p23),
  },
}

const privateMatches = scanNoPrivateTerms(packet)
assert(privateMatches.length === 0, `P120 packet leaked private terms: ${privateMatches.join(', ')}`)
assert(nextStrictGateCommands.every(command => !command.includes('gh variable set')), 'P120 must not set GitHub variables')
assert(nextStrictGateCommands.every(command => !command.includes('docker run')), 'P120 must not start services')

mkdirSync(artifactDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const artifactPath = join(artifactDir, `remote-operator-return-intake-${stamp}.json`)
const markdownPath = join(artifactDir, `remote-operator-return-intake-${stamp}.md`)
writeFileSync(artifactPath, `${JSON.stringify(packet, null, 2)}\n`)
writeFileSync(markdownPath, renderMarkdown(packet))

console.log(JSON.stringify({
  status,
  gate: packet.gate,
  decision,
  assignmentFilePresent,
  assignmentDecision: p75Decision,
  envDryRunDecision: p117Decision,
  blockedStages,
  artifactPath: relative(root, artifactPath),
  markdownArtifactPath: relative(root, markdownPath),
}, null, 2))
