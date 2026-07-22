#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import { dirname, join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const root = resolve(new URL('..', import.meta.url).pathname)
const appRoot = join(root, 'app')
const packagePath = process.env.REAL_WORKSPACE_PACKAGE_PATH

if (!packagePath) {
  throw new Error('REAL_WORKSPACE_PACKAGE_PATH is required for real workspace migration QA.')
}
const receiptPath = join(
  root,
  'validation',
  'creator-writing',
  'real-workspace-package-migration-2026-07-18.json',
)
const screenshotPath = join(
  root,
  'artifacts',
  'visual-qa',
  'real-workspace-package-migration',
  'chapter-20-restored.png',
)
const children = []
const logs = []

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function visibleCharacterCount(text) {
  return text.replace(/\s/gu, '').length
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function logLine(prefix, chunk) {
  const value = chunk.toString()
  logs.push(`${prefix} ${value}`)
  if (process.env.BROWSER_E2E_VERBOSE) process.stderr.write(`${prefix} ${value}`)
}

function startVite(port) {
  const child = spawn(join(appRoot, 'node_modules', '.bin', 'vite'), [
    '--mode', 'creator-qa',
    '--host', '127.0.0.1',
    '--port', String(port),
  ], {
    cwd: appRoot,
    env: process.env,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', chunk => logLine('[vite]', chunk))
  child.stderr.on('data', chunk => logLine('[vite:err]', chunk))
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
      // Vite is still starting.
    }
    await delay(250)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

async function loadPlaywright() {
  const module = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
  return module.default || module
}

function harnessDocument() {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Real workspace migration QA</title></head>
  <body>
    <input id="workspace-package-file" type="file" />
    <main id="status">loading</main>
    <script type="module">
      import {
        flushCreatorLocalWrites,
        hydrateCreatorLocalRepository,
      } from '/src/local-db/creatorLocalRepository.ts'
      import {
        applyLocalWorkspacePackage,
        previewLocalWorkspacePackage,
      } from '/src/local-db/creatorLocalWorkspacePackage.ts'
      import {
        readCreatorDecisionWorkspaceRecords,
      } from '/src/local-db/creatorLocalDecisionRepository.ts'

      let uploadedBytes = null
      let uploadPromise = Promise.resolve()
      document.querySelector('#workspace-package-file').addEventListener('change', event => {
        const file = event.target.files?.[0]
        uploadPromise = (async () => {
          uploadedBytes = file ? new Uint8Array(await file.arrayBuffer()) : null
        })()
      })

      window.__realWorkspaceMigrationQa = {
        hydrate: hydrateCreatorLocalRepository,
        flush: flushCreatorLocalWrites,
        readDecisionRecords: readCreatorDecisionWorkspaceRecords,
        waitForUpload: () => uploadPromise,
        async previewUploaded() {
          if (!uploadedBytes) throw new Error('No uploaded package')
          return previewLocalWorkspacePackage(uploadedBytes)
        },
        async applyUploaded(input) {
          if (!uploadedBytes) throw new Error('No uploaded package')
          return applyLocalWorkspacePackage(uploadedBytes, input)
        },
        async readDbSummary() {
          const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open('puf_creator_workspace')
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
          })
          try {
            return {
              version: db.version,
              stores: Array.from(db.objectStoreNames),
            }
          } finally {
            db.close()
          }
        },
      }
      document.querySelector('#status').textContent = 'ready'
    </script>
  </body>
</html>`
}

async function cleanBrowserStorage(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase('puf_creator_workspace')
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
      request.onblocked = () => reject(new Error('database deletion blocked'))
    })
    if (navigator.storage?.getDirectory) {
      const root = await navigator.storage.getDirectory()
      try {
        await root.removeEntry('puf-creator', { recursive: true })
      } catch {
        // The origin may not have local manuscript files yet.
      }
    }
  })
}

function readSourcePackage() {
  const requireFromApp = createRequire(join(appRoot, 'package.json'))
  const { unzipSync } = requireFromApp('fflate')
  const files = unzipSync(new Uint8Array(readFileSync(packagePath)))
  const recordsFile = files['records.json']
  assert(recordsFile, 'real workspace package must contain records.json')
  const payload = JSON.parse(new TextDecoder().decode(recordsFile))
  const records = payload.records
  const canon = records.filter(record => record.family === 'localCanonStates')
  const contexts = records.filter(record => record.family === 'contextSnapshots')
  return { records, canon, contexts }
}

function canonText(record) {
  return record.value.acceptedContentBlocks.map(block => block.text).join('\n\n')
}

let browser = null

try {
  assert(existsSync(packagePath), 'real workspace package is unavailable')
  const source = readSourcePackage()
  const sourceCanonByChapter = new Map(source.canon.map(record => [record.value.chapterId, record.value]))
  const sourceAccepted = source.canon.filter(record => canonText(record).trim())
  const sourceChapter21 = source.canon.find(record => record.value.chapterId.endsWith(':chapter:21'))
  assert(sourceAccepted.length === 20, 'source workspace must contain exactly 20 non-empty Canon chapters')
  assert(source.contexts.length === 25, 'source workspace must contain the 25 historical Context records')
  assert(source.contexts.every(record => !('compilationPolicyVersion' in record.value)), 'fixture must exercise missing Context policy version')
  assert(source.contexts.every(record => !('sourceFingerprint' in record.value)), 'fixture must exercise missing Context source fingerprint')
  assert(sourceChapter21 && !canonText(sourceChapter21).trim(), 'source Chapter 21 Canon shell must remain empty')

  const playwright = await loadPlaywright()
  const port = await freePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const harnessUrl = `${baseUrl}/__real_workspace_package_migration__`
  startVite(port)
  await waitForUrl(baseUrl)

  const launchOptions = { headless: process.env.PLAYWRIGHT_HEADLESS !== 'false' }
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  }
  browser = await playwright.chromium.launch(launchOptions)
  const context = await browser.newContext()
  const page = await context.newPage()
  page.on('pageerror', error => logs.push(`[page:error] ${error.message}`))
  page.on('console', message => {
    if (message.type() === 'error') logs.push(`[page:console] ${message.text()}`)
  })
  await page.route(harnessUrl, route => route.fulfill({
    body: harnessDocument(),
    contentType: 'text/html',
    status: 200,
  }))
  await page.goto(harnessUrl, { waitUntil: 'domcontentloaded' })
  await cleanBrowserStorage(page)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => Boolean(window.__realWorkspaceMigrationQa), null, { timeout: 15000 })
  await page.evaluate(() => window.__realWorkspaceMigrationQa.hydrate())
  await page.locator('#workspace-package-file').setInputFiles(packagePath)
  await page.evaluate(() => window.__realWorkspaceMigrationQa.waitForUpload())

  const preview = await page.evaluate(() => window.__realWorkspaceMigrationQa.previewUploaded())
  assert(preview.unsupported.length === 0, 'real workspace package must not contain unsupported record families')
  assert(
    preview.additions.length + preview.conflicts.length + preview.unchanged.length === source.records.length,
    'schema v10 preview must account for every supported source record',
  )
  assert(
    preview.additions.length >= source.records.length - 1,
    'empty schema v10 workspace may only pre-own the default workspace settings record',
  )

  const applied = await page.evaluate(() => window.__realWorkspaceMigrationQa.applyUploaded({
    authorConfirmed: true,
    conflictPolicy: 'keep-local',
  }))
  await page.evaluate(() => window.__realWorkspaceMigrationQa.flush())
  const [records, dbSummary] = await Promise.all([
    page.evaluate(() => window.__realWorkspaceMigrationQa.readDecisionRecords()),
    page.evaluate(() => window.__realWorkspaceMigrationQa.readDbSummary()),
  ])
  assert(applied.receipt.status === 'applied', 'real workspace import receipt must be applied')
  assert(dbSummary.version === 10, 'real workspace package must restore into schema v10')

  const restoredCanon = records.filter(record => record.family === 'localCanonStates')
  const restoredContexts = records.filter(record => record.family === 'contextSnapshots')
  const restoredAccepted = restoredCanon.filter(record => canonText(record).trim())
  const restoredChapter21 = restoredCanon.find(record => record.value.chapterId.endsWith(':chapter:21'))
  assert(restoredCanon.length === source.canon.length, 'all Canon records must restore')
  assert(restoredAccepted.length === 20, 'exactly 20 non-empty Canon chapters must restore')
  assert(restoredContexts.length === 25, 'all historical Context records must restore')
  assert(restoredContexts.every(record => record.value.compilationPolicyVersion === 0), 'legacy Contexts must remain policy-stale')
  assert(restoredContexts.every(record => record.value.sourceFingerprint === 'legacy-unfingerprinted'), 'legacy Contexts must remain fingerprint-stale')
  assert(restoredChapter21 && !canonText(restoredChapter21).trim(), 'restored Chapter 21 Canon shell must remain empty')

  const chapterEvidence = restoredAccepted.map((record) => {
    const sourceCanon = sourceCanonByChapter.get(record.value.chapterId)
    assert(sourceCanon, `source Canon missing for ${record.value.chapterId}`)
    assert(stableJson(record.value.acceptedContentBlocks) === stableJson(sourceCanon.acceptedContentBlocks), `Canon blocks changed during restore: ${record.value.chapterId}`)
    const text = canonText(record)
    return {
      chapterId: record.value.chapterId,
      visibleCharacterCount: visibleCharacterCount(text),
      acceptedContentBlocksSha256: sha256(stableJson(record.value.acceptedContentBlocks)),
    }
  }).sort((left, right) => left.chapterId.localeCompare(right.chapterId, 'en', { numeric: true }))
  assert(chapterEvidence.every(chapter => chapter.visibleCharacterCount >= 2700), 'every restored Canon chapter must retain at least 2700 visible characters')

  const editorUrl = `${baseUrl}/#/creator/editor?work=work-arad-wayfarer&branch=work-arad-wayfarer%3Amain&chapter=20`
  await page.goto(editorUrl, { waitUntil: 'domcontentloaded' })
  const workspace = page.locator('[data-slot="creator-conversation-workspace"]')
  await workspace.waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForFunction(() => (
    document.querySelector('[data-slot="creator-conversation-workspace"]')?.getAttribute('data-agent-ready') === 'true'
  ), null, { timeout: 15000 })
  const headerText = await page.locator('[data-slot="creator-conversation-header"]').innerText()
  assert(headerText.includes('第 20 章'), 'Creator header must restore the Chapter 20 route')
  const canonConfirmation = page.getByText('第 20 章已确认', { exact: true })
  await canonConfirmation.waitFor({ timeout: 10000 })
  const nextChapterAction = page.getByRole('button', { name: '开始第 21 章' })
  assert(await nextChapterAction.count() === 1, 'Creator must expose but not automatically trigger the next-chapter action')
  assert(await page.locator('[data-slot="creator-conversation-preview"]').count() === 0, 'restoring accepted Canon must not create a candidate preview')

  const postUiCanon = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('puf_creator_workspace')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      const records = await new Promise((resolve, reject) => {
        const request = db.transaction('localCanonStates', 'readonly').objectStore('localCanonStates').getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      return records.map(record => ({
        chapterId: record.chapterId,
        acceptedContentBlocks: record.acceptedContentBlocks,
      }))
    } finally {
      db.close()
    }
  })
  const postUiChapter21 = postUiCanon.find(record => record.chapterId.endsWith(':chapter:21'))
  assert(postUiChapter21 && postUiChapter21.acceptedContentBlocks.length === 0, 'opening Chapter 20 must not write Chapter 21 Canon')
  await canonConfirmation.scrollIntoViewIfNeeded()
  mkdirSync(dirname(screenshotPath), { recursive: true })
  await page.screenshot({ path: screenshotPath, fullPage: true })

  const receipt = {
    status: 'passed',
    gate: 'CREATOR_REAL_WORKSPACE_PACKAGE_MIGRATION',
    browser: 'Google Chrome',
    sourcePackagePath: packagePath,
    sourcePackageSha256: sha256(readFileSync(packagePath)),
    sourceLocalSchemaVersion: 10,
    destinationLocalSchemaVersion: dbSummary.version,
    importedRecordCount: source.records.length,
    importReceiptStatus: applied.receipt.status,
    restoredNonEmptyCanonChapterCount: restoredAccepted.length,
    restoredHistoricalContextCount: restoredContexts.length,
    legacyContextsMarkedStale: true,
    creatorChapter20RouteRestored: true,
    creatorChapter20CanonConfirmationVisible: true,
    nextChapterActionDisplayedButNotTriggered: true,
    chapter21CanonShellPresent: Boolean(restoredChapter21),
    chapter21NonEmptyCanon: Boolean(restoredChapter21 && canonText(restoredChapter21).trim()),
    generatedProse: false,
    adoptedCandidate: false,
    wroteCloud: false,
    published: false,
    screenshotPath,
    chapterEvidence,
  }
  mkdirSync(dirname(receiptPath), { recursive: true })
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`)
  console.log(JSON.stringify({ ...receipt, receiptPath }, null, 2))
} catch (error) {
  console.error('[browser-real-workspace-package-migration] FAIL')
  console.error(error instanceof Error ? error.stack : String(error))
  if (logs.length) console.error(logs.slice(-40).join(''))
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  shutdown()
}
