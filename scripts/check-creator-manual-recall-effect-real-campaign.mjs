import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const campaignPath = path.join(
  root,
  'validation/creator-ui/manual-recall-effect-real-campaign-2026-07-18/summary.json',
)
const runnerPath = path.join(root, 'scripts/run-creator-manual-recall-effect-trial.mts')
const campaign = JSON.parse(await readFile(campaignPath, 'utf8'))
const runnerSource = await readFile(runnerPath, 'utf8')
const sha256 = value => createHash('sha256').update(value).digest('hex')

assert.equal(campaign.schemaVersion, 'creator-manual-recall-effect-real-campaign.v1')
assert.equal(campaign.status, 'real_three_pair_campaign_measured_no_stability_claim')
assert.equal(campaign.method.pairCount, 3)
assert.equal(campaign.method.distinctScenarioCount, 3)
assert.equal(campaign.method.distinctFixtureCount, 3)
assert.equal(campaign.method.randomizedGenerationOrderPerPair, true)
assert.equal(campaign.method.randomizedBlindLabelsPerPair, true)
assert.equal(campaign.method.independentVerificationPerPair, true)
assert.equal(campaign.method.fullProductReviewPairCount, 1)
assert.equal(campaign.method.sameAuthoredDifferencePerPair, 'manualRecallItems')
assert.equal(campaign.method.automaticRetrievalUsed, false)
assert.equal(campaign.method.compositeLiteraryScoreUsed, false)
assert.equal(campaign.method.overallWinnerDeclared, false)
assert.equal(campaign.aggregate.stableLiteraryQualityImprovementProven, false)
assert.equal(campaign.trials.length, 3)

for (const field of ['trialId', 'fixtureId', 'scenarioId', 'inputSha256']) {
  assert.equal(new Set(campaign.trials.map(trial => trial[field])).size, 3, `${field} must be unique per pair.`)
}
assert.ok(new Set(campaign.trials.map(trial => trial.privateMappingSha256)).size >= 1)
const manuscriptHashes = campaign.trials.flatMap(trial => Object.values(trial.manuscriptHashes))
assert.equal(new Set(manuscriptHashes).size, 6)
for (const trial of campaign.trials) {
  const receipt = JSON.parse(await readFile(path.join(root, trial.receiptPath), 'utf8'))
  assert.equal(trial.receiptSha256, sha256(JSON.stringify(receipt)))
  assert.equal(receipt.schemaVersion, 'creator-manual-recall-effect-real-trial.v1')
  assert.equal(receipt.status, 'real_single_pair_measured_no_stability_claim')
  assert.equal(receipt.fixture.id, trial.fixtureId)
  assert.equal(receipt.fixture.scenarioId ?? 'glass-lung', trial.scenarioId)
  assert.equal(receipt.fixture.realWorkingAgent, true)
  assert.equal(receipt.fixture.realChapterMaterialUsed, false)
  assert.equal(receipt.fixture.recallSourcesAbsentFromBaselineContext, true)
  assert.equal(receipt.fixture.recallSourceCount, 4)
  assert.deepEqual(receipt.fixture.recallGroups, ['causal', 'character_knowledge', 'timeline', 'promise'])
  assert.equal(receipt.fairness.onlyAuthoredContextDifference, 'manualRecallItems')
  assert.equal(receipt.fairness.evaluatorSawArmIdentity, false)
  assert.equal(receipt.fairness.verifierSawArmIdentity, false)
  assert.equal(receipt.fairness.compositeLiteraryScoreUsed, false)
  assert.equal(receipt.blindLiteraryComparison.independentVerificationCompleted, true)
  assert.equal(receipt.blindLiteraryComparison.overallWinnerDeclared, false)
  assert.equal(receipt.blindLiteraryComparison.compositeLiteraryScoreUsed, false)
  assert.equal(receipt.runtime.roleOperations.every(operation => (
    operation.status === 'succeeded'
    && operation.privateDataBoundary === 'local_ephemeral'
    && operation.canonCommitAllowed === false
  )), true)
  for (const operation of [
    'scene_architecture',
    'scene_draft',
    'manual_recall_adherence_review',
    'paired_literary_comparison',
    'paired_literary_comparison_verification',
  ]) assert.ok(receipt.runtime.roleOperations.some(item => item.operation === operation))
  if (trial.fullProductReview) {
    assert.deepEqual(trial.fullProductReview.focusDimensions, ['repetition', 'exposition'])
    assert.equal(trial.fullProductReview.candidateAdoptionAttempted, false)
    assert.equal(trial.fullProductReview.manualRecallSelected.manualRecallAdherenceDecision, 'pass')
    for (const review of [
      trial.fullProductReview.manualRecallSelected,
      trial.fullProductReview.manualRecallAbsent,
    ]) {
      assert.match(review.reviewSha256, /^[a-f0-9]{64}$/u)
      assert.deepEqual(review.requestedFocusDimensions, ['repetition', 'exposition'])
      assert.equal(review.activeFindings.every(finding => finding.evidenceLocatable), true)
      assert.equal(review.actionableFindingVerificationCompleted, true)
    }
    const contractFailureCodes = new Set([
      'intent_not_locked',
      'intent_revision_mismatch',
      'draft_revision_mismatch',
      'context_not_current',
      'review_not_current',
      'direction_receipt_missing',
      'direction_receipt_axis_mismatch',
      'direction_receipt_evidence_invalid',
      'direction_adjustment_evidence_invalid',
      'manual_recall_receipt_missing',
      'manual_recall_receipt_mismatch',
      'manual_recall_receipt_evidence_invalid',
    ])
    for (const [review, gate] of [
      [
        trial.fullProductReview.manualRecallSelected,
        trial.fullProductReview.candidateQualityGate.manualRecallSelected,
      ],
      [
        trial.fullProductReview.manualRecallAbsent,
        trial.fullProductReview.candidateQualityGate.manualRecallAbsent,
      ],
    ]) {
      const expectedHardBlockCount = review.activeFindings.filter(finding => (
        finding.severity === 'hard_block'
      )).length
      const expectedRevisionCandidateCount = review.activeFindings.filter(finding => (
        finding.severity === 'revision_candidate'
      )).length
      assert.ok(expectedHardBlockCount + expectedRevisionCandidateCount > 0)
      assert.equal(gate.allowed, false)
      assert.equal(
        gate.blockers.find(blocker => blocker.code === 'active_hard_block')?.count ?? 0,
        expectedHardBlockCount,
      )
      assert.equal(
        gate.blockers.find(blocker => blocker.code === 'active_revision_candidate')?.count ?? 0,
        expectedRevisionCandidateCount,
      )
      assert.equal(gate.blockers.some(blocker => contractFailureCodes.has(blocker.code)), false)
    }
    assert.equal(receipt.runtime.roleOperations.filter(item => item.operation === 'literary_review').length, 2)
  }
  assert.equal(receipt.boundaries.chapter20AccessedOrChanged, false)
  assert.equal(receipt.boundaries.chapter21AccessedOrChanged, false)
  assert.equal(receipt.boundaries.candidateAdopted, false)
  assert.equal(receipt.boundaries.canonChanged, false)
  assert.equal(receipt.boundaries.cloudDataChanged, false)
  assert.equal(receipt.boundaries.publicationPerformed, false)
  assert.equal(receipt.boundaries.rawDraftPersistedInRepository, false)
  assert.match(trial.receiptSha256, /^[a-f0-9]{64}$/u)
  assert.match(trial.inputSha256, /^[a-f0-9]{64}$/u)
  assert.match(trial.privateMappingSha256, /^[a-f0-9]{64}$/u)
  assert.equal(trial.generationOrder.length, 2)
  assert.deepEqual(new Set(trial.generationOrder), new Set(['manual_recall_selected', 'manual_recall_absent']))
  assert.ok(trial.realWorkingAgentCallCount >= 8)
  assert.ok(['selected_memory_better', 'absent_memory_better', 'no_difference'].includes(trial.adherence.direction))
}
assert.equal(campaign.aggregate.totalRealWorkingAgentCalls >= 24, true)
assert.deepEqual(campaign.boundaries, {
  repositoryWritePerformed: false,
  candidateAdopted: false,
  canonChanged: false,
  chapter20AccessedOrChanged: false,
  chapter21AccessedOrChanged: false,
  cloudDataChanged: false,
  publicationPerformed: false,
  rawDraftPersistedInRepository: false,
})
assert.equal(campaign.conclusionBoundary.some(item => item.includes('negative or mixed') || item.includes('Negative or mixed')), true)

assert.match(runnerSource, /const generationOrder:[\s\S]+randomBytes\(1\)/u)
assert.match(runnerSource, /const mapping:[\s\S]+randomBytes\(1\)/u)
assert.match(runnerSource, /const baselineContext = compileContextSnapshot\([\s\S]+source: contextSource\(\[\]\)/u)
assert.match(runnerSource, /serializedBaseline[\s\S]+includes\(recall\.sourceId\)[\s\S]+includes\(recall\.statement\)/u)

const serialized = JSON.stringify(campaign)
assert.equal(serialized.includes('evidenceQuotes'), false)
assert.equal(serialized.includes('rawDraftText'), false)
assert.equal(serialized.includes('contentBlocks'), false)
assert.equal(serialized.includes('overallWinner'), true)

console.log('[creator-manual-recall-effect-real-campaign] PASS')
console.log(JSON.stringify({
  status: campaign.status,
  pairCount: campaign.method.pairCount,
  adherenceDirections: campaign.trials.map(trial => ({
    scenarioId: trial.scenarioId,
    direction: trial.adherence.direction,
    delta: trial.adherence.delta,
  })),
  stableLiteraryQualityImprovementProven: false,
  automaticRetrievalUsed: false,
}, null, 2))
