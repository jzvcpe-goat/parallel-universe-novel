#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')
const targetRel = 'deploy/runtime-production/remote-assignment.local.json'
const targetPath = join(root, targetRel)
const checkOnly = process.argv.includes('--check') || process.env.REMOTE_ASSIGNMENT_DRAFT_CHECK === 'true'
const force = process.env.REMOTE_ASSIGNMENT_DRAFT_FORCE === 'true' || process.argv.includes('--force')

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

function latestArtifact(prefix, predicate = null) {
  if (!existsSync(artifactDir)) return null
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .map(name => join(artifactDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  for (const file of files) {
    const payload = JSON.parse(readFileSync(file, 'utf8'))
    if (!predicate || predicate(payload)) return { file, payload }
  }
  return null
}

function imageFor(payload, service) {
  const fragment = service === 'api'
    ? '/parallel-universe-novel-api:'
    : '/parallel-universe-novel-agent-runtime:'
  return (payload.images || []).find(item => String(item).includes(fragment))
}

function hasPlaceholder(value) {
  return /\bFILL_[A-Z0-9_]+\b/.test(String(value || ''))
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

function buildDraft({ runtimeImageEvidence, serviceManifest }) {
  const apiImage = imageFor(runtimeImageEvidence, 'api')
  const agentImage = imageFor(runtimeImageEvidence, 'agent')
  assert(apiImage, 'current runtime image evidence missing API image')
  assert(agentImage, 'current runtime image evidence missing Agent Runtime image')
  assert(apiImage.startsWith('ghcr.io/jzvcpe-goat/parallel-universe-novel-api:'), 'API image must use expected GHCR repository')
  assert(agentImage.startsWith('ghcr.io/jzvcpe-goat/parallel-universe-novel-agent-runtime:'), 'Agent image must use expected GHCR repository')

  return {
    version: 1,
    gate: 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE',
    repository: 'jzvcpe-goat/parallel-universe-novel',
    hostTargetProfile: serviceManifest.hostTargetProfile,
    operator: {
      owner: 'FILL_DEPLOYMENT_OWNER',
      provider: 'FILL_PROVIDER',
      environment: 'preview-or-production',
    },
    services: {
      api: {
        serviceId: 'FILL_API_SERVICE_ID',
        origin: 'https://FILL_API_HOST',
        image: apiImage,
        providerSecretsConfigured: false,
        healthPath: '/health',
      },
      agent: {
        serviceId: 'FILL_AGENT_SERVICE_ID',
        origin: 'https://FILL_AGENT_HOST',
        image: agentImage,
        providerSecretsConfigured: false,
        healthPath: '/health',
        dependsOn: ['api'],
      },
    },
    pagesVariablesAfterHealth: {
      VITE_PUBLIC_RUNTIME_MODE: 'live',
      VITE_API_ORIGIN: 'https://FILL_API_HOST',
      VITE_API_BASE_URL: 'https://FILL_API_HOST/v1',
      VITE_AGENT_RUNTIME_BASE_URL: 'https://FILL_AGENT_HOST',
    },
    notes: [
      'Prepared by P112. Fill only non-secret deployment evidence.',
      'Keep DATABASE_URL, Tool Bridge tokens, model keys, provider API tokens and private keys in provider secret stores only.',
      'This draft must remain remote_assignment_incomplete until real service ids, HTTPS origins and provider secret confirmations are filled.',
    ],
  }
}

function validateDraft(draft) {
  assert(draft.version === 1, 'draft version must be 1')
  assert(draft.gate === 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE', 'draft gate must remain P75')
  assert(draft.repository === 'jzvcpe-goat/parallel-universe-novel', 'draft repository mismatch')
  assert(hasPlaceholder(draft.operator.owner), 'draft owner must remain FILL placeholder')
  assert(hasPlaceholder(draft.operator.provider), 'draft provider must remain FILL placeholder')
  assert(hasPlaceholder(draft.services.api.serviceId), 'draft API serviceId must remain FILL placeholder')
  assert(hasPlaceholder(draft.services.agent.serviceId), 'draft Agent serviceId must remain FILL placeholder')
  assert(hasPlaceholder(draft.services.api.origin), 'draft API origin must remain FILL placeholder')
  assert(hasPlaceholder(draft.services.agent.origin), 'draft Agent origin must remain FILL placeholder')
  assert(draft.services.api.providerSecretsConfigured === false, 'draft API provider secret flag must be false')
  assert(draft.services.agent.providerSecretsConfigured === false, 'draft Agent provider secret flag must be false')
  assert(Array.isArray(draft.services.agent.dependsOn) && draft.services.agent.dependsOn.includes('api'), 'draft Agent must depend on API')
  const privateHits = scanNoPrivateTerms(draft)
  assert(privateHits.length === 0, `draft leaked private terms: ${privateHits.join(', ')}`)
}

for (const file of [
  '.gitignore',
  'deploy/runtime-production/service-manifest.json',
  'deploy/runtime-production/remote-assignment.schema.json',
  'deploy/runtime-production/remote-assignment.example.json',
  'docs/backend/P112_REMOTE_ASSIGNMENT_LOCAL_DRAFT_PREPARATION.md',
  'docs/backend/P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE.md',
  'docs/backend/P108_REMOTE_ASSIGNMENT_LOCAL_BOUNDARY_GUARD.md',
]) {
  assert(existsSync(join(root, file)), `missing P112 prerequisite: ${file}`)
}

const packageJson = readJson('package.json')
assert(packageJson.scripts['prepare:remote-assignment-local'] === 'node scripts/prepare-remote-assignment-local.mjs', 'package.json must expose prepare:remote-assignment-local')
assert(packageJson.scripts['check:remote-assignment-draft-prep'] === 'node scripts/prepare-remote-assignment-local.mjs --check', 'package.json must expose check:remote-assignment-draft-prep')
assert(String(packageJson.scripts.test || '').includes('npm run check:remote-assignment-draft-prep'), 'root npm run test must include check:remote-assignment-draft-prep')

const gitignore = read('.gitignore')
assert(gitignore.includes(targetRel), `${targetRel} must be ignored by Git`)
assert(gitignore.includes('deploy/runtime-production/remote-assignment.*.local.json'), 'remote assignment local glob must be ignored by Git')

const p112 = read('docs/backend/P112_REMOTE_ASSIGNMENT_LOCAL_DRAFT_PREPARATION.md')
for (const term of [
  'P112 Remote Assignment Local Draft Preparation',
  'prepare:remote-assignment-local',
  'check:remote-assignment-draft-prep',
  targetRel,
  'remote_assignment_incomplete',
  'providerSecretsConfigured: false',
]) {
  assert(p112.includes(term), `P112 doc must include ${term}`)
}

const head = currentHead()
if (!head) {
  if (checkOnly) {
    console.log(JSON.stringify({
      status: 'passed_with_source_workspace_no_git',
      mode: 'check',
      targetPath: targetRel,
      currentHead: null,
      imageEvidence: null,
      writesLocalAssignment: false,
      note: 'Source workspace has no git head; release repo or explicit RUNTIME_IMAGE_HEAD_SHA is required to prepare image-filled local assignment.',
    }, null, 2))
    process.exit(0)
  }
  throw new Error('missing git head; run from the release repo or set RUNTIME_IMAGE_HEAD_SHA before preparing local assignment')
}

const runtimeImageArtifact = latestArtifact('runtime-image-publish-evidence-', payload =>
  payload.status === 'passed'
    && payload.headSha === head
    && Array.isArray(payload.images)
    && payload.images.length >= 2,
)
assert(runtimeImageArtifact, `missing current-head P72 image evidence for ${head}; run npm run check:runtime-image-publish-evidence first`)

const serviceManifest = readJson('deploy/runtime-production/service-manifest.json')
const draft = buildDraft({ runtimeImageEvidence: runtimeImageArtifact.payload, serviceManifest })
validateDraft(draft)

if (checkOnly) {
  console.log(JSON.stringify({
    status: 'passed',
    mode: 'check',
    targetPath: targetRel,
    currentHead: head,
    imageEvidence: relative(root, runtimeImageArtifact.file),
    writesLocalAssignment: false,
  }, null, 2))
  process.exit(0)
}

if (existsSync(targetPath) && !force) {
  throw new Error(`${targetRel} already exists; set REMOTE_ASSIGNMENT_DRAFT_FORCE=true to overwrite`)
}

mkdirSync(dirname(targetPath), { recursive: true })
writeFileSync(targetPath, `${JSON.stringify(draft, null, 2)}\n`)

console.log(JSON.stringify({
  status: 'passed',
  mode: 'prepared',
  targetPath: targetRel,
  currentHead: head,
  imageEvidence: relative(root, runtimeImageArtifact.file),
  expectedDecisionBeforeOperatorFill: 'remote_assignment_incomplete',
  nextCommand: 'REMOTE_RUNTIME_ASSIGNMENT_FILE=deploy/runtime-production/remote-assignment.local.json npm run check:remote-runtime-assignment-intake',
}, null, 2))
