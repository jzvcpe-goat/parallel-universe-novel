import {
  creatorLocalMetaKeys,
  readLocalMetaValue,
  upsertLocalMetaValue,
} from './creatorLocalRepository'
import { creatorWritingAssistPreferencesSchema } from '@/features/creator-decision/schemas'
import type { CreatorWritingAssistPreferences } from '@/features/creator-decision/types'
import { DEFAULT_CREATOR_WRITING_ASSIST_PREFERENCES } from '@/features/creator-decision/writingAssistance'

export interface CreatorDisplayPreferences {
  reduceMotion: boolean
  reduceTransparency: boolean
}

function randomId(prefix: string) {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}:${id}`
}

export function isLocalCreatorHost() {
  if (typeof window === 'undefined') return false
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
}

export function getLocalCreatorClientId() {
  if (typeof window === 'undefined') return randomId('creator-client')
  const existing = readLocalMetaValue(creatorLocalMetaKeys.clientId, '')
  if (existing) return existing
  const next = crypto.randomUUID()
  upsertLocalMetaValue(creatorLocalMetaKeys.clientId, next)
  return next
}

export function readCreatorDisplayPreferences(): CreatorDisplayPreferences {
  return readLocalMetaValue<CreatorDisplayPreferences>(creatorLocalMetaKeys.displayPreferences, {
    reduceMotion: false,
    reduceTransparency: false,
  })
}

export function writeCreatorDisplayPreferences(preferences: CreatorDisplayPreferences) {
  return upsertLocalMetaValue(creatorLocalMetaKeys.displayPreferences, preferences)
}

export function readCreatorWritingAssistPreferences(): CreatorWritingAssistPreferences {
  const stored = readLocalMetaValue<unknown>(
    creatorLocalMetaKeys.writingAssistPreferences,
    DEFAULT_CREATOR_WRITING_ASSIST_PREFERENCES,
  )
  const parsed = creatorWritingAssistPreferencesSchema.safeParse(stored)
  return parsed.success
    ? parsed.data
    : { ...DEFAULT_CREATOR_WRITING_ASSIST_PREFERENCES }
}

export function writeCreatorWritingAssistPreferences(
  preferences: CreatorWritingAssistPreferences,
) {
  return upsertLocalMetaValue(
    creatorLocalMetaKeys.writingAssistPreferences,
    creatorWritingAssistPreferencesSchema.parse(preferences),
  )
}

export function resetCreatorWritingAssistPreferences() {
  const preferences = { ...DEFAULT_CREATOR_WRITING_ASSIST_PREFERENCES }
  upsertLocalMetaValue(creatorLocalMetaKeys.writingAssistPreferences, preferences)
  return preferences
}
