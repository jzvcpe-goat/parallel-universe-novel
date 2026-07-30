import { characterStateDimensions, type CharacterStateSnapshot } from '@/features/creator-decision/characterState'
import type { CharacterSimulationRequest } from '@/features/creator-decision/characterSimulation'
import type { ContextSnapshot, CreationSession } from '@/features/creator-decision/types'
import type { PmfLocalSettingAsset } from '@/features/pmf/types'
import { resolveSettingAssetSemanticKind } from './creatorEditorSettingAssetSemantics'

export interface CreatorCharacterRehearsalDraft {
  rawMessage: string
  characterNames: string[]
  scenario: string
  rounds: number
}

export interface CreatorCharacterRehearsalParseResult {
  recognized: boolean
  draft: CreatorCharacterRehearsalDraft | null
  issue: string | null
}

export interface CreatorCharacterRehearsalRequestResult {
  request: CharacterSimulationRequest | null
  selectedCharacterNames: string[]
  issue: string | null
}

function unique(values: string[]) {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)))
}

function characterNames(value: string) {
  return unique(value
    .replace(/[《》“”「」\u0022\u0027]/g, '')
    .split(/\s*(?:、|，|,|和|与|及|\+|&|／|\/)\s*/))
}

function requestedRounds(value: string) {
  const match = value.match(/(?:进行|做)?\s*([1-5])\s*轮/)
  return match ? Number(match[1]) : 2
}

export function parseCharacterRehearsalConversation(
  message: string,
): CreatorCharacterRehearsalParseResult {
  const value = message.trim()
  if (!/(?:角色|人物|群像)排练/.test(value)) {
    return { recognized: false, draft: null, issue: null }
  }

  const letMatch = value.match(/^让\s*(.{1,100}?)\s*(?:先)?(?:进行|做)?(?:一次|[1-5]\s*轮)?\s*(?:角色|人物|群像)排练\s*[：:，,]?\s*(.+)$/)
  const explicitMatch = value.match(/^(?:请)?(?:进行|做)?(?:一次|[1-5]\s*轮)?\s*(?:角色|人物|群像)排练\s*[：:]\s*(.+)$/)
  let namesPart = ''
  let scenario = ''

  if (letMatch) {
    namesPart = letMatch[1] || ''
    scenario = letMatch[2] || ''
  } else if (explicitMatch) {
    const body = explicitMatch[1] || ''
    const separator = body.search(/[；;｜|]/)
    if (separator >= 0) {
      namesPart = body.slice(0, separator)
      scenario = body.slice(separator + 1)
    }
  }

  const names = characterNames(namesPart)
  scenario = scenario
    .replace(/^\s*(?:场景|冲突|问题)\s*[：:]\s*/, '')
    .replace(/^\s*(?:进行|做)?\s*[1-5]\s*轮\s*[，,：:]?\s*/, '')
    .trim()

  if (names.length < 2 || names.length > 8) {
    return {
      recognized: true,
      draft: null,
      issue: '请在一句话里点名 2–8 位人物，例如：角色排练：陆沉舟、塞文；如果两人必须争夺同一项决定权，会怎样？',
    }
  }
  if (scenario.length < 12) {
    return {
      recognized: true,
      draft: null,
      issue: '再补一句明确的冲突问题；角色排练只回答这一个场景，不会代写正文。',
    }
  }

  return {
    recognized: true,
    draft: {
      rawMessage: value,
      characterNames: names,
      scenario: scenario.slice(0, 2_000),
      rounds: requestedRounds(value),
    },
    issue: null,
  }
}

export function characterAssetDisplayName(asset: PmfLocalSettingAsset) {
  return asset.title
    .replace(/^\s*(?:人物|角色)(?:排练)?\s*[·：:]\s*/, '')
    .split(/\s*(?:·|，|,|。|（|\()\s*/)[0]
    ?.trim() || asset.title.trim()
}

function safeState(
  character: ContextSnapshot['activeCharacters'][number] | undefined,
): CharacterStateSnapshot {
  if (!character) return {}
  const state: CharacterStateSnapshot = {}
  for (const dimension of characterStateDimensions) {
    const value = character.state?.[dimension]
    if (typeof value === 'string' && value.trim()) state[dimension] = value.trim()
    if (Array.isArray(value)) {
      const items = value.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim())
      if (items.length) state[dimension] = items
    }
  }
  if (!state.immediateGoal && character.goal.trim()) state.immediateGoal = character.goal.trim()
  if (!state.beliefs && character.belief.length) state.beliefs = character.belief
  if (!state.knowledge && character.knowledge.length) state.knowledge = character.knowledge
  if (!state.falseBeliefs && character.falseBeliefs.length) state.falseBeliefs = character.falseBeliefs
  if (!state.emotionalState && character.emotionalState.trim()) state.emotionalState = character.emotionalState.trim()
  if (!state.resources && character.resources.length) state.resources = character.resources
  return state
}

function findCharacterAsset(name: string, assets: PmfLocalSettingAsset[]) {
  const normalized = name.trim().toLocaleLowerCase('zh-CN')
  const exact = assets.find(asset => characterAssetDisplayName(asset).toLocaleLowerCase('zh-CN') === normalized)
  if (exact) return exact
  const matches = assets.filter(asset => {
    const title = asset.title.toLocaleLowerCase('zh-CN')
    const displayName = characterAssetDisplayName(asset).toLocaleLowerCase('zh-CN')
    return title.includes(normalized) || displayName.includes(normalized) || normalized.includes(displayName)
  })
  return matches.length === 1 ? matches[0] : null
}

function createRequestId() {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `character-simulation-request:${id}`
}

export function buildCharacterRehearsalRequest(input: {
  draft: CreatorCharacterRehearsalDraft
  session: CreationSession | null
  context: ContextSnapshot | null
  settingAssets: PmfLocalSettingAsset[]
  createId?: () => string
}): CreatorCharacterRehearsalRequestResult {
  if (!input.session || !input.context) {
    return {
      request: null,
      selectedCharacterNames: [],
      issue: '请先锁定本章意图并完成一次路径比较，让排练使用当前章节的真实上下文。',
    }
  }

  const characterAssets = input.settingAssets.filter(asset => (
    resolveSettingAssetSemanticKind(asset) === 'character'
  ))
  const selectedAssets = input.draft.characterNames.map(name => findCharacterAsset(name, characterAssets))
  const missingNames = input.draft.characterNames.filter((_, index) => !selectedAssets[index])
  if (missingNames.length) {
    return {
      request: null,
      selectedCharacterNames: selectedAssets.filter(Boolean).map(asset => characterAssetDisplayName(asset!)),
      issue: `本机人物卡里还找不到：${missingNames.join('、')}。先用“设定：人物 · 名字 · …”补一张卡，再发起排练。`,
    }
  }

  const resolvedAssets = selectedAssets.filter((asset): asset is PmfLocalSettingAsset => Boolean(asset))
  const uniqueAssetIds = new Set(resolvedAssets.map(asset => asset.localAssetRef))
  if (uniqueAssetIds.size !== resolvedAssets.length) {
    return {
      request: null,
      selectedCharacterNames: resolvedAssets.map(characterAssetDisplayName),
      issue: '点名的人物卡存在重复匹配，请使用人物卡上的完整名字重新发起排练。',
    }
  }

  const contextCharacterById = new Map(input.context.activeCharacters.map(character => [character.id, character]))
  const contextSourceIds = new Set(input.context.manifest.map(entry => entry.sourceId))
  const settingFacts = input.settingAssets
    .filter(asset => (
      resolveSettingAssetSemanticKind(asset) !== 'character'
      && contextSourceIds.has(asset.localAssetRef)
    ))
    .map(asset => `${asset.title}：${asset.summary}`.slice(0, 500))
    .slice(0, 40)
  const selectedCharacterNames = resolvedAssets.map(characterAssetDisplayName)
  const request: CharacterSimulationRequest = {
    schemaVersion: 'character-simulation-request.v1',
    requestId: input.createId?.() || createRequestId(),
    sessionId: input.session.id,
    workId: input.session.workId,
    chapterId: input.session.chapterId,
    contextSnapshotId: input.context.id,
    scenario: input.draft.scenario,
    rounds: input.draft.rounds,
    authorConfirmedExport: true,
    characters: resolvedAssets.map(asset => ({
      id: asset.localAssetRef,
      name: characterAssetDisplayName(asset),
      summary: [asset.summary, asset.detail].filter(Boolean).join('\n').slice(0, 2_000),
      state: safeState(contextCharacterById.get(asset.localAssetRef)),
    })),
    settingFacts,
    hardConstraints: unique([
      ...input.context.hardConstraints,
      '排练结果只形成候选卡，不构成正文或正史。',
      '不得替作者决定永久人物变化、死亡或关系结论。',
      '不得引用未被作者点名的人物作为证据来源。',
    ]).slice(0, 30),
  }
  return { request, selectedCharacterNames, issue: null }
}
