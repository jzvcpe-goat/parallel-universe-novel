import type { LegacyMigrationPlan } from './creatorLocalMigrationPlan'
import {
  creatorLocalStoreNames,
  transactionDone,
} from './creatorLocalDb'

export async function applyCreatorLocalLegacyMigrationPlan<
  TDraft extends { localDraftRef: string },
  TSettingAsset extends { localAssetRef: string },
  TMeta extends { key: string },
>(
  db: IDBDatabase,
  plan: LegacyMigrationPlan<TDraft, TSettingAsset, TMeta>,
) {
  if (!plan.shouldApply) return

  const transaction = db.transaction([
    creatorLocalStoreNames.drafts,
    creatorLocalStoreNames.writingAssets,
    creatorLocalStoreNames.meta,
    creatorLocalStoreNames.migrations,
  ], 'readwrite')
  const draftStore = transaction.objectStore(creatorLocalStoreNames.drafts)
  const settingAssetStore = transaction.objectStore(creatorLocalStoreNames.writingAssets)
  const metaStore = transaction.objectStore(creatorLocalStoreNames.meta)
  const migrationStore = transaction.objectStore(creatorLocalStoreNames.migrations)
  const receiptRequest = migrationStore.get(plan.receipt.id)

  receiptRequest.onsuccess = () => {
    if (receiptRequest.result) return
    const putIfMissing = (store: IDBObjectStore, key: IDBValidKey, record: unknown) => {
      const request = store.get(key)
      request.onsuccess = () => {
        if (typeof request.result === 'undefined') store.put(record)
      }
    }
    for (const draft of plan.drafts) putIfMissing(draftStore, draft.localDraftRef, draft)
    for (const asset of plan.settingAssets) putIfMissing(settingAssetStore, asset.localAssetRef, asset)
    for (const meta of plan.meta) putIfMissing(metaStore, meta.key, meta)
    migrationStore.put(plan.receipt)
  }

  await transactionDone(transaction)
}
