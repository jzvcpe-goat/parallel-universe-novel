#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')
const envFileRel = 'deploy/runtime-production/remote-assignment.env.local'

const expectedAssignmentCommands = [
  `REMOTE_ASSIGNMENT_ENV_FILE=${envFileRel} REQUIRE_REMOTE_ASSIGNMENT_ENV_DRY_RUN_READY=true npm run check:remote-assignment-env-dry-run`,
  `REMOTE_ASSIGNMENT_ENV_FILE=${envFileRel} REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true npm run apply:remote-assignment-env`,
  'npm run check:remote-runtime-assignment-intake',
  'npm run check:remote-operator-return-intake',
  'npm run check:loop-next-goal-ledger',
]

const forbiddenLegacyFragments = [
  'REMOTE_ASSIGNMENT_ENV_APPLY=true',
  'REMOTE_ASSIGNMENT_ENV_FILE=deploy/runtime-production/remote-assignment.env.example',
]

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

function assertIncludes(file, terms) {
  const body = read(file)
  for (const term of terms) assert(body.includes(term), `${file} must include ${term}`)
}

function normalizeCommandSurface(text) {
  return String(text).replace(/\\\r?\n/g, ' ').replace(/\s+/g, ' ').trim()
}

function assertCommandSurfaceIncludes(file, commands) {
  const normalized = normalizeCommandSurface(read(file))
  for (const command of commands) {
    assert(normalized.includes(command), `${file} must include command ${command}`)
  }
}

function assertExcludes(file, terms) {
  const normalized = normalizeCommandSurface(read(file))
  for (const term of terms) {
    assert(!normalized.includes(term), `${file} must not include legacy command fragment ${term}`)
  }
}

function latestArtifact(prefix, predicate = null, label = prefix) {
  assert(existsSync(artifactDir), 'runtime artifact directory is missing; run npm run check:loop-next-goal-ledger first')
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
  packageJson.scripts['check:operator-assignment-loop-command-consistency'] === 'node scripts/check-operator-assignment-loop-command-consistency.mjs',
  'package.json must expose check:operator-assignment-loop-command-consistency',
)
assert(
  packageJson.scripts['check:operator-assignment-loop-command-consistency-artifact'] === 'node scripts/check-operator-assignment-loop-command-consistency-artifact.mjs',
  'package.json must expose check:operator-assignment-loop-command-consistency-artifact',
)
assert(
  rootTest.includes('npm run check:operator-assignment-env-file-loader && npm run check:operator-assignment-loop-command-consistency && npm run check:operator-assignment-loop-command-consistency-artifact && npm run check:operator-assignment-current-head-coherence && npm run audit:dependencies'),
  'root test must run P130 after P129, then P131 and P132 before dependency audit',
)

for (const file of [
  'docs/backend/P121_LOOP_NEXT_GOAL_LEDGER.md',
  'docs/backend/P118_REMOTE_ASSIGNMENT_STRICT_RUN_PACKAGE.md',
  'docs/backend/P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE.md',
  'docs/backend/P129_OPERATOR_ASSIGNMENT_ENV_FILE_LOADER.md',
  'docs/backend/P130_OPERATOR_ASSIGNMENT_LOOP_COMMAND_CONSISTENCY.md',
  'docs/backend/P131_OPERATOR_ASSIGNMENT_COMMAND_CONSISTENCY_ARTIFACT_ATTESTATION.md',
  'docs/backend/P132_OPERATOR_ASSIGNMENT_CURRENT_HEAD_COHERENCE.md',
  'scripts/check-operator-assignment-loop-command-consistency-artifact.mjs',
  'scripts/check-operator-assignment-current-head-coherence.mjs',
  'scripts/check-remote-assignment-strict-run-package.mjs',
  'scripts/check-remote-operator-readiness-packet.mjs',
  'docs/design-system/DEVELOPMENT_NOTES.md',
  'scripts/check-loop-next-goal-ledger.mjs',
  'scripts/check-remote-assignment-env-dry-run.mjs',
  'scripts/apply-remote-assignment-env.mjs',
  'deploy/runtime-production/remote-assignment.env.example',
]) {
  assert(existsSync(join(root, file)), `missing P130 prerequisite: ${file}`)
}

assertIncludes('docs/backend/P130_OPERATOR_ASSIGNMENT_LOOP_COMMAND_CONSISTENCY.md', [
  'P130 Operator Assignment Loop Command Consistency',
  'check:operator-assignment-loop-command-consistency',
  'check:operator-assignment-loop-command-consistency-artifact',
  'P121',
  'P123',
  'P129',
  'P131',
  'P132',
  'REMOTE_ASSIGNMENT_ENV_FILE',
  'REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true',
  'REQUIRE_REMOTE_ASSIGNMENT_ENV_DRY_RUN_READY=true',
])
assertIncludes('docs/backend/P131_OPERATOR_ASSIGNMENT_COMMAND_CONSISTENCY_ARTIFACT_ATTESTATION.md', [
  'P131 Operator Assignment Command Consistency Artifact Attestation',
  'check:operator-assignment-loop-command-consistency-artifact',
  'operator-assignment-loop-command-consistency',
  'P130_OPERATOR_ASSIGNMENT_LOOP_COMMAND_CONSISTENCY',
])
assertIncludes('docs/backend/P121_LOOP_NEXT_GOAL_LEDGER.md', [
  'P130',
])
assertCommandSurfaceIncludes('docs/backend/P121_LOOP_NEXT_GOAL_LEDGER.md', expectedAssignmentCommands)
assertCommandSurfaceIncludes('docs/backend/P118_REMOTE_ASSIGNMENT_STRICT_RUN_PACKAGE.md', expectedAssignmentCommands.slice(0, 2))
assertIncludes('docs/backend/P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE.md', ['P130'])
assertCommandSurfaceIncludes('docs/backend/P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE.md', expectedAssignmentCommands)
assertIncludes('docs/backend/P129_OPERATOR_ASSIGNMENT_ENV_FILE_LOADER.md', ['P130'])
assertCommandSurfaceIncludes('docs/backend/P129_OPERATOR_ASSIGNMENT_ENV_FILE_LOADER.md', expectedAssignmentCommands)
assertCommandSurfaceIncludes('scripts/check-remote-assignment-strict-run-package.mjs', expectedAssignmentCommands.slice(0, 2))
assertCommandSurfaceIncludes('scripts/check-remote-operator-readiness-packet.mjs', expectedAssignmentCommands.slice(0, 2))
assertIncludes('docs/design-system/DEVELOPMENT_NOTES.md', [
  'P130 Operator Assignment Loop Command Consistency',
  'check:operator-assignment-loop-command-consistency',
])

for (const file of [
  'docs/backend/P121_LOOP_NEXT_GOAL_LEDGER.md',
  'docs/backend/P118_REMOTE_ASSIGNMENT_STRICT_RUN_PACKAGE.md',
  'docs/backend/P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE.md',
  'docs/backend/P129_OPERATOR_ASSIGNMENT_ENV_FILE_LOADER.md',
  'scripts/check-loop-next-goal-ledger.mjs',
  'scripts/check-operator-assignment-evidence-intake.mjs',
  'scripts/check-remote-assignment-strict-run-package.mjs',
  'scripts/check-remote-operator-readiness-packet.mjs',
]) {
  assertExcludes(file, forbiddenLegacyFragments)
}

const p118 = latestArtifact(
  'remote-assignment-strict-run-package-',
  payload => payload.gate === 'P118_REMOTE_ASSIGNMENT_STRICT_RUN_PACKAGE',
  'P118 strict-run package',
)
const headSha = currentHead()
const sourceWorkspaceNoGit = headSha === 'source-workspace-no-git'
const p119 = latestArtifact(
  'remote-operator-readiness-packet-',
  payload => payload.gate === 'P119_REMOTE_OPERATOR_READINESS_PACKET'
    && (payload.headSha === headSha || sourceWorkspaceNoGit),
  'current P119 operator readiness packet',
)
const p121 = latestArtifact(
  'loop-next-goal-ledger-',
  payload => payload.gate === 'P121_LOOP_NEXT_GOAL_LEDGER'
    && payload.selectedGoal?.id === 'operator-assignment-evidence-intake'
    && (payload.headSha === headSha || sourceWorkspaceNoGit)
    && payload.sourceEvidence?.operatorReadinessPacket?.file === relative(root, p119.file),
  'current P121 operator-assignment ledger',
)
for (const [label, artifact] of [['P118', p118], ['P119', p119]]) {
  const normalized = normalizeCommandSurface(JSON.stringify(artifact.payload))
  for (const command of expectedAssignmentCommands.slice(0, 2)) {
    assert(normalized.includes(command), `${label} artifact missing expected command: ${command}`)
  }
  for (const fragment of forbiddenLegacyFragments) {
    assert(!normalized.includes(fragment), `${label} artifact includes legacy command fragment: ${fragment}`)
  }
}
const actualCommands = p121.payload.selectedGoal?.acceptanceGates || []
for (const command of expectedAssignmentCommands) {
  assert(actualCommands.includes(command), `P121 artifact missing expected command: ${command}`)
}
for (const fragment of forbiddenLegacyFragments) {
  assert(!actualCommands.some(command => command.includes(fragment)), `P121 artifact includes legacy command fragment: ${fragment}`)
}

const payload = {
  version: 1,
  gate: 'P130_OPERATOR_ASSIGNMENT_LOOP_COMMAND_CONSISTENCY',
  status: 'passed',
  generatedAt: new Date().toISOString(),
  checkedGoal: p121.payload.selectedGoal.id,
  sourceStrictRunArtifact: relative(root, p118.file),
  sourceReadinessPacketArtifact: relative(root, p119.file),
  sourceLedgerArtifact: relative(root, p121.file),
  commandCount: expectedAssignmentCommands.length,
  legacyFragmentCount: forbiddenLegacyFragments.length,
  boundaries: {
    writesLocalAssignment: false,
    createsRemoteServices: false,
    setsGitHubVariables: false,
    storesProviderSecrets: false,
    promotesLiveRuntime: false,
    emitsConcreteServiceIds: false,
    emitsConcreteOrigins: false,
    emitsPromptPlumbing: false,
    emitsPrivateTitleMaterial: false,
  },
}

const privateHits = scanNoPrivateTerms(payload)
assert(privateHits.length === 0, `P130 artifact leaked private terms: ${privateHits.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `operator-assignment-loop-command-consistency-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(payload, null, 2)}\n`)

console.log(JSON.stringify({
  status: 'passed',
  gate: payload.gate,
  checkedGoal: payload.checkedGoal,
  commandCount: payload.commandCount,
  artifactPath: relative(root, artifactPath),
}, null, 2))
