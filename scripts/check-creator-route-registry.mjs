#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const failures = []

function read(path) {
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) {
    failures.push(`Missing ${path}`)
    return ''
  }
  return readFileSync(absolute, 'utf8')
}

function requireAll(path, markers) {
  const body = read(path)
  for (const marker of markers) {
    if (!body.includes(marker)) failures.push(`${path} missing ${marker}`)
  }
}

function forbidAll(path, markers) {
  const body = read(path)
  for (const marker of markers) {
    if (body.includes(marker)) failures.push(`${path} must not include ${marker}`)
  }
}

const registryPath = 'app/src/apps/creator/creatorRouteRegistry.ts'
const creatorPath = 'app/src/apps/creator/LocalCreatorApp.tsx'
const creatorSessionServicePath = 'app/src/apps/creator/creatorSessionService.ts'
const dashboardRoutePath = 'app/src/apps/creator/routes/CreatorDashboardRoute.tsx'
const dashboardBrowserActionServicePath = 'app/src/apps/creator/routes/creatorDashboardBrowserActionService.ts'
const dashboardLoadServicePath = 'app/src/apps/creator/routes/creatorDashboardLoadService.ts'
const dashboardRouteEffectServicePath = 'app/src/apps/creator/routes/creatorDashboardRouteEffectService.ts'
const dashboardReactPatchApplierPath = 'app/src/apps/creator/routes/creatorDashboardReactPatchApplier.ts'
const dashboardRouteViewModelsPath = 'app/src/apps/creator/routes/creatorDashboardRouteViewModels.ts'
const dashboardNextStepsPanelPath = 'app/src/components/creator/CreatorTodayNextStepsPanel.tsx'
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
const editorCandidateControllerPath = 'app/src/apps/creator/routes/creatorEditorCandidateController.ts'
const editorCandidatePatchControllerPath = 'app/src/apps/creator/routes/creatorEditorCandidatePatchController.ts'
const editorStartupPatchControllerPath = 'app/src/apps/creator/routes/creatorEditorStartupPatchController.ts'
const editorStartupDataPatchControllerPath = 'app/src/apps/creator/routes/creatorEditorStartupDataPatchController.ts'
const editorReactPatchApplierPath = 'app/src/apps/creator/routes/creatorEditorReactPatchApplier.ts'
const editorUserActionControllerPath = 'app/src/apps/creator/routes/creatorEditorUserActionController.ts'
const editorStartupEffectServicePath = 'app/src/apps/creator/routes/creatorEditorStartupEffectService.ts'
const editorStartupLoadServicePath = 'app/src/apps/creator/routes/creatorEditorStartupLoadService.ts'
const editorDraftControllerPath = 'app/src/apps/creator/routes/creatorEditorDraftController.ts'
const editorDraftActionControllerPath = 'app/src/apps/creator/routes/creatorEditorDraftActionController.ts'
const editorDraftActionServicePath = 'app/src/apps/creator/routes/creatorEditorDraftActionService.ts'
const editorDraftActionFlowServicePath = 'app/src/apps/creator/routes/creatorEditorDraftActionFlowService.ts'
const editorDraftSubmitFlowServicePath = 'app/src/apps/creator/routes/creatorEditorDraftSubmitFlowService.ts'
const editorDraftActionResetServicePath = 'app/src/apps/creator/routes/creatorEditorDraftActionResetService.ts'
const editorDraftPatchControllerPath = 'app/src/apps/creator/routes/creatorEditorDraftPatchController.ts'
const editorDraftPersistencePath = 'app/src/apps/creator/routes/creatorEditorDraftPersistence.ts'
const editorDraftLoadServicePath = 'app/src/apps/creator/routes/creatorEditorDraftLoadService.ts'
const editorDraftSaveServicePath = 'app/src/apps/creator/routes/creatorEditorDraftSaveService.ts'
const editorPublishHandoffPath = 'app/src/apps/creator/routes/creatorEditorPublishHandoffController.ts'
const editorPublishHandoffServicePath = 'app/src/apps/creator/routes/creatorEditorPublishHandoffService.ts'
const editorPublishCheckServicePath = 'app/src/apps/creator/routes/creatorEditorPublishCheckService.ts'
const publishBundleDraftHandoffPath = 'app/src/features/creator-pivot/publishBundleDraftHandoff.ts'
const editorReminderServicePath = 'app/src/apps/creator/routes/creatorEditorReminderService.ts'
const editorRecallViewModelsPath = 'app/src/apps/creator/routes/creatorEditorRecallViewModels.ts'
const editorConversationSettingServicePath = 'app/src/apps/creator/routes/creatorEditorConversationSettingService.ts'
const editorDecisionContextAdapterPath = 'app/src/apps/creator/routes/creatorEditorDecisionContextAdapter.ts'
const editorDecisionWorkbenchHookPath = 'app/src/apps/creator/routes/useCreatorEditorDecisionWorkbench.ts'
const creatorConversationWorkspacePath = 'app/src/components/creator/workspace/CreatorConversationWorkspace.tsx'
const creatorConversationTimelinePath = 'app/src/components/creator/workspace/CreatorConversationTimeline.tsx'
const creatorRecallRailPath = 'app/src/components/creator/workspace/CreatorRecallRail.tsx'
const localDraftRepositoryPath = 'app/src/local-db/creatorLocalDraftRepository.ts'
const localSettingAssetRepositoryPath = 'app/src/local-db/creatorLocalSettingAssetRepository.ts'
const localSettingsRepositoryPath = 'app/src/local-db/creatorLocalSettingsRepository.ts'
const legacyToolSettingsPath = 'app/src/local-db/legacyCreatorToolSettings.ts'
const localReaderSignalRepositoryPath = 'app/src/local-db/creatorLocalReaderSignalRepository.ts'
const localWritingRepositoryPath = 'app/src/local-db/creatorLocalWritingRepository.ts'
const localWorkspaceRepositoryPath = 'app/src/local-db/creatorLocalWorkspaceRepository.ts'
const editorSettingAssetControllerPath = 'app/src/apps/creator/routes/creatorEditorSettingAssetController.ts'
const editorSettingAssetServicePath = 'app/src/apps/creator/routes/creatorEditorSettingAssetService.ts'
const editorSettingAssetPatchControllerPath = 'app/src/apps/creator/routes/creatorEditorSettingAssetPatchController.ts'
const editorSettingAssetSubmitFlowServicePath = 'app/src/apps/creator/routes/creatorEditorSettingAssetSubmitFlowService.ts'
const editorRailsPath = 'app/src/apps/creator/routes/CreatorEditorRails.tsx'
const publishRoutePath = 'app/src/apps/creator/routes/CreatorPublishBundleRoute.tsx'
const publishBundleActionServicePath = 'app/src/apps/creator/routes/creatorPublishBundleActionService.ts'
const publishBundleBrowserActionServicePath = 'app/src/apps/creator/routes/creatorPublishBundleBrowserActionService.ts'
const publishBundleLoadServicePath = 'app/src/apps/creator/routes/creatorPublishBundleLoadService.ts'
const publishBundleRouteEffectServicePath = 'app/src/apps/creator/routes/creatorPublishBundleRouteEffectService.ts'
const publishBundleRouteViewModelsPath = 'app/src/apps/creator/routes/creatorPublishBundleRouteViewModels.ts'
const publishLifecycleViewModelsPath = 'app/src/apps/creator/routes/creatorPublishLifecycleViewModels.ts'
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
const creatorFramePath = 'app/src/components/creator/CreatorAppFrame.tsx'
const creatorFrameBoundaryServicePath = 'app/src/components/creator/creatorFrameBoundaryService.ts'

requireAll(registryPath, [
  'creatorLegacyRoutes',
  'creatorPivotRoutes',
  'resolveCreatorPageCopy',
  'getCreatorLegacyNavItems',
  'getCreatorPivotNavItems',
  'getCreatorPivotRouteAliases',
  'resolveCreatorLegacyPath',
  'resolveCreatorActivePivotHref',
  'defaultPivotHrefByLegacyPath',
  'today_path',
  'external_echo',
  'inspiration_to_draft',
  'local_writing_library',
  'writing_desk',
  'publish_bundle',
  'local_workspace',
])

requireAll(registryPath, [
  '今日',
  '外界回声',
  '写作台',
  '作品与支线',
  '发布包',
  '本机工作区',
])

requireAll(registryPath, [
  '今日创作路径',
  '外界回声',
  '灵感到正文',
  '本机写作智库',
  '发布包',
  '本机工作区',
])

requireAll(creatorFramePath, [
  'getCreatorPivotNavItems',
  'resolveCreatorLegacyPath',
  'const pageCopy = resolveCreatorPageCopy(activePath)',
  'const navItems = getCreatorPivotNavItems(activePath)',
  'detectCreatorLocalSurface()',
  'signOutCreatorSession()',
  'bindCreatorFrameShortcuts({',
  'dispatchCreatorCommandCandidateApply(detail)',
  'navItems={navItems}',
  '<CreatorShell',
])
requireAll(creatorFrameBoundaryServicePath, [
  "from '@/lib/pmfSupabase'",
  "from '@/local-db/creatorLocalSettingsRepository'",
  'export function detectCreatorLocalSurface',
  'export function signOutCreatorSession',
  'export function bindCreatorFrameShortcuts',
  'export function dispatchCreatorCommandCandidateApply',
])
forbidAll(creatorFramePath, [
  "from '@/lib/pmfSupabase'",
  "from '@/local-db/creatorLocalSettingsRepository'",
  'window.addEventListener',
  'window.removeEventListener',
  'window.dispatchEvent',
  'new CustomEvent(',
])

requireAll(creatorPath, [
  "import { getCreatorPivotRouteAliases } from './creatorRouteRegistry'",
  "from './creatorSessionService'",
  'readCreatorSession()',
  'scheduleCreatorSessionRefresh(refresh)',
  'sendCreatorLoginLink(email)',
  "import { CreatorDashboardRoute } from './routes/CreatorDashboardRoute'",
  "import { CreatorEchoRoute } from './routes/CreatorEchoRoute'",
  "import { CreatorEditorRoute } from './routes/CreatorEditorRoute'",
  "import { CreatorPublishBundleRoute } from './routes/CreatorPublishBundleRoute'",
  "import { CreatorWorksRoute } from './routes/CreatorWorksRoute'",
  "import { CreatorSettingsRoute } from './routes/CreatorSettingsRoute'",
  "from '@/components/creator/CreatorAppFrame'",
  '<CreatorFrame session={session} refreshSession={refresh}>',
  'const creatorPageElements: Record<string, ReactNode>',
  "'/creator': <CreatorDashboardRoute />",
  "'/creator/requests': <CreatorEchoRoute />",
  "'/creator/editor': <CreatorEditorRoute />",
  "'/creator/works': <CreatorWorksRoute />",
  "'/creator/publish': <CreatorPublishBundleRoute />",
  "'/creator/settings': <CreatorSettingsRoute />",
  'const pivotRouteAliases = getCreatorPivotRouteAliases()',
  'pivotRouteAliases.map(route =>',
  'creatorPageElements[route.legacyHref]',
])
requireAll(creatorSessionServicePath, [
  "from '@/lib/pmfSupabase'",
  'export interface CreatorSessionState',
  'export interface CreatorSessionApiPort',
  'export interface CreatorSessionSchedulePort',
  'export async function readCreatorSession',
  'export function sendCreatorLoginLink',
  'export function scheduleCreatorSessionRefresh',
  'getSession: getPmfSession',
  'sendMagicLink: sendCreatorMagicLink',
  'upsertProfile: upsertCreatorProfile',
])
forbidAll(creatorPath, [
  "from '@/lib/pmfSupabase'",
  'getPmfSession()',
  'sendCreatorMagicLink(',
  'upsertCreatorProfile(',
  'window.setTimeout',
  'window.clearTimeout',
])
forbidAll(creatorSessionServicePath, [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
])

requireAll(dashboardRoutePath, [
  'export function CreatorDashboardRoute',
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
  'CreatorTodayNextStepsPanel',
  'CreatorDashboardPriorityPanel',
  'CreatorWorkReadinessPanel',
])
requireAll(dashboardNextStepsPanelPath, [
  'export function CreatorTodayNextStepsPanel',
  '今天最值得推进的 3 件事',
  'data-slot="creator-today-next-steps-panel"',
])
requireAll(dashboardBrowserActionServicePath, [
  'export interface CreatorDashboardBrowserPort',
  'export function scheduleCreatorDashboardInitialLoad',
])
requireAll(dashboardLoadServicePath, [
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
requireAll(dashboardRouteEffectServicePath, [
  "import { runCreatorDashboardLoad } from './creatorDashboardLoadService'",
  'export interface CreatorDashboardRouteEffectPort',
  'load: runCreatorDashboardLoad',
  'export async function runCreatorDashboardSyncEffect',
  'const result = await port.load()',
])
requireAll(dashboardReactPatchApplierPath, [
  "from './creatorDashboardRouteEffectService'",
  'export interface CreatorDashboardRouteStatePatchSetters',
  'export function applyCreatorDashboardRouteStatePatchToReact',
  'setters.setClientStatus(statePatch.clientStatus)',
  'setters.setPhase(statePatch.phase)',
  'setters.setNotice(statePatch.notice)',
])
requireAll(dashboardRouteViewModelsPath, [
  'export interface CreatorDashboardRouteViewModelInput',
  'export interface CreatorDashboardRouteViewModel',
  'export function createCreatorDashboardRouteViewModel',
  '.sort(byRequestPriority)',
  '.sort(byNewestDraft)',
  'isDraftReadyForPublish',
])
forbidAll(dashboardLoadServicePath, [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
])
forbidAll(dashboardRouteEffectServicePath, [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'window.',
  'navigate(',
])
forbidAll(dashboardReactPatchApplierPath, [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'window.',
  'navigate(',
])
forbidAll(dashboardRouteViewModelsPath, [
  'from \'react\'',
  'from "react"',
  '@/components/',
  '@/local-db/',
  '@/lib/pmfSupabase',
  'window.',
  'document.',
  'fetch(',
  'navigate(',
])
forbidAll(dashboardRoutePath, [
  "from '@/local-db/creatorLocalDraftRepository'",
  'syncCreatorClient()',
  'listCreatorRequests()',
  'listCreatorWorks()',
  'listCreatorBranches()',
  'listCreatorChapters()',
  'listCreatorPublishEvents()',
  'readLocalDrafts()',
  'runCreatorDashboardLoad()',
  'byNewestDraft',
  'byRequestPriority',
  'isDraftReadyForPublish',
])

requireAll(echoRoutePath, [
  'export function CreatorEchoRoute',
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
  '外界回声',
  'CreatorEchoStatusStrip',
  'CreatorEchoNextActionPanel',
  'CreatorEchoDecisionPanel',
  'CreatorEchoWritingRail',
  'CreatorExternalEchoInboxCard',
  'CreatorExternalEchoDetailPanel',
])
requireAll(echoRouteViewModelsPath, [
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
forbidAll(echoRouteViewModelsPath, [
  "from 'react'",
  'lucide-react',
  '@/components/',
  '@/lib/pmfSupabase',
  "from '@/local-db/creator",
  'window.',
  'document.',
  'fetch(',
  'navigate(',
])

requireAll(echoLoadServicePath, [
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
  'hydrate: hydrateCreatorLocalRepository',
])
forbidAll(echoLoadServicePath, [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
])

requireAll(echoActionServicePath, [
  'export interface CreatorEchoStatusApiPort',
  'export interface CreatorEchoReminderPort',
  'export async function runCreatorEchoStatusUpdate',
  'export async function runCreatorEchoStartWriting',
  'export async function runCreatorEchoReminderAction',
  'updateStatus: updateReaderRequestStatus',
  "pin: request => upsertLocalCreativeReminder({ request, status: 'pinned' })",
  'readAll: readLocalCreativeReminders',
  "runCreatorEchoStatusUpdate(currentRequest, 'acknowledged'",
  "runCreatorEchoStatusUpdate(currentRequest, 'in_progress'",
  'creatorFacingNotice(result.message)',
  'notice: `回声已更新为「${requestStatusLabel(result.data.status)}」。`',
  'notice: `创作提醒已更新为「${creativeReminderStatusLabel(updated.status)}」。`',
])
forbidAll(echoRoutePath, [
  '回声已更新为「${requestStatusLabel(',
  '创作提醒已更新为「${creativeReminderStatusLabel(',
])
forbidAll(dashboardRoutePath, [
  'window.setTimeout',
  'window.clearTimeout',
  'buildRequestClusterCounts(requests)',
  'resolveVisibleEchoSignals(readerSignals, creativeReminders, {',
  'resolveReminderForSignal(',
  'resolveRequestForSignal(',
  'const savedViews:',
  'new Map(works.map(',
])
forbidAll(dashboardBrowserActionServicePath, [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
])
forbidAll(echoActionServicePath, [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
])

requireAll(echoBrowserActionServicePath, [
  'export interface CreatorEchoBrowserPort',
  'export function scheduleCreatorEchoInitialLoad',
  'export function scheduleCreatorEchoActionReset',
  'export function scheduleCreatorEchoVisibilityRefresh',
  'export function subscribeCreatorEchoWorkspaceRefresh',
  'export function openCreatorEchoReaderPerspective',
  'port.open(url, \'_blank\', \'noopener,noreferrer\')',
])
forbidAll(echoBrowserActionServicePath, [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
])

requireAll(echoControllerPath, [
  'export function requestIntentLabel',
  'function requestSceneSeed',
  'export function requestAuthorDecision',
  'export function requestWritingQuestion',
  'function requestClusterKey',
  'export function buildRequestClusterCounts',
  'export function canMoveRequestStatus',
  'export function buildSelectedEchoDecisionCards',
])
requireAll(echoSignalViewModelsPath, [
  'export function resolveVisibleEchoSignals',
  'export function buildEchoSignalViewCounts',
  'export function buildEchoSourceRows',
  'export function resolvePriorityEchoSignal',
  'export function buildEchoSignalViewModel',
])
forbidAll(echoControllerPath, [
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
  'from \'react\'',
  'from "react"',
  'useState',
  'useEffect',
  'window.',
  'localStorage',
  'fetch(',
  '@/lib/pmfSupabase',
  '@/local-db/',
  '@/components/',
  'navigate(',
  'export function requestSceneSeed',
  'export function requestClusterKey',
])
forbidAll(echoSignalViewModelsPath, [
  'readerSignalTypeLabel',
  'from \'react\'',
  'from "react"',
  'useState',
  'useEffect',
  'window.',
  'localStorage',
  'fetch(',
  '@/lib/pmfSupabase',
  '@/local-db/creatorLocalRepository',
  '@/components/',
  'navigate(',
  'export interface EchoSignalFilterState',
])
forbidAll(echoActionServicePath, [
  'export type RunCreatorEchoStatusResult',
  'export type RunCreatorEchoStartWritingResult',
  'export type RunCreatorEchoReminderActionResult',
])
forbidAll(echoBrowserActionServicePath, [
  'export type CreatorEchoReaderPerspectiveResult',
])
forbidAll(echoLoadServicePath, [
  'export type RunCreatorEchoLoadResult',
])
forbidAll(echoRoutePath, [
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
  'function requestIntentLabel',
  'function requestSceneSeed',
  'function requestAuthorDecision',
  'function requestWritingQuestion',
  'function requestNextStepLabel',
  'function sortRequests',
  'function savedViewMatches',
  'function buildRequestClusterCounts',
  'function requestActionHint',
])

const canonicalConversationalEditor = read(editorRoutePath).includes('CreatorConversationWorkspace')

requireAll(editorRoutePath, [
  'export function CreatorEditorRoute',
	  "from './creatorEditorDestinationController'",
	  "from './creatorEditorAgentExecutionService'",
	  "from './creatorEditorRouteController'",
  "from './creatorEditorReactPatchApplier'",
  "from './creatorEditorStartupEffectService'",
  "from './creatorEditorStartupDataPatchController'",
  "from './creatorEditorStartupLoadService'",
  "from './creatorEditorSelectionController'",
	  'readEditorStartupLocalSnapshot()',
	  'readCreatorEditorRouteQuery(location.search)',
  'scheduleEditorStartupEffect(() => {',
  'runEditorStartupEffect({',
	  'resolveEditorStartupDataPatch(startupResult)',
	  'resolveEditorSelectedRequest({',
	  'resolveEditorDestinationContext({',
	  'runEditorDraftSaveThroughAgent({',
	  'runEditorPublishCheckThroughAgent({',
  'applyEditorDraftStatePatchToReact',
  'applyEditorStartupDataPatchToReact',
  'applyEditorStartupStatePatchToReact',
	])
if (canonicalConversationalEditor) {
  requireAll(editorRoutePath, [
    "from '@/components/creator/workspace/CreatorConversationWorkspace'",
    "from './creatorEditorRecallViewModels'",
    "from './creatorEditorConversationSettingService'",
    "from './useCreatorEditorDecisionWorkbench'",
    'buildCreatorRecallCandidates({',
    'recommendedCreatorRecallIds(recallCandidates)',
    'resolveManualRecallItems(recallCandidates, appliedRecallIds)',
    'useCreatorEditorDecisionWorkbench({',
    'manualRecallItems,',
    'runConversationSettingCapture({',
    '<CreatorConversationWorkspace',
    'decision.actions.proposeIntent(chapterSeed.storySeed)',
    'decision.actions.lockIntent()',
    'decision.actions.searchCandidates()',
    'decision.actions.generateScene()',
    'decision.actions.adoptPreviewDraft()',
    'decision.actions.reviewDraft(lensIds)',
    'decision.actions.confirmCanon()',
  ])
  forbidAll(editorRoutePath, [
    'CreatorWritingWorkspaceFrame',
    "from './CreatorEditorRails'",
    "from './creatorEditorWorkspaceViewModelController'",
    "from './creatorEditorSessionViewModels'",
    "from './creatorEditorCommandFlowService'",
    "from './creatorEditorSettingAssetSubmitFlowService'",
    'rightRail={(',
    'creator-editor-assist-panel-rail',
  ])
} else {
  requireAll(editorRoutePath, [
    'CreatorWritingWorkspaceFrame',
    "from './CreatorEditorRails'",
    "from './creatorEditorWorkspaceViewModelController'",
    "from './creatorEditorSessionViewModels'",
    "from './creatorEditorCommandFlowService'",
    "from './creatorEditorDraftController'",
    "from './creatorEditorDraftPatchController'",
    "from './creatorEditorSettingAssetSubmitFlowService'",
    'resolveEditorLinkedCreativeReminder({',
    'buildEditorWorkspaceViewModel({',
    'runEditorSettingAssetSubmitFlow({',
    'buildEditorSessionGroups({',
    'buildEditorPrivateDraftItems({',
    'runEditorDraftOpenThroughAgent(draft)',
    'resolveEditorFreshDraftStatePatch(resolveFreshEditorDraft())',
    'resolveEditorCommandPatchFlow({',
    'bindEditorCommandCandidateApplyFlow({',
    'bindEditorShortcutFlow({',
    'applyEditorCommandStatePatchToReact',
    'applyEditorCandidateStatePatchToReact',
    'applyEditorUserActionStatePatchToReact',
    'runEditorAssistCandidateAdoptionThroughAgent({',
    'resolveEditorAssistCandidateBranchFlow()',
    'resolveEditorAssistantSuggestionAcceptanceFlow({',
    'resolveEditorAssistDismissalFlow()',
    'resolveEditorGuideStepSelectionFlow(nextStep)',
    'resolveEditorKeepAsIfBranchFlow()',
    'applyEditorSettingAssetStatePatchToReact',
  ])
}
requireAll(creatorConversationWorkspacePath, [
  'export function CreatorConversationWorkspace',
  '<CreatorConversationTimeline',
  'submittedMessages={submittedMessages}',
  'pending={props.pending || workspaceRestoring}',
  '<CreatorRecallRail',
  'data-slot="creator-conversation-workspace"',
  'data-agent-workspace-state={workspaceState}',
  "data-agent-ready={workspaceState === 'ready' ? 'true' : 'false'}",
  'data-slot="creator-conversation-input"',
  'data-agent-action="save_local_draft"',
  'data-agent-action="enter_publish_check"',
])
requireAll(creatorConversationTimelinePath, [
  'export function CreatorConversationTimeline',
  'data-slot="creator-conversation-timeline"',
  '尚未写入正文',
  '不提供综合文学分',
  'onSaveManuscriptEdit',
  'data-agent-action="edit_local_manuscript"',
  '<AlertDialog>',
])
requireAll(creatorRecallRailPath, [
  'export function CreatorRecallRail',
  'data-slot="creator-recall-rail"',
  'candidate.whyNow',
  'candidate.locator.label',
  '不改正文或正史',
])
requireAll(editorRecallViewModelsPath, [
  'export function buildCreatorRecallCandidates',
  'export function recommendedCreatorRecallIds',
  'export function resolveManualRecallItems',
  "causal: '必须承接的因果'",
  "character_knowledge: '人物状态与所知'",
  "timeline: '时间与位置'",
  "promise: '未兑现的承诺'",
])
requireAll(editorConversationSettingServicePath, [
  'export function runConversationSettingCapture',
  'recognized: false',
])
requireAll(editorDecisionContextAdapterPath, [
  'manual_recall:',
  'manualRecallItems',
])
requireAll(editorDecisionWorkbenchHookPath, [
  'export function useCreatorEditorDecisionWorkbench',
  'manualRecallItems',
])
requireAll(editorRouteControllerPath, [
  'export interface CreatorEditorRouteQuery',
  'export function readCreatorEditorRouteQuery',
  "requestId: searchParams.get('request')",
  "routeDraftRef: searchParams.get('draft')",
  "routeWorkId: searchParams.get('work')",
  "routeBranchId: searchParams.get('branch')",
])
forbidAll(editorRoutePath, [
  'new URLSearchParams(',
  "searchParams.get('request')",
  "searchParams.get('draft')",
  "searchParams.get('work')",
  "searchParams.get('branch')",
])

requireAll(editorDestinationControllerPath, [
  'export interface EditorDestinationControllerInput',
  'export function branchIdForPublish',
  'export function resolveEditorDestinationContext',
  'const canSaveDraft = authorReady && titleReady && contentReady && destinationReady',
  'const ifBranchOptions',
])
requireAll(editorWorkspaceViewModelControllerPath, [
  'export interface EditorWorkspaceViewModelInput',
  'export function buildEditorWorkspaceViewModel',
  "from './creatorEditorQualityViewModels'",
  "from './creatorEditorReviewImpactViewModels'",
  "from './creatorEditorStoryMapViewModels'",
  'const assistantSuggestion = buildEditorCompletion(selectedRequest, content)',
  'const storyMapItems = buildStoryMapItems({',
  'const reviewStateDiff = buildStateDiffViewModel({',
])
requireAll(editorSocraticViewModelsPath, [
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
requireAll(editorAssistantViewModelsPath, [
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
forbidAll(editorViewModelsPath, [
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
])
for (const pureViewModelPath of [editorSocraticViewModelsPath, editorAssistantViewModelsPath]) {
  forbidAll(pureViewModelPath, [
    "from 'react'",
    'lucide-react',
    'window.',
    'document.',
    'localStorage',
    'indexedDB',
    'fetch(',
    '@/lib/pmfSupabase',
  ])
}
requireAll(editorWorkspaceViewModelControllerPath, [
  "from './creatorEditorSocraticViewModels'",
  "from './creatorEditorAssistantViewModels'",
])
requireAll(editorManuscriptPath, [
  "from './creatorEditorSocraticViewModels'",
  "from './creatorEditorAssistantViewModels'",
])
requireAll('app/src/apps/creator/routes/CreatorEditorGuidance.tsx', [
  "from './creatorEditorSocraticViewModels'",
  "from './creatorEditorAssistantViewModels'",
])
requireAll('app/src/apps/creator/routes/CreatorEditorRails.tsx', [
  "from './creatorEditorAssistantViewModels'",
])
requireAll(editorCommandPatchControllerPath, [
  "from './creatorEditorAssistantViewModels'",
])
requireAll(editorActionInputControllerPath, [
  'export interface EditorActionReadiness',
  'export function buildEditorDraftActionInput',
  'export function buildEditorPublishCheckInput',
  'export function buildEditorSettingCaptureInput',
])

requireAll(editorAssistantControllerPath, [
  'export function resolveWritingCommand',
  'export function resolveEditorAssistAction',
  'export function resolveEditorShortcut',
  'export function resolveReviewFix',
  'export interface CreatorEditorShortcutInput',
])

requireAll(editorSelectionControllerPath, [
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

requireAll(editorSessionViewModelsPath, [
  'export function buildEditorSessionGroups',
  'export function buildEditorPrivateDraftItems',
  '.sort(byNewestDraft)',
  '.sort(byRequestPriority)',
])
requireAll(editorViewModelsPath, [
  "import { compactExcerpt } from './creatorEditorSessionViewModels'",
])
forbidAll(editorViewModelsPath, [
  'buildEditorSessionGroups',
  'buildEditorPrivateDraftItems',
])
forbidAll(editorSessionViewModelsPath, [
  "from 'react'",
  'window.',
  'document.',
  'localStorage',
  'indexedDB',
  'fetch(',
  '@/lib/pmfSupabase',
])
requireAll(editorQualityViewModelsPath, [
  'export type QualityIssue = CreatorQualityIssue',
  'export function buildQualityIssues',
  "id: 'missing-title'",
  "id: 'missing-destination'",
  "id: 'empty-prose'",
  "id: 'thin-prose'",
  "id: 'missing-turn'",
])
forbidAll(editorViewModelsPath, [
  "from './creatorEditorQualityViewModels'",
  'buildQualityIssues',
])
forbidAll(editorQualityViewModelsPath, [
  "from 'react'",
  'lucide-react',
  'window.',
  'document.',
  'localStorage',
  'indexedDB',
  'fetch(',
  '@/lib/pmfSupabase',
])
requireAll(editorReviewImpactViewModelsPath, [
  'export function buildStateDiffViewModel',
  'export function buildBranchSandboxViewModel',
  'export function buildFlightRecorderViewModel',
  'const impactCards: CreatorStateDiffImpactCard[]',
  'const sandboxCards: CreatorBranchSandboxCard[]',
  'const trustRows: CreatorFlightTrustRow[]',
])
forbidAll(editorViewModelsPath, [
  'export function buildStateDiffViewModel',
  'export function buildBranchSandboxViewModel',
  'export function buildFlightRecorderViewModel',
])
forbidAll(editorReviewImpactViewModelsPath, [
  "from 'react'",
  'window.',
  'document.',
  'localStorage',
  'indexedDB',
  'fetch(',
  '@/lib/pmfSupabase',
])
requireAll(editorStoryMapViewModelsPath, [
  'export function storyMapTokens',
  'export function buildStoryMapItems',
  "from '@/components/creator/workspace/CreatorStoryContextPanels'",
])
requireAll(editorInlineReviewViewModelsPath, [
  'export function buildInlineReviewItems',
  'const hasQuestionHook =',
])
requireAll(editorManuscriptPath, [
  "from './creatorEditorInlineReviewViewModels'",
  'const inlineReviewItems = buildInlineReviewItems({',
])
forbidAll(editorViewModelsPath, [
  'export function storyMapTokens',
  'export function buildStoryMapItems',
  'export function buildInlineReviewItems',
  'lucide-react',
])
for (const extractedViewModelPath of [editorStoryMapViewModelsPath, editorInlineReviewViewModelsPath]) {
  forbidAll(extractedViewModelPath, [
    "from 'react'",
    'window.',
    'document.',
    'localStorage',
    'indexedDB',
    'fetch(',
    '@/lib/pmfSupabase',
  ])
}
forbidAll(editorInlineReviewViewModelsPath, ['lucide-react'])

requireAll(editorCommandControllerPath, [
  'export interface CreatorEditorCommandPatch',
  'export function resolveBranchExperimentDecision',
  'export function resolveStoryFlowStage',
])

requireAll(editorCommandEventServicePath, [
  'export const editorCommandCandidateApplyEventName',
  'export interface EditorCommandEventTarget',
  'export function bindEditorCommandCandidateApply',
  'export function bindEditorShortcut',
  "from './creatorEditorAssistantController'",
  'resolveCommandCandidateApply(detail)',
  'resolveEditorCommandCandidateStatePatch({',
  'resolveEditorShortcut({',
  'resolveEditorCommandStatePatch({',
])

requireAll(editorCommandFlowServicePath, [
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

requireAll(editorCommandPatchControllerPath, [
  'export interface CreatorEditorCommandStatePatch',
  'export function resolveEditorCommandStatePatch',
  'export function resolveEditorCommandCandidateStatePatch',
  'resolution: CreatorEditorCandidateApplyResolution | null',
  'buildEditorAssistCandidate({',
  'noticeForAssistAction(patch.assistAction)',
  'primaryLabel: primaryLabel || candidate.primaryLabel',
])

requireAll(editorCandidateControllerPath, [
  'export function resolveCommandCandidateApply',
  'export function resolveEditorAssistCandidateAdoption',
  'export function resolveEditorAssistCandidateBranch',
])

requireAll(editorCandidatePatchControllerPath, [
  'export interface CreatorEditorCandidateStatePatch',
  'export function resolveEditorCandidateAdoptionStatePatch',
  'export function resolveEditorCandidateBranchStatePatch',
  'clearEditorAssistCandidate: resolution.clearCandidate ? true : undefined',
  'commandPatch,',
])

requireAll(editorStartupPatchControllerPath, [
  'export interface CreatorEditorStartupStatePatch',
  'export function resolveEditorStartupStatePatch',
  'selectedWorkId: bootstrap.defaultDraft?.workId || currentSelectedWorkId || bootstrap.nextWorkId',
  "currentTitle === '新章节'",
  "currentBranchTitle === '读者 IF 支线' || currentBranchTitle === '主线'",
])

requireAll(editorStartupEffectServicePath, [
  'export const editorStartupEffectDelayMs',
  'export interface EditorStartupEffectTimerPort',
  'export function scheduleEditorStartupEffect',
  'export async function runEditorStartupEffect',
  'port.scheduleStartup(startup, editorStartupEffectDelayMs)',
  'const startupLoad = await loadStartup()',
  'resolveEditorRouteBootstrap({',
  'runEditorReminderBootstrap({',
  'resolveEditorStartupStatePatch({',
])

requireAll(editorStartupDataPatchControllerPath, [
  'export interface CreatorEditorStartupDataPatch',
  'export function resolveEditorStartupDataPatch',
  'drafts: result.startupLoad.drafts',
  'settingAssets: result.startupLoad.settingAssets',
  'creativeReminders: result.creativeReminders',
])

requireAll(editorReactPatchApplierPath, [
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
])

requireAll(editorUserActionControllerPath, [
  'export interface CreatorEditorUserActionStatePatch',
  'export function resolveAssistantSuggestionAcceptance',
  'export function resolveEditorAssistDismissal',
  'export function resolveGuideStepSelection',
  'export function resolveKeepAsIfBranchAction',
  'writingGuideStepLabel(nextStep)',
  "guideStep: 'draft'",
  "publishMode: 'if'",
])

requireAll(editorDraftControllerPath, [
  'export function resolveEditorDraftSaveBlocker',
  'export function buildEditorLocalDraft',
  'export function resolveEditorDraftOpen',
  'export function resolveFreshEditorDraft',
])

requireAll(editorDraftActionControllerPath, [
  'export const editorDraftActionResetDelayMs',
  'export type EditorDraftSaveResultPatch',
  'export function resolveEditorDraftSaveResultPatch',
  'activeDraftRef: result.draft.localDraftRef',
  'notice: result.notice',
])

requireAll(editorDraftActionServicePath, [
  'export type EditorDraftActionKind',
  'export async function runEditorDraftAction',
  'runEditorDraftSave(saveInput)',
  'resolveEditorDraftSaveStatePatch(resolveEditorDraftSaveResultPatch(result))',
  'statePatch.ok ? statePatch.draft || null : null',
])

requireAll(editorDraftActionFlowServicePath, [
  'export interface EditorDraftActionFlowResetPort',
  'export async function runEditorManualDraftActionFlow',
  'export async function runEditorPublishCheckFlow',
  'runEditorDraftAction(input)',
  'runEditorPublishCheckAction(input)',
  'resetPort.scheduleReset(resetDraftAction)',
])

requireAll(editorDraftSubmitFlowServicePath, [
  'export interface EditorDraftSubmitContext',
  'export async function runEditorManualDraftSubmitFlow',
  'export async function runEditorPublishCheckSubmitFlow',
  'buildEditorDraftActionInput({',
  'buildEditorPublishCheckInput(context)',
  'runEditorManualDraftActionFlow({',
  'runEditorPublishCheckFlow({',
])

requireAll(editorDraftActionResetServicePath, [
  'export interface EditorDraftActionResetPort',
  'export function scheduleEditorDraftActionReset',
  'editorDraftActionResetDelayMs',
  'port.scheduleReset(reset, editorDraftActionResetDelayMs)',
])

requireAll(editorDraftPatchControllerPath, [
  'export interface CreatorEditorDraftStatePatch',
  'export function resolveEditorDraftSaveStatePatch',
  'export function resolveEditorDraftOpenStatePatch',
  'export function resolveEditorFreshDraftStatePatch',
  'clearEditorAssistCandidate: patch.clearEditorAssistCandidate',
])

requireAll(editorDraftPersistencePath, [
  'export function readEditorDrafts',
  'export async function saveEditorDraft',
  "from '@/local-db/creatorLocalDraftRepository'",
  "from '@/local-db/creatorLocalWritingRepository'",
  'upsertLocalDraft(draft)',
])

requireAll(editorDraftLoadServicePath, [
  'export interface EditorDraftLoadPersistencePort',
  'export function runEditorDraftLoad',
  'readAll: readEditorDrafts',
])

requireAll(editorReminderServicePath, [
  'export interface EditorReminderPersistencePort',
  'export function runEditorReminderLoad',
  'export function runEditorReminderBootstrap',
  "from '@/local-db/creatorLocalWritingRepository'",
  'readAll: readLocalCreativeReminders',
  'upsert: upsertLocalCreativeReminder',
])

requireAll(localDraftRepositoryPath, [
  'export function createLocalDraftRef',
  'export function readLocalDrafts',
  'export function upsertLocalDraft',
  'readLocalDraftRecords()',
  'upsertLocalDraftRecord(draft)',
])
forbidAll(localDraftRepositoryPath, [
  "@/lib/pmfSupabase",
])
requireAll(localWritingRepositoryPath, [
  'export function readLocalCreativeReminders',
  'export function upsertLocalCreativeReminder',
  'export function suggestLocalCreativeReminders',
  'export function updateLocalCreativeReminder',
  'readLocalCreativeReminderRecords(workId)',
  'upsertLocalCreativeReminderRecord(applyCreativeReminderAuthorUpdate(',
])

requireAll(editorDraftSaveServicePath, [
  'export interface EditorDraftPersistencePort',
  'export async function runEditorDraftSave',
  'resolveEditorDraftSaveBlocker(readiness)',
  'persistence.save({',
])

requireAll(editorStartupLoadServicePath, [
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

requireAll(editorPublishHandoffPath, [
  'export function resolveEditorPublishHandoff',
  "kind: 'publish-bundle-draft-handoff'",
  'createPublishBundleDraftRecord(draft, nowIso)',
  'publishBundleDraftTargetPathForLocalDraftRef(draft.localDraftRef)',
])

requireAll(editorPublishHandoffServicePath, [
  'export interface EditorPublishHandoffPersistencePort',
  'export function prepareEditorPublishHandoff',
  "from '@/local-db/creatorLocalPublishRepository'",
  'saveBundleDraft: upsertLocalPublishBundle',
  'persistence.saveBundleDraft(handoff.bundleDraft)',
])

requireAll(editorPublishCheckServicePath, [
  'export type RunEditorPublishCheckInput',
  'export interface RunEditorPublishCheckResult',
  'export async function runEditorPublishCheckAction',
  "action: 'publish'",
  'prepareEditorPublishHandoff(result.draft',
])

requireAll(publishBundleDraftHandoffPath, [
  'publishBundleDraftQueryKey',
  'legacyPublishDraftQueryKey',
  'createPublishBundleDraftRecord',
  'resolvePublishBundleDraftRouteRef',
  '/creator/bundles?',
])

requireAll(editorSettingAssetControllerPath, [
  'export function resolveEditorSettingAssetDraft',
  'defaultSettingKindForStage(guideStep)',
  'chapterDirectionLabel(chapterDirection)',
])

requireAll(editorSettingAssetServicePath, [
  'export interface EditorSettingAssetLoadPersistencePort',
  'export interface EditorSettingAssetPersistencePort',
  'export function runEditorSettingAssetLoad',
  'export function runEditorSettingAssetCapture',
  "from '@/local-db/creatorLocalSettingAssetRepository'",
  'resolveEditorSettingAssetDraft(input)',
  'readAll: readLocalSettingAssets',
  'persistence.save(draft.assetInput)',
])
forbidAll(editorSettingAssetServicePath, [
  "@/lib/pmfSupabase",
])
requireAll(localSettingAssetRepositoryPath, [
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
forbidAll(localSettingAssetRepositoryPath, [
  "@/lib/pmfSupabase",
])

requireAll(localWorkspaceRepositoryPath, [
  "from './creatorLocalAgentRepository'",
  "from './creatorLocalDraftRepository'",
  "from './creatorLocalPublishRepository'",
  "from './creatorLocalSettingAssetRepository'",
  "from './creatorLocalWritingRepository'",
  'export interface LocalCreatorWorkspaceSnapshot',
  'export function readLocalWorkspaceSnapshot',
  'drafts: readLocalDrafts()',
  'settingAssets: readLocalSettingAssets()',
  'creativeReminders: readLocalCreativeReminders()',
  'publishBundles: readLocalPublishBundles()',
  'publishReceipts: readLocalPublishReceipts()',
  'operationRecords: readLocalAgentOperations(20)',
])
forbidAll(localWorkspaceRepositoryPath, [
  "@/lib/pmfSupabase",
])

requireAll(editorSettingAssetPatchControllerPath, [
  'export interface CreatorEditorSettingAssetStatePatch',
  'export function resolveEditorSettingAssetStatePatch',
  'settingAssets: result.settingAssets',
  'guideStep: result.nextGuideStep',
])
requireAll(editorSettingAssetSubmitFlowServicePath, [
  'export interface EditorSettingAssetSubmitContext',
  'export function runEditorSettingAssetSubmitFlow',
  'runEditorSettingAssetCapture(buildEditorSettingCaptureInput(context))',
  'return resolveEditorSettingAssetStatePatch(result)',
])

requireAll(editorRailsPath, [
  'export function CreatorEditorLeftRail',
  'export function CreatorEditorRightRail',
  'export function CreatorEditorBottomRail',
  'CreatorAgentWritingAssistantPanel',
])

requireAll(worksRoutePath, [
  'export function CreatorWorksRoute',
  '作品与支线',
  'CreatorWorkStructureStrip',
  'CreatorBranchLineCard',
  "from './creatorWorksActionFlowService'",
  "from './creatorWorksBrowserActionService'",
  "from './creatorWorksRouteViewModels'",
  'scheduleCreatorWorksInitialLoad(load)',
  'createCreatorWorksRouteViewModel({',
  'runCreatorWorksLoad({',
  'resolveCreatorWorksSelection([work], branches, {',
  'runCreatorWorkNoticeFlow({',
  'runCreatorWorkHideFlow({',
  'runCreatorBranchArchiveFlow(branch)',
  'runCreatorIfBranchCreateFlow({',
])
requireAll(worksRouteViewModelsPath, [
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
forbidAll(worksRouteViewModelsPath, [
  "from 'react'",
  'lucide-react',
  '@/components/',
  '@/local-db/',
  '@/lib/pmfSupabase',
  'window.',
  'document.',
  'fetch(',
  'navigate(',
])
requireAll(worksBrowserActionServicePath, [
  'export interface CreatorWorksBrowserPort',
  'export function scheduleCreatorWorksInitialLoad',
])
requireAll(worksLoadServicePath, [
  'export interface CreatorWorksLoadApiPort',
  'export interface CreatorWorksLoadInput',
  'export function resolveCreatorWorksSelection',
  'export async function runCreatorWorksLoad',
  'listWorks: listCreatorWorks',
  'listBranches: listCreatorBranches',
  'listChapters: listCreatorChapters',
  'listRequests: listCreatorRequests',
])
forbidAll(worksLoadServicePath, [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
  'window.',
])
requireAll(worksActionServicePath, [
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
requireAll(worksActionFlowServicePath, [
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
forbidAll(worksActionFlowServicePath, [
  "from 'react'",
  'lucide-react',
  '@/components/',
  '@/local-db/',
  '@/lib/pmfSupabase',
  'window.',
  'document.',
  'fetch(',
  'navigate(',
])
forbidAll(worksActionServicePath, [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
  'window.',
])
forbidAll(worksBrowserActionServicePath, [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
])
forbidAll(worksRoutePath, [
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
])

requireAll(publishRoutePath, [
  'export function CreatorPublishBundleRoute',
  '发布包确认',
  'runCreatorPreparePublishBundle(input)',
  'runCreatorReviewPublishBundle(activeBundle.id)',
  'runConfirmedCreatorBundleConfirmation(activeBundle.id',
  'runConfirmedCreatorBundleExport(activeBundle.id',
  'runConfirmedCreatorBundleSubmit(activeBundle.id',
  'runCreatorPublishBundleContextEffect({',
  'runCreatorPublishBundleRouteDraftRefreshEffect(',
  'runCreatorPublishBundleManualRefreshEffect(',
  "from './creatorPublishBundleBrowserActionService'",
  'scheduleCreatorPublishBundleContextLoad(loadContext)',
  'scheduleCreatorPublishBundleRouteDraftRefresh(async () =>',
  'readCreatorPublishBundleLocalSnapshot(routeRefs)',
  'CreatorPublishBundleContextPanel',
])
requireAll(publishBundleLoadServicePath, [
  'export interface CreatorPublishBundleContextApiPort',
  'export interface CreatorPublishBundleLocalReadPort',
  'export function readCreatorPublishBundleRouteRefs',
  'export function resolveCreatorPublishBundleRouteDraftRef',
  'export function readCreatorPublishBundleLocalSnapshot',
  'export async function runCreatorPublishBundleContextLoad',
  'listWorks: listCreatorWorks',
  'listBranches: listCreatorBranches',
  'listChapters: listCreatorChapters',
  'listRequests: listCreatorRequests',
  'getAuthorizationStatus: getCreatorAuthorizationStatus',
  'readDrafts: readLocalDrafts',
  'readPublishBundles: readLocalPublishBundles',
  'readPublishReceipts: readLocalPublishReceipts',
  'export async function runCreatorPublishBundleLocalLoad',
])
forbidAll(publishBundleLoadServicePath, [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
  'window.',
])
requireAll(publishBundleRouteEffectServicePath, [
  'export interface CreatorPublishBundleContextStatePatch',
  'export interface CreatorPublishBundleRouteEffectPort',
  'export async function runCreatorPublishBundleContextEffect',
  'export async function runCreatorPublishBundleRouteDraftRefreshEffect',
  'export async function runCreatorPublishBundleManualRefreshEffect',
  'loadContext: runCreatorPublishBundleContextLoad',
  'loadLocal: runCreatorPublishBundleLocalLoad',
])
forbidAll(publishBundleRouteEffectServicePath, [
  "from 'react'",
  'from "react"',
  '@/components/',
  '@/local-db/creatorLocal',
  'window.',
  'document.',
  'fetch(',
])
requireAll(publishBundleRouteViewModelsPath, [
  'export interface CreatorPublishBundleRouteViewModelInput',
  'export function createCreatorPublishBundleRouteViewModel',
  'resolveCreatorPublishBundleActiveRecord(activeDraft?.localDraftRef, publishBundles)',
  'publishBundleInput: CreatorPublishBundleInput | null',
])
requireAll(publishLifecycleViewModelsPath, [
  'export function resolveCreatorPublishBundleActiveRecord',
  'export function createPublishBundleLifecycleViewModel',
])
forbidAll(publishBundleRouteViewModelsPath, [
  "from 'react'",
  'from "react"',
  '@/components/',
  '@/local-db/creatorLocal',
  '@/lib/pmfSupabase',
  'window.',
  'document.',
  'fetch(',
])
forbidAll(publishRoutePath, [
  'const activeDraft = routeDraftRef',
  'const mustGates =',
  'function publishBundleInput()',
  'runCreatorPublishBundleContextLoad()',
  'runCreatorPublishBundleLocalLoad(',
  'resolveCreatorPublishBundleContextSnapshotPatch(',
])
requireAll(publishBundleActionServicePath, [
  'export interface CreatorPublishBundleSubmitPort',
  'export async function runCreatorPreparePublishBundle',
  'export async function runCreatorReviewPublishBundle',
  'export function runConfirmedCreatorBundleConfirmation',
  'export function runConfirmedCreatorBundleExport',
  'export function runConfirmedCreatorBundleSubmit',
  'submitBundle: publishOwnPlatformBundle',
])
forbidAll(publishBundleActionServicePath, [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
  'window.',
])
requireAll(publishBundleBrowserActionServicePath, [
  'export interface CreatorPublishBundleBrowserPort',
  'export function scheduleCreatorPublishBundleContextLoad',
  'export function scheduleCreatorPublishBundleRouteDraftRefresh',
])
forbidAll(publishBundleBrowserActionServicePath, [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
])
forbidAll(publishRoutePath, [
  'listCreatorWorks()',
  'listCreatorBranches()',
  'listCreatorChapters()',
  'listCreatorRequests()',
  'getCreatorAuthorizationStatus()',
  'readLocalDrafts()',
  'readLocalPublishBundles()',
  'publishOwnPlatformBundle({',
  'window.setTimeout',
  'window.clearTimeout',
])

requireAll(settingsRoutePath, [
  'export function CreatorSettingsRoute',
  '本机工作区',
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
  'CreatorLocalWorkspacePanel',
  'CreatorWorkspacePreferencesPanel',
  'CreatorSettingsStatusRail',
])
requireAll(settingsRouteViewModelsPath, [
  'export type CreatorSettingsPhase',
  'export interface CreatorSettingsRouteViewModelInput',
  'export interface CreatorSettingsRouteViewModel',
  'export function createCreatorSettingsRouteViewModel',
  'const flagMap = new Map(',
  'const readinessItems:',
  'const settingsStatusItems:',
  'const settingsFlagItems:',
  'const workspaceSummaryItems:',
  'const operationItems =',
  'const permissionItems:',
])
forbidAll(settingsRouteViewModelsPath, [
  "from 'react'",
  'lucide-react',
  '@/components/',
  '@/local-db/',
  '@/lib/pmfSupabase',
  'window.',
  'document.',
  'fetch(',
  'navigate(',
])
requireAll(settingsBrowserActionServicePath, [
  'export interface CreatorSettingsBrowserPort',
  'export interface CreatorSettingsBrowserTimerPort',
  'export function applyCreatorSettingsDisplayPreferences',
  'export function downloadCreatorWorkspacePackage',
  'export function scheduleCreatorSettingsActionReset',
  'export function scheduleCreatorSettingsRouteEffect',
])
requireAll(settingsWorkspaceExportFlowServicePath, [
  'export interface CreatorSettingsWorkspaceExportFlowPort',
  'export async function runCreatorSettingsWorkspaceExport',
  'readWorkspaceSnapshot: readCreatorSettingsWorkspaceSnapshot',
  'buildWorkspacePackage: buildLocalWorkspacePackage',
  'downloadWorkspacePackage: downloadCreatorWorkspacePackage',
])
forbidAll(settingsWorkspaceExportFlowServicePath, [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
  'window.',
  'document.',
  '@/lib/pmfSupabase',
])
requireAll(settingsLoadServicePath, [
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
requireAll(settingsHydrationServicePath, [
  'export interface CreatorSettingsHydrationPort',
  'export async function readHydratedCreatorSettingsLocalState',
  'await local.hydrateWorkspace()',
  'local.readDisplayPreferences()',
  'local.readWritingAssistPreferences()',
  'local.readWorkspaceSnapshot()',
])
requireAll(settingsActionServicePath, [
  'export function saveCreatorWorkspacePreferences',
  'export function clearCreatorWorkspacePreferences',
  'export async function readCreatorSettingsWorkspaceSnapshot',
  'writeDisplayPreferences: writeCreatorDisplayPreferences',
  'hydrateWorkspace: hydrateLocalWorkspace',
  'readWorkspaceSnapshot: readLocalWorkspaceSnapshot',
  'await port.hydrateWorkspace()',
])
requireAll(localWorkspacePackagePath, [
  'export async function buildLocalWorkspacePackage',
  'export async function previewLocalWorkspacePackage',
  'export async function applyLocalWorkspacePackage',
  'export async function rollbackLocalWorkspaceImport',
])
forbidAll(settingsRoutePath, [
  "from '@/local-db/creatorLocalSettingsRepository'",
  "from '@/local-db/creatorLocalWorkspaceRepository'",
  "from '@/lib/pmfSupabase'",
  'readLocalAiSettings()',
  'readCreatorDisplayPreferences()',
  'readLocalWorkspaceSnapshot()',
  'writeLocalAiSettings(',
  'writeCreatorDisplayPreferences(',
  'syncCreatorClient()',
  'getCreatorAuthorizationStatus()',
  'listCreatorFeatureFlags()',
  'fetch(',
  'window.setTimeout',
  'window.clearTimeout',
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
])
forbidAll(settingsLoadServicePath, [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
])
forbidAll(settingsHydrationServicePath, [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
  'window.',
  'document.',
])
forbidAll(settingsActionServicePath, [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
  'CreatorSettingsActionResetPort',
  'scheduleCreatorSettingsActionReset',
  'scheduleCreatorSettingsRouteEffect',
  'window.',
])
forbidAll(settingsBrowserActionServicePath, [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
])

requireAll(localSettingsRepositoryPath, [
  "from './creatorLocalRepository'",
  'export function isLocalCreatorHost',
  'export function getLocalCreatorClientId',
  'export function readCreatorDisplayPreferences',
  'export function writeCreatorDisplayPreferences',
])
forbidAll(localSettingsRepositoryPath, [
  "@/lib/pmfSupabase",
  'getSupabaseBrowserClient',
  "from('creator_clients')",
  'readLocalAiSettings',
  'writeLocalAiSettings',
  'creatorLocalMetaKeys.aiSettings',
])
requireAll(legacyToolSettingsPath, [
  "from './creatorLocalRepository'",
  'export interface LegacyCreatorToolSettings',
  'export function readLegacyCreatorToolSettings',
  'creatorLocalMetaKeys.aiSettings',
])
forbidAll(legacyToolSettingsPath, [
  'upsertLocalMetaValue',
  'writeLegacyCreatorToolSettings',
  "@/lib/pmfSupabase",
])

requireAll(localReaderSignalRepositoryPath, [
  "from './creatorLocalRepository'",
  'export function readerSignalFromRequest',
  'export function readLocalReaderSignals',
  'export function upsertLocalReaderSignal',
  'export function cacheReaderRequestSignals',
])
forbidAll(localReaderSignalRepositoryPath, [
  "@/lib/pmfSupabase",
  'getSupabaseBrowserClient',
  "from('reader_requests')",
])

const creator = read(creatorPath)
const creatorFrame = read(creatorFramePath)
const editorRoute = read(editorRoutePath)
const editorCommandController = read(editorCommandControllerPath)
for (const directDraftActionFlowImport of [
  "from './creatorEditorDraftActionFlowService'",
  "from './creatorEditorDraftActionService'",
  "from './creatorEditorDraftActionResetService'",
  "from './creatorEditorPublishCheckService'",
]) {
  if (editorRoute.includes(directDraftActionFlowImport)) {
    failures.push(`${editorRoutePath} must enter draft save/publish through creatorEditorAgentExecutionService instead of ${directDraftActionFlowImport}`)
  }
}
if (creator.includes('const creatorPageCopy')) {
  failures.push(`${creatorPath} must not own creatorPageCopy after S3 route-registry extraction`)
}
if (creator.includes('function CreatorFrame(')) {
  failures.push(`${creatorPath} must not own CreatorFrame after S3 shell extraction`)
}
if (creator.includes('function RequireCreator(')) {
  failures.push(`${creatorPath} must not own RequireCreator after S3 shell extraction`)
}
if (creator.includes('function DashboardPage(')) {
  failures.push(`${creatorPath} must not own DashboardPage after S3 route-owner extraction`)
}
if (creator.includes('function RequestsPage(')) {
  failures.push(`${creatorPath} must not own RequestsPage after S6 route-owner extraction`)
}
if (creator.includes('function EditorPage(')) {
  failures.push(`${creatorPath} must not own EditorPage after S8 editor route-owner extraction`)
}
if (creator.includes('function WorksPage(')) {
  failures.push(`${creatorPath} must not own WorksPage after S3 route-owner extraction`)
}
if (creator.includes('function PublishCheckPage(')) {
  failures.push(`${creatorPath} must not own PublishCheckPage after S3 route-owner extraction`)
}
if (creator.includes('function SettingsPage(')) {
  failures.push(`${creatorPath} must not own SettingsPage after S3 route-owner extraction`)
}
if (!creatorFrame.includes('export function CreatorFrame')) {
  failures.push(`${creatorFramePath} must export CreatorFrame after S3 shell extraction`)
}
if (!creatorFrame.includes('export function RequireCreator')) {
  failures.push(`${creatorFramePath} must export RequireCreator after S3 shell extraction`)
}
if (creator.includes("{ id: 'creator-home', icon: 'creatorHome', label: '今日', href: '/creator' }")) {
  failures.push(`${creatorPath} must not hard-code Creator nav items after S3 route-registry extraction`)
}
for (const hardCodedAlias of [
  '<Route path="/creator/echo" element={<Navigate to="/creator/requests" replace />} />',
  '<Route path="/creator/inspiration" element={<Navigate to="/creator/editor" replace />} />',
  '<Route path="/creator/library" element={<Navigate to="/creator/works" replace />} />',
  '<Route path="/creator/write" element={<Navigate to="/creator/editor" replace />} />',
  '<Route path="/creator/bundles" element={<Navigate to="/creator/publish" replace />} />',
  '<Route path="/creator/workspace" element={<Navigate to="/creator/settings" replace />} />',
]) {
  if (creator.includes(hardCodedAlias)) {
    failures.push(`${creatorPath} must generate Pivot route aliases from creatorRouteRegistry instead of hard-coding ${hardCodedAlias}`)
  }
}
for (const userActionResidue of [
  'setContent(previous =>',
  "setPublishMode('if')",
  "setNotice('已补入创作助手建议；可以继续改写。')",
  "setNotice('候选已收起，正文没有变化。')",
  'writingGuideStepLabel(nextStep)',
]) {
  if (editorRoute.includes(userActionResidue)) {
    failures.push(`${editorRoutePath} must delegate user-action semantics to creatorEditorUserActionController instead of ${userActionResidue}`)
  }
	}
for (const commandFlowResidue of [
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
  if (editorRoute.includes(commandFlowResidue)) {
    failures.push(`${editorRoutePath} must enter command/candidate/user-action flow through creatorEditorCommandFlowService instead of ${commandFlowResidue}`)
  }
}
for (const destinationResidue of [
  'new Map(works.map(work => [work.id, work]))',
  'new Map(branches.map(branch => [branch.id, branch]))',
  'branches.filter(branch => branch.work_id === selectedWorkId)',
  'currentWorkBranches.find(branch => branch.branch_type ===',
  'pmfMainBranchId(selectedWorkId)',
  'branchIdForPublish(selectedWorkId, \'if\', selectedRequest)',
  'const titleReady = Boolean(title.trim())',
  'const canSaveDraft = authorReady && titleReady && contentReady && destinationReady',
  'const ifBranchOptions = [',
]) {
  if (editorRoute.includes(destinationResidue)) {
    failures.push(`${editorRoutePath} must delegate destination/readiness semantics to creatorEditorDestinationController instead of ${destinationResidue}`)
  }
}
for (const workspaceViewModelResidue of [
  'buildSocraticPlanStages({',
  'buildEditorCompletion(selectedRequest, content)',
  'buildQualityIssues({',
  'buildStateDiffViewModel({',
  'buildBranchSandboxViewModel({',
  'buildFlightRecorderViewModel({',
  'buildStoryMapItems({',
  'workTitleFromMap(selectedWorkId, workMap)',
]) {
  if (editorRoute.includes(workspaceViewModelResidue)) {
    failures.push(`${editorRoutePath} must delegate review/story-map view-model construction to creatorEditorWorkspaceViewModelController instead of ${workspaceViewModelResidue}`)
  }
}
if (!canonicalConversationalEditor) {
  for (const actionInputResidue of [
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
    if (editorRoute.includes(actionInputResidue)) {
      failures.push(`${editorRoutePath} must delegate save/publish through creatorEditorAgentExecutionService and setting capture to creatorEditorSettingAssetSubmitFlowService instead of ${actionInputResidue}`)
    }
  }
}
	for (const commandControllerResidue of [
  'export function resolveWritingCommand',
  'export function resolveChapterDirectionSelection',
  'export function resolveChapterGoalConfirmation',
  'export function resolveDraftGuideContinuation',
  'export function resolveEditorAssistAction',
  'export function resolveEditorShortcut',
  'export function resolveReviewFix',
  'chapterDirectionLabel(direction)',
  'CreatorEditorShortcutInput',
]) {
  if (editorCommandController.includes(commandControllerResidue)) {
    failures.push(`${editorCommandControllerPath} must stay thin and delegate assistant/selection responsibilities instead of ${commandControllerResidue}`)
  }
}

for (const [servicePath, privateExportMarkers] of [
  [dashboardLoadServicePath, [
    'export interface CreatorDashboardLocalSnapshot',
    'export type RunCreatorDashboardLoadResult',
  ]],
  [worksLoadServicePath, [
    'export type RunCreatorWorksLoadResult',
  ]],
  [settingsLoadServicePath, [
    'export interface CreatorSettingsLocalSnapshot',
    'export type RunCreatorSettingsLoadResult',
  ]],
  [publishBundleLoadServicePath, [
    'export interface CreatorPublishBundleLocalSnapshot',
    'export type RunCreatorPublishBundleContextLoadResult',
  ]],
]) {
  forbidAll(servicePath, privateExportMarkers)
}

if (failures.length) {
  console.error('[creator-route-registry] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[creator-route-registry] PASS')
