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
    /DATABASE_URL=(?!<)/,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/,
    /system prompt/i,
    /provider secret value/i,
    /reference-work-vault/i,
    /representative work/i,
    /rawState/i,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(String)
}

const requiredFiles = [
  'deploy/runtime-production/host-profiles.json',
  'deploy/runtime-production/origin.env.example',
  'deploy/api/Dockerfile',
  'deploy/agent-runtime/Dockerfile',
  'deploy/runtime-preview/docker-compose.yml',
  'docs/backend/P14_REMOTE_RUNTIME_DEPLOYMENT_PACKAGE.md',
  'docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md',
  'docs/backend/P66_REMOTE_RUNTIME_ORIGIN_PROVISIONING_GATE.md',
  'docs/backend/P69_REMOTE_RUNTIME_HOST_TARGET_GATE.md',
]

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `missing remote host target file: ${file}`)
}

const packageJson = readJson('package.json')
const hostProfiles = readJson('deploy/runtime-production/host-profiles.json')
const apiDockerfile = read('deploy/api/Dockerfile')
const agentDockerfile = read('deploy/agent-runtime/Dockerfile')

assert(
  packageJson.scripts['check:remote-host-target'] === 'node scripts/check-remote-host-target.mjs',
  'package.json must expose check:remote-host-target',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-host-target'),
  'root npm run test must include check:remote-host-target',
)

assert(hostProfiles.version === 1, 'host profiles must use version 1')
assert(
  hostProfiles.defaultTarget === 'docker-compatible-two-service-paas',
  'default target must be docker-compatible-two-service-paas',
)
assert(
  hostProfiles.policy?.runtimeOwnership === 'fastapi_business_sovereign_agent_runtime_orchestrates',
  'host profile policy must preserve FastAPI runtime sovereignty',
)
assert(
  hostProfiles.policy?.secretsBoundary === 'provider_secret_store_only',
  'host profile policy must keep secrets in provider secret stores',
)
assert(
  hostProfiles.policy?.agentDatabaseAccess === 'forbidden',
  'host profile policy must forbid Agent Runtime direct database access',
)

const pagesVars = new Set((hostProfiles.publicPagesVariables || []).map(item => item.name))
for (const required of [
  'VITE_PUBLIC_RUNTIME_MODE',
  'VITE_API_ORIGIN',
  'VITE_AGENT_RUNTIME_BASE_URL',
  'VITE_API_BASE_URL',
  'VITE_ALLOW_LOCAL_CREATOR_FALLBACK',
]) {
  assert(pagesVars.has(required), `host profiles must declare Pages variable ${required}`)
}

const profiles = Array.isArray(hostProfiles.profiles) ? hostProfiles.profiles : []
assert(profiles.length >= 3, 'host profiles must include at least three deployment targets')
assert(
  profiles.some(profile => profile.id === hostProfiles.defaultTarget),
  'default target must exist in profiles',
)

for (const profile of profiles) {
  assert(/^[a-z0-9-]+$/.test(profile.id || ''), `invalid host profile id: ${profile.id}`)
  assert(profile.services?.api && profile.services?.agent, `${profile.id} must define api and agent services`)
  assert(Array.isArray(profile.activationOrder) && profile.activationOrder.includes('verify_health'), `${profile.id} must include health verification in activation order`)
  assert(profile.activationOrder.includes('run_remote_origin_gate'), `${profile.id} must feed P66 remote origin gate`)
  assert(profile.activationOrder.includes('run_live_runtime_browser_qa'), `${profile.id} must end with live runtime browser QA`)

  const api = profile.services.api
  const agent = profile.services.agent
  assert(api.owner === 'fastapi_business_runtime', `${profile.id} api owner must be fastapi_business_runtime`)
  assert(agent.owner === 'mastra_workflow_runtime', `${profile.id} agent owner must be mastra_workflow_runtime`)
  assert(api.dockerfile === 'deploy/api/Dockerfile', `${profile.id} api dockerfile mismatch`)
  assert(agent.dockerfile === 'deploy/agent-runtime/Dockerfile', `${profile.id} agent dockerfile mismatch`)
  assert(api.containerPort === 8787, `${profile.id} api port must be 8787`)
  assert(agent.containerPort === 4111, `${profile.id} agent port must be 4111`)
  assert(api.healthPath === '/health', `${profile.id} api health path must be /health`)
  assert(agent.healthPath === '/health', `${profile.id} agent health path must be /health`)

  for (const env of [
    'NARRATIVEOS_DEPLOY_ENV',
    'DATABASE_URL',
    'NARRATIVEOS_ALLOWED_ORIGINS',
  ]) {
    assert(api.requiredEnv.includes(env), `${profile.id} api requiredEnv missing ${env}`)
  }
  assert(api.secretEnv.includes('NARRATIVEOS_TOOL_BRIDGE_TOKEN'), `${profile.id} api secretEnv missing Tool Bridge token`)
  assert(api.publicEnv.length === 0, `${profile.id} api must not expose public env`)

  for (const env of [
    'NARRATIVEOS_DEPLOY_ENV',
    'NODE_ENV',
    'MASTRA_HOST',
    'MASTRA_PORT',
    'MASTRA_TOOL_BRIDGE_BASE_URL',
    'MASTRA_ALLOWED_ORIGINS',
  ]) {
    assert(agent.requiredEnv.includes(env), `${profile.id} agent requiredEnv missing ${env}`)
  }
  assert(agent.secretEnv.includes('MASTRA_TOOL_BRIDGE_TOKEN'), `${profile.id} agent secretEnv missing Tool Bridge token`)
  assert(agent.publicEnv.length === 0, `${profile.id} agent must not expose public env`)
}

assert(
  apiDockerfile.includes('COPY docs/product/rules /app/docs/product/rules')
    && agentDockerfile.includes('COPY docs/product/rules /app/docs/product/rules'),
  'both production Dockerfiles must copy runtime rules',
)

assertContains('docs/backend/P69_REMOTE_RUNTIME_HOST_TARGET_GATE.md', [
  'P69 Remote Runtime Host Target Gate',
  'docker-compatible-two-service-paas',
  'provider_secret_store_only',
  'check:remote-host-target',
  'P66 Remote Runtime Origin Provisioning Gate',
])
assertContains('docs/backend/P14_REMOTE_RUNTIME_DEPLOYMENT_PACKAGE.md', [
  'P69 Remote Runtime Host Target Gate',
  'deploy/runtime-production/host-profiles.json',
  'check:remote-host-target',
])
assertContains('docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md', [
  'Host Target Gate',
  'npm run check:remote-host-target',
  'deploy/runtime-production/host-profiles.json',
])
assertContains('docs/backend/P66_REMOTE_RUNTIME_ORIGIN_PROVISIONING_GATE.md', [
  'P69',
  'deploy/runtime-production/host-profiles.json',
  'check:remote-host-target',
])

const violations = noPrivateValues(hostProfiles)
assert(violations.length === 0, `host profiles contain private or forbidden values: ${violations.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifact = {
  generatedAt: new Date().toISOString(),
  status: 'passed',
  gate: 'P69 Remote Runtime Host Target Gate',
  defaultTarget: hostProfiles.defaultTarget,
  profileCount: profiles.length,
  decision: hostProfiles.decision,
  blockedUntil: hostProfiles.blockedUntil,
  nextGate: 'P66 Remote Runtime Origin Provisioning Gate',
}
const artifactPath = join(artifactDir, `remote-host-target-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: 'passed',
  artifactPath,
  defaultTarget: artifact.defaultTarget,
  profileCount: artifact.profileCount,
  nextGate: artifact.nextGate,
}, null, 2))
