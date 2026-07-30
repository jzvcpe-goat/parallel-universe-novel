import type {
  PmfChapter,
  PmfLocalSettingAsset,
  PmfReaderRequest,
} from '@/features/pmf/types'
import type {
  ManualRecallGroup,
  ManualRecallItem,
} from '@/features/creator-decision/types'
import type { VerifiedLongRangeThreadRecallCandidate } from '@/features/creator-decision/longRangeThreadRecall'
import type { CreatorLocalChapterMemory } from './creatorEditorLocalChapterMemoryService'
import { resolveSettingAssetSemanticKind } from './creatorEditorSettingAssetSemantics'

export interface CreatorRecallCandidate extends ManualRecallItem {
  recommended: boolean
}

export const creatorRecallGroupLabels: Record<ManualRecallGroup, string> = {
  causal: '必须承接的因果',
  character_knowledge: '人物状态与所知',
  timeline: '时间与位置',
  promise: '未兑现的承诺',
}

function compact(value: string, maximum = 150) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  return normalized.length <= maximum ? normalized : `${normalized.slice(0, maximum - 1)}…`
}

function compactTail(value: string, maximum = 110) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  return normalized.length <= maximum ? normalized : `…${normalized.slice(-(maximum - 1))}`
}

function chapterRecallStatement(chapter: PmfChapter) {
  const content = chapter.content.trim()
  if (!content) return compact(chapter.title)
  const paragraphs = content
    .split(/\n{2,}/)
    .map(value => value.trim())
    .filter(Boolean)
  const opening = paragraphs[0] || content
  const ending = [...paragraphs].reverse().find(value => (
    value.length >= 4 && /[\p{L}\p{N}]/u.test(value)
  )) || paragraphs[paragraphs.length - 1] || content
  const openingEvidence = compact(opening, 90)
  const endingEvidence = compactTail(ending)
  const evidence = openingEvidence === endingEvidence
    ? `当章正文证据：${openingEvidence}`
    : `当章开篇证据：${openingEvidence}；当章收尾证据：${endingEvidence}`
  return `历史快照：只表示当章结束状态，当前有效状态以最新正史为准。${evidence}`
}

function assetDisplayTitle(title: string) {
  return title.trim().replace(/^(?:设定\s*·\s*)?(?:人物|时间线|伏笔|承诺)\s*·\s*/u, '') || '未命名设定'
}

function assetSourceLabel(kind: '人物' | '时间线' | '承诺', title: string) {
  return `${kind} · ${assetDisplayTitle(title)}`
}

function uniqueStatementParts(...parts: string[]) {
  const unique = [...new Set(parts.map(part => part.replace(/\s+/g, ' ').trim()).filter(Boolean))]
  return compact(unique.join('；'))
}

function sourceRevision(updatedAt: string) {
  const timestamp = Date.parse(updatedAt)
  return Number.isFinite(timestamp) ? Math.max(1, Math.floor(timestamp / 1000)) : 1
}

function assetStatement(asset: PmfLocalSettingAsset) {
  const knowledgeTags = asset.tags.filter(tag => (
    tag.startsWith('已知:')
    || tag.startsWith('误信:')
    || tag.startsWith('信念:')
    || tag.startsWith('情绪:')
  ))
  return compact([asset.summary, ...knowledgeTags].filter(Boolean).join('；'))
}

function chapterRecallItems(input: {
  chapters: PmfChapter[]
  workId: string
  branchId: string
  chapterId: string | null
  chapterNumber: number | null
}) {
  return input.chapters
    .filter(chapter => (
      chapter.work_id === input.workId
      && (!input.branchId || chapter.branch_id === input.branchId)
      && chapter.id !== input.chapterId
      && (!input.chapterNumber || chapter.chapter_no < input.chapterNumber)
      && Boolean(chapter.content.trim() || chapter.title.trim())
    ))
    .sort((left, right) => right.chapter_no - left.chapter_no)
    .slice(0, 4)
    .map<CreatorRecallCandidate>((chapter, index) => ({
      id: `manual-recall:causal:${chapter.id}`,
      sourceId: chapter.id,
      sourceRevision: Math.max(1, chapter.chapter_no),
      authority: 'canon',
      group: 'causal',
      statement: chapterRecallStatement(chapter),
      sourceLabel: `第 ${chapter.chapter_no} 章 · ${chapter.title || '未命名章节'}`,
      whyNow: index === 0 ? '上一章的行动与后果最可能直接约束当前场景。' : '同一分支的近期事实，防止因果链突然断开。',
      locator: {
        kind: 'chapter',
        targetId: chapter.id,
        label: `定位到第 ${chapter.chapter_no} 章`,
      },
      recommended: index === 0,
    }))
}

function localChapterRecallItems(input: {
  memories: CreatorLocalChapterMemory[]
  chapterNumber: number | null
  workId: string
  branchId: string
}) {
  return [...input.memories]
    .filter(memory => (
      memory.workId === input.workId
      && memory.branchId === input.branchId
      && (!input.chapterNumber || memory.chapterNumber < input.chapterNumber)
    ))
    .sort((left, right) => right.chapterNumber - left.chapterNumber)
    .slice(0, 6)
    .map<CreatorRecallCandidate>((memory, index) => ({
      id: `manual-recall:local-causal:${memory.chapterId}`,
      sourceId: memory.sourceId,
      sourceRevision: memory.sourceRevision,
      authority: 'canon',
      group: 'causal',
      statement: memory.statement,
      sourceLabel: `${memory.title} · 本机已确认`,
      whyNow: index === 0
        ? '这是上一章的人物选择、代价和收尾证据，应直接约束本章开场。'
        : '这是同一主线近期已经确认的因果债，避免长篇推进时遗忘。',
      locator: {
        kind: 'canon',
        targetId: memory.chapterId,
        label: `定位到本机第 ${memory.chapterNumber} 章正史`,
      },
      sceneMechanismSignature: memory.sceneMechanismSignature,
      recommended: index === 0,
    }))
}

function localCanonStateRecallItems(input: {
  memories: CreatorLocalChapterMemory[]
  chapterNumber: number | null
  workId: string
  branchId: string
}) {
  const seenPaths = new Set<string>()
  const groupCounts = new Map<ManualRecallGroup, number>()
  const candidates: CreatorRecallCandidate[] = []
  for (const memory of [...input.memories]
    .filter(item => (
      item.workId === input.workId
      && item.branchId === input.branchId
      && (!input.chapterNumber || item.chapterNumber < input.chapterNumber)
    ))
    .sort((left, right) => right.chapterNumber - left.chapterNumber)) {
    for (const item of memory.stateRecallItems) {
      if (seenPaths.has(item.statePath)) continue
      seenPaths.add(item.statePath)
      if (item.recallStatus === 'terminal') continue
      const count = groupCounts.get(item.group) || 0
      if (count >= 4) continue
      groupCounts.set(item.group, count + 1)
      candidates.push({
        ...item,
        recommended: false,
      })
    }
  }
  return candidates
}

function assetRecallItems(input: {
  assets: PmfLocalSettingAsset[]
  workId: string
  branchId: string
}) {
  const relevantAssets = input.assets
    .filter(asset => (
      asset.workId === input.workId
      && (!asset.branchId || !input.branchId || asset.branchId === input.branchId)
    ))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  const characters = relevantAssets
    .filter(asset => resolveSettingAssetSemanticKind(asset) === 'character')
    .slice(0, 4)
    .map<CreatorRecallCandidate>(asset => ({
      id: `manual-recall:character:${asset.localAssetRef}`,
      sourceId: asset.localAssetRef,
      sourceRevision: sourceRevision(asset.updatedAt),
      authority: 'author',
      group: 'character_knowledge',
      statement: assetStatement(asset) || '这张人物卡还没有可召回的知识边界。',
      sourceLabel: assetSourceLabel('人物', asset.title),
      whyNow: '核对人物已知、误信和当前目标，避免提前揭示或动机跳变。',
      locator: {
        kind: 'asset',
        targetId: asset.localAssetRef,
        label: `定位到人物卡 ${assetDisplayTitle(asset.title)}`,
      },
      recommended: false,
    }))
  const timeline = relevantAssets
    .filter(asset => resolveSettingAssetSemanticKind(asset) === 'timeline')
    .slice(0, 4)
    .map<CreatorRecallCandidate>(asset => ({
      id: `manual-recall:timeline:${asset.localAssetRef}`,
      sourceId: asset.localAssetRef,
      sourceRevision: sourceRevision(asset.updatedAt),
      authority: 'author',
      group: 'timeline',
      statement: uniqueStatementParts(asset.summary, asset.detail),
      sourceLabel: assetSourceLabel('时间线', asset.title),
      whyNow: '固定当前时刻、地点和先后顺序，避免人物瞬移或时间倒置。',
      locator: {
        kind: 'asset',
        targetId: asset.localAssetRef,
        label: `定位到时间线 ${assetDisplayTitle(asset.title)}`,
      },
      recommended: false,
    }))
  const promises = relevantAssets
    .filter(asset => asset.tags.some(tag => ['承诺', '待兑现', '伏笔', '待回收'].includes(tag)))
    .slice(0, 4)
    .map<CreatorRecallCandidate>(asset => ({
      id: `manual-recall:promise:${asset.localAssetRef}`,
      sourceId: asset.localAssetRef,
      sourceRevision: sourceRevision(asset.updatedAt),
      authority: 'author',
      group: 'promise',
      statement: uniqueStatementParts(asset.summary, asset.detail),
      sourceLabel: assetSourceLabel('承诺', asset.title),
      whyNow: '检查读者已经被承诺但尚未兑现的信息、选择或后果。',
      locator: {
        kind: 'asset',
        targetId: asset.localAssetRef,
        label: `定位到承诺卡 ${assetDisplayTitle(asset.title)}`,
      },
      recommended: false,
    }))
  return [...characters, ...timeline, ...promises]
}

function echoRecallItem(input: {
  request: PmfReaderRequest | null
  workId: string
  branchId: string
}): CreatorRecallCandidate[] {
  const request = input.request
  if (
    !request?.request_text.trim()
    || request.work_id !== input.workId
    || (request.branch_id !== null && request.branch_id !== input.branchId)
  ) return []
  return [{
    id: `manual-recall:echo:${request.id}`,
    sourceId: request.id,
    sourceRevision: 1,
    authority: 'derived',
    group: 'promise',
    statement: compact(request.request_text),
    sourceLabel: '外界回声 · 本章关联',
    whyNow: '这是作者主动带入本章的真实反馈，只作为创作提醒，不替作者决定。',
    locator: {
      kind: 'echo',
      targetId: request.id,
      label: '定位到关联回声',
    },
    recommended: true,
  }]
}

function longRangeThreadRecallItems(input: {
  candidates: VerifiedLongRangeThreadRecallCandidate[]
  workId: string
  branchId: string
  chapterNumber: number | null
}): CreatorRecallCandidate[] {
  return input.candidates
    .filter(candidate => (
      candidate.workId === input.workId
      && candidate.branchId === input.branchId
      && (!input.chapterNumber || candidate.sourceChapter < input.chapterNumber)
      && candidate.selectionState === 'unselected'
      && candidate.authorSelectionRequired
    ))
    .map(candidate => ({
      ...candidate,
      recommended: false,
    }))
}

export function buildCreatorRecallCandidates(input: {
  chapters: PmfChapter[]
  localChapterMemories?: CreatorLocalChapterMemory[]
  settingAssets: PmfLocalSettingAsset[]
  linkedRequest: PmfReaderRequest | null
  workId: string
  branchId: string
  chapterId: string | null
  chapterNumber?: number | null
  longRangeThreadRecallCandidates?: VerifiedLongRangeThreadRecallCandidate[]
}) {
  if (!input.workId) return []
  const chapterNumber = input.chapterNumber
    || input.chapters.find(chapter => chapter.id === input.chapterId)?.chapter_no
    || null
  return [
    ...localChapterRecallItems({
      memories: input.localChapterMemories || [],
      chapterNumber,
      workId: input.workId,
      branchId: input.branchId,
    }),
    ...localCanonStateRecallItems({
      memories: input.localChapterMemories || [],
      chapterNumber,
      workId: input.workId,
      branchId: input.branchId,
    }),
    ...chapterRecallItems({
      chapters: input.chapters,
      workId: input.workId,
      branchId: input.branchId,
      chapterId: input.chapterId,
      chapterNumber,
    }),
    ...assetRecallItems({
      assets: input.settingAssets,
      workId: input.workId,
      branchId: input.branchId,
    }),
    ...longRangeThreadRecallItems({
      candidates: input.longRangeThreadRecallCandidates || [],
      workId: input.workId,
      branchId: input.branchId,
      chapterNumber,
    }),
    ...echoRecallItem({
      request: input.linkedRequest,
      workId: input.workId,
      branchId: input.branchId,
    }),
  ]
}

export function recommendedCreatorRecallIds(candidates: CreatorRecallCandidate[]) {
  return candidates.filter(candidate => candidate.recommended).map(candidate => candidate.id)
}

export function resolveManualRecallItems(
  candidates: CreatorRecallCandidate[],
  selectedIds: string[],
): ManualRecallItem[] {
  const selected = new Set(selectedIds)
  return candidates
    .filter(candidate => selected.has(candidate.id))
    .map(candidate => ({
      id: candidate.id,
      sourceId: candidate.sourceId,
      sourceRevision: candidate.sourceRevision,
      authority: candidate.authority,
      group: candidate.group,
      statement: candidate.statement,
      sourceLabel: candidate.sourceLabel,
      whyNow: candidate.whyNow,
      locator: candidate.locator,
      sceneMechanismSignature: candidate.sceneMechanismSignature,
    }))
}
