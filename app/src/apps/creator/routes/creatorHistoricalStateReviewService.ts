import { historicalStateBackfillProposalSchema } from '@/features/creator-decision/schemas'
import { validateHistoricalStateBackfillCommit } from '@/features/creator-decision/historicalStateBackfill'
import type {
  CreationDecisionRepository,
  HistoricalStateBackfillProposal,
  LocalCanonStateRecord,
  StatePatchOperation,
} from '@/features/creator-decision/types'

const dimensionLabels: Record<string, string> = {
  location: '所在位置',
  timePosition: '所处时间',
  physicalCondition: '身体状态',
  emotionalState: '情绪状态',
  dominantDesire: '核心欲望',
  immediateGoal: '眼前目标',
  currentIntent: '当前意图',
  fear: '恐惧',
  woundTrigger: '创伤触发',
  defenseStrategy: '防御方式',
  beliefs: '当前信念',
  falseBeliefs: '错误信念',
  knowledge: '人物所知',
  secrets: '掌握秘密',
  resources: '可用资源',
  capabilities: '当前能力',
  limitations: '行动限制',
  relationshipStances: '关系立场',
  trust: '信任变化',
  obligations: '责任与约束',
  recentChoice: '近期选择',
  paidCost: '已付代价',
}

const rootLabels: Record<string, string> = {
  timeline: '时间与位置',
  causal: '因果结果',
  promises: '未兑现承诺',
  foreshadowing: '伏笔进度',
}

export interface CreatorHistoricalStateOperationReview {
  id: string
  label: string
  reason: string
  valueSummary: string
  evidenceQuotes: string[]
  irreversible: boolean
}

export interface CreatorHistoricalStateReviewItem {
  proposal: HistoricalStateBackfillProposal
  chapterNumber: number | null
  operationReviews: CreatorHistoricalStateOperationReview[]
  canConfirm: boolean
  blockingNotice: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function candidateValues(value: unknown): unknown[] {
  const direct = historicalStateBackfillProposalSchema.safeParse(value)
  if (direct.success) return [direct.data]
  if (Array.isArray(value)) return value
  if (!isRecord(value)) return []
  if (Array.isArray(value.proposals)) return value.proposals
  return value.proposal ? [value.proposal] : []
}

export function parseHistoricalStateBackfillImports(values: unknown[]) {
  const proposals = values.flatMap(candidateValues).map(value => (
    historicalStateBackfillProposalSchema.parse(value)
  ))
  const unique = new Map<string, HistoricalStateBackfillProposal>()
  for (const proposal of proposals) {
    if (proposal.status !== 'proposed') {
      throw new Error('Only pending historical state candidates can be imported.')
    }
    unique.set(proposal.id, proposal)
  }
  if (!unique.size) throw new Error('No historical state candidates were found.')
  return [...unique.values()]
}

function chapterNumberFromId(chapterId: string) {
  const match = /:chapter:(\d+)$/.exec(chapterId)
  return match ? Number(match[1]) : null
}

function operationLabel(operation: StatePatchOperation) {
  const segments = operation.path.split('/').filter(Boolean)
  if (segments[0] === 'characters' && segments.length >= 3) {
    return `人物 · ${dimensionLabels[segments[2]] || '状态变化'}`
  }
  return rootLabels[segments[0]] || operation.path
}

function valueSummary(value: unknown) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(item => String(item)).join('；')
  if (value === undefined) return '移除当前记录'
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function blockingNotice(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('canon changed') || message.includes('canon revision')) {
    return '本机正史已变化，需要重新生成这条候选。'
  }
  if (message.includes('manuscript no longer matches') || message.includes('draft revision')) {
    return '历史正文已经变化，需要重新定位证据。'
  }
  return '这条候选暂时不能确认，请重新检查正文证据。'
}

export function buildHistoricalStateReviewItem(
  proposal: HistoricalStateBackfillProposal,
  canon: LocalCanonStateRecord | null,
): CreatorHistoricalStateReviewItem {
  const blockById = new Map(canon?.acceptedContentBlocks.map(block => [block.id, block.text]) || [])
  const operationReviews = proposal.operations.map((operation, index) => ({
    id: `${proposal.id}:operation:${index}`,
    label: operationLabel(operation),
    reason: operation.reason,
    valueSummary: valueSummary(operation.value),
    evidenceQuotes: operation.evidenceBlockIds
      .map(blockId => blockById.get(blockId))
      .filter((quote): quote is string => Boolean(quote)),
    irreversible: operation.irreversible,
  }))
  try {
    validateHistoricalStateBackfillCommit({
      proposal,
      currentCanon: canon,
      authorConfirmed: true,
      confirmedAt: new Date(0).toISOString(),
    })
    return {
      proposal,
      chapterNumber: chapterNumberFromId(proposal.chapterId),
      operationReviews,
      canConfirm: true,
      blockingNotice: null,
    }
  } catch (error) {
    return {
      proposal,
      chapterNumber: chapterNumberFromId(proposal.chapterId),
      operationReviews,
      canConfirm: false,
      blockingNotice: blockingNotice(error),
    }
  }
}

export async function buildHistoricalStateReviewItems(input: {
  proposals: HistoricalStateBackfillProposal[]
  repository: CreationDecisionRepository
}) {
  const items = await Promise.all(input.proposals.map(async proposal => {
    const canon = await input.repository.loadCanonState(proposal.workId, proposal.chapterId)
    return buildHistoricalStateReviewItem(proposal, canon)
  }))
  return items.sort((left, right) => (
    (left.chapterNumber || Number.MAX_SAFE_INTEGER) - (right.chapterNumber || Number.MAX_SAFE_INTEGER)
  ))
}
