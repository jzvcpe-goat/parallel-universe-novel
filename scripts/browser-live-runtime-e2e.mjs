#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { copyFileSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'node:net'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'visual-qa')
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

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function isRemoteHttps(value) {
  return /^https:\/\//.test(value)
    && !/localhost|127\.0\.0\.1|0\.0\.0\.0|\[?::1\]?/.test(value)
    && !/example\.com/.test(value)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
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
    child.stdout.on('data', chunk => logLine(`[${command}]`, chunk))
    child.stderr.on('data', chunk => logLine(`[${command}:err]`, chunk))
    child.on('exit', code => {
      if (code === 0) resolveRun()
      else reject(new Error(`${command} ${args.join(' ')} exited ${code}`))
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

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })
  if (!response.ok) throw new Error(`${url} returned ${response.status}`)
  const contentType = response.headers.get('content-type') || ''
  assert(contentType.includes('application/json'), `${url} must return JSON, got ${contentType || 'empty content-type'}`)
  return response.json()
}

function compactLength(value) {
  return String(value || '').replace(/\s+/g, '').length
}

function assertNoInternalTerms(text, terms, surface) {
  for (const term of terms) {
    assert(!text.includes(term), `${surface} leaked internal term: ${term}`)
  }
}

function assertPublicSocraticCreateOutput(payload) {
  assert(payload && typeof payload === 'object', 'Direct workflow preflight must return a JSON object')
  assert(payload.responseMode === 'public', `Direct workflow preflight must return public mode, got ${payload.responseMode || 'missing'}`)
  assert(payload.candidateDraft?.status === 'candidate', 'Direct workflow preflight must return candidateDraft.status=candidate')
  const draftLength = compactLength(payload.candidateDraft?.body)
  const questionCount = Array.isArray(payload.questions) ? payload.questions.length : -1
  assert(draftLength >= 300, `Direct workflow preflight expected candidate draft >= 300 chars, got ${draftLength}`)
  assert(draftLength <= 900, `Direct workflow preflight expected candidate draft <= 900 chars, got ${draftLength}`)
  assert(questionCount >= 0, 'Direct workflow preflight questions must be an array')
  assert(questionCount <= 2, `Direct workflow preflight expected at most 2 follow-up questions, got ${questionCount}`)

  const forbiddenFields = [
    'runtimeArtifact',
    'sourceRefs',
    'kernelId',
    'profileId',
    'activeConstraints',
    'activeKernels',
    'sourceLabels',
    'runTrace',
    'ledger',
    'cost',
  ]
  assertNoInternalTerms(JSON.stringify(payload), forbiddenFields, 'Direct workflow preflight response')

  return { draftLength, questionCount }
}

async function preflightSocraticCreate(agentOrigin, seed) {
  const payload = await fetchJson(`${agentOrigin}/v1/workflows/socratic-create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: 'live_runtime_smoke',
      creatorId: 'live_runtime_smoke',
      genre: '现代悬疑',
      seed,
      context: {
        smoke: true,
        source: 'browser-live-runtime-e2e',
      },
    }),
  })
  return assertPublicSocraticCreateOutput(payload)
}

async function loadPlaywright() {
  const modulePath = process.env.PLAYWRIGHT_MODULE_PATH || 'playwright'
  try {
    const mod = await import(modulePath)
    return mod.default || mod
  } catch (error) {
    throw new Error(`Playwright is required for live runtime QA: ${error instanceof Error ? error.message : String(error)}`)
  }
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
  const required = process.env.REQUIRE_PUBLIC_RUNTIME === 'true'
    || process.env.LIVE_RUNTIME_SMOKE_REQUIRED === 'true'
  const apiOrigin = normalizeOrigin(process.env.VITE_API_ORIGIN || process.env.NARRATIVEOS_API_ORIGIN)
  const apiBase = normalizeOrigin(process.env.VITE_API_BASE_URL || (apiOrigin ? `${apiOrigin}/v1` : ''))
  const agentOrigin = normalizeOrigin(
    process.env.VITE_AGENT_RUNTIME_BASE_URL || process.env.NARRATIVEOS_AGENT_RUNTIME_BASE_URL,
  )
  const allowInsecure = process.env.ALLOW_INSECURE_RUNTIME_SMOKE === 'true'
  const seed = process.env.LIVE_RUNTIME_SMOKE_SEED
    || '我想写一个雨夜悬疑故事，第一幕是一个人收到不该存在的证据，他必须在公开和隐瞒之间选择。开场要包含具体地点、人物压力、证据细节和一个无法立刻解释的反转。'

  if (!apiOrigin || !agentOrigin) {
    if (required) {
      throw new Error('Live runtime smoke requires VITE_API_ORIGIN and VITE_AGENT_RUNTIME_BASE_URL')
    }
    console.log(JSON.stringify({
      status: 'skipped',
      reason: 'VITE_API_ORIGIN and VITE_AGENT_RUNTIME_BASE_URL are not configured',
      required,
    }, null, 2))
    process.exit(0)
  }

  if (!allowInsecure) {
    assert(isRemoteHttps(apiOrigin), 'VITE_API_ORIGIN must be a remote https URL for public live smoke')
    assert(isRemoteHttps(agentOrigin), 'VITE_AGENT_RUNTIME_BASE_URL must be a remote https URL for public live smoke')
  }

  const apiHealth = await fetchJson(`${apiOrigin}/health`)
  assert(apiHealth.status === 'ok' || apiHealth.status === 'healthy', `Unexpected API health payload: ${JSON.stringify(apiHealth)}`)
  const agentHealth = await fetchJson(`${agentOrigin}/health`)
  assert(agentHealth.status === 'ok' || agentHealth.status === 'healthy', `Unexpected Agent health payload: ${JSON.stringify(agentHealth)}`)
  const directWorkflow = await preflightSocraticCreate(agentOrigin, seed)

  const playwright = await loadPlaywright()
  const appPort = await freePort()
  const appBaseUrl = `http://127.0.0.1:${appPort}`

  await run('npm', ['--prefix', 'app', 'run', 'build'], {
    VITE_ROUTER_MODE: 'hash',
    VITE_PUBLIC_RUNTIME_MODE: 'live',
    VITE_ALLOW_LOCAL_CREATOR_FALLBACK: 'false',
    VITE_API_ORIGIN: apiOrigin,
    VITE_API_BASE_URL: apiBase,
    VITE_AGENT_RUNTIME_BASE_URL: agentOrigin,
  })
  copyFileSync(join(root, 'app/dist/index.html'), join(root, 'app/dist/404.html'))

  start('live-pages-preview', 'npm', ['--prefix', 'app', 'run', 'preview', '--', '--host', '127.0.0.1', '--port', String(appPort)])
  await waitForUrl(appBaseUrl)

  const launchOptions = {
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
  }
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  }
  const browser = await playwright.chromium.launch(launchOptions)
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.goto(`${appBaseUrl}/#/create?qa=p15-live-runtime`, { waitUntil: 'domcontentloaded' })
  await page.getByTestId('creator-conversation-panel').waitFor({ timeout: 20000 })
  await page.getByText('创作服务可用').waitFor({ timeout: 20000 })

  await page.locator('textarea').first().fill(seed)
  await page.getByRole('button', { name: /开始创作|写入下一步/ }).click()
  await page.getByTestId('creator-dialogue-thread').waitFor({ timeout: 45000 })

  const bodyText = await page.locator('body').innerText()
  assert(!bodyText.includes('创作服务暂时未连接'), 'Live runtime smoke must not show service-disconnected message')
  assert(!bodyText.includes('先用草稿继续写'), 'Live runtime smoke must not use local draft fallback')
  const forbiddenTerms = ['system prompt', 'provider', 'fallback', 'rawHash', 'StateVector', 'AgentRun', 'CHANGES JSON']
  assertNoInternalTerms(bodyText, forbiddenTerms, 'Live public UI')

  const assistantMessages = await page.locator('.creator-message-ai').allInnerTexts()
  const draftText = assistantMessages.find(text => text.length > 160) || ''
  const draftLength = draftText.replace(/\s+/g, '').length
  const questionCount = await page.locator('.creator-question-button').count()
  assert(draftLength >= 300, `Expected live candidate draft >= 300 chars, got ${draftLength}`)
  assert(draftLength <= 900, `Expected live candidate draft <= 900 chars, got ${draftLength}`)
  assert(questionCount <= 2, `Expected at most 2 follow-up questions, got ${questionCount}`)

  mkdirSync(artifactDir, { recursive: true })
  const screenshotPath = join(artifactDir, `p15-live-runtime-e2e-${new Date().toISOString().replace(/[:.]/g, '-')}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true })
  await browser.close()

  console.log(JSON.stringify({
    status: 'passed',
    app: appBaseUrl,
    apiOrigin,
    agentOrigin,
    directWorkflow,
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
