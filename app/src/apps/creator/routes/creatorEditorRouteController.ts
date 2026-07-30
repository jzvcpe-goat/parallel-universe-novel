import { byNewestDraft } from '../creatorViewHelpers'
import {
  type PmfBranch,
  type PmfChapter,
  type PmfLocalDraft,
  type PmfReaderRequest,
  type PmfWork,
} from '@/features/pmf/types'
import {
  draftTitleFromRequest,
  workTitleFromMap,
  type PublishMode,
  type WritingGuideStep,
} from './creatorEditorViewModels'
import { resolveEditorSelectedRequest } from './creatorEditorSelectionController'

export type CreatorEditorCreativeReminderStatus = 'suggested' | 'pinned' | 'used' | 'dismissed'

interface CreatorEditorCreativeReminderRef {
  sourceSignalIds: string[]
  status: CreatorEditorCreativeReminderStatus
}

export interface CreatorEditorRouteQuery {
  requestId: string | null
  routeDraftRef: string | null
  routeWorkId: string | null
  routeBranchId: string | null
  routeChapterNumber: number | null
}

function positiveChapterNumber(value: string | null) {
  if (!value || !/^\d+$/u.test(value)) return null
  const chapterNumber = Number(value)
  return Number.isSafeInteger(chapterNumber) && chapterNumber > 0 ? chapterNumber : null
}

export function readCreatorEditorRouteQuery(search: string): CreatorEditorRouteQuery {
  const searchParams = new URLSearchParams(search)
  return {
    requestId: searchParams.get('request'),
    routeDraftRef: searchParams.get('draft'),
    routeWorkId: searchParams.get('work'),
    routeBranchId: searchParams.get('branch'),
    routeChapterNumber: positiveChapterNumber(searchParams.get('chapter')),
  }
}

interface CreatorEditorBootstrapInput extends CreatorEditorRouteQuery {
  requests: PmfReaderRequest[]
  works: PmfWork[]
  branches: PmfBranch[]
  chapters: PmfChapter[]
  drafts: PmfLocalDraft[]
  creativeReminders: CreatorEditorCreativeReminderRef[]
}

interface CreatorEditorDraftRestore {
  activeDraftRef: string
  title: string
  content: string
  publishMode: PublishMode
  selectedIfBranchId: string
  guideStep: WritingGuideStep
}

interface CreatorEditorRequestSeed {
  title: string
  publishMode: PublishMode
  guideStep: WritingGuideStep
  branchTitle: string
}

interface CreatorEditorRouteBranchRestore {
  publishMode: PublishMode
  selectedIfBranchId: string
}

export interface CreatorEditorBootstrapResult {
  routeDraft: PmfLocalDraft | null
  defaultDraft: PmfLocalDraft | null
  nextRequest: PmfReaderRequest | null
  nextWorkId: string
  missingReminderStatus: CreatorEditorCreativeReminderStatus | null
  draftRestore: CreatorEditorDraftRestore | null
  routeBranchRestore: CreatorEditorRouteBranchRestore | null
  routeChapterNumber: number | null
  requestSeed: CreatorEditorRequestSeed | null
  notice: string
}

function publishModeFromBranchId(branchId: string): PublishMode {
  return branchId.endsWith(':main') ? 'main' : 'if'
}

function selectedIfBranchIdFromBranchId(branchId: string) {
  return branchId.endsWith(':main') ? 'new-if-branch' : branchId
}

export function resolveEditorRouteBootstrap({
  requestId,
  routeDraftRef,
  routeWorkId,
  routeBranchId,
  routeChapterNumber,
  requests,
  works,
  branches,
  chapters,
  drafts,
  creativeReminders,
}: CreatorEditorBootstrapInput): CreatorEditorBootstrapResult {
  const routeDraft = routeDraftRef
    ? drafts.find(draft => draft.localDraftRef === routeDraftRef) || null
    : routeChapterNumber && routeWorkId && routeBranchId
      ? [...drafts]
        .filter(draft => (
          draft.workId === routeWorkId
          && draft.branchId === routeBranchId
          && draft.chapterNumber === routeChapterNumber
        ))
        .sort(byNewestDraft)[0] || null
      : null
  const latestDraft = [...drafts].sort(byNewestDraft)[0] || null
  const defaultDraft = routeDraft || (!requestId && !routeWorkId && !routeBranchId ? latestDraft : null)
  const nextRequest = resolveEditorSelectedRequest({
    allowUnscopedFallback: !(routeWorkId || routeBranchId || routeChapterNumber),
    fallbackRequestId: defaultDraft?.requestId || null,
    requestId,
    requests,
  })
  const missingReminderStatus = nextRequest && !creativeReminders.some(reminder => reminder.sourceSignalIds.includes(nextRequest.id))
    ? nextRequest.status === 'in_progress' ? 'pinned' : 'suggested'
    : null
  const nextWorkId = defaultDraft?.workId || routeWorkId || nextRequest?.work_id || works[0]?.id || ''
  const draftRestore = defaultDraft
    ? {
        activeDraftRef: defaultDraft.localDraftRef,
        title: defaultDraft.title,
        content: defaultDraft.content,
        publishMode: publishModeFromBranchId(defaultDraft.branchId),
        selectedIfBranchId: selectedIfBranchIdFromBranchId(defaultDraft.branchId),
        guideStep: defaultDraft.content.trim() ? 'draft' : 'scene',
      } satisfies CreatorEditorDraftRestore
    : null
  const routeBranchRestore = routeBranchId
    ? {
        publishMode: publishModeFromBranchId(routeBranchId),
        selectedIfBranchId: selectedIfBranchIdFromBranchId(routeBranchId),
      } satisfies CreatorEditorRouteBranchRestore
    : null
  const workMap = new Map(works.map(work => [work.id, work]))
  const requestSeed = nextRequest && !defaultDraft
    ? {
        title: draftTitleFromRequest(nextRequest, branches, chapters),
        publishMode: nextRequest.request_type === 'next_chapter' ? 'main' : 'if',
        guideStep: 'scene',
        branchTitle: nextRequest.request_type === 'next_chapter'
          ? '主线'
          : `${workTitleFromMap(nextRequest.work_id, workMap)} · IF 支线`,
      } satisfies CreatorEditorRequestSeed
    : null
  const notice = defaultDraft
    ? routeDraft
      ? routeChapterNumber
        ? `已恢复第 ${routeChapterNumber} 章的私密草稿。`
        : '已打开来自今日任务的私密草稿。'
      : '已打开最近的私密草稿。'
    : requests.length
      ? '读者想看的方向已更新。'
      : routeChapterNumber
        ? `第 ${routeChapterNumber} 章已就绪，先说这一章最想发生的变化。`
        : '没有请求时也可以直接写作并发布到已管理作品。'

  return {
    routeDraft,
    defaultDraft,
    nextRequest,
    nextWorkId,
    missingReminderStatus,
    draftRestore,
    routeBranchRestore,
    routeChapterNumber,
    requestSeed,
    notice,
  }
}
