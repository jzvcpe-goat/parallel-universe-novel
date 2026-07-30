import type {
  PmfLocalSettingAsset,
  PmfLocalSettingAssetKind,
} from '@/features/pmf/types'
import {
  readLocalSettingAssets,
  upsertLocalSettingAsset,
  type PmfLocalSettingAssetInput,
} from '@/local-db/creatorLocalSettingAssetRepository'
import { defaultSettingKindForStage } from './creatorEditorSocraticViewModels'
import type { WritingGuideStep } from './creatorEditorViewModels'

export interface ConversationSettingPersistencePort {
  readAll(workId?: string): PmfLocalSettingAsset[]
  save(input: PmfLocalSettingAssetInput): PmfLocalSettingAsset
}

export interface ConversationSettingCaptureInput {
  text: string
  workId: string
  branchId: string | null
  stage: WritingGuideStep
}

export type ConversationSettingCaptureResult =
  | { recognized: false }
  | {
    recognized: true
    ok: false
    notice: string
  }
  | {
    recognized: true
    ok: true
    asset: PmfLocalSettingAsset
    settingAssets: PmfLocalSettingAsset[]
    notice: string
  }

const defaultPersistence: ConversationSettingPersistencePort = {
  readAll: readLocalSettingAssets,
  save: upsertLocalSettingAsset,
}

const settingPrefixes: Array<{
  pattern: RegExp
  kind: PmfLocalSettingAssetKind | null
  label: string
  tags: string[]
}> = [
  { pattern: /^(?:(?:补充)?设定[：:]\s*)?人物(?:[：:]|\s*·\s*)\s*/u, kind: 'character', label: '人物', tags: ['人物'] },
  { pattern: /^(?:(?:补充)?设定[：:]\s*)?(?:地点|场景)(?:[：:]|\s*·\s*)\s*/u, kind: 'location', label: '地点', tags: ['地点'] },
  { pattern: /^(?:(?:补充)?设定[：:]\s*)?(?:时间|时间线)(?:[：:]|\s*·\s*)\s*/u, kind: 'timeline', label: '时间线', tags: ['时间线'] },
  { pattern: /^(?:(?:补充)?设定[：:]\s*)?(?:规则|世界规则)(?:[：:]|\s*·\s*)\s*/u, kind: 'rule', label: '规则', tags: ['规则'] },
  { pattern: /^(?:(?:补充)?设定[：:]\s*)?(?:伏笔|承诺)(?:[：:]|\s*·\s*)\s*/u, kind: 'rule', label: '伏笔', tags: ['伏笔', '待回收'] },
  { pattern: /^(?:补充)?设定[：:]\s*/u, kind: null, label: '设定', tags: ['对话补充'] },
]

function compact(value: string, maximum: number) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length <= maximum ? normalized : `${normalized.slice(0, maximum - 1)}…`
}

export function runConversationSettingCapture(
  input: ConversationSettingCaptureInput,
  persistence: ConversationSettingPersistencePort = defaultPersistence,
): ConversationSettingCaptureResult {
  const prefix = settingPrefixes.find(item => item.pattern.test(input.text.trim()))
  if (!prefix) return { recognized: false }
  if (!input.workId) {
    return { recognized: true, ok: false, notice: '先选择作品，再补充这条设定。' }
  }
  const detail = input.text.trim().replace(prefix.pattern, '').trim()
  if (!detail) {
    return { recognized: true, ok: false, notice: `请在“${prefix.label}：”后写下具体内容。` }
  }
  const kind = prefix.kind || defaultSettingKindForStage(input.stage)
  const asset = persistence.save({
    workId: input.workId,
    branchId: input.branchId,
    kind,
    stage: input.stage,
    title: `${prefix.label} · ${compact(detail, 18)}`,
    summary: compact(detail, 180),
    detail,
    tags: [...prefix.tags, '作者明确'],
  })
  return {
    recognized: true,
    ok: true,
    asset,
    settingAssets: persistence.readAll(),
    notice: `已收进本机写作智库：${asset.title}`,
  }
}
