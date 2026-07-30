import type {
  CanonCommitInput,
  CanonCommitResult,
  CanonStatePatch,
  CreationSession,
  LocalCanonStateRecord,
  StatePatchOperation,
} from './types'
import { CreationDecisionError } from './types'
import {
  normalizeCharacterStatePath,
  parseCharacterStatePath,
} from './characterState'
import { assertCandidateQualityGate } from './candidateQualityGate'
import { creationDecisionEvent, transitionCreationSession } from './stateMachine'

function pointerParts(path: string) {
  if (!path.startsWith('/')) throw new CreationDecisionError('expected_value_conflict', `Invalid state path: ${path}`)
  return path.slice(1).split('/').filter(Boolean).map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'))
}

export function readStatePathValue(root: Record<string, unknown>, path: string) {
  let current: unknown = root
  for (const part of pointerParts(path)) {
    if (!current || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function deepEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function applyStatePatchOperations(
  currentState: Record<string, unknown>,
  operations: StatePatchOperation[],
) {
  const next = structuredClone(currentState)
  for (const operation of operations) {
    const normalizedPath = normalizeCharacterStatePath(operation.path)
    if (operation.path.startsWith('/characters/') && !parseCharacterStatePath(operation.path)) {
      throw new CreationDecisionError('expected_value_conflict', `Unsupported character state path: ${operation.path}`)
    }
    if ('expectedPreviousValue' in operation) {
      const actual = readStatePathValue(next, normalizedPath)
      if (!deepEqual(actual, operation.expectedPreviousValue)) {
        throw new CreationDecisionError('expected_value_conflict', `State changed at ${normalizedPath}.`)
      }
    }
    const parts = pointerParts(normalizedPath)
    const leaf = parts.pop()
    if (!leaf) throw new CreationDecisionError('expected_value_conflict', 'Root state replacement is forbidden.')
    let owner: Record<string, unknown> = next
    for (const part of parts) {
      const value = owner[part]
      if (!value || typeof value !== 'object' || Array.isArray(value)) owner[part] = {}
      owner = owner[part] as Record<string, unknown>
    }
    if (operation.op === 'remove') delete owner[leaf]
    else owner[leaf] = operation.value
  }
  return next
}

export function validateCanonCommit(input: CanonCommitInput) {
  if (!input.authorConfirmed) {
    throw new CreationDecisionError('author_confirmation_required', 'Author confirmation is required before canon commit.')
  }
  const currentCanonRevision = input.currentCanon?.revision || 0
  if (input.patch.baseCanonRevision !== currentCanonRevision || input.session.baseCanonRevision !== currentCanonRevision) {
    throw new CreationDecisionError('canon_revision_conflict', 'Canon changed after this patch was prepared.')
  }
  if (
    input.patch.sourceDraftRevision !== input.draft.revision
    || input.session.currentDraftRevision !== input.draft.revision
  ) {
    throw new CreationDecisionError('draft_revision_conflict', 'The accepted manuscript revision no longer matches the patch.')
  }
  if (input.patch.status === 'stale' || input.review.status === 'stale' || input.draft.status === 'stale') {
    throw new CreationDecisionError('stale_result', 'Stale creation results cannot enter canon.')
  }
  assertCandidateQualityGate({
    session: input.session,
    intent: input.intent,
    context: input.context,
    draft: input.draft,
    review: input.review,
    repairs: input.repairs,
  })
  if (input.patch.operations.length === 0) {
    throw new CreationDecisionError(
      'evidence_missing',
      'Canon commit requires at least one manuscript-grounded state change.',
    )
  }
  const evidenceIds = new Set(input.draft.contentBlocks.map(block => block.id))
  if (input.patch.operations.some(operation => (
    operation.evidenceBlockIds.length === 0
    || operation.evidenceBlockIds.some(blockId => !evidenceIds.has(blockId))
  ))) {
    throw new CreationDecisionError('evidence_missing', 'Every canon change must point to current manuscript evidence.')
  }
}

export function buildCanonCommitResult(input: CanonCommitInput): CanonCommitResult {
  validateCanonCommit(input)
  const currentState = input.currentCanon?.state || {}
  const nextRevision = (input.currentCanon?.revision || 0) + 1
  const committedPatch: CanonStatePatch = {
    ...input.patch,
    status: 'committed',
  }
  const canon: LocalCanonStateRecord = {
    schemaVersion: 'local-canon-state.v1',
    id: `local-canon:${input.session.workId}:${input.session.chapterId}`,
    workId: input.session.workId,
    chapterId: input.session.chapterId,
    branchId: input.session.branchId,
    revision: nextRevision,
    acceptedDraftId: input.draft.draftId,
    acceptedDraftRevision: input.draft.revision,
    acceptedContentBlocks: input.draft.contentBlocks,
    state: applyStatePatchOperations(currentState, input.patch.operations),
    committedPatchId: input.patch.id,
    committedAt: input.confirmedAt,
  }
  const session: CreationSession = {
    ...transitionCreationSession(input.session, 'canon_committed', input.confirmedAt),
    baseCanonRevision: nextRevision,
    proposedCanonPatchId: null,
  }
  const confirmationEvent = creationDecisionEvent({
    sessionId: session.id,
    type: 'canon_patch_confirmed',
    actor: 'author',
    sourceRevision: input.draft.revision,
    payload: {
      patchId: committedPatch.id,
      draftId: input.draft.draftId,
      operationCount: committedPatch.operations.length,
    },
    occurredAt: input.confirmedAt,
  })
  const event = creationDecisionEvent({
    sessionId: session.id,
    type: 'canon_patch_committed',
    actor: 'author',
    sourceRevision: nextRevision,
    payload: {
      patchId: committedPatch.id,
      draftId: input.draft.draftId,
      operationCount: committedPatch.operations.length,
    },
    occurredAt: input.confirmedAt,
  })
  return { session, patch: committedPatch, canon, confirmationEvent, event }
}
