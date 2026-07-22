import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { parseArgs } from 'node:util'

import { createCreatorLanceDbRetriever } from '../app/src/integrations/creator-rag/creatorLanceDbRetriever.ts'
import {
  createCreatorLocalEmbeddingModel,
  creatorRagVerifiedModelScopeMirror,
} from '../app/src/integrations/creator-rag/creatorLocalEmbedding.ts'
import { evaluateCreatorRagBenchmark } from './creator-rag-benchmark-evaluator.mts'
import type {
  CreatorRagBenchmarkGroup,
  CreatorRagBenchmarkQuery,
  CreatorRagBenchmarkSource,
} from './fixtures/creator-rag-frozen-benchmark.mts'

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
  focus: string
  review: { threads: RealThread[] }
  verification: { threadItems: RealThreadVerification[] }
}

const defaultSummaryPath = 'validation/creator-ui/conversation-recall-2026-07-14/chapter-01-20-long-range-story-threads-reconciled-2026-07-16/summary.json'
const defaultReceiptPath = 'validation/creator-rag/real-thread-evidence-benchmark-2026-07-17.json'
const workId = 'work-arad-wayfarer'
const branchId = 'branch:main'

const { values } = parseArgs({
  options: {
    summary: { type: 'string', default: defaultSummaryPath },
    receipt: { type: 'string', default: defaultReceiptPath },
  },
  strict: true,
})

function sha256(value: Uint8Array | string) {
  return createHash('sha256').update(value).digest('hex')
}

async function sha256File(path: string) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

async function findFile(path: string, fileName: string): Promise<string | null> {
  let entries
  try {
    entries = await readdir(path, { withFileTypes: true })
  } catch {
    return null
  }
  for (const entry of entries) {
    const absolute = join(path, entry.name)
    if (entry.isDirectory()) {
      const nested = await findFile(absolute, fileName)
      if (nested) return nested
    } else if (entry.name === fileName) {
      return absolute
    }
  }
  return null
}

function benchmarkGroup(dimension: string): CreatorRagBenchmarkGroup {
  if (dimension === 'causal_debt') return 'causal'
  if (dimension === 'character_knowledge') return 'character_knowledge'
  if (dimension === 'timeline_anchor') return 'timeline'
  return 'promise'
}

const summaryPath = values.summary!
const receiptPath = values.receipt!
const summaryBytes = await readFile(summaryPath)
const summary = JSON.parse(summaryBytes.toString('utf8')) as {
  scope?: {
    workId?: string
    fromChapter?: number
    toChapter?: number
    chapterCount?: number
    workspaceArchiveSha256?: string
  }
  runtime?: { privateArtifactsDirectory?: string }
  results?: { verifiedThreadCount?: number }
  sideEffects?: { chapter21AccessedOrChanged?: boolean }
}
assert.equal(summary.scope?.workId, workId)
assert.equal(summary.scope?.fromChapter, 1)
assert.equal(summary.scope?.toChapter, 20)
assert.equal(summary.scope?.chapterCount, 20)
assert.equal(summary.results?.verifiedThreadCount, 13)
assert.equal(summary.sideEffects?.chapter21AccessedOrChanged, false)

const privateDirectory = summary.runtime?.privateArtifactsDirectory
assert.ok(privateDirectory, 'The reviewed campaign summary must locate its private artifacts directory.')
const ledgerPath = join(privateDirectory, 'thread-ledger.json')
const ledgerBytes = await readFile(ledgerPath)
const passes = JSON.parse(ledgerBytes.toString('utf8')) as RealThreadPass[]
assert.equal(passes.length, 2)

const sources: CreatorRagBenchmarkSource[] = []
const queries: CreatorRagBenchmarkQuery[] = []
const dimensionCounts: Record<string, number> = {}
let threadIndex = 0
for (const pass of passes) {
  const verificationByThreadId = new Map(pass.verification.threadItems.map(item => [item.threadId, item]))
  for (const thread of pass.review.threads) {
    const verification = verificationByThreadId.get(thread.threadId)
    assert.ok(verification, 'Every real thread must have an independent verification item.')
    assert.equal(verification.decision, 'verify')
    assert.equal(verification.sourceEvidenceQuote, thread.sourceEvidenceQuote)
    assert.equal(verification.latestEvidenceQuote, thread.latestEvidence?.quote ?? null)
    assert.ok(verification.rationale.trim())
    assert.ok(thread.whyItMatters.trim())
    assert.ok(thread.sourceChapter >= 1 && thread.sourceChapter <= 20)
    if (thread.latestEvidence) assert.ok(thread.latestEvidence.chapter <= 20)

    const sourceId = `real-thread:${threadIndex}`
    const sourceChapter = thread.latestEvidence?.chapter ?? thread.sourceChapter
    const sourceText = [
      thread.sourceEvidenceQuote,
      thread.latestEvidence?.quote,
      thread.latestEvidence?.meaning,
      verification.rationale,
    ].filter(Boolean).join('\n')
    sources.push({
      id: sourceId,
      workId,
      branchId,
      chapterNo: sourceChapter,
      authority: 'derived',
      revision: 1,
      locator: {
        recordId: `private-thread-ledger:${threadIndex}`,
        label: `私密长程证据卡 ${threadIndex + 1}`,
      },
      text: sourceText,
    })
    queries.push({
      id: `query:real-thread:${threadIndex}`,
      group: benchmarkGroup(thread.dimension),
      workId,
      branchId,
      currentChapterNo: 20,
      query: thread.whyItMatters,
      expectedSourceIds: [sourceId],
      manualSelectedSourceIds: threadIndex % 4 === 0 ? [sourceId] : [],
    })
    dimensionCounts[thread.dimension] = (dimensionCounts[thread.dimension] ?? 0) + 1
    threadIndex += 1
  }
}
assert.equal(sources.length, 13)
assert.equal(queries.length, 13)

sources.push(
  {
    id: 'decoy:real-thread-wrong-work',
    workId: 'work:wrong',
    branchId,
    chapterNo: 1,
    authority: 'derived',
    revision: 1,
    locator: { recordId: 'decoy:wrong-work', label: '错误作品诱饵' },
    text: '错误作品中的人物限制、旧伤与承诺不得进入当前作品召回。',
  },
  {
    id: 'decoy:real-thread-wrong-branch',
    workId,
    branchId: 'branch:discarded-if',
    chapterNo: 10,
    authority: 'derived',
    revision: 1,
    locator: { recordId: 'decoy:wrong-branch', label: '错误支线诱饵' },
    text: '废弃支线中的人物知识与伏笔不得进入主线召回。',
  },
  {
    id: 'decoy:real-thread-future',
    workId,
    branchId,
    chapterNo: 21,
    authority: 'author',
    revision: 1,
    locator: { recordId: 'decoy:future', label: '未来章节诱饵' },
    text: '这是一条不属于当前二十章范围的未来规划诱饵。',
  },
)

const databasePath = await mkdtemp(join(tmpdir(), 'creator-rag-real-thread-'))
const modelCachePath = process.env.CREATOR_RAG_MODEL_CACHE
  ?? join(homedir(), '.cache', 'parallel-universe-novel', 'creator-rag')
let embedder: Awaited<ReturnType<typeof createCreatorLocalEmbeddingModel>> | null = null
let retriever: Awaited<ReturnType<typeof createCreatorLanceDbRetriever>> | null = null

try {
  const modelPath = await findFile(modelCachePath, 'model_quantized.onnx')
  const tokenizerPath = await findFile(modelCachePath, 'tokenizer.json')
  assert.ok(modelPath && tokenizerPath, 'The reviewed local E5 artifacts must already exist.')
  assert.equal(await sha256File(modelPath), creatorRagVerifiedModelScopeMirror.modelQuantizedSha256)
  assert.equal(await sha256File(tokenizerPath), creatorRagVerifiedModelScopeMirror.tokenizerSha256)

  const memoryBeforeBytes = process.memoryUsage().rss
  const buildStartedAt = performance.now()
  embedder = await createCreatorLocalEmbeddingModel({
    source: creatorRagVerifiedModelScopeMirror,
    cacheDir: modelCachePath,
  })
  retriever = await createCreatorLanceDbRetriever({ databasePath, sources, embedder })
  const indexBuildMs = performance.now() - buildStartedAt
  const results = []
  const queryLatenciesMs: number[] = []
  for (const query of queries) {
    const queryStartedAt = performance.now()
    const result = await retriever.retrieve({
      text: query.query,
      workId: query.workId,
      branchId: query.branchId,
      currentChapterNo: query.currentChapterNo,
      manualSelectedSourceIds: query.manualSelectedSourceIds,
      limit: 10,
    })
    queryLatenciesMs.push(performance.now() - queryStartedAt)
    results.push({ queryId: query.id, ...result })
  }
  const metrics = evaluateCreatorRagBenchmark({ sources, queries, results })
  assert.equal(metrics.wrongWorkLeakageCount, 0)
  assert.equal(metrics.wrongBranchLeakageCount, 0)
  assert.equal(metrics.futureChapterLeakageCount, 0)
  assert.equal(metrics.sourceLocatorCoverage, 1)
  assert.equal(metrics.manualSelectionInclusion, 1)

  const sortedLatencies = [...queryLatenciesMs].sort((left, right) => left - right)
  const percentile = (fraction: number) => sortedLatencies[Math.ceil(sortedLatencies.length * fraction) - 1] ?? 0
  const receipt = {
    schemaVersion: 1,
    status: 'real_verified_thread_evidence_measured_not_activated',
    completedAt: new Date().toISOString(),
    source: {
      workId,
      fromChapter: 1,
      toChapter: 20,
      chapterCount: 20,
      summarySha256: sha256(summaryBytes),
      privateLedgerSha256: sha256(ledgerBytes),
      workspaceArchiveSha256: summary.scope?.workspaceArchiveSha256,
      independentlyVerifiedThreadCount: 13,
      dimensionCounts,
      manuscriptOrEvidenceTextCopiedIntoReceipt: false,
      threadLabelsCopiedIntoReceipt: false,
    },
    retrieval: {
      queryCount: queries.length,
      sourceCount: sources.length,
      realEvidenceSourceCount: 13,
      syntheticLeakageDecoyCount: 3,
      recallAt10: metrics.recallAt10,
      precisionAt3: metrics.precisionAt3,
      top3HitCount: metrics.queries.filter(query => query.precisionAt3 > 0).length,
      wrongWorkLeakageCount: metrics.wrongWorkLeakageCount,
      wrongBranchLeakageCount: metrics.wrongBranchLeakageCount,
      futureChapterLeakageCount: metrics.futureChapterLeakageCount,
      sourceLocatorCoverage: metrics.sourceLocatorCoverage,
      manualSelectionInclusion: metrics.manualSelectionInclusion,
      queryLatencyP50Ms: percentile(0.5),
      queryLatencyP95Ms: percentile(0.95),
      modelLoadAndIndexBuildMs: indexBuildMs,
      observedRssDeltaBytes: Math.max(0, process.memoryUsage().rss - memoryBeforeBytes),
    },
    sideEffects: {
      workspaceChanged: false,
      acceptedManuscriptChanged: false,
      canonChanged: false,
      chapter21AccessedOrChanged: false,
      cloudDataChanged: false,
      publicationPerformed: false,
      automaticRetrievalEnabled: false,
    },
    limitations: [
      'This run indexes independently verified real thread evidence cards, not every paragraph of Chapters 1-20.',
      'Queries are derived from private author-facing why-it-matters reminders and are not reader traffic.',
      'The result does not activate automatic recall or replace explicit author selection.',
    ],
  }
  await mkdir(dirname(receiptPath), { recursive: true })
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
  console.log(`[creator-rag-real-thread-evidence] PASS (${queries.length} private real-evidence queries; receipt stores hashes only)`)
  console.log(`[creator-rag-real-thread-evidence] receipt ${receiptPath}`)
} finally {
  retriever?.dispose()
  await embedder?.dispose()
  await rm(databasePath, { recursive: true, force: true })
}
