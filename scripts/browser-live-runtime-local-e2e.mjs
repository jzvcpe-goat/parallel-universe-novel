#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'node:net'

const root = resolve(new URL('..', import.meta.url).pathname)
const tempDir = mkdtempSync(join(tmpdir(), 'narrativeos-live-local-'))
const children = []
const logs = []

function logLine(prefix, chunk) {
  const text = chunk.toString()
  logs.push(`${prefix} ${text}`)
  if (process.env.BROWSER_E2E_VERBOSE) process.stderr.write(`${prefix} ${text}`)
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

function start(name, command, args, env = {}) {
  const child = spawn(command, args, {
    cwd: root,
    env: {
      ...process.env,
      ...env,
    },
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', chunk => logLine(`[${name}]`, chunk))
  child.stderr.on('data', chunk => logLine(`[${name}:err]`, chunk))
  child.on('exit', code => {
    if (code !== null && code !== 0) logs.push(`[${name}] exited ${code}`)
  })
  children.push(child)
  return child
}

function backendPythonEnv() {
  const candidates = [
    process.env.PYTHON_BIN,
    join(root, 'backend/.venv/bin/python'),
    resolve(root, '../../workspaces/integration-harness/backend/.venv/bin/python'),
  ].filter(Boolean)
  const python = candidates.find(candidate => existsSync(candidate))
  return python ? { PYTHON_BIN: python } : {}
}

function playwrightEnv() {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE_PATH,
    join(root, 'node_modules/playwright/index.js'),
    '/Users/james/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js',
  ].filter(Boolean)
  const playwright = candidates.find(candidate => existsSync(candidate))
  return playwright ? { PLAYWRIGHT_MODULE_PATH: playwright } : {}
}

function browserExecutableEnv() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ].filter(Boolean)
  const executable = candidates.find(candidate => existsSync(candidate))
  return executable ? { PLAYWRIGHT_CHROMIUM_EXECUTABLE: executable } : {}
}

function run(command, args, env = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: {
        ...process.env,
        ...env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    child.stdout.on('data', chunk => {
      logLine(`[${command}]`, chunk)
      process.stdout.write(chunk)
    })
    child.stderr.on('data', chunk => {
      logLine(`[${command}:err]`, chunk)
      process.stderr.write(chunk)
    })
    child.on('exit', code => {
      if (code === 0) resolveRun()
      else reject(new Error(`${command} ${args.join(' ')} exited ${code}`))
    })
  })
}

async function waitForJson(url, timeoutMs = 30000) {
  const started = Date.now()
  let lastError = ''
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return response.json()
      lastError = `http_${response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    await delay(350)
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}`)
}

function shutdown() {
  for (const child of children) {
    if (child.killed) continue
    try {
      if (process.platform === 'win32') child.kill('SIGTERM')
      else process.kill(-child.pid, 'SIGTERM')
    } catch {
      child.kill('SIGTERM')
    }
  }
  rmSync(tempDir, { recursive: true, force: true })
}

process.on('SIGINT', () => {
  shutdown()
  process.exit(130)
})
process.on('SIGTERM', () => {
  shutdown()
  process.exit(143)
})

try {
  const apiPort = await freePort()
  const agentPort = await freePort()
  const apiOrigin = `http://127.0.0.1:${apiPort}`
  const agentOrigin = `http://127.0.0.1:${agentPort}`

  start('api', 'node', [
    'scripts/run-backend-python.mjs',
    '-m',
    'uvicorn',
    'narrativeos.api.app_factory:create_app',
    '--factory',
    '--app-dir',
    'backend/src',
    '--host',
    '127.0.0.1',
    '--port',
    String(apiPort),
  ], {
    ...backendPythonEnv(),
    DATABASE_URL: `sqlite:///${join(tempDir, 'live-local.db')}`,
    NARRATIVEOS_CREATOR_DIALOGUE_DIR: join(tempDir, 'creator_dialogue_sessions'),
  })
  await waitForJson(`${apiOrigin}/health`)

  start('agents', 'npm', ['--workspace', '@narrativeos/agent-runtime', 'run', 'dev'], {
    MASTRA_HOST: '127.0.0.1',
    MASTRA_PORT: String(agentPort),
    MASTRA_TOOL_BRIDGE_BASE_URL: apiOrigin,
  })
  await waitForJson(`${agentOrigin}/health`)

  await run('node', ['scripts/browser-live-runtime-e2e.mjs'], {
    ALLOW_INSECURE_RUNTIME_SMOKE: 'true',
    REQUIRE_PUBLIC_RUNTIME: 'true',
    VITE_API_ORIGIN: apiOrigin,
    VITE_API_BASE_URL: `${apiOrigin}/v1`,
    VITE_AGENT_RUNTIME_BASE_URL: agentOrigin,
    VITE_ALLOW_LOCAL_CREATOR_FALLBACK: 'false',
    ...playwrightEnv(),
    ...browserExecutableEnv(),
  })
} catch (error) {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  if (logs.length) {
    console.error('\n--- recent service logs ---')
    console.error(logs.slice(-100).join(''))
  }
  process.exitCode = 1
} finally {
  shutdown()
}
