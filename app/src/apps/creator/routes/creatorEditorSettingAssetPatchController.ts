import type { PmfLocalSettingAsset } from '@/features/pmf/types'
import type { RunEditorSettingAssetCaptureResult } from './creatorEditorSettingAssetService'
import type { WritingGuideStep } from './creatorEditorViewModels'

type SuccessfulEditorSettingAssetCaptureResult = Extract<RunEditorSettingAssetCaptureResult, { ok: true }>

export interface CreatorEditorSettingAssetStatePatch {
  asset?: PmfLocalSettingAsset
  guideStep?: WritingGuideStep
  notice: string
  ok: boolean
  settingAssets?: SuccessfulEditorSettingAssetCaptureResult['settingAssets']
}

export function resolveEditorSettingAssetStatePatch(
  result: RunEditorSettingAssetCaptureResult,
): CreatorEditorSettingAssetStatePatch {
  if (!result.ok) {
    return {
      notice: result.notice,
      ok: false,
    }
  }

  return {
    asset: result.asset,
    guideStep: result.nextGuideStep,
    notice: result.notice,
    ok: true,
    settingAssets: result.settingAssets,
  }
}
