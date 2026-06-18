#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const fixturePath = join(artifactDir, 'remote-assignment-placeholder-sentinel.fixture.json')

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function runNode(script, env = {}) {
  const output = execFileSync('node', [script], {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 120000,
  })
  const jsonStart = output.indexOf('{')
  assert(jsonStart >= 0, `${script} did not emit JSON`)
  return JSON.parse(output.slice(jsonStart))
}

function assertScriptHasPlaceholderSentinels(file) {
  const body = read(file)
  for (const term of ['FILL_', 'REPLACE_ME', 'YOUR[_-]', 'TODO[_-]']) {
    assert(body.includes(term), `${file} must recognize ${term} placeholder sentinels`)
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
    /OPENAI_API_KEY=/i,
    /DEEPSEEK_API_KEY=/i,
    /MOONSHOT_API_KEY=/i,
    /KIMI_API_KEY=/i,
    /ANTHROPIC_API_KEY=/i,
    /system prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

const requiredFiles = [
  'docs/backend/P110_RUNTIME_PLACEHOLDER_SENTINEL_GUARD.md',
  'scripts/check-remote-runtime-assignment-intake.mjs',
  'scripts/check-remote-assignment-execution-pack.mjs',
  'scripts/check-github-runtime-variable-boundary.mjs',
  'deploy/runtime-production/service-manifest.json',
  'package.json',
]
for (const file of requiredFiles) assert(existsSync(join(root, file)), `missing P110 file: ${file}`)

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:runtime-placeholder-sentinel'] === 'node scripts/check-runtime-placeholder-sentinel.mjs',
  'package.json must expose check:runtime-placeholder-sentinel',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:runtime-placeholder-sentinel'),
  'root npm run test must include check:runtime-placeholder-sentinel',
)

for (const file of [
  'scripts/check-remote-runtime-assignment-intake.mjs',
  'scripts/check-remote-assignment-execution-pack.mjs',
  'scripts/check-github-runtime-variable-boundary.mjs',
]) {
  assertScriptHasPlaceholderSentinels(file)
}

const manifest = readJson('deploy/runtime-production/service-manifest.json')
const apiImage = `${manifest.services.find(service => service.id === 'api').imageName}:runtime-latest`
const agentImage = `${manifest.services.find(service => service.id === 'agent').imageName}:runtime-latest`

const fixture = {
  version: 1,
  gate: 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE',
  repository: 'jzvcpe-goat/parallel-universe-novel',
  hostTargetProfile: manifest.hostTargetProfile,
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
      providerSecretsConfigured: true,
      healthPath: '/health',
    },
    agent: {
      serviceId: 'FILL_AGENT_SERVICE_ID',
      origin: 'https://FILL_AGENT_HOST',
      image: agentImage,
      providerSecretsConfigured: true,
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
    'P110 placeholder sentinel fixture. This must never be treated as a remote assignment.',
  ],
}

const privateMatches = scanNoPrivateTerms(fixture)
assert(privateMatches.length === 0, `P110 fixture contains private terms: ${privateMatches.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`)

const env = { REMOTE_RUNTIME_ASSIGNMENT_FILE: fixturePath }
const p75 = runNode('scripts/check-remote-runtime-assignment-intake.mjs', env)
const p79 = runNode('scripts/check-remote-assignment-execution-pack.mjs', env)

assert(p75.decision === 'remote_assignment_incomplete', `P75 must reject FILL_* placeholders as incomplete, got ${p75.decision}`)
assert(p79.decision === 'assignment_execution_incomplete', `P79 must reject FILL_* placeholders as incomplete, got ${p79.decision}`)

const p75Blocked = new Set(p75.blockedStages || [])
const p79Blocked = new Set(p79.blockedStages || [])
for (const stage of ['api-service-id', 'agent-service-id', 'api-origin', 'agent-origin']) {
  assert(p75Blocked.has(stage), `P75 placeholder fixture must block ${stage}`)
  assert(p79Blocked.has(stage), `P79 placeholder fixture must block ${stage}`)
}

const p110Doc = read('docs/backend/P110_RUNTIME_PLACEHOLDER_SENTINEL_GUARD.md')
for (const term of [
  'P110 Runtime Placeholder Sentinel Guard',
  'check:runtime-placeholder-sentinel',
  'FILL_*',
  'https://FILL_API_HOST',
  'remote_assignment_incomplete',
  'assignment_execution_incomplete',
]) {
  assert(p110Doc.includes(term), `P110 doc must include ${term}`)
}

const artifact = {
  status: 'passed',
  gate: 'P110_RUNTIME_PLACEHOLDER_SENTINEL_GUARD',
  generatedAt: new Date().toISOString(),
  fixturePath,
  p75Decision: p75.decision,
  p79Decision: p79.decision,
  p75BlockedStages: p75.blockedStages,
  p79BlockedStages: p79.blockedStages,
  sentinelTerms: ['<...>', 'FILL_*', 'REPLACE_ME', 'YOUR_*', 'TODO_*'],
}

const artifactPath = join(artifactDir, `runtime-placeholder-sentinel-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: 'passed',
  gate: artifact.gate,
  p75Decision: artifact.p75Decision,
  p79Decision: artifact.p79Decision,
  artifactPath,
}, null, 2))
