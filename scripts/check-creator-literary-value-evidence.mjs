import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const reportPath = path.join(root, 'validation', 'creator-writing', 'literary-value-evidence-real-workspace-2026-07-21.json')
const report = JSON.parse(await readFile(reportPath, 'utf8'))

assert.equal(report.schemaVersion, 'creator-literary-value-evidence-run.v1')
assert.equal(report.source.kind, 'local_workspace_package')
assert.equal(report.source.chapter21AccessedOrChanged, false)
assert.equal(report.source.rawManuscriptPersistedInReport, false)
assert.equal(report.report.schemaVersion, 'creator-literary-value-evidence.v1')
assert.equal(report.report.claimBoundary.compositeLiteraryScoreUsed, false)
assert.equal(report.report.claimBoundary.stableLiteraryQualityImprovementProven, false)
assert.equal(report.report.claimBoundary.professionalHumanBlindReviewCompleted, false)
assert.equal(report.report.claimBoundary.automaticRagEnabled, false)
assert.equal(report.report.character.relationshipInconsistency.coverage, 'not_measured')
assert.equal(report.report.authorWorkflow.trust.coverage, 'not_measured')
assert.equal(report.report.campaignEvidence.receiptCount, 2)
assert.equal(report.report.campaignEvidence.adjacentContinuity.receiptCount, 1)
assert.equal(report.report.campaignEvidence.longRangeThreads.receiptCount, 1)
assert.ok(report.report.campaignEvidence.adjacentContinuity.independentlyVerifiedFindingCount >= 1)
assert.ok(report.report.campaignEvidence.longRangeThreads.independentlyVerifiedThreadCount >= 1)
assert.equal(report.source.campaignReceipts.length, 2)
assert.ok(report.source.campaignReceipts.every(receipt => receipt.fromChapter === 1 && receipt.toChapter === 20))

const forbiddenKeys = new Set(['text', 'body', 'content', 'proposedContent', 'evidenceQuote', 'rawDraft'])
function assertNoPrivateProse(value) {
  if (Array.isArray(value)) return value.forEach(assertNoPrivateProse)
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    assert.equal(forbiddenKeys.has(key), false, `Evidence report must not persist private prose field: ${key}`)
    assertNoPrivateProse(child)
  }
}
assertNoPrivateProse(report)

console.log('Creator literary-value evidence report contract passed.')
