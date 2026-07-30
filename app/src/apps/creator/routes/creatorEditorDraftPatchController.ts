import type {
  EditorDraftOpenPatch,
  EditorFreshDraftPatch,
} from './creatorEditorDraftController'
import type { EditorDraftSaveResultPatch } from './creatorEditorDraftActionController'
import type {
  PublishMode,
  WritingGuideStep,
} from './creatorEditorViewModels'

type SuccessfulEditorDraftStatePatch = Extract<EditorDraftSaveResultPatch, { ok: true }>

export interface CreatorEditorDraftStatePatch {
  activeDraftRef?: string
  clearActiveWritingCommand?: true
  clearEditorAssistCandidate?: true
  content?: string
  creativeReminders?: SuccessfulEditorDraftStatePatch['creativeReminders']
  draft?: SuccessfulEditorDraftStatePatch['draft'] | null
  drafts?: SuccessfulEditorDraftStatePatch['drafts']
  guideStep?: WritingGuideStep
  notice: string
  ok?: boolean
  publishMode?: PublishMode
  selectedIfBranchId?: string
  selectedWorkId?: string
  title?: string
}

export function resolveEditorDraftSaveStatePatch(
  patch: EditorDraftSaveResultPatch,
): CreatorEditorDraftStatePatch {
  if (!patch.ok) {
    return {
      draft: null,
      notice: patch.notice,
      ok: false,
    }
  }

  return {
    activeDraftRef: patch.activeDraftRef,
    creativeReminders: patch.creativeReminders,
    draft: patch.draft,
    drafts: patch.drafts,
    notice: patch.notice,
    ok: true,
  }
}

export function resolveEditorDraftOpenStatePatch(
  patch: EditorDraftOpenPatch,
): CreatorEditorDraftStatePatch {
  return {
    activeDraftRef: patch.activeDraftRef,
    content: patch.content,
    notice: patch.notice,
    publishMode: patch.publishMode,
    selectedIfBranchId: patch.selectedIfBranchId,
    selectedWorkId: patch.selectedWorkId,
    title: patch.title,
  }
}

export function resolveEditorFreshDraftStatePatch(
  patch: EditorFreshDraftPatch,
): CreatorEditorDraftStatePatch {
  return {
    activeDraftRef: patch.activeDraftRef,
    clearActiveWritingCommand: patch.clearActiveWritingCommand,
    clearEditorAssistCandidate: patch.clearEditorAssistCandidate,
    content: patch.content,
    guideStep: patch.guideStep,
    notice: patch.notice,
    title: patch.title,
  }
}
