#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    evidence: {
      type: 'string',
      default: 'validation/creator-ui/frozen-paired-quality-real-trial-2026-07-16/summary.json',
    },
    'require-review-focus': { type: 'string' },
  },
  strict: true,
})
const path = values.evidence
const requiredReviewFocus = (values['require-review-focus'] || '')
  .split(',').map(item => item.trim()).filter(Boolean)
const text = await readFile(path, 'utf8')
const summary = JSON.parse(text)

assert.equal(summary.schemaVersion, 'creator-frozen-paired-quality-real-trial.v1')
assert.equal(summary.fixture.source, 'frozen_original_single_scene')
assert.equal(summary.fixture.realWorkingAgent, true)
assert.equal(summary.fixture.realChapterMaterialUsed, false)
assert.equal(summary.fixture.authorDirectionPreselected, true)
for (const requiredTrue of [
  'sameLockedIntent',
  'sameContextSnapshot',
  'sameManualRecall',
  'sameSelectedDirection',
  'sameTargetLength',
  'sameWorkingAgentBridge',
  'generationOrderRandomized',
  'candidateLabelsRandomized',
]) assert.equal(summary.fairness[requiredTrue], true)
assert.equal(summary.fairness.evaluatorSawGenerationPath, false)
assert.equal(summary.fairness.verifierSawGenerationPath, false)
assert.equal(summary.fairness.compositeLiteraryScoreUsed, false)
for (const candidate of Object.values(summary.candidates)) {
  assert.ok(candidate.visibleLength >= 2700 && candidate.visibleLength <= 3400)
  assert.equal(candidate.completeEnding, true)
  assert.match(candidate.manuscriptSha256, /^[a-f0-9]{64}$/u)
}
assert.equal(summary.candidates.architectWriterWorkflow.directionReceiptPresent, true)
if (summary.candidates.architectWriterWorkflow.refinement) {
  const refinement = summary.candidates.architectWriterWorkflow.refinement
  assert.equal(refinement.literaryReviewCompleted, true)
  const efficacyRetryLimit = Object.hasOwn(refinement, 'efficacyGuidedRetryLimitPerCycle')
    ? refinement.efficacyGuidedRetryLimitPerCycle
    : 0
  assert.ok(refinement.literaryReviewCount >= 1 && refinement.literaryReviewCount <= 4 + refinement.localRepairCycleLimit * efficacyRetryLimit)
  if (Object.hasOwn(refinement, 'literaryFindingVerificationCount')) {
    assert.ok(Number.isInteger(refinement.literaryFindingVerificationCount))
    assert.ok(refinement.literaryFindingVerificationCount >= 0)
    assert.ok(refinement.literaryFindingVerificationCount <= refinement.literaryReviewCount)
    assert.ok(Number.isInteger(refinement.verifiedModelFindingCount))
    assert.ok(refinement.verifiedModelFindingCount >= 0)
    assert.ok(Number.isInteger(refinement.rejectedModelFindingCount))
    assert.ok(refinement.rejectedModelFindingCount >= 0)
    assert.ok(summary.runtime.roleOperations.filter(item => (
      item.operation === 'literary_review_verification'
    )).length >= refinement.literaryFindingVerificationCount)
  }
  assert.equal(refinement.localRepairCycleLimit, 2)
  assert.ok(refinement.localRepairCycles.length <= 2)
  if (Object.hasOwn(refinement, 'efficacyGuidedRetryLimitPerCycle')) {
    assert.equal(refinement.efficacyGuidedRetryLimitPerCycle, 1)
    assert.ok(Number.isInteger(refinement.efficacyGuidedRetryCount))
    assert.equal(
      refinement.efficacyGuidedRetryCount,
      refinement.localRepairCycles.filter(item => item.efficacyGuidedRetryPerformed).length,
    )
    assert.ok(refinement.efficacyGuidedRetryCount <= refinement.localRepairCycles.length)
    const retryDecisions = new Set([
      'not_run',
      'failed_closed',
      'rejected_by_auditor',
      'discarded_outside_length_or_ending_contract',
      'target_dimension_persisted',
      'passed_to_direction_review',
    ])
    for (const cycle of refinement.localRepairCycles) {
      assert.ok([1, 2, 3].includes(cycle.reviserAttempts))
      assert.equal(typeof cycle.efficacyGuidedRetryPerformed, 'boolean')
      assert.ok(retryDecisions.has(cycle.efficacyGuidedRetryDecision))
      if (!cycle.efficacyGuidedRetryPerformed) {
        assert.equal(cycle.efficacyGuidedRetryDecision, 'not_run')
        assert.ok(cycle.reviserAttempts <= 2)
      } else {
        assert.notEqual(cycle.efficacyGuidedRetryDecision, 'not_run')
        assert.ok(cycle.reviserAttempts >= 2)
      }
      if (cycle.efficacyGuidedRetryDecision === 'passed_to_direction_review') {
        assert.equal(cycle.postRepairTargetDimensionFindingCount, 0)
      }
    }
    const expectedReviserCalls = refinement.localRepairCycles.reduce((sum, cycle) => sum + cycle.reviserAttempts, 0)
    assert.ok(summary.runtime.roleOperations.filter(item => item.operation === 'local_repair').length >= expectedReviserCalls)
    assert.ok(summary.runtime.roleOperations.filter(item => item.operation === 'local_repair_review').length >= refinement.localRepairCycles.length)
  }
  assert.equal(refinement.appliedRepairCount, refinement.localRepairCycles.filter(item => item.applied).length)
  assert.equal(refinement.wholeTextRewritePerformed, false)
  assert.equal(refinement.authorTextOverwritten, false)
  if (Object.hasOwn(refinement, 'postRepairEfficacyReviewCount')) {
    assert.ok(Number.isInteger(refinement.postRepairEfficacyReviewCount))
    assert.ok(refinement.postRepairEfficacyReviewCount >= 0)
    assert.ok(refinement.postRepairEfficacyReviewCount <= refinement.localRepairCycles.length * (1 + efficacyRetryLimit))
    for (const cycle of refinement.localRepairCycles) {
      assert.equal(typeof cycle.postRepairLiteraryReviewPerformed, 'boolean')
      assert.ok(Number.isInteger(cycle.postRepairTargetDimensionFindingCount))
      assert.ok(cycle.postRepairTargetDimensionFindingCount >= 0)
      if (cycle.applied) {
        assert.equal(cycle.disposition, 'applied')
        assert.equal(cycle.postRepairLiteraryReviewPerformed, true)
        assert.equal(cycle.postRepairTargetDimensionFindingCount, 0)
      }
      if (cycle.disposition === 'reverted_target_dimension_persisted') {
        assert.equal(cycle.applied, false)
        assert.equal(cycle.postRepairLiteraryReviewPerformed, true)
        assert.ok(cycle.postRepairTargetDimensionFindingCount > 0)
      }
    }
  }
  if (Object.hasOwn(refinement, 'postRepairDirectionReviewCount')) {
    assert.ok(Number.isInteger(refinement.postRepairDirectionReviewCount))
    assert.ok(refinement.postRepairDirectionReviewCount >= 0)
    assert.ok(refinement.postRepairDirectionReviewCount <= refinement.postRepairEfficacyReviewCount)
    for (const cycle of refinement.localRepairCycles) {
      assert.equal(typeof cycle.postRepairDirectionReviewPerformed, 'boolean')
      assert.ok(['pass', 'reject', 'not_run'].includes(cycle.postRepairDirectionReviewDecision))
      if (cycle.applied) {
        assert.equal(cycle.postRepairDirectionReviewPerformed, true)
        assert.equal(cycle.postRepairDirectionReviewDecision, 'pass')
      }
      if (cycle.disposition === 'reverted_author_direction_not_retained') {
        assert.equal(cycle.applied, false)
        assert.equal(cycle.postRepairDirectionReviewPerformed, true)
        assert.equal(cycle.postRepairDirectionReviewDecision, 'reject')
      }
      if (cycle.disposition === 'post_repair_direction_review_failed_closed') {
        assert.equal(cycle.applied, false)
        assert.equal(cycle.postRepairDirectionReviewPerformed, false)
        assert.equal(cycle.postRepairDirectionReviewDecision, 'not_run')
      }
    }
    if (refinement.appliedRepairCount > 0) {
      assert.equal(summary.candidates.architectWriterWorkflow.finalDirectionReceiptRetained, true)
    }
    assert.ok(summary.runtime.roleOperations.filter(item => (
      item.operation === 'scene_author_direction_draft_review'
    )).length >= refinement.postRepairDirectionReviewCount + 1)
  }
  if (requiredReviewFocus.length > 0) {
    assert.equal(refinement.reviewFocusSource, 'human_specified')
    assert.deepEqual(refinement.requestedFocusDimensions, requiredReviewFocus)
    assert.equal(refinement.automaticFocusSelectionPerformed, false)
    assert.deepEqual(refinement.focusFindingCounts.map(item => item.dimension), requiredReviewFocus)
    assert.ok(refinement.focusFindingCounts.every(item => (
      Number.isInteger(item.findingCountAcrossReviewPasses)
      && item.findingCountAcrossReviewPasses >= 0
    )))
    assert.equal(summary.fairness.literaryReviewFocusSource, 'human_specified')
    assert.equal(summary.fairness.automaticReviewFocusSelectionPerformed, false)
  }
} else if (requiredReviewFocus.length > 0) {
  assert.fail('Focused literary-review evidence must include a refinement receipt.')
}
assert.equal(summary.evaluation.dimensions.length, 11)
assert.equal(new Set(summary.evaluation.dimensions.map(item => item.dimension)).size, 11)
const allowedReasonCodes = new Set([
  'canon_alignment_weaker',
  'causal_escalation_weaker',
  'information_released_too_early',
  'inference_outpaces_evidence',
  'choice_pre_scripted',
  'choice_consequence_weaker',
  'voice_flattened',
  'mechanism_familiar',
  'language_repetitive',
  'genre_action_underrealized',
  'exposition_overloaded',
  'embodied_detail_weaker',
  'pacing_overcompressed',
  'pacing_overextended',
  'beat_structure_mechanical',
  'ending_pressure_weaker',
  'balanced_tradeoff',
  'no_material_difference',
])
for (const item of summary.evaluation.dimensions) {
  assert.ok(allowedReasonCodes.has(item.reasonCode))
  if (item.verificationDecision === 'verify') {
    assert.equal(item.confirmedReasonCode, item.reasonCode)
    assert.notEqual(item.confirmedPreference, null)
  } else {
    assert.equal(item.verificationDecision, 'reject')
    assert.equal(item.confirmedPreference, null)
    assert.equal(item.confirmedReasonCode, null)
  }
  if (item.confirmedPreference === 'tie') {
    assert.ok(['balanced_tradeoff', 'no_material_difference'].includes(item.confirmedReasonCode))
  } else if (item.confirmedPreference !== null) {
    assert.ok(!['balanced_tradeoff', 'no_material_difference'].includes(item.confirmedReasonCode))
  } else {
    assert.ok(allowedReasonCodes.has(item.reasonCode), 'Rejected dimensions may retain only the unverified first-pass code.')
  }
}
assert.equal(summary.evaluation.independentVerificationCompleted, true)
assert.equal(summary.evaluation.hardConstraints.length, 2)
const hardReasonCodesByViolation = {
  none: new Set(['no_violation']),
  continuity: new Set(['required_causal_consequence_omitted', 'canon_fact_contradicted']),
  character_knowledge: new Set(['character_knows_forbidden_fact']),
  timeline: new Set(['timeline_location_contradicted']),
  hard_constraint: new Set(['explicit_hard_constraint_broken']),
  must_not_resolve: new Set(['forbidden_resolution_revealed']),
}
for (const item of summary.evaluation.hardConstraints) {
  assert.ok(hardReasonCodesByViolation[item.violationType]?.has(item.reasonCode))
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
}
assert.equal(summary.evaluation.overallWinnerDeclared, false)
assert.equal(summary.evaluation.compositeLiteraryScoreUsed, false)
for (const operation of [
  'direct_scene_draft',
  'scene_architecture',
  'scene_draft',
  'paired_literary_comparison',
  'paired_literary_comparison_verification',
]) assert.ok(summary.runtime.roleOperations.some(item => item.operation === operation))
assert.ok(summary.runtime.roleOperations.every(item => item.canonCommitAllowed === false))
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
  temporaryArtifactsDeletedAfterSummary: true,
})
for (const forbidden of ['潮汐矿港', '陆沉舟', '黎芜', '密封匣', '候选 A 正文']) {
  assert.equal(text.includes(forbidden), false, `Repository summary leaked private fixture or manuscript text: ${forbidden}`)
}
for (const forbiddenField of ['"diagnosis"', '"rationale"', '"candidateAEvidenceBlockIds"', '"candidateBEvidenceBlockIds"']) {
  assert.equal(text.includes(forbiddenField), false, `Repository summary retained private comparison detail: ${forbiddenField}`)
}

console.log('Creator frozen paired quality real-trial evidence passed.')
