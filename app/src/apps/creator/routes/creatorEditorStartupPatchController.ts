import type { CreatorEditorBootstrapResult } from './creatorEditorRouteController'
import type { PublishMode, WritingGuideStep } from './creatorEditorViewModels'

export interface CreatorEditorStartupStatePatch {
  activeDraftRef?: string
  branchTitle?: string
  content?: string
  guideStep?: WritingGuideStep
  notice: string
  publishMode?: PublishMode
  selectedIfBranchId?: string
  selectedWorkId: string
  title?: string
}

interface CreatorEditorStartupPatchInput {
  bootstrap: CreatorEditorBootstrapResult
  currentBranchTitle: string
  currentSelectedWorkId: string
  currentTitle: string
}

export function resolveEditorStartupStatePatch({
  bootstrap,
  currentBranchTitle,
  currentSelectedWorkId,
  currentTitle,
}: CreatorEditorStartupPatchInput): CreatorEditorStartupStatePatch {
  const statePatch: CreatorEditorStartupStatePatch = {
    notice: bootstrap.notice,
    selectedWorkId: bootstrap.defaultDraft?.workId || currentSelectedWorkId || bootstrap.nextWorkId,
  }

  if (bootstrap.draftRestore) {
    statePatch.activeDraftRef = bootstrap.draftRestore.activeDraftRef
    statePatch.title = bootstrap.draftRestore.title
    statePatch.content = bootstrap.draftRestore.content
    statePatch.publishMode = bootstrap.draftRestore.publishMode
    statePatch.selectedIfBranchId = bootstrap.draftRestore.selectedIfBranchId
    statePatch.guideStep = bootstrap.draftRestore.guideStep
  }

  if (bootstrap.routeBranchRestore) {
    statePatch.publishMode = bootstrap.routeBranchRestore.publishMode
    statePatch.selectedIfBranchId = bootstrap.routeBranchRestore.selectedIfBranchId
  }

  if (bootstrap.routeChapterNumber && !bootstrap.draftRestore && !bootstrap.requestSeed) {
    statePatch.activeDraftRef = ''
    statePatch.content = ''
    statePatch.guideStep = 'intent'
    statePatch.title = `第 ${bootstrap.routeChapterNumber} 章`
  }

  if (bootstrap.requestSeed) {
    statePatch.title = currentTitle === '新章节'
      ? bootstrap.requestSeed.title
      : currentTitle
    statePatch.publishMode = bootstrap.requestSeed.publishMode
    statePatch.guideStep = bootstrap.requestSeed.guideStep
    statePatch.branchTitle = currentBranchTitle === '读者 IF 支线' || currentBranchTitle === '主线'
      ? bootstrap.requestSeed.branchTitle
      : currentBranchTitle
  }

  return statePatch
}
