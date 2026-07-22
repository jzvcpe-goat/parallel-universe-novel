import type { CreatorWritingAssistPreferences } from '@/features/creator-decision/types'
import type { CreatorDisplayPreferences } from '@/local-db/creatorLocalSettingsRepository'
import type { LocalCreatorWorkspaceSnapshot } from '@/local-db/creatorLocalWorkspaceRepository'

export interface CreatorSettingsHydrationPort {
  hydrateWorkspace(): Promise<void>
  readDisplayPreferences(): CreatorDisplayPreferences
  readWritingAssistPreferences(): CreatorWritingAssistPreferences
  readWorkspaceSnapshot(): LocalCreatorWorkspaceSnapshot
}

export async function readHydratedCreatorSettingsLocalState(
  local: CreatorSettingsHydrationPort,
) {
  await local.hydrateWorkspace()
  return {
    preferences: local.readDisplayPreferences(),
    writingAssistPreferences: local.readWritingAssistPreferences(),
    workspaceSnapshot: local.readWorkspaceSnapshot(),
  }
}
