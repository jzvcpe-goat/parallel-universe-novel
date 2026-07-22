import { upsertLocalAgentOperation } from '@/local-db/creatorLocalAgentRepository'
import { saveLocalAgentOperationEvent } from '@/local-db/creatorLocalAgentExecutionRepository'
import type { AgentOperationLog } from '@/local-db/schema'
import { creatorAgentActions, type CreatorAgentActionName } from './actions'

export interface CreatorAgentOperationInput {
  operationId?: string
  actionName: CreatorAgentActionName
  route: string
  targetId?: string
  status?: AgentOperationLog['status']
  inputHash?: string
  confirmationReceiptId?: string
  messageCode?: string
}

export function createCreatorAgentOperationId(actionName: CreatorAgentActionName) {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `agent-operation:${actionName}:${id}`
}

function createEventId(operationId: string, status: AgentOperationLog['status']) {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${operationId}:${status}:${id}`
}

function createCreatorAgentOperationEvent(input: CreatorAgentOperationInput): AgentOperationLog {
  const action = creatorAgentActions.find(item => item.name === input.actionName)
  const now = new Date().toISOString()
  const status = input.status || 'started'
  const operationId = input.operationId || createCreatorAgentOperationId(input.actionName)
  return {
    id: createEventId(operationId, status),
    operationId,
    actionName: input.actionName,
    route: input.route,
    targetId: input.targetId,
    status,
    risk: action?.risk || 'medium',
    inputHash: input.inputHash,
    confirmationReceiptId: input.confirmationReceiptId,
    createdAt: now,
    finishedAt: ['succeeded', 'failed', 'blocked', 'cancelled_by_author'].includes(status)
      ? now
      : undefined,
    messageCode: input.messageCode,
  }
}

export function recordCreatorAgentOperation(input: CreatorAgentOperationInput): AgentOperationLog {
  return upsertLocalAgentOperation(createCreatorAgentOperationEvent(input))
}

export async function recordCreatorAgentOperationEvent(input: CreatorAgentOperationInput) {
  return saveLocalAgentOperationEvent(createCreatorAgentOperationEvent(input))
}
