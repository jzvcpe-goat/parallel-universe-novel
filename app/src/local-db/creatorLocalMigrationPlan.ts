import type { LocalMigrationReceipt } from './schema.ts'

export const LEGACY_LOCAL_STORAGE_MIGRATION_ID = 'legacy-local-storage-v1'

type DraftIdentity = { localDraftRef: string }
type SettingAssetIdentity = { localAssetRef: string }
type MetaIdentity = { key: string }

export interface LegacyMigrationPlanInput<
  Draft extends DraftIdentity,
  SettingAsset extends SettingAssetIdentity,
  Meta extends MetaIdentity,
> {
  existingReceipt?: LocalMigrationReceipt
  legacyDrafts: Draft[]
  legacyMeta: Meta[]
  legacySettingAssets: SettingAsset[]
  now: string
  schemaVersion: number
  storedDrafts: Draft[]
  storedMeta: Meta[]
  storedSettingAssets: SettingAsset[]
}

export interface LegacyMigrationPlan<
  Draft extends DraftIdentity,
  SettingAsset extends SettingAssetIdentity,
  Meta extends MetaIdentity,
> {
  drafts: Draft[]
  meta: Meta[]
  receipt: LocalMigrationReceipt
  settingAssets: SettingAsset[]
  shouldApply: boolean
}

function mergeLegacyWithStored<RecordType>(
  legacy: RecordType[],
  stored: RecordType[],
  keyFor: (record: RecordType) => string,
) {
  const storedKeys = new Set(stored.map(keyFor))
  const byKey = new Map<string, RecordType>()
  for (const record of legacy) byKey.set(keyFor(record), record)
  for (const record of stored) byKey.set(keyFor(record), record)

  return {
    importedCount: legacy.filter(record => !storedKeys.has(keyFor(record))).length,
    preservedConflictCount: legacy.filter(record => storedKeys.has(keyFor(record))).length,
    records: Array.from(byKey.values()),
  }
}

export function buildLegacyMigrationPlan<
  Draft extends DraftIdentity,
  SettingAsset extends SettingAssetIdentity,
  Meta extends MetaIdentity,
>({
  existingReceipt,
  legacyDrafts,
  legacyMeta,
  legacySettingAssets,
  now,
  schemaVersion,
  storedDrafts,
  storedMeta,
  storedSettingAssets,
}: LegacyMigrationPlanInput<Draft, SettingAsset, Meta>): LegacyMigrationPlan<Draft, SettingAsset, Meta> {
  if (existingReceipt) {
    return {
      drafts: [...storedDrafts],
      meta: [...storedMeta],
      receipt: existingReceipt,
      settingAssets: [...storedSettingAssets],
      shouldApply: false,
    }
  }

  const drafts = mergeLegacyWithStored(legacyDrafts, storedDrafts, draft => draft.localDraftRef)
  const settingAssets = mergeLegacyWithStored(
    legacySettingAssets,
    storedSettingAssets,
    asset => asset.localAssetRef,
  )
  const meta = mergeLegacyWithStored(legacyMeta, storedMeta, record => record.key)

  return {
    drafts: drafts.records,
    meta: meta.records,
    receipt: {
      id: LEGACY_LOCAL_STORAGE_MIGRATION_ID,
      version: schemaVersion,
      source: 'legacy-local-storage',
      status: 'applied',
      conflictPolicy: 'indexeddb-wins',
      sourceRecordCounts: {
        drafts: legacyDrafts.length,
        meta: legacyMeta.length,
        settingAssets: legacySettingAssets.length,
      },
      importedRecordCounts: {
        drafts: drafts.importedCount,
        meta: meta.importedCount,
        settingAssets: settingAssets.importedCount,
      },
      preservedConflictCounts: {
        drafts: drafts.preservedConflictCount,
        meta: meta.preservedConflictCount,
        settingAssets: settingAssets.preservedConflictCount,
      },
      appliedAt: now,
    },
    settingAssets: settingAssets.records,
    shouldApply: true,
  }
}
