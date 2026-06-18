#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const workflow = read('.github/workflows/pages.yml')
const p16Doc = read('docs/backend/P16_PAGES_LIVE_RELEASE_GATE.md')
const p43Doc = read('docs/backend/P43_CI_ARTIFACT_EVIDENCE_GATE.md')
const p15Doc = read('docs/backend/P15_LIVE_RUNTIME_SMOKE_CONTRACT.md')
const packageJson = JSON.parse(read('package.json'))
const node24ActionVersions = [
  'actions/checkout@v6',
  'actions/setup-node@v6',
  'actions/setup-python@v6',
  'actions/upload-artifact@v7',
  'actions/configure-pages@v6',
  'actions/upload-pages-artifact@v5',
  'actions/deploy-pages@v5',
]

for (const action of node24ActionVersions) {
  assert(
    workflow.includes(action),
    `Pages workflow must use Node 24-compatible action ${action}`,
  )
}

assert(
  workflow.includes('Gate public runtime release mode'),
  'Pages workflow must include an explicit public runtime release gate step',
)
assert(
  workflow.includes("VITE_PUBLIC_RUNTIME_MODE: ${{ vars.VITE_PUBLIC_RUNTIME_MODE || 'disabled' }}"),
  'Pages workflow must default public runtime mode to disabled through GitHub vars',
)
assert(
  workflow.includes('actions: read')
    && workflow.includes('GH_TOKEN: ${{ github.token }}'),
  'Pages workflow must grant GH_TOKEN actions read access so readiness ledgers can audit GitHub repository variables',
)
assert(
  workflow.includes('Run runtime checks')
    && workflow.includes('VITE_API_ORIGIN: ${{ vars.VITE_API_ORIGIN }}')
    && workflow.includes('VITE_AGENT_RUNTIME_BASE_URL: ${{ vars.VITE_AGENT_RUNTIME_BASE_URL }}'),
  'Run runtime checks must receive the same GitHub vars context used by the release gate',
)
assert(
  workflow.includes('Install browser QA dependencies')
    && workflow.includes('npx playwright install chromium')
    && workflow.includes('Run local live runtime browser QA')
    && workflow.includes('npm run qa:live-runtime-local')
    && workflow.indexOf('Run local live runtime browser QA') < workflow.indexOf('Gate public runtime release mode'),
  'Pages workflow must run local live-mode browser QA before the public runtime release gate',
)
assert(
  workflow.includes('Upload local live runtime visual QA')
    && workflow.includes('local-live-runtime-visual-qa')
    && workflow.includes('artifacts/visual-qa/p15-live-runtime-e2e-*.png')
    && workflow.indexOf('Upload local live runtime visual QA') > workflow.indexOf('Run local live runtime browser QA'),
  'Pages workflow must upload local live runtime visual QA screenshots after the local browser gate',
)
assert(
  packageJson.devDependencies?.playwright,
  'package.json must keep Playwright as a controlled devDependency instead of installing it ad hoc in CI',
)
assert(
  workflow.includes('VITE_API_ORIGIN: ${{ vars.VITE_API_ORIGIN }}')
    && workflow.includes('VITE_AGENT_RUNTIME_BASE_URL: ${{ vars.VITE_AGENT_RUNTIME_BASE_URL }}'),
  'Pages workflow must source remote API and Agent URLs from GitHub vars',
)
assert(
  workflow.includes('if [ "$VITE_PUBLIC_RUNTIME_MODE" = "live" ]; then')
    && workflow.includes('REQUIRE_PUBLIC_RUNTIME=true npm run check:public-runtime-preview')
    && workflow.includes('REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness')
    && workflow.includes('REQUIRE_LIVE_CUTOVER_ATTESTED=true npm run check:live-cutover-attestation')
    && workflow.includes('npm run check:live-rollback-rehearsal')
    && workflow.includes('REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true npm run check:remote-runtime-activation-control')
    && workflow.includes('REQUIRE_PUBLIC_RUNTIME=true npm run qa:live-runtime-browser'),
  'Pages workflow must require live checks, readiness ledger, cutover attestation, activation control, rollback rehearsal, and browser smoke before any live public build',
)
assert(
  workflow.includes('REMOTE_API_SERVICE_ID: ${{ vars.REMOTE_API_SERVICE_ID }}')
    && workflow.includes('REMOTE_AGENT_SERVICE_ID: ${{ vars.REMOTE_AGENT_SERVICE_ID }}')
    && workflow.includes("REMOTE_API_SECRETS_CONFIGURED: ${{ vars.REMOTE_API_SECRETS_CONFIGURED || 'false' }}")
    && workflow.includes("REMOTE_AGENT_SECRETS_CONFIGURED: ${{ vars.REMOTE_AGENT_SECRETS_CONFIGURED || 'false' }}"),
  'Pages workflow must receive non-secret remote service attestation vars',
)
assert(
  workflow.includes('npm run audit:live-runtime-readiness')
    && workflow.indexOf('npm run audit:live-runtime-readiness') < workflow.indexOf('Build Creator Studio'),
  'Pages workflow must generate the readiness ledger before the Creator Studio build step',
)
assert(
  workflow.includes('Upload runtime readiness ledger')
    && workflow.includes('if: always()')
    && workflow.includes('actions/upload-artifact@v7')
    && workflow.includes('artifacts/runtime/live-runtime-readiness-*.json')
    && workflow.indexOf('Upload runtime readiness ledger') > workflow.indexOf('Gate public runtime release mode'),
  'Pages workflow must upload the readiness ledger artifact after the runtime gate, including failed live gates',
)
assert(
  workflow.includes('Upload live cutover attestation')
    && workflow.includes('live-cutover-attestation')
    && workflow.includes('artifacts/runtime/live-cutover-attestation-*.json')
    && workflow.indexOf('Upload live cutover attestation') > workflow.indexOf('Gate public runtime release mode'),
  'Pages workflow must upload the live cutover attestation artifact after the runtime gate',
)
assert(
  workflow.includes('Upload live rollback rehearsal')
    && workflow.includes('live-rollback-rehearsal')
    && workflow.includes('artifacts/runtime/live-rollback-rehearsal-*.json')
    && workflow.indexOf('Upload live rollback rehearsal') > workflow.indexOf('Gate public runtime release mode'),
  'Pages workflow must upload the live rollback rehearsal artifact after the runtime gate',
)
assert(
  workflow.includes('Upload remote runtime activation control')
    && workflow.includes('remote-runtime-activation-control')
    && workflow.includes('artifacts/runtime/remote-activation-control-*.json')
    && workflow.indexOf('Upload remote runtime activation control') > workflow.indexOf('Gate public runtime release mode'),
  'Pages workflow must upload the remote runtime activation control artifact after the runtime gate',
)
assert(
  workflow.includes('Upload remote assignment execution pack')
    && workflow.includes('remote-assignment-execution-pack')
    && workflow.includes('artifacts/runtime/remote-assignment-execution-pack-*.json')
    && workflow.includes('artifacts/runtime/remote-assignment-execution-pack-*.md')
    && workflow.indexOf('Upload remote assignment execution pack') > workflow.indexOf('Gate public runtime release mode'),
  'Pages workflow must upload the remote assignment execution pack artifact after root runtime checks',
)
assert(
  workflow.includes('Upload remote assignment handoff')
    && workflow.includes('remote-assignment-handoff')
    && workflow.includes('artifacts/runtime/remote-assignment-handoff-*.json')
    && workflow.includes('artifacts/runtime/remote-assignment-handoff-*.md')
    && workflow.indexOf('Upload remote assignment handoff') > workflow.indexOf('Run runtime checks'),
  'Pages workflow must upload the remote assignment handoff artifact after root runtime checks',
)
assert(
  workflow.includes('Upload remote assignment fixture gate')
    && workflow.includes('remote-assignment-fixture-gate')
    && workflow.includes('artifacts/runtime/remote-assignment-fixture-gate-*.json')
    && workflow.indexOf('Upload remote assignment fixture gate') > workflow.indexOf('Run runtime checks'),
  'Pages workflow must upload the remote assignment fixture gate artifact after root runtime checks',
)
assert(
  workflow.includes('Upload remote runtime blocker ledger')
    && workflow.includes('remote-runtime-blockers')
    && workflow.includes('artifacts/runtime/remote-runtime-blockers-*.json')
    && workflow.includes('artifacts/runtime/remote-runtime-blockers-*.md')
    && workflow.indexOf('Upload remote runtime blocker ledger') > workflow.indexOf('Run runtime checks'),
  'Pages workflow must upload the remote runtime blocker ledger artifact after root runtime checks',
)
assert(
  workflow.includes('Scan built Pages privacy')
    && workflow.includes('npm run scan:reference-privacy')
    && workflow.includes('PUBLIC_PROJECTION_PRIVACY_SKIP_BUILD=true npm run check:public-projection-privacy')
    && workflow.includes('Upload reference privacy evidence')
    && workflow.includes('reference-privacy')
    && workflow.includes('artifacts/runtime/reference-privacy-*.json')
    && workflow.includes('Upload public projection privacy evidence')
    && workflow.includes('public-projection-privacy')
    && workflow.includes('artifacts/runtime/public-projection-privacy-*.json')
    && workflow.indexOf('Upload reference privacy evidence') > workflow.indexOf('Scan built Pages privacy')
    && workflow.indexOf('Upload public projection privacy evidence') > workflow.indexOf('Scan built Pages privacy'),
  'Pages workflow must scan built Pages privacy and upload reference plus public projection privacy evidence artifacts',
)
assert(
  workflow.includes('Check current run evidence artifacts')
    && workflow.includes('CHECK_GITHUB_ACTIONS_ARTIFACTS_REQUIRED: true')
    && workflow.includes('CHECK_CURRENT_GITHUB_RUN_ARTIFACTS: true')
    && workflow.includes('npm run check:github-actions-artifacts')
    && workflow.indexOf('Check current run evidence artifacts') > workflow.indexOf('Upload artifact'),
  'Pages workflow must verify the current run evidence artifacts after all required artifacts are uploaded',
)
assert(
  workflow.includes('VITE_ALLOW_LOCAL_CREATOR_FALLBACK: false'),
  'Pages workflow must always disable local creator fallback for public builds',
)
assert(
  workflow.indexOf('Gate public runtime release mode') < workflow.indexOf('Build Creator Studio'),
  'Runtime release gate must run before the Creator Studio build step',
)
assert(
  packageJson.scripts['check:pages-live-release-gate'] === 'node scripts/check-pages-live-release-gate.mjs',
  'package.json must expose check:pages-live-release-gate',
)
assert(
  packageJson.scripts['check:github-actions-artifacts'] === 'node scripts/check-github-actions-artifacts.mjs',
  'package.json must expose check:github-actions-artifacts',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:pages-live-release-gate'),
  'npm run test must include check:pages-live-release-gate',
)
assert(
  p16Doc.includes('VITE_PUBLIC_RUNTIME_MODE=live')
    && p16Doc.includes('qa:live-runtime-browser')
    && p16Doc.includes('qa:live-runtime-local')
    && p16Doc.includes('check:live-cutover-attestation')
    && p16Doc.includes('check:live-rollback-rehearsal')
    && p16Doc.includes('check:remote-runtime-activation-control')
    && p16Doc.includes('remote-assignment-handoff')
    && p16Doc.includes('remote-runtime-blockers')
    && p16Doc.includes('GitHub repository variables'),
  'P16 doc must describe the live release gate, cutover attestation, rollback rehearsal, activation control, and required GitHub vars',
)
assert(
  p43Doc.includes('runtime-readiness-ledger')
    && p43Doc.includes('live-cutover-attestation')
    && p43Doc.includes('live-rollback-rehearsal')
    && p43Doc.includes('remote-runtime-activation-control')
    && p43Doc.includes('remote-assignment-handoff')
    && p43Doc.includes('remote-assignment-execution-pack')
    && p43Doc.includes('remote-assignment-fixture-gate')
    && p43Doc.includes('remote-runtime-blockers')
    && p43Doc.includes('reference-privacy')
    && p43Doc.includes('public-projection-privacy')
    && p43Doc.includes('local-live-runtime-visual-qa')
    && p43Doc.includes('github-pages')
    && p43Doc.includes('check:github-actions-artifacts'),
  'P43 doc must describe the required GitHub Actions artifact evidence gate, including assignment and privacy evidence',
)
assert(
  p15Doc.includes('P15 proves those deployed units actually satisfy the Creator Studio product flow.'),
  'P15 doc must remain the browser-level proof consumed by the P16 release gate',
)

console.log(JSON.stringify({
  status: 'passed',
  checked: [
    '.github/workflows/pages.yml',
    'docs/backend/P16_PAGES_LIVE_RELEASE_GATE.md',
    'package.json',
  ],
  defaultMode: 'disabled',
  readinessLedger: 'audit:live-runtime-readiness',
  ledgerArtifact: 'runtime-readiness-ledger',
  cutoverAttestation: 'check:live-cutover-attestation',
  rollbackRehearsal: 'check:live-rollback-rehearsal',
  activationControl: 'check:remote-runtime-activation-control',
  assignmentHandoff: 'remote-assignment-handoff',
  assignmentExecutionPack: 'remote-assignment-execution-pack',
  assignmentFixtureGate: 'remote-assignment-fixture-gate',
  remoteRuntimeBlockers: 'remote-runtime-blockers',
  referencePrivacy: 'reference-privacy',
  publicProjectionPrivacy: 'public-projection-privacy',
  liveModeGate: 'qa:live-runtime-browser',
  actionsRuntime: 'node24',
}, null, 2))
