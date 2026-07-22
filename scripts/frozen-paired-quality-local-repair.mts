export type OptionalLocalRepairFailureDisposition =
  | 'initial_repair_failed_closed'
  | 'independent_review_failed_closed'
  | 'auditor_guided_revision_failed_closed'

export type OptionalLocalRepairCycleDisposition =
  | OptionalLocalRepairFailureDisposition
  | 'rejected_by_auditor'
  | 'discarded_outside_length_or_ending_contract'
  | 'reverted_target_dimension_persisted'
  | 'reverted_author_direction_not_retained'
  | 'post_repair_direction_review_failed_closed'
  | 'applied'

export function optionalLocalRepairNextAction(
  disposition: OptionalLocalRepairCycleDisposition,
): 'continue_original_candidate' | 'continue_revised_candidate' {
  return disposition === 'applied'
    ? 'continue_revised_candidate'
    : 'continue_original_candidate'
}

const defaultLocalRepairDimensionPriority = [
  'continuity',
  'information_control',
  'character_agency',
  'voice',
  'repetition',
  'exposition',
  'pacing',
  'tension',
  'genre_fulfillment',
  'scene_detail',
  'freshness',
]

interface RepairPriorityFindingLike {
  id: string
  dimension: string
  severity: string
  confidence: string
}

export function compareOptionalLocalRepairPriority(
  left: RepairPriorityFindingLike,
  right: RepairPriorityFindingLike,
  focusDimensions: string[],
) {
  const severity = Number(left.severity !== 'hard_block') - Number(right.severity !== 'hard_block')
  if (severity !== 0) return severity
  const focusRank = (dimension: string) => {
    const index = focusDimensions.indexOf(dimension)
    return index === -1 ? Number.MAX_SAFE_INTEGER : index
  }
  const focus = focusRank(left.dimension) - focusRank(right.dimension)
  if (focus !== 0) return focus
  const confidenceRank = (confidence: string) => (
    confidence === 'high' ? 0 : confidence === 'medium' ? 1 : 2
  )
  const confidence = confidenceRank(left.confidence) - confidenceRank(right.confidence)
  if (confidence !== 0) return confidence
  const dimensionRank = (dimension: string) => {
    const index = defaultLocalRepairDimensionPriority.indexOf(dimension)
    return index === -1 ? Number.MAX_SAFE_INTEGER : index
  }
  const dimension = dimensionRank(left.dimension) - dimensionRank(right.dimension)
  return dimension || left.id.localeCompare(right.id)
}

interface LiteraryFindingLike {
  dimension: string
  severity: string
  status: string
}

interface EfficacyRetryFindingLike extends LiteraryFindingLike {
  id: string
  confidence: string
  evidence: Array<{ blockId: string }>
  protectedBlockIds: string[]
}

interface EfficacyRetryBlockLike {
  id: string
  protected: boolean
}

export function selectEfficacyGuidedRetryTarget(input: {
  targetDimension: string
  findings: EfficacyRetryFindingLike[]
  blocks: EfficacyRetryBlockLike[]
}) {
  const blockById = new Map(input.blocks.map(block => [block.id, block]))
  const activeTargetFindings = input.findings.filter(finding => (
    finding.dimension === input.targetDimension
    && finding.status === 'active'
    && ['hard_block', 'revision_candidate'].includes(finding.severity)
  ))
  if (activeTargetFindings.length !== 1) return null
  const candidates = activeTargetFindings.flatMap(finding => {
    if (
      finding.confidence === 'low'
    ) return []
    const evidenceBlockIds = Array.from(new Set(finding.evidence.map(item => item.blockId)))
    if (evidenceBlockIds.length !== 1) return []
    const block = blockById.get(evidenceBlockIds[0])
    if (!block || block.protected || finding.protectedBlockIds.includes(block.id)) return []
    return [{ finding, block }]
  })
  candidates.sort((left, right) => compareOptionalLocalRepairPriority(
    left.finding,
    right.finding,
    [input.targetDimension],
  ))
  const selected = candidates[0]
  return selected
    ? { findingId: selected.finding.id, targetBlockId: selected.block.id }
    : null
}

export function assessOptionalLocalRepairEfficacy(input: {
  targetDimension: string
  findings: LiteraryFindingLike[]
}) {
  const activeTargetDimensionFindingCount = input.findings.filter(finding => (
    finding.dimension === input.targetDimension
    && finding.status === 'active'
    && ['hard_block', 'revision_candidate'].includes(finding.severity)
  )).length
  return {
    decision: activeTargetDimensionFindingCount > 0
      ? 'revert_original_candidate' as const
      : 'retain_revised_candidate' as const,
    activeTargetDimensionFindingCount,
  }
}

interface RepairResultLike {
  preservedFacts: unknown[]
}

interface RepairReviewLike {
  decision: 'pass' | 'reject'
}

export type BoundedOptionalLocalRepairResult<
  TRepair extends RepairResultLike,
  TReview extends RepairReviewLike,
> = {
  status: 'completed'
  repair: TRepair
  independentReview: TReview
  reviserAttempts: 1 | 2
} | {
  status: 'failed_closed'
  disposition: OptionalLocalRepairFailureDisposition
  reviserAttempts: 1 | 2
  independentReviewDecision: 'reject' | 'not_run'
  preservedFactCount: number
}

export async function executeBoundedOptionalLocalRepair<
  TRepair extends RepairResultLike,
  TReview extends RepairReviewLike,
>(input: {
  proposeInitial: () => Promise<TRepair>
  review: (repair: TRepair) => Promise<TReview>
  proposeAuditorRevision: (previousRepair: TRepair, review: TReview) => Promise<TRepair>
}): Promise<BoundedOptionalLocalRepairResult<TRepair, TReview>> {
  const initialAttempt = await input.proposeInitial()
    .then(value => ({ ok: true as const, value }))
    .catch(() => ({ ok: false as const }))
  if (!initialAttempt.ok) {
    return {
      status: 'failed_closed',
      disposition: 'initial_repair_failed_closed',
      reviserAttempts: 1,
      independentReviewDecision: 'not_run',
      preservedFactCount: 0,
    }
  }

  const initialReviewAttempt = await input.review(initialAttempt.value)
    .then(value => ({ ok: true as const, value }))
    .catch(() => ({ ok: false as const }))
  if (!initialReviewAttempt.ok) {
    return {
      status: 'failed_closed',
      disposition: 'independent_review_failed_closed',
      reviserAttempts: 1,
      independentReviewDecision: 'not_run',
      preservedFactCount: initialAttempt.value.preservedFacts.length,
    }
  }
  if (initialReviewAttempt.value.decision === 'pass') {
    return {
      status: 'completed',
      repair: initialAttempt.value,
      independentReview: initialReviewAttempt.value,
      reviserAttempts: 1,
    }
  }

  const revisionAttempt = await input
    .proposeAuditorRevision(initialAttempt.value, initialReviewAttempt.value)
    .then(value => ({ ok: true as const, value }))
    .catch(() => ({ ok: false as const }))
  if (!revisionAttempt.ok) {
    return {
      status: 'failed_closed',
      disposition: 'auditor_guided_revision_failed_closed',
      reviserAttempts: 2,
      independentReviewDecision: 'reject',
      preservedFactCount: initialAttempt.value.preservedFacts.length,
    }
  }

  const revisedReviewAttempt = await input.review(revisionAttempt.value)
    .then(value => ({ ok: true as const, value }))
    .catch(() => ({ ok: false as const }))
  if (!revisedReviewAttempt.ok) {
    return {
      status: 'failed_closed',
      disposition: 'independent_review_failed_closed',
      reviserAttempts: 2,
      independentReviewDecision: 'not_run',
      preservedFactCount: revisionAttempt.value.preservedFacts.length,
    }
  }
  return {
    status: 'completed',
    repair: revisionAttempt.value,
    independentReview: revisedReviewAttempt.value,
    reviserAttempts: 2,
  }
}

export type EfficacyGuidedRepairResult<
  TRepair extends RepairResultLike,
  TReview extends RepairReviewLike,
> = {
  status: 'completed'
  repair: TRepair
  independentReview: TReview
} | {
  status: 'rejected'
  repair: TRepair
  independentReview: TReview
} | {
  status: 'failed_closed'
  failedAt: 'reviser' | 'auditor'
  preservedFactCount: number
}

export async function executeSingleEfficacyGuidedRepair<
  TRepair extends RepairResultLike,
  TReview extends RepairReviewLike,
>(input: {
  propose: () => Promise<TRepair>
  review: (repair: TRepair) => Promise<TReview>
}): Promise<EfficacyGuidedRepairResult<TRepair, TReview>> {
  const repairAttempt = await input.propose()
    .then(value => ({ ok: true as const, value }))
    .catch(() => ({ ok: false as const }))
  if (!repairAttempt.ok) {
    return { status: 'failed_closed', failedAt: 'reviser', preservedFactCount: 0 }
  }
  const reviewAttempt = await input.review(repairAttempt.value)
    .then(value => ({ ok: true as const, value }))
    .catch(() => ({ ok: false as const }))
  if (!reviewAttempt.ok) {
    return {
      status: 'failed_closed',
      failedAt: 'auditor',
      preservedFactCount: repairAttempt.value.preservedFacts.length,
    }
  }
  return reviewAttempt.value.decision === 'pass'
    ? { status: 'completed', repair: repairAttempt.value, independentReview: reviewAttempt.value }
    : { status: 'rejected', repair: repairAttempt.value, independentReview: reviewAttempt.value }
}
