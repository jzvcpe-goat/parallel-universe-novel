import { readerWishTypeLabel, workTitleForId } from '../creatorViewHelpers'
import type {
  PmfBranch,
  PmfChapter,
  PmfReaderRequest,
  PmfWork,
} from '@/features/pmf/types'
import { compactExcerpt } from './creatorEditorSessionViewModels'
import type {
  AuthorIntentContract,
  CanonStatePatch,
  CreationSession,
  LiteraryFinding,
  LiteraryReview,
  NarrativeCandidate,
} from '@/features/creator-decision/types'

export type PublishMode = 'main' | 'if'
export type WritingGuideStep = 'intent' | 'scene' | 'draft' | 'memory' | 'publish'
export type ChapterDirectionId = 'pressure' | 'reveal' | 'branch'

export function workTitleFromMap(workId: string, works: Map<string, PmfWork>) {
  return works.get(workId)?.title || workTitleForId(workId)
}

export function draftTitleFromRequest(
  request: PmfReaderRequest,
  branches: PmfBranch[],
  chapters: PmfChapter[],
) {
  const requestBranch = request.branch_id
    ? branches.find(branch => branch.id === request.branch_id) || null
    : null
  if (requestBranch && requestBranch.branch_type !== 'main' && requestBranch.title.trim()) {
    return requestBranch.title.trim()
  }

  const requestChapter = request.chapter_id
    ? chapters.find(chapter => chapter.id === request.chapter_id) || null
    : null
  if (request.request_type === 'next_chapter' && requestChapter?.title.trim()) {
    return `${requestChapter.title.trim()}之后`
  }

  const cleaned = request.request_text
    .replace(/^想看/, '')
    .replace(/^下一章想看/, '')
    .replace(/[。！？!?].*$/, '')
    .trim()
  return compactExcerpt(cleaned, readerWishTypeLabel(request.request_type))
}

export function chapterDirectionLabel(direction: ChapterDirectionId) {
  const labels: Record<ChapterDirectionId, string> = {
    pressure: '压力推进',
    reveal: '揭示推进',
    branch: '分线推进',
  }
  return labels[direction]
}

const decisionPhaseOrder = ['intent', 'path', 'writing', 'review', 'canon'] as const

export type CreatorDecisionPhaseId = typeof decisionPhaseOrder[number]

export function buildCreatorDecisionPhaseViewModel(session: CreationSession | null) {
  const activePhase: CreatorDecisionPhaseId = !session || session.phase === 'intent_discovery'
    ? 'intent'
    : session.phase === 'intent_locked' || session.phase === 'candidate_search' || session.phase === 'candidate_selected'
      ? 'path'
      : session.phase === 'drafting'
        ? 'writing'
        : session.phase === 'reviewing'
          ? 'review'
          : 'canon'
  const activeIndex = decisionPhaseOrder.indexOf(activePhase)
  const labels: Record<CreatorDecisionPhaseId, string> = {
    intent: '意图',
    path: '路径',
    writing: '写作',
    review: '审阅',
    canon: '正史',
  }
  return {
    activePhase,
    items: decisionPhaseOrder.map((id, index) => ({
      id,
      label: labels[id],
      state: index < activeIndex ? 'complete' as const : index === activeIndex ? 'active' as const : 'upcoming' as const,
    })),
  }
}

export function buildAuthorIntentSummary(intent: AuthorIntentContract | null) {
  if (!intent) return null
  return {
    statusLabel: intent.status === 'locked' ? '已锁定' : '待确认',
    targetEmotion: intent.readerExperience.targetEmotion || '等待作者判断',
    mustChange: intent.narrativeDelta.mustChange || '等待作者判断',
    actorChoice: intent.characterAgency.requiredChoice || '等待作者判断',
    informationBoundary: [
      ...intent.informationPolicy.charactersMustNotKnow.map(item => `${item.characterId}暂不能知道：${item.information}`),
      ...intent.informationPolicy.delayedReveals.map(item => `延后揭示：${item}`),
    ],
    assumptions: intent.agentAssumptions,
    revision: intent.revision,
  }
}

export function buildNarrativeCandidateCards(
  candidates: NarrativeCandidate[],
  selectedCandidateId: string | null,
) {
  return candidates.map(candidate => ({
    id: candidate.id,
    title: candidate.title,
    mechanism: candidate.oneSentenceMechanism,
    agency: candidate.beats[0]?.action || candidate.oneSentenceMechanism,
    irreversibleCost: candidate.projectedEffects.irreversibleChanges[0] || '没有声明不可逆变化',
    informationStrategy: candidate.strategyAxes.informationMode,
    futureDebt: candidate.projectedEffects.futureDebts[0] || '没有新增剧情债务',
    risks: candidate.tradeoffs.risks,
    beatCount: candidate.beats.length,
    selected: candidate.id === selectedCandidateId,
  }))
}

const findingGroupLabels = {
  hard_block: '必须修复',
  revision_candidate: '值得修改',
  taste_note: '审美选择',
  preserve: '建议保护',
} as const

export function groupLiteraryFindings(review: LiteraryReview | null) {
  const findings = review?.findings.filter(finding => finding.status === 'active') || []
  return (Object.keys(findingGroupLabels) as Array<keyof typeof findingGroupLabels>).map(severity => ({
    severity,
    label: findingGroupLabels[severity],
    findings: findings.filter(finding => finding.severity === severity),
  })).filter(group => group.findings.length > 0)
}

export function literaryDimensionLabel(dimension: LiteraryFinding['dimension']) {
  const labels: Record<LiteraryFinding['dimension'], string> = {
    continuity: '连续性',
    tension: '张力',
    information_control: '信息控制',
    character_agency: '人物能动性',
    voice: '表达节奏',
    freshness: '表达新鲜度',
    genre_fulfillment: '类型承诺',
    repetition: '重复',
    exposition: '解释过载',
    scene_detail: '现场细节',
    pacing: '推进节奏',
  }
  return labels[dimension]
}

export function buildCanonDiffViewModel(patch: CanonStatePatch | null) {
  if (!patch) return []
  const operationLabels: Record<CanonStatePatch['operations'][number]['op'], string> = {
    add: '新增',
    replace: '更新',
    remove: '移除',
  }
  return patch.operations.map((operation, index) => ({
    id: `${patch.id}:${index}`,
    operation: operationLabels[operation.op],
    path: operation.path,
    before: 'expectedPreviousValue' in operation ? JSON.stringify(operation.expectedPreviousValue) : '未记录',
    after: operation.op === 'remove' ? '移除' : JSON.stringify(operation.value),
    reason: operation.reason,
    evidenceCount: operation.evidenceBlockIds.length,
    irreversible: operation.irreversible,
  }))
}
