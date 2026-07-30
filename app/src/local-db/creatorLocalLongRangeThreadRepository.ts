import {
  projectVerifiedLongRangeThreadRecordsToRecallCandidates,
  verifiedLongRangeThreadRecordSchema,
  type VerifiedLongRangeThreadRecallCandidate,
  type VerifiedLongRangeThreadRecord,
} from '@/features/creator-decision/longRangeThreadRecall'
import type { LongformContinuityChapter } from '@/features/creator-decision/longformContinuity'
import { CreationDecisionError } from '@/features/creator-decision/types'
import {
  flushCreatorLocalWrites,
  hydrateCreatorLocalRepository,
  readLocalVerifiedLongRangeThreadRecords,
  upsertLocalVerifiedLongRangeThreadRecord,
} from './creatorLocalRepository'

export function readVerifiedLongRangeThreadRecords(input?: {
  workId?: string
  branchId?: string
  status?: VerifiedLongRangeThreadRecord['status']
}) {
  return readLocalVerifiedLongRangeThreadRecords(input?.workId)
    .flatMap((record): VerifiedLongRangeThreadRecord[] => {
      const parsed = verifiedLongRangeThreadRecordSchema.safeParse(record)
      return parsed.success ? [parsed.data] : []
    })
    .filter(record => !input?.branchId || record.branchId === input.branchId)
    .filter(record => !input?.status || record.status === input.status)
}

export async function importVerifiedLongRangeThreadRecords(input: {
  records: VerifiedLongRangeThreadRecord[]
  authorConfirmed: boolean
}) {
  if (!input.authorConfirmed) {
    throw new CreationDecisionError(
      'author_confirmation_required',
      'Importing verified long-range threads requires explicit author confirmation.',
    )
  }
  const records = input.records.map(record => verifiedLongRangeThreadRecordSchema.parse(record))
  if (new Set(records.map(record => record.id)).size !== records.length) {
    throw new CreationDecisionError('model_output_invalid', 'Verified long-range thread import contains duplicate record ids.')
  }
  for (const record of records) upsertLocalVerifiedLongRangeThreadRecord(record)
  await flushCreatorLocalWrites()
  return records
}

export async function loadVerifiedLongRangeThreadRecallCandidates(input: {
  workId: string
  branchId: string
  currentChapterNo: number
  currentSourceRevision: number
  chapters: LongformContinuityChapter[]
}): Promise<VerifiedLongRangeThreadRecallCandidate[]> {
  await hydrateCreatorLocalRepository()
  return projectVerifiedLongRangeThreadRecordsToRecallCandidates({
    ...input,
    records: readVerifiedLongRangeThreadRecords({
      workId: input.workId,
      branchId: input.branchId,
    }),
  })
}
