import type {
  PmfChapter,
  PmfLocalDraft,
  PmfLocalSettingAsset,
  PmfReaderRequest,
} from '@/features/pmf/types'
import type { ManualRecallItem } from '@/features/creator-decision/types'
import { resolveCreatorEditorDecisionIdentity } from './creatorEditorDecisionSessionController'
import { useCreationDecisionSession } from './useCreationDecisionSession'

export interface UseCreatorEditorDecisionWorkbenchInput {
  activeDraft: PmfLocalDraft | null
  selectedWorkId: string
  resolvedBranchId: string
  requestChapter: PmfChapter | null
  latestChapter: PmfChapter | null
  manuscript: string
  chapters: PmfChapter[]
  settingAssets: PmfLocalSettingAsset[]
  manualRecallItems: ManualRecallItem[]
  linkedRequest: PmfReaderRequest | null
  routeChapterNumber?: number | null
  onApplyManuscript: (content: string) => void
}

export function useCreatorEditorDecisionWorkbench(
  input: UseCreatorEditorDecisionWorkbenchInput,
) {
  const identity = resolveCreatorEditorDecisionIdentity(input)
  return useCreationDecisionSession({
    activeDraft: input.activeDraft,
    workId: input.selectedWorkId,
    branchId: input.resolvedBranchId,
    chapterId: identity.chapterId,
    chapterNumber: identity.chapterNumber,
    sceneId: identity.sceneId,
    manuscript: input.manuscript,
    chapters: input.chapters,
    settingAssets: input.settingAssets,
    manualRecallItems: input.manualRecallItems,
    linkedRequest: input.linkedRequest,
    onApplyManuscript: input.onApplyManuscript,
  })
}
