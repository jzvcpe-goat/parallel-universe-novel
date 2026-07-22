import {
  AutoModelForSequenceClassification,
  AutoTokenizer,
  env,
} from '@huggingface/transformers'

export interface CreatorRagPairModelConfig {
  id: string
  baseModelId: string
  revision: string
  dtype: 'q8'
  maxLength: number
  package: '@huggingface/transformers'
  packageVersion: string
  modelLicense: string
}

export interface CreatorRagPairModelArtifacts {
  modelQuantizedSha256: string
  configSha256: string
  tokenizerSha256: string
  tokenizerConfigSha256: string
}

export const creatorRagBgePairModel: CreatorRagPairModelConfig = {
  id: 'onnx-community/bge-reranker-v2-m3-ONNX',
  baseModelId: 'BAAI/bge-reranker-v2-m3',
  revision: 'master',
  dtype: 'q8',
  maxLength: 512,
  package: '@huggingface/transformers',
  packageVersion: '4.2.0',
  modelLicense: 'Apache-2.0',
} as const

export const creatorRagBgeBasePairModel: CreatorRagPairModelConfig = {
  id: 'Xenova/bge-reranker-base',
  baseModelId: 'BAAI/bge-reranker-base',
  revision: '280bcc27a84e0b898c251e06fddb25171bd9b101',
  dtype: 'q8',
  maxLength: 512,
  package: '@huggingface/transformers',
  packageVersion: '4.2.0',
  modelLicense: 'MIT',
} as const

export const creatorRagBgeOfficialSource = {
  remoteHost: 'https://huggingface.co/',
  revision: creatorRagBgePairModel.revision,
} as const

export const creatorRagBgeVerifiedModelScopeMirror = {
  remoteHost: 'https://modelscope.cn/models/',
  revision: 'master',
  modelQuantizedSha256: '912fc1215c2dbff6499700534bd8d31253af01573861abbfc43afd1fab6cce5d',
  configSha256: '122e922dcfed6503c8721e6fe1daf090340c3d95ca7f3aa3a72730b321a51cfd',
  tokenizerSha256: '8bf8afbfd11306bd872018c53bfdf2e160a56f8edbcf49933324404791c148d3', // gitleaks:allow -- SHA-256 artifact digest, not a credential.
  tokenizerConfigSha256: 'b87c8703482b0300d3da30e201519aa641f6a450f5eb5bf1e624afbf70c74d80', // gitleaks:allow -- SHA-256 artifact digest, not a credential.
} as const

export const creatorRagBgeBaseVerifiedSource = {
  remoteHost: 'https://huggingface.co/',
  revision: creatorRagBgeBasePairModel.revision,
  modelQuantizedSha256: 'dd98f3e67837d23210a6b7550c08cced4f61845b940ac45be3565840a10f3244',
  configSha256: 'b6575b9d5be20d6747417c8e20c5a0db1636356e0b6d422d7244c628423c4d4c',
  tokenizerSha256: '48564c5c7d3fa64d85d95e65414a542385f88b0f128fd8d4163fd7a57f2be05c', // gitleaks:allow -- SHA-256 artifact digest, not a credential.
  tokenizerConfigSha256: 'a1d6bc8734a6f635dc158508bef000f8e2e5a759c7d92f984b2c86e5ff53425b', // gitleaks:allow -- SHA-256 artifact digest, not a credential.
} as const

export interface CreatorRagPairScoreInput {
  query: string
  passage: string
}

export interface CreatorRagPairScorer {
  scorePairs(pairs: CreatorRagPairScoreInput[]): Promise<number[]>
  dispose(): Promise<void>
}

export interface CreatorRagPairModelSource {
  remoteHost: string
  revision: string
}

interface CreatorRagPairRuntime {
  scoreBatch(queries: string[], passages: string[]): Promise<unknown>
  dispose(): Promise<void>
}

function validatePairs(pairs: CreatorRagPairScoreInput[]) {
  for (const [index, pair] of pairs.entries()) {
    if (!pair.query.trim()) throw new Error(`pair ${index} query must not be empty`)
    if (!pair.passage.trim()) throw new Error(`pair ${index} passage must not be empty`)
  }
}

function validateLogits(value: unknown, expectedRows: number) {
  if (!Array.isArray(value) || value.length !== expectedRows) {
    throw new Error(`pair score row count mismatch: expected ${expectedRows}`)
  }
  return value.map((row, index) => {
    if (!Array.isArray(row) || row.length !== 1) {
      throw new Error(`pair score row ${index} must contain one upstream logit`)
    }
    const score = row[0]
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      throw new Error(`pair score row ${index} contains a non-finite upstream logit`)
    }
    return score
  })
}

export function createCreatorRagPairScorerFromRuntime(input: {
  runtime: CreatorRagPairRuntime
  batchSize?: number
}): CreatorRagPairScorer {
  const batchSize = input.batchSize ?? 8
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error('pair scorer batchSize must be a positive integer')
  }
  return {
    async scorePairs(pairs) {
      validatePairs(pairs)
      const scores: number[] = []
      for (let start = 0; start < pairs.length; start += batchSize) {
        const batch = pairs.slice(start, start + batchSize)
        const rows = await input.runtime.scoreBatch(
          batch.map(pair => pair.query),
          batch.map(pair => pair.passage),
        )
        scores.push(...validateLogits(rows, batch.length))
      }
      return scores
    },
    dispose() {
      return input.runtime.dispose()
    },
  }
}

export async function createCreatorLocalBgePairScorer(options: {
  model?: CreatorRagPairModelConfig
  source?: CreatorRagPairModelSource
  cacheDir?: string
  localModelPath?: string
  batchSize?: number
  localFilesOnly?: boolean
} = {}): Promise<CreatorRagPairScorer> {
  const modelConfig = options.model ?? creatorRagBgePairModel
  const pretrainedModelPath = options.localModelPath ?? modelConfig.id
  const source = options.source ?? {
    remoteHost: creatorRagBgeOfficialSource.remoteHost,
    revision: modelConfig.revision,
  }
  const previousRemoteHost = env.remoteHost
  env.remoteHost = source.remoteHost
  try {
    const [tokenizer, model] = await Promise.all([
      AutoTokenizer.from_pretrained(pretrainedModelPath, {
        revision: source.revision,
        cache_dir: options.cacheDir,
        local_files_only: options.localFilesOnly,
      }),
      AutoModelForSequenceClassification.from_pretrained(pretrainedModelPath, {
        revision: source.revision,
        dtype: modelConfig.dtype,
        cache_dir: options.cacheDir,
        local_files_only: options.localFilesOnly,
      }),
    ])
    return createCreatorRagPairScorerFromRuntime({
      batchSize: options.batchSize,
      runtime: {
        async scoreBatch(queries, passages) {
          const inputs = tokenizer(queries, {
            text_pair: passages,
            padding: true,
            truncation: true,
            max_length: modelConfig.maxLength,
          })
          const output = await model(inputs)
          return output.logits.tolist()
        },
        async dispose() {
          await model.dispose()
        },
      },
    })
  } finally {
    env.remoteHost = previousRemoteHost
  }
}
