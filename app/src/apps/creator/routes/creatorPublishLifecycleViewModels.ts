import { publishBundleLifecycleStatus } from '@/features/creator-pivot/publishBundleLifecycle'
import type { PublishBundleRecord, PublishReceiptRecord } from '@/local-db/schema'

const lifecycleLabels = {
  draft: '待审阅',
  reviewed: '已审阅',
  author_confirmed: '作者已确认',
  exported: '已导出',
  submitted: '提交中',
  published: '已发布',
  failed: '发布失败',
  needs_manual_action: '等待回执',
} as const

export function resolveCreatorPublishBundleActiveRecord(
  draftId: string | null | undefined,
  bundles: PublishBundleRecord[],
) {
  if (!draftId) return null
  return [...bundles]
    .filter(bundle => bundle.draftId === draftId && Boolean(bundle.packageRecordId && bundle.idempotencyKey))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] || null
}

export function createPublishBundleLifecycleViewModel(
  record: PublishBundleRecord | null,
  receipts: PublishReceiptRecord[],
  canPrepare: boolean,
  canSubmitToOwnPlatform: boolean,
) {
  const status = publishBundleLifecycleStatus(record)
  const bundleReceipts = record ? receipts.filter(receipt => receipt.bundleId === record.id) : []
  const latestReceipt = [...bundleReceipts].sort((left, right) => right.receivedAt.localeCompare(left.receivedAt))[0] || null
  return {
    canConfirm: status === 'reviewed',
    canExport: Boolean(record) && ['author_confirmed', 'exported', 'failed'].includes(String(status)),
    canPrepare,
    canReview: status === 'draft',
    canSubmit: canSubmitToOwnPlatform && Boolean(record) && ['author_confirmed', 'exported', 'failed'].includes(String(status)),
    isPublished: status === 'published',
    latestReceipt,
    needsReceiptRecovery: status === 'submitted' || status === 'needs_manual_action',
    status,
    statusLabel: status ? lifecycleLabels[status] : '尚未准备',
  }
}
