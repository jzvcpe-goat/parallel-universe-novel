import {
  pmfMainBranchId,
  type PmfBranch,
  type PmfChapter,
  type PmfLocalDraft,
  type PmfLocalSettingAsset,
  type PmfReaderRequest,
  type PmfWork,
} from '@/features/pmf/types'
import type { PublishMode } from './creatorEditorViewModels'
import { settingAssetSummary } from './creatorEditorSocraticViewModels'

interface EditorIfBranchOption {
  label: string
  value: string
}

export interface EditorDestinationControllerInput {
  activeDraftRef: string
  authorization: { authorized?: boolean } | null
  branches: PmfBranch[]
  branchTitle: string
  chapters: PmfChapter[]
  content: string
  drafts: PmfLocalDraft[]
  publishMode: PublishMode
  selectedIfBranchId: string
  selectedRequest: PmfReaderRequest | null
  selectedWorkId: string
  settingAssets: PmfLocalSettingAsset[]
  title: string
  works: PmfWork[]
}

export function branchIdForPublish(workId: string, mode: PublishMode, request: PmfReaderRequest | null) {
  if (mode === 'main') return pmfMainBranchId(workId)
  if (request?.branch_id && !request.branch_id.endsWith(':main')) return request.branch_id
  const suffix = (request?.id || 'manual').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 18) || 'manual'
  return `${workId}:if:${suffix}`
}

export function resolveEditorDestinationContext({
  activeDraftRef,
  authorization,
  branches,
  branchTitle,
  chapters,
  content,
  drafts,
  publishMode,
  selectedIfBranchId,
  selectedRequest,
  selectedWorkId,
  settingAssets,
  title,
  works,
}: EditorDestinationControllerInput) {
  const workMap = new Map(works.map(work => [work.id, work]))
  const branchMap = new Map(branches.map(branch => [branch.id, branch]))
  const selectedWork = selectedWorkId ? workMap.get(selectedWorkId) || null : null
  const currentWorkBranches = branches.filter(branch => branch.work_id === selectedWorkId)
  const currentWorkChapters = chapters.filter(chapter => chapter.work_id === selectedWorkId)
  const mainBranch = currentWorkBranches.find(branch => branch.branch_type === 'main') || null
  const ifBranches = currentWorkBranches.filter(branch => branch.branch_type !== 'main')
  const resolvedBranchId = selectedWorkId
    ? publishMode === 'main'
      ? mainBranch?.id || pmfMainBranchId(selectedWorkId)
      : selectedIfBranchId !== 'new-if-branch'
        ? selectedIfBranchId
        : branchIdForPublish(selectedWorkId, 'if', selectedRequest)
    : ''
  const resolvedBranch = branchMap.get(resolvedBranchId) || null
  const editorDestinationLabel = `${selectedWork ? selectedWork.title : '未选择作品'} / ${resolvedBranch?.title || (publishMode === 'main' ? '主线连载' : branchTitle)}`
  const latestChapter = [...chapters]
    .filter(chapter => chapter.work_id === selectedWorkId && chapter.branch_id === resolvedBranchId)
    .sort((a, b) => b.chapter_no - a.chapter_no)[0] || null
  const requestChapter = selectedRequest?.chapter_id
    ? chapters.find(chapter => chapter.id === selectedRequest.chapter_id) || null
    : null
  const titleReady = Boolean(title.trim())
  const contentReady = Boolean(content.trim())
  const destinationReady = Boolean(selectedWorkId && resolvedBranchId)
  const authorReady = authorization?.authorized === true
  const canSaveDraft = authorReady && titleReady && contentReady && destinationReady
  const canEnterPublishCheck = canSaveDraft
  const activeDraft = activeDraftRef
    ? drafts.find(draft => draft.localDraftRef === activeDraftRef) || null
    : null
  const currentSettingAssets = selectedWorkId
    ? settingAssets.filter(asset => asset.workId === selectedWorkId)
    : settingAssets
  const settingAssetSummaries = currentSettingAssets.map(settingAssetSummary)
  const ifBranchOptions: EditorIfBranchOption[] = [
    { value: 'new-if-branch', label: '新建 IF 支线' },
    ...ifBranches.map(branch => ({ value: branch.id, label: `${branch.title} · ${branch.status === 'published' ? '已发布' : '未公开'}` })),
    ...(selectedIfBranchId !== 'new-if-branch' && !ifBranches.some(branch => branch.id === selectedIfBranchId)
      ? [{ value: selectedIfBranchId, label: '当前支线' }]
      : []),
  ]
  const editorBlockers = [
    !authorReady ? '作者状态' : '',
    !destinationReady ? '作品和发布线' : '',
    !titleReady ? '章节标题' : '',
    !contentReady ? '正文' : '',
  ].filter(Boolean)

  return {
    activeDraft,
    authorReady,
    canEnterPublishCheck,
    canSaveDraft,
    contentReady,
    currentSettingAssets,
    currentWorkBranchCount: currentWorkBranches.length,
    currentWorkChapterCount: currentWorkChapters.length,
    destinationReady,
    editorBlockers,
    editorDestinationLabel,
    ifBranchOptions,
    latestChapter,
    requestChapter,
    resolvedBranch,
    resolvedBranchId,
    selectedWork,
    settingAssetSummaries,
    titleReady,
    workMap,
  }
}
