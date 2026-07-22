import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronRight, Circle, LocateFixed, Pencil, RotateCcw, Save, ShieldCheck, X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { manuscriptRangeForFindingEvidence } from '@/features/creator-decision/literaryReview'
import { countHanCharacters, draftTextFromBlocks } from '@/features/creator-decision/sceneDrafting'
import type {
  AuthorIntentContract,
  AdvisoryCraftFinding,
  CanonStatePatch,
  CreationSession,
  IntentQuestion,
  LiteraryFinding,
  LiteraryReview,
  NarrativeCandidate,
  RepairProposal,
  SceneDraftResult,
  WritingAssistLensId,
  WritingAssistRecommendation,
} from '@/features/creator-decision/types'
import type { PmfLocalSettingAsset } from '@/features/pmf/types'
import type { CreatorDecisionPhaseId } from '@/apps/creator/routes/creatorEditorViewModels'
import type { CreatorHistoricalStateReviewItem } from '@/apps/creator/routes/creatorHistoricalStateReviewService'
import type { CreatorCharacterRehearsalViewState } from '@/apps/creator/routes/useCreatorCharacterRehearsal'
import { CreatorCharacterRehearsalCandidate } from './CreatorCharacterRehearsalCandidate'
import { CreatorHistoricalStateReview } from './CreatorHistoricalStateReview'
import { CreatorWritingAssistFindingCard } from './CreatorWritingAssistFindingCard'
import { CreatorWritingAssistInlineDiff } from './CreatorWritingAssistInlineDiff'
import { CreatorWritingAssistRecommendationCard } from './CreatorWritingAssistRecommendationCard'

export interface CreatorConversationTimelineProps {
  phase: CreatorDecisionPhaseId
  session: CreationSession | null
  intent: AuthorIntentContract | null
  question: IntentQuestion | null
  candidates: NarrativeCandidate[]
  selectedCandidateId: string | null
  previewDraft: SceneDraftResult | null
  activeDraft: SceneDraftResult | null
  manuscript: string
  review: LiteraryReview | null
  writingAssistRecommendation: WritingAssistRecommendation | null
  proposedRepair: RepairProposal | null
  patch: CanonStatePatch | null
  settingAssets: PmfLocalSettingAsset[]
  chapterNumber: number | null
  chapterTransitioning: boolean
  nextChapterBlockedReason: string | null
  pending: boolean
  referenceMode: boolean
  notice: string
  historicalStateReviews: CreatorHistoricalStateReviewItem[]
  historicalStateReviewBusyId: string | null
  characterRehearsal: CreatorCharacterRehearsalViewState
  canLockIntent: boolean
  onAnswerOption: (questionId: string, optionId: string) => void
  onLockIntent: () => void
  onReopenIntent: () => void
  onSearchCandidates: () => void
  onSelectCandidate: (candidateId: string) => void
  onGenerateScene: () => void
  onAdoptDraft: () => void
  onRejectDraft: () => void
  onReviewScene: (lensIds?: WritingAssistLensId[]) => void
  onSaveManuscriptEdit: (content: string) => void
  onFocusFinding: (finding: LiteraryFinding) => void
  onFocusAdvisoryFinding: (finding: AdvisoryCraftFinding) => void
  onProposeRepair: (findingId: string) => void
  onAcceptRepair: (repairId: string) => void
  onRejectRepair: (repairId: string) => void
  onDismissFinding: (findingId: string) => void
  onDeferAdvisoryFinding: (findingId: string) => void
  onDismissAdvisoryFinding: (findingId: string) => void
  onPrepareCanonPatch: () => void
  onConfirmCanon: () => void
  onConfirmHistoricalStateReview: (item: CreatorHistoricalStateReviewItem) => void
  onRejectHistoricalStateReview: (item: CreatorHistoricalStateReviewItem) => void
  onConfirmCharacterRehearsal: () => void
  onCaptureRehearsalCharacter: (proposalId: string) => void
  onCaptureRehearsalSetting: (proposalId: string) => void
  onDismissCharacterRehearsal: () => void
  onStartNextChapter: () => void
  submittedMessages?: string[]
}

function intentSeed(intent: AuthorIntentContract) {
  return intent.boundaries.requiredElements[0]
    || intent.characterAgency.currentGoal
    || intent.characterAgency.opposingForce
    || '继续当前故事。'
}

function turnMarker(kind: 'assistant' | 'author' | 'system') {
  if (kind === 'author') return '你'
  if (kind === 'system') return '记'
  return '伴'
}

function ConversationTurn({
  kind,
  label,
  children,
  compact = false,
}: {
  kind: 'assistant' | 'author' | 'system'
  label: string
  children: ReactNode
  compact?: boolean
}) {
  return (
    <article
      className={cn('relative grid grid-cols-[38px_minmax(0,1fr)] gap-4', compact ? 'py-4' : 'py-6')}
      data-slot="creator-conversation-turn"
      data-turn-kind={kind}
    >
      <div className={cn(
        'relative z-10 grid h-9 w-9 place-items-center rounded-full border text-sm font-semibold',
        kind === 'author' && 'border-[var(--creator-confirm)] bg-[var(--creator-task-publish-bg)] text-[var(--creator-text)]',
        kind === 'assistant' && 'border-[var(--creator-accent)] bg-[var(--creator-accent-soft)] text-[var(--creator-accent)]',
        kind === 'system' && 'border-[var(--creator-border)] bg-[var(--creator-surface-strong)] text-[var(--creator-text-muted)]',
      )} aria-hidden="true">
        {turnMarker(kind)}
      </div>
      <div className="min-w-0 pt-1">
        <div className="mb-2 flex items-center gap-2 text-base text-[var(--creator-text-muted)]">
          <strong className="font-semibold text-[var(--creator-text)]">{label}</strong>
        </div>
        {children}
      </div>
    </article>
  )
}

function CandidateRows({
  candidates,
  selectedCandidateId,
  pending,
  onSelect,
}: {
  candidates: NarrativeCandidate[]
  selectedCandidateId: string | null
  pending: boolean
  onSelect: (candidateId: string) => void
}) {
  return (
    <div
      className="mt-3 divide-y divide-[var(--creator-border)] border-y border-[var(--creator-border)]"
      data-slot="creator-conversation-candidates"
    >
      {candidates.map((candidate, index) => {
        const selected = candidate.id === selectedCandidateId
        return (
          <button
            key={candidate.id}
            type="button"
            className={cn(
              'grid w-full grid-cols-[28px_minmax(0,1fr)_18px] items-start gap-3 px-1 py-4 text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--creator-accent)]',
              selected ? 'bg-[var(--creator-accent-soft)]' : 'hover:bg-[var(--creator-surface-strong)]',
            )}
            onClick={() => onSelect(candidate.id)}
            disabled={pending}
            aria-pressed={selected}
            data-slot="creator-conversation-candidate"
            data-candidate-id={candidate.id}
          >
            <span className={cn(
              'grid h-6 w-6 place-items-center rounded-full border text-xs font-semibold',
              selected
                ? 'border-[var(--creator-accent)] bg-[var(--creator-accent)] text-[var(--creator-accent-foreground)]'
                : 'border-[var(--creator-border)] text-[var(--creator-text-muted)]',
            )}>
              {index + 1}
            </span>
            <span className="min-w-0">
              <strong className="block text-lg text-[var(--creator-text)]">{candidate.title}</strong>
              <span className="mt-1 block text-[17px] leading-7 text-[var(--creator-text-muted)]">
                {candidate.oneSentenceMechanism}
              </span>
              <span className="mt-2 block text-sm leading-6 text-[var(--creator-text-dim)]">
                代价：{candidate.projectedEffects.characterCosts[0] || candidate.projectedEffects.irreversibleChanges[0] || '等待作者确认'}
              </span>
            </span>
            {selected ? <Check size={16} className="mt-1 text-[var(--creator-accent)]" aria-hidden="true" /> : <Circle size={14} className="mt-1 text-[var(--creator-text-dim)]" aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )
}

function FindingRows({
  review,
  pending,
  onFocusFinding,
  onProposeRepair,
  onDismissFinding,
}: Pick<CreatorConversationTimelineProps,
  | 'review'
  | 'pending'
  | 'onFocusFinding'
  | 'onProposeRepair'
  | 'onDismissFinding'
>) {
  const findings = review?.findings.filter(finding => finding.status === 'active') || []
  if (!findings.length) {
    return <p className="text-sm leading-6 text-[var(--creator-text-muted)]">当前没有带正文证据的问题。</p>
  }
  return (
    <div className="divide-y divide-[var(--creator-border)] border-y border-[var(--creator-border)]">
      {findings.map(finding => (
        <div key={finding.id} className="py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={finding.severity === 'hard_block' ? 'destructive' : finding.severity === 'preserve' ? 'outline' : 'gold'}>
              {finding.severity === 'hard_block' ? '必须处理' : finding.severity === 'preserve' ? '建议保护' : '可局部修改'}
            </Badge>
            <span className="text-xs text-[var(--creator-text-muted)]">证据 {finding.evidence.length} 处</span>
          </div>
          <p className="mt-2 text-[17px] leading-7 text-[var(--creator-text)]">{finding.diagnosis}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--creator-text-muted)]">{finding.readerImpact}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onFocusFinding(finding)}>
              <LocateFixed size={13} aria-hidden="true" />定位原文
            </Button>
            {finding.severity !== 'preserve' ? (
              <Button type="button" variant="outline" size="sm" onClick={() => onProposeRepair(finding.id)} disabled={pending}>
                看局部修改方向
              </Button>
            ) : null}
            {finding.severity !== 'hard_block' ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => onDismissFinding(finding.id)} disabled={pending}>
                本轮忽略
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

export function CreatorConversationTimeline(props: CreatorConversationTimelineProps) {
  const previewText = props.previewDraft ? draftTextFromBlocks(props.previewDraft.contentBlocks) : ''
  const manuscriptText = props.manuscript || (props.activeDraft ? draftTextFromBlocks(props.activeDraft.contentBlocks) : '')
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  const [manuscriptEdit, setManuscriptEdit] = useState('')
  const [focusedEvidenceRange, setFocusedEvidenceRange] = useState<{ startOffset: number; endOffset: number } | null>(null)
  const manuscriptEditorRef = useRef<HTMLTextAreaElement>(null)
  const recentAssets = [...props.settingAssets]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 2)
  const activeFindings = props.review?.findings.filter(finding => finding.status === 'active') || []
  const activeAdvisoryFindings = props.review?.extendedCraft?.findings.filter(finding => (
    finding.status === 'active'
    && (finding.severity !== 'revision_candidate' || finding.verification === 'verified')
  )) || []
  const visibleAdvisoryFinding = activeAdvisoryFindings[0] || null
  const [dismissedRecommendationKey, setDismissedRecommendationKey] = useState<string | null>(null)
  const recommendationKey = props.writingAssistRecommendation
    ? `${props.writingAssistRecommendation.draftId}:${props.writingAssistRecommendation.draftRevision}:${props.writingAssistRecommendation.lensIds.join(',')}`
    : null
  const editingManuscript = Boolean(props.activeDraft && editingDraftId === props.activeDraft.draftId)

  useEffect(() => {
    if (!editingManuscript) return
    const frame = window.requestAnimationFrame(() => {
      const editor = manuscriptEditorRef.current
      if (!editor) return
      editor.focus()
      if (!focusedEvidenceRange) return
      const start = Math.min(manuscriptEdit.length, focusedEvidenceRange.startOffset)
      const end = Math.min(manuscriptEdit.length, focusedEvidenceRange.endOffset)
      editor.setSelectionRange(start, Math.max(start, end))
      editor.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [editingManuscript, focusedEvidenceRange, manuscriptEdit.length])

  function beginManuscriptEdit(finding?: LiteraryFinding) {
    setManuscriptEdit(manuscriptText)
    setFocusedEvidenceRange(finding && props.activeDraft
      ? manuscriptRangeForFindingEvidence(finding, props.activeDraft.contentBlocks)
      : null)
    setEditingDraftId(props.activeDraft?.draftId || null)
    if (finding) props.onFocusFinding(finding)
  }

  function beginAdvisoryFindingEdit(finding: AdvisoryCraftFinding) {
    const evidence = finding.evidence[0]
    const block = evidence && props.activeDraft?.contentBlocks.find(item => item.id === evidence.blockId)
    setManuscriptEdit(manuscriptText)
    setFocusedEvidenceRange(block && evidence
      ? {
          startOffset: block.startOffset + evidence.startOffset,
          endOffset: block.startOffset + evidence.endOffset,
        }
      : null)
    setEditingDraftId(props.activeDraft?.draftId || null)
    props.onFocusAdvisoryFinding(finding)
  }

  function cancelManuscriptEdit() {
    setEditingDraftId(null)
    setManuscriptEdit('')
    setFocusedEvidenceRange(null)
  }

  function saveManuscriptEdit() {
    if (!manuscriptEdit.trim()) return
    if (manuscriptEdit !== manuscriptText) props.onSaveManuscriptEdit(manuscriptEdit)
    cancelManuscriptEdit()
  }

  return (
    <div className="relative mx-auto w-full max-w-5xl pb-8" data-slot="creator-conversation-timeline">
      <div className="absolute bottom-8 left-[18px] top-8 w-px bg-[var(--creator-border)]" aria-hidden="true" />

      <ConversationTurn kind="assistant" label="写作搭档">
        <p className="text-[19px] leading-8 text-[var(--creator-text)]">
          先说你现在最想写的一个变化。我每轮只问一件真正影响下一步的事。
        </p>
        {props.referenceMode ? (
          <p className="mt-2 text-xs text-[var(--creator-text-muted)]">当前使用本机参考演练，所有候选仍需你确认。</p>
        ) : null}
      </ConversationTurn>

      {props.intent ? (
        <ConversationTurn kind="author" label="你">
          <p className="border-l-2 border-[var(--creator-confirm)] py-1 pl-4 text-[17px] leading-8 text-[var(--creator-text)]">
            {intentSeed(props.intent)}
          </p>
        </ConversationTurn>
      ) : null}

      {recentAssets.map(asset => (
        <ConversationTurn key={asset.localAssetRef} kind="system" label="设定补充" compact>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{asset.title}</Badge>
            <span className="text-xs text-[var(--creator-text-muted)]">已保存到本机写作智库</span>
          </div>
          <p className="mt-2 text-[17px] leading-8 text-[var(--creator-text)]">{asset.summary}</p>
        </ConversationTurn>
      ))}

      {props.characterRehearsal.draft ? (
        <ConversationTurn
          kind="assistant"
          label={props.characterRehearsal.result ? '角色排练候选' : '本机角色排练'}
        >
          <CreatorCharacterRehearsalCandidate
            state={props.characterRehearsal}
            disabled={props.pending}
            onConfirmRun={props.onConfirmCharacterRehearsal}
            onCaptureCharacter={props.onCaptureRehearsalCharacter}
            onCaptureSetting={props.onCaptureRehearsalSetting}
            onDismiss={props.onDismissCharacterRehearsal}
          />
        </ConversationTurn>
      ) : null}

      {props.question ? (
        <ConversationTurn kind="assistant" label="写作搭档">
          <Badge variant={props.question.importance === 'blocking' ? 'gold' : 'outline'}>
            {props.question.importance === 'blocking' ? '这轮只确认一件事' : '补充判断'}
          </Badge>
          <h2 className="mt-3 text-base font-semibold leading-7 text-[var(--creator-text)]">{props.question.question}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--creator-text-muted)]">{props.question.reason}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {props.question.options.map(option => (
              <Button
                key={option.id}
                type="button"
                variant="outline"
                size="sm"
                className="h-auto whitespace-normal py-2 text-left"
                onClick={() => props.onAnswerOption(props.question!.id, option.id)}
                disabled={props.pending}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </ConversationTurn>
      ) : null}

      {props.intent?.status === 'draft' && !props.question ? (
        <ConversationTurn kind="assistant" label="写作搭档">
          <p className="text-sm leading-6 text-[var(--creator-text)]">
            关键判断已经够了。锁定后我才会比较路径，后续任何候选都不会直接改正文。
          </p>
          <Button type="button" className="mt-3" onClick={props.onLockIntent} disabled={!props.canLockIntent || props.pending}>
            锁定本章意图<ChevronRight size={14} aria-hidden="true" />
          </Button>
        </ConversationTurn>
      ) : null}

      {props.intent?.status === 'locked' ? (
        <ConversationTurn kind="system" label="本章意图已锁定" compact>
          <div className="grid gap-1 text-base leading-7 text-[var(--creator-text)]">
            <p>人物选择：{props.intent.characterAgency.requiredChoice}</p>
            <p>必须变化：{props.intent.narrativeDelta.mustChange}</p>
            <p>可见代价：{props.intent.characterAgency.expectedCost}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={props.onReopenIntent} disabled={props.pending}>
            <RotateCcw size={13} aria-hidden="true" />重新确认意图
          </Button>
        </ConversationTurn>
      ) : null}

      {props.intent?.status === 'locked' && props.candidates.length === 0 ? (
        <ConversationTurn kind="assistant" label="写作搭档">
          <p className="text-base leading-7 text-[var(--creator-text)]">
            我会用已锁定意图和右侧手动召回的记忆比较真正不同的场景路径；不足三条时不会凑数。
          </p>
          <Button type="button" className="mt-3" onClick={props.onSearchCandidates} loading={props.pending}>
            比较不同方向
          </Button>
        </ConversationTurn>
      ) : null}

      {props.candidates.length ? (
        <ConversationTurn kind="assistant" label="写作搭档">
          <p className="text-base leading-7 text-[var(--creator-text)]">
            {props.candidates.length} 条路径通过了当前硬约束。请选择一种推进机制，我不会用相似方案凑数。
          </p>
          <CandidateRows
            candidates={props.candidates}
            selectedCandidateId={props.selectedCandidateId}
            pending={props.pending}
            onSelect={props.onSelectCandidate}
          />
          {props.selectedCandidateId && !props.previewDraft && !props.activeDraft ? (
            <Button type="button" className="mt-4" onClick={props.onGenerateScene} loading={props.pending}>
              写当前场景候选<ChevronRight size={14} aria-hidden="true" />
            </Button>
          ) : null}
        </ConversationTurn>
      ) : null}

      {props.previewDraft ? (
        <ConversationTurn kind="assistant" label="场景候选">
          <div className="border-y border-[var(--creator-border)] py-4" data-slot="creator-conversation-preview">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">尚未写入正文</Badge>
              <span className="text-xs text-[var(--creator-text-muted)]">{countHanCharacters(previewText)} 汉字</span>
            </div>
            <p className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap font-serif text-[17px] leading-8 text-[var(--creator-text)]">
              {previewText}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={props.onAdoptDraft} disabled={props.pending || props.previewDraft.status === 'stale'}>
              采用为草稿
            </Button>
            <Button type="button" variant="ghost" onClick={props.onRejectDraft} disabled={props.pending}>
              换个方向
            </Button>
          </div>
        </ConversationTurn>
      ) : null}

      {props.activeDraft ? (
        <ConversationTurn kind="author" label="你的正文草稿">
          <div className="border-y border-[var(--creator-border)] py-4" data-slot="creator-conversation-active-draft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="gold">已采用</Badge>
                <span className="text-xs text-[var(--creator-text-muted)]">正文仍只在本机</span>
              </div>
              {!editingManuscript ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => beginManuscriptEdit()}
                  disabled={props.pending}
                  data-agent-action="edit_local_manuscript"
                  data-agent-risk="medium"
                  data-agent-target={props.session?.activeDraftId || 'active-draft'}
                >
                  <Pencil size={13} aria-hidden="true" />编辑正文
                </Button>
              ) : null}
            </div>
            {editingManuscript ? (
              <div className="mt-3" data-slot="creator-conversation-manuscript-editor">
                <Textarea
                  ref={manuscriptEditorRef}
                  value={manuscriptEdit}
                  onChange={event => setManuscriptEdit(event.target.value)}
                  aria-label="正文手工编辑"
                  className="max-h-[65vh] min-h-[22rem] resize-y border-[var(--creator-border-strong)] bg-[var(--creator-editor-bg)] px-4 py-4 font-serif text-[17px] leading-8 text-[var(--creator-editor-text)] sm:min-h-[32rem]"
                  disabled={props.pending}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={saveManuscriptEdit}
                    disabled={props.pending || !manuscriptEdit.trim()}
                    data-agent-action="edit_local_manuscript"
                    data-agent-risk="medium"
                    data-agent-target={props.session?.activeDraftId || 'active-draft'}
                  >
                    <Save size={14} aria-hidden="true" />保存修改
                  </Button>
                  <Button type="button" variant="ghost" onClick={cancelManuscriptEdit} disabled={props.pending}>
                    <X size={14} aria-hidden="true" />取消
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap font-serif text-[17px] leading-8 text-[var(--creator-text)]">
                {manuscriptText}
              </p>
            )}
          </div>
          {!props.review ? (
            <Button type="button" className="mt-4" onClick={() => props.onReviewScene()} loading={props.pending}>
              {props.referenceMode ? '运行本机规则检查' : '检查连续性与文学问题'}
            </Button>
          ) : null}
        </ConversationTurn>
      ) : null}

      {props.writingAssistRecommendation
        && recommendationKey !== dismissedRecommendationKey
        && !props.review ? (
        <ConversationTurn kind="assistant" label="写作建议">
          <CreatorWritingAssistRecommendationCard
            recommendation={props.writingAssistRecommendation}
            pending={props.pending}
            onReview={props.onReviewScene}
            onDismiss={() => setDismissedRecommendationKey(recommendationKey)}
          />
        </ConversationTurn>
      ) : null}

      {props.submittedMessages?.map((message, index) => (
        <ConversationTurn key={`${message}:${index}`} kind="author" label="你" compact>
          <p className="border-l-2 border-[var(--creator-confirm)] py-1 pl-4 text-[17px] leading-8 text-[var(--creator-text)]">
            {message}
          </p>
        </ConversationTurn>
      ))}

      {props.review ? (
        <ConversationTurn kind="assistant" label={props.referenceMode ? '本机规则检查' : '独立审阅'}>
          <p className="mb-3 text-base leading-7 text-[var(--creator-text)]">
            找到 {activeFindings.length} 项可定位结论。这里不提供综合文学分，也不因局部问题重写全文。
          </p>
          <div data-slot="creator-conversation-review">
            <FindingRows
              review={props.review}
              pending={props.pending}
              onFocusFinding={beginManuscriptEdit}
              onProposeRepair={props.onProposeRepair}
              onDismissFinding={props.onDismissFinding}
            />
          </div>
          {visibleAdvisoryFinding ? (
            <div className="mt-4" data-slot="creator-conversation-writing-assist-review">
              <CreatorWritingAssistFindingCard
                finding={visibleAdvisoryFinding}
                pending={props.pending}
                remainingCount={Math.max(0, activeAdvisoryFindings.length - 1)}
                onFocus={beginAdvisoryFindingEdit}
                onProposeRepair={props.onProposeRepair}
                onDefer={props.onDeferAdvisoryFinding}
                onDismiss={props.onDismissAdvisoryFinding}
              />
            </div>
          ) : null}
          <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => props.onReviewScene()} loading={props.pending}>
            <RotateCcw size={13} aria-hidden="true" />
            {props.referenceMode ? '重新运行本机规则' : '重新检查当前正文'}
          </Button>
          {!props.patch && activeFindings.every(finding => finding.severity !== 'hard_block') ? (
            <Button type="button" className="mt-4" onClick={props.onPrepareCanonPatch} disabled={props.pending}>
              准备正史差异
            </Button>
          ) : null}
        </ConversationTurn>
      ) : null}

      {props.proposedRepair ? (
        <ConversationTurn kind="assistant" label="局部修改候选">
          <CreatorWritingAssistInlineDiff
            repair={props.proposedRepair}
            draft={props.activeDraft}
            pending={props.pending}
            onAccept={props.onAcceptRepair}
            onReject={props.onRejectRepair}
          />
        </ConversationTurn>
      ) : null}

      {props.patch ? (
        <ConversationTurn kind="system" label="正史差异待确认">
          <div className="space-y-2 border-y border-[var(--creator-border)] py-4">
            {props.patch.operations.length ? props.patch.operations.map((operation, index) => (
              <p key={`${operation.path}:${index}`} className="text-sm leading-6 text-[var(--creator-text)]">
                {operation.op === 'add' ? '新增' : operation.op === 'remove' ? '移除' : '更新'} {operation.path}：{operation.reason}
              </p>
            )) : <p className="text-sm text-[var(--creator-text-muted)]">正文版本将进入本机主宇宙，本次没有结构状态变化。</p>}
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" className="mt-4" disabled={props.pending || props.session?.phase === 'canon_committed'}>
                <ShieldCheck size={14} aria-hidden="true" />确认写入本机主宇宙
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认正文及状态变更？</AlertDialogTitle>
                <AlertDialogDescription>
                  这会原子保存作者已经采用的正文和状态差异。写作搭档不能代替你执行。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>返回检查</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button type="button" onClick={props.onConfirmCanon}>确认写入</Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </ConversationTurn>
      ) : null}

      {props.session?.phase === 'canon_committed' && props.chapterNumber ? (
        <ConversationTurn kind="system" label={`第 ${props.chapterNumber} 章已确认`}>
          <p className="text-base leading-7 text-[var(--creator-text)]">
            本章正文与状态已经写入本机主宇宙。下一章会继承当前状态，并把本章的选择、代价、未兑现承诺和收尾证据放进右侧召回目录。
          </p>
          {props.nextChapterBlockedReason ? (
            <p id="creator-next-chapter-blocker" className="mt-3 text-sm leading-6 text-[var(--creator-text-muted)]" role="status">
              {props.nextChapterBlockedReason}
            </p>
          ) : null}
          <Button
            type="button"
            className="mt-4"
            onClick={props.onStartNextChapter}
            loading={props.chapterTransitioning}
            disabled={props.pending || props.chapterTransitioning || Boolean(props.nextChapterBlockedReason)}
            aria-describedby={props.nextChapterBlockedReason ? 'creator-next-chapter-blocker' : undefined}
            data-agent-action="start_next_local_chapter"
            data-agent-risk="medium"
            data-agent-target={props.session.chapterId}
          >
            开始第 {props.chapterNumber + 1} 章<ChevronRight size={14} aria-hidden="true" />
          </Button>
        </ConversationTurn>
      ) : null}

      {props.historicalStateReviews.length ? (
        <ConversationTurn kind="system" label="历史状态候选">
          <p className="mb-3 text-base leading-7 text-[var(--creator-text)]">
            这些候选来自已确认章节的独立证据审阅。请逐条查看正文证据；未经你确认，它们不会进入后续召回。
          </p>
          <CreatorHistoricalStateReview
            items={props.historicalStateReviews}
            busyProposalId={props.historicalStateReviewBusyId}
            disabled={props.pending}
            onConfirm={props.onConfirmHistoricalStateReview}
            onReject={props.onRejectHistoricalStateReview}
          />
        </ConversationTurn>
      ) : null}

      <ConversationTurn kind="system" label="当前状态" compact>
        <p role="status" className="text-xs leading-5 text-[var(--creator-text-muted)]">{props.notice}</p>
      </ConversationTurn>
    </div>
  )
}
