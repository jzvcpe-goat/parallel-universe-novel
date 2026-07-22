import {
  applyLocalWorkspacePackage,
  previewLocalWorkspacePackage,
  type LocalWorkspaceImportConflictPolicy,
  type LocalWorkspacePackagePreview,
} from '@/local-db/creatorLocalWorkspacePackage'
import type { LocalCreatorWorkspaceSnapshot } from '@/local-db/creatorLocalWorkspaceRepository'
import { readCreatorSettingsWorkspaceSnapshot } from './creatorSettingsActionService'

export interface CreatorSettingsWorkspaceImportPreview {
  bytes: Uint8Array
  fileName: string
  preview: LocalWorkspacePackagePreview
}

export interface CreatorSettingsWorkspaceImportFlowPort {
  applyWorkspacePackage(
    bytes: Uint8Array,
    input: { authorConfirmed: boolean; conflictPolicy: LocalWorkspaceImportConflictPolicy },
  ): Promise<unknown>
  previewWorkspacePackage(bytes: Uint8Array): Promise<LocalWorkspacePackagePreview>
  readWorkspaceSnapshot(): Promise<LocalCreatorWorkspaceSnapshot>
}

const defaultCreatorSettingsWorkspaceImportFlowPort: CreatorSettingsWorkspaceImportFlowPort = {
  applyWorkspacePackage: applyLocalWorkspacePackage,
  previewWorkspacePackage: previewLocalWorkspacePackage,
  readWorkspaceSnapshot: readCreatorSettingsWorkspaceSnapshot,
}

export async function previewCreatorSettingsWorkspaceImport(
  file: File,
  port: CreatorSettingsWorkspaceImportFlowPort = defaultCreatorSettingsWorkspaceImportFlowPort,
): Promise<CreatorSettingsWorkspaceImportPreview> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const preview = await port.previewWorkspacePackage(bytes)
  return { bytes, fileName: file.name, preview }
}

export async function runCreatorSettingsWorkspaceImport(
  selected: CreatorSettingsWorkspaceImportPreview,
  conflictPolicy: LocalWorkspaceImportConflictPolicy,
  port: CreatorSettingsWorkspaceImportFlowPort = defaultCreatorSettingsWorkspaceImportFlowPort,
) {
  await port.applyWorkspacePackage(selected.bytes, {
    authorConfirmed: true,
    conflictPolicy,
  })
  const snapshot = await port.readWorkspaceSnapshot()
  const importedCount = selected.preview.additions.length
    + (conflictPolicy === 'use-import' ? selected.preview.conflicts.length : 0)

  return {
    notice: `备份已恢复，共导入 ${importedCount} 项；${selected.preview.unchanged.length} 项保持不变。`,
    snapshot,
  }
}
