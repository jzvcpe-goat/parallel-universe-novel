import { LOCAL_DB_NAME, LOCAL_SCHEMA_VERSION } from './schema'

export const creatorLocalStoreNames = {
  meta: 'meta',
  drafts: 'drafts',
  draftBodies: 'draftBodies',
  writingAssets: 'writingAssets',
  readerSignals: 'readerSignals',
  readerSignalSources: 'readerSignalSources',
  creativeReminders: 'creativeReminders',
  verifiedLongRangeThreads: 'verifiedLongRangeThreads',
  publishBundles: 'publishBundles',
  publishReceipts: 'publishReceipts',
  agentOperationLog: 'agentOperationLog',
  agentConfirmations: 'agentConfirmations',
  migrations: 'migrations',
  workspaceRevisions: 'workspaceRevisions',
  workspaceConflicts: 'workspaceConflicts',
  workspacePackages: 'workspacePackages',
  workspaceImports: 'workspaceImports',
  creationSessions: 'creationSessions',
  authorIntents: 'authorIntents',
  contextSnapshots: 'contextSnapshots',
  narrativeCandidates: 'narrativeCandidates',
  sceneDrafts: 'sceneDrafts',
  literaryReviews: 'literaryReviews',
  repairProposals: 'repairProposals',
  canonPatches: 'canonPatches',
  localCanonStates: 'localCanonStates',
  creationDecisionEvents: 'creationDecisionEvents',
} as const

export function canUseIndexedDb() {
  return typeof window !== 'undefined' && 'indexedDB' in window
}

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

function ensureIndex(store: IDBObjectStore, name: string, keyPath: string) {
  if (!store.indexNames.contains(name)) store.createIndex(name, keyPath, { unique: false })
}

function ensureStore(
  db: IDBDatabase,
  transaction: IDBTransaction,
  name: string,
  keyPath: string,
  indexes: string[],
) {
  const store = db.objectStoreNames.contains(name)
    ? transaction.objectStore(name)
    : db.createObjectStore(name, { keyPath })
  for (const index of indexes) ensureIndex(store, index, index)
}

export function openCreatorDb(): Promise<IDBDatabase> {
  if (!canUseIndexedDb()) return Promise.reject(new Error('IndexedDB unavailable'))
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(LOCAL_DB_NAME, LOCAL_SCHEMA_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      const transaction = request.transaction
      if (!transaction) {
        reject(new Error('IndexedDB upgrade transaction unavailable'))
        return
      }

      ensureStore(db, transaction, creatorLocalStoreNames.meta, 'key', [])
      ensureStore(db, transaction, creatorLocalStoreNames.drafts, 'localDraftRef', ['workId', 'branchId', 'updatedAt'])
      ensureStore(db, transaction, creatorLocalStoreNames.draftBodies, 'id', ['draftId', 'status', 'updatedAt'])
      ensureStore(db, transaction, creatorLocalStoreNames.writingAssets, 'localAssetRef', ['workId', 'kind', 'stage', 'updatedAt'])
      ensureStore(db, transaction, creatorLocalStoreNames.readerSignals, 'id', ['cloudId', 'workId', 'chapterId', 'sourceType', 'cloudCreatedAt'])
      ensureStore(db, transaction, creatorLocalStoreNames.readerSignalSources, 'source', ['status', 'fetchedAt', 'updatedAt'])
      ensureStore(db, transaction, creatorLocalStoreNames.creativeReminders, 'id', ['workId', 'draftId', 'type', 'status', 'updatedAt'])
      ensureStore(db, transaction, creatorLocalStoreNames.verifiedLongRangeThreads, 'id', ['workId', 'branchId', 'threadId', 'status', 'sourceChapter', 'updatedAt'])
      ensureStore(db, transaction, creatorLocalStoreNames.publishBundles, 'id', ['draftId', 'workId', 'target', 'status', 'updatedAt'])
      ensureStore(db, transaction, creatorLocalStoreNames.publishReceipts, 'id', ['bundleId', 'target', 'status', 'receivedAt'])
      ensureStore(db, transaction, creatorLocalStoreNames.agentOperationLog, 'id', ['operationId', 'actionName', 'status', 'createdAt'])
      ensureStore(db, transaction, creatorLocalStoreNames.agentConfirmations, 'id', ['operationId', 'actionName', 'targetId', 'status', 'expiresAt', 'createdAt'])
      ensureStore(db, transaction, creatorLocalStoreNames.migrations, 'id', ['version', 'source', 'status', 'appliedAt'])
      ensureStore(db, transaction, creatorLocalStoreNames.workspaceRevisions, 'id', ['recordFamily', 'recordId', 'version', 'updatedAt'])
      ensureStore(db, transaction, creatorLocalStoreNames.workspaceConflicts, 'id', ['recordFamily', 'recordId', 'status', 'createdAt'])
      ensureStore(db, transaction, creatorLocalStoreNames.workspacePackages, 'id', ['kind', 'createdAt'])
      ensureStore(db, transaction, creatorLocalStoreNames.workspaceImports, 'id', ['packageId', 'status', 'appliedAt'])
      ensureStore(db, transaction, creatorLocalStoreNames.creationSessions, 'id', ['workId', 'chapterId', 'phase', 'updatedAt'])
      ensureStore(db, transaction, creatorLocalStoreNames.authorIntents, 'id', ['sessionId', 'status', 'revision', 'createdAt'])
      ensureStore(db, transaction, creatorLocalStoreNames.contextSnapshots, 'id', ['sessionId', 'status', 'canonRevision', 'intentRevision', 'createdAt'])
      ensureStore(db, transaction, creatorLocalStoreNames.narrativeCandidates, 'id', ['sessionId', 'status', 'intentRevision', 'revision'])
      ensureStore(db, transaction, creatorLocalStoreNames.sceneDrafts, 'draftId', ['sessionId', 'status', 'revision', 'createdAt'])
      ensureStore(db, transaction, creatorLocalStoreNames.literaryReviews, 'id', ['sessionId', 'draftId', 'status', 'createdAt'])
      ensureStore(db, transaction, creatorLocalStoreNames.repairProposals, 'id', ['reviewId', 'findingId', 'status'])
      ensureStore(db, transaction, creatorLocalStoreNames.canonPatches, 'id', ['sessionId', 'workId', 'chapterId', 'status'])
      ensureStore(db, transaction, creatorLocalStoreNames.localCanonStates, 'id', ['workId', 'chapterId', 'revision', 'committedAt'])
      ensureStore(db, transaction, creatorLocalStoreNames.creationDecisionEvents, 'id', ['sessionId', 'type', 'actor', 'occurredAt'])
    }
  })
}

export async function readAllFromCreatorStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  const transaction = db.transaction(storeName, 'readonly')
  const records = await requestToPromise<T[]>(transaction.objectStore(storeName).getAll())
  await transactionDone(transaction)
  return records
}

export async function readAllFromCreatorStoreByIndex<T>(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  value: IDBValidKey,
): Promise<T[]> {
  const transaction = db.transaction(storeName, 'readonly')
  const index = transaction.objectStore(storeName).index(indexName)
  const records = await requestToPromise<T[]>(index.getAll(IDBKeyRange.only(value)))
  await transactionDone(transaction)
  return records
}
