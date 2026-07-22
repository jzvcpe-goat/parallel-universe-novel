import assert from 'node:assert/strict'

import { computeLongRangeThreadSourceRevision } from '../src/features/creator-decision/longRangeThreadRecall'
import type { LocalCanonStateRecord } from '../src/features/creator-decision/types'
import {
  buildEditorLongRangeRecallChapters,
  runEditorLongRangeRecallLoad,
} from '../src/apps/creator/routes/creatorEditorLongRangeRecallService'

function canon(chapterNumber: number, revision = 1): LocalCanonStateRecord {
  return {
    schemaVersion: 'local-canon-state.v1',
    id: `canon:${chapterNumber}:${revision}`,
    workId: 'work:fixture',
    chapterId: `work:fixture:chapter:${chapterNumber}`,
    branchId: 'branch:main',
    revision,
    acceptedDraftId: `draft:${chapterNumber}`,
    acceptedDraftRevision: 1,
    acceptedContentBlocks: [{
      id: `block:${chapterNumber}`,
      text: `第 ${chapterNumber} 章正史。`,
      startOffset: 0,
      endOffset: 9,
      protected: false,
    }],
    state: {},
    committedPatchId: null,
    committedAt: '2026-07-17T10:00:00.000Z',
  }
}

const canonStates = [canon(1), canon(2), canon(2, 2), canon(3), {
  ...canon(1),
  id: 'foreign',
  workId: 'work:foreign',
}]
const chapters = buildEditorLongRangeRecallChapters({
  canonStates,
  workId: 'work:fixture',
  branchId: 'branch:main',
  currentChapterNo: 3,
})
assert.deepEqual(chapters.map(chapter => chapter.chapterNumber), [1, 2, 3])

const expectedRevision = await computeLongRangeThreadSourceRevision(chapters)
let receivedRevision = 0
const loaded = await runEditorLongRangeRecallLoad({
  workId: 'work:fixture',
  branchId: 'branch:main',
  currentChapterNo: 3,
}, {
  async readCanonStates() {
    return canonStates
  },
  async loadCandidates(input) {
    receivedRevision = input.currentSourceRevision
    assert.deepEqual(input.chapters, chapters)
    return []
  },
})
assert.equal(loaded.ok, true)
assert.equal(receivedRevision, expectedRevision)

const missingScope = await runEditorLongRangeRecallLoad({
  workId: '',
  branchId: 'branch:main',
  currentChapterNo: 3,
}, {
  async readCanonStates() {
    throw new Error('must not read')
  },
  async loadCandidates() {
    throw new Error('must not load')
  },
})
assert.deepEqual(missingScope, { ok: false, candidates: [], reason: 'missing_scope' })

const insufficient = await runEditorLongRangeRecallLoad({
  workId: 'work:fixture',
  branchId: 'branch:main',
  currentChapterNo: 2,
}, {
  async readCanonStates() {
    return canonStates
  },
  async loadCandidates() {
    throw new Error('must not load')
  },
})
assert.deepEqual(insufficient, { ok: false, candidates: [], reason: 'insufficient_canon' })

console.log('[creator-editor-long-range-recall-service] PASS')
