#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  creatorAgentRoleNames,
  creatorWorkingAgentExecutionPlan,
  creatorWorkingAgentRoleRuntimeSummary,
} from './creator-working-agent-roles.mjs'

const root = process.cwd()
const failures = []

function read(path) {
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) {
    failures.push(`missing ${path}`)
    return ''
  }
  return readFileSync(absolute, 'utf8')
}

function requireAll(path, markers) {
  const source = read(path)
  for (const marker of markers) {
    if (!source.includes(marker)) failures.push(`${path} missing ${marker}`)
  }
  return source
}

const domainFiles = [
  'app/src/features/creator-decision/characterState.ts',
  'app/src/features/creator-decision/characterSimulation.ts',
  'app/src/features/creator-decision/miroFishCharacterSimulationAdapter.ts',
  'app/src/features/creator-decision/types.ts',
  'app/src/features/creator-decision/schemas.ts',
  'app/src/features/creator-decision/stateMachine.ts',
  'app/src/features/creator-decision/contextCompiler.ts',
  'app/src/features/creator-decision/candidateSearch.ts',
  'app/src/features/creator-decision/sceneDrafting.ts',
  'app/src/features/creator-decision/storyStateEvidence.ts',
  'app/src/features/creator-decision/literaryReview.ts',
  'app/src/features/creator-decision/nextChapterQualityGate.ts',
  'app/src/features/creator-decision/pairedQualityCampaign.ts',
  'app/src/features/creator-decision/canonPatch.ts',
  'app/src/features/creator-decision/historicalStateBackfill.ts',
  'app/src/features/creator-decision/referenceWritingAgent.ts',
  'app/src/features/creator-decision/structuredAgentCall.ts',
  'scripts/fixtures/creator-frozen-paired-quality-fixture.mts',
]

for (const path of domainFiles) {
  const source = read(path)
  for (const forbidden of ['from \'react\'', 'from "react"', 'localStorage', 'pmfSupabase', '@supabase/', 'window.fetch']) {
    if (source.includes(forbidden)) failures.push(`${path} must stay UI, browser-storage, and cloud independent: ${forbidden}`)
  }
}

requireAll('app/src/features/creator-decision/types.ts', [
  'CreationSessionPhase',
  'AuthorIntentContract',
  'ContextSnapshot',
  'NarrativeCandidate',
  'SceneDraftResult',
  'SceneDraftDirectionReceipt',
  'LiteraryReview',
  'RepairProposal',
  'LocalRepairCandidate',
  'LocalRepairReview',
  'CanonStatePatch',
  'HistoricalStateBackfillProposal',
  'CreationDecisionRepository',
  'WritingAgentCapabilities',
  'literaryDimensions',
  'requestedFocusDimensions?: LiteraryDimension[]',
  'focusDimensions?: LiteraryDimension[]',
  'simulateCharacters?',
  'proposeRepair?',
  'reviewRepair?',
])
requireAll('app/src/features/creator-decision/structuredAgentCall.ts', [
  'Initial: ${first.issues.join',
  'Repair: ${repaired.issues.join',
])
requireAll('app/src/features/creator-decision/localWorkingAgent.ts', [
  'requestedFocusDimensions: input.focusDimensions || []',
  'requestedFocusDimensions: input.focusDimensions',
])
requireAll('app/src/features/creator-decision/candidateQualityGate.ts', [
  'evaluateCandidateQualityGate',
  'assertCandidateQualityGate',
  'review_not_current',
  'active_revision_candidate',
  'pending_repair_decision',
  'direction_receipt_missing',
  'direction_receipt_axis_mismatch',
  'direction_receipt_evidence_invalid',
  'direction_adjustment_evidence_invalid',
])
requireAll('app/src/features/creator-decision/creationDecisionWorkflow.ts', [
  'repairs: snapshot.repairs',
  'intent: requireIntent(snapshot)',
])
requireAll('app/src/features/creator-decision/canonPatch.ts', [
  'assertCandidateQualityGate',
  'intent: input.intent',
])
requireAll('app/tests/creator-candidate-quality-gate.ts', [
  'direction_receipt_missing',
  'direction_receipt_axis_mismatch',
  'direction_receipt_evidence_invalid',
  'active_hard_block',
  'active_revision_candidate',
  'deterministic_violation',
  'pending_repair_decision',
  "console.log('[creator-candidate-quality-gate] PASS')",
])
requireAll('app/tests/creator-decision-workflow.ts', [
  'an unresolved revision candidate must block canon patch preparation',
  'an unresolved revision candidate must stop before the Agent call',
  'the fixture must prove author resolution of active revision candidates',
  'explicit author dismissals must resolve every revision candidate before canon patch preparation',
  'a pending current-revision repair must block canon patch preparation',
  'the gate must stop before asking an Agent to prepare a canon patch',
  'a pending current-revision repair must block the repository commit boundary',
  'a blocked commit must not partially mutate local canon',
  'a blocked commit must not append partial confirmation or commit events',
])
requireAll('app/src/features/creator-decision/creationDecisionWorkflow.ts', [
  'focusDimensions?: LiteraryDimension[]',
  'recommendWritingAssistLenses',
  'const focusDimensions = input.focusDimensions?.length',
  'focusDimensions,',
  'requestedFocusDimensions: savedReview.requestedFocusDimensions || []',
])
requireAll('app/src/features/creator-decision/pairedLiteraryComparison.ts', [
  'pairedLiteraryTradeoffReasonCodes',
  'pairedHardConstraintReasonCodes',
  'required_causal_consequence_omitted',
  'A verified hard-constraint item must confirm the original reason code without silently changing it.',
  'reasonCodesByDimension',
  'validateTradeoffReason',
  'A tie must identify a balanced tradeoff or no material difference.',
  'A verified dimension must confirm the original reason code without silently changing it.',
  'pairedLiteraryComparisonEvidenceIssues',
  'pairedLiteraryComparisonVerificationEvidenceIssues',
  'assertPairedLiteraryVerificationEvidenceRevision',
  'The blind comparison contains an unlocatable manuscript block id',
  'The blind verification contains an unlocatable manuscript block id',
])
requireAll('app/tests/creator-paired-literary-comparison.ts', [
  'silentReasonChange',
  'invalidTieReason',
  'silentHardConstraintReasonChange',
  "sharedContext: { fixture: 'all-evidence-issues' }",
  "sharedContext: { fixture: 'non-evidence-error' }",
  'non-evidence contract errors must not invoke the comparison revision',
  "sharedContext: { fixture: 'verification-all-evidence-issues' }",
  'non-evidence verification errors must not invoke evidence correction',
  'changed a literary judgment',
])
requireAll('app/src/features/creator-decision/localWorkingAgent.ts', [
  "if (error.code !== 'evidence_missing') throw error",
  'evidenceIssues,',
  "operation: 'paired_literary_comparison_verification_revision'",
])
requireAll('scripts/creator-working-agent-roles.mjs', [
  "paired_literary_comparison_verification_revision: ['Auditor']",
])
requireAll('scripts/creator-working-agent-bridge.mjs', [
  'paired_literary_comparison_verification_revision',
  '不得重新比较文学偏好',
  '这是唯一一次复核证据纠错',
])
requireAll('app/src/features/creator-decision/pairedQualityCampaign.ts', [
  'minimumDistinctFixturesForLiteraryWeakness',
  'confirmedWorkflowHardFailureRequiresImmediateReview: true',
  'automaticPromptMutationAllowed: false',
  'hold_current_workflow',
  'review_workflow_change',
  'new Set(input.trials.map(trial => trial.fixtureId))',
])
requireAll('app/tests/creator-paired-quality-campaign.ts', [
  'oneFixtureRepeatedDimension',
  'crossFixtureWeakness',
  'hardFailure',
  'directOnlyHardFailure',
  'automaticPromptMutationAllowed',
])
requireAll('scripts/creator-working-agent-bridge.mjs', [
  'sceneDraftOutputIssues',
  'Writer must return an empty array; Observer owns evidence-grounded 22-dimension state extraction',
  'sceneArchitectureDensityIssues',
  'writerLatitudeForScene',
  'sceneArchitectureDensityIssues: densityIssues',
  'writerLatitude: writerLatitudeForScene()',
  'informationBoundary',
  'informationControlCheck',
  'executionQualityChecks',
  'causal_escalation',
  'embodied_action',
  'choice_consequence',
  '人物最多得出 allowedInference',
  '不得在旁白、对白或内心独白中确认 withheldInference',
  'sceneLengthCompletionBounds',
  'operation: `${operation}:length_completion`',
  '只为同一场景追加一个局部段落，不得重写或复述 currentBody',
  '不要机械地“一节拍一段”',
  '局部成功要制造更窄的新阻力',
  'action-feedback-adjustment loops',
  'invokeValidatedSceneDraft',
  'stateProposals 必须严格返回 []',
  '每个维度还必须返回一个 reasonCode',
  'confirmedReasonCode',
  'reasonCode=no_violation',
  'required_causal_consequence_omitted',
  'confirmedViolationType、confirmedReasonCode',
  '不能静默替换失败原因',
  'scene_draft_direction_repair_requires_full_pipeline',
  'authorDirectionReview: draftReview.review',
  'literary_review_revision',
  '只能修正 evidenceQuote 无法定位的 finding',
  '不得新增 finding、不得扩大诊断范围',
  '这是唯一一次语义证据纠错',
  '作者本轮指定优先审阅维度',
  '这只改变检查优先级',
  '指定维度没有可逐字定位的正文证据时不得输出 finding',
  'sceneArchitectureReviewEvidenceIssues',
  'sceneArchitectureReviewEvidenceCatalog',
  'allowedEvidenceCatalog',
  'assertSceneArchitectureReviewEvidenceRevision',
  'scene_architecture_review_evidence_revision_semantic_change',
  'scene_architecture_review_evidence_revision_catalog_mismatch',
  'validationError.evidenceIssues',
  '所有未列出的证据必须逐字段保持',
])
requireAll('scripts/run-creator-frozen-paired-quality-trial.mts', [
  'generationOrderRandomized: true',
  'candidateLabelsRandomized: true',
  'overallWinnerDeclared: false',
  'directionReceiptPresent: Boolean(workflowResult.directionReceipt)',
  'chapter21AccessedOrChanged: false',
  'confirmedViolationType: verified.confirmedViolationType',
  'confirmedReasonCode: verified.confirmedReasonCode',
  'refineWorkflowCandidate',
  'domainReviewIntent',
  'localhostLongTaskFetch',
  '15 * 60 * 1000',
  'localRepairCycleLimit: 2',
  'wholeTextRewritePerformed: false',
  'authorTextOverwritten: false',
  "'review-focus'",
  "reviewFocusSource: input.focusDimensions.length > 0 ? 'human_specified' : 'none'",
  'automaticFocusSelectionPerformed: false',
  "['Auditor', 'literary_review']",
  'executeBoundedOptionalLocalRepair',
  'assessOptionalLocalRepairEfficacy',
  'postRepairEfficacyReviewCount',
  'reverted_target_dimension_persisted',
])
requireAll('scripts/frozen-paired-quality-local-repair.mts', [
  'initial_repair_failed_closed',
  'independent_review_failed_closed',
  'auditor_guided_revision_failed_closed',
  'optionalLocalRepairNextAction',
  'assessOptionalLocalRepairEfficacy',
  'continue_original_candidate',
  'reverted_target_dimension_persisted',
  'selectEfficacyGuidedRetryTarget',
  'executeSingleEfficacyGuidedRepair',
  "failedAt: 'reviser' | 'auditor'",
  "status: 'failed_closed'",
])
requireAll('scripts/test-frozen-paired-quality-local-repair.mts', [
  'fixture_initial_failure',
  'fixture_revision_not_distinct',
  "optionalLocalRepairNextAction('rejected_by_auditor')",
  "optionalLocalRepairNextAction('reverted_target_dimension_persisted')",
  "decision: 'revert_original_candidate'",
  'an efficacy retry must stay on the same dimension and one unprotected evidence block',
  'a multi-block efficacy finding must not expand the retry scope',
  'executeSingleEfficacyGuidedRepair',
  'a review must bind the current reviewed draft revision',
  'a repair reviewed against revision 1 must apply to revision 1',
  "console.log('[frozen-paired-quality-local-repair] PASS')",
])
requireAll('scripts/run-creator-efficacy-guided-repair-trial.mts', [
  'frozen-original-three-block-repetition-v1',
  'executeBoundedOptionalLocalRepair',
  'selectEfficacyGuidedRetryTarget',
  'executeSingleEfficacyGuidedRepair',
  "focusDimensions: ['repetition']",
  'requestSceneAuthorDirectionDraftReviewFromWorkingAgent',
  'sceneDraftDirectionReceiptFromReview',
  'retryLimit: 1',
  'realChapterMaterialUsed: false',
  'authorTextOverwritten: false',
  'chapter20ReadOrWritten: false',
  'chapter21ReadOrWritten: false',
])
requireAll('scripts/check-creator-efficacy-guided-repair-trial.mjs', [
  'creator-efficacy-guided-repair-trial.v1',
  "'require-trigger'",
  "'require-pass'",
  'temporaryArtifactsDeletedAfterSummary',
  'generalLiteraryImprovementProven',
])
requireAll('scripts/test-creator-working-agent-role-pipeline.mjs', [
  'role-pipeline-execution-quality-revision',
  'executionQualityChecks 有 reject',
  '局部成功制造下一拍更窄的问题',
  'role-pipeline-literary-evidence-revision',
  "requestedFocusDimensions: ['pacing', 'voice']",
  'Literary Auditor did not receive the human-specified focus dimensions.',
  "manifest.operation === 'literary_review_revision'",
  'role-pipeline-decision-option-unknown-issue',
  'role-pipeline-decision-option-persistent-unknown-issue',
  'scene_author_decision_options_semantic_revision',
  'role-pipeline-review-evidence-semantic-mutation',
  'role-pipeline-review-evidence-persistent-invalid',
  'scene_architecture_review_evidence_revision_semantic_change',
])
requireAll('scripts/creator-working-agent-bridge.mjs', [
  'invokeValidatedSceneAuthorDecisionOptions',
  'allowedIssueCodes',
  "semanticRevisionReason: 'unknown_issue_reference'",
  "operation: 'scene_author_decision_options_semantic_revision'",
  '这是唯一一次 Planner 语义纠正',
])
requireAll('validation/creator-ui/schemas/scene-architecture-review.schema.json', [
  'executionQualityChecks',
  'causal_escalation',
  'embodied_action',
  'choice_consequence',
])
requireAll('scripts/fixtures/creator-frozen-paired-quality-fixture.mts', [
  'frozenPairedQualityCoreFixtureIds',
  'frozenPairedQualityFixtureIds',
  'frozen-original-paired-quality-v1',
  'frozen-original-bridge-withdrawal-v1',
  'frozen-original-bell-infiltration-v1',
  'frozen-original-glass-lung-endurance-v1',
  'frozen-original-archive-tribunal-refusal-v1',
  'frozen-original-floodgate-sacrifice-v1',
  'frozenPairedQualityFixtureById',
])
requireAll('scripts/run-creator-frozen-paired-quality-campaign.mts', [
  "schemaVersion: 'creator-frozen-paired-quality-campaign.v1'",
  'weaknessReasonCounts',
  'qualityTuningDecision',
  "'fixture-set'",
  "'reuse-campaign'",
  "'reuse-existing'",
  'hardConstraintOutcomes',
  'overallWinnerDeclared: false',
  'compositeLiteraryScoreUsed: false',
  'chapter20AccessedOrChanged: false',
  'chapter21AccessedOrChanged: false',
  'rawDraftPersistedInRepository: false',
])
requireAll('scripts/check-creator-frozen-paired-quality-campaign.mjs', [
  "'fixture-set'",
  "'require-refinement-fixtures'",
  "'frozen-original-glass-lung-endurance-v1'",
  "'frozen-original-archive-tribunal-refusal-v1'",
  "'frozen-original-floodgate-sacrifice-v1'",
  "assert.equal(summary.schemaVersion, 'creator-frozen-paired-quality-campaign.v1')",
  'assert.equal(child.fixture.realChapterMaterialUsed, false)',
  'assert.equal(child.fairness.evaluatorSawGenerationPath, false)',
  'assert.equal(child.fairness.verifierSawGenerationPath, false)',
  'assert.deepEqual(child.boundaries, childBoundaries)',
  'assert.equal(summary.aggregate.overallWinnerDeclared, false)',
  'chapter21AccessedOrChanged: false,',
])
requireAll('scripts/check-creator-frozen-paired-quality-trial.mjs', [
  "assert.equal(summary.candidates.architectWriterWorkflow.directionReceiptPresent, true)",
  'assert.equal(summary.evaluation.overallWinnerDeclared, false)',
  'chapter21AccessedOrChanged: false,',
  'hardReasonCodesByViolation',
  'assert.equal(item.confirmedReasonCode, item.reasonCode)',
])
requireAll('validation/creator-ui/schemas/paired-literary-comparison.schema.json', [
  'required_causal_consequence_omitted',
  'canon_fact_contradicted',
  'reasonCode',
])
requireAll('validation/creator-ui/schemas/paired-literary-comparison-verification.schema.json', [
  'confirmedViolationType',
  'confirmedReasonCode',
  'required_causal_consequence_omitted',
])
requireAll('app/src/features/creator-decision/characterState.ts', [
  'characterStateDimensions',
  'characterStateDimensionGroups',
  'embodiedContinuity',
  'agencyAndCommitment',
  'innerModel',
  'socialDynamics',
  'relationshipStances',
  'paidCost',
  'parseCharacterStatePath',
])
requireAll('app/src/features/creator-decision/characterSimulation.ts', [
  'authorConfirmedExport: z.literal(true)',
  "status: z.literal('proposed')",
  'validateEvidenceReferences',
  '模拟结果不是正文，也不是正史',
])
requireAll('app/tests/creator-character-state-pipeline.ts', [
  'for (const dimensions of Object.values(characterStateDimensionGroups))',
  'one Observer state-evidence run must stay within the eight-proposal limit',
  'assertDistinctStoryStateOperationPaths(operations)',
  'applyStatePatchOperations({}, operations)',
  'the next writing context must receive all committed character-state dimensions',
  'a partial runtime projection must not erase unmentioned Canon dimensions',
  'an undefined runtime field must not delete the committed Canon value',
  'a legacy runtime alias must not replace the current relationship dimension',
  'legacy aliases must be normalized by migration rather than leak into a current context',
])
requireAll('app/src/apps/creator/routes/creatorEditorDecisionContextAdapter.ts', [
  'characterStateDimensionSchema.safeParse(dimension).success',
  'if (!canonState) return projectedState',
  'if (!projectedState) return canonState',
  'return { ...canonState, ...projectedState }',
  'tailExcerpt',
  'headTailExcerpt',
  'indexedStyleParagraphs',
  'usableStyleEnding',
  'chapterNarrativeSummary',
  'buildRecentSceneSummaries',
  '作者手动选中的历史快照；仅明确正史与收尾证据可作已发生事实',
  'buildDistinctStyleEvidence',
  "excerptMode: 'head' | 'tail'",
  'distributedManuscriptStyleParagraphs',
  'Math.floor(substantiveParagraphs.length / 2)',
  'historicalChapterStyleSamples',
  'manuscriptParagraphIndex',
  'manuscript-style:paragraph:',
  'chapter-style:${chapter.id}:paragraph:',
  '当前章节收束的作者表达证据',
  '最近入选正文章节的收束表达证据',
])
requireAll('app/src/features/creator-decision/miroFishCharacterSimulationAdapter.ts', [
  '/v1/character-simulation',
  'validateCharacterSimulationResult',
])
requireAll('app/src/features/creator-decision/stateMachine.ts', [
  'intentLockBlockers',
  '.slice(0, 2)',
  'multi_chapter_generation_forbidden',
  "canon_committed: ['intent_discovery', 'drafting']",
  'propagateInvalidation',
])
requireAll('app/src/features/creator-decision/sceneAuthorDecision.ts', [
  'pendingSceneAuthorDecision',
  'scene_author_decision_selected',
  'reviseIntentFromSceneAuthorDecision',
  'author_decision_option_invalid',
  "sceneMechanismDirection: 'author_selected'",
])
requireAll('app/src/features/creator-decision/creationDecisionWorkflow.ts', [
  'selectSceneAuthorDecision',
  'scene_author_decision_requested',
  "trigger: 'intent_revision_changed'",
  "type: 'scene_author_decision_selected'",
])
requireAll('validation/creator-ui/schemas/scene-author-decision-selection.schema.json', [
  'creator-scene-author-decision-selection.v1',
  'authorConfirmed',
  'decisionId',
  'intentRevision',
])
requireAll('app/src/features/creator-decision/nextChapterQualityGate.ts', [
  'evaluateNextChapterQualityGate',
  "code: 'chapter_not_confirmed'",
  "code: 'pending_repair_decision'",
  "code: 'active_hard_block'",
  "code: 'deterministic_violation'",
  'activeHardBlockFindings',
])
requireAll('app/src/features/creator-decision/candidateSearch.ts', [
  'candidateDistance',
  'selectNonDominatedCandidates',
  'hardConstraintPassed',
])
requireAll('app/src/features/creator-decision/sceneDrafting.ts', [
  'hasCompleteSceneEnding',
  'countVisibleCharacters',
  'rebaseDraftBlockOffsets',
  'directionReceipt',
  'withoutSceneDraftDirectionReceipt',
])
const creationDecisionWorkflowSource = read('app/src/features/creator-decision/creationDecisionWorkflow.ts')
if ((creationDecisionWorkflowSource.match(/withoutSceneDraftDirectionReceipt\(current\)/gu) || []).length !== 2) {
  failures.push('Author text edits and accepted local repairs must both invalidate the prior direction receipt')
}
requireAll('app/src/features/creator-decision/localWorkingAgent.ts', [
  'evidenceForDraftQuote',
  'export function modelFindings',
  'sceneDraftDirectionReceiptFromReview',
  'requestSceneAuthorDirectionDraftReviewFromWorkingAgent',
  "operation: 'scene_author_direction_draft_review'",
  'authorDirectionReview',
  'directionReceipt',
  'The passing author adjustment is missing exact draft evidence.',
  'literary finding does not quote the current manuscript exactly',
  'hasCompleteSceneEnding',
  'body must end with a complete sentence',
  '2700-3400 visible non-whitespace characters',
  'createMiroFishCharacterSimulationAdapter',
  'simulateCharacters:',
  "operation: 'state_evidence'",
  "operation: 'local_repair'",
  "operation: 'local_repair_review'",
  'localRepairCandidateSchema',
  'localRepairReviewSchema',
  'The local repair candidate changed its evidence target.',
  "attempt === 'auditor_revision'",
  'An Auditor-guided repair revision requires the rejected candidate and its review.',
  'The Auditor-guided repair revision did not change the rejected candidate.',
  'storyStateEvidenceOutputSchema',
  'scene_length_out_of_range',
  'stateProposals: z.array(characterStateEvidenceProposalSchema).length(0)',
  'sceneAuthorDecisionRequiredSchema',
  'Candidate search did not preserve the author-selected scene mechanism.',
  "operation: 'literary_review_revision'",
  "operation: 'literary_review_verification'",
  'validateLiteraryReviewVerification',
  'modelFindingVerification',
  'previousReview: result',
  'reviewedFindings = modelFindings',
])
requireAll('app/src/features/creator-decision/literaryReviewVerification.ts', [
  'creator-literary-review-verification.v1',
  'validateLiteraryReviewVerification',
  'The literary verification changed a finding dimension or severity.',
  'The literary verification cited a different manuscript location.',
  'compositeLiteraryScoreUsed: false',
])
requireAll('app/tests/creator-literary-review-verification.ts', [
  'rejected.receipt.rejectedFindingIds',
  "dimension: 'voice'",
  "evidenceQuote: '远处的钟声'",
  '[creator-literary-review-verification] PASS',
])
requireAll('app/tests/creator-decision-agent-adapter.ts', [
  'rejectedDirectionReview',
  "status: 422",
  "error.code === 'scene_author_direction_draft_rejected'",
  'a valid 422 prose-alignment review must reach the workflow as a domain rejection',
  'scene-draft-direction-receipt.v1',
  'the local direction receipt must not retain raw Auditor quote text, diagnosis, or rationale',
  'legacy drafts without a direction receipt remain readable',
  'a passing review with unlocatable prose evidence must fail closed',
  'one evidence-only Auditor revision may restore an exact manuscript locator',
  'a second unlocatable Auditor result must fail closed without another retry',
  'a second Auditor rejection must prevent a model-only finding from reaching repair scheduling',
  'state evidence must not invent a character outside the current Context Snapshot',
  'advanced continuity evidence must reference a source in the current Context Snapshot',
  'new continuity evidence must not pretend to update an existing source',
  "['literary_review', 'literary_review_revision', 'literary_review_verification']",
  "['literary_review', 'literary_review_revision']",
])
requireAll('app/tests/creator-decision-workflow.ts', [
  'any manuscript mutation must invalidate the old direction receipt',
  'invalidating a receipt must not mutate the source draft record',
])
requireAll('scripts/validate-creator-literary-review-replay.mts', [
  "assert.equal(manifest.operation, 'literary_review')",
  'assert.equal(manifest.canonCommitAllowed, false)',
  'const mapped = modelFindings({ draft, result: response })',
  'Every returned finding must survive exact evidence mapping.',
  'One unlocatable finding must reject the complete replay.',
  'allFindingsMapped:',
  'tamperedEvidenceRejected: true',
  'containsManuscriptText: false',
  'containsEvidenceQuoteText: false',
  'chapter21Accessed: false',
])
requireAll('app/src/features/creator-decision/storyStateEvidence.ts', [
  'creator-state-evidence.v1',
  'characterStateProposals',
  'continuityProposals',
  'evidence_missing',
  'buildStoryStateEvidenceOperations',
  'mergeStoryStateOperations',
  'assertDistinctStoryStateOperationPaths',
  'assertStoryStateEvidenceContextBoundary',
  'outside the current Context Snapshot',
  'New ${proposal.kind} evidence must not claim an existing source id',
  'cannot reuse an unrelated source id',
  'direct knowledge acquisition must be irreversible',
  "statePath?.dimension !== 'knowledge'",
])
requireAll('app/src/features/creator-decision/creationDecisionWorkflow.ts', [
  'rehearseCharacters',
  'character_simulation_unavailable',
  'buildMultiBlockRepairGuidance',
  'evidenceBlocks.length > 1',
  "operation: 'offer_variants'",
  'this.agent.proposeRepair',
  'this.agent.reviewRepair',
  'requires an independent repair reviewer',
  'The independent reviewer rejected this local replacement candidate.',
  'hasCompleteLocalRepairVerification',
  'The independent reviewer did not verify every preserved fact.',
  'A protected manuscript block cannot be rewritten.',
  'The manuscript changed while the local repair candidate was being prepared.',
  "attempt: 'auditor_revision'",
  'previousRepair: generated',
  'repairReview: verification',
  "status: 'rejected' as const",
])
requireAll('app/src/apps/creator/routes/creatorEditorRepairSelectionController.ts', [
  'function newestVisibleRepair',
  "right.repair.createdAt || ''",
  "repair.status !== 'proposed'",
  'repair.reviewId !== activeReviewId',
  'isVisibleRepair(repair, activeReviewId)',
  'return newestVisibleRepair(repairs, activeReviewId)',
])
requireAll('app/src/apps/creator/routes/creatorCharacterRehearsalService.ts', [
  'runCreatorCharacterRehearsal',
  'captureCharacterRehearsalProposal',
  'captureCharacterRehearsalSettingProposal',
  'existingCapturedAsset',
  '排练来源:',
  'author_confirmation_required',
  "kind: 'character'",
  "stage: 'memory'",
])
requireAll('app/src/apps/creator/routes/creatorCharacterRehearsalConversationService.ts', [
  'parseCharacterRehearsalConversation',
  'buildCharacterRehearsalRequest',
  'characterAssetDisplayName',
  'characterStateDimensions',
  'authorConfirmedExport: true',
  '不得引用未被作者点名的人物作为证据来源',
])
requireAll('app/src/apps/creator/routes/useCreatorCharacterRehearsal.ts', [
  'useCreatorCharacterRehearsal',
  'captureCharacterRehearsalProposal',
  'captureCharacterRehearsalSettingProposal',
  '角色排练已通过独立审阅',
])
requireAll('app/src/components/creator/workspace/CreatorCharacterRehearsalCandidate.tsx', [
  'CreatorCharacterRehearsalCandidate',
  'data-agent-action="start_character_rehearsal"',
  'save_character_rehearsal_card',
  'save_character_rehearsal_setting',
  '不发送正文，不写入正史',
])
requireAll('app/src/components/creator/workspace/CreatorConversationWorkspace.tsx', [
  'onConversationCommand',
  'props.onConversationCommand(value)',
])
requireAll('app/src/apps/creator/routes/CreatorEditorRoute.tsx', [
  'useCreatorCharacterRehearsal',
  'onConversationCommand={characterRehearsal.actions.prepare}',
  'onConfirmCharacterRehearsal',
  'onCaptureRehearsalCharacter',
  'onCaptureRehearsalSetting',
])
requireAll('scripts/mirofish-character-review.mjs', [
  'assertMiroFishCharacterReview',
  'mirofish_review_incomplete_coverage',
  'mirofish_review_issue_evidence_unbound',
  'mirofish_review_pass_incomplete',
])
requireAll('scripts/creator-working-agent-bridge.mjs', [
  'hasCompleteSceneEnding',
  '上一次正文停在句中',
  'character_simulation_summary',
  'character_simulation_review',
  'state_evidence',
  'state_evidence_review',
  'local_repair',
  'local_repair_review',
  '只针对已经定位的一个文学问题',
  'fact 的表述不得强于 sourceEvidenceQuote',
  'preservedFacts 必须覆盖 targetBlock 中所有不属于本次 repairDirection 的独立事实',
  '唯一一次受独立 Auditor 意见约束的修订',
  'repairReview.issues 是唯一允许修复的问题清单',
  '与 Reviser 分离',
  '与 Reflector 分离',
  'character_simulation_semantic_revision',
  'previousSimulation',
  'characterSimulationReview',
  '唯一一次 Reflector 修订机会',
  'sourceEvidenceQuote',
  'verifiedPreservedFactIndexes',
  '长篇小说连续性编辑',
  'knowledge 只记录人物已经直接获得且引文可证明的知识，因此 irreversible 必须为 true',
  '时空、身体与能力组是 location、timePosition、physicalCondition、resources、capabilities、limitations',
  '能动与承诺组是 dominantDesire、immediateGoal、currentIntent、obligations、recentChoice、paidCost',
  '内在模型组是 emotionalState、fear、woundTrigger、defenseStrategy、beliefs、falseBeliefs、knowledge、secrets',
  '关系动力组是 relationshipStances、trust',
  '不得为覆盖率凑数',
  '与 Observer 分离的长篇小说状态证据审校员',
  '移动禁令、权限收紧和行动受限属于 limitations，不属于 timePosition',
  'dominantDesire、immediateGoal 与 currentIntent 必须区分长期驱力、当前目标和当下行动意图',
  'relationshipStances 表示关系立场，trust 表示信任程度，不能互相替代',
  '/v1/character-simulation',
  'authorConfirmedExport',
  'canonCommitAllowed: false',
  'sceneArchitectureContract',
  "operation: 'scene_architecture'",
  'creatorWorkingAgentExecutionPlan',
  'creatorWorkingAgentRoleRuntimeSummary',
  'invokeRoleAgent',
  'Writer 只写候选正文，不得同时声称自己造成了哪些 22 维人物状态变化',
  'sceneAuthorDirectionIssues',
  'sceneAuthorDirectionIssues: directionIssues',
  'scene_author_direction_not_honored',
  '必须完整执行作者已选择的 expectedMechanismSignature',
  'sceneAuthorDirectionDraftReviewContract',
  'assertSceneAuthorDirectionDraftReview',
  'scene_author_direction_draft_rejected',
  'SceneDraftAlignmentRejectedError',
  "error: 'scene_draft_alignment_rejected'",
  'authorDirectionReview: draftReview.review',
  'scene_author_direction_draft_review_evidence_repair',
])
requireAll('scripts/creator-working-agent-roles.mjs', [
  "scene_author_direction_draft_review: ['Auditor']",
  "literary_review_verification: ['Auditor']",
  "operation === 'literary_review_verification' ? ['Auditor'] : ['Normalizer']",
])
requireAll('scripts/run-creator-frozen-paired-quality-trial.mts', [
  'postRepairDirectionReviewCount',
  'postRepairDirectionReviewPerformed',
  'reverted_author_direction_not_retained',
  'post_repair_direction_review_failed_closed',
  'sceneDraftDirectionReceiptFromReview',
  'compareOptionalLocalRepairPriority',
  'focusDimensions: input.focusDimensions',
  'literaryFindingVerificationCount',
  'verifiedModelFindingCount',
  'rejectedModelFindingCount',
  'efficacyGuidedRetryLimitPerCycle',
  'efficacyGuidedRetryCount',
  'selectEfficacyGuidedRetryTarget',
  'executeSingleEfficacyGuidedRepair',
  'passed_to_direction_review',
])
requireAll('scripts/run-creator-post-repair-direction-receipt-trial.mts', [
  'frozen-original-post-repair-direction-receipt-v1',
  'changedBlockIndexes',
  'sceneDraftDirectionReceiptFromReview',
  'allEvidenceMappedToCurrentBlocks',
  'wholeTextRewritePerformed: false',
  'rawBeforeOrAfterBodyPersistedInRepository: false',
  'chapter21AccessedOrChanged: false',
])
requireAll('scripts/check-creator-post-repair-direction-receipt-trial.mjs', [
  'creator-post-repair-direction-receipt-real-trial.v1',
  'allEvidenceMappedToCurrentBlocks',
  'for (const [key, value] of Object.entries(summary.boundaries || {}))',
  'Creator post-repair direction receipt real-trial evidence passed.',
])

const expectedAgentRoles = [
  'Radar',
  'Planner',
  'Orchestrator',
  'Architect',
  'Writer',
  'Observer',
  'Reflector',
  'Normalizer',
  'Auditor',
  'Reviser',
]
if (JSON.stringify(creatorAgentRoleNames) !== JSON.stringify(expectedAgentRoles)) {
  failures.push('Creator working-agent role contract must preserve the 10 declared NarrativeOS roles')
}
if (JSON.stringify(creatorWorkingAgentExecutionPlan('scene_draft')) !== JSON.stringify(['Architect', 'Writer'])) {
  failures.push('Scene drafting must execute Architect before Writer')
}
if (JSON.stringify(creatorWorkingAgentExecutionPlan('scene_draft', 'schema_repair')) !== JSON.stringify(['Normalizer'])) {
  failures.push('Schema repair must be a separate Normalizer invocation')
}
for (const [operation, expected] of [
  ['candidate_search', ['Planner']],
  ['literary_review', ['Auditor']],
  ['literary_review_revision', ['Auditor']],
  ['state_evidence', ['Observer']],
  ['state_evidence_review', ['Auditor']],
  ['character_simulation_summary', ['Reflector']],
  ['character_simulation_review', ['Auditor']],
  ['local_repair', ['Reviser']],
  ['local_repair_review', ['Auditor']],
]) {
  if (JSON.stringify(creatorWorkingAgentExecutionPlan(operation)) !== JSON.stringify(expected)) {
    failures.push(`${operation} must use ${expected.join(' -> ')}`)
  }
}
const roleRuntime = creatorWorkingAgentRoleRuntimeSummary()
if (roleRuntime.length !== 10 || roleRuntime.filter(item => item.status === 'wired').length !== 8) {
  failures.push('Role runtime summary must distinguish 8 invoked roles from 2 contract-only roles')
}

const sceneArchitectureSchemaSource = read('validation/creator-ui/schemas/scene-architecture.schema.json')
const sceneArchitectureReviewSchemaSource = read('validation/creator-ui/schemas/scene-architecture-review.schema.json')
const sceneDraftSchemaSource = read('validation/creator-ui/schemas/scene-draft.schema.json')
const sceneLengthCompletionSchemaSource = read('validation/creator-ui/schemas/scene-length-completion.schema.json')
const selectedTextDraftSchemaSource = read('validation/creator-ui/schemas/selected-text-draft.schema.json')
const localRepairSchemaSource = read('validation/creator-ui/schemas/local-repair.schema.json')
const localRepairReviewSchemaSource = read('validation/creator-ui/schemas/local-repair-review.schema.json')
const stateEvidenceReviewSchemaSource = read('validation/creator-ui/schemas/state-evidence-review.schema.json')
const characterSimulationReviewSchemaSource = read('validation/creator-ui/schemas/character-simulation-review.schema.json')
try {
  const sceneArchitectureSchema = JSON.parse(sceneArchitectureSchemaSource)
  if (sceneArchitectureSchema.properties?.causalChain?.minItems !== 4) {
    failures.push('Scene architecture must require a four-beat minimum causal chain')
  }
  if (sceneArchitectureSchema.properties?.characterPressure?.minItems !== 1) {
    failures.push('Scene architecture must carry at least one character pressure contract')
  }
  const informationBoundary = sceneArchitectureSchema.properties?.informationBoundary
  if (!sceneArchitectureSchema.required?.includes('informationBoundary')) {
    failures.push('Scene architecture must require an information boundary')
  }
  for (const field of ['observableEvidence', 'allowedInference', 'withheldInference', 'deliveryMode']) {
    if (!informationBoundary?.required?.includes(field)) {
      failures.push(`Scene architecture information boundary must require ${field}`)
    }
  }
} catch {
  failures.push('scene-architecture.schema.json must be valid JSON')
}
try {
  const sceneArchitectureReviewSchema = JSON.parse(sceneArchitectureReviewSchemaSource)
  const informationControlCheck = sceneArchitectureReviewSchema.properties?.informationControlCheck
  if (!sceneArchitectureReviewSchema.required?.includes('informationControlCheck')) {
    failures.push('Scene architecture review must require an independent information-control check')
  }
  for (const field of ['decision', 'observableEvidence', 'allowedInference', 'withheldInference', 'diagnosis']) {
    if (!informationControlCheck?.required?.includes(field)) {
      failures.push(`Scene architecture review information-control check must require ${field}`)
    }
  }
} catch {
  failures.push('scene-architecture-review.schema.json must be valid JSON')
}
try {
  const sceneLengthCompletionSchema = JSON.parse(sceneLengthCompletionSchemaSource)
  if (sceneLengthCompletionSchema.properties?.schemaVersion?.const !== 'creator-scene-length-completion.v1') {
    failures.push('Scene length completion must preserve the creator-scene-length-completion.v1 contract')
  }
  if (!sceneLengthCompletionSchema.required?.includes('appendText')) {
    failures.push('Scene length completion must be append-only')
  }
} catch {
  failures.push('scene-length-completion.schema.json must be valid JSON')
}
try {
  const sceneDraftSchema = JSON.parse(sceneDraftSchemaSource)
  if (sceneDraftSchema.properties?.body?.minLength !== 2850 || sceneDraftSchema.properties?.body?.maxLength !== 3800) {
    failures.push('Scene draft generation schema must keep model output near the 3000-character application target')
  }
  if (sceneDraftSchema.properties?.stateProposals?.maxItems !== 0) {
    failures.push('Scene Writer output must leave 22-dimension state extraction to the independent Observer')
  }
} catch {
  failures.push('scene-draft.schema.json must be valid JSON')
}
try {
  const selectedTextDraftSchema = JSON.parse(selectedTextDraftSchemaSource)
  if (selectedTextDraftSchema.properties?.stateProposals?.maxItems !== 0) {
    failures.push('Selected-text Writer output must leave state extraction to the independent Observer')
  }
} catch {
  failures.push('selected-text-draft.schema.json must be valid JSON')
}
try {
  const characterSimulationReviewSchema = JSON.parse(characterSimulationReviewSchemaSource)
  if (characterSimulationReviewSchema.properties?.decision?.enum?.join('|') !== 'pass|reject') {
    failures.push('Character simulation review must fail closed with pass or reject')
  }
  if (characterSimulationReviewSchema.properties?.verifiedCharacterProposalIndexes?.maxItems !== 16) {
    failures.push('Character simulation review must cover every possible character proposal')
  }
} catch {
  failures.push('character-simulation-review.schema.json must be valid JSON')
}
try {
  const localRepairSchema = JSON.parse(localRepairSchemaSource)
  if (localRepairSchema.properties?.operation?.const !== 'replace_range') {
    failures.push('Local repair output must stay a single-block replace_range candidate')
  }
  if (localRepairSchema.properties?.schemaVersion?.const !== 'creator-local-repair.v1') {
    failures.push('Local repair output must preserve the creator-local-repair.v1 contract')
  }
  const preservedFacts = localRepairSchema.properties?.preservedFacts
  if (preservedFacts?.minItems !== 1 || preservedFacts?.items?.type !== 'object') {
    failures.push('Local repair output must require structured preserved-fact evidence')
  }
  for (const requiredField of ['fact', 'sourceEvidenceQuote', 'candidateEvidenceQuote']) {
    if (!preservedFacts?.items?.required?.includes(requiredField)) {
      failures.push(`Local repair preserved facts must require ${requiredField}`)
    }
  }
} catch {
  failures.push('local-repair.schema.json must be valid JSON')
}
try {
  const localRepairReviewSchema = JSON.parse(localRepairReviewSchemaSource)
  if (localRepairReviewSchema.properties?.schemaVersion?.const !== 'creator-local-repair-review.v1') {
    failures.push('Local repair review must preserve the creator-local-repair-review.v1 contract')
  }
  if (!localRepairReviewSchema.properties?.decision?.enum?.includes('reject')) {
    failures.push('Local repair review must be able to reject an unsafe candidate')
  }
  if (!localRepairReviewSchema.required?.includes('verifiedPreservedFactIndexes')) {
    failures.push('Local repair review must report per-fact verification coverage')
  }
  if (localRepairReviewSchema.properties?.verifiedPreservedFactIndexes?.uniqueItems !== undefined) {
    failures.push('Wire schema must leave duplicate-index rejection to the application because Codex structured output rejects uniqueItems')
  }
  if (!localRepairReviewSchema.properties?.issues?.items?.properties?.dimension?.enum?.includes('fact_preservation')) {
    failures.push('Local repair review must expose the fact_preservation rejection dimension')
  }
  if (!localRepairReviewSchema.properties?.issues?.items?.properties?.dimension?.enum?.includes('author_intent')) {
    failures.push('Local repair review must expose the author_intent rejection dimension')
  }
} catch {
  failures.push('local-repair-review.schema.json must be valid JSON')
}
try {
  const stateEvidenceReviewSchema = JSON.parse(stateEvidenceReviewSchemaSource)
  if (stateEvidenceReviewSchema.properties?.schemaVersion?.const !== 'creator-state-evidence-review.v1') {
    failures.push('State evidence review must preserve the creator-state-evidence-review.v1 contract')
  }
  if (!stateEvidenceReviewSchema.properties?.decision?.enum?.includes('reject')) {
    failures.push('State evidence review must be able to reject semantic state errors')
  }
  for (const coverageField of ['verifiedCharacterProposalIndexes', 'verifiedContinuityProposalIndexes']) {
    if (!stateEvidenceReviewSchema.required?.includes(coverageField)) {
      failures.push(`State evidence review must require ${coverageField}`)
    }
  }
  if (!stateEvidenceReviewSchema.properties?.issues?.items?.properties?.code?.enum?.includes('dimension_semantics')) {
    failures.push('State evidence review must expose dimension_semantics rejection')
  }
} catch {
  failures.push('state-evidence-review.schema.json must be valid JSON')
}
requireAll('app/src/features/creator-decision/literaryReview.ts', [
  'evidenceForDraftQuote',
  'evidenceBlocksForFinding',
  'manuscriptRangeForFindingEvidence',
  'rebaseDraftBlockOffsets(next)',
  'validateFindingEvidence',
  'activeHardBlockFindings',
  'applyRepairProposal',
  'validateLocalRepairPreservedFactEvidence',
  'hasCompleteLocalRepairVerification',
  'verifiedIndexes.length !== rawVerifiedIndexes.length',
  'has not passed complete independent review',
  'A multi-block repair direction is guidance only',
  'does not change the manuscript evidence',
])
requireAll('app/src/features/creator-decision/canonPatch.ts', [
  'author_confirmation_required',
  'evidence_missing',
  'assertCandidateQualityGate',
  'buildCanonCommitResult',
  'normalizeCharacterStatePath',
  'Unsupported character state path',
  'Canon commit requires at least one manuscript-grounded state change.',
])
requireAll('app/src/features/creator-decision/candidateQualityGate.ts', [
  'hard_block_unresolved',
])
requireAll('app/src/features/creator-decision/creationDecisionWorkflow.ts', [
  'async rejectRepair',
  "type: 'repair_rejected'",
  "finding.severity === 'hard_block'",
  'A hard-block finding cannot be dismissed.',
  'repair.reviewId !== review.id',
])
requireAll('app/src/features/creator-decision/historicalStateBackfill.ts', [
  'historical-state-backfill.v1',
  'createHistoricalStateBackfillProposal',
  'validateHistoricalStateBackfillCommit',
  'buildHistoricalStateBackfillCommitResult',
  'author_confirmation_required',
  'Historical state backfill requires at least one manuscript-grounded state change.',
  'acceptedContentBlocks',
  'acceptedDraftId',
])
requireAll('app/src/features/creator-decision/historicalStateBackfillAgent.ts', [
  'proposeHistoricalStateBackfillWithWorkingAgent',
  'requestStoryStateEvidenceReviewFromWorkingAgent',
  'validateStoryStateEvidenceReview',
  "mode: 'historical_state_backfill'",
  "mode: 'historical_state_backfill_semantic_revision'",
  'semanticRevisionCount <= 1',
  'previousEvidence: evidence',
  'stateEvidenceReview: review',
  'assertDistinctStoryStateOperationPaths',
  'operations.length === 0',
  'reviewValidationError',
  'if (!(error instanceof CreationDecisionError)) throw error',
  'acceptedContentBlocks',
])
if (read('app/src/features/creator-decision/localWorkingAgent.ts').includes('if (!evidence) return []')) {
  failures.push('localWorkingAgent must fail an incomplete literary review instead of silently dropping unlocatable evidence')
}
requireAll('app/src/features/creator-decision/localWorkingAgent.ts', [
  'requestStoryStateEvidenceFromWorkingAgent',
  'requestStoryStateEvidenceReviewFromWorkingAgent',
  "operation: 'state_evidence_review'",
  'State evidence review rejected the proposed canon changes',
  'validateLocalRepairPreservedFactEvidence',
  'buildLocalRepairIntentPreservationRequirements',
  'localRepairIntentPreservationIssues',
  'intentPreservationRequirements',
  'verifiedIndexes.length !== result.verifiedPreservedFactIndexes.length',
  'A passing repair review must verify every preserved-fact evidence pair.',
])
requireAll('app/src/features/creator-decision/storyStateEvidence.ts', [
  'storyStateEvidenceReviewSchema',
  'supportingEvidenceQuotes',
  'proposalEvidenceBlockIds',
  'validateStoryStateEvidenceReview',
  'A passing state evidence review must verify every proposal index.',
  'A rejected state evidence review must account for every proposal.',
])
requireAll('scripts/creator-working-agent-bridge.mjs', [
  '没有可定位变化时返回空数组，不得凑数',
  'supportingEvidenceQuotes',
  '合起来支持 value 或 statement 的全部语义',
  '同一输出不得为同一个人物维度或同一个章节 timeline/causal 路径提出多条互相覆盖的候选',
  '若 mode 以 _semantic_revision 结尾',
  'previousEvidence',
  'stateEvidenceReview',
  '不得增加审查意见之外的新事实',
])
requireAll('scripts/run-creator-historical-state-observer.mts', [
  'chapter <= 20',
  'findRoleRuns',
  'semanticRevisionCount',
  'observerRunCount',
  'reviewRunCount',
  "candidateStatus: result.proposal?.status",
  "'review_invalid'",
  'repositoryWritePerformed: false',
  'chapter21OpenedOrChanged: false',
])
requireAll('scripts/validate-creator-historical-state-backfill.mts', [
  'chapter <= 20',
  'assertDistinctStoryStateOperationPaths(operations)',
  'validateStoryStateEvidenceReview',
  'reviewValidationError',
  'repositoryWritePerformed: false',
  'chapter21OpenedOrChangedByThisValidation: false',
])
requireAll('scripts/validate-creator-historical-recall-projection.mts', [
  'creator-historical-recall-projection-validation.v1',
  'buildHistoricalStateBackfillCommitResult',
  'buildCreatorLocalChapterMemories',
  'buildCreatorRecallCandidates',
  'realAuthorConfirmationPerformed: false',
  'repositoryWritePerformed: false',
  'chapter21OpenedOrChanged: false',
])
requireAll('app/src/features/creator-decision/structuredAgentCall.ts', [
  'JSON.parse',
  'AbortSignal',
  'repair',
  'model_output_invalid',
])

const route = requireAll('app/src/apps/creator/routes/CreatorEditorRoute.tsx', [
  'useCreatorEditorDecisionWorkbench',
  'CreatorConversationWorkspace',
  'buildCreatorRecallCandidates',
  'manualRecallItems',
  'resolveCreatorEditorWritingChapterNumber',
  'chapterNumber: writingChapterNumber',
])
for (const forbidden of ['CreationDecisionWorkflow', 'creatorLocalDecisionRepository', 'referenceWritingAgent']) {
  if (route.includes(forbidden)) failures.push(`CreatorEditorRoute.tsx must bind the decision hook instead of owning ${forbidden}`)
}
requireAll('app/src/apps/creator/routes/useCreationDecisionSession.ts', [
  'CreationDecisionWorkflow',
  'restoreOrCreateSession',
  'recordAuthorEdit',
  'confirmCanon',
  'creatorSceneDraftTargetLength',
  'const boundedSourceLength = Math.min(sourceLength, 2200)',
])
requireAll('app/src/apps/creator/routes/creatorEditorDecisionSessionController.ts', [
  'resolveCreatorEditorWritingChapterNumber',
  'input.activeDraft?.chapterNumber',
  'input.latestChapter.chapter_no + 1',
  'return 1',
  'creatorEditorChapterIdentity(input.selectedWorkId, input.resolvedBranchId, chapterNumber)',
])
requireAll('app/tests/creator-decision-ui-contract.ts', [
  'a new unscoped draft must continue after the latest chapter in the resolved branch',
  'an active local draft chapter number must outrank the latest published chapter',
  'an explicit chapter route must remain the authoritative writing position',
  'an inferred next chapter must receive its own stable decision-session identity',
  'an existing legacy draft must keep its draft-ref identity for one-way migration compatibility',
])
requireAll('app/src/features/creator-decision/stateMachine.ts', [
  'request.scope.selectedBlockIds.length > 3',
  'Selected text generation is limited to three manuscript blocks.',
])
requireAll('app/src/apps/creator/routes/creatorEditorViewModels.ts', [
  "session.phase === 'intent_locked'",
  "? 'path'",
  'groupLiteraryFindings',
  'buildCanonDiffViewModel',
])
requireAll('app/src/apps/creator/routes/creatorEditorDecisionContextAdapter.ts', [
  'canonContinuityItems',
  'canonPromises',
  'canonForeshadowing',
  'canonTimeline',
  'canonCausal',
])
const chapterMemorySource = requireAll('app/src/apps/creator/routes/creatorEditorLocalChapterMemoryService.ts', [
  'stateRecallItems',
  'buildPatchRecallItems',
  'buildChapterStateRecallItems',
  'buildCanonTerminalRecallItems',
  'committedHistoricalBackfills',
  'operationRecallGroup',
  'operationRecallStatus',
  "'terminal'",
  'committedRecallSummary',
  'committedPatchOperationSummary',
  '历史快照：只表示当章结束状态，当前有效状态以最新正史为准',
  '当章锁定起点（创作约束）：',
  '当章锁定变化（创作约束）：',
  '当章锁定人物选择（创作约束）：',
  '当章预期代价（创作约束）：',
  '当章正史人物选择：',
  '当章正史代价：',
  '当章正史后果：',
  '当章正史承诺：',
  '当章未解决约束（创作约束）：',
  '当章收尾证据：',
  'compactTail(endingEvidence, 180)',
  "committedPatchOperationSummary(input.patches, '/recentChoice', 140)",
  "committedPatchOperationSummary(input.patches, '/paidCost', 100)",
])
for (const forbidden of [
  '当章候选叙事路径：',
  '仅作规划来源，非正史状态',
  'input.candidate?.projectedEffects.promisesCreated',
  'input.candidate?.projectedEffects.futureDebts',
]) {
  if (chapterMemorySource.includes(forbidden)) {
    failures.push(`creatorEditorLocalChapterMemoryService.ts must not promote candidate projections into committed recall: ${forbidden}`)
  }
}
requireAll('app/src/apps/creator/routes/creatorEditorRecallViewModels.ts', [
  'localCanonStateRecallItems',
  'seenPaths',
  "item.recallStatus === 'terminal'",
  '人物状态与所知',
  'chapterRecallStatement',
  'compactTail',
  '历史快照：只表示当章结束状态，当前有效状态以最新正史为准',
  '当章开篇证据：',
  '当章收尾证据：',
  'chapter.chapter_no < input.chapterNumber',
  'request.work_id !== input.workId',
  'memory.workId === input.workId',
  'memory.branchId === input.branchId',
])
requireAll('app/src/apps/creator/routes/creatorEditorDecisionContextAdapter.ts', [
  'historicalChapterBelongsToContext',
  'eligibleManualRecallItems',
  'linkedRequestBelongsToContext',
  'chapter.chapter_no < chapterNumber',
  'const primaryActorId = input.intent.characterAgency.primaryActorId',
  'const activeCharacters = [',
  'assetCharacters.filter(character => character.id !== primaryActor.id)',
])
requireAll('app/src/features/creator-decision/contextCompiler.ts', [
  'manuallySelectedCharacterIds',
  "item.group === 'character_knowledge'",
  'manuallySelectedCharacterIds.has(character.id)',
])
requireAll('app/tests/creator-conversation-recall.ts', [
  'fulfilledPromiseTombstone',
  'canonicalFulfilledTombstone',
  '当前有效状态以最新正史为准',
  'a committed recentChoice must replace the intent plan in historical recall',
  'a committed paidCost must replace the expected intent cost in historical recall',
  'a decisive refusal must retain its semantic verb instead of reversing the character action',
  'cross-chapter handoff must retain the actual final paragraph',
  'a later fulfilled tombstone must suppress the older unresolved promise across chapters',
  'a cumulative Canon tombstone must suppress an older active card across chapter memories without recreating a visible fact',
  'the newest explicit reopen must become selectable after the fulfilled tombstone',
  'current-manuscript style recall must cover the opening, progression, and ending instead of only the first two paragraphs',
  'the actual accepted ending paragraph must reach the style context without being replaced by another opening sample',
  'a blank new chapter must recall both the opening and actual ending of the latest manually selected prose chapter',
  'a short accepted chapter ending must survive historical style recall for the next blank chapter',
  'historical style sampling must not bypass the manual chapter allowlist',
  'unbounded historical style fallback must use latest opening, latest ending, then previous ending with a three-sample cap',
  'the previous admitted chapter ending must remain available as the third bounded voice sample',
  'one long historical paragraph must expose distinct head and tail voice evidence instead of losing its ending',
  'the bounded head excerpt must not pretend to contain the distant ending',
  'a manually selected causal chapter must enter the dedicated recent-scene context',
  'selecting a secondary character must not remove the locked primary actor from Context Source',
  'a manually selected secondary character must survive Context Snapshot character filtering',
  'a long recent-scene summary must preserve the actual accepted ending instead of only its opening',
  'a selected local Canon chapter memory must populate recent-scene context even when no public chapter row exists',
  'the selected local causal summary must retain its accepted ending after bounded transport',
  'the recent-scene projection must preserve historical-snapshot authority instead of treating plans as current facts',
  'a published-chapter recall card must retain the actual accepted ending instead of only its opening',
  'one oversized paragraph must expose a tail-preserving ending in the authoritative manual recall card',
  'future, wrong-work, and wrong-branch chapters must not enter the recall directory',
  'Context Source must fail closed on forged future, wrong-work, and wrong-source recall items',
  'rejected recall items must not survive indirectly through the context manifest',
  'stale local memories from another work or branch must not enter the recall directory during a route switch',
])
const workingAgentBridge = requireAll('scripts/creator-working-agent-bridge.mjs', [
  '带有“历史快照”的章节卡只说明当章结束状态',
  '也不能覆盖 context 中的当前正史状态',
  '标为“创作约束”的内容只记录锁定意图，不证明正文已经实现',
  '只有卡内明确标为“正史”的状态与收尾证据可作为已发生事实',
  'STYLE_EVIDENCE_BOUNDARY',
  'PROSE_ECONOMY_BOUNDARY',
  '段落经济性边界',
  '连续两个段落不得只换说法重复同一事实、情绪、决定或压力',
  'causalChain 不是需要逐项展开的镜头清单',
  'context.styleSamples 只用于学习句法节奏、叙述距离、段落呼吸和对白密度',
  '不能据此恢复为当前事实',
])
if ((workingAgentBridge.match(/带有“历史快照”的章节卡只说明当章结束状态/gu) || []).length < 4) {
  failures.push('Planner, Architect, Writer, and Auditor must all preserve the historical-snapshot versus current-Canon boundary')
}
if ((workingAgentBridge.match(/标为“创作约束”的内容只记录锁定意图，不证明正文已经实现/gu) || []).length < 4) {
  failures.push('Planner, Architect, Writer, and Auditor must all preserve intent-versus-Canon provenance')
}
if ((workingAgentBridge.match(/\$\{STYLE_EVIDENCE_BOUNDARY\}/gu) || []).length < 6) {
  failures.push('Architect, Planner, Writer, literary Auditor, Reviser, and repair Auditor must all isolate style evidence from factual authority')
}
requireAll('scripts/test-creator-working-agent-role-pipeline.mjs', [
  'context\\.styleSamples 只用于学习句法节奏',
  '不能据此恢复为当前事实',
  'rolePipelineCharacterState',
  'Object.keys(rolePipelineCharacterState).length, 22',
  'rolePipelineSecondaryCharacterId',
  'rolePipelineSecondaryKnowledge',
  'manual secondary character knowledge must reach the role prompt',
  'Planner candidate-search run manifest must exist',
  'Planner must retain manually selected secondary character knowledge',
  'Structure Auditor run manifest must exist',
  'Literary Auditor must retain manually selected secondary character knowledge',
  'Literary Auditor must retain manually selected secondary character false belief',
  'Independent Literary Auditor must retain manually selected secondary character knowledge',
  'Reviser must retain manually selected secondary character knowledge',
  'Repair Auditor must retain manually selected secondary character knowledge',
  'role-pipeline-secondary-character-state-evidence',
  'Observer must retain manually selected secondary character knowledge',
  'State Auditor must retain manually selected secondary character knowledge',
  'rolePipelineCausalEnding',
  '"recentSceneSummaries"',
  '"manualRecallItems"',
  'Architect prompt must retain',
  'Writer prompt must retain',
  'doesNotMatch(prompt, /"relationshipPosition"/)',
  'role-pipeline-author-direction',
  'scene_author_direction_not_honored',
  'a second mismatch must stop before Planner or Writer',
  'a prose-level direction rejection must stop without another Writer rewrite',
  'unlocatable prose evidence may receive one Auditor-only repair and must then fail closed',
  'a passing prose-direction review must travel with the candidate response',
  'only a passing prose-direction review may accompany a successful candidate',
])
requireAll('validation/creator-ui/schemas/scene-author-direction-draft-review.schema.json', [
  'creator-scene-author-direction-draft-review.v1',
  'axisChecks',
  'proposedAdjustmentCheck',
  'evidenceQuote',
])
requireAll('app/src/features/creator-decision/localWorkingAgent.ts', [
  'sceneAuthorDirectionDraftReviewSchema',
  "response.status === 422",
  "body.error === 'scene_draft_alignment_rejected'",
  "'scene_author_direction_draft_rejected'",
  'sceneDraftDirectionReceiptFromReview',
  'scene-draft-direction-receipt.v1',
])
requireAll('app/src/apps/creator/routes/CreatorEditorManuscriptStage.tsx', [
  'protectedBlockIds',
  'focusedEvidence',
  'onProtectBlocks',
  'onGenerateSelectedText',
])
requireAll('app/src/components/creator/workspace/CreatorConversationWorkspace.tsx', [
  'CreatorConversationTimeline',
  'CreatorRecallRail',
  'onCaptureSetting',
  'onApplyRecall',
])
requireAll('app/src/components/creator/workspace/CreatorConversationTimeline.tsx', [
  '尚未写入正文',
  'manuscriptRangeForFindingEvidence',
  'AlertDialog',
  'onSaveManuscriptEdit',
  'data-slot="creator-conversation-manuscript-editor"',
  'data-agent-action="edit_local_manuscript"',
  'onConfirmCanon',
])
requireAll('app/src/components/creator/workspace/CreatorRecallRail.tsx', [
  'creatorRecallGroupLabels',
  '选择已应用',
  'onApply(nextIds)',
  'whyNow',
  'locator.label',
])
requireAll('app/src/apps/creator/routes/creatorEditorDecisionContextAdapter.ts', [
  'manualRecallItems',
  'manual_recall:',
])
requireAll('app/src/local-db/creatorLocalWorkspacePackage.ts', [
  'readCreatorDecisionWorkspaceRecords',
  'upsertCreatorDecisionWorkspaceRecord',
  'creatorDecisionRecordFamilies',
])

const packageJson = read('package.json')
if (!packageJson.includes('check:pivot') || !packageJson.includes('npm run check:creator-decision-workbench')) {
  failures.push('package.json check:pivot must enforce check:creator-decision-workbench')
}

const repository = requireAll('app/src/local-db/creatorLocalDecisionRepository.ts', [
  'IndexedDbCreationDecisionRepository',
  'MemoryCreationDecisionRepository',
  'withLocalWorkspaceWriteLock',
  'workspaceRevisions',
  'commitCanon(input: CanonCommitInput)',
  'commitHistoricalStateBackfill(',
  'historicalStateBackfillProposalSchema',
  'migrateLegacyDraftToCreationSession',
  "createdIntent: false",
])
for (const forbidden of ['localStorage', 'pmfSupabase', '@supabase/']) {
  if (repository.includes(forbidden)) failures.push(`decision repository must remain local and use the shared DB boundary: ${forbidden}`)
}

for (const store of [
  'creationSessions',
  'authorIntents',
  'contextSnapshots',
  'narrativeCandidates',
  'sceneDrafts',
  'literaryReviews',
  'repairProposals',
  'canonPatches',
  'localCanonStates',
  'creationDecisionEvents',
]) {
  requireAll('app/src/local-db/schema.ts', [`${store}:`])
  requireAll('app/src/local-db/creatorLocalDb.ts', [`${store}: '${store}'`, `creatorLocalStoreNames.${store}`])
}

for (const fixture of [
  'tests/creator-decision-domain.ts',
  'tests/creator-decision-workflow.ts',
  'tests/creator-decision-agent-adapter.ts',
  'tests/creator-decision-ui-contract.ts',
  'tests/creator-decision-offline-validation.ts',
  'tests/creator-conversation-recall.ts',
  'tests/creator-character-simulation.ts',
  'tests/creator-character-state-pipeline.ts',
  'tests/creator-historical-state-backfill.ts',
]) {
  const result = spawnSync(resolve(root, 'node_modules/.bin/tsx'), [fixture], {
    cwd: resolve(root, 'app'),
    encoding: 'utf8',
  })
  if (result.status !== 0) failures.push(`${fixture} failed:\n${result.stdout}${result.stderr}`)
}

const rolePipelineResult = spawnSync(process.execPath, ['scripts/test-creator-working-agent-role-pipeline.mjs'], {
  cwd: root,
  encoding: 'utf8',
  timeout: 20_000,
})
if (rolePipelineResult.status !== 0) {
  failures.push(`working-agent role pipeline failed:\n${rolePipelineResult.stdout}${rolePipelineResult.stderr}`)
}

for (const script of [
  'scripts/test-mirofish-character-evidence.mjs',
  'scripts/test-mirofish-character-review.mjs',
]) {
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: 'utf8',
  })
  if (result.status !== 0) failures.push(`${script} failed:\n${result.stdout}${result.stderr}`)
}

if (failures.length) {
  console.error('[creator-decision-workbench] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[creator-decision-workbench] PASS')
