import { hasCompleteLocalRepairVerification } from '@/features/creator-decision/literaryReview'
import type { RepairProposal } from '@/features/creator-decision/types'

function isVisibleRepair(repair: RepairProposal, activeReviewId: string | null) {
  if (repair.status !== 'proposed') return false
  if (!activeReviewId || repair.reviewId !== activeReviewId) return false
  if (repair.operation !== 'replace_range') return true
  return hasCompleteLocalRepairVerification(repair)
}

function newestVisibleRepair(repairs: RepairProposal[], activeReviewId: string | null) {
  return repairs
    .map((repair, index) => ({ repair, index }))
    .filter(({ repair }) => isVisibleRepair(repair, activeReviewId))
    .sort((left, right) => {
      const createdAtOrder = (right.repair.createdAt || '').localeCompare(left.repair.createdAt || '')
      return createdAtOrder || right.index - left.index
    })[0]?.repair || null
}

export function resolveVisibleRepairProposal(
  repairs: RepairProposal[],
  preferredRepairId: string | null,
  activeReviewId: string | null,
) {
  if (preferredRepairId) {
    const preferred = repairs.find(repair => (
      repair.id === preferredRepairId && isVisibleRepair(repair, activeReviewId)
    ))
    if (preferred) return preferred
  }
  return newestVisibleRepair(repairs, activeReviewId)
}
