import type {
  PublishMode,
  WritingGuideStep,
} from './creatorEditorViewModels'
import type {
  EditorAssistAction,
  EditorAssistCandidate,
  ReviewDockTab,
} from './creatorEditorAssistantViewModels'

export type CreatorCommandCandidateApplyMode = 'insert' | 'replace' | 'branch' | 'hold'

export interface CreatorCommandCandidateApplyInput {
  mode: CreatorCommandCandidateApplyMode
  candidateId: string
  candidateTitle: string
}

export interface CreatorEditorCandidateApplyResolution {
  activeWritingCommand?: never
  candidateAction?: EditorAssistAction
  candidateTitle?: string
  guideStep?: WritingGuideStep
  notice?: string
  primaryLabel?: string
  publishMode?: PublishMode
  reviewDockTab?: ReviewDockTab
}

export interface CreatorEditorCandidateAdoptionResolution {
  clearCandidate: boolean
  guideStep: WritingGuideStep
  notice: string
  title?: string
  content?: string
}

export function resolveCommandCandidateApply({
  mode,
  candidateId,
  candidateTitle,
}: CreatorCommandCandidateApplyInput): CreatorEditorCandidateApplyResolution | null {
  if (mode === 'branch') {
    return {
      publishMode: 'if',
      reviewDockTab: 'branch',
      guideStep: 'scene',
      notice: '候选已送到支线试写；主线不会被改动。',
    }
  }

  if (mode === 'hold') {
    return {
      notice: '候选已保留，正文没有变化。',
    }
  }

  const candidateAction: EditorAssistAction = mode === 'replace' || candidateId === 'rewrite-tone'
    ? 'temper'
    : candidateId === 'socratic-question'
      ? 'question'
      : 'complete'

  return {
    candidateAction,
    candidateTitle: `${candidateTitle} · 正文预览`,
    primaryLabel: mode === 'replace' ? '替换当前段落' : undefined,
    guideStep: 'draft',
    notice: mode === 'replace'
      ? '候选已送到正文区预览；确认前不会覆盖原段落。'
      : '候选已送到正文区预览；确认前正文不会变化。',
  }
}

export function resolveEditorAssistCandidateAdoption(
  candidate: EditorAssistCandidate,
  currentContent: string,
): CreatorEditorCandidateAdoptionResolution {
  if (candidate.id === 'question') {
    return {
      clearCandidate: true,
      guideStep: 'scene',
      notice: '这个追问已放入右侧创作导师，先回答再继续写。',
    }
  }

  if (candidate.id === 'title') {
    return {
      clearCandidate: true,
      guideStep: 'scene',
      notice: '已采用标题候选；它仍然只属于私密草稿。',
      title: candidate.preview,
    }
  }

  if (candidate.primaryLabel === '替换当前段落') {
    const paragraphs = currentContent.trimEnd().split(/\n{2,}/).filter(Boolean)
    return {
      clearCandidate: true,
      guideStep: 'draft',
      notice: '已替换当前段落；它仍然只是私密草稿。',
      content: paragraphs.length
        ? [...paragraphs.slice(0, -1), candidate.preview].join('\n\n')
        : candidate.preview,
    }
  }

  const trimmed = currentContent.trimEnd()
  return {
    clearCandidate: true,
    guideStep: 'draft',
    notice: '已插入候选正文；它仍然只是私密草稿。',
    content: trimmed ? `${trimmed}\n\n${candidate.preview}` : candidate.preview,
  }
}

export function resolveEditorAssistCandidateBranch(): CreatorEditorCandidateApplyResolution {
  return {
    publishMode: 'if',
    guideStep: 'scene',
    notice: '已标记为支线候选；先比较走向，再决定是否进入发布包确认。',
  }
}
