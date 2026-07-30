import assert from 'node:assert/strict'
import type { PmfLocalDraft } from '../src/features/pmf/types'
import {
  EditorDraftHistoricalRegressionError,
  type SaveEditorDraftInput,
  type SaveEditorDraftResult,
} from '../src/apps/creator/routes/creatorEditorDraftPersistence'
import { runEditorDraftSave } from '../src/apps/creator/routes/creatorEditorDraftSaveService'
import {
  shouldApplyRestoredCreatorManuscript,
  shouldRecordCreatorEditorAuthorEdit,
} from '../src/apps/creator/routes/creatorEditorAuthorEditGuard'

const baseInput = {
  activeDraftRef: 'local-draft:stale-guard-fixture',
  branchId: 'branch:main',
  chapterNumber: 20,
  content: 'An older full chapter body.',
  linkedRequest: null,
  readiness: {
    authorReady: true,
    contentReady: true,
    destinationReady: true,
    titleReady: true,
  },
  title: 'Chapter 20',
  workId: 'work:stale-guard-fixture',
}

const blocked = await runEditorDraftSave(baseInput, {
  save: async () => {
    throw new EditorDraftHistoricalRegressionError(2)
  },
})

assert.equal(blocked.ok, false)
assert.match(blocked.notice, /较早的本机版本 r2/)
assert.match(blocked.notice, /本次未保存/)

await assert.rejects(
  runEditorDraftSave(baseInput, {
    save: async () => {
      throw new Error('unexpected persistence failure')
    },
  }),
  /unexpected persistence failure/,
)

let savedInput: SaveEditorDraftInput | null = null
const freshDraft: PmfLocalDraft = {
  localDraftRef: baseInput.activeDraftRef,
  requestId: null,
  workId: baseInput.workId,
  branchId: baseInput.branchId,
  chapterNumber: baseInput.chapterNumber,
  title: 'Chapter 20 revised',
  content: 'A genuinely new full chapter body.',
  updatedAt: '2026-07-18T12:00:00.000Z',
}
const successful = await runEditorDraftSave({
  ...baseInput,
  title: freshDraft.title,
  content: freshDraft.content,
}, {
  save: async (input): Promise<SaveEditorDraftResult> => {
    savedInput = input
    return {
      draft: freshDraft,
      drafts: [freshDraft],
      creativeReminders: null,
    }
  },
})

assert.equal(successful.ok, true)
assert.equal(successful.draft.content, freshDraft.content)
assert.equal(savedInput?.content, freshDraft.content)
assert.match(successful.notice, /已保存私密草稿/)

const scheduledAuthorEdit = {
  activeDraftId: 'scene-draft:chapter-20-r4',
  draftRevision: 4,
  manuscript: 'Chapter 20 revised locally.',
  phase: 'canon_patch_pending' as const,
}

assert.equal(shouldRecordCreatorEditorAuthorEdit({
  scheduled: scheduledAuthorEdit,
  current: scheduledAuthorEdit,
}), true)

assert.equal(shouldRecordCreatorEditorAuthorEdit({
  scheduled: scheduledAuthorEdit,
  current: {
    ...scheduledAuthorEdit,
    phase: 'canon_committed',
  },
}), false, 'a pending author-edit timer must not overwrite a committed canon session')

assert.equal(shouldRecordCreatorEditorAuthorEdit({
  scheduled: scheduledAuthorEdit,
  current: {
    ...scheduledAuthorEdit,
    activeDraftId: 'scene-draft:chapter-20-r5',
    draftRevision: 5,
  },
}), false, 'a pending author-edit timer must not overwrite a newer draft revision')

assert.equal(shouldRecordCreatorEditorAuthorEdit({
  scheduled: scheduledAuthorEdit,
  current: {
    ...scheduledAuthorEdit,
    manuscript: 'A later author edit.',
  },
}), false, 'a pending author-edit timer must not save text that has changed again')

assert.equal(shouldApplyRestoredCreatorManuscript({
  currentManuscript: 'Older route draft.',
  localDraftUpdatedAt: '2026-07-18T12:00:00.000Z',
  restoredDraftCreatedAt: '2026-07-18T12:01:00.000Z',
  restoredManuscript: 'Newer decision draft.',
}), true, 'a newer decision draft must win recovery over an older route draft')

assert.equal(shouldApplyRestoredCreatorManuscript({
  currentManuscript: 'Newer route draft.',
  localDraftUpdatedAt: '2026-07-18T12:02:00.000Z',
  restoredDraftCreatedAt: '2026-07-18T12:01:00.000Z',
  restoredManuscript: 'Older decision draft.',
}), false, 'recovery must not overwrite a newer route draft')

assert.equal(shouldApplyRestoredCreatorManuscript({
  currentManuscript: '',
  localDraftUpdatedAt: null,
  restoredDraftCreatedAt: '2026-07-18T12:01:00.000Z',
  restoredManuscript: 'Recovered decision draft.',
}), true, 'an empty editor should restore the current decision draft')

console.log('creator editor stale draft guard test passed')
