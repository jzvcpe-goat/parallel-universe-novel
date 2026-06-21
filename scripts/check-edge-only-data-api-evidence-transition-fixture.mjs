#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'
const gate = 'P148_EDGE_ONLY_DATA_API_EVIDENCE_TRANSITION_FIXTURE'
const fixtureEnvRel = 'deploy/runtime-production/runtime-assignment.p148.intent.env.local'
const fixtureEnvPath = join(root, fixtureEnvRel)
const generatedDir = join(root, 'deploy/runtime-production/generated')
const runtimeIntentPath = join(root, 'deploy/runtime-production/runtime-assignment.intent.local.json')
const pathsToRestore = [
  fixtureEnvPath,
  runtimeIntentPath,
  join(generatedDir, 'remote-assignment.contract.json'),
  join(generatedDir, 'remote-assignment.legacy.env'),
  join(generatedDir, 'operator-assignment-evidence.md'),
  join(generatedDir, 'loop-next-goal-ledger.patch.json'),
  join(generatedDir, 'remote-health-evidence.request.json'),
  join(generatedDir, 'remote-health-evidence.result.json'),
]

const fixture = {
  owner: 'p148-owner',
  provider: 'github-pages-supabase-managed',
  projectRef: 'p148edgehealth',
  origin: 'https://p148edgehealth.supabase.co',
  table: 'health_probe',
  probeId: 'reader',
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

function snapshot(paths) {
  return new Map(paths.map(path => [
    path,
    existsSync(path) ? readFileSync(path) : null,
  ]))
}

function restore(backups) {
  for (const [path, content] of backups.entries()) {
    if (content == null) {
      if (existsSync(path)) rmSync(path, { force: true })
      continue
    }
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
  }
}

function scanNoPrivateTerms(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL=(?!<)/,
    /postgres(ql)?:\/\/[^<]/i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/i,
    /SUPABASE_SERVICE_ROLE/i,
    /SERVICE_ROLE_KEY/i,
    /SUPABASE_SECRET_KEY/i,
    /SUPABASE_WRITER_PASSWORD/i,
    /OPENAI_API_KEY/i,
    /DEEPSEEK_API_KEY/i,
    /MOONSHOT_API_KEY/i,
    /KIMI_API_KEY/i,
    /ANTHROPIC_API_KEY/i,
    /NARRATIVEOS_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/i,
    /MASTRA_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/i,
    /Authorization:\s*Bearer/i,
    /system prompt/i,
    /provider prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
    /sourceRefs/i,
    /source_refs/i,
    /profile\.id/i,
    /kernel\.id/i,
    /prompt_id/i,
    /prompt_version/i,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(String)
}

function run(command, args, env = {}, timeout = 60000) {
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
    throw new Error(`${command} ${args.join(' ')} failed:\n${result.stderr || result.stdout}`)
  }
  return result.stdout
}

function runJson(command, args, env = {}, timeout = 60000) {
  const stdout = run(command, args, env, timeout)
  const start = stdout.indexOf('{')
  assert(start >= 0, `${command} ${args.join(' ')} did not return JSON`)
  return JSON.parse(stdout.slice(start))
}

function latestArtifact(prefix, predicate, label = prefix) {
  assert(existsSync(artifactDir), `runtime artifact directory is missing while looking for ${label}`)
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .map(name => join(artifactDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)

  for (const file of files) {
    const payload = JSON.parse(readFileSync(file, 'utf8'))
    if (!predicate || predicate(payload)) return { file, payload }
  }
  throw new Error(`missing artifact for ${label}`)
}

function writeFixtureEnv() {
  mkdirSync(dirname(fixtureEnvPath), { recursive: true })
  writeFileSync(
    fixtureEnvPath,
    [
      `RUNTIME_ASSIGNMENT_OPERATOR_OWNER=${fixture.owner}`,
      `RUNTIME_ASSIGNMENT_OPERATOR_PROVIDER=${fixture.provider}`,
      'RUNTIME_ASSIGNMENT_FRONTEND_PROVIDER=github-pages',
      'RUNTIME_ASSIGNMENT_FRONTEND_SERVICE_ID=jzvcpe-goat/parallel-universe-novel',
      'RUNTIME_ASSIGNMENT_FRONTEND_ORIGIN=https://jzvcpe-goat.github.io',
      'RUNTIME_ASSIGNMENT_FRONTEND_URL=https://jzvcpe-goat.github.io/parallel-universe-novel/',
      'RUNTIME_ASSIGNMENT_FRONTEND_CONFIGURED=true',
      'RUNTIME_ASSIGNMENT_DATA_API_PROVIDER=supabase',
      `RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID=${fixture.projectRef}`,
      `RUNTIME_ASSIGNMENT_DATA_API_ORIGIN=${fixture.origin}`,
      'RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED=true',
      `RUNTIME_ASSIGNMENT_DATA_PROBE_TABLE=${fixture.table}`,
      `RUNTIME_ASSIGNMENT_DATA_PROBE_ID=${fixture.probeId}`,
      '',
    ].join('\n'),
  )
}

function writeFixtureHealthResult(contract) {
  const now = new Date().toISOString()
  const health = {
    status: 'ok',
    checked_at: now,
    runtime_mode: 'edge-only',
    data_api: {
      provider: contract.topology.data_api.provider,
      origin: contract.topology.data_api.origin,
      table: contract.health.data_probe_table,
      probe: {
        id: contract.health.data_probe_id,
        status: 'ok',
        updated_at: now,
      },
    },
    remote_agent: {
      required: false,
      evidence: 'not-required-edge-only',
    },
  }
  const hits = scanNoPrivateTerms(health)
  assert(hits.length === 0, `fixture health result leaked private terms: ${hits.join(', ')}`)
  writeFileSync(join(generatedDir, 'remote-health-evidence.result.json'), `${JSON.stringify(health, null, 2)}\n`)
}

const requiredFiles = [
  'docs/backend/P142_EDGE_ONLY_DATA_API_EVIDENCE_INTAKE.md',
  'docs/backend/P145_REMOTE_HEALTH_EVIDENCE_ARTIFACT_GATE.md',
  'docs/backend/P146_EDGE_ONLY_INTENT_ENV_TEMPLATE_GATE.md',
  'docs/backend/P147_EDGE_ONLY_OPERATOR_EVIDENCE_PACKET.md',
  'scripts/prepare-runtime-assignment-intent.mjs',
  'scripts/remote-assignment/compile-runtime-assignment.mjs',
  'scripts/check-remote-runtime-assignment-intake.mjs',
  'scripts/check-remote-health-evidence-artifact.mjs',
  '.gitignore',
]

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `missing P148 prerequisite: ${file}`)
}

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:edge-only-data-api-evidence-transition-fixture'] === 'node scripts/check-edge-only-data-api-evidence-transition-fixture.mjs',
  'package.json must expose check:edge-only-data-api-evidence-transition-fixture',
)
assert(
  packageJson.scripts['check:edge-only-data-api-evidence-transition-fixture-artifact'] === 'node scripts/check-edge-only-data-api-evidence-transition-fixture-artifact.mjs',
  'package.json must expose check:edge-only-data-api-evidence-transition-fixture-artifact',
)
assert(
  String(packageJson.scripts.test || '').includes('npm run check:edge-only-data-api-evidence-transition-fixture'),
  'root test must include check:edge-only-data-api-evidence-transition-fixture',
)
assert(
  read('.gitignore').includes('deploy/runtime-production/runtime-assignment.*.intent.env.local'),
  'P148 fixture env file must be covered by .gitignore wildcard',
)

for (const term of [
  'P148 Edge-Only Data API Evidence Transition Fixture',
  'check:edge-only-data-api-evidence-transition-fixture',
  'check:edge-only-data-api-evidence-transition-fixture-artifact',
  'fixture-only',
  'remote_assignment_ready',
]) {
  assert(read('docs/backend/P148_EDGE_ONLY_DATA_API_EVIDENCE_TRANSITION_FIXTURE.md').includes(term), `P148 doc must include ${term}`)
}

const headSha = currentHead()
assert(headSha !== 'source-workspace-no-git', 'P148 requires git head in release repo mode')
mkdirSync(artifactDir, { recursive: true })
const backups = snapshot(pathsToRestore)
const productionFingerprintsBefore = Object.fromEntries(pathsToRestore.map(path => [relative(root, path), fingerprint(path)]))
let restored = false

try {
  writeFixtureEnv()
  runJson(process.execPath, ['scripts/prepare-runtime-assignment-intent.mjs'], {
    RUNTIME_ASSIGNMENT_INTENT_ENV_FILE: fixtureEnvRel,
    RUNTIME_ASSIGNMENT_INTENT_FORCE: 'true',
  })

  run('npm', ['run', 'remote-assignment:prepare'])

  const contract = JSON.parse(readFileSync(join(generatedDir, 'remote-assignment.contract.json'), 'utf8'))
  assert(contract.runtime_mode === 'edge-only', 'P148 compiled contract must be edge-only')
  assert(contract.topology.data_api.service_id === fixture.projectRef, 'P148 data API service id mismatch')
  assert(contract.topology.data_api.origin === fixture.origin, 'P148 data API origin mismatch')
  assert(contract.topology.data_api.secrets_configured === true, 'P148 data API configured flag mismatch')
  assert(contract.topology.agent.remote_required === false, 'P148 contract must not require remote Agent')
  assert(contract.secret_boundary?.cloud_ai_api_keys_allowed === false, 'P148 contract must keep cloud AI keys out of frontend')

  const ledgerPatch = JSON.parse(readFileSync(join(generatedDir, 'loop-next-goal-ledger.patch.json'), 'utf8'))
  assert(ledgerPatch.next_step === 'remote-health-evidence-intake', 'P148 ledger patch must advance to remote-health-evidence-intake')

  const pendingIntake = runJson(process.execPath, ['scripts/check-remote-runtime-assignment-intake.mjs'])
  assert(pendingIntake.decision === 'remote_assignment_pending_health', 'P148 must first stop at pending Data API health')
  assert(pendingIntake.blockedStages.length === 1 && pendingIntake.blockedStages[0] === 'data-api-health-ready', 'P148 pending state must only block on data-api-health-ready')
  const pendingP75Artifact = latestArtifact(
    'remote-runtime-assignment-intake-',
    payload => payload.gate === 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE'
      && payload.assignmentSource === 'runtime-assignment-compiler'
      && payload.runtimeMode === 'edge-only'
      && payload.decision === 'remote_assignment_pending_health'
      && payload.blockedStages?.includes('data-api-health-ready'),
    'P148 pending P75 artifact',
  )

  writeFixtureHealthResult(contract)

  const strictHealth = runJson(process.execPath, ['scripts/check-remote-health-evidence-artifact.mjs'], {
    REQUIRE_REMOTE_HEALTH_EVIDENCE_READY: 'true',
  })
  assert(strictHealth.status === 'passed', 'P148 strict P145 health gate must pass with fixture result')
  assert(strictHealth.healthReady === true, 'P148 strict P145 health gate must be healthReady=true')
  const strictP145Artifact = latestArtifact(
    'remote-health-evidence-attestation-',
    payload => payload.gate === 'P145_REMOTE_HEALTH_EVIDENCE_ARTIFACT_GATE'
      && payload.status === 'passed'
      && payload.healthReady === true
      && payload.dataApi?.origin === fixture.origin,
    'P148 strict P145 artifact',
  )

  const readyIntake = runJson(process.execPath, ['scripts/check-remote-runtime-assignment-intake.mjs'])
  assert(readyIntake.decision === 'remote_assignment_ready', 'P148 must prove Data API health result makes P75 ready')
  assert(Array.isArray(readyIntake.blockedStages) && readyIntake.blockedStages.length === 0, 'P148 ready P75 artifact must have no blockers')
  const readyP75Artifact = latestArtifact(
    'remote-runtime-assignment-intake-',
    payload => payload.gate === 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE'
      && payload.assignmentSource === 'runtime-assignment-compiler'
      && payload.runtimeMode === 'edge-only'
      && payload.decision === 'remote_assignment_ready',
    'P148 ready P75 artifact',
  )

  restore(backups)
  restored = true

  const waitingHealth = runJson(process.execPath, ['scripts/check-remote-health-evidence-artifact.mjs'])
  assert(waitingHealth.status === 'waiting_for_remote_health_evidence', 'P148 cleanup must restore latest P145 to waiting mode')
  assert(waitingHealth.healthReady === false, 'P148 cleanup waiting P145 must have healthReady=false')
  const waitingP145Artifact = latestArtifact(
    'remote-health-evidence-attestation-',
    payload => payload.gate === 'P145_REMOTE_HEALTH_EVIDENCE_ARTIFACT_GATE'
      && payload.status === 'waiting_for_remote_health_evidence'
      && payload.healthReady === false,
    'P148 restored waiting P145 artifact',
  )

  const restoredIntake = runJson(process.execPath, ['scripts/check-remote-runtime-assignment-intake.mjs'])
  assert(restoredIntake.decision !== 'remote_assignment_ready', 'P148 cleanup must not leave current P75 in ready state')
  const restoredP75Artifact = latestArtifact(
    'remote-runtime-assignment-intake-',
    payload => payload.gate === 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE'
      && payload.decision !== 'remote_assignment_ready',
    'P148 restored P75 artifact',
  )

  const productionFingerprintsAfter = Object.fromEntries(pathsToRestore.map(path => [relative(root, path), fingerprint(path)]))
  assert(
    JSON.stringify(productionFingerprintsBefore) === JSON.stringify(productionFingerprintsAfter),
    'P148 must restore all runtime-production fixture files to their original fingerprints',
  )
  if (existsSync(fixtureEnvPath)) unlinkSync(fixtureEnvPath)

  const artifact = {
    version: 1,
    gate,
    status: 'passed',
    generatedAt: new Date().toISOString(),
    repository: repo,
    headSha,
    transition: {
      preparedIntent: true,
      compiledEdgeOnlyContract: true,
      pendingDecisionBeforeHealth: pendingIntake.decision,
      strictHealthReady: true,
      readyDecisionAfterFixtureHealth: readyIntake.decision,
      restoredDecisionAfterCleanup: restoredIntake.decision,
      expectedNextGoalWithRealEvidence: 'remote-health-evidence-intake',
    },
    sourceEvidence: {
      pendingAssignmentIntake: {
        file: relative(root, pendingP75Artifact.file),
        gate: pendingP75Artifact.payload.gate,
        decision: pendingP75Artifact.payload.decision,
        blockedStages: pendingP75Artifact.payload.blockedStages,
      },
      strictHealthAttestation: {
        file: relative(root, strictP145Artifact.file),
        gate: strictP145Artifact.payload.gate,
        status: strictP145Artifact.payload.status,
        healthReady: strictP145Artifact.payload.healthReady,
        sourceEvidenceDigest: strictP145Artifact.payload.sourceEvidenceDigest,
      },
      readyAssignmentIntake: {
        file: relative(root, readyP75Artifact.file),
        gate: readyP75Artifact.payload.gate,
        decision: readyP75Artifact.payload.decision,
        blockedStages: readyP75Artifact.payload.blockedStages,
      },
      restoredHealthAttestation: {
        file: relative(root, waitingP145Artifact.file),
        gate: waitingP145Artifact.payload.gate,
        status: waitingP145Artifact.payload.status,
        healthReady: waitingP145Artifact.payload.healthReady,
      },
      restoredAssignmentIntake: {
        file: relative(root, restoredP75Artifact.file),
        gate: restoredP75Artifact.payload.gate,
        decision: restoredP75Artifact.payload.decision,
        blockedStages: restoredP75Artifact.payload.blockedStages,
      },
    },
    boundary: {
      fixtureOnly: true,
      writesProductionIntent: false,
      writesProductionAssignment: false,
      createsRemoteServices: false,
      setsGitHubVariables: false,
      storesProviderSecrets: false,
      includesPublishableKey: false,
      promotesLiveRuntime: false,
      leavesHealthReadyArtifactAsCurrentState: false,
      restoresRuntimeProductionFiles: true,
      valuesIncluded: false,
    },
  }

  const privateHits = scanNoPrivateTerms(artifact)
  assert(privateHits.length === 0, `P148 artifact leaked private terms: ${privateHits.join(', ')}`)

  const artifactPath = join(artifactDir, `edge-only-data-api-evidence-transition-fixture-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

  console.log(JSON.stringify({
    status: artifact.status,
    gate: artifact.gate,
    headSha,
    transition: artifact.transition,
    boundary: artifact.boundary,
    artifactPath: relative(root, artifactPath),
  }, null, 2))
} finally {
  if (!restored) restore(backups)
}
