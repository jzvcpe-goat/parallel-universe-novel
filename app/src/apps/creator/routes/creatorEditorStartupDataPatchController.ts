import type { RunEditorStartupEffectResult } from './creatorEditorStartupEffectService'

type SuccessfulEditorStartupEffectResult = Extract<RunEditorStartupEffectResult, { ok: true }>

export interface CreatorEditorStartupDataPatch {
  authorization: SuccessfulEditorStartupEffectResult['startupLoad']['authorization']
  branches: SuccessfulEditorStartupEffectResult['startupLoad']['branches']
  chapters: SuccessfulEditorStartupEffectResult['startupLoad']['chapters']
  creativeReminders: SuccessfulEditorStartupEffectResult['creativeReminders']
  drafts: SuccessfulEditorStartupEffectResult['startupLoad']['drafts']
  recallSelections: SuccessfulEditorStartupEffectResult['startupLoad']['recallSelections']
  requests: SuccessfulEditorStartupEffectResult['startupLoad']['requests']
  settingAssets: SuccessfulEditorStartupEffectResult['startupLoad']['settingAssets']
  works: SuccessfulEditorStartupEffectResult['startupLoad']['works']
}

export function resolveEditorStartupDataPatch(
  result: SuccessfulEditorStartupEffectResult,
): CreatorEditorStartupDataPatch {
  return {
    authorization: result.startupLoad.authorization,
    branches: result.startupLoad.branches,
    chapters: result.startupLoad.chapters,
    creativeReminders: result.creativeReminders,
    drafts: result.startupLoad.drafts,
    recallSelections: result.startupLoad.recallSelections,
    requests: result.startupLoad.requests,
    settingAssets: result.startupLoad.settingAssets,
    works: result.startupLoad.works,
  }
}
