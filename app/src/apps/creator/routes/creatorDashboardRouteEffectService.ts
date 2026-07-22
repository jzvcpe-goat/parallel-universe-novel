import type {
  PmfBranch,
  PmfChapter,
  PmfLocalDraft,
  PmfPublishEvent,
  PmfReaderRequest,
  PmfWork,
} from '@/features/pmf/types'
import { runCreatorDashboardLoad } from './creatorDashboardLoadService'

export type CreatorDashboardPhase = 'loading' | 'ready' | 'error'

export interface CreatorDashboardRouteStatePatch {
  branches: PmfBranch[]
  chapters: PmfChapter[]
  clientStatus: string
  drafts?: PmfLocalDraft[]
  notice: string
  phase: CreatorDashboardPhase
  publishEvents: PmfPublishEvent[]
  requests: PmfReaderRequest[]
  works: PmfWork[]
}

export interface CreatorDashboardRouteEffectPort {
  load: typeof runCreatorDashboardLoad
}

const defaultCreatorDashboardRouteEffectPort: CreatorDashboardRouteEffectPort = {
  load: runCreatorDashboardLoad,
}

export async function runCreatorDashboardSyncEffect(
  port: CreatorDashboardRouteEffectPort = defaultCreatorDashboardRouteEffectPort,
): Promise<CreatorDashboardRouteStatePatch> {
  const result = await port.load()

  return {
    branches: result.branches,
    chapters: result.chapters,
    clientStatus: result.clientStatus,
    ...(result.ok ? { drafts: result.drafts } : {}),
    notice: result.notice,
    phase: result.ok ? 'ready' : 'error',
    publishEvents: result.publishEvents,
    requests: result.requests,
    works: result.works,
  }
}
