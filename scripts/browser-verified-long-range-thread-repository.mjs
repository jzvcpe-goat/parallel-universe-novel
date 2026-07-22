#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'validation', 'creator-writing')
const artifactPath = join(artifactDir, 'verified-long-range-thread-repository-2026-07-17.json')
const children = []

function assert(condition, message) {
  if (!condition) throw new Error(message)
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
    import { readLocalWorkspaceSnapshot } from '/src/local-db/creatorLocalWorkspaceRepository.ts'
    window.__threadQa = {
      applyPackage: applyLocalWorkspacePackage,
      buildPackage: buildLocalWorkspacePackage,
      deleteRecord: deleteLocalWorkspaceRecord,
      flush: flushCreatorLocalWrites,
      importRecords: importVerifiedLongRangeThreadRecords,
      loadCandidates: loadVerifiedLongRangeThreadRecallCandidates,
      readRecords: readVerifiedLongRangeThreadRecords,
      readSnapshot: readLocalWorkspaceSnapshot,
      refresh: refreshCreatorLocalRepository,
    }
    document.querySelector('#status').textContent = 'ready'
  </script></body></html>`
}

const record = {
  schemaVersion: 'verified-long-range-thread.v1',
  id: 'long-range-thread:work:qa:branch:main:thread:debt',
  workId: 'work:qa',
  branchId: 'branch:main',
  threadId: 'thread:debt',
  focus: 'causal_state',
  dimension: 'causal_debt',
  label: '未偿还旧债',
  statement: '第一章留下的旧债仍在对当前选择施压。',
  status: 'active',
  confidence: 'medium',
  involvedCharacters: ['角色甲'],
  whyItMatters: '继续写作前需要决定是否承接这条旧债。',
  sourceChapter: 1,
  sourceBlockId: 'block:1',
  sourceEvidenceQuote: '第一章旧债证据',
  sourceRevision: 7,
  latestEvidence: null,
  verification: {
    decision: 'verify',
    rationale: '独立复核确认原始引文和线程状态一致。',
    verifiedAt: '2026-07-17T10:00:00.000Z',
  },
  importedBy: 'author-confirmed',
  localOnly: true,
  createdAt: '2026-07-17T10:00:00.000Z',
  updatedAt: '2026-07-17T10:00:00.000Z',
}

let browser = null
try {
  const port = await freePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const harnessUrl = `${baseUrl}/__verified_long_range_thread_repository__`
  const child = spawn('npm', ['--prefix', 'app', 'run', 'dev:creator', '--', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: root,
    env: process.env,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  children.push(child)
  await waitForUrl(baseUrl)

  const playwrightModule = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
  const playwright = playwrightModule.default || playwrightModule
  const launchOptions = { headless: process.env.PLAYWRIGHT_HEADLESS !== 'false' }
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  browser = await playwright.chromium.launch(launchOptions)
  const context = await browser.newContext()

  const seed = await context.newPage()
  await seed.goto(baseUrl)
  await seed.evaluate(() => new Promise((resolveDelete, rejectDelete) => {
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
  await page.waitForFunction(() => Boolean(window.__threadQa))

  const result = await page.evaluate(async (fixture) => {
    let rejectedWithoutAuthor = false
    try {
      await window.__threadQa.importRecords({ records: [fixture], authorConfirmed: false })
    } catch {
      rejectedWithoutAuthor = true
    }
    await window.__threadQa.importRecords({ records: [fixture], authorConfirmed: true })
    await window.__threadQa.refresh()
    const durableRecords = window.__threadQa.readRecords({ workId: fixture.workId, branchId: fixture.branchId })
    const chapters = [1, 2, 3].map(chapterNumber => ({
      chapterNumber,
      chapterId: `chapter:${chapterNumber}`,
      blocks: [{
        id: `block:${chapterNumber}`,
        text: chapterNumber === 1 ? '第一章旧债证据仍然有效。' : `第${chapterNumber}章正文。`,
      }],
    }))
    const candidates = await window.__threadQa.loadCandidates({
      workId: fixture.workId,
      branchId: fixture.branchId,
      currentChapterNo: 3,
      currentSourceRevision: 7,
      chapters,
    })
    const staleCandidates = await window.__threadQa.loadCandidates({
      workId: fixture.workId,
      branchId: fixture.branchId,
      currentChapterNo: 3,
      currentSourceRevision: 8,
      chapters,
    })
    const snapshotBeforePackage = window.__threadQa.readSnapshot()
    let built
    try {
      built = await window.__threadQa.buildPackage({})
    } catch (error) {
      const shape = Object.fromEntries(Object.entries(snapshotBeforePackage).map(([key, value]) => [
        key,
        Array.isArray(value) ? { count: value.length, hasUndefined: value.some(item => item === undefined) } : typeof value,
      ]))
      throw new Error(`workspace package failed: ${String(error)}; snapshot=${JSON.stringify(shape)}`)
    }
    await window.__threadQa.deleteRecord('verifiedLongRangeThreads', fixture.id)
    await window.__threadQa.flush()
    await window.__threadQa.refresh()
    const deletedCount = window.__threadQa.readRecords({ workId: fixture.workId }).length
    await window.__threadQa.applyPackage(built.bytes, {
      authorConfirmed: true,
      conflictPolicy: 'keep-local',
    })
    await window.__threadQa.refresh()
    const restoredRecords = window.__threadQa.readRecords({ workId: fixture.workId })
    const dbVersion = await new Promise((resolveVersion, rejectVersion) => {
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
      candidateCount: candidates.length,
      candidateInitiallyUnselected: candidates.every(candidate => candidate.selectionState === 'unselected'),
      staleCandidateCount: staleCandidates.length,
      deletedCount,
      restoredRecordCount: restoredRecords.length,
      dbVersion,
      packageByteLength: built.bytes.byteLength,
    }
  }, record)

  assert(result.rejectedWithoutAuthor, 'Repository import must reject missing author confirmation.')
  assert(result.durableRecordCount === 1, 'Verified thread must persist in IndexedDB.')
  assert(result.candidateCount === 1 && result.candidateInitiallyUnselected, 'Valid thread must load as an unselected recall card.')
  assert(result.staleCandidateCount === 0, 'Source revision drift must fail closed.')
  assert(result.deletedCount === 0, 'Delete step must remove the local record.')
  assert(result.restoredRecordCount === 1, 'Workspace package import must restore the thread record.')
  assert(result.dbVersion === 10, 'Browser must open local schema version 10.')
  assert(result.packageByteLength > 0, 'Workspace export must produce package bytes.')

  const receipt = {
    schemaVersion: 1,
    status: 'verified_long_range_thread_repository_roundtrip_passed',
    completedAt: new Date().toISOString(),
    scope: {
      workId: 'work:qa',
      branchId: 'branch:main',
      sourceChapter: 1,
      currentChapter: 3,
      chapter21OrLaterAccessed: false,
    },
    result,
    sideEffects: {
      contextSnapshotChanged: false,
      candidateManuscriptChanged: false,
      canonChanged: false,
      cloudDataChanged: false,
      publicationPerformed: false,
    },
  }
  mkdirSync(artifactDir, { recursive: true })
  writeFileSync(artifactPath, `${JSON.stringify(receipt, null, 2)}\n`)
  console.log(JSON.stringify(receipt, null, 2))
} finally {
  if (browser) await browser.close()
  shutdown()
}
