import { z } from 'zod'
import { evidenceForDraftQuote } from './literaryReview'
import type {
  AdvisoryCraftFinding,
  AdvisoryCraftVerificationReceipt,
  DraftBlock,
} from './types'
import { CreationDecisionError } from './types'

const p0bAdvisoryLensSchema = z.enum([
  'pov_focalization',
  'dialogue_subtext',
  'prose_rhythm',
  'ending_payoff',
])

export const advisoryCraftVerificationOutputSchema = z.object({
  schemaVersion: z.literal('creator-advisory-craft-verification.v1'),
  reviewId: z.string().min(3).max(180),
  findings: z.array(z.object({
    findingId: z.string().min(3).max(180),
    lensId: p0bAdvisoryLensSchema,
    severity: z.literal('revision_candidate'),
    decision: z.enum(['verify', 'reject']),
    evidenceQuote: z.string().min(2).max(180),
    rationale: z.string().min(12).max(320),
  }).strict()).max(8),
  compositeLiteraryScoreUsed: z.literal(false),
}).strict()

function sameEvidenceLocation(
  left: AdvisoryCraftFinding['evidence'],
  right: AdvisoryCraftFinding['evidence'],
) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function advisoryCraftFindingEvidenceQuote(
  finding: AdvisoryCraftFinding,
  draftBlocks: DraftBlock[],
) {
  return finding.evidence.map(evidence => {
    const block = draftBlocks.find(item => item.id === evidence.blockId)
    if (!block) return ''
    return block.text.slice(evidence.startOffset, evidence.endOffset)
  }).join('\n\n')
}

export function validateAdvisoryCraftVerification(input: {
  reviewId: string
  findings: AdvisoryCraftFinding[]
  draftBlocks: DraftBlock[]
  output: z.infer<typeof advisoryCraftVerificationOutputSchema>
}): {
  findings: AdvisoryCraftFinding[]
  receipt: AdvisoryCraftVerificationReceipt
} {
  const output = advisoryCraftVerificationOutputSchema.parse(input.output)
  if (output.reviewId !== input.reviewId) {
    throw new CreationDecisionError('model_output_invalid', 'The advisory verification changed its review id.')
  }
  if (output.findings.length !== input.findings.length) {
    throw new CreationDecisionError('model_output_invalid', 'The advisory verification must account for every revision candidate once.')
  }

  const inputById = new Map(input.findings.map(finding => [finding.id, finding]))
  const seen = new Set<string>()
  const decisionById = new Map<string, 'verify' | 'reject'>()
  for (const item of output.findings) {
    const finding = inputById.get(item.findingId)
    if (!finding || seen.has(item.findingId)) {
      throw new CreationDecisionError('model_output_invalid', 'The advisory verification introduced or duplicated a finding id.')
    }
    seen.add(item.findingId)
    if (finding.lensId !== item.lensId || finding.severity !== item.severity) {
      throw new CreationDecisionError('model_output_invalid', 'The advisory verification changed a lens or severity.')
    }
    const located = evidenceForDraftQuote(input.draftBlocks, item.evidenceQuote)
    if (!located) {
      throw new CreationDecisionError('evidence_missing', 'The advisory verification evidence is not present in the current manuscript.')
    }
    if (!sameEvidenceLocation(finding.evidence, located)) {
      throw new CreationDecisionError('evidence_missing', 'The advisory verification cited a different manuscript location.')
    }
    decisionById.set(item.findingId, item.decision)
  }

  const verifiedFindingIds = input.findings
    .filter(finding => decisionById.get(finding.id) === 'verify')
    .map(finding => finding.id)
  const rejectedFindingIds = input.findings
    .filter(finding => decisionById.get(finding.id) === 'reject')
    .map(finding => finding.id)
  return {
    findings: input.findings.map(finding => decisionById.get(finding.id) === 'verify'
      ? { ...finding, verification: 'verified' as const }
      : { ...finding, verification: 'rejected' as const, status: 'dismissed' as const }),
    receipt: {
      schemaVersion: 'advisory-craft-verification-receipt.v1',
      reviewId: input.reviewId,
      reviewer: 'Auditor',
      verifiedFindingIds,
      rejectedFindingIds,
      compositeLiteraryScoreUsed: false,
    },
  }
}
