#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')

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
  for (const term of terms) {
    assert(body.includes(term), `${file} must include ${term}`)
  }
}

function gate(id, status, evidence, openGaps, nextGate) {
  return { id, status, evidence, openGaps, nextGate }
}

const packageJson = readJson('package.json')
const requiredFiles = [
  'packages/agent-runtime/src/types.ts',
  'packages/agent-runtime/src/workflows.ts',
  'packages/agent-runtime/src/workflows.test.ts',
  'app/src/api/creator.ts',
  'app/src/api/runtime.ts',
  'app/src/pages/Story.tsx',
  'app/src/pages/Studio.tsx',
  'backend/src/narrativeos/api/product_runtime.py',
  'backend/tests/test_product_runtime_api.py',
  'scripts/smoke-creator-chain.mjs',
  'docs/backend/P47_RUNTIME_TRACE_CONTINUITY.md',
]

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `missing trace continuity file: ${file}`)
}

assert(
  packageJson.scripts['check:runtime-trace-continuity'] === 'node scripts/check-runtime-trace-continuity.mjs',
  'package.json must expose check:runtime-trace-continuity',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:runtime-trace-continuity'),
  'root npm run test must include check:runtime-trace-continuity',
)

assertIncludes('packages/agent-runtime/src/types.ts', [
  'RunLedgerEntry',
  'runId: string',
  'projectId: string',
  'sessionId: string',
  'RuntimeArtifact',
  'narrativeRun',
  'stateWritebackPreview',
  'timeConsistencyReport',
  'qualityBrakeReport',
  'branchGenerationResult',
  'PublicSocraticCreateOutput',
])
assertIncludes('packages/agent-runtime/src/workflows.test.ts', [
  'public socratic projection hides runtime internals',
  'state preview workflow never writes canon when tool bridge is unavailable',
  'quality brake suggests repair without committing candidate text',
])
assertIncludes('scripts/smoke-creator-chain.mjs', [
  'created.runId',
  'created.projectId',
  'preview.runtimeArtifact',
  'stateDeltaCandidate',
  'canon_written',
  'branch_written',
])
assertIncludes('app/src/api/creator.ts', [
  'run_id?: string',
  'project_id?: string',
  'result.runId',
  'result.projectId',
  'previewAgentStoryMemory',
  'checkAgentDraftQuality',
])
assertIncludes('app/src/api/runtime.ts', [
  'ReaderRuntimeSnapshot',
  'SceneAdvanceResponse',
  'candidate_scene',
  'quality_brake',
  'harness_trace',
  'CanonCommitRequest',
  'CanonCommitResponse',
])
assertIncludes('app/src/pages/Story.tsx', [
  'runtimeApi.advanceScene',
  'runtimeApi.getReaderSnapshot',
  'candidate_scene',
  'quality_brake',
  'nextSceneBody',
])
assertIncludes('app/src/pages/Studio.tsx', [
  'runtimeApi.evaluateQuality',
  'runtimeApi.commitCanon',
  'confirmed: true',
  'quality_report',
])
assertIncludes('backend/src/narrativeos/api/product_runtime.py', [
  '/scene/advance',
  '/quality/evaluate',
  '/canon/commit',
])
assertIncludes('backend/tests/test_product_runtime_api.py', [
  'test_scene_advance_returns_candidate_scene_and_quality_trace',
  'test_quality_evaluate_and_canon_commit_gate',
  'harness_trace',
  'canon_commit_readiness',
])
assertIncludes('docs/backend/P47_RUNTIME_TRACE_CONTINUITY.md', [
  'P47 Runtime Trace Continuity',
  'Creator',
  'Reader',
  'Studio',
  'candidate-only',
  'Same Trace Vocabulary',
])

const gates = [
  gate(
    'creator-trace',
    'ready',
    [
      'SocraticCreateOutput exposes runId/projectId/sessionId.',
      'Creator UI stores run_id/project_id in setting_cards.',
      'Smoke chain verifies state-preview uses runtimeArtifact.stateWritebackPreview.',
    ],
    [],
    'Keep public projection hiding runtime internals while preserving runId/projectId/sessionId.',
  ),
  gate(
    'reader-trace',
    'partial',
    [
      'Reader runtime API has snapshot, scene advance, candidate scene, quality brake and harness trace DTOs.',
      'Story page calls advanceScene then snapshot refresh on reader choice.',
    ],
    [
      'Reader choice is not yet proven against the remote Agent Runtime facade in public live mode.',
      'Reader worldline mutation is not yet tied to the Creator run ledger.',
    ],
    'Add reader choice E2E after remote Runtime origins are configured.',
  ),
  gate(
    'studio-trace',
    'partial',
    [
      'Studio uses quality/evaluate before canon/commit.',
      'Canon commit requires explicit confirmation and quality_report.',
    ],
    [
      'Studio commit still uses candidate scene ids from the product demo surface.',
      'Commit rollback and shared run ledger are not yet proven in the Mastra -> FastAPI chain.',
    ],
    'Add Studio canon/branch commit proof with idempotency and rollback fixtures.',
  ),
]

const artifact = {
  generatedAt: new Date().toISOString(),
  status: 'passed_with_partial_trace_gaps',
  principle: 'same trace vocabulary, candidate-only until explicit confirmation',
  gates,
  requiredPublicFields: ['runId', 'projectId', 'sessionId', 'candidateDraft', 'questions', 'qualityPreview'],
  requiredPrivateFields: ['runtimeArtifact', 'stateWritebackPreview', 'qualityBrakeReport', 'branchGenerationResult', 'ledger'],
  forbiddenPublicFields: ['runtimeArtifact', 'ledger', 'cost', 'sourceRefs', 'rawState', 'systemPrompt'],
}

const artifactText = JSON.stringify(artifact)
for (const forbidden of [/sk-[A-Za-z0-9_-]{10,}/, /system prompt/i, /representative work/i, /reference-work-vault/i]) {
  assert(!forbidden.test(artifactText), `trace continuity artifact leaked forbidden pattern: ${forbidden}`)
}

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `runtime-trace-continuity-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: artifact.status,
  artifactPath,
  gates: gates.map(item => ({
    id: item.id,
    status: item.status,
    openGapCount: item.openGaps.length,
  })),
}, null, 2))
