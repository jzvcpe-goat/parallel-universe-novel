import type {
  AuthorIntentContract,
  ContextSnapshot,
  CreationContextSource,
  CreationSession,
} from './types'

export const CONTEXT_COMPILATION_POLICY_VERSION = 2

function stableId(value: string) {
  let hash = 2166136261
  for (const char of value) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash >>> 0).toString(36)
}

function stableSerialize(value: unknown): string {
  if (value === undefined) return 'undefined'
  if (value === null || typeof value !== 'object') return JSON.stringify(value) || 'undefined'
  if (Array.isArray(value)) {
    return `[${value.map(entry => entry === undefined ? 'null' : stableSerialize(entry)).join(',')}]`
  }
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
    .join(',')}}`
}

export function contextSourceFingerprint(source: CreationContextSource) {
  return `context-source:${stableId(stableSerialize(source))}`
}

type ContextSnapshotFingerprintInput = Omit<ContextSnapshot, 'contentFingerprint'> & {
  contentFingerprint?: string
}

export function contextSnapshotFingerprint(context: ContextSnapshotFingerprintInput) {
  const stableContext = Object.fromEntries(Object.entries(context).filter(([key]) => (
    key !== 'status' && key !== 'createdAt' && key !== 'contentFingerprint'
  )))
  return `context-snapshot-content:${stableId(stableSerialize(stableContext))}`
}

export function contextSnapshotIntegrityIsCurrent(context: ContextSnapshot) {
  return context.compilationPolicyVersion === CONTEXT_COMPILATION_POLICY_VERSION
    && context.sourceFingerprint !== 'legacy-unfingerprinted'
    && context.contentFingerprint !== 'legacy-unfingerprinted'
    && context.contentFingerprint === contextSnapshotFingerprint(context)
}

export function compileContextSnapshot(input: {
  session: CreationSession
  intent: AuthorIntentContract
  source: CreationContextSource
  now?: string
}): ContextSnapshot {
  const { session, intent, source } = input
  const now = input.now || new Date().toISOString()
  const manuallySelectedCharacterIds = new Set((source.manualRecallItems || [])
    .filter(item => item.group === 'character_knowledge' && item.locator.kind === 'asset')
    .flatMap(item => [item.sourceId, item.locator.targetId]))
  const activeCharacters = source.activeCharacters.filter(character => (
    character.id === intent.characterAgency.primaryActorId
    || intent.informationPolicy.charactersMustNotKnow.some(item => item.characterId === character.id)
    || manuallySelectedCharacterIds.has(character.id)
  ))
  const effectiveCharacters = activeCharacters.length
    ? activeCharacters
    : source.activeCharacters.slice(0, 4)
  const manifest = [
    {
      sourceId: intent.id,
      sourceRevision: intent.revision,
      authority: 'author' as const,
      includedReason: 'locked_author_intent',
    },
    ...source.manifest,
  ]
  const sourceFingerprint = contextSourceFingerprint(source)
  const idSeed = [
    session.id,
    intent.revision,
    CONTEXT_COMPILATION_POLICY_VERSION,
    sourceFingerprint,
    source.canonRevision,
    source.kernelRevision,
    source.constraintRevision,
    manifest.map(item => `${item.sourceId}:${item.sourceRevision}`).join('|'),
  ].join(':')

  const context = {
    schemaVersion: 'context-snapshot.v1',
    id: `context-snapshot:${stableId(idSeed)}`,
    compilationPolicyVersion: CONTEXT_COMPILATION_POLICY_VERSION,
    sourceFingerprint,
    sessionId: session.id,
    intentRevision: intent.revision,
    workId: session.workId,
    chapterId: session.chapterId,
    sceneId: session.sceneId,
    canonRevision: source.canonRevision,
    kernelRevision: source.kernelRevision,
    constraintRevision: source.constraintRevision,
    activeCharacters: effectiveCharacters,
    relevantRelationships: source.relevantRelationships,
    activePromises: source.activePromises,
    unresolvedForeshadowing: source.unresolvedForeshadowing,
    currentTimeline: source.currentTimeline,
    relevantWorldRules: source.relevantWorldRules,
    kernelRules: source.kernelRules,
    hardConstraints: source.hardConstraints,
    relevantRegressionExamples: source.relevantRegressionExamples.slice(0, 4),
    recentSceneSummaries: source.recentSceneSummaries.slice(-4),
    styleSamples: source.styleSamples.slice(-3).map(sample => ({
      ...sample,
      text: sample.text.slice(0, 1200),
    })),
    manualRecallItems: source.manualRecallItems || [],
    manifest,
    status: 'active',
    createdAt: now,
  } satisfies Omit<ContextSnapshot, 'contentFingerprint'>
  return {
    ...context,
    contentFingerprint: contextSnapshotFingerprint(context),
  }
}

export function contextMatchesCurrentSource(input: {
  context: ContextSnapshot
  source: CreationContextSource
  intentRevision: number
}) {
  return contextSnapshotIntegrityIsCurrent(input.context)
    && input.context.sourceFingerprint === contextSourceFingerprint(input.source)
    && contextMatchesCurrentRevisions({
      context: input.context,
      canonRevision: input.source.canonRevision,
      intentRevision: input.intentRevision,
      kernelRevision: input.source.kernelRevision,
      constraintRevision: input.source.constraintRevision,
    })
}

export function contextMatchesCurrentRevisions(input: {
  context: ContextSnapshot
  canonRevision: number
  intentRevision: number
  kernelRevision: number
  constraintRevision: number
}) {
  return input.context.status === 'active'
    && input.context.canonRevision === input.canonRevision
    && input.context.intentRevision === input.intentRevision
    && input.context.kernelRevision === input.kernelRevision
    && input.context.constraintRevision === input.constraintRevision
}
