import type {
  PmfReaderRequest,
  PmfRequestStatus,
} from '@/features/pmf/types'
import {
  requestStatusLabel,
  updateReaderRequestStatus,
  type PmfResult,
} from '@/lib/pmfSupabase'
import {
  readLocalCreativeReminders,
  updateLocalCreativeReminder,
  upsertLocalCreativeReminder,
  type PmfCreativeReminder,
} from '@/local-db/creatorLocalWritingRepository'
import type { LocalReaderSignalCache } from '@/local-db/schema'
import { hydrateCreatorLocalRepository } from '@/local-db/creatorLocalRepository'
import {
  canMoveRequestStatus,
  requestActionForStatus,
  type EchoAction,
} from './creatorEchoRouteController'
import { creativeReminderStatusLabel } from './creatorEchoSignalViewModels'
import { creatorFacingNotice } from '../creatorViewHelpers'

type EditableRequestStatus = Exclude<PmfRequestStatus, 'pending'>

export interface CreatorEchoStatusApiPort {
  updateStatus(id: string, status: EditableRequestStatus): Promise<PmfResult<PmfReaderRequest>>
}

export interface CreatorEchoReminderPort {
  hydrate(): Promise<void>
  pin(request: PmfReaderRequest): PmfCreativeReminder
  readAll(): PmfCreativeReminder[]
  update(reminderId: string, status: 'pinned' | 'used' | 'dismissed'): PmfCreativeReminder | null
}

type RunCreatorEchoStatusResult =
  | {
    action: EchoAction
    ok: false
    notice: string
  }
  | {
    action: EchoAction
    notice: string
    ok: true
    request: PmfReaderRequest
  }

type RunCreatorEchoStartWritingResult =
  | {
    ok: false
    notice: string
  }
  | {
    creativeReminders: PmfCreativeReminder[]
    ok: true
    request: PmfReaderRequest
  }

const defaultCreatorEchoStatusApiPort: CreatorEchoStatusApiPort = {
  updateStatus: updateReaderRequestStatus,
}

const defaultCreatorEchoReminderPort: CreatorEchoReminderPort = {
  hydrate: hydrateCreatorLocalRepository,
  pin: request => upsertLocalCreativeReminder({ request, status: 'pinned' }),
  readAll: readLocalCreativeReminders,
  update: (reminderId, status) => updateLocalCreativeReminder(reminderId, { status }),
}

type RunCreatorEchoReminderActionResult =
  | { ok: false; notice: string }
  | { ok: true; creativeReminders: PmfCreativeReminder[]; notice: string; reminder: PmfCreativeReminder }

export async function runCreatorEchoReminderAction(
  signal: LocalReaderSignalCache,
  status: 'pinned' | 'used' | 'dismissed',
  reminders: CreatorEchoReminderPort = defaultCreatorEchoReminderPort,
): Promise<RunCreatorEchoReminderActionResult> {
  await reminders.hydrate()
  const current = reminders.readAll().find(reminder =>
    reminder.sourceSignalIds.includes(signal.id)
    || signal.sourceRefs.some(ref => reminder.sourceSignalIds.includes(ref.cloudId)),
  )
  if (!current) return { ok: false, notice: '这条回声暂时没有可保存的创作提醒。' }
  const updated = reminders.update(current.id, status)
  if (!updated) return { ok: false, notice: '创作提醒没有更新，请稍后再试。' }
  return {
    ok: true,
    creativeReminders: reminders.readAll(),
    notice: `创作提醒已更新为「${creativeReminderStatusLabel(updated.status)}」。`,
    reminder: updated,
  }
}

export async function runCreatorEchoStatusUpdate(
  request: PmfReaderRequest,
  status: EditableRequestStatus,
  api: CreatorEchoStatusApiPort = defaultCreatorEchoStatusApiPort,
): Promise<RunCreatorEchoStatusResult> {
  const action = requestActionForStatus(status)
  if (!canMoveRequestStatus(request.status, status)) {
    return { action, ok: false, notice: '当前状态不能执行这个动作。' }
  }

  const result = await api.updateStatus(request.id, status)
  if (!result.ok) return { action, ok: false, notice: creatorFacingNotice(result.message) }
  return {
    action,
    notice: `回声已更新为「${requestStatusLabel(result.data.status)}」。`,
    ok: true,
    request: result.data,
  }
}

export async function runCreatorEchoStartWriting(
  request: PmfReaderRequest,
  api: CreatorEchoStatusApiPort = defaultCreatorEchoStatusApiPort,
  reminders: CreatorEchoReminderPort = defaultCreatorEchoReminderPort,
): Promise<RunCreatorEchoStartWritingResult> {
  if (request.status === 'published' || request.status === 'rejected') {
    return { ok: false, notice: '已结束的回声不能直接进入写作。' }
  }

  let currentRequest = request

  if (currentRequest.status === 'pending') {
    const acknowledged = await runCreatorEchoStatusUpdate(currentRequest, 'acknowledged', api)
    if (!acknowledged.ok) return { ok: false, notice: acknowledged.notice }
    currentRequest = acknowledged.request
  }

  if (currentRequest.status === 'acknowledged') {
    const inProgress = await runCreatorEchoStatusUpdate(currentRequest, 'in_progress', api)
    if (!inProgress.ok) return { ok: false, notice: inProgress.notice }
    currentRequest = inProgress.request
  }

  if (currentRequest.status !== 'in_progress') {
    return { ok: false, notice: '当前回声还不能进入写作。' }
  }

  reminders.pin(currentRequest)

  return {
    creativeReminders: reminders.readAll(),
    ok: true,
    request: currentRequest,
  }
}
