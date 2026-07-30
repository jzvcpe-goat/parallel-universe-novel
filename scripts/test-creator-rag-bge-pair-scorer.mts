import assert from 'node:assert/strict'

import { createCreatorRagPairScorerFromRuntime } from '../app/src/integrations/creator-rag/creatorLocalBgePairScorer.ts'

const observedBatches: Array<{ queries: string[]; passages: string[] }> = []
let disposed = false
const scorer = createCreatorRagPairScorerFromRuntime({
  batchSize: 2,
  runtime: {
    async scoreBatch(queries, passages) {
      observedBatches.push({ queries, passages })
      return queries.map((_, index) => [passages[index]!.length])
    },
    async dispose() {
      disposed = true
    },
  },
})

assert.deepEqual(await scorer.scorePairs([
  { query: '同一问题', passage: '短' },
  { query: '同一问题', passage: '稍长证据' },
  { query: '另一问题', passage: '第三条证据' },
]), [1, 4, 5])
assert.equal(observedBatches.length, 2)
assert.deepEqual(observedBatches[0], {
  queries: ['同一问题', '同一问题'],
  passages: ['短', '稍长证据'],
})

await assert.rejects(
  scorer.scorePairs([{ query: '', passage: '证据' }]),
  /query must not be empty/u,
)

const malformed = createCreatorRagPairScorerFromRuntime({
  runtime: {
    async scoreBatch() {
      return [[Number.NaN]]
    },
    async dispose() {},
  },
})
await assert.rejects(
  malformed.scorePairs([{ query: '问题', passage: '证据' }]),
  /non-finite upstream logit/u,
)

await scorer.dispose()
assert.equal(disposed, true)
console.log('[creator-rag-bge-pair-scorer] PASS')
