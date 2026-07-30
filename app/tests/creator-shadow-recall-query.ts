import assert from 'node:assert/strict'

import {
  buildCreatorRecallNeedQueries,
  proposeCreatorShadowRecallBatch,
} from '@/apps/creator/routes/creatorEditorShadowRecallQueryService'
import { createEmptyIntent } from '@/features/creator-decision/stateMachine'
import type {
  CreatorShadowRecallProposal,
  CreatorShadowRecallService,
} from '@/integrations/creator-rag/creatorShadowRecallService'

const intent = {
  ...createEmptyIntent({
    sessionId: 'session:shadow-query',
    primaryActorId: 'character:hero',
    now: '2026-07-17T15:20:00.000Z',
  }),
  status: 'locked' as const,
  narrativeDelta: {
    startingCondition: '主角仍被困在废墟入口',
    endingCondition: '主角付出代价后进入深处',
    mustChange: '必须失去一项可依赖的资源',
    mustNotResolve: ['紫色裂纹的真正来源'],
    irreversibleChange: '通行证彻底损坏',
  },
  characterAgency: {
    primaryActorId: 'character:hero',
    currentGoal: '穿过废墟寻找出口',
    requiredChoice: '独自承担通行证损坏的后果',
    opposingForce: '不断收缩的安全路线',
    expectedCost: '失去返回入口的凭据',
  },
  informationPolicy: {
    readerShouldKnow: ['通行证已经出现裂纹'],
    readerShouldSuspect: ['裂纹与转移事故有关'],
    charactersMustNotKnow: [{ characterId: 'character:companion', information: '主角来自另一个世界' }],
    delayedReveals: ['裂纹会回应使徒残留力量'],
  },
}

const queries = buildCreatorRecallNeedQueries({
  authorPrompt: '继续写主角进入废墟后的第一场危机，不要提前揭晓裂纹来源。',
  intent,
  workId: 'work:shadow-query',
  branchId: 'branch:main',
  currentChapterNo: 20,
  groups: ['promise', 'timeline', 'causal', 'character_knowledge'],
  manualSelectedSourceIds: ['source:author-picked'],
})
assert.deepEqual(queries.map(query => query.group), ['causal', 'character_knowledge', 'timeline', 'promise'])
assert.match(queries[0]!.retrievalQuery.text, /预期代价：失去返回入口的凭据/)
assert.match(queries[1]!.retrievalQuery.text, /character:companion 不得提前知道：主角来自另一个世界/)
assert.match(queries[2]!.retrievalQuery.text, /当前写作章：第 20 章/)
assert.match(queries[3]!.retrievalQuery.text, /本章不得解决：紫色裂纹的真正来源/)
assert.ok(queries.every(query => query.retrievalQuery.manualSelectedSourceIds?.[0] === 'source:author-picked'))
assert.ok(queries.every(query => query.retrievalQuery.allowedMemoryGroups?.[0] === query.group))

const receivedTexts: string[] = []
const service: CreatorShadowRecallService = {
  async propose(query) {
    receivedTexts.push(query.text)
    return {
      schemaVersion: 'creator-shadow-recall-proposal.v1',
      status: 'shadow_only',
      workId: query.workId,
      branchId: query.branchId,
      currentChapterNo: query.currentChapterNo,
      queryText: query.text,
      candidates: [],
      manualHardIncludeSourceIds: query.manualSelectedSourceIds ?? [],
      authorSelectionRequired: true,
      automaticSelectionApplied: false,
      contextSnapshotChanged: false,
      draftChanged: false,
      canonChanged: false,
      publicationPerformed: false,
      createdAt: '2026-07-17T15:20:00.000Z',
    } satisfies CreatorShadowRecallProposal
  },
}
const batch = await proposeCreatorShadowRecallBatch({ service, queries })
assert.equal(receivedTexts.length, 4)
assert.equal(batch.groups.length, 4)
assert.equal(batch.crossGroupFusionPerformed, false)
assert.equal(batch.automaticSelectionApplied, false)
assert.ok(batch.groups.every(group => group.proposal.status === 'shadow_only'))

assert.throws(
  () => buildCreatorRecallNeedQueries({
    authorPrompt: '继续写。',
    intent,
    workId: 'work:shadow-query',
    branchId: 'branch:main',
    currentChapterNo: 20,
    groups: ['causal', 'causal'],
  }),
  /duplicate memory groups/,
)
assert.throws(
  () => buildCreatorRecallNeedQueries({
    authorPrompt: ' ',
    intent,
    workId: 'work:shadow-query',
    branchId: 'branch:main',
    currentChapterNo: 20,
    groups: ['causal'],
  }),
  /author current prompt/,
)
assert.throws(
  () => buildCreatorRecallNeedQueries({
    authorPrompt: '继续写。',
    intent: { ...intent, status: 'draft' },
    workId: 'work:shadow-query',
    branchId: 'branch:main',
    currentChapterNo: 20,
    groups: ['causal'],
  }),
  /locked author intent/,
)

console.log('[creator-shadow-recall-query] PASS (four independent author-grounded queries; no fusion or selection)')
