#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'node:net'

const root = resolve(new URL('..', import.meta.url).pathname)
const tempDir = mkdtempSync(join(tmpdir(), 'narrativeos-browser-creator-'))
const artifactDir = join(root, 'artifacts', 'visual-qa')
const children = []
const logs = []

const blockedPublicTerms = [
  'system prompt',
  'provider',
  'fallback',
  'rawHash',
  'StateVector',
  'AgentRun',
  'CHANGES JSON',
  'canon_written',
  'branch_written',
  'MASTRA_TOOL_BRIDGE',
]

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

async function waitForUrl(url, timeoutMs = 30000) {
  const started = Date.now()
  let lastError = ''
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return response
      lastError = `http_${response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    await delay(350)
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}`)
}

async function waitForJson(url, timeoutMs = 30000) {
  const response = await waitForUrl(url, timeoutMs)
  return response.json()
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertPublicCopy(text, path) {
  for (const term of blockedPublicTerms) {
    assert(!text.includes(term), `${path} leaks internal term: ${term}`)
  }
}

async function loadPlaywright() {
  const modulePath = process.env.PLAYWRIGHT_MODULE_PATH || 'playwright'
  try {
    const mod = await import(modulePath)
    return mod.default || mod
  } catch (error) {
    const hint = [
      'Playwright is required for browser QA.',
      'Set PLAYWRIGHT_MODULE_PATH to an installed Playwright entrypoint,',
      'or install Playwright locally for QA only.',
      `Original error: ${error instanceof Error ? error.message : String(error)}`,
    ].join(' ')
    throw new Error(hint)
  }
}

function shutdown() {
  for (const child of children) {
    if (child.killed) continue
    try {
      if (process.platform === 'win32') {
        child.kill('SIGTERM')
      } else {
        process.kill(-child.pid, 'SIGTERM')
      }
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
  const playwright = await loadPlaywright()
  const apiPort = await freePort()
  const agentPort = await freePort()
  const appPort = await freePort()
  const apiBaseUrl = `http://127.0.0.1:${apiPort}`
  const agentBaseUrl = `http://127.0.0.1:${agentPort}`
  const appBaseUrl = `http://127.0.0.1:${appPort}`

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
    DATABASE_URL: `sqlite:///${join(tempDir, 'creator-browser.db')}`,
    NARRATIVEOS_CREATOR_DIALOGUE_DIR: join(tempDir, 'creator_dialogue_sessions'),
  })
  await waitForJson(`${apiBaseUrl}/health`)

  start('agents', 'npm', ['--workspace', '@narrativeos/agent-runtime', 'run', 'dev'], {
    MASTRA_HOST: '127.0.0.1',
    MASTRA_PORT: String(agentPort),
    MASTRA_TOOL_BRIDGE_BASE_URL: apiBaseUrl,
  })
  await waitForJson(`${agentBaseUrl}/health`)

  start('creator', 'npm', ['--prefix', 'app', 'run', 'dev', '--', '--host', '127.0.0.1', '--port', String(appPort)], {
    VITE_API_ORIGIN: apiBaseUrl,
    VITE_API_BASE_URL: `${apiBaseUrl}/v1`,
    VITE_AGENT_RUNTIME_BASE_URL: agentBaseUrl,
  })
  await waitForUrl(`${appBaseUrl}/create?qa=p8-browser-e2e`)

  const launchOptions = {
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
  }
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  }
  const browser = await playwright.chromium.launch(launchOptions)
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(`${appBaseUrl}/create?qa=p8-browser-e2e`, { waitUntil: 'networkidle' })
  await page.getByTestId('creator-conversation-panel').waitFor({ timeout: 15000 })

  const seed = '我想写一个现代悬疑故事，第一幕是一个人收到不该存在的证据，他必须在公开和隐瞒之间选。'
  await page.locator('textarea').first().fill(seed)
  await page.getByRole('button', { name: /开始创作|写入下一步/ }).click()
  await page.getByTestId('creator-dialogue-thread').waitFor({ timeout: 30000 })

  const pageText = await page.locator('body').innerText()
  assertPublicCopy(pageText, 'creator page')
  assert(!pageText.includes('先用草稿继续写'), 'Creator UI fell back to local draft mode')
  assert(pageText.includes('开场写好了') || pageText.includes('回答下面任意一个问题'), 'Creator UI did not show successful post-submit guidance')

  const draftText = await page.locator('.creator-draft-paper').first().innerText({ timeout: 15000 })
  const draftLength = Array.from(draftText.trim()).length
  assert(draftLength >= 200, `candidate draft is too short: ${draftLength}`)
  assert(draftLength <= 1200, `candidate draft is unexpectedly long: ${draftLength}`)

  const questionCount = await page.locator('.creator-question-button').count()
  assert(questionCount > 0, 'Creator UI did not render follow-up questions')
  assert(questionCount <= 2, `Creator UI rendered too many follow-up questions: ${questionCount}`)
  await page.getByTestId('creator-reasoning-map').waitFor({ timeout: 10000 })
  await page.getByTestId('creator-story-notes').waitFor({ timeout: 10000 })

  mkdirSync(artifactDir, { recursive: true })
  const screenshotPath = join(artifactDir, `p8-creator-browser-e2e-${new Date().toISOString().replace(/[:.]/g, '-')}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true })
  await browser.close()

  console.log(JSON.stringify({
    status: 'passed',
    app: appBaseUrl,
    api: apiBaseUrl,
    agents: agentBaseUrl,
    draftLength,
    questionCount,
    screenshotPath,
  }, null, 2))
} catch (error) {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  if (logs.length) {
    console.error('\n--- recent service logs ---')
    console.error(logs.slice(-80).join(''))
  }
  process.exitCode = 1
} finally {
  shutdown()
}
