import { readLocalMigrationReceiptRecords } from './creatorLocalRepository'
import type { LocalMigrationReceipt } from './schema'

export function readLocalMigrationReceipts(): LocalMigrationReceipt[] {
  return readLocalMigrationReceiptRecords()
}
