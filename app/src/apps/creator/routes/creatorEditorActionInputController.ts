import type { PmfReaderRequest } from '@/features/pmf/types'
import type {
  ChapterDirectionId,
  WritingGuideStep,
} from './creatorEditorViewModels'
import type { EditorDraftActionKind } from './creatorEditorDraftActionService'

export interface EditorActionReadiness {
  authorReady: boolean
  contentReady: boolean
  destinationReady: boolean
  titleReady: boolean
}

interface EditorActionContextInput {
  activeDraftRef: string
  chapterNumber?: number | null
  content: string
  linkedRequest: PmfReaderRequest | null
  readiness: EditorActionReadiness
  resolvedBranchId: string
  selectedWorkId: string
  title: string
}

export function buildEditorDraftActionInput({
  action,
  activeDraftRef,
  chapterNumber,
  content,
  linkedRequest,
  readiness,
  resolvedBranchId,
  selectedWorkId,
  title,
}: EditorActionContextInput & { action: EditorDraftActionKind }) {
  return {
    action,
    activeDraftRef,
    linkedRequest,
    workId: selectedWorkId,
    branchId: resolvedBranchId,
    chapterNumber,
    title,
    content,
    readiness,
  }
}

export function buildEditorPublishCheckInput({
  activeDraftRef,
  content,
  linkedRequest,
  readiness,
  resolvedBranchId,
  selectedWorkId,
  title,
}: EditorActionContextInput) {
  return {
    activeDraftRef,
    linkedRequest,
    workId: selectedWorkId,
    branchId: resolvedBranchId,
    title,
    content,
    readiness,
  }
}

interface EditorSettingCaptureInput {
  chapterDirection: ChapterDirectionId
  content: string
  editorDestinationLabel: string
  guideStep: WritingGuideStep
  resolvedBranchId: string
  selectedRequest: PmfReaderRequest | null
  selectedWorkTitle: string
  selectedWorkId: string
  title: string
}

export function buildEditorSettingCaptureInput({
  chapterDirection,
  content,
  editorDestinationLabel,
  guideStep,
  resolvedBranchId,
  selectedRequest,
  selectedWorkId,
  selectedWorkTitle,
  title,
}: EditorSettingCaptureInput) {
  return {
    workId: selectedWorkId,
    workTitle: selectedWorkTitle || '当前作品',
    branchId: resolvedBranchId || null,
    guideStep,
    chapterDirection,
    title,
    content,
    destinationLabel: editorDestinationLabel,
    linkedRequestText: selectedRequest?.request_text || null,
  }
}
