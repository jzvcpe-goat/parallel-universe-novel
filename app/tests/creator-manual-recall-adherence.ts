import assert from 'node:assert/strict'
import {
  createManualRecallAdherenceReceipt,
  manualRecallAdherenceViolations,
} from '../src/features/creator-decision/manualRecallAdherence'
import { matchManualRecallEvidence } from '../src/features/creator-decision/manualRecallEvidence'
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

const silverKeyPromise = '银钥匙必须始终藏在旧钟内部，直到第三次涨潮才能取出'
const recallEvidenceCases = [
  {
    name: 'the unchanged normative constraint is supporting evidence',
    text: '银钥匙必须始终藏在旧钟内部，直到第三次涨潮才能取出。',
    status: 'respected',
  },
  {
    name: 'the normative constraint remains support inside surrounding prose',
    text: '守灯人复核封条。银钥匙必须始终藏在旧钟内部，直到第三次涨潮才能取出。潮声仍在远处。',
    status: 'respected',
  },
  {
    name: 'later contradiction in the same sentence',
    text: '银钥匙藏在旧钟内部。下一刻守灯人承认银钥匙没有藏在旧钟内部。',
    status: 'violated',
  },
  {
    name: 'later contradiction in a separate block',
    text: '银钥匙藏在旧钟内部。\n\n守灯人随后承认银钥匙没有藏在旧钟内部。',
    status: 'violated',
  },
  {
    name: 'postposed rejection',
    text: '银钥匙藏在旧钟内部——这句话不属实。',
    status: 'violated',
  },
  {
    name: 'removal before the promised tide',
    text: '银钥匙曾藏在旧钟内部，但守灯人在第一次涨潮时将它取出。',
    status: 'violated',
  },
  {
    name: 'later removal overrides repeated support',
    text: '银钥匙藏在旧钟内部。守灯人再次确认它仍在旧钟内部。随后守灯人把银钥匙从旧钟内部取出。',
    status: 'violated',
  },
  {
    name: 'bare not-in wording overrides earlier support',
    text: '银钥匙藏在旧钟内部。随后守灯人确认银钥匙不在旧钟内部。',
    status: 'violated',
  },
  {
    name: 'ordinary took-out wording overrides earlier support',
    text: '银钥匙藏在旧钟内部。第二次涨潮时守灯人把银钥匙拿了出来。',
    status: 'violated',
  },
  {
    name: 'ordinary moved-out wording overrides earlier support',
    text: '银钥匙藏在旧钟内部。后来守灯人将银钥匙移出旧钟内部。',
    status: 'violated',
  },
  {
    name: 'removal after the threshold is allowed',
    text: '银钥匙一直藏在旧钟内部。第三次涨潮后，守灯人把银钥匙拿了出来。',
    status: 'respected',
  },
  {
    name: 'reported speech is not evidence',
    text: '据说守灯人声称银钥匙必须始终藏在旧钟内部，直到第三次涨潮才能取出。',
    status: 'omitted',
  },
  {
    name: 'hypothetical mention is not evidence',
    text: '如果银钥匙必须始终藏在旧钟内部，守灯人就会等到第三次涨潮。',
    status: 'omitted',
  },
  {
    name: 'plain speech attribution is not evidence',
    text: '守灯人说银钥匙仍藏在旧钟内部。',
    status: 'omitted',
  },
  {
    name: 'short hypothetical marker is not evidence',
    text: '若银钥匙仍藏在旧钟内部，守灯人便会继续等待。',
    status: 'omitted',
  },
  {
    name: 'common rhetorical question is not evidence',
    text: '谁会相信银钥匙仍藏在旧钟内部？',
    status: 'omitted',
  },
  {
    name: 'a report followed by a separate factual assertion is accepted',
    text: '守灯人说银钥匙仍藏在旧钟内部。开钟验看后，银钥匙确实仍藏在旧钟内部。',
    status: 'respected',
  },
  {
    name: 'rhetorical rejection is not evidence',
    text: '银钥匙必须始终藏在旧钟内部——难道不是荒唐的说法吗？',
    status: 'omitted',
  },
  {
    name: 'ambiguous double negation is not evidence',
    text: '不能说银钥匙没有藏在旧钟内部。',
    status: 'omitted',
  },
  {
    name: 'an unrelated removal action is not a contradiction',
    text: '她从药箱里取出最后一卷绷带。',
    status: 'omitted',
  },
  {
    name: 'an unrelated removal in a supporting sentence does not target the key',
    text: '银钥匙仍藏在旧钟内部，守灯人从药箱里取出一卷绷带。',
    status: 'respected',
  },
  {
    name: 'an unrelated removal joined without punctuation does not target the key',
    text: '银钥匙仍藏在旧钟内部而守灯人从药箱里拿出绷带。',
    status: 'respected',
  },
  {
    name: 'a pronoun follows the nearest explicit object rather than an older key',
    text: '银钥匙仍藏在旧钟内部。\n\n守灯人拿起旧地图。第二次涨潮时，他把它拿了出来。',
    status: 'respected',
  },
  {
    name: 'an unclassified pronoun state change fails closed',
    text: '银钥匙仍藏在旧钟内部。第二次涨潮时，守灯人对它做了无法识别的处置。',
    status: 'omitted',
  },
  {
    name: 'container lookup cannot find the constrained subject',
    text: '银钥匙藏在旧钟内部。后来打开钟门时，旧钟内部已找不到银钥匙。',
    status: 'violated',
  },
  {
    name: 'subject is moved to an outside location',
    text: '银钥匙藏在旧钟内部。后来银钥匙被藏到了旧钟外部。',
    status: 'violated',
  },
  {
    name: 'postposed object is extracted from the container',
    text: '银钥匙藏在旧钟内部。第二次涨潮时守灯人从旧钟内部抽出了银钥匙。',
    status: 'violated',
  },
  {
    name: 'subject is taken away before the threshold',
    text: '银钥匙藏在旧钟内部。第二次涨潮时守灯人把银钥匙带走了。',
    status: 'violated',
  },
  {
    name: 'subject is transferred to another container',
    text: '银钥匙藏在旧钟内部。第二次涨潮时银钥匙已被转移到灯塔抽屉。',
    status: 'violated',
  },
  {
    name: 'subject leaves the required container',
    text: '银钥匙藏在旧钟内部。第二次涨潮时，银钥匙已经离开了旧钟内部。',
    status: 'violated',
  },
  {
    name: 'subject disappears from the required container',
    text: '银钥匙藏在旧钟内部。第二次涨潮时，银钥匙从旧钟内部消失了。',
    status: 'violated',
  },
  {
    name: 'subject is handed to another person',
    text: '银钥匙藏在旧钟内部。第二次涨潮时，守灯人把银钥匙交给了船长。',
    status: 'violated',
  },
  {
    name: 'subject is placed in another container',
    text: '银钥匙藏在旧钟内部。第二次涨潮时，守灯人把银钥匙塞进了自己的衣袋。',
    status: 'violated',
  },
  {
    name: 'subject is missing when checked after earlier removal',
    text: '银钥匙藏在旧钟内部。第二次涨潮后检查封条时，银钥匙已经不见了。',
    status: 'violated',
  },
  {
    name: 'a later denial refers to the prior proposition',
    text: '银钥匙藏在旧钟内部——守灯人随后否认了此事。',
    status: 'violated',
  },
  {
    name: 'a later fabrication claim refers to the prior proposition',
    text: '银钥匙藏在旧钟内部；这话纯属杜撰。',
    status: 'violated',
  },
  {
    name: 'repeated support across blocks cannot hide extraction',
    text: '银钥匙藏在旧钟内部。\n\n银钥匙藏在旧钟内部。\n\n第二次涨潮时守灯人从旧钟内部抽出了银钥匙。',
    status: 'violated',
  },
  {
    name: 'pronoun extraction resolves to the active constrained subject',
    text: '银钥匙藏在旧钟内部。第二次涨潮时，守灯人把它拿了出来。',
    status: 'violated',
  },
  {
    name: 'before-threshold extraction with a pronoun is violated',
    text: '银钥匙藏在旧钟内部。还没到第三次涨潮，守灯人便取出了它。',
    status: 'violated',
  },
  {
    name: 'a later threshold reminder cannot excuse an earlier extraction',
    text: '银钥匙藏在旧钟内部。第二次涨潮时守灯人把银钥匙拿出旧钟内部，尽管约定写着第三次涨潮后。',
    status: 'violated',
  },
  {
    name: 'normative future extraction is not an actual removal',
    text: '银钥匙仍藏在旧钟内部。守灯人必须等到第三次涨潮才能把银钥匙从旧钟内部拿出来。',
    status: 'respected',
  },
  {
    name: 'later future extraction plan is not an actual removal',
    text: '银钥匙仍藏在旧钟内部。守灯人打算等第四次涨潮后再把银钥匙取出来。',
    status: 'respected',
  },
  {
    name: 'later future extraction plan with pronoun is not an actual removal',
    text: '银钥匙仍藏在旧钟内部。守灯人计划在第四次涨潮时再把它拿出来。',
    status: 'respected',
  },
  {
    name: 'just-passed threshold permits extraction',
    text: '银钥匙一直藏在旧钟内部。第三次涨潮刚过，守灯人把银钥匙拿了出来。',
    status: 'respected',
  },
  {
    name: 'explicitly unrealized extraction preserves the constraint',
    text: '银钥匙仍在旧钟内部，尚未取出。',
    status: 'respected',
  },
  {
    name: 'speech attribution before a comma is not factual support',
    text: '守灯人说，银钥匙仍藏在旧钟内部。',
    status: 'omitted',
  },
  {
    name: 'rumor attribution is not factual support',
    text: '根据传闻，银钥匙仍藏在旧钟内部。',
    status: 'omitted',
  },
  {
    name: 'legend attribution is not factual support',
    text: '相传银钥匙仍藏在旧钟内部。',
    status: 'omitted',
  },
  {
    name: 'written attribution is not factual support',
    text: '航海日志写着：银钥匙仍藏在旧钟内部。',
    status: 'omitted',
  },
  {
    name: 'assumption is not factual support',
    text: '假设银钥匙仍藏在旧钟内部，守灯人便会继续等待。',
    status: 'omitted',
  },
  {
    name: 'colon assumption is not factual support',
    text: '假设：银钥匙仍藏在旧钟内部，守灯人便会继续等待。',
    status: 'omitted',
  },
  {
    name: 'conditional as long as is not factual support',
    text: '只要银钥匙仍藏在旧钟内部，守灯人就继续等待。',
    status: 'omitted',
  },
  {
    name: 'conditional unless is not factual support',
    text: '除非银钥匙仍藏在旧钟内部，守灯人才继续等待。',
    status: 'omitted',
  },
  {
    name: 'whether concession is not factual support',
    text: '无论银钥匙是否仍藏在旧钟内部，守灯人都会继续等待。',
    status: 'omitted',
  },
  {
    name: 'plain question is not factual support',
    text: '银钥匙仍藏在旧钟内部吗？',
    status: 'omitted',
  },
  {
    name: 'speculative question is not factual support',
    text: '莫非银钥匙仍藏在旧钟内部？',
    status: 'omitted',
  },
  {
    name: 'rhetorical how question is not factual support',
    text: '银钥匙怎会仍藏在旧钟内部？',
    status: 'omitted',
  },
  {
    name: 'disbelief statement is not factual support',
    text: '谁都不会相信银钥匙仍藏在旧钟内部。',
    status: 'omitted',
  },
  {
    name: 'so-called claim is not factual support',
    text: '所谓“银钥匙仍藏在旧钟内部”只是一种猜测。',
    status: 'omitted',
  },
  {
    name: 'pending confirmation is not factual support',
    text: '银钥匙是否仍藏在旧钟内部，尚待确认。',
    status: 'omitted',
  },
  {
    name: 'seemingly true claim is not factual support',
    text: '银钥匙似乎仍藏在旧钟内部。',
    status: 'omitted',
  },
  {
    name: 'possible claim is not factual support',
    text: '银钥匙或许仍藏在旧钟内部。',
    status: 'omitted',
  },
  {
    name: 'container alias and subject alias bind to an early extraction',
    text: '银钥匙仍藏在旧钟内部。第二次涨潮时，守灯人从钟腔里取出了那枚钥匙。',
    status: 'violated',
  },
  {
    name: 'a seal inspection does not change the constrained subject state',
    text: '银钥匙仍藏在旧钟内部。守灯人检查了银钥匙的封条。',
    status: 'respected',
  },
  {
    name: 'an empty constrained container contradicts prior support',
    text: '银钥匙仍藏在旧钟内部。第二次涨潮时打开钟门，旧钟内部已经空无一物。',
    status: 'violated',
  },
  {
    name: 'a constrained container containing only dust contradicts prior support',
    text: '银钥匙仍藏在旧钟内部。第二次涨潮时打开钟门，旧钟里面只剩灰尘。',
    status: 'violated',
  },
  {
    name: 'an action executed according to plan remains an executed action',
    text: '银钥匙仍藏在旧钟内部。第二次涨潮时守灯人按计划把银钥匙拿了出来。',
    status: 'violated',
  },
  {
    name: 'a prior sentence supplies the time for the following transition',
    text: '银钥匙一直藏在旧钟内部。\n\n第三次涨潮刚过。\n\n守灯人把银钥匙拿了出来。',
    status: 'respected',
  },
  {
    name: 'quoted direct speech is attribution rather than factual support',
    text: '守灯人低声道：“银钥匙仍藏在旧钟内部。”',
    status: 'omitted',
  },
  {
    name: 'postposed speech attribution is not factual support',
    text: '“银钥匙仍藏在旧钟内部”，守灯人回答。',
    status: 'omitted',
  },
  {
    name: 'an unrelated following question does not erase factual support',
    text: '银钥匙仍藏在旧钟内部，谁去守北门？',
    status: 'respected',
  },
  {
    name: 'factual support remains accepted',
    text: '银钥匙仍藏在旧钟内部，她没有在第三次涨潮前将它取出。',
    status: 'respected',
  },
] as const

for (const testCase of recallEvidenceCases) {
  assert.equal(
    matchManualRecallEvidence(silverKeyPromise, draftBlocksFromText(testCase.text)).status,
    testCase.status,
    testCase.name,
  )
}

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
      sourceRevision: 6,
      group: 'causal',
      status: 'fulfilled',
      evidenceQuotes: ['没有第二支药'],
      diagnosis: '耗尽的药物直接限制了当前应对方式。',
    },
    {
      sourceId: 'asset:wenlan',
      sourceRevision: 2,
      group: 'character_knowledge',
      status: 'respected',
      evidenceQuotes: ['没有回答'],
      diagnosis: '许照继续隐瞒，闻澜没有越过信息边界。',
    },
    {
      sourceId: 'canon:greenhouse-time',
      sourceRevision: 1,
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
const legacyRecallChecks = (
  legacyReviewValue.manualRecallAdherence as { checks: Array<Record<string, unknown>> }
).checks
legacyRecallChecks.forEach(check => delete check.sourceRevision)
const parsedLegacyReview = literaryReviewSchema.parse(legacyReviewValue)
assert.equal(parsedLegacyReview.contextSnapshotId, 'legacy-unbound-context')
assert.equal(parsedLegacyReview.contextCompilationPolicyVersion, 0)
assert.equal(parsedLegacyReview.contextSourceFingerprint, 'legacy-unfingerprinted')
assert.equal(parsedLegacyReview.contextSnapshotFingerprint, 'legacy-unfingerprinted')
assert.ok(
  parsedLegacyReview.manualRecallAdherence?.checks.every(check => check.sourceRevision === -1),
  'legacy unbound recall receipts must migrate to a fail-closed source revision',
)

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

assert.throws(() => createManualRecallAdherenceReceipt({
  review: {
    ...passingReview,
    checks: passingReview.checks.map((check, index) => index === 0
      ? { ...check, sourceRevision: check.sourceRevision + 1 }
      : check),
  },
  selectedRecallItems: recalls,
  draftBlocks,
}), /source order, revision, or recall group/u)

console.log('Creator manual recall adherence domain checks passed.')
