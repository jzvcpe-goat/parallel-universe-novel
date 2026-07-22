import type { PmfLocalSettingAsset } from '@/features/pmf/types'
import {
  readLocalSettingAssets,
  upsertLocalSettingAsset,
  type PmfLocalSettingAssetInput,
} from '@/local-db/creatorLocalSettingAssetRepository'
import {
  resolveEditorSettingAssetDraft,
  type EditorSettingAssetDraftInput,
} from './creatorEditorSettingAssetController'
import type { WritingGuideStep } from './creatorEditorViewModels'

export interface EditorSettingAssetPersistencePort {
  readAll(): PmfLocalSettingAsset[]
  save(input: PmfLocalSettingAssetInput): PmfLocalSettingAsset
}

export interface EditorSettingAssetLoadPersistencePort {
  readAll(): PmfLocalSettingAsset[]
}

interface RunEditorSettingAssetLoadResult {
  settingAssets: PmfLocalSettingAsset[]
}

export type RunEditorSettingAssetCaptureResult =
  | {
    ok: false
    notice: string
  }
  | {
    ok: true
    asset: PmfLocalSettingAsset
    nextGuideStep: WritingGuideStep
    notice: string
    settingAssets: PmfLocalSettingAsset[]
  }

const defaultEditorSettingAssetPersistencePort: EditorSettingAssetPersistencePort = {
  readAll: readLocalSettingAssets,
  save: upsertLocalSettingAsset,
}

const defaultEditorSettingAssetLoadPersistencePort: EditorSettingAssetLoadPersistencePort = {
  readAll: readLocalSettingAssets,
}

export function runEditorSettingAssetLoad(
  persistence: EditorSettingAssetLoadPersistencePort = defaultEditorSettingAssetLoadPersistencePort,
): RunEditorSettingAssetLoadResult {
  return {
    settingAssets: persistence.readAll(),
  }
}

export function runEditorSettingAssetCapture(
  input: EditorSettingAssetDraftInput,
  persistence: EditorSettingAssetPersistencePort = defaultEditorSettingAssetPersistencePort,
): RunEditorSettingAssetCaptureResult {
  const draft = resolveEditorSettingAssetDraft(input)
  if (!draft.ok) return draft

  const asset = persistence.save(draft.assetInput)
  return {
    ok: true,
    asset,
    nextGuideStep: draft.nextGuideStep,
    notice: `已收进本机设定库：${asset.title}`,
    settingAssets: persistence.readAll(),
  }
}
