import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { cpus, homedir, platform, release, tmpdir, totalmem } from 'node:os'
import { basename, dirname, join } from 'node:path'

import { createCreatorLanceDbRetriever } from '../app/src/integrations/creator-rag/creatorLanceDbRetriever.ts'
import {
  createCreatorLocalEmbeddingModel,
  creatorRagEmbeddingModel,
  creatorRagVerifiedModelScopeMirror,
} from '../app/src/integrations/creator-rag/creatorLocalEmbedding.ts'
import { evaluateCreatorRagBenchmark } from './creator-rag-benchmark-evaluator.mts'
import {
  creatorRagFrozenQueries,
  creatorRagFrozenSources,
} from './fixtures/creator-rag-frozen-benchmark.mts'

const receiptPath = 'validation/creator-rag/local-hybrid-benchmark-2026-07-17.json'

function percentile(values: number[], fraction: number) {
  if (!values.length) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)
  return sorted[Math.max(0, index)] ?? 0
}

async function directoryBytes(path: string): Promise<number> {
  const entries = await readdir(path, { withFileTypes: true })
  let bytes = 0
  for (const entry of entries) {
    const absolute = join(path, entry.name)
    bytes += entry.isDirectory()
      ? await directoryBytes(absolute)
      : (await stat(absolute)).size
  }
  return bytes
}

async function findFile(path: string, fileName: string): Promise<string | null> {
  const entries = await readdir(path, { withFileTypes: true })
  for (const entry of entries) {
    const absolute = join(path, entry.name)
    if (entry.isDirectory()) {
      const nested = await findFile(absolute, fileName)
      if (nested) return nested
    } else if (basename(absolute) === fileName) {
      return absolute
    }
  }
  return null
}

async function sha256File(path: string) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

async function run() {
  const databasePath = await mkdtemp(join(tmpdir(), 'creator-rag-lancedb-'))
  const modelCachePath = process.env.CREATOR_RAG_MODEL_CACHE
    ?? join(homedir(), '.cache', 'parallel-universe-novel', 'creator-rag')
  await mkdir(modelCachePath, { recursive: true })
  const modelCacheWarm = Boolean(await findFile(modelCachePath, 'model_quantized.onnx'))
  const memoryBeforeBytes = process.memoryUsage().rss
  const startedAt = new Date().toISOString()
  let embedder: Awaited<ReturnType<typeof createCreatorLocalEmbeddingModel>> | null = null
  let retriever: Awaited<ReturnType<typeof createCreatorLanceDbRetriever>> | null = null
  try {
    const buildStartedAt = performance.now()
    embedder = await createCreatorLocalEmbeddingModel({
      source: creatorRagVerifiedModelScopeMirror,
      cacheDir: modelCachePath,
    })
    const modelPath = await findFile(modelCachePath, 'model_quantized.onnx')
    const tokenizerPath = await findFile(modelCachePath, 'tokenizer.json')
    if (!modelPath || !tokenizerPath) throw new Error('downloaded model artifacts are incomplete')
    const modelSha256 = await sha256File(modelPath)
    const tokenizerSha256 = await sha256File(tokenizerPath)
    if (modelSha256 !== creatorRagVerifiedModelScopeMirror.modelQuantizedSha256) {
      throw new Error('downloaded quantized model checksum does not match the reviewed artifact')
    }
    if (tokenizerSha256 !== creatorRagVerifiedModelScopeMirror.tokenizerSha256) {
      throw new Error('downloaded tokenizer checksum does not match the reviewed artifact')
    }
    retriever = await createCreatorLanceDbRetriever({
      databasePath,
      sources: creatorRagFrozenSources,
      embedder,
    })
    const indexBuildMs = performance.now() - buildStartedAt
    const queryLatenciesMs: number[] = []
    const results = []
    for (const query of creatorRagFrozenQueries) {
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

    const metrics = evaluateCreatorRagBenchmark({
      sources: creatorRagFrozenSources,
      queries: creatorRagFrozenQueries,
      results,
    })
    if (metrics.wrongWorkLeakageCount !== 0) throw new Error('wrong-work leakage must remain zero')
    if (metrics.wrongBranchLeakageCount !== 0) throw new Error('wrong-branch leakage must remain zero')
    if (metrics.futureChapterLeakageCount !== 0) throw new Error('future-chapter leakage must remain zero')
    if (metrics.sourceLocatorCoverage !== 1) throw new Error('source locator coverage must be 100%')
    if (metrics.manualSelectionInclusion !== 1) throw new Error('manual selection inclusion must be 100%')

    const receipt = {
      schemaVersion: 1,
      status: 'measured_not_activated',
      startedAt,
      completedAt: new Date().toISOString(),
      fixture: {
        sourceCount: creatorRagFrozenSources.length,
        queryCount: creatorRagFrozenQueries.length,
        containsPrivateDraftData: false,
      },
      stack: {
        chunker: '@langchain/textsplitters@1.0.1',
        localStore: '@lancedb/lancedb@0.31.0',
        hybridFusion: '@lancedb/lancedb RRFReranker',
        embeddingRuntime: '@huggingface/transformers@4.2.0',
        embeddingModel: creatorRagEmbeddingModel,
        downloadSource: creatorRagVerifiedModelScopeMirror,
        modelArtifactChecksum: {
          modelQuantizedSha256: modelSha256,
          tokenizerSha256,
        },
      },
      performance: {
        modelCacheWarm,
        indexBuildMs,
        queryLatencyP50Ms: percentile(queryLatenciesMs, 0.5),
        queryLatencyP95Ms: percentile(queryLatenciesMs, 0.95),
        peakObservedRssDeltaBytes: Math.max(0, process.memoryUsage().rss - memoryBeforeBytes),
        indexDiskBytes: await directoryBytes(databasePath),
      },
      metrics,
      machine: {
        node: process.version,
        platform: platform(),
        platformRelease: release(),
        architecture: process.arch,
        cpuModel: cpus()[0]?.model ?? 'unknown',
        cpuCount: cpus().length,
        totalMemoryBytes: totalmem(),
      },
      activation: {
        automaticRetrievalEnabled: false,
        reason: 'Real-corpus validation and product integration review remain required.',
      },
    }
    await mkdir(dirname(receiptPath), { recursive: true })
    await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
    console.log(`[creator-rag-local-benchmark] PASS (${creatorRagFrozenQueries.length} real local queries)`)
    console.log(`[creator-rag-local-benchmark] receipt ${receiptPath}`)
  } finally {
    retriever?.dispose()
    await embedder?.dispose()
    await rm(databasePath, { recursive: true, force: true })
  }
}

run().catch(error => {
  console.error('[creator-rag-local-benchmark] BLOCKED')
  console.error(error instanceof Error ? error.stack ?? error.message : String(error))
  process.exitCode = 1
})
