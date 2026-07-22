import { z } from 'zod'
import type { LongformContinuityChapter } from './longformContinuity'
import {
  longRangeStoryThreadDimensionSchema,
  longRangeStoryThreadFocusSchema,
  longRangeStoryThreadStatusSchema,
  validateLongRangeStoryThreadReview,
  validateLongRangeStoryThreadVerification,
  type LongRangeStoryThread,
  type LongRangeStoryThreadReview,
  type LongRangeStoryThreadVerification,
} from './longRangeStoryThreads'
import {
  CreationDecisionError,
  type ManualRecallGroup,
  type ManualRecallItem,
} from './types'

export interface VerifiedLongRangeThreadRecallCandidate extends ManualRecallItem {
  workId: string
  branchId: string
  sourceChapter: number
  threadId: string
  dimension: LongRangeStoryThread['dimension']
  confidence: 'medium' | 'low'
  selectionState: 'unselected'
  authorSelectionRequired: true
}

export const verifiedLongRangeThreadRecordSchema = z.object({
  schemaVersion: z.literal('verified-long-range-thread.v1'),
  id: z.string().min(1),
  workId: z.string().min(1),
  branchId: z.string().min(1),
  threadId: z.string().min(4).max(80),
  focus: longRangeStoryThreadFocusSchema,
  dimension: longRangeStoryThreadDimensionSchema,
  label: z.string().min(2).max(40),
  statement: z.string().min(8).max(240),
  status: longRangeStoryThreadStatusSchema,
  confidence: z.enum(['high', 'medium', 'low']),
  involvedCharacters: z.array(z.string().min(1).max(80)).max(8),
  whyItMatters: z.string().min(8).max(240),
  sourceChapter: z.number().int().positive(),
  sourceBlockId: z.string().min(1),
  sourceEvidenceQuote: z.string().min(2).max(180),
  sourceRevision: z.number().int().positive(),
  latestEvidence: z.object({
    chapter: z.number().int().positive(),
    blockId: z.string().min(1),
    quote: z.string().min(2).max(180),
    meaning: z.string().min(8).max(240),
  }).strict().nullable(),
  verification: z.object({
    decision: z.literal('verify'),
    rationale: z.string().min(8).max(320),
    verifiedAt: z.string().min(1),
  }).strict(),
  importedBy: z.literal('author-confirmed'),
  localOnly: z.literal(true),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
}).strict()

export type VerifiedLongRangeThreadRecord = z.infer<typeof verifiedLongRangeThreadRecordSchema>

const recallGroupByDimension: Record<LongRangeStoryThread['dimension'], ManualRecallGroup> = {
  causal_debt: 'causal',
  character_knowledge: 'character_knowledge',
  timeline_anchor: 'timeline',
  promise: 'promise',
  foreshadowing: 'promise',
  character_arc: 'character_knowledge',
}

function assertPositiveRevision(value: number) {
  if (!Number.isInteger(value) || value < 1) {
    throw new CreationDecisionError('model_output_invalid', 'Long-range recall source revision must be positive.')
  }
}

export async function computeLongRangeThreadSourceRevision(
  chapters: LongformContinuityChapter[],
): Promise<number> {
  if (chapters.length < 3) {
    throw new CreationDecisionError('model_output_invalid', 'Long-range recall source revision needs at least three chapters.')
  }
  const ordered = [...chapters].sort((left, right) => left.chapterNumber - right.chapterNumber)
  for (const [index, chapter] of ordered.entries()) {
    if (
      chapter.chapterNumber < 1
      || chapter.blocks.length === 0
      || (index > 0 && chapter.chapterNumber !== ordered[index - 1]!.chapterNumber + 1)
    ) {
      throw new CreationDecisionError(
        'model_output_invalid',
        'Long-range recall source revision requires consecutive non-empty accepted chapters.',
      )
    }
  }
  const source = ordered.map(chapter => [
    chapter.chapterNumber,
    chapter.chapterId,
    chapter.blocks.map(block => [block.id, block.text]),
  ])
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(source)),
  )
  const revision = new DataView(digest).getUint32(0, false)
  return Math.max(1, revision)
}

function verifiedThreadLocations(input: {
  chapters: LongformContinuityChapter[]
  review: LongRangeStoryThreadReview
  verification: LongRangeStoryThreadVerification
}) {
  const locatedReview = validateLongRangeStoryThreadReview({
    chapters: input.chapters,
    focus: input.review.focus,
    review: input.review,
  })
  const locatedVerification = validateLongRangeStoryThreadVerification({
    chapters: input.chapters,
    review: input.review,
    verification: input.verification,
  })
  return {
    reviewLocationById: new Map(locatedReview.locatedThreads.map(item => [item.threadId, item])),
    verificationLocationById: new Map(locatedVerification.locatedThreads.map(item => [item.threadId, item])),
    verificationById: new Map(input.verification.threadItems.map(item => [item.threadId, item])),
  }
}

export function buildVerifiedLongRangeThreadRecords(input: {
  workId: string
  branchId: string
  sourceRevision: number
  chapters: LongformContinuityChapter[]
  review: LongRangeStoryThreadReview
  verification: LongRangeStoryThreadVerification
  authorConfirmedImport: boolean
  verifiedAt: string
}): VerifiedLongRangeThreadRecord[] {
  if (!input.authorConfirmedImport) {
    throw new CreationDecisionError(
      'author_confirmation_required',
      'Persisting verified long-range threads requires explicit author confirmation.',
    )
  }
  if (!input.workId || !input.branchId || !input.verifiedAt) {
    throw new CreationDecisionError('model_output_invalid', 'Verified long-range thread records require exact local ownership and time.')
  }
  assertPositiveRevision(input.sourceRevision)
  const {
    reviewLocationById,
    verificationLocationById,
    verificationById,
  } = verifiedThreadLocations(input)

  return input.review.threads.flatMap((thread): VerifiedLongRangeThreadRecord[] => {
    const verification = verificationById.get(thread.threadId)
    if (!verification || verification.decision !== 'verify') return []
    if (
      verification.confirmedStatus !== thread.status
      || verification.sourceEvidenceQuote !== thread.sourceEvidenceQuote
      || verification.latestEvidenceQuote !== (thread.latestEvidence?.quote ?? null)
    ) {
      throw new CreationDecisionError('model_output_invalid', 'Verified long-range thread evidence or lifecycle status changed after review.')
    }
    const reviewLocation = reviewLocationById.get(thread.threadId)
    const verifiedLocation = verificationLocationById.get(thread.threadId)
    if (
      !reviewLocation
      || !verifiedLocation
      || reviewLocation.sourceBlockId !== verifiedLocation.sourceBlockId
      || reviewLocation.latestEvidenceBlockId !== verifiedLocation.latestEvidenceBlockId
    ) {
      throw new CreationDecisionError('evidence_missing', 'Verified long-range thread locations do not match across review and verification.')
    }
    const id = `long-range-thread:${input.workId}:${input.branchId}:${thread.threadId}`
    return [verifiedLongRangeThreadRecordSchema.parse({
      schemaVersion: 'verified-long-range-thread.v1',
      id,
      workId: input.workId,
      branchId: input.branchId,
      threadId: thread.threadId,
      focus: input.review.focus,
      dimension: thread.dimension,
      label: thread.label,
      statement: thread.statement,
      status: thread.status,
      confidence: thread.confidence,
      involvedCharacters: thread.involvedCharacters,
      whyItMatters: thread.whyItMatters,
      sourceChapter: thread.sourceChapter,
      sourceBlockId: reviewLocation.sourceBlockId,
      sourceEvidenceQuote: thread.sourceEvidenceQuote,
      sourceRevision: input.sourceRevision,
      latestEvidence: thread.latestEvidence && reviewLocation.latestEvidenceBlockId
        ? {
            chapter: thread.latestEvidence.chapter,
            blockId: reviewLocation.latestEvidenceBlockId,
            quote: thread.latestEvidence.quote,
            meaning: thread.latestEvidence.meaning,
          }
        : null,
      verification: {
        decision: 'verify',
        rationale: verification.rationale,
        verifiedAt: input.verifiedAt,
      },
      importedBy: 'author-confirmed',
      localOnly: true,
      createdAt: input.verifiedAt,
      updatedAt: input.verifiedAt,
    })]
  })
}

export function projectVerifiedLongRangeThreadRecordsToRecallCandidates(input: {
  records: VerifiedLongRangeThreadRecord[]
  workId: string
  branchId: string
  currentChapterNo: number
  currentSourceRevision: number
  chapters: LongformContinuityChapter[]
}): VerifiedLongRangeThreadRecallCandidate[] {
  if (!Number.isInteger(input.currentChapterNo) || input.currentChapterNo < 1) return []
  if (!Number.isInteger(input.currentSourceRevision) || input.currentSourceRevision < 1) return []
  const chapterByNumber = new Map(input.chapters.map(chapter => [chapter.chapterNumber, chapter]))
  return input.records.flatMap((rawRecord): VerifiedLongRangeThreadRecallCandidate[] => {
    const parsed = verifiedLongRangeThreadRecordSchema.safeParse(rawRecord)
    if (!parsed.success) return []
    const record = parsed.data
    if (
      record.workId !== input.workId
      || record.branchId !== input.branchId
      || record.status !== 'active'
      || record.confidence === 'high'
      || record.latestEvidence !== null
      || record.sourceRevision !== input.currentSourceRevision
      || record.sourceChapter >= input.currentChapterNo
    ) return []
    const sourceBlock = chapterByNumber
      .get(record.sourceChapter)
      ?.blocks.find(block => block.id === record.sourceBlockId)
    if (!sourceBlock?.text.includes(record.sourceEvidenceQuote)) return []
    const sourceId = record.id
    return [{
      id: `manual-recall:${recallGroupByDimension[record.dimension]}:${sourceId}`,
      sourceId,
      sourceRevision: record.sourceRevision,
      authority: 'derived',
      group: recallGroupByDimension[record.dimension],
      statement: record.statement,
      sourceLabel: `长程线程 · ${record.label}`,
      whyNow: record.whyItMatters,
      locator: {
        kind: 'canon',
        targetId: record.sourceBlockId,
        label: `定位到第 ${record.sourceChapter} 章正史证据`,
      },
      workId: record.workId,
      branchId: record.branchId,
      sourceChapter: record.sourceChapter,
      threadId: record.threadId,
      dimension: record.dimension,
      confidence: record.confidence,
      selectionState: 'unselected',
      authorSelectionRequired: true,
    }]
  })
}

export function buildVerifiedLongRangeThreadRecallCandidates(input: {
  workId: string
  branchId: string
  currentChapterNo: number
  sourceRevision: number
  chapters: LongformContinuityChapter[]
  review: LongRangeStoryThreadReview
  verification: LongRangeStoryThreadVerification
}): VerifiedLongRangeThreadRecallCandidate[] {
  if (!input.workId || !input.branchId) {
    throw new CreationDecisionError('model_output_invalid', 'Long-range recall requires an exact work and branch.')
  }
  if (!Number.isInteger(input.currentChapterNo) || input.currentChapterNo < 1) {
    throw new CreationDecisionError('model_output_invalid', 'Long-range recall requires a positive current chapter.')
  }
  assertPositiveRevision(input.sourceRevision)
  const {
    reviewLocationById,
    verificationLocationById: verifiedLocationById,
    verificationById,
  } = verifiedThreadLocations(input)

  return input.review.threads.flatMap((thread): VerifiedLongRangeThreadRecallCandidate[] => {
    const verification = verificationById.get(thread.threadId)
    if (!verification || verification.decision !== 'verify' || thread.status !== 'active') return []
    if (verification.sourceEvidenceQuote !== thread.sourceEvidenceQuote || verification.latestEvidenceQuote !== null) {
      throw new CreationDecisionError(
        'model_output_invalid',
        'An active long-range recall candidate must preserve its exact source-only evidence.',
      )
    }
    if (thread.confidence === 'high' || thread.latestEvidence !== null) {
      throw new CreationDecisionError(
        'model_output_invalid',
        'An active long-range recall candidate must remain medium/low confidence and source-only.',
      )
    }
    if (thread.sourceChapter >= input.currentChapterNo) {
      throw new CreationDecisionError('model_output_invalid', 'A long-range recall candidate cannot come from the current or a future chapter.')
    }
    const reviewLocation = reviewLocationById.get(thread.threadId)
    const verifiedLocation = verifiedLocationById.get(thread.threadId)
    if (
      !reviewLocation
      || !verifiedLocation
      || reviewLocation.sourceBlockId !== verifiedLocation.sourceBlockId
      || reviewLocation.latestEvidenceBlockId !== null
      || verifiedLocation.latestEvidenceBlockId !== null
    ) {
      throw new CreationDecisionError('evidence_missing', 'Long-range recall evidence locations do not match across review and verification.')
    }
    const sourceId = `long-range-thread:${input.workId}:${input.branchId}:${thread.threadId}`
    return [{
      id: `manual-recall:${recallGroupByDimension[thread.dimension]}:${sourceId}`,
      sourceId,
      sourceRevision: input.sourceRevision,
      authority: 'derived',
      group: recallGroupByDimension[thread.dimension],
      statement: thread.statement,
      sourceLabel: `长程线程 · ${thread.label}`,
      whyNow: thread.whyItMatters,
      locator: {
        kind: 'canon',
        targetId: reviewLocation.sourceBlockId,
        label: `定位到第 ${thread.sourceChapter} 章正史证据`,
      },
      workId: input.workId,
      branchId: input.branchId,
      sourceChapter: thread.sourceChapter,
      threadId: thread.threadId,
      dimension: thread.dimension,
      confidence: thread.confidence,
      selectionState: 'unselected',
      authorSelectionRequired: true,
    }]
  })
}

export function confirmVerifiedLongRangeThreadRecallSelection(input: {
  candidates: VerifiedLongRangeThreadRecallCandidate[]
  selectedCandidateIds: string[]
  authorConfirmed: boolean
}): ManualRecallItem[] {
  if (!input.authorConfirmed) {
    throw new CreationDecisionError('author_confirmation_required', 'Long-range recall selection requires explicit author confirmation.')
  }
  const candidateById = new Map(input.candidates.map(candidate => [candidate.id, candidate]))
  if (candidateById.size !== input.candidates.length) {
    throw new CreationDecisionError('model_output_invalid', 'Long-range recall candidates contain duplicate identities.')
  }
  const selectedIds = [...new Set(input.selectedCandidateIds)]
  return selectedIds.map(id => {
    const candidate = candidateById.get(id)
    if (!candidate) throw new CreationDecisionError('model_output_invalid', 'Long-range recall selection contains an unknown candidate.')
    return {
      id: candidate.id,
      sourceId: candidate.sourceId,
      sourceRevision: candidate.sourceRevision,
      authority: candidate.authority,
      group: candidate.group,
      statement: candidate.statement,
      sourceLabel: candidate.sourceLabel,
      whyNow: candidate.whyNow,
      locator: candidate.locator,
    }
  })
}
