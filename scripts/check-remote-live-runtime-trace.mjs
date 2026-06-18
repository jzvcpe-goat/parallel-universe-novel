#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function latestArtifact(prefix) {
  assert(existsSync(artifactDir), `runtime artifact directory is missing; run upstream ${prefix} gate first`)
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .sort()
  assert(files.length > 0, `missing ${prefix} artifact; run the upstream gate first`)
  const filename = files.at(-1)
  return {
    filename,
    path: join(artifactDir, filename),
    payload: JSON.parse(readFileSync(join(artifactDir, filename), 'utf8')),
  }
}

function checkById(ledger, id) {
  return (ledger.checks || []).find(item => item.id === id) || null
}

function isPassed(ledger, id) {
  return checkById(ledger, id)?.status === 'passed'
}

function traceGate(trace, id) {
  return (trace.gates || []).find(item => item.id === id) || null
}

function assertDocContains(file, terms) {
  const body = read(file)
  for (const term of terms) {
    assert(body.includes(term), `${file} must include ${term}`)
  }
}

function scanNoPrivateTerms(payload) {
  const text = JSON.stringify(payload)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /system prompt/i,
    /provider secret/i,
    /database_url/i,
    /authorization:\s*bearer\s+(?!<shared-tool-bridge-secret>)/i,
    /representative work/i,
    /reference-work-vault/i,
    /rawState/i,
    /StateVector/,
    /candidateDraftBody/i,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:remote-live-runtime-trace'] === 'node scripts/check-remote-live-runtime-trace.mjs',
  'package.json must expose check:remote-live-runtime-trace',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-live-runtime-trace'),
  'root npm run test must include check:remote-live-runtime-trace',
)

assertDocContains('docs/backend/P65_REMOTE_LIVE_RUNTIME_TRACE_GATE.md', [
  'P65 Remote Live Runtime Trace Gate',
  'hold_remote_live_trace_unproven',
  'creator_remote_trace_ready_reader_partial',
  'remote_live_trace_ready',
  'P23',
  'P46',
  'P47',
])
assertDocContains('docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md', [
  'P65 Remote Live Runtime Trace Gate',
  'hold_remote_live_trace_unproven',
])
assertDocContains('docs/backend/P52_RUNTIME_COMPLETION_MATRIX_REFRESH.md', [
  'P65 Remote Live Runtime Trace Gate',
  'remote live runtime trace',
])

const readiness = latestArtifact('live-runtime-readiness-')
const activation = latestArtifact('remote-runtime-activation-')
const continuity = latestArtifact('runtime-trace-continuity-')

const requiredReadinessChecks = [
  'public-runtime-mode',
  'api-origin',
  'agent-origin',
  'api-base-url',
  'local-fallback-disabled',
  'api-health',
  'agent-health',
  'creator-workflow-preflight',
]

for (const checkId of requiredReadinessChecks) {
  assert(checkById(readiness.payload, checkId), `readiness artifact missing check ${checkId}`)
}

assert(
  ['hold_public_live_runtime_disabled', 'can_enable_public_live_runtime'].includes(activation.payload.releaseDecision),
  `unexpected remote runtime activation releaseDecision: ${activation.payload.releaseDecision}`,
)

for (const gateId of ['creator-trace', 'reader-trace', 'studio-trace']) {
  assert(traceGate(continuity.payload, gateId), `trace continuity artifact missing ${gateId}`)
}

const readinessReady = readiness.payload.status === 'ready'
const activationReady = activation.payload.releaseDecision === 'can_enable_public_live_runtime'
const creatorWorkflowReady = isPassed(readiness.payload, 'creator-workflow-preflight')
const creatorTraceReady = traceGate(continuity.payload, 'creator-trace')?.status === 'ready'
const studioTraceReady = traceGate(continuity.payload, 'studio-trace')?.status === 'ready'
const readerTraceReady = traceGate(continuity.payload, 'reader-trace')?.status === 'ready'

let traceDecision = 'hold_remote_live_trace_unproven'
if (readinessReady && activationReady && creatorWorkflowReady && creatorTraceReady && studioTraceReady && readerTraceReady) {
  traceDecision = 'remote_live_trace_ready'
} else if (readinessReady && activationReady && creatorWorkflowReady && creatorTraceReady && studioTraceReady) {
  traceDecision = 'creator_remote_trace_ready_reader_partial'
}

const blockedChecks = requiredReadinessChecks
  .filter(checkId => !isPassed(readiness.payload, checkId))
  .map(checkId => ({
    id: checkId,
    detail: checkById(readiness.payload, checkId)?.detail || 'missing detail',
    nextAction: checkById(readiness.payload, checkId)?.nextAction || 'Resolve upstream readiness gate.',
  }))

const traceGaps = (continuity.payload.gates || [])
  .filter(item => item.status !== 'ready')
  .map(item => ({
    id: item.id,
    status: item.status,
    openGapCount: Array.isArray(item.openGaps) ? item.openGaps.length : 0,
    nextGate: item.nextGate,
  }))

const artifact = {
  generatedAt: new Date().toISOString(),
  status: traceDecision === 'remote_live_trace_ready' ? 'ready' : 'blocked',
  traceDecision,
  sourceArtifacts: {
    readiness: readiness.filename,
    activation: activation.filename,
    traceContinuity: continuity.filename,
  },
  releaseDecision: activation.payload.releaseDecision,
  readinessStatus: readiness.payload.status,
  requiredChecks: requiredReadinessChecks.map(checkId => ({
    id: checkId,
    status: checkById(readiness.payload, checkId)?.status || 'missing',
  })),
  blockedChecks,
  activationBlockers: activation.payload.blockedStages || [],
  traceGaps,
  requiredEvidence: [
    'P23 live-runtime-readiness artifact',
    'P46 remote-runtime-activation artifact',
    'P47 runtime-trace-continuity artifact',
    'GitHub Actions artifact gate',
  ],
  nextActions: traceDecision === 'remote_live_trace_ready'
    ? ['Enable Pages live runtime only after release owner approval.']
    : [
        'Deploy remote FastAPI over HTTPS.',
        'Deploy remote Agent Runtime over HTTPS.',
        'Set GitHub repository runtime variables.',
        'Run public Creator seed-to-candidate smoke against Pages.',
        'Run Reader trace continuity against remote runtime before claiming live generation.',
      ],
}

const privateViolations = scanNoPrivateTerms(artifact)
assert(privateViolations.length === 0, `remote live runtime trace artifact privacy violations: ${privateViolations.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `remote-live-runtime-trace-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: traceDecision === 'remote_live_trace_ready' ? 'passed' : 'passed_with_trace_blockers',
  artifactPath,
  traceDecision,
  blockedChecks: blockedChecks.map(item => item.id),
  traceGaps,
}, null, 2))
