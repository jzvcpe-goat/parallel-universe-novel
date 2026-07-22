import { z } from 'zod'
import {
  isSupportedCharacterStatePath,
  normalizeCharacterStatePath,
  parseCharacterStatePath,
} from './characterState'
import type {
  ContextSnapshot,
  CreationSession,
  DraftBlock,
  StatePatchOperation,
} from './types'
import { CreationDecisionError } from './types'

export const characterStateEvidenceProposalSchema = z.object({
  path: z.string().refine(
    isSupportedCharacterStatePath,
    'state proposal path must target one of the 22 registered character state dimensions',
  ),
  value: z.string().min(1).max(240),
  reason: z.string().min(4).max(180),
  irreversible: z.boolean(),
  evidenceQuote: z.string().min(2).max(160),
  supportingEvidenceQuotes: z.array(z.string().min(2).max(160)).max(3).default([]),
}).strict().superRefine((proposal, context) => {
  const quotes = [proposal.evidenceQuote, ...(proposal.supportingEvidenceQuotes || [])]
  if (new Set(quotes).size !== quotes.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['supportingEvidenceQuotes'],
      message: 'state proposal evidence quotes must be distinct',
    })
  }
  const statePath = parseCharacterStatePath(proposal.path)
  if (statePath?.dimension !== 'knowledge' || proposal.irreversible) return
  context.addIssue({
    code: z.ZodIssueCode.custom,
    path: ['irreversible'],
    message: 'direct knowledge acquisition must be irreversible; uncertain interpretations belong in beliefs or falseBeliefs',
  })
})

export const continuityEvidenceProposalSchema = z.object({
  kind: z.enum(['timeline', 'causal', 'promise', 'foreshadowing']),
  sourceId: z.string().min(1).max(240).nullable(),
  status: z.enum(['created', 'advanced', 'fulfilled']),
  statement: z.string().min(4).max(300),
  reason: z.string().min(4).max(180),
  irreversible: z.boolean(),
  evidenceQuote: z.string().min(2).max(160),
  supportingEvidenceQuotes: z.array(z.string().min(2).max(160)).max(3).default([]),
}).strict().superRefine((proposal, context) => {
  const quotes = [proposal.evidenceQuote, ...(proposal.supportingEvidenceQuotes || [])]
  if (new Set(quotes).size !== quotes.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['supportingEvidenceQuotes'],
      message: 'continuity proposal evidence quotes must be distinct',
    })
  }
})

export const storyStateEvidenceOutputSchema = z.object({
  schemaVersion: z.literal('creator-state-evidence.v1'),
  characterStateProposals: z.array(characterStateEvidenceProposalSchema).max(8),
  continuityProposals: z.array(continuityEvidenceProposalSchema).max(8),
}).strict()

export type StoryStateEvidenceOutput = z.infer<typeof storyStateEvidenceOutputSchema>

export const storyStateEvidenceReviewIssueSchema = z.object({
  proposalKind: z.enum(['character', 'continuity']),
  proposalIndex: z.number().int().min(0).max(7),
  code: z.enum([
    'dimension_semantics',
    'evidence_overclaim',
    'knowledge_boundary',
    'temporal_scope',
    'causal_scope',
    'promise_or_foreshadowing',
    'irreversibility',
    'status_semantics',
  ]),
  evidenceQuote: z.string().min(2).max(180),
  diagnosis: z.string().min(4).max(320),
}).strict()

export const storyStateEvidenceReviewSchema = z.object({
  schemaVersion: z.literal('creator-state-evidence-review.v1'),
  decision: z.enum(['pass', 'reject']),
  verifiedCharacterProposalIndexes: z.array(z.number().int().min(0).max(7)).max(8),
  verifiedContinuityProposalIndexes: z.array(z.number().int().min(0).max(7)).max(8),
  issues: z.array(storyStateEvidenceReviewIssueSchema).max(16),
  rationale: z.string().min(4).max(320),
}).strict()

export type StoryStateEvidenceReview = z.infer<typeof storyStateEvidenceReviewSchema>

export interface StoryStateEvidenceContextBoundary {
  activeCharacters?: Array<{ id: string }>
  activePromises?: unknown[]
  unresolvedForeshadowing?: unknown[]
  manualRecallItems?: Array<{ sourceId: string; group: string }>
  currentCanonState?: Record<string, unknown>
}

function stableId(prefix: string, value: string) {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return `${prefix}:${Math.abs(hash >>> 0).toString(36)}`
}

function pointerSegment(value: string) {
  return value.replace(/~/g, '~0').replace(/\//g, '~1')
}

function recordIds(value: unknown) {
  const ids = new Set<string>()
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== 'object') continue
      const record = item as Record<string, unknown>
      for (const key of ['id', 'sourceId']) {
        if (typeof record[key] === 'string' && record[key]) ids.add(record[key])
      }
    }
    return ids
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value as Record<string, unknown>)) ids.add(key)
  }
  return ids
}

function canonCollection(context: StoryStateEvidenceContextBoundary, key: string) {
  const state = context.currentCanonState
  return state && typeof state === 'object' ? state[key] : undefined
}

export function assertStoryStateEvidenceContextBoundary(input: {
  result: StoryStateEvidenceOutput
  session: CreationSession
  context: StoryStateEvidenceContextBoundary | Pick<ContextSnapshot, 'activeCharacters' | 'activePromises' | 'unresolvedForeshadowing' | 'manualRecallItems'>
}) {
  const characterIds = new Set(input.context.activeCharacters?.map(character => character.id) || [])
  for (const characterId of recordIds(canonCollection(input.context, 'characters'))) characterIds.add(characterId)
  for (const proposal of input.result.characterStateProposals) {
    const statePath = parseCharacterStatePath(proposal.path)
    if (!statePath || !characterIds.has(statePath.characterId)) {
      throw new CreationDecisionError(
        'model_output_invalid',
        `State evidence targets a character outside the current Context Snapshot: ${proposal.path}`,
      )
    }
  }

  const manualPromiseIds = new Set(
    (input.context.manualRecallItems || [])
      .filter(item => item.group === 'promise')
      .map(item => item.sourceId),
  )
  const promiseIds = recordIds(input.context.activePromises)
  const foreshadowingIds = recordIds(input.context.unresolvedForeshadowing)
  for (const id of recordIds(canonCollection(input.context, 'promises'))) promiseIds.add(id)
  for (const id of recordIds(canonCollection(input.context, 'foreshadowing'))) foreshadowingIds.add(id)
  for (const id of manualPromiseIds) {
    promiseIds.add(id)
    foreshadowingIds.add(id)
  }

  for (const proposal of input.result.continuityProposals) {
    if (proposal.kind === 'timeline' || proposal.kind === 'causal') {
      if (proposal.sourceId !== null && proposal.sourceId !== input.session.chapterId) {
        throw new CreationDecisionError(
          'model_output_invalid',
          `${proposal.kind} evidence cannot reuse an unrelated source id: ${proposal.sourceId}`,
        )
      }
      continue
    }
    if (proposal.status === 'created') {
      if (proposal.sourceId !== null) {
        throw new CreationDecisionError(
          'model_output_invalid',
          `New ${proposal.kind} evidence must not claim an existing source id.`,
        )
      }
      continue
    }
    const allowedIds = proposal.kind === 'promise' ? promiseIds : foreshadowingIds
    if (proposal.sourceId === null || !allowedIds.has(proposal.sourceId)) {
      throw new CreationDecisionError(
        'model_output_invalid',
        `${proposal.kind} evidence references a source outside the current Context Snapshot: ${proposal.sourceId || 'null'}`,
      )
    }
  }
}

function evidenceBlock(blocks: DraftBlock[], quote: string) {
  const block = blocks.find(item => item.text.includes(quote))
  if (block) return block
  throw new CreationDecisionError(
    'evidence_missing',
    `State proposal evidence is not present in the current manuscript: ${quote}`,
  )
}

function proposalEvidenceQuotes(proposal: {
  evidenceQuote: string
  supportingEvidenceQuotes?: string[]
}) {
  return [proposal.evidenceQuote, ...(proposal.supportingEvidenceQuotes || [])]
}

function proposalEvidenceBlockIds(
  blocks: DraftBlock[],
  proposal: { evidenceQuote: string; supportingEvidenceQuotes?: string[] },
) {
  return Array.from(new Set(
    proposalEvidenceQuotes(proposal).map(quote => evidenceBlock(blocks, quote).id),
  ))
}

function continuityPath(
  session: CreationSession,
  proposal: StoryStateEvidenceOutput['continuityProposals'][number],
) {
  const sourceId = proposal.sourceId || (
    proposal.kind === 'timeline' || proposal.kind === 'causal'
      ? session.chapterId
      : stableId(proposal.kind, proposal.statement)
  )
  const root = proposal.kind === 'promise' ? 'promises' : proposal.kind
  const leaf = proposal.kind === 'timeline' || proposal.kind === 'causal' ? 'outcome' : 'status'
  return `/${root}/${pointerSegment(sourceId)}/${leaf}`
}

export function buildStoryStateEvidenceOperations(input: {
  result: StoryStateEvidenceOutput
  session: CreationSession
  blocks: DraftBlock[]
  context: StoryStateEvidenceContextBoundary | Pick<ContextSnapshot, 'activeCharacters' | 'activePromises' | 'unresolvedForeshadowing' | 'manualRecallItems'>
}): StatePatchOperation[] {
  assertStoryStateEvidenceContextBoundary(input)
  const characterOperations = input.result.characterStateProposals.map<StatePatchOperation>(proposal => ({
    op: 'add',
    path: normalizeCharacterStatePath(proposal.path),
    value: proposal.value,
    evidenceBlockIds: proposalEvidenceBlockIds(input.blocks, proposal),
    reason: proposal.reason,
    irreversible: proposal.irreversible,
  }))
  const continuityOperations = input.result.continuityProposals.map<StatePatchOperation>(proposal => ({
    op: 'add',
    path: continuityPath(input.session, proposal),
    value: {
      status: proposal.status,
      statement: proposal.statement,
    },
    evidenceBlockIds: proposalEvidenceBlockIds(input.blocks, proposal),
    reason: proposal.reason,
    irreversible: proposal.irreversible,
  }))
  return [...characterOperations, ...continuityOperations]
}

export function mergeStoryStateOperations(
  existing: StatePatchOperation[],
  extracted: StatePatchOperation[],
) {
  const byPath = new Map(existing.map(operation => [operation.path, operation]))
  for (const operation of extracted) byPath.set(operation.path, operation)
  return Array.from(byPath.values())
}

export function assertDistinctStoryStateOperationPaths(operations: StatePatchOperation[]) {
  const seen = new Set<string>()
  for (const operation of operations) {
    if (seen.has(operation.path)) {
      throw new CreationDecisionError(
        'model_output_invalid',
        `State evidence contains more than one proposal for ${operation.path}.`,
      )
    }
    seen.add(operation.path)
  }
}

function completeIndexCoverage(actual: number[], length: number) {
  if (new Set(actual).size !== actual.length) return false
  if (actual.length !== length) return false
  return actual.every((value, index) => value === index)
}

function proposalForReviewIssue(
  evidence: StoryStateEvidenceOutput,
  issue: StoryStateEvidenceReview['issues'][number],
) {
  return issue.proposalKind === 'character'
    ? evidence.characterStateProposals[issue.proposalIndex]
    : evidence.continuityProposals[issue.proposalIndex]
}

export function validateStoryStateEvidenceReview(input: {
  evidence: StoryStateEvidenceOutput
  review: StoryStateEvidenceReview
}) {
  const characterIndexes = [...input.review.verifiedCharacterProposalIndexes].sort((left, right) => left - right)
  const continuityIndexes = [...input.review.verifiedContinuityProposalIndexes].sort((left, right) => left - right)
  if (
    new Set(characterIndexes).size !== characterIndexes.length
    || new Set(continuityIndexes).size !== continuityIndexes.length
    || characterIndexes.some(index => index >= input.evidence.characterStateProposals.length)
    || continuityIndexes.some(index => index >= input.evidence.continuityProposals.length)
  ) {
    throw new CreationDecisionError(
      'model_output_invalid',
      'State evidence review contains duplicate or unknown verification indexes.',
    )
  }
  for (const issue of input.review.issues) {
    const proposal = proposalForReviewIssue(input.evidence, issue)
    if (
      !proposal
      || !proposalEvidenceQuotes(proposal).some(quote => quote.includes(issue.evidenceQuote))
    ) {
      throw new CreationDecisionError(
        'evidence_missing',
        'Every state evidence review issue must locate the proposal evidence quote.',
      )
    }
  }

  if (input.review.decision === 'pass') {
    if (input.review.issues.length > 0) {
      throw new CreationDecisionError('model_output_invalid', 'A passing state evidence review cannot contain issues.')
    }
    if (
      !completeIndexCoverage(characterIndexes, input.evidence.characterStateProposals.length)
      || !completeIndexCoverage(continuityIndexes, input.evidence.continuityProposals.length)
    ) {
      throw new CreationDecisionError(
        'model_output_invalid',
        'A passing state evidence review must verify every proposal index.',
      )
    }
    return true
  }

  if (input.review.issues.length === 0) {
    throw new CreationDecisionError('model_output_invalid', 'A rejected state evidence review must contain an issue.')
  }
  const issueCharacterIndexes = new Set<number>()
  const issueContinuityIndexes = new Set<number>()
  for (const issue of input.review.issues) {
    const verified = issue.proposalKind === 'character' ? characterIndexes : continuityIndexes
    if (verified.includes(issue.proposalIndex)) {
      throw new CreationDecisionError(
        'model_output_invalid',
        'A rejected state proposal cannot be both verified and reported as an issue.',
      )
    }
    const issueIndexes = issue.proposalKind === 'character' ? issueCharacterIndexes : issueContinuityIndexes
    issueIndexes.add(issue.proposalIndex)
  }
  const reviewedCharacterIndexes = new Set([...characterIndexes, ...issueCharacterIndexes])
  const reviewedContinuityIndexes = new Set([...continuityIndexes, ...issueContinuityIndexes])
  if (
    reviewedCharacterIndexes.size !== input.evidence.characterStateProposals.length
    || reviewedContinuityIndexes.size !== input.evidence.continuityProposals.length
  ) {
    throw new CreationDecisionError(
      'model_output_invalid',
      'A rejected state evidence review must account for every proposal.',
    )
  }
  return false
}
