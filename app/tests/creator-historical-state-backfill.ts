import assert from 'node:assert/strict'
import {
  createHistoricalStateBackfillProposal,
  rejectHistoricalStateBackfillProposal,
} from '../src/features/creator-decision/historicalStateBackfill'
import { proposeHistoricalStateBackfillWithWorkingAgent } from '../src/features/creator-decision/historicalStateBackfillAgent'
import { createCreationSession } from '../src/features/creator-decision/stateMachine'
import {
  buildStoryStateEvidenceOperations,
  storyStateEvidenceOutputSchema,
  validateStoryStateEvidenceReview,
} from '../src/features/creator-decision/storyStateEvidence'
import { CreationDecisionError } from '../src/features/creator-decision/types'
import type {
  LocalCanonStateRecord,
  StatePatchOperation,
} from '../src/features/creator-decision/types'
import { MemoryCreationDecisionRepository } from '../src/local-db/creatorLocalDecisionRepository'

const committedAt = '2026-07-14T20:00:00.000Z'
const proposalAt = '2026-07-15T09:00:00.000Z'
const confirmedAt = '2026-07-15T09:05:00.000Z'
const sessionId = 'creation-session:historical:chapter-8'

const acceptedBlocks = [
  {
    id: 'chapter-8:block-1',
    text: '林越把最后一枚锈蚀齿轮压进掌心，记住了赛丽亚没有说出口的警告。',
    startOffset: 0,
    endOffset: 38,
    protected: false,
  },
  {
    id: 'chapter-8:block-2',
    text: '钟楼敲过三声后，他离开赫顿玛尔南门，答应天亮前查清黑雾的来处。',
    startOffset: 40,
    endOffset: 77,
    protected: false,
  },
]

const canon: LocalCanonStateRecord = {
  schemaVersion: 'local-canon-state.v1',
  id: 'local-canon:work-arad-wayfarer:chapter-8',
  workId: 'work-arad-wayfarer',
  chapterId: 'chapter-8',
  branchId: 'work-arad-wayfarer:main',
  revision: 3,
  acceptedDraftId: 'scene-draft:chapter-8:accepted',
  acceptedDraftRevision: 2,
  acceptedContentBlocks: acceptedBlocks,
  state: {
    characters: {
      'lin-yue': {
        knowledge: [],
        resources: ['锈蚀齿轮'],
      },
    },
    timeline: {},
    promises: {},
  },
  committedPatchId: 'canon-patch:chapter-8:original',
  committedAt,
}

const operations: StatePatchOperation[] = [
  {
    op: 'replace',
    path: '/characters/lin-yue/knowledge',
    value: ['赛丽亚隐瞒了与黑雾有关的警告'],
    evidenceBlockIds: ['chapter-8:block-1'],
    reason: '正文明确写出林越记住了未说出口的警告。',
    irreversible: false,
  },
  {
    op: 'add',
    path: '/timeline/chapter-8/outcome',
    value: {
      status: 'created',
      statement: '钟楼三响后离开赫顿玛尔南门。',
    },
    evidenceBlockIds: ['chapter-8:block-2'],
    reason: '正文给出明确时点与位置变化。',
    irreversible: true,
  },
  {
    op: 'add',
    path: '/promises/find-black-fog-source/status',
    value: {
      status: 'created',
      statement: '天亮前查清黑雾来处。',
    },
    evidenceBlockIds: ['chapter-8:block-2'],
    reason: '正文形成可追踪的时限承诺。',
    irreversible: false,
  },
]

const reversibleKnowledgeEvidence = storyStateEvidenceOutputSchema.safeParse({
  schemaVersion: 'creator-state-evidence.v1',
  characterStateProposals: [{
    path: '/characters/lin-yue/knowledge',
    value: '赛丽亚隐瞒了与黑雾有关的警告',
    reason: '正文明确记录人物获得该信息。',
    irreversible: false,
    evidenceQuote: '记住了赛丽亚没有说出口的警告',
  }],
  continuityProposals: [],
})
assert.equal(
  reversibleKnowledgeEvidence.success,
  false,
  'direct knowledge acquisition must be deterministic before independent review',
)
assert.equal(storyStateEvidenceOutputSchema.safeParse({
  schemaVersion: 'creator-state-evidence.v1',
  characterStateProposals: [{
    path: '/characters/lin-yue/knowledge',
    value: '赛丽亚隐瞒了与黑雾有关的警告',
    reason: '正文明确记录人物获得该信息。',
    irreversible: true,
    evidenceQuote: '记住了赛丽亚没有说出口的警告',
  }],
  continuityProposals: [],
}).success, true)

const multiBlockEvidence = storyStateEvidenceOutputSchema.parse({
  schemaVersion: 'creator-state-evidence.v1',
  characterStateProposals: [],
  continuityProposals: [{
    kind: 'causal',
    sourceId: null,
    status: 'created',
    statement: '林越带着锈蚀齿轮离开南门，并承担天亮前查清黑雾来处的后果。',
    reason: '人物携带物与主动承诺分别位于两个正文块。',
    irreversible: false,
    evidenceQuote: '把最后一枚锈蚀齿轮压进掌心',
    supportingEvidenceQuotes: ['答应天亮前查清黑雾的来处'],
  }],
})
assert.deepEqual(
  buildStoryStateEvidenceOperations({
    result: multiBlockEvidence,
    session: {
      ...createCreationSession({
        id: 'creation-session:multi-evidence',
        workId: canon.workId,
        chapterId: canon.chapterId,
        branchId: canon.branchId,
        baseCanonRevision: canon.revision,
        now: committedAt,
      }),
      phase: 'canon_committed',
    },
    blocks: acceptedBlocks,
    context: {
      currentCanonState: canon.state,
      activePromises: [],
      unresolvedForeshadowing: [],
      manualRecallItems: [],
    },
  })[0]?.evidenceBlockIds,
  ['chapter-8:block-1', 'chapter-8:block-2'],
  'a cross-block causal proposal must preserve every exact evidence locator',
)
assert.equal(storyStateEvidenceOutputSchema.safeParse({
  schemaVersion: 'creator-state-evidence.v1',
  characterStateProposals: [],
  continuityProposals: [{
    ...multiBlockEvidence.continuityProposals[0],
    supportingEvidenceQuotes: ['把最后一枚锈蚀齿轮压进掌心'],
  }],
}).success, false, 'primary and supporting evidence quotes must be distinct')
assert.equal(validateStoryStateEvidenceReview({
  evidence: multiBlockEvidence,
  review: {
    schemaVersion: 'creator-state-evidence-review.v1',
    decision: 'reject',
    verifiedCharacterProposalIndexes: [],
    verifiedContinuityProposalIndexes: [],
    issues: [{
      proposalKind: 'continuity',
      proposalIndex: 0,
      code: 'causal_scope',
      evidenceQuote: '天亮前查清黑雾的来处',
      diagnosis: '补充引文只能证明承诺，不能单独证明完整因果链。',
    }],
    rationale: '问题可以定位到候选的补充引文。',
  },
}), false)

function proposalFor(currentCanon: LocalCanonStateRecord, id = 'historical-backfill:chapter-8:1') {
  return createHistoricalStateBackfillProposal({
    id,
    sessionId,
    canon: currentCanon,
    operations,
    createdAt: proposalAt,
  })
}

const proposal = proposalFor(canon)
assert.equal(proposal.status, 'proposed')
assert.deepEqual(proposal.operations[0].expectedPreviousValue, [])
assert.equal(proposal.operations[1].expectedPreviousValue, undefined)
assert.deepEqual(
  proposal.operations.flatMap(operation => operation.evidenceBlockIds),
  ['chapter-8:block-1', 'chapter-8:block-2', 'chapter-8:block-2'],
)

assert.throws(
  () => createHistoricalStateBackfillProposal({
    id: 'historical-backfill:empty',
    sessionId,
    canon,
    operations: [],
    createdAt: proposalAt,
  }),
  error => error instanceof CreationDecisionError && error.code === 'evidence_missing',
  'empty historical patches must stay empty instead of inventing state',
)

assert.throws(
  () => createHistoricalStateBackfillProposal({
    id: 'historical-backfill:missing-evidence',
    sessionId,
    canon,
    operations: [{ ...operations[0], evidenceBlockIds: ['chapter-8:block-missing'] }],
    createdAt: proposalAt,
  }),
  error => error instanceof CreationDecisionError && error.code === 'evidence_missing',
  'every proposed state change must locate accepted prose',
)

assert.throws(
  () => createHistoricalStateBackfillProposal({
    id: 'historical-backfill:wrong-root',
    sessionId,
    canon,
    operations: [{ ...operations[0], path: '/world/arad/weather' }],
    createdAt: proposalAt,
  }),
  error => error instanceof CreationDecisionError && error.code === 'expected_value_conflict',
  'historical backfill must not become a generic state mutation surface',
)

const repository = new MemoryCreationDecisionRepository()
const committedSession = {
  ...createCreationSession({
    id: sessionId,
    workId: canon.workId,
    chapterId: canon.chapterId,
    branchId: canon.branchId,
    baseCanonRevision: canon.revision,
    now: committedAt,
  }),
  phase: 'canon_committed' as const,
  activeDraftId: canon.acceptedDraftId,
  currentDraftRevision: canon.acceptedDraftRevision,
}

let capturedHistoricalPayload: Record<string, unknown> | null = null
let capturedHistoricalReviewPayload: Record<string, unknown> | null = null
const extracted = await proposeHistoricalStateBackfillWithWorkingAgent({
  baseUrl: 'http://127.0.0.1:4317/',
  proposalId: 'historical-backfill:agent-extracted',
  session: committedSession,
  canon,
  createdAt: proposalAt,
  requestEvidence: async request => {
    capturedHistoricalPayload = request.payload
    return {
      schemaVersion: 'creator-state-evidence.v1',
      characterStateProposals: [{
        path: '/characters/lin-yue/recentChoice',
        value: '答应天亮前查清黑雾来处',
        reason: '正文明确给出林越主动承担的时限选择。',
        irreversible: false,
        evidenceQuote: '答应天亮前查清黑雾的来处',
      }],
      continuityProposals: [],
    }
  },
  requestReview: async request => {
    capturedHistoricalReviewPayload = request.payload
    return {
      schemaVersion: 'creator-state-evidence-review.v1',
      decision: 'pass',
      verifiedCharacterProposalIndexes: [0],
      verifiedContinuityProposalIndexes: [],
      issues: [],
      rationale: '人物选择维度与正文证据一致。',
    }
  },
})
assert.equal((capturedHistoricalPayload as { mode?: string } | null)?.mode, 'historical_state_backfill')
assert.equal((capturedHistoricalReviewPayload as { mode?: string } | null)?.mode, 'historical_state_backfill')
assert.equal(extracted.review?.decision, 'pass')
assert.equal(extracted.proposal?.operations[0]?.path, '/characters/lin-yue/recentChoice')
assert.deepEqual(extracted.proposal?.operations[0]?.evidenceBlockIds, ['chapter-8:block-2'])

let emptyReviewCalls = 0
const emptyExtraction = await proposeHistoricalStateBackfillWithWorkingAgent({
  baseUrl: 'http://127.0.0.1:4317',
  proposalId: 'historical-backfill:agent-empty',
  session: committedSession,
  canon,
  createdAt: proposalAt,
  requestEvidence: async () => ({
    schemaVersion: 'creator-state-evidence.v1',
    characterStateProposals: [],
    continuityProposals: [],
  }),
  requestReview: async () => {
    emptyReviewCalls += 1
    throw new Error('Empty evidence must not invoke Auditor.')
  },
})
assert.equal(emptyExtraction.proposal, null, 'weak evidence must produce no proposal instead of a filler state change')
assert.equal(emptyExtraction.review, null)
assert.equal(emptyReviewCalls, 0)

let rejectedEvidenceCalls = 0
let rejectedReviewCalls = 0
let semanticRevisionPayload: Record<string, unknown> | null = null
const semanticallyRejected = await proposeHistoricalStateBackfillWithWorkingAgent({
  baseUrl: 'http://127.0.0.1:4317',
  proposalId: 'historical-backfill:semantic-reject',
  session: committedSession,
  canon,
  createdAt: proposalAt,
  requestEvidence: async request => {
    rejectedEvidenceCalls += 1
    if (rejectedEvidenceCalls === 2) semanticRevisionPayload = request.payload
    return {
      schemaVersion: 'creator-state-evidence.v1',
      characterStateProposals: [{
        path: '/characters/lin-yue/timePosition',
        value: '天亮前不得离开南门',
        reason: '正文写出一项行动限制。',
        irreversible: false,
        evidenceQuote: '答应天亮前查清黑雾的来处',
      }],
      continuityProposals: [],
    }
  },
  requestReview: async () => {
    rejectedReviewCalls += 1
    return {
      schemaVersion: 'creator-state-evidence-review.v1',
      decision: 'reject',
      verifiedCharacterProposalIndexes: [],
      verifiedContinuityProposalIndexes: [],
      issues: [{
        proposalKind: 'character',
        proposalIndex: 0,
        code: 'dimension_semantics',
        evidenceQuote: '答应天亮前查清黑雾的来处',
        diagnosis: '行动限制不属于人物在故事时间中的位置。',
      }],
      rationale: '人物状态维度与证据含义不一致。',
    }
  },
})
assert.equal(semanticallyRejected.review?.decision, 'reject')
assert.equal(semanticallyRejected.proposal, null, 'Auditor rejection must keep state evidence outside the proposal surface')
assert.equal(semanticallyRejected.semanticRevisionCount, 1)
assert.equal(rejectedEvidenceCalls, 2, 'semantic rejection allows exactly one bounded Observer revision')
assert.equal(rejectedReviewCalls, 2, 'both Observer outputs require independent Auditor review')
assert.equal(
  (semanticRevisionPayload as { mode?: string } | null)?.mode,
  'historical_state_backfill_semantic_revision',
)
assert.ok((semanticRevisionPayload as { previousEvidence?: unknown } | null)?.previousEvidence)
assert.ok((semanticRevisionPayload as { stateEvidenceReview?: unknown } | null)?.stateEvidenceReview)

let correctedEvidenceCalls = 0
const semanticallyCorrected = await proposeHistoricalStateBackfillWithWorkingAgent({
  baseUrl: 'http://127.0.0.1:4317',
  proposalId: 'historical-backfill:semantic-corrected',
  session: committedSession,
  canon,
  createdAt: proposalAt,
  requestEvidence: async () => {
    correctedEvidenceCalls += 1
    return {
      schemaVersion: 'creator-state-evidence.v1',
      characterStateProposals: [{
        path: correctedEvidenceCalls === 1
          ? '/characters/lin-yue/timePosition'
          : '/characters/lin-yue/recentChoice',
        value: correctedEvidenceCalls === 1
          ? '天亮前不得离开南门'
          : '答应天亮前查清黑雾来处',
        reason: correctedEvidenceCalls === 1
          ? '正文写出一项行动限制。'
          : '正文明确记录了人物主动承担的时限选择。',
        irreversible: false,
        evidenceQuote: '答应天亮前查清黑雾的来处',
      }],
      continuityProposals: [],
    }
  },
  requestReview: async request => {
    const evidence = (request.payload as { evidence: { characterStateProposals: Array<{ path: string }> } }).evidence
    const corrected = evidence.characterStateProposals[0]?.path.endsWith('/recentChoice')
    return corrected
      ? {
          schemaVersion: 'creator-state-evidence-review.v1',
          decision: 'pass' as const,
          verifiedCharacterProposalIndexes: [0],
          verifiedContinuityProposalIndexes: [],
          issues: [],
          rationale: '缩窄后的候选与逐字证据一致。',
        }
      : {
          schemaVersion: 'creator-state-evidence-review.v1',
          decision: 'reject' as const,
          verifiedCharacterProposalIndexes: [],
          verifiedContinuityProposalIndexes: [],
          issues: [{
            proposalKind: 'character' as const,
            proposalIndex: 0,
            code: 'dimension_semantics' as const,
            evidenceQuote: '答应天亮前查清黑雾的来处',
            diagnosis: '行动选择不属于时间位置。',
          }],
          rationale: '需要改到人物选择维度。',
        }
  },
})
assert.equal(semanticallyCorrected.semanticRevisionCount, 1)
assert.equal(semanticallyCorrected.review?.decision, 'pass')
assert.equal(semanticallyCorrected.proposal?.operations[0]?.path, '/characters/lin-yue/recentChoice')

let invalidReviewEvidenceCalls = 0
let invalidReviewCalls = 0
const invalidReview = await proposeHistoricalStateBackfillWithWorkingAgent({
  baseUrl: 'http://127.0.0.1:4317',
  proposalId: 'historical-backfill:invalid-review-locator',
  session: committedSession,
  canon,
  createdAt: proposalAt,
  requestEvidence: async () => {
    invalidReviewEvidenceCalls += 1
    return {
      schemaVersion: 'creator-state-evidence.v1',
      characterStateProposals: [{
        path: '/characters/lin-yue/recentChoice',
        value: '答应天亮前查清黑雾来处',
        reason: '正文明确记录人物作出的选择。',
        irreversible: false,
        evidenceQuote: '答应天亮前查清黑雾的来处',
      }],
      continuityProposals: [],
    }
  },
  requestReview: async () => {
    invalidReviewCalls += 1
    return {
      schemaVersion: 'creator-state-evidence-review.v1',
      decision: 'reject',
      verifiedCharacterProposalIndexes: [],
      verifiedContinuityProposalIndexes: [],
      issues: [{
        proposalKind: 'character',
        proposalIndex: 0,
        code: 'evidence_overclaim',
        evidenceQuote: '若答应天亮前查清黑雾的来处',
        diagnosis: '这条引文增加了原候选中不存在的条件词。',
      }],
      rationale: '审阅问题未能逐字定位原候选引文。',
    }
  },
})
assert.equal(invalidReview.proposal, null)
assert.equal(invalidReview.reviewValidationError?.code, 'evidence_missing')
assert.equal(invalidReview.semanticRevisionCount, 0)
assert.equal(invalidReviewEvidenceCalls, 1, 'invalid Auditor evidence must not trigger another Observer run')
assert.equal(invalidReviewCalls, 1, 'invalid Auditor evidence must fail closed after one review')

await assert.rejects(
  () => proposeHistoricalStateBackfillWithWorkingAgent({
    baseUrl: 'http://127.0.0.1:4317',
    proposalId: 'historical-backfill:duplicate-paths',
    session: committedSession,
    canon,
    createdAt: proposalAt,
    requestEvidence: async () => ({
      schemaVersion: 'creator-state-evidence.v1',
      characterStateProposals: [
        {
          path: '/characters/lin-yue/recentChoice',
          value: '答应追查黑雾',
          reason: '人物主动承诺追查。',
          irreversible: false,
          evidenceQuote: '答应天亮前查清黑雾的来处',
        },
        {
          path: '/characters/lin-yue/recentChoice',
          value: '天亮前查清来源',
          reason: '同一选择被重复提取。',
          irreversible: false,
          evidenceQuote: '天亮前查清黑雾的来处',
        },
      ],
      continuityProposals: [],
    }),
    requestReview: async () => ({
      schemaVersion: 'creator-state-evidence-review.v1',
      decision: 'pass',
      verifiedCharacterProposalIndexes: [0, 1],
      verifiedContinuityProposalIndexes: [],
      issues: [],
      rationale: '形式上覆盖全部索引。',
    }),
  }),
  error => error instanceof CreationDecisionError && error.code === 'model_output_invalid',
  'independent review cannot authorize duplicate state paths',
)

assert.throws(
  () => validateStoryStateEvidenceReview({
    evidence: semanticallyRejected.evidence,
    review: {
      schemaVersion: 'creator-state-evidence-review.v1',
      decision: 'pass',
      verifiedCharacterProposalIndexes: [],
      verifiedContinuityProposalIndexes: [],
      issues: [],
      rationale: '错误地遗漏了唯一人物状态候选。',
    },
  }),
  error => error instanceof CreationDecisionError && error.code === 'model_output_invalid',
  'an incomplete Auditor pass must fail closed',
)

assert.equal(validateStoryStateEvidenceReview({
  evidence: semanticallyRejected.evidence,
  review: {
    schemaVersion: 'creator-state-evidence-review.v1',
    decision: 'reject',
    verifiedCharacterProposalIndexes: [],
    verifiedContinuityProposalIndexes: [],
    issues: [
      {
        proposalKind: 'character',
        proposalIndex: 0,
        code: 'dimension_semantics',
        evidenceQuote: '答应天亮前查清黑雾的来处',
        diagnosis: '行动限制不属于时间位置。',
      },
      {
        proposalKind: 'character',
        proposalIndex: 0,
        code: 'evidence_overclaim',
        evidenceQuote: '答应天亮前查清黑雾的来处',
        diagnosis: '引文没有证明不得离开南门。',
      },
    ],
    rationale: '同一个候选可以同时存在多个独立问题。',
  },
}), false, 'multiple located issues may reject the same proposal')

assert.throws(
  () => validateStoryStateEvidenceReview({
    evidence: semanticallyRejected.evidence,
    review: {
      schemaVersion: 'creator-state-evidence-review.v1',
      decision: 'reject',
      verifiedCharacterProposalIndexes: [0],
      verifiedContinuityProposalIndexes: [],
      issues: [{
        proposalKind: 'character',
        proposalIndex: 0,
        code: 'dimension_semantics',
        evidenceQuote: '答应天亮前查清黑雾的来处',
        diagnosis: '同一索引不能同时通过和拒绝。',
      }],
      rationale: '这是一份自相矛盾的审查。',
    },
  }),
  error => error instanceof CreationDecisionError && error.code === 'model_output_invalid',
  'the same proposal cannot be both verified and rejected',
)

await repository.saveSession(committedSession)
await repository.saveCanonState(canon)
await repository.saveHistoricalStateBackfill(proposal)
assert.equal((await repository.listCanonPatches(sessionId)).length, 0, 'backfills must not masquerade as initial canon patches')
assert.equal((await repository.listHistoricalStateBackfills(sessionId)).length, 1)

await assert.rejects(
  () => repository.commitHistoricalStateBackfill({
    proposal,
    currentCanon: canon,
    authorConfirmed: false,
    confirmedAt,
  }),
  error => error instanceof CreationDecisionError && error.code === 'author_confirmation_required',
)

const manuscriptBefore = {
  acceptedDraftId: canon.acceptedDraftId,
  acceptedDraftRevision: canon.acceptedDraftRevision,
  acceptedContentBlocks: canon.acceptedContentBlocks,
  committedPatchId: canon.committedPatchId,
  committedAt: canon.committedAt,
}
const committed = await repository.commitHistoricalStateBackfill({
  proposal,
  currentCanon: canon,
  authorConfirmed: true,
  confirmedAt,
})
assert.equal(committed.proposal.status, 'committed')
assert.equal(committed.canon.revision, canon.revision + 1)
assert.deepEqual({
  acceptedDraftId: committed.canon.acceptedDraftId,
  acceptedDraftRevision: committed.canon.acceptedDraftRevision,
  acceptedContentBlocks: committed.canon.acceptedContentBlocks,
  committedPatchId: committed.canon.committedPatchId,
  committedAt: committed.canon.committedAt,
}, manuscriptBefore, 'state backfill must not overwrite accepted prose or the original commit identity')
assert.deepEqual(
  (committed.canon.state.characters as Record<string, { knowledge: string[] }>)['lin-yue'].knowledge,
  ['赛丽亚隐瞒了与黑雾有关的警告'],
)
assert.deepEqual(
  (committed.canon.state.timeline as Record<string, unknown>)['chapter-8'],
  { outcome: { status: 'created', statement: '钟楼三响后离开赫顿玛尔南门。' } },
)
assert.equal((await repository.loadSession(sessionId))?.phase, 'canon_committed', 'historical backfill must not reopen the writing session')
assert.deepEqual(
  (await repository.listEvents(sessionId)).map(event => event.type),
  ['historical_state_backfill_confirmed', 'historical_state_backfill_committed'],
)
assert.equal((await repository.listHistoricalStateBackfills(sessionId))[0]?.status, 'committed')

const rejected = rejectHistoricalStateBackfillProposal(proposalFor(committed.canon, 'historical-backfill:rejected'))
await repository.saveHistoricalStateBackfill(rejected)
await assert.rejects(
  () => repository.commitHistoricalStateBackfill({
    proposal: rejected,
    currentCanon: committed.canon,
    authorConfirmed: true,
    confirmedAt,
  }),
  error => error instanceof CreationDecisionError && error.code === 'stale_result',
  'author-rejected proposals must never update canon',
)

const staleRepository = new MemoryCreationDecisionRepository()
await staleRepository.saveCanonState({ ...canon, revision: canon.revision + 1 })
await assert.rejects(
  () => staleRepository.commitHistoricalStateBackfill({
    proposal,
    currentCanon: canon,
    authorConfirmed: true,
    confirmedAt,
  }),
  error => error instanceof CreationDecisionError && error.code === 'canon_revision_conflict',
  'a proposal prepared against an older canon revision must fail closed',
)

const draftConflictRepository = new MemoryCreationDecisionRepository()
await draftConflictRepository.saveCanonState({
  ...canon,
  acceptedDraftId: 'scene-draft:chapter-8:author-edited',
  acceptedDraftRevision: canon.acceptedDraftRevision + 1,
})
await assert.rejects(
  () => draftConflictRepository.commitHistoricalStateBackfill({
    proposal,
    currentCanon: canon,
    authorConfirmed: true,
    confirmedAt,
  }),
  error => error instanceof CreationDecisionError && error.code === 'draft_revision_conflict',
  'a proposal must not cross an author manuscript revision',
)

console.log('Historical state backfill candidate-first contract passed.')
