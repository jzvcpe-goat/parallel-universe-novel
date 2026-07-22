#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const failures = []

function read(path) {
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) {
    failures.push(`Missing ${path}`)
    return ''
  }
  return readFileSync(absolute, 'utf8')
}

function requireIncludes(path, markers) {
  const body = read(path)
  for (const marker of markers) {
    if (!body.includes(marker)) failures.push(`${path} missing ${marker}`)
  }
  return body
}

const repository = requireIncludes('app/src/local-db/creatorLocalRepository.ts', [
  'creatorLocalStoreNames',
  'openCreatorDb',
  'meta: META_STORE',
  'drafts: DRAFT_STORE',
  'writingAssets: SETTING_ASSET_STORE',
  'readerSignals: READER_SIGNAL_STORE',
  'readerSignalSources: READER_SIGNAL_SOURCE_STORE',
  'creativeReminders: CREATIVE_REMINDER_STORE',
  'verifiedLongRangeThreads: VERIFIED_LONG_RANGE_THREAD_STORE',
  'publishBundles: PUBLISH_BUNDLE_STORE',
  'publishReceipts: PUBLISH_RECEIPT_STORE',
  'agentOperationLog: AGENT_OPERATION_STORE',
  'workspaceRevisions: WORKSPACE_REVISION_STORE',
  'workspaceConflicts: WORKSPACE_CONFLICT_STORE',
  'hydrateCreatorLocalRepository',
  'buildLegacyMigrationPlan',
  'applyCreatorLocalLegacyMigrationPlan',
  'restoreCreatorLocalDrafts',
  'readAllFromCreatorStore<LocalMigrationReceipt>(db, MIGRATION_STORE)',
  'readLegacyLocalDrafts',
  'readLegacyLocalSettingAssets',
  'readLegacyLocalMetaRecords',
  'readLocalDraftRecords',
  'upsertLocalDraftRecord',
  'readLocalSettingAssetRecords',
  'upsertLocalSettingAssetRecord',
  'readLocalMetaValue',
  'upsertLocalMetaValue',
  'readLocalReaderSignalRecords',
  'upsertLocalReaderSignalRecord',
  'readLocalReaderSignalSourceRecords',
  'upsertLocalReaderSignalSourceRecord',
  'readLocalCreativeReminderRecords',
  'upsertLocalCreativeReminderRecord',
  'readLocalVerifiedLongRangeThreadRecords',
  'upsertLocalVerifiedLongRangeThreadRecord',
  'readLocalPublishBundleRecords',
  'upsertLocalPublishBundleRecord',
  'readLocalPublishReceiptRecords',
  'upsertLocalPublishReceiptRecord',
  'readLocalAgentOperationRecords',
  'upsertLocalAgentOperationRecord',
  'readLocalMigrationReceiptRecords',
  'readLocalWorkspaceConflictRecords',
  'queueCoordinatedPut',
  'commitRecordWithRevision',
  'runCoordinatedLocalWrite({',
  'subscribeToLocalWorkspaceChanges',
  'subscribeToLocalWorkspaceResume',
])

const migrationApplier = requireIncludes('app/src/local-db/creatorLocalLegacyMigrationApplier.ts', [
  'export async function applyCreatorLocalLegacyMigrationPlan',
  'LegacyMigrationPlan<TDraft, TSettingAsset, TMeta>',
  'creatorLocalStoreNames.drafts',
  'creatorLocalStoreNames.writingAssets',
  'creatorLocalStoreNames.meta',
  'creatorLocalStoreNames.migrations',
  "], 'readwrite')",
  'migrationStore.put(plan.receipt)',
  'await transactionDone(transaction)',
])

const draftHydration = requireIncludes('app/src/local-db/creatorLocalDraftHydration.ts', [
  'export async function restoreCreatorLocalDrafts',
  'readLocalDraftBody(record, bodyMap.get(record.bodyStorage.tableId))',
  "body.status === 'staged'",
  'content: stagedRecovery.content',
])

for (const forbidden of [
  'async function applyLegacyMigrationPlan',
  'async function restoreStoredDrafts',
  'function isLocalDraftRecord',
]) {
  if (repository.includes(forbidden)) failures.push(`creatorLocalRepository.ts must delegate ${forbidden}`)
}

const dbDriver = requireIncludes('app/src/local-db/creatorLocalDb.ts', [
  'window.indexedDB.open',
  "meta: 'meta'",
  "drafts: 'drafts'",
  "draftBodies: 'draftBodies'",
  "writingAssets: 'writingAssets'",
  "readerSignals: 'readerSignals'",
  "readerSignalSources: 'readerSignalSources'",
  "creativeReminders: 'creativeReminders'",
  "verifiedLongRangeThreads: 'verifiedLongRangeThreads'",
  "publishBundles: 'publishBundles'",
  "publishReceipts: 'publishReceipts'",
  "agentOperationLog: 'agentOperationLog'",
  "workspaceRevisions: 'workspaceRevisions'",
  "workspaceConflicts: 'workspaceConflicts'",
  "workspacePackages: 'workspacePackages'",
  "workspaceImports: 'workspaceImports'",
])

const coordination = requireIncludes('app/src/local-db/creatorLocalWorkspaceCoordination.ts', [
  'export function localWorkspaceLockName',
  'export async function withLocalWorkspaceWriteLock',
  'export function publishLocalWorkspaceChange',
  'export function subscribeToLocalWorkspaceChanges',
  'export function subscribeToLocalWorkspaceResume',
  'new BroadcastChannel(LOCAL_WORKSPACE_CHANNEL_NAME)',
])

const writeTransaction = requireIncludes('app/src/local-db/creatorLocalWriteTransaction.ts', [
  'export type LocalWriteCommitResult',
  'export interface LocalWriteCoordinationPort',
  'export async function runCoordinatedLocalWrite',
  "result.status === 'committed' ? 'record_committed' : 'conflict_created'",
])

const conflictRepository = requireIncludes('app/src/local-db/creatorLocalConflictRepository.ts', [
  "from './creatorLocalRepository'",
  'export function readLocalWorkspaceConflicts',
  'readLocalWorkspaceConflictRecords(status)',
])

const migrationPlan = requireIncludes('app/src/local-db/creatorLocalMigrationPlan.ts', [
  'LEGACY_LOCAL_STORAGE_MIGRATION_ID',
  'export interface LegacyMigrationPlanInput',
  'export interface LegacyMigrationPlan',
  'export function buildLegacyMigrationPlan',
  "conflictPolicy: 'indexeddb-wins'",
  'existingReceipt',
  'shouldApply: false',
])

const legacyMigration = requireIncludes('app/src/local-db/legacyLocalStorageMigration.ts', [
  'LEGACY_LOCAL_DRAFT_KEY',
  'LEGACY_LOCAL_SETTING_ASSET_KEY',
  'LEGACY_LOCAL_CREATOR_CLIENT_KEY',
  'LEGACY_LOCAL_AI_SETTINGS_KEY',
  'LEGACY_LOCAL_DISPLAY_PREFERENCES_KEY',
  'window.localStorage.getItem',
  'readLegacyLocalDrafts',
  'readLegacyLocalSettingAssets',
  'readLegacyLocalMetaRecords',
])

const adapter = requireIncludes('app/src/lib/pmfSupabase.ts', [
  "from '@/local-db/creatorLocalSettingsRepository'",
  'getLocalSettingsCreatorClientId()',
])

for (const forbiddenFacadeMarker of [
  "from '@/local-db/creatorLocalDraftRepository'",
  "from '@/local-db/creatorLocalSettingAssetRepository'",
  "from '@/local-db/creatorLocalWritingRepository'",
  "from '@/local-db/creatorLocalWorkspaceRepository'",
  'export function isLocalCreatorHost',
  'export function getLocalCreatorClientId',
  'export function createLocalDraftRef',
  'export function readLocalDrafts',
  'export function upsertLocalDraft',
  'export function createLocalSettingAssetRef',
  'export function readLocalSettingAssets',
  'export function upsertLocalSettingAsset',
  'export function readLocalCreativeReminders',
  'export function upsertLocalCreativeReminder',
  'export function readLocalWorkspaceSnapshot',
  'export function readCreatorDisplayPreferences',
  'export function writeCreatorDisplayPreferences',
]) {
  if (adapter.includes(forbiddenFacadeMarker)) {
    failures.push(`pmfSupabase.ts must not expose local repository compatibility ownership: ${forbiddenFacadeMarker}`)
  }
}

const localDraftRepository = requireIncludes('app/src/local-db/creatorLocalDraftRepository.ts', [
  "from './creatorLocalRepository'",
  'export function createLocalDraftRef',
  'export function readLocalDrafts',
  'export function upsertLocalDraft',
  'readLocalDraftRecords()',
  'upsertLocalDraftRecord(draft)',
])

const localWritingRepository = requireIncludes('app/src/local-db/creatorLocalWritingRepository.ts', [
  "from './creatorLocalRepository'",
  'export function readLocalCreativeReminders',
  'export function upsertLocalCreativeReminder',
  'export function suggestLocalCreativeReminders',
  'export function updateLocalCreativeReminder',
  'readLocalCreativeReminderRecords(workId)',
  'upsertLocalCreativeReminderRecord(applyCreativeReminderAuthorUpdate(',
])

const localSettingAssetRepository = requireIncludes('app/src/local-db/creatorLocalSettingAssetRepository.ts', [
  "from './creatorLocalRepository'",
  'export interface PmfLocalSettingAssetInput',
  'export function createLocalSettingAssetRef',
  'export function readLocalSettingAssets',
  'export function upsertLocalSettingAsset',
  'readLocalSettingAssetRecords(workId)',
  'upsertLocalSettingAssetRecord(next)',
  'normalizedTitle',
  'normalizedSummary',
])

const localReaderSignalRepository = requireIncludes('app/src/local-db/creatorLocalReaderSignalRepository.ts', [
  "from './creatorLocalRepository'",
  'export type PmfLocalReaderSignal',
  'export function readerSignalFromRequest',
  'export function readLocalReaderSignals',
  'export function upsertLocalReaderSignal',
  'export function cacheReaderRequestSignals',
  'export function cacheReaderSignalBatches',
  'export function readLocalReaderSignalSources',
  'readLocalReaderSignalRecords(workId)',
  'upsertLocalReaderSignalRecord(signal)',
  'upsertLocalReaderSignalSourceRecord(state)',
])

const localPublishRepository = requireIncludes('app/src/local-db/creatorLocalPublishRepository.ts', [
  "from './creatorLocalRepository'",
  'export function readLocalPublishBundles',
  'export function upsertLocalPublishBundle',
  'export function readLocalPublishReceipts',
  'export function upsertLocalPublishReceipt',
  'readLocalPublishBundleRecords(workId)',
  'upsertLocalPublishBundleRecord(bundle)',
  'readLocalPublishReceiptRecords(bundleId)',
  'upsertLocalPublishReceiptRecord(receipt)',
])

const localAgentRepository = requireIncludes('app/src/local-db/creatorLocalAgentRepository.ts', [
  "from './creatorLocalRepository'",
  'export function readLocalAgentOperations',
  'export function upsertLocalAgentOperation',
  'readLocalAgentOperationRecords(limit)',
  'upsertLocalAgentOperationRecord(record)',
])

const localMigrationRepository = requireIncludes('app/src/local-db/creatorLocalMigrationRepository.ts', [
  "from './creatorLocalRepository'",
  'export function readLocalMigrationReceipts',
  'readLocalMigrationReceiptRecords()',
])

const localSettingsRepository = requireIncludes('app/src/local-db/creatorLocalSettingsRepository.ts', [
  "from './creatorLocalRepository'",
  'export interface CreatorDisplayPreferences',
  'export function isLocalCreatorHost',
  'export function getLocalCreatorClientId',
  'export function readCreatorDisplayPreferences',
  'export function writeCreatorDisplayPreferences',
  'creatorLocalMetaKeys.clientId',
  'creatorLocalMetaKeys.displayPreferences',
  'readLocalMetaValue',
  'upsertLocalMetaValue',
])
if (localSettingsRepository.includes('readLocalAiSettings') || localSettingsRepository.includes('writeLocalAiSettings')) {
  failures.push('creatorLocalSettingsRepository.ts must not expose retired author-facing tool settings')
}

const legacyToolSettings = requireIncludes('app/src/local-db/legacyCreatorToolSettings.ts', [
  "from './creatorLocalRepository'",
  'export interface LegacyCreatorToolSettings',
  'export function readLegacyCreatorToolSettings',
  'creatorLocalMetaKeys.aiSettings',
])
if (legacyToolSettings.includes('upsertLocalMetaValue')) {
  failures.push('legacyCreatorToolSettings.ts must remain read-only')
}

const localWorkspaceRepository = requireIncludes('app/src/local-db/creatorLocalWorkspaceRepository.ts', [
  "from './creatorLocalAgentRepository'",
  "from './creatorLocalDraftRepository'",
  "from './creatorLocalRepository'",
  "from './creatorLocalMigrationRepository'",
  "from './creatorLocalReaderSignalRepository'",
  "from './creatorLocalPublishRepository'",
  "from './creatorLocalSettingAssetRepository'",
  "from './creatorLocalWritingRepository'",
  'export interface LocalCreatorWorkspaceSnapshot',
  'export function readLocalWorkspaceSnapshot',
  'export function hydrateLocalWorkspace',
  'drafts: readLocalDrafts()',
  'settingAssets: readLocalSettingAssets()',
  'readerSignals: readLocalReaderSignals()',
  'creativeReminders: readLocalCreativeReminders()',
  'publishBundles: readLocalPublishBundles()',
  'publishReceipts: readLocalPublishReceipts()',
  'operationRecords: readLocalAgentOperations(20)',
  'migrationReceipts: readLocalMigrationReceipts()',
  'workspaceConflicts: readLocalWorkspaceConflicts()',
  'return hydrateCreatorLocalRepository()',
])

const localWorkspacePackage = requireIncludes('app/src/local-db/creatorLocalWorkspacePackage.ts', [
  'buildLocalWorkspacePackage',
  'previewLocalWorkspacePackage',
  'applyLocalWorkspacePackage',
  'rollbackLocalWorkspaceImport',
  'importRecordFingerprints',
  'assertRecordFingerprints',
])

const localWorkspacePackageRepository = requireIncludes('app/src/local-db/creatorLocalWorkspacePackageRepository.ts', [
  'saveLocalWorkspacePackageRecord',
  'readLocalWorkspacePackageRecord',
  'saveLocalWorkspaceImportReceipt',
  'readLocalWorkspaceImportReceipt',
])

for (const forbidden of [
  'LOCAL_DRAFT_KEY',
  'LOCAL_SETTING_ASSET_KEY',
  'LOCAL_CREATOR_CLIENT_KEY',
  'LOCAL_AI_SETTINGS_KEY',
  'LOCAL_DISPLAY_PREFERENCES_KEY',
  'window.localStorage',
  'localStorage.getItem',
  'localStorage.setItem',
  'function readJson',
  'function writeJson',
  "writeJson(LOCAL_DRAFT_KEY",
  "writeJson(LOCAL_SETTING_ASSET_KEY",
]) {
  if (adapter.includes(forbidden)) failures.push(`pmfSupabase.ts must not retain active draft/setting localStorage marker ${forbidden}`)
}

if (legacyMigration.includes('localStorage.setItem')) {
  failures.push('legacyLocalStorageMigration.ts must be read-only; migration must not delete or overwrite legacy localStorage')
}

for (const forbidden of ['getSupabaseBrowserClient', "from('", 'service_role', 'provider_response', 'prompt']) {
  if (repository.includes(forbidden)) failures.push(`creatorLocalRepository.ts must stay local-only and not include ${forbidden}`)
  if (localDraftRepository.includes(forbidden)) failures.push(`creatorLocalDraftRepository.ts must stay local-only and not include ${forbidden}`)
  if (localWritingRepository.includes(forbidden)) failures.push(`creatorLocalWritingRepository.ts must stay local-only and not include ${forbidden}`)
  if (localSettingAssetRepository.includes(forbidden)) failures.push(`creatorLocalSettingAssetRepository.ts must stay local-only and not include ${forbidden}`)
  if (localReaderSignalRepository.includes(forbidden)) failures.push(`creatorLocalReaderSignalRepository.ts must stay local-only and not include ${forbidden}`)
  if (localPublishRepository.includes(forbidden)) failures.push(`creatorLocalPublishRepository.ts must stay local-only and not include ${forbidden}`)
  if (localAgentRepository.includes(forbidden)) failures.push(`creatorLocalAgentRepository.ts must stay local-only and not include ${forbidden}`)
  if (localMigrationRepository.includes(forbidden)) failures.push(`creatorLocalMigrationRepository.ts must stay local-only and not include ${forbidden}`)
  if (migrationPlan.includes(forbidden)) failures.push(`creatorLocalMigrationPlan.ts must stay local-only and not include ${forbidden}`)
  if (localSettingsRepository.includes(forbidden)) failures.push(`creatorLocalSettingsRepository.ts must stay local-only and not include ${forbidden}`)
  if (localWorkspaceRepository.includes(forbidden)) failures.push(`creatorLocalWorkspaceRepository.ts must stay local-only and not include ${forbidden}`)
  if (localWorkspacePackage.includes(forbidden)) failures.push(`creatorLocalWorkspacePackage.ts must stay local-only and not include ${forbidden}`)
  if (localWorkspacePackageRepository.includes(forbidden)) failures.push(`creatorLocalWorkspacePackageRepository.ts must stay local-only and not include ${forbidden}`)
  if (coordination.includes(forbidden)) failures.push(`creatorLocalWorkspaceCoordination.ts must stay local-only and not include ${forbidden}`)
  if (writeTransaction.includes(forbidden)) failures.push(`creatorLocalWriteTransaction.ts must stay local-only and not include ${forbidden}`)
  if (conflictRepository.includes(forbidden)) failures.push(`creatorLocalConflictRepository.ts must stay local-only and not include ${forbidden}`)
  if (dbDriver.includes(forbidden)) failures.push(`creatorLocalDb.ts must stay local-only and not include ${forbidden}`)
  if (migrationApplier.includes(forbidden)) failures.push(`creatorLocalLegacyMigrationApplier.ts must stay local-only and not include ${forbidden}`)
  if (draftHydration.includes(forbidden)) failures.push(`creatorLocalDraftHydration.ts must stay local-only and not include ${forbidden}`)
}

requireIncludes('docs/data-contracts/local-creator-storage-v2.md', [
  'S4 implemented repository boundary',
  'Active draft, writing-asset, reader-signal cache, local publish, local agent operation-log, workspace snapshot, local client identity, local AI setting, and display-preference writes/reads go through the local repository layer',
  'app/src/local-db/creatorLocalDraftRepository.ts',
  'app/src/local-db/creatorLocalReaderSignalRepository.ts',
  'app/src/local-db/creatorLocalPublishRepository.ts',
  'app/src/local-db/creatorLocalAgentRepository.ts',
  'app/src/local-db/creatorLocalMigrationRepository.ts',
  'app/src/local-db/creatorLocalWorkspaceRepository.ts',
  'app/src/local-db/creatorLocalWorkspaceCoordination.ts',
  'app/src/local-db/creatorLocalWriteTransaction.ts',
  'app/src/local-db/creatorLocalConflictRepository.ts',
  'app/src/local-db/creatorLocalLegacyMigrationApplier.ts',
  'app/src/local-db/creatorLocalDraftHydration.ts',
  'Repository meta values are stored in the local DB `meta` store',
  'Legacy `localStorage` is read-only migration input',
  'IndexedDB records win every identity conflict',
  'migration receipt is written in the same IndexedDB transaction',
])

requireIncludes('docs/launch/060_ACCEPTANCE_GATES_MATRIX.md', [
  'Local data layer',
  'npm run check:local-data-layer',
])

if (failures.length) {
  console.error('[local-data-layer] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[local-data-layer] PASS')
