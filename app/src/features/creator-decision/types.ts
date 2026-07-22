import type { CharacterStateSnapshot } from './characterState'
import type {
  CharacterSimulationRequest,
  CharacterSimulationResult,
} from './characterSimulation'

export type CreationSessionPhase =
  | 'intent_discovery'
  | 'intent_locked'
  | 'candidate_search'
  | 'candidate_selected'
  | 'drafting'
  | 'reviewing'
  | 'canon_patch_pending'
  | 'canon_committed'

export type IntentFieldSource =
  | 'author_explicit'
  | 'author_selected'
  | 'agent_assumption'
  | 'existing_outline'

export type CreationDecisionDerivedStatus = 'active' | 'stale'

export interface CreationSession {
  schemaVersion: 'creation-session.v1'
  id: string
  workId: string
  chapterId: string
  sceneId: string | null
  branchId: string
  phase: CreationSessionPhase
  baseCanonRevision: number
  currentIntentRevision: number
  currentCandidateRevision: number
  currentDraftRevision: number
  lockedIntentId: string | null
  selectedCandidateId: string | null
  activeDraftId: string | null
  activeReviewId: string | null
  proposedCanonPatchId: string | null
  createdAt: string
  updatedAt: string
}

export interface IntentQuestionOption {
  id: string
  label: string
  consequence: string
  patch: Record<string, unknown>
}

export interface IntentQuestion {
  id: string
  fieldPath: string
  importance: 'blocking' | 'material' | 'optional'
  question: string
  reason: string
  options: IntentQuestionOption[]
  answeredBy: 'author' | 'agent_assumption' | null
}

export interface AuthorIntentContract {
  schemaVersion: 'author-intent.v1'
  id: string
  sessionId: string
  revision: number
  status: 'draft' | 'locked' | 'superseded'
  readerExperience: {
    startEmotion: string
    targetEmotion: string
    emotionalMovement: string
    intensity: 'restrained' | 'moderate' | 'explosive'
  }
  narrativeDelta: {
    startingCondition: string
    endingCondition: string
    mustChange: string
    mustNotResolve: string[]
    irreversibleChange: string | null
  }
  characterAgency: {
    primaryActorId: string
    currentGoal: string
    requiredChoice: string
    opposingForce: string
    expectedCost: string
  }
  informationPolicy: {
    readerShouldKnow: string[]
    readerShouldSuspect: string[]
    charactersMustNotKnow: Array<{
      characterId: string
      information: string
    }>
    delayedReveals: string[]
  }
  boundaries: {
    requiredElements: string[]
    forbiddenEffects: string[]
    protectedCharacterTraits: string[]
  }
  sceneMechanismDirection?: SceneMechanismDirection
  fieldSources: Record<string, IntentFieldSource>
  lockedFields: string[]
  agentAssumptions: string[]
  unresolvedQuestions: IntentQuestion[]
  createdAt: string
  lockedAt: string | null
}

export type ConflictMode =
  | 'confrontation'
  | 'concealment'
  | 'misalignment'
  | 'sacrifice'
  | 'discovery'
  | 'reversal'

export type InformationMode =
  | 'direct_reveal'
  | 'delayed_reveal'
  | 'dramatic_irony'
  | 'false_belief'
  | 'partial_reveal'

export interface NarrativeBeat {
  id: string
  order: number
  purpose: string
  actingCharacterId: string
  action: string
  resistance: string
  consequence: string
  informationChange: string | null
  statePreconditions: string[]
  stateEffects: string[]
}

export interface StatePatchOperation {
  op: 'add' | 'replace' | 'remove'
  path: string
  expectedPreviousValue?: unknown
  value?: unknown
  evidenceBlockIds: string[]
  reason: string
  irreversible: boolean
}

export interface NarrativeCandidate {
  schemaVersion: 'narrative-candidate.v1'
  id: string
  sessionId: string
  intentRevision: number
  contextSnapshotId: string
  revision: number
  status: 'active' | 'selected' | 'rejected' | 'stale'
  title: string
  oneSentenceMechanism: string
  mechanismSignature?: SceneMechanismSignature
  strategyAxes: {
    conflictMode: ConflictMode
    informationMode: InformationMode
    agencyOwnerId: string
    costType: string
    pacing: 'compressed' | 'balanced' | 'slow_burn'
    viewpointId: string
  }
  beats: NarrativeBeat[]
  projectedEffects: {
    stateChanges: StatePatchOperation[]
    irreversibleChanges: string[]
    promisesCreated: string[]
    promisesConsumed: string[]
    futureDebts: string[]
    characterCosts: string[]
  }
  tradeoffs: {
    strengths: string[]
    risks: string[]
    clicheRisks: string[]
    uncertainties: string[]
  }
  validation: {
    hardConstraintPassed: boolean
    violations: string[]
  }
}

export interface CandidateAssessment {
  candidateId: string
  intentFit: number
  characterAgency: number
  tensionPotential: number
  informationControl: number
  continuitySafety: number
  freshness: number
  futureDebtFitness: number
}

export interface ContextSnapshotManifestEntry {
  sourceId: string
  sourceRevision: number
  authority: 'canon' | 'author' | 'derived'
  includedReason: string
}

export type ManualRecallGroup =
  | 'causal'
  | 'character_knowledge'
  | 'timeline'
  | 'promise'

export type ScenePressureSource =
  | 'environment'
  | 'opponent'
  | 'institution'
  | 'relationship'
  | 'body'
  | 'time'
  | 'resource'
  | 'information'

export type SceneConflictEngine =
  | 'rescue'
  | 'pursuit'
  | 'negotiation'
  | 'infiltration'
  | 'escape'
  | 'investigation'
  | 'combat'
  | 'survival'
  | 'sacrifice'
  | 'revelation'

export type SceneAgencyPattern =
  | 'command'
  | 'refusal'
  | 'concealment'
  | 'sacrifice'
  | 'bargain'
  | 'delegation'
  | 'improvisation'
  | 'endurance'
  | 'pursuit'
  | 'withdrawal'

export type SceneCostPattern =
  | 'evidence_loss'
  | 'injury'
  | 'trust_loss'
  | 'resource_loss'
  | 'time_loss'
  | 'exposure'
  | 'position_loss'
  | 'obligation'
  | 'opportunity_loss'
  | 'separation'

export type SceneEndingPattern =
  | 'consequence_arrives'
  | 'irreversible_loss'
  | 'relationship_shift'
  | 'opponent_gain'
  | 'location_shift'
  | 'promise_advanced'
  | 'question_opened'
  | 'temporary_relief'
  | 'capability_change'

export interface SceneMechanismSignature {
  pressureSource: ScenePressureSource
  conflictEngine: SceneConflictEngine
  agencyPattern: SceneAgencyPattern
  costPattern: SceneCostPattern
  endingPattern: SceneEndingPattern
}

export type SceneMechanismAxis = keyof SceneMechanismSignature

export type SceneArchitectureReviewIssueCode =
  | 'signature_mismatch'
  | 'superficial_difference'
  | 'causal_chain_repetition'
  | 'ending_repetition'

export interface SceneAuthorDecisionOption {
  id: string
  label: string
  primaryChangedAxis: SceneMechanismAxis
  proposedAdjustment: string
  preservedAuthorIntent: string[]
  addressesIssueCodes: SceneArchitectureReviewIssueCode[]
  whyItBreaksRepetition: string
  expectedMechanismSignature: SceneMechanismSignature
  tradeoff: string
}

export interface SceneAuthorDecisionOptions {
  schemaVersion: 'creator-scene-author-decision-options.v1'
  question: string
  options: SceneAuthorDecisionOption[]
  requiresAuthorSelection: true
  writerInvoked: false
  canonCommitAllowed: false
}

export interface SceneAuthorDecisionRequired {
  schemaVersion: 'creator-author-decision-required.v1'
  decisionId: string
  pipelineId: string
  sessionId: string
  intentId: string
  intentRevision: number
  reason: 'scene_architecture_repetition'
  writerInvoked: false
  canonCommitAllowed: false
  boundedRevisionExhausted: true
  initialMechanismIssues: string[]
  revisionMechanismIssues: string[]
  initialReview: unknown
  revisionReview: unknown
  decisionOptions: SceneAuthorDecisionOptions
}

export interface SceneAuthorDecisionSelection {
  schemaVersion: 'creator-scene-author-decision-selection.v1'
  decisionId: string
  sessionId: string
  intentId: string
  intentRevision: number
  optionId: string
  authorConfirmed: true
  selectedAt: string
}

export interface SceneAuthorDirectionDraftAxisCheck {
  axis: SceneMechanismAxis
  expectedValue: string
  decision: 'pass' | 'reject'
  evidenceQuote: string | null
  diagnosis: string
}

export interface SceneAuthorDirectionDraftReview {
  schemaVersion: 'creator-scene-author-direction-draft-review.v1'
  decision: 'pass' | 'reject'
  axisChecks: SceneAuthorDirectionDraftAxisCheck[]
  proposedAdjustmentCheck: {
    decision: 'pass' | 'reject'
    evidenceQuotes: string[]
    diagnosis: string
  }
  rationale: string
}

export type ManualRecallAdherenceStatus =
  | 'fulfilled'
  | 'respected'
  | 'violated'
  | 'omitted'

export interface ManualRecallAdherenceReview {
  schemaVersion: 'creator-manual-recall-adherence-review.v1'
  decision: 'pass' | 'reject'
  checks: Array<{
    sourceId: string
    group: ManualRecallGroup
    status: ManualRecallAdherenceStatus
    evidenceQuotes: string[]
    diagnosis: string
  }>
  rationale: string
}

export interface SceneMechanismDirection extends SceneAuthorDecisionOption {
  decisionId: string
  pipelineId: string
  selectedAt: string
}

export interface ManualRecallItem {
  id: string
  sourceId: string
  sourceRevision: number
  authority: ContextSnapshotManifestEntry['authority']
  group: ManualRecallGroup
  statement: string
  sourceLabel: string
  whyNow: string
  locator: {
    kind: 'chapter' | 'asset' | 'echo' | 'canon'
    targetId: string
    label: string
  }
  sceneMechanismSignature?: SceneMechanismSignature
}

export interface ContextSnapshot {
  schemaVersion: 'context-snapshot.v1'
  id: string
  compilationPolicyVersion: number
  sourceFingerprint: string
  contentFingerprint: string
  sessionId: string
  intentRevision: number
  workId: string
  chapterId: string
  sceneId: string | null
  canonRevision: number
  kernelRevision: number
  constraintRevision: number
  activeCharacters: Array<{
    id: string
    goal: string
    belief: string[]
    knowledge: string[]
    falseBeliefs: string[]
    emotionalState: string
    resources: string[]
    state?: CharacterStateSnapshot & Record<string, unknown>
  }>
  relevantRelationships: unknown[]
  activePromises: unknown[]
  unresolvedForeshadowing: unknown[]
  currentTimeline: unknown
  relevantWorldRules: unknown[]
  kernelRules: string[]
  hardConstraints: string[]
  relevantRegressionExamples: string[]
  recentSceneSummaries: Array<{
    sceneId: string
    summary: string
    relevanceReason: string
    mechanismSignature?: SceneMechanismSignature
  }>
  styleSamples: Array<{
    sourceBlockId: string
    text: string
    reason: string
  }>
  manualRecallItems: ManualRecallItem[]
  manifest: ContextSnapshotManifestEntry[]
  status: CreationDecisionDerivedStatus
  createdAt: string
}

export interface DraftBlock {
  id: string
  text: string
  startOffset: number
  endOffset: number
  protected: boolean
}

export interface SceneDraftScope {
  type: 'scene' | 'selected_beats' | 'selected_text'
  sceneId: string | null
  beatIds: string[]
  selectedBlockIds: string[]
}

export interface SceneDraftRequest {
  sessionId: string
  intentId: string
  intentRevision: number
  candidateId: string
  candidateRevision: number
  contextSnapshotId: string
  baseCanonRevision: number
  baseDraftRevision: number
  scope: SceneDraftScope
  protectedBlockIds: string[]
  targetLength: {
    minimum: number
    maximum: number
  }
  writingMode: 'agent_first_draft' | 'continue_author_text' | 'rewrite_selected_range'
  chapterNumber?: number | null
}

export interface SceneDraftResult {
  schemaVersion: 'scene-draft.v1'
  draftId: string
  sessionId: string
  baseCanonRevision: number
  baseIntentRevision: number
  baseCandidateRevision: number
  baseDraftRevision: number
  revision: number
  contentBlocks: DraftBlock[]
  unplannedFactProposals: string[]
  observedStateChanges: StatePatchOperation[]
  directionReceipt?: SceneDraftDirectionReceipt
  status: 'current' | 'stale'
  createdAt: string
}

export type FindingSeverity =
  | 'hard_block'
  | 'revision_candidate'
  | 'taste_note'
  | 'preserve'

export const literaryDimensions = [
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
] as const

export type LiteraryDimension = typeof literaryDimensions[number]

export const advisoryLensIds = [
  'pov_focalization',
  'dialogue_subtext',
  'prose_rhythm',
  'imagery_system',
  'theme_progression',
  'emotional_arc',
  'ending_payoff',
  'cultural_specificity',
] as const

export type AdvisoryLensId = typeof advisoryLensIds[number]

export type WritingAssistLensId = LiteraryDimension | AdvisoryLensId

export const writingAssistRecommendationReasonCodes = [
  'natural_review_checkpoint',
  'author_explicit_focus',
  'project_custom_selection',
  'manual_recall_active',
  'genre_kernel_emphasis',
] as const

export type WritingAssistRecommendationReasonCode =
  typeof writingAssistRecommendationReasonCodes[number]

export interface CreatorWritingAssistPreferences {
  schemaVersion: 'creator-writing-assist-preferences.v1'
  enabled: boolean
  selectionMode: 'recommended' | 'custom'
  projectLensIds: WritingAssistLensId[]
  triggerPolicy: 'natural_checkpoints_only'
  suppressedLensIds: WritingAssistLensId[]
}

export interface WritingAssistRecommendation {
  schemaVersion: 'writing-assist-recommendation.v1'
  sessionId: string
  contextSnapshotId: string
  draftId: string
  draftRevision: number
  lensIds: WritingAssistLensId[]
  reasonCodes: WritingAssistRecommendationReasonCode[]
  status: 'proposed' | 'accepted' | 'dismissed' | 'stale'
  generatedAt: string
}

export interface LiteraryEvidence {
  blockId: string
  startOffset: number
  endOffset: number
  excerptHash: string
}

export interface SceneDraftDirectionReceipt {
  schemaVersion: 'scene-draft-direction-receipt.v1'
  decision: 'pass'
  axisChecks: Array<{
    axis: SceneMechanismAxis
    expectedValue: string
    evidence: LiteraryEvidence[]
  }>
  proposedAdjustmentEvidence: LiteraryEvidence[]
  reviewer: 'Auditor'
}

export interface LiteraryFinding {
  id: string
  dimension: LiteraryDimension
  severity: FindingSeverity
  evidence: LiteraryEvidence[]
  expected: string
  observed: string
  readerImpact: string
  diagnosis: string
  repairDirection: string
  protectedBlockIds: string[]
  confidence: 'high' | 'medium' | 'low'
  status: 'active' | 'dismissed' | 'resolved' | 'stale'
}

export interface AdvisoryCraftFinding {
  id: string
  lensId: AdvisoryLensId
  severity: 'revision_candidate' | 'taste_note' | 'preserve'
  evidence: LiteraryEvidence[]
  diagnosis: string
  readerEffectHypothesis: string
  authorTradeoff: string
  smallestExperiment: string
  mappedExistingDimensions: LiteraryDimension[]
  confidence: 'high' | 'medium' | 'low'
  verification: 'unverified' | 'verified' | 'rejected'
  status: 'active' | 'deferred' | 'dismissed' | 'resolved' | 'stale'
}

interface LocalRepairFindingBase {
  id: string
  evidence: LiteraryEvidence[]
  diagnosis: string
  repairDirection: string
  protectedBlockIds: string[]
  confidence: 'high' | 'medium' | 'low'
}

export type LocalRepairFinding =
  | (LocalRepairFindingBase & {
      source: 'existing_product'
      dimension: LiteraryDimension
      severity: FindingSeverity
    })
  | (LocalRepairFindingBase & {
      source: 'advisory_lens'
      lensId: AdvisoryLensId
      mappedExistingDimensions: LiteraryDimension[]
      severity: 'revision_candidate'
    })

export interface ExtendedCraftReview {
  schemaVersion: 'extended-craft-review.v1'
  requestedLensIds: AdvisoryLensId[]
  findings: AdvisoryCraftFinding[]
  verificationReceipt?: AdvisoryCraftVerificationReceipt
  compositeLiteraryScoreUsed: false
}

export interface AdvisoryCraftVerificationReceipt {
  schemaVersion: 'advisory-craft-verification-receipt.v1'
  reviewId: string
  reviewer: 'Auditor'
  verifiedFindingIds: string[]
  rejectedFindingIds: string[]
  compositeLiteraryScoreUsed: false
}

export interface LiteraryReview {
  schemaVersion: 'literary-review.v1'
  id: string
  sessionId: string
  contextSnapshotId: string
  contextCompilationPolicyVersion: number
  contextSourceFingerprint: string
  contextSnapshotFingerprint: string
  draftId: string
  baseCanonRevision: number
  baseIntentRevision: number
  baseCandidateRevision: number
  baseDraftRevision: number
  findings: LiteraryFinding[]
  extendedCraft?: ExtendedCraftReview
  modelFindingVerification?: LiteraryFindingVerificationReceipt
  manualRecallAdherence?: ManualRecallAdherenceReceipt
  requestedFocusDimensions?: LiteraryDimension[]
  deterministicViolations: string[]
  status: CreationDecisionDerivedStatus
  createdAt: string
}

export interface ManualRecallAdherenceReceipt {
  schemaVersion: 'manual-recall-adherence-receipt.v1'
  decision: 'pass' | 'reject'
  checks: Array<{
    sourceId: string
    group: ManualRecallGroup
    status: ManualRecallAdherenceStatus
    evidence: LiteraryEvidence[]
    diagnosis: string
  }>
  reviewer: 'Auditor'
  compositeLiteraryScoreUsed: false
}

export interface LiteraryFindingVerificationReceipt {
  schemaVersion: 'literary-finding-verification-receipt.v1'
  reviewId: string
  reviewer: 'Auditor'
  verifiedFindingIds: string[]
  rejectedFindingIds: string[]
  compositeLiteraryScoreUsed: false
}

export interface RepairProposal {
  schemaVersion: 'repair-proposal.v1'
  id: string
  reviewId: string
  findingId: string
  findingSource?:
    | { kind: 'existing_product'; dimension: LiteraryDimension }
    | { kind: 'advisory_lens'; lensId: AdvisoryLensId }
  baseDraftRevision: number
  operation: 'replace_range' | 'insert_after' | 'delete_range' | 'offer_variants'
  targetBlockIds: string[]
  preservedFacts: string[]
  preservedBlockIds: string[]
  proposedContent: string | null
  verification?: LocalRepairReview | null
  status: 'proposed' | 'accepted' | 'rejected' | 'stale'
  createdAt?: string
}

export interface LocalRepairCandidate {
  schemaVersion: 'creator-local-repair.v1'
  findingId: string
  targetBlockId: string
  operation: 'replace_range'
  proposedContent: string
  preservedFacts: LocalRepairPreservedFactEvidence[]
  rationale: string
}

export interface LocalRepairPreservedFactEvidence {
  fact: string
  sourceEvidenceQuote: string
  candidateEvidenceQuote: string
}

export type LocalRepairReviewDimension =
  | 'repair_goal'
  | 'fact_preservation'
  | 'author_intent'
  | 'scope'
  | 'continuity'
  | 'character_knowledge'
  | 'timeline'
  | 'causality'
  | 'promise'
  | 'voice'

export interface LocalRepairReviewIssue {
  dimension: LocalRepairReviewDimension
  severity: 'hard_block' | 'revision_candidate'
  sourceEvidenceQuote: string | null
  candidateEvidenceQuote: string | null
  diagnosis: string
}

export interface LocalRepairReview {
  schemaVersion: 'creator-local-repair-review.v1'
  findingId: string
  targetBlockId: string
  decision: 'pass' | 'reject'
  verifiedPreservedFactIndexes: number[]
  issues: LocalRepairReviewIssue[]
  rationale: string
}

export interface CanonStatePatch {
  schemaVersion: 'canon-state-patch.v1'
  id: string
  sessionId: string
  workId: string
  chapterId: string
  baseCanonRevision: number
  sourceDraftRevision: number
  status: 'proposed' | 'approved' | 'committed' | 'rejected' | 'stale'
  operations: StatePatchOperation[]
  createdAt: string
}

export interface HistoricalStateBackfillProposal {
  schemaVersion: 'historical-state-backfill.v1'
  id: string
  sessionId: string
  workId: string
  chapterId: string
  branchId: string
  canonId: string
  baseCanonRevision: number
  sourceDraftId: string
  sourceDraftRevision: number
  status: 'proposed' | 'committed' | 'rejected' | 'stale'
  operations: StatePatchOperation[]
  createdAt: string
  confirmedAt: string | null
  committedAt: string | null
}

export interface LocalCanonStateRecord {
  schemaVersion: 'local-canon-state.v1'
  id: string
  workId: string
  chapterId: string
  branchId: string
  revision: number
  acceptedDraftId: string | null
  acceptedDraftRevision: number
  acceptedContentBlocks: DraftBlock[]
  state: Record<string, unknown>
  committedPatchId: string | null
  committedAt: string
}

export type CreationDecisionEventType =
  | 'session_started'
  | 'intent_proposed'
  | 'intent_answered'
  | 'intent_locked'
  | 'scene_author_decision_requested'
  | 'scene_author_decision_selected'
  | 'context_refreshed'
  | 'candidates_generated'
  | 'candidate_selected'
  | 'candidates_mixed'
  | 'candidate_rejected'
  | 'draft_generated'
  | 'draft_edited'
  | 'review_completed'
  | 'finding_accepted'
  | 'finding_deferred'
  | 'finding_dismissed'
  | 'repair_rejected'
  | 'preference_remembered'
  | 'canon_patch_proposed'
  | 'canon_patch_confirmed'
  | 'canon_patch_committed'
  | 'historical_state_backfill_proposed'
  | 'historical_state_backfill_confirmed'
  | 'historical_state_backfill_committed'
  | 'historical_state_backfill_rejected'

export interface CreationDecisionEvent {
  schemaVersion: 'creation-decision-event.v1'
  id: string
  sessionId: string
  type: CreationDecisionEventType
  actor: 'author' | 'agent' | 'system'
  sourceRevision: number
  payload: Record<string, unknown>
  occurredAt: string
}

export interface CreationContextSource {
  canonRevision: number
  kernelRevision: number
  constraintRevision: number
  activeCharacters: ContextSnapshot['activeCharacters']
  relevantRelationships: unknown[]
  activePromises: unknown[]
  unresolvedForeshadowing: unknown[]
  currentTimeline: unknown
  relevantWorldRules: unknown[]
  kernelRules: string[]
  hardConstraints: string[]
  relevantRegressionExamples: string[]
  recentSceneSummaries: ContextSnapshot['recentSceneSummaries']
  styleSamples: ContextSnapshot['styleSamples']
  manualRecallItems?: ManualRecallItem[]
  manifest: ContextSnapshotManifestEntry[]
}

export interface CandidateSearchResult {
  rawCandidateCount: number
  validCandidateCount: number
  candidates: NarrativeCandidate[]
  assessments: CandidateAssessment[]
  notice: string | null
}

export interface CreationDecisionSnapshot {
  session: CreationSession
  intents: AuthorIntentContract[]
  contexts: ContextSnapshot[]
  candidates: NarrativeCandidate[]
  drafts: SceneDraftResult[]
  reviews: LiteraryReview[]
  repairs: RepairProposal[]
  patches: CanonStatePatch[]
  canon: LocalCanonStateRecord | null
  events: CreationDecisionEvent[]
}

export interface CanonCommitInput {
  session: CreationSession
  intent: AuthorIntentContract
  context: ContextSnapshot
  draft: SceneDraftResult
  review: LiteraryReview
  repairs: RepairProposal[]
  patch: CanonStatePatch
  currentCanon: LocalCanonStateRecord | null
  authorConfirmed: boolean
  confirmedAt: string
}

export interface CanonCommitResult {
  session: CreationSession
  patch: CanonStatePatch
  canon: LocalCanonStateRecord
  confirmationEvent: CreationDecisionEvent
  event: CreationDecisionEvent
}

export interface HistoricalStateBackfillCommitInput {
  proposal: HistoricalStateBackfillProposal
  currentCanon: LocalCanonStateRecord | null
  authorConfirmed: boolean
  confirmedAt: string
}

export interface HistoricalStateBackfillCommitResult {
  proposal: HistoricalStateBackfillProposal
  canon: LocalCanonStateRecord
  confirmationEvent: CreationDecisionEvent
  event: CreationDecisionEvent
}

export interface CreationDecisionRepository {
  loadSession(id: string): Promise<CreationSession | null>
  loadSessionSnapshot(id: string): Promise<CreationDecisionSnapshot | null>
  saveSession(session: CreationSession): Promise<void>
  saveIntent(intent: AuthorIntentContract): Promise<void>
  listIntents(sessionId: string): Promise<AuthorIntentContract[]>
  saveContext(context: ContextSnapshot): Promise<void>
  listContexts(sessionId: string): Promise<ContextSnapshot[]>
  saveCandidates(candidates: NarrativeCandidate[]): Promise<void>
  listCandidates(sessionId: string): Promise<NarrativeCandidate[]>
  saveDraft(draft: SceneDraftResult): Promise<void>
  listDrafts(sessionId: string): Promise<SceneDraftResult[]>
  saveReview(review: LiteraryReview): Promise<void>
  listReviews(sessionId: string): Promise<LiteraryReview[]>
  saveRepair(repair: RepairProposal): Promise<void>
  listRepairs(sessionId: string): Promise<RepairProposal[]>
  saveCanonPatch(patch: CanonStatePatch): Promise<void>
  listCanonPatches(sessionId: string): Promise<CanonStatePatch[]>
  saveHistoricalStateBackfill(proposal: HistoricalStateBackfillProposal): Promise<void>
  listHistoricalStateBackfills(sessionId: string): Promise<HistoricalStateBackfillProposal[]>
  loadCanonState(workId: string, chapterId: string): Promise<LocalCanonStateRecord | null>
  saveCanonState(canon: LocalCanonStateRecord): Promise<void>
  appendEvent(event: CreationDecisionEvent): Promise<void>
  listEvents(sessionId: string): Promise<CreationDecisionEvent[]>
  commitCanon(input: CanonCommitInput): Promise<CanonCommitResult>
  commitHistoricalStateBackfill(
    input: HistoricalStateBackfillCommitInput,
  ): Promise<HistoricalStateBackfillCommitResult>
}

export interface WritingAgentCapabilities {
  simulateCharacters?(request: CharacterSimulationRequest): Promise<CharacterSimulationResult>
  buildContextSnapshot(input: {
    session: CreationSession
    intent: AuthorIntentContract
    source: CreationContextSource
  }): Promise<ContextSnapshot>
  proposeIntentContract(input: {
    session: CreationSession
    seed: Partial<AuthorIntentContract>
  }): Promise<AuthorIntentContract>
  generateCandidates(input: {
    session: CreationSession
    intent: AuthorIntentContract
    context: ContextSnapshot
  }): Promise<CandidateSearchResult>
  draftScene(input: {
    session: CreationSession
    intent: AuthorIntentContract
    candidate: NarrativeCandidate
    context: ContextSnapshot
    request: SceneDraftRequest
    currentBlocks: DraftBlock[]
  }): Promise<SceneDraftResult>
  reviewDraft(input: {
    session: CreationSession
    intent: AuthorIntentContract
    context: ContextSnapshot
    candidate: NarrativeCandidate
    draft: SceneDraftResult
    focusDimensions?: LiteraryDimension[]
    requestedAdvisoryLensIds?: AdvisoryLensId[]
  }): Promise<LiteraryReview>
  proposeRepair?(input: {
    session: CreationSession
    intent: AuthorIntentContract
    context: ContextSnapshot
    candidate: NarrativeCandidate
    draft: SceneDraftResult
    review: LiteraryReview
    finding: LocalRepairFinding
    targetBlock: DraftBlock
    attempt?: 'initial' | 'auditor_revision' | 'efficacy_retry'
    previousRepair?: LocalRepairCandidate
    repairReview?: LocalRepairReview
  }): Promise<LocalRepairCandidate>
  reviewRepair?(input: {
    session: CreationSession
    intent: AuthorIntentContract
    context: ContextSnapshot
    candidate: NarrativeCandidate
    draft: SceneDraftResult
    review: LiteraryReview
    finding: LocalRepairFinding
    targetBlock: DraftBlock
    repair: LocalRepairCandidate
    attempt?: 'initial' | 'auditor_revision' | 'efficacy_retry'
  }): Promise<LocalRepairReview>
  proposeCanonPatch(input: {
    session: CreationSession
    intent: AuthorIntentContract
    context: ContextSnapshot
    candidate: NarrativeCandidate
    draft: SceneDraftResult
    review: LiteraryReview
  }): Promise<CanonStatePatch>
}

export type CreationDecisionErrorCode =
  | 'invalid_phase_transition'
  | 'intent_incomplete'
  | 'intent_not_locked'
  | 'candidate_search_not_ready'
  | 'candidate_not_selected'
  | 'invalid_generation_scope'
  | 'multi_scene_generation_forbidden'
  | 'multi_chapter_generation_forbidden'
  | 'stale_result'
  | 'evidence_missing'
  | 'recent_scene_context_required'
  | 'hard_block_unresolved'
  | 'author_confirmation_required'
  | 'scene_author_decision_required'
  | 'scene_author_direction_draft_rejected'
  | 'author_decision_option_invalid'
  | 'canon_revision_conflict'
  | 'draft_revision_conflict'
  | 'expected_value_conflict'
  | 'local_persistence_failed'
  | 'model_output_invalid'
  | 'request_cancelled'
  | 'character_simulation_unavailable'

export class CreationDecisionError extends Error {
  readonly code: CreationDecisionErrorCode
  readonly detail: unknown

  constructor(
    code: CreationDecisionErrorCode,
    message: string,
    detail?: unknown,
  ) {
    super(message)
    this.code = code
    this.detail = detail
    this.name = 'CreationDecisionError'
  }
}
