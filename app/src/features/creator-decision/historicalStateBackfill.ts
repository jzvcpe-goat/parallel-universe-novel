import {
  applyStatePatchOperations,
  readStatePathValue,
} from './canonPatch'
import { normalizeCharacterStatePath } from './characterState'
import { historicalStateBackfillProposalSchema } from './schemas'
import { creationDecisionEvent } from './stateMachine'
import type {
  HistoricalStateBackfillCommitInput,
  HistoricalStateBackfillCommitResult,
  HistoricalStateBackfillProposal,
  LocalCanonStateRecord,
  StatePatchOperation,
} from './types'
import { CreationDecisionError } from './types'

const allowedStateRoots = new Set([
  'characters',
  'timeline',
  'causal',
  'promises',
  'foreshadowing',
])

function stateRoot(path: string) {
  if (!path.startsWith('/')) return null
  return path.slice(1).split('/')[0]?.replace(/~1/g, '/').replace(/~0/g, '~') || null
}

function assertAcceptedHistoricalManuscript(canon: LocalCanonStateRecord) {
  if (!canon.acceptedDraftId || canon.acceptedDraftRevision < 1 || canon.acceptedContentBlocks.length === 0) {
    throw new CreationDecisionError(
      'evidence_missing',
      'Historical state backfill requires an already accepted local manuscript.',
    )
  }
}

function assertBackfillPath(path: string) {
  const root = stateRoot(path)
  if (!root || !allowedStateRoots.has(root)) {
    throw new CreationDecisionError(
      'expected_value_conflict',
      `Historical state backfill cannot target ${path}.`,
    )
  }
}

function assertBackfillEvidence(
  canon: LocalCanonStateRecord,
  operations: StatePatchOperation[],
) {
  if (operations.length === 0) {
    throw new CreationDecisionError(
      'evidence_missing',
      'Historical state backfill requires at least one manuscript-grounded state change.',
    )
  }
  const acceptedBlockIds = new Set(canon.acceptedContentBlocks.map(block => block.id))
  for (const operation of operations) {
    assertBackfillPath(operation.path)
    if (
      operation.evidenceBlockIds.length === 0
      || operation.evidenceBlockIds.some(blockId => !acceptedBlockIds.has(blockId))
    ) {
      throw new CreationDecisionError(
        'evidence_missing',
        'Every historical state change must point to the accepted manuscript.',
      )
    }
  }
}

function bindOperationsToCanon(
  canon: LocalCanonStateRecord,
  operations: StatePatchOperation[],
) {
  return operations.map(operation => {
    const path = normalizeCharacterStatePath(operation.path)
    assertBackfillPath(path)
    return {
      ...operation,
      path,
      expectedPreviousValue: readStatePathValue(canon.state, path),
    }
  })
}

export function createHistoricalStateBackfillProposal(input: {
  id: string
  sessionId: string
  canon: LocalCanonStateRecord
  operations: StatePatchOperation[]
  createdAt: string
}): HistoricalStateBackfillProposal {
  assertAcceptedHistoricalManuscript(input.canon)
  const operations = bindOperationsToCanon(input.canon, input.operations)
  assertBackfillEvidence(input.canon, operations)
  return historicalStateBackfillProposalSchema.parse({
    schemaVersion: 'historical-state-backfill.v1',
    id: input.id,
    sessionId: input.sessionId,
    workId: input.canon.workId,
    chapterId: input.canon.chapterId,
    branchId: input.canon.branchId,
    canonId: input.canon.id,
    baseCanonRevision: input.canon.revision,
    sourceDraftId: input.canon.acceptedDraftId,
    sourceDraftRevision: input.canon.acceptedDraftRevision,
    status: 'proposed',
    operations,
    createdAt: input.createdAt,
    confirmedAt: null,
    committedAt: null,
  })
}

export function validateHistoricalStateBackfillCommit(input: HistoricalStateBackfillCommitInput) {
  if (!input.authorConfirmed) {
    throw new CreationDecisionError(
      'author_confirmation_required',
      'Author confirmation is required before historical state backfill.',
    )
  }
  if (input.proposal.status !== 'proposed') {
    throw new CreationDecisionError('stale_result', 'Only a pending historical state proposal can be committed.')
  }
  const canon = input.currentCanon
  if (!canon) {
    throw new CreationDecisionError('evidence_missing', 'The accepted historical manuscript is unavailable.')
  }
  assertAcceptedHistoricalManuscript(canon)
  if (
    input.proposal.canonId !== canon.id
    || input.proposal.workId !== canon.workId
    || input.proposal.chapterId !== canon.chapterId
    || input.proposal.branchId !== canon.branchId
    || input.proposal.baseCanonRevision !== canon.revision
  ) {
    throw new CreationDecisionError(
      'canon_revision_conflict',
      'Historical canon changed after this state proposal was prepared.',
    )
  }
  if (
    input.proposal.sourceDraftId !== canon.acceptedDraftId
    || input.proposal.sourceDraftRevision !== canon.acceptedDraftRevision
  ) {
    throw new CreationDecisionError(
      'draft_revision_conflict',
      'The accepted historical manuscript no longer matches this state proposal.',
    )
  }
  assertBackfillEvidence(canon, input.proposal.operations)
}

export function buildHistoricalStateBackfillCommitResult(
  input: HistoricalStateBackfillCommitInput,
): HistoricalStateBackfillCommitResult {
  validateHistoricalStateBackfillCommit(input)
  const currentCanon = input.currentCanon!
  const nextRevision = currentCanon.revision + 1
  const proposal: HistoricalStateBackfillProposal = {
    ...input.proposal,
    status: 'committed',
    confirmedAt: input.confirmedAt,
    committedAt: input.confirmedAt,
  }
  const canon: LocalCanonStateRecord = {
    ...currentCanon,
    revision: nextRevision,
    state: applyStatePatchOperations(currentCanon.state, proposal.operations),
  }
  const confirmationEvent = creationDecisionEvent({
    sessionId: proposal.sessionId,
    type: 'historical_state_backfill_confirmed',
    actor: 'author',
    sourceRevision: proposal.sourceDraftRevision,
    payload: {
      proposalId: proposal.id,
      canonId: proposal.canonId,
      sourceDraftId: proposal.sourceDraftId,
      operationCount: proposal.operations.length,
    },
    occurredAt: input.confirmedAt,
  })
  const event = creationDecisionEvent({
    sessionId: proposal.sessionId,
    type: 'historical_state_backfill_committed',
    actor: 'author',
    sourceRevision: nextRevision,
    payload: {
      proposalId: proposal.id,
      canonId: proposal.canonId,
      sourceDraftId: proposal.sourceDraftId,
      operationCount: proposal.operations.length,
    },
    occurredAt: input.confirmedAt,
  })
  return { proposal, canon, confirmationEvent, event }
}

export function rejectHistoricalStateBackfillProposal(
  proposal: HistoricalStateBackfillProposal,
): HistoricalStateBackfillProposal {
  if (proposal.status !== 'proposed') {
    throw new CreationDecisionError('stale_result', 'Only a pending historical state proposal can be rejected.')
  }
  return {
    ...proposal,
    status: 'rejected',
  }
}
