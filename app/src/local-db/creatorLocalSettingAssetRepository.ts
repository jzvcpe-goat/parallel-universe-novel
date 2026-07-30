import type {
  PmfLocalSettingAsset,
  PmfLocalSettingAssetKind,
  PmfLocalSettingAssetStage,
} from '@/features/pmf/types'
import {
  readLocalSettingAssetRecords,
  upsertLocalSettingAssetRecord,
} from './creatorLocalRepository'

export interface PmfLocalSettingAssetInput {
  workId: string
  branchId?: string | null
  kind: PmfLocalSettingAssetKind
  stage: PmfLocalSettingAssetStage
  title: string
  summary: string
  detail?: string
  tags?: string[]
}

function randomId(prefix: string) {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}:${id}`
}

export function createLocalSettingAssetRef() {
  return randomId('local-setting')
}

export function readLocalSettingAssets(workId?: string): PmfLocalSettingAsset[] {
  return readLocalSettingAssetRecords(workId)
}

export function upsertLocalSettingAsset(input: PmfLocalSettingAssetInput): PmfLocalSettingAsset {
  const assets = readLocalSettingAssets()
  const normalizedTitle = input.title.trim() || '未命名设定'
  const normalizedSummary = input.summary.trim() || '待作者继续补充。'
  const existing = assets.find(asset =>
    asset.workId === input.workId
    && asset.branchId === (input.branchId || null)
    && asset.kind === input.kind
    && asset.title === normalizedTitle,
  )
  const next: PmfLocalSettingAsset = {
    localAssetRef: existing?.localAssetRef || createLocalSettingAssetRef(),
    workId: input.workId,
    branchId: input.branchId || null,
    kind: input.kind,
    stage: input.stage,
    title: normalizedTitle,
    summary: normalizedSummary,
    detail: input.detail?.trim() || normalizedSummary,
    tags: input.tags?.filter(Boolean).slice(0, 8) || [],
    updatedAt: new Date().toISOString(),
  }
  return upsertLocalSettingAssetRecord(next)
}
