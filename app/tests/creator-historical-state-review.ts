import assert from 'node:assert/strict'
import {
  buildHistoricalStateReviewItem,
  buildHistoricalStateReviewItems,
  parseHistoricalStateBackfillImports,
} from '../src/apps/creator/routes/creatorHistoricalStateReviewService'
import {
  createHistoricalStateBackfillProposal,
  rejectHistoricalStateBackfillProposal,
} from '../src/features/creator-decision/historicalStateBackfill'
import type {
  HistoricalStateBackfillProposal,
  LocalCanonStateRecord,
  StatePatchOperation,
} from '../src/features/creator-decision/types'
import { MemoryCreationDecisionRepository } from '../src/local-db/creatorLocalDecisionRepository'

const workId = 'work-arad-wayfarer'
const branchId = `${workId}:main`

function canonFor(chapterNumber: number): LocalCanonStateRecord {
  const chapterId = `${workId}:chapter:${chapterNumber}`
  const text = `第 ${chapterNumber} 章中，陆沉舟把封锁线守卫的口令记在心里，并答应天亮前返回北口。`
  return {
    schemaVersion: 'local-canon-state.v1',
    id: `local-canon:${chapterId}`,
    workId,
    chapterId,
    branchId,
    revision: 3,
    acceptedDraftId: `scene-draft:${chapterId}:accepted`,
    acceptedDraftRevision: 2,
    acceptedContentBlocks: [{
      id: `${chapterId}:block:1`,
      text,
      startOffset: 0,
      endOffset: text.length,
      protected: false,
    }],
    state: {
      characters: {
        'lu-chenzhou': {
          knowledge: [],
        },
      },
      timeline: {},
    },
    committedPatchId: `canon-patch:${chapterId}`,
    committedAt: '2026-07-14T20:00:00.000Z',
  }
}

function proposalFor(canon: LocalCanonStateRecord): HistoricalStateBackfillProposal {
  const operations: StatePatchOperation[] = [{
    op: 'replace',
    path: '/characters/lu-chenzhou/knowledge',
    value: ['北口封锁线守卫使用固定口令'],
    evidenceBlockIds: [canon.acceptedContentBlocks[0].id],
    reason: '已采用正文明确写出陆沉舟记住了守卫口令。',
    irreversible: true,
  }]
  return createHistoricalStateBackfillProposal({
    id: `historical-backfill:${canon.chapterId}`,
    sessionId: `creation-session:${canon.chapterId}`,
    canon,
    operations,
    createdAt: '2026-07-15T09:00:00.000Z',
  })
}

const chapter13Canon = canonFor(13)
const chapter16Canon = canonFor(16)
const chapter13Proposal = proposalFor(chapter13Canon)
const chapter16Proposal = proposalFor(chapter16Canon)

const parsed = parseHistoricalStateBackfillImports([
  chapter13Proposal,
  { proposal: chapter13Proposal },
  { proposals: [chapter16Proposal, chapter13Proposal] },
])
assert.deepEqual(
  parsed.map(proposal => proposal.id),
  [chapter13Proposal.id, chapter16Proposal.id],
  'direct, wrapped, and packed proposals must import once per stable proposal id',
)
assert.throws(
  () => parseHistoricalStateBackfillImports([{ proposal: rejectHistoricalStateBackfillProposal(chapter13Proposal) }]),
  /Only pending historical state candidates/,
  'committed, rejected, or stale records must not re-enter pending author review',
)
assert.throws(
  () => parseHistoricalStateBackfillImports([{ unrelated: true }]),
  /No historical state candidates/,
  'unknown files must fail closed instead of creating an empty candidate',
)

const chapter13Review = buildHistoricalStateReviewItem(chapter13Proposal, chapter13Canon)
assert.equal(chapter13Review.chapterNumber, 13)
assert.equal(chapter13Review.canConfirm, true)
assert.equal(chapter13Review.blockingNotice, null)
assert.equal(chapter13Review.operationReviews[0].label, '人物 · 人物所知')
assert.deepEqual(
  chapter13Review.operationReviews[0].evidenceQuotes,
  [chapter13Canon.acceptedContentBlocks[0].text],
  'author review must display exact accepted-manuscript evidence, not an unlocatable summary',
)

const staleReview = buildHistoricalStateReviewItem(chapter13Proposal, {
  ...chapter13Canon,
  revision: chapter13Canon.revision + 1,
})
assert.equal(staleReview.canConfirm, false)
assert.match(staleReview.blockingNotice || '', /正史已变化/)

const missingEvidenceReview = buildHistoricalStateReviewItem({
  ...chapter13Proposal,
  operations: chapter13Proposal.operations.map(operation => ({
    ...operation,
    evidenceBlockIds: ['missing-accepted-block'],
  })),
}, chapter13Canon)
assert.equal(missingEvidenceReview.canConfirm, false)
assert.deepEqual(missingEvidenceReview.operationReviews[0].evidenceQuotes, [])

const repository = new MemoryCreationDecisionRepository()
await repository.saveCanonState(chapter16Canon)
await repository.saveCanonState(chapter13Canon)
const sorted = await buildHistoricalStateReviewItems({
  proposals: [chapter16Proposal, chapter13Proposal],
  repository,
})
assert.deepEqual(
  sorted.map(item => item.chapterNumber),
  [13, 16],
  'the conversation review must follow chapter order instead of import order',
)

console.log('[creator-historical-state-review] PASS')
