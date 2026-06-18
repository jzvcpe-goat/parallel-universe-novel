#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:net'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const composeFile = 'deploy/runtime-preview/docker-compose.yml'
const composePath = join(root, composeFile)
const projectName = `pun-runtime-preview-${Date.now()}`
const composeBaseArgs = ['compose', '-p', projectName, '-f', composePath]

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

function commandAvailable(command, args = ['--version']) {
  try {
    execFileSync(command, args, { cwd: root, stdio: 'pipe', timeout: 12000 })
    return true
  } catch {
    return false
  }
}

function dockerRuntimeAvailable() {
  return commandAvailable('docker')
    && commandAvailable('docker', ['compose', 'version'])
    && commandAvailable('docker', ['info'])
}

function docker(args, env, timeout = 600000) {
  return execFileSync('docker', args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    timeout,
  })
}

function errorText(error) {
  if (!error) return ''
  const parts = [
    error instanceof Error ? error.message : String(error),
    typeof error === 'object' && 'stdout' in error ? String(error.stdout || '') : '',
    typeof error === 'object' && 'stderr' in error ? String(error.stderr || '') : '',
  ]
  return parts.join('\n')
}

function isRegistryUnavailable(error) {
  return /registry-1\.docker\.io|docker\.io|failed to resolve source metadata|failed to resolve reference|TLS handshake timeout|i\/o timeout|EOF/i
    .test(errorText(error))
}

function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close(() => resolvePort(port))
    })
  })
}

async function fetchJson(url, timeoutMs = 5000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal })
    const text = await response.text()
    let payload = null
    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      payload = { raw: text.slice(0, 160) }
    }
    if (!response.ok) throw new Error(`${url} failed ${response.status}: ${JSON.stringify(payload)}`)
    return payload
  } finally {
    clearTimeout(timer)
  }
}

async function waitForJson(url, timeoutMs = 120000) {
  const started = Date.now()
  let lastError = ''
  while (Date.now() - started < timeoutMs) {
    try {
      return await fetchJson(url)
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    await delay(1000)
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}`)
}

async function postJson(url, payload, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(payload),
  })
  const text = await response.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text.slice(0, 160) }
  }
  if (!response.ok) throw new Error(`${url} failed ${response.status}: ${JSON.stringify(body)}`)
  return body
}

function scanNoPrivateTerms(payload) {
  const text = JSON.stringify(payload)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL=(?!<)/,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/,
    /system prompt/i,
    /provider secret/i,
    /reference-work-vault/i,
    /representative work/i,
    /rawState/i,
    /candidateDraft"\s*:\s*\{/i,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function validateStaticContract() {
  const packageJson = readJson('package.json')
  for (const file of [
    'deploy/api/Dockerfile',
    'deploy/agent-runtime/Dockerfile',
    composeFile,
    'docs/backend/P14_REMOTE_RUNTIME_DEPLOYMENT_PACKAGE.md',
    'docs/backend/P68_RUNTIME_PREVIEW_COMPOSE_GATE.md',
    'scripts/check-runtime-preview-compose.mjs',
  ]) {
    assert(existsSync(join(root, file)), `missing runtime preview compose file: ${file}`)
  }
  assert(
    packageJson.scripts['check:runtime-preview-compose'] === 'node scripts/check-runtime-preview-compose.mjs',
    'package.json must expose check:runtime-preview-compose',
  )
  assert(
    String(packageJson.scripts.test).includes('npm run check:runtime-preview-compose'),
    'root npm run test must include check:runtime-preview-compose',
  )
  assertContains(composeFile, [
    'RUNTIME_PREVIEW_API_PORT',
    'RUNTIME_PREVIEW_AGENT_PORT',
    'MASTRA_TOOL_BRIDGE_BASE_URL: http://api:8787',
    'NARRATIVEOS_TOOL_BRIDGE_TOKEN: dev-local-token',
    'MASTRA_TOOL_BRIDGE_TOKEN: dev-local-token',
    'MASTRA_DEBUG_RESPONSE_KEY: compose-debug-key',
    'condition: service_healthy',
  ])
  assertContains('deploy/api/Dockerfile', [
    'NARRATIVEOS_DEPLOY_ENV=production',
    'COPY docs/product/rules /app/docs/product/rules',
    'uvicorn',
    '0.0.0.0',
    '8787',
  ])
  assertContains('deploy/agent-runtime/Dockerfile', [
    'MASTRA_HOST=0.0.0.0',
    'MASTRA_PORT=4111',
    'NODE_ENV=production',
    'NARRATIVEOS_DEPLOY_ENV=production',
    'COPY docs/product/rules /app/docs/product/rules',
  ])
  assertContains('docs/backend/P68_RUNTIME_PREVIEW_COMPOSE_GATE.md', [
    'P68 Runtime Preview Compose Gate',
    'runtime_preview_compose_passed',
    'Tool Bridge',
    'candidate-only',
  ])
}

async function runComposeSmoke() {
  if (!dockerRuntimeAvailable()) {
    if (process.env.REQUIRE_RUNTIME_PREVIEW_COMPOSE === 'true') {
      throw new Error('Docker, docker compose, and a running Docker daemon are required for runtime preview compose smoke')
    }
    return {
      status: 'skipped',
      reason: 'docker_daemon_unavailable',
      apiPort: null,
      agentPort: null,
      health: {},
      workflow: {},
    }
  }

  const apiPort = await freePort()
  const agentPort = await freePort()
  const env = {
    RUNTIME_PREVIEW_API_PORT: String(apiPort),
    RUNTIME_PREVIEW_AGENT_PORT: String(agentPort),
  }
  let started = false

  try {
    try {
      docker([...composeBaseArgs, 'up', '--build', '-d'], env)
    } catch (error) {
      if (isRegistryUnavailable(error) && process.env.REQUIRE_RUNTIME_PREVIEW_COMPOSE !== 'true') {
        return {
          status: 'skipped',
          reason: 'container_registry_unavailable',
          apiPort,
          agentPort,
          health: {},
          workflow: {},
        }
      }
      throw error
    }
    started = true
    try {
      const apiHealth = await waitForJson(`http://127.0.0.1:${apiPort}/health`)
      const agentHealth = await waitForJson(`http://127.0.0.1:${agentPort}/health`)
      assert(apiHealth.status === 'ok' || apiHealth.status === 'healthy', 'API container health must be ok')
      assert(agentHealth.status === 'ok' || agentHealth.status === 'healthy', 'Agent container health must be ok')
      assert(agentHealth.service === 'narrativeos-agent-runtime', 'Agent health must identify narrativeos-agent-runtime')

      const created = await postJson(
        `http://127.0.0.1:${agentPort}/v1/workflows/socratic-create`,
        {
          seed: '一座雾港灯塔在无月夜重新亮起，守灯人必须判断该公开真相，还是先救下唯一幸存者。',
          genre: '玄幻悬疑',
          creatorId: 'compose_smoke_author',
          context: {
            story_direction: {
              label: '玄幻悬疑',
              keywords: '玄幻悬疑 灯塔 古契 选择代价',
            },
          },
        },
        { 'X-NarrativeOS-Debug-Key': 'compose-debug-key' },
      )
      assert(created.candidateDraft?.status === 'candidate', 'compose workflow must return candidate draft')
      assert(String(created.candidateDraft?.body || '').length >= 200, 'compose workflow candidate must be readable')
      assert(Array.isArray(created.questions) && created.questions.length <= 2, 'compose workflow must ask at most two questions')
      assert(
        (created.runTrace || []).some(item => item.step === 'tool_bridge.socratic_turn' && item.status === 'ok'),
        'compose workflow must call FastAPI Tool Bridge',
      )

      return {
        status: 'passed',
        apiPort,
        agentPort,
        health: {
          api: { status: apiHealth.status },
          agent: { status: agentHealth.status, service: agentHealth.service },
        },
        workflow: {
          status: created.candidateDraft.status,
          draftLength: String(created.candidateDraft.body || '').length,
          questionCount: created.questions.length,
          toolBridgeAccepted: true,
        },
      }
    } catch (error) {
      try {
        const logs = docker([...composeBaseArgs, 'logs', '--no-color', '--tail', '160'], env, 120000)
        process.stderr.write(`\n--- runtime preview compose logs ---\n${logs}\n--- end runtime preview compose logs ---\n`)
      } catch (logError) {
        process.stderr.write(`runtime preview compose log collection failed: ${errorText(logError)}\n`)
      }
      throw error
    }
  } finally {
    if (started) {
      try {
        docker([...composeBaseArgs, 'down', '-v', '--remove-orphans'], env, 180000)
      } catch (error) {
        process.stderr.write(`runtime preview compose cleanup failed: ${error instanceof Error ? error.message : String(error)}\n`)
      }
    }
  }
}

validateStaticContract()
const smoke = process.env.SKIP_RUNTIME_PREVIEW_COMPOSE === 'true'
  ? {
      status: 'skipped',
      reason: 'explicit_skip',
      apiPort: null,
      agentPort: null,
      health: {},
      workflow: {},
    }
  : await runComposeSmoke()

const artifact = {
  generatedAt: new Date().toISOString(),
  status: smoke.status === 'passed' ? 'passed' : 'skipped',
  decision: smoke.status === 'passed' ? 'runtime_preview_compose_passed' : 'runtime_preview_compose_not_executed',
  scope: 'local deployable two-service runtime preview',
  services: {
    api: 'container:8787',
    agent: 'container:4111',
  },
  hostPorts: {
    api: smoke.apiPort,
    agent: smoke.agentPort,
  },
  health: smoke.health,
  workflow: smoke.workflow,
}

const privateViolations = scanNoPrivateTerms(artifact)
assert(privateViolations.length === 0, `runtime preview compose artifact privacy violations: ${privateViolations.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `runtime-preview-compose-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: smoke.status === 'passed' ? 'passed' : 'skipped',
  artifactPath,
  decision: artifact.decision,
  health: artifact.health,
  workflow: artifact.workflow,
}, null, 2))

if (process.env.REQUIRE_RUNTIME_PREVIEW_COMPOSE === 'true' && smoke.status !== 'passed') {
  throw new Error(`Runtime preview compose did not pass: ${smoke.reason || smoke.status}`)
}
