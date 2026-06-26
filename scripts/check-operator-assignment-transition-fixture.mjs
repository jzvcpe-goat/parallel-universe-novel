#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'
const transitionAssignmentRel = 'artifacts/runtime/operator-assignment-transition-fixture.local.json'
const transitionAssignmentPath = join(root, transitionAssignmentRel)
const transitionEnvRel = 'deploy/runtime-production/remote-assignment.transition.env.local'
const transitionEnvPath = join(root, transitionEnvRel)
const productionAssignmentPath = join(root, 'deploy/runtime-production/remote-assignment.local.json')

const transitionEnv = {
  REMOTE_OPERATOR_OWNER: 'p133-owner',
  REMOTE_OPERATOR_PROVIDER: 'p133-paas',
  REMOTE_RUNTIME_ENVIRONMENT: 'preview',
  REMOTE_API_SERVICE_ID: 'p133-api-service',
  REMOTE_AGENT_SERVICE_ID: 'p133-agent-service',
  REMOTE_API_ORIGIN: 'https://api.p133-transition.test',
  REMOTE_AGENT_ORIGIN: 'https://agent.p133-transition.test',
  REMOTE_API_SECRETS_CONFIGURED: 'true',
  REMOTE_AGENT_SECRETS_CONFIGURED: 'true',
}

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

function fingerprint(path) {
  if (!existsSync(path)) return null
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function runJson(command, args, env = {}, timeout = 30000) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: {
      ...process.env,
      ...env,
    },
    encoding: 'utf8',
    timeout,
  })
  if (result.status !== 0) {
    throw new Error(`${args.join(' ')} failed: ${result.stderr || result.stdout}`)
  }
  const start = result.stdout.indexOf('{')
  assert(start >= 0, `${args.join(' ')} did not return JSON`)
  return JSON.parse(result.stdout.slice(start))
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
  const body = read(file)
  for (const term of terms) assert(body.includes(term), `${file} must include ${term}`)
}

function cleanup() {
  for (const path of [transitionAssignmentPath, transitionEnvPath]) {
    if (existsSync(path)) unlinkSync(path)
  }
}

process.on('exit', cleanup)

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:operator-assignment-transition-fixture'] === 'node scripts/check-operator-assignment-transition-fixture.mjs',
  'package.json must expose check:operator-assignment-transition-fixture',
)
assert(
  packageJson.scripts['check:operator-assignment-transition-fixture-artifact'] === 'node scripts/check-operator-assignment-transition-fixture-artifact.mjs',
  'package.json must expose check:operator-assignment-transition-fixture-artifact',
)
assert(
  String(packageJson.scripts.test || '').includes('npm run check:operator-assignment-current-head-coherence && npm run check:operator-assignment-transition-fixture && npm run check:operator-assignment-transition-fixture-artifact && npm run audit:dependencies'),
  'root test must run P133 after P132 and before dependency audit',
)

for (const file of [
  'docs/backend/P121_LOOP_NEXT_GOAL_LEDGER.md',
  'docs/backend/P133_OPERATOR_ASSIGNMENT_TRANSITION_FIXTURE.md',
  'docs/backend/P116_REMOTE_ASSIGNMENT_ENV_APPLY_GATE.md',
  'docs/backend/P117_REMOTE_ASSIGNMENT_ENV_DRY_RUN_GATE.md',
  'docs/backend/P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE.md',
  'scripts/check-remote-assignment-env-dry-run.mjs',
  'scripts/apply-remote-assignment-env.mjs',
  'scripts/check-remote-runtime-assignment-intake.mjs',
  'deploy/runtime-production/remote-assignment.example.json',
  '.github/workflows/pages.yml',
]) {
  assert(existsSync(join(root, file)), `missing P133 prerequisite: ${file}`)
}

assertIncludes('docs/backend/P133_OPERATOR_ASSIGNMENT_TRANSITION_FIXTURE.md', [
  'P133 Operator Assignment Transition Fixture',
  'check:operator-assignment-transition-fixture',
  'check:operator-assignment-transition-fixture-artifact',
  'remote-health-evidence-intake',
  'does not write production',
])
assertIncludes('docs/backend/P121_LOOP_NEXT_GOAL_LEDGER.md', [
  'P133',
  'remote-health-evidence-intake',
])
assertIncludes('.github/workflows/pages.yml', [
  'Upload operator assignment transition fixture',
  'operator-assignment-transition-fixture',
  'Check operator assignment transition fixture artifact content',
])

const headSha = currentHead()
assert(headSha !== 'source-workspace-no-git', 'P133 requires git head in release repo mode')

const currentP121 = latestArtifact(
  'loop-next-goal-ledger-',
  payload => payload.gate === 'P121_LOOP_NEXT_GOAL_LEDGER'
    && (payload.headSha === headSha || !payload.headSha),
  'current P121 loop next-goal ledger',
)
if (currentP121.payload.selectedGoal?.id !== 'operator-assignment-evidence-intake') {
  const artifact = {
    version: 1,
    gate: 'P133_OPERATOR_ASSIGNMENT_TRANSITION_FIXTURE',
    status: 'skipped_not_current_goal',
    generatedAt: new Date().toISOString(),
    repository: repo,
    headSha,
    selectedGoal: currentP121.payload.selectedGoal?.id || null,
    reason: 'P121 has advanced beyond operator-assignment-evidence-intake',
    sourceEvidence: {
      loopNextGoalLedger: {
        file: relative(root, currentP121.file),
        selectedGoal: currentP121.payload.selectedGoal?.id || null,
      },
    },
    transition: {
      expectedNextGoalAfterOperatorReturn: 'not-required-current-goal-advanced',
    },
    boundary: {
      writesProductionAssignment: false,
      temporaryAssignmentOnly: false,
      temporaryEnvOnly: false,
      tempFilesRemoved: true,
      createsRemoteServices: false,
      setsGitHubVariables: false,
      storesProviderSecrets: false,
      promotesLiveRuntime: false,
      treatsFixtureAsReady: false,
      valuesIncluded: false,
    },
  }
  const privateHits = scanNoPrivateTerms(artifact)
  assert(privateHits.length === 0, `P133 artifact leaked private terms: ${privateHits.join(', ')}`)
  mkdirSync(artifactDir, { recursive: true })
  const artifactPath = join(artifactDir, `operator-assignment-transition-fixture-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)
  console.log(JSON.stringify({
    status: artifact.status,
    gate: artifact.gate,
    selectedGoal: artifact.selectedGoal,
    artifactPath: relative(root, artifactPath),
  }, null, 2))
  process.exit(0)
}

const productionBefore = fingerprint(productionAssignmentPath)
cleanup()
mkdirSync(artifactDir, { recursive: true })
writeFileSync(transitionAssignmentPath, read('deploy/runtime-production/remote-assignment.example.json'))
writeFileSync(
  transitionEnvPath,
  `${Object.entries(transitionEnv).map(([key, value]) => `${key}=${value}`).join('\n')}\n`,
)

const baseEnv = {
  REMOTE_ASSIGNMENT_ENV_FILE: transitionEnvRel,
  REMOTE_RUNTIME_ASSIGNMENT_FILE: transitionAssignmentRel,
  REMOTE_ASSIGNMENT_HEALTH_TIMEOUT_MS: '500',
}

const p117 = runJson(process.execPath, ['scripts/check-remote-assignment-env-dry-run.mjs'], {
  ...baseEnv,
  REQUIRE_REMOTE_ASSIGNMENT_ENV_DRY_RUN_READY: 'true',
})
assert(p117.status === 'passed_operator_env_ready', 'P133 P117 transition dry-run must be ready')
assert(p117.readyForApply === true, 'P133 P117 transition dry-run must be ready for P116')

const p116 = runJson(process.execPath, ['scripts/apply-remote-assignment-env.mjs'], {
  ...baseEnv,
  REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM: 'true',
})
assert(p116.status === 'passed', 'P133 P116 transition apply must pass')
assert(p116.mode === 'applied', 'P133 P116 transition apply must use applied mode')
assert(p116.targetPath === transitionAssignmentRel, 'P133 P116 transition apply must target temporary assignment')

const p75 = runJson(process.execPath, ['scripts/check-remote-runtime-assignment-intake.mjs'], baseEnv, 35000)
assert(p75.status === 'passed_with_assignment_blockers', 'P133 P75 transition fixture must keep blockers')
assert(p75.decision === 'remote_assignment_pending_health', 'P133 P75 transition fixture must move to pending health')
assert(p75.blockedStages.includes('api-health-ready'), 'P133 transition fixture must block API health')
assert(p75.blockedStages.includes('agent-health-ready'), 'P133 transition fixture must block Agent health')

const p121Source = read('scripts/check-loop-next-goal-ledger.mjs')
assert(
  p121Source.includes("decision === 'operator_return_waiting_for_health'")
    && p121Source.includes("id: 'remote-health-evidence-intake'"),
  'P121 must route operator_return_waiting_for_health to remote-health-evidence-intake',
)

const applied = JSON.parse(readFileSync(transitionAssignmentPath, 'utf8'))
assert(applied.services.api.image.endsWith(`:${headSha}`), 'P133 applied API image must use current head')
assert(applied.services.agent.image.endsWith(`:${headSha}`), 'P133 applied Agent image must use current head')
assert(applied.services.api.providerSecretsConfigured === true, 'P133 applied API provider-secret flag must be true')
assert(applied.services.agent.providerSecretsConfigured === true, 'P133 applied Agent provider-secret flag must be true')
assert(applied.pagesVariablesAfterHealth.VITE_PUBLIC_RUNTIME_MODE === 'live', 'P133 applied assignment must describe post-health live mode')

const productionAfter = fingerprint(productionAssignmentPath)
assert(productionBefore === productionAfter, 'P133 must not modify production remote-assignment.local.json')

const p117Artifact = latestArtifact(
  'remote-assignment-env-dry-run-',
  payload => payload.gate === 'P117_REMOTE_ASSIGNMENT_ENV_DRY_RUN_GATE'
    && payload.currentHead === headSha
    && payload.targetPath === 'deploy/runtime-production/remote-assignment.local.json'
    && payload.decision === 'operator_env_ready_for_p116_apply',
  'P133 generated P117 transition artifact',
)
const p116Artifact = latestArtifact(
  'remote-assignment-env-apply-',
  payload => payload.gate === 'P116_REMOTE_ASSIGNMENT_ENV_APPLY_GATE'
    && payload.currentHead === headSha
    && payload.targetPath === transitionAssignmentRel
    && payload.mode === 'applied',
  'P133 generated P116 transition artifact',
)
const p75Artifact = latestArtifact(
  'remote-runtime-assignment-intake-',
  payload => payload.gate === 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE'
    && payload.assignmentPath === transitionAssignmentRel
    && payload.decision === 'remote_assignment_pending_health',
  'P133 generated P75 transition artifact',
)

cleanup()
const tempFilesRemoved = !existsSync(transitionAssignmentPath) && !existsSync(transitionEnvPath)
assert(tempFilesRemoved, 'P133 temporary assignment and env files must be removed')

const artifact = {
  version: 1,
  gate: 'P133_OPERATOR_ASSIGNMENT_TRANSITION_FIXTURE',
  status: 'passed',
  generatedAt: new Date().toISOString(),
  repository: repo,
  headSha,
  transition: {
    p117Decision: p117.decision,
    p116Mode: p116.mode,
    p75Decision: p75.decision,
    expectedNextGoalAfterOperatorReturn: 'remote-health-evidence-intake',
  },
  sourceEvidence: {
    envDryRun: {
      file: relative(root, p117Artifact.file),
      gate: p117Artifact.payload.gate,
      status: p117Artifact.payload.status,
      decision: p117Artifact.payload.decision,
    },
    envApply: {
      file: relative(root, p116Artifact.file),
      gate: p116Artifact.payload.gate,
      status: p116Artifact.payload.status,
      mode: p116Artifact.payload.mode,
    },
    assignmentIntake: {
      file: relative(root, p75Artifact.file),
      gate: p75Artifact.payload.gate,
      status: p75Artifact.payload.status || null,
      decision: p75Artifact.payload.decision,
      blockedStages: p75Artifact.payload.blockedStages,
    },
  },
  boundary: {
    writesProductionAssignment: false,
    temporaryAssignmentOnly: true,
    temporaryEnvOnly: true,
    tempFilesRemoved,
    createsRemoteServices: false,
    setsGitHubVariables: false,
    storesProviderSecrets: false,
    promotesLiveRuntime: false,
    treatsFixtureAsReady: false,
    valuesIncluded: false,
  },
}

const privateHits = scanNoPrivateTerms(artifact)
assert(privateHits.length === 0, `P133 artifact leaked private terms: ${privateHits.join(', ')}`)

const artifactPath = join(artifactDir, `operator-assignment-transition-fixture-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: artifact.status,
  gate: artifact.gate,
  headSha,
  transition: artifact.transition,
  tempFilesRemoved,
  artifactPath: relative(root, artifactPath),
}, null, 2))
