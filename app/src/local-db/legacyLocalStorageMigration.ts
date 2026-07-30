import type { PmfLocalDraft, PmfLocalSettingAsset } from '@/features/pmf/types'
import { creatorLocalMetaKeys, type CreatorLocalMetaKey } from './schema'

const LEGACY_LOCAL_DRAFT_KEY = 'parallel-universe.local-creator.drafts'
const LEGACY_LOCAL_SETTING_ASSET_KEY = 'parallel-universe.local-creator.setting-assets'
const LEGACY_LOCAL_CREATOR_CLIENT_KEY = 'parallel-universe.local-creator.client-id'
const LEGACY_LOCAL_AI_SETTINGS_KEY = 'parallel-universe.local-creator.ai-settings'
const LEGACY_LOCAL_DISPLAY_PREFERENCES_KEY = 'parallel-universe.local-creator.display-preferences'

export interface LegacyLocalMetaRecord {
  key: CreatorLocalMetaKey
  value: unknown
  updatedAt: string
  legacyKey: string
}

function readLegacyRaw(key: string) {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function readLegacyJson<T>(key: string, fallback: T): T {
  const raw = readLegacyRaw(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function readLegacyJsonValue<T>(key: string): T | null {
  const raw = readLegacyRaw(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function readLegacyLocalDrafts(): PmfLocalDraft[] {
  return readLegacyJson<PmfLocalDraft[]>(LEGACY_LOCAL_DRAFT_KEY, [])
}

export function readLegacyLocalSettingAssets(): PmfLocalSettingAsset[] {
  return readLegacyJson<PmfLocalSettingAsset[]>(LEGACY_LOCAL_SETTING_ASSET_KEY, [])
}

export function readLegacyLocalMetaRecords(): LegacyLocalMetaRecord[] {
  const updatedAt = new Date().toISOString()
  const records: LegacyLocalMetaRecord[] = []
  const clientId = readLegacyRaw(LEGACY_LOCAL_CREATOR_CLIENT_KEY)
  const aiSettings = readLegacyJsonValue(LEGACY_LOCAL_AI_SETTINGS_KEY)
  const displayPreferences = readLegacyJsonValue(LEGACY_LOCAL_DISPLAY_PREFERENCES_KEY)

  if (clientId) {
    records.push({
      key: creatorLocalMetaKeys.clientId,
      value: clientId,
      updatedAt,
      legacyKey: LEGACY_LOCAL_CREATOR_CLIENT_KEY,
    })
  }
  if (aiSettings) {
    records.push({
      key: creatorLocalMetaKeys.aiSettings,
      value: aiSettings,
      updatedAt,
      legacyKey: LEGACY_LOCAL_AI_SETTINGS_KEY,
    })
  }
  if (displayPreferences) {
    records.push({
      key: creatorLocalMetaKeys.displayPreferences,
      value: displayPreferences,
      updatedAt,
      legacyKey: LEGACY_LOCAL_DISPLAY_PREFERENCES_KEY,
    })
  }

  return records
}
