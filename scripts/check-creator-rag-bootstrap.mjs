#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const failures = []

function read(path) {
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) {
    failures.push(`missing ${path}`)
    return ''
  }
  return readFileSync(absolute, 'utf8')
}

function requireAll(path, markers) {
  const source = read(path)
  for (const marker of markers) {
    if (!source.includes(marker)) failures.push(`${path} missing ${marker}`)
  }
}

const receiptPath = 'validation/creator-rag/langchain-textsplitters-1.0.1-receipt.json'
const receipt = JSON.parse(read(receiptPath) || '{}')
if (receipt.package !== '@langchain/textsplitters' || receipt.version !== '1.0.1' || receipt.license !== 'MIT') {
  failures.push(`${receiptPath} must freeze the reviewed package, version, and license`)
}
for (const [key, expected] of Object.entries({
  automaticRetrievalEnabled: false,
  embeddingModelInstalled: false,
  vectorStoreInstalled: false,
  privateDraftUploadAllowed: false,
  customRetrievalAlgorithmAllowed: false,
})) {
  if (receipt.activationBoundary?.[key] !== expected) failures.push(`${receiptPath} must keep ${key}=false`)
}

const retrievalReceiptPath = 'validation/creator-rag/open-source-local-retrieval-dependencies-2026-07-17.json'
const retrievalReceipt = JSON.parse(read(retrievalReceiptPath) || '{}')
if (retrievalReceipt.status !== 'packages_and_model_runtime_verified_baseline_measured') {
  failures.push(`${retrievalReceiptPath} must record the verified package and model baseline`)
}
if (retrievalReceipt.embeddingModel?.runtimeVerified !== true) {
  failures.push(`${retrievalReceiptPath} must record the verified embedding runtime`)
}
if (retrievalReceipt.embeddingModel?.artifactChecksum?.modelQuantizedSha256 !== 'f80102d3f2a1229f387d3c81909990d8945513e347b0eab049f7de3c6f98c193') {
  failures.push(`${retrievalReceiptPath} must freeze the reviewed q8 ONNX checksum`)
}
if (retrievalReceipt.embeddingModel?.artifactChecksum?.tokenizerSha256 !== '0b44a9d7b51c3c62626640cda0e2c2f70fdacdc25bbbd68038369d14ebdf4c39') {
  failures.push(`${retrievalReceiptPath} must freeze the reviewed tokenizer checksum`)
}
if (retrievalReceipt.activationBoundary?.automaticRetrievalEnabled !== false) {
  failures.push(`${retrievalReceiptPath} must keep automatic retrieval disabled`)
}
if (retrievalReceipt.activationBoundary?.qualityBaselineRecorded !== true) {
  failures.push(`${retrievalReceiptPath} must point to the measured frozen baseline`)
}

const benchmarkReceiptPath = 'validation/creator-rag/local-hybrid-benchmark-2026-07-17.json'
const benchmarkReceipt = JSON.parse(read(benchmarkReceiptPath) || '{}')
if (benchmarkReceipt.status !== 'measured_not_activated' || benchmarkReceipt.fixture?.queryCount !== 30) {
  failures.push(`${benchmarkReceiptPath} must contain the measured 30-query baseline`)
}
for (const [key, expected] of Object.entries({
  wrongWorkLeakageCount: 0,
  wrongBranchLeakageCount: 0,
  futureChapterLeakageCount: 0,
  sourceLocatorCoverage: 1,
  manualSelectionInclusion: 1,
})) {
  if (benchmarkReceipt.metrics?.[key] !== expected) failures.push(`${benchmarkReceiptPath} must keep ${key}=${expected}`)
}
if (benchmarkReceipt.activation?.automaticRetrievalEnabled !== false) {
  failures.push(`${benchmarkReceiptPath} must remain measured but not activated`)
}

const realEvidenceReceiptPath = 'validation/creator-rag/real-thread-evidence-benchmark-2026-07-17.json'
const realEvidenceReceipt = JSON.parse(read(realEvidenceReceiptPath) || '{}')
if (
  realEvidenceReceipt.status !== 'real_verified_thread_evidence_measured_not_activated'
  || realEvidenceReceipt.source?.fromChapter !== 1
  || realEvidenceReceipt.source?.toChapter !== 20
  || realEvidenceReceipt.source?.chapterCount !== 20
  || realEvidenceReceipt.source?.independentlyVerifiedThreadCount !== 13
) {
  failures.push(`${realEvidenceReceiptPath} must identify the reviewed Chapter 1-20 thread-evidence set`)
}
if (
  realEvidenceReceipt.source?.manuscriptOrEvidenceTextCopiedIntoReceipt !== false
  || realEvidenceReceipt.source?.threadLabelsCopiedIntoReceipt !== false
) {
  failures.push(`${realEvidenceReceiptPath} must remain a hash-and-metrics-only receipt`)
}
for (const [key, expected] of Object.entries({
  recallAt10: 1,
  top3HitCount: 13,
  wrongWorkLeakageCount: 0,
  wrongBranchLeakageCount: 0,
  futureChapterLeakageCount: 0,
  sourceLocatorCoverage: 1,
  manualSelectionInclusion: 1,
})) {
  if (realEvidenceReceipt.retrieval?.[key] !== expected) failures.push(`${realEvidenceReceiptPath} must keep ${key}=${expected}`)
}
for (const key of [
  'workspaceChanged',
  'acceptedManuscriptChanged',
  'canonChanged',
  'chapter21AccessedOrChanged',
  'cloudDataChanged',
  'publicationPerformed',
  'automaticRetrievalEnabled',
]) {
  if (realEvidenceReceipt.sideEffects?.[key] !== false) failures.push(`${realEvidenceReceiptPath} must keep ${key}=false`)
}

const appManifest = JSON.parse(read('app/package.json') || '{}')
if (appManifest.dependencies?.['@langchain/textsplitters'] !== '1.0.1') {
  failures.push('app/package.json must pin @langchain/textsplitters to 1.0.1')
}
for (const [dependency, version] of Object.entries({
  '@lancedb/lancedb': '0.31.0',
  '@huggingface/transformers': '4.2.0',
})) {
  if (appManifest.dependencies?.[dependency] !== version) failures.push(`app/package.json must pin ${dependency} to ${version}`)
}

requireAll('scripts/fixtures/creator-rag-frozen-benchmark.mts', [
  "'causal'",
  "'character_knowledge'",
  "'timeline'",
  "'promise'",
  'decoy:wrong-work-black-mark',
  'decoy:wrong-branch-key',
  'decoy:future-chapter-signal',
])
requireAll('app/src/integrations/creator-rag/creatorChineseTextSplitter.ts', [
  '@langchain/textsplitters',
  'RecursiveCharacterTextSplitter',
  'creatorChineseTextSeparators',
  'sourceLocatorLabel',
  'CreatorRagMemoryGroup',
  "memoryGroup: source.memoryGroup ?? 'unclassified'",
  'lengthFunction: text => Array.from(text).length',
])
requireAll('app/src/integrations/creator-rag/creatorLocalEmbedding.ts', [
  "id: 'Xenova/multilingual-e5-small'",
  "baseModelId: 'intfloat/multilingual-e5-small'",
  "revision: '761b726'",
  "dtype: 'q8'",
  "id: 'Xenova/bge-small-zh-v1.5'",
  "baseModelId: 'BAAI/bge-small-zh-v1.5'",
  "revision: '75c43b069aac4d136ba6bc1122f995fedcfd2781'",
  "dimensions: 512",
  "modelQuantizedSha256: '15b717c382bcb518ba457b93ea6850ede7f4f1cd8937454aa06972366cd19bcc'",
  "queryPrefix: '为这个句子生成表示以用于检索相关文章：'",
  "revision: '252d0dcb679dda2c7b6fd5bbfed15df3c7feaebf'",
  'modelQuantizedSha256',
  'tokenizerSha256',
  "pooling: 'mean'",
  'normalize: true',
  '`${model.passagePrefix}${text}`',
  '`${model.queryPrefix}${text}`',
  'model?: CreatorRagEmbeddingModelConfig',
  'localModelPath?: string',
  'localFilesOnly?: boolean',
  'const pretrainedModelPath = options.localModelPath ?? model.id',
  'local_files_only: options.localFilesOnly',
])
requireAll('app/src/integrations/creator-rag/creatorLocalBgePairScorer.ts', [
  "id: 'Xenova/bge-reranker-base'",
  "baseModelId: 'BAAI/bge-reranker-base'",
  "revision: '280bcc27a84e0b898c251e06fddb25171bd9b101'",
  "modelQuantizedSha256: 'dd98f3e67837d23210a6b7550c08cced4f61845b940ac45be3565840a10f3244'",
  "modelLicense: 'MIT'",
  'localModelPath?: string',
  'localFilesOnly?: boolean',
  'const pretrainedModelPath = options.localModelPath ?? modelConfig.id',
  'local_files_only: options.localFilesOnly',
])
requireAll('app/src/integrations/creator-rag/creatorLanceDbRetriever.ts', [
  '@lancedb/lancedb',
  "baseTokenizer: 'ngram'",
  'RRFReranker.create()',
  '.fullTextSearch(query.text',
  '.where(buildMetadataFilter(query))',
  'allowedMemoryGroups',
  'memoryGroup IN',
  '.rerank(rrf)',
  'appendManualHardIncludes',
])
requireAll('app/src/integrations/creator-rag/creatorShadowRecallService.ts', [
  "status: 'shadow_only'",
  "status: 'confirmed_not_applied'",
  "selectionState: 'unselected'",
  'authorSelectionRequired: true',
  'automaticSelectionApplied: false',
  'contextSnapshotChanged: false',
  'draftChanged: false',
  'canonChanged: false',
  'publicationPerformed: false',
  'shadow recall retriever dropped a manual hard include',
  'shadow recall result metadata does not match its source',
  'shadow recall selection requires explicit author confirmation',
  'shadow recall selection source revision or metadata is stale',
  'confirmCreatorShadowRecallSelection',
])
requireAll('scripts/test-creator-rag-lancedb-wiring.mts', [
  'createCreatorLanceDbRetriever',
  'createCreatorShadowRecallService',
  'confirmCreatorShadowRecallSelection',
  'manualSelectedSourceIds',
  "allowedMemoryGroups: ['causal']",
  'LanceDB memory-group prefilter leaked',
  "proposal.status !== 'shadow_only'",
  'upstream API wiring only; no retrieval-quality claim',
])
requireAll('app/tests/creator-shadow-recall-service.ts', [
  'buildCreatorShadowRecallProposal',
  'createCreatorShadowRecallService',
  'confirmCreatorShadowRecallSelection',
  "confirmedSelection.status, 'confirmed_not_applied'",
  /future chapter/.source,
  'dropped a manual hard include',
  'revision or metadata is stale',
  'explicit author confirmation',
  "console.log('[creator-shadow-recall-service] PASS",
])
requireAll('app/src/apps/creator/routes/creatorEditorShadowRecallContextService.ts', [
  'applyConfirmedShadowRecallToContextSource',
  'compileContextWithConfirmedShadowRecall',
  'confirmed and unapplied shadow recall selection',
  'confirmed shadow recall conflicts with the current manifest',
  'author_confirmed_shadow_recall:',
  'compileContextSnapshot',
])
requireAll('app/src/apps/creator/routes/creatorEditorShadowRecallQueryService.ts', [
  'buildCreatorRecallNeedQueries',
  'proposeCreatorShadowRecallBatch',
  "'causal'",
  "'character_knowledge'",
  "'timeline'",
  "'promise'",
  'requires the author current prompt',
  'requires a locked author intent',
  'crossGroupFusionPerformed: false',
  'automaticSelectionApplied: false',
])
requireAll('app/tests/creator-shadow-recall-context.ts', [
  'applyConfirmedShadowRecallToContextSource',
  'compileContextWithConfirmedShadowRecall',
  'application must not mutate the caller source',
  'source:unselected',
  'conflicts with the current manifest',
  'inconsistent selected-source counts',
  "console.log('[creator-shadow-recall-context] PASS",
])
requireAll('app/tests/creator-shadow-recall-query.ts', [
  'buildCreatorRecallNeedQueries',
  'proposeCreatorShadowRecallBatch',
  "['causal', 'character_knowledge', 'timeline', 'promise']",
  'batch.crossGroupFusionPerformed, false',
  'batch.automaticSelectionApplied, false',
  'duplicate memory groups',
  'locked author intent',
  "console.log('[creator-shadow-recall-query] PASS",
])
requireAll('scripts/run-creator-rag-local-benchmark.mts', [
  'createCreatorLocalEmbeddingModel',
  'createCreatorLanceDbRetriever',
  'evaluateCreatorRagBenchmark',
  'wrong-work leakage must remain zero',
  "status: 'measured_not_activated'",
  'modelArtifactChecksum: {',
])
requireAll('scripts/run-creator-rag-real-thread-evidence-benchmark.mts', [
  'independentlyVerifiedThreadCount: 13',
  'manuscriptOrEvidenceTextCopiedIntoReceipt: false',
  'threadLabelsCopiedIntoReceipt: false',
  "status: 'real_verified_thread_evidence_measured_not_activated'",
  'chapter21AccessedOrChanged: false',
  'automaticRetrievalEnabled: false',
  "flag: 'wx'",
])
requireAll('scripts/run-creator-rag-full-manuscript-benchmark.mts', [
  "'bge-base-chunks'",
  "embedding: { type: 'string', default: 'multilingual-e5-small' }",
  "embeddingMode === 'multilingual-e5-small' || embeddingMode === 'bge-small-zh-v1.5'",
  'embeddingModel.id',
  'embeddingModelSource.revision',
  'pairModel.id',
  'localModelPath: embeddingModelRoot',
  'localModelPath: pairModelRoot!',
  'localFilesOnly: true',
  'rankingDigestSha256',
  'evaluationDigestSha256',
])
const fullManuscriptRunner = read('scripts/run-creator-rag-full-manuscript-benchmark.mts')
if (fullManuscriptRunner.includes('findFile(')) {
  failures.push('full-manuscript benchmark must not use broad cache filename discovery')
}
requireAll('scripts/test-creator-rag-bootstrap.mts', [
  'exactly 30 queries',
  'wrong-work leakage decoy',
  'wrong-branch leakage decoy',
  'future-chapter leakage decoy',
  'manual hard-includes',
  'chunk.metadata.memoryGroup',
  "console.log(`[creator-rag-bootstrap] PASS",
])
requireAll('scripts/creator-rag-benchmark-evaluator.mts', [
  'recallAt10',
  'precisionAt3',
  'wrongWorkLeakageCount',
  'wrongBranchLeakageCount',
  'futureChapterLeakageCount',
  'sourceLocatorCoverage',
  'manualSelectionInclusion',
])
requireAll('scripts/test-creator-rag-benchmark-evaluator.mts', [
  'decoy:wrong-work-black-mark',
  'decoy:wrong-branch-key',
  'decoy:future-chapter-signal',
  "console.log('[creator-rag-benchmark-evaluator] PASS')",
])

if (failures.length) {
  console.error('[creator-rag-bootstrap] FAIL')
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('[creator-rag-bootstrap] PASS (dependency, receipt, fixture, and thin adapter contracts)')
