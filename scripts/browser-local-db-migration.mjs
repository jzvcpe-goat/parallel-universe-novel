#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const root = resolve(new URL('..', import.meta.url).pathname)
const qaBuildDir = join(root, 'app', 'dist-creator-qa')
const artifactDir = join(root, 'artifacts', 'qa')
const artifactPath = join(artifactDir, 'local-db-migration.json')
const children = []
const logs = []

const legacyDraft = {
  localDraftRef: 'local-draft:migration-fixture',
  requestId: null,
  workId: 'work:migration-fixture',
  branchId: 'branch:migration-fixture',
  title: 'legacy-title',
  content: 'legacy-stale-body',
  updatedAt: '2026-07-01T00:00:00.000Z',
}
const legacyOnlyDraft = {
  ...legacyDraft,
  localDraftRef: 'local-draft:migration-legacy-only',
  title: 'legacy-only-title',
  content: 'legacy-only-body',
}
const storedV3Draft = {
  ...legacyDraft,
  title: 'indexeddb-v3-title',
  content: 'indexeddb-v3-current-body',
  updatedAt: '2026-07-09T00:00:00.000Z',
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

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
  child.stdout.on('data', chunk => logLine('[preview]', chunk))
  child.stderr.on('data', chunk => logLine('[preview:err]', chunk))
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

let browser = null

try {
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  page.on('console', message => logs.push(`[page:${message.type()}] ${message.text()}`))
  page.on('pageerror', error => logs.push(`[page:error] ${error.message}`))
  const seedUrl = `${baseUrl}/__local_db_migration_seed__`
  await page.route(seedUrl, route => route.fulfill({
    body: '<!doctype html><html><body>seed</body></html>',
    contentType: 'text/html',
    status: 200,
  }))
  await page.goto(seedUrl, { waitUntil: 'domcontentloaded' })
  await page.evaluate(async ({ legacy, legacyOnly, stored }) => {
    window.localStorage.setItem(
      'parallel-universe.local-creator.drafts',
      JSON.stringify([legacy, legacyOnly]),
    )
    const db = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('puf_creator_workspace', 3)
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('drafts')) {
          request.result.createObjectStore('drafts', { keyPath: 'localDraftRef' })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('drafts', 'readwrite')
      transaction.objectStore('drafts').put(stored)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
    db.close()
  }, { legacy: legacyDraft, legacyOnly: legacyOnlyDraft, stored: storedV3Draft })
  await page.unroute(seedUrl)

  await page.goto(`${baseUrl}/#/creator/settings?qa=local-db-migration`, {
    waitUntil: 'domcontentloaded',
  })
  await page.waitForFunction(
    () => document.body.innerText.includes('创作环境已更新。'),
    null,
    { timeout: 15000 },
  )
  await page.waitForFunction(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('puf_creator_workspace')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      if (!db.objectStoreNames.contains('migrations')) return false
      const read = (storeName, key) => new Promise((resolve, reject) => {
        const request = db.transaction(storeName, 'readonly').objectStore(storeName).get(key)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      const receipt = await read('migrations', 'legacy-local-storage-v1')
      const draft = await read('drafts', 'local-draft:migration-fixture')
      const body = await read('draftBodies', 'draft-body:local-draft:migration-fixture')
      return receipt?.status === 'applied'
        && draft
        && !('content' in draft)
        && body?.status === 'ready'
    } finally {
      db.close()
    }
  }, null, { timeout: 15000 })

  const firstRead = await page.evaluate(async (draftRef) => {
    const db = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('puf_creator_workspace')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      const read = (storeName, key) => new Promise((resolve, reject) => {
        const request = db.transaction(storeName, 'readonly').objectStore(storeName).get(key)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      const draft = await read('drafts', draftRef)
      const legacyOnly = await read('drafts', 'local-draft:migration-legacy-only')
      const draftBody = await read('draftBodies', `draft-body:${draftRef}`)
      const legacyOnlyBody = await read('draftBodies', 'draft-body:local-draft:migration-legacy-only')
      const receipt = await read('migrations', 'legacy-local-storage-v1')
      const draftStore = db.transaction('drafts', 'readonly').objectStore('drafts')
      const bodyStore = db.transaction('draftBodies', 'readonly').objectStore('draftBodies')
      return {
        body: draftBody?.content,
        metadataContainsProse: Boolean(draft && 'content' in draft),
        legacyOnlyBody: legacyOnlyBody?.content,
        legacyOnlyMetadataContainsProse: Boolean(legacyOnly && 'content' in legacyOnly),
        draftIndexes: Array.from(draftStore.indexNames),
        bodyIndexes: Array.from(bodyStore.indexNames),
        receipt,
        stores: Array.from(db.objectStoreNames),
        version: db.version,
      }
    } finally {
      db.close()
    }
  }, legacyDraft.localDraftRef)

  assert(firstRead.version === 10, 'local DB must upgrade to schema version 10')
  assert(firstRead.stores.includes('agentConfirmations'), 'schema v10 must preserve agentConfirmations')
  assert(firstRead.stores.includes('readerSignalSources'), 'schema v10 must preserve readerSignalSources')
  assert(firstRead.stores.includes('verifiedLongRangeThreads'), 'schema v10 must add verifiedLongRangeThreads')
  assert(firstRead.body === storedV3Draft.content, 'v3 IndexedDB draft must win the legacy conflict during upgrade')
  assert(!firstRead.metadataContainsProse, 'migrated draft metadata must not inline prose')
  assert(firstRead.legacyOnlyBody === legacyOnlyDraft.content, 'v6 upgrade must import a legacy-only draft')
  assert(!firstRead.legacyOnlyMetadataContainsProse, 'imported draft metadata must not inline prose')
  assert(firstRead.receipt?.conflictPolicy === 'indexeddb-wins', 'migration receipt must declare conflict policy')
  assert(firstRead.receipt?.importedRecordCounts?.drafts === 1, 'receipt must count the legacy-only draft import')
  assert(firstRead.receipt?.preservedConflictCounts?.drafts === 1, 'receipt must count the preserved v3 draft conflict')
  assert(firstRead.stores.includes('draftBodies'), 'schema upgrade must create the draftBodies store')
  assert(firstRead.stores.includes('workspaceRevisions'), 'schema upgrade must create the workspaceRevisions store')
  assert(firstRead.stores.includes('workspaceConflicts'), 'schema upgrade must create the workspaceConflicts store')
  assert(firstRead.stores.includes('workspacePackages'), 'schema upgrade must create the workspacePackages store')
  assert(firstRead.stores.includes('workspaceImports'), 'schema upgrade must create the workspaceImports store')
  assert(firstRead.draftIndexes.includes('updatedAt'), 'draft store must own its updatedAt index')
  assert(firstRead.bodyIndexes.includes('draftId'), 'draftBodies store must own its draftId index')

  await page.evaluate(async (draft) => {
    const db = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('puf_creator_workspace')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('drafts', 'readwrite')
      transaction.objectStore('drafts').put({
        ...draft,
        title: 'current-title',
        content: 'indexeddb-current-body',
        updatedAt: '2026-07-10T12:00:00.000Z',
      })
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
    db.close()
  }, storedV3Draft)

  const originalAppliedAt = firstRead.receipt.appliedAt
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)

  const secondRead = await page.evaluate(async (draftRef) => {
    const db = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('puf_creator_workspace')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      const read = (storeName, key) => new Promise((resolve, reject) => {
        const request = db.transaction(storeName, 'readonly').objectStore(storeName).get(key)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      const receipts = await new Promise((resolve, reject) => {
        const request = db.transaction('migrations', 'readonly').objectStore('migrations').getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      const legacyValue = JSON.parse(
        window.localStorage.getItem('parallel-universe.local-creator.drafts') || '[]',
      )
      const draft = await read('drafts', draftRef)
      const draftBody = await read('draftBodies', `draft-body:${draftRef}`)
      return {
        draftBody: draftBody?.content,
        metadataContainsProse: Boolean(draft && 'content' in draft),
        legacyBody: legacyValue[0]?.content,
        receipt: receipts.find(item => item.id === 'legacy-local-storage-v1'),
        receiptCount: receipts.filter(item => item.id === 'legacy-local-storage-v1').length,
      }
    } finally {
      db.close()
    }
  }, legacyDraft.localDraftRef)

  assert(secondRead.legacyBody === 'legacy-stale-body', 'legacy source must remain read-only and untouched')
  assert(secondRead.draftBody === 'indexeddb-current-body', 'repeat hydration must not restore stale legacy prose')
  assert(!secondRead.metadataContainsProse, 'repeat hydration must keep prose out of draft metadata')
  assert(secondRead.receiptCount === 1, 'repeat hydration must keep exactly one migration receipt')
  assert(secondRead.receipt?.appliedAt === originalAppliedAt, 'repeat hydration must retain the original receipt')

  mkdirSync(artifactDir, { recursive: true })
  const evidence = {
    status: 'passed',
    gate: 'EPIC2_LOCAL_DB_MIGRATION_BROWSER_QA',
    schemaVersion: firstRead.version,
    conflictPolicy: firstRead.receipt.conflictPolicy,
    draftBodiesStoreReady: firstRead.stores.includes('draftBodies'),
    workspaceRevisionStoreReady: firstRead.stores.includes('workspaceRevisions'),
    workspaceConflictStoreReady: firstRead.stores.includes('workspaceConflicts'),
    workspacePackageStoreReady: firstRead.stores.includes('workspacePackages'),
    workspaceImportStoreReady: firstRead.stores.includes('workspaceImports'),
    v3UpgradeConflictPreserved: firstRead.body === storedV3Draft.content,
    legacyOnlyRecordImported: firstRead.legacyOnlyBody === legacyOnlyDraft.content,
    legacySourcePreserved: secondRead.legacyBody === 'legacy-stale-body',
    indexedDbConflictWinnerPreserved: secondRead.draftBody === 'indexeddb-current-body',
    migratedMetadataContainsProse: firstRead.metadataContainsProse,
    migrationReceiptCount: secondRead.receiptCount,
  }
  writeFileSync(artifactPath, `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(JSON.stringify({ ...evidence, artifactPath }, null, 2))
} catch (error) {
  console.error('[browser-local-db-migration] FAIL')
  console.error(error instanceof Error ? error.stack : String(error))
  if (logs.length) console.error(logs.slice(-40).join(''))
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  shutdown()
  rmSync(qaBuildDir, { recursive: true, force: true })
}
