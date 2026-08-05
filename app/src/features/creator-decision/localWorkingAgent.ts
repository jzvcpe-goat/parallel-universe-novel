import { z } from 'zod'
import { finalizeCandidateSearch } from './candidateSearch'
import {
  normalizeCharacterStatePath,
} from './characterState'
import {
  createLiteraryReview,
  evidenceForDraftQuote,
  validateLocalRepairPreservedFactEvidence,
} from './literaryReview'
import {
  advisoryCraftFindingEvidenceQuote,
  advisoryCraftVerificationOutputSchema,
  validateAdvisoryCraftVerification,
} from './advisoryCraftVerification'
import {
  literaryFindingEvidenceQuote,
  literaryReviewVerificationOutputSchema,
  validateLiteraryReviewVerification,
} from './literaryReviewVerification'
import { referenceWritingAgent } from './referenceWritingAgent'
import { createMiroFishCharacterSimulationAdapter } from './miroFishCharacterSimulationAdapter'
import {
  applySceneDraftToBlocks,
  countVisibleCharacters,
  createDraftResult,
  draftBlocksFromText,
  draftTextFromBlocks,
  hasCompleteSceneEnding,
} from './sceneDrafting'
import {
  longformContinuityReviewSchema,
  longformContinuityVerificationSchema,
  validateLongformContinuityReview,
  validateLongformContinuityVerification,
  type LongformContinuityChapter,
  type LongformContinuityReview,
} from './longformContinuity'
import {
  longRangeStoryThreadReviewSchema,
  longRangeStoryThreadVerificationSchema,
  validateLongRangeStoryThreadReview,
  validateLongRangeStoryThreadRevision,
  validateLongRangeStoryThreadVerification,
  type LongRangeStoryThreadReview,
  type LongRangeStoryThreadVerification,
} from './longRangeStoryThreads'
import {
  pairedLiteraryComparisonSchema,
  pairedLiteraryComparisonVerificationSchema,
  validatePairedLiteraryComparison,
  validatePairedLiteraryComparisonVerification,
  pairedLiteraryComparisonEvidenceIssues,
  pairedLiteraryComparisonVerificationEvidenceIssues,
  assertPairedLiteraryVerificationEvidenceRevision,
  type PairedLiteraryEvidenceBlock,
  type PairedLiteraryComparison,
} from './pairedLiteraryComparison'
import {
  assertDistinctStoryStateOperationPaths,
  buildStoryStateEvidenceOperations,
  characterStateEvidenceProposalSchema,
  mergeStoryStateOperations,
  storyStateEvidenceOutputSchema,
  storyStateEvidenceReviewSchema,
  validateStoryStateEvidenceReview,
} from './storyStateEvidence'
import {
  localRepairCandidateSchema,
  localRepairReviewSchema,
  manualRecallAdherenceReviewSchema,
  sceneAuthorDecisionRequiredSchema,
  sceneAuthorDirectionDraftReviewSchema,
} from './schemas'
import {
  createManualRecallAdherenceReceipt,
  manualRecallAdherenceViolations,
} from './manualRecallAdherence'
import {
  buildLocalRepairIntentPreservationRequirements,
  localRepairIntentPreservationIssues,
} from './localRepairIntentPreservation'
import { executeStructuredAgentCall } from './structuredAgentCall'
import type {
  AdvisoryCraftFinding,
  AdvisoryLensId,
  AuthorIntentContract,
  CandidateAssessment,
  DraftBlock,
  ExtendedCraftReview,
  LiteraryFinding,
  LiteraryReview,
  LocalRepairFinding,
  ManualRecallItem,
  NarrativeCandidate,
  SceneMechanismSignature,
  SceneDraftResult,
  StatePatchOperation,
  WritingAgentCapabilities,
} from './types'
import { CreationDecisionError } from './types'

type LocalRepairAttempt = 'initial' | 'auditor_revision' | 'efficacy_retry'

export function buildLocalRepairComparisonContext(input: {
  attempt: LocalRepairAttempt
  draftBlocks: DraftBlock[]
  targetBlockId: string
  findings: LiteraryFinding[]
  targetDimension: LiteraryFinding['dimension'] | null
}) {
  const requiresComparison = input.attempt === 'efficacy_retry'
    || input.targetDimension === 'repetition'
  if (!requiresComparison) {
    return { chapterComparisonBlocks: [], sameDimensionFindings: [] }
  }
  return {
    chapterComparisonBlocks: input.draftBlocks.filter(block => block.id !== input.targetBlockId),
    sameDimensionFindings: input.findings.filter(finding => (
      finding.status === 'active'
      && finding.dimension === input.targetDimension
    )),
  }
}

function localRepairComparisonDimension(finding: LocalRepairFinding) {
  return finding.source === 'existing_product' ? finding.dimension : null
}

const conflictModeSchema = z.enum([
  'confrontation',
  'concealment',
  'misalignment',
  'sacrifice',
  'discovery',
  'reversal',
])
const informationModeSchema = z.enum([
  'direct_reveal',
  'delayed_reveal',
  'dramatic_irony',
  'false_belief',
  'partial_reveal',
])

const sceneMechanismSignatureSchema = z.object({
  pressureSource: z.enum(['environment', 'opponent', 'institution', 'relationship', 'body', 'time', 'resource', 'information']),
  conflictEngine: z.enum(['rescue', 'pursuit', 'negotiation', 'infiltration', 'escape', 'investigation', 'combat', 'survival', 'sacrifice', 'revelation']),
  agencyPattern: z.enum(['command', 'refusal', 'concealment', 'sacrifice', 'bargain', 'delegation', 'improvisation', 'endurance', 'pursuit', 'withdrawal']),
  costPattern: z.enum(['evidence_loss', 'injury', 'trust_loss', 'resource_loss', 'time_loss', 'exposure', 'position_loss', 'obligation', 'opportunity_loss', 'separation']),
  endingPattern: z.enum(['consequence_arrives', 'irreversible_loss', 'relationship_shift', 'opponent_gain', 'location_shift', 'promise_advanced', 'question_opened', 'temporary_relief', 'capability_change']),
}).strict()

function sameSceneMechanismSignature(
  left: SceneMechanismSignature | undefined,
  right: SceneMechanismSignature,
) {
  return Boolean(left) && Object.keys(right).every(axis => (
    left?.[axis as keyof SceneMechanismSignature] === right[axis as keyof SceneMechanismSignature]
  ))
}

const candidateAssessmentSchema = z.object({
  intentFit: z.number().int().min(1).max(5),
  characterAgency: z.number().int().min(1).max(5),
  tensionPotential: z.number().int().min(1).max(5),
  informationControl: z.number().int().min(1).max(5),
  continuitySafety: z.number().int().min(1).max(5),
  freshness: z.number().int().min(1).max(5),
  futureDebtFitness: z.number().int().min(1).max(5),
}).strict()

const candidateSearchSchema = z.object({
  schemaVersion: z.literal('creator-candidate-search.v1'),
  candidates: z.array(z.object({
    title: z.string().min(2).max(24),
    oneSentenceMechanism: z.string().min(12).max(180),
    mechanismSignature: sceneMechanismSignatureSchema,
    conflictMode: conflictModeSchema,
    informationMode: informationModeSchema,
    pacing: z.enum(['compressed', 'balanced', 'slow_burn']),
    costType: z.string().min(4).max(120),
    beats: z.array(z.object({
      purpose: z.string().min(4).max(80),
      action: z.string().min(8).max(180),
      resistance: z.string().min(8).max(180),
      consequence: z.string().min(8).max(180),
      informationChange: z.string().max(180).nullable(),
    }).strict()).min(3).max(5),
    strengths: z.array(z.string()).min(1).max(4),
    risks: z.array(z.string()).min(1).max(4),
    clicheRisks: z.array(z.string()).max(4),
    uncertainties: z.array(z.string()).max(4),
    irreversibleChanges: z.array(z.string()).max(4),
    promisesCreated: z.array(z.string()).max(4),
    futureDebts: z.array(z.string()).max(4),
    characterCosts: z.array(z.string()).min(1).max(4),
    assessment: candidateAssessmentSchema,
  }).strict()).length(3),
}).strict().superRefine((result, context) => {
  const vectors = new Set(result.candidates.map(candidate => JSON.stringify(candidate.assessment)))
  if (vectors.size > 1) return
  context.addIssue({
    code: z.ZodIssueCode.custom,
    path: ['candidates'],
    message: 'candidate assessments must expose real tradeoffs instead of assigning one identical vector',
  })
})

const sceneDraftSchema = z.object({
  schemaVersion: z.literal('creator-scene-draft.v1'),
  body: z.string()
    .refine(value => {
      const length = countVisibleCharacters(value)
      return length >= 2700 && length <= 3400
    }, 'body must contain 2700-3400 visible non-whitespace characters')
    .refine(
      hasCompleteSceneEnding,
      'body must end with a complete sentence and balanced Chinese quotation marks or brackets',
    ),
  unplannedFactProposals: z.array(z.string().min(2).max(160)).max(6),
  stateProposals: z.array(characterStateEvidenceProposalSchema).length(0),
  authorDirectionReview: sceneAuthorDirectionDraftReviewSchema.optional(),
}).strict()

const selectedTextDraftSchema = z.object({
  schemaVersion: z.literal('creator-scene-draft.v1'),
  body: z.string()
    .refine(value => {
      const length = countVisibleCharacters(value)
      return length >= 20 && length <= 2_200
    }, 'selected text replacement must contain 20-2200 visible non-whitespace characters')
    .refine(
      hasCompleteSceneEnding,
      'selected text replacement must end with a complete sentence and balanced Chinese quotation marks or brackets',
    ),
  unplannedFactProposals: z.array(z.string().min(2).max(160)).max(4),
  stateProposals: z.array(characterStateEvidenceProposalSchema).length(0),
  authorDirectionReview: sceneAuthorDirectionDraftReviewSchema.optional(),
}).strict()

const literaryReviewSchema = z.object({
  schemaVersion: z.literal('creator-literary-review.v1'),
  findings: z.array(z.object({
    dimension: z.enum([
      'continuity',
      'tension',
      'information_control',
      'character_agency',
      'voice',
      'freshness',
      'genre_fulfillment',
      'repetition',
      'exposition',
      'scene_detail',
      'pacing',
    ]),
    severity: z.enum(['hard_block', 'revision_candidate', 'taste_note', 'preserve']),
    evidenceQuote: z.string().min(2).max(180),
    expected: z.string().min(8).max(240),
    observed: z.string().min(8).max(240),
    readerImpact: z.string().min(8).max(240),
    diagnosis: z.string().min(8).max(240),
    repairDirection: z.string().min(8).max(240),
    confidence: z.enum(['high', 'medium', 'low']),
  }).strict()).max(8),
  extendedCraft: z.object({
    requestedLensIds: z.array(z.enum([
      'pov_focalization',
      'dialogue_subtext',
      'prose_rhythm',
      'ending_payoff',
    ])).max(2),
    findings: z.array(z.object({
      lensId: z.enum([
        'pov_focalization',
        'dialogue_subtext',
        'prose_rhythm',
        'ending_payoff',
      ]),
      severity: z.enum(['revision_candidate', 'taste_note', 'preserve']),
      evidenceQuote: z.string().min(2).max(180),
      diagnosis: z.string().min(8).max(240),
      readerEffectHypothesis: z.string().min(8).max(240),
      authorTradeoff: z.string().min(8).max(240),
      smallestExperiment: z.string().min(8).max(240),
      mappedExistingDimensions: z.array(z.enum([
        'continuity',
        'tension',
        'information_control',
        'character_agency',
        'voice',
        'freshness',
        'genre_fulfillment',
        'repetition',
        'exposition',
        'scene_detail',
        'pacing',
      ])).min(1).max(3),
      confidence: z.enum(['high', 'medium', 'low']),
    }).strict()).max(4),
  }).strict().nullable().optional(),
}).strict()

function stableId(prefix: string, value: string) {
  let hash = 2166136261
  for (const char of value) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return `${prefix}:${Math.abs(hash >>> 0).toString(36)}`
}

async function invokeBridge<T>(input: {
  baseUrl: string
  operation: 'candidate_search' | 'direct_scene_draft' | 'scene_draft' | 'scene_author_direction_draft_review' | 'manual_recall_adherence_review' | 'literary_review' | 'literary_review_revision' | 'literary_review_verification' | 'advisory_craft_verification' | 'paired_literary_comparison' | 'paired_literary_comparison_revision' | 'paired_literary_comparison_verification' | 'paired_literary_comparison_verification_revision' | 'longform_continuity_review' | 'longform_continuity_verification' | 'long_range_story_thread_review' | 'long_range_story_thread_revision' | 'long_range_story_thread_verification' | 'state_evidence' | 'state_evidence_review' | 'local_repair' | 'local_repair_review'
  schemaName: string
  schema: z.ZodType<T>
  payload: Record<string, unknown>
}) {
  return executeStructuredAgentCall({
    schemaName: input.schemaName,
    schema: input.schema,
    invoke: async attempt => {
      let response: Response
      try {
        response = await fetch(`${input.baseUrl}/v1/creator-decision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation: input.operation,
            attempt: attempt.attempt,
            schemaName: attempt.schemaName,
            schemaIssues: attempt.schemaIssues,
            previousValue: attempt.previousValue,
            payload: input.payload,
          }),
          signal: attempt.signal,
        })
      } catch (error) {
        throw new CreationDecisionError(
          'model_output_invalid',
          error instanceof Error ? error.message : 'The local writing service is unavailable.',
        )
      }
      if (!response.ok) {
        if (response.status === 428) {
          const body = await response.json().catch(() => null)
          if (body && typeof body === 'object' && 'error' in body
            && body.error === 'recent_scene_context_required') {
            throw new CreationDecisionError(
              'recent_scene_context_required',
              'Long-form scene writing requires current-manuscript or author-selected recent-scene evidence.',
              body,
            )
          }
          throw new CreationDecisionError(
            'model_output_invalid',
            'The local writing service returned an invalid recent-scene context contract.',
          )
        }
        if (response.status === 409) {
          const body = await response.json().catch(() => null)
          const decision = sceneAuthorDecisionRequiredSchema.safeParse(
            body && typeof body === 'object' && 'decision' in body ? body.decision : null,
          )
          if (body && typeof body === 'object' && 'error' in body
            && body.error === 'author_decision_required' && decision.success) {
            throw new CreationDecisionError(
              'scene_author_decision_required',
              'The scene architecture needs an explicit author direction before writing can continue.',
              decision.data,
            )
          }
          throw new CreationDecisionError(
            'model_output_invalid',
            'The local writing service returned an invalid author-decision contract.',
          )
        }
        if (response.status === 422) {
          const body = await response.json().catch(() => null)
          const review = sceneAuthorDirectionDraftReviewSchema.safeParse(
            body && typeof body === 'object' && 'review' in body ? body.review : null,
          )
          if (body && typeof body === 'object' && 'error' in body
            && body.error === 'scene_draft_alignment_rejected' && review.success) {
            throw new CreationDecisionError(
              'scene_author_direction_draft_rejected',
              'The generated candidate did not execute the author-selected scene direction.',
              review.data,
            )
          }
          throw new CreationDecisionError(
            'model_output_invalid',
            'The local writing service returned an invalid scene-alignment review.',
          )
        }
        const detail = await response.text()
        throw new CreationDecisionError('model_output_invalid', detail || `Working agent returned ${response.status}.`)
      }
      return response.json() as Promise<unknown>
    },
  })
}

export async function requestDirectSceneDraftFromWorkingAgent(input: {
  baseUrl: string
  payload: Record<string, unknown>
}) {
  return invokeBridge({
    baseUrl: input.baseUrl.replace(/\/$/, ''),
    operation: 'direct_scene_draft',
    schemaName: 'creator-scene-draft.v1',
    schema: sceneDraftSchema,
    payload: input.payload,
  })
}

export async function requestPairedLiteraryComparisonFromWorkingAgent(input: {
  baseUrl: string
  comparisonId: string
  sharedContext: Record<string, unknown>
  candidateABlocks: PairedLiteraryEvidenceBlock[]
  candidateBBlocks: PairedLiteraryEvidenceBlock[]
}) {
  const payload = {
    comparisonId: input.comparisonId,
    sharedContext: input.sharedContext,
    candidateA: { blocks: input.candidateABlocks },
    candidateB: { blocks: input.candidateBBlocks },
  }
  const initialComparison = await invokeBridge({
    baseUrl: input.baseUrl.replace(/\/$/, ''),
    operation: 'paired_literary_comparison',
    schemaName: 'creator-paired-literary-comparison.v1',
    schema: pairedLiteraryComparisonSchema,
    payload,
  })
  try {
    const comparison = validatePairedLiteraryComparison({
      comparisonId: input.comparisonId,
      candidateABlocks: input.candidateABlocks,
      candidateBBlocks: input.candidateBBlocks,
      comparison: initialComparison,
    })
    return {
      comparison,
      initialComparison,
      attempts: 1 as const,
      evidenceRevisionApplied: false,
    }
  } catch (error) {
    if (!(error instanceof CreationDecisionError)) throw error
    if (error.code !== 'evidence_missing') throw error
    const evidenceIssues = pairedLiteraryComparisonEvidenceIssues({
      candidateABlocks: input.candidateABlocks,
      candidateBBlocks: input.candidateBBlocks,
      comparison: initialComparison,
    })
    const comparison = await invokeBridge({
      baseUrl: input.baseUrl.replace(/\/$/, ''),
      operation: 'paired_literary_comparison_revision',
      schemaName: 'creator-paired-literary-comparison.v1',
      schema: pairedLiteraryComparisonSchema,
      payload: {
        ...payload,
        previousComparison: initialComparison,
        validationError: {
          code: error.code,
          message: error.message,
          evidenceIssues,
        },
      },
    })
    const locatedComparison = validatePairedLiteraryComparison({
      comparisonId: input.comparisonId,
      candidateABlocks: input.candidateABlocks,
      candidateBBlocks: input.candidateBBlocks,
      comparison,
    })
    return {
      comparison: locatedComparison,
      initialComparison,
      attempts: 2 as const,
      evidenceRevisionApplied: true,
    }
  }
}

export async function requestPairedLiteraryComparisonVerificationFromWorkingAgent(input: {
  baseUrl: string
  comparisonId: string
  sharedContext: Record<string, unknown>
  candidateABlocks: PairedLiteraryEvidenceBlock[]
  candidateBBlocks: PairedLiteraryEvidenceBlock[]
  comparison: PairedLiteraryComparison
}) {
  const payload = {
    comparisonId: input.comparisonId,
    sharedContext: input.sharedContext,
    candidateA: { blocks: input.candidateABlocks },
    candidateB: { blocks: input.candidateBBlocks },
    firstPassComparison: input.comparison,
  }
  const initialVerification = await invokeBridge({
    baseUrl: input.baseUrl.replace(/\/$/, ''),
    operation: 'paired_literary_comparison_verification',
    schemaName: 'creator-paired-literary-comparison-verification.v1',
    schema: pairedLiteraryComparisonVerificationSchema,
    payload,
  })
  try {
    return validatePairedLiteraryComparisonVerification({
      comparisonId: input.comparisonId,
      candidateABlocks: input.candidateABlocks,
      candidateBBlocks: input.candidateBBlocks,
      comparison: input.comparison,
      verification: initialVerification,
    })
  } catch (error) {
    if (!(error instanceof CreationDecisionError) || error.code !== 'evidence_missing') throw error
    const evidenceIssues = pairedLiteraryComparisonVerificationEvidenceIssues({
      candidateABlocks: input.candidateABlocks,
      candidateBBlocks: input.candidateBBlocks,
      verification: initialVerification,
    })
    const revisedVerification = await invokeBridge({
      baseUrl: input.baseUrl.replace(/\/$/, ''),
      operation: 'paired_literary_comparison_verification_revision',
      schemaName: 'creator-paired-literary-comparison-verification.v1',
      schema: pairedLiteraryComparisonVerificationSchema,
      payload: {
        ...payload,
        previousVerification: initialVerification,
        validationError: {
          code: error.code,
          message: error.message,
          evidenceIssues,
        },
      },
    })
    assertPairedLiteraryVerificationEvidenceRevision({
      previous: initialVerification,
      revised: revisedVerification,
      evidenceIssues,
    })
    return validatePairedLiteraryComparisonVerification({
      comparisonId: input.comparisonId,
      candidateABlocks: input.candidateABlocks,
      candidateBBlocks: input.candidateBBlocks,
      comparison: input.comparison,
      verification: revisedVerification,
    })
  }
}

export async function requestLongformContinuityReviewFromWorkingAgent(input: {
  baseUrl: string
  campaignId: string
  workId: string
  chapters: LongformContinuityChapter[]
}) {
  const chapters = [...input.chapters].sort((left, right) => left.chapterNumber - right.chapterNumber)
  if (chapters.length < 2) {
    throw new CreationDecisionError('model_output_invalid', 'A long-form continuity window needs at least two chapters.')
  }
  const review = await invokeBridge({
    baseUrl: input.baseUrl.replace(/\/$/, ''),
    operation: 'longform_continuity_review',
    schemaName: 'creator-longform-continuity-review.v1',
    schema: longformContinuityReviewSchema,
    payload: {
      campaignId: input.campaignId,
      workId: input.workId,
      windowStart: chapters[0]!.chapterNumber,
      windowEnd: chapters[chapters.length - 1]!.chapterNumber,
      chapters,
    },
  })
  const locatedFindings = validateLongformContinuityReview({ chapters, review })
  return { review, locatedFindings }
}

export async function requestLongformContinuityVerificationFromWorkingAgent(input: {
  baseUrl: string
  campaignId: string
  workId: string
  chapters: LongformContinuityChapter[]
  review: LongformContinuityReview
}) {
  if (input.review.findings.length === 0) {
    return {
      verification: {
        schemaVersion: 'creator-longform-continuity-verification.v1' as const,
        items: [],
        rationale: '首轮连续性审阅没有提出需要独立复核的问题。',
      },
      locatedItems: [],
    }
  }
  const verification = await invokeBridge({
    baseUrl: input.baseUrl.replace(/\/$/, ''),
    operation: 'longform_continuity_verification',
    schemaName: 'creator-longform-continuity-verification.v1',
    schema: longformContinuityVerificationSchema,
    payload: {
      campaignId: input.campaignId,
      workId: input.workId,
      windowStart: input.review.windowStart,
      windowEnd: input.review.windowEnd,
      chapters: input.chapters,
      findings: input.review.findings,
    },
  })
  const locatedItems = validateLongformContinuityVerification({
    chapters: input.chapters,
    findings: input.review.findings,
    verification,
  })
  return { verification, locatedItems }
}

export async function requestLongRangeStoryThreadReviewFromWorkingAgent(input: {
  baseUrl: string
  campaignId: string
  workId: string
  focus: 'causal_state' | 'promise_arc'
  chapters: LongformContinuityChapter[]
}) {
  const chapters = [...input.chapters].sort((left, right) => left.chapterNumber - right.chapterNumber)
  if (chapters.length < 3) {
    throw new CreationDecisionError('model_output_invalid', 'A long-range thread review needs at least three chapters.')
  }
  const review = await invokeBridge({
    baseUrl: input.baseUrl.replace(/\/$/, ''),
    operation: 'long_range_story_thread_review',
    schemaName: 'creator-long-range-story-thread-review.v1',
    schema: longRangeStoryThreadReviewSchema,
    payload: {
      campaignId: input.campaignId,
      workId: input.workId,
      focus: input.focus,
      fromChapter: chapters[0]!.chapterNumber,
      toChapter: chapters[chapters.length - 1]!.chapterNumber,
      chapters,
    },
  })
  const located = validateLongRangeStoryThreadReview({ chapters, focus: input.focus, review })
  return { review, ...located }
}

export async function requestLongRangeStoryThreadVerificationFromWorkingAgent(input: {
  baseUrl: string
  campaignId: string
  workId: string
  chapters: LongformContinuityChapter[]
  review: LongRangeStoryThreadReview
}) {
  const verification = await invokeBridge({
    baseUrl: input.baseUrl.replace(/\/$/, ''),
    operation: 'long_range_story_thread_verification',
    schemaName: 'creator-long-range-story-thread-verification.v1',
    schema: longRangeStoryThreadVerificationSchema,
    payload: {
      campaignId: input.campaignId,
      workId: input.workId,
      focus: input.review.focus,
      fromChapter: input.review.fromChapter,
      toChapter: input.review.toChapter,
      chapters: input.chapters,
      threads: input.review.threads,
      findings: input.review.findings,
    },
  })
  const located = validateLongRangeStoryThreadVerification({
    chapters: input.chapters,
    review: input.review,
    verification,
  })
  return { verification, ...located }
}

export async function requestLongRangeStoryThreadRevisionFromWorkingAgent(input: {
  baseUrl: string
  campaignId: string
  workId: string
  chapters: LongformContinuityChapter[]
  previousReview: LongRangeStoryThreadReview
  previousVerification: LongRangeStoryThreadVerification
}) {
  const revisedReview = await invokeBridge({
    baseUrl: input.baseUrl.replace(/\/$/, ''),
    operation: 'long_range_story_thread_revision',
    schemaName: 'creator-long-range-story-thread-review.v1',
    schema: longRangeStoryThreadReviewSchema,
    payload: {
      campaignId: input.campaignId,
      workId: input.workId,
      mode: 'auditor_revision',
      focus: input.previousReview.focus,
      fromChapter: input.previousReview.fromChapter,
      toChapter: input.previousReview.toChapter,
      chapters: input.chapters,
      previousReview: input.previousReview,
      previousVerification: input.previousVerification,
    },
  })
  const located = validateLongRangeStoryThreadRevision({
    chapters: input.chapters,
    previousReview: input.previousReview,
    previousVerification: input.previousVerification,
    revisedReview,
  })
  return { revisedReview, ...located }
}

export function requestStoryStateEvidenceFromWorkingAgent(input: {
  baseUrl: string
  payload: Record<string, unknown>
}) {
  return invokeBridge({
    baseUrl: input.baseUrl.replace(/\/$/, ''),
    operation: 'state_evidence',
    schemaName: 'creator-state-evidence.v1',
    schema: storyStateEvidenceOutputSchema,
    payload: input.payload,
  })
}

export function requestStoryStateEvidenceReviewFromWorkingAgent(input: {
  baseUrl: string
  payload: Record<string, unknown>
}) {
  return invokeBridge({
    baseUrl: input.baseUrl.replace(/\/$/, ''),
    operation: 'state_evidence_review',
    schemaName: 'creator-state-evidence-review.v1',
    schema: storyStateEvidenceReviewSchema,
    payload: input.payload,
  })
}

export async function requestAuditedStoryStateEvidenceFromWorkingAgent(input: {
  baseUrl: string
  payload: Record<string, unknown>
  mode: 'canon_patch' | 'quality_trial' | 'historical_state_backfill'
}) {
  const initialEvidence = await requestStoryStateEvidenceFromWorkingAgent({
    baseUrl: input.baseUrl,
    payload: input.payload,
  })
  if (
    initialEvidence.characterStateProposals.length === 0
    && initialEvidence.continuityProposals.length === 0
  ) {
    return {
      evidence: initialEvidence,
      initialEvidence,
      initialReview: null,
      finalReview: null,
      attempts: 1 as const,
      passed: true,
    }
  }

  const initialReview = await requestStoryStateEvidenceReviewFromWorkingAgent({
    baseUrl: input.baseUrl,
    payload: {
      ...input.payload,
      mode: input.mode,
      evidence: initialEvidence,
    },
  })
  if (validateStoryStateEvidenceReview({ evidence: initialEvidence, review: initialReview })) {
    return {
      evidence: initialEvidence,
      initialEvidence,
      initialReview,
      finalReview: initialReview,
      attempts: 1 as const,
      passed: true,
    }
  }

  const revisedEvidence = await requestStoryStateEvidenceFromWorkingAgent({
    baseUrl: input.baseUrl,
    payload: {
      ...input.payload,
      mode: `${input.mode}_semantic_revision`,
      previousEvidence: initialEvidence,
      stateEvidenceReview: initialReview,
    },
  })
  const finalReview = (
    revisedEvidence.characterStateProposals.length === 0
    && revisedEvidence.continuityProposals.length === 0
  )
    ? null
    : await requestStoryStateEvidenceReviewFromWorkingAgent({
        baseUrl: input.baseUrl,
        payload: {
          ...input.payload,
          mode: input.mode,
          evidence: revisedEvidence,
        },
      })
  const passed = finalReview
    ? validateStoryStateEvidenceReview({ evidence: revisedEvidence, review: finalReview })
    : true
  return {
    evidence: revisedEvidence,
    initialEvidence,
    initialReview,
    finalReview,
    attempts: 2 as const,
    passed,
  }
}

function stateChangesFromEvidence(input: {
  result: z.infer<typeof sceneDraftSchema>
  generatedBlocks: SceneDraftResult['contentBlocks']
}) {
  return input.result.stateProposals.map<StatePatchOperation>(proposal => {
    const block = input.generatedBlocks.find(item => item.text.includes(proposal.evidenceQuote))
    if (!block) {
      throw new CreationDecisionError(
        'evidence_missing',
        `State proposal evidence is not present in the generated manuscript: ${proposal.evidenceQuote}`,
      )
    }
    return {
      op: 'add',
      path: normalizeCharacterStatePath(proposal.path),
      value: proposal.value,
      evidenceBlockIds: [block.id],
      reason: proposal.reason,
      irreversible: proposal.irreversible,
    }
  })
}

export function modelFindings(input: {
  draft: SceneDraftResult
  result: z.infer<typeof literaryReviewSchema>
}) {
  return input.result.findings.map<LiteraryFinding>(item => {
    const evidence = evidenceForDraftQuote(input.draft.contentBlocks, item.evidenceQuote)
    if (!evidence) {
      throw new CreationDecisionError(
        'evidence_missing',
        `The ${item.dimension} literary finding does not quote the current manuscript exactly.`,
      )
    }
    return {
      id: stableId('working-agent-finding', `${input.draft.draftId}:${item.dimension}:${item.severity}:${item.evidenceQuote}`),
      dimension: item.dimension,
      severity: item.severity,
      evidence,
      expected: item.expected,
      observed: item.observed,
      readerImpact: item.readerImpact,
      diagnosis: item.diagnosis,
      repairDirection: item.repairDirection,
      protectedBlockIds: item.severity === 'preserve'
        ? Array.from(new Set(evidence.map(item => item.blockId)))
        : [],
      confidence: item.confidence,
      status: 'active',
    }
  })
}

export function modelExtendedCraftReview(input: {
  draft: SceneDraftResult
  requestedLensIds: AdvisoryLensId[]
  result: z.infer<typeof literaryReviewSchema>
}): ExtendedCraftReview | undefined {
  if (!input.requestedLensIds.length) return undefined
  const output = input.result.extendedCraft
  if (!output) return undefined
  const requestedLensIds = [...new Set(input.requestedLensIds)]
  if (
    output.requestedLensIds.length !== requestedLensIds.length
    || output.requestedLensIds.some((lensId, index) => lensId !== requestedLensIds[index])
  ) {
    throw new CreationDecisionError('model_output_invalid', 'The literary review changed the requested advisory lenses.')
  }
  const requested = new Set(requestedLensIds)
  const findings = output.findings.map<AdvisoryCraftFinding>(item => {
    if (!requested.has(item.lensId)) {
      throw new CreationDecisionError('model_output_invalid', 'The literary review introduced an unrequested advisory lens.')
    }
    const evidence = evidenceForDraftQuote(input.draft.contentBlocks, item.evidenceQuote)
    if (!evidence) {
      throw new CreationDecisionError(
        'evidence_missing',
        `The ${item.lensId} advisory finding does not quote the current manuscript exactly.`,
      )
    }
    return {
      id: stableId('working-agent-advisory-finding', `${input.draft.draftId}:${item.lensId}:${item.severity}:${item.evidenceQuote}`),
      lensId: item.lensId,
      severity: item.severity,
      evidence,
      diagnosis: item.diagnosis,
      readerEffectHypothesis: item.readerEffectHypothesis,
      authorTradeoff: item.authorTradeoff,
      smallestExperiment: item.smallestExperiment,
      mappedExistingDimensions: item.mappedExistingDimensions,
      confidence: item.confidence,
      verification: 'unverified',
      status: 'active',
    }
  })
  return {
    schemaVersion: 'extended-craft-review.v1',
    requestedLensIds,
    findings,
    compositeLiteraryScoreUsed: false,
  }
}

export function sceneDraftDirectionReceiptFromReview(input: {
  review: z.infer<typeof sceneAuthorDirectionDraftReviewSchema>
  draftBlocks: SceneDraftResult['contentBlocks']
}): NonNullable<SceneDraftResult['directionReceipt']> {
  if (input.review.decision !== 'pass') {
    throw new CreationDecisionError(
      'scene_author_direction_draft_rejected',
      'A rejected author-direction review cannot become a draft receipt.',
      input.review,
    )
  }
  const axisChecks = input.review.axisChecks.map(check => {
    if (check.decision !== 'pass' || !check.evidenceQuote) {
      throw new CreationDecisionError(
        'evidence_missing',
        `The passing ${check.axis} direction check is missing exact draft evidence.`,
      )
    }
    const evidence = evidenceForDraftQuote(input.draftBlocks, check.evidenceQuote)
    if (!evidence) {
      throw new CreationDecisionError(
        'evidence_missing',
        `The ${check.axis} direction receipt evidence cannot be located in the draft.`,
      )
    }
    return {
      axis: check.axis,
      expectedValue: check.expectedValue,
      evidence,
    }
  })
  const proposedAdjustmentEvidence = input.review.proposedAdjustmentCheck.evidenceQuotes
    .flatMap(quote => evidenceForDraftQuote(input.draftBlocks, quote) || [])
  if (
    input.review.proposedAdjustmentCheck.decision !== 'pass'
    || proposedAdjustmentEvidence.length === 0
  ) {
    throw new CreationDecisionError(
      'evidence_missing',
      'The passing author adjustment is missing exact draft evidence.',
    )
  }
  return {
    schemaVersion: 'scene-draft-direction-receipt.v1',
    decision: 'pass',
    axisChecks,
    proposedAdjustmentEvidence,
    reviewer: 'Auditor',
  }
}

export async function requestSceneAuthorDirectionDraftReviewFromWorkingAgent(input: {
  baseUrl: string
  intent: AuthorIntentContract
  draft: SceneDraftResult
}) {
  return invokeBridge({
    baseUrl: input.baseUrl,
    operation: 'scene_author_direction_draft_review',
    schemaName: 'creator-scene-author-direction-draft-review.v1',
    schema: sceneAuthorDirectionDraftReviewSchema,
    payload: {
      intent: input.intent,
      draft: {
        body: draftTextFromBlocks(input.draft.contentBlocks),
      },
    },
  })
}

export async function requestManualRecallAdherenceReviewFromWorkingAgent(input: {
  baseUrl: string
  selectedRecallItems: ManualRecallItem[]
  draftBlocks: DraftBlock[]
}) {
  const review = await invokeBridge({
    baseUrl: input.baseUrl,
    operation: 'manual_recall_adherence_review',
    schemaName: 'creator-manual-recall-adherence-review.v1',
    schema: manualRecallAdherenceReviewSchema,
    payload: {
      selectedManualRecallItems: input.selectedRecallItems.map(item => ({
        sourceId: item.sourceId,
        sourceRevision: item.sourceRevision,
        group: item.group,
        statement: item.statement,
        whyNow: item.whyNow,
      })),
      draft: {
        body: draftTextFromBlocks(input.draftBlocks),
      },
    },
  })
  return createManualRecallAdherenceReceipt({
    review,
    selectedRecallItems: input.selectedRecallItems,
    draftBlocks: input.draftBlocks,
  })
}

function distinctFindings(findings: LiteraryFinding[]) {
  const seen = new Set<string>()
  return findings.filter(finding => {
    const evidence = finding.evidence[0]
    const key = `${finding.dimension}:${finding.severity}:${evidence?.blockId}:${evidence?.startOffset}:${evidence?.endOffset}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function createLocalWorkingAgent(baseUrl: string): WritingAgentCapabilities {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')
  const characterSimulationProvider = createMiroFishCharacterSimulationAdapter(normalizedBaseUrl)
  return {
    simulateCharacters: request => characterSimulationProvider.simulate(request),
    buildContextSnapshot: referenceWritingAgent.buildContextSnapshot,
    proposeIntentContract: referenceWritingAgent.proposeIntentContract,

    async generateCandidates(input) {
      const result = await invokeBridge({
        baseUrl: normalizedBaseUrl,
        operation: 'candidate_search',
        schemaName: 'creator-candidate-search.v1',
        schema: candidateSearchSchema,
        payload: {
          session: input.session,
          intent: input.intent,
          context: input.context,
        },
      })
      const rawCandidates: NarrativeCandidate[] = result.candidates.map((candidate, candidateIndex) => {
        const id = stableId(
          'working-agent-candidate',
          `${input.session.id}:${input.intent.revision}:${candidate.title}:${candidate.oneSentenceMechanism}`,
        )
        return {
          schemaVersion: 'narrative-candidate.v1',
          id,
          sessionId: input.session.id,
          intentRevision: input.intent.revision,
          contextSnapshotId: input.context.id,
          revision: input.session.currentCandidateRevision + 1,
          status: 'active',
          title: candidate.title,
          oneSentenceMechanism: candidate.oneSentenceMechanism,
          mechanismSignature: candidate.mechanismSignature,
          strategyAxes: {
            conflictMode: candidate.conflictMode,
            informationMode: candidate.informationMode,
            agencyOwnerId: input.intent.characterAgency.primaryActorId,
            costType: candidate.costType,
            pacing: candidate.pacing,
            viewpointId: input.intent.characterAgency.primaryActorId,
          },
          beats: candidate.beats.map((beat, beatIndex) => ({
            id: `${id}:beat:${beatIndex + 1}`,
            order: beatIndex + 1,
            purpose: beat.purpose,
            actingCharacterId: input.intent.characterAgency.primaryActorId,
            action: beat.action,
            resistance: beat.resistance,
            consequence: beat.consequence,
            informationChange: beat.informationChange,
            statePreconditions: input.context.hardConstraints.slice(0, 3),
            stateEffects: beatIndex === candidate.beats.length - 1 ? candidate.irreversibleChanges : [],
          })),
          projectedEffects: {
            stateChanges: [],
            irreversibleChanges: candidate.irreversibleChanges,
            promisesCreated: candidate.promisesCreated,
            promisesConsumed: [],
            futureDebts: candidate.futureDebts,
            characterCosts: candidate.characterCosts,
          },
          tradeoffs: {
            strengths: candidate.strengths,
            risks: candidate.risks,
            clicheRisks: candidate.clicheRisks,
            uncertainties: candidate.uncertainties,
          },
          validation: {
            hardConstraintPassed: true,
            violations: candidate.informationMode === 'direct_reveal'
              && input.intent.informationPolicy.charactersMustNotKnow.length > 0
              ? [`information_boundary_violation:${candidateIndex}`]
              : [],
          },
        }
      })
      const assessments: CandidateAssessment[] = result.candidates.map((candidate, index) => {
        const rawCandidate = rawCandidates[index]
        if (!rawCandidate) {
          throw new CreationDecisionError('model_output_invalid', 'Candidate assessment lost its candidate target.')
        }
        return {
          candidateId: rawCandidate.id,
          ...candidate.assessment,
        }
      })
      const finalized = finalizeCandidateSearch({ rawCandidates, assessments, context: input.context })
      const direction = input.intent.sceneMechanismDirection
      if (direction && !finalized.candidates.some(candidate => (
        sameSceneMechanismSignature(candidate.mechanismSignature, direction.expectedMechanismSignature)
      ))) {
        throw new CreationDecisionError(
          'model_output_invalid',
          'Candidate search did not preserve the author-selected scene mechanism.',
        )
      }
      return finalized
    },

    async draftScene(input) {
      const selectedText = input.request.scope.type === 'selected_text'
      const needsLongFormContext = !selectedText && (
        input.request.writingMode === 'continue_author_text'
        || Boolean(input.request.chapterNumber && input.request.chapterNumber > 1)
      )
      if (needsLongFormContext && input.context.recentSceneSummaries.length === 0) {
        throw new CreationDecisionError(
          'recent_scene_context_required',
          'Long-form scene writing requires current-manuscript or author-selected recent-scene evidence.',
        )
      }
      const result = await invokeBridge({
        baseUrl: normalizedBaseUrl,
        operation: 'scene_draft',
        schemaName: selectedText ? 'creator-selected-text-draft.v1' : 'creator-scene-draft.v1',
        schema: selectedText ? selectedTextDraftSchema : sceneDraftSchema,
        payload: {
          session: input.session,
          intent: input.intent,
          candidate: input.candidate,
          context: input.context,
          request: input.request,
          currentBlocks: input.currentBlocks,
        },
      })
      const visibleLength = countVisibleCharacters(result.body)
      if (
        visibleLength < input.request.targetLength.minimum
        || visibleLength > input.request.targetLength.maximum
      ) {
        throw new CreationDecisionError(
          'model_output_invalid',
          `The generated candidate length ${visibleLength} is outside the requested ${input.request.targetLength.minimum}-${input.request.targetLength.maximum} range.`,
        )
      }
      const generatedBlocks = draftBlocksFromText(result.body)
      const directionReceipt = result.authorDirectionReview
        ? sceneDraftDirectionReceiptFromReview({
            review: result.authorDirectionReview,
            draftBlocks: generatedBlocks,
          })
        : undefined
      const contentBlocks = input.request.writingMode === 'continue_author_text'
        ? [...input.currentBlocks, ...generatedBlocks]
        : applySceneDraftToBlocks({
            currentBlocks: input.currentBlocks,
            generatedBlocks,
            request: input.request,
          })
      return createDraftResult({
        request: input.request,
        contentBlocks,
        unplannedFactProposals: result.unplannedFactProposals,
        observedStateChanges: stateChangesFromEvidence({ result, generatedBlocks }),
        directionReceipt,
      })
    },

    async reviewDraft(input) {
      const deterministic = await referenceWritingAgent.reviewDraft(input)
      const reviewId = stableId('working-agent-review', `${input.draft.draftId}:${input.draft.revision}`)
      const payload = {
        session: input.session,
        intent: input.intent,
        candidate: input.candidate,
        context: input.context,
        draft: input.draft,
        requestedFocusDimensions: input.focusDimensions || [],
        requestedAdvisoryLensIds: input.requestedAdvisoryLensIds || [],
      }
      let result = await invokeBridge({
        baseUrl: normalizedBaseUrl,
        operation: 'literary_review',
        schemaName: 'creator-literary-review.v1',
        schema: literaryReviewSchema,
        payload,
      })
      let reviewedFindings: LiteraryFinding[]
      try {
        reviewedFindings = modelFindings({ draft: input.draft, result })
      } catch (error) {
        if (!(error instanceof CreationDecisionError) || error.code !== 'evidence_missing') throw error
        result = await invokeBridge({
          baseUrl: normalizedBaseUrl,
          operation: 'literary_review_revision',
          schemaName: 'creator-literary-review.v1',
          schema: literaryReviewSchema,
          payload: {
            ...payload,
            previousReview: result,
            validationIssue: {
              code: error.code,
              message: error.message,
            },
          },
        })
        reviewedFindings = modelFindings({ draft: input.draft, result })
      }
      let extendedCraft = modelExtendedCraftReview({
        draft: input.draft,
        requestedLensIds: input.requestedAdvisoryLensIds || [],
        result,
      })
      const actionableModelFindings = reviewedFindings.filter(finding => (
        finding.status === 'active'
        && ['hard_block', 'revision_candidate'].includes(finding.severity)
      ))
      let modelFindingVerification: LiteraryReview['modelFindingVerification']
      if (actionableModelFindings.length > 0) {
        const verificationOutput = await invokeBridge({
          baseUrl: normalizedBaseUrl,
          operation: 'literary_review_verification',
          schemaName: 'creator-literary-review-verification.v1',
          schema: literaryReviewVerificationOutputSchema,
          payload: {
            reviewId,
            session: input.session,
            intent: input.intent,
            candidate: input.candidate,
            context: input.context,
            draft: {
              contentBlocks: input.draft.contentBlocks,
            },
            findings: actionableModelFindings.map(finding => ({
              id: finding.id,
              dimension: finding.dimension,
              severity: finding.severity,
              evidenceQuote: literaryFindingEvidenceQuote(finding, input.draft.contentBlocks),
              expected: finding.expected,
              observed: finding.observed,
              readerImpact: finding.readerImpact,
              diagnosis: finding.diagnosis,
              repairDirection: finding.repairDirection,
              confidence: finding.confidence,
            })),
          },
        })
        const verification = validateLiteraryReviewVerification({
          reviewId,
          findings: actionableModelFindings,
          draftBlocks: input.draft.contentBlocks,
          output: verificationOutput,
        })
        const actionableIds = new Set(actionableModelFindings.map(finding => finding.id))
        reviewedFindings = [
          ...reviewedFindings.filter(finding => !actionableIds.has(finding.id)),
          ...verification.verifiedFindings,
        ]
        modelFindingVerification = verification.receipt
      }
      const actionableAdvisoryFindings = extendedCraft?.findings.filter(finding => (
        finding.status === 'active' && finding.severity === 'revision_candidate'
      )) || []
      if (extendedCraft && actionableAdvisoryFindings.length > 0) {
        const advisoryVerificationOutput = await invokeBridge({
          baseUrl: normalizedBaseUrl,
          operation: 'advisory_craft_verification',
          schemaName: 'creator-advisory-craft-verification.v1',
          schema: advisoryCraftVerificationOutputSchema,
          payload: {
            reviewId,
            session: input.session,
            intent: input.intent,
            candidate: input.candidate,
            context: input.context,
            draft: { contentBlocks: input.draft.contentBlocks },
            findings: actionableAdvisoryFindings.map(finding => ({
              id: finding.id,
              lensId: finding.lensId,
              severity: finding.severity,
              evidenceQuote: advisoryCraftFindingEvidenceQuote(finding, input.draft.contentBlocks),
              diagnosis: finding.diagnosis,
              readerEffectHypothesis: finding.readerEffectHypothesis,
              authorTradeoff: finding.authorTradeoff,
              smallestExperiment: finding.smallestExperiment,
              mappedExistingDimensions: finding.mappedExistingDimensions,
              confidence: finding.confidence,
            })),
          },
        })
        const verified = validateAdvisoryCraftVerification({
          reviewId,
          findings: actionableAdvisoryFindings,
          draftBlocks: input.draft.contentBlocks,
          output: advisoryVerificationOutput,
        })
        const actionableIds = new Set(actionableAdvisoryFindings.map(finding => finding.id))
        extendedCraft = {
          ...extendedCraft,
          findings: [
            ...extendedCraft.findings.filter(finding => !actionableIds.has(finding.id)),
            ...verified.findings,
          ],
          verificationReceipt: verified.receipt,
        }
      }
      const visibleLength = countVisibleCharacters(draftTextFromBlocks(input.draft.contentBlocks))
      const deterministicViolations = [...deterministic.deterministicViolations]
      const manualRecallAdherence = input.context.manualRecallItems.length > 0
        ? await requestManualRecallAdherenceReviewFromWorkingAgent({
            baseUrl: normalizedBaseUrl,
            selectedRecallItems: input.context.manualRecallItems,
            draftBlocks: input.draft.contentBlocks,
          })
        : undefined
      if (manualRecallAdherence) {
        deterministicViolations.push(...manualRecallAdherenceViolations(manualRecallAdherence))
      }
      if (visibleLength < 2700 || visibleLength > 3400) {
        deterministicViolations.push(`scene_length_out_of_range:${visibleLength}:2700:3400`)
      }
      return createLiteraryReview({
        id: reviewId,
        sessionId: input.session.id,
        context: input.context,
        draft: input.draft,
        findings: distinctFindings([
          ...deterministic.findings,
          ...reviewedFindings,
        ]),
        extendedCraft,
        modelFindingVerification,
        manualRecallAdherence,
        requestedFocusDimensions: input.focusDimensions,
        deterministicViolations,
      })
    },

    async proposeRepair(input) {
      const targetIndex = input.draft.contentBlocks.findIndex(block => block.id === input.targetBlock.id)
      if (targetIndex < 0) {
        throw new CreationDecisionError('evidence_missing', 'The repair target no longer exists in the manuscript.')
      }
      const evidence = input.finding.evidence.find(item => item.blockId === input.targetBlock.id)
      if (!evidence) {
        throw new CreationDecisionError('evidence_missing', 'The repair target is not backed by the selected finding.')
      }
      const attempt = input.attempt || 'initial'
      const comparisonContext = buildLocalRepairComparisonContext({
        attempt,
        draftBlocks: input.draft.contentBlocks,
        targetBlockId: input.targetBlock.id,
        findings: input.review.findings,
        targetDimension: localRepairComparisonDimension(input.finding),
      })
      const intentPreservationRequirements = buildLocalRepairIntentPreservationRequirements({
        intent: input.intent,
        targetBlockText: input.targetBlock.text,
      })
      if (
        attempt === 'auditor_revision'
        && (!input.previousRepair || input.repairReview?.decision !== 'reject')
      ) {
        throw new CreationDecisionError(
          'model_output_invalid',
          'An Auditor-guided repair revision requires the rejected candidate and its review.',
        )
      }
      const result = await invokeBridge({
        baseUrl: normalizedBaseUrl,
        operation: 'local_repair',
        schemaName: 'creator-local-repair.v1',
        schema: localRepairCandidateSchema,
        payload: {
          session: input.session,
          intent: input.intent,
          candidate: input.candidate,
          context: input.context,
          review: {
            id: input.review.id,
            baseDraftRevision: input.review.baseDraftRevision,
            deterministicViolations: input.review.deterministicViolations,
          },
          finding: input.finding,
          evidenceQuote: input.targetBlock.text.slice(evidence.startOffset, evidence.endOffset),
          targetBlock: input.targetBlock,
          neighboringBlocks: input.draft.contentBlocks
            .slice(Math.max(0, targetIndex - 1), targetIndex + 2)
            .filter(block => block.id !== input.targetBlock.id),
          ...comparisonContext,
          unplannedFactProposals: input.draft.unplannedFactProposals,
          intentPreservationRequirements,
          attempt,
          previousRepair: input.previousRepair || null,
          repairReview: input.repairReview || null,
        },
      })
      if (result.findingId !== input.finding.id || result.targetBlockId !== input.targetBlock.id) {
        throw new CreationDecisionError('evidence_missing', 'The local repair candidate changed its evidence target.')
      }
      const proposedContent = result.proposedContent.trim()
      if (!proposedContent || proposedContent === input.targetBlock.text.trim()) {
        throw new CreationDecisionError('model_output_invalid', 'The local repair candidate did not produce a distinct replacement.')
      }
      if (
        attempt === 'auditor_revision'
        && proposedContent === input.previousRepair?.proposedContent.trim()
      ) {
        throw new CreationDecisionError(
          'model_output_invalid',
          'The Auditor-guided repair revision did not change the rejected candidate.',
        )
      }
      const candidateResult = { ...result, proposedContent }
      if (!validateLocalRepairPreservedFactEvidence({
        sourceText: input.targetBlock.text,
        candidate: candidateResult,
      })) {
        throw new CreationDecisionError(
          'evidence_missing',
          'Every preserved fact must cite exact source and candidate evidence.',
        )
      }
      return candidateResult
    },

    async reviewRepair(input) {
      const targetIndex = input.draft.contentBlocks.findIndex(block => block.id === input.targetBlock.id)
      if (targetIndex < 0) {
        throw new CreationDecisionError('evidence_missing', 'The repair review target no longer exists in the manuscript.')
      }
      const attempt = input.attempt || 'initial'
      const comparisonContext = buildLocalRepairComparisonContext({
        attempt,
        draftBlocks: input.draft.contentBlocks,
        targetBlockId: input.targetBlock.id,
        findings: input.review.findings,
        targetDimension: localRepairComparisonDimension(input.finding),
      })
      const intentPreservationRequirements = buildLocalRepairIntentPreservationRequirements({
        intent: input.intent,
        targetBlockText: input.targetBlock.text,
      })
      const result = await invokeBridge({
        baseUrl: normalizedBaseUrl,
        operation: 'local_repair_review',
        schemaName: 'creator-local-repair-review.v1',
        schema: localRepairReviewSchema,
        payload: {
          session: input.session,
          intent: input.intent,
          candidate: input.candidate,
          context: input.context,
          review: {
            id: input.review.id,
            baseDraftRevision: input.review.baseDraftRevision,
            deterministicViolations: input.review.deterministicViolations,
          },
          finding: input.finding,
          targetBlock: input.targetBlock,
          neighboringBlocks: input.draft.contentBlocks
            .slice(Math.max(0, targetIndex - 1), targetIndex + 2)
            .filter(block => block.id !== input.targetBlock.id),
          ...comparisonContext,
          intentPreservationRequirements,
          attempt,
          repair: input.repair,
        },
      })
      if (result.findingId !== input.finding.id || result.targetBlockId !== input.targetBlock.id) {
        throw new CreationDecisionError('evidence_missing', 'The independent repair review changed its evidence target.')
      }
      for (const issue of result.issues) {
        if (issue.sourceEvidenceQuote && !input.targetBlock.text.includes(issue.sourceEvidenceQuote)) {
          throw new CreationDecisionError('evidence_missing', 'The repair review source evidence cannot be located.')
        }
        if (issue.candidateEvidenceQuote && !input.repair.proposedContent.includes(issue.candidateEvidenceQuote)) {
          throw new CreationDecisionError('evidence_missing', 'The repair review candidate evidence cannot be located.')
        }
      }
      if (result.decision === 'pass') {
        const verifiedIndexes = Array.from(new Set(result.verifiedPreservedFactIndexes)).sort((left, right) => left - right)
        if (
          verifiedIndexes.length !== result.verifiedPreservedFactIndexes.length
          || verifiedIndexes.length !== input.repair.preservedFacts.length
          || verifiedIndexes.some((value, index) => value !== index)
        ) {
          throw new CreationDecisionError(
            'evidence_missing',
            'A passing repair review must verify every preserved-fact evidence pair.',
          )
        }
      }
      const deterministicIntentIssues = localRepairIntentPreservationIssues({
        candidate: input.repair,
        requirements: intentPreservationRequirements,
      })
      if (deterministicIntentIssues.length === 0) return result
      const issues = [...result.issues, ...deterministicIntentIssues].slice(0, 8)
      return localRepairReviewSchema.parse({
        ...result,
        decision: 'reject',
        issues,
        rationale: '候选未完整保留作者锁定的多对象或多物件意图，不得进入作者采用环节。',
      })
    },

    async proposeCanonPatch(input) {
      const auditedEvidence = await requestAuditedStoryStateEvidenceFromWorkingAgent({
        baseUrl: normalizedBaseUrl,
        mode: 'canon_patch',
        payload: {
          session: input.session,
          intent: input.intent,
          candidate: input.candidate,
          context: input.context,
          draft: input.draft,
          review: input.review,
        },
      })
      if (!auditedEvidence.passed) {
        throw new CreationDecisionError(
          'model_output_invalid',
          `State evidence review rejected the proposed canon changes after one bounded revision: ${auditedEvidence.finalReview?.rationale || 'no final rationale'}`,
        )
      }
      const extractedOperations = buildStoryStateEvidenceOperations({
        result: auditedEvidence.evidence,
        session: input.session,
        blocks: input.draft.contentBlocks,
        context: input.context,
      })
      assertDistinctStoryStateOperationPaths(extractedOperations)
      const patch = await referenceWritingAgent.proposeCanonPatch(input)
      return {
        ...patch,
        operations: mergeStoryStateOperations(
          input.draft.observedStateChanges,
          extractedOperations,
        ),
      }
    },
  }
}
