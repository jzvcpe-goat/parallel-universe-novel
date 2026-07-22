import assert from 'node:assert/strict'

import type {
  CreatorLanceDbRetriever,
  CreatorRagRetrievalQuery,
  CreatorRagRetrievalResult,
} from '@/integrations/creator-rag/creatorLanceDbRetriever'
import {
  buildCreatorShadowRecallProposal,
  confirmCreatorShadowRecallSelection,
  createCreatorShadowRecallService,
  type CreatorShadowRecallSource,
} from '@/integrations/creator-rag/creatorShadowRecallService'

const query = {
  text: '主角欠下的代价如何继续施压？',
  workId: 'work:shadow',
  branchId: 'branch:main',
  currentChapterNo: 20,
  manualSelectedSourceIds: ['source:manual'],
  limit: 5,
} satisfies CreatorRagRetrievalQuery

const sources: CreatorShadowRecallSource[] = [
  {
    id: 'source:auto',
    workId: query.workId,
    branchId: query.branchId,
    chapterNo: 4,
    authority: 'canon',
    memoryGroup: 'causal',
    revision: 3,
    group: 'causal',
    whyNow: '旧代价仍在限制当前选择。',
    locator: { recordId: 'chapter:4', label: '第 4 章代价证据' },
    manualLocator: { kind: 'chapter', targetId: 'chapter:4', label: '定位到第 4 章' },
    text: '主角为换取通行付出了不可撤销的代价。',
  },
  {
    id: 'source:manual',
    workId: query.workId,
    branchId: query.branchId,
    chapterNo: 12,
    authority: 'author',
    memoryGroup: 'character_knowledge',
    revision: 2,
    group: 'character_knowledge',
    whyNow: '作者明确要求保留人物误信边界。',
    locator: { recordId: 'asset:knowledge', label: '人物所知卡' },
    manualLocator: { kind: 'asset', targetId: 'asset:knowledge', label: '定位到人物所知卡' },
    text: '同伴仍误以为主角来自帝国边境。',
  },
]

const retrievalResult: CreatorRagRetrievalResult = {
  automaticResults: [{
    sourceId: 'source:auto',
    workId: query.workId,
    branchId: query.branchId,
    chapterNo: 4,
    authority: 'canon',
    memoryGroup: 'causal',
    revision: 3,
    locator: { recordId: 'chapter:4', label: '第 4 章代价证据' },
    text: '主角为换取通行付出了不可撤销的代价。',
  }],
  finalSourceIds: ['source:auto', 'source:manual'],
}

const proposal = buildCreatorShadowRecallProposal({
  query,
  sources,
  result: retrievalResult,
  createdAt: '2026-07-17T15:00:00.000Z',
})
assert.equal(proposal.status, 'shadow_only')
assert.equal(proposal.candidates.length, 1)
assert.equal(proposal.candidates[0]?.group, 'causal')
assert.equal(proposal.candidates[0]?.selectionState, 'unselected')
assert.deepEqual(proposal.manualHardIncludeSourceIds, ['source:manual'])
assert.equal(proposal.authorSelectionRequired, true)
assert.equal(proposal.automaticSelectionApplied, false)
assert.equal(proposal.contextSnapshotChanged, false)
assert.equal(proposal.draftChanged, false)
assert.equal(proposal.canonChanged, false)
assert.equal(proposal.publicationPerformed, false)
assert.equal('id' in proposal.candidates[0]!, false)
assert.equal('statement' in proposal.candidates[0]!, false)

const confirmedSelection = confirmCreatorShadowRecallSelection({
  proposal,
  currentSources: sources,
  selectedProposalIds: [proposal.candidates[0]!.proposalId],
  authorConfirmed: true,
  confirmedAt: '2026-07-17T15:01:00.000Z',
})
assert.equal(confirmedSelection.status, 'confirmed_not_applied')
assert.equal(confirmedSelection.manualRecallItems.length, 1)
assert.equal(confirmedSelection.manualRecallItems[0]?.sourceId, 'source:auto')
assert.equal(confirmedSelection.manualRecallItems[0]?.locator.kind, 'chapter')
assert.equal(confirmedSelection.contextSnapshotChanged, false)
assert.equal(confirmedSelection.canonChanged, false)

let calledQuery: CreatorRagRetrievalQuery | null = null
const retriever: CreatorLanceDbRetriever = {
  async retrieve(value) {
    calledQuery = value
    return retrievalResult
  },
  async retrieveChunkCandidates() {
    return []
  },
  dispose() {},
}
const service = createCreatorShadowRecallService({
  retriever,
  sources,
  now: () => '2026-07-17T15:00:00.000Z',
})
assert.deepEqual(await service.propose(query), proposal)
assert.equal(calledQuery, query)

assert.throws(
  () => buildCreatorShadowRecallProposal({
    query,
    sources,
    result: { ...retrievalResult, finalSourceIds: ['source:auto'] },
    createdAt: '2026-07-17T15:00:00.000Z',
  }),
  /dropped a manual hard include/,
)

assert.throws(
  () => buildCreatorShadowRecallProposal({
    query,
    sources,
    result: {
      ...retrievalResult,
      automaticResults: [{ ...retrievalResult.automaticResults[0]!, workId: 'work:wrong' }],
    },
    createdAt: '2026-07-17T15:00:00.000Z',
  }),
  /metadata does not match/,
)

assert.throws(
  () => buildCreatorShadowRecallProposal({
    query,
    sources: [...sources, { ...sources[0]!, id: 'source:future', chapterNo: 21 }],
    result: {
      automaticResults: [{
        sourceId: 'source:future',
        workId: query.workId,
        branchId: query.branchId,
        chapterNo: 21,
        authority: 'canon',
        memoryGroup: 'causal',
        revision: 3,
        locator: { recordId: 'chapter:4', label: '未来章节诱饵' },
        text: '未来章节内容不得进入当前召回。',
      }],
      finalSourceIds: ['source:future', 'source:manual'],
    },
    createdAt: '2026-07-17T15:00:00.000Z',
  }),
  /future chapter/,
)

assert.throws(
  () => confirmCreatorShadowRecallSelection({
    proposal,
    currentSources: sources,
    selectedProposalIds: ['proposal:missing'],
    authorConfirmed: true,
    confirmedAt: '2026-07-17T15:01:00.000Z',
  }),
  /unknown proposal/,
)

assert.throws(
  () => confirmCreatorShadowRecallSelection({
    proposal,
    currentSources: sources.map(source => (
      source.id === 'source:auto' ? { ...source, revision: source.revision + 1 } : source
    )),
    selectedProposalIds: [proposal.candidates[0]!.proposalId],
    authorConfirmed: true,
    confirmedAt: '2026-07-17T15:01:00.000Z',
  }),
  /revision or metadata is stale/,
)

assert.throws(
  () => confirmCreatorShadowRecallSelection({
    proposal,
    currentSources: sources,
    selectedProposalIds: [proposal.candidates[0]!.proposalId],
    authorConfirmed: false as true,
    confirmedAt: '2026-07-17T15:01:00.000Z',
  }),
  /explicit author confirmation/,
)

console.log('[creator-shadow-recall-service] PASS (shadow-only proposal, hard include, and fail-closed scope)')
