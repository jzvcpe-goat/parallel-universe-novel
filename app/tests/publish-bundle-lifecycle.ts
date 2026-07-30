import assert from 'node:assert/strict'
import { unzipSync, zipSync } from 'fflate'
import {
  publishOwnPlatformBundle,
  type OwnPlatformPublishPort,
} from '../src/features/creator-pivot/publishBundleAdapter'
import {
  applyLocalPublishReceipt,
  confirmLocalPublishBundle,
  importLocalPublishBundlePackage,
  markLocalPublishBundleExported,
  prepareLocalPublishBundle,
  readPublishBundleLifecycle,
  reviewLocalPublishBundle,
  type PublishBundleLifecyclePort,
} from '../src/features/creator-pivot/publishBundleLifecycle'
import {
  parsePublishBundlePackage,
  serializePublishReceipt,
  type CreatorPublishBundleInput,
} from '../src/features/creator-pivot/publishBundlePackage'
import { publishReceiptSchema } from '../src/features/creator-pivot/publishBundleSchema'
import type { PmfChapter, PmfPublishEvent } from '../src/features/pmf/types'
import type { PublishBundleRecord, PublishReceiptRecord } from '../src/local-db/schema'

const preparedAt = '2026-07-10T18:00:00.000Z'
const reviewedAt = '2026-07-10T18:01:00.000Z'
const confirmedAt = '2026-07-10T18:02:00.000Z'

const fixtureInput: CreatorPublishBundleInput = {
  requestId: 'request:fixture',
  workId: 'work:fixture',
  workTitle: '雾港来信',
  branchId: 'work:fixture:main',
  branchTitle: '主线',
  branchKind: 'mainline',
  chapterTitle: '灯码的第二个答案',
  content: '沈星澜把灯码压在掌心。\n\n雾里的蓝灯又亮了一次。',
  localDraftRef: 'local-draft:fixture',
  readerSummary: '灯码揭开了新的选择。',
  readerSignalIds: ['signal:fixture'],
  creativeReminderIds: ['reminder:fixture'],
}

function createLifecyclePort() {
  const bundles = new Map<string, PublishBundleRecord>()
  const receipts = new Map<string, PublishReceiptRecord>()
  const packages = new Map<string, Uint8Array>()
  const port: PublishBundleLifecyclePort = {
    hydrate: async () => undefined,
    persistBundle: async record => {
      bundles.set(record.id, structuredClone(record))
      return structuredClone(record)
    },
    persistBundlePackage: async (record, bytes) => {
      const persisted = { ...record, packageRecordId: `fixture-package:${record.id}` }
      bundles.set(record.id, structuredClone(persisted))
      packages.set(record.id, new Uint8Array(bytes))
      return structuredClone(persisted)
    },
    persistReceipt: async receipt => {
      receipts.set(receipt.id, structuredClone(receipt))
      return structuredClone(receipt)
    },
    readBundlePackage: async record => {
      const bytes = packages.get(record.id)
      return bytes ? { bytes: new Uint8Array(bytes) } : null
    },
    readBundles: () => [...bundles.values()].map(record => structuredClone(record)),
    readReceipts: bundleId => [...receipts.values()]
      .filter(receipt => !bundleId || receipt.bundleId === bundleId)
      .map(receipt => structuredClone(receipt)),
  }
  return { bundles, packages, port, receipts }
}

function publishedResult(
  input: Parameters<OwnPlatformPublishPort['publish']>[0],
  sequence: number,
) {
  const chapter: PmfChapter = {
    id: `chapter:${sequence}`,
    work_id: input.workId,
    branch_id: input.branchId || `${input.workId}:main`,
    chapter_no: sequence,
    title: input.chapterTitle,
    content: input.content,
    status: 'published',
    published_at: `2026-07-10T18:0${sequence}:30.000Z`,
  }
  const event: PmfPublishEvent = {
    id: `event:${sequence}`,
    reader_request_id: input.requestId || null,
    work_id: input.workId,
    branch_id: chapter.branch_id,
    published_chapter_id: chapter.id,
    published_branch_id: chapter.branch_id,
    local_draft_ref: null,
    event_type: 'chapter_published',
    created_at: chapter.published_at || preparedAt,
  }
  const receipt = {
    id: `server-receipt:${sequence}`,
    schema_version: 1 as const,
    bundle_id: input.bundleId,
    destination: 'own-platform' as const,
    status: 'published' as const,
    idempotency_key: input.idempotencyKey,
    content_checksum: input.contentChecksum,
    work_id: input.workId,
    branch_id: chapter.branch_id,
    chapter_id: chapter.id,
    publish_event_id: event.id,
    attempt: 1 as const,
    created_at: event.created_at,
  }
  return { chapter, event, receipt, replayed: false }
}

const fixture = createLifecyclePort()
const prepared = await prepareLocalPublishBundle(fixtureInput, preparedAt, fixture.port)
assert.equal(prepared.record.status, 'draft')
assert.equal(prepared.bundle.authorConfirmation.confirmed, false, 'prepare must never confirm implicitly')
assert.equal(prepared.bundle.authorConfirmation.confirmedAt, undefined)
assert.match(prepared.bundle.chapter.checksum, /^[a-f0-9]{64}$/)
assert.match(prepared.bundle.integrity.idempotencyKey, /^[a-f0-9]{64}$/)
assert.equal(fixture.receipts.size, 0, 'prepare must not create a publish receipt')

const recoveredDraft = await readPublishBundleLifecycle(prepared.record.id, fixture.port)
assert.equal(recoveredDraft.body, fixtureInput.content)
assert.equal(recoveredDraft.record.status, 'draft', 'leaving before review must keep a recoverable draft bundle')

const tamperedFiles = unzipSync(prepared.bytes)
tamperedFiles['body.md'][0] ^= 0xff
await assert.rejects(
  () => parsePublishBundlePackage(zipSync(tamperedFiles)),
  /checksum|integrity/i,
)

const reviewed = await reviewLocalPublishBundle(prepared.record.id, reviewedAt, fixture.port)
assert.equal(reviewed.record.status, 'reviewed')
const confirmed = await confirmLocalPublishBundle(prepared.record.id, confirmedAt, fixture.port)
assert.equal(confirmed.record.status, 'author_confirmed')
assert.equal(confirmed.bundle.authorConfirmation.confirmed, true)
assert.equal(confirmed.bundle.authorConfirmation.confirmedAt, confirmedAt)
const exported = await markLocalPublishBundleExported(prepared.record.id, '2026-07-10T18:03:00.000Z', fixture.port)
assert.equal(exported.record.status, 'exported')
await parsePublishBundlePackage(exported.bytes)

let publishCalls = 0
const successPort: OwnPlatformPublishPort = {
  publish: async input => {
    publishCalls += 1
    return { ok: true, data: publishedResult(input, 1) }
  },
}
const submitted = await publishOwnPlatformBundle(prepared.record.id, successPort, fixture.port)
assert.equal(submitted.ok, true)
assert.equal(publishCalls, 1)
assert.equal(fixture.receipts.size, 1, 'submit must update one deterministic receipt')
assert.equal(fixture.bundles.get(prepared.record.id)?.status, 'published')
const replayed = await publishOwnPlatformBundle(prepared.record.id, successPort, fixture.port)
assert.equal(replayed.ok, true)
if (replayed.ok) assert.equal(replayed.data.replayed, true)
assert.equal(publishCalls, 1, 'retry after success must not call public publication twice')
assert.equal(fixture.receipts.size, 1)

const retryFixture = createLifecyclePort()
const retryInput = { ...fixtureInput, content: `${fixtureInput.content}\n\n第二次尝试保留同一份正文。` }
const retryPrepared = await prepareLocalPublishBundle(retryInput, preparedAt, retryFixture.port)
await reviewLocalPublishBundle(retryPrepared.record.id, reviewedAt, retryFixture.port)
await confirmLocalPublishBundle(retryPrepared.record.id, confirmedAt, retryFixture.port)
const seenIdempotencyKeys: string[] = []
let retryCalls = 0
const retryPort: OwnPlatformPublishPort = {
  publish: async input => {
    retryCalls += 1
    seenIdempotencyKeys.push(input.idempotencyKey || '')
    if (retryCalls === 1) return { ok: false, code: 'temporary_failure', message: 'temporary failure' }
    return { ok: true, data: publishedResult(input, 2) }
  },
}
const failed = await publishOwnPlatformBundle(retryPrepared.record.id, retryPort, retryFixture.port)
assert.equal(failed.ok, false)
assert.equal(retryFixture.bundles.get(retryPrepared.record.id)?.status, 'failed')
const retried = await publishOwnPlatformBundle(retryPrepared.record.id, retryPort, retryFixture.port)
assert.equal(retried.ok, true)
assert.equal(retryCalls, 2)
assert.equal(new Set(seenIdempotencyKeys).size, 1, 'known failure retry must reuse the same idempotency key')
assert.equal(retryFixture.receipts.size, 1, 'known failure retry must update, not append, its receipt')

const unknownFixture = createLifecyclePort()
const unknownInput = { ...fixtureInput, content: `${fixtureInput.content}\n\n结果不明场景。` }
const unknownPrepared = await prepareLocalPublishBundle(unknownInput, preparedAt, unknownFixture.port)
await reviewLocalPublishBundle(unknownPrepared.record.id, reviewedAt, unknownFixture.port)
await confirmLocalPublishBundle(unknownPrepared.record.id, confirmedAt, unknownFixture.port)
let unknownCalls = 0
const unknownPort: OwnPlatformPublishPort = {
  publish: async () => {
    unknownCalls += 1
    throw new Error('connection lost after submit')
  },
}
const unknown = await publishOwnPlatformBundle(unknownPrepared.record.id, unknownPort, unknownFixture.port)
assert.equal(unknown.ok, false)
assert.equal(unknownFixture.bundles.get(unknownPrepared.record.id)?.status, 'needs_manual_action')
const blockedRetry = await publishOwnPlatformBundle(unknownPrepared.record.id, unknownPort, unknownFixture.port)
assert.equal(blockedRetry.ok, false)
assert.equal(unknownCalls, 1, 'unknown publication outcome must not retry automatically')

const unknownLifecycle = await readPublishBundleLifecycle(unknownPrepared.record.id, unknownFixture.port)
const importedReceipt = publishReceiptSchema.parse({
  schemaVersion: 1,
  receiptId: `external-receipt:${unknownPrepared.record.id}`,
  bundleId: unknownPrepared.record.id,
  target: 'own-platform',
  status: 'published',
  idempotencyKey: unknownLifecycle.bundle.integrity.idempotencyKey,
  contentChecksum: unknownLifecycle.bundle.chapter.checksum,
  attempt: 1,
  externalId: 'event:recovered',
  targetUrl: '/story?work=work%3Afixture',
  message: '已核对阅读端。',
  createdAt: '2026-07-10T18:10:00.000Z',
})
await applyLocalPublishReceipt(
  unknownPrepared.record.id,
  serializePublishReceipt(importedReceipt),
  unknownFixture.port,
)
assert.equal(unknownFixture.bundles.get(unknownPrepared.record.id)?.status, 'published')

const importedFixture = createLifecyclePort()
const imported = await importLocalPublishBundlePackage(exported.bytes, undefined, '2026-07-10T18:20:00.000Z', importedFixture.port)
assert.equal(imported.record.status, 'author_confirmed')
assert.equal(imported.body, fixtureInput.content)
assert.equal(importedFixture.packages.size, 1)

console.log('PublishBundle lifecycle fixture passed.')
