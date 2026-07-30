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
