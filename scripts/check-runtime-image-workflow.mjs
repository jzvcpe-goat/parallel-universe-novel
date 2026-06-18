#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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

const requiredFiles = [
  '.github/workflows/runtime-images.yml',
  'deploy/runtime-production/service-manifest.json',
  'docs/backend/P71_RUNTIME_IMAGE_PUBLISH_GATE.md',
]

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `missing runtime image workflow file: ${file}`)
}

const packageJson = readJson('package.json')
const workflow = read('.github/workflows/runtime-images.yml')
const manifest = readJson('deploy/runtime-production/service-manifest.json')
const p71 = read('docs/backend/P71_RUNTIME_IMAGE_PUBLISH_GATE.md')

assert(
  packageJson.scripts['check:runtime-image-workflow'] === 'node scripts/check-runtime-image-workflow.mjs',
  'package.json must expose check:runtime-image-workflow',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:runtime-image-workflow'),
  'root npm run test must include check:runtime-image-workflow',
)

for (const required of [
  'name: Publish Runtime Images',
  'workflow_dispatch:',
  'packages: write',
  'docker login "$REGISTRY"',
  'deploy/api/Dockerfile',
  'deploy/agent-runtime/Dockerfile',
  'parallel-universe-novel-api',
  'parallel-universe-novel-agent-runtime',
  'docker push',
  'runtime-latest',
]) {
  assert(workflow.includes(required), `runtime image workflow must include ${required}`)
}

for (const forbidden of [
  'DATABASE_URL',
  'NARRATIVEOS_TOOL_BRIDGE_TOKEN',
  'MASTRA_TOOL_BRIDGE_TOKEN',
  'NARRATIVEOS_CREATOR_API_KEY',
  'REFERENCE_WORK_VAULT_KEY',
]) {
  assert(!workflow.includes(forbidden), `runtime image workflow must not reference runtime secret ${forbidden}`)
}

const services = new Map((manifest.services || []).map(service => [service.id, service]))
const api = services.get('api')
const agent = services.get('agent')
assert(api?.imageName === 'ghcr.io/jzvcpe-goat/parallel-universe-novel-api', 'api imageName mismatch')
assert(agent?.imageName === 'ghcr.io/jzvcpe-goat/parallel-universe-novel-agent-runtime', 'agent imageName mismatch')
assert(api.imageTags.includes('runtime-latest') && agent.imageTags.includes('runtime-latest'), 'runtime images must include runtime-latest tag')
assert(
  manifest.preflightCommands.includes('npm run check:runtime-image-workflow'),
  'service manifest preflight must include check:runtime-image-workflow',
)

for (const required of [
  'P71 Runtime Image Publish Gate',
  'ghcr.io/jzvcpe-goat/parallel-universe-novel-api',
  'ghcr.io/jzvcpe-goat/parallel-universe-novel-agent-runtime',
  'provider secrets',
  'does not enable public live runtime',
]) {
  assert(p71.includes(required), `P71 doc must include ${required}`)
}

mkdirSync(artifactDir, { recursive: true })
const artifact = {
  generatedAt: new Date().toISOString(),
  status: 'passed',
  gate: 'P71 Runtime Image Publish Gate',
  workflow: '.github/workflows/runtime-images.yml',
  images: [
    api.imageName,
    agent.imageName,
  ],
  nextGate: 'P66 Remote Runtime Origin Provisioning Gate',
}
const artifactPath = join(artifactDir, `runtime-image-workflow-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: 'passed',
  artifactPath,
  workflow: artifact.workflow,
  images: artifact.images,
  nextGate: artifact.nextGate,
}, null, 2))
