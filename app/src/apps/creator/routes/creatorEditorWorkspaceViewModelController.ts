import {
  type PmfBranch,
  type PmfChapter,
  type PmfLocalDraft,
  type PmfLocalSettingAsset,
  type PmfReaderRequest,
  type PmfWork,
} from '@/features/pmf/types'
import {
  workTitleFromMap,
  type ChapterDirectionId,
  type PublishMode,
  type WritingGuideStep,
} from './creatorEditorViewModels'
import { buildEditorCompletion } from './creatorEditorAssistantViewModels'
import { buildQualityIssues } from './creatorEditorQualityViewModels'
import { buildSocraticPlanStages } from './creatorEditorSocraticViewModels'
import { buildStoryMapItems } from './creatorEditorStoryMapViewModels'
import {
  buildBranchSandboxViewModel,
  buildFlightRecorderViewModel,
  buildStateDiffViewModel,
} from './creatorEditorReviewImpactViewModels'

export interface EditorWorkspaceViewModelInput {
  activeDraft: PmfLocalDraft | null
  branchTitle: string
  chapterDirection: ChapterDirectionId
  content: string
  contentReady: boolean
  currentWorkBranchCount: number
  currentWorkChapterCount: number
  destinationReady: boolean
  guideStep: WritingGuideStep
  latestChapter: PmfChapter | null
  publishMode: PublishMode
  requestChapter: PmfChapter | null
  resolvedBranch: PmfBranch | null
  selectedRequest: PmfReaderRequest | null
  selectedWork: PmfWork | null
  selectedWorkId: string
  settingAssets: PmfLocalSettingAsset[]
  title: string
  titleReady: boolean
  workMap: Map<string, PmfWork>
}

export function buildEditorWorkspaceViewModel({
  activeDraft,
  branchTitle,
  chapterDirection,
  content,
  contentReady,
  currentWorkBranchCount,
  currentWorkChapterCount,
  destinationReady,
  guideStep,
  latestChapter,
  publishMode,
  requestChapter,
  resolvedBranch,
  selectedRequest,
  selectedWork,
  selectedWorkId,
  settingAssets,
  title,
  titleReady,
  workMap,
}: EditorWorkspaceViewModelInput) {
  const activeBranchTitle = resolvedBranch?.title || branchTitle
  const assistantSuggestion = buildEditorCompletion(selectedRequest, content)
  const socraticPlanStages = buildSocraticPlanStages({
    activeStep: guideStep,
    assets: settingAssets,
    linkedRequest: selectedRequest,
    titleReady,
    contentReady,
    destinationReady,
  })
  const storyMapItems = buildStoryMapItems({
    work: selectedWork,
    branch: resolvedBranch,
    latestChapter,
    requestChapter,
    linkedRequest: selectedRequest,
    activeDraft,
    content,
    direction: chapterDirection,
    branchCount: currentWorkBranchCount,
    chapterCount: currentWorkChapterCount,
  })
  const reviewQualityIssues = buildQualityIssues({
    content,
    title,
    destinationReady,
    linkedRequest: selectedRequest,
  })
  const reviewStateDiff = buildStateDiffViewModel({
    selectedWorkId,
    workTitle: selectedWorkId ? workTitleFromMap(selectedWorkId, workMap) : '未选择作品',
    direction: chapterDirection,
    latestChapter,
    linkedRequest: selectedRequest,
    publishMode,
    branchTitle: activeBranchTitle,
  })
  const reviewBranchSandbox = buildBranchSandboxViewModel({
    publishMode,
    branchTitle: activeBranchTitle,
    linkedRequest: selectedRequest,
    direction: chapterDirection,
    latestChapter,
    contentReady,
  })
  const reviewFlightRecorder = buildFlightRecorderViewModel({
    linkedRequest: selectedRequest,
    direction: chapterDirection,
    contentReady,
    titleReady,
    destinationReady,
  })

  return {
    assistantSuggestion,
    reviewBranchSandbox,
    reviewFlightRecorder,
    reviewQualityIssues,
    reviewStateDiff,
    socraticPlanStages,
    storyMapItems,
  }
}
