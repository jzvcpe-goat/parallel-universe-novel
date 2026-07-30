import type {
  AdvisoryCraftFinding,
  LiteraryFinding,
  LiteraryReview,
  LocalRepairFinding,
  RepairProposal,
} from './types'
import { CreationDecisionError } from './types'
import {
  validateAdvisoryFindingEvidence,
  validateFindingEvidence,
} from './literaryReview'

export function literaryFindingToLocalRepairFinding(
  finding: LiteraryFinding,
): LocalRepairFinding {
  return {
    source: 'existing_product',
    id: finding.id,
    dimension: finding.dimension,
    severity: finding.severity,
    evidence: finding.evidence,
    diagnosis: finding.diagnosis,
    repairDirection: finding.repairDirection,
    protectedBlockIds: finding.protectedBlockIds,
    confidence: finding.confidence,
  }
}

export function advisoryCraftFindingToLocalRepairFinding(
  finding: AdvisoryCraftFinding,
): LocalRepairFinding {
  if (
    finding.status !== 'active'
    || finding.severity !== 'revision_candidate'
    || finding.verification !== 'verified'
  ) {
    throw new CreationDecisionError(
      'evidence_missing',
      'Only a verified active writing suggestion can request a local repair candidate.',
    )
  }
  return {
    source: 'advisory_lens',
    id: finding.id,
    lensId: finding.lensId,
    mappedExistingDimensions: finding.mappedExistingDimensions,
    severity: 'revision_candidate',
    evidence: finding.evidence,
    diagnosis: finding.diagnosis,
    repairDirection: finding.smallestExperiment,
    protectedBlockIds: [],
    confidence: finding.confidence,
  }
}

export function resolveLocalRepairFinding(input: {
  review: LiteraryReview
  findingId: string
  findingSource?: RepairProposal['findingSource']
}): LocalRepairFinding {
  if (input.findingSource?.kind !== 'advisory_lens') {
    const literaryFinding = input.review.findings.find(item => (
      item.id === input.findingId && item.status === 'active'
    ))
    if (literaryFinding) return literaryFindingToLocalRepairFinding(literaryFinding)
  }

  const advisoryFinding = input.review.extendedCraft?.findings.find(item => (
    item.id === input.findingId && item.status === 'active'
  ))
  if (advisoryFinding) return advisoryCraftFindingToLocalRepairFinding(advisoryFinding)

  throw new CreationDecisionError('evidence_missing', 'The selected writing finding is no longer active.')
}

export function localRepairFindingEvidenceIsCurrent(
  finding: LocalRepairFinding,
  review: LiteraryReview,
  blocks: Parameters<typeof validateFindingEvidence>[1],
) {
  if (finding.source === 'existing_product') {
    const source = review.findings.find(item => item.id === finding.id)
    return Boolean(source && validateFindingEvidence(source, blocks))
  }
  const source = review.extendedCraft?.findings.find(item => item.id === finding.id)
  return Boolean(source && validateAdvisoryFindingEvidence(source, blocks))
}

export function repairProposalFindingSource(
  finding: LocalRepairFinding,
): NonNullable<RepairProposal['findingSource']> {
  return finding.source === 'advisory_lens'
    ? { kind: 'advisory_lens', lensId: finding.lensId }
    : { kind: 'existing_product', dimension: finding.dimension }
}
