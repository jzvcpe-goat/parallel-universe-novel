import type {
  PmfCreatorClient,
  PmfFeatureFlag,
} from '@/features/pmf/types'
import {
  getCreatorAuthorizationStatus,
  listCreatorFeatureFlags,
  syncCreatorClient,
  type CreatorAuthorizationStatus,
  type PmfResult,
} from '@/lib/pmfSupabase'
import {
  isLocalCreatorHost,
  readCreatorDisplayPreferences,
  readCreatorWritingAssistPreferences,
  type CreatorDisplayPreferences,
} from '@/local-db/creatorLocalSettingsRepository'
import type { CreatorWritingAssistPreferences } from '@/features/creator-decision/types'
import {
  hydrateLocalWorkspace,
  readLocalWorkspaceSnapshot,
  type LocalCreatorWorkspaceSnapshot,
} from '@/local-db/creatorLocalWorkspaceRepository'
import { creatorFacingNotice } from '../creatorViewHelpers'
import { readHydratedCreatorSettingsLocalState } from './creatorSettingsHydrationService'

export type { CreatorAuthorizationStatus, CreatorDisplayPreferences, LocalCreatorWorkspaceSnapshot }

export interface CreatorSettingsLoadApiPort {
  getAuthorizationStatus(): Promise<PmfResult<CreatorAuthorizationStatus>>
  listFeatureFlags(): Promise<PmfResult<PmfFeatureFlag[]>>
  syncClient(): Promise<PmfResult<PmfCreatorClient>>
}

export interface CreatorSettingsLocalReadPort {
  hydrateWorkspace(): Promise<void>
  isLocalHost(): boolean
  readDisplayPreferences(): CreatorDisplayPreferences
  readWritingAssistPreferences(): CreatorWritingAssistPreferences
  readWorkspaceSnapshot(): LocalCreatorWorkspaceSnapshot
}

interface CreatorSettingsLocalSnapshot {
  isLocalSurface: boolean
  preferences: CreatorDisplayPreferences
  writingAssistPreferences: CreatorWritingAssistPreferences
  workspaceSnapshot: LocalCreatorWorkspaceSnapshot
}

type RunCreatorSettingsLoadResult =
  | {
    authorization: CreatorAuthorizationStatus | null
    client: PmfCreatorClient | null
    flags: PmfFeatureFlag[]
    notice: string
    ok: false
    preferences: CreatorDisplayPreferences
    writingAssistPreferences: CreatorWritingAssistPreferences
    workspaceSnapshot: LocalCreatorWorkspaceSnapshot
  }
  | {
    authorization: CreatorAuthorizationStatus | null
    client: PmfCreatorClient | null
    flags: PmfFeatureFlag[]
    notice: string
    ok: true
    preferences: CreatorDisplayPreferences
    writingAssistPreferences: CreatorWritingAssistPreferences
    workspaceSnapshot: LocalCreatorWorkspaceSnapshot
  }

const defaultCreatorSettingsLoadApiPort: CreatorSettingsLoadApiPort = {
  getAuthorizationStatus: getCreatorAuthorizationStatus,
  listFeatureFlags: listCreatorFeatureFlags,
  syncClient: syncCreatorClient,
}

const defaultCreatorSettingsLocalReadPort: CreatorSettingsLocalReadPort = {
  hydrateWorkspace: hydrateLocalWorkspace,
  isLocalHost: isLocalCreatorHost,
  readDisplayPreferences: readCreatorDisplayPreferences,
  readWritingAssistPreferences: readCreatorWritingAssistPreferences,
  readWorkspaceSnapshot: readLocalWorkspaceSnapshot,
}

export function readCreatorSettingsLocalSnapshot(
  local: CreatorSettingsLocalReadPort = defaultCreatorSettingsLocalReadPort,
): CreatorSettingsLocalSnapshot {
  return {
    isLocalSurface: local.isLocalHost(),
    preferences: local.readDisplayPreferences(),
    writingAssistPreferences: local.readWritingAssistPreferences(),
    workspaceSnapshot: local.readWorkspaceSnapshot(),
  }
}

export async function runCreatorSettingsLoad(
  api: CreatorSettingsLoadApiPort = defaultCreatorSettingsLoadApiPort,
  local: Pick<
    CreatorSettingsLocalReadPort,
    'hydrateWorkspace' | 'readDisplayPreferences' | 'readWritingAssistPreferences' | 'readWorkspaceSnapshot'
  > = defaultCreatorSettingsLocalReadPort,
): Promise<RunCreatorSettingsLoadResult> {
  const {
    preferences,
    writingAssistPreferences,
    workspaceSnapshot,
  } = await readHydratedCreatorSettingsLocalState(local)
  const [clientResult, authorizationResult, flagsResult] = await Promise.all([
    api.syncClient(),
    api.getAuthorizationStatus(),
    api.listFeatureFlags(),
  ])

  const client = clientResult.ok ? clientResult.data : null
  const authorization = authorizationResult.ok ? authorizationResult.data : null
  const flags = flagsResult.ok ? flagsResult.data : []
  const firstError = [clientResult, authorizationResult, flagsResult].find(result => !result.ok)

  if (firstError && !firstError.ok) {
    return {
      authorization,
      client,
      flags,
      notice: creatorFacingNotice(firstError.message),
      ok: false,
      preferences,
      writingAssistPreferences,
      workspaceSnapshot,
    }
  }

  return {
    authorization,
    client,
    flags,
    notice: '创作环境已更新。',
    ok: true,
    preferences,
    writingAssistPreferences,
    workspaceSnapshot,
  }
}
