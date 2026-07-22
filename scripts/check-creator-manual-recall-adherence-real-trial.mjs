#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const summary = JSON.parse(await readFile(
  'validation/creator-ui/manual-recall-adherence-real-trial-2026-07-18/summary.json',
  'utf8',
))

assert.equal(summary.schemaVersion, 'creator-manual-recall-adherence-real-trial.v1')
assert.equal(summary.status, 'completed')
assert.equal(summary.fixture?.id, 'frozen-original-glass-lung-endurance-v1')
assert.equal(summary.fixture?.realWorkingAgent, true)
assert.equal(summary.fixture?.realChapterMaterialUsed, false)
assert.match(summary.fixture?.inputSha256 || '', /^[a-f0-9]{64}$/u)
assert.equal(summary.draft?.generatedThroughProductAgent, true)
assert.ok(summary.draft?.visibleCharacterCount >= 2700 && summary.draft?.visibleCharacterCount <= 3400)
assert.equal(summary.draft?.completeEnding, true)
assert.match(summary.draft?.manuscriptSha256 || '', /^[a-f0-9]{64}$/u)
assert.equal(summary.draft?.bodyPersistedInRepository, false)

const recall = summary.manualRecallAdherence
assert.ok(['pass', 'reject'].includes(recall?.decision))
assert.deepEqual(recall?.selectedSourceIds, [
  'canon:last-antidote',
  'asset:wenlan',
  'canon:greenhouse-time',
])
assert.deepEqual(recall?.selectedGroups, ['causal', 'character_knowledge', 'timeline'])
assert.equal(recall?.checks?.length, 3)
assert.deepEqual(recall?.checks?.map(check => check.sourceId), recall?.selectedSourceIds)
assert.ok(recall?.checks?.every(check => check.evidenceLocatable === true))
assert.equal(recall?.sourceCoverageExact, true)
assert.equal(recall?.unselectedCanaryExcluded, true)
assert.equal(recall?.compositeLiteraryScoreUsed, false)
if (recall?.decision === 'pass') {
  assert.deepEqual(recall.deterministicViolationCodes, [])
} else {
  assert.ok(recall.deterministicViolationCodes.length > 0)
}

assert.ok(summary.runtime?.realWorkingAgentCallCount >= 6)
assert.ok(summary.runtime?.manualRecallAuditorCallCount >= 1)
assert.ok(summary.runtime?.manualRecallAuditorCallCount <= 2)
assert.ok(summary.runtime?.roleOperations?.some(item => (
  item.role === 'Auditor' && item.operation === 'manual_recall_adherence_review'
)))
assert.ok(summary.runtime?.roleOperations?.every(item => (
  item.status === 'succeeded'
  && item.privateDataBoundary === 'local_ephemeral'
  && item.canonCommitAllowed === false
)))

for (const [key, value] of Object.entries(summary.boundaries || {})) {
  assert.equal(value, key === 'temporaryArtifactsDeletedAfterSummary', `${key} crossed the trial boundary`)
}

const serialized = JSON.stringify(summary)
for (const forbidden of ['"body":', '"evidenceQuotes":', '"diagnosis":', '"rationale":']) {
  assert.equal(serialized.includes(forbidden), false, `Redacted summary leaked ${forbidden}`)
}

console.log(`Creator manual recall adherence real trial passed with measured decision: ${recall.decision}.`)
