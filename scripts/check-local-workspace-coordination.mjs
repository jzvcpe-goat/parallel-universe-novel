#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const failures = []

function assert(condition, message) {
  if (!condition) failures.push(message)
}

function read(path) {
  return readFileSync(resolve(root, path), 'utf8')
}

const transactionUrl = pathToFileURL(
  resolve(root, 'app/src/local-db/creatorLocalWriteTransaction.ts'),
).href
const { runCoordinatedLocalWrite } = await import(transactionUrl)

const published = []
const lockCalls = []
const coordination = {
  async withLock(recordFamily, recordId, work) {
    lockCalls.push({ recordFamily, recordId })
    return work()
  },
  publish(event) {
    const message = {
      schemaVersion: 1,
      workspaceId: 'default',
      sourceId: 'gate-writer',
      occurredAt: '2026-07-10T12:00:00.000Z',
      ...event,
    }
    published.push(message)
    return message
  },
}

const committed = await runCoordinatedLocalWrite({
  recordFamily: 'drafts',
  recordId: 'draft:gate',
  async commit() {
    return { status: 'committed', version: 2 }
  },
}, coordination)

const conflict = await runCoordinatedLocalWrite({
  recordFamily: 'drafts',
  recordId: 'draft:gate',
  async commit() {
    return { status: 'conflict', version: 2, conflictId: 'conflict:gate' }
  },
}, coordination)

let failedWriteRejected = false
try {
  await runCoordinatedLocalWrite({
    recordFamily: 'drafts',
    recordId: 'draft:failure',
    async commit() {
      throw new Error('fixture failure')
    },
  }, coordination)
} catch {
  failedWriteRejected = true
}

const recovery = await runCoordinatedLocalWrite({
  recordFamily: 'drafts',
  recordId: 'draft:failure',
  async commit() {
    return { status: 'committed', version: 1 }
  },
}, coordination)

assert(lockCalls.length === 4, 'every coordinated write must run through the lock port')
assert(committed.result.status === 'committed', 'committed fixture must preserve commit result')
assert(committed.event.kind === 'record_committed', 'committed write must publish record_committed')
assert(conflict.result.status === 'conflict', 'conflict fixture must preserve conflict result')
assert(conflict.event.kind === 'conflict_created', 'stale write must publish conflict_created')
assert(failedWriteRejected, 'failed commit must reject')
assert(published.length === 3, 'failed commit must not publish a workspace change')
assert(recovery.result.status === 'committed', 'a failed write must not poison the next lock operation')

const prohibitedPayloadKeys = [
  'record',
  'incomingRecord',
  'content',
  'body',
  'title',
  'rawText',
  'payload',
]
for (const event of published) {
  for (const key of prohibitedPayloadKeys) {
    assert(!(key in event), `broadcast event must not include private payload key ${key}`)
  }
}

const coordinationSource = read('app/src/local-db/creatorLocalWorkspaceCoordination.ts')
for (const marker of [
  'navigator as Navigator & { locks?: LockManagerLike }',
  'locks.request(localWorkspaceLockName',
  'new BroadcastChannel(LOCAL_WORKSPACE_CHANNEL_NAME)',
  "window.addEventListener('focus', emitResume)",
  "document.addEventListener('visibilitychange'",
  'if (message.data.sourceId === writerId) return',
]) {
  assert(coordinationSource.includes(marker), `coordination source missing ${marker}`)
}
for (const forbidden of [
  'localStorage',
  'sessionStorage',
  'incomingRecord',
  'rawText',
  'draftBody',
]) {
  assert(!coordinationSource.includes(forbidden), `coordination channel must not include ${forbidden}`)
}

const repositorySource = read('app/src/local-db/creatorLocalRepository.ts')
for (const marker of [
  'workspaceRevisions: WORKSPACE_REVISION_STORE',
  'workspaceConflicts: WORKSPACE_CONFLICT_STORE',
  'observedWorkspaceRevisions',
  'commitRecordWithRevision',
  'actualVersion !== expectedVersion',
  'incomingRecord: record',
  'runCoordinatedLocalWrite({',
  'subscribeToLocalWorkspaceChanges',
  'subscribeToLocalWorkspaceResume',
  'readLocalWorkspaceConflictRecords',
]) {
  assert(repositorySource.includes(marker), `local repository missing coordination ownership marker ${marker}`)
}

const schemaSource = read('app/src/local-db/schema.ts')
for (const marker of [
  'LOCAL_SCHEMA_VERSION = 10',
  "workspaceRevisions: 'id, recordFamily, recordId, version, updatedAt'",
  "workspaceConflicts: 'id, recordFamily, recordId, status, createdAt'",
  "workspacePackages: 'id, kind, createdAt'",
  "workspaceImports: 'id, packageId, status, appliedAt'",
  'LocalWorkspaceRevision',
  'LocalWorkspaceConflictRecord',
]) {
  assert(schemaSource.includes(marker), `local schema missing coordination marker ${marker}`)
}

const storageContract = read('docs/data-contracts/local-creator-storage-v2.md')
for (const marker of [
  'Web Locks',
  'BroadcastChannel',
  'IndexedDB compare-and-swap',
  'recoverable local conflict record',
  'must never contain prose',
]) {
  assert(storageContract.includes(marker), `local storage contract missing coordination rule ${marker}`)
}

if (failures.length) {
  console.error('[local-workspace-coordination] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(JSON.stringify({
  status: 'passed',
  gate: 'EPIC2_LOCAL_WORKSPACE_COORDINATION',
  lockCalls: lockCalls.length,
  publishedKinds: published.map(event => event.kind),
  privatePayloadKeysPresent: false,
  recoveryAfterFailure: recovery.result.status === 'committed',
}, null, 2))
