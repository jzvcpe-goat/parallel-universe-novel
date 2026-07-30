import { createCreatorAgentExecutor } from '@/agent-surface/executor'
import { confirmCreatorAgentConfirmation } from '@/agent-surface/confirmation'
import { rejectHistoricalStateBackfillProposal } from '@/features/creator-decision/historicalStateBackfill'
import type {
  HistoricalStateBackfillCommitResult,
  HistoricalStateBackfillProposal,
} from '@/features/creator-decision/types'
import { creatorLocalDecisionRepository } from '@/local-db/creatorLocalDecisionRepository'

interface HistoricalStateAgentExecutionResult<Result> {
  ok: boolean
  result: Result | null
}

export async function runHistoricalStateImportThroughAgent(input: {
  workId: string
  proposals: HistoricalStateBackfillProposal[]
}): Promise<HistoricalStateAgentExecutionResult<HistoricalStateBackfillProposal[]>> {
  let result: HistoricalStateBackfillProposal[] | null = null
  const execute = createCreatorAgentExecutor({
    import_historical_state_candidate: async parsedInput => {
      const matching = input.proposals.filter(proposal => (
        proposal.workId === parsedInput.workId
        && parsedInput.proposalIds.includes(proposal.id)
      ))
      for (const proposal of matching) {
        await creatorLocalDecisionRepository.saveHistoricalStateBackfill(proposal)
      }
      result = matching
      return {
        kind: 'historical_state_candidate_imported',
        targetId: parsedInput.targetId,
        recordId: matching[0]?.id,
        messageCode: 'historical_state_candidates_imported',
      }
    },
  })
  const execution = await execute({
    actionName: 'import_historical_state_candidate',
    input: {
      route: '/creator/editor',
      targetId: input.workId,
      workId: input.workId,
      proposalIds: input.proposals.map(proposal => proposal.id),
    },
  })
  return { ok: execution.status === 'succeeded', result }
}

export async function runHistoricalStateConfirmThroughAgent(
  proposal: HistoricalStateBackfillProposal,
): Promise<HistoricalStateAgentExecutionResult<HistoricalStateBackfillCommitResult>> {
  let result: HistoricalStateBackfillCommitResult | null = null
  const execute = createCreatorAgentExecutor({
    confirm_historical_state_candidate: async parsedInput => {
      result = await creatorLocalDecisionRepository.commitHistoricalStateBackfill({
        proposal,
        currentCanon: null,
        authorConfirmed: true,
        confirmedAt: new Date().toISOString(),
      })
      return {
        kind: 'historical_state_candidate_confirmed',
        targetId: parsedInput.targetId,
        recordId: proposal.id,
        messageCode: 'historical_state_candidate_confirmed',
      }
    },
  })
  const input = {
    route: '/creator/editor',
    targetId: proposal.id,
    proposalId: proposal.id,
  }
  const request = await execute({
    actionName: 'confirm_historical_state_candidate',
    input,
  })
  if (request.status !== 'awaiting_confirmation') return { ok: false, result }
  const confirmed = await confirmCreatorAgentConfirmation(request.receipt.id)
  if (!confirmed.ok) return { ok: false, result }
  const execution = await execute({
    actionName: 'confirm_historical_state_candidate',
    input,
    operationId: request.operationId,
    confirmationReceiptId: request.receipt.id,
  })
  return { ok: execution.status === 'succeeded', result }
}

export async function runHistoricalStateRejectThroughAgent(
  proposal: HistoricalStateBackfillProposal,
): Promise<HistoricalStateAgentExecutionResult<HistoricalStateBackfillProposal>> {
  let result: HistoricalStateBackfillProposal | null = null
  const execute = createCreatorAgentExecutor({
    reject_historical_state_candidate: async parsedInput => {
      result = rejectHistoricalStateBackfillProposal(proposal)
      await creatorLocalDecisionRepository.saveHistoricalStateBackfill(result)
      return {
        kind: 'historical_state_candidate_rejected',
        targetId: parsedInput.targetId,
        recordId: proposal.id,
        messageCode: 'historical_state_candidate_rejected',
      }
    },
  })
  const input = {
    route: '/creator/editor',
    targetId: proposal.id,
    proposalId: proposal.id,
  }
  const request = await execute({
    actionName: 'reject_historical_state_candidate',
    input,
  })
  if (request.status !== 'awaiting_confirmation') return { ok: false, result }
  const confirmed = await confirmCreatorAgentConfirmation(request.receipt.id)
  if (!confirmed.ok) return { ok: false, result }
  const execution = await execute({
    actionName: 'reject_historical_state_candidate',
    input,
    operationId: request.operationId,
    confirmationReceiptId: request.receipt.id,
  })
  return { ok: execution.status === 'succeeded', result }
}
