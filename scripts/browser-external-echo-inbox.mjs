#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'visual-qa', 'external-echo-inbox')
const qaBuildDir = join(root, 'app', 'dist-creator-qa')
const children = []
const logs = []

function logLine(prefix, chunk) {
  const value = chunk.toString()
  logs.push(`${prefix} ${value}`)
  if (process.env.BROWSER_E2E_VERBOSE) process.stderr.write(`${prefix} ${value}`)
}

function run(command, args, env = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    child.stdout.on('data', chunk => logLine(`[${command}]`, chunk))
    child.stderr.on('data', chunk => logLine(`[${command}:err]`, chunk))
    child.on('exit', code => code === 0 ? resolveRun() : reject(new Error(`${command} ${args.join(' ')} exited ${code}`)))
  })
}

function start(name, command, args) {
  const child = spawn(command, args, {
    cwd: root,
    env: process.env,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', chunk => logLine(`[${name}]`, chunk))
  child.stderr.on('data', chunk => logLine(`[${name}:err]`, chunk))
  children.push(child)
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
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Keep polling while the preview server starts.
    }
    await delay(300)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function openEchoInbox(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-reader-signal-id]').first().waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForFunction(() => document.body.innerText.includes('刚刚更新'))
}

async function readDurableEchoState(page) {
  return page.evaluate(async () => {
    const request = indexedDB.open('puf_creator_workspace')
    const db = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const readAll = storeName => new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const readRequest = tx.objectStore(storeName).getAll()
      readRequest.onsuccess = () => resolve(readRequest.result)
      readRequest.onerror = () => reject(readRequest.error)
    })
    const [signals, sources, reminders] = await Promise.all([
      readAll('readerSignals'),
      readAll('readerSignalSources'),
      readAll('creativeReminders'),
    ])
    const stores = Array.from(db.objectStoreNames)
    const version = db.version
    db.close()
    return { version, stores, signals, sources, reminders }
  })
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
  const playwrightModule = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
  const playwright = playwrightModule.default || playwrightModule
  const port = await freePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const routeUrl = `${baseUrl}/#/creator/requests?qa=local-creator-authenticated`

  await run('npm', ['--prefix', 'app', 'run', 'build:creator:qa'], {
    VITE_CREATOR_QA_AUTHENTICATED: 'true',
    VITE_CREATOR_QA_REFERENCE_AGENT: 'true',
    VITE_ROUTER_MODE: 'hash',
  })
  start('external-echo-preview', 'npm', [
    '--prefix', 'app', 'run', 'preview', '--',
    '--host', '127.0.0.1', '--port', String(port), '--outDir', 'dist-creator-qa',
  ])
  await waitForUrl(baseUrl)

  const launchOptions = { headless: process.env.PLAYWRIGHT_HEADLESS !== 'false' }
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  browser = await playwright.chromium.launch(launchOptions)
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const first = await context.newPage()
  const second = await context.newPage()
  await openEchoInbox(first, routeUrl)
  await openEchoInbox(second, routeUrl)

  const bodyText = await first.locator('body').innerText()
  for (const text of ['想看', '留言', '高亮', '反应', '追问', '支持', '提醒状态', '回声来源', '本机判断']) {
    assert(bodyText.includes(text), `External Echo inbox missing product text: ${text}`)
  }

  for (const source of ['留言', '高亮', '反应', '追问', '支持']) {
    assert(await first.locator(`[data-reader-signal-source="${source}"]`).count() > 0, `Missing ${source} signal card`)
  }

  const pinCard = first.locator('[data-reader-signal-source="留言"][data-reminder-status="suggested"]').first()
  const pinId = await pinCard.getAttribute('data-reader-signal-id')
  assert(pinId, 'Missing signal id for pin flow')
  await pinCard.getByRole('button', { name: '保存提醒' }).click()
  try {
    await first.locator(`[data-reader-signal-id="${pinId}"][data-reminder-status="pinned"]`).waitFor({ timeout: 5000 })
  } catch {
    const diagnostic = await readDurableEchoState(first)
    const notice = await first.locator('body').innerText()
    throw new Error(`Pin flow did not update ${pinId}; reminders=${JSON.stringify(diagnostic.reminders)}; notice=${notice.slice(0, 1200)}`)
  }
  await second.locator(`[data-reader-signal-id="${pinId}"][data-reminder-status="pinned"]`).waitFor({ timeout: 10000 })

  const dismissCard = first.locator('[data-reader-signal-source="高亮"][data-reminder-status="suggested"]').first()
  const dismissId = await dismissCard.getAttribute('data-reader-signal-id')
  assert(dismissId, 'Missing signal id for dismiss flow')
  await dismissCard.getByRole('button', { name: '先放下' }).click()
  await second.locator(`[data-reader-signal-id="${dismissId}"][data-reminder-status="dismissed"]`).waitFor({ timeout: 10000 })

  const useCard = first.locator('[data-reader-signal-source="反应"][data-reminder-status="suggested"]').first()
  const useId = await useCard.getAttribute('data-reader-signal-id')
  assert(useId, 'Missing signal id for used flow')
  await useCard.getByRole('button', { name: '保存提醒' }).click()
  await first.locator(`[data-reader-signal-id="${useId}"][data-reminder-status="pinned"]`).getByRole('button', { name: '已用在写作里' }).click()
  await second.locator(`[data-reader-signal-id="${useId}"][data-reminder-status="used"]`).waitFor({ timeout: 10000 })

  await first.reload({ waitUntil: 'domcontentloaded' })
  await first.locator(`[data-reader-signal-id="${pinId}"][data-reminder-status="pinned"]`).waitFor({ timeout: 15000 })
  await first.locator(`[data-reader-signal-id="${dismissId}"][data-reminder-status="dismissed"]`).waitFor()
  await first.locator(`[data-reader-signal-id="${useId}"][data-reminder-status="used"]`).waitFor()

  const durable = await readDurableEchoState(first)
  assert(durable.version === 10, `External Echo QA expected schema v10, received ${durable.version}`)
  assert(durable.stores.includes('readerSignalSources'), 'Schema v10 must preserve source cursors and freshness')
  assert(durable.stores.includes('verifiedLongRangeThreads'), 'Schema v10 must preserve verified long-range threads')
  assert(durable.sources.length === 6, `Expected six source states, received ${durable.sources.length}`)
  assert(durable.sources.every(source => source.status === 'fresh' && source.cursor), 'Every QA source must persist a fresh cursor')
  assert(new Set(durable.signals.map(signal => signal.normalizedHash)).size === durable.signals.length, 'Cached signals must be content-deduplicated')
  assert(durable.reminders.some(reminder => reminder.status === 'pinned'), 'Pinned reminder must survive reload')
  assert(durable.reminders.some(reminder => reminder.status === 'dismissed'), 'Dismissed reminder must survive reload')
  assert(durable.reminders.some(reminder => reminder.status === 'used'), 'Used reminder must survive reload')
  const publicTexts = durable.signals.map(signal => signal.rawText).filter(Boolean)
  const privateReminderJson = JSON.stringify(durable.reminders)
  assert(publicTexts.every(text => !privateReminderJson.includes(text)), 'Private reminders must not copy public signal text')

  mkdirSync(artifactDir, { recursive: true })
  const evidenceCard = first.locator('[data-reader-signal-source="留言"]').first()
  await evidenceCard.scrollIntoViewIfNeeded()
  const desktopCardContract = await evidenceCard.evaluate(node => {
    const actions = node.querySelector('[data-slot="creator-external-echo-card-actions"]')
    const buttons = Array.from(actions?.querySelectorAll('button') || [])
    return {
      sourceTag: node.querySelector('[data-slot="creator-external-echo-card-source"]')?.tagName || '',
      reminderTag: node.querySelector('[data-slot="creator-external-echo-card-reminder"]')?.tagName || '',
      actionColumns: actions ? getComputedStyle(actions).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
      actionCount: buttons.length,
      minActionHeight: buttons.length ? Math.min(...buttons.map(button => button.getBoundingClientRect().height)) : 0,
      nestedGlassCount: node.querySelectorAll('.pu-liquid-glass').length,
      backdropFilter: getComputedStyle(node).backdropFilter,
      radius: Number.parseFloat(getComputedStyle(node).borderTopLeftRadius),
      overflow: node.scrollWidth - node.clientWidth,
    }
  })
  assert(
    desktopCardContract.sourceTag === 'FIGURE'
      && desktopCardContract.reminderTag === 'SECTION'
      && desktopCardContract.actionColumns === 3
      && desktopCardContract.actionCount === 3
      && desktopCardContract.minActionHeight >= 40
      && desktopCardContract.nestedGlassCount === 0
      && (desktopCardContract.backdropFilter === 'none' || desktopCardContract.backdropFilter === '')
      && desktopCardContract.radius <= 8
      && desktopCardContract.overflow <= 1,
    `External Echo inbox card lost its atomic desktop contract: ${JSON.stringify(desktopCardContract)}`,
  )
  await evidenceCard.screenshot({ path: join(artifactDir, 'creator-external-echo-card-atomic.png') })
  const selectEvidenceCard = evidenceCard.getByRole('button', { name: /查看|正在看/ })
  if ((await selectEvidenceCard.getAttribute('aria-pressed')) !== 'true') await selectEvidenceCard.click()
  const evidenceDetail = first.locator('[data-slot="creator-external-echo-detail"]')
  await evidenceDetail.scrollIntoViewIfNeeded()
  const desktopDetailContract = await evidenceDetail.evaluate(node => {
    const actions = node.querySelector('[data-slot="creator-external-echo-detail-actions"]')
    const buttons = Array.from(actions?.querySelectorAll('button') || [])
    return {
      contextTag: node.querySelector('[data-slot="creator-external-echo-detail-context"]')?.tagName || '',
      sourceTag: node.querySelector('[data-slot="creator-external-echo-detail-source"]')?.tagName || '',
      reminderTag: node.querySelector('[data-slot="creator-external-echo-detail-reminder"]')?.tagName || '',
      actionColumns: actions ? getComputedStyle(actions).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
      actionCount: buttons.length,
      minActionHeight: buttons.length ? Math.min(...buttons.map(button => button.getBoundingClientRect().height)) : 0,
      nestedGlassCount: node.querySelectorAll('.pu-liquid-glass').length,
      radius: Number.parseFloat(getComputedStyle(node).borderTopLeftRadius),
      overflow: node.scrollWidth - node.clientWidth,
    }
  })
  assert(
    desktopDetailContract.contextTag === 'DL'
      && desktopDetailContract.sourceTag === 'FIGURE'
      && desktopDetailContract.reminderTag === 'SECTION'
      && desktopDetailContract.actionColumns === 2
      && desktopDetailContract.actionCount === 3
      && desktopDetailContract.minActionHeight >= 40
      && desktopDetailContract.nestedGlassCount === 0
      && desktopDetailContract.radius <= 8
      && desktopDetailContract.overflow <= 1,
    `External Echo detail lost its atomic desktop contract: ${JSON.stringify(desktopDetailContract)}`,
  )
  await evidenceDetail.screenshot({ path: join(artifactDir, 'creator-external-echo-detail-atomic.png') })

  await first.setViewportSize({ width: 560, height: 1000 })
  await evidenceCard.scrollIntoViewIfNeeded()
  const narrowCardContract = await evidenceCard.evaluate(node => {
    const actions = node.querySelector('[data-slot="creator-external-echo-card-actions"]')
    return {
      actionColumns: actions ? getComputedStyle(actions).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
      right: node.getBoundingClientRect().right,
      viewportWidth: window.innerWidth,
      overflow: node.scrollWidth - node.clientWidth,
    }
  })
  assert(
    narrowCardContract.actionColumns === 1
      && narrowCardContract.right <= narrowCardContract.viewportWidth
      && narrowCardContract.overflow <= 1,
    `External Echo inbox card lost its narrow containment: ${JSON.stringify(narrowCardContract)}`,
  )
  await evidenceCard.screenshot({ path: join(artifactDir, 'creator-external-echo-card-atomic-narrow.png') })
  await evidenceDetail.scrollIntoViewIfNeeded()
  const narrowDetailContract = await evidenceDetail.evaluate(node => {
    const actions = node.querySelector('[data-slot="creator-external-echo-detail-actions"]')
    return {
      actionColumns: actions ? getComputedStyle(actions).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
      right: node.getBoundingClientRect().right,
      viewportWidth: window.innerWidth,
      overflow: node.scrollWidth - node.clientWidth,
    }
  })
  assert(
    narrowDetailContract.actionColumns === 2
      && narrowDetailContract.right <= narrowDetailContract.viewportWidth
      && narrowDetailContract.overflow <= 1,
    `External Echo detail lost its narrow containment: ${JSON.stringify(narrowDetailContract)}`,
  )
  const lastDetailAction = evidenceDetail.getByRole('button').last()
  await lastDetailAction.evaluate(node => node.scrollIntoView({ block: 'center' }))
  const narrowDetailReachability = await first.evaluate(() => {
    const nav = document.querySelector('nav.workspace-nav')
    const buttons = document.querySelectorAll('[data-slot="creator-external-echo-detail-actions"] button')
    const lastButton = buttons.item(buttons.length - 1)
    return {
      buttonBottom: lastButton?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY,
      navTop: nav?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
    }
  })
  assert(
    narrowDetailReachability.buttonBottom <= narrowDetailReachability.navTop,
    `External Echo detail action is obscured by mobile navigation: ${JSON.stringify(narrowDetailReachability)}`,
  )
  await first.setViewportSize({ width: 560, height: 1200 })
  await evidenceDetail.scrollIntoViewIfNeeded()
  await evidenceDetail.screenshot({ path: join(artifactDir, 'creator-external-echo-detail-atomic-narrow.png') })
  await first.setViewportSize({ width: 1440, height: 900 })
  await first.screenshot({ path: join(artifactDir, 'creator-external-echo-inbox.png'), fullPage: true })
  console.log(JSON.stringify({
    status: 'passed',
    gate: 'WP4_EXTERNAL_ECHO_INBOX_BROWSER',
    schemaVersion: durable.version,
    signals: durable.signals.length,
    sourceStates: durable.sources.length,
    reminderStates: [...new Set(durable.reminders.map(reminder => reminder.status))].sort(),
  }, null, 2))
} catch (error) {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  if (logs.length) console.error(logs.slice(-80).join(''))
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  shutdown()
  rmSync(qaBuildDir, { recursive: true, force: true })
}
