import type { PmfLocalDraft } from '@/features/pmf/types'
import {
  createPublishBundleDraftRecord,
  publishBundleDraftTargetPathForLocalDraftRef,
} from '@/features/creator-pivot/publishBundleDraftHandoff'
import type { PublishBundleRecord } from '@/local-db/schema'

export interface EditorPublishHandoff {
  kind: 'publish-bundle-draft-handoff'
  bundleDraftId: string
  bundleDraft: PublishBundleRecord
  localDraftRef: string
  targetPath: string
}

export function resolveEditorPublishHandoff(
  draft: PmfLocalDraft,
  nowIso = new Date().toISOString(),
): EditorPublishHandoff {
  const bundleDraft = createPublishBundleDraftRecord(draft, nowIso)
  return {
    kind: 'publish-bundle-draft-handoff',
    bundleDraftId: bundleDraft.id,
    bundleDraft,
    localDraftRef: draft.localDraftRef,
    targetPath: publishBundleDraftTargetPathForLocalDraftRef(draft.localDraftRef),
  }
}
