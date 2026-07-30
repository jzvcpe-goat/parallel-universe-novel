import assert from 'node:assert/strict'
import {
  evidenceForText,
} from '../src/features/creator-decision/literaryReview'
import {
  validateLiteraryReviewVerification,
} from '../src/features/creator-decision/literaryReviewVerification'
import type {
  DraftBlock,
  LiteraryFinding,
} from '../src/features/creator-decision/types'
import { CreationDecisionError } from '../src/features/creator-decision/types'

const blocks: DraftBlock[] = [
  {
    id: 'block:choice',
    text: '林林把最后一块干粮推给同伴。她收回空着的手，继续守住石门。',
    startOffset: 0,
    endOffset: 31,
    protected: false,
  },
  {
    id: 'block:other',
    text: '远处的钟声又响了一次。',
    startOffset: 33,
    endOffset: 45,
    protected: false,
  },
]
const evidence = evidenceForText(blocks[0], '林林把最后一块干粮推给同伴')
assert.ok(evidence)
const finding: LiteraryFinding = {
  id: 'working-agent-finding:choice-cost',
  dimension: 'character_agency',
  severity: 'revision_candidate',
  evidence: [evidence],
  expected: '人物选择应当在当前场景中造成一项可见代价。',
  observed: '当前动作已经出现，但即时限制仍不明确。',
  readerImpact: '读者难以判断主动让出资源为何重要。',
  diagnosis: '人物选择和后续压力之间需要更明确的联系。',
  repairDirection: '只补足失去补给后的即时行动限制。',
  protectedBlockIds: [],
  confidence: 'medium',
  status: 'active',
}

const baseOutput = {
  schemaVersion: 'creator-literary-review-verification.v1' as const,
  reviewId: 'review:verification',
  findings: [{
    findingId: finding.id,
    dimension: finding.dimension,
    severity: 'revision_candidate' as const,
    decision: 'verify' as const,
    evidenceQuote: '林林把最后一块干粮推给同伴',
    rationale: '同一正文位置支持人物主动让出资源，但即时行动限制仍需补足。',
  }],
  compositeLiteraryScoreUsed: false as const,
}

const verified = validateLiteraryReviewVerification({
  reviewId: baseOutput.reviewId,
  findings: [finding],
  draftBlocks: blocks,
  output: baseOutput,
})
assert.deepEqual(verified.verifiedFindings.map(item => item.id), [finding.id])
assert.deepEqual(verified.receipt.verifiedFindingIds, [finding.id])
assert.deepEqual(verified.receipt.rejectedFindingIds, [])

const rejected = validateLiteraryReviewVerification({
  reviewId: baseOutput.reviewId,
  findings: [finding],
  draftBlocks: blocks,
  output: {
    ...baseOutput,
    findings: [{
      ...baseOutput.findings[0],
      decision: 'reject',
      rationale: '该引文只证明人物做出动作，不能支持首轮声称的显著阅读问题。',
    }],
  },
})
assert.deepEqual(rejected.verifiedFindings, [])
assert.deepEqual(rejected.receipt.rejectedFindingIds, [finding.id])

assert.throws(
  () => validateLiteraryReviewVerification({
    reviewId: baseOutput.reviewId,
    findings: [finding],
    draftBlocks: blocks,
    output: {
      ...baseOutput,
      findings: [{ ...baseOutput.findings[0], dimension: 'voice' }],
    },
  }),
  error => error instanceof CreationDecisionError && error.code === 'model_output_invalid',
)

assert.throws(
  () => validateLiteraryReviewVerification({
    reviewId: baseOutput.reviewId,
    findings: [finding],
    draftBlocks: blocks,
    output: {
      ...baseOutput,
      findings: [{ ...baseOutput.findings[0], evidenceQuote: '远处的钟声' }],
    },
  }),
  error => error instanceof CreationDecisionError && error.code === 'evidence_missing',
)

console.log('[creator-literary-review-verification] PASS')
