import type {
  PmfBranch,
  PmfChapter,
  PmfLocalDraft,
  PmfPublishEvent,
  PmfReaderRequest,
  PmfWork,
} from '@/features/pmf/types'
import {
  byNewestDraft,
  byRequestPriority,
  isDraftReadyForPublish,
} from '../creatorViewHelpers'

export interface CreatorDashboardRouteViewModelInput {
  branches: PmfBranch[]
  chapters: PmfChapter[]
  drafts: PmfLocalDraft[]
  publishEvents: PmfPublishEvent[]
  requests: PmfReaderRequest[]
  works: PmfWork[]
}

export interface CreatorDashboardRouteViewModel {
  activeBranches: number
  activeDraft: PmfLocalDraft | null
  inProgress: number
  latestPublish: PmfPublishEvent | null
  latestWork: PmfWork | null
  pending: number
  publishCandidate: PmfLocalDraft | null
  published: number
  publishedChapters: number
  readyDraftCount: number
  rejected: number
  topRequest: PmfReaderRequest | null
}

export function createCreatorDashboardRouteViewModel({
  branches,
  chapters,
  drafts,
  publishEvents,
  requests,
  works,
}: CreatorDashboardRouteViewModelInput): CreatorDashboardRouteViewModel {
  const sortedDrafts = [...drafts].sort(byNewestDraft)

  return {
    activeBranches: branches.filter(branch => branch.status === 'published' || branch.status === 'draft').length,
    activeDraft: sortedDrafts[0] || null,
    inProgress: requests.filter(item => item.status === 'in_progress' || item.status === 'acknowledged').length,
    latestPublish: publishEvents[0] || null,
    latestWork: works[0] || null,
    pending: requests.filter(item => item.status === 'pending').length,
    publishCandidate: sortedDrafts.find(isDraftReadyForPublish) || null,
    published: requests.filter(item => item.status === 'published').length,
    publishedChapters: chapters.filter(chapter => chapter.status === 'published').length,
    readyDraftCount: drafts.filter(isDraftReadyForPublish).length,
    rejected: requests.filter(item => item.status === 'rejected').length,
    topRequest: [...requests]
      .filter(item => item.status === 'pending' || item.status === 'acknowledged' || item.status === 'in_progress')
      .sort(byRequestPriority)[0] || null,
  }
}
