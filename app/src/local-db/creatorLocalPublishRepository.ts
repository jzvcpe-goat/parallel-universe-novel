import {
  flushCreatorLocalWrites,
  readLocalPublishBundleRecords,
  readLocalPublishReceiptRecords,
  upsertLocalPublishBundleRecord,
  upsertLocalPublishReceiptRecord,
} from './creatorLocalRepository'
import { sha256Bytes } from './creatorLocalIntegrity'
import {
  readLocalWorkspacePackageRecord,
  saveLocalWorkspacePackageRecord,
} from './creatorLocalWorkspacePackageRepository'
import type { PublishBundleRecord, PublishReceiptRecord } from './schema'

export function publishBundlePackageRecordId(bundleId: string) {
  return `publish-package:${bundleId}`
}

export function readLocalPublishBundles(workId?: string): PublishBundleRecord[] {
  return readLocalPublishBundleRecords(workId)
}

export function upsertLocalPublishBundle(bundle: PublishBundleRecord): PublishBundleRecord {
  return upsertLocalPublishBundleRecord(bundle)
}

export function readLocalPublishReceipts(bundleId?: string): PublishReceiptRecord[] {
  return readLocalPublishReceiptRecords(bundleId)
}

export function upsertLocalPublishReceipt(receipt: PublishReceiptRecord): PublishReceiptRecord {
  return upsertLocalPublishReceiptRecord(receipt)
}

export async function persistLocalPublishBundle(bundle: PublishBundleRecord) {
  upsertLocalPublishBundle(bundle)
  await flushCreatorLocalWrites()
  return bundle
}

export async function persistLocalPublishReceipt(receipt: PublishReceiptRecord) {
  upsertLocalPublishReceipt(receipt)
  await flushCreatorLocalWrites()
  return receipt
}

export async function persistLocalPublishBundlePackage(
  bundle: PublishBundleRecord,
  bytes: Uint8Array,
) {
  const packageRecordId = publishBundlePackageRecordId(bundle.id)
  await saveLocalWorkspacePackageRecord({
    id: packageRecordId,
    kind: 'publish-bundle',
    schemaVersion: 1,
    checksum: await sha256Bytes(bytes),
    byteLength: bytes.byteLength,
    bytes,
    createdAt: bundle.updatedAt,
  })
  return persistLocalPublishBundle({ ...bundle, packageRecordId })
}

export async function readLocalPublishBundlePackage(bundle: PublishBundleRecord) {
  const packageRecordId = bundle.packageRecordId || publishBundlePackageRecordId(bundle.id)
  const record = await readLocalWorkspacePackageRecord(packageRecordId)
  if (!record || record.kind !== 'publish-bundle') return null
  if (record.byteLength !== record.bytes.byteLength || await sha256Bytes(record.bytes) !== record.checksum) {
    throw new Error(`Publish bundle package checksum mismatch: ${bundle.id}`)
  }
  return record
}
