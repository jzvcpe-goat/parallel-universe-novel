import type { PmfLocalDraft, PmfLocalSettingAsset } from '@/features/pmf/types'
import { readLocalAgentOperations } from './creatorLocalAgentRepository'
import { readLocalWorkspaceConflicts } from './creatorLocalConflictRepository'
import { hydrateCreatorLocalRepository } from './creatorLocalRepository'
import {
  readLocalReaderSignals,
  type PmfLocalReaderSignal,
} from './creatorLocalReaderSignalRepository'
import {
  readLocalPublishBundles,
  readLocalPublishReceipts,
} from './creatorLocalPublishRepository'
import { readLocalSettingAssets } from './creatorLocalSettingAssetRepository'
import { readLocalDrafts } from './creatorLocalDraftRepository'
import { readVerifiedLongRangeThreadRecords } from './creatorLocalLongRangeThreadRepository'
import { readLocalMigrationReceipts } from './creatorLocalMigrationRepository'
import {
  readLocalCreativeReminders,
  type PmfCreativeReminder,
} from './creatorLocalWritingRepository'
import type {
  AgentOperationLog,
  LocalMigrationReceipt,
  LocalWorkspaceConflictRecord,
  PublishBundleRecord,
  PublishReceiptRecord,
} from './schema'
import type { VerifiedLongRangeThreadRecord } from '@/features/creator-decision/longRangeThreadRecall'

export interface LocalCreatorWorkspaceSnapshot {
  drafts: PmfLocalDraft[]
  settingAssets: PmfLocalSettingAsset[]
  readerSignals: PmfLocalReaderSignal[]
  creativeReminders: PmfCreativeReminder[]
  verifiedLongRangeThreads: VerifiedLongRangeThreadRecord[]
  publishBundles: PublishBundleRecord[]
  publishReceipts: PublishReceiptRecord[]
  operationRecords: AgentOperationLog[]
  migrationReceipts: LocalMigrationReceipt[]
  workspaceConflicts: LocalWorkspaceConflictRecord[]
}

export function readLocalWorkspaceSnapshot(): LocalCreatorWorkspaceSnapshot {
  return {
    drafts: readLocalDrafts(),
    settingAssets: readLocalSettingAssets(),
    readerSignals: readLocalReaderSignals(),
    creativeReminders: readLocalCreativeReminders(),
    verifiedLongRangeThreads: readVerifiedLongRangeThreadRecords(),
    publishBundles: readLocalPublishBundles(),
    publishReceipts: readLocalPublishReceipts(),
    operationRecords: readLocalAgentOperations(20),
    migrationReceipts: readLocalMigrationReceipts(),
    workspaceConflicts: readLocalWorkspaceConflicts(),
  }
}

export function hydrateLocalWorkspace() {
  return hydrateCreatorLocalRepository()
}
