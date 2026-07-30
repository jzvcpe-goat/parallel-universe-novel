#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const summaryPath = 'validation/creator-ui/author-direction-prose-real-trial-2026-07-16/summary.json'
const summary = JSON.parse(await readFile(summaryPath, 'utf8'))

assert.equal(summary.schemaVersion, 'creator-author-direction-prose-real-trial.v1')
assert.equal(summary.status, 'passed')
assert.equal(summary.httpStatus, 200)
assert.equal(summary.fixture?.source, 'frozen_original_single_scene')
assert.equal(summary.fixture?.realWorkingAgent, true)
assert.equal(summary.fixture?.realChapterMaterialUsed, false)
assert.match(summary.fixture?.inputSha256 || '', /^[a-f0-9]{64}$/)

assert.equal(summary.draft?.generated, true)
assert.equal(summary.draft?.targetLengthPassed, true)
assert.equal(summary.draft?.completeSceneEnding, true)
assert.ok(summary.draft.visibleCharacterCount >= 2700 && summary.draft.visibleCharacterCount <= 3400)
assert.match(summary.draft?.bodySha256 || '', /^[a-f0-9]{64}$/)
assert.equal(summary.draft?.bodyPersistedInRepository, false)

assert.equal(summary.authorDirectionReview?.decision, 'pass')
assert.equal(summary.authorDirectionReview?.compositeLiteraryScoreUsed, false)
assert.deepEqual(
  summary.authorDirectionReview.axisChecks.map(check => check.axis),
  ['pressureSource', 'conflictEngine', 'agencyPattern', 'costPattern', 'endingPattern'],
)
for (const check of summary.authorDirectionReview.axisChecks) {
  assert.equal(check.decision, 'pass')
  assert.equal(check.evidenceLocatable, true)
  assert.match(check.evidenceQuoteSha256 || '', /^[a-f0-9]{64}$/)
  assert.ok(check.evidenceQuoteLength >= 2 && check.evidenceQuoteLength <= 180)
}
assert.equal(summary.authorDirectionReview.proposedAdjustmentCheck?.decision, 'pass')
assert.ok(summary.authorDirectionReview.proposedAdjustmentCheck.evidence.length >= 1)
assert.ok(summary.authorDirectionReview.proposedAdjustmentCheck.evidence.every(item => item.locatable === true))

assert.equal(summary.runtime?.pipelineCount, 1)
assert.equal(summary.runtime?.writerCallCount, 1)
assert.equal(summary.runtime?.proseAuditorCallCount, 1)
assert.deepEqual(
  summary.runtime.sequence.map(item => `${item.role}:${item.operation}`),
  [
    'Architect:scene_architecture',
    'Auditor:scene_architecture_review',
    'Writer:scene_draft',
    'Auditor:scene_author_direction_draft_review',
  ],
)
assert.ok(summary.runtime.sequence.every(item => (
  item.status === 'succeeded'
    && item.privateDataBoundary === 'local_ephemeral'
    && item.canonCommitAllowed === false
)))

for (const [key, value] of Object.entries(summary.boundaries || {})) {
  assert.equal(value, key === 'temporaryArtifactsDeletedAfterSummary', `${key} must preserve the trial boundary`)
}

const serialized = JSON.stringify(summary)
for (const forbiddenKey of ['"body":', '"prompt":', '"evidenceQuote":', '"diagnosis":', '"rationale":']) {
  assert.equal(serialized.includes(forbiddenKey), false, `Redacted summary leaked ${forbiddenKey}`)
}

console.log('Creator author-direction real prose trial evidence passed.')
