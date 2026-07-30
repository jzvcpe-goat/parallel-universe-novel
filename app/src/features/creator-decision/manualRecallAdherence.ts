import { evidenceForDraftQuote } from './literaryReview'
import type {
  DraftBlock,
  ManualRecallAdherenceReceipt,
  ManualRecallAdherenceReview,
  ManualRecallItem,
} from './types'
import { CreationDecisionError } from './types'

export function createManualRecallAdherenceReceipt(input: {
  review: ManualRecallAdherenceReview
  selectedRecallItems: ManualRecallItem[]
  draftBlocks: DraftBlock[]
}): ManualRecallAdherenceReceipt {
  const expected = input.selectedRecallItems
  const checks = input.review.checks
  if (expected.length === 0) {
    throw new CreationDecisionError(
      'model_output_invalid',
      'Manual recall adherence review requires at least one author-selected recall item.',
    )
  }
  if (checks.length !== expected.length) {
    throw new CreationDecisionError(
      'model_output_invalid',
      'Manual recall adherence review did not cover every selected recall item exactly once.',
    )
  }
  if (new Set(checks.map(check => check.sourceId)).size !== checks.length) {
    throw new CreationDecisionError(
      'model_output_invalid',
      'Manual recall adherence review contains duplicate source IDs.',
    )
  }

  const receiptChecks = checks.map((check, index) => {
    const recall = expected[index]
    if (!recall || check.sourceId !== recall.sourceId || check.group !== recall.group) {
      throw new CreationDecisionError(
        'model_output_invalid',
        'Manual recall adherence review changed the selected source order or recall group.',
      )
    }
    if (check.status !== 'omitted' && check.evidenceQuotes.length === 0) {
      throw new CreationDecisionError(
        'evidence_missing',
        `Manual recall ${check.sourceId} has no locatable manuscript evidence.`,
      )
    }
    const evidence = check.evidenceQuotes.flatMap(quote => {
      const located = evidenceForDraftQuote(input.draftBlocks, quote)
      if (!located) {
        throw new CreationDecisionError(
          'evidence_missing',
          `Manual recall ${check.sourceId} cites text that is not present in the candidate manuscript.`,
        )
      }
      return located
    })
    return {
      sourceId: check.sourceId,
      group: check.group,
      status: check.status,
      evidence,
      diagnosis: check.diagnosis,
    }
  })

  const rejected = receiptChecks.some(check => (
    check.status === 'violated' || check.status === 'omitted'
  ))
  if (input.review.decision !== (rejected ? 'reject' : 'pass')) {
    throw new CreationDecisionError(
      'model_output_invalid',
      'Manual recall adherence top-level decision contradicts its per-source checks.',
    )
  }

  return {
    schemaVersion: 'manual-recall-adherence-receipt.v1',
    decision: input.review.decision,
    checks: receiptChecks,
    reviewer: 'Auditor',
    compositeLiteraryScoreUsed: false,
  }
}

export function manualRecallAdherenceViolations(receipt: ManualRecallAdherenceReceipt) {
  return receipt.checks
    .filter(check => check.status === 'violated' || check.status === 'omitted')
    .map(check => `manual_recall_${check.status}:${check.sourceId}`)
}
