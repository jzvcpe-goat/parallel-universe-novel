import type { PmfLocalDraft, PmfLocalSettingAsset } from '@/features/pmf/types'
import type { VerifiedLongRangeThreadRecord } from '@/features/creator-decision/longRangeThreadRecall'
import {
  creatorLocalMetaKeys,
  LOCAL_SCHEMA_VERSION,
  type AgentOperationLog,
  type CreativeReminder,
  type CreatorLocalMetaKey,
  type LocalMigrationReceipt,
  type LocalDraftBodyRecord,
  type LocalDraftRecord,
  type LocalReaderSignalCache,
  type ReaderSignalSourceSyncState,
  type LocalWorkspaceConflictRecord,
  type LocalWorkspaceRecordFamily,
  type LocalWorkspaceRevision,
  type PublishBundleRecord,
  type PublishReceiptRecord,
} from './schema'
import {
  buildLegacyMigrationPlan,
  LEGACY_LOCAL_STORAGE_MIGRATION_ID,
} from './creatorLocalMigrationPlan'
import { applyCreatorLocalLegacyMigrationPlan } from './creatorLocalLegacyMigrationApplier'
import {
  isLocalDraftRecord,
  restoreCreatorLocalDrafts,
} from './creatorLocalDraftHydration'
import {
  readLegacyLocalDrafts,
  readLegacyLocalMetaRecords,
  readLegacyLocalSettingAssets,
} from './legacyLocalStorageMigration'
import {
  dispatchLocalWorkspaceRehydrated,
  getLocalWorkspaceWriterId,
  publishLocalWorkspaceChange,
  subscribeToLocalWorkspaceChanges,
  subscribeToLocalWorkspaceResume,
  withLocalWorkspaceWriteLock,
  type LocalWorkspaceChangeEvent,
} from './creatorLocalWorkspaceCoordination'
import {
  runCoordinatedLocalWrite,
  type LocalWriteCommitResult,
} from './creatorLocalWriteTransaction'
import {
  canUseIndexedDb,
  creatorLocalStoreNames,
  openCreatorDb,
  readAllFromCreatorStore,
  requestToPromise,
  transactionDone,
} from './creatorLocalDb'
import {
  canonicalDraftBodyId,
  deleteLocalDraftBodyOpfsPath,
  draftMetadataFromPreparedBody,
  historicalDraftBodyId,
  LOCAL_DRAFT_BODY_HISTORY_LIMIT,
  prepareLocalDraftBody,
  type PreparedLocalDraftBody,
} from './creatorLocalDraftBodyStore'

const {
  agentOperationLog: AGENT_OPERATION_STORE,
  creativeReminders: CREATIVE_REMINDER_STORE,
  verifiedLongRangeThreads: VERIFIED_LONG_RANGE_THREAD_STORE,
  drafts: DRAFT_STORE,
  meta: META_STORE,
  migrations: MIGRATION_STORE,
  publishBundles: PUBLISH_BUNDLE_STORE,
  publishReceipts: PUBLISH_RECEIPT_STORE,
  readerSignals: READER_SIGNAL_STORE,
  readerSignalSources: READER_SIGNAL_SOURCE_STORE,
  workspaceConflicts: WORKSPACE_CONFLICT_STORE,
  workspaceRevisions: WORKSPACE_REVISION_STORE,
  writingAssets: SETTING_ASSET_STORE,
} = creatorLocalStoreNames

interface LocalMetaRecord<T = unknown> {
  key: CreatorLocalMetaKey
  value: T
  updatedAt: string
  legacyKey?: string
}

let draftSnapshot: PmfLocalDraft[] | null = null
let settingAssetSnapshot: PmfLocalSettingAsset[] | null = null
let metaSnapshot: Map<CreatorLocalMetaKey, unknown> | null = null
let readerSignalSnapshot: LocalReaderSignalCache[] | null = null
let readerSignalSourceSnapshot: ReaderSignalSourceSyncState[] | null = null
let reminderSnapshot: CreativeReminder[] | null = null
let verifiedLongRangeThreadSnapshot: VerifiedLongRangeThreadRecord[] | null = null
let publishBundleSnapshot: PublishBundleRecord[] | null = null
let publishReceiptSnapshot: PublishReceiptRecord[] | null = null
let agentOperationSnapshot: AgentOperationLog[] | null = null
let migrationReceiptSnapshot: LocalMigrationReceipt[] | null = null
let workspaceRevisionSnapshot: Map<string, LocalWorkspaceRevision> | null = null
let workspaceConflictSnapshot: LocalWorkspaceConflictRecord[] | null = null
let hydrationPromise: Promise<void> | null = null
let remoteRefreshPromise: Promise<void> = Promise.resolve()
let coordinationInstalled = false

const observedWorkspaceRevisions = new Map<string, number>()
const coordinatedWriteChains = new Map<string, Promise<void>>()

const pendingDraftWrites = new Map<string, PmfLocalDraft>()
const pendingSettingAssetWrites = new Map<string, PmfLocalSettingAsset>()
const pendingMetaWrites = new Map<CreatorLocalMetaKey, LocalMetaRecord>()
const pendingReaderSignalWrites = new Map<string, LocalReaderSignalCache>()
const pendingReaderSignalSourceWrites = new Map<string, ReaderSignalSourceSyncState>()
const pendingReminderWrites = new Map<string, CreativeReminder>()
const pendingVerifiedLongRangeThreadWrites = new Map<string, VerifiedLongRangeThreadRecord>()
const pendingPublishBundleWrites = new Map<string, PublishBundleRecord>()
const pendingPublishReceiptWrites = new Map<string, PublishReceiptRecord>()
const pendingAgentOperationWrites = new Map<string, AgentOperationLog>()

function workspaceRecordKey(recordFamily: LocalWorkspaceRecordFamily, recordId: string) {
  return `${recordFamily}:${recordId}`
}

function randomId(prefix: string) {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}:${id}`
}

function currentWorkspaceRevision(recordFamily: LocalWorkspaceRecordFamily, recordId: string) {
  return workspaceRevisionSnapshot?.get(workspaceRecordKey(recordFamily, recordId))?.version || 0
}

function expectedWorkspaceRevision(recordFamily: LocalWorkspaceRecordFamily, recordId: string) {
  const key = workspaceRecordKey(recordFamily, recordId)
  return observedWorkspaceRevisions.has(key)
    ? observedWorkspaceRevisions.get(key) || 0
    : currentWorkspaceRevision(recordFamily, recordId)
}

function observeWorkspaceRecords(recordFamily: LocalWorkspaceRecordFamily, recordIds: string[]) {
  for (const recordId of recordIds) {
    const key = workspaceRecordKey(recordFamily, recordId)
    observedWorkspaceRevisions.set(key, currentWorkspaceRevision(recordFamily, recordId))
  }
}

async function commitRecordWithRevision<T>(
  recordFamily: LocalWorkspaceRecordFamily,
  recordId: string,
  record: T,
  expectedVersion: number,
): Promise<LocalWriteCommitResult> {
  const db = await openCreatorDb()
  try {
    const transaction = db.transaction([
      recordFamily,
      WORKSPACE_REVISION_STORE,
      WORKSPACE_CONFLICT_STORE,
    ], 'readwrite')
    const revisionStore = transaction.objectStore(WORKSPACE_REVISION_STORE)
    const revisionId = workspaceRecordKey(recordFamily, recordId)
    const currentRevision = await requestToPromise<LocalWorkspaceRevision | undefined>(
      revisionStore.get(revisionId),
    )
    const actualVersion = currentRevision?.version || 0
    const writerId = getLocalWorkspaceWriterId()
    const now = new Date().toISOString()

    if (actualVersion !== expectedVersion) {
      const conflictId = randomId(`workspace-conflict:${recordFamily}:${recordId}`)
      const conflict: LocalWorkspaceConflictRecord = {
        id: conflictId,
        recordFamily,
        recordId,
        expectedVersion,
        actualVersion,
        writerId,
        incomingRecord: record,
        status: 'open',
        createdAt: now,
      }
      transaction.objectStore(WORKSPACE_CONFLICT_STORE).put(conflict)
      await transactionDone(transaction)
      return {
        status: 'conflict',
        version: actualVersion,
        conflictId,
      }
    }

    const nextVersion = actualVersion + 1
    transaction.objectStore(recordFamily).put(record)
    revisionStore.put({
      id: revisionId,
      recordFamily,
      recordId,
      version: nextVersion,
      writerId,
      updatedAt: now,
    } satisfies LocalWorkspaceRevision)
    await transactionDone(transaction)
    return {
      status: 'committed',
      version: nextVersion,
    }
  } finally {
    db.close()
  }
}

async function commitDraftWithRevision(
  draft: PmfLocalDraft,
  expectedVersion: number,
  prepared: PreparedLocalDraftBody,
  createConflict = true,
): Promise<LocalWriteCommitResult> {
  const db = await openCreatorDb()
  try {
    const transaction = db.transaction([
      DRAFT_STORE,
      creatorLocalStoreNames.draftBodies,
      WORKSPACE_REVISION_STORE,
      WORKSPACE_CONFLICT_STORE,
    ], 'readwrite')
    const revisionStore = transaction.objectStore(WORKSPACE_REVISION_STORE)
    const bodyStore = transaction.objectStore(creatorLocalStoreNames.draftBodies)
    const revisionId = workspaceRecordKey(DRAFT_STORE, draft.localDraftRef)
    const currentRevisionRequest = revisionStore.get(revisionId)
    const currentDraftRequest = transaction.objectStore(DRAFT_STORE).get(draft.localDraftRef)
    const currentBodyRequest = bodyStore.get(canonicalDraftBodyId(draft.localDraftRef))
    const existingBodyRequest = bodyStore.index('draftId').getAll(IDBKeyRange.only(draft.localDraftRef))
    const [currentRevision, currentDraft, currentBody, existingBodies] = await Promise.all([
      requestToPromise<LocalWorkspaceRevision | undefined>(currentRevisionRequest),
      requestToPromise<PmfLocalDraft | LocalDraftRecord | undefined>(currentDraftRequest),
      requestToPromise<LocalDraftBodyRecord | undefined>(currentBodyRequest),
      requestToPromise<LocalDraftBodyRecord[]>(existingBodyRequest),
    ])
    const actualVersion = currentRevision?.version || 0
    const writerId = getLocalWorkspaceWriterId()
    const now = new Date().toISOString()

    if (actualVersion !== expectedVersion) {
      let conflictId = ''
      if (createConflict) {
        conflictId = randomId(`workspace-conflict:${DRAFT_STORE}:${draft.localDraftRef}`)
        transaction.objectStore(WORKSPACE_CONFLICT_STORE).put({
          id: conflictId,
          recordFamily: DRAFT_STORE,
          recordId: draft.localDraftRef,
          expectedVersion,
          actualVersion,
          writerId,
          incomingRecord: draft,
          status: 'open',
          createdAt: now,
        } satisfies LocalWorkspaceConflictRecord)
      }
      bodyStore.delete(prepared.stagingId)
      await transactionDone(transaction)
      await deleteLocalDraftBodyOpfsPath(prepared.opfsPath)
      return {
        status: 'conflict',
        version: actualVersion,
        conflictId,
      }
    }

    const nextVersion = actualVersion + 1
    const metadata = draftMetadataFromPreparedBody({
      localDraftRef: draft.localDraftRef,
      requestId: draft.requestId,
      workId: draft.workId,
      branchId: draft.branchId,
      chapterNumber: draft.chapterNumber || null,
      title: draft.title,
      updatedAt: draft.updatedAt,
    }, prepared)
    transaction.objectStore(DRAFT_STORE).put(metadata)
    if (currentBody?.status === 'ready') {
      bodyStore.put({
        ...currentBody,
        id: historicalDraftBodyId(draft.localDraftRef, currentBody.version),
        status: 'history',
      } satisfies LocalDraftBodyRecord)
      const retainedHistory = [
        ...existingBodies.filter(body => body.status === 'history'),
        currentBody,
      ].sort((left, right) => right.version - left.version)
      for (const staleHistory of retainedHistory.slice(LOCAL_DRAFT_BODY_HISTORY_LIMIT)) {
        bodyStore.delete(historicalDraftBodyId(draft.localDraftRef, staleHistory.version))
      }
    }
    bodyStore.put(prepared.readyRecord)
    bodyStore.delete(prepared.stagingId)
    revisionStore.put({
      id: revisionId,
      recordFamily: DRAFT_STORE,
      recordId: draft.localDraftRef,
      version: nextVersion,
      writerId,
      updatedAt: now,
    } satisfies LocalWorkspaceRevision)
    await transactionDone(transaction)
    if (isLocalDraftRecord(currentDraft) && currentDraft.bodyStorage.path !== prepared.opfsPath) {
      await deleteLocalDraftBodyOpfsPath(currentDraft.bodyStorage.path)
    }
    return { status: 'committed', version: nextVersion }
  } finally {
    db.close()
  }
}

async function migrateInlineDraftRecord(draftRef: string) {
  return withLocalWorkspaceWriteLock(DRAFT_STORE, draftRef, async () => {
    const db = await openCreatorDb()
    let currentDraft: PmfLocalDraft | LocalDraftRecord | undefined
    let currentVersion = 0
    try {
      const transaction = db.transaction([DRAFT_STORE, WORKSPACE_REVISION_STORE], 'readonly')
      const currentDraftRequest = transaction.objectStore(DRAFT_STORE).get(draftRef)
      const revisionRequest = transaction.objectStore(WORKSPACE_REVISION_STORE).get(workspaceRecordKey(DRAFT_STORE, draftRef))
      const [storedDraft, revision] = await Promise.all([
        requestToPromise<PmfLocalDraft | LocalDraftRecord | undefined>(currentDraftRequest),
        requestToPromise<LocalWorkspaceRevision | undefined>(revisionRequest),
      ])
      currentDraft = storedDraft
      currentVersion = revision?.version || 0
      await transactionDone(transaction)
    } finally {
      db.close()
    }

    if (!currentDraft || isLocalDraftRecord(currentDraft)) return null
    const prepared = await prepareLocalDraftBody(
      currentDraft.localDraftRef,
      currentDraft.content,
      currentVersion + 1,
      currentDraft.updatedAt,
    )
    const result = await commitDraftWithRevision(currentDraft, currentVersion, prepared, false)
    if (result.status === 'committed') {
      publishLocalWorkspaceChange({
        kind: 'record_committed',
        recordFamily: DRAFT_STORE,
        recordId: currentDraft.localDraftRef,
        version: result.version,
      })
    }
    return result
  })
}

function queueCoordinatedPut<T>(
  recordFamily: LocalWorkspaceRecordFamily,
  recordId: string,
  record: T,
  clearPending: () => void,
) {
  if (!canUseIndexedDb()) return
  const key = workspaceRecordKey(recordFamily, recordId)
  const previous = coordinatedWriteChains.get(key) || Promise.resolve()
  const next = previous
    .catch(() => undefined)
    .then(async () => {
      await hydrateCreatorLocalRepository()
      const expectedVersion = expectedWorkspaceRevision(recordFamily, recordId)
      const { result } = await runCoordinatedLocalWrite({
        recordFamily,
        recordId,
        commit: () => commitRecordWithRevision(recordFamily, recordId, record, expectedVersion),
      }, {
        publish: publishLocalWorkspaceChange,
        withLock: withLocalWorkspaceWriteLock,
      })
      clearPending()
      if (result.status === 'committed') {
        const revision: LocalWorkspaceRevision = {
          id: key,
          recordFamily,
          recordId,
          version: result.version,
          writerId: getLocalWorkspaceWriterId(),
          updatedAt: new Date().toISOString(),
        }
        if (!workspaceRevisionSnapshot) workspaceRevisionSnapshot = new Map()
        workspaceRevisionSnapshot.set(key, revision)
        observedWorkspaceRevisions.set(key, result.version)
        return
      }
      await refreshCreatorLocalRepository()
    })
    .catch(async () => {
      clearPending()
      await refreshCreatorLocalRepository()
    })
    .finally(() => {
      if (coordinatedWriteChains.get(key) === next) coordinatedWriteChains.delete(key)
    })
  coordinatedWriteChains.set(key, next)
}

function queueCoordinatedDraftPut(draft: PmfLocalDraft, clearPending: () => void) {
  if (!canUseIndexedDb()) return
  const key = workspaceRecordKey(DRAFT_STORE, draft.localDraftRef)
  const previous = coordinatedWriteChains.get(key) || Promise.resolve()
  const next = previous
    .catch(() => undefined)
    .then(async () => {
      await hydrateCreatorLocalRepository()
      const expectedVersion = expectedWorkspaceRevision(DRAFT_STORE, draft.localDraftRef)
      const { result } = await runCoordinatedLocalWrite({
        recordFamily: DRAFT_STORE,
        recordId: draft.localDraftRef,
        commit: async () => {
          const prepared = await prepareLocalDraftBody(
            draft.localDraftRef,
            draft.content,
            expectedVersion + 1,
            draft.updatedAt,
          )
          return commitDraftWithRevision(draft, expectedVersion, prepared)
        },
      }, {
        publish: publishLocalWorkspaceChange,
        withLock: withLocalWorkspaceWriteLock,
      })
      clearPending()
      if (result.status === 'committed') {
        const revision: LocalWorkspaceRevision = {
          id: key,
          recordFamily: DRAFT_STORE,
          recordId: draft.localDraftRef,
          version: result.version,
          writerId: getLocalWorkspaceWriterId(),
          updatedAt: new Date().toISOString(),
        }
        if (!workspaceRevisionSnapshot) workspaceRevisionSnapshot = new Map()
        workspaceRevisionSnapshot.set(key, revision)
        observedWorkspaceRevisions.set(key, result.version)
        return
      }
      await refreshCreatorLocalRepository()
    })
    .catch(async () => {
      clearPending()
      await refreshCreatorLocalRepository()
    })
    .finally(() => {
      if (coordinatedWriteChains.get(key) === next) coordinatedWriteChains.delete(key)
    })
  coordinatedWriteChains.set(key, next)
}

function mergeByKey<T>(first: T[], second: T[], keyFor: (item: T) => string) {
  const byKey = new Map<string, T>()
  for (const item of [...first, ...second]) byKey.set(keyFor(item), item)
  return Array.from(byKey.values())
}

function sortDrafts(drafts: PmfLocalDraft[]) {
  return [...drafts].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

function sortSettingAssets(assets: PmfLocalSettingAsset[]) {
  return [...assets].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

function sortReaderSignals(signals: LocalReaderSignalCache[]) {
  return [...signals].sort((left, right) => right.fetchedAt.localeCompare(left.fetchedAt))
}

function sortReaderSignalSources(sources: ReaderSignalSourceSyncState[]) {
  return [...sources].sort((left, right) => left.source.localeCompare(right.source))
}

function sortCreativeReminders(reminders: CreativeReminder[]) {
  return [...reminders].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

function sortVerifiedLongRangeThreads(records: VerifiedLongRangeThreadRecord[]) {
  return [...records].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

function sortPublishBundles(bundles: PublishBundleRecord[]) {
  return [...bundles].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

function sortPublishReceipts(receipts: PublishReceiptRecord[]) {
  return [...receipts].sort((left, right) => right.receivedAt.localeCompare(left.receivedAt))
}

function sortAgentOperations(records: AgentOperationLog[]) {
  return [...records].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

function sortMigrationReceipts(receipts: LocalMigrationReceipt[]) {
  return [...receipts].sort((left, right) => right.appliedAt.localeCompare(left.appliedAt))
}

function sortWorkspaceConflicts(conflicts: LocalWorkspaceConflictRecord[]) {
  return [...conflicts].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

function metaRecordsToMap(records: LocalMetaRecord[]) {
  return new Map(records.map(record => [record.key, record.value]))
}

async function hydrateFromIndexedDb() {
  if (!canUseIndexedDb()) return
  const db = await openCreatorDb()
  try {
    const [
      storedDraftRecords,
      storedDraftBodies,
      storedAssets,
      storedMeta,
      storedReaderSignals,
      storedReaderSignalSources,
      storedReminders,
      storedVerifiedLongRangeThreads,
      storedBundles,
      storedReceipts,
      storedAgentOperations,
      storedMigrationReceipts,
      storedWorkspaceConflicts,
    ] = await Promise.all([
      readAllFromCreatorStore<PmfLocalDraft | LocalDraftRecord>(db, DRAFT_STORE),
      readAllFromCreatorStore<LocalDraftBodyRecord>(db, creatorLocalStoreNames.draftBodies),
      readAllFromCreatorStore<PmfLocalSettingAsset>(db, SETTING_ASSET_STORE),
      readAllFromCreatorStore<LocalMetaRecord>(db, META_STORE),
      readAllFromCreatorStore<LocalReaderSignalCache>(db, READER_SIGNAL_STORE),
      readAllFromCreatorStore<ReaderSignalSourceSyncState>(db, READER_SIGNAL_SOURCE_STORE),
      readAllFromCreatorStore<CreativeReminder>(db, CREATIVE_REMINDER_STORE),
      readAllFromCreatorStore<VerifiedLongRangeThreadRecord>(db, VERIFIED_LONG_RANGE_THREAD_STORE),
      readAllFromCreatorStore<PublishBundleRecord>(db, PUBLISH_BUNDLE_STORE),
      readAllFromCreatorStore<PublishReceiptRecord>(db, PUBLISH_RECEIPT_STORE),
      readAllFromCreatorStore<AgentOperationLog>(db, AGENT_OPERATION_STORE),
      readAllFromCreatorStore<LocalMigrationReceipt>(db, MIGRATION_STORE),
      readAllFromCreatorStore<LocalWorkspaceConflictRecord>(db, WORKSPACE_CONFLICT_STORE),
    ])
    const storedDrafts = await restoreCreatorLocalDrafts(storedDraftRecords, storedDraftBodies)
    const existingReceipt = storedMigrationReceipts.find(
      receipt => receipt.id === LEGACY_LOCAL_STORAGE_MIGRATION_ID,
    )
    const migrationPlan = buildLegacyMigrationPlan({
      existingReceipt,
      legacyDrafts: existingReceipt ? [] : readLegacyLocalDrafts(),
      legacyMeta: existingReceipt ? [] : readLegacyLocalMetaRecords(),
      legacySettingAssets: existingReceipt ? [] : readLegacyLocalSettingAssets(),
      now: new Date().toISOString(),
      schemaVersion: LOCAL_SCHEMA_VERSION,
      storedDrafts,
      storedMeta,
      storedSettingAssets: storedAssets,
    })

    const effectivePlan = {
      ...migrationPlan,
      drafts: mergeByKey(migrationPlan.drafts, Array.from(pendingDraftWrites.values()), item => item.localDraftRef),
      meta: mergeByKey(migrationPlan.meta, Array.from(pendingMetaWrites.values()), item => item.key),
      settingAssets: mergeByKey(
        migrationPlan.settingAssets,
        Array.from(pendingSettingAssetWrites.values()),
        item => item.localAssetRef,
      ),
    }

    await applyCreatorLocalLegacyMigrationPlan(db, effectivePlan)
    for (const draft of effectivePlan.drafts) await migrateInlineDraftRecord(draft.localDraftRef)
    const migratedDraftRecords = await readAllFromCreatorStore<PmfLocalDraft | LocalDraftRecord>(db, DRAFT_STORE)
    const migratedDraftBodies = await readAllFromCreatorStore<LocalDraftBodyRecord>(db, creatorLocalStoreNames.draftBodies)
    const migratedDrafts = await restoreCreatorLocalDrafts(migratedDraftRecords, migratedDraftBodies)
    const migratedWorkspaceRevisions = await readAllFromCreatorStore<LocalWorkspaceRevision>(db, WORKSPACE_REVISION_STORE)

    draftSnapshot = sortDrafts(mergeByKey(
      migratedDrafts,
      Array.from(pendingDraftWrites.values()),
      item => item.localDraftRef,
    ))
    settingAssetSnapshot = sortSettingAssets(effectivePlan.settingAssets)
    metaSnapshot = metaRecordsToMap(effectivePlan.meta)
    readerSignalSnapshot = sortReaderSignals(mergeByKey(
      storedReaderSignals,
      Array.from(pendingReaderSignalWrites.values()),
      item => item.id,
    ))
    readerSignalSourceSnapshot = sortReaderSignalSources(mergeByKey(
      storedReaderSignalSources,
      Array.from(pendingReaderSignalSourceWrites.values()),
      item => item.source,
    ))
    reminderSnapshot = sortCreativeReminders(mergeByKey(
      storedReminders,
      Array.from(pendingReminderWrites.values()),
      item => item.id,
    ))
    verifiedLongRangeThreadSnapshot = sortVerifiedLongRangeThreads(mergeByKey(
      storedVerifiedLongRangeThreads,
      Array.from(pendingVerifiedLongRangeThreadWrites.values()),
      item => item.id,
    ))
    publishBundleSnapshot = sortPublishBundles(mergeByKey(
      storedBundles,
      Array.from(pendingPublishBundleWrites.values()),
      item => item.id,
    ))
    publishReceiptSnapshot = sortPublishReceipts(mergeByKey(
      storedReceipts,
      Array.from(pendingPublishReceiptWrites.values()),
      item => item.id,
    ))
    agentOperationSnapshot = sortAgentOperations(mergeByKey(
      storedAgentOperations,
      Array.from(pendingAgentOperationWrites.values()),
      item => item.id,
    ))
    migrationReceiptSnapshot = sortMigrationReceipts(mergeByKey(
      storedMigrationReceipts,
      [effectivePlan.receipt],
      item => item.id,
    ))
    workspaceRevisionSnapshot = new Map(migratedWorkspaceRevisions.map(revision => [revision.id, revision]))
    workspaceConflictSnapshot = sortWorkspaceConflicts(storedWorkspaceConflicts)

    pendingDraftWrites.clear()
    pendingSettingAssetWrites.clear()
    pendingMetaWrites.clear()
    pendingReaderSignalWrites.clear()
    pendingReaderSignalSourceWrites.clear()
    pendingReminderWrites.clear()
    pendingVerifiedLongRangeThreadWrites.clear()
    pendingPublishBundleWrites.clear()
    pendingPublishReceiptWrites.clear()
    pendingAgentOperationWrites.clear()
  } catch {
    draftSnapshot = draftSnapshot || sortDrafts(readLegacyLocalDrafts())
    settingAssetSnapshot = settingAssetSnapshot || sortSettingAssets(readLegacyLocalSettingAssets())
    metaSnapshot = metaSnapshot || metaRecordsToMap(readLegacyLocalMetaRecords())
    readerSignalSnapshot = readerSignalSnapshot || []
    reminderSnapshot = reminderSnapshot || []
    verifiedLongRangeThreadSnapshot = verifiedLongRangeThreadSnapshot || []
    publishBundleSnapshot = publishBundleSnapshot || []
    publishReceiptSnapshot = publishReceiptSnapshot || []
    agentOperationSnapshot = agentOperationSnapshot || []
    migrationReceiptSnapshot = migrationReceiptSnapshot || []
    workspaceRevisionSnapshot = workspaceRevisionSnapshot || new Map()
    workspaceConflictSnapshot = workspaceConflictSnapshot || []
  } finally {
    db.close()
  }
}

function resetDurableSnapshots() {
  draftSnapshot = null
  settingAssetSnapshot = null
  metaSnapshot = null
  readerSignalSnapshot = null
  readerSignalSourceSnapshot = null
  reminderSnapshot = null
  verifiedLongRangeThreadSnapshot = null
  publishBundleSnapshot = null
  publishReceiptSnapshot = null
  agentOperationSnapshot = null
  migrationReceiptSnapshot = null
  workspaceRevisionSnapshot = null
  workspaceConflictSnapshot = null
}

export async function refreshCreatorLocalRepository() {
  if (hydrationPromise) await hydrationPromise
  resetDurableSnapshots()
  hydrationPromise = hydrateFromIndexedDb().catch(() => undefined)
  await hydrationPromise
}

function scheduleRemoteRefresh(event?: LocalWorkspaceChangeEvent) {
  remoteRefreshPromise = remoteRefreshPromise
    .catch(() => undefined)
    .then(async () => {
      await refreshCreatorLocalRepository()
      if (event) dispatchLocalWorkspaceRehydrated(event)
    })
  return remoteRefreshPromise
}

function ensureWorkspaceCoordination() {
  if (coordinationInstalled || !canUseIndexedDb()) return
  coordinationInstalled = true
  subscribeToLocalWorkspaceChanges(event => {
    void scheduleRemoteRefresh(event)
  })
  subscribeToLocalWorkspaceResume(() => {
    void scheduleRemoteRefresh()
  })
}

export function hydrateCreatorLocalRepository() {
  ensureWorkspaceCoordination()
  if (!hydrationPromise) {
    hydrationPromise = hydrateFromIndexedDb().catch(() => undefined)
  }
  return hydrationPromise
}

function ensureDraftSnapshot() {
  if (!draftSnapshot) draftSnapshot = sortDrafts(readLegacyLocalDrafts())
  void hydrateCreatorLocalRepository()
  return draftSnapshot
}

function ensureSettingAssetSnapshot() {
  if (!settingAssetSnapshot) settingAssetSnapshot = sortSettingAssets(readLegacyLocalSettingAssets())
  void hydrateCreatorLocalRepository()
  return settingAssetSnapshot
}

function ensureMetaSnapshot() {
  if (!metaSnapshot) metaSnapshot = metaRecordsToMap(readLegacyLocalMetaRecords())
  void hydrateCreatorLocalRepository()
  return metaSnapshot
}

function ensureReaderSignalSnapshot() {
  if (!readerSignalSnapshot) readerSignalSnapshot = []
  void hydrateCreatorLocalRepository()
  return readerSignalSnapshot
}

function ensureReaderSignalSourceSnapshot() {
  if (!readerSignalSourceSnapshot) readerSignalSourceSnapshot = []
  void hydrateCreatorLocalRepository()
  return readerSignalSourceSnapshot
}

function ensureReminderSnapshot() {
  if (!reminderSnapshot) reminderSnapshot = []
  void hydrateCreatorLocalRepository()
  return reminderSnapshot
}

function ensureVerifiedLongRangeThreadSnapshot() {
  if (!verifiedLongRangeThreadSnapshot) verifiedLongRangeThreadSnapshot = []
  void hydrateCreatorLocalRepository()
  return verifiedLongRangeThreadSnapshot
}

function ensurePublishBundleSnapshot() {
  if (!publishBundleSnapshot) publishBundleSnapshot = []
  void hydrateCreatorLocalRepository()
  return publishBundleSnapshot
}

function ensurePublishReceiptSnapshot() {
  if (!publishReceiptSnapshot) publishReceiptSnapshot = []
  void hydrateCreatorLocalRepository()
  return publishReceiptSnapshot
}

function ensureAgentOperationSnapshot() {
  if (!agentOperationSnapshot) agentOperationSnapshot = []
  void hydrateCreatorLocalRepository()
  return agentOperationSnapshot
}

function ensureMigrationReceiptSnapshot() {
  if (!migrationReceiptSnapshot) migrationReceiptSnapshot = []
  void hydrateCreatorLocalRepository()
  return migrationReceiptSnapshot
}

function ensureWorkspaceConflictSnapshot() {
  if (!workspaceConflictSnapshot) workspaceConflictSnapshot = []
  void hydrateCreatorLocalRepository()
  return workspaceConflictSnapshot
}

export function readLocalDraftRecords(): PmfLocalDraft[] {
  const drafts = [...ensureDraftSnapshot()]
  observeWorkspaceRecords(DRAFT_STORE, drafts.map(draft => draft.localDraftRef))
  return drafts
}

export function upsertLocalDraftRecord(draft: PmfLocalDraft) {
  const drafts = ensureDraftSnapshot()
  pendingDraftWrites.set(draft.localDraftRef, draft)
  draftSnapshot = sortDrafts([
    draft,
    ...drafts.filter(item => item.localDraftRef !== draft.localDraftRef),
  ]).slice(0, 50)
  queueCoordinatedDraftPut(draft, () => {
    if (pendingDraftWrites.get(draft.localDraftRef) === draft) pendingDraftWrites.delete(draft.localDraftRef)
  })
}

export function readLocalSettingAssetRecords(workId?: string): PmfLocalSettingAsset[] {
  const assets = [...ensureSettingAssetSnapshot()]
  const result = workId ? assets.filter(asset => asset.workId === workId) : assets
  observeWorkspaceRecords(SETTING_ASSET_STORE, result.map(asset => asset.localAssetRef))
  return result
}

export function upsertLocalSettingAssetRecord(asset: PmfLocalSettingAsset) {
  const assets = ensureSettingAssetSnapshot()
  pendingSettingAssetWrites.set(asset.localAssetRef, asset)
  settingAssetSnapshot = sortSettingAssets([
    asset,
    ...assets.filter(item => item.localAssetRef !== asset.localAssetRef),
  ]).slice(0, 120)
  queueCoordinatedPut(SETTING_ASSET_STORE, asset.localAssetRef, asset, () => {
    if (pendingSettingAssetWrites.get(asset.localAssetRef) === asset) {
      pendingSettingAssetWrites.delete(asset.localAssetRef)
    }
  })
  return asset
}

export function readLocalMetaValue<T>(key: CreatorLocalMetaKey, fallback: T): T {
  const meta = ensureMetaSnapshot()
  observeWorkspaceRecords(META_STORE, [key])
  return meta.has(key) ? meta.get(key) as T : fallback
}

export function upsertLocalMetaValue<T>(key: CreatorLocalMetaKey, value: T) {
  const meta = ensureMetaSnapshot()
  const record: LocalMetaRecord<T> = {
    key,
    value,
    updatedAt: new Date().toISOString(),
  }
  meta.set(key, value)
  pendingMetaWrites.set(key, record)
  queueCoordinatedPut(META_STORE, key, record, () => {
    if (pendingMetaWrites.get(key) === record) pendingMetaWrites.delete(key)
  })
  return value
}

export function readLocalReaderSignalRecords(workId?: string): LocalReaderSignalCache[] {
  const signals = [...ensureReaderSignalSnapshot()]
  const result = workId ? signals.filter(signal => signal.workId === workId) : signals
  observeWorkspaceRecords(READER_SIGNAL_STORE, result.map(signal => signal.id))
  return result
}

export function upsertLocalReaderSignalRecord(signal: LocalReaderSignalCache) {
  const signals = ensureReaderSignalSnapshot()
  pendingReaderSignalWrites.set(signal.id, signal)
  readerSignalSnapshot = sortReaderSignals([
    signal,
    ...signals.filter(item => item.id !== signal.id),
  ]).slice(0, 500)
  queueCoordinatedPut(READER_SIGNAL_STORE, signal.id, signal, () => {
    if (pendingReaderSignalWrites.get(signal.id) === signal) pendingReaderSignalWrites.delete(signal.id)
  })
  return signal
}

export function readLocalReaderSignalSourceRecords(): ReaderSignalSourceSyncState[] {
  const sources = [...ensureReaderSignalSourceSnapshot()]
  observeWorkspaceRecords(READER_SIGNAL_SOURCE_STORE, sources.map(source => source.source))
  return sources
}

export function upsertLocalReaderSignalSourceRecord(source: ReaderSignalSourceSyncState) {
  const sources = ensureReaderSignalSourceSnapshot()
  pendingReaderSignalSourceWrites.set(source.source, source)
  readerSignalSourceSnapshot = sortReaderSignalSources([
    source,
    ...sources.filter(item => item.source !== source.source),
  ])
  queueCoordinatedPut(READER_SIGNAL_SOURCE_STORE, source.source, source, () => {
    if (pendingReaderSignalSourceWrites.get(source.source) === source) {
      pendingReaderSignalSourceWrites.delete(source.source)
    }
  })
  return source
}

export function readLocalCreativeReminderRecords(workId?: string): CreativeReminder[] {
  const reminders = [...ensureReminderSnapshot()]
  const result = workId ? reminders.filter(reminder => reminder.workId === workId) : reminders
  observeWorkspaceRecords(CREATIVE_REMINDER_STORE, result.map(reminder => reminder.id))
  return result
}

export function upsertLocalCreativeReminderRecord(reminder: CreativeReminder) {
  const reminders = ensureReminderSnapshot()
  pendingReminderWrites.set(reminder.id, reminder)
  reminderSnapshot = sortCreativeReminders([
    reminder,
    ...reminders.filter(item => item.id !== reminder.id),
  ]).slice(0, 300)
  queueCoordinatedPut(CREATIVE_REMINDER_STORE, reminder.id, reminder, () => {
    if (pendingReminderWrites.get(reminder.id) === reminder) pendingReminderWrites.delete(reminder.id)
  })
  return reminder
}

export function readLocalVerifiedLongRangeThreadRecords(workId?: string): VerifiedLongRangeThreadRecord[] {
  const records = [...ensureVerifiedLongRangeThreadSnapshot()]
  const result = workId ? records.filter(record => record.workId === workId) : records
  observeWorkspaceRecords(VERIFIED_LONG_RANGE_THREAD_STORE, result.map(record => record.id))
  return result
}

export function upsertLocalVerifiedLongRangeThreadRecord(record: VerifiedLongRangeThreadRecord) {
  const records = ensureVerifiedLongRangeThreadSnapshot()
  pendingVerifiedLongRangeThreadWrites.set(record.id, record)
  verifiedLongRangeThreadSnapshot = sortVerifiedLongRangeThreads([
    record,
    ...records.filter(item => item.id !== record.id),
  ]).slice(0, 500)
  queueCoordinatedPut(VERIFIED_LONG_RANGE_THREAD_STORE, record.id, record, () => {
    if (pendingVerifiedLongRangeThreadWrites.get(record.id) === record) {
      pendingVerifiedLongRangeThreadWrites.delete(record.id)
    }
  })
  return record
}

export function readLocalPublishBundleRecords(workId?: string): PublishBundleRecord[] {
  const bundles = [...ensurePublishBundleSnapshot()]
  const result = workId ? bundles.filter(bundle => bundle.workId === workId) : bundles
  observeWorkspaceRecords(PUBLISH_BUNDLE_STORE, result.map(bundle => bundle.id))
  return result
}

export function upsertLocalPublishBundleRecord(bundle: PublishBundleRecord) {
  const bundles = ensurePublishBundleSnapshot()
  pendingPublishBundleWrites.set(bundle.id, bundle)
  publishBundleSnapshot = sortPublishBundles([
    bundle,
    ...bundles.filter(item => item.id !== bundle.id),
  ]).slice(0, 120)
  queueCoordinatedPut(PUBLISH_BUNDLE_STORE, bundle.id, bundle, () => {
    if (pendingPublishBundleWrites.get(bundle.id) === bundle) pendingPublishBundleWrites.delete(bundle.id)
  })
  return bundle
}

export function readLocalPublishReceiptRecords(bundleId?: string): PublishReceiptRecord[] {
  const receipts = [...ensurePublishReceiptSnapshot()]
  const result = bundleId ? receipts.filter(receipt => receipt.bundleId === bundleId) : receipts
  observeWorkspaceRecords(PUBLISH_RECEIPT_STORE, result.map(receipt => receipt.id))
  return result
}

export function upsertLocalPublishReceiptRecord(receipt: PublishReceiptRecord) {
  const receipts = ensurePublishReceiptSnapshot()
  pendingPublishReceiptWrites.set(receipt.id, receipt)
  publishReceiptSnapshot = sortPublishReceipts([
    receipt,
    ...receipts.filter(item => item.id !== receipt.id),
  ]).slice(0, 240)
  queueCoordinatedPut(PUBLISH_RECEIPT_STORE, receipt.id, receipt, () => {
    if (pendingPublishReceiptWrites.get(receipt.id) === receipt) pendingPublishReceiptWrites.delete(receipt.id)
  })
  return receipt
}

export function readLocalAgentOperationRecords(limit = 80): AgentOperationLog[] {
  const records = [...ensureAgentOperationSnapshot()].slice(0, limit)
  observeWorkspaceRecords(AGENT_OPERATION_STORE, records.map(record => record.id))
  return records
}

export function upsertLocalAgentOperationRecord(record: AgentOperationLog) {
  const records = ensureAgentOperationSnapshot()
  pendingAgentOperationWrites.set(record.id, record)
  agentOperationSnapshot = sortAgentOperations([
    record,
    ...records.filter(item => item.id !== record.id),
  ]).slice(0, 240)
  queueCoordinatedPut(AGENT_OPERATION_STORE, record.id, record, () => {
    if (pendingAgentOperationWrites.get(record.id) === record) pendingAgentOperationWrites.delete(record.id)
  })
  return record
}

export function readLocalMigrationReceiptRecords(): LocalMigrationReceipt[] {
  return [...ensureMigrationReceiptSnapshot()]
}

export function readLocalWorkspaceConflictRecords(status?: LocalWorkspaceConflictRecord['status']) {
  const conflicts = [...ensureWorkspaceConflictSnapshot()]
  return status ? conflicts.filter(conflict => conflict.status === status) : conflicts
}

export async function flushCreatorLocalWrites() {
  while (coordinatedWriteChains.size) {
    await Promise.all(Array.from(coordinatedWriteChains.values()).map(write => write.catch(() => undefined)))
  }
  await remoteRefreshPromise.catch(() => undefined)
}

export async function deleteLocalWorkspaceRecord(
  recordFamily: LocalWorkspaceRecordFamily,
  recordId: string,
) {
  await withLocalWorkspaceWriteLock(recordFamily, recordId, async () => {
    const db = await openCreatorDb()
    let previousOpfsPath: string | null = null
    let nextVersion = 1
    try {
      const stores: string[] = [recordFamily, WORKSPACE_REVISION_STORE]
      if (recordFamily === DRAFT_STORE) stores.push(creatorLocalStoreNames.draftBodies)
      const transaction = db.transaction(stores, 'readwrite')
      const revisionStore = transaction.objectStore(WORKSPACE_REVISION_STORE)
      const revisionId = workspaceRecordKey(recordFamily, recordId)
      const revisionRequest = revisionStore.get(revisionId)
      const recordRequest = transaction.objectStore(recordFamily).get(recordId)
      const [revision, existingRecord] = await Promise.all([
        requestToPromise<LocalWorkspaceRevision | undefined>(revisionRequest),
        requestToPromise<unknown>(recordRequest),
      ])
      nextVersion = (revision?.version || 0) + 1
      transaction.objectStore(recordFamily).delete(recordId)
      if (recordFamily === DRAFT_STORE) {
        const draft = existingRecord as LocalDraftRecord | undefined
        if (isLocalDraftRecord(draft)) previousOpfsPath = draft.bodyStorage.path
        const bodyStore = transaction.objectStore(creatorLocalStoreNames.draftBodies)
        const bodyKeys = await requestToPromise<IDBValidKey[]>(
          bodyStore.index('draftId').getAllKeys(IDBKeyRange.only(recordId)),
        )
        for (const bodyKey of bodyKeys) bodyStore.delete(bodyKey)
      }
      revisionStore.put({
        id: revisionId,
        recordFamily,
        recordId,
        version: nextVersion,
        writerId: getLocalWorkspaceWriterId(),
        updatedAt: new Date().toISOString(),
      } satisfies LocalWorkspaceRevision)
      await transactionDone(transaction)
    } finally {
      db.close()
    }
    await deleteLocalDraftBodyOpfsPath(previousOpfsPath)
    observedWorkspaceRevisions.set(workspaceRecordKey(recordFamily, recordId), nextVersion)
    publishLocalWorkspaceChange({
      kind: 'record_deleted',
      recordFamily,
      recordId,
      version: nextVersion,
    })
  })
  await refreshCreatorLocalRepository()
}

export { creatorLocalMetaKeys }
