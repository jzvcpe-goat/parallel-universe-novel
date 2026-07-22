import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function pathFor(path: string) {
  return resolve(root, path)
}

function read(path: string) {
  const absolute = pathFor(path)
  if (!existsSync(absolute)) {
    throw new Error(`Missing required file: ${path}`)
  }
  return readFileSync(absolute, 'utf8')
}

function assert(condition: boolean, label: string) {
  if (!condition) throw new Error(label)
}

function assertIncludes(body: string, needle: string, label: string) {
  assert(body.includes(needle), `${label}: expected ${JSON.stringify(needle)}`)
}

function assertNotIncludes(body: string, needle: string, label: string) {
  assert(!body.includes(needle), `${label}: must not include ${JSON.stringify(needle)}`)
}

const requiredDocs = [
  'AGENTS.md',
  'docs/product/creator-ui-vision.md',
  'docs/product/creator-user-flows.md',
  'docs/product/ui-copy-dictionary.md',
  'docs/product/banned-ui-terms.md',
  'docs/product/LOCAL_CREATOR_UI_UX_BACKEND_ALIGNED_PLAN.md',
  'docs/product/LOCAL_CREATOR_UI_UX_REVIEW_PLAN.md',
  'docs/design-system/tokens.md',
  'docs/design-system/components.md',
  'docs/design-system/liquid-glass.md',
  'docs/design-system/motion.md',
  'docs/design-system/accessibility.md',
  'docs/data-contracts/creator-data-map.md',
  'docs/data-contracts/request-status-machine.md',
  'docs/data-contracts/publish-flow.md',
  'docs/data-contracts/draft-storage-boundary.md',
  'docs/harness/implementation-rules.md',
  'docs/harness/page-acceptance-tests.md',
  'docs/harness/component-dod.md',
  'docs/harness/visual-regression-checklist.md',
]

const requiredScripts = [
  'scripts/check-ui-copy.ts',
  'scripts/check-design-tokens.ts',
  'scripts/check-no-mock-data.ts',
  'scripts/check-creator-ui-contract.ts',
  'scripts/check-creator-author-flow-contract.ts',
]

const requiredUiPrimitives = [
  'app/src/components/ui/button.tsx',
  'app/src/components/ui/card.tsx',
  'app/src/components/ui/dialog.tsx',
  'app/src/components/ui/alert-dialog.tsx',
  'app/src/components/ui/select.tsx',
  'app/src/components/ui/tabs.tsx',
  'app/src/components/ui/sheet.tsx',
  'app/src/components/ui/scroll-area.tsx',
  'app/src/components/ui/tooltip.tsx',
  'app/src/components/ui/liquid-glass.tsx',
]

const requiredCreatorComponents = [
  'app/src/components/creator/CreatorShell.tsx',
  'app/src/components/creator/CreatorLoginSurfaces.tsx',
  'app/src/components/creator/CreatorTodayNextStepsPanel.tsx',
  'app/src/components/creator/CreatorStatePanel.tsx',
  'app/src/components/creator/CreatorActionBar.tsx',
  'app/src/components/creator/ConfirmActionDialog.tsx',
  'app/src/components/creator/LocalStatusPill.tsx',
]

for (const path of [...requiredDocs, ...requiredScripts, ...requiredUiPrimitives, ...requiredCreatorComponents]) {
  assert(existsSync(pathFor(path)), `missing baseline file: ${path}`)
}

const componentsJson = read('app/components.json')
const packageJson = read('package.json')
const creatorApp = read('app/src/apps/creator/LocalCreatorApp.tsx')
const creatorSessionService = read('app/src/apps/creator/creatorSessionService.ts')
const creatorRouteRegistry = read('app/src/apps/creator/creatorRouteRegistry.ts')
const creatorDashboardRoute = read('app/src/apps/creator/routes/CreatorDashboardRoute.tsx')
const creatorEchoRoute = read('app/src/apps/creator/routes/CreatorEchoRoute.tsx')
const creatorEchoController = read('app/src/apps/creator/routes/creatorEchoRouteController.ts')
const creatorWorksRoute = read('app/src/apps/creator/routes/CreatorWorksRoute.tsx')
const creatorPublishBundleRoute = read('app/src/apps/creator/routes/CreatorPublishBundleRoute.tsx')
const creatorPublishBundleActionService = read('app/src/apps/creator/routes/creatorPublishBundleActionService.ts')
const creatorPublishBundleLoadService = read('app/src/apps/creator/routes/creatorPublishBundleLoadService.ts')
const creatorSettingsRoute = read('app/src/apps/creator/routes/CreatorSettingsRoute.tsx')
const creatorEditorDraftPersistence = read('app/src/apps/creator/routes/creatorEditorDraftPersistence.ts')
const creatorSettingsLoadService = read('app/src/apps/creator/routes/creatorSettingsLoadService.ts')
const creatorSettingsActionService = read('app/src/apps/creator/routes/creatorSettingsActionService.ts')
const creatorShell = read('app/src/components/creator/CreatorShell.tsx')
const creatorLoginSurfaces = read('app/src/components/creator/CreatorLoginSurfaces.tsx')
const todayNextStepsPanel = read('app/src/components/creator/CreatorTodayNextStepsPanel.tsx')
const statePanel = read('app/src/components/creator/CreatorStatePanel.tsx')
const confirmDialog = read('app/src/components/creator/ConfirmActionDialog.tsx')
const statusPill = read('app/src/components/creator/LocalStatusPill.tsx')
const creatorFrameBoundaryService = read('app/src/components/creator/creatorFrameBoundaryService.ts')
const dataWrapper = read('app/src/lib/pmfSupabase.ts')
const pmfTypes = read('app/src/features/pmf/types.ts')
const registry = read('app/src/design-system/registry.ts')
const pageContracts = read('app/src/design-system/page-contracts.ts')
const appCss = read('app/src/index.css')
const tokensCss = read('app/src/styles/parallel-universe-tokens.css')
const plan = read('docs/product/LOCAL_CREATOR_UI_UX_BACKEND_ALIGNED_PLAN.md')
const reviewPlan = read('docs/product/LOCAL_CREATOR_UI_UX_REVIEW_PLAN.md')
const implementationRules = read('docs/harness/implementation-rules.md')
const componentDod = read('docs/harness/component-dod.md')
const creatorImplementationSurface = [
  creatorApp,
  creatorSessionService,
  creatorDashboardRoute,
  creatorEchoRoute,
  creatorEchoController,
  creatorWorksRoute,
  creatorPublishBundleRoute,
  creatorPublishBundleActionService,
  creatorPublishBundleLoadService,
  creatorSettingsRoute,
  creatorEditorDraftPersistence,
  creatorSettingsLoadService,
  creatorSettingsActionService,
].join('\n')

assertIncludes(componentsJson, '"tsx": true', 'shadcn config uses TSX')
assertIncludes(componentsJson, '"cssVariables": true', 'shadcn config uses CSS variables')
assertIncludes(componentsJson, '"ui": "@/components/ui"', 'shadcn config points to app UI primitives')
assertIncludes(componentsJson, '"iconLibrary": "lucide"', 'shadcn config uses lucide icons')

for (const scriptName of [
  'dev:creator',
  'build:creator',
  'test:creator',
  'check:ui-copy',
  'check:design-tokens',
  'check:no-mock-data',
  'check:creator-ui-contract',
  'check:creator-author-flow-contract',
  'qa:local-creator-routes',
]) {
  assertIncludes(packageJson, `"${scriptName}"`, `package script ${scriptName}`)
}

assertIncludes(plan, 'Current Authoritative Backend/UI Sources', 'Creator UI/UX plan has authoritative source section')
assertIncludes(plan, 'Current UI Gap Summary', 'Creator UI/UX plan has UI gap summary')
assertIncludes(plan, 'Capability Freeze For Next UI Pass', 'Creator UI/UX plan has capability freeze')
assertIncludes(plan, 'Implementation Milestone Contract', 'Creator UI/UX plan has milestone contract')
assertIncludes(plan, 'M0', 'Creator UI/UX plan names M0')
assertIncludes(plan, 'M1', 'Creator UI/UX plan names M1')
assertIncludes(reviewPlan, 'Manual Decisions For Product Owner', 'Creator review plan has manual decision table')
assertIncludes(reviewPlan, 'Current Backend Reality', 'Creator review plan has backend capability section')
assertIncludes(reviewPlan, 'Must Not Claim Yet', 'Creator review plan documents unsupported claims')
assertIncludes(reviewPlan, 'Page-Level UI/UX Plan', 'Creator review plan has page-level plan')
assertIncludes(reviewPlan, 'Required Commands After Implementation', 'Creator review plan has implementation gates')
assertIncludes(reviewPlan, 'Do not merge the UI pass until the user reviews the preview.', 'Creator review plan preserves preview-before-merge rule')

assertIncludes(implementationRules, 'Current Repository Baseline', 'Harness rules include repository baseline')
assertIncludes(implementationRules, 'File-Level M0/M1 Plan', 'Harness rules include file-level M0/M1 plan')
assertIncludes(implementationRules, 'LOCAL_CREATOR_UI_UX_REVIEW_PLAN.md', 'Harness rules point to review plan')
assertIncludes(implementationRules, 'Do not skip ahead', 'Harness rules forbid skipping ahead')
assertIncludes(componentDod, 'loading', 'component DoD requires loading state')
assertIncludes(componentDod, 'empty', 'component DoD requires empty state')
assertIncludes(componentDod, 'error', 'component DoD requires error state')
assertIncludes(componentDod, 'disabled', 'component DoD requires disabled state')

for (const route of [
  '/creator/login',
  '/creator',
  '/creator/requests',
  '/creator/editor',
  '/creator/works',
  '/creator/publish',
  '/creator/settings',
]) {
  assertIncludes(creatorRouteRegistry, route, `Creator route ${route}`)
}

for (const entry of ['今日创作路径', '外界回声', '灵感到正文', '本机写作智库', '写作台', '发布包', '本机工作区']) {
  assertIncludes(creatorRouteRegistry, `label: '${entry}'`, `Creator Pivot V2 IA entry ${entry}`)
}
assertIncludes(creatorRouteRegistry, 'getCreatorPivotNavItems', 'Creator shell navigation uses Pivot V2 registry entries')
assertIncludes(creatorRouteRegistry, 'getCreatorPivotRouteAliases', 'Creator Pivot route aliases are registry-owned')

assertIncludes(creatorShell, 'creator-workbench-page', 'Creator shell uses Creator-owned page container')
assertIncludes(creatorShell, 'brandTone="creator"', 'Creator shell uses Creator brand tone')
assertIncludes(creatorShell, 'brandIcon="creatorBrand"', 'Creator shell uses a dedicated Creator brand icon')
assertIncludes(creatorShell, 'LocalStatusPill', 'Creator shell renders local status pill')
assertNotIncludes(creatorShell, 'narrative-page', 'Creator shell does not reuse Reader narrative page')
assertNotIncludes(creatorShell, 'sticky top-3', 'Creator shell topbar cannot cover long-form content')
assertIncludes(creatorLoginSurfaces, 'export function CreatorLoginPanel', 'Creator login surface lives in component layer')
assertIncludes(creatorLoginSurfaces, 'export function CreatorAccessGate', 'Creator signed-out access gate lives in component layer')
assertNotIncludes(creatorLoginSurfaces, 'CreatorLockedWorkbenchPreview', 'retired locked queue preview stays deleted')
assertNotIncludes(creatorLoginSurfaces, 'locked-workbench-preview', 'retired locked queue hook stays deleted')
assertNotIncludes(creatorLoginSurfaces, '待处理队列', 'signed-out access must not imitate a request backend')
assertNotIncludes(creatorLoginSurfaces, 'CreatorLocalLoopPanel', 'redundant static Today loop owner stays deleted')
assertNotIncludes(creatorLoginSurfaces, 'local-creator-loop', 'retired static Today loop hooks stay deleted')
assertNotIncludes(creatorApp, 'function LockedWorkbenchPreview', 'Creator app must not own locked preview UI')
assertNotIncludes(creatorApp, 'function LocalCreatorLoopPanel', 'Creator app must not own local loop UI')
assertIncludes(creatorApp, "from './creatorSessionService'", 'Creator app delegates author session side effects to session service')
assertNotIncludes(creatorApp, "from '@/lib/pmfSupabase'", 'Creator app must not import the Supabase facade directly')
assertNotIncludes(creatorApp, 'window.setTimeout', 'Creator app must not own browser startup timers')
assertIncludes(creatorSessionService, 'export async function readCreatorSession', 'Creator session service owns author-session read')
assertIncludes(creatorSessionService, 'export function sendCreatorLoginLink', 'Creator session service owns login-link send')
assertIncludes(creatorSessionService, 'export function scheduleCreatorSessionRefresh', 'Creator session service owns startup scheduling')
assertIncludes(creatorFrameBoundaryService, 'export function detectCreatorLocalSurface', 'Creator frame boundary owns local surface detection')
assertIncludes(creatorFrameBoundaryService, 'export function signOutCreatorSession', 'Creator frame boundary owns sign-out')
assertIncludes(creatorFrameBoundaryService, 'export function bindCreatorFrameShortcuts', 'Creator frame boundary owns shortcut event binding')
assertIncludes(creatorFrameBoundaryService, 'export function dispatchCreatorCommandCandidateApply', 'Creator frame boundary owns candidate event dispatch')
for (const icon of ['creatorHome', 'creatorInbox', 'creatorSpark', 'creatorWrite', 'creatorWorks', 'creatorPublish', 'creatorSettings']) {
  assertIncludes(creatorRouteRegistry, `icon: '${icon}'`, `Creator nav dedicated icon ${icon}`)
}

assertIncludes(todayNextStepsPanel, "phase: 'loading' | 'ready' | 'error'", 'Today next steps panel exposes route phases')
assertIncludes(todayNextStepsPanel, 'data-slot="creator-today-next-steps-empty"', 'Today next steps panel exposes empty state')
assertIncludes(todayNextStepsPanel, 'data-slot="creator-today-next-steps-error"', 'Today next steps panel exposes error state')
assertIncludes(todayNextStepsPanel, 'disabled?: boolean', 'Today next steps panel exposes disabled item state')
assertIncludes(statePanel, "export type CreatorStateKind = 'loading' | 'empty' | 'error' | 'locked'", 'Creator state panel exposes loading empty error locked states')
assertIncludes(statePanel, 'disabled?: boolean', 'Creator state panel exposes disabled state')
assertIncludes(confirmDialog, 'AlertDialog', 'Creator confirmation uses Radix AlertDialog')
assertIncludes(confirmDialog, 'pending', 'Creator confirmation exposes pending state')
assertIncludes(confirmDialog, "variant?: 'gold' | 'destructive'", 'Creator confirmation supports destructive actions')
assertIncludes(statusPill, 'isLocalSurface', 'Local status pill checks localhost surface')

for (const wrapper of [
  'getPmfSession',
  'sendCreatorMagicLink',
  'getCreatorAuthorizationStatus',
  'syncCreatorClient',
  'listCreatorWorks',
  'listCreatorBranches',
  'listCreatorChapters',
  'listCreatorRequests',
  'listCreatorPublishEvents',
  'updateReaderRequestStatus',
  'publishOwnPlatformBundle',
  'readLocalDrafts',
  'upsertLocalDraft',
  'readCreatorDisplayPreferences',
  'writeCreatorDisplayPreferences',
]) {
  assertIncludes(dataWrapper + creatorImplementationSurface, wrapper, `Creator baseline uses ${wrapper}`)
}
assertIncludes(dataWrapper, 'publishBundleTransaction', 'Creator baseline uses the server-owned publish transaction adapter')

assertIncludes(pmfTypes, "'pending'", 'request status pending exists')
assertIncludes(pmfTypes, "'acknowledged'", 'request status acknowledged exists')
assertIncludes(pmfTypes, "'in_progress'", 'request status in_progress exists')
assertIncludes(pmfTypes, "'published'", 'request status published exists')
assertIncludes(pmfTypes, "'rejected'", 'request status rejected exists')
assertIncludes(creatorImplementationSurface, 'canMoveRequestStatus', 'Creator implementation has status-machine helper')
assertIncludes(creatorImplementationSurface, "current === 'published' || current === 'rejected'", 'Creator implementation blocks terminal request transitions')

assertIncludes(registry, "surfaces: ['creator']", 'design-system registry has Creator surfaces')
assertIncludes(pageContracts, "route: '/creator'", 'page contract includes Creator route')
assertIncludes(pageContracts, 'CreatorShell', 'page contract requires CreatorShell')
assertIncludes(pageContracts, 'ConfirmActionDialog', 'page contract requires confirmation dialog')
assertIncludes(pageContracts, 'UniverseDepth', 'Reader page contracts keep UniverseDepth outside Creator contract')
assertNotIncludes(pageContracts.split("route: '/creator'")[1]?.split('},')[0] || '', 'UniverseDepth', 'Creator contract must not require Reader depth pattern')

assertIncludes(appCss, '.creator-workbench-page', 'Creator page class exists')
assertIncludes(appCss, "html[data-creator-motion='reduced']", 'reduced motion CSS exists')
assertIncludes(appCss, "html[data-creator-transparency='reduced']", 'reduced transparency CSS exists')
assertIncludes(tokensCss, '.pu-depth-stage-reader', 'Reader depth stage exists')
assertIncludes(tokensCss, '.pu-depth-stage-story', 'Story depth stage exists')
assertNotIncludes(tokensCss, '.pu-depth-stage-creator', 'Creator depth stage must not exist')

console.log('[creator-m0-m1-baseline] PASS')
