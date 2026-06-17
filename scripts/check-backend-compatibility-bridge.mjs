#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const root = join(new URL('.', import.meta.url).pathname, '..')

function fail(message) {
  console.error(`[backend-compatibility-bridge] ${message}`)
  process.exitCode = 1
}

function assert(condition, message) {
  if (!condition) fail(message)
}

function readRequired(path, label = path) {
  assert(existsSync(path), `${label} is missing`)
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

const bridgePath = join(root, 'backend/src/narrativeos/services/backend_team_bridge.py')
const readerPath = join(root, 'backend/src/narrativeos/api/reader.py')
const runtimePath = join(root, 'backend/src/narrativeos/api/product_runtime.py')
const appFactoryPath = join(root, 'backend/src/narrativeos/api/app_factory.py')
const frontendWorldsPath = join(root, 'backend/src/narrativeos/services/frontend_worlds.py')
const planPath = join(root, 'BACKEND_COMPATIBILITY_BRIDGE_PLAN.md')
const auditPath = join(root, 'BACKEND_TEAM_PACKAGE_AUDIT_20260612.md')
const backendReviewPath = join(root, 'docs/backend/P12_BACKEND_TEAM_PACKAGE_REVIEW_20260612.md')
const p16MarketTrendPath = join(root, 'docs/backend/P16_MARKET_TREND_SCANNER_BACKEND_INTEGRATION_20260612.md')
const p17QualityGatePath = join(root, 'docs/backend/P17_FULL_NARRATIVE_QUALITY_GATE_COMPOSITION_20260613.md')
const p18PaymentSyncPath = join(root, 'docs/backend/P18_PAYMENT_COMPLETION_ACCOUNT_SYNC_20260613.md')
const p20AccountSnapshotPath = join(root, 'docs/backend/P20_PRODUCTION_AUTH_ACCOUNT_SNAPSHOT_20260613.md')
const p21PaymentHardeningPath = join(root, 'docs/backend/P21_PRODUCTION_PAYMENT_PROVIDER_HARDENING_20260613.md')
const p22AccountMergePath = join(root, 'docs/backend/P22_PRODUCTION_ACCOUNT_MERGE_PERSISTENCE_20260613.md')
const p23AccountDataPath = join(root, 'docs/backend/P23_ACCOUNT_DATA_GOVERNANCE_SECURITY_20260613.md')
const p24LaunchAcceptancePath = join(root, 'docs/product/P24_DEPLOYMENT_LAUNCH_ACCEPTANCE_20260613.md')
const p25DeploymentExecutionPath = join(root, 'docs/product/P25_DEPLOYMENT_EXECUTION_ROLLBACK_REHEARSAL_20260613.md')
const p26ProductionReleaseGatePath = join(root, 'docs/product/P26_PUBLIC_PRODUCTION_RELEASE_GATE_20260613.md')
const p27BlockedLaunchHandoffPath = join(root, 'docs/product/P27_BLOCKED_LAUNCH_HANDOFF_20260613.md')
const p28BlockedLaunchReviewPath = join(root, 'docs/product/P28_BLOCKED_LAUNCH_REVIEW_OWNER_BOARD_20260613.md')
const p29BlockedLaunchGovernancePath = join(root, 'docs/product/P29_BLOCKED_LAUNCH_GOVERNANCE_DASHBOARD_20260613.md')
const p30OwnerEscalationPath = join(root, 'docs/product/P30_OWNER_ESCALATION_GOVERNANCE_MAINTENANCE_20260613.md')
const p31AcceptanceTemplatesPath = join(root, 'docs/product/P31_ACCEPTANCE_ARTIFACT_TEMPLATE_PACK_20260613.md')
const p32AcceptanceIntakePath = join(root, 'docs/product/P32_ACCEPTANCE_ARTIFACT_INTAKE_VALIDATOR_20260613.md')
const p33OwnerFollowUpPath = join(root, 'docs/product/P33_EXTERNAL_OWNER_FOLLOW_UP_LOG_20260613.md')
const handoffPath = join(root, 'PARALLEL_UNIVERSE_PROTOTYPE_HANDOFF.md')
const apiSmokePath = join(root, 'scripts/smoke-deployed-api.sh')
const backendPackagePath = join(root, 'scripts/package-backend-api-deploy.sh')
const frontendPackagePath = join(root, 'scripts/package-vercel-preview.sh')
const launchReadinessPath = join(root, 'scripts/check-launch-readiness.sh')
const productionReleaseGatePath = join(root, 'scripts/check-production-release-gate.mjs')
const blockedLaunchHandoffPath = join(root, 'scripts/check-blocked-launch-handoff.mjs')
const launchReviewIntakePath = join(root, 'scripts/check-launch-review-intake.mjs')
const blockedLaunchGovernancePath = join(root, 'scripts/check-blocked-launch-governance.mjs')
const ownerEscalationPath = join(root, 'scripts/check-owner-escalation.mjs')
const acceptanceTemplatesPath = join(root, 'scripts/check-acceptance-templates.mjs')
const acceptanceIntakePath = join(root, 'scripts/check-acceptance-intake.mjs')
const ownerFollowUpPath = join(root, 'scripts/check-owner-follow-up.mjs')
const marketApiPath = join(root, 'backend/src/narrativeos/api/market.py')
const marketServicePath = join(root, 'backend/src/narrativeos/services/market_trends.py')
const qualityGatePath = join(root, 'backend/src/narrativeos/services/quality_gate.py')
const accountSnapshotPath = join(root, 'backend/src/narrativeos/services/account_snapshot.py')
const accountMergePath = join(root, 'backend/src/narrativeos/services/account_merge.py')
const accountDataPath = join(root, 'backend/src/narrativeos/services/account_data.py')
const accountApiPath = join(root, 'backend/src/narrativeos/api/account.py')
const productRuntimeServicePath = join(root, 'backend/src/narrativeos/services/product_runtime.py')
const marketFrontendApiPath = join(root, 'app/src/api/market.ts')
const marketFrontendDataPath = join(root, 'app/src/features/market/trends.ts')
const testsPath = join(root, 'backend/tests/test_backend_team_bridge.py')
const harnessTestsPath = join(root, 'backend/tests/test_harness_narrow_api.py')

const bridge = readRequired(bridgePath, 'BackendTeamBridge service')
for (const required of [
  'class BackendTeamBridge',
  'NARRATIVEOS_BACKEND_TEAM_API_BASE_URL',
  'reader_worlds',
  'reader_world_detail',
  'subscription_status',
  'checkout_start',
  'scene_advance',
  'worldline_events',
  'quality_evaluate',
  'canon_commit',
  'backend_team_bridge',
]) {
  assert(bridge.includes(required), `Bridge service is missing ${required}`)
}

const appFactory = readRequired(appFactoryPath, 'app factory')
assert(appFactory.includes('BackendTeamBridge.from_env()'), 'App factory must wire BackendTeamBridge.from_env() into app.state')
assert(appFactory.includes('ensure_frontend_reader_worlds'), 'App factory must register current frontend reader worlds')
assert(appFactory.includes('AccountSnapshotService'), 'App factory must wire AccountSnapshotService into app.state')

const frontendWorlds = readRequired(frontendWorldsPath, 'frontend reader world registry')
for (const required of ['FRONTEND_READER_WORLDS', 'beacon-beyond', 'rain-bridge', 'frontier-edict', 'ensure_frontend_reader_worlds']) {
  assert(frontendWorlds.includes(required), `Frontend reader world registry is missing ${required}`)
}

const marketApi = readRequired(marketApiPath, 'market trend API')
for (const required of ['/trends', '/trends/scan', '/trends/cron/weekly', '/trends/cron/monthly', 'scan_market_trends']) {
  assert(marketApi.includes(required), `Market trend API is missing ${required}`)
}

const marketService = readRequired(marketServicePath, 'market trend service')
for (const required of ['class MarketTrendService', 'MarketTrendSourceAdapter', 'MarketTrendScanContext', 'MarketTrendSourceResult', 'CuratedSeedTrendAdapter', 'ops', 'source_health', 'weight_changes', 'MARKET_TREND_SNAPSHOT', 'MARKET_TREND_FUNCTION_SCHEMA', 'MARKET_TREND_SCAN_SCHEDULE', 'scan_market_trends', 'weekly', 'monthly', 'algorithm-city']) {
  assert(marketService.includes(required), `Market trend service is missing ${required}`)
}

const marketFrontendApi = readRequired(marketFrontendApiPath, 'frontend market API client')
for (const required of ['/market/trends', '/market/trends/scan', 'getTrends', 'scanTrends']) {
  assert(marketFrontendApi.includes(required), `Frontend market API client is missing ${required}`)
}

const marketFrontendData = readRequired(marketFrontendDataPath, 'frontend market trend fallback')
for (const required of ['marketTrendFallback', 'trendForTemplate', 'orderTemplatesByMarketTrends', 'ops', 'source_health', 'weight_changes', 'algorithm-city']) {
  assert(marketFrontendData.includes(required), `Frontend market fallback is missing ${required}`)
}

const qualityGate = readRequired(qualityGatePath, 'P17 quality gate composer')
for (const required of ['compose_quality_gate_result', 'add_commit_confirmation_requirement', 'content_safety', 'language_naturalness', 'foreshadowing_continuity', 'timeline_consistency', 'canon_commit_readiness', 'learned_evaluator', 'learned_reranker', 'production_gate']) {
  assert(qualityGate.includes(required), `P17 quality gate composer is missing ${required}`)
}

const productRuntimeService = readRequired(productRuntimeServicePath, 'product runtime service')
for (const required of ['compose_quality_gate_result', 'add_commit_confirmation_requirement', 'source="local_evaluator"']) {
  assert(productRuntimeService.includes(required), `Product runtime service is missing P17 quality gate wiring: ${required}`)
}

const p16MarketTrendDoc = readRequired(p16MarketTrendPath, 'P16 market trend scanner integration doc')
for (const required of ['MarketTrendSourceAdapter', 'source_health', 'Scan audit', 'Public pages must not', 'P17 can start after P16']) {
  assert(p16MarketTrendDoc.includes(required), `P16 market trend doc is missing ${required}`)
}

const p17QualityGateDoc = readRequired(p17QualityGatePath, 'P17 full narrative quality gate doc')
for (const required of ['QualityGateResult', 'content safety', 'language naturalness', 'shadow_only', 'production_gate: false', 'Reader:', 'Creator:', 'Studio/Ops:', 'P18 can start after P17']) {
  assert(p17QualityGateDoc.includes(required), `P17 quality gate doc is missing ${required}`)
}

const p18PaymentSyncDoc = readRequired(p18PaymentSyncPath, 'P18 payment completion and account sync doc')
for (const required of ['Payment Completion and Account Sync', 'checkout_session_completed', 'Account Sync', 'Reader:', 'Creator:', 'Account:', 'Studio/Ops:', 'P19 can start after P18']) {
  assert(p18PaymentSyncDoc.includes(required), `P18 payment sync doc is missing ${required}`)
}

const p20AccountSnapshotDoc = readRequired(p20AccountSnapshotPath, 'P20 production auth account snapshot doc')
for (const required of ['Production Auth and Cross-device Account Snapshot', '/v1/account/snapshot', 'Reader:', 'Creator:', 'Account:', 'Studio/Ops:', 'P21 can start after P20']) {
  assert(p20AccountSnapshotDoc.includes(required), `P20 account snapshot doc is missing ${required}`)
}

const p21PaymentHardeningDoc = readRequired(p21PaymentHardeningPath, 'P21 production payment provider hardening doc')
for (const required of ['Production Payment Provider Hardening', '/v1/reader/checkout/{checkout_session_id}/status', '/v1/reader/checkout/return', '/v1/reader/checkout/provider-callback', 'HMAC', 'P22 can start']) {
  assert(p21PaymentHardeningDoc.includes(required), `P21 payment hardening doc is missing ${required}`)
}

const p22AccountMergeDoc = readRequired(p22AccountMergePath, 'P22 account merge and persistence doc')
for (const required of ['Production Account Merge and Persistence Hardening', '/v1/account/merge/preview', '/v1/account/merge/confirm', 'Reader:', 'Creator:', 'P23 should start only after P22 smoke and browser QA pass']) {
  assert(p22AccountMergeDoc.includes(required), `P22 account merge doc is missing ${required}`)
}

const p23AccountDataDoc = readRequired(p23AccountDataPath, 'P23 account data governance doc')
for (const required of ['Account Data Governance and Security Readiness', '/v1/account/data/export', '/v1/account/delete/preview', '/v1/account/delete/confirm', 'Reader / account page:', 'P24 should start only after P23 smoke and browser QA pass']) {
  assert(p23AccountDataDoc.includes(required), `P23 account data doc is missing ${required}`)
}

const p24LaunchAcceptanceDoc = readRequired(p24LaunchAcceptancePath, 'P24 launch acceptance doc')
for (const required of ['Deployment Launch Acceptance', 'scripts/check-launch-readiness.sh', '/settings', 'Production Blockers', 'release handoff ready, production launch not yet approved']) {
  assert(p24LaunchAcceptanceDoc.includes(required), `P24 launch acceptance doc is missing ${required}`)
}

const p25DeploymentExecutionDoc = readRequired(p25DeploymentExecutionPath, 'P25 deployment execution and rollback rehearsal doc')
for (const required of ['Deployment Execution and Rollback Rehearsal', 'https://app-638zzda7k-james-projects-97742675.vercel.app', 'https://pun-api-p25.vercel.app', 'artifacts/integration/p25-deployment-execution', 'restore_decision: ready_to_restore', 'Public Production Release Gate']) {
  assert(p25DeploymentExecutionDoc.includes(required), `P25 deployment execution doc is missing ${required}`)
}

const p26ProductionReleaseGateDoc = readRequired(p26ProductionReleaseGatePath, 'P26 public production release gate doc')
for (const required of ['Public Production Release Gate', 'P26 is blocked for public paid production launch', 'artifacts/integration/p26-production-resource-audit.json', 'Persistent Database', 'Domain and CORS', 'Payment Provider', 'Do not run these without product-owner approval']) {
  assert(p26ProductionReleaseGateDoc.includes(required), `P26 production release gate doc is missing ${required}`)
}

const p27BlockedLaunchHandoffDoc = readRequired(p27BlockedLaunchHandoffPath, 'P27 blocked launch handoff doc')
for (const required of ['Blocked Launch Handoff', 'not public-production-ready', 'scripts/check-blocked-launch-handoff.mjs', 'public_paid_production_launch: blocked', 'No external frontend should be merged']) {
  assert(p27BlockedLaunchHandoffDoc.includes(required), `P27 blocked launch handoff doc is missing ${required}`)
}

const p28BlockedLaunchReviewDoc = readRequired(p28BlockedLaunchReviewPath, 'P28 blocked launch review owner board')
for (const required of ['Blocked Launch Review Owner Board', 'Public paid production launch remains blocked', 'Product Owner: Production Alias Decision', 'Backend Team: Persistent Database, Migration and Recovery', 'artifacts/integration/p28-production-resource-intake.schema.json']) {
  assert(p28BlockedLaunchReviewDoc.includes(required), `P28 blocked launch review owner board is missing ${required}`)
}

const p29BlockedLaunchGovernanceDoc = readRequired(p29BlockedLaunchGovernancePath, 'P29 blocked launch governance dashboard')
for (const required of ['Blocked Launch Governance Dashboard', 'public paid production launch: blocked', 'Machine-readable ledger', 'Evidence Ledger Contract', 'artifacts/integration/p29-blocked-launch-evidence-ledger.json']) {
  assert(p29BlockedLaunchGovernanceDoc.includes(required), `P29 blocked launch governance dashboard is missing ${required}`)
}

const p30OwnerEscalationDoc = readRequired(p30OwnerEscalationPath, 'P30 owner escalation doc')
for (const required of ['Owner Escalation and Governance Maintenance', 'public paid production launch: blocked', 'Escalation Summary', 'Governance Maintenance Protocol', 'artifacts/integration/p30-owner-escalation-matrix.json']) {
  assert(p30OwnerEscalationDoc.includes(required), `P30 owner escalation doc is missing ${required}`)
}

const p31AcceptanceTemplatesDoc = readRequired(p31AcceptanceTemplatesPath, 'P31 acceptance artifact template pack')
for (const required of ['Acceptance Artifact Template Pack', 'public paid production launch: blocked', 'artifacts/integration/p31-acceptance-templates/', 'npm --prefix app run check:templates']) {
  assert(p31AcceptanceTemplatesDoc.includes(required), `P31 acceptance artifact template pack is missing ${required}`)
}

const p32AcceptanceIntakeDoc = readRequired(p32AcceptanceIntakePath, 'P32 acceptance artifact intake validator')
for (const required of ['Acceptance Artifact Intake Validator', 'public paid production launch: blocked', 'Missing artifacts are not a script failure', 'artifacts/integration/p32-acceptance-artifact-intake-status.json']) {
  assert(p32AcceptanceIntakeDoc.includes(required), `P32 acceptance artifact intake validator is missing ${required}`)
}

const p33OwnerFollowUpDoc = readRequired(p33OwnerFollowUpPath, 'P33 external owner follow-up log')
for (const required of ['External Owner Follow-Up Log', 'public paid production launch: blocked', 'waiting_on_owner', 'artifacts/integration/p33-external-owner-follow-up-ledger.json']) {
  assert(p33OwnerFollowUpDoc.includes(required), `P33 external owner follow-up log is missing ${required}`)
}

const launchReadiness = readRequired(launchReadinessPath, 'P24 launch-readiness script')
for (const required of ['check:alignment', 'test_account_data_api.py', 'smoke-deployed-api.sh', 'routes_required_for_browser_qa']) {
  assert(launchReadiness.includes(required), `P24 launch-readiness script is missing ${required}`)
}

const productionReleaseGate = readRequired(productionReleaseGatePath, 'P26 production release gate script')
for (const required of ['P26 resource audit', 'can_promote_public_paid_production', 'X-Content-Type-Options', 'production-release-gate']) {
  assert(productionReleaseGate.includes(required), `P26 production release gate script is missing ${required}`)
}

const blockedLaunchHandoff = readRequired(blockedLaunchHandoffPath, 'P27 blocked launch handoff script')
for (const required of ['p27-blocked-launch-package-manifest.json', 'public_paid_production_launch', 'blocked-launch-handoff', 'sha256', 'node_modules', 'apps/web']) {
  assert(blockedLaunchHandoff.includes(required), `P27 blocked launch handoff script is missing ${required}`)
}

const launchReviewIntake = readRequired(launchReviewIntakePath, 'P28 launch review intake script')
for (const required of ['p28-production-resource-intake.schema.json', 'P28 owner board', 'external_frontend_merge_approved', 'launch-review-intake']) {
  assert(launchReviewIntake.includes(required), `P28 launch review intake script is missing ${required}`)
}

const blockedLaunchGovernance = readRequired(blockedLaunchGovernancePath, 'P29 blocked launch governance script')
for (const required of ['p29-blocked-launch-evidence-ledger.json', 'external_frontend_merge_approved', 'blocked-launch-governance', 'source_artifacts']) {
  assert(blockedLaunchGovernance.includes(required), `P29 blocked launch governance script is missing ${required}`)
}

const ownerEscalation = readRequired(ownerEscalationPath, 'P30 owner escalation script')
for (const required of ['p30-owner-escalation-matrix.json', 'p29-blocked-launch-evidence-ledger.json', 'launch-blocking', 'owner-escalation']) {
  assert(ownerEscalation.includes(required), `P30 owner escalation script is missing ${required}`)
}

const acceptanceTemplates = readRequired(acceptanceTemplatesPath, 'P31 acceptance templates script')
for (const required of ['p31-acceptance-templates', "status === 'pending'", 'external_frontend_merge_approved', 'acceptance-templates']) {
  assert(acceptanceTemplates.includes(required), `P31 acceptance templates script is missing ${required}`)
}

const acceptanceIntake = readRequired(acceptanceIntakePath, 'P32 acceptance intake script')
for (const required of ['p32-acceptance-artifact-intake-status.json', 'not_submitted', 'ledger_impact', 'acceptance-intake']) {
  assert(acceptanceIntake.includes(required), `P32 acceptance intake script is missing ${required}`)
}

const ownerFollowUp = readRequired(ownerFollowUpPath, 'P33 owner follow-up script')
for (const required of ['p33-external-owner-follow-up-ledger.json', 'waiting_on_owner', 'owner-follow-up']) {
  assert(ownerFollowUp.includes(required), `P33 owner follow-up script is missing ${required}`)
}

const accountSnapshot = readRequired(accountSnapshotPath, 'P20 account snapshot service')
for (const required of ['class AccountSnapshotService', 'reader_progress', 'creator_drafts', 'local_fallback', 'resume_action']) {
  assert(accountSnapshot.includes(required), `P20 account snapshot service is missing ${required}`)
}

const accountMerge = readRequired(accountMergePath, 'P22 account merge service')
for (const required of ['class AccountMergeService', 'preview_merge', 'confirm_merge', 'reassign_reader_sessions', 'reassign_sessions']) {
  assert(accountMerge.includes(required), `P22 account merge service is missing ${required}`)
}

const accountData = readRequired(accountDataPath, 'P23 account data service')
for (const required of ['class AccountDataService', 'export_account_data', 'preview_account_deletion', 'confirm_account_deletion', 'revoke_auth_tokens', 'delete_reader_sessions', 'mark_account_subscriptions_for_closure']) {
  assert(accountData.includes(required), `P23 account data service is missing ${required}`)
}

const accountApi = readRequired(accountApiPath, 'P20 account API')
for (const required of ['router = APIRouter(prefix="/v1/account"', '@router.get("/snapshot")', 'include_diagnostics', 'account_snapshot_service', '@router.post("/merge/preview")', '@router.post("/merge/confirm")', '@router.get("/data/export")', '@router.post("/delete/preview")', '@router.post("/delete/confirm")']) {
  assert(accountApi.includes(required), `P20/P22 account API is missing ${required}`)
}

const reader = readRequired(readerPath, 'reader API')
for (const required of ['bridge.reader_worlds()', 'bridge.reader_world_detail(world_id)', 'bridge.subscription_status', 'bridge.checkout_start', 'reader_checkout_status', 'reader_checkout_return', 'reader_checkout_provider_callback', 'retry-payment', 'renew', 'cancel']) {
  assert(reader.includes(required), `Reader API is missing bridge call: ${required}`)
}

const runtime = readRequired(runtimePath, 'runtime API')
for (const required of ['bridge.scene_advance', 'bridge.worldline_events', 'bridge.quality_evaluate', 'bridge.canon_commit']) {
  assert(runtime.includes(required), `Runtime API is missing bridge call: ${required}`)
}

const tests = readRequired(testsPath, 'bridge tests')
for (const required of [
  'FakeBackendTeamBridge',
  '/v1/reader/library/worlds',
  '/v1/reader/checkout/start',
  '/v1/scene/advance',
  '/v1/quality/evaluate',
  '/v1/canon/commit',
]) {
  assert(tests.includes(required), `Bridge tests are missing ${required}`)
}

const harnessTests = readRequired(harnessTestsPath, 'harness narrow tests')
for (const required of ['beacon-beyond', 'rain-bridge', '/v1/reader/sessions', '/v1/reader/continue']) {
  assert(harnessTests.includes(required), `Harness narrow tests are missing ${required}`)
}

const apiSmoke = readRequired(apiSmokePath, 'deployed API smoke script')
for (const required of [
  '/reader/library/worlds',
  '/reader/sessions',
  '/reader/continue',
  '/scene/advance',
  '/creator/dialogue/sessions',
  '/market/trends',
  '/quality/evaluate',
  '/reader/subscription',
  '/account/snapshot',
  '/account/merge/preview',
  '/account/merge/confirm',
  '/account/data/export',
  '/account/delete/preview',
  '/account/delete/confirm',
  '/reader/checkout/{checkout_session_id}/status',
  '/reader/checkout/return',
  'beacon-beyond',
]) {
  assert(apiSmoke.includes(required), `Deployed API smoke script is missing ${required}`)
}

const backendPackage = readRequired(backendPackagePath, 'backend API deploy package script')
for (const required of ['tests/test_backend_team_bridge.py', 'NARRATIVEOS_ALLOWED_ORIGINS', 'post_deploy_smoke_command', 'apps/web remains reference-only']) {
  assert(backendPackage.includes(required), `Backend package script is missing ${required}`)
}

const frontendPackage = readRequired(frontendPackagePath, 'frontend preview package script')
for (const required of ['npm run check:backend-bridge', 'npm run check:copy-boundary', 'npm run check:design-system', 'preview_kind', 'real_api_smoke_command']) {
  assert(frontendPackage.includes(required), `Frontend preview package script is missing ${required}`)
}

const plan = readRequired(planPath, 'bridge plan')
for (const required of [
  'No second frontend is allowed',
  'Interface Mapping',
  'NARRATIVEOS_BACKEND_TEAM_API_BASE_URL',
  'GET /v1/reader/library/worlds',
  'POST /v1/scene/advance',
  'POST /v1/creator/dialogue/sessions',
  'GET /v1/market/trends',
  'scripts/smoke-deployed-api.sh',
  'scripts/package-backend-api-deploy.sh',
  'Remaining P0 Work',
]) {
  assert(plan.includes(required), `Bridge plan is missing ${required}`)
}

const audit = readRequired(auditPath, 'backend-team audit')
assert(audit.includes('Do not adopt the backend-team root `vercel.json`'), 'Backend-team audit must block deploying the reference Next frontend')
assert(audit.includes('P0 goal: Backend Compatibility Bridge'), 'Backend-team audit must name the P0 bridge goal')
assert(audit.includes('docs/backend/P12_BACKEND_TEAM_PACKAGE_REVIEW_20260612.md'), 'Backend-team audit must link the formal P12 backend review')

const backendReview = readRequired(backendReviewPath, 'formal P12 backend review')
for (const required of [
  'not approved for merge',
  'apps/web',
  'app/src/api/*',
  '/v1 product contract',
  'backend-team upstream',
  'Immediate Backend',
]) {
  assert(backendReview.includes(required), `Formal P12 backend review is missing ${required}`)
}

const handoff = readRequired(handoffPath, 'prototype handoff')
assert(handoff.includes('BACKEND_COMPATIBILITY_BRIDGE_PLAN.md'), 'Handoff must link the bridge plan')
assert(handoff.includes('P12 backend-team package review'), 'Handoff must include the P12 backend package review')
assert(handoff.includes('Do not duplicate'), 'Handoff must preserve the anti-duplicate-development rule')
assert(handoff.includes('scripts/smoke-deployed-api.sh'), 'Handoff must include deployed API smoke instructions')
assert(handoff.includes('scripts/package-backend-api-deploy.sh'), 'Handoff must include backend API package instructions')
assert(handoff.includes('P17 full narrative quality gate composition'), 'Handoff must include the P17 full quality gate composition section')
assert(handoff.includes('P18 payment completion and account sync'), 'Handoff must include the P18 payment completion and account sync section')
assert(handoff.includes('P20 production auth and cross-device account snapshot'), 'Handoff must include the P20 account snapshot section')
assert(handoff.includes('P22 production account merge and persistent account storage hardening'), 'Handoff must include the P22 account merge section')
assert(handoff.includes('P23 account data governance and security readiness'), 'Handoff must include the P23 account data governance section')
assert(handoff.includes('P25 production deployment execution and rollback rehearsal'), 'Handoff must include the P25 deployment execution section')
assert(handoff.includes('https://pun-api-p25.vercel.app'), 'Handoff must include the P25 API preview URL')
assert(handoff.includes('P27 blocked launch handoff'), 'Handoff must include the P27 blocked launch handoff section')
assert(handoff.includes('check-blocked-launch-handoff.mjs'), 'Handoff must include the P27 package gate script')
assert(handoff.includes('P28 blocked launch review owner board'), 'Handoff must include the P28 blocked launch review section')
assert(handoff.includes('check-launch-review-intake.mjs'), 'Handoff must include the P28 launch review gate script')
assert(handoff.includes('P29 blocked launch governance dashboard'), 'Handoff must include the P29 blocked launch governance section')
assert(handoff.includes('check-blocked-launch-governance.mjs'), 'Handoff must include the P29 governance gate script')
assert(handoff.includes('P30 owner escalation and governance maintenance'), 'Handoff must include the P30 owner escalation section')
assert(handoff.includes('check-owner-escalation.mjs'), 'Handoff must include the P30 escalation gate script')
assert(handoff.includes('P31 acceptance artifact template pack'), 'Handoff must include the P31 template pack section')
assert(handoff.includes('check-acceptance-templates.mjs'), 'Handoff must include the P31 templates gate script')
assert(handoff.includes('P32 acceptance artifact intake validator'), 'Handoff must include the P32 intake validator section')
assert(handoff.includes('check-acceptance-intake.mjs'), 'Handoff must include the P32 intake gate script')
assert(handoff.includes('P33 external owner follow-up log'), 'Handoff must include the P33 owner follow-up section')
assert(handoff.includes('check-owner-follow-up.mjs'), 'Handoff must include the P33 owner follow-up gate script')

if (!process.exitCode) {
  console.log('[backend-compatibility-bridge] PASS')
}
