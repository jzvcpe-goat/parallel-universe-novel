import type {
  ContextSnapshot,
  CreationSession,
  CreatorWritingAssistPreferences,
  LiteraryDimension,
  SceneDraftResult,
  WritingAssistLensId,
  WritingAssistRecommendation,
  WritingAssistRecommendationReasonCode,
} from './types'
import { advisoryLensIds, literaryDimensions } from './types'

export const DEFAULT_CREATOR_WRITING_ASSIST_PREFERENCES: CreatorWritingAssistPreferences = {
  schemaVersion: 'creator-writing-assist-preferences.v1',
  enabled: false,
  selectionMode: 'recommended',
  projectLensIds: [],
  triggerPolicy: 'natural_checkpoints_only',
  suppressedLensIds: [],
}

const literaryDimensionSet = new Set<string>(literaryDimensions)
const advisoryLensIdSet = new Set<string>(advisoryLensIds)

const kernelSignals: Array<{ dimension: LiteraryDimension; signal: RegExp }> = [
  { dimension: 'continuity', signal: /(因果|连续|前后|承接|回收)/u },
  { dimension: 'information_control', signal: /(信息|秘密|揭示|悬念|知情|误解)/u },
  { dimension: 'character_agency', signal: /(选择|主动|行动|代价|决断)/u },
  { dimension: 'tension', signal: /(张力|冲突|压力|对抗|危机)/u },
  { dimension: 'pacing', signal: /(节奏|推进|加速|停顿|紧凑)/u },
  { dimension: 'genre_fulfillment', signal: /(题材|类型|冒险|悬疑|恋爱|战斗|成长)/u },
  { dimension: 'voice', signal: /(声线|文风|语气|叙述距离)/u },
  { dimension: 'freshness', signal: /(新鲜|套路|模板|机制变奏)/u },
  { dimension: 'repetition', signal: /(重复|复述|同构)/u },
  { dimension: 'exposition', signal: /(解释|说明|设定交代)/u },
  { dimension: 'scene_detail', signal: /(场景|现场|感官|空间)/u },
]

export function isLiteraryDimension(value: WritingAssistLensId): value is LiteraryDimension {
  return literaryDimensionSet.has(value)
}

export function isAdvisoryLensId(value: WritingAssistLensId): value is typeof advisoryLensIds[number] {
  return advisoryLensIdSet.has(value)
}

function unique<T>(items: T[]) {
  return [...new Set(items)]
}

function recallDimensions(context: ContextSnapshot): LiteraryDimension[] {
  const groups = new Set(context.manualRecallItems.map(item => item.group))
  const dimensions: LiteraryDimension[] = []
  if (groups.has('causal') || groups.has('promise') || groups.has('timeline')) {
    dimensions.push('continuity')
  }
  if (groups.has('character_knowledge')) dimensions.push('information_control')
  return dimensions
}

function kernelDimensions(context: ContextSnapshot): LiteraryDimension[] {
  const rules = context.kernelRules.join('\n')
  if (!rules.trim()) return []
  return kernelSignals
    .filter(item => item.signal.test(rules))
    .map(item => item.dimension)
}

export function recommendWritingAssistLenses(input: {
  preferences: CreatorWritingAssistPreferences
  session: CreationSession
  context: ContextSnapshot
  draft: SceneDraftResult
  explicitFocusLensIds?: WritingAssistLensId[]
  generatedAt?: string
}): WritingAssistRecommendation | null {
  if (!input.preferences.enabled) return null

  const suppressed = new Set(input.preferences.suppressedLensIds)
  const candidates: WritingAssistLensId[] = []
  const reasonByLens = new Map<WritingAssistLensId, WritingAssistRecommendationReasonCode[]>()
  const append = (
    lensIds: WritingAssistLensId[],
    reason: WritingAssistRecommendationReasonCode,
  ) => {
    candidates.push(...lensIds)
    for (const lensId of lensIds) {
      reasonByLens.set(lensId, unique([...(reasonByLens.get(lensId) || []), reason]))
    }
  }

  if (input.preferences.selectionMode === 'custom') {
    append(
      input.preferences.projectLensIds,
      'project_custom_selection',
    )
  } else {
    const explicit = (input.explicitFocusLensIds || []).filter(isLiteraryDimension)
    if (explicit.length) {
      append(explicit, 'author_explicit_focus')
    } else {
      const recalls = recallDimensions(input.context)
      append(recalls, 'manual_recall_active')
      const kernel = kernelDimensions(input.context)
      append(kernel, 'genre_kernel_emphasis')
    }
  }

  const lensIds = unique(candidates).filter(lensId => !suppressed.has(lensId)).slice(0, 2)
  if (!lensIds.length) return null
  const reasons = unique([
    'natural_review_checkpoint' as const,
    ...lensIds.flatMap(lensId => reasonByLens.get(lensId) || []),
  ])

  return {
    schemaVersion: 'writing-assist-recommendation.v1',
    sessionId: input.session.id,
    contextSnapshotId: input.context.id,
    draftId: input.draft.draftId,
    draftRevision: input.draft.revision,
    lensIds,
    reasonCodes: unique(reasons),
    status: 'proposed',
    generatedAt: input.generatedAt || new Date().toISOString(),
  }
}

export function writingAssistRecommendationIsCurrent(input: {
  recommendation: WritingAssistRecommendation
  session: CreationSession
  context: ContextSnapshot
  draft: SceneDraftResult
}) {
  return input.recommendation.status !== 'stale'
    && input.recommendation.sessionId === input.session.id
    && input.recommendation.contextSnapshotId === input.context.id
    && input.recommendation.draftId === input.draft.draftId
    && input.recommendation.draftRevision === input.draft.revision
}

export function markWritingAssistRecommendationStale(
  recommendation: WritingAssistRecommendation,
): WritingAssistRecommendation {
  return { ...recommendation, status: 'stale' }
}
