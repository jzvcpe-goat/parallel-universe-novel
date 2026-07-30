#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'qa')
const artifactPath = join(artifactDir, 'local-db-cross-tab.json')
const children = []
const logs = []

const draftRef = 'local-draft:cross-tab-fixture'
const initialDraft = {
  localDraftRef: draftRef,
  requestId: null,
  workId: 'work:cross-tab-fixture',
  branchId: 'branch:cross-tab-fixture',
  title: 'Initial fixture',
  content: 'Initial local prose.',
  updatedAt: '2026-07-10T10:00:00.000Z',
}
const writerADraft = {
  ...initialDraft,
  title: 'Writer A durable version',
  content: 'Writer A durable prose.',
  updatedAt: '2026-07-10T11:00:00.000Z',
}
const staleWriterBDraft = {
  ...initialDraft,
  title: 'Writer B stale version',
  content: 'Writer B stale prose.',
  updatedAt: '2026-07-10T10:30:00.000Z',
}
const recoveredWriterBDraft = {
  ...initialDraft,
  title: 'Writer B recovered version',
  content: 'Writer B recovered prose.',
  updatedAt: '2026-07-10T12:00:00.000Z',
}
const freshSameTabDraft = {
  ...initialDraft,
  title: 'Writer B fresh same-tab version',
  content: 'Writer B fresh same-tab prose.',
  updatedAt: '2026-07-10T13:00:00.000Z',
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function logLine(prefix, chunk) {
  const value = chunk.toString()
  logs.push(`${prefix} ${value}`)
  if (process.env.BROWSER_E2E_VERBOSE) process.stderr.write(`${prefix} ${value}`)
}

function start(command, args) {
  const child = spawn(command, args, {
    cwd: root,
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
  const modulePath = process.env.PLAYWRIGHT_MODULE_PATH || 'playwright'
  const module = await import(modulePath)
  return module.default || module
}

function qaDocument() {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Local DB cross-tab QA</title></head>
  <body>
    <main id="status">loading</main>
    <script type="module">
      import {
        hydrateCreatorLocalRepository,
        flushCreatorLocalWrites,
        readLocalDraftRecords,
        readLocalWorkspaceConflictRecords,
        refreshCreatorLocalRepository,
        upsertLocalDraftRecord,
      } from '/src/local-db/creatorLocalRepository.ts'
      import { runEditorDraftSave } from '/src/apps/creator/routes/creatorEditorDraftSaveService.ts'
      import { LOCAL_WORKSPACE_REHYDRATED_EVENT } from '/src/local-db/creatorLocalWorkspaceCoordination.ts'

      const events = []
      window.addEventListener(LOCAL_WORKSPACE_REHYDRATED_EVENT, event => {
        events.push(event.detail)
      })
      window.__localDbQa = {
        events,
        hydrate: hydrateCreatorLocalRepository,
        flush: flushCreatorLocalWrites,
        refresh: refreshCreatorLocalRepository,
        readDrafts: readLocalDraftRecords,
        readConflicts: readLocalWorkspaceConflictRecords,
        upsertDraft: upsertLocalDraftRecord,
        saveThroughEditor: runEditorDraftSave,
      }
      document.querySelector('#status').textContent = 'ready'
    </script>
  </body>
</html>`
}

async function openHarnessPage(context, url) {
  const page = await context.newPage()
  await page.route(url, route => route.fulfill({
    body: qaDocument(),
    contentType: 'text/html',
    status: 200,
  }))
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => Boolean(window.__localDbQa), null, { timeout: 15000 })
  await page.evaluate(() => window.__localDbQa.hydrate())
  return page
}

async function deleteWorkspaceDb(page) {
  await page.evaluate(() => new Promise((resolve, reject) => {
    const request = window.indexedDB.deleteDatabase('puf_creator_workspace')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('local workspace database deletion blocked'))
  }))
}

async function readDurableState(page) {
  return page.evaluate(async (recordId) => {
    const db = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('puf_creator_workspace')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const readOne = (storeName, key) => new Promise((resolve, reject) => {
      const request = db.transaction(storeName, 'readonly').objectStore(storeName).get(key)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const readAll = storeName => new Promise((resolve, reject) => {
      const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      return {
        draftMetadata: await readOne('drafts', recordId),
        draftBody: await readOne('draftBodies', `draft-body:${recordId}`),
        draftBodies: await readAll('draftBodies'),
        revision: await readOne('workspaceRevisions', `drafts:${recordId}`),
        conflicts: await readAll('workspaceConflicts'),
        version: db.version,
      }
    } finally {
      db.close()
    }
  }, draftRef)
}

async function waitForDurableVersion(page, version, timeoutMs = 15000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const state = await readDurableState(page)
    if (state.revision?.version === version) return state
    await delay(80)
  }
  throw new Error(`Timed out waiting for durable draft revision ${version}`)
}

async function waitForRemoteEvent(page, kind, version, timeoutMs = 15000) {
  await page.waitForFunction(({ expectedKind, expectedVersion }) => (
    window.__localDbQa.events.some(event => (
      event.kind === expectedKind
      && event.recordFamily === 'drafts'
      && event.recordId === 'local-draft:cross-tab-fixture'
      && event.version === expectedVersion
    ))
  ), { expectedKind: kind, expectedVersion: version }, { timeout: timeoutMs })
  return page.evaluate(({ expectedKind, expectedVersion }) => (
    window.__localDbQa.events.find(event => (
      event.kind === expectedKind
      && event.recordFamily === 'drafts'
      && event.recordId === 'local-draft:cross-tab-fixture'
      && event.version === expectedVersion
    ))
  ), { expectedKind: kind, expectedVersion: version })
}

let browser = null

try {
  const playwright = await loadPlaywright()
  const port = await freePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const harnessUrl = `${baseUrl}/__local_db_cross_tab__`
  const seedUrl = `${baseUrl}/__local_db_cross_tab_seed__`

  start('npm', [
    '--prefix',
    'app',
    'run',
    'dev:creator',
    '--',
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
  ])
  await waitForUrl(baseUrl)

  const launchOptions = { headless: process.env.PLAYWRIGHT_HEADLESS !== 'false' }
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  }
  browser = await playwright.chromium.launch(launchOptions)
  const context = await browser.newContext()

  const seedPage = await context.newPage()
  await seedPage.route(seedUrl, route => route.fulfill({
    body: '<!doctype html><html><body>seed</body></html>',
    contentType: 'text/html',
    status: 200,
  }))
  await seedPage.goto(seedUrl, { waitUntil: 'domcontentloaded' })
  await deleteWorkspaceDb(seedPage)
  await seedPage.close()

  const pageA = await openHarnessPage(context, harnessUrl)
  await pageA.evaluate(draft => window.__localDbQa.upsertDraft(draft), initialDraft)
  const initialState = await waitForDurableVersion(pageA, 1)
  assert(initialState.version === 10, 'cross-tab QA must run against local schema v10')
  assert(!('content' in initialState.draftMetadata), 'durable draft metadata must not inline prose')
  assert(initialState.draftBody?.content === initialDraft.content, 'initial draft body must persist before second tab opens')

  const pageB = await openHarnessPage(context, harnessUrl)
  const [observedByA, observedByB] = await Promise.all([
    pageA.evaluate(() => window.__localDbQa.readDrafts()),
    pageB.evaluate(() => window.__localDbQa.readDrafts()),
  ])
  assert(observedByA.some(draft => draft.localDraftRef === draftRef), 'tab A must observe revision 1')
  assert(observedByB.some(draft => draft.localDraftRef === draftRef), 'tab B must observe revision 1')

  await pageA.evaluate(draft => window.__localDbQa.upsertDraft(draft), writerADraft)
  const writerAState = await waitForDurableVersion(pageA, 2)
  assert(writerAState.draftBody?.content === writerADraft.content, 'tab A revision 2 must become durable')
  const commitEvent = await waitForRemoteEvent(pageB, 'record_committed', 2)

  const allowedEventKeys = [
    'kind',
    'occurredAt',
    'recordFamily',
    'recordId',
    'schemaVersion',
    'sourceId',
    'version',
    'workspaceId',
  ]
  assert(
    Object.keys(commitEvent).every(key => allowedEventKeys.includes(key)),
    'cross-tab invalidation must not contain author content or record payloads',
  )

  await pageB.evaluate(draft => window.__localDbQa.upsertDraft(draft), staleWriterBDraft)
  const conflictStartedAt = Date.now()
  let conflictState = await readDurableState(pageB)
  while (
    !conflictState.conflicts.some(conflict => conflict.recordId === draftRef && conflict.status === 'open')
    && Date.now() - conflictStartedAt < 15000
  ) {
    await delay(80)
    conflictState = await readDurableState(pageB)
  }
  const conflictRecord = conflictState.conflicts.find(conflict => conflict.recordId === draftRef)
  assert(conflictState.revision?.version === 2, 'stale tab must not advance the durable revision')
  assert(conflictState.draftBody?.content === writerADraft.content, 'stale tab must not overwrite tab A prose')
  assert(
    conflictRecord?.expectedVersion === 1,
    'conflict must retain the stale observed revision',
  )
  assert(
    conflictRecord?.actualVersion === 2,
    `conflict must retain the current durable revision: ${conflictRecord?.actualVersion}`,
  )
  assert(conflictRecord?.incomingRecord?.content === staleWriterBDraft.content, 'conflict must preserve stale incoming prose locally')
  await waitForRemoteEvent(pageA, 'conflict_created', 2)

  await pageB.reload({ waitUntil: 'domcontentloaded' })
  await pageB.waitForFunction(() => Boolean(window.__localDbQa), null, { timeout: 15000 })
  await pageB.evaluate(() => window.__localDbQa.hydrate())
  const reopenedDrafts = await pageB.evaluate(() => window.__localDbQa.readDrafts())
  assert(
    reopenedDrafts.find(draft => draft.localDraftRef === draftRef)?.content === writerADraft.content,
    'reopened tab must hydrate the durable winner after conflict',
  )

  await pageB.evaluate(draft => window.__localDbQa.upsertDraft(draft), recoveredWriterBDraft)
  const recoveredState = await waitForDurableVersion(pageB, 3)
  assert(recoveredState.draftBody?.content === recoveredWriterBDraft.content, 'fresh post-conflict save must advance to revision 3')
  assert(recoveredState.conflicts.length === 1, 'post-conflict save must preserve the recoverable conflict record')

  const historicalRegression = await pageB.evaluate(({ draft, historicalContent }) => (
    window.__localDbQa.saveThroughEditor({
      activeDraftRef: draft.localDraftRef,
      branchId: draft.branchId,
      chapterNumber: 20,
      content: historicalContent,
      linkedRequest: null,
      readiness: {
        authorReady: true,
        contentReady: true,
        destinationReady: true,
        titleReady: true,
      },
      title: draft.title,
      workId: draft.workId,
    })
  ), { draft: recoveredWriterBDraft, historicalContent: initialDraft.content })
  assert(!historicalRegression.ok, 'same-tab historical full-body submission must be rejected')
  assert(
    historicalRegression.notice.includes('较早的本机版本'),
    'same-tab historical rejection must explain that an older local revision was detected',
  )
  await pageB.evaluate(() => window.__localDbQa.flush())
  const historicalRegressionState = await readDurableState(pageB)
  assert(historicalRegressionState.revision?.version === 3, 'blocked historical submission must not advance revision 3')
  assert(
    historicalRegressionState.draftBody?.content === recoveredWriterBDraft.content,
    'blocked historical submission must preserve the newer durable prose',
  )

  const freshSameTabResult = await pageB.evaluate(draft => (
    window.__localDbQa.saveThroughEditor({
      activeDraftRef: draft.localDraftRef,
      branchId: draft.branchId,
      chapterNumber: 20,
      content: draft.content,
      linkedRequest: null,
      readiness: {
        authorReady: true,
        contentReady: true,
        destinationReady: true,
        titleReady: true,
      },
      title: draft.title,
      workId: draft.workId,
    })
  ), freshSameTabDraft)
  assert(freshSameTabResult.ok, 'a genuinely new same-tab manuscript must remain saveable')
  await pageB.evaluate(() => window.__localDbQa.flush())
  const freshSameTabState = await waitForDurableVersion(pageB, 4)
  assert(freshSameTabState.draftBody?.content === freshSameTabDraft.content, 'fresh same-tab save must advance to revision 4')
  const retainedHistory = freshSameTabState.draftBodies.filter(body => (
    body.draftId === draftRef && body.status === 'history'
  ))
  assert(retainedHistory.length <= 5, 'local draft body history must stay within the five-revision retention limit')
  assert(
    retainedHistory.some(body => body.content === initialDraft.content),
    'retained history must contain the initial body used by the regression guard',
  )

  const capabilities = await pageA.evaluate(() => ({
    broadcastChannel: typeof BroadcastChannel !== 'undefined',
    webLocks: Boolean(navigator.locks),
  }))
  assert(capabilities.broadcastChannel, 'Chrome must expose BroadcastChannel for cross-tab QA')
  assert(capabilities.webLocks, 'Chrome must expose Web Locks for cross-tab QA')

  mkdirSync(artifactDir, { recursive: true })
  const evidence = {
    status: 'passed',
    gate: 'EPIC2_LOCAL_DB_CROSS_TAB_BROWSER_QA',
    schemaVersion: initialState.version,
    webLocksAvailable: capabilities.webLocks,
    broadcastChannelAvailable: capabilities.broadcastChannel,
    initialRevision: initialState.revision.version,
    firstWriterRevision: writerAState.revision.version,
    staleWriterExpectedRevision: conflictRecord.expectedVersion,
    staleWriterActualRevision: conflictRecord.actualVersion,
    durableWinnerPreserved: conflictState.draftBody.content === writerADraft.content,
    recoverableConflictCount: recoveredState.conflicts.length,
    broadcastPayloadRedacted: Object.keys(commitEvent).every(key => allowedEventKeys.includes(key)),
    postConflictRevision: recoveredState.revision.version,
    postConflictWriteRecovered: recoveredState.draftBody.content === recoveredWriterBDraft.content,
    sameTabHistoricalRegressionBlocked: !historicalRegression.ok,
    historicalRegressionDurableVersion: historicalRegressionState.revision.version,
    historicalRegressionWinnerPreserved: historicalRegressionState.draftBody.content === recoveredWriterBDraft.content,
    freshSameTabSaveAllowed: freshSameTabResult.ok,
    finalRevision: freshSameTabState.revision.version,
    retainedDraftBodyHistoryCount: retainedHistory.length,
    draftBodyHistoryWithinLimit: retainedHistory.length <= 5,
  }
  writeFileSync(artifactPath, `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(JSON.stringify({ ...evidence, artifactPath }, null, 2))
} catch (error) {
  console.error('[browser-local-db-cross-tab] FAIL')
  console.error(error instanceof Error ? error.stack : String(error))
  if (logs.length) console.error(logs.slice(-40).join(''))
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  shutdown()
}
