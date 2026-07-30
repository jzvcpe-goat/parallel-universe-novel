import type { CreatorAgentActionName } from './actions'
import {
  createCreatorAgentExecutor,
  type CreatorAgentActionHandlerRegistry,
} from './executor'
import { confirmCreatorAgentConfirmation } from './confirmation'
import { recordCreatorAgentOperationEvent } from './operationLog'

const candidateActionKinds = {
  select_priority_request: 'priority_selected',
  convert_echo_to_scene: 'scene_candidate_created',
  generate_candidate_from_instruction: 'candidate_created',
  complete_next_beat: 'candidate_created',
  rewrite_as_action: 'candidate_created',
  ask_socratic_question: 'question_ready',
  extract_setting_asset: 'asset_candidate_created',
  branch_sandbox: 'branch_candidate_created',
  inspect_story_impact: 'impact_ready',
  open_suggestion_record: 'suggestion_record_opened',
  check_reader_promise: 'reader_promise_checked',
} as const

type CreatorCandidateActionName = keyof typeof candidateActionKinds

interface CreatorCommandCandidateStartInput {
  actionName: CreatorAgentActionName
  candidateId: string
  route: string
}

export interface CreatorCommandCandidateApplyInput {
  candidateId: string
  adoptionMode: 'insert' | 'replace' | 'branch' | 'hold'
  route: string
}

export interface CreatorCommandCandidateConfirmation {
  candidateId: string
  adoptionMode: CreatorCommandCandidateApplyInput['adoptionMode']
  route: string
  operationId: string
  receiptId: string
}

function isCandidateActionName(actionName: CreatorAgentActionName): actionName is CreatorCandidateActionName {
  return actionName in candidateActionKinds
}

function candidateActionInput(
  actionName: CreatorCandidateActionName,
  candidateId: string,
  route: string,
) {
  const base = { route, targetId: candidateId, candidateId }
  if (actionName === 'extract_setting_asset') return { ...base, assetKind: 'rule' as const }
  return base
}

export async function executeCreatorCommandCandidateStartFlow({
  actionName,
  candidateId,
  route,
}: CreatorCommandCandidateStartInput) {
  if (!isCandidateActionName(actionName)) {
    return recordCreatorAgentOperationEvent({
      actionName,
      route,
      targetId: candidateId,
      status: 'blocked',
      messageCode: 'candidate_action_unsupported',
    })
  }
  const registry = {
    [actionName]: (parsedInput: { targetId: string }) => ({
      kind: candidateActionKinds[actionName],
      targetId: parsedInput.targetId,
      recordId: candidateId,
      messageCode: 'candidate_ready',
    }),
  } as CreatorAgentActionHandlerRegistry
  const execute = createCreatorAgentExecutor(registry)
  return execute({
    actionName,
    input: candidateActionInput(actionName, candidateId, route),
  })
}

export async function executeCreatorCommandCandidateApplyFlow({
  candidateId,
  adoptionMode,
  route,
}: CreatorCommandCandidateApplyInput) {
  const execute = createCreatorAgentExecutor({
    apply_suggestion: parsedInput => ({
      kind: 'candidate_adopted',
      targetId: parsedInput.targetId,
      recordId: candidateId,
      messageCode: `candidate_${adoptionMode}`,
    }),
  })
  const requested = await execute({
    actionName: 'apply_suggestion',
    input: {
      route,
      targetId: candidateId,
      candidateId,
      adoptionMode,
    },
  })
  if (requested.status !== 'awaiting_confirmation') return requested
  return {
    ...requested,
    confirmation: {
      candidateId,
      adoptionMode,
      route,
      operationId: requested.operationId,
      receiptId: requested.receipt.id,
    } satisfies CreatorCommandCandidateConfirmation,
  }
}

export async function confirmCreatorCommandCandidateApplyFlow(
  confirmation: CreatorCommandCandidateConfirmation,
  applyCandidate: () => void,
) {
  const confirmed = await confirmCreatorAgentConfirmation(confirmation.receiptId)
  if (!confirmed.ok) {
    return {
      status: 'blocked' as const,
      operationId: confirmation.operationId,
      reason: 'confirmation_invalid' as const,
    }
  }

  const { candidateId, adoptionMode, route } = confirmation
  const execute = createCreatorAgentExecutor({
    apply_suggestion: parsedInput => {
      applyCandidate()
      return {
        kind: 'candidate_adopted',
        targetId: parsedInput.targetId,
        recordId: candidateId,
        messageCode: `candidate_${adoptionMode}`,
      }
    },
  })
  return execute({
    actionName: 'apply_suggestion',
    input: {
      route,
      targetId: candidateId,
      candidateId,
      adoptionMode,
    },
    operationId: confirmation.operationId,
    confirmationReceiptId: confirmation.receiptId,
  })
}

export function recordCreatorCommandCandidateCancellation(candidateId: string, route: string) {
  return recordCreatorAgentOperationEvent({
    actionName: 'apply_suggestion',
    route,
    targetId: candidateId,
    status: 'cancelled_by_author',
    messageCode: 'candidate_rejected',
  })
}
