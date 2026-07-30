import assert from 'node:assert/strict'
import { buildCreatorDecisionContextSource } from '../src/apps/creator/routes/creatorEditorDecisionContextAdapter'
import {
  characterStateDimensionGroups,
  characterStateDimensions,
  type CharacterStateDimension,
  type CharacterStateSnapshot,
} from '../src/features/creator-decision/characterState'
import { applyStatePatchOperations } from '../src/features/creator-decision/canonPatch'
import {
  assertDistinctStoryStateOperationPaths,
  buildStoryStateEvidenceOperations,
  storyStateEvidenceOutputSchema,
} from '../src/features/creator-decision/storyStateEvidence'
import {
  createCreationSession,
  createEmptyIntent,
} from '../src/features/creator-decision/stateMachine'
import type {
  DraftBlock,
  LocalCanonStateRecord,
  StatePatchOperation,
} from '../src/features/creator-decision/types'
import type { PmfLocalSettingAsset } from '../src/features/pmf/types'

const now = '2026-07-16T02:55:00.000Z'
const workId = 'work:character-state-pipeline'
const branchId = 'branch:main'
const chapterId = 'chapter:state-pipeline'
const characterId = 'character:protagonist'
const session = createCreationSession({
  id: 'session:character-state-pipeline',
  workId,
  branchId,
  chapterId,
  sceneId: 'scene:state-pipeline',
  baseCanonRevision: 0,
})

let offset = 0
const evidenceByDimension = new Map<CharacterStateDimension, DraftBlock>()
for (const dimension of characterStateDimensions) {
  const text = `人物在本章末留下了可定位的 ${dimension} 状态变化证据。`
  const block: DraftBlock = {
    id: `block:state:${dimension}`,
    text,
    startOffset: offset,
    endOffset: offset + text.length,
    protected: false,
  }
  evidenceByDimension.set(dimension, block)
  offset = block.endOffset + 2
}

const operations: StatePatchOperation[] = []
for (const dimensions of Object.values(characterStateDimensionGroups)) {
  assert.ok(dimensions.length <= 8, 'one Observer state-evidence run must stay within the eight-proposal limit')
  const result = storyStateEvidenceOutputSchema.parse({
    schemaVersion: 'creator-state-evidence.v1',
    characterStateProposals: dimensions.map(dimension => ({
      path: `/characters/${characterId}/${dimension}`,
      value: `confirmed:${dimension}`,
      reason: `正文证明 ${dimension} 在本章结束时发生了变化。`,
      irreversible: dimension === 'knowledge',
      evidenceQuote: evidenceByDimension.get(dimension)!.text,
      supportingEvidenceQuotes: [],
    })),
    continuityProposals: [],
  })
  const groupOperations = buildStoryStateEvidenceOperations({
    result,
    session,
    blocks: [...evidenceByDimension.values()],
    context: {
      activeCharacters: [{ id: characterId }],
      activePromises: [],
      unresolvedForeshadowing: [],
      manualRecallItems: [],
    },
  })
  assert.equal(groupOperations.length, dimensions.length)
  for (const [index, dimension] of dimensions.entries()) {
    assert.equal(groupOperations[index]?.path, `/characters/${characterId}/${dimension}`)
    assert.deepEqual(groupOperations[index]?.evidenceBlockIds, [`block:state:${dimension}`])
  }
  operations.push(...groupOperations)
}

assert.equal(operations.length, 22, 'the four evidence runs must carry all registered dimensions')
assertDistinctStoryStateOperationPaths(operations)

const state = applyStatePatchOperations({}, operations)
const characterState = (state.characters as Record<string, Record<string, unknown>>)[characterId]
assert.ok(characterState)
assert.deepEqual(
  Object.keys(characterState).sort(),
  [...characterStateDimensions].sort(),
  'Canon state application must preserve every registered dimension without collapsing groups',
)
for (const dimension of characterStateDimensions) {
  assert.equal(characterState[dimension], `confirmed:${dimension}`)
}

const canon: LocalCanonStateRecord = {
  schemaVersion: 'local-canon-state.v1',
  id: 'local-canon:character-state-pipeline',
  workId,
  chapterId,
  branchId,
  revision: 1,
  acceptedDraftId: 'draft:character-state-pipeline',
  acceptedDraftRevision: 1,
  acceptedContentBlocks: [...evidenceByDimension.values()],
  state,
  committedPatchId: 'patch:character-state-pipeline',
  committedAt: now,
}
const settingAssets: PmfLocalSettingAsset[] = [{
  localAssetRef: characterId,
  workId,
  branchId,
  kind: 'character',
  stage: 'memory',
  title: '主角',
  summary: '用于验证人物状态进入下一轮写作上下文。',
  detail: '该夹具不对应真实作品人物。',
  tags: [],
  updatedAt: now,
}]
const context = buildCreatorDecisionContextSource({
  intent: createEmptyIntent(session, characterId),
  canon,
  chapters: [],
  settingAssets,
  linkedRequest: null,
  workId,
  branchId,
  chapterId,
  sceneId: session.sceneId,
  manuscript: '',
})
const compiledCharacter = context.activeCharacters.find(character => character.id === characterId)
assert.ok(compiledCharacter?.state)
assert.deepEqual(
  Object.keys(compiledCharacter.state).sort(),
  [...characterStateDimensions].sort(),
  'the next writing context must receive all committed character-state dimensions',
)
for (const dimension of characterStateDimensions) {
  assert.equal(compiledCharacter.state[dimension], `confirmed:${dimension}`)
}

const partialRuntimeState = {
  emotionalState: 'projected:emotionalState',
  trust: ['projected:trust'],
  fear: undefined,
  relationshipPosition: 'legacy:relationshipPosition',
} as CharacterStateSnapshot & Record<string, unknown>
const projectedContext = buildCreatorDecisionContextSource({
  intent: createEmptyIntent(session, characterId),
  canon,
  chapters: [],
  settingAssets,
  linkedRequest: null,
  workId,
  branchId,
  chapterId,
  sceneId: session.sceneId,
  manuscript: '',
  runtimeProjection: {
    kernelRevision: 2,
    constraintRevision: 3,
    kernelRules: [],
    hardConstraints: [],
    characterStates: {
      [characterId]: partialRuntimeState,
    },
  },
})
const projectedCharacter = projectedContext.activeCharacters.find(character => character.id === characterId)
assert.ok(projectedCharacter?.state)
assert.deepEqual(
  Object.keys(projectedCharacter.state).sort(),
  [...characterStateDimensions].sort(),
  'a partial runtime projection must not erase unmentioned Canon dimensions',
)
assert.equal(projectedCharacter.state.emotionalState, 'projected:emotionalState')
assert.deepEqual(projectedCharacter.state.trust, ['projected:trust'])
assert.equal(
  projectedCharacter.state.fear,
  'confirmed:fear',
  'an undefined runtime field must not delete the committed Canon value',
)
assert.equal(projectedCharacter.state.recentChoice, 'confirmed:recentChoice')
assert.equal(
  projectedCharacter.state.relationshipStances,
  'confirmed:relationshipStances',
  'a legacy runtime alias must not replace the current relationship dimension',
)
assert.equal(
  'relationshipPosition' in projectedCharacter.state,
  false,
  'legacy aliases must be normalized by migration rather than leak into a current context',
)

console.log('[creator-character-state-pipeline] PASS')
