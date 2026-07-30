import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { creatorFacingNotice } from '../creatorViewHelpers'
import { CreatorConversationWorkspace } from '@/components/creator/workspace/CreatorConversationWorkspace'
import {
  type PmfBranch,
  type PmfChapter,
  type PmfLocalSettingAsset,
  type PmfReaderRequest,
  type PmfWork,
} from '@/features/pmf/types'
import {
  type CreatorAuthorizationStatus,
} from '@/lib/pmfSupabase'
import {
  buildCreatorDecisionPhaseViewModel,
  type PublishMode,
  type WritingGuideStep,
} from './creatorEditorViewModels'
import { intentLockBlockers } from '@/features/creator-decision/stateMachine'
import { evaluateNextChapterQualityGate } from '@/features/creator-decision/nextChapterQualityGate'
import type { ManualRecallItem } from '@/features/creator-decision/types'
import type { VerifiedLongRangeThreadRecallCandidate } from '@/features/creator-decision/longRangeThreadRecall'
import type {
  EditorAssistCandidate,
  WritingCommandId,
} from './creatorEditorAssistantViewModels'
import { resolveEditorDestinationContext } from './creatorEditorDestinationController'
import { resolveCreatorEditorWritingChapterNumber } from './creatorEditorDecisionSessionController'
import { readCreatorEditorRouteQuery } from './creatorEditorRouteController'
import { useCreatorEditorDecisionWorkbench } from './useCreatorEditorDecisionWorkbench'
import {
  runEditorDraftSaveThroughAgent,
  runEditorPublishCheckThroughAgent,
} from './creatorEditorAgentExecutionService'
import {
  applyEditorDraftStatePatchToReact,
  applyEditorStartupDataPatchToReact,
  applyEditorStartupStatePatchToReact,
} from './creatorEditorReactPatchApplier'
import {
  runEditorStartupEffect,
  scheduleEditorStartupEffect,
} from './creatorEditorStartupEffectService'
import {
  resolveEditorStartupDataPatch,
} from './creatorEditorStartupDataPatchController'
import {
  readEditorStartupLocalSnapshot,
} from './creatorEditorStartupLoadService'
import {
  resolveEditorSelectedRequest,
} from './creatorEditorSelectionController'
import {
  buildCreatorRecallCandidates,
  recommendedCreatorRecallIds,
  resolveManualRecallItems,
} from './creatorEditorRecallViewModels'
import {
  buildEditorRecallSelectionScope,
  writeEditorRecallSelection,
} from './creatorEditorRecallSelectionService'
import { runConversationSettingCapture } from './creatorEditorConversationSettingService'
import { recognizeCreatorConversationReviewCommand } from './creatorEditorConversationReviewService'
import { runConversationTextEdit } from './creatorEditorConversationTextEditService'
import { parseConversationChapterSeed } from './creatorEditorConversationTitleService'
import {
  readCreatorLocalChapterMemories,
  type CreatorLocalChapterMemory,
} from './creatorEditorLocalChapterMemoryService'
import { runEditorLongRangeRecallLoad } from './creatorEditorLongRangeRecallService'
import {
  editorNextChapterBlockedNotice,
  prepareEditorNextChapter,
} from './creatorEditorNextChapterService'
import { useCreatorHistoricalStateReview } from './useCreatorHistoricalStateReview'
import { useCreatorCharacterRehearsal } from './useCreatorCharacterRehearsal'
type EditorDraftReactPatch = Parameters<typeof applyEditorDraftStatePatchToReact>[0]

export function CreatorEditorRoute() {
  const location = useLocation()
  const navigate = useNavigate()
  const initialLocalSnapshot = useMemo(() => readEditorStartupLocalSnapshot(), [])
  const [requests, setRequests] = useState<PmfReaderRequest[]>([])
  const [drafts, setDrafts] = useState(() => initialLocalSnapshot.drafts)
  const [works, setWorks] = useState<PmfWork[]>([])
  const [branches, setBranches] = useState<PmfBranch[]>([])
  const [chapters, setChapters] = useState<PmfChapter[]>([])
  const [, setCreativeReminders] = useState(() => initialLocalSnapshot.creativeReminders)
  const [authorization, setAuthorization] = useState<CreatorAuthorizationStatus | null>(null)
  const [settingAssets, setSettingAssets] = useState(() => initialLocalSnapshot.settingAssets)
  const [longRangeThreadRecallCandidates, setLongRangeThreadRecallCandidates] = useState<
    VerifiedLongRangeThreadRecallCandidate[]
  >([])
  const [notice, setNotice] = useState('选择请求或作品后开始写。')
  const [loading, setLoading] = useState(true)
  const [draftAction, setDraftAction] = useState<'save' | 'publish' | null>(null)
  const [chapterTransitioning, setChapterTransitioning] = useState(false)
  const [localChapterMemories, setLocalChapterMemories] = useState<CreatorLocalChapterMemory[]>([])
  const [historicalMemoryRevision, setHistoricalMemoryRevision] = useState(0)
  const [guideStep, setGuideStep] = useState<WritingGuideStep>('intent')
  const [, setEditorAssistCandidate] = useState<EditorAssistCandidate | null>(null)
  const [, setActiveWritingCommand] = useState<WritingCommandId | null>(null)
  const {
    requestId,
    routeDraftRef,
    routeWorkId,
    routeBranchId,
    routeChapterNumber,
  } = useMemo(() => readCreatorEditorRouteQuery(location.search), [location.search])
  const selectedRequest = resolveEditorSelectedRequest({
    allowUnscopedFallback: !(routeWorkId || routeBranchId || routeChapterNumber),
    requestId,
    requests,
  })
  const [title, setTitle] = useState('新章节')
  const [content, setContent] = useState('')
  const [publishMode, setPublishMode] = useState<PublishMode>('main')
  const [branchTitle, setBranchTitle] = useState('读者 IF 支线')
  const [selectedWorkId, setSelectedWorkId] = useState('')
  const [selectedIfBranchId, setSelectedIfBranchId] = useState('new-if-branch')
  const [activeDraftRef, setActiveDraftRef] = useState('')
  const startupStateRef = useRef({
    branchTitle: '读者 IF 支线',
    selectedWorkId: '',
    title: '新章节',
  })
  const editorDestination = useMemo(() => resolveEditorDestinationContext({
    activeDraftRef,
    authorization,
    branches,
    branchTitle,
    chapters,
    content,
    drafts,
    publishMode,
    selectedIfBranchId,
    selectedRequest,
    selectedWorkId,
    settingAssets,
    title,
    works,
  }), [
    activeDraftRef,
    authorization,
    branches,
    branchTitle,
    chapters,
    content,
    drafts,
    publishMode,
    selectedIfBranchId,
    selectedRequest,
    selectedWorkId,
    settingAssets,
    title,
    works,
  ])
  const {
    activeDraft,
    authorReady,
    canEnterPublishCheck,
    canSaveDraft,
    contentReady,
    currentSettingAssets,
    destinationReady,
    editorDestinationLabel,
    latestChapter,
    requestChapter,
    resolvedBranch,
    resolvedBranchId,
    selectedWork,
    titleReady,
  } = editorDestination
  const writingChapterNumber = resolveCreatorEditorWritingChapterNumber({
    activeDraft,
    requestChapter,
    latestChapter,
    selectedWorkId,
    resolvedBranchId,
    routeChapterNumber,
  })
  const recallScope = buildEditorRecallSelectionScope({
    workId: selectedWorkId,
    branchId: resolvedBranchId,
    routeChapterNumber: writingChapterNumber,
    activeDraftRef,
    selectedRequestId: selectedRequest?.id,
  })
  const recallCandidates = useMemo(() => buildCreatorRecallCandidates({
    chapters,
    localChapterMemories,
    settingAssets: currentSettingAssets,
    linkedRequest: selectedRequest,
    workId: selectedWorkId,
    branchId: resolvedBranchId,
    chapterId: null,
    chapterNumber: writingChapterNumber,
    longRangeThreadRecallCandidates,
  }), [
    chapters,
    currentSettingAssets,
    localChapterMemories,
    longRangeThreadRecallCandidates,
    resolvedBranchId,
    writingChapterNumber,
    selectedRequest,
    selectedWorkId,
  ])
  const [recallSelections, setRecallSelections] = useState<Record<string, string[]>>(
    () => initialLocalSnapshot.recallSelections,
  )
  const recommendedRecallIds = useMemo(
    () => recommendedCreatorRecallIds(recallCandidates),
    [recallCandidates],
  )
  const appliedRecallIds = useMemo(
    () => recallSelections[recallScope] || recommendedRecallIds,
    [recallScope, recallSelections, recommendedRecallIds],
  )
  const manualRecallItems = useMemo<ManualRecallItem[]>(
    () => resolveManualRecallItems(recallCandidates, appliedRecallIds),
    [appliedRecallIds, recallCandidates],
  )
  const decision = useCreatorEditorDecisionWorkbench({
    activeDraft,
    requestChapter,
    latestChapter,
    selectedWorkId,
    resolvedBranchId,
    manuscript: content,
    chapters,
    settingAssets: currentSettingAssets,
    manualRecallItems,
    linkedRequest: selectedRequest,
    routeChapterNumber,
    onApplyManuscript: setContent,
  })
  const handleRehearsalAssetSaved = useCallback((asset: PmfLocalSettingAsset) => {
    setSettingAssets(current => [
      ...current.filter(item => item.localAssetRef !== asset.localAssetRef),
      asset,
    ])
  }, [])
  const characterRehearsal = useCreatorCharacterRehearsal({
    session: decision.session,
    context: decision.context,
    branchId: resolvedBranchId || null,
    settingAssets: currentSettingAssets,
    simulate: decision.actions.rehearseCharacters,
    onAssetSaved: handleRehearsalAssetSaved,
  })
  const historicalStateReview = useCreatorHistoricalStateReview({
    workId: selectedWorkId,
    onNotice: setNotice,
    onCommitted: () => setHistoricalMemoryRevision(current => current + 1),
  })
  const decisionPhase = buildCreatorDecisionPhaseViewModel(decision.session)
  const nextChapterQualityGate = evaluateNextChapterQualityGate({
    session: decision.session,
    review: decision.review,
    repairs: decision.snapshot?.repairs || [],
  })
  const nextChapterBlockedReason = nextChapterQualityGate.allowed
    ? null
    : editorNextChapterBlockedNotice(nextChapterQualityGate)
  const canLockDecisionIntent = Boolean(
    decision.intent && intentLockBlockers(decision.intent).length === 0,
  )
  useEffect(() => {
    startupStateRef.current = {
      branchTitle,
      selectedWorkId,
      title,
    }
  }, [branchTitle, selectedWorkId, title])

  useEffect(() => {
    return scheduleEditorStartupEffect(() => {
      void (async () => {
        setLoading(true)
        const startup = startupStateRef.current
        const startupResult = await runEditorStartupEffect({
          requestId,
          routeDraftRef,
          routeWorkId,
          routeBranchId,
          routeChapterNumber,
          currentBranchTitle: startup.branchTitle,
          currentSelectedWorkId: startup.selectedWorkId,
          currentTitle: startup.title,
        })
        if (!startupResult.ok) {
          setNotice(creatorFacingNotice(startupResult.notice))
        } else {
          applyEditorStartupDataPatchToReact(resolveEditorStartupDataPatch(startupResult), {
            setAuthorization,
            setBranches,
            setChapters,
            setCreativeReminders,
            setDrafts,
            setRecallSelections,
            setRequests,
            setSettingAssets,
            setWorks,
          })
          applyEditorStartupStatePatchToReact(startupResult.statePatch, {
            setActiveDraftRef,
            setBranchTitle,
            setContent,
            setGuideStep,
            setNotice,
            setPublishMode,
            setSelectedIfBranchId,
            setSelectedWorkId,
            setTitle,
          })
        }
        setLoading(false)
      })()
    })
  }, [requestId, routeBranchId, routeChapterNumber, routeDraftRef, routeWorkId])

  useEffect(() => {
    let cancelled = false
    void readCreatorLocalChapterMemories({
      drafts,
      workId: selectedWorkId,
      branchId: resolvedBranchId,
    }).then(memories => {
      if (!cancelled) setLocalChapterMemories(memories)
    })
    return () => {
      cancelled = true
    }
  }, [decision.session?.phase, drafts, historicalMemoryRevision, resolvedBranchId, selectedWorkId])

  useEffect(() => {
    let cancelled = false
    void runEditorLongRangeRecallLoad({
      workId: selectedWorkId,
      branchId: resolvedBranchId,
      currentChapterNo: writingChapterNumber,
    }).then(result => {
      if (!cancelled) setLongRangeThreadRecallCandidates(result.candidates)
    })
    return () => {
      cancelled = true
    }
  }, [decision.session?.phase, historicalMemoryRevision, resolvedBranchId, selectedWorkId, writingChapterNumber])

  function applyEditorDraftStatePatch(statePatch: EditorDraftReactPatch) {
    applyEditorDraftStatePatchToReact(statePatch, {
      setActiveDraftRef,
      setActiveWritingCommand,
      setContent,
      setCreativeReminders,
      setDrafts,
      setEditorAssistCandidate,
      setGuideStep,
      setNotice,
      setPublishMode,
      setSelectedIfBranchId,
      setSelectedWorkId,
      setTitle,
    })
  }

  async function saveDraft() {
    setDraftAction('save')
    const execution = await runEditorDraftSaveThroughAgent({
      action: 'save',
      activeDraftRef,
      chapterNumber: writingChapterNumber,
      linkedRequest: selectedRequest,
      resolvedBranchId,
      selectedWorkId,
      title,
      content,
      readiness: {
        authorReady,
        destinationReady,
        titleReady,
        contentReady,
      },
      resetDraftAction: () => setDraftAction(null),
    })
    const result = execution.result
    if (!result) {
      setDraftAction(null)
      setNotice('草稿保存未完成，请重试。')
      return null
    }
    applyEditorDraftStatePatch(result.statePatch)
    return result.draft
  }

  async function enterPublishCheck() {
    setDraftAction('publish')
    const execution = await runEditorPublishCheckThroughAgent({
      activeDraftRef,
      linkedRequest: selectedRequest,
      resolvedBranchId,
      selectedWorkId,
      title,
      content,
      readiness: {
        authorReady,
        destinationReady,
        titleReady,
        contentReady,
      },
      resetDraftAction: () => setDraftAction(null),
    })
    const result = execution.result
    if (!result) {
      setDraftAction(null)
      setNotice('发布包准备未完成，请重试。')
      return
    }
    applyEditorDraftStatePatch(result.statePatch)
    const handoff = result.handoff
    if (!handoff) return
    navigate(handoff.targetPath)
  }

  function captureConversationSetting(message: string) {
    const result = runConversationSettingCapture({
      text: message,
      workId: selectedWorkId,
      branchId: resolvedBranchId || null,
      stage: guideStep,
    })
    if (!result.recognized) return false
    setNotice(result.notice)
    if (result.ok) setSettingAssets(result.settingAssets)
    return true
  }

  function applyManualRecallSelection(ids: string[]) {
    const validIds = new Set(recallCandidates.map(candidate => candidate.id))
    const nextIds = ids.filter(id => validIds.has(id))
    setRecallSelections(writeEditorRecallSelection(recallScope, nextIds))
    setNotice(nextIds.length
      ? `已将 ${nextIds.length} 条记忆带入下一次路径比较。`
      : '本轮不额外带入手动召回记忆。')
  }

  function handleConversationMessage(message: string) {
    const chapterSeed = parseConversationChapterSeed(message)
    if (chapterSeed.title && !chapterSeed.storySeed) {
      setTitle(chapterSeed.title)
      setNotice('章节标题已更新。')
      return
    }
    const reviewCommand = recognizeCreatorConversationReviewCommand(message)
    if (reviewCommand.recognized) {
      if (!content.trim()) {
        setNotice('当前还没有可审阅的正文。')
        return
      }
      void decision.actions.reviewDraft(reviewCommand.focusDimensions)
      return
    }
    const edit = runConversationTextEdit({ message, content })
    if (!edit.recognized) {
      setNotice('本章意图已锁定。可补充“设定：…”，或直接说：把“原文”改成“新文”。')
      return
    }
    setNotice(edit.notice)
    if (edit.ok) setContent(edit.content)
  }

  function proposeConversationIntent(message: string) {
    const chapterSeed = parseConversationChapterSeed(message)
    if (chapterSeed.title) setTitle(chapterSeed.title)
    if (!chapterSeed.storySeed) {
      setNotice('标题已记录；再说一句这一章最想发生的变化。')
      return
    }
    void decision.actions.proposeIntent(chapterSeed.storySeed)
  }

  async function startNextChapter() {
    if (!routeChapterNumber || !decision.canon || decision.session?.phase !== 'canon_committed') {
      setNotice('本章还没有完成作者确认，暂不能进入下一章。')
      return
    }
    if (!nextChapterQualityGate.allowed) {
      setNotice(nextChapterBlockedReason || '进入下一章前，请先完成本章质量确认。')
      return
    }
    setChapterTransitioning(true)
    try {
      const next = await prepareEditorNextChapter({
        activeDraftRef,
        branchId: resolvedBranchId,
        content,
        currentCanon: decision.canon,
        currentChapterNumber: routeChapterNumber,
        linkedRequest: selectedRequest,
        review: decision.review,
        repairs: decision.snapshot?.repairs || [],
        session: decision.session,
        title,
        workId: selectedWorkId,
      })
      navigate(next.targetPath)
    } catch {
      setNotice('下一章接力没有完成，本章内容仍保存在本机。')
    } finally {
      setChapterTransitioning(false)
    }
  }

  return (
    <CreatorConversationWorkspace
      phase={decisionPhase.activePhase}
      session={decision.session}
      intent={decision.intent}
      question={decision.intentQuestions[0] || null}
      candidates={decision.candidates}
      selectedCandidateId={decision.selectedCandidate?.id || null}
      previewDraft={decision.previewDraft}
      activeDraft={decision.activeDraft}
      manuscript={content}
      review={decision.review}
      writingAssistRecommendation={decision.writingAssistRecommendation}
      proposedRepair={decision.proposedRepair}
      patch={decision.patch}
      settingAssets={currentSettingAssets}
      characterRehearsal={characterRehearsal.state}
      pending={Boolean(decision.pendingAction) || characterRehearsal.state.pending}
      referenceMode={decision.agentMode === 'reference'}
      notice={characterRehearsal.notice || decision.notice || notice}
      canLockIntent={canLockDecisionIntent}
      workTitle={selectedWork?.title || '未选择作品'}
      chapterTitle={title.trim() || '未命名章节'}
      destinationLabel={resolvedBranch?.title || editorDestinationLabel}
      activeDraftRef={activeDraftRef}
      canSaveDraft={canSaveDraft}
      canEnterPublishCheck={canEnterPublishCheck}
      draftAction={draftAction}
      pendingAction={decision.pendingAction}
      loading={loading}
      historicalStateReviews={historicalStateReview.items}
      historicalStateReviewBusyId={historicalStateReview.busyProposalId}
      historicalStateImporting={historicalStateReview.importing}
      historicalStateWorkId={selectedWorkId}
      chapterNumber={routeChapterNumber}
      chapterTransitioning={chapterTransitioning}
      nextChapterBlockedReason={nextChapterBlockedReason}
      recallCandidates={recallCandidates}
      appliedRecallIds={appliedRecallIds}
      contextRecallSourceIds={decision.context?.manualRecallItems.map(item => item.sourceId) || []}
      onBack={() => navigate('/creator')}
      onSaveDraft={() => void saveDraft()}
      onEnterPublishCheck={() => void enterPublishCheck()}
      onProposeIntent={proposeConversationIntent}
      onAnswerOption={(questionId, optionId) => void decision.actions.answerIntentOption(questionId, optionId)}
      onAnswerCustom={answer => {
        const question = decision.intentQuestions[0]
        if (question) void decision.actions.answerIntentCustom(question, answer)
      }}
      onCaptureSetting={captureConversationSetting}
      onConversationCommand={characterRehearsal.actions.prepare}
      onUnscopedMessage={handleConversationMessage}
      onApplyRecall={applyManualRecallSelection}
      onImportHistoricalStateFiles={files => void historicalStateReview.importFiles(files)}
      onConfirmHistoricalStateReview={item => void historicalStateReview.confirmProposal(item.proposal)}
      onRejectHistoricalStateReview={item => void historicalStateReview.rejectProposal(item.proposal)}
      onConfirmCharacterRehearsal={() => void characterRehearsal.actions.confirmRun()}
      onCaptureRehearsalCharacter={proposalId => void characterRehearsal.actions.captureCharacter(proposalId)}
      onCaptureRehearsalSetting={proposalId => void characterRehearsal.actions.captureSetting(proposalId)}
      onDismissCharacterRehearsal={characterRehearsal.actions.dismiss}
      onLockIntent={() => void decision.actions.lockIntent()}
      onReopenIntent={() => void decision.actions.reopenIntent()}
      onSearchCandidates={() => void decision.actions.searchCandidates()}
      onSelectCandidate={candidateId => void decision.actions.selectCandidate(candidateId)}
      onGenerateScene={() => void decision.actions.generateScene()}
      onAdoptDraft={() => void decision.actions.adoptPreviewDraft()}
      onRejectDraft={decision.actions.rejectPreviewDraft}
      onReviewScene={lensIds => void decision.actions.reviewDraft(lensIds)}
      onSaveManuscriptEdit={setContent}
      onFocusFinding={finding => decision.actions.focusFinding(finding.evidence[0] || null)}
      onFocusAdvisoryFinding={finding => decision.actions.focusFinding(finding.evidence[0] || null)}
      onProposeRepair={findingId => void decision.actions.proposeRepair(findingId)}
      onAcceptRepair={repairId => void decision.actions.acceptRepair(repairId)}
      onRejectRepair={repairId => void decision.actions.rejectRepair(repairId)}
      onDismissFinding={findingId => void decision.actions.dismissFinding(findingId)}
      onDeferAdvisoryFinding={findingId => void decision.actions.deferAdvisoryFinding(findingId)}
      onDismissAdvisoryFinding={findingId => void decision.actions.dismissAdvisoryFinding(findingId)}
      onPrepareCanonPatch={() => void decision.actions.proposeCanonPatch()}
      onConfirmCanon={() => void decision.actions.confirmCanon()}
      onStartNextChapter={() => void startNextChapter()}
    />
  )
}
