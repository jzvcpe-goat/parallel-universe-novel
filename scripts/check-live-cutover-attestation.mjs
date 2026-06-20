#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'
const required = process.env.REQUIRE_LIVE_CUTOVER_ATTESTED === 'true'

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertContains(file, terms) {
  const body = read(file)
  for (const term of terms) assert(body.includes(term), `${file} must include ${term}`)
}

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function isRemoteHttps(value) {
  const normalized = normalizeOrigin(value)
  return /^https:\/\//.test(normalized)
    && !/localhost|127\.0\.0\.1|0\.0\.0\.0|\[?::1\]?/.test(normalized)
    && !/example\.com|<.+>/.test(normalized)
}

function isProvided(value) {
  const text = String(value || '').trim()
  return Boolean(text) && !/<.+>/.test(text)
}

function boolValue(value) {
  return String(value || '').trim().toLowerCase() === 'true'
}

function tryGhVariables() {
  if (process.env.CHECK_GITHUB_REPO_VARS === 'false') {
    return { checked: false, source: 'disabled_by_env', values: {} }
  }
  try {
    const output = execFileSync('gh', ['variable', 'list', '--repo', repo, '--json', 'name,value'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
      timeout: 8000,
    })
    const values = {}
    for (const item of JSON.parse(output || '[]')) values[String(item.name)] = String(item.value || '')
    return { checked: true, source: 'gh_variable_list', values }
  } catch {
    if (process.env.GITHUB_ACTIONS === 'true') {
      return {
        checked: true,
        source: 'github_actions_vars_context',
        values: {
          VITE_PUBLIC_RUNTIME_MODE: process.env.VITE_PUBLIC_RUNTIME_MODE || '',
          VITE_API_ORIGIN: process.env.VITE_API_ORIGIN || '',
          VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || '',
          VITE_AGENT_RUNTIME_BASE_URL: process.env.VITE_AGENT_RUNTIME_BASE_URL || '',
          REMOTE_API_SERVICE_ID: process.env.REMOTE_API_SERVICE_ID || '',
          REMOTE_AGENT_SERVICE_ID: process.env.REMOTE_AGENT_SERVICE_ID || '',
          REMOTE_API_SECRETS_CONFIGURED: process.env.REMOTE_API_SECRETS_CONFIGURED || '',
          REMOTE_AGENT_SECRETS_CONFIGURED: process.env.REMOTE_AGENT_SECRETS_CONFIGURED || '',
        },
      }
    }
    return { checked: false, source: 'not_checked', values: {} }
  }
}

function envOrRepo(name, repoValues) {
  return String(process.env[name] || repoValues[name] || '').trim()
}

function latestArtifact(prefix, predicate = null) {
  if (!existsSync(artifactDir)) return null
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .sort()
  if (files.length === 0) return null
  for (const filename of files.toReversed()) {
    const path = join(artifactDir, filename)
    try {
      const payload = JSON.parse(readFileSync(path, 'utf8'))
      if (!predicate || predicate(payload)) return { path, payload }
    } catch {
      if (!predicate) return { path, payload: null }
    }
  }
  return null
}

function stage(id, passed, detail, nextAction) {
  return {
    id,
    status: passed ? 'ready' : 'blocked',
    detail,
    nextAction,
  }
}

function scanNoPrivateTerms(payload) {
  const text = JSON.stringify(payload)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL=(?!<)/,
    /postgres(ql)?:\/\/[^<]/i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/,
    /dev-local-token/,
    /NARRATIVEOS_TOOL_BRIDGE_TOKEN=(?!<)/,
    /MASTRA_TOOL_BRIDGE_TOKEN=(?!<)/,
    /NARRATIVEOS_CREATOR_API_KEY=(?!<)/,
    /system prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

const requiredFiles = [
  'docs/backend/P16_PAGES_LIVE_RELEASE_GATE.md',
  'docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md',
  'docs/backend/P23_LIVE_RUNTIME_READINESS_LEDGER.md',
  'docs/backend/P66_REMOTE_RUNTIME_ORIGIN_PROVISIONING_GATE.md',
  'docs/backend/P73_REMOTE_RUNTIME_ORIGIN_EXECUTION_GATE.md',
  'docs/backend/P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE.md',
  'docs/backend/P76_LIVE_CUTOVER_ATTESTATION_GATE.md',
  'scripts/audit-live-runtime-readiness.mjs',
  'scripts/check-remote-origin-provisioning.mjs',
  'scripts/check-remote-origin-execution.mjs',
  'scripts/check-remote-runtime-assignment-intake.mjs',
  '.github/workflows/pages.yml',
]

for (const file of requiredFiles) assert(existsSync(join(root, file)), `missing live cutover attestation file: ${file}`)

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:live-cutover-attestation'] === 'node scripts/check-live-cutover-attestation.mjs',
  'package.json must expose check:live-cutover-attestation',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:live-cutover-attestation'),
  'root npm run test must include check:live-cutover-attestation',
)

assertContains('docs/backend/P76_LIVE_CUTOVER_ATTESTATION_GATE.md', [
  'P76 Live Cutover Attestation Gate',
  'check:live-cutover-attestation',
  'REMOTE_API_SERVICE_ID',
  'REMOTE_AGENT_SERVICE_ID',
  'REMOTE_API_SECRETS_CONFIGURED',
  'REMOTE_AGENT_SECRETS_CONFIGURED',
  'live_cutover_disabled',
  'live_cutover_assignment_unattested',
  'live_cutover_attested',
  'REQUIRE_LIVE_CUTOVER_ATTESTED=true',
])
assertContains('.github/workflows/pages.yml', [
  'REMOTE_API_SERVICE_ID: ${{ vars.REMOTE_API_SERVICE_ID }}',
  'REMOTE_AGENT_SERVICE_ID: ${{ vars.REMOTE_AGENT_SERVICE_ID }}',
  "REMOTE_API_SECRETS_CONFIGURED: ${{ vars.REMOTE_API_SECRETS_CONFIGURED || 'false' }}",
  "REMOTE_AGENT_SECRETS_CONFIGURED: ${{ vars.REMOTE_AGENT_SECRETS_CONFIGURED || 'false' }}",
  'npm run check:live-cutover-attestation',
  'REQUIRE_LIVE_CUTOVER_ATTESTED=true npm run check:live-cutover-attestation',
])
assertContains('docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md', [
  'Live Cutover Attestation',
  'npm run check:live-cutover-attestation',
])

const repoVariables = tryGhVariables()
const mode = envOrRepo('VITE_PUBLIC_RUNTIME_MODE', repoVariables.values) || 'disabled'
const apiOrigin = normalizeOrigin(envOrRepo('VITE_API_ORIGIN', repoVariables.values))
const agentOrigin = normalizeOrigin(envOrRepo('VITE_AGENT_RUNTIME_BASE_URL', repoVariables.values))
const apiServiceId = envOrRepo('REMOTE_API_SERVICE_ID', repoVariables.values)
const agentServiceId = envOrRepo('REMOTE_AGENT_SERVICE_ID', repoVariables.values)
const apiSecretsReady = boolValue(envOrRepo('REMOTE_API_SECRETS_CONFIGURED', repoVariables.values))
const agentSecretsReady = boolValue(envOrRepo('REMOTE_AGENT_SECRETS_CONFIGURED', repoVariables.values))

const edgeOnlyAssignmentPaths = new Set([
  'deploy/runtime-production/runtime-assignment.intent.local.json',
  'deploy/runtime-production/generated/remote-assignment.contract.json',
])
const localAssignmentPath = 'deploy/runtime-production/remote-assignment.local.json'
const isEdgeOnlyAssignment = payload => payload?.runtimeMode === 'edge-only'
  && edgeOnlyAssignmentPaths.has(payload?.assignmentPath)
const isLocalAssignment = payload => payload?.assignmentPath === localAssignmentPath
const p75 = latestArtifact('remote-runtime-assignment-intake-', isEdgeOnlyAssignment)
  || latestArtifact('remote-runtime-assignment-intake-', isLocalAssignment)
  || latestArtifact('remote-runtime-assignment-intake-')
const p73 = latestArtifact('remote-origin-execution-')
const p66 = latestArtifact('remote-origin-provisioning-')
const p23 = latestArtifact('live-runtime-readiness-')

const localAssignmentReady = p75?.payload?.decision === 'remote_assignment_ready'
const edgeOnlyAssignmentTopology = p75?.payload?.runtimeMode === 'edge-only'
const envRuntimeMode = envOrRepo('REMOTE_RUNTIME_MODE', repoVariables.values)
const variableEdgeOnly = envRuntimeMode === 'edge-only'
const variableAssignmentReady = variableEdgeOnly
  ? isProvided(apiServiceId)
    && apiSecretsReady
    && isRemoteHttps(apiOrigin)
  : isProvided(apiServiceId)
    && isProvided(agentServiceId)
    && apiSecretsReady
    && agentSecretsReady
    && isRemoteHttps(apiOrigin)
    && isRemoteHttps(agentOrigin)
const assignmentAttestationReady = localAssignmentReady || variableAssignmentReady
const assignmentSource = localAssignmentReady
  ? 'p75_local_assignment_ready'
  : variableAssignmentReady
    ? 'ci_repository_variable_attestation'
    : 'unattested'
const remoteAgentRequired = !(edgeOnlyAssignmentTopology || variableEdgeOnly)

const p73Ready = p73?.payload?.executionDecision === 'remote_origin_execution_ready'
  || p73?.payload?.status === 'ready'
const p66Ready = p66?.payload?.provisioningDecision === 'ready_for_public_live_runtime'
  || p66?.payload?.status === 'ready'
const p23Ready = p23?.payload?.status === 'ready'

const stages = [
  stage('public-runtime-mode-live', mode === 'live', `current=${mode}`, 'Set VITE_PUBLIC_RUNTIME_MODE=live only after P75/P73/P66/P23 are ready.'),
  stage('api-origin-ready', isRemoteHttps(apiOrigin), apiOrigin || 'missing VITE_API_ORIGIN', 'Set VITE_API_ORIGIN to the remote FastAPI HTTPS origin.'),
  stage('agent-origin-ready', remoteAgentRequired ? isRemoteHttps(agentOrigin) : true, remoteAgentRequired ? (agentOrigin || 'missing VITE_AGENT_RUNTIME_BASE_URL') : 'not-required-edge-only', 'Set VITE_AGENT_RUNTIME_BASE_URL to the remote Agent HTTPS origin, unless P75 proves edge-only.'),
  stage('api-service-attested', isProvided(apiServiceId) || localAssignmentReady, isProvided(apiServiceId) ? 'provided' : assignmentSource, 'Set REMOTE_API_SERVICE_ID as a non-secret GitHub repository variable, or provide ready P75 local assignment evidence.'),
  stage('agent-service-attested', remoteAgentRequired ? (isProvided(agentServiceId) || localAssignmentReady) : true, remoteAgentRequired ? (isProvided(agentServiceId) ? 'provided' : assignmentSource) : 'not-required-edge-only', 'Set REMOTE_AGENT_SERVICE_ID as a non-secret GitHub repository variable, unless P75 proves edge-only.'),
  stage('api-secret-store-attested', apiSecretsReady || localAssignmentReady, String(apiSecretsReady || localAssignmentReady), 'Set REMOTE_API_SECRETS_CONFIGURED=true after provider secret store is configured.'),
  stage('agent-secret-store-attested', remoteAgentRequired ? (agentSecretsReady || localAssignmentReady) : true, remoteAgentRequired ? String(agentSecretsReady || localAssignmentReady) : 'not-required-edge-only', 'Set REMOTE_AGENT_SECRETS_CONFIGURED=true after provider secret store is configured, unless P75 proves edge-only.'),
  stage('assignment-attestation-ready', assignmentAttestationReady, assignmentSource, 'Run strict P75 locally, or set the non-secret REMOTE_* attestation variables in GitHub.'),
  stage('remote-origin-execution-ready', p73Ready, p73?.payload?.executionDecision || 'missing P73 ready artifact', 'Run REQUIRE_REMOTE_ORIGIN_EXECUTED=true npm run check:remote-origin-execution.'),
  stage('remote-origin-provisioning-ready', p66Ready, p66?.payload?.provisioningDecision || 'missing P66 ready artifact', 'Run REQUIRE_REMOTE_ORIGIN_PROVISIONED=true npm run check:remote-origin-provisioning.'),
  stage('live-runtime-readiness-ready', p23Ready, p23?.payload?.status || 'missing P23 ready artifact', 'Run REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness.'),
]

const blockedStages = stages.filter(item => item.status !== 'ready').map(item => item.id)
let decision = 'live_cutover_attested'
if (mode !== 'live') {
  decision = 'live_cutover_disabled'
} else if (!assignmentAttestationReady) {
  decision = 'live_cutover_assignment_unattested'
} else if (!p73Ready || !p66Ready || !p23Ready) {
  decision = 'live_cutover_pending_runtime_evidence'
}

const artifact = {
  version: 1,
  gate: 'P76_LIVE_CUTOVER_ATTESTATION_GATE',
  generatedAt: new Date().toISOString(),
  repository: repo,
  required,
  decision,
  status: decision === 'live_cutover_attested' ? 'ready' : 'blocked',
  assignmentSource,
  repoVariables: {
    checked: repoVariables.checked,
    source: repoVariables.source,
    present: {
      VITE_PUBLIC_RUNTIME_MODE: Boolean(repoVariables.values.VITE_PUBLIC_RUNTIME_MODE),
      VITE_API_ORIGIN: Boolean(repoVariables.values.VITE_API_ORIGIN),
      VITE_AGENT_RUNTIME_BASE_URL: Boolean(repoVariables.values.VITE_AGENT_RUNTIME_BASE_URL),
      REMOTE_API_SERVICE_ID: Boolean(repoVariables.values.REMOTE_API_SERVICE_ID),
      REMOTE_AGENT_SERVICE_ID: Boolean(repoVariables.values.REMOTE_AGENT_SERVICE_ID),
      REMOTE_API_SECRETS_CONFIGURED: Boolean(repoVariables.values.REMOTE_API_SECRETS_CONFIGURED),
      REMOTE_AGENT_SECRETS_CONFIGURED: Boolean(repoVariables.values.REMOTE_AGENT_SECRETS_CONFIGURED),
    },
  },
  publicRuntime: {
    mode,
    apiOrigin: apiOrigin || null,
    agentOrigin: remoteAgentRequired ? (agentOrigin || null) : null,
    remoteAgentRequired,
  },
  evidence: {
    p75: p75 ? { path: p75.path, decision: p75.payload?.decision || null } : null,
    p73: p73 ? { path: p73.path, decision: p73.payload?.executionDecision || null, status: p73.payload?.status || null } : null,
    p66: p66 ? { path: p66.path, decision: p66.payload?.provisioningDecision || null, status: p66.payload?.status || null } : null,
    p23: p23 ? { path: p23.path, status: p23.payload?.status || null } : null,
  },
  stages,
  blockedStages,
  nextCommands: {
    attestAssignment: 'REMOTE_API_SERVICE_ID=<id> REMOTE_AGENT_SERVICE_ID=<id> REMOTE_API_SECRETS_CONFIGURED=true REMOTE_AGENT_SECRETS_CONFIGURED=true npm run check:live-cutover-attestation',
    strictAssignment: 'REQUIRE_REMOTE_ASSIGNMENT_READY=true npm run check:remote-runtime-assignment-intake',
    strictOriginExecution: 'REQUIRE_REMOTE_ORIGIN_EXECUTED=true npm run check:remote-origin-execution',
    strictReadiness: 'REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness',
    strictCutover: 'REQUIRE_LIVE_CUTOVER_ATTESTED=true npm run check:live-cutover-attestation',
  },
}

const privateMatches = scanNoPrivateTerms(artifact)
assert(privateMatches.length === 0, `live cutover attestation artifact leaks private terms: ${privateMatches.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `live-cutover-attestation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

if (required && artifact.status !== 'ready') {
  throw new Error(`live cutover is not attested: ${blockedStages.join(', ')}`)
}

console.log(JSON.stringify({
  status: artifact.status === 'ready' ? 'passed' : 'passed_with_cutover_blockers',
  gate: artifact.gate,
  decision,
  assignmentSource,
  blockedStages,
  artifactPath,
}, null, 2))
