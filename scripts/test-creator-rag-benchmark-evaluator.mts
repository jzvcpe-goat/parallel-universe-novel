import assert from 'node:assert/strict'
import {
  evaluateCreatorRagBenchmark,
  type CreatorRagQueryResult,
  type CreatorRagReturnedItem,
} from './creator-rag-benchmark-evaluator.mts'
import {
  creatorRagFrozenQueries,
  creatorRagFrozenSources,
} from './fixtures/creator-rag-frozen-benchmark.mts'

const sourceById = new Map(creatorRagFrozenSources.map(source => [source.id, source]))

function returnedItem(sourceId: string): CreatorRagReturnedItem {
  const source = sourceById.get(sourceId)
  assert.ok(source)
  return {
    sourceId: source.id,
    workId: source.workId,
    branchId: source.branchId,
    chapterNo: source.chapterNo,
    locator: source.locator,
  }
}

const passingResults: CreatorRagQueryResult[] = creatorRagFrozenQueries.map(query => ({
  queryId: query.id,
  automaticResults: query.expectedSourceIds.map(returnedItem),
  finalSourceIds: [...new Set([...query.expectedSourceIds, ...query.manualSelectedSourceIds])],
}))
const passing = evaluateCreatorRagBenchmark({
  sources: creatorRagFrozenSources,
  queries: creatorRagFrozenQueries,
  results: passingResults,
})
assert.equal(passing.queryCount, 30)
assert.equal(passing.recallAt10, 1)
assert.equal(passing.precisionAt3, 1)
assert.equal(passing.wrongWorkLeakageCount, 0)
assert.equal(passing.wrongBranchLeakageCount, 0)
assert.equal(passing.futureChapterLeakageCount, 0)
assert.equal(passing.sourceLocatorCoverage, 1)
assert.equal(passing.manualSelectionInclusion, 1)

const queryWithManualSelection = creatorRagFrozenQueries.find(query => query.manualSelectedSourceIds.length > 0)
assert.ok(queryWithManualSelection)
const negativeResults = passingResults.map(result => result.queryId === queryWithManualSelection.id
  ? {
      ...result,
      automaticResults: [
        returnedItem('decoy:wrong-work-black-mark'),
        returnedItem('decoy:wrong-branch-key'),
        { ...returnedItem('decoy:future-chapter-signal'), locator: null },
      ],
      finalSourceIds: [],
    }
  : result)
const negative = evaluateCreatorRagBenchmark({
  sources: creatorRagFrozenSources,
  queries: creatorRagFrozenQueries,
  results: negativeResults,
})
assert.equal(negative.wrongWorkLeakageCount, 1)
assert.equal(negative.wrongBranchLeakageCount, 1)
assert.equal(negative.futureChapterLeakageCount, 1)
assert.ok(negative.sourceLocatorCoverage < 1)
assert.ok(negative.manualSelectionInclusion < 1)
assert.equal(
  negative.queries.find(query => query.queryId === queryWithManualSelection.id)?.recallAt10,
  0,
)

assert.throws(
  () => evaluateCreatorRagBenchmark({
    sources: creatorRagFrozenSources,
    queries: creatorRagFrozenQueries,
    results: passingResults.slice(1),
  }),
  /missing benchmark result/,
)
assert.throws(
  () => evaluateCreatorRagBenchmark({
    sources: creatorRagFrozenSources,
    queries: creatorRagFrozenQueries,
    results: [...passingResults, passingResults[0]],
  }),
  /duplicate benchmark result/,
)

console.log('[creator-rag-benchmark-evaluator] PASS')
