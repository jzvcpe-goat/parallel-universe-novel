import { activeHardBlockFindings } from './literaryReview'
import type {
  CreationSession,
  LiteraryReview,
  RepairProposal,
} from './types'

export type NextChapterQualityBlockerCode =
  | 'chapter_not_confirmed'
  | 'pending_repair_decision'
  | 'active_hard_block'
  | 'deterministic_violation'

export interface NextChapterQualityBlocker {
  code: NextChapterQualityBlockerCode
  count: number
}

export interface NextChapterQualityGate {
  allowed: boolean
  blockers: NextChapterQualityBlocker[]
}

export function evaluateNextChapterQualityGate(input: {
  session: CreationSession | null
  review: LiteraryReview | null
  repairs: RepairProposal[]
}): NextChapterQualityGate {
  const blockers: NextChapterQualityBlocker[] = []
  if (input.session?.phase !== 'canon_committed') {
    blockers.push({ code: 'chapter_not_confirmed', count: 1 })
  }

  const activeReview = input.review?.status === 'active' ? input.review : null
  const pendingRepairs = input.repairs.filter(repair => (
    repair.status === 'proposed'
    && repair.findingSource?.kind !== 'advisory_lens'
    && (!activeReview || repair.reviewId === activeReview.id)
  ))
  if (pendingRepairs.length) {
    blockers.push({ code: 'pending_repair_decision', count: pendingRepairs.length })
  }

  if (activeReview) {
    const hardBlockCount = activeHardBlockFindings(activeReview).length
    if (hardBlockCount) blockers.push({ code: 'active_hard_block', count: hardBlockCount })
    if (activeReview.deterministicViolations.length) {
      blockers.push({
        code: 'deterministic_violation',
        count: activeReview.deterministicViolations.length,
      })
    }
  }

  return {
    allowed: blockers.length === 0,
    blockers,
  }
}
