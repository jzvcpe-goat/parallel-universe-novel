import type { PmfLocalDraft, PmfReaderRequest } from '@/features/pmf/types'
import {
  buildEditorDraftActionInput,
  buildEditorPublishCheckInput,
  type EditorActionReadiness,
} from './creatorEditorActionInputController'
import {
  runEditorManualDraftActionFlow,
  runEditorPublishCheckFlow,
  type EditorDraftActionKind,
} from './creatorEditorDraftActionFlowService'
import type { CreatorEditorDraftStatePatch } from './creatorEditorDraftPatchController'
import type { EditorPublishHandoff } from './creatorEditorPublishHandoffController'

export type { EditorDraftActionKind }

export interface EditorDraftSubmitContext {
  activeDraftRef: string
  chapterNumber?: number | null
  content: string
  linkedRequest: PmfReaderRequest | null
  readiness: EditorActionReadiness
  resolvedBranchId: string
  selectedWorkId: string
  title: string
}

export interface RunEditorManualDraftSubmitFlowInput extends EditorDraftSubmitContext {
  action: EditorDraftActionKind
  resetDraftAction: () => void
}

export interface RunEditorManualDraftSubmitFlowResult {
  draft: PmfLocalDraft | null
  statePatch: CreatorEditorDraftStatePatch
}

export interface RunEditorPublishCheckSubmitFlowInput extends EditorDraftSubmitContext {
  resetDraftAction: () => void
}

export interface RunEditorPublishCheckSubmitFlowResult {
  handoff: EditorPublishHandoff | null
  statePatch: CreatorEditorDraftStatePatch
}

export async function runEditorManualDraftSubmitFlow({
  action,
  resetDraftAction,
  ...context
}: RunEditorManualDraftSubmitFlowInput): Promise<RunEditorManualDraftSubmitFlowResult> {
  return runEditorManualDraftActionFlow({
    input: buildEditorDraftActionInput({
      action,
      ...context,
    }),
    resetDraftAction,
  })
}

export async function runEditorPublishCheckSubmitFlow({
  resetDraftAction,
  ...context
}: RunEditorPublishCheckSubmitFlowInput): Promise<RunEditorPublishCheckSubmitFlowResult> {
  return runEditorPublishCheckFlow({
    input: buildEditorPublishCheckInput(context),
    resetDraftAction,
  })
}
