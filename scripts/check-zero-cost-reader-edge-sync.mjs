#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')

const forbiddenCloudAiPatterns = [
  /\/api\/generate/i,
  /\/api\/write/i,
  /OPENAI_API_KEY/i,
  /DEEPSEEK_API_KEY/i,
  /MOONSHOT_API_KEY/i,
  /KIMI_API_KEY/i,
  /ANTHROPIC_API_KEY/i,
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /SUPABASE_SECRET_KEY/i,
  /SUPABASE_WRITER_PASSWORD/i,
]

const workflowForbiddenPatterns = [
  ...forbiddenCloudAiPatterns,
  /\bservice_role\b/i,
  /\bcurl\b/i,
  /vercel\.app/i,
]

const publicScanRoots = [
  'app/src',
  'app/.env.example',
  '.github/workflows/keep-supabase-alive.yml',
]

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertIncludes(file, terms) {
  const body = read(file)
  for (const term of terms) assert(body.includes(term), `${file} must include ${term}`)
}

function assertNotIncludesPatterns(file, patterns) {
  const body = read(file)
  const matches = patterns.filter(pattern => pattern.test(body)).map(String)
  assert(matches.length === 0, `${file} includes forbidden zero-cost Reader boundary terms: ${matches.join(', ')}`)
}

function collectFiles(target) {
  const abs = join(root, target)
  if (!existsSync(abs)) return []
  const stat = statSync(abs)
  if (stat.isFile()) return [abs]
  const files = []
  function walk(current) {
    const currentStat = statSync(current)
    if (currentStat.isFile()) {
      files.push(current)
      return
    }
    for (const child of readdirSync(current)) walk(join(current, child))
  }
  walk(abs)
  return files
}

function scanPublicFiles() {
  const files = publicScanRoots
    .flatMap(collectFiles)
    .filter(file => !/(\.png|\.jpg|\.jpeg|\.webp|\.gif|\.ico|\.woff2?|\.ttf)$/i.test(file))

  const violations = []
  for (const file of files) {
    const rel = relative(root, file)
    const body = readFileSync(file, 'utf8')
    for (const pattern of forbiddenCloudAiPatterns) {
      if (pattern.test(body)) violations.push({ file: rel, pattern: String(pattern) })
    }
  }
  return { filesScanned: files.length, violations }
}

function scanNoSecretLikePayload(payload) {
  const text = JSON.stringify(payload)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /postgres(ql)?:\/\/[^<]/i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/,
    /SUPABASE_SERVICE_ROLE_KEY/i,
    /SUPABASE_SECRET_KEY/i,
    /SUPABASE_WRITER_PASSWORD/i,
    /OPENAI_API_KEY/i,
    /DEEPSEEK_API_KEY/i,
    /MOONSHOT_API_KEY/i,
    /KIMI_API_KEY/i,
    /ANTHROPIC_API_KEY/i,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(String)
}

const packageJson = readJson('package.json')
const workflowFile = '.github/workflows/keep-supabase-alive.yml'
const p134 = 'docs/backend/P134_ZERO_COST_READER_EDGE_SYNC_RUNBOOK.md'
const p135 = 'docs/backend/P135_ZERO_COST_READER_EDGE_SYNC_GATE.md'
const p136 = 'docs/backend/P136_ZERO_COST_READER_EDGE_SYNC_ARTIFACT_ATTESTATION.md'
const gitignore = '.gitignore'

for (const file of [workflowFile, p134, p135, p136, gitignore]) {
  assert(existsSync(join(root, file)), `missing zero-cost Reader edge sync file: ${file}`)
}

assert(
  packageJson.scripts['check:zero-cost-reader-edge-sync'] === 'node scripts/check-zero-cost-reader-edge-sync.mjs',
  'package.json must expose check:zero-cost-reader-edge-sync',
)
assert(
  String(packageJson.scripts.test || '').includes('npm run check:zero-cost-reader-edge-sync'),
  'root npm run test must include check:zero-cost-reader-edge-sync',
)

assertIncludes(workflowFile, [
  'schedule:',
  'workflow_dispatch:',
  'health_probe',
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  '@supabase/supabase-js',
  "configured=false",
  "if: steps.config.outputs.configured == 'true'",
])
assertNotIncludesPatterns(workflowFile, workflowForbiddenPatterns)

assertIncludes(gitignore, [
  '.env.local.sync',
  '.env.*.local',
  'backups/',
])

assertIncludes(p134, [
  'health_probe',
  '.env.local.sync',
  'novels_history',
  'cloud_ai_runtime: absent',
  'reader_can_trigger_ai: false',
  'best-effort guard',
  'roughly 60',
  'trusted password manager',
  'Supabase Dashboard',
  'Manual recovery query',
  'not one-click rollback',
  'P135 Zero-Cost Reader Edge Sync Gate',
])
assertIncludes(p135, [
  'keep-supabase-alive',
  'check:zero-cost-reader-edge-sync',
  'health_probe',
  'SUPABASE_PUBLISHABLE_KEY',
  'not a one-click rollback',
  'monthly release checks',
])
assertIncludes(p136, [
  'zero-cost-reader-edge-sync',
  'current-run mode',
  'manual workflow keep-alive',
  'sync env backup',
  'manual recovery SQL',
])

const publicScan = scanPublicFiles()
assert(publicScan.filesScanned > 0, 'zero-cost Reader public scan must inspect public files')
assert(
  publicScan.violations.length === 0,
  `public zero-cost Reader surfaces leaked forbidden cloud AI terms: ${publicScan.violations.map(item => `${item.file}:${item.pattern}`).join(', ')}`,
)

const artifact = {
  status: 'passed',
  gate: 'P135_ZERO_COST_READER_EDGE_SYNC_GATE',
  generatedAt: new Date().toISOString(),
  boundary: 'Zero-Cost Reader Edge Sync',
  checks: {
    rootTestIncludesGate: true,
    keepAliveWorkflowPresent: true,
    keepAliveQueriesSupabaseHealthProbe: true,
    keepAliveSkipsWhenSecretsMissing: true,
    workflowUsesPublishableKeyOnly: true,
    localSyncEnvIgnored: true,
    backupsIgnored: true,
    p134RunbookAligned: true,
    p135GateDocumented: true,
    operationalKeepAliveNeedsKeepAlive: true,
    syncEnvSinglePointFailureDocumented: true,
    historyManualRecoverySqlDocumented: true,
    publicCloudAiRoutesAbsent: true,
  },
  publicBoundary: {
    cloudHosting: 'static_reader_storage_read_health_only',
    cloudAiRuntime: 'absent',
    cloudAiApiKeys: 'absent',
    edgeAiRuntime: 'user_device_only',
    readerCanTriggerAi: false,
    historyRecoveryMode: 'manual_sql',
    syncEnvBackupRequired: true,
    manualWorkflowKeepAliveRequired: true,
  },
  scanStats: {
    publicFilesScanned: publicScan.filesScanned,
    violationCount: publicScan.violations.length,
  },
  redaction: {
    secretsIncluded: false,
    providerKeysIncluded: false,
    writerPasswordIncluded: false,
  },
}

const secretMatches = scanNoSecretLikePayload(artifact)
assert(secretMatches.length === 0, `zero-cost Reader artifact leaked secret-like markers: ${secretMatches.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `zero-cost-reader-edge-sync-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: 'passed',
  gate: artifact.gate,
  artifact: relative(root, artifactPath),
  publicFilesScanned: publicScan.filesScanned,
}, null, 2))
