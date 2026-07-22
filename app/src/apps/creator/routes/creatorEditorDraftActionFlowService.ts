import type { PmfLocalDraft } from '@/features/pmf/types'
import {
  runEditorDraftAction,
  type EditorDraftActionKind,
  type RunEditorDraftActionInput,
} from './creatorEditorDraftActionService'
import {
  scheduleEditorDraftActionReset,
  type CancelEditorDraftActionReset,
} from './creatorEditorDraftActionResetService'
import type { CreatorEditorDraftStatePatch } from './creatorEditorDraftPatchController'
import {
  runEditorPublishCheckAction,
  type RunEditorPublishCheckInput,
} from './creatorEditorPublishCheckService'
import type { EditorPublishHandoff } from './creatorEditorPublishHandoffController'

export type { EditorDraftActionKind }

export interface EditorDraftActionFlowResetPort {
  scheduleReset(reset: () => void): CancelEditorDraftActionReset
}

interface RunEditorManualDraftActionFlowInput {
  input: RunEditorDraftActionInput
  resetDraftAction: () => void
}

interface RunEditorManualDraftActionFlowResult {
  draft: PmfLocalDraft | null
  statePatch: CreatorEditorDraftStatePatch
}

interface RunEditorPublishCheckFlowInput {
  input: RunEditorPublishCheckInput
  resetDraftAction: () => void
}

interface RunEditorPublishCheckFlowResult {
  handoff: EditorPublishHandoff | null
  statePatch: CreatorEditorDraftStatePatch
}

const defaultEditorDraftActionFlowResetPort: EditorDraftActionFlowResetPort = {
  scheduleReset: scheduleEditorDraftActionReset,
}

export async function runEditorManualDraftActionFlow(
  { input, resetDraftAction }: RunEditorManualDraftActionFlowInput,
  resetPort: EditorDraftActionFlowResetPort = defaultEditorDraftActionFlowResetPort,
): Promise<RunEditorManualDraftActionFlowResult> {
  const result = await runEditorDraftAction(input)
  resetPort.scheduleReset(resetDraftAction)

  return {
    draft: result.draft,
    statePatch: result.statePatch,
  }
}

export async function runEditorPublishCheckFlow(
  { input, resetDraftAction }: RunEditorPublishCheckFlowInput,
  resetPort: EditorDraftActionFlowResetPort = defaultEditorDraftActionFlowResetPort,
): Promise<RunEditorPublishCheckFlowResult> {
  const result = await runEditorPublishCheckAction(input)
  resetPort.scheduleReset(resetDraftAction)

  return {
    handoff: result.handoff,
    statePatch: result.statePatch,
  }
}
