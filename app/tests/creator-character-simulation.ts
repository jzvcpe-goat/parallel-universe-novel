import assert from 'node:assert/strict'
import {
  characterStateDimensionGroups,
  characterStateDimensions,
  isSupportedCharacterStatePath,
  normalizeCharacterStatePath,
  normalizePersistedCharacterStatePath,
} from '../src/features/creator-decision/characterState'
import {
  characterSimulationRequestSchema,
  characterSimulationResultSchema,
  characterSimulationSeedMarkdown,
  validateCharacterSimulationResult,
} from '../src/features/creator-decision/characterSimulation'
import { createMiroFishCharacterSimulationAdapter } from '../src/features/creator-decision/miroFishCharacterSimulationAdapter'
import { createLocalWorkingAgent } from '../src/features/creator-decision/localWorkingAgent'
import { referenceWritingAgent } from '../src/features/creator-decision/referenceWritingAgent'
import {
  canonStatePatchSchema,
  sceneDraftResultSchema,
  statePatchOperationSchema,
} from '../src/features/creator-decision/schemas'
import { CreationDecisionError } from '../src/features/creator-decision/types'
import {
  migratePersistedCanonPatchRecord,
  migratePersistedSceneDraftRecord,
} from '../src/local-db/creatorDecisionRecordMigration'
import {
  captureCharacterRehearsalProposal,
  captureCharacterRehearsalSettingProposal,
  runCreatorCharacterRehearsal,
  type CreatorCharacterAssetPersistencePort,
} from '../src/apps/creator/routes/creatorCharacterRehearsalService'
import {
  buildCharacterRehearsalRequest,
  parseCharacterRehearsalConversation,
} from '../src/apps/creator/routes/creatorCharacterRehearsalConversationService'

assert.equal(characterStateDimensions.length, 22, 'the character state contract must expose exactly 22 dimensions')
assert.equal(new Set(characterStateDimensions).size, 22, 'the character state dimensions must be unique')
const groupedCharacterStateDimensions = Object.values(characterStateDimensionGroups).flat()
assert.equal(groupedCharacterStateDimensions.length, 22, 'the Observer scan groups must cover all 22 dimensions')
assert.equal(new Set(groupedCharacterStateDimensions).size, 22, 'each state dimension must belong to exactly one scan group')
assert.deepEqual(
  [...groupedCharacterStateDimensions].sort(),
  [...characterStateDimensions].sort(),
  'the Observer scan groups must neither omit nor invent character-state dimensions',
)
assert.equal(isSupportedCharacterStatePath('/characters/lin/trust'), true)
assert.equal(isSupportedCharacterStatePath('/characters/lin/relationshipPosition'), true, 'legacy relationship state must remain readable')
assert.equal(
  normalizeCharacterStatePath('/characters/lin/relationshipPosition'),
  '/characters/lin/relationshipStances',
)
assert.equal(isSupportedCharacterStatePath('/characters/lin/compositeScore'), false)
assert.equal(statePatchOperationSchema.safeParse({
  op: 'replace',
  path: '/characters/lin/compositeScore',
  value: 88,
  evidenceBlockIds: ['draft-block:1'],
  reason: 'unsupported aggregate state',
  irreversible: false,
}).success, false, 'canon patches must reject state outside the 22-dimension contract')

const persistedPathMigrations = [
  ['/characters/陆沉舟/access', '/characters/陆沉舟/limitations'],
  ['/characters/陆沉舟/identityExposure', '/characters/陆沉舟/secrets'],
  ['/characters/陆沉舟/reputation', '/characters/陆沉舟/relationshipStances'],
  ['/characters/asset:lu/movementRestriction', '/characters/asset:lu/limitations'],
  ['/characters/陆沉舟/morningAssignment', '/characters/陆沉舟/obligations'],
  ['/characters/asset:lu/resources/dryOuterGarment', '/characters/asset:lu/resources'],
  ['/characters/asset:lu/injuries/leftKnee', '/characters/asset:lu/physicalCondition'],
  ['/characters/陆沉舟/status/role', '/characters/陆沉舟/obligations'],
  ['/characters/陆沉舟/status/movementRestriction', '/characters/陆沉舟/limitations'],
  ['/characters/protagonist/leftHand', '/characters/protagonist/physicalCondition'],
] as const

for (const [legacyPath, currentPath] of persistedPathMigrations) {
  assert.equal(normalizePersistedCharacterStatePath(legacyPath), currentPath)
}
assert.equal(
  normalizePersistedCharacterStatePath('/characters/lin/compositeScore'),
  '/characters/lin/compositeScore',
  'unknown persisted state must still fail the strict 22-dimension schema',
)

const persistedOperation = {
  op: 'replace',
  path: '/characters/陆沉舟/access',
  value: 'restricted',
  evidenceBlockIds: ['draft-block:1'],
  reason: 'legacy browser record',
  irreversible: false,
}
assert.equal(statePatchOperationSchema.safeParse(persistedOperation).success, false)

const migratedSceneDraft = sceneDraftResultSchema.parse(migratePersistedSceneDraftRecord({
  schemaVersion: 'scene-draft.v1',
  draftId: 'scene-draft:legacy-state-path',
  sessionId: 'creation-session:chapter:20',
  baseCanonRevision: 0,
  baseIntentRevision: 1,
  baseCandidateRevision: 1,
  baseDraftRevision: 0,
  revision: 1,
  contentBlocks: [],
  unplannedFactProposals: [],
  observedStateChanges: [persistedOperation],
  status: 'current',
  createdAt: '2026-07-15T00:00:00.000Z',
}))
assert.equal(migratedSceneDraft.observedStateChanges[0]?.path, '/characters/陆沉舟/limitations')

const migratedCanonPatch = canonStatePatchSchema.parse(migratePersistedCanonPatchRecord({
  schemaVersion: 'canon-state-patch.v1',
  id: 'canon-patch:legacy-state-path',
  sessionId: 'creation-session:chapter:20',
  workId: 'work:arad-wayfarer',
  chapterId: 'chapter:20',
  baseCanonRevision: 0,
  sourceDraftRevision: 1,
  status: 'committed',
  operations: [persistedOperation],
  createdAt: '2026-07-15T00:00:00.000Z',
}))
assert.equal(migratedCanonPatch.operations[0]?.path, '/characters/陆沉舟/limitations')

const request = characterSimulationRequestSchema.parse({
  schemaVersion: 'character-simulation-request.v1',
  requestId: 'simulation-request:20',
  sessionId: 'session:20',
  workId: 'work:arad-wayfarer',
  chapterId: 'chapter:20',
  contextSnapshotId: 'context:20',
  scenario: '当林越拒绝继续隐瞒伤势时，赛丽亚与阿甘左会怎样重新判断彼此的可靠性？',
  rounds: 3,
  authorConfirmedExport: true,
  characters: [
    {
      id: 'lin-yue',
      name: '林越',
      summary: '外来冒险者，习惯用独自承担风险来维持队伍秩序。',
      state: {
        dominantDesire: '保护同行者',
        defenseStrategy: '隐瞒伤势',
        trust: ['赛丽亚：中等', '阿甘左：谨慎'],
      },
    },
    {
      id: 'seria',
      name: '赛丽亚',
      summary: '重视诚实与共同承担，正在怀疑林越是否真正信任同伴。',
      state: {
        immediateGoal: '确认林越还能否继续行动',
        relationshipStances: ['林越：关心但不再纵容隐瞒'],
      },
    },
  ],
  settingFacts: ['伤势恶化会引来鬼手力量失控。'],
  hardConstraints: ['模拟不得决定任何角色死亡。'],
})

assert.equal(parseCharacterRehearsalConversation('继续修改这一段。').recognized, false)
const parsedConversation = parseCharacterRehearsalConversation(
  '做3轮角色排练：林越、赛丽亚；当林越拒绝继续隐瞒伤势时，两人会怎样重新划定信任边界？',
)
assert.equal(parsedConversation.recognized, true)
assert.deepEqual(parsedConversation.draft?.characterNames, ['林越', '赛丽亚'])
assert.equal(parsedConversation.draft?.rounds, 3)
assert.equal(
  parseCharacterRehearsalConversation('角色排练：林越；看看关系').issue?.includes('2–8 位人物'),
  true,
)

const conversationAssets = [
  {
    localAssetRef: 'lin-yue',
    workId: 'work:arad-wayfarer',
    branchId: 'work:arad-wayfarer:main',
    kind: 'character' as const,
    stage: 'memory' as const,
    title: '人物 · 林越，外来冒险者',
    summary: '外来冒险者，习惯用独自承担风险来维持队伍秩序。',
    detail: '他害怕失控伤害同行者，因此常用隐瞒来维持控制。',
    tags: ['已知:伤势正在恶化'],
    updatedAt: '2026-07-15T10:00:00.000Z',
  },
  {
    localAssetRef: 'seria',
    workId: 'work:arad-wayfarer',
    branchId: 'work:arad-wayfarer:main',
    kind: 'rule' as const,
    stage: 'memory' as const,
    title: '人物 · 赛丽亚',
    summary: '重视诚实与共同承担，正在怀疑林越是否真正信任同伴。',
    detail: '她会要求对方把风险转化成共同决策，而不是独自逞强。',
    tags: ['作者明确', '关系:林越'],
    updatedAt: '2026-07-15T10:00:00.000Z',
  },
  {
    localAssetRef: 'rule:injury',
    workId: 'work:arad-wayfarer',
    branchId: 'work:arad-wayfarer:main',
    kind: 'rule' as const,
    stage: 'memory' as const,
    title: '伤势与失控',
    summary: '伤势恶化会提高力量失控风险。',
    detail: '失控不能被一句意志力直接消除。',
    tags: [],
    updatedAt: '2026-07-15T10:00:00.000Z',
  },
]
const conversationSession = {
  schemaVersion: 'creation-session.v1' as const,
  id: 'session:20',
  workId: 'work:arad-wayfarer',
  chapterId: 'chapter:20',
  sceneId: null,
  branchId: 'work:arad-wayfarer:main',
  phase: 'canon_committed' as const,
  baseCanonRevision: 20,
  currentIntentRevision: 1,
  currentCandidateRevision: 1,
  currentDraftRevision: 1,
  lockedIntentId: 'intent:20',
  selectedCandidateId: 'candidate:20',
  activeDraftId: 'draft:20',
  activeReviewId: 'review:20',
  proposedCanonPatchId: null,
  createdAt: '2026-07-15T10:00:00.000Z',
  updatedAt: '2026-07-15T10:00:00.000Z',
}
const conversationContext = {
  schemaVersion: 'context-snapshot.v1' as const,
  id: 'context:20',
  compilationPolicyVersion: 1,
  sourceFingerprint: 'fingerprint:20',
  sessionId: 'session:20',
  intentRevision: 1,
  workId: 'work:arad-wayfarer',
  chapterId: 'chapter:20',
  sceneId: null,
  canonRevision: 20,
  kernelRevision: 1,
  constraintRevision: 1,
  activeCharacters: [
    {
      id: 'lin-yue',
      goal: '保护同行者',
      belief: [],
      knowledge: ['伤势正在恶化'],
      falseBeliefs: ['只有独自承担才算保护'],
      emotionalState: '戒备',
      resources: ['维修经验'],
      state: { defenseStrategy: '隐瞒伤势', trust: ['赛丽亚：中等'] },
    },
    {
      id: 'seria',
      goal: '确认林越是否还能继续行动',
      belief: ['风险应共同承担'],
      knowledge: [],
      falseBeliefs: [],
      emotionalState: '担忧',
      resources: [],
      state: { relationshipStances: ['林越：关心但不再纵容隐瞒'] },
    },
  ],
  relevantRelationships: [],
  activePromises: [],
  unresolvedForeshadowing: [],
  currentTimeline: [],
  relevantWorldRules: [],
  kernelRules: [],
  hardConstraints: ['模拟不得决定任何角色死亡。'],
  relevantRegressionExamples: [],
  recentSceneSummaries: [],
  styleSamples: [],
  manualRecallItems: [],
  manifest: [
    { sourceId: 'lin-yue', sourceRevision: 1, authority: 'author' as const, includedReason: 'selected_character' },
    { sourceId: 'seria', sourceRevision: 1, authority: 'author' as const, includedReason: 'selected_character' },
    { sourceId: 'rule:injury', sourceRevision: 1, authority: 'author' as const, includedReason: 'selected_rule' },
  ],
  status: 'active' as const,
  createdAt: '2026-07-15T10:00:00.000Z',
}
const builtConversationRequest = buildCharacterRehearsalRequest({
  draft: parsedConversation.draft!,
  session: conversationSession,
  context: conversationContext,
  settingAssets: conversationAssets,
  createId: () => 'simulation-request:conversation:20',
})
assert.equal(builtConversationRequest.issue, null)
assert.equal(builtConversationRequest.request?.authorConfirmedExport, true)
assert.equal(builtConversationRequest.request?.characters.length, 2)
assert.equal(builtConversationRequest.request?.characters[0]?.state.defenseStrategy, '隐瞒伤势')
assert.equal(builtConversationRequest.request?.settingFacts.length, 1)
assert.equal(JSON.stringify(builtConversationRequest.request).includes('正文草稿'), false)
const missingCharacterRequest = buildCharacterRehearsalRequest({
  draft: { ...parsedConversation.draft!, characterNames: ['林越', '不存在的人'] },
  session: conversationSession,
  context: conversationContext,
  settingAssets: conversationAssets,
})
assert.equal(missingCharacterRequest.request, null)
assert.ok(missingCharacterRequest.issue?.includes('不存在的人'))

const validResult = characterSimulationResultSchema.parse({
  schemaVersion: 'character-simulation.v1',
  requestId: request.requestId,
  provider: 'mirofish',
  simulationRunId: 'mirofish-run:20',
  scenarioSummary: '短期排练显示，坦白伤势会把冲突从能力怀疑转为信任边界。',
  evidence: [{
    id: 'evidence:1',
    sourceArtifact: 'actions',
    round: 2,
    actorIds: ['lin-yue', 'seria'],
    quote: '林越把缠着绷带的手放到桌上，没有再藏进袖口。',
    summary: '林越主动暴露伤势，赛丽亚获得重新判断其诚意的依据。',
  }],
  characterCardProposals: [{
    id: 'character-card-proposal:lin-yue:20',
    characterId: 'lin-yue',
    title: '把坦白视为共同承担',
    summary: '林越第一次把暴露脆弱当作保护队伍的一部分，而不是拖累同伴。',
    narrativeFunction: '让他的保护欲与控制欲发生可见冲突。',
    arc: {
      desire: '保护同行者',
      fear: '自己的失控伤害同伴',
      wound: '过去曾因判断失误连累队友',
      defense: '隐瞒风险并独自处理',
      relationshipPressure: '赛丽亚把隐瞒理解为不信任',
      growthOpportunity: '在风险仍未解除时允许他人共同决策',
      falseBelief: '只有独自承担才算保护',
      costOfChoice: '坦白后失去单方面控制行动的权力',
    },
    stateChanges: [{
      dimension: 'defenseStrategy',
      before: '隐瞒伤势',
      after: '在失控前主动报告风险',
      reason: '模拟行动显示他选择用坦白维持队伍，而不是继续独自控制。',
      evidenceIds: ['evidence:1'],
    }],
    evidenceIds: ['evidence:1'],
    confidence: 'medium',
    status: 'proposed',
  }],
  settingAssetProposals: [{
    id: 'setting-card-proposal:injury-rule:20',
    kind: 'rule',
    title: '坦白伤势后的共同决策',
    summary: '伤势披露后，行动风险必须由队伍共同判断。',
    detail: '任何一人不得以保护为由单方面隐瞒会影响全队的失控风险。',
    evidenceIds: ['evidence:1'],
    status: 'proposed',
  }],
  warnings: ['该结果来自三轮临时排练，不能替代作者判断。'],
})

assert.equal(validateCharacterSimulationResult(request, validResult).characterCardProposals[0]?.status, 'proposed')
assert.throws(
  () => validateCharacterSimulationResult(request, {
    ...validResult,
    characterCardProposals: [{
      ...validResult.characterCardProposals[0],
      characterId: 'unselected-character',
    }],
  }),
  error => error instanceof CreationDecisionError && error.code === 'model_output_invalid',
  'a rehearsal must not invent cards for characters the author did not export',
)
assert.throws(
  () => validateCharacterSimulationResult(request, {
    ...validResult,
    evidence: [{
      ...validResult.evidence[0],
      actorIds: ['unselected-character'],
    }],
  }),
  error => error instanceof CreationDecisionError && error.code === 'model_output_invalid',
  'simulation evidence must not smuggle in an unselected character',
)
assert.throws(
  () => validateCharacterSimulationResult(request, {
    ...validResult,
    characterCardProposals: [{
      ...validResult.characterCardProposals[0],
      evidenceIds: ['missing-evidence'],
    }],
  }),
  error => error instanceof CreationDecisionError && error.code === 'evidence_missing',
  'every proposed card must point to simulation evidence',
)

const seed = characterSimulationSeedMarkdown(request)
assert.ok(seed.includes('模拟结果不是正文，也不是正史'))
assert.ok(seed.includes('林越') && seed.includes('赛丽亚'))
assert.equal(seed.includes('未选择的第三人'), false)

let calledUrl = ''
const adapter = createMiroFishCharacterSimulationAdapter(
  'http://127.0.0.1:4318/',
  (async (url) => {
    calledUrl = String(url)
    return new Response(JSON.stringify(validResult), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch,
)
const adaptedResult = await adapter.simulate(request)
assert.equal(calledUrl, 'http://127.0.0.1:4318/v1/character-simulation')
assert.equal(adaptedResult.simulationRunId, 'mirofish-run:20')

const localWorkingAgent = createLocalWorkingAgent('http://127.0.0.1:4318')
assert.equal(typeof localWorkingAgent.simulateCharacters, 'function', 'the active local writing agent exposes optional rehearsal capability')
await assert.rejects(
  () => runCreatorCharacterRehearsal(referenceWritingAgent, request),
  error => error instanceof CreationDecisionError && error.code === 'character_simulation_unavailable',
)
const rehearsalResult = await runCreatorCharacterRehearsal({
  ...referenceWritingAgent,
  simulateCharacters: async () => validResult,
}, request)
assert.equal(rehearsalResult.characterCardProposals.length, 1)

let savedCount = 0
let savedDetail = ''
const savedAssets: ReturnType<CreatorCharacterAssetPersistencePort['save']>[] = []
const persistence: CreatorCharacterAssetPersistencePort = {
  read() {
    return savedAssets
  },
  save(input) {
    savedCount += 1
    savedDetail = input.detail || ''
    const asset = {
      localAssetRef: `local-setting:simulation:20:${savedCount}`,
      workId: input.workId,
      branchId: input.branchId || null,
      kind: input.kind,
      stage: input.stage,
      title: input.title,
      summary: input.summary,
      detail: input.detail || input.summary,
      tags: input.tags || [],
      updatedAt: '2026-07-15T10:00:00.000Z',
    }
    savedAssets.push(asset)
    return asset
  },
}
assert.throws(
  () => captureCharacterRehearsalProposal({
    request,
    result: validResult,
    proposalId: 'character-card-proposal:lin-yue:20',
    authorConfirmed: false,
  }, persistence),
  error => error instanceof CreationDecisionError && error.code === 'author_confirmation_required',
)
assert.equal(savedCount, 0, 'an unconfirmed rehearsal proposal must not create a local character card')
const savedCard = captureCharacterRehearsalProposal({
  request,
  result: validResult,
  proposalId: 'character-card-proposal:lin-yue:20',
  authorConfirmed: true,
}, persistence)
assert.equal(savedCount, 1)
assert.equal(savedCard.kind, 'character')
assert.ok(savedCard.title.startsWith('人物 · 林越'))
assert.ok(savedDetail.includes('该人物卡来自短期群像排练'))
assert.ok(savedDetail.includes('林越把缠着绷带的手放到桌上'))
const sameSavedCard = captureCharacterRehearsalProposal({
  request,
  result: validResult,
  proposalId: 'character-card-proposal:lin-yue:20',
  authorConfirmed: true,
}, persistence)
assert.equal(sameSavedCard.localAssetRef, savedCard.localAssetRef)
assert.equal(savedCount, 1, 'reconfirming the same rehearsal proposal must not overwrite the saved card')
assert.throws(
  () => captureCharacterRehearsalSettingProposal({
    request,
    result: validResult,
    proposalId: 'setting-card-proposal:injury-rule:20',
    authorConfirmed: false,
  }, persistence),
  error => error instanceof CreationDecisionError && error.code === 'author_confirmation_required',
)
const savedSetting = captureCharacterRehearsalSettingProposal({
  request,
  result: validResult,
  proposalId: 'setting-card-proposal:injury-rule:20',
  authorConfirmed: true,
}, persistence)
assert.equal(savedSetting.kind, 'rule')
assert.equal(savedCount, 2)
assert.ok(savedSetting.detail.includes('它仍不是正史'))

console.log('[creator-character-simulation] PASS')
