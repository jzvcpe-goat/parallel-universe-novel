import type { PmfReaderRequest } from '@/features/pmf/types'
import { evaluateNextChapterQualityGate } from '@/features/creator-decision/nextChapterQualityGate'
import {
  CreationDecisionError,
  type CreationSession,
  type LiteraryReview,
  type LocalCanonStateRecord,
  type RepairProposal,
} from '@/features/creator-decision/types'
import {
  creatorLocalDecisionRepository,
  localCanonStateId,
} from '@/local-db/creatorLocalDecisionRepository'
import { creatorEditorChapterIdentity } from './creatorEditorDecisionSessionController'
import {
  saveEditorDraft,
  type SaveEditorDraftInput,
  type SaveEditorDraftResult,
} from './creatorEditorDraftPersistence'

export interface PrepareEditorNextChapterInput {
  activeDraftRef: string
  branchId: string
  content: string
  currentCanon: LocalCanonStateRecord
  currentChapterNumber: number
  linkedRequest: PmfReaderRequest | null
  review: LiteraryReview | null
  repairs: RepairProposal[]
  session: CreationSession
  title: string
  workId: string
  nowIso?: string
}

export interface PrepareEditorNextChapterResult {
  nextChapterId: string
  nextChapterNumber: number
  targetPath: string
}

export interface PrepareEditorNextChapterPorts {
  saveDraft(input: SaveEditorDraftInput): Promise<SaveEditorDraftResult>
  loadCanonState(workId: string, chapterId: string): Promise<LocalCanonStateRecord | null>
  saveCanonState(canon: LocalCanonStateRecord): Promise<void>
}

const defaultPrepareEditorNextChapterPorts: PrepareEditorNextChapterPorts = {
  saveDraft: saveEditorDraft,
  loadCanonState: (workId, chapterId) => creatorLocalDecisionRepository.loadCanonState(workId, chapterId),
  saveCanonState: canon => creatorLocalDecisionRepository.saveCanonState(canon),
}

export function editorNextChapterBlockedNotice(gate: ReturnType<typeof evaluateNextChapterQualityGate>) {
  if (gate.blockers.some(blocker => blocker.code === 'chapter_not_confirmed')) {
    return '本章还没有完成作者确认，暂不能进入下一章。'
  }
  const hasPendingRepair = gate.blockers.some(blocker => blocker.code === 'pending_repair_decision')
  const hasHardBlock = gate.blockers.some(blocker => blocker.code === 'active_hard_block')
  const hasDeterministicViolation = gate.blockers.some(blocker => blocker.code === 'deterministic_violation')
  if (hasPendingRepair && (hasHardBlock || hasDeterministicViolation)) {
    return '进入下一章前，先决定当前修订候选，并解除本章尚未解决的连续性问题。'
  }
  if (hasPendingRepair) return '进入下一章前，先采用或放下当前修订候选。'
  if (hasHardBlock || hasDeterministicViolation) return '进入下一章前，先解除本章尚未解决的连续性问题。'
  return null
}

export async function prepareEditorNextChapter(
  input: PrepareEditorNextChapterInput,
  ports: PrepareEditorNextChapterPorts = defaultPrepareEditorNextChapterPorts,
): Promise<PrepareEditorNextChapterResult> {
  const qualityGate = evaluateNextChapterQualityGate({
    session: input.session,
    review: input.review,
    repairs: input.repairs,
  })
  if (!qualityGate.allowed) {
    const chapterNotConfirmed = qualityGate.blockers.some(blocker => blocker.code === 'chapter_not_confirmed')
    throw new CreationDecisionError(
      chapterNotConfirmed ? 'author_confirmation_required' : 'hard_block_unresolved',
      editorNextChapterBlockedNotice(qualityGate) || 'Resolve the current chapter before continuing.',
    )
  }

  const nowIso = input.nowIso || new Date().toISOString()
  await ports.saveDraft({
    activeDraftRef: input.activeDraftRef,
    linkedRequest: input.linkedRequest,
    workId: input.workId,
    branchId: input.branchId,
    chapterNumber: input.currentChapterNumber,
    title: input.title,
    content: input.content,
    nowIso,
  })

  const nextChapterNumber = input.currentChapterNumber + 1
  const nextIdentity = creatorEditorChapterIdentity(input.workId, input.branchId, nextChapterNumber)
  const nextChapterId = `local-chapter:${nextIdentity}`
  const existingCanon = await ports.loadCanonState(input.workId, nextChapterId)
  if (!existingCanon) {
    await ports.saveCanonState({
      schemaVersion: 'local-canon-state.v1',
      id: localCanonStateId(input.workId, nextChapterId),
      workId: input.workId,
      chapterId: nextChapterId,
      branchId: input.branchId,
      revision: input.currentCanon.revision,
      acceptedDraftId: null,
      acceptedDraftRevision: 0,
      acceptedContentBlocks: [],
      state: input.currentCanon.state,
      committedPatchId: input.currentCanon.committedPatchId,
      committedAt: input.currentCanon.committedAt,
    })
  }

  const query = new URLSearchParams({
    work: input.workId,
    branch: input.branchId,
    chapter: String(nextChapterNumber),
  })
  return {
    nextChapterId,
    nextChapterNumber,
    targetPath: `/creator/inspiration?${query.toString()}`,
  }
}
