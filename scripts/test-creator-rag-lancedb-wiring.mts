import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  buildCreatorRecallNeedQueries,
  proposeCreatorShadowRecallBatch,
} from '../app/src/apps/creator/routes/creatorEditorShadowRecallQueryService.ts'
import { createEmptyIntent } from '../app/src/features/creator-decision/stateMachine.ts'
import { createCreatorLanceDbRetriever } from '../app/src/integrations/creator-rag/creatorLanceDbRetriever.ts'
import type { CreatorRagEmbedder } from '../app/src/integrations/creator-rag/creatorLocalEmbedding.ts'
import {
  confirmCreatorShadowRecallSelection,
  createCreatorShadowRecallService,
  type CreatorShadowRecallSource,
} from '../app/src/integrations/creator-rag/creatorShadowRecallService.ts'

const databasePath = await mkdtemp(join(tmpdir(), 'creator-rag-lancedb-wiring-'))

try {
  const wiringEmbedder: CreatorRagEmbedder = {
    embedPassages: async texts => texts.map(() => [1, 0]),
    embedQuery: async () => [1, 0],
    dispose: async () => undefined,
  }
  const sources: CreatorShadowRecallSource[] = [
    {
      id: 'source:smoke',
      text: '黑色印记来自遗物盒。',
      workId: 'work:smoke',
      branchId: 'branch:main',
      chapterNo: 1,
      authority: 'canon',
      memoryGroup: 'causal',
      revision: 1,
      group: 'causal',
      whyNow: '旧遗物的来历仍约束当前因果。',
      locator: { recordId: 'chapter:1', label: '第一章' },
      manualLocator: { kind: 'chapter', targetId: 'chapter:1', label: '定位到第一章' },
    },
    {
      id: 'source:knowledge',
      text: '同伴仍不知道旅人来自另一个世界，并误以为他来自帝国边境。',
      workId: 'work:smoke',
      branchId: 'branch:main',
      chapterNo: 1,
      authority: 'author',
      memoryGroup: 'character_knowledge',
      revision: 1,
      group: 'character_knowledge',
      whyNow: '人物知识边界不能被提前揭示。',
      locator: { recordId: 'asset:knowledge', label: '人物所知卡' },
      manualLocator: { kind: 'asset', targetId: 'asset:knowledge', label: '定位到人物所知卡' },
    },
    {
      id: 'source:timeline',
      text: '一行人在黄昏前抵达废墟入口，石门关闭后不能原路返回。',
      workId: 'work:smoke',
      branchId: 'branch:main',
      chapterNo: 1,
      authority: 'canon',
      memoryGroup: 'timeline',
      revision: 1,
      group: 'timeline',
      whyNow: '固定时间地点和不可逆移动。',
      locator: { recordId: 'chapter:timeline', label: '时间线证据' },
      manualLocator: { kind: 'chapter', targetId: 'chapter:timeline', label: '定位到时间线证据' },
    },
    {
      id: 'source:promise',
      text: '遗物盒上的紫色裂纹尚未解释，只在靠近残留力量时发亮。',
      workId: 'work:smoke',
      branchId: 'branch:main',
      chapterNo: 1,
      authority: 'canon',
      memoryGroup: 'promise',
      revision: 1,
      group: 'promise',
      whyNow: '既有伏笔不能被遗忘或提前解释。',
      locator: { recordId: 'chapter:promise', label: '伏笔证据' },
      manualLocator: { kind: 'chapter', targetId: 'chapter:promise', label: '定位到伏笔证据' },
    },
    {
      id: 'decoy:wrong-work',
      text: '另一个作品也有黑色印记。',
      workId: 'work:decoy',
      branchId: 'branch:main',
      chapterNo: 1,
      authority: 'canon',
      memoryGroup: 'causal',
      revision: 1,
      group: 'causal',
      whyNow: '错误作品诱饵不得进入当前提案。',
      locator: { recordId: 'decoy:1', label: '错误作品诱饵' },
      manualLocator: { kind: 'chapter', targetId: 'decoy:1', label: '错误作品诱饵' },
    },
  ]
  const retriever = await createCreatorLanceDbRetriever({
    databasePath,
    embedder: wiringEmbedder,
    sources,
  })
  const retrievalQuery = {
    text: '黑色印记',
    workId: 'work:smoke',
    branchId: 'branch:main',
    currentChapterNo: 1,
    allowedMemoryGroups: ['causal'],
    manualSelectedSourceIds: ['source:smoke'],
  }
  const result = await retriever.retrieve(retrievalQuery)
  const chunkCandidates = await retriever.retrieveChunkCandidates({
    ...retrievalQuery,
    chunkLimit: 8,
  })

  if (
    !result.automaticResults.some(item => item.sourceId === 'source:smoke')
    || result.automaticResults.some(item => item.workId !== 'work:smoke')
  ) {
    throw new Error('upstream LanceDB filter and RRF wiring did not preserve the scoped source set')
  }
  if (!result.finalSourceIds.includes('source:smoke')) {
    throw new Error('manual hard-include was not preserved')
  }
  if (
    !chunkCandidates.some(item => item.sourceId === 'source:smoke' && item.chunkId && item.chunkIndex === 0)
    || chunkCandidates.some(item => item.workId !== 'work:smoke' || item.memoryGroup !== 'causal')
  ) {
    throw new Error('upstream chunk candidate outlet did not preserve locator and metadata filters')
  }
  const shadowService = createCreatorShadowRecallService({
    retriever,
    sources,
    now: () => '2026-07-17T15:00:00.000Z',
  })
  const proposal = await shadowService.propose(retrievalQuery)
  if (
    proposal.status !== 'shadow_only'
    || proposal.automaticSelectionApplied
    || proposal.contextSnapshotChanged
    || proposal.candidates.some(candidate => candidate.selectionState !== 'unselected')
  ) {
    throw new Error('shadow service must keep upstream results as unselected proposals')
  }
  const confirmedSelection = confirmCreatorShadowRecallSelection({
    proposal,
    currentSources: sources,
    selectedProposalIds: [proposal.candidates[0]!.proposalId],
    authorConfirmed: true,
    confirmedAt: '2026-07-17T15:01:00.000Z',
  })
  if (
    confirmedSelection.status !== 'confirmed_not_applied'
    || confirmedSelection.manualRecallItems.length !== 1
    || confirmedSelection.contextSnapshotChanged
  ) {
    throw new Error('explicit selection must produce a confirmed but unapplied manual recall item')
  }
  const lockedIntent = {
    ...createEmptyIntent({
      sessionId: 'session:rag-wiring',
      primaryActorId: 'character:hero',
      now: '2026-07-17T15:00:00.000Z',
    }),
    status: 'locked' as const,
    narrativeDelta: {
      startingCondition: '黄昏时抵达废墟入口',
      endingCondition: '付出代价后进入石门',
      mustChange: '返回路线必须消失',
      mustNotResolve: ['紫色裂纹的来源'],
      irreversibleChange: '石门关闭',
    },
    characterAgency: {
      primaryActorId: 'character:hero',
      currentGoal: '进入废墟',
      requiredChoice: '主动放弃返回路线',
      opposingForce: '即将关闭的石门',
      expectedCost: '无法原路返回',
    },
    informationPolicy: {
      readerShouldKnow: ['遗物盒上存在紫色裂纹'],
      readerShouldSuspect: ['裂纹会回应残留力量'],
      charactersMustNotKnow: [{ characterId: 'character:companion', information: '旅人来自另一个世界' }],
      delayedReveals: ['紫色裂纹的真正来源'],
    },
  }
  const groupedQueries = buildCreatorRecallNeedQueries({
    authorPrompt: '继续写进入废墟后的危机，不要提前解释紫色裂纹。',
    intent: lockedIntent,
    workId: 'work:smoke',
    branchId: 'branch:main',
    currentChapterNo: 1,
    groups: ['causal', 'character_knowledge', 'timeline', 'promise'],
    manualSelectedSourceIds: ['source:smoke'],
  })
  const batch = await proposeCreatorShadowRecallBatch({ service: shadowService, queries: groupedQueries })
  if (
    batch.groups.length !== 4
    || batch.crossGroupFusionPerformed
    || batch.automaticSelectionApplied
  ) {
    throw new Error('four memory needs must remain independent unselected proposal groups')
  }
  for (const group of batch.groups) {
    if (group.proposal.candidates.some(candidate => candidate.group !== group.group)) {
      throw new Error(`LanceDB memory-group prefilter leaked into ${group.group}`)
    }
  }
  retriever.dispose()
  console.log('[creator-rag-lancedb-wiring] PASS (upstream API wiring only; no retrieval-quality claim)')
} finally {
  await rm(databasePath, { recursive: true, force: true })
}
