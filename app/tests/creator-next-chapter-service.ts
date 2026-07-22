import assert from 'node:assert/strict'
import {
  prepareEditorNextChapter,
  type PrepareEditorNextChapterInput,
  type PrepareEditorNextChapterPorts,
} from '../src/apps/creator/routes/creatorEditorNextChapterService'
import {
  CreationDecisionError,
  type CreationSession,
  type LiteraryReview,
  type LocalCanonStateRecord,
  type RepairProposal,
} from '../src/features/creator-decision/types'
import { evaluateNextChapterQualityGate } from '../src/features/creator-decision/nextChapterQualityGate'

const nowIso = '2026-07-15T18:30:00.000Z'

function session(phase: CreationSession['phase']): CreationSession {
  return {
    schemaVersion: 'creation-session.v1',
    id: 'session:test-next-chapter',
    workId: 'work:test-next-chapter',
    chapterId: 'local-chapter:work:test-next-chapter:branch:main:3',
    sceneId: null,
    branchId: 'branch:main',
    phase,
    baseCanonRevision: 3,
    currentIntentRevision: 1,
    currentCandidateRevision: 1,
    currentDraftRevision: 2,
    lockedIntentId: 'intent:test-next-chapter',
    selectedCandidateId: 'candidate:test-next-chapter',
    activeDraftId: 'draft:test-next-chapter',
    activeReviewId: 'review:test-next-chapter',
    proposedCanonPatchId: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  }
}

const currentCanon: LocalCanonStateRecord = {
  schemaVersion: 'local-canon-state.v1',
  id: 'canon:test-next-chapter',
  workId: 'work:test-next-chapter',
  chapterId: 'local-chapter:work:test-next-chapter:branch:main:3',
  branchId: 'branch:main',
  revision: 3,
  acceptedDraftId: 'draft:test-next-chapter',
  acceptedDraftRevision: 2,
  acceptedContentBlocks: [],
  state: { timeline: { chapter: 3 } },
  committedPatchId: 'patch:test-next-chapter',
  committedAt: nowIso,
}

const blockedReview: LiteraryReview = {
  schemaVersion: 'literary-review.v1',
  id: 'review:test-next-chapter',
  sessionId: 'session:test-next-chapter',
  contextSnapshotId: 'legacy-unbound-context',
  contextCompilationPolicyVersion: 0,
  contextSourceFingerprint: 'legacy-unfingerprinted',
  contextSnapshotFingerprint: 'legacy-unfingerprinted',
  draftId: 'draft:test-next-chapter',
  baseCanonRevision: 3,
  baseIntentRevision: 1,
  baseCandidateRevision: 1,
  baseDraftRevision: 2,
  findings: [],
  deterministicViolations: ['timeline continuity remains unresolved'],
  status: 'active',
  createdAt: nowIso,
}

const pendingRepair: RepairProposal = {
  schemaVersion: 'repair-proposal.v1',
  id: 'repair:test-next-chapter',
  reviewId: blockedReview.id,
  findingId: 'finding:test-next-chapter',
  baseDraftRevision: 2,
  operation: 'replace_range',
  targetBlockIds: ['block:test-next-chapter'],
  preservedFacts: ['preserve the author-confirmed consequence'],
  preservedBlockIds: ['block:test-next-chapter'],
  proposedContent: 'candidate only',
  status: 'proposed',
  createdAt: nowIso,
}

assert.equal(evaluateNextChapterQualityGate({
  session: session('canon_committed'),
  review: { ...blockedReview, deterministicViolations: [] },
  repairs: [{
    ...pendingRepair,
    findingSource: { kind: 'advisory_lens', lensId: 'prose_rhythm' },
  }],
}).allowed, true, 'an unresolved advisory candidate must not block the next confirmed chapter')

function input(overrides: Partial<PrepareEditorNextChapterInput> = {}): PrepareEditorNextChapterInput {
  return {
    activeDraftRef: 'local-draft:test-next-chapter',
    branchId: 'branch:main',
    content: 'Synthetic manuscript content.',
    currentCanon,
    currentChapterNumber: 3,
    linkedRequest: null,
    review: null,
    repairs: [],
    session: session('canon_committed'),
    title: 'Synthetic chapter',
    workId: 'work:test-next-chapter',
    nowIso,
    ...overrides,
  }
}

function trackedPorts() {
  const calls = { saveDraft: 0, loadCanonState: 0, saveCanonState: 0 }
  const ports: PrepareEditorNextChapterPorts = {
    saveDraft: async draftInput => {
      calls.saveDraft += 1
      return {
        draft: {
          localDraftRef: draftInput.activeDraftRef,
          title: draftInput.title,
          content: draftInput.content,
          workId: draftInput.workId,
          branchId: draftInput.branchId,
          linkedRequestId: null,
          updatedAt: draftInput.nowIso,
        },
        drafts: [],
        creativeReminders: null,
      }
    },
    loadCanonState: async () => {
      calls.loadCanonState += 1
      return null
    },
    saveCanonState: async () => {
      calls.saveCanonState += 1
    },
  }
  return { calls, ports }
}

const blocked = trackedPorts()
await assert.rejects(
  prepareEditorNextChapter(input({
    review: blockedReview,
    repairs: [pendingRepair],
  }), blocked.ports),
  (error: unknown) => (
    error instanceof CreationDecisionError
    && error.code === 'hard_block_unresolved'
  ),
)
assert.deepEqual(blocked.calls, {
  saveDraft: 0,
  loadCanonState: 0,
  saveCanonState: 0,
})

const unconfirmed = trackedPorts()
await assert.rejects(
  prepareEditorNextChapter(input({ session: session('drafting') }), unconfirmed.ports),
  (error: unknown) => (
    error instanceof CreationDecisionError
    && error.code === 'author_confirmation_required'
  ),
)
assert.deepEqual(unconfirmed.calls, {
  saveDraft: 0,
  loadCanonState: 0,
  saveCanonState: 0,
})

const allowed = trackedPorts()
const result = await prepareEditorNextChapter(input(), allowed.ports)
assert.deepEqual(allowed.calls, {
  saveDraft: 1,
  loadCanonState: 1,
  saveCanonState: 1,
})
assert.equal(result.nextChapterNumber, 4)
assert.equal(result.targetPath, '/creator/inspiration?work=work%3Atest-next-chapter&branch=branch%3Amain&chapter=4')

console.info('[creator-next-chapter-service] PASS')
