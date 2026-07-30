import type {
  PmfLocalSettingAsset,
  PmfLocalSettingAssetKind,
} from '@/features/pmf/types'

const explicitKindPatterns: Array<{
  kind: PmfLocalSettingAssetKind
  pattern: RegExp
}> = [
  { kind: 'character', pattern: /^(?:设定\s*·\s*)?人物\s*·\s*/u },
  { kind: 'location', pattern: /^(?:设定\s*·\s*)?(?:地点|场景)\s*·\s*/u },
  { kind: 'timeline', pattern: /^(?:设定\s*·\s*)?(?:时间|时间线)\s*·\s*/u },
  { kind: 'rule', pattern: /^(?:设定\s*·\s*)?(?:规则|世界规则|伏笔|承诺)\s*·\s*/u },
]

function explicitlyCapturedKind(asset: PmfLocalSettingAsset) {
  if (!asset.tags.includes('对话补充') && !asset.tags.includes('作者明确')) return null
  const values = [asset.title, asset.summary, asset.detail]
    .map(value => value.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  return explicitKindPatterns.find(item => values.some(value => item.pattern.test(value)))?.kind || null
}

export function resolveSettingAssetSemanticKind(asset: PmfLocalSettingAsset) {
  return explicitlyCapturedKind(asset) || asset.kind
}
