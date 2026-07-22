import assert from 'node:assert/strict'
import { buildCreatorDecisionPhaseViewModel } from '../src/apps/creator/routes/creatorEditorViewModels'
import {
  resolveCreatorEditorDecisionIdentity,
  resolveCreatorEditorWritingChapterNumber,
} from '../src/apps/creator/routes/creatorEditorDecisionSessionController'
import { createCreationSession } from '../src/features/creator-decision/stateMachine'

const session = createCreationSession({
  id: 'creation-session:ui-contract',
  workId: 'work:ui-contract',
  branchId: 'branch:ui-contract',
  chapterId: 'chapter:ui-contract',
  sceneId: 'scene:ui-contract',
  now: '2026-07-13T12:00:00.000Z',
})

assert.equal(buildCreatorDecisionPhaseViewModel(session).activePhase, 'intent')
assert.equal(
  buildCreatorDecisionPhaseViewModel({ ...session, phase: 'intent_locked' }).activePhase,
  'path',
  'locking intent must expose candidate search as the next UI phase',
)
assert.equal(
  buildCreatorDecisionPhaseViewModel({ ...session, phase: 'canon_committed' }).activePhase,
  'canon',
)

assert.deepEqual(resolveCreatorEditorDecisionIdentity({
  activeDraft: null,
  requestChapter: {
    id: 'chapter:request',
    work_id: 'work:ui-contract',
    branch_id: 'branch:ui-contract',
    chapter_no: 1,
    title: 'Request chapter',
    content: 'Published body',
    status: 'published',
    published_at: '2026-07-12T12:00:00.000Z',
  },
  latestChapter: null,
  selectedWorkId: 'work:ui-contract',
  resolvedBranchId: 'branch:ui-contract',
}), {
  chapterId: 'local-chapter:work:ui-contract:branch:ui-contract:chapter:1',
  chapterNumber: 1,
  sceneId: 'local-scene:work:ui-contract:branch:ui-contract:chapter:1',
})

const latestChapter = {
  id: 'chapter:latest',
  work_id: 'work:ui-contract',
  branch_id: 'branch:ui-contract',
  chapter_no: 6,
  title: 'Latest chapter',
  content: 'Published body',
  status: 'published' as const,
  published_at: '2026-07-12T12:00:00.000Z',
}
assert.equal(resolveCreatorEditorWritingChapterNumber({
  activeDraft: null,
  requestChapter: null,
  latestChapter,
  selectedWorkId: 'work:ui-contract',
  resolvedBranchId: 'branch:ui-contract',
}), 7, 'a new unscoped draft must continue after the latest chapter in the resolved branch')
assert.equal(resolveCreatorEditorWritingChapterNumber({
  activeDraft: {
    localDraftRef: 'draft:chapter-4',
    requestId: null,
    workId: 'work:ui-contract',
    branchId: 'branch:ui-contract',
    chapterNumber: 4,
    title: 'Chapter 4',
    content: 'Local body',
    updatedAt: '2026-07-13T12:00:00.000Z',
  },
  requestChapter: null,
  latestChapter,
  selectedWorkId: 'work:ui-contract',
  resolvedBranchId: 'branch:ui-contract',
}), 4, 'an active local draft chapter number must outrank the latest published chapter')
assert.equal(resolveCreatorEditorWritingChapterNumber({
  activeDraft: null,
  requestChapter: null,
  latestChapter,
  selectedWorkId: 'work:ui-contract',
  resolvedBranchId: 'branch:ui-contract',
  routeChapterNumber: 9,
}), 9, 'an explicit chapter route must remain the authoritative writing position')
assert.deepEqual(resolveCreatorEditorDecisionIdentity({
  activeDraft: null,
  requestChapter: null,
  latestChapter,
  selectedWorkId: 'work:ui-contract',
  resolvedBranchId: 'branch:ui-contract',
}), {
  chapterId: 'local-chapter:work:ui-contract:branch:ui-contract:chapter:7',
  chapterNumber: 7,
  sceneId: 'local-scene:work:ui-contract:branch:ui-contract:chapter:7',
}, 'an inferred next chapter must receive its own stable decision-session identity')
assert.deepEqual(resolveCreatorEditorDecisionIdentity({
  activeDraft: {
    localDraftRef: 'draft:chapter-4',
    requestId: null,
    workId: 'work:ui-contract',
    branchId: 'branch:ui-contract',
    chapterNumber: 4,
    title: 'Chapter 4',
    content: 'Local body',
    updatedAt: '2026-07-13T12:00:00.000Z',
  },
  requestChapter: null,
  latestChapter,
  selectedWorkId: 'work:ui-contract',
  resolvedBranchId: 'branch:ui-contract',
}), {
  chapterId: 'local-chapter:draft:chapter-4',
  chapterNumber: 4,
  sceneId: 'local-scene:draft:chapter-4',
}, 'an existing legacy draft must keep its draft-ref identity for one-way migration compatibility')

console.log('[creator-decision-ui-contract] PASS')
