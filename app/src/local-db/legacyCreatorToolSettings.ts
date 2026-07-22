import {
  creatorLocalMetaKeys,
  readLocalMetaValue,
} from './creatorLocalRepository'

export interface LegacyCreatorToolSettings {
  provider: 'manual' | 'local_endpoint' | 'openai_compatible'
  baseUrl: string
  model: string
  hasKey: boolean
}

const legacyCreatorToolSettingsFallback: LegacyCreatorToolSettings = {
  provider: 'manual',
  baseUrl: '',
  model: '',
  hasKey: false,
}

// Compatibility cleanup only. Product routes and workspace exports must not use this record.
export function readLegacyCreatorToolSettings(): LegacyCreatorToolSettings {
  return readLocalMetaValue(
    creatorLocalMetaKeys.aiSettings,
    legacyCreatorToolSettingsFallback,
  )
}
