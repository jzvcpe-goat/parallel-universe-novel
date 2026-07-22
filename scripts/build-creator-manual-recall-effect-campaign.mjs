import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const receiptPaths = [
  'validation/creator-ui/manual-recall-effect-real-trial-2026-07-18/summary.json',
  'validation/creator-ui/manual-recall-effect-archive-tribunal-real-trial-2026-07-18/summary.json',
  'validation/creator-ui/manual-recall-effect-floodgate-real-trial-2026-07-18/summary.json',
]
const outputPath = path.join(
  root,
  'validation/creator-ui/manual-recall-effect-real-campaign-2026-07-18/summary.json',
)

const sha256 = value => createHash('sha256').update(value).digest('hex')
const receipts = await Promise.all(receiptPaths.map(async receiptPath => (
  JSON.parse(await readFile(path.join(root, receiptPath), 'utf8'))
)))

const preferenceTotals = {
  manual_recall_selected: 0,
  manual_recall_absent: 0,
  tie: 0,
  unconfirmed: 0,
}
for (const receipt of receipts) {
  for (const dimension of receipt.blindLiteraryComparison.dimensions) {
    const preference = dimension.verificationDecision === 'verify'
      ? dimension.confirmedPreference
      : null
    if (preference === 'manual_recall_selected') preferenceTotals.manual_recall_selected += 1
    else if (preference === 'manual_recall_absent') preferenceTotals.manual_recall_absent += 1
    else if (preference === 'tie') preferenceTotals.tie += 1
    else preferenceTotals.unconfirmed += 1
  }
}

const trials = receipts.map((receipt, index) => {
  const selected = receipt.arms.manualRecallSelected
  const absent = receipt.arms.manualRecallAbsent
  const adherenceDelta = selected.fulfilledOrRespectedCount - absent.fulfilledOrRespectedCount
  const selectedConstraint = receipt.blindLiteraryComparison.hardConstraints.find(
    item => item.arm === 'manual_recall_selected',
  )
  const absentConstraint = receipt.blindLiteraryComparison.hardConstraints.find(
    item => item.arm === 'manual_recall_absent',
  )
  return {
    receiptPath: receiptPaths[index],
    receiptSha256: sha256(JSON.stringify(receipt)),
    trialId: receipt.trialId,
    fixtureId: receipt.fixture.id,
    scenarioId: receipt.fixture.scenarioId ?? 'glass-lung',
    inputSha256: receipt.fixture.inputSha256,
    privateMappingSha256: receipt.fairness.privateMappingSha256,
    generationOrder: receipt.runtime.generationOrder,
    manuscriptHashes: {
      manualRecallSelected: selected.manuscriptSha256,
      manualRecallAbsent: absent.manuscriptSha256,
    },
    adherence: {
      manualRecallSelected: selected.fulfilledOrRespectedCount,
      manualRecallAbsent: absent.fulfilledOrRespectedCount,
      delta: adherenceDelta,
      direction: adherenceDelta > 0
        ? 'selected_memory_better'
        : adherenceDelta < 0
          ? 'absent_memory_better'
          : 'no_difference',
    },
    independentlyVerifiedHardConstraints: {
      manualRecallSelected: selectedConstraint?.confirmedStatus ?? null,
      manualRecallAbsent: absentConstraint?.confirmedStatus ?? null,
    },
    fullProductReview: receipt.fullProductReview ?? null,
    realWorkingAgentCallCount: receipt.runtime.realWorkingAgentCallCount,
  }
})

const summary = {
  schemaVersion: 'creator-manual-recall-effect-real-campaign.v1',
  completedAt: new Date().toISOString(),
  status: 'real_three_pair_campaign_measured_no_stability_claim',
  method: {
    pairCount: trials.length,
    distinctScenarioCount: new Set(trials.map(trial => trial.scenarioId)).size,
    distinctFixtureCount: new Set(trials.map(trial => trial.fixtureId)).size,
    randomizedGenerationOrderPerPair: true,
    randomizedBlindLabelsPerPair: true,
    independentVerificationPerPair: true,
    fullProductReviewPairCount: trials.filter(trial => trial.fullProductReview).length,
    sameAuthoredDifferencePerPair: 'manualRecallItems',
    automaticRetrievalUsed: false,
    compositeLiteraryScoreUsed: false,
    overallWinnerDeclared: false,
  },
  aggregate: {
    selectedMemoryBetterAdherencePairs: trials.filter(trial => trial.adherence.delta > 0).length,
    absentMemoryBetterAdherencePairs: trials.filter(trial => trial.adherence.delta < 0).length,
    equalAdherencePairs: trials.filter(trial => trial.adherence.delta === 0).length,
    blindVerifiedDimensionPreferences: preferenceTotals,
    totalRealWorkingAgentCalls: trials.reduce((sum, trial) => sum + trial.realWorkingAgentCallCount, 0),
    stableLiteraryQualityImprovementProven: false,
  },
  trials,
  boundaries: {
    repositoryWritePerformed: false,
    candidateAdopted: false,
    canonChanged: false,
    chapter20AccessedOrChanged: false,
    chapter21AccessedOrChanged: false,
    cloudDataChanged: false,
    publicationPerformed: false,
    rawDraftPersistedInRepository: false,
  },
  conclusionBoundary: [
    'This campaign measures three frozen original scene pairs and does not establish stable long-form literary improvement.',
    'A negative or mixed pair remains valid evidence and must not fail the campaign gate.',
    'The campaign tests author-selected memory effect, not automatic retrieval quality.',
    'No generated prose, blind mapping, candidate, Canon revision, cloud row, or publication is retained.',
  ],
}

assert.equal(summary.method.pairCount, 3)
assert.equal(summary.method.distinctScenarioCount, 3)
assert.equal(summary.method.distinctFixtureCount, 3)
await mkdir(path.dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
