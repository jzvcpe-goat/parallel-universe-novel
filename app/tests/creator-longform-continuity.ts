import assert from 'node:assert/strict'
import {
  longformContinuityReviewSchema,
  longformContinuityVerificationSchema,
  validateLongformContinuityReview,
  validateLongformContinuityVerification,
  type LongformContinuityChapter,
} from '../src/features/creator-decision/longformContinuity'

const chapters: LongformContinuityChapter[] = [
  {
    chapterNumber: 1,
    chapterId: 'work:test:chapter:1',
    blocks: [{ id: 'chapter-1:block-1', text: '陆沉舟把唯一的止血布留给塞文，自己带伤走出石门。' }],
  },
  {
    chapterNumber: 2,
    chapterId: 'work:test:chapter:2',
    blocks: [{ id: 'chapter-2:block-1', text: '天亮时，陆沉舟肩上的伤口仍在渗血，他不得不放慢脚步。' }],
  },
  {
    chapterNumber: 3,
    chapterId: 'work:test:chapter:3',
    blocks: [{ id: 'chapter-3:block-1', text: '塞文第一次看见那道伤，才明白止血布去了哪里。' }],
  },
]

const validReview = longformContinuityReviewSchema.parse({
  schemaVersion: 'creator-longform-continuity-review.v1',
  windowStart: 1,
  windowEnd: 3,
  inspectedTransitions: [
    { fromChapter: 1, toChapter: 2, status: 'pass', findingIndexes: [] },
    { fromChapter: 2, toChapter: 3, status: 'needs_revision', findingIndexes: [0] },
  ],
  findings: [{
    dimension: 'knowledge_boundary',
    severity: 'revision_candidate',
    fromChapter: 2,
    toChapter: 3,
    sourceEvidenceQuote: '肩上的伤口仍在渗血',
    targetEvidenceQuote: '才明白止血布去了哪里',
    expected: '后章应让塞文通过现场证据逐步获得止血布去向的信息。',
    observed: '后章直接给出完整结论，但没有展示足以确认布料去向的证据链。',
    readerImpact: '人物获得答案过快，会削弱前章选择留下的信息压力。',
    diagnosis: '后章的知识获得缺少可观察的中间证据。',
    repairTargetChapter: 3,
    repairDirection: '只在后章当前段落补一处可观察线索，并保留塞文结论的有限性。',
    confidence: 'medium',
  }],
})

assert.deepEqual(validateLongformContinuityReview({ chapters, review: validReview }), [{
  findingIndex: 0,
  sourceBlockId: 'chapter-2:block-1',
  targetBlockId: 'chapter-3:block-1',
}])

assert.throws(() => validateLongformContinuityReview({
  chapters,
  review: {
    ...validReview,
    inspectedTransitions: validReview.inspectedTransitions.slice(1),
  },
}), /did not account for every adjacent transition/)

assert.throws(() => validateLongformContinuityReview({
  chapters,
  review: {
    ...validReview,
    findings: [{ ...validReview.findings[0]!, sourceEvidenceQuote: '正文里不存在的证据' }],
  },
}), /lacks exact evidence in both manuscripts/)

assert.throws(() => validateLongformContinuityReview({
  chapters,
  review: {
    ...validReview,
    findings: [{ ...validReview.findings[0]!, repairTargetChapter: 2 }],
  },
}), /must target the later chapter/)

assert.throws(() => validateLongformContinuityReview({
  chapters,
  review: {
    ...validReview,
    inspectedTransitions: [
      validReview.inspectedTransitions[0]!,
      { ...validReview.inspectedTransitions[1]!, status: 'pass' },
    ],
  },
}), /passing transition cannot retain active findings/)

const validVerification = longformContinuityVerificationSchema.parse({
  schemaVersion: 'creator-longform-continuity-verification.v1',
  items: [{
    findingIndex: 0,
    fromChapter: 2,
    toChapter: 3,
    decision: 'verify',
    confirmedSeverity: 'watch',
    sourceEvidenceQuote: '肩上的伤口仍在渗血',
    targetEvidenceQuote: '才明白止血布去了哪里',
    diagnosis: '双章证据支持信息获得过快的问题，但影响程度应从局部修订降为观察项。',
  }],
  rationale: '逐项重读前后章后，仅确认一项低风险连续性提醒。',
})

assert.deepEqual(validateLongformContinuityVerification({
  chapters,
  findings: validReview.findings,
  verification: validVerification,
}), [{
  findingIndex: 0,
  sourceBlockId: 'chapter-2:block-1',
  targetBlockId: 'chapter-3:block-1',
}])

assert.throws(() => validateLongformContinuityVerification({
  chapters,
  findings: validReview.findings,
  verification: { ...validVerification, items: [] },
}), /did not account for every finding/)

assert.throws(() => validateLongformContinuityVerification({
  chapters,
  findings: validReview.findings,
  verification: {
    ...validVerification,
    items: [{ ...validVerification.items[0]!, confirmedSeverity: 'hard_block' }],
  },
}), /cannot escalate/)

assert.throws(() => validateLongformContinuityVerification({
  chapters,
  findings: validReview.findings,
  verification: {
    ...validVerification,
    items: [{ ...validVerification.items[0]!, sourceEvidenceQuote: '不存在的复核证据' }],
  },
}), /lacks exact evidence in both manuscripts/)

assert.throws(() => validateLongformContinuityVerification({
  chapters,
  findings: validReview.findings,
  verification: {
    ...validVerification,
    items: [{
      ...validVerification.items[0]!,
      decision: 'reject',
      confirmedSeverity: 'watch',
    }],
  },
}), /rejected continuity finding cannot retain/)

console.log('[creator-longform-continuity] PASS')
