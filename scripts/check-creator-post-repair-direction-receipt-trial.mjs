#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    evidence: {
      type: 'string',
      default: 'validation/creator-ui/post-repair-direction-receipt-real-trial-2026-07-17/summary.json',
    },
    'require-pass': { type: 'boolean', default: false },
  },
  strict: true,
})

const summary = JSON.parse(await readFile(values.evidence, 'utf8'))
assert.equal(summary.schemaVersion, 'creator-post-repair-direction-receipt-real-trial.v1')
assert.ok(['passed', 'author_direction_rejected'].includes(summary.status))
if (values['require-pass']) assert.equal(summary.status, 'passed')
assert.equal(summary.fixture?.source, 'frozen_original_bounded_repair')
assert.equal(summary.fixture?.realWorkingAgent, true)
assert.equal(summary.fixture?.realChapterMaterialUsed, false)
assert.match(summary.fixture?.inputSha256 || '', /^[a-f0-9]{64}$/)

assert.equal(summary.repair?.scope, 'bounded_blocks')
assert.equal(summary.repair?.changedBlockCount, 1)
assert.equal(summary.repair?.beforeBlockCount, 5)
assert.equal(summary.repair?.afterBlockCount, 5)
assert.match(summary.repair?.beforeBodySha256 || '', /^[a-f0-9]{64}$/)
assert.match(summary.repair?.repairedBodySha256 || '', /^[a-f0-9]{64}$/)
assert.notEqual(summary.repair?.beforeBodySha256, summary.repair?.repairedBodySha256)
assert.equal(summary.repair?.wholeTextRewritePerformed, false)
assert.equal(summary.repair?.authorTextOverwritten, false)

assert.deepEqual(
  summary.review?.axisChecks?.map(check => check.axis),
  ['pressureSource', 'conflictEngine', 'agencyPattern', 'costPattern', 'endingPattern'],
)
assert.equal(summary.review?.compositeLiteraryScoreUsed, false)
assert.ok(summary.review.axisChecks.every(check => check.evidenceLocatable === true))
assert.equal(summary.review?.proposedAdjustmentEvidenceLocatable, true)

if (summary.status === 'passed') {
  assert.equal(summary.receipt?.schemaVersion, 'scene-draft-direction-receipt.v1')
  assert.equal(summary.receipt?.decision, 'pass')
  assert.equal(summary.receipt?.reviewer, 'Auditor')
  assert.equal(summary.receipt?.axisCheckCount, 5)
  assert.ok(summary.receipt?.proposedAdjustmentEvidenceCount >= 1)
  assert.equal(summary.receipt?.allEvidenceMappedToCurrentBlocks, true)
  assert.match(summary.receipt?.receiptSha256 || '', /^[a-f0-9]{64}$/)
} else {
  assert.equal(summary.receipt, null)
}

assert.ok(summary.runtime?.realWorkingAgentCallCount >= 1)
assert.ok(summary.runtime?.roleOperations?.every(item => (
  item.role === 'Auditor'
    && item.operation === 'scene_author_direction_draft_review'
    && item.status === 'succeeded'
    && item.privateDataBoundary === 'local_ephemeral'
    && item.canonCommitAllowed === false
)))

for (const [key, value] of Object.entries(summary.boundaries || {})) {
  assert.equal(value, key === 'temporaryArtifactsDeletedAfterSummary', `${key} must preserve the trial boundary`)
}

const serialized = JSON.stringify(summary)
for (const forbiddenKey of ['"body":', '"beforeBody":', '"repairedBody":', '"evidenceQuote":', '"diagnosis":', '"rationale":']) {
  assert.equal(serialized.includes(forbiddenKey), false, `Redacted summary leaked ${forbiddenKey}`)
}

console.log('Creator post-repair direction receipt real-trial evidence passed.')
