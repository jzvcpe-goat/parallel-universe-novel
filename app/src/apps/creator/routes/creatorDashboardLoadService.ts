import type {
  PmfBranch,
  PmfChapter,
  PmfCreatorClient,
  PmfLocalDraft,
  PmfPublishEvent,
  PmfReaderRequest,
  PmfWork,
} from '@/features/pmf/types'
import {
  listCreatorBranches,
  listCreatorChapters,
  listCreatorPublishEvents,
  listCreatorRequests,
  listCreatorWorks,
  syncCreatorClient,
  type PmfResult,
} from '@/lib/pmfSupabase'
import { readLocalDrafts } from '@/local-db/creatorLocalDraftRepository'
import { creatorFacingNotice } from '../creatorViewHelpers'

export interface CreatorDashboardLoadApiPort {
  listBranches(): Promise<PmfResult<PmfBranch[]>>
  listChapters(): Promise<PmfResult<PmfChapter[]>>
  listPublishEvents(): Promise<PmfResult<PmfPublishEvent[]>>
  listRequests(): Promise<PmfResult<PmfReaderRequest[]>>
  listWorks(): Promise<PmfResult<PmfWork[]>>
  syncClient(): Promise<PmfResult<PmfCreatorClient>>
}

export interface CreatorDashboardLocalReadPort {
  readDrafts(): PmfLocalDraft[]
}

interface CreatorDashboardLocalSnapshot {
  drafts: PmfLocalDraft[]
}

type RunCreatorDashboardLoadResult =
  | {
    branches: PmfBranch[]
    chapters: PmfChapter[]
    clientStatus: string
    drafts: PmfLocalDraft[]
    notice: string
    ok: false
    publishEvents: PmfPublishEvent[]
    requests: PmfReaderRequest[]
    works: PmfWork[]
  }
  | {
    branches: PmfBranch[]
    chapters: PmfChapter[]
    clientStatus: string
    drafts: PmfLocalDraft[]
    notice: string
    ok: true
    publishEvents: PmfPublishEvent[]
    requests: PmfReaderRequest[]
    works: PmfWork[]
  }

const defaultCreatorDashboardLoadApiPort: CreatorDashboardLoadApiPort = {
  listBranches: listCreatorBranches,
  listChapters: listCreatorChapters,
  listPublishEvents: listCreatorPublishEvents,
  listRequests: listCreatorRequests,
  listWorks: listCreatorWorks,
  syncClient: syncCreatorClient,
}

const defaultCreatorDashboardLocalReadPort: CreatorDashboardLocalReadPort = {
  readDrafts: readLocalDrafts,
}

export function readCreatorDashboardLocalSnapshot(
  local: CreatorDashboardLocalReadPort = defaultCreatorDashboardLocalReadPort,
): CreatorDashboardLocalSnapshot {
  return {
    drafts: local.readDrafts(),
  }
}

export async function runCreatorDashboardLoad(
  api: CreatorDashboardLoadApiPort = defaultCreatorDashboardLoadApiPort,
  local: CreatorDashboardLocalReadPort = defaultCreatorDashboardLocalReadPort,
): Promise<RunCreatorDashboardLoadResult> {
  const heartbeat = await api.syncClient()
  const clientStatus = heartbeat.ok
    ? `在线 · ${new Date(heartbeat.data.last_seen_at).toLocaleString()}`
    : creatorFacingNotice(heartbeat.message)

  const [requestResult, workResult, branchResult, chapterResult, eventResult] = await Promise.all([
    api.listRequests(),
    api.listWorks(),
    api.listBranches(),
    api.listChapters(),
    api.listPublishEvents(),
  ])

  const requests = requestResult.ok ? requestResult.data : []
  const works = workResult.ok ? workResult.data : []
  const branches = branchResult.ok ? branchResult.data : []
  const chapters = chapterResult.ok ? chapterResult.data : []
  const publishEvents = eventResult.ok ? eventResult.data : []
  const drafts = local.readDrafts()
  const firstError = [requestResult, workResult, branchResult, chapterResult, eventResult].find(result => !result.ok)

  if (firstError && !firstError.ok) {
    return {
      branches,
      chapters,
      clientStatus,
      drafts,
      notice: creatorFacingNotice(firstError.message),
      ok: false,
      publishEvents,
      requests,
      works,
    }
  }

  return {
    branches,
    chapters,
    clientStatus,
    drafts,
    notice: requests.length ? '今天的写作线索已更新。' : '暂无等待判断的回声。',
    ok: true,
    publishEvents,
    requests,
    works,
  }
}
