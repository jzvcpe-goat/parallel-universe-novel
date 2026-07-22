import assert from 'node:assert/strict'
import { selectNarrativeCandidate } from '../src/features/creator-decision/candidateSearch'
import {
  applyRepairProposal,
  createRepairProposal,
  evidenceBlocksForFinding,
  evidenceForDraftQuote,
  evidenceForText,
  manuscriptRangeForFindingEvidence,
  validateFindingEvidence,
  validateLocalRepairPreservedFactEvidence,
} from '../src/features/creator-decision/literaryReview'
import {
  draftBlocksFromText,
  withoutSceneDraftDirectionReceipt,
} from '../src/features/creator-decision/sceneDrafting'
import { referenceWritingAgent } from '../src/features/creator-decision/referenceWritingAgent'
import { contextSnapshotFingerprint } from '../src/features/creator-decision/contextCompiler'
import { modelFindings } from '../src/features/creator-decision/localWorkingAgent'
import {
  activeCanonPatch,
  buildMultiBlockRepairGuidance,
  CreationDecisionWorkflow,
} from '../src/features/creator-decision/creationDecisionWorkflow'
import {
  answerIntentQuestion,
  createCreationSession,
  creationDecisionEvent,
  lockAuthorIntent,
  transitionCreationSession,
} from '../src/features/creator-decision/stateMachine'
import { CreationDecisionError } from '../src/features/creator-decision/types'
import type {
  CreationContextSource,
  CreationDecisionSnapshot,
  LiteraryFinding,
  LiteraryReview,
  LocalCanonStateRecord,
  RepairProposal,
  SceneDraftRequest,
  SceneDraftResult,
  WritingAgentCapabilities,
} from '../src/features/creator-decision/types'
import {
  MemoryCreationDecisionRepository,
  migrateLegacyDraftToCreationSession,
} from '../src/local-db/creatorLocalDecisionRepository'

const now = '2026-07-13T11:00:00.000Z'
const repository = new MemoryCreationDecisionRepository()

const crossBlockDraft = draftBlocksFromText([
  '甲段先交代环境，随后给出共同证据的上半段。',
  '共同证据的下半段继续推进，并落到人物选择。',
].join('\n\n'))
const crossBlockQuote = '共同证据的上半段。\n\n共同证据的下半段'
const crossBlockEvidence = evidenceForDraftQuote(crossBlockDraft, crossBlockQuote)
assert.equal(crossBlockEvidence?.length, 2, 'an exact quote across adjacent manuscript blocks must retain both locators')
assert.ok(crossBlockEvidence)
assert.equal(
  crossBlockDraft[0].text.slice(crossBlockEvidence[0].startOffset, crossBlockEvidence[0].endOffset),
  '共同证据的上半段。',
)
assert.equal(
  crossBlockDraft[1].text.slice(crossBlockEvidence[1].startOffset, crossBlockEvidence[1].endOffset),
  '共同证据的下半段',
)
assert.equal(
  evidenceForDraftQuote(crossBlockDraft, '共同证据的上半段。\n共同证据的下半段'),
  null,
  'cross-block evidence must not normalize or fuzzily repair a separator mismatch',
)
assert.equal(
  evidenceForDraftQuote(crossBlockDraft, '共同证据的上半段。\n\n并不存在的下半段'),
  null,
  'cross-block evidence must fail closed when the quote is not contiguous manuscript text',
)

const crossBlockFinding: LiteraryFinding = {
  id: 'finding:cross-block',
  dimension: 'exposition',
  severity: 'revision_candidate',
  evidence: crossBlockEvidence,
  expected: '证据边界只解释一次，其余通过动作呈现。',
  observed: '相邻段落重复解释同一个证据边界。',
  readerImpact: '连续解释会减慢场景推进。',
  diagnosis: '同一解释跨两个相邻段落重复出现。',
  repairDirection: '保留第一次解释，把下一段改为人物动作和后果。',
  protectedBlockIds: [],
  confidence: 'high',
  status: 'active',
}
const crossBlockSceneDraft: SceneDraftResult = {
  schemaVersion: 'scene-draft.v1',
  draftId: 'draft:cross-block',
  sessionId: 'session:cross-block',
  baseCanonRevision: 1,
  baseIntentRevision: 1,
  baseCandidateRevision: 1,
  baseDraftRevision: 0,
  revision: 1,
  contentBlocks: crossBlockDraft,
  unplannedFactProposals: [],
  observedStateChanges: [],
  status: 'current',
  createdAt: now,
}
const receiptEvidence = {
  blockId: crossBlockSceneDraft.contentBlocks[0].id,
  startOffset: 0,
  endOffset: 2,
  excerptHash: 'receipt-evidence-hash',
}
const draftWithDirectionReceipt: SceneDraftResult = {
  ...crossBlockSceneDraft,
  directionReceipt: {
    schemaVersion: 'scene-draft-direction-receipt.v1',
    decision: 'pass',
    axisChecks: [
      ['pressureSource', 'resource'],
      ['conflictEngine', 'negotiation'],
      ['agencyPattern', 'delegation'],
      ['costPattern', 'obligation'],
      ['endingPattern', 'relationship_shift'],
    ].map(([axis, expectedValue]) => ({
      axis: axis as 'pressureSource' | 'conflictEngine' | 'agencyPattern' | 'costPattern' | 'endingPattern',
      expectedValue,
      evidence: [receiptEvidence],
    })),
    proposedAdjustmentEvidence: [receiptEvidence],
    reviewer: 'Auditor',
  },
}
const draftAfterTextMutation = withoutSceneDraftDirectionReceipt(draftWithDirectionReceipt)
assert.equal(draftAfterTextMutation.directionReceipt, undefined, 'any manuscript mutation must invalidate the old direction receipt')
assert.ok(draftWithDirectionReceipt.directionReceipt, 'invalidating a receipt must not mutate the source draft record')
const crossBlockModelFinding = {
  dimension: 'character_agency' as const,
  severity: 'preserve' as const,
  evidenceQuote: crossBlockQuote,
  expected: '人物选择必须通过相邻动作段落得到完整证明。',
  observed: '两个相邻段落共同证明人物完成了主动选择。',
  readerImpact: '保留完整证据可以防止后续修订削弱人物主体性。',
  diagnosis: '这一处跨段动作链值得保护。',
  repairDirection: '保留两个段落之间的动作因果。',
  confidence: 'high' as const,
}
const mappedCrossBlockFindings = modelFindings({
  draft: crossBlockSceneDraft,
  result: { schemaVersion: 'creator-literary-review.v1', findings: [crossBlockModelFinding] },
})
assert.equal(mappedCrossBlockFindings[0].evidence.length, 2)
assert.deepEqual(mappedCrossBlockFindings[0].protectedBlockIds, crossBlockDraft.map(block => block.id))
assert.throws(
  () => modelFindings({
    draft: crossBlockSceneDraft,
    result: {
      schemaVersion: 'creator-literary-review.v1',
      findings: [{ ...crossBlockModelFinding, evidenceQuote: '正文中不存在的精确引文。' }],
    },
  }),
  error => error instanceof CreationDecisionError && error.code === 'evidence_missing',
  'one unlocatable model finding must fail the complete literary review instead of being silently dropped',
)
assert.deepEqual(
  evidenceBlocksForFinding(crossBlockFinding, crossBlockDraft).map(block => block.id),
  crossBlockDraft.map(block => block.id),
  'a cross-block finding must retain every evidenced manuscript block',
)
assert.deepEqual(
  manuscriptRangeForFindingEvidence(crossBlockFinding, crossBlockDraft),
  {
    startOffset: crossBlockDraft[0].startOffset + crossBlockEvidence[0].startOffset,
    endOffset: crossBlockDraft[1].startOffset + crossBlockEvidence[1].endOffset,
  },
  'adjacent cross-block evidence must focus the complete contiguous manuscript range',
)
const crossBlockGuidance = buildMultiBlockRepairGuidance(crossBlockFinding, crossBlockDraft)
assert.match(crossBlockGuidance || '', /跨越 2 个正文段落，不自动生成整段替换/)
const crossBlockReview: LiteraryReview = {
  schemaVersion: 'literary-review.v1',
  id: 'review:cross-block',
  sessionId: 'session:cross-block',
  contextSnapshotId: 'legacy-unbound-context',
  contextCompilationPolicyVersion: 0,
  contextSourceFingerprint: 'legacy-unfingerprinted',
  contextSnapshotFingerprint: 'legacy-unfingerprinted',
  draftId: 'draft:cross-block',
  baseCanonRevision: 1,
  baseIntentRevision: 1,
  baseCandidateRevision: 1,
  baseDraftRevision: 1,
  findings: [crossBlockFinding],
  deterministicViolations: [],
  status: 'active',
  createdAt: now,
}
const crossBlockGuidanceProposal = createRepairProposal({
  id: 'repair:cross-block-guidance',
  review: crossBlockReview,
  findingId: crossBlockFinding.id,
  operation: 'offer_variants',
  proposedContent: crossBlockGuidance,
})
assert.deepEqual(crossBlockGuidanceProposal.targetBlockIds, crossBlockDraft.map(block => block.id))
assert.throws(
  () => applyRepairProposal({ proposal: crossBlockGuidanceProposal, blocks: crossBlockDraft, currentDraftRevision: 1 }),
  error => error instanceof CreationDecisionError && error.code === 'invalid_generation_scope',
  'a multi-block repair direction must never be adoptable as manuscript blocks',
)

const unchangedRepairProposal = createRepairProposal({
  id: 'repair:unchanged-prose',
  review: crossBlockReview,
  findingId: crossBlockFinding.id,
  operation: 'replace_range',
  proposedContent: crossBlockDraft[0].text,
  targetBlockIds: [crossBlockDraft[0].id],
  preservedFacts: ['原文事实保持不变'],
  verification: {
    schemaVersion: 'creator-local-repair-review.v1',
    findingId: crossBlockFinding.id,
    targetBlockId: crossBlockDraft[0].id,
    decision: 'pass',
    verifiedPreservedFactIndexes: [0],
    issues: [],
    rationale: '夹具模拟独立审阅通过但候选正文实际没有变化。',
  },
})
assert.throws(
  () => applyRepairProposal({ proposal: unchangedRepairProposal, blocks: crossBlockDraft, currentDraftRevision: 1 }),
  error => error instanceof CreationDecisionError && error.code === 'hard_block_unresolved',
  'an unchanged replacement must not create a false resolved revision',
)

const separatedEvidenceDraft = draftBlocksFromText(['第一处证据。', '中间正文。', '第三处证据。'].join('\n\n'))
const separatedFirstEvidence = evidenceForText(separatedEvidenceDraft[0], '第一处证据')
const separatedLastEvidence = evidenceForText(separatedEvidenceDraft[2], '第三处证据')
assert.ok(separatedFirstEvidence && separatedLastEvidence)
const separatedFinding: LiteraryFinding = {
  ...crossBlockFinding,
  id: 'finding:separated-evidence',
  evidence: [separatedFirstEvidence, separatedLastEvidence],
}
assert.deepEqual(
  manuscriptRangeForFindingEvidence(separatedFinding, separatedEvidenceDraft),
  {
    startOffset: separatedEvidenceDraft[0].startOffset + separatedFirstEvidence.startOffset,
    endOffset: separatedEvidenceDraft[0].startOffset + separatedFirstEvidence.endOffset,
  },
  'separated evidence must focus only the first locator instead of selecting unrelated intervening prose',
)

const legacySession = await migrateLegacyDraftToCreationSession({
  draft: {
    localDraftRef: 'legacy-draft:1',
    requestId: null,
    workId: 'work:fixture',
    branchId: 'branch:main',
    title: '旧草稿',
    content: '这是一份迁移前已经存在的作者正文。',
    updatedAt: now,
  },
  repository,
})
assert.equal((await repository.listIntents(legacySession.id)).length, 0, 'legacy migration must not invent an author intent')
assert.equal((await repository.listDrafts(legacySession.id)).length, 0, 'legacy prose must remain in the existing draft owner')

const baselineCanon: LocalCanonStateRecord = {
  schemaVersion: 'local-canon-state.v1',
  id: 'local-canon:work:fixture:chapter:18',
  workId: 'work:fixture',
  chapterId: 'chapter:18',
  branchId: 'branch:main',
  revision: 1,
  acceptedDraftId: null,
  acceptedDraftRevision: 0,
  acceptedContentBlocks: [],
  state: {
    characters: {
      wife: { relationshipStances: 'inside_relationship', knowledge: ['substitute_truth'] },
      husband: { relationshipStances: 'inside_relationship', knowledge: [] },
    },
  },
  committedPatchId: null,
  committedAt: now,
}
await repository.saveCanonState(baselineCanon)

let session = createCreationSession({
  id: 'session:decision-workflow',
  workId: 'work:fixture',
  chapterId: 'chapter:18',
  sceneId: 'scene:departure',
  branchId: 'branch:main',
  baseCanonRevision: baselineCanon.revision,
  now,
})
await repository.saveSession(session)
await repository.appendEvent(creationDecisionEvent({
  sessionId: session.id,
  type: 'session_started',
  actor: 'author',
  sourceRevision: session.baseCanonRevision,
  payload: { sceneId: session.sceneId },
  occurredAt: now,
}))

let intent = await referenceWritingAgent.proposeIntentContract({
  session,
  seed: {
    characterAgency: {
      primaryActorId: 'wife',
      currentGoal: '离开被当作替身的关系',
      requiredChoice: '',
      opposingForce: '丈夫仍以为一切可以照旧',
      expectedCost: '',
    },
    boundaries: {
      requiredElements: ['离开的现实动作'],
      forbiddenEffects: ['丈夫在本场确认妻子要离开'],
      protectedCharacterTraits: ['妻子的克制', '丈夫的信息盲区'],
    },
  },
})
assert.equal(intent.unresolvedQuestions.length, 2)
const readerQuestion = intent.unresolvedQuestions.find(question => question.fieldPath === 'readerExperience.targetEmotion')
const agencyQuestion = intent.unresolvedQuestions.find(question => question.fieldPath === 'characterAgency.requiredChoice')
assert.ok(readerQuestion && agencyQuestion)
intent = answerIntentQuestion({
  intent,
  questionId: readerQuestion.id,
  customPatch: {
    readerExperience: {
      startEmotion: '怀疑她是否会继续忍耐',
      targetEmotion: '确认她已经开始离开',
      emotionalMovement: '从怀疑走向确定',
      intensity: 'restrained',
    },
    narrativeDelta: {
      startingCondition: '妻子仍留在共同生活的表面秩序里',
      endingCondition: '离开已经成为现实行动',
      mustChange: '妻子完成一项不可误认为情绪宣泄的准备',
      mustNotResolve: ['丈夫不知道她已经识破替身真相', '丈夫不知道她已经决定离开'],
      irreversibleChange: '妻子带走个人证件',
    },
  },
})
intent = answerIntentQuestion({
  intent,
  questionId: agencyQuestion.id,
  customPatch: {
    characterAgency: {
      primaryActorId: 'wife',
      currentGoal: '离开被当作替身的关系',
      requiredChoice: '不解释，先带走个人证件',
      opposingForce: '丈夫仍以为一切可以照旧',
      expectedCost: '失去立即被理解的机会',
    },
    informationPolicy: {
      readerShouldKnow: ['妻子知道替身真相', '妻子决定离开'],
      readerShouldSuspect: ['丈夫会在更晚时刻发现后果'],
      charactersMustNotKnow: [{ characterId: 'husband', information: '妻子已经决定离开' }],
      delayedReveals: ['妻子的具体去向'],
    },
  },
})
intent = lockAuthorIntent(intent, '2026-07-13T11:01:00.000Z')
await repository.saveIntent(intent)
session = {
  ...transitionCreationSession(session, 'intent_locked'),
  lockedIntentId: intent.id,
  currentIntentRevision: intent.revision,
}
session = transitionCreationSession(session, 'candidate_search')
await repository.saveSession(session)

const contextSource: CreationContextSource = {
  canonRevision: 1,
  kernelRevision: 2,
  constraintRevision: 7,
  activeCharacters: [
    { id: 'wife', goal: '离开', state: { relationshipStances: 'inside_relationship' }, belief: ['等待没有结果'], knowledge: ['substitute_truth'], falseBeliefs: [], emotionalState: '克制', resources: ['证件', '行李箱'] },
    { id: 'husband', goal: '维持现状', belief: ['妻子不会真的离开'], knowledge: [], falseBeliefs: ['共同未来仍然成立'], emotionalState: '迟钝', resources: ['共同住所'] },
  ],
  relevantRelationships: [{ left: 'wife', right: 'husband', pressure: 'information_misalignment' }],
  activePromises: ['丈夫将在后续发现场景后果'],
  unresolvedForeshadowing: ['少了一本证件夹'],
  currentTimeline: { day: 18, period: 'night', elapsedMinutes: 20 },
  relevantWorldRules: [],
  kernelRules: ['人物选择必须形成可见代价'],
  hardConstraints: ['丈夫不得提前知道妻子决定离开'],
  relevantRegressionExamples: ['避免通过直接宣告抹平信息错位'],
  recentSceneSummaries: [{ sceneId: 'scene:17', summary: '妻子确认自己只是替身。', relevanceReason: '本场选择的触发点' }],
  styleSamples: [{ sourceBlockId: 'style:quiet', text: '她合上抽屉，没有发出第二次声音。', reason: '克制叙述样本' }],
  manifest: [{ sourceId: baselineCanon.id, sourceRevision: 1, authority: 'canon', includedReason: 'current_local_canon' }],
}
const context = await referenceWritingAgent.buildContextSnapshot({ session, intent, source: contextSource })
await repository.saveContext(context)
const candidateSearch = await referenceWritingAgent.generateCandidates({ session, intent, context })
assert.equal(candidateSearch.candidates.length, 3)
assert.ok(candidateSearch.candidates.every(candidate => candidate.validation.hardConstraintPassed))
assert.ok(candidateSearch.candidates.some(candidate => candidate.title === '安静完成选择'))
const selectedId = candidateSearch.candidates.find(candidate => candidate.title === '安静完成选择')?.id
assert.ok(selectedId)
const selectedCandidates = selectNarrativeCandidate(candidateSearch.candidates, selectedId)
const selectedCandidate = selectedCandidates.find(candidate => candidate.status === 'selected')
assert.ok(selectedCandidate)
await repository.saveCandidates(selectedCandidates)
session = {
  ...transitionCreationSession(session, 'candidate_selected'),
  selectedCandidateId: selectedCandidate.id,
  currentCandidateRevision: selectedCandidate.revision,
}
await repository.saveSession(session)

const request: SceneDraftRequest = {
  sessionId: session.id,
  intentId: intent.id,
  intentRevision: intent.revision,
  candidateId: selectedCandidate.id,
  candidateRevision: selectedCandidate.revision,
  contextSnapshotId: context.id,
  baseCanonRevision: session.baseCanonRevision,
  baseDraftRevision: session.currentDraftRevision,
  scope: { type: 'scene', sceneId: session.sceneId, beatIds: [], selectedBlockIds: [] },
  protectedBlockIds: [],
  targetLength: { minimum: 120, maximum: 900 },
  writingMode: 'agent_first_draft',
}
let draft = await referenceWritingAgent.draftScene({
  session,
  intent,
  candidate: selectedCandidate,
  context,
  request,
  currentBlocks: [],
})
const referenceBody = draft.contentBlocks.map(block => block.text).join('\n\n')
assert.equal(/[。！？!?；;，,：:]{2,}/u.test(referenceBody), false, 'reference prose must normalize duplicate terminal punctuation')
assert.equal(referenceBody.includes('人物没有退回解释，而是让选择继续发生'), false, 'reference prose must not repeat the retired template sentence')
draft = {
  ...draft,
  contentBlocks: draft.contentBlocks.map((block, index) => index === 0
    ? { ...block, text: `${block.text}她抬起头说：“我要离开。”`, endOffset: block.endOffset + 13 }
    : block),
}
await repository.saveDraft(draft)
session = {
  ...transitionCreationSession(session, 'drafting'),
  activeDraftId: draft.draftId,
  currentDraftRevision: draft.revision,
}
session = transitionCreationSession(session, 'reviewing')

const review = await referenceWritingAgent.reviewDraft({ session, intent, context, candidate: selectedCandidate, draft })
assert.ok(review.findings.some(finding => finding.severity === 'hard_block'))
assert.ok(review.findings.every(finding => finding.evidence.length > 0), 'every literary judgment must locate manuscript evidence')
await repository.saveReview(review)
session = { ...session, activeReviewId: review.id }
await repository.saveSession(session)

let tamperedContextReviewCalls = 0
const tamperedContextReviewAgent: WritingAgentCapabilities = {
  ...referenceWritingAgent,
  async reviewDraft(input) {
    tamperedContextReviewCalls += 1
    return referenceWritingAgent.reviewDraft(input)
  },
}
const tamperedContextWorkflow = new CreationDecisionWorkflow(repository, tamperedContextReviewAgent)
const tamperedContextSnapshot = (await repository.loadSessionSnapshot(session.id))!
tamperedContextSnapshot.contexts = tamperedContextSnapshot.contexts.map(item => item.id === context.id
  ? { ...item, hardConstraints: [...item.hardConstraints, '未经过编译器写入的伪造约束'] }
  : item)
await assert.rejects(
  () => tamperedContextWorkflow.reviewDraft({ snapshot: tamperedContextSnapshot }),
  error => error instanceof CreationDecisionError && error.code === 'stale_result',
  'a context mutated before review must fail closed before the Reviewer is invoked',
)
assert.equal(tamperedContextReviewCalls, 0, 'a tampered Context must never reach the Reviewer')

const manuallySelectedRecall = {
  id: 'manual-recall:chapter:17',
  sourceId: 'chapter:17',
  sourceRevision: 1,
  authority: 'canon' as const,
  group: 'causal' as const,
  statement: '上一章已经确认妻子掌握替身真相。',
  sourceLabel: '第 17 章',
  whyNow: '限制本章人物知识边界。',
  locator: { kind: 'chapter' as const, targetId: 'chapter:17', label: '第 17 章正史' },
}
await repository.saveContext({
  ...context,
  compilationPolicyVersion: 0,
  sourceFingerprint: 'legacy-unfingerprinted',
})
let refreshedReviewContextId: string | null = null
let refreshedReviewRecallIds: string[] = []
let refreshedReviewFocusDimensions: string[] = []
const refreshAwareReviewAgent: WritingAgentCapabilities = {
  ...referenceWritingAgent,
  async reviewDraft(input) {
    refreshedReviewContextId = input.context.id
    refreshedReviewRecallIds = input.context.manualRecallItems.map(item => item.id)
    refreshedReviewFocusDimensions = [...(input.focusDimensions || [])]
    return referenceWritingAgent.reviewDraft(input)
  },
}
const refreshAwareWorkflow = new CreationDecisionWorkflow(repository, refreshAwareReviewAgent)
const refreshedReviewResult = await refreshAwareWorkflow.reviewDraft({
  snapshot: (await repository.loadSessionSnapshot(session.id))!,
  focusDimensions: ['pacing', 'voice'],
  source: {
    ...contextSource,
    activeCharacters: contextSource.activeCharacters.filter(character => character.id === 'wife'),
    manualRecallItems: [manuallySelectedRecall],
    manifest: [
      ...contextSource.manifest,
      {
        sourceId: manuallySelectedRecall.sourceId,
        sourceRevision: manuallySelectedRecall.sourceRevision,
        authority: manuallySelectedRecall.authority,
        includedReason: 'author_selected_manual_recall',
      },
    ],
  },
})
const refreshedContext = refreshedReviewResult.snapshot.contexts.find(item => item.id === refreshedReviewContextId)
assert.ok(refreshedContext)
assert.notEqual(refreshedContext.id, context.id, 'a legacy context must be replaced before literary review')
assert.deepEqual(refreshedReviewRecallIds, [manuallySelectedRecall.id])
assert.deepEqual(refreshedReviewFocusDimensions, ['pacing', 'voice'])
assert.deepEqual(refreshedReviewResult.value.requestedFocusDimensions, ['pacing', 'voice'])
assert.deepEqual(refreshedContext.activeCharacters.map(character => character.id), ['wife'])
assert.equal(
  refreshedReviewResult.snapshot.contexts.find(item => item.id === context.id)?.status,
  'stale',
  'the pre-fingerprint context must no longer remain active',
)
assert.ok(
  (await repository.listEvents(session.id)).some(event => (
    event.type === 'context_refreshed'
    && event.payload.contextSnapshotId === refreshedContext.id
    && event.payload.manualRecallCount === 1
  )),
  'context refresh must leave a local audit event before the review is accepted',
)

refreshedReviewFocusDimensions = []
const recommendedReviewResult = await refreshAwareWorkflow.reviewDraft({
  snapshot: refreshedReviewResult.snapshot,
  writingAssistPreferences: {
    schemaVersion: 'creator-writing-assist-preferences.v1',
    enabled: true,
    selectionMode: 'recommended',
    projectLensIds: [],
    triggerPolicy: 'natural_checkpoints_only',
    suppressedLensIds: [],
  },
})
assert.ok(refreshedReviewFocusDimensions.length > 0)
assert.ok(refreshedReviewFocusDimensions.length <= 2)
assert.equal(refreshedReviewFocusDimensions[0], 'continuity')
assert.deepEqual(
  recommendedReviewResult.value.requestedFocusDimensions,
  refreshedReviewFocusDimensions,
  'the bounded recommendation must become the review focus without changing the hard gate set',
)
assert.ok(
  (await repository.listEvents(session.id)).some(event => {
    const recommendation = event.payload.writingAssistRecommendation as Record<string, unknown> | null
    return event.type === 'review_completed'
      && recommendation?.draftRevision === draft.revision
      && Array.isArray(recommendation.lensIds)
      && recommendation.lensIds.length <= 2
  }),
  'the review event must retain only revision-bound recommendation metadata',
)
const hardBlock = review.findings.find(finding => finding.severity === 'hard_block')
assert.ok(hardBlock)
const targetBlock = draft.contentBlocks.find(block => block.id === hardBlock.evidence[0].blockId)
assert.ok(targetBlock)
const repairedText = targetBlock.text.replace('她抬起头说：“我要离开。”', '她把证件夹压进箱底，扣上锁。')
const preservedAnchor = targetBlock.text.slice(0, 12)
const preservedFactEvidence = {
  fact: '目标块开场事实保持不变',
  sourceEvidenceQuote: preservedAnchor,
  candidateEvidenceQuote: preservedAnchor,
}
const preservedFactCandidate = {
  schemaVersion: 'creator-local-repair.v1' as const,
  findingId: hardBlock.id,
  targetBlockId: targetBlock.id,
  operation: 'replace_range' as const,
  proposedContent: repairedText,
  preservedFacts: [preservedFactEvidence],
  rationale: '只移除越过丈夫知识边界的直白宣告，保留目标块开场事实。',
}
assert.equal(validateLocalRepairPreservedFactEvidence({
  sourceText: targetBlock.text,
  candidate: preservedFactCandidate,
}), true)
assert.equal(validateLocalRepairPreservedFactEvidence({
  sourceText: '不包含引文的原文',
  candidate: preservedFactCandidate,
}), false, 'a preserved fact must cite the source block exactly')
assert.equal(validateLocalRepairPreservedFactEvidence({
  sourceText: targetBlock.text,
  candidate: {
    ...preservedFactCandidate,
    preservedFacts: [{ ...preservedFactEvidence, candidateEvidenceQuote: '候选中不存在的引文' }],
  },
}), false, 'a preserved fact must cite the replacement candidate exactly')
let reviserCalls = 0
let repairReviewCalls = 0
const repairAttemptLog: Array<{
  attempt: 'initial' | 'auditor_revision'
  hasPreviousRepair: boolean
  reviewDecision: 'pass' | 'reject' | null
}> = []
const reviserAgent: WritingAgentCapabilities = {
  ...referenceWritingAgent,
  async proposeRepair(input) {
    reviserCalls += 1
    repairAttemptLog.push({
      attempt: input.attempt || 'initial',
      hasPreviousRepair: Boolean(input.previousRepair),
      reviewDecision: input.repairReview?.decision || null,
    })
    return {
      ...preservedFactCandidate,
      findingId: input.finding.id,
      targetBlockId: input.targetBlock.id,
    }
  },
  async reviewRepair(input) {
    repairReviewCalls += 1
    return {
      schemaVersion: 'creator-local-repair-review.v1',
      findingId: input.finding.id,
      targetBlockId: input.targetBlock.id,
      decision: 'pass',
      verifiedPreservedFactIndexes: [0],
      issues: [],
      rationale: '候选只移除越界宣告，保留原有行动、信息顺序与人物知识边界。',
    }
  },
}
const repairWorkflow = new CreationDecisionWorkflow(repository, reviserAgent)
const repairSnapshot = (await repository.loadSessionSnapshot(session.id))!
const protectedDraft = {
  ...draft,
  contentBlocks: draft.contentBlocks.map(block => block.id === targetBlock.id ? { ...block, protected: true } : block),
}
await assert.rejects(
  () => repairWorkflow.proposeRepair({
    snapshot: {
      ...repairSnapshot,
      drafts: repairSnapshot.drafts.map(item => item.draftId === protectedDraft.draftId ? protectedDraft : item),
    },
    findingId: hardBlock.id,
  }),
  error => error instanceof CreationDecisionError && error.code === 'invalid_generation_scope',
  'protected manuscript blocks must be rejected before the Reviser is invoked',
)
assert.equal(reviserCalls, 0)
assert.equal(repairReviewCalls, 0)

const beforeRepairText = draft.contentBlocks.map(block => block.text).join('\n\n')
const rejectedCandidate = await repairWorkflow.proposeRepair({ snapshot: repairSnapshot, findingId: hardBlock.id })
assert.equal(reviserCalls, 1)
assert.equal(repairReviewCalls, 1)
assert.equal(rejectedCandidate.value.operation, 'replace_range')
assert.equal(rejectedCandidate.value.verification?.decision, 'pass')
assert.deepEqual(rejectedCandidate.value.targetBlockIds, [targetBlock.id])
assert.equal(
  rejectedCandidate.snapshot.drafts.find(item => item.draftId === draft.draftId)?.contentBlocks.map(block => block.text).join('\n\n'),
  beforeRepairText,
  'a Reviser candidate must not change the manuscript before author adoption',
)
await assert.rejects(
  () => repairWorkflow.dismissFinding({
    snapshot: rejectedCandidate.snapshot,
    findingId: hardBlock.id,
  }),
  error => error instanceof CreationDecisionError && error.code === 'hard_block_unresolved',
  'a hard block must not be dismissible as an advisory author decision',
)
const rejectedRepairDecision = await repairWorkflow.rejectRepair({
  snapshot: rejectedCandidate.snapshot,
  repairId: rejectedCandidate.value.id,
})
assert.equal(rejectedRepairDecision.value.status, 'rejected')
assert.equal(rejectedRepairDecision.snapshot.repairs.find(item => item.id === rejectedCandidate.value.id)?.status, 'rejected')
assert.equal(
  rejectedRepairDecision.snapshot.reviews
    .find(item => item.id === rejectedCandidate.value.reviewId)
    ?.findings.find(item => item.id === hardBlock.id)?.status,
  'active',
  'rejecting a repair must leave its hard-block finding active',
)
assert.equal(
  rejectedRepairDecision.snapshot.drafts.find(item => item.draftId === draft.draftId)?.contentBlocks.map(block => block.text).join('\n\n'),
  beforeRepairText,
  'rejecting a Reviser candidate must leave the manuscript unchanged',
)
assert.ok(
  rejectedRepairDecision.snapshot.events.some(event => (
    event.type === 'repair_rejected'
    && event.payload.repairId === rejectedCandidate.value.id
  )),
  'repair rejection must leave an auditable author event',
)
await assert.rejects(
  () => repairWorkflow.rejectRepair({
    snapshot: rejectedRepairDecision.snapshot,
    repairId: rejectedCandidate.value.id,
  }),
  error => error instanceof CreationDecisionError && error.code === 'evidence_missing',
  'an already rejected repair must not be rejected twice',
)
await assert.rejects(
  () => repairWorkflow.acceptRepair({
    snapshot: rejectedRepairDecision.snapshot,
    repairId: rejectedCandidate.value.id,
  }),
  error => error instanceof CreationDecisionError && error.code === 'evidence_missing',
  'an already rejected repair must not be adopted into a new draft revision',
)

await repository.saveReview(review)
const rejectingRepairAgent: WritingAgentCapabilities = {
  ...reviserAgent,
  async reviewRepair(input) {
    repairReviewCalls += 1
    return {
      schemaVersion: 'creator-local-repair-review.v1',
      findingId: input.finding.id,
      targetBlockId: input.targetBlock.id,
      decision: 'reject',
      verifiedPreservedFactIndexes: [],
      issues: [{
        dimension: 'continuity',
        severity: 'hard_block',
        sourceEvidenceQuote: null,
        candidateEvidenceQuote: '她把证件夹压进箱底',
        diagnosis: '候选删除了当前场景必须保留的公开行动结果。',
      }],
      rationale: '候选虽然移除了越界对白，但同时破坏了当前场景的既有行动连续性。',
    }
  },
}
const rejectingRepairWorkflow = new CreationDecisionWorkflow(repository, rejectingRepairAgent)
const rejectingRepairSnapshot = (await repository.loadSessionSnapshot(session.id))!
await assert.rejects(
  () => rejectingRepairWorkflow.proposeRepair({
    snapshot: rejectingRepairSnapshot,
    findingId: hardBlock.id,
  }),
  error => error instanceof CreationDecisionError && error.code === 'hard_block_unresolved',
  'an independently rejected replacement must not enter the author adoption path',
)
const independentlyRejectedSnapshot = (await repository.loadSessionSnapshot(session.id))!
const independentlyRejectedRepair = independentlyRejectedSnapshot.repairs.find(item => (
  item.status === 'rejected' && item.verification?.decision === 'reject'
))
assert.ok(independentlyRejectedRepair)
assert.equal(reviserCalls, 3)
assert.equal(repairReviewCalls, 3)
assert.deepEqual(repairAttemptLog.slice(1, 3), [
  { attempt: 'initial', hasPreviousRepair: false, reviewDecision: null },
  { attempt: 'auditor_revision', hasPreviousRepair: true, reviewDecision: 'reject' },
], 'an Auditor rejection allows exactly one bounded Reviser revision')
assert.equal(
  independentlyRejectedSnapshot.drafts.find(item => item.draftId === draft.draftId)?.contentBlocks.map(block => block.text).join('\n\n'),
  beforeRepairText,
  'an independently rejected candidate must leave the manuscript unchanged',
)

await repository.saveReview(review)
let boundedRevisionCalls = 0
let boundedRevisionReviewCalls = 0
const auditorRevisedText = targetBlock.text.replace(
  '她抬起头说：“我要离开。”',
  '她把证件夹重新压进箱底，扣上锁。',
)
const boundedRevisionAgent: WritingAgentCapabilities = {
  ...referenceWritingAgent,
  async proposeRepair(input) {
    boundedRevisionCalls += 1
    if (input.attempt === 'auditor_revision') {
      assert.equal(input.previousRepair?.proposedContent, repairedText)
      assert.equal(input.repairReview?.decision, 'reject')
    }
    return {
      ...preservedFactCandidate,
      findingId: input.finding.id,
      targetBlockId: input.targetBlock.id,
      proposedContent: input.attempt === 'auditor_revision' ? auditorRevisedText : repairedText,
    }
  },
  async reviewRepair(input) {
    boundedRevisionReviewCalls += 1
    if (input.repair.proposedContent === repairedText) {
      return {
        schemaVersion: 'creator-local-repair-review.v1',
        findingId: input.finding.id,
        targetBlockId: input.targetBlock.id,
        decision: 'reject',
        verifiedPreservedFactIndexes: [0],
        issues: [{
          dimension: 'continuity',
          severity: 'revision_candidate',
          sourceEvidenceQuote: null,
          candidateEvidenceQuote: '她把证件夹压进箱底',
          diagnosis: '局部动作顺序仍需按相邻正文修正。',
        }],
        rationale: '事实已保留，但局部顺序需要一次受约束修订。',
      }
    }
    return {
      schemaVersion: 'creator-local-repair-review.v1',
      findingId: input.finding.id,
      targetBlockId: input.targetBlock.id,
      decision: 'pass',
      verifiedPreservedFactIndexes: [0],
      issues: [],
      rationale: '受约束修订处理了唯一问题，并保留目标块其余事实。',
    }
  },
}
const boundedRevisionWorkflow = new CreationDecisionWorkflow(repository, boundedRevisionAgent)
const boundedRevisionResult = await boundedRevisionWorkflow.proposeRepair({
  snapshot: (await repository.loadSessionSnapshot(session.id))!,
  findingId: hardBlock.id,
})
assert.equal(boundedRevisionCalls, 2, 'one rejected repair receives exactly one Reviser revision')
assert.equal(boundedRevisionReviewCalls, 2, 'both repair attempts require independent review')
assert.equal(boundedRevisionResult.value.proposedContent, auditorRevisedText)
assert.equal(boundedRevisionResult.value.verification?.decision, 'pass')
assert.equal(
  boundedRevisionResult.snapshot.drafts.find(item => item.draftId === draft.draftId)?.contentBlocks.map(block => block.text).join('\n\n'),
  beforeRepairText,
  'an Auditor-guided revision must remain a candidate until author adoption',
)

await repository.saveReview(review)
const incompleteReviewAgent: WritingAgentCapabilities = {
  ...reviserAgent,
  async reviewRepair(input) {
    repairReviewCalls += 1
    return {
      schemaVersion: 'creator-local-repair-review.v1',
      findingId: input.finding.id,
      targetBlockId: input.targetBlock.id,
      decision: 'pass',
      verifiedPreservedFactIndexes: [],
      issues: [],
      rationale: '审阅声称通过，但没有逐项核验事实保持证据。',
    }
  },
}
const incompleteReviewWorkflow = new CreationDecisionWorkflow(repository, incompleteReviewAgent)
const incompleteReviewStartSnapshot = (await repository.loadSessionSnapshot(session.id))!
await assert.rejects(
  () => incompleteReviewWorkflow.proposeRepair({
    snapshot: incompleteReviewStartSnapshot,
    findingId: hardBlock.id,
  }),
  error => error instanceof CreationDecisionError && error.code === 'evidence_missing',
  'a passing review without complete preserved-fact coverage must fail closed',
)
const incompleteReviewSnapshot = (await repository.loadSessionSnapshot(session.id))!
assert.ok(incompleteReviewSnapshot.repairs.some(item => (
  item.status === 'rejected'
  && item.verification?.decision === 'pass'
  && item.verification.verifiedPreservedFactIndexes.length === 0
)))
assert.equal(reviserCalls, 4)
assert.equal(repairReviewCalls, 4)

await repository.saveReview(review)
const duplicateReviewAgent: WritingAgentCapabilities = {
  ...reviserAgent,
  async reviewRepair(input) {
    repairReviewCalls += 1
    return {
      schemaVersion: 'creator-local-repair-review.v1',
      findingId: input.finding.id,
      targetBlockId: input.targetBlock.id,
      decision: 'pass',
      verifiedPreservedFactIndexes: [0, 0],
      issues: [],
      rationale: '审阅重复返回了同一事实索引，不能视为完整逐项核验。',
    }
  },
}
const duplicateReviewWorkflow = new CreationDecisionWorkflow(repository, duplicateReviewAgent)
const duplicateReviewStartSnapshot = (await repository.loadSessionSnapshot(session.id))!
await assert.rejects(
  () => duplicateReviewWorkflow.proposeRepair({
    snapshot: duplicateReviewStartSnapshot,
    findingId: hardBlock.id,
  }),
  error => error instanceof CreationDecisionError && error.code === 'evidence_missing',
  'a passing review with duplicate preserved-fact indexes must fail closed',
)
const duplicateReviewSnapshot = (await repository.loadSessionSnapshot(session.id))!
assert.ok(duplicateReviewSnapshot.repairs.some(item => (
  item.status === 'rejected'
  && item.verification?.decision === 'pass'
  && item.verification.verifiedPreservedFactIndexes.length === 2
)))
assert.equal(reviserCalls, 5)
assert.equal(repairReviewCalls, 5)

await repository.saveReview(review)
const acceptedCandidate = await repairWorkflow.proposeRepair({
  snapshot: (await repository.loadSessionSnapshot(session.id))!,
  findingId: hardBlock.id,
})
assert.equal(reviserCalls, 6)
assert.equal(repairReviewCalls, 6)
assert.deepEqual(acceptedCandidate.value.preservedFacts, ['目标块开场事实保持不变'])
assert.deepEqual(acceptedCandidate.value.verification?.verifiedPreservedFactIndexes, [0])
const reviewInvalidationRepository = new MemoryCreationDecisionRepository()
await Promise.all([
  reviewInvalidationRepository.saveSession(acceptedCandidate.snapshot.session),
  ...acceptedCandidate.snapshot.intents.map(item => reviewInvalidationRepository.saveIntent(item)),
  ...acceptedCandidate.snapshot.contexts.map(item => reviewInvalidationRepository.saveContext(item)),
  reviewInvalidationRepository.saveCandidates(acceptedCandidate.snapshot.candidates),
  ...acceptedCandidate.snapshot.drafts.map(item => reviewInvalidationRepository.saveDraft(item)),
  ...acceptedCandidate.snapshot.reviews.map(item => reviewInvalidationRepository.saveReview(item)),
  ...acceptedCandidate.snapshot.repairs.map(item => reviewInvalidationRepository.saveRepair(item)),
])
const reviewInvalidationWorkflow = new CreationDecisionWorkflow(
  reviewInvalidationRepository,
  referenceWritingAgent,
)
const reviewInvalidationResult = await reviewInvalidationWorkflow.reviewDraft({
  snapshot: acceptedCandidate.snapshot,
})
assert.equal(
  reviewInvalidationResult.snapshot.repairs.find(item => item.id === acceptedCandidate.value.id)?.status,
  'stale',
  'starting a new literary review must persistently invalidate every older repair candidate',
)
assert.equal(
  reviewInvalidationResult.snapshot.drafts
    .find(item => item.draftId === draft.draftId)
    ?.contentBlocks.map(block => block.text).join('\n\n'),
  beforeRepairText,
  'invalidating an old repair candidate must not change the manuscript',
)
const foreignReviewRepair = {
  ...acceptedCandidate.value,
  id: 'repair:foreign-review',
  reviewId: 'review:foreign',
}
await assert.rejects(
  () => repairWorkflow.acceptRepair({
    snapshot: {
      ...acceptedCandidate.snapshot,
      repairs: [...acceptedCandidate.snapshot.repairs, foreignReviewRepair],
    },
    repairId: foreignReviewRepair.id,
  }),
  error => error instanceof CreationDecisionError && error.code === 'stale_result',
  'a repair from another review must not be adopted even when its draft revision matches',
)
const staleDraft = { ...draft, revision: draft.revision + 1 }
await assert.rejects(
  () => repairWorkflow.acceptRepair({
    snapshot: {
      ...acceptedCandidate.snapshot,
      session: { ...acceptedCandidate.snapshot.session, currentDraftRevision: staleDraft.revision },
      drafts: acceptedCandidate.snapshot.drafts.map(item => item.draftId === staleDraft.draftId ? staleDraft : item),
    },
    repairId: acceptedCandidate.value.id,
  }),
  error => error instanceof CreationDecisionError && error.code === 'draft_revision_conflict',
  'a stale Reviser candidate must not overwrite a newer author revision',
)

const acceptedRepair = await repairWorkflow.acceptRepair({
  snapshot: acceptedCandidate.snapshot,
  repairId: acceptedCandidate.value.id,
})
const acceptedDraft = acceptedRepair.snapshot.drafts.find(item => item.draftId === acceptedRepair.snapshot.session.activeDraftId)
assert.ok(acceptedDraft)
assert.equal(acceptedDraft.contentBlocks.find(block => block.id === targetBlock.id)?.text, repairedText)
acceptedDraft.contentBlocks.forEach((block, index, blocks) => {
  const expectedStart = index === 0 ? 0 : blocks[index - 1].endOffset + 2
  assert.equal(block.startOffset, expectedStart, 'accepted local repair must rebase every manuscript block offset')
  assert.equal(block.endOffset, block.startOffset + block.text.length)
})
for (const originalBlock of draft.contentBlocks.filter(block => block.id !== targetBlock.id)) {
  assert.equal(
    acceptedDraft.contentBlocks.find(block => block.id === originalBlock.id)?.text,
    originalBlock.text,
    'author adoption must preserve every non-target manuscript block',
  )
}
draft = acceptedDraft
session = transitionCreationSession(acceptedRepair.snapshot.session, 'reviewing')
const cleanReview = await referenceWritingAgent.reviewDraft({ session, intent, context, candidate: selectedCandidate, draft })
assert.equal(cleanReview.findings.some(finding => finding.severity === 'hard_block'), false)
assert.ok(cleanReview.findings.every(finding => finding.evidence.length > 0))
assert.equal(
  cleanReview.findings.some(finding => finding.severity === 'preserve'),
  false,
  'the deterministic reviewer must not auto-preserve the first paragraph',
)

const pendingCanonRepair: RepairProposal = {
  schemaVersion: 'repair-proposal.v1',
  id: 'repair:pending-canon-gate',
  reviewId: cleanReview.id,
  findingId: 'finding:pending-canon-gate',
  baseDraftRevision: draft.revision,
  operation: 'replace_range',
  targetBlockIds: [draft.contentBlocks[0].id],
  preservedFacts: [],
  preservedBlockIds: [],
  proposedContent: '尚待作者决定的局部候选。',
  status: 'proposed',
}
let blockedCanonPatchAgentCalls = 0
const pendingRepairGateAgent: WritingAgentCapabilities = {
  ...referenceWritingAgent,
  async proposeCanonPatch(input) {
    blockedCanonPatchAgentCalls += 1
    return referenceWritingAgent.proposeCanonPatch(input)
  },
}
const pendingRepairGateWorkflow = new CreationDecisionWorkflow(repository, pendingRepairGateAgent)
const unresolvedRevisionEvidence = evidenceForText(
  draft.contentBlocks[0],
  draft.contentBlocks[0].text.slice(0, 12),
)
assert.ok(unresolvedRevisionEvidence)
const unresolvedRevisionReview: LiteraryReview = {
  ...cleanReview,
  id: 'review:unresolved-revision-candidate',
  findings: [{
    id: 'finding:unresolved-revision-candidate',
    dimension: 'pacing',
    severity: 'revision_candidate',
    evidence: [unresolvedRevisionEvidence],
    expected: '动作和后果保持紧凑。',
    observed: '局部解释仍需作者决定是否收紧。',
    readerImpact: '推进可能变慢。',
    diagnosis: '冻结工作流门禁夹具。',
    repairDirection: '由作者采用局部修订或明确忽略。',
    protectedBlockIds: [],
    confidence: 'high',
    status: 'active',
  }],
}
const pendingRepairGateSnapshot: CreationDecisionSnapshot = {
  session: {
    ...session,
    activeDraftId: draft.draftId,
    activeReviewId: cleanReview.id,
    proposedCanonPatchId: null,
  },
  intents: [intent],
  contexts: [context],
  candidates: [selectedCandidate],
  drafts: [draft],
  reviews: [cleanReview],
  repairs: [pendingCanonRepair],
  patches: [],
  canon: baselineCanon,
  events: [],
}
await assert.rejects(
  () => pendingRepairGateWorkflow.proposeCanonPatch({
    ...pendingRepairGateSnapshot,
    session: {
      ...pendingRepairGateSnapshot.session,
      activeReviewId: unresolvedRevisionReview.id,
    },
    reviews: [unresolvedRevisionReview],
    repairs: [],
  }),
  error => error instanceof CreationDecisionError && error.code === 'hard_block_unresolved',
  'an unresolved revision candidate must block canon patch preparation',
)
assert.equal(blockedCanonPatchAgentCalls, 0, 'an unresolved revision candidate must stop before the Agent call')
await assert.rejects(
  () => pendingRepairGateWorkflow.proposeCanonPatch(pendingRepairGateSnapshot),
  error => error instanceof CreationDecisionError && error.code === 'hard_block_unresolved',
  'a pending current-revision repair must block canon patch preparation',
)
assert.equal(blockedCanonPatchAgentCalls, 0, 'the gate must stop before asking an Agent to prepare a canon patch')

async function reviewFixture(id: string, text: string) {
  const fixtureDraft = {
    ...draft,
    draftId: id,
    revision: draft.revision + 10,
    contentBlocks: draftBlocksFromText(text),
    observedStateChanges: [],
  }
  const fixtureReview = await referenceWritingAgent.reviewDraft({
    session,
    intent,
    context,
    candidate: selectedCandidate,
    draft: fixtureDraft,
  })
  assert.ok(
    fixtureReview.findings.every(finding => validateFindingEvidence(finding, fixtureDraft.contentBlocks)),
    'every deterministic quality finding must keep valid manuscript evidence',
  )
  return fixtureReview
}

const duplicateReview = await reviewFixture(
  'draft:duplicate-quality-fixture',
  '钟声沿着空走廊滚过去，门缝里的灰跟着抖了一层。\n\n钟声沿着空走廊滚过去，门缝里的灰跟着抖了一层。',
)
assert.ok(duplicateReview.findings.some(finding => finding.dimension === 'repetition'))

const metaReview = await reviewFixture(
  'draft:meta-quality-fixture',
  '本章将揭示封印松动后的真正代价。林越推开石门，指节先被冷雾咬出一圈白痕。',
)
assert.ok(metaReview.findings.some(finding => finding.dimension === 'exposition'))

const phraseReview = await reviewFixture(
  'draft:phrase-quality-fixture',
  '就在这时，铁链响了。就在这时，风从井底倒卷。就在这时，林越听见身后的人停住呼吸。',
)
assert.ok(phraseReview.findings.some(finding => finding.dimension === 'freshness'))
await repository.saveReview(cleanReview)
session = {
  ...session,
  activeReviewId: cleanReview.id,
}
await repository.saveSession(session)
const activeRevisionCandidateIds = cleanReview.findings
  .filter(finding => finding.status === 'active' && finding.severity === 'revision_candidate')
  .map(finding => finding.id)
assert.ok(activeRevisionCandidateIds.length > 0, 'the fixture must prove author resolution of active revision candidates')
let authorDecisionSnapshot = (await repository.loadSessionSnapshot(session.id))!
let authorResolvedReview = cleanReview
for (const findingId of activeRevisionCandidateIds) {
  const dismissedFinding = await repairWorkflow.dismissFinding({
    snapshot: authorDecisionSnapshot,
    findingId,
  })
  authorDecisionSnapshot = dismissedFinding.snapshot
  authorResolvedReview = dismissedFinding.value
}
assert.equal(
  authorResolvedReview.findings.some(finding => (
    finding.status === 'active' && finding.severity === 'revision_candidate'
  )),
  false,
  'explicit author dismissals must resolve every revision candidate before canon patch preparation',
)
const patch = await referenceWritingAgent.proposeCanonPatch({
  session,
  intent,
  context,
  candidate: selectedCandidate,
  draft,
  review: authorResolvedReview,
})
await repository.saveCanonPatch(patch)
session = {
  ...transitionCreationSession(session, 'canon_patch_pending'),
  activeReviewId: cleanReview.id,
  proposedCanonPatchId: patch.id,
}
await repository.saveSession(session)

const canonBeforePendingRepairCommit = await repository.loadCanonState(session.workId, session.chapterId)
const eventsBeforePendingRepairCommit = await repository.listEvents(session.id)
await assert.rejects(
  () => repository.commitCanon({
    session,
    intent,
    context,
    draft,
    review: authorResolvedReview,
    repairs: [pendingCanonRepair],
    patch,
    currentCanon: baselineCanon,
    authorConfirmed: true,
    confirmedAt: '2026-07-13T11:06:30.000Z',
  }),
  error => error instanceof CreationDecisionError && error.code === 'hard_block_unresolved',
  'a pending current-revision repair must block the repository commit boundary',
)
assert.deepEqual(
  await repository.loadCanonState(session.workId, session.chapterId),
  canonBeforePendingRepairCommit,
  'a blocked commit must not partially mutate local canon',
)
assert.equal(
  (await repository.listEvents(session.id)).length,
  eventsBeforePendingRepairCommit.length,
  'a blocked commit must not append partial confirmation or commit events',
)

await assert.rejects(
  () => repository.commitCanon({
    session,
    intent,
    context,
    draft,
    review: authorResolvedReview,
    repairs: [],
    patch,
    currentCanon: baselineCanon,
    authorConfirmed: false,
    confirmedAt: '2026-07-13T11:07:00.000Z',
  }),
  error => error instanceof CreationDecisionError && error.code === 'author_confirmation_required',
)
await assert.rejects(
  () => repository.commitCanon({
    session,
    intent,
    context,
    draft,
    review: authorResolvedReview,
    repairs: [],
    patch: { ...patch, operations: [] },
    currentCanon: baselineCanon,
    authorConfirmed: true,
    confirmedAt: '2026-07-13T11:07:30.000Z',
  }),
  error => error instanceof CreationDecisionError && error.code === 'evidence_missing',
  'a manuscript cannot enter canon without at least one evidenced state change',
)
const committed = await repository.commitCanon({
  session,
  intent,
  context,
  draft,
  review: authorResolvedReview,
  repairs: [],
  patch,
  currentCanon: baselineCanon,
  authorConfirmed: true,
  confirmedAt: '2026-07-13T11:08:00.000Z',
})
assert.equal(committed.session.phase, 'canon_committed')
assert.equal(committed.session.proposedCanonPatchId, null, 'committed canon patches must not remain actionable')
assert.equal(committed.canon.revision, 2)
assert.equal(
  (committed.canon.state.characters as Record<string, { relationshipStances: string }>).wife.relationshipStances,
  'withdrawing',
)
assert.deepEqual(
  (committed.canon.state.characters as Record<string, { knowledge: string[] }>).husband.knowledge,
  [],
  'canon patch must not give the husband knowledge that the scene deliberately withheld',
)
assert.ok(
  (await repository.listEvents(session.id)).some(event => event.type === 'canon_patch_committed'),
  'canon commit must append its confirmation event even when later-timestamped author actions already exist',
)
const committedSnapshot = await repository.loadSessionSnapshot(session.id)
assert.equal(committedSnapshot?.canon?.acceptedDraftRevision, draft.revision)
assert.equal(activeCanonPatch(committedSnapshot!), null, 'a restored committed session must not expose a stale confirmation action')

const retryRepository = new MemoryCreationDecisionRepository()
const retrySessionId = 'session:candidate-retry'
const retryIntent = {
  ...intent,
  id: 'intent:candidate-retry',
  sessionId: retrySessionId,
}
const retrySession = {
  ...createCreationSession({
    id: retrySessionId,
    workId: 'work:fixture',
    chapterId: 'chapter:18',
    sceneId: 'scene:departure',
    branchId: 'branch:main',
    baseCanonRevision: 1,
  }),
  phase: 'intent_locked' as const,
  lockedIntentId: retryIntent.id,
  currentIntentRevision: retryIntent.revision,
}
await retryRepository.saveSession(retrySession)
await retryRepository.saveIntent(retryIntent)
let candidateAttempts = 0
const twoCandidateAgent = {
  ...referenceWritingAgent,
  async generateCandidates(input: Parameters<typeof referenceWritingAgent.generateCandidates>[0]) {
    candidateAttempts += 1
    const result = await referenceWritingAgent.generateCandidates(input)
    const candidates = result.candidates.slice(0, 2)
    return {
      ...result,
      candidates,
      assessments: result.assessments.filter(item => candidates.some(candidate => candidate.id === item.candidateId)),
      notice: 'Only 2 independent narrative paths passed the hard constraints.',
    }
  },
}
const retryWorkflow = new CreationDecisionWorkflow(retryRepository, twoCandidateAgent)
const retryResult = await retryWorkflow.searchCandidates({
  snapshot: (await retryRepository.loadSessionSnapshot(retrySessionId))!,
  source: contextSource,
})
assert.equal(candidateAttempts, 2, 'candidate search may retry only once when fewer than three paths survive')
assert.equal(retryResult.value.candidates.length, 2, 'similar retry results must not be copied to fill three slots')
assert.match(retryResult.value.notice || '', /Only 2 independent/)

const mixedResult = await retryWorkflow.mixCandidates({
  snapshot: retryResult.snapshot,
  candidateIds: [retryResult.value.candidates[0].id, retryResult.value.candidates[1].id],
})
assert.ok(mixedResult.value.title.startsWith('融合：'))
assert.equal(mixedResult.snapshot.candidates.filter(item => item.status === 'active').length, 3)
const rejected = await retryWorkflow.rejectCandidate({
  snapshot: mixedResult.snapshot,
  candidateId: retryResult.value.candidates[0].id,
})
assert.equal(rejected.snapshot.candidates.find(item => item.id === retryResult.value.candidates[0].id)?.status, 'rejected')
assert.ok((await retryRepository.listEvents(retrySessionId)).some(event => event.type === 'candidates_mixed'))
assert.ok((await retryRepository.listEvents(retrySessionId)).some(event => event.type === 'candidate_rejected'))

const authorDecisionRepository = new MemoryCreationDecisionRepository()
const authorDecisionSessionId = 'session:scene-author-decision'
const authorDecisionIntent = {
  ...intent,
  id: 'intent:scene-author-decision',
  sessionId: authorDecisionSessionId,
  revision: 7,
  status: 'locked' as const,
}
const authorDecisionContextSeed = {
  ...context,
  id: 'context:scene-author-decision',
  sessionId: authorDecisionSessionId,
  intentRevision: authorDecisionIntent.revision,
  status: 'active' as const,
}
const authorDecisionContext = {
  ...authorDecisionContextSeed,
  contentFingerprint: contextSnapshotFingerprint(authorDecisionContextSeed),
}
const authorDecisionCandidate = {
  ...selectedCandidate,
  id: 'candidate:scene-author-decision',
  sessionId: authorDecisionSessionId,
  intentRevision: authorDecisionIntent.revision,
  contextSnapshotId: authorDecisionContext.id,
  status: 'selected' as const,
}
const authorDecisionDraft = {
  ...draft,
  draftId: 'draft:scene-author-decision',
  sessionId: authorDecisionSessionId,
  baseIntentRevision: authorDecisionIntent.revision,
  baseCandidateRevision: authorDecisionCandidate.revision,
  status: 'current' as const,
}
const authorDecisionReview = {
  ...cleanReview,
  id: 'review:scene-author-decision',
  sessionId: authorDecisionSessionId,
  draftId: authorDecisionDraft.draftId,
  baseIntentRevision: authorDecisionIntent.revision,
  baseCandidateRevision: authorDecisionCandidate.revision,
  contextSnapshotId: authorDecisionContext.id,
  contextCompilationPolicyVersion: authorDecisionContext.compilationPolicyVersion,
  contextSourceFingerprint: authorDecisionContext.sourceFingerprint,
  contextSnapshotFingerprint: authorDecisionContext.contentFingerprint,
  status: 'active' as const,
}
const authorDecisionRepair = {
  schemaVersion: 'repair-proposal.v1' as const,
  id: 'repair:scene-author-decision',
  reviewId: authorDecisionReview.id,
  findingId: 'finding:scene-author-decision',
  baseDraftRevision: authorDecisionDraft.revision,
  operation: 'offer_variants' as const,
  targetBlockIds: [authorDecisionDraft.contentBlocks[0].id],
  preservedFacts: [],
  preservedBlockIds: [],
  proposedContent: '只保留为待作者审阅的局部方向。',
  status: 'proposed' as const,
  createdAt: '2026-07-13T12:00:00.000Z',
}
const authorDecisionPatch = {
  ...patch,
  id: 'patch:scene-author-decision',
  sessionId: authorDecisionSessionId,
  sourceDraftRevision: authorDecisionDraft.revision,
  status: 'proposed' as const,
}
const authorDecisionSession = {
  ...createCreationSession({
    id: authorDecisionSessionId,
    workId: 'work:scene-author-decision',
    chapterId: 'chapter:20',
    sceneId: 'scene:chapter-20',
    branchId: 'branch:main',
    baseCanonRevision: 0,
    now: '2026-07-13T12:00:00.000Z',
  }),
  phase: 'candidate_selected' as const,
  currentIntentRevision: authorDecisionIntent.revision,
  currentCandidateRevision: authorDecisionCandidate.revision,
  currentDraftRevision: authorDecisionDraft.revision,
  lockedIntentId: authorDecisionIntent.id,
  selectedCandidateId: authorDecisionCandidate.id,
  activeDraftId: authorDecisionDraft.draftId,
  activeReviewId: authorDecisionReview.id,
  proposedCanonPatchId: authorDecisionPatch.id,
}
await authorDecisionRepository.saveSession(authorDecisionSession)
await authorDecisionRepository.saveIntent(authorDecisionIntent)
await authorDecisionRepository.saveContext(authorDecisionContext)
await authorDecisionRepository.saveCandidates([authorDecisionCandidate])
await authorDecisionRepository.saveDraft(authorDecisionDraft)
await authorDecisionRepository.saveReview(authorDecisionReview)
await authorDecisionRepository.saveRepair(authorDecisionRepair)
await authorDecisionRepository.saveCanonPatch(authorDecisionPatch)

const sceneAuthorDecision = {
  schemaVersion: 'creator-author-decision-required.v1' as const,
  decisionId: 'scene-author-decision:pipeline-20',
  pipelineId: 'pipeline-20',
  sessionId: authorDecisionSessionId,
  intentId: authorDecisionIntent.id,
  intentRevision: authorDecisionIntent.revision,
  reason: 'scene_architecture_repetition' as const,
  writerInvoked: false as const,
  canonCommitAllowed: false as const,
  boundedRevisionExhausted: true as const,
  initialMechanismIssues: ['scene_mechanism_repeat:3'],
  revisionMechanismIssues: ['scene_mechanism_repeat:4'],
  initialReview: { decision: 'reject' },
  revisionReview: { decision: 'reject' },
  decisionOptions: {
    schemaVersion: 'creator-scene-author-decision-options.v1' as const,
    question: '本场需要改由哪一种机制发动，同时保留已经锁定的事实边界？',
    options: [
      {
        id: 'option:institutional-negotiation',
        label: '权限协商主导',
        primaryChangedAxis: 'pressureSource' as const,
        proposedAdjustment: '保留核验成果与人物知识边界，让制度权限和交换条件成为主要阻力。',
        preservedAuthorIntent: ['保留核验成果', '保留人物明确放弃'],
        addressesIssueCodes: ['causal_chain_repetition' as const],
        whyItBreaksRepetition: '事件不再由机械险情与救援分工发动，而由权限交换迫使人物选择。',
        expectedMechanismSignature: {
          pressureSource: 'institution' as const,
          conflictEngine: 'negotiation' as const,
          agencyPattern: 'bargain' as const,
          costPattern: 'obligation' as const,
          endingPattern: 'relationship_shift' as const,
        },
        tradeoff: '动作密度降低，但关系与权限压力上升。',
      },
      {
        id: 'option:timed-investigation',
        label: '限时核验主导',
        primaryChangedAxis: 'conflictEngine' as const,
        proposedAdjustment: '保留现有证据，在限时窗口内通过调查选择决定哪项事实可以公开。',
        preservedAuthorIntent: ['保留有限结论', '保留权限边界'],
        addressesIssueCodes: ['ending_repetition' as const],
        whyItBreaksRepetition: '主要代价改为时间与机会损失，结尾不再销毁调查信息。',
        expectedMechanismSignature: {
          pressureSource: 'time' as const,
          conflictEngine: 'investigation' as const,
          agencyPattern: 'refusal' as const,
          costPattern: 'time_loss' as const,
          endingPattern: 'promise_advanced' as const,
        },
        tradeoff: '现场危险感降低，但推理压力更集中。',
      },
    ],
    requiresAuthorSelection: true as const,
    writerInvoked: false as const,
    canonCommitAllowed: false as const,
  },
}
const authorDecisionAgent: WritingAgentCapabilities = {
  ...referenceWritingAgent,
  async draftScene() {
    throw new CreationDecisionError(
      'scene_author_decision_required',
      'The repeated scene mechanism needs an author decision.',
      sceneAuthorDecision,
    )
  },
}
const authorDecisionWorkflow = new CreationDecisionWorkflow(authorDecisionRepository, authorDecisionAgent)
const authorDecisionRequest: SceneDraftRequest = {
  ...request,
  sessionId: authorDecisionSessionId,
  intentId: authorDecisionIntent.id,
  intentRevision: authorDecisionIntent.revision,
  candidateId: authorDecisionCandidate.id,
  candidateRevision: authorDecisionCandidate.revision,
  contextSnapshotId: authorDecisionContext.id,
  baseCanonRevision: authorDecisionSession.baseCanonRevision,
  baseDraftRevision: authorDecisionSession.currentDraftRevision,
  scope: {
    type: 'scene',
    sceneId: authorDecisionSession.sceneId,
    beatIds: [],
    selectedBlockIds: [],
  },
}
const beforeAuthorDecisionSnapshot = (await authorDecisionRepository.loadSessionSnapshot(authorDecisionSessionId))!
await assert.rejects(
  () => authorDecisionWorkflow.generateSceneDraft({
    snapshot: beforeAuthorDecisionSnapshot,
    request: authorDecisionRequest,
    currentBlocks: authorDecisionDraft.contentBlocks,
  }),
  error => error instanceof CreationDecisionError && error.code === 'scene_author_decision_required',
  'a repeated architecture must stop before Writer output and request an author decision',
)
const pendingAuthorDecisionSnapshot = (await authorDecisionRepository.loadSessionSnapshot(authorDecisionSessionId))!
assert.ok(
  pendingAuthorDecisionSnapshot.events.some(event => event.type === 'scene_author_decision_requested'),
  'the bounded architecture failure must persist a recoverable local author-decision event',
)
assert.equal(pendingAuthorDecisionSnapshot.drafts.length, 1, 'the failed Writer call must not create a new draft')
await assert.rejects(
  () => authorDecisionWorkflow.selectSceneAuthorDecision({
    snapshot: pendingAuthorDecisionSnapshot,
    decisionId: sceneAuthorDecision.decisionId,
    optionId: sceneAuthorDecision.decisionOptions.options[0].id,
    authorConfirmed: false,
  }),
  error => error instanceof CreationDecisionError && error.code === 'scene_author_decision_required',
  'no author confirmation means no intent revision',
)
await assert.rejects(
  () => authorDecisionWorkflow.selectSceneAuthorDecision({
    snapshot: pendingAuthorDecisionSnapshot,
    decisionId: sceneAuthorDecision.decisionId,
    optionId: 'option:forged',
    authorConfirmed: true,
  }),
  error => error instanceof CreationDecisionError && error.code === 'author_decision_option_invalid',
  'a forged option id must not be promoted into the author intent',
)
const selectedSceneDirection = await authorDecisionWorkflow.selectSceneAuthorDecision({
  snapshot: pendingAuthorDecisionSnapshot,
  decisionId: sceneAuthorDecision.decisionId,
  optionId: sceneAuthorDecision.decisionOptions.options[0].id,
  authorConfirmed: true,
  selectedAt: '2026-07-13T12:05:00.000Z',
})
assert.equal(selectedSceneDirection.value.status, 'locked')
assert.equal(selectedSceneDirection.value.revision, authorDecisionIntent.revision + 1)
assert.equal(
  selectedSceneDirection.value.sceneMechanismDirection?.id,
  sceneAuthorDecision.decisionOptions.options[0].id,
)
assert.deepEqual(
  selectedSceneDirection.value.sceneMechanismDirection?.expectedMechanismSignature,
  sceneAuthorDecision.decisionOptions.options[0].expectedMechanismSignature,
)
assert.equal(selectedSceneDirection.snapshot.session.phase, 'candidate_search')
assert.equal(selectedSceneDirection.snapshot.session.selectedCandidateId, null)
assert.equal(selectedSceneDirection.snapshot.session.activeDraftId, null)
assert.equal(selectedSceneDirection.snapshot.session.activeReviewId, null)
assert.equal(selectedSceneDirection.snapshot.session.proposedCanonPatchId, null)
assert.ok(selectedSceneDirection.snapshot.contexts.every(item => item.status === 'stale'))
assert.ok(selectedSceneDirection.snapshot.candidates.every(item => item.status === 'stale'))
assert.ok(selectedSceneDirection.snapshot.drafts.every(item => item.status === 'stale'))
assert.ok(selectedSceneDirection.snapshot.reviews.every(item => item.status === 'stale'))
assert.ok(selectedSceneDirection.snapshot.repairs.every(item => item.status === 'stale'))
assert.ok(selectedSceneDirection.snapshot.patches.every(item => item.status === 'stale'))
assert.equal(selectedSceneDirection.snapshot.canon, null, 'selecting a scene direction must not write Canon')
await assert.rejects(
  () => authorDecisionWorkflow.selectSceneAuthorDecision({
    snapshot: selectedSceneDirection.snapshot,
    decisionId: sceneAuthorDecision.decisionId,
    optionId: sceneAuthorDecision.decisionOptions.options[0].id,
    authorConfirmed: true,
  }),
  error => error instanceof CreationDecisionError && error.code === 'stale_result',
  'an already-consumed decision must not be selected twice',
)
const redecidedCandidateSearch = await authorDecisionWorkflow.searchCandidates({
  snapshot: selectedSceneDirection.snapshot,
  source: { ...contextSource, canonRevision: 0 },
})
assert.ok(
  redecidedCandidateSearch.value.candidates.some(candidate => (
    JSON.stringify(candidate.mechanismSignature)
      === JSON.stringify(sceneAuthorDecision.decisionOptions.options[0].expectedMechanismSignature)
  )),
  'candidate search must carry the author-selected mechanism into a real candidate',
)
assert.equal(
  redecidedCandidateSearch.snapshot.events.some(event => event.type === 'draft_generated'),
  false,
  're-deciding the scene mechanism must not invoke Writer or create prose',
)

const advisoryRepairRepository = new MemoryCreationDecisionRepository()
const advisoryBaseReview = repairSnapshot.reviews.find(item => item.id === repairSnapshot.session.activeReviewId)
assert.ok(advisoryBaseReview)
const advisoryRepairFinding = {
  id: 'advisory:local-repair',
  lensId: 'dialogue_subtext' as const,
  severity: 'revision_candidate' as const,
  evidence: hardBlock.evidence,
  diagnosis: '表层宣告过早消耗了人物之间尚未说破的压力。',
  readerEffectHypothesis: '推测：读者可能更早看穿人物真正意图。',
  authorTradeoff: '保留直白能提高信息清晰度，但会减少潜台词。',
  smallestExperiment: '只调整证据句，让离开的意图通过动作而不是直说呈现。',
  mappedExistingDimensions: ['voice', 'information_control'] as const,
  confidence: 'medium' as const,
  verification: 'verified' as const,
  status: 'active' as const,
}
const advisoryRepairReview: LiteraryReview = {
  ...advisoryBaseReview,
  extendedCraft: {
    schemaVersion: 'extended-craft-review.v1',
    requestedLensIds: ['dialogue_subtext'],
    findings: [advisoryRepairFinding],
    compositeLiteraryScoreUsed: false,
  },
}
await advisoryRepairRepository.saveSession(repairSnapshot.session)
for (const item of repairSnapshot.intents) await advisoryRepairRepository.saveIntent(item)
for (const item of repairSnapshot.contexts) await advisoryRepairRepository.saveContext(item)
await advisoryRepairRepository.saveCandidates(repairSnapshot.candidates)
for (const item of repairSnapshot.drafts) await advisoryRepairRepository.saveDraft(item)
await advisoryRepairRepository.saveReview(advisoryRepairReview)

let advisoryReviserCalls = 0
let advisoryAuditorCalls = 0
const advisoryRepairAgent: WritingAgentCapabilities = {
  ...referenceWritingAgent,
  async proposeRepair(input) {
    advisoryReviserCalls += 1
    assert.equal(input.finding.source, 'advisory_lens')
    return {
      ...preservedFactCandidate,
      findingId: input.finding.id,
      targetBlockId: input.targetBlock.id,
    }
  },
  async reviewRepair(input) {
    advisoryAuditorCalls += 1
    assert.equal(input.finding.source, 'advisory_lens')
    return {
      schemaVersion: 'creator-local-repair-review.v1',
      findingId: input.finding.id,
      targetBlockId: input.targetBlock.id,
      decision: 'pass',
      verifiedPreservedFactIndexes: [0],
      issues: [],
      rationale: '候选只执行局部潜台词实验，并保留原有事实和作者方向。',
    }
  },
}
const advisoryRepairWorkflow = new CreationDecisionWorkflow(advisoryRepairRepository, advisoryRepairAgent)
const advisoryRepairSnapshot = (await advisoryRepairRepository.loadSessionSnapshot(repairSnapshot.session.id))!
const advisorySourceDraft = advisoryRepairSnapshot.drafts.find(item => (
  item.draftId === advisoryRepairSnapshot.session.activeDraftId
))
assert.ok(advisorySourceDraft)
const beforeAdvisoryRepairText = advisorySourceDraft.contentBlocks.map(block => block.text).join('\n\n')
const advisoryProposal = await advisoryRepairWorkflow.proposeRepair({
  snapshot: advisoryRepairSnapshot,
  findingId: advisoryRepairFinding.id,
})
assert.equal(advisoryReviserCalls, 1)
assert.equal(advisoryAuditorCalls, 1)
assert.deepEqual(advisoryProposal.value.findingSource, {
  kind: 'advisory_lens',
  lensId: 'dialogue_subtext',
})
assert.equal(
  advisoryProposal.snapshot.drafts.find(item => item.draftId === advisorySourceDraft.draftId)?.contentBlocks.map(block => block.text).join('\n\n'),
  beforeAdvisoryRepairText,
  'showing an advisory candidate must not overwrite the manuscript',
)
const advisoryRejected = await advisoryRepairWorkflow.rejectRepair({
  snapshot: advisoryProposal.snapshot,
  repairId: advisoryProposal.value.id,
})
assert.equal(advisoryRejected.value.status, 'rejected')
assert.equal(
  advisoryRejected.snapshot.reviews
    .find(item => item.id === advisoryRepairReview.id)
    ?.extendedCraft?.findings[0]?.status,
  'active',
  'rejecting a candidate leaves the underlying advisory choice available',
)
const advisoryRejectEvent = advisoryRejected.snapshot.events.find(event => (
  event.type === 'repair_rejected' && event.payload.repairId === advisoryProposal.value.id
))
assert.ok(advisoryRejectEvent)
assert.equal(JSON.stringify(advisoryRejectEvent.payload).includes(repairedText), false)
assert.equal(JSON.stringify(advisoryRejectEvent.payload).includes(targetBlock.text), false)

const secondAdvisoryProposal = await advisoryRepairWorkflow.proposeRepair({
  snapshot: advisoryRejected.snapshot,
  findingId: advisoryRepairFinding.id,
})
const advisoryAccepted = await advisoryRepairWorkflow.acceptRepair({
  snapshot: secondAdvisoryProposal.snapshot,
  repairId: secondAdvisoryProposal.value.id,
})
assert.ok(advisoryAccepted.value.includes(repairedText))
assert.notEqual(advisoryAccepted.value, beforeAdvisoryRepairText)
assert.equal(advisoryAccepted.snapshot.session.activeReviewId, null)
assert.ok(advisoryAccepted.snapshot.reviews.every(item => item.status === 'stale'))

const deferredRepository = new MemoryCreationDecisionRepository()
await deferredRepository.saveSession(repairSnapshot.session)
for (const item of repairSnapshot.intents) await deferredRepository.saveIntent(item)
for (const item of repairSnapshot.contexts) await deferredRepository.saveContext(item)
await deferredRepository.saveCandidates(repairSnapshot.candidates)
for (const item of repairSnapshot.drafts) await deferredRepository.saveDraft(item)
await deferredRepository.saveReview(advisoryRepairReview)
const deferredWorkflow = new CreationDecisionWorkflow(deferredRepository, advisoryRepairAgent)
const deferred = await deferredWorkflow.deferAdvisoryFinding({
  snapshot: (await deferredRepository.loadSessionSnapshot(repairSnapshot.session.id))!,
  findingId: advisoryRepairFinding.id,
})
assert.equal(deferred.value.extendedCraft?.findings[0]?.status, 'deferred')
const deferredEvent = deferred.snapshot.events.find(event => event.type === 'finding_deferred')
assert.ok(deferredEvent)
assert.equal(deferredEvent.payload.reason, 'later')
assert.equal(JSON.stringify(deferredEvent.payload).includes(targetBlock.text), false)

console.log('Creator decision workflow fixture passed.')
