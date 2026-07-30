#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function read(path) {
  return readFileSync(resolve(root, path), 'utf8')
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertIncludes(path, terms) {
  const body = read(path)
  for (const term of terms) {
    assert(body.includes(term), `${path} missing ${term}`)
  }
  return body
}

function assertOrder(body, terms, label) {
  let cursor = -1
  for (const term of terms) {
    const index = body.indexOf(term, cursor + 1)
    assert(index > cursor, `${label} order missing or out of order: ${term}`)
    cursor = index
  }
}

const adapterPath = 'app/src/lib/pmfSupabase.ts'
const readerAdapterPath = 'app/src/lib/pmfSupabaseReader.ts'
const localDraftRepositoryPath = 'app/src/local-db/creatorLocalDraftRepository.ts'
const localSettingAssetRepositoryPath = 'app/src/local-db/creatorLocalSettingAssetRepository.ts'
const localSettingsRepositoryPath = 'app/src/local-db/creatorLocalSettingsRepository.ts'
const legacyToolSettingsPath = 'app/src/local-db/legacyCreatorToolSettings.ts'
const localReaderSignalRepositoryPath = 'app/src/local-db/creatorLocalReaderSignalRepository.ts'
const localWritingRepositoryPath = 'app/src/local-db/creatorLocalWritingRepository.ts'
const localPublishRepositoryPath = 'app/src/local-db/creatorLocalPublishRepository.ts'
const localAgentRepositoryPath = 'app/src/local-db/creatorLocalAgentRepository.ts'
const localMigrationPlanPath = 'app/src/local-db/creatorLocalMigrationPlan.ts'
const localMigrationRepositoryPath = 'app/src/local-db/creatorLocalMigrationRepository.ts'
const localWorkspaceRepositoryPath = 'app/src/local-db/creatorLocalWorkspaceRepository.ts'
const bundleAdapterPath = 'app/src/features/creator-pivot/publishBundleAdapter.ts'
const bundleLifecyclePath = 'app/src/features/creator-pivot/publishBundleLifecycle.ts'
const bundlePackagePath = 'app/src/features/creator-pivot/publishBundlePackage.ts'
const fixturePath = 'app/src/__fixtures__/pmfSupabase.creator-qa.ts'
const appPath = 'app/src/apps/creator/LocalCreatorApp.tsx'
const sessionServicePath = 'app/src/apps/creator/creatorSessionService.ts'
const dashboardRoutePath = 'app/src/apps/creator/routes/CreatorDashboardRoute.tsx'
const dashboardBrowserActionServicePath = 'app/src/apps/creator/routes/creatorDashboardBrowserActionService.ts'
const dashboardLoadServicePath = 'app/src/apps/creator/routes/creatorDashboardLoadService.ts'
const dashboardRouteEffectServicePath = 'app/src/apps/creator/routes/creatorDashboardRouteEffectService.ts'
const dashboardReactPatchApplierPath = 'app/src/apps/creator/routes/creatorDashboardReactPatchApplier.ts'
const dashboardRouteViewModelsPath = 'app/src/apps/creator/routes/creatorDashboardRouteViewModels.ts'
const echoRoutePath = 'app/src/apps/creator/routes/CreatorEchoRoute.tsx'
const echoActionServicePath = 'app/src/apps/creator/routes/creatorEchoActionService.ts'
const echoBrowserActionServicePath = 'app/src/apps/creator/routes/creatorEchoBrowserActionService.ts'
const echoLoadServicePath = 'app/src/apps/creator/routes/creatorEchoLoadService.ts'
const echoControllerPath = 'app/src/apps/creator/routes/creatorEchoRouteController.ts'
const echoSignalViewModelsPath = 'app/src/apps/creator/routes/creatorEchoSignalViewModels.ts'
const echoRouteViewModelsPath = 'app/src/apps/creator/routes/creatorEchoRouteViewModels.ts'
const editorRoutePath = 'app/src/apps/creator/routes/CreatorEditorRoute.tsx'
const editorRouteControllerPath = 'app/src/apps/creator/routes/creatorEditorRouteController.ts'
const editorDestinationControllerPath = 'app/src/apps/creator/routes/creatorEditorDestinationController.ts'
const editorWorkspaceViewModelControllerPath = 'app/src/apps/creator/routes/creatorEditorWorkspaceViewModelController.ts'
const editorViewModelsPath = 'app/src/apps/creator/routes/creatorEditorViewModels.ts'
const editorSocraticViewModelsPath = 'app/src/apps/creator/routes/creatorEditorSocraticViewModels.ts'
const editorAssistantViewModelsPath = 'app/src/apps/creator/routes/creatorEditorAssistantViewModels.ts'
const editorSessionViewModelsPath = 'app/src/apps/creator/routes/creatorEditorSessionViewModels.ts'
const editorQualityViewModelsPath = 'app/src/apps/creator/routes/creatorEditorQualityViewModels.ts'
const editorReviewImpactViewModelsPath = 'app/src/apps/creator/routes/creatorEditorReviewImpactViewModels.tsx'
const editorStoryMapViewModelsPath = 'app/src/apps/creator/routes/creatorEditorStoryMapViewModels.tsx'
const editorInlineReviewViewModelsPath = 'app/src/apps/creator/routes/creatorEditorInlineReviewViewModels.ts'
const editorManuscriptPath = 'app/src/apps/creator/routes/CreatorEditorManuscriptStage.tsx'
const editorActionInputControllerPath = 'app/src/apps/creator/routes/creatorEditorActionInputController.ts'
const editorCommandControllerPath = 'app/src/apps/creator/routes/creatorEditorCommandController.ts'
const editorAssistantControllerPath = 'app/src/apps/creator/routes/creatorEditorAssistantController.ts'
const editorSelectionControllerPath = 'app/src/apps/creator/routes/creatorEditorSelectionController.ts'
const editorCommandEventServicePath = 'app/src/apps/creator/routes/creatorEditorCommandEventService.ts'
const editorCommandPatchControllerPath = 'app/src/apps/creator/routes/creatorEditorCommandPatchController.ts'
const editorCommandFlowServicePath = 'app/src/apps/creator/routes/creatorEditorCommandFlowService.ts'
const editorCandidatePatchControllerPath = 'app/src/apps/creator/routes/creatorEditorCandidatePatchController.ts'
const editorStartupPatchControllerPath = 'app/src/apps/creator/routes/creatorEditorStartupPatchController.ts'
const editorStartupDataPatchControllerPath = 'app/src/apps/creator/routes/creatorEditorStartupDataPatchController.ts'
const editorReactPatchApplierPath = 'app/src/apps/creator/routes/creatorEditorReactPatchApplier.ts'
const editorUserActionControllerPath = 'app/src/apps/creator/routes/creatorEditorUserActionController.ts'
const editorStartupEffectServicePath = 'app/src/apps/creator/routes/creatorEditorStartupEffectService.ts'
const editorStartupLoadServicePath = 'app/src/apps/creator/routes/creatorEditorStartupLoadService.ts'
const editorDraftPersistencePath = 'app/src/apps/creator/routes/creatorEditorDraftPersistence.ts'
const editorDraftActionControllerPath = 'app/src/apps/creator/routes/creatorEditorDraftActionController.ts'
const editorDraftActionServicePath = 'app/src/apps/creator/routes/creatorEditorDraftActionService.ts'
const editorDraftActionFlowServicePath = 'app/src/apps/creator/routes/creatorEditorDraftActionFlowService.ts'
const editorDraftSubmitFlowServicePath = 'app/src/apps/creator/routes/creatorEditorDraftSubmitFlowService.ts'
const editorDraftActionResetServicePath = 'app/src/apps/creator/routes/creatorEditorDraftActionResetService.ts'
const editorDraftPatchControllerPath = 'app/src/apps/creator/routes/creatorEditorDraftPatchController.ts'
const editorDraftLoadServicePath = 'app/src/apps/creator/routes/creatorEditorDraftLoadService.ts'
const editorDraftSaveServicePath = 'app/src/apps/creator/routes/creatorEditorDraftSaveService.ts'
const editorPublishCheckServicePath = 'app/src/apps/creator/routes/creatorEditorPublishCheckService.ts'
const editorReminderServicePath = 'app/src/apps/creator/routes/creatorEditorReminderService.ts'
const editorRecallViewModelsPath = 'app/src/apps/creator/routes/creatorEditorRecallViewModels.ts'
const editorConversationSettingServicePath = 'app/src/apps/creator/routes/creatorEditorConversationSettingService.ts'
const editorDecisionContextAdapterPath = 'app/src/apps/creator/routes/creatorEditorDecisionContextAdapter.ts'
const editorDecisionWorkbenchHookPath = 'app/src/apps/creator/routes/useCreatorEditorDecisionWorkbench.ts'
const editorDecisionSessionHookPath = 'app/src/apps/creator/routes/useCreationDecisionSession.ts'
const creatorConversationWorkspacePath = 'app/src/components/creator/workspace/CreatorConversationWorkspace.tsx'
const creatorConversationTimelinePath = 'app/src/components/creator/workspace/CreatorConversationTimeline.tsx'
const creatorRecallRailPath = 'app/src/components/creator/workspace/CreatorRecallRail.tsx'
const editorSettingAssetServicePath = 'app/src/apps/creator/routes/creatorEditorSettingAssetService.ts'
const editorSettingAssetPatchControllerPath = 'app/src/apps/creator/routes/creatorEditorSettingAssetPatchController.ts'
const editorSettingAssetSubmitFlowServicePath = 'app/src/apps/creator/routes/creatorEditorSettingAssetSubmitFlowService.ts'
const publishRoutePath = 'app/src/apps/creator/routes/CreatorPublishBundleRoute.tsx'
const publishBundleActionServicePath = 'app/src/apps/creator/routes/creatorPublishBundleActionService.ts'
const publishBundleBrowserActionServicePath = 'app/src/apps/creator/routes/creatorPublishBundleBrowserActionService.ts'
const publishBundleRouteEffectServicePath = 'app/src/apps/creator/routes/creatorPublishBundleRouteEffectService.ts'
const publishBundleLoadServicePath = 'app/src/apps/creator/routes/creatorPublishBundleLoadService.ts'
const worksRoutePath = 'app/src/apps/creator/routes/CreatorWorksRoute.tsx'
const worksActionFlowServicePath = 'app/src/apps/creator/routes/creatorWorksActionFlowService.ts'
const worksActionServicePath = 'app/src/apps/creator/routes/creatorWorksActionService.ts'
const worksBrowserActionServicePath = 'app/src/apps/creator/routes/creatorWorksBrowserActionService.ts'
const worksLoadServicePath = 'app/src/apps/creator/routes/creatorWorksLoadService.ts'
const worksRouteViewModelsPath = 'app/src/apps/creator/routes/creatorWorksRouteViewModels.ts'
const settingsRoutePath = 'app/src/apps/creator/routes/CreatorSettingsRoute.tsx'
const settingsActionServicePath = 'app/src/apps/creator/routes/creatorSettingsActionService.ts'
const settingsBrowserActionServicePath = 'app/src/apps/creator/routes/creatorSettingsBrowserActionService.ts'
const settingsWorkspaceExportFlowServicePath = 'app/src/apps/creator/routes/creatorSettingsWorkspaceExportFlowService.ts'
const localWorkspacePackagePath = 'app/src/local-db/creatorLocalWorkspacePackage.ts'
const settingsLoadServicePath = 'app/src/apps/creator/routes/creatorSettingsLoadService.ts'
const settingsHydrationServicePath = 'app/src/apps/creator/routes/creatorSettingsHydrationService.ts'
const settingsRouteViewModelsPath = 'app/src/apps/creator/routes/creatorSettingsRouteViewModels.ts'
const frameBoundaryServicePath = 'app/src/components/creator/creatorFrameBoundaryService.ts'
const vitePath = 'app/vite.config.ts'
const packagePath = 'package.json'

const adapter = assertIncludes(adapterPath, [
  "from('profiles')",
  "from('creator_clients')",
  "from('creator_authorizations')",
  "from('reader_requests')",
  "from('works')",
  "from('branches')",
  "from('chapters')",
  "from('publish_events')",
  "from('feature_flags')",
  'listCreatorEchoSourceBatches',
  "from '@/local-db/creatorLocalSettingsRepository'",
  'getLocalSettingsCreatorClientId()',
  'publishBundleTransaction',
  'updateReaderRequestStatus',
])
assertIncludes(readerAdapterPath, [
  'signInAnonymously',
  "from('reader_requests')",
  "from('request_votes')",
  'export async function createReaderRequest',
  'export async function listPublicRequests',
  'export async function voteForRequest',
])

for (const forbiddenFacadeMarker of [
  "from '@/local-db/creatorLocalDraftRepository'",
  "from '@/local-db/creatorLocalWritingRepository'",
  "from '@/local-db/creatorLocalSettingAssetRepository'",
  "from '@/local-db/creatorLocalWorkspaceRepository'",
  'export function isLocalCreatorHost',
  'export function getLocalCreatorClientId',
  'export function createLocalDraftRef',
  'export function readLocalDrafts',
  'export function upsertLocalDraft',
  'export function createLocalSettingAssetRef',
  'export function readLocalSettingAssets',
  'export function upsertLocalSettingAsset',
  'export function readLocalCreativeReminders',
  'export function upsertLocalCreativeReminder',
  'export function readLocalWorkspaceSnapshot',
  'export function readCreatorDisplayPreferences',
  'export function writeCreatorDisplayPreferences',
]) {
  assert(!adapter.includes(forbiddenFacadeMarker), `${adapterPath} must not expose local repository compatibility ownership: ${forbiddenFacadeMarker}`)
}
const creatorApp = assertIncludes(appPath, [
  "from './creatorSessionService'",
  'readCreatorSession()',
  'scheduleCreatorSessionRefresh(refresh)',
  'sendCreatorLoginLink(email)',
])
for (const appBoundaryResidue of [
  "from '@/lib/pmfSupabase'",
  'window.setTimeout',
  'window.clearTimeout',
  'getPmfSession()',
  'sendCreatorMagicLink(',
  'upsertCreatorProfile(',
]) {
  assert(!creatorApp.includes(appBoundaryResidue), `${appPath} must not include ${appBoundaryResidue}`)
}
assertIncludes(sessionServicePath, [
  "from '@/lib/pmfSupabase'",
  'export interface CreatorSessionApiPort',
  'export async function readCreatorSession',
  'export function sendCreatorLoginLink',
  'export function scheduleCreatorSessionRefresh',
  'getSession: getPmfSession',
  'sendMagicLink: sendCreatorMagicLink',
  'upsertProfile: upsertCreatorProfile',
])
assertIncludes(frameBoundaryServicePath, [
  "from '@/lib/pmfSupabase'",
  "from '@/local-db/creatorLocalSettingsRepository'",
  'export function detectCreatorLocalSurface',
  'export function signOutCreatorSession',
  'export function bindCreatorFrameShortcuts',
  'export function dispatchCreatorCommandCandidateApply',
])
const localDraftRepository = assertIncludes(localDraftRepositoryPath, [
  "from './creatorLocalRepository'",
  'export function createLocalDraftRef',
  'export function readLocalDrafts',
  'export function upsertLocalDraft',
  'readLocalDraftRecords()',
  'upsertLocalDraftRecord(draft)',
])
assert(!localDraftRepository.includes("from '@/lib/pmfSupabase'"), `${localDraftRepositoryPath} must not import the Supabase facade`)
const localWritingRepository = assertIncludes(localWritingRepositoryPath, [
  "from './creatorLocalRepository'",
  'export function readLocalCreativeReminders',
  'export function upsertLocalCreativeReminder',
  'export function suggestLocalCreativeReminders',
  'export function updateLocalCreativeReminder',
  'readLocalCreativeReminderRecords(workId)',
  'upsertLocalCreativeReminderRecord(applyCreativeReminderAuthorUpdate(',
])
assert(!localWritingRepository.includes("from '@/lib/pmfSupabase'"), `${localWritingRepositoryPath} must not import the Supabase facade`)
const localSettingAssetRepository = assertIncludes(localSettingAssetRepositoryPath, [
  "from './creatorLocalRepository'",
  'export interface PmfLocalSettingAssetInput',
  'export function createLocalSettingAssetRef',
  'export function readLocalSettingAssets',
  'export function upsertLocalSettingAsset',
  'readLocalSettingAssetRecords(workId)',
  'upsertLocalSettingAssetRecord(next)',
  'normalizedTitle',
  'normalizedSummary',
])
assert(!localSettingAssetRepository.includes("from '@/lib/pmfSupabase'"), `${localSettingAssetRepositoryPath} must not import the Supabase facade`)
const localSettingsRepository = assertIncludes(localSettingsRepositoryPath, [
  "from './creatorLocalRepository'",
  'export interface CreatorDisplayPreferences',
  'export function isLocalCreatorHost',
  'export function getLocalCreatorClientId',
  'export function readCreatorDisplayPreferences',
  'export function writeCreatorDisplayPreferences',
  'creatorLocalMetaKeys.clientId',
  'creatorLocalMetaKeys.displayPreferences',
  'readLocalMetaValue',
  'upsertLocalMetaValue',
])
assert(!localSettingsRepository.includes("from '@/lib/pmfSupabase'"), `${localSettingsRepositoryPath} must not import the Supabase facade`)
assert(!localSettingsRepository.includes('readLocalAiSettings'), `${localSettingsRepositoryPath} must not expose retired local tool settings`)
assert(!localSettingsRepository.includes('writeLocalAiSettings'), `${localSettingsRepositoryPath} must not expose retired local tool setting writes`)
const legacyToolSettings = assertIncludes(legacyToolSettingsPath, [
  "from './creatorLocalRepository'",
  'export interface LegacyCreatorToolSettings',
  'export function readLegacyCreatorToolSettings',
  'creatorLocalMetaKeys.aiSettings',
])
assert(!legacyToolSettings.includes('upsertLocalMetaValue'), `${legacyToolSettingsPath} must remain read-only`)
const localReaderSignalRepository = assertIncludes(localReaderSignalRepositoryPath, [
  "from './creatorLocalRepository'",
  'export type PmfLocalReaderSignal',
  'export function readerSignalFromRequest',
  'export function readLocalReaderSignals',
  'export function readLocalReaderSignalSources',
  'export function upsertLocalReaderSignal',
  'export function cacheReaderSignalBatches',
  'export function cacheReaderRequestSignals',
  'readLocalReaderSignalRecords(workId)',
  'readLocalReaderSignalSourceRecords()',
  'upsertLocalReaderSignalRecord(signal)',
  'upsertLocalReaderSignalSourceRecord(state)',
  'reconcileCompleteSnapshots(existingSignals, normalized, batches)',
])
assert(!localReaderSignalRepository.includes("from '@/lib/pmfSupabase'"), `${localReaderSignalRepositoryPath} must not import the Supabase facade`)
const localPublishRepository = assertIncludes(localPublishRepositoryPath, [
  "from './creatorLocalRepository'",
  'export function readLocalPublishBundles',
  'export function upsertLocalPublishBundle',
  'export function readLocalPublishReceipts',
  'export function upsertLocalPublishReceipt',
  'readLocalPublishBundleRecords(workId)',
  'upsertLocalPublishBundleRecord(bundle)',
  'readLocalPublishReceiptRecords(bundleId)',
  'upsertLocalPublishReceiptRecord(receipt)',
])
assert(!localPublishRepository.includes("from '@/lib/pmfSupabase'"), `${localPublishRepositoryPath} must not import the Supabase facade`)
const localAgentRepository = assertIncludes(localAgentRepositoryPath, [
  "from './creatorLocalRepository'",
  'export function readLocalAgentOperations',
  'export function upsertLocalAgentOperation',
  'readLocalAgentOperationRecords(limit)',
  'upsertLocalAgentOperationRecord(record)',
])
assert(!localAgentRepository.includes("from '@/lib/pmfSupabase'"), `${localAgentRepositoryPath} must not import the Supabase facade`)
const localMigrationPlan = assertIncludes(localMigrationPlanPath, [
  'export function buildLegacyMigrationPlan',
  "conflictPolicy: 'indexeddb-wins'",
  'shouldApply: false',
])
assert(!localMigrationPlan.includes("from '@/lib/pmfSupabase'"), `${localMigrationPlanPath} must not import the Supabase facade`)
const localMigrationRepository = assertIncludes(localMigrationRepositoryPath, [
  "from './creatorLocalRepository'",
  'export function readLocalMigrationReceipts',
  'readLocalMigrationReceiptRecords()',
])
assert(!localMigrationRepository.includes("from '@/lib/pmfSupabase'"), `${localMigrationRepositoryPath} must not import the Supabase facade`)
const localWorkspaceRepository = assertIncludes(localWorkspaceRepositoryPath, [
  "from './creatorLocalAgentRepository'",
  "from './creatorLocalDraftRepository'",
  "from './creatorLocalMigrationRepository'",
  "from './creatorLocalReaderSignalRepository'",
  "from './creatorLocalPublishRepository'",
  "from './creatorLocalSettingAssetRepository'",
  "from './creatorLocalWritingRepository'",
  'export interface LocalCreatorWorkspaceSnapshot',
  'export function readLocalWorkspaceSnapshot',
  'drafts: readLocalDrafts()',
  'settingAssets: readLocalSettingAssets()',
  'readerSignals: readLocalReaderSignals()',
  'creativeReminders: readLocalCreativeReminders()',
  'publishBundles: readLocalPublishBundles()',
  'publishReceipts: readLocalPublishReceipts()',
  'operationRecords: readLocalAgentOperations(20)',
  'migrationReceipts: readLocalMigrationReceipts()',
])
assert(!localWorkspaceRepository.includes("from '@/lib/pmfSupabase'"), `${localWorkspaceRepositoryPath} must not import the Supabase facade`)
const bundleAdapter = assertIncludes(bundleAdapterPath, [
  'createPublishBundle',
  'publishOwnPlatformBundle',
  'publishReceiptSchema.parse',
  'readPublishBundleLifecycle',
  'applyLocalPublishReceipt',
  "await import('@/lib/pmfSupabase')",
])
const bundleLifecycle = assertIncludes(bundleLifecyclePath, [
  "from '@/local-db/creatorLocalPublishRepository'",
  'prepareLocalPublishBundle',
  'reviewLocalPublishBundle',
  'confirmLocalPublishBundle',
  'markLocalPublishBundleExported',
  'applyLocalPublishReceipt',
])
assert(!bundleLifecycle.includes("from '@/lib/pmfSupabase'"), `${bundleLifecyclePath} must not import the Supabase facade`)
assertIncludes(bundlePackagePath, [
  'createPublishBundle',
  'preparePublishBundlePackage',
  'parsePublishBundlePackage',
  'sha256Text',
  'sha256Bytes',
])

const publishTransaction = adapter.slice(
  adapter.indexOf('export async function publishBundleTransaction'),
  adapter.indexOf('export function requestTypeLabel'),
)
for (const transactionMarker of [
  ".rpc('publish_bundle_transaction'",
  'p_bundle_id: input.bundleId',
  'p_idempotency_key: input.idempotencyKey',
  'p_content_checksum: input.contentChecksum',
  'p_reader_request_ids: input.requestIds',
]) {
  assert(publishTransaction.includes(transactionMarker), `${adapterPath} publish transaction missing ${transactionMarker}`)
}
for (const forbiddenDirectWrite of [
  ".from('branches')",
  ".from('chapters')",
  ".from('publish_events')",
  ".from('reader_requests')",
  '.insert(',
  '.upsert(',
  '.update(',
]) {
  assert(!publishTransaction.includes(forbiddenDirectWrite), `${adapterPath} publish transaction must not perform browser-owned ${forbiddenDirectWrite}`)
}

for (const forbiddenCloudDraftTerm of [
  'candidate_content',
  'draft_content',
  'provider_response',
  'prompt',
]) {
  assert(!adapter.includes(forbiddenCloudDraftTerm), `${adapterPath} must not send ${forbiddenCloudDraftTerm} through the cloud adapter`)
}

assert(!publishTransaction.includes('localDraftRef'), `${adapterPath} RPC payload must not include a local draft reference`)

const firstCloudFunctionIndex = adapter.indexOf('export async function getPmfSession')
assert(firstCloudFunctionIndex > 0, `${adapterPath} must expose the cloud-session boundary`)

assertIncludes(fixturePath, [
  'let works: PmfWork[]',
  'let branches: PmfBranch[]',
  'let chapters: PmfChapter[]',
  'let requests: PmfReaderRequest[]',
  'let publishEvents: PmfPublishEvent[]',
  'defaultDrafts',
  'defaultSettingAssets',
  'readLocalCreativeReminders',
  'upsertLocalCreativeReminder',
  'readLocalWorkspaceSnapshot',
  'migrationReceipts',
])

assertIncludes(vitePath, [
  "mode === 'creator-qa'",
  '@/lib/pmfSupabase',
  './src/__fixtures__/pmfSupabase.creator-qa.ts',
])

const dashboardRoute = assertIncludes(dashboardRoutePath, [
  "from './creatorDashboardBrowserActionService'",
  "from './creatorDashboardLoadService'",
  "from './creatorDashboardRouteEffectService'",
  "from './creatorDashboardReactPatchApplier'",
  "from './creatorDashboardRouteViewModels'",
  'scheduleCreatorDashboardInitialLoad(sync)',
  'readCreatorDashboardLocalSnapshot().drafts',
  'runCreatorDashboardSyncEffect()',
  'applyCreatorDashboardRouteStatePatchToReact(statePatch,',
  'createCreatorDashboardRouteViewModel({',
])
const dashboardBrowserActionService = assertIncludes(dashboardBrowserActionServicePath, [
  'export interface CreatorDashboardBrowserPort',
  'export function scheduleCreatorDashboardInitialLoad',
])
const dashboardLoadService = assertIncludes(dashboardLoadServicePath, [
  "from '@/lib/pmfSupabase'",
  "from '@/local-db/creatorLocalDraftRepository'",
  'export interface CreatorDashboardLoadApiPort',
  'export interface CreatorDashboardLocalReadPort',
  'export function readCreatorDashboardLocalSnapshot',
  'export async function runCreatorDashboardLoad',
  'syncClient: syncCreatorClient',
  'listRequests: listCreatorRequests',
  'listWorks: listCreatorWorks',
  'listBranches: listCreatorBranches',
  'listChapters: listCreatorChapters',
  'listPublishEvents: listCreatorPublishEvents',
  'readDrafts: readLocalDrafts',
])
const dashboardRouteEffectService = assertIncludes(dashboardRouteEffectServicePath, [
  "import { runCreatorDashboardLoad } from './creatorDashboardLoadService'",
  'export interface CreatorDashboardRouteEffectPort',
  'load: runCreatorDashboardLoad',
  'export async function runCreatorDashboardSyncEffect',
  'const result = await port.load()',
])
const dashboardReactPatchApplier = assertIncludes(dashboardReactPatchApplierPath, [
  "from './creatorDashboardRouteEffectService'",
  'export interface CreatorDashboardRouteStatePatchSetters',
  'export function applyCreatorDashboardRouteStatePatchToReact',
  'setters.setClientStatus(statePatch.clientStatus)',
  'setters.setPhase(statePatch.phase)',
  'setters.setNotice(statePatch.notice)',
])
const dashboardRouteViewModels = assertIncludes(dashboardRouteViewModelsPath, [
  'export interface CreatorDashboardRouteViewModelInput',
  'export interface CreatorDashboardRouteViewModel',
  'export function createCreatorDashboardRouteViewModel',
  '.sort(byRequestPriority)',
  '.sort(byNewestDraft)',
  'isDraftReadyForPublish',
])
for (const forbiddenDashboardServiceDependency of [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
]) {
  assert(!dashboardLoadService.includes(forbiddenDashboardServiceDependency), `${dashboardLoadServicePath} must not import UI/router dependencies ${forbiddenDashboardServiceDependency}`)
  assert(!dashboardBrowserActionService.includes(forbiddenDashboardServiceDependency), `${dashboardBrowserActionServicePath} must not import UI/router dependencies ${forbiddenDashboardServiceDependency}`)
  assert(!dashboardRouteEffectService.includes(forbiddenDashboardServiceDependency), `${dashboardRouteEffectServicePath} must not import UI/router dependencies ${forbiddenDashboardServiceDependency}`)
  assert(!dashboardReactPatchApplier.includes(forbiddenDashboardServiceDependency), `${dashboardReactPatchApplierPath} must not import UI/router dependencies ${forbiddenDashboardServiceDependency}`)
  assert(!dashboardRouteViewModels.includes(forbiddenDashboardServiceDependency), `${dashboardRouteViewModelsPath} must not import UI/router dependencies ${forbiddenDashboardServiceDependency}`)
}
for (const forbiddenDashboardViewModelDependency of [
  '@/local-db/',
  '@/lib/pmfSupabase',
  'window.',
  'document.',
  'fetch(',
]) {
  assert(!dashboardRouteViewModels.includes(forbiddenDashboardViewModelDependency), `${dashboardRouteViewModelsPath} must stay pure instead of ${forbiddenDashboardViewModelDependency}`)
}
for (const routeDataResidue of [
  "from '@/local-db/creatorLocalDraftRepository'",
  'syncCreatorClient()',
  'listCreatorRequests()',
  'listCreatorWorks()',
  'listCreatorBranches()',
  'listCreatorChapters()',
  'listCreatorPublishEvents()',
  'readLocalDrafts()',
  'runCreatorDashboardLoad()',
  'window.setTimeout',
  'window.clearTimeout',
  'byNewestDraft',
  'byRequestPriority',
  'isDraftReadyForPublish',
]) {
  assert(!dashboardRoute.includes(routeDataResidue), `${dashboardRoutePath} must delegate Today loading instead of ${routeDataResidue}`)
}

const echoRoute = assertIncludes(echoRoutePath, [
  "from './creatorEchoActionService'",
  "from './creatorEchoBrowserActionService'",
  "from './creatorEchoLoadService'",
  "from './creatorEchoRouteController'",
  "from './creatorEchoRouteViewModels'",
  'runCreatorEchoLoad()',
  'runCreatorEchoStatusUpdate(request, status)',
  'runCreatorEchoStartWriting(request)',
  'createCreatorEchoRouteViewModel({',
  'scheduleCreatorEchoInitialLoad(load)',
  'scheduleCreatorEchoVisibilityRefresh(load)',
  'subscribeCreatorEchoWorkspaceRefresh(refreshLocalEcho)',
  'openCreatorEchoReaderPerspective(',
  'CreatorExternalEchoInboxCard',
  'CreatorExternalEchoDetailPanel',
])
const echoRouteViewModels = assertIncludes(echoRouteViewModelsPath, [
  'export interface CreatorEchoRouteViewModelInput',
  'export const creatorEchoSavedViews',
  'export function createCreatorEchoRouteViewModel',
  'resolveVisibleEchoSignals(readerSignals, creativeReminders, {',
  'resolveReminderForSignal(',
  'resolveRequestForSignal(',
  'buildRequestClusterCounts(requests)',
  'buildEchoSignalViewModel(',
  'buildPriorityEchoSignalAction(',
  'selectedRequestCapabilities:',
  'visibleSignalRows',
])
const echoLoadService = assertIncludes(echoLoadServicePath, [
  "from '@/lib/pmfSupabase'",
  "from '@/local-db/creatorLocalReaderSignalRepository'",
  "from '@/local-db/creatorLocalWritingRepository'",
  'export interface CreatorEchoLoadApiPort',
  'export interface CreatorEchoLoadLocalPort',
  'export async function runCreatorEchoLoad',
  'listRequests: listCreatorRequests',
  'listWorks: listCreatorWorks',
  'listBranches: listCreatorBranches',
  'listSignalBatches: listCreatorEchoSourceBatches',
  'cacheReaderSignals: cacheReaderSignalBatches',
  'readCreativeReminders: readLocalCreativeReminders',
  'suggestCreativeReminders: suggestLocalCreativeReminders',
  'await local.hydrate()',
  'local.cacheReaderSignals(batchResult.data)',
])
const echoActionService = assertIncludes(echoActionServicePath, [
  "from '@/lib/pmfSupabase'",
  "from '@/local-db/creatorLocalWritingRepository'",
  'export interface CreatorEchoStatusApiPort',
  'export interface CreatorEchoReminderPort',
  'export async function runCreatorEchoStatusUpdate',
  'export async function runCreatorEchoStartWriting',
  'export async function runCreatorEchoReminderAction',
  'updateStatus: updateReaderRequestStatus',
  "pin: request => upsertLocalCreativeReminder({ request, status: 'pinned' })",
  'readAll: readLocalCreativeReminders',
  'creatorFacingNotice(result.message)',
  'notice: `回声已更新为「${requestStatusLabel(result.data.status)}」。`',
  'notice: `创作提醒已更新为「${creativeReminderStatusLabel(updated.status)}」。`',
])
for (const echoRouteActionResultResidue of [
  '回声已更新为「${requestStatusLabel(',
  '创作提醒已更新为「${creativeReminderStatusLabel(',
]) {
  assert(!echoRoute.includes(echoRouteActionResultResidue), `${echoRoutePath} must not rebuild action result copy ${echoRouteActionResultResidue}`)
}
const echoBrowserActionService = assertIncludes(echoBrowserActionServicePath, [
  'export interface CreatorEchoBrowserPort',
  'export function scheduleCreatorEchoInitialLoad',
  'export function scheduleCreatorEchoActionReset',
  'export function scheduleCreatorEchoVisibilityRefresh',
  'export function subscribeCreatorEchoWorkspaceRefresh',
  'export function openCreatorEchoReaderPerspective',
  'port.open(url, \'_blank\', \'noopener,noreferrer\')',
])
for (const forbiddenEchoServiceDependency of [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
]) {
  assert(!echoLoadService.includes(forbiddenEchoServiceDependency), `${echoLoadServicePath} must not import UI/router dependencies ${forbiddenEchoServiceDependency}`)
  assert(!echoActionService.includes(forbiddenEchoServiceDependency), `${echoActionServicePath} must not import UI/router dependencies ${forbiddenEchoServiceDependency}`)
  assert(!echoBrowserActionService.includes(forbiddenEchoServiceDependency), `${echoBrowserActionServicePath} must not import UI/router dependencies ${forbiddenEchoServiceDependency}`)
}
for (const routeDataResidue of [
  'listCreatorRequests()',
  'listCreatorWorks()',
  'listCreatorBranches()',
  'cacheReaderRequestSignals(requestResult.data)',
  'readLocalCreativeReminders()',
  'upsertLocalCreativeReminder({',
  'updateReaderRequestStatus(',
  'window.open',
  'window.setTimeout',
  'window.clearTimeout',
  'buildRequestClusterCounts(requests)',
  'resolveVisibleEchoSignals(readerSignals, creativeReminders, {',
  'resolveReminderForSignal(',
  'resolveRequestForSignal(',
  'const savedViews:',
  'new Map(works.map(',
]) {
  assert(!echoRoute.includes(routeDataResidue), `${echoRoutePath} must delegate External Echo side effects instead of ${routeDataResidue}`)
}
for (const forbiddenEchoRouteViewModelDependency of [
  "from 'react'",
  'lucide-react',
  '@/components/',
  '@/lib/pmfSupabase',
  "from '@/local-db/creator",
  'window.',
  'document.',
  'fetch(',
  'navigate(',
]) {
  assert(!echoRouteViewModels.includes(forbiddenEchoRouteViewModelDependency), `${echoRouteViewModelsPath} must stay pure without ${forbiddenEchoRouteViewModelDependency}`)
}
const echoController = assertIncludes(echoControllerPath, [
  'export function requestIntentLabel',
  'function requestSceneSeed',
  'export function requestAuthorDecision',
  'export function requestWritingQuestion',
  'function requestClusterKey',
  'export function canMoveRequestStatus',
  'export function buildSelectedEchoDecisionCards',
])
const echoSignalViewModels = assertIncludes(echoSignalViewModelsPath, [
  'export function resolveVisibleEchoSignals',
  'export function buildEchoSignalViewCounts',
  'export function buildEchoSourceRows',
  'export function resolvePriorityEchoSignal',
  'export function buildEchoSignalViewModel',
  'export function buildPriorityEchoSignalAction',
  'export function echoFreshnessLabel',
])
for (const forbiddenEchoControllerDependency of [
  'from \'react\'',
  'from "react"',
  '@/lib/pmfSupabase',
  '@/local-db/',
  '@/components/',
  'window.',
  'localStorage',
  'fetch(',
]) {
  assert(!echoController.includes(forbiddenEchoControllerDependency), `${echoControllerPath} must stay a pure route decision controller without ${forbiddenEchoControllerDependency}`)
  if (forbiddenEchoControllerDependency !== '@/local-db/') {
    assert(!echoSignalViewModels.includes(forbiddenEchoControllerDependency), `${echoSignalViewModelsPath} must stay a pure External Echo view-model owner without ${forbiddenEchoControllerDependency}`)
  }
}
for (const retiredRequestViewModelMarker of [
  'EchoStatusFilter',
  'EchoTypeFilter',
  'EchoSavedView',
  'EchoSort',
  'EchoFilterState',
  'requestNextStepLabel',
  'savedViewMatches',
  'sortRequests',
  'requestActionHint',
  'buildEchoViewCounts',
  'resolveVisibleEchoRequests',
  'resolveSelectedEchoRequest',
  'resolvePriorityEchoRequest',
  'buildEchoStatusRows',
  'echoSortLabel',
  'resolveClusteredEchoRequest',
  'buildPriorityEchoAction',
]) {
  assert(!echoController.includes(retiredRequestViewModelMarker), `${echoControllerPath} must not retain superseded request-only view-model marker ${retiredRequestViewModelMarker}`)
}
assert(!echoSignalViewModels.includes('readerSignalTypeLabel'), `${echoSignalViewModelsPath} must not expose an unused type-label wrapper`)
for (const [source, sourcePath, marker] of [
  [echoActionService, echoActionServicePath, 'export type RunCreatorEchoStatusResult'],
  [echoActionService, echoActionServicePath, 'export type RunCreatorEchoStartWritingResult'],
  [echoActionService, echoActionServicePath, 'export type RunCreatorEchoReminderActionResult'],
  [echoBrowserActionService, echoBrowserActionServicePath, 'export type CreatorEchoReaderPerspectiveResult'],
  [echoLoadService, echoLoadServicePath, 'export type RunCreatorEchoLoadResult'],
  [echoController, echoControllerPath, 'export function requestSceneSeed'],
  [echoController, echoControllerPath, 'export function requestClusterKey'],
  [echoSignalViewModels, echoSignalViewModelsPath, 'export interface EchoSignalFilterState'],
]) {
  assert(!source.includes(marker), `${sourcePath} must keep internal External Echo implementation detail private: ${marker}`)
}
for (const forbiddenEchoViewModelDataDependency of [
  "from '@/local-db/creator",
  'from "@/local-db/creator',
  'readLocal',
  'upsertLocal',
]) {
  assert(!echoSignalViewModels.includes(forbiddenEchoViewModelDataDependency), `${echoSignalViewModelsPath} may use local schema types but must not access local repositories through ${forbiddenEchoViewModelDataDependency}`)
}
for (const routeDecisionResidue of [
  'function requestIntentLabel',
  'function requestSceneSeed',
  'function requestAuthorDecision',
  'function requestWritingQuestion',
  'function requestNextStepLabel',
  'function sortRequests',
  'function savedViewMatches',
  'function buildRequestClusterCounts',
  'function requestActionHint',
]) {
  assert(!echoRoute.includes(routeDecisionResidue), `${echoRoutePath} must delegate pure External Echo decisions instead of ${routeDecisionResidue}`)
}

const editorRoute = assertIncludes(editorRoutePath, [
	"from './creatorEditorRouteController'",
  "from './creatorEditorDestinationController'",
  "from './creatorEditorAgentExecutionService'",
  "from './creatorEditorSelectionController'",
  'applyEditorDraftStatePatchToReact',
  'applyEditorStartupStatePatchToReact',
  'applyEditorStartupDataPatchToReact',
	'readCreatorEditorRouteQuery(location.search)',
  'readEditorStartupLocalSnapshot()',
  'scheduleEditorStartupEffect(() => {',
  'runEditorStartupEffect({',
  'resolveEditorStartupDataPatch(startupResult)',
  'resolveEditorSelectedRequest({',
  'resolveEditorDestinationContext({',
  'runEditorDraftSaveThroughAgent({',
  'runEditorPublishCheckThroughAgent({',
])
const canonicalConversationalEditor = editorRoute.includes('CreatorConversationWorkspace')
if (canonicalConversationalEditor) {
  for (const marker of [
    "from '@/components/creator/workspace/CreatorConversationWorkspace'",
    "from './creatorEditorRecallViewModels'",
    "from './creatorEditorConversationSettingService'",
    "from './useCreatorEditorDecisionWorkbench'",
    'buildCreatorRecallCandidates({',
    'resolveManualRecallItems(recallCandidates, appliedRecallIds)',
    'manualRecallItems,',
    'runConversationSettingCapture({',
    '<CreatorConversationWorkspace',
  ]) {
    assert(editorRoute.includes(marker), `${editorRoutePath} missing ${marker}`)
  }
  for (const legacyComposition of [
    "from './creatorEditorWorkspaceViewModelController'",
    "from './creatorEditorSessionViewModels'",
    "from './creatorEditorCommandFlowService'",
    "from './creatorEditorSettingAssetSubmitFlowService'",
    'CreatorWritingWorkspaceFrame',
    'rightRail={(',
  ]) {
    assert(!editorRoute.includes(legacyComposition), `${editorRoutePath} must not remount legacy editor composition ${legacyComposition}`)
  }
} else {
  for (const marker of [
    "from './creatorEditorWorkspaceViewModelController'",
    "from './creatorEditorSessionViewModels'",
    "from './creatorEditorCommandFlowService'",
    'applyEditorCommandStatePatchToReact',
    'applyEditorCandidateStatePatchToReact',
    'applyEditorUserActionStatePatchToReact',
    'resolveEditorCommandPatchFlow({',
    'runEditorAssistCandidateAdoptionThroughAgent({',
    'resolveEditorAssistCandidateBranchFlow()',
    'resolveEditorAssistantSuggestionAcceptanceFlow({',
    'resolveEditorAssistDismissalFlow()',
    'resolveEditorGuideStepSelectionFlow(nextStep)',
    'resolveEditorKeepAsIfBranchFlow()',
    'bindEditorCommandCandidateApplyFlow({',
    'bindEditorShortcutFlow({',
    'resolveEditorLinkedCreativeReminder({',
    'buildEditorWorkspaceViewModel({',
    "from './creatorEditorSettingAssetSubmitFlowService'",
    'runEditorSettingAssetSubmitFlow({',
    'buildEditorSessionGroups({',
    'buildEditorPrivateDraftItems({',
    'runEditorDraftOpenThroughAgent(draft)',
    'resolveEditorFreshDraftStatePatch(resolveFreshEditorDraft())',
    'applyEditorSettingAssetStatePatchToReact',
  ]) {
    assert(editorRoute.includes(marker), `${editorRoutePath} missing ${marker}`)
  }
}
const editorRecallViewModels = assertIncludes(editorRecallViewModelsPath, [
  'export function buildCreatorRecallCandidates',
  'export function recommendedCreatorRecallIds',
  'export function resolveManualRecallItems',
  'PmfChapter',
  'PmfLocalSettingAsset',
  'PmfReaderRequest',
])
const editorConversationSettingService = assertIncludes(editorConversationSettingServicePath, [
  'export function runConversationSettingCapture',
  'upsertLocalSettingAsset',
  'recognized: false',
])
const editorDecisionContextAdapter = assertIncludes(editorDecisionContextAdapterPath, [
  'manualRecallItems',
  'manual_recall:',
])
const editorDecisionWorkbenchHook = assertIncludes(editorDecisionWorkbenchHookPath, [
  'export function useCreatorEditorDecisionWorkbench',
  'manualRecallItems',
  "from './useCreationDecisionSession'",
])
const editorDecisionSessionHook = assertIncludes(editorDecisionSessionHookPath, [
  "from './creatorEditorDecisionContextAdapter'",
  'manualRecallItems: inputRef.current.manualRecallItems',
])
const creatorConversationWorkspace = read(creatorConversationWorkspacePath)
const creatorConversationTimeline = read(creatorConversationTimelinePath)
const creatorRecallRail = read(creatorRecallRailPath)
for (const [path, body] of [
  [editorRecallViewModelsPath, editorRecallViewModels],
  [editorDecisionContextAdapterPath, editorDecisionContextAdapter],
]) {
  for (const forbiddenDataDependency of [
    "from 'react'",
    'window.',
    'document.',
    'localStorage',
    'indexedDB',
    'fetch(',
    '@/lib/pmfSupabase',
    '@/local-db/creator',
  ]) {
    assert(!body.includes(forbiddenDataDependency), `${path} must stay pure of ${forbiddenDataDependency}`)
  }
}
for (const [path, body] of [
  [creatorConversationWorkspacePath, creatorConversationWorkspace],
  [creatorConversationTimelinePath, creatorConversationTimeline],
  [creatorRecallRailPath, creatorRecallRail],
]) {
  for (const forbiddenUiDataDependency of [
    '@/lib/pmfSupabase',
    '@/local-db/creator',
    'readLocal',
    'upsertLocal',
  ]) {
    assert(!body.includes(forbiddenUiDataDependency), `${path} must receive data through route props instead of ${forbiddenUiDataDependency}`)
  }
}
assert(editorConversationSettingService.includes("from '@/local-db/creatorLocalSettingAssetRepository'"), `${editorConversationSettingServicePath} must single-own explicit local setting persistence`)
assert(editorDecisionWorkbenchHook.includes('manualRecallItems: input.manualRecallItems'), `${editorDecisionWorkbenchHookPath} must forward selected recalls into the decision session`)
assert(editorDecisionSessionHook.includes('buildCreatorDecisionContextSource'), `${editorDecisionSessionHookPath} must compile selected recalls through the decision-context adapter`)
assertIncludes(editorRouteControllerPath, [
  'export interface CreatorEditorRouteQuery',
  'export function readCreatorEditorRouteQuery',
  "requestId: searchParams.get('request')",
  "routeDraftRef: searchParams.get('draft')",
  "routeWorkId: searchParams.get('work')",
  "routeBranchId: searchParams.get('branch')",
])
for (const editorRouteQueryResidue of [
  'new URLSearchParams(',
  "searchParams.get('request')",
  "searchParams.get('draft')",
  "searchParams.get('work')",
  "searchParams.get('branch')",
]) {
  assert(!editorRoute.includes(editorRouteQueryResidue), `${editorRoutePath} must delegate route query parsing instead of ${editorRouteQueryResidue}`)
}
for (const directDraftActionFlowImport of [
  "from './creatorEditorDraftActionFlowService'",
  "from './creatorEditorDraftActionService'",
  "from './creatorEditorDraftActionResetService'",
  "from './creatorEditorPublishCheckService'",
]) {
  assert(!editorRoute.includes(directDraftActionFlowImport), `${editorRoutePath} must enter draft save/publish through creatorEditorAgentExecutionService instead of ${directDraftActionFlowImport}`)
}
assertIncludes(editorDestinationControllerPath, [
  'export function resolveEditorDestinationContext',
  'export function branchIdForPublish',
  'const destinationReady = Boolean(selectedWorkId && resolvedBranchId)',
  'const canSaveDraft = authorReady && titleReady && contentReady && destinationReady',
  'const ifBranchOptions',
])
assertIncludes(editorWorkspaceViewModelControllerPath, [
  'export function buildEditorWorkspaceViewModel',
  "from './creatorEditorQualityViewModels'",
  "from './creatorEditorReviewImpactViewModels'",
  "from './creatorEditorStoryMapViewModels'",
  'const assistantSuggestion = buildEditorCompletion(selectedRequest, content)',
  'const storyMapItems = buildStoryMapItems({',
  'const reviewStateDiff = buildStateDiffViewModel({',
])
const editorSocraticViewModels = assertIncludes(editorSocraticViewModelsPath, [
  'export type SocraticQuestion',
  'export function buildSocraticQuestion',
  'export function writingGuideStepLabel',
  'export function settingAssetKindLabel',
  'export function planStageAssetKinds',
  'export function defaultSettingKindForStage',
  'export function settingAssetSummary',
  'export function buildSocraticPlanStages',
  'export function chapterPlannerGoalBriefs',
  'export function chapterPlannerDirections',
])
const editorAssistantViewModels = assertIncludes(editorAssistantViewModelsPath, [
  'export type EditorAssistAction',
  'export type WritingCommandId',
  'export type ReviewDockTab',
  'export type EditorAssistCandidate',
  'export function buildEditorCompletion',
  'export function buildEditorAssistCandidate',
  'export function workspaceAssistCandidate',
  'export function workspaceAssistFocus',
  'export function workspaceAssistCurrentFocus',
  'export function workspaceAssistProgress',
  'export function ghostCompletionTitle',
  'export function ghostCompletionMeta',
  'export function writingCommandItems',
])
for (const [path, body] of [
  [editorSocraticViewModelsPath, editorSocraticViewModels],
  [editorAssistantViewModelsPath, editorAssistantViewModels],
]) {
  for (const forbiddenDependency of [
    "from 'react'",
    'lucide-react',
    'window.',
    'document.',
    'localStorage',
    'indexedDB',
    'fetch(',
    '@/lib/pmfSupabase',
  ]) {
    assert(!body.includes(forbiddenDependency), `${path} must stay free of ${forbiddenDependency}`)
  }
}
assertIncludes(editorWorkspaceViewModelControllerPath, [
  "from './creatorEditorSocraticViewModels'",
  "from './creatorEditorAssistantViewModels'",
])
assertIncludes(editorManuscriptPath, [
  "from './creatorEditorSocraticViewModels'",
  "from './creatorEditorAssistantViewModels'",
])
assertIncludes('app/src/apps/creator/routes/CreatorEditorGuidance.tsx', [
  "from './creatorEditorSocraticViewModels'",
  "from './creatorEditorAssistantViewModels'",
])
assertIncludes('app/src/apps/creator/routes/CreatorEditorRails.tsx', [
  "from './creatorEditorAssistantViewModels'",
])
assertIncludes(editorCommandPatchControllerPath, [
  "from './creatorEditorAssistantViewModels'",
])
assertIncludes(editorActionInputControllerPath, [
  'export function buildEditorDraftActionInput',
  'export function buildEditorPublishCheckInput',
  'export function buildEditorSettingCaptureInput',
])
const editorCommandController = assertIncludes(editorCommandControllerPath, [
  'export interface CreatorEditorCommandPatch',
  'export function resolveBranchExperimentDecision',
  'export function resolveStoryFlowStage',
])
assert(!editorCommandController.includes('export function resolveWritingCommand'), `${editorCommandControllerPath} must delegate assistant actions to creatorEditorAssistantController`)
assert(!editorCommandController.includes('export function resolveChapterDirectionSelection'), `${editorCommandControllerPath} must delegate selection actions to creatorEditorSelectionController`)
assert(!editorCommandController.includes('export function resolveEditorShortcut'), `${editorCommandControllerPath} must delegate shortcut actions to creatorEditorAssistantController`)
assertIncludes(editorAssistantControllerPath, [
  'export function resolveWritingCommand',
  'export function resolveEditorAssistAction',
  'export function resolveEditorShortcut',
  'export function resolveReviewFix',
  'export interface CreatorEditorShortcutInput',
])
assertIncludes(editorSelectionControllerPath, [
  'export function resolveEditorSelectedRequest',
  'export function resolveEditorLinkedCreativeReminder',
  "item.status === 'in_progress'",
  "item.status === 'acknowledged'",
  "item.status === 'pending'",
  'sourceSignalIds.includes(selectedRequest.id)',
  'export function resolveChapterDirectionSelection',
  'export function resolveChapterGoalConfirmation',
  'export function resolveDraftGuideContinuation',
  'chapterDirectionLabel(direction)',
])

assertIncludes(editorSessionViewModelsPath, [
  'export function buildEditorSessionGroups',
  'export function buildEditorPrivateDraftItems',
  '.sort(byNewestDraft)',
  '.sort(byRequestPriority)',
])
const editorViewModels = read(editorViewModelsPath)
for (const movedViewModelMarker of [
  'export type SocraticQuestion',
  'export function buildSocraticQuestion',
  'export function buildSocraticPlanStages',
  'export type EditorAssistAction',
  'export type WritingCommandId',
  'export type ReviewDockTab',
  'export type EditorAssistCandidate',
  'export function buildEditorCompletion',
  'export function buildEditorAssistCandidate',
  'export function writingCommandItems',
  'lucide-react',
  'ReactNode',
]) {
  assert(!editorViewModels.includes(movedViewModelMarker), `${editorViewModelsPath} must not regain ${movedViewModelMarker}`)
}
assert(editorViewModels.includes("import { compactExcerpt } from './creatorEditorSessionViewModels'"), 'Core editor view models must consume only the compact excerpt helper from the session owner')
assert(!editorViewModels.includes('buildEditorSessionGroups'), 'Core editor view models must not own or re-export buildEditorSessionGroups')
assert(!editorViewModels.includes('buildEditorPrivateDraftItems'), 'Core editor view models must not own or re-export buildEditorPrivateDraftItems')
const editorSessionViewModels = read(editorSessionViewModelsPath)
for (const forbiddenSessionViewModelDependency of [
  "from 'react'",
  'window.',
  'document.',
  'localStorage',
  'indexedDB',
  'fetch(',
  '@/lib/pmfSupabase',
]) {
  assert(!editorSessionViewModels.includes(forbiddenSessionViewModelDependency), `${editorSessionViewModelsPath} must stay pure of ${forbiddenSessionViewModelDependency}`)
}
const editorQualityViewModels = assertIncludes(editorQualityViewModelsPath, [
  'export type QualityIssue = CreatorQualityIssue',
  'export function buildQualityIssues',
  "id: 'missing-title'",
  "id: 'missing-destination'",
  "id: 'empty-prose'",
  "id: 'thin-prose'",
  "id: 'missing-turn'",
])
assert(!editorViewModels.includes("from './creatorEditorQualityViewModels'"), 'Core editor view models must not aggregate the quality owner')
assert(!editorViewModels.includes('buildQualityIssues'), 'Core editor view models must not own or re-export buildQualityIssues')
for (const forbiddenQualityViewModelDependency of [
  "from 'react'",
  'lucide-react',
  'window.',
  'document.',
  'localStorage',
  'indexedDB',
  'fetch(',
  '@/lib/pmfSupabase',
]) {
  assert(!editorQualityViewModels.includes(forbiddenQualityViewModelDependency), `${editorQualityViewModelsPath} must stay pure of ${forbiddenQualityViewModelDependency}`)
}
const editorReviewImpactViewModels = assertIncludes(editorReviewImpactViewModelsPath, [
  'export function buildStateDiffViewModel',
  'export function buildBranchSandboxViewModel',
  'export function buildFlightRecorderViewModel',
  'const impactCards: CreatorStateDiffImpactCard[]',
  'const sandboxCards: CreatorBranchSandboxCard[]',
  'const trustRows: CreatorFlightTrustRow[]',
])
assert(!editorViewModels.includes('export function buildStateDiffViewModel'), 'Legacy editor view-model aggregator must not own buildStateDiffViewModel')
assert(!editorViewModels.includes('export function buildBranchSandboxViewModel'), 'Legacy editor view-model aggregator must not own buildBranchSandboxViewModel')
assert(!editorViewModels.includes('export function buildFlightRecorderViewModel'), 'Legacy editor view-model aggregator must not own buildFlightRecorderViewModel')
for (const forbiddenReviewImpactDependency of [
  "from 'react'",
  'window.',
  'document.',
  'localStorage',
  'indexedDB',
  'fetch(',
  '@/lib/pmfSupabase',
]) {
  assert(!editorReviewImpactViewModels.includes(forbiddenReviewImpactDependency), `${editorReviewImpactViewModelsPath} must stay free of ${forbiddenReviewImpactDependency}`)
}
const editorStoryMapViewModels = assertIncludes(editorStoryMapViewModelsPath, [
  'export function storyMapTokens',
  'export function buildStoryMapItems',
  "from '@/components/creator/workspace/CreatorStoryContextPanels'",
])
const editorInlineReviewViewModels = assertIncludes(editorInlineReviewViewModelsPath, [
  'export function buildInlineReviewItems',
  'const hasQuestionHook =',
])
assertIncludes(editorManuscriptPath, [
  "from './creatorEditorInlineReviewViewModels'",
  'const inlineReviewItems = buildInlineReviewItems({',
])
assert(!editorViewModels.includes('export function storyMapTokens'), 'Legacy editor view-model aggregator must not own storyMapTokens')
assert(!editorViewModels.includes('export function buildStoryMapItems'), 'Legacy editor view-model aggregator must not own buildStoryMapItems')
assert(!editorViewModels.includes('export function buildInlineReviewItems'), 'Legacy editor view-model aggregator must not own buildInlineReviewItems')
assert(!editorViewModels.includes('lucide-react'), 'Legacy editor view-model aggregator must no longer own JSX icon data')
for (const [path, body] of [
  [editorStoryMapViewModelsPath, editorStoryMapViewModels],
  [editorInlineReviewViewModelsPath, editorInlineReviewViewModels],
]) {
  for (const forbiddenExtractedViewModelDependency of [
    "from 'react'",
    'window.',
    'document.',
    'localStorage',
    'indexedDB',
    'fetch(',
    '@/lib/pmfSupabase',
  ]) {
    assert(!body.includes(forbiddenExtractedViewModelDependency), `${path} must stay free of ${forbiddenExtractedViewModelDependency}`)
  }
}
assert(!editorInlineReviewViewModels.includes('lucide-react'), `${editorInlineReviewViewModelsPath} must stay icon-free`)

for (const routeViewModelResidue of [
  'const draftRows =',
  'const requestRows =',
  'const chapterRows =',
  '.sort(byNewestDraft)',
  '.sort(byRequestPriority)',
]) {
  assert(!editorRoute.includes(routeViewModelResidue), `${editorRoutePath} must delegate session/private-draft view-model construction instead of ${routeViewModelResidue}`)
}

for (const routeSelectionResidue of [
  'requests.find(item => item.status ===',
  'creativeReminders.find(reminder => reminder.sourceSignalIds.includes(selectedRequest.id))',
]) {
  assert(!editorRoute.includes(routeSelectionResidue), `${editorRoutePath} must resolve current request/reminder through creatorEditorSelectionController instead of ${routeSelectionResidue}`)
}
for (const routeDestinationResidue of [
  'new Map(works.map(work => [work.id, work]))',
  'new Map(branches.map(branch => [branch.id, branch]))',
  'branches.filter(branch => branch.work_id === selectedWorkId)',
  'chapters.filter(chapter => chapter.work_id === selectedWorkId)',
  'currentWorkBranches.find(branch => branch.branch_type ===',
  'pmfMainBranchId(selectedWorkId)',
  'branchIdForPublish(selectedWorkId, \'if\', selectedRequest)',
  'const titleReady = Boolean(title.trim())',
  'const canSaveDraft = authorReady && titleReady && contentReady && destinationReady',
  'const ifBranchOptions = [',
]) {
  assert(!editorRoute.includes(routeDestinationResidue), `${editorRoutePath} must resolve destination/readiness through creatorEditorDestinationController instead of ${routeDestinationResidue}`)
}
for (const routeWorkspaceViewModelResidue of [
  'buildSocraticPlanStages({',
  'buildEditorCompletion(selectedRequest, content)',
  'buildQualityIssues({',
  'buildStateDiffViewModel({',
  'buildBranchSandboxViewModel({',
  'buildFlightRecorderViewModel({',
  'buildStoryMapItems({',
  'workTitleFromMap(selectedWorkId, workMap)',
]) {
  assert(!editorRoute.includes(routeWorkspaceViewModelResidue), `${editorRoutePath} must build review/story-map view models through creatorEditorWorkspaceViewModelController instead of ${routeWorkspaceViewModelResidue}`)
}
if (!canonicalConversationalEditor) {
  for (const routeActionInputResidue of [
    "from './creatorEditorActionInputController'",
    "from './creatorEditorSettingAssetService'",
    "from './creatorEditorSettingAssetPatchController'",
    'workId: selectedWorkId',
    'branchId: resolvedBranchId',
    'branchId: resolvedBranchId || null',
    'workTitle: selectedWork?.title ||',
    'destinationLabel: editorDestinationLabel',
    'linkedRequestText: selectedRequest?.request_text || null',
  ]) {
    assert(!editorRoute.includes(routeActionInputResidue), `${editorRoutePath} must build legacy service inputs through creatorEditorActionInputController instead of ${routeActionInputResidue}`)
  }
}
assert(!editorRoute.includes('readEditorDrafts()'), `${editorRoutePath} must load through creatorEditorDraftLoadService`)
assert(!editorRoute.includes('listCreatorRequests()'), `${editorRoutePath} must load startup API data through creatorEditorStartupLoadService`)
assert(!editorRoute.includes('listCreatorWorks()'), `${editorRoutePath} must load startup API data through creatorEditorStartupLoadService`)
assert(!editorRoute.includes('listCreatorBranches()'), `${editorRoutePath} must load startup API data through creatorEditorStartupLoadService`)
assert(!editorRoute.includes('listCreatorChapters()'), `${editorRoutePath} must load startup API data through creatorEditorStartupLoadService`)
assert(!editorRoute.includes('getCreatorAuthorizationStatus()'), `${editorRoutePath} must load authorization through creatorEditorStartupLoadService`)
assert(!editorRoute.includes('runEditorDraftLoad().drafts'), `${editorRoutePath} must load startup drafts through creatorEditorStartupLoadService`)
assert(!editorRoute.includes('runEditorReminderLoad().creativeReminders'), `${editorRoutePath} must load startup reminders through creatorEditorStartupLoadService`)
assert(!editorRoute.includes('runEditorSettingAssetLoad().settingAssets'), `${editorRoutePath} must load startup setting assets through creatorEditorStartupLoadService`)
assert(!editorRoute.includes('runEditorStartupLoad()'), `${editorRoutePath} must run startup loading through creatorEditorStartupEffectService`)
assert(!editorRoute.includes('resolveEditorRouteBootstrap({'), `${editorRoutePath} must run startup bootstrap through creatorEditorStartupEffectService`)
assert(!editorRoute.includes('resolveEditorStartupStatePatch({'), `${editorRoutePath} must map startup state through creatorEditorStartupEffectService`)
assert(!editorRoute.includes('runEditorReminderBootstrap({'), `${editorRoutePath} must bootstrap reminders through creatorEditorStartupEffectService`)
assert(!editorRoute.includes('window.setTimeout(() => {'), `${editorRoutePath} must schedule startup through creatorEditorStartupEffectService`)
assert(!editorRoute.includes('window.clearTimeout(timer)'), `${editorRoutePath} must cancel startup through creatorEditorStartupEffectService`)
assert(!editorRoute.includes('readLocalCreativeReminders()'), `${editorRoutePath} must load reminders through creatorEditorReminderService`)
assert(!editorRoute.includes('upsertLocalCreativeReminder({'), `${editorRoutePath} must write reminders through creatorEditorReminderService`)
assert(!editorRoute.includes('saveEditorDraft({'), `${editorRoutePath} must save through creatorEditorDraftSaveService`)
assert(!editorRoute.includes('runEditorDraftSave({'), `${editorRoutePath} must save through creatorEditorDraftActionService`)
assert(!editorRoute.includes('resolveEditorDraftSaveResultPatch(result)'), `${editorRoutePath} must map save results through creatorEditorDraftActionService`)
assert(!editorRoute.includes('resolveEditorDraftSaveStatePatch(resolveEditorDraftSaveResultPatch(result))'), `${editorRoutePath} must map save state through creatorEditorDraftActionService`)
assert(!editorRoute.includes('resolveEditorAutosaveDecision('), `${editorRoutePath} must not enable unapproved implicit autosave`)
assert(!editorRoute.includes('editorAutosaveDebounceMs'), `${editorRoutePath} must not own unapproved autosave debounce timing`)
assert(!editorRoute.includes('window.setTimeout(() => saveDraft'), `${editorRoutePath} must not schedule draft autosave directly`)
assert(!editorRoute.includes("saveDraft('autosave'"), `${editorRoutePath} must not add implicit autosave writes`)
assert(!editorRoute.includes("saveDraft('publish')"), `${editorRoutePath} must enter publish check through creatorEditorPublishCheckService`)
assert(!editorRoute.includes('prepareEditorPublishHandoff('), `${editorRoutePath} must not prepare publish handoff directly`)
assert(!editorRoute.includes('setActiveDraftRef(patch.activeDraftRef)'), `${editorRoutePath} must apply draft patches through creatorEditorDraftPatchController`)
assert(!editorRoute.includes('setDrafts(patch.drafts)'), `${editorRoutePath} must apply draft patches through creatorEditorDraftPatchController`)
assert(!editorRoute.includes('setTitle(patch.title)'), `${editorRoutePath} must apply draft patches through creatorEditorDraftPatchController`)
assert(!editorRoute.includes('readLocalSettingAssets()'), `${editorRoutePath} must load setting assets through creatorEditorSettingAssetService`)
assert(!editorRoute.includes('upsertLocalSettingAsset({'), `${editorRoutePath} must save setting assets through creatorEditorSettingAssetService`)
assert(!editorRoute.includes('buildEditorAssistCandidate({'), `${editorRoutePath} must build assist candidates through creatorEditorCommandPatchController`)
assert(!editorRoute.includes('candidateTitle: resolution.candidateTitle'), `${editorRoutePath} must map command-candidate patches through creatorEditorCommandPatchController`)
assert(!editorRoute.includes('assistAction: resolution.candidateAction'), `${editorRoutePath} must map command-candidate patches through creatorEditorCommandPatchController`)
assert(!editorRoute.includes('primaryLabel: resolution.primaryLabel'), `${editorRoutePath} must map command-candidate patches through creatorEditorCommandPatchController`)
assert(!editorRoute.includes('typeof resolution.title'), `${editorRoutePath} must map candidate adoption through creatorEditorCandidatePatchController`)
assert(!editorRoute.includes('typeof resolution.content'), `${editorRoutePath} must map candidate adoption through creatorEditorCandidatePatchController`)
assert(!editorRoute.includes('resolution.clearCandidate'), `${editorRoutePath} must map candidate clearing through creatorEditorCandidatePatchController`)
assert(!editorRoute.includes('setContent(previous =>'), `${editorRoutePath} must accept assistant suggestions through creatorEditorUserActionController`)
assert(!editorRoute.includes("setPublishMode('if')"), `${editorRoutePath} must switch IF publish mode through creatorEditorUserActionController`)
assert(!editorRoute.includes("setNotice('已补入创作助手建议；可以继续改写。')"), `${editorRoutePath} must keep assistant suggestion notice in creatorEditorUserActionController`)
assert(!editorRoute.includes("setNotice('候选已收起，正文没有变化。')"), `${editorRoutePath} must keep dismissal notice in creatorEditorUserActionController`)
assert(!editorRoute.includes('writingGuideStepLabel(nextStep)'), `${editorRoutePath} must derive guide-step copy through creatorEditorUserActionController`)
for (const routeStatePatchResidue of [
  'if (statePatch.activeDraftRef)',
  'if (typeof statePatch.title',
  'if (typeof statePatch.content',
  'if (statePatch.publishMode)',
  'if (statePatch.selectedIfBranchId)',
  'if (statePatch.guideStep)',
  'if (statePatch.commandPatch)',
  'if (statePatch.creativeReminders)',
  'if (statePatch.drafts)',
  'if (statePatch.clearEditorAssistCandidate)',
  'if (statePatch.clearActiveWritingCommand)',
  'setSettingAssets(result.settingAssets)',
  'setGuideStep(result.nextGuideStep)',
  'const startupLoad = startupResult.startupLoad',
  'const nextRequests = startupLoad.requests',
  'const nextDrafts = startupLoad.drafts',
  'setDrafts(nextDrafts)',
  'setSettingAssets(startupLoad.settingAssets)',
  'setRequests(nextRequests)',
  'setWorks(nextWorks)',
  'setBranches(nextBranches)',
  'setChapters(nextChapters)',
  'setAuthorization(startupLoad.authorization)',
  'setCreativeReminders(startupResult.creativeReminders)',
]) {
  if (canonicalConversationalEditor && routeStatePatchResidue === 'setSettingAssets(result.settingAssets)') continue
  assert(!editorRoute.includes(routeStatePatchResidue), `${editorRoutePath} must apply state patches through creatorEditorReactPatchApplier instead of ${routeStatePatchResidue}`)
}
assert(!editorRoute.includes('bootstrap.draftRestore'), `${editorRoutePath} must map startup draft restoration through creatorEditorStartupPatchController`)
assert(!editorRoute.includes('bootstrap.routeBranchRestore'), `${editorRoutePath} must map startup branch restoration through creatorEditorStartupPatchController`)
assert(!editorRoute.includes('bootstrap.requestSeed'), `${editorRoutePath} must map startup request seeding through creatorEditorStartupPatchController`)
const editorDraftPersistence = assertIncludes(editorDraftPersistencePath, [
  "from '@/local-db/creatorLocalDraftRepository'",
  "from '@/local-db/creatorLocalWritingRepository'",
  'readLocalDrafts()',
  'upsertLocalDraft(draft)',
  'readLocalCreativeReminders()',
  'upsertLocalCreativeReminder({',
])
assert(!editorDraftPersistence.includes("@/lib/pmfSupabase"), `${editorDraftPersistencePath} must use local draft/writing repositories instead of the Supabase facade`)
assertIncludes(editorDraftLoadServicePath, [
  'export interface EditorDraftLoadPersistencePort',
  'export function runEditorDraftLoad',
  'readAll: readEditorDrafts',
  'persistence.readAll()',
])
const editorReminderService = assertIncludes(editorReminderServicePath, [
  'export interface EditorReminderPersistencePort',
  'export function runEditorReminderLoad',
  'export function runEditorReminderBootstrap',
  "from '@/local-db/creatorLocalWritingRepository'",
  'readAll: readLocalCreativeReminders',
  'upsert: upsertLocalCreativeReminder',
  'persistence.upsert({',
])
assert(!editorReminderService.includes("@/lib/pmfSupabase"), `${editorReminderServicePath} must use creatorLocalWritingRepository instead of the Supabase facade`)
assertIncludes(editorDraftSaveServicePath, [
  'export interface EditorDraftPersistencePort',
  'export async function runEditorDraftSave',
  'resolveEditorDraftSaveBlocker(readiness)',
  'persistence.save({',
])
assertIncludes(editorDraftActionControllerPath, [
  'export const editorDraftActionResetDelayMs',
  'export type EditorDraftSaveResultPatch',
  'export function resolveEditorDraftSaveResultPatch',
  'activeDraftRef: result.draft.localDraftRef',
  'notice: result.notice',
])
assertIncludes(editorDraftActionServicePath, [
  'export type EditorDraftActionKind',
  'export async function runEditorDraftAction',
  'runEditorDraftSave(saveInput)',
  'resolveEditorDraftSaveStatePatch(resolveEditorDraftSaveResultPatch(result))',
  'statePatch.ok ? statePatch.draft || null : null',
])
assertIncludes(editorDraftActionFlowServicePath, [
  'export interface EditorDraftActionFlowResetPort',
  'export async function runEditorManualDraftActionFlow',
  'export async function runEditorPublishCheckFlow',
  'runEditorDraftAction(input)',
  'runEditorPublishCheckAction(input)',
  'resetPort.scheduleReset(resetDraftAction)',
])
assertIncludes(editorDraftSubmitFlowServicePath, [
  'export interface EditorDraftSubmitContext',
  'export async function runEditorManualDraftSubmitFlow',
  'export async function runEditorPublishCheckSubmitFlow',
  'buildEditorDraftActionInput({',
  'buildEditorPublishCheckInput(context)',
  'runEditorManualDraftActionFlow({',
  'runEditorPublishCheckFlow({',
])
assertIncludes(editorPublishCheckServicePath, [
  'export type RunEditorPublishCheckInput',
  'export interface RunEditorPublishCheckResult',
  'export async function runEditorPublishCheckAction',
  "action: 'publish'",
  'prepareEditorPublishHandoff(result.draft',
  'handoff: null',
])
assertIncludes(editorDraftActionResetServicePath, [
  'export interface EditorDraftActionResetPort',
  'export function scheduleEditorDraftActionReset',
  'editorDraftActionResetDelayMs',
  'port.scheduleReset(reset, editorDraftActionResetDelayMs)',
])
assertIncludes(editorStartupLoadServicePath, [
  'export interface EditorStartupLoadApiPort',
  'export function readEditorStartupLocalSnapshot',
  'export async function runEditorStartupLoad',
  'api.listRequests()',
  'api.listWorks()',
  'api.listBranches()',
  'api.listChapters()',
  'api.getAuthorization()',
  'readEditorStartupLocalSnapshot()',
])
assertIncludes(editorStartupEffectServicePath, [
  'export const editorStartupEffectDelayMs',
  'export interface EditorStartupEffectTimerPort',
  'export function scheduleEditorStartupEffect',
  'export async function runEditorStartupEffect',
  'port.scheduleStartup(startup, editorStartupEffectDelayMs)',
  'resolveEditorRouteBootstrap({',
  'runEditorReminderBootstrap({',
  'resolveEditorStartupStatePatch({',
])
assertIncludes(editorStartupDataPatchControllerPath, [
  'export interface CreatorEditorStartupDataPatch',
  'export function resolveEditorStartupDataPatch',
  'drafts: result.startupLoad.drafts',
  'settingAssets: result.startupLoad.settingAssets',
  'creativeReminders: result.creativeReminders',
])
assertIncludes(editorReactPatchApplierPath, [
  'export interface EditorStartupStatePatchSetters',
  'export interface EditorStartupDataPatchSetters',
  'export interface EditorCommandStatePatchSetters',
  'export interface EditorCandidateStatePatchSetters',
  'export interface EditorDraftStatePatchSetters',
  'export interface EditorUserActionStatePatchSetters',
  'export interface EditorSettingAssetStatePatchSetters',
  'export function applyEditorStartupStatePatchToReact',
  'export function applyEditorStartupDataPatchToReact',
  'export function applyEditorCommandStatePatchToReact',
  'export function applyEditorCandidateStatePatchToReact',
  'export function applyEditorDraftStatePatchToReact',
  'export function applyEditorUserActionStatePatchToReact',
  'export function applyEditorSettingAssetStatePatchToReact',
  'if (statePatch.editorAssistCandidate !== undefined) setters.setEditorAssistCandidate(statePatch.editorAssistCandidate)',
  'setters.setRequests(dataPatch.requests)',
  'setters.setCreativeReminders(dataPatch.creativeReminders)',
  'if (statePatch.publishMode) setters.setPublishMode(statePatch.publishMode)',
  'if (statePatch.settingAssets) setters.setSettingAssets(statePatch.settingAssets)',
])
for (const routeCommandFlowResidue of [
  "from './creatorEditorAssistantController'",
  "from './creatorEditorCommandController'",
  "from './creatorEditorCommandEventService'",
  "from './creatorEditorCommandPatchController'",
  "from './creatorEditorCandidateController'",
  "from './creatorEditorCandidatePatchController'",
  "from './creatorEditorUserActionController'",
  'resolveWritingCommand(command)',
  'resolveReviewFix(label)',
  'resolveEditorAssistAction(action, noticeOverride)',
  'resolveBranchExperimentDecision(label, decision)',
  'resolveStoryFlowStage(stage)',
  'resolveEditorCommandStatePatch({',
  'bindEditorCommandCandidateApply({',
  'bindEditorShortcut({',
  'resolveEditorCandidateAdoptionStatePatch(',
  'resolveEditorCandidateBranchStatePatch(',
  'resolveAssistantSuggestionAcceptance({',
  'resolveEditorAssistDismissal()',
  'resolveGuideStepSelection(',
  'resolveKeepAsIfBranchAction()',
  'resolveChapterDirectionSelection(direction)',
  'resolveChapterGoalConfirmation(',
  'resolveDraftGuideContinuation()',
]) {
  assert(!editorRoute.includes(routeCommandFlowResidue), `${editorRoutePath} must enter command/candidate/user-action flow through creatorEditorCommandFlowService instead of ${routeCommandFlowResidue}`)
}
assertIncludes(editorUserActionControllerPath, [
  'export interface CreatorEditorUserActionStatePatch',
  'export function resolveAssistantSuggestionAcceptance',
  'export function resolveEditorAssistDismissal',
  'export function resolveGuideStepSelection',
  'export function resolveKeepAsIfBranchAction',
  'writingGuideStepLabel(nextStep)',
  "guideStep: 'draft'",
  "publishMode: 'if'",
])
assertIncludes(editorDraftPatchControllerPath, [
  'export interface CreatorEditorDraftStatePatch',
  'export function resolveEditorDraftSaveStatePatch',
  'export function resolveEditorDraftOpenStatePatch',
  'export function resolveEditorFreshDraftStatePatch',
  'activeDraftRef: patch.activeDraftRef',
  'clearEditorAssistCandidate: patch.clearEditorAssistCandidate',
])
assertIncludes(editorCommandEventServicePath, [
  "from './creatorEditorAssistantController'",
  'export interface EditorCommandEventTarget',
  'export function bindEditorCommandCandidateApply',
  'export function bindEditorShortcut',
  'resolveCommandCandidateApply(detail)',
  'resolveEditorCommandCandidateStatePatch({',
  'resolveEditorShortcut({',
  'resolveEditorCommandStatePatch({',
])
assertIncludes(editorCommandFlowServicePath, [
  'export interface EditorCommandFlowContext',
  'export function resolveEditorCommandPatchFlow',
  'export function runEditorWritingCommandFlow',
  'export function runEditorReviewFixFlow',
  'export function runEditorAssistActionFlow',
  'export function runEditorBranchExperimentFlow',
  'export function runEditorStoryFlowStageFlow',
  'export function runEditorChapterDirectionSelectionFlow',
  'export function runEditorChapterGoalConfirmationFlow',
  'export function runEditorDraftGuideContinuationFlow',
  'export function resolveEditorAssistCandidateAdoptionFlow',
  'export function resolveEditorAssistCandidateBranchFlow',
  'export function resolveEditorAssistantSuggestionAcceptanceFlow',
  'export function resolveEditorAssistDismissalFlow',
  'export function resolveEditorGuideStepSelectionFlow',
  'export function resolveEditorKeepAsIfBranchFlow',
  'export function bindEditorCommandCandidateApplyFlow',
  'export function bindEditorShortcutFlow',
  'resolveEditorCommandStatePatch({',
  'resolveWritingCommand(command)',
  'resolveReviewFix(label)',
  'resolveEditorAssistAction(action, noticeOverride)',
  'resolveBranchExperimentDecision(label, decision)',
  'resolveStoryFlowStage(stage)',
  'resolveChapterDirectionSelection(direction)',
  'resolveChapterGoalConfirmation(direction)',
  'resolveDraftGuideContinuation()',
  'resolveEditorCandidateAdoptionStatePatch(',
  'resolveEditorCandidateBranchStatePatch(resolveEditorAssistCandidateBranch())',
  'resolveAssistantSuggestionAcceptance({',
  'resolveEditorAssistDismissal()',
  'resolveGuideStepSelection(nextStep)',
  'resolveKeepAsIfBranchAction()',
  'bindEditorCommandCandidateApply(input)',
  'bindEditorShortcut(input)',
])
assertIncludes(editorCommandPatchControllerPath, [
  'export interface CreatorEditorCommandStatePatch',
  'export function resolveEditorCommandStatePatch',
  'export function resolveEditorCommandCandidateStatePatch',
  'resolution: CreatorEditorCandidateApplyResolution | null',
  'buildEditorAssistCandidate({',
  'noticeForAssistAction(patch.assistAction)',
])
assertIncludes(editorCandidatePatchControllerPath, [
  'export interface CreatorEditorCandidateStatePatch',
  'export function resolveEditorCandidateAdoptionStatePatch',
  'export function resolveEditorCandidateBranchStatePatch',
  'clearEditorAssistCandidate: resolution.clearCandidate ? true : undefined',
  'commandPatch,',
])
assertIncludes(editorStartupPatchControllerPath, [
  'export interface CreatorEditorStartupStatePatch',
  'export function resolveEditorStartupStatePatch',
  'selectedWorkId: bootstrap.defaultDraft?.workId || currentSelectedWorkId || bootstrap.nextWorkId',
  "currentTitle === '新章节'",
  "currentBranchTitle === '读者 IF 支线' || currentBranchTitle === '主线'",
])
assertIncludes(editorSettingAssetServicePath, [
  'export interface EditorSettingAssetLoadPersistencePort',
  'export interface EditorSettingAssetPersistencePort',
  'export function runEditorSettingAssetLoad',
  'export function runEditorSettingAssetCapture',
  "from '@/local-db/creatorLocalSettingAssetRepository'",
  'readLocalSettingAssets',
  'upsertLocalSettingAsset',
  'persistence.readAll()',
  'persistence.save(draft.assetInput)',
])
assert(!read(editorSettingAssetServicePath).includes("@/lib/pmfSupabase"), `${editorSettingAssetServicePath} must use creatorLocalSettingAssetRepository instead of the Supabase facade`)
assertIncludes(editorSettingAssetPatchControllerPath, [
  'export interface CreatorEditorSettingAssetStatePatch',
  'export function resolveEditorSettingAssetStatePatch',
  'settingAssets: result.settingAssets',
  'guideStep: result.nextGuideStep',
])
assertIncludes(editorSettingAssetSubmitFlowServicePath, [
  'export interface EditorSettingAssetSubmitContext',
  'export function runEditorSettingAssetSubmitFlow',
  'runEditorSettingAssetCapture(buildEditorSettingCaptureInput(context))',
  'return resolveEditorSettingAssetStatePatch(result)',
])

const worksRoute = assertIncludes(worksRoutePath, [
  "from './creatorWorksActionFlowService'",
  "from './creatorWorksBrowserActionService'",
  "from './creatorWorksLoadService'",
  "from './creatorWorksRouteViewModels'",
  'scheduleCreatorWorksInitialLoad(load)',
  'runCreatorWorksLoad({',
  'resolveCreatorWorksSelection([work], branches, {',
  'createCreatorWorksRouteViewModel({',
  'runCreatorWorkNoticeFlow({',
  'runCreatorWorkHideFlow({',
  'runCreatorBranchArchiveFlow(branch)',
  'runCreatorIfBranchCreateFlow({',
])
const worksRouteViewModels = assertIncludes(worksRouteViewModelsPath, [
  'export interface CreatorWorksRouteViewModelInput',
  'export interface CreatorWorksRouteViewModel',
  'export interface CreatorWorksWorkRow',
  'export interface CreatorWorksBranchRow',
  'export function createCreatorWorksRouteViewModel',
  'function requestsForBranch(',
  'const selectedBranchDecisionSteps:',
  'const chaptersByBranch = new Map<string, PmfChapter[]>()',
  'const branchRows = selectedWorkBranches.map(',
  'const workRows = works.map(',
])
const worksBrowserActionService = assertIncludes(worksBrowserActionServicePath, [
  'export interface CreatorWorksBrowserPort',
  'export function scheduleCreatorWorksInitialLoad',
])
const worksLoadService = assertIncludes(worksLoadServicePath, [
  "from '@/lib/pmfSupabase'",
  'export interface CreatorWorksLoadApiPort',
  'export function resolveCreatorWorksSelection',
  'export async function runCreatorWorksLoad',
  'listWorks: listCreatorWorks',
  'listBranches: listCreatorBranches',
  'listChapters: listCreatorChapters',
  'listRequests: listCreatorRequests',
])
const worksActionService = assertIncludes(worksActionServicePath, [
  "from '@/lib/pmfSupabase'",
  'export interface CreatorWorksActionApiPort',
  'runCreatorWorkNoticeSave',
  'runCreatorWorkHide',
  'runCreatorBranchArchive',
  'runCreatorIfBranchCreate',
  'saveNotice: updateCreatorWorkNotice',
  "hideWork: workId => updateCreatorWorkStatus(workId, 'hidden')",
  "archiveBranch: branchId => updateCreatorBranchStatus(branchId, 'archived')",
  'createIfBranch: createCreatorIfBranch',
])
const worksActionFlowService = assertIncludes(worksActionFlowServicePath, [
  'export interface CreatorWorksActionFlowPort',
  'export interface CreatorWorksActionFlowResult',
  'export async function runCreatorWorkNoticeFlow',
  'export async function runCreatorWorkHideFlow',
  'export async function runCreatorBranchArchiveFlow',
  'export async function runCreatorIfBranchCreateFlow',
  'port.saveNotice(input.workId, input.authorNotice)',
  'port.hideWork(input.workId)',
  'port.archiveBranch(branch.id)',
  'port.createIfBranch({',
])
for (const worksRouteResidue of [
  'listCreatorWorks()',
  'listCreatorBranches()',
  'listCreatorChapters()',
  'listCreatorRequests()',
  'updateCreatorWorkNotice(',
  'updateCreatorWorkStatus(',
  'updateCreatorBranchStatus(',
  'createCreatorIfBranch({',
  'runCreatorWorkNoticeSave(',
  'runCreatorWorkHide(',
  'runCreatorBranchArchive(',
  'runCreatorIfBranchCreate(',
  'window.setTimeout',
  'window.clearTimeout',
  'requestCountForBranch(',
  'new Map<string, PmfChapter[]>',
  "request.status !== 'published'",
  "selectedBranch?.branch_type === 'if'",
  'branches.filter(branch => branch.work_id === work.id)',
]) {
  assert(!worksRoute.includes(worksRouteResidue), `${worksRoutePath} must delegate Works data/action behavior instead of ${worksRouteResidue}`)
}
for (const forbiddenWorksActionFlowDependency of [
  "from 'react'",
  'lucide-react',
  '@/components/',
  '@/local-db/',
  '@/lib/pmfSupabase',
  'window.',
  'document.',
  'fetch(',
  'navigate(',
]) {
  assert(!worksActionFlowService.includes(forbiddenWorksActionFlowDependency), `${worksActionFlowServicePath} must not include ${forbiddenWorksActionFlowDependency}`)
}
for (const forbiddenWorksViewModelDependency of [
  "from 'react'",
  'lucide-react',
  '@/components/',
  '@/local-db/',
  '@/lib/pmfSupabase',
  'window.',
  'document.',
  'fetch(',
  'navigate(',
]) {
  assert(!worksRouteViewModels.includes(forbiddenWorksViewModelDependency), `${worksRouteViewModelsPath} must not include ${forbiddenWorksViewModelDependency}`)
}
for (const forbiddenWorksServiceDependency of [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'useState',
  'useEffect',
  'navigate(',
  'window.',
]) {
  assert(!worksLoadService.includes(forbiddenWorksServiceDependency), `${worksLoadServicePath} must not include ${forbiddenWorksServiceDependency}`)
  assert(!worksActionService.includes(forbiddenWorksServiceDependency), `${worksActionServicePath} must not include ${forbiddenWorksServiceDependency}`)
  if (forbiddenWorksServiceDependency !== 'window.') {
    assert(!worksBrowserActionService.includes(forbiddenWorksServiceDependency), `${worksBrowserActionServicePath} must not include ${forbiddenWorksServiceDependency}`)
  }
}

const publishRoute = assertIncludes(publishRoutePath, [
  "from './creatorPublishBundleActionService'",
  "from './creatorPublishBundleBrowserActionService'",
  "from './creatorPublishBundleLoadService'",
  "from './creatorPublishBundleRouteEffectService'",
  'readCreatorPublishBundleRouteRefs(location.search)',
  'readCreatorPublishBundleLocalSnapshot(routeRefs)',
  'resolveCreatorPublishBundleRouteDraftRef(routeRefs, publishBundles)',
  'runCreatorPublishBundleContextEffect({',
  'runCreatorPublishBundleRouteDraftRefreshEffect(',
  'runCreatorPublishBundleManualRefreshEffect(',
  'runCreatorPreparePublishBundle(input)',
  'runCreatorReviewPublishBundle(activeBundle.id)',
  'runConfirmedCreatorBundleConfirmation(activeBundle.id',
  'runConfirmedCreatorBundleExport(activeBundle.id',
  'runConfirmedCreatorBundleSubmit(activeBundle.id',
  'scheduleCreatorPublishBundleContextLoad(loadContext)',
  'scheduleCreatorPublishBundleRouteDraftRefresh(async () =>',
])
const publishBundleLoadService = assertIncludes(publishBundleLoadServicePath, [
  "from '@/local-db/creatorLocalDraftRepository'",
  "from '@/local-db/creatorLocalPublishRepository'",
  'readDrafts: readLocalDrafts',
  'readPublishBundles: readLocalPublishBundles',
  'readPublishReceipts: readLocalPublishReceipts',
  'hydrate: hydrateLocalWorkspace',
  'listWorks: listCreatorWorks',
  'listBranches: listCreatorBranches',
  'listChapters: listCreatorChapters',
  'listRequests: listCreatorRequests',
  'getAuthorizationStatus: getCreatorAuthorizationStatus',
])
const publishBundleRouteEffectService = assertIncludes(publishBundleRouteEffectServicePath, [
  'export interface CreatorPublishBundleRouteEffectPort',
  'loadContext: typeof runCreatorPublishBundleContextLoad',
  'loadLocal: typeof runCreatorPublishBundleLocalLoad',
  'export async function runCreatorPublishBundleContextEffect',
  'export async function runCreatorPublishBundleRouteDraftRefreshEffect',
  'export async function runCreatorPublishBundleManualRefreshEffect',
])
const publishBundleActionService = assertIncludes(publishBundleActionServicePath, [
  'submitBundle: publishOwnPlatformBundle',
  'export async function runCreatorPreparePublishBundle',
  'export async function runCreatorReviewPublishBundle',
  'export function runConfirmedCreatorBundleConfirmation',
  'export function runConfirmedCreatorBundleExport',
  'export function runConfirmedCreatorBundleSubmit',
])
const publishBundleBrowserActionService = assertIncludes(publishBundleBrowserActionServicePath, [
  'export interface CreatorPublishBundleBrowserPort',
  'export function scheduleCreatorPublishBundleContextLoad',
  'export function scheduleCreatorPublishBundleRouteDraftRefresh',
])
for (const publishRouteResidue of [
  "from '@/local-db/creatorLocalDraftRepository'",
  "from '@/local-db/creatorLocalPublishRepository'",
  'listCreatorWorks()',
  'listCreatorBranches()',
  'listCreatorChapters()',
  'listCreatorRequests()',
  'getCreatorAuthorizationStatus()',
  'publishOwnPlatformBundle({',
  'runCreatorPublishBundleContextLoad(',
  'runCreatorPublishBundleLocalLoad(',
  'window.setTimeout',
  'window.clearTimeout',
]) {
  assert(!publishRoute.includes(publishRouteResidue), `${publishRoutePath} must delegate Publish data/action behavior instead of ${publishRouteResidue}`)
}
for (const forbiddenPublishServiceDependency of [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'useState',
  'useEffect',
  'navigate(',
  'window.',
]) {
  assert(!publishBundleLoadService.includes(forbiddenPublishServiceDependency), `${publishBundleLoadServicePath} must not include ${forbiddenPublishServiceDependency}`)
  assert(!publishBundleRouteEffectService.includes(forbiddenPublishServiceDependency), `${publishBundleRouteEffectServicePath} must not include ${forbiddenPublishServiceDependency}`)
  assert(!publishBundleActionService.includes(forbiddenPublishServiceDependency), `${publishBundleActionServicePath} must not include ${forbiddenPublishServiceDependency}`)
  if (forbiddenPublishServiceDependency !== 'window.') {
    assert(!publishBundleBrowserActionService.includes(forbiddenPublishServiceDependency), `${publishBundleBrowserActionServicePath} must not include ${forbiddenPublishServiceDependency}`)
  }
}

const settingsRoute = assertIncludes(settingsRoutePath, [
  "from './creatorSettingsActionService'",
  "from './creatorSettingsBrowserActionService'",
  "from './creatorSettingsLoadService'",
  "from './creatorSettingsRouteViewModels'",
  "from './creatorSettingsWorkspaceExportFlowService'",
  'applyCreatorSettingsDisplayPreferences(preferences)',
  'runCreatorSettingsWorkspaceExport(preferences)',
  'readCreatorSettingsLocalSnapshot',
  'runCreatorSettingsLoad',
  'createCreatorSettingsRouteViewModel({',
  'saveCreatorWorkspacePreferences(preferences)',
  'clearCreatorWorkspacePreferences()',
  'summaryItems={workspaceSummaryItems}',
])
const settingsRouteViewModels = assertIncludes(settingsRouteViewModelsPath, [
  'export type CreatorSettingsPhase',
  'export interface CreatorSettingsRouteViewModelInput',
  'export interface CreatorSettingsRouteViewModel',
  'export function createCreatorSettingsRouteViewModel',
  'const flagMap = new Map(',
  'const readinessItems:',
  'const settingsStatusItems:',
  'const settingsFlagItems:',
  'const workspaceSummaryItems:',
  'workspaceSnapshot.readerSignals.length',
  'const operationItems =',
  'const permissionItems:',
])
const settingsBrowserActionService = assertIncludes(settingsBrowserActionServicePath, [
  'export interface CreatorSettingsBrowserPort',
  'export interface CreatorSettingsBrowserTimerPort',
  'export function applyCreatorSettingsDisplayPreferences',
  'export function downloadCreatorWorkspacePackage',
  'export function scheduleCreatorSettingsActionReset',
  'export function scheduleCreatorSettingsRouteEffect',
  'document.documentElement.dataset',
  'URL.createObjectURL',
  'URL.revokeObjectURL',
  'new Blob',
])
const settingsWorkspaceExportFlowService = assertIncludes(settingsWorkspaceExportFlowServicePath, [
  'export interface CreatorSettingsWorkspaceExportFlowPort',
  'export async function runCreatorSettingsWorkspaceExport',
  'readWorkspaceSnapshot: readCreatorSettingsWorkspaceSnapshot',
  'buildWorkspacePackage: buildLocalWorkspacePackage',
  'downloadWorkspacePackage: downloadCreatorWorkspacePackage',
  'const snapshot = await port.readWorkspaceSnapshot()',
  'const exportedAt = port.nowIso()',
])
const settingsLoadService = assertIncludes(settingsLoadServicePath, [
  "from '@/lib/pmfSupabase'",
  "from '@/local-db/creatorLocalSettingsRepository'",
  "from '@/local-db/creatorLocalWorkspaceRepository'",
  'export interface CreatorSettingsLoadApiPort',
  'export interface CreatorSettingsLocalReadPort',
  'export function readCreatorSettingsLocalSnapshot',
  'export async function runCreatorSettingsLoad',
  'syncClient: syncCreatorClient',
  'getAuthorizationStatus: getCreatorAuthorizationStatus',
  'listFeatureFlags: listCreatorFeatureFlags',
  'readDisplayPreferences: readCreatorDisplayPreferences',
  'hydrateWorkspace: hydrateLocalWorkspace',
  'readWorkspaceSnapshot: readLocalWorkspaceSnapshot',
  'readHydratedCreatorSettingsLocalState(local)',
])
const settingsHydrationService = assertIncludes(settingsHydrationServicePath, [
  'export interface CreatorSettingsHydrationPort',
  'export async function readHydratedCreatorSettingsLocalState',
  'await local.hydrateWorkspace()',
  'local.readDisplayPreferences()',
  'local.readWritingAssistPreferences()',
  'local.readWorkspaceSnapshot()',
])
const settingsActionService = assertIncludes(settingsActionServicePath, [
  "from '@/local-db/creatorLocalSettingsRepository'",
  "from '@/local-db/creatorLocalWorkspaceRepository'",
  'export function saveCreatorWorkspacePreferences',
  'export function clearCreatorWorkspacePreferences',
  'export async function readCreatorSettingsWorkspaceSnapshot',
  'writeDisplayPreferences: writeCreatorDisplayPreferences',
  'hydrateWorkspace: hydrateLocalWorkspace',
  'readWorkspaceSnapshot: readLocalWorkspaceSnapshot',
  'await port.hydrateWorkspace()',
])
assertIncludes(localWorkspacePackagePath, [
  'export async function buildLocalWorkspacePackage',
  'export async function previewLocalWorkspacePackage',
  'export async function applyLocalWorkspacePackage',
  'export async function rollbackLocalWorkspaceImport',
  'importRecordFingerprints',
])
for (const forbiddenSettingsServiceDependency of [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
]) {
  assert(!settingsLoadService.includes(forbiddenSettingsServiceDependency), `${settingsLoadServicePath} must not include ${forbiddenSettingsServiceDependency}`)
  assert(!settingsHydrationService.includes(forbiddenSettingsServiceDependency), `${settingsHydrationServicePath} must not include ${forbiddenSettingsServiceDependency}`)
  assert(!settingsActionService.includes(forbiddenSettingsServiceDependency), `${settingsActionServicePath} must not include ${forbiddenSettingsServiceDependency}`)
  assert(!settingsBrowserActionService.includes(forbiddenSettingsServiceDependency), `${settingsBrowserActionServicePath} must not include ${forbiddenSettingsServiceDependency}`)
  assert(!settingsWorkspaceExportFlowService.includes(forbiddenSettingsServiceDependency), `${settingsWorkspaceExportFlowServicePath} must not include ${forbiddenSettingsServiceDependency}`)
}
for (const forbiddenSettingsRouteExportOwnership of [
  'buildLocalWorkspacePackage({',
  'readCreatorSettingsWorkspaceSnapshot()',
  'downloadCreatorWorkspacePackage(',
  'new Date(',
]) {
  assert(!settingsRoute.includes(forbiddenSettingsRouteExportOwnership), `${settingsRoutePath} must delegate workspace export instead of ${forbiddenSettingsRouteExportOwnership}`)
}
for (const retiredSettingsActionBrowserOwnership of [
  'CreatorSettingsActionResetPort',
  'scheduleCreatorSettingsActionReset',
  'scheduleCreatorSettingsRouteEffect',
  'window.',
]) {
  assert(!settingsActionService.includes(retiredSettingsActionBrowserOwnership), `${settingsActionServicePath} must not own browser scheduling ${retiredSettingsActionBrowserOwnership}`)
}
for (const routeSettingsResidue of [
  "from '@/local-db/creatorLocalSettingsRepository'",
  "from '@/local-db/creatorLocalWorkspaceRepository'",
  "from '@/lib/pmfSupabase'",
  'readLocalWorkspaceSnapshot()',
  'readLocalAiSettings()',
  'readCreatorDisplayPreferences()',
  'writeLocalAiSettings(',
  'writeCreatorDisplayPreferences(',
  'syncCreatorClient()',
  'getCreatorAuthorizationStatus()',
  'listCreatorFeatureFlags()',
  'fetch(',
  'document.',
  'URL.createObjectURL',
  'URL.revokeObjectURL',
  'new Blob',
  'const flagMap = new Map(',
  'function flagLabel(',
  'function flagState(',
  'workspaceSnapshot.operationRecords.slice(',
  'workspaceSummaryItems.reduce(',
  'creatorAgentActions.filter(',
]) {
  assert(!settingsRoute.includes(routeSettingsResidue), `${settingsRoutePath} must delegate Local Workspace loading/actions instead of ${routeSettingsResidue}`)
}
for (const settingsViewModelDependency of [
  "from 'react'",
  'lucide-react',
  '@/components/',
  '@/local-db/',
  '@/lib/pmfSupabase',
  'window.',
  'document.',
  'fetch(',
  'navigate(',
]) {
  assert(!settingsRouteViewModels.includes(settingsViewModelDependency), `${settingsRouteViewModelsPath} must not include ${settingsViewModelDependency}`)
}

for (const [source, sourcePath, marker] of [
  [dashboardLoadService, dashboardLoadServicePath, 'export interface CreatorDashboardLocalSnapshot'],
  [dashboardLoadService, dashboardLoadServicePath, 'export type RunCreatorDashboardLoadResult'],
  [worksLoadService, worksLoadServicePath, 'export type RunCreatorWorksLoadResult'],
  [settingsLoadService, settingsLoadServicePath, 'export interface CreatorSettingsLocalSnapshot'],
  [settingsLoadService, settingsLoadServicePath, 'export type RunCreatorSettingsLoadResult'],
  [publishBundleLoadService, publishBundleLoadServicePath, 'export interface CreatorPublishBundleLocalSnapshot'],
  [publishBundleLoadService, publishBundleLoadServicePath, 'export type RunCreatorPublishBundleContextLoadResult'],
]) {
  assert(!source.includes(marker), `${sourcePath} must keep inferred route-service snapshot/result detail private: ${marker}`)
}

const app = assertIncludes(appPath, [
  '<CreatorEditorRoute />',
])
assert(!app.includes('publishChapter({'), `${appPath} must not call publishChapter directly after S7 publish-bundle cutover`)
assert(!dashboardRoute.includes('publishChapter({'), `${dashboardRoutePath} must not call publishChapter directly`)
assert(!echoRoute.includes('publishChapter({'), `${echoRoutePath} must not call publishChapter directly`)
assert(!editorRoute.includes('publishChapter({'), `${editorRoutePath} must not call publishChapter directly`)
assert(!worksRoute.includes('publishChapter({'), `${worksRoutePath} must not call publishChapter directly`)
assert(!publishRoute.includes('publishChapter({'), `${publishRoutePath} must not call publishChapter directly`)
assert(!settingsRoute.includes('publishChapter({'), `${settingsRoutePath} must not call publishChapter directly`)
assert(bundleAdapter.includes('publishBundleTransaction(input)'), `${bundleAdapterPath} must own the server publish transaction call`)

const packageJson = JSON.parse(read(packagePath))
for (const script of [
  'check:creator-data-map',
  'check:no-production-mock-data',
  'check:creator-product-boundary',
]) {
  assert(packageJson.scripts?.[script], `${packagePath} must expose ${script}`)
}

console.log('[creator-data-map] PASS')
