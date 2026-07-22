import type { CanonStatePatch, CreationDecisionEvent, LiteraryReview, RepairProposal } from './types'
import type { LongformContinuityReview, LongformContinuityVerification } from './longformContinuity'
import type { LongRangeStoryThreadReview, LongRangeStoryThreadVerification } from './longRangeStoryThreads'

export type LiteraryValueCoverage = 'measured' | 'partial' | 'not_measured'

export interface LiteraryValueMetric {
  coverage: LiteraryValueCoverage
  signalCount: number
  verifiedSignalCount: number
  sourceKinds: string[]
  limitation: string | null
}

export interface ConstraintEvaluationSignal {
  kind: 'kernel' | 'constraint' | 'timeline'
  outcome: 'pass' | 'violation' | 'unknown'
  verified: boolean
  sourceId: string
}

export interface AuthorTrustSignal {
  rating: 1 | 2 | 3 | 4 | 5
  reasonCode: string | null
}

/**
 * A privacy-preserving summary of a frozen Chapter 1-20 campaign.
 * It carries only independently verified counts and a receipt hash; raw prose,
 * findings, and private Working Agent artifacts stay outside this report.
 */
export interface LiteraryValueCampaignReceipt {
  kind: 'adjacent_continuity' | 'long_range_threads'
  receiptSha256: string
  fromChapter: number
  toChapter: number
  independentlyVerified: true
  privateTextCopiedIntoReceipt: false
  verifiedFindingCounts: Record<string, number>
  verifiedThreadCounts: Record<string, number>
}

export interface LiteraryValueEvidenceInput {
  reviews: LiteraryReview[]
  repairs: RepairProposal[]
  events: CreationDecisionEvent[]
  canonPatches?: CanonStatePatch[]
  continuityRuns?: Array<{
    review: LongformContinuityReview
    verification: LongformContinuityVerification
  }>
  longRangeRuns?: Array<{
    review: LongRangeStoryThreadReview
    verification: LongRangeStoryThreadVerification
  }>
  campaignReceipts?: LiteraryValueCampaignReceipt[]
  constraintSignals?: ConstraintEvaluationSignal[]
  authorTrustSignals?: AuthorTrustSignal[]
}

export interface LiteraryValueEvidenceReport {
  schemaVersion: 'creator-literary-value-evidence.v1'
  reviewEvidence: {
    reviewCount: number
    verifiedProductFindingCount: number
    verifiedAdvisoryFindingCount: number
    rejectedProductFindingCount: number
    rejectedAdvisoryFindingCount: number
    deterministicViolationCount: number
    manualRecallCheckCount: number
  }
  campaignEvidence: {
    receiptCount: number
    adjacentContinuity: {
      receiptCount: number
      independentlyVerifiedFindingCount: number
    }
    longRangeThreads: {
      receiptCount: number
      independentlyVerifiedFindingCount: number
      independentlyVerifiedThreadCount: number
    }
  }
  character: {
    personalityDrift: LiteraryValueMetric
    motivationDrift: LiteraryValueMetric
    relationshipInconsistency: LiteraryValueMetric
    characterGoalChanges: LiteraryValueMetric
  }
  worldAndCanon: {
    kernelViolations: LiteraryValueMetric
    constraintViolations: LiteraryValueMetric
    timelineContradictions: LiteraryValueMetric
    settingConsistency: LiteraryValueMetric
  }
  narrative: {
    beatProgression: LiteraryValueMetric
    conflictEscalation: LiteraryValueMetric
    informationRelease: LiteraryValueMetric
    foreshadowPayoff: LiteraryValueMetric
  }
  authorWorkflow: {
    decisions: {
      adopt: number
      reject: number
      keepOriginal: number
      later: number
      dismissedWithoutReason: number
      uniqueFindingDecisionCount: number
      acceptanceRate: number | null
      rejectionReasons: Array<{ reasonCode: string; count: number }>
    }
    boundedRepair: {
      proposed: number
      accepted: number
      rejected: number
      stale: number
      acceptanceRate: number | null
      limitation: string
    }
    trust: {
      coverage: LiteraryValueCoverage
      responseCount: number
      ratingDistribution: Record<AuthorTrustSignal['rating'], number>
      reasonCounts: Array<{ reasonCode: string; count: number }>
      limitation: string | null
    }
  }
  claimBoundary: {
    compositeLiteraryScoreUsed: false
    stableLiteraryQualityImprovementProven: false
    professionalHumanBlindReviewCompleted: false
    automaticRagEnabled: false
    meaning: string
  }
}

function metric(input: {
  coverage: LiteraryValueCoverage
  signalCount: number
  verifiedSignalCount: number
  sourceKinds: string[]
  limitation?: string | null
}): LiteraryValueMetric {
  return {
    coverage: input.coverage,
    signalCount: input.signalCount,
    verifiedSignalCount: input.verifiedSignalCount,
    sourceKinds: Array.from(new Set(input.sourceKinds)).sort(),
    limitation: input.limitation || null,
  }
}

function countBy<T extends string>(values: Iterable<T>) {
  const counts = new Map<T, number>()
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1)
  return counts
}

function numericRate(numerator: number, denominator: number) {
  return denominator === 0 ? null : numerator / denominator
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function findingId(event: CreationDecisionEvent) {
  return stringValue(event.payload.findingId)
}

type AuthorFindingDecision = 'adopt' | 'reject' | 'keep_original' | 'later' | 'dismissed'

function authorFindingDecision(event: CreationDecisionEvent): AuthorFindingDecision | null {
  if (event.type === 'finding_accepted') return 'adopt'
  if (event.type === 'finding_deferred') return 'later'
  if (event.type === 'repair_rejected') return 'reject'
  if (event.type !== 'finding_dismissed') return null
  const reason = stringValue(event.payload.reason)
  return reason === 'keep_original' ? 'keep_original' : 'dismissed'
}

function verifiedProductFindingIds(reviews: LiteraryReview[]) {
  return new Set(reviews.flatMap(review => review.modelFindingVerification?.verifiedFindingIds || []))
}

function rejectedProductFindingIds(reviews: LiteraryReview[]) {
  return new Set(reviews.flatMap(review => review.modelFindingVerification?.rejectedFindingIds || []))
}

function verifiedAdvisoryFindingIds(reviews: LiteraryReview[]) {
  return new Set(reviews.flatMap(review => review.extendedCraft?.verificationReceipt?.verifiedFindingIds || []))
}

function rejectedAdvisoryFindingIds(reviews: LiteraryReview[]) {
  return new Set(reviews.flatMap(review => review.extendedCraft?.verificationReceipt?.rejectedFindingIds || []))
}

function verifiedChapterDimensionCount(reviews: LiteraryReview[], dimension: string, verifiedIds: Set<string>) {
  return reviews.flatMap(review => review.findings)
    .filter(finding => finding.dimension === dimension && verifiedIds.has(finding.id)).length
}

function verifiedContinuityDimensionCount(
  runs: LiteraryValueEvidenceInput['continuityRuns'],
  dimension: string,
) {
  return (runs || []).reduce((count, run) => count + run.verification.items.filter(item => (
    item.decision === 'verify' && run.review.findings[item.findingIndex]?.dimension === dimension
  )).length, 0)
}

function verifiedLongRangeDimensionCount(
  runs: LiteraryValueEvidenceInput['longRangeRuns'],
  dimension: string,
) {
  return (runs || []).reduce((count, run) => count + run.verification.findingItems.filter(item => (
    item.decision === 'verify' && run.review.findings[item.findingIndex]?.dimension === dimension
  )).length, 0)
}

function campaignReceiptDimensionCount(
  receipts: LiteraryValueCampaignReceipt[],
  kind: LiteraryValueCampaignReceipt['kind'],
  dimension: string,
) {
  return receipts
    .filter(receipt => receipt.kind === kind && receipt.independentlyVerified)
    .reduce((count, receipt) => (
      count + (receipt.verifiedFindingCounts[dimension] || 0)
    ), 0)
}

function campaignReceiptThreadCount(
  receipts: LiteraryValueCampaignReceipt[],
  dimension: string,
) {
  return receipts
    .filter(receipt => receipt.kind === 'long_range_threads' && receipt.independentlyVerified)
    .reduce((count, receipt) => count + (receipt.verifiedThreadCounts[dimension] || 0), 0)
}

function committedCharacterGoalChangeCount(patches: CanonStatePatch[]) {
  return patches
    .filter(patch => patch.status === 'committed')
    .flatMap(patch => patch.operations)
    .filter(operation => /\/characters\/[^/]+\/(dominantDesire|immediateGoal|currentIntent)$/u.test(operation.path))
    .length
}

function trustSummary(signals: AuthorTrustSignal[] | undefined) {
  const distribution: Record<AuthorTrustSignal['rating'], number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  const reasonCounts = countBy((signals || []).flatMap(signal => signal.reasonCode ? [signal.reasonCode] : []))
  for (const signal of signals || []) distribution[signal.rating] += 1
  return {
    coverage: signals?.length ? 'measured' as const : 'not_measured' as const,
    responseCount: signals?.length || 0,
    ratingDistribution: distribution,
    reasonCounts: Array.from(reasonCounts, ([reasonCode, count]) => ({ reasonCode, count }))
      .sort((left, right) => right.count - left.count || left.reasonCode.localeCompare(right.reasonCode)),
    limitation: signals?.length
      ? null
      : 'Author trust requires an explicit author-provided signal; interaction behavior is not treated as a trust proxy.',
  }
}

export function buildLiteraryValueEvidenceReport(input: LiteraryValueEvidenceInput): LiteraryValueEvidenceReport {
  const continuityRuns = input.continuityRuns || []
  const longRangeRuns = input.longRangeRuns || []
  const campaignReceipts = input.campaignReceipts || []
  const patches = input.canonPatches || []
  const verifiedProductIds = verifiedProductFindingIds(input.reviews)
  const rejectedProductIds = rejectedProductFindingIds(input.reviews)
  const verifiedAdvisoryIds = verifiedAdvisoryFindingIds(input.reviews)
  const rejectedAdvisoryIds = rejectedAdvisoryFindingIds(input.reviews)
  const deterministicViolationCount = input.reviews.reduce(
    (count, review) => count + review.deterministicViolations.length,
    0,
  )
  const manualRecallCheckCount = input.reviews.reduce(
    (count, review) => count + (review.manualRecallAdherence?.checks.length || 0),
    0,
  )

  const decisionByFinding = new Map<string, { decision: AuthorFindingDecision; event: CreationDecisionEvent }>()
  for (const event of [...input.events].sort((left, right) => Date.parse(left.occurredAt) - Date.parse(right.occurredAt))) {
    const id = findingId(event)
    const decision = authorFindingDecision(event)
    if (id && decision) decisionByFinding.set(id, { decision, event })
  }
  const decisions = Array.from(decisionByFinding.values())
  const decisionCounts = countBy(decisions.map(item => item.decision))
  const rejectionReasons = countBy(decisions.flatMap(({ decision, event }) => {
    if (decision !== 'reject' && decision !== 'keep_original' && decision !== 'dismissed') return []
    return [stringValue(event.payload.reason) || 'unspecified']
  }))
  const acceptedRepairCount = input.repairs.filter(repair => repair.status === 'accepted').length
  const rejectedRepairCount = input.repairs.filter(repair => repair.status === 'rejected').length

  const constraintSignals = input.constraintSignals || []
  const constraintMetric = (kind: ConstraintEvaluationSignal['kind'], fallback: string) => {
    const signals = constraintSignals.filter(signal => signal.kind === kind)
    const violations = signals.filter(signal => signal.outcome === 'violation')
    const verifiedViolations = violations.filter(signal => signal.verified)
    return metric({
      coverage: signals.length ? 'measured' : 'not_measured',
      signalCount: violations.length,
      verifiedSignalCount: verifiedViolations.length,
      sourceKinds: signals.length ? ['structured_constraint_signal'] : [],
      limitation: signals.length ? null : fallback,
    })
  }

  const continuityMeasured = continuityRuns.length > 0
  const longRangeMeasured = longRangeRuns.length > 0
  const adjacentReceiptCount = campaignReceipts.filter(receipt => receipt.kind === 'adjacent_continuity').length
  const longRangeReceiptCount = campaignReceipts.filter(receipt => receipt.kind === 'long_range_threads').length
  const personalitySignals = verifiedContinuityDimensionCount(continuityRuns, 'voice_drift')
  const motivationSignals = verifiedContinuityDimensionCount(continuityRuns, 'character_motivation')
  const settingSignals = verifiedContinuityDimensionCount(continuityRuns, 'setting_consistency')
    + campaignReceiptDimensionCount(campaignReceipts, 'adjacent_continuity', 'setting_consistency')
  const timelineSignals = verifiedContinuityDimensionCount(continuityRuns, 'timeline')
  const foreshadowSignals = verifiedContinuityDimensionCount(continuityRuns, 'foreshadowing')
    + verifiedLongRangeDimensionCount(longRangeRuns, 'foreshadowing')
    + campaignReceiptDimensionCount(campaignReceipts, 'long_range_threads', 'foreshadowing')
  const foreshadowThreadEvidenceCount = campaignReceiptThreadCount(campaignReceipts, 'foreshadowing')
  const beatSignals = verifiedChapterDimensionCount(input.reviews, 'pacing', verifiedProductIds)
  const conflictSignals = verifiedChapterDimensionCount(input.reviews, 'tension', verifiedProductIds)
  const informationSignals = verifiedChapterDimensionCount(input.reviews, 'information_control', verifiedProductIds)
  const goalChanges = committedCharacterGoalChangeCount(patches)

  return {
    schemaVersion: 'creator-literary-value-evidence.v1',
    reviewEvidence: {
      reviewCount: input.reviews.length,
      verifiedProductFindingCount: verifiedProductIds.size,
      verifiedAdvisoryFindingCount: verifiedAdvisoryIds.size,
      rejectedProductFindingCount: rejectedProductIds.size,
      rejectedAdvisoryFindingCount: rejectedAdvisoryIds.size,
      deterministicViolationCount,
      manualRecallCheckCount,
    },
    campaignEvidence: {
      receiptCount: campaignReceipts.length,
      adjacentContinuity: {
        receiptCount: adjacentReceiptCount,
        independentlyVerifiedFindingCount: campaignReceipts
          .filter(receipt => receipt.kind === 'adjacent_continuity')
          .reduce((count, receipt) => count + Object.values(receipt.verifiedFindingCounts).reduce((sum, value) => sum + value, 0), 0),
      },
      longRangeThreads: {
        receiptCount: longRangeReceiptCount,
        independentlyVerifiedFindingCount: campaignReceipts
          .filter(receipt => receipt.kind === 'long_range_threads')
          .reduce((count, receipt) => count + Object.values(receipt.verifiedFindingCounts).reduce((sum, value) => sum + value, 0), 0),
        independentlyVerifiedThreadCount: campaignReceipts
          .filter(receipt => receipt.kind === 'long_range_threads')
          .reduce((count, receipt) => count + Object.values(receipt.verifiedThreadCounts).reduce((sum, value) => sum + value, 0), 0),
      },
    },
    character: {
      personalityDrift: metric({
        coverage: continuityMeasured ? 'measured' : input.reviews.length ? 'partial' : 'not_measured',
        signalCount: personalitySignals,
        verifiedSignalCount: personalitySignals,
        sourceKinds: continuityMeasured ? ['longform_continuity.voice_drift'] : ['chapter_review.voice'],
        limitation: continuityMeasured ? null : 'Cross-chapter voice/personality drift needs a verified long-form continuity run.',
      }),
      motivationDrift: metric({
        coverage: continuityMeasured ? 'measured' : input.reviews.length ? 'partial' : 'not_measured',
        signalCount: motivationSignals,
        verifiedSignalCount: motivationSignals,
        sourceKinds: continuityMeasured ? ['longform_continuity.character_motivation'] : ['chapter_review.character_agency'],
        limitation: continuityMeasured ? null : 'Cross-chapter motivation drift needs a verified long-form continuity run.',
      }),
      relationshipInconsistency: metric({
        coverage: 'not_measured',
        signalCount: 0,
        verifiedSignalCount: 0,
        sourceKinds: [],
        limitation: 'The 22-dimension state model records relationship changes, but no verified relationship-inconsistency evaluator is wired yet.',
      }),
      characterGoalChanges: metric({
        coverage: patches.length ? 'measured' : 'not_measured',
        signalCount: goalChanges,
        verifiedSignalCount: goalChanges,
        sourceKinds: patches.length ? ['committed_canon_patch.character_goal_state'] : [],
        limitation: patches.length ? 'This counts evidence-backed committed goal changes, not whether a change is narratively good.' : 'No committed Canon patches were supplied.',
      }),
    },
    worldAndCanon: {
      kernelViolations: constraintMetric('kernel', 'Kernel checks are present in Context and gates, but no classified evaluation receipt is supplied.'),
      constraintViolations: constraintMetric('constraint', 'Constraint checks are present in Context and gates, but no classified evaluation receipt is supplied.'),
      timelineContradictions: metric({
        coverage: continuityMeasured || constraintSignals.some(signal => signal.kind === 'timeline') ? 'measured' : 'not_measured',
        signalCount: timelineSignals + constraintSignals.filter(signal => signal.kind === 'timeline' && signal.outcome === 'violation').length,
        verifiedSignalCount: timelineSignals + constraintSignals.filter(signal => (
          signal.kind === 'timeline' && signal.outcome === 'violation' && signal.verified
        )).length,
        sourceKinds: [
          ...(continuityMeasured ? ['longform_continuity.timeline'] : []),
          ...(constraintSignals.some(signal => signal.kind === 'timeline') ? ['structured_constraint_signal.timeline'] : []),
        ],
        limitation: continuityMeasured || constraintSignals.some(signal => signal.kind === 'timeline')
          ? null
          : 'Timeline contradictions require a verified continuity run or classified timeline receipt.',
      }),
      settingConsistency: metric({
        coverage: continuityMeasured || settingSignals > 0 ? 'measured' : 'not_measured',
        signalCount: settingSignals,
        verifiedSignalCount: settingSignals,
        sourceKinds: [
          ...(continuityMeasured ? ['longform_continuity.setting_consistency'] : []),
          ...(campaignReceiptDimensionCount(campaignReceipts, 'adjacent_continuity', 'setting_consistency')
            ? ['adjacent_continuity_campaign_receipt.setting_consistency']
            : []),
        ],
        limitation: continuityMeasured || settingSignals > 0
          ? 'A campaign receipt counts independently verified findings only; it does not establish the absence of other setting inconsistencies.'
          : 'Setting consistency needs a verified long-form continuity run.',
      }),
    },
    narrative: {
      beatProgression: metric({
        coverage: input.reviews.length ? 'partial' : 'not_measured',
        signalCount: beatSignals,
        verifiedSignalCount: beatSignals,
        sourceKinds: input.reviews.length ? ['chapter_review.pacing'] : [],
        limitation: 'Chapter pacing findings are not a complete beat-progression evaluation until arc-level coverage exists.',
      }),
      conflictEscalation: metric({
        coverage: input.reviews.length ? 'partial' : 'not_measured',
        signalCount: conflictSignals,
        verifiedSignalCount: conflictSignals,
        sourceKinds: input.reviews.length ? ['chapter_review.tension'] : [],
        limitation: 'Chapter tension findings do not prove cross-chapter escalation.',
      }),
      informationRelease: metric({
        coverage: input.reviews.length ? 'partial' : 'not_measured',
        signalCount: informationSignals,
        verifiedSignalCount: informationSignals,
        sourceKinds: input.reviews.length ? ['chapter_review.information_control'] : [],
        limitation: 'Chapter information-control findings do not yet measure whole-arc reveal structure.',
      }),
      foreshadowPayoff: metric({
        coverage: continuityMeasured || longRangeMeasured || foreshadowSignals > 0
          ? 'measured'
          : foreshadowThreadEvidenceCount > 0
            ? 'partial'
            : 'not_measured',
        signalCount: foreshadowSignals,
        verifiedSignalCount: foreshadowSignals,
        sourceKinds: [
          ...(continuityMeasured ? ['longform_continuity.foreshadowing'] : []),
          ...(longRangeMeasured ? ['long_range_story_threads.foreshadowing'] : []),
          ...(campaignReceiptDimensionCount(campaignReceipts, 'long_range_threads', 'foreshadowing')
            ? ['long_range_thread_campaign_receipt.foreshadowing']
            : []),
          ...(foreshadowThreadEvidenceCount
            ? ['long_range_thread_campaign_receipt.foreshadowing_thread']
            : []),
        ],
        limitation: continuityMeasured || longRangeMeasured || foreshadowSignals > 0
          ? 'A campaign receipt counts independently verified findings only; it does not establish a complete arc payoff verdict.'
          : foreshadowThreadEvidenceCount > 0
            ? 'Independently verified foreshadowing threads establish coverage, not a complete payoff verdict or the absence of unresolved promises.'
          : 'Foreshadowing payoff needs a verified continuity or long-range thread run.',
      }),
    },
    authorWorkflow: {
      decisions: {
        adopt: decisionCounts.get('adopt') || 0,
        reject: decisionCounts.get('reject') || 0,
        keepOriginal: decisionCounts.get('keep_original') || 0,
        later: decisionCounts.get('later') || 0,
        dismissedWithoutReason: decisionCounts.get('dismissed') || 0,
        uniqueFindingDecisionCount: decisions.length,
        acceptanceRate: numericRate(decisionCounts.get('adopt') || 0, decisions.length),
        rejectionReasons: Array.from(rejectionReasons, ([reasonCode, count]) => ({ reasonCode, count }))
          .sort((left, right) => right.count - left.count || left.reasonCode.localeCompare(right.reasonCode)),
      },
      boundedRepair: {
        proposed: input.repairs.filter(repair => repair.status === 'proposed').length,
        accepted: acceptedRepairCount,
        rejected: rejectedRepairCount,
        stale: input.repairs.filter(repair => repair.status === 'stale').length,
        acceptanceRate: numericRate(acceptedRepairCount, acceptedRepairCount + rejectedRepairCount),
        limitation: 'This is a bounded-repair outcome measure. It is not a time-on-task or literary-quality score.',
      },
      trust: trustSummary(input.authorTrustSignals),
    },
    claimBoundary: {
      compositeLiteraryScoreUsed: false,
      stableLiteraryQualityImprovementProven: false,
      professionalHumanBlindReviewCompleted: false,
      automaticRagEnabled: false,
      meaning: 'The report aggregates evidence coverage and author-controlled workflow outcomes. It does not infer stable literary improvement, human preference, or trust from absent findings or interaction counts.',
    },
  }
}
