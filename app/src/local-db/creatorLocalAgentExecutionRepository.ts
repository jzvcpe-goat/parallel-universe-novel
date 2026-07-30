import {
  creatorLocalStoreNames,
  openCreatorDb,
  requestToPromise,
  transactionDone,
} from './creatorLocalDb'
import type { AgentConfirmationReceipt, AgentOperationLog } from './schema'

export interface ConsumeAgentConfirmationInput {
  receiptId: string
  operationId: string
  actionName: string
  targetId: string
  inputHash: string
  consumedAt: string
}

export type ConsumeAgentConfirmationResult =
  | { ok: true; receipt: AgentConfirmationReceipt }
  | { ok: false; reason: 'missing' | 'not_confirmed' | 'expired' | 'binding_mismatch' }

export async function readLocalAgentConfirmation(receiptId: string) {
  const db = await openCreatorDb()
  try {
    const transaction = db.transaction(creatorLocalStoreNames.agentConfirmations, 'readonly')
    const receipt = await requestToPromise<AgentConfirmationReceipt | undefined>(
      transaction.objectStore(creatorLocalStoreNames.agentConfirmations).get(receiptId),
    )
    await transactionDone(transaction)
    return receipt
  } finally {
    db.close()
  }
}

export async function saveLocalAgentConfirmation(receipt: AgentConfirmationReceipt) {
  const db = await openCreatorDb()
  try {
    const transaction = db.transaction(creatorLocalStoreNames.agentConfirmations, 'readwrite')
    transaction.objectStore(creatorLocalStoreNames.agentConfirmations).put(receipt)
    await transactionDone(transaction)
    return receipt
  } finally {
    db.close()
  }
}

export async function saveLocalAgentOperationEvent(event: AgentOperationLog) {
  const db = await openCreatorDb()
  try {
    const transaction = db.transaction(creatorLocalStoreNames.agentOperationLog, 'readwrite')
    transaction.objectStore(creatorLocalStoreNames.agentOperationLog).put(event)
    await transactionDone(transaction)
    return event
  } finally {
    db.close()
  }
}

export async function consumeLocalAgentConfirmation({
  receiptId,
  operationId,
  actionName,
  targetId,
  inputHash,
  consumedAt,
}: ConsumeAgentConfirmationInput): Promise<ConsumeAgentConfirmationResult> {
  const db = await openCreatorDb()
  try {
    const transaction = db.transaction(creatorLocalStoreNames.agentConfirmations, 'readwrite')
    const store = transaction.objectStore(creatorLocalStoreNames.agentConfirmations)
    const receipt = await requestToPromise<AgentConfirmationReceipt | undefined>(store.get(receiptId))
    if (!receipt) {
      await transactionDone(transaction)
      return { ok: false, reason: 'missing' }
    }
    if (
      receipt.operationId !== operationId
      || receipt.actionName !== actionName
      || receipt.targetId !== targetId
      || receipt.inputHash !== inputHash
    ) {
      await transactionDone(transaction)
      return { ok: false, reason: 'binding_mismatch' }
    }
    if (receipt.status !== 'confirmed') {
      await transactionDone(transaction)
      return { ok: false, reason: 'not_confirmed' }
    }
    if (Date.parse(receipt.expiresAt) <= Date.parse(consumedAt)) {
      store.put({ ...receipt, status: 'expired' })
      await transactionDone(transaction)
      return { ok: false, reason: 'expired' }
    }
    const consumed: AgentConfirmationReceipt = {
      ...receipt,
      status: 'consumed',
      consumedAt,
    }
    store.put(consumed)
    await transactionDone(transaction)
    return { ok: true, receipt: consumed }
  } finally {
    db.close()
  }
}
