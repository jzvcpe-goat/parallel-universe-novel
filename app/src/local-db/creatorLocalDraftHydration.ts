import type { PmfLocalDraft } from '@/features/pmf/types'
import type {
  LocalDraftBodyRecord,
  LocalDraftRecord,
} from './schema'
import { readLocalDraftBody } from './creatorLocalDraftBodyStore'

export function isLocalDraftRecord(value: unknown): value is LocalDraftRecord {
  if (!value || typeof value !== 'object') return false
  const draft = value as Partial<LocalDraftRecord>
  return typeof draft.localDraftRef === 'string'
    && typeof draft.bodyChecksum === 'string'
    && typeof draft.bodyByteLength === 'number'
    && typeof draft.bodyVersion === 'number'
    && Boolean(draft.bodyStorage)
}

export async function restoreCreatorLocalDrafts(
  records: Array<PmfLocalDraft | LocalDraftRecord>,
  bodies: LocalDraftBodyRecord[],
): Promise<PmfLocalDraft[]> {
  const bodyMap = new Map(bodies.map(body => [body.id, body]))
  const drafts: PmfLocalDraft[] = []

  for (const record of records) {
    if (!isLocalDraftRecord(record)) {
      drafts.push(record)
      continue
    }
    try {
      const body = await readLocalDraftBody(record, bodyMap.get(record.bodyStorage.tableId))
      drafts.push({
        localDraftRef: record.localDraftRef,
        requestId: record.requestId,
        workId: record.workId,
        branchId: record.branchId,
        chapterNumber: record.chapterNumber || null,
        title: record.title,
        content: body.content,
        updatedAt: record.updatedAt,
      })
    } catch {
      const stagedRecovery = bodies
        .filter(body => body.draftId === record.localDraftRef && body.status === 'staged')
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]
      if (stagedRecovery) {
        drafts.push({
          localDraftRef: record.localDraftRef,
          requestId: record.requestId,
          workId: record.workId,
          branchId: record.branchId,
          chapterNumber: record.chapterNumber || null,
          title: record.title,
          content: stagedRecovery.content,
          updatedAt: record.updatedAt,
        })
      }
    }
  }

  return drafts
}
