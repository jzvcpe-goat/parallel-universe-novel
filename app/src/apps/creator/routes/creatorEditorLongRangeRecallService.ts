import {
  computeLongRangeThreadSourceRevision,
  type VerifiedLongRangeThreadRecallCandidate,
} from '@/features/creator-decision/longRangeThreadRecall'
import type { LongformContinuityChapter } from '@/features/creator-decision/longformContinuity'
import { localCanonStateRecordSchema } from '@/features/creator-decision/schemas'
import type { LocalCanonStateRecord } from '@/features/creator-decision/types'
import { readCreatorDecisionWorkspaceRecords } from '@/local-db/creatorLocalDecisionRepository'
import { loadVerifiedLongRangeThreadRecallCandidates } from '@/local-db/creatorLocalLongRangeThreadRepository'

export interface EditorLongRangeRecallPort {
  readCanonStates(): Promise<LocalCanonStateRecord[]>
  loadCandidates(input: {
    workId: string
    branchId: string
    currentChapterNo: number
    currentSourceRevision: number
    chapters: LongformContinuityChapter[]
  }): Promise<VerifiedLongRangeThreadRecallCandidate[]>
}

export type EditorLongRangeRecallLoadResult =
  | {
    ok: true
    candidates: VerifiedLongRangeThreadRecallCandidate[]
    chapterCount: number
    sourceRevision: number
  }
  | {
    ok: false
    candidates: []
    reason: 'missing_scope' | 'insufficient_canon' | 'invalid_canon'
  }

function chapterNumberFromId(chapterId: string) {
  const match = chapterId.match(/:chapter:(\d+)$/u)
  return match ? Number(match[1]) : null
}

export function buildEditorLongRangeRecallChapters(input: {
  canonStates: LocalCanonStateRecord[]
  workId: string
  branchId: string
  currentChapterNo: number
}): LongformContinuityChapter[] {
  const latestByChapter = new Map<number, LocalCanonStateRecord>()
  for (const rawCanon of input.canonStates) {
    const parsed = localCanonStateRecordSchema.safeParse(rawCanon)
    if (!parsed.success) continue
    const canon = parsed.data
    const chapterNumber = chapterNumberFromId(canon.chapterId)
    if (
      canon.workId !== input.workId
      || canon.branchId !== input.branchId
      || !chapterNumber
      || chapterNumber > input.currentChapterNo
      || canon.acceptedDraftRevision < 1
      || canon.acceptedContentBlocks.length === 0
    ) continue
    const existing = latestByChapter.get(chapterNumber)
    if (!existing || canon.revision > existing.revision) latestByChapter.set(chapterNumber, canon)
  }
  return [...latestByChapter.entries()]
    .sort(([left], [right]) => left - right)
    .map(([chapterNumber, canon]) => ({
      chapterNumber,
      chapterId: canon.chapterId,
      blocks: canon.acceptedContentBlocks.map(block => ({ id: block.id, text: block.text })),
    }))
}

const defaultPort: EditorLongRangeRecallPort = {
  async readCanonStates() {
    const records = await readCreatorDecisionWorkspaceRecords()
    return records.flatMap(record => {
      if (record.family !== 'localCanonStates') return []
      const parsed = localCanonStateRecordSchema.safeParse(record.value)
      return parsed.success ? [parsed.data] : []
    })
  },
  loadCandidates: loadVerifiedLongRangeThreadRecallCandidates,
}

export async function runEditorLongRangeRecallLoad(input: {
  workId: string
  branchId: string
  currentChapterNo: number | null
}, port: EditorLongRangeRecallPort = defaultPort): Promise<EditorLongRangeRecallLoadResult> {
  if (!input.workId || !input.branchId || !input.currentChapterNo || input.currentChapterNo < 1) {
    return { ok: false, candidates: [], reason: 'missing_scope' }
  }
  try {
    const chapters = buildEditorLongRangeRecallChapters({
      canonStates: await port.readCanonStates(),
      workId: input.workId,
      branchId: input.branchId,
      currentChapterNo: input.currentChapterNo,
    })
    if (chapters.length < 3) return { ok: false, candidates: [], reason: 'insufficient_canon' }
    const sourceRevision = await computeLongRangeThreadSourceRevision(chapters)
    return {
      ok: true,
      candidates: await port.loadCandidates({
        workId: input.workId,
        branchId: input.branchId,
        currentChapterNo: input.currentChapterNo,
        currentSourceRevision: sourceRevision,
        chapters,
      }),
      chapterCount: chapters.length,
      sourceRevision,
    }
  } catch {
    return { ok: false, candidates: [], reason: 'invalid_canon' }
  }
}
