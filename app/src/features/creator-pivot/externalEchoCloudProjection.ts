import type {
  ReaderCommentSignalRecord,
  ReaderHighlightSignalRecord,
  ReaderQuestionSignalRecord,
  ReaderReactionSignalRecord,
  ReaderSignalSourceBatch,
} from './externalEchoContracts'

export type CloudExternalEchoSource = 'comment' | 'highlight' | 'reaction' | 'question'

export interface CloudExternalEchoRow {
  id: string
  source: CloudExternalEchoSource
  work_id: string
  branch_id: string | null
  chapter_id: string | null
  text: string
  anchor_text: string | null
  category: string | null
  reaction: string | null
  weight: number
  visibility: 'visible' | 'hidden' | 'deleted'
  moderation_status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

interface ExternalEchoCloudCursor {
  updatedAt: string
  id: string
}

const commentCategories = new Set<NonNullable<ReaderCommentSignalRecord['category']>>([
  'comment',
  'confusion',
  'continuity_note',
])
const questionCategories = new Set<NonNullable<ReaderQuestionSignalRecord['category']>>([
  'character',
  'continuity',
  'confusion',
])
const reactionKinds = new Set<ReaderReactionSignalRecord['reaction']>([
  'liked',
  'moved',
  'surprised',
  'want_more',
])

export function encodeExternalEchoCloudCursor(cursor: ExternalEchoCloudCursor) {
  return `${cursor.updatedAt}|${encodeURIComponent(cursor.id)}`
}

export function decodeExternalEchoCloudCursor(value?: string | null): ExternalEchoCloudCursor | null {
  if (!value) return null
  const separator = value.indexOf('|')
  if (separator <= 0 || separator === value.length - 1) return null
  const updatedAt = value.slice(0, separator)
  const id = decodeURIComponent(value.slice(separator + 1))
  if (!id || Number.isNaN(Date.parse(updatedAt))) return null
  return { updatedAt, id }
}

function baseRecord(row: CloudExternalEchoRow) {
  return {
    id: row.id,
    workId: row.work_id,
    branchId: row.branch_id || undefined,
    chapterId: row.chapter_id || undefined,
    text: row.text,
    anchorText: row.anchor_text || undefined,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function recordFromCloudRow(row: CloudExternalEchoRow) {
  const base = baseRecord(row)
  if (row.source === 'comment') {
    return {
      ...base,
      source: 'comment',
      category: commentCategories.has(row.category as NonNullable<ReaderCommentSignalRecord['category']>)
        ? row.category as NonNullable<ReaderCommentSignalRecord['category']>
        : 'comment',
    } satisfies ReaderCommentSignalRecord
  }
  if (row.source === 'highlight') {
    return {
      ...base,
      source: 'highlight',
      highlightCount: Math.max(1, row.weight),
    } satisfies ReaderHighlightSignalRecord
  }
  if (row.source === 'reaction') {
    return {
      ...base,
      source: 'reaction',
      reaction: reactionKinds.has(row.reaction as ReaderReactionSignalRecord['reaction'])
        ? row.reaction as ReaderReactionSignalRecord['reaction']
        : 'want_more',
      count: Math.max(1, row.weight),
    } satisfies ReaderReactionSignalRecord
  }
  return {
    ...base,
    source: 'question',
    category: questionCategories.has(row.category as NonNullable<ReaderQuestionSignalRecord['category']>)
      ? row.category as NonNullable<ReaderQuestionSignalRecord['category']>
      : 'character',
  } satisfies ReaderQuestionSignalRecord
}

export function cloudExternalEchoBatch(
  source: CloudExternalEchoSource,
  rows: CloudExternalEchoRow[],
  fetchedAt: string,
  previousCursor?: string | null,
): ReaderSignalSourceBatch {
  const ordered = rows
    .filter(row => row.source === source)
    .sort((left, right) => left.updated_at.localeCompare(right.updated_at) || left.id.localeCompare(right.id))
  const latest = ordered.at(-1)
  return {
    source,
    cursor: latest
      ? encodeExternalEchoCloudCursor({ updatedAt: latest.updated_at, id: latest.id })
      : previousCursor || null,
    fetchedAt,
    status: 'fresh',
    completeSnapshot: !previousCursor,
    records: ordered.map(recordFromCloudRow),
  }
}

export function unavailableCloudExternalEchoBatch(
  source: CloudExternalEchoSource,
  fetchedAt: string,
  previousCursor?: string | null,
  errorCode = 'reader_signal_source_unavailable',
): ReaderSignalSourceBatch {
  return {
    source,
    cursor: previousCursor || null,
    fetchedAt,
    status: 'error',
    errorCode,
    completeSnapshot: false,
    records: [],
  }
}
