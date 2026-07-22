#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'node:net'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'visual-qa', 'local-creator')
const children = []
const logs = []

const routes = [
  { path: '/creator/login', title: '进入创作工作台' },
  { path: '/creator', title: '今日创作路径' },
  { path: '/creator/requests', title: '外界回声' },
  { path: '/creator/editor', title: '写作台' },
  { path: '/creator/works', title: '本机写作智库' },
  { path: '/creator/publish', title: '发布包' },
  { path: '/creator/settings', title: '本机工作区' },
]

const requiredNav = ['今日创作路径', '外界回声', '灵感到正文', '本机写作智库', '写作台', '发布包', '本机工作区']

const blockedTerms = [
  'Supabase',
  'RLS',
  'trace',
  'provider',
  'fallback',
  'API key',
  '后端',
  '接口',
  '同步',
  '回写',
  '数据库',
  'AI',
  '模型',
  'LLM',
  'localhost',
  '私有初稿',
  '发布边界',
  '敏感凭据',
  '本地创作服务',
  '自带创作服务',
  '创作服务入口',
  '凭据状态',
  '检查服务',
]

const readerResidueTerms = [
  '行星',
  '星云',
  '粒子',
  '宇宙书城',
  '概念图',
  '世界在你脚下',
]

function logLine(prefix, chunk) {
  const text = chunk.toString()
  logs.push(`${prefix} ${text}`)
  if (process.env.BROWSER_E2E_VERBOSE) process.stderr.write(`${prefix} ${text}`)
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
    throw new Error(`Playwright is required for Local Creator route QA: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertNoForbiddenText(text, routePath) {
  for (const term of [...blockedTerms, ...readerResidueTerms]) {
    assert(!text.includes(term), `${routePath} leaks forbidden visible text: ${term}`)
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

let browser = null

try {
  const playwright = await loadPlaywright()
  const appPort = await freePort()
  const appBaseUrl = `http://127.0.0.1:${appPort}`

  await run('npm', ['--prefix', 'app', 'run', 'build:creator'], {
    VITE_ROUTER_MODE: 'hash',
  })

  start('creator-preview', 'npm', [
    '--prefix',
    'app',
    'run',
    'preview',
    '--',
    '--host',
    '127.0.0.1',
    '--port',
    String(appPort),
    '--outDir',
    'dist-creator',
  ])
  await waitForUrl(appBaseUrl)

  const launchOptions = {
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
  }
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  }

  browser = await playwright.chromium.launch(launchOptions)
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  mkdirSync(artifactDir, { recursive: true })

  const evidence = []

  for (const route of routes) {
    await page.goto(`${appBaseUrl}/#${route.path}?qa=local-creator-routes`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => {
      const root = document.querySelector('#root')
      return Boolean(root && root.textContent && root.textContent.trim().length > 0)
    }, null, { timeout: 15000 })
    const bodyText = await page.evaluate(() => document.body.innerText || document.body.textContent || '')

    assert(bodyText.includes(route.title), `${route.path} missing expected title/copy: ${route.title}`)
    if (route.path !== '/creator/editor') {
      for (const label of requiredNav) {
        assert(bodyText.includes(label), `${route.path} missing Creator nav label: ${label}`)
      }
    }
    assertNoForbiddenText(bodyText, route.path)
    assert(!bodyText.includes('开始阅读'), `${route.path} shows Reader CTA residue`)
    assert(!bodyText.includes('进入书城'), `${route.path} shows Reader library residue`)
    assert(!bodyText.includes('创作端不可用'), `${route.path} presents the browser preview as a product failure`)
    assert(!bodyText.includes('待处理队列'), `${route.path} restores the retired signed-out request queue preview`)
    assert(!bodyText.includes('右侧详情'), `${route.path} restores the retired signed-out detail mock`)

    const shellMetrics = await page.evaluate(() => {
      const nav = document.querySelector('nav.workspace-nav')
      const main = document.querySelector('.creator-workbench-main')
      return {
        navWidth: nav?.getBoundingClientRect().width || 0,
        mainOverflow: main instanceof HTMLElement ? Math.max(0, main.scrollWidth - main.clientWidth) : -1,
        currentCount: nav?.querySelectorAll('[aria-current="page"]').length || 0,
      }
    })
    if (route.path === '/creator/editor') {
      assert(shellMetrics.navWidth === 0 && shellMetrics.currentCount === 0, `/creator/editor signed-out focus mode must not restore global navigation: ${JSON.stringify(shellMetrics)}`)
    } else {
      assert(shellMetrics.navWidth >= 230, `${route.path} desktop Creator navigation must show labels: ${JSON.stringify(shellMetrics)}`)
      assert(
        shellMetrics.currentCount === (route.path === '/creator/login' ? 0 : 1),
        `${route.path} exposes the wrong active Creator navigation count: ${JSON.stringify(shellMetrics)}`,
      )
    }
    assert(shellMetrics.mainOverflow <= 1, `${route.path} Creator shell overflows horizontally: ${JSON.stringify(shellMetrics)}`)

    if (route.path === '/creator/login') {
      assert(await page.locator('[data-slot="creator-login-panel"]').count() === 1, 'login route must render one login panel')
      assert(await page.locator('[data-slot="creator-access-gate"]').count() === 0, 'login route must not stack an access gate under the login panel')
    } else {
      const accessGate = page.locator('[data-slot="creator-access-gate"]')
      assert(await accessGate.count() === 1, `${route.path} must render one signed-out access gate`)
      const accessMetrics = await accessGate.evaluate(gate => ({
        capabilityCount: gate.querySelectorAll('[data-slot="creator-access-capability"]').length,
        nestedGlassCount: gate.querySelectorAll('.pu-liquid-glass').length,
        radius: Number.parseFloat(getComputedStyle(gate).borderTopLeftRadius) || 0,
      }))
      assert(
        accessMetrics.capabilityCount === 4
          && accessMetrics.nestedGlassCount === 0
          && accessMetrics.radius <= 10,
        `${route.path} signed-out access gate lost its atomic contract: ${JSON.stringify(accessMetrics)}`,
      )
    }

    const fileName = `${route.path.replace(/^\//, '').replace(/\//g, '-') || 'creator'}-${Date.now()}.png`
    const screenshotPath = join(artifactDir, fileName)
    await page.screenshot({ path: screenshotPath, fullPage: true })
    evidence.push({ path: route.path, screenshotPath })
  }

  await browser.close()
  browser = null

  console.log(JSON.stringify({
    status: 'passed',
    app: appBaseUrl,
    routeCount: routes.length,
    screenshots: evidence,
  }, null, 2))
} catch (error) {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  if (logs.length) {
    console.error('\n--- recent service logs ---')
    console.error(logs.slice(-80).join(''))
  }
  process.exitCode = 1
} finally {
  try {
    if (typeof browser !== 'undefined' && browser) await browser.close()
  } catch {
    // Best-effort cleanup for failed route assertions.
  }
  shutdown()
}
