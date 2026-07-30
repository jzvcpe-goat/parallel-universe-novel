import {
  resetCreatorWritingAssistPreferences,
  writeCreatorDisplayPreferences,
  writeCreatorWritingAssistPreferences,
  type CreatorDisplayPreferences,
} from '@/local-db/creatorLocalSettingsRepository'
import type { CreatorWritingAssistPreferences } from '@/features/creator-decision/types'
import {
  hydrateLocalWorkspace,
  readLocalWorkspaceSnapshot,
  type LocalCreatorWorkspaceSnapshot,
} from '@/local-db/creatorLocalWorkspaceRepository'

export interface CreatorSettingsWritePort {
  hydrateWorkspace(): Promise<void>
  readWorkspaceSnapshot(): LocalCreatorWorkspaceSnapshot
  writeDisplayPreferences(preferences: CreatorDisplayPreferences): void
  writeWritingAssistPreferences(preferences: CreatorWritingAssistPreferences): void
  resetWritingAssistPreferences(): CreatorWritingAssistPreferences
}

const defaultCreatorSettingsWritePort: CreatorSettingsWritePort = {
  hydrateWorkspace: hydrateLocalWorkspace,
  readWorkspaceSnapshot: readLocalWorkspaceSnapshot,
  writeDisplayPreferences: writeCreatorDisplayPreferences,
  writeWritingAssistPreferences: writeCreatorWritingAssistPreferences,
  resetWritingAssistPreferences: resetCreatorWritingAssistPreferences,
}

export function saveCreatorWritingAssistPreferences(
  preferences: CreatorWritingAssistPreferences,
  port: CreatorSettingsWritePort = defaultCreatorSettingsWritePort,
) {
  port.writeWritingAssistPreferences(preferences)
  return { notice: '写作建议偏好已保存。' }
}

export function clearCreatorWritingAssistPreferences(
  port: CreatorSettingsWritePort = defaultCreatorSettingsWritePort,
) {
  return {
    notice: '写作建议偏好已重置。',
    preferences: port.resetWritingAssistPreferences(),
  }
}

export function saveCreatorWorkspacePreferences(
  preferences: CreatorDisplayPreferences,
  port: CreatorSettingsWritePort = defaultCreatorSettingsWritePort,
) {
  port.writeDisplayPreferences(preferences)
  return {
    notice: '显示偏好已保存。',
  }
}

export function clearCreatorWorkspacePreferences(
  port: CreatorSettingsWritePort = defaultCreatorSettingsWritePort,
) {
  const preferences: CreatorDisplayPreferences = {
    reduceMotion: false,
    reduceTransparency: false,
  }
  port.writeDisplayPreferences(preferences)

  return {
    notice: '显示偏好已重置。',
    preferences,
  }
}

export async function readCreatorSettingsWorkspaceSnapshot(
  port: Pick<CreatorSettingsWritePort, 'hydrateWorkspace' | 'readWorkspaceSnapshot'> = defaultCreatorSettingsWritePort,
) {
  await port.hydrateWorkspace()
  return port.readWorkspaceSnapshot()
}
