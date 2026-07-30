#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'qa', 'creator-decision-workbench')
const evidencePath = join(artifactDir, 'creator-decision-workbench.json')
const screenshotPath = join(artifactDir, 'creator-decision-workbench.png')
const children = []
const logs = []

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function record(prefix, chunk) {
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
    child.stdout.on('data', chunk => record(`[${command}]`, chunk))
    child.stderr.on('data', chunk => record(`[${command}:err]`, chunk))
    child.on('exit', code => {
      if (code === 0) resolveRun()
      else reject(new Error(`${command} ${args.join(' ')} exited ${code}`))
    })
  })
}

function start(command, args) {
  const child = spawn(command, args, {
    cwd: root,
    env: process.env,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', chunk => record('[preview]', chunk))
  child.stderr.on('data', chunk => record('[preview:err]', chunk))
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
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Preview is still starting.
    }
    await delay(250)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

async function loadPlaywright() {
  const modulePath = process.env.PLAYWRIGHT_MODULE_PATH || 'playwright'
  const module = await import(modulePath)
  return module.default || module
}

async function cleanOrigin(page, baseUrl) {
  const seedUrl = `${baseUrl}/__creator_decision_seed__`
  await page.route(seedUrl, route => route.fulfill({
    body: '<!doctype html><html><body>seed</body></html>',
    contentType: 'text/html',
    status: 200,
  }))
  await page.goto(seedUrl, { waitUntil: 'domcontentloaded' })
  await page.evaluate(async () => {
    window.localStorage.clear()
    await new Promise((resolveDelete, reject) => {
      const request = window.indexedDB.deleteDatabase('puf_creator_workspace')
      request.onsuccess = () => resolveDelete()
      request.onerror = () => reject(request.error)
      request.onblocked = () => reject(new Error('creator workspace database deletion was blocked'))
    })
    if (!navigator.storage?.getDirectory) return
    const directory = await navigator.storage.getDirectory()
    try {
      await directory.removeEntry('puf-creator', { recursive: true })
    } catch {
      // A clean origin may not have an OPFS directory yet.
    }
  })
  await page.unroute(seedUrl)
}

async function readDecisionState(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolveOpen, reject) => {
      const request = window.indexedDB.open('puf_creator_workspace')
      request.onsuccess = () => resolveOpen(request.result)
      request.onerror = () => reject(request.error)
    })
    const readAll = storeName => new Promise((resolveRead, reject) => {
      const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll()
      request.onsuccess = () => resolveRead(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      const [sessions, intents, candidates, drafts, reviews, patches, canons, events] = await Promise.all([
        readAll('creationSessions'),
        readAll('authorIntents'),
        readAll('narrativeCandidates'),
        readAll('sceneDrafts'),
        readAll('literaryReviews'),
        readAll('canonPatches'),
        readAll('localCanonStates'),
        readAll('creationDecisionEvents'),
      ])
      return {
        databaseVersion: db.version,
        session: sessions[0] || null,
        canon: canons[0] || null,
        counts: {
          sessions: sessions.length,
          intents: intents.length,
          candidates: candidates.length,
          drafts: drafts.length,
          reviews: reviews.length,
          patches: patches.length,
          canons: canons.length,
          events: events.length,
        },
        candidateTitles: candidates.map(candidate => candidate.title),
        patchStatuses: patches.map(patch => patch.status),
        eventTypes: events.map(event => event.type),
      }
    } finally {
      db.close()
    }
  })
}

let browser = null

try {
  mkdirSync(artifactDir, { recursive: true })
  const playwright = await loadPlaywright()
  const port = await freePort()
  const baseUrl = `http://127.0.0.1:${port}`

  await run('npm', ['--prefix', 'app', 'run', 'build:creator:qa'], {
    VITE_ROUTER_MODE: 'hash',
  })
  start('npm', [
    '--prefix',
    'app',
    'run',
    'preview',
    '--',
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--outDir',
    'dist-creator-qa',
  ])
  await waitForUrl(baseUrl)

  const launchOptions = { headless: process.env.PLAYWRIGHT_HEADLESS !== 'false' }
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  }
  browser = await playwright.chromium.launch(launchOptions)
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.on('console', message => logs.push(`[page:${message.type()}] ${message.text()}`))
  page.on('pageerror', error => logs.push(`[page:error] ${error.message}`))

  await cleanOrigin(page, baseUrl)
  const route = '/creator/editor?qa=creator-decision&request=request-fog-if-1'
  await page.goto(`${baseUrl}/#${route}`, { waitUntil: 'domcontentloaded' })
  const manuscript = page.getByRole('textbox', { name: '章节正文' })
  await manuscript.waitFor({ timeout: 15000 })
  await page.getByRole('button', { name: '建立本章意图' }).waitFor({ timeout: 15000 })
  const originalText = await manuscript.inputValue()

  await page.getByRole('button', { name: '建立本章意图' }).click()
  await page.getByRole('button', { name: /克制地确认关系已经改变/ }).waitFor({ timeout: 10000 })
  const questionCount = await page.getByText('最多两问', { exact: true }).count()
  assert(questionCount === 2, `intent discovery must show exactly two first-round questions, got ${questionCount}`)
  await page.getByRole('button', { name: /克制地确认关系已经改变/ }).click()
  await page.getByRole('button', { name: /主角先行动，对方暂不知情/ }).click()
  await page.getByRole('button', { name: '锁定本章意图' }).click()
  await page.getByText('本章意图已锁定', { exact: true }).first().waitFor({ timeout: 10000 })

  await page.getByRole('button', { name: '比较叙事路径' }).click()
  await page.waitForFunction(() => (
    [...document.querySelectorAll('button')]
      .filter(button => button.textContent?.trim() === '选择这条路径').length >= 3
  ), null, { timeout: 10000 })
  const candidateButtons = page.getByRole('button', { name: '选择这条路径', exact: true })
  const candidateCount = await candidateButtons.count()
  assert(candidateCount >= 3, `candidate search must expose at least three distinct paths, got ${candidateCount}`)
  const candidateTitles = await candidateButtons.evaluateAll(buttons => buttons.map(button => (
    button.closest('article')?.querySelector('h3')?.textContent?.trim() || ''
  )))
  assert(new Set(candidateTitles).size === candidateTitles.length, `candidate paths must be distinct: ${candidateTitles.join(', ')}`)
  await candidateButtons.first().click()

  await page.getByRole('button', { name: '写当前场景' }).click()
  await page.getByText('等待作者决定', { exact: true }).first().waitFor({ timeout: 10000 })
  assert(await manuscript.inputValue() === originalText, 'scene generation must not mutate the author manuscript before adoption')
  await page.getByRole('button', { name: '采用候选', exact: true }).click()
  await page.waitForFunction(value => {
    const field = document.querySelector('#creator-chapter-content')
    return field instanceof HTMLTextAreaElement && field.value !== value && field.value.length > 80
  }, originalText, { timeout: 10000 })
  const adoptedText = await manuscript.inputValue()

  await manuscript.click()
  await manuscript.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
  const protectButton = page.getByRole('button', { name: '保护所选段落', exact: true })
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll('button')]
      .find(item => item.textContent?.includes('保护所选段落'))
    return button instanceof HTMLButtonElement && !button.disabled
  }, null, { timeout: 5000 })
  await protectButton.click()
  await page.getByText(/^[1-9]\d* 个保护段落$/).first().waitFor({ timeout: 5000 })

  await page.getByRole('button', { name: '审阅当前正文' }).click()
  await page.getByText('建议保护', { exact: true }).first().waitFor({ timeout: 10000 })
  const authorEditedText = `${adoptedText}\n\n“我要离开。”她终于说。`
  await manuscript.fill(authorEditedText)
  await page.getByText('作者修改已保存，旧审阅和正史差异已失效。', { exact: true }).first().waitFor({ timeout: 10000 })
  await page.getByRole('button', { name: '审阅当前正文' }).click()
  await page.getByText('必须修复', { exact: true }).first().waitFor({ timeout: 10000 })
  await page.getByRole('button', { name: '生成局部修改', exact: true }).first().click()
  await page.getByText('局部修改候选', { exact: true }).first().waitFor({ timeout: 10000 })
  await page.getByRole('button', { name: '采用这处修改', exact: true }).click()
  await page.getByText('局部修改已由作者采用，请重新审阅。', { exact: true }).first().waitFor({ timeout: 10000 })
  const repairedText = await manuscript.inputValue()
  assert(!repairedText.includes('我要离开'), 'local repair must remove only the located information-boundary violation')
  assert(repairedText.startsWith(adoptedText), 'local repair must preserve protected manuscript paragraphs')
  await page.getByRole('button', { name: '审阅当前正文' }).click()
  await page.getByText('建议保护', { exact: true }).first().waitFor({ timeout: 10000 })

  await page.getByRole('button', { name: '准备正史差异' }).click()
  await page.getByText('主宇宙差异', { exact: true }).first().waitFor({ timeout: 10000 })
  const confirmLabel = '确认正文及状态变更，写入主宇宙'
  await page.getByRole('button', { name: confirmLabel, exact: true }).first().click()
  const dialog = page.getByRole('alertdialog')
  await dialog.waitFor({ timeout: 5000 })
  await dialog.getByRole('button', { name: confirmLabel, exact: true }).click()
  await page.getByText(/已由作者确认并写入本机主宇宙 r1/).first().waitFor({ timeout: 10000 })
  assert(await manuscript.inputValue() === repairedText, 'canon commit must preserve the author-approved repaired manuscript exactly')

  const beforeReload = await readDecisionState(page)
  assert(beforeReload.databaseVersion === 9, `decision workbench requires local DB v9, got ${beforeReload.databaseVersion}`)
  assert(beforeReload.session?.phase === 'canon_committed', `expected canon_committed, got ${beforeReload.session?.phase}`)
  assert(beforeReload.session?.proposedCanonPatchId === null, 'committed session must not retain an actionable patch ID')
  assert(beforeReload.canon?.revision === 1, `expected local canon revision 1, got ${beforeReload.canon?.revision}`)
  assert(beforeReload.patchStatuses.includes('committed'), 'the canon patch must be committed atomically')
  assert(beforeReload.eventTypes.includes('canon_patch_confirmed'), 'the author confirmation event must be durable')
  assert(beforeReload.eventTypes.includes('canon_patch_committed'), 'the canon commit event must be durable')

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByText(/已由作者确认并写入本机主宇宙 r1/).first().waitFor({ timeout: 15000 })
  await page.waitForFunction(expected => {
    const field = document.querySelector('#creator-chapter-content')
    return field instanceof HTMLTextAreaElement && field.value === expected
  }, repairedText, { timeout: 10000 })
  assert(
    await page.getByRole('button', { name: confirmLabel, exact: true }).count() === 0,
    'a restored committed session must not expose a second canon confirmation action',
  )
  const afterReload = await readDecisionState(page)
  assert(afterReload.counts.canons === 1, `refresh must not duplicate canon records: ${JSON.stringify(afterReload.counts)}`)
  assert(afterReload.canon?.revision === 1, 'refresh must not perform a second canon commit')

  await page.screenshot({ path: screenshotPath, fullPage: true })
  const evidence = {
    status: 'pass',
    route,
    questionCount,
    candidateCount,
    candidateTitles,
    originalLength: originalText.length,
    adoptedLength: adoptedText.length,
    authorEditedLength: authorEditedText.length,
    repairedLength: repairedText.length,
    beforeReload,
    afterReload,
    screenshot: screenshotPath,
  }
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`)
  console.log('[browser-creator-decision-workbench] PASS')
  console.log(JSON.stringify({ evidencePath, screenshotPath }, null, 2))
} catch (error) {
  mkdirSync(artifactDir, { recursive: true })
  writeFileSync(evidencePath, `${JSON.stringify({
    status: 'fail',
    error: error instanceof Error ? error.message : String(error),
    logs: logs.slice(-120),
  }, null, 2)}\n`)
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  shutdown()
}
