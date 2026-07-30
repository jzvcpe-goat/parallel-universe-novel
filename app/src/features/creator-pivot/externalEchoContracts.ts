import type { PmfRequestStatus, PmfRequestType } from '@/features/pmf/types'
import type { ReaderSignalAdapterSource } from '@/local-db/schema'

export type ReaderSignalVisibility = 'visible' | 'hidden' | 'deleted'

interface ReaderSignalSourceRecordBase {
  id: string
  workId: string
  branchId?: string
  chapterId?: string
  text: string
  anchorText?: string
  visibility: ReaderSignalVisibility
  createdAt: string
  updatedAt?: string
}

export interface ReaderRequestSignalRecord extends ReaderSignalSourceRecordBase {
  source: 'request'
  requestType: PmfRequestType
  status: PmfRequestStatus
  voteCount: number
}

export interface ReaderCommentSignalRecord extends ReaderSignalSourceRecordBase {
  source: 'comment'
  category?: 'comment' | 'confusion' | 'continuity_note'
}

export interface ReaderHighlightSignalRecord extends ReaderSignalSourceRecordBase {
  source: 'highlight'
  highlightCount: number
}

export interface ReaderReactionSignalRecord extends ReaderSignalSourceRecordBase {
  source: 'reaction'
  reaction: 'liked' | 'moved' | 'surprised' | 'want_more'
  count: number
}

export interface ReaderQuestionSignalRecord extends ReaderSignalSourceRecordBase {
  source: 'question'
  category?: 'character' | 'continuity' | 'confusion'
}

export interface ReaderVoteAggregateSignalRecord extends ReaderSignalSourceRecordBase {
  source: 'vote_aggregate'
  requestId: string
  count: number
}

export type ReaderSignalRawRecord =
  | ReaderRequestSignalRecord
  | ReaderCommentSignalRecord
  | ReaderHighlightSignalRecord
  | ReaderReactionSignalRecord
  | ReaderQuestionSignalRecord
  | ReaderVoteAggregateSignalRecord

export interface ReaderSignalAdapterContext {
  cursor: string | null
  fetchedAt: string
}

export interface ReaderSignalAdapter<TRecord extends ReaderSignalRawRecord> {
  source: TRecord['source']
  normalize(record: TRecord, context: ReaderSignalAdapterContext): import('@/local-db/schema').LocalReaderSignalCache
}

export interface ReaderSignalSourceBatch<TRecord extends ReaderSignalRawRecord = ReaderSignalRawRecord> {
  source: ReaderSignalAdapterSource
  cursor: string | null
  fetchedAt: string
  status: 'fresh' | 'stale' | 'offline' | 'error'
  errorCode?: string
  completeSnapshot: boolean
  records: TRecord[]
}

export interface ExternalEchoCacheResult {
  signals: import('@/local-db/schema').LocalReaderSignalCache[]
  sources: import('@/local-db/schema').ReaderSignalSourceSyncState[]
}
