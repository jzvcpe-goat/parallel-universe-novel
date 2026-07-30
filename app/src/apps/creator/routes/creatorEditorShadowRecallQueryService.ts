import type {
  AuthorIntentContract,
  ManualRecallGroup,
} from '@/features/creator-decision/types'
import type { CreatorRagRetrievalQuery } from '@/integrations/creator-rag/creatorLanceDbRetriever'
import type {
  CreatorShadowRecallProposal,
  CreatorShadowRecallService,
} from '@/integrations/creator-rag/creatorShadowRecallService'

export interface CreatorRecallNeedQuery {
  group: ManualRecallGroup
  reason: string
  retrievalQuery: CreatorRagRetrievalQuery
}

export interface CreatorShadowRecallBatch {
  schemaVersion: 'creator-shadow-recall-batch.v1'
  status: 'shadow_only'
  groups: Array<{
    group: ManualRecallGroup
    reason: string
    proposal: CreatorShadowRecallProposal
  }>
  crossGroupFusionPerformed: false
  automaticSelectionApplied: false
}

const recallGroupOrder: ManualRecallGroup[] = [
  'causal',
  'character_knowledge',
  'timeline',
  'promise',
]

function queryText(parts: Array<string | null | undefined>) {
  return parts
    .map(part => part?.replace(/\s+/g, ' ').trim())
    .filter((part): part is string => Boolean(part))
    .join('\n')
}

function groupQueryText(input: {
  group: ManualRecallGroup
  authorPrompt: string
  intent: AuthorIntentContract
  currentChapterNo: number
}) {
  const { intent } = input
  if (input.group === 'causal') {
    return queryText([
      `作者当前问题：${input.authorPrompt}`,
      `本章行动者：${intent.characterAgency.primaryActorId}`,
      `当前目标：${intent.characterAgency.currentGoal}`,
      `必须作出的选择：${intent.characterAgency.requiredChoice}`,
      `预期代价：${intent.characterAgency.expectedCost}`,
      `本章必须发生的变化：${intent.narrativeDelta.mustChange}`,
      `寻找此前已经成立、会约束上述行动或代价的因果。`,
    ])
  }
  if (input.group === 'character_knowledge') {
    return queryText([
      `作者当前问题：${input.authorPrompt}`,
      `重点人物：${intent.characterAgency.primaryActorId}`,
      `当前目标：${intent.characterAgency.currentGoal}`,
      ...intent.informationPolicy.charactersMustNotKnow.map(item => (
        `${item.characterId} 不得提前知道：${item.information}`
      )),
      ...intent.informationPolicy.delayedReveals.map(item => `延迟揭示：${item}`),
      `寻找人物已经知道、误信、隐瞒或尚未知晓的既有证据。`,
    ])
  }
  if (input.group === 'timeline') {
    return queryText([
      `作者当前问题：${input.authorPrompt}`,
      `当前写作章：第 ${input.currentChapterNo} 章`,
      `起始状态：${intent.narrativeDelta.startingCondition}`,
      `目标结束状态：${intent.narrativeDelta.endingCondition}`,
      `寻找当前时间、地点、先后顺序、持续时长和移动限制的既有证据。`,
    ])
  }
  return queryText([
    `作者当前问题：${input.authorPrompt}`,
    ...intent.informationPolicy.readerShouldKnow.map(item => `读者已知：${item}`),
    ...intent.informationPolicy.readerShouldSuspect.map(item => `读者应怀疑：${item}`),
    ...intent.informationPolicy.delayedReveals.map(item => `延迟揭示：${item}`),
    ...intent.narrativeDelta.mustNotResolve.map(item => `本章不得解决：${item}`),
    `寻找尚未兑现的承诺、伏笔、疑问和已经建立的读者期待。`,
  ])
}

export function buildCreatorRecallNeedQueries(input: {
  authorPrompt: string
  intent: AuthorIntentContract
  workId: string
  branchId: string
  currentChapterNo: number
  groups: ManualRecallGroup[]
  manualSelectedSourceIds?: string[]
  limitPerGroup?: number
}): CreatorRecallNeedQuery[] {
  const authorPrompt = input.authorPrompt.replace(/\s+/g, ' ').trim()
  if (!authorPrompt) throw new Error('Creator recall query requires the author current prompt')
  if (input.intent.status !== 'locked') throw new Error('Creator recall query requires a locked author intent')
  if (!Number.isInteger(input.currentChapterNo) || input.currentChapterNo < 1) {
    throw new Error('Creator recall query currentChapterNo must be a positive integer')
  }
  const groups = [...new Set(input.groups)]
  if (!groups.length) throw new Error('Creator recall query requires at least one memory group')
  if (groups.length !== input.groups.length) throw new Error('Creator recall query contains duplicate memory groups')
  const unknownGroup = groups.find(group => !recallGroupOrder.includes(group))
  if (unknownGroup) throw new Error(`Creator recall query has an unsupported memory group: ${unknownGroup}`)
  const limit = input.limitPerGroup ?? 5
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
    throw new Error('Creator recall query limitPerGroup must be between 1 and 10')
  }

  return [...groups]
    .sort((left, right) => recallGroupOrder.indexOf(left) - recallGroupOrder.indexOf(right))
    .map(group => ({
      group,
      reason: group === 'causal'
        ? '承接已经发生的行动与代价'
        : group === 'character_knowledge'
          ? '限制人物所知、误信和延迟揭示'
          : group === 'timeline'
            ? '固定时间、地点与事件顺序'
            : '保留尚未兑现的承诺和伏笔',
      retrievalQuery: {
        text: groupQueryText({
          group,
          authorPrompt,
          intent: input.intent,
          currentChapterNo: input.currentChapterNo,
        }),
        workId: input.workId,
        branchId: input.branchId,
        currentChapterNo: input.currentChapterNo,
        allowedMemoryGroups: [group],
        manualSelectedSourceIds: input.manualSelectedSourceIds,
        limit,
      },
    }))
}

export async function proposeCreatorShadowRecallBatch(input: {
  service: CreatorShadowRecallService
  queries: CreatorRecallNeedQuery[]
}): Promise<CreatorShadowRecallBatch> {
  if (!input.queries.length) throw new Error('Creator shadow recall batch requires at least one query')
  const groups = []
  for (const query of input.queries) {
    const proposal = await input.service.propose(query.retrievalQuery)
    if (
      proposal.status !== 'shadow_only'
      || proposal.automaticSelectionApplied
      || proposal.workId !== query.retrievalQuery.workId
      || proposal.branchId !== query.retrievalQuery.branchId
      || proposal.currentChapterNo !== query.retrievalQuery.currentChapterNo
    ) {
      throw new Error(`Creator shadow recall batch received an invalid ${query.group} proposal`)
    }
    groups.push({ group: query.group, reason: query.reason, proposal })
  }
  return {
    schemaVersion: 'creator-shadow-recall-batch.v1',
    status: 'shadow_only',
    groups,
    crossGroupFusionPerformed: false,
    automaticSelectionApplied: false,
  }
}
