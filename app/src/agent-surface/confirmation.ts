import {
  readLocalAgentConfirmation,
  saveLocalAgentConfirmation,
} from '@/local-db/creatorLocalAgentExecutionRepository'
import type { AgentConfirmationReceipt } from '@/local-db/schema'
import type { CreatorAgentActionName } from './actions'

const DEFAULT_CONFIRMATION_TTL_MS = 2 * 60 * 1000

function confirmationId() {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `agent-confirmation:${id}`
}

export interface RequestCreatorAgentConfirmationInput {
  operationId: string
  actionName: CreatorAgentActionName
  targetId: string
  inputHash: string
  now?: string
  ttlMs?: number
}

export async function requestCreatorAgentConfirmation({
  operationId,
  actionName,
  targetId,
  inputHash,
  now = new Date().toISOString(),
  ttlMs = DEFAULT_CONFIRMATION_TTL_MS,
}: RequestCreatorAgentConfirmationInput) {
  const receipt: AgentConfirmationReceipt = {
    id: confirmationId(),
    operationId,
    actionName,
    targetId,
    inputHash,
    status: 'pending',
    createdAt: now,
    expiresAt: new Date(Date.parse(now) + ttlMs).toISOString(),
  }
  return saveLocalAgentConfirmation(receipt)
}

type UpdateCreatorAgentConfirmationResult =
  | { ok: true; receipt: AgentConfirmationReceipt }
  | { ok: false; reason: 'missing' | 'expired' | 'not_pending' }

export async function confirmCreatorAgentConfirmation(
  receiptId: string,
  now = new Date().toISOString(),
): Promise<UpdateCreatorAgentConfirmationResult> {
  const receipt = await readLocalAgentConfirmation(receiptId)
  if (!receipt) return { ok: false, reason: 'missing' }
  if (Date.parse(receipt.expiresAt) <= Date.parse(now)) {
    const expired: AgentConfirmationReceipt = { ...receipt, status: 'expired' }
    await saveLocalAgentConfirmation(expired)
    return { ok: false, reason: 'expired' }
  }
  if (receipt.status !== 'pending') return { ok: false, reason: 'not_pending' }
  const confirmed: AgentConfirmationReceipt = {
    ...receipt,
    status: 'confirmed',
    confirmedAt: now,
  }
  await saveLocalAgentConfirmation(confirmed)
  return { ok: true, receipt: confirmed }
}

export async function cancelCreatorAgentConfirmation(
  receiptId: string,
  now = new Date().toISOString(),
): Promise<UpdateCreatorAgentConfirmationResult> {
  const receipt = await readLocalAgentConfirmation(receiptId)
  if (!receipt) return { ok: false, reason: 'missing' }
  if (Date.parse(receipt.expiresAt) <= Date.parse(now)) {
    const expired: AgentConfirmationReceipt = { ...receipt, status: 'expired' }
    await saveLocalAgentConfirmation(expired)
    return { ok: false, reason: 'expired' }
  }
  if (receipt.status !== 'pending' && receipt.status !== 'confirmed') {
    return { ok: false, reason: 'not_pending' }
  }
  const cancelled: AgentConfirmationReceipt = {
    ...receipt,
    status: 'cancelled',
    cancelledAt: now,
  }
  await saveLocalAgentConfirmation(cancelled)
  return { ok: true, receipt: cancelled }
}
