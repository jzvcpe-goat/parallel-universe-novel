import { env, pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers'

export interface CreatorRagEmbeddingModelConfig {
  id: string
  baseModelId: string
  revision: string
  dtype: 'q8'
  dimensions: number
  package: '@huggingface/transformers'
  packageVersion: string
  modelLicense: string
  queryPrefix: string
  passagePrefix: string
}

export const creatorRagEmbeddingModel: CreatorRagEmbeddingModelConfig = {
  id: 'Xenova/multilingual-e5-small',
  baseModelId: 'intfloat/multilingual-e5-small',
  revision: '761b726',
  dtype: 'q8',
  dimensions: 384,
  package: '@huggingface/transformers',
  packageVersion: '4.2.0',
  modelLicense: 'MIT',
  queryPrefix: 'query: ',
  passagePrefix: 'passage: ',
}

export const creatorRagBgeSmallZhEmbeddingModel: CreatorRagEmbeddingModelConfig = {
  id: 'Xenova/bge-small-zh-v1.5',
  baseModelId: 'BAAI/bge-small-zh-v1.5',
  revision: '75c43b069aac4d136ba6bc1122f995fedcfd2781',
  dtype: 'q8',
  dimensions: 512,
  package: '@huggingface/transformers',
  packageVersion: '4.2.0',
  modelLicense: 'MIT',
  queryPrefix: '为这个句子生成表示以用于检索相关文章：',
  passagePrefix: '',
}

export const creatorRagOfficialEmbeddingSource = {
  remoteHost: 'https://huggingface.co/',
  revision: creatorRagEmbeddingModel.revision,
} as const

export const creatorRagVerifiedModelScopeMirror = {
  remoteHost: 'https://modelscope.cn/models/',
  revision: '252d0dcb679dda2c7b6fd5bbfed15df3c7feaebf',
  modelQuantizedSha256: 'f80102d3f2a1229f387d3c81909990d8945513e347b0eab049f7de3c6f98c193',
  tokenizerSha256: '0b44a9d7b51c3c62626640cda0e2c2f70fdacdc25bbbd68038369d14ebdf4c39', // gitleaks:allow -- SHA-256 artifact digest, not a credential.
} as const

export const creatorRagBgeSmallZhVerifiedSource = {
  remoteHost: 'https://huggingface.co/',
  revision: creatorRagBgeSmallZhEmbeddingModel.revision,
  modelQuantizedSha256: '15b717c382bcb518ba457b93ea6850ede7f4f1cd8937454aa06972366cd19bcc', // gitleaks:allow -- SHA-256 artifact digest, not a credential.
  tokenizerSha256: '48cea5d44424912a6fd1ea647bf4fe50b55ab8b1e5879c3275f80e339e8fae26', // gitleaks:allow -- SHA-256 artifact digest, not a credential.
  configSha256: 'd4193ead3a810fd694fa8a31d7fc72fbaebc0668b603e398734bf2f6538ff42f', // gitleaks:allow -- SHA-256 artifact digest, not a credential.
  tokenizerConfigSha256: 'e6f3b96db926a37d4039995fbf5ad17de158dfb8f6343d607e4dbaad18d75f5a', // gitleaks:allow -- SHA-256 artifact digest, not a credential.
} as const

export interface CreatorRagEmbedder {
  embedPassages(texts: string[]): Promise<number[][]>
  embedQuery(text: string): Promise<number[]>
  dispose(): Promise<void>
}

export interface CreatorRagEmbeddingSource {
  remoteHost: string
  revision: string
}

function validateEmbeddingRows(rows: unknown, expectedRows: number, dimensions: number): number[][] {
  if (!Array.isArray(rows) || rows.length !== expectedRows) {
    throw new Error(`embedding row count mismatch: expected ${expectedRows}`)
  }
  return rows.map((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== dimensions) {
      throw new Error(`embedding dimension mismatch at row ${rowIndex}`)
    }
    if (!row.every(value => typeof value === 'number' && Number.isFinite(value))) {
      throw new Error(`embedding contains a non-finite value at row ${rowIndex}`)
    }
    return row
  })
}

async function extractRows(extractor: FeatureExtractionPipeline, texts: string[], dimensions: number) {
  if (!texts.length) return []
  const output = await extractor(texts, {
    pooling: 'mean',
    normalize: true,
  })
  return validateEmbeddingRows(output.tolist(), texts.length, dimensions)
}

export async function createCreatorLocalEmbeddingModel(options: {
  model?: CreatorRagEmbeddingModelConfig
  source?: CreatorRagEmbeddingSource
  cacheDir?: string
  localModelPath?: string
  localFilesOnly?: boolean
} = {}): Promise<CreatorRagEmbedder> {
  const model = options.model ?? creatorRagEmbeddingModel
  const source = options.source ?? {
    remoteHost: creatorRagOfficialEmbeddingSource.remoteHost,
    revision: model.revision,
  }
  const pretrainedModelPath = options.localModelPath ?? model.id
  const previousRemoteHost = env.remoteHost
  env.remoteHost = source.remoteHost
  let extractor: FeatureExtractionPipeline
  try {
    extractor = await pipeline(
      'feature-extraction',
      pretrainedModelPath,
      {
        revision: source.revision,
        dtype: model.dtype,
        cache_dir: options.cacheDir,
        local_files_only: options.localFilesOnly,
      },
    )
  } finally {
    env.remoteHost = previousRemoteHost
  }

  return {
    embedPassages(texts) {
      return extractRows(extractor, texts.map(text => `${model.passagePrefix}${text}`), model.dimensions)
    },
    async embedQuery(text) {
      const [embedding] = await extractRows(extractor, [`${model.queryPrefix}${text}`], model.dimensions)
      if (!embedding) throw new Error('query embedding is missing')
      return embedding
    },
    dispose() {
      return extractor.dispose()
    },
  }
}
