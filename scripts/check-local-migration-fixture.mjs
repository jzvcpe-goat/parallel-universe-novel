#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const plannerUrl = pathToFileURL(resolve(root, 'app/src/local-db/creatorLocalMigrationPlan.ts')).href
const { buildLegacyMigrationPlan, LEGACY_LOCAL_STORAGE_MIGRATION_ID } = await import(plannerUrl)
const schemaUrl = pathToFileURL(resolve(root, 'app/src/local-db/schema.ts')).href
const { LOCAL_SCHEMA_VERSION } = await import(schemaUrl)

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const now = '2026-07-10T12:00:00.000Z'
const storedDraft = {
  localDraftRef: 'draft:shared',
  workId: 'work:1',
  branchId: 'branch:main',
  title: 'current',
  content: 'indexeddb-current',
  requestId: null,
  updatedAt: '2026-07-10T11:00:00.000Z',
}
const legacyConflictDraft = {
  ...storedDraft,
  title: 'stale',
  content: 'legacy-stale',
  updatedAt: '2026-07-01T11:00:00.000Z',
}
const legacyOnlyDraft = {
  ...storedDraft,
  localDraftRef: 'draft:legacy-only',
  title: 'legacy-only',
}
const storedAsset = { localAssetRef: 'asset:shared', title: 'current-asset' }
const legacyConflictAsset = { localAssetRef: 'asset:shared', title: 'legacy-asset' }
const legacyOnlyAsset = { localAssetRef: 'asset:legacy-only', title: 'legacy-only-asset' }
const storedMeta = { key: 'ai-settings', value: { mode: 'current' }, updatedAt: now }
const legacyConflictMeta = { key: 'ai-settings', value: { mode: 'legacy' }, updatedAt: '2026-07-01T00:00:00.000Z' }

const firstPlan = buildLegacyMigrationPlan({
  legacyDrafts: [legacyConflictDraft, legacyOnlyDraft],
  legacyMeta: [legacyConflictMeta],
  legacySettingAssets: [legacyConflictAsset, legacyOnlyAsset],
  now,
  schemaVersion: LOCAL_SCHEMA_VERSION,
  storedDrafts: [storedDraft],
  storedMeta: [storedMeta],
  storedSettingAssets: [storedAsset],
})

assert(firstPlan.shouldApply, 'first migration must apply')
assert(firstPlan.receipt.id === LEGACY_LOCAL_STORAGE_MIGRATION_ID, 'migration receipt id must stay stable')
assert(firstPlan.receipt.conflictPolicy === 'indexeddb-wins', 'receipt must declare IndexedDB conflict precedence')
assert(firstPlan.drafts.length === 2, 'first migration must preserve stored and import legacy-only drafts')
assert(
  firstPlan.drafts.find(draft => draft.localDraftRef === storedDraft.localDraftRef)?.content === 'indexeddb-current',
  'legacy draft must not overwrite the IndexedDB draft',
)
assert(
  firstPlan.settingAssets.find(asset => asset.localAssetRef === storedAsset.localAssetRef)?.title === 'current-asset',
  'legacy setting asset must not overwrite the IndexedDB setting asset',
)
assert(
  firstPlan.meta.find(record => record.key === storedMeta.key)?.value.mode === 'current',
  'legacy meta must not overwrite IndexedDB meta',
)
assert(firstPlan.receipt.importedRecordCounts.drafts === 1, 'receipt must count imported legacy-only drafts')
assert(firstPlan.receipt.preservedConflictCounts.drafts === 1, 'receipt must count preserved draft conflicts')
assert(firstPlan.receipt.importedRecordCounts.settingAssets === 1, 'receipt must count imported legacy-only assets')
assert(firstPlan.receipt.preservedConflictCounts.settingAssets === 1, 'receipt must count preserved asset conflicts')
assert(firstPlan.receipt.preservedConflictCounts.meta === 1, 'receipt must count preserved meta conflicts')

const repeatedPlan = buildLegacyMigrationPlan({
  existingReceipt: firstPlan.receipt,
  legacyDrafts: [{ ...legacyOnlyDraft, localDraftRef: 'draft:late-legacy' }],
  legacyMeta: [],
  legacySettingAssets: [],
  now: '2026-07-11T12:00:00.000Z',
  schemaVersion: LOCAL_SCHEMA_VERSION,
  storedDrafts: firstPlan.drafts,
  storedMeta: firstPlan.meta,
  storedSettingAssets: firstPlan.settingAssets,
})

assert(!repeatedPlan.shouldApply, 'existing receipt must prevent repeated legacy import')
assert(
  !repeatedPlan.drafts.some(draft => draft.localDraftRef === 'draft:late-legacy'),
  'late legacy data must not flow back after migration receipt exists',
)
assert(repeatedPlan.receipt === firstPlan.receipt, 'repeat planning must retain the original receipt')

const repository = readFileSync(resolve(root, 'app/src/local-db/creatorLocalRepository.ts'), 'utf8')
for (const marker of [
  'readAllFromCreatorStore<LocalMigrationReceipt>(db, MIGRATION_STORE)',
  'existingReceipt ? [] : readLegacyLocalDrafts()',
  'existingReceipt ? [] : readLegacyLocalSettingAssets()',
  'existingReceipt ? [] : readLegacyLocalMetaRecords()',
  'await applyCreatorLocalLegacyMigrationPlan(db, effectivePlan)',
]) {
  assert(repository.includes(marker), `local repository missing migration guarantee: ${marker}`)
}
assert(
  !repository.includes('async function applyLegacyMigrationPlan'),
  'local repository must delegate migration writes to the migration applier',
)
const migrationApplier = readFileSync(
  resolve(root, 'app/src/local-db/creatorLocalLegacyMigrationApplier.ts'),
  'utf8',
)
for (const marker of [
  'export async function applyCreatorLocalLegacyMigrationPlan',
  'creatorLocalStoreNames.drafts',
  'creatorLocalStoreNames.writingAssets',
  'creatorLocalStoreNames.meta',
  'creatorLocalStoreNames.migrations',
  "], 'readwrite')",
  'migrationStore.put(plan.receipt)',
  'await transactionDone(transaction)',
]) {
  assert(migrationApplier.includes(marker), `migration applier missing transactional guarantee: ${marker}`)
}
const dbDriver = readFileSync(resolve(root, 'app/src/local-db/creatorLocalDb.ts'), 'utf8')
for (const marker of [
  "draftBodies: 'draftBodies'",
  "ensureStore(db, transaction, creatorLocalStoreNames.draftBodies, 'id', ['draftId', 'status', 'updatedAt'])",
]) {
  assert(dbDriver.includes(marker), `local DB driver missing migration guarantee: ${marker}`)
}
assert(
  !repository.includes('mergeByKey(storedDrafts, legacyDrafts'),
  'repository must not restore the stale legacy-wins merge order',
)

const storageContract = readFileSync(resolve(root, 'docs/data-contracts/local-creator-storage-v2.md'), 'utf8')
const rollbackContract = readFileSync(resolve(root, 'docs/launch/050_CUTOVER_ROLLBACK_PLAN.md'), 'utf8')
for (const marker of [
  'IndexedDB records win every identity conflict',
  'migration receipt is written in the same IndexedDB transaction',
  'Legacy keys remain read-only recovery input',
]) {
  assert(storageContract.includes(marker), `local storage contract missing migration rule: ${marker}`)
}
for (const marker of [
  'Local Schema Rollback Rule',
  'Never downgrade or delete the local database',
  `Keep the v${LOCAL_SCHEMA_VERSION} reader in every rollback build`,
]) {
  assert(rollbackContract.includes(marker), `rollback contract missing local schema rule: ${marker}`)
}

console.log(JSON.stringify({
  status: 'passed',
  gate: 'EPIC2_LOCAL_MIGRATION_FIXTURE',
  conflictPolicy: firstPlan.receipt.conflictPolicy,
  importedRecordCounts: firstPlan.receipt.importedRecordCounts,
  preservedConflictCounts: firstPlan.receipt.preservedConflictCounts,
  repeatedMigrationApplied: repeatedPlan.shouldApply,
}, null, 2))
