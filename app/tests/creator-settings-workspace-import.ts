import assert from 'node:assert/strict'
import {
  previewCreatorSettingsWorkspaceImport,
  runCreatorSettingsWorkspaceImport,
  type CreatorSettingsWorkspaceImportFlowPort,
} from '../src/apps/creator/routes/creatorSettingsWorkspaceImportFlowService'
import type { LocalCreatorWorkspaceSnapshot } from '../src/local-db/creatorLocalWorkspaceRepository'

const preview = {
  packageId: 'workspace-package:test',
  additions: [{ family: 'drafts', id: 'draft:1' }],
  conflicts: [{ family: 'workspaceSettings', id: 'default' }],
  unchanged: [{ family: 'writingAssets', id: 'asset:1' }],
  unsupported: [],
}
const snapshot = {
  drafts: [],
  settingAssets: [],
  readerSignals: [],
  creativeReminders: [],
  verifiedLongRangeThreads: [],
  publishBundles: [],
  publishReceipts: [],
  operationRecords: [],
  workspaceConflicts: [],
} as unknown as LocalCreatorWorkspaceSnapshot
const applied: Array<{ authorConfirmed: boolean; conflictPolicy: string }> = []
const port: CreatorSettingsWorkspaceImportFlowPort = {
  applyWorkspacePackage: async (_bytes, input) => {
    applied.push(input)
  },
  previewWorkspacePackage: async () => preview,
  readWorkspaceSnapshot: async () => snapshot,
}

const selected = await previewCreatorSettingsWorkspaceImport(
  new File([new Uint8Array([1, 2, 3])], 'workspace.pufw.zip'),
  port,
)
assert.equal(selected.fileName, 'workspace.pufw.zip')
assert.deepEqual(selected.preview, preview)
assert.deepEqual([...selected.bytes], [1, 2, 3])

const result = await runCreatorSettingsWorkspaceImport(selected, 'use-import', port)
assert.deepEqual(applied, [{ authorConfirmed: true, conflictPolicy: 'use-import' }])
assert.equal(result.snapshot, snapshot)
assert.match(result.notice, /共导入 2 项/u)

console.log('Creator settings workspace import flow verified.')
