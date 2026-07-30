import type { LocalWorkspaceChangeEvent } from './creatorLocalWorkspaceCoordination'
import type { LocalWorkspaceRecordFamily } from './schema'

export type LocalWriteCommitResult =
  | {
    status: 'committed'
    version: number
  }
  | {
    status: 'conflict'
    version: number
    conflictId: string
  }

export interface CoordinatedLocalWriteInput {
  recordFamily: LocalWorkspaceRecordFamily
  recordId: string
  commit(): Promise<LocalWriteCommitResult>
}

export interface LocalWriteCoordinationPort {
  publish(event: Omit<LocalWorkspaceChangeEvent, 'schemaVersion' | 'workspaceId' | 'sourceId' | 'occurredAt'>): LocalWorkspaceChangeEvent
  withLock<T>(
    recordFamily: LocalWorkspaceRecordFamily,
    recordId: string,
    work: () => Promise<T>,
  ): Promise<T>
}

export async function runCoordinatedLocalWrite(
  input: CoordinatedLocalWriteInput,
  coordination: LocalWriteCoordinationPort,
) {
  const result = await coordination.withLock(input.recordFamily, input.recordId, input.commit)
  const event = coordination.publish({
    kind: result.status === 'committed' ? 'record_committed' : 'conflict_created',
    recordFamily: input.recordFamily,
    recordId: input.recordId,
    version: result.version,
  })
  return { event, result }
}
