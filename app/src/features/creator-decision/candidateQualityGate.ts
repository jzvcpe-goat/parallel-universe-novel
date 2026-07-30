import { excerptHash } from './literaryReview'
import {
  CONTEXT_COMPILATION_POLICY_VERSION,
  contextSnapshotIntegrityIsCurrent,
  contextSnapshotFingerprint,
} from './contextCompiler'
import type {
  AuthorIntentContract,
  ContextSnapshot,
  CreationSession,
  LiteraryEvidence,
  LiteraryReview,
  RepairProposal,
  SceneDraftResult,
  SceneMechanismAxis,
} from './types'
import { CreationDecisionError } from './types'

export type CandidateQualityBlockerCode =
  | 'intent_not_locked'
  | 'intent_revision_mismatch'
  | 'draft_revision_mismatch'
  | 'context_not_current'
  | 'review_not_current'
  | 'active_hard_block'
  | 'active_revision_candidate'
  | 'deterministic_violation'
  | 'pending_repair_decision'
  | 'direction_receipt_missing'
  | 'direction_receipt_axis_mismatch'
  | 'direction_receipt_evidence_invalid'
  | 'direction_adjustment_evidence_invalid'
  | 'manual_recall_receipt_missing'
  | 'manual_recall_receipt_mismatch'
  | 'manual_recall_receipt_rejected'
  | 'manual_recall_receipt_evidence_invalid'

export interface CandidateQualityBlocker {
  code: CandidateQualityBlockerCode
  count: number
}

export interface CandidateQualityGate {
  allowed: boolean
  blockers: CandidateQualityBlocker[]
}

const sceneMechanismAxes: SceneMechanismAxis[] = [
  'pressureSource',
  'conflictEngine',
  'agencyPattern',
  'costPattern',
  'endingPattern',
]

function evidenceIsCurrent(evidence: LiteraryEvidence, draft: SceneDraftResult) {
  const block = draft.contentBlocks.find(item => item.id === evidence.blockId)
  if (!block) return false
  if (evidence.startOffset < 0 || evidence.endOffset > block.text.length) return false
  if (evidence.endOffset <= evidence.startOffset) return false
  return excerptHash(block.text.slice(evidence.startOffset, evidence.endOffset)) === evidence.excerptHash
}

export function evaluateCandidateQualityGate(input: {
  session: CreationSession
  intent: AuthorIntentContract
  context: ContextSnapshot
  draft: SceneDraftResult
  review: LiteraryReview
  repairs: RepairProposal[]
}): CandidateQualityGate {
  const blockers: CandidateQualityBlocker[] = []
  if (input.intent.status !== 'locked' || input.session.lockedIntentId !== input.intent.id) {
    blockers.push({ code: 'intent_not_locked', count: 1 })
  }
  if (
    input.session.currentIntentRevision !== input.intent.revision
    || input.draft.baseIntentRevision !== input.intent.revision
  ) {
    blockers.push({ code: 'intent_revision_mismatch', count: 1 })
  }
  if (
    input.draft.status !== 'current'
    || input.session.activeDraftId !== input.draft.draftId
    || input.session.currentDraftRevision !== input.draft.revision
  ) {
    blockers.push({ code: 'draft_revision_mismatch', count: 1 })
  }
  if (
    input.context.status !== 'active'
    || input.context.sessionId !== input.session.id
    || input.context.workId !== input.session.workId
    || input.context.chapterId !== input.session.chapterId
    || input.context.intentRevision !== input.intent.revision
    || input.context.canonRevision !== input.session.baseCanonRevision
    || input.context.compilationPolicyVersion !== CONTEXT_COMPILATION_POLICY_VERSION
    || !contextSnapshotIntegrityIsCurrent(input.context)
  ) {
    blockers.push({ code: 'context_not_current', count: 1 })
  }
  if (
    input.review.status !== 'active'
    || input.session.activeReviewId !== input.review.id
    || input.review.sessionId !== input.session.id
    || input.review.contextSnapshotId !== input.context.id
    || input.review.contextCompilationPolicyVersion !== input.context.compilationPolicyVersion
    || input.review.contextSourceFingerprint !== input.context.sourceFingerprint
    || input.review.contextSnapshotFingerprint !== contextSnapshotFingerprint(input.context)
    || input.review.draftId !== input.draft.draftId
    || input.review.baseDraftRevision !== input.draft.revision
    || input.review.baseIntentRevision !== input.intent.revision
  ) {
    blockers.push({ code: 'review_not_current', count: 1 })
  }

  const activeHardBlockCount = input.review.findings.filter(finding => (
    finding.status === 'active' && finding.severity === 'hard_block'
  )).length
  if (activeHardBlockCount) blockers.push({ code: 'active_hard_block', count: activeHardBlockCount })
  const activeRevisionCandidateCount = input.review.findings.filter(finding => (
    finding.status === 'active' && finding.severity === 'revision_candidate'
  )).length
  if (activeRevisionCandidateCount) {
    blockers.push({ code: 'active_revision_candidate', count: activeRevisionCandidateCount })
  }
  if (input.review.deterministicViolations.length) {
    blockers.push({ code: 'deterministic_violation', count: input.review.deterministicViolations.length })
  }

  const selectedRecalls = input.context.manualRecallItems
  const recallReceipt = input.review.manualRecallAdherence
  if (selectedRecalls.length > 0 && !recallReceipt) {
    blockers.push({ code: 'manual_recall_receipt_missing', count: selectedRecalls.length })
  } else if (recallReceipt) {
    const receiptMatchesSelection = selectedRecalls.length === recallReceipt.checks.length
      && new Set(recallReceipt.checks.map(check => check.sourceId)).size === recallReceipt.checks.length
      && recallReceipt.checks.every((check, index) => (
        check.sourceId === selectedRecalls[index]?.sourceId
        && check.group === selectedRecalls[index]?.group
      ))
    if (!receiptMatchesSelection) {
      blockers.push({ code: 'manual_recall_receipt_mismatch', count: 1 })
    }
    const rejectedChecks = recallReceipt.checks.filter(check => (
      check.status === 'violated' || check.status === 'omitted'
    ))
    if (recallReceipt.decision !== 'pass' || rejectedChecks.length > 0) {
      blockers.push({
        code: 'manual_recall_receipt_rejected',
        count: Math.max(1, rejectedChecks.length),
      })
    }
    const invalidRecallEvidenceCount = recallReceipt.checks.filter(check => (
      check.status !== 'omitted'
      && (
        check.evidence.length === 0
        || check.evidence.some(item => !evidenceIsCurrent(item, input.draft))
      )
    )).length
    if (invalidRecallEvidenceCount) {
      blockers.push({
        code: 'manual_recall_receipt_evidence_invalid',
        count: invalidRecallEvidenceCount,
      })
    }
  }
  const pendingRepairCount = input.repairs.filter(repair => (
    repair.status === 'proposed'
    && repair.findingSource?.kind !== 'advisory_lens'
    && repair.reviewId === input.review.id
    && repair.baseDraftRevision === input.draft.revision
  )).length
  if (pendingRepairCount) {
    blockers.push({ code: 'pending_repair_decision', count: pendingRepairCount })
  }

  const direction = input.intent.sceneMechanismDirection
  if (direction) {
    const receipt = input.draft.directionReceipt
    if (!receipt) {
      blockers.push({ code: 'direction_receipt_missing', count: 1 })
    } else {
      const expected = direction.expectedMechanismSignature
      const checksByAxis = new Map(receipt.axisChecks.map(check => [check.axis, check]))
      const invalidAxes = sceneMechanismAxes.filter(axis => {
        const check = checksByAxis.get(axis)
        return !check || check.expectedValue !== expected[axis]
      })
      if (checksByAxis.size !== sceneMechanismAxes.length || invalidAxes.length) {
        blockers.push({
          code: 'direction_receipt_axis_mismatch',
          count: Math.max(1, invalidAxes.length),
        })
      }
      const invalidAxisEvidenceCount = receipt.axisChecks.filter(check => (
        check.evidence.length === 0
        || check.evidence.some(evidence => !evidenceIsCurrent(evidence, input.draft))
      )).length
      if (invalidAxisEvidenceCount) {
        blockers.push({ code: 'direction_receipt_evidence_invalid', count: invalidAxisEvidenceCount })
      }
      if (
        receipt.proposedAdjustmentEvidence.length === 0
        || receipt.proposedAdjustmentEvidence.some(evidence => !evidenceIsCurrent(evidence, input.draft))
      ) {
        blockers.push({ code: 'direction_adjustment_evidence_invalid', count: 1 })
      }
    }
  }

  return { allowed: blockers.length === 0, blockers }
}

export function assertCandidateQualityGate(input: {
  session: CreationSession
  intent: AuthorIntentContract
  context: ContextSnapshot
  draft: SceneDraftResult
  review: LiteraryReview
  repairs: RepairProposal[]
}) {
  const gate = evaluateCandidateQualityGate(input)
  if (gate.allowed) return gate
  const staleCodes = new Set<CandidateQualityBlockerCode>([
    'intent_not_locked',
    'intent_revision_mismatch',
    'draft_revision_mismatch',
    'context_not_current',
    'review_not_current',
  ])
  const code = gate.blockers.some(blocker => staleCodes.has(blocker.code))
    ? 'stale_result'
    : gate.blockers.some(blocker => blocker.code.includes('evidence_invalid'))
      ? 'evidence_missing'
      : 'hard_block_unresolved'
  throw new CreationDecisionError(
    code,
    `The current writing candidate has unresolved quality blockers: ${gate.blockers.map(item => item.code).join(', ')}.`,
    { blockers: gate.blockers },
  )
}
