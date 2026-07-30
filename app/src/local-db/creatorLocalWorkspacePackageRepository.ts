import {
  creatorLocalStoreNames,
  openCreatorDb,
  requestToPromise,
  transactionDone,
} from './creatorLocalDb'
import type { LocalWorkspaceImportReceipt, LocalWorkspacePackageRecord } from './schema'

export async function saveLocalWorkspacePackageRecord(record: LocalWorkspacePackageRecord) {
  const db = await openCreatorDb()
  try {
    const transaction = db.transaction(creatorLocalStoreNames.workspacePackages, 'readwrite')
    transaction.objectStore(creatorLocalStoreNames.workspacePackages).put(record)
    await transactionDone(transaction)
  } finally {
    db.close()
  }
  return record
}

export async function readLocalWorkspacePackageRecord(id: string) {
  const db = await openCreatorDb()
  try {
    const transaction = db.transaction(creatorLocalStoreNames.workspacePackages, 'readonly')
    const record = await requestToPromise<LocalWorkspacePackageRecord | undefined>(
      transaction.objectStore(creatorLocalStoreNames.workspacePackages).get(id),
    )
    await transactionDone(transaction)
    return record || null
  } finally {
    db.close()
  }
}

export async function saveLocalWorkspaceImportReceipt(receipt: LocalWorkspaceImportReceipt) {
  const db = await openCreatorDb()
  try {
    const transaction = db.transaction(creatorLocalStoreNames.workspaceImports, 'readwrite')
    transaction.objectStore(creatorLocalStoreNames.workspaceImports).put(receipt)
    await transactionDone(transaction)
  } finally {
    db.close()
  }
  return receipt
}

export async function readLocalWorkspaceImportReceipt(id: string) {
  const db = await openCreatorDb()
  try {
    const transaction = db.transaction(creatorLocalStoreNames.workspaceImports, 'readonly')
    const receipt = await requestToPromise<LocalWorkspaceImportReceipt | undefined>(
      transaction.objectStore(creatorLocalStoreNames.workspaceImports).get(id),
    )
    await transactionDone(transaction)
    return receipt || null
  } finally {
    db.close()
  }
}
