#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function latest(prefix, predicate, label) {
  assert(existsSync(artifactDir), 'runtime artifact directory is missing; run the runtime gates first')
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .sort()
  for (const filename of files.toReversed()) {
    const payload = JSON.parse(readFileSync(join(artifactDir, filename), 'utf8'))
    if (!predicate || predicate(payload)) {
      return { filename, payload }
    }
  }
  throw new Error(`missing ${label || prefix} artifact`)
}

function array(value) {
  return Array.isArray(value) ? value : []
}

function blockerId(value) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') return String(value.id || value.check || value.stage || '')
  return ''
}

function isAgentBlocker(id) {
  return /(^|-)agent(-|$)|remote-agent/i.test(String(id || ''))
}

function stageById(payload, id) {
  return array(payload.stages).find(stage => stage.id === id)
}

const edgeOnlyAssignmentPaths = new Set([
  'deploy/runtime-production/runtime-assignment.intent.local.json',
  'deploy/runtime-production/runtime-assignment.intent.example.json',
  'deploy/runtime-production/generated/remote-assignment.contract.json',
])

const p75 = latest(
  'remote-runtime-assignment-intake-',
  payload => payload?.runtimeMode === 'edge-only' && edgeOnlyAssignmentPaths.has(payload?.assignmentPath),
  'current edge-only P75 assignment intake',
)
const p76 = latest(
  'live-cutover-attestation-',
  payload => payload?.gate === 'P76_LIVE_CUTOVER_ATTESTATION_GATE',
  'latest P76 live cutover attestation',
)
const p85 = latest(
  'remote-runtime-blockers-',
  payload => payload?.gate === 'P85_REMOTE_RUNTIME_BLOCKER_NORMALIZATION',
  'latest P85 blocker ledger',
)

const p76AgentBlockers = array(p76.payload.blockedStages).map(blockerId).filter(isAgentBlocker)
const p85AgentBlockers = array(p85.payload.stages)
  .flatMap(stage => array(stage.blocked).map(blockerId))
  .filter(isAgentBlocker)
const p85AgentInputs = array(p85.payload.stages)
  .flatMap(stage => array(stage.requiredInputs))
  .filter(input => /Agent origin|Agent \/health|remote Agent \/health|remote Agent Runtime service id/i.test(String(input)))
const p85AgentEnvKeys = JSON.stringify(p85.payload).match(/REMOTE_AGENT_(SERVICE_ID|ORIGIN|SECRETS_CONFIGURED)/g) || []
const assignmentHealth = stageById(p85.payload, 'remote-assignment-health-ready')

assert(p75.payload.runtimeMode === 'edge-only', 'P143 requires edge-only P75 evidence')
assert(p76AgentBlockers.length === 0, `P76 current edge-only projection must not block on remote Agent stages: ${p76AgentBlockers.join(', ')}`)
assert(p85.payload.sourceEvidence?.runtimeAssignment?.runtimeMode === 'edge-only', 'P85 must select current edge-only runtime assignment evidence')
assert(p85.payload.sourceEvidence?.runtimeAssignment?.selectedEdgeOnlyCurrentPath === true, 'P85 must mark selected edge-only assignment as current path')
assert(p85AgentBlockers.length === 0, `P85 current edge-only blocker ledger must not contain remote Agent blockers: ${p85AgentBlockers.join(', ')}`)
assert(p85AgentInputs.length === 0, `P85 current edge-only required inputs must not ask for remote Agent proof: ${p85AgentInputs.join(', ')}`)
assert(p85AgentEnvKeys.length === 0, `P85 current edge-only artifact must not ask for REMOTE_AGENT_* variables: ${p85AgentEnvKeys.join(', ')}`)
assert(assignmentHealth, 'P85 must include remote-assignment-health-ready stage')
assert(
  assignmentHealth.status === 'ready' || array(assignmentHealth.blocked).includes('data-api-health-ready'),
  'P85 edge-only assignment health must preserve data-api-health-ready status',
)
for (const expected of [
  'data API service id',
  'data API HTTPS origin',
  'publishable/RLS configuration attestation',
  'data API health proof',
]) {
  assert(
    array(assignmentHealth.requiredInputs).includes(expected),
    `P85 edge-only assignment health must expose required input: ${expected}`,
  )
}

const artifact = {
  version: 1,
  gate: 'P143_EDGE_ONLY_CURRENT_BLOCKER_PROJECTION',
  status: 'passed',
  generatedAt: new Date().toISOString(),
  sourceEvidence: {
    p75: {
      file: p75.filename,
      decision: p75.payload.decision,
      runtimeMode: p75.payload.runtimeMode,
      assignmentPath: p75.payload.assignmentPath,
      blockedStages: p75.payload.blockedStages,
    },
    p76: {
      file: p76.filename,
      decision: p76.payload.decision,
      blockedStages: p76.payload.blockedStages,
    },
    p85: {
      file: p85.filename,
      decision: p85.payload.decision,
      runtimeAssignment: p85.payload.sourceEvidence.runtimeAssignment,
      blockedStages: array(p85.payload.stages)
        .filter(stage => stage.status !== 'ready')
        .map(stage => ({ id: stage.id, blocked: stage.blocked })),
    },
  },
}

mkdirSync(artifactDir, { recursive: true })
const path = join(artifactDir, `edge-only-current-blocker-projection-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(path, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: 'passed',
  gate: artifact.gate,
  artifactPath: path,
  p75Decision: p75.payload.decision,
  p76Decision: p76.payload.decision,
  p85Decision: p85.payload.decision,
}, null, 2))
