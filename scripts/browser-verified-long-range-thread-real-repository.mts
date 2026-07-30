#!/usr/bin/env node
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { dirname, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { parseArgs } from 'node:util'

import { strFromU8, unzipSync } from 'fflate'

import { localCanonStateRecordSchema } from '../app/src/features/creator-decision/schemas.ts'
import {
  buildVerifiedLongRangeThreadRecords,
  computeLongRangeThreadSourceRevision,
  type VerifiedLongRangeThreadRecord,
} from '../app/src/features/creator-decision/longRangeThreadRecall.ts'
import type { LongformContinuityChapter } from '../app/src/features/creator-decision/longformContinuity.ts'
import {
  longRangeStoryThreadReviewSchema,
  longRangeStoryThreadVerificationSchema,
} from '../app/src/features/creator-decision/longRangeStoryThreads.ts'
import type { LocalCreatorStoreName } from '../app/src/local-db/schema.ts'

type WorkspaceExport = {
  schemaVersion: number
  records: Array<{ family: LocalCreatorStoreName; value: unknown }>
}

type Summary = {
  completedAt?: string
  scope?: {
    workId?: string
    fromChapter?: number
    toChapter?: number
    chapterCount?: number
    workspaceArchiveSha256?: string
  }
  results?: {
    verifiedThreadCount?: number
    activeRecallCandidateCount?: number
    statusCounts?: Record<string, number>
  }
  runtime?: { privateArtifactsDirectory?: string }
  sideEffects?: { chapter21AccessedOrChanged?: boolean }
}

const root = resolve(new URL('..', import.meta.url).pathname)
const defaultSummary = resolve(
  root,
  'validation/creator-ui/conversation-recall-2026-07-14/chapter-01-20-long-range-story-threads-reconciled-2026-07-16/summary.json',
)
const defaultReceipt = resolve(
  root,
  'validation/creator-writing/verified-long-range-thread-real-repository-2026-07-17.json',
)
const defaultUiReceipt = resolve(
  root,
  'validation/creator-writing/verified-long-range-thread-author-selection-2026-07-18.json',
)
const defaultArtifactDirectory = resolve(
  root,
  'artifacts/visual-qa/verified-long-range-thread-author-selection',
)
const stopLine = 20
const children: Array<ReturnType<typeof spawn>> = []

const { values } = parseArgs({
  options: {
    workspace: { type: 'string' },
    summary: { type: 'string', default: defaultSummary },
    receipt: { type: 'string', default: defaultReceipt },
    uiReceipt: { type: 'string', default: defaultUiReceipt },
    artifactDirectory: { type: 'string', default: defaultArtifactDirectory },
  },
  strict: true,
})

function sha256(value: Uint8Array | string) {
  return createHash('sha256').update(value).digest('hex')
}

function chapterNumber(chapterId: string) {
  const match = chapterId.match(/:chapter:(\d+)$/u)
  return match ? Number(match[1]) : null
}

function freePort() {
  return new Promise<number>((resolvePort, reject) => {
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

async function waitForUrl(url: string, timeoutMs = 30000) {
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

function shutdown() {
  for (const child of children) {
    if (child.killed) continue
    try {
      if (process.platform === 'win32') child.kill('SIGTERM')
      else process.kill(-child.pid!, 'SIGTERM')
    } catch {
      child.kill('SIGTERM')
    }
  }
}

function harnessDocument() {
  return `<!doctype html><html><body><main id="status">loading</main><script type="module">
    import {
      importVerifiedLongRangeThreadRecords,
      loadVerifiedLongRangeThreadRecallCandidates,
      readVerifiedLongRangeThreadRecords,
    } from '/src/local-db/creatorLocalLongRangeThreadRepository.ts'
    import {
      deleteLocalWorkspaceRecord,
      flushCreatorLocalWrites,
      refreshCreatorLocalRepository,
    } from '/src/local-db/creatorLocalRepository.ts'
    import {
      applyLocalWorkspacePackage,
      buildLocalWorkspacePackage,
    } from '/src/local-db/creatorLocalWorkspacePackage.ts'
    import { creatorLocalDecisionRepository } from '/src/local-db/creatorLocalDecisionRepository.ts'
    import { runEditorLongRangeRecallLoad } from '/src/apps/creator/routes/creatorEditorLongRangeRecallService.ts'
    window.__threadQa = {
      applyPackage: applyLocalWorkspacePackage,
      buildPackage: buildLocalWorkspacePackage,
      deleteRecord: deleteLocalWorkspaceRecord,
      flush: flushCreatorLocalWrites,
      importRecords: importVerifiedLongRangeThreadRecords,
      loadCandidates: loadVerifiedLongRangeThreadRecallCandidates,
      readRecords: readVerifiedLongRangeThreadRecords,
      refresh: refreshCreatorLocalRepository,
      routeLoad: runEditorLongRangeRecallLoad,
      saveCanonState: (canon) => creatorLocalDecisionRepository.saveCanonState(canon),
    }
    document.querySelector('#status').textContent = 'ready'
  </script></body></html>`
}

function readRealCorpus(input: {
  workspaceBytes: Uint8Array
  ledgerBytes: Uint8Array
  summary: Summary
}) {
  const archive = unzipSync(input.workspaceBytes)
  const recordsBytes = archive['records.json']
  assert.ok(recordsBytes, 'Workspace archive must contain records.json.')
  const workspace = JSON.parse(strFromU8(recordsBytes)) as WorkspaceExport
  assert.equal(workspace.schemaVersion, 1)

  const canonByChapter = new Map<number, ReturnType<typeof localCanonStateRecordSchema.parse>>()
  let postStopLineEmptyRecordCount = 0
  for (const record of workspace.records) {
    if (record.family !== 'localCanonStates' || !record.value || typeof record.value !== 'object') continue
    const raw = record.value as { workId?: unknown; chapterId?: unknown; acceptedContentBlocks?: unknown[] }
    if (raw.workId !== input.summary.scope?.workId || typeof raw.chapterId !== 'string') continue
    const number = chapterNumber(raw.chapterId)
    if (!number) continue
    if (number > stopLine) {
      postStopLineEmptyRecordCount += 1
      assert.equal(raw.acceptedContentBlocks?.length ?? 0, 0, 'Post-stop-line Canon records must remain empty.')
      continue
    }
    const canon = localCanonStateRecordSchema.parse(record.value)
    const existing = canonByChapter.get(number)
    if (!existing || canon.revision > existing.revision) canonByChapter.set(number, canon)
  }

  const chapters: LongformContinuityChapter[] = []
  const branchIds = new Set<string>()
  for (let number = 1; number <= stopLine; number += 1) {
    const canon = canonByChapter.get(number)
    assert.ok(canon, `Chapter ${number} is missing a local Canon record.`)
    assert.ok(canon.acceptedDraftRevision > 0 && canon.acceptedContentBlocks.length > 0)
    branchIds.add(canon.branchId)
    chapters.push({
      chapterNumber: number,
      chapterId: canon.chapterId,
      blocks: canon.acceptedContentBlocks.map(block => ({ id: block.id, text: block.text })),
    })
  }
  assert.equal(branchIds.size, 1)
  return {
    branchId: [...branchIds][0]!,
    canonStates: [...canonByChapter.values()],
    chapters,
    postStopLineEmptyRecordCount,
  }
}

const workspaceInput = values.workspace || process.env.REAL_WORKSPACE_PACKAGE_PATH
if (!workspaceInput) {
  throw new Error('Pass --workspace <path> or set REAL_WORKSPACE_PACKAGE_PATH for real repository QA.')
}
const workspacePath = resolve(workspaceInput)
const summaryPath = resolve(values.summary!)
const receiptPath = resolve(values.receipt!)
const uiReceiptPath = resolve(values.uiReceipt!)
const artifactDirectory = resolve(values.artifactDirectory!)
const [workspaceBuffer, summaryBuffer] = await Promise.all([
  readFile(workspacePath),
  readFile(summaryPath),
])
const workspaceBytes = new Uint8Array(workspaceBuffer)
const summaryBytes = new Uint8Array(summaryBuffer)
const summary = JSON.parse(summaryBuffer.toString('utf8')) as Summary
assert.equal(summary.scope?.fromChapter, 1)
assert.equal(summary.scope?.toChapter, stopLine)
assert.equal(summary.scope?.chapterCount, stopLine)
assert.equal(summary.scope?.workspaceArchiveSha256, sha256(workspaceBytes))
assert.equal(summary.results?.verifiedThreadCount, 13)
assert.equal(summary.results?.activeRecallCandidateCount, 4)
assert.equal(summary.sideEffects?.chapter21AccessedOrChanged, false)
assert.ok(summary.scope?.workId && summary.completedAt && summary.runtime?.privateArtifactsDirectory)

const ledgerPath = resolve(summary.runtime.privateArtifactsDirectory, 'thread-ledger.json')
const ledgerBuffer = await readFile(ledgerPath)
const ledgerBytes = new Uint8Array(ledgerBuffer)
const ledgerHash = sha256(ledgerBytes)
const { branchId, canonStates, chapters, postStopLineEmptyRecordCount } = readRealCorpus({
  workspaceBytes,
  ledgerBytes,
  summary,
})
const sourceRevision = await computeLongRangeThreadSourceRevision(chapters)
const rawPasses = JSON.parse(ledgerBuffer.toString('utf8')) as Array<{ review: unknown; verification: unknown }>
assert.equal(rawPasses.length, 2)
const records = rawPasses.flatMap((rawPass): VerifiedLongRangeThreadRecord[] => {
  const review = longRangeStoryThreadReviewSchema.parse(rawPass.review)
  const verification = longRangeStoryThreadVerificationSchema.parse(rawPass.verification)
  return buildVerifiedLongRangeThreadRecords({
    workId: summary.scope!.workId!,
    branchId,
    sourceRevision,
    chapters,
    review,
    verification,
    authorConfirmedImport: true,
    verifiedAt: summary.completedAt!,
  })
})
assert.equal(records.length, 13)
assert.equal(new Set(records.map(record => record.id)).size, records.length)
assert.deepEqual(
  Object.fromEntries(['active', 'progressed', 'fulfilled', 'broken'].map(status => [
    status,
    records.filter(record => record.status === status).length,
  ])),
  summary.results?.statusCounts,
)

let browser: Awaited<ReturnType<(typeof import('playwright'))['chromium']['launch']>> | null = null
try {
  const port = await freePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const harnessUrl = `${baseUrl}/__verified_long_range_thread_real_repository__`
  const child = spawn(
    resolve(root, 'app/node_modules/.bin/vite'),
    [
      '--mode',
      'creator-qa',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
    ],
    {
      cwd: resolve(root, 'app'),
      env: {
        ...process.env,
        VITE_CREATOR_WORKING_AGENT_URL: '',
        VITE_ROUTER_MODE: 'hash',
      },
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  children.push(child)
  await waitForUrl(baseUrl)

  const playwrightModule = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
  const playwright = playwrightModule.default || playwrightModule
  const launchOptions: { headless: boolean; executablePath?: string } = {
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
  }
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  }
  browser = await playwright.chromium.launch(launchOptions)
  const context = await browser.newContext()
  const seed = await context.newPage()
  await seed.goto(baseUrl)
  await seed.evaluate(() => new Promise<void>((resolveDelete, rejectDelete) => {
    const request = window.indexedDB.deleteDatabase('puf_creator_workspace')
    request.onsuccess = () => resolveDelete()
    request.onerror = () => rejectDelete(request.error)
  }))
  await seed.close()

  const page = await context.newPage()
  await page.route(harnessUrl, route => route.fulfill({
    body: harnessDocument(),
    contentType: 'text/html',
    status: 200,
  }))
  await page.goto(harnessUrl, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => Boolean((window as typeof window & { __threadQa?: unknown }).__threadQa))

  const result = await page.evaluate(async (fixture) => {
    const qa = (window as typeof window & { __threadQa: any }).__threadQa
    let rejectedWithoutAuthor = false
    try {
      await qa.importRecords({ records: fixture.records, authorConfirmed: false })
    } catch {
      rejectedWithoutAuthor = true
    }
    for (const canon of fixture.canonStates) await qa.saveCanonState(canon)
    await qa.importRecords({ records: fixture.records, authorConfirmed: true })
    await qa.refresh()
    const durableRecords = qa.readRecords({ workId: fixture.workId, branchId: fixture.branchId })
    const statusCounts = Object.fromEntries(['active', 'progressed', 'fulfilled', 'broken'].map(status => [
      status,
      durableRecords.filter((record: { status: string }) => record.status === status).length,
    ]))
    const candidates = await qa.loadCandidates({
      workId: fixture.workId,
      branchId: fixture.branchId,
      currentChapterNo: fixture.currentChapterNo,
      currentSourceRevision: fixture.sourceRevision,
      chapters: fixture.chapters,
    })
    const routeLoad = await qa.routeLoad({
      workId: fixture.workId,
      branchId: fixture.branchId,
      currentChapterNo: fixture.currentChapterNo,
    })
    const staleCandidates = await qa.loadCandidates({
      workId: fixture.workId,
      branchId: fixture.branchId,
      currentChapterNo: fixture.currentChapterNo,
      currentSourceRevision: fixture.sourceRevision + 1,
      chapters: fixture.chapters,
    })
    const firstCandidateRecord = durableRecords.find((record: { threadId: string }) => (
      record.threadId === candidates[0]?.threadId
    ))
    const changedChapters = fixture.chapters.map((chapter: any) => ({
      ...chapter,
      blocks: chapter.blocks.map((block: any) => (
        firstCandidateRecord && block.id === firstCandidateRecord.sourceBlockId
          ? { ...block, text: '[changed source block]' }
          : block
      )),
    }))
    const changedEvidenceCandidates = await qa.loadCandidates({
      workId: fixture.workId,
      branchId: fixture.branchId,
      currentChapterNo: fixture.currentChapterNo,
      currentSourceRevision: fixture.sourceRevision,
      chapters: changedChapters,
    })
    const built = await qa.buildPackage({})
    for (const record of durableRecords) await qa.deleteRecord('verifiedLongRangeThreads', record.id)
    await qa.flush()
    await qa.refresh()
    const deletedCount = qa.readRecords({ workId: fixture.workId }).length
    await qa.applyPackage(built.bytes, { authorConfirmed: true, conflictPolicy: 'keep-local' })
    await qa.refresh()
    const restoredRecords = qa.readRecords({ workId: fixture.workId, branchId: fixture.branchId })
    const restoredCandidates = await qa.loadCandidates({
      workId: fixture.workId,
      branchId: fixture.branchId,
      currentChapterNo: fixture.currentChapterNo,
      currentSourceRevision: fixture.sourceRevision,
      chapters: fixture.chapters,
    })
    const dbVersion = await new Promise<number>((resolveVersion, rejectVersion) => {
      const request = window.indexedDB.open('puf_creator_workspace')
      request.onsuccess = () => {
        resolveVersion(request.result.version)
        request.result.close()
      }
      request.onerror = () => rejectVersion(request.error)
    })
    return {
      rejectedWithoutAuthor,
      durableRecordCount: durableRecords.length,
      statusCounts,
      candidateCount: candidates.length,
      routeLoadOk: routeLoad.ok,
      routeCandidateCount: routeLoad.candidates.length,
      routeSourceRevisionMatches: routeLoad.ok && routeLoad.sourceRevision === fixture.sourceRevision,
      candidateInitiallyUnselected: candidates.every((candidate: { selectionState: string }) => (
        candidate.selectionState === 'unselected'
      )),
      everyCandidateRequiresAuthorSelection: candidates.every((candidate: { authorSelectionRequired: boolean }) => (
        candidate.authorSelectionRequired === true
      )),
      staleCandidateCount: staleCandidates.length,
      changedEvidenceCandidateCount: changedEvidenceCandidates.length,
      deletedCount,
      restoredRecordCount: restoredRecords.length,
      restoredCandidateCount: restoredCandidates.length,
      dbVersion,
      packageByteLength: built.bytes.byteLength,
    }
  }, {
    workId: summary.scope.workId,
    branchId,
    currentChapterNo: stopLine,
    sourceRevision,
    records,
    chapters,
    canonStates,
  })

  assert.equal(result.rejectedWithoutAuthor, true)
  assert.equal(result.durableRecordCount, 13)
  assert.deepEqual(result.statusCounts, summary.results.statusCounts)
  assert.equal(result.candidateCount, 4)
  assert.equal(result.routeLoadOk, true)
  assert.equal(result.routeCandidateCount, 4)
  assert.equal(result.routeSourceRevisionMatches, true)
  assert.equal(result.candidateInitiallyUnselected, true)
  assert.equal(result.everyCandidateRequiresAuthorSelection, true)
  assert.equal(result.staleCandidateCount, 0)
  assert.ok(result.changedEvidenceCandidateCount < result.candidateCount)
  assert.equal(result.deletedCount, 0)
  assert.equal(result.restoredRecordCount, 13)
  assert.equal(result.restoredCandidateCount, 4)
  assert.equal(result.dbVersion, 10)
  assert.ok(result.packageByteLength > 0)
  assert.equal(sha256(new Uint8Array(await readFile(workspacePath))), summary.scope.workspaceArchiveSha256)

  const receipt = {
    schemaVersion: 1,
    status: 'real_verified_long_range_thread_repository_roundtrip_passed',
    completedAt: new Date().toISOString(),
    source: {
      workId: summary.scope.workId,
      branchIdSha256: sha256(branchId),
      fromChapter: 1,
      toChapter: stopLine,
      chapterCount: chapters.length,
      workspaceArchiveSha256: summary.scope.workspaceArchiveSha256,
      summarySha256: sha256(summaryBytes),
      privateLedgerSha256: ledgerHash,
      postStopLineEmptyRecordCount,
      privateTextCopiedIntoReceipt: false,
      sourceCanonSeedMethod: 'strict_current_repository',
      legacyFullWorkspaceApplyClaimed: false,
    },
    result,
    authorBoundary: {
      realRecordsImportedWithExplicitAuthorConfirmation: true,
      allCandidatesInitiallyUnselected: true,
      simulatedAuthorSelectionApplied: false,
    },
    sideEffects: {
      sourceWorkspaceChanged: false,
      acceptedManuscriptChanged: false,
      contextSnapshotChanged: false,
      candidateManuscriptChanged: false,
      canonChanged: false,
      chapter21ManuscriptReadOrChanged: false,
      cloudDataChanged: false,
      publicationPerformed: false,
    },
    limitations: [
      'The archived 2026-07-15 workspace package is not claimed as a full v10 apply: historical context snapshot fingerprints are incompatible.',
      'This proof seeds accepted Chapters 1-20 as strict Canon records through the current repository before invoking the real Creator Route loader.',
    ],
  }
  await mkdir(dirname(receiptPath), { recursive: true })
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')

  const editorUrl = `${baseUrl}/#/creator/editor?work=${encodeURIComponent(summary.scope.workId)}&branch=${encodeURIComponent(branchId)}&chapter=${stopLine}`
  await page.goto(editorUrl, { waitUntil: 'domcontentloaded' })
  const workspace = page.locator('[data-slot="creator-conversation-workspace"]')
  await workspace.waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForFunction(() => (
    document.querySelector('[data-slot="creator-conversation-workspace"]')?.getAttribute('data-agent-ready') === 'true'
  ), null, { timeout: 15000 })

  const longRangeItems = page.locator(
    '[data-slot="creator-recall-item"][data-recall-source-id^="long-range-thread:"]',
  )
  await longRangeItems.first().waitFor({ state: 'visible', timeout: 15000 })
  assert.equal(await longRangeItems.count(), 4)
  const initialLongRangeState = await longRangeItems.evaluateAll(nodes => nodes.map(node => ({
    id: node.getAttribute('data-recall-id'),
    sourceId: node.getAttribute('data-recall-source-id'),
    inContext: node.getAttribute('data-recall-in-context'),
    selected: node.querySelector('[role="checkbox"]')?.getAttribute('data-state'),
    text: node.textContent,
  })))
  assert.ok(initialLongRangeState.every(item => item.id && item.sourceId))
  assert.ok(initialLongRangeState.every(item => item.selected === 'unchecked'))
  assert.ok(initialLongRangeState.every(item => item.inContext === 'false'))
  assert.ok(initialLongRangeState.every(item => item.text?.includes('长程线程')))

  const beforeUiState = await page.evaluate(async () => {
    const request = indexedDB.open('puf_creator_workspace', 10)
    const db = await new Promise<IDBDatabase>((resolveDb, rejectDb) => {
      request.onsuccess = () => resolveDb(request.result)
      request.onerror = () => rejectDb(request.error)
    })
    try {
      const [canonStates, sceneDrafts, contextSnapshots] = await Promise.all([
        new Promise<Record<string, unknown>[]>((resolveRecords, rejectRecords) => {
          const recordRequest = db.transaction('localCanonStates', 'readonly').objectStore('localCanonStates').getAll()
          recordRequest.onsuccess = () => resolveRecords(recordRequest.result as Record<string, unknown>[])
          recordRequest.onerror = () => rejectRecords(recordRequest.error)
        }),
        new Promise<Record<string, unknown>[]>((resolveRecords, rejectRecords) => {
          const recordRequest = db.transaction('sceneDrafts', 'readonly').objectStore('sceneDrafts').getAll()
          recordRequest.onsuccess = () => resolveRecords(recordRequest.result as Record<string, unknown>[])
          recordRequest.onerror = () => rejectRecords(recordRequest.error)
        }),
        new Promise<Record<string, unknown>[]>((resolveRecords, rejectRecords) => {
          const recordRequest = db.transaction('contextSnapshots', 'readonly').objectStore('contextSnapshots').getAll()
          recordRequest.onsuccess = () => resolveRecords(recordRequest.result as Record<string, unknown>[])
          recordRequest.onerror = () => rejectRecords(recordRequest.error)
        }),
      ])
      return {
        canonStates: canonStates.sort((left, right) => String(left.id).localeCompare(String(right.id))),
        sceneDraftCount: sceneDrafts.length,
        contextSnapshotCount: contextSnapshots.length,
      }
    } finally {
      db.close()
    }
  })
  assert.equal(beforeUiState.sceneDraftCount, 0)

  const selectedItem = longRangeItems.first()
  const selectedRecallId = await selectedItem.getAttribute('data-recall-id')
  const selectedRecallSourceId = await selectedItem.getAttribute('data-recall-source-id')
  assert.ok(selectedRecallId && selectedRecallSourceId)
  const unselectedSourceIds = initialLongRangeState
    .map(item => item.sourceId)
    .filter((sourceId): sourceId is string => Boolean(sourceId && sourceId !== selectedRecallSourceId))
  assert.equal(unselectedSourceIds.length, 3)

  await selectedItem.getByRole('checkbox').click()
  await page.waitForFunction(({ recallId }) => new Promise<boolean>(resolveSelection => {
    const request = indexedDB.open('puf_creator_workspace', 10)
    request.onerror = () => resolveSelection(false)
    request.onsuccess = () => {
      const db = request.result
      const recordRequest = db.transaction('meta', 'readonly').objectStore('meta').get('manual-recall-selections')
      recordRequest.onerror = () => {
        db.close()
        resolveSelection(false)
      }
      recordRequest.onsuccess = () => {
        const scopes = recordRequest.result?.value?.scopes || {}
        const selected = Object.values(scopes).some((scope: any) => (
          Array.isArray(scope?.ids) && scope.ids.includes(recallId)
        ))
        db.close()
        resolveSelection(selected)
      }
    }
  }), { recallId: selectedRecallId }, { timeout: 5000 })
  assert.equal(await selectedItem.getByRole('checkbox').getAttribute('data-state'), 'checked')

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => (
    document.querySelector('[data-slot="creator-conversation-workspace"]')?.getAttribute('data-agent-ready') === 'true'
  ), null, { timeout: 15000 })
  const restoredLongRangeItems = page.locator(
    '[data-slot="creator-recall-item"][data-recall-source-id^="long-range-thread:"]',
  )
  await restoredLongRangeItems.first().waitFor({ state: 'visible', timeout: 15000 })
  assert.equal(await restoredLongRangeItems.count(), 4)
  const restoredSelectedItem = page.locator(
    `[data-slot="creator-recall-item"][data-recall-id="${selectedRecallId}"]`,
  )
  assert.equal(await restoredSelectedItem.getByRole('checkbox').getAttribute('data-state'), 'checked')
  assert.equal(await restoredSelectedItem.getAttribute('data-recall-in-context'), 'false')

  const input = page.locator('[data-slot="creator-conversation-input"]')
  const storySeed = '回到第二十章当前场景，陆沉舟必须在不提前揭示穿越真相的前提下回应已经埋下的长程线索。'
  await input.click()
  await page.keyboard.type(storySeed)
  assert.equal(await input.inputValue(), storySeed)
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => document.querySelectorAll('[data-turn-kind="author"]').length >= 1, null, { timeout: 5000 })
  assert.equal(await page.locator('[data-slot="creator-conversation-preview"]').count(), 0)

  let answeredQuestions = 0
  while (answeredQuestions < 2 && await page.getByRole('button', { name: /锁定本章意图/ }).count() === 0) {
    const blockingTurn = page
      .locator('[data-slot="creator-conversation-turn"]')
      .filter({ hasText: '这轮只确认一件事' })
      .last()
    const options = blockingTurn.getByRole('button')
    assert.ok(await options.count() >= 1)
    await options.first().click()
    answeredQuestions += 1
    await page.waitForTimeout(120)
  }
  const lockIntent = page.getByRole('button', { name: /锁定本章意图/ })
  assert.equal(await lockIntent.count(), 1)
  await lockIntent.click()
  await page.getByText('本章意图已锁定', { exact: true }).waitFor({ timeout: 5000 })
  assert.equal(await page.locator('[data-slot="creator-conversation-candidate"]').count(), 0)

  await page.getByRole('button', { name: '比较不同方向' }).click()
  await page.locator('[data-slot="creator-conversation-candidate"]').first().waitFor({ state: 'visible', timeout: 20000 })
  const uiCandidates = page.locator('[data-slot="creator-conversation-candidate"]')
  const uiCandidateCount = await uiCandidates.count()
  assert.ok(uiCandidateCount >= 1 && uiCandidateCount <= 3)
  const uiCandidateIds = await uiCandidates.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-candidate-id')))
  assert.equal(new Set(uiCandidateIds).size, uiCandidateIds.length)
  assert.equal(await page.locator('[data-slot="creator-conversation-candidate"][aria-pressed="true"]').count(), 0)
  assert.equal(await restoredSelectedItem.getAttribute('data-recall-in-context'), 'true')

  const afterUiState = await page.evaluate(async ({ selectedSourceId, excludedSourceIds }) => {
    const request = indexedDB.open('puf_creator_workspace', 10)
    const db = await new Promise<IDBDatabase>((resolveDb, rejectDb) => {
      request.onsuccess = () => resolveDb(request.result)
      request.onerror = () => rejectDb(request.error)
    })
    try {
      const [canonStates, sceneDrafts, contextSnapshots] = await Promise.all([
        new Promise<Record<string, any>[]>((resolveRecords, rejectRecords) => {
          const recordRequest = db.transaction('localCanonStates', 'readonly').objectStore('localCanonStates').getAll()
          recordRequest.onsuccess = () => resolveRecords(recordRequest.result as Record<string, any>[])
          recordRequest.onerror = () => rejectRecords(recordRequest.error)
        }),
        new Promise<Record<string, any>[]>((resolveRecords, rejectRecords) => {
          const recordRequest = db.transaction('sceneDrafts', 'readonly').objectStore('sceneDrafts').getAll()
          recordRequest.onsuccess = () => resolveRecords(recordRequest.result as Record<string, any>[])
          recordRequest.onerror = () => rejectRecords(recordRequest.error)
        }),
        new Promise<Record<string, any>[]>((resolveRecords, rejectRecords) => {
          const recordRequest = db.transaction('contextSnapshots', 'readonly').objectStore('contextSnapshots').getAll()
          recordRequest.onsuccess = () => resolveRecords(recordRequest.result as Record<string, any>[])
          recordRequest.onerror = () => rejectRecords(recordRequest.error)
        }),
      ])
      const activeContexts = contextSnapshots.filter(snapshot => snapshot.status === 'active')
      const matchingContexts = activeContexts.filter(snapshot => (
        Array.isArray(snapshot.manualRecallItems)
        && snapshot.manualRecallItems.some((item: any) => item.sourceId === selectedSourceId)
      ))
      const selectedContext = matchingContexts.at(-1)
      const contextLongRangeSourceIds = (selectedContext?.manualRecallItems || [])
        .map((item: any) => item.sourceId)
        .filter((sourceId: unknown) => typeof sourceId === 'string' && sourceId.startsWith('long-range-thread:'))
      return {
        canonStates: canonStates.sort((left, right) => String(left.id).localeCompare(String(right.id))),
        sceneDraftCount: sceneDrafts.length,
        contextSnapshotCount: contextSnapshots.length,
        matchingContextCount: matchingContexts.length,
        contextLongRangeSourceIds,
        excludedSourceCountInContext: excludedSourceIds.filter(sourceId => contextLongRangeSourceIds.includes(sourceId)).length,
        postStopLineCanonCount: canonStates.filter(canon => /:chapter:(\d+)$/u.test(canon.chapterId || '') && Number((canon.chapterId || '').match(/:chapter:(\d+)$/u)?.[1]) > 20).length,
      }
    } finally {
      db.close()
    }
  }, {
    selectedSourceId: selectedRecallSourceId,
    excludedSourceIds: unselectedSourceIds,
  })
  assert.ok(afterUiState.contextSnapshotCount > beforeUiState.contextSnapshotCount)
  assert.ok(afterUiState.matchingContextCount >= 1)
  assert.deepEqual(afterUiState.contextLongRangeSourceIds, [selectedRecallSourceId])
  assert.equal(afterUiState.excludedSourceCountInContext, 0)
  assert.equal(afterUiState.sceneDraftCount, 0)
  assert.deepEqual(afterUiState.canonStates, beforeUiState.canonStates)
  assert.equal(afterUiState.postStopLineCanonCount, 0)

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => (
    document.querySelector('[data-slot="creator-conversation-workspace"]')?.getAttribute('data-agent-ready') === 'true'
  ), null, { timeout: 15000 })
  const contextRestoredItem = page.locator(
    `[data-slot="creator-recall-item"][data-recall-id="${selectedRecallId}"]`,
  )
  assert.equal(await contextRestoredItem.getByRole('checkbox').getAttribute('data-state'), 'checked')
  assert.equal(await contextRestoredItem.getAttribute('data-recall-in-context'), 'true')
  assert.equal(await page.locator('[data-slot="creator-conversation-candidate"]').count(), uiCandidateCount)
  assert.equal(await page.locator('[data-slot="creator-conversation-preview"]').count(), 0)

  await mkdir(artifactDirectory, { recursive: true })
  const screenshotPath = resolve(artifactDirectory, 'real-long-range-thread-selected-in-context.png')
  await page.screenshot({ path: screenshotPath, fullPage: true })
  const uiReceipt = {
    schemaVersion: 'creator-editor-real-long-range-recall-context.v1',
    status: 'real_long_range_thread_author_selection_to_context_passed',
    completedAt: new Date().toISOString(),
    browser: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? 'Google Chrome' : 'Playwright Chromium',
    source: {
      workId: summary.scope.workId,
      branchIdSha256: sha256(branchId),
      fromChapter: 1,
      toChapter: stopLine,
      chapterCount: chapters.length,
      verifiedRecordCount: records.length,
      eligibleLongRangeCardCount: initialLongRangeState.length,
      sourceCanonSeedMethod: 'strict_current_repository',
      creatorCloudFacade: 'authenticated_creator_qa_fixture',
      candidateAdapter: 'deterministic_reference',
      realModelQualityClaimed: false,
      privateTextCopiedIntoReceipt: false,
    },
    interaction: {
      editorRouteChapter: stopLine,
      explicitCheckboxClick: true,
      selectedLongRangeCardCount: 1,
      unselectedLongRangeCardCount: unselectedSourceIds.length,
      selectionPersistedAcrossRefresh: true,
      intentQuestionCount: answeredQuestions,
      intentLocked: true,
      candidateSearchTriggeredByAuthor: true,
      candidateCount: uiCandidateCount,
      candidateAutoSelected: false,
      contextPersistedAcrossRefresh: true,
      selectedSourceEnteredContext: true,
      unselectedSourcesEnteredContext: afterUiState.excludedSourceCountInContext,
    },
    sideEffects: {
      acceptedManuscriptChanged: false,
      candidateProseGenerated: false,
      candidateProseAdopted: false,
      canonChanged: false,
      chapter21ManuscriptReadOrChanged: false,
      cloudDataChanged: false,
      publicationPerformed: false,
    },
    evidence: {
      matchingContextCount: afterUiState.matchingContextCount,
      contextLongRangeSourceCount: afterUiState.contextLongRangeSourceIds.length,
      sceneDraftCount: afterUiState.sceneDraftCount,
      postStopLineCanonCount: afterUiState.postStopLineCanonCount,
      screenshot: screenshotPath,
    },
    limitations: [
      'The real Chapters 1-20 Canon and verified thread ledger are used inside an authenticated Creator QA cloud facade so no production or public write is possible.',
      'Candidate comparison uses the deterministic reference adapter; this proves selection, persistence, and Context wiring, not model literary quality.',
      'Only one of the four eligible long-range cards is selected so exclusion of the other three remains observable.',
    ],
  }
  await mkdir(dirname(uiReceiptPath), { recursive: true })
  await writeFile(uiReceiptPath, `${JSON.stringify(uiReceipt, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({ repositoryReceipt: receipt, uiReceipt }, null, 2))
} finally {
  if (browser) await browser.close()
  shutdown()
}
