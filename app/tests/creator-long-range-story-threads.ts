import assert from 'node:assert/strict'
import {
  validateLongRangeStoryThreadReview,
  validateLongRangeStoryThreadRevision,
  validateLongRangeStoryThreadVerification,
  type LongRangeStoryThreadReview,
  type LongRangeStoryThreadVerification,
} from '../src/features/creator-decision/longRangeStoryThreads'
import type { LongformContinuityChapter } from '../src/features/creator-decision/longformContinuity'

const chapters: LongformContinuityChapter[] = [
  {
    chapterNumber: 1,
    chapterId: 'chapter:1',
    blocks: [
      { id: 'chapter:1:block:1', text: '林澈独自认出了黑色印记，却没有把这件事告诉穆笙。' },
      { id: 'chapter:1:block:2', text: '他答应在进入赫顿玛尔前，把受伤的少年送回营地。' },
    ],
  },
  {
    chapterNumber: 2,
    chapterId: 'chapter:2',
    blocks: [
      { id: 'chapter:2:block:1', text: '第二天清晨，队伍仍停在洛兰边缘的废弃磨坊。' },
    ],
  },
  {
    chapterNumber: 3,
    chapterId: 'chapter:3',
    blocks: [
      { id: 'chapter:3:block:1', text: '穆笙看见黑色印记时毫不意外，说自己早已知道它来自帝国。' },
    ],
  },
  {
    chapterNumber: 4,
    chapterId: 'chapter:4',
    blocks: [
      { id: 'chapter:4:block:1', text: '林澈把受伤的少年交给营地医师，才转身踏上通往赫顿玛尔的路。' },
    ],
  },
]

const review: LongRangeStoryThreadReview = {
  schemaVersion: 'creator-long-range-story-thread-review.v1',
  focus: 'causal_state',
  fromChapter: 1,
  toChapter: 4,
  inspectedChapterNumbers: [1, 2, 3, 4],
  inspectedDimensions: ['causal_debt', 'character_knowledge', 'timeline_anchor'],
  threads: [
    {
      threadId: 'knowledge:black-mark',
      dimension: 'character_knowledge',
      label: '黑色印记的知情边界',
      statement: '穆笙在获得来源信息前不应知道黑色印记的来历。',
      sourceChapter: 1,
      sourceEvidenceQuote: '却没有把这件事告诉穆笙',
      status: 'broken',
      latestEvidence: {
        chapter: 3,
        quote: '说自己早已知道它来自帝国',
        meaning: '穆笙无获得过程便直接说出来源。',
      },
      involvedCharacters: ['林澈', '穆笙'],
      whyItMatters: '知识越级会让调查过程与人物判断失去可信度。',
      confidence: 'high',
    },
    {
      threadId: 'causal:escort-boy',
      dimension: 'causal_debt',
      label: '护送伤员',
      statement: '林澈必须先把受伤少年交还营地，才能前往赫顿玛尔。',
      sourceChapter: 1,
      sourceEvidenceQuote: '把受伤的少年送回营地',
      status: 'fulfilled',
      latestEvidence: {
        chapter: 4,
        quote: '把受伤的少年交给营地医师',
        meaning: '此前的护送责任已经在行动中兑现。',
      },
      involvedCharacters: ['林澈'],
      whyItMatters: '已承担的责任必须先兑现，后续行动才有因果基础。',
      confidence: 'high',
    },
    {
      threadId: 'timeline:lorien-mill',
      dimension: 'timeline_anchor',
      label: '洛兰磨坊时空锚点',
      statement: '队伍在第二天清晨仍位于洛兰边缘磨坊。',
      sourceChapter: 2,
      sourceEvidenceQuote: '第二天清晨，队伍仍停在洛兰边缘的废弃磨坊',
      status: 'active',
      latestEvidence: null,
      involvedCharacters: [],
      whyItMatters: '后续移动需要从这个明确时空位置开始计算。',
      confidence: 'medium',
    },
  ],
  findings: [
    {
      threadId: 'knowledge:black-mark',
      dimension: 'character_knowledge',
      severity: 'hard_block',
      sourceChapter: 1,
      targetChapter: 3,
      sourceEvidenceQuote: '却没有把这件事告诉穆笙',
      targetEvidenceQuote: '说自己早已知道它来自帝国',
      expected: '穆笙应先通过可见行动或他人告知获得黑色印记来源。',
      observed: '第三章让穆笙直接掌握第一章明确未告知的信息。',
      readerImpact: '人物知识来源断裂，会破坏调查悬念和角色可信度。',
      diagnosis: '第一章建立的知情边界在非相邻章节中被无过程突破。',
      repairTargetChapter: 3,
      repairDirection: '只在第三章目标块补足信息获得过程或保留穆笙的不确定判断。',
      confidence: 'high',
    },
  ],
}

const located = validateLongRangeStoryThreadReview({ chapters, focus: 'causal_state', review })
assert.equal(located.locatedThreads.length, 3)
assert.equal(located.locatedFindings.length, 1)
assert.equal(located.locatedFindings[0]?.sourceBlockId, 'chapter:1:block:1')
assert.equal(located.locatedFindings[0]?.targetBlockId, 'chapter:3:block:1')

const verification: LongRangeStoryThreadVerification = {
  schemaVersion: 'creator-long-range-story-thread-verification.v1',
  focus: 'causal_state',
  threadItems: review.threads.map(thread => ({
    threadId: thread.threadId,
    decision: 'verify' as const,
    confirmedStatus: thread.status,
    sourceEvidenceQuote: thread.sourceEvidenceQuote,
    latestEvidenceQuote: thread.latestEvidence?.quote ?? null,
    rationale: '逐章证据支持该线程的来源、当前状态与边界。',
  })),
  findingItems: [{
    findingIndex: 0,
    threadId: 'knowledge:black-mark',
    decision: 'verify',
    confirmedSeverity: 'hard_block',
    sourceEvidenceQuote: '没有把这件事告诉穆笙',
    targetEvidenceQuote: '早已知道它来自帝国',
    rationale: '前章明确未告知，后章却没有获得过程便持有确定知识。',
  }],
  rationale: '全部线程与问题均已独立回到原始章节证据复核。',
}

const verified = validateLongRangeStoryThreadVerification({ chapters, review, verification })
assert.equal(verified.locatedThreads.length, 3)
assert.equal(verified.locatedFindings.length, 1)

const verificationWithRejectedActiveThread = structuredClone(verification)
verificationWithRejectedActiveThread.threadItems[2]!.decision = 'reject'
verificationWithRejectedActiveThread.threadItems[2]!.confirmedStatus = null
verificationWithRejectedActiveThread.threadItems[2]!.rationale = '第四章已经给出后续位置，因此不能继续标为 source-only active。'
const revisedReview = structuredClone(review)
revisedReview.threads[2]!.status = 'progressed'
revisedReview.threads[2]!.latestEvidence = {
  chapter: 4,
  quote: '踏上通往赫顿玛尔的路',
  meaning: '队伍已经离开此前的洛兰磨坊时空锚点。',
}
revisedReview.threads[2]!.confidence = 'high'
const revised = validateLongRangeStoryThreadRevision({
  chapters,
  previousReview: review,
  previousVerification: verificationWithRejectedActiveThread,
  revisedReview,
})
assert.equal(revised.locatedThreads.length, 3)

function expectInvalid(action: () => unknown, message: string) {
  assert.throws(action, undefined, message)
}

const incompleteCoverage = structuredClone(review)
incompleteCoverage.inspectedChapterNumbers = [1, 2, 4]
expectInvalid(
  () => validateLongRangeStoryThreadReview({ chapters, focus: 'causal_state', review: incompleteCoverage }),
  'a thread scan cannot skip a chapter',
)

const highConfidenceActive = structuredClone(review)
highConfidenceActive.threads[2]!.confidence = 'high'
expectInvalid(
  () => validateLongRangeStoryThreadReview({ chapters, focus: 'causal_state', review: highConfidenceActive }),
  'an absence-based active status cannot claim high confidence',
)

const adjacentFinding = structuredClone(review)
adjacentFinding.threads[0]!.latestEvidence = {
  chapter: 2,
  quote: '第二天清晨',
  meaning: '错误地把相邻章节当成长程证据。',
}
adjacentFinding.findings[0]!.targetChapter = 2
adjacentFinding.findings[0]!.repairTargetChapter = 2
adjacentFinding.findings[0]!.targetEvidenceQuote = '第二天清晨'
expectInvalid(
  () => validateLongRangeStoryThreadReview({ chapters, focus: 'causal_state', review: adjacentFinding }),
  'a long-range finding must skip at least one chapter',
)

const missingThreadVerification = structuredClone(verification)
missingThreadVerification.threadItems.pop()
expectInvalid(
  () => validateLongRangeStoryThreadVerification({ chapters, review, verification: missingThreadVerification }),
  'independent verification must account for every thread',
)

const rejectedThreadWithFinding = structuredClone(verification)
rejectedThreadWithFinding.threadItems[0]!.decision = 'reject'
rejectedThreadWithFinding.threadItems[0]!.confirmedStatus = null
expectInvalid(
  () => validateLongRangeStoryThreadVerification({ chapters, review, verification: rejectedThreadWithFinding }),
  'a rejected thread cannot retain a verified finding',
)

const revisionChangedVerifiedThread = structuredClone(revisedReview)
revisionChangedVerifiedThread.threads[1]!.label = '擅自改动已通过线程'
expectInvalid(
  () => validateLongRangeStoryThreadRevision({
    chapters,
    previousReview: review,
    previousVerification: verificationWithRejectedActiveThread,
    revisedReview: revisionChangedVerifiedThread,
  }),
  'a semantic revision cannot rewrite an independently verified thread',
)

process.stdout.write('creator long-range story-thread tests passed\n')
