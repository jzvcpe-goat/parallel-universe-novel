import { Index, connect, rerankers } from '@lancedb/lancedb'

import {
  splitCreatorRagSources,
  type CreatorRagMemoryGroup,
  type CreatorRagSourceRecord,
} from './creatorChineseTextSplitter'
import type { CreatorRagEmbedder } from './creatorLocalEmbedding'

export interface CreatorRagRetrievalQuery {
  text: string
  workId: string
  branchId: string
  currentChapterNo: number
  allowedAuthorities?: CreatorRagSourceRecord['authority'][]
  allowedMemoryGroups?: CreatorRagMemoryGroup[]
  manualSelectedSourceIds?: string[]
  limit?: number
}

export interface CreatorRagRetrievedSource {
  sourceId: string
  workId: string
  branchId: string
  chapterNo: number
  authority: CreatorRagSourceRecord['authority']
  memoryGroup: CreatorRagMemoryGroup
  revision: number
  locator: {
    recordId: string
    label: string
  }
  text: string
}

export interface CreatorRagRetrievedChunk extends CreatorRagRetrievedSource {
  chunkId: string
  chunkIndex: number
}

export interface CreatorRagRetrievalResult {
  automaticResults: CreatorRagRetrievedSource[]
  finalSourceIds: string[]
}

export interface CreatorLanceDbRetriever {
  retrieve(query: CreatorRagRetrievalQuery): Promise<CreatorRagRetrievalResult>
  retrieveChunkCandidates(query: CreatorRagRetrievalQuery & { chunkLimit: number }): Promise<CreatorRagRetrievedChunk[]>
  dispose(): void
}

interface CreatorRagTableRow extends Record<string, unknown> {
  chunkId: string
  sourceId: string
  workId: string
  branchId: string
  chapterNo: number
  authority: CreatorRagSourceRecord['authority']
  memoryGroup: CreatorRagMemoryGroup
  sourceRevision: number
  sourceRecordId: string
  sourceLocatorLabel: string
  chunkIndex: number
  text: string
  vector: number[]
}

const defaultAuthorities: CreatorRagSourceRecord['authority'][] = ['canon', 'author', 'derived']

function escapeSqlLiteral(value: string) {
  return value.replaceAll("'", "''")
}

function buildMetadataFilter(query: CreatorRagRetrievalQuery) {
  const authorities = query.allowedAuthorities?.length
    ? query.allowedAuthorities
    : defaultAuthorities
  const authorityFilter = authorities
    .map(authority => `'${escapeSqlLiteral(authority)}'`)
    .join(', ')
  const filters = [
    `workId = '${escapeSqlLiteral(query.workId)}'`,
    `branchId = '${escapeSqlLiteral(query.branchId)}'`,
    `chapterNo <= ${query.currentChapterNo}`,
    `authority IN (${authorityFilter})`,
  ]
  if (query.allowedMemoryGroups?.length) {
    const memoryGroupFilter = query.allowedMemoryGroups
      .map(group => `'${escapeSqlLiteral(group)}'`)
      .join(', ')
    filters.push(`memoryGroup IN (${memoryGroupFilter})`)
  }
  return filters.join(' AND ')
}

function mapRetrievedSource(row: CreatorRagTableRow): CreatorRagRetrievedSource {
  return {
    sourceId: row.sourceId,
    workId: row.workId,
    branchId: row.branchId,
    chapterNo: row.chapterNo,
    authority: row.authority,
    memoryGroup: row.memoryGroup,
    revision: row.sourceRevision,
    locator: {
      recordId: row.sourceRecordId,
      label: row.sourceLocatorLabel,
    },
    text: row.text,
  }
}

function mapRetrievedChunk(row: CreatorRagTableRow): CreatorRagRetrievedChunk {
  return {
    ...mapRetrievedSource(row),
    chunkId: row.chunkId,
    chunkIndex: row.chunkIndex,
  }
}

function collapseChunks(rows: CreatorRagTableRow[], limit: number) {
  const seen = new Set<string>()
  const sources: CreatorRagRetrievedSource[] = []
  for (const row of rows) {
    if (seen.has(row.sourceId)) continue
    seen.add(row.sourceId)
    sources.push(mapRetrievedSource(row))
    if (sources.length === limit) break
  }
  return sources
}

function appendManualHardIncludes(input: {
  automaticResults: CreatorRagRetrievedSource[]
  manualSelectedSourceIds: string[]
  sourceById: Map<string, CreatorRagSourceRecord>
  query: CreatorRagRetrievalQuery
}) {
  const finalSourceIds = input.automaticResults.map(result => result.sourceId)
  for (const sourceId of input.manualSelectedSourceIds) {
    const source = input.sourceById.get(sourceId)
    if (!source) throw new Error(`manual recall source does not exist: ${sourceId}`)
    if (source.workId !== input.query.workId) throw new Error(`manual recall source belongs to another work: ${sourceId}`)
    if (source.branchId !== input.query.branchId) throw new Error(`manual recall source belongs to another branch: ${sourceId}`)
    if (source.chapterNo > input.query.currentChapterNo) throw new Error(`manual recall source is from a future chapter: ${sourceId}`)
    const authorities = input.query.allowedAuthorities?.length
      ? input.query.allowedAuthorities
      : defaultAuthorities
    if (!authorities.includes(source.authority)) throw new Error(`manual recall source authority is not allowed: ${sourceId}`)
    if (!finalSourceIds.includes(sourceId)) finalSourceIds.push(sourceId)
  }
  return finalSourceIds
}

export async function createCreatorLanceDbRetriever(input: {
  databasePath: string
  sources: CreatorRagSourceRecord[]
  embedder: CreatorRagEmbedder
  tableName?: string
}): Promise<CreatorLanceDbRetriever> {
  if (!input.sources.length) throw new Error('creator RAG index requires at least one source')
  const chunks = await splitCreatorRagSources({ sources: input.sources })
  const embeddings = await input.embedder.embedPassages(chunks.map(chunk => chunk.pageContent))
  const rows: CreatorRagTableRow[] = chunks.map((chunk, index) => ({
    chunkId: `${chunk.metadata.sourceId}#${chunk.metadata.chunkIndex}`,
    sourceId: chunk.metadata.sourceId,
    workId: chunk.metadata.workId,
    branchId: chunk.metadata.branchId,
    chapterNo: chunk.metadata.chapterNo,
    authority: chunk.metadata.authority,
    memoryGroup: chunk.metadata.memoryGroup,
    sourceRevision: chunk.metadata.sourceRevision,
    sourceRecordId: chunk.metadata.sourceRecordId,
    sourceLocatorLabel: chunk.metadata.sourceLocatorLabel,
    chunkIndex: chunk.metadata.chunkIndex,
    text: chunk.pageContent,
    vector: embeddings[index] ?? [],
  }))
  if (rows.some(row => !row.vector.length)) throw new Error('creator RAG embedding result is incomplete')

  const database = await connect(input.databasePath)
  const table = await database.createTable(input.tableName ?? 'creator_memory', rows, { mode: 'overwrite' })
  await table.createIndex('text', {
    config: Index.fts({
      baseTokenizer: 'ngram',
      ngramMinLength: 2,
      ngramMaxLength: 3,
      lowercase: true,
      withPosition: true,
    }),
  })
  const rrf = await rerankers.RRFReranker.create()
  const sourceById = new Map(input.sources.map(source => [source.id, source]))

  const searchRows = async (query: CreatorRagRetrievalQuery, limit: number) => {
    if (!Number.isInteger(query.currentChapterNo) || query.currentChapterNo < 1) {
      throw new Error('currentChapterNo must be a positive integer')
    }
    if (!Number.isInteger(limit) || limit < 1) throw new Error('retrieval limit must be a positive integer')
    const queryVector = await input.embedder.embedQuery(query.text)
    return table
      .vectorSearch(queryVector)
      .fullTextSearch(query.text, { columns: 'text' })
      .where(buildMetadataFilter(query))
      .rerank(rrf)
      .limit(limit)
      .toArray() as Promise<CreatorRagTableRow[]>
  }

  return {
    async retrieve(query) {
      const limit = query.limit ?? 10
      const upstreamRows = await searchRows(query, Math.max(limit * 4, 20))
      const automaticResults = collapseChunks(upstreamRows, limit)
      const finalSourceIds = appendManualHardIncludes({
        automaticResults,
        manualSelectedSourceIds: query.manualSelectedSourceIds ?? [],
        sourceById,
        query,
      })
      return { automaticResults, finalSourceIds }
    },
    async retrieveChunkCandidates(query) {
      const rows = await searchRows(query, query.chunkLimit)
      return rows.map(mapRetrievedChunk)
    },
    dispose() {
      table.close()
      database.close()
    },
  }
}
