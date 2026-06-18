#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const requiredFiles = [
  '.github/workflows/runtime-images.yml',
  '.github/workflows/pages.yml',
  'docs/backend/P16_PAGES_LIVE_RELEASE_GATE.md',
  'docs/backend/P71_RUNTIME_IMAGE_PUBLISH_GATE.md',
  'docs/backend/P72_RUNTIME_IMAGE_PUBLISH_EVIDENCE_GATE.md',
  'docs/backend/P99_RELEASE_WORKFLOW_ORDERING_GATE.md',
  'package.json',
]

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `missing release workflow ordering prerequisite: ${file}`)
}

const runtimeImages = read('.github/workflows/runtime-images.yml')
const pages = read('.github/workflows/pages.yml')
const p16 = read('docs/backend/P16_PAGES_LIVE_RELEASE_GATE.md')
const p71 = read('docs/backend/P71_RUNTIME_IMAGE_PUBLISH_GATE.md')
const p72 = read('docs/backend/P72_RUNTIME_IMAGE_PUBLISH_EVIDENCE_GATE.md')
const p99 = read('docs/backend/P99_RELEASE_WORKFLOW_ORDERING_GATE.md')
const packageJson = JSON.parse(read('package.json'))

assert(
  runtimeImages.includes('name: Publish Runtime Images')
    && runtimeImages.includes('push:')
    && runtimeImages.includes('branches:')
    && runtimeImages.includes('- main')
    && runtimeImages.includes('workflow_dispatch:')
    && runtimeImages.includes('packages: write')
    && runtimeImages.includes('parallel-universe-novel-api')
    && runtimeImages.includes('parallel-universe-novel-agent-runtime'),
  'Publish Runtime Images workflow must publish current-head images automatically on main push and manually on dispatch',
)
assert(
  runtimeImages.includes('concurrency:')
    && runtimeImages.includes('runtime-images-${{ github.ref }}')
    && runtimeImages.includes('cancel-in-progress: true'),
  'Publish Runtime Images workflow must cancel stale same-ref image runs',
)
assert(
  pages.includes('workflow_run:')
    && pages.includes('workflows:')
    && pages.includes('- Publish Runtime Images')
    && pages.includes('types:')
    && pages.includes('- completed')
    && pages.includes('workflow_dispatch:'),
  'Pages workflow must deploy after Publish Runtime Images completes and still support manual dispatch',
)
assert(
  !/^  push:/m.test(pages),
  'Pages workflow must not deploy directly from push; it must wait for runtime image evidence ordering',
)
assert(
  pages.includes("if: ${{ github.event_name != 'workflow_run' || github.event.workflow_run.conclusion == 'success' }}"),
  'Pages build job must ignore failed runtime image workflow_run events',
)
assert(
  pages.includes('ref: ${{ github.event.workflow_run.head_sha || github.sha }}'),
  'Pages checkout must use the runtime image workflow head SHA for ordered deployments',
)
assert(
  pages.indexOf('Run runtime checks') < pages.indexOf('Build Creator Studio')
    && pages.indexOf('Check remote runtime blocker artifact content') > pages.indexOf('Upload artifact'),
  'Pages workflow must preserve runtime checks before build and current-run artifact checks after upload',
)
assert(
  packageJson.scripts['check:release-workflow-ordering'] === 'node scripts/check-release-workflow-ordering.mjs',
  'package.json must expose check:release-workflow-ordering',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:release-workflow-ordering'),
  'root npm run test must include check:release-workflow-ordering',
)

for (const [label, doc, required] of [
  ['P16', p16, ['workflow_run', 'Publish Runtime Images', 'does not deploy directly from `push`', 'check:release-workflow-ordering']],
  ['P71', p71, ['push` to `main`', 'workflow_dispatch', 'P99 Release Workflow Ordering Gate']],
  ['P72', p72, ['P99 Release Workflow Ordering Gate', 'Pages deploys only after current-head image evidence is available']],
  ['P99', p99, ['P99 Release Workflow Ordering Gate', 'workflow_run', 'github.event.workflow_run.head_sha', 'does not contain a direct `push` trigger']],
]) {
  for (const phrase of required) {
    assert(doc.includes(phrase), `${label} doc must include ${phrase}`)
  }
}

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `release-workflow-ordering-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
const artifact = {
  version: 1,
  gate: 'P99_RELEASE_WORKFLOW_ORDERING_GATE',
  generatedAt: new Date().toISOString(),
  status: 'passed',
  ordering: {
    runtimeImagesTrigger: 'push_main_or_workflow_dispatch',
    pagesTrigger: 'workflow_run_after_publish_runtime_images_or_workflow_dispatch',
    directPagesPush: false,
    checkoutRef: 'github.event.workflow_run.head_sha || github.sha',
  },
  nextGate: 'P90 Remote Runtime Blocker Artifact Attestation',
}
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: 'passed',
  gate: artifact.gate,
  artifactPath: relative(root, artifactPath),
  ordering: artifact.ordering,
}, null, 2))
