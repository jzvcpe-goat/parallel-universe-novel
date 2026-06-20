#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const targetAssignmentPath = 'deploy/runtime-production/remote-assignment.local.json'
const fixtureAssignmentPath = 'deploy/runtime-production/remote-assignment.fixture.json'

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

function summarize(item) {
  return {
    file: relative(root, item.file),
    gate: item.payload.gate || null,
    status: item.payload.status || null,
    decision: item.payload.decision || null,
    assignmentPath: item.payload.assignmentPath || null,
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

const packageJson = readJson('package.json')
const rootTest = String(packageJson.scripts.test || '')
assert(
  packageJson.scripts['check:operator-return-fixture-isolation'] === 'node scripts/check-operator-return-fixture-isolation.mjs',
  'package.json must expose check:operator-return-fixture-isolation',
)
assert(
  rootTest.includes('npm run check:loop-next-goal-ledger && npm run check:operator-return-fixture-isolation && npm run check:operator-assignment-evidence-intake && npm run check:operator-assignment-evidence-intake-artifact && npm run check:operator-assignment-env-validation-fixture && npm run check:operator-assignment-env-apply-fixture && npm run check:operator-assignment-env-template && npm run check:operator-assignment-env-file-loader && npm run check:operator-assignment-loop-command-consistency && npm run check:operator-assignment-loop-command-consistency-artifact && npm run check:operator-assignment-current-head-coherence && npm run check:operator-assignment-transition-fixture && npm run check:operator-assignment-transition-fixture-artifact && npm run audit:dependencies'),
  'root test must run P122 after P121, then P123/P124/P125/P126/P128/P129/P130/P131/P132/P133, before dependency audit',
)

for (const file of [
  'docs/backend/P120_REMOTE_OPERATOR_RETURN_INTAKE.md',
  'docs/backend/P121_LOOP_NEXT_GOAL_LEDGER.md',
  'docs/backend/P122_OPERATOR_RETURN_FIXTURE_ISOLATION.md',
  'docs/backend/P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE.md',
  'docs/backend/P129_OPERATOR_ASSIGNMENT_ENV_FILE_LOADER.md',
  'docs/backend/P130_OPERATOR_ASSIGNMENT_LOOP_COMMAND_CONSISTENCY.md',
  'docs/backend/P131_OPERATOR_ASSIGNMENT_COMMAND_CONSISTENCY_ARTIFACT_ATTESTATION.md',
  'docs/backend/P132_OPERATOR_ASSIGNMENT_CURRENT_HEAD_COHERENCE.md',
  'scripts/check-remote-operator-return-intake.mjs',
]) {
  assert(existsSync(join(root, file)), `missing P122 prerequisite: ${file}`)
}

const p120Script = read('scripts/check-remote-operator-return-intake.mjs')
assert(
  p120Script.includes('payload.assignmentPath === targetAssignmentPath'),
  'P120 must filter P75 evidence by the local operator assignment path',
)
assert(
  p120Script.includes('assignmentPath: item.payload.assignmentPath || null'),
  'P120 source evidence must expose the selected assignment path for audit',
)

const p122Doc = read('docs/backend/P122_OPERATOR_RETURN_FIXTURE_ISOLATION.md')
for (const term of [
  'P122 Operator Return Fixture Isolation',
  'check:operator-return-fixture-isolation',
  targetAssignmentPath,
  fixtureAssignmentPath,
  'P129',
  'P130',
  'fixture artifact',
]) {
  assert(p122Doc.includes(term), `P122 doc must include ${term}`)
}

const headSha = currentHead()
const sourceWorkspaceNoGit = headSha === 'source-workspace-no-git'
const localP75 = latestArtifact(
  'remote-runtime-assignment-intake-',
  payload => payload.gate === 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE'
    && payload.assignmentPath === targetAssignmentPath,
  'local P75 assignment intake',
)
const fixtureP75 = latestArtifact(
  'remote-runtime-assignment-intake-',
  payload => payload.gate === 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE'
    && payload.assignmentPath === fixtureAssignmentPath,
  'fixture P75 assignment intake',
  { optional: true },
)
const p120 = latestArtifact(
  'remote-operator-return-intake-',
  payload => payload.gate === 'P120_REMOTE_OPERATOR_RETURN_INTAKE'
    && (payload.headSha === headSha || sourceWorkspaceNoGit),
  'current P120 operator return intake',
)
const p121 = latestArtifact(
  'loop-next-goal-ledger-',
  payload => payload.gate === 'P121_LOOP_NEXT_GOAL_LEDGER'
    && payload.status === 'passed'
    && (payload.headSha === headSha || sourceWorkspaceNoGit),
  'current P121 loop next goal ledger',
)

const selectedAssignment = p120.payload.sourceEvidence?.assignmentIntake
assert(selectedAssignment?.gate === 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE', 'P120 must cite P75 assignment intake')
assert(selectedAssignment.assignmentPath === targetAssignmentPath, 'P120 must cite local assignment path, not fixture assignment path')
assert(p120.payload.assignmentDecision === localP75.payload.decision, 'P120 assignment decision must match local P75 evidence')
assert(
  p120.payload.assignmentDecision !== fixtureP75?.payload?.decision
    || localP75.payload.decision === fixtureP75?.payload?.decision,
  'P120 may only match fixture decision when local evidence has the same decision',
)

const p120Decision = p120.payload.decision
const p121Goal = p121.payload.selectedGoal?.id || null
const expectedGoalByDecision = {
  operator_return_waiting_for_assignment: 'operator-assignment-evidence-intake',
  operator_return_waiting_for_health: 'remote-health-evidence-intake',
  operator_return_ready_for_strict_activation: 'strict-live-activation-proof',
}
assert(expectedGoalByDecision[p120Decision], `P122 does not recognize P120 decision ${p120Decision}`)
assert(p121.payload.sourceEvidence?.operatorReturnIntake?.file === relative(root, p120.file), 'P122 requires P121 to reference the current P120 operator return intake')
assert(
  p121Goal === expectedGoalByDecision[p120Decision],
  `P121 selected ${p121Goal}, expected ${expectedGoalByDecision[p120Decision]} for P120 decision ${p120Decision}`,
)

const artifact = {
  version: 1,
  gate: 'P122_OPERATOR_RETURN_FIXTURE_ISOLATION',
  status: 'passed',
  generatedAt: new Date().toISOString(),
  headSha,
  targetAssignmentPath,
  fixtureAssignmentPath,
  p120Decision,
  selectedNextGoal: p121Goal,
  fixtureP75Present: Boolean(fixtureP75),
  fixtureMayBeNewerThanLocal: fixtureP75 ? statSync(fixtureP75.file).mtimeMs > statSync(localP75.file).mtimeMs : false,
  sourceEvidence: {
    localAssignmentIntake: summarize(localP75),
    fixtureAssignmentIntake: fixtureP75 ? summarize(fixtureP75) : null,
    operatorReturnIntake: summarize(p120),
    loopNextGoalLedger: summarize(p121),
  },
  boundary: {
    writesLocalAssignment: false,
    createsRemoteServices: false,
    setsGitHubVariables: false,
    storesProviderSecrets: false,
    promotesLiveRuntime: false,
    treatsFixtureAsReady: false,
  },
}

const privateHits = scanNoPrivateTerms(artifact)
assert(privateHits.length === 0, `P122 artifact leaked private terms: ${privateHits.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `operator-return-fixture-isolation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: artifact.status,
  gate: artifact.gate,
  p120Decision,
  selectedNextGoal: p121Goal,
  fixtureP75Present: artifact.fixtureP75Present,
  fixtureMayBeNewerThanLocal: artifact.fixtureMayBeNewerThanLocal,
  artifactPath: relative(root, artifactPath),
}, null, 2))
