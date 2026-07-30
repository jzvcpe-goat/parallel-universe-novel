import { z } from 'zod'
import { parseCharacterStatePath } from './characterState'

const id = z.string().min(1)
const isoDate = z.string().min(1)
const unknownRecord = z.record(z.string(), z.unknown())

export const sceneMechanismSignatureSchema = z.object({
  pressureSource: z.enum(['environment', 'opponent', 'institution', 'relationship', 'body', 'time', 'resource', 'information']),
  conflictEngine: z.enum(['rescue', 'pursuit', 'negotiation', 'infiltration', 'escape', 'investigation', 'combat', 'survival', 'sacrifice', 'revelation']),
  agencyPattern: z.enum(['command', 'refusal', 'concealment', 'sacrifice', 'bargain', 'delegation', 'improvisation', 'endurance', 'pursuit', 'withdrawal']),
  costPattern: z.enum(['evidence_loss', 'injury', 'trust_loss', 'resource_loss', 'time_loss', 'exposure', 'position_loss', 'obligation', 'opportunity_loss', 'separation']),
  endingPattern: z.enum(['consequence_arrives', 'irreversible_loss', 'relationship_shift', 'opponent_gain', 'location_shift', 'promise_advanced', 'question_opened', 'temporary_relief', 'capability_change']),
}).strict()

export const sceneAuthorDecisionOptionSchema = z.object({
  id,
  label: z.string().min(1),
  primaryChangedAxis: z.enum(['pressureSource', 'conflictEngine', 'agencyPattern', 'costPattern', 'endingPattern']),
  proposedAdjustment: z.string().min(1),
  preservedAuthorIntent: z.array(z.string().min(1)).min(2).max(6),
  addressesIssueCodes: z.array(z.enum([
    'signature_mismatch',
    'superficial_difference',
    'causal_chain_repetition',
    'ending_repetition',
  ])).min(1).max(4),
  whyItBreaksRepetition: z.string().min(1),
  expectedMechanismSignature: sceneMechanismSignatureSchema,
  tradeoff: z.string().min(1),
}).strict()

export const sceneAuthorDecisionOptionsSchema = z.object({
  schemaVersion: z.literal('creator-scene-author-decision-options.v1'),
  question: z.string().min(1),
  options: z.array(sceneAuthorDecisionOptionSchema).min(2).max(3),
  requiresAuthorSelection: z.literal(true),
  writerInvoked: z.literal(false),
  canonCommitAllowed: z.literal(false),
}).strict()

export const sceneAuthorDecisionRequiredSchema = z.object({
  schemaVersion: z.literal('creator-author-decision-required.v1'),
  decisionId: id,
  pipelineId: id,
  sessionId: id,
  intentId: id,
  intentRevision: z.number().int().positive(),
  reason: z.literal('scene_architecture_repetition'),
  writerInvoked: z.literal(false),
  canonCommitAllowed: z.literal(false),
  boundedRevisionExhausted: z.literal(true),
  initialMechanismIssues: z.array(z.string()),
  revisionMechanismIssues: z.array(z.string()),
  initialReview: z.unknown(),
  revisionReview: z.unknown(),
  decisionOptions: sceneAuthorDecisionOptionsSchema,
}).strict()

export const sceneAuthorDecisionSelectionSchema = z.object({
  schemaVersion: z.literal('creator-scene-author-decision-selection.v1'),
  decisionId: id,
  sessionId: id,
  intentId: id,
  intentRevision: z.number().int().positive(),
  optionId: id,
  authorConfirmed: z.literal(true),
  selectedAt: isoDate,
}).strict()

export const sceneAuthorDirectionDraftReviewSchema = z.object({
  schemaVersion: z.literal('creator-scene-author-direction-draft-review.v1'),
  decision: z.enum(['pass', 'reject']),
  axisChecks: z.array(z.object({
    axis: z.enum(['pressureSource', 'conflictEngine', 'agencyPattern', 'costPattern', 'endingPattern']),
    expectedValue: z.string().min(1).max(80),
    decision: z.enum(['pass', 'reject']),
    evidenceQuote: z.string().min(2).max(180).nullable(),
    diagnosis: z.string().min(8).max(240),
  }).strict()).length(5),
  proposedAdjustmentCheck: z.object({
    decision: z.enum(['pass', 'reject']),
    evidenceQuotes: z.array(z.string().min(2).max(180)).max(3),
    diagnosis: z.string().min(8).max(240),
  }).strict(),
  rationale: z.string().min(8).max(320),
}).strict()

export const manualRecallAdherenceReviewSchema = z.object({
  schemaVersion: z.literal('creator-manual-recall-adherence-review.v1'),
  decision: z.enum(['pass', 'reject']),
  checks: z.array(z.object({
    sourceId: id,
    group: z.enum(['causal', 'character_knowledge', 'timeline', 'promise']),
    status: z.enum(['fulfilled', 'respected', 'violated', 'omitted']),
    evidenceQuotes: z.array(z.string().min(2).max(180)).max(3),
    diagnosis: z.string().min(8).max(240),
  }).strict()).min(1),
  rationale: z.string().min(8).max(320),
}).strict()

export const creationSessionPhaseSchema = z.enum([
  'intent_discovery',
  'intent_locked',
  'candidate_search',
  'candidate_selected',
  'drafting',
  'reviewing',
  'canon_patch_pending',
  'canon_committed',
])

export const creationSessionSchema = z.object({
  schemaVersion: z.literal('creation-session.v1'),
  id,
  workId: id,
  chapterId: id,
  sceneId: id.nullable(),
  branchId: id,
  phase: creationSessionPhaseSchema,
  baseCanonRevision: z.number().int().nonnegative(),
  currentIntentRevision: z.number().int().nonnegative(),
  currentCandidateRevision: z.number().int().nonnegative(),
  currentDraftRevision: z.number().int().nonnegative(),
  lockedIntentId: id.nullable(),
  selectedCandidateId: id.nullable(),
  activeDraftId: id.nullable(),
  activeReviewId: id.nullable(),
  proposedCanonPatchId: id.nullable(),
  createdAt: isoDate,
  updatedAt: isoDate,
}).strict()

export const intentQuestionSchema = z.object({
  id,
  fieldPath: id,
  importance: z.enum(['blocking', 'material', 'optional']),
  question: id,
  reason: id,
  options: z.array(z.object({
    id,
    label: id,
    consequence: id,
    patch: unknownRecord,
  }).strict()),
  answeredBy: z.enum(['author', 'agent_assumption']).nullable(),
}).strict()

export const authorIntentContractSchema = z.object({
  schemaVersion: z.literal('author-intent.v1'),
  id,
  sessionId: id,
  revision: z.number().int().positive(),
  status: z.enum(['draft', 'locked', 'superseded']),
  readerExperience: z.object({
    startEmotion: z.string(),
    targetEmotion: z.string(),
    emotionalMovement: z.string(),
    intensity: z.enum(['restrained', 'moderate', 'explosive']),
  }).strict(),
  narrativeDelta: z.object({
    startingCondition: z.string(),
    endingCondition: z.string(),
    mustChange: z.string(),
    mustNotResolve: z.array(z.string()),
    irreversibleChange: z.string().nullable(),
  }).strict(),
  characterAgency: z.object({
    primaryActorId: z.string(),
    currentGoal: z.string(),
    requiredChoice: z.string(),
    opposingForce: z.string(),
    expectedCost: z.string(),
  }).strict(),
  informationPolicy: z.object({
    readerShouldKnow: z.array(z.string()),
    readerShouldSuspect: z.array(z.string()),
    charactersMustNotKnow: z.array(z.object({
      characterId: id,
      information: id,
    }).strict()),
    delayedReveals: z.array(z.string()),
  }).strict(),
  boundaries: z.object({
    requiredElements: z.array(z.string()),
    forbiddenEffects: z.array(z.string()),
    protectedCharacterTraits: z.array(z.string()),
  }).strict(),
  sceneMechanismDirection: sceneAuthorDecisionOptionSchema.extend({
    decisionId: id,
    pipelineId: id,
    selectedAt: isoDate,
  }).strict().optional(),
  fieldSources: z.record(z.string(), z.enum([
    'author_explicit',
    'author_selected',
    'agent_assumption',
    'existing_outline',
  ])),
  lockedFields: z.array(z.string()),
  agentAssumptions: z.array(z.string()),
  unresolvedQuestions: z.array(intentQuestionSchema),
  createdAt: isoDate,
  lockedAt: isoDate.nullable(),
}).strict()

export const statePatchOperationSchema = z.object({
  op: z.enum(['add', 'replace', 'remove']),
  path: id.refine(path => (
    !path.startsWith('/characters/') || parseCharacterStatePath(path) !== null
  ), {
    message: 'character state patches must target one of the supported 22 dimensions',
  }),
  expectedPreviousValue: z.unknown().optional(),
  value: z.unknown().optional(),
  evidenceBlockIds: z.array(id),
  reason: id,
  irreversible: z.boolean(),
}).strict()

export const narrativeBeatSchema = z.object({
  id,
  order: z.number().int().positive(),
  purpose: id,
  actingCharacterId: id,
  action: id,
  resistance: id,
  consequence: id,
  informationChange: z.string().nullable(),
  statePreconditions: z.array(z.string()),
  stateEffects: z.array(z.string()),
}).strict()

export const narrativeCandidateSchema = z.object({
  schemaVersion: z.literal('narrative-candidate.v1'),
  id,
  sessionId: id,
  intentRevision: z.number().int().positive(),
  contextSnapshotId: id,
  revision: z.number().int().positive(),
  status: z.enum(['active', 'selected', 'rejected', 'stale']),
  title: id,
  oneSentenceMechanism: id,
  mechanismSignature: z.object({
    pressureSource: z.enum(['environment', 'opponent', 'institution', 'relationship', 'body', 'time', 'resource', 'information']),
    conflictEngine: z.enum(['rescue', 'pursuit', 'negotiation', 'infiltration', 'escape', 'investigation', 'combat', 'survival', 'sacrifice', 'revelation']),
    agencyPattern: z.enum(['command', 'refusal', 'concealment', 'sacrifice', 'bargain', 'delegation', 'improvisation', 'endurance', 'pursuit', 'withdrawal']),
    costPattern: z.enum(['evidence_loss', 'injury', 'trust_loss', 'resource_loss', 'time_loss', 'exposure', 'position_loss', 'obligation', 'opportunity_loss', 'separation']),
    endingPattern: z.enum(['consequence_arrives', 'irreversible_loss', 'relationship_shift', 'opponent_gain', 'location_shift', 'promise_advanced', 'question_opened', 'temporary_relief', 'capability_change']),
  }).strict().optional(),
  strategyAxes: z.object({
    conflictMode: z.enum(['confrontation', 'concealment', 'misalignment', 'sacrifice', 'discovery', 'reversal']),
    informationMode: z.enum(['direct_reveal', 'delayed_reveal', 'dramatic_irony', 'false_belief', 'partial_reveal']),
    agencyOwnerId: id,
    costType: id,
    pacing: z.enum(['compressed', 'balanced', 'slow_burn']),
    viewpointId: id,
  }).strict(),
  beats: z.array(narrativeBeatSchema).min(3).max(7),
  projectedEffects: z.object({
    stateChanges: z.array(statePatchOperationSchema),
    irreversibleChanges: z.array(z.string()),
    promisesCreated: z.array(z.string()),
    promisesConsumed: z.array(z.string()),
    futureDebts: z.array(z.string()),
    characterCosts: z.array(z.string()),
  }).strict(),
  tradeoffs: z.object({
    strengths: z.array(z.string()),
    risks: z.array(z.string()),
    clicheRisks: z.array(z.string()),
    uncertainties: z.array(z.string()),
  }).strict(),
  validation: z.object({
    hardConstraintPassed: z.boolean(),
    violations: z.array(z.string()),
  }).strict(),
}).strict()

export const contextSnapshotSchema = z.object({
  schemaVersion: z.literal('context-snapshot.v1'),
  id,
  compilationPolicyVersion: z.number().int().nonnegative().default(0),
  sourceFingerprint: z.string().min(1).default('legacy-unfingerprinted'),
  contentFingerprint: z.string().min(1).default('legacy-unfingerprinted'),
  sessionId: id,
  intentRevision: z.number().int().positive(),
  workId: id,
  chapterId: id,
  sceneId: id.nullable(),
  canonRevision: z.number().int().nonnegative(),
  kernelRevision: z.number().int().nonnegative(),
  constraintRevision: z.number().int().nonnegative(),
  activeCharacters: z.array(z.object({
    id,
    goal: z.string(),
    belief: z.array(z.string()),
    knowledge: z.array(z.string()),
    falseBeliefs: z.array(z.string()),
    emotionalState: z.string(),
    resources: z.array(z.string()),
    state: unknownRecord.optional(),
  }).strict()),
  relevantRelationships: z.array(z.unknown()),
  activePromises: z.array(z.unknown()),
  unresolvedForeshadowing: z.array(z.unknown()),
  currentTimeline: z.unknown(),
  relevantWorldRules: z.array(z.unknown()),
  kernelRules: z.array(z.string()),
  hardConstraints: z.array(z.string()),
  relevantRegressionExamples: z.array(z.string()),
  recentSceneSummaries: z.array(z.object({
    sceneId: id,
    summary: z.string(),
    relevanceReason: id,
    mechanismSignature: z.object({
      pressureSource: z.enum(['environment', 'opponent', 'institution', 'relationship', 'body', 'time', 'resource', 'information']),
      conflictEngine: z.enum(['rescue', 'pursuit', 'negotiation', 'infiltration', 'escape', 'investigation', 'combat', 'survival', 'sacrifice', 'revelation']),
      agencyPattern: z.enum(['command', 'refusal', 'concealment', 'sacrifice', 'bargain', 'delegation', 'improvisation', 'endurance', 'pursuit', 'withdrawal']),
      costPattern: z.enum(['evidence_loss', 'injury', 'trust_loss', 'resource_loss', 'time_loss', 'exposure', 'position_loss', 'obligation', 'opportunity_loss', 'separation']),
      endingPattern: z.enum(['consequence_arrives', 'irreversible_loss', 'relationship_shift', 'opponent_gain', 'location_shift', 'promise_advanced', 'question_opened', 'temporary_relief', 'capability_change']),
    }).strict().optional(),
  }).strict()),
  styleSamples: z.array(z.object({
    sourceBlockId: id,
    text: z.string(),
    reason: id,
  }).strict()),
  manualRecallItems: z.array(z.object({
    id,
    sourceId: id,
    sourceRevision: z.number().int().nonnegative(),
    authority: z.enum(['canon', 'author', 'derived']),
    group: z.enum(['causal', 'character_knowledge', 'timeline', 'promise']),
    statement: z.string().min(1),
    sourceLabel: z.string().min(1),
    whyNow: z.string().min(1),
    locator: z.object({
      kind: z.enum(['chapter', 'asset', 'echo', 'canon']),
      targetId: id,
      label: z.string().min(1),
    }).strict(),
    sceneMechanismSignature: z.object({
      pressureSource: z.enum(['environment', 'opponent', 'institution', 'relationship', 'body', 'time', 'resource', 'information']),
      conflictEngine: z.enum(['rescue', 'pursuit', 'negotiation', 'infiltration', 'escape', 'investigation', 'combat', 'survival', 'sacrifice', 'revelation']),
      agencyPattern: z.enum(['command', 'refusal', 'concealment', 'sacrifice', 'bargain', 'delegation', 'improvisation', 'endurance', 'pursuit', 'withdrawal']),
      costPattern: z.enum(['evidence_loss', 'injury', 'trust_loss', 'resource_loss', 'time_loss', 'exposure', 'position_loss', 'obligation', 'opportunity_loss', 'separation']),
      endingPattern: z.enum(['consequence_arrives', 'irreversible_loss', 'relationship_shift', 'opponent_gain', 'location_shift', 'promise_advanced', 'question_opened', 'temporary_relief', 'capability_change']),
    }).strict().optional(),
  }).strict()).default([]),
  manifest: z.array(z.object({
    sourceId: id,
    sourceRevision: z.number().int().nonnegative(),
    authority: z.enum(['canon', 'author', 'derived']),
    includedReason: id,
  }).strict()),
  status: z.enum(['active', 'stale']),
  createdAt: isoDate,
}).strict()

export const draftBlockSchema = z.object({
  id,
  text: z.string(),
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().nonnegative(),
  protected: z.boolean(),
}).strict().refine(block => block.endOffset >= block.startOffset, {
  message: 'block offsets must be ordered',
})

const sceneDraftDirectionEvidenceSchema = z.object({
  blockId: id,
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().nonnegative(),
  excerptHash: id,
}).strict().refine(evidence => evidence.endOffset > evidence.startOffset, {
  message: 'direction receipt evidence offsets must be ordered',
})

export const sceneDraftDirectionReceiptSchema = z.object({
  schemaVersion: z.literal('scene-draft-direction-receipt.v1'),
  decision: z.literal('pass'),
  axisChecks: z.array(z.object({
    axis: z.enum(['pressureSource', 'conflictEngine', 'agencyPattern', 'costPattern', 'endingPattern']),
    expectedValue: id,
    evidence: z.array(sceneDraftDirectionEvidenceSchema).min(1),
  }).strict()).length(5),
  proposedAdjustmentEvidence: z.array(sceneDraftDirectionEvidenceSchema).min(1),
  reviewer: z.literal('Auditor'),
}).strict()

export const sceneDraftResultSchema = z.object({
  schemaVersion: z.literal('scene-draft.v1'),
  draftId: id,
  sessionId: id,
  baseCanonRevision: z.number().int().nonnegative(),
  baseIntentRevision: z.number().int().positive(),
  baseCandidateRevision: z.number().int().positive(),
  baseDraftRevision: z.number().int().nonnegative(),
  revision: z.number().int().positive(),
  contentBlocks: z.array(draftBlockSchema),
  unplannedFactProposals: z.array(z.string()),
  observedStateChanges: z.array(statePatchOperationSchema),
  directionReceipt: sceneDraftDirectionReceiptSchema.optional(),
  status: z.enum(['current', 'stale']),
  createdAt: isoDate,
}).strict()

export const literaryFindingSchema = z.object({
  id,
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
  evidence: z.array(z.object({
    blockId: id,
    startOffset: z.number().int().nonnegative(),
    endOffset: z.number().int().nonnegative(),
    excerptHash: id,
  }).strict()),
  expected: z.string(),
  observed: z.string(),
  readerImpact: z.string(),
  diagnosis: z.string(),
  repairDirection: z.string(),
  protectedBlockIds: z.array(id),
  confidence: z.enum(['high', 'medium', 'low']),
  status: z.enum(['active', 'dismissed', 'resolved', 'stale']),
}).strict()

export const advisoryLensIdSchema = z.enum([
  'pov_focalization',
  'dialogue_subtext',
  'prose_rhythm',
  'imagery_system',
  'theme_progression',
  'emotional_arc',
  'ending_payoff',
  'cultural_specificity',
])

export const writingAssistLensIdSchema = z.union([
  literaryFindingSchema.shape.dimension,
  advisoryLensIdSchema,
])

export const writingAssistRecommendationReasonCodeSchema = z.enum([
  'natural_review_checkpoint',
  'author_explicit_focus',
  'project_custom_selection',
  'manual_recall_active',
  'genre_kernel_emphasis',
])

export const creatorWritingAssistPreferencesSchema = z.object({
  schemaVersion: z.literal('creator-writing-assist-preferences.v1'),
  enabled: z.boolean(),
  selectionMode: z.enum(['recommended', 'custom']),
  projectLensIds: z.array(writingAssistLensIdSchema),
  triggerPolicy: z.literal('natural_checkpoints_only'),
  suppressedLensIds: z.array(writingAssistLensIdSchema),
}).strict()

export const writingAssistRecommendationSchema = z.object({
  schemaVersion: z.literal('writing-assist-recommendation.v1'),
  sessionId: id,
  contextSnapshotId: id,
  draftId: id,
  draftRevision: z.number().int().positive(),
  lensIds: z.array(writingAssistLensIdSchema).max(2),
  reasonCodes: z.array(writingAssistRecommendationReasonCodeSchema).min(1),
  status: z.enum(['proposed', 'accepted', 'dismissed', 'stale']),
  generatedAt: isoDate,
}).strict()

export const advisoryCraftFindingSchema = z.object({
  id,
  lensId: advisoryLensIdSchema,
  severity: z.enum(['revision_candidate', 'taste_note', 'preserve']),
  evidence: z.array(sceneDraftDirectionEvidenceSchema).min(1),
  diagnosis: z.string().min(1),
  readerEffectHypothesis: z.string().min(1),
  authorTradeoff: z.string().min(1),
  smallestExperiment: z.string().min(1),
  mappedExistingDimensions: z.array(literaryFindingSchema.shape.dimension).min(1),
  confidence: z.enum(['high', 'medium', 'low']),
  verification: z.enum(['unverified', 'verified', 'rejected']),
  status: z.enum(['active', 'deferred', 'dismissed', 'resolved', 'stale']),
}).strict()

export const extendedCraftReviewSchema = z.object({
  schemaVersion: z.literal('extended-craft-review.v1'),
  requestedLensIds: z.array(advisoryLensIdSchema),
  findings: z.array(advisoryCraftFindingSchema),
  verificationReceipt: z.object({
    schemaVersion: z.literal('advisory-craft-verification-receipt.v1'),
    reviewId: id,
    reviewer: z.literal('Auditor'),
    verifiedFindingIds: z.array(id),
    rejectedFindingIds: z.array(id),
    compositeLiteraryScoreUsed: z.literal(false),
  }).strict().optional(),
  compositeLiteraryScoreUsed: z.literal(false),
}).strict()

export const literaryReviewSchema = z.object({
  schemaVersion: z.literal('literary-review.v1'),
  id,
  sessionId: id,
  contextSnapshotId: id.default('legacy-unbound-context'),
  contextCompilationPolicyVersion: z.number().int().nonnegative().default(0),
  contextSourceFingerprint: z.string().min(1).default('legacy-unfingerprinted'),
  contextSnapshotFingerprint: z.string().min(1).default('legacy-unfingerprinted'),
  draftId: id,
  baseCanonRevision: z.number().int().nonnegative(),
  baseIntentRevision: z.number().int().positive(),
  baseCandidateRevision: z.number().int().positive(),
  baseDraftRevision: z.number().int().positive(),
  findings: z.array(literaryFindingSchema),
  extendedCraft: extendedCraftReviewSchema.optional(),
  modelFindingVerification: z.object({
    schemaVersion: z.literal('literary-finding-verification-receipt.v1'),
    reviewId: id,
    reviewer: z.literal('Auditor'),
    verifiedFindingIds: z.array(id),
    rejectedFindingIds: z.array(id),
    compositeLiteraryScoreUsed: z.literal(false),
  }).strict().optional(),
  manualRecallAdherence: z.object({
    schemaVersion: z.literal('manual-recall-adherence-receipt.v1'),
    decision: z.enum(['pass', 'reject']),
    checks: z.array(z.object({
      sourceId: id,
      group: z.enum(['causal', 'character_knowledge', 'timeline', 'promise']),
      status: z.enum(['fulfilled', 'respected', 'violated', 'omitted']),
      evidence: z.array(z.object({
        blockId: id,
        startOffset: z.number().int().nonnegative(),
        endOffset: z.number().int().nonnegative(),
        excerptHash: id,
      }).strict()),
      diagnosis: z.string().min(8).max(240),
    }).strict()).min(1),
    reviewer: z.literal('Auditor'),
    compositeLiteraryScoreUsed: z.literal(false),
  }).strict().optional(),
  requestedFocusDimensions: z.array(z.enum([
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
  ])).optional(),
  deterministicViolations: z.array(z.string()),
  status: z.enum(['active', 'stale']),
  createdAt: isoDate,
}).strict()

export const repairProposalSchema = z.object({
  schemaVersion: z.literal('repair-proposal.v1'),
  id,
  reviewId: id,
  findingId: id,
  findingSource: z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('existing_product'),
      dimension: literaryFindingSchema.shape.dimension,
    }).strict(),
    z.object({
      kind: z.literal('advisory_lens'),
      lensId: advisoryLensIdSchema,
    }).strict(),
  ]).optional(),
  baseDraftRevision: z.number().int().positive(),
  operation: z.enum(['replace_range', 'insert_after', 'delete_range', 'offer_variants']),
  targetBlockIds: z.array(id).min(1),
  preservedFacts: z.array(z.string()),
  preservedBlockIds: z.array(id),
  proposedContent: z.string().nullable(),
  verification: z.lazy(() => localRepairReviewSchema).nullable().optional(),
  status: z.enum(['proposed', 'accepted', 'rejected', 'stale']),
  createdAt: isoDate.optional(),
}).strict()

export const localRepairCandidateSchema = z.object({
  schemaVersion: z.literal('creator-local-repair.v1'),
  findingId: id,
  targetBlockId: id,
  operation: z.literal('replace_range'),
  proposedContent: z.string().min(1).max(12_000),
  preservedFacts: z.array(z.object({
    fact: z.string().min(1).max(240),
    sourceEvidenceQuote: z.string().min(1).max(240),
    candidateEvidenceQuote: z.string().min(1).max(240),
  }).strict()).min(1).max(12),
  rationale: z.string().min(4).max(320),
}).strict()

export const localRepairReviewSchema = z.object({
  schemaVersion: z.literal('creator-local-repair-review.v1'),
  findingId: id,
  targetBlockId: id,
  decision: z.enum(['pass', 'reject']),
  verifiedPreservedFactIndexes: z.array(z.number().int().min(0).max(11)).max(12).default([]),
  issues: z.array(z.object({
    dimension: z.enum([
      'repair_goal',
      'fact_preservation',
      'author_intent',
      'scope',
      'continuity',
      'character_knowledge',
      'timeline',
      'causality',
      'promise',
      'voice',
    ]),
    severity: z.enum(['hard_block', 'revision_candidate']),
    sourceEvidenceQuote: z.string().min(1).max(240).nullable(),
    candidateEvidenceQuote: z.string().min(1).max(240).nullable(),
    diagnosis: z.string().min(4).max(320),
  }).strict()).max(8),
  rationale: z.string().min(4).max(320),
}).strict().superRefine((value, context) => {
  if (value.decision === 'pass' && value.issues.length > 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['issues'],
      message: 'a passing local repair review cannot contain unresolved issues',
    })
  }
  if (value.decision === 'reject' && value.issues.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['issues'],
      message: 'a rejected local repair review must locate at least one issue',
    })
  }
  value.issues.forEach((issue, index) => {
    if (!issue.sourceEvidenceQuote && !issue.candidateEvidenceQuote) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['issues', index],
        message: 'a local repair review issue must locate source or candidate evidence',
      })
    }
  })
})

export const canonStatePatchSchema = z.object({
  schemaVersion: z.literal('canon-state-patch.v1'),
  id,
  sessionId: id,
  workId: id,
  chapterId: id,
  baseCanonRevision: z.number().int().nonnegative(),
  sourceDraftRevision: z.number().int().positive(),
  status: z.enum(['proposed', 'approved', 'committed', 'rejected', 'stale']),
  operations: z.array(statePatchOperationSchema),
  createdAt: isoDate,
}).strict()

export const historicalStateBackfillProposalSchema = z.object({
  schemaVersion: z.literal('historical-state-backfill.v1'),
  id,
  sessionId: id,
  workId: id,
  chapterId: id,
  branchId: id,
  canonId: id,
  baseCanonRevision: z.number().int().nonnegative(),
  sourceDraftId: id,
  sourceDraftRevision: z.number().int().positive(),
  status: z.enum(['proposed', 'committed', 'rejected', 'stale']),
  operations: z.array(statePatchOperationSchema),
  createdAt: isoDate,
  confirmedAt: isoDate.nullable(),
  committedAt: isoDate.nullable(),
}).strict()

export const canonPatchRecordSchema = z.union([
  canonStatePatchSchema,
  historicalStateBackfillProposalSchema,
])

export const localCanonStateRecordSchema = z.object({
  schemaVersion: z.literal('local-canon-state.v1'),
  id,
  workId: id,
  chapterId: id,
  branchId: id,
  revision: z.number().int().nonnegative(),
  acceptedDraftId: id.nullable(),
  acceptedDraftRevision: z.number().int().nonnegative(),
  acceptedContentBlocks: z.array(draftBlockSchema),
  state: unknownRecord,
  committedPatchId: id.nullable(),
  committedAt: isoDate,
}).strict()

export const creationDecisionEventSchema = z.object({
  schemaVersion: z.literal('creation-decision-event.v1'),
  id,
  sessionId: id,
  type: z.enum([
    'session_started',
    'intent_proposed',
    'intent_answered',
    'intent_locked',
    'scene_author_decision_requested',
    'scene_author_decision_selected',
    'context_refreshed',
    'candidates_generated',
    'candidate_selected',
    'candidates_mixed',
    'candidate_rejected',
    'draft_generated',
    'draft_edited',
    'review_completed',
    'finding_accepted',
    'finding_deferred',
    'finding_dismissed',
    'repair_rejected',
    'preference_remembered',
    'canon_patch_proposed',
    'canon_patch_confirmed',
    'canon_patch_committed',
    'historical_state_backfill_proposed',
    'historical_state_backfill_confirmed',
    'historical_state_backfill_committed',
    'historical_state_backfill_rejected',
  ]),
  actor: z.enum(['author', 'agent', 'system']),
  sourceRevision: z.number().int().nonnegative(),
  payload: unknownRecord,
  occurredAt: isoDate,
}).strict()
