#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const receiptPath = resolve(root, 'validation/creator-rag/full-manuscript-bge-small-zh-v1.5-comparison-2026-07-18.json')
const requireActivationCandidate = process.argv.includes('--require-activation-candidate')
const failures = []

function expect(condition, message) {
  if (!condition) failures.push(message)
}

expect(existsSync(receiptPath), 'missing BGE small Chinese embedding comparison receipt')
const receipt = existsSync(receiptPath) ? JSON.parse(readFileSync(receiptPath, 'utf8')) : {}

expect(receipt.schemaVersion === 1, 'receipt schemaVersion must be 1')
expect(
  receipt.status === 'real_full_manuscript_embedding_comparison_not_activated',
  'embedding comparison must remain measured and not activated',
)
expect(receipt.source?.fromChapter === 1, 'comparison must begin at Chapter 1')
expect(receipt.source?.toChapter === 20, 'comparison must stop at Chapter 20')
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
expect(receipt.retrieval?.candidatePoolSize === 10, 'embedding comparison must retain the baseline ten-source result limit')
expect(receipt.retrieval?.upstreamPipeline === 'LanceDB hybrid RRF', 'comparison must retain the upstream LanceDB/RRF pipeline')
expect(receipt.embeddingModel?.id === 'Xenova/bge-small-zh-v1.5', 'unexpected ONNX embedding export')
expect(receipt.embeddingModel?.baseModelId === 'BAAI/bge-small-zh-v1.5', 'unexpected BGE base model')
expect(receipt.embeddingModel?.revision === '75c43b069aac4d136ba6bc1122f995fedcfd2781', 'BGE embedding revision drifted')
expect(receipt.embeddingModel?.modelLicense === 'MIT', 'BGE embedding must retain its commercial-compatible MIT license')
expect(receipt.embeddingModel?.dimensions === 512, 'BGE embedding dimensions drifted')
expect(receipt.embeddingModel?.queryPrefix === '为这个句子生成表示以用于检索相关文章：', 'official Chinese query instruction drifted')
expect(receipt.embeddingModel?.passagePrefix === '', 'BGE passage input must remain unprefixed')
expect(receipt.embeddingModel?.upstreamPooling === 'mean', 'embedding must delegate mean pooling upstream')
expect(receipt.embeddingModel?.upstreamNormalization === true, 'embedding must delegate normalization upstream')
expect(receipt.embeddingModel?.productSimilarityMathAdded === false, 'product code must not add similarity math')
expect(
  receipt.embeddingModel?.artifacts?.modelQuantizedSha256 === '15b717c382bcb518ba457b93ea6850ede7f4f1cd8937454aa06972366cd19bcc',
  'BGE q8 model hash drifted',
)
expect(
  receipt.embeddingModel?.artifacts?.tokenizerSha256 === '48cea5d44424912a6fd1ea647bf4fe50b55ab8b1e5879c3275f80e339e8fae26', // gitleaks:allow -- SHA-256 artifact digest, not a credential.
  'BGE tokenizer hash drifted',
)
expect(
  receipt.embeddingModel?.artifacts?.configSha256 === 'd4193ead3a810fd694fa8a31d7fc72fbaebc0668b603e398734bf2f6538ff42f',
  'BGE config hash drifted',
)
expect(
  receipt.embeddingModel?.artifacts?.tokenizerConfigSha256 === 'e6f3b96db926a37d4039995fbf5ad17de158dfb8f6343d607e4dbaad18d75f5a', // gitleaks:allow -- SHA-256 artifact digest, not a credential.
  'BGE tokenizer config hash drifted',
)
expect(
  receipt.comparison?.baselineReceiptSha256 === 'c65daf5b6a3d1bc660edca25eef7c7393eb937157c07abc122ad3d2282d628f6',
  'frozen baseline receipt hash drifted',
)

const expectedMetrics = {
  recallAt10: 0.8571428571428571,
  precisionAt3: 0.24761904761904754,
  contextRecallAt10: 0.7692307692307693,
  latestEvidenceRecallAt10: 0.7777777777777778,
  top3HitRate: 0.6857142857142857,
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
  expect(typeof measured === 'number' && Math.abs(measured - expected) < 1e-12, `${key} drifted from the frozen real-corpus measurement`)
}
expect(receipt.retrieval?.rankingDigestSha256 === '813443934ce4bc5edcfdcfb1dae59c284fc41737fcd95b84c9676cd351bed138', 'BGE embedding ranking digest drifted')
expect(receipt.retrieval?.evaluationDigestSha256 === 'e12a108679cd9b5d06a858b37ded8d837ded3f8acd85a226422d64120ffd820b', 'BGE embedding evaluation digest drifted')
expect(receipt.comparison?.overallRecallAt10Delta > 0, 'overall recall must retain its measured positive delta')
expect(receipt.comparison?.contextRecallAt10Delta > 0, 'context recall must retain its measured positive delta')
expect(receipt.comparison?.latestEvidenceRecallAt10Delta === 0, 'latest-evidence recall must retain its measured zero delta')
expect(receipt.comparison?.top3HitRateDelta < 0, 'top-three hit rate regression must remain disclosed')

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
  queryLatencyP95Ms: 2000,
}
if (requireActivationCandidate) {
  expect(receipt.retrieval?.recallAt10 >= activationTargets.overallRecallAt10, `overall Recall@10 ${receipt.retrieval?.recallAt10} is below ${activationTargets.overallRecallAt10}`)
  expect(receipt.retrieval?.contextQueries?.recallAt10 >= activationTargets.contextRecallAt10, `context Recall@10 ${receipt.retrieval?.contextQueries?.recallAt10} is below ${activationTargets.contextRecallAt10}`)
  expect(receipt.retrieval?.latestEvidenceQueries?.recallAt10 >= activationTargets.latestEvidenceRecallAt10, `latest-evidence Recall@10 ${receipt.retrieval?.latestEvidenceQueries?.recallAt10} is below ${activationTargets.latestEvidenceRecallAt10}`)
  expect(measuredMetrics.top3HitRate >= activationTargets.top3HitRate, `top-three hit rate ${measuredMetrics.top3HitRate} is below ${activationTargets.top3HitRate}`)
  expect(receipt.retrieval?.queryLatencyP95Ms <= activationTargets.queryLatencyP95Ms, `P95 latency ${receipt.retrieval?.queryLatencyP95Ms} exceeds ${activationTargets.queryLatencyP95Ms}`)
}

if (failures.length) {
  console.error(`[creator-rag-bge-small-zh-comparison] FAIL (${requireActivationCandidate ? 'activation' : 'evidence'} gate)`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[creator-rag-bge-small-zh-comparison] PASS (${requireActivationCandidate ? 'activation' : 'evidence'} gate)`)
console.log(JSON.stringify({
  status: receipt.status,
  recallAt10: measuredMetrics.recallAt10,
  contextRecallAt10: measuredMetrics.contextRecallAt10,
  latestEvidenceRecallAt10: measuredMetrics.latestEvidenceRecallAt10,
  top3HitRate: measuredMetrics.top3HitRate,
  queryLatencyP95Ms: receipt.retrieval.queryLatencyP95Ms,
  automaticRetrievalEnabled: receipt.sideEffects.automaticRetrievalEnabled,
}, null, 2))
