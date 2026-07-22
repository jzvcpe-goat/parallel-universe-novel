import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { parseArgs } from 'node:util'

import { strFromU8, unzipSync } from 'fflate'

import { localCanonStateRecordSchema } from '../app/src/features/creator-decision/schemas.ts'
import {
  createCreatorLocalBgePairScorer,
  creatorRagBgeBasePairModel,
  creatorRagBgeBaseVerifiedSource,
  creatorRagBgePairModel,
  creatorRagBgeVerifiedModelScopeMirror,
} from '../app/src/integrations/creator-rag/creatorLocalBgePairScorer.ts'
import { createCreatorLanceDbRetriever } from '../app/src/integrations/creator-rag/creatorLanceDbRetriever.ts'
import {
  createCreatorLocalEmbeddingModel,
  creatorRagBgeSmallZhEmbeddingModel,
  creatorRagBgeSmallZhVerifiedSource,
  creatorRagEmbeddingModel,
  creatorRagVerifiedModelScopeMirror,
} from '../app/src/integrations/creator-rag/creatorLocalEmbedding.ts'
import { evaluateCreatorRagBenchmark } from './creator-rag-benchmark-evaluator.mts'
import type {
  CreatorRagBenchmarkGroup,
  CreatorRagBenchmarkQuery,
  CreatorRagBenchmarkSource,
} from './fixtures/creator-rag-frozen-benchmark.mts'

interface WorkspaceRecord {
  family: string
  id: string
  value: unknown
}

interface WorkspaceExport {
  schemaVersion: number
  records: WorkspaceRecord[]
}

interface ManuscriptInventoryItem {
  chapter: number
  acceptedBlockCount: number
  visibleLength: number
  manuscriptSha256: string
}

interface RealThread {
  threadId: string
  dimension: string
  sourceChapter: number
  sourceEvidenceQuote: string
  latestEvidence: { chapter: number; quote: string; meaning: string } | null
  whyItMatters: string
}

interface RealThreadVerification {
  threadId: string
  decision: 'verify' | 'reject'
  sourceEvidenceQuote: string
  latestEvidenceQuote: string | null
  rationale: string
}

interface RealThreadPass {
  review: { threads: RealThread[] }
  verification: { threadItems: RealThreadVerification[] }
}

const defaultInventorySummary = 'validation/creator-ui/conversation-recall-2026-07-14/chapter-01-20-continuity-campaign-verified-2026-07-16/summary.json'
const defaultThreadSummary = 'validation/creator-ui/conversation-recall-2026-07-14/chapter-01-20-long-range-story-threads-reconciled-2026-07-16/summary.json'
const defaultReceipt = 'validation/creator-rag/full-manuscript-thread-benchmark-2026-07-17.json'
const defaultBaselineReceipt = defaultReceipt
const workId = 'work-arad-wayfarer'

const { values } = parseArgs({
  options: {
    workspace: { type: 'string' },
    inventorySummary: { type: 'string', default: defaultInventorySummary },
    threadSummary: { type: 'string', default: defaultThreadSummary },
    ledger: { type: 'string' },
    receipt: { type: 'string', default: defaultReceipt },
    reranker: { type: 'string' },
    baselineReceipt: { type: 'string', default: defaultBaselineReceipt },
    pairBatchSize: { type: 'string', default: '8' },
    chunkLimit: { type: 'string', default: '40' },
    embedding: { type: 'string', default: 'multilingual-e5-small' },
  },
  strict: true,
})

function required(name: keyof typeof values) {
  const value = values[name]
  if (!value) throw new Error(`Missing required --${name} argument.`)
  return value
}

function sha256(value: Uint8Array | string) {
  return createHash('sha256').update(value).digest('hex')
}

async function sha256File(path: string) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

function chapterNumber(chapterId: string) {
  const match = chapterId.match(/:chapter:(\d+)$/u)
  return match ? Number(match[1]) : null
}

function visibleLength(text: string) {
  return Array.from(text).filter(character => !/\s/u.test(character)).length
}

function benchmarkGroup(dimension: string): CreatorRagBenchmarkGroup {
  if (dimension === 'causal_debt') return 'causal'
  if (dimension === 'character_knowledge') return 'character_knowledge'
  if (dimension === 'timeline_anchor') return 'timeline'
  return 'promise'
}

const workspacePath = required('workspace')
const inventorySummaryPath = required('inventorySummary')
const threadSummaryPath = required('threadSummary')
const receiptPath = required('receipt')
const rerankerMode = values.reranker ?? 'lancedb-rrf'
const embeddingMode = values.embedding ?? 'multilingual-e5-small'
assert.ok(
  rerankerMode === 'lancedb-rrf'
    || rerankerMode === 'bge-v2-m3'
    || rerankerMode === 'bge-v2-m3-chunks'
    || rerankerMode === 'bge-base-chunks',
  `Unsupported --reranker ${rerankerMode}`,
)
assert.ok(
  embeddingMode === 'multilingual-e5-small' || embeddingMode === 'bge-small-zh-v1.5',
  `Unsupported --embedding ${embeddingMode}`,
)
function positiveInteger(value: string | undefined, label: string) {
  const parsed = Number(value)
  assert.ok(Number.isInteger(parsed) && parsed > 0, `${label} must be a positive integer`)
  return parsed
}
const useBgePairScorer = rerankerMode !== 'lancedb-rrf'
const useChunkCandidates = rerankerMode.endsWith('-chunks')
const useBgeBase = rerankerMode === 'bge-base-chunks'
const pairBatchSize = positiveInteger(values.pairBatchSize, '--pairBatchSize')
const chunkLimit = positiveInteger(values.chunkLimit, '--chunkLimit')
const pairModel = useBgeBase ? creatorRagBgeBasePairModel : creatorRagBgePairModel
const pairModelSource = useBgeBase
  ? creatorRagBgeBaseVerifiedSource
  : creatorRagBgeVerifiedModelScopeMirror
const useAlternativeEmbedding = embeddingMode === 'bge-small-zh-v1.5'
const embeddingModel = useAlternativeEmbedding
  ? creatorRagBgeSmallZhEmbeddingModel
  : creatorRagEmbeddingModel
const embeddingModelSource = useAlternativeEmbedding
  ? creatorRagBgeSmallZhVerifiedSource
  : creatorRagVerifiedModelScopeMirror
const [workspaceBytes, inventorySummaryBytes, threadSummaryBytes] = await Promise.all([
  readFile(workspacePath),
  readFile(inventorySummaryPath),
  readFile(threadSummaryPath),
])
const workspaceHashBefore = sha256(workspaceBytes)
const inventorySummary = JSON.parse(inventorySummaryBytes.toString('utf8')) as {
  scope?: { workId?: string; fromChapter?: number; toChapter?: number; chapterCount?: number; workspaceArchiveSha256?: string }
  manuscriptInventory?: ManuscriptInventoryItem[]
  sideEffects?: { chapter21AccessedOrChanged?: boolean }
}
const threadSummary = JSON.parse(threadSummaryBytes.toString('utf8')) as {
  scope?: { workId?: string; fromChapter?: number; toChapter?: number; chapterCount?: number; workspaceArchiveSha256?: string }
  runtime?: { privateArtifactsDirectory?: string }
  results?: { verifiedThreadCount?: number }
  sideEffects?: { chapter21AccessedOrChanged?: boolean }
}
for (const summary of [inventorySummary, threadSummary]) {
  assert.equal(summary.scope?.workId, workId)
  assert.equal(summary.scope?.fromChapter, 1)
  assert.equal(summary.scope?.toChapter, 20)
  assert.equal(summary.scope?.chapterCount, 20)
  assert.equal(summary.scope?.workspaceArchiveSha256, workspaceHashBefore)
  assert.equal(summary.sideEffects?.chapter21AccessedOrChanged, false)
}
assert.equal(threadSummary.results?.verifiedThreadCount, 13)
assert.equal(inventorySummary.manuscriptInventory?.length, 20)

const archive = unzipSync(new Uint8Array(workspaceBytes))
const recordsBytes = archive['records.json']
assert.ok(recordsBytes, 'Workspace archive must contain records.json.')
const workspace = JSON.parse(strFromU8(recordsBytes)) as WorkspaceExport
assert.equal(workspace.schemaVersion, 1)
assert.ok(Array.isArray(workspace.records))

const canonByChapter = new Map<number, ReturnType<typeof localCanonStateRecordSchema.parse>>()
let postStopLineRecordCount = 0
for (const record of workspace.records) {
  if (record.family !== 'localCanonStates' || !record.value || typeof record.value !== 'object') continue
  const raw = record.value as { workId?: unknown; chapterId?: unknown; acceptedContentBlocks?: unknown[] }
  if (raw.workId !== workId || typeof raw.chapterId !== 'string') continue
  const number = chapterNumber(raw.chapterId)
  if (!number) continue
  if (number > 20) {
    postStopLineRecordCount += 1
    assert.equal(raw.acceptedContentBlocks?.length ?? 0, 0, 'Post-stop-line Canon records must not contain manuscript blocks.')
    continue
  }
  const canon = localCanonStateRecordSchema.parse(record.value)
  const existing = canonByChapter.get(number)
  if (!existing || canon.revision > existing.revision) canonByChapter.set(number, canon)
}

const inventoryByChapter = new Map(inventorySummary.manuscriptInventory!.map(item => [item.chapter, item]))
const sources: CreatorRagBenchmarkSource[] = []
const chapterTextByNumber = new Map<number, string>()
const branchIds = new Set<string>()
let totalVisibleLength = 0
let totalBlockCount = 0
for (let number = 1; number <= 20; number += 1) {
  const canon = canonByChapter.get(number)
  const inventory = inventoryByChapter.get(number)
  assert.ok(canon, `Chapter ${number} is missing a local Canon record.`)
  assert.ok(inventory, `Chapter ${number} is missing from the frozen manuscript inventory.`)
  assert.ok(canon.acceptedDraftRevision > 0, `Chapter ${number} has no accepted draft revision.`)
  assert.ok(canon.acceptedContentBlocks.length > 0, `Chapter ${number} has no accepted manuscript.`)
  const manuscript = canon.acceptedContentBlocks.map(block => block.text).join('\n')
  assert.equal(canon.acceptedContentBlocks.length, inventory.acceptedBlockCount)
  assert.equal(visibleLength(manuscript), inventory.visibleLength)
  assert.equal(sha256(manuscript), inventory.manuscriptSha256)
  branchIds.add(canon.branchId)
  chapterTextByNumber.set(number, manuscript)
  totalVisibleLength += inventory.visibleLength
  totalBlockCount += inventory.acceptedBlockCount
  sources.push({
    id: `canon-chapter:${number}`,
    workId,
    branchId: canon.branchId,
    chapterNo: number,
    authority: 'canon',
    memoryGroup: 'unclassified',
    revision: canon.revision,
    locator: {
      recordId: canon.id,
      label: `本机正史第 ${number} 章`,
    },
    text: manuscript,
  })
}
assert.equal(branchIds.size, 1, 'The frozen Chapters 1-20 must belong to one branch.')
const branchId = [...branchIds][0]!

const ledgerPath = values.ledger
  ?? join(requiredThreadDirectory(threadSummary.runtime?.privateArtifactsDirectory), 'thread-ledger.json')
function requiredThreadDirectory(value: string | undefined) {
  assert.ok(value, 'The thread summary must locate its private artifact directory or --ledger must be provided.')
  return value
}
const ledgerBytes = await readFile(ledgerPath)
const passes = JSON.parse(ledgerBytes.toString('utf8')) as RealThreadPass[]
assert.equal(passes.length, 2)

const queries: CreatorRagBenchmarkQuery[] = []
const dimensionCounts: Record<string, number> = {}
let threadIndex = 0
let locatedSourceQuoteCount = 0
let locatedLatestQuoteCount = 0
for (const pass of passes) {
  const verificationByThreadId = new Map(pass.verification.threadItems.map(item => [item.threadId, item]))
  for (const thread of pass.review.threads) {
    const verification = verificationByThreadId.get(thread.threadId)
    assert.ok(verification, 'Every thread must have an independent verification item.')
    assert.equal(verification.decision, 'verify')
    assert.equal(verification.sourceEvidenceQuote, thread.sourceEvidenceQuote)
    assert.equal(verification.latestEvidenceQuote, thread.latestEvidence?.quote ?? null)
    assert.ok(thread.whyItMatters.trim())
    const sourceManuscript = chapterTextByNumber.get(thread.sourceChapter)
    assert.ok(sourceManuscript?.includes(thread.sourceEvidenceQuote), 'Source thread evidence must exist in its Canon chapter.')
    locatedSourceQuoteCount += 1
    const expectedContextSources = new Set([`canon-chapter:${thread.sourceChapter}`])
    if (thread.latestEvidence) {
      const latestManuscript = chapterTextByNumber.get(thread.latestEvidence.chapter)
      assert.ok(latestManuscript?.includes(thread.latestEvidence.quote), 'Latest thread evidence must exist in its Canon chapter.')
      locatedLatestQuoteCount += 1
      expectedContextSources.add(`canon-chapter:${thread.latestEvidence.chapter}`)
    }
    const group = benchmarkGroup(thread.dimension)
    queries.push({
      id: `query:full-thread:${threadIndex}:context`,
      group,
      workId,
      branchId,
      currentChapterNo: 20,
      query: thread.whyItMatters,
      expectedSourceIds: [...expectedContextSources],
      manualSelectedSourceIds: [],
    }, {
      id: `query:full-thread:${threadIndex}:source-evidence`,
      group,
      workId,
      branchId,
      currentChapterNo: 20,
      query: thread.sourceEvidenceQuote,
      expectedSourceIds: [`canon-chapter:${thread.sourceChapter}`],
      manualSelectedSourceIds: threadIndex % 4 === 0 ? [`canon-chapter:${thread.sourceChapter}`] : [],
    })
    if (thread.latestEvidence) {
      queries.push({
        id: `query:full-thread:${threadIndex}:latest-evidence`,
        group,
        workId,
        branchId,
        currentChapterNo: 20,
        query: thread.latestEvidence.meaning || thread.latestEvidence.quote,
        expectedSourceIds: [`canon-chapter:${thread.latestEvidence.chapter}`],
        manualSelectedSourceIds: [],
      })
    }
    dimensionCounts[thread.dimension] = (dimensionCounts[thread.dimension] ?? 0) + 1
    threadIndex += 1
  }
}
assert.equal(threadIndex, 13)
assert.ok(queries.length >= 30, 'The real full-manuscript benchmark requires at least 30 frozen queries.')

sources.push(
  {
    id: 'decoy:full-manuscript-wrong-work',
    workId: 'work:wrong',
    branchId,
    chapterNo: 1,
    authority: 'derived',
    memoryGroup: 'unclassified',
    revision: 1,
    locator: { recordId: 'decoy:wrong-work', label: '错误作品诱饵' },
    text: '错误作品中的因果、人物知识、时间和承诺不得进入当前作品召回。',
  },
  {
    id: 'decoy:full-manuscript-wrong-branch',
    workId,
    branchId: 'branch:discarded-if',
    chapterNo: 10,
    authority: 'derived',
    memoryGroup: 'unclassified',
    revision: 1,
    locator: { recordId: 'decoy:wrong-branch', label: '错误支线诱饵' },
    text: '废弃支线中的人物知识和承诺不得进入主线召回。',
  },
  {
    id: 'decoy:full-manuscript-future-scope',
    workId,
    branchId,
    chapterNo: 99,
    authority: 'author',
    memoryGroup: 'unclassified',
    revision: 1,
    locator: { recordId: 'decoy:future-scope', label: '未来范围诱饵' },
    text: '这是一条不属于当前二十章范围的测试诱饵，不是小说章节内容。',
  },
)

const databasePath = await mkdtemp(join(tmpdir(), 'creator-rag-full-manuscript-'))
const modelCachePath = process.env.CREATOR_RAG_MODEL_CACHE
  ?? join(homedir(), '.cache', 'parallel-universe-novel', 'creator-rag')
let embedder: Awaited<ReturnType<typeof createCreatorLocalEmbeddingModel>> | null = null
let retriever: Awaited<ReturnType<typeof createCreatorLanceDbRetriever>> | null = null
let pairScorer: Awaited<ReturnType<typeof createCreatorLocalBgePairScorer>> | null = null

try {
  const embeddingModelRoot = join(
    modelCachePath,
    embeddingModel.id,
    embeddingModelSource.revision,
  )
  const modelPath = join(embeddingModelRoot, 'onnx', 'model_quantized.onnx')
  const tokenizerPath = join(embeddingModelRoot, 'tokenizer.json')
  const embeddingModelArtifacts = {
    modelQuantizedSha256: await sha256File(modelPath),
    tokenizerSha256: await sha256File(tokenizerPath),
    ...('configSha256' in embeddingModelSource ? {
      configSha256: await sha256File(join(embeddingModelRoot, 'config.json')),
      tokenizerConfigSha256: await sha256File(join(embeddingModelRoot, 'tokenizer_config.json')),
    } : {}),
  }
  assert.deepEqual(embeddingModelArtifacts, {
    modelQuantizedSha256: embeddingModelSource.modelQuantizedSha256,
    tokenizerSha256: embeddingModelSource.tokenizerSha256,
    ...('configSha256' in embeddingModelSource ? {
      configSha256: embeddingModelSource.configSha256,
      tokenizerConfigSha256: embeddingModelSource.tokenizerConfigSha256,
    } : {}),
  })

  let pairModelArtifacts: Record<string, string> | null = null
  const pairModelRoot = useBgePairScorer
    ? join(modelCachePath, pairModel.id, pairModelSource.revision)
    : null
  if (useBgePairScorer) {
    assert.ok(pairModelRoot)
    const pairModelPath = join(pairModelRoot, 'onnx', 'model_quantized.onnx')
    const pairConfigPath = join(pairModelRoot, 'config.json')
    const pairTokenizerPath = join(pairModelRoot, 'tokenizer.json')
    const pairTokenizerConfigPath = join(pairModelRoot, 'tokenizer_config.json')
    pairModelArtifacts = {
      modelQuantizedSha256: await sha256File(pairModelPath),
      configSha256: await sha256File(pairConfigPath),
      tokenizerSha256: await sha256File(pairTokenizerPath),
      tokenizerConfigSha256: await sha256File(pairTokenizerConfigPath),
    }
    assert.deepEqual(pairModelArtifacts, {
      modelQuantizedSha256: pairModelSource.modelQuantizedSha256,
      configSha256: pairModelSource.configSha256,
      tokenizerSha256: pairModelSource.tokenizerSha256,
      tokenizerConfigSha256: pairModelSource.tokenizerConfigSha256,
    })
  }

  const memoryBeforeBytes = process.memoryUsage().rss
  const buildStartedAt = performance.now()
  embedder = await createCreatorLocalEmbeddingModel({
    model: embeddingModel,
    source: embeddingModelSource,
    cacheDir: modelCachePath,
    localModelPath: embeddingModelRoot,
    localFilesOnly: true,
  })
  retriever = await createCreatorLanceDbRetriever({ databasePath, sources, embedder })
  if (useBgePairScorer) {
    pairScorer = await createCreatorLocalBgePairScorer({
      model: pairModel,
      source: pairModelSource,
      cacheDir: modelCachePath,
      localModelPath: pairModelRoot!,
      batchSize: pairBatchSize,
      localFilesOnly: true,
    })
  }
  const indexBuildMs = performance.now() - buildStartedAt
  const results = []
  const queryLatenciesMs: number[] = []
  for (const query of queries) {
    const queryStartedAt = performance.now()
    const retrievalQuery = {
      text: query.query,
      workId: query.workId,
      branchId: query.branchId,
      currentChapterNo: query.currentChapterNo,
      manualSelectedSourceIds: query.manualSelectedSourceIds,
      limit: useBgePairScorer ? 20 : 10,
    }
    const upstreamResult = useChunkCandidates
      ? null
      : await retriever.retrieve(retrievalQuery)
    let automaticResults = useChunkCandidates
      ? await retriever.retrieveChunkCandidates({ ...retrievalQuery, chunkLimit })
      : upstreamResult!.automaticResults
    if (pairScorer) {
      const scores = await pairScorer.scorePairs(automaticResults.map(result => ({
        query: query.query,
        passage: result.text,
      })))
      automaticResults = automaticResults
        .map((result, index) => ({ result, score: scores[index]! }))
        .sort((left, right) => right.score - left.score)
        .map(item => item.result)
      if (useChunkCandidates) {
        const selectedSourceIds = new Set<string>()
        automaticResults = automaticResults.filter(result => {
          if (selectedSourceIds.has(result.sourceId)) return false
          selectedSourceIds.add(result.sourceId)
          return true
        })
      }
      automaticResults = automaticResults.slice(0, 10)
    }
    const finalSourceIds = automaticResults.map(result => result.sourceId)
    for (const sourceId of query.manualSelectedSourceIds) {
      if (!finalSourceIds.includes(sourceId)) finalSourceIds.push(sourceId)
    }
    queryLatenciesMs.push(performance.now() - queryStartedAt)
    results.push({ queryId: query.id, automaticResults, finalSourceIds })
  }
  const metrics = evaluateCreatorRagBenchmark({ sources, queries, results })
  assert.equal(metrics.wrongWorkLeakageCount, 0)
  assert.equal(metrics.wrongBranchLeakageCount, 0)
  assert.equal(metrics.futureChapterLeakageCount, 0)
  assert.equal(metrics.sourceLocatorCoverage, 1)
  assert.equal(metrics.manualSelectionInclusion, 1)

  const metricsById = new Map(metrics.queries.map(item => [item.queryId, item]))
  const rankingDigestSha256 = sha256(JSON.stringify(results.map(result => ({
    queryId: result.queryId,
    automaticResults: result.automaticResults.map(item => ({
      sourceId: item.sourceId,
      chunkId: 'chunkId' in item ? item.chunkId : null,
      chapterNo: item.chapterNo,
    })),
    finalSourceIds: result.finalSourceIds,
  }))))
  const evaluationDigestSha256 = sha256(JSON.stringify(metrics.queries.map(item => ({
    queryId: item.queryId,
    recallAt10: item.recallAt10,
    precisionAt3: item.precisionAt3,
  }))))
  const aggregateForSuffix = (suffix: string) => {
    const selected = queries.map(query => metricsById.get(query.id)!)
      .filter(item => item.queryId.endsWith(suffix))
    return {
      queryCount: selected.length,
      recallAt10: selected.reduce((sum, item) => sum + item.recallAt10, 0) / selected.length,
      top3HitCount: selected.filter(item => item.precisionAt3 > 0).length,
    }
  }
  const sortedLatencies = [...queryLatenciesMs].sort((left, right) => left - right)
  const percentile = (fraction: number) => sortedLatencies[Math.ceil(sortedLatencies.length * fraction) - 1] ?? 0
  const baselineReceipt = useBgePairScorer || useAlternativeEmbedding
    ? JSON.parse(await readFile(required('baselineReceipt'), 'utf8')) as {
        retrieval?: {
          recallAt10?: number
          precisionAt3?: number
          top3HitCount?: number
          queryCount?: number
          contextQueries?: { recallAt10?: number }
          latestEvidenceQueries?: { recallAt10?: number }
        }
      }
    : null
  const top3HitRate = metrics.queries.filter(query => query.precisionAt3 > 0).length / metrics.queryCount
  const receipt = {
    schemaVersion: 1,
    status: useBgePairScorer
      ? 'real_full_manuscript_bge_comparison_not_activated'
      : useAlternativeEmbedding
        ? 'real_full_manuscript_embedding_comparison_not_activated'
        : 'real_full_manuscript_measured_not_activated',
    completedAt: new Date().toISOString(),
    source: {
      workId,
      branchId,
      fromChapter: 1,
      toChapter: 20,
      chapterCount: 20,
      acceptedBlockCount: totalBlockCount,
      visibleCharacterCount: totalVisibleLength,
      workspaceArchiveSha256: workspaceHashBefore,
      inventorySummarySha256: sha256(inventorySummaryBytes),
      threadSummarySha256: sha256(threadSummaryBytes),
      privateLedgerSha256: sha256(ledgerBytes),
      independentlyVerifiedThreadCount: threadIndex,
      locatedSourceQuoteCount,
      locatedLatestQuoteCount,
      dimensionCounts,
      postStopLineEmptyRecordCount: postStopLineRecordCount,
      manuscriptOrQueryTextCopiedIntoReceipt: false,
    },
    retrieval: {
      upstreamPipeline: useBgePairScorer
        ? 'LanceDB hybrid RRF candidate pool -> BGE pair scorer'
        : 'LanceDB hybrid RRF',
      candidatePoolSize: useChunkCandidates ? chunkLimit : useBgePairScorer ? 20 : 10,
      candidateGranularity: useChunkCandidates ? 'chunk' : 'source',
      queryCount: queries.length,
      sourceCount: sources.length,
      canonChapterSourceCount: 20,
      syntheticLeakageDecoyCount: 3,
      recallAt10: metrics.recallAt10,
      precisionAt3: metrics.precisionAt3,
      top3HitCount: metrics.queries.filter(query => query.precisionAt3 > 0).length,
      contextQueries: aggregateForSuffix(':context'),
      sourceEvidenceQueries: aggregateForSuffix(':source-evidence'),
      latestEvidenceQueries: aggregateForSuffix(':latest-evidence'),
      wrongWorkLeakageCount: metrics.wrongWorkLeakageCount,
      wrongBranchLeakageCount: metrics.wrongBranchLeakageCount,
      futureChapterLeakageCount: metrics.futureChapterLeakageCount,
      sourceLocatorCoverage: metrics.sourceLocatorCoverage,
      manualSelectionInclusion: metrics.manualSelectionInclusion,
      rankingDigestSha256,
      evaluationDigestSha256,
      digestContainsManuscriptOrQueryText: false,
      queryLatencyP50Ms: percentile(0.5),
      queryLatencyP95Ms: percentile(0.95),
      modelLoadAndIndexBuildMs: indexBuildMs,
      observedRssDeltaBytes: Math.max(0, process.memoryUsage().rss - memoryBeforeBytes),
    },
    embeddingModel: {
      ...embeddingModel,
      source: embeddingModelSource,
      artifacts: embeddingModelArtifacts,
      upstreamPooling: 'mean',
      upstreamNormalization: true,
      productSimilarityMathAdded: false,
    },
    pairScorer: useBgePairScorer ? {
      ...pairModel,
      source: pairModelSource,
      artifacts: pairModelArtifacts,
      batchSize: pairBatchSize,
      upstreamLogitsUsedWithoutScoreTransformation: true,
    } : null,
    comparison: baselineReceipt ? {
      baselineReceiptSha256: await sha256File(required('baselineReceipt')),
      overallRecallAt10Delta: metrics.recallAt10 - (baselineReceipt.retrieval?.recallAt10 ?? 0),
      precisionAt3Delta: metrics.precisionAt3 - (baselineReceipt.retrieval?.precisionAt3 ?? 0),
      contextRecallAt10Delta: aggregateForSuffix(':context').recallAt10
        - (baselineReceipt.retrieval?.contextQueries?.recallAt10 ?? 0),
      latestEvidenceRecallAt10Delta: aggregateForSuffix(':latest-evidence').recallAt10
        - (baselineReceipt.retrieval?.latestEvidenceQueries?.recallAt10 ?? 0),
      top3HitRateDelta: top3HitRate
        - ((baselineReceipt.retrieval?.top3HitCount ?? 0) / (baselineReceipt.retrieval?.queryCount ?? 1)),
    } : null,
    sideEffects: {
      workspaceChanged: false,
      acceptedManuscriptChanged: false,
      canonChanged: false,
      chapter21ManuscriptReadOrChanged: false,
      cloudDataChanged: false,
      publicationPerformed: false,
      automaticRetrievalEnabled: false,
    },
    limitations: [
      'The benchmark uses independently verified thread prompts plus exact source evidence and latest-evidence meanings; these are not real author search traffic.',
      'Full Canon chapters are indexed as unclassified sources. Memory-group prefilter quality requires separately structured memory records and is not inferred from prose by custom code.',
      'The receipt stores hashes and aggregate metrics only; manuscript and private query text remain local.',
      'The run measures retrieval and leakage boundaries. It does not activate automatic recall or replace explicit author selection.',
    ],
  }
  assert.equal(sha256(await readFile(workspacePath)), workspaceHashBefore)
  await mkdir(dirname(receiptPath), { recursive: true })
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
  console.log(`[creator-rag-full-manuscript] PASS (${queries.length} private real-manuscript queries; receipt stores hashes only)`)
  console.log(`[creator-rag-full-manuscript] receipt ${receiptPath}`)
} finally {
  await pairScorer?.dispose()
  retriever?.dispose()
  await embedder?.dispose()
  await rm(databasePath, { recursive: true, force: true })
}
