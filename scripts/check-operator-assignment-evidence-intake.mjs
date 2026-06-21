#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const targetAssignmentPath = 'deploy/runtime-production/remote-assignment.local.json'
const preferredAssignmentPath = 'deploy/runtime-production/runtime-assignment.intent.local.json'
const edgeOnlyExampleAssignmentPath = 'deploy/runtime-production/runtime-assignment.intent.example.json'
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

function latestArtifact(prefix, predicate = null, label = prefix) {
  assert(existsSync(artifactDir), 'runtime artifact directory is missing; run root runtime gates first')
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .map(name => join(artifactDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  for (const file of files) {
    const payload = JSON.parse(readFileSync(file, 'utf8'))
    if (!predicate || predicate(payload)) return { file, payload }
  }
  throw new Error(`missing ${label} artifact`)
}

function summarize(item) {
  return {
    file: relative(root, item.file),
    gate: item.payload.gate || null,
    status: item.payload.status || null,
    decision: item.payload.decision || item.payload.releaseDecision || null,
    assignmentPath: item.payload.assignmentPath || item.payload.targetAssignmentPath || null,
  }
}

function isCurrentAssignmentIntake(payload) {
  return payload.gate === 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE'
    && [
      targetAssignmentPath,
      preferredAssignmentPath,
      edgeOnlyExampleAssignmentPath,
      generatedContractPath,
    ].includes(payload.assignmentPath)
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

function isPlaceholder(value) {
  const text = String(value || '').trim()
  return /<[^>]+>/.test(text)
    || /\bFILL_[A-Z0-9_]+\b/i.test(text)
    || /\bREPLACE_ME\b/i.test(text)
    || /\bYOUR[_-][A-Z0-9_-]+\b/i.test(text)
    || /\bTODO[_-][A-Z0-9_-]+\b/i.test(text)
    || /\bUNKNOWN\b/i.test(text)
}

function isRemoteHttps(value) {
  const text = String(value || '').trim()
  if (isPlaceholder(text)) return false
  let url
  try {
    url = new URL(text)
  } catch {
    return false
  }
  return url.protocol === 'https:'
    && url.hostname !== 'localhost'
    && url.hostname !== '127.0.0.1'
    && url.hostname !== '0.0.0.0'
    && url.hostname !== '::1'
    && !url.hostname.endsWith('.local')
    && !url.hostname.endsWith('.invalid')
    && url.hostname !== 'example.com'
    && !url.username
    && !url.password
    && !url.search
    && !url.hash
}

function publicAssignmentIntentProjection() {
  const intentPath = join(root, preferredAssignmentPath)
  const healthResultPath = join(root, 'deploy/runtime-production/generated/remote-health-evidence.result.json')
  const stages = []
  if (!existsSync(intentPath)) {
    return [
      'runtime-assignment-intent-present',
      'data-api-service-id',
      'data-api-origin',
      'data-api-configured',
      'data-api-health-ready',
    ]
  }

  let intent
  try {
    intent = JSON.parse(readFileSync(intentPath, 'utf8'))
  } catch {
    return [
      'runtime-assignment-intent-valid-json',
      'data-api-service-id',
      'data-api-origin',
      'data-api-configured',
      'data-api-health-ready',
    ]
  }

  if (!intent.operator?.owner || isPlaceholder(intent.operator.owner)) stages.push('operator-owner')
  if (!intent.operator?.provider || isPlaceholder(intent.operator.provider)) stages.push('operator-provider')
  if (!intent.frontend?.provider || isPlaceholder(intent.frontend.provider)) stages.push('frontend-provider')
  if (!intent.frontend?.service_id || isPlaceholder(intent.frontend.service_id)) stages.push('frontend-service-id')
  if (!isRemoteHttps(intent.frontend?.origin)) stages.push('frontend-origin')
  if (intent.frontend?.secrets_configured !== true) stages.push('frontend-configured')
  if (!intent.data_api?.service_id || isPlaceholder(intent.data_api.service_id)) stages.push('data-api-service-id')
  if (!isRemoteHttps(intent.data_api?.origin)) stages.push('data-api-origin')
  if (intent.data_api?.secrets_configured !== true) stages.push('data-api-configured')
  if (intent.agent?.remote_required !== false) stages.push('remote-agent-absence-confirmed')
  if (intent.agent?.ai_generation_cloud_runtime !== false) stages.push('cloud-ai-runtime-disabled')
  if (intent.agent?.reader_can_trigger_ai !== false) stages.push('reader-ai-trigger-disabled')

  let healthOk = false
  if (existsSync(healthResultPath)) {
    try {
      const health = JSON.parse(readFileSync(healthResultPath, 'utf8'))
      healthOk = health.status === 'ok'
        && health.runtime_mode === 'edge-only'
        && health.remote_agent?.required === false
        && health.remote_agent?.evidence === 'not-required-edge-only'
    } catch {
      healthOk = false
    }
  }
  if (!healthOk) stages.push('data-api-health-ready')
  return stages
}

function assertIncludes(file, terms) {
  const text = read(file)
  for (const term of terms) assert(text.includes(term), `${file} must include ${term}`)
}

function renderMarkdown(packet) {
  const inputRows = packet.requiredOperatorEvidence.map(item => (
    `| \`${item.env}\` | ${item.label} | ${item.publicSafe ? 'yes' : 'no'} | ${item.validation} |`
  ))
  const commandRows = packet.nextCommands.map(command => `| \`${command}\` |`)
  return `# P123 Operator Assignment Evidence Intake

Generated: ${packet.generatedAt}

Status: \`${packet.status}\`

Selected goal: \`${packet.selectedGoal}\`

Head: \`${packet.headSha}\`

Runtime topology: \`${packet.runtimeTopology}\`

Preferred local intent: \`${packet.preferredAssignmentPath}\`

Tracked edge-only projection: \`${packet.edgeOnlyExampleAssignmentPath}\`

Generated contract: \`${packet.generatedContractPath}\`

Legacy full-remote assignment file: \`${packet.legacyTargetAssignmentPath}\`

## Required Operator Evidence

| Evidence key | Meaning | Public-safe | Validation |
| --- | --- | --- | --- |
${inputRows.join('\n')}

## Current Blocking Stages

${packet.blockedStages.map(stage => `- \`${stage}\``).join('\n') || '- none'}

## Next Commands

| Command |
| --- |
${commandRows.join('\n')}

## Boundary

P123 packages the operator assignment intake surface. It does not write the
ignored assignment file, create services, set GitHub variables, store provider
credentials, promote live runtime, or treat fixture evidence as readiness.
`
}

const packageJson = readJson('package.json')
const rootTest = String(packageJson.scripts.test || '')
assert(
  packageJson.scripts['check:operator-assignment-evidence-intake'] === 'node scripts/check-operator-assignment-evidence-intake.mjs',
  'package.json must expose check:operator-assignment-evidence-intake',
)
assert(
  rootTest.includes('npm run check:loop-next-goal-ledger && npm run check:operator-return-fixture-isolation && npm run check:operator-assignment-evidence-intake && npm run check:operator-assignment-evidence-intake-artifact && npm run check:operator-assignment-env-validation-fixture && npm run check:operator-assignment-env-apply-fixture && npm run check:operator-assignment-env-template && npm run check:operator-assignment-env-file-loader && npm run check:operator-assignment-loop-command-consistency && npm run check:operator-assignment-loop-command-consistency-artifact && npm run check:operator-assignment-current-head-coherence && npm run check:operator-assignment-transition-fixture && npm run check:operator-assignment-transition-fixture-artifact && npm run audit:dependencies'),
  'root test must run P123/P124/P125/P126/P128/P129/P130/P131/P132/P133 after P121/P122 and before dependency audit',
)

for (const file of [
  'docs/backend/P121_LOOP_NEXT_GOAL_LEDGER.md',
  'docs/backend/P122_OPERATOR_RETURN_FIXTURE_ISOLATION.md',
  'docs/backend/P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE.md',
  'docs/backend/P128_OPERATOR_ASSIGNMENT_ENV_TEMPLATE_GATE.md',
  'docs/backend/P129_OPERATOR_ASSIGNMENT_ENV_FILE_LOADER.md',
  'docs/backend/P130_OPERATOR_ASSIGNMENT_LOOP_COMMAND_CONSISTENCY.md',
  'docs/backend/P131_OPERATOR_ASSIGNMENT_COMMAND_CONSISTENCY_ARTIFACT_ATTESTATION.md',
  'docs/backend/P132_OPERATOR_ASSIGNMENT_CURRENT_HEAD_COHERENCE.md',
  'docs/backend/P117_REMOTE_ASSIGNMENT_ENV_DRY_RUN_GATE.md',
  'docs/backend/P120_REMOTE_OPERATOR_RETURN_INTAKE.md',
  'scripts/check-loop-next-goal-ledger.mjs',
  'scripts/check-operator-return-fixture-isolation.mjs',
  'scripts/check-remote-assignment-env-dry-run.mjs',
  'scripts/apply-remote-assignment-env.mjs',
]) {
  assert(existsSync(join(root, file)), `missing P123 prerequisite: ${file}`)
}

assertIncludes('docs/backend/P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE.md', [
  'P123 Operator Assignment Evidence Intake',
  'check:operator-assignment-evidence-intake',
  preferredAssignmentPath,
  edgeOnlyExampleAssignmentPath,
  'edge-only',
  'remote-assignment:prepare',
  'P138',
  'P130',
  'P131',
  'P132',
  'does not write',
])
assertIncludes('docs/backend/P121_LOOP_NEXT_GOAL_LEDGER.md', [
  'P123',
  'operator-assignment-evidence-intake',
])
assertIncludes('docs/backend/P122_OPERATOR_RETURN_FIXTURE_ISOLATION.md', [
  'P123',
  'check:operator-assignment-evidence-intake',
])

const headSha = currentHead()
const sourceWorkspaceNoGit = headSha === 'source-workspace-no-git'
const p121 = latestArtifact(
  'loop-next-goal-ledger-',
  payload => payload.gate === 'P121_LOOP_NEXT_GOAL_LEDGER' && payload.status === 'passed',
  'P121 next-goal ledger',
)
const p122 = latestArtifact(
  'operator-return-fixture-isolation-',
  payload => payload.gate === 'P122_OPERATOR_RETURN_FIXTURE_ISOLATION' && payload.status === 'passed',
  'P122 fixture isolation',
)
const p120 = latestArtifact(
  'remote-operator-return-intake-',
  payload => payload.gate === 'P120_REMOTE_OPERATOR_RETURN_INTAKE'
    && (payload.headSha === headSha || sourceWorkspaceNoGit),
  'current P120 operator return intake',
)
const p117 = latestArtifact(
  'remote-assignment-env-dry-run-',
  payload => payload.gate === 'P117_REMOTE_ASSIGNMENT_ENV_DRY_RUN_GATE'
    && (payload.currentHead === headSha || sourceWorkspaceNoGit)
    && payload.targetPath === targetAssignmentPath
    && payload.decision === 'operator_env_not_supplied'
    && payload.p116ApplyPreflight?.readyForApply === false,
  'current waiting P117 env dry-run',
)
const p75 = latestArtifact(
  'remote-runtime-assignment-intake-',
  isCurrentAssignmentIntake,
  'current P75 assignment intake',
)
const p113 = latestArtifact(
  'remote-assignment-image-drift-',
  payload => payload.gate === 'P113_REMOTE_ASSIGNMENT_IMAGE_DRIFT_GATE'
    && (payload.currentHead === headSha || sourceWorkspaceNoGit),
  'current P113 image drift',
)
const p108 = latestArtifact(
  'remote-assignment-local-boundary-',
  payload => payload.gate === 'P108_REMOTE_ASSIGNMENT_LOCAL_BOUNDARY_GUARD' && payload.status === 'passed',
  'P108 local boundary',
)
const p105 = latestArtifact(
  'remote-assignment-fill-plan-',
  payload => payload.gate === 'P105_REMOTE_ASSIGNMENT_FILL_PLAN_GATE',
  'P105 fill plan',
)

assert(p121.payload.selectedGoal?.id === 'operator-assignment-evidence-intake', 'P123 only runs when P121 selects operator-assignment-evidence-intake')
assert(p121.payload.sourceEvidence?.operatorReturnIntake?.file === relative(root, p120.file), 'P123 requires P121 to reference the current P120 operator return intake')
assert(p121.payload.sourceEvidence?.imageDrift?.file === relative(root, p113.file), 'P123 requires P121 to reference the current P113 image drift evidence')
assert(p122.payload.headSha === headSha || sourceWorkspaceNoGit, 'P123 requires current-head P122 fixture isolation')
assert(p122.payload.selectedNextGoal === 'operator-assignment-evidence-intake', 'P122 must confirm operator-assignment-evidence-intake')
assert(
  p122.payload.sourceEvidence?.loopNextGoalLedger?.file === relative(root, p121.file),
  'P123 requires P122 to reference the current P121 loop next-goal ledger',
)
assert(
  p122.payload.sourceEvidence?.operatorReturnIntake?.file === relative(root, p120.file),
  'P123 requires P122 to reference the current P120 operator return intake',
)
assert(p120.payload.decision === 'operator_return_waiting_for_assignment', 'P123 requires P120 to still be waiting for operator assignment evidence')
assert(p120.payload.targetAssignmentPath === targetAssignmentPath, 'P120 target assignment path mismatch')
assert(p120.payload.preferredAssignmentPath === preferredAssignmentPath, 'P120 preferred assignment path mismatch')
assert(p120.payload.edgeOnlyExampleAssignmentPath === edgeOnlyExampleAssignmentPath, 'P120 tracked edge-only projection path mismatch')
const assignmentDecision = String(p75.payload.decision || '')
const assignmentFilePresent = Boolean(
  p75.payload.assignmentFilePresent
    ?? p75.payload.legacyAssignmentFilePresent
    ?? p75.payload.localAssignmentFilePresent
    ?? p120.payload.assignmentFilePresent
    ?? (assignmentDecision !== 'remote_assignment_missing'),
)
assert(
  ['remote_assignment_missing', 'remote_assignment_incomplete'].includes(assignmentDecision),
  'P75 must still show missing or incomplete local assignment before P123',
)
assert(isCurrentAssignmentIntake(p75.payload), 'P75 must use the current ignored local assignment, edge-only intent, or generated contract path')
if (p75.payload.runtimeMode === 'edge-only') {
  const agentBlockers = p75.payload.blockedStages.filter(stage => /^agent-|^remote-agent-|agent-/.test(stage) && stage !== 'remote-agent-not-required')
  assert(agentBlockers.length === 0, `edge-only P75 must not require remote Agent blockers: ${agentBlockers.join(', ')}`)
}
assert(p117.payload.decision === 'operator_env_not_supplied' || p117.payload.readyForApply === false, 'P117 must not report ready-to-apply operator env while P121 selects assignment intake')
if (p117.payload.runtimeMode === 'edge-only') {
  const p117AgentMissing = (p117.payload.missingRequiredKeys || []).filter(key => [
    'REMOTE_AGENT_SERVICE_ID',
    'REMOTE_AGENT_ORIGIN',
    'REMOTE_AGENT_SECRETS_CONFIGURED',
  ].includes(key))
  assert(p117AgentMissing.length === 0, `edge-only P117 must not require remote Agent env keys: ${p117AgentMissing.join(', ')}`)
  assert(
    p117.payload.providerSecretConfirmations?.agent === false,
    'edge-only P117 must keep remote Agent secret-store confirmation false',
  )
  assert(
    (p117.payload.nextCommands || []).includes('npm run remote-assignment:prepare'),
    'edge-only P117 waiting state must point at the P138 compiler command',
  )
}
assert(p113.payload.status === 'passed' || p113.payload.status === 'passed_waiting_for_local_assignment', 'P113 image drift gate must pass or wait for local assignment before P123')
assert(p113.payload.imageDriftDetected === false, 'P123 requires no local assignment image drift before operator evidence intake')
if (assignmentFilePresent) {
  assert(p113.payload.decision === 'remote_assignment_images_current', 'P123 requires current local assignment images when the local assignment file exists')
} else {
  assert(p120.payload.assignmentFilePresent === false, 'P120 must agree the real local assignment file is missing')
  assert(p113.payload.localAssignmentFilePresent === false, 'P113 must agree the local assignment file is missing')
  assert(p113.payload.decision === 'remote_assignment_local_absent', 'P113 must treat missing local assignment as waiting, not image drift')
}
assert(p108.payload.trackedLocalAssignments?.length === 0, 'local assignment files must stay untracked')
assert(p105.payload.decision === 'remote_assignment_fill_plan_ready', 'P105 fill plan must be ready')

const requiredOperatorEvidence = [
  {
    env: 'RUNTIME_ASSIGNMENT_OPERATOR_OWNER',
    label: 'deployment owner or accountable team',
    publicSafe: true,
    validation: 'non-empty, no whitespace, not placeholder',
  },
  {
    env: 'RUNTIME_ASSIGNMENT_FRONTEND_PROVIDER',
    label: 'frontend hosting provider',
    publicSafe: true,
    validation: 'non-empty, no whitespace, not placeholder',
  },
  {
    env: 'RUNTIME_ASSIGNMENT_FRONTEND_SERVICE_ID',
    label: 'frontend service id',
    publicSafe: true,
    validation: 'non-empty hosted site id, not a secret',
  },
  {
    env: 'RUNTIME_ASSIGNMENT_FRONTEND_ORIGIN',
    label: 'frontend HTTPS origin',
    publicSafe: true,
    validation: 'remote https origin, no path, no localhost, no placeholder',
  },
  {
    env: 'RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID or SUPABASE_PROJECT_REF',
    label: 'managed data API service id or project ref',
    publicSafe: true,
    validation: 'non-empty managed data service id, not a secret',
  },
  {
    env: 'RUNTIME_ASSIGNMENT_DATA_API_ORIGIN or SUPABASE_URL',
    label: 'managed data API HTTPS origin',
    publicSafe: true,
    validation: 'remote https origin, no path, no localhost, no placeholder',
  },
  {
    env: 'RUNTIME_ASSIGNMENT_FRONTEND_CONFIGURED',
    label: 'frontend public configuration confirmation',
    publicSafe: true,
    validation: 'exactly true after frontend public config exists',
  },
  {
    env: 'RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED',
    label: 'managed data API publishable/RLS configuration confirmation',
    publicSafe: true,
    validation: 'exactly true after publishable key and read/write policy are configured',
  },
  {
    env: 'agent.remote_required',
    label: 'remote Agent Runtime requirement',
    publicSafe: true,
    validation: 'exactly false for edge-only launch',
  },
  {
    env: 'agent.ai_generation_cloud_runtime',
    label: 'cloud AI generation runtime',
    publicSafe: true,
    validation: 'exactly false for edge-only launch',
  },
  {
    env: 'agent.reader_can_trigger_ai',
    label: 'reader-triggered cloud AI generation',
    publicSafe: true,
    validation: 'exactly false for edge-only launch',
  },
]

const nextCommands = [
  'RUNTIME_ASSIGNMENT_INTENT_ENV_FILE=deploy/runtime-production/runtime-assignment.intent.env.local RUNTIME_ASSIGNMENT_INTENT_FORCE=true npm run prepare:runtime-assignment-intent',
  'npm run remote-assignment:prepare',
  'npm run check:remote-runtime-assignment-intake',
  'npm run remote-health:check',
  'npm run check:remote-operator-return-intake',
  'npm run check:loop-next-goal-ledger',
]

const packet = {
  version: 1,
  gate: 'P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE',
  status: 'passed_waiting_for_operator_assignment_evidence',
  generatedAt: new Date().toISOString(),
  headSha,
  selectedGoal: 'operator-assignment-evidence-intake',
  runtimeTopology: 'edge-only-preferred',
  preferredAssignmentPath,
  edgeOnlyExampleAssignmentPath,
  generatedContractPath,
  legacyTargetAssignmentPath: targetAssignmentPath,
  targetAssignmentPath,
  assignmentDecision,
  assignmentFilePresent,
  requiredOperatorEvidence,
  legacyFullRemoteFallback: {
    targetAssignmentPath,
    acceptedOnlyWhen: 'operator explicitly chooses full-remote API plus Agent Runtime deployment',
    commands: [
      'REMOTE_ASSIGNMENT_ENV_FILE=deploy/runtime-production/remote-assignment.env.local REQUIRE_REMOTE_ASSIGNMENT_ENV_DRY_RUN_READY=true npm run check:remote-assignment-env-dry-run',
      'REMOTE_ASSIGNMENT_ENV_FILE=deploy/runtime-production/remote-assignment.env.local REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true npm run apply:remote-assignment-env',
    ],
  },
  blockedStages: publicAssignmentIntentProjection(),
  nextCommands,
  sourceEvidence: {
    loopNextGoalLedger: summarize(p121),
    fixtureIsolation: summarize(p122),
    operatorReturnIntake: summarize(p120),
    envDryRun: summarize(p117),
    assignmentIntake: summarize(p75),
    imageDrift: summarize(p113),
    localBoundary: summarize(p108),
    fillPlan: summarize(p105),
  },
  boundary: {
    writesLocalAssignment: false,
    createsRemoteServices: false,
    setsGitHubVariables: false,
    storesProviderSecrets: false,
    promotesLiveRuntime: false,
    treatsFixtureAsReady: false,
    containsSecrets: false,
    containsPrivateResearchMaterial: false,
    exposesProviderPlumbing: false,
    containsCandidateText: false,
  },
}

const markdown = renderMarkdown(packet)
const privateHits = [...scanNoPrivateTerms(packet), ...scanNoPrivateTerms(markdown)]
assert(privateHits.length === 0, `P123 artifact leaked private terms: ${[...new Set(privateHits)].join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const suffix = new Date().toISOString().replace(/[:.]/g, '-')
const jsonPath = join(artifactDir, `operator-assignment-evidence-intake-${suffix}.json`)
const markdownPath = join(artifactDir, `operator-assignment-evidence-intake-${suffix}.md`)
writeFileSync(jsonPath, `${JSON.stringify(packet, null, 2)}\n`)
writeFileSync(markdownPath, markdown)

console.log(JSON.stringify({
  status: packet.status,
  gate: packet.gate,
  selectedGoal: packet.selectedGoal,
  requiredOperatorEvidenceCount: requiredOperatorEvidence.length,
  blockedStageCount: packet.blockedStages.length,
  artifactPath: relative(root, jsonPath),
  markdownArtifactPath: relative(root, markdownPath),
}, null, 2))
