import assert from 'node:assert/strict'
import { candidateDistance, mixNarrativeCandidates, selectNarrativeCandidate } from '../src/features/creator-decision/candidateSearch'
import { applySceneDraftToBlocks, draftBlocksFromText } from '../src/features/creator-decision/sceneDrafting'
import { referenceWritingAgent } from '../src/features/creator-decision/referenceWritingAgent'
import { evaluateNextChapterQualityGate } from '../src/features/creator-decision/nextChapterQualityGate'
import {
  answerIntentQuestion,
  assertDraftingAllowed,
  createCreationSession,
  intentLockBlockers,
  lockAuthorIntent,
  propagateInvalidation,
  transitionCreationSession,
} from '../src/features/creator-decision/stateMachine'
import { CreationDecisionError } from '../src/features/creator-decision/types'
import type {
  AuthorIntentContract,
  CreationContextSource,
  LiteraryReview,
  RepairProposal,
  SceneDraftRequest,
} from '../src/features/creator-decision/types'

function answerTwoIntentQuestions(intent: AuthorIntentContract) {
  const readerQuestion = intent.unresolvedQuestions.find(question => question.fieldPath === 'readerExperience.targetEmotion')
  const agencyQuestion = intent.unresolvedQuestions.find(question => question.fieldPath === 'characterAgency.requiredChoice')
  assert.ok(readerQuestion)
  assert.ok(agencyQuestion)
  let answered = answerIntentQuestion({
    intent,
    questionId: readerQuestion.id,
    customPatch: {
      readerExperience: {
        startEmotion: '隐约不安',
        targetEmotion: '确认关系已经不可逆地改变',
        emotionalMovement: '从不安走向清醒',
        intensity: 'restrained',
      },
      narrativeDelta: {
        startingCondition: '她仍被困在替身关系中',
        endingCondition: '她已经开始退出这段关系',
        mustChange: '她用具体行动结束被动等待',
        mustNotResolve: ['丈夫不得在本场知道她已经识破替身真相'],
        irreversibleChange: '离开的准备已经发生',
      },
    },
  })
  answered = answerIntentQuestion({
    intent: answered,
    questionId: agencyQuestion.id,
    customPatch: {
      characterAgency: {
        primaryActorId: 'wife',
        currentGoal: '离开被替代的人生位置',
        requiredChoice: '不解释真相，先完成离开的准备',
        opposingForce: '丈夫仍把她的行动理解为日常情绪',
        expectedCost: '失去立即被理解的机会',
      },
      informationPolicy: {
        readerShouldKnow: ['妻子已经识破替身真相', '妻子决定离开'],
        readerShouldSuspect: ['丈夫会在之后才理解这些行动'],
        charactersMustNotKnow: [{ characterId: 'husband', information: '妻子已经决定离开' }],
        delayedReveals: ['离开的完整计划'],
      },
    },
  })
  return answered
}

const session0 = createCreationSession({
  id: 'session:domain',
  workId: 'work:domain',
  chapterId: 'chapter:domain',
  sceneId: 'scene:domain',
  branchId: 'branch:main',
  baseCanonRevision: 1,
  now: '2026-07-13T10:00:00.000Z',
})

const proposed = await referenceWritingAgent.proposeIntentContract({
  session: session0,
  seed: {
    characterAgency: {
      primaryActorId: 'wife',
      currentGoal: '离开替身关系',
      requiredChoice: '',
      opposingForce: '丈夫的误解',
      expectedCost: '',
    },
    boundaries: {
      requiredElements: ['离开的可见行动'],
      forbiddenEffects: ['丈夫提前知道真相'],
      protectedCharacterTraits: ['妻子不通过长篇宣告获得能动性'],
    },
  },
})

assert.equal(proposed.unresolvedQuestions.length, 2, 'intent discovery must ask at most two consequential questions')
assert.ok(intentLockBlockers(proposed).length > 0)
assert.throws(
  () => lockAuthorIntent(proposed),
  error => error instanceof CreationDecisionError && error.code === 'intent_incomplete',
)

const lockedIntent = lockAuthorIntent(answerTwoIntentQuestions(proposed), '2026-07-13T10:01:00.000Z')
assert.equal(lockedIntent.status, 'locked')
assert.deepEqual(intentLockBlockers(lockedIntent), [])

let session = transitionCreationSession(session0, 'intent_locked')
session = {
  ...session,
  lockedIntentId: lockedIntent.id,
  currentIntentRevision: lockedIntent.revision,
}
session = transitionCreationSession(session, 'candidate_search')

const source: CreationContextSource = {
  canonRevision: 1,
  kernelRevision: 3,
  constraintRevision: 4,
  activeCharacters: [
    {
      id: 'wife',
      goal: '离开替身关系',
      state: { relationshipPosition: 'inside_relationship' },
      belief: ['等待不会换来真正的选择'],
      knowledge: ['自己是替身'],
      falseBeliefs: [],
      emotionalState: '清醒而克制',
      resources: ['个人证件', '旧行李箱'],
    },
    {
      id: 'husband',
      goal: '维持表面关系',
      belief: ['妻子只是暂时闹情绪'],
      knowledge: [],
      falseBeliefs: ['两人的共同未来仍未改变'],
      emotionalState: '习以为常',
      resources: ['共同住所'],
    },
  ],
  relevantRelationships: [{ from: 'wife', to: 'husband', status: 'misaligned' }],
  activePromises: ['丈夫会在更晚时刻发现离开的后果'],
  unresolvedForeshadowing: ['纸箱里缺少的共同物品'],
  currentTimeline: { day: 18, period: 'night' },
  relevantWorldRules: [],
  kernelRules: ['人物选择必须通过行动产生后果'],
  hardConstraints: ['丈夫不得提前知道妻子决定离开'],
  relevantRegressionExamples: ['避免用长篇对白代替行动'],
  recentSceneSummaries: [{ sceneId: 'scene:previous', summary: '妻子确认自己被当作替身。', relevanceReason: '触发本场选择' }],
  styleSamples: [{ sourceBlockId: 'style:1', text: '她把灯关掉，房间没有因此变暗。', reason: '克制叙述' }],
  manifest: [{ sourceId: 'canon:1', sourceRevision: 1, authority: 'canon', includedReason: 'current_character_state' }],
}

const context = await referenceWritingAgent.buildContextSnapshot({ session, intent: lockedIntent, source })
assert.equal(context.activeCharacters.length, 2)
assert.ok(context.manifest.some(entry => entry.sourceId === lockedIntent.id))
assert.ok(context.styleSamples.every(sample => sample.text.length <= 1200))

const search = await referenceWritingAgent.generateCandidates({ session, intent: lockedIntent, context })
assert.equal(search.rawCandidateCount, 5)
assert.equal(search.candidates.length, 3, 'three genuinely distinct candidates should survive this fixture')
for (let left = 0; left < search.candidates.length; left += 1) {
  for (let right = left + 1; right < search.candidates.length; right += 1) {
    assert.ok(candidateDistance(search.candidates[left], search.candidates[right]) >= 2)
  }
}
assert.equal('score' in search.candidates[0], false, 'candidate selection must not introduce one composite literary score')

const selectedCandidates = selectNarrativeCandidate(search.candidates, search.candidates[0].id)
const selected = selectedCandidates.find(candidate => candidate.status === 'selected')
assert.ok(selected)

const legacyStringBoundaryIntent = {
  ...lockedIntent,
  informationPolicy: {
    ...lockedIntent.informationPolicy,
    charactersMustNotKnow: ['丈夫不知道妻子已经决定离开'],
  },
} as unknown as AuthorIntentContract
const legacyBoundaryBlocks = draftBlocksFromText('丈夫仍以为一切没有改变。妻子把最后一只纸箱推到门边。')
await assert.doesNotReject(() => referenceWritingAgent.reviewDraft({
  session,
  intent: legacyStringBoundaryIntent,
  context,
  candidate: selected,
  draft: {
    schemaVersion: 'scene-draft.v1',
    draftId: 'draft:legacy-string-boundary',
    sessionId: session.id,
    baseCanonRevision: session.baseCanonRevision,
    baseIntentRevision: lockedIntent.revision,
    baseCandidateRevision: selected.revision,
    baseDraftRevision: 0,
    revision: 1,
    contentBlocks: legacyBoundaryBlocks,
    unplannedFactProposals: [],
    observedStateChanges: [],
    status: 'current',
    createdAt: '2026-07-16T00:00:00.000Z',
  },
}), 'legacy string information boundaries must not crash deterministic literary review')
const missingReviewFieldsIntent = {
  ...lockedIntent,
  boundaries: undefined,
  fieldSources: undefined,
} as unknown as AuthorIntentContract
await assert.rejects(
  () => referenceWritingAgent.reviewDraft({
    session,
    intent: missingReviewFieldsIntent,
    context,
    candidate: selected,
    draft: {
      schemaVersion: 'scene-draft.v1',
      draftId: 'draft:missing-review-intent-fields',
      sessionId: session.id,
      baseCanonRevision: session.baseCanonRevision,
      baseIntentRevision: lockedIntent.revision,
      baseCandidateRevision: selected.revision,
      baseDraftRevision: 0,
      revision: 1,
      contentBlocks: legacyBoundaryBlocks,
      unplannedFactProposals: [],
      observedStateChanges: [],
      status: 'current',
      createdAt: '2026-07-18T00:00:00.000Z',
    },
  }),
  error => (
    error instanceof CreationDecisionError
    && error.code === 'intent_incomplete'
    && error.message.includes('boundaries.requiredElements')
    && error.message.includes('fieldSources')
  ),
  'malformed review intent must fail as a controlled domain error instead of a raw TypeError',
)
session = transitionCreationSession(session, 'candidate_selected')
session = {
  ...session,
  selectedCandidateId: selected.id,
  currentCandidateRevision: selected.revision,
}

const request: SceneDraftRequest = {
  sessionId: session.id,
  intentId: lockedIntent.id,
  intentRevision: lockedIntent.revision,
  candidateId: selected.id,
  candidateRevision: selected.revision,
  contextSnapshotId: context.id,
  baseCanonRevision: session.baseCanonRevision,
  baseDraftRevision: session.currentDraftRevision,
  scope: { type: 'scene', sceneId: session.sceneId, beatIds: [], selectedBlockIds: [] },
  protectedBlockIds: [],
  targetLength: { minimum: 120, maximum: 900 },
  writingMode: 'agent_first_draft',
}
assert.doesNotThrow(() => assertDraftingAllowed({ session, intent: lockedIntent, selectedCandidate: selected, request }))
assert.throws(
  () => assertDraftingAllowed({
    session: { ...session, phase: 'drafting' },
    intent: lockedIntent,
    selectedCandidate: selected,
    request,
  }),
  error => error instanceof CreationDecisionError && error.code === 'invalid_phase_transition',
  'draftScene must only accept the candidate_selected phase',
)
assert.throws(
  () => assertDraftingAllowed({
    session,
    intent: lockedIntent,
    selectedCandidate: selected,
    request: {
      ...request,
      scope: { ...request.scope, chapterCount: 2 } as SceneDraftRequest['scope'],
    },
  }),
  error => error instanceof CreationDecisionError && error.code === 'multi_chapter_generation_forbidden',
)
assert.throws(
  () => assertDraftingAllowed({
    session,
    intent: lockedIntent,
    selectedCandidate: selected,
    request: {
      ...request,
      scope: { ...request.scope, sceneIds: ['scene:a', 'scene:b'] } as SceneDraftRequest['scope'],
    },
  }),
  error => error instanceof CreationDecisionError && error.code === 'multi_scene_generation_forbidden',
)
assert.throws(
  () => assertDraftingAllowed({
    session,
    intent: lockedIntent,
    selectedCandidate: selected,
    request: {
      ...request,
      scope: {
        type: 'selected_text',
        sceneId: session.sceneId,
        beatIds: [],
        selectedBlockIds: ['draft-block:1', 'draft-block:2', 'draft-block:3', 'draft-block:4'],
      },
      writingMode: 'rewrite_selected_range',
    },
  }),
  error => error instanceof CreationDecisionError && error.code === 'multi_scene_generation_forbidden',
)

const mixed = mixNarrativeCandidates({
  left: search.candidates[0],
  right: search.candidates[1],
  revision: 2,
})
assert.equal(mixed.status, 'active')
assert.equal(mixed.revision, 2)
assert.ok(mixed.beats.length >= 3 && mixed.beats.length <= 7)
assert.equal(mixed.strategyAxes.conflictMode, search.candidates[0].strategyAxes.conflictMode)
assert.equal(mixed.strategyAxes.informationMode, search.candidates[1].strategyAxes.informationMode)

const existingBlocks = draftBlocksFromText('这一段由作者保留。\n\n这一段可以替换。')
const protectedBlock = existingBlocks[0]
const rewritten = applySceneDraftToBlocks({
  currentBlocks: existingBlocks,
  generatedBlocks: draftBlocksFromText('这是新的局部候选。'),
  request: {
    ...request,
    scope: {
      type: 'selected_text',
      sceneId: session.sceneId,
      beatIds: [],
      selectedBlockIds: [existingBlocks[1].id],
    },
    protectedBlockIds: [protectedBlock.id],
    writingMode: 'rewrite_selected_range',
  },
})
assert.ok(rewritten.some(block => block.id === protectedBlock.id && block.text === protectedBlock.text))
assert.ok(rewritten.some(block => block.text === '这是新的局部候选。'))

const invalidated = propagateInvalidation({
  trigger: 'intent_revision_changed',
  contexts: [context],
  candidates: search.candidates,
  drafts: [],
  reviews: [],
  repairs: [],
  patches: [],
})
assert.equal(invalidated.contexts[0].status, 'stale')
assert.ok(invalidated.candidates.every(candidate => candidate.status === 'stale'))
assert.equal('commitCanon' in referenceWritingAgent, false, 'the writing agent must not expose a canon commit capability')

const committedSession = { ...session0, phase: 'canon_committed' as const }
assert.equal(
  transitionCreationSession(committedSession, 'drafting').phase,
  'drafting',
  'an author-adopted post-commit repair must reopen the current chapter for review and confirmation',
)

const nextChapterReview: LiteraryReview = {
  schemaVersion: 'literary-review.v1',
  id: 'review:next-chapter-gate',
  sessionId: committedSession.id,
  contextSnapshotId: 'legacy-unbound-context',
  contextCompilationPolicyVersion: 0,
  contextSourceFingerprint: 'legacy-unfingerprinted',
  contextSnapshotFingerprint: 'legacy-unfingerprinted',
  draftId: 'draft:next-chapter-gate',
  baseCanonRevision: 1,
  baseIntentRevision: 1,
  baseCandidateRevision: 1,
  baseDraftRevision: 3,
  findings: [{
    id: 'finding:next-chapter-hard-block',
    dimension: 'information_control',
    severity: 'hard_block',
    evidence: [{ blockId: 'block:gate', startOffset: 0, endOffset: 2, excerptHash: 'hash' }],
    expected: '角色只能依据现场可见证据行动。',
    observed: '角色说出了尚未获得的信息。',
    readerImpact: '后续因果建立在越界知识上。',
    diagnosis: '人物知识边界尚未解除。',
    repairDirection: '把判断交还给拥有对应证据的角色。',
    protectedBlockIds: [],
    confidence: 'high',
    status: 'active',
  }],
  deterministicViolations: [],
  status: 'active',
  createdAt: '2026-07-15T22:00:00.000Z',
}
const pendingNextChapterRepair: RepairProposal = {
  schemaVersion: 'repair-proposal.v1',
  id: 'repair:next-chapter-gate',
  reviewId: nextChapterReview.id,
  findingId: nextChapterReview.findings[0].id,
  baseDraftRevision: 3,
  operation: 'offer_variants',
  targetBlockIds: ['block:gate'],
  preservedFacts: [],
  preservedBlockIds: [],
  proposedContent: '把判断交还给拥有证据的角色。',
  status: 'proposed',
  createdAt: '2026-07-15T22:01:00.000Z',
}
const blockedNextChapter = evaluateNextChapterQualityGate({
  session: committedSession,
  review: nextChapterReview,
  repairs: [pendingNextChapterRepair],
})
assert.equal(blockedNextChapter.allowed, false)
assert.deepEqual(
  blockedNextChapter.blockers.map(blocker => blocker.code),
  ['pending_repair_decision', 'active_hard_block'],
)

const advisoryOnlyReview: LiteraryReview = {
  ...nextChapterReview,
  findings: nextChapterReview.findings.map(finding => ({
    ...finding,
    severity: 'revision_candidate' as const,
    status: 'dismissed' as const,
  })),
}
assert.equal(evaluateNextChapterQualityGate({
  session: committedSession,
  review: advisoryOnlyReview,
  repairs: [{ ...pendingNextChapterRepair, status: 'rejected' }],
}).allowed, true, 'an author-resolved advisory finding must not block the next chapter')

console.log('Creator decision domain fixture passed.')
