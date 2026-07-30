import {
  readLocalAgentOperationRecords,
  upsertLocalAgentOperationRecord,
} from './creatorLocalRepository'
import type { AgentOperationLog } from './schema'

export function readLocalAgentOperations(limit = 80): AgentOperationLog[] {
  return readLocalAgentOperationRecords(limit)
}

export function upsertLocalAgentOperation(record: AgentOperationLog): AgentOperationLog {
  return upsertLocalAgentOperationRecord(record)
}
