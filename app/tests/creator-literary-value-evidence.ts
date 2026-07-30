import assert from 'node:assert/strict'
import { buildLiteraryValueEvidenceReport } from '../src/features/creator-decision/literaryValueEvaluation'
import type { CanonStatePatch, CreationDecisionEvent, LiteraryReview, RepairProposal } from '../src/features/creator-decision/types'
import type { LongformContinuityReview, LongformContinuityVerification } from '../src/features/creator-decision/longformContinuity'
import type { LongRangeStoryThreadReview, LongRangeStoryThreadVerification } from '../src/features/creator-decision/longRangeStoryThreads'

function event(type: CreationDecisionEvent['type'], findingId: string, occurredAt: string, payload: Record<string, unknown> = {}): CreationDecisionEvent {
  return {
    schemaVersion: 'creation-decision-event.v1',
    id: `event:${type}:${findingId}:${occurredAt}`,
    sessionId: 'session:literary-value',
    type,
    actor: 'author',
    sourceRevision: 1,
    payload: { findingId, ...payload },
    occurredAt,
  }
}

const review = {
  schemaVersion: 'literary-review.v1',
  id: 'review:literary-value',
  sessionId: 'session:literary-value',
  contextSnapshotId: 'context:literary-value',
  contextCompilationPolicyVersion: 1,
  contextSourceFingerprint: 'source-fingerprint',
  contextSnapshotFingerprint: 'snapshot-fingerprint',
  draftId: 'draft:literary-value',
  baseCanonRevision: 1,
  baseIntentRevision: 1,
  baseCandidateRevision: 1,
  baseDraftRevision: 1,
  findings: [
    {
      id: 'finding:tension',
      dimension: 'tension',
      severity: 'revision_candidate',
      evidence: [],
      expected: '冲突应当在当前场景继续升级。',
      observed: '人物先后退，外部压力没有具体抵达。',
      readerImpact: '场景的选择压力会变弱。',
      diagnosis: '当前对抗缺少可见的即时后果。',
      repairDirection: '只补足一个造成代价的对手动作。',
      protectedBlockIds: [],
      confidence: 'medium',
      status: 'active',
    },
    {
      id: 'finding:pacing',
      dimension: 'pacing',
      severity: 'revision_candidate',
      evidence: [],
      expected: '结尾需要留下下一项具体压力。',
      observed: '结尾已经收束。',
      readerImpact: '连续阅读的牵引会变弱。',
      diagnosis: '本章结尾过早完成。',
      repairDirection: '让一个新后果在结尾抵达。',
      protectedBlockIds: [],
      confidence: 'medium',
      status: 'active',
    },
  ],
  extendedCraft: {
    schemaVersion: 'extended-craft-review.v1',
    requestedLensIds: ['dialogue_subtext'],
    findings: [{
      id: 'advisory:subtext',
      lensId: 'dialogue_subtext',
      severity: 'revision_candidate',
      evidence: [],
      diagnosis: '对白把双方的意图说得太明。',
      readerEffectHypothesis: '读者没有足够空间推断人物的隐藏目标。',
      authorTradeoff: '保留明确性会牺牲部分潜台词。',
      smallestExperiment: '只替换一句直接解释的对白。',
      mappedExistingDimensions: ['information_control'],
      confidence: 'medium',
      verification: 'verified',
      status: 'active',
    }],
    verificationReceipt: {
      schemaVersion: 'advisory-craft-verification-receipt.v1',
      reviewId: 'review:literary-value',
      reviewer: 'Auditor',
      verifiedFindingIds: ['advisory:subtext'],
      rejectedFindingIds: [],
      compositeLiteraryScoreUsed: false,
    },
    compositeLiteraryScoreUsed: false,
  },
  modelFindingVerification: {
    schemaVersion: 'literary-finding-verification-receipt.v1',
    reviewId: 'review:literary-value',
    reviewer: 'Auditor',
    verifiedFindingIds: ['finding:tension', 'finding:pacing'],
    rejectedFindingIds: [],
    compositeLiteraryScoreUsed: false,
  },
  manualRecallAdherence: {
    schemaVersion: 'manual-recall-adherence-receipt.v1',
    decision: 'pass',
    checks: [],
    reviewer: 'Auditor',
    compositeLiteraryScoreUsed: false,
  },
  requestedFocusDimensions: ['tension', 'pacing'],
  deterministicViolations: ['timeline_marker_missing'],
  status: 'current',
  createdAt: '2026-07-21T00:00:00.000Z',
} satisfies LiteraryReview

const continuityReview = {
  schemaVersion: 'creator-longform-continuity-review.v1',
  windowStart: 1,
  windowEnd: 2,
  inspectedTransitions: [{ fromChapter: 1, toChapter: 2, status: 'needs_revision', findingIndexes: [0, 1, 2] }],
  findings: [
    {
      dimension: 'voice_drift', severity: 'revision_candidate', fromChapter: 1, toChapter: 2,
      sourceEvidenceQuote: '她把账册压在灯下。', targetEvidenceQuote: '她把账册压在灯下。',
      expected: '人物在两章中保有相近的决断方式。', observed: '第二章声音明显退回泛化判断。',
      readerImpact: '人物辨识度会下降。', diagnosis: '人物声线发生跨章漂移。', repairTargetChapter: 2,
      repairDirection: '只恢复该人物已有的判断习惯。', confidence: 'high',
    },
    {
      dimension: 'character_motivation', severity: 'revision_candidate', fromChapter: 1, toChapter: 2,
      sourceEvidenceQuote: '她把账册压在灯下。', targetEvidenceQuote: '她把账册压在灯下。',
      expected: '人物目标应承接前章承担的代价。', observed: '第二章的行动没有继续回应这项代价。',
      readerImpact: '人物动机会显得断裂。', diagnosis: '人物动机发生跨章断裂。', repairTargetChapter: 2,
      repairDirection: '只补足该选择带来的即时目标。', confidence: 'high',
    },
    {
      dimension: 'timeline', severity: 'hard_block', fromChapter: 1, toChapter: 2,
      sourceEvidenceQuote: '她把账册压在灯下。', targetEvidenceQuote: '她把账册压在灯下。',
      expected: '时间推进应保持相邻章节顺序。', observed: '第二章引用了尚未发生的结果。',
      readerImpact: '因果顺序会崩坏。', diagnosis: '时间线发生矛盾。', repairTargetChapter: 2,
      repairDirection: '只把后知信息移回未知状态。', confidence: 'high',
    },
  ],
} satisfies LongformContinuityReview

const continuityVerification = {
  schemaVersion: 'creator-longform-continuity-verification.v1',
  items: continuityReview.findings.map((finding, findingIndex) => ({
    findingIndex,
    fromChapter: finding.fromChapter,
    toChapter: finding.toChapter,
    decision: 'verify' as const,
    confirmedSeverity: finding.severity,
    sourceEvidenceQuote: finding.sourceEvidenceQuote,
    targetEvidenceQuote: finding.targetEvidenceQuote,
    diagnosis: '逐字证据仍位于相邻章节中。',
  })),
  rationale: '三条跨章问题均有双端证据。',
} satisfies LongformContinuityVerification

const longRangeReview = {
  schemaVersion: 'creator-long-range-story-thread-review.v1',
  focus: 'promise_arc',
  fromChapter: 1,
  toChapter: 3,
  inspectedChapterNumbers: [1, 2, 3],
  inspectedDimensions: ['promise', 'foreshadowing', 'character_arc'],
  threads: [],
  findings: [{
    threadId: 'thread:bell', dimension: 'foreshadowing', severity: 'revision_candidate', sourceChapter: 1, targetChapter: 3,
    sourceEvidenceQuote: '铜铃在雨夜响。', targetEvidenceQuote: '铜铃在雨夜响。',
    expected: '已建立的铜铃承诺应在第三章发生变化。', observed: '第三章重复展示铜铃但没有推进。',
    readerImpact: '伏笔会显得停滞。', diagnosis: '伏笔没有兑现或推进。', repairTargetChapter: 3,
    repairDirection: '只让铜铃带来一个新的可见后果。', confidence: 'high',
  }],
} satisfies LongRangeStoryThreadReview

const longRangeVerification = {
  schemaVersion: 'creator-long-range-story-thread-verification.v1',
  focus: 'promise_arc',
  threadItems: [],
  findingItems: [{
    findingIndex: 0, threadId: 'thread:bell', decision: 'verify' as const,
    confirmedSeverity: 'revision_candidate' as const,
    sourceEvidenceQuote: '铜铃在雨夜响。', targetEvidenceQuote: '铜铃在雨夜响。',
    rationale: '双端文本支持伏笔没有推进。',
  }],
  rationale: '只验证已定位的长程 finding。',
} satisfies LongRangeStoryThreadVerification

const repairs: RepairProposal[] = [
  { schemaVersion: 'repair-proposal.v1', id: 'repair:accepted', reviewId: review.id, findingId: 'finding:tension', baseDraftRevision: 1, operation: 'replace_range', targetBlockIds: ['block:1'], preservedFacts: [], preservedBlockIds: [], proposedContent: '候选', status: 'accepted' },
  { schemaVersion: 'repair-proposal.v1', id: 'repair:rejected', reviewId: review.id, findingId: 'advisory:subtext', findingSource: { kind: 'advisory_lens', lensId: 'dialogue_subtext' }, baseDraftRevision: 1, operation: 'replace_range', targetBlockIds: ['block:2'], preservedFacts: [], preservedBlockIds: [], proposedContent: '候选', status: 'rejected' },
  { schemaVersion: 'repair-proposal.v1', id: 'repair:stale', reviewId: review.id, findingId: 'finding:pacing', baseDraftRevision: 1, operation: 'replace_range', targetBlockIds: ['block:3'], preservedFacts: [], preservedBlockIds: [], proposedContent: '候选', status: 'stale' },
]

const patch = {
  schemaVersion: 'canon-state-patch.v1', id: 'patch:goals', sessionId: review.sessionId, workId: 'work:test', chapterId: 'chapter:2',
  baseCanonRevision: 1, sourceDraftRevision: 1, status: 'committed', createdAt: '2026-07-21T00:00:00.000Z',
  operations: [{ op: 'add', path: '/characters/hero/currentIntent', value: '守住账册', evidenceBlockIds: ['block:1'], reason: '正文证据', irreversible: false }],
} satisfies CanonStatePatch

const report = buildLiteraryValueEvidenceReport({
  reviews: [review],
  repairs,
  canonPatches: [patch],
  continuityRuns: [{ review: continuityReview, verification: continuityVerification }],
  longRangeRuns: [{ review: longRangeReview, verification: longRangeVerification }],
  campaignReceipts: [
    {
      kind: 'adjacent_continuity',
      receiptSha256: 'a'.repeat(64),
      fromChapter: 1,
      toChapter: 20,
      independentlyVerified: true,
      privateTextCopiedIntoReceipt: false,
      verifiedFindingCounts: { setting_consistency: 1 },
      verifiedThreadCounts: {},
    },
    {
      kind: 'long_range_threads',
      receiptSha256: 'b'.repeat(64),
      fromChapter: 1,
      toChapter: 20,
      independentlyVerified: true,
      privateTextCopiedIntoReceipt: false,
      verifiedFindingCounts: { foreshadowing: 2 },
      verifiedThreadCounts: { foreshadowing: 2 },
    },
  ],
  constraintSignals: [
    { kind: 'kernel', outcome: 'violation', verified: true, sourceId: 'kernel:1' },
    { kind: 'constraint', outcome: 'pass', verified: true, sourceId: 'constraint:1' },
  ],
  authorTrustSignals: [{ rating: 4, reasonCode: 'clear_local_control' }],
  events: [
    event('finding_deferred', 'advisory:subtext', '2026-07-21T00:00:00.000Z', { reason: 'later' }),
    event('finding_dismissed', 'advisory:subtext', '2026-07-21T00:01:00.000Z', { reason: 'keep_original' }),
    event('finding_accepted', 'finding:tension', '2026-07-21T00:02:00.000Z', { reason: 'adopt_local_repair' }),
    event('repair_rejected', 'finding:pacing', '2026-07-21T00:03:00.000Z', { reason: 'reject_local_repair' }),
  ],
})

assert.equal(report.reviewEvidence.verifiedProductFindingCount, 2)
assert.equal(report.reviewEvidence.verifiedAdvisoryFindingCount, 1)
assert.equal(report.campaignEvidence.receiptCount, 2)
assert.equal(report.campaignEvidence.adjacentContinuity.independentlyVerifiedFindingCount, 1)
assert.equal(report.campaignEvidence.longRangeThreads.independentlyVerifiedThreadCount, 2)
assert.equal(report.character.personalityDrift.coverage, 'measured')
assert.equal(report.character.personalityDrift.verifiedSignalCount, 1)
assert.equal(report.character.relationshipInconsistency.coverage, 'not_measured')
assert.equal(report.character.characterGoalChanges.signalCount, 1)
assert.equal(report.worldAndCanon.kernelViolations.verifiedSignalCount, 1)
assert.equal(report.worldAndCanon.timelineContradictions.verifiedSignalCount, 1)
assert.equal(report.narrative.conflictEscalation.verifiedSignalCount, 1)
assert.equal(report.narrative.foreshadowPayoff.verifiedSignalCount, 3)
assert.equal(report.authorWorkflow.decisions.adopt, 1)
assert.equal(report.authorWorkflow.decisions.keepOriginal, 1)
assert.equal(report.authorWorkflow.decisions.reject, 1)
assert.equal(report.authorWorkflow.decisions.later, 0, 'latest decision per finding wins')
assert.equal(report.authorWorkflow.decisions.acceptanceRate, 1 / 3)
assert.equal(report.authorWorkflow.boundedRepair.acceptanceRate, 1 / 2)
assert.equal(report.authorWorkflow.trust.coverage, 'measured')
assert.equal(report.claimBoundary.compositeLiteraryScoreUsed, false)
assert.equal(report.claimBoundary.stableLiteraryQualityImprovementProven, false)

const empty = buildLiteraryValueEvidenceReport({ reviews: [], repairs: [], events: [] })
assert.equal(empty.authorWorkflow.trust.coverage, 'not_measured')
assert.equal(empty.character.relationshipInconsistency.coverage, 'not_measured')
assert.equal(empty.authorWorkflow.decisions.acceptanceRate, null)

console.log('[creator-literary-value-evidence] PASS')
