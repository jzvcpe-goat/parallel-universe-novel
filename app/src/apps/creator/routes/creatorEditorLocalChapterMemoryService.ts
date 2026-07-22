import type { PmfLocalDraft } from '@/features/pmf/types'
import { draftTextFromBlocks } from '@/features/creator-decision/sceneDrafting'
import type {
  AuthorIntentContract,
  CanonStatePatch,
  CreationSession,
  HistoricalStateBackfillProposal,
  LocalCanonStateRecord,
  ManualRecallGroup,
  ManualRecallItem,
  NarrativeCandidate,
  SceneMechanismSignature,
  StatePatchOperation,
} from '@/features/creator-decision/types'
import {
  readCreatorDecisionWorkspaceRecords,
  type CreatorDecisionRecordEnvelope,
} from '@/local-db/creatorLocalDecisionRepository'

export interface CreatorLocalChapterMemory {
  id: string
  sourceId: string
  sourceRevision: number
  workId: string
  branchId: string
  chapterId: string
  chapterNumber: number
  title: string
  statement: string
  sceneMechanismSignature?: SceneMechanismSignature
  stateRecallItems: CreatorLocalCanonRecallItem[]
  committedAt: string
}

export interface CreatorLocalCanonRecallItem extends ManualRecallItem {
  statePath: string
  recallStatus: 'active' | 'terminal'
}

function chapterNumberFromId(chapterId: string) {
  const match = chapterId.match(/:chapter:(\d+)$/u)
  return match ? Number(match[1]) : null
}

function compact(value: string, maximum: number) {
  const normalized = value.replace(/\s+/gu, ' ').trim()
  if (normalized.length <= maximum) return normalized
  return `${normalized.slice(0, maximum - 1)}…`
}

function compactTail(value: string, maximum: number) {
  const normalized = value.replace(/\s+/gu, ' ').trim()
  if (normalized.length <= maximum) return normalized
  return `…${normalized.slice(-(maximum - 1))}`
}

function stableId(value: string) {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash >>> 0).toString(36)
}

function pointerSegment(value: string) {
  return value.replace(/~/gu, '~0').replace(/\//gu, '~1')
}

function objectRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function operationRecallGroup(path: string): ManualRecallGroup | null {
  if (path.startsWith('/characters/')) return 'character_knowledge'
  if (path.startsWith('/timeline/')) return 'timeline'
  if (path.startsWith('/causal/')) return 'causal'
  if (path.startsWith('/promises/') || path.startsWith('/foreshadowing/')) return 'promise'
  return null
}

function operationStatement(operation: StatePatchOperation) {
  if (typeof operation.value === 'string') return operation.value
  if (operation.value && typeof operation.value === 'object' && !Array.isArray(operation.value)) {
    const value = operation.value as Record<string, unknown>
    if (typeof value.statement === 'string') return value.statement
    if (typeof value.status === 'string') return value.status
  }
  return operation.reason
}

function operationContinuityStatus(operation: StatePatchOperation) {
  if (!operation.value || typeof operation.value !== 'object' || Array.isArray(operation.value)) return null
  const status = (operation.value as Record<string, unknown>).status
  return typeof status === 'string' ? status.trim().toLowerCase() : null
}

function operationRecallStatus(
  group: ManualRecallGroup,
  operation: StatePatchOperation,
): CreatorLocalCanonRecallItem['recallStatus'] {
  if (operation.op === 'remove') return 'terminal'
  if (group === 'promise' && operationContinuityStatus(operation) === 'fulfilled') return 'terminal'
  return 'active'
}

function buildCanonTerminalRecallItems(input: {
  canon: LocalCanonStateRecord
  chapterNumber: number
}) {
  return (['promises', 'foreshadowing'] as const).flatMap<CreatorLocalCanonRecallItem>(root => {
    const collection = objectRecord(input.canon.state[root])
    if (!collection) return []
    return Object.entries(collection).flatMap<CreatorLocalCanonRecallItem>(([sourceId, rawEntry]) => {
      const entry = objectRecord(rawEntry)
      const rawStatus = entry?.status ?? rawEntry
      const statusValue = objectRecord(rawStatus)
      const status = typeof rawStatus === 'string'
        ? rawStatus.trim().toLowerCase()
        : typeof statusValue?.status === 'string'
          ? statusValue.status.trim().toLowerCase()
          : null
      if (status !== 'fulfilled') return []
      const path = `/${root}/${pointerSegment(sourceId)}/status`
      return [{
        id: `manual-recall:canon-terminal:${input.canon.id}:${stableId(path)}`,
        sourceId: input.canon.id,
        sourceRevision: input.canon.revision,
        authority: 'canon',
        group: 'promise',
        statement: '当前正史已兑现这条承诺或伏笔。',
        sourceLabel: `第 ${input.chapterNumber} 章 · 已兑现`,
        whyNow: '只用于阻止旧的未兑现状态重新进入召回。',
        locator: {
          kind: 'canon',
          targetId: input.canon.chapterId,
          label: `定位到本机第 ${input.chapterNumber} 章正史`,
        },
        statePath: path,
        recallStatus: 'terminal',
      }]
    })
  })
}

function recallCopy(group: ManualRecallGroup) {
  if (group === 'character_knowledge') return {
    label: '人物状态',
    whyNow: '核对人物当前所知、误信、身体、关系和已付代价，避免状态倒退。',
  }
  if (group === 'timeline') return {
    label: '时间线',
    whyNow: '这是正文已经推进的时间与位置结果，不能被下一章改写。',
  }
  if (group === 'causal') return {
    label: '因果结果',
    whyNow: '这是人物选择已经造成的后果，需要在后续场景继续施压。',
  }
  return {
    label: '承诺与伏笔',
    whyNow: '检查正文已经创建或推进的承诺与伏笔，避免遗忘或提前兑现。',
  }
}

function buildPatchRecallItems(input: {
  patch: CanonStatePatch | HistoricalStateBackfillProposal | null
  canon: LocalCanonStateRecord
  chapterNumber: number
}) {
  if (!input.patch || input.patch.status !== 'committed') return []
  return input.patch.operations.flatMap<CreatorLocalCanonRecallItem>(operation => {
    const group = operationRecallGroup(operation.path)
    if (!group) return []
    const copy = recallCopy(group)
    return [{
      id: `manual-recall:canon-state:${input.patch!.id}:${stableId(operation.path)}`,
      sourceId: input.patch!.id,
      sourceRevision: input.canon.revision,
      authority: 'canon',
      group,
      statement: compact([operationStatement(operation), operation.reason].filter(Boolean).join('；'), 360),
      sourceLabel: `第 ${input.chapterNumber} 章 · ${copy.label}`,
      whyNow: copy.whyNow,
      locator: {
        kind: 'canon',
        targetId: input.canon.chapterId,
        label: `定位到本机第 ${input.chapterNumber} 章正史`,
      },
      statePath: operation.path,
      recallStatus: operationRecallStatus(group, operation),
    }]
  })
}

function buildChapterStateRecallItems(input: {
  patches: Array<CanonStatePatch | HistoricalStateBackfillProposal>
  canon: LocalCanonStateRecord
  chapterNumber: number
}) {
  const latestByPath = new Map<string, CreatorLocalCanonRecallItem>()
  for (const patch of input.patches) {
    for (const item of buildPatchRecallItems({ ...input, patch })) {
      latestByPath.set(item.statePath, item)
    }
  }
  for (const item of buildCanonTerminalRecallItems(input)) {
    latestByPath.set(item.statePath, item)
  }
  return [...latestByPath.values()]
}

function recordsFor<T>(records: CreatorDecisionRecordEnvelope[], family: CreatorDecisionRecordEnvelope['family']) {
  return records.filter(record => record.family === family).map(record => record.value as T)
}

function latestIntent(intents: AuthorIntentContract[], sessionId: string) {
  return intents
    .filter(intent => intent.sessionId === sessionId && intent.status !== 'superseded')
    .sort((left, right) => right.revision - left.revision)[0] || null
}

function selectedCandidate(candidates: NarrativeCandidate[], session: CreationSession) {
  return candidates
    .filter(candidate => candidate.sessionId === session.id && candidate.id === session.selectedCandidateId)
    .sort((left, right) => right.revision - left.revision)[0] || null
}

function validIntentChange(value: string | undefined) {
  if (!value || /必须(?:不能|不得|不要|暂不)/u.test(value)) return ''
  return value
}

function normalizedIntentChoice(value: string | undefined) {
  const valid = validIntentChange(value)
  const wrapped = valid.match(/^([^，。；]{1,24})必须([\s\S]+)$/u)
  if (!wrapped) return valid
  const [, actor, remainder] = wrapped
  const containsCompleteActorAction = remainder.includes(actor)
    || /(?:^|[，。；])(?:他|她)(?:主动|拒绝|选择|决定|坚持|放弃|接受|要求|改为)/u.test(remainder)
  return containsCompleteActorAction ? remainder : valid
}

function normalizedUnresolvedPromise(value: string) {
  return value.replace(/^揭晓(?:解释|说明)/u, '解释')
}

function committedRecallSummary(
  items: CreatorLocalCanonRecallItem[],
  group: ManualRecallGroup,
) {
  const statements = [...new Set(items
    .filter(item => item.group === group && item.recallStatus === 'active')
    .map(item => item.statement.trim())
    .filter(Boolean))]
  return compact(statements.slice(0, 2).join('；'), 120)
}

function committedPatchOperationSummary(
  patches: Array<CanonStatePatch | HistoricalStateBackfillProposal>,
  pathSuffix: string,
  maximum: number,
) {
  const latestByPath = new Map<string, StatePatchOperation>()
  for (const patch of patches) {
    if (patch.status !== 'committed') continue
    for (const operation of patch.operations) latestByPath.set(operation.path, operation)
  }
  const statements = [...latestByPath.values()]
    .filter(operation => operation.op !== 'remove' && operation.path.endsWith(pathSuffix))
    .map(operationStatement)
    .map(statement => statement.trim())
    .filter(Boolean)
  return compact([...new Set(statements)].slice(0, 2).join('；'), maximum)
}

function buildMemoryStatement(input: {
  canon: LocalCanonStateRecord
  intent: AuthorIntentContract | null
  patches: Array<CanonStatePatch | HistoricalStateBackfillProposal>
  stateRecallItems: CreatorLocalCanonRecallItem[]
}) {
  const body = draftTextFromBlocks(input.canon.acceptedContentBlocks)
  const endingEvidence = body.slice(Math.max(0, body.length - 360))
  const endingCondition = validIntentChange(input.intent?.narrativeDelta.endingCondition)
  const requiredChoice = normalizedIntentChoice(input.intent?.characterAgency.requiredChoice)
  const committedChoice = committedPatchOperationSummary(input.patches, '/recentChoice', 140)
  const committedCost = committedPatchOperationSummary(input.patches, '/paidCost', 100)
  const committedConsequences = committedRecallSummary(input.stateRecallItems, 'causal')
  const committedPromises = committedRecallSummary(input.stateRecallItems, 'promise')
  const continuity = [
    '历史快照：只表示当章结束状态，当前有效状态以最新正史为准',
    input.intent?.narrativeDelta.startingCondition
      ? `当章锁定起点（创作约束）：${compact(input.intent.narrativeDelta.startingCondition, 70)}`
      : '',
    endingCondition
      ? `当章锁定变化（创作约束）：${compact(endingCondition, 110)}`
      : '',
    committedChoice
      ? `当章正史人物选择：${committedChoice}`
      : requiredChoice
        ? `当章锁定人物选择（创作约束）：${compact(requiredChoice, 140)}`
        : '',
    committedCost
      ? `当章正史代价：${committedCost}`
      : input.intent?.characterAgency.expectedCost
        ? `当章预期代价（创作约束）：${compact(input.intent.characterAgency.expectedCost, 90)}`
        : '',
    committedConsequences
      ? `当章正史后果：${committedConsequences}`
      : '',
    committedPromises
      ? `当章正史承诺：${committedPromises}`
      : '',
    input.intent?.narrativeDelta.mustNotResolve.length
      ? `当章未解决约束（创作约束）：${compact(input.intent.narrativeDelta.mustNotResolve.map(normalizedUnresolvedPromise).join('；'), 110)}`
      : '',
  ].filter(Boolean)
  const continuitySummary = compact(continuity.join('。'), 700)
  const endingSummary = endingEvidence ? `当章收尾证据：${compactTail(endingEvidence, 180)}` : ''
  return [continuitySummary, endingSummary].filter(Boolean).join('。')
}

export function buildCreatorLocalChapterMemories(input: {
  records: CreatorDecisionRecordEnvelope[]
  drafts: PmfLocalDraft[]
  workId: string
  branchId: string
}) {
  const sessions = recordsFor<CreationSession>(input.records, 'creationSessions')
    .filter(session => (
      session.phase === 'canon_committed'
      && session.workId === input.workId
      && session.branchId === input.branchId
    ))
  const intents = recordsFor<AuthorIntentContract>(input.records, 'authorIntents')
  const candidates = recordsFor<NarrativeCandidate>(input.records, 'narrativeCandidates')
  const canons = recordsFor<LocalCanonStateRecord>(input.records, 'localCanonStates')
  const patchRecords = recordsFor<CanonStatePatch | HistoricalStateBackfillProposal>(
    input.records,
    'canonPatches',
  )
  const patches = patchRecords.filter(
    (record): record is CanonStatePatch => record.schemaVersion === 'canon-state-patch.v1',
  )
  const committedHistoricalBackfills = patchRecords.filter(
    (record): record is HistoricalStateBackfillProposal => (
      record.schemaVersion === 'historical-state-backfill.v1'
      && record.status === 'committed'
    ),
  )
  const canonByChapter = new Map(canons.map(canon => [canon.chapterId, canon]))
  const patchById = new Map(patches.map(patch => [patch.id, patch]))
  const historicalBackfillsByCanon = new Map<string, HistoricalStateBackfillProposal[]>()
  for (const backfill of committedHistoricalBackfills) {
    const current = historicalBackfillsByCanon.get(backfill.canonId) || []
    current.push(backfill)
    current.sort((left, right) => (
      (left.committedAt || left.createdAt).localeCompare(right.committedAt || right.createdAt)
    ))
    historicalBackfillsByCanon.set(backfill.canonId, current)
  }

  const committed = sessions
    .map(session => ({ session, canon: canonByChapter.get(session.chapterId) || null }))
    .filter((value): value is { session: CreationSession; canon: LocalCanonStateRecord } => Boolean(value.canon))
    .sort((left, right) => {
      const leftNumber = chapterNumberFromId(left.session.chapterId)
      const rightNumber = chapterNumberFromId(right.session.chapterId)
      if (leftNumber && rightNumber && leftNumber !== rightNumber) return leftNumber - rightNumber
      return left.canon.committedAt.localeCompare(right.canon.committedAt)
    })

  return committed.map<CreatorLocalChapterMemory>((entry, index) => {
    const chapterNumber = chapterNumberFromId(entry.session.chapterId) || index + 1
    const acceptedText = draftTextFromBlocks(entry.canon.acceptedContentBlocks)
    const matchingDraft = input.drafts.find(draft => (
      draft.workId === input.workId
      && draft.branchId === input.branchId
      && draft.chapterNumber === chapterNumber
    )) || input.drafts.find(draft => (
      draft.workId === input.workId
      && draft.branchId === input.branchId
      && draft.content === acceptedText
    ))
    const intent = latestIntent(intents, entry.session.id)
    const candidate = selectedCandidate(candidates, entry.session)
    const chapterPatches = [
      ...(entry.canon.committedPatchId && patchById.has(entry.canon.committedPatchId)
        ? [patchById.get(entry.canon.committedPatchId)!]
        : []),
      ...(historicalBackfillsByCanon.get(entry.canon.id) || []),
    ]
    const stateRecallItems = buildChapterStateRecallItems({
      patches: chapterPatches,
      canon: entry.canon,
      chapterNumber,
    })
    return {
      id: `local-chapter-memory:${entry.session.id}`,
      sourceId: entry.canon.id,
      sourceRevision: entry.canon.revision,
      workId: entry.session.workId,
      branchId: entry.session.branchId,
      chapterId: entry.session.chapterId,
      chapterNumber,
      title: matchingDraft?.title.trim() || `第 ${chapterNumber} 章`,
      statement: buildMemoryStatement({
        canon: entry.canon,
        intent,
        patches: chapterPatches,
        stateRecallItems,
      }),
      sceneMechanismSignature: candidate?.mechanismSignature,
      stateRecallItems,
      committedAt: entry.canon.committedAt,
    }
  })
}

export async function readCreatorLocalChapterMemories(input: {
  drafts: PmfLocalDraft[]
  workId: string
  branchId: string
}) {
  if (!input.workId || !input.branchId) return []
  return buildCreatorLocalChapterMemories({
    ...input,
    records: await readCreatorDecisionWorkspaceRecords(),
  })
}
