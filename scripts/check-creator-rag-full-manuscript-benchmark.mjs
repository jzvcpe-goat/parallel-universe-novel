#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const receiptPath = resolve(root, 'validation/creator-rag/full-manuscript-thread-benchmark-2026-07-17.json')
const requireActivationCandidate = process.argv.includes('--require-activation-candidate')
const failures = []

function expect(condition, message) {
  if (!condition) failures.push(message)
}

expect(existsSync(receiptPath), 'missing full-manuscript benchmark receipt')
const receipt = existsSync(receiptPath)
  ? JSON.parse(readFileSync(receiptPath, 'utf8'))
  : {}

expect(receipt.schemaVersion === 1, 'receipt schemaVersion must be 1')
expect(
  receipt.status === 'real_full_manuscript_measured_not_activated',
  'receipt must remain measured_not_activated',
)
expect(receipt.source?.fromChapter === 1, 'benchmark must begin at Chapter 1')
expect(receipt.source?.toChapter === 20, 'benchmark must stop at Chapter 20')
expect(receipt.source?.chapterCount === 20, 'benchmark must contain exactly 20 accepted chapters')
expect(receipt.source?.independentlyVerifiedThreadCount === 13, 'benchmark must use 13 independently verified threads')
expect(receipt.source?.locatedSourceQuoteCount === 13, 'all source evidence must be located before retrieval')
expect(receipt.source?.locatedLatestQuoteCount === 9, 'all available latest evidence must be located before retrieval')
expect(receipt.source?.manuscriptOrQueryTextCopiedIntoReceipt === false, 'receipt must not copy manuscript or private query text')
expect(receipt.retrieval?.queryCount >= 30, 'benchmark must contain at least 30 real-manuscript queries')
expect(receipt.retrieval?.canonChapterSourceCount === 20, 'benchmark must index all 20 accepted Canon chapters')
expect(receipt.retrieval?.sourceEvidenceQueries?.queryCount === 13, 'benchmark must include 13 exact source-evidence queries')
expect(receipt.retrieval?.sourceEvidenceQueries?.recallAt10 === 1, 'exact source-evidence Recall@10 must remain 1')

for (const [key, expected] of Object.entries({
  wrongWorkLeakageCount: 0,
  wrongBranchLeakageCount: 0,
  futureChapterLeakageCount: 0,
  sourceLocatorCoverage: 1,
  manualSelectionInclusion: 1,
})) {
  expect(receipt.retrieval?.[key] === expected, `${key} must remain ${expected}`)
}

for (const key of [
  'workspaceChanged',
  'acceptedManuscriptChanged',
  'canonChanged',
  'chapter21ManuscriptReadOrChanged',
  'cloudDataChanged',
  'publicationPerformed',
  'automaticRetrievalEnabled',
]) {
  expect(receipt.sideEffects?.[key] === false, `${key} must remain false`)
}

const activationTargets = {
  overallRecallAt10: 0.95,
  contextRecallAt10: 0.90,
  latestEvidenceRecallAt10: 0.90,
  top3HitRate: 0.85,
}

if (requireActivationCandidate) {
  const top3HitRate = receipt.retrieval?.top3HitCount / receipt.retrieval?.queryCount
  expect(
    receipt.retrieval?.recallAt10 >= activationTargets.overallRecallAt10,
    `overall Recall@10 ${receipt.retrieval?.recallAt10} is below provisional activation target ${activationTargets.overallRecallAt10}`,
  )
  expect(
    receipt.retrieval?.contextQueries?.recallAt10 >= activationTargets.contextRecallAt10,
    `context Recall@10 ${receipt.retrieval?.contextQueries?.recallAt10} is below provisional activation target ${activationTargets.contextRecallAt10}`,
  )
  expect(
    receipt.retrieval?.latestEvidenceQueries?.recallAt10 >= activationTargets.latestEvidenceRecallAt10,
    `latest-evidence Recall@10 ${receipt.retrieval?.latestEvidenceQueries?.recallAt10} is below provisional activation target ${activationTargets.latestEvidenceRecallAt10}`,
  )
  expect(
    top3HitRate >= activationTargets.top3HitRate,
    `top-three hit rate ${top3HitRate} is below provisional activation target ${activationTargets.top3HitRate}`,
  )
}

if (failures.length > 0) {
  console.error(`[creator-rag-full-manuscript] FAIL (${requireActivationCandidate ? 'activation' : 'evidence'} gate)`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[creator-rag-full-manuscript] PASS (${requireActivationCandidate ? 'activation' : 'evidence'} gate)`)
console.log(JSON.stringify({
  status: receipt.status,
  queryCount: receipt.retrieval.queryCount,
  recallAt10: receipt.retrieval.recallAt10,
  contextRecallAt10: receipt.retrieval.contextQueries.recallAt10,
  latestEvidenceRecallAt10: receipt.retrieval.latestEvidenceQueries.recallAt10,
  top3HitRate: receipt.retrieval.top3HitCount / receipt.retrieval.queryCount,
  automaticRetrievalEnabled: receipt.sideEffects.automaticRetrievalEnabled,
}, null, 2))
