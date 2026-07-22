#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { createServer } from 'node:net'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'qa')
const artifactPath = join(artifactDir, 'workspace-export-import.json')
const temporaryPackagePath = join(tmpdir(), `puf-workspace-qa-${process.pid}.pufw.zip`)
const corruptPackagePath = join(tmpdir(), `puf-workspace-qa-corrupt-${process.pid}.pufw.zip`)
const children = []
const logs = []

const draftRef = 'local-draft:workspace-package-fixture'
const sourceDraft = {
  localDraftRef: draftRef,
  requestId: null,
  workId: 'work:workspace-package-fixture',
  branchId: 'branch:workspace-package-fixture',
  title: 'Source title',
  content: 'Source private manuscript body.',
  updatedAt: '2026-07-10T13:00:00.000Z',
}
const localConflictDraft = {
  ...sourceDraft,
  title: 'Local conflict title',
  content: 'Local private manuscript body.',
  updatedAt: '2026-07-10T14:00:00.000Z',
}
const settingAsset = {
  localAssetRef: 'local-setting:workspace-package-fixture',
  workId: sourceDraft.workId,
  branchId: sourceDraft.branchId,
  kind: 'character',
  stage: 'intent',
  title: 'Character fixture',
  summary: 'Private character summary.',
  detail: 'Private character detail.',
  tags: ['fixture'],
  updatedAt: '2026-07-10T13:00:00.000Z',
}
const decisionSession = {
  schemaVersion: 'creation-session.v1',
  id: 'creation-session:workspace-package-fixture',
  workId: sourceDraft.workId,
  chapterId: 'chapter:workspace-package-fixture',
  sceneId: 'scene:workspace-package-fixture',
  branchId: sourceDraft.branchId,
  phase: 'intent_discovery',
  baseCanonRevision: 0,
  currentIntentRevision: 0,
  currentCandidateRevision: 0,
  currentDraftRevision: 0,
  lockedIntentId: null,
  selectedCandidateId: null,
  activeDraftId: null,
  activeReviewId: null,
  proposedCanonPatchId: null,
  createdAt: '2026-07-10T13:00:00.000Z',
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

function harnessDocument() {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Workspace package QA</title></head>
  <body>
    <input id="workspace-package-file" type="file" />
    <main id="status">loading</main>
    <script type="module">
      import {
        flushCreatorLocalWrites,
        hydrateCreatorLocalRepository,
        readLocalDraftRecords,
        refreshCreatorLocalRepository,
        upsertLocalDraftRecord,
        upsertLocalSettingAssetRecord,
      } from '/src/local-db/creatorLocalRepository.ts'
      import {
        prepareLocalDraftBody,
        readLocalDraftBodyRecoveryRecords,
      } from '/src/local-db/creatorLocalDraftBodyStore.ts'
      import {
        applyLocalWorkspacePackage,
        buildLocalWorkspacePackage,
        normalizeWorkspaceSettingsRecord,
        previewLocalWorkspacePackage,
        rollbackLocalWorkspaceImport,
      } from '/src/local-db/creatorLocalWorkspacePackage.ts'
      import { readLocalWorkspaceSnapshot } from '/src/local-db/creatorLocalWorkspaceRepository.ts'
      import {
        readCreatorDecisionWorkspaceRecords,
        upsertCreatorDecisionWorkspaceRecord,
      } from '/src/local-db/creatorLocalDecisionRepository.ts'
      import {
        readCreatorWritingAssistPreferences,
        writeCreatorWritingAssistPreferences,
      } from '/src/local-db/creatorLocalSettingsRepository.ts'

      let uploadedBytes = null
      let uploadPromise = Promise.resolve()
      document.querySelector('#workspace-package-file').addEventListener('change', event => {
        const file = event.target.files?.[0]
        uploadPromise = (async () => {
          uploadedBytes = file ? new Uint8Array(await file.arrayBuffer()) : null
        })()
      })

      window.__workspaceQa = {
        hydrate: hydrateCreatorLocalRepository,
        refresh: refreshCreatorLocalRepository,
        flush: flushCreatorLocalWrites,
        readDrafts: readLocalDraftRecords,
        readSnapshot: readLocalWorkspaceSnapshot,
        upsertDraft: upsertLocalDraftRecord,
        upsertSettingAsset: upsertLocalSettingAssetRecord,
        prepareBody: prepareLocalDraftBody,
        recoveryBodies: readLocalDraftBodyRecoveryRecords,
        readDecisionRecords: readCreatorDecisionWorkspaceRecords,
        upsertDecisionRecord: upsertCreatorDecisionWorkspaceRecord,
        readWritingAssistPreferences: readCreatorWritingAssistPreferences,
        writeWritingAssistPreferences: writeCreatorWritingAssistPreferences,
        waitForUpload: () => uploadPromise,
        async downloadPackage() {
          const result = await buildLocalWorkspacePackage({})
          const blob = new Blob([result.bytes], { type: 'application/zip' })
          const anchor = document.createElement('a')
          anchor.href = URL.createObjectURL(blob)
          anchor.download = 'workspace-fixture.pufw.zip'
          anchor.click()
          setTimeout(() => URL.revokeObjectURL(anchor.href), 0)
          return result.manifest
        },
        async inspectUploaded() {
          if (!uploadedBytes) throw new Error('No uploaded package')
          const result = await buildLocalWorkspacePackage({})
          return {
            uploadedByteLength: uploadedBytes.byteLength,
            currentPackageFormat: result.manifest.format,
          }
        },
        async previewUploaded() {
          if (!uploadedBytes) throw new Error('No uploaded package')
          return previewLocalWorkspacePackage(uploadedBytes)
        },
        async applyUploaded(input) {
          if (!uploadedBytes) throw new Error('No uploaded package')
          return applyLocalWorkspacePackage(uploadedBytes, input)
        },
        rollbackImport: rollbackLocalWorkspaceImport,
        normalizeWorkspaceSettings: normalizeWorkspaceSettingsRecord,
      }
      document.querySelector('#status').textContent = 'ready'
    </script>
  </body>
</html>`
}

async function cleanBrowserStorage(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      const request = window.indexedDB.deleteDatabase('puf_creator_workspace')
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
      request.onblocked = () => reject(new Error('database deletion blocked'))
    })
    if (navigator.storage?.getDirectory) {
      const root = await navigator.storage.getDirectory()
      try {
        await root.removeEntry('puf-creator', { recursive: true })
      } catch {
        // The origin may not have OPFS content yet.
      }
    }
  })
}

async function openHarnessPage(context, url) {
  const page = await context.newPage()
  page.on('pageerror', error => logs.push(`[page:error] ${error.message}`))
  page.on('console', message => {
    if (message.type() === 'error') logs.push(`[page:console] ${message.text()}`)
  })
  await page.route(url, route => route.fulfill({
    body: harnessDocument(),
    contentType: 'text/html',
    status: 200,
  }))
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => Boolean(window.__workspaceQa), null, { timeout: 15000 })
  await page.evaluate(() => window.__workspaceQa.hydrate())
  return page
}

async function readDurableDraftState(page) {
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
    try {
      const metadata = await readOne('drafts', recordId)
      const body = metadata?.bodyStorage?.tableId
        ? await readOne('draftBodies', metadata.bodyStorage.tableId)
        : null
      return {
        metadata,
        body,
        stores: Array.from(db.objectStoreNames),
        version: db.version,
      }
    } finally {
      db.close()
    }
  }, draftRef)
}

async function overwriteOpfsBody(page, path) {
  return page.evaluate(async (bodyPath) => {
    const segments = bodyPath.split('/')
    const fileName = segments.pop()
    let directory = await navigator.storage.getDirectory()
    for (const segment of segments) directory = await directory.getDirectoryHandle(segment)
    const handle = await directory.getFileHandle(fileName)
    const writable = await handle.createWritable()
    await writable.write('corrupted opfs body')
    await writable.close()
  }, path)
}

let browser = null

try {
  const playwright = await loadPlaywright()
  const port = await freePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const harnessUrl = `${baseUrl}/__workspace_package_qa__`
  const seedUrl = `${baseUrl}/__workspace_package_seed__`

  start('npm', [
    '--prefix', 'app', 'run', 'dev:creator', '--',
    '--host', '127.0.0.1', '--port', String(port),
  ])
  await waitForUrl(baseUrl)

  const launchOptions = { headless: process.env.PLAYWRIGHT_HEADLESS !== 'false' }
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  browser = await playwright.chromium.launch(launchOptions)

  const sourceContext = await browser.newContext({ acceptDownloads: true })
  const sourceSeed = await sourceContext.newPage()
  await sourceSeed.route(seedUrl, route => route.fulfill({ body: '<html>seed</html>', contentType: 'text/html' }))
  await sourceSeed.goto(seedUrl)
  await cleanBrowserStorage(sourceSeed)
  await sourceSeed.close()

  let sourcePage = await openHarnessPage(sourceContext, harnessUrl)
  await sourcePage.evaluate(async ({ draft, asset, session }) => {
    window.__workspaceQa.upsertDraft(draft)
    window.__workspaceQa.upsertSettingAsset(asset)
    window.__workspaceQa.writeWritingAssistPreferences({
      schemaVersion: 'creator-writing-assist-preferences.v1',
      enabled: true,
      selectionMode: 'custom',
      projectLensIds: ['continuity', 'pacing'],
      triggerPolicy: 'natural_checkpoints_only',
      suppressedLensIds: ['exposition'],
    })
    await window.__workspaceQa.upsertDecisionRecord('creationSessions', session)
  }, { draft: sourceDraft, asset: settingAsset, session: decisionSession })
  await sourcePage.evaluate(() => window.__workspaceQa.flush())
  const durable = await readDurableDraftState(sourcePage)
  assert(durable.version === 10, 'workspace package QA must run against schema v10')
  assert(!('content' in durable.metadata), 'draft metadata store must not retain manuscript prose')
  assert(durable.metadata?.bodyStorage?.kind === 'opfs', 'Chrome should use OPFS as preferred body storage')
  assert(durable.body?.status === 'ready', 'IndexedDB recovery copy must be ready')
  assert(durable.body?.content === sourceDraft.content, 'IndexedDB recovery copy must match the source body')
  assert(durable.stores.includes('workspacePackages'), 'schema v10 must preserve workspacePackages')
  assert(durable.stores.includes('workspaceImports'), 'schema v10 must preserve workspaceImports')
  assert(durable.stores.includes('agentConfirmations'), 'schema v10 must preserve agentConfirmations')
  assert(durable.stores.includes('readerSignalSources'), 'schema v10 must preserve readerSignalSources')
  assert(durable.stores.includes('verifiedLongRangeThreads'), 'schema v10 must preserve verifiedLongRangeThreads')

  await sourcePage.reload({ waitUntil: 'domcontentloaded' })
  await sourcePage.waitForFunction(() => Boolean(window.__workspaceQa), null, { timeout: 15000 })
  await sourcePage.evaluate(() => window.__workspaceQa.hydrate())
  let restored = await sourcePage.evaluate(() => window.__workspaceQa.readDrafts())
  assert(restored.find(draft => draft.localDraftRef === draftRef)?.content === sourceDraft.content, 'OPFS body must restore after reload')

  await overwriteOpfsBody(sourcePage, durable.metadata.bodyStorage.path)
  await sourcePage.reload({ waitUntil: 'domcontentloaded' })
  await sourcePage.waitForFunction(() => Boolean(window.__workspaceQa), null, { timeout: 15000 })
  await sourcePage.evaluate(() => window.__workspaceQa.hydrate())
  restored = await sourcePage.evaluate(() => window.__workspaceQa.readDrafts())
  assert(restored.find(draft => draft.localDraftRef === draftRef)?.content === sourceDraft.content, 'corrupt OPFS body must fall back to IndexedDB recovery copy')

  await sourcePage.evaluate(async ({ recordId, content }) => {
    await window.__workspaceQa.prepareBody(recordId, content, 2, '2026-07-10T13:30:00.000Z')
  }, { recordId: draftRef, content: 'Uncommitted staged body.' })
  const recoveryCount = await sourcePage.evaluate(async () => (await window.__workspaceQa.recoveryBodies()).length)
  assert(recoveryCount === 1, 'partial body write must remain as one recoverable staged record')
  await sourcePage.reload({ waitUntil: 'domcontentloaded' })
  await sourcePage.waitForFunction(() => Boolean(window.__workspaceQa), null, { timeout: 15000 })
  await sourcePage.evaluate(() => window.__workspaceQa.hydrate())
  restored = await sourcePage.evaluate(() => window.__workspaceQa.readDrafts())
  assert(restored.find(draft => draft.localDraftRef === draftRef)?.content === sourceDraft.content, 'staged body must not be reported as the saved draft')

  const downloadPromise = sourcePage.waitForEvent('download')
  const manifest = await sourcePage.evaluate(() => window.__workspaceQa.downloadPackage())
  const download = await downloadPromise
  await download.saveAs(temporaryPackagePath)
  assert(manifest.format === 'puf-local-creator-workspace-v2', 'download must use the v2 workspace package format')

  const requireFromApp = createRequire(join(root, 'app', 'package.json'))
  const { unzipSync, zipSync } = requireFromApp('fflate')
  const corruptFiles = unzipSync(new Uint8Array(readFileSync(temporaryPackagePath)))
  const packagePaths = Object.keys(corruptFiles).sort()
  assert(packagePaths.includes('manifest.json'), 'package must include manifest.json')
  assert(packagePaths.includes('records.json'), 'package must include records.json')
  assert(packagePaths.some(path => path.startsWith('bodies/') && path.endsWith('.md')), 'package must include bodies/*.md')
  assert(packagePaths.some(path => path.startsWith('receipts/') && path.endsWith('.json')), 'package must include receipts/*.json')
  const recordsPayload = JSON.parse(new TextDecoder().decode(corruptFiles['records.json']))
  const workspaceSettingsRecord = recordsPayload.records.find(record => record.family === 'workspaceSettings')
  const decisionSessionRecord = recordsPayload.records.find(record => (
    record.family === 'creationSessions' && record.id === decisionSession.id
  ))
  assert(decisionSessionRecord, 'package must include Creator decision records')
  assert(workspaceSettingsRecord, 'package must include display preferences as workspace settings')
  assert(workspaceSettingsRecord.value.writingAssistPreferences.enabled === true, 'package must include writing assistance preferences')
  assert(workspaceSettingsRecord.value.writingAssistPreferences.projectLensIds.join(',') === 'continuity,pacing', 'package must preserve selected writing lenses')
  const workspaceSettingsText = JSON.stringify(workspaceSettingsRecord.value)
  for (const retiredKey of ['aiSettings', 'provider', 'baseUrl', 'model', 'hasKey']) {
    assert(!workspaceSettingsText.includes(retiredKey), `workspace package must exclude retired tool setting ${retiredKey}`)
  }
  const corruptBodyPath = Object.keys(corruptFiles).find(path => path.startsWith('bodies/'))
  assert(corruptBodyPath, 'downloaded package must contain a body to corrupt')
  const corruptBody = new Uint8Array(corruptFiles[corruptBodyPath])
  corruptBody[0] = corruptBody[0] ^ 0xff
  corruptFiles[corruptBodyPath] = corruptBody
  writeFileSync(corruptPackagePath, zipSync(corruptFiles, { level: 6 }))

  const destinationContext = await browser.newContext()
  const destinationSeed = await destinationContext.newPage()
  await destinationSeed.route(seedUrl, route => route.fulfill({ body: '<html>seed</html>', contentType: 'text/html' }))
  await destinationSeed.goto(seedUrl)
  await cleanBrowserStorage(destinationSeed)
  await destinationSeed.close()
  const destinationPage = await openHarnessPage(destinationContext, harnessUrl)
  const normalizedLegacySettings = await destinationPage.evaluate(() => window.__workspaceQa.normalizeWorkspaceSettings({
    displayPreferences: { reduceMotion: true, reduceTransparency: false },
    aiSettings: {
      provider: 'openai_compatible',
      baseUrl: 'https://legacy.invalid',
      model: 'legacy-tool',
      hasKey: true,
    },
  }))
  assert(normalizedLegacySettings.displayPreferences.reduceMotion === true, 'legacy workspace settings must preserve display preferences')
  assert(normalizedLegacySettings.writingAssistPreferences.enabled === false, 'legacy workspace settings must default writing assistance to disabled')
  assert(!('aiSettings' in normalizedLegacySettings), 'legacy workspace settings must discard retired tool configuration')
  await destinationPage.locator('#workspace-package-file').setInputFiles(temporaryPackagePath)
  await destinationPage.evaluate(() => window.__workspaceQa.waitForUpload())

  const uploadInspection = await destinationPage.evaluate(() => window.__workspaceQa.inspectUploaded())
  assert(uploadInspection.uploadedByteLength > 0, 'browser file upload must provide package bytes')
  assert(uploadInspection.currentPackageFormat === 'puf-local-creator-workspace-v2', 'browser harness must load the package implementation')

  const initialPreview = await destinationPage.evaluate(() => window.__workspaceQa.previewUploaded())
  assert(initialPreview.additions.some(item => item.family === 'drafts' && item.id === draftRef), 'empty destination must preview draft addition')
  assert(initialPreview.additions.some(item => item.family === 'writingAssets'), 'empty destination must preview setting-asset addition')
  assert(initialPreview.additions.some(item => item.family === 'creationSessions' && item.id === decisionSession.id), 'empty destination must preview decision-session addition')
  let destinationSnapshot = await destinationPage.evaluate(() => window.__workspaceQa.readSnapshot())
  assert(destinationSnapshot.drafts.length === 0, 'preview cancel path must not write drafts')

  await destinationPage.locator('#workspace-package-file').setInputFiles(corruptPackagePath)
  await destinationPage.evaluate(() => window.__workspaceQa.waitForUpload())
  const corruptResult = await destinationPage.evaluate(async () => {
    try {
      await window.__workspaceQa.previewUploaded()
      return { rejected: false, message: '' }
    } catch (error) {
      return { rejected: true, message: String(error) }
    }
  })
  assert(
    corruptResult.rejected && corruptResult.message.includes('checksum mismatch'),
    `corrupt package body checksum must be rejected before preview: ${corruptResult.message}`,
  )
  await destinationPage.locator('#workspace-package-file').setInputFiles(temporaryPackagePath)
  await destinationPage.evaluate(() => window.__workspaceQa.waitForUpload())

  const unconfirmedRejected = await destinationPage.evaluate(async () => {
    try {
      await window.__workspaceQa.applyUploaded({ authorConfirmed: false, conflictPolicy: 'keep-local' })
      return false
    } catch (error) {
      return String(error).includes('Author confirmation')
    }
  })
  assert(unconfirmedRejected, 'workspace import must reject an unconfirmed apply')

  const firstApply = await destinationPage.evaluate(() => window.__workspaceQa.applyUploaded({
    authorConfirmed: true,
    conflictPolicy: 'keep-local',
  }))
  destinationSnapshot = await destinationPage.evaluate(() => window.__workspaceQa.readSnapshot())
  assert(destinationSnapshot.drafts.find(draft => draft.localDraftRef === draftRef)?.content === sourceDraft.content, 'confirmed import must restore the source body')
  assert(destinationSnapshot.settingAssets.some(asset => asset.localAssetRef === settingAsset.localAssetRef), 'confirmed import must preserve setting-asset identity')
  let destinationDecisionRecords = await destinationPage.evaluate(() => window.__workspaceQa.readDecisionRecords())
  assert(destinationDecisionRecords.some(record => record.family === 'creationSessions' && record.id === decisionSession.id), 'confirmed import must restore decision records')

  await destinationPage.evaluate(receiptId => window.__workspaceQa.rollbackImport(receiptId), firstApply.receipt.id)
  destinationSnapshot = await destinationPage.evaluate(() => window.__workspaceQa.readSnapshot())
  assert(!destinationSnapshot.drafts.some(draft => draft.localDraftRef === draftRef), 'addition rollback must remove imported draft')
  assert(!destinationSnapshot.settingAssets.some(asset => asset.localAssetRef === settingAsset.localAssetRef), 'addition rollback must remove imported asset')
  destinationDecisionRecords = await destinationPage.evaluate(() => window.__workspaceQa.readDecisionRecords())
  assert(!destinationDecisionRecords.some(record => record.id === decisionSession.id), 'addition rollback must remove imported decision records')

  await destinationPage.evaluate(() => window.__workspaceQa.applyUploaded({
    authorConfirmed: true,
    conflictPolicy: 'keep-local',
  }))
  await destinationPage.evaluate(draft => window.__workspaceQa.upsertDraft(draft), localConflictDraft)
  await destinationPage.evaluate(() => window.__workspaceQa.flush())
  const conflictPreview = await destinationPage.evaluate(() => window.__workspaceQa.previewUploaded())
  assert(conflictPreview.conflicts.some(item => item.family === 'drafts' && item.id === draftRef), 'changed destination draft must preview as a conflict')

  await destinationPage.evaluate(() => window.__workspaceQa.applyUploaded({
    authorConfirmed: true,
    conflictPolicy: 'keep-local',
  }))
  destinationSnapshot = await destinationPage.evaluate(() => window.__workspaceQa.readSnapshot())
  assert(destinationSnapshot.drafts.find(draft => draft.localDraftRef === draftRef)?.content === localConflictDraft.content, 'keep-local policy must preserve destination body')

  const overwriteApply = await destinationPage.evaluate(() => window.__workspaceQa.applyUploaded({
    authorConfirmed: true,
    conflictPolicy: 'use-import',
  }))
  destinationSnapshot = await destinationPage.evaluate(() => window.__workspaceQa.readSnapshot())
  assert(destinationSnapshot.drafts.find(draft => draft.localDraftRef === draftRef)?.content === sourceDraft.content, 'use-import policy must apply source body after confirmation')
  const restoredWritingAssistPreferences = await destinationPage.evaluate(() => window.__workspaceQa.readWritingAssistPreferences())
  assert(restoredWritingAssistPreferences.enabled === true, 'use-import policy must restore writing assistance preferences')
  assert(restoredWritingAssistPreferences.projectLensIds.join(',') === 'continuity,pacing', 'restored writing assistance preferences must preserve selected lenses')

  const postImportEdit = {
    ...localConflictDraft,
    content: 'post-import author edit',
    updatedAt: '2026-07-10T12:25:00.000Z',
  }
  await destinationPage.evaluate(draft => window.__workspaceQa.upsertDraft(draft), postImportEdit)
  await destinationPage.evaluate(() => window.__workspaceQa.flush())
  await destinationPage.evaluate(() => window.__workspaceQa.refresh())
  const rollbackConflictRejected = await destinationPage.evaluate(async (receiptId) => {
    try {
      await window.__workspaceQa.rollbackImport(receiptId)
      return false
    } catch (error) {
      return String(error).includes('Workspace rollback conflict')
    }
  }, overwriteApply.receipt.id)
  assert(rollbackConflictRejected, 'rollback must reject records edited after import')
  destinationSnapshot = await destinationPage.evaluate(() => window.__workspaceQa.readSnapshot())
  assert(destinationSnapshot.drafts.find(draft => draft.localDraftRef === draftRef)?.content === postImportEdit.content, 'rejected rollback must preserve the author post-import edit')

  const finalOverwriteApply = await destinationPage.evaluate(() => window.__workspaceQa.applyUploaded({
    authorConfirmed: true,
    conflictPolicy: 'use-import',
  }))

  const rollbackReceipt = await destinationPage.evaluate(receiptId => window.__workspaceQa.rollbackImport(receiptId), finalOverwriteApply.receipt.id)
  destinationSnapshot = await destinationPage.evaluate(() => window.__workspaceQa.readSnapshot())
  assert(rollbackReceipt.status === 'rolled_back', 'conflict import rollback must produce rolled_back receipt')
  assert(destinationSnapshot.drafts.find(draft => draft.localDraftRef === draftRef)?.content === postImportEdit.content, 'conflict rollback must restore the latest pre-import destination body')

  mkdirSync(artifactDir, { recursive: true })
  const evidence = {
    status: 'passed',
    gate: 'EPIC2_WORKSPACE_EXPORT_IMPORT_BROWSER_QA',
    schemaVersion: durable.version,
    metadataContainsProse: 'content' in durable.metadata,
    preferredBodyStorage: durable.metadata.bodyStorage.kind,
    indexedDbRecoveryCopyReady: durable.body.status === 'ready',
    opfsCorruptionRecoveredFromIndexedDb: true,
    stagedBodyRecoveryCount: recoveryCount,
    stagedBodyReportedAsSaved: false,
    packageFormat: manifest.format,
    uploadedPackageByteLength: uploadInspection.uploadedByteLength,
    packageFileCount: packagePaths.length,
    manifestPresent: packagePaths.includes('manifest.json'),
    recordsPresent: packagePaths.includes('records.json'),
    decisionRecordExported: Boolean(decisionSessionRecord),
    decisionRecordImportRestored: true,
    decisionRecordRollbackRestored: true,
    bodyFilePresent: packagePaths.some(path => path.startsWith('bodies/')),
    receiptFilePresent: packagePaths.some(path => path.startsWith('receipts/')),
    retiredToolSettingsExcluded: true,
    legacySettingsNormalizedReadOnly: true,
    corruptChecksumRejected: corruptResult.rejected,
    previewCancelPreservedDestination: true,
    unconfirmedApplyRejected: unconfirmedRejected,
    additionImportRestored: true,
    additionRollbackRestored: true,
    deterministicConflictPreview: conflictPreview.conflicts.some(item => item.id === draftRef),
    keepLocalPolicyPreserved: true,
    useImportPolicyApplied: true,
    postImportEditProtected: rollbackConflictRejected,
    conflictRollbackRestored: true,
  }
  writeFileSync(artifactPath, `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(JSON.stringify({ ...evidence, artifactPath }, null, 2))
} catch (error) {
  console.error('[browser-workspace-export-import] FAIL')
  console.error(error instanceof Error ? error.stack : String(error))
  if (logs.length) console.error(logs.slice(-40).join(''))
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  shutdown()
  rmSync(temporaryPackagePath, { force: true })
  rmSync(corruptPackagePath, { force: true })
}
