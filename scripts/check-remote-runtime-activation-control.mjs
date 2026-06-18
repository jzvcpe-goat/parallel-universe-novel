#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'
const required = process.env.REQUIRE_REMOTE_ACTIVATION_CONTROL_READY === 'true'

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

function runGate(scriptName, env = {}) {
  try {
    const output = execFileSync('node', [`scripts/${scriptName}`], {
      cwd: root,
      env: { ...process.env, ...env },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: Number(process.env.REMOTE_ACTIVATION_CONTROL_TIMEOUT_MS || 30000),
    })
    const payload = JSON.parse(output)
    return { ok: true, payload: enrichWithArtifactPayload(payload), output }
  } catch (error) {
    const stdout = error.stdout ? String(error.stdout) : ''
    let payload = null
    try {
      payload = stdout ? JSON.parse(stdout) : null
    } catch {
      payload = null
    }
    return {
      ok: false,
      payload: enrichWithArtifactPayload(payload),
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function enrichWithArtifactPayload(payload) {
  if (!payload || !payload.artifactPath) return payload
  try {
    const artifactPath = String(payload.artifactPath)
    if (!artifactPath.startsWith(root) || !existsSync(artifactPath)) return payload
    return { ...JSON.parse(readFileSync(artifactPath, 'utf8')), artifactPath }
  } catch {
    return payload
  }
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
  'docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md',
  'docs/backend/P72_RUNTIME_IMAGE_PUBLISH_EVIDENCE_GATE.md',
  'docs/backend/P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE.md',
  'docs/backend/P76_LIVE_CUTOVER_ATTESTATION_GATE.md',
  'docs/backend/P77_LIVE_ROLLBACK_REHEARSAL_GATE.md',
  'docs/backend/P78_REMOTE_RUNTIME_ACTIVATION_CONTROL.md',
  'scripts/check-runtime-image-publish-evidence.mjs',
  'scripts/check-remote-runtime-assignment-intake.mjs',
  'scripts/check-live-cutover-attestation.mjs',
  'scripts/check-live-rollback-rehearsal.mjs',
]

for (const file of requiredFiles) assert(existsSync(join(root, file)), `missing remote activation control file: ${file}`)

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:remote-runtime-activation-control'] === 'node scripts/check-remote-runtime-activation-control.mjs',
  'package.json must expose check:remote-runtime-activation-control',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-runtime-activation-control'),
  'root npm run test must include check:remote-runtime-activation-control',
)

assertContains('docs/backend/P78_REMOTE_RUNTIME_ACTIVATION_CONTROL.md', [
  'P78 Remote Runtime Activation Control',
  'check:remote-runtime-activation-control',
  'remote_activation_waiting_for_assignment',
  'remote_activation_ready_for_cutover',
  'REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true',
])
assertContains('docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md', [
  'Remote Activation Control Board',
  'npm run check:remote-runtime-activation-control',
])

const imageEvidence = runGate('check-runtime-image-publish-evidence.mjs')
const assignment = runGate('check-remote-runtime-assignment-intake.mjs')
const cutover = runGate('check-live-cutover-attestation.mjs')
const rollback = runGate('check-live-rollback-rehearsal.mjs')

const imageReady = imageEvidence.ok && imageEvidence.payload?.status === 'passed'
const assignmentReady = assignment.ok && assignment.payload?.decision === 'remote_assignment_ready'
const assignmentPresent = assignment.ok && assignment.payload?.decision !== 'remote_assignment_missing'
const cutoverReady = cutover.ok && cutover.payload?.decision === 'live_cutover_attested'
const rollbackReady = rollback.ok && (
  rollback.payload?.decision === 'live_rollback_rehearsed'
  || rollback.payload?.decision === 'live_rollback_static_preview_verified'
)
const staticPreviewReachable = rollback.ok && rollback.payload?.publicHead?.status === 'passed'

const stages = [
  stage(
    'runtime-images-published',
    imageReady,
    imageEvidence.payload?.runUrl || imageEvidence.error || 'missing image evidence',
    'Run Publish Runtime Images, then REQUIRE_RUNTIME_IMAGE_PUBLISHED=true npm run check:runtime-image-publish-evidence.',
  ),
  stage(
    'remote-assignment-file-present',
    assignmentPresent || assignmentReady,
    assignment.payload?.decision || assignment.error || 'missing assignment status',
    'Copy remote-assignment.example.json to remote-assignment.local.json and fill non-secret service evidence.',
  ),
  stage(
    'remote-assignment-ready',
    assignmentReady,
    assignment.payload?.decision || assignment.error || 'missing assignment status',
    'Make P75 strict pass with service ids, HTTPS origins, image refs, provider-secret-store confirmations and /health.',
  ),
  stage(
    'live-cutover-attestation-ready',
    cutoverReady,
    cutover.payload?.decision || cutover.error || 'missing cutover status',
    'Set non-secret GitHub runtime variables only after P75/P73/P66/P23 are ready, then run P76 strict.',
  ),
  stage(
    'rollback-rehearsal-ready',
    rollbackReady,
    rollback.payload?.decision || rollback.error || 'missing rollback status',
    'Keep static preview rollback verified, then set owner/run confirmation for strict rehearsal.',
  ),
  stage(
    'static-preview-reachable',
    staticPreviewReachable,
    rollback.payload?.publicHead ? JSON.stringify(rollback.payload.publicHead) : 'missing public HEAD evidence',
    'Public GitHub Pages static preview must stay reachable before any live cutover.',
  ),
]

const blockedStages = stages.filter(item => item.status !== 'ready').map(item => item.id)
let decision = 'remote_activation_ready_for_cutover'
if (!assignmentPresent) decision = 'remote_activation_waiting_for_assignment'
else if (!assignmentReady) decision = 'remote_activation_waiting_for_health'
else if (!cutoverReady) decision = 'remote_activation_waiting_for_live_vars'
if (!imageReady) decision = 'remote_activation_waiting_for_images'

const artifact = {
  version: 1,
  gate: 'P78_REMOTE_RUNTIME_ACTIVATION_CONTROL',
  generatedAt: new Date().toISOString(),
  repository: repo,
  required,
  decision,
  status: decision === 'remote_activation_ready_for_cutover' ? 'ready' : 'blocked',
  blockedStages,
  gates: {
    p72RuntimeImageEvidence: {
      ok: imageEvidence.ok,
      status: imageEvidence.payload?.status || null,
      runId: imageEvidence.payload?.runId || null,
      headSha: imageEvidence.payload?.headSha || null,
    },
    p75RemoteAssignment: {
      ok: assignment.ok,
      decision: assignment.payload?.decision || null,
      blockedStages: assignment.payload?.blockedStages || [],
    },
    p76LiveCutover: {
      ok: cutover.ok,
      decision: cutover.payload?.decision || null,
      blockedStages: cutover.payload?.blockedStages || [],
    },
    p77LiveRollback: {
      ok: rollback.ok,
      decision: rollback.payload?.decision || null,
      blockedStages: rollback.payload?.blockedStages || [],
      publicHead: rollback.payload?.publicHead || null,
    },
  },
  stages,
  nextStrictCommand: 'REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true npm run check:remote-runtime-activation-control',
}

const privateHits = scanNoPrivateTerms(artifact)
assert(privateHits.length === 0, `remote activation control artifact leaked private terms: ${privateHits.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `remote-activation-control-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

if (required && artifact.status !== 'ready') {
  console.error(JSON.stringify({ ...artifact, artifactPath }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ ...artifact, artifactPath }, null, 2))
