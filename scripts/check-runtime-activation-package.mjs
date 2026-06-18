#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const requiredFiles = [
  'docs/backend/P13_PUBLIC_RUNTIME_PREVIEW_CONTRACT.md',
  'docs/backend/P14_REMOTE_RUNTIME_DEPLOYMENT_PACKAGE.md',
  'docs/backend/P15_LIVE_RUNTIME_SMOKE_CONTRACT.md',
  'docs/backend/P16_PAGES_LIVE_RELEASE_GATE.md',
  'docs/backend/P19_PUBLIC_LIVE_RUNTIME_CONFIG_AUDIT.md',
  'docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md',
  'docs/backend/P23_LIVE_RUNTIME_READINESS_LEDGER.md',
  'docs/backend/P69_REMOTE_RUNTIME_HOST_TARGET_GATE.md',
  'docs/backend/P70_REMOTE_RUNTIME_DEPLOY_MANIFEST_GATE.md',
  'docs/backend/P71_RUNTIME_IMAGE_PUBLISH_GATE.md',
  'docs/backend/P72_RUNTIME_IMAGE_PUBLISH_EVIDENCE_GATE.md',
  'docs/backend/P73_REMOTE_RUNTIME_ORIGIN_EXECUTION_GATE.md',
  'docs/backend/P74_REMOTE_RUNTIME_OPERATOR_HANDOFF.md',
  'docs/backend/P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE.md',
  'docs/backend/P76_LIVE_CUTOVER_ATTESTATION_GATE.md',
  'docs/backend/P77_LIVE_ROLLBACK_REHEARSAL_GATE.md',
  'docs/backend/P78_REMOTE_RUNTIME_ACTIVATION_CONTROL.md',
  'docs/backend/P79_REMOTE_ASSIGNMENT_EXECUTION_PACK.md',
  'deploy/runtime-production/host-profiles.json',
  'deploy/runtime-production/service-manifest.json',
  'deploy/runtime-production/origin-execution-plan.json',
  'deploy/runtime-production/remote-assignment.example.json',
  'deploy/runtime-preview/docker-compose.yml',
  '.github/workflows/runtime-images.yml',
  'packages/agent-runtime/src/server.ts',
  'packages/agent-runtime/src/toolBridge.ts',
  'packages/agent-runtime/src/workflows.ts',
  'backend/src/narrativeos/api/app_factory.py',
  'backend/src/narrativeos/api/tool_bridge.py',
  '.github/workflows/pages.yml',
  'scripts/audit-live-runtime-readiness.mjs',
  'scripts/check-runtime-readiness-ledger.mjs',
  'scripts/check-remote-origin-execution.mjs',
  'scripts/check-remote-origin-operator-pack.mjs',
  'scripts/check-remote-runtime-assignment-intake.mjs',
  'scripts/check-live-cutover-attestation.mjs',
  'scripts/check-live-rollback-rehearsal.mjs',
  'scripts/check-remote-runtime-activation-control.mjs',
  'scripts/check-remote-assignment-execution-pack.mjs',
]

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `missing activation artifact: ${file}`)
}

const packageJson = JSON.parse(read('package.json'))
const p14 = read('docs/backend/P14_REMOTE_RUNTIME_DEPLOYMENT_PACKAGE.md')
const p20 = read('docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md')
const p23 = read('docs/backend/P23_LIVE_RUNTIME_READINESS_LEDGER.md')
const p69 = read('docs/backend/P69_REMOTE_RUNTIME_HOST_TARGET_GATE.md')
const p70 = read('docs/backend/P70_REMOTE_RUNTIME_DEPLOY_MANIFEST_GATE.md')
const p71 = read('docs/backend/P71_RUNTIME_IMAGE_PUBLISH_GATE.md')
const p72 = read('docs/backend/P72_RUNTIME_IMAGE_PUBLISH_EVIDENCE_GATE.md')
const p73 = read('docs/backend/P73_REMOTE_RUNTIME_ORIGIN_EXECUTION_GATE.md')
const p74 = read('docs/backend/P74_REMOTE_RUNTIME_OPERATOR_HANDOFF.md')
const p75 = read('docs/backend/P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE.md')
const p76 = read('docs/backend/P76_LIVE_CUTOVER_ATTESTATION_GATE.md')
const p77 = read('docs/backend/P77_LIVE_ROLLBACK_REHEARSAL_GATE.md')
const p78 = read('docs/backend/P78_REMOTE_RUNTIME_ACTIVATION_CONTROL.md')
const p79 = read('docs/backend/P79_REMOTE_ASSIGNMENT_EXECUTION_PACK.md')
const hostProfiles = read('deploy/runtime-production/host-profiles.json')
const serviceManifest = read('deploy/runtime-production/service-manifest.json')
const originExecutionPlan = read('deploy/runtime-production/origin-execution-plan.json')
const remoteAssignmentExample = read('deploy/runtime-production/remote-assignment.example.json')
const runtimeImagesWorkflow = read('.github/workflows/runtime-images.yml')
const compose = read('deploy/runtime-preview/docker-compose.yml')
const agentServer = read('packages/agent-runtime/src/server.ts')
const toolBridge = read('packages/agent-runtime/src/toolBridge.ts')
const agentWorkflows = read('packages/agent-runtime/src/workflows.ts')
const apiFactory = read('backend/src/narrativeos/api/app_factory.py')
const apiToolBridge = read('backend/src/narrativeos/api/tool_bridge.py')
const workflow = read('.github/workflows/pages.yml')
const liveQa = read('scripts/browser-live-runtime-e2e.mjs')

assert(
  packageJson.scripts['check:runtime-activation-package'] === 'node scripts/check-runtime-activation-package.mjs',
  'package.json must expose check:runtime-activation-package',
)
assert(
  packageJson.scripts['check:remote-host-target'] === 'node scripts/check-remote-host-target.mjs',
  'package.json must expose check:remote-host-target',
)
assert(
  packageJson.scripts['check:remote-deploy-manifest'] === 'node scripts/check-remote-deploy-manifest.mjs',
  'package.json must expose check:remote-deploy-manifest',
)
assert(
  packageJson.scripts['check:runtime-image-workflow'] === 'node scripts/check-runtime-image-workflow.mjs',
  'package.json must expose check:runtime-image-workflow',
)
assert(
  packageJson.scripts['check:runtime-image-publish-evidence'] === 'node scripts/check-runtime-image-publish-evidence.mjs',
  'package.json must expose check:runtime-image-publish-evidence',
)
assert(
  packageJson.scripts['check:remote-origin-execution'] === 'node scripts/check-remote-origin-execution.mjs',
  'package.json must expose check:remote-origin-execution',
)
assert(
  packageJson.scripts['check:remote-origin-operator-pack'] === 'node scripts/check-remote-origin-operator-pack.mjs',
  'package.json must expose check:remote-origin-operator-pack',
)
assert(
  packageJson.scripts['check:remote-runtime-assignment-intake'] === 'node scripts/check-remote-runtime-assignment-intake.mjs',
  'package.json must expose check:remote-runtime-assignment-intake',
)
assert(
  packageJson.scripts['check:live-cutover-attestation'] === 'node scripts/check-live-cutover-attestation.mjs',
  'package.json must expose check:live-cutover-attestation',
)
assert(
  packageJson.scripts['check:live-rollback-rehearsal'] === 'node scripts/check-live-rollback-rehearsal.mjs',
  'package.json must expose check:live-rollback-rehearsal',
)
assert(
  packageJson.scripts['check:remote-runtime-activation-control'] === 'node scripts/check-remote-runtime-activation-control.mjs',
  'package.json must expose check:remote-runtime-activation-control',
)
assert(
  packageJson.scripts['check:remote-assignment-execution-pack'] === 'node scripts/check-remote-assignment-execution-pack.mjs',
  'package.json must expose check:remote-assignment-execution-pack',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:runtime-activation-package'),
  'npm run test must include check:runtime-activation-package',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-host-target'),
  'npm run test must include check:remote-host-target',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-deploy-manifest'),
  'npm run test must include check:remote-deploy-manifest',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:runtime-image-workflow'),
  'npm run test must include check:runtime-image-workflow',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:runtime-image-publish-evidence'),
  'npm run test must include check:runtime-image-publish-evidence',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-origin-execution'),
  'npm run test must include check:remote-origin-execution',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-origin-operator-pack'),
  'npm run test must include check:remote-origin-operator-pack',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-runtime-assignment-intake'),
  'npm run test must include check:remote-runtime-assignment-intake',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:live-cutover-attestation'),
  'npm run test must include check:live-cutover-attestation',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:live-rollback-rehearsal'),
  'npm run test must include check:live-rollback-rehearsal',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-runtime-activation-control'),
  'npm run test must include check:remote-runtime-activation-control',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-assignment-execution-pack'),
  'npm run test must include check:remote-assignment-execution-pack',
)
assert(
  packageJson.scripts['audit:live-runtime-readiness'] === 'node scripts/audit-live-runtime-readiness.mjs',
  'package.json must expose audit:live-runtime-readiness',
)
assert(
  packageJson.scripts['check:runtime-readiness-ledger'] === 'node scripts/check-runtime-readiness-ledger.mjs',
  'package.json must expose check:runtime-readiness-ledger',
)
assert(
  String(packageJson.scripts.test).includes('npm run audit:live-runtime-readiness && npm run check:runtime-readiness-ledger'),
  'npm run test must generate and validate the readiness ledger before continuing',
)
assert(
  String(packageJson.scripts.test).includes('npm run smoke:creator-chain'),
  'npm run test must include smoke:creator-chain so API + Agent + Tool Bridge are exercised in one gate',
)
assert(
  compose.includes('MASTRA_TOOL_BRIDGE_BASE_URL: http://api:8787')
    && compose.includes('NARRATIVEOS_DEPLOY_ENV: local')
    && compose.includes('NARRATIVEOS_TOOL_BRIDGE_TOKEN: dev-local-token')
    && compose.includes('MASTRA_TOOL_BRIDGE_TOKEN: dev-local-token')
    && !compose.includes('FASTAPI_TOOL_BRIDGE_BASE_URL: http://api:8787'),
  'runtime preview compose must use MASTRA_TOOL_BRIDGE_BASE_URL and matching Tool Bridge tokens, not the legacy FASTAPI_* name',
)
assert(
  compose.includes('MASTRA_ALLOWED_ORIGINS: http://127.0.0.1:5173,https://jzvcpe-goat.github.io'),
  'runtime preview compose must configure Agent Runtime CORS for local creator and GitHub Pages',
)
assert(
  toolBridge.includes('process.env.MASTRA_TOOL_BRIDGE_BASE_URL')
    && toolBridge.includes('process.env.FASTAPI_TOOL_BRIDGE_BASE_URL'),
  'Tool Bridge client must prefer MASTRA_TOOL_BRIDGE_BASE_URL while retaining legacy compatibility',
)
assert(
  toolBridge.includes('requiresToolBridgeFailClosed')
    && toolBridge.includes('MASTRA_REQUIRE_TOOL_BRIDGE')
    && agentWorkflows.includes('requiresToolBridgeFailClosed')
    && agentWorkflows.includes('throw error'),
  'Agent Runtime must fail closed on Tool Bridge errors in protected deploys',
)
assert(
  agentServer.includes('MASTRA_ALLOWED_ORIGINS')
    && agentServer.includes('Vary')
    && agentServer.includes('Idempotency-Key'),
  'Agent Runtime must expose configurable CORS and allow Idempotency-Key headers',
)
assert(
  apiFactory.includes('NARRATIVEOS_ALLOWED_ORIGINS')
    && apiFactory.includes('https://jzvcpe-goat.github.io')
    && apiFactory.includes('CORSMiddleware'),
  'FastAPI runtime must support GitHub Pages CORS via NARRATIVEOS_ALLOWED_ORIGINS',
)
assert(
  apiToolBridge.includes('NARRATIVEOS_TOOL_BRIDGE_TOKEN')
    && apiToolBridge.includes('MASTRA_TOOL_BRIDGE_TOKEN')
    && apiToolBridge.includes('NARRATIVEOS_DEPLOY_ENV')
    && apiToolBridge.includes('tool_bridge_secret_not_configured')
    && apiToolBridge.includes('_require_tool_bridge_auth')
    && apiToolBridge.includes('Authorization: Bearer <token>'),
  'FastAPI Tool Bridge must enforce service-token bearer auth before accepting runtime tool calls',
)
assert(
  p14.includes('MASTRA_TOOL_BRIDGE_BASE_URL=https://<api-host>')
    && p14.includes('NARRATIVEOS_DEPLOY_ENV=production')
    && p14.includes('MASTRA_TOOL_BRIDGE_TOKEN=<shared-tool-bridge-secret>')
    && p14.includes('NARRATIVEOS_TOOL_BRIDGE_TOKEN=<shared-tool-bridge-secret>')
    && p14.includes('MASTRA_ALLOWED_ORIGINS=https://jzvcpe-goat.github.io')
    && p14.includes('Authorization: Bearer <shared-tool-bridge-secret>')
    && p14.includes('fail closed when FastAPI Tool Bridge is unreachable'),
  'P14 deployment package must document Agent bridge, Tool Bridge token, and CORS env vars',
)
assert(
  p14.includes('P69 Remote Runtime Host Target Gate')
    && p14.includes('deploy/runtime-production/host-profiles.json')
    && p14.includes('check:remote-host-target'),
  'P14 deployment package must point operators to the P69 host target gate',
)
assert(
  p69.includes('docker-compatible-two-service-paas')
    && p69.includes('provider_secret_store_only')
    && p69.includes('P66 Remote Runtime Origin Provisioning Gate'),
  'P69 host target gate must define the preferred target, secret boundary, and P66 handoff',
)
assert(
  p70.includes('deploy/runtime-production/service-manifest.json')
    && p70.includes('provider_secret_store_only')
    && p70.includes('P66 Remote Runtime Origin Provisioning Gate'),
  'P70 deploy manifest gate must define the service manifest, secret boundary, and P66 handoff',
)
assert(
  p71.includes('ghcr.io/jzvcpe-goat/parallel-universe-novel-api')
    && p71.includes('ghcr.io/jzvcpe-goat/parallel-universe-novel-agent-runtime')
    && p71.includes('does not enable public live runtime'),
  'P71 image publish gate must define image refs and keep live runtime disabled',
)
assert(
  p72.includes('P72 Runtime Image Publish Evidence Gate')
    && p72.includes('read:packages')
    && p72.includes('REQUIRE_RUNTIME_IMAGE_PUBLISHED=true')
    && p72.includes('does not enable public live runtime'),
  'P72 image publish evidence gate must define strict evidence without requiring package API access',
)
assert(
  p73.includes('P73 Remote Runtime Origin Execution Gate')
    && p73.includes('deploy/runtime-production/origin-execution-plan.json')
    && p73.includes('P74 Remote Runtime Operator Handoff')
    && p73.includes('check:remote-origin-operator-pack')
    && p73.includes('check:remote-runtime-assignment-intake')
    && p73.includes('REQUIRE_REMOTE_ORIGIN_EXECUTED=true')
    && p73.includes('remote_origin_execution_unassigned')
    && p73.includes('remote_origin_execution_ready'),
  'P73 remote origin execution gate must define execution plan, strict mode and decisions',
)
assert(
  p74.includes('P74 Remote Runtime Operator Handoff')
    && p74.includes('check:remote-origin-operator-pack')
    && p74.includes('operator_pack_waiting_for_service_assignment')
    && p74.includes('operator_pack_ready_for_strict_origin_execution')
    && p74.includes('Provider secret names only')
    && p74.includes('P75 Remote Runtime Assignment Intake')
    && p74.includes('check:remote-runtime-assignment-intake')
    && p74.includes('REQUIRE_REMOTE_ORIGIN_EXECUTED=true'),
  'P74 operator handoff gate must define the no-secret operator pack, decisions and strict P73 handoff',
)
assert(
  p75.includes('P75 Remote Runtime Assignment Intake')
    && p75.includes('remote-assignment.example.json')
    && p75.includes('remote-assignment.local.json')
    && p75.includes('check:remote-runtime-assignment-intake')
    && p75.includes('check:live-cutover-attestation')
    && p75.includes('remote_assignment_missing')
    && p75.includes('remote_assignment_ready')
    && p75.includes('REQUIRE_REMOTE_ASSIGNMENT_READY=true'),
  'P75 assignment intake gate must define the ignored local assignment file, decisions and strict mode',
)
assert(
  p76.includes('P76 Live Cutover Attestation Gate')
    && p76.includes('check:live-cutover-attestation')
    && p76.includes('REMOTE_API_SERVICE_ID')
    && p76.includes('REMOTE_AGENT_SERVICE_ID')
    && p76.includes('REMOTE_API_SECRETS_CONFIGURED')
    && p76.includes('REMOTE_AGENT_SECRETS_CONFIGURED')
    && p76.includes('live_cutover_disabled')
    && p76.includes('live_cutover_attested')
    && p76.includes('REQUIRE_LIVE_CUTOVER_ATTESTED=true'),
  'P76 live cutover gate must define non-secret attestation variables, decisions and strict mode',
)
assert(
  p77.includes('P77 Live Rollback Rehearsal Gate')
    && p77.includes('check:live-rollback-rehearsal')
    && p77.includes('live_rollback_static_preview_verified')
    && p77.includes('live_rollback_execution_unconfirmed')
    && p77.includes('live_rollback_rehearsed')
    && p77.includes('REQUIRE_LIVE_ROLLBACK_REHEARSED=true'),
  'P77 live rollback gate must define commands, decisions and strict mode',
)
assert(
  p78.includes('P78 Remote Runtime Activation Control')
    && p78.includes('check:remote-runtime-activation-control')
    && p78.includes('remote_activation_waiting_for_assignment')
    && p78.includes('remote_activation_ready_for_cutover')
    && p78.includes('check:remote-assignment-execution-pack')
    && p78.includes('REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true'),
  'P78 remote activation control must define aggregate decisions and strict mode',
)
assert(
  p79.includes('P79 Remote Assignment Execution Pack')
    && p79.includes('check:remote-assignment-execution-pack')
    && p79.includes('assignment_execution_waiting_for_assignment')
    && p79.includes('assignment_execution_pack_ready')
    && p79.includes('REQUIRE_REMOTE_ASSIGNMENT_EXECUTION_READY=true')
    && p79.includes('GitHub Variable commands')
    && p79.includes('rollback commands'),
  'P79 remote assignment execution pack must define operator commands, decisions and strict mode',
)
assert(
  hostProfiles.includes('docker-compatible-two-service-paas')
    && hostProfiles.includes('fastapi_business_sovereign_agent_runtime_orchestrates')
    && hostProfiles.includes('provider_secret_store_only')
    && hostProfiles.includes('MASTRA_TOOL_BRIDGE_TOKEN')
    && hostProfiles.includes('NARRATIVEOS_TOOL_BRIDGE_TOKEN'),
  'host profiles must preserve runtime ownership and Tool Bridge secret boundaries',
)
assert(
  serviceManifest.includes('P70_REMOTE_RUNTIME_DEPLOY_MANIFEST_GATE')
    && serviceManifest.includes('deploy/api/Dockerfile')
    && serviceManifest.includes('deploy/agent-runtime/Dockerfile')
    && serviceManifest.includes('ghcr.io/jzvcpe-goat/parallel-universe-novel-api')
    && serviceManifest.includes('ghcr.io/jzvcpe-goat/parallel-universe-novel-agent-runtime')
    && serviceManifest.includes('VITE_API_ORIGIN')
    && serviceManifest.includes('VITE_AGENT_RUNTIME_BASE_URL')
    && serviceManifest.includes('provider_secret_store_only'),
  'service manifest must preserve deployable service boundaries and public runtime variables',
)
assert(
  originExecutionPlan.includes('P73_REMOTE_RUNTIME_ORIGIN_EXECUTION_GATE')
    && originExecutionPlan.includes('REQUIRE_RUNTIME_IMAGE_PUBLISHED=true npm run check:runtime-image-publish-evidence')
    && originExecutionPlan.includes('REMOTE_API_SERVICE_ID')
    && originExecutionPlan.includes('REMOTE_AGENT_SERVICE_ID')
    && originExecutionPlan.includes('REMOTE_API_SECRETS_CONFIGURED')
    && originExecutionPlan.includes('REMOTE_AGENT_SECRETS_CONFIGURED')
    && originExecutionPlan.includes('REQUIRE_REMOTE_ORIGIN_PROVISIONED=true npm run check:remote-origin-provisioning'),
  'origin execution plan must preserve P73 service assignment, strict image evidence and origin provisioning gates',
)
assert(
  remoteAssignmentExample.includes('P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE')
    && remoteAssignmentExample.includes('providerSecretsConfigured')
    && remoteAssignmentExample.includes('ghcr.io/jzvcpe-goat/parallel-universe-novel-api')
    && remoteAssignmentExample.includes('ghcr.io/jzvcpe-goat/parallel-universe-novel-agent-runtime')
    && remoteAssignmentExample.includes('Do not place DATABASE_URL'),
  'remote assignment example must preserve the no-secret P75 intake contract',
)
assert(
  runtimeImagesWorkflow.includes('packages: write')
    && runtimeImagesWorkflow.includes('parallel-universe-novel-api')
    && runtimeImagesWorkflow.includes('parallel-universe-novel-agent-runtime')
    && runtimeImagesWorkflow.includes('docker push')
    && runtimeImagesWorkflow.includes('push_with_retry'),
  'runtime image workflow must publish both runtime images to GHCR',
)
for (const required of [
  'Activation Sequence',
  'GitHub Repository Variables',
  'CORS Contract',
  'Health Contract',
  'Host Target Gate',
  'Operator Handoff',
  'Assignment Intake',
  'Live Cutover Attestation',
  'Live Rollback Rehearsal',
  'Remote Activation Control Board',
  'Live Smoke',
  'Rollback',
  'Acceptance Evidence',
]) {
  assert(p20.includes(required), `P20 runbook must include ${required}`)
}
for (const command of [
  'npm run check:public-live-config',
  'npm run check:public-runtime-preview',
  'npm run check:remote-origin-operator-pack',
  'npm run check:remote-runtime-assignment-intake',
  'npm run check:live-cutover-attestation',
  'npm run check:live-rollback-rehearsal',
  'npm run check:remote-runtime-activation-control',
  'npm run check:remote-assignment-execution-pack',
  'npm run qa:live-runtime-browser',
  'gh variable set VITE_PUBLIC_RUNTIME_MODE',
  'gh variable set VITE_API_ORIGIN',
  'gh variable set VITE_AGENT_RUNTIME_BASE_URL',
  'npm run audit:live-runtime-readiness',
]) {
  assert(p20.includes(command), `P20 runbook must include command: ${command}`)
}
for (const required of [
  'NARRATIVEOS_DEPLOY_ENV=production',
  'NARRATIVEOS_TOOL_BRIDGE_TOKEN=<shared-tool-bridge-secret>',
  'MASTRA_TOOL_BRIDGE_TOKEN=<shared-tool-bridge-secret>',
  'Authorization: Bearer <shared-tool-bridge-secret>',
  'both services reject the local `dev-local-token` default',
  'fail closed when FastAPI Tool Bridge is unreachable',
  'Do not expose this secret to the browser or GitHub Pages build variables.',
]) {
  assert(p20.includes(required), `P20 runbook must include Tool Bridge auth contract: ${required}`)
}
for (const required of [
  'REQUIRE_LIVE_RUNTIME_READY=true',
  'artifacts/runtime/live-runtime-readiness',
  'check:runtime-readiness-ledger',
  'repoVariables.source',
  'health.api',
  'health.agent',
  'workflow.socraticCreate',
  'creator-workflow-preflight',
  '/v1/workflows/socratic-create',
  'blockedChecks',
]) {
  assert(p23.includes(required), `P23 readiness ledger doc must include ${required}`)
}
assert(
  read('scripts/audit-live-runtime-readiness.mjs').includes('/v1/workflows/socratic-create')
    && read('scripts/audit-live-runtime-readiness.mjs').includes('creator-workflow-preflight')
    && read('scripts/audit-live-runtime-readiness.mjs').includes('workflowPreflight'),
  'readiness ledger audit must directly preflight the public Socratic workflow',
)
assert(
  read('scripts/check-runtime-readiness-ledger.mjs').includes('workflow.socraticCreate')
    && read('scripts/check-runtime-readiness-ledger.mjs').includes('creator-workflow-preflight'),
  'readiness ledger checker must require workflow.socraticCreate and creator-workflow-preflight',
)
assert(
  workflow.includes('REQUIRE_PUBLIC_RUNTIME=true npm run qa:live-runtime-browser')
    && workflow.includes('REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness')
    && workflow.includes('REQUIRE_LIVE_CUTOVER_ATTESTED=true npm run check:live-cutover-attestation')
    && workflow.includes('npm run check:live-rollback-rehearsal')
    && workflow.includes('REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true npm run check:remote-runtime-activation-control')
    && workflow.includes('REMOTE_API_SERVICE_ID: ${{ vars.REMOTE_API_SERVICE_ID }}')
    && workflow.includes('REMOTE_AGENT_SERVICE_ID: ${{ vars.REMOTE_AGENT_SERVICE_ID }}')
    && workflow.includes('Upload runtime readiness ledger')
    && workflow.includes('Upload live rollback rehearsal')
    && workflow.includes('Upload remote runtime activation control')
    && workflow.includes('artifacts/runtime/live-runtime-readiness-*.json')
    && workflow.includes('artifacts/runtime/live-rollback-rehearsal-*.json')
    && workflow.includes('artifacts/runtime/remote-activation-control-*.json')
    && workflow.includes('actions: read')
    && workflow.includes('GH_TOKEN: ${{ github.token }}')
    && workflow.includes('VITE_API_ORIGIN: ${{ vars.VITE_API_ORIGIN }}')
    && workflow.includes('VITE_AGENT_RUNTIME_BASE_URL: ${{ vars.VITE_AGENT_RUNTIME_BASE_URL }}')
    && workflow.includes("VITE_PUBLIC_RUNTIME_MODE: ${{ vars.VITE_PUBLIC_RUNTIME_MODE || 'disabled' }}"),
  'Pages workflow must gate live builds through readiness ledger, audit GitHub repo variables, upload the ledger artifact, and run live browser QA',
)
assert(
  workflow.includes('run: npm run test') && !workflow.includes('npm run smoke:creator-chain'),
  'Pages workflow must use root npm run test as the single runtime check entrypoint',
)
assert(
  liveQa.includes('创作服务可用')
    && liveQa.includes('VITE_ALLOW_LOCAL_CREATOR_FALLBACK')
    && liveQa.includes('draftLength >= 300'),
  'live browser QA must verify public service status, no local fallback, and candidate draft length',
)

console.log(JSON.stringify({
  status: 'passed',
  checked: requiredFiles,
  activationGate: 'remote runtime URLs + GitHub vars + live browser QA',
}, null, 2))
