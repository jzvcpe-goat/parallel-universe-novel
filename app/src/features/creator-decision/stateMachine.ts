import type {
  AuthorIntentContract,
  CanonStatePatch,
  ContextSnapshot,
  CreationDecisionEvent,
  CreationSession,
  CreationSessionPhase,
  IntentQuestion,
  LiteraryReview,
  NarrativeCandidate,
  RepairProposal,
  SceneDraftRequest,
  SceneDraftResult,
} from './types'
import { CreationDecisionError } from './types'

const phaseTransitions: Record<CreationSessionPhase, CreationSessionPhase[]> = {
  intent_discovery: ['intent_locked'],
  intent_locked: ['intent_discovery', 'candidate_search'],
  candidate_search: ['intent_discovery', 'candidate_selected'],
  candidate_selected: ['intent_discovery', 'candidate_search', 'drafting'],
  drafting: ['intent_discovery', 'candidate_search', 'reviewing'],
  reviewing: ['intent_discovery', 'candidate_search', 'drafting', 'canon_patch_pending'],
  canon_patch_pending: ['intent_discovery', 'candidate_search', 'drafting', 'reviewing', 'canon_committed'],
  canon_committed: ['intent_discovery', 'drafting'],
}

function randomId(prefix: string) {
  const value = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}:${value}`
}

export function createCreationSession(input: {
  id?: string
  workId: string
  chapterId: string
  sceneId?: string | null
  branchId: string
  baseCanonRevision?: number
  now?: string
}): CreationSession {
  const now = input.now || new Date().toISOString()
  return {
    schemaVersion: 'creation-session.v1',
    id: input.id || randomId('creation-session'),
    workId: input.workId,
    chapterId: input.chapterId,
    sceneId: input.sceneId ?? null,
    branchId: input.branchId,
    phase: 'intent_discovery',
    baseCanonRevision: input.baseCanonRevision || 0,
    currentIntentRevision: 0,
    currentCandidateRevision: 0,
    currentDraftRevision: 0,
    lockedIntentId: null,
    selectedCandidateId: null,
    activeDraftId: null,
    activeReviewId: null,
    proposedCanonPatchId: null,
    createdAt: now,
    updatedAt: now,
  }
}

export function transitionCreationSession(
  session: CreationSession,
  phase: CreationSessionPhase,
  now = new Date().toISOString(),
): CreationSession {
  if (phase === session.phase) return session
  if (!phaseTransitions[session.phase].includes(phase)) {
    throw new CreationDecisionError(
      'invalid_phase_transition',
      `Cannot transition creation session from ${session.phase} to ${phase}.`,
    )
  }
  return { ...session, phase, updatedAt: now }
}

export function createEmptyIntent(input: {
  sessionId: string
  revision?: number
  primaryActorId?: string
  now?: string
}): AuthorIntentContract {
  const now = input.now || new Date().toISOString()
  return {
    schemaVersion: 'author-intent.v1',
    id: randomId('author-intent'),
    sessionId: input.sessionId,
    revision: input.revision || 1,
    status: 'draft',
    readerExperience: {
      startEmotion: '',
      targetEmotion: '',
      emotionalMovement: '',
      intensity: 'restrained',
    },
    narrativeDelta: {
      startingCondition: '',
      endingCondition: '',
      mustChange: '',
      mustNotResolve: [],
      irreversibleChange: null,
    },
    characterAgency: {
      primaryActorId: input.primaryActorId || '',
      currentGoal: '',
      requiredChoice: '',
      opposingForce: '',
      expectedCost: '',
    },
    informationPolicy: {
      readerShouldKnow: [],
      readerShouldSuspect: [],
      charactersMustNotKnow: [],
      delayedReveals: [],
    },
    boundaries: {
      requiredElements: [],
      forbiddenEffects: [],
      protectedCharacterTraits: [],
    },
    fieldSources: {},
    lockedFields: [],
    agentAssumptions: [],
    unresolvedQuestions: [],
    createdAt: now,
    lockedAt: null,
  }
}

function informationPolicyIsExplicit(intent: AuthorIntentContract) {
  return intent.informationPolicy.readerShouldKnow.length > 0
    || intent.informationPolicy.readerShouldSuspect.length > 0
    || intent.informationPolicy.charactersMustNotKnow.length > 0
    || intent.informationPolicy.delayedReveals.length > 0
    || intent.lockedFields.includes('informationPolicy')
}

export function intentLockBlockers(intent: AuthorIntentContract): string[] {
  const blockers: string[] = []
  if (!intent.readerExperience.targetEmotion.trim()) blockers.push('readerExperience.targetEmotion')
  if (!intent.narrativeDelta.mustChange.trim()) blockers.push('narrativeDelta.mustChange')
  if (!intent.characterAgency.primaryActorId.trim()) blockers.push('characterAgency.primaryActorId')
  if (!intent.characterAgency.requiredChoice.trim()) blockers.push('characterAgency.requiredChoice')
  if (!informationPolicyIsExplicit(intent)) blockers.push('informationPolicy')
  for (const question of intent.unresolvedQuestions) {
    if (question.importance === 'blocking' && question.answeredBy === null) {
      blockers.push(`question:${question.id}`)
    }
  }
  return Array.from(new Set(blockers))
}

export function nextIntentQuestions(intent: AuthorIntentContract): IntentQuestion[] {
  const priority = { blocking: 0, material: 1, optional: 2 } as const
  return intent.unresolvedQuestions
    .filter(question => question.answeredBy === null)
    .sort((left, right) => priority[left.importance] - priority[right.importance])
    .slice(0, 2)
}

function mergeRecord(target: Record<string, unknown>, patch: Record<string, unknown>) {
  const next = { ...target }
  for (const [key, value] of Object.entries(patch)) {
    if (
      value
      && typeof value === 'object'
      && !Array.isArray(value)
      && next[key]
      && typeof next[key] === 'object'
      && !Array.isArray(next[key])
    ) {
      next[key] = mergeRecord(next[key] as Record<string, unknown>, value as Record<string, unknown>)
    } else {
      next[key] = value
    }
  }
  return next
}

export function answerIntentQuestion(input: {
  intent: AuthorIntentContract
  questionId: string
  optionId?: string
  customPatch?: Record<string, unknown>
  answeredBy?: 'author' | 'agent_assumption'
}): AuthorIntentContract {
  const question = input.intent.unresolvedQuestions.find(item => item.id === input.questionId)
  if (!question) return input.intent
  const optionPatch = input.optionId
    ? question.options.find(option => option.id === input.optionId)?.patch || {}
    : {}
  const patch = input.customPatch || optionPatch
  const merged = mergeRecord(input.intent as unknown as Record<string, unknown>, patch) as unknown as AuthorIntentContract
  const answeredBy = input.answeredBy || 'author'
  return {
    ...merged,
    id: randomId('author-intent'),
    revision: input.intent.revision + 1,
    fieldSources: {
      ...merged.fieldSources,
      [question.fieldPath]: answeredBy === 'author' ? 'author_selected' : 'agent_assumption',
    },
    unresolvedQuestions: merged.unresolvedQuestions.map(item => item.id === question.id
      ? { ...item, answeredBy }
      : item),
  }
}

export function lockAuthorIntent(
  intent: AuthorIntentContract,
  now = new Date().toISOString(),
): AuthorIntentContract {
  const blockers = intentLockBlockers(intent)
  if (blockers.length) {
    throw new CreationDecisionError('intent_incomplete', `Intent is incomplete: ${blockers.join(', ')}`)
  }
  return {
    ...intent,
    status: 'locked',
    lockedAt: now,
    lockedFields: Array.from(new Set([
      ...intent.lockedFields,
      'readerExperience.targetEmotion',
      'narrativeDelta.mustChange',
      'characterAgency.primaryActorId',
      'characterAgency.requiredChoice',
      'informationPolicy',
    ])),
  }
}

export function reopenAuthorIntent(intent: AuthorIntentContract): AuthorIntentContract {
  return {
    ...intent,
    id: randomId('author-intent'),
    revision: intent.revision + 1,
    status: 'draft',
    lockedAt: null,
    unresolvedQuestions: intent.unresolvedQuestions.map(question => ({
      ...question,
      answeredBy: null,
    })),
  }
}

export function assertSingleSceneScope(request: SceneDraftRequest) {
  const chapterCount = (request.scope as SceneDraftRequest['scope'] & { chapterCount?: number }).chapterCount
  if (chapterCount && chapterCount > 1) {
    throw new CreationDecisionError('multi_chapter_generation_forbidden', 'Multi-chapter prose generation is forbidden.')
  }
  if (request.scope.type === 'scene' && !request.scope.sceneId) {
    throw new CreationDecisionError('invalid_generation_scope', 'A scene scope requires one scene id.')
  }
  if (request.scope.type === 'selected_beats' && request.scope.beatIds.length === 0) {
    throw new CreationDecisionError('invalid_generation_scope', 'Selected beat scope requires at least one beat.')
  }
  if (request.scope.type === 'selected_text' && request.scope.selectedBlockIds.length === 0) {
    throw new CreationDecisionError('invalid_generation_scope', 'Selected text scope requires at least one block.')
  }
  if (request.scope.type === 'selected_text' && request.scope.selectedBlockIds.length > 3) {
    throw new CreationDecisionError('multi_scene_generation_forbidden', 'Selected text generation is limited to three manuscript blocks.')
  }
  const sceneIds = (request.scope as SceneDraftRequest['scope'] & { sceneIds?: string[] }).sceneIds || []
  if (sceneIds.length > 1) {
    throw new CreationDecisionError('multi_scene_generation_forbidden', 'Only one scene can be generated at a time.')
  }
}

export function assertDraftingAllowed(input: {
  session: CreationSession
  intent: AuthorIntentContract | null
  selectedCandidate: NarrativeCandidate | null
  request: SceneDraftRequest
}) {
  if (input.intent?.status !== 'locked' || input.session.lockedIntentId !== input.intent.id) {
    throw new CreationDecisionError('intent_not_locked', 'Lock the author intent before drafting prose.')
  }
  if (!input.selectedCandidate || input.session.selectedCandidateId !== input.selectedCandidate.id) {
    throw new CreationDecisionError('candidate_not_selected', 'Select a narrative path before drafting prose.')
  }
  if (input.session.phase !== 'candidate_selected') {
    throw new CreationDecisionError('invalid_phase_transition', 'The current phase cannot draft prose.')
  }
  assertSingleSceneScope(input.request)
}

export function assertCandidateSearchAllowed(input: {
  session: CreationSession
  intent: AuthorIntentContract | null
}) {
  if (input.intent?.status !== 'locked' || input.session.lockedIntentId !== input.intent.id) {
    throw new CreationDecisionError('intent_not_locked', 'Lock the author intent before searching narrative paths.')
  }
  if (!['intent_locked', 'candidate_search'].includes(input.session.phase)) {
    throw new CreationDecisionError('candidate_search_not_ready', 'The current phase cannot search narrative paths.')
  }
}

export type InvalidationTrigger =
  | 'canon_revision_changed'
  | 'intent_revision_changed'
  | 'candidate_selection_changed'
  | 'draft_revision_changed'
  | 'author_text_edited'
  | 'kernel_constraint_changed'
  | 'timeline_changed'

export interface InvalidationInput {
  trigger: InvalidationTrigger
  contexts: ContextSnapshot[]
  candidates: NarrativeCandidate[]
  drafts: SceneDraftResult[]
  reviews: LiteraryReview[]
  repairs: RepairProposal[]
  patches: CanonStatePatch[]
}

export function propagateInvalidation(input: InvalidationInput) {
  const staleContext = ['canon_revision_changed', 'intent_revision_changed', 'kernel_constraint_changed', 'timeline_changed']
    .includes(input.trigger)
  const staleCandidates = ['canon_revision_changed', 'intent_revision_changed', 'kernel_constraint_changed', 'timeline_changed']
    .includes(input.trigger)
  const staleDrafts = ['intent_revision_changed', 'candidate_selection_changed'].includes(input.trigger)
  const staleReviews = [
    'canon_revision_changed',
    'intent_revision_changed',
    'candidate_selection_changed',
    'draft_revision_changed',
    'author_text_edited',
    'kernel_constraint_changed',
    'timeline_changed',
  ].includes(input.trigger)
  const stalePatches = staleReviews

  return {
    contexts: input.contexts.map(item => staleContext ? { ...item, status: 'stale' as const } : item),
    candidates: input.candidates.map(item => staleCandidates
      ? { ...item, status: 'stale' as const }
      : item),
    drafts: input.drafts.map(item => staleDrafts ? { ...item, status: 'stale' as const } : item),
    reviews: input.reviews.map(item => staleReviews
      ? {
          ...item,
          status: 'stale' as const,
          findings: item.findings.map(finding => ({ ...finding, status: 'stale' as const })),
          extendedCraft: item.extendedCraft
            ? {
                ...item.extendedCraft,
                findings: item.extendedCraft.findings.map(finding => ({ ...finding, status: 'stale' as const })),
              }
            : undefined,
        }
      : item),
    repairs: input.repairs.map(item => staleReviews ? { ...item, status: 'stale' as const } : item),
    patches: input.patches.map(item => stalePatches ? { ...item, status: 'stale' as const } : item),
  }
}

export function creationDecisionEvent(input: Omit<CreationDecisionEvent, 'schemaVersion' | 'id' | 'occurredAt'> & {
  id?: string
  occurredAt?: string
}): CreationDecisionEvent {
  return {
    schemaVersion: 'creation-decision-event.v1',
    id: input.id || randomId('creation-event'),
    sessionId: input.sessionId,
    type: input.type,
    actor: input.actor,
    sourceRevision: input.sourceRevision,
    payload: input.payload,
    occurredAt: input.occurredAt || new Date().toISOString(),
  }
}
