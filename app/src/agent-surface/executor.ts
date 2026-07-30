import {
  consumeLocalAgentConfirmation,
  type ConsumeAgentConfirmationResult,
} from '@/local-db/creatorLocalAgentExecutionRepository'
import { sha256Text, stableJson } from '@/local-db/creatorLocalIntegrity'
import type { AgentConfirmationReceipt, AgentOperationLog } from '@/local-db/schema'
import {
  creatorAgentActionByName,
  type CreatorAgentActionName,
} from './actions'
import { isLocalCreatorHost } from '@/local-db/creatorLocalSettingsRepository'
import {
  requestCreatorAgentConfirmation,
  type RequestCreatorAgentConfirmationInput,
} from './confirmation'
import {
  creatorAgentActionSchemas,
  type CreatorAgentActionInput,
  type CreatorAgentActionOutput,
} from './contracts'
import {
  createCreatorAgentOperationId,
  recordCreatorAgentOperationEvent,
  type CreatorAgentOperationInput,
} from './operationLog'

type CreatorAgentActionHandler<Name extends CreatorAgentActionName> = (
  input: CreatorAgentActionInput<Name>,
) => CreatorAgentActionOutput<Name> | Promise<CreatorAgentActionOutput<Name>>

export type CreatorAgentActionHandlerRegistry = Partial<{
  [Name in CreatorAgentActionName]: CreatorAgentActionHandler<Name>
}>

export interface CreatorAgentExecutorLifecycle {
  now: () => string
  hashInput: (input: unknown) => Promise<string>
  recordEvent: (input: CreatorAgentOperationInput) => Promise<AgentOperationLog>
  requestConfirmation: (
    input: RequestCreatorAgentConfirmationInput,
  ) => Promise<AgentConfirmationReceipt>
  consumeConfirmation: (input: {
    receiptId: string
    operationId: string
    actionName: string
    targetId: string
    inputHash: string
    consumedAt: string
  }) => Promise<ConsumeAgentConfirmationResult>
}

const defaultLifecycle: CreatorAgentExecutorLifecycle = {
  now: () => new Date().toISOString(),
  hashInput: input => sha256Text(stableJson(input)),
  recordEvent: recordCreatorAgentOperationEvent,
  requestConfirmation: requestCreatorAgentConfirmation,
  consumeConfirmation: consumeLocalAgentConfirmation,
}

interface CreatorAgentExecutorRequest<Name extends CreatorAgentActionName> {
  actionName: Name
  input: unknown
  operationId?: string
  confirmationReceiptId?: string
}

type CreatorAgentExecutorResult<Name extends CreatorAgentActionName> =
  | {
    status: 'awaiting_confirmation'
    operationId: string
    inputHash: string
    receipt: AgentConfirmationReceipt
  }
  | {
    status: 'succeeded'
    operationId: string
    inputHash: string
    output: CreatorAgentActionOutput<Name>
  }
  | {
    status: 'blocked'
    operationId: string
    inputHash: string
    reason: 'invalid_input' | 'confirmation_missing' | 'confirmation_invalid' | 'handler_missing' | 'local_surface_required'
  }
  | {
    status: 'failed'
    operationId: string
    inputHash: string
    reason: 'handler_failed' | 'invalid_output'
  }

function safeString(value: unknown) {
  return typeof value === 'string' && value.length ? value : undefined
}

export function createCreatorAgentExecutor(
  registry: CreatorAgentActionHandlerRegistry,
  lifecycle: CreatorAgentExecutorLifecycle = defaultLifecycle,
) {
  return async function execute<Name extends CreatorAgentActionName>({
    actionName,
    input,
    operationId = createCreatorAgentOperationId(actionName),
    confirmationReceiptId,
  }: CreatorAgentExecutorRequest<Name>): Promise<CreatorAgentExecutorResult<Name>> {
    const action = creatorAgentActionByName[actionName]
    const inputHash = await lifecycle.hashInput(input)
    const rawInput = input && typeof input === 'object' ? input as Record<string, unknown> : {}
    const route = safeString(rawInput.route) || action.route.replace('/:draftId', '')
    const targetId = safeString(rawInput.targetId) || 'unknown-target'

    // Creator mutations are local-only even when a route guard is bypassed.
    if (typeof window !== 'undefined' && !isLocalCreatorHost() && (action.writesLocalData || action.writesPublicData)) {
      await lifecycle.recordEvent({
        operationId,
        actionName,
        route,
        targetId,
        status: 'blocked',
        inputHash,
        messageCode: 'local_surface_required',
      })
      return { status: 'blocked', operationId, inputHash, reason: 'local_surface_required' }
    }

    if (!confirmationReceiptId) {
      await lifecycle.recordEvent({
        operationId,
        actionName,
        route,
        targetId,
        status: 'requested',
        inputHash,
        messageCode: 'action_requested',
      })
    }

    const parsedInput = creatorAgentActionSchemas[actionName].input.safeParse(input)
    if (!parsedInput.success) {
      await lifecycle.recordEvent({
        operationId,
        actionName,
        route,
        targetId,
        status: 'blocked',
        inputHash,
        messageCode: 'invalid_input',
      })
      return { status: 'blocked', operationId, inputHash, reason: 'invalid_input' }
    }

    const registeredHandler = registry[actionName]
    if (!registeredHandler) {
      await lifecycle.recordEvent({
        operationId,
        actionName,
        route: parsedInput.data.route,
        targetId: parsedInput.data.targetId,
        status: 'blocked',
        inputHash,
        messageCode: 'handler_missing',
      })
      return { status: 'blocked', operationId, inputHash, reason: 'handler_missing' }
    }

    if (action.requiresAuthorConfirmation) {
      if (!confirmationReceiptId) {
        const receipt = await lifecycle.requestConfirmation({
          operationId,
          actionName,
          targetId: parsedInput.data.targetId,
          inputHash,
          now: lifecycle.now(),
        })
        await lifecycle.recordEvent({
          operationId,
          actionName,
          route: parsedInput.data.route,
          targetId: parsedInput.data.targetId,
          status: 'awaiting_confirmation',
          inputHash,
          confirmationReceiptId: receipt.id,
          messageCode: 'author_confirmation_required',
        })
        return { status: 'awaiting_confirmation', operationId, inputHash, receipt }
      }

      const consumed = await lifecycle.consumeConfirmation({
        receiptId: confirmationReceiptId,
        operationId,
        actionName,
        targetId: parsedInput.data.targetId,
        inputHash,
        consumedAt: lifecycle.now(),
      })
      if (!consumed.ok) {
        await lifecycle.recordEvent({
          operationId,
          actionName,
          route: parsedInput.data.route,
          targetId: parsedInput.data.targetId,
          status: 'blocked',
          inputHash,
          confirmationReceiptId,
          messageCode: `confirmation_${consumed.reason}`,
        })
        return { status: 'blocked', operationId, inputHash, reason: 'confirmation_invalid' }
      }
    }

    await lifecycle.recordEvent({
      operationId,
      actionName,
      route: parsedInput.data.route,
      targetId: parsedInput.data.targetId,
      status: 'started',
      inputHash,
      confirmationReceiptId,
      messageCode: 'action_started',
    })

    try {
      const handler = registeredHandler as (parsed: unknown) => unknown | Promise<unknown>
      const rawOutput = await handler(parsedInput.data)
      const parsedOutput = creatorAgentActionSchemas[actionName].output.safeParse(rawOutput)
      if (!parsedOutput.success) {
        await lifecycle.recordEvent({
          operationId,
          actionName,
          route: parsedInput.data.route,
          targetId: parsedInput.data.targetId,
          status: 'failed',
          inputHash,
          confirmationReceiptId,
          messageCode: 'invalid_output',
        })
        return { status: 'failed', operationId, inputHash, reason: 'invalid_output' }
      }
      await lifecycle.recordEvent({
        operationId,
        actionName,
        route: parsedInput.data.route,
        targetId: parsedInput.data.targetId,
        status: 'succeeded',
        inputHash,
        confirmationReceiptId,
        messageCode: parsedOutput.data.messageCode || 'action_succeeded',
      })
      return {
        status: 'succeeded',
        operationId,
        inputHash,
        output: parsedOutput.data as CreatorAgentActionOutput<Name>,
      }
    } catch {
      await lifecycle.recordEvent({
        operationId,
        actionName,
        route: parsedInput.data.route,
        targetId: parsedInput.data.targetId,
        status: 'failed',
        inputHash,
        confirmationReceiptId,
        messageCode: 'handler_failed',
      })
      return { status: 'failed', operationId, inputHash, reason: 'handler_failed' }
    }
  }
}
