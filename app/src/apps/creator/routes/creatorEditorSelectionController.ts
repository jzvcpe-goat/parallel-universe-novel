import type { CreatorEditorCommandPatch } from './creatorEditorCommandController'
import type { PmfReaderRequest } from '@/features/pmf/types'
import {
  chapterDirectionLabel,
  type ChapterDirectionId,
} from './creatorEditorViewModels'

interface EditorCreativeReminderSignalRef {
  sourceSignalIds: string[]
}

interface ResolveEditorSelectedRequestInput {
  allowUnscopedFallback?: boolean
  fallbackRequestId?: string | null
  requestId: string | null
  requests: PmfReaderRequest[]
}

export function resolveEditorSelectedRequest({
  allowUnscopedFallback = true,
  fallbackRequestId = null,
  requestId,
  requests,
}: ResolveEditorSelectedRequestInput): PmfReaderRequest | null {
  const selectedRequestId = requestId || fallbackRequestId
  if (selectedRequestId) return requests.find(item => item.id === selectedRequestId) || null
  if (!allowUnscopedFallback) return null
  return requests.find(item => item.status === 'in_progress')
    || requests.find(item => item.status === 'acknowledged')
    || requests.find(item => item.status === 'pending')
    || null
}

export function resolveEditorLinkedCreativeReminder<T extends EditorCreativeReminderSignalRef>({
  creativeReminders,
  selectedRequest,
}: {
  creativeReminders: T[]
  selectedRequest: PmfReaderRequest | null
}): T | null {
  if (!selectedRequest) return null
  return creativeReminders.find(reminder => reminder.sourceSignalIds.includes(selectedRequest.id)) || null
}

export function resolveChapterDirectionSelection(direction: ChapterDirectionId): CreatorEditorCommandPatch {
  return {
    guideStep: 'scene',
    notice: `已切到「${chapterDirectionLabel(direction)}」，正文会围绕这个方向继续。`,
  }
}

export function resolveChapterGoalConfirmation(direction: ChapterDirectionId): CreatorEditorCommandPatch {
  return {
    guideStep: 'scene',
    notice: `本章目标已按「${chapterDirectionLabel(direction)}」整理，可以进入第一场戏。`,
  }
}

export function resolveDraftGuideContinuation(): CreatorEditorCommandPatch {
  return {
    guideStep: 'draft',
    notice: '继续写正文；按 Tab 可以接受下一句建议。',
  }
}
