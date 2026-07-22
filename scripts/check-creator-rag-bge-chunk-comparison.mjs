#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const receiptPath = resolve(root, 'validation/creator-rag/full-manuscript-bge-v2-m3-chunk-comparison-2026-07-17.json')
const requireActivationCandidate = process.argv.includes('--require-activation-candidate')
const failures = []

function expect(condition, message) {
  if (!condition) failures.push(message)
}

expect(existsSync(receiptPath), 'missing BGE chunk-level full-manuscript comparison receipt')
const receipt = existsSync(receiptPath)
  ? JSON.parse(readFileSync(receiptPath, 'utf8'))
  : {}

expect(receipt.schemaVersion === 1, 'receipt schemaVersion must be 1')
expect(receipt.status === 'real_full_manuscript_bge_comparison_not_activated', 'chunk comparison must remain not activated')
expect(receipt.source?.fromChapter === 1 && receipt.source?.toChapter === 20, 'comparison must remain inside Chapters 1-20')
expect(receipt.source?.chapterCount === 20, 'comparison must contain exactly 20 accepted chapters')
expect(receipt.source?.acceptedBlockCount === 1195, 'comparison must retain all 1,195 accepted blocks')
expect(receipt.source?.visibleCharacterCount === 68766, 'comparison must retain the frozen visible-character count')
expect(
  receipt.source?.workspaceArchiveSha256 === '2f7e0ac1ea89d67b2102eff4e2234957f212ea009068e9706a89900d64e75b83',
  'comparison workspace archive hash drifted',
)
expect(
  receipt.source?.privateLedgerSha256 === 'e51cca1e0567336546069550a2c58383aac16a6416c8b6ffef13535237dc6bbd',
  'comparison private thread ledger hash drifted',
)
expect(receipt.source?.independentlyVerifiedThreadCount === 13, 'comparison must use 13 independently verified threads')
expect(receipt.source?.manuscriptOrQueryTextCopiedIntoReceipt === false, 'receipt must not copy manuscript or private queries')
expect(receipt.retrieval?.queryCount === 35, 'comparison must contain the frozen 35 queries')
expect(receipt.retrieval?.candidatePoolSize === 40, 'chunk comparison must score 40 upstream candidates per query')
expect(receipt.retrieval?.candidateGranularity === 'chunk', 'comparison must use chunk-level candidates')
expect(
  receipt.retrieval?.upstreamPipeline === 'LanceDB hybrid RRF candidate pool -> BGE pair scorer',
  'comparison must retain the upstream-only pipeline declaration',
)
expect(receipt.pairScorer?.baseModelId === 'BAAI/bge-reranker-v2-m3', 'unexpected BGE base model')
expect(receipt.pairScorer?.dtype === 'q8', 'comparison must use the frozen q8 model')
expect(
  receipt.pairScorer?.artifacts?.modelQuantizedSha256 === '912fc1215c2dbff6499700534bd8d31253af01573861abbfc43afd1fab6cce5d',
  'BGE q8 model hash drifted',
)
expect(receipt.pairScorer?.upstreamLogitsUsedWithoutScoreTransformation === true, 'product code must not transform upstream logits')
expect(
  receipt.comparison?.baselineReceiptSha256 === 'c65daf5b6a3d1bc660edca25eef7c7393eb937157c07abc122ad3d2282d628f6',
  'frozen baseline receipt hash drifted',
)

const expectedMetrics = {
  recallAt10: 0.9714285714285714,
  precisionAt3: 0.2952380952380953,
  contextRecallAt10: 0.9230769230769231,
  latestEvidenceRecallAt10: 1,
  top3HitRate: 0.8,
}
const measuredMetrics = {
  recallAt10: receipt.retrieval?.recallAt10,
  precisionAt3: receipt.retrieval?.precisionAt3,
  contextRecallAt10: receipt.retrieval?.contextQueries?.recallAt10,
  latestEvidenceRecallAt10: receipt.retrieval?.latestEvidenceQueries?.recallAt10,
  top3HitRate: receipt.retrieval?.top3HitCount / receipt.retrieval?.queryCount,
}
for (const [key, expected] of Object.entries(expectedMetrics)) {
  const measured = measuredMetrics[key]
  expect(
    typeof measured === 'number' && Math.abs(measured - expected) < 1e-12,
    `${key} drifted from the frozen chunk-level measurement`,
  )
}

for (const [key, expected] of Object.entries({
  wrongWorkLeakageCount: 0,
  wrongBranchLeakageCount: 0,
  futureChapterLeakageCount: 0,
  sourceLocatorCoverage: 1,
  manualSelectionInclusion: 1,
})) {
  expect(receipt.retrieval?.[key] === expected, `${key} must remain ${expected}`)
}
for (const [key, value] of Object.entries(receipt.comparison ?? {})) {
  if (!key.endsWith('Delta')) continue
  expect(typeof value === 'number' && value > 0, `${key} must retain a measured positive comparison delta`)
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
  queryLatencyP95Ms: 2000,
}
if (requireActivationCandidate) {
  expect(receipt.retrieval?.recallAt10 >= activationTargets.overallRecallAt10, 'overall Recall@10 is below activation target')
  expect(receipt.retrieval?.contextQueries?.recallAt10 >= activationTargets.contextRecallAt10, 'context Recall@10 is below activation target')
  expect(receipt.retrieval?.latestEvidenceQueries?.recallAt10 >= activationTargets.latestEvidenceRecallAt10, 'latest-evidence Recall@10 is below activation target')
  expect(measuredMetrics.top3HitRate >= activationTargets.top3HitRate, `top-three hit rate ${measuredMetrics.top3HitRate} is below ${activationTargets.top3HitRate}`)
  expect(receipt.retrieval?.queryLatencyP95Ms <= activationTargets.queryLatencyP95Ms, `P95 latency ${receipt.retrieval?.queryLatencyP95Ms} ms exceeds ${activationTargets.queryLatencyP95Ms} ms`)
}

if (failures.length) {
  console.error(`[creator-rag-bge-chunk-comparison] FAIL (${requireActivationCandidate ? 'activation' : 'evidence'} gate)`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[creator-rag-bge-chunk-comparison] PASS (${requireActivationCandidate ? 'activation' : 'evidence'} gate)`)
console.log(JSON.stringify({
  status: receipt.status,
  recallAt10: measuredMetrics.recallAt10,
  contextRecallAt10: measuredMetrics.contextRecallAt10,
  latestEvidenceRecallAt10: measuredMetrics.latestEvidenceRecallAt10,
  top3HitRate: measuredMetrics.top3HitRate,
  queryLatencyP95Ms: receipt.retrieval.queryLatencyP95Ms,
  automaticRetrievalEnabled: receipt.sideEffects.automaticRetrievalEnabled,
}, null, 2))
