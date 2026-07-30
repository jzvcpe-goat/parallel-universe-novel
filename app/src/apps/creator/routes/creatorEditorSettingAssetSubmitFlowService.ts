import type { PmfReaderRequest } from '@/features/pmf/types'
import {
  buildEditorSettingCaptureInput,
} from './creatorEditorActionInputController'
import type { CreatorEditorSettingAssetStatePatch } from './creatorEditorSettingAssetPatchController'
import { resolveEditorSettingAssetStatePatch } from './creatorEditorSettingAssetPatchController'
import { runEditorSettingAssetCapture } from './creatorEditorSettingAssetService'
import type {
  ChapterDirectionId,
  WritingGuideStep,
} from './creatorEditorViewModels'

export interface EditorSettingAssetSubmitContext {
  chapterDirection: ChapterDirectionId
  content: string
  editorDestinationLabel: string
  guideStep: WritingGuideStep
  resolvedBranchId: string
  selectedRequest: PmfReaderRequest | null
  selectedWorkId: string
  selectedWorkTitle: string
  title: string
}

export type EditorSettingAssetSubmitStatePatch = CreatorEditorSettingAssetStatePatch

export function runEditorSettingAssetSubmitFlow(
  context: EditorSettingAssetSubmitContext,
): CreatorEditorSettingAssetStatePatch {
  const result = runEditorSettingAssetCapture(buildEditorSettingCaptureInput(context))
  return resolveEditorSettingAssetStatePatch(result)
}
