import type { PmfLocalDraft } from '@/features/pmf/types'
import type { PublishBundleRecord, PublishReceiptRecord } from '@/local-db/schema'

export interface CreatorPublishBundleLocalStateSnapshot {
  drafts: PmfLocalDraft[]
  publishBundles: PublishBundleRecord[]
  publishReceipts: PublishReceiptRecord[]
  routeDraftRef: string
}

export interface CreatorPublishBundleLocalStatePatch {
  drafts: PmfLocalDraft[]
  publishBundles: PublishBundleRecord[]
  publishReceipts: PublishReceiptRecord[]
  notice: string
  resolveActiveDraftRef(previous: string): string
}

export function resolveCreatorPublishBundleInitialActiveDraftRef(
  snapshot: CreatorPublishBundleLocalStateSnapshot,
) {
  return snapshot.routeDraftRef || snapshot.drafts[0]?.localDraftRef || ''
}

export function resolveCreatorPublishBundleContextSnapshotPatch(
  snapshot: CreatorPublishBundleLocalStateSnapshot,
  notice: string,
): CreatorPublishBundleLocalStatePatch {
  return {
    drafts: snapshot.drafts,
    publishBundles: snapshot.publishBundles,
    publishReceipts: snapshot.publishReceipts,
    notice,
    resolveActiveDraftRef: previous => previous,
  }
}

export function resolveCreatorPublishBundleRouteDraftRefreshPatch(
  snapshot: CreatorPublishBundleLocalStateSnapshot,
  routeBundleDraftId: string | null,
): CreatorPublishBundleLocalStatePatch {
  const routeDraft = snapshot.routeDraftRef
    ? snapshot.drafts.find(draft => draft.localDraftRef === snapshot.routeDraftRef)
    : null

  return {
    drafts: snapshot.drafts,
    publishBundles: snapshot.publishBundles,
    publishReceipts: snapshot.publishReceipts,
    notice: routeDraft
      ? routeBundleDraftId
        ? '已打开发布包草稿。'
        : '已打开来自今日任务的待发布初稿。'
      : '没有找到这份私密草稿，请回到写作台重新进入发布包确认。',
    resolveActiveDraftRef: () => routeDraft?.localDraftRef || '',
  }
}

export function resolveCreatorPublishBundleManualRefreshPatch(
  snapshot: CreatorPublishBundleLocalStateSnapshot,
  nextNotice?: string,
): CreatorPublishBundleLocalStatePatch {
  const routeDraftExists = Boolean(
    snapshot.routeDraftRef
    && snapshot.drafts.some(draft => draft.localDraftRef === snapshot.routeDraftRef),
  )

  return {
    drafts: snapshot.drafts,
    publishBundles: snapshot.publishBundles,
    publishReceipts: snapshot.publishReceipts,
    notice: nextNotice || (snapshot.drafts.length ? '私密草稿已更新。' : '暂无可检查的私密草稿。'),
    resolveActiveDraftRef: previous => routeDraftExists
      ? snapshot.routeDraftRef
      : previous || snapshot.drafts[0]?.localDraftRef || '',
  }
}
