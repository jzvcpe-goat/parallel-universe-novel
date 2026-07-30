import { z } from 'zod'

export const characterStateDimensions = [
  'location',
  'timePosition',
  'physicalCondition',
  'emotionalState',
  'dominantDesire',
  'immediateGoal',
  'currentIntent',
  'fear',
  'woundTrigger',
  'defenseStrategy',
  'beliefs',
  'falseBeliefs',
  'knowledge',
  'secrets',
  'resources',
  'capabilities',
  'limitations',
  'relationshipStances',
  'trust',
  'obligations',
  'recentChoice',
  'paidCost',
] as const

export type CharacterStateDimension = typeof characterStateDimensions[number]
export type CharacterStateValue = string | string[]
export type CharacterStateSnapshot = Partial<Record<CharacterStateDimension, CharacterStateValue>>

export const characterStateDimensionGroups = {
  embodiedContinuity: [
    'location',
    'timePosition',
    'physicalCondition',
    'resources',
    'capabilities',
    'limitations',
  ],
  agencyAndCommitment: [
    'dominantDesire',
    'immediateGoal',
    'currentIntent',
    'obligations',
    'recentChoice',
    'paidCost',
  ],
  innerModel: [
    'emotionalState',
    'fear',
    'woundTrigger',
    'defenseStrategy',
    'beliefs',
    'falseBeliefs',
    'knowledge',
    'secrets',
  ],
  socialDynamics: [
    'relationshipStances',
    'trust',
  ],
} as const satisfies Record<string, readonly CharacterStateDimension[]>

export const characterStateDimensionSchema = z.enum(characterStateDimensions)

const legacyDimensionAliases = {
  relationshipPosition: 'relationshipStances',
} as const satisfies Record<string, CharacterStateDimension>

const persistedLegacyDimensionAliases = {
  access: 'limitations',
  identityExposure: 'secrets',
  injuries: 'physicalCondition',
  leftHand: 'physicalCondition',
  morningAssignment: 'obligations',
  movementRestriction: 'limitations',
  reputation: 'relationshipStances',
} as const satisfies Record<string, CharacterStateDimension>

const persistedLegacyStatusAliases = {
  movementRestriction: 'limitations',
  role: 'obligations',
} as const satisfies Record<string, CharacterStateDimension>

export interface CharacterStatePath {
  characterId: string
  dimension: CharacterStateDimension
  normalizedPath: string
  legacyAlias: boolean
}

export function parseCharacterStatePath(path: string): CharacterStatePath | null {
  const match = /^\/characters\/([^/]+)\/([^/]+)$/.exec(path)
  if (!match) return null
  const [, characterId, rawDimension] = match
  if (!characterId || !rawDimension) return null
  const parsedDimension = characterStateDimensionSchema.safeParse(rawDimension)
  const alias = legacyDimensionAliases[rawDimension as keyof typeof legacyDimensionAliases]
  const dimension = parsedDimension.success ? parsedDimension.data : alias
  if (!dimension) return null
  return {
    characterId,
    dimension,
    normalizedPath: `/characters/${characterId}/${dimension}`,
    legacyAlias: Boolean(alias),
  }
}

export function isSupportedCharacterStatePath(path: string) {
  return parseCharacterStatePath(path) !== null
}

export function normalizeCharacterStatePath(path: string) {
  return parseCharacterStatePath(path)?.normalizedPath || path
}

/**
 * Reads state paths produced before the 22-dimension contract existed.
 * Runtime/model output must continue to use parseCharacterStatePath instead.
 */
export function normalizePersistedCharacterStatePath(path: string) {
  const current = parseCharacterStatePath(path)
  if (current) return current.normalizedPath

  const match = /^\/characters\/([^/]+)\/(.+)$/.exec(path)
  if (!match) return path
  const [, characterId, legacyPath] = match
  const segments = legacyPath.split('/').filter(Boolean)
  const [root, detail] = segments
  if (!characterId || !root) return path

  const currentRoot = characterStateDimensionSchema.safeParse(root)
  const dimension = currentRoot.success
    ? currentRoot.data
    : root === 'status' && detail
      ? persistedLegacyStatusAliases[detail as keyof typeof persistedLegacyStatusAliases]
      : persistedLegacyDimensionAliases[root as keyof typeof persistedLegacyDimensionAliases]

  return dimension ? `/characters/${characterId}/${dimension}` : path
}

export function emptyCharacterStateSnapshot(): Record<CharacterStateDimension, string[]> {
  const snapshot = {} as Record<CharacterStateDimension, string[]>
  for (const dimension of characterStateDimensions) snapshot[dimension] = []
  return snapshot
}
