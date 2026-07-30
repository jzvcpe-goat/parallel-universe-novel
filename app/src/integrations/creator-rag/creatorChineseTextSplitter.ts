import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

export const creatorChineseTextSeparators = [
  '\n\n',
  '\n',
  '。',
  '！',
  '？',
  '；',
  '，',
  '、',
  '.',
  '!',
  '?',
  ';',
  ',',
  ' ',
  '',
]

export type CreatorRagMemoryGroup =
  | 'causal'
  | 'character_knowledge'
  | 'timeline'
  | 'promise'
  | 'unclassified'

export interface CreatorRagSourceRecord {
  id: string
  workId: string
  branchId: string
  chapterNo: number
  authority: 'canon' | 'author' | 'derived'
  memoryGroup?: CreatorRagMemoryGroup
  revision: number
  locator: {
    recordId: string
    label: string
  }
  text: string
}

export interface CreatorRagChunkMetadata {
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
  chunkCount: number
}

export interface CreatorRagChunk {
  pageContent: string
  metadata: CreatorRagChunkMetadata
}

export async function splitCreatorRagSources(input: {
  sources: CreatorRagSourceRecord[]
  chunkSize?: number
  chunkOverlap?: number
}): Promise<CreatorRagChunk[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: input.chunkSize ?? 420,
    chunkOverlap: input.chunkOverlap ?? 60,
    keepSeparator: true,
    separators: creatorChineseTextSeparators,
    lengthFunction: text => Array.from(text).length,
  })
  const output: CreatorRagChunk[] = []
  for (const source of input.sources) {
    const documents = await splitter.createDocuments([source.text])
    documents.forEach((document, chunkIndex) => {
      output.push({
        pageContent: document.pageContent,
        metadata: {
          sourceId: source.id,
          workId: source.workId,
          branchId: source.branchId,
          chapterNo: source.chapterNo,
          authority: source.authority,
          memoryGroup: source.memoryGroup ?? 'unclassified',
          sourceRevision: source.revision,
          sourceRecordId: source.locator.recordId,
          sourceLocatorLabel: source.locator.label,
          chunkIndex,
          chunkCount: documents.length,
        },
      })
    })
  }
  return output
}
