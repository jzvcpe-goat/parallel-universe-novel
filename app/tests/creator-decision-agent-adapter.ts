import assert from 'node:assert/strict'
import { z } from 'zod'
import { executeStructuredAgentCall } from '../src/features/creator-decision/structuredAgentCall'
import {
  countHanCharacters,
  countVisibleCharacters,
  hasCompleteSceneEnding,
  markDraftResultFreshness,
} from '../src/features/creator-decision/sceneDrafting'
import {
  createLiteraryReview,
  evidenceForText,
} from '../src/features/creator-decision/literaryReview'
import {
  requestAuditedStoryStateEvidenceFromWorkingAgent,
  buildLocalRepairComparisonContext,
  createLocalWorkingAgent,
  requestDirectSceneDraftFromWorkingAgent,
  sceneDraftDirectionReceiptFromReview,
} from '../src/features/creator-decision/localWorkingAgent'
import {
  sceneAuthorDirectionDraftReviewSchema,
  sceneDraftResultSchema,
} from '../src/features/creator-decision/schemas'
import {
  buildStoryStateEvidenceOperations,
  storyStateEvidenceOutputSchema,
} from '../src/features/creator-decision/storyStateEvidence'
import {
  buildLocalRepairIntentPreservationRequirements,
  extractLockedIntentListAnchors,
  localRepairIntentPreservationIssues,
} from '../src/features/creator-decision/localRepairIntentPreservation'
import { createCreationSession, createEmptyIntent } from '../src/features/creator-decision/stateMachine'
import { CreationDecisionError } from '../src/features/creator-decision/types'
import type {
  ContextSnapshot,
  NarrativeCandidate,
  SceneDraftResult,
} from '../src/features/creator-decision/types'

const sampleSchema = z.object({ value: z.string().min(1) }).strict()
let attempts = 0
const repaired = await executeStructuredAgentCall({
  schemaName: 'test-result.v1',
  schema: sampleSchema,
  invoke: async ({ attempt, schemaIssues, previousValue }) => {
    attempts += 1
    if (attempt === 'initial') {
      assert.equal(previousValue, undefined)
      return '{invalid-json'
    }
    assert.deepEqual(schemaIssues, ['invalid_json'])
    assert.equal(previousValue, '{invalid-json', 'schema repair receives the exact rejected output')
    return JSON.stringify({ value: 'repaired-once' })
  },
})
assert.deepEqual(repaired, { value: 'repaired-once' })
assert.equal(attempts, 2, 'structured output may be repaired exactly once')

await assert.rejects(
  () => executeStructuredAgentCall({
    schemaName: 'test-result.v1',
    schema: sampleSchema,
    invoke: async () => '{still-invalid',
  }),
  error => error instanceof CreationDecisionError && error.code === 'model_output_invalid',
)

const controller = new AbortController()
controller.abort()
let cancelledInvocations = 0
await assert.rejects(
  () => executeStructuredAgentCall({
    schemaName: 'test-result.v1',
    schema: sampleSchema,
    signal: controller.signal,
    invoke: async () => {
      cancelledInvocations += 1
      return { value: 'must-not-run' }
    },
  }),
  error => error instanceof CreationDecisionError && error.code === 'request_cancelled',
)
assert.equal(cancelledInvocations, 0)
assert.equal(countHanCharacters('雾港，A-17。潮钟响了。'), 6, 'chapter length gates count Han characters rather than punctuation or identifiers')
assert.equal(countVisibleCharacters('雾港，A-17。\n潮钟响了。'), 13, 'scene generation counts every visible non-whitespace character')
assert.equal(hasCompleteSceneEnding('风里传来三次金属回响。'), true, 'a complete Chinese terminal sentence passes')
assert.equal(hasCompleteSceneEnding('他抬起头说：“北口有人。”'), true, 'balanced dialogue may close after terminal punctuation')
assert.equal(
  hasCompleteSceneEnding('陆沉舟看着铁夹新磨出的亮边：“它被拆下来后，又被当成了能反复敲击'),
  false,
  'a scene ending in the middle of a sentence must fail even when its length gate passes',
)
assert.equal(hasCompleteSceneEnding('他抬起头说：“北口有人。'), false, 'unbalanced Chinese quotation marks must fail')

const requestSession = {
  ...createCreationSession({
    id: 'session:stale-adapter',
    workId: 'work:stale',
    branchId: 'branch:main',
    chapterId: 'chapter:stale',
    sceneId: 'scene:stale',
    baseCanonRevision: 2,
  }),
  currentIntentRevision: 3,
  currentCandidateRevision: 4,
  currentDraftRevision: 5,
}
const stale = markDraftResultFreshness({
  session: requestSession,
  intentRevision: 3,
  candidateRevision: 4,
  result: {
    schemaVersion: 'scene-draft.v1',
    draftId: 'draft:late-response',
    sessionId: requestSession.id,
    baseCanonRevision: 2,
    baseIntentRevision: 3,
    baseCandidateRevision: 4,
    baseDraftRevision: 4,
    revision: 5,
    contentBlocks: [],
    unplannedFactProposals: [],
    observedStateChanges: [],
    status: 'current',
    createdAt: new Date().toISOString(),
  },
})
assert.equal(stale.status, 'stale', 'late model results must remain comparison-only')

const evidenceSession = createCreationSession({
  id: 'session:state-evidence',
  workId: 'work:state-evidence',
  branchId: 'branch:main',
  chapterId: 'chapter:20',
  sceneId: 'scene:20',
  baseCanonRevision: 19,
})
const evidenceBlocks = [{
  id: 'block:20:ending',
  text: '林越收起碎裂的通行牌，终于承认自己必须独自穿过暗黑雷鸣废墟。远处的紫色裂纹再次亮起。',
  startOffset: 0,
  endOffset: 49,
  protected: false,
}]
assert.equal(
  storyStateEvidenceOutputSchema.safeParse({
    schemaVersion: 'creator-state-evidence.v1',
    characterStateProposals: [],
    continuityProposals: [],
  }).success,
  true,
  'state evidence may stay empty instead of inventing a character change',
)
const stateEvidence = storyStateEvidenceOutputSchema.parse({
  schemaVersion: 'creator-state-evidence.v1',
  characterStateProposals: [{
    path: '/characters/lin-yue/beliefs',
    value: '必须独自穿过暗黑雷鸣废墟',
    reason: '林越在本章结尾明确接受了独自前进的代价。',
    irreversible: false,
    evidenceQuote: '终于承认自己必须独自穿过暗黑雷鸣废墟',
  }],
  continuityProposals: [{
    kind: 'timeline',
    sourceId: null,
    status: 'advanced',
    statement: '林越在第20章决定独自进入暗黑雷鸣废墟。',
    reason: '该决定把故事时间线推进到下一处冒险地点。',
    irreversible: false,
    evidenceQuote: '必须独自穿过暗黑雷鸣废墟',
  }, {
    kind: 'foreshadowing',
    sourceId: 'purple-cracked-pass',
    status: 'advanced',
    statement: '碎裂通行牌上的紫色裂纹再次发亮。',
    reason: '既有通行牌伏笔在正文中再次出现但尚未回收。',
    irreversible: false,
    evidenceQuote: '紫色裂纹再次亮起',
  }],
})
const stateEvidenceContext = {
  activeCharacters: [{ id: 'lin-yue' }],
  activePromises: [],
  unresolvedForeshadowing: [{ id: 'purple-cracked-pass' }],
  manualRecallItems: [],
}
const evidenceOperations = buildStoryStateEvidenceOperations({
  result: stateEvidence,
  session: evidenceSession,
  blocks: evidenceBlocks,
  context: stateEvidenceContext,
})
assert.equal(evidenceOperations.length, 3)
assert.equal(evidenceOperations[0]?.path, '/characters/lin-yue/beliefs')
assert.equal(evidenceOperations[1]?.path, '/timeline/chapter:20/outcome')
assert.equal(evidenceOperations[2]?.path, '/foreshadowing/purple-cracked-pass/status')
assert.deepEqual(
  evidenceOperations.map(operation => operation.evidenceBlockIds),
  [['block:20:ending'], ['block:20:ending'], ['block:20:ending']],
)
assert.throws(
  () => buildStoryStateEvidenceOperations({
    result: {
      ...stateEvidence,
      characterStateProposals: [{
        ...stateEvidence.characterStateProposals[0]!,
        evidenceQuote: '正文中不存在的句子',
      }],
    },
    session: evidenceSession,
    blocks: evidenceBlocks,
    context: stateEvidenceContext,
  }),
  error => error instanceof CreationDecisionError && error.code === 'evidence_missing',
  'state evidence that cannot be located in the current manuscript must fail closed',
)
assert.throws(
  () => buildStoryStateEvidenceOperations({
    result: {
      ...stateEvidence,
      characterStateProposals: [{
        ...stateEvidence.characterStateProposals[0]!,
        path: '/characters/invented-character/beliefs',
      }],
    },
    session: evidenceSession,
    blocks: evidenceBlocks,
    context: stateEvidenceContext,
  }),
  error => error instanceof CreationDecisionError && error.code === 'model_output_invalid',
  'state evidence must not invent a character outside the current Context Snapshot',
)
assert.throws(
  () => buildStoryStateEvidenceOperations({
    result: {
      ...stateEvidence,
      continuityProposals: [{
        ...stateEvidence.continuityProposals[1]!,
        sourceId: 'invented-foreshadowing',
      }],
    },
    session: evidenceSession,
    blocks: evidenceBlocks,
    context: stateEvidenceContext,
  }),
  error => error instanceof CreationDecisionError && error.code === 'model_output_invalid',
  'advanced continuity evidence must reference a source in the current Context Snapshot',
)
assert.throws(
  () => buildStoryStateEvidenceOperations({
    result: {
      ...stateEvidence,
      continuityProposals: [{
        ...stateEvidence.continuityProposals[1]!,
        status: 'created',
        sourceId: 'purple-cracked-pass',
      }],
    },
    session: evidenceSession,
    blocks: evidenceBlocks,
    context: stateEvidenceContext,
  }),
  error => error instanceof CreationDecisionError && error.code === 'model_output_invalid',
  'new continuity evidence must not pretend to update an existing source',
)

const originalFetch = globalThis.fetch
const decisionRequired = {
  schemaVersion: 'creator-author-decision-required.v1',
  decisionId: 'scene-author-decision:adapter-test',
  pipelineId: 'adapter-test',
  sessionId: 'session:adapter-test',
  intentId: 'intent:adapter-test',
  intentRevision: 4,
  reason: 'scene_architecture_repetition',
  writerInvoked: false,
  canonCommitAllowed: false,
  boundedRevisionExhausted: true,
  initialMechanismIssues: ['repeat:initial'],
  revisionMechanismIssues: ['repeat:revision'],
  initialReview: { decision: 'reject' },
  revisionReview: { decision: 'reject' },
  decisionOptions: {
    schemaVersion: 'creator-scene-author-decision-options.v1',
    question: '请选择一个新的场景发动机制。',
    options: [
      {
        id: 'option:negotiation',
        label: '改为谈判',
        primaryChangedAxis: 'conflictEngine',
        proposedAdjustment: '保留已确认事实，改由权限谈判迫使人物选择。',
        preservedAuthorIntent: ['保留核验成果', '保留知识边界'],
        addressesIssueCodes: ['causal_chain_repetition'],
        whyItBreaksRepetition: '不再复用机械险情和救援分工。',
        expectedMechanismSignature: {
          pressureSource: 'institution',
          conflictEngine: 'negotiation',
          agencyPattern: 'bargain',
          costPattern: 'obligation',
          endingPattern: 'relationship_shift',
        },
        tradeoff: '动作密度下降，关系压力上升。',
      },
      {
        id: 'option:investigation',
        label: '改为核验',
        primaryChangedAxis: 'pressureSource',
        proposedAdjustment: '保留证据，在限时条件下完成一次有限核验。',
        preservedAuthorIntent: ['保留有限结论', '保留未解信息'],
        addressesIssueCodes: ['ending_repetition'],
        whyItBreaksRepetition: '代价改为时间损失，结尾不再销毁证据。',
        expectedMechanismSignature: {
          pressureSource: 'time',
          conflictEngine: 'investigation',
          agencyPattern: 'refusal',
          costPattern: 'time_loss',
          endingPattern: 'promise_advanced',
        },
        tradeoff: '现场危险降低，推理压力更集中。',
      },
    ],
    requiresAuthorSelection: true,
    writerInvoked: false,
    canonCommitAllowed: false,
  },
}
globalThis.fetch = async () => new Response(JSON.stringify({
  error: 'author_decision_required',
  decision: decisionRequired,
}), {
  status: 409,
  headers: { 'Content-Type': 'application/json' },
})
try {
  await assert.rejects(
    () => requestDirectSceneDraftFromWorkingAgent({
      baseUrl: 'http://127.0.0.1:4318',
      payload: {},
    }),
    error => {
      const detail = error instanceof CreationDecisionError
        && error.detail && typeof error.detail === 'object'
        ? error.detail as { decisionId?: string }
        : null
      return error instanceof CreationDecisionError
        && error.code === 'scene_author_decision_required'
        && detail?.decisionId === decisionRequired.decisionId
    },
    'a valid 409 decision contract must reach the workflow without a schema-repair retry',
  )
} finally {
  globalThis.fetch = originalFetch
}
const rejectedDirectionReview = {
  schemaVersion: 'creator-scene-author-direction-draft-review.v1',
  decision: 'reject',
  axisChecks: [
    ['pressureSource', 'resource', 'pass', '资源已经用尽'],
    ['conflictEngine', 'negotiation', 'pass', '他开出了交换条件'],
    ['agencyPattern', 'delegation', 'pass', '他把密钥交给同伴'],
    ['costPattern', 'obligation', 'reject', null],
    ['endingPattern', 'relationship_shift', 'pass', '两人的关系从此改变'],
  ].map(([axis, expectedValue, decision, evidenceQuote]) => ({
    axis,
    expectedValue,
    decision,
    evidenceQuote,
    diagnosis: decision === 'pass'
      ? '正文证据能定位该机制轴。'
      : '正文没有让主角承担作者选定的义务代价。',
  })),
  proposedAdjustmentCheck: {
    decision: 'pass',
    evidenceQuotes: ['他开出了交换条件'],
    diagnosis: '候选已经执行作者选定的资源协商调整。',
  },
  rationale: '资源、协商、委托与关系变化均已执行，但义务代价没有真正到达。',
}
globalThis.fetch = async () => new Response(JSON.stringify({
  error: 'scene_draft_alignment_rejected',
  detail: 'scene_author_direction_draft_rejected',
  review: rejectedDirectionReview,
  rejectedAxes: ['costPattern'],
}), {
  status: 422,
  headers: { 'Content-Type': 'application/json' },
})
try {
  await assert.rejects(
    () => requestDirectSceneDraftFromWorkingAgent({
      baseUrl: 'http://127.0.0.1:4318',
      payload: {},
    }),
    error => {
      const detail = error instanceof CreationDecisionError
        && error.detail && typeof error.detail === 'object'
        ? error.detail as { decision?: string }
        : null
      return error instanceof CreationDecisionError
        && error.code === 'scene_author_direction_draft_rejected'
        && detail?.decision === 'reject'
    },
    'a valid 422 prose-alignment review must reach the workflow as a domain rejection',
  )
} finally {
  globalThis.fetch = originalFetch
}
const directionBlocks = [{
  id: 'block:direction:receipt',
  text: '补给箱已经见底。林越没有硬闯，而是开出交换条件。他把密钥交给同伴，并承诺替对方带回失踪的哨兵。两人的关系从此改变。',
  startOffset: 0,
  endOffset: 61,
  protected: false,
}]
const passingDirectionReview = sceneAuthorDirectionDraftReviewSchema.parse({
  schemaVersion: 'creator-scene-author-direction-draft-review.v1',
  decision: 'pass',
  axisChecks: [
    {
      axis: 'pressureSource',
      expectedValue: 'resource',
      decision: 'pass',
      evidenceQuote: '补给箱已经见底',
      diagnosis: '资源耗尽直接施加现场压力。',
    },
    {
      axis: 'conflictEngine',
      expectedValue: 'negotiation',
      decision: 'pass',
      evidenceQuote: '开出交换条件',
      diagnosis: '冲突通过协商推进。',
    },
    {
      axis: 'agencyPattern',
      expectedValue: 'delegation',
      decision: 'pass',
      evidenceQuote: '把密钥交给同伴',
      diagnosis: '主角主动委托同伴承担行动。',
    },
    {
      axis: 'costPattern',
      expectedValue: 'obligation',
      decision: 'pass',
      evidenceQuote: '承诺替对方带回失踪的哨兵',
      diagnosis: '主角承担了后续义务。',
    },
    {
      axis: 'endingPattern',
      expectedValue: 'relationship_shift',
      decision: 'pass',
      evidenceQuote: '两人的关系从此改变',
      diagnosis: '场景以关系变化收束。',
    },
  ],
  proposedAdjustmentCheck: {
    decision: 'pass',
    evidenceQuotes: ['开出交换条件', '承诺替对方带回失踪的哨兵'],
    diagnosis: '作者选择的资源协商与义务代价都已落到正文。',
  },
  rationale: '五个机制轴与作者调整均有可定位正文证据。',
})
const directionReceipt = sceneDraftDirectionReceiptFromReview({
  review: passingDirectionReview,
  draftBlocks: directionBlocks,
})
assert.equal(directionReceipt.schemaVersion, 'scene-draft-direction-receipt.v1')
assert.equal(directionReceipt.decision, 'pass')
assert.deepEqual(
  directionReceipt.axisChecks.map(check => check.axis),
  ['pressureSource', 'conflictEngine', 'agencyPattern', 'costPattern', 'endingPattern'],
)
assert.ok(directionReceipt.axisChecks.every(check => check.evidence.length >= 1))
assert.ok(directionReceipt.proposedAdjustmentEvidence.length >= 2)
const serializedDirectionReceipt = JSON.stringify(directionReceipt)
for (const rawReviewText of [
  '补给箱已经见底',
  '开出交换条件',
  '把密钥交给同伴',
  '承诺替对方带回失踪的哨兵',
  '两人的关系从此改变',
  passingDirectionReview.rationale,
  passingDirectionReview.proposedAdjustmentCheck.diagnosis,
]) {
  assert.equal(
    serializedDirectionReceipt.includes(rawReviewText),
    false,
    'the local direction receipt must not retain raw Auditor quote text, diagnosis, or rationale',
  )
}
assert.equal(sceneDraftResultSchema.safeParse(stale).success, true, 'legacy drafts without a direction receipt remain readable')
assert.equal(sceneDraftResultSchema.safeParse({
  ...stale,
  contentBlocks: directionBlocks,
  directionReceipt,
}).success, true, 'new drafts may persist the evidence-addressable direction receipt')
assert.throws(
  () => sceneDraftDirectionReceiptFromReview({
    review: sceneAuthorDirectionDraftReviewSchema.parse({
      ...passingDirectionReview,
      axisChecks: passingDirectionReview.axisChecks.map(check => (
        check.axis === 'costPattern'
          ? { ...check, evidenceQuote: '正文中不存在的义务代价' }
          : check
      )),
    }),
    draftBlocks: directionBlocks,
  }),
  error => error instanceof CreationDecisionError && error.code === 'evidence_missing',
  'a passing review with unlocatable prose evidence must fail closed',
)
const bridgeRequests: Array<Record<string, unknown>> = []
const correctedStateEvidence = {
  ...stateEvidence,
  characterStateProposals: [{
    ...stateEvidence.characterStateProposals[0]!,
    irreversible: true,
  }],
}
const bridgeResponses = [
  stateEvidence,
  {
    schemaVersion: 'creator-state-evidence-review.v1',
    decision: 'reject',
    verifiedCharacterProposalIndexes: [],
    verifiedContinuityProposalIndexes: [0, 1],
    issues: [{
      proposalKind: 'character',
      proposalIndex: 0,
      code: 'irreversibility',
      evidenceQuote: '终于承认自己必须独自穿过暗黑雷鸣废墟',
      diagnosis: '已经发生的知识与选择不能标为可撤销。',
    }],
    rationale: '人物状态不可逆性需要一次受限修正。',
  },
  correctedStateEvidence,
  {
    schemaVersion: 'creator-state-evidence-review.v1',
    decision: 'pass',
    verifiedCharacterProposalIndexes: [0],
    verifiedContinuityProposalIndexes: [0, 1],
    issues: [],
    rationale: '修正后所有候选都有完整证据。',
  },
]
globalThis.fetch = async (_input, init) => {
  bridgeRequests.push(JSON.parse(String(init?.body || '{}')) as Record<string, unknown>)
  return new Response(JSON.stringify(bridgeResponses.shift()), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
try {
  const audited = await requestAuditedStoryStateEvidenceFromWorkingAgent({
    baseUrl: 'http://127.0.0.1:4318',
    mode: 'canon_patch',
    payload: {
      session: evidenceSession,
      draft: { contentBlocks: evidenceBlocks },
    },
  })
  assert.equal(audited.attempts, 2, 'one Auditor rejection permits exactly one Observer semantic revision')
  assert.equal(audited.passed, true)
  assert.equal(audited.initialReview?.decision, 'reject')
  assert.equal(audited.finalReview?.decision, 'pass')
  assert.equal(audited.evidence.characterStateProposals[0]?.irreversible, true)
  assert.deepEqual(
    bridgeRequests.map(request => request.operation),
    ['state_evidence', 'state_evidence_review', 'state_evidence', 'state_evidence_review'],
  )
  const revisionPayload = bridgeRequests[2]?.payload as Record<string, unknown>
  assert.equal(revisionPayload.mode, 'canon_patch_semantic_revision')
  assert.deepEqual(revisionPayload.previousEvidence, stateEvidence)
} finally {
  globalThis.fetch = originalFetch
}

const literarySession = createCreationSession({
  id: 'session:literary-evidence-revision',
  workId: 'work:literary-evidence-revision',
  branchId: 'branch:main',
  chapterId: 'chapter:frozen-fixture',
  sceneId: 'scene:frozen-fixture',
  baseCanonRevision: 1,
})
const literaryIntent = {
  ...createEmptyIntent({
    sessionId: literarySession.id,
    revision: 1,
    primaryActorId: 'character:lin-lin',
  }),
  status: 'locked' as const,
  lockedAt: '2026-07-16T00:00:00.000Z',
}
const literaryContext = {
  schemaVersion: 'context-snapshot.v1',
  id: 'context:literary-evidence-revision',
  compilationPolicyVersion: 1,
  sourceFingerprint: 'fixture:literary-evidence-revision',
  sessionId: literarySession.id,
  intentRevision: literaryIntent.revision,
  workId: literarySession.workId,
  chapterId: literarySession.chapterId,
  sceneId: literarySession.sceneId,
  canonRevision: 1,
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
  createdAt: '2026-07-16T00:00:00.000Z',
} satisfies ContextSnapshot
const literaryCandidate = {
  schemaVersion: 'narrative-candidate.v1',
  id: 'candidate:literary-evidence-revision',
  sessionId: literarySession.id,
  intentRevision: literaryIntent.revision,
  contextSnapshotId: literaryContext.id,
  revision: 1,
  status: 'selected',
  title: '分出最后补给',
  oneSentenceMechanism: '林林主动让出最后补给，并承担之后独自赶路的风险。',
  strategyAxes: {
    conflictMode: 'sacrifice',
    informationMode: 'partial_reveal',
    agencyOwnerId: 'character:lin-lin',
    costType: 'resource_loss',
    pacing: 'balanced',
    viewpointId: 'character:lin-lin',
  },
  beats: [],
  projectedEffects: {
    stateChanges: [],
    irreversibleChanges: [],
    promisesCreated: [],
    promisesConsumed: [],
    futureDebts: [],
    characterCosts: [],
  },
  tradeoffs: { strengths: [], risks: [], clicheRisks: [], uncertainties: [] },
  validation: { hardConstraintPassed: true, violations: [] },
} satisfies NarrativeCandidate
const literaryDraftText = '林林把最后一块干粮推给同伴。风从破损的石门后灌进来，她没有收回手。'
const literaryDraft = {
  schemaVersion: 'scene-draft.v1',
  draftId: 'draft:literary-evidence-revision',
  sessionId: literarySession.id,
  baseCanonRevision: 1,
  baseIntentRevision: literaryIntent.revision,
  baseCandidateRevision: literaryCandidate.revision,
  baseDraftRevision: 0,
  revision: 1,
  contentBlocks: [{
    id: 'block:literary-evidence-revision',
    text: literaryDraftText,
    startOffset: 0,
    endOffset: literaryDraftText.length,
    protected: false,
  }],
  unplannedFactProposals: [],
  observedStateChanges: [],
  status: 'current',
  createdAt: '2026-07-16T00:00:00.000Z',
} satisfies SceneDraftResult
const validLiteraryFinding = {
  dimension: 'character_agency',
  severity: 'revision_candidate',
  evidenceQuote: '林林把最后一块干粮推给同伴',
  expected: '人物选择应当在当前场景中造成一项可见代价。',
  observed: '当前选择已经出现，但后续风险仍可在局部写得更明确。',
  readerImpact: '读者需要看见主动让出资源如何限制人物下一步行动。',
  diagnosis: '人物能动性已经成立，但选择与即时后果之间仍可加强。',
  repairDirection: '只在当前证据块内补足失去补给后的行动限制。',
  confidence: 'medium',
} as const
const literaryReviewInput = {
  session: literarySession,
  intent: literaryIntent,
  context: literaryContext,
  candidate: literaryCandidate,
  draft: literaryDraft,
}
const literaryAgent = createLocalWorkingAgent('http://127.0.0.1:4318')

let missingRecentContextFetches = 0
globalThis.fetch = async () => {
  missingRecentContextFetches += 1
  return new Response('{}', { status: 500 })
}
try {
  await assert.rejects(
    () => literaryAgent.draftScene({
      session: literarySession,
      intent: literaryIntent,
      context: literaryContext,
      candidate: literaryCandidate,
      request: {
        sessionId: literarySession.id,
        intentId: literaryIntent.id,
        intentRevision: literaryIntent.revision,
        candidateId: literaryCandidate.id,
        candidateRevision: literaryCandidate.revision,
        contextSnapshotId: literaryContext.id,
        baseCanonRevision: literarySession.baseCanonRevision,
        baseDraftRevision: literarySession.currentDraftRevision,
        scope: {
          type: 'scene',
          sceneId: literarySession.sceneId,
          beatIds: [],
          selectedBlockIds: [],
        },
        protectedBlockIds: [],
        targetLength: { minimum: 2700, maximum: 3400 },
        writingMode: 'continue_author_text',
        chapterNumber: 20,
      },
      currentBlocks: literaryDraft.contentBlocks,
    }),
    error => error instanceof CreationDecisionError
      && error.code === 'recent_scene_context_required',
    'a long-form continuation without current or selected recent-scene evidence must fail before model invocation',
  )
  assert.equal(missingRecentContextFetches, 0, 'missing long-form context must not spend a model call')
} finally {
  globalThis.fetch = originalFetch
}

const comparisonBlock = {
  id: 'block:comparison',
  text: '同伴已经承担过这项决定。',
  startOffset: 0,
  endOffset: 12,
  protected: false,
}
const activeRepetitionFinding = {
  id: 'finding:active-repetition',
  dimension: 'repetition',
  severity: 'revision_candidate',
  evidence: [],
  expected: '当前块必须推进新的叙事变化。',
  observed: '当前块近义复述了此前决定。',
  readerImpact: '读者会感到场景停滞。',
  diagnosis: '同一决定被重复说明。',
  repairDirection: '只改当前块并形成新的行动后果。',
  protectedBlockIds: [],
  confidence: 'high',
  status: 'active',
} as const
assert.deepEqual(buildLocalRepairComparisonContext({
  attempt: 'initial',
  draftBlocks: [literaryDraft.contentBlocks[0], comparisonBlock],
  targetBlockId: literaryDraft.contentBlocks[0].id,
  findings: [activeRepetitionFinding],
  targetDimension: 'repetition',
}), {
  chapterComparisonBlocks: [comparisonBlock],
  sameDimensionFindings: [activeRepetitionFinding],
}, 'a repetition repair must receive chapter-wide comparison evidence on its first attempt')
assert.deepEqual(buildLocalRepairComparisonContext({
  attempt: 'initial',
  draftBlocks: [literaryDraft.contentBlocks[0], comparisonBlock],
  targetBlockId: literaryDraft.contentBlocks[0].id,
  findings: [{ ...activeRepetitionFinding, dimension: 'pacing' }],
  targetDimension: 'pacing',
}), {
  chapterComparisonBlocks: [],
  sameDimensionFindings: [],
}, 'an ordinary first repair must remain local unless its diagnosis requires comparison evidence')
assert.deepEqual(buildLocalRepairComparisonContext({
  attempt: 'efficacy_retry',
  draftBlocks: [literaryDraft.contentBlocks[0], comparisonBlock],
  targetBlockId: literaryDraft.contentBlocks[0].id,
  findings: [activeRepetitionFinding, { ...activeRepetitionFinding, id: 'finding:resolved', status: 'resolved' }],
  targetDimension: 'repetition',
}), {
  chapterComparisonBlocks: [comparisonBlock],
  sameDimensionFindings: [activeRepetitionFinding],
}, 'efficacy retry must compare against every other chapter block and only active same-dimension findings')

const lockedChoice = '陆沉舟放弃继续辨认木条，把主索、配重和支撑脚的受力顺序报告给贺岚、穆笙和塞文，让三人按各自权限处置。'
assert.deepEqual(extractLockedIntentListAnchors(lockedChoice), [
  ['主索', '配重', '支撑脚'],
  ['贺岚', '穆笙', '塞文'],
], 'locked author intent must expose each listed object and recipient as an indivisible preservation group')
const localRepairIntent = {
  ...literaryIntent,
  characterAgency: {
    ...literaryIntent.characterAgency,
    requiredChoice: lockedChoice,
  },
}
const lockedTargetBlock = {
  id: 'block:locked-intent-repair',
  text: '陆沉舟先报出主索、配重和支撑脚的受力顺序，再逐句告知贺岚、穆笙和塞文。三人各按权限处置。',
  startOffset: 0,
  endOffset: 0,
  protected: false,
}
lockedTargetBlock.endOffset = lockedTargetBlock.text.length
const intentPreservationRequirements = buildLocalRepairIntentPreservationRequirements({
  intent: localRepairIntent,
  targetBlockText: lockedTargetBlock.text,
})
assert.deepEqual(intentPreservationRequirements.map(item => item.requiredAnchors), [
  ['主索', '配重', '支撑脚'],
  ['贺岚', '穆笙', '塞文'],
], 'only locked lists already realized in the target block become local-repair invariants')
const narrowedRepair = {
  schemaVersion: 'creator-local-repair.v1',
  findingId: 'finding:locked-intent',
  targetBlockId: lockedTargetBlock.id,
  operation: 'replace_range',
  proposedContent: '陆沉舟先报出主索、配重和支撑脚的受力顺序，再逐句告知贺岚。她按权限处置。',
  preservedFacts: [{
    fact: '陆沉舟仍报告三项受力对象',
    sourceEvidenceQuote: '主索、配重和支撑脚',
    candidateEvidenceQuote: '主索、配重和支撑脚',
  }],
  rationale: '只压缩重复动作。',
} as const
const narrowedIssues = localRepairIntentPreservationIssues({
  candidate: narrowedRepair,
  requirements: intentPreservationRequirements,
})
assert.deepEqual(narrowedIssues.map(issue => issue.dimension), ['author_intent'])
assert.match(narrowedIssues[0]!.diagnosis, /穆笙、塞文/)
const untrackedRepair = {
  ...narrowedRepair,
  proposedContent: lockedTargetBlock.text,
}
const untrackedIssues = localRepairIntentPreservationIssues({
  candidate: untrackedRepair,
  requirements: intentPreservationRequirements,
})
assert.deepEqual(untrackedIssues.map(issue => issue.dimension), ['fact_preservation'])
assert.ok(
  untrackedRepair.proposedContent.includes(untrackedIssues[0]!.candidateEvidenceQuote || ''),
  'deterministic intent issues must still cite exact candidate evidence',
)
const fullyTrackedRepair = {
  ...untrackedRepair,
  preservedFacts: [
    {
      fact: '陆沉舟仍报告主索、配重和支撑脚',
      sourceEvidenceQuote: '主索、配重和支撑脚',
      candidateEvidenceQuote: '主索、配重和支撑脚',
    },
    {
      fact: '陆沉舟仍逐项告知贺岚、穆笙和塞文',
      sourceEvidenceQuote: '贺岚、穆笙和塞文',
      candidateEvidenceQuote: '贺岚、穆笙和塞文',
    },
  ],
}
assert.deepEqual(localRepairIntentPreservationIssues({
  candidate: fullyTrackedRepair,
  requirements: intentPreservationRequirements,
}), [], 'a candidate that preserves and tracks every locked list may proceed to the independent literary review')

const lockedRepairDraft = {
  ...literaryDraft,
  draftId: 'draft:locked-intent-repair',
  baseIntentRevision: localRepairIntent.revision,
  contentBlocks: [lockedTargetBlock],
}
const lockedRepairEvidence = evidenceForText(lockedTargetBlock, '逐句告知贺岚、穆笙和塞文')
assert.ok(lockedRepairEvidence)
const lockedRepairFinding = {
  ...activeRepetitionFinding,
  id: 'finding:locked-intent',
  evidence: [lockedRepairEvidence],
}
const lockedRepairReview = createLiteraryReview({
  id: 'review:locked-intent-repair',
  sessionId: literarySession.id,
  context: literaryContext,
  draft: lockedRepairDraft,
  findings: [lockedRepairFinding],
})
const deterministicReviewRequests: Array<Record<string, unknown>> = []
globalThis.fetch = async (_input, init) => {
  const request = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>
  deterministicReviewRequests.push(request)
  return new Response(JSON.stringify({
    schemaVersion: 'creator-local-repair-review.v1',
    findingId: lockedRepairFinding.id,
    targetBlockId: lockedTargetBlock.id,
    decision: 'pass',
    verifiedPreservedFactIndexes: [0],
    issues: [],
    rationale: '模型审校错误地认为候选已经保留全部作者意图。',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
try {
  const deterministicReview = await literaryAgent.reviewRepair!({
    session: literarySession,
    intent: localRepairIntent,
    context: literaryContext,
    candidate: literaryCandidate,
    draft: lockedRepairDraft,
    review: lockedRepairReview,
    finding: lockedRepairFinding,
    targetBlock: lockedTargetBlock,
    repair: narrowedRepair,
  })
  assert.equal(deterministicReview.decision, 'reject')
  assert.deepEqual(deterministicReview.issues.map(issue => issue.dimension), ['author_intent'])
  const reviewPayload = deterministicReviewRequests[0]?.payload as Record<string, unknown>
  assert.deepEqual(
    (reviewPayload.intentPreservationRequirements as Array<{ requiredAnchors: string[] }>).map(item => item.requiredAnchors),
    [
      ['主索', '配重', '支撑脚'],
      ['贺岚', '穆笙', '塞文'],
    ],
    'the independent repair review must receive the same deterministic author-intent requirements as the Reviser',
  )
} finally {
  globalThis.fetch = originalFetch
}
const literaryBridgeRequests: Array<Record<string, unknown>> = []
const invalidLiteraryFinding = {
  ...validLiteraryFinding,
  evidenceQuote: '正文中不存在的伪造人物选择',
}
let literaryBridgeResponses: unknown[] = [
  { schemaVersion: 'creator-literary-review.v1', findings: [invalidLiteraryFinding] },
  { schemaVersion: 'creator-literary-review.v1', findings: [validLiteraryFinding] },
]
globalThis.fetch = async (_input, init) => {
  const request = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>
  literaryBridgeRequests.push(request)
  const payload = request.payload as Record<string, unknown>
  const findings = payload?.findings as Array<Record<string, unknown>> | undefined
  const finding = findings?.[0]
  const response = request.operation === 'literary_review_verification'
    ? {
        schemaVersion: 'creator-literary-review-verification.v1',
        reviewId: payload.reviewId,
        findings: [{
          findingId: finding?.id,
          dimension: finding?.dimension,
          severity: finding?.severity,
          decision: 'verify',
          evidenceQuote: finding?.evidenceQuote,
          rationale: '已独立复核同一正文位置，原问题和严重度均由该证据支持。',
        }],
        compositeLiteraryScoreUsed: false,
      }
    : literaryBridgeResponses.shift()
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
try {
  const literaryReview = await literaryAgent.reviewDraft(literaryReviewInput)
  assert.equal(
    literaryReview.findings.some(finding => finding.dimension === 'character_agency'
      && finding.evidence.some(evidence => evidence.blockId === literaryDraft.contentBlocks[0].id)),
    true,
    'one evidence-only Auditor revision may restore an exact manuscript locator',
  )
  assert.deepEqual(
    literaryBridgeRequests.map(request => request.operation),
    ['literary_review', 'literary_review_revision', 'literary_review_verification'],
    'unlocatable literary evidence permits exactly one same-role evidence revision before independent verification',
  )
  const revisionPayload = literaryBridgeRequests[1]?.payload as Record<string, unknown>
  assert.deepEqual(revisionPayload.previousReview, {
    schemaVersion: 'creator-literary-review.v1',
    findings: [invalidLiteraryFinding],
  })
  assert.match(JSON.stringify(revisionPayload.validationIssue), /evidence_missing/)
  assert.deepEqual(literaryReview.modelFindingVerification?.verifiedFindingIds.length, 1)
  assert.deepEqual(literaryReview.modelFindingVerification?.rejectedFindingIds, [])
} finally {
  globalThis.fetch = originalFetch
}

literaryBridgeRequests.length = 0
literaryBridgeResponses = [
  { schemaVersion: 'creator-literary-review.v1', findings: [invalidLiteraryFinding] },
  { schemaVersion: 'creator-literary-review.v1', findings: [invalidLiteraryFinding] },
]
globalThis.fetch = async (_input, init) => {
  literaryBridgeRequests.push(JSON.parse(String(init?.body || '{}')) as Record<string, unknown>)
  return new Response(JSON.stringify(literaryBridgeResponses.shift()), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
try {
  await assert.rejects(
    () => literaryAgent.reviewDraft(literaryReviewInput),
    error => error instanceof CreationDecisionError && error.code === 'evidence_missing',
    'a second unlocatable Auditor result must fail closed without another retry',
  )
  assert.deepEqual(
    literaryBridgeRequests.map(request => request.operation),
    ['literary_review', 'literary_review_revision'],
  )
} finally {
  globalThis.fetch = originalFetch
}

literaryBridgeRequests.length = 0
literaryBridgeResponses = [
  { schemaVersion: 'creator-literary-review.v1', findings: [validLiteraryFinding] },
]
globalThis.fetch = async (_input, init) => {
  const request = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>
  literaryBridgeRequests.push(request)
  const payload = request.payload as Record<string, unknown>
  const findings = payload?.findings as Array<Record<string, unknown>> | undefined
  const finding = findings?.[0]
  const response = request.operation === 'literary_review_verification'
    ? {
        schemaVersion: 'creator-literary-review-verification.v1',
        reviewId: payload.reviewId,
        findings: [{
          findingId: finding?.id,
          dimension: finding?.dimension,
          severity: finding?.severity,
          decision: 'reject',
          evidenceQuote: finding?.evidenceQuote,
          rationale: '该引文只呈现人物动作，不能支持首轮声称的显著阅读问题。',
        }],
        compositeLiteraryScoreUsed: false,
      }
    : literaryBridgeResponses.shift()
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
try {
  const rejectedReview = await literaryAgent.reviewDraft(literaryReviewInput)
  assert.equal(
    rejectedReview.findings.some(finding => finding.dimension === 'character_agency'),
    false,
    'a second Auditor rejection must prevent a model-only finding from reaching repair scheduling',
  )
  assert.equal(rejectedReview.modelFindingVerification?.rejectedFindingIds.length, 1)
  assert.deepEqual(
    literaryBridgeRequests.map(request => request.operation),
    ['literary_review', 'literary_review_verification'],
  )
} finally {
  globalThis.fetch = originalFetch
}

literaryBridgeRequests.length = 0
const advisoryEvidenceQuote = '把最后一块干粮推给同伴'
globalThis.fetch = async (_input, init) => {
  const request = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>
  literaryBridgeRequests.push(request)
  const payload = request.payload as Record<string, unknown>
  const findings = payload?.findings as Array<Record<string, unknown>> | undefined
  const finding = findings?.[0]
  const response = request.operation === 'advisory_craft_verification'
    ? {
        schemaVersion: 'creator-advisory-craft-verification.v1',
        reviewId: payload.reviewId,
        findings: [{
          findingId: finding?.id,
          lensId: finding?.lensId,
          severity: finding?.severity,
          decision: 'verify',
          evidenceQuote: finding?.evidenceQuote,
          rationale: '同一动作同时承担了资源让渡和关系压力，证据足以支持这条局部取舍建议。',
        }],
        compositeLiteraryScoreUsed: false,
      }
    : {
        schemaVersion: 'creator-literary-review.v1',
        findings: [],
        extendedCraft: {
          requestedLensIds: ['ending_payoff'],
          findings: [{
            lensId: 'ending_payoff',
            severity: 'revision_candidate',
            evidenceQuote: advisoryEvidenceQuote,
            diagnosis: '资源让渡已经发生，但这一选择在段尾造成的新压力仍可更清楚。',
            readerEffectHypothesis: '读者可能理解人物付出了代价，却还不确定这项代价将怎样限制下一步。',
            authorTradeoff: '保留含蓄能维持余味，但会降低段尾推进感。',
            smallestExperiment: '只在证据动作之后补一个即时受限后果，不改前文。',
            mappedExistingDimensions: ['tension', 'pacing'],
            confidence: 'medium',
          }],
        },
      }
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
try {
  const advisoryReview = await literaryAgent.reviewDraft({
    ...literaryReviewInput,
    requestedAdvisoryLensIds: ['ending_payoff'],
  })
  assert.deepEqual(
    literaryBridgeRequests.map(request => request.operation),
    ['literary_review', 'advisory_craft_verification'],
    'an enabled advisory lens must run inside the real literary review path and receive an independent Auditor verification',
  )
  assert.deepEqual(advisoryReview.extendedCraft?.requestedLensIds, ['ending_payoff'])
  assert.equal(advisoryReview.extendedCraft?.findings[0]?.verification, 'verified')
  assert.equal(advisoryReview.extendedCraft?.findings[0]?.status, 'active')
  assert.deepEqual(advisoryReview.extendedCraft?.verificationReceipt?.verifiedFindingIds, [
    advisoryReview.extendedCraft?.findings[0]?.id,
  ])
} finally {
  globalThis.fetch = originalFetch
}

console.log('Creator decision structured agent adapter fixture passed.')
