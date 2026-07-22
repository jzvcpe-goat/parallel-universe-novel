import {
  buildLocalWorkspacePackage,
  type LocalWorkspacePackageBuildInput,
} from '@/local-db/creatorLocalWorkspacePackage'
import {
  readCreatorWritingAssistPreferences,
  type CreatorDisplayPreferences,
} from '@/local-db/creatorLocalSettingsRepository'
import type { LocalCreatorWorkspaceSnapshot } from '@/local-db/creatorLocalWorkspaceRepository'
import { readCreatorSettingsWorkspaceSnapshot } from './creatorSettingsActionService'
import { downloadCreatorWorkspacePackage } from './creatorSettingsBrowserActionService'

interface CreatorSettingsWorkspacePackage {
  bytes: Uint8Array
}

export interface CreatorSettingsWorkspaceExportFlowPort {
  buildWorkspacePackage(input: LocalWorkspacePackageBuildInput): Promise<CreatorSettingsWorkspacePackage>
  downloadWorkspacePackage(bytes: Uint8Array, exportedAt: string): boolean
  nowIso(): string
  readWorkspaceSnapshot(): Promise<LocalCreatorWorkspaceSnapshot>
}

const defaultCreatorSettingsWorkspaceExportFlowPort: CreatorSettingsWorkspaceExportFlowPort = {
  buildWorkspacePackage: buildLocalWorkspacePackage,
  downloadWorkspacePackage: downloadCreatorWorkspacePackage,
  nowIso: () => new Date().toISOString(),
  readWorkspaceSnapshot: readCreatorSettingsWorkspaceSnapshot,
}

export async function runCreatorSettingsWorkspaceExport(
  preferences: CreatorDisplayPreferences,
  port: CreatorSettingsWorkspaceExportFlowPort = defaultCreatorSettingsWorkspaceExportFlowPort,
) {
  const snapshot = await port.readWorkspaceSnapshot()
  const exportedAt = port.nowIso()
  const workspacePackage = await port.buildWorkspacePackage({
    createdAt: exportedAt,
    snapshot,
    settings: {
      displayPreferences: preferences,
      writingAssistPreferences: readCreatorWritingAssistPreferences(),
    },
  })
  const downloaded = port.downloadWorkspacePackage(workspacePackage.bytes, exportedAt)

  return {
    notice: downloaded
      ? '本机工作区备份已导出。导入恢复前仍需要作者确认。'
      : '当前环境暂不能下载备份。',
    snapshot,
  }
}
