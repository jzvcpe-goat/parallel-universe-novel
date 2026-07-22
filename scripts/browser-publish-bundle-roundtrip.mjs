#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { createServer } from 'node:net'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'visual-qa', 'publish-bundle-roundtrip')
const evidencePath = join(root, 'artifacts', 'qa', 'publish-bundle-roundtrip.json')
const downloadedPath = join(tmpdir(), `puf-publish-bundle-${process.pid}.zip`)
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

async function readPublishState(page) {
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
    const [bundles, receipts, packages, events, confirmations] = await Promise.all([
      readStore('publishBundles'),
      readStore('publishReceipts'),
      readStore('workspacePackages'),
      readStore('agentOperationLog'),
      readStore('agentConfirmations'),
    ])
    const version = db.version
    db.close()
    return { bundles, confirmations, events, packages, receipts, version }
  })
}

function hasLifecycle(events, actionName, expected) {
  const grouped = new Map()
  for (const event of events.filter(item => item.actionName === actionName)) {
    const group = grouped.get(event.operationId) || []
    group.push(event)
    grouped.set(event.operationId, group)
  }
  return [...grouped.values()].some(group => {
    const statuses = group.sort((left, right) => left.createdAt.localeCompare(right.createdAt)).map(item => item.status)
    return expected.every((status, index) => statuses[index] === status)
  })
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

let browser = null
try {
  const playwrightModule = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
  const playwright = playwrightModule.default || playwrightModule
  const port = await freePort()
  const baseUrl = `http://127.0.0.1:${port}`

  const build = start('npm', ['--prefix', 'app', 'run', 'build:creator:qa'], {
    VITE_CREATOR_QA_AUTHENTICATED: 'true',
    VITE_CREATOR_QA_USER_ID: 'creator-qa-local-author',
    VITE_CREATOR_QA_EMAIL: 'creator-qa@local.test',
    VITE_CREATOR_QA_REFERENCE_AGENT: 'true',
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
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  browser = await playwright.chromium.launch(launchOptions)
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
  mkdirSync(artifactDir, { recursive: true })
  mkdirSync(join(root, 'artifacts', 'qa'), { recursive: true })

  await page.goto(`${baseUrl}/#/creator/write?qa=local-creator-authenticated`, { waitUntil: 'domcontentloaded' })
  const workspace = page.locator('[data-slot="creator-conversation-workspace"]')
  const composer = page.locator('[data-slot="creator-conversation-input"]')
  await workspace.waitFor({ timeout: 15000 })
  await page.waitForFunction(() => document.querySelector('[data-slot="creator-conversation-workspace"]')?.getAttribute('data-agent-ready') === 'true')

  await composer.fill('雾港停电后，守灯人发现失踪者的名字正在灯塔玻璃上逐个亮起。')
  await composer.press('Enter')
  const intentLock = page.getByRole('button', { name: /锁定本章意图/ })
  for (let answerCount = 0; answerCount < 2 && await intentLock.count() === 0; answerCount += 1) {
    const question = page.locator('[data-slot="creator-conversation-turn"]').filter({ hasText: '这轮只确认一件事' }).last()
    await question.waitFor({ timeout: 15000 })
    const answer = question.getByRole('button').first()
    await answer.waitFor({ timeout: 15000 })
    await answer.click()
    await page.waitForTimeout(240)
  }
  await intentLock.waitFor({ timeout: 15000 })
  await intentLock.click()
  await page.getByRole('button', { name: '比较不同方向' }).click()
  const candidates = page.locator('[data-slot="creator-conversation-candidate"]')
  await candidates.first().waitFor({ timeout: 20000 })
  await candidates.first().click()
  await page.getByRole('button', { name: /写当前场景候选/ }).click()
  await page.locator('[data-slot="creator-conversation-preview"]').waitFor({ timeout: 20000 })
  await page.getByRole('button', { name: '采用为草稿' }).click()
  await page.locator('[data-slot="creator-conversation-active-draft"]').waitFor({ timeout: 15000 })
  await page.locator('[data-agent-action="save_local_draft"]:visible').first().click()
  await page.waitForTimeout(180)
  await page.getByRole('button', { name: '更多创作操作' }).click()
  await Promise.all([
    page.waitForURL(/#\/creator\/bundles\?/, { timeout: 15000 }),
    page.locator('[data-agent-action="enter_publish_check"]:visible').click(),
  ])

  const prepareButton = page.locator('[data-agent-action="prepare_publish_bundle"]')
  await prepareButton.waitFor({ timeout: 15000 })
  await prepareButton.click()
  await page.getByText('发布包已准备，尚未公开。', { exact: true }).waitFor({ timeout: 15000 })
  let state = await readPublishState(page)
  const preparedBundle = state.bundles.find(bundle => bundle.packageRecordId && bundle.status === 'draft')
  assert(preparedBundle, 'prepare must persist one full draft bundle')
  assert(state.receipts.length === 0, 'prepare must not publish or create a receipt')
  assert(state.packages.some(record => record.kind === 'publish-bundle'), 'prepare must persist immutable package bytes')

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByText('待审阅', { exact: true }).waitFor({ timeout: 15000 })
  await page.locator('[data-agent-action="review_publish_bundle"]').click()
  await page.getByText('已审阅', { exact: true }).waitFor({ timeout: 15000 })

  const confirmTrigger = page.locator('[data-agent-action="confirm_publish_bundle"]')
  await confirmTrigger.click()
  let dialog = page.locator('[role="alertdialog"]')
  await dialog.waitFor()
  await dialog.getByRole('button', { name: '取消' }).click()
  await dialog.waitFor({ state: 'hidden' })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByText('已审阅', { exact: true }).waitFor({ timeout: 15000 })
  state = await readPublishState(page)
  assert(state.receipts.length === 0, 'cancelled confirmation must not create a publish receipt')

  await page.locator('[data-agent-action="confirm_publish_bundle"]').click()
  dialog = page.locator('[role="alertdialog"]')
  await dialog.getByRole('button', { name: '确认内容与去向' }).click()
  await dialog.waitFor({ state: 'hidden', timeout: 15000 })
  await page.getByText('作者已确认', { exact: true }).waitFor({ timeout: 15000 })

  const downloadPromise = page.waitForEvent('download')
  await page.locator('[data-agent-action="export_publish_bundle"]').click()
  dialog = page.locator('[role="alertdialog"]')
  await dialog.getByRole('button', { name: '确认导出' }).click()
  const download = await downloadPromise
  await download.saveAs(downloadedPath)
  await dialog.waitFor({ state: 'hidden', timeout: 15000 })
  await page.getByText('已导出', { exact: true }).waitFor({ timeout: 15000 })

  const requireFromApp = createRequire(join(root, 'app', 'package.json'))
  const { unzipSync } = requireFromApp('fflate')
  const files = unzipSync(new Uint8Array(readFileSync(downloadedPath)))
  const requiredPaths = [
    'publish-bundle.json',
    'body.md',
    'reader-summary.md',
    'external-copy/markdown.md',
    'external-copy/plain-text.txt',
  ]
  for (const path of requiredPaths) assert(files[path], `exported package missing ${path}`)
  const manifest = JSON.parse(Buffer.from(files['publish-bundle.json']).toString('utf8'))
  assert(manifest.authorConfirmation.confirmed === true, 'exported manifest must retain author confirmation')
  assert(manifest.chapter.checksum === sha256(files['body.md']), 'exported body SHA-256 must match manifest')
  assert(/^[a-f0-9]{64}$/.test(manifest.integrity.idempotencyKey), 'exported manifest must include SHA-256 idempotency key')

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByText('已导出', { exact: true }).waitFor({ timeout: 15000 })
  await page.locator('[data-agent-action="submit_publish_bundle"]').click()
  dialog = page.locator('[role="alertdialog"]')
  await dialog.getByRole('button', { name: '确认提交' }).click()
  await dialog.waitFor({ state: 'hidden', timeout: 15000 })
  await page.getByText('发布完成', { exact: true }).waitFor({ timeout: 15000 })
  await page.getByText('已发布', { exact: true }).first().waitFor({ timeout: 15000 })

  state = await readPublishState(page)
  const publishedBundles = state.bundles.filter(bundle => bundle.status === 'published')
  assert(publishedBundles.length === 1, 'roundtrip must finish with one published bundle')
  assert(state.receipts.length === 1, 'submit must retain one deterministic receipt')
  assert(state.receipts[0].status === 'published', 'receipt must finish published')
  assert(hasLifecycle(state.events, 'prepare_publish_bundle', ['requested', 'started', 'succeeded']), 'prepare lifecycle missing')
  assert(hasLifecycle(state.events, 'review_publish_bundle', ['requested', 'started', 'succeeded']), 'review lifecycle missing')
  assert(hasLifecycle(state.events, 'confirm_publish_bundle', ['requested', 'awaiting_confirmation', 'started', 'succeeded']), 'confirm lifecycle missing')
  assert(hasLifecycle(state.events, 'export_publish_bundle', ['requested', 'awaiting_confirmation', 'started', 'succeeded']), 'export lifecycle missing')
  assert(hasLifecycle(state.events, 'submit_publish_bundle', ['requested', 'awaiting_confirmation', 'started', 'succeeded']), 'submit lifecycle missing')
  for (const event of state.events.filter(item => item.actionName.includes('publish_bundle'))) {
    assert(!('content' in event) && !('instruction' in event) && !('credential' in event), 'publish lifecycle log leaked private payload')
  }

  await page.locator('[data-agent-action="prepare_publish_bundle"]').click()
  await page.getByText('这份内容已经公开，没有重复准备或发布。', { exact: true }).waitFor({ timeout: 15000 })
  await page.waitForTimeout(250)
  const replayState = await readPublishState(page)
  assert(replayState.bundles.filter(bundle => bundle.status === 'published').length === 1, 're-prepare unchanged content must not duplicate the published bundle')
  assert(replayState.receipts.length === 1, 're-prepare unchanged content must not duplicate receipts')

  await page.screenshot({
    path: join(artifactDir, 'creator-publish-bundle-published.png'),
    fullPage: true,
  })
  const evidence = {
    status: 'passed',
    gate: 'WP5_PUBLISH_BUNDLE_ROUNDTRIP_BROWSER',
    schemaVersion: state.version,
    bundleStatus: publishedBundles[0].status,
    receiptStatus: state.receipts[0].status,
    receiptCount: state.receipts.length,
    packageFiles: requiredPaths,
    idempotencyKeyIncluded: true,
    authorConfirmationDurable: true,
    cancelRecoveryProven: true,
  }
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(JSON.stringify(evidence, null, 2))
} finally {
  if (browser) await browser.close()
  shutdown()
  rmSync(downloadedPath, { force: true })
  rmSync(join(root, 'app', 'dist-creator-qa'), { recursive: true, force: true })
}
