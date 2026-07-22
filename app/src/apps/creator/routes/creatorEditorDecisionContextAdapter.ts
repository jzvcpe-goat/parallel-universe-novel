import type {
  PmfChapter,
  PmfLocalSettingAsset,
  PmfReaderRequest,
} from '@/features/pmf/types'
import type {
  AuthorIntentContract,
  CreationContextSource,
  LocalCanonStateRecord,
  ManualRecallItem,
} from '@/features/creator-decision/types'
import {
  characterStateDimensionSchema,
  type CharacterStateSnapshot,
} from '@/features/creator-decision/characterState'
import { resolveSettingAssetSemanticKind } from './creatorEditorSettingAssetSemantics'

export interface CreatorDecisionRuntimeProjection {
  kernelRevision: number
  constraintRevision: number
  kernelRules: string[]
  hardConstraints: string[]
  currentTimeline?: unknown
  characterStates?: Record<string, CharacterStateSnapshot>
}

export interface CreatorDecisionContextAdapterInput {
  intent: AuthorIntentContract
  canon: LocalCanonStateRecord | null
  chapters: PmfChapter[]
  settingAssets: PmfLocalSettingAsset[]
  linkedRequest: PmfReaderRequest | null
  workId: string
  branchId: string
  chapterId: string
  chapterNumber?: number | null
  sceneId: string | null
  manuscript: string
  manualRecallItems?: ManualRecallItem[]
  runtimeProjection?: CreatorDecisionRuntimeProjection | null
}

function excerpt(value: string, maximum = 360) {
  const compact = value.replace(/\s+/g, ' ').trim()
  return compact.length <= maximum ? compact : `${compact.slice(0, maximum - 1)}…`
}

function tailExcerpt(value: string, maximum = 360) {
  const compact = value.replace(/\s+/g, ' ').trim()
  return compact.length <= maximum ? compact : `…${compact.slice(-(maximum - 1))}`
}

function headTailExcerpt(value: string, maximum = 700) {
  const compact = value.replace(/\s+/g, ' ').trim()
  if (compact.length <= maximum) return compact
  const headLength = Math.floor((maximum - 1) / 2)
  const tailLength = maximum - 1 - headLength
  return `${compact.slice(0, headLength)}…${compact.slice(-tailLength)}`
}

function assetText(asset: PmfLocalSettingAsset) {
  return [asset.summary, asset.detail].map(value => value.trim()).filter(Boolean).join('；')
}

function objectRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function canonContinuityItems(
  canon: LocalCanonStateRecord | null,
  root: 'timeline' | 'causal' | 'promises' | 'foreshadowing',
  leaf: 'outcome' | 'status',
) {
  const collection = objectRecord(canon?.state[root])
  if (!collection) return []
  return Object.entries(collection).flatMap(([sourceId, rawEntry]) => {
    const entry = objectRecord(rawEntry)
    const rawValue = entry?.[leaf] ?? rawEntry
    const value = objectRecord(rawValue)
    const statement = typeof rawValue === 'string'
      ? rawValue
      : typeof value?.statement === 'string'
        ? value.statement
        : typeof entry?.statement === 'string'
          ? entry.statement
          : ''
    if (!statement.trim()) return []
    const status = typeof value?.status === 'string'
      ? value.status
      : typeof entry?.status === 'string'
        ? entry.status
        : null
    return [{
      id: sourceId,
      title: sourceId,
      detail: excerpt(statement),
      status,
    }]
  })
}

function characterState(
  input: CreatorDecisionContextAdapterInput,
  characterId: string,
) {
  const projected = input.runtimeProjection?.characterStates?.[characterId]
  const projectedState = projected
    ? Object.fromEntries(Object.entries(projected).filter(([dimension, value]) => (
        value !== undefined && characterStateDimensionSchema.safeParse(dimension).success
      )))
    : undefined
  const canonCharacters = input.canon?.state.characters
  const rawCanonState = canonCharacters && typeof canonCharacters === 'object' && !Array.isArray(canonCharacters)
    ? (canonCharacters as Record<string, unknown>)[characterId]
    : undefined
  const canonState = rawCanonState && typeof rawCanonState === 'object' && !Array.isArray(rawCanonState)
    ? rawCanonState as Record<string, unknown>
    : undefined
  if (!canonState) return projectedState
  if (!projectedState) return canonState
  return { ...canonState, ...projectedState }
}

interface IndexedStyleParagraph {
  manuscriptParagraphIndex: number
  text: string
}

function indexedStyleParagraphs(manuscript: string): IndexedStyleParagraph[] {
  return manuscript
    .split(/\n{2,}/)
    .map((value, manuscriptParagraphIndex) => ({
      manuscriptParagraphIndex,
      text: value.trim(),
    }))
    .filter(paragraph => paragraph.text)
}

function usableStyleEnding(paragraph: IndexedStyleParagraph) {
  return paragraph.text.length >= 4
    && /[\p{L}\p{N}]/u.test(paragraph.text)
    && !/^(?:[-*_~]\s*){3,}$/u.test(paragraph.text)
}

function chapterNarrativeSummary(chapter: PmfChapter) {
  const paragraphs = indexedStyleParagraphs(chapter.content || chapter.title)
  if (!paragraphs.length) return ''
  const opening = paragraphs[0]
  const ending = [...paragraphs].reverse().find(usableStyleEnding)
    || paragraphs[paragraphs.length - 1]
  const openingText = excerpt(opening.text, 170)
  const endingText = tailExcerpt(ending.text, 170)
  return openingText === endingText
    ? openingText
    : `开篇：${openingText}；收束：${endingText}`
}

function currentManuscriptNarrativeSummary(manuscript: string) {
  const paragraphs = indexedStyleParagraphs(manuscript)
  const substantive = paragraphs.filter(paragraph => paragraph.text.length >= 24)
  if (!substantive.length) return ''
  const opening = substantive[0]
  const progression = substantive[Math.floor(substantive.length / 2)]
  const ending = [...paragraphs].reverse().find(usableStyleEnding)
    || substantive[substantive.length - 1]
  const parts = [
    `开篇：${excerpt(opening.text, 110)}`,
    progression.manuscriptParagraphIndex === opening.manuscriptParagraphIndex
      ? ''
      : `推进：${excerpt(progression.text, 110)}`,
    ending.manuscriptParagraphIndex === opening.manuscriptParagraphIndex
      || ending.manuscriptParagraphIndex === progression.manuscriptParagraphIndex
      ? ''
      : `当前收束：${tailExcerpt(ending.text, 110)}`,
  ].filter(Boolean)
  return parts.join('；')
}

function currentChapterNumber(input: CreatorDecisionContextAdapterInput) {
  if (input.chapterNumber && input.chapterNumber > 0) return input.chapterNumber
  const currentChapter = input.chapters.find(chapter => chapter.id === input.chapterId)
  return currentChapter?.chapter_no || null
}

function historicalChapterBelongsToContext(
  input: CreatorDecisionContextAdapterInput,
  chapter: PmfChapter,
) {
  const chapterNumber = currentChapterNumber(input)
  return chapter.work_id === input.workId
    && chapter.branch_id === input.branchId
    && chapter.id !== input.chapterId
    && (!chapterNumber || chapter.chapter_no < chapterNumber)
}

function linkedRequestBelongsToContext(input: CreatorDecisionContextAdapterInput) {
  return Boolean(
    input.linkedRequest
    && input.linkedRequest.work_id === input.workId
    && (
      input.linkedRequest.branch_id === null
      || input.linkedRequest.branch_id === input.branchId
    ),
  )
}

function eligibleManualRecallItems(input: CreatorDecisionContextAdapterInput) {
  const eligibleChapterIds = new Set(input.chapters
    .filter(chapter => historicalChapterBelongsToContext(input, chapter))
    .map(chapter => chapter.id))
  const eligibleAssetIds = new Set(input.settingAssets
    .filter(asset => (
      asset.workId === input.workId
      && (!asset.branchId || asset.branchId === input.branchId)
    ))
    .map(asset => asset.localAssetRef))
  const linkedRequestId = linkedRequestBelongsToContext(input)
    ? input.linkedRequest?.id || null
    : null

  return (input.manualRecallItems || []).filter(item => {
    if (item.locator.kind === 'canon') return true
    if (item.locator.kind === 'chapter') {
      return eligibleChapterIds.has(item.sourceId) || eligibleChapterIds.has(item.locator.targetId)
    }
    if (item.locator.kind === 'asset') {
      return eligibleAssetIds.has(item.sourceId) || eligibleAssetIds.has(item.locator.targetId)
    }
    return linkedRequestId !== null
      && (item.sourceId === linkedRequestId || item.locator.targetId === linkedRequestId)
  })
}

interface StyleEvidenceEntry {
  paragraph: IndexedStyleParagraph
  reason: string
  excerptMode: 'head' | 'tail'
}

function buildDistinctStyleEvidence(
  evidenceEntries: StyleEvidenceEntry[],
  sourceBlockId: (entry: StyleEvidenceEntry) => string,
) {
  const seenEvidence = new Set<string>()
  return evidenceEntries.flatMap(entry => {
    const text = entry.excerptMode === 'tail'
      ? tailExcerpt(entry.paragraph.text, 800)
      : excerpt(entry.paragraph.text, 800)
    const evidenceKey = `${entry.paragraph.manuscriptParagraphIndex}:${text}`
    if (seenEvidence.has(evidenceKey)) return []
    seenEvidence.add(evidenceKey)
    return [{
      sourceBlockId: sourceBlockId(entry),
      text,
      reason: entry.reason,
    }]
  })
}

function distributedManuscriptStyleParagraphs(manuscript: string) {
  const allParagraphs = indexedStyleParagraphs(manuscript)
  const substantiveParagraphs = allParagraphs.filter(paragraph => paragraph.text.length >= 24)
  if (!substantiveParagraphs.length) return []

  const opening = substantiveParagraphs[0]
  const progression = substantiveParagraphs[Math.floor(substantiveParagraphs.length / 2)]
  const ending = [...allParagraphs].reverse().find(usableStyleEnding)
    || substantiveParagraphs[substantiveParagraphs.length - 1]

  return buildDistinctStyleEvidence([
    { paragraph: opening, reason: '当前章节开篇的作者表达证据', excerptMode: 'head' },
    { paragraph: progression, reason: '当前章节推进段的作者表达证据', excerptMode: 'head' },
    { paragraph: ending, reason: '当前章节收束的作者表达证据', excerptMode: 'tail' },
  ], entry => (
    `manuscript-style:paragraph:${entry.paragraph.manuscriptParagraphIndex + 1}:${entry.excerptMode}`
  )).slice(0, 3)
}

function historicalChapterStyleSamples(chapters: PmfChapter[]) {
  return chapters.slice(0, 2).flatMap((chapter, chapterIndex) => {
    const allParagraphs = indexedStyleParagraphs(chapter.content)
    const substantiveParagraphs = allParagraphs.filter(paragraph => paragraph.text.length >= 24)
    const opening = substantiveParagraphs[0] || allParagraphs[0]
    const ending = [...allParagraphs].reverse().find(usableStyleEnding)
      || substantiveParagraphs[substantiveParagraphs.length - 1]
      || allParagraphs[allParagraphs.length - 1]
    if (!opening || !ending) return []

    const evidenceEntries = chapterIndex === 0
      ? [
          { paragraph: opening, reason: '最近入选正文章节的开篇表达证据', excerptMode: 'head' as const },
          { paragraph: ending, reason: '最近入选正文章节的收束表达证据', excerptMode: 'tail' as const },
        ]
      : [
          { paragraph: ending, reason: '次近入选正文章节的收束表达证据', excerptMode: 'tail' as const },
        ]

    return buildDistinctStyleEvidence(evidenceEntries, entry => (
      `chapter-style:${chapter.id}:paragraph:${entry.paragraph.manuscriptParagraphIndex + 1}:${entry.excerptMode}`
    ))
  }).slice(0, 3)
}

function styleSamples(
  input: CreatorDecisionContextAdapterInput,
  allowedHistoricalChapterIds: Set<string> | null,
) {
  const manuscriptParagraphs = distributedManuscriptStyleParagraphs(input.manuscript)
  if (manuscriptParagraphs.length) return manuscriptParagraphs
  const historicalChapters = input.chapters
    .filter(chapter => (
      chapter.work_id === input.workId
      && chapter.branch_id === input.branchId
      && chapter.content.trim()
      && (!allowedHistoricalChapterIds || allowedHistoricalChapterIds.has(chapter.id))
    ))
    .sort((left, right) => right.chapter_no - left.chapter_no)
  return historicalChapterStyleSamples(historicalChapters)
}

function buildRecentSceneSummaries(
  input: CreatorDecisionContextAdapterInput,
  recentChapters: PmfChapter[],
  canonCausal: Array<{ id: string; detail: string }>,
  manualRecallControlsHistoricalContext: boolean,
): CreationContextSource['recentSceneSummaries'] {
  const summaries: CreationContextSource['recentSceneSummaries'] = []
  const seenSceneIds = new Set<string>()
  const append = (
    sceneId: string,
    summary: string,
    relevanceReason: string,
    mechanismSignature?: CreationContextSource['recentSceneSummaries'][number]['mechanismSignature'],
  ) => {
    if (!sceneId || !summary.trim() || seenSceneIds.has(sceneId) || summaries.length >= 4) return
    seenSceneIds.add(sceneId)
    summaries.push(mechanismSignature
      ? { sceneId, summary, relevanceReason, mechanismSignature }
      : { sceneId, summary, relevanceReason })
  }

  const currentManuscriptSummary = currentManuscriptNarrativeSummary(input.manuscript)
  if (currentManuscriptSummary) {
    append(
      `current-manuscript:${input.chapterId}`,
      currentManuscriptSummary,
      '作者当前章节已写正文；只用于本轮续写的因果承接与重复检查，不代表新的正史提交',
    )
  }

  if (manualRecallControlsHistoricalContext) {
    for (const item of input.manualRecallItems || []) {
      if (item.group !== 'causal') continue
      const chapter = recentChapters.find(entry => (
        entry.id === item.sourceId || entry.id === item.locator.targetId
      ))
      if (chapter) {
        append(
          chapter.id,
          chapterNarrativeSummary(chapter),
          '作者手动选中的历史正文章节；只用于近期因果与重复检查，当前正史优先',
          item.sceneMechanismSignature,
        )
      } else {
        append(
          item.sourceId,
          headTailExcerpt(item.statement),
          '作者手动选中的历史快照；仅明确正史与收尾证据可作已发生事实',
          item.sceneMechanismSignature,
        )
      }
    }
    return summaries
  }

  const latestChapter = recentChapters[0]
  if (latestChapter) {
    append(
      latestChapter.id,
      chapterNarrativeSummary(latestChapter),
      latestChapter.id === input.chapterId ? '当前章节' : '同一分支最近的因果前置',
    )
  }
  for (const item of canonCausal) {
    append(
      `canon-causal:${item.id}`,
      item.detail,
      '本机正史中尚在施压的因果结果',
    )
  }
  for (const chapter of recentChapters.slice(1)) {
    append(chapter.id, chapterNarrativeSummary(chapter), '同一分支最近的因果前置')
  }
  return summaries
}

export function buildCreatorDecisionContextSource(
  input: CreatorDecisionContextAdapterInput,
): CreationContextSource {
  const manualRecallItems = eligibleManualRecallItems(input)
  const manualRecallControlsHistoricalContext = Array.isArray(input.manualRecallItems)
  const selectedAssetIds = new Set(manualRecallItems.flatMap(item => (
    item.locator.kind === 'asset'
      ? [item.sourceId, item.locator.targetId]
      : []
  )))
  const selectedHistoricalChapterIds = new Set(manualRecallItems.flatMap(item => (
    item.locator.kind === 'chapter' || item.locator.kind === 'canon'
      ? [item.sourceId, item.locator.targetId]
      : []
  )))
  const contextualSettingAssets = manualRecallControlsHistoricalContext
    ? input.settingAssets.filter(asset => selectedAssetIds.has(asset.localAssetRef))
    : input.settingAssets
  const characterAssets = contextualSettingAssets.filter(asset => resolveSettingAssetSemanticKind(asset) === 'character')
  const assetCharacters = characterAssets.map(asset => ({
    id: asset.localAssetRef,
    goal: asset.summary || input.intent.characterAgency.currentGoal,
    state: characterState(input, asset.localAssetRef),
    belief: asset.tags.filter(tag => tag.startsWith('信念:')).map(tag => tag.slice(3)),
    knowledge: asset.tags.filter(tag => tag.startsWith('已知:')).map(tag => tag.slice(3)),
    falseBeliefs: asset.tags.filter(tag => tag.startsWith('误信:')).map(tag => tag.slice(3)),
    emotionalState: asset.tags.find(tag => tag.startsWith('情绪:'))?.slice(3) || '未标注',
    resources: asset.tags.filter(tag => tag.startsWith('资源:')).map(tag => tag.slice(3)),
  }))
  const primaryActorId = input.intent.characterAgency.primaryActorId
  const primaryActor = assetCharacters.find(character => character.id === primaryActorId) || {
    id: primaryActorId,
    goal: input.intent.characterAgency.currentGoal,
    state: characterState(input, primaryActorId),
    belief: [],
    knowledge: input.intent.informationPolicy.readerShouldKnow,
    falseBeliefs: [],
    emotionalState: input.intent.readerExperience.startEmotion || '未标注',
    resources: [],
  }
  const activeCharacters = [
    primaryActor,
    ...assetCharacters.filter(character => character.id !== primaryActor.id),
  ]
  const ruleAssets = contextualSettingAssets.filter(asset => asset.kind === 'rule')
  const timelineAssets = contextualSettingAssets.filter(asset => resolveSettingAssetSemanticKind(asset) === 'timeline')
  const canonPromises = canonContinuityItems(input.canon, 'promises', 'status')
    .filter(item => item.status !== 'fulfilled')
  const canonForeshadowing = canonContinuityItems(input.canon, 'foreshadowing', 'status')
    .filter(item => item.status !== 'fulfilled')
  const canonTimeline = canonContinuityItems(input.canon, 'timeline', 'outcome')
    .slice(manualRecallControlsHistoricalContext ? -1 : -4)
  const canonCausal = canonContinuityItems(input.canon, 'causal', 'outcome').slice(-3)
  const recentChapters = input.chapters
    .filter(chapter => (
      historicalChapterBelongsToContext(input, chapter)
      && (
        !manualRecallControlsHistoricalContext
        || selectedHistoricalChapterIds.has(chapter.id)
      )
    ))
    .sort((left, right) => right.chapter_no - left.chapter_no)
    .slice(0, 3)
  const manifestBySource = new Map<string, CreationContextSource['manifest'][number]>()
  const baseManifest: CreationContextSource['manifest'] = [
    {
      sourceId: input.intent.id,
      sourceRevision: input.intent.revision,
      authority: 'author',
      includedReason: 'locked_author_intent',
    },
    ...(input.canon ? [{
      sourceId: input.canon.id,
      sourceRevision: input.canon.revision,
      authority: 'canon' as const,
      includedReason: 'current_local_canon',
    }] : []),
    ...contextualSettingAssets.map(asset => ({
      sourceId: asset.localAssetRef,
      sourceRevision: 1,
      authority: 'author' as const,
      includedReason: `local_writing_asset:${asset.kind}`,
    })),
    ...(linkedRequestBelongsToContext(input) && input.linkedRequest ? [{
      sourceId: input.linkedRequest.id,
      sourceRevision: 1,
      authority: 'derived' as const,
      includedReason: 'linked_external_echo',
    }] : []),
  ]
  for (const entry of baseManifest) manifestBySource.set(entry.sourceId, entry)
  for (const item of manualRecallItems) {
    manifestBySource.set(item.sourceId, {
      sourceId: item.sourceId,
      sourceRevision: item.sourceRevision,
      authority: item.authority,
      includedReason: `manual_recall:${item.group}`,
    })
  }

  return {
    canonRevision: input.canon?.revision || 0,
    kernelRevision: input.runtimeProjection?.kernelRevision || 0,
    constraintRevision: input.runtimeProjection?.constraintRevision || 0,
    activeCharacters,
    relevantRelationships: contextualSettingAssets
      .filter(asset => asset.kind === 'faction' || asset.tags.some(tag => tag.startsWith('关系:')))
      .map(asset => ({ id: asset.localAssetRef, title: asset.title, detail: assetText(asset) })),
    activePromises: [
      ...contextualSettingAssets
        .filter(asset => asset.tags.includes('承诺') || asset.tags.includes('待兑现'))
        .map(asset => ({ id: asset.localAssetRef, title: asset.title, detail: assetText(asset) })),
      ...canonPromises,
    ],
    unresolvedForeshadowing: [
      ...contextualSettingAssets
        .filter(asset => asset.tags.includes('伏笔') || asset.tags.includes('待回收'))
        .map(asset => ({ id: asset.localAssetRef, title: asset.title, detail: assetText(asset) })),
      ...canonForeshadowing,
    ],
    currentTimeline: input.runtimeProjection?.currentTimeline || [
      ...timelineAssets.map(asset => ({
        id: asset.localAssetRef,
        title: asset.title,
        detail: assetText(asset),
      })),
      ...canonTimeline,
    ],
    relevantWorldRules: ruleAssets.map(asset => ({
      id: asset.localAssetRef,
      title: asset.title,
      detail: assetText(asset),
    })),
    kernelRules: input.runtimeProjection?.kernelRules || [],
    hardConstraints: Array.from(new Set([
      ...(input.runtimeProjection?.hardConstraints || []),
      ...input.intent.boundaries.forbiddenEffects,
      ...input.intent.narrativeDelta.mustNotResolve,
    ])),
    relevantRegressionExamples: [],
    recentSceneSummaries: buildRecentSceneSummaries(
      input,
      recentChapters,
      canonCausal,
      manualRecallControlsHistoricalContext,
    ),
    styleSamples: styleSamples(
      input,
      manualRecallControlsHistoricalContext ? selectedHistoricalChapterIds : null,
    ),
    manualRecallItems,
    manifest: Array.from(manifestBySource.values()),
  }
}
