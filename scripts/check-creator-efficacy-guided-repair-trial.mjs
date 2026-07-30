import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    evidence: {
      type: 'string',
      default: 'validation/creator-ui/efficacy-guided-repair-real-trial-2026-07-17/failed-attempt.json',
    },
    'require-trigger': { type: 'boolean', default: false },
    'require-pass': { type: 'boolean', default: false },
  },
  strict: true,
})

const evidencePath = path.resolve(process.cwd(), values.evidence)
const summary = JSON.parse(await readFile(evidencePath, 'utf8'))
if (summary.schemaVersion === 'creator-efficacy-guided-repair-trial-failure.v1') {
  assert.equal(values['require-trigger'], false, 'A failed attempt cannot satisfy --require-trigger.')
  assert.equal(values['require-pass'], false, 'A failed attempt cannot satisfy --require-pass.')
  assert.equal(summary.fixture.source, 'synthetic_frozen_original')
  assert.equal(summary.fixture.realChapterMaterialUsed, false)
  assert.equal(summary.fixture.rawBodyPersisted, false)
  assert.equal(summary.fixture.rawEvidencePersisted, false)
  assert.equal(summary.fixture.repeatedBlockOccurrenceCount, 3)
  assert.ok(summary.fixture.visibleLength >= 2700 && summary.fixture.visibleLength <= 3400)
  assert.equal(summary.execution.realWorkingAgentStarted, true)
  assert.equal(summary.execution.runCount, 1)
  assert.equal(summary.execution.completed, false)
  assert.equal(summary.execution.failureAt, 'first_repair_apply')
  assert.equal(summary.execution.errorCode, 'draft_revision_conflict')
  assert.equal(summary.execution.failureSource, 'validation_fixture_assembly')
  assert.equal(summary.execution.runtimeDomainDefectConfirmed, false)
  assert.equal(summary.execution.rerunPerformed, false)
  assert.equal(summary.correction.completeCreationSessionFixtureAdded, true)
  assert.equal(summary.correction.finiteRevisionAssertionsAdded, true)
  assert.equal(summary.correction.versionedRepairRegressionTestAdded, true)
  assert.equal(summary.correction.realTriggerStillUnverified, true)
  for (const [name, value] of Object.entries(summary.boundaries)) {
    if (name === 'temporaryArtifactsDeleted') assert.equal(value, true)
    else assert.equal(value, false, `${name} must remain false`)
  }
  assert.ok(summary.limitations.length >= 3)
  console.log(`Creator efficacy-guided repair failed-attempt evidence passed: ${path.relative(process.cwd(), evidencePath)}`)
  process.exit(0)
}
assert.equal(summary.schemaVersion, 'creator-efficacy-guided-repair-trial.v1')
assert.equal(summary.fixture.source, 'synthetic_frozen_original')
assert.equal(summary.fixture.realChapterMaterialUsed, false)
assert.equal(summary.fixture.rawBodyPersisted, false)
assert.equal(summary.fixture.rawEvidencePersisted, false)
assert.equal(summary.fixture.rawDiagnosisPersisted, false)
assert.equal(summary.fixture.repeatedBlockOccurrenceCount, 3)
assert.ok(summary.fixture.visibleLength >= 2700 && summary.fixture.visibleLength <= 3400)
assert.equal(summary.execution.realWorkingAgent, true)
assert.equal(summary.execution.runCount, 1)
assert.equal(summary.execution.retryLimit, 1)
assert.equal(summary.execution.deterministicInitialFinding, true)
assert.deepEqual(summary.execution.requestedFocusDimensions, ['repetition'])
assert.ok(summary.execution.operationCount >= 1)
assert.ok(summary.execution.operations.every(operation => operation.canonCommitAllowed === false))
assert.ok(summary.execution.operations.every(operation => operation.privateDataBoundary === 'local_ephemeral'))
assert.ok([0, 1].includes(summary.efficacyGuidedRetry.attemptCount))
assert.equal(summary.efficacyGuidedRetry.performed, summary.efficacyGuidedRetry.attemptCount === 1)
if (summary.efficacyGuidedRetry.performed) {
  assert.equal(summary.postFirstRepairReview.eligibleRetryTargetFound, true)
  assert.equal(summary.postFirstRepairReview.retryEvidenceBlockCount, 1)
  assert.ok(['completed', 'rejected', 'failed_closed'].includes(summary.efficacyGuidedRetry.status))
}
if (summary.directionRetention.receiptCreated) {
  assert.equal(summary.directionRetention.decision, 'pass')
  assert.equal(summary.outcome.decision, 'retained_after_all_gates')
  assert.equal(summary.outcome.targetDimensionCleared, true)
}
if (summary.outcome.decision === 'retained_after_all_gates') {
  assert.equal(summary.postRetryReview.performed, true)
  assert.equal(summary.postRetryReview.targetDimensionFindingCount, 0)
  assert.equal(summary.directionRetention.reviewPerformed, true)
  assert.equal(summary.directionRetention.receiptCreated, true)
}
if (
  summary.postRetryReview.performed
  && summary.postRetryReview.targetDimensionFindingCount > 0
) {
  assert.equal(summary.outcome.targetDimensionCleared, false)
  assert.equal(summary.directionRetention.reviewPerformed, false)
  assert.equal(summary.directionRetention.decision, 'not_run')
  assert.equal(summary.directionRetention.receiptCreated, false)
  assert.equal(summary.outcome.decision, 'reverted_to_frozen_original')
  assert.equal(summary.outcome.finalBodyHash, summary.fixture.bodyHash)
}
assert.equal(summary.outcome.generalLiteraryImprovementProven, false)
for (const [name, value] of Object.entries(summary.boundaries)) {
  if (name === 'temporaryArtifactsDeletedAfterSummary') assert.equal(value, true)
  else assert.equal(value, false, `${name} must remain false`)
}
assert.ok(summary.limitations.length >= 3)

const serialized = JSON.stringify(summary)
for (const forbiddenKey of ['rawBody', 'bodyText', 'evidenceQuote', 'diagnosis', 'rationale']) {
  assert.equal(serialized.includes(`\"${forbiddenKey}\"`), false, `Evidence must not persist ${forbiddenKey}`)
}

if (values['require-trigger']) {
  assert.equal(summary.postFirstRepairReview.performed, true)
  assert.equal(summary.postFirstRepairReview.targetDimensionFindingCount > 0, true)
  assert.equal(summary.postFirstRepairReview.eligibleRetryTargetFound, true)
  assert.equal(summary.efficacyGuidedRetry.performed, true)
  assert.equal(summary.efficacyGuidedRetry.attemptCount, 1)
}
if (values['require-pass']) {
  assert.equal(summary.efficacyGuidedRetry.status, 'completed')
  assert.equal(summary.efficacyGuidedRetry.auditorDecision, 'pass')
  assert.equal(summary.postRetryReview.performed, true)
  assert.equal(summary.postRetryReview.targetDimensionFindingCount, 0)
  assert.equal(summary.directionRetention.decision, 'pass')
  assert.equal(summary.directionRetention.receiptCreated, true)
  assert.equal(summary.outcome.decision, 'retained_after_all_gates')
}

console.log(`Creator efficacy-guided repair trial evidence passed: ${path.relative(process.cwd(), evidencePath)}`)
