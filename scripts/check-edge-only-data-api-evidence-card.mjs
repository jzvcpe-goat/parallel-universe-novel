#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const gate = 'P163_EDGE_ONLY_DATA_API_EVIDENCE_CARD'
const cardPath = 'deploy/runtime-production/edge-only-data-api.evidence-card.example.md'

const docs = [
  'docs/backend/P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE.md',
  'docs/backend/P147_EDGE_ONLY_OPERATOR_EVIDENCE_PACKET.md',
  'docs/backend/P150_EDGE_ONLY_DATA_API_EVIDENCE_READINESS.md',
  'docs/backend/P151_EDGE_ONLY_DATA_API_STRICT_INTAKE.md',
  'docs/backend/P163_EDGE_ONLY_DATA_API_EVIDENCE_CARD.md',
]

const requiredNeedles = [
  'schema: narrativeos.edge_only_data_api_evidence_card.v1',
  'values_included: false',
  'runtime_mode: edge-only',
  'remote_agent_required: false',
  'cloud_ai_generation: false',
  'reader_cloud_ai_generation: false',
  'RUNTIME_ASSIGNMENT_OPERATOR_OWNER',
  'RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID',
  'SUPABASE_PROJECT_REF',
  'RUNTIME_ASSIGNMENT_DATA_API_ORIGIN',
  'SUPABASE_URL',
  'RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED=true',
  '.env.local',
  '.env.local.sync',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_ANON_KEY',
  'health_probe',
  'id=reader',
  'status=ok',
  'npm run prepare:edge-only-data-api-strict-intake',
]

const docNeedles = [
  cardPath,
  'RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID',
  'SUPABASE_PROJECT_REF',
  'RUNTIME_ASSIGNMENT_DATA_API_ORIGIN',
  'SUPABASE_URL',
  'RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED',
  'health_probe',
  'remote Agent Runtime',
]

const forbiddenPatterns = [
  /https:\/\/[^\s`]+/i,
  /[a-z0-9-]{12,}\.supabase\.co/i,
  /eyJ[A-Za-z0-9_-]{20,}/,
  /sk-[A-Za-z0-9_-]{10,}/,
  /postgres(?:ql)?:\/\/[^<\s`]+/i,
  /DATABASE_URL\s*[:=]\s*(?!<)/i,
  /SUPABASE_SERVICE_ROLE/i,
  /SERVICE_ROLE_KEY/i,
  /SUPABASE_SECRET_KEY/i,
  /SUPABASE_WRITER_PASSWORD\s*[:=]\s*(?!<)/i,
  /WRITER_PASSWORD\s*[:=]\s*(?!false|<)/i,
  /OPENAI_API_KEY/i,
  /DEEPSEEK_API_KEY/i,
  /MOONSHOT_API_KEY/i,
  /KIMI_API_KEY/i,
  /ANTHROPIC_API_KEY/i,
  /NARRATIVEOS_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/i,
  /MASTRA_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/i,
]

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function read(relPath) {
  return readFileSync(join(root, relPath), 'utf8')
}

function scanForbidden(label, text) {
  return forbiddenPatterns
    .filter(pattern => pattern.test(text))
    .map(pattern => `${label}: ${String(pattern)}`)
}

function writeArtifact(result) {
  mkdirSync(artifactDir, { recursive: true })
  const path = join(artifactDir, `edge-only-data-api-evidence-card-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`)
  return path
}

assert(existsSync(join(root, cardPath)), `missing evidence card template: ${cardPath}`)

const card = read(cardPath)
const missingCardNeedles = requiredNeedles.filter(needle => !card.includes(needle))
assert(missingCardNeedles.length === 0, `evidence card is missing required text: ${missingCardNeedles.join(', ')}`)

const cardLeaks = scanForbidden(cardPath, card)
assert(cardLeaks.length === 0, `evidence card contains forbidden private/public-boundary text: ${cardLeaks.join(', ')}`)

const checkedDocs = []
for (const docPath of docs) {
  assert(existsSync(join(root, docPath)), `missing P163 related doc: ${docPath}`)
  const content = read(docPath)
  const missing = docNeedles.filter(needle => !content.includes(needle))
  assert(missing.length === 0, `${docPath} is missing evidence-card contract text: ${missing.join(', ')}`)
  const leaks = scanForbidden(docPath, content)
  assert(leaks.length === 0, `${docPath} contains forbidden private/public-boundary text: ${leaks.join(', ')}`)
  checkedDocs.push(docPath)
}

const result = {
  version: 1,
  gate,
  generatedAt: new Date().toISOString(),
  status: 'passed',
  cardPath,
  checkedDocs,
  requiredOperatorInputs: [
    'operator-owner',
    'data-api-service-id-or-project-ref',
    'data-api-origin',
    'data-api-configured',
    'local-publishable-or-anon-key',
    'health-probe-reader-ok',
  ],
  boundary: {
    valuesIncluded: false,
    createsRemoteServices: false,
    setsGitHubVariables: false,
    storesProviderSecrets: false,
    storesServiceRoleKey: false,
    storesWriterPassword: false,
    requiresRemoteAgent: false,
    promotesLiveRuntime: false,
  },
}

const artifactPath = writeArtifact(result)
console.log(JSON.stringify({
  status: result.status,
  gate,
  cardPath,
  checkedDocCount: checkedDocs.length,
  artifactPath: relative(root, artifactPath),
}, null, 2))
