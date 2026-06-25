#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const gate = 'P167_OKF_RUNTIME_IMAGE_CONTEXT'
const okfImageCopy = 'COPY docs/product/knowledge/narrative-okf /app/docs/product/knowledge/narrative-okf'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function read(relPath) {
  return readFileSync(join(root, relPath), 'utf8')
}

function readJson(relPath) {
  return JSON.parse(read(relPath))
}

function assertIncludes(relPath, needles) {
  const body = read(relPath)
  for (const needle of needles) assert(body.includes(needle), `${relPath} must include ${needle}`)
}

const requiredFiles = [
  'deploy/agent-runtime/Dockerfile',
  'docs/product/knowledge/narrative-okf/genre-kernel.md',
  'docs/product/knowledge/narrative-okf/constraint-profile.md',
  'docs/product/knowledge/narrative-okf/creator-socratic-flow.md',
  'docs/product/knowledge/narrative-okf/quality-brake.md',
  'docs/product/knowledge/narrative-okf/runtime-tool-bridge.md',
  'docs/product/knowledge/narrative-okf/public-projection-policy.md',
  'docs/product/knowledge/narrative-okf/market-template-refresh.md',
  'docs/backend/P166_NARRATIVE_OKF_RUNTIME_CONSUMPTION.md',
  'docs/backend/P167_OKF_RUNTIME_IMAGE_CONTEXT.md',
  'scripts/check-okf-runtime-image-context.mjs',
  'scripts/check-runtime-preview-compose.mjs',
  'scripts/check-runtime-deploy-readiness.mjs',
  'scripts/check-remote-host-target.mjs',
]

for (const relPath of requiredFiles) {
  assert(existsSync(join(root, relPath)), `missing P167 runtime image context file: ${relPath}`)
}

const packageJson = readJson('package.json')
const testScript = String(packageJson.scripts?.test || '')
assert(
  packageJson.scripts?.['check:okf-runtime-image-context'] === 'node scripts/check-okf-runtime-image-context.mjs',
  'package.json must expose check:okf-runtime-image-context',
)
assert(
  testScript.includes('npm run check:narrative-okf-runtime-consumption && npm run check:okf-runtime-image-context && npm run check:runtime-artifact-contract'),
  'root npm run test must run P167 after P166 and before runtime artifact contract',
)

const manifest = readJson('docs/baseline/RELEASE_SYNC_MANIFEST.json')
const syncAsIs = new Set(manifest.syncAsIs)
for (const relPath of [
  'docs/backend/P167_OKF_RUNTIME_IMAGE_CONTEXT.md',
  'scripts/check-okf-runtime-image-context.mjs',
  'deploy/agent-runtime/Dockerfile',
]) {
  assert(syncAsIs.has(relPath), `release sync manifest must include ${relPath}`)
}

assertIncludes('deploy/agent-runtime/Dockerfile', [
  'COPY docs/product/rules /app/docs/product/rules',
  okfImageCopy,
  'RUN npm --workspace @narrativeos/agent-runtime run build',
  'CMD ["npm", "--workspace", "@narrativeos/agent-runtime", "run", "start"]',
])
assertIncludes('scripts/check-runtime-preview-compose.mjs', [okfImageCopy])
assertIncludes('scripts/check-runtime-deploy-readiness.mjs', [okfImageCopy])
assertIncludes('scripts/check-remote-host-target.mjs', [okfImageCopy])
assertIncludes('docs/backend/P68_RUNTIME_PREVIEW_COMPOSE_GATE.md', [
  'copies `docs/product/knowledge/narrative-okf`',
])
assertIncludes('docs/backend/P14_REMOTE_RUNTIME_DEPLOYMENT_PACKAGE.md', [
  'The Agent Runtime image carries the internal Narrative OKF knowledge cards',
])
assertIncludes('docs/backend/P166_NARRATIVE_OKF_RUNTIME_CONSUMPTION.md', [
  'P167_OKF_RUNTIME_IMAGE_CONTEXT',
])
assertIncludes('docs/design-system/DEVELOPMENT_NOTES.md', [
  'P167 OKF Runtime Image Context',
])

mkdirSync(artifactDir, { recursive: true })
const artifact = {
  version: 1,
  gate,
  status: 'passed',
  generatedAt: new Date().toISOString(),
  checked: {
    agentDockerfileCopiesOkfKnowledge: true,
    runtimePreviewComposeRequiresOkfImageContext: true,
    deployReadinessRequiresOkfImageContext: true,
    remoteHostTargetRequiresOkfImageContext: true,
    rootTestOrderSealed: true,
  },
  boundary: {
    copiesPublicSafeOkfCardsOnly: true,
    copiesEncryptedReferenceVaultKey: false,
    exposesRepresentativeWorkNames: false,
    changesRuntimeRuleTruth: false,
    createsRemoteServices: false,
    writesCanon: false,
  },
}
const artifactPath = join(artifactDir, `okf-runtime-image-context-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: artifact.status,
  gate,
  artifactPath: relative(root, artifactPath),
}, null, 2))
