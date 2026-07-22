import type {
  PmfPublishTransactionInput,
  PmfPublishTransactionResult,
  PmfResult,
  PmfServerPublishReceipt,
} from '@/lib/pmfSupabase'
import type { PmfChapter, PmfPublishEvent } from '@/features/pmf/types'
import {
  applyLocalPublishReceipt,
  publishBundleLifecycleStatus,
  readPublishBundleLifecycle,
  type PublishBundleLifecyclePort,
} from './publishBundleLifecycle'
import {
  createPublishBundle,
  type CreatorPublishBundleInput,
} from './publishBundlePackage'
import {
  publishReceiptSchema,
  type PublishBundle,
  type PublishReceipt,
} from './publishBundleSchema'

export { createPublishBundle }
export type { CreatorPublishBundleInput }

export interface CreatorPublishBundleResult {
  bundle: PublishBundle
  receipt: PublishReceipt
  chapter?: PmfChapter
  event?: PmfPublishEvent
  serverReceipt?: PmfServerPublishReceipt
  replayed: boolean
}

export interface OwnPlatformPublishPort {
  publish(input: PmfPublishTransactionInput): Promise<PmfResult<PmfPublishTransactionResult>>
}

const defaultPublishPort: OwnPlatformPublishPort = {
  publish: async input => (await import('@/lib/pmfSupabase')).publishBundleTransaction(input),
}

function ownPlatformReceiptId(bundle: PublishBundle) {
  return `publish-receipt:${bundle.integrity.idempotencyKey}:own-platform`
}

function createOwnPlatformReceipt(
  bundle: PublishBundle,
  status: PublishReceipt['status'],
  attempt: number,
  createdAt: string,
  extra: Partial<Pick<PublishReceipt, 'externalId' | 'message' | 'targetUrl'>> = {},
) {
  return publishReceiptSchema.parse({
    schemaVersion: 1,
    receiptId: ownPlatformReceiptId(bundle),
    bundleId: bundle.bundleId,
    target: 'own-platform',
    status,
    idempotencyKey: bundle.integrity.idempotencyKey,
    contentChecksum: bundle.chapter.checksum,
    attempt,
    createdAt,
    ...extra,
  })
}

function receiptFromRecord(
  bundle: PublishBundle,
  record: Awaited<ReturnType<typeof readPublishBundleLifecycle>>['receipts'][number],
) {
  return publishReceiptSchema.parse({
    schemaVersion: 1,
    receiptId: record.id,
    bundleId: record.bundleId,
    target: record.target,
    status: record.status,
    idempotencyKey: record.idempotencyKey || bundle.integrity.idempotencyKey,
    contentChecksum: record.contentChecksum || bundle.chapter.checksum,
    attempt: record.attempt || 1,
    targetUrl: record.targetUrl,
    externalId: record.externalId,
    message: record.message,
    createdAt: record.receivedAt,
  })
}

export async function publishOwnPlatformBundle(
  bundleId: string,
  port: OwnPlatformPublishPort = defaultPublishPort,
  lifecyclePort?: PublishBundleLifecyclePort,
): Promise<PmfResult<CreatorPublishBundleResult>> {
  const lifecycle = await readPublishBundleLifecycle(bundleId, lifecyclePort)
  const status = publishBundleLifecycleStatus(lifecycle.record)
  const existingReceiptRecord = lifecycle.receipts.find(receipt => receipt.id === ownPlatformReceiptId(lifecycle.bundle))

  if (existingReceiptRecord?.status === 'published') {
    return {
      ok: true,
      data: {
        bundle: lifecycle.bundle,
        receipt: receiptFromRecord(lifecycle.bundle, existingReceiptRecord),
        replayed: true,
      },
    }
  }
  if (status === 'submitted' || status === 'needs_manual_action') {
    return {
      ok: false,
      code: status === 'submitted' ? 'submission_pending_recovery' : 'submission_needs_manual_action',
      message: '发布结果尚未确认，请先导入回执或核对阅读端。',
    }
  }
  if (!['author_confirmed', 'exported', 'failed'].includes(String(status))) {
    return { ok: false, code: 'bundle_not_confirmed', message: '请先完成审阅并确认发布包。' }
  }
  if (!lifecycle.bundle.authorConfirmation.confirmed) {
    return { ok: false, code: 'bundle_manifest_not_confirmed', message: '发布包确认记录不完整。' }
  }

  const attempt = Math.max(lifecycle.record.attemptCount || 0, existingReceiptRecord?.attempt || 0) + 1
  const submittedAt = new Date().toISOString()
  const submittedReceipt = createOwnPlatformReceipt(
    lifecycle.bundle,
    'submitted',
    attempt,
    submittedAt,
    { message: '已提交到阅读端，等待发布结果。' },
  )
  await applyLocalPublishReceipt(bundleId, submittedReceipt, lifecyclePort)

  const publishInput: PmfPublishTransactionInput = {
    bundleId: lifecycle.bundle.bundleId,
    requestIds: lifecycle.bundle.linkedFeedback.readerRequestIds,
    workId: lifecycle.bundle.work.id,
    targetKind: lifecycle.bundle.target.kind,
    branchId: lifecycle.bundle.target.branchId || null,
    branchTitle: lifecycle.bundle.target.branchTitle,
    hookChapterId: lifecycle.bundle.target.hookChapterId || null,
    chapterTitle: lifecycle.bundle.chapter.title,
    content: lifecycle.body,
    contentChecksum: lifecycle.bundle.chapter.checksum,
    idempotencyKey: lifecycle.bundle.integrity.idempotencyKey,
  }

  let result: Awaited<ReturnType<OwnPlatformPublishPort['publish']>>
  try {
    result = await port.publish(publishInput)
  } catch {
    const receipt = createOwnPlatformReceipt(
      lifecycle.bundle,
      'needs_manual_action',
      attempt,
      new Date().toISOString(),
      { message: '提交连接中断，公开结果需要人工核对。' },
    )
    await applyLocalPublishReceipt(bundleId, receipt, lifecyclePort)
    return { ok: false, code: 'submission_outcome_unknown', message: receipt.message || '发布结果需要核对。' }
  }

  if (!result.ok) {
    const receipt = createOwnPlatformReceipt(
      lifecycle.bundle,
      'failed',
      attempt,
      new Date().toISOString(),
      { message: result.code || 'publish_failed' },
    )
    await applyLocalPublishReceipt(bundleId, receipt, lifecyclePort)
    return result
  }

  const receipt = createOwnPlatformReceipt(
    lifecycle.bundle,
    'published',
    attempt,
    result.data.receipt.created_at,
    {
      externalId: result.data.event.id,
      message: '已公开到读者阅读端。',
      targetUrl: `/story?work=${encodeURIComponent(result.data.event.work_id)}`,
    },
  )
  await applyLocalPublishReceipt(bundleId, receipt, lifecyclePort)
  return {
    ok: true,
    data: {
      bundle: lifecycle.bundle,
      receipt,
      chapter: result.data.chapter,
      event: result.data.event,
      serverReceipt: result.data.receipt,
      replayed: result.data.replayed,
    },
  }
}
