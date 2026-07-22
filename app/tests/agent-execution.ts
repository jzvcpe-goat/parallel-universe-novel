import assert from 'node:assert/strict'
import { creatorAgentActions } from '../src/agent-surface/actions'
import { creatorAgentActionSchemas } from '../src/agent-surface/contracts'
import {
  createCreatorAgentExecutor,
  type CreatorAgentExecutorLifecycle,
} from '../src/agent-surface/executor'
import type { AgentConfirmationReceipt, AgentOperationLog } from '../src/local-db/schema'

function createFixtureLifecycle() {
  const events: AgentOperationLog[] = []
  const receipts = new Map<string, AgentConfirmationReceipt>()
  let sequence = 0
  const lifecycle: CreatorAgentExecutorLifecycle = {
    now: () => '2026-07-10T12:00:00.000Z',
    hashInput: async input => `hash:${JSON.stringify(input).length}`,
    recordEvent: async input => {
      sequence += 1
      const event: AgentOperationLog = {
        id: `event:${sequence}`,
        operationId: input.operationId || `operation:${sequence}`,
        actionName: input.actionName,
        route: input.route,
        targetId: input.targetId,
        status: input.status || 'started',
        risk: creatorAgentActions.find(action => action.name === input.actionName)?.risk || 'medium',
        inputHash: input.inputHash,
        confirmationReceiptId: input.confirmationReceiptId,
        createdAt: '2026-07-10T12:00:00.000Z',
        messageCode: input.messageCode,
      }
      events.push(event)
      return event
    },
    requestConfirmation: async input => {
      const receipt: AgentConfirmationReceipt = {
        id: `receipt:${receipts.size + 1}`,
        operationId: input.operationId,
        actionName: input.actionName,
        targetId: input.targetId,
        inputHash: input.inputHash,
        status: 'pending',
        createdAt: input.now || '2026-07-10T12:00:00.000Z',
        expiresAt: '2026-07-10T12:02:00.000Z',
      }
      receipts.set(receipt.id, receipt)
      return receipt
    },
    consumeConfirmation: async input => {
      const receipt = receipts.get(input.receiptId)
      if (!receipt) return { ok: false as const, reason: 'missing' as const }
      if (
        receipt.operationId !== input.operationId
        || receipt.actionName !== input.actionName
        || receipt.targetId !== input.targetId
        || receipt.inputHash !== input.inputHash
      ) return { ok: false as const, reason: 'binding_mismatch' as const }
      if (receipt.status !== 'confirmed') return { ok: false as const, reason: 'not_confirmed' as const }
      const consumed: AgentConfirmationReceipt = {
        ...receipt,
        status: 'consumed',
        consumedAt: input.consumedAt,
      }
      receipts.set(consumed.id, consumed)
      return { ok: true as const, receipt: consumed }
    },
  }
  return { events, lifecycle, receipts }
}

assert.deepEqual(
  Object.keys(creatorAgentActionSchemas).sort(),
  creatorAgentActions.map(action => action.name).sort(),
  'every declared action must have exact input/output schemas',
)

{
  const fixture = createFixtureLifecycle()
  let handlerCalls = 0
  const execute = createCreatorAgentExecutor({
    save_local_draft: input => {
      handlerCalls += 1
      return { kind: 'draft_saved', targetId: input.targetId, recordId: input.draftId }
    },
  }, fixture.lifecycle)
  const privateBody = 'private manuscript prose must never enter lifecycle events'
  const result = await execute({
    actionName: 'save_local_draft',
    input: { route: '/creator/editor', targetId: 'draft:1', draftId: 'draft:1', privateBody },
  })
  assert.equal(result.status, 'blocked', 'strict schemas must reject undeclared private payload fields')
  assert.equal(handlerCalls, 0)
  assert.equal(JSON.stringify(fixture.events).includes(privateBody), false)
}

{
  const fixture = createFixtureLifecycle()
  let handlerCalls = 0
  const execute = createCreatorAgentExecutor({
    save_local_draft: input => {
      handlerCalls += 1
      return { kind: 'draft_saved', targetId: input.targetId, recordId: input.draftId }
    },
  }, fixture.lifecycle)
  const result = await execute({
    actionName: 'save_local_draft',
    input: { route: '/creator/editor', targetId: 'draft:1', draftId: 'draft:1' },
  })
  assert.equal(result.status, 'succeeded')
  assert.equal(handlerCalls, 1)
  assert.deepEqual(fixture.events.map(event => event.status), ['requested', 'started', 'succeeded'])
}

{
  const fixture = createFixtureLifecycle()
  let handlerCalls = 0
  const execute = createCreatorAgentExecutor({
    confirm_publish_bundle: input => {
      handlerCalls += 1
      return { kind: 'bundle_confirmed', targetId: input.targetId, recordId: 'bundle:1' }
    },
  }, fixture.lifecycle)
  const input = { route: '/creator/bundles', targetId: 'bundle:1', bundleId: 'bundle:1' }
  const requested = await execute({ actionName: 'confirm_publish_bundle', input })
  assert.equal(requested.status, 'awaiting_confirmation')
  assert.equal(handlerCalls, 0, 'public write handler must not run before author confirmation')
  if (requested.status !== 'awaiting_confirmation') throw new Error('missing confirmation receipt')
  fixture.receipts.set(requested.receipt.id, {
    ...requested.receipt,
    status: 'confirmed',
    confirmedAt: '2026-07-10T12:00:30.000Z',
  })
  const completed = await execute({
    actionName: 'confirm_publish_bundle',
    input,
    operationId: requested.operationId,
    confirmationReceiptId: requested.receipt.id,
  })
  assert.equal(completed.status, 'succeeded')
  assert.equal(handlerCalls, 1)
  assert.equal(fixture.receipts.get(requested.receipt.id)?.status, 'consumed')
  const replay = await execute({
    actionName: 'confirm_publish_bundle',
    input,
    operationId: requested.operationId,
    confirmationReceiptId: requested.receipt.id,
  })
  assert.equal(replay.status, 'blocked', 'a confirmation receipt must be single use')
  assert.equal(handlerCalls, 1)
}

{
  const fixture = createFixtureLifecycle()
  let handlerCalls = 0
  const execute = createCreatorAgentExecutor({
    submit_publish_bundle: input => {
      handlerCalls += 1
      return { kind: 'bundle_submitted', targetId: input.targetId, recordId: 'receipt:published' }
    },
  }, fixture.lifecycle)
  const input = { route: '/creator/bundles', targetId: 'bundle:1', bundleId: 'bundle:1' }
  const requested = await execute({ actionName: 'submit_publish_bundle', input })
  assert.equal(requested.status, 'awaiting_confirmation')
  assert.equal(handlerCalls, 0)
  if (requested.status !== 'awaiting_confirmation') throw new Error('missing submit confirmation receipt')
  fixture.receipts.set(requested.receipt.id, {
    ...requested.receipt,
    status: 'confirmed',
    confirmedAt: '2026-07-10T12:00:30.000Z',
  })
  const completed = await execute({
    actionName: 'submit_publish_bundle',
    input,
    operationId: requested.operationId,
    confirmationReceiptId: requested.receipt.id,
  })
  assert.equal(completed.status, 'succeeded')
  assert.equal(handlerCalls, 1)
}

{
  const fixture = createFixtureLifecycle()
  const execute = createCreatorAgentExecutor({}, fixture.lifecycle)
  const result = await execute({
    actionName: 'open_draft',
    input: { route: '/creator/editor', targetId: 'draft:missing', draftId: 'draft:missing' },
  })
  assert.equal(result.status, 'blocked')
  if (result.status === 'blocked') assert.equal(result.reason, 'handler_missing')
}

console.log('Agent execution protocol fixture passed.')
