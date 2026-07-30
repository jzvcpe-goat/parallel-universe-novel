import type {
  PmfBranch,
  PmfChapter,
  PmfReaderRequest,
  PmfWork,
} from '@/features/pmf/types'
import { branchTypeLabel, latestDateLabel } from '../creatorViewHelpers'

type CreatorWorksDecisionTone = 'gold' | 'outline' | 'stasis'
type CreatorWorksBranchStatusVariant = 'destructive' | 'outline' | 'stasis'

export interface CreatorWorksRouteViewModelInput {
  branches: PmfBranch[]
  chapters: PmfChapter[]
  requests: PmfReaderRequest[]
  selectedBranchId: string
  selectedWorkId: string
  works: PmfWork[]
}

export interface CreatorWorksWorkRow {
  branchCount: number
  chapterCount: number
  openRequestCount: number
  work: PmfWork
}

export interface CreatorWorksBranchRow {
  branch: PmfBranch
  chapters: PmfChapter[]
  parentChapterLabel: string
  requestCount: number
  statusLabel: string
  statusVariant: CreatorWorksBranchStatusVariant
  typeLabel: string
  updatedAtLabel: string
}

interface CreatorWorksDecisionStep {
  label: string
  tone: CreatorWorksDecisionTone
  value: string
}

export interface CreatorWorksRouteViewModel {
  branchRows: CreatorWorksBranchRow[]
  selectedBranch: PmfBranch | null
  selectedBranchAnswer: string
  selectedBranchChapters: PmfChapter[]
  selectedBranchDecisionSteps: CreatorWorksDecisionStep[]
  selectedBranchQuestion: string
  selectedBranchRequests: PmfReaderRequest[]
  selectedBranchTypeLabel: string
  selectedBranchUpdatedAtLabel: string
  selectedParentBranch: PmfBranch | null
  selectedParentBranchLabel: string
  selectedParentChapter: PmfChapter | null
  selectedParentChapterLabel: string
  selectedWork: PmfWork | null
  selectedWorkBranches: PmfBranch[]
  selectedWorkChapters: PmfChapter[]
  selectedWorkRequests: PmfReaderRequest[]
  workRows: CreatorWorksWorkRow[]
}

function requestsForBranch(requests: PmfReaderRequest[], branch: PmfBranch) {
  return requests.filter(request => {
    if (branch.branch_type === 'main') {
      return !request.branch_id || request.branch_id === branch.id
    }
    return request.branch_id === branch.id
  })
}

export function createCreatorWorksRouteViewModel({
  branches,
  chapters,
  requests,
  selectedBranchId,
  selectedWorkId,
  works,
}: CreatorWorksRouteViewModelInput): CreatorWorksRouteViewModel {
  const selectedWork = works.find(work => work.id === selectedWorkId) || works[0] || null
  const selectedWorkBranches = selectedWork
    ? branches.filter(branch => branch.work_id === selectedWork.id)
    : []
  const selectedWorkChapters = selectedWork
    ? chapters.filter(chapter => chapter.work_id === selectedWork.id)
    : []
  const selectedWorkRequests = selectedWork
    ? requests.filter(request => request.work_id === selectedWork.id)
    : []
  const selectedBranch = selectedWorkBranches.find(branch => branch.id === selectedBranchId)
    || selectedWorkBranches[0]
    || null
  const selectedBranchChapters = selectedBranch
    ? selectedWorkChapters
      .filter(chapter => chapter.branch_id === selectedBranch.id)
      .sort((left, right) => left.chapter_no - right.chapter_no)
    : []
  const selectedBranchRequests = selectedBranch
    ? requestsForBranch(requests, selectedBranch)
    : []
  const selectedParentBranch = selectedBranch?.parent_branch_id
    ? branches.find(branch => branch.id === selectedBranch.parent_branch_id) || null
    : null
  const selectedParentChapter = selectedBranch?.parent_chapter_id
    ? chapters.find(chapter => chapter.id === selectedBranch.parent_chapter_id) || null
    : null

  const selectedBranchQuestion = selectedBranch?.branch_type === 'if'
    ? '这条 IF 支线要证明哪一个选择代价？'
    : '主线下一章要先兑现哪个承诺？'
  const selectedBranchAnswer = selectedBranch
    ? selectedBranchRequests.length
      ? `先从 ${selectedBranchRequests.length} 条读者愿望里找共同压力，再进入正文。`
      : selectedBranchChapters.length
        ? '先接住上一章留下的承诺，再决定是否开新冲突。'
        : '这条线还缺第一段正文，先写一个能立住代价的开场。'
    : '先选择一条主线或 IF 支线。'

  const selectedBranchDecisionSteps: CreatorWorksDecisionStep[] = [
    {
      label: '当前线',
      tone: selectedBranch?.branch_type === 'main' ? 'gold' : 'outline',
      value: selectedBranch ? branchTypeLabel(selectedBranch) : '未选择',
    },
    {
      label: '读者愿望',
      tone: selectedBranchRequests.length ? 'gold' : 'outline',
      value: `${selectedBranchRequests.length} 条`,
    },
    {
      label: '章节',
      tone: selectedBranchChapters.length ? 'outline' : 'stasis',
      value: `${selectedBranchChapters.length} 章`,
    },
  ]

  const chaptersByBranch = new Map<string, PmfChapter[]>()
  for (const chapter of selectedWorkChapters) {
    const branchChapters = chaptersByBranch.get(chapter.branch_id) || []
    branchChapters.push(chapter)
    chaptersByBranch.set(chapter.branch_id, branchChapters)
  }
  for (const branchChapters of chaptersByBranch.values()) {
    branchChapters.sort((left, right) => left.chapter_no - right.chapter_no)
  }

  const branchRows = selectedWorkBranches.map(branch => {
    const parentChapter = branch.parent_chapter_id
      ? chapters.find(chapter => chapter.id === branch.parent_chapter_id) || null
      : null

    return {
      branch,
      chapters: chaptersByBranch.get(branch.id) || [],
      parentChapterLabel: parentChapter
        ? `第 ${parentChapter.chapter_no} 章 · ${parentChapter.title}`
        : '未设置',
      requestCount: requestsForBranch(requests, branch).length,
      statusLabel: branch.status === 'published'
        ? '已公开'
        : branch.status === 'archived'
          ? '已归档'
          : '未公开',
      statusVariant: branch.status === 'published'
        ? 'outline' as const
        : branch.status === 'archived'
          ? 'destructive' as const
          : 'stasis' as const,
      typeLabel: branchTypeLabel(branch),
      updatedAtLabel: latestDateLabel(branch.updated_at),
    }
  })

  const workRows = works.map(work => ({
    branchCount: branches.filter(branch => branch.work_id === work.id).length,
    chapterCount: chapters.filter(chapter => chapter.work_id === work.id).length,
    openRequestCount: requests.filter(request => (
      request.work_id === work.id
      && request.status !== 'published'
      && request.status !== 'rejected'
    )).length,
    work,
  }))

  return {
    branchRows,
    selectedBranch,
    selectedBranchAnswer,
    selectedBranchChapters,
    selectedBranchDecisionSteps,
    selectedBranchQuestion,
    selectedBranchRequests,
    selectedBranchTypeLabel: selectedBranch ? branchTypeLabel(selectedBranch) : '未选择',
    selectedBranchUpdatedAtLabel: selectedBranch ? latestDateLabel(selectedBranch.updated_at) : '未更新',
    selectedParentBranch,
    selectedParentBranchLabel: selectedParentBranch
      ? `${branchTypeLabel(selectedParentBranch)} · ${selectedParentBranch.title}`
      : '未指定',
    selectedParentChapter,
    selectedParentChapterLabel: selectedParentChapter
      ? `第 ${selectedParentChapter.chapter_no} 章 · ${selectedParentChapter.title}`
      : '未指定',
    selectedWork,
    selectedWorkBranches,
    selectedWorkChapters,
    selectedWorkRequests,
    workRows,
  }
}
