import type { PmfReaderRequest } from '@/features/pmf/types'
import type {
  LocalReaderSignalCache,
  ReaderSignalSourceRef,
  ReaderSignalSourceSyncState,
} from '@/local-db/schema'
import type {
  ReaderCommentSignalRecord,
  ReaderHighlightSignalRecord,
  ReaderQuestionSignalRecord,
  ReaderReactionSignalRecord,
  ReaderRequestSignalRecord,
  ReaderSignalAdapter,
  ReaderSignalAdapterContext,
  ReaderSignalRawRecord,
  ReaderSignalSourceBatch,
  ReaderSignalVisibility,
  ReaderVoteAggregateSignalRecord,
} from './externalEchoContracts'

function normalizedText(value: string) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

function hashReaderSignalContent(value: string) {
  let hash = 0xcbf29ce484222325n
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte)
    hash = BigInt.asUintN(64, hash * 0x100000001b3n)
  }
  return hash.toString(36)
}

function sourceTypeForRecord(record: ReaderSignalRawRecord): LocalReaderSignalCache['sourceType'] {
  if (record.source === 'request') {
    return record.requestType === 'if_branch' || record.requestType === 'continue_branch'
      ? 'branch_wish'
      : 'request'
  }
  if (record.source === 'comment') {
    if (record.category === 'confusion') return 'confusion'
    if (record.category === 'continuity_note') return 'continuity_note'
    return 'comment'
  }
  if (record.source === 'question') {
    if (record.category === 'confusion') return 'confusion'
    if (record.category === 'continuity') return 'continuity_note'
    return 'question'
  }
  if (record.source === 'vote_aggregate') return 'vote'
  return record.source
}

function weightForRecord(record: ReaderSignalRawRecord) {
  if (record.source === 'request') return Math.max(1, record.voteCount)
  if (record.source === 'highlight') return Math.max(1, record.highlightCount)
  if (record.source === 'reaction') return Math.max(1, record.count)
  if (record.source === 'vote_aggregate') return Math.max(1, record.count)
  return 1
}

function localSignalFromRecord(
  record: ReaderSignalRawRecord,
  context: ReaderSignalAdapterContext,
): LocalReaderSignalCache {
  const text = record.text.trim()
  const contentKey = [
    record.workId,
    record.branchId || 'main',
    record.chapterId || '',
    normalizedText(text),
  ].join('|')
  const normalizedHash = hashReaderSignalContent(contentKey)
  return {
    id: `reader-signal:${normalizedHash}`,
    cloudId: record.id,
    source: record.source,
    sourceRefs: [{
      source: record.source,
      cloudId: record.id,
      visibility: record.visibility,
    }],
    workId: record.workId,
    branchId: record.branchId,
    chapterId: record.chapterId,
    sourceType: sourceTypeForRecord(record),
    rawText: text,
    anchorText: record.anchorText?.trim() || undefined,
    readerVisible: record.visibility === 'visible',
    visibility: record.visibility,
    tombstonedAt: record.visibility === 'deleted' ? context.fetchedAt : undefined,
    cloudCreatedAt: record.createdAt,
    sourceUpdatedAt: record.updatedAt,
    sourceCursor: context.cursor,
    fetchedAt: context.fetchedAt,
    normalizedHash,
    weight: weightForRecord(record),
  }
}

function adapter<TRecord extends ReaderSignalRawRecord>(source: TRecord['source']): ReaderSignalAdapter<TRecord> {
  return {
    source,
    normalize: localSignalFromRecord,
  }
}

export const readerRequestSignalAdapter = adapter<ReaderRequestSignalRecord>('request')
export const readerCommentSignalAdapter = adapter<ReaderCommentSignalRecord>('comment')
export const readerHighlightSignalAdapter = adapter<ReaderHighlightSignalRecord>('highlight')
export const readerReactionSignalAdapter = adapter<ReaderReactionSignalRecord>('reaction')
export const readerQuestionSignalAdapter = adapter<ReaderQuestionSignalRecord>('question')
export const readerVoteAggregateSignalAdapter = adapter<ReaderVoteAggregateSignalRecord>('vote_aggregate')

const sourceTypePriority: Record<LocalReaderSignalCache['sourceType'], number> = {
  confusion: 10,
  continuity_note: 9,
  question: 8,
  branch_wish: 7,
  request: 6,
  comment: 5,
  highlight: 4,
  reaction: 3,
  vote: 2,
}

function visibilityRank(visibility: ReaderSignalVisibility) {
  if (visibility === 'visible') return 3
  if (visibility === 'hidden') return 2
  return 1
}

function newestTimestamp(signal: LocalReaderSignalCache) {
  return signal.sourceUpdatedAt || signal.cloudCreatedAt
}

function mergeSourceRefs(signals: LocalReaderSignalCache[]): ReaderSignalSourceRef[] {
  const byKey = new Map<string, ReaderSignalSourceRef>()
  for (const signal of signals) {
    for (const ref of signal.sourceRefs) {
      const key = `${ref.source}:${ref.cloudId}`
      const current = byKey.get(key)
      if (!current || visibilityRank(ref.visibility) > visibilityRank(current.visibility)) byKey.set(key, ref)
    }
  }
  return [...byKey.values()].sort((left, right) =>
    left.source.localeCompare(right.source) || left.cloudId.localeCompare(right.cloudId),
  )
}

function mergeNormalizedSignals(signals: LocalReaderSignalCache[]) {
  const ordered = [...signals].sort((left, right) => {
    const visible = visibilityRank(right.visibility) - visibilityRank(left.visibility)
    if (visible) return visible
    const priority = sourceTypePriority[right.sourceType] - sourceTypePriority[left.sourceType]
    if (priority) return priority
    return newestTimestamp(right).localeCompare(newestTimestamp(left)) || left.cloudId.localeCompare(right.cloudId)
  })
  const primary = ordered[0]
  const sourceRefs = mergeSourceRefs(ordered)
  const visibility = sourceRefs.some(ref => ref.visibility === 'visible')
    ? 'visible'
    : sourceRefs.some(ref => ref.visibility === 'hidden') ? 'hidden' : 'deleted'
  return {
    ...primary,
    id: `reader-signal:${primary.normalizedHash}`,
    sourceRefs,
    readerVisible: visibility === 'visible',
    visibility,
    tombstonedAt: visibility === 'deleted' ? primary.fetchedAt : undefined,
    weight: ordered.reduce((total, signal) => total + signal.weight, 0),
    fetchedAt: ordered.reduce((latest, signal) => signal.fetchedAt > latest ? signal.fetchedAt : latest, primary.fetchedAt),
  } satisfies LocalReaderSignalCache
}

function normalizeBatch(batch: ReaderSignalSourceBatch) {
  const context = { cursor: batch.cursor, fetchedAt: batch.fetchedAt }
  return batch.records.map(record => {
    const source = record.source
    if (source === 'request') return readerRequestSignalAdapter.normalize(record, context)
    if (source === 'comment') return readerCommentSignalAdapter.normalize(record, context)
    if (source === 'highlight') return readerHighlightSignalAdapter.normalize(record, context)
    if (source === 'reaction') return readerReactionSignalAdapter.normalize(record, context)
    if (source === 'question') return readerQuestionSignalAdapter.normalize(record, context)
    return readerVoteAggregateSignalAdapter.normalize(record, context)
  })
}

export function normalizeReaderSignalBatches(batches: ReaderSignalSourceBatch[]) {
  const bySourceId = new Map<string, LocalReaderSignalCache>()
  for (const batch of batches) {
    for (const signal of normalizeBatch(batch)) {
      const ref = signal.sourceRefs[0]
      const key = `${ref.source}:${ref.cloudId}`
      const current = bySourceId.get(key)
      if (!current || newestTimestamp(signal) >= newestTimestamp(current)) bySourceId.set(key, signal)
    }
  }

  const byContent = new Map<string, LocalReaderSignalCache[]>()
  for (const signal of bySourceId.values()) {
    const group = byContent.get(signal.normalizedHash) || []
    group.push(signal)
    byContent.set(signal.normalizedHash, group)
  }
  return [...byContent.values()].map(mergeNormalizedSignals).sort((left, right) =>
    right.weight - left.weight || right.cloudCreatedAt.localeCompare(left.cloudCreatedAt) || left.id.localeCompare(right.id),
  )
}

export function sourceSyncStatesFromBatches(
  batches: ReaderSignalSourceBatch[],
  existing: ReaderSignalSourceSyncState[],
) {
  const current = new Map(existing.map(state => [state.source, state]))
  return batches.map(batch => {
    const previous = current.get(batch.source)
    const successful = batch.status === 'fresh' || batch.status === 'stale'
    return {
      source: batch.source,
      cursor: successful ? batch.cursor : previous?.cursor || batch.cursor,
      status: batch.status,
      fetchedAt: batch.fetchedAt,
      lastSuccessfulAt: successful ? batch.fetchedAt : previous?.lastSuccessfulAt,
      errorCode: batch.errorCode,
      recordCount: batch.records.length,
      updatedAt: batch.fetchedAt,
    } satisfies ReaderSignalSourceSyncState
  })
}

export function readerSignalBatchesFromRequests(
  requests: PmfReaderRequest[],
  fetchedAt = new Date().toISOString(),
): ReaderSignalSourceBatch[] {
  const cursor = requests.reduce((latest, request) => {
    const value = request.updated_at || request.created_at
    return value > latest ? value : latest
  }, '') || null
  const requestRecords: ReaderRequestSignalRecord[] = requests.map(request => ({
    source: 'request',
    id: request.id,
    workId: request.work_id,
    branchId: request.branch_id || undefined,
    chapterId: request.chapter_id || undefined,
    requestType: request.request_type,
    status: request.status,
    voteCount: request.vote_count,
    text: request.request_text,
    visibility: 'visible',
    createdAt: request.created_at,
    updatedAt: request.updated_at || undefined,
  }))
  const voteRecords: ReaderVoteAggregateSignalRecord[] = requests
    .filter(request => request.vote_count > 0)
    .map(request => ({
      source: 'vote_aggregate',
      id: `request-votes:${request.id}`,
      requestId: request.id,
      workId: request.work_id,
      branchId: request.branch_id || undefined,
      chapterId: request.chapter_id || undefined,
      count: request.vote_count,
      text: request.request_type === 'if_branch' ? '读者支持展开这条支线。' : '读者希望这个方向继续推进。',
      visibility: 'visible',
      createdAt: request.created_at,
      updatedAt: request.updated_at || undefined,
    }))
  return [
    { source: 'request', cursor, fetchedAt, status: 'fresh', completeSnapshot: true, records: requestRecords },
    { source: 'vote_aggregate', cursor, fetchedAt, status: 'fresh', completeSnapshot: true, records: voteRecords },
  ]
}
