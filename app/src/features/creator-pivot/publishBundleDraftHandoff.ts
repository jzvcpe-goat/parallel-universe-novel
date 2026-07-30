import type { PmfLocalDraft } from '@/features/pmf/types'
import type { PublishBundleRecord } from '@/local-db/schema'

export const publishBundleDraftQueryKey = 'bundle'
export const legacyPublishDraftQueryKey = 'draft'
const publishBundleDraftIdPrefix = 'publish-bundle-draft:'

function checksumText(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }
  return `handoff-${Math.abs(hash).toString(16)}-${value.length}`
}

export function createPublishBundleDraftId(localDraftRef: string) {
  return `${publishBundleDraftIdPrefix}${encodeURIComponent(localDraftRef)}`
}

export function localDraftRefFromPublishBundleDraftId(bundleDraftId: string | null) {
  if (!bundleDraftId?.startsWith(publishBundleDraftIdPrefix)) return null
  return decodeURIComponent(bundleDraftId.slice(publishBundleDraftIdPrefix.length))
}

export function publishBundleDraftTargetPathForLocalDraftRef(localDraftRef: string) {
  return `/creator/bundles?${publishBundleDraftQueryKey}=${encodeURIComponent(createPublishBundleDraftId(localDraftRef))}`
}

export function createPublishBundleDraftRecord(
  draft: PmfLocalDraft,
  nowIso: string,
): PublishBundleRecord {
  const id = createPublishBundleDraftId(draft.localDraftRef)
  return {
    id,
    draftId: draft.localDraftRef,
    workId: draft.workId,
    branchId: draft.branchId || undefined,
    target: 'own-platform',
    status: 'draft',
    manifestPath: `${id}/publish-bundle-draft.json`,
    bodyPath: `local-draft:${draft.localDraftRef}`,
    checksum: checksumText(`${draft.localDraftRef}:${draft.updatedAt}:${draft.title}`),
    receiptIds: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  }
}

interface ResolvePublishBundleDraftRouteInput {
  bundleDraftId: string | null
  legacyDraftRef: string | null
  publishBundles: PublishBundleRecord[]
}

export function resolvePublishBundleDraftRouteRef({
  bundleDraftId,
  legacyDraftRef,
  publishBundles,
}: ResolvePublishBundleDraftRouteInput) {
  const bundleDraft = bundleDraftId
    ? publishBundles.find(bundle => bundle.id === bundleDraftId) || null
    : null
  return bundleDraft?.draftId
    || localDraftRefFromPublishBundleDraftId(bundleDraftId)
    || legacyDraftRef
    || null
}
