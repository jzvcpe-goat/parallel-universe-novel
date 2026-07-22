import { createHistoricalStateBackfillProposal } from './historicalStateBackfill'
import {
  requestStoryStateEvidenceFromWorkingAgent,
  requestStoryStateEvidenceReviewFromWorkingAgent,
} from './localWorkingAgent'
import {
  assertDistinctStoryStateOperationPaths,
  buildStoryStateEvidenceOperations,
  type StoryStateEvidenceOutput,
  type StoryStateEvidenceReview,
  validateStoryStateEvidenceReview,
} from './storyStateEvidence'
import type {
  CreationSession,
  CreationDecisionErrorCode,
  HistoricalStateBackfillProposal,
  LocalCanonStateRecord,
} from './types'
import { CreationDecisionError } from './types'

type StateEvidenceRequester = typeof requestStoryStateEvidenceFromWorkingAgent
type StateEvidenceReviewer = typeof requestStoryStateEvidenceReviewFromWorkingAgent

function stateCollection(state: Record<string, unknown>, key: 'promises' | 'foreshadowing') {
  const value = state[key]
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value as Record<string, unknown>).map(([sourceId, entry]) => ({ sourceId, entry }))
}

export interface HistoricalStateBackfillAgentResult {
  evidence: StoryStateEvidenceOutput
  review: StoryStateEvidenceReview | null
  proposal: HistoricalStateBackfillProposal | null
  semanticRevisionCount: number
  reviewValidationError: {
    code: CreationDecisionErrorCode
    message: string
  } | null
}

export async function proposeHistoricalStateBackfillWithWorkingAgent(input: {
  baseUrl: string
  proposalId: string
  session: CreationSession
  canon: LocalCanonStateRecord
  createdAt: string
  requestEvidence?: StateEvidenceRequester
  requestReview?: StateEvidenceReviewer
}): Promise<HistoricalStateBackfillAgentResult> {
  if (
    input.session.workId !== input.canon.workId
    || input.session.chapterId !== input.canon.chapterId
    || input.session.branchId !== input.canon.branchId
  ) {
    throw new CreationDecisionError(
      'canon_revision_conflict',
      'The historical writing session does not match the accepted canon record.',
    )
  }
  const requestEvidence = input.requestEvidence || requestStoryStateEvidenceFromWorkingAgent
  const requestReview = input.requestReview || requestStoryStateEvidenceReviewFromWorkingAgent
  const basePayload = {
    session: input.session,
    context: {
      currentCanonState: input.canon.state,
      activePromises: stateCollection(input.canon.state, 'promises'),
      unresolvedForeshadowing: stateCollection(input.canon.state, 'foreshadowing'),
      manualRecallItems: [],
    },
    draft: {
      draftId: input.canon.acceptedDraftId,
      revision: input.canon.acceptedDraftRevision,
      contentBlocks: input.canon.acceptedContentBlocks,
    },
  }
  let evidence = await requestEvidence({
    baseUrl: input.baseUrl,
    payload: {
      mode: 'historical_state_backfill',
      ...basePayload,
    },
  })
  for (let semanticRevisionCount = 0; semanticRevisionCount <= 1; semanticRevisionCount += 1) {
    const operations = buildStoryStateEvidenceOperations({
      result: evidence,
      session: input.session,
      blocks: input.canon.acceptedContentBlocks,
      context: basePayload.context,
    })
    if (operations.length === 0) {
      return {
        evidence,
        review: null,
        proposal: null,
        semanticRevisionCount,
        reviewValidationError: null,
      }
    }
    const review = await requestReview({
      baseUrl: input.baseUrl,
      payload: {
        mode: semanticRevisionCount === 0
          ? 'historical_state_backfill'
          : 'historical_state_backfill_semantic_revision',
        ...basePayload,
        evidence,
      },
    })
    let reviewPassed = false
    try {
      reviewPassed = validateStoryStateEvidenceReview({ evidence, review })
    } catch (error) {
      if (!(error instanceof CreationDecisionError)) throw error
      return {
        evidence,
        review,
        proposal: null,
        semanticRevisionCount,
        reviewValidationError: {
          code: error.code,
          message: error.message,
        },
      }
    }
    if (reviewPassed) {
      assertDistinctStoryStateOperationPaths(operations)
      return {
        evidence,
        review,
        proposal: createHistoricalStateBackfillProposal({
          id: input.proposalId,
          sessionId: input.session.id,
          canon: input.canon,
          operations,
          createdAt: input.createdAt,
        }),
        semanticRevisionCount,
        reviewValidationError: null,
      }
    }
    if (semanticRevisionCount === 1) {
      return {
        evidence,
        review,
        proposal: null,
        semanticRevisionCount,
        reviewValidationError: null,
      }
    }
    evidence = await requestEvidence({
      baseUrl: input.baseUrl,
      payload: {
        mode: 'historical_state_backfill_semantic_revision',
        ...basePayload,
        previousEvidence: evidence,
        stateEvidenceReview: review,
      },
    })
  }
  throw new CreationDecisionError('model_output_invalid', 'Historical state review exceeded its bounded revision path.')
}
