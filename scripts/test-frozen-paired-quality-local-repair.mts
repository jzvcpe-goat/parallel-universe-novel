import assert from 'node:assert/strict'
import {
  applyRepairProposal,
  createLiteraryReview,
  createRepairProposal,
  evidenceForDraftQuote,
} from '../app/src/features/creator-decision/literaryReview.ts'
import {
  createDraftResult,
  draftBlocksFromText,
} from '../app/src/features/creator-decision/sceneDrafting.ts'
import { CONTEXT_COMPILATION_POLICY_VERSION } from '../app/src/features/creator-decision/contextCompiler.ts'
import type {
  ContextSnapshot,
  LiteraryFinding,
  SceneDraftRequest,
} from '../app/src/features/creator-decision/types.ts'
import {
  assessOptionalLocalRepairEfficacy,
  compareOptionalLocalRepairPriority,
  executeBoundedOptionalLocalRepair,
  executeSingleEfficacyGuidedRepair,
  optionalLocalRepairNextAction,
  selectEfficacyGuidedRetryTarget,
} from './frozen-paired-quality-local-repair.mts'

const repair = (id: string) => ({ id, preservedFacts: ['fact:one'] })
const pass = { decision: 'pass' as const }
const reject = { decision: 'reject' as const }

assert.equal(optionalLocalRepairNextAction('initial_repair_failed_closed'), 'continue_original_candidate')
assert.equal(optionalLocalRepairNextAction('independent_review_failed_closed'), 'continue_original_candidate')
assert.equal(optionalLocalRepairNextAction('auditor_guided_revision_failed_closed'), 'continue_original_candidate')
assert.equal(optionalLocalRepairNextAction('rejected_by_auditor'), 'continue_original_candidate')
assert.equal(
  optionalLocalRepairNextAction('discarded_outside_length_or_ending_contract'),
  'continue_original_candidate',
)
assert.equal(optionalLocalRepairNextAction('applied'), 'continue_revised_candidate')
assert.equal(optionalLocalRepairNextAction('reverted_target_dimension_persisted'), 'continue_original_candidate')
assert.equal(optionalLocalRepairNextAction('reverted_author_direction_not_retained'), 'continue_original_candidate')
assert.equal(optionalLocalRepairNextAction('post_repair_direction_review_failed_closed'), 'continue_original_candidate')

const focusedVoice = {
  id: 'finding:voice',
  dimension: 'voice',
  severity: 'revision_candidate',
  confidence: 'medium',
}
const focusedPacing = {
  id: 'finding:pacing',
  dimension: 'pacing',
  severity: 'revision_candidate',
  confidence: 'high',
}
const nonFocusedRepetition = {
  id: 'finding:repetition',
  dimension: 'repetition',
  severity: 'revision_candidate',
  confidence: 'high',
}
const continuityHardBlock = {
  id: 'finding:continuity',
  dimension: 'continuity',
  severity: 'hard_block',
  confidence: 'low',
}
assert.ok(compareOptionalLocalRepairPriority(
  continuityHardBlock,
  focusedVoice,
  ['voice', 'pacing'],
) < 0, 'hard blocks must remain ahead of a focused revision candidate')
assert.ok(compareOptionalLocalRepairPriority(
  focusedVoice,
  nonFocusedRepetition,
  ['voice', 'pacing'],
) < 0, 'human focus must outrank non-focused confidence within one severity')
assert.ok(compareOptionalLocalRepairPriority(
  focusedVoice,
  focusedPacing,
  ['voice', 'pacing'],
) < 0, 'human focus order must be preserved')
assert.ok(compareOptionalLocalRepairPriority(
  nonFocusedRepetition,
  focusedPacing,
  [],
) < 0, 'the established default dimension order must remain when no focus is supplied')

assert.deepEqual(
  assessOptionalLocalRepairEfficacy({
    targetDimension: 'voice',
    findings: [
      { dimension: 'voice', severity: 'revision_candidate', status: 'active' },
      { dimension: 'pacing', severity: 'hard_block', status: 'active' },
      { dimension: 'voice', severity: 'taste_note', status: 'active' },
    ],
  }),
  {
    decision: 'revert_original_candidate',
    activeTargetDimensionFindingCount: 1,
  },
)

const retryTarget = selectEfficacyGuidedRetryTarget({
  targetDimension: 'pacing',
  findings: [
    {
      id: 'finding:other-dimension',
      dimension: 'voice',
      severity: 'hard_block',
      status: 'active',
      confidence: 'high',
      evidence: [{ blockId: 'block:voice' }],
      protectedBlockIds: [],
    },
    {
      id: 'finding:protected',
      dimension: 'voice',
      severity: 'hard_block',
      status: 'active',
      confidence: 'high',
      evidence: [{ blockId: 'block:protected' }],
      protectedBlockIds: ['block:protected'],
    },
    {
      id: 'finding:pacing-retry',
      dimension: 'pacing',
      severity: 'revision_candidate',
      status: 'active',
      confidence: 'high',
      evidence: [{ blockId: 'block:pacing' }],
      protectedBlockIds: [],
    },
  ],
  blocks: [
    { id: 'block:voice', protected: false },
    { id: 'block:protected', protected: true },
    { id: 'block:pacing', protected: false },
  ],
})
assert.deepEqual(retryTarget, {
  findingId: 'finding:pacing-retry',
  targetBlockId: 'block:pacing',
}, 'an efficacy retry must stay on the same dimension and one unprotected evidence block')
assert.equal(selectEfficacyGuidedRetryTarget({
  targetDimension: 'pacing',
  findings: [{
    id: 'finding:protected-only',
    dimension: 'pacing',
    severity: 'hard_block',
    status: 'active',
    confidence: 'high',
    evidence: [{ blockId: 'block:protected' }],
    protectedBlockIds: ['block:protected'],
  }],
  blocks: [{ id: 'block:protected', protected: true }],
}), null, 'a protected target must not enter efficacy-guided local repair')
assert.equal(selectEfficacyGuidedRetryTarget({
  targetDimension: 'pacing',
  findings: [{
    id: 'finding:multi-block',
    dimension: 'pacing',
    severity: 'revision_candidate',
    status: 'active',
    confidence: 'high',
    evidence: [{ blockId: 'block:a' }, { blockId: 'block:b' }],
    protectedBlockIds: [],
  }],
  blocks: [{ id: 'block:a', protected: false }, { id: 'block:b', protected: false }],
}), null, 'a multi-block efficacy finding must not expand the retry scope')
assert.equal(selectEfficacyGuidedRetryTarget({
  targetDimension: 'repetition',
  findings: [
    {
      id: 'finding:repeat-a',
      dimension: 'repetition',
      severity: 'revision_candidate',
      status: 'active',
      confidence: 'high',
      evidence: [{ blockId: 'block:a' }],
      protectedBlockIds: [],
    },
    {
      id: 'finding:repeat-b',
      dimension: 'repetition',
      severity: 'revision_candidate',
      status: 'active',
      confidence: 'high',
      evidence: [{ blockId: 'block:b' }],
      protectedBlockIds: [],
    },
  ],
  blocks: [{ id: 'block:a', protected: false }, { id: 'block:b', protected: false }],
}), null, 'multiple active findings in one dimension must not be disguised as one-block efficacy repair')
assert.deepEqual(
  assessOptionalLocalRepairEfficacy({
    targetDimension: 'voice',
    findings: [
      { dimension: 'voice', severity: 'revision_candidate', status: 'resolved' },
      { dimension: 'pacing', severity: 'hard_block', status: 'active' },
    ],
  }),
  {
    decision: 'retain_revised_candidate',
    activeTargetDimensionFindingCount: 0,
  },
)

assert.deepEqual(
  await executeBoundedOptionalLocalRepair({
    proposeInitial: async () => { throw new Error('fixture_initial_failure') },
    review: async () => pass,
    proposeAuditorRevision: async () => repair('unused'),
  }),
  {
    status: 'failed_closed',
    disposition: 'initial_repair_failed_closed',
    reviserAttempts: 1,
    independentReviewDecision: 'not_run',
    preservedFactCount: 0,
  },
)

assert.deepEqual(
  await executeBoundedOptionalLocalRepair({
    proposeInitial: async () => repair('initial'),
    review: async () => reject,
    proposeAuditorRevision: async () => { throw new Error('fixture_revision_not_distinct') },
  }),
  {
    status: 'failed_closed',
    disposition: 'auditor_guided_revision_failed_closed',
    reviserAttempts: 2,
    independentReviewDecision: 'reject',
    preservedFactCount: 1,
  },
)

let reviewCount = 0
const completed = await executeBoundedOptionalLocalRepair({
  proposeInitial: async () => repair('initial'),
  review: async () => (++reviewCount === 1 ? reject : pass),
  proposeAuditorRevision: async () => repair('revised'),
})
assert.equal(completed.status, 'completed')
if (completed.status === 'completed') {
  assert.equal(completed.repair.id, 'revised')
  assert.equal(completed.independentReview.decision, 'pass')
  assert.equal(completed.reviserAttempts, 2)
}

const reviewFailure = await executeBoundedOptionalLocalRepair({
  proposeInitial: async () => repair('initial'),
  review: async () => { throw new Error('fixture_auditor_unavailable') },
  proposeAuditorRevision: async () => repair('unused'),
})
assert.equal(reviewFailure.status, 'failed_closed')
if (reviewFailure.status === 'failed_closed') {
  assert.equal(reviewFailure.disposition, 'independent_review_failed_closed')
  assert.equal(reviewFailure.independentReviewDecision, 'not_run')
}

assert.deepEqual(
  await executeSingleEfficacyGuidedRepair({
    propose: async () => repair('efficacy-retry'),
    review: async () => pass,
  }),
  {
    status: 'completed',
    repair: repair('efficacy-retry'),
    independentReview: pass,
  },
)
const efficacyRejected = await executeSingleEfficacyGuidedRepair({
  propose: async () => repair('efficacy-rejected'),
  review: async () => reject,
})
assert.equal(efficacyRejected.status, 'rejected')
const efficacyFailed = await executeSingleEfficacyGuidedRepair({
  propose: async () => { throw new Error('fixture_efficacy_reviser_failed') },
  review: async () => pass,
})
assert.deepEqual(efficacyFailed, {
  status: 'failed_closed',
  failedAt: 'reviser',
  preservedFactCount: 0,
})

const versionedRequest: SceneDraftRequest = {
  sessionId: 'session:versioned-repair',
  intentId: 'intent:versioned-repair',
  intentRevision: 1,
  candidateId: 'candidate:versioned-repair',
  candidateRevision: 1,
  contextSnapshotId: 'context:versioned-repair',
  baseCanonRevision: 1,
  baseDraftRevision: 0,
  scope: { type: 'scene', sceneId: 'scene:versioned-repair', beatIds: [], selectedBlockIds: [] },
  protectedBlockIds: [],
  targetLength: { minimum: 1, maximum: 1000 },
  writingMode: 'agent_first_draft',
}
const versionedDraft = createDraftResult({
  request: versionedRequest,
  contentBlocks: draftBlocksFromText('第一段。\n\n重复段。'),
  now: '2026-07-17T00:00:00.000Z',
})
const versionedEvidence = evidenceForDraftQuote(versionedDraft.contentBlocks, '重复段。')
assert.ok(versionedEvidence)
const versionedFinding: LiteraryFinding = {
  id: 'finding:versioned-repair',
  dimension: 'repetition',
  severity: 'revision_candidate',
  evidence: versionedEvidence,
  expected: '段落继续推进。',
  observed: '段落重复。',
  readerImpact: '推进停滞。',
  diagnosis: '冻结版本夹具。',
  repairDirection: '只删除证据段。',
  protectedBlockIds: [],
  confidence: 'high',
  status: 'active',
}
const versionedContext: ContextSnapshot = {
  schemaVersion: 'context-snapshot.v1',
  id: versionedRequest.contextSnapshotId,
  compilationPolicyVersion: CONTEXT_COMPILATION_POLICY_VERSION,
  sourceFingerprint: 'context-source:versioned-repair',
  sessionId: versionedRequest.sessionId,
  intentRevision: versionedRequest.intentRevision,
  workId: 'work:versioned-repair',
  chapterId: 'chapter:versioned-repair',
  sceneId: versionedRequest.scope.sceneId,
  canonRevision: versionedRequest.baseCanonRevision,
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
const versionedReview = createLiteraryReview({
  id: 'review:versioned-repair',
  sessionId: versionedRequest.sessionId,
  context: versionedContext,
  draft: versionedDraft,
  findings: [versionedFinding],
})
assert.equal(versionedDraft.baseDraftRevision, 0)
assert.equal(versionedDraft.revision, 1)
assert.equal(versionedReview.baseDraftRevision, 1, 'a review must bind the current reviewed draft revision')
const versionedProposal = createRepairProposal({
  id: 'repair:versioned-repair',
  review: versionedReview,
  findingId: versionedFinding.id,
  operation: 'delete_range',
  proposedContent: null,
})
assert.equal(versionedProposal.baseDraftRevision, 1)
assert.equal(applyRepairProposal({
  proposal: versionedProposal,
  blocks: versionedDraft.contentBlocks,
  currentDraftRevision: versionedDraft.revision,
}).length, 1, 'a repair reviewed against revision 1 must apply to revision 1')

console.log('[frozen-paired-quality-local-repair] PASS')
