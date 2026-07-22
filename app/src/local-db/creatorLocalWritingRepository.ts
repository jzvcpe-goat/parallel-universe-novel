import type { PmfReaderRequest } from '@/features/pmf/types'
import {
  applyCreativeReminderAuthorUpdate,
  buildCreativeReminderSuggestions,
  type CreativeReminderAuthorUpdate,
} from '@/features/creator-pivot/creativeReminderEngine'
import {
  readLocalCreativeReminderRecords,
  upsertLocalCreativeReminderRecord,
} from './creatorLocalRepository'
import { readerSignalFromRequest } from './creatorLocalReaderSignalRepository'
import type { CreativeReminder, LocalReaderSignalCache } from './schema'

export interface PmfCreativeReminderInput {
  request: PmfReaderRequest
  title?: string
  authorNote?: string
  draftId?: string
  status?: CreativeReminder['status']
}

export type PmfCreativeReminder = CreativeReminder

export function readLocalCreativeReminders(workId?: string): PmfCreativeReminder[] {
  return readLocalCreativeReminderRecords(workId)
}

export function suggestLocalCreativeReminders(
  signals: LocalReaderSignalCache[],
  now = new Date().toISOString(),
) {
  const suggestions = buildCreativeReminderSuggestions(signals, readLocalCreativeReminders(), now)
  for (const reminder of suggestions) upsertLocalCreativeReminderRecord(reminder)
  return readLocalCreativeReminders()
}

export function updateLocalCreativeReminder(
  reminderId: string,
  update: CreativeReminderAuthorUpdate,
  now = new Date().toISOString(),
) {
  const current = readLocalCreativeReminders().find(reminder => reminder.id === reminderId)
  if (!current) return null
  return upsertLocalCreativeReminderRecord(applyCreativeReminderAuthorUpdate(current, update, now))
}

export function upsertLocalCreativeReminder(input: PmfCreativeReminderInput): PmfCreativeReminder {
  const signal = readerSignalFromRequest(input.request)
  const reminders = suggestLocalCreativeReminders([signal])
  const reminder = reminders.find(item => item.sourceSignalIds.includes(input.request.id))
  if (!reminder) throw new Error('Creative reminder suggestion missing')
  return upsertLocalCreativeReminderRecord(applyCreativeReminderAuthorUpdate(reminder, {
    title: input.title,
    authorNote: input.authorNote,
    draftId: input.draftId,
    status: input.status === 'suggested' ? undefined : input.status,
  }))
}
