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
const p107Doc = read('docs/backend/P107_CI_ARTIFACT_CONTENT_COVERAGE_MATRIX.md')
const p108Doc = read('docs/backend/P108_REMOTE_ASSIGNMENT_LOCAL_BOUNDARY_GUARD.md')
const p109Doc = read('docs/backend/P109_GITHUB_RUNTIME_VARIABLE_BOUNDARY_GUARD.md')
const p110Doc = read('docs/backend/P110_RUNTIME_PLACEHOLDER_SENTINEL_GUARD.md')
const p99Doc = read('docs/backend/P99_RELEASE_WORKFLOW_ORDERING_GATE.md')
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
  workflow.includes('workflow_run:')
    && workflow.includes('- Publish Runtime Images')
    && workflow.includes('- completed')
    && workflow.includes('workflow_dispatch:')
    && !/^  push:/m.test(workflow)
    && workflow.includes("if: ${{ github.event_name != 'workflow_run' || github.event.workflow_run.conclusion == 'success' }}")
    && workflow.includes('ref: ${{ github.event.workflow_run.head_sha || github.sha }}'),
  'Pages workflow must deploy after successful Publish Runtime Images workflow_run, not directly from push',
)
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
  workflow.includes('Upload remote assignment schema gate')
    && workflow.includes('remote-assignment-schema')
    && workflow.includes('artifacts/runtime/remote-assignment-schema-*.json')
    && workflow.indexOf('Upload remote assignment schema gate') > workflow.indexOf('Run runtime checks'),
  'Pages workflow must upload the remote assignment schema artifact after root runtime checks',
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
  workflow.includes('Upload remote assignment fill plan')
    && workflow.includes('remote-assignment-fill-plan')
    && workflow.includes('artifacts/runtime/remote-assignment-fill-plan-*.json')
    && workflow.includes('artifacts/runtime/remote-assignment-fill-plan-*.md')
    && workflow.indexOf('Upload remote assignment fill plan') > workflow.indexOf('Run runtime checks'),
  'Pages workflow must upload the remote assignment fill plan artifact after root runtime checks',
)
assert(
  workflow.includes('Upload remote assignment strict-run package')
    && workflow.includes('remote-assignment-strict-run-package')
    && workflow.includes('artifacts/runtime/remote-assignment-strict-run-package-*.json')
    && workflow.includes('artifacts/runtime/remote-assignment-strict-run-package-*.md')
    && workflow.indexOf('Upload remote assignment strict-run package') > workflow.indexOf('Run runtime checks'),
  'Pages workflow must upload the remote assignment strict-run package artifact after root runtime checks',
)
assert(
  workflow.includes('Upload remote operator readiness packet')
    && workflow.includes('remote-operator-readiness-packet')
    && workflow.includes('artifacts/runtime/remote-operator-readiness-packet-*.json')
    && workflow.includes('artifacts/runtime/remote-operator-readiness-packet-*.md')
    && workflow.indexOf('Upload remote operator readiness packet') > workflow.indexOf('Run runtime checks'),
  'Pages workflow must upload the remote operator readiness packet artifact after root runtime checks',
)
assert(
  workflow.includes('Upload remote operator return intake')
    && workflow.includes('remote-operator-return-intake')
    && workflow.includes('artifacts/runtime/remote-operator-return-intake-*.json')
    && workflow.includes('artifacts/runtime/remote-operator-return-intake-*.md')
    && workflow.indexOf('Upload remote operator return intake') > workflow.indexOf('Run runtime checks'),
  'Pages workflow must upload the remote operator return intake artifact after root runtime checks',
)
assert(
  workflow.includes('Upload runtime image local smoke')
    && workflow.includes('runtime-image-local-smoke')
    && workflow.includes('artifacts/runtime/runtime-image-local-smoke-*.json')
    && workflow.indexOf('Upload runtime image local smoke') > workflow.indexOf('Run runtime checks'),
  'Pages workflow must upload the runtime image local smoke artifact after root runtime checks',
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
  workflow.includes('Check public privacy artifact content')
    && workflow.includes('CHECK_PUBLIC_PRIVACY_ARTIFACTS_REQUIRED: true')
    && workflow.includes('CHECK_CURRENT_GITHUB_RUN_ARTIFACTS: true')
    && workflow.includes('npm run check:public-privacy-artifacts')
    && workflow.indexOf('Check public privacy artifact content') > workflow.indexOf('Check current run evidence artifacts'),
  'Pages workflow must verify public privacy artifact contents after the current-run artifact metadata gate',
)
assert(
  workflow.includes('Check remote assignment artifact content')
    && workflow.includes('CHECK_REMOTE_ASSIGNMENT_ARTIFACTS_REQUIRED: true')
    && workflow.includes('CHECK_CURRENT_GITHUB_RUN_ARTIFACTS: true')
    && workflow.includes('npm run check:remote-assignment-artifacts')
    && workflow.indexOf('Check remote assignment artifact content') > workflow.indexOf('Check public privacy artifact content'),
  'Pages workflow must verify remote assignment schema/execution/fixture artifact contents after the public privacy artifact content gate',
)
assert(
  workflow.includes('Check remote assignment handoff artifact content')
    && workflow.includes('CHECK_REMOTE_ASSIGNMENT_HANDOFF_ARTIFACT_REQUIRED: true')
    && workflow.includes('CHECK_CURRENT_GITHUB_RUN_ARTIFACTS: true')
    && workflow.includes('npm run check:remote-assignment-handoff-artifact')
    && workflow.indexOf('Check remote assignment handoff artifact content') > workflow.indexOf('Check remote assignment artifact content'),
  'Pages workflow must verify remote assignment handoff artifact content after the remote assignment artifact content gate',
)
assert(
  workflow.includes('Check remote runtime blocker artifact content')
    && workflow.includes('CHECK_REMOTE_RUNTIME_BLOCKERS_ARTIFACT_REQUIRED: true')
    && workflow.includes('CHECK_CURRENT_GITHUB_RUN_ARTIFACTS: true')
    && workflow.includes('npm run check:remote-runtime-blockers-artifact')
    && workflow.indexOf('Check remote runtime blocker artifact content') > workflow.indexOf('Check remote assignment handoff artifact content'),
  'Pages workflow must verify remote runtime blocker artifact content after the handoff artifact content gate',
)
assert(
  workflow.includes('Check remote assignment fill plan artifact content')
    && workflow.includes('CHECK_REMOTE_ASSIGNMENT_FILL_PLAN_ARTIFACT_REQUIRED: true')
    && workflow.includes('CHECK_CURRENT_GITHUB_RUN_ARTIFACTS: true')
    && workflow.includes('npm run check:remote-assignment-fill-plan-artifact')
    && workflow.indexOf('Check remote assignment fill plan artifact content') > workflow.indexOf('Check remote runtime blocker artifact content'),
  'Pages workflow must verify remote assignment fill plan artifact content after the blocker artifact content gate',
)
assert(
  workflow.includes('Check remote assignment strict-run package artifact content')
    && workflow.includes('CHECK_REMOTE_ASSIGNMENT_STRICT_RUN_PACKAGE_ARTIFACT_REQUIRED: true')
    && workflow.includes('CHECK_CURRENT_GITHUB_RUN_ARTIFACTS: true')
    && workflow.includes('npm run check:remote-assignment-strict-run-package-artifact')
    && workflow.indexOf('Check remote assignment strict-run package artifact content') > workflow.indexOf('Check remote assignment fill plan artifact content'),
  'Pages workflow must verify remote assignment strict-run package artifact content after the fill-plan artifact content gate',
)
assert(
  workflow.includes('Check remote operator readiness packet artifact content')
    && workflow.includes('CHECK_REMOTE_OPERATOR_READINESS_PACKET_ARTIFACT_REQUIRED: true')
    && workflow.includes('CHECK_CURRENT_GITHUB_RUN_ARTIFACTS: true')
    && workflow.includes('npm run check:remote-operator-readiness-packet-artifact')
    && workflow.indexOf('Check remote operator readiness packet artifact content') > workflow.indexOf('Check remote assignment strict-run package artifact content'),
  'Pages workflow must verify remote operator readiness packet artifact content after the strict-run package artifact content gate',
)
assert(
  workflow.includes('Check remote operator return intake artifact content')
    && workflow.includes('CHECK_REMOTE_OPERATOR_RETURN_INTAKE_ARTIFACT_REQUIRED: true')
    && workflow.includes('CHECK_CURRENT_GITHUB_RUN_ARTIFACTS: true')
    && workflow.includes('npm run check:remote-operator-return-intake-artifact')
    && workflow.indexOf('Check remote operator return intake artifact content') > workflow.indexOf('Check remote operator readiness packet artifact content'),
  'Pages workflow must verify remote operator return intake artifact content after the readiness packet artifact content gate',
)
assert(
  workflow.includes('Check runtime image local smoke artifact content')
    && workflow.includes('CHECK_RUNTIME_IMAGE_LOCAL_SMOKE_ARTIFACT_REQUIRED: true')
    && workflow.includes('CHECK_CURRENT_GITHUB_RUN_ARTIFACTS: true')
    && workflow.includes('npm run check:runtime-image-local-smoke-artifact')
    && workflow.indexOf('Check runtime image local smoke artifact content') > workflow.indexOf('Check remote operator return intake artifact content'),
  'Pages workflow must verify runtime image local smoke artifact content after the operator return intake artifact content gate',
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
  packageJson.scripts['check:release-workflow-ordering'] === 'node scripts/check-release-workflow-ordering.mjs',
  'package.json must expose check:release-workflow-ordering',
)
assert(
  packageJson.scripts['check:github-actions-artifacts'] === 'node scripts/check-github-actions-artifacts.mjs',
  'package.json must expose check:github-actions-artifacts',
)
assert(
  packageJson.scripts['check:remote-assignment-handoff-artifact'] === 'node scripts/check-remote-assignment-handoff-artifact.mjs',
  'package.json must expose check:remote-assignment-handoff-artifact',
)
assert(
  packageJson.scripts['check:remote-runtime-blockers-artifact'] === 'node scripts/check-remote-runtime-blockers-artifact.mjs',
  'package.json must expose check:remote-runtime-blockers-artifact',
)
assert(
  packageJson.scripts['check:remote-assignment-schema'] === 'node scripts/check-remote-assignment-schema.mjs',
  'package.json must expose check:remote-assignment-schema',
)
assert(
  packageJson.scripts['check:public-privacy-artifacts'] === 'node scripts/check-public-privacy-artifacts.mjs',
  'package.json must expose check:public-privacy-artifacts',
)
assert(
  packageJson.scripts['check:remote-assignment-artifacts'] === 'node scripts/check-remote-assignment-artifacts.mjs',
  'package.json must expose check:remote-assignment-artifacts',
)
assert(
  packageJson.scripts['check:remote-assignment-fill-plan'] === 'node scripts/check-remote-assignment-fill-plan.mjs',
  'package.json must expose check:remote-assignment-fill-plan',
)
assert(
  packageJson.scripts['check:remote-assignment-fill-plan-artifact'] === 'node scripts/check-remote-assignment-fill-plan-artifact.mjs',
  'package.json must expose check:remote-assignment-fill-plan-artifact',
)
assert(
  packageJson.scripts['check:remote-assignment-strict-run-package'] === 'node scripts/check-remote-assignment-strict-run-package.mjs',
  'package.json must expose check:remote-assignment-strict-run-package',
)
assert(
  packageJson.scripts['check:remote-assignment-strict-run-package-artifact'] === 'node scripts/check-remote-assignment-strict-run-package-artifact.mjs',
  'package.json must expose check:remote-assignment-strict-run-package-artifact',
)
assert(
  packageJson.scripts['check:remote-operator-readiness-packet'] === 'node scripts/check-remote-operator-readiness-packet.mjs',
  'package.json must expose check:remote-operator-readiness-packet',
)
assert(
  packageJson.scripts['check:remote-operator-readiness-packet-artifact'] === 'node scripts/check-remote-operator-readiness-packet-artifact.mjs',
  'package.json must expose check:remote-operator-readiness-packet-artifact',
)
assert(
  packageJson.scripts['check:remote-operator-return-intake'] === 'node scripts/check-remote-operator-return-intake.mjs',
  'package.json must expose check:remote-operator-return-intake',
)
assert(
  packageJson.scripts['check:remote-operator-return-intake-artifact'] === 'node scripts/check-remote-operator-return-intake-artifact.mjs',
  'package.json must expose check:remote-operator-return-intake-artifact',
)
assert(
  packageJson.scripts['check:runtime-image-local-smoke-artifact'] === 'node scripts/check-runtime-image-local-smoke-artifact.mjs',
  'package.json must expose check:runtime-image-local-smoke-artifact',
)
assert(
  packageJson.scripts['check:ci-artifact-content-coverage'] === 'node scripts/check-ci-artifact-content-coverage.mjs',
  'package.json must expose check:ci-artifact-content-coverage',
)
assert(
  packageJson.scripts['check:remote-assignment-local-boundary'] === 'node scripts/check-remote-assignment-local-boundary.mjs',
  'package.json must expose check:remote-assignment-local-boundary',
)
assert(
  packageJson.scripts['check:github-runtime-variable-boundary'] === 'node scripts/check-github-runtime-variable-boundary.mjs',
  'package.json must expose check:github-runtime-variable-boundary',
)
assert(
  packageJson.scripts['check:runtime-placeholder-sentinel'] === 'node scripts/check-runtime-placeholder-sentinel.mjs',
  'package.json must expose check:runtime-placeholder-sentinel',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:pages-live-release-gate'),
  'npm run test must include check:pages-live-release-gate',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:release-workflow-ordering'),
  'npm run test must include check:release-workflow-ordering',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-assignment-handoff-artifact'),
  'npm run test must include check:remote-assignment-handoff-artifact',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-runtime-blockers-artifact'),
  'npm run test must include check:remote-runtime-blockers-artifact',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-assignment-schema'),
  'npm run test must include check:remote-assignment-schema',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:public-privacy-artifacts'),
  'npm run test must include check:public-privacy-artifacts',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-assignment-artifacts'),
  'npm run test must include check:remote-assignment-artifacts',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-assignment-fill-plan'),
  'npm run test must include check:remote-assignment-fill-plan',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-assignment-fill-plan-artifact'),
  'npm run test must include check:remote-assignment-fill-plan-artifact',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-assignment-strict-run-package'),
  'npm run test must include check:remote-assignment-strict-run-package',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-assignment-strict-run-package-artifact'),
  'npm run test must include check:remote-assignment-strict-run-package-artifact',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-operator-readiness-packet'),
  'npm run test must include check:remote-operator-readiness-packet',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-operator-readiness-packet-artifact'),
  'npm run test must include check:remote-operator-readiness-packet-artifact',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-operator-return-intake'),
  'npm run test must include check:remote-operator-return-intake',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-operator-return-intake-artifact'),
  'npm run test must include check:remote-operator-return-intake-artifact',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:runtime-image-local-smoke-artifact'),
  'npm run test must include check:runtime-image-local-smoke-artifact',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:ci-artifact-content-coverage'),
  'npm run test must include check:ci-artifact-content-coverage',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-assignment-local-boundary'),
  'npm run test must include check:remote-assignment-local-boundary',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:github-runtime-variable-boundary'),
  'npm run test must include check:github-runtime-variable-boundary',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:runtime-placeholder-sentinel'),
  'npm run test must include check:runtime-placeholder-sentinel',
)
assert(
  p16Doc.includes('VITE_PUBLIC_RUNTIME_MODE=live')
    && p16Doc.includes('qa:live-runtime-browser')
    && p16Doc.includes('qa:live-runtime-local')
    && p16Doc.includes('check:live-cutover-attestation')
    && p16Doc.includes('check:live-rollback-rehearsal')
    && p16Doc.includes('check:remote-runtime-activation-control')
    && p16Doc.includes('remote-assignment-handoff')
    && p16Doc.includes('remote-assignment-schema')
    && p16Doc.includes('check:remote-assignment-handoff-artifact')
    && p16Doc.includes('check:remote-assignment-artifacts')
    && p16Doc.includes('remote-runtime-blockers')
    && p16Doc.includes('check:remote-runtime-blockers-artifact')
    && p16Doc.includes('remote-assignment-fill-plan')
    && p16Doc.includes('check:remote-assignment-fill-plan-artifact')
    && p16Doc.includes('remote-assignment-strict-run-package')
    && p16Doc.includes('check:remote-assignment-strict-run-package-artifact')
    && p16Doc.includes('remote-operator-readiness-packet')
    && p16Doc.includes('check:remote-operator-readiness-packet-artifact')
    && p16Doc.includes('remote-operator-return-intake')
    && p16Doc.includes('check:remote-operator-return-intake-artifact')
    && p16Doc.includes('runtime-image-local-smoke')
    && p16Doc.includes('check:runtime-image-local-smoke-artifact')
    && p16Doc.includes('check:ci-artifact-content-coverage')
    && p16Doc.includes('check:remote-assignment-local-boundary')
    && p16Doc.includes('check:github-runtime-variable-boundary')
    && p16Doc.includes('check:runtime-placeholder-sentinel')
    && p16Doc.includes('check:public-privacy-artifacts')
    && p16Doc.includes('GitHub repository variables'),
  'P16 doc must describe the live release gate, cutover attestation, rollback rehearsal, activation control, and required GitHub vars',
)
assert(
  p16Doc.includes('does not deploy directly from `push`')
    && p16Doc.includes('workflow_run')
    && p16Doc.includes('Publish Runtime Images')
    && p16Doc.includes('check:release-workflow-ordering')
    && p99Doc.includes('P99 Release Workflow Ordering Gate'),
  'P16/P99 docs must describe the ordered Runtime Images -> Pages release chain',
)
assert(
  p43Doc.includes('runtime-readiness-ledger')
    && p43Doc.includes('live-cutover-attestation')
    && p43Doc.includes('live-rollback-rehearsal')
    && p43Doc.includes('remote-runtime-activation-control')
    && p43Doc.includes('remote-assignment-handoff')
    && p43Doc.includes('remote-assignment-schema')
    && p43Doc.includes('check:remote-assignment-handoff-artifact')
    && p43Doc.includes('check:remote-assignment-artifacts')
    && p43Doc.includes('check:remote-runtime-blockers-artifact')
    && p43Doc.includes('check:remote-assignment-fill-plan-artifact')
    && p43Doc.includes('check:remote-assignment-strict-run-package-artifact')
    && p43Doc.includes('check:remote-operator-readiness-packet-artifact')
    && p43Doc.includes('check:remote-operator-return-intake-artifact')
    && p43Doc.includes('check:runtime-image-local-smoke-artifact')
    && p43Doc.includes('check:ci-artifact-content-coverage')
    && p43Doc.includes('check:public-privacy-artifacts')
    && p43Doc.includes('P92')
    && p43Doc.includes('P93')
    && p43Doc.includes('remote-assignment-execution-pack')
    && p43Doc.includes('remote-assignment-fixture-gate')
    && p43Doc.includes('remote-runtime-blockers')
    && p43Doc.includes('remote-assignment-fill-plan')
    && p43Doc.includes('remote-assignment-strict-run-package')
    && p43Doc.includes('remote-operator-readiness-packet')
    && p43Doc.includes('remote-operator-return-intake')
    && p43Doc.includes('runtime-image-local-smoke')
    && p43Doc.includes('reference-privacy')
    && p43Doc.includes('public-projection-privacy')
    && p43Doc.includes('local-live-runtime-visual-qa')
    && p43Doc.includes('github-pages')
    && p43Doc.includes('check:github-actions-artifacts'),
  'P43 doc must describe the required GitHub Actions artifact evidence gate, including assignment and privacy evidence',
)
assert(
  p107Doc.includes('P107 CI Artifact Content Coverage Matrix')
    && p107Doc.includes('runtime-readiness-ledger')
    && p107Doc.includes('remote-assignment-fill-plan')
    && p107Doc.includes('remote-assignment-strict-run-package')
    && p107Doc.includes('P118_REMOTE_ASSIGNMENT_STRICT_RUN_PACKAGE')
    && p107Doc.includes('remote-operator-readiness-packet')
    && p107Doc.includes('P119_REMOTE_OPERATOR_READINESS_PACKET')
    && p107Doc.includes('remote-operator-return-intake')
    && p107Doc.includes('P120_REMOTE_OPERATOR_RETURN_INTAKE')
    && p107Doc.includes('runtime-image-local-smoke')
    && p107Doc.includes('P115_RUNTIME_IMAGE_LOCAL_SMOKE_ARTIFACT_ATTESTATION')
    && p107Doc.includes('reference-privacy')
    && p107Doc.includes('public-projection-privacy')
    && p107Doc.includes('local-live-runtime-visual-qa')
    && p107Doc.includes('github-pages')
    && p107Doc.includes('download_content_gate')
    && p107Doc.includes('pre_upload_generator_gate')
    && p107Doc.includes('built_bundle_privacy_scan')
    && p107Doc.includes('visual_human_evidence'),
  'P107 doc must describe the CI artifact content coverage matrix and every coverage class',
)
assert(
  p108Doc.includes('P108 Remote Assignment Local Boundary Guard')
    && p108Doc.includes('check:remote-assignment-local-boundary')
    && p108Doc.includes('remote-assignment.local.json')
    && p108Doc.includes('remote-assignment.*.local.json')
    && p108Doc.includes('fixture cannot unblock production readiness'),
  'P108 doc must describe the ignored local assignment boundary and fixture readiness rule',
)
assert(
  p109Doc.includes('P109 GitHub Runtime Variable Boundary Guard')
    && p109Doc.includes('check:github-runtime-variable-boundary')
    && p109Doc.includes('Do not put database URLs, Tool Bridge token values, model keys, private keys or provider API tokens in repository variables.')
    && p109Doc.includes('github-runtime-variable-boundary'),
  'P109 doc must describe repository variable boundary and privacy-safe evidence',
)
assert(
  p110Doc.includes('P110 Runtime Placeholder Sentinel Guard')
    && p110Doc.includes('check:runtime-placeholder-sentinel')
    && p110Doc.includes('FILL_*')
    && p110Doc.includes('remote_assignment_incomplete')
    && p110Doc.includes('assignment_execution_incomplete'),
  'P110 doc must describe placeholder sentinel behavior',
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
  assignmentHandoffContent: 'check:remote-assignment-handoff-artifact',
  assignmentSchema: 'remote-assignment-schema',
  assignmentExecutionPack: 'remote-assignment-execution-pack',
  assignmentFixtureGate: 'remote-assignment-fixture-gate',
  remoteRuntimeBlockers: 'remote-runtime-blockers',
  remoteRuntimeBlockersContent: 'check:remote-runtime-blockers-artifact',
  remoteAssignmentFillPlan: 'remote-assignment-fill-plan',
  remoteAssignmentFillPlanContent: 'check:remote-assignment-fill-plan-artifact',
  remoteAssignmentStrictRunPackage: 'remote-assignment-strict-run-package',
  remoteAssignmentStrictRunPackageContent: 'check:remote-assignment-strict-run-package-artifact',
  remoteOperatorReadinessPacket: 'remote-operator-readiness-packet',
  remoteOperatorReadinessPacketContent: 'check:remote-operator-readiness-packet-artifact',
  remoteOperatorReturnIntake: 'remote-operator-return-intake',
  remoteOperatorReturnIntakeContent: 'check:remote-operator-return-intake-artifact',
  runtimeImageLocalSmoke: 'runtime-image-local-smoke',
  runtimeImageLocalSmokeContent: 'check:runtime-image-local-smoke-artifact',
  artifactContentCoverage: 'check:ci-artifact-content-coverage',
  githubRuntimeVariableBoundary: 'check:github-runtime-variable-boundary',
  runtimePlaceholderSentinel: 'check:runtime-placeholder-sentinel',
  referencePrivacy: 'reference-privacy',
  publicProjectionPrivacy: 'public-projection-privacy',
  publicPrivacyArtifactContent: 'check:public-privacy-artifacts',
  assignmentArtifactContent: 'check:remote-assignment-artifacts',
  liveModeGate: 'qa:live-runtime-browser',
  actionsRuntime: 'node24',
  releaseOrdering: 'runtime-images-before-pages',
}, null, 2))
