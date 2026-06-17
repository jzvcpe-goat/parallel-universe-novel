#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const requiredFiles = [
  'docs/backend/P13_PUBLIC_RUNTIME_PREVIEW_CONTRACT.md',
  'docs/backend/P14_REMOTE_RUNTIME_DEPLOYMENT_PACKAGE.md',
  'docs/backend/P15_LIVE_RUNTIME_SMOKE_CONTRACT.md',
  'docs/backend/P16_PAGES_LIVE_RELEASE_GATE.md',
  'docs/backend/P19_PUBLIC_LIVE_RUNTIME_CONFIG_AUDIT.md',
  'docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md',
  'docs/backend/P23_LIVE_RUNTIME_READINESS_LEDGER.md',
  'deploy/runtime-preview/docker-compose.yml',
  'packages/agent-runtime/src/server.ts',
  'packages/agent-runtime/src/toolBridge.ts',
  'backend/src/narrativeos/api/app_factory.py',
  '.github/workflows/pages.yml',
  'scripts/audit-live-runtime-readiness.mjs',
  'scripts/check-runtime-readiness-ledger.mjs',
]

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `missing activation artifact: ${file}`)
}

const packageJson = JSON.parse(read('package.json'))
const p14 = read('docs/backend/P14_REMOTE_RUNTIME_DEPLOYMENT_PACKAGE.md')
const p20 = read('docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md')
const p23 = read('docs/backend/P23_LIVE_RUNTIME_READINESS_LEDGER.md')
const compose = read('deploy/runtime-preview/docker-compose.yml')
const agentServer = read('packages/agent-runtime/src/server.ts')
const toolBridge = read('packages/agent-runtime/src/toolBridge.ts')
const apiFactory = read('backend/src/narrativeos/api/app_factory.py')
const workflow = read('.github/workflows/pages.yml')
const liveQa = read('scripts/browser-live-runtime-e2e.mjs')

assert(
  packageJson.scripts['check:runtime-activation-package'] === 'node scripts/check-runtime-activation-package.mjs',
  'package.json must expose check:runtime-activation-package',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:runtime-activation-package'),
  'npm run test must include check:runtime-activation-package',
)
assert(
  packageJson.scripts['audit:live-runtime-readiness'] === 'node scripts/audit-live-runtime-readiness.mjs',
  'package.json must expose audit:live-runtime-readiness',
)
assert(
  packageJson.scripts['check:runtime-readiness-ledger'] === 'node scripts/check-runtime-readiness-ledger.mjs',
  'package.json must expose check:runtime-readiness-ledger',
)
assert(
  String(packageJson.scripts.test).includes('npm run audit:live-runtime-readiness && npm run check:runtime-readiness-ledger'),
  'npm run test must generate and validate the readiness ledger before continuing',
)
assert(
  String(packageJson.scripts.test).includes('npm run smoke:creator-chain'),
  'npm run test must include smoke:creator-chain so API + Agent + Tool Bridge are exercised in one gate',
)
assert(
  compose.includes('MASTRA_TOOL_BRIDGE_BASE_URL: http://api:8787')
    && !compose.includes('FASTAPI_TOOL_BRIDGE_BASE_URL: http://api:8787'),
  'runtime preview compose must use MASTRA_TOOL_BRIDGE_BASE_URL, not the legacy FASTAPI_* name',
)
assert(
  compose.includes('MASTRA_ALLOWED_ORIGINS: http://127.0.0.1:5173,https://jzvcpe-goat.github.io'),
  'runtime preview compose must configure Agent Runtime CORS for local creator and GitHub Pages',
)
assert(
  toolBridge.includes('process.env.MASTRA_TOOL_BRIDGE_BASE_URL')
    && toolBridge.includes('process.env.FASTAPI_TOOL_BRIDGE_BASE_URL'),
  'Tool Bridge client must prefer MASTRA_TOOL_BRIDGE_BASE_URL while retaining legacy compatibility',
)
assert(
  agentServer.includes('MASTRA_ALLOWED_ORIGINS')
    && agentServer.includes('Vary')
    && agentServer.includes('Idempotency-Key'),
  'Agent Runtime must expose configurable CORS and allow Idempotency-Key headers',
)
assert(
  apiFactory.includes('NARRATIVEOS_ALLOWED_ORIGINS')
    && apiFactory.includes('https://jzvcpe-goat.github.io')
    && apiFactory.includes('CORSMiddleware'),
  'FastAPI runtime must support GitHub Pages CORS via NARRATIVEOS_ALLOWED_ORIGINS',
)
assert(
  p14.includes('MASTRA_TOOL_BRIDGE_BASE_URL=https://<api-host>')
    && p14.includes('MASTRA_ALLOWED_ORIGINS=https://jzvcpe-goat.github.io'),
  'P14 deployment package must document Agent bridge and CORS env vars',
)
for (const required of [
  'Activation Sequence',
  'GitHub Repository Variables',
  'CORS Contract',
  'Health Contract',
  'Live Smoke',
  'Rollback',
  'Acceptance Evidence',
]) {
  assert(p20.includes(required), `P20 runbook must include ${required}`)
}
for (const command of [
  'npm run check:public-live-config',
  'npm run check:public-runtime-preview',
  'npm run qa:live-runtime-browser',
  'gh variable set VITE_PUBLIC_RUNTIME_MODE',
  'gh variable set VITE_API_ORIGIN',
  'gh variable set VITE_AGENT_RUNTIME_BASE_URL',
  'npm run audit:live-runtime-readiness',
]) {
  assert(p20.includes(command), `P20 runbook must include command: ${command}`)
}
for (const required of [
  'REQUIRE_LIVE_RUNTIME_READY=true',
  'artifacts/runtime/live-runtime-readiness',
  'check:runtime-readiness-ledger',
  'repoVariables.source',
  'health.api',
  'health.agent',
  'blockedChecks',
]) {
  assert(p23.includes(required), `P23 readiness ledger doc must include ${required}`)
}
assert(
  workflow.includes('REQUIRE_PUBLIC_RUNTIME=true npm run qa:live-runtime-browser')
    && workflow.includes('REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness')
    && workflow.includes('Upload runtime readiness ledger')
    && workflow.includes('artifacts/runtime/live-runtime-readiness-*.json')
    && workflow.includes('actions: read')
    && workflow.includes('GH_TOKEN: ${{ github.token }}')
    && workflow.includes('VITE_API_ORIGIN: ${{ vars.VITE_API_ORIGIN }}')
    && workflow.includes('VITE_AGENT_RUNTIME_BASE_URL: ${{ vars.VITE_AGENT_RUNTIME_BASE_URL }}')
    && workflow.includes("VITE_PUBLIC_RUNTIME_MODE: ${{ vars.VITE_PUBLIC_RUNTIME_MODE || 'disabled' }}"),
  'Pages workflow must gate live builds through readiness ledger, audit GitHub repo variables, upload the ledger artifact, and run live browser QA',
)
assert(
  workflow.includes('run: npm run test') && !workflow.includes('npm run smoke:creator-chain'),
  'Pages workflow must use root npm run test as the single runtime check entrypoint',
)
assert(
  liveQa.includes('创作服务可用')
    && liveQa.includes('VITE_ALLOW_LOCAL_CREATOR_FALLBACK')
    && liveQa.includes('draftLength >= 300'),
  'live browser QA must verify public service status, no local fallback, and candidate draft length',
)

console.log(JSON.stringify({
  status: 'passed',
  checked: requiredFiles,
  activationGate: 'remote runtime URLs + GitHub vars + live browser QA',
}, null, 2))
