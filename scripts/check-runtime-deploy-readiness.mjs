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

const files = [
  'deploy/api/Dockerfile',
  'deploy/agent-runtime/Dockerfile',
  'deploy/runtime-preview/docker-compose.yml',
  'docs/backend/P14_REMOTE_RUNTIME_DEPLOYMENT_PACKAGE.md',
]

for (const file of files) {
  assert(existsSync(join(root, file)), `missing deployment file: ${file}`)
}

const agentPackage = JSON.parse(read('packages/agent-runtime/package.json'))
const agentServer = read('packages/agent-runtime/src/server.ts')
const apiFactory = read('backend/src/narrativeos/api/app_factory.py')
const apiDockerfile = read('deploy/api/Dockerfile')
const agentDockerfile = read('deploy/agent-runtime/Dockerfile')
const compose = read('deploy/runtime-preview/docker-compose.yml')
const contract = read('docs/backend/P14_REMOTE_RUNTIME_DEPLOYMENT_PACKAGE.md')
const packageJson = JSON.parse(read('package.json'))

assert(
  agentPackage.scripts.start === 'node dist/server.js',
  'Agent Runtime must expose a production start script',
)
assert(
  agentServer.includes("process.env.MASTRA_HOST || '127.0.0.1'")
    && agentServer.includes("process.env.MASTRA_PORT || 4111"),
  'Agent Runtime must keep host/port configurable via env',
)
assert(
  agentServer.includes("url.pathname === '/health'"),
  'Agent Runtime must expose /health',
)
assert(
  apiFactory.includes('@app.get("/health")'),
  'FastAPI runtime must expose /health',
)
assert(
  apiFactory.includes('https://jzvcpe-goat.github.io'),
  'FastAPI default CORS origins must include the GitHub Pages origin',
)
assert(
  apiDockerfile.includes('uvicorn')
    && apiDockerfile.includes('--host", "0.0.0.0"')
    && apiDockerfile.includes('--port", "8787"'),
  'API Dockerfile must run FastAPI on 0.0.0.0:8787',
)
assert(
  agentDockerfile.includes('MASTRA_HOST=0.0.0.0')
    && agentDockerfile.includes('MASTRA_PORT=4111')
    && agentDockerfile.includes('run", "start"'),
  'Agent Dockerfile must run the production start script on 0.0.0.0:4111',
)
assert(
  compose.includes('FASTAPI_TOOL_BRIDGE_BASE_URL: http://api:8787')
    && compose.includes('http://127.0.0.1:8787/health')
    && compose.includes('http://127.0.0.1:4111/health'),
  'Runtime preview compose must wire agents to API and define health checks',
)
assert(
  contract.includes('FastAPI business runtime')
    && contract.includes('Agent Runtime')
    && contract.includes('Idempotency-Key'),
  'P14 deployment package doc must describe service ownership and idempotent write boundary',
)
assert(
  packageJson.scripts['check:runtime-deploy-readiness'] === 'node scripts/check-runtime-deploy-readiness.mjs',
  'package.json must expose check:runtime-deploy-readiness',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:runtime-deploy-readiness'),
  'npm run test must include check:runtime-deploy-readiness',
)

console.log(JSON.stringify({
  status: 'passed',
  checked: files,
  services: ['api:8787', 'agents:4111'],
}, null, 2))
