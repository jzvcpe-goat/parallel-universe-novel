#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const assignmentRel = 'deploy/runtime-production/remote-assignment.local.json'
const assignmentPath = join(root, assignmentRel)

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
  if (process.env.RUNTIME_IMAGE_HEAD_SHA) return process.env.RUNTIME_IMAGE_HEAD_SHA.trim()
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 8000,
    }).trim()
  } catch {
    return ''
  }
}

function latestRuntimeImageEvidence(head) {
  if (!existsSync(artifactDir)) return null
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith('runtime-image-publish-evidence-') && name.endsWith('.json'))
    .map(name => join(artifactDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)

  for (const file of files) {
    const payload = JSON.parse(readFileSync(file, 'utf8'))
    if (payload.status === 'passed' && payload.headSha === head && Array.isArray(payload.images)) {
      return { file, payload }
    }
  }
  return null
}

function imageFor(payload, service) {
  const fragment = service === 'api'
    ? '/parallel-universe-novel-api:'
    : '/parallel-universe-novel-agent-runtime:'
  return (payload.images || []).find(item => String(item).includes(fragment)) || null
}

function hasPlaceholder(value) {
  const text = String(value || '').trim()
  return /<[^>]+>/.test(text)
    || /\bFILL_[A-Z0-9_]+\b/i.test(text)
    || /\bREPLACE_ME\b/i.test(text)
    || /\bYOUR[_-][A-Z0-9_-]+\b/i.test(text)
    || /\bTODO[_-][A-Z0-9_-]+\b/i.test(text)
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
    /Authorization:\s*Bearer\s+(?!<shared-tool-bridge-secret>)/i,
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

function writeArtifact(payload) {
  mkdirSync(artifactDir, { recursive: true })
  const artifactPath = join(artifactDir, `remote-assignment-image-drift-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(artifactPath, `${JSON.stringify(payload, null, 2)}\n`)
  return artifactPath
}

for (const file of [
  'package.json',
  '.gitignore',
  'docs/backend/P112_REMOTE_ASSIGNMENT_LOCAL_DRAFT_PREPARATION.md',
  'docs/backend/P113_REMOTE_ASSIGNMENT_IMAGE_DRIFT_GATE.md',
  'deploy/runtime-production/remote-assignment.schema.json',
]) {
  assert(existsSync(join(root, file)), `missing P113 prerequisite: ${file}`)
}

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:remote-assignment-image-drift'] === 'node scripts/check-remote-assignment-image-drift.mjs',
  'package.json must expose check:remote-assignment-image-drift',
)
assert(
  String(packageJson.scripts.test || '').includes('npm run check:remote-assignment-image-drift'),
  'root npm run test must include check:remote-assignment-image-drift',
)
assert(read('.gitignore').includes(assignmentRel), `${assignmentRel} must stay ignored by Git`)

const head = currentHead()
if (!head) {
  const artifact = {
    version: 1,
    gate: 'P113_REMOTE_ASSIGNMENT_IMAGE_DRIFT_GATE',
    status: 'passed_with_source_workspace_no_git',
    generatedAt: new Date().toISOString(),
    assignmentPath: assignmentRel,
    currentHead: null,
    decision: 'source_workspace_no_git',
    localAssignmentFilePresent: existsSync(assignmentPath),
    imageDriftDetected: false,
    writesLocalAssignment: false,
  }
  const artifactPath = writeArtifact(artifact)
  console.log(JSON.stringify({ ...artifact, artifactPath: relative(root, artifactPath) }, null, 2))
  process.exit(0)
}

const evidence = latestRuntimeImageEvidence(head)
if (!existsSync(assignmentPath)) {
  const artifact = {
    version: 1,
    gate: 'P113_REMOTE_ASSIGNMENT_IMAGE_DRIFT_GATE',
    status: 'passed_waiting_for_local_assignment',
    generatedAt: new Date().toISOString(),
    assignmentPath: assignmentRel,
    currentHead: head,
    decision: 'remote_assignment_local_absent',
    localAssignmentFilePresent: false,
    imageDriftDetected: false,
    writesLocalAssignment: false,
    nextCommand: 'npm run prepare:remote-assignment-local',
  }
  const artifactPath = writeArtifact(artifact)
  console.log(JSON.stringify({ ...artifact, artifactPath: relative(root, artifactPath) }, null, 2))
  process.exit(0)
}

assert(evidence, `missing current-head P72 image evidence for ${head}; run npm run check:runtime-image-publish-evidence`)
const expectedApiImage = imageFor(evidence.payload, 'api')
const expectedAgentImage = imageFor(evidence.payload, 'agent')
assert(expectedApiImage, 'current P72 evidence missing API image')
assert(expectedAgentImage, 'current P72 evidence missing Agent Runtime image')

const assignment = JSON.parse(readFileSync(assignmentPath, 'utf8'))
const privateHits = scanNoPrivateTerms(assignment)
assert(privateHits.length === 0, `local assignment leaked private terms: ${privateHits.join(', ')}`)

const actualApiImage = assignment.services?.api?.image || ''
const actualAgentImage = assignment.services?.agent?.image || ''
const drift = []
if (actualApiImage !== expectedApiImage) drift.push('api-image')
if (actualAgentImage !== expectedAgentImage) drift.push('agent-image')

const placeholderStages = []
for (const [id, value] of [
  ['operator-owner', assignment.operator?.owner],
  ['operator-provider', assignment.operator?.provider],
  ['api-service-id', assignment.services?.api?.serviceId],
  ['api-origin', assignment.services?.api?.origin],
  ['agent-service-id', assignment.services?.agent?.serviceId],
  ['agent-origin', assignment.services?.agent?.origin],
]) {
  if (hasPlaceholder(value)) placeholderStages.push(id)
}

const artifact = {
  version: 1,
  gate: 'P113_REMOTE_ASSIGNMENT_IMAGE_DRIFT_GATE',
  status: drift.length ? 'failed' : 'passed',
  generatedAt: new Date().toISOString(),
  assignmentPath: assignmentRel,
  currentHead: head,
  imageEvidence: relative(root, evidence.file),
  decision: drift.length ? 'remote_assignment_image_drift_detected' : 'remote_assignment_images_current',
  localAssignmentFilePresent: true,
  imageDriftDetected: drift.length > 0,
  driftStages: drift,
  placeholderStages,
  providerSecretsConfigured: {
    api: assignment.services?.api?.providerSecretsConfigured === true,
    agent: assignment.services?.agent?.providerSecretsConfigured === true,
  },
  expectedImages: {
    api: expectedApiImage,
    agent: expectedAgentImage,
  },
  actualImages: {
    api: actualApiImage,
    agent: actualAgentImage,
  },
  writesLocalAssignment: false,
  nextCommand: drift.length ? 'REMOTE_ASSIGNMENT_DRAFT_FORCE=true npm run prepare:remote-assignment-local' : 'REMOTE_RUNTIME_ASSIGNMENT_FILE=deploy/runtime-production/remote-assignment.local.json npm run check:remote-runtime-assignment-intake',
}

const artifactPath = writeArtifact(artifact)
if (drift.length) {
  console.error(JSON.stringify({ ...artifact, artifactPath: relative(root, artifactPath) }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ ...artifact, artifactPath: relative(root, artifactPath) }, null, 2))
