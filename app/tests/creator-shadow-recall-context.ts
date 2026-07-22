import assert from 'node:assert/strict'

import {
  applyConfirmedShadowRecallToContextSource,
  compileContextWithConfirmedShadowRecall,
} from '@/apps/creator/routes/creatorEditorShadowRecallContextService'
import {
  contextSourceFingerprint,
} from '@/features/creator-decision/contextCompiler'
import {
  createCreationSession,
  createEmptyIntent,
} from '@/features/creator-decision/stateMachine'
import type { CreationContextSource } from '@/features/creator-decision/types'
import type { CreatorConfirmedShadowRecallSelection } from '@/integrations/creator-rag/creatorShadowRecallService'

const now = '2026-07-17T15:10:00.000Z'
const session = createCreationSession({
  id: 'session:shadow-context',
  workId: 'work:shadow-context',
  branchId: 'branch:main',
  chapterId: 'chapter:20',
  sceneId: 'scene:20',
  now,
})
const intent = {
  ...createEmptyIntent({ sessionId: session.id, primaryActorId: 'character:hero', now }),
  status: 'locked' as const,
}
const source: CreationContextSource = {
  canonRevision: 4,
  kernelRevision: 2,
  constraintRevision: 3,
  activeCharacters: [{
    id: 'character:hero',
    goal: '穿过废墟',
    belief: [],
    knowledge: [],
    falseBeliefs: [],
    emotionalState: '警觉',
    resources: [],
  }],
  relevantRelationships: [],
  activePromises: [],
  unresolvedForeshadowing: [],
  currentTimeline: [],
  relevantWorldRules: [],
  kernelRules: [],
  hardConstraints: ['不得替作者决定下一步'],
  relevantRegressionExamples: [],
  recentSceneSummaries: [],
  styleSamples: [],
  manualRecallItems: [],
  manifest: [],
}
const selection: CreatorConfirmedShadowRecallSelection = {
  schemaVersion: 'creator-confirmed-shadow-recall-selection.v1',
  status: 'confirmed_not_applied',
  proposalCreatedAt: now,
  workId: session.workId,
  branchId: session.branchId,
  currentChapterNo: 20,
  selectedProposalIds: ['shadow-recall:source:debt:2'],
  selectedSources: [{
    proposalId: 'shadow-recall:source:debt:2',
    sourceId: 'source:debt',
    sourceRevision: 2,
  }],
  manualRecallItems: [{
    id: 'manual-recall:shadow:source:debt:2',
    sourceId: 'source:debt',
    sourceRevision: 2,
    authority: 'canon',
    group: 'causal',
    statement: '旧伤让主角无法连续使用同一种能力。',
    sourceLabel: '第 7 章旧伤证据',
    whyNow: '旧代价必须继续限制当前行动。',
    locator: { kind: 'chapter', targetId: 'chapter:7', label: '定位到第 7 章' },
  }],
  authorConfirmed: true,
  contextSnapshotChanged: false,
  draftChanged: false,
  canonChanged: false,
  publicationPerformed: false,
  confirmedAt: now,
}

const appliedSource = applyConfirmedShadowRecallToContextSource({ session, source, selection })
assert.equal(source.manualRecallItems?.length, 0, 'application must not mutate the caller source')
assert.equal(appliedSource.manualRecallItems?.length, 1)
assert.equal(appliedSource.manifest[0]?.sourceId, 'source:debt')
assert.equal(appliedSource.manifest[0]?.includedReason, 'author_confirmed_shadow_recall:causal')
assert.notEqual(contextSourceFingerprint(appliedSource), contextSourceFingerprint(source))

const context = compileContextWithConfirmedShadowRecall({ session, intent, source, selection, now })
assert.equal(context.manualRecallItems.length, 1)
assert.equal(context.manualRecallItems[0]?.sourceId, 'source:debt')
assert.ok(context.manifest.some(entry => (
  entry.sourceId === 'source:debt'
  && entry.sourceRevision === 2
  && entry.includedReason === 'author_confirmed_shadow_recall:causal'
)))
assert.ok(!context.manualRecallItems.some(item => item.sourceId === 'source:unselected'))
assert.equal(context.hardConstraints.includes('不得替作者决定下一步'), true)

assert.throws(
  () => applyConfirmedShadowRecallToContextSource({
    session,
    source: {
      ...source,
      manifest: [{
        sourceId: 'source:debt',
        sourceRevision: 1,
        authority: 'canon',
        includedReason: 'old_revision',
      }],
    },
    selection,
  }),
  /conflicts with the current manifest/,
)

assert.throws(
  () => applyConfirmedShadowRecallToContextSource({
    session,
    source,
    selection: { ...selection, branchId: 'branch:wrong' },
  }),
  /another branch/,
)

assert.throws(
  () => applyConfirmedShadowRecallToContextSource({
    session,
    source,
    selection: { ...selection, selectedSources: [] },
  }),
  /inconsistent selected-source counts/,
)

console.log('[creator-shadow-recall-context] PASS (confirmed selection compiles once; stale and unselected sources stay out)')
