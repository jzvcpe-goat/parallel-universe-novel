#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'visual-qa', 'agent-action-surface')
const children = []

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function start(command, args, env = {}) {
  const child = spawn(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  children.push(child)
  return child
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
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Preview is still starting.
    }
    await delay(300)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

async function readAgentState(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolveDb, reject) => {
      const request = window.indexedDB.open('puf_creator_workspace')
      request.onsuccess = () => resolveDb(request.result)
      request.onerror = () => reject(request.error)
    })
    const readStore = storeName => new Promise((resolveRecords, reject) => {
      const transaction = db.transaction(storeName, 'readonly')
      const request = transaction.objectStore(storeName).getAll()
      request.onsuccess = () => resolveRecords(request.result)
      request.onerror = () => reject(request.error)
    })
    const [events, confirmations] = await Promise.all([
      readStore('agentOperationLog'),
      readStore('agentConfirmations'),
    ])
    const version = db.version
    const stores = Array.from(db.objectStoreNames)
    db.close()
    return { confirmations, events, stores, version }
  })
}

function hasLifecycle(events, actionName, expected) {
  const groups = new Map()
  for (const event of events.filter(item => item.actionName === actionName)) {
    const operationEvents = groups.get(event.operationId) || []
    operationEvents.push(event)
    groups.set(event.operationId, operationEvents)
  }
  return Array.from(groups.values()).some(operationEvents => {
    const statuses = operationEvents
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(event => event.status)
    return expected.every((status, index) => statuses[index] === status)
  })
}

let browser = null
try {
  const playwrightModule = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
  const playwright = playwrightModule.default || playwrightModule
  const port = await freePort()
  const baseUrl = `http://127.0.0.1:${port}`

  const build = start('npm', ['--prefix', 'app', 'run', 'build:creator:qa'], {
    VITE_ROUTER_MODE: 'hash',
    VITE_CREATOR_QA_AUTHENTICATED: 'true',
  })
  await new Promise((resolveBuild, reject) => {
    build.on('exit', code => code === 0 ? resolveBuild() : reject(new Error(`Creator QA build exited ${code}`)))
  })
  start('npm', [
    '--prefix', 'app', 'run', 'preview', '--',
    '--host', '127.0.0.1',
    '--port', String(port),
    '--outDir', 'dist-creator-qa',
  ])
  await waitForUrl(baseUrl)

  const launchOptions = { headless: process.env.PLAYWRIGHT_HEADLESS !== 'false' }
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  }
  browser = await playwright.chromium.launch(launchOptions)
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  mkdirSync(artifactDir, { recursive: true })

  await page.goto(`${baseUrl}/#/creator/editor?qa=local-creator-authenticated`, {
    waitUntil: 'domcontentloaded',
  })
  await page.locator('[data-slot="creator-conversation-workspace"]').waitFor({ timeout: 15000 })

  await page.keyboard.press('Control+K')
  await page.getByText('一句话说需求').waitFor()
  await page.locator('[data-slot="creator-command-item"][data-agent-action="complete_next_beat"]').click()
  await page.getByText('下一句候选').waitFor()
  await page.getByRole('button', { name: '废弃' }).click()
  await page.getByLabel('候选卡').getByRole('button', { name: '收起' }).click()

  await page.keyboard.press('Control+K')
  await page.locator('[data-slot="creator-command-item"][data-agent-action="complete_next_beat"]').click()
  await page.locator('.creator-candidate-option').filter({ hasText: '插入为备选' }).click()
  const authorConfirmation = page.locator('[data-slot="creator-author-confirm-candidate"]')
  await authorConfirmation.waitFor({ timeout: 10000 })
  assert(
    await authorConfirmation.getAttribute('data-agent-action') === null,
    'candidate confirmation must not be Agent-addressable',
  )
  const candidateState = await readAgentState(page)
  assert(
    hasLifecycle(candidateState.events, 'apply_suggestion', ['requested', 'awaiting_confirmation']),
    'Agent candidate selection must stop before author confirmation',
  )
  assert(
    !hasLifecycle(candidateState.events, 'apply_suggestion', ['requested', 'awaiting_confirmation', 'started', 'succeeded']),
    'Agent candidate selection must not self-confirm or apply the candidate',
  )
  await authorConfirmation.click()
  await page.waitForTimeout(250)
  let state = await readAgentState(page)
  assert(state.version === 10, `Agent QA expected schema v10, received ${state.version}`)
  assert(state.stores.includes('agentConfirmations'), 'Agent QA missing confirmation store')
  assert(hasLifecycle(state.events, 'complete_next_beat', ['requested', 'started', 'succeeded']), 'candidate proposal lifecycle missing')
  assert(state.events.some(event => event.actionName === 'apply_suggestion' && event.status === 'cancelled_by_author'), 'candidate rejection lifecycle missing')
  assert(hasLifecycle(state.events, 'apply_suggestion', ['requested', 'awaiting_confirmation', 'started', 'succeeded']), 'candidate adoption lifecycle missing')

  await page.screenshot({
    path: join(artifactDir, 'creator-candidate-author-confirmed.png'),
    fullPage: true,
  })
  console.log(JSON.stringify({
    status: 'passed',
    gate: 'WP3_AGENT_ACTION_SURFACE_BROWSER',
    schemaVersion: state.version,
    operationEvents: state.events.length,
    consumedCandidateConfirmations: state.confirmations.filter(receipt => receipt.actionName === 'apply_suggestion' && receipt.status === 'consumed').length,
  }, null, 2))
} finally {
  if (browser) await browser.close()
  shutdown()
  rmSync(join(root, 'app', 'dist-creator-qa'), { recursive: true, force: true })
}
