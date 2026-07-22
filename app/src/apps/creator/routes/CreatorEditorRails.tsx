import { Plus } from 'lucide-react'
import { CreatorSelect } from '@/components/creator/CreatorRouteControls'
import {
  CreatorDestinationPanel,
  CreatorBundleReadinessPanel,
} from '@/components/creator/workspace/CreatorDestinationPanels'
import {
  CreatorAuthorStatusPanel,
  CreatorCanonCommitBar,
} from '@/components/creator/workspace/CreatorCommitPanels'
import {
  CreatorReaderWishPanel,
  CreatorSessionRail,
  CreatorStoryMap,
} from '@/components/creator/workspace/CreatorStoryContextPanels'
import { CreatorAgentWritingAssistantPanel } from '@/components/creator/workspace/CreatorAgentAssistantPanels'
import {
  CreatorEditorAssistPanel,
  CreatorWritingCommandShelf,
} from '@/components/creator/workspace/CreatorInlineAssistantPanels'
import { CreatorEditorDecisionQueuePanel } from '@/components/creator/workspace/CreatorDecisionPanels'
import {
  CreatorCollapsibleOutline,
  CreatorPrivateDraftPanel,
} from '@/components/creator/workspace/CreatorPlanningPanels'
import { CreatorCreativeReviewDock } from '@/components/creator/workspace/CreatorReviewDock'
import { CreatorMissionProgressRail } from '@/components/creator/workspace/CreatorProgressPanels'
import {
  CreatorLocalSettingLibrary,
  CreatorSocraticPlanBoard,
} from '@/components/creator/workspace/CreatorSocraticPanels'
import { Input } from '@/components/ui/input'
import type { PmfChapter, PmfReaderRequest, PmfWork } from '@/features/pmf/types'
import type { CreativeReminder } from '@/local-db/schema'
import { requestStatusLabel, type CreatorAuthorizationStatus } from '@/lib/pmfSupabase'
import { latestDateLabel, readerWishTypeLabel, statusTone } from '../creatorViewHelpers'
import {
  chapterDirectionLabel,
  workTitleFromMap,
  type ChapterDirectionId,
  type PublishMode,
  type WritingGuideStep,
} from './creatorEditorViewModels'
import {
  workspaceAssistCandidate,
  workspaceAssistCurrentFocus,
  workspaceAssistFocus,
  workspaceAssistProgress,
  writingCommandItems,
  type EditorAssistCandidate,
  type ReviewDockTab,
  type WritingCommandId,
} from './creatorEditorAssistantViewModels'

type SessionGroups = Parameters<typeof CreatorSessionRail>[0]['groups']
type StoryMapItems = Parameters<typeof CreatorStoryMap>[0]['items']
type PrivateDraftItems = Parameters<typeof CreatorPrivateDraftPanel>[0]['items']
type SocraticPlanStages = Parameters<typeof CreatorSocraticPlanBoard>[0]['stages']
type SettingAssetSummaries = Parameters<typeof CreatorLocalSettingLibrary>[0]['assets']
type ReviewQualityIssues = Parameters<typeof CreatorCreativeReviewDock>[0]['qualityIssues']
type ReviewStateDiff = Parameters<typeof CreatorCreativeReviewDock>[0]['stateDiff']
type ReviewBranchSandbox = Parameters<typeof CreatorCreativeReviewDock>[0]['branchSandbox']
type ReviewFlightRecorder = Parameters<typeof CreatorCreativeReviewDock>[0]['flightRecorder']

export interface CreatorEditorPublishHandoffProps {
  titleReady: boolean
  contentReady: boolean
  destinationReady: boolean
  hasLinkedEcho: boolean
  directionLabel: string
  destinationLabel: string
  blockers: string[]
  saveDisabled: boolean
  publishDisabled: boolean
  saveLoading: boolean
  publishLoading: boolean
  saveLabel: string
  publishLabel: string
  onSaveDraft: () => void
  onKeepBranch: () => void
  onEnterPublishCheck: () => void
}

export function CreatorEditorPublishHandoff({
  titleReady,
  contentReady,
  destinationReady,
  hasLinkedEcho,
  directionLabel,
  destinationLabel,
  blockers,
  saveDisabled,
  publishDisabled,
  saveLoading,
  publishLoading,
  saveLabel,
  publishLabel,
  onSaveDraft,
  onKeepBranch,
  onEnterPublishCheck,
}: CreatorEditorPublishHandoffProps) {
  return (
    <CreatorCanonCommitBar
      titleReady={titleReady}
      contentReady={contentReady}
      destinationReady={destinationReady}
      hasLinkedEcho={hasLinkedEcho}
      directionLabel={directionLabel}
      destinationLabel={destinationLabel}
      blockers={blockers}
      saveDisabled={saveDisabled}
      publishDisabled={publishDisabled}
      saveLoading={saveLoading}
      publishLoading={publishLoading}
      saveLabel={saveLabel}
      publishLabel={publishLabel}
      onSaveDraft={onSaveDraft}
      onKeepBranch={onKeepBranch}
      onEnterPublishCheck={onEnterPublishCheck}
    />
  )
}

export interface CreatorEditorLeftRailProps {
  sessionGroups: SessionGroups
  storyMapItems: StoryMapItems
  linkedCreativeReminder: CreativeReminder | null
  selectedRequest: PmfReaderRequest | null
  requestChapter: PmfChapter | null
  workMap: Map<string, PmfWork>
  loading: boolean
  authorReady: boolean
  authorization: CreatorAuthorizationStatus | null
  onStartFreshDraft: () => void
}

export function CreatorEditorLeftRail({
  sessionGroups,
  storyMapItems,
  linkedCreativeReminder,
  selectedRequest,
  requestChapter,
  workMap,
  loading,
  authorReady,
  authorization,
  onStartFreshDraft,
}: CreatorEditorLeftRailProps) {
  return (
    <>
      <CreatorSessionRail
        title="创作记录"
        description="从草稿、读者愿望或最近章节继续。"
        actionLabel="新建"
        actionIcon={<Plus size={14} />}
        groups={sessionGroups}
        onAction={onStartFreshDraft}
      />
      <CreatorStoryMap
        title="故事地图"
        badgeLabel="作品线索"
        items={storyMapItems}
      />
      <CreatorReaderWishPanel
        title="读者愿望"
        statusLabel={linkedCreativeReminder ? '本机提醒' : selectedRequest ? requestStatusLabel(selectedRequest.status) : undefined}
        statusVariant={selectedRequest ? statusTone(selectedRequest.status) : undefined}
        typeLabel={selectedRequest ? readerWishTypeLabel(selectedRequest.request_type) : undefined}
        workTitle={selectedRequest ? workTitleFromMap(selectedRequest.work_id, workMap) : undefined}
        requestText={selectedRequest
          ? linkedCreativeReminder
            ? `${selectedRequest.request_text}\n\n${linkedCreativeReminder.authorNote}`
            : selectedRequest.request_text
          : undefined}
        heatValue={selectedRequest?.vote_count}
        statusValue={linkedCreativeReminder ? '已进入写作台' : selectedRequest ? requestStatusLabel(selectedRequest.status) : undefined}
        submittedAt={selectedRequest ? latestDateLabel(selectedRequest.created_at) : undefined}
        anchorTitle={requestChapter?.title}
        emptyTitle="没有挂接请求"
        emptyDescription="可以先写独立章节；需要回应读者时，再从外界回声进入。"
      />
      <CreatorAuthorStatusPanel
        title="作者状态"
        stateLabel={loading ? '正在确认作者状态。' : authorReady ? '当前作者可使用创作端。' : '当前作者状态待确认。'}
        boundaryCopy="私密草稿进入发布检查前不会公开。"
        ready={authorReady}
        openedAt={authorization?.createdAt ? latestDateLabel(authorization.createdAt) : undefined}
      />
    </>
  )
}

export interface CreatorEditorRightRailProps {
  editorAssistCandidate: EditorAssistCandidate | null
  titleReady: boolean
  contentReady: boolean
  destinationReady: boolean
  chapterDirection: ChapterDirectionId
  selectedRequest: PmfReaderRequest | null
  guideStep: WritingGuideStep
  content: string
  notice: string
  socraticPlanStages: SocraticPlanStages
  settingAssetSummaries: SettingAssetSummaries
  activeWritingCommand: WritingCommandId | null
  selectedWorkId: string
  works: PmfWork[]
  publishMode: PublishMode
  selectedIfBranchId: string
  ifBranchOptions: Array<{ value: string; label: string }>
  branchTitle: string
  editorDestinationLabel: string
  canSaveDraft: boolean
  authorReady: boolean
  draftAction: 'save' | 'publish' | null
  editorBlockers: string[]
  title: string
  reviewDockTab: ReviewDockTab
  reviewQualityIssues: ReviewQualityIssues
  reviewStateDiff: ReviewStateDiff
  reviewBranchSandbox: ReviewBranchSandbox
  reviewFlightRecorder: ReviewFlightRecorder
  privateDraftItems: PrivateDraftItems
  onApplyEditorAssistCandidate: () => void
  onKeepEditorAssistAsBranch: () => void
  onDismissEditorAssist: () => void
  onRunWritingCommand: (command: WritingCommandId) => void
  onShowReview: () => void
  onShowRecord: () => void
  onSaveDraft: () => void
  onEnterPublishCheck: () => void
  onGuideStepChange: (step: WritingGuideStep) => void
  onCaptureAsset: () => void
  onSelectedWorkChange: (workId: string) => void
  onPublishModeChange: (mode: PublishMode) => void
  onSelectedIfBranchChange: (branchId: string) => void
  onBranchTitleChange: (title: string) => void
  onReviewDockTabChange: (tab: ReviewDockTab) => void
  onApplyReviewFix: (label: string) => void
  onDecideBranchExperiment: (label: string, decision: 'merge' | 'keep' | 'discard') => void
}

export function CreatorEditorRightRail({
  editorAssistCandidate,
  titleReady,
  contentReady,
  destinationReady,
  chapterDirection,
  selectedRequest,
  guideStep,
  content,
  notice,
  socraticPlanStages,
  settingAssetSummaries,
  activeWritingCommand,
  selectedWorkId,
  works,
  publishMode,
  selectedIfBranchId,
  ifBranchOptions,
  branchTitle,
  editorDestinationLabel,
  canSaveDraft,
  authorReady,
  draftAction,
  editorBlockers,
  title,
  reviewDockTab,
  reviewQualityIssues,
  reviewStateDiff,
  reviewBranchSandbox,
  reviewFlightRecorder,
  privateDraftItems,
  onApplyEditorAssistCandidate,
  onKeepEditorAssistAsBranch,
  onDismissEditorAssist,
  onRunWritingCommand,
  onShowReview,
  onShowRecord,
  onSaveDraft,
  onEnterPublishCheck,
  onGuideStepChange,
  onCaptureAsset,
  onSelectedWorkChange,
  onPublishModeChange,
  onSelectedIfBranchChange,
  onBranchTitleChange,
  onReviewDockTabChange,
  onApplyReviewFix,
  onDecideBranchExperiment,
}: CreatorEditorRightRailProps) {
  return (
    <>
      {editorAssistCandidate ? (
        <CreatorEditorAssistPanel
          className="creator-editor-assist-panel-rail"
          candidate={workspaceAssistCandidate(editorAssistCandidate)}
          currentFocus={workspaceAssistCurrentFocus({ titleReady, contentReady, destinationReady })}
          focusItems={workspaceAssistFocus({
            direction: chapterDirection,
            linkedRequest: selectedRequest,
            activeStep: guideStep,
          })}
          progressItems={workspaceAssistProgress({
            linkedRequest: selectedRequest,
            contentReady,
            titleReady,
            destinationReady,
            activeStep: guideStep,
          })}
          actions={[]}
          onApply={onApplyEditorAssistCandidate}
          onKeepBranch={onKeepEditorAssistAsBranch}
          onDismiss={onDismissEditorAssist}
        />
      ) : null}
      <CreatorAgentWritingAssistantPanel
        content={content}
        directionLabel={chapterDirectionLabel(chapterDirection)}
        linkedRequestText={selectedRequest?.request_text}
        titleReady={titleReady}
        contentReady={contentReady}
        destinationReady={destinationReady}
        notice={notice}
        onComplete={() => onRunWritingCommand('complete')}
        onTemper={() => onRunWritingCommand('temper')}
        onQuestion={() => onRunWritingCommand('question')}
        onOpenState={() => onRunWritingCommand('state')}
        onOpenBranch={() => onRunWritingCommand('sandbox')}
        onShowReview={onShowReview}
        onShowRecord={onShowRecord}
        onSaveDraft={onSaveDraft}
        onEnterPublishCheck={onEnterPublishCheck}
        compact={Boolean(editorAssistCandidate)}
      />
      <CreatorSocraticPlanBoard
        stages={socraticPlanStages}
        activeStageId={guideStep}
        onStageSelect={stageId => onGuideStepChange(stageId as WritingGuideStep)}
        onCaptureAsset={onCaptureAsset}
      />
      <CreatorLocalSettingLibrary
        assets={settingAssetSummaries}
        onCreateAsset={onCaptureAsset}
      />
      <CreatorCollapsibleOutline title="快捷动作" description="可选">
        <CreatorWritingCommandShelf
          commands={writingCommandItems({ contentReady, titleReady, destinationReady })}
          activeCommand={activeWritingCommand}
          onRun={command => onRunWritingCommand(command as WritingCommandId)}
        />
      </CreatorCollapsibleOutline>
      <CreatorDestinationPanel
        title="发布去向"
        description="先确定作品和章节线，草稿才可以进入发布检查。"
        summary={editorDestinationLabel}
      >
        <label className="creator-destination-field grid gap-2 text-xs text-[var(--creator-text-dim)]">
          作品
          <CreatorSelect
            value={selectedWorkId || 'none'}
            onValueChange={nextWorkId => onSelectedWorkChange(nextWorkId === 'none' ? '' : nextWorkId)}
            className="creator-destination-control h-9 border-[var(--creator-border)] bg-[var(--creator-surface)] text-[var(--creator-text)]"
            options={[
              { value: 'none', label: '选择作品' },
              ...works.map(work => ({ value: work.id, label: work.title })),
            ]}
          />
        </label>
        <label className="creator-destination-field grid gap-2 text-xs text-[var(--creator-text-dim)]">
          章节去向
          <CreatorSelect
            value={publishMode}
            onValueChange={value => onPublishModeChange(value as PublishMode)}
            className="creator-destination-control h-9 border-[var(--creator-border)] bg-[var(--creator-surface)] text-[var(--creator-text)]"
            options={[
              { value: 'main', label: '主线连载' },
              { value: 'if', label: 'IF 支线' },
            ]}
          />
        </label>
        {publishMode === 'if' ? (
          <>
            <label className="creator-destination-field grid gap-2 text-xs text-[var(--creator-text-dim)]">
              支线
              <CreatorSelect
                value={selectedIfBranchId}
                onValueChange={onSelectedIfBranchChange}
                className="creator-destination-control h-9 border-[var(--creator-border)] bg-[var(--creator-surface)] text-[var(--creator-text)]"
                options={ifBranchOptions}
              />
            </label>
            {selectedIfBranchId === 'new-if-branch' ? (
              <label className="creator-destination-field creator-destination-field-wide grid gap-2 text-xs text-[var(--creator-text-dim)]">
                新支线标题
                <Input
                  value={branchTitle}
                  onChange={event => onBranchTitleChange(event.target.value)}
                  aria-label="新支线标题"
                  className="creator-destination-control h-9 border-[var(--creator-border)] bg-[var(--creator-surface)] text-[var(--creator-text)]"
                />
              </label>
            ) : null}
          </>
        ) : null}
      </CreatorDestinationPanel>
      <CreatorBundleReadinessPanel
        title="发布准备"
        statusLabel={canSaveDraft ? '可检查' : `还差 ${editorBlockers.length || 1} 项`}
        summary="确认这些项后，再进入发布检查。"
        items={[
          {
            label: '作者状态',
            detail: authorReady ? '可保存私密草稿。' : '确认后才能继续。',
            ready: authorReady,
          },
          {
            label: '章节标题',
            detail: titleReady ? title : '需要一个读者能理解的标题。',
            ready: titleReady,
          },
          {
            label: '正文',
            detail: contentReady ? `${content.trim().length} 字，可以进入判断。` : '先写出一段可判断正文。',
            ready: contentReady,
          },
          {
            label: '发布去向',
            detail: destinationReady ? editorDestinationLabel : '选择作品和章节线。',
            ready: destinationReady,
          },
          {
            label: '读者承诺',
            detail: selectedRequest ? readerWishTypeLabel(selectedRequest.request_type) : '自主章节也可以继续。',
            ready: Boolean(selectedRequest) || contentReady,
          },
        ]}
        actionLabel={canSaveDraft ? '进入发布检查' : '继续准备'}
        actionDisabled={!canSaveDraft || draftAction !== null}
        onAction={onEnterPublishCheck}
      />
      <CreatorEditorDecisionQueuePanel
        titleReady={titleReady}
        contentReady={contentReady}
        destinationReady={destinationReady}
        hasLinkedRequest={Boolean(selectedRequest)}
        directionLabel={chapterDirectionLabel(chapterDirection)}
        onFocusDraft={() => onGuideStepChange('draft')}
        onFocusPublish={onEnterPublishCheck}
        onAskQuestion={() => onRunWritingCommand('question')}
        onFixDraft={() => onRunWritingCommand('complete')}
        onOpenState={() => onRunWritingCommand('state')}
        onOpenBranch={() => onRunWritingCommand('sandbox')}
      />
      <CreatorCollapsibleOutline title="审阅与影响" description="需要时展开">
        <CreatorCreativeReviewDock
          title={title}
          destinationReady={destinationReady}
          hasLinkedEcho={Boolean(selectedRequest)}
          titleReady={titleReady}
          contentReady={contentReady}
          activeTab={reviewDockTab}
          qualityIssues={reviewQualityIssues}
          stateDiff={reviewStateDiff}
          branchSandbox={reviewBranchSandbox}
          flightRecorder={reviewFlightRecorder}
          onApplyReviewFix={onApplyReviewFix}
          onDecideBranchExperiment={onDecideBranchExperiment}
          onTabChange={onReviewDockTabChange}
        />
      </CreatorCollapsibleOutline>
      <CreatorPrivateDraftPanel
        title="私密草稿"
        items={privateDraftItems}
        emptyTitle="还没有私密草稿"
        emptyDescription="从外界回声进入写作，或直接在中间编辑区起稿。保存后只会出现在当前设备。"
      />
    </>
  )
}

export interface CreatorEditorBottomRailProps {
  titleReady: boolean
  contentReady: boolean
  destinationReady: boolean
  hasLinkedEcho: boolean
  directionLabel: string
  onRunWritingCommand: (command: WritingCommandId) => void
  onTitleCandidate: () => void
}

export function CreatorEditorBottomRail({
  titleReady,
  contentReady,
  destinationReady,
  hasLinkedEcho,
  directionLabel,
  onRunWritingCommand,
  onTitleCandidate,
}: CreatorEditorBottomRailProps) {
  return (
    <CreatorMissionProgressRail
      titleReady={titleReady}
      contentReady={contentReady}
      destinationReady={destinationReady}
      hasLinkedEcho={hasLinkedEcho}
      directionLabel={directionLabel}
      onRunCommand={onRunWritingCommand}
      onTitleCandidate={onTitleCandidate}
    />
  )
}
