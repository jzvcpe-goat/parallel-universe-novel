import assert from 'node:assert/strict'
import {
  createManualRecallAdherenceReceipt,
  manualRecallAdherenceViolations,
} from '../src/features/creator-decision/manualRecallAdherence'
import { draftBlocksFromText } from '../src/features/creator-decision/sceneDrafting'
import { createLiteraryReview } from '../src/features/creator-decision/literaryReview'
import { literaryReviewSchema } from '../src/features/creator-decision/schemas'
import {
  CONTEXT_COMPILATION_POLICY_VERSION,
  contextSnapshotFingerprint,
} from '../src/features/creator-decision/contextCompiler'
import type {
  ContextSnapshot,
  ManualRecallAdherenceReview,
  ManualRecallItem,
} from '../src/features/creator-decision/types'

const recalls: ManualRecallItem[] = [
  {
    id: 'recall:causal',
    sourceId: 'canon:last-antidote',
    sourceRevision: 6,
    authority: 'canon',
    group: 'causal',
    statement: '最后一支解晶剂已经耗尽。',
    sourceLabel: '上一场收尾',
    whyNow: '资源损失必须形成压力。',
    locator: { kind: 'canon', targetId: 'canon:last-antidote', label: '上一场收尾' },
  },
  {
    id: 'recall:knowledge',
    sourceId: 'asset:wenlan',
    sourceRevision: 2,
    authority: 'author',
    group: 'character_knowledge',
    statement: '闻澜不知道伤势正在扩散。',
    sourceLabel: '人物卡',
    whyNow: '约束信息释放。',
    locator: { kind: 'asset', targetId: 'asset:wenlan', label: '人物卡' },
  },
  {
    id: 'recall:timeline',
    sourceId: 'canon:greenhouse-time',
    sourceRevision: 1,
    authority: 'canon',
    group: 'timeline',
    statement: '温室塌陷前只剩七分钟。',
    sourceLabel: '时空锚点',
    whyNow: '防止跳时跳地。',
    locator: { kind: 'canon', targetId: 'canon:greenhouse-time', label: '时空锚点' },
  },
]

const draftBlocks = draftBlocksFromText([
  '解晶剂的空管滚到踏板边，许照没有第二支药。',
  '闻澜隔着毒雾问他还能撑多久，他只把咳出的晶屑压进湿滤巾，没有回答。',
  '铜壳计时器还剩六分十二秒，风箱台下的苗床已经塌了一半。',
].join('\n\n'))

const passingReview: ManualRecallAdherenceReview = {
  schemaVersion: 'creator-manual-recall-adherence-review.v1',
  decision: 'pass',
  checks: [
    {
      sourceId: 'canon:last-antidote',
      group: 'causal',
      status: 'fulfilled',
      evidenceQuotes: ['没有第二支药'],
      diagnosis: '耗尽的药物直接限制了当前应对方式。',
    },
    {
      sourceId: 'asset:wenlan',
      group: 'character_knowledge',
      status: 'respected',
      evidenceQuotes: ['没有回答'],
      diagnosis: '许照继续隐瞒，闻澜没有越过信息边界。',
    },
    {
      sourceId: 'canon:greenhouse-time',
      group: 'timeline',
      status: 'respected',
      evidenceQuotes: ['还剩六分十二秒', '风箱台下的苗床'],
      diagnosis: '正文保留倒计时并将行动限制在指定地点。',
    },
  ],
  rationale: '三张作者手选记忆都有可定位正文证据，且未发生冲突。',
}

const passingReceipt = createManualRecallAdherenceReceipt({
  review: passingReview,
  selectedRecallItems: recalls,
  draftBlocks,
})
assert.equal(passingReceipt.decision, 'pass')
assert.equal(passingReceipt.checks.length, 3)
assert.ok(passingReceipt.checks.every(check => check.evidence.length > 0))
assert.deepEqual(manualRecallAdherenceViolations(passingReceipt), [])
assert.equal(passingReceipt.compositeLiteraryScoreUsed, false)

const contextSeed: Omit<ContextSnapshot, 'contentFingerprint'> = {
  schemaVersion: 'context-snapshot.v1',
  id: 'context:manual-recall',
  compilationPolicyVersion: CONTEXT_COMPILATION_POLICY_VERSION,
  sourceFingerprint: 'context-source:manual-recall',
  sessionId: 'session:manual-recall',
  intentRevision: 1,
  workId: 'work:manual-recall',
  chapterId: 'chapter:manual-recall',
  sceneId: 'scene:manual-recall',
  canonRevision: 1,
  kernelRevision: 1,
  constraintRevision: 1,
  activeCharacters: [],
  relevantRelationships: [],
  activePromises: [],
  unresolvedForeshadowing: [],
  currentTimeline: {},
  relevantWorldRules: [],
  kernelRules: [],
  hardConstraints: [],
  relevantRegressionExamples: [],
  recentSceneSummaries: [],
  styleSamples: [],
  manualRecallItems: recalls,
  manifest: [],
  status: 'active',
  createdAt: '2026-07-18T00:00:00.000Z',
}
const context: ContextSnapshot = {
  ...contextSeed,
  contentFingerprint: contextSnapshotFingerprint(contextSeed),
}

const persistedReview = literaryReviewSchema.parse(createLiteraryReview({
  id: 'review:manual-recall',
  sessionId: 'session:manual-recall',
  context,
  draft: {
    schemaVersion: 'scene-draft-result.v1',
    draftId: 'draft:manual-recall',
    sessionId: 'session:manual-recall',
    baseCanonRevision: 1,
    baseIntentRevision: 1,
    baseCandidateRevision: 1,
    baseDraftRevision: 0,
    revision: 1,
    contentBlocks: draftBlocks,
    unplannedFactProposals: [],
    observedStateChanges: [],
    status: 'current',
    createdAt: '2026-07-18T00:00:00.000Z',
  },
  findings: [],
  manualRecallAdherence: passingReceipt,
  deterministicViolations: [],
  now: '2026-07-18T00:00:00.000Z',
}))
assert.deepEqual(persistedReview.manualRecallAdherence, passingReceipt)
const legacyReviewValue = structuredClone(persistedReview) as Record<string, unknown>
delete legacyReviewValue.contextSnapshotId
delete legacyReviewValue.contextCompilationPolicyVersion
delete legacyReviewValue.contextSourceFingerprint
delete legacyReviewValue.contextSnapshotFingerprint
const parsedLegacyReview = literaryReviewSchema.parse(legacyReviewValue)
assert.equal(parsedLegacyReview.contextSnapshotId, 'legacy-unbound-context')
assert.equal(parsedLegacyReview.contextCompilationPolicyVersion, 0)
assert.equal(parsedLegacyReview.contextSourceFingerprint, 'legacy-unfingerprinted')
assert.equal(parsedLegacyReview.contextSnapshotFingerprint, 'legacy-unfingerprinted')

const rejectingReceipt = createManualRecallAdherenceReceipt({
  review: {
    ...passingReview,
    decision: 'reject',
    checks: passingReview.checks.map((check, index) => index === 1
      ? {
          ...check,
          status: 'violated' as const,
          evidenceQuotes: ['闻澜隔着毒雾问他还能撑多久'],
          diagnosis: '该句若伴随后续明确知情陈述，将构成人物知识越界。',
        }
      : check),
  },
  selectedRecallItems: recalls,
  draftBlocks,
})
assert.deepEqual(
  manualRecallAdherenceViolations(rejectingReceipt),
  ['manual_recall_violated:asset:wenlan'],
)

assert.throws(() => createManualRecallAdherenceReceipt({
  review: {
    ...passingReview,
    checks: passingReview.checks.slice(0, 2),
  },
  selectedRecallItems: recalls,
  draftBlocks,
}), /every selected recall item exactly once/u)

assert.throws(() => createManualRecallAdherenceReceipt({
  review: {
    ...passingReview,
    checks: passingReview.checks.map((check, index) => index === 0
      ? { ...check, evidenceQuotes: ['正文里不存在的药物回归'] }
      : check),
  },
  selectedRecallItems: recalls,
  draftBlocks,
}), /not present in the candidate manuscript/u)

assert.throws(() => createManualRecallAdherenceReceipt({
  review: { ...passingReview, decision: 'reject' },
  selectedRecallItems: recalls,
  draftBlocks,
}), /contradicts its per-source checks/u)

console.log('Creator manual recall adherence domain checks passed.')
