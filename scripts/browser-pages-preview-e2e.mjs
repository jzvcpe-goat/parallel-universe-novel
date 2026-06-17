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

async function loadPlaywright() {
  const modulePath = process.env.PLAYWRIGHT_MODULE_PATH || 'playwright'
  try {
    const mod = await import(modulePath)
    return mod.default || mod
  } catch (error) {
    throw new Error(`Playwright is required for public pages QA: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
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
  const playwright = await loadPlaywright()
  const appPort = await freePort()
  const unusedApiPort = await freePort()
  const appBaseUrl = `http://127.0.0.1:${appPort}`

  await run('npm', ['--prefix', 'app', 'run', 'build'], {
    VITE_ROUTER_MODE: 'hash',
    VITE_PUBLIC_RUNTIME_MODE: 'disabled',
    VITE_ALLOW_LOCAL_CREATOR_FALLBACK: 'false',
    VITE_API_ORIGIN: `http://127.0.0.1:${unusedApiPort}`,
    VITE_API_BASE_URL: `http://127.0.0.1:${unusedApiPort}/v1`,
  })
  copyFileSync(join(root, 'app/dist/index.html'), join(root, 'app/dist/404.html'))

  start('pages-preview', 'npm', ['--prefix', 'app', 'run', 'preview', '--', '--host', '127.0.0.1', '--port', String(appPort)])
  await waitForUrl(appBaseUrl)

  const launchOptions = {
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
  }
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  }
  const browser = await playwright.chromium.launch(launchOptions)
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

  await page.goto(`${appBaseUrl}/#/create?qa=p12-pages-preview`, { waitUntil: 'domcontentloaded' })
  await page.getByTestId('creator-conversation-panel').waitFor({ timeout: 15000 })
  await page.getByText('创作服务待连接').waitFor({ timeout: 15000 })

  await page.goto(`${appBaseUrl}/?qa=p12-pages-preview`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /^开始创作$/ }).click()
  await page.getByTestId('creator-conversation-panel').waitFor({ timeout: 15000 })
  assert(page.url().includes('#/create'), `Home CTA must navigate to hash create route, got ${page.url()}`)

  await page.locator('textarea').first().fill('我想写一个现代悬疑故事，第一幕收到不该存在的证据。')
  await page.getByRole('button', { name: /开始创作|写入下一步/ }).click()
  await page.getByText('创作服务暂时未连接。请稍后再试，或在本地创作环境继续。').waitFor({ timeout: 25000 })
  const bodyText = await page.locator('body').innerText()
  assert(!bodyText.includes('先用草稿继续写'), 'Static public preview must not enter local draft fallback')
  assert(await page.getByTestId('creator-dialogue-thread').count() === 0, 'Static public preview must not render a fake dialogue thread')

  mkdirSync(artifactDir, { recursive: true })
  const screenshotPath = join(artifactDir, `p13-public-pages-e2e-${new Date().toISOString().replace(/[:.]/g, '-')}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true })
  await browser.close()

  console.log(JSON.stringify({
    status: 'passed',
    app: appBaseUrl,
    routerMode: 'hash',
    localFallback: false,
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
