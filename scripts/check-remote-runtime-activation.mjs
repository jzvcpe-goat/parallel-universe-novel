#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
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

function latestReadinessLedger() {
  assert(existsSync(artifactDir), 'runtime artifact directory is missing; run npm run audit:live-runtime-readiness first')
  const files = readdirSync(artifactDir)
    .filter(name => /^live-runtime-readiness-.+\.json$/.test(name))
    .sort()
  assert(files.length > 0, 'no live runtime readiness ledger found; run npm run audit:live-runtime-readiness first')
  const filename = files.at(-1)
  return {
    path: join(artifactDir, filename),
    filename,
    payload: JSON.parse(readFileSync(join(artifactDir, filename), 'utf8')),
  }
}

function checkById(ledger, id) {
  return (ledger.checks || []).find(item => item.id === id) || null
}

function isPassed(ledger, id) {
  return checkById(ledger, id)?.status === 'passed'
}

function stage(id, label, checkIds, owner, nextAction) {
  const passed = checkIds.every(checkId => isPassed(ledger.payload, checkId))
  return {
    id,
    label,
    status: passed ? 'ready' : 'blocked',
    owner,
    checks: checkIds.map(checkId => ({
      id: checkId,
      status: checkById(ledger.payload, checkId)?.status || 'missing',
      detail: checkById(ledger.payload, checkId)?.detail || 'missing from readiness ledger',
    })),
    nextAction: passed ? 'No action needed for this stage.' : nextAction,
  }
}

function assertDocContains(doc, file, requiredTerms) {
  for (const term of requiredTerms) {
    assert(doc.includes(term), `${file} must include ${term}`)
  }
}

function scanNoPrivateTerms(payload) {
  const text = JSON.stringify(payload)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /system prompt/i,
    /provider secret/i,
    /database_url/i,
    /authorization:\s*bearer\s+(?!<shared-tool-bridge-secret>)/i,
    /representative work/i,
    /sourceRefs/,
    /reference-work-vault/i,
    /rawState/i,
    /StateVector/,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

const ledger = latestReadinessLedger()
const packageJson = readJson('package.json')
const workflow = read('.github/workflows/pages.yml')
const p20 = read('docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md')
const p23 = read('docs/backend/P23_LIVE_RUNTIME_READINESS_LEDGER.md')
const p45 = read('docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md')
const p46 = read('docs/backend/P46_REMOTE_RUNTIME_ACTIVATION_GATE.md')
const activationScript = read('scripts/check-remote-runtime-activation.mjs')

const requiredCheckIds = [
  'public-runtime-mode',
  'api-origin',
  'agent-origin',
  'api-base-url',
  'local-fallback-disabled',
  'api-health',
  'agent-health',
  'creator-workflow-preflight',
]

for (const checkId of requiredCheckIds) {
  assert(checkById(ledger.payload, checkId), `latest readiness ledger missing ${checkId}`)
}

const stages = [
  stage(
    'github-pages-runtime-vars',
    'GitHub Pages runtime variables',
    ['public-runtime-mode', 'api-origin', 'agent-origin', 'api-base-url', 'local-fallback-disabled'],
    'release operator',
    'Set GitHub repository variables for live mode only after remote FastAPI and Agent Runtime are deployed.',
  ),
  stage(
    'remote-service-health',
    'Remote FastAPI and Agent health',
    ['api-health', 'agent-health'],
    'backend runtime owner',
    'Make both remote /health endpoints return ok or healthy over HTTPS.',
  ),
  stage(
    'creator-workflow-preflight',
    'Creator seed-to-candidate workflow',
    ['creator-workflow-preflight'],
    'agent runtime owner',
    'Fix /v1/workflows/socratic-create until it returns a public candidate, 0-2 questions, and no internal fields.',
  ),
]

const blockedStages = stages.filter(item => item.status !== 'ready')
const activationStatus = blockedStages.length === 0 ? 'ready' : 'blocked'
const releaseDecision = activationStatus === 'ready' ? 'can_enable_public_live_runtime' : 'hold_public_live_runtime_disabled'

const requiredWorkflowTerms = [
  'VITE_PUBLIC_RUNTIME_MODE: ${{ vars.VITE_PUBLIC_RUNTIME_MODE || \'disabled\' }}',
  'VITE_API_ORIGIN: ${{ vars.VITE_API_ORIGIN }}',
  'VITE_AGENT_RUNTIME_BASE_URL: ${{ vars.VITE_AGENT_RUNTIME_BASE_URL }}',
  'REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness',
  'REQUIRE_PUBLIC_RUNTIME=true npm run qa:live-runtime-browser',
  'Upload runtime readiness ledger',
  'Check current run evidence artifacts',
]

for (const term of requiredWorkflowTerms) {
  assert(workflow.includes(term), `.github/workflows/pages.yml missing ${term}`)
}

assert(
  packageJson.scripts['check:remote-runtime-activation'] === 'node scripts/check-remote-runtime-activation.mjs',
  'package.json must expose check:remote-runtime-activation',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-runtime-activation'),
  'root npm run test must include check:remote-runtime-activation',
)

assertDocContains(p20, 'docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md', [
  'Activation Sequence',
  'GitHub Repository Variables',
  'Live Smoke',
  'Rollback',
  'Acceptance Evidence',
])
assertDocContains(p23, 'docs/backend/P23_LIVE_RUNTIME_READINESS_LEDGER.md', [
  'creator-workflow-preflight',
  'blockedChecks',
  'repoVariables.source',
])
assertDocContains(p45, 'docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md', [
  'commercial-release-chain',
  'blocked',
  'Public live runtime',
])
assertDocContains(p46, 'docs/backend/P46_REMOTE_RUNTIME_ACTIVATION_GATE.md', [
  'P46 Remote Runtime Activation Gate',
  'GitHub Pages runtime variables',
  'Remote FastAPI and Agent health',
  'Creator seed-to-candidate workflow',
  'hold_public_live_runtime_disabled',
  'can_enable_public_live_runtime',
])
assert(
  activationScript.includes('latestReadinessLedger') && activationScript.includes('releaseDecision'),
  'activation script must read the latest readiness ledger and output a releaseDecision',
)

const artifact = {
  generatedAt: new Date().toISOString(),
  status: activationStatus,
  releaseDecision,
  sourceLedger: {
    filename: ledger.filename,
    status: ledger.payload.status,
    generatedAt: ledger.payload.generatedAt,
    repoVariables: {
      checked: Boolean(ledger.payload.repoVariables?.checked),
      source: ledger.payload.repoVariables?.source || 'unknown',
    },
  },
  stages,
  blockedStages: blockedStages.map(item => ({
    id: item.id,
    label: item.label,
    nextAction: item.nextAction,
    blockedChecks: item.checks.filter(check => check.status !== 'passed').map(check => check.id),
  })),
  requiredEvidence: [
    'runtime-readiness-ledger',
    'local-live-runtime-visual-qa',
    'github-pages',
    'remote-runtime-activation artifact',
  ],
  commands: {
    generateLedger: 'npm run audit:live-runtime-readiness',
    validateLedger: 'npm run check:runtime-readiness-ledger',
    validateActivation: 'npm run check:remote-runtime-activation',
    validateCiArtifacts: 'npm run check:github-actions-artifacts',
  },
}

const privateViolations = scanNoPrivateTerms(artifact)
assert(privateViolations.length === 0, `remote runtime activation artifact privacy violations: ${privateViolations.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `remote-runtime-activation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: activationStatus === 'ready' ? 'passed' : 'passed_with_activation_blockers',
  artifactPath,
  releaseDecision,
  blockedStages: artifact.blockedStages,
}, null, 2))
