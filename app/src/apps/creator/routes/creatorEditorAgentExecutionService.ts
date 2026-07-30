import { createCreatorAgentExecutor } from '@/agent-surface/executor'
import { confirmCreatorAgentConfirmation } from '@/agent-surface/confirmation'
import type { CreatorAgentActionName } from '@/agent-surface/actions'
import {
  runEditorManualDraftSubmitFlow,
  runEditorPublishCheckSubmitFlow,
  type RunEditorManualDraftSubmitFlowInput,
  type RunEditorManualDraftSubmitFlowResult,
  type RunEditorPublishCheckSubmitFlowInput,
  type RunEditorPublishCheckSubmitFlowResult,
} from './creatorEditorDraftSubmitFlowService'
import {
  resolveEditorAssistCandidateAdoptionFlow,
  runEditorWritingCommandFlow,
  type EditorCommandFlowContext,
} from './creatorEditorCommandFlowService'
import type {
  EditorAssistCandidate,
  WritingCommandId,
} from './creatorEditorAssistantViewModels'
import type { CreatorEditorCandidateStatePatch } from './creatorEditorCandidatePatchController'
import type { CreatorEditorCommandStatePatch } from './creatorEditorCommandPatchController'
import type { PmfLocalDraft } from '@/features/pmf/types'
import { resolveEditorDraftOpen } from './creatorEditorDraftController'
import {
  resolveEditorDraftOpenStatePatch,
  type CreatorEditorDraftStatePatch,
} from './creatorEditorDraftPatchController'

interface EditorAgentExecutionResult<Result> {
  ok: boolean
  result: Result | null
}

function draftExecutionTarget(input: {
  activeDraftRef: string
  selectedWorkId: string
  resolvedBranchId: string
}) {
  return input.activeDraftRef
    || `new-draft:${input.selectedWorkId || 'unselected-work'}:${input.resolvedBranchId || 'unselected-branch'}`
}

const writingCommandActions: Record<WritingCommandId, CreatorAgentActionName> = {
  complete: 'complete_next_beat',
  temper: 'rewrite_as_action',
  question: 'ask_socratic_question',
  state: 'inspect_story_impact',
  sandbox: 'branch_sandbox',
  record: 'open_suggestion_record',
}

const writingCommandKinds = {
  complete: 'candidate_created',
  temper: 'candidate_created',
  question: 'question_ready',
  state: 'impact_ready',
  sandbox: 'branch_candidate_created',
  record: 'suggestion_record_opened',
} as const

function writingCommandInput(command: WritingCommandId, targetId: string) {
  return {
    route: '/creator/write/:draftId',
    targetId,
    candidateId: `editor-candidate:${command}:${targetId}`,
    draftId: targetId,
  }
}

export async function runEditorWritingCommandThroughAgent({
  command,
  context,
  targetId,
}: {
  command: WritingCommandId
  context: EditorCommandFlowContext
  targetId: string
}): Promise<EditorAgentExecutionResult<CreatorEditorCommandStatePatch | null>> {
  const actionName = writingCommandActions[command]
  let result: CreatorEditorCommandStatePatch | null = null
  const execute = createCreatorAgentExecutor({
    [actionName]: (parsedInput: { targetId: string }) => {
      result = runEditorWritingCommandFlow({ command, context })
      return {
        kind: writingCommandKinds[command],
        targetId: parsedInput.targetId,
        recordId: `editor-candidate:${command}:${targetId}`,
        messageCode: result ? 'candidate_ready' : 'candidate_rejected',
      }
    },
  })
  const execution = await execute({
    actionName,
    input: writingCommandInput(command, targetId),
  })
  return { ok: execution.status === 'succeeded', result }
}

export async function runEditorAssistCandidateAdoptionThroughAgent({
  candidate,
  content,
  targetId,
}: {
  candidate: EditorAssistCandidate
  content: string
  targetId: string
}): Promise<EditorAgentExecutionResult<CreatorEditorCandidateStatePatch>> {
  let result: CreatorEditorCandidateStatePatch | null = null
  const candidateId = `editor-assist:${candidate.id}:${targetId}`
  const execute = createCreatorAgentExecutor({
    apply_suggestion: parsedInput => {
      result = resolveEditorAssistCandidateAdoptionFlow({ candidate, content })
      return {
        kind: 'candidate_adopted',
        targetId: parsedInput.targetId,
        recordId: candidateId,
        messageCode: 'candidate_insert',
      }
    },
  })
  const requested = await execute({
    actionName: 'apply_suggestion',
    input: {
      route: '/creator/write/:draftId',
      targetId,
      candidateId,
      draftId: targetId,
      adoptionMode: 'insert',
    },
  })
  if (requested.status !== 'awaiting_confirmation') return { ok: false, result }
  const confirmed = await confirmCreatorAgentConfirmation(requested.receipt.id)
  if (!confirmed.ok) return { ok: false, result }
  const execution = await execute({
    actionName: 'apply_suggestion',
    input: {
      route: '/creator/write/:draftId',
      targetId,
      candidateId,
      draftId: targetId,
      adoptionMode: 'insert',
    },
    operationId: requested.operationId,
    confirmationReceiptId: requested.receipt.id,
  })
  return { ok: execution.status === 'succeeded', result }
}

export async function runEditorDraftOpenThroughAgent(
  draft: PmfLocalDraft,
): Promise<EditorAgentExecutionResult<CreatorEditorDraftStatePatch>> {
  let result: CreatorEditorDraftStatePatch | null = null
  const execute = createCreatorAgentExecutor({
    open_draft: parsedInput => {
      result = resolveEditorDraftOpenStatePatch(resolveEditorDraftOpen(draft))
      return {
        kind: 'draft_opened',
        targetId: parsedInput.targetId,
        recordId: draft.localDraftRef,
        messageCode: 'draft_opened',
      }
    },
  })
  const execution = await execute({
    actionName: 'open_draft',
    input: {
      route: '/creator/write/:draftId',
      targetId: draft.localDraftRef,
      draftId: draft.localDraftRef,
    },
  })
  return { ok: execution.status === 'succeeded', result }
}

export async function runEditorDraftSaveThroughAgent(
  input: RunEditorManualDraftSubmitFlowInput,
): Promise<EditorAgentExecutionResult<RunEditorManualDraftSubmitFlowResult>> {
  const targetId = draftExecutionTarget(input)
  let result: RunEditorManualDraftSubmitFlowResult | null = null
  const execute = createCreatorAgentExecutor({
    save_local_draft: async parsedInput => {
      result = await runEditorManualDraftSubmitFlow(input)
      return {
        kind: 'draft_saved',
        targetId: parsedInput.targetId,
        recordId: result.draft?.localDraftRef,
        messageCode: result.draft ? 'draft_saved' : 'draft_save_rejected',
      }
    },
  })
  const execution = await execute({
    actionName: 'save_local_draft',
    input: {
      route: '/creator/write/:draftId',
      targetId,
      draftId: targetId,
    },
  })
  return {
    ok: execution.status === 'succeeded',
    result,
  }
}

export async function runEditorPublishCheckThroughAgent(
  input: RunEditorPublishCheckSubmitFlowInput,
): Promise<EditorAgentExecutionResult<RunEditorPublishCheckSubmitFlowResult>> {
  const targetId = draftExecutionTarget(input)
  let result: RunEditorPublishCheckSubmitFlowResult | null = null
  const execute = createCreatorAgentExecutor({
    enter_publish_check: async parsedInput => {
      result = await runEditorPublishCheckSubmitFlow(input)
      return {
        kind: 'publish_handoff_ready',
        targetId: parsedInput.targetId,
        recordId: result.handoff?.bundleDraftId,
        messageCode: result.handoff ? 'publish_handoff_ready' : 'publish_handoff_rejected',
      }
    },
  })
  const execution = await execute({
    actionName: 'enter_publish_check',
    input: {
      route: '/creator/write/:draftId',
      targetId,
      draftId: targetId,
    },
  })
  return {
    ok: execution.status === 'succeeded',
    result,
  }
}
