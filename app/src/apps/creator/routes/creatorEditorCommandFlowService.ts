import type { PmfReaderRequest } from '@/features/pmf/types'
import {
  resolveEditorAssistAction,
  resolveReviewFix,
  resolveWritingCommand,
} from './creatorEditorAssistantController'
import {
  resolveEditorAssistCandidateAdoption,
  resolveEditorAssistCandidateBranch,
} from './creatorEditorCandidateController'
import {
  resolveEditorCandidateAdoptionStatePatch,
  resolveEditorCandidateBranchStatePatch,
  type CreatorEditorCandidateStatePatch,
} from './creatorEditorCandidatePatchController'
import {
  resolveBranchExperimentDecision,
  resolveStoryFlowStage,
  type CreatorEditorCommandPatch,
  type CreatorStoryFlowStageId,
} from './creatorEditorCommandController'
import {
  bindEditorCommandCandidateApply,
  bindEditorShortcut,
  type BindEditorCommandCandidateApplyInput,
  type BindEditorShortcutInput,
} from './creatorEditorCommandEventService'
import {
  resolveEditorCommandStatePatch,
  type CreatorEditorCommandStatePatch,
} from './creatorEditorCommandPatchController'
import {
  resolveChapterDirectionSelection,
  resolveChapterGoalConfirmation,
  resolveDraftGuideContinuation,
} from './creatorEditorSelectionController'
import {
  resolveAssistantSuggestionAcceptance,
  resolveEditorAssistDismissal,
  resolveGuideStepSelection,
  resolveKeepAsIfBranchAction,
  type CreatorEditorUserActionStatePatch,
} from './creatorEditorUserActionController'
import type {
  ChapterDirectionId,
  WritingGuideStep,
} from './creatorEditorViewModels'
import type {
  EditorAssistAction,
  EditorAssistCandidate,
  WritingCommandId,
} from './creatorEditorAssistantViewModels'

export type { CreatorEditorCommandPatch, CreatorStoryFlowStageId }

export interface EditorCommandFlowContext {
  assistantSuggestion: string
  content: string
  direction: ChapterDirectionId
  linkedRequest: PmfReaderRequest | null
}

interface ResolveEditorCommandPatchFlowInput {
  candidateTitle?: string
  context: EditorCommandFlowContext
  patch: CreatorEditorCommandPatch | null
  primaryLabel?: string
}

export function resolveEditorCommandPatchFlow({
  candidateTitle,
  context,
  patch,
  primaryLabel,
}: ResolveEditorCommandPatchFlowInput): CreatorEditorCommandStatePatch | null {
  return resolveEditorCommandStatePatch({
    ...context,
    candidateTitle,
    patch,
    primaryLabel,
  })
}

export function runEditorWritingCommandFlow({
  command,
  context,
}: {
  command: WritingCommandId
  context: EditorCommandFlowContext
}): CreatorEditorCommandStatePatch | null {
  return resolveEditorCommandPatchFlow({
    context,
    patch: resolveWritingCommand(command),
  })
}

export function runEditorReviewFixFlow({
  context,
  label,
}: {
  context: EditorCommandFlowContext
  label: string
}): CreatorEditorCommandStatePatch | null {
  return resolveEditorCommandPatchFlow({
    context,
    patch: resolveReviewFix(label),
  })
}

export function runEditorAssistActionFlow({
  action,
  context,
  noticeOverride,
}: {
  action: EditorAssistAction
  context: EditorCommandFlowContext
  noticeOverride?: string
}): CreatorEditorCommandStatePatch | null {
  return resolveEditorCommandPatchFlow({
    context,
    patch: resolveEditorAssistAction(action, noticeOverride),
  })
}

export function runEditorBranchExperimentFlow({
  context,
  decision,
  label,
}: {
  context: EditorCommandFlowContext
  decision: 'merge' | 'keep' | 'discard'
  label: string
}): CreatorEditorCommandStatePatch | null {
  return resolveEditorCommandPatchFlow({
    context,
    patch: resolveBranchExperimentDecision(label, decision),
  })
}

export function runEditorStoryFlowStageFlow({
  context,
  stage,
}: {
  context: EditorCommandFlowContext
  stage: CreatorStoryFlowStageId
}): CreatorEditorCommandStatePatch | null {
  return resolveEditorCommandPatchFlow({
    context,
    patch: resolveStoryFlowStage(stage),
  })
}

export function runEditorChapterDirectionSelectionFlow({
  context,
  direction,
}: {
  context: EditorCommandFlowContext
  direction: ChapterDirectionId
}): CreatorEditorCommandStatePatch | null {
  return resolveEditorCommandPatchFlow({
    context,
    patch: resolveChapterDirectionSelection(direction),
  })
}

export function runEditorChapterGoalConfirmationFlow({
  context,
  direction,
}: {
  context: EditorCommandFlowContext
  direction: ChapterDirectionId
}): CreatorEditorCommandStatePatch | null {
  return resolveEditorCommandPatchFlow({
    context,
    patch: resolveChapterGoalConfirmation(direction),
  })
}

export function runEditorDraftGuideContinuationFlow(
  context: EditorCommandFlowContext,
): CreatorEditorCommandStatePatch | null {
  return resolveEditorCommandPatchFlow({
    context,
    patch: resolveDraftGuideContinuation(),
  })
}

export function resolveEditorAssistCandidateAdoptionFlow({
  candidate,
  content,
}: {
  candidate: EditorAssistCandidate
  content: string
}): CreatorEditorCandidateStatePatch {
  return resolveEditorCandidateAdoptionStatePatch(
    resolveEditorAssistCandidateAdoption(candidate, content),
  )
}

export function resolveEditorAssistCandidateBranchFlow(): CreatorEditorCandidateStatePatch {
  return resolveEditorCandidateBranchStatePatch(resolveEditorAssistCandidateBranch())
}

export function resolveEditorAssistantSuggestionAcceptanceFlow({
  content,
  suggestion,
}: {
  content: string
  suggestion: string
}): CreatorEditorUserActionStatePatch {
  return resolveAssistantSuggestionAcceptance({
    content,
    suggestion,
  })
}

export function resolveEditorAssistDismissalFlow(): CreatorEditorUserActionStatePatch {
  return resolveEditorAssistDismissal()
}

export function resolveEditorGuideStepSelectionFlow(
  nextStep: WritingGuideStep,
): CreatorEditorUserActionStatePatch {
  return resolveGuideStepSelection(nextStep)
}

export function resolveEditorKeepAsIfBranchFlow(): CreatorEditorUserActionStatePatch {
  return resolveKeepAsIfBranchAction()
}

export function bindEditorCommandCandidateApplyFlow(input: BindEditorCommandCandidateApplyInput): () => void {
  return bindEditorCommandCandidateApply(input)
}

export function bindEditorShortcutFlow(input: BindEditorShortcutInput): () => void {
  return bindEditorShortcut(input)
}
