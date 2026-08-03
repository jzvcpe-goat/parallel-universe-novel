import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  PmfChapter,
  PmfLocalDraft,
  PmfLocalSettingAsset,
  PmfReaderRequest,
} from '@/features/pmf/types'
import {
  CreationDecisionWorkflow,
  activeCanonPatch,
  activeLiteraryReview,
  activeSceneDraft,
  currentAuthorIntent,
  currentContextSnapshot,
  customIntentAnswerPatch,
  manuscriptBlocks,
  selectedNarrativeCandidate,
} from '@/features/creator-decision/creationDecisionWorkflow'
import {
  countVisibleCharacters,
  draftTextFromBlocks,
} from '@/features/creator-decision/sceneDrafting'
import { createCreationSession, creationDecisionEvent, nextIntentQuestions } from '@/features/creator-decision/stateMachine'
import type {
  CharacterSimulationRequest,
  CharacterSimulationResult,
} from '@/features/creator-decision/characterSimulation'
import type {
  CreationDecisionSnapshot,
  IntentQuestion,
  LiteraryEvidence,
  ManualRecallItem,
  SceneDraftRequest,
  WritingAssistLensId,
} from '@/features/creator-decision/types'
import { readCreatorWritingAssistPreferences } from '@/local-db/creatorLocalSettingsRepository'
import { CreationDecisionError } from '@/features/creator-decision/types'
import { referenceWritingAgent } from '@/features/creator-decision/referenceWritingAgent'
import { createLocalWorkingAgent } from '@/features/creator-decision/localWorkingAgent'
import {
  isLiteraryDimension,
  recommendWritingAssistLenses,
} from '@/features/creator-decision/writingAssistance'
import {
  creatorLocalDecisionRepository,
  migrateLegacyDraftToCreationSession,
} from '@/local-db/creatorLocalDecisionRepository'
import {
  buildCreatorDecisionContextSource,
  type CreatorDecisionRuntimeProjection,
} from './creatorEditorDecisionContextAdapter'
import { buildCreatorEditorIntentSeed } from './creatorEditorIntentSeedController'
import {
  creatorEditorCreationSessionId,
  hasExplicitCreatorChapterIdentity,
} from './creatorEditorDecisionSessionController'
import { resolveVisibleRepairProposal } from './creatorEditorRepairSelectionController'
import {
  shouldApplyRestoredCreatorManuscript,
  shouldRecordCreatorEditorAuthorEdit,
  type CreatorEditorAuthorEditGuard,
} from './creatorEditorAuthorEditGuard'
import { runCreatorCharacterRehearsal } from './creatorCharacterRehearsalService'

const localWorkingAgentUrl = import.meta.env.VITE_CREATOR_QA_REFERENCE_AGENT === 'true'
  ? ''
  : import.meta.env.VITE_CREATOR_WORKING_AGENT_URL?.trim() || ''
const writingAgent = localWorkingAgentUrl
  ? createLocalWorkingAgent(localWorkingAgentUrl)
  : referenceWritingAgent
const workflow = new CreationDecisionWorkflow(
  creatorLocalDecisionRepository,
  writingAgent,
)

export function creatorSceneDraftTargetLength(
  scope: SceneDraftRequest['scope'],
  currentBlocks: ReturnType<typeof manuscriptBlocks>,
): SceneDraftRequest['targetLength'] {
  if (scope.type === 'scene') return { minimum: 2700, maximum: 3400 }
  if (scope.type === 'selected_beats') return { minimum: 600, maximum: 1800 }
  const selectedIds = new Set(scope.selectedBlockIds)
  const sourceLength = currentBlocks
    .filter(block => selectedIds.has(block.id))
    .reduce((total, block) => total + countVisibleCharacters(block.text), 0)
  const boundedSourceLength = Math.min(sourceLength, 2200)
  const minimum = Math.max(20, Math.floor(boundedSourceLength * 0.7))
  return {
    minimum,
    maximum: Math.min(2200, Math.max(minimum, Math.ceil(boundedSourceLength * 1.3))),
  }
}

export type CreatorDecisionAction =
  | 'initialize'
  | 'propose_intent'
  | 'answer_intent'
  | 'lock_intent'
  | 'reopen_intent'
  | 'search_candidates'
  | 'select_candidate'
  | 'mix_candidates'
  | 'reject_candidate'
  | 'generate_scene'
  | 'adopt_scene'
  | 'record_author_edit'
  | 'review_scene'
  | 'propose_repair'
  | 'accept_repair'
  | 'reject_repair'
  | 'defer_advisory_finding'
  | 'dismiss_finding'
  | 'rehearse_characters'
  | 'propose_canon_patch'
  | 'commit_canon'

export interface UseCreationDecisionSessionInput {
  activeDraft: PmfLocalDraft | null
  workId: string
  branchId: string
  chapterId: string
  chapterNumber?: number | null
  sceneId: string | null
  manuscript: string
  chapters: PmfChapter[]
  settingAssets: PmfLocalSettingAsset[]
  manualRecallItems: ManualRecallItem[]
  linkedRequest: PmfReaderRequest | null
  runtimeProjection?: CreatorDecisionRuntimeProjection | null
  onApplyManuscript: (content: string) => void
}

async function restoreOrCreateSession(input: UseCreationDecisionSessionInput) {
  if (input.activeDraft && !hasExplicitCreatorChapterIdentity(input.chapterId)) {
    const currentCanon = await creatorLocalDecisionRepository.loadCanonState(input.workId, input.chapterId)
    const session = await migrateLegacyDraftToCreationSession({
      draft: input.activeDraft,
      repository: creatorLocalDecisionRepository,
      chapterId: input.chapterId,
      sceneId: input.sceneId,
      baseCanonRevision: currentCanon?.revision || 0,
    })
    return workflow.reload(session.id)
  }
  const id = creatorEditorCreationSessionId(input)
  const existing = await creatorLocalDecisionRepository.loadSessionSnapshot(id)
  if (existing) return existing
  const currentCanon = await creatorLocalDecisionRepository.loadCanonState(input.workId, input.chapterId)
  const session = createCreationSession({
    id,
    workId: input.workId,
    branchId: input.branchId,
    chapterId: input.chapterId,
    sceneId: input.sceneId,
    baseCanonRevision: currentCanon?.revision || 0,
  })
  await Promise.all([
    creatorLocalDecisionRepository.saveSession(session),
    creatorLocalDecisionRepository.appendEvent(creationDecisionEvent({
      sessionId: session.id,
      type: 'session_started',
      actor: 'author',
      sourceRevision: session.baseCanonRevision,
      payload: { sceneId: session.sceneId, localOnly: true },
    })),
  ])
  return workflow.reload(session.id)
}

function productError(error: unknown) {
  if (!(error instanceof CreationDecisionError)) return '本机创作记录未完成，请重试。'
  const messages: Record<CreationDecisionError['code'], string> = {
    invalid_phase_transition: '当前阶段还不能执行这个动作。',
    intent_incomplete: '请先回答关键问题，再锁定本章意图。',
    intent_not_locked: '请先锁定本章意图。',
    candidate_search_not_ready: '锁定本章意图后才能比较路径。',
    candidate_not_selected: '请先选择一条叙事路径。',
    invalid_generation_scope: '这次操作超出了当前场景范围。',
    multi_scene_generation_forbidden: '一次只能处理一个场景。',
    multi_chapter_generation_forbidden: '一次只能处理当前场景，不能批量生成章节。',
    stale_result: '正文或设定已经变化，这份结果只保留为备选。',
    evidence_missing: '有结论无法精确定位到当前正文，请重新审阅。',
    recent_scene_context_required: '续写长篇前，请先保留本章已写正文，或在右侧选择一条近期因果记忆。',
    hard_block_unresolved: '仍有连续性问题需要先处理。',
    author_confirmation_required: '写入主宇宙前需要作者明确确认。',
    scene_author_decision_required: '请先选择一条新的场景方向，正文尚未生成。',
    scene_author_direction_draft_rejected: '这份候选没有真正执行你选定的场景方向，未进入正文。',
    author_decision_option_invalid: '这条场景方向已经失效，请重新选择。',
    canon_revision_conflict: '主宇宙状态已变化，请重新准备差异。',
    draft_revision_conflict: '正文版本已变化，请重新生成或比较。',
    expected_value_conflict: '状态基础已变化，请重新检查差异。',
    local_persistence_failed: '本机保存未完成，请重试。',
    model_output_invalid: '写作服务返回了无法验证的结构，请重试。',
    request_cancelled: '这次写作请求已取消，正文没有变化。',
    character_simulation_unavailable: '当前写作搭档尚未提供角色排练。',
  }
  return messages[error.code]
}

export function useCreationDecisionSession(input: UseCreationDecisionSessionInput) {
  const [snapshot, setSnapshot] = useState<CreationDecisionSnapshot | null>(null)
  const [pendingAction, setPendingAction] = useState<CreatorDecisionAction | null>('initialize')
  const [notice, setNotice] = useState('正在恢复本机创作决策。')
  const [previewDraftId, setPreviewDraftId] = useState<string | null>(null)
  const [preferredRepairId, setPreferredRepairId] = useState<string | null>(null)
  const [focusedEvidence, setFocusedEvidence] = useState<LiteraryEvidence | null>(null)
  const [protectedBlockIds, setProtectedBlockIds] = useState<string[]>([])
  const suppressNextManuscriptRef = useRef<string | null>(null)
  const snapshotRef = useRef<CreationDecisionSnapshot | null>(null)
  const operationQueueRef = useRef<Promise<unknown>>(Promise.resolve())
  const inputRef = useRef(input)
  inputRef.current = input
  snapshotRef.current = snapshot

  const identity = input.workId && input.branchId && input.chapterId
    ? creatorEditorCreationSessionId(input)
    : ''

  useEffect(() => {
    setPreferredRepairId(null)
    if (!identity) {
      setSnapshot(null)
      setPendingAction(null)
      setNotice('选择作品和写作去向后建立创作意图。')
      return
    }
    let cancelled = false
    setPendingAction('initialize')
    void restoreOrCreateSession(inputRef.current)
      .then(restored => {
        if (cancelled) return
        const restoredDraft = activeSceneDraft(restored)
        const restoredManuscript = restoredDraft
          ? draftTextFromBlocks(restoredDraft.contentBlocks)
          : ''
        if (restoredDraft && shouldApplyRestoredCreatorManuscript({
          currentManuscript: inputRef.current.manuscript,
          localDraftUpdatedAt: inputRef.current.activeDraft?.updatedAt,
          restoredDraftCreatedAt: restoredDraft.createdAt,
          restoredManuscript,
        })) {
          suppressNextManuscriptRef.current = restoredManuscript
          inputRef.current.onApplyManuscript(restoredManuscript)
        }
        setSnapshot(restored)
        setNotice(restored.intents.length
          ? '本机创作决策已恢复。'
          : '正文保持原样；先为当前章节建立创作意图。')
      })
      .catch(error => {
        if (!cancelled) setNotice(productError(error))
      })
      .finally(() => {
        if (!cancelled) setPendingAction(null)
      })
    return () => {
      cancelled = true
    }
  }, [identity])

  const run = useCallback(async <T,>(
    action: CreatorDecisionAction,
    command: (current: CreationDecisionSnapshot) => Promise<{ snapshot: CreationDecisionSnapshot; value: T }>,
    success: string,
  ) => {
    const execute = async () => {
      const current = snapshotRef.current
      if (!current) return null
      setPendingAction(action)
      try {
        const result = await command(current)
        snapshotRef.current = result.snapshot
        setSnapshot(result.snapshot)
        setNotice(success)
        return result.value
      } catch (error) {
        setNotice(productError(error))
        return null
      } finally {
        setPendingAction(null)
      }
    }
    const queued = operationQueueRef.current.then(execute, execute)
    operationQueueRef.current = queued.then(() => undefined, () => undefined)
    return queued
  }, [])

  const intent = snapshot ? currentAuthorIntent(snapshot) : null
  const context = snapshot ? currentContextSnapshot(snapshot) : null
  const selectedCandidate = snapshot ? selectedNarrativeCandidate(snapshot) : null
  const activeDraft = snapshot ? activeSceneDraft(snapshot) : null
  const review = snapshot ? activeLiteraryReview(snapshot) : null
  const patch = snapshot ? activeCanonPatch(snapshot) : null
  const previewDraft = snapshot
    ? snapshot.drafts.find(draft => draft.draftId === previewDraftId) || null
    : null
  const proposedRepair = snapshot
    ? resolveVisibleRepairProposal(
        snapshot.repairs,
        preferredRepairId,
        snapshot.session.activeReviewId,
      )
    : null
  const blocks = activeDraft && draftTextFromBlocks(activeDraft.contentBlocks) === input.manuscript
    ? activeDraft.contentBlocks
    : manuscriptBlocks(input.manuscript, protectedBlockIds)
  const writingAssistRecommendation = snapshot && context && activeDraft && !review
    ? recommendWritingAssistLenses({
        preferences: readCreatorWritingAssistPreferences(),
        session: snapshot.session,
        context,
        draft: activeDraft,
        generatedAt: snapshot.session.updatedAt,
      })
    : null

  useEffect(() => {
    if (pendingAction || !snapshot?.session.activeDraftId || !activeDraft) return
    if (suppressNextManuscriptRef.current === input.manuscript) {
      suppressNextManuscriptRef.current = null
      return
    }
    const currentText = draftTextFromBlocks(activeDraft.contentBlocks)
    if (input.manuscript === currentText) return
    const scheduled: CreatorEditorAuthorEditGuard = {
      activeDraftId: activeDraft.draftId,
      draftRevision: activeDraft.revision,
      manuscript: input.manuscript,
      phase: snapshot.session.phase,
    }
    const timer = window.setTimeout(() => {
      const latest = snapshotRef.current
      if (!latest?.session.activeDraftId) return
      const latestDraft = activeSceneDraft(latest)
      if (!latestDraft || !shouldRecordCreatorEditorAuthorEdit({
        scheduled,
        current: {
          activeDraftId: latestDraft.draftId,
          draftRevision: latestDraft.revision,
          manuscript: inputRef.current.manuscript,
          phase: latest.session.phase,
        },
      })) return
      void run(
        'record_author_edit',
        current => workflow.recordAuthorEdit({
          snapshot: current,
          content: scheduled.manuscript,
          editedBlockIds: latestDraft.contentBlocks.map(block => block.id),
          protectedBlockIds,
        }),
        '作者修改已保存，旧审阅和正史差异已失效。',
      )
    }, 700)
    return () => window.clearTimeout(timer)
  }, [activeDraft, input.manuscript, pendingAction, protectedBlockIds, run, snapshot?.session.activeDraftId, snapshot?.session.phase])

  const generateScene = useCallback((requestedScope?: SceneDraftRequest['scope']) => {
    const scope = requestedScope || {
      type: 'scene' as const,
      sceneId: inputRef.current.sceneId,
      beatIds: [],
      selectedBlockIds: [],
    }
    return run(
      'generate_scene',
      async current => {
        const currentIntent = currentAuthorIntent(current)
        const candidate = selectedNarrativeCandidate(current)
        const currentContext = currentContextSnapshot(current)
        if (!currentIntent || !candidate || !currentContext) {
          throw new CreationDecisionError('candidate_not_selected', 'Select a current narrative path first.')
        }
        const currentBlocks = manuscriptBlocks(inputRef.current.manuscript, protectedBlockIds)
        const request: SceneDraftRequest = {
          sessionId: current.session.id,
          intentId: currentIntent.id,
          intentRevision: currentIntent.revision,
          candidateId: candidate.id,
          candidateRevision: candidate.revision,
          contextSnapshotId: currentContext.id,
          baseCanonRevision: current.session.baseCanonRevision,
          baseDraftRevision: current.session.currentDraftRevision,
          scope,
          protectedBlockIds,
          targetLength: creatorSceneDraftTargetLength(scope, currentBlocks),
          writingMode: scope.type === 'selected_text'
            ? 'rewrite_selected_range'
            : inputRef.current.manuscript.trim()
              ? 'continue_author_text'
              : 'agent_first_draft',
          chapterNumber: inputRef.current.chapterNumber,
        }
        const result = await workflow.generateSceneDraft({
          snapshot: current,
          request,
          currentBlocks,
        })
        setPreviewDraftId(result.value.draftId)
        return result
      },
      '场景候选已生成，尚未改动作者正文。',
    )
  }, [protectedBlockIds, run])

  const rehearseCharacters = useCallback(async (
    request: CharacterSimulationRequest,
  ): Promise<CharacterSimulationResult | null> => {
    setPendingAction('rehearse_characters')
    try {
      const result = await runCreatorCharacterRehearsal(writingAgent, request)
      setNotice('角色排练已通过本机写作搭档返回，等待作者审阅候选。')
      return result
    } catch (error) {
      setNotice(productError(error))
      return null
    } finally {
      setPendingAction(null)
    }
  }, [])

  const actions = useMemo(() => ({
    proposeIntent: (storySeed = '') => run(
      'propose_intent',
      current => {
        const currentIntent = currentAuthorIntent(current)
        return workflow.proposeIntent({
          snapshot: current,
          seed: buildCreatorEditorIntentSeed({
            settingAssets: inputRef.current.settingAssets,
            linkedRequest: inputRef.current.linkedRequest,
            storySeed,
            currentIntent: currentIntent?.status === 'draft' ? currentIntent : null,
          }),
        })
      },
      '已提出本章意图，只保留最多两个关键问题。',
    ),
    answerIntentOption: (questionId: string, optionId: string) => run(
      'answer_intent',
      current => workflow.answerIntent({ snapshot: current, questionId, optionId }),
      '这一项已由作者确认。',
    ),
    answerIntentCustom: (question: IntentQuestion, answer: string) => {
      const customPatch = customIntentAnswerPatch(question, answer)
      if (!customPatch) {
        setNotice('请先写下你的判断。')
        return Promise.resolve(null)
      }
      return run(
        'answer_intent',
        current => workflow.answerIntent({ snapshot: current, questionId: question.id, customPatch }),
        '自定义判断已写入本章意图。',
      )
    },
    acceptAssumption: (question: IntentQuestion, optionId: string) => run(
      'answer_intent',
      current => workflow.answerIntent({
        snapshot: current,
        questionId: question.id,
        optionId,
        answeredBy: 'agent_assumption',
      }),
      '已采用这项暂定判断，锁定前仍可重新打开。',
    ),
    lockIntent: () => run('lock_intent', current => workflow.lockIntent(current), '本章意图已锁定。'),
    reopenIntent: () => run('reopen_intent', current => workflow.reopenIntent(current), '本章意图已重新打开，旧派生结果已失效。'),
    searchCandidates: () => run(
      'search_candidates',
      current => {
        const currentIntent = currentAuthorIntent(current)
        if (!currentIntent) throw new CreationDecisionError('intent_incomplete', 'Create the chapter intent first.')
        return workflow.searchCandidates({
          snapshot: current,
          source: buildCreatorDecisionContextSource({
            intent: currentIntent,
            canon: current.canon,
            chapters: inputRef.current.chapters,
            settingAssets: inputRef.current.settingAssets,
            manualRecallItems: inputRef.current.manualRecallItems,
            linkedRequest: inputRef.current.linkedRequest,
            workId: inputRef.current.workId,
            branchId: inputRef.current.branchId,
            chapterId: inputRef.current.chapterId,
            chapterNumber: inputRef.current.chapterNumber,
            sceneId: inputRef.current.sceneId,
            manuscript: inputRef.current.manuscript,
            runtimeProjection: inputRef.current.runtimeProjection,
          }),
        })
      },
      '候选路径已通过硬约束和差异检查。',
    ),
    selectCandidate: (candidateId: string) => run(
      'select_candidate',
      current => workflow.selectCandidate({ snapshot: current, candidateId }),
      '叙事路径已由作者选择。',
    ),
    mixCandidates: (candidateIds: [string, string]) => run(
      'mix_candidates',
      current => workflow.mixCandidates({ snapshot: current, candidateIds }),
      '融合路径已加入比较，不会用相似方案补足数量。',
    ),
    rejectCandidate: (candidateId: string) => run(
      'reject_candidate',
      current => workflow.rejectCandidate({ snapshot: current, candidateId }),
      '这条路径已从当前比较中移除。',
    ),
    rehearseCharacters,
    generateScene,
    generateSelectedText: (blockIds: string[]) => generateScene({
      type: 'selected_text',
      sceneId: inputRef.current.sceneId,
      beatIds: [],
      selectedBlockIds: blockIds,
    }),
    adoptPreviewDraft: async () => {
      if (!previewDraftId) return null
      const value = await run(
        'adopt_scene',
        current => workflow.adoptSceneDraft({ snapshot: current, draftId: previewDraftId }),
        '场景候选已由作者采用。',
      )
      if (typeof value === 'string') {
        suppressNextManuscriptRef.current = value
        inputRef.current.onApplyManuscript(value)
        setPreviewDraftId(null)
      }
      return value
    },
    rejectPreviewDraft: () => {
      setPreviewDraftId(null)
      setNotice('候选已收起，作者正文没有变化。')
    },
    recordAuthorEdit: async (content: string) => {
      const value = await run(
        'record_author_edit',
        current => {
          const currentDraft = activeSceneDraft(current)
          if (!currentDraft) {
            throw new CreationDecisionError('stale_result', 'The active manuscript is no longer current.')
          }
          return workflow.recordAuthorEdit({
            snapshot: current,
            content,
            editedBlockIds: currentDraft.contentBlocks.map(block => block.id),
            protectedBlockIds,
          })
        },
        '作者修改已保存，旧审阅和正史差异已失效。',
      )
      if (value) {
        suppressNextManuscriptRef.current = content
        inputRef.current.onApplyManuscript(content)
      }
      return value
    },
    reviewDraft: (focusLensIds: WritingAssistLensId[] = []) => run(
      'review_scene',
      current => {
        const currentIntent = currentAuthorIntent(current)
        if (!currentIntent) throw new CreationDecisionError('intent_incomplete', 'Create the chapter intent first.')
        return workflow.reviewDraft({
          snapshot: current,
          source: buildCreatorDecisionContextSource({
            intent: currentIntent,
            canon: current.canon,
            chapters: inputRef.current.chapters,
            settingAssets: inputRef.current.settingAssets,
            manualRecallItems: inputRef.current.manualRecallItems,
            linkedRequest: inputRef.current.linkedRequest,
            workId: inputRef.current.workId,
            branchId: inputRef.current.branchId,
            chapterId: inputRef.current.chapterId,
            chapterNumber: inputRef.current.chapterNumber,
            sceneId: inputRef.current.sceneId,
            manuscript: inputRef.current.manuscript,
            runtimeProjection: inputRef.current.runtimeProjection,
          }),
          focusDimensions: focusLensIds.filter(isLiteraryDimension),
          focusLensIds,
          writingAssistPreferences: readCreatorWritingAssistPreferences(),
        })
      },
      localWorkingAgentUrl
        ? '独立审阅完成；审阅结论已经过逐字证据校验。'
        : '本机规则检查完成；未连接独立审阅时只报告确定性问题。',
    ),
    focusFinding: (evidence: LiteraryEvidence | null) => setFocusedEvidence(evidence),
    proposeRepair: async (findingId: string) => {
      const repair = await run(
        'propose_repair',
        current => workflow.proposeRepair({ snapshot: current, findingId }),
        '已生成局部修改，只影响证据所在段落。',
      )
      if (repair) setPreferredRepairId(repair.id)
      return repair
    },
    acceptRepair: async (repairId: string) => {
      const value = await run(
        'accept_repair',
        current => workflow.acceptRepair({ snapshot: current, repairId }),
        '局部修改已由作者采用，请重新审阅。',
      )
      if (typeof value === 'string') {
        setPreferredRepairId(null)
        suppressNextManuscriptRef.current = value
        inputRef.current.onApplyManuscript(value)
      }
      return value
    },
    rejectRepair: async (repairId: string) => {
      const value = await run(
        'reject_repair',
        current => workflow.rejectRepair({ snapshot: current, repairId }),
        '局部候选已放弃，正文没有变化。',
      )
      if (value) setPreferredRepairId(null)
      return value
    },
    dismissFinding: (findingId: string) => run(
      'dismiss_finding',
      current => workflow.dismissFinding({ snapshot: current, findingId }),
      '本次建议已忽略，不会形成永久偏好。',
    ),
    dismissAdvisoryFinding: (findingId: string) => run(
      'dismiss_finding',
      current => workflow.dismissAdvisoryFinding({ snapshot: current, findingId }),
      '这条写作建议已收起，正文没有变化。',
    ),
    deferAdvisoryFinding: (findingId: string) => run(
      'defer_advisory_finding',
      current => workflow.deferAdvisoryFinding({ snapshot: current, findingId }),
      '这条写作建议已留到稍后，正文没有变化。',
    ),
    proposeCanonPatch: () => run(
      'propose_canon_patch',
      current => workflow.proposeCanonPatch(current),
      '正史差异已准备，尚未写入主宇宙。',
    ),
    confirmCanon: () => run(
      'commit_canon',
      current => workflow.confirmCanon(current),
      '正文及状态变更已由作者确认并写入本机主宇宙。',
    ),
    protectBlocks: (blockIds: string[]) => {
      setProtectedBlockIds(current => Array.from(new Set([...current, ...blockIds])))
      setNotice('所选段落已保护，后续局部生成不会改写。')
    },
    unprotectBlock: (blockId: string) => {
      setProtectedBlockIds(current => current.filter(id => id !== blockId))
      setNotice('该段落已解除保护。')
    },
  }), [generateScene, previewDraftId, protectedBlockIds, rehearseCharacters, run])

  return {
    snapshot,
    session: snapshot?.session || null,
    intent,
    intentQuestions: intent ? nextIntentQuestions(intent) : [],
    context,
    candidates: snapshot?.candidates.filter(candidate => candidate.status === 'active' || candidate.status === 'selected') || [],
    selectedCandidate,
    activeDraft,
    previewDraft,
    review,
    writingAssistRecommendation,
    proposedRepair,
    patch,
    canon: snapshot?.canon || null,
    blocks,
    focusedEvidence,
    protectedBlockIds,
    pendingAction,
    notice,
    agentMode: localWorkingAgentUrl ? 'working' as const : 'reference' as const,
    actions,
  }
}
