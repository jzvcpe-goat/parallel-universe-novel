#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const schema = readFileSync(resolve(root, 'app/src/local-db/schema.ts'), 'utf8')
const repository = readFileSync(resolve(root, 'app/src/local-db/creatorLocalRepository.ts'), 'utf8')
const legacyMigrationApplier = readFileSync(resolve(root, 'app/src/local-db/creatorLocalLegacyMigrationApplier.ts'), 'utf8')
const legacyMigration = readFileSync(resolve(root, 'app/src/local-db/legacyLocalStorageMigration.ts'), 'utf8')
const contract = readFileSync(resolve(root, 'docs/data-contracts/local-creator-storage-v2.md'), 'utf8')
const failures = []

for (const marker of [
  'LOCAL_DB_NAME',
  'LOCAL_SCHEMA_VERSION = 10',
  'localDbStores',
  'creatorLocalMetaKeys',
  'LocalDraftRecord',
  'LocalDraftBodyRecord',
  'LocalMigrationReceipt',
  'LocalWritingAssetKind',
  'LocalWritingAssetStage',
  'LocalWritingAsset',
  'LocalCharacterArcFields',
  'LocalReaderSignalCache',
  'ReaderSignalSourceSyncState',
  'CreativeReminder',
  'verifiedLongRangeThreads',
  'PublishBundleRecord',
  'PublishReceiptRecord',
  'AgentOperationLog',
  'AgentConfirmationReceipt',
  'LocalWorkspaceRecordFamily',
  'LocalWorkspaceRevision',
  'LocalWorkspaceConflictRecord',
  'LocalWorkspacePackageRecord',
  'LocalWorkspaceImportReceipt',
  'importRecordFingerprints',
]) {
  if (!schema.includes(marker)) failures.push(`schema missing ${marker}`)
}

for (const store of [
  'drafts',
  'draftBodies',
  'writingAssets',
  'readerSignals',
  'readerSignalSources',
  'creativeReminders',
  'verifiedLongRangeThreads',
  'publishBundles',
  'publishReceipts',
  'agentOperationLog',
  'agentConfirmations',
  'migrations',
  'workspaceRevisions',
  'workspaceConflicts',
  'workspacePackages',
  'workspaceImports',
  'creationSessions',
  'authorIntents',
  'contextSnapshots',
  'narrativeCandidates',
  'sceneDrafts',
  'literaryReviews',
  'repairProposals',
  'canonPatches',
  'localCanonStates',
  'creationDecisionEvents',
]) {
  if (!schema.includes(`${store}:`)) failures.push(`localDbStores missing ${store}`)
}

for (const marker of [
  "writingAssets: 'localAssetRef, workId, kind, stage, updatedAt'",
  "localAssetRef: string",
  "kind: LocalWritingAssetKind",
  "stage: LocalWritingAssetStage",
  "'character'",
  "'skill'",
  "'location'",
  "'map'",
  "'faction'",
  "'item'",
  "'rule'",
  "'timeline'",
]) {
  if (!schema.includes(marker)) failures.push(`local writing asset schema missing ${marker}`)
}
for (const deprecatedAssetMarker of ["| 'place'", "| 'plot_beat'", "| 'method_card'"]) {
  if (schema.includes(deprecatedAssetMarker)) failures.push(`local writing asset schema must not use deprecated asset kind ${deprecatedAssetMarker}`)
}

if (!contract.includes('Current `localStorage` draft and setting-asset data is legacy')) {
  failures.push('local storage contract must mark localStorage as legacy')
}
const dbDriver = readFileSync(resolve(root, 'app/src/local-db/creatorLocalDb.ts'), 'utf8')
for (const marker of [
  'window.indexedDB.open',
  "draftBodies: 'draftBodies'",
  "ensureStore(db, transaction, creatorLocalStoreNames.draftBodies, 'id', ['draftId', 'status', 'updatedAt'])",
  "workspacePackages: 'workspacePackages'",
  "workspaceImports: 'workspaceImports'",
  "agentConfirmations: 'agentConfirmations'",
  "readerSignalSources: 'readerSignalSources'",
  "verifiedLongRangeThreads: 'verifiedLongRangeThreads'",
  "ensureStore(db, transaction, creatorLocalStoreNames.readerSignalSources, 'source', ['status', 'fetchedAt', 'updatedAt'])",
  "ensureStore(db, transaction, creatorLocalStoreNames.verifiedLongRangeThreads, 'id', ['workId', 'branchId', 'threadId', 'status', 'sourceChapter', 'updatedAt'])",
  "ensureStore(db, transaction, creatorLocalStoreNames.agentConfirmations, 'id', ['operationId', 'actionName', 'targetId', 'status', 'expiresAt', 'createdAt'])",
  "ensureStore(db, transaction, creatorLocalStoreNames.creationSessions, 'id', ['workId', 'chapterId', 'phase', 'updatedAt'])",
  "ensureStore(db, transaction, creatorLocalStoreNames.localCanonStates, 'id', ['workId', 'chapterId', 'revision', 'committedAt'])",
  "ensureStore(db, transaction, creatorLocalStoreNames.creationDecisionEvents, 'id', ['sessionId', 'type', 'actor', 'occurredAt'])",
]) {
  if (!dbDriver.includes(marker)) failures.push(`local DB driver missing ${marker}`)
}
for (const marker of [
  'readAllFromCreatorStore<LocalMigrationReceipt>(db, MIGRATION_STORE)',
  'buildLegacyMigrationPlan({',
  'await applyCreatorLocalLegacyMigrationPlan(db, effectivePlan)',
  'readLocalDraftRecords',
  'upsertLocalSettingAssetRecord',
  'readLocalCreativeReminderRecords',
  'upsertLocalCreativeReminderRecord',
  'readLocalVerifiedLongRangeThreadRecords',
  'upsertLocalVerifiedLongRangeThreadRecord',
  'readLocalReaderSignalRecords',
  'upsertLocalReaderSignalRecord',
  'readLocalPublishBundleRecords',
  'upsertLocalPublishBundleRecord',
  'readLocalPublishReceiptRecords',
  'upsertLocalPublishReceiptRecord',
  'readLocalAgentOperationRecords',
  'upsertLocalAgentOperationRecord',
  'readLocalMigrationReceiptRecords',
  'readLocalWorkspaceConflictRecords',
  'commitRecordWithRevision',
  'runCoordinatedLocalWrite({',
]) {
  if (!repository.includes(marker)) failures.push(`local repository missing ${marker}`)
}
for (const marker of [
  'export async function applyCreatorLocalLegacyMigrationPlan',
  'LegacyMigrationPlan<TDraft, TSettingAsset, TMeta>',
  'creatorLocalStoreNames.migrations',
  'migrationStore.put(plan.receipt)',
  'await transactionDone(transaction)',
]) {
  if (!legacyMigrationApplier.includes(marker)) failures.push(`legacy migration applier missing ${marker}`)
}
if (!legacyMigration.includes('window.localStorage.getItem') || legacyMigration.includes('localStorage.setItem')) {
  failures.push('legacy localStorage migration must be read-only')
}

if (failures.length) {
  console.error('[local-db-schema] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[local-db-schema] PASS')
