import type { CreatorEditorCandidateStatePatch } from './creatorEditorCandidatePatchController'
import type { CreatorEditorCommandPatch } from './creatorEditorCommandController'
import type { CreatorEditorCommandStatePatch } from './creatorEditorCommandPatchController'
import type { CreatorEditorDraftStatePatch } from './creatorEditorDraftPatchController'
import type { CreatorEditorSettingAssetStatePatch } from './creatorEditorSettingAssetPatchController'
import type { CreatorEditorStartupDataPatch } from './creatorEditorStartupDataPatchController'
import type { CreatorEditorStartupStatePatch } from './creatorEditorStartupEffectService'
import type { CreatorEditorUserActionStatePatch } from './creatorEditorUserActionController'
import type {
  PublishMode,
  WritingGuideStep,
} from './creatorEditorViewModels'
import type {
  EditorAssistCandidate,
  ReviewDockTab,
  WritingCommandId,
} from './creatorEditorAssistantViewModels'

export interface EditorStartupStatePatchSetters {
  setActiveDraftRef(value: string): void
  setBranchTitle(value: string): void
  setContent(value: string): void
  setGuideStep(value: WritingGuideStep): void
  setNotice(value: string): void
  setPublishMode(value: PublishMode): void
  setSelectedIfBranchId(value: string): void
  setSelectedWorkId(value: string): void
  setTitle(value: string): void
}

export interface EditorStartupDataPatchSetters {
  setAuthorization(value: CreatorEditorStartupDataPatch['authorization']): void
  setBranches(value: CreatorEditorStartupDataPatch['branches']): void
  setChapters(value: CreatorEditorStartupDataPatch['chapters']): void
  setCreativeReminders(value: CreatorEditorStartupDataPatch['creativeReminders']): void
  setDrafts(value: CreatorEditorStartupDataPatch['drafts']): void
  setRecallSelections(value: CreatorEditorStartupDataPatch['recallSelections']): void
  setRequests(value: CreatorEditorStartupDataPatch['requests']): void
  setSettingAssets(value: CreatorEditorStartupDataPatch['settingAssets']): void
  setWorks(value: CreatorEditorStartupDataPatch['works']): void
}

export interface EditorCommandStatePatchSetters {
  setActiveWritingCommand(value: WritingCommandId): void
  setEditorAssistCandidate(value: EditorAssistCandidate): void
  setGuideStep(value: WritingGuideStep): void
  setNotice(value: string): void
  setPublishMode(value: PublishMode): void
  setReviewDockTab(value: ReviewDockTab): void
}

export interface EditorCandidateStatePatchSetters {
  applyCommandPatch(patch: CreatorEditorCommandPatch): void
  setContent(value: string): void
  setEditorAssistCandidate(value: EditorAssistCandidate | null): void
  setGuideStep(value: WritingGuideStep): void
  setNotice(value: string): void
  setTitle(value: string): void
}

export interface EditorDraftStatePatchSetters {
  setActiveDraftRef(value: string): void
  setActiveWritingCommand(value: WritingCommandId | null): void
  setContent(value: string): void
  setCreativeReminders(value: NonNullable<CreatorEditorDraftStatePatch['creativeReminders']>): void
  setDrafts(value: NonNullable<CreatorEditorDraftStatePatch['drafts']>): void
  setEditorAssistCandidate(value: EditorAssistCandidate | null): void
  setGuideStep(value: WritingGuideStep): void
  setNotice(value: string): void
  setPublishMode(value: PublishMode): void
  setSelectedIfBranchId(value: string): void
  setSelectedWorkId(value: string): void
  setTitle(value: string): void
}

export interface EditorUserActionStatePatchSetters {
  setContent(value: string): void
  setEditorAssistCandidate(value: EditorAssistCandidate | null): void
  setGuideStep(value: WritingGuideStep): void
  setNotice(value: string): void
  setPublishMode(value: PublishMode): void
}

export interface EditorSettingAssetStatePatchSetters {
  setGuideStep(value: WritingGuideStep): void
  setNotice(value: string): void
  setSettingAssets(value: NonNullable<CreatorEditorSettingAssetStatePatch['settingAssets']>): void
}

export function applyEditorStartupStatePatchToReact(
  statePatch: CreatorEditorStartupStatePatch,
  setters: EditorStartupStatePatchSetters,
) {
  setters.setSelectedWorkId(statePatch.selectedWorkId)
  if (statePatch.activeDraftRef) setters.setActiveDraftRef(statePatch.activeDraftRef)
  if (typeof statePatch.title === 'string') setters.setTitle(statePatch.title)
  if (typeof statePatch.content === 'string') setters.setContent(statePatch.content)
  if (statePatch.publishMode) setters.setPublishMode(statePatch.publishMode)
  if (statePatch.selectedIfBranchId) setters.setSelectedIfBranchId(statePatch.selectedIfBranchId)
  if (statePatch.guideStep) setters.setGuideStep(statePatch.guideStep)
  if (typeof statePatch.branchTitle === 'string') setters.setBranchTitle(statePatch.branchTitle)
  setters.setNotice(statePatch.notice)
}

export function applyEditorStartupDataPatchToReact(
  dataPatch: CreatorEditorStartupDataPatch,
  setters: EditorStartupDataPatchSetters,
) {
  setters.setDrafts(dataPatch.drafts)
  setters.setRecallSelections(dataPatch.recallSelections)
  setters.setSettingAssets(dataPatch.settingAssets)
  setters.setRequests(dataPatch.requests)
  setters.setWorks(dataPatch.works)
  setters.setBranches(dataPatch.branches)
  setters.setChapters(dataPatch.chapters)
  setters.setAuthorization(dataPatch.authorization)
  setters.setCreativeReminders(dataPatch.creativeReminders)
}

export function applyEditorCommandStatePatchToReact(
  statePatch: CreatorEditorCommandStatePatch | null,
  setters: EditorCommandStatePatchSetters,
) {
  if (!statePatch) return
  if (statePatch.activeWritingCommand) setters.setActiveWritingCommand(statePatch.activeWritingCommand)
  if (statePatch.reviewDockTab) setters.setReviewDockTab(statePatch.reviewDockTab)
  if (statePatch.publishMode) setters.setPublishMode(statePatch.publishMode)
  if (statePatch.guideStep) setters.setGuideStep(statePatch.guideStep)
  if (statePatch.editorAssistCandidate) setters.setEditorAssistCandidate(statePatch.editorAssistCandidate)
  if (statePatch.notice) setters.setNotice(statePatch.notice)
}

export function applyEditorCandidateStatePatchToReact(
  statePatch: CreatorEditorCandidateStatePatch | null,
  setters: EditorCandidateStatePatchSetters,
) {
  if (!statePatch) return
  if (statePatch.commandPatch) setters.applyCommandPatch(statePatch.commandPatch)
  if (typeof statePatch.title === 'string') setters.setTitle(statePatch.title)
  if (typeof statePatch.content === 'string') setters.setContent(statePatch.content)
  if (statePatch.guideStep) setters.setGuideStep(statePatch.guideStep)
  if (statePatch.notice) setters.setNotice(statePatch.notice)
  if (statePatch.clearEditorAssistCandidate) setters.setEditorAssistCandidate(null)
}

export function applyEditorDraftStatePatchToReact(
  statePatch: CreatorEditorDraftStatePatch,
  setters: EditorDraftStatePatchSetters,
) {
  setters.setNotice(statePatch.notice)
  if (statePatch.creativeReminders) setters.setCreativeReminders(statePatch.creativeReminders)
  if (statePatch.activeDraftRef !== undefined) setters.setActiveDraftRef(statePatch.activeDraftRef)
  if (statePatch.drafts) setters.setDrafts(statePatch.drafts)
  if (typeof statePatch.title === 'string') setters.setTitle(statePatch.title)
  if (typeof statePatch.content === 'string') setters.setContent(statePatch.content)
  if (statePatch.selectedWorkId) setters.setSelectedWorkId(statePatch.selectedWorkId)
  if (statePatch.publishMode) setters.setPublishMode(statePatch.publishMode)
  if (statePatch.selectedIfBranchId) setters.setSelectedIfBranchId(statePatch.selectedIfBranchId)
  if (statePatch.guideStep) setters.setGuideStep(statePatch.guideStep)
  if (statePatch.clearEditorAssistCandidate) setters.setEditorAssistCandidate(null)
  if (statePatch.clearActiveWritingCommand) setters.setActiveWritingCommand(null)
}

export function applyEditorUserActionStatePatchToReact(
  statePatch: CreatorEditorUserActionStatePatch,
  setters: EditorUserActionStatePatchSetters,
) {
  if (typeof statePatch.content === 'string') setters.setContent(statePatch.content)
  if (statePatch.editorAssistCandidate !== undefined) setters.setEditorAssistCandidate(statePatch.editorAssistCandidate)
  if (statePatch.guideStep) setters.setGuideStep(statePatch.guideStep)
  if (statePatch.notice) setters.setNotice(statePatch.notice)
  if (statePatch.publishMode) setters.setPublishMode(statePatch.publishMode)
}

export function applyEditorSettingAssetStatePatchToReact(
  statePatch: CreatorEditorSettingAssetStatePatch,
  setters: EditorSettingAssetStatePatchSetters,
) {
  setters.setNotice(statePatch.notice)
  if (statePatch.settingAssets) setters.setSettingAssets(statePatch.settingAssets)
  if (statePatch.guideStep) setters.setGuideStep(statePatch.guideStep)
}
