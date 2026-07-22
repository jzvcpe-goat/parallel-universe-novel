import { sceneAuthorDecisionRequiredSchema } from './schemas'
import type {
  AuthorIntentContract,
  CreationDecisionSnapshot,
  SceneAuthorDecisionRequired,
  SceneAuthorDecisionSelection,
} from './types'
import { CreationDecisionError } from './types'

function randomId(prefix: string) {
  const value = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}:${value}`
}

function selectedDecisionIds(snapshot: CreationDecisionSnapshot) {
  return new Set(snapshot.events
    .filter(event => event.type === 'scene_author_decision_selected')
    .map(event => event.payload.decisionId)
    .filter((value): value is string => typeof value === 'string'))
}

export function pendingSceneAuthorDecision(
  snapshot: CreationDecisionSnapshot,
): SceneAuthorDecisionRequired | null {
  const selected = selectedDecisionIds(snapshot)
  const requested = [...snapshot.events]
    .filter(event => event.type === 'scene_author_decision_requested')
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
  for (const event of requested) {
    const parsed = sceneAuthorDecisionRequiredSchema.safeParse(event.payload.decision)
    if (parsed.success && !selected.has(parsed.data.decisionId)) return parsed.data
  }
  return null
}

export function reviseIntentFromSceneAuthorDecision(input: {
  intent: AuthorIntentContract
  decision: SceneAuthorDecisionRequired
  selection: SceneAuthorDecisionSelection
}): AuthorIntentContract {
  if (input.intent.status !== 'locked') {
    throw new CreationDecisionError(
      'intent_not_locked',
      'Lock the author intent before selecting a replacement scene mechanism.',
    )
  }
  if (!input.selection.authorConfirmed) {
    throw new CreationDecisionError(
      'scene_author_decision_required',
      'The author must explicitly confirm one scene direction.',
    )
  }
  if (
    input.selection.decisionId !== input.decision.decisionId
    || input.selection.sessionId !== input.decision.sessionId
    || input.selection.intentId !== input.decision.intentId
    || input.selection.intentRevision !== input.decision.intentRevision
    || input.intent.id !== input.decision.intentId
    || input.intent.revision !== input.decision.intentRevision
  ) {
    throw new CreationDecisionError(
      'stale_result',
      'The scene direction belongs to an older author intent.',
    )
  }
  const option = input.decision.decisionOptions.options.find(item => item.id === input.selection.optionId)
  if (!option) {
    throw new CreationDecisionError(
      'author_decision_option_invalid',
      'The selected scene direction was not offered to the author.',
    )
  }
  return {
    ...input.intent,
    id: randomId('author-intent'),
    revision: input.intent.revision + 1,
    status: 'locked',
    sceneMechanismDirection: {
      ...option,
      decisionId: input.decision.decisionId,
      pipelineId: input.decision.pipelineId,
      selectedAt: input.selection.selectedAt,
    },
    fieldSources: {
      ...input.intent.fieldSources,
      sceneMechanismDirection: 'author_selected',
    },
    lockedFields: Array.from(new Set([
      ...input.intent.lockedFields,
      'sceneMechanismDirection',
    ])),
    createdAt: input.selection.selectedAt,
    lockedAt: input.selection.selectedAt,
  }
}
