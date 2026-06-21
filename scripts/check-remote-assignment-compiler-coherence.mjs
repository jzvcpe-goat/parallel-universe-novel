#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const generatedDir = join(root, 'deploy', 'runtime-production', 'generated')
const intentPath = join(root, 'deploy', 'runtime-production', 'runtime-assignment.intent.local.json')
const legacyEnvLocalPath = join(root, 'deploy', 'runtime-production', 'remote-assignment.env.local')

const generatedFiles = {
  contract: join(generatedDir, 'remote-assignment.contract.json'),
  legacyEnv: join(generatedDir, 'remote-assignment.legacy.env'),
  evidence: join(generatedDir, 'operator-assignment-evidence.md'),
  ledgerPatch: join(generatedDir, 'loop-next-goal-ledger.patch.json'),
  healthRequest: join(generatedDir, 'remote-health-evidence.request.json'),
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJsonAbs(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function assertIncludes(file, terms) {
  const body = read(file)
  for (const term of terms) assert(body.includes(term), `${file} must include ${term}`)
}

function runNode(script) {
  return execFileSync(process.execPath, [script], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30000,
    env: {
      ...process.env,
      GIT_HEAD: currentHead(),
    },
  })
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

function collectFiles(absDir) {
  const files = []
  if (!existsSync(absDir)) return files
  function walk(current) {
    const stat = statSync(current)
    if (stat.isFile()) {
      files.push(current)
      return
    }
    for (const child of readdirSync(current)) walk(join(current, child))
  }
  walk(absDir)
  return files
}

function snapshotFile(absPath) {
  return existsSync(absPath) ? readFileSync(absPath) : null
}

function restoreFile(absPath, content) {
  if (content == null) {
    rmSync(absPath, { force: true })
    return
  }
  mkdirSync(dirname(absPath), { recursive: true })
  writeFileSync(absPath, content)
}

function snapshotDir(absDir) {
  const files = new Map()
  for (const file of collectFiles(absDir)) {
    files.set(relative(absDir, file), readFileSync(file))
  }
  return files
}

function restoreDir(absDir, files) {
  rmSync(absDir, { recursive: true, force: true })
  mkdirSync(absDir, { recursive: true })
  for (const [rel, content] of files.entries()) {
    const abs = join(absDir, rel)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content)
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
    /WRITER_PASSWORD\s*[:=]\s*(?!false|<)/i,
    /OPENAI_API_KEY/i,
    /DEEPSEEK_API_KEY/i,
    /MOONSHOT_API_KEY/i,
    /KIMI_API_KEY/i,
    /ANTHROPIC_API_KEY/i,
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
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(String)
}

function scanNoDeprecatedRemoteAgentRequirement(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  const forbidden = [
    /REMOTE_AGENT_REMOTE_REQUIRED=true/,
    /REMOTE_AI_GENERATION_CLOUD_RUNTIME=true/,
    /REMOTE_READER_CAN_TRIGGER_AI=true/,
    /remote_agent_health_required:\s*true/,
    /"remote_required"\s*:\s*true/,
    /"ai_generation_cloud_runtime"\s*:\s*true/,
    /"reader_can_trigger_ai"\s*:\s*true/,
    /"remote_agent_health_required"\s*:\s*true/,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(String)
}

function writeFixtureIntent() {
  const intent = {
    schema_version: 1,
    goal: 'parallel-universe-novel-reader',
    environment: 'production',
    runtime_mode: 'edge-only',
    operator: {
      owner: 'jzvcpe-goat',
      provider: 'github-pages-supabase-managed',
    },
    frontend: {
      provider: 'github-pages',
      service_id: 'jzvcpe-goat/parallel-universe-novel',
      origin: 'https://jzvcpe-goat.github.io',
      secrets_configured: true,
    },
    data_api: {
      provider: 'supabase',
      service_id: 'parallel-universe-reader-data',
      origin: 'https://parallel-universe-reader-data.supabase.co',
      secrets_configured: true,
      public_key_model: 'publishable-or-legacy-anon-with-rls',
    },
    agent: {
      remote_required: false,
      location: 'user-owned-edge-device',
      ai_generation_cloud_runtime: false,
      reader_can_trigger_ai: false,
    },
    health: {
      frontend_url: 'https://jzvcpe-goat.github.io/parallel-universe-novel/',
      data_probe_table: 'health_probe',
      data_probe_id: 'reader',
    },
  }
  const privateHits = scanNoPrivateTerms(intent)
  assert(privateHits.length === 0, `fixture intent leaked private terms: ${privateHits.join(', ')}`)
  mkdirSync(dirname(intentPath), { recursive: true })
  writeFileSync(intentPath, `${JSON.stringify(intent, null, 2)}\n`)
}

function validateGeneratedOutputs() {
  for (const [label, file] of Object.entries(generatedFiles)) {
    assert(existsSync(file), `remote assignment compiler did not generate ${label}`)
  }
  assert(existsSync(legacyEnvLocalPath), 'remote assignment compiler did not generate compatibility remote-assignment.env.local')

  const contract = readJsonAbs(generatedFiles.contract)
  const legacyEnv = readFileSync(generatedFiles.legacyEnv, 'utf8')
  const legacyEnvLocal = readFileSync(legacyEnvLocalPath, 'utf8')
  const evidenceMd = readFileSync(generatedFiles.evidence, 'utf8')
  const ledgerPatch = readJsonAbs(generatedFiles.ledgerPatch)
  const healthRequest = readJsonAbs(generatedFiles.healthRequest)

  assert(contract.runtime_mode === 'edge-only', 'compiled contract must stay edge-only')
  assert(contract.topology?.agent?.remote_required === false, 'compiled contract must not require remote agent')
  assert(contract.topology?.agent?.remote_service_id === null, 'edge-only contract must not include remote agent service id')
  assert(contract.topology?.agent?.remote_origin === null, 'edge-only contract must not include remote agent origin')
  assert(contract.topology?.agent?.remote_secrets_configured === false, 'edge-only contract must not configure remote agent secrets')
  assert(contract.topology?.agent?.ai_generation_cloud_runtime === false, 'edge-only contract must keep cloud AI runtime disabled')
  assert(contract.topology?.agent?.reader_can_trigger_ai === false, 'edge-only reader must not trigger AI')
  assert(contract.topology?.data_api?.service_id === 'parallel-universe-reader-data', 'compiled contract must preserve data API service id')
  assert(contract.topology?.data_api?.origin === 'https://parallel-universe-reader-data.supabase.co', 'compiled contract must preserve data API origin')
  assert(contract.health?.data_probe_table === 'health_probe', 'compiled contract must preserve health probe table')
  assert(contract.health?.data_probe_id === 'reader', 'compiled contract must preserve health probe id')
  assert(contract.health?.remote_agent_health_required === false, 'edge-only health must not require remote agent')

  for (const body of [legacyEnv, legacyEnvLocal]) {
    for (const term of [
      'REMOTE_RUNTIME_MODE=edge-only',
      'REMOTE_AGENT_REMOTE_REQUIRED=false',
      'REMOTE_AI_GENERATION_CLOUD_RUNTIME=false',
      'REMOTE_READER_CAN_TRIGGER_AI=false',
      'REMOTE_AGENT_SERVICE_ID=',
      'REMOTE_AGENT_ORIGIN=',
      'REMOTE_AGENT_SECRETS_CONFIGURED=false',
      'REMOTE_AGENT_ABSENCE_REASON=edge-only runtime: AI generation occurs on user-owned edge device',
    ]) {
      assert(body.includes(term), `legacy env must include ${term}`)
    }
  }

  assert(evidenceMd.includes('runtime_mode: "edge-only"'), 'operator evidence must declare edge-only')
  assert(evidenceMd.includes('remote_required: false'), 'operator evidence must declare remote agent not required')
  assert(evidenceMd.includes('remote_agent_health_required: false'), 'operator evidence must not request remote agent health')
  assert(evidenceMd.includes('next_step: "remote-health-evidence-intake"'), 'operator evidence must direct next step to health evidence intake')

  assert(ledgerPatch.status === 'unblocked-pending-health-evidence', 'ledger patch must advance to pending health evidence')
  assert(ledgerPatch.next_step === 'remote-health-evidence-intake', 'ledger patch next step must be remote health evidence intake')
  assert(ledgerPatch.operator_assignment_evidence_intake?.runtime_mode === 'edge-only', 'ledger patch must preserve edge-only runtime mode')
  assert(ledgerPatch.operator_assignment_evidence_intake?.remote_services?.agent?.remote_required === false, 'ledger patch must not require remote agent')
  assert(ledgerPatch.operator_assignment_evidence_intake?.remote_services?.agent?.remote_service_id === null, 'ledger patch must not invent remote agent service id')
  assert(ledgerPatch.operator_assignment_evidence_intake?.security_boundary?.cloud_ai_api_keys_allowed === false, 'ledger patch must keep cloud AI keys out')

  assert(healthRequest.runtime_mode === 'edge-only', 'health request must stay edge-only')
  assert(healthRequest.data_api_health?.probe?.table === 'health_probe', 'health request must target health_probe')
  assert(healthRequest.data_api_health?.probe?.id === 'reader', 'health request must target reader probe')
  assert(healthRequest.remote_agent_health?.required === false, 'health request must not require remote agent health')
  assert(String(healthRequest.remote_agent_health?.reason || '').includes('edge-only runtime'), 'health request must explain edge-only agent absence')

  const generatedPayload = { contract, legacyEnv, legacyEnvLocal, evidenceMd, ledgerPatch, healthRequest }
  const privateHits = scanNoPrivateTerms(generatedPayload)
  assert(privateHits.length === 0, `generated compiler outputs leaked private terms: ${privateHits.join(', ')}`)
  const deprecatedHits = scanNoDeprecatedRemoteAgentRequirement(generatedPayload)
  assert(deprecatedHits.length === 0, `generated compiler outputs reintroduced remote Agent requirements: ${deprecatedHits.join(', ')}`)

  return { contract, ledgerPatch, healthRequest }
}

const packageJson = JSON.parse(read('package.json'))
assert(
  packageJson.scripts['check:remote-assignment-compiler-coherence'] === 'node scripts/check-remote-assignment-compiler-coherence.mjs',
  'package.json must expose check:remote-assignment-compiler-coherence',
)
assert(
  String(packageJson.scripts.test || '').includes('npm run check:runtime-assignment-compiler && npm run check:remote-assignment-compiler-coherence'),
  'root npm run test must run compiler coherence immediately after check:runtime-assignment-compiler',
)

for (const file of [
  'docs/backend/P138_REMOTE_ASSIGNMENT_COMPILER_V3.md',
  'docs/backend/P142_EDGE_ONLY_DATA_API_EVIDENCE_INTAKE.md',
  'docs/backend/P143_EDGE_ONLY_CURRENT_BLOCKER_PROJECTION.md',
  'docs/backend/P144_REMOTE_ASSIGNMENT_COMPILER_COHERENCE.md',
]) {
  assert(existsSync(join(root, file)), `missing P144 prerequisite: ${file}`)
}

assertIncludes('docs/backend/P144_REMOTE_ASSIGNMENT_COMPILER_COHERENCE.md', [
  'P144 Remote Assignment Compiler Coherence',
  'check:remote-assignment-compiler-coherence',
  'remote-health-evidence-intake',
  'REMOTE_AGENT_REMOTE_REQUIRED=false',
  'health_probe',
])
assertIncludes('docs/backend/P142_EDGE_ONLY_DATA_API_EVIDENCE_INTAKE.md', [
  'check:remote-assignment-compiler-coherence',
  'remote-health-evidence-intake',
])
assertIncludes('docs/backend/P138_REMOTE_ASSIGNMENT_COMPILER_V3.md', [
  'check:remote-assignment-compiler-coherence',
  'P144 Remote Assignment Compiler Coherence',
])

const generatedSnapshot = snapshotDir(generatedDir)
const intentSnapshot = snapshotFile(intentPath)
const legacyEnvSnapshot = snapshotFile(legacyEnvLocalPath)

let outputSummary
try {
  writeFixtureIntent()
  runNode('scripts/remote-assignment/compile-runtime-assignment.mjs')
  runNode('scripts/remote-assignment/validate-runtime-assignment-contract.mjs')
  runNode('scripts/remote-assignment/generate-legacy-remote-env.mjs')
  runNode('scripts/remote-assignment/generate-operator-evidence.mjs')
  runNode('scripts/remote-assignment/generate-ledger-patch.mjs')
  outputSummary = validateGeneratedOutputs()
} finally {
  restoreDir(generatedDir, generatedSnapshot)
  restoreFile(intentPath, intentSnapshot)
  restoreFile(legacyEnvLocalPath, legacyEnvSnapshot)
}

const artifact = {
  version: 1,
  gate: 'P144_REMOTE_ASSIGNMENT_COMPILER_COHERENCE',
  status: 'passed',
  generatedAt: new Date().toISOString(),
  headSha: currentHead(),
  validates: {
    fixtureIntentCompiled: true,
    generatedContractValidated: true,
    legacyEnvGenerated: true,
    operatorEvidenceGenerated: true,
    ledgerPatchGenerated: true,
    healthRequestGenerated: true,
    ignoredLocalFilesRestored: true,
  },
  runtimeProjection: {
    runtimeMode: outputSummary.contract.runtime_mode,
    dataApiProvider: outputSummary.contract.topology.data_api.provider,
    dataApiOrigin: outputSummary.contract.topology.data_api.origin,
    dataProbeTable: outputSummary.healthRequest.data_api_health.probe.table,
    dataProbeId: outputSummary.healthRequest.data_api_health.probe.id,
    nextStep: outputSummary.ledgerPatch.next_step,
  },
  edgeOnlyBoundary: {
    remoteAgentRequired: outputSummary.contract.topology.agent.remote_required,
    remoteAgentServiceId: outputSummary.contract.topology.agent.remote_service_id,
    remoteAgentOrigin: outputSummary.contract.topology.agent.remote_origin,
    cloudAiRuntime: outputSummary.contract.topology.agent.ai_generation_cloud_runtime,
    readerCanTriggerAi: outputSummary.contract.topology.agent.reader_can_trigger_ai,
    remoteAgentHealthRequired: outputSummary.contract.health.remote_agent_health_required,
  },
  secretBoundary: {
    frontendSecretKeysAllowed: outputSummary.contract.secret_boundary.frontend_secret_keys_allowed,
    serviceRoleInFrontendAllowed: outputSummary.contract.secret_boundary.service_role_in_frontend_allowed,
    writerPasswordInFrontendAllowed: outputSummary.contract.secret_boundary.writer_password_in_frontend_allowed,
    cloudAiApiKeysAllowed: outputSummary.contract.secret_boundary.cloud_ai_api_keys_allowed,
  },
}

const artifactPrivateHits = scanNoPrivateTerms(artifact)
assert(artifactPrivateHits.length === 0, `P144 artifact leaked private terms: ${artifactPrivateHits.join(', ')}`)
const artifactDeprecatedHits = scanNoDeprecatedRemoteAgentRequirement(artifact)
assert(artifactDeprecatedHits.length === 0, `P144 artifact reintroduced remote Agent requirements: ${artifactDeprecatedHits.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `remote-assignment-compiler-coherence-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: 'passed',
  gate: artifact.gate,
  nextStep: artifact.runtimeProjection.nextStep,
  artifactPath: relative(root, artifactPath),
}, null, 2))
