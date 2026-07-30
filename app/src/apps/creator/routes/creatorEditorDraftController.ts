import type { PmfLocalDraft, PmfReaderRequest } from '@/features/pmf/types'
import type { PublishMode, WritingGuideStep } from './creatorEditorViewModels'

export interface EditorDraftSaveReadiness {
  authorReady: boolean
  destinationReady: boolean
  titleReady: boolean
  contentReady: boolean
}

interface EditorDraftSaveBlocker {
  notice: string
}

interface BuildEditorLocalDraftInput {
  localDraftRef: string
  linkedRequest: PmfReaderRequest | null
  workId: string
  branchId: string
  chapterNumber?: number | null
  title: string
  content: string
  nowIso: string
}

export interface EditorDraftOpenPatch {
  activeDraftRef: string
  title: string
  content: string
  selectedWorkId: string
  publishMode: PublishMode
  selectedIfBranchId: string
  notice: string
}

export interface EditorFreshDraftPatch {
  activeDraftRef: string
  title: string
  content: string
  guideStep: WritingGuideStep
  clearEditorAssistCandidate: true
  clearActiveWritingCommand: true
  notice: string
}

export function resolveEditorDraftSaveBlocker({
  authorReady,
  destinationReady,
  titleReady,
  contentReady,
}: EditorDraftSaveReadiness): EditorDraftSaveBlocker | null {
  if (!authorReady) {
    return { notice: '当前作者状态待确认，暂不能保存或发布。' }
  }
  if (!destinationReady) {
    return { notice: '请选择作品和发布线后再保存。' }
  }
  if (!titleReady) {
    return { notice: '请先填写章节标题。' }
  }
  if (!contentReady) {
    return { notice: '请先写正文。' }
  }
  return null
}

export function buildEditorLocalDraft({
  localDraftRef,
  linkedRequest,
  workId,
  branchId,
  chapterNumber,
  title,
  content,
  nowIso,
}: BuildEditorLocalDraftInput): PmfLocalDraft {
  return {
    localDraftRef,
    requestId: linkedRequest?.id || null,
    workId,
    branchId,
    chapterNumber: chapterNumber || null,
    title: title.trim(),
    content,
    updatedAt: nowIso,
  }
}

export function resolveEditorDraftOpen(draft: PmfLocalDraft): EditorDraftOpenPatch {
  const mainBranch = draft.branchId.endsWith(':main')
  return {
    activeDraftRef: draft.localDraftRef,
    title: draft.title,
    content: draft.content,
    selectedWorkId: draft.workId,
    publishMode: mainBranch ? 'main' : 'if',
    selectedIfBranchId: mainBranch ? 'new-if-branch' : draft.branchId,
    notice: '已打开私密草稿。',
  }
}

export function resolveFreshEditorDraft(): EditorFreshDraftPatch {
  return {
    activeDraftRef: '',
    title: '新章节',
    content: '',
    guideStep: 'intent',
    clearEditorAssistCandidate: true,
    clearActiveWritingCommand: true,
    notice: '已新建空白草稿。先写一个画面，或选择一条读者愿望。',
  }
}
