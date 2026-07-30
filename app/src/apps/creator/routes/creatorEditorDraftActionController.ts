import type { RunEditorDraftSaveResult } from './creatorEditorDraftSaveService'

export const editorDraftActionResetDelayMs = 120

type SuccessfulEditorDraftSaveResult = Extract<RunEditorDraftSaveResult, { ok: true }>

export type EditorDraftSaveResultPatch =
  | {
    ok: false
    draft: null
    notice: string
  }
  | {
    ok: true
    activeDraftRef: string
    creativeReminders: SuccessfulEditorDraftSaveResult['creativeReminders']
    draft: SuccessfulEditorDraftSaveResult['draft']
    drafts: SuccessfulEditorDraftSaveResult['drafts']
    notice: string
  }

export function resolveEditorDraftSaveResultPatch(
  result: RunEditorDraftSaveResult,
): EditorDraftSaveResultPatch {
  if (!result.ok) {
    return {
      ok: false,
      draft: null,
      notice: result.notice,
    }
  }

  return {
    ok: true,
    activeDraftRef: result.draft.localDraftRef,
    creativeReminders: result.creativeReminders,
    draft: result.draft,
    drafts: result.drafts,
    notice: result.notice,
  }
}
