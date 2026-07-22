import {
  persistLocalPublishBundle,
  persistLocalPublishBundlePackage,
  persistLocalPublishReceipt,
  readLocalPublishBundlePackage,
  readLocalPublishBundles,
  readLocalPublishReceipts,
} from '@/local-db/creatorLocalPublishRepository'
import { hydrateLocalWorkspace } from '@/local-db/creatorLocalWorkspaceRepository'
import type { PublishBundleRecord, PublishReceiptRecord } from '@/local-db/schema'
import {
  buildPublishBundlePackage,
  confirmPublishBundleManifest,
  parsePublishBundlePackage,
  parsePublishReceipt,
  preparePublishBundlePackage,
  type CreatorPublishBundleInput,
  type PreparedPublishBundlePackage,
} from './publishBundlePackage'
import type { PublishBundle, PublishReceipt } from './publishBundleSchema'

export type PublishBundleLifecycleStatus = Exclude<PublishBundleRecord['status'], 'ready'>

export interface PublishBundleLifecycleSnapshot {
  bundle: PublishBundle
  body: string
  record: PublishBundleRecord
  receipts: PublishReceiptRecord[]
}

export interface PublishBundleLifecyclePort {
  hydrate(): Promise<void>
  persistBundle(record: PublishBundleRecord): Promise<PublishBundleRecord>
  persistBundlePackage(record: PublishBundleRecord, bytes: Uint8Array): Promise<PublishBundleRecord>
  persistReceipt(receipt: PublishReceiptRecord): Promise<PublishReceiptRecord>
  readBundlePackage(record: PublishBundleRecord): Promise<{ bytes: Uint8Array } | null>
  readBundles(): PublishBundleRecord[]
  readReceipts(bundleId?: string): PublishReceiptRecord[]
}

const defaultLifecyclePort: PublishBundleLifecyclePort = {
  hydrate: hydrateLocalWorkspace,
  persistBundle: persistLocalPublishBundle,
  persistBundlePackage: persistLocalPublishBundlePackage,
  persistReceipt: persistLocalPublishReceipt,
  readBundlePackage: readLocalPublishBundlePackage,
  readBundles: readLocalPublishBundles,
  readReceipts: readLocalPublishReceipts,
}

function normalizeLifecycleStatus(status: PublishBundleRecord['status']): PublishBundleLifecycleStatus {
  return status === 'ready' ? 'author_confirmed' : status
}

function publishBundleRecord(
  bundle: PublishBundle,
  input: Pick<CreatorPublishBundleInput, 'localDraftRef'>,
  now: string,
): PublishBundleRecord {
  return {
    id: bundle.bundleId,
    draftId: input.localDraftRef,
    workId: bundle.work.id,
    branchId: bundle.target.branchId,
    target: 'own-platform',
    status: 'draft',
    manifestPath: `${bundle.bundleId}/publish-bundle.json`,
    bodyPath: bundle.chapter.bodyPath,
    checksum: bundle.chapter.checksum,
    idempotencyKey: bundle.integrity.idempotencyKey,
    attemptCount: 0,
    receiptIds: [],
    createdAt: bundle.createdAt,
    updatedAt: now,
  }
}

function publishReceiptRecord(receipt: PublishReceipt): PublishReceiptRecord {
  return {
    id: receipt.receiptId,
    bundleId: receipt.bundleId,
    target: receipt.target,
    status: receipt.status,
    idempotencyKey: receipt.idempotencyKey,
    contentChecksum: receipt.contentChecksum,
    attempt: receipt.attempt,
    targetUrl: receipt.targetUrl,
    externalId: receipt.externalId,
    message: receipt.message,
    receivedAt: receipt.createdAt,
  }
}

async function readPackage(
  record: PublishBundleRecord,
  port: PublishBundleLifecyclePort,
): Promise<PreparedPublishBundlePackage> {
  const stored = await port.readBundlePackage(record)
  if (!stored) throw new Error(`Publish bundle package is unavailable: ${record.id}`)
  return parsePublishBundlePackage(stored.bytes)
}

async function requireRecord(bundleId: string, port: PublishBundleLifecyclePort) {
  await port.hydrate()
  const record = port.readBundles().find(bundle => bundle.id === bundleId)
  if (!record) throw new Error(`Publish bundle is unavailable: ${bundleId}`)
  return record
}

function assertLifecycleStatus(
  record: PublishBundleRecord,
  allowed: PublishBundleLifecycleStatus[],
  action: string,
) {
  const status = normalizeLifecycleStatus(record.status)
  if (!allowed.includes(status)) {
    throw new Error(`Publish bundle cannot ${action} from ${status}`)
  }
  return status
}

export async function readPublishBundleLifecycle(
  bundleId: string,
  port: PublishBundleLifecyclePort = defaultLifecyclePort,
): Promise<PublishBundleLifecycleSnapshot> {
  const record = await requireRecord(bundleId, port)
  const parsed = await readPackage(record, port)
  return {
    bundle: parsed.bundle,
    body: parsed.body,
    record: record.status === 'ready' ? { ...record, status: 'author_confirmed' } : record,
    receipts: port.readReceipts(bundleId),
  }
}

export async function prepareLocalPublishBundle(
  input: CreatorPublishBundleInput,
  now = new Date().toISOString(),
  port: PublishBundleLifecyclePort = defaultLifecyclePort,
) {
  await port.hydrate()
  const prepared = await preparePublishBundlePackage(input, now)
  const existing = port.readBundles().find(record => record.id === prepared.bundle.bundleId)
  if (existing?.packageRecordId) return readPublishBundleLifecycle(existing.id, port)
  const record = publishBundleRecord(prepared.bundle, input, now)
  const persisted = await port.persistBundlePackage(record, prepared.bytes)
  return {
    ...prepared,
    record: persisted,
    receipts: port.readReceipts(prepared.bundle.bundleId),
  }
}

export async function importLocalPublishBundlePackage(
  bytes: Uint8Array,
  draftId?: string,
  importedAt = new Date().toISOString(),
  port: PublishBundleLifecyclePort = defaultLifecyclePort,
) {
  await port.hydrate()
  const parsed = await parsePublishBundlePackage(bytes)
  const existing = port.readBundles().find(record => record.id === parsed.bundle.bundleId)
  if (existing?.status === 'published') return readPublishBundleLifecycle(existing.id, port)
  const status: PublishBundleLifecycleStatus = parsed.bundle.authorConfirmation.confirmed
    ? 'author_confirmed'
    : 'draft'
  const record: PublishBundleRecord = {
    id: parsed.bundle.bundleId,
    draftId: existing?.draftId || draftId || `imported:${parsed.bundle.bundleId}`,
    workId: parsed.bundle.work.id,
    branchId: parsed.bundle.target.branchId,
    target: existing?.target || 'own-platform',
    status,
    manifestPath: `${parsed.bundle.bundleId}/publish-bundle.json`,
    bodyPath: parsed.bundle.chapter.bodyPath,
    checksum: parsed.bundle.chapter.checksum,
    idempotencyKey: parsed.bundle.integrity.idempotencyKey,
    reviewedAt: existing?.reviewedAt,
    authorConfirmedAt: parsed.bundle.authorConfirmation.confirmedAt,
    attemptCount: existing?.attemptCount || 0,
    receiptIds: existing?.receiptIds || [],
    createdAt: existing?.createdAt || parsed.bundle.createdAt,
    updatedAt: importedAt,
  }
  const persisted = await port.persistBundlePackage(record, bytes)
  return {
    ...parsed,
    record: persisted,
    receipts: port.readReceipts(parsed.bundle.bundleId),
  }
}

export async function reviewLocalPublishBundle(
  bundleId: string,
  reviewedAt = new Date().toISOString(),
  port: PublishBundleLifecyclePort = defaultLifecyclePort,
) {
  const record = await requireRecord(bundleId, port)
  assertLifecycleStatus(record, ['draft'], 'be reviewed')
  await port.persistBundle({
    ...record,
    status: 'reviewed',
    reviewedAt,
    updatedAt: reviewedAt,
    lastErrorCode: undefined,
  })
  return readPublishBundleLifecycle(bundleId, port)
}

export async function confirmLocalPublishBundle(
  bundleId: string,
  confirmedAt = new Date().toISOString(),
  port: PublishBundleLifecyclePort = defaultLifecyclePort,
) {
  const record = await requireRecord(bundleId, port)
  assertLifecycleStatus(record, ['reviewed'], 'be author confirmed')
  const parsed = await readPackage(record, port)
  const confirmedBundle = await confirmPublishBundleManifest(parsed.bundle, confirmedAt)
  const bytes = await buildPublishBundlePackage(confirmedBundle, parsed.body)
  const persisted = await port.persistBundlePackage({
    ...record,
    status: 'author_confirmed',
    authorConfirmedAt: confirmedAt,
    updatedAt: confirmedAt,
    lastErrorCode: undefined,
  }, bytes)
  return {
    bundle: confirmedBundle,
    body: parsed.body,
    bytes,
    record: persisted,
    receipts: port.readReceipts(bundleId),
  }
}

export async function markLocalPublishBundleExported(
  bundleId: string,
  exportedAt = new Date().toISOString(),
  port: PublishBundleLifecyclePort = defaultLifecyclePort,
) {
  const record = await requireRecord(bundleId, port)
  assertLifecycleStatus(record, ['author_confirmed', 'exported', 'failed'], 'be exported')
  const parsed = await readPackage(record, port)
  if (!parsed.bundle.authorConfirmation.confirmed) throw new Error('Publish bundle export requires author confirmation')
  const persisted = await port.persistBundle({
    ...record,
    status: 'exported',
    exportedAt,
    updatedAt: exportedAt,
    lastErrorCode: undefined,
  })
  return { ...parsed, record: persisted, receipts: port.readReceipts(bundleId) }
}

export async function applyLocalPublishReceipt(
  bundleId: string,
  receiptInput: PublishReceipt | string | Uint8Array,
  port: PublishBundleLifecyclePort = defaultLifecyclePort,
) {
  const record = await requireRecord(bundleId, port)
  const parsedPackage = await readPackage(record, port)
  const receipt = typeof receiptInput === 'string' || receiptInput instanceof Uint8Array
    ? parsePublishReceipt(receiptInput)
    : receiptInput
  if (receipt.bundleId !== bundleId) throw new Error('Publish receipt bundle id mismatch')
  if (receipt.idempotencyKey !== parsedPackage.bundle.integrity.idempotencyKey) {
    throw new Error('Publish receipt idempotency key mismatch')
  }
  if (receipt.contentChecksum !== parsedPackage.bundle.chapter.checksum) {
    throw new Error('Publish receipt content checksum mismatch')
  }
  await port.persistReceipt(publishReceiptRecord(receipt))
  const nextStatus: PublishBundleLifecycleStatus = receipt.status
  const updatedAt = receipt.createdAt
  const persisted = await port.persistBundle({
    ...record,
    status: nextStatus,
    attemptCount: Math.max(record.attemptCount || 0, receipt.attempt),
    lastErrorCode: receipt.status === 'failed' || receipt.status === 'needs_manual_action'
      ? receipt.message || receipt.status
      : undefined,
    publishedAt: receipt.status === 'published' ? receipt.createdAt : record.publishedAt,
    receiptIds: [...new Set([...record.receiptIds, receipt.receiptId])],
    updatedAt,
  })
  return {
    ...parsedPackage,
    receipt,
    record: persisted,
    receipts: port.readReceipts(bundleId),
  }
}

export function publishBundleLifecycleStatus(record: PublishBundleRecord | null) {
  return record ? normalizeLifecycleStatus(record.status) : null
}
