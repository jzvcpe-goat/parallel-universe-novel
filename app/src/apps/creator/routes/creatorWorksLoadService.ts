import type {
  PmfBranch,
  PmfChapter,
  PmfReaderRequest,
  PmfWork,
} from '@/features/pmf/types'
import {
  listCreatorBranches,
  listCreatorChapters,
  listCreatorRequests,
  listCreatorWorks,
  type PmfResult,
} from '@/lib/pmfSupabase'

export interface CreatorWorksLoadApiPort {
  listBranches(): Promise<PmfResult<PmfBranch[]>>
  listChapters(): Promise<PmfResult<PmfChapter[]>>
  listRequests(): Promise<PmfResult<PmfReaderRequest[]>>
  listWorks(): Promise<PmfResult<PmfWork[]>>
}

export interface CreatorWorksLoadInput {
  selectedBranchId?: string
  selectedWorkId?: string
}

interface CreatorWorksSelectionPatch {
  authorNotice: string
  parentBranchId: string
  selectedBranchId: string
  selectedWorkId: string
}

type RunCreatorWorksLoadResult =
  | {
    branches: PmfBranch[]
    chapters: PmfChapter[]
    notice: string
    ok: false
    requests: PmfReaderRequest[]
    works: PmfWork[]
  }
  | {
    branches: PmfBranch[]
    chapters: PmfChapter[]
    notice: string
    ok: true
    requests: PmfReaderRequest[]
    selection: CreatorWorksSelectionPatch
    works: PmfWork[]
  }

const defaultCreatorWorksLoadApiPort: CreatorWorksLoadApiPort = {
  listBranches: listCreatorBranches,
  listChapters: listCreatorChapters,
  listRequests: listCreatorRequests,
  listWorks: listCreatorWorks,
}

export function resolveCreatorWorksSelection(
  works: PmfWork[],
  branches: PmfBranch[],
  input: CreatorWorksLoadInput = {},
): CreatorWorksSelectionPatch {
  const workId = input.selectedWorkId || works[0]?.id || ''
  const selectedWork = works.find(work => work.id === workId) || works[0] || null
  const workBranches = selectedWork ? branches.filter(branch => branch.work_id === selectedWork.id) : []
  const selectedBranchId = input.selectedBranchId || workBranches[0]?.id || ''

  return {
    authorNotice: selectedWork?.author_notice || '',
    parentBranchId: workBranches.find(branch => branch.branch_type === 'main')?.id || 'none',
    selectedBranchId,
    selectedWorkId: selectedWork?.id || '',
  }
}

export async function runCreatorWorksLoad(
  input: CreatorWorksLoadInput = {},
  api: CreatorWorksLoadApiPort = defaultCreatorWorksLoadApiPort,
): Promise<RunCreatorWorksLoadResult> {
  const [workResult, branchResult, chapterResult, requestResult] = await Promise.all([
    api.listWorks(),
    api.listBranches(),
    api.listChapters(),
    api.listRequests(),
  ])

  const works = workResult.ok ? workResult.data : []
  const branches = branchResult.ok ? branchResult.data : []
  const chapters = chapterResult.ok ? chapterResult.data : []
  const requests = requestResult.ok ? requestResult.data : []
  const firstError = [workResult, branchResult, chapterResult, requestResult].find(result => !result.ok)

  if (firstError && !firstError.ok) {
    return {
      branches,
      chapters,
      notice: firstError.message,
      ok: false,
      requests,
      works,
    }
  }

  const selection = resolveCreatorWorksSelection(works, branches, input)

  return {
    branches,
    chapters,
    notice: selection.selectedWorkId ? '作品结构已更新。' : '暂无可管理作品。',
    ok: true,
    requests,
    selection,
    works,
  }
}
