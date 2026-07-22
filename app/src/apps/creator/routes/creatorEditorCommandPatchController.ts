import type { PmfReaderRequest } from '@/features/pmf/types'
import type { CreatorEditorCandidateApplyResolution } from './creatorEditorCandidateController'
import type { CreatorEditorCommandPatch } from './creatorEditorCommandController'
import {
  type ChapterDirectionId,
  type PublishMode,
  type WritingGuideStep,
} from './creatorEditorViewModels'
import {
  buildEditorAssistCandidate,
  type EditorAssistCandidate,
  type ReviewDockTab,
  type WritingCommandId,
} from './creatorEditorAssistantViewModels'

interface ResolveEditorCommandStatePatchInput {
  assistantSuggestion: string
  candidateTitle?: string
  content: string
  direction: ChapterDirectionId
  linkedRequest: PmfReaderRequest | null
  patch: CreatorEditorCommandPatch | null
  primaryLabel?: string
}

interface ResolveEditorCommandCandidateStatePatchInput {
  assistantSuggestion: string
  content: string
  direction: ChapterDirectionId
  linkedRequest: PmfReaderRequest | null
  resolution: CreatorEditorCandidateApplyResolution | null
}

export interface CreatorEditorCommandStatePatch {
  activeWritingCommand?: WritingCommandId
  editorAssistCandidate?: EditorAssistCandidate
  guideStep?: WritingGuideStep
  notice?: string
  publishMode?: PublishMode
  reviewDockTab?: ReviewDockTab
}

function noticeForAssistAction(action: NonNullable<CreatorEditorCommandPatch['assistAction']>): string {
  return action === 'question'
    ? '已生成一个关键追问；先回答再继续写会更稳。'
    : '已生成一条正文候选；确认前不会改变草稿。'
}

export function resolveEditorCommandStatePatch({
  assistantSuggestion,
  candidateTitle,
  content,
  direction,
  linkedRequest,
  patch,
  primaryLabel,
}: ResolveEditorCommandStatePatchInput): CreatorEditorCommandStatePatch | null {
  if (!patch) return null

  const statePatch: CreatorEditorCommandStatePatch = {
    activeWritingCommand: patch.activeWritingCommand,
    guideStep: patch.guideStep,
    notice: patch.notice,
    publishMode: patch.publishMode,
    reviewDockTab: patch.reviewDockTab,
  }

  if (!patch.assistAction) {
    return statePatch
  }

  const candidate = buildEditorAssistCandidate({
    action: patch.assistAction,
    suggestion: assistantSuggestion,
    content,
    direction,
    linkedRequest,
  })

  return {
    ...statePatch,
    editorAssistCandidate: {
      ...candidate,
      title: candidateTitle || candidate.title,
      primaryLabel: primaryLabel || candidate.primaryLabel,
    },
    notice: patch.notice || noticeForAssistAction(patch.assistAction),
  }
}

export function resolveEditorCommandCandidateStatePatch({
  assistantSuggestion,
  content,
  direction,
  linkedRequest,
  resolution,
}: ResolveEditorCommandCandidateStatePatchInput): CreatorEditorCommandStatePatch | null {
  if (!resolution) return null

  return resolveEditorCommandStatePatch({
    assistantSuggestion,
    candidateTitle: resolution.candidateTitle,
    content,
    direction,
    linkedRequest,
    patch: {
      assistAction: resolution.candidateAction,
      guideStep: resolution.guideStep,
      notice: resolution.notice,
      publishMode: resolution.publishMode,
      reviewDockTab: resolution.reviewDockTab,
    },
    primaryLabel: resolution.primaryLabel,
  })
}
