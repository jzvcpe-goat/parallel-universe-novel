import type { PmfReaderRequest } from '@/features/pmf/types'
import {
  normalizeReaderSignalBatches,
  readerSignalBatchesFromRequests,
  sourceSyncStatesFromBatches,
} from '@/features/creator-pivot/externalEchoAdapters'
import type {
  ExternalEchoCacheResult,
  ReaderSignalSourceBatch,
} from '@/features/creator-pivot/externalEchoContracts'
import {
  readLocalReaderSignalRecords,
  readLocalReaderSignalSourceRecords,
  upsertLocalReaderSignalRecord,
  upsertLocalReaderSignalSourceRecord,
} from './creatorLocalRepository'
import type {
  LocalReaderSignalCache,
  ReaderSignalSourceRef,
  ReaderSignalSourceSyncState,
} from './schema'

export type PmfLocalReaderSignal = LocalReaderSignalCache

function sourceRefKey(ref: Pick<ReaderSignalSourceRef, 'source' | 'cloudId'>) {
  return `${ref.source}:${ref.cloudId}`
}

function reconcileCompleteSnapshots(
  existing: LocalReaderSignalCache[],
  incoming: LocalReaderSignalCache[],
  batches: ReaderSignalSourceBatch[],
) {
  const refreshedSources = new Set(
    batches.filter(batch => batch.completeSnapshot && batch.status === 'fresh').map(batch => batch.source),
  )
  const incomingRefs = new Set(incoming.flatMap(signal => signal.sourceRefs.map(sourceRefKey)))
  const fetchedAt = batches.reduce(
    (latest, batch) => batch.fetchedAt > latest ? batch.fetchedAt : latest,
    '',
  ) || new Date().toISOString()

  return existing.map(signal => {
    const retained = signal.sourceRefs.filter(ref =>
      !refreshedSources.has(ref.source) || incomingRefs.has(sourceRefKey(ref)),
    )
    if (retained.length === signal.sourceRefs.length) return signal
    if (retained.length) {
      const primary = retained[0]
      return {
        ...signal,
        cloudId: primary.cloudId,
        source: primary.source,
        sourceRefs: retained,
        readerVisible: retained.some(ref => ref.visibility === 'visible'),
        visibility: retained.some(ref => ref.visibility === 'visible')
          ? 'visible'
          : retained.some(ref => ref.visibility === 'hidden') ? 'hidden' : 'deleted',
        fetchedAt,
      } satisfies LocalReaderSignalCache
    }
    return {
      ...signal,
      sourceRefs: signal.sourceRefs.map(ref => ({ ...ref, visibility: 'deleted' as const })),
      readerVisible: false,
      visibility: 'deleted',
      tombstonedAt: fetchedAt,
      fetchedAt,
    } satisfies LocalReaderSignalCache
  })
}

export function readLocalReaderSignals(workId?: string): PmfLocalReaderSignal[] {
  return readLocalReaderSignalRecords(workId)
}

export function readLocalReaderSignalSources(): ReaderSignalSourceSyncState[] {
  return readLocalReaderSignalSourceRecords()
}

export function upsertLocalReaderSignal(signal: PmfLocalReaderSignal): PmfLocalReaderSignal {
  return upsertLocalReaderSignalRecord(signal)
}

export function cacheReaderSignalBatches(batches: ReaderSignalSourceBatch[]): ExternalEchoCacheResult {
  const existingSignals = readLocalReaderSignals()
  const normalized = normalizeReaderSignalBatches(batches)
  const reconciled = reconcileCompleteSnapshots(existingSignals, normalized, batches)
  const nextById = new Map(reconciled.map(signal => [signal.id, signal]))
  for (const signal of normalized) nextById.set(signal.id, signal)
  for (const signal of nextById.values()) upsertLocalReaderSignalRecord(signal)

  const sourceStates = sourceSyncStatesFromBatches(batches, readLocalReaderSignalSources())
  for (const state of sourceStates) upsertLocalReaderSignalSourceRecord(state)

  return {
    signals: readLocalReaderSignals(),
    sources: readLocalReaderSignalSources(),
  }
}

export function readerSignalFromRequest(
  request: PmfReaderRequest,
  fetchedAt = new Date().toISOString(),
): LocalReaderSignalCache {
  const [signal] = normalizeReaderSignalBatches(readerSignalBatchesFromRequests([request], fetchedAt))
  return signal
}

export function cacheReaderRequestSignals(requests: PmfReaderRequest[]): PmfLocalReaderSignal[] {
  return cacheReaderSignalBatches(readerSignalBatchesFromRequests(requests)).signals
}
