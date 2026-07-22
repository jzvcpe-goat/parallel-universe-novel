import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function read(path: string) {
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) throw new Error(`Missing required file: ${path}`)
  return readFileSync(absolute, 'utf8')
}

function assertIncludes(body: string, needle: string, label: string) {
  if (!body.includes(needle)) {
    throw new Error(`${label}: expected to include ${JSON.stringify(needle)}`)
  }
}

function assertNotIncludes(body: string, needle: string, label: string) {
  if (body.includes(needle)) {
    throw new Error(`${label}: must not include ${JSON.stringify(needle)}`)
  }
}

function assertOnlyWithin(body: string, needle: string, requiredScope: string, label: string) {
  const firstIndex = body.indexOf(needle)
  if (firstIndex === -1) throw new Error(`${label}: missing ${JSON.stringify(needle)}`)
  const scopeIndex = body.lastIndexOf(requiredScope, firstIndex)
  if (scopeIndex === -1) {
    throw new Error(`${label}: ${JSON.stringify(needle)} must be inside ${requiredScope}`)
  }
}

const localCreator = read('app/src/apps/creator/LocalCreatorApp.tsx')
const editorRoute = read('app/src/apps/creator/routes/CreatorEditorRoute.tsx')
const editorManuscript = read('app/src/apps/creator/routes/CreatorEditorManuscriptStage.tsx')
const editorController = read('app/src/apps/creator/routes/creatorEditorRouteController.ts')
const editorCommandController = read('app/src/apps/creator/routes/creatorEditorCommandController.ts')
const editorAssistantController = read('app/src/apps/creator/routes/creatorEditorAssistantController.ts')
const editorSelectionController = read('app/src/apps/creator/routes/creatorEditorSelectionController.ts')
const editorCommandFlowService = read('app/src/apps/creator/routes/creatorEditorCommandFlowService.ts')
const editorDestinationController = read('app/src/apps/creator/routes/creatorEditorDestinationController.ts')
const editorWorkspaceViewModelController = read('app/src/apps/creator/routes/creatorEditorWorkspaceViewModelController.ts')
const editorCandidateController = read('app/src/apps/creator/routes/creatorEditorCandidateController.ts')
const editorDraftController = read('app/src/apps/creator/routes/creatorEditorDraftController.ts')
const editorDraftPersistence = read('app/src/apps/creator/routes/creatorEditorDraftPersistence.ts')
const editorDraftActionFlowService = read('app/src/apps/creator/routes/creatorEditorDraftActionFlowService.ts')
const editorDraftSubmitFlowService = read('app/src/apps/creator/routes/creatorEditorDraftSubmitFlowService.ts')
const editorPublishHandoffController = read('app/src/apps/creator/routes/creatorEditorPublishHandoffController.ts')
const editorPublishHandoffService = read('app/src/apps/creator/routes/creatorEditorPublishHandoffService.ts')
const editorPublishCheckService = read('app/src/apps/creator/routes/creatorEditorPublishCheckService.ts')
const publishBundleDraftHandoff = read('app/src/features/creator-pivot/publishBundleDraftHandoff.ts')
const editorReminderService = read('app/src/apps/creator/routes/creatorEditorReminderService.ts')
const editorReactPatchApplier = read('app/src/apps/creator/routes/creatorEditorReactPatchApplier.ts')
const editorUserActionController = read('app/src/apps/creator/routes/creatorEditorUserActionController.ts')
const editorStartupEffectService = read('app/src/apps/creator/routes/creatorEditorStartupEffectService.ts')
const editorStartupLoadService = read('app/src/apps/creator/routes/creatorEditorStartupLoadService.ts')
const editorRails = read('app/src/apps/creator/routes/CreatorEditorRails.tsx')
const creator = `${localCreator}\n${editorRoute}\n${editorManuscript}\n${editorController}\n${editorCommandController}\n${editorAssistantController}\n${editorSelectionController}\n${editorCommandFlowService}\n${editorDestinationController}\n${editorWorkspaceViewModelController}\n${editorCandidateController}\n${editorDraftController}\n${editorDraftPersistence}\n${editorDraftActionFlowService}\n${editorPublishHandoffController}\n${editorPublishHandoffService}\n${editorPublishCheckService}\n${publishBundleDraftHandoff}\n${editorReminderService}\n${editorReactPatchApplier}\n${editorUserActionController}\n${editorStartupEffectService}\n${editorStartupLoadService}\n${editorRails}`
const dashboardRoute = read('app/src/apps/creator/routes/CreatorDashboardRoute.tsx')
const dashboardBrowserActionService = read('app/src/apps/creator/routes/creatorDashboardBrowserActionService.ts')
const dashboardLoadService = read('app/src/apps/creator/routes/creatorDashboardLoadService.ts')
const dashboardRouteEffectService = read('app/src/apps/creator/routes/creatorDashboardRouteEffectService.ts')
const dashboardReactPatchApplier = read('app/src/apps/creator/routes/creatorDashboardReactPatchApplier.ts')
const dashboardRouteViewModels = read('app/src/apps/creator/routes/creatorDashboardRouteViewModels.ts')
const dashboardNextStepsPanel = read('app/src/components/creator/CreatorTodayNextStepsPanel.tsx')
const echoRoute = read('app/src/apps/creator/routes/CreatorEchoRoute.tsx')
const echoActionService = read('app/src/apps/creator/routes/creatorEchoActionService.ts')
const echoController = read('app/src/apps/creator/routes/creatorEchoRouteController.ts')
const echoSignalViewModels = read('app/src/apps/creator/routes/creatorEchoSignalViewModels.ts')
const echoRouteViewModels = read('app/src/apps/creator/routes/creatorEchoRouteViewModels.ts')
const echoBrowserActionService = read('app/src/apps/creator/routes/creatorEchoBrowserActionService.ts')
const echoLoadService = read('app/src/apps/creator/routes/creatorEchoLoadService.ts')
const publishRoute = read('app/src/apps/creator/routes/CreatorPublishBundleRoute.tsx')
const publishBundleActionService = read('app/src/apps/creator/routes/creatorPublishBundleActionService.ts')
const publishBundleBrowserActionService = read('app/src/apps/creator/routes/creatorPublishBundleBrowserActionService.ts')
const publishBundleRouteEffectService = read('app/src/apps/creator/routes/creatorPublishBundleRouteEffectService.ts')
const publishBundleLoadService = read('app/src/apps/creator/routes/creatorPublishBundleLoadService.ts')
const publishBundleReactPatchApplier = read('app/src/apps/creator/routes/creatorPublishBundleReactPatchApplier.ts')
const publishBundleRouteController = read('app/src/apps/creator/routes/creatorPublishBundleRouteController.ts')
const publishBundleRouteViewModels = read('app/src/apps/creator/routes/creatorPublishBundleRouteViewModels.ts')
const publishLifecycleViewModels = read('app/src/apps/creator/routes/creatorPublishLifecycleViewModels.ts')
const worksRoute = read('app/src/apps/creator/routes/CreatorWorksRoute.tsx')
const worksActionFlowService = read('app/src/apps/creator/routes/creatorWorksActionFlowService.ts')
const worksActionService = read('app/src/apps/creator/routes/creatorWorksActionService.ts')
const worksBrowserActionService = read('app/src/apps/creator/routes/creatorWorksBrowserActionService.ts')
const worksLoadService = read('app/src/apps/creator/routes/creatorWorksLoadService.ts')
const worksRouteViewModels = read('app/src/apps/creator/routes/creatorWorksRouteViewModels.ts')
const settingsRoute = read('app/src/apps/creator/routes/CreatorSettingsRoute.tsx')
const settingsActionService = read('app/src/apps/creator/routes/creatorSettingsActionService.ts')
const settingsBrowserActionService = read('app/src/apps/creator/routes/creatorSettingsBrowserActionService.ts')
const settingsLoadService = read('app/src/apps/creator/routes/creatorSettingsLoadService.ts')
const settingsHydrationService = read('app/src/apps/creator/routes/creatorSettingsHydrationService.ts')
const settingsRouteViewModels = read('app/src/apps/creator/routes/creatorSettingsRouteViewModels.ts')
const settingsWorkspaceExportFlowService = read('app/src/apps/creator/routes/creatorSettingsWorkspaceExportFlowService.ts')
const creatorAppFrame = read('app/src/components/creator/CreatorAppFrame.tsx')
const creatorLoginSurfaces = read('app/src/components/creator/CreatorLoginSurfaces.tsx')
const creatorTodayPriorityPanel = read('app/src/components/creator/CreatorTodayPriorityPanel.tsx')
const creatorTodayRoutePanels = read('app/src/components/creator/CreatorTodayRoutePanels.tsx')
const creatorTodayPathPanel = read('app/src/components/creator/CreatorTodayPathPanel.tsx')
const creatorTodayEchoStatusPanel = read('app/src/components/creator/CreatorTodayEchoStatusPanel.tsx')
const creatorTodayContextRail = read('app/src/components/creator/CreatorTodayContextRail.tsx')
const creatorExternalEchoInboxCard = read('app/src/components/creator/CreatorExternalEchoInboxCard.tsx')
const creatorExternalEchoDetailPanel = read('app/src/components/creator/CreatorExternalEchoDetailPanel.tsx')
const creatorBranchLineCard = read('app/src/components/creator/CreatorBranchLineCard.tsx')
const creatorEchoStatusStrip = read('app/src/components/creator/CreatorEchoStatusStrip.tsx')
const creatorEchoDecisionPanels = read('app/src/components/creator/CreatorEchoDecisionPanels.tsx')
const creatorEchoWritingRail = read('app/src/components/creator/CreatorEchoWritingRail.tsx')
const creatorEchoPanels = read('app/src/components/creator/CreatorEchoPanels.tsx')
const creatorLocalWorkspacePanel = read('app/src/components/creator/CreatorLocalWorkspacePanel.tsx')
const creatorSettingsBoundaryStrip = read('app/src/components/creator/CreatorSettingsBoundaryStrip.tsx')
const creatorWorkspacePreferencesPanel = read('app/src/components/creator/CreatorWorkspacePreferencesPanel.tsx')
const creatorSettingsStatusRail = read('app/src/components/creator/CreatorSettingsStatusRail.tsx')
const publishBundleAdapter = read('app/src/features/creator-pivot/publishBundleAdapter.ts')
const data = read('app/src/lib/pmfSupabase.ts')
const readerData = read('app/src/lib/pmfSupabaseReader.ts')
const types = read('app/src/features/pmf/types.ts')
const qaRecord = read('docs/harness/creator-ui-m8-qa-20260628.md')
const acceptance = read('docs/harness/page-acceptance-tests.md')

for (const route of [
  '/creator',
  '/creator/requests',
  '/creator/editor',
  '/creator/works',
  '/creator/publish',
  '/creator/settings',
]) {
  assertIncludes(creator, route, `Creator route ${route}`)
}

assertIncludes(creatorAppFrame, "session.status !== 'signed_in'", 'signed-out gate')
assertIncludes(creatorAppFrame, 'return <>{children}</>', 'signed-in gate renders protected route children')
assertIncludes(creatorAppFrame, 'creatorAccessPreviews', 'signed-out route access copy exists')
assertIncludes(creatorAppFrame, '<CreatorAccessGate preview={preview}', 'protected routes use the signed-out access gate')
assertIncludes(creatorLoginSurfaces, 'export function CreatorAccessGate', 'signed-out access gate has a component owner')
assertNotIncludes(creatorLoginSurfaces, 'CreatorLockedWorkbenchPreview', 'retired locked queue simulation stays deleted')
assertIncludes(creatorLoginSurfaces, 'disabled', 'login actions preserve disabled states')

for (const fn of [
  'listCreatorRequests',
  'listCreatorWorks',
  'listCreatorBranches',
  'listCreatorChapters',
  'listCreatorPublishEvents',
  'syncCreatorClient',
  'getCreatorAuthorizationStatus',
  'updateReaderRequestStatus',
  'updateCreatorWorkNotice',
  'updateCreatorWorkStatus',
  'updateCreatorBranchStatus',
  'createCreatorIfBranch',
  'publishOwnPlatformBundle',
  'readLocalDrafts',
  'upsertLocalDraft',
  'readCreatorDisplayPreferences',
  'writeCreatorDisplayPreferences',
  'readLocalWorkspaceSnapshot',
]) {
  assertIncludes(`${creator}\n${dashboardRoute}\n${dashboardLoadService}\n${echoRoute}\n${worksRoute}\n${publishRoute}\n${publishBundleActionService}\n${publishBundleLoadService}\n${settingsRoute}\n${settingsLoadService}\n${settingsActionService}\n${editorDraftPersistence}\n${editorReminderService}\n${data}`, fn, `Creator author flow uses ${fn}`)
}

for (const table of [
  'creator_authorizations',
  'works',
  'branches',
  'chapters',
  'reader_requests',
  'request_votes',
  'publish_events',
  'creator_clients',
  'feature_flags',
]) {
  assertIncludes(`${data}\n${readerData}`, `.from('${table}')`, `Classified data owner accesses ${table}`)
}

assertIncludes(types, "'pending'", 'request status pending')
assertIncludes(types, "'acknowledged'", 'request status acknowledged')
assertIncludes(types, "'in_progress'", 'request status in_progress')
assertIncludes(types, "'published'", 'request status published')
assertIncludes(types, "'rejected'", 'request status rejected')
assertIncludes(echoController, "current === 'published' || current === 'rejected'", 'terminal status transition guard')
assertIncludes(echoController, "current === 'pending') return next === 'acknowledged'", 'pending to acknowledged transition')
assertIncludes(echoController, "current === 'acknowledged') return next === 'in_progress' || next === 'rejected'", 'acknowledged transitions')
assertIncludes(echoController, "current === 'in_progress') return next === 'rejected'", 'in-progress terminal alternative')
assertIncludes(echoRoute, "from './creatorEchoRouteController'", 'External Echo route consumes controller')
assertIncludes(echoRoute, "from './creatorEchoBrowserActionService'", 'External Echo route consumes browser action boundary')
for (const echoBrowserMarker of [
  'export interface CreatorEchoBrowserPort',
  'export function scheduleCreatorEchoInitialLoad',
  'export function scheduleCreatorEchoActionReset',
  'export function openCreatorEchoReaderPerspective',
]) {
  assertIncludes(echoBrowserActionService, echoBrowserMarker, `External Echo browser action author flow ${echoBrowserMarker}`)
}
for (const echoRouteBrowserResidue of [
  'window.open',
  'window.setTimeout',
  'window.clearTimeout',
  'new URL(`/story?work=',
]) {
  assertNotIncludes(echoRoute, echoRouteBrowserResidue, `External Echo route must not own browser side effect ${echoRouteBrowserResidue}`)
}

for (const dashboardMarker of [
  '最值得回应的一问',
  '正在写的一条',
  '需要确认发布',
  'CreatorTodayNextStepsPanel',
  'runCreatorDashboardSyncEffect()',
  'applyCreatorDashboardRouteStatePatchToReact(statePatch,',
  'readCreatorDashboardLocalSnapshot().drafts',
  'createCreatorDashboardRouteViewModel({',
]) {
  assertIncludes(dashboardRoute, dashboardMarker, `Dashboard author flow ${dashboardMarker}`)
}
assertIncludes(dashboardNextStepsPanel, '今天最值得推进的 3 件事', 'Dashboard next-steps owner keeps the Today product promise')
for (const dashboardEffectMarker of [
  "import { runCreatorDashboardLoad } from './creatorDashboardLoadService'",
  'export interface CreatorDashboardRouteEffectPort',
  'load: runCreatorDashboardLoad',
  'export async function runCreatorDashboardSyncEffect',
]) {
  assertIncludes(dashboardRouteEffectService, dashboardEffectMarker, `Dashboard effect service ${dashboardEffectMarker}`)
}
for (const dashboardPatchMarker of [
  'export interface CreatorDashboardRouteStatePatchSetters',
  'export function applyCreatorDashboardRouteStatePatchToReact',
  'setters.setClientStatus(statePatch.clientStatus)',
  'setters.setPhase(statePatch.phase)',
]) {
  assertIncludes(dashboardReactPatchApplier, dashboardPatchMarker, `Dashboard patch applier ${dashboardPatchMarker}`)
}
for (const dashboardViewModelMarker of [
  'export function createCreatorDashboardRouteViewModel',
  '.sort(byRequestPriority)',
  '.sort(byNewestDraft)',
  'isDraftReadyForPublish',
]) {
  assertIncludes(dashboardRouteViewModels, dashboardViewModelMarker, `Dashboard view-model author flow ${dashboardViewModelMarker}`)
}
for (const dashboardLoadMarker of [
  'listPublishEvents: listCreatorPublishEvents',
  'readDrafts: readLocalDrafts',
  'syncClient: syncCreatorClient',
]) {
  assertIncludes(dashboardLoadService, dashboardLoadMarker, `Dashboard load service ${dashboardLoadMarker}`)
}
for (const forbiddenDashboardRouteDataCall of [
  'listCreatorPublishEvents()',
  'readLocalDrafts()',
  'runCreatorDashboardLoad()',
  'syncCreatorClient()',
  'byNewestDraft',
  'byRequestPriority',
  'isDraftReadyForPublish',
]) {
  assertNotIncludes(dashboardRoute, forbiddenDashboardRouteDataCall, `Dashboard route must delegate ${forbiddenDashboardRouteDataCall}`)
}
for (const forbiddenDashboardViewModelDependency of [
  "from 'react'",
  'from "react"',
  '@/components/',
  '@/local-db/',
  '@/lib/pmfSupabase',
  'window.',
  'document.',
  'fetch(',
]) {
  assertNotIncludes(dashboardRouteViewModels, forbiddenDashboardViewModelDependency, `Dashboard view model must stay pure ${forbiddenDashboardViewModelDependency}`)
}

const externalEchoAuthorSurface = [
  echoRoute,
  echoActionService,
  echoLoadService,
  echoBrowserActionService,
  echoSignalViewModels,
  echoRouteViewModels,
  creatorExternalEchoInboxCard,
  creatorExternalEchoDetailPanel,
  creatorEchoPanels,
  creatorEchoDecisionPanels,
  creatorEchoWritingRail,
].join('\n')

for (const externalEchoMarker of [
  'export function CreatorEchoRoute',
  'const [readerSignals, setReaderSignals]',
  'const [signalSources, setSignalSources]',
  'const [creativeReminders, setCreativeReminders]',
  'const [savedView, setSavedView]',
  'const [workFilter, setWorkFilter]',
  'const [reminderFilter, setReminderFilter]',
  'const [sourceFilter, setSourceFilter]',
  'const [sortBy, setSortBy]',
  'runCreatorEchoLoad()',
  'runCreatorEchoReminderAction(signal, status)',
  'runCreatorEchoStatusUpdate(request, status)',
  'runCreatorEchoStartWriting(request)',
  'creatorFacingNotice(result.message)',
  'notice: `回声已更新为「${requestStatusLabel(result.data.status)}」。`',
  'notice: `创作提醒已更新为「${creativeReminderStatusLabel(updated.status)}」。`',
  'scheduleCreatorEchoVisibilityRefresh(load)',
  'subscribeCreatorEchoWorkspaceRefresh(refreshLocalEcho)',
  'openCreatorEchoReaderPerspective(',
  '/creator/editor?request=',
  '<CreatorExternalEchoInboxCard',
  '<CreatorExternalEchoDetailPanel',
  'CreatorEchoStatusStrip',
  'CreatorEchoNextActionPanel',
  'CreatorEchoDecisionPanel',
  'CreatorEchoWritingRail',
  "from './creatorEchoRouteViewModels'",
  'createCreatorEchoRouteViewModel({',
]) {
  assertIncludes(externalEchoAuthorSurface, externalEchoMarker, 'External Echo author flow ' + externalEchoMarker)
}
for (const echoRouteActionResultResidue of [
  '回声已更新为「${requestStatusLabel(',
  '创作提醒已更新为「${creativeReminderStatusLabel(',
]) {
  assertNotIncludes(echoRoute, echoRouteActionResultResidue, `External Echo route must not rebuild action result copy ${echoRouteActionResultResidue}`)
}

for (const signalViewModelMarker of [
  'export function resolveVisibleEchoSignals',
  'export function resolveSelectedEchoSignal',
  'export function resolvePriorityEchoSignal',
  'export function resolveRequestForSignal',
  'export function buildEchoSignalViewModel',
]) {
  assertIncludes(echoSignalViewModels, signalViewModelMarker, 'External Echo author view model ' + signalViewModelMarker)
}
for (const routeViewModelMarker of [
  'export interface CreatorEchoRouteViewModelInput',
  'export const creatorEchoSavedViews',
  'export function createCreatorEchoRouteViewModel',
  'resolveRequestForSignal(',
  'buildRequestClusterCounts(requests)',
  'selectedRequestCapabilities:',
  'visibleSignalRows',
]) {
  assertIncludes(echoRouteViewModels, routeViewModelMarker, 'External Echo aggregate route view model ' + routeViewModelMarker)
}
assertIncludes(echoRouteViewModels, 'resolveRequestForSignal(selectedSignal, requests)', 'request workflow is resolved from a normalized signal')
assertIncludes(echoRoute, '{selectedRequest ? (', 'request decision and status workflow renders only for a request-backed signal')
assertIncludes(echoRoute, 'onPin={() => void updateReminder(signal, \'pinned\')}', 'author can explicitly pin a suggested reminder')
assertIncludes(echoRoute, 'onUse={() => void updateReminder(signal, \'used\')}', 'author can mark a reminder as used')
assertIncludes(echoRoute, 'onDismiss={() => void updateReminder(signal, \'dismissed\')}', 'author can dismiss a reminder')
assertIncludes(echoActionService, 'await reminders.hydrate()', 'author reminder actions hydrate persisted state before mutation')
assertIncludes(echoActionService, 'reminders.update(current.id, status)', 'author reminder action persists through the reminder port')
assertIncludes(echoLoadService, 'local.suggestCreativeReminders(cached.signals)', 'deterministic suggestions are derived after source caching')
assertIncludes(echoLoadService, "freshness: 'offline'", 'offline flow retains a visible freshness state')

for (const inboxAuthorMarker of [
  '保存提醒',
  '已用在写作里',
  '先放下',
  'data-slot="creator-external-echo-card-source"',
  'data-slot="creator-external-echo-card-reminder"',
  'data-slot="creator-external-echo-card-actions"',
  'data-reader-signal-source',
  'data-reminder-status',
]) {
  assertIncludes(creatorExternalEchoInboxCard, inboxAuthorMarker, 'External Echo inbox author action ' + inboxAuthorMarker)
}
for (const detailBoundaryMarker of [
  '读者原话保持公开来源；你的判断只保存在本机。',
  '读者回声',
  '本机判断',
  'data-slot="creator-external-echo-detail-context"',
  'data-slot="creator-external-echo-detail-source"',
  'data-slot="creator-external-echo-detail-reminder"',
  'data-slot="creator-external-echo-detail-actions"',
  'data-slot="creator-external-echo-detail-empty"',
]) {
  assertIncludes(creatorExternalEchoDetailPanel, detailBoundaryMarker, 'External Echo public/private boundary ' + detailBoundaryMarker)
}
for (const nestedGlassOwner of ['CreatorActionBar', 'CreatorStatePanel']) {
  assertNotIncludes(creatorExternalEchoInboxCard + creatorExternalEchoDetailPanel, nestedGlassOwner, `External Echo canonical cards must not nest ${nestedGlassOwner}`)
}

for (const directLegacyUsage of [
  '<CreatorRequestStatusStrip',
  '<CreatorRequestNextActionPanel',
  '<CreatorRequestDecisionPanel',
  '<CreatorRequestWritingRail',
  '<CreatorRequestQueueCard',
]) {
  assertNotIncludes(echoRoute, directLegacyUsage, 'External Echo author flow must not directly mount legacy request component ' + directLegacyUsage)
}
for (const echoRouteDerivationResidue of [
  'buildRequestClusterCounts(requests)',
  'resolveVisibleEchoSignals(readerSignals, creativeReminders, {',
  'resolveReminderForSignal(',
  'resolveRequestForSignal(',
  'const savedViews:',
  'new Map(works.map(',
]) {
  assertNotIncludes(echoRoute, echoRouteDerivationResidue, 'External Echo route must delegate aggregate derivation ' + echoRouteDerivationResidue)
}
for (const echoRouteViewModelDependency of [
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
  assertNotIncludes(echoRouteViewModels, echoRouteViewModelDependency, 'External Echo route view model boundary ' + echoRouteViewModelDependency)
}
for (const pageLocalEchoOwner of [
  'function RequestQueueStatusStrip',
  'function RequestNextBestActionPanel',
  'function RequestDecisionQueuePanel',
]) {
  assertNotIncludes(echoRoute, pageLocalEchoOwner, 'External Echo route must not recreate page-local owner ' + pageLocalEchoOwner)
}

for (const echoStatusStripMarker of [
  'export function CreatorEchoStatusStrip',
  'data-slot="creator-echo-status-strip"',
  'data-slot="creator-echo-status-grid"',
  'data-slot="creator-echo-status-chip"',
  'data-slot="creator-echo-status-meta"',
  '当前显示',
  '外界回声概况',
  '当前回声视图',
]) {
  assertIncludes(creatorEchoStatusStrip, echoStatusStripMarker, 'External Echo status strip author flow ' + echoStatusStripMarker)
}
assertIncludes(creatorEchoPanels, "from './CreatorEchoStatusStrip'", 'External Echo barrel exports the status owner')

for (const compatibilityPanelMarker of [
  'export function CreatorEchoNextActionPanel',
  'export function CreatorEchoDecisionPanel',
  'data-slot="creator-echo-next-action"',
  'data-slot="creator-echo-next-action-quote"',
  'data-slot="creator-echo-next-action-context"',
  'data-slot="creator-echo-next-action-path"',
  'data-slot="creator-echo-next-action-actions"',
  '今天先写',
  '动笔前判断',
]) {
  assertIncludes(creatorEchoDecisionPanels, compatibilityPanelMarker, 'External Echo request compatibility panel ' + compatibilityPanelMarker)
}
for (const compatibilityRailMarker of [
  'export function CreatorEchoWritingRail',
  '写作入口',
  '查看读者视角',
  '确认暂不处理',
]) {
  assertIncludes(creatorEchoWritingRail, compatibilityRailMarker, 'External Echo request compatibility rail ' + compatibilityRailMarker)
}

assertNotIncludes(echoRoute, '>合并<', 'External Echo route must not imply a permanent cloud merge')
assertNotIncludes(creatorExternalEchoInboxCard, '合并 {viewModel.relatedCount}', 'normalized source aggregation must use non-destructive same-kind language')
for (const todayRouteMarker of [
  'CreatorTodayPriorityPanel',
  'CreatorDashboardPriorityPanel',
  'CreatorTodayPathPanel',
  'CreatorTodayEchoStatusPanel',
  'CreatorTodayContextRail',
  "from './creatorDashboardBrowserActionService'",
  'scheduleCreatorDashboardInitialLoad(sync)',
  'const metrics = [',
  'const steps = [',
  '外界回声',
  '私密草稿',
  '发布包',
  '读者更新',
  '回声走向',
  '等待判断',
  '进入创作',
  '公开回应',
  '当前创作上下文',
  'metrics={metrics}',
  'steps={steps}',
]) {
  assertIncludes(`${creator}\n${dashboardRoute}\n${creatorTodayRoutePanels}\n${creatorTodayPathPanel}\n${creatorTodayEchoStatusPanel}\n${creatorTodayContextRail}`, todayRouteMarker, `Dashboard author route ${todayRouteMarker}`)
}
for (const dashboardBrowserMarker of [
  'export interface CreatorDashboardBrowserPort',
  'export function scheduleCreatorDashboardInitialLoad',
]) {
  assertIncludes(dashboardBrowserActionService, dashboardBrowserMarker, `Dashboard browser action author flow ${dashboardBrowserMarker}`)
}
for (const dashboardRouteBrowserResidue of [
  'window.setTimeout',
  'window.clearTimeout',
]) {
  assertNotIncludes(dashboardRoute, dashboardRouteBrowserResidue, `Dashboard route must not own browser side effect ${dashboardRouteBrowserResidue}`)
}
for (const todayPriorityPanelMarker of [
  'export interface CreatorTodayFlowMetric',
  'export interface CreatorTodayFlowStep',
  '今日写作判断',
  '今日判断依据',
  '今日写作路线',
  'Tab 续句 · ⌘K 改写',
]) {
  assertIncludes(creatorTodayPriorityPanel, todayPriorityPanelMarker, `Today priority panel author route ${todayPriorityPanelMarker}`)
}
assertNotIncludes(creator, 'function TodayFlowRail', 'Dashboard route steps must stay inside CreatorTodayPriorityPanel')
assertNotIncludes(creator, 'function DashboardDecisionStrip', 'Dashboard judgment metrics must stay inside CreatorTodayPriorityPanel')

for (const editorMarker of [
  'export function CreatorEditorRoute',
  'export function readCreatorEditorRouteQuery',
  'readCreatorEditorRouteQuery(location.search)',
  "searchParams.get('request')",
  "searchParams.get('draft')",
  "searchParams.get('work')",
  "searchParams.get('branch')",
  'const authorReady = authorization?.authorized === true',
  'const canSaveDraft = authorReady && titleReady && contentReady && destinationReady',
  'resolveEditorRouteBootstrap({',
  'const latestDraft = [...drafts].sort(byNewestDraft)[0] || null',
  'const defaultDraft = routeDraft || (!requestId && !routeWorkId && !routeBranchId ? latestDraft : null)',
  'resolveEditorSelectedRequest({',
  'export function resolveEditorLinkedCreativeReminder',
  'runEditorStartupEffect({',
  'runEditorReminderBootstrap({',
  'applyEditorStartupStatePatchToReact',
  'applyEditorCommandStatePatchToReact',
  'applyEditorCandidateStatePatchToReact',
  'applyEditorDraftStatePatchToReact',
  'applyEditorUserActionStatePatchToReact',
  'resolveWritingCommand(command)',
  'resolveEditorAssistAction(action, noticeOverride)',
  'resolveReviewFix(label)',
  'resolveChapterDirectionSelection(direction)',
  'resolveChapterGoalConfirmation(direction)',
  'resolveDraftGuideContinuation()',
  'resolveAssistantSuggestionAcceptance({',
  'resolveEditorAssistDismissal()',
  'resolveGuideStepSelection(nextStep)',
  'resolveKeepAsIfBranchAction()',
  'creativeReminders.some(reminder => reminder.sourceSignalIds.includes(nextRequest.id))',
  "nextRequest.status === 'in_progress' ? 'pinned' : 'suggested'",
  'buildEditorLocalDraft({',
  'upsertLocalDraft(draft)',
  '保存后只会出现在当前设备。',
  '已打开最近的私密草稿。',
  'runEditorPublishCheckThroughAgent({',
  'navigate(handoff.targetPath)',
]) {
  assertIncludes(creator, editorMarker, `Writing desk author flow ${editorMarker}`)
}
assertIncludes(editorRoute, "from './creatorEditorRouteController'", 'Writing desk route imports its route-query owner')
for (const editorRouteQueryResidue of [
  'new URLSearchParams(',
  "searchParams.get('request')",
  "searchParams.get('draft')",
  "searchParams.get('work')",
  "searchParams.get('branch')",
]) {
  assertNotIncludes(editorRoute, editorRouteQueryResidue, `Writing desk route delegates query parsing ${editorRouteQueryResidue}`)
}
assertOnlyWithin(creator, 'upsertLocalDraft(draft)', 'export function CreatorEditorRoute', 'Draft save must happen in writing desk')
assertNotIncludes(editorRoute, 'readLocalCreativeReminders()', 'Writing desk must load reminders through creatorEditorReminderService')
assertNotIncludes(editorRoute, 'upsertLocalCreativeReminder({', 'Writing desk must write reminders through creatorEditorReminderService')
assertNotIncludes(editorRoute, 'prepareEditorPublishHandoff(', 'Writing desk must prepare publish handoff through creatorEditorPublishCheckService')
assertNotIncludes(editorRoute, "saveDraft('publish')", 'Writing desk must not enter publish check through the manual save wrapper')

for (const editorReminderMarker of [
  'export interface EditorReminderPersistencePort',
  'export function runEditorReminderLoad',
  'export function runEditorReminderBootstrap',
  'readAll: readLocalCreativeReminders',
  'upsert: upsertLocalCreativeReminder',
]) {
  assertIncludes(editorReminderService, editorReminderMarker, `Writing desk reminder service ${editorReminderMarker}`)
}

for (const editorPublishHandoffMarker of [
  'export function resolveEditorPublishHandoff',
  "kind: 'publish-bundle-draft-handoff'",
  'createPublishBundleDraftRecord(draft, nowIso)',
  'publishBundleDraftTargetPathForLocalDraftRef(draft.localDraftRef)',
]) {
  assertIncludes(
    editorPublishHandoffController,
    editorPublishHandoffMarker,
    `Writing desk publish handoff ${editorPublishHandoffMarker}`,
  )
}
for (const editorPublishHandoffServiceMarker of [
  'export interface EditorPublishHandoffPersistencePort',
  'export function prepareEditorPublishHandoff',
  'persistence.saveBundleDraft(handoff.bundleDraft)',
]) {
  assertIncludes(
    editorPublishHandoffService,
    editorPublishHandoffServiceMarker,
    `Writing desk publish handoff service ${editorPublishHandoffServiceMarker}`,
  )
}
for (const editorPublishCheckServiceMarker of [
  'export type RunEditorPublishCheckInput',
  'export interface RunEditorPublishCheckResult',
  'export async function runEditorPublishCheckAction',
  "action: 'publish'",
  'prepareEditorPublishHandoff(result.draft',
]) {
  assertIncludes(
    editorPublishCheckService,
    editorPublishCheckServiceMarker,
    `Writing desk publish check service ${editorPublishCheckServiceMarker}`,
  )
}
for (const editorDraftActionFlowServiceMarker of [
  'export async function runEditorManualDraftActionFlow',
  'export async function runEditorPublishCheckFlow',
  'runEditorDraftAction(input)',
  'runEditorPublishCheckAction(input)',
  'resetPort.scheduleReset(resetDraftAction)',
]) {
  assertIncludes(
    editorDraftActionFlowService,
    editorDraftActionFlowServiceMarker,
    `Writing desk draft action flow service ${editorDraftActionFlowServiceMarker}`,
  )
}
for (const editorDraftSubmitFlowServiceMarker of [
  'export async function runEditorManualDraftSubmitFlow',
  'export async function runEditorPublishCheckSubmitFlow',
  'buildEditorDraftActionInput({',
  'buildEditorPublishCheckInput(context)',
]) {
  assertIncludes(
    editorDraftSubmitFlowService,
    editorDraftSubmitFlowServiceMarker,
    `Writing desk draft submit flow service ${editorDraftSubmitFlowServiceMarker}`,
  )
}
for (const publishBundleDraftMarker of [
  'publishBundleDraftQueryKey',
  'legacyPublishDraftQueryKey',
  'resolvePublishBundleDraftRouteRef',
]) {
  assertIncludes(
    publishBundleDraftHandoff,
    publishBundleDraftMarker,
    `Writing desk publish bundle draft handoff ${publishBundleDraftMarker}`,
  )
}

for (const worksMarker of [
  'export function CreatorWorksRoute',
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
  'export interface CreatorWorksActionFlowPort',
  'export interface CreatorWorksActionFlowResult',
  'port.saveNotice(input.workId, input.authorNotice)',
  'port.hideWork(input.workId)',
  'port.archiveBranch(branch.id)',
  'port.createIfBranch({',
  'saveNotice: updateCreatorWorkNotice',
  "hideWork: workId => updateCreatorWorkStatus(workId, 'hidden')",
  "archiveBranch: branchId => updateCreatorBranchStatus(branchId, 'archived')",
  'createIfBranch: createCreatorIfBranch',
  'export interface CreatorWorksRouteViewModelInput',
  'export interface CreatorWorksRouteViewModel',
  'export function createCreatorWorksRouteViewModel',
  'const selectedBranchDecisionSteps:',
  'const branchRows = selectedWorkBranches.map(',
  'const workRows = works.map(',
  'selectedParentBranch',
  'selectedParentChapter',
  'data-slot="creator-branch-line-card"',
  'data-line-kind={isMain',
  'before:bg-[var(--creator-confirm)]',
  'before:bg-[var(--creator-accent)]',
  '确认隐藏作品',
  '确认归档支线',
]) {
  assertIncludes(worksRoute + worksActionFlowService + worksActionService + worksBrowserActionService + worksLoadService + worksRouteViewModels + creatorBranchLineCard, worksMarker, `Works author flow ${worksMarker}`)
}
for (const worksBrowserMarker of [
  'export interface CreatorWorksBrowserPort',
  'export function scheduleCreatorWorksInitialLoad',
]) {
  assertIncludes(worksBrowserActionService, worksBrowserMarker, `Works browser action author flow ${worksBrowserMarker}`)
}
for (const worksRouteBrowserResidue of [
  'window.setTimeout',
  'window.clearTimeout',
]) {
  assertNotIncludes(worksRoute, worksRouteBrowserResidue, `Works route must not own browser side effect ${worksRouteBrowserResidue}`)
}
for (const worksRouteDerivationResidue of [
  'requestCountForBranch(',
  'new Map<string, PmfChapter[]>',
  "request.status !== 'published'",
  "selectedBranch?.branch_type === 'if'",
  'branches.filter(branch => branch.work_id === work.id)',
]) {
  assertNotIncludes(worksRoute, worksRouteDerivationResidue, `Works route must not own pure derivation ${worksRouteDerivationResidue}`)
}
for (const worksRouteActionResidue of [
  'runCreatorWorkNoticeSave(',
  'runCreatorWorkHide(',
  'runCreatorBranchArchive(',
  'runCreatorIfBranchCreate(',
]) {
  assertNotIncludes(worksRoute, worksRouteActionResidue, `Works route must not own lower action call ${worksRouteActionResidue}`)
}
for (const worksActionFlowDependency of [
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
  assertNotIncludes(worksActionFlowService, worksActionFlowDependency, `Works action flow boundary ${worksActionFlowDependency}`)
}
for (const worksViewModelDependency of [
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
  assertNotIncludes(worksRouteViewModels, worksViewModelDependency, `Works route view model boundary ${worksViewModelDependency}`)
}

for (const publishMarker of [
  'export function CreatorPublishBundleRoute',
  'mustGates',
  'warningGates',
  'confirmGates',
  'readerLocationLabel',
  'anchorLabel',
  'const activeDraft = routeDraftRef',
  'drafts.find(draft => draft.localDraftRef === routeDraftRef) || null',
  '没有找到这份私密草稿，请回到写作台重新进入发布包确认。',
  'requestImpactLabel',
  'runCreatorPreparePublishBundle(input)',
  'runCreatorReviewPublishBundle(activeBundle.id)',
  'runConfirmedCreatorBundleConfirmation(activeBundle.id',
  'runConfirmedCreatorBundleExport(activeBundle.id',
  'runConfirmedCreatorBundleSubmit(activeBundle.id',
  'scheduleCreatorPublishBundleContextLoad(loadContext)',
  'scheduleCreatorPublishBundleRouteDraftRefresh(async () =>',
  'readCreatorPublishBundleLocalSnapshot(routeRefs)',
  'runCreatorPublishBundleContextEffect(',
  'runCreatorPublishBundleRouteDraftRefreshEffect(',
  'runCreatorPublishBundleManualRefreshEffect(',
  'submitBundle: publishOwnPlatformBundle',
  "status: 'published'",
  '发布未完成，正文仍保存在本机',
  '发布包也已保留',
  '确认这份发布包',
  '提交到阅读端',
  'lastPublished',
]) {
  assertIncludes(publishRoute + publishBundleActionService + publishBundleBrowserActionService + publishBundleRouteEffectService + publishBundleLoadService + publishBundleRouteController + publishBundleReactPatchApplier + publishBundleRouteViewModels + publishLifecycleViewModels + data + publishBundleAdapter, publishMarker, `Publish author flow ${publishMarker}`)
}
assertIncludes(publishBundleRouteEffectService, 'resolveCreatorPublishBundleRouteDraftRefreshPatch(localSnapshot, routeBundleDraftId)', 'Publish effect service consumes controller-owned route-draft recovery')
assertIncludes(publishRoute, 'applyCreatorPublishBundleLocalStatePatchToReact(', 'Publish route applies controller patches through the React patch owner')
assertIncludes(publishRoute, 'applyCreatorPublishBundleContextStatePatchToReact(', 'Publish route applies context patches through the React patch owner')
assertIncludes(publishBundleRouteController, 'export function resolveCreatorPublishBundleManualRefreshPatch', 'Publish controller owns local refresh fallback decisions')
assertIncludes(publishBundleReactPatchApplier, 'export function applyCreatorPublishBundleLocalStatePatchToReact', 'Publish React patch owner distributes local state updates')
assertIncludes(publishBundleReactPatchApplier, 'export function applyCreatorPublishBundleContextStatePatchToReact', 'Publish React patch owner distributes context state updates')
assertIncludes(publishBundleRouteEffectService, 'export interface CreatorPublishBundleRouteEffectPort', 'Publish effect service exposes replaceable load ports')
assertNotIncludes(publishRoute, 'runCreatorPublishBundleContextLoad(', 'Publish route must not invoke the lower context load directly')
assertNotIncludes(publishRoute, 'runCreatorPublishBundleLocalLoad(', 'Publish route must not invoke the lower local load directly')
assertIncludes(publishRoute, 'createCreatorPublishBundleRouteViewModel({', 'Publish route consumes the pure route view model')
assertIncludes(publishBundleRouteViewModels, 'publishBundleInput: CreatorPublishBundleInput | null', 'Publish route view model owns bundle input construction')
assertIncludes(publishLifecycleViewModels, 'export function resolveCreatorPublishBundleActiveRecord', 'Publish lifecycle view model owns active bundle selection')
assertNotIncludes(publishRoute, 'const routeDraft =', 'Publish route must not reconstruct route-draft recovery')
assertNotIncludes(publishRoute, 'const activeDraft = routeDraftRef', 'Publish route must not reconstruct active draft selection')
assertNotIncludes(publishRoute, 'function publishBundleInput()', 'Publish route must not construct PublishBundle input')
for (const publishBrowserMarker of [
  'export interface CreatorPublishBundleBrowserPort',
  'export function scheduleCreatorPublishBundleContextLoad',
  'export function scheduleCreatorPublishBundleRouteDraftRefresh',
]) {
  assertIncludes(publishBundleBrowserActionService, publishBrowserMarker, `Publish browser action author flow ${publishBrowserMarker}`)
}
assertNotIncludes(publishRoute, 'window.setTimeout', 'Publish route must delegate browser timers')
assertNotIncludes(publishRoute, 'window.clearTimeout', 'Publish route must delegate timer cleanup')
assertIncludes(publishBundleActionService, 'submitBundle: publishOwnPlatformBundle', 'Publishing adapter must only be surfaced through Publish action service')
assertNotIncludes(`${creator}\n${publishRoute}`, 'publishChapter({', 'Creator route code must not call the legacy direct publish helper')
assertIncludes(publishBundleAdapter, "await import('@/lib/pmfSupabase')", 'publish bundle adapter owns the isolated server transaction import')
assertNotIncludes(publishRoute, 'publishOwnPlatformBundle({', 'Publish route should call the action service instead of the adapter directly')

for (const settingsMarker of [
  'export function CreatorSettingsRoute',
  "from './creatorSettingsBrowserActionService'",
  "from './creatorSettingsRouteViewModels'",
  "from './creatorSettingsWorkspaceExportFlowService'",
  'runCreatorSettingsLoad',
  'createCreatorSettingsRouteViewModel({',
  'applyCreatorSettingsDisplayPreferences(preferences)',
  'runCreatorSettingsWorkspaceExport(preferences)',
  'saveCreatorWorkspacePreferences(preferences)',
  'clearCreatorWorkspacePreferences()',
  'CreatorLocalWorkspacePanel',
  'CreatorSettingsBoundaryStrip',
  'CreatorWorkspacePreferencesPanel',
  'CreatorSettingsStatusRail',
  'data-slot="creator-settings-boundary-strip"',
  'data-slot="creator-settings-boundary-list"',
  'data-slot="creator-settings-boundary-item"',
  'data-slot="creator-settings-boundary-status"',
  'data-slot="creator-settings-boundary-value"',
  'data-slot="creator-settings-boundary-detail"',
  'data-state={row.ready ? \'ready\' : \'pending\'}',
  'data-slot="creator-local-workspace-panel"',
  'data-slot="creator-local-workspace-content"',
  'data-slot="creator-local-workspace-rail"',
  'data-slot="creator-local-workspace-summary-list"',
  'data-slot="creator-local-workspace-summary-item"',
  'data-slot="creator-local-workspace-permission-list"',
  'data-slot="creator-local-workspace-permission-item"',
  'data-slot="creator-local-workspace-operation-list"',
  'data-slot="creator-local-workspace-operation-item"',
  'data-slot="creator-local-workspace-backup-actions"',
  'data-slot="creator-local-workspace-export-action"',
  'data-slot="creator-local-workspace-import-action"',
  'data-slot="creator-settings-status-rail"',
  'data-slot="creator-settings-status-card"',
  'data-slot="creator-settings-status-list"',
  'data-slot="creator-settings-status-item"',
  'data-slot="creator-settings-status-value"',
  'data-slot="creator-settings-readiness-list"',
  'data-slot="creator-settings-readiness-item"',
  'data-slot="creator-settings-readiness-status"',
  'data-slot="creator-settings-boundary-state-list"',
  'data-slot="creator-settings-boundary-state-item"',
  'data-slot="creator-settings-boundary-state-value"',
  'data-slot="creator-settings-promise-list"',
  'data-slot="creator-settings-promise-item"',
  '<dl',
  '<dt',
  '<dd',
  '本机工作区',
  '本机保存',
  '导出备份',
  '助手权限',
  '操作记录',
  '备份恢复',
  '当前状态',
  '工作台准备度',
  '公开边界',
  '发布承诺',
  '重置显示偏好',
  '减少动态效果',
  '减少透明效果',
  'listFeatureFlags: listCreatorFeatureFlags',
  'hydrateWorkspace: hydrateLocalWorkspace',
  'readWorkspaceSnapshot: readLocalWorkspaceSnapshot',
  'await local.hydrateWorkspace()',
  'await port.hydrateWorkspace()',
  "flagMap.get('creator_app_enabled')",
  "flagMap.get('reader_requests_enabled')",
  "flagMap.get('cloud_ai_runtime_enabled')",
  'export interface CreatorSettingsBrowserPort',
  'export interface CreatorSettingsBrowserTimerPort',
  'export function applyCreatorSettingsDisplayPreferences',
  'export function downloadCreatorWorkspacePackage',
  'export interface CreatorSettingsWorkspaceExportFlowPort',
  'export async function runCreatorSettingsWorkspaceExport',
  'readWorkspaceSnapshot: readCreatorSettingsWorkspaceSnapshot',
  'buildWorkspacePackage: buildLocalWorkspacePackage',
  'downloadWorkspacePackage: downloadCreatorWorkspacePackage',
  'export function scheduleCreatorSettingsActionReset',
  'export function scheduleCreatorSettingsRouteEffect',
  'dataset.creatorMotion',
  'dataset.creatorTransparency',
  'export type CreatorSettingsPhase',
  'export interface CreatorSettingsRouteViewModelInput',
  'export interface CreatorSettingsRouteViewModel',
  'export function createCreatorSettingsRouteViewModel',
  'const readinessItems:',
  'const workspaceSummaryItems:',
  'const operationItems =',
  'const permissionItems:',
]) {
  assertIncludes(`${creator}\n${settingsRoute}\n${settingsActionService}\n${settingsBrowserActionService}\n${settingsLoadService}\n${settingsHydrationService}\n${settingsRouteViewModels}\n${settingsWorkspaceExportFlowService}\n${creatorSettingsBoundaryStrip}\n${creatorLocalWorkspacePanel}\n${creatorWorkspacePreferencesPanel}\n${creatorSettingsStatusRail}`, settingsMarker, `Settings author flow ${settingsMarker}`)
}
for (const forbiddenSettingsBoundaryPattern of ['variant="glass"', 'pu-motion-lift', '<CardHeader', '<CardTitle', '<CardDescription']) {
  assertNotIncludes(
    creatorSettingsBoundaryStrip,
    forbiddenSettingsBoundaryPattern,
    `Settings boundary strip must not restore card-wall presentation ${forbiddenSettingsBoundaryPattern}`,
  )
}
if ([...creatorLocalWorkspacePanel.matchAll(/<Card(?:\s|>)/g)].length !== 1) {
  throw new Error('Settings local workspace must keep exactly one shadcn Card owner')
}
for (const forbiddenLocalWorkspacePresentation of ['rounded-lg', 'rounded-xl', 'pu-motion-lift']) {
  assertNotIncludes(
    creatorLocalWorkspacePanel,
    forbiddenLocalWorkspacePresentation,
    `Settings local workspace must not restore card-wall presentation ${forbiddenLocalWorkspacePresentation}`,
  )
}
if ([...creatorSettingsStatusRail.matchAll(/<Card(?:\s|>)/g)].length !== 1) {
  throw new Error('Settings status rail must keep exactly one shadcn Card owner')
}
for (const forbiddenSettingsStatusPresentation of ['rounded-lg', 'rounded-xl', 'pu-motion-lift']) {
  assertNotIncludes(
    creatorSettingsStatusRail,
    forbiddenSettingsStatusPresentation,
    `Settings status rail must not restore card-wall presentation ${forbiddenSettingsStatusPresentation}`,
  )
}
for (const forbiddenSettingsRouteDataCall of [
  'listCreatorFeatureFlags()',
  'readLocalAiSettings()',
  'writeLocalAiSettings(',
  'readLocalWorkspaceSnapshot()',
  'fetch(',
  'document.',
  'URL.createObjectURL',
  'URL.revokeObjectURL',
  'new Blob',
  'buildLocalWorkspacePackage({',
  'readCreatorSettingsWorkspaceSnapshot()',
  'downloadCreatorWorkspacePackage(',
  'new Date(',
  'const flagMap = new Map(',
  'function flagLabel(',
  'function flagState(',
  'workspaceSnapshot.operationRecords.slice(',
  'workspaceSummaryItems.reduce(',
  'creatorAgentActions.filter(',
]) {
  assertNotIncludes(settingsRoute, forbiddenSettingsRouteDataCall, `Settings route must delegate ${forbiddenSettingsRouteDataCall}`)
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
  assertNotIncludes(settingsRouteViewModels, settingsViewModelDependency, `Settings route view model boundary ${settingsViewModelDependency}`)
}
assertIncludes(creator, '<CreatorSettingsRoute />', 'LocalCreatorApp mounts the Settings route owner')
assertNotIncludes(creator, 'function SettingsPage()', 'Settings route body must not return to LocalCreatorApp')
for (const retiredSettingsActionBrowserOwnership of [
  'CreatorSettingsActionResetPort',
  'scheduleCreatorSettingsActionReset',
  'scheduleCreatorSettingsRouteEffect',
  'window.',
]) {
  assertNotIncludes(settingsActionService, retiredSettingsActionBrowserOwnership, `Settings action service must not own browser scheduling ${retiredSettingsActionBrowserOwnership}`)
}

for (const settingsOldMarker of [
  '私人写作服务',
  '测试连接',
  '服务地址',
  '服务名称',
  '访问凭证',
  '本地创作服务',
  '自带创作服务',
  '凭据状态',
  '检查服务',
  'CreatorSettingsToolPanel',
]) {
  assertNotIncludes(`${creator}\n${settingsRoute}\n${creatorAppFrame}\n${creatorWorkspacePreferencesPanel}`, settingsOldMarker, `Settings author flow old copy ${settingsOldMarker}`)
}

assertIncludes(qaRecord, 'allowlisted author account', 'M8 QA record keeps live author QA as remaining manual evidence')
assertIncludes(acceptance, '发布包确认', 'Acceptance doc covers PublishBundle confirmation')
assertIncludes(acceptance, '写作台', 'Acceptance doc covers writing desk')
assertIncludes(acceptance, '外界回声', 'Acceptance doc covers External Echo')

console.log('[creator-author-flow-contract] PASS')
