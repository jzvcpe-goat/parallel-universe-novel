import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function read(path: string) {
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) {
    throw new Error(`Missing required file: ${path}`)
  }
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

function assert(condition: boolean, label: string) {
  if (!condition) throw new Error(label)
}

function sliceBetween(body: string, startNeedle: string, endNeedle: string, label: string) {
  const start = body.indexOf(startNeedle)
  if (start === -1) {
    throw new Error(`${label}: missing start ${JSON.stringify(startNeedle)}`)
  }
  const end = body.indexOf(endNeedle, start)
  if (end === -1) {
    throw new Error(`${label}: missing end ${JSON.stringify(endNeedle)}`)
  }
  return body.slice(start, end)
}

function visibleFragments(body: string) {
  const fragments: string[] = []
  function looksLikeCodeFragment(text: string) {
    return /=>|\bconst\b|\blet\b|\bfunction\b|\buseState\b|\bnew URLSearchParams\b|\bset[A-Z]\w*\b|;\s*$/.test(text)
  }
  for (const match of body.matchAll(/(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g)) {
    const index = match.index || 0
    const lineStart = body.lastIndexOf('\n', index) + 1
    const lineEnd = body.indexOf('\n', index)
    const line = body.slice(lineStart, lineEnd === -1 ? body.length : lineEnd).trim()
    const before = body.slice(Math.max(0, index - 2), index)
    const after = body.slice(index + match[0].length, index + match[0].length + 2)
    if (/^(import|export)\s/.test(line)) continue
    if (/\bfrom\s+['"`]/.test(line) && /^[.@\w/-]+$/.test(match[2] || '')) continue
    if (before.endsWith('[') && after.startsWith(']')) continue
    fragments.push(match[2] || '')
  }
  for (const match of body.matchAll(/>([^<>{}][^<>{}]*)</g)) {
    const text = match[1] || ''
    if (looksLikeCodeFragment(text)) continue
    fragments.push(text)
  }
  return fragments
}

const localCreator = read('app/src/apps/creator/LocalCreatorApp.tsx')
const editorRoute = read('app/src/apps/creator/routes/CreatorEditorRoute.tsx')
const editorManuscript = read('app/src/apps/creator/routes/CreatorEditorManuscriptStage.tsx')
const editorController = read('app/src/apps/creator/routes/creatorEditorRouteController.ts')
const editorCommandController = read('app/src/apps/creator/routes/creatorEditorCommandController.ts')
const editorDestinationController = read('app/src/apps/creator/routes/creatorEditorDestinationController.ts')
const editorWorkspaceViewModelController = read('app/src/apps/creator/routes/creatorEditorWorkspaceViewModelController.ts')
const editorCandidateController = read('app/src/apps/creator/routes/creatorEditorCandidateController.ts')
const editorDraftController = read('app/src/apps/creator/routes/creatorEditorDraftController.ts')
const editorDraftPersistence = read('app/src/apps/creator/routes/creatorEditorDraftPersistence.ts')
const editorPublishHandoffController = read('app/src/apps/creator/routes/creatorEditorPublishHandoffController.ts')
const editorPublishHandoffService = read('app/src/apps/creator/routes/creatorEditorPublishHandoffService.ts')
const publishBundleDraftHandoff = read('app/src/features/creator-pivot/publishBundleDraftHandoff.ts')
const editorGuidance = read('app/src/apps/creator/routes/CreatorEditorGuidance.tsx')
const editorRails = read('app/src/apps/creator/routes/CreatorEditorRails.tsx')
const editorViewModels = read('app/src/apps/creator/routes/creatorEditorViewModels.ts')
const editorSocraticViewModels = read('app/src/apps/creator/routes/creatorEditorSocraticViewModels.ts')
const editorAssistantViewModels = read('app/src/apps/creator/routes/creatorEditorAssistantViewModels.ts')
const editorRecallViewModels = read('app/src/apps/creator/routes/creatorEditorRecallViewModels.ts')
const editorConversationSettingService = read('app/src/apps/creator/routes/creatorEditorConversationSettingService.ts')
const editorConversationTextEditService = read('app/src/apps/creator/routes/creatorEditorConversationTextEditService.ts')
const editorConversationReviewService = read('app/src/apps/creator/routes/creatorEditorConversationReviewService.ts')
const editorDecisionContextAdapter = read('app/src/apps/creator/routes/creatorEditorDecisionContextAdapter.ts')
const creatorConversationWorkspace = read('app/src/components/creator/workspace/CreatorConversationWorkspace.tsx')
const creatorConversationTimeline = read('app/src/components/creator/workspace/CreatorConversationTimeline.tsx')
const creatorRecallRail = read('app/src/components/creator/workspace/CreatorRecallRail.tsx')
const canonicalConversationalEditor = editorRoute.includes('CreatorConversationWorkspace')
const creator = `${localCreator}\n${editorRoute}\n${editorManuscript}\n${editorController}\n${editorCommandController}\n${editorDestinationController}\n${editorWorkspaceViewModelController}\n${editorCandidateController}\n${editorDraftController}\n${editorDraftPersistence}\n${editorPublishHandoffController}\n${editorPublishHandoffService}\n${publishBundleDraftHandoff}\n${editorGuidance}\n${editorRails}\n${editorViewModels}\n${editorSocraticViewModels}\n${editorAssistantViewModels}`
const creatorRouteRegistry = read('app/src/apps/creator/creatorRouteRegistry.ts')
const dashboardRoute = read('app/src/apps/creator/routes/CreatorDashboardRoute.tsx')
const dashboardBrowserActionService = read('app/src/apps/creator/routes/creatorDashboardBrowserActionService.ts')
const echoRoute = read('app/src/apps/creator/routes/CreatorEchoRoute.tsx')
const echoActionService = read('app/src/apps/creator/routes/creatorEchoActionService.ts')
const echoBrowserActionService = read('app/src/apps/creator/routes/creatorEchoBrowserActionService.ts')
const echoLoadService = read('app/src/apps/creator/routes/creatorEchoLoadService.ts')
const echoController = read('app/src/apps/creator/routes/creatorEchoRouteController.ts')
const echoSignalViewModels = read('app/src/apps/creator/routes/creatorEchoSignalViewModels.ts')
const echoRouteViewModels = read('app/src/apps/creator/routes/creatorEchoRouteViewModels.ts')
const publishRoute = read('app/src/apps/creator/routes/CreatorPublishBundleRoute.tsx')
const publishBundleActionService = read('app/src/apps/creator/routes/creatorPublishBundleActionService.ts')
const publishBundleBrowserActionService = read('app/src/apps/creator/routes/creatorPublishBundleBrowserActionService.ts')
const publishBundleLoadService = read('app/src/apps/creator/routes/creatorPublishBundleLoadService.ts')
const publishBundleReactPatchApplier = read('app/src/apps/creator/routes/creatorPublishBundleReactPatchApplier.ts')
const publishBundleRouteController = read('app/src/apps/creator/routes/creatorPublishBundleRouteController.ts')
const publishBundleRouteViewModels = read('app/src/apps/creator/routes/creatorPublishBundleRouteViewModels.ts')
const publishBundleRouteEffectService = read('app/src/apps/creator/routes/creatorPublishBundleRouteEffectService.ts')
const publishLifecycleViewModels = read('app/src/apps/creator/routes/creatorPublishLifecycleViewModels.ts')
const worksRoute = read('app/src/apps/creator/routes/CreatorWorksRoute.tsx')
const worksBrowserActionService = read('app/src/apps/creator/routes/creatorWorksBrowserActionService.ts')
const settingsRoute = read('app/src/apps/creator/routes/CreatorSettingsRoute.tsx')
const settingsActionService = read('app/src/apps/creator/routes/creatorSettingsActionService.ts')
const settingsBrowserActionService = read('app/src/apps/creator/routes/creatorSettingsBrowserActionService.ts')
const settingsLoadService = read('app/src/apps/creator/routes/creatorSettingsLoadService.ts')
const settingsRouteViewModels = read('app/src/apps/creator/routes/creatorSettingsRouteViewModels.ts')
const settingsWorkspaceExportFlowService = read('app/src/apps/creator/routes/creatorSettingsWorkspaceExportFlowService.ts')
const creatorViewHelpers = read('app/src/apps/creator/creatorViewHelpers.ts')
const creatorSessionService = read('app/src/apps/creator/creatorSessionService.ts')
const creatorAppFrame = read('app/src/components/creator/CreatorAppFrame.tsx')
const creatorFrameBoundaryService = read('app/src/components/creator/creatorFrameBoundaryService.ts')
const appEntry = read('app/src/main.tsx')
const hashRouteBridge = read('app/src/components/patterns/HashRouteBridge.tsx')
const hashRouteUtils = read('app/src/lib/hashRoute.ts')
const creatorDestinationPanels = read('app/src/components/creator/workspace/CreatorDestinationPanels.tsx')
const creatorCommitPanels = read('app/src/components/creator/workspace/CreatorCommitPanels.tsx')
const creatorStoryContextPanels = read('app/src/components/creator/workspace/CreatorStoryContextPanels.tsx')
const creatorSocraticPanels = read('app/src/components/creator/workspace/CreatorSocraticPanels.tsx')
const creatorAssistantSidecar = read('app/src/components/creator/workspace/CreatorAssistantSidecar.tsx')
const creatorCommandPalette = read('app/src/components/creator/workspace/CreatorCommandPalette.tsx')
const creatorCommandCandidate = read('app/src/components/creator/workspace/CreatorCommandCandidate.tsx')
const creatorReviewDock = read('app/src/components/creator/workspace/CreatorReviewDock.tsx')
const creatorQualityPanels = read('app/src/components/creator/workspace/CreatorQualityPanels.tsx')
const creatorImpactPanels = read('app/src/components/creator/workspace/CreatorImpactPanels.tsx')
const creatorInlineReviewPanels = read('app/src/components/creator/workspace/CreatorInlineReviewPanels.tsx')
const creatorProgressPanels = read('app/src/components/creator/workspace/CreatorProgressPanels.tsx')
const creatorDraftGuidancePanels = read('app/src/components/creator/workspace/CreatorDraftGuidancePanels.tsx')
const creatorPlanningPanels = read('app/src/components/creator/workspace/CreatorPlanningPanels.tsx')
const creatorDecisionPanels = read('app/src/components/creator/workspace/CreatorDecisionPanels.tsx')
const creatorInlineAssistantPanels = read('app/src/components/creator/workspace/CreatorInlineAssistantPanels.tsx')
const creatorAgentAssistantPanels = read('app/src/components/creator/workspace/CreatorAgentAssistantPanels.tsx')
const creatorWorkspaceShell = read('app/src/components/creator/workspace/CreatorWorkspaceShell.tsx')
const packageJson = read('package.json')
const creatorShell = read('app/src/components/creator/CreatorShell.tsx')
const creatorTodayNextStepsPanel = read('app/src/components/creator/CreatorTodayNextStepsPanel.tsx')
const creatorLoginSurfaces = read('app/src/components/creator/CreatorLoginSurfaces.tsx')
const creatorTodayPriorityPanel = read('app/src/components/creator/CreatorTodayPriorityPanel.tsx')
const creatorTodayRoutePanels = read('app/src/components/creator/CreatorTodayRoutePanels.tsx')
const creatorTodayPathPanel = read('app/src/components/creator/CreatorTodayPathPanel.tsx')
const creatorTodayEchoStatusPanel = read('app/src/components/creator/CreatorTodayEchoStatusPanel.tsx')
const creatorTodayContextRail = read('app/src/components/creator/CreatorTodayContextRail.tsx')
const creatorWorkReadinessPanel = read('app/src/components/creator/CreatorWorkReadinessPanel.tsx')
const creatorExternalEchoInboxCard = read('app/src/components/creator/CreatorExternalEchoInboxCard.tsx')
const creatorExternalEchoDetailPanel = read('app/src/components/creator/CreatorExternalEchoDetailPanel.tsx')
const creatorEchoQueueCard = read('app/src/components/creator/CreatorEchoQueueCard.tsx')
const creatorEchoStatusStrip = read('app/src/components/creator/CreatorEchoStatusStrip.tsx')
const creatorEchoDecisionPanels = read('app/src/components/creator/CreatorEchoDecisionPanels.tsx')
const creatorEchoWritingRail = read('app/src/components/creator/CreatorEchoWritingRail.tsx')
const creatorEchoPanels = read('app/src/components/creator/CreatorEchoPanels.tsx')
const creatorBranchLineCard = read('app/src/components/creator/CreatorBranchLineCard.tsx')
const creatorWorkStructureStrip = read('app/src/components/creator/CreatorWorkStructureStrip.tsx')
const creatorAuthorDecisionCard = read('app/src/components/creator/CreatorAuthorDecisionCard.tsx')
const creatorPublishContextPanel = read('app/src/components/creator/CreatorPublishBundleContextPanel.tsx')
const creatorPublishImpactStrip = read('app/src/components/creator/CreatorPublishBundleImpactStrip.tsx')
const creatorPublishReviewPanel = read('app/src/components/creator/CreatorPublishBundleReviewPanel.tsx')
const creatorSettingsBoundaryStrip = read('app/src/components/creator/CreatorSettingsBoundaryStrip.tsx')
const creatorLocalWorkspacePanel = read('app/src/components/creator/CreatorLocalWorkspacePanel.tsx')
const creatorWorkspacePreferencesPanel = read('app/src/components/creator/CreatorWorkspacePreferencesPanel.tsx')
const creatorSettingsStatusRail = read('app/src/components/creator/CreatorSettingsStatusRail.tsx')
const creatorExperienceSurface = `${creator}\n${dashboardRoute}\n${echoRoute}\n${echoRouteViewModels}\n${editorRoute}\n${worksRoute}\n${publishRoute}\n${publishBundleActionService}\n${publishBundleLoadService}\n${settingsRoute}\n${settingsActionService}\n${settingsLoadService}\n${settingsRouteViewModels}\n${creatorWorkspaceShell}\n${creatorDestinationPanels}\n${creatorCommitPanels}\n${creatorStoryContextPanels}\n${creatorSocraticPanels}\n${creatorAssistantSidecar}\n${creatorCommandPalette}\n${creatorCommandCandidate}\n${creatorReviewDock}\n${creatorQualityPanels}\n${creatorImpactPanels}\n${creatorInlineReviewPanels}\n${creatorProgressPanels}\n${creatorDraftGuidancePanels}\n${creatorPlanningPanels}\n${creatorDecisionPanels}\n${creatorInlineAssistantPanels}\n${creatorAgentAssistantPanels}\n${creatorLoginSurfaces}\n${creatorTodayPriorityPanel}\n${creatorTodayRoutePanels}\n${creatorWorkReadinessPanel}\n${creatorExternalEchoInboxCard}\n${creatorExternalEchoDetailPanel}\n${creatorEchoQueueCard}\n${creatorEchoStatusStrip}\n${creatorEchoDecisionPanels}\n${creatorEchoWritingRail}\n${creatorEchoPanels}\n${creatorBranchLineCard}\n${creatorWorkStructureStrip}\n${creatorPublishContextPanel}\n${creatorPublishImpactStrip}\n${creatorPublishReviewPanel}\n${creatorSettingsBoundaryStrip}\n${creatorLocalWorkspacePanel}\n${creatorWorkspacePreferencesPanel}\n${creatorSettingsStatusRail}`
const confirmDialog = read('app/src/components/creator/ConfirmActionDialog.tsx')
const localStatusPill = read('app/src/components/creator/LocalStatusPill.tsx')
const pmf = read('app/src/lib/pmfSupabase.ts')
const readerPmf = read('app/src/lib/pmfSupabaseReader.ts')
const localDraftRepository = read('app/src/local-db/creatorLocalDraftRepository.ts')
const localSettingAssetRepository = read('app/src/local-db/creatorLocalSettingAssetRepository.ts')
const localSettingsRepository = read('app/src/local-db/creatorLocalSettingsRepository.ts')
const legacyToolSettings = read('app/src/local-db/legacyCreatorToolSettings.ts')
const localReaderSignalRepository = read('app/src/local-db/creatorLocalReaderSignalRepository.ts')
const localWritingRepository = read('app/src/local-db/creatorLocalWritingRepository.ts')
const localWorkspaceRepository = read('app/src/local-db/creatorLocalWorkspaceRepository.ts')
const types = read('app/src/features/pmf/types.ts')
const css = read('app/src/index.css')
const tokens = read('app/src/styles/parallel-universe-tokens.css')
const registry = read('app/src/design-system/registry.ts')
const pageContracts = read('app/src/design-system/page-contracts.ts')
const agents = read('AGENTS.md')
const executionBlueprint = read('docs/product/CREATOR_UI_EXECUTION_BLUEPRINT.md')
const creatorVision = read('docs/product/creator-ui-vision.md')
const creatorFlows = read('docs/product/creator-user-flows.md')
const copyDictionary = read('docs/product/ui-copy-dictionary.md')
const bannedTerms = read('docs/product/banned-ui-terms.md')
const tokensDoc = read('docs/design-system/tokens.md')
const componentsDoc = read('docs/design-system/components.md')
const liquidGlassDoc = read('docs/design-system/liquid-glass.md')
const motionDoc = read('docs/design-system/motion.md')
const accessibilityDoc = read('docs/design-system/accessibility.md')
const creatorDataMap = read('docs/data-contracts/creator-data-map.md')
const requestStatusMachine = read('docs/data-contracts/request-status-machine.md')
const publishFlow = read('docs/data-contracts/publish-flow.md')
const draftBoundary = read('docs/data-contracts/draft-storage-boundary.md')
const implementationRules = read('docs/harness/implementation-rules.md')
const acceptanceTests = read('docs/harness/page-acceptance-tests.md')
const componentDod = read('docs/harness/component-dod.md')
const componentStateMatrix = read('docs/harness/creator-component-state-matrix.md')
const interactionPrimitiveAudit = read('docs/harness/creator-interaction-primitives-audit.md')
const visualRegression = read('docs/harness/visual-regression-checklist.md')
const qaRecord = read('docs/harness/creator-ui-m8-qa-20260628.md')
const requirementAudit = read('docs/harness/creator-ui-requirement-audit-20260628.md')
const alertDialogPrimitive = read('app/src/components/ui/alert-dialog.tsx')
const dialogPrimitive = read('app/src/components/ui/dialog.tsx')
const sheetPrimitive = read('app/src/components/ui/sheet.tsx')
const popoverPrimitive = read('app/src/components/ui/popover.tsx')
const dropdownMenuPrimitive = read('app/src/components/ui/dropdown-menu.tsx')
const selectPrimitive = read('app/src/components/ui/select.tsx')
const tabsPrimitive = read('app/src/components/ui/tabs.tsx')
const creatorWorkbenchRootCss = sliceBetween(
  css,
  '  .creator-workbench-app {',
  '  .creator-workbench-app input,',
  'Creator workbench root CSS',
)
const creatorWorkbenchMainCss = sliceBetween(
  css,
  '  .creator-workbench-main {',
  '  .creator-workbench-topbar {',
  'Creator workbench main CSS',
)

for (const label of ['今日创作路径', '外界回声', '灵感到正文', '本机写作智库', '写作台', '发布包', '本机工作区']) {
  assertIncludes(creatorRouteRegistry, `label: '${label}'`, `Pivot V2 shell navigation ${label}`)
}

for (const route of [
  '/creator/login',
  '/creator',
  '/creator/requests',
  '/creator/editor',
  '/creator/works',
  '/creator/publish',
  '/creator/settings',
]) {
  assertIncludes(creatorRouteRegistry, route, `creator route ${route}`)
}

assertIncludes(creatorRouteRegistry, 'creatorLegacyRoutes', 'Creator route registry owns legacy shell copy')
assertIncludes(creatorRouteRegistry, 'creatorPivotRoutes', 'Creator route registry owns Pivot V2 route targets')
assertIncludes(creatorRouteRegistry, 'getCreatorPivotRouteAliases', 'Creator route registry owns Pivot V2 route aliases')
assertIncludes(creatorRouteRegistry, 'resolveCreatorLegacyPath', 'Creator route registry resolves legacy-compatible render targets')
assertIncludes(creatorAppFrame, 'resolveCreatorPageCopy(activePath)', 'Creator frame reads route-aware page copy from registry')
assertIncludes(creatorAppFrame, 'getCreatorPivotNavItems(activePath)', 'Creator shell navigation uses Pivot V2 entries from registry')
assertIncludes(localCreator, "from './creatorSessionService'", 'LocalCreatorApp delegates session reads and login actions to session service')
assertIncludes(localCreator, 'readCreatorSession()', 'LocalCreatorApp reads author session through session service')
assertIncludes(localCreator, 'scheduleCreatorSessionRefresh(refresh)', 'LocalCreatorApp schedules initial session refresh through session service')
assertIncludes(localCreator, 'sendCreatorLoginLink(email)', 'LocalCreatorApp sends login link through session service')
assertIncludes(creatorSessionService, 'export async function readCreatorSession', 'Creator session service owns session read')
assertIncludes(creatorSessionService, 'export function sendCreatorLoginLink', 'Creator session service owns login-link send')
assertIncludes(creatorSessionService, 'export function scheduleCreatorSessionRefresh', 'Creator session service owns startup scheduling')
assertNotIncludes(localCreator, "from '@/lib/pmfSupabase'", 'LocalCreatorApp must not import the Supabase facade directly')
assertNotIncludes(localCreator, 'window.setTimeout', 'LocalCreatorApp must not own browser startup timers')
assertIncludes(creatorAppFrame, 'detectCreatorLocalSurface()', 'Creator frame reads local surface through frame boundary service')
assertIncludes(creatorAppFrame, 'signOutCreatorSession()', 'Creator frame signs out through frame boundary service')
assertIncludes(creatorAppFrame, 'bindCreatorFrameShortcuts({', 'Creator frame binds shortcuts through frame boundary service')
assertIncludes(creatorAppFrame, 'dispatchCreatorCommandCandidateApply(detail)', 'Creator frame dispatches candidate events through frame boundary service')
assertIncludes(creatorFrameBoundaryService, 'export function detectCreatorLocalSurface', 'Creator frame boundary owns local surface detection')
assertIncludes(creatorFrameBoundaryService, 'export function signOutCreatorSession', 'Creator frame boundary owns sign-out side effect')
assertIncludes(creatorFrameBoundaryService, 'export function bindCreatorFrameShortcuts', 'Creator frame boundary owns shortcut event binding')
assertIncludes(creatorFrameBoundaryService, 'export function dispatchCreatorCommandCandidateApply', 'Creator frame boundary owns command candidate browser event dispatch')
assertNotIncludes(creatorAppFrame, "from '@/lib/pmfSupabase'", 'Creator frame must not import the Supabase facade directly')
assertNotIncludes(creatorAppFrame, "from '@/local-db/creatorLocalSettingsRepository'", 'Creator frame must not import local settings repository directly')
assertNotIncludes(creatorAppFrame, 'window.addEventListener', 'Creator frame must not bind browser shortcut events directly')
assertNotIncludes(creatorAppFrame, 'window.dispatchEvent', 'Creator frame must not dispatch browser candidate events directly')
assertIncludes(creator, 'pivotRouteAliases.map(route =>', 'Creator app mounts Pivot route aliases from registry')
assertIncludes(creator, '<CreatorFrame session={session} refreshSession={refresh}>', 'LocalCreatorApp mounts the extracted Creator frame')
assertIncludes(creatorAppFrame, 'pageTitle={pageCopy.title}', 'Creator frame passes route-aware page title')
assertIncludes(creatorAppFrame, 'pageDescription={pageCopy.description}', 'Creator frame passes route-aware page description')
assertIncludes(creatorAppFrame, 'export function CreatorFrame', 'Creator frame shell lives outside LocalCreatorApp')
assertIncludes(creatorAppFrame, 'export function RequireCreator', 'Creator auth guard lives outside LocalCreatorApp')
assertNotIncludes(creator, 'function CreatorFrame(', 'LocalCreatorApp must not re-own CreatorFrame')
assertNotIncludes(creator, 'function RequireCreator(', 'LocalCreatorApp must not re-own RequireCreator')
assertIncludes(creatorShell, 'pageTitle: string', 'CreatorShell accepts route-aware title')
assertIncludes(creatorShell, 'pageDescription: string', 'CreatorShell accepts route-aware description')
assertIncludes(creatorShell, '{pageTitle}', 'CreatorShell renders provided title')
assertIncludes(creatorShell, '{pageDescription}', 'CreatorShell renders provided description')
assertIncludes(creatorShell, 'creator-workbench-page', 'CreatorShell uses Creator-owned page container')
assertIncludes(creatorShell, 'brandHref="/creator"', 'CreatorShell routes brand mark to Creator home')
assertIncludes(creatorShell, 'brandLabel="作者工作台"', 'CreatorShell uses Creator-owned brand label')
assertIncludes(creatorShell, 'brandIcon="creatorBrand"', 'CreatorShell uses a dedicated workbench brand icon instead of the writing-tab icon')
assertIncludes(creatorShell, 'brandTone="creator"', 'CreatorShell uses Creator visual tone for brand mark')
assertNotIncludes(creatorShell, 'narrative-page', 'CreatorShell must not reuse Reader narrative page container')
assertNotIncludes(creatorShell, 'sticky top-3', 'CreatorShell header must not cover long-form writing content')
assertIncludes(appEntry, "import { HashRouteBridge }", 'App entry imports the hash review-link bridge')
assertIncludes(appEntry, "import { normalizeInitialHashRoute }", 'App entry imports initial hash route normalization from lib')
assertIncludes(appEntry, 'normalizeInitialHashRoute(routerBaseName)', 'App entry normalizes initial hash review links before route redirects')
assertIncludes(appEntry, '<HashRouteBridge />', 'BrowserRouter branch mounts the hash review-link bridge')
assertIncludes(hashRouteBridge, "import { readHashRoute } from '@/lib/hashRoute'", 'HashRouteBridge keeps route parsing in lib helpers')
assertIncludes(hashRouteUtils, "hash.startsWith('#/')", 'Hash route helpers only handle route-shaped hashes')
assertIncludes(hashRouteUtils, 'window.history.replaceState', 'Hash route helpers normalize the initial URL before React route redirects')
assertIncludes(hashRouteBridge, 'navigate(route, { replace: true })', 'HashRouteBridge normalizes legacy hash review links')
assertIncludes(hashRouteBridge, "window.addEventListener('hashchange'", 'HashRouteBridge handles pasted hash route changes')
assertNotIncludes(hashRouteBridge, 'innerText', 'HashRouteBridge must remain non-visual infrastructure')
assertNotIncludes(hashRouteBridge, 'document.body', 'HashRouteBridge must not mutate visible DOM')
for (const icon of ['creatorHome', 'creatorInbox', 'creatorSpark', 'creatorWrite', 'creatorWorks', 'creatorPublish', 'creatorSettings']) {
  assertIncludes(creatorRouteRegistry, `icon: '${icon}'`, `Creator navigation uses dedicated icon ${icon}`)
}
for (const label of ['今日创作路径', '外界回声', '灵感到正文', '本机写作智库', '写作台', '发布包', '本机工作区']) {
  assertIncludes(creatorRouteRegistry, `label: '${label}'`, `Pivot V2 navigation target ${label}`)
}
assertIncludes(creatorLoginSurfaces, 'export function CreatorLoginPanel', 'login panel lives in Creator components')
assertIncludes(creatorLoginSurfaces, 'export function CreatorAccessGate', 'signed-out Creator routes use one access-gate component')
assertIncludes(creatorLoginSurfaces, 'data-slot="creator-access-gate"', 'signed-out access gate exposes one stable root')
assertIncludes(creatorLoginSurfaces, 'data-slot="creator-access-capabilities"', 'signed-out access gate exposes a semantic capability list')
assertNotIncludes(creatorLoginSurfaces, 'CreatorLockedWorkbenchPreview', 'retired locked queue preview stays deleted')
assertNotIncludes(creatorLoginSurfaces, 'locked-workbench-preview', 'retired locked queue hook stays deleted')
assertNotIncludes(creatorLoginSurfaces, '待处理队列', 'signed-out access must not imitate a request backend')
assertNotIncludes(creatorLoginSurfaces, 'CreatorLocalLoopPanel', 'redundant static Today loop owner must stay deleted')
assertNotIncludes(creatorLoginSurfaces, 'local-creator-loop', 'retired static Today loop hooks must stay deleted')
assertIncludes(creatorAppFrame, '<CreatorAccessGate preview={preview} onLogin={() => navigate(\'/creator/login\')} />', 'Creator frame renders one signed-out access gate')
assertIncludes(creator, '<CreatorDashboardRoute />', 'LocalCreatorApp mounts the Today route owner')
assertIncludes(creator, '<CreatorWorksRoute />', 'LocalCreatorApp mounts the Works route owner')
assertIncludes(creator, '<CreatorPublishBundleRoute />', 'LocalCreatorApp mounts the Publish route owner')
assertIncludes(dashboardRoute, "from './creatorDashboardBrowserActionService'", 'Today route delegates browser scheduling through service')
assertIncludes(dashboardRoute, 'scheduleCreatorDashboardInitialLoad(sync)', 'Today route schedules initial load through service')
assertIncludes(dashboardBrowserActionService, 'export interface CreatorDashboardBrowserPort', 'Today browser action service exposes replaceable browser port')
assertIncludes(dashboardBrowserActionService, 'export function scheduleCreatorDashboardInitialLoad', 'Today browser action service owns initial load scheduling')
assertNotIncludes(dashboardRoute, 'window.setTimeout', 'Today route must not own browser timers')
assertNotIncludes(dashboardRoute, 'window.clearTimeout', 'Today route must not own timer cleanup')
for (const dashboardBrowserServiceForbidden of [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
]) {
  assertNotIncludes(dashboardBrowserActionService, dashboardBrowserServiceForbidden, `Today browser action service boundary ${dashboardBrowserServiceForbidden}`)
}
assertNotIncludes(dashboardRoute, 'CreatorLocalLoopPanel', 'Today route must not restore the redundant static loop')
assertIncludes(creatorLoginSurfaces, '回到你的创作现场', 'login copy returns the author to a writing context')
assertIncludes(creatorLoginSurfaces, '候选内容不会自动进入正式作品', 'signed-out copy preserves candidate-first author control')
assertIncludes(creatorLoginSurfaces, '未登录只读', 'signed-out route states its read-only boundary')
assertNotIncludes(creator, 'function LockedWorkbenchPreview', 'locked preview must not return as page-local helper')
assertNotIncludes(creator, 'function LocalCreatorLoopPanel', 'local loop must not return as page-local helper')
assertNotIncludes(creator, '预览模式', 'signed-out Creator routes must not look like product demo mode')
assertNotIncludes(creator, 'actionLabel="登录后可用"', 'signed-out Creator routes must not render explanatory card CTAs')
assertIncludes(dashboardRoute, '<CreatorDashboardPriorityPanel', 'Today route renders dashboard priority through Creator component')
assertIncludes(dashboardRoute, '<CreatorTodayPathPanel', 'Today route renders the atomic path through Creator component')
assertIncludes(dashboardRoute, '<CreatorTodayEchoStatusPanel', 'Today route renders Echo trajectory through Creator component')
assertIncludes(dashboardRoute, '<CreatorTodayContextRail', 'Today route renders context rail through Creator component')
assertIncludes(dashboardRoute, 'data-slot="creator-today-context-column"', 'Today route exposes a stable context-column slot')
assertIncludes(dashboardRoute, 'xl:sticky xl:top-4 xl:self-start', 'Today desktop context column remains sticky')
assertIncludes(creatorTodayRoutePanels, 'export function CreatorDashboardPriorityPanel', 'Today priority wrapper lives in Creator components')
assertIncludes(creatorTodayPathPanel, 'export function CreatorTodayPathPanel', 'Today path panel lives in Creator components')
assertIncludes(creatorTodayEchoStatusPanel, 'export function CreatorTodayEchoStatusPanel', 'Today Echo status panel lives in Creator components')
assertIncludes(creatorTodayContextRail, 'export function CreatorTodayContextRail', 'Today context rail lives in Creator components')
assertIncludes(creatorTodayRoutePanels, '<CreatorTodayPriorityPanel', 'Today priority wrapper composes the lower-level priority panel')
assertIncludes(creatorTodayRoutePanels, 'metrics={metrics}', 'Today priority wrapper owns judgment metric mapping')
assertIncludes(creatorTodayRoutePanels, 'steps={steps}', 'Today priority wrapper owns route step mapping')
assertIncludes(creatorTodayPathPanel, '<ol data-slot="creator-today-path-list"', 'Today path uses a semantic ordered list')
assertNotIncludes(creatorTodayPathPanel, '<Panel', 'Today path must not introduce nested glass Panels')
assertIncludes(creatorTodayEchoStatusPanel, 'aria-label="外界回声走向"', 'Today Echo status exposes semantic context')
assertNotIncludes(creatorTodayEchoStatusPanel, 'LiquidGlassMetric', 'Today Echo status must not rebuild nested metric cards')
assertIncludes(creatorTodayContextRail, 'aria-label="当前创作上下文"', 'Today context rail exposes semantic context')
assertIncludes(creatorTodayContextRail, '<dl', 'Today context rail uses a semantic description list')
assertNotIncludes(creatorTodayContextRail, '<Panel', 'Today context rail must not rebuild nested glass Panels')
assertNotIncludes(creatorTodayContextRail, 'LiquidGlass', 'Today context rail must stay on shadcn Card')
assertNotIncludes(dashboardRoute, 'function TodayMetricCard(', 'Today metric helper must not return to the route')
assertNotIncludes(creatorTodayRoutePanels, 'CreatorTodayCategoryCard', 'retired Today category card must not return')
assertNotIncludes(creator, 'function DashboardPriorityPanel(', 'Today priority wrapper must not return as page-local helper')
assertNotIncludes(creator, 'function TodayCategoryCard(', 'Today category cards must not return as page-local helpers')
assertNotIncludes(creator, 'function DashboardPage()', 'Today route body must not return to LocalCreatorApp')
assertNotIncludes(creator, 'function WorksPage()', 'Works route body must not return to LocalCreatorApp')
assertNotIncludes(creator, 'function PublishCheckPage()', 'Publish route body must not return to LocalCreatorApp')

for (const componentName of ['CreatorEchoQueueCard', 'CreatorEchoStatusStrip', 'CreatorEchoNextActionPanel', 'CreatorEchoDecisionPanel', 'CreatorBranchLineCard', 'CreatorEditorReadinessStrip', 'ConfirmActionDialog', 'LocalStatusPill']) {
  assertIncludes(registry, componentName, `design-system registry includes ${componentName}`)
  assertIncludes(pageContracts, componentName, `page contracts include ${componentName}`)
}

for (const doc of [
  ['AGENTS.md', agents],
  ['creator execution blueprint', executionBlueprint],
  ['creator-ui-vision', creatorVision],
  ['creator-user-flows', creatorFlows],
  ['ui-copy-dictionary', copyDictionary],
  ['banned-ui-terms', bannedTerms],
  ['design tokens doc', tokensDoc],
  ['components doc', componentsDoc],
  ['liquid glass doc', liquidGlassDoc],
  ['motion doc', motionDoc],
  ['accessibility doc', accessibilityDoc],
  ['creator data map', creatorDataMap],
  ['request status machine', requestStatusMachine],
  ['publish flow', publishFlow],
  ['draft storage boundary', draftBoundary],
  ['implementation rules', implementationRules],
  ['page acceptance tests', acceptanceTests],
  ['component DoD', componentDod],
  ['creator component state matrix', componentStateMatrix],
  ['creator interaction primitives audit', interactionPrimitiveAudit],
  ['visual regression checklist', visualRegression],
  ['creator requirement audit', requirementAudit],
] as Array<[string, string]>) {
  assertIncludes(doc[1], 'Creator', `${doc[0]} documents Creator scope`)
}

for (const doc of [agents, draftBoundary, implementationRules, acceptanceTests, componentDod, componentStateMatrix]) {
  assertIncludes(doc, 'local', 'M0/M1 docs must state local-first Creator boundary')
}

assertIncludes(implementationRules, 'Current Repository Baseline', 'implementation rules include current repository summary')
assertIncludes(implementationRules, 'File-Level M0/M1 Plan', 'implementation rules include file-level M0/M1 plan')
assertIncludes(implementationRules, 'CREATOR_UI_EXECUTION_BLUEPRINT.md', 'implementation rules point to execution blueprint')
assertIncludes(executionBlueprint, 'Manual Product Decisions', 'execution blueprint includes manual product decision table')
assertIncludes(executionBlueprint, 'Backend Capability To UI Map', 'execution blueprint maps backend capability to UI')
assertIncludes(executionBlueprint, 'Information Architecture', 'execution blueprint includes IA')
assertIncludes(executionBlueprint, 'Implementation Milestones', 'execution blueprint includes staged milestones')
assertIncludes(executionBlueprint, '已收到 -> 已看到 -> 处理中 -> 已发布', 'execution blueprint includes request state machine')
assertIncludes(executionBlueprint, 'npm run test:creator', 'execution blueprint includes Creator test command')
assertIncludes(draftBoundary, 'Local-only', 'draft storage boundary defines local-only rules')
assertIncludes(draftBoundary, 'Cloud publish boundary', 'draft storage boundary defines publish boundary')
assertIncludes(acceptanceTests, 'Creator Shell', 'page acceptance tests include M1 Creator Shell checks')
assertIncludes(componentDod, 'loading', 'component DoD requires loading states')
assertIncludes(componentDod, 'success', 'component DoD requires success states')
assertIncludes(componentDod, 'disabled', 'component DoD requires disabled states')
for (const componentName of [
  'CreatorShell',
  'CreatorActionBar',
  'CreatorTodayNextStepsPanel',
  'CreatorEchoQueueCard',
  'CreatorBranchLineCard',
  'CreatorStatePanel',
  'ConfirmActionDialog',
  'LocalStatusPill',
  'CreatorEditorReadinessStrip',
]) {
  assertIncludes(componentStateMatrix, `\`${componentName}\``, `component state matrix includes ${componentName}`)
}
for (const stateName of ['Loading', 'Empty', 'Error', 'Disabled', 'Success', 'Confirmation']) {
  assertIncludes(componentStateMatrix, stateName, `component state matrix covers ${stateName}`)
}
assertIncludes(componentStateMatrix, 'New Creator components must be added to this matrix', 'component state matrix has update rule')
for (const [primitiveName, primitiveBody, radixPackage] of [
  ['Alert Dialog', alertDialogPrimitive, '@radix-ui/react-alert-dialog'],
  ['Dialog', dialogPrimitive, '@radix-ui/react-dialog'],
  ['Sheet', sheetPrimitive, '@radix-ui/react-dialog'],
  ['Popover', popoverPrimitive, '@radix-ui/react-popover'],
  ['Dropdown Menu', dropdownMenuPrimitive, '@radix-ui/react-dropdown-menu'],
  ['Select', selectPrimitive, '@radix-ui/react-select'],
  ['Tabs', tabsPrimitive, '@radix-ui/react-tabs'],
] as Array<[string, string, string]>) {
  assertIncludes(interactionPrimitiveAudit, primitiveName, `interaction primitive audit includes ${primitiveName}`)
  assertIncludes(primitiveBody, radixPackage, `${primitiveName} primitive uses ${radixPackage}`)
}
assertIncludes(interactionPrimitiveAudit, 'Do not create page-local floating div menus', 'interaction primitive audit bans hand-rolled menus')
assertIncludes(visualRegression, 'Creator Shell', 'visual regression checklist includes Creator Shell checks')
assertIncludes(visualRegression, 'qa:local-creator-routes', 'visual regression checklist references local Creator route QA')
assertIncludes(packageJson, '"qa:local-creator-routes"', 'package scripts include local Creator route QA')
assertIncludes(qaRecord, 'creator-ui-requirement-audit-20260628.md', 'M8 QA record links Creator requirement audit')
assertIncludes(requirementAudit, 'Requirement Evidence', 'requirement audit maps objective evidence')
assertIncludes(requirementAudit, 'Page Requirements', 'requirement audit maps page evidence')
assertIncludes(requirementAudit, 'No fake permanent merge without merge columns', 'requirement audit documents P0 similar-request boundary')
assertIncludes(requirementAudit, 'All commands above passed in this worktree', 'requirement audit records command status')

assertIncludes(confirmDialog, 'AlertDialogTrigger asChild', 'confirm dialog uses shadcn/Radix alert trigger')
assertIncludes(confirmDialog, 'AlertDialogCancel asChild', 'confirm dialog uses explicit cancel action')
assertIncludes(confirmDialog, 'const [pending, setPending] = useState(false)', 'confirm dialog exposes loading state')
assertIncludes(confirmDialog, '操作未完成，请稍后再试。', 'confirm dialog exposes product-safe failure copy')
assertIncludes(confirmDialog, "variant?: 'gold' | 'destructive'", 'confirm dialog supports destructive confirmation variant')
assertIncludes(confirmDialog, 'onConfirm', 'confirm dialog exposes confirm callback')
assertIncludes(creatorTodayNextStepsPanel, "phase: 'loading' | 'ready' | 'error'", 'Today next steps panel exposes route phases')
assertIncludes(creatorTodayNextStepsPanel, 'data-slot="creator-today-next-steps-empty"', 'Today next steps panel exposes an empty state')
assertIncludes(creatorTodayNextStepsPanel, 'data-slot="creator-today-next-steps-error"', 'Today next steps panel exposes an error state')
assertIncludes(creatorTodayNextStepsPanel, 'disabled={item.disabled || busy}', 'Today next steps panel exposes disabled actions')
assertIncludes(localStatusPill, 'isLocalSurface', 'local status pill is driven by local surface state')
assertIncludes(localStatusPill, '本机写作', 'local status pill identifies the writable local surface')
assertIncludes(localStatusPill, '只读预览', 'remote preview uses a truthful non-error state')
assertNotIncludes(localStatusPill, '创作端不可用', 'remote preview must not present the product as broken')

for (const table of [
  'works',
  'branches',
  'chapters',
  'reader_requests',
  'publish_events',
  'creator_clients',
  'creator_authorizations',
  'feature_flags',
]) {
  assertIncludes(pmf, `.from('${table}')`, `data access ${table}`)
}

assertIncludes(types, "export type PmfRequestStatus =\n  | 'pending'\n  | 'acknowledged'\n  | 'in_progress'\n  | 'published'\n  | 'rejected'", 'request status union')

for (const echoRouteBoundaryMarker of [
  "from './creatorEchoActionService'",
  "from './creatorEchoBrowserActionService'",
  "from './creatorEchoLoadService'",
  "from './creatorEchoRouteController'",
  "from './creatorEchoSignalViewModels'",
  'CreatorExternalEchoInboxCard',
  'CreatorExternalEchoDetailPanel',
]) {
  assertIncludes(echoRoute, echoRouteBoundaryMarker, 'External Echo route boundary ' + echoRouteBoundaryMarker)
}

for (const echoSignalViewModelMarker of [
  'export function resolveVisibleEchoSignals',
  'export function buildEchoSignalViewCounts',
  'export function buildEchoSourceRows',
  'export function resolveSelectedEchoSignal',
  'export function resolvePriorityEchoSignal',
  'export function buildEchoSignalViewModel',
  'export function buildPriorityEchoSignalAction',
  'export function echoFreshnessLabel',
]) {
  assertIncludes(echoSignalViewModels, echoSignalViewModelMarker, 'External Echo signal view-model owner ' + echoSignalViewModelMarker)
}
for (const echoSignalViewModelForbidden of [
  'from \'react\'',
  'from "react"',
  '@/components/',
  '@/lib/pmfSupabase',
  '@/local-db/creator',
  'window.',
  'localStorage',
  'fetch(',
]) {
  assertNotIncludes(echoSignalViewModels, echoSignalViewModelForbidden, 'External Echo signal view models must stay pure without ' + echoSignalViewModelForbidden)
}
assertIncludes(echoSignalViewModels, "from '@/local-db/schema'", 'External Echo signal view models may consume local domain schema types')

for (const echoLoadBoundaryMarker of [
  'export interface CreatorEchoLoadApiPort',
  'export interface CreatorEchoLoadLocalPort',
  'export async function runCreatorEchoLoad',
  'listSignalBatches: listCreatorEchoSourceBatches',
  'cacheReaderSignals: cacheReaderSignalBatches',
  'suggestCreativeReminders: suggestLocalCreativeReminders',
  'await local.hydrate()',
  'local.cacheReaderSignals(batchResult.data)',
  'local.suggestCreativeReminders(cached.signals)',
  "freshness: 'offline'",
]) {
  assertIncludes(echoLoadService, echoLoadBoundaryMarker, 'External Echo load ownership ' + echoLoadBoundaryMarker)
}

for (const echoBrowserBoundaryMarker of [
  'export interface CreatorEchoBrowserPort',
  'export function scheduleCreatorEchoInitialLoad',
  'export function scheduleCreatorEchoActionReset',
  'export function scheduleCreatorEchoVisibilityRefresh',
  'export function subscribeCreatorEchoWorkspaceRefresh',
  'export function openCreatorEchoReaderPerspective',
  'getVisibilityState: () => document.visibilityState',
]) {
  assertIncludes(echoBrowserActionService, echoBrowserBoundaryMarker, 'External Echo browser action boundary ' + echoBrowserBoundaryMarker)
}
for (const echoBrowserServiceForbidden of [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
]) {
  assertNotIncludes(echoBrowserActionService, echoBrowserServiceForbidden, 'External Echo browser service must stay outside React/UI ownership ' + echoBrowserServiceForbidden)
}
for (const echoRouteBrowserUsage of [
  'scheduleCreatorEchoInitialLoad(load)',
  'scheduleCreatorEchoVisibilityRefresh(load)',
  'subscribeCreatorEchoWorkspaceRefresh(refreshLocalEcho)',
  'openCreatorEchoReaderPerspective(',
]) {
  assertIncludes(echoRoute, echoRouteBrowserUsage, 'External Echo route delegates browser behavior ' + echoRouteBrowserUsage)
}
for (const echoRouteSideEffectResidue of [
  'listCreatorEchoSourceBatches(',
  'cacheReaderSignalBatches(',
  'suggestLocalCreativeReminders(',
  'readLocalCreativeReminders()',
  'updateLocalCreativeReminder(',
  'window.open',
  'window.setTimeout',
  'window.clearTimeout',
]) {
  assertNotIncludes(echoRoute, echoRouteSideEffectResidue, 'External Echo route must not own ' + echoRouteSideEffectResidue)
}

for (const echoControllerMarker of [
  'export function canMoveRequestStatus',
  'export function canStartRequestWriting',
  'export function requestIntentLabel',
  'export function requestAuthorDecision',
  'export function requestWritingQuestion',
  'export function buildSelectedEchoDecisionCards',
]) {
  assertIncludes(echoController, echoControllerMarker, 'request compatibility controller marker ' + echoControllerMarker)
}
for (const echoRouteDecisionResidue of [
  'function requestIntentLabel',
  'function requestAuthorDecision',
  'function requestWritingQuestion',
  'function buildRequestClusterCounts',
  'function resolveVisibleEchoSignals',
  'function buildEchoSignalViewModel',
]) {
  assertNotIncludes(echoRoute, echoRouteDecisionResidue, 'External Echo route must not re-own decision helper ' + echoRouteDecisionResidue)
}
assertIncludes(echoActionService, 'if (!canMoveRequestStatus(request.status, status))', 'request compatibility transition guard belongs to the action service')
assertIncludes(echoActionService, "currentRequest.status === 'acknowledged'", 'request compatibility start-writing flow acknowledges before in-progress')
assertIncludes(echoRouteViewModels, "canMoveRequestStatus(selectedRequest.status, 'acknowledged')", 'selected request compatibility rail exposes transition capability')
assertIncludes(echoRouteViewModels, "canMoveRequestStatus(selectedRequest.status, 'rejected')", 'selected request compatibility rail exposes reject capability')
assertIncludes(echoRoute, '{selectedRequest ? (', 'request-only decision and writing rail is conditional on a normalized request source')
assertIncludes(echoRoute, 'runCreatorEchoStartWriting(request)', 'External Echo route delegates request-compatible writing transition')

for (const normalizedEchoRouteMarker of [
  'resolveVisibleEchoSignals(readerSignals, creativeReminders, {',
  'resolveSelectedEchoSignal(visibleSignals, selectedSignalId)',
  'resolvePriorityEchoSignal(readerSignals, creativeReminders)',
  'resolveRequestForSignal(selectedSignal, requests)',
  'buildEchoSourceRows(readerSignals)',
  'buildEchoSignalViewModel(signal, reminder, workMap, branchMap)',
  'buildPriorityEchoSignalAction(prioritySignal, priorityReminder, workMap, branchMap)',
  '<CreatorExternalEchoInboxCard',
  '<CreatorExternalEchoDetailPanel',
  'onPin={() => void updateReminder(signal, \'pinned\')}',
  'onUse={() => void updateReminder(signal, \'used\')}',
  'onDismiss={() => void updateReminder(signal, \'dismissed\')}',
]) {
  assertIncludes(echoRoute + echoRouteViewModels, normalizedEchoRouteMarker, 'External Echo normalized inbox usage ' + normalizedEchoRouteMarker)
}

for (const inboxCardMarker of [
  'export function CreatorExternalEchoInboxCard',
  'data-slot="creator-external-echo-card"',
  'data-slot="creator-external-echo-card-header"',
  'data-slot="creator-external-echo-card-source"',
  'data-slot="creator-external-echo-card-reminder"',
  'data-slot="creator-external-echo-card-actions"',
  'data-state={selected ? \'selected\' : \'idle\'}',
  'data-reader-signal-id={viewModel.id}',
  'data-reader-signal-source={viewModel.sourceLabel}',
  'data-reminder-status={viewModel.reminderStatus}',
  'CardFooter',
  '<figure',
  '<section',
  '保存提醒',
  '已用在写作里',
  '先放下',
  '同类 {viewModel.relatedCount}',
]) {
  assertIncludes(creatorExternalEchoInboxCard, inboxCardMarker, 'External Echo inbox card contract ' + inboxCardMarker)
}
for (const inboxPrimitive of ['Card', 'Badge', 'Button']) {
  assertIncludes(creatorExternalEchoInboxCard, '@/components/ui/' + inboxPrimitive.toLowerCase(), 'External Echo inbox card composes shadcn ' + inboxPrimitive)
}
assertNotIncludes(creatorExternalEchoInboxCard, '合并 {viewModel.relatedCount}', 'normalized signal aggregation must not imply a permanent cloud merge')
assertNotIncludes(creatorExternalEchoInboxCard, 'CreatorActionBar', 'External Echo inbox card must not nest a glass action bar')
assertNotIncludes(creatorExternalEchoInboxCard, "className={cn('creator-external-echo-card'", 'External Echo inbox card must not restore the retired CSS hook')
for (const detailPanelMarker of [
  'export function CreatorExternalEchoDetailPanel',
  'data-slot="creator-external-echo-detail"',
  'data-slot="creator-external-echo-detail-context"',
  'data-slot="creator-external-echo-detail-source"',
  'data-slot="creator-external-echo-detail-reminder"',
  'data-slot="creator-external-echo-detail-actions"',
  'data-slot="creator-external-echo-detail-empty"',
  'CardFooter',
  '<dl',
  '<figure',
  '<section',
  '<Alert',
  '读者原话保持公开来源；你的判断只保存在本机。',
  '读者回声',
  '本机判断',
  '保存提醒',
  '已用在写作里',
  '先放下',
]) {
  assertIncludes(creatorExternalEchoDetailPanel, detailPanelMarker, 'External Echo detail boundary ' + detailPanelMarker)
}
assertNotIncludes(creatorExternalEchoDetailPanel, 'CreatorActionBar', 'External Echo detail must not nest a glass action bar')
assertNotIncludes(creatorExternalEchoDetailPanel, 'CreatorStatePanel', 'External Echo detail empty state must use the shadcn Alert owner')
assertNotIncludes(creatorExternalEchoDetailPanel, 'className="creator-external-echo-detail"', 'External Echo detail must not restore the retired CSS hook')

for (const componentName of [
  'CreatorExternalEchoInboxCard',
  'CreatorExternalEchoDetailPanel',
  'CreatorEchoStatusStrip',
]) {
  assertIncludes(registry, componentName, 'design-system registry includes ' + componentName)
  assertIncludes(pageContracts, componentName, 'page contracts include ' + componentName)
  assertIncludes(componentsDoc, componentName, 'components doc includes ' + componentName)
  assertIncludes(componentStateMatrix, componentName, 'component state matrix includes ' + componentName)
}

assertIncludes(echoRoute, '<CreatorEchoStatusStrip', 'External Echo page composes the shared overview strip')
assertIncludes(echoRoute, 'rows={sourceRows}', 'External Echo status strip receives source-owned rows')
assertIncludes(echoRoute, 'visibleCount={visibleSignals.length}', 'External Echo status strip receives normalized visible count')
assertIncludes(echoSignalViewModels, 'export function buildEchoSourceRows', 'source overview rows belong to signal view models')
assertIncludes(creatorEchoStatusStrip, 'variant="glass"', 'External Echo status strip composes shadcn Card')
assertIncludes(creatorEchoStatusStrip, 'Badge variant="outline"', 'External Echo status strip composes shadcn Badge')
assertIncludes(creatorEchoStatusStrip, 'data-slot="creator-echo-status-strip"', 'External Echo status strip exposes an atomic root slot')
assertIncludes(creatorEchoStatusStrip, 'data-slot="creator-echo-status-grid"', 'External Echo status strip exposes an atomic source grid')
assertIncludes(creatorEchoStatusStrip, 'data-slot="creator-echo-status-chip"', 'External Echo status strip exposes atomic source chips')
assertIncludes(creatorEchoStatusStrip, 'data-slot="creator-echo-status-meta"', 'External Echo status strip exposes atomic view metadata')
assertIncludes(creatorEchoStatusStrip, 'sm:grid-cols-5 xl:flex-1', 'External Echo status strip owns its responsive source grid')
assertNotIncludes(css, '.creator-echo-status-strip', 'External Echo status strip must not depend on page-global CSS')
assertNotIncludes(css, '.creator-echo-status-grid', 'External Echo status grid must not depend on page-global CSS')
assertNotIncludes(css, '.creator-echo-status-chip', 'External Echo status chips must not depend on page-global CSS')
assertNotIncludes(css, '.creator-echo-status-meta', 'External Echo status metadata must not depend on page-global CSS')
assertIncludes(creatorEchoStatusStrip, '当前显示', 'External Echo status strip shows visible signal count')

assertIncludes(echoRoute, '<CreatorEchoNextActionPanel', 'External Echo page keeps a shared next-action surface')
assertIncludes(echoRouteViewModels, 'buildPriorityEchoSignalAction(prioritySignal', 'priority action derives from normalized signal data')
assertIncludes(creatorEchoDecisionPanels, 'data-slot="creator-echo-next-action"', 'External Echo next action exposes an atomic root slot')
assertIncludes(creatorEchoDecisionPanels, 'data-slot="creator-echo-next-action-quote"', 'External Echo next action owns the reader quote boundary')
assertIncludes(creatorEchoDecisionPanels, 'data-slot="creator-echo-next-action-context"', 'External Echo next action owns semantic context metadata')
assertIncludes(creatorEchoDecisionPanels, 'data-slot="creator-echo-next-action-path"', 'External Echo next action owns an ordered writing path')
assertIncludes(creatorEchoDecisionPanels, 'data-slot="creator-echo-next-action-actions"', 'External Echo next action owns its explicit author actions')
assertIncludes(creatorEchoDecisionPanels, 'variant="default"', 'External Echo next action uses one solid shadcn Card inside the route control layer')
assertIncludes(creatorEchoDecisionPanels, 'CardFooter', 'External Echo next action uses the shadcn Card action boundary')
assertIncludes(creatorEchoDecisionPanels, '<figure', 'External Echo next action uses semantic quoted feedback')
assertIncludes(creatorEchoDecisionPanels, '<dl', 'External Echo next action uses semantic context metadata')
assertIncludes(creatorEchoDecisionPanels, '<ol', 'External Echo next action uses an ordered writing path')
for (const retiredEchoNextActionHook of [
  '.creator-echo-next-action',
  '.creator-echo-next-copy',
  '.creator-echo-next-detail',
  '.creator-echo-next-chips',
  '.creator-echo-next-actions',
  '.creator-echo-quote-label',
  '.creator-echo-reader-quote',
  '.creator-echo-writing-brief',
]) {
  assertNotIncludes(css, retiredEchoNextActionHook, 'External Echo next action must not depend on page-global CSS')
}
assertIncludes(echoRoute, '<CreatorEchoDecisionPanel', 'request-only decision panel remains a shared component')
assertIncludes(echoRouteViewModels, 'buildSelectedEchoDecisionCards(selectedRequest', 'request-only decision cards derive from compatibility controller')
assertIncludes(echoRoute, '<CreatorEchoWritingRail', 'request-only writing rail remains a shared component')
assertIncludes(creatorEchoDecisionPanels, 'export function CreatorEchoNextActionPanel', 'External Echo next-action panel stays in the Creator component layer')
assertIncludes(creatorEchoDecisionPanels, 'export function CreatorEchoDecisionPanel', 'request compatibility decision panel stays in the Creator component layer')
assertIncludes(creatorEchoWritingRail, 'export function CreatorEchoWritingRail', 'request compatibility writing rail stays in the Creator component layer')

for (const forbiddenEchoRouteCopy of [
  '请求详情',
  '状态规则',
  '详情 Peek',
  '整理成写作任务',
]) {
  assertNotIncludes(echoRoute, forbiddenEchoRouteCopy, 'External Echo visible route must not regress to ' + forbiddenEchoRouteCopy)
}
for (const forbiddenPageLocalEchoOwner of [
  'function RequestQueueStatusStrip',
  'function RequestNextBestActionPanel',
  'function RequestDecisionQueuePanel',
  '<CreatorRequestQueueCard',
  '<CreatorRequestWritingRail',
]) {
  assertNotIncludes(echoRoute, forbiddenPageLocalEchoOwner, 'External Echo route must not recreate legacy/page-local owner ' + forbiddenPageLocalEchoOwner)
}

assertIncludes(creatorExperienceSurface, '回声只能从已收到进入已看到，再进入处理中；已发布和暂不处理不会直接回到处理中。', 'visible request compatibility state-machine rule')
for (const action of [
  '确认这份发布包',
  '导出这份发布包',
  '提交到阅读端',
  '确认暂不处理',
  '确认隐藏作品',
  '确认归档支线',
  '重置显示偏好',
]) {
  assertIncludes(creatorExperienceSurface, action, 'confirmed action ' + action)
}
assertIncludes(creatorExperienceSurface, 'variant="destructive"', 'dangerous Creator actions use destructive confirmation variant')
assertIncludes(publishRoute, 'pendingLabel="提交中..."', 'publish submission exposes pending label')
assertIncludes(creatorEchoWritingRail, 'pendingLabel="更新中..."', 'request rejection confirmation exposes pending label')
assertIncludes(worksRoute, 'pendingLabel="隐藏中..."', 'hide work confirmation exposes pending label')
assertIncludes(creatorExperienceSurface, 'pendingLabel="归档中..."', 'archive branch confirmation exposes pending label')
assertIncludes(creatorWorkspacePreferencesPanel, 'pendingLabel="重置中..."', 'display preference reset confirmation exposes pending label')
assertIncludes(echoRoute, 'requestActionPending', 'request compatibility actions expose loading and disabled states')
assertIncludes(creatorEchoWritingRail, '查看读者视角', 'request compatibility keeps the reader-perspective action')
assertNotIncludes(echoRoute, 'cursor-pointer transition', 'External Echo route must not rebuild inbox cards with page-local CSS')
assertIncludes(dashboardRoute, "priority: topRequest ? 'primary' : 'normal'", 'Today primary echo step has explicit priority')
assertIncludes(dashboardRoute, "priority: activeDraft ? 'primary' : 'normal'", 'Today active draft step has explicit priority')
assertIncludes(dashboardRoute, "priority: publishCandidate ? 'primary' : 'muted'", 'Today publish step has explicit priority')
assertIncludes(creatorTodayNextStepsPanel, 'priority?:', 'Today next steps panel exposes priority state')
assertIncludes(creatorTodayNextStepsPanel, 'data-priority={priority}', 'Today next steps panel renders semantic priority state')

assertIncludes(creatorTodayNextStepsPanel, '今天最值得推进的 3 件事', 'today page primary workbench')
assertNotIncludes(creator, 'function DashboardDecisionStrip', 'today judgment metrics must live in CreatorTodayPriorityPanel')
assertNotIncludes(creator, 'function TodayFlowRail', 'today request-to-publish route must live in CreatorTodayPriorityPanel')
assertIncludes(creatorTodayPriorityPanel, 'CreatorTodayFlowMetric', 'today priority panel owns judgment metric props')
assertIncludes(creatorTodayPriorityPanel, 'CreatorTodayFlowStep', 'today priority panel owns writing route props')
assertIncludes(creatorTodayPriorityPanel, 'aria-label="今日判断依据"', 'today priority panel exposes judgment basis')
assertIncludes(creatorTodayPriorityPanel, 'aria-label="今日写作路线"', 'today priority panel exposes route steps')
assertIncludes(creatorTodayPriorityPanel, 'data-slot="creator-today-priority-panel"', 'today priority panel exposes a stable component root')
assertIncludes(creatorTodayPriorityPanel, 'data-slot="creator-today-metric"', 'today priority panel exposes atomic metric items')
assertIncludes(creatorTodayPriorityPanel, 'data-slot="creator-today-route-step"', 'today priority panel exposes atomic route steps')
assertIncludes(creatorTodayPriorityPanel, 'metricToneClass[tone]', 'today priority panel owns semantic metric tones')
assertIncludes(creatorTodayPriorityPanel, 'stepStateClass[state]', 'today priority panel owns semantic route states')
assertNotIncludes(creatorTodayPriorityPanel, 'creator-today-flow', 'today priority panel must not return to global flow hooks')
assertNotIncludes(css, '.creator-today-', 'today priority layout must not return to global CSS')
assertIncludes(creatorTodayRoutePanels, 'metrics={metrics}', 'today priority panel receives computed metrics')
assertIncludes(creatorTodayRoutePanels, 'steps={steps}', 'today priority panel receives computed route steps')
assertIncludes(creatorExperienceSurface, '外界回声', 'today decision strip shows External Echo state')
assertIncludes(creatorExperienceSurface, '发布准备', 'today decision strip shows publish readiness')
assertIncludes(creatorExperienceSurface, '私密草稿', 'today flow rail shows private draft stage')
assertIncludes(creatorExperienceSurface, '读者更新', 'today flow rail shows reader update stage')
assertIncludes(dashboardRoute, '最值得回应的一问', 'today top echo step')
assertIncludes(dashboardRoute, '正在写的一条', 'today active draft card')
assertIncludes(dashboardRoute, '需要确认发布', 'today publish candidate card')
assertIncludes(creatorAppFrame, 'const creatorAccessPreviews', 'signed-out Creator access copy is route-aware')
assertIncludes(creatorAppFrame, "const preview = creatorAccessPreviews[resolveCreatorLegacyPath(location.pathname)]", 'signed-out Creator access follows registry-resolved compatibility route')
for (const previewTitle of [
  '登录后继续你的创作',
  '登录后查看外界回声',
  '登录后进入写作台',
  '登录后查看本机写作智库',
  '登录后查看发布包',
  '登录后管理本机工作区',
]) {
  assertIncludes(creatorAppFrame, previewTitle, `signed-out access gate includes ${previewTitle}`)
}
assertNotIncludes(creator, '工作流预览', 'signed-out Creator copy should not feel like a demo preview')
assertNotIncludes(creator, '请求队列预览', 'signed-out Creator copy should not feel like a demo preview')
assertNotIncludes(creator, '写作台预览', 'signed-out Creator copy should not feel like a demo preview')
assertIncludes(creatorExperienceSurface, '公开自动写作关闭', 'settings copy explains public automation is closed')
assertNotIncludes(creator, '平台创作服务关闭', 'settings copy must not imply a hosted author workspace')
assertIncludes(creatorTodayNextStepsPanel, "'echo' | 'draft' | 'publish'", 'Today next steps panel owns the three product-aligned tones')
assertIncludes(creatorViewHelpers, 'function requestPriorityReason', 'today top request explains priority reason')
assertIncludes(creatorViewHelpers, 'request.vote_count', 'today request heat uses persisted vote count')
assertIncludes(creatorViewHelpers, 'function echoProgressLabel', 'Today maps persisted request state to author-facing Echo progress')
assertIncludes(creatorViewHelpers, "return '进入创作'", 'Today Echo progress avoids ticket-processing copy')
assertIncludes(readerPmf, "supabase.from('request_votes')", 'reader votes are persisted through the Reader-only adapter')
assertIncludes(pmf, ".order('vote_count'", 'creator request queue orders by persisted vote count')
assertIncludes(dashboardRoute, 'decisionRule="先续写处理中回声，其次回应已看过的回声，再按票数和提交时间判断。"', 'today visible priority rule is passed to the component owner')
assertIncludes(creatorTodayPriorityPanel, 'data-slot="creator-today-decision-rule"', 'today priority panel owns the visible priority rule')
assertIncludes(dashboardRoute, '/creator/editor?draft=', 'today active draft opens exact draft')
assertIncludes(dashboardRoute, 'publishBundleDraftTargetPathForLocalDraftRef', 'today publish candidate opens a publish bundle draft handoff')
assertNotIncludes(dashboardRoute, '/creator/publish?draft=', 'today publish candidate must not create legacy draft query links')
assertIncludes(editorRoute, 'readCreatorEditorRouteQuery(location.search)', 'editor delegates route context parsing')
assertIncludes(editorController, "routeDraftRef: searchParams.get('draft')", 'editor route controller reads draft route context')
assertNotIncludes(editorRoute, 'new URLSearchParams(', 'editor route must not rebuild query parsing')
assertIncludes(creator, '已打开来自今日任务的私密草稿。', 'editor confirms route draft context')
assertIncludes(publishRoute, 'readCreatorPublishBundleRouteRefs(location.search)', 'publish route reads publish route context through service')
assertIncludes(publishBundleLoadService, 'searchParams.get(publishBundleDraftQueryKey)', 'publish load service reads publish bundle draft route context')
assertIncludes(publishBundleLoadService, 'searchParams.get(legacyPublishDraftQueryKey)', 'publish load service keeps legacy draft route fallback')
assertIncludes(publishBundleLoadService, 'resolvePublishBundleDraftRouteRef({', 'publish load service resolves draft refs through publish bundle draft helper')
assertIncludes(publishRoute, "from './creatorPublishBundleBrowserActionService'", 'publish route delegates browser scheduling through service')
assertIncludes(publishRoute, "from './creatorPublishBundleRouteController'", 'publish route delegates local snapshot decisions through controller')
assertIncludes(publishRoute, "from './creatorPublishBundleReactPatchApplier'", 'publish route delegates local snapshot setter distribution')
assertIncludes(publishRoute, 'scheduleCreatorPublishBundleContextLoad(loadContext)', 'publish route delegates startup load scheduling')
assertIncludes(publishRoute, 'scheduleCreatorPublishBundleRouteDraftRefresh(async () =>', 'publish route delegates hydrated route-draft refresh scheduling')
assertIncludes(publishRoute, 'runCreatorPublishBundleContextEffect({', 'publish route delegates context loading through effect service')
assertIncludes(publishRoute, 'runCreatorPublishBundleRouteDraftRefreshEffect(', 'publish route delegates route-draft refresh through effect service')
assertIncludes(publishRoute, 'runCreatorPublishBundleManualRefreshEffect(', 'publish route delegates manual refresh through effect service')
assertIncludes(publishRoute, 'createCreatorPublishBundleRouteViewModel({', 'publish route consumes the pure route view model')
assertIncludes(publishBundleRouteController, 'export function resolveCreatorPublishBundleRouteDraftRefreshPatch', 'publish controller owns route-draft recovery')
assertIncludes(publishBundleRouteController, '已打开来自今日任务的待发布初稿。', 'publish controller owns route-draft recovery copy')
assertIncludes(publishBundleReactPatchApplier, 'export function applyCreatorPublishBundleLocalStatePatchToReact', 'publish React patch owner distributes controller patches')
assertIncludes(publishBundleReactPatchApplier, 'export function applyCreatorPublishBundleContextStatePatchToReact', 'publish React patch owner distributes context patches')
assertIncludes(publishBundleRouteEffectService, 'export interface CreatorPublishBundleRouteEffectPort', 'publish route effect service exposes replaceable load ports')
assertIncludes(publishBundleRouteEffectService, 'export async function runCreatorPublishBundleContextEffect', 'publish route effect service owns context load orchestration')
assertIncludes(publishBundleRouteEffectService, 'export async function runCreatorPublishBundleRouteDraftRefreshEffect', 'publish route effect service owns route-draft refresh orchestration')
assertIncludes(publishBundleRouteEffectService, 'export async function runCreatorPublishBundleManualRefreshEffect', 'publish route effect service owns manual refresh orchestration')
assertIncludes(publishBundleRouteViewModels, 'export function createCreatorPublishBundleRouteViewModel', 'publish route view-model owner derives publish context')
assertIncludes(publishBundleRouteViewModels, 'publishBundleInput: CreatorPublishBundleInput | null', 'publish route view-model owner derives bundle input')
assertIncludes(publishLifecycleViewModels, 'export function resolveCreatorPublishBundleActiveRecord', 'publish lifecycle view-model owner selects active bundles')
assertIncludes(publishBundleBrowserActionService, 'export interface CreatorPublishBundleBrowserPort', 'publish browser service exposes replaceable browser port')
assertIncludes(publishBundleBrowserActionService, 'export function scheduleCreatorPublishBundleContextLoad', 'publish browser service owns context load scheduling')
assertIncludes(publishBundleBrowserActionService, 'export function scheduleCreatorPublishBundleRouteDraftRefresh', 'publish browser service owns route-draft refresh scheduling')
assertNotIncludes(publishRoute, 'window.setTimeout', 'publish route must not own browser timers')
assertNotIncludes(publishRoute, 'window.clearTimeout', 'publish route must not own timer cleanup')
assertNotIncludes(publishRoute, '已打开来自今日任务的待发布初稿。', 'publish route must not own route-draft recovery copy')
assertNotIncludes(publishBundleRouteController, "from 'react'", 'publish controller stays React-free')
assertNotIncludes(publishBundleRouteController, 'window.', 'publish controller stays browser-free')
assertNotIncludes(publishRoute, 'const activeDraft = routeDraftRef', 'publish route must not reconstruct active draft selection')
assertNotIncludes(publishRoute, 'function publishBundleInput()', 'publish route must not reconstruct PublishBundle input')
assertNotIncludes(publishRoute, 'runCreatorPublishBundleContextLoad()', 'publish route must not call context load directly')
assertNotIncludes(publishRoute, 'runCreatorPublishBundleLocalLoad(', 'publish route must not call local load directly')
assertIncludes(dashboardRoute, 'phase={phase}', 'today work readiness uses dashboard phase')
assertIncludes(creator, 'CreatorEditorReadinessStrip', 'writing desk includes editor readiness strip component')
assertIncludes(creatorProgressPanels, 'export function CreatorEditorReadinessStrip', 'progress owner exports editor readiness strip')
assertIncludes(creatorProgressPanels, 'data-slot="creator-editor-readiness-strip"', 'progress owner exposes editor readiness slot')
assertIncludes(creatorProgressPanels, '正文字数', 'writing desk shows prose count')
assertIncludes(creatorProgressPanels, '草稿保存', 'writing desk shows private save state')
assertIncludes(creatorProgressPanels, '发布去向', 'writing desk shows destination state')
assertIncludes(creatorProgressPanels, '关联请求', 'writing desk shows linked request state')
assertIncludes(creatorProgressPanels, '还差：', 'writing desk explains disabled publish blockers')
assertIncludes(creatorProgressPanels, '已具备进入发布包确认的基础条件。', 'writing desk confirms PublishBundle readiness')
assertNotIncludes(creatorProgressPanels, '发布检查', 'progress owner uses PublishBundle confirmation language')
assertNotIncludes(creator, 'function EditorReadinessStrip', 'editor readiness strip must not return as page-local function')
assertIncludes(creator, 'destinationLabel', 'writing desk derives destination from current work and line')
assertIncludes(creator, 'editorBlockers', 'writing desk derives blockers from real readiness state')
assertIncludes(dashboardRoute, 'works={works}', 'today work readiness uses real works')
assertIncludes(dashboardRoute, 'branches={branches}', 'today work readiness uses real branches')
assertIncludes(dashboardRoute, 'chapters={chapters}', 'today work readiness uses real chapters')
assertIncludes(dashboardRoute, 'requests={requests}', 'today work readiness uses real reader requests')
assertIncludes(dashboardRoute, '<CreatorWorkReadinessPanel', 'today page renders work readiness through component')
assertIncludes(creatorWorkReadinessPanel, 'export function CreatorWorkReadinessPanel', 'work readiness component is exported')
assertIncludes(creatorWorkReadinessPanel, 'const openRequests = requests.filter', 'today work readiness derives open requests')
assertIncludes(creatorWorkReadinessPanel, 'recentWorks.map(work =>', 'today work readiness renders real work rows')
assertIncludes(creatorWorkReadinessPanel, '正在读取作品准备状态', 'today work readiness loading state')
assertIncludes(creatorWorkReadinessPanel, "phase === 'error'", 'today work readiness error state')
assertIncludes(creatorWorkReadinessPanel, '<dl className=', 'today work readiness uses a semantic metric list')
assertIncludes(creatorWorkReadinessPanel, '<ul className=', 'today work readiness uses a semantic work list')
for (const slot of [
  'data-slot="creator-work-readiness-panel"',
  'data-slot="creator-work-readiness-header"',
  'data-slot="creator-work-readiness-action"',
  'data-slot="creator-work-readiness-metrics"',
  'data-slot="creator-work-readiness-metric"',
  'data-slot="creator-work-readiness-list"',
  'data-slot="creator-work-readiness-item"',
]) {
  assertIncludes(creatorWorkReadinessPanel, slot, `work readiness exposes atomic slot ${slot}`)
}
assert(
  (creatorWorkReadinessPanel.match(/variant="glass"/g) || []).length === 1,
  'work readiness ready state keeps one glass layer',
)
assertNotIncludes(creator, 'function WorkReadinessPanel(', 'work readiness must not return as page-local function')
assertNotIncludes(creatorWorkReadinessPanel, 'function ReadinessMetric(', 'work readiness must not rebuild nested metric Cards')
assertNotIncludes(creatorWorkReadinessPanel, '<Panel', 'work readiness must not nest shadcn Card inside design-system Panel')
assertNotIncludes(css, '.creator-work-readiness-', 'work readiness must not add page-global CSS hooks')

assert(canonicalConversationalEditor, 'canonical writing route must render the conversational Creator workspace')
assertIncludes(editorRoute, "import { CreatorConversationWorkspace } from '@/components/creator/workspace/CreatorConversationWorkspace'", 'canonical writing route imports the conversational workspace owner')
for (const retiredRouteComposition of [
  'CreatorEditorManuscriptStage',
  'CreatorEditorGuidance',
  'CreatorEditorRails',
  'CreatorWritingWorkspaceFrame',
  'CreatorAgentWritingAssistantPanel',
  'CreatorWritingCommandShelf',
  'rightRail={(',
  'creator-editor-assist-panel-rail',
]) {
  assertNotIncludes(editorRoute, retiredRouteComposition, `canonical writing route must not remount legacy composition ${retiredRouteComposition}`)
}
assertIncludes(creatorConversationWorkspace, 'export function CreatorConversationWorkspace', 'conversation workspace has one named owner')
assertIncludes(creatorConversationWorkspace, '<CreatorConversationTimeline', 'conversation workspace composes the linear timeline')
assertIncludes(creatorConversationWorkspace, 'submittedMessages={submittedMessages}', 'conversation workspace preserves submitted author commands in the visible timeline')
assertIncludes(creatorConversationWorkspace, 'pending={props.pending || workspaceRestoring}', 'conversation timeline remains behind the restore boundary')
assertIncludes(creatorConversationWorkspace, '<CreatorRecallRail', 'conversation workspace composes the optional manual recall rail')
assertIncludes(creatorConversationWorkspace, 'data-agent-workspace-state={workspaceState}', 'conversation workspace exposes its machine-readable restore lifecycle')
assertIncludes(creatorConversationWorkspace, "data-agent-ready={workspaceState === 'ready' ? 'true' : 'false'}", 'conversation workspace exposes the manifest readiness selector')
assertIncludes(creatorConversationWorkspace, '每轮只确认一件事', 'conversation composer communicates the linear turn boundary')
assertIncludes(creatorConversationWorkspace, '正文不会自动写入', 'conversation composer communicates candidate-first safety')
assertIncludes(creatorConversationWorkspace, 'data-agent-action="save_local_draft"', 'conversation workspace keeps the registered local save action')
assertIncludes(creatorConversationWorkspace, 'data-agent-action="enter_publish_check"', 'conversation workspace keeps the registered publish handoff action')
assert(
  (creatorConversationWorkspace.match(/<Textarea(?=[\s>])/g) || []).length === 1,
  'canonical conversation workspace must expose exactly one author text composer',
)
assertNotIncludes(creatorConversationWorkspace, '<Card', 'canonical conversation workspace must not rebuild the flow as stacked Cards')
for (const slot of [
  'data-slot="creator-conversation-workspace"',
  'data-slot="creator-conversation-header"',
  'data-slot="creator-conversation-timeline-region"',
  'data-slot="creator-conversation-composer"',
  'data-slot="creator-conversation-input"',
  'data-slot="creator-conversation-recall-region"',
]) {
  assertIncludes(creatorConversationWorkspace, slot, `conversation workspace exposes stable atomic slot ${slot}`)
}
for (const slot of [
  'data-slot="creator-conversation-timeline"',
  'data-slot="creator-conversation-turn"',
  'data-slot="creator-conversation-candidates"',
  'data-slot="creator-conversation-candidate"',
  'data-slot="creator-conversation-preview"',
  'data-slot="creator-conversation-active-draft"',
  'data-slot="creator-conversation-manuscript-editor"',
  'data-slot="creator-conversation-review"',
]) {
  assertIncludes(creatorConversationTimeline, slot, `conversation timeline exposes stable atomic slot ${slot}`)
}
assertIncludes(creatorConversationTimeline, '尚未写入正文', 'candidate preview remains explicitly outside the manuscript')
assertIncludes(creatorConversationTimeline, '不提供综合文学分', 'literary review rejects a composite score')
assertIncludes(creatorConversationTimeline, '不因局部问题重写全文', 'literary review protects author edits from broad rewrites')
assertIncludes(creatorConversationTimeline, '看局部修改方向', 'review exposes evidence-led local guidance instead of broad rewrite')
assertIncludes(creatorConversationTimeline, 'onSaveManuscriptEdit', 'author can save an exact manual manuscript edit inside the conversation')
assertIncludes(creatorConversationTimeline, 'data-agent-action="edit_local_manuscript"', 'manual manuscript editing exposes a stable local-only agent action')
assertIncludes(creatorConversationTimeline, 'aria-label="正文手工编辑"', 'manual manuscript editing remains reachable through the conversational surface')
assertIncludes(creatorConversationTimeline, '重新检查当前正文', 'author can explicitly rerun review after a local edit')
assertNotIncludes(creatorConversationTimeline, '<span>本轮</span>', 'conversation turns must not repeat low-information round metadata')
assertNotIncludes(creatorConversationTimeline, '她停了一下，让这个动作真正改变眼前的局势', 'generic gendered repair prose must not return')
assertIncludes(creatorConversationTimeline, '<AlertDialog>', 'canon commit keeps an explicit confirmation gate')
assertIncludes(creatorConversationTimeline, '确认写入本机主宇宙', 'canon commit remains an author-owned action')
assertIncludes(editorRoute, 'runConversationTextEdit', 'canonical route delegates exact local text edits to a bounded service')
assertIncludes(editorRoute, 'recognizeCreatorConversationReviewCommand', 'canonical route delegates natural-language review routing to a bounded service')
assertIncludes(editorRoute, 'void decision.actions.reviewDraft(reviewCommand.focusDimensions)', 'recognized review commands pass author-selected dimensions into the real review workflow')
assertIncludes(editorConversationReviewService, 'export function recognizeCreatorConversationReviewCommand', 'conversation review routing has one named service owner')
assertIncludes(editorConversationReviewService, 'const DIMENSION_SIGNALS', 'conversation review routing owns an explicit literary-dimension vocabulary')
assertIncludes(editorConversationReviewService, "['continuity', /(因果|连续性|前后矛盾|衔接)/]", 'causal-misreading language maps to the continuity dimension')
assertIncludes(creatorConversationTimeline, 'props.submittedMessages?.map', 'submitted author review commands remain visible after the composer clears')
assertIncludes(creatorConversationTimeline, "props.referenceMode ? '本机规则检查' : '独立审阅'", 'reference mode must not impersonate an independent model review')
for (const forbiddenDependency of ['react', '@/components/', 'window.', 'localStorage', 'fetch(', 'supabase']) {
  assertNotIncludes(editorConversationReviewService, forbiddenDependency, `conversation review routing service must stay pure of ${forbiddenDependency}`)
}
assertIncludes(editorConversationTextEditService, 'export function runConversationTextEdit', 'exact local text edit has one named service owner')
for (const forbiddenDependency of ['react', '@/components/', 'window.', 'localStorage', 'fetch(', 'supabase']) {
  assertNotIncludes(editorConversationTextEditService, forbiddenDependency, `exact text edit service must stay pure of ${forbiddenDependency}`)
}
for (const groupLabel of ['必须承接的因果', '人物状态与所知', '时间与位置', '未兑现的承诺']) {
  assertIncludes(editorRecallViewModels, groupLabel, `manual recall exposes author-facing group ${groupLabel}`)
}
for (const slot of [
  'data-slot="creator-recall-rail"',
  'data-slot="creator-recall-header"',
  'data-slot="creator-recall-group"',
  'data-slot="creator-recall-item"',
  'data-slot="creator-recall-footer"',
  'data-slot="creator-recall-apply"',
]) {
  assertIncludes(creatorRecallRail, slot, `manual recall rail exposes stable atomic slot ${slot}`)
}
assertIncludes(creatorRecallRail, '<Checkbox', 'manual recall uses an explicit author selection control')
assertIncludes(creatorRecallRail, 'candidate.whyNow', 'manual recall explains why each memory matters now')
assertIncludes(creatorRecallRail, 'candidate.locator.label', 'manual recall preserves a visible source locator')
assertIncludes(creatorRecallRail, 'onApply(nextIds)', 'manual recall checkbox changes apply immediately through the explicit author action')
assertIncludes(creatorRecallRail, '选择已应用', 'manual recall confirms that the visible selection is already active')
assertIncludes(creatorRecallRail, '不改正文或正史', 'manual recall communicates its non-canon boundary')
assertIncludes(editorDecisionContextAdapter, 'manual_recall:', 'selected manual recalls enter the compiled context manifest')
assertIncludes(editorConversationSettingService, 'recognized: false', 'ordinary prose is not silently persisted as setting data')
assertNotIncludes(css, '.creator-conversation-', 'conversation workspace must not add page-global CSS selectors')
assertNotIncludes(css, '.creator-recall-', 'manual recall rail must not add page-global CSS selectors')

assertIncludes(creatorWorkspaceShell, 'xl:grid-cols-[248px_minmax(640px,1fr)_320px]', 'workspace shell owns writing-first three-column layout')
assertIncludes(creatorWorkspaceShell, 'creator-writing-workspace', 'workspace shell exposes workspace root selector')
assertIncludes(creator, '创作记录', 'writing desk session list rail')
assertIncludes(creator, '故事地图', 'writing desk story map rail')
assertIncludes(creatorExperienceSurface, '写作助手', 'writing desk semi-resident assist dock')
assertIncludes(creatorExperienceSurface, '现在建议', 'writing desk assistant next action')
assertIncludes(creatorExperienceSurface, '写作搭档', 'writing desk assistant reads as a writing partner')
assertIncludes(creatorAgentAssistantPanels, 'data-slot="creator-agent-focus"', 'writing desk assistant gives guided next-step context before freeform input')
assertIncludes(creatorAgentAssistantPanels, 'role="note"', 'writing desk assistant recommendation uses a non-interruptive note role')
assertIncludes(creatorAgentAssistantPanels, 'data-slot="creator-agent-action-queue"', 'writing desk assistant exposes an executable next-step action queue')
assertIncludes(creatorExperienceSurface, 'creator-agent-action-card', 'writing desk assistant actions use shadcn buttons with stable selectors')
assertIncludes(creatorExperienceSurface, 'creator-agent-action-copy', 'writing desk assistant actions include product-facing hints')
assertIncludes(creatorExperienceSurface, '下一步动作', 'writing desk assistant labels executable next steps')
assertIncludes(creatorExperienceSurface, '可用快捷键直接执行', 'writing desk assistant makes keyboard execution visible')
assertIncludes(creatorExperienceSurface, '候选建议', 'writing desk assistant current recommendation')
assertIncludes(creatorExperienceSurface, 'CreatorAgentComposer', 'writing desk assistant natural-language composer component')
assertIncludes(creatorExperienceSurface, '对话写作', 'writing desk assistant dialogue writing tab')
assertIncludes(creatorExperienceSurface, '对本章说', 'writing desk assistant natural language composer copy')
assertIncludes(creatorExperienceSurface, '按建议生成', 'writing desk assistant supports one-click next-step generation')
assertIncludes(creatorExperienceSurface, '参考：', 'writing desk assistant explains the visible context it is using')
assertIncludes(creatorExperienceSurface, '接住当前段落往前写', 'writing desk assistant action explains completion behavior')
assertIncludes(creatorExperienceSurface, '把说明改成动作和细节', 'writing desk assistant action explains rewriting behavior')
assertIncludes(creatorExperienceSurface, '帮你找下一问的冲突', 'writing desk assistant action explains Socratic follow-up behavior')
assertIncludes(creatorExperienceSurface, '检查人物、伏笔和支线', 'writing desk assistant action explains impact check behavior')
assertIncludes(creatorExperienceSurface, '写作检查', 'writing desk assistant check tab')
assertIncludes(creatorExperienceSurface, '写作清单', 'writing desk assistant checklist')
assertIncludes(creatorExperienceSurface, '已参考的信息', 'writing desk assistant context references')
assertIncludes(creatorAgentAssistantPanels, 'data-slot="creator-assistant-dock"', 'writing desk assistant exposes one stable root slot')
assertIncludes(creatorAgentAssistantPanels, 'max-h-[min(30rem,calc(100vh-12rem))]', 'writing desk assistant owns its internal scroll boundary')
assertIncludes(creatorAgentAssistantPanels, 'variant="default"', 'writing desk assistant uses a flat shadcn Card')
assertIncludes(creatorAgentAssistantPanels, 'padding="none"', 'writing desk assistant owns its atomic internal density')
assertIncludes(creatorExperienceSurface, '<TabsList className="grid w-full grid-cols-2', 'writing desk assistant uses shadcn tabs list')
assertIncludes(creatorExperienceSurface, '<TabsTrigger value="ask">对话写作</TabsTrigger>', 'writing desk assistant dialogue tab trigger')
assert(
  creatorAgentAssistantPanels.indexOf('creator-agent-focus') > -1
    && creatorAgentAssistantPanels.indexOf('creator-agent-focus') < creatorAgentAssistantPanels.indexOf('<Textarea'),
  'writing desk assistant should show guided next-step context before the textarea',
)
assertIncludes(creatorExperienceSurface, '<TabsTrigger value="check">写作检查</TabsTrigger>', 'writing desk assistant check tab trigger')
assertIncludes(creatorExperienceSurface, 'aria-label="写作搭档"', 'writing desk assistant composer has an accessible product label')
assertIncludes(creatorExperienceSurface, 'CreatorAssistantDetailGroup', 'writing desk assistant secondary groups are componentized')
assertIncludes(creatorAgentAssistantPanels, 'data-slot="creator-assistant-detail-group"', 'writing desk assistant secondary groups expose an atomic slot')
assertIncludes(creatorExperienceSurface, 'CollapsibleTrigger asChild', 'writing desk assistant secondary groups use shadcn collapsible trigger')
assertIncludes(creatorAgentAssistantPanels, '<ul className="grid gap-1.5" role="list">', 'writing desk assistant actions use semantic list markup')
assertIncludes(creatorAgentAssistantPanels, '<kbd', 'writing desk assistant exposes keyboard shortcuts semantically')
assert(
  (creatorAgentAssistantPanels.match(/<Card(?=[\s>])/g) || []).length === 1,
  'writing desk assistant must keep exactly one shadcn Card root',
)
assertNotIncludes(creatorAgentAssistantPanels, '<Card variant="outline"', 'writing desk assistant must not nest decorative Cards')
assertNotIncludes(creatorAgentAssistantPanels, 'rounded-2xl', 'writing desk assistant must keep control radii at eight pixels or below')
assertNotIncludes(css, '.creator-editor-workspace .creator-assistant-', 'writing desk assistant must not depend on page-global CSS')
assertNotIncludes(css, '.creator-editor-workspace .creator-agent-', 'writing desk agent composer must not depend on page-global CSS')
assertIncludes(creator, '发布去向', 'writing desk destination rail')
assertIncludes(creator, 'creator-destination-field', 'writing desk destination rail uses compact field classes')
assertIncludes(creator, 'creator-destination-control', 'writing desk destination rail uses compact control classes')
assertIncludes(creator, '发布准备', 'writing desk right rail shows publish readiness')
assertIncludes(creator, 'CreatorBundleReadinessPanel', 'writing desk uses creator workspace bundle readiness component')
assertIncludes(creatorDestinationPanels, 'data-slot="creator-bundle-readiness-panel"', 'writing desk bundle readiness exposes atomic panel slot')
assertIncludes(creatorDestinationPanels, 'data-slot="creator-bundle-readiness-list"', 'writing desk bundle readiness exposes atomic list slot')
assertIncludes(creator, 'creator-editor-surface', 'writing desk quiet editor surface')
assertIncludes(creatorExperienceSurface, 'creator-session-panel', 'writing desk shadcn session panel')
assertIncludes(creator, 'CreatorAgentWritingAssistantPanel', 'writing desk uses creator workspace assistant wrapper component')
assertIncludes(creatorAgentAssistantPanels, 'CreatorAssistantDock', 'Agent assistant wrapper composes the shadcn assistant dock')
for (const agentAssistantImplementation of ['CreatorAgentComposer', 'CreatorAgentWritingAssistantPanel', 'CreatorAssistantDock']) {
  assertIncludes(creatorAgentAssistantPanels, `export function ${agentAssistantImplementation}`, `Agent assistant owner exports ${agentAssistantImplementation}`)
}
assertNotIncludes(creator, 'function AgentWritingAssistantPanel', 'assistant wrapper must not return as a page-local function')
assertIncludes(creatorAppFrame, 'CreatorShortcutBar', 'creator shell uses workspace shortcut component')
assertIncludes(creatorConversationWorkspace, 'CreatorConversationTimeline', 'canonical writing desk uses the conversational workspace frame')
assertIncludes(creatorAppFrame, 'CreatorCommandPaletteSurface', 'quick-create dialog uses workspace command palette surface')
assertIncludes(creatorAppFrame, 'CreatorAssistantSidecarSurface', 'semi-resident assistant uses workspace sidecar surface')
assertIncludes(creatorAppFrame, 'CreatorCommandCandidateSurface', 'command candidate uses workspace candidate surface')
assertIncludes(creatorCommandPalette, '<CreatorCommandCenterFrame', 'command palette surface composes its owned command frame component')
assertIncludes(creatorAssistantSidecar, '<CreatorAssistantSidecarFrame', 'assistant sidecar surface composes its owned frame component')
assertIncludes(creatorCommandCandidate, '<CreatorCommandCandidateFrame', 'command candidate surface composes its owned candidate frame component')
if (!canonicalConversationalEditor) {
  assertIncludes(creator, 'CreatorGuidedCoachFrame', 'legacy guided coach uses workspace frame component')
  assertIncludes(creator, 'CreatorCreativeReviewDock', 'legacy review dock uses workspace assembly component')
  assertIncludes(creator, 'CreatorStateDiffPanel', 'legacy story impact uses workspace state diff panel component')
  assertIncludes(creator, 'CreatorBranchSandboxPanel', 'legacy branch sandbox uses workspace branch sandbox panel component')
  assertIncludes(creator, 'CreatorFlightRecorderPanel', 'legacy suggestion record uses workspace flight recorder panel component')
  assertIncludes(creator, 'CreatorEditorCursorAssistBar', 'legacy cursor assist uses workspace component')
  assertIncludes(creator, 'CreatorParagraphJudgmentPanel', 'legacy paragraph judgment uses workspace panel component')
  assertIncludes(creator, 'CreatorStoryFlowRail', 'legacy story flow uses workspace rail component')
}
assertNotIncludes(creator, 'function CreativeReviewDock', 'review dock assembly must not be page-local')
assertNotIncludes(creator, 'function QualityIssueCard', 'quality issue card must not be page-local')
assertNotIncludes(creator, 'function EditorCursorAssistBar', 'cursor assist must not return as a page-local helper')
assertNotIncludes(creator, 'function ParagraphJudgmentPanel', 'paragraph judgment must not return as a page-local helper')
assertNotIncludes(creator, 'function StoryFlowRail', 'story flow must not return as a page-local helper')
assertNotIncludes(creator, 'function StateDiffPanel', 'state diff must not return as a page-local helper')
assertNotIncludes(creator, 'function BranchSandboxPanel', 'branch sandbox must not return as a page-local helper')
assertNotIncludes(creator, 'function FlightRecorderPanel', 'flight recorder must not return as a page-local helper')
assertIncludes(dashboardRoute, 'CreatorDashboardPriorityPanel', 'today surface uses creator route priority wrapper')
assertIncludes(publishRoute, 'CreatorPublishBundleContextPanel', 'publish route uses creator publish context component')
assertIncludes(publishRoute, 'CreatorPublishBundleImpactStrip', 'publish route uses creator publish impact component')
assertIncludes(publishRoute, 'CreatorPublishBundleReviewPanel', 'publish route uses creator publish review component')
if (!canonicalConversationalEditor) {
  assertIncludes(creator, 'CreatorChapterPlannerPanel', 'legacy chapter planner uses creator workspace component')
  assertIncludes(creator, 'CreatorEditorAssistPanel', 'legacy inline writing candidate uses creator workspace component')
  assertIncludes(creator, 'CreatorGhostCompletionPanel', 'legacy ghost completion uses creator workspace component')
  assertIncludes(creator, 'CreatorInlineAssistBar', 'legacy inline next-step assist uses creator workspace component')
  assertIncludes(creator, 'CreatorWritingCommandShelf', 'legacy writing commands use creator workspace component')
}
assertIncludes(creator, 'function draftTitleFromRequest', 'writing desk derives default draft titles from story context')
assertIncludes(creator, 'draftTitleFromRequest(', 'writing desk uses story-context default draft titles when opened from a request')
assertIncludes(creatorViewHelpers, 'function readerWishTypeLabel', 'Creator separates writing-desk reader intent labels from request queue labels')
assert(
  editorRoute.includes('export function CreatorEditorRoute()')
    && editorViewModels.includes('readerWishTypeLabel('),
  'writing desk should use reader-wish labels through the editor view-model owner',
)
assert(
  !editorRoute.includes('requestTypeLabel('),
  'writing desk must not render request queue type labels inside the editor route',
)
assertNotIncludes(creator, '`${requestTypeLabel(nextRequest.request_type)} · ${new Date().toLocaleDateString()}`', 'writing desk must not default titles to request-type plus date labels')
assertIncludes(creator, '<CreatorCollapsibleOutline title="快捷动作" description="可选">', 'writing commands are folded under optional quick actions')
if (!canonicalConversationalEditor) {
  assert(
    creator.indexOf('<CreatorAgentWritingAssistantPanel') < creator.indexOf('<CreatorWritingCommandShelf'),
    'legacy writing desk right rail must lead with the semi-resident assistant before optional command shortcuts',
  )
  assert(
    creator.indexOf('<CreatorAgentWritingAssistantPanel') < creator.indexOf('<CreatorDestinationPanel'),
    'legacy writing desk right rail must expose author assistance before publish destination controls',
  )
}
assertIncludes(creatorExperienceSurface, '先让第一段正文成形', 'inline next-step assist prompts the author from the manuscript')
assertIncludes(creatorExperienceSurface, '续写候选', 'inline next-step assist exposes completion action')
assertIncludes(creatorExperienceSurface, '追问代价', 'inline next-step assist exposes Socratic question action')
assertIncludes(creatorExperienceSurface, 'creator-writing-command-badge', 'writing command bar keeps compact shadcn badge treatment')
assertIncludes(creatorExperienceSurface, '输入想法，或选下面动作', 'writing command bar uses compact author-facing placeholder')
assertIncludes(creatorExperienceSurface, '只入草稿', 'writing command bar states safe draft boundary in product language')
assertIncludes(creatorInlineAssistantPanels, 'creator-writing-command-shelf\', workspaceAssistantCardClass, className)} variant="default"', 'writing command shelf uses flat shadcn card variant')
assertNotIncludes(creatorInlineAssistantPanels, 'creator-writing-command-shelf\', workspaceAssistantCardClass, className)} variant="glass"', 'writing command shelf must not create liquid-glass pseudo layers')
if (!canonicalConversationalEditor) {
  assertIncludes(creator, 'rightRail={(', 'legacy writing commands and active candidates live in the editor right rail')
  assertIncludes(creator, 'className="creator-editor-assist-panel-rail"', 'legacy writing candidate uses right-rail presentation')
}
assertIncludes(creator, 'actions={[]}', 'right-rail candidate avoids duplicate action buttons')
assertIncludes(creatorInlineAssistantPanels, '正文候选', 'right-rail candidate uses author-facing candidate label')
assertIncludes(creatorInlineAssistantPanels, '建议正文', 'right-rail candidate leads with prose suggestion')
assertIncludes(creatorInlineAssistantPanels, '采纳后影响', 'right-rail candidate frames adoption impact')
assertIncludes(creatorInlineAssistantPanels, 'adoptionPlan?: CreatorAssistImpactRow[]', 'right-rail candidate accepts explicit adoption plan')
assertIncludes(creatorInlineAssistantPanels, 'creator-editor-assist-adoption', 'right-rail candidate renders adoption plan before actions')
assertIncludes(creatorInlineAssistantPanels, 'aria-label="采纳方式"', 'right-rail candidate labels adoption plan')
assertIncludes(creatorInlineAssistantPanels, 'role="region"', 'right-rail candidate exposes an assistive review region')
assertIncludes(creatorInlineAssistantPanels, 'aria-live="polite"', 'right-rail candidate politely announces new suggestions')
assertIncludes(creatorInlineAssistantPanels, 'aria-label={`候选审阅：${candidate.title}`}', 'right-rail candidate has a candidate-specific accessible name')
assertIncludes(accessibilityDoc, 'polite live updates', 'accessibility doc requires candidate live-region semantics')
assert(
  creatorInlineAssistantPanels.indexOf('creator-editor-assist-adoption') < creatorInlineAssistantPanels.indexOf('creator-editor-assist-impact'),
  'right-rail candidate should show adoption controls before impact explanation',
)
assertIncludes(creator, '插入正文后方', 'right-rail candidate explains prose insertion behavior')
assertIncludes(creator, '替换当前段落', 'right-rail candidate explains paragraph replacement behavior')
assertIncludes(creator, '不改主线，先作为支线试写。', 'right-rail candidate explains IF branch behavior')
assertIncludes(creator, 'CreatorEditorDecisionQueuePanel', 'writing desk uses creator workspace decision queue wrapper component')
assertIncludes(creatorDecisionPanels, 'export function CreatorEditorDecisionQueuePanel', 'decision owner exports editor decision queue wrapper')
assertIncludes(creatorDecisionPanels, 'export function CreatorDecisionQueue', 'decision owner exports lower-level decision queue')
assertIncludes(creatorDecisionPanels, '<CreatorDecisionQueue', 'decision wrapper composes the shadcn decision queue')
assertNotIncludes(creator, 'function DecisionQueuePanel', 'decision queue wrapper must not return as a page-local function')
assertIncludes(creator, 'CreatorEditorReviewRail', 'writing desk uses creator workspace review rail component')
assertIncludes(creatorInlineReviewPanels, 'export function CreatorInlineReviewPanel', 'inline review owner exports the inline review panel')
assertIncludes(creatorInlineReviewPanels, 'export function CreatorEditorReviewRail', 'inline review owner exports the editor review rail')
for (const inlineReviewSlot of [
  'data-slot="creator-inline-review"',
  'data-slot="creator-inline-review-list"',
  'data-slot="creator-inline-review-marker"',
  'data-slot="creator-inline-review-action"',
  'data-slot="creator-editor-review-rail"',
  'data-slot="creator-editor-review-title"',
  'data-slot="creator-editor-review-list"',
  'data-slot="creator-editor-review-dot"',
]) {
  assertIncludes(creatorInlineReviewPanels, inlineReviewSlot, `inline review owner exposes atomic slot ${inlineReviewSlot}`)
}
for (const retiredInlineReviewSelector of [
  '.creator-inline-review',
  '.creator-inline-marker',
  '.creator-inline-marker-action',
  '.creator-editor-review-rail',
  '.creator-editor-review-rail-title',
  '.creator-editor-review-rail-list',
  '.creator-editor-review-dot',
]) {
  assertNotIncludes(css, retiredInlineReviewSelector, `inline review must not depend on page-global selector ${retiredInlineReviewSelector}`)
}
assertNotIncludes(creator, 'function InlineReviewPanel', 'inline review panel must not return as a page-local function')
assertNotIncludes(creator, 'function EditorReviewRail', 'editor review rail must not return as a page-local function')
assertIncludes(creator, 'CreatorEditorReadinessStrip', 'writing desk uses creator workspace readiness component')
assertIncludes(creator, 'CreatorMissionProgressRail', 'writing desk uses creator workspace mission progress component')
assertIncludes(creator, 'CreatorStoryFlowRail', 'writing desk uses creator workspace story flow component')
assertIncludes(creatorProgressPanels, 'export function CreatorMissionProgressRail', 'progress owner exports the mission progress wrapper')
assertIncludes(creatorPlanningPanels, 'export function CreatorFlowStepper', 'planning owner exports the lower-level flow stepper')
assertIncludes(creatorPlanningPanels, 'export function CreatorStoryFlowRail', 'planning owner exports the story flow wrapper')
assertNotIncludes(creator, 'function StoryFlowRail', 'story flow rail must not return as a page-local function')
assertNotIncludes(creator, 'function MissionProgressRail', 'mission progress rail must not return as a page-local function')
assertIncludes(creator, 'CreatorStoryHandoffPanel', 'writing desk uses creator workspace story handoff component')
assertIncludes(creator, 'CreatorSessionRail', 'writing desk uses creator workspace session component')
assertIncludes(creator, 'CreatorStoryMap', 'writing desk uses creator workspace story map component')
assertIncludes(creator, 'CreatorReaderWishPanel', 'writing desk uses creator workspace reader wish component')
assertIncludes(creator, 'CreatorAuthorStatusPanel', 'writing desk uses creator workspace author status component')
assertIncludes(creator, 'CreatorDestinationPanel', 'writing desk uses creator workspace destination component')
assertIncludes(creator, 'CreatorBundleReadinessPanel', 'writing desk uses creator workspace bundle readiness component')
assertIncludes(creator, 'CreatorPrivateDraftPanel', 'writing desk uses creator workspace private draft component')
assertIncludes(creatorAgentAssistantPanels, 'creator-assistant-dock', 'Agent assistant owner exposes dock QA selector')
assertIncludes(creatorWorkspaceShell, 'creator-shortcut-bar', 'workspace shell exposes shortcut QA selector')
assertIncludes(creatorWorkspaceShell, 'export function CreatorShortcutBar', 'workspace shell exports shortcut bar')
assertIncludes(creatorWorkspaceShell, 'export function CreatorWritingWorkspaceFrame', 'workspace shell exports writing frame')
assertIncludes(creatorCommandPalette, 'export function CreatorCommandCenterFrame', 'command palette owner exports command center frame')
assertIncludes(creatorAssistantSidecar, 'export function CreatorAssistantSidecarFrame', 'assistant sidecar owner exports its frame component')
assertIncludes(creatorCommandCandidate, 'export function CreatorCommandCandidateFrame', 'command candidate owner exports candidate frame')
assertIncludes(creatorSocraticPanels, 'export function CreatorGuidedCoachFrame', 'Socratic panel owner exports guided coach frame')
assertIncludes(creatorPlanningPanels, 'export function CreatorNextBestActionCard', 'planning owner exports next-best action card')
assertIncludes(creatorDraftGuidancePanels, 'export function CreatorStoryHandoffPanel', 'draft guidance owner exports story handoff component')
assertIncludes(creatorReviewDock, 'export function CreatorReviewDockFrame', 'review dock owner exports frame component')
assertIncludes(creatorReviewDock, 'export function CreatorCreativeReviewDock', 'review dock owner exports assembly component')
assertIncludes(creatorQualityPanels, 'export function CreatorQualityIssueCard', 'quality owner exports issue card component')
for (const marker of [
  "import { Card } from '@/components/ui/card'",
  'data-slot="creator-quality-review"',
  'data-slot="creator-quality-issue"',
  'data-slot="creator-quality-fix-action"',
]) {
  assertIncludes(creatorQualityPanels, marker, `quality owner uses atomic shadcn composition ${marker}`)
}
assertIncludes(creatorImpactPanels, 'export function CreatorStateDiffPanel', 'impact owner exports state diff component')
assertIncludes(creatorImpactPanels, 'export function CreatorBranchSandboxPanel', 'impact owner exports branch sandbox component')
assertIncludes(creatorImpactPanels, 'export function CreatorFlightRecorderPanel', 'impact owner exports flight recorder component')
assertIncludes(creatorDraftGuidancePanels, 'export function CreatorParagraphJudgmentFrame', 'draft guidance owner exports paragraph judgment frame')
assertIncludes(creatorDraftGuidancePanels, 'export function CreatorEditorCursorAssistBar', 'draft guidance owner exports cursor assist component')
assertIncludes(creatorDraftGuidancePanels, 'export function CreatorParagraphJudgmentPanel', 'draft guidance owner exports paragraph judgment panel')
assertIncludes(registry, "{ name: 'CreatorStoryHandoffPanel', path: '@/components/creator/workspace/CreatorDraftGuidancePanels'", 'design registry points story handoff at draft guidance owner')
assertIncludes(registry, "{ name: 'CreatorParagraphJudgmentFrame', path: '@/components/creator/workspace/CreatorDraftGuidancePanels'", 'design registry points paragraph frame at draft guidance owner')
assertIncludes(registry, "{ name: 'CreatorEditorCursorAssistBar', path: '@/components/creator/workspace/CreatorDraftGuidancePanels'", 'design registry points cursor assist at draft guidance owner')
assertIncludes(registry, "{ name: 'CreatorParagraphJudgmentPanel', path: '@/components/creator/workspace/CreatorDraftGuidancePanels'", 'design registry points paragraph panel at draft guidance owner')
assertIncludes(creatorPlanningPanels, 'export function CreatorStoryFlowRail', 'planning owner exports story flow rail')
assertIncludes(creatorPlanningPanels, 'export function CreatorChapterPlannerPanel', 'planning owner exports chapter planner')
for (const inlineAssistantImplementation of ['CreatorEditorAssistPanel', 'CreatorGhostCompletionPanel', 'CreatorInlineAssistBar', 'CreatorWritingCommandShelf']) {
  assertIncludes(creatorInlineAssistantPanels, `export function ${inlineAssistantImplementation}`, `inline assistant owner exports ${inlineAssistantImplementation}`)
}
assertIncludes(creatorProgressPanels, 'export function CreatorEditorReadinessStrip', 'progress owner exports editor readiness strip component')
assertIncludes(creatorDestinationPanels, 'export function CreatorBundleReadinessPanel', 'destination panel owner exports bundle readiness component')
assertIncludes(registry, "{ name: 'CreatorDestinationPanel', path: '@/components/creator/workspace/CreatorDestinationPanels'", 'design registry points destination panel at extracted owner')
assertIncludes(registry, "{ name: 'CreatorBundleReadinessPanel', path: '@/components/creator/workspace/CreatorDestinationPanels'", 'design registry points bundle readiness panel at extracted owner')
assertIncludes(creatorPlanningPanels, 'export function CreatorCollapsibleOutline', 'planning owner exports review outline')
assertIncludes(creatorPlanningPanels, '<CollapsibleTrigger asChild>', 'planning owner uses shadcn collapsible trigger')
assertNotIncludes(creatorPlanningPanels, '<details', 'planning owner must not use native details for Creator review outline')
for (const planningImplementation of ['CreatorStoryFlowRail', 'CreatorFlowStepper', 'CreatorPrivateDraftPanel', 'CreatorNextActionPanel', 'CreatorNextBestActionCard', 'CreatorCollapsibleOutline', 'CreatorChapterPlannerPanel']) {
}
for (const commandPaletteSlot of [
  'data-slot="creator-command-overlay"',
  'data-slot="creator-command-panel"',
  'data-slot="creator-command-intent-summary"',
  'data-slot="creator-command-context"',
  'data-slot="creator-command-examples"',
  'data-slot="creator-command-input"',
  'data-slot="creator-command-suggestions"',
  'data-slot="creator-command-list"',
  'data-slot="creator-command-item"',
]) {
  assertIncludes(creatorCommandPalette, commandPaletteSlot, `command palette owner exposes atomic QA slot ${commandPaletteSlot}`)
}
for (const commandPaletteContract of ["import { createPortal } from 'react-dom'", '<dl', '<ul', 'max-[720px]:grid-cols-1', "import { Sparkles, X } from 'lucide-react'"]) {
  assertIncludes(creatorCommandPalette, commandPaletteContract, `command palette owns semantic/shadcn contract ${commandPaletteContract}`)
}
for (const commandPaletteToken of [
  '--creator-command-overlay-bg:',
  '--creator-command-overlay-solid-bg:',
  '--creator-command-solid-bg:',
  '--creator-command-inset-solid-bg:',
]) {
  assertIncludes(tokens, commandPaletteToken, `command palette token layer owns ${commandPaletteToken}`)
}
for (const retiredCommandPaletteSelector of [
  '.creator-command-overlay',
  '.creator-command-panel',
  '.creator-command-brief',
  '.creator-command-context',
  '.creator-command-examples',
  '.creator-command-example',
  '.creator-command-suggestion-group',
  '.creator-command-suggestions',
  '.creator-command-suggestion',
  '.creator-command-item',
  '.creator-command-empty',
]) {
  assertNotIncludes(css, retiredCommandPaletteSelector, `command palette global selector must stay retired: ${retiredCommandPaletteSelector}`)
}
assertIncludes(creatorAssistantSidecar, 'creator-assistant-sidecar', 'assistant sidecar owner exposes QA selector')
assertIncludes(creatorCommandCandidate, 'creator-command-candidate', 'command candidate owner exposes QA selector')
assertIncludes(creatorSocraticPanels, 'creator-guided-coach', 'Socratic panel owner exposes guided coach QA selector')
const creatorSocraticPlanBoard = sliceBetween(
  creatorSocraticPanels,
  'export function CreatorSocraticPlanBoard',
  'export interface CreatorLocalSettingLibraryProps',
  'Creator Socratic plan board',
)
for (const marker of [
  'variant="default"',
  '<CardFooter',
  '<ol',
  '<li',
  'data-slot="creator-socratic-plan-board"',
  'data-slot="creator-socratic-stage-list"',
  'data-slot="creator-socratic-stage"',
  'data-slot="creator-socratic-active-stage"',
  'data-slot="creator-socratic-asset-kinds"',
  'data-slot="creator-socratic-capture-action"',
]) {
  assertIncludes(creatorSocraticPlanBoard, marker, `Socratic plan board exposes atomic contract ${marker}`)
}
assert(
  (creatorSocraticPlanBoard.match(/<Card\b/g) || []).length === 1,
  'Socratic plan board must compose exactly one shadcn Card surface',
)
for (const forbidden of ['variant="glass"', 'rounded-2xl', 'workspaceAssistantPanelClass']) {
  assertNotIncludes(creatorSocraticPlanBoard, forbidden, `Socratic plan board must not restore nested/card-wall styling ${forbidden}`)
}
assertNotIncludes(css, '.creator-socratic-plan-board', 'Socratic plan board must not depend on page-global CSS')
assertIncludes(creatorReviewDock, 'creator-review-dock', 'review dock owner exposes QA selector')
assertIncludes(creatorDraftGuidancePanels, 'creator-paragraph-judgment', 'draft guidance owner exposes paragraph judgment QA selector')
for (const chapterPlannerSlot of [
  'data-slot="creator-chapter-planner"',
  'data-slot="creator-chapter-goal"',
  'data-slot="creator-chapter-goal-item"',
  'data-slot="creator-direction-option"',
  'data-slot="creator-direction-impact"',
]) {
  assertIncludes(creatorPlanningPanels, chapterPlannerSlot, `planning owner exposes atomic chapter planner slot ${chapterPlannerSlot}`)
}
for (const retiredChapterPlannerSelector of [
  '.creator-chapter-goal-card',
  '.creator-chapter-goal-head',
  '.creator-chapter-goal-actions',
  '.creator-chapter-goal-grid',
  '.creator-chapter-goal-item',
  '.creator-flow-index',
  '.creator-direction-label',
  '.creator-direction-card',
  '.creator-direction-kicker',
  '.creator-direction-summary',
  '.creator-direction-promise',
  '.creator-direction-impact',
]) {
  assertNotIncludes(css, retiredChapterPlannerSelector, `chapter planner must not depend on page-global selector ${retiredChapterPlannerSelector}`)
}
for (const inlineAssistantSelector of ['creator-editor-assist-panel', 'creator-editor-assist-focus-grid', 'creator-editor-ghost-completion', 'creator-editor-ghost-body', 'creator-editor-ghost-suggestion', 'creator-editor-ghost-action', 'creator-inline-assist-bar', 'creator-inline-assist-action', 'creator-writing-command-shelf']) {
  assertIncludes(creatorInlineAssistantPanels, inlineAssistantSelector, `inline assistant owner exposes ${inlineAssistantSelector}`)
}
assertIncludes(creatorDecisionPanels, 'creator-decision-queue', 'decision owner exposes QA selector')
assertIncludes(creatorProgressPanels, 'data-slot="creator-editor-readiness-strip"', 'progress owner exposes editor readiness slot')
assertIncludes(creatorProgressPanels, 'data-slot="creator-progress-rail"', 'progress owner exposes progress slot')
assertIncludes(creatorProgressPanels, 'export function CreatorProgressRail', 'progress owner exports the lower-level progress rail')
for (const flowStepperSlot of [
  'data-slot="creator-flow-stepper"',
  'data-slot="creator-flow-stepper-header"',
  'data-slot="creator-flow-current"',
  'data-slot="creator-flow-track"',
  'data-slot="creator-flow-step"',
]) {
  assertIncludes(creatorPlanningPanels, flowStepperSlot, `planning owner exposes atomic flow slot ${flowStepperSlot}`)
}
assertIncludes(creatorPlanningPanels, '[scrollbar-width:thin]', 'planning owner keeps component-owned semantic scrollbar treatment')
assertIncludes(creatorPlanningPanels, 'max-xl:hidden', 'planning owner keeps component-owned medium-width flow compaction')
assertNotIncludes(css, '.creator-flow-stepper', 'flow stepper must not depend on page-global CSS')
assertNotIncludes(css, '.creator-flow-track', 'flow track must not depend on page-global CSS')
for (const storyContextSlot of [
  'data-slot="creator-session-panel"',
  'data-slot="creator-session-group"',
  'data-slot="creator-session-row"',
  'data-slot="creator-session-empty"',
  'data-slot="creator-story-map"',
  'data-slot="creator-story-map-row"',
  'data-slot="creator-story-map-icon"',
  'data-slot="creator-reader-wish-panel"',
]) {
  assertIncludes(creatorStoryContextPanels, storyContextSlot, `story context owner exposes atomic slot ${storyContextSlot}`)
}
assertIncludes(creatorSocraticPanels, 'workspaceRailCardClass', 'Socratic setting library uses a dedicated rail card token')
assertIncludes(creatorStoryContextPanels, '[box-shadow:var(--creator-rail-shadow)]', 'story context owner owns its semantic rail shadow')
assertIncludes(creatorStoryContextPanels, 'truncate text-[0.84rem]', 'session rail title clamps inside the component owner')
assertIncludes(creatorStoryContextPanels, 'line-clamp-2', 'session rail detail clamps inside the component owner')
assertIncludes(componentsDoc, 'CreatorSessionRail` rows stay inside the rail width', 'components doc records session rail containment rule')
assertIncludes(componentsDoc, 'page-global session selectors may not return', 'components doc records session selector retirement rule')
assertIncludes(componentsDoc, 'CreatorBranchLineCard` owns each work-line row', 'components doc records branch line card rule')
assertIncludes(componentsDoc, 'CreatorEditorReadinessStrip`, `CreatorProgressRail`, and `CreatorMissionProgressRail` are implemented by `CreatorProgressPanels.tsx`', 'components doc records progress panel ownership')
assertIncludes(componentStateMatrix, 'CreatorBranchLineCard', 'component matrix includes branch line card')
assertIncludes(componentStateMatrix, 'CreatorEditorReadinessStrip', 'component matrix includes editor readiness strip')
assertIncludes(creatorAgentAssistantPanels, 'data-compact={compact ? \'true\' : \'false\'}', 'assistant owner exposes compact candidate-review state')
assertIncludes(creatorAgentAssistantPanels, 'data-slot="creator-agent-composer"', 'assistant composer owns a semantic section instead of a nested Card')
assertIncludes(creatorAgentAssistantPanels, 'data-slot="creator-assistant-followup"', 'assistant dock exposes followup section for compact candidate mode')
assertIncludes(creatorAgentAssistantPanels, 'data-slot="creator-assistant-actions"', 'assistant dock exposes a shadcn CardFooter action boundary')
assertIncludes(creatorAgentAssistantPanels, '<CardFooter', 'assistant dock uses the shared shadcn CardFooter primitive')
assertIncludes(creator, 'compact={Boolean(editorAssistCandidate)}', 'writing desk compacts assistant when an active candidate exists')
assertIncludes(creatorAgentAssistantPanels, "compact && 'is-compact max-h-[min(18rem,calc(100vh-18rem))]'", 'assistant dock owns compact sizing without page-global CSS')
assertIncludes(creatorAgentAssistantPanels, "compact && 'hidden'", 'assistant owner controls compact disclosure locally')
assertIncludes(css, '.creator-editor-right-rail .creator-editor-assist-panel-rail .creator-editor-assist-candidate blockquote', 'right-rail candidate body scrolls internally so adoption remains visible')
assertIncludes(css, '@keyframes creatorEditorCandidateIn', 'right-rail candidate has a subtle state-reveal motion')
assertIncludes(css, '@keyframes creatorEditorAdoptionIn', 'right-rail adoption plan has a subtle state-reveal motion')
assertIncludes(css, '@media (prefers-reduced-motion: reduce)', 'candidate reveal motion respects system reduced motion')
assertIncludes(motionDoc, 'Candidate review reveal when a writing suggestion appears', 'motion doc documents candidate review reveal')
assertIncludes(creatorProgressPanels, 'workspaceFooterCardClass', 'progress owner uses a dedicated footer card token')
assertIncludes(creatorProgressPanels, 'workspaceFooterPanelClass', 'progress owner uses dedicated footer panel tokens')
assertIncludes(creatorStoryContextPanels, 'data-slot="creator-session-panel" className={cn(railCardClass, className)} variant="default" padding="sm"', 'session rail uses flat shadcn card treatment')
assertIncludes(creatorStoryContextPanels, 'data-slot="creator-story-map" className={cn(railCardClass, className)} variant="default" padding="sm"', 'story map uses flat shadcn card treatment')
assertIncludes(creatorStoryContextPanels, 'data-slot="creator-reader-wish-panel" className={cn(railCardClass, className)} variant="default" padding="sm"', 'reader wish rail uses flat shadcn card treatment')
assertIncludes(creatorProgressPanels, 'data-slot="creator-progress-rail" className={cn(workspaceFooterCardClass, className)} variant="default" padding="sm"', 'progress owner uses compact footer shadcn treatment')
assertIncludes(creatorProgressPanels, '[box-shadow:var(--creator-progress-shadow)]', 'progress owner owns its semantic shadow token')
assertNotIncludes(css, '.creator-editor-workspace .creator-progress-rail', 'progress owner must not depend on page-global CSS')
assertNotIncludes(creatorStoryContextPanels, 'variant="glass"', 'story context rail must not use liquid-glass card treatment')
for (const retiredStoryContextSelector of [
  '.creator-session-panel',
  '.creator-session-group',
  '.creator-session-group-title',
  '.creator-session-row',
  '.creator-session-empty',
  '.creator-story-map',
  '.creator-story-map-row',
  '.creator-story-map-icon',
  '.creator-reader-wish-panel',
]) {
  assertNotIncludes(css, retiredStoryContextSelector, `story context must not depend on page-global selector ${retiredStoryContextSelector}`)
}
for (const marker of [
  'export function CreatorSessionRail',
  'export function CreatorStoryMap',
  'export function CreatorReaderWishPanel',
]) {
  assertIncludes(creatorStoryContextPanels, marker, `story context owner ${marker}`)
}
assertIncludes(registry, "{ name: 'CreatorSessionRail', path: '@/components/creator/workspace/CreatorStoryContextPanels'", 'design registry points session rail at story context owner')
assertIncludes(registry, "{ name: 'CreatorStoryMap', path: '@/components/creator/workspace/CreatorStoryContextPanels'", 'design registry points story map at story context owner')
assertIncludes(registry, "{ name: 'CreatorReaderWishPanel', path: '@/components/creator/workspace/CreatorStoryContextPanels'", 'design registry points reader wish at story context owner')
for (const marker of [
  'export function CreatorGuidedCoachFrame',
  'export function CreatorSocraticPlanBoard',
  'export function CreatorLocalSettingLibrary',
]) {
  assertIncludes(creatorSocraticPanels, marker, `Socratic panel owner ${marker}`)
}
assertIncludes(registry, "{ name: 'CreatorGuidedCoachFrame', path: '@/components/creator/workspace/CreatorSocraticPanels'", 'design registry points guided coach at Socratic panel owner')
assertIncludes(registry, "{ name: 'CreatorSocraticPlanBoard', path: '@/components/creator/workspace/CreatorSocraticPanels'", 'design registry points stage board at Socratic panel owner')
assertIncludes(registry, "{ name: 'CreatorLocalSettingLibrary', path: '@/components/creator/workspace/CreatorSocraticPanels'", 'design registry points setting library at Socratic panel owner')
for (const marker of [
  'export function CreatorAssistantSidecarFrame',
  'export function CreatorAssistantSidecarSurface',
]) {
  assertIncludes(creatorAssistantSidecar, marker, `assistant sidecar owner ${marker}`)
}
assertIncludes(creatorAppFrame, "from '@/components/creator/workspace/CreatorAssistantSidecar'", 'Creator frame imports the sidecar owner directly')
assertIncludes(registry, "{ name: 'CreatorAssistantSidecarFrame', path: '@/components/creator/workspace/CreatorAssistantSidecar'", 'design registry points assistant sidecar frame at extracted owner')
for (const [owner, markers] of [
  [creatorCommandPalette, ['export function CreatorCommandCenterFrame', 'export function CreatorCommandPaletteSurface']],
  [creatorCommandCandidate, ['export function CreatorCommandCandidateFrame', 'export function CreatorCommandCandidateSurface']],
] as const) {
  for (const marker of markers) {
    assertIncludes(owner, marker, `command surface owner ${marker}`)
  }
}
assertIncludes(creatorAppFrame, "from '@/components/creator/workspace/CreatorCommandPalette'", 'Creator frame imports command palette owner directly')
assertIncludes(creatorAppFrame, "from '@/components/creator/workspace/CreatorCommandCandidate'", 'Creator frame imports command candidate owner directly')
assertIncludes(registry, "{ name: 'CreatorCommandCenterFrame', path: '@/components/creator/workspace/CreatorCommandPalette'", 'design registry points command center frame at palette owner')
assertIncludes(registry, "{ name: 'CreatorCommandCandidateFrame', path: '@/components/creator/workspace/CreatorCommandCandidate'", 'design registry points candidate frame at candidate owner')
for (const compatibilityOwner of ['CreatorReviewDock', 'CreatorQualityPanels', 'CreatorImpactPanels']) {
}
for (const [owner, markers] of [
  [creatorReviewDock, ['export function CreatorReviewDockFrame', 'export function CreatorReviewCommandBar', 'export function CreatorCreativeReviewDock']],
  [creatorQualityPanels, ['export function CreatorQualityIssueCard']],
  [creatorImpactPanels, ['export function CreatorStateDiffPanel', 'export function CreatorBranchSandboxPanel', 'export function CreatorFlightRecorderPanel']],
] as const) {
  for (const marker of markers) {
    assertIncludes(owner, marker, `review component owner ${marker}`)
  }
}
assertIncludes(registry, "{ name: 'CreatorReviewDockFrame', path: '@/components/creator/workspace/CreatorReviewDock'", 'design registry points review dock at extracted owner')
for (const [owner, label] of [
  [creatorCommitPanels, 'commit panels'],
  [creatorCommandPalette, 'command palette'],
  [creatorReviewDock, 'review dock'],
  [creatorPlanningPanels, 'planning panels'],
  [creatorDecisionPanels, 'decision panels'],
  [creatorAgentAssistantPanels, 'Agent assistant panels'],
] as const) {
  assertIncludes(owner, '发布包', `${label} uses PublishBundle product language`)
  assertNotIncludes(owner, '发布检查', `${label} does not expose retired publish-check framing`)
}
assertIncludes(creatorAgentAssistantPanels, 'data-agent-action="enter_publish_check"', 'Agent assistant preserves the stable compatibility action id')
assertIncludes(registry, "{ name: 'CreatorQualityIssueCard', path: '@/components/creator/workspace/CreatorQualityPanels'", 'design registry points quality card at extracted owner')
assertIncludes(registry, "uses: ['Card', 'Button', 'Badge']", 'design registry declares quality card shadcn primitives')
assertIncludes(registry, "{ name: 'CreatorStateDiffPanel', path: '@/components/creator/workspace/CreatorImpactPanels'", 'design registry points state diff at impact owner')
assertNotIncludes(creatorAgentAssistantPanels, 'variant="glass"', 'assistant dock must not use liquid-glass pseudo layers')
assertIncludes(creatorCommitPanels, 'creator-author-status-panel', 'commit panel owner exposes author status QA selector')
assertIncludes(creatorDestinationPanels, 'data-slot="creator-destination-panel"', 'destination panel owner exposes atomic QA slot')
assertIncludes(creatorDestinationPanels, 'destinationCardClass', 'destination panel owner uses a dedicated flat shadcn token')
assertIncludes(creatorDestinationPanels, "className={cn(destinationCardClass, 'max-xl:p-[0.58rem]', className)}", 'destination panel owns its compact flat shadcn treatment')
assertNotIncludes(creatorDestinationPanels, 'data-slot="creator-destination-panel" className={cn(readinessCardClass', 'destination panel must not use liquid-glass pseudo layers')
assertIncludes(creatorDestinationPanels, 'summary: string', 'destination panel owner accepts visible summary copy')
assertIncludes(creatorDestinationPanels, 'defaultOpen?: boolean', 'destination panel owner supports controlled initial collapse state')
for (const destinationSlot of [
  'data-slot="creator-destination-description"',
  'data-slot="creator-destination-summary"',
  'data-slot="creator-destination-toggle"',
  'data-slot="creator-destination-body"',
  'data-slot="creator-bundle-readiness-panel"',
  'data-slot="creator-bundle-readiness-list"',
  'data-slot="creator-bundle-readiness-row"',
  'data-slot="creator-bundle-readiness-action"',
]) {
  assertIncludes(creatorDestinationPanels, destinationSlot, `destination/readiness owner exposes atomic slot ${destinationSlot}`)
}
assertIncludes(creatorDestinationPanels, 'max-xl:grid-cols-2', 'destination panel owns its medium-width field grid')
assertIncludes(creatorDestinationPanels, 'max-xl:flex max-xl:flex-wrap', 'bundle readiness panel owns its medium-width chip layout')
assertIncludes(creatorDestinationPanels, 'max-xl:border-[var(--creator-readiness-chip-border)]', 'bundle readiness rows use a semantic chip border')
assertIncludes(creatorDestinationPanels, 'border-[var(--creator-rail-border)] bg-[var(--creator-rail-bg)] text-[var(--creator-text)]', 'destination panel uses the readable flat rail surface')
assertIncludes(tokens, '--creator-readiness-chip-border:', 'token layer owns bundle readiness chip border')
for (const retiredDestinationSelector of [
  '.creator-editor-right-rail .creator-destination-panel',
  '.creator-editor-right-rail .creator-destination-summary',
  '.creator-editor-right-rail .creator-destination-toggle',
  '.creator-editor-right-rail .creator-publish-readiness-panel',
  '.creator-editor-right-rail .creator-publish-readiness-list',
  '.creator-editor-right-rail .creator-publish-readiness-row',
]) {
  assertNotIncludes(css, retiredDestinationSelector, `destination/readiness must not depend on page-global selector ${retiredDestinationSelector}`)
}
assertIncludes(creatorDestinationPanels, '草稿去向', 'destination panel owner uses product badge copy')
assertIncludes(creatorDestinationPanels, '当前去向', 'destination panel owner shows product summary copy')
assertIncludes(creatorDestinationPanels, '修改去向', 'destination panel owner hides edit controls behind product copy')
assertIncludes(creatorDestinationPanels, 'Collapsible open={open} onOpenChange={setOpen}', 'destination panel owner uses shadcn collapsible state')
assertIncludes(creatorDestinationPanels, '<CollapsibleTrigger asChild>', 'destination panel owner uses shadcn collapsible trigger')
for (const authorDecisionSlot of [
  'data-slot="creator-author-decision-card"',
  'data-slot="creator-author-decision-question"',
  'data-slot="creator-author-decision-steps"',
  'data-slot="creator-author-decision-step"',
]) {
  assertIncludes(creatorAuthorDecisionCard, authorDecisionSlot, `author decision owner exposes atomic slot ${authorDecisionSlot}`)
}
assertIncludes(creatorAuthorDecisionCard, 'variant="glass"', 'author decision owner composes the shadcn glass card')
assertIncludes(creatorAuthorDecisionCard, 'var(--creator-assistant-border)', 'author decision owner uses semantic surface tokens')
assertIncludes(creatorAuthorDecisionCard, 'var(--creator-assistant-panel-bg)', 'author decision question uses the semantic assistant panel token')
assertNotIncludes(css, '.creator-author-decision-card', 'author decision card must not depend on page-global CSS')
assertNotIncludes(css, '.creator-author-decision-question', 'author decision question must not depend on page-global CSS')
assertNotIncludes(css, '.creator-author-decision-steps', 'author decision basis must not depend on page-global CSS')
assertIncludes(creatorPlanningPanels, 'creator-private-draft-panel', 'planning owner exposes private draft QA selector')
assertIncludes(creatorWorkspaceShell, "from '@/components/ui/card'", 'workspace shell uses shadcn card')
assertIncludes(creatorWorkspaceShell, "from '@/components/ui/button'", 'workspace shell uses shadcn button')
assertIncludes(creatorAgentAssistantPanels, "from '@/components/ui/textarea'", 'Agent assistant owner uses shadcn textarea')
assert(creator.indexOf('<CreatorInlineAssistBar') < creator.indexOf('<div className="creator-editor-prose-stack'), 'inline next-step assist should sit immediately above the prose stack')
assertNotIncludes(creator, '<div className="creator-inline-assist-bar"', 'inline next-step assist must not be page-local JSX')
assertNotIncludes(creator, 'function CreatorShortcutBar(', 'creator shortcut bar must live in workspace components')
assertNotIncludes(creator, 'creator-writing-workspace creator-editor-workspace grid gap-4', 'writing desk grid must live in workspace frame, not the page')
assertNotIncludes(creator, '<div className="creator-command-overlay"', 'quick-create overlay shell must live in workspace components')
assertNotIncludes(creator, '<aside className="creator-assistant-sidecar"', 'assistant sidecar shell must live in workspace components')
assertNotIncludes(creator, '<aside className="creator-command-candidate"', 'command candidate shell must live in workspace components')
assertNotIncludes(creator, 'function DashboardAgentPanel(', 'today priority shell must live in creator components')
assertNotIncludes(creator, 'function StoryHandoffPanel(', 'story handoff must live in workspace components')
assertNotIncludes(creator, 'creator-agent-card creator-guided-coach', 'guided coach shell must live in workspace components')
assertNotIncludes(creator, 'creator-agent-card creator-review-dock', 'review dock shell must live in workspace components')
assertNotIncludes(creator, 'creator-agent-card creator-paragraph-judgment', 'paragraph judgment shell must live in workspace components')
assertNotIncludes(creator, 'creator-agent-card', 'creator pages must not use the old generic agent card shell')
assertIncludes(creatorExperienceSurface, '章节流程', 'writing desk chapter flow copy')
assertIncludes(creatorExperienceSurface, '章节大纲', 'writing desk chapter outline copy')
assertIncludes(creatorExperienceSurface, '决策队列', 'writing desk decision queue copy')
assertIncludes(creatorExperienceSurface, '创作进度', 'writing desk progress rail copy')
assertIncludes(creator, 'creator-editor-paper', 'writing desk paper editor surface')
assertIncludes(creator, '进入发布检查', 'writing desk publish-check handoff')
assertIncludes(creator, '!contentReady ? (', 'writing desk hides coaching card after prose is ready')
assertIncludes(creator, '<CreatorNextBestActionCard', 'writing desk keeps coaching card for unfinished prose')
assertNotIncludes(creator, 'function NextBestActionCard', 'writing desk coaching card must not be page-local')
assertIncludes(creator, '<CreatorCanonCommitBar', 'writing desk publish confirmation uses creator workspace component')
assertNotIncludes(creator, 'function CanonCommitBar', 'writing desk publish confirmation must not be page-local')
assertIncludes(creatorCommitPanels, 'export function CreatorCanonCommitBar', 'commit panel owner exports publish confirmation component')
assertIncludes(creatorCommitPanels, "<Collapsible className={cn('creator-canon-bar'", 'commit panel owner uses shadcn/Radix collapsible')
assertIncludes(creatorCommitPanels, '<CollapsibleContent className="creator-canon-detail-content">', 'commit panel owner keeps detailed decisions folded')
assertIncludes(registry, "{ name: 'CreatorAuthorStatusPanel', path: '@/components/creator/workspace/CreatorCommitPanels'", 'design registry points author status at commit owner')
assertIncludes(registry, "{ name: 'CreatorCanonCommitBar', path: '@/components/creator/workspace/CreatorCommitPanels'", 'design registry points canon commit at commit owner')
assertIncludes(creatorCommitPanels, '详细处理', 'commit panel owner exposes detail trigger')
assertIncludes(creatorCommitPanels, '更多处理方式', 'commit panel owner details use product copy')
assertIncludes(css, '.creator-canon-summary', 'writing desk publish confirmation uses compact summary CSS')
assertIncludes(css, '.creator-canon-primary-actions', 'writing desk publish confirmation uses compact primary actions CSS')
assertIncludes(css, '.creator-canon-detail-content', 'writing desk publish confirmation has detail-content CSS')
assertNotIncludes(creator, '<div className="creator-canon-bar" aria-label="正式剧情确认">', 'writing desk publish confirmation must not be permanently expanded')
assertIncludes(creator, 'upsertLocalDraft', 'local draft write')
for (const forbiddenFacadeMarker of [
  "from '@/local-db/creatorLocalDraftRepository'",
  "from '@/local-db/creatorLocalWritingRepository'",
  "from '@/local-db/creatorLocalSettingAssetRepository'",
  "from '@/local-db/creatorLocalWorkspaceRepository'",
  'export function readLocalDrafts',
  'export function upsertLocalDraft',
  'export function readLocalCreativeReminders',
  'export function upsertLocalCreativeReminder',
  'export function readLocalSettingAssets',
  'export function upsertLocalSettingAsset',
  'export function readLocalWorkspaceSnapshot',
]) {
  assertNotIncludes(pmf, forbiddenFacadeMarker, `Supabase facade must not own local workspace data ${forbiddenFacadeMarker}`)
}
assertIncludes(localDraftRepository, 'export function readLocalDrafts', 'local draft repository owns private draft reads')
assertIncludes(localDraftRepository, 'export function upsertLocalDraft', 'local draft repository owns private draft writes')
assertIncludes(localWritingRepository, 'export function readLocalCreativeReminders', 'local writing repository owns reminder reads')
assertIncludes(localWritingRepository, 'export function upsertLocalCreativeReminder', 'local writing repository owns reminder writes')
assertIncludes(editorRails, "import type { CreativeReminder } from '@/local-db/schema'", 'Editor rails use the neutral local CreativeReminder contract')
assertNotIncludes(editorRails, 'type PmfCreativeReminder', 'Editor rails must not consume CreativeReminder through the Supabase facade')
assertIncludes(localSettingAssetRepository, 'export function readLocalSettingAssets', 'local setting repository owns setting reads')
assertIncludes(localSettingAssetRepository, 'export function upsertLocalSettingAsset', 'local setting repository owns setting writes')
assertIncludes(localWorkspaceRepository, 'export function readLocalWorkspaceSnapshot', 'local workspace repository owns snapshot aggregation')
assertIncludes(settingsRoute, "from './creatorSettingsLoadService'", 'settings route delegates local settings reads through Settings load service')
assertIncludes(settingsRoute, "from './creatorSettingsBrowserActionService'", 'settings route delegates browser actions through Settings browser service')
assertIncludes(settingsRoute, "from './creatorSettingsWorkspaceExportFlowService'", 'settings route delegates workspace export through Settings flow service')
assertIncludes(settingsRoute, 'applyCreatorSettingsDisplayPreferences(preferences)', 'settings route delegates display preference DOM sync')
assertIncludes(settingsRoute, 'runCreatorSettingsWorkspaceExport(preferences)', 'settings route delegates the workspace export flow')
assertIncludes(settingsLoadService, "from '@/local-db/creatorLocalSettingsRepository'", 'Settings load service reads local settings from the local repository')
assertIncludes(settingsActionService, "from '@/local-db/creatorLocalSettingsRepository'", 'Settings action service writes local settings through the local repository')
assertIncludes(settingsBrowserActionService, 'export interface CreatorSettingsBrowserPort', 'Settings browser service exposes replaceable browser port')
assertIncludes(settingsBrowserActionService, 'export function applyCreatorSettingsDisplayPreferences', 'Settings browser service owns display preference DOM sync')
assertIncludes(settingsBrowserActionService, 'export function downloadCreatorWorkspacePackage', 'Settings browser service owns workspace package download')
assertIncludes(settingsWorkspaceExportFlowService, 'downloadWorkspacePackage: downloadCreatorWorkspacePackage', 'Settings export flow delegates browser download')
assertIncludes(settingsWorkspaceExportFlowService, 'buildWorkspacePackage: buildLocalWorkspacePackage', 'Settings export flow delegates package construction')
assertNotIncludes(settingsRoute, 'document.', 'Settings route must not own DOM writes')
assertNotIncludes(settingsRoute, 'URL.createObjectURL', 'Settings route must not own object URL creation')
assertNotIncludes(settingsRoute, 'URL.revokeObjectURL', 'Settings route must not own object URL cleanup')
assertNotIncludes(settingsRoute, 'new Blob', 'Settings route must not own backup blob creation')
assertIncludes(creatorFrameBoundaryService, "from '@/local-db/creatorLocalSettingsRepository'", 'creator frame boundary reads local host status from the local settings repository')
assertIncludes(echoRoute, "from './creatorEchoLoadService'", 'External Echo route delegates reader-signal cache to load service')
assertIncludes(echoLoadService, "from '@/local-db/creatorLocalReaderSignalRepository'", 'External Echo load service caches reader signals through local reader-signal repository')
assertIncludes(echoLoadService, 'local.cacheReaderSignals(batchResult.data)', 'External Echo load service stores normalized source batches locally')
assertIncludes(echoLoadService, 'local.suggestCreativeReminders(cached.signals)', 'External Echo load service derives deterministic local suggestions from normalized signals')
assertIncludes(localDraftRepository, 'readLocalDraftRecords()', 'local draft repository reads draft records')
assertIncludes(localDraftRepository, 'upsertLocalDraftRecord(draft)', 'local draft repository writes draft records')
assertIncludes(localWritingRepository, 'readLocalCreativeReminderRecords(workId)', 'local writing repository reads creative reminder records')
assertIncludes(localSettingAssetRepository, 'readLocalSettingAssetRecords(workId)', 'local setting asset repository reads writing asset records')
assertIncludes(localSettingAssetRepository, 'upsertLocalSettingAssetRecord(next)', 'local setting asset repository writes writing asset records')
assertIncludes(localWorkspaceRepository, 'export interface LocalCreatorWorkspaceSnapshot', 'local workspace repository owns workspace snapshot type')
assertIncludes(localWorkspaceRepository, "from './creatorLocalAgentRepository'", 'local workspace repository delegates operation records through local agent repository')
assertIncludes(localWorkspaceRepository, 'operationRecords: readLocalAgentOperations(20)', 'local workspace repository owns operation record aggregation')
assertNotIncludes(localWorkspaceRepository, "@/lib/pmfSupabase", 'local workspace repository must not import the Supabase facade')
assertIncludes(legacyToolSettings, 'creatorLocalMetaKeys.aiSettings', 'legacy cleanup owner reads the retired tool-setting meta key')
assertIncludes(legacyToolSettings, 'readLegacyCreatorToolSettings', 'legacy cleanup owner exposes read-only compatibility access')
assertNotIncludes(legacyToolSettings, 'upsertLocalMetaValue', 'legacy cleanup owner must not write retired tool settings')
assertNotIncludes(localSettingsRepository, 'creatorLocalMetaKeys.aiSettings', 'active local settings repository must not own retired tool settings')
assertIncludes(localSettingsRepository, 'creatorLocalMetaKeys.displayPreferences', 'local settings repository owns display preference meta key')
assertIncludes(localSettingsRepository, 'creatorLocalMetaKeys.clientId', 'local settings repository owns creator client id meta key')
assertNotIncludes(localSettingsRepository, "@/lib/pmfSupabase", 'local settings repository must not import the Supabase facade')
assertIncludes(localReaderSignalRepository, 'cacheReaderSignalBatches', 'local reader signal repository owns multi-source normalization persistence')
assertIncludes(localReaderSignalRepository, 'readLocalReaderSignalSources', 'local reader signal repository exposes source cursor and freshness state')
assertIncludes(localReaderSignalRepository, 'readerSignalFromRequest', 'local reader signal repository retains request-only compatibility conversion')
assertIncludes(localReaderSignalRepository, 'upsertLocalReaderSignalRecord(signal)', 'local reader signal repository writes through local DB records')
assertNotIncludes(localReaderSignalRepository, "@/lib/pmfSupabase", 'local reader signal repository must not import the Supabase facade')
assertIncludes(pmf, 'local_draft_ref', 'cloud stores draft reference only')
assertIncludes(creator, '还没有私密草稿', 'writing desk local draft empty state')
assertIncludes(creator, '保存后只会出现在当前设备。', 'writing desk draft empty state states local-only boundary')
assertIncludes(creator, 'const authorReady = authorization?.authorized === true', 'writing desk author boundary')
assertIncludes(creator, "const [draftAction, setDraftAction] = useState<'save' | 'publish' | null>(null)", 'writing desk draft action loading state')
assertIncludes(creator, '当前作者状态待确认，暂不能保存或发布。', 'writing desk unauthorized write guard')
assertIncludes(publishBundleRouteViewModels, '作者状态可用', 'publish route view model includes author readiness')
assertIncludes(creator, "draftAction === 'publish' ? '准备中...' : '进入发布检查'", 'writing desk publish handoff loading copy')

assertIncludes(worksRoute, '作品与支线', 'works and branches page')
assertIncludes(worksRoute, "from './creatorWorksBrowserActionService'", 'Works route delegates browser scheduling through service')
assertIncludes(worksRoute, 'scheduleCreatorWorksInitialLoad(load)', 'Works route schedules initial load through service')
assertIncludes(worksBrowserActionService, 'export interface CreatorWorksBrowserPort', 'Works browser action service exposes replaceable browser port')
assertIncludes(worksBrowserActionService, 'export function scheduleCreatorWorksInitialLoad', 'Works browser action service owns initial load scheduling')
assertNotIncludes(worksRoute, 'window.setTimeout', 'Works route must not own browser timers')
assertNotIncludes(worksRoute, 'window.clearTimeout', 'Works route must not own timer cleanup')
for (const worksBrowserServiceForbidden of [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
]) {
  assertNotIncludes(worksBrowserActionService, worksBrowserServiceForbidden, `Works browser action service boundary ${worksBrowserServiceForbidden}`)
}
assertIncludes(worksRoute, '<CreatorWorkStructureStrip', 'works route renders work structure through Creator component')
assertIncludes(creatorWorkStructureStrip, 'export function CreatorWorkStructureStrip', 'work structure strip lives in Creator components')
assertIncludes(creatorWorkStructureStrip, '作品结构', 'works page shows work structure summary')
assertIncludes(creatorWorkStructureStrip, '公开章节', 'works page shows published chapter summary')
assertIncludes(creatorWorkStructureStrip, '请求压力', 'works page shows open request pressure')
assertIncludes(creatorWorkStructureStrip, '待补线索', 'works page shows lines needing content')
assertNotIncludes(creator, 'function WorkStructureStrip(', 'works page must not rebuild work structure strip as a page-local function')
assertIncludes(worksRoute, '新建 IF 支线', 'IF branch creation')
assertIncludes(worksRoute, '作者公告', 'author notice management')
assertIncludes(worksRoute, '支线详情', 'works page selected branch detail')
assertIncludes(creatorBranchLineCard, 'data-slot="creator-branch-line-card"', 'works page exposes stable branch-card ownership through CreatorBranchLineCard')
assertIncludes(creatorBranchLineCard, 'data-line-kind={isMain', 'works page exposes main/IF branch semantics through CreatorBranchLineCard')
assertIncludes(creatorBranchLineCard, 'before:bg-[var(--creator-confirm)]', 'works page uses the semantic main-line accent')
assertIncludes(creatorBranchLineCard, 'before:bg-[var(--creator-accent)]', 'works page uses the semantic IF-line accent')
assertNotIncludes(css, '.creator-line-card', 'branch line cards must not depend on page-global CSS')
assertIncludes(worksRoute, 'selectedParentBranch', 'works route shows parent branch anchor')
assertIncludes(worksRoute, 'selectedParentChapter', 'works route shows parent chapter anchor')
assertIncludes(worksRoute, 'selectedBranchChapters', 'works route selected branch chapter list')
assertIncludes(worksRoute, 'selectedBranchRequests', 'works route selected branch request count')
assertIncludes(worksRoute, "const [workAction, setWorkAction] = useState<WorkStructureAction | null>(null)", 'works route action loading state')
assertIncludes(worksRoute, "workAction === 'notice' ? '保存中...' : '保存公告'", 'author notice loading state')
assertIncludes(worksRoute, "workAction === 'hide' ? '隐藏中...' : '隐藏作品'", 'hide work loading state')
assertIncludes(worksRoute, "archiving={workAction === 'archive'}", 'archive branch loading state is passed into CreatorBranchLineCard')
assertIncludes(creatorBranchLineCard, "archiving ? '归档中...' : '归档支线'", 'archive branch loading copy lives in CreatorBranchLineCard')
assertIncludes(worksRoute, "workAction === 'create-branch' ? '创建中...' : '创建支线'", 'create branch loading state')

assertIncludes(publishRoute, '必须通过', 'publish must-pass gates')
assertIncludes(publishRoute, '提醒项', 'publish warning gates')
assertIncludes(publishRoute, '二次确认', 'publish second confirmation')
assertIncludes(creatorPublishContextPanel, 'export function CreatorPublishBundleContextPanel', 'publish context component exports component')
assertIncludes(creatorPublishContextPanel, 'creator-publish-bundle-context-panel', 'publish context component exposes selector')
assertIncludes(creatorPublishContextPanel, 'Card variant="glass"', 'publish context component uses shadcn Card')
assertIncludes(creatorPublishContextPanel, 'Badge variant={requestStatusTone}', 'publish context component uses shadcn Badge for request status')
assertIncludes(creatorPublishContextPanel, '去向确认', 'publish context component shows destination confirmation')
assertIncludes(creatorPublishContextPanel, '外界回声', 'publish context component shows External Echo section')
assertNotIncludes(publishRoute, '<h2 className="text-lg font-semibold text-[var(--creator-text)]">发布影响</h2>', 'publish right rail must not return to page-local publish impact Panel')
assertNotIncludes(creator, 'function PublishImpactStrip', 'publish impact strip must live in Creator component layer')
assertIncludes(creatorPublishImpactStrip, 'export function CreatorPublishBundleImpactStrip', 'publish impact component exports component')
assertIncludes(creatorPublishImpactStrip, 'creator-publish-bundle-impact-strip', 'publish impact component exposes selector')
assertIncludes(creatorPublishImpactStrip, 'Card variant="glass"', 'publish impact component uses shadcn Card')
assertIncludes(creatorPublishImpactStrip, 'Badge variant="gold"', 'publish impact component uses shadcn Badge')
assertIncludes(creatorPublishImpactStrip, '发布影响总览', 'publish page shows reader impact summary')
assertIncludes(creatorPublishImpactStrip, '读者端展示', 'publish impact includes reader-visible location')
assertIncludes(creatorPublishImpactStrip, '章节挂点', 'publish impact includes anchor')
assertIncludes(creatorPublishImpactStrip, '请求影响', 'publish impact includes request outcome')
assertIncludes(creatorPublishImpactStrip, '失败保护', 'publish impact includes failure recovery')
assertIncludes(publishRoute, 'readerLocationLabel', 'publish route derives reader location consistently')
assertIncludes(publishRoute, 'anchorLabel', 'publish route derives anchor consistently')
assertIncludes(publishRoute, 'requestImpactLabel', 'publish route derives request impact consistently')
assertIncludes(publishRoute, '发布未完成，正文仍保存在本机', 'publish failure preserves manuscript copy')
assertIncludes(publishRoute, '发布包也已保留', 'publish failure preserves bundle copy')
assertIncludes(publishRoute, 'const [bundleAction, setBundleAction] = useState<string | null>(null)', 'publish lifecycle action loading state')
assertIncludes(publishRoute, '发布完成', 'publish success summary')
assertIncludes(publishRoute, 'pendingLabel="提交中..."', 'publish submit loading copy')
assertIncludes(publishRoute, 'lastPublished.requestImpact', 'publish result request impact')
assertIncludes(publishRoute, '没有可检查的初稿', 'publish check local draft empty state')
assertIncludes(publishRoute, '先到写作台保存私密草稿', 'publish check empty state points back to writing desk')
assertIncludes(pmf, "status: 'published'", 'publish updates request status')

assertIncludes(settingsRoute, '本机工作区', 'Local Workspace settings')
assertIncludes(creatorAppFrame, '备份恢复', 'signed-out Local Workspace preview uses backup/recovery framing')
assertIncludes(creator, '<CreatorSettingsRoute />', 'LocalCreatorApp mounts settings route owner')
assertIncludes(settingsRoute, 'CreatorSettingsBoundaryStrip', 'settings page includes componentized boundary strip')
assertIncludes(settingsRoute, 'CreatorLocalWorkspacePanel', 'settings page includes componentized local workspace panel')
assertIncludes(settingsRoute, 'CreatorWorkspacePreferencesPanel', 'settings page includes componentized workspace preferences')
assertIncludes(settingsRoute, 'CreatorSettingsStatusRail', 'settings page includes componentized status rail')
assertNotIncludes(creator, 'function SettingsPage()', 'settings route body must not return to LocalCreatorApp')
assertNotIncludes(creator, 'function SettingsBoundaryStrip', 'settings page must not own boundary strip markup')
assertIncludes(creatorSettingsBoundaryStrip, 'export function CreatorSettingsBoundaryStrip', 'settings boundary strip lives in Creator component layer')
assertIncludes(creatorSettingsBoundaryStrip, 'Card', 'settings boundary strip composes shadcn Card')
assertIncludes(creatorSettingsBoundaryStrip, 'Badge', 'settings boundary strip composes shadcn Badge')
for (const marker of [
  'variant="default"',
  'padding="none"',
  'CardContent',
  'data-slot="creator-settings-boundary-strip"',
  'data-slot="creator-settings-boundary-list"',
  'data-slot="creator-settings-boundary-item"',
  'data-slot="creator-settings-boundary-status"',
  'data-slot="creator-settings-boundary-value"',
  'data-slot="creator-settings-boundary-detail"',
  '<dl',
  '<dt',
  '<dd',
]) {
  assertIncludes(creatorSettingsBoundaryStrip, marker, `settings boundary strip keeps atomic structure ${marker}`)
}
for (const forbidden of ['variant="glass"', 'pu-motion-lift', '<CardHeader', '<CardTitle', '<CardDescription']) {
  assertNotIncludes(creatorSettingsBoundaryStrip, forbidden, `settings boundary strip must stay one solid semantic status band ${forbidden}`)
}
assertNotIncludes(css, '.creator-settings-boundary-', 'settings boundary strip must not add page-global CSS hooks')
for (const marker of [
  'export function CreatorLocalWorkspacePanel',
  'creator-local-workspace-panel',
  '<Card',
  'variant="glass"',
  'padding="none"',
  'CardFooter',
  'Button variant="gold"',
  'Badge variant="outline"',
  'AlertTitle',
  'Separator',
  'data-slot="creator-local-workspace-panel"',
  'data-slot="creator-local-workspace-content"',
  'data-slot="creator-local-workspace-rail"',
  'data-slot="creator-local-workspace-summary-list"',
  'data-slot="creator-local-workspace-summary-item"',
  'data-slot="creator-local-workspace-summary-value"',
  'data-slot="creator-local-workspace-summary-detail"',
  'data-slot="creator-local-workspace-permission-list"',
  'data-slot="creator-local-workspace-permission-item"',
  'data-slot="creator-local-workspace-permission-status"',
  'data-slot="creator-local-workspace-operation-list"',
  'data-slot="creator-local-workspace-operation-item"',
  'data-slot="creator-local-workspace-operation-status"',
  'data-slot="creator-local-workspace-operation-empty"',
  'data-slot="creator-local-workspace-backup-actions"',
  'data-slot="creator-local-workspace-export-action"',
  'data-slot="creator-local-workspace-import-action"',
  '<dl',
  '<dt',
  '<dd',
  '<ul',
  '<ol',
  '本机保存',
  '导出备份',
  '助手权限',
  '操作记录',
]) {
  assertIncludes(creatorLocalWorkspacePanel, marker, `local workspace panel keeps atomic structure ${marker}`)
}
assert(
  [...creatorLocalWorkspacePanel.matchAll(/<Card(?:\s|>)/g)].length === 1,
  'local workspace panel must keep exactly one shadcn Card owner',
)
for (const forbidden of ['rounded-lg', 'rounded-xl', 'pu-motion-lift']) {
  assertNotIncludes(creatorLocalWorkspacePanel, forbidden, `local workspace panel must stay free of nested card-wall presentation ${forbidden}`)
}
assertNotIncludes(css, '.creator-local-workspace-', 'local workspace panel must not add page-global CSS hooks')
assertIncludes(creatorWorkspacePreferencesPanel, 'export function CreatorWorkspacePreferencesPanel', 'workspace preferences panel lives in Creator component layer')
assertIncludes(creatorWorkspacePreferencesPanel, 'creator-workspace-preferences-panel', 'workspace preferences panel exposes selector')
assertIncludes(creatorWorkspacePreferencesPanel, 'Card variant="glass"', 'workspace preferences panel composes shadcn Card')
assertIncludes(creatorWorkspacePreferencesPanel, 'Checkbox', 'workspace preferences panel composes shadcn Checkbox')
assertIncludes(creatorWorkspacePreferencesPanel, 'ConfirmActionDialog', 'workspace preferences panel confirms preference reset')
assertIncludes(creatorSettingsStatusRail, 'export function CreatorSettingsStatusRail', 'settings status rail lives in Creator component layer')
assertIncludes(creatorSettingsStatusRail, 'creator-settings-status-rail', 'settings status rail exposes selector')
for (const marker of [
  '<Card',
  'variant="glass"',
  'padding="none"',
  'Separator',
  '<Badge',
  'variant={item.ready ? \'stasis\' : \'outline\'}',
  'data-slot="creator-settings-status-card"',
  'data-slot="creator-settings-status-list"',
  'data-slot="creator-settings-status-item"',
  'data-slot="creator-settings-readiness-list"',
  'data-slot="creator-settings-readiness-item"',
  'data-slot="creator-settings-boundary-state-list"',
  'data-slot="creator-settings-boundary-state-item"',
  'data-slot="creator-settings-promise-list"',
  'data-slot="creator-settings-promise-item"',
  '<dl',
  '<ul',
]) {
  assertIncludes(creatorSettingsStatusRail, marker, `settings status rail keeps atomic structure ${marker}`)
}
assert(
  [...creatorSettingsStatusRail.matchAll(/<Card(?:\s|>)/g)].length === 1,
  'settings status rail must keep exactly one shadcn Card owner',
)
for (const forbidden of ['rounded-lg', 'rounded-xl', 'pu-motion-lift']) {
  assertNotIncludes(creatorSettingsStatusRail, forbidden, `settings status rail must stay free of card-wall presentation ${forbidden}`)
}
assertNotIncludes(css, '.creator-settings-status-', 'settings status rail must not add page-global CSS hooks')
assertIncludes(creatorSettingsStatusRail, '当前状态', 'settings status rail shows current state')
assertIncludes(creatorSettingsStatusRail, '工作台准备度', 'settings status rail shows readiness')
assertIncludes(creatorSettingsStatusRail, '公开边界', 'settings status rail shows public boundary')
assertIncludes(creatorSettingsStatusRail, '发布承诺', 'settings status rail shows publication promises')
assertIncludes(registry, 'CreatorSettingsBoundaryStrip', 'design-system registry includes settings boundary strip')
assertIncludes(registry, 'CreatorLocalWorkspacePanel', 'design-system registry includes local workspace panel')
assertIncludes(registry, 'CreatorWorkspacePreferencesPanel', 'design-system registry includes workspace preferences panel')
assertIncludes(registry, 'CreatorSettingsStatusRail', 'design-system registry includes settings status rail')
assertIncludes(pageContracts, 'CreatorSettingsBoundaryStrip', 'page contracts include settings boundary strip')
assertIncludes(pageContracts, 'CreatorLocalWorkspacePanel', 'page contracts include local workspace panel')
assertIncludes(pageContracts, 'CreatorWorkspacePreferencesPanel', 'page contracts include workspace preferences panel')
assertIncludes(pageContracts, 'CreatorSettingsStatusRail', 'page contracts include settings status rail')
assertIncludes(componentsDoc, 'CreatorSettingsBoundaryStrip', 'components doc includes settings boundary strip')
assertIncludes(componentsDoc, 'CreatorLocalWorkspacePanel', 'components doc includes local workspace panel')
assertIncludes(componentsDoc, 'CreatorWorkspacePreferencesPanel', 'components doc includes workspace preferences panel')
assertIncludes(componentsDoc, 'CreatorSettingsStatusRail', 'components doc includes settings status rail')
assertIncludes(componentStateMatrix, 'CreatorSettingsBoundaryStrip', 'component matrix includes settings boundary strip')
assertIncludes(componentStateMatrix, 'CreatorLocalWorkspacePanel', 'component matrix includes local workspace panel')
assertIncludes(componentStateMatrix, 'CreatorWorkspacePreferencesPanel', 'component matrix includes workspace preferences panel')
assertIncludes(componentStateMatrix, 'CreatorSettingsStatusRail', 'component matrix includes settings status rail')
assertIncludes(creatorExperienceSurface, '创作设备', 'settings boundary strip shows creator device')
assertIncludes(creatorSettingsBoundaryStrip, '公开规则', 'settings boundary strip shows public rule')
assertIncludes(creatorExperienceSurface, '公开边界', 'settings status rail shows public boundary')
assertIncludes(creatorSettingsBoundaryStrip, '公开自动写作关闭', 'settings boundary strip shows public automatic writing disabled')
assertNotIncludes(creator, '<h2 className="text-lg font-semibold text-[var(--creator-text)]">当前状态</h2>', 'settings status rail must not return as page-local Panel')
assertNotIncludes(creator, '<h2 className="text-lg font-semibold text-[var(--creator-text)]">工作台准备度</h2>', 'settings readiness rail must not return as page-local Panel')
assertNotIncludes(creator, '<h2 className="text-lg font-semibold text-[var(--creator-text)]">公开边界</h2>', 'settings public-boundary rail must not return as page-local Panel')
assertNotIncludes(creator, '<h2 className="text-lg font-semibold text-[var(--creator-text)]">发布承诺</h2>', 'settings promise rail must not return as page-local Panel')
assertNotIncludes(creatorExperienceSurface, '平台创作服务', 'settings page must not imply a hosted author workspace')
assertNotIncludes(creatorExperienceSurface, '平台代写', 'settings page must not imply platform ghostwriting')
assertIncludes(creatorWorkspacePreferencesPanel, '减少动态效果', 'reduced motion setting')
assertIncludes(creatorWorkspacePreferencesPanel, '减少透明效果', 'reduced transparency setting')
assertIncludes(settingsRoute, 'const [clearing, setClearing] = useState(false)', 'settings clear loading state')
assertIncludes(creatorWorkspacePreferencesPanel, "clearing ? '重置中...' : '重置显示偏好'", 'settings reset loading copy')
assertIncludes(settingsRoute, "saving ? '保存中...' : '保存显示偏好'", 'settings save loading copy')
assertIncludes(creatorExperienceSurface, '本机资料不会自动公开', 'settings local-data publication boundary')
assertNotIncludes(creatorExperienceSurface, '凭证', 'settings page must not expose credential-like terminology')
assertNotIncludes(creatorExperienceSurface, '访问凭证', 'settings page must not expose access-credential wording')
assertNotIncludes(creatorExperienceSurface, '服务地址', 'settings page must not expose service-address terminology')
assertNotIncludes(creatorExperienceSurface, '服务名称', 'settings page must not expose service-name terminology')
assertNotIncludes(creatorExperienceSurface, '本地创作服务', 'settings page must not expose retired local-service setup')
assertNotIncludes(creatorExperienceSurface, '自带创作服务', 'settings page must not expose retired provider setup')
assertNotIncludes(creatorExperienceSurface, '凭据状态', 'settings page must not expose retired credential-state setup')
assertNotIncludes(creatorExperienceSurface, 'CreatorSettingsToolPanel', 'retired settings tool component must not return')
assertNotIncludes(creatorExperienceSurface, 'http://127.0.0.1', 'settings page must not show localhost examples')
assertNotIncludes(creatorExperienceSurface, 'qa-local', 'settings page must not show QA version labels')
assertIncludes(css, "data-creator-motion='reduced'", 'reduced motion CSS hook')
assertIncludes(css, "data-creator-transparency='reduced'", 'reduced transparency CSS hook')

assertNotIncludes(creator, 'UniverseDepth', 'Creator app must not import Reader depth background')
assertNotIncludes(creator, 'pu-depth-stage', 'Creator app must not use Reader depth stage')
assert(!/星云|粒子|行星景深/.test(creator), 'Creator UI must not mention Reader visual residue')
assertIncludes(creatorWorkbenchRootCss, 'background: var(--creator-bg)', 'Creator workbench uses the neutral semantic workspace background')
assertIncludes(creatorWorkbenchMainCss, 'background: transparent', 'Creator workbench scroll surface does not add a second decorative layer')
assertNotIncludes(creatorWorkbenchRootCss, '--creator-workbench-paper-ruling', 'Creator workbench must not restore ruled-paper decoration')
assertNotIncludes(creatorWorkbenchMainCss, '--creator-workbench-main-ruling', 'Creator workbench main must not restore ruled-paper decoration')
for (const residue of [
  'radial-gradient',
  '--pu-bg-reader-gateway',
  '--pu-bg-story-reader',
  'reader-gateway-planets',
  'story-reader-planets',
  'pu-depth-stage',
  'UniverseDepth',
]) {
  assertNotIncludes(creatorWorkbenchRootCss, residue, `Creator workbench root CSS must not include Reader depth residue ${residue}`)
  assertNotIncludes(creatorWorkbenchMainCss, residue, `Creator workbench main CSS must not include Reader depth residue ${residue}`)
}

const visibleCreatorCopy = visibleFragments(creator).join('\n')
for (const forbidden of [
  'Supabase',
  'RLS',
  'trace',
  'provider',
  'fallback',
  'API key',
  '后端',
  '接口',
  '同步',
  '回写',
  '数据库',
  'AI',
  '模型',
  'LLM',
]) {
  assertNotIncludes(visibleCreatorCopy, forbidden, `Creator UI forbidden term ${forbidden}`)
}

assertNotIncludes(tokens, '--pu-bg-creator-workbench', 'Creator token system must not keep a planet background for the author workbench')
assertNotIncludes(tokens, 'pu-depth-stage-creator', 'Creator token system must not expose a depth-stage class')
console.log('[creator-ui-contract] PASS')
