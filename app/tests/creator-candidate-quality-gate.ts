import assert from 'node:assert/strict'
import {
  assertCandidateQualityGate,
  evaluateCandidateQualityGate,
} from '../src/features/creator-decision/candidateQualityGate'
import {
  CONTEXT_COMPILATION_POLICY_VERSION,
  contextSnapshotFingerprint,
} from '../src/features/creator-decision/contextCompiler'
import { evidenceForDraftQuote } from '../src/features/creator-decision/literaryReview'
import { referenceWritingAgent } from '../src/features/creator-decision/referenceWritingAgent'
import type {
  AuthorIntentContract,
  ContextSnapshot,
  CreationSession,
  LiteraryReview,
  NarrativeCandidate,
  RepairProposal,
  SceneDraftResult,
} from '../src/features/creator-decision/types'
import { CreationDecisionError } from '../src/features/creator-decision/types'

const session: CreationSession = {
  schemaVersion: 'creation-session.v1',
  id: 'session:candidate-quality',
  workId: 'work:candidate-quality',
  chapterId: 'chapter:candidate-quality',
  sceneId: 'scene:candidate-quality',
  branchId: 'branch:main',
  phase: 'reviewing',
  baseCanonRevision: 3,
  currentIntentRevision: 2,
  currentCandidateRevision: 1,
  currentDraftRevision: 4,
  lockedIntentId: 'intent:candidate-quality',
  selectedCandidateId: 'candidate:candidate-quality',
  activeDraftId: 'draft:candidate-quality',
  activeReviewId: 'review:candidate-quality',
  proposedCanonPatchId: null,
  createdAt: '2026-07-17T00:00:00.000Z',
  updatedAt: '2026-07-17T00:00:00.000Z',
}

const intent: AuthorIntentContract = {
  schemaVersion: 'author-intent.v1',
  id: session.lockedIntentId!,
  sessionId: session.id,
  revision: session.currentIntentRevision,
  status: 'locked',
  readerExperience: {
    startEmotion: '受压',
    targetEmotion: '克制的信任变化',
    emotionalMovement: '从控制走向交付',
    intensity: 'moderate',
  },
  narrativeDelta: {
    startingCondition: '队伍缺少唯一资源',
    endingCondition: '职责已经交付',
    mustChange: '主角交出关键职责',
    mustNotResolve: ['未知动机'],
    irreversibleChange: '承担未来义务',
  },
  characterAgency: {
    primaryActorId: 'character:lead',
    currentGoal: '完成下降',
    requiredChoice: '交出校准职责',
    opposingForce: '唯一资源与风暴',
    expectedCost: '未来义务',
  },
  informationPolicy: {
    readerShouldKnow: [],
    readerShouldSuspect: [],
    charactersMustNotKnow: [],
    delayedReveals: ['未知动机'],
  },
  boundaries: {
    requiredElements: ['资源协商', '职责交付'],
    forbiddenEffects: ['揭晓未知动机'],
    protectedCharacterTraits: [],
  },
  sceneMechanismDirection: {
    id: 'direction:candidate-quality',
    label: '资源协商与职责交付',
    primaryChangedAxis: 'pressureSource',
    proposedAdjustment: '以唯一资源制造压力，通过协商交付职责并承担未来义务。',
    preservedAuthorIntent: ['保留未知动机'],
    addressesIssueCodes: ['causal_chain_repetition'],
    whyItBreaksRepetition: '改用资源协商与职责交付。',
    expectedMechanismSignature: {
      pressureSource: 'resource',
      conflictEngine: 'negotiation',
      agencyPattern: 'delegation',
      costPattern: 'obligation',
      endingPattern: 'relationship_shift',
    },
    tradeoff: '未来必须偿还义务。',
    decisionId: 'decision:candidate-quality',
    pipelineId: 'pipeline:candidate-quality',
    selectedAt: '2026-07-17T00:00:00.000Z',
  },
  fieldSources: {},
  lockedFields: [],
  agentAssumptions: [],
  unresolvedQuestions: [],
  createdAt: '2026-07-17T00:00:00.000Z',
  lockedAt: '2026-07-17T00:00:00.000Z',
}

const blockText = '唯一配重芯迫使两人协商。主角把校准职责交给同伴，并承担未来义务；升降机启动后，他们的关系因真实权限而改变。'
const baseDraft: SceneDraftResult = {
  schemaVersion: 'scene-draft.v1',
  draftId: session.activeDraftId!,
  sessionId: session.id,
  baseCanonRevision: session.baseCanonRevision,
  baseIntentRevision: intent.revision,
  baseCandidateRevision: session.currentCandidateRevision,
  baseDraftRevision: 3,
  revision: session.currentDraftRevision,
  contentBlocks: [{
    id: 'block:candidate-quality',
    text: blockText,
    startOffset: 0,
    endOffset: blockText.length,
    protected: false,
  }],
  unplannedFactProposals: [],
  observedStateChanges: [],
  status: 'current',
  createdAt: '2026-07-17T00:00:00.000Z',
}
const evidence = evidenceForDraftQuote(baseDraft.contentBlocks, blockText)
assert.ok(evidence)
const contextSeed: Omit<ContextSnapshot, 'contentFingerprint'> = {
  schemaVersion: 'context-snapshot.v1',
  id: 'context:candidate-quality',
  compilationPolicyVersion: CONTEXT_COMPILATION_POLICY_VERSION,
  sourceFingerprint: 'fixture:candidate-quality',
  sessionId: session.id,
  intentRevision: intent.revision,
  workId: session.workId,
  chapterId: session.chapterId,
  sceneId: session.sceneId,
  canonRevision: session.baseCanonRevision,
  kernelRevision: 1,
  constraintRevision: 1,
  activeCharacters: [],
  relevantRelationships: [],
  activePromises: [],
  unresolvedForeshadowing: [],
  currentTimeline: {},
  relevantWorldRules: [],
  kernelRules: [],
  hardConstraints: [],
  relevantRegressionExamples: [],
  recentSceneSummaries: [],
  styleSamples: [],
  manualRecallItems: [],
  manifest: [],
  status: 'active',
  createdAt: '2026-07-17T00:00:00.000Z',
}
const context: ContextSnapshot = {
  ...contextSeed,
  contentFingerprint: contextSnapshotFingerprint(contextSeed),
}
const draft: SceneDraftResult = {
  ...baseDraft,
  directionReceipt: {
    schemaVersion: 'scene-draft-direction-receipt.v1',
    decision: 'pass',
    axisChecks: Object.entries(intent.sceneMechanismDirection!.expectedMechanismSignature).map(([
      axis,
      expectedValue,
    ]) => ({
      axis: axis as keyof typeof intent.sceneMechanismDirection.expectedMechanismSignature,
      expectedValue,
      evidence,
    })),
    proposedAdjustmentEvidence: evidence,
    reviewer: 'Auditor',
  },
}
const review: LiteraryReview = {
  schemaVersion: 'literary-review.v1',
  id: session.activeReviewId!,
  sessionId: session.id,
  contextSnapshotId: context.id,
  contextCompilationPolicyVersion: context.compilationPolicyVersion,
  contextSourceFingerprint: context.sourceFingerprint,
  contextSnapshotFingerprint: contextSnapshotFingerprint(context),
  draftId: draft.draftId,
  baseCanonRevision: draft.baseCanonRevision,
  baseIntentRevision: draft.baseIntentRevision,
  baseCandidateRevision: draft.baseCandidateRevision,
  baseDraftRevision: draft.revision,
  findings: [],
  deterministicViolations: [],
  status: 'active',
  createdAt: '2026-07-17T00:00:01.000Z',
}

assert.deepEqual(evaluateCandidateQualityGate({ session, intent, context, draft, review, repairs: [] }), {
  allowed: true,
  blockers: [],
})
assert.equal(assertCandidateQualityGate({ session, intent, context, draft, review, repairs: [] }).allowed, true)

const advisoryOnlyReview: LiteraryReview = {
  ...review,
  extendedCraft: {
    schemaVersion: 'extended-craft-review.v1',
    requestedLensIds: ['prose_rhythm'],
    findings: [{
      id: 'advisory:candidate-quality',
      lensId: 'prose_rhythm',
      severity: 'revision_candidate',
      evidence,
      diagnosis: '连续同长度句式削弱了当前压力的节律变化。',
      readerEffectHypothesis: '推测：读者可能感到动作压力没有逐步逼近。',
      authorTradeoff: '保留整齐句式会强化冷静感，局部变奏则会提高迫近感。',
      smallestExperiment: '只调整证据句的停顿位置，不改变事件和事实。',
      mappedExistingDimensions: ['pacing', 'repetition'],
      confidence: 'medium',
      verification: 'verified',
      status: 'active',
    }],
    compositeLiteraryScoreUsed: false,
  },
}
assert.deepEqual(
  evaluateCandidateQualityGate({ session, intent, context, draft, review: advisoryOnlyReview, repairs: [] }),
  { allowed: true, blockers: [] },
  'advisory revision candidates must not enter the canon candidate quality gate',
)

const missingReceipt = evaluateCandidateQualityGate({ session, intent, context, draft: baseDraft, review, repairs: [] })
assert.equal(missingReceipt.allowed, false)
assert.deepEqual(missingReceipt.blockers.map(item => item.code), ['direction_receipt_missing'])

const staleReview = evaluateCandidateQualityGate({
  session,
  intent,
  context,
  draft,
  review: { ...review, baseDraftRevision: draft.revision - 1 },
  repairs: [],
})
assert.ok(staleReview.blockers.some(item => item.code === 'review_not_current'))

const invalidEvidenceDraft: SceneDraftResult = {
  ...draft,
  contentBlocks: draft.contentBlocks.map(block => ({ ...block, text: `改${block.text.slice(1)}` })),
}
const invalidEvidence = evaluateCandidateQualityGate({
  session,
  intent,
  context,
  draft: invalidEvidenceDraft,
  review,
  repairs: [],
})
assert.ok(invalidEvidence.blockers.some(item => item.code === 'direction_receipt_evidence_invalid'))
assert.ok(invalidEvidence.blockers.some(item => item.code === 'direction_adjustment_evidence_invalid'))

const axisMismatch = evaluateCandidateQualityGate({
  session,
  intent,
  context,
  draft: {
    ...draft,
    directionReceipt: {
      ...draft.directionReceipt!,
      axisChecks: draft.directionReceipt!.axisChecks.map(check => check.axis === 'pressureSource'
        ? { ...check, expectedValue: 'institution' }
        : check),
    },
  },
  review,
  repairs: [],
})
assert.ok(axisMismatch.blockers.some(item => item.code === 'direction_receipt_axis_mismatch'))

const hardBlocked = evaluateCandidateQualityGate({
  session,
  intent,
  context,
  draft,
  review: {
    ...review,
    deterministicViolations: ['scene_length_out_of_range'],
    findings: [{
      id: 'finding:candidate-quality',
      dimension: 'continuity',
      severity: 'hard_block',
      evidence,
      expected: '因果连续。',
      observed: '因果断裂。',
      readerImpact: '读者无法理解变化。',
      diagnosis: '冻结门禁夹具。',
      repairDirection: '局部修复证据块。',
      protectedBlockIds: [],
      confidence: 'high',
      status: 'active',
    }],
  },
  repairs: [],
})
assert.deepEqual(hardBlocked.blockers.map(item => item.code), [
  'active_hard_block',
  'deterministic_violation',
])

const revisionCandidateFinding: LiteraryReview['findings'][number] = {
  id: 'finding:revision-candidate',
  dimension: 'pacing',
  severity: 'revision_candidate',
  evidence,
  expected: '动作与后果保持紧凑。',
  observed: '局部解释拖慢动作结果。',
  readerImpact: '推进感减弱。',
  diagnosis: '冻结门禁夹具。',
  repairDirection: '由作者决定采用局部收紧或明确忽略。',
  protectedBlockIds: [],
  confidence: 'high',
  status: 'active',
}
const activeRevisionCandidate = evaluateCandidateQualityGate({
  session,
  intent,
  context,
  draft,
  review: { ...review, findings: [revisionCandidateFinding] },
  repairs: [],
})
assert.deepEqual(activeRevisionCandidate.blockers, [{ code: 'active_revision_candidate', count: 1 }])
assert.equal(evaluateCandidateQualityGate({
  session,
  intent,
  context,
  draft,
  review: {
    ...review,
    findings: [{ ...revisionCandidateFinding, status: 'dismissed' }],
  },
  repairs: [],
}).allowed, true)

const recallContextSeed: ContextSnapshot = {
  ...context,
  manualRecallItems: [{
    id: 'manual-recall:candidate-quality',
    sourceId: 'canon:previous-cost',
    group: 'causal',
    authority: 'canon',
    statement: '唯一资源已经被消耗，当前选择必须承担后续义务。',
    whyNow: '本章交付职责必须延续已经支付的代价。',
    locator: {
      kind: 'canon',
      targetId: 'canon:previous-cost',
      label: '上一章已确认代价',
    },
  }],
}
const recallContext: ContextSnapshot = {
  ...recallContextSeed,
  contentFingerprint: contextSnapshotFingerprint(recallContextSeed),
}
const recallReview: LiteraryReview = {
  ...review,
  contextSnapshotId: recallContext.id,
  contextCompilationPolicyVersion: recallContext.compilationPolicyVersion,
  contextSourceFingerprint: recallContext.sourceFingerprint,
  contextSnapshotFingerprint: contextSnapshotFingerprint(recallContext),
  manualRecallAdherence: {
    schemaVersion: 'manual-recall-adherence-receipt.v1',
    decision: 'pass',
    checks: [{
      sourceId: recallContext.manualRecallItems[0].sourceId,
      sourceRevision: recallContext.manualRecallItems[0].sourceRevision,
      group: recallContext.manualRecallItems[0].group,
      status: 'fulfilled',
      evidence,
      diagnosis: '正文延续了已支付代价，并让当前职责交付承担后续义务。',
    }],
    reviewer: 'Auditor',
    compositeLiteraryScoreUsed: false,
  },
}
assert.equal(evaluateCandidateQualityGate({
  session,
  intent,
  context: recallContext,
  draft,
  review: recallReview,
  repairs: [],
}).allowed, true)

const missingRecallReview = evaluateCandidateQualityGate({
  session,
  intent,
  context: recallContext,
  draft,
  review: { ...recallReview, manualRecallAdherence: undefined },
  repairs: [],
})
assert.deepEqual(missingRecallReview.blockers, [{
  code: 'manual_recall_receipt_missing',
  count: 1,
}])

const rejectedRecallReview = evaluateCandidateQualityGate({
  session,
  intent,
  context: recallContext,
  draft,
  review: {
    ...recallReview,
    deterministicViolations: [],
    manualRecallAdherence: {
      ...recallReview.manualRecallAdherence!,
      decision: 'reject',
      checks: recallReview.manualRecallAdherence!.checks.map(check => ({
        ...check,
        status: 'violated' as const,
      })),
    },
  },
  repairs: [],
})
assert.deepEqual(rejectedRecallReview.blockers, [{
  code: 'manual_recall_receipt_rejected',
  count: 1,
}])

const reviewerHardNegativeRecall = {
  id: 'manual-recall:reviewer-hard-negative',
  sourceId: 'canon:silver-key-promise',
  sourceRevision: 1,
  authority: 'canon' as const,
  group: 'promise' as const,
  statement: '银钥匙必须始终藏在旧钟内部，直到第三次涨潮才能取出',
  sourceLabel: '银钥匙长期承诺',
  whyNow: '当前场景不得提前取出或否定这项长期承诺。',
  locator: {
    kind: 'canon' as const,
    targetId: 'canon:silver-key-promise',
    label: '银钥匙长期承诺',
  },
}
const reviewerHardNegativeContextSeed: ContextSnapshot = {
  ...context,
  id: 'context:reviewer-hard-negative',
  manualRecallItems: [reviewerHardNegativeRecall],
}
const reviewerHardNegativeContext: ContextSnapshot = {
  ...reviewerHardNegativeContextSeed,
  contentFingerprint: contextSnapshotFingerprint(reviewerHardNegativeContextSeed),
}
const reviewerHardNegativeText = '她必须马上打开北侧的门。屋里没有钥匙、旧钟、涨潮或任何与那份长期承诺有关的事物。'
const reviewerHardNegativeDraft: SceneDraftResult = {
  ...baseDraft,
  draftId: 'draft:reviewer-hard-negative',
  revision: 1,
  baseDraftRevision: 0,
  contentBlocks: [{
    id: 'block:reviewer-hard-negative',
    text: reviewerHardNegativeText,
    startOffset: 0,
    endOffset: reviewerHardNegativeText.length,
    protected: false,
  }],
  directionReceipt: undefined,
}
const reviewerHardNegativeSession: CreationSession = {
  ...session,
  currentDraftRevision: reviewerHardNegativeDraft.revision,
  activeDraftId: reviewerHardNegativeDraft.draftId,
  activeReviewId: null,
}
const reviewerHardNegativeCandidate = {
  id: reviewerHardNegativeSession.selectedCandidateId!,
  revision: reviewerHardNegativeSession.currentCandidateRevision,
} as NarrativeCandidate
const reviewerHardNegativeReview = await referenceWritingAgent.reviewDraft({
  session: reviewerHardNegativeSession,
  intent,
  context: reviewerHardNegativeContext,
  candidate: reviewerHardNegativeCandidate,
  draft: reviewerHardNegativeDraft,
})
assert.equal(reviewerHardNegativeReview.manualRecallAdherence?.decision, 'reject')
assert.equal(reviewerHardNegativeReview.manualRecallAdherence?.checks[0]?.status, 'violated')
assert.ok(
  reviewerHardNegativeReview.manualRecallAdherence?.checks[0]?.evidence.length,
  'contradictory recall evidence must remain locatable in the candidate manuscript',
)
const reviewerHardNegativeGate = evaluateCandidateQualityGate({
  session: {
    ...reviewerHardNegativeSession,
    activeReviewId: reviewerHardNegativeReview.id,
  },
  intent,
  context: reviewerHardNegativeContext,
  draft: reviewerHardNegativeDraft,
  review: reviewerHardNegativeReview,
  repairs: [],
})
assert.equal(reviewerHardNegativeGate.allowed, false)
assert.ok(
  reviewerHardNegativeGate.blockers.some(blocker => blocker.code === 'manual_recall_receipt_rejected'),
  'the real review receipt must block contradictory prose at the candidate-quality gate',
)

const reviewerPositiveRecallText = '银钥匙仍藏在旧钟内部，她没有在第三次涨潮前将它取出。'
const reviewerPositiveContinuation = '升降机沿潮湿井壁下降，主角逐段核对刻度，把唯一配重芯的校准职责交给同伴。风压每次改变，双方都重新确认权限与代价，职责交付因此成为真实行动，并留下必须偿还的未来义务。'
const reviewerPositiveText = [
  reviewerPositiveRecallText,
  blockText,
  ...Array.from({ length: 18 }, (_, index) => `${reviewerPositiveContinuation}第${index + 1}次校准后，刻度、权限和责任都有可见变化。`),
].join('')
const reviewerPositiveDraftSeed: SceneDraftResult = {
  ...baseDraft,
  draftId: 'draft:reviewer-positive-recall',
  revision: 1,
  baseDraftRevision: 0,
  contentBlocks: [{
    id: 'block:reviewer-positive-recall',
    text: reviewerPositiveText,
    startOffset: 0,
    endOffset: reviewerPositiveText.length,
    protected: false,
  }],
}
const reviewerPositiveDirectionEvidence = evidenceForDraftQuote(
  reviewerPositiveDraftSeed.contentBlocks,
  blockText,
)
assert.ok(reviewerPositiveDirectionEvidence)
const reviewerPositiveDraft: SceneDraftResult = {
  ...reviewerPositiveDraftSeed,
  directionReceipt: {
    schemaVersion: 'scene-draft-direction-receipt.v1',
    decision: 'pass',
    axisChecks: Object.entries(intent.sceneMechanismDirection!.expectedMechanismSignature).map(([
      axis,
      expectedValue,
    ]) => ({
      axis: axis as keyof typeof intent.sceneMechanismDirection.expectedMechanismSignature,
      expectedValue,
      evidence: reviewerPositiveDirectionEvidence,
    })),
    proposedAdjustmentEvidence: reviewerPositiveDirectionEvidence,
    reviewer: 'Auditor',
  },
}
const reviewerPositiveSession: CreationSession = {
  ...session,
  currentDraftRevision: reviewerPositiveDraft.revision,
  activeDraftId: reviewerPositiveDraft.draftId,
  activeReviewId: null,
}
const reviewerPositiveReview = await referenceWritingAgent.reviewDraft({
  session: reviewerPositiveSession,
  intent,
  context: reviewerHardNegativeContext,
  candidate: reviewerHardNegativeCandidate,
  draft: reviewerPositiveDraft,
})
assert.equal(reviewerPositiveReview.manualRecallAdherence?.decision, 'pass')
assert.equal(reviewerPositiveReview.manualRecallAdherence?.checks[0]?.status, 'respected')
assert.ok(
  reviewerPositiveReview.manualRecallAdherence?.checks[0]?.evidence.length,
  'valid recall adherence must retain locatable manuscript evidence',
)
const reviewerPositiveGate = evaluateCandidateQualityGate({
  session: {
    ...reviewerPositiveSession,
    activeReviewId: reviewerPositiveReview.id,
  },
  intent,
  context: reviewerHardNegativeContext,
  draft: reviewerPositiveDraft,
  review: reviewerPositiveReview,
  repairs: [],
})
assert.deepEqual(
  reviewerPositiveGate,
  { allowed: true, blockers: [] },
  'supporting negation must not block a candidate that respects the recalled proposition',
)

const reviewerLaterContradictionRecallText = '守灯人先声称银钥匙藏在旧钟内部，然而银钥匙没有藏在旧钟内部。'
const reviewerLaterContradictionText = [
  reviewerLaterContradictionRecallText,
  blockText,
  ...Array.from({ length: 18 }, (_, index) => `${reviewerPositiveContinuation}第${index + 1}次校准后，刻度、权限和责任都有可见变化。`),
].join('')
const reviewerLaterContradictionDraftSeed: SceneDraftResult = {
  ...baseDraft,
  draftId: 'draft:reviewer-later-contradiction',
  revision: 1,
  baseDraftRevision: 0,
  contentBlocks: [{
    id: 'block:reviewer-later-contradiction',
    text: reviewerLaterContradictionText,
    startOffset: 0,
    endOffset: reviewerLaterContradictionText.length,
    protected: false,
  }],
}
const reviewerLaterContradictionDirectionEvidence = evidenceForDraftQuote(
  reviewerLaterContradictionDraftSeed.contentBlocks,
  blockText,
)
assert.ok(reviewerLaterContradictionDirectionEvidence)
const reviewerLaterContradictionDraft: SceneDraftResult = {
  ...reviewerLaterContradictionDraftSeed,
  directionReceipt: {
    schemaVersion: 'scene-draft-direction-receipt.v1',
    decision: 'pass',
    axisChecks: Object.entries(intent.sceneMechanismDirection!.expectedMechanismSignature).map(([
      axis,
      expectedValue,
    ]) => ({
      axis: axis as keyof typeof intent.sceneMechanismDirection.expectedMechanismSignature,
      expectedValue,
      evidence: reviewerLaterContradictionDirectionEvidence,
    })),
    proposedAdjustmentEvidence: reviewerLaterContradictionDirectionEvidence,
    reviewer: 'Auditor',
  },
}
const reviewerLaterContradictionSession: CreationSession = {
  ...session,
  currentDraftRevision: reviewerLaterContradictionDraft.revision,
  activeDraftId: reviewerLaterContradictionDraft.draftId,
  activeReviewId: null,
}
const reviewerLaterContradictionReview = await referenceWritingAgent.reviewDraft({
  session: reviewerLaterContradictionSession,
  intent,
  context: reviewerHardNegativeContext,
  candidate: reviewerHardNegativeCandidate,
  draft: reviewerLaterContradictionDraft,
})
assert.equal(reviewerLaterContradictionReview.manualRecallAdherence?.decision, 'reject')
assert.equal(
  reviewerLaterContradictionReview.manualRecallAdherence?.checks[0]?.status,
  'violated',
)
assert.ok(
  reviewerLaterContradictionReview.manualRecallAdherence?.checks[0]?.evidence.length,
  'a later contradiction must remain locatable even after an earlier matching proposition',
)
const reviewerLaterContradictionGate = evaluateCandidateQualityGate({
  session: {
    ...reviewerLaterContradictionSession,
    activeReviewId: reviewerLaterContradictionReview.id,
  },
  intent,
  context: reviewerHardNegativeContext,
  draft: reviewerLaterContradictionDraft,
  review: reviewerLaterContradictionReview,
  repairs: [],
})
assert.equal(reviewerLaterContradictionGate.allowed, false)
assert.ok(
  reviewerLaterContradictionGate.blockers.some(
    blocker => blocker.code === 'manual_recall_receipt_rejected',
  ),
  'the candidate-quality gate must reject a later contradiction in the same sentence',
)

const reviewerTerminalRecallMatrix = [
  {
    name: 'unchanged normative constraint',
    recallText: '银钥匙必须始终藏在旧钟内部，直到第三次涨潮才能取出。',
    expectedStatus: 'respected',
    expectedAllowed: true,
  },
  {
    name: 'bare not-in contradiction',
    recallText: '银钥匙藏在旧钟内部。随后守灯人确认银钥匙不在旧钟内部。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'support followed by cross-block contradiction',
    recallText: '银钥匙藏在旧钟内部。\n\n守灯人随后承认银钥匙没有藏在旧钟内部。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'postposed rejection',
    recallText: '银钥匙藏在旧钟内部——这句话不属实。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'literal removal before the threshold',
    recallText: '银钥匙曾藏在旧钟内部，但守灯人在第一次涨潮时将它取出。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'repeated support cannot hide later removal',
    recallText: '银钥匙藏在旧钟内部。守灯人再次确认它仍在旧钟内部。随后守灯人把银钥匙从旧钟内部取出。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'ordinary took-out contradiction',
    recallText: '银钥匙藏在旧钟内部。第二次涨潮时守灯人把银钥匙拿了出来。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'ordinary moved-out contradiction',
    recallText: '银钥匙藏在旧钟内部。后来守灯人将银钥匙移出旧钟内部。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'plain speech attribution',
    recallText: '守灯人说银钥匙仍藏在旧钟内部。',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'compound reported speech',
    recallText: '据说守灯人声称银钥匙必须始终藏在旧钟内部，直到第三次涨潮才能取出。',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'short hypothetical marker',
    recallText: '若银钥匙仍藏在旧钟内部，守灯人便会继续等待。',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'full hypothetical marker',
    recallText: '如果银钥匙必须始终藏在旧钟内部，守灯人就会等到第三次涨潮。',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'common rhetorical question',
    recallText: '谁会相信银钥匙仍藏在旧钟内部？',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'rhetorical rejection',
    recallText: '银钥匙必须始终藏在旧钟内部——难道不是荒唐的说法吗？',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'ambiguous double negation',
    recallText: '不能说银钥匙没有藏在旧钟内部。',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'unrelated removal does not satisfy recall',
    recallText: '她从药箱里取出最后一卷绷带。',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'supporting negation remains factual support',
    recallText: '银钥匙仍藏在旧钟内部，她没有在第三次涨潮前将它取出。',
    expectedStatus: 'respected',
    expectedAllowed: true,
  },
  {
    name: 'removal after the threshold is compliant',
    recallText: '银钥匙一直藏在旧钟内部。第三次涨潮后，守灯人把银钥匙拿了出来。',
    expectedStatus: 'respected',
    expectedAllowed: true,
  },
  {
    name: 'unrelated removal in a supporting sentence',
    recallText: '银钥匙仍藏在旧钟内部，守灯人从药箱里取出一卷绷带。',
    expectedStatus: 'respected',
    expectedAllowed: true,
  },
  {
    name: 'unrelated removal joined without punctuation',
    recallText: '银钥匙仍藏在旧钟内部而守灯人从药箱里拿出绷带。',
    expectedStatus: 'respected',
    expectedAllowed: true,
  },
  {
    name: 'pronoun follows the nearest explicit map object',
    recallText: '银钥匙仍藏在旧钟内部。\n\n守灯人拿起旧地图。第二次涨潮时，他把它拿了出来。',
    expectedStatus: 'respected',
    expectedAllowed: true,
  },
  {
    name: 'unclassified pronoun state change fails closed',
    recallText: '银钥匙仍藏在旧钟内部。第二次涨潮时，守灯人对它做了无法识别的处置。',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'container lookup cannot find the key',
    recallText: '银钥匙藏在旧钟内部。后来打开钟门时，旧钟内部已找不到银钥匙。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'key is hidden outside the clock',
    recallText: '银钥匙藏在旧钟内部。后来银钥匙被藏到了旧钟外部。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'postposed key is extracted from the clock',
    recallText: '银钥匙藏在旧钟内部。第二次涨潮时守灯人从旧钟内部抽出了银钥匙。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'key is taken away before the threshold',
    recallText: '银钥匙藏在旧钟内部。第二次涨潮时守灯人把银钥匙带走了。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'key is transferred to a drawer',
    recallText: '银钥匙藏在旧钟内部。第二次涨潮时银钥匙已被转移到灯塔抽屉。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'key leaves the clock',
    recallText: '银钥匙藏在旧钟内部。第二次涨潮时，银钥匙已经离开了旧钟内部。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'key disappears from the clock',
    recallText: '银钥匙藏在旧钟内部。第二次涨潮时，银钥匙从旧钟内部消失了。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'key is handed to the captain',
    recallText: '银钥匙藏在旧钟内部。第二次涨潮时，守灯人把银钥匙交给了船长。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'key is placed in a pocket',
    recallText: '银钥匙藏在旧钟内部。第二次涨潮时，守灯人把银钥匙塞进了自己的衣袋。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'key is missing during a seal check',
    recallText: '银钥匙藏在旧钟内部。第二次涨潮后检查封条时，银钥匙已经不见了。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'later denial refers to prior support',
    recallText: '银钥匙藏在旧钟内部——守灯人随后否认了此事。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'later fabrication claim refers to prior support',
    recallText: '银钥匙藏在旧钟内部；这话纯属杜撰。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'repeated support blocks cannot hide extraction',
    recallText: '银钥匙藏在旧钟内部。\n\n银钥匙藏在旧钟内部。\n\n第二次涨潮时守灯人从旧钟内部抽出了银钥匙。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'pronoun extraction resolves to active key',
    recallText: '银钥匙藏在旧钟内部。第二次涨潮时，守灯人把它拿了出来。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'before-threshold pronoun extraction',
    recallText: '银钥匙藏在旧钟内部。还没到第三次涨潮，守灯人便取出了它。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'later threshold reminder does not excuse early removal',
    recallText: '银钥匙藏在旧钟内部。第二次涨潮时守灯人把银钥匙拿出旧钟内部，尽管约定写着第三次涨潮后。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'normative future extraction is not actual removal',
    recallText: '银钥匙仍藏在旧钟内部。守灯人必须等到第三次涨潮才能把银钥匙从旧钟内部拿出来。',
    expectedStatus: 'respected',
    expectedAllowed: true,
  },
  {
    name: 'fourth-tide extraction plan is not actual removal',
    recallText: '银钥匙仍藏在旧钟内部。守灯人打算等第四次涨潮后再把银钥匙取出来。',
    expectedStatus: 'respected',
    expectedAllowed: true,
  },
  {
    name: 'fourth-tide pronoun extraction plan is not actual removal',
    recallText: '银钥匙仍藏在旧钟内部。守灯人计划在第四次涨潮时再把它拿出来。',
    expectedStatus: 'respected',
    expectedAllowed: true,
  },
  {
    name: 'just-passed threshold permits extraction',
    recallText: '银钥匙一直藏在旧钟内部。第三次涨潮刚过，守灯人把银钥匙拿了出来。',
    expectedStatus: 'respected',
    expectedAllowed: true,
  },
  {
    name: 'unrealized extraction preserves the constraint',
    recallText: '银钥匙仍在旧钟内部，尚未取出。',
    expectedStatus: 'respected',
    expectedAllowed: true,
  },
  {
    name: 'speech attribution before comma',
    recallText: '守灯人说，银钥匙仍藏在旧钟内部。',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'rumor attribution',
    recallText: '根据传闻，银钥匙仍藏在旧钟内部。',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'legend attribution',
    recallText: '相传银钥匙仍藏在旧钟内部。',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'written attribution',
    recallText: '航海日志写着：银钥匙仍藏在旧钟内部。',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'assumption',
    recallText: '假设银钥匙仍藏在旧钟内部，守灯人便会继续等待。',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'colon assumption',
    recallText: '假设：银钥匙仍藏在旧钟内部，守灯人便会继续等待。',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'as-long-as condition',
    recallText: '只要银钥匙仍藏在旧钟内部，守灯人就继续等待。',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'unless condition',
    recallText: '除非银钥匙仍藏在旧钟内部，守灯人才继续等待。',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'whether concession',
    recallText: '无论银钥匙是否仍藏在旧钟内部，守灯人都会继续等待。',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'plain question',
    recallText: '银钥匙仍藏在旧钟内部吗？',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'speculative question',
    recallText: '莫非银钥匙仍藏在旧钟内部？',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'rhetorical how question',
    recallText: '银钥匙怎会仍藏在旧钟内部？',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'disbelief statement',
    recallText: '谁都不会相信银钥匙仍藏在旧钟内部。',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'so-called speculative claim',
    recallText: '所谓“银钥匙仍藏在旧钟内部”只是一种猜测。',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'pending confirmation',
    recallText: '银钥匙是否仍藏在旧钟内部，尚待确认。',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'seemingly factual claim',
    recallText: '银钥匙似乎仍藏在旧钟内部。',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'possibly factual claim',
    recallText: '银钥匙或许仍藏在旧钟内部。',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'container alias and key alias extraction',
    recallText: '银钥匙仍藏在旧钟内部。第二次涨潮时，守灯人从钟腔里取出了那枚钥匙。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'seal inspection preserves prior support',
    recallText: '银钥匙仍藏在旧钟内部。守灯人检查了银钥匙的封条。',
    expectedStatus: 'respected',
    expectedAllowed: true,
  },
  {
    name: 'empty constrained container',
    recallText: '银钥匙仍藏在旧钟内部。第二次涨潮时打开钟门，旧钟内部已经空无一物。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'dust-only constrained container',
    recallText: '银钥匙仍藏在旧钟内部。第二次涨潮时打开钟门，旧钟里面只剩灰尘。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'executed action according to plan',
    recallText: '银钥匙仍藏在旧钟内部。第二次涨潮时守灯人按计划把银钥匙拿了出来。',
    expectedStatus: 'violated',
    expectedAllowed: false,
  },
  {
    name: 'cross-block threshold time permits extraction',
    recallText: '银钥匙一直藏在旧钟内部。\n\n第三次涨潮刚过。\n\n守灯人把银钥匙拿了出来。',
    expectedStatus: 'respected',
    expectedAllowed: true,
  },
  {
    name: 'quoted direct speech',
    recallText: '守灯人低声道：“银钥匙仍藏在旧钟内部。”',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'postposed direct-speech attribution',
    recallText: '“银钥匙仍藏在旧钟内部”，守灯人回答。',
    expectedStatus: 'omitted',
    expectedAllowed: false,
  },
  {
    name: 'unrelated question after factual support',
    recallText: '银钥匙仍藏在旧钟内部，谁去守北门？',
    expectedStatus: 'respected',
    expectedAllowed: true,
  },
] as const

for (const [index, testCase] of reviewerTerminalRecallMatrix.entries()) {
  const text = [
    testCase.recallText,
    blockText,
    ...Array.from(
      { length: 18 },
      (_, continuationIndex) => (
        `${reviewerPositiveContinuation}第${continuationIndex + 1}次校准后，刻度、权限和责任都有可见变化。`
      ),
    ),
  ].join('')
  const draftSeed: SceneDraftResult = {
    ...baseDraft,
    draftId: `draft:reviewer-terminal-recall:${index}`,
    revision: 1,
    baseDraftRevision: 0,
    contentBlocks: [{
      id: `block:reviewer-terminal-recall:${index}`,
      text,
      startOffset: 0,
      endOffset: text.length,
      protected: false,
    }],
  }
  const directionEvidence = evidenceForDraftQuote(draftSeed.contentBlocks, blockText)
  assert.ok(directionEvidence)
  const matrixDraft: SceneDraftResult = {
    ...draftSeed,
    directionReceipt: {
      schemaVersion: 'scene-draft-direction-receipt.v1',
      decision: 'pass',
      axisChecks: Object.entries(intent.sceneMechanismDirection!.expectedMechanismSignature).map(([
        axis,
        expectedValue,
      ]) => ({
        axis: axis as keyof typeof intent.sceneMechanismDirection.expectedMechanismSignature,
        expectedValue,
        evidence: directionEvidence,
      })),
      proposedAdjustmentEvidence: directionEvidence,
      reviewer: 'Auditor',
    },
  }
  const matrixSession: CreationSession = {
    ...session,
    currentDraftRevision: matrixDraft.revision,
    activeDraftId: matrixDraft.draftId,
    activeReviewId: null,
  }
  const matrixReview = await referenceWritingAgent.reviewDraft({
    session: matrixSession,
    intent,
    context: reviewerHardNegativeContext,
    candidate: reviewerHardNegativeCandidate,
    draft: matrixDraft,
  })
  assert.equal(
    matrixReview.manualRecallAdherence?.checks[0]?.status,
    testCase.expectedStatus,
    `${testCase.name}: production review status`,
  )
  const matrixGate = evaluateCandidateQualityGate({
    session: { ...matrixSession, activeReviewId: matrixReview.id },
    intent,
    context: reviewerHardNegativeContext,
    draft: matrixDraft,
    review: matrixReview,
    repairs: [],
  })
  assert.equal(
    matrixGate.allowed,
    testCase.expectedAllowed,
    `${testCase.name}: candidate gate decision`,
  )
  assert.equal(
    matrixGate.blockers.some(blocker => blocker.code === 'manual_recall_receipt_rejected'),
    !testCase.expectedAllowed,
    `${testCase.name}: manual recall blocker`,
  )
}

const mismatchedRecallReview = evaluateCandidateQualityGate({
  session,
  intent,
  context: recallContext,
  draft,
  review: {
    ...recallReview,
    manualRecallAdherence: {
      ...recallReview.manualRecallAdherence!,
      checks: recallReview.manualRecallAdherence!.checks.map(check => ({
        ...check,
        sourceId: 'canon:forged-source',
      })),
    },
  },
  repairs: [],
})
assert.ok(mismatchedRecallReview.blockers.some(item => item.code === 'manual_recall_receipt_mismatch'))

const staleRecallRevisionReview = evaluateCandidateQualityGate({
  session,
  intent,
  context: recallContext,
  draft,
  review: {
    ...recallReview,
    manualRecallAdherence: {
      ...recallReview.manualRecallAdherence!,
      checks: recallReview.manualRecallAdherence!.checks.map(check => ({
        ...check,
        sourceRevision: check.sourceRevision + 1,
      })),
    },
  },
  repairs: [],
})
assert.ok(
  staleRecallRevisionReview.blockers.some(item => item.code === 'manual_recall_receipt_mismatch'),
  'a receipt for another source revision must not authorize the current recall selection',
)

const invalidRecallEvidence = evaluateCandidateQualityGate({
  session,
  intent,
  context: recallContext,
  draft: invalidEvidenceDraft,
  review: recallReview,
  repairs: [],
})
assert.ok(invalidRecallEvidence.blockers.some(item => item.code === 'manual_recall_receipt_evidence_invalid'))

const staleContext = evaluateCandidateQualityGate({
  session,
  intent,
  context: { ...context, intentRevision: intent.revision - 1 },
  draft,
  review,
  repairs: [],
})
assert.ok(staleContext.blockers.some(item => item.code === 'context_not_current'))

const legacyContext = evaluateCandidateQualityGate({
  session,
  intent,
  context: {
    ...context,
    compilationPolicyVersion: 0,
    sourceFingerprint: 'legacy-unfingerprinted',
  },
  draft,
  review,
  repairs: [],
})
assert.ok(legacyContext.blockers.some(item => item.code === 'context_not_current'))

const tamperedContext = evaluateCandidateQualityGate({
  session,
  intent,
  context: {
    ...context,
    hardConstraints: ['篡改后新增、但没有重新审阅的约束。'],
  },
  draft,
  review,
  repairs: [],
})
assert.ok(tamperedContext.blockers.some(item => item.code === 'context_not_current'))
assert.ok(tamperedContext.blockers.some(item => item.code === 'review_not_current'))

const tamperedContextValue: ContextSnapshot = {
  ...context,
  hardConstraints: ['篡改后新增、但没有重新编译的约束。'],
}
const forgedReviewBinding = evaluateCandidateQualityGate({
  session,
  intent,
  context: tamperedContextValue,
  draft,
  review: {
    ...review,
    contextSnapshotFingerprint: contextSnapshotFingerprint(tamperedContextValue),
  },
  repairs: [],
})
assert.ok(
  forgedReviewBinding.blockers.some(item => item.code === 'context_not_current'),
  'forging the review binding must not authorize a context whose stored content fingerprint no longer matches',
)

const legacyUnboundReview = evaluateCandidateQualityGate({
  session,
  intent,
  context,
  draft,
  review: {
    ...review,
    contextSnapshotId: 'legacy-unbound-context',
    contextCompilationPolicyVersion: 0,
    contextSourceFingerprint: 'legacy-unfingerprinted',
    contextSnapshotFingerprint: 'legacy-unfingerprinted',
  },
  repairs: [],
})
assert.ok(legacyUnboundReview.blockers.some(item => item.code === 'review_not_current'))

const pendingRepair: RepairProposal = {
  schemaVersion: 'repair-proposal.v1',
  id: 'repair:candidate-quality',
  reviewId: review.id,
  findingId: 'finding:candidate-quality',
  baseDraftRevision: draft.revision,
  operation: 'replace_range',
  targetBlockIds: [draft.contentBlocks[0].id],
  preservedFacts: [],
  preservedBlockIds: [],
  proposedContent: '局部候选文本。',
  status: 'proposed',
}
const pendingRepairGate = evaluateCandidateQualityGate({
  session,
  intent,
  context,
  draft,
  review,
  repairs: [pendingRepair],
})
assert.deepEqual(pendingRepairGate.blockers, [{ code: 'pending_repair_decision', count: 1 }])
assert.equal(evaluateCandidateQualityGate({
  session,
  intent,
  context,
  draft,
  review,
  repairs: [{
    ...pendingRepair,
    findingSource: { kind: 'advisory_lens', lensId: 'prose_rhythm' },
  }],
}).allowed, true, 'an advisory local-repair choice must not become a Canon blocker')
assert.equal(evaluateCandidateQualityGate({
  session,
  intent,
  context,
  draft,
  review,
  repairs: [{ ...pendingRepair, status: 'rejected' }],
}).allowed, true)

assert.throws(
  () => assertCandidateQualityGate({ session, intent, context, draft: baseDraft, review, repairs: [] }),
  error => error instanceof CreationDecisionError && error.code === 'hard_block_unresolved',
)
assert.throws(
  () => assertCandidateQualityGate({
    session,
    intent,
    context,
    draft,
    review: { ...review, baseDraftRevision: draft.revision - 1 },
    repairs: [],
  }),
  error => error instanceof CreationDecisionError && error.code === 'stale_result',
)
assert.throws(
  () => assertCandidateQualityGate({
    session,
    intent,
    context,
    draft,
    review: { ...review, findings: [revisionCandidateFinding] },
    repairs: [],
  }),
  error => error instanceof CreationDecisionError && error.code === 'hard_block_unresolved',
)

console.log('[creator-candidate-quality-gate] PASS')
