import type { PmfReaderRequest } from '@/features/pmf/types'
import {
  readLocalCreativeReminders,
  upsertLocalCreativeReminder,
  type PmfCreativeReminder,
} from '@/local-db/creatorLocalWritingRepository'
import type { CreatorEditorCreativeReminderStatus } from './creatorEditorRouteController'

export interface EditorReminderPersistencePort {
  readAll(): PmfCreativeReminder[]
  upsert(input: {
    request: PmfReaderRequest
    status: CreatorEditorCreativeReminderStatus
  }): PmfCreativeReminder
}

interface RunEditorReminderLoadResult {
  creativeReminders: PmfCreativeReminder[]
}

interface RunEditorReminderBootstrapInput {
  creativeReminders: PmfCreativeReminder[]
  nextRequest: PmfReaderRequest | null
  missingReminderStatus: CreatorEditorCreativeReminderStatus | null
}

const defaultEditorReminderPersistencePort: EditorReminderPersistencePort = {
  readAll: readLocalCreativeReminders,
  upsert: upsertLocalCreativeReminder,
}

export function runEditorReminderLoad(
  persistence: EditorReminderPersistencePort = defaultEditorReminderPersistencePort,
): RunEditorReminderLoadResult {
  return {
    creativeReminders: persistence.readAll(),
  }
}

export function runEditorReminderBootstrap(
  input: RunEditorReminderBootstrapInput,
  persistence: EditorReminderPersistencePort = defaultEditorReminderPersistencePort,
): RunEditorReminderLoadResult {
  if (input.nextRequest && input.missingReminderStatus) {
    persistence.upsert({
      request: input.nextRequest,
      status: input.missingReminderStatus,
    })
    return {
      creativeReminders: persistence.readAll(),
    }
  }

  return {
    creativeReminders: input.creativeReminders,
  }
}
