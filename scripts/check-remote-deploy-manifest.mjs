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

function assertContains(file, terms) {
  const body = read(file)
  for (const term of terms) assert(body.includes(term), `${file} must include ${term}`)
}

function noPrivateValues(payload) {
  const text = JSON.stringify(payload)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL=(?!["<])/,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/,
    /provider secret value/i,
    /system prompt/i,
    /reference-work-vault/i,
    /representative work/i,
    /rawState/i,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(String)
}

const requiredFiles = [
  'deploy/runtime-production/host-profiles.json',
  'deploy/runtime-production/service-manifest.json',
  'deploy/runtime-production/origin.env.example',
  'deploy/api/Dockerfile',
  'deploy/agent-runtime/Dockerfile',
  'docs/backend/P69_REMOTE_RUNTIME_HOST_TARGET_GATE.md',
  'docs/backend/P70_REMOTE_RUNTIME_DEPLOY_MANIFEST_GATE.md',
  'docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md',
  'docs/backend/P66_REMOTE_RUNTIME_ORIGIN_PROVISIONING_GATE.md',
]

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `missing remote deploy manifest file: ${file}`)
}

const packageJson = readJson('package.json')
const hostProfiles = readJson('deploy/runtime-production/host-profiles.json')
const manifest = readJson('deploy/runtime-production/service-manifest.json')

assert(
  packageJson.scripts['check:remote-deploy-manifest'] === 'node scripts/check-remote-deploy-manifest.mjs',
  'package.json must expose check:remote-deploy-manifest',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-deploy-manifest'),
  'root npm run test must include check:remote-deploy-manifest',
)

assert(manifest.version === 1, 'service manifest must use version 1')
assert(manifest.gate === 'P70_REMOTE_RUNTIME_DEPLOY_MANIFEST_GATE', 'service manifest gate mismatch')
assert(
  manifest.hostTargetProfile === hostProfiles.defaultTarget,
  'service manifest must target the default host profile selected by P69',
)
assert(
  manifest.deploymentBoundary?.runtimeOwnership === hostProfiles.policy?.runtimeOwnership,
  'service manifest must preserve runtime ownership from host profile policy',
)
assert(
  manifest.deploymentBoundary?.agentDatabaseAccess === 'forbidden',
  'service manifest must forbid direct Agent Runtime database access',
)
assert(
  manifest.deploymentBoundary?.serviceSecrets === 'provider_secret_store_only',
  'service manifest must keep service secrets in provider secret stores',
)

const services = Array.isArray(manifest.services) ? manifest.services : []
assert(services.length === 2, 'service manifest must define exactly API and Agent services')
const serviceMap = new Map(services.map(service => [service.id, service]))
const api = serviceMap.get('api')
const agent = serviceMap.get('agent')
assert(api && agent, 'service manifest must include api and agent services')

assert(api.role === 'fastapi_business_runtime', 'api service role mismatch')
assert(api.dockerfile === 'deploy/api/Dockerfile', 'api dockerfile mismatch')
assert(api.containerPort === 8787, 'api port must be 8787')
assert(api.healthPath === '/health', 'api health path must be /health')
assert(api.publicOriginVariable === 'VITE_API_ORIGIN', 'api must map to VITE_API_ORIGIN')
assert(api.publicBaseUrlVariable === 'VITE_API_BASE_URL', 'api must map to VITE_API_BASE_URL')
assert(api.requiredSecretEnv.includes('DATABASE_URL'), 'api must require DATABASE_URL as provider secret')
assert(api.requiredSecretEnv.includes('NARRATIVEOS_TOOL_BRIDGE_TOKEN'), 'api must require Tool Bridge token as provider secret')
assert(api.publicPagesEnv.length === 0, 'api must not expose public Pages env directly')

assert(agent.role === 'mastra_workflow_runtime', 'agent service role mismatch')
assert(agent.dockerfile === 'deploy/agent-runtime/Dockerfile', 'agent dockerfile mismatch')
assert(agent.containerPort === 4111, 'agent port must be 4111')
assert(agent.healthPath === '/health', 'agent health path must be /health')
assert(agent.publicOriginVariable === 'VITE_AGENT_RUNTIME_BASE_URL', 'agent must map to VITE_AGENT_RUNTIME_BASE_URL')
assert(agent.dependsOn.includes('api'), 'agent must depend on api')
assert(agent.requiredRuntimeEnv.includes('MASTRA_TOOL_BRIDGE_BASE_URL=https://<api-host>'), 'agent must call API through remote Tool Bridge URL')
assert(agent.requiredSecretEnv.includes('MASTRA_TOOL_BRIDGE_TOKEN'), 'agent must require Tool Bridge token as provider secret')
assert(agent.publicPagesEnv.length === 0, 'agent must not expose public Pages env directly')

const pagesVars = new Map((manifest.githubPagesVariables || []).map(item => [item.name, item]))
for (const required of [
  'VITE_PUBLIC_RUNTIME_MODE',
  'VITE_API_ORIGIN',
  'VITE_AGENT_RUNTIME_BASE_URL',
  'VITE_ALLOW_LOCAL_CREATOR_FALLBACK',
]) {
  assert(pagesVars.has(required), `service manifest missing GitHub Pages variable ${required}`)
}
assert(pagesVars.get('VITE_PUBLIC_RUNTIME_MODE')?.value === 'live', 'Pages live mode must be explicit')
assert(pagesVars.get('VITE_ALLOW_LOCAL_CREATOR_FALLBACK')?.value === 'false', 'public fallback must stay false')

const forbiddenPublic = new Set(manifest.forbiddenPublicVariables || [])
for (const forbidden of [
  'DATABASE_URL',
  'NARRATIVEOS_TOOL_BRIDGE_TOKEN',
  'MASTRA_TOOL_BRIDGE_TOKEN',
  'REFERENCE_WORK_VAULT_KEY',
]) {
  assert(forbiddenPublic.has(forbidden), `forbidden public variables must include ${forbidden}`)
}

for (const command of [
  'npm run check:remote-host-target',
  'npm run check:runtime-deploy-readiness',
  'npm run check:runtime-preview-compose',
]) {
  assert(manifest.preflightCommands.includes(command), `preflightCommands missing ${command}`)
}
for (const command of [
  'npm run check:remote-origin-provisioning',
  'npm run audit:live-runtime-readiness',
  'npm run qa:live-runtime-browser',
]) {
  assert(manifest.postProvisionCommands.includes(command), `postProvisionCommands missing ${command}`)
}

assertContains('docs/backend/P70_REMOTE_RUNTIME_DEPLOY_MANIFEST_GATE.md', [
  'P70 Remote Runtime Deploy Manifest Gate',
  'deploy/runtime-production/service-manifest.json',
  'check:remote-deploy-manifest',
  'provider_secret_store_only',
  'P66 Remote Runtime Origin Provisioning Gate',
])
assertContains('docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md', [
  'Deploy Manifest Gate',
  'npm run check:remote-deploy-manifest',
  'deploy/runtime-production/service-manifest.json',
])
assertContains('docs/backend/P66_REMOTE_RUNTIME_ORIGIN_PROVISIONING_GATE.md', [
  'check:remote-deploy-manifest',
  'deploy/runtime-production/service-manifest.json',
])

const violations = noPrivateValues(manifest)
assert(violations.length === 0, `remote deploy manifest contains private or forbidden values: ${violations.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifact = {
  generatedAt: new Date().toISOString(),
  status: 'passed',
  gate: 'P70 Remote Runtime Deploy Manifest Gate',
  hostTargetProfile: manifest.hostTargetProfile,
  services: services.map(service => ({
    id: service.id,
    role: service.role,
    dockerfile: service.dockerfile,
    containerPort: service.containerPort,
    healthPath: service.healthPath,
  })),
  nextGate: 'P66 Remote Runtime Origin Provisioning Gate',
}
const artifactPath = join(artifactDir, `remote-deploy-manifest-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: 'passed',
  artifactPath,
  hostTargetProfile: artifact.hostTargetProfile,
  services: artifact.services.map(service => service.id),
  nextGate: artifact.nextGate,
}, null, 2))
