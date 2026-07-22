import type {
  PmfBranch,
  PmfReaderRequest,
  PmfWork,
} from '@/features/pmf/types'
import {
  listCreatorBranches,
  listCreatorEchoSourceBatches,
  listCreatorRequests,
  listCreatorWorks,
  type PmfResult,
} from '@/lib/pmfSupabase'
import {
  cacheReaderSignalBatches,
  readLocalReaderSignals,
  readLocalReaderSignalSources,
  type PmfLocalReaderSignal,
} from '@/local-db/creatorLocalReaderSignalRepository'
import {
  readLocalCreativeReminders,
  suggestLocalCreativeReminders,
  type PmfCreativeReminder,
} from '@/local-db/creatorLocalWritingRepository'
import type { ReaderSignalSourceBatch } from '@/features/creator-pivot/externalEchoContracts'
import type { ReaderSignalSourceSyncState } from '@/local-db/schema'
import { hydrateCreatorLocalRepository } from '@/local-db/creatorLocalRepository'

export interface CreatorEchoLoadApiPort {
  listBranches(): Promise<PmfResult<PmfBranch[]>>
  listRequests(): Promise<PmfResult<PmfReaderRequest[]>>
  listSignalBatches(
    requests: PmfReaderRequest[],
    currentSources?: ReaderSignalSourceSyncState[],
  ): Promise<PmfResult<ReaderSignalSourceBatch[]>>
  listWorks(): Promise<PmfResult<PmfWork[]>>
}

export interface CreatorEchoLoadLocalPort {
  hydrate(): Promise<void>
  cacheReaderSignals(batches: ReaderSignalSourceBatch[]): {
    signals: PmfLocalReaderSignal[]
    sources: ReaderSignalSourceSyncState[]
  }
  readCreativeReminders(): PmfCreativeReminder[]
  readReaderSignals(): PmfLocalReaderSignal[]
  readReaderSignalSources(): ReaderSignalSourceSyncState[]
  suggestCreativeReminders(signals: PmfLocalReaderSignal[]): PmfCreativeReminder[]
}

type RunCreatorEchoLoadResult =
  | {
    ok: false
    notice: string
  }
  | {
    ok: true
    branches: PmfBranch[]
    creativeReminders: PmfCreativeReminder[]
    freshness: 'fresh' | 'stale' | 'offline'
    notice: string
    readerSignals: PmfLocalReaderSignal[]
    requests: PmfReaderRequest[]
    signalSources: ReaderSignalSourceSyncState[]
    works: PmfWork[]
  }

const defaultCreatorEchoLoadApiPort: CreatorEchoLoadApiPort = {
  listBranches: listCreatorBranches,
  listRequests: listCreatorRequests,
  listSignalBatches: listCreatorEchoSourceBatches,
  listWorks: listCreatorWorks,
}

const defaultCreatorEchoLoadLocalPort: CreatorEchoLoadLocalPort = {
  hydrate: hydrateCreatorLocalRepository,
  cacheReaderSignals: cacheReaderSignalBatches,
  readCreativeReminders: readLocalCreativeReminders,
  readReaderSignals: readLocalReaderSignals,
  readReaderSignalSources: readLocalReaderSignalSources,
  suggestCreativeReminders: suggestLocalCreativeReminders,
}

export function readCreatorEchoLocalSnapshot(
  local: CreatorEchoLoadLocalPort = defaultCreatorEchoLoadLocalPort,
) {
  return {
    creativeReminders: local.readCreativeReminders(),
    readerSignals: local.readReaderSignals(),
    signalSources: local.readReaderSignalSources(),
  }
}

function cachedEchoResult(
  local: CreatorEchoLoadLocalPort,
  notice: string,
  context: { branches?: PmfBranch[]; requests?: PmfReaderRequest[]; works?: PmfWork[] } = {},
): RunCreatorEchoLoadResult {
  const readerSignals = local.readReaderSignals()
  if (!readerSignals.length) return { ok: false, notice }
  return {
    ok: true,
    branches: context.branches || [],
    creativeReminders: local.readCreativeReminders(),
    freshness: 'offline',
    notice: '当前显示本机最近保存的外界回声。',
    readerSignals,
    requests: context.requests || [],
    signalSources: local.readReaderSignalSources().map(source => ({ ...source, status: 'offline' })),
    works: context.works || [],
  }
}

export async function runCreatorEchoLoad(
  api: CreatorEchoLoadApiPort = defaultCreatorEchoLoadApiPort,
  local: CreatorEchoLoadLocalPort = defaultCreatorEchoLoadLocalPort,
): Promise<RunCreatorEchoLoadResult> {
  await local.hydrate()
  const currentSignalSources = local.readReaderSignalSources()
  const [requestResult, workResult, branchResult] = await Promise.all([
    api.listRequests(),
    api.listWorks(),
    api.listBranches(),
  ])

  if (!requestResult.ok) return cachedEchoResult(local, requestResult.message)
  if (!workResult.ok) return cachedEchoResult(local, workResult.message, { requests: requestResult.data })
  if (!branchResult.ok) return cachedEchoResult(local, branchResult.message, {
    requests: requestResult.data,
    works: workResult.data,
  })

  const batchResult = await api.listSignalBatches(requestResult.data, currentSignalSources)
  if (!batchResult.ok) return cachedEchoResult(local, batchResult.message, {
    branches: branchResult.data,
    requests: requestResult.data,
    works: workResult.data,
  })
  const cached = local.cacheReaderSignals(batchResult.data)
  const creativeReminders = local.suggestCreativeReminders(cached.signals)
  const freshness = cached.sources.some(source => source.status === 'offline' || source.status === 'error')
    ? 'offline'
    : cached.sources.some(source => source.status === 'stale') ? 'stale' : 'fresh'

  return {
    ok: true,
    branches: branchResult.data,
    creativeReminders,
    freshness,
    notice: cached.signals.length ? '外界回声已更新。' : '当前没有外界回声。',
    readerSignals: cached.signals,
    requests: requestResult.data,
    signalSources: cached.sources,
    works: workResult.data,
  }
}
