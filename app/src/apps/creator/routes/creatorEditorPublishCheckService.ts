import type { CreatorEditorDraftStatePatch } from './creatorEditorDraftPatchController'
import {
  runEditorDraftAction,
  type RunEditorDraftActionInput,
} from './creatorEditorDraftActionService'
import {
  prepareEditorPublishHandoff,
  type EditorPublishHandoffPersistencePort,
} from './creatorEditorPublishHandoffService'
import type { EditorPublishHandoff } from './creatorEditorPublishHandoffController'

export type RunEditorPublishCheckInput = Omit<RunEditorDraftActionInput, 'action'>

export interface RunEditorPublishCheckResult {
  handoff: EditorPublishHandoff | null
  statePatch: CreatorEditorDraftStatePatch
}

export async function runEditorPublishCheckAction(
  input: RunEditorPublishCheckInput,
  publishHandoffPersistence?: EditorPublishHandoffPersistencePort,
): Promise<RunEditorPublishCheckResult> {
  const result = await runEditorDraftAction({
    ...input,
    action: 'publish',
  })

  if (!result.draft) {
    return {
      handoff: null,
      statePatch: result.statePatch,
    }
  }

  return {
    handoff: prepareEditorPublishHandoff(result.draft, publishHandoffPersistence),
    statePatch: result.statePatch,
  }
}
