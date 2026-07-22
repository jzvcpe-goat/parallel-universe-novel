import type { PublishMode, WritingGuideStep } from './creatorEditorViewModels'
import type { EditorAssistCandidate } from './creatorEditorAssistantViewModels'
import { writingGuideStepLabel } from './creatorEditorSocraticViewModels'

export interface CreatorEditorUserActionStatePatch {
  content?: string
  editorAssistCandidate?: EditorAssistCandidate | null
  guideStep?: WritingGuideStep
  notice?: string
  publishMode?: PublishMode
}

interface ResolveAssistantSuggestionAcceptanceInput {
  content: string
  suggestion: string
}

export function resolveAssistantSuggestionAcceptance({
  content,
  suggestion,
}: ResolveAssistantSuggestionAcceptanceInput): CreatorEditorUserActionStatePatch {
  const trimmed = content.trimEnd()

  return {
    content: trimmed ? `${trimmed}\n\n${suggestion}` : suggestion,
    guideStep: 'draft',
    notice: '已补入创作助手建议；可以继续改写。',
  }
}

export function resolveEditorAssistDismissal(): CreatorEditorUserActionStatePatch {
  return {
    editorAssistCandidate: null,
    notice: '候选已收起，正文没有变化。',
  }
}

export function resolveGuideStepSelection(nextStep: WritingGuideStep): CreatorEditorUserActionStatePatch {
  return {
    guideStep: nextStep,
    notice: `已切到「${writingGuideStepLabel(nextStep)}」，这一轮只控制当前阶段。`,
  }
}

export function resolveKeepAsIfBranchAction(): CreatorEditorUserActionStatePatch {
  return {
    guideStep: 'scene',
    notice: '已切到 IF 支线候选；先保存草稿，再决定是否进入发布包确认。',
    publishMode: 'if',
  }
}
