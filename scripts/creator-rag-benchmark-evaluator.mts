import type {
  CreatorRagBenchmarkQuery,
  CreatorRagBenchmarkSource,
} from './fixtures/creator-rag-frozen-benchmark.mts'

export interface CreatorRagReturnedItem {
  sourceId: string
  workId: string
  branchId: string
  chapterNo: number
  locator: {
    recordId: string
    label: string
  } | null
}

export interface CreatorRagQueryResult {
  queryId: string
  automaticResults: CreatorRagReturnedItem[]
  finalSourceIds: string[]
}

export interface CreatorRagQueryMetrics {
  queryId: string
  recallAt10: number
  precisionAt3: number
  wrongWorkLeakageCount: number
  wrongBranchLeakageCount: number
  futureChapterLeakageCount: number
  returnedItemCount: number
  locatedItemCount: number
  manualSelectionCount: number
  includedManualSelectionCount: number
}

export interface CreatorRagBenchmarkMetrics {
  queryCount: number
  recallAt10: number
  precisionAt3: number
  wrongWorkLeakageCount: number
  wrongBranchLeakageCount: number
  futureChapterLeakageCount: number
  sourceLocatorCoverage: number
  manualSelectionInclusion: number
  queries: CreatorRagQueryMetrics[]
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function ratio(numerator: number, denominator: number) {
  return denominator ? numerator / denominator : 1
}

export function evaluateCreatorRagBenchmark(input: {
  sources: CreatorRagBenchmarkSource[]
  queries: CreatorRagBenchmarkQuery[]
  results: CreatorRagQueryResult[]
}): CreatorRagBenchmarkMetrics {
  const sourceIds = new Set(input.sources.map(source => source.id))
  const resultByQueryId = new Map<string, CreatorRagQueryResult>()
  for (const result of input.results) {
    if (resultByQueryId.has(result.queryId)) throw new Error(`duplicate benchmark result for ${result.queryId}`)
    resultByQueryId.set(result.queryId, result)
  }
  const queryIds = new Set(input.queries.map(query => query.id))
  const unknownResult = input.results.find(result => !queryIds.has(result.queryId))
  if (unknownResult) throw new Error(`unknown benchmark query ${unknownResult.queryId}`)

  const queries = input.queries.map((query): CreatorRagQueryMetrics => {
    const result = resultByQueryId.get(query.id)
    if (!result) throw new Error(`missing benchmark result for ${query.id}`)
    const expected = new Set(query.expectedSourceIds)
    const top10 = result.automaticResults.slice(0, 10)
    const top3 = result.automaticResults.slice(0, 3)
    for (const item of result.automaticResults) {
      if (!sourceIds.has(item.sourceId)) throw new Error(`${query.id} returned unknown source ${item.sourceId}`)
    }
    const includedManualSelectionCount = query.manualSelectedSourceIds.filter(sourceId => (
      result.finalSourceIds.includes(sourceId)
    )).length
    return {
      queryId: query.id,
      recallAt10: ratio(top10.filter(item => expected.has(item.sourceId)).length, expected.size),
      precisionAt3: ratio(top3.filter(item => expected.has(item.sourceId)).length, top3.length),
      wrongWorkLeakageCount: result.automaticResults.filter(item => item.workId !== query.workId).length,
      wrongBranchLeakageCount: result.automaticResults.filter(item => (
        item.workId === query.workId && item.branchId !== query.branchId
      )).length,
      futureChapterLeakageCount: result.automaticResults.filter(item => (
        item.workId === query.workId
        && item.branchId === query.branchId
        && item.chapterNo > query.currentChapterNo
      )).length,
      returnedItemCount: result.automaticResults.length,
      locatedItemCount: result.automaticResults.filter(item => (
        Boolean(item.locator?.recordId && item.locator.label)
      )).length,
      manualSelectionCount: query.manualSelectedSourceIds.length,
      includedManualSelectionCount,
    }
  })

  const returnedItemCount = queries.reduce((sum, query) => sum + query.returnedItemCount, 0)
  const locatedItemCount = queries.reduce((sum, query) => sum + query.locatedItemCount, 0)
  const manualSelectionCount = queries.reduce((sum, query) => sum + query.manualSelectionCount, 0)
  const includedManualSelectionCount = queries.reduce((sum, query) => sum + query.includedManualSelectionCount, 0)
  return {
    queryCount: queries.length,
    recallAt10: average(queries.map(query => query.recallAt10)),
    precisionAt3: average(queries.map(query => query.precisionAt3)),
    wrongWorkLeakageCount: queries.reduce((sum, query) => sum + query.wrongWorkLeakageCount, 0),
    wrongBranchLeakageCount: queries.reduce((sum, query) => sum + query.wrongBranchLeakageCount, 0),
    futureChapterLeakageCount: queries.reduce((sum, query) => sum + query.futureChapterLeakageCount, 0),
    sourceLocatorCoverage: ratio(locatedItemCount, returnedItemCount),
    manualSelectionInclusion: ratio(includedManualSelectionCount, manualSelectionCount),
    queries,
  }
}
