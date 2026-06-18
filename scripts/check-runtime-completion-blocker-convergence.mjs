#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

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

function latest(prefix) {
  assert(existsSync(artifactDir), 'runtime artifact directory is missing')
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .sort()
  assert(files.length > 0, `missing ${prefix} artifact`)
  const path = join(artifactDir, files.at(-1))
  return {
    path,
    payload: JSON.parse(readFileSync(path, 'utf8')),
  }
}

function run(cmd, args) {
  return execFileSync(cmd, args, {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    env: process.env,
  })
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
    /system prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
    /sourceRefs/,
    /profile\.id/,
    /kernel\.id/,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:runtime-completion-blocker-convergence'] === 'node scripts/check-runtime-completion-blocker-convergence.mjs',
  'package.json must expose check:runtime-completion-blocker-convergence',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-runtime-blockers-artifact && npm run check:runtime-completion-blocker-convergence'),
  'root npm run test must run P96 after P90 remote blocker artifact attestation',
)

for (const file of [
  'docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md',
  'docs/backend/P85_REMOTE_RUNTIME_BLOCKER_NORMALIZATION.md',
  'docs/backend/P90_REMOTE_RUNTIME_BLOCKER_ARTIFACT_ATTESTATION.md',
  'docs/backend/P96_RUNTIME_COMPLETION_BLOCKER_CONVERGENCE.md',
  'scripts/check-runtime-engine-completion.mjs',
  'scripts/check-remote-runtime-blockers.mjs',
  'scripts/check-remote-runtime-blockers-artifact.mjs',
]) {
  assert(existsSync(join(root, file)), `missing P96 prerequisite: ${file}`)
}

const p96Doc = read('docs/backend/P96_RUNTIME_COMPLETION_BLOCKER_CONVERGENCE.md')
for (const term of [
  'P96 Runtime Completion Blocker Convergence',
  'P85 blocker ledger is the source of truth',
  'commercial-release-chain',
  'check:runtime-completion-blocker-convergence',
]) {
  assert(p96Doc.includes(term), `P96 doc must include ${term}`)
}

const p45Script = read('scripts/check-runtime-engine-completion.mjs')
for (const term of [
  'remoteRuntimeBlockerLedger',
  'remoteRuntimeBlockedStages',
  'P85 remote runtime blocker',
  'check:runtime-completion-blocker-convergence',
]) {
  assert(p45Script.includes(term), `P45 script must include ${term}`)
}

const blockerArtifact = latest('remote-runtime-blockers-')
const blockedStages = (blockerArtifact.payload.stages || [])
  .filter(stage => stage?.status === 'blocked')
  .map(stage => String(stage.id || 'unknown'))

assert(blockerArtifact.payload.gate === 'P85_REMOTE_RUNTIME_BLOCKER_NORMALIZATION', 'latest blocker artifact must be P85')
assert(Number(blockerArtifact.payload.blockerCount) === blockedStages.length, 'P85 blockerCount must match blocked stage count')

run('node', ['scripts/check-runtime-engine-completion.mjs'])
const completionArtifact = latest('runtime-engine-completion-')
const commercial = (completionArtifact.payload.components || []).find(component => component.id === 'commercial-release-chain')
assert(commercial, 'P45 completion artifact must include commercial-release-chain')
assert(completionArtifact.payload.remoteRuntimeBlockerLedger, 'P45 completion artifact must include remoteRuntimeBlockerLedger summary')
assert(
  JSON.stringify(completionArtifact.payload.remoteRuntimeBlockerLedger.blockedStages || []) === JSON.stringify(blockedStages),
  'P45 remoteRuntimeBlockerLedger.blockedStages must match P85 blocked stage ids',
)

for (const stageId of blockedStages) {
  assert(
    (commercial.openGaps || []).some(gap => String(gap).includes(`(${stageId};`)),
    `commercial-release-chain openGaps must include P85 blocker ${stageId}`,
  )
}

if (blockedStages.length) {
  assert(
    !(commercial.openGaps || []).some(gap => String(gap).startsWith('Public live readiness blocked:')),
    'commercial-release-chain must not fall back to P23 live-readiness wording while P85 blockers exist',
  )
}

const artifact = {
  status: 'passed',
  gate: 'P96_RUNTIME_COMPLETION_BLOCKER_CONVERGENCE',
  generatedAt: new Date().toISOString(),
  p85: {
    artifact: relative(root, blockerArtifact.path),
    decision: blockerArtifact.payload.decision,
    blockerCount: blockerArtifact.payload.blockerCount,
    blockedStages,
  },
  p45: {
    artifact: relative(root, completionArtifact.path),
    status: completionArtifact.payload.status,
    commercialOpenGapCount: commercial.openGaps.length,
  },
  publicBoundary: {
    operatorSafe: true,
    representativeWorks: 'not_included',
    providerSecrets: 'not_included',
  },
}

const privateViolations = scanNoPrivateTerms(artifact)
assert(privateViolations.length === 0, `P96 artifact privacy violations: ${privateViolations.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `runtime-completion-blocker-convergence-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: 'passed',
  artifactPath,
  blockerCount: blockedStages.length,
  blockedStages,
}, null, 2))
