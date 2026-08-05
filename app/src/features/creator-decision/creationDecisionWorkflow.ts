import {
  mergeCandidateSearchAttempts,
  mixNarrativeCandidates,
  selectNarrativeCandidate,
} from './candidateSearch'
import { assertCandidateQualityGate } from './candidateQualityGate'
import {
  activeHardBlockFindings,
  applyRepairProposal,
  createRepairProposal,
  hasCompleteLocalRepairVerification,
} from './literaryReview'
import {
  localRepairFindingEvidenceIsCurrent,
  resolveLocalRepairFinding,
} from './advisoryCraftRepairAdapter'
import {
  draftBlocksFromText,
  draftTextFromBlocks,
  markDraftResultFreshness,
  withoutSceneDraftDirectionReceipt,
} from './sceneDrafting'
import {
  answerIntentQuestion,
  creationDecisionEvent,
  lockAuthorIntent,
  propagateInvalidation,
  reopenAuthorIntent,
  transitionCreationSession,
} from './stateMachine'
import {
  contextMatchesCurrentSource,
  contextSnapshotIntegrityIsCurrent,
} from './contextCompiler'
import { sceneAuthorDecisionRequiredSchema } from './schemas'
import {
  pendingSceneAuthorDecision,
  reviseIntentFromSceneAuthorDecision,
} from './sceneAuthorDecision'
import type {
  AuthorIntentContract,
  CandidateSearchResult,
  CanonCommitResult,
  ContextSnapshot,
  CreationContextSource,
  CreationDecisionRepository,
  CreationDecisionSnapshot,
  CreationSession,
  DraftBlock,
  IntentQuestion,
  LiteraryDimension,
  LocalRepairFinding,
  LocalRepairCandidate,
  LocalRepairReview,
  SceneDraftRequest,
  SceneDraftResult,
  SceneAuthorDecisionSelection,
  WritingAssistLensId,
  WritingAgentCapabilities,
} from './types'
import type {
  CharacterSimulationRequest,
  CharacterSimulationResult,
} from './characterSimulation'
import { CreationDecisionError } from './types'
import {
  isAdvisoryLensId,
  isLiteraryDimension,
  recommendWritingAssistLenses,
} from './writingAssistance'
import type { CreatorWritingAssistPreferences } from './types'

function randomId(prefix: string) {
  const value = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}:${value}`
}

function newestByRevision<T extends { revision: number }>(items: T[]) {
  return [...items].sort((left, right) => right.revision - left.revision)[0] || null
}

function newestByCreatedAt<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] || null
}

export function currentAuthorIntent(snapshot: CreationDecisionSnapshot) {
  if (snapshot.session.lockedIntentId) {
    const locked = snapshot.intents.find(intent => intent.id === snapshot.session.lockedIntentId)
    if (locked) return locked
  }
  return newestByRevision(snapshot.intents.filter(intent => intent.status !== 'superseded'))
}

export function currentContextSnapshot(snapshot: CreationDecisionSnapshot) {
  return newestByCreatedAt(snapshot.contexts.filter(context => context.status === 'active'))
}

export function selectedNarrativeCandidate(snapshot: CreationDecisionSnapshot) {
  return snapshot.candidates.find(candidate => candidate.id === snapshot.session.selectedCandidateId) || null
}

export function activeSceneDraft(snapshot: CreationDecisionSnapshot) {
  if (snapshot.session.activeDraftId) {
    const selected = snapshot.drafts.find(draft => draft.draftId === snapshot.session.activeDraftId)
    if (selected) return selected
  }
  return null
}

export function activeLiteraryReview(snapshot: CreationDecisionSnapshot) {
  if (snapshot.session.activeReviewId) {
    const selected = snapshot.reviews.find(review => review.id === snapshot.session.activeReviewId)
    if (selected) return selected
  }
  return newestByCreatedAt(snapshot.reviews.filter(review => review.status === 'active'))
}

export function activeCanonPatch(snapshot: CreationDecisionSnapshot) {
  if (snapshot.session.proposedCanonPatchId) {
    const selected = snapshot.patches.find(patch => patch.id === snapshot.session.proposedCanonPatchId)
    if (selected?.status === 'proposed') return selected
  }
  return newestByCreatedAt(snapshot.patches.filter(patch => patch.status === 'proposed'))
}

async function persistInvalidated(
  repository: CreationDecisionRepository,
  invalidated: ReturnType<typeof propagateInvalidation>,
) {
  await Promise.all([
    ...invalidated.contexts.map(context => repository.saveContext(context)),
    repository.saveCandidates(invalidated.candidates),
    ...invalidated.drafts.map(draft => repository.saveDraft(draft)),
    ...invalidated.reviews.map(review => repository.saveReview(review)),
    ...invalidated.repairs.map(repair => repository.saveRepair(repair)),
    ...invalidated.patches.map(patch => repository.saveCanonPatch(patch)),
  ])
}

function moveToIntentDiscovery(session: CreationSession) {
  const moved = session.phase === 'intent_discovery'
    ? session
    : transitionCreationSession(session, 'intent_discovery')
  return {
    ...moved,
    lockedIntentId: null,
    selectedCandidateId: null,
    activeReviewId: null,
    proposedCanonPatchId: null,
  }
}

function moveToCandidateSearch(session: CreationSession) {
  if (session.phase === 'candidate_search') return session
  if (session.phase === 'intent_locked') return transitionCreationSession(session, 'candidate_search')
  if (['candidate_selected', 'drafting', 'reviewing', 'canon_patch_pending'].includes(session.phase)) {
    return transitionCreationSession(session, 'candidate_search')
  }
  throw new CreationDecisionError('candidate_search_not_ready', 'Lock the chapter intent before comparing narrative paths.')
}

function assertContextSnapshotIntegrity(context: ContextSnapshot) {
  if (!contextSnapshotIntegrityIsCurrent(context)) {
    throw new CreationDecisionError(
      'stale_result',
      'Rebuild the context before continuing this writing operation.',
    )
  }
  return context
}

function requireIntent(snapshot: CreationDecisionSnapshot) {
  const intent = currentAuthorIntent(snapshot)
  if (!intent) throw new CreationDecisionError('intent_incomplete', 'Create the chapter intent first.')
  return intent
}

function requireSelectedCandidate(snapshot: CreationDecisionSnapshot) {
  const candidate = selectedNarrativeCandidate(snapshot)
  if (!candidate) throw new CreationDecisionError('candidate_not_selected', 'Select a narrative path first.')
  return candidate
}

function requireActiveDraft(snapshot: CreationDecisionSnapshot) {
  const draft = activeSceneDraft(snapshot)
  if (!draft) throw new CreationDecisionError('draft_revision_conflict', 'No accepted scene draft is active.')
  return draft
}

function requireActiveReview(snapshot: CreationDecisionSnapshot) {
  const review = activeLiteraryReview(snapshot)
  if (!review) throw new CreationDecisionError('hard_block_unresolved', 'Review the current scene before preparing canon changes.')
  return review
}

export function buildLocalRepairGuidance(finding: LocalRepairFinding, block: DraftBlock) {
  const evidence = finding.evidence[0]
  if (!evidence || evidence.blockId !== block.id) return null
  const excerpt = block.text.slice(evidence.startOffset, evidence.endOffset).trim()
  if (!excerpt || !finding.repairDirection.trim()) return null
  return `原文证据：${excerpt}\n\n局部修改方向：${finding.repairDirection.trim()}`
}

export function buildMultiBlockRepairGuidance(
  finding: LocalRepairFinding,
  blocks: DraftBlock[],
) {
  const blockById = new Map(blocks.map(block => [block.id, block]))
  const excerpts = finding.evidence.map(evidence => {
    const block = blockById.get(evidence.blockId)
    if (!block) return ''
    return block.text.slice(evidence.startOffset, evidence.endOffset).trim()
  })
  if (excerpts.some(excerpt => !excerpt) || !finding.repairDirection.trim()) return null
  return [
    `这项结论跨越 ${blocks.length} 个正文段落，不自动生成整段替换。`,
    `原文证据：${excerpts.join('\n\n')}`,
    `局部修改方向：${finding.repairDirection.trim()}`,
  ].join('\n\n')
}

function editedBlocks(input: {
  previous: DraftBlock[]
  text: string
  protectedBlockIds: string[]
}) {
  const protectedIds = new Set(input.protectedBlockIds)
  const generated = draftBlocksFromText(input.text)
  const next = generated.map((block, index) => {
    const previous = input.previous[index]
    return {
      ...block,
      id: previous?.id || block.id,
      protected: Boolean(previous?.protected || protectedIds.has(previous?.id || block.id)),
    }
  })
  for (const previous of input.previous.filter(block => block.protected)) {
    const current = next.find(block => block.id === previous.id)
    if (!current || current.text !== previous.text) {
      throw new CreationDecisionError('invalid_generation_scope', 'A protected manuscript paragraph was changed.')
    }
  }
  return next
}

export interface CreationDecisionCommandResult<T = undefined> {
  snapshot: CreationDecisionSnapshot
  value: T
}

export class CreationDecisionWorkflow {
  private readonly repository: CreationDecisionRepository
  private readonly agent: WritingAgentCapabilities

  constructor(
    repository: CreationDecisionRepository,
    agent: WritingAgentCapabilities,
  ) {
    this.repository = repository
    this.agent = agent
  }

  async reload(sessionId: string) {
    const snapshot = await this.repository.loadSessionSnapshot(sessionId)
    if (!snapshot) throw new CreationDecisionError('local_persistence_failed', 'The local creation session could not be restored.')
    return snapshot
  }

  async rehearseCharacters(request: CharacterSimulationRequest): Promise<CharacterSimulationResult> {
    if (!this.agent.simulateCharacters) {
      throw new CreationDecisionError(
        'character_simulation_unavailable',
        'The active writing agent does not provide character rehearsal.',
      )
    }
    return this.agent.simulateCharacters(request)
  }

  async proposeIntent(input: {
    snapshot: CreationDecisionSnapshot
    seed: Partial<AuthorIntentContract>
  }) {
    const prior = currentAuthorIntent(input.snapshot)
    if (prior) await this.repository.saveIntent({ ...prior, status: 'superseded' })
    if (input.snapshot.contexts.length || input.snapshot.candidates.length || input.snapshot.drafts.length) {
      await persistInvalidated(this.repository, propagateInvalidation({
        trigger: 'intent_revision_changed',
        contexts: input.snapshot.contexts,
        candidates: input.snapshot.candidates,
        drafts: input.snapshot.drafts,
        reviews: input.snapshot.reviews,
        repairs: input.snapshot.repairs,
        patches: input.snapshot.patches,
      }))
    }
    const session = moveToIntentDiscovery(input.snapshot.session)
    const intent = await this.agent.proposeIntentContract({ session, seed: input.seed })
    const nextSession = { ...session, currentIntentRevision: intent.revision }
    await Promise.all([
      this.repository.saveIntent(intent),
      this.repository.saveSession(nextSession),
      this.repository.appendEvent(creationDecisionEvent({
        sessionId: session.id,
        type: 'intent_proposed',
        actor: 'agent',
        sourceRevision: intent.revision,
        payload: { questionCount: intent.unresolvedQuestions.length },
      })),
    ])
    return { snapshot: await this.reload(session.id), value: intent }
  }

  async answerIntent(input: {
    snapshot: CreationDecisionSnapshot
    questionId: string
    optionId?: string
    customPatch?: Record<string, unknown>
    answeredBy?: 'author' | 'agent_assumption'
  }) {
    const intent = requireIntent(input.snapshot)
    if (intent.status !== 'draft') throw new CreationDecisionError('intent_incomplete', 'Reopen the intent before changing an answer.')
    const answered = answerIntentQuestion({
      intent,
      questionId: input.questionId,
      optionId: input.optionId,
      customPatch: input.customPatch,
      answeredBy: input.answeredBy,
    })
    await this.repository.saveIntent({ ...intent, status: 'superseded' })
    await persistInvalidated(this.repository, propagateInvalidation({
      trigger: 'intent_revision_changed',
      contexts: input.snapshot.contexts,
      candidates: input.snapshot.candidates,
      drafts: input.snapshot.drafts,
      reviews: input.snapshot.reviews,
      repairs: input.snapshot.repairs,
      patches: input.snapshot.patches,
    }))
    const session = {
      ...moveToIntentDiscovery(input.snapshot.session),
      currentIntentRevision: answered.revision,
    }
    await Promise.all([
      this.repository.saveIntent(answered),
      this.repository.saveSession(session),
      this.repository.appendEvent(creationDecisionEvent({
        sessionId: session.id,
        type: 'intent_answered',
        actor: input.answeredBy === 'agent_assumption' ? 'agent' : 'author',
        sourceRevision: answered.revision,
        payload: { questionId: input.questionId, optionId: input.optionId || null },
      })),
    ])
    return { snapshot: await this.reload(session.id), value: answered }
  }

  async lockIntent(snapshot: CreationDecisionSnapshot) {
    const intent = lockAuthorIntent(requireIntent(snapshot))
    const session = {
      ...transitionCreationSession(snapshot.session, 'intent_locked'),
      currentIntentRevision: intent.revision,
      lockedIntentId: intent.id,
    }
    await Promise.all([
      this.repository.saveIntent(intent),
      this.repository.saveSession(session),
      this.repository.appendEvent(creationDecisionEvent({
        sessionId: session.id,
        type: 'intent_locked',
        actor: 'author',
        sourceRevision: intent.revision,
        payload: { intentId: intent.id, lockedFields: intent.lockedFields },
      })),
    ])
    return { snapshot: await this.reload(session.id), value: intent }
  }

  async reopenIntent(snapshot: CreationDecisionSnapshot) {
    const intent = requireIntent(snapshot)
    const reopened = reopenAuthorIntent(intent)
    await this.repository.saveIntent({ ...intent, status: 'superseded' })
    await persistInvalidated(this.repository, propagateInvalidation({
      trigger: 'intent_revision_changed',
      contexts: snapshot.contexts,
      candidates: snapshot.candidates,
      drafts: snapshot.drafts,
      reviews: snapshot.reviews,
      repairs: snapshot.repairs,
      patches: snapshot.patches,
    }))
    const session = { ...moveToIntentDiscovery(snapshot.session), currentIntentRevision: reopened.revision }
    await Promise.all([this.repository.saveIntent(reopened), this.repository.saveSession(session)])
    return { snapshot: await this.reload(session.id), value: reopened }
  }

  async searchCandidates(input: {
    snapshot: CreationDecisionSnapshot
    source: CreationContextSource
  }): Promise<CreationDecisionCommandResult<CandidateSearchResult>> {
    const intent = requireIntent(input.snapshot)
    const candidateSearchSession = moveToCandidateSearch(input.snapshot.session)
    await this.repository.saveSession(candidateSearchSession)
    const context = assertContextSnapshotIntegrity(await this.agent.buildContextSnapshot({
      session: candidateSearchSession,
      intent,
      source: input.source,
    }))
    const firstAttempt = await this.agent.generateCandidates({ session: candidateSearchSession, intent, context })
    const result = firstAttempt.candidates.length < 3
      ? mergeCandidateSearchAttempts(
          firstAttempt,
          await this.agent.generateCandidates({ session: candidateSearchSession, intent, context }),
        )
      : firstAttempt
    const currentCandidateRevision = result.candidates.reduce(
      (revision, candidate) => Math.max(revision, candidate.revision),
      candidateSearchSession.currentCandidateRevision,
    )
    const session = { ...candidateSearchSession, currentCandidateRevision }
    await Promise.all([
      this.repository.saveContext(context),
      this.repository.saveCandidates(result.candidates),
      this.repository.saveSession(session),
      this.repository.appendEvent(creationDecisionEvent({
        sessionId: session.id,
        type: 'candidates_generated',
        actor: 'agent',
        sourceRevision: currentCandidateRevision,
        payload: {
          rawCandidateCount: result.rawCandidateCount,
          validCandidateCount: result.validCandidateCount,
          shownCandidateCount: result.candidates.length,
        },
      })),
    ])
    return { snapshot: await this.reload(session.id), value: result }
  }

  async selectSceneAuthorDecision(input: {
    snapshot: CreationDecisionSnapshot
    decisionId: string
    optionId: string
    authorConfirmed: boolean
    selectedAt?: string
  }) {
    if (!input.authorConfirmed) {
      throw new CreationDecisionError(
        'scene_author_decision_required',
        'The author must explicitly confirm one scene direction.',
      )
    }
    const decision = pendingSceneAuthorDecision(input.snapshot)
    if (!decision || decision.decisionId !== input.decisionId) {
      throw new CreationDecisionError(
        'stale_result',
        'The scene direction request is no longer current.',
      )
    }
    if (decision.sessionId !== input.snapshot.session.id) {
      throw new CreationDecisionError(
        'stale_result',
        'The scene direction belongs to another creation session.',
      )
    }
    const intent = requireIntent(input.snapshot)
    const selectedAt = input.selectedAt || new Date().toISOString()
    const selection: SceneAuthorDecisionSelection = {
      schemaVersion: 'creator-scene-author-decision-selection.v1',
      decisionId: decision.decisionId,
      sessionId: decision.sessionId,
      intentId: decision.intentId,
      intentRevision: decision.intentRevision,
      optionId: input.optionId,
      authorConfirmed: true,
      selectedAt,
    }
    const revisedIntent = reviseIntentFromSceneAuthorDecision({
      intent,
      decision,
      selection,
    })
    await this.repository.saveIntent({ ...intent, status: 'superseded' })
    await persistInvalidated(this.repository, propagateInvalidation({
      trigger: 'intent_revision_changed',
      contexts: input.snapshot.contexts,
      candidates: input.snapshot.candidates,
      drafts: input.snapshot.drafts,
      reviews: input.snapshot.reviews,
      repairs: input.snapshot.repairs,
      patches: input.snapshot.patches,
    }))
    let session: CreationSession = moveToIntentDiscovery(input.snapshot.session)
    session = transitionCreationSession(session, 'intent_locked', selectedAt)
    session = transitionCreationSession(session, 'candidate_search', selectedAt)
    session = {
      ...session,
      currentIntentRevision: revisedIntent.revision,
      lockedIntentId: revisedIntent.id,
      selectedCandidateId: null,
      activeDraftId: null,
      activeReviewId: null,
      proposedCanonPatchId: null,
      updatedAt: selectedAt,
    }
    await Promise.all([
      this.repository.saveIntent(revisedIntent),
      this.repository.saveSession(session),
      this.repository.appendEvent(creationDecisionEvent({
        sessionId: session.id,
        type: 'scene_author_decision_selected',
        actor: 'author',
        sourceRevision: revisedIntent.revision,
        payload: {
          decisionId: decision.decisionId,
          optionId: input.optionId,
          previousIntentId: intent.id,
          revisedIntentId: revisedIntent.id,
        },
        occurredAt: selectedAt,
      })),
    ])
    return { snapshot: await this.reload(session.id), value: revisedIntent }
  }

  async selectCandidate(input: {
    snapshot: CreationDecisionSnapshot
    candidateId: string
  }) {
    const candidate = input.snapshot.candidates.find(item => item.id === input.candidateId && item.status !== 'stale')
    if (!candidate) throw new CreationDecisionError('candidate_not_selected', 'The selected narrative path is no longer current.')
    if (input.snapshot.session.selectedCandidateId && input.snapshot.session.selectedCandidateId !== candidate.id) {
      await persistInvalidated(this.repository, propagateInvalidation({
        trigger: 'candidate_selection_changed',
        contexts: input.snapshot.contexts,
        candidates: input.snapshot.candidates,
        drafts: input.snapshot.drafts,
        reviews: input.snapshot.reviews,
        repairs: input.snapshot.repairs,
        patches: input.snapshot.patches,
      }))
    }
    const candidates = selectNarrativeCandidate(input.snapshot.candidates, candidate.id)
    let selectionSession = moveToCandidateSearch(input.snapshot.session)
    selectionSession = transitionCreationSession(selectionSession, 'candidate_selected')
    const session = {
      ...selectionSession,
      selectedCandidateId: candidate.id,
      currentCandidateRevision: candidate.revision,
      activeDraftId: null,
      activeReviewId: null,
      proposedCanonPatchId: null,
    }
    await Promise.all([
      this.repository.saveCandidates(candidates),
      this.repository.saveSession(session),
      this.repository.appendEvent(creationDecisionEvent({
        sessionId: session.id,
        type: 'candidate_selected',
        actor: 'author',
        sourceRevision: candidate.revision,
        payload: { candidateId: candidate.id },
      })),
    ])
    return { snapshot: await this.reload(session.id), value: candidate }
  }

  async mixCandidates(input: {
    snapshot: CreationDecisionSnapshot
    candidateIds: [string, string]
  }) {
    const current = input.candidateIds.map(candidateId => input.snapshot.candidates.find(candidate => (
      candidate.id === candidateId && candidate.status !== 'stale' && candidate.status !== 'rejected'
    )))
    if (!current[0] || !current[1]) {
      throw new CreationDecisionError('candidate_not_selected', 'Select two current narrative paths to mix.')
    }
    const candidate = mixNarrativeCandidates({
      left: current[0],
      right: current[1],
      revision: Math.max(input.snapshot.session.currentCandidateRevision, ...input.snapshot.candidates.map(item => item.revision)) + 1,
    })
    if (!candidate.validation.hardConstraintPassed) {
      throw new CreationDecisionError('candidate_not_selected', 'The mixed path violates a hard constraint.')
    }
    const session = {
      ...input.snapshot.session,
      currentCandidateRevision: candidate.revision,
      updatedAt: new Date().toISOString(),
    }
    await Promise.all([
      this.repository.saveCandidates([candidate]),
      this.repository.saveSession(session),
      this.repository.appendEvent(creationDecisionEvent({
        sessionId: session.id,
        type: 'candidates_mixed',
        actor: 'author',
        sourceRevision: candidate.revision,
        payload: { sourceCandidateIds: input.candidateIds, candidateId: candidate.id },
      })),
    ])
    return { snapshot: await this.reload(session.id), value: candidate }
  }

  async rejectCandidate(input: {
    snapshot: CreationDecisionSnapshot
    candidateId: string
  }) {
    const candidate = input.snapshot.candidates.find(item => item.id === input.candidateId && item.status !== 'stale')
    if (!candidate) throw new CreationDecisionError('candidate_not_selected', 'The narrative path is no longer current.')
    if (input.snapshot.session.selectedCandidateId === candidate.id) {
      throw new CreationDecisionError('candidate_not_selected', 'Choose another path before rejecting the current path.')
    }
    await this.repository.saveCandidates(input.snapshot.candidates.map(item => (
      item.id === candidate.id ? { ...item, status: 'rejected' as const } : item
    )))
    await this.repository.appendEvent(creationDecisionEvent({
      sessionId: input.snapshot.session.id,
      type: 'candidate_rejected',
      actor: 'author',
      sourceRevision: candidate.revision,
      payload: { candidateId: candidate.id },
    }))
    return { snapshot: await this.reload(input.snapshot.session.id), value: candidate }
  }

  async generateSceneDraft(input: {
    snapshot: CreationDecisionSnapshot
    request: SceneDraftRequest
    currentBlocks: DraftBlock[]
  }) {
    const intent = requireIntent(input.snapshot)
    const candidate = requireSelectedCandidate(input.snapshot)
    const currentContext = currentContextSnapshot(input.snapshot)
    if (!currentContext) throw new CreationDecisionError('stale_result', 'Rebuild the context before writing this scene.')
    const context = assertContextSnapshotIntegrity(currentContext)
    let result: SceneDraftResult
    try {
      result = await this.agent.draftScene({
        session: input.snapshot.session,
        intent,
        candidate,
        context,
        request: input.request,
        currentBlocks: input.currentBlocks,
      })
    } catch (error) {
      if (error instanceof CreationDecisionError && error.code === 'scene_author_decision_required') {
        const decision = sceneAuthorDecisionRequiredSchema.safeParse(error.detail)
        if (decision.success && !input.snapshot.events.some(event => (
          event.type === 'scene_author_decision_requested'
          && event.payload.decisionId === decision.data.decisionId
        ))) {
          await this.repository.appendEvent(creationDecisionEvent({
            sessionId: input.snapshot.session.id,
            type: 'scene_author_decision_requested',
            actor: 'agent',
            sourceRevision: decision.data.intentRevision,
            payload: {
              decisionId: decision.data.decisionId,
              decision: decision.data,
            },
          }))
        }
      }
      throw error
    }
    const latestSession = await this.repository.loadSession(input.snapshot.session.id) || input.snapshot.session
    const freshResult = markDraftResultFreshness({
      result,
      session: latestSession,
      intentRevision: intent.revision,
      candidateRevision: candidate.revision,
    })
    const session = latestSession
    await Promise.all([
      this.repository.saveDraft(freshResult),
      this.repository.appendEvent(creationDecisionEvent({
        sessionId: session.id,
        type: 'draft_generated',
        actor: 'agent',
        sourceRevision: freshResult.revision,
        payload: { draftId: freshResult.draftId, status: freshResult.status, scope: input.request.scope.type },
      })),
    ])
    return { snapshot: await this.reload(session.id), value: freshResult }
  }

  async adoptSceneDraft(input: {
    snapshot: CreationDecisionSnapshot
    draftId: string
  }) {
    const draft = input.snapshot.drafts.find(item => item.draftId === input.draftId)
    if (!draft || draft.status === 'stale') throw new CreationDecisionError('stale_result', 'A stale scene candidate cannot replace the current manuscript.')
    if (draft.baseDraftRevision !== input.snapshot.session.currentDraftRevision) {
      throw new CreationDecisionError('draft_revision_conflict', 'The manuscript changed after this scene candidate was generated.')
    }
    const session = {
      ...input.snapshot.session,
      phase: 'drafting' as const,
      activeDraftId: draft.draftId,
      currentDraftRevision: draft.revision,
      activeReviewId: null,
      proposedCanonPatchId: null,
      updatedAt: new Date().toISOString(),
    }
    await Promise.all([
      this.repository.saveSession(session),
      this.repository.appendEvent(creationDecisionEvent({
        sessionId: session.id,
        type: 'draft_edited',
        actor: 'author',
        sourceRevision: draft.revision,
        payload: { draftId: draft.draftId, action: 'candidate_adopted' },
      })),
    ])
    return { snapshot: await this.reload(session.id), value: draftTextFromBlocks(draft.contentBlocks) }
  }

  async recordAuthorEdit(input: {
    snapshot: CreationDecisionSnapshot
    content: string
    editedBlockIds: string[]
    protectedBlockIds: string[]
  }) {
    const current = requireActiveDraft(input.snapshot)
    const blocks = editedBlocks({
      previous: current.contentBlocks,
      text: input.content,
      protectedBlockIds: input.protectedBlockIds,
    })
    const draft: SceneDraftResult = {
      ...withoutSceneDraftDirectionReceipt(current),
      draftId: randomId('scene-draft'),
      baseDraftRevision: current.revision,
      revision: current.revision + 1,
      contentBlocks: blocks,
      status: 'current',
      createdAt: new Date().toISOString(),
    }
    await persistInvalidated(this.repository, propagateInvalidation({
      trigger: 'author_text_edited',
      contexts: input.snapshot.contexts,
      candidates: input.snapshot.candidates,
      drafts: input.snapshot.drafts,
      reviews: input.snapshot.reviews,
      repairs: input.snapshot.repairs,
      patches: input.snapshot.patches,
    }))
    const session = {
      ...input.snapshot.session,
      phase: 'drafting' as const,
      activeDraftId: draft.draftId,
      currentDraftRevision: draft.revision,
      activeReviewId: null,
      proposedCanonPatchId: null,
      updatedAt: new Date().toISOString(),
    }
    await Promise.all([
      this.repository.saveDraft(draft),
      this.repository.saveSession(session),
      this.repository.appendEvent(creationDecisionEvent({
        sessionId: session.id,
        type: 'draft_edited',
        actor: 'author',
        sourceRevision: draft.revision,
        payload: { draftId: draft.draftId, editedBlockIds: input.editedBlockIds },
      })),
    ])
    return { snapshot: await this.reload(session.id), value: draft }
  }

  async reviewDraft(input: {
    snapshot: CreationDecisionSnapshot
    source?: CreationContextSource
    focusDimensions?: LiteraryDimension[]
    focusLensIds?: WritingAssistLensId[]
    writingAssistPreferences?: CreatorWritingAssistPreferences
  }) {
    const { snapshot } = input
    const intent = requireIntent(snapshot)
    const candidate = requireSelectedCandidate(snapshot)
    const currentContext = currentContextSnapshot(snapshot)
    const draft = requireActiveDraft(snapshot)
    const contextNeedsRefresh = Boolean(input.source) && (!currentContext || !contextMatchesCurrentSource({
      context: currentContext,
      source: input.source!,
      intentRevision: intent.revision,
    }))
    if (!input.source && currentContext && !contextSnapshotIntegrityIsCurrent(currentContext)) {
      throw new CreationDecisionError('stale_result', 'Rebuild the context before reviewing this scene.')
    }
    const resolvedContext = contextNeedsRefresh
      ? await this.agent.buildContextSnapshot({ session: snapshot.session, intent, source: input.source! })
      : currentContext
    if (!resolvedContext) throw new CreationDecisionError('stale_result', 'The context snapshot is no longer current.')
    const context = assertContextSnapshotIntegrity(resolvedContext)
    const recommendation = input.writingAssistPreferences
      ? recommendWritingAssistLenses({
          preferences: input.writingAssistPreferences,
          session: snapshot.session,
          context,
          draft,
          explicitFocusLensIds: input.focusLensIds || input.focusDimensions,
        })
      : null
    const recommendedFocusDimensions = recommendation?.lensIds.filter(isLiteraryDimension) || []
    const requestedAdvisoryLensIds = recommendation?.lensIds.filter(isAdvisoryLensId) || []
    const focusDimensions = input.focusDimensions?.length
      ? input.focusDimensions
      : recommendedFocusDimensions
    const review = await this.agent.reviewDraft({
      session: snapshot.session,
      intent,
      context,
      candidate,
      draft,
      focusDimensions,
      requestedAdvisoryLensIds,
    })
    const latestSession = await this.repository.loadSession(snapshot.session.id) || snapshot.session
    const stale = latestSession.currentDraftRevision !== draft.revision
    const savedReview = stale
      ? {
          ...review,
          status: 'stale' as const,
          findings: review.findings.map(finding => ({ ...finding, status: 'stale' as const })),
          extendedCraft: review.extendedCraft
            ? {
                ...review.extendedCraft,
                findings: review.extendedCraft.findings.map(finding => ({ ...finding, status: 'stale' as const })),
              }
            : undefined,
        }
      : review
    let session = latestSession
    if (!stale) {
      if (session.phase === 'drafting') session = transitionCreationSession(session, 'reviewing')
      session = { ...session, activeReviewId: savedReview.id, proposedCanonPatchId: null }
      await this.repository.saveSession(session)
    }
    if (contextNeedsRefresh) {
      await Promise.all([
        ...snapshot.contexts.map(item => this.repository.saveContext({ ...item, status: 'stale' })),
        ...snapshot.reviews
          .filter(item => item.id !== savedReview.id)
          .map(item => this.repository.saveReview({
            ...item,
            status: 'stale',
            findings: item.findings.map(finding => ({ ...finding, status: 'stale' })),
            extendedCraft: item.extendedCraft
              ? {
                  ...item.extendedCraft,
                  findings: item.extendedCraft.findings.map(finding => ({ ...finding, status: 'stale' })),
                }
              : undefined,
          })),
        this.repository.saveContext(context),
        this.repository.appendEvent(creationDecisionEvent({
          sessionId: session.id,
          type: 'context_refreshed',
          actor: 'system',
          sourceRevision: context.intentRevision,
          payload: {
            previousContextId: currentContext?.id || null,
            contextSnapshotId: context.id,
            compilationPolicyVersion: context.compilationPolicyVersion,
            sourceFingerprint: context.sourceFingerprint,
            manualRecallCount: context.manualRecallItems.length,
          },
        })),
      ])
    }
    await Promise.all([
      ...snapshot.repairs.map(item => this.repository.saveRepair({ ...item, status: 'stale' })),
      ...snapshot.patches.map(item => this.repository.saveCanonPatch({ ...item, status: 'stale' })),
      this.repository.saveReview(savedReview),
      this.repository.appendEvent(creationDecisionEvent({
        sessionId: session.id,
        type: 'review_completed',
        actor: 'agent',
        sourceRevision: draft.revision,
        payload: {
          reviewId: savedReview.id,
          status: savedReview.status,
          findingCount: savedReview.findings.length,
          hardBlockCount: activeHardBlockFindings(savedReview).length,
          writingAssistRecommendation: recommendation
            ? {
                contextSnapshotId: recommendation.contextSnapshotId,
                draftId: recommendation.draftId,
                draftRevision: recommendation.draftRevision,
                lensIds: recommendation.lensIds,
                reasonCodes: recommendation.reasonCodes,
                status: recommendation.status,
              }
            : null,
          requestedFocusDimensions: savedReview.requestedFocusDimensions || [],
          requestedAdvisoryLensIds: savedReview.extendedCraft?.requestedLensIds || [],
        },
      })),
    ])
    return { snapshot: await this.reload(session.id), value: savedReview }
  }

  async proposeRepair(input: {
    snapshot: CreationDecisionSnapshot
    findingId: string
  }) {
    const intent = requireIntent(input.snapshot)
    const candidate = requireSelectedCandidate(input.snapshot)
    const currentContext = currentContextSnapshot(input.snapshot)
    const review = requireActiveReview(input.snapshot)
    const draft = requireActiveDraft(input.snapshot)
    if (!currentContext) throw new CreationDecisionError('stale_result', 'The context snapshot is no longer current.')
    const context = assertContextSnapshotIntegrity(currentContext)
    const finding = resolveLocalRepairFinding({ review, findingId: input.findingId })
    if (!localRepairFindingEvidenceIsCurrent(finding, review, draft.contentBlocks)) {
      throw new CreationDecisionError('evidence_missing', 'The selected finding evidence no longer exists in the manuscript.')
    }
    const evidenceBlockIds = new Set(finding.evidence.map(item => item.blockId))
    const evidenceBlocks = draft.contentBlocks.filter(block => evidenceBlockIds.has(block.id))
    if (!evidenceBlocks.length) throw new CreationDecisionError('evidence_missing', 'The review evidence no longer exists in the manuscript.')
    if (evidenceBlocks.length > 1) {
      const latestSession = await this.repository.loadSession(input.snapshot.session.id) || input.snapshot.session
      if (latestSession.currentDraftRevision !== draft.revision || latestSession.activeReviewId !== review.id) {
        throw new CreationDecisionError('draft_revision_conflict', 'The manuscript changed while the local repair direction was being prepared.')
      }
      const repair = createRepairProposal({
        id: randomId('repair-proposal'),
        review,
        findingId: finding.id,
        finding,
        operation: 'offer_variants',
        proposedContent: buildMultiBlockRepairGuidance(finding, evidenceBlocks),
        preservedFacts: Array.from(new Set(draft.unplannedFactProposals)),
        targetBlockIds: evidenceBlocks.map(block => block.id),
      })
      await this.repository.saveRepair(repair)
      return { snapshot: await this.reload(input.snapshot.session.id), value: repair }
    }
    const block = evidenceBlocks[0]
    const protectedBlockIds = new Set(review.findings.flatMap(item => item.protectedBlockIds))
    if (block.protected || protectedBlockIds.has(block.id)) {
      throw new CreationDecisionError('invalid_generation_scope', 'A protected manuscript block cannot be rewritten.')
    }
    const repairAgentInput = {
      session: input.snapshot.session,
      intent,
      context,
      candidate,
      draft,
      review,
      finding,
      targetBlock: block,
    }
    let generated = this.agent.proposeRepair
      ? await this.agent.proposeRepair({
          ...repairAgentInput,
          attempt: 'initial',
        })
      : null
    if (generated && !this.agent.reviewRepair) {
      throw new CreationDecisionError(
        'model_output_invalid',
        'A generated local replacement requires an independent repair reviewer.',
      )
    }
    let verification = generated
      ? await this.agent.reviewRepair!({
          ...repairAgentInput,
          repair: generated,
        })
      : null
    const assertRepairInputStillCurrent = async () => {
      const latestSession = await this.repository.loadSession(input.snapshot.session.id) || input.snapshot.session
      if (latestSession.currentDraftRevision !== draft.revision || latestSession.activeReviewId !== review.id) {
        throw new CreationDecisionError('draft_revision_conflict', 'The manuscript changed while the local repair candidate was being prepared.')
      }
    }
    const buildRepair = (
      repairCandidate: LocalRepairCandidate | null,
      repairVerification: LocalRepairReview | null,
    ) => createRepairProposal({
      id: randomId('repair-proposal'),
      review,
      findingId: finding.id,
      finding,
      operation: repairCandidate?.operation || 'offer_variants',
      proposedContent: repairCandidate?.proposedContent || buildLocalRepairGuidance(finding, block),
      preservedFacts: repairCandidate
        ? Array.from(new Set(repairCandidate.preservedFacts.map(item => item.fact)))
        : Array.from(new Set(draft.unplannedFactProposals)),
      targetBlockIds: [block.id],
      verification: repairVerification,
    })

    await assertRepairInputStillCurrent()
    if (generated && verification?.decision === 'reject') {
      await this.repository.saveRepair({ ...buildRepair(generated, verification), status: 'rejected' })
      generated = await this.agent.proposeRepair!({
        ...repairAgentInput,
        attempt: 'auditor_revision',
        previousRepair: generated,
        repairReview: verification,
      })
      verification = await this.agent.reviewRepair!({
        ...repairAgentInput,
        repair: generated,
      })
      await assertRepairInputStillCurrent()
    }

    const repair = buildRepair(generated, verification)
    if (verification?.decision === 'reject') {
      await this.repository.saveRepair({ ...repair, status: 'rejected' })
      throw new CreationDecisionError(
        'hard_block_unresolved',
        'The independent reviewer rejected this local replacement candidate.',
      )
    }
    if (generated && !hasCompleteLocalRepairVerification(repair)) {
      await this.repository.saveRepair({ ...repair, status: 'rejected' })
      throw new CreationDecisionError(
        'evidence_missing',
        'The independent reviewer did not verify every preserved fact.',
      )
    }
    await this.repository.saveRepair(repair)
    return { snapshot: await this.reload(input.snapshot.session.id), value: repair }
  }

  async acceptRepair(input: {
    snapshot: CreationDecisionSnapshot
    repairId: string
  }) {
    const review = requireActiveReview(input.snapshot)
    const repair = input.snapshot.repairs.find(item => (
      item.id === input.repairId
      && item.status === 'proposed'
    ))
    if (!repair) throw new CreationDecisionError('evidence_missing', 'The local repair is no longer awaiting an author decision.')
    const current = requireActiveDraft(input.snapshot)
    if (repair.baseDraftRevision !== current.revision) {
      throw new CreationDecisionError('draft_revision_conflict', 'The manuscript changed after this local repair was proposed.')
    }
    if (repair.reviewId !== review.id) {
      throw new CreationDecisionError('stale_result', 'The local repair no longer matches the current literary review.')
    }
    const finding = resolveLocalRepairFinding({
      review,
      findingId: repair.findingId,
      findingSource: repair.findingSource,
    })
    const contentBlocks = applyRepairProposal({
      proposal: repair,
      blocks: current.contentBlocks,
      currentDraftRevision: current.revision,
    })
    const draft: SceneDraftResult = {
      ...withoutSceneDraftDirectionReceipt(current),
      draftId: randomId('scene-draft'),
      baseDraftRevision: current.revision,
      revision: current.revision + 1,
      contentBlocks,
      status: 'current',
      createdAt: new Date().toISOString(),
    }
    await persistInvalidated(this.repository, propagateInvalidation({
      trigger: 'draft_revision_changed',
      contexts: input.snapshot.contexts,
      candidates: input.snapshot.candidates,
      drafts: input.snapshot.drafts,
      reviews: input.snapshot.reviews,
      repairs: input.snapshot.repairs,
      patches: input.snapshot.patches,
    }))
    const session = {
      ...transitionCreationSession(input.snapshot.session, 'drafting'),
      activeDraftId: draft.draftId,
      currentDraftRevision: draft.revision,
      activeReviewId: null,
      proposedCanonPatchId: null,
    }
    await Promise.all([
      this.repository.saveRepair({ ...repair, status: 'accepted' }),
      this.repository.saveDraft(draft),
      this.repository.saveSession(session),
      this.repository.appendEvent(creationDecisionEvent({
        sessionId: session.id,
        type: 'finding_accepted',
        actor: 'author',
        sourceRevision: draft.revision,
        payload: finding.source === 'advisory_lens'
          ? {
              findingId: repair.findingId,
              repairId: repair.id,
              advisoryLensId: finding.lensId,
              reason: 'adopt_local_repair',
              scope: {
                reviewId: review.id,
                draftId: current.draftId,
                blockIds: repair.targetBlockIds,
              },
              revision: current.revision,
            }
          : { findingId: repair.findingId, repairId: repair.id, targetBlockIds: repair.targetBlockIds },
      })),
    ])
    return { snapshot: await this.reload(session.id), value: draftTextFromBlocks(contentBlocks) }
  }

  async rejectRepair(input: {
    snapshot: CreationDecisionSnapshot
    repairId: string
  }) {
    const review = requireActiveReview(input.snapshot)
    const draft = requireActiveDraft(input.snapshot)
    const repair = input.snapshot.repairs.find(item => (
      item.id === input.repairId
      && item.status === 'proposed'
    ))
    if (!repair) throw new CreationDecisionError('evidence_missing', 'The local repair is no longer awaiting an author decision.')
    if (repair.reviewId !== review.id || repair.baseDraftRevision !== draft.revision) {
      throw new CreationDecisionError('stale_result', 'The local repair no longer matches the current review and manuscript revision.')
    }
    const finding = resolveLocalRepairFinding({
      review,
      findingId: repair.findingId,
      findingSource: repair.findingSource,
    })

    const rejected = { ...repair, status: 'rejected' as const }
    await Promise.all([
      this.repository.saveRepair(rejected),
      this.repository.appendEvent(creationDecisionEvent({
        sessionId: input.snapshot.session.id,
        type: 'repair_rejected',
        actor: 'author',
        sourceRevision: draft.revision,
        payload: finding.source === 'advisory_lens'
          ? {
              findingId: finding.id,
              repairId: repair.id,
              advisoryLensId: finding.lensId,
              reason: 'reject_local_repair',
              scope: {
                reviewId: review.id,
                draftId: draft.draftId,
                blockIds: repair.targetBlockIds,
              },
              revision: draft.revision,
            }
          : {
              findingId: finding.id,
              repairId: repair.id,
              findingSeverity: finding.severity,
            },
      })),
    ])
    return { snapshot: await this.reload(input.snapshot.session.id), value: rejected }
  }

  async dismissFinding(input: {
    snapshot: CreationDecisionSnapshot
    findingId: string
  }) {
    const review = requireActiveReview(input.snapshot)
    const finding = review.findings.find(item => item.id === input.findingId && item.status === 'active')
    if (!finding) throw new CreationDecisionError('evidence_missing', 'The selected literary finding is no longer active.')
    if (finding.severity === 'hard_block') {
      throw new CreationDecisionError(
        'hard_block_unresolved',
        'A hard-block finding cannot be dismissed. Rejecting a repair leaves the finding active until a verified correction resolves it.',
      )
    }
    const updated = {
      ...review,
      findings: review.findings.map(item => item.id === finding.id ? { ...item, status: 'dismissed' as const } : item),
    }
    const rejectedRepairs = input.snapshot.repairs
      .filter(repair => repair.findingId === finding.id && repair.status === 'proposed')
      .map(repair => ({ ...repair, status: 'rejected' as const }))
    await Promise.all([
      this.repository.saveReview(updated),
      ...rejectedRepairs.map(repair => this.repository.saveRepair(repair)),
      this.repository.appendEvent(creationDecisionEvent({
        sessionId: input.snapshot.session.id,
        type: 'finding_dismissed',
        actor: 'author',
        sourceRevision: review.baseDraftRevision,
        payload: { findingId: finding.id, rememberedPreference: false },
      })),
    ])
    return { snapshot: await this.reload(input.snapshot.session.id), value: updated }
  }

  async dismissAdvisoryFinding(input: {
    snapshot: CreationDecisionSnapshot
    findingId: string
  }) {
    const review = requireActiveReview(input.snapshot)
    const finding = review.extendedCraft?.findings.find(item => (
      item.id === input.findingId && item.status === 'active'
    ))
    if (!finding || !review.extendedCraft) {
      throw new CreationDecisionError('evidence_missing', 'The selected writing suggestion is no longer active.')
    }
    const updated = {
      ...review,
      extendedCraft: {
        ...review.extendedCraft,
        findings: review.extendedCraft.findings.map(item => (
          item.id === finding.id ? { ...item, status: 'dismissed' as const } : item
        )),
      },
    }
    await Promise.all([
      this.repository.saveReview(updated),
      this.repository.appendEvent(creationDecisionEvent({
        sessionId: input.snapshot.session.id,
        type: 'finding_dismissed',
        actor: 'author',
        sourceRevision: review.baseDraftRevision,
        payload: {
          findingId: finding.id,
          advisoryLensId: finding.lensId,
          reason: 'keep_original',
          scope: {
            reviewId: review.id,
            draftId: review.draftId,
            blockIds: Array.from(new Set(finding.evidence.map(item => item.blockId))),
          },
          revision: review.baseDraftRevision,
          rememberedPreference: false,
        },
      })),
    ])
    return { snapshot: await this.reload(input.snapshot.session.id), value: updated }
  }

  async deferAdvisoryFinding(input: {
    snapshot: CreationDecisionSnapshot
    findingId: string
  }) {
    const review = requireActiveReview(input.snapshot)
    const finding = review.extendedCraft?.findings.find(item => (
      item.id === input.findingId && item.status === 'active'
    ))
    if (!finding || !review.extendedCraft) {
      throw new CreationDecisionError('evidence_missing', 'The selected writing suggestion is no longer active.')
    }
    const updated = {
      ...review,
      extendedCraft: {
        ...review.extendedCraft,
        findings: review.extendedCraft.findings.map(item => (
          item.id === finding.id ? { ...item, status: 'deferred' as const } : item
        )),
      },
    }
    const rejectedRepairs = input.snapshot.repairs
      .filter(repair => repair.findingId === finding.id && repair.status === 'proposed')
      .map(repair => ({ ...repair, status: 'rejected' as const }))
    await Promise.all([
      this.repository.saveReview(updated),
      ...rejectedRepairs.map(repair => this.repository.saveRepair(repair)),
      this.repository.appendEvent(creationDecisionEvent({
        sessionId: input.snapshot.session.id,
        type: 'finding_deferred',
        actor: 'author',
        sourceRevision: review.baseDraftRevision,
        payload: {
          findingId: finding.id,
          advisoryLensId: finding.lensId,
          reason: 'later',
          scope: {
            reviewId: review.id,
            draftId: review.draftId,
            blockIds: Array.from(new Set(finding.evidence.map(item => item.blockId))),
          },
          revision: review.baseDraftRevision,
        },
      })),
    ])
    return { snapshot: await this.reload(input.snapshot.session.id), value: updated }
  }

  async proposeCanonPatch(snapshot: CreationDecisionSnapshot) {
    const intent = requireIntent(snapshot)
    const candidate = requireSelectedCandidate(snapshot)
    const currentContext = currentContextSnapshot(snapshot)
    const draft = requireActiveDraft(snapshot)
    const review = requireActiveReview(snapshot)
    if (!currentContext) throw new CreationDecisionError('stale_result', 'The context snapshot is no longer current.')
    const context = assertContextSnapshotIntegrity(currentContext)
    assertCandidateQualityGate({
      session: snapshot.session,
      intent,
      context,
      draft,
      review,
      repairs: snapshot.repairs,
    })
    const patch = await this.agent.proposeCanonPatch({
      session: snapshot.session,
      intent,
      context,
      candidate,
      draft,
      review,
    })
    const session = {
      ...transitionCreationSession(snapshot.session, 'canon_patch_pending'),
      proposedCanonPatchId: patch.id,
    }
    await Promise.all([
      this.repository.saveCanonPatch(patch),
      this.repository.saveSession(session),
      this.repository.appendEvent(creationDecisionEvent({
        sessionId: session.id,
        type: 'canon_patch_proposed',
        actor: 'agent',
        sourceRevision: draft.revision,
        payload: { patchId: patch.id, operationCount: patch.operations.length },
      })),
    ])
    return { snapshot: await this.reload(session.id), value: patch }
  }

  async confirmCanon(snapshot: CreationDecisionSnapshot): Promise<CreationDecisionCommandResult<CanonCommitResult>> {
    const latest = await this.reload(snapshot.session.id)
    if (
      latest.session.activeDraftId !== snapshot.session.activeDraftId
      || latest.session.currentDraftRevision !== snapshot.session.currentDraftRevision
      || latest.session.activeReviewId !== snapshot.session.activeReviewId
      || latest.session.proposedCanonPatchId !== snapshot.session.proposedCanonPatchId
    ) {
      throw new CreationDecisionError(
        'draft_revision_conflict',
        'The manuscript changed after canon confirmation was opened.',
      )
    }
    const currentContext = currentContextSnapshot(latest)
    if (!currentContext) throw new CreationDecisionError('stale_result', 'The context snapshot is no longer current.')
    const context = assertContextSnapshotIntegrity(currentContext)
    const draft = requireActiveDraft(latest)
    const review = requireActiveReview(latest)
    const patch = activeCanonPatch(latest)
    if (!patch) throw new CreationDecisionError('stale_result', 'Prepare the canon diff before confirming it.')
    const result = await this.repository.commitCanon({
      session: latest.session,
      intent: requireIntent(latest),
      context,
      draft,
      review,
      repairs: latest.repairs,
      patch,
      currentCanon: latest.canon,
      authorConfirmed: true,
      confirmedAt: new Date().toISOString(),
    })
    return { snapshot: await this.reload(snapshot.session.id), value: result }
  }
}

export function customIntentAnswerPatch(question: IntentQuestion, answer: string) {
  const value = answer.trim()
  if (!value) return null
  if (question.fieldPath === 'readerExperience.targetEmotion') {
    return {
      readerExperience: { targetEmotion: value, emotionalMovement: value },
      narrativeDelta: { mustChange: value },
    }
  }
  if (question.fieldPath === 'characterAgency.requiredChoice') {
    const hiddenInformation = value.match(/([^，；。]{1,16})不能知道([^，；。]+)/)
    return {
      characterAgency: { requiredChoice: value, expectedCost: value },
      informationPolicy: {
        readerShouldKnow: [value],
        readerShouldSuspect: [value],
        ...(hiddenInformation
          ? {
              charactersMustNotKnow: [{
                characterId: hiddenInformation[1].trim(),
                information: hiddenInformation[2].trim(),
              }],
              delayedReveals: [hiddenInformation[2].trim()],
            }
          : {}),
      },
    }
  }
  const parts = question.fieldPath.split('.')
  return parts.length === 2 ? { [parts[0]]: { [parts[1]]: value } } : { [question.fieldPath]: value }
}

export function manuscriptBlocks(text: string, protectedBlockIds: string[] = []) {
  return draftBlocksFromText(text).map(block => ({
    ...block,
    protected: protectedBlockIds.includes(block.id),
  }))
}
