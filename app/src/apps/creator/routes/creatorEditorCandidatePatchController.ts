import type { CreatorEditorCommandPatch } from './creatorEditorCommandController'
import type { CreatorEditorCandidateAdoptionResolution } from './creatorEditorCandidateController'
import type { WritingGuideStep } from './creatorEditorViewModels'

export interface CreatorEditorCandidateStatePatch {
  clearEditorAssistCandidate?: true
  commandPatch?: CreatorEditorCommandPatch
  content?: string
  guideStep?: WritingGuideStep
  notice?: string
  title?: string
}

export function resolveEditorCandidateAdoptionStatePatch(
  resolution: CreatorEditorCandidateAdoptionResolution,
): CreatorEditorCandidateStatePatch {
  return {
    clearEditorAssistCandidate: resolution.clearCandidate ? true : undefined,
    content: resolution.content,
    guideStep: resolution.guideStep,
    notice: resolution.notice,
    title: resolution.title,
  }
}

export function resolveEditorCandidateBranchStatePatch(
  commandPatch: CreatorEditorCommandPatch,
): CreatorEditorCandidateStatePatch {
  return {
    clearEditorAssistCandidate: true,
    commandPatch,
  }
}
