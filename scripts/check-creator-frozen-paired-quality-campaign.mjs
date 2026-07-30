#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    evidence: {
      type: 'string',
      default: 'validation/creator-ui/frozen-paired-quality-multi-seed-real-campaign-2026-07-16/summary.json',
    },
    'fixture-set': { type: 'string', default: 'core' },
    'require-refinement-fixtures': { type: 'string' },
    'require-review-focus': { type: 'string' },
    'require-focus-fixtures': { type: 'string' },
  },
  strict: true,
})
if (!['core', 'extended'].includes(values['fixture-set'])) {
  throw new Error('--fixture-set must be core or extended.')
}
const evidencePath = values.evidence
const requiredRefinementFixtures = new Set(
  (values['require-refinement-fixtures'] || '').split(',').map(item => item.trim()).filter(Boolean),
)
const requiredReviewFocus = (values['require-review-focus'] || '')
  .split(',').map(item => item.trim()).filter(Boolean)
const requiredFocusFixtures = new Set(
  (values['require-focus-fixtures'] || '').split(',').map(item => item.trim()).filter(Boolean),
)
const text = await readFile(evidencePath, 'utf8')
const summary = JSON.parse(text)
const coreFixtures = [
  'frozen-original-paired-quality-v1',
  'frozen-original-bridge-withdrawal-v1',
  'frozen-original-bell-infiltration-v1',
]
const expectedFixtures = values['fixture-set'] === 'extended'
  ? [
      ...coreFixtures,
      'frozen-original-glass-lung-endurance-v1',
      'frozen-original-archive-tribunal-refusal-v1',
      'frozen-original-floodgate-sacrifice-v1',
    ]
  : coreFixtures
const expectedDimensions = [
  'continuity',
  'tension',
  'information_control',
  'character_agency',
  'voice',
  'freshness',
  'genre_fulfillment',
  'repetition',
  'exposition',
  'scene_detail',
  'pacing',
]
const childBoundaries = {
  repositoryWritePerformed: false,
  candidateAdopted: false,
  canonChanged: false,
  chapter20AccessedOrChanged: false,
  chapter21AccessedOrChanged: false,
  cloudDataChanged: false,
  publicationPerformed: false,
  rawDraftPersistedInRepository: false,
  rawBlindMappingPersistedInRepository: false,
  temporaryArtifactsDeletedAfterSummary: true,
}
const forbiddenPrivateText = [
  '陆沉舟',
  '黎芜',
  '沈砚',
  '薇拉',
  '岑野',
  '阿葵',
  '密封匣',
  '熔雨',
  '空钟',
  '许照',
  '闻澜',
  '季衡',
  '洛鸦',
  '唐葵',
  '何藻',
  '玻璃肺',
  '档案庭',
  '描图镜',
]
const forbiddenReviewDetails = [
  '"diagnosis"',
  '"rationale"',
  '"candidateAEvidenceBlockIds"',
  '"candidateBEvidenceBlockIds"',
  '"evidenceBlockIds"',
]
const observedWorkflowWeaknessEntries = []
const confirmedWorkflowHardFailureEntries = []

function collectSignals(entries) {
  const signals = new Map()
  for (const entry of entries) {
    const current = signals.get(entry.reasonCode) || { fixtureIds: new Set(), occurrenceCount: 0 }
    current.fixtureIds.add(entry.fixtureId)
    current.occurrenceCount += 1
    signals.set(entry.reasonCode, current)
  }
  return [...signals.entries()]
    .map(([reasonCode, signal]) => ({
      reasonCode,
      fixtureIds: [...signal.fixtureIds].sort(),
      occurrenceCount: signal.occurrenceCount,
    }))
    .sort((left, right) => left.reasonCode.localeCompare(right.reasonCode))
}

assert.equal(summary.schemaVersion, 'creator-frozen-paired-quality-campaign.v1')
assert.equal(summary.trialCount, expectedFixtures.length)
assert.deepEqual(summary.fixtureIds, expectedFixtures)
assert.equal(new Set(summary.inputSha256s).size, expectedFixtures.length)
assert.equal(summary.trials.length, expectedFixtures.length)
for (const fixtureId of requiredRefinementFixtures) {
  assert.ok(expectedFixtures.includes(fixtureId), `Unknown required refinement fixture: ${fixtureId}`)
}
for (const fixtureId of requiredFocusFixtures) {
  assert.ok(expectedFixtures.includes(fixtureId), `Unknown required review-focus fixture: ${fixtureId}`)
  assert.ok(requiredRefinementFixtures.has(fixtureId), `Focused fixture must also require refinement: ${fixtureId}`)
}
for (const [index, trial] of summary.trials.entries()) {
  assert.ok(expectedFixtures.includes(trial.fixtureId))
  assert.equal(trial.inputSha256, summary.inputSha256s[index])
  assert.match(trial.inputSha256, /^[a-f0-9]{64}$/u)
  assert.match(trial.evidencePath, /^validation\/creator-ui\/frozen-paired-quality-[^/]+\/trials\/.+\.json$/u)
  assert.ok(trial.directWriterLength >= 2700 && trial.directWriterLength <= 3400)
  assert.ok(trial.architectWriterWorkflowLength >= 2700 && trial.architectWriterWorkflowLength <= 3400)
  assert.equal(trial.directionReceiptPresent, true)
  assert.equal(trial.confirmedDimensions.length, expectedDimensions.length)
  assert.deepEqual(trial.confirmedDimensions.map(item => item.dimension), expectedDimensions)
  assert.equal(trial.hardConstraints.length, 2)
  assert.ok(trial.realWorkingAgentCallCount >= 7)

  const childPath = path.resolve(trial.evidencePath)
  assert.ok(childPath.startsWith(`${path.resolve('validation/creator-ui')}${path.sep}`))
  const childText = await readFile(childPath, 'utf8')
  const child = JSON.parse(childText)
  assert.equal(child.schemaVersion, 'creator-frozen-paired-quality-real-trial.v1')
  assert.equal(child.fixture.id, trial.fixtureId)
  assert.equal(child.fixture.inputSha256, trial.inputSha256)
  assert.equal(child.fixture.source, 'frozen_original_single_scene')
  assert.equal(child.fixture.realWorkingAgent, true)
  assert.equal(child.fixture.realChapterMaterialUsed, false)
  assert.equal(child.fixture.authorDirectionPreselected, true)
  for (const requiredTrue of [
    'sameLockedIntent',
    'sameContextSnapshot',
    'sameManualRecall',
    'sameSelectedDirection',
    'sameTargetLength',
    'sameWorkingAgentBridge',
    'generationOrderRandomized',
    'candidateLabelsRandomized',
  ]) assert.equal(child.fairness[requiredTrue], true)
  assert.equal(child.fairness.evaluatorSawGenerationPath, false)
  assert.equal(child.fairness.verifierSawGenerationPath, false)
  assert.equal(child.fairness.compositeLiteraryScoreUsed, false)
  for (const candidate of Object.values(child.candidates)) {
    assert.ok(candidate.visibleLength >= 2700 && candidate.visibleLength <= 3400)
    assert.equal(candidate.completeEnding, true)
    assert.match(candidate.manuscriptSha256, /^[a-f0-9]{64}$/u)
  }
  assert.equal(child.candidates.architectWriterWorkflow.directionReceiptPresent, true)
  if (requiredRefinementFixtures.has(trial.fixtureId)) {
    const refinement = child.candidates.architectWriterWorkflow.refinement
    assert.ok(refinement, `Missing workflow refinement receipt for ${trial.fixtureId}`)
    assert.equal(refinement.literaryReviewCompleted, true)
    assert.ok(refinement.literaryReviewCount >= 1 && refinement.literaryReviewCount <= 2)
    assert.equal(refinement.localRepairCycleLimit, 2)
    assert.ok(refinement.localRepairCycles.length <= 2)
    assert.equal(
      refinement.appliedRepairCount,
      refinement.localRepairCycles.filter(item => item.applied).length,
    )
    assert.equal(refinement.wholeTextRewritePerformed, false)
    assert.equal(refinement.authorTextOverwritten, false)
    if (requiredFocusFixtures.has(trial.fixtureId)) {
      assert.equal(refinement.reviewFocusSource, 'human_specified')
      assert.deepEqual(refinement.requestedFocusDimensions, requiredReviewFocus)
      assert.equal(refinement.automaticFocusSelectionPerformed, false)
      assert.deepEqual(
        refinement.focusFindingCounts.map(item => item.dimension),
        requiredReviewFocus,
      )
      assert.ok(refinement.focusFindingCounts.every(item => (
        Number.isInteger(item.findingCountAcrossReviewPasses)
        && item.findingCountAcrossReviewPasses >= 0
      )))
      assert.equal(child.fairness.literaryReviewFocusSource, 'human_specified')
      assert.equal(child.fairness.automaticReviewFocusSelectionPerformed, false)
    }
    assert.deepEqual(trial.workflowRefinement, refinement)
    assert.ok(child.runtime.roleOperations.some(item => item.operation === 'literary_review'))
    if (refinement.localRepairCycles.length > 0) {
      assert.ok(child.runtime.roleOperations.some(item => item.operation === 'local_repair'))
      assert.ok(child.runtime.roleOperations.some(item => item.operation === 'local_repair_review'))
    }
  }
  assert.deepEqual(child.evaluation.dimensions.map(item => item.dimension), expectedDimensions)
  for (const item of child.evaluation.dimensions) {
    if (item.verificationDecision === 'verify') {
      assert.notEqual(item.confirmedPreference, null)
      assert.equal(item.confirmedReasonCode, item.reasonCode)
    } else {
      assert.equal(item.verificationDecision, 'reject')
      assert.equal(item.confirmedPreference, null)
      assert.equal(item.confirmedReasonCode, null)
    }
    if (
      item.verificationDecision === 'verify'
      && item.confirmedPreference === 'direct_writer'
      && item.confirmedReasonCode
    ) {
      observedWorkflowWeaknessEntries.push({
        fixtureId: trial.fixtureId,
        reasonCode: item.confirmedReasonCode,
      })
    }
  }
  assert.equal(child.evaluation.hardConstraints.length, 2)
  for (const item of child.evaluation.hardConstraints) {
    if (item.verificationDecision === 'verify') {
      assert.equal(item.confirmedStatus, item.firstPassStatus)
      assert.equal(item.confirmedViolationType, item.violationType)
      assert.equal(item.confirmedReasonCode, item.reasonCode)
    } else {
      assert.equal(item.verificationDecision, 'reject')
      assert.equal(item.confirmedStatus, null)
      assert.equal(item.confirmedViolationType, null)
      assert.equal(item.confirmedReasonCode, null)
    }
    if (
      item.path === 'architect_writer_workflow'
      && item.verificationDecision === 'verify'
      && item.confirmedStatus === 'fail'
      && item.confirmedReasonCode
    ) {
      confirmedWorkflowHardFailureEntries.push({
        fixtureId: trial.fixtureId,
        reasonCode: item.confirmedReasonCode,
      })
    }
  }
  assert.equal(child.evaluation.overallWinnerDeclared, false)
  assert.equal(child.evaluation.compositeLiteraryScoreUsed, false)
  assert.deepEqual(child.boundaries, childBoundaries)
  for (const forbidden of [...forbiddenPrivateText, ...forbiddenReviewDetails]) {
    assert.equal(childText.includes(forbidden), false, `Child trial leaked private prose or review detail: ${forbidden}`)
  }
}
const observedWorkflowWeaknesses = collectSignals(observedWorkflowWeaknessEntries)
const repeatedWorkflowWeaknesses = observedWorkflowWeaknesses.filter(signal => signal.fixtureIds.length >= 2)
const confirmedWorkflowHardFailures = collectSignals(confirmedWorkflowHardFailureEntries)
assert.deepEqual(summary.aggregate.qualityTuningDecision, {
  schemaVersion: 'creator-paired-quality-tuning-decision.v1',
  policy: {
    minimumDistinctFixturesForLiteraryWeakness: 2,
    confirmedWorkflowHardFailureRequiresImmediateReview: true,
    automaticPromptMutationAllowed: false,
  },
  observedWorkflowWeaknesses,
  repeatedWorkflowWeaknesses,
  confirmedWorkflowHardFailures,
  decision: confirmedWorkflowHardFailures.length > 0 || repeatedWorkflowWeaknesses.length > 0
    ? 'review_workflow_change'
    : 'hold_current_workflow',
  rationaleCode: confirmedWorkflowHardFailures.length > 0
    ? 'confirmed_workflow_hard_failure'
    : repeatedWorkflowWeaknesses.length > 0
      ? 'repeated_workflow_weakness'
      : 'no_repeated_workflow_weakness',
})
assert.equal(summary.aggregate.qualityTuningDecision.policy.automaticPromptMutationAllowed, false)
for (const dimension of expectedDimensions) {
  const outcome = summary.aggregate.dimensionOutcomes[dimension]
  assert.ok(outcome)
  assert.equal(
    outcome.architectWriterWorkflow + outcome.directWriter + outcome.tie + outcome.rejected,
    expectedFixtures.length,
  )
}
for (const path of ['direct_writer', 'architect_writer_workflow']) {
  const outcome = summary.aggregate.hardConstraintOutcomes[path]
  assert.equal(outcome.pass + outcome.fail + outcome.rejected, expectedFixtures.length)
}
assert.equal(summary.aggregate.overallWinnerDeclared, false)
assert.equal(summary.aggregate.compositeLiteraryScoreUsed, false)
assert.deepEqual(summary.boundaries, {
  repositoryWritePerformed: false,
  candidateAdopted: false,
  canonChanged: false,
  chapter20AccessedOrChanged: false,
  chapter21AccessedOrChanged: false,
  cloudDataChanged: false,
  publicationPerformed: false,
  rawDraftPersistedInRepository: false,
  rawBlindMappingPersistedInRepository: false,
})
for (const forbidden of [...forbiddenPrivateText, ...forbiddenReviewDetails]) {
  assert.equal(text.includes(forbidden), false, `Campaign summary leaked private prose or review detail: ${forbidden}`)
}

console.log('Creator frozen paired-quality multi-seed campaign evidence passed.')
