import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const receiptPath = resolve(
  root,
  'validation/creator-ui/manual-recall-effect-real-trial-2026-07-18/summary.json',
)
const receipt = JSON.parse(await readFile(receiptPath, 'utf8'))

assert.equal(receipt.schemaVersion, 'creator-manual-recall-effect-real-trial.v1')
assert.equal(receipt.status, 'real_single_pair_measured_no_stability_claim')
assert.equal(receipt.fixture?.realWorkingAgent, true)
assert.equal(receipt.fixture?.realChapterMaterialUsed, false)
assert.equal(receipt.fixture?.recallSourceCount, 4)
assert.deepEqual(receipt.fixture?.recallGroups, ['causal', 'character_knowledge', 'timeline', 'promise'])
assert.equal(receipt.fixture?.recallSourcesAbsentFromBaselineContext, true)
assert.equal(receipt.fairness?.sameSession, true)
assert.equal(receipt.fairness?.sameLockedIntent, true)
assert.equal(receipt.fairness?.sameSelectedCandidate, true)
assert.equal(receipt.fairness?.sameTargetLength, true)
assert.equal(receipt.fairness?.sameWorkingAgentBridge, true)
assert.equal(receipt.fairness?.onlyAuthoredContextDifference, 'manualRecallItems')
assert.equal(receipt.fairness?.contextIdentityRecomputedPerArm, true)
assert.equal(receipt.fairness?.generationOrderRandomized, true)
assert.equal(receipt.fairness?.candidateLabelsRandomized, true)
assert.equal(receipt.fairness?.evaluatorSawArmIdentity, false)
assert.equal(receipt.fairness?.verifierSawArmIdentity, false)
assert.equal(receipt.fairness?.compositeLiteraryScoreUsed, false)

for (const arm of [receipt.arms?.manualRecallSelected, receipt.arms?.manualRecallAbsent]) {
  assert.ok(arm)
  assert.ok(arm.visibleCharacterCount >= 2700 && arm.visibleCharacterCount <= 3400)
  assert.equal(arm.completeEnding, true)
  assert.match(arm.manuscriptSha256, /^[a-f0-9]{64}$/u)
  assert.equal(arm.checks?.length, 4)
  assert.deepEqual(arm.checks.map(item => item.group), ['causal', 'character_knowledge', 'timeline', 'promise'])
  assert.equal(arm.checks.every(item => item.status === 'omitted' || item.evidenceLocatable), true)
}
assert.notEqual(
  receipt.arms.manualRecallSelected.manuscriptSha256,
  receipt.arms.manualRecallAbsent.manuscriptSha256,
)
assert.equal(receipt.blindLiteraryComparison?.independentVerificationCompleted, true)
assert.equal(receipt.blindLiteraryComparison?.dimensions?.length, 11)
assert.equal(receipt.blindLiteraryComparison?.hardConstraints?.length, 2)
assert.equal(receipt.blindLiteraryComparison?.overallWinnerDeclared, false)
assert.equal(receipt.blindLiteraryComparison?.compositeLiteraryScoreUsed, false)
assert.ok(receipt.runtime?.realWorkingAgentCallCount >= 8)
for (const operation of ['scene_architecture', 'scene_draft', 'manual_recall_adherence_review', 'paired_literary_comparison', 'paired_literary_comparison_verification']) {
  assert.ok(receipt.runtime.roleOperations.some(item => item.operation === operation))
}
assert.equal(receipt.runtime.roleOperations.every(item => (
  item.status === 'succeeded'
  && item.privateDataBoundary === 'local_ephemeral'
  && item.canonCommitAllowed === false
)), true)
assert.deepEqual(receipt.boundaries, {
  repositoryWritePerformed: false,
  candidateAdopted: false,
  canonChanged: false,
  chapter20AccessedOrChanged: false,
  chapter21AccessedOrChanged: false,
  cloudDataChanged: false,
  publicationPerformed: false,
  rawDraftPersistedInRepository: false,
  temporaryArtifactsDeletedAfterSummary: true,
})
assert.equal(JSON.stringify(receipt).includes('evidenceQuotes'), false)

console.log('[creator-manual-recall-effect-real-trial] PASS')
console.log(JSON.stringify({
  status: receipt.status,
  selected: {
    decision: receipt.arms.manualRecallSelected.adherenceDecision,
    fulfilledOrRespected: receipt.arms.manualRecallSelected.fulfilledOrRespectedCount,
    violatedOrOmitted: receipt.arms.manualRecallSelected.violatedOrOmittedCount,
  },
  absent: {
    decision: receipt.arms.manualRecallAbsent.adherenceDecision,
    fulfilledOrRespected: receipt.arms.manualRecallAbsent.fulfilledOrRespectedCount,
    violatedOrOmitted: receipt.arms.manualRecallAbsent.violatedOrOmittedCount,
  },
  automaticRetrievalEnabled: false,
}, null, 2))
