import assert from 'node:assert/strict'
import {
  creatorWritingAssistPreferencesSchema,
  extendedCraftReviewSchema,
  writingAssistRecommendationSchema,
} from '../src/features/creator-decision/schemas'
import {
  validateAdvisoryCraftVerification,
} from '../src/features/creator-decision/advisoryCraftVerification'
import {
  advisoryCraftFindingToLocalRepairFinding,
  repairProposalFindingSource,
} from '../src/features/creator-decision/advisoryCraftRepairAdapter'
import { modelExtendedCraftReview } from '../src/features/creator-decision/localWorkingAgent'
import {
  markReviewStaleAfterEdit,
} from '../src/features/creator-decision/literaryReview'
import {
  DEFAULT_CREATOR_WRITING_ASSIST_PREFERENCES,
  markWritingAssistRecommendationStale,
  recommendWritingAssistLenses,
  writingAssistRecommendationIsCurrent,
} from '../src/features/creator-decision/writingAssistance'
import type {
  ContextSnapshot,
  CreationSession,
  LiteraryReview,
  SceneDraftResult,
} from '../src/features/creator-decision/types'
import { CreationDecisionError } from '../src/features/creator-decision/types'
import { normalizeWorkspaceSettingsRecord } from '../src/local-db/creatorLocalWorkspacePackage'
import {
  clearCreatorWritingAssistPreferences,
  saveCreatorWritingAssistPreferences,
  type CreatorSettingsWritePort,
} from '../src/apps/creator/routes/creatorSettingsActionService'
import { readHydratedCreatorSettingsLocalState } from '../src/apps/creator/routes/creatorSettingsHydrationService'

const session = { id: 'session:writing-assist' } as CreationSession
const context = {
  id: 'context:writing-assist',
  kernelRules: ['冒险场景必须让人物选择付出代价，并控制秘密揭示。'],
  manualRecallItems: [{ group: 'causal' }],
} as ContextSnapshot
const draft = {
  draftId: 'draft:writing-assist',
  revision: 4,
} as SceneDraftResult

assert.deepEqual(
  creatorWritingAssistPreferencesSchema.parse(DEFAULT_CREATOR_WRITING_ASSIST_PREFERENCES),
  DEFAULT_CREATOR_WRITING_ASSIST_PREFERENCES,
)
assert.equal(recommendWritingAssistLenses({
  preferences: DEFAULT_CREATOR_WRITING_ASSIST_PREFERENCES,
  session,
  context,
  draft,
}), null, 'disabled assistance must not create a recommendation')

const recommended = recommendWritingAssistLenses({
  preferences: { ...DEFAULT_CREATOR_WRITING_ASSIST_PREFERENCES, enabled: true },
  session,
  context,
  draft,
  explicitFocusLensIds: ['pacing'],
  generatedAt: '2026-07-18T12:00:00.000Z',
})
assert.ok(recommended)
assert.deepEqual(recommended.lensIds, ['pacing'])
assert.deepEqual(recommended.reasonCodes, [
  'natural_review_checkpoint',
  'author_explicit_focus',
])
assert.equal(writingAssistRecommendationIsCurrent({ recommendation: recommended, session, context, draft }), true)
assert.equal(writingAssistRecommendationIsCurrent({
  recommendation: recommended,
  session,
  context,
  draft: { ...draft, revision: 5 },
}), false)
assert.equal(markWritingAssistRecommendationStale(recommended).status, 'stale')

const contextualRecommendation = recommendWritingAssistLenses({
  preferences: { ...DEFAULT_CREATOR_WRITING_ASSIST_PREFERENCES, enabled: true },
  session,
  context,
  draft,
  generatedAt: '2026-07-18T12:00:00.000Z',
})
assert.ok(contextualRecommendation)
assert.deepEqual(contextualRecommendation.lensIds, ['continuity', 'information_control'])
assert.deepEqual(contextualRecommendation.reasonCodes, [
  'natural_review_checkpoint',
  'manual_recall_active',
  'genre_kernel_emphasis',
])

const legacyWorkspaceSettings = normalizeWorkspaceSettingsRecord({
  displayPreferences: { reduceMotion: true, reduceTransparency: false },
})
assert.equal(legacyWorkspaceSettings.writingAssistPreferences.enabled, false)
const currentWorkspaceSettings = normalizeWorkspaceSettingsRecord({
  displayPreferences: { reduceMotion: false, reduceTransparency: true },
  writingAssistPreferences: {
    ...DEFAULT_CREATOR_WRITING_ASSIST_PREFERENCES,
    enabled: true,
    selectionMode: 'custom',
    projectLensIds: ['continuity', 'pacing'],
  },
})
assert.deepEqual(currentWorkspaceSettings.writingAssistPreferences.projectLensIds, ['continuity', 'pacing'])

const savedPreferences: unknown[] = []
const settingsPort: CreatorSettingsWritePort = {
  hydrateWorkspace: async () => undefined,
  readWorkspaceSnapshot: () => ({}) as never,
  writeDisplayPreferences: () => undefined,
  writeWritingAssistPreferences: preferences => savedPreferences.push(preferences),
  resetWritingAssistPreferences: () => ({ ...DEFAULT_CREATOR_WRITING_ASSIST_PREFERENCES }),
}
const saveResult = saveCreatorWritingAssistPreferences(
  currentWorkspaceSettings.writingAssistPreferences,
  settingsPort,
)
assert.equal(saveResult.notice, '写作建议偏好已保存。')
assert.equal(savedPreferences.length, 1)
const clearResult = clearCreatorWritingAssistPreferences(settingsPort)
assert.equal(clearResult.preferences.enabled, false)

let settingsHydrated = false
const hydratedPreferences = {
  ...DEFAULT_CREATOR_WRITING_ASSIST_PREFERENCES,
  enabled: true,
  selectionMode: 'custom' as const,
  projectLensIds: ['prose_rhythm', 'ending_payoff'] as const,
}
const hydratedSettings = await readHydratedCreatorSettingsLocalState({
  hydrateWorkspace: async () => { settingsHydrated = true },
  readDisplayPreferences: () => {
    assert.equal(settingsHydrated, true)
    return { reduceMotion: true, reduceTransparency: false }
  },
  readWritingAssistPreferences: () => {
    assert.equal(settingsHydrated, true)
    return hydratedPreferences
  },
  readWorkspaceSnapshot: () => {
    assert.equal(settingsHydrated, true)
    return {} as never
  },
})
assert.deepEqual(
  hydratedSettings.writingAssistPreferences.projectLensIds,
  ['prose_rhythm', 'ending_payoff'],
  'settings load must restore writing assistance preferences after IndexedDB hydration',
)

const custom = recommendWritingAssistLenses({
  preferences: {
    ...DEFAULT_CREATOR_WRITING_ASSIST_PREFERENCES,
    enabled: true,
    selectionMode: 'custom',
    projectLensIds: ['voice', 'pacing', 'tension'],
    suppressedLensIds: ['pacing'],
  },
  session,
  context,
  draft,
  generatedAt: '2026-07-18T12:00:00.000Z',
})
assert.ok(custom)
assert.deepEqual(custom.lensIds, ['voice', 'tension'])
assert.deepEqual(custom.reasonCodes, ['natural_review_checkpoint', 'project_custom_selection'])

const advisoryCustom = recommendWritingAssistLenses({
  preferences: {
    ...DEFAULT_CREATOR_WRITING_ASSIST_PREFERENCES,
    enabled: true,
    selectionMode: 'custom',
    projectLensIds: ['dialogue_subtext', 'ending_payoff', 'prose_rhythm'],
  },
  session,
  context,
  draft,
  generatedAt: '2026-07-18T12:00:00.000Z',
})
assert.deepEqual(
  advisoryCustom?.lensIds,
  ['dialogue_subtext', 'ending_payoff'],
  'custom advisory lenses must reach the bounded recommendation without being coerced into the legacy dimensions',
)

assert.equal(writingAssistRecommendationSchema.safeParse({
  ...recommended,
  lensIds: ['pacing', 'continuity', 'tension'],
}).success, false, 'recommendations must never contain more than two lenses')

const evidence = [{
  blockId: 'block:1',
  startOffset: 0,
  endOffset: 4,
  excerptHash: 'hash:1',
}]
const extendedCraft = extendedCraftReviewSchema.parse({
  schemaVersion: 'extended-craft-review.v1',
  requestedLensIds: ['dialogue_subtext'],
  findings: [{
    id: 'advisory:1',
    lensId: 'dialogue_subtext',
    severity: 'revision_candidate',
    evidence,
    diagnosis: '表层问答重复了双方已知信息。',
    readerEffectHypothesis: '推测：读者可能感到对话只在传递说明。',
    authorTradeoff: '保留直白可以提高信息清晰度，但会减少人物之间的压力。',
    smallestExperiment: '只改证据句，让回答回避真正问题。',
    mappedExistingDimensions: ['voice', 'information_control'],
    confidence: 'medium',
    verification: 'verified',
    status: 'active',
  }],
  compositeLiteraryScoreUsed: false,
})
assert.equal(extendedCraft.findings[0].severity, 'revision_candidate')
assert.equal(extendedCraftReviewSchema.safeParse({
  ...extendedCraft,
  findings: [{ ...extendedCraft.findings[0], severity: 'hard_block' }],
}).success, false, 'advisory findings cannot become hard blockers')
assert.equal(extendedCraftReviewSchema.safeParse({
  ...extendedCraft,
  findings: [{ ...extendedCraft.findings[0], evidence: [] }],
}).success, false, 'advisory findings without manuscript evidence must be rejected')

const review = {
  status: 'active',
  findings: [],
  extendedCraft,
} as unknown as LiteraryReview
const staleReview = markReviewStaleAfterEdit(review, ['block:1'])
assert.equal(staleReview.status, 'stale')
assert.equal(staleReview.extendedCraft?.findings[0].status, 'stale')

const advisoryDraftText = '“你还是来了。”她把门让开，却没有松开藏在袖中的钥匙。'
const advisoryDraft = {
  ...draft,
  contentBlocks: [{
    id: 'block:advisory',
    text: advisoryDraftText,
    startOffset: 0,
    endOffset: advisoryDraftText.length,
    protected: false,
  }],
} as SceneDraftResult
const mappedAdvisory = modelExtendedCraftReview({
  draft: advisoryDraft,
  requestedLensIds: ['dialogue_subtext'],
  result: {
    schemaVersion: 'creator-literary-review.v1',
    findings: [],
    extendedCraft: {
      requestedLensIds: ['dialogue_subtext'],
      findings: [{
        lensId: 'dialogue_subtext',
        severity: 'revision_candidate',
        evidenceQuote: '把门让开，却没有松开藏在袖中的钥匙',
        diagnosis: '动作接住了欢迎的表层话语，但隐藏目标还可以更明确。',
        readerEffectHypothesis: '读者可能感到人物口头接纳与身体戒备之间存在压力。',
        authorTradeoff: '保留含蓄会增加悬念，但也可能让防备动机显得过轻。',
        smallestExperiment: '只调整证据句中的手部动作，让戒备对象更具体。',
        mappedExistingDimensions: ['voice', 'information_control'],
        confidence: 'medium',
      }],
    },
  },
})
assert.ok(mappedAdvisory)
assert.equal(mappedAdvisory.findings[0]?.evidence[0]?.blockId, 'block:advisory')
const advisoryFinding = mappedAdvisory.findings[0]!
const advisoryVerification = validateAdvisoryCraftVerification({
  reviewId: 'review:advisory',
  findings: [advisoryFinding],
  draftBlocks: advisoryDraft.contentBlocks,
  output: {
    schemaVersion: 'creator-advisory-craft-verification.v1',
    reviewId: 'review:advisory',
    findings: [{
      findingId: advisoryFinding.id,
      lensId: advisoryFinding.lensId,
      severity: 'revision_candidate',
      decision: 'verify',
      evidenceQuote: '把门让开，却没有松开藏在袖中的钥匙',
      rationale: '同一动作同时支持表层接纳与身体戒备的冲突，证据足以显示这条局部建议。',
    }],
    compositeLiteraryScoreUsed: false,
  },
})
assert.equal(advisoryVerification.findings[0]?.verification, 'verified')
assert.deepEqual(advisoryVerification.receipt.verifiedFindingIds, [advisoryFinding.id])
assert.throws(() => validateAdvisoryCraftVerification({
  reviewId: 'review:advisory',
  findings: [advisoryFinding],
  draftBlocks: advisoryDraft.contentBlocks,
  output: {
    schemaVersion: 'creator-advisory-craft-verification.v1',
    reviewId: 'review:advisory',
    findings: [{
      findingId: advisoryFinding.id,
      lensId: advisoryFinding.lensId,
      severity: 'revision_candidate',
      decision: 'verify',
      evidenceQuote: '正文中不存在的证据',
      rationale: '这条结果故意引用不存在的正文，用来验证证据门禁会拒绝它。',
    }],
    compositeLiteraryScoreUsed: false,
  },
}), /evidence/i, 'unlocatable advisory verification must fail closed')

const localRepairFinding = advisoryCraftFindingToLocalRepairFinding(
  advisoryVerification.findings[0]!,
)
assert.equal(localRepairFinding.source, 'advisory_lens')
assert.equal(localRepairFinding.repairDirection, advisoryFinding.smallestExperiment)
assert.deepEqual(repairProposalFindingSource(localRepairFinding), {
  kind: 'advisory_lens',
  lensId: 'dialogue_subtext',
})
for (const ineligible of [
  { ...advisoryVerification.findings[0]!, verification: 'unverified' as const },
  { ...advisoryVerification.findings[0]!, severity: 'taste_note' as const },
  { ...advisoryVerification.findings[0]!, status: 'stale' as const },
]) {
  assert.throws(
    () => advisoryCraftFindingToLocalRepairFinding(ineligible),
    error => error instanceof CreationDecisionError && error.code === 'evidence_missing',
    'only a verified active advisory revision candidate may enter the Reviser path',
  )
}

console.log('Creator writing assistance contracts verified.')
