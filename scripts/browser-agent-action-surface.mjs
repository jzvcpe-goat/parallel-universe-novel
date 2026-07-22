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
  await page.locator('.creator-editor-paper').waitFor({ timeout: 15000 })
  await page.locator('#creator-chapter-title').fill('灯码的第二个答案')
  await page.locator('#creator-chapter-content').fill([
    '沈星澜把灯码压在掌心，没有立刻交给巡夜人。',
    '雾里的蓝灯又亮了一次，这一次，她终于看清了灯后站着谁。',
  ].join('\n\n'))
  await page.waitForFunction(() => {
    const button = document.querySelector('[data-agent-action="save_local_draft"]:not([disabled])')
    return Boolean(button)
  }, null, { timeout: 10000 })

  await page.locator('[data-agent-action="ask_socratic_question"]:visible').first().click()

  await page.getByRole('button', { name: /快捷创作/ }).click()
  await page.getByText('一句话说需求').waitFor()
  await page.locator('[data-slot="creator-command-item"][data-agent-action="complete_next_beat"]').click()
  await page.getByText('下一句候选').waitFor()
  await page.getByRole('button', { name: '废弃' }).click()
  await page.getByLabel('候选卡').getByRole('button', { name: '收起' }).click()

  await page.getByRole('button', { name: /快捷创作/ }).click()
  await page.locator('[data-slot="creator-command-item"][data-agent-action="complete_next_beat"]').click()
  await page.locator('.creator-candidate-option').filter({ hasText: '插入为备选' }).click()
  await page.getByLabel('候选卡').getByRole('button', { name: '收起' }).click()

  await page.locator('[data-agent-action="save_local_draft"]:visible').first().click()
  await page.waitForTimeout(150)
  const draftRow = page.locator('[data-agent-action="open_draft"]:visible').first()
  await draftRow.waitFor({ timeout: 10000 })
  await draftRow.click()
  await page.waitForTimeout(150)
  let state = await readAgentState(page)
  assert(state.version === 10, `Agent QA expected schema v10, received ${state.version}`)
  assert(state.stores.includes('agentConfirmations'), 'Agent QA missing confirmation store')
  assert(hasLifecycle(state.events, 'complete_next_beat', ['requested', 'started', 'succeeded']), 'candidate proposal lifecycle missing')
  assert(hasLifecycle(state.events, 'open_draft', ['requested', 'started', 'succeeded']), 'open draft lifecycle missing')
  assert(hasLifecycle(state.events, 'ask_socratic_question', ['requested', 'started', 'succeeded']), 'Socratic question lifecycle missing')
  assert(state.events.some(event => event.actionName === 'apply_suggestion' && event.status === 'cancelled_by_author'), 'candidate rejection lifecycle missing')
  assert(hasLifecycle(state.events, 'apply_suggestion', ['requested', 'started', 'succeeded']), 'candidate adoption lifecycle missing')
  assert(hasLifecycle(state.events, 'save_local_draft', ['requested', 'started', 'succeeded']), 'local draft save lifecycle missing')

  await Promise.all([
    page.waitForURL(/#\/creator\/publish\?/, { timeout: 15000 }),
    page.locator('[data-agent-action="enter_publish_check"]:visible').first().click(),
  ])
  state = await readAgentState(page)
  assert(hasLifecycle(state.events, 'enter_publish_check', ['requested', 'started', 'succeeded']), 'publish bundle handoff lifecycle missing')
  await page.locator('[data-agent-action="prepare_publish_bundle"]').click()
  await page.getByText('发布包已准备，尚未公开。', { exact: true }).waitFor({ timeout: 15000 })
  await page.locator('[data-agent-action="review_publish_bundle"]').click()
  await page.getByText('已审阅', { exact: true }).waitFor({ timeout: 15000 })
  const confirmTrigger = page.locator('[data-agent-action="confirm_publish_bundle"]')
  await confirmTrigger.waitFor({ timeout: 15000 })
  assert(await confirmTrigger.getAttribute('data-agent-risk') === 'high', 'bundle confirmation must expose high risk')
  state = await readAgentState(page)
  assert(!state.confirmations.some(receipt => receipt.actionName === 'confirm_publish_bundle'), 'publish confirmation must not exist before author gesture')
  await confirmTrigger.click()
  const dialog = page.locator('[role="alertdialog"]')
  await dialog.waitFor()
  await dialog.getByRole('button', { name: '确认内容与去向' }).click()
  await dialog.waitFor({ state: 'hidden', timeout: 15000 })
  await page.getByText('作者已确认', { exact: true }).waitFor({ timeout: 15000 })

  state = await readAgentState(page)
  assert(
    hasLifecycle(state.events, 'confirm_publish_bundle', ['requested', 'awaiting_confirmation', 'started', 'succeeded']),
    `confirmed publish lifecycle is incomplete: ${JSON.stringify(state.events.filter(event => event.actionName === 'confirm_publish_bundle'))}`,
  )
  assert(
    state.confirmations.some(receipt => receipt.actionName === 'confirm_publish_bundle' && receipt.status === 'consumed'),
    'publish confirmation receipt must be consumed',
  )
  const submitTrigger = page.locator('[data-agent-action="submit_publish_bundle"]')
  assert(await submitTrigger.getAttribute('data-agent-risk') === 'high', 'publish submit must expose high risk')
  assert(!state.confirmations.some(receipt => receipt.actionName === 'submit_publish_bundle'), 'submit confirmation must not exist before author gesture')
  await submitTrigger.click()
  await dialog.waitFor()
  await dialog.getByRole('button', { name: '确认提交' }).click()
  await dialog.waitFor({ state: 'hidden', timeout: 15000 })
  await page.getByText('发布完成', { exact: true }).waitFor({ timeout: 15000 })

  state = await readAgentState(page)
  assert(
    hasLifecycle(state.events, 'submit_publish_bundle', ['requested', 'awaiting_confirmation', 'started', 'succeeded']),
    `submitted publish lifecycle is incomplete: ${JSON.stringify(state.events.filter(event => event.actionName === 'submit_publish_bundle'))}`,
  )
  assert(
    state.confirmations.some(receipt => receipt.actionName === 'submit_publish_bundle' && receipt.status === 'consumed'),
    'submit confirmation receipt must be consumed',
  )
  for (const event of state.events.filter(item => ['confirm_publish_bundle', 'submit_publish_bundle'].includes(item.actionName))) {
    assert(!('content' in event) && !('instruction' in event) && !('credential' in event), 'operation log leaked private payload fields')
  }

  await page.screenshot({
    path: join(artifactDir, 'creator-publish-confirmed.png'),
    fullPage: true,
  })
  console.log(JSON.stringify({
    status: 'passed',
    gate: 'WP3_AGENT_ACTION_SURFACE_BROWSER',
    schemaVersion: state.version,
    operationEvents: state.events.length,
    consumedConfirmations: state.confirmations.filter(receipt => receipt.status === 'consumed').length,
  }, null, 2))
} finally {
  if (browser) await browser.close()
  shutdown()
  rmSync(join(root, 'app', 'dist-creator-qa'), { recursive: true, force: true })
}
