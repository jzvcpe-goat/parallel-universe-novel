import { readLocalWorkspaceConflictRecords } from './creatorLocalRepository'
import type { LocalWorkspaceConflictRecord } from './schema'

export function readLocalWorkspaceConflicts(status?: LocalWorkspaceConflictRecord['status']) {
  return readLocalWorkspaceConflictRecords(status)
}
