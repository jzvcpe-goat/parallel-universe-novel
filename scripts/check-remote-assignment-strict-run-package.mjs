#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
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

function assertIncludes(file, terms) {
  const text = read(file)
  for (const term of terms) assert(text.includes(term), `${file} must include ${term}`)
}

function scanNoPrivateTerms(payload) {
  const text = JSON.stringify(payload)
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

function blockedStagesFrom(payload) {
  if (Array.isArray(payload.blockedStages)) return payload.blockedStages
  if (Array.isArray(payload.upstreamEvidence?.blockerLedger?.blockedStages)) {
    return payload.upstreamEvidence.blockerLedger.blockedStages
  }
  if (Array.isArray(payload.stages)) {
    return payload.stages.filter(stage => stage?.status === 'blocked').map(stage => stage.id)
  }
  return []
}

function evidenceSummary(item, fields = []) {
  const summary = {
    file: relative(root, item.file),
    status: item.payload.status || null,
    decision: item.payload.decision || item.payload.executionDecision || item.payload.provisioningDecision || item.payload.releaseDecision || null,
    gate: item.payload.gate || null,
    predicateMatched: item.predicateMatched,
  }
  for (const field of fields) {
    if (item.payload[field] !== undefined) summary[field] = item.payload[field]
  }
  return summary
}

function stage(id, label, command, gate, owner, expectedBlockedUntil) {
  return {
    id,
    label,
    gate,
    owner,
    command,
    expectedBlockedUntil,
  }
}

function renderMarkdown(artifact) {
  const rows = artifact.strictRunPackage.map(item => (
    `| ${item.label} | ${item.gate} | ${item.owner} | \`${item.command}\` | ${item.expectedBlockedUntil} |`
  ))
  return `# P118 Remote Assignment Strict-Run Package

Generated: ${artifact.generatedAt}

Status: \`${artifact.status}\`

Decision: \`${artifact.decision}\`

Target local file: \`${artifact.targetAssignmentPath}\`

## Current Images

| Service | Image |
| --- | --- |
| API | \`${artifact.currentImages.api}\` |
| Agent Runtime | \`${artifact.currentImages.agent}\` |

## Strict Run Package

| Step | Gate | Owner | Command | Blocked Until |
| --- | --- | --- | --- | --- |
${rows.join('\n')}

## Current Blockers

${artifact.blockedStages.map(item => `- \`${item}\``).join('\n') || '- none'}

## Boundary

This package is an operator execution checklist. It does not create remote
services, write the ignored local assignment file, set GitHub variables, store
secrets, promote live runtime, or treat fixtures as production evidence.
`
}

const packageJson = readJson('package.json')
const rootTest = String(packageJson.scripts.test || '')
assert(
  packageJson.scripts['check:remote-assignment-strict-run-package'] === 'node scripts/check-remote-assignment-strict-run-package.mjs',
  'package.json must expose check:remote-assignment-strict-run-package',
)
assert(rootTest.includes('npm run check:remote-assignment-strict-run-package'), 'root npm run test must include check:remote-assignment-strict-run-package')
assert(
  rootTest.includes('npm run check:remote-assignment-image-drift && npm run check:remote-assignment-strict-run-package'),
  'root test must run P118 after P113 image drift',
)

for (const file of [
  'docs/backend/P105_REMOTE_ASSIGNMENT_FILL_PLAN_GATE.md',
  'docs/backend/P106_REMOTE_ASSIGNMENT_FILL_PLAN_ARTIFACT_ATTESTATION.md',
  'docs/backend/P116_REMOTE_ASSIGNMENT_ENV_APPLY_GATE.md',
  'docs/backend/P117_REMOTE_ASSIGNMENT_ENV_DRY_RUN_GATE.md',
  'docs/backend/P118_REMOTE_ASSIGNMENT_STRICT_RUN_PACKAGE.md',
  '.github/workflows/pages.yml',
]) {
  assert(existsSync(join(root, file)), `missing P118 prerequisite: ${file}`)
}

assertIncludes('docs/backend/P118_REMOTE_ASSIGNMENT_STRICT_RUN_PACKAGE.md', [
  'P118 Remote Assignment Strict-Run Package',
  'check:remote-assignment-strict-run-package',
  targetAssignmentPath,
  'does not write',
  'remote-assignment-strict-run-package',
])
assertIncludes('.github/workflows/pages.yml', [
  'Upload remote assignment strict-run package',
  'remote-assignment-strict-run-package',
  'artifacts/runtime/remote-assignment-strict-run-package-*.json',
  'artifacts/runtime/remote-assignment-strict-run-package-*.md',
])
assertIncludes('scripts/check-github-actions-artifacts.mjs', [
  'remote-assignment-strict-run-package',
])

const headSha = currentHead()
const sourceWorkspaceNoGit = headSha === 'source-workspace-no-git'
const imageEvidence = latest('runtime-image-publish-evidence-', payload => payload.headSha === headSha, 'current runtime image evidence', { allowFallback: true })
const fillPlan = latest('remote-assignment-fill-plan-', payload => payload.gate === 'P105_REMOTE_ASSIGNMENT_FILL_PLAN_GATE' && payload.headSha === headSha, 'current P105 fill plan', { allowFallback: true })
const fillPlanAttestation = latest('remote-assignment-fill-plan-attestation-', payload => payload.gate === 'P106_REMOTE_ASSIGNMENT_FILL_PLAN_ARTIFACT_ATTESTATION' && payload.expectedHeadSha === headSha, 'current P106 fill plan attestation', { allowFallback: true })
const envApply = latest('remote-assignment-env-apply-', payload => payload.gate === 'P116_REMOTE_ASSIGNMENT_ENV_APPLY_GATE' && payload.currentHead === headSha, 'current P116 env apply check', { allowFallback: true })
const envDryRun = latest('remote-assignment-env-dry-run-', payload => payload.gate === 'P117_REMOTE_ASSIGNMENT_ENV_DRY_RUN_GATE' && payload.currentHead === headSha, 'current P117 env dry run', { allowFallback: true })
const imageDrift = latest('remote-assignment-image-drift-', payload => payload.gate === 'P113_REMOTE_ASSIGNMENT_IMAGE_DRIFT_GATE' && payload.currentHead === headSha, 'current P113 image drift', { allowFallback: true })
const assignmentIntake = latest('remote-runtime-assignment-intake-', payload => payload.gate === 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE', 'latest P75 assignment intake')
const executionPack = latest('remote-assignment-execution-pack-', payload => payload.gate === 'P79_REMOTE_ASSIGNMENT_EXECUTION_PACK', 'latest P79 execution pack')
const originExecution = latest('remote-origin-execution-', payload => payload.executionDecision || payload.status, 'latest P73 origin execution')
const originProvisioning = latest('remote-origin-provisioning-', payload => payload.provisioningDecision || payload.status, 'latest P66 origin provisioning')
const readiness = latest('live-runtime-readiness-', payload => payload.status, 'latest P23 live readiness')
const liveCutover = latest('live-cutover-attestation-', payload => payload.gate === 'P76_LIVE_CUTOVER_ATTESTATION_GATE', 'latest P76 live cutover')
const activationControl = latest('remote-activation-control-', payload => payload.gate === 'P78_REMOTE_RUNTIME_ACTIVATION_CONTROL', 'latest P78 activation control')
const blockerLedger = latest('remote-runtime-blockers-', payload => payload.headSha === headSha, 'current P85 blocker ledger', { allowFallback: true })
const blockerConvergence = latest('runtime-completion-blocker-convergence-', payload => payload.status, 'latest P96 blocker convergence')

const apiImage = fillPlan.payload.currentImages?.api || imageEvidence.payload.images?.find(item => item.includes('/parallel-universe-novel-api:'))
const agentImage = fillPlan.payload.currentImages?.agent || imageEvidence.payload.images?.find(item => item.includes('/parallel-universe-novel-agent-runtime:'))
assert(apiImage, 'P118 could not resolve API image')
assert(agentImage, 'P118 could not resolve Agent Runtime image')
assert(
  imageDrift.payload.decision === 'remote_assignment_images_current'
    || imageDrift.payload.decision === 'remote_assignment_local_absent'
    || sourceWorkspaceNoGit,
  'P118 requires current remote assignment image drift or explicit local-assignment-absent evidence',
)
assert(imageDrift.payload.imageDriftDetected === false || sourceWorkspaceNoGit, 'P118 requires no remote assignment image drift')
assert(fillPlan.payload.decision === 'remote_assignment_fill_plan_ready', 'P118 requires P105 fill-plan readiness')
assert(fillPlanAttestation.payload.gate === 'P106_REMOTE_ASSIGNMENT_FILL_PLAN_ARTIFACT_ATTESTATION', 'P118 requires P106 fill-plan attestation')
assert(envApply.payload.writesLocalAssignment === false, 'P118 requires P116 check mode without writes')
assert(envDryRun.payload.writesLocalAssignment === false, 'P118 requires P117 dry run without writes')

const blockedStages = blockedStagesFrom(blockerLedger.payload)
const strictRunPackage = [
  stage('runtime-images', 'Runtime images are published', 'npm run check:runtime-image-publish-evidence', 'P72', 'release engineering', 'current-head runtime image evidence exists'),
  stage('fill-plan', 'Operator fill plan is current', 'npm run check:remote-assignment-fill-plan', 'P105/P106', 'deployment operator', 'fill-plan and attestation are current'),
  stage('env-dry-run', 'Validate operator environment without writes', 'npm run check:remote-assignment-env-dry-run', 'P117', 'deployment operator', 'all REMOTE_* fields are supplied outside Git'),
  stage('env-apply', 'Materialize ignored assignment from operator environment', 'REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true npm run apply:remote-assignment-env', 'P116', 'deployment operator', 'P117 is ready for apply'),
  stage('image-drift', 'Confirm assignment images match the current release head', 'npm run check:remote-assignment-image-drift', 'P113', 'release engineering', 'assignment image refs match current P72 evidence'),
  stage('assignment-intake', 'Validate assignment, health and secret-store confirmations', 'REQUIRE_REMOTE_ASSIGNMENT_READY=true npm run check:remote-runtime-assignment-intake', 'P75', 'backend runtime owner', 'remote API and Agent health endpoints are ready'),
  stage('execution-pack', 'Validate assignment execution package', 'REMOTE_RUNTIME_ASSIGNMENT_FILE=deploy/runtime-production/remote-assignment.local.json REQUIRE_REMOTE_ASSIGNMENT_EXECUTION_READY=true npm run check:remote-assignment-execution-pack', 'P79', 'deployment operator', 'service ids, origins, images and secret-store confirmations are complete'),
  stage('origin-execution', 'Prove remote origins were executed', 'REQUIRE_REMOTE_ORIGIN_EXECUTED=true npm run check:remote-origin-execution', 'P73', 'deployment operator', 'remote origin execution evidence is complete'),
  stage('origin-provisioning', 'Prove remote origins are provisioned', 'REQUIRE_REMOTE_ORIGIN_PROVISIONED=true npm run check:remote-origin-provisioning', 'P66', 'deployment operator', 'remote API and Agent origins are provisioned and healthy'),
  stage('live-readiness', 'Run live runtime readiness', 'REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness', 'P23', 'release owner', 'live runtime readiness returns ready'),
  stage('live-trace', 'Prove remote live trace', 'REQUIRE_REMOTE_LIVE_TRACE_READY=true npm run check:remote-live-runtime-trace', 'P65', 'release owner', 'remote creator trace is proven against live origins'),
  stage('cutover', 'Attest live cutover', 'REQUIRE_LIVE_CUTOVER_ATTESTED=true npm run check:live-cutover-attestation', 'P76', 'release owner', 'assignment, origin, readiness and rollback evidence are attested'),
  stage('activation', 'Unlock activation control', 'REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true npm run check:remote-runtime-activation-control', 'P78', 'release owner', 'activation control is ready for public live runtime'),
  stage('blocker-ledger', 'Confirm no remote runtime blockers remain', 'REQUIRE_REMOTE_RUNTIME_BLOCKERS_READY=true npm run check:remote-runtime-blockers', 'P85', 'release owner', 'remote runtime blocker ledger has no blockers'),
  stage('blocker-convergence', 'Confirm completion matrix and blocker ledger converge', 'npm run check:runtime-completion-blocker-convergence', 'P96', 'release owner', 'completion matrix and blocker ledger agree'),
]

const strictCommandText = strictRunPackage.map(item => item.command).join('\n')
for (const command of [
  'check:runtime-image-publish-evidence',
  'check:remote-assignment-fill-plan',
  'check:remote-assignment-env-dry-run',
  'apply:remote-assignment-env',
  'check:remote-assignment-image-drift',
  'check:remote-runtime-assignment-intake',
  'check:remote-assignment-execution-pack',
  'check:remote-origin-execution',
  'check:remote-origin-provisioning',
  'audit:live-runtime-readiness',
  'check:remote-live-runtime-trace',
  'check:live-cutover-attestation',
  'check:remote-runtime-activation-control',
  'check:remote-runtime-blockers',
  'check:runtime-completion-blocker-convergence',
]) {
  assert(strictCommandText.includes(command), `P118 strict run package must include ${command}`)
}

assert(blockedStages.includes('activation-control'), 'P118 must preserve activation-control as blocked until strict remote cutover passes')
if (!sourceWorkspaceNoGit) {
  assert(!blockedStages.includes('runtime-images-published'), 'P118 release package must not keep runtime images blocked')
}

const artifact = {
  version: 1,
  gate: 'P118_REMOTE_ASSIGNMENT_STRICT_RUN_PACKAGE',
  generatedAt: new Date().toISOString(),
  status: 'passed_with_operator_inputs_required',
  decision: 'strict_run_package_ready_waiting_for_operator_inputs',
  publicReleaseBlocking: false,
  repository: packageJson.repository?.url || 'jzvcpe-goat/parallel-universe-novel',
  headSha,
  targetAssignmentPath,
  writesLocalAssignment: false,
  createsRemoteServices: false,
  setsGitHubVariables: false,
  storesProviderSecrets: false,
  promotesLiveRuntime: false,
  treatsFixtureAsReady: false,
  currentImages: {
    api: apiImage,
    agent: agentImage,
  },
  upstreamEvidence: {
    fillPlan: evidenceSummary(fillPlan, ['headSha']),
    fillPlanAttestation: evidenceSummary(fillPlanAttestation, ['expectedHeadSha']),
    envApply: evidenceSummary(envApply, ['mode', 'writesLocalAssignment']),
    envDryRun: evidenceSummary(envDryRun, ['currentHead', 'writesLocalAssignment', 'readyForApply']),
    imageDrift: evidenceSummary(imageDrift, ['currentHead', 'imageDriftDetected', 'localAssignmentFilePresent']),
    assignmentIntake: evidenceSummary(assignmentIntake),
    executionPack: evidenceSummary(executionPack),
    originExecution: evidenceSummary(originExecution),
    originProvisioning: evidenceSummary(originProvisioning),
    liveReadiness: evidenceSummary(readiness, ['required']),
    liveCutover: evidenceSummary(liveCutover),
    activationControl: evidenceSummary(activationControl, ['required']),
    blockerLedger: {
      ...evidenceSummary(blockerLedger, ['headSha']),
      blockedStages,
    },
    blockerConvergence: evidenceSummary(blockerConvergence, ['blockerCount']),
  },
  blockedStages,
  strictRunPackage,
  boundary: {
    shareableWithDeploymentOperator: true,
    containsSecrets: false,
    containsPrivateResearchTitles: false,
    exposesModelProviderPlumbing: false,
  },
}

for (const flag of ['writesLocalAssignment', 'createsRemoteServices', 'setsGitHubVariables', 'storesProviderSecrets', 'promotesLiveRuntime', 'treatsFixtureAsReady']) {
  assert(artifact[flag] === false, `P118 must keep ${flag}=false`)
}
assert(strictRunPackage.length >= 14, 'P118 strict run package must include the full operator chain')
const privateTerms = scanNoPrivateTerms(artifact)
assert(privateTerms.length === 0, `P118 artifact leaks private terms: ${privateTerms.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const jsonPath = join(artifactDir, `remote-assignment-strict-run-package-${stamp}.json`)
const mdPath = join(artifactDir, `remote-assignment-strict-run-package-${stamp}.md`)
writeFileSync(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`)
writeFileSync(mdPath, renderMarkdown(artifact))

console.log(JSON.stringify({
  status: artifact.status,
  gate: artifact.gate,
  decision: artifact.decision,
  blockedStages,
  strictStepCount: strictRunPackage.length,
  artifactPath: relative(root, jsonPath),
  markdownArtifactPath: relative(root, mdPath),
}, null, 2))
