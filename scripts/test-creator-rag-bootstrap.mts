import assert from 'node:assert/strict'
import {
  creatorRagFrozenQueries,
  creatorRagFrozenSources,
} from './fixtures/creator-rag-frozen-benchmark.mts'
import { splitCreatorRagSources } from '../app/src/integrations/creator-rag/creatorChineseTextSplitter.ts'

assert.equal(creatorRagFrozenQueries.length, 30, 'the frozen baseline must contain exactly 30 queries')
assert.equal(new Set(creatorRagFrozenQueries.map(query => query.id)).size, 30, 'query ids must be unique')

const sourceById = new Map(creatorRagFrozenSources.map(source => [source.id, source]))
for (const group of ['causal', 'character_knowledge', 'timeline', 'promise'] as const) {
  assert.ok(
    creatorRagFrozenQueries.filter(query => query.group === group).length >= 7,
    `the frozen baseline must contain at least seven ${group} queries`,
  )
}
for (const query of creatorRagFrozenQueries) {
  assert.ok(query.query.trim(), `${query.id} must contain a query`)
  assert.ok(query.expectedSourceIds.length > 0, `${query.id} must declare relevant sources`)
  for (const sourceId of [...query.expectedSourceIds, ...query.manualSelectedSourceIds]) {
    const source = sourceById.get(sourceId)
    assert.ok(source, `${query.id} references missing source ${sourceId}`)
    assert.equal(source.workId, query.workId, `${query.id} expected source must belong to the current work`)
    assert.equal(source.branchId, query.branchId, `${query.id} expected source must belong to the current branch`)
    assert.ok(source.chapterNo <= query.currentChapterNo, `${query.id} expected source cannot come from a future chapter`)
    assert.ok(source.locator.recordId && source.locator.label, `${sourceId} must retain a source locator`)
  }
}
assert.ok(
  creatorRagFrozenQueries.filter(query => query.manualSelectedSourceIds.length > 0).length >= 6,
  'the frozen baseline must exercise manual hard-includes',
)
assert.ok(
  creatorRagFrozenSources.some(source => source.workId !== creatorRagFrozenQueries[0].workId),
  'the frozen corpus must contain a wrong-work leakage decoy',
)
assert.ok(
  creatorRagFrozenSources.some(source => (
    source.workId === creatorRagFrozenQueries[0].workId
    && source.branchId !== creatorRagFrozenQueries[0].branchId
  )),
  'the frozen corpus must contain a wrong-branch leakage decoy',
)
assert.ok(
  creatorRagFrozenSources.some(source => source.chapterNo > creatorRagFrozenQueries[0].currentChapterNo),
  'the frozen corpus must contain a future-chapter leakage decoy',
)

const splitterSources = creatorRagFrozenSources.filter(source => source.id.startsWith('source:causal-')).slice(0, 3)
const chunks = await splitCreatorRagSources({
  sources: splitterSources,
  chunkSize: 28,
  chunkOverlap: 4,
})
assert.ok(chunks.length > splitterSources.length, 'the upstream splitter must split long Chinese fixture records')
for (const source of splitterSources) {
  const sourceChunks = chunks.filter(chunk => chunk.metadata.sourceId === source.id)
  assert.ok(sourceChunks.length > 0, `${source.id} must produce chunks`)
  sourceChunks.forEach((chunk, index) => {
    assert.ok(Array.from(chunk.pageContent).length <= 28, `${source.id} chunk exceeds the configured character limit`)
    assert.equal(chunk.metadata.workId, source.workId)
    assert.equal(chunk.metadata.branchId, source.branchId)
    assert.equal(chunk.metadata.chapterNo, source.chapterNo)
    assert.equal(chunk.metadata.authority, source.authority)
    assert.equal(chunk.metadata.memoryGroup, source.memoryGroup)
    assert.equal(chunk.metadata.sourceRevision, source.revision)
    assert.equal(chunk.metadata.sourceRecordId, source.locator.recordId)
    assert.equal(chunk.metadata.sourceLocatorLabel, source.locator.label)
    assert.equal(chunk.metadata.chunkIndex, index)
    assert.equal(chunk.metadata.chunkCount, sourceChunks.length)
  })
}

console.log(`[creator-rag-bootstrap] PASS (${creatorRagFrozenSources.length} sources; ${creatorRagFrozenQueries.length} queries; ${chunks.length} splitter chunks)`)
