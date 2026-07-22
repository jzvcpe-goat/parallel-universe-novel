import type { PmfChapter, PmfLocalDraft } from '@/features/pmf/types'

interface CreatorEditorCreationSessionIdentityInput {
  activeDraft: PmfLocalDraft | null
  workId: string
  branchId: string
  chapterId: string
}

export interface CreatorEditorDecisionIdentityInput {
  activeDraft: PmfLocalDraft | null
  requestChapter: PmfChapter | null
  latestChapter: PmfChapter | null
  selectedWorkId: string
  resolvedBranchId: string
  routeChapterNumber?: number | null
}

export interface CreatorEditorDecisionIdentity {
  chapterId: string
  chapterNumber: number | null
  sceneId: string | null
}

export function creatorEditorChapterIdentity(workId: string, branchId: string, chapterNumber: number) {
  return `${workId}:${branchId}:chapter:${chapterNumber}`
}

export function hasExplicitCreatorChapterIdentity(chapterId: string) {
  return /:chapter:\d+$/u.test(chapterId)
}

export function creatorEditorCreationSessionId(input: CreatorEditorCreationSessionIdentityInput) {
  if (input.activeDraft && !hasExplicitCreatorChapterIdentity(input.chapterId)) {
    return `creation-session:legacy:${input.activeDraft.localDraftRef}`
  }
  return `creation-session:editor:${input.workId}:${input.branchId}:${input.chapterId}`
}

export function resolveCreatorEditorWritingChapterNumber(
  input: CreatorEditorDecisionIdentityInput,
) {
  if (!input.selectedWorkId || !input.resolvedBranchId) return null
  if (Number.isInteger(input.routeChapterNumber) && Number(input.routeChapterNumber) > 0) {
    return Number(input.routeChapterNumber)
  }
  if (Number.isInteger(input.activeDraft?.chapterNumber) && Number(input.activeDraft?.chapterNumber) > 0) {
    return Number(input.activeDraft?.chapterNumber)
  }
  if (input.latestChapter) return input.latestChapter.chapter_no + 1
  return 1
}

export function resolveCreatorEditorDecisionIdentity(
  input: CreatorEditorDecisionIdentityInput,
): CreatorEditorDecisionIdentity {
  if (!input.selectedWorkId || !input.resolvedBranchId) {
    return { chapterId: '', chapterNumber: null, sceneId: null }
  }

  const chapterNumber = resolveCreatorEditorWritingChapterNumber(input)
  if (input.routeChapterNumber && chapterNumber) {
    const localIdentity = creatorEditorChapterIdentity(
      input.selectedWorkId,
      input.resolvedBranchId,
      chapterNumber,
    )
    return {
      chapterId: `local-chapter:${localIdentity}`,
      chapterNumber,
      sceneId: `local-scene:${localIdentity}`,
    }
  }

  const localIdentity = input.activeDraft?.localDraftRef
    || (chapterNumber
      ? creatorEditorChapterIdentity(input.selectedWorkId, input.resolvedBranchId, chapterNumber)
      : `${input.selectedWorkId}:${input.resolvedBranchId}:new`)

  // Published request/latest chapters are context anchors, never the unpublished target.
  return {
    chapterId: `local-chapter:${localIdentity}`,
    chapterNumber,
    sceneId: `local-scene:${localIdentity}`,
  }
}
