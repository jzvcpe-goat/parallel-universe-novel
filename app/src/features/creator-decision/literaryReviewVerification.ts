import { z } from 'zod'
import {
  evidenceForDraftQuote,
  manuscriptRangeForFindingEvidence,
} from './literaryReview'
import { draftTextFromBlocks } from './sceneDrafting'
import type {
  DraftBlock,
  LiteraryFinding,
  LiteraryFindingVerificationReceipt,
} from './types'
import { CreationDecisionError } from './types'

const findingDecisionSchema = z.object({
  findingId: z.string().min(3).max(180),
  dimension: z.enum([
    'continuity',
    'tension',
    'information_control',
    'character_agency',
    'voice',
    'freshness',
    'genre_fulfillment',
    'repetition',
    'exposition',
    'scene_detail',
    'pacing',
  ]),
  severity: z.enum(['hard_block', 'revision_candidate']),
  decision: z.enum(['verify', 'reject']),
  evidenceQuote: z.string().min(2).max(180),
  rationale: z.string().min(12).max(320),
}).strict()

export const literaryReviewVerificationOutputSchema = z.object({
  schemaVersion: z.literal('creator-literary-review-verification.v1'),
  reviewId: z.string().min(3).max(180),
  findings: z.array(findingDecisionSchema).max(8),
  compositeLiteraryScoreUsed: z.literal(false),
}).strict()

export type LiteraryReviewVerificationOutput = z.infer<typeof literaryReviewVerificationOutputSchema>

export function literaryFindingEvidenceQuote(finding: LiteraryFinding, blocks: DraftBlock[]) {
  const range = manuscriptRangeForFindingEvidence(finding, blocks)
  if (!range) {
    throw new CreationDecisionError('evidence_missing', `Finding ${finding.id} has no current manuscript range.`)
  }
  return draftTextFromBlocks(blocks).slice(range.startOffset, range.endOffset)
}

export function validateLiteraryReviewVerification(input: {
  reviewId: string
  findings: LiteraryFinding[]
  draftBlocks: DraftBlock[]
  output: LiteraryReviewVerificationOutput
}): {
  verifiedFindings: LiteraryFinding[]
  receipt: LiteraryFindingVerificationReceipt
} {
  const output = literaryReviewVerificationOutputSchema.parse(input.output)
  if (output.reviewId !== input.reviewId) {
    throw new CreationDecisionError('model_output_invalid', 'The literary verification changed its review id.')
  }
  if (output.findings.length !== input.findings.length) {
    throw new CreationDecisionError('model_output_invalid', 'The literary verification must account for every actionable finding once.')
  }
  const findingById = new Map(input.findings.map(finding => [finding.id, finding]))
  if (findingById.size !== input.findings.length) {
    throw new CreationDecisionError('model_output_invalid', 'The source literary review contains duplicate finding ids.')
  }
  const seen = new Set<string>()
  for (const decision of output.findings) {
    const finding = findingById.get(decision.findingId)
    if (!finding || seen.has(decision.findingId)) {
      throw new CreationDecisionError('model_output_invalid', 'The literary verification introduced or duplicated a finding id.')
    }
    seen.add(decision.findingId)
    if (decision.dimension !== finding.dimension || decision.severity !== finding.severity) {
      throw new CreationDecisionError('model_output_invalid', 'The literary verification changed a finding dimension or severity.')
    }
    const located = evidenceForDraftQuote(input.draftBlocks, decision.evidenceQuote)
    if (!located) {
      throw new CreationDecisionError('evidence_missing', 'The literary verification evidence is not present in the current manuscript.')
    }
    const sourceBlockIds = new Set(finding.evidence.map(item => item.blockId))
    if (located.some(item => !sourceBlockIds.has(item.blockId))) {
      throw new CreationDecisionError('evidence_missing', 'The literary verification cited a different manuscript location.')
    }
  }
  const verifiedFindingIds = output.findings
    .filter(item => item.decision === 'verify')
    .map(item => item.findingId)
  const rejectedFindingIds = output.findings
    .filter(item => item.decision === 'reject')
    .map(item => item.findingId)
  const verifiedSet = new Set(verifiedFindingIds)
  return {
    verifiedFindings: input.findings.filter(finding => verifiedSet.has(finding.id)),
    receipt: {
      schemaVersion: 'literary-finding-verification-receipt.v1',
      reviewId: input.reviewId,
      reviewer: 'Auditor',
      verifiedFindingIds,
      rejectedFindingIds,
      compositeLiteraryScoreUsed: false,
    },
  }
}
