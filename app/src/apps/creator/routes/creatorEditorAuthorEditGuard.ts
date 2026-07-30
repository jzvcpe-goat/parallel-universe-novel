import type { CreationSessionPhase } from '@/features/creator-decision/types'

export interface CreatorEditorAuthorEditGuard {
  activeDraftId: string
  draftRevision: number
  manuscript: string
  phase: CreationSessionPhase
}

export function shouldRecordCreatorEditorAuthorEdit(input: {
  scheduled: CreatorEditorAuthorEditGuard
  current: CreatorEditorAuthorEditGuard
}) {
  return input.current.phase === input.scheduled.phase
    && input.current.activeDraftId === input.scheduled.activeDraftId
    && input.current.draftRevision === input.scheduled.draftRevision
    && input.current.manuscript === input.scheduled.manuscript
}

function timestamp(value: string | null | undefined) {
  const parsed = Date.parse(value || '')
  return Number.isFinite(parsed) ? parsed : 0
}

export function shouldApplyRestoredCreatorManuscript(input: {
  currentManuscript: string
  localDraftUpdatedAt?: string | null
  restoredDraftCreatedAt: string
  restoredManuscript: string
}) {
  if (!input.restoredManuscript.trim() || input.restoredManuscript === input.currentManuscript) return false
  if (!input.currentManuscript.trim()) return true
  return timestamp(input.restoredDraftCreatedAt) > timestamp(input.localDraftUpdatedAt)
}
