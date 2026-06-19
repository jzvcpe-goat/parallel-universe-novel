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

Target local file: \`${packet.targetAssignmentPath}\`

## Required Operator Evidence

| Env key | Meaning | Public-safe | Validation |
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
  rootTest.includes('npm run check:loop-next-goal-ledger && npm run check:operator-return-fixture-isolation && npm run check:operator-assignment-evidence-intake && npm run audit:dependencies'),
  'root test must run P123 after P121/P122 and before dependency audit',
)

for (const file of [
  'docs/backend/P121_LOOP_NEXT_GOAL_LEDGER.md',
  'docs/backend/P122_OPERATOR_RETURN_FIXTURE_ISOLATION.md',
  'docs/backend/P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE.md',
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
  targetAssignmentPath,
  'REMOTE_OPERATOR_OWNER',
  'REMOTE_API_ORIGIN',
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
  payload => payload.gate === 'P117_REMOTE_ASSIGNMENT_ENV_DRY_RUN_GATE',
  'P117 env dry-run',
)
const p75 = latestArtifact(
  'remote-runtime-assignment-intake-',
  payload => payload.gate === 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE'
    && payload.assignmentPath === targetAssignmentPath,
  'local P75 assignment intake',
)
const p113 = latestArtifact(
  'remote-assignment-image-drift-',
  payload => payload.gate === 'P113_REMOTE_ASSIGNMENT_IMAGE_DRIFT_GATE',
  'P113 image drift',
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
assert(p122.payload.selectedNextGoal === 'operator-assignment-evidence-intake', 'P122 must confirm operator-assignment-evidence-intake')
assert(p120.payload.decision === 'operator_return_waiting_for_assignment', 'P123 requires P120 to still be waiting for operator assignment evidence')
assert(p120.payload.targetAssignmentPath === targetAssignmentPath, 'P120 target assignment path mismatch')
assert(p75.payload.decision === 'remote_assignment_incomplete', 'P75 must still show incomplete local assignment before P123')
assert(p75.payload.assignmentPath === targetAssignmentPath, 'P75 must use the ignored local assignment path')
assert(p117.payload.decision === 'operator_env_not_supplied' || p117.payload.readyForApply === false, 'P117 must not report ready-to-apply operator env while P121 selects assignment intake')
assert(p113.payload.status === 'passed', 'P113 image drift gate must pass before P123')
assert(p113.payload.imageDriftDetected === false, 'P123 requires current local assignment images before operator evidence intake')
assert(p108.payload.trackedLocalAssignments?.length === 0, 'local assignment files must stay untracked')
assert(p105.payload.decision === 'remote_assignment_fill_plan_ready', 'P105 fill plan must be ready')

const requiredOperatorEvidence = [
  {
    env: 'REMOTE_OPERATOR_OWNER',
    label: 'deployment owner or accountable team',
    publicSafe: true,
    validation: 'non-empty, no whitespace, not placeholder',
  },
  {
    env: 'REMOTE_OPERATOR_PROVIDER',
    label: 'hosting provider name',
    publicSafe: true,
    validation: 'non-empty, no whitespace, not placeholder',
  },
  {
    env: 'REMOTE_API_SERVICE_ID',
    label: 'FastAPI provider service id',
    publicSafe: true,
    validation: 'non-empty provider id, not a secret',
  },
  {
    env: 'REMOTE_AGENT_SERVICE_ID',
    label: 'Agent Runtime provider service id',
    publicSafe: true,
    validation: 'non-empty provider id, not a secret',
  },
  {
    env: 'REMOTE_API_ORIGIN',
    label: 'FastAPI HTTPS origin',
    publicSafe: true,
    validation: 'remote https origin, no path, no localhost, no placeholder',
  },
  {
    env: 'REMOTE_AGENT_ORIGIN',
    label: 'Agent Runtime HTTPS origin',
    publicSafe: true,
    validation: 'remote https origin, distinct from API origin',
  },
  {
    env: 'REMOTE_API_SECRETS_CONFIGURED',
    label: 'FastAPI provider-side secret-store confirmation',
    publicSafe: true,
    validation: 'exactly true after provider-side secrets exist',
  },
  {
    env: 'REMOTE_AGENT_SECRETS_CONFIGURED',
    label: 'Agent Runtime provider-side secret-store confirmation',
    publicSafe: true,
    validation: 'exactly true after provider-side secrets exist',
  },
]

const nextCommands = [
  'npm run check:remote-assignment-env-dry-run',
  'REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true npm run apply:remote-assignment-env',
  'npm run check:remote-runtime-assignment-intake',
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
  targetAssignmentPath,
  requiredOperatorEvidence,
  blockedStages: Array.isArray(p120.payload.blockedStages) ? p120.payload.blockedStages : [],
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
