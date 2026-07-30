import { useEffect, useMemo, useRef, useState } from 'react'
import { GitBranch, LockKeyhole, MessageSquare, Plus, Save, ShieldCheck, Sparkles, Unlock, Wand2 } from 'lucide-react'
import {
  CreatorGhostCompletionPanel,
  CreatorInlineAssistBar,
} from '@/components/creator/workspace/CreatorInlineAssistantPanels'
import {
  CreatorChapterPlannerPanel,
  CreatorCollapsibleOutline,
  CreatorNextBestActionCard,
  CreatorStoryFlowRail,
  type CreatorStoryFlowStageId,
} from '@/components/creator/workspace/CreatorPlanningPanels'
import {
  CreatorEditorCursorAssistBar,
  CreatorParagraphJudgmentPanel,
} from '@/components/creator/workspace/CreatorDraftGuidancePanels'
import { CreatorEditorReviewRail } from '@/components/creator/workspace/CreatorInlineReviewPanels'
import { CreatorEditorReadinessStrip } from '@/components/creator/workspace/CreatorProgressPanels'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { PmfLocalDraft, PmfLocalSettingAsset, PmfReaderRequest } from '@/features/pmf/types'
import type { DraftBlock, LiteraryEvidence } from '@/features/creator-decision/types'
import { requestStatusLabel } from '@/lib/pmfSupabase'
import { latestDateLabel, readerWishTypeLabel } from '../creatorViewHelpers'
import {
  chapterDirectionLabel,
  type ChapterDirectionId,
  type PublishMode,
  type WritingGuideStep,
} from './creatorEditorViewModels'
import {
  ghostCompletionMeta,
  ghostCompletionTitle,
  type WritingCommandId,
} from './creatorEditorAssistantViewModels'
import { buildInlineReviewItems } from './creatorEditorInlineReviewViewModels'
import {
  chapterPlannerDirections,
  chapterPlannerGoalBriefs,
} from './creatorEditorSocraticViewModels'
import { CreatorEditorPublishHandoff } from './CreatorEditorRails'

type InlineAssistAction = Parameters<typeof CreatorInlineAssistBar>[0]['actions'][number]

export interface CreatorEditorManuscriptStageProps {
  guideStep: WritingGuideStep
  titleReady: boolean
  contentReady: boolean
  destinationReady: boolean
  selectedRequest: PmfReaderRequest | null
  settingAssets: PmfLocalSettingAsset[]
  editorDestinationLabel: string
  title: string
  content: string
  activeDraftRef: string
  activeDraft: PmfLocalDraft | null
  canSaveDraft: boolean
  canEnterPublishCheck: boolean
  draftAction: 'save' | 'publish' | null
  loading: boolean
  chapterDirection: ChapterDirectionId
  activeWritingCommand: WritingCommandId | null
  assistantSuggestion: string
  editorBlockers: string[]
  publishMode: PublishMode
  branchTitle: string
  notice: string
  decisionBlocks: DraftBlock[]
  focusedEvidence: LiteraryEvidence | null
  protectedBlockIds: string[]
  decisionDraftRevision: number
  canGenerateSelectedText: boolean
  onStageSelect: (stage: CreatorStoryFlowStageId) => void
  onChapterDirectionSelect: (direction: ChapterDirectionId) => void
  onTitleChange: (title: string) => void
  onContentChange: (content: string) => void
  onRunWritingCommand: (command: WritingCommandId) => void
  onAcceptAssistantSuggestion: () => void
  onApplyReviewFix: (label: string) => void
  onConfirmChapterGoal: () => void
  onContinueDraftFromGuide: () => void
  onPlannerDirectionChange: (direction: ChapterDirectionId) => void
  onPlannerConfirmGoal: () => void
  onPlannerAdjustGoal: () => void
  onPlannerReplan: () => void
  onSaveDraft: () => void
  onEnterPublishCheck: () => void
  onTitleCandidate: () => void
  onKeepAsIfBranch: () => void
  onProtectBlocks: (blockIds: string[]) => void
  onUnprotectBlock: (blockId: string) => void
  onGenerateSelectedText: (blockIds: string[]) => void
}

export function CreatorEditorManuscriptStage({
  guideStep,
  titleReady,
  contentReady,
  destinationReady,
  selectedRequest,
  settingAssets,
  editorDestinationLabel,
  title,
  content,
  activeDraftRef,
  activeDraft,
  canSaveDraft,
  canEnterPublishCheck,
  draftAction,
  loading,
  chapterDirection,
  activeWritingCommand,
  assistantSuggestion,
  editorBlockers,
  publishMode,
  branchTitle,
  notice,
  decisionBlocks,
  focusedEvidence,
  protectedBlockIds,
  decisionDraftRevision,
  canGenerateSelectedText,
  onStageSelect,
  onChapterDirectionSelect,
  onTitleChange,
  onContentChange,
  onRunWritingCommand,
  onAcceptAssistantSuggestion,
  onApplyReviewFix,
  onConfirmChapterGoal,
  onContinueDraftFromGuide,
  onPlannerDirectionChange,
  onPlannerConfirmGoal,
  onPlannerAdjustGoal,
  onPlannerReplan,
  onSaveDraft,
  onEnterPublishCheck,
  onTitleCandidate,
  onKeepAsIfBranch,
  onProtectBlocks,
  onUnprotectBlock,
  onGenerateSelectedText,
}: CreatorEditorManuscriptStageProps) {
  const manuscriptRef = useRef<HTMLTextAreaElement>(null)
  const [selection, setSelection] = useState({ start: 0, end: 0 })
  const selectedBlockIds = useMemo(() => {
    if (selection.end <= selection.start) return []
    return decisionBlocks
      .filter(block => block.endOffset > selection.start && block.startOffset < selection.end)
      .map(block => block.id)
  }, [decisionBlocks, selection])
  const protectedBlocks = useMemo(() => {
    const protectedIds = new Set(protectedBlockIds)
    return decisionBlocks.filter(block => protectedIds.has(block.id))
  }, [decisionBlocks, protectedBlockIds])

  useEffect(() => {
    if (!focusedEvidence) return
    const block = decisionBlocks.find(item => item.id === focusedEvidence.blockId)
    const textarea = manuscriptRef.current
    if (!block || !textarea) return
    const start = block.startOffset + focusedEvidence.startOffset
    const end = block.startOffset + focusedEvidence.endOffset
    const frame = window.requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(start, end)
      setSelection({ start, end })
      textarea.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [decisionBlocks, focusedEvidence])

  function captureSelection() {
    const textarea = manuscriptRef.current
    if (!textarea) return
    setSelection({ start: textarea.selectionStart, end: textarea.selectionEnd })
  }

  const inlineReviewItems = buildInlineReviewItems({
    title,
    content,
    linkedRequest: selectedRequest,
    direction: chapterDirection,
  })
  const inlineAssistMeta = [
    selectedRequest ? readerWishTypeLabel(selectedRequest.request_type) : '自主章节',
    chapterDirectionLabel(chapterDirection),
    publishMode === 'main' ? '主线' : 'IF 支线',
  ]
  const inlineAssist = buildInlineAssist({
    selectedRequest,
    contentReady,
    titleReady,
    destinationReady,
    canEnterPublishCheck,
    draftAction,
    onRunWritingCommand,
    onTitleCandidate,
    onEnterPublishCheck,
  })

  return (
    <>
      <CreatorStoryFlowRail
        activeStep={guideStep}
        titleReady={titleReady}
        contentReady={contentReady}
        destinationReady={destinationReady}
        hasLinkedEcho={Boolean(selectedRequest)}
        onStageSelect={onStageSelect}
      />
      <section className="creator-editor-surface creator-editor-paper rounded-2xl p-5">
        <div className="creator-editor-paper-top">
          <div>
            <p className="creator-editor-breadcrumb">
              {editorDestinationLabel}
            </p>
            <h2>{title.trim() || '未命名章节'}</h2>
          </div>
          <div className="creator-editor-top-actions">
            <Badge variant={activeDraftRef ? 'outline' : 'gold'}>
              {activeDraftRef ? '已保存过' : '新初稿'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              data-agent-action="save_local_draft"
              data-agent-risk="medium"
              data-agent-target={activeDraftRef || 'new-draft'}
              disabled={!canSaveDraft || Boolean(draftAction)}
              onClick={onSaveDraft}
            >
              <Save size={14} />
              保存
            </Button>
            <Button
              variant="gold"
              size="sm"
              data-agent-action="enter_publish_check"
              data-agent-risk="low"
              data-agent-target={activeDraftRef || 'new-draft'}
              disabled={!canEnterPublishCheck || Boolean(draftAction)}
              onClick={onEnterPublishCheck}
            >
              发布检查
            </Button>
          </div>
        </div>

        <div className="creator-editor-direction-strip" aria-label="本章写法">
          {(['pressure', 'reveal', 'branch'] as ChapterDirectionId[]).map(direction => (
            <Button
              key={direction}
              type="button"
              variant={chapterDirection === direction ? 'gold' : 'outline'}
              size="sm"
              className="creator-editor-direction-choice"
              aria-pressed={chapterDirection === direction}
              onClick={() => onChapterDirectionSelect(direction)}
            >
              {chapterDirectionLabel(direction)}
            </Button>
          ))}
        </div>

        <CreatorInlineAssistBar
          eyebrow={inlineAssist.eyebrow}
          title={inlineAssist.title}
          body={inlineAssist.body}
          meta={inlineAssistMeta}
          actions={inlineAssist.actions}
        />
        <CreatorEditorCursorAssistBar
          content={content}
          directionLabel={chapterDirectionLabel(chapterDirection)}
          readerWishLabel={selectedRequest ? readerWishTypeLabel(selectedRequest.request_type) : '自主章节'}
          activeCommand={
            activeWritingCommand === 'complete'
            || activeWritingCommand === 'question'
            || activeWritingCommand === 'temper'
            || activeWritingCommand === 'state'
              ? activeWritingCommand
              : null
          }
          onComplete={() => onRunWritingCommand('complete')}
          onQuestion={() => onRunWritingCommand('question')}
          onTemper={() => onRunWritingCommand('temper')}
          onOpenState={() => onRunWritingCommand('state')}
        />

        <div className="creator-editor-prose-stack mt-4 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="creator-chapter-title" className="text-xs text-[var(--creator-text-dim)]">
              章节标题
            </Label>
            <Input
              id="creator-chapter-title"
              value={title}
              onChange={event => onTitleChange(event.target.value)}
              aria-label="章节标题"
              className="h-12 border-[var(--creator-border)] bg-[var(--creator-editor-bg)] text-base font-semibold text-[var(--creator-editor-text)]"
            />
          </div>
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="creator-chapter-content" className="text-xs text-[var(--creator-text-dim)]">
                正文
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">正文 r{decisionDraftRevision}</Badge>
                <Badge variant={protectedBlocks.length ? 'gold' : 'outline'}>{protectedBlocks.length} 个保护段落</Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onProtectBlocks(selectedBlockIds)}
                  disabled={selectedBlockIds.length === 0}
                >
                  <LockKeyhole size={13} aria-hidden="true" />保护所选段落
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onGenerateSelectedText(selectedBlockIds)}
                  disabled={!canGenerateSelectedText || selectedBlockIds.length === 0}
                >
                  <Wand2 size={13} aria-hidden="true" />生成所选范围候选
                </Button>
              </div>
            </div>
            <div className="creator-editor-field">
              <CreatorEditorReviewRail items={inlineReviewItems} onApplyFix={onApplyReviewFix} />
              <Textarea
                ref={manuscriptRef}
                id="creator-chapter-content"
                className="min-h-[420px] resize-y rounded-xl border-[var(--creator-border)] bg-[var(--creator-editor-bg)] px-5 py-5 font-serif text-base leading-8 text-[var(--creator-editor-text)] shadow-none xl:min-h-[520px]"
                value={content}
                onChange={event => onContentChange(event.target.value)}
                onSelect={captureSelection}
                onMouseUp={captureSelection}
                onKeyUp={captureSelection}
                onKeyDown={event => {
                  if (event.key === 'Tab' && !event.shiftKey) {
                    event.preventDefault()
                    onAcceptAssistantSuggestion()
                  }
                }}
                aria-label="章节正文"
                placeholder="在这里写正文。可以从请求里的场景、选择或支线承诺开始。"
              />
              <CreatorGhostCompletionPanel
                title={ghostCompletionTitle(contentReady)}
                suggestion={assistantSuggestion}
                meta={ghostCompletionMeta({
                  linkedRequest: selectedRequest,
                  direction: chapterDirection,
                })}
                onAccept={onAcceptAssistantSuggestion}
                onQuestion={() => onRunWritingCommand('question')}
                onTemper={() => onRunWritingCommand('temper')}
              />
            </div>
            {protectedBlocks.length ? (
              <div className="flex flex-wrap gap-2" aria-label="受保护正文段落">
                {protectedBlocks.map(block => (
                  <Button
                    key={block.id}
                    type="button"
                    variant="ghost"
                    size="sm"
                    title={block.text}
                    onClick={() => onUnprotectBlock(block.id)}
                  >
                    <Unlock size={13} aria-hidden="true" />解除保护：{block.text.trim().slice(0, 16) || '空段落'}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <CreatorEditorReadinessStrip
          proseCount={content.trim().length}
          saveStateLabel={activeDraft ? '已保存过' : '未保存'}
          saveStateDetail={activeDraft ? `最近保存：${latestDateLabel(activeDraft.updatedAt)}` : '点击保存后进入草稿箱。'}
          destinationLabel={editorDestinationLabel}
          destinationDetail="发布检查会再次确认读者看到的位置。"
          requestStateLabel={selectedRequest ? requestStatusLabel(selectedRequest.status) : '未关联'}
          requestStateDetail={selectedRequest ? readerWishTypeLabel(selectedRequest.request_type) : '可以无请求写作，发布前会提醒。'}
          blockers={editorBlockers}
        />
        <CreatorParagraphJudgmentPanel
          content={content}
          directionLabel={chapterDirectionLabel(chapterDirection)}
          hasLinkedEcho={Boolean(selectedRequest)}
          titleReady={titleReady}
          destinationReady={destinationReady}
          onComplete={() => onRunWritingCommand('complete')}
          onTemper={() => onRunWritingCommand('temper')}
          onQuestion={() => onRunWritingCommand('question')}
          onOpenState={() => onRunWritingCommand('state')}
          onOpenBranch={() => onRunWritingCommand('sandbox')}
        />
        {!contentReady ? (
          <CreatorNextBestActionCard
            hasLinkedEcho={Boolean(selectedRequest)}
            contentReady={contentReady}
            directionLabel={chapterDirectionLabel(chapterDirection)}
            onConfirmGoal={onConfirmChapterGoal}
            onContinueDraft={onContinueDraftFromGuide}
          />
        ) : null}

        <CreatorCollapsibleOutline title="章节大纲" description="目标、人物、伏笔和写法候选">
          <CreatorChapterPlannerPanel
            goalBriefs={chapterPlannerGoalBriefs({ linkedRequest: selectedRequest, settingAssets })}
            directions={chapterPlannerDirections()}
            selectedDirection={chapterDirection}
            onDirectionChange={nextDirection => onPlannerDirectionChange(nextDirection as ChapterDirectionId)}
            onConfirmGoal={onPlannerConfirmGoal}
            onAdjustGoal={onPlannerAdjustGoal}
            onReplan={onPlannerReplan}
          />
        </CreatorCollapsibleOutline>
        <CreatorEditorPublishHandoff
          titleReady={titleReady}
          contentReady={contentReady}
          destinationReady={destinationReady}
          hasLinkedEcho={Boolean(selectedRequest)}
          directionLabel={chapterDirectionLabel(chapterDirection)}
          destinationLabel={publishMode === 'main' ? '主线连载' : branchTitle || 'IF 支线候选'}
          blockers={editorBlockers}
          saveDisabled={!canSaveDraft || Boolean(draftAction)}
          publishDisabled={!canEnterPublishCheck || Boolean(draftAction)}
          saveLoading={loading || draftAction === 'save'}
          publishLoading={loading || draftAction === 'publish'}
          saveLabel={draftAction === 'save' ? '保存中...' : '只保存草稿'}
          publishLabel={draftAction === 'publish' ? '准备中...' : '进入发布检查'}
          onSaveDraft={onSaveDraft}
          onKeepBranch={onKeepAsIfBranch}
          onEnterPublishCheck={onEnterPublishCheck}
        />
        <p className="mt-4 text-sm leading-6 text-[var(--creator-text-muted)]">{notice}</p>
      </section>
    </>
  )
}

function buildInlineAssist({
  selectedRequest,
  contentReady,
  titleReady,
  destinationReady,
  canEnterPublishCheck,
  draftAction,
  onRunWritingCommand,
  onTitleCandidate,
  onEnterPublishCheck,
}: {
  selectedRequest: PmfReaderRequest | null
  contentReady: boolean
  titleReady: boolean
  destinationReady: boolean
  canEnterPublishCheck: boolean
  draftAction: 'save' | 'publish' | null
  onRunWritingCommand: (command: WritingCommandId) => void
  onTitleCandidate: () => void
  onEnterPublishCheck: () => void
}): {
  eyebrow: string
  title: string
  body: string
  actions: InlineAssistAction[]
} {
  if (!contentReady) {
    return {
      eyebrow: '写作助手',
      title: '先让第一段正文成形',
      body: selectedRequest
        ? '从读者愿望里挑一个画面或选择，先生成候选，再决定是否采用。'
        : '没有挂接请求时，先从作品当前压力写出一段可读开场。',
      actions: [
        {
          label: '续写候选',
          hint: '生成一段开场',
          shortcut: 'Tab',
          tone: 'primary',
          icon: <Wand2 size={14} />,
          onClick: () => onRunWritingCommand('complete'),
        },
        {
          label: '追问代价',
          hint: '先问清人物为什么行动',
          shortcut: '⌘L',
          tone: 'secondary',
          icon: <MessageSquare size={14} />,
          onClick: () => onRunWritingCommand('question'),
        },
      ],
    }
  }
  if (!titleReady) {
    return {
      eyebrow: '写作助手',
      title: '给这一章一个读者能记住的名字',
      body: '正文已经有了，下一步把标题贴住本章异常、选择或代价。',
      actions: [
        {
          label: '标题候选',
          hint: '只改私密标题',
          shortcut: '⌘K',
          tone: 'primary',
          icon: <Sparkles size={14} />,
          onClick: onTitleCandidate,
        },
        {
          label: '看影响',
          hint: '确认标题承诺',
          shortcut: '⌘I',
          tone: 'secondary',
          icon: <GitBranch size={14} />,
          onClick: () => onRunWritingCommand('state'),
        },
      ],
    }
  }
  if (!destinationReady) {
    return {
      eyebrow: '写作助手',
      title: '先决定这章进入哪条故事线',
      body: '标题和正文已经具备，下一步判断它应该进入主线，还是先作为 IF 支线候选。',
      actions: [
        {
          label: '看影响',
          hint: '判断主线或支线',
          shortcut: '⌘I',
          tone: 'primary',
          icon: <GitBranch size={14} />,
          onClick: () => onRunWritingCommand('state'),
        },
        {
          label: '试分支',
          hint: '大改先比较',
          shortcut: '⌘B',
          tone: 'secondary',
          icon: <Plus size={14} />,
          onClick: () => onRunWritingCommand('sandbox'),
        },
      ],
    }
  }
  return {
    eyebrow: '写作助手',
    title: '进入发布前，先看这章改变了什么',
    body: '正文、标题和去向都具备了；先确认故事影响，再进入发布检查。',
    actions: [
      {
        label: '看影响',
        hint: '审阅人物和支线变化',
        shortcut: '⌘I',
        tone: 'primary',
        icon: <GitBranch size={14} />,
        onClick: () => onRunWritingCommand('state'),
      },
      {
        label: '发布检查',
        hint: '作者确认后进入',
        shortcut: '⌘↵',
        tone: 'secondary',
        icon: <ShieldCheck size={14} />,
        disabled: !canEnterPublishCheck || Boolean(draftAction),
        onClick: onEnterPublishCheck,
      },
    ],
  }
}
