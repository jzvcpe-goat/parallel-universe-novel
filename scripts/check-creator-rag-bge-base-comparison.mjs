#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const repeatPaths = [
  'validation/creator-rag/full-manuscript-bge-base-batch40-repeat-2026-07-18.json',
  'validation/creator-rag/full-manuscript-bge-base-batch40-repeat-2-2026-07-18.json',
]
const fastPath = 'validation/creator-rag/full-manuscript-bge-base-pool20-comparison-2026-07-18.json'
const intermediatePaths = [
  'validation/creator-rag/full-manuscript-bge-base-pool24-comparison-2026-07-18.json',
  'validation/creator-rag/full-manuscript-bge-base-pool28-comparison-2026-07-18.json',
]
const compatibilityAuditPath = 'validation/creator-rag/community-reranker-compatibility-audit-2026-07-18.json'
const failures = []

function expect(condition, message) {
  if (!condition) failures.push(message)
}

function readReceipt(path) {
  const absolute = resolve(root, path)
  expect(existsSync(absolute), `missing BGE base comparison receipt: ${path}`)
  return existsSync(absolute) ? JSON.parse(readFileSync(absolute, 'utf8')) : {}
}

const repeated = repeatPaths.map(readReceipt)
const fast = readReceipt(fastPath)
const intermediate = intermediatePaths.map(readReceipt)
const compatibilityAudit = readReceipt(compatibilityAuditPath)
const all = [...repeated, fast, ...intermediate]

for (const receipt of all) {
  expect(receipt.schemaVersion === 1, 'BGE base receipt schemaVersion must be 1')
  expect(receipt.status === 'real_full_manuscript_bge_comparison_not_activated', 'BGE base comparison must remain not activated')
  expect(receipt.source?.fromChapter === 1 && receipt.source?.toChapter === 20, 'BGE base comparison must remain inside Chapters 1-20')
  expect(receipt.source?.chapterCount === 20, 'BGE base comparison must contain exactly 20 chapters')
  expect(receipt.source?.acceptedBlockCount === 1195, 'BGE base comparison must retain all accepted blocks')
  expect(receipt.source?.visibleCharacterCount === 68766, 'BGE base comparison visible-character count drifted')
  expect(receipt.source?.manuscriptOrQueryTextCopiedIntoReceipt === false, 'BGE base receipt must not copy manuscript or query text')
  expect(receipt.retrieval?.queryCount === 35, 'BGE base comparison must use the frozen 35 queries')
  expect(receipt.retrieval?.candidateGranularity === 'chunk', 'BGE base comparison must use upstream chunk candidates')
  expect(receipt.retrieval?.upstreamPipeline === 'LanceDB hybrid RRF candidate pool -> BGE pair scorer', 'BGE base pipeline declaration drifted')
  expect(receipt.retrieval?.wrongWorkLeakageCount === 0, 'wrong-work leakage must remain zero')
  expect(receipt.retrieval?.wrongBranchLeakageCount === 0, 'wrong-branch leakage must remain zero')
  expect(receipt.retrieval?.futureChapterLeakageCount === 0, 'future-chapter leakage must remain zero')
  expect(receipt.retrieval?.sourceLocatorCoverage === 1, 'source locator coverage must remain one')
  expect(receipt.retrieval?.manualSelectionInclusion === 1, 'manual selection inclusion must remain one')
  expect(receipt.retrieval?.digestContainsManuscriptOrQueryText === false, 'ranking digests must not contain manuscript or query text')
  expect(receipt.pairScorer?.id === 'Xenova/bge-reranker-base', 'unexpected BGE base ONNX export')
  expect(receipt.pairScorer?.baseModelId === 'BAAI/bge-reranker-base', 'unexpected BGE base model')
  expect(receipt.pairScorer?.revision === '280bcc27a84e0b898c251e06fddb25171bd9b101', 'BGE base revision drifted')
  expect(receipt.pairScorer?.modelLicense === 'MIT', 'BGE base license drifted')
  expect(receipt.pairScorer?.artifacts?.modelQuantizedSha256 === 'dd98f3e67837d23210a6b7550c08cced4f61845b940ac45be3565840a10f3244', 'BGE base q8 model hash drifted')
  expect(receipt.pairScorer?.upstreamLogitsUsedWithoutScoreTransformation === true, 'product code must not transform BGE logits')
  for (const boundary of [
    'workspaceChanged',
    'acceptedManuscriptChanged',
    'canonChanged',
    'chapter21ManuscriptReadOrChanged',
    'cloudDataChanged',
    'publicationPerformed',
    'automaticRetrievalEnabled',
  ]) {
    expect(receipt.sideEffects?.[boundary] === false, `${boundary} must remain false`)
  }
}

const [firstRepeat, secondRepeat] = repeated
for (const path of [
  ['retrieval', 'recallAt10'],
  ['retrieval', 'precisionAt3'],
  ['retrieval', 'top3HitCount'],
  ['retrieval', 'rankingDigestSha256'],
  ['retrieval', 'evaluationDigestSha256'],
]) {
  const [group, key] = path
  expect(firstRepeat?.[group]?.[key] === secondRepeat?.[group]?.[key], `repeat ${group}.${key} must be stable`)
}
expect(firstRepeat?.retrieval?.contextQueries?.recallAt10 === secondRepeat?.retrieval?.contextQueries?.recallAt10, 'repeat context Recall@10 must be stable')
expect(firstRepeat?.retrieval?.latestEvidenceQueries?.recallAt10 === secondRepeat?.retrieval?.latestEvidenceQueries?.recallAt10, 'repeat latest-evidence Recall@10 must be stable')
expect(firstRepeat?.retrieval?.candidatePoolSize === 40 && secondRepeat?.retrieval?.candidatePoolSize === 40, 'repeat comparison must score 40 chunks')
expect(firstRepeat?.pairScorer?.batchSize === 40 && secondRepeat?.pairScorer?.batchSize === 40, 'repeat comparison must use batch size 40')

const activationTargets = {
  overallRecallAt10: 0.95,
  contextRecallAt10: 0.90,
  latestEvidenceRecallAt10: 0.90,
  top3HitRate: 0.85,
  queryLatencyP95Ms: 2000,
}
const repeatTop3 = firstRepeat?.retrieval?.top3HitCount / firstRepeat?.retrieval?.queryCount
expect(firstRepeat?.retrieval?.recallAt10 >= activationTargets.overallRecallAt10, '40-candidate repeat must retain the measured overall-recall pass')
expect(firstRepeat?.retrieval?.contextQueries?.recallAt10 < activationTargets.contextRecallAt10, '40-candidate repeat must retain the context-recall blocker')
expect(firstRepeat?.retrieval?.latestEvidenceQueries?.recallAt10 >= activationTargets.latestEvidenceRecallAt10, '40-candidate repeat must retain the latest-evidence pass')
expect(repeatTop3 >= activationTargets.top3HitRate, '40-candidate repeat must retain the measured top-three pass')
expect(firstRepeat?.retrieval?.queryLatencyP95Ms > activationTargets.queryLatencyP95Ms, '40-candidate repeat must retain the latency blocker')

const fastTop3 = fast?.retrieval?.top3HitCount / fast?.retrieval?.queryCount
expect(fast?.retrieval?.candidatePoolSize === 20, 'fast comparison must score 20 chunks')
expect(fast?.pairScorer?.batchSize === 20, 'fast comparison must use batch size 20')
expect(fast?.retrieval?.queryLatencyP95Ms <= activationTargets.queryLatencyP95Ms, 'fast comparison must retain the measured latency pass')
expect(fast?.retrieval?.recallAt10 < activationTargets.overallRecallAt10, 'fast comparison must retain the overall-recall blocker')
expect(fast?.retrieval?.contextQueries?.recallAt10 < activationTargets.contextRecallAt10, 'fast comparison must retain the context-recall blocker')
expect(fast?.retrieval?.latestEvidenceQueries?.recallAt10 < activationTargets.latestEvidenceRecallAt10, 'fast comparison must retain the latest-evidence blocker')
expect(fastTop3 < activationTargets.top3HitRate, 'fast comparison must retain the top-three blocker')

const [pool24, pool28] = intermediate
for (const [receipt, expectedPool] of [[pool24, 24], [pool28, 28]]) {
  expect(receipt?.retrieval?.candidatePoolSize === expectedPool, `intermediate comparison must score ${expectedPool} chunks`)
  expect(receipt?.pairScorer?.batchSize === expectedPool, `intermediate comparison must use batch size ${expectedPool}`)
  expect(receipt?.retrieval?.contextQueries?.recallAt10 < activationTargets.contextRecallAt10, `pool ${expectedPool} must retain the context-recall blocker`)
}
expect(pool24?.retrieval?.queryLatencyP95Ms <= activationTargets.queryLatencyP95Ms, 'pool 24 must retain the measured latency pass')
expect(pool24?.retrieval?.recallAt10 < activationTargets.overallRecallAt10, 'pool 24 must retain the overall-recall blocker')
expect(pool28?.retrieval?.recallAt10 >= activationTargets.overallRecallAt10, 'pool 28 must retain the measured overall-recall pass')
expect(pool28?.retrieval?.queryLatencyP95Ms > activationTargets.queryLatencyP95Ms, 'pool 28 must retain the latency blocker')

expect(compatibilityAudit.schemaVersion === 1, 'community compatibility audit schemaVersion must be 1')
expect(compatibilityAudit.status === 'community_candidates_measured_no_activation_change', 'community compatibility audit status drifted')
expect(compatibilityAudit.scope?.fromChapter === 1 && compatibilityAudit.scope?.toChapter === 20, 'community compatibility audit must remain inside Chapters 1-20')
expect(compatibilityAudit.scope?.chapter21ManuscriptReadOrChanged === false, 'community compatibility audit must not access Chapter 21')
expect(compatibilityAudit.scope?.manuscriptOrQueryTextCopiedIntoReceipt === false, 'community compatibility audit must not copy private text')
const gte = compatibilityAudit.candidates?.find(candidate => candidate.id === 'onnx-community/gte-multilingual-reranker-base')
expect(gte?.baseModelLicense === 'Apache-2.0', 'GTE license evidence drifted')
expect(gte?.onnxRevision === '5807a06097ed1e68331fec2201751ccaf356d96b', 'GTE ONNX revision drifted')
expect(gte?.modelQuantizedSha256 === 'ccf51dba7f8aa9205753761cfaa68c55f741792501463a3bf25d7e5bcdac7c35', 'GTE ONNX hash drifted')
expect(gte?.runtimeProbe?.result === 'rejected_runtime_incompatible', 'GTE runtime incompatibility evidence drifted')
expect(gte?.runtimeProbe?.errorMessage === 'Unsupported model type: new', 'GTE runtime error evidence drifted')
expect(gte?.integrated === false && gte?.automaticRetrievalEnabled === false, 'GTE must remain rejected and inactive')
const jina = compatibilityAudit.candidates?.find(candidate => candidate.id === 'jinaai/jina-reranker-v2-base-multilingual')
expect(jina?.baseModelLicense === 'CC-BY-NC-4.0', 'Jina noncommercial license evidence drifted')
expect(jina?.runtimeProbe?.result === 'rejected_noncommercial_license', 'Jina must remain rejected before runtime')
expect(jina?.integrated === false && jina?.automaticRetrievalEnabled === false, 'Jina must remain rejected and inactive')
expect(compatibilityAudit.decision?.candidateMeetingAllFrozenTargets === null, 'compatibility audit must not invent a passing candidate')
expect(compatibilityAudit.decision?.automaticRetrievalEnabled === false, 'compatibility audit must keep automatic retrieval disabled')
for (const boundary of ['workspaceChanged', 'acceptedManuscriptChanged', 'canonChanged', 'chapter21ManuscriptReadOrChanged', 'cloudDataChanged', 'publicationPerformed']) {
  expect(compatibilityAudit.sideEffects?.[boundary] === false, `compatibility audit ${boundary} must remain false`)
}

if (failures.length) {
  console.error('[creator-rag-bge-base-comparison] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[creator-rag-bge-base-comparison] PASS (repeat-stable quality/latency tradeoff, automatic recall remains disabled)')
console.log(JSON.stringify({
  status: 'quality_latency_tradeoff_not_activated',
  repeat40: {
    recallAt10: firstRepeat.retrieval.recallAt10,
    contextRecallAt10: firstRepeat.retrieval.contextQueries.recallAt10,
    latestEvidenceRecallAt10: firstRepeat.retrieval.latestEvidenceQueries.recallAt10,
    top3HitRate: repeatTop3,
    queryLatencyP95Ms: firstRepeat.retrieval.queryLatencyP95Ms,
  },
  pool20: {
    recallAt10: fast.retrieval.recallAt10,
    contextRecallAt10: fast.retrieval.contextQueries.recallAt10,
    latestEvidenceRecallAt10: fast.retrieval.latestEvidenceQueries.recallAt10,
    top3HitRate: fastTop3,
    queryLatencyP95Ms: fast.retrieval.queryLatencyP95Ms,
  },
  pool24: {
    recallAt10: pool24.retrieval.recallAt10,
    contextRecallAt10: pool24.retrieval.contextQueries.recallAt10,
    latestEvidenceRecallAt10: pool24.retrieval.latestEvidenceQueries.recallAt10,
    top3HitRate: pool24.retrieval.top3HitCount / pool24.retrieval.queryCount,
    queryLatencyP95Ms: pool24.retrieval.queryLatencyP95Ms,
  },
  pool28: {
    recallAt10: pool28.retrieval.recallAt10,
    contextRecallAt10: pool28.retrieval.contextQueries.recallAt10,
    latestEvidenceRecallAt10: pool28.retrieval.latestEvidenceQueries.recallAt10,
    top3HitRate: pool28.retrieval.top3HitCount / pool28.retrieval.queryCount,
    queryLatencyP95Ms: pool28.retrieval.queryLatencyP95Ms,
  },
  automaticRetrievalEnabled: false,
}, null, 2))
