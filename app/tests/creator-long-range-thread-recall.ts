import assert from 'node:assert/strict'

import {
  buildVerifiedLongRangeThreadRecords,
  buildVerifiedLongRangeThreadRecallCandidates,
  computeLongRangeThreadSourceRevision,
  confirmVerifiedLongRangeThreadRecallSelection,
  projectVerifiedLongRangeThreadRecordsToRecallCandidates,
} from '../src/features/creator-decision/longRangeThreadRecall'
import type { LongformContinuityChapter } from '../src/features/creator-decision/longformContinuity'
import type {
  LongRangeStoryThreadReview,
  LongRangeStoryThreadVerification,
} from '../src/features/creator-decision/longRangeStoryThreads'
import {
  buildCreatorRecallCandidates,
  resolveManualRecallItems,
} from '../src/apps/creator/routes/creatorEditorRecallViewModels'

const chapters: LongformContinuityChapter[] = [1, 2, 3].map(chapterNumber => ({
  chapterNumber,
  chapterId: `chapter:${chapterNumber}`,
  blocks: [{ id: `block:${chapterNumber}`, text: `第${chapterNumber}章证据：旧债、误信与时间锚点。` }],
}))
const computedRevision = await computeLongRangeThreadSourceRevision(chapters)
assert.ok(Number.isInteger(computedRevision) && computedRevision > 0)
assert.equal(await computeLongRangeThreadSourceRevision(structuredClone(chapters)), computedRevision)
const changedRevisionChapters = structuredClone(chapters)
changedRevisionChapters[1]!.blocks[0]!.text += '正文变化。'
assert.notEqual(await computeLongRangeThreadSourceRevision(changedRevisionChapters), computedRevision)
await assert.rejects(
  () => computeLongRangeThreadSourceRevision(chapters.slice(0, 2)),
  /at least three chapters/u,
)
const review: LongRangeStoryThreadReview = {
  schemaVersion: 'creator-long-range-story-thread-review.v1',
  focus: 'causal_state',
  fromChapter: 1,
  toChapter: 3,
  inspectedChapterNumbers: [1, 2, 3],
  inspectedDimensions: ['causal_debt', 'character_knowledge', 'timeline_anchor'],
  threads: [{
    threadId: 'thread:debt',
    dimension: 'causal_debt',
    label: '未偿还旧债',
    statement: '第一章留下的旧债仍在对当前选择施压。',
    sourceChapter: 1,
    sourceEvidenceQuote: '第1章证据',
    status: 'active',
    latestEvidence: null,
    involvedCharacters: ['角色甲'],
    whyItMatters: '继续写作前需要决定是否承接这条旧债。',
    confidence: 'medium',
  }, {
    threadId: 'thread:knowledge',
    dimension: 'character_knowledge',
    label: '仍未拆穿的误信',
    statement: '角色甲仍把错误线索当成真相。',
    sourceChapter: 2,
    sourceEvidenceQuote: '第2章证据',
    status: 'active',
    latestEvidence: null,
    involvedCharacters: ['角色甲'],
    whyItMatters: '人物不能突然知道尚未获得的信息。',
    confidence: 'low',
  }, {
    threadId: 'thread:timeline',
    dimension: 'timeline_anchor',
    label: '时间已经推进',
    statement: '时间锚点已经在第三章得到推进。',
    sourceChapter: 1,
    sourceEvidenceQuote: '第1章证据',
    status: 'progressed',
    latestEvidence: {
      chapter: 3,
      quote: '第3章证据',
      meaning: '后续事件已经推进了原有时间锚点。',
    },
    involvedCharacters: [],
    whyItMatters: '这条线程已经推进，不应继续作为活跃提醒。',
    confidence: 'high',
  }],
  findings: [],
}
const verification: LongRangeStoryThreadVerification = {
  schemaVersion: 'creator-long-range-story-thread-verification.v1',
  focus: 'causal_state',
  threadItems: review.threads.map(thread => ({
    threadId: thread.threadId,
    decision: 'verify' as const,
    confirmedStatus: thread.status,
    sourceEvidenceQuote: thread.sourceEvidenceQuote,
    latestEvidenceQuote: thread.latestEvidence?.quote ?? null,
    rationale: '逐字证据与线程状态一致，可以保留当前判断。',
  })),
  findingItems: [],
  rationale: '所有线程均逐项核对，未发现无证据判断。',
}

const candidates = buildVerifiedLongRangeThreadRecallCandidates({
  workId: 'work:fixture',
  branchId: 'branch:main',
  currentChapterNo: 3,
  sourceRevision: 7,
  chapters,
  review,
  verification,
})
assert.equal(candidates.length, 2)
assert.deepEqual(candidates.map(candidate => candidate.group), ['causal', 'character_knowledge'])
assert.ok(candidates.every(candidate => candidate.selectionState === 'unselected'))
assert.ok(candidates.every(candidate => candidate.authorSelectionRequired))
assert.ok(candidates.every(candidate => candidate.locator.kind === 'canon'))
assert.ok(!candidates.some(candidate => candidate.threadId === 'thread:timeline'))

assert.throws(() => buildVerifiedLongRangeThreadRecords({
  workId: 'work:fixture',
  branchId: 'branch:main',
  sourceRevision: 7,
  chapters,
  review,
  verification,
  authorConfirmedImport: false,
  verifiedAt: '2026-07-17T10:00:00.000Z',
}), /explicit author confirmation/u)

const records = buildVerifiedLongRangeThreadRecords({
  workId: 'work:fixture',
  branchId: 'branch:main',
  sourceRevision: 7,
  chapters,
  review,
  verification,
  authorConfirmedImport: true,
  verifiedAt: '2026-07-17T10:00:00.000Z',
})
assert.equal(records.length, 3)
assert.equal(records.filter(record => record.status === 'active').length, 2)
assert.ok(records.every(record => record.localOnly && record.importedBy === 'author-confirmed'))

const projectedRecords = projectVerifiedLongRangeThreadRecordsToRecallCandidates({
  records,
  workId: 'work:fixture',
  branchId: 'branch:main',
  currentChapterNo: 3,
  currentSourceRevision: 7,
  chapters,
})
assert.deepEqual(projectedRecords.map(candidate => candidate.threadId), ['thread:debt', 'thread:knowledge'])
assert.ok(projectedRecords.every(candidate => candidate.selectionState === 'unselected'))
assert.equal(projectVerifiedLongRangeThreadRecordsToRecallCandidates({
  records,
  workId: 'work:fixture',
  branchId: 'branch:main',
  currentChapterNo: 3,
  currentSourceRevision: 8,
  chapters,
}).length, 0)
const tamperedChapters = structuredClone(chapters)
tamperedChapters[0]!.blocks[0]!.text = '正文已经被改写，旧引文不再存在。'
assert.equal(projectVerifiedLongRangeThreadRecordsToRecallCandidates({
  records,
  workId: 'work:fixture',
  branchId: 'branch:main',
  currentChapterNo: 3,
  currentSourceRevision: 7,
  chapters: tamperedChapters,
}).length, 1)

const recallDirectory = buildCreatorRecallCandidates({
  chapters: [],
  settingAssets: [],
  linkedRequest: null,
  workId: 'work:fixture',
  branchId: 'branch:main',
  chapterId: 'chapter:3',
  chapterNumber: 3,
  longRangeThreadRecallCandidates: [
    ...candidates,
    { ...candidates[0]!, id: 'foreign-work', workId: 'work:foreign' },
    { ...candidates[0]!, id: 'foreign-branch', branchId: 'branch:foreign' },
    { ...candidates[0]!, id: 'future-source', sourceChapter: 3 },
  ],
})
assert.deepEqual(recallDirectory.map(candidate => candidate.id), candidates.map(candidate => candidate.id))
assert.ok(recallDirectory.every(candidate => !candidate.recommended))
const selectedFromDirectory = resolveManualRecallItems(recallDirectory, [recallDirectory[0]!.id])
assert.equal(selectedFromDirectory.length, 1)
assert.equal(selectedFromDirectory[0]!.sourceId, candidates[0]!.sourceId)

assert.throws(() => confirmVerifiedLongRangeThreadRecallSelection({
  candidates,
  selectedCandidateIds: [candidates[0]!.id],
  authorConfirmed: false,
}), /explicit author confirmation/u)
assert.throws(() => confirmVerifiedLongRangeThreadRecallSelection({
  candidates,
  selectedCandidateIds: ['candidate:unknown'],
  authorConfirmed: true,
}), /unknown candidate/u)

const selected = confirmVerifiedLongRangeThreadRecallSelection({
  candidates,
  selectedCandidateIds: [candidates[1]!.id, candidates[0]!.id, candidates[1]!.id],
  authorConfirmed: true,
})
assert.equal(selected.length, 2)
assert.ok(selected.every(item => !('selectionState' in item)))
assert.ok(selected.every(item => item.sourceRevision === 7))

const tamperedVerification = structuredClone(verification)
tamperedVerification.threadItems[0]!.sourceEvidenceQuote = '旧债'
assert.throws(() => buildVerifiedLongRangeThreadRecallCandidates({
  workId: 'work:fixture',
  branchId: 'branch:main',
  currentChapterNo: 3,
  sourceRevision: 7,
  chapters,
  review,
  verification: tamperedVerification,
}), /preserve its exact source-only evidence/u)

assert.throws(() => buildVerifiedLongRangeThreadRecallCandidates({
  workId: 'work:fixture',
  branchId: 'branch:main',
  currentChapterNo: 2,
  sourceRevision: 7,
  chapters,
  review,
  verification,
}), /current or a future chapter/u)

console.log('[creator-long-range-thread-recall] PASS')
