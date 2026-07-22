import assert from 'node:assert/strict'
import {
  applyLocalPublishReceipt,
  confirmLocalPublishBundle,
  prepareLocalPublishBundle,
  reviewLocalPublishBundle,
  type PublishBundleLifecyclePort,
} from '../src/features/creator-pivot/publishBundleLifecycle'
import { serializePublishReceipt } from '../src/features/creator-pivot/publishBundlePackage'
import { publishReceiptSchema } from '../src/features/creator-pivot/publishBundleSchema'
import type { PublishBundleRecord, PublishReceiptRecord } from '../src/local-db/schema'

function fixturePort() {
  const bundles = new Map<string, PublishBundleRecord>()
  const receipts = new Map<string, PublishReceiptRecord>()
  const packages = new Map<string, Uint8Array>()
  const port: PublishBundleLifecyclePort = {
    hydrate: async () => undefined,
    persistBundle: async record => {
      bundles.set(record.id, structuredClone(record))
      return record
    },
    persistBundlePackage: async (record, bytes) => {
      const next = { ...record, packageRecordId: `package:${record.id}` }
      bundles.set(record.id, structuredClone(next))
      packages.set(record.id, new Uint8Array(bytes))
      return next
    },
    persistReceipt: async receipt => {
      receipts.set(receipt.id, structuredClone(receipt))
      return receipt
    },
    readBundlePackage: async record => packages.has(record.id)
      ? { bytes: new Uint8Array(packages.get(record.id) as Uint8Array) }
      : null,
    readBundles: () => [...bundles.values()],
    readReceipts: bundleId => [...receipts.values()].filter(receipt => !bundleId || receipt.bundleId === bundleId),
  }
  return { bundles, port, receipts }
}

const fixture = fixturePort()
const prepared = await prepareLocalPublishBundle({
  requestId: null,
  workId: 'work:receipt',
  workTitle: '回执测试作品',
  branchId: 'work:receipt:main',
  branchKind: 'mainline',
  chapterTitle: '回执测试章节',
  content: '这是一份只用于回执绑定测试的本地正文。',
  localDraftRef: 'draft:receipt',
}, '2026-07-10T19:00:00.000Z', fixture.port)
await reviewLocalPublishBundle(prepared.record.id, '2026-07-10T19:01:00.000Z', fixture.port)
const confirmed = await confirmLocalPublishBundle(
  prepared.record.id,
  '2026-07-10T19:02:00.000Z',
  fixture.port,
)

function receipt(overrides: Record<string, unknown> = {}) {
  return publishReceiptSchema.parse({
    schemaVersion: 1,
    receiptId: 'receipt:recovery',
    bundleId: confirmed.bundle.bundleId,
    target: 'manual-copy',
    status: 'published',
    idempotencyKey: confirmed.bundle.integrity.idempotencyKey,
    contentChecksum: confirmed.bundle.chapter.checksum,
    attempt: 1,
    externalId: 'manual:published',
    message: '已由作者核对。',
    createdAt: '2026-07-10T19:03:00.000Z',
    ...overrides,
  })
}

await assert.rejects(
  () => applyLocalPublishReceipt(prepared.record.id, serializePublishReceipt(receipt({ bundleId: 'bundle:wrong' })), fixture.port),
  /bundle id mismatch/,
)
await assert.rejects(
  () => applyLocalPublishReceipt(prepared.record.id, serializePublishReceipt(receipt({ idempotencyKey: 'a'.repeat(64) })), fixture.port),
  /idempotency key mismatch/,
)
await assert.rejects(
  () => applyLocalPublishReceipt(prepared.record.id, serializePublishReceipt(receipt({ contentChecksum: 'b'.repeat(64) })), fixture.port),
  /content checksum mismatch/,
)
await assert.rejects(
  () => applyLocalPublishReceipt(prepared.record.id, '{"not":"a receipt"}', fixture.port),
)
assert.equal(fixture.receipts.size, 0, 'invalid receipts must not mutate local receipt state')
assert.equal(fixture.bundles.get(prepared.record.id)?.status, 'author_confirmed')

const recovered = await applyLocalPublishReceipt(
  prepared.record.id,
  serializePublishReceipt(receipt()),
  fixture.port,
)
assert.equal(recovered.record.status, 'published')
assert.equal(recovered.receipts.length, 1)
assert.equal(fixture.receipts.size, 1)

const replayed = await applyLocalPublishReceipt(
  prepared.record.id,
  serializePublishReceipt(receipt()),
  fixture.port,
)
assert.equal(replayed.receipts.length, 1, 'receipt import must be idempotent by receipt id')
assert.equal(fixture.receipts.size, 1)

console.log('Publish receipt recovery fixture passed.')
