import type { PmfLocalDraft } from '@/features/pmf/types'
import {
  resolveEditorDraftSaveResultPatch,
} from './creatorEditorDraftActionController'
import {
  resolveEditorDraftSaveStatePatch,
  type CreatorEditorDraftStatePatch,
} from './creatorEditorDraftPatchController'
import {
  runEditorDraftSave,
  type RunEditorDraftSaveInput,
} from './creatorEditorDraftSaveService'

export type EditorDraftActionKind = 'save' | 'publish'

export interface RunEditorDraftActionInput extends RunEditorDraftSaveInput {
  action: EditorDraftActionKind
}

interface RunEditorDraftActionResult {
  action: EditorDraftActionKind
  draft: PmfLocalDraft | null
  statePatch: CreatorEditorDraftStatePatch
}

export async function runEditorDraftAction({
  action,
  ...saveInput
}: RunEditorDraftActionInput): Promise<RunEditorDraftActionResult> {
  const result = await runEditorDraftSave(saveInput)
  const statePatch = resolveEditorDraftSaveStatePatch(resolveEditorDraftSaveResultPatch(result))

  return {
    action,
    draft: statePatch.ok ? statePatch.draft || null : null,
    statePatch,
  }
}
