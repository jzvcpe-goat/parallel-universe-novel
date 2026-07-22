import type {
  PmfBranch,
  PmfChapter,
  PmfLocalDraft,
  PmfLocalSettingAsset,
  PmfReaderRequest,
  PmfWork,
} from '@/features/pmf/types'
import {
  getCreatorAuthorizationStatus,
  listCreatorBranches,
  listCreatorChapters,
  listCreatorRequests,
  listCreatorWorks,
  type CreatorAuthorizationStatus,
  type PmfResult,
} from '@/lib/pmfSupabase'
import type { CreativeReminder } from '@/local-db/schema'
import { runEditorDraftLoad } from './creatorEditorDraftLoadService'
import { runEditorReminderLoad } from './creatorEditorReminderService'
import { runEditorSettingAssetLoad } from './creatorEditorSettingAssetService'
import { hydrateLocalWorkspace } from '@/local-db/creatorLocalWorkspaceRepository'
import {
  readEditorRecallSelections,
  type CreatorEditorRecallSelections,
} from './creatorEditorRecallSelectionService'

interface EditorStartupLocalSnapshot {
  creativeReminders: CreativeReminder[]
  drafts: PmfLocalDraft[]
  recallSelections: CreatorEditorRecallSelections
  settingAssets: PmfLocalSettingAsset[]
}

export interface EditorStartupLoadApiPort {
  getAuthorization(): Promise<PmfResult<CreatorAuthorizationStatus>>
  listBranches(): Promise<PmfResult<PmfBranch[]>>
  listChapters(): Promise<PmfResult<PmfChapter[]>>
  listRequests(): Promise<PmfResult<PmfReaderRequest[]>>
  listWorks(): Promise<PmfResult<PmfWork[]>>
}

export interface EditorStartupLocalPort {
  hydrateWorkspace(): Promise<void>
}

export type RunEditorStartupLoadResult =
  | {
    ok: false
    notice: string
  }
  | {
    ok: true
    authorization: CreatorAuthorizationStatus
    branches: PmfBranch[]
    chapters: PmfChapter[]
    creativeReminders: CreativeReminder[]
    drafts: PmfLocalDraft[]
    recallSelections: CreatorEditorRecallSelections
    requests: PmfReaderRequest[]
    settingAssets: PmfLocalSettingAsset[]
    works: PmfWork[]
  }

const defaultEditorStartupLoadApiPort: EditorStartupLoadApiPort = {
  getAuthorization: getCreatorAuthorizationStatus,
  listBranches: listCreatorBranches,
  listChapters: listCreatorChapters,
  listRequests: listCreatorRequests,
  listWorks: listCreatorWorks,
}

const defaultEditorStartupLocalPort: EditorStartupLocalPort = {
  hydrateWorkspace: hydrateLocalWorkspace,
}

export function readEditorStartupLocalSnapshot(): EditorStartupLocalSnapshot {
  return {
    creativeReminders: runEditorReminderLoad().creativeReminders,
    drafts: runEditorDraftLoad().drafts,
    recallSelections: readEditorRecallSelections(),
    settingAssets: runEditorSettingAssetLoad().settingAssets,
  }
}

export async function runEditorStartupLoad(
  api: EditorStartupLoadApiPort = defaultEditorStartupLoadApiPort,
  local: EditorStartupLocalPort = defaultEditorStartupLocalPort,
): Promise<RunEditorStartupLoadResult> {
  const [requestResult, workResult, branchResult, chapterResult, authorizationResult] = await Promise.all([
    api.listRequests(),
    api.listWorks(),
    api.listBranches(),
    api.listChapters(),
    api.getAuthorization(),
    local.hydrateWorkspace(),
  ])

  if (!requestResult.ok) return { ok: false, notice: requestResult.message }
  if (!workResult.ok) return { ok: false, notice: workResult.message }
  if (!branchResult.ok) return { ok: false, notice: branchResult.message }
  if (!chapterResult.ok) return { ok: false, notice: chapterResult.message }
  if (!authorizationResult.ok) return { ok: false, notice: authorizationResult.message }

  return {
    ok: true,
    authorization: authorizationResult.data,
    branches: branchResult.data,
    chapters: chapterResult.data,
    requests: requestResult.data,
    works: workResult.data,
    ...readEditorStartupLocalSnapshot(),
  }
}
