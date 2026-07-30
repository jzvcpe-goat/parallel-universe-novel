#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const failures = []
const policyPath = 'docs/data-contracts/creator-rag-open-source-boundary.md'
const agentRulesPath = 'AGENTS.md'
const manualRecallPath = 'app/src/apps/creator/routes/creatorEditorRecallViewModels.ts'
const approvedAdapterRoot = 'app/src/integrations/creator-rag/'
const approvedPackages = new Set([
  '@huggingface/transformers',
  '@lancedb/lancedb',
  '@langchain/textsplitters',
])

function read(path) {
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) {
    failures.push(`missing ${path}`)
    return ''
  }
  return readFileSync(absolute, 'utf8')
}

function collect(path) {
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) return []
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = `${path}/${entry.name}`
    if (entry.isDirectory()) return collect(child)
    if (!entry.isFile() || !/\.(?:js|mjs|cjs|ts|tsx)$/.test(entry.name)) return []
    return [child]
  })
}

const policy = read(policyPath)
const allowedInactiveStatuses = new Set([
  'baseline_measured_not_activated',
  'full_manuscript_measured_not_activated',
])
const policyStatus = policy.match(/^Status: `([^`]+)`/m)?.[1]
if (!policyStatus || !allowedInactiveStatuses.has(policyStatus)) {
  failures.push(
    `${policyPath} must declare an approved measured-but-not-activated status; received ${policyStatus || 'missing'}`,
  )
}
for (const marker of [
  'It is **not RAG**',
  '@langchain/textsplitters',
  '@lancedb/lancedb',
  'RRFReranker',
  '@huggingface/transformers',
  'FlagOpen/FlagEmbedding',
  approvedAdapterRoot,
  'wrong-work leakage: `0`',
  'manual-selection inclusion: `100%`',
  'Automatic retrieval therefore remains disabled and `contract_only`',
]) {
  if (!policy.includes(marker)) failures.push(`${policyPath} missing ${marker}`)
}

const agentRules = read(agentRulesPath)
for (const marker of [
  'Do not implement a custom RAG engine',
  policyPath,
  'npm run check:no-custom-rag',
]) {
  if (!agentRules.includes(marker)) failures.push(`${agentRulesPath} missing ${marker}`)
}

const manualRecall = read(manualRecallPath)
for (const marker of ['buildCreatorRecallCandidates', 'resolveManualRecallItems', 'recommendedCreatorRecallIds']) {
  if (!manualRecall.includes(marker)) failures.push(`${manualRecallPath} missing deterministic manual recall owner ${marker}`)
}
for (const packageName of approvedPackages) {
  if (manualRecall.includes(packageName)) {
    failures.push(`${manualRecallPath} must remain the manual projection and cannot import ${packageName}`)
  }
}

const customAlgorithmPatterns = [
  /\bfunction\s+(?:cosineSimilarity|dotProduct|bm25Score|rrfScore|reciprocalRankFusion|hybridRank|customRerank|rerankDocuments|embedText|vectorizeText|chunkDocument|splitIntoChunks)\b/i,
  /\b(?:const|let|var)\s+(?:cosineSimilarity|dotProduct|bm25Score|rrfScore|reciprocalRankFusion|hybridRank|customRerank|rerankDocuments|embedText|vectorizeText|chunkDocument|splitIntoChunks)\s*=/i,
  /class\s+(?:Custom|Local|Creator)(?:VectorStore|EmbeddingModel|Bm25|Rrf|Reranker|SemanticChunker)\b/i,
]
const importPattern = /(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g
const scannedFiles = [...collect('app/src'), ...collect('scripts')]
  .filter(path => path !== 'scripts/check-no-custom-rag.mjs')

for (const path of scannedFiles) {
  const source = readFileSync(resolve(root, path), 'utf8')
  for (const pattern of customAlgorithmPatterns) {
    if (pattern.test(source)) failures.push(`${path} appears to implement a custom retrieval algorithm: ${pattern}`)
  }

  for (const match of source.matchAll(importPattern)) {
    const packageName = match[1]
    if (!approvedPackages.has(packageName)) continue
    if (!path.startsWith(approvedAdapterRoot)) {
      failures.push(`${path} imports ${packageName} outside ${approvedAdapterRoot}`)
    }
  }
}

for (const packagePath of ['package.json', 'app/package.json']) {
  const manifest = JSON.parse(read(packagePath) || '{}')
  const dependencies = {
    ...(manifest.dependencies || {}),
    ...(manifest.devDependencies || {}),
    ...(manifest.optionalDependencies || {}),
  }
  for (const dependency of Object.keys(dependencies)) {
    if (!/(?:lancedb|transformers|langchain|llamaindex|qdrant|chroma|weaviate|pinecone|milvus|faiss)/i.test(dependency)) continue
    if (!approvedPackages.has(dependency)) {
      failures.push(`${packagePath} contains unapproved retrieval dependency ${dependency}`)
    }
  }
}

const packageSource = read('package.json')
if (!packageSource.includes('"check:no-custom-rag"')) {
  failures.push('package.json must expose check:no-custom-rag')
}
if (!packageSource.includes('npm run check:no-custom-rag && npm run check:creator-rag-bootstrap && npm run check:local-domain-boundary')) {
  failures.push('check:pivot must run no-custom-rag and creator-rag-bootstrap before the local-domain boundary')
}
if (!packageSource.includes('"check:creator-rag-bootstrap"')) {
  failures.push('package.json must expose check:creator-rag-bootstrap')
}

if (failures.length) {
  console.error('[no-custom-rag] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[no-custom-rag] PASS (${scannedFiles.length} source files; manual recall stays deterministic; automatic retrieval is upstream-only)`)
