import {
  canUseIndexedDb,
  creatorLocalStoreNames,
  openCreatorDb,
  requestToPromise,
  transactionDone,
} from './creatorLocalDb'
import { sha256Text, utf8ByteLength } from './creatorLocalIntegrity'
import type { LocalDraftBodyRecord, LocalDraftRecord } from './schema'

export const LOCAL_DRAFT_BODY_ROOT = 'puf-creator/draft-bodies'
export const LOCAL_DRAFT_BODY_HISTORY_LIMIT = 5

export interface PreparedLocalDraftBody {
  draftId: string
  stagingId: string
  checksum: string
  byteLength: number
  version: number
  updatedAt: string
  opfsPath: string | null
  preferredStorageKind: 'opfs' | 'indexeddb'
  readyRecord: LocalDraftBodyRecord
}

function randomId(prefix: string) {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}:${id}`
}

export function canonicalDraftBodyId(draftId: string) {
  return `draft-body:${draftId}`
}

export function historicalDraftBodyId(draftId: string, version: number) {
  return `draft-body-history:${draftId}:v${version}`
}

export type LocalDraftBodyRegressionCheck =
  | { status: 'unavailable' | 'new' | 'unchanged' }
  | { status: 'historical_regression'; matchedVersion: number }

export async function inspectLocalDraftBodyRegression(
  draftId: string,
  content: string,
): Promise<LocalDraftBodyRegressionCheck> {
  if (!canUseIndexedDb()) return { status: 'unavailable' }
  const checksum = await sha256Text(content)
  const db = await openCreatorDb()
  try {
    const transaction = db.transaction([
      creatorLocalStoreNames.drafts,
      creatorLocalStoreNames.draftBodies,
    ], 'readonly')
    const metadataRequest = transaction.objectStore(creatorLocalStoreNames.drafts).get(draftId)
    const historyRequest = transaction
      .objectStore(creatorLocalStoreNames.draftBodies)
      .index('draftId')
      .getAll(IDBKeyRange.only(draftId))
    const [metadata, bodies] = await Promise.all([
      requestToPromise<LocalDraftRecord | undefined>(metadataRequest),
      requestToPromise<LocalDraftBodyRecord[]>(historyRequest),
    ])
    await transactionDone(transaction)
    if (!metadata) return { status: 'new' }
    if (metadata.bodyChecksum === checksum) return { status: 'unchanged' }
    const historical = bodies
      .filter(body => body.status === 'history' && body.checksum === checksum)
      .sort((left, right) => right.version - left.version)[0]
    return historical
      ? { status: 'historical_regression', matchedVersion: historical.version }
      : { status: 'new' }
  } finally {
    db.close()
  }
}

function canUseOpfs() {
  return typeof navigator !== 'undefined'
    && Boolean(navigator.storage)
    && typeof navigator.storage.getDirectory === 'function'
}

async function getOpfsRoot() {
  if (!canUseOpfs()) return null
  return navigator.storage.getDirectory()
}

async function getDirectoryPath(root: FileSystemDirectoryHandle, segments: string[], create: boolean) {
  let current = root
  for (const segment of segments) {
    current = await current.getDirectoryHandle(segment, { create })
  }
  return current
}

async function opfsPathForDraft(draftId: string, version: number) {
  const draftHash = (await sha256Text(draftId)).slice(0, 32)
  return `${LOCAL_DRAFT_BODY_ROOT}/${draftHash}/v${version}-${randomId('body').replaceAll(':', '-')}.md`
}

async function writeOpfsText(path: string, content: string) {
  const root = await getOpfsRoot()
  if (!root) throw new Error('OPFS unavailable')
  const segments = path.split('/')
  const fileName = segments.pop()
  if (!fileName) throw new Error('Invalid OPFS body path')
  const directory = await getDirectoryPath(root, segments, true)
  const fileHandle = await directory.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  try {
    await writable.write(content)
  } finally {
    await writable.close()
  }
}

async function readOpfsText(path: string) {
  const root = await getOpfsRoot()
  if (!root) return null
  const segments = path.split('/')
  const fileName = segments.pop()
  if (!fileName) return null
  try {
    const directory = await getDirectoryPath(root, segments, false)
    const fileHandle = await directory.getFileHandle(fileName)
    return (await fileHandle.getFile()).text()
  } catch {
    return null
  }
}

export async function deleteLocalDraftBodyOpfsPath(path: string | null) {
  if (!path) return
  const root = await getOpfsRoot()
  if (!root) return
  const segments = path.split('/')
  const fileName = segments.pop()
  if (!fileName) return
  try {
    const directory = await getDirectoryPath(root, segments, false)
    await directory.removeEntry(fileName)
  } catch {
    // A missing staged file is already clean.
  }
}

async function writeStagedRecoveryRecord(record: LocalDraftBodyRecord) {
  const db = await openCreatorDb()
  try {
    const transaction = db.transaction(creatorLocalStoreNames.draftBodies, 'readwrite')
    transaction.objectStore(creatorLocalStoreNames.draftBodies).put(record)
    await transactionDone(transaction)
  } finally {
    db.close()
  }
}

export async function prepareLocalDraftBody(
  draftId: string,
  content: string,
  version: number,
  updatedAt = new Date().toISOString(),
): Promise<PreparedLocalDraftBody> {
  const checksum = await sha256Text(content)
  const byteLength = utf8ByteLength(content)
  const stagingId = randomId(`draft-body-stage:${draftId}`)
  const stagedRecord: LocalDraftBodyRecord = {
    id: stagingId,
    draftId,
    content,
    format: 'markdown',
    checksum,
    byteLength,
    version,
    status: 'staged',
    updatedAt,
  }
  await writeStagedRecoveryRecord(stagedRecord)

  let opfsPath: string | null = null
  if (canUseOpfs()) {
    try {
      const candidatePath = await opfsPathForDraft(draftId, version)
      await writeOpfsText(candidatePath, content)
      const verificationText = await readOpfsText(candidatePath)
      if (verificationText !== null && await sha256Text(verificationText) === checksum) {
        opfsPath = candidatePath
      } else {
        await deleteLocalDraftBodyOpfsPath(candidatePath)
      }
    } catch {
      opfsPath = null
    }
  }

  return {
    draftId,
    stagingId,
    checksum,
    byteLength,
    version,
    updatedAt,
    opfsPath,
    preferredStorageKind: opfsPath ? 'opfs' : 'indexeddb',
    readyRecord: {
      ...stagedRecord,
      id: canonicalDraftBodyId(draftId),
      status: 'ready',
    },
  }
}

export function draftMetadataFromPreparedBody(
  draft: {
    localDraftRef: string
    requestId: string | null
    workId: string
    branchId: string
    chapterNumber?: number | null
    title: string
    updatedAt: string
  },
  body: PreparedLocalDraftBody,
): LocalDraftRecord {
  return {
    ...draft,
    bodyStorage: {
      kind: body.preferredStorageKind,
      path: body.opfsPath,
      tableId: body.readyRecord.id,
      format: 'markdown',
    },
    bodyChecksum: body.checksum,
    bodyByteLength: body.byteLength,
    bodyVersion: body.version,
  }
}

export async function readLocalDraftBody(
  metadata: LocalDraftRecord,
  fallbackRecord?: LocalDraftBodyRecord,
) {
  if (metadata.bodyStorage.kind === 'opfs' && metadata.bodyStorage.path) {
    const content = await readOpfsText(metadata.bodyStorage.path)
    if (content !== null && await sha256Text(content) === metadata.bodyChecksum) {
      return { content, source: 'opfs' as const }
    }
  }

  let record = fallbackRecord
  if (!record) {
    const db = await openCreatorDb()
    try {
      const transaction = db.transaction(creatorLocalStoreNames.draftBodies, 'readonly')
      record = await requestToPromise<LocalDraftBodyRecord | undefined>(
        transaction.objectStore(creatorLocalStoreNames.draftBodies).get(metadata.bodyStorage.tableId),
      )
      await transactionDone(transaction)
    } finally {
      db.close()
    }
  }

  if (!record || record.status !== 'ready') throw new Error(`Draft body unavailable: ${metadata.localDraftRef}`)
  if (record.checksum !== metadata.bodyChecksum || await sha256Text(record.content) !== metadata.bodyChecksum) {
    throw new Error(`Draft body checksum mismatch: ${metadata.localDraftRef}`)
  }
  return { content: record.content, source: 'indexeddb' as const }
}

export async function readLocalDraftBodyRecoveryRecords() {
  const db = await openCreatorDb()
  try {
    const transaction = db.transaction(creatorLocalStoreNames.draftBodies, 'readonly')
    const records = await requestToPromise<LocalDraftBodyRecord[]>(
      transaction.objectStore(creatorLocalStoreNames.draftBodies).getAll(),
    )
    await transactionDone(transaction)
    return records.filter(record => record.status === 'staged')
  } finally {
    db.close()
  }
}
