#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const mapPath = resolve(root, 'docs/backend/CREATOR_WRITING_BACKEND_CAPABILITY_MAP.md')
const auditPath = resolve(root, 'validation/creator-writing/capability-evidence-audit-2026-07-17.json')
const manualRecallReceiptPath = resolve(root, 'validation/creator-writing/creator-editor-manual-recall-context-2026-07-18.json')
const realLongRangeSelectionReceiptPath = resolve(root, 'validation/creator-writing/verified-long-range-thread-author-selection-2026-07-18.json')
const computerUseChapterReviewReceiptPath = resolve(root, 'validation/creator-writing/computer-use-chapter-20-recall-review-2026-07-18.json')
const computerUseChapterManualEditReceiptPath = resolve(root, 'validation/creator-writing/computer-use-chapter-20-manual-edit-rereview-2026-07-18.json')
const computerUseContinuityRepairReceiptPath = resolve(root, 'validation/creator-writing/computer-use-chapter-12-20-continuity-repair-2026-07-18.json')
const computerUseContextExportReceiptPath = resolve(root, 'validation/creator-writing/computer-use-chapter-20-context-export-integrity-2026-07-18.json')
const floodgateStructureReviewReceiptPath = resolve(root, 'validation/creator-ui/frozen-paired-quality-floodgate-structure-review-rerun-2026-07-18/summary.json')
const pairedVerificationRevisionReceiptPath = resolve(root, 'validation/creator-ui/frozen-paired-quality-verifier-evidence-revision-real-trial-2026-07-18/summary.json')
const manualRecallAdherenceReceiptPath = resolve(root, 'validation/creator-ui/manual-recall-adherence-real-trial-2026-07-18/summary.json')
const manualRecallEffectReceiptPath = resolve(root, 'validation/creator-ui/manual-recall-effect-real-trial-2026-07-18/summary.json')
const manualRecallEffectCampaignPath = resolve(root, 'validation/creator-ui/manual-recall-effect-real-campaign-2026-07-18/summary.json')
const chapter20MiroFishReceiptPath = resolve(root, 'validation/creator-writing/chapter-20-mirofish-character-rehearsal-2026-07-18.json')
const computerUseMiroFishWorkflowReceiptPath = resolve(root, 'validation/creator-writing/computer-use-chapter-20-mirofish-workflow-2026-07-18.json')
const localRepairInvalidationReceiptPath = resolve(root, 'validation/creator-writing/computer-use-chapter-20-local-repair-invalidation-2026-07-18.json')
const candidateQualityGatePath = resolve(root, 'app/src/features/creator-decision/candidateQualityGate.ts')
const literaryReviewOwnerPath = resolve(root, 'app/src/features/creator-decision/literaryReview.ts')
const contextCompilerPath = resolve(root, 'app/src/features/creator-decision/contextCompiler.ts')
const decisionWorkflowPath = resolve(root, 'app/src/features/creator-decision/creationDecisionWorkflow.ts')
const decisionWorkflowTestPath = resolve(root, 'app/tests/creator-decision-workflow.ts')
const repairSelectionControllerPath = resolve(root, 'app/src/apps/creator/routes/creatorEditorRepairSelectionController.ts')
const appPackagePath = resolve(root, 'app/package.json')
const rootPackagePath = resolve(root, 'package.json')
const failures = []

function expect(condition, message) {
  if (!condition) failures.push(message)
}

expect(existsSync(mapPath), 'missing writing capability map')
expect(existsSync(auditPath), 'missing writing capability evidence audit')
expect(existsSync(manualRecallReceiptPath), 'missing authenticated Chrome manual-recall receipt')
expect(existsSync(realLongRangeSelectionReceiptPath), 'missing real long-range Chrome author-selection receipt')
expect(existsSync(computerUseChapterReviewReceiptPath), 'missing real Chapter 20 Computer Use review receipt')
expect(existsSync(computerUseChapterManualEditReceiptPath), 'missing real Chapter 20 Computer Use manual-edit receipt')
expect(existsSync(computerUseContinuityRepairReceiptPath), 'missing real Chapter 12/20 continuity-repair receipt')
expect(existsSync(computerUseContextExportReceiptPath), 'missing real Chapter 20 Context export-integrity receipt')
expect(existsSync(floodgateStructureReviewReceiptPath), 'missing real floodgate structure-review rerun receipt')
expect(existsSync(pairedVerificationRevisionReceiptPath), 'missing real paired-verification evidence-revision receipt')
expect(existsSync(manualRecallAdherenceReceiptPath), 'missing real manual-recall adherence receipt')
expect(existsSync(manualRecallEffectReceiptPath), 'missing real manual-recall effect receipt')
expect(existsSync(manualRecallEffectCampaignPath), 'missing real manual-recall effect campaign receipt')
expect(existsSync(chapter20MiroFishReceiptPath), 'missing real Chapter 20 MiroFish rehearsal receipt')
expect(existsSync(computerUseMiroFishWorkflowReceiptPath), 'missing real Chapter 20 MiroFish product-workflow receipt')
expect(existsSync(localRepairInvalidationReceiptPath), 'missing real Chapter 20 local-repair invalidation receipt')
expect(existsSync(candidateQualityGatePath), 'missing candidate quality gate owner')
expect(existsSync(literaryReviewOwnerPath), 'missing literary review owner')
expect(existsSync(contextCompilerPath), 'missing Context compiler owner')
expect(existsSync(decisionWorkflowPath), 'missing creation decision workflow owner')
expect(existsSync(decisionWorkflowTestPath), 'missing creation decision workflow test')
expect(existsSync(repairSelectionControllerPath), 'missing active-review repair selection owner')
expect(existsSync(appPackagePath), 'missing Creator package manifest')
expect(existsSync(rootPackagePath), 'missing root package manifest')

const mapText = existsSync(mapPath) ? readFileSync(mapPath, 'utf8') : ''
const audit = existsSync(auditPath) ? JSON.parse(readFileSync(auditPath, 'utf8')) : {}
const manualRecallReceipt = existsSync(manualRecallReceiptPath)
  ? JSON.parse(readFileSync(manualRecallReceiptPath, 'utf8'))
  : {}
const realLongRangeSelectionReceipt = existsSync(realLongRangeSelectionReceiptPath)
  ? JSON.parse(readFileSync(realLongRangeSelectionReceiptPath, 'utf8'))
  : {}
const computerUseChapterReviewReceipt = existsSync(computerUseChapterReviewReceiptPath)
  ? JSON.parse(readFileSync(computerUseChapterReviewReceiptPath, 'utf8'))
  : {}
const computerUseChapterManualEditReceipt = existsSync(computerUseChapterManualEditReceiptPath)
  ? JSON.parse(readFileSync(computerUseChapterManualEditReceiptPath, 'utf8'))
  : {}
const computerUseContinuityRepairReceipt = existsSync(computerUseContinuityRepairReceiptPath)
  ? JSON.parse(readFileSync(computerUseContinuityRepairReceiptPath, 'utf8'))
  : {}
const computerUseContextExportReceipt = existsSync(computerUseContextExportReceiptPath)
  ? JSON.parse(readFileSync(computerUseContextExportReceiptPath, 'utf8'))
  : {}
const floodgateStructureReviewReceipt = existsSync(floodgateStructureReviewReceiptPath)
  ? JSON.parse(readFileSync(floodgateStructureReviewReceiptPath, 'utf8'))
  : {}
const pairedVerificationRevisionReceipt = existsSync(pairedVerificationRevisionReceiptPath)
  ? JSON.parse(readFileSync(pairedVerificationRevisionReceiptPath, 'utf8'))
  : {}
const manualRecallAdherenceReceipt = existsSync(manualRecallAdherenceReceiptPath)
  ? JSON.parse(readFileSync(manualRecallAdherenceReceiptPath, 'utf8'))
  : {}
const manualRecallEffectReceipt = existsSync(manualRecallEffectReceiptPath)
  ? JSON.parse(readFileSync(manualRecallEffectReceiptPath, 'utf8'))
  : {}
const manualRecallEffectCampaign = existsSync(manualRecallEffectCampaignPath)
  ? JSON.parse(readFileSync(manualRecallEffectCampaignPath, 'utf8'))
  : {}
const chapter20MiroFishReceipt = existsSync(chapter20MiroFishReceiptPath)
  ? JSON.parse(readFileSync(chapter20MiroFishReceiptPath, 'utf8'))
  : {}
const computerUseMiroFishWorkflowReceipt = existsSync(computerUseMiroFishWorkflowReceiptPath)
  ? JSON.parse(readFileSync(computerUseMiroFishWorkflowReceiptPath, 'utf8'))
  : {}
const localRepairInvalidationReceipt = existsSync(localRepairInvalidationReceiptPath)
  ? JSON.parse(readFileSync(localRepairInvalidationReceiptPath, 'utf8'))
  : {}
const candidateQualityGateText = existsSync(candidateQualityGatePath)
  ? readFileSync(candidateQualityGatePath, 'utf8')
  : ''
const literaryReviewOwnerText = existsSync(literaryReviewOwnerPath)
  ? readFileSync(literaryReviewOwnerPath, 'utf8')
  : ''
const contextCompilerText = existsSync(contextCompilerPath) ? readFileSync(contextCompilerPath, 'utf8') : ''
const decisionWorkflowText = existsSync(decisionWorkflowPath) ? readFileSync(decisionWorkflowPath, 'utf8') : ''
const decisionWorkflowTestText = existsSync(decisionWorkflowTestPath) ? readFileSync(decisionWorkflowTestPath, 'utf8') : ''
const repairSelectionControllerText = existsSync(repairSelectionControllerPath)
  ? readFileSync(repairSelectionControllerPath, 'utf8')
  : ''
const appPackage = existsSync(appPackagePath) ? JSON.parse(readFileSync(appPackagePath, 'utf8')) : {}
const rootPackage = existsSync(rootPackagePath) ? JSON.parse(readFileSync(rootPackagePath, 'utf8')) : {}
const mapRows = [...mapText.matchAll(/^\| ([^|]+) \| (implemented|conditional|contract_only|historical) \|/gm)]
  .map(match => ({ name: match[1].trim(), status: match[2] }))
const auditRows = Array.isArray(audit.capabilities) ? audit.capabilities : []
const auditByName = new Map(auditRows.map(row => [row.name, row]))
const runtimeOwnersByCapability = new Map(Object.entries({
  '两问式作者意图与锁定': ['app/src/features/creator-decision/creationDecisionWorkflow.ts', 'app/src/features/creator-decision/stateMachine.ts'],
  '新章节会话身份隔离': ['app/src/apps/creator/routes/creatorEditorDecisionSessionController.ts'],
  'Context Snapshot': ['app/src/features/creator-decision/contextCompiler.ts'],
  'Context Snapshot 导出完整性': ['app/src/features/creator-decision/contextCompiler.ts', 'app/src/local-db/creatorLocalWorkspacePackage.ts'],
  '手动召回正文遵循审阅': ['app/src/features/creator-decision/manualRecallAdherence.ts', 'app/src/features/creator-decision/localWorkingAgent.ts'],
  'Planner 候选搜索': ['app/src/features/creator-decision/localWorkingAgent.ts', 'scripts/creator-working-agent-bridge.mjs'],
  'Architect 场景因果骨架': ['app/src/features/creator-decision/localWorkingAgent.ts', 'scripts/creator-working-agent-bridge.mjs'],
  '场景结构审阅证据纠正': ['app/src/features/creator-decision/localWorkingAgent.ts', 'scripts/creator-working-agent-bridge.mjs'],
  '五轴场景机制重复门禁': ['app/src/features/creator-decision/localWorkingAgent.ts', 'scripts/creator-working-agent-bridge.mjs'],
  '对话式场景重决策': ['app/src/features/creator-decision/sceneAuthorDecision.ts', 'app/src/features/creator-decision/creationDecisionWorkflow.ts'],
  'Writer 单章候选': ['app/src/features/creator-decision/localWorkingAgent.ts', 'scripts/creator-working-agent-bridge.mjs'],
  'Writer 段落经济性边界': ['app/src/features/creator-decision/localWorkingAgent.ts', 'scripts/creator-working-agent-bridge.mjs'],
  '11 维文学审阅': ['app/src/features/creator-decision/literaryReview.ts', 'app/src/features/creator-decision/localWorkingAgent.ts'],
  '作者指定审阅重点': ['app/src/features/creator-decision/localWorkingAgent.ts'],
  '单块局部修订': ['app/src/features/creator-decision/localWorkingAgent.ts', 'app/src/features/creator-decision/localRepairIntentPreservation.ts'],
  '审阅重跑失效传播': ['app/src/features/creator-decision/creationDecisionWorkflow.ts', 'app/src/apps/creator/routes/creatorEditorRepairSelectionController.ts'],
  '统一候选质量门禁': ['app/src/features/creator-decision/candidateQualityGate.ts'],
  '匿名候选比较': ['app/src/features/creator-decision/pairedLiteraryComparison.ts'],
  '匿名独立复核证据纠正': ['app/src/features/creator-decision/pairedLiteraryComparison.ts'],
  '22 维人物状态': ['app/src/features/creator-decision/characterState.ts'],
  '相邻章连续性': ['app/src/features/creator-decision/longformContinuity.ts'],
  '非相邻长程线程': ['app/src/features/creator-decision/longRangeStoryThreads.ts'],
  '人工召回目录': ['app/src/features/creator-decision/longRangeThreadRecall.ts', 'app/src/apps/creator/routes/creatorEditorRecallSelectionService.ts'],
  'ConstraintProfile / GenreKernel': ['packages/agent-runtime/src/constraints.ts', 'packages/agent-runtime/src/okf.ts'],
  'TimeEngine': ['packages/agent-runtime/src/timeEngine.ts'],
  'Narrative OKF 知识层': ['packages/agent-runtime/src/okf.ts', 'packages/agent-runtime/src/workflows.ts'],
  '模型无关运行时': ['app/src/features/creator-decision/localWorkingAgent.ts', 'scripts/creator-working-agent-bridge.mjs'],
  '本地创作 Repository': ['app/src/local-db/creatorLocalDecisionRepository.ts', 'app/src/local-db/creatorLocalDraftRepository.ts'],
  '工作区迁移与恢复': ['app/src/local-db/creatorLocalWorkspacePackage.ts', 'app/src/local-db/creatorDecisionRecordMigration.ts'],
  'Agent action surface': ['app/src/agent-surface/actions.ts', 'app/src/agent-surface/executor.ts'],
  'Canon Patch 与下一章门禁': ['app/src/features/creator-decision/canonPatch.ts', 'app/src/features/creator-decision/creationDecisionWorkflow.ts'],
}))

expect(audit.schemaVersion === 1, 'audit schemaVersion must be 1')
expect(audit.status === 'audited_with_real_and_negative_evidence', 'audit must retain explicit real-and-negative evidence status')
expect(audit.scope?.chapterStopLine === 20, 'audit chapter stop line must remain 20')
expect(mapRows.length > 0, 'capability map contains no auditable rows')
expect(auditRows.length === mapRows.length, `audit coverage ${auditRows.length} does not match capability map ${mapRows.length}`)

const allowedMaturity = new Set([
  'real_model_measured',
  'real_local_runtime',
  'deterministic_verified',
  'conditional_external_measured',
  'real_context_external_measured',
  'real_corpus_measured_blocked',
  'historical_only',
])

for (const mapRow of mapRows) {
  const audited = auditByName.get(mapRow.name)
  expect(Boolean(audited), `missing evidence audit row for ${mapRow.name}`)
  if (!audited) continue
  expect(audited.implementationStatus === mapRow.status, `${mapRow.name} status drift: map=${mapRow.status}, audit=${audited.implementationStatus}`)
  expect(allowedMaturity.has(audited.evidenceMaturity), `${mapRow.name} has unknown evidence maturity ${audited.evidenceMaturity}`)
  expect(typeof audited.effectConclusion === 'string' && audited.effectConclusion.length > 0, `${mapRow.name} needs an explicit effect conclusion`)
  expect(Array.isArray(audited.evidencePaths) && audited.evidencePaths.length > 0, `${mapRow.name} needs at least one evidence path`)
  for (const evidencePath of audited.evidencePaths ?? []) {
    expect(existsSync(resolve(root, evidencePath)), `${mapRow.name} evidence path does not exist: ${evidencePath}`)
  }
  if (audited.evidenceMaturity === 'real_model_measured') {
    expect(
      audited.evidencePaths.some(path => path.startsWith('validation/')),
      `${mapRow.name} claims a real model run without a retained validation artifact`,
    )
  }
  if (audited.implementationStatus === 'contract_only') {
    expect(audited.effectConclusion.includes('disabled') || audited.effectConclusion.includes('not_'), `${mapRow.name} contract-only row must expose its blocked state`)
  }
}

for (const audited of auditRows) {
  expect(mapRows.some(row => row.name === audited.name), `audit contains capability not present in map: ${audited.name}`)
}

const implementedRows = auditRows.filter(row => row.implementationStatus === 'implemented')
expect(
  runtimeOwnersByCapability.size === implementedRows.length,
  `runtime owner coverage ${runtimeOwnersByCapability.size} does not match implemented capability count ${implementedRows.length}`,
)
for (const audited of implementedRows) {
  const owners = runtimeOwnersByCapability.get(audited.name) ?? []
  expect(owners.length > 0, `${audited.name} is marked implemented without a production runtime owner`)
  for (const ownerPath of owners) {
    expect(existsSync(resolve(root, ownerPath)), `${audited.name} runtime owner does not exist: ${ownerPath}`)
    expect(
      ownerPath.startsWith('app/src/') || ownerPath.startsWith('packages/agent-runtime/src/') || ownerPath === 'scripts/creator-working-agent-bridge.mjs',
      `${audited.name} runtime owner is not a production path: ${ownerPath}`,
    )
  }
}
for (const capabilityName of runtimeOwnersByCapability.keys()) {
  expect(
    auditByName.get(capabilityName)?.implementationStatus === 'implemented',
    `runtime owner mapping points to a non-implemented or missing capability: ${capabilityName}`,
  )
}

const contextSnapshotAudit = auditByName.get('Context Snapshot')
expect(
  contextSnapshotAudit?.effectConclusion === 'context_source_integrity_recent_scene_preflight_and_review_binding_verified_quality_not_proven',
  'Context Snapshot must retain the real recent-scene preflight without claiming quality',
)
expect(
  contextSnapshotAudit?.evidencePaths?.includes('validation/creator-writing/computer-use-chapter-20-mirofish-workflow-2026-07-18.json'),
  'Context Snapshot must retain the real Chrome recent-scene preflight receipt',
)

const localRepairAudit = auditByName.get('单块局部修订')
expect(
  localRepairAudit?.effectConclusion === 'real_runs_include_reverts_author_intent_rejections_and_one_disclosed_overpass_stable_improvement_not_proven',
  'local repair must retain rejection and disclosed overpass evidence without claiming stable improvement',
)
expect(
  localRepairAudit?.evidencePaths?.includes('validation/creator-writing/computer-use-chapter-20-mirofish-workflow-2026-07-18.json'),
  'local repair must retain the real Chapter 20 author-intent rejection receipt',
)
expect(
  localRepairAudit?.evidencePaths?.includes('validation/creator-writing/computer-use-chapter-20-local-repair-invalidation-2026-07-18.json'),
  'local repair must retain the real Chapter 20 overpass and invalidation receipt',
)

const reviewInvalidationAudit = auditByName.get('审阅重跑失效传播')
expect(reviewInvalidationAudit?.implementationStatus === 'implemented', 'review rerun invalidation must be implemented')
expect(reviewInvalidationAudit?.evidenceMaturity === 'real_local_runtime', 'review rerun invalidation must retain real Chrome evidence maturity')
expect(
  reviewInvalidationAudit?.effectConclusion === 'real_chrome_stale_repair_removed_persistent_invalidation_verified_no_quality_claim',
  'review rerun invalidation must distinguish state invalidation from literary quality',
)
expect(localRepairInvalidationReceipt.schemaVersion === 'creator-chapter20-local-repair-invalidation.v1', 'local-repair invalidation receipt schema mismatch')
expect(localRepairInvalidationReceipt.status === 'completed_with_negative_evidence', 'local-repair invalidation receipt must retain negative evidence status')
expect(localRepairInvalidationReceipt.scope?.chapterNumber === 20, 'local-repair invalidation receipt must stay on Chapter 20')
expect(localRepairInvalidationReceipt.scope?.computerUse === true, 'local-repair invalidation must retain Computer Use evidence')
expect(localRepairInvalidationReceipt.scope?.browser === 'Google Chrome', 'local-repair invalidation must identify Google Chrome')
expect(localRepairInvalidationReceipt.scope?.creatorQaAdapter === true, 'local-repair invalidation must disclose the Creator QA adapter')
expect(localRepairInvalidationReceipt.trigger?.oldRepairVisibleBeforeRereview === true, 'receipt must disclose the stale repair that was visible before rerun')
expect(localRepairInvalidationReceipt.trigger?.oldRepairAdopted === false, 'overpassed repair must remain unadopted')
expect(localRepairInvalidationReceipt.overpassRun?.chapterComparisonBlockCount === 0, 'receipt must preserve the missing comparison-context defect')
expect(localRepairInvalidationReceipt.hardening?.initialRepetitionReceivesChapterComparison === true, 'initial repetition repair must now receive chapter comparison evidence')
expect(localRepairInvalidationReceipt.hardening?.authorIntentPreservationRequirements === true, 'repair hardening must retain author-intent requirements')
expect(localRepairInvalidationReceipt.hardening?.newReviewPersistentlyStalesOldRepairs === true, 'new reviews must persistently stale old repairs')
expect(localRepairInvalidationReceipt.hardening?.visibleRepairRequiresActiveReviewMatch === true, 'visible repairs must match the active review')
expect(localRepairInvalidationReceipt.postFixRealRun?.findingCount === 1, 'post-fix real review must retain its one finding')
expect(
  JSON.stringify(localRepairInvalidationReceipt.postFixRealRun?.findingSeverities) === JSON.stringify(['preserve']),
  'post-fix real review must not invent a revision finding',
)
expect(localRepairInvalidationReceipt.postFixRealRun?.manualRecallDecision === 'pass', 'post-fix manual recall adherence must pass')
expect(localRepairInvalidationReceipt.postFixRealRun?.selectedRecallCount === 3, 'post-fix run must retain the three author-selected recalls')
expect(localRepairInvalidationReceipt.postFixRealRun?.oldRepairVisibleAfterRereview === false, 'old repair must disappear after rerun')
expect(localRepairInvalidationReceipt.postFixRealRun?.repairCandidateGeneratedAfterRereview === false, 'system must not manufacture a new repair candidate')
expect(localRepairInvalidationReceipt.conclusion?.staleRepairInvalidationVerified === true, 'receipt must verify stale-repair invalidation')
expect(localRepairInvalidationReceipt.conclusion?.stableLiteraryQualityImprovementProven === false, 'invalidation run must not claim stable literary improvement')
expect(localRepairInvalidationReceipt.conclusion?.professionalHumanBlindReviewCompleted === false, 'invalidation run must not claim professional blind review')
expect(localRepairInvalidationReceipt.conclusion?.demoOnlyCapabilityClaimedComplete === false, 'invalidation run must not claim a demo-only capability complete')
for (const boundary of ['repairAdopted', 'manuscriptChangedByRepair', 'canonChanged', 'canonPatchPrepared', 'cloudDataChanged', 'databaseWritten', 'paymentTouched', 'deployed', 'publicationPerformed', 'chapter21AccessedOrChanged']) {
  expect(localRepairInvalidationReceipt.boundaries?.[boundary] === false, `local-repair invalidation crossed boundary ${boundary}`)
}
for (const evidencePath of localRepairInvalidationReceipt.evidencePaths ?? []) {
  expect(existsSync(resolve(root, evidencePath)), `local-repair invalidation evidence path does not exist: ${evidencePath}`)
}
expect(
  decisionWorkflowText.includes("...snapshot.repairs.map(item => this.repository.saveRepair({ ...item, status: 'stale' }))"),
  'review workflow must persistently stale old repair proposals',
)
expect(
  decisionWorkflowText.includes("...snapshot.patches.map(item => this.repository.saveCanonPatch({ ...item, status: 'stale' }))"),
  'review workflow must persistently stale old Canon patches',
)
expect(
  decisionWorkflowTestText.includes('starting a new literary review must persistently invalidate every older repair candidate'),
  'workflow test must cover persistent repair invalidation',
)
expect(repairSelectionControllerText.includes("repair.status !== 'proposed'"), 'repair selection must reject non-proposed states')
expect(repairSelectionControllerText.includes('repair.reviewId !== activeReviewId'), 'repair selection must reject repairs from another review')

const structureReviewAudit = auditByName.get('场景结构审阅证据纠正')
expect(structureReviewAudit?.evidenceMaturity === 'real_model_measured', 'structure-review correction must retain its real-model rerun maturity')
expect(
  structureReviewAudit?.effectConclusion === 'original_failed_scene_real_rerun_passed_correction_literary_result_mixed',
  'structure-review correction must distinguish runtime recovery from mixed literary quality',
)
expect(floodgateStructureReviewReceipt.schemaVersion === 'creator-frozen-paired-quality-real-trial.v1', 'floodgate rerun receipt schema mismatch')
expect(floodgateStructureReviewReceipt.fixture?.id === 'frozen-original-floodgate-sacrifice-v1', 'floodgate rerun must use the original failed fixture')
expect(floodgateStructureReviewReceipt.fixture?.realWorkingAgent === true, 'floodgate rerun must use the real Working Agent')
expect(floodgateStructureReviewReceipt.runtime?.realWorkingAgentCallCount === 30, 'floodgate rerun must retain all 30 real role calls')
const floodgateOperations = floodgateStructureReviewReceipt.runtime?.roleOperations ?? []
expect(
  floodgateOperations.filter(operation => operation.operation === 'scene_architecture_review').length === 2,
  'floodgate rerun must prove the original structure review and its bounded rerun',
)
expect(
  floodgateOperations.some(operation => operation.operation === 'scene_architecture_revision'),
  'floodgate rerun must prove the Architect correction executed',
)
expect(
  floodgateOperations.some(operation => operation.operation === 'scene_draft'),
  'floodgate rerun must prove Writer was reached after structure-review correction',
)
expect(floodgateStructureReviewReceipt.candidates?.architectWriterWorkflow?.directionReceiptPresent === true, 'floodgate workflow must retain an author-direction receipt')
expect(floodgateStructureReviewReceipt.candidates?.architectWriterWorkflow?.refinement?.appliedRepairCount === 0, 'floodgate rerun must retain the two reverted repairs instead of claiming improvement')
expect(
  floodgateStructureReviewReceipt.candidates?.architectWriterWorkflow?.refinement?.localRepairCycles?.every(cycle => cycle.disposition === 'reverted_target_dimension_persisted'),
  'floodgate rerun must retain target-dimension persistence as the repair disposition',
)
expect(floodgateStructureReviewReceipt.evaluation?.independentVerificationCompleted === true, 'floodgate comparison requires independent verification')
expect(floodgateStructureReviewReceipt.evaluation?.overallWinnerDeclared === false, 'floodgate rerun must not declare an overall winner')
expect(floodgateStructureReviewReceipt.evaluation?.compositeLiteraryScoreUsed === false, 'floodgate rerun must not use a composite literary score')
for (const boundary of ['repositoryWritePerformed', 'candidateAdopted', 'canonChanged', 'chapter20AccessedOrChanged', 'chapter21AccessedOrChanged', 'cloudDataChanged', 'publicationPerformed']) {
  expect(floodgateStructureReviewReceipt.boundaries?.[boundary] === false, `floodgate rerun crossed boundary ${boundary}`)
}

const pairedVerificationAudit = auditByName.get('匿名独立复核证据纠正')
expect(pairedVerificationAudit?.evidenceMaturity === 'real_model_measured', 'paired-verification correction must retain real-model maturity')
expect(
  pairedVerificationAudit?.effectConclusion === 'real_fault_injection_revision_passed_semantics_frozen_single_scene_no_stable_quality',
  'paired-verification correction must separate runtime recovery from stable literary quality',
)
expect(
  pairedVerificationAudit?.evidencePaths?.includes('validation/creator-ui/frozen-paired-quality-verifier-evidence-revision-real-trial-2026-07-18/summary.json'),
  'paired-verification correction must retain the real fault-injection receipt',
)
expect(pairedVerificationRevisionReceipt.schemaVersion === 'creator-frozen-paired-quality-real-trial.v1', 'paired-verification receipt schema mismatch')
expect(pairedVerificationRevisionReceipt.fixture?.id === 'frozen-original-glass-lung-endurance-v1', 'paired-verification receipt must use the frozen glass-lung fixture')
expect(pairedVerificationRevisionReceipt.fixture?.realWorkingAgent === true, 'paired-verification receipt must use the real Working Agent')
expect(pairedVerificationRevisionReceipt.fixture?.realChapterMaterialUsed === false, 'paired-verification receipt must not use current chapter material')
expect(pairedVerificationRevisionReceipt.runtime?.realWorkingAgentCallCount === 16, 'paired-verification receipt must retain all 16 real role calls')
expect(pairedVerificationRevisionReceipt.evaluation?.verificationEvidenceFailureRequested === true, 'paired-verification receipt must retain the explicit fault request')
expect(pairedVerificationRevisionReceipt.evaluation?.verificationEvidenceFailureInjected === true, 'paired-verification receipt must prove the test-only fault was injected')
expect(pairedVerificationRevisionReceipt.evaluation?.verificationEvidenceFaultTargetDimension === 'continuity', 'paired-verification receipt must identify the affected dimension')
expect(pairedVerificationRevisionReceipt.evaluation?.verificationEvidenceRevisionApplied === true, 'paired-verification receipt must prove one bounded revision was applied')
expect(pairedVerificationRevisionReceipt.evaluation?.independentVerificationCompleted === true, 'paired-verification receipt must complete independent verification')
expect(pairedVerificationRevisionReceipt.evaluation?.overallWinnerDeclared === false, 'paired-verification receipt must not declare an overall winner')
expect(pairedVerificationRevisionReceipt.evaluation?.compositeLiteraryScoreUsed === false, 'paired-verification receipt must not use a composite score')
const pairedVerificationOperations = pairedVerificationRevisionReceipt.runtime?.roleOperations ?? []
expect(
  pairedVerificationOperations.filter(operation => operation.operation === 'paired_literary_comparison_verification').length === 1,
  'paired-verification receipt must contain one initial independent verification',
)
expect(
  pairedVerificationOperations.filter(operation => operation.operation === 'paired_literary_comparison_verification_revision').length === 1,
  'paired-verification receipt must contain exactly one evidence revision',
)
expect(pairedVerificationOperations.every(operation => operation.canonCommitAllowed === false), 'paired-verification real calls must not commit Canon')
for (const boundary of ['repositoryWritePerformed', 'candidateAdopted', 'canonChanged', 'chapter20AccessedOrChanged', 'chapter21AccessedOrChanged', 'cloudDataChanged', 'publicationPerformed', 'rawDraftPersistedInRepository', 'rawBlindMappingPersistedInRepository']) {
  expect(pairedVerificationRevisionReceipt.boundaries?.[boundary] === false, `paired-verification receipt crossed boundary ${boundary}`)
}

const manualRecallAudit = auditByName.get('人工召回目录')
const manualRecallAdherenceAudit = auditByName.get('手动召回正文遵循审阅')
expect(manualRecallAdherenceAudit?.implementationStatus === 'implemented', 'manual recall adherence must be a production capability')
expect(manualRecallAdherenceAudit?.evidenceMaturity === 'real_model_measured', 'manual recall adherence must retain real-model evidence')
expect(
  manualRecallAdherenceAudit?.effectConclusion === 'single_recall_pass_and_three_randomized_ab_pairs_measured_selected_memory_better_adherence_3_of_3_one_pair_full_product_review_gate_rejected_both_with_exact_actionable_finding_counts_no_adoption_no_stability_claim',
  'manual recall adherence must not overclaim stable long-form quality',
)
expect(
  manualRecallAdherenceAudit?.evidencePaths?.includes('validation/creator-ui/manual-recall-adherence-real-trial-2026-07-18/summary.json'),
  'manual recall adherence must retain the real trial receipt',
)
expect(
  manualRecallAdherenceAudit?.evidencePaths?.includes('validation/creator-ui/manual-recall-effect-real-trial-2026-07-18/summary.json'),
  'manual recall adherence must retain the randomized effect receipt',
)
expect(
  manualRecallAdherenceAudit?.evidencePaths?.includes('validation/creator-ui/manual-recall-effect-real-campaign-2026-07-18/summary.json'),
  'manual recall adherence must retain the three-pair campaign receipt',
)
expect(manualRecallAdherenceReceipt.schemaVersion === 'creator-manual-recall-adherence-real-trial.v1', 'manual recall adherence receipt schema mismatch')
expect(manualRecallAdherenceReceipt.status === 'completed', 'manual recall adherence real trial must complete')
expect(manualRecallAdherenceReceipt.fixture?.realWorkingAgent === true, 'manual recall adherence trial must use the real Working Agent')
expect(manualRecallAdherenceReceipt.draft?.generatedThroughProductAgent === true, 'manual recall adherence trial must use the production draft path')
expect(manualRecallAdherenceReceipt.manualRecallAdherence?.selectedSourceIds?.length === 3, 'manual recall adherence trial must cover all three selected recalls')
expect(manualRecallAdherenceReceipt.manualRecallAdherence?.sourceCoverageExact === true, 'manual recall adherence source coverage must be exact')
expect(manualRecallAdherenceReceipt.manualRecallAdherence?.unselectedCanaryExcluded === true, 'unselected recall canary must remain outside the Auditor prompt')
expect(manualRecallAdherenceReceipt.manualRecallAdherence?.checks?.every(check => check.evidenceLocatable === true), 'manual recall adherence checks require locatable evidence')
expect(manualRecallAdherenceReceipt.manualRecallAdherence?.compositeLiteraryScoreUsed === false, 'manual recall adherence must not use a composite score')
expect(manualRecallAdherenceReceipt.runtime?.realWorkingAgentCallCount === 8, 'manual recall adherence receipt must retain all eight real role calls')
expect(manualRecallAdherenceReceipt.runtime?.roleOperations?.some(operation => operation.operation === 'manual_recall_adherence_review'), 'manual recall adherence Auditor operation missing')
expect(manualRecallEffectReceipt.schemaVersion === 'creator-manual-recall-effect-real-trial.v1', 'manual recall effect receipt schema mismatch')
expect(manualRecallEffectReceipt.status === 'real_single_pair_measured_no_stability_claim', 'manual recall effect receipt must preserve its single-pair limitation')
expect(manualRecallEffectReceipt.fixture?.realWorkingAgent === true, 'manual recall effect trial must use the real Working Agent')
expect(manualRecallEffectReceipt.fairness?.onlyAuthoredContextDifference === 'manualRecallItems', 'manual recall effect trial must isolate the authored context difference')
expect(manualRecallEffectReceipt.fairness?.contextIdentityRecomputedPerArm === true, 'manual recall effect trial must not reuse one context identity across both arms')
expect(manualRecallEffectReceipt.arms?.manualRecallSelected?.adherenceDecision === 'pass', 'selected manual recalls must pass the measured adherence audit')
expect(manualRecallEffectReceipt.arms?.manualRecallSelected?.fulfilledOrRespectedCount === 4, 'selected arm must retain all four measured recall duties')
expect(manualRecallEffectReceipt.arms?.manualRecallAbsent?.adherenceDecision === 'reject', 'absent-recall control must retain the measured rejection')
expect(manualRecallEffectReceipt.arms?.manualRecallAbsent?.fulfilledOrRespectedCount === 1, 'absent-recall control must retain the measured one-of-four result')
expect(manualRecallEffectReceipt.blindLiteraryComparison?.independentVerificationCompleted === true, 'manual recall effect comparison needs independent verification')
expect(manualRecallEffectReceipt.blindLiteraryComparison?.overallWinnerDeclared === false, 'manual recall effect trial must not declare an overall winner')
expect(manualRecallEffectReceipt.runtime?.realWorkingAgentCallCount === 14, 'manual recall effect receipt must retain all fourteen real role calls')
for (const boundary of ['repositoryWritePerformed', 'candidateAdopted', 'canonChanged', 'chapter20AccessedOrChanged', 'chapter21AccessedOrChanged', 'cloudDataChanged', 'publicationPerformed', 'rawDraftPersistedInRepository']) {
  expect(manualRecallEffectReceipt.boundaries?.[boundary] === false, `manual recall effect receipt crossed boundary ${boundary}`)
}
expect(manualRecallEffectCampaign.schemaVersion === 'creator-manual-recall-effect-real-campaign.v1', 'manual recall effect campaign schema mismatch')
expect(manualRecallEffectCampaign.status === 'real_three_pair_campaign_measured_no_stability_claim', 'manual recall effect campaign must preserve its no-stability limitation')
expect(manualRecallEffectCampaign.method?.pairCount === 3, 'manual recall effect campaign must contain three pairs')
expect(manualRecallEffectCampaign.method?.distinctScenarioCount === 3, 'manual recall effect campaign must contain three distinct scenarios')
expect(manualRecallEffectCampaign.method?.automaticRetrievalUsed === false, 'manual recall effect campaign must not imply automatic retrieval')
expect(manualRecallEffectCampaign.method?.compositeLiteraryScoreUsed === false, 'manual recall effect campaign must not use a composite literary score')
expect(manualRecallEffectCampaign.method?.overallWinnerDeclared === false, 'manual recall effect campaign must not declare an overall winner')
expect(manualRecallEffectCampaign.method?.fullProductReviewPairCount === 1, 'manual recall effect campaign must disclose that only one pair completed the full product review path')
expect(manualRecallEffectCampaign.aggregate?.selectedMemoryBetterAdherencePairs === 3, 'manual recall effect campaign must preserve the measured three-of-three adherence direction')
expect(manualRecallEffectCampaign.aggregate?.blindVerifiedDimensionPreferences?.manual_recall_selected === 19, 'manual recall effect campaign must retain the nineteen independently verified selected-memory preferences')
expect(manualRecallEffectCampaign.aggregate?.blindVerifiedDimensionPreferences?.manual_recall_absent === 4, 'manual recall effect campaign must retain the four independently verified absent-memory preferences')
expect(manualRecallEffectCampaign.aggregate?.blindVerifiedDimensionPreferences?.tie === 7, 'manual recall effect campaign must retain all seven independently verified ties')
expect(manualRecallEffectCampaign.aggregate?.blindVerifiedDimensionPreferences?.unconfirmed === 3, 'manual recall effect campaign must retain all three unconfirmed first-pass preferences')
expect(manualRecallEffectCampaign.aggregate?.totalRealWorkingAgentCalls === 44, 'manual recall effect campaign must retain all forty-four real role calls')
expect(manualRecallEffectCampaign.aggregate?.stableLiteraryQualityImprovementProven === false, 'manual recall effect campaign must not claim stable literary improvement')
const floodgateFullReview = manualRecallEffectCampaign.trials?.find(trial => trial.scenarioId === 'floodgate')?.fullProductReview
expect(floodgateFullReview?.candidateAdoptionAttempted === false, 'full product review must not adopt either candidate')
for (const arm of ['manualRecallSelected', 'manualRecallAbsent']) {
  const review = floodgateFullReview?.[arm]
  const gate = floodgateFullReview?.candidateQualityGate?.[arm]
  const expectedHardBlockCount = review?.activeFindings?.filter(finding => finding.severity === 'hard_block').length ?? 0
  const expectedRevisionCandidateCount = review?.activeFindings?.filter(finding => finding.severity === 'revision_candidate').length ?? 0
  expect(review?.actionableFindingVerificationCompleted === true, `full product review ${arm} findings require independent verification`)
  expect(review?.activeFindings?.every(finding => finding.evidenceLocatable === true), `full product review ${arm} findings require locatable evidence`)
  expect(expectedHardBlockCount + expectedRevisionCandidateCount > 0, `full product review ${arm} requires at least one actionable literary finding`)
  expect(gate?.allowed === false, `full product review ${arm} must be rejected by the unified candidate quality gate`)
  expect((gate?.blockers?.find(blocker => blocker.code === 'active_hard_block')?.count ?? 0) === expectedHardBlockCount, `full product review ${arm} gate hard blockers must mirror the review`)
  expect((gate?.blockers?.find(blocker => blocker.code === 'active_revision_candidate')?.count ?? 0) === expectedRevisionCandidateCount, `full product review ${arm} gate revision blockers must mirror the review`)
}
for (const boundary of ['repositoryWritePerformed', 'candidateAdopted', 'canonChanged', 'chapter20AccessedOrChanged', 'chapter21AccessedOrChanged', 'cloudDataChanged', 'publicationPerformed', 'rawDraftPersistedInRepository']) {
  expect(manualRecallEffectCampaign.boundaries?.[boundary] === false, `manual recall effect campaign crossed boundary ${boundary}`)
}
for (const requiredGateContract of [
  'manual_recall_receipt_missing',
  'manual_recall_receipt_mismatch',
  'manual_recall_receipt_rejected',
  'manual_recall_receipt_evidence_invalid',
]) {
  expect(candidateQualityGateText.includes(requiredGateContract), `candidate quality gate is missing ${requiredGateContract}`)
}
expect(candidateQualityGateText.includes('input.context.manualRecallItems'), 'candidate quality gate must derive recall requirements from the current Context')
for (const requiredContextBinding of [
  'contextSnapshotId',
  'contextCompilationPolicyVersion',
  'contextSourceFingerprint',
  'contextSnapshotFingerprint',
]) {
  expect(literaryReviewOwnerText.includes(requiredContextBinding), `LiteraryReview owner is missing ${requiredContextBinding}`)
  expect(candidateQualityGateText.includes(requiredContextBinding), `candidate quality gate is missing ${requiredContextBinding}`)
}
expect(candidateQualityGateText.includes('contextSnapshotFingerprint(input.context)'), 'candidate quality gate must recompute the current Context content fingerprint')
for (const requiredContextIntegrityContract of [
  'contentFingerprint',
  'contextSnapshotIntegrityIsCurrent',
  "context.contentFingerprint === contextSnapshotFingerprint(context)",
]) {
  expect(contextCompilerText.includes(requiredContextIntegrityContract), `Context compiler is missing ${requiredContextIntegrityContract}`)
}
expect(candidateQualityGateText.includes('contextSnapshotIntegrityIsCurrent(input.context)'), 'candidate quality gate must validate the stored Context content fingerprint')
expect(decisionWorkflowText.includes('assertContextSnapshotIntegrity'), 'working Agent operations must fail closed on a mutated Context')
expect(decisionWorkflowTestText.includes('tamperedContextReviewCalls, 0'), 'workflow tests must prove a mutated Context stops before Reviewer invocation')
expect(contextCompilerText.includes('.filter(([, entry]) => entry !== undefined)'), 'Context fingerprint serialization must omit JSON-incompatible undefined object properties')
expect(contextCompilerText.includes("entry === undefined ? 'null'"), 'Context fingerprint serialization must match JSON array handling for undefined entries')
expect(
  appPackage.scripts?.['test:creator-decision-domain']?.includes('creator-decision-workflow.ts'),
  'the complete decision workflow test must run in the default Creator regression chain',
)
for (const requiredDepthTest of [
  'creator-character-simulation.ts',
  'creator-character-state-pipeline.ts',
  'creator-decision-agent-adapter.ts',
  'creator-decision-offline-validation.ts',
  'creator-historical-state-backfill.ts',
]) {
  expect(
    appPackage.scripts?.['test:creator-writing-quality-depth']?.includes(requiredDepthTest),
    `the writing-quality depth regression is missing ${requiredDepthTest}`,
  )
}
expect(
  rootPackage.scripts?.['test:creator']?.includes('test:creator-writing-quality-depth'),
  'the default Creator regression must execute the writing-quality depth suite',
)
for (const boundary of ['repositoryWritePerformed', 'candidateAdopted', 'canonChanged', 'chapter20AccessedOrChanged', 'chapter21AccessedOrChanged', 'cloudDataChanged', 'publicationPerformed']) {
  expect(manualRecallAdherenceReceipt.boundaries?.[boundary] === false, `manual recall adherence receipt crossed boundary ${boundary}`)
}
expect(
  manualRecallAudit?.effectConclusion?.includes('real_long_range_author_selection_to_context_verified'),
  'manual recall evidence must record real long-range author selection to Context',
)
expect(
  mapText.includes('通用手选链已验证')
    && mapText.includes('4 张真实长程卡中显式选择 1 张'),
  'capability map must distinguish generic selection from the real 1-of-4 long-range run',
)
expect(
  manualRecallAudit?.evidencePaths?.includes('validation/creator-writing/creator-editor-manual-recall-context-2026-07-18.json'),
  'manual recall evidence must retain the authenticated Chrome selection-to-Context receipt',
)
expect(manualRecallReceipt.schemaVersion === 'creator-editor-manual-recall-context.v1', 'manual recall receipt schema mismatch')
expect(manualRecallReceipt.browser === 'Google Chrome', 'manual recall receipt must identify the real browser channel')
expect(manualRecallReceipt.sourceKind === 'authenticated_creator_qa_fixture', 'manual recall receipt must disclose its fixture source')
expect(manualRecallReceipt.longRangeThreadSelectionClaimed === false, 'generic recall QA must not claim real long-range author selection')
expect(manualRecallReceipt.evidence?.explicitDeselectionVerified === true, 'manual recall receipt must prove explicit deselection')
expect(manualRecallReceipt.evidence?.explicitSelectionVerified === true, 'manual recall receipt must prove explicit selection')
expect(manualRecallReceipt.evidence?.selectionPersistedAcrossRefresh === true, 'manual recall selection must survive refresh')
expect(manualRecallReceipt.evidence?.enteredCandidateSearchContext === true, 'manual recall source must enter candidate-search Context')
expect(manualRecallReceipt.evidence?.contextPersistedAcrossRefresh === true, 'manual recall Context must survive refresh')
expect(manualRecallReceipt.evidence?.matchingDurableContextCount >= 1, 'manual recall source must exist in a durable Context Snapshot')
expect(manualRecallReceipt.evidence?.candidateCount >= 1 && manualRecallReceipt.evidence?.candidateCount <= 3, 'manual recall QA must retain one to three candidates')
expect(manualRecallReceipt.evidence?.duplicateCandidateCount === 0, 'manual recall QA must not pad with duplicate candidates')
expect(manualRecallReceipt.evidence?.proseMutationObserved === false, 'manual recall selection must not mutate prose')
expect(manualRecallReceipt.evidence?.candidateAutoSelected === false, 'manual recall QA must not auto-select a candidate')
for (const boundary of ['chapter21Accessed', 'proseGenerated', 'proseAdopted', 'canonCommitted', 'cloudWritten', 'published']) {
  expect(manualRecallReceipt.boundary?.[boundary] === false, `manual recall receipt crossed boundary ${boundary}`)
}
expect(
  manualRecallAudit?.evidencePaths?.includes('validation/creator-writing/verified-long-range-thread-author-selection-2026-07-18.json'),
  'manual recall audit must retain the real long-range Chrome selection receipt',
)
expect(realLongRangeSelectionReceipt.schemaVersion === 'creator-editor-real-long-range-recall-context.v1', 'real long-range selection receipt schema mismatch')
expect(realLongRangeSelectionReceipt.browser === 'Google Chrome', 'real long-range selection must run in Google Chrome')
expect(realLongRangeSelectionReceipt.source?.fromChapter === 1 && realLongRangeSelectionReceipt.source?.toChapter === 20, 'real long-range selection must remain inside Chapters 1-20')
expect(realLongRangeSelectionReceipt.source?.verifiedRecordCount === 13, 'real long-range selection must use all 13 verified records')
expect(realLongRangeSelectionReceipt.source?.eligibleLongRangeCardCount === 4, 'real long-range selection must expose four eligible cards')
expect(realLongRangeSelectionReceipt.source?.candidateAdapter === 'deterministic_reference', 'real long-range selection must disclose the reference candidate adapter')
expect(realLongRangeSelectionReceipt.source?.realModelQualityClaimed === false, 'real long-range selection must not claim model literary quality')
expect(realLongRangeSelectionReceipt.interaction?.explicitCheckboxClick === true, 'real long-range selection requires an explicit checkbox click')
expect(realLongRangeSelectionReceipt.interaction?.selectedLongRangeCardCount === 1, 'real long-range selection must choose exactly one card')
expect(realLongRangeSelectionReceipt.interaction?.unselectedLongRangeCardCount === 3, 'real long-range selection must leave three cards unselected')
expect(realLongRangeSelectionReceipt.interaction?.selectedSourceEnteredContext === true, 'selected real long-range source must enter Context')
expect(realLongRangeSelectionReceipt.interaction?.unselectedSourcesEnteredContext === 0, 'unselected real long-range sources must stay out of Context')
expect(realLongRangeSelectionReceipt.interaction?.selectionPersistedAcrossRefresh === true, 'real long-range selection must survive refresh')
expect(realLongRangeSelectionReceipt.interaction?.contextPersistedAcrossRefresh === true, 'real long-range Context must survive refresh')
for (const boundary of ['acceptedManuscriptChanged', 'candidateProseGenerated', 'candidateProseAdopted', 'canonChanged', 'chapter21ManuscriptReadOrChanged', 'cloudDataChanged', 'publicationPerformed']) {
  expect(realLongRangeSelectionReceipt.sideEffects?.[boundary] === false, `real long-range selection crossed boundary ${boundary}`)
}

expect(computerUseChapterReviewReceipt.schemaVersion === 'creator-computer-use-chapter-review.v1', 'Computer Use chapter review receipt schema mismatch')
expect(computerUseChapterReviewReceipt.status === 'passed', 'Computer Use chapter review must pass')
expect(computerUseChapterReviewReceipt.browser === 'Google Chrome', 'Computer Use chapter review must identify Google Chrome')
expect(computerUseChapterReviewReceipt.interactionMode === 'computer_use', 'chapter review must be performed through Computer Use')
expect(computerUseChapterReviewReceipt.workspaceRestore?.authorConfirmed === true, 'workspace restore must retain author confirmation')
expect(computerUseChapterReviewReceipt.workspaceRestore?.appliedRecordCount === 1020, 'real UI restore must apply the expected 1020 changed records')
expect(computerUseChapterReviewReceipt.manualRecall?.finalSelectedCount === 2, 'Chapter 20 review must use exactly two author-selected recall sources')
expect(computerUseChapterReviewReceipt.manualRecall?.selectionPersistedAcrossReload === true, 'Chapter 20 recall selection must survive reload')
expect(computerUseChapterReviewReceipt.conversationReview?.commandRoutedToExistingReviewWorkflow === true, 'natural-language review must reach the real review workflow')
expect(computerUseChapterReviewReceipt.conversationReview?.requestedFocusDimensions?.includes('continuity'), 'causal review language must reach the continuity focus dimension')
expect(computerUseChapterReviewReceipt.conversationReview?.workingAgentBridgeUsed === true, 'Chapter 20 review must use the real local Working Agent bridge')
expect(computerUseChapterReviewReceipt.conversationReview?.secondAuditorOperation === 'literary_review_verification', 'actionable findings must pass independent verification')
expect(computerUseChapterReviewReceipt.conversationReview?.actionableFindingVerifiedCount >= 1, 'Chapter 20 review needs at least one independently verified actionable finding')
expect(computerUseChapterReviewReceipt.conversationReview?.hardBlockRejectedCount >= 1, 'Chapter 20 review must retain evidence that the second Auditor rejected an unsupported hard block')
expect(computerUseChapterReviewReceipt.conversationReview?.compositeLiteraryScoreUsed === false, 'Chapter 20 review must not use a composite literary score')
for (const boundary of ['proseGenerated', 'proseEdited', 'candidateAdopted', 'canonCommitInvoked', 'chapter21Accessed', 'cloudWritten', 'published']) {
  expect(computerUseChapterReviewReceipt.boundaries?.[boundary] === false, `Computer Use chapter review crossed boundary ${boundary}`)
}
for (const evidencePath of computerUseChapterReviewReceipt.evidence ?? []) {
  expect(existsSync(resolve(root, evidencePath)), `Computer Use chapter review evidence path does not exist: ${evidencePath}`)
}

expect(computerUseChapterManualEditReceipt.schemaVersion === 'creator-computer-use-chapter-manual-edit-rereview.v1', 'Computer Use manual-edit receipt schema mismatch')
expect(computerUseChapterManualEditReceipt.status === 'passed_with_author_style_tradeoff_remaining', 'Computer Use manual-edit run must preserve the remaining author style choice')
expect(computerUseChapterManualEditReceipt.browser === 'Google Chrome', 'Computer Use manual-edit run must identify Google Chrome')
expect(computerUseChapterManualEditReceipt.interactionMode === 'computer_use', 'manual prose edits must be performed through Computer Use')
expect(computerUseChapterManualEditReceipt.source?.chapterNumber === 20, 'manual-edit run must remain on Chapter 20')
expect(computerUseChapterManualEditReceipt.source?.selectedRecallCount === 2, 'manual-edit re-review must retain exactly two author-selected recalls')
expect(computerUseChapterManualEditReceipt.source?.contextPercentDisplayed === 8, 'manual-edit re-review must retain the eight-percent context boundary')
expect(computerUseChapterManualEditReceipt.multiBlockRepairBoundary?.evidenceBlockCount === 4, 'multi-block repair boundary must retain all four evidence blocks')
expect(computerUseChapterManualEditReceipt.multiBlockRepairBoundary?.automaticReplacementGenerated === false, 'multi-block finding must not generate an automatic replacement')
expect(computerUseChapterManualEditReceipt.multiBlockRepairBoundary?.authorDirectionOnly === true, 'multi-block finding must remain author-directed')
expect(computerUseChapterManualEditReceipt.inputRecovery?.transientCorruptionSaved === false, 'transient Computer Use text corruption must never be saved')
expect(computerUseChapterManualEditReceipt.inputRecovery?.authorTextLost === false, 'Computer Use recovery must preserve author text')
expect(computerUseChapterManualEditReceipt.manualEdits?.length === 3, 'manual-edit run must retain the three actual local edits')
for (const edit of computerUseChapterManualEditReceipt.manualEdits ?? []) {
  expect(edit.savedAsLocalDraft === true, `manual edit ${edit.step} must be saved as a local draft`)
  expect(edit.oldReviewInvalidated === true, `manual edit ${edit.step} must invalidate the old review`)
  expect(edit.oldCanonDiffInvalidated === true, `manual edit ${edit.step} must invalidate the old Canon diff`)
  expect(typeof edit.original === 'string' && edit.original.length > 0, `manual edit ${edit.step} must retain original text`)
  expect(typeof edit.replacement === 'string' && edit.replacement.length > 0, `manual edit ${edit.step} must retain replacement text`)
}
expect(computerUseChapterManualEditReceipt.independentReviewRuns?.length === 3, 'every saved manual edit must be followed by an independent review')
expect(computerUseChapterManualEditReceipt.independentReviewRuns?.[0]?.previousFourBlockRepetitionFindingStillPresent === false, 'first edit must remove the original four-block repetition finding')
expect(computerUseChapterManualEditReceipt.independentReviewRuns?.[1]?.knowledgeTimingIssueStillPresent === false, 'second edit must remove the premature-knowledge finding')
expect(computerUseChapterManualEditReceipt.independentReviewRuns?.[2]?.nearbyNegativeBoundaryRepetitionStillPresent === false, 'third edit must remove the nearby negative-boundary repetition finding')
expect(computerUseChapterManualEditReceipt.independentReviewRuns?.[2]?.remainingFindingClass === 'author_style_tradeoff', 'final review must leave the author-facing style tradeoff explicit')
expect(computerUseChapterManualEditReceipt.independentReviewRuns?.[2]?.hardCorrectnessFindingCount === 0, 'final review must retain zero hard correctness findings')
expect(
  computerUseChapterManualEditReceipt.independentReviewRuns?.every(run => run.allDisplayedFindingsEvidenceLocated === true),
  'all three independent re-reviews must retain locatable prose evidence',
)
for (const boundary of ['modelProseGenerated', 'modelProseInserted', 'candidateAutoAdopted', 'canonCommitInvoked', 'canonChanged', 'chapter21Accessed', 'cloudWritten', 'databaseWritten', 'paymentTouched', 'deployed', 'published']) {
  expect(computerUseChapterManualEditReceipt.boundaries?.[boundary] === false, `Computer Use manual-edit run crossed boundary ${boundary}`)
}
expect(computerUseChapterManualEditReceipt.boundaries?.authorManualProseEdited === true, 'manual-edit run must prove real author prose editing')
expect(computerUseChapterManualEditReceipt.claims?.realAuthorWorkflowExecuted === true, 'manual-edit run must prove the real author workflow')
expect(computerUseChapterManualEditReceipt.claims?.stableLiteraryQualityImprovementProven === false, 'single Chapter 20 run must not claim stable literary improvement')
expect(computerUseChapterManualEditReceipt.claims?.automaticRagEnabled === false, 'manual-edit run must not enable automatic RAG')
for (const evidencePath of computerUseChapterManualEditReceipt.evidence ?? []) {
  expect(existsSync(resolve(root, evidencePath)), `Computer Use manual-edit evidence path does not exist: ${evidencePath}`)
}

expect(computerUseContinuityRepairReceipt.schemaVersion === 'creator-computer-use-continuity-repair.v1', 'continuity-repair receipt schema mismatch')
expect(computerUseContinuityRepairReceipt.status === 'candidate_repairs_completed_with_zero_active_revision_findings', 'continuity-repair receipt must retain the final zero-revision review state')
expect(computerUseContinuityRepairReceipt.browser === 'Google Chrome', 'continuity repair must identify Google Chrome')
expect(computerUseContinuityRepairReceipt.interactionMode === 'computer_use', 'continuity repairs must be performed through Computer Use')
expect(computerUseContinuityRepairReceipt.scope?.fromChapter === 1 && computerUseContinuityRepairReceipt.scope?.toChapter === 20, 'continuity repair scope must remain Chapters 1-20')
expect(computerUseContinuityRepairReceipt.sourceAudit?.adjacentTransitionCount === undefined, 'adjacent transition count belongs to the fixed scope, not a duplicated source-audit field')
expect(computerUseContinuityRepairReceipt.sourceAudit?.realWorkingAgentCallCount === 6, 'continuity audit must retain six real Working Agent calls')
expect(computerUseContinuityRepairReceipt.sourceAudit?.verifiedRevisionCandidateCount === 2, 'continuity audit must retain both independently verified candidates')
expect(computerUseContinuityRepairReceipt.sourceAudit?.hardBlockCount === 0, 'continuity audit must retain zero hard blocks')
expect(computerUseContinuityRepairReceipt.candidateRepairs?.length === 2, 'continuity repair must retain exactly two candidate repairs')
const chapter12ContinuityRepair = computerUseContinuityRepairReceipt.candidateRepairs?.find(repair => repair.chapterNumber === 12)
const chapter20ContinuityRepair = computerUseContinuityRepairReceipt.candidateRepairs?.find(repair => repair.chapterNumber === 20)
expect(chapter12ContinuityRepair?.independentReview?.waiverMislabelStillPresentInDraft === false, 'Chapter 12 re-review must clear the false waiver label')
expect(chapter12ContinuityRepair?.independentReview?.revisionCandidateCount === 0, 'Chapter 12 re-review must retain zero revision candidates')
expect(chapter20ContinuityRepair?.independentReview?.hardCorrectnessFindingCount === 0, 'Chapter 20 re-review must retain zero hard correctness findings')
expect(chapter20ContinuityRepair?.reviewHistory?.length === 4, 'Chapter 20 repair must retain all four review iterations')
expect(chapter20ContinuityRepair?.reviewHistory?.[0]?.revisionCandidateCount === 3, 'Chapter 20 review history must preserve the initial three revision candidates')
expect(chapter20ContinuityRepair?.reviewHistory?.[2]?.revisionCandidateCount === 2, 'Chapter 20 review history must preserve the later evidence-boundary findings')
expect(chapter20ContinuityRepair?.independentReview?.revisionCandidateCount === 0, 'Chapter 20 final re-review must retain zero active revision candidates')
expect(chapter20ContinuityRepair?.independentReview?.protectedEvidenceCount === 4, 'Chapter 20 final re-review must retain four locatable protected evidence blocks')
expect(computerUseContinuityRepairReceipt.recallContaminationFix?.fix?.includes('no longer include candidate titles'), 'recall contamination fix must remove candidate paths from historical recall')
expect(computerUseContinuityRepairReceipt.recallContaminationFix?.browserVerification?.candidatePathPresent === false, 'real Chrome recall must exclude candidate paths')
expect(computerUseContinuityRepairReceipt.recallContaminationFix?.browserVerification?.waiverCandidatePresent === false, 'real Chrome recall must exclude the waiver candidate label')
expect(computerUseContinuityRepairReceipt.recallContaminationFix?.automaticRagEnabled === false, 'recall contamination fix must not enable automatic RAG')
expect(computerUseContinuityRepairReceipt.boundaries?.canonBaselineStillContainsOriginalFindings === true, 'candidate repairs must not masquerade as repaired Canon')
for (const boundary of ['modelProseGenerated', 'modelProseInserted', 'candidateAutoAdopted', 'canonCommitInvoked', 'canonChanged', 'chapter21Accessed', 'cloudWritten', 'databaseWritten', 'paymentTouched', 'deployed', 'published']) {
  expect(computerUseContinuityRepairReceipt.boundaries?.[boundary] === false, `continuity-repair run crossed boundary ${boundary}`)
}
expect(computerUseContinuityRepairReceipt.inputRecovery?.transientOldDraftOverwriteDetected === true, 'continuity-repair receipt must disclose the transient old-draft overwrite')
expect(computerUseContinuityRepairReceipt.inputRecovery?.transientOldDraftOverwriteSaved === true, 'continuity-repair receipt must disclose that the transient overwrite reached local draft state')
expect(computerUseContinuityRepairReceipt.inputRecovery?.transientOverwriteCorrectedBeforeFinalReview === true, 'transient old-draft overwrite must be corrected before final review')
expect(computerUseContinuityRepairReceipt.inputRecovery?.authorTextLost === false, 'transient overwrite recovery must not claim author text loss')
expect(computerUseContinuityRepairReceipt.inputRecovery?.finalReviewUsedCorrectedCurrentDraft === true, 'final review must use the corrected current draft')
expect(computerUseContinuityRepairReceipt.refreshVerification?.browserReloaded === true, 'continuity repair must verify persistence after a real browser reload')
expect(computerUseContinuityRepairReceipt.refreshVerification?.finalTailExactSelectionSucceeded === true, 'reloaded editor must contain the exact final evidence-boundary sentence')
expect(computerUseContinuityRepairReceipt.refreshVerification?.finalReviewRestored === true, 'final independent review must restore after reload')
expect(computerUseContinuityRepairReceipt.refreshVerification?.restoredProtectedFindingCount === 1, 'reloaded final review must retain one protected finding')
expect(computerUseContinuityRepairReceipt.refreshVerification?.restoredRevisionCandidateCount === 0, 'reloaded final review must retain zero active revision candidates')
expect(computerUseContinuityRepairReceipt.refreshVerification?.selectedRecallCount === 2, 'reloaded Chapter 20 flow must retain exactly two author-selected recalls')
expect(computerUseContinuityRepairReceipt.refreshVerification?.chapter21Accessed === false, 'refresh verification must remain inside Chapter 20')
expect(computerUseContinuityRepairReceipt.claims?.allCandidateRepairsClean === true, 'continuity-repair run must retain zero active revision candidates in both local repairs')
expect(computerUseContinuityRepairReceipt.claims?.stableLiteraryQualityImprovementProven === false, 'continuity-repair run must not claim stable literary improvement')
expect(computerUseContinuityRepairReceipt.claims?.demoOnlyCapabilityClaimedComplete === false, 'continuity-repair run must not claim a demo-only capability complete')
for (const evidencePath of computerUseContinuityRepairReceipt.evidence ?? []) {
  expect(existsSync(resolve(root, evidencePath)), `continuity-repair evidence path does not exist: ${evidencePath}`)
}

const contextExportAudit = auditByName.get('Context Snapshot 导出完整性')
expect(contextExportAudit?.implementationStatus === 'implemented', 'Context export integrity must be an implemented local capability')
expect(contextExportAudit?.evidenceMaturity === 'real_local_runtime', 'Context export integrity must retain real Chrome runtime evidence')
expect(
  contextExportAudit?.effectConclusion === 'real_chrome_json_roundtrip_defect_reproduced_fixed_and_reexport_verified_no_quality_claim',
  'Context export integrity must disclose both the reproduced defect and bounded verification claim',
)
expect(computerUseContextExportReceipt.schemaVersion === 'creator-computer-use-context-export-integrity.v1', 'Context export-integrity receipt schema mismatch')
expect(computerUseContextExportReceipt.status === 'passed_after_real_roundtrip_defect_fix', 'Context export-integrity run must pass only after the real defect fix')
expect(computerUseContextExportReceipt.browser === 'Google Chrome', 'Context export-integrity run must identify Google Chrome')
expect(computerUseContextExportReceipt.interactionMode === 'computer_use', 'Context export-integrity actions must use Computer Use')
expect(computerUseContextExportReceipt.authBoundary === 'authenticated_creator_qa_fixture', 'Context export-integrity receipt must disclose the QA auth facade')
expect(computerUseContextExportReceipt.authorAction?.workingAgentBridgeUsed === true, 'Context export-integrity review must use the real Working Agent bridge')
expect(computerUseContextExportReceipt.authorAction?.workspaceExportClickedInProductUi === true, 'Context export-integrity evidence requires a real product export click')
expect(computerUseContextExportReceipt.inputRecovery?.typeTextResultWasCorrupted === true, 'Context export-integrity receipt must retain the real Chinese type_text failure')
expect(computerUseContextExportReceipt.inputRecovery?.corruptedTextSubmitted === false, 'corrupted Computer Use input must not be submitted')
expect(computerUseContextExportReceipt.firstExportNegativeFinding?.integrityPassed === false, 'first real export must retain the reproduced fingerprint failure')
expect(computerUseContextExportReceipt.firstExportNegativeFinding?.rootCause?.includes('undefined'), 'first real export must record the undefined serialization root cause')
expect(computerUseContextExportReceipt.verifiedExport?.activeContext?.integrityPassed === true, 'second real export must pass Context self-integrity')
expect(
  computerUseContextExportReceipt.verifiedExport?.activeContext?.storedContentFingerprint
    === computerUseContextExportReceipt.verifiedExport?.activeContext?.recomputedContentFingerprint,
  'second real export must retain the exact recomputed Context fingerprint',
)
expect(computerUseContextExportReceipt.verifiedExport?.activeReview?.contextBindingExact === true, 'review must bind the exported active Context exactly')
expect(computerUseContextExportReceipt.verifiedExport?.activeReview?.findingCount === 3, 'final real review must retain three locatable preserve findings')
expect(computerUseContextExportReceipt.verifiedExport?.activeReview?.findingSeverities?.every(severity => severity === 'preserve'), 'final real review must not invent an actionable finding')
expect(computerUseContextExportReceipt.verifiedExport?.activeReview?.allFindingsEvidenceLocated === true, 'final real review findings require locatable prose evidence')
expect(computerUseContextExportReceipt.verifiedExport?.activeReview?.compositeLiteraryScoreUsed === false, 'Context export-integrity review must not use a composite literary score')
expect(computerUseContextExportReceipt.verifiedExport?.chapter20Canon?.acceptedContentBlocksSha256 === '88bd2a6568bbccf2a56245166de25b10fe8a822208b1def111c730bad1a81615', 'Chapter 20 Canon hash must remain unchanged')
expect(computerUseContextExportReceipt.verifiedExport?.chapter20Draft?.changedByThisRun === false, 'Context export-integrity run must not change Chapter 20 prose')
expect(computerUseContextExportReceipt.chapterStopLine?.chapter21PreExistingEmptySessionShellPresent === true, 'receipt must disclose the pre-existing empty Chapter 21 session shell')
expect(computerUseContextExportReceipt.chapterStopLine?.chapter21PreExistingEmptyCanonShellPresent === true, 'receipt must disclose the pre-existing empty Chapter 21 Canon shell')
expect(computerUseContextExportReceipt.chapterStopLine?.chapter21ContentPresent === false, 'Chapter 21 must remain empty')
expect(computerUseContextExportReceipt.chapterStopLine?.chapter21AccessedOrChangedByThisRun === false, 'this run must not access or change Chapter 21')
for (const boundary of ['proseGenerated', 'proseEdited', 'candidateGenerated', 'candidateAdopted', 'canonPatchPrepared', 'canonChanged', 'cloudWritten', 'databaseWritten', 'paymentTouched', 'deployed', 'published']) {
  expect(computerUseContextExportReceipt.boundaries?.[boundary] === false, `Context export-integrity run crossed boundary ${boundary}`)
}
expect(computerUseContextExportReceipt.claims?.demoOnlyCapabilityClaimedComplete === false, 'Context export-integrity run must not claim a demo-only capability complete')
expect(computerUseContextExportReceipt.claims?.stableLiteraryQualityImprovementProven === false, 'Context export-integrity run must not claim stable literary improvement')
for (const evidencePath of computerUseContextExportReceipt.evidence ?? []) {
  expect(existsSync(resolve(root, evidencePath)), `Context export-integrity evidence path does not exist: ${evidencePath}`)
}

const automaticRagAudit = auditByName.get('自动 RAG')
expect(automaticRagAudit?.implementationStatus === 'contract_only', 'automatic RAG must remain contract_only')
expect(
  automaticRagAudit?.evidenceMaturity === 'real_corpus_measured_blocked',
  'automatic RAG must retain the failed real-corpus activation result',
)
expect(
  automaticRagAudit?.effectConclusion?.includes('failed_top3_and_latency_activation'),
  'automatic RAG must keep the chunk-level top-three and latency blockers explicit',
)
expect(
  automaticRagAudit?.effectConclusion?.includes('bge_base_repeat_stable_pool40_failed_context_and_latency'),
  'automatic RAG must retain the repeat-stable BGE base quality-path blockers',
)
expect(
  automaticRagAudit?.effectConclusion?.includes('pool20_passed_latency_but_failed_quality'),
  'automatic RAG must retain the fast-path quality regression',
)
expect(
  automaticRagAudit?.effectConclusion?.includes('pool24_passed_latency_but_failed_overall_and_context_quality'),
  'automatic RAG must preserve the pool-24 quality blockers',
)
expect(
  automaticRagAudit?.effectConclusion?.includes('pool28_passed_overall_but_failed_context_and_latency'),
  'automatic RAG must preserve the pool-28 context and latency blockers',
)
expect(
  automaticRagAudit?.effectConclusion?.includes('gte_onnx_rejected_runtime_incompatible'),
  'automatic RAG must preserve the GTE runtime incompatibility',
)
expect(
  automaticRagAudit?.effectConclusion?.includes('jina_rejected_noncommercial_license'),
  'automatic RAG must preserve the Jina noncommercial-license rejection',
)
expect(
  automaticRagAudit?.evidencePaths?.includes('scripts/check-creator-rag-bge-base-comparison.mjs'),
  'automatic RAG must include the BGE base tradeoff checker',
)
expect(
  automaticRagAudit?.evidencePaths?.includes('validation/creator-rag/community-reranker-compatibility-audit-2026-07-18.json'),
  'automatic RAG must include the community-candidate compatibility audit',
)
expect(
  automaticRagAudit?.evidencePaths?.includes('validation/creator-rag/full-manuscript-bge-small-zh-v1.5-comparison-2026-07-18.json'),
  'automatic RAG must retain the fast-but-below-quality BGE Chinese embedding comparison',
)
expect(
  automaticRagAudit?.effectConclusion?.includes('bge_small_zh_fast_but_failed_all_quality_targets_and_regressed_top3'),
  'automatic RAG must disclose the BGE Chinese embedding quality failure',
)

const miroFishAudit = auditByName.get('MiroFish 人物群像排练')
expect(miroFishAudit?.implementationStatus === 'conditional', 'MiroFish rehearsal must remain conditional')
expect(
  miroFishAudit?.evidenceMaturity === 'real_context_external_measured',
  'MiroFish rehearsal must retain real Chapter 20 context evidence without becoming unconditional',
)
expect(
  miroFishAudit?.effectConclusion === 'real_chapter20_rehearsal_and_product_card_selection_measured_no_literary_gain_proof',
  'MiroFish rehearsal must not claim proven literary improvement',
)
expect(
  miroFishAudit?.evidencePaths?.includes('validation/creator-writing/chapter-20-mirofish-character-rehearsal-2026-07-18.json'),
  'MiroFish rehearsal must retain the real Chapter 20 public receipt',
)
expect(
  miroFishAudit?.evidencePaths?.includes('validation/creator-writing/computer-use-chapter-20-mirofish-workflow-2026-07-18.json'),
  'MiroFish rehearsal must retain the real Chrome product-workflow receipt',
)
expect(chapter20MiroFishReceipt.chapter === 20, 'MiroFish rehearsal receipt must stay on Chapter 20')
expect(chapter20MiroFishReceipt.provider === 'mirofish', 'MiroFish rehearsal receipt must use the real external provider')
expect(chapter20MiroFishReceipt.request?.authorConfirmedExport === true, 'MiroFish export must remain author-confirmed')
expect(chapter20MiroFishReceipt.request?.manuscriptBodyIncluded === false, 'MiroFish must not receive manuscript prose')
expect(chapter20MiroFishReceipt.result?.allProposalEvidenceIsDirectInterview === true, 'MiroFish proposals require direct interview evidence')
expect(chapter20MiroFishReceipt.result?.characterCardProposalCount === 2, 'real MiroFish run must retain two character candidates')
expect(chapter20MiroFishReceipt.result?.settingAssetProposalCount === 2, 'real MiroFish run must retain two setting candidates')
expect(chapter20MiroFishReceipt.reviewBoundary?.resultReachedAuthorCandidateBoundary === true, 'MiroFish result must stop at author review')
for (const boundary of ['cardSavePerformed', 'settingSavePerformed', 'canonCommitPerformed']) {
  expect(chapter20MiroFishReceipt.reviewBoundary?.[boundary] === false, `MiroFish receipt crossed review boundary ${boundary}`)
}
for (const boundary of ['repositoryWritePerformed', 'acceptedChapterChanged', 'chapter21AccessedOrChanged', 'cloudDataChanged', 'publicationPerformed']) {
  expect(chapter20MiroFishReceipt.sideEffects?.[boundary] === false, `MiroFish receipt crossed side-effect boundary ${boundary}`)
}

expect(
  computerUseMiroFishWorkflowReceipt.schemaVersion === 'creator-computer-use-chapter-mirofish-workflow.v1',
  'MiroFish product-workflow receipt schema mismatch',
)
expect(
  computerUseMiroFishWorkflowReceipt.status === 'passed_with_fail_closed_local_repair',
  'MiroFish product-workflow receipt must retain the failed local-repair outcome',
)
expect(computerUseMiroFishWorkflowReceipt.source?.chapterNumber === 20, 'MiroFish product workflow must stop at Chapter 20')
expect(
  computerUseMiroFishWorkflowReceipt.recentContextPreflight?.emptyRecentSceneBlockedBeforeBridge === true,
  'empty long-form recent context must fail before the bridge',
)
expect(
  computerUseMiroFishWorkflowReceipt.recentContextPreflight?.modelRoleManifestCreated === false,
  'empty long-form recent context must not spend a model role call',
)
expect(computerUseMiroFishWorkflowReceipt.characterRehearsal?.provider === 'mirofish', 'product workflow must use MiroFish')
expect(computerUseMiroFishWorkflowReceipt.characterRehearsal?.savedCardCount === 1, 'product workflow must retain exactly one author-saved rehearsal card')
expect(computerUseMiroFishWorkflowReceipt.characterRehearsal?.otherCardsSaved === false, 'product workflow must not silently save other rehearsal cards')
expect(computerUseMiroFishWorkflowReceipt.manualRecall?.selectedCount === 3, 'product workflow must retain the three author-selected recall items')
expect(computerUseMiroFishWorkflowReceipt.independentReview?.realWorkingAgentUsed === true, 'product workflow must use the real Working Agent')
expect(computerUseMiroFishWorkflowReceipt.independentReview?.crossChapterMechanismRiskDetected === true, 'product workflow must detect the cross-chapter mechanism risk')
expect(computerUseMiroFishWorkflowReceipt.localRepair?.attemptCount === 2, 'product workflow must retain both local-repair attempts')
expect(computerUseMiroFishWorkflowReceipt.localRepair?.firstAttempt?.decision === 'reject', 'first local repair must remain rejected')
expect(computerUseMiroFishWorkflowReceipt.localRepair?.boundedRetry?.decision === 'reject', 'bounded local-repair retry must remain rejected')
expect(computerUseMiroFishWorkflowReceipt.localRepair?.boundedRetry?.verifiedPreservedFactCount === 8, 'bounded retry must retain all eight verified preserved facts')
expect(computerUseMiroFishWorkflowReceipt.localRepair?.candidateExposedForAdoption === false, 'rejected local repair must not reach the adoption surface')
for (const boundary of ['modelProseInserted', 'repairCandidateAdopted', 'acceptedManuscriptChanged', 'canonCommitInvoked', 'historicalStateConfirmed', 'chapter21Accessed', 'cloudWritten', 'databaseWritten', 'paymentTouched', 'deployed', 'published']) {
  expect(computerUseMiroFishWorkflowReceipt.boundaries?.[boundary] === false, `MiroFish product workflow crossed boundary ${boundary}`)
}
expect(computerUseMiroFishWorkflowReceipt.claims?.stableLiteraryQualityImprovementProven === false, 'single product workflow must not claim stable literary improvement')
expect(computerUseMiroFishWorkflowReceipt.claims?.professionalHumanBlindReviewCompleted === false, 'product workflow must not claim professional blind review')
for (const evidencePath of computerUseMiroFishWorkflowReceipt.evidence ?? []) {
  expect(existsSync(resolve(root, evidencePath)), `MiroFish product-workflow evidence path does not exist: ${evidencePath}`)
}

expect(audit.conclusion?.demoOnlyCapabilitiesClaimedComplete === 0, 'audit must not claim demo-only capabilities complete')
expect(audit.conclusion?.automaticRagEnabled === false, 'automatic RAG must remain disabled')
expect(audit.conclusion?.stableLiteraryQualityImprovementProven === false, 'stable literary quality improvement must remain unproven')
expect(audit.conclusion?.professionalHumanBlindReviewCompleted === false, 'professional human blind review must remain unproven')
expect(audit.conclusion?.chapter21OrLaterAccessed === false, 'Chapter 21 or later must remain outside this audit')

if (failures.length > 0) {
  console.error('[creator-writing-capability-evidence] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

const maturityCounts = Object.fromEntries(
  [...allowedMaturity].map(maturity => [maturity, auditRows.filter(row => row.evidenceMaturity === maturity).length]),
)
console.log('[creator-writing-capability-evidence] PASS')
console.log(JSON.stringify({ capabilityCount: auditRows.length, maturityCounts, conclusion: audit.conclusion }, null, 2))
