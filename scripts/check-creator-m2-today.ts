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

function assert(condition: boolean, label: string) {
  if (!condition) throw new Error(label)
}

function sliceBetween(body: string, start: string, end: string) {
  const startIndex = body.indexOf(start)
  if (startIndex === -1) throw new Error(`Missing section start: ${start}`)
  const endIndex = body.indexOf(end, startIndex + start.length)
  if (endIndex === -1) throw new Error(`Missing section end: ${end}`)
  return body.slice(startIndex, endIndex)
}

const creator = read('app/src/apps/creator/LocalCreatorApp.tsx')
const dashboardRoute = read('app/src/apps/creator/routes/CreatorDashboardRoute.tsx')
const dashboardBrowserActionService = read('app/src/apps/creator/routes/creatorDashboardBrowserActionService.ts')
const dashboardLoadService = read('app/src/apps/creator/routes/creatorDashboardLoadService.ts')
const dashboardRouteEffectService = read('app/src/apps/creator/routes/creatorDashboardRouteEffectService.ts')
const dashboardReactPatchApplier = read('app/src/apps/creator/routes/creatorDashboardReactPatchApplier.ts')
const dashboardRouteViewModels = read('app/src/apps/creator/routes/creatorDashboardRouteViewModels.ts')
const todayPriorityPanel = read('app/src/components/creator/CreatorTodayPriorityPanel.tsx')
const todayRoutePanels = read('app/src/components/creator/CreatorTodayRoutePanels.tsx')
const todayNextStepsPanel = read('app/src/components/creator/CreatorTodayNextStepsPanel.tsx')
const todayPathPanel = read('app/src/components/creator/CreatorTodayPathPanel.tsx')
const todayEchoStatusPanel = read('app/src/components/creator/CreatorTodayEchoStatusPanel.tsx')
const todayContextRail = read('app/src/components/creator/CreatorTodayContextRail.tsx')
const workReadinessPanel = read('app/src/components/creator/CreatorWorkReadinessPanel.tsx')
const globalCss = read('app/src/index.css')
const data = read('app/src/lib/pmfSupabase.ts')
const readerData = read('app/src/lib/pmfSupabaseReader.ts')
const acceptance = read('docs/harness/page-acceptance-tests.md')
const reviewPlan = read('docs/product/LOCAL_CREATOR_UI_UX_REVIEW_PLAN.md')
const flowDocs = read('docs/product/creator-user-flows.md')

const dashboard = dashboardRoute
const todaySurface = `${dashboard}\n${todayRoutePanels}\n${todayNextStepsPanel}\n${todayPathPanel}\n${todayEchoStatusPanel}\n${todayContextRail}\n${workReadinessPanel}`
const dashboardAside = sliceBetween(dashboardRoute, 'data-slot="creator-today-context-column"', '</aside>')
const todayDataBoundary = `${dashboardLoadService}\n${dashboardRouteViewModels}`

for (const marker of [
  '今天最值得推进的 3 件事',
  '最值得回应的一问',
  '正在写的一条',
  '需要确认发布',
  '今日创作路径',
  '外界回声',
  '私密草稿',
  '发布包',
  '作品与支线',
  '回声走向',
  '当前创作上下文',
  '作品准备状态',
]) {
  assertIncludes(todaySurface, marker, `Today surface marker ${marker}`)
}

for (const fn of [
  "from '@/local-db/creatorLocalDraftRepository'",
  "from '@/lib/pmfSupabase'",
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
]) {
  assertIncludes(todayDataBoundary, fn, `Today data boundary ${fn}`)
}

for (const routeDelegation of [
  "from './creatorDashboardBrowserActionService'",
  "from './creatorDashboardLoadService'",
  "from './creatorDashboardRouteEffectService'",
  "from './creatorDashboardReactPatchApplier'",
  'scheduleCreatorDashboardInitialLoad(sync)',
  'readCreatorDashboardLocalSnapshot().drafts',
  'runCreatorDashboardSyncEffect()',
  'applyCreatorDashboardRouteStatePatchToReact(statePatch,',
]) {
  assertIncludes(dashboard, routeDelegation, `Today route delegates ${routeDelegation}`)
}

for (const effectServiceMarker of [
  "import { runCreatorDashboardLoad } from './creatorDashboardLoadService'",
  'export interface CreatorDashboardRouteEffectPort',
  'load: runCreatorDashboardLoad',
  'export async function runCreatorDashboardSyncEffect',
  'const result = await port.load()',
]) {
  assertIncludes(dashboardRouteEffectService, effectServiceMarker, `Today effect service ${effectServiceMarker}`)
}

for (const patchApplierMarker of [
  "from './creatorDashboardRouteEffectService'",
  'export interface CreatorDashboardRouteStatePatchSetters',
  'export function applyCreatorDashboardRouteStatePatchToReact',
  'setters.setClientStatus(statePatch.clientStatus)',
  'setters.setPhase(statePatch.phase)',
  'setters.setNotice(statePatch.notice)',
]) {
  assertIncludes(dashboardReactPatchApplier, patchApplierMarker, `Today React patch applier ${patchApplierMarker}`)
}

for (const browserActionServiceMarker of [
  'export interface CreatorDashboardBrowserPort',
  'export function scheduleCreatorDashboardInitialLoad',
]) {
  assertIncludes(dashboardBrowserActionService, browserActionServiceMarker, `Today browser action service ${browserActionServiceMarker}`)
}

for (const forbiddenRouteBrowserCall of [
  'window.setTimeout',
  'window.clearTimeout',
]) {
  assertNotIncludes(dashboard, forbiddenRouteBrowserCall, `Today route must delegate browser scheduling ${forbiddenRouteBrowserCall}`)
}

for (const forbiddenRouteDataCall of [
  "from '@/local-db/creatorLocalDraftRepository'",
  'syncCreatorClient()',
  'listCreatorRequests()',
  'listCreatorWorks()',
  'listCreatorBranches()',
  'listCreatorChapters()',
  'listCreatorPublishEvents()',
  'readLocalDrafts()',
  'runCreatorDashboardLoad()',
]) {
  assertNotIncludes(dashboard, forbiddenRouteDataCall, `Today route must delegate ${forbiddenRouteDataCall}`)
}

for (const forbiddenServiceDependency of [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
]) {
  assertNotIncludes(dashboardLoadService, forbiddenServiceDependency, `Today load service boundary ${forbiddenServiceDependency}`)
  assertNotIncludes(dashboardBrowserActionService, forbiddenServiceDependency, `Today browser action service boundary ${forbiddenServiceDependency}`)
  assertNotIncludes(dashboardRouteEffectService, forbiddenServiceDependency, `Today effect service boundary ${forbiddenServiceDependency}`)
  assertNotIncludes(dashboardReactPatchApplier, forbiddenServiceDependency, `Today React patch applier boundary ${forbiddenServiceDependency}`)
}

for (const route of [
  '/creator/requests',
  '/creator/editor',
  '/creator/publish',
  '/creator/works',
]) {
  assertIncludes(todaySurface, route, `Today routes to ${route}`)
}

for (const priorityMarker of [
  "item.status === 'pending' || item.status === 'acknowledged' || item.status === 'in_progress'",
  '.sort(byRequestPriority)',
  'publishCandidate',
  'isDraftReadyForPublish',
]) {
  assertIncludes(dashboardRouteViewModels, priorityMarker, `Today view-model priority marker ${priorityMarker}`)
}
assertIncludes(dashboard, 'createCreatorDashboardRouteViewModel({', 'Today route consumes the pure route view model')
assertIncludes(dashboard, 'requestPriorityReason(topRequest)', 'Today route keeps presentation-only priority explanation')
assertIncludes(dashboardRouteViewModels, 'export function createCreatorDashboardRouteViewModel', 'Today view model has a named owner')
for (const routePriorityResidue of [
  'byNewestDraft',
  'byRequestPriority',
  'isDraftReadyForPublish',
  ".filter(item => item.status === 'pending')",
]) {
  assertNotIncludes(dashboard, routePriorityResidue, `Today route must not rebuild view-model rule ${routePriorityResidue}`)
}
for (const forbiddenViewModelDependency of [
  "from 'react'",
  'from "react"',
  '@/components/',
  'window.',
  'document.',
  'fetch(',
  '@/local-db/',
  '@/lib/pmfSupabase',
]) {
  assertNotIncludes(dashboardRouteViewModels, forbiddenViewModelDependency, `Today view model must stay pure ${forbiddenViewModelDependency}`)
}

for (const stateMarker of [
  "const [phase, setPhase] = useState<CreatorDashboardPhase>('loading')",
  "phase === 'error'",
  'data-slot="creator-today-next-steps-error"',
  'data-slot="creator-today-next-steps-empty"',
  'disabled={item.disabled || busy}',
]) {
  assertIncludes(todaySurface, stateMarker, `Today state marker ${stateMarker}`)
}
assertIncludes(dashboardRouteEffectService, "phase: result.ok ? 'ready' : 'error'", 'Today effect maps load success to route phase')
assertIncludes(dashboardReactPatchApplier, 'setters.setPhase(statePatch.phase)', 'Today patch applier owns React phase distribution')

assertIncludes(data, '.order(\'vote_count\'', 'request heat comes from persisted vote count')
assertIncludes(readerData, ".from('request_votes').insert", 'reader votes update request heat source')
assertIncludes(acceptance, 'Shows the three most important tasks.', 'acceptance covers Today three tasks')
assertIncludes(acceptance, 'Request heat uses the persisted vote count maintained by reader votes', 'acceptance covers vote-backed heat')
assertIncludes(reviewPlan, '今日页主目标', 'review plan exposes Today product decision')
assertIncludes(flowDocs, 'Flow 1: Start The Day', 'flow docs cover Today workflow')
assertIncludes(dashboardRoute, 'CreatorTodayNextStepsPanel', 'Today surface renders next steps through its atomic component')
assertIncludes(todaySurface, 'CreatorTodayPriorityPanel', 'Today surface uses the creator priority panel component')
assertIncludes(dashboardRoute, 'CreatorDashboardPriorityPanel', 'Today surface renders route priority through component')
assertIncludes(dashboardRoute, 'CreatorTodayPathPanel', 'Today path renders through its atomic component')
assertIncludes(dashboardRoute, 'CreatorTodayEchoStatusPanel', 'Today Echo trajectory renders through its atomic component')
assertIncludes(dashboardRoute, 'CreatorTodayContextRail', 'Today context rail renders through its atomic component')
assertIncludes(dashboardRoute, 'data-slot="creator-today-context-column"', 'Today route exposes the context-column layout owner')
assertIncludes(dashboardRoute, 'xl:sticky xl:top-4 xl:self-start', 'Today context column stays visible beside the long desktop route')
assertIncludes(dashboardRoute, 'CreatorWorkReadinessPanel', 'Today surface uses the creator work readiness component')
assertIncludes(todayPriorityPanel, 'export function CreatorTodayPriorityPanel', 'Today priority panel lives in the Creator component system')
assertIncludes(todayRoutePanels, 'export function CreatorDashboardPriorityPanel', 'Today route priority wrapper lives in the Creator component system')
assertIncludes(todayNextStepsPanel, 'export function CreatorTodayNextStepsPanel', 'Today next steps panel lives in the Creator component system')
assertIncludes(todayPathPanel, 'export function CreatorTodayPathPanel', 'Today path panel lives in the Creator component system')
assertIncludes(todayEchoStatusPanel, 'export function CreatorTodayEchoStatusPanel', 'Today Echo status panel lives in the Creator component system')
assertIncludes(todayContextRail, 'export function CreatorTodayContextRail', 'Today context rail lives in the Creator component system')
assertIncludes(workReadinessPanel, 'export function CreatorWorkReadinessPanel', 'Work readiness panel lives in the Creator component system')
assertIncludes(todayPriorityPanel, '今日写作判断', 'Today priority panel uses product-facing copy')
assertIncludes(workReadinessPanel, '作品准备状态', 'Work readiness panel uses product-facing copy')
assertIncludes(todayPriorityPanel, 'CreatorTodayFlowMetric', 'Today priority panel owns judgment metrics')
assertIncludes(todayPriorityPanel, 'CreatorTodayFlowStep', 'Today priority panel owns route steps')
assertIncludes(todayPriorityPanel, 'data-slot="creator-today-decision-rule"', 'Today priority panel owns the visible decision rule')
assertIncludes(todayPriorityPanel, 'aria-label="今日判断依据"', 'Today priority panel exposes judgment basis')
assertIncludes(todayPriorityPanel, 'aria-label="今日写作路线"', 'Today priority panel exposes writing route')
assertIncludes(todayPriorityPanel, "from '@/components/ui/card'", 'Today priority panel composes shadcn Card')
assertIncludes(todayPriorityPanel, "from '@/components/ui/button'", 'Today priority panel composes shadcn Button')
assertIncludes(todayPriorityPanel, "from '@/components/ui/badge'", 'Today priority panel composes shadcn Badge')
for (const primitiveImport of [
  "from '@/components/ui/card'",
  "from '@/components/ui/alert'",
  "from '@/components/ui/button'",
  "from '@/components/ui/badge'",
]) {
  assertIncludes(todayNextStepsPanel, primitiveImport, `Today next steps panel composes shadcn primitive ${primitiveImport}`)
}
for (const slot of [
  'data-slot="creator-today-next-steps-panel"',
  'data-slot="creator-today-next-steps-header"',
  'data-slot="creator-today-next-steps-list"',
  'data-slot="creator-today-next-step"',
  'data-slot="creator-today-next-step-action"',
  'data-slot="creator-today-next-steps-error"',
  'data-slot="creator-today-next-steps-empty"',
]) {
  assertIncludes(todayNextStepsPanel, slot, `Today next steps panel exposes atomic slot ${slot}`)
}
assert((todayNextStepsPanel.match(/<Card\b/g) || []).length === 1, 'Today next steps panel must stay a single flat Card')
assertNotIncludes(todayNextStepsPanel, 'LiquidGlass', 'Today next steps panel must not nest LiquidGlass cards')
assertNotIncludes(dashboardRoute, 'CreatorTaskCard', 'Today route must not restore the retired task-card stack')
assertNotIncludes(dashboardRoute, "from '@/components/design-system/Panel'", 'Today route must not wrap the next-steps Card in a generic Panel')
assertNotIncludes(globalCss, '.creator-task-card', 'Retired Today task-card CSS must stay deleted')
for (const slot of [
  'data-slot="creator-today-priority-panel"',
  'data-slot="creator-today-focus"',
  'data-slot="creator-today-metrics"',
  'data-slot="creator-today-metric"',
  'data-slot="creator-today-route"',
  'data-slot="creator-today-route-step"',
  'data-slot="creator-today-primary-action"',
]) {
  assertIncludes(todayPriorityPanel, slot, `Today priority panel exposes atomic slot ${slot}`)
}
for (const slot of [
  'data-slot="creator-today-path-panel"',
  'data-slot="creator-today-path-header"',
  'data-slot="creator-today-path-list"',
  'data-slot="creator-today-path-item"',
  'data-slot="creator-today-path-value"',
  'data-slot="creator-today-path-action"',
]) {
  assertIncludes(todayPathPanel, slot, `Today path panel exposes atomic slot ${slot}`)
}
for (const primitiveImport of [
  "from '@/components/ui/card'",
  "from '@/components/ui/button'",
  "from '@/components/ui/badge'",
]) {
  assertIncludes(todayPathPanel, primitiveImport, `Today path panel composes shadcn primitive ${primitiveImport}`)
}
assertIncludes(todayPathPanel, '<ol data-slot="creator-today-path-list"', 'Today path uses a semantic ordered list')
assert(
  (todayPathPanel.match(/variant="glass"/g) || []).length === 1,
  'Today path panel must keep exactly one glass Card layer',
)
for (const slot of [
  'data-slot="creator-today-echo-status-panel"',
  'data-slot="creator-today-echo-status-header"',
  'data-slot="creator-today-echo-status-phase"',
  'data-slot="creator-today-echo-status-metrics"',
  'data-slot="creator-today-echo-status-metric"',
  'data-slot="creator-today-echo-status-value"',
]) {
  assertIncludes(todayEchoStatusPanel, slot, `Today Echo status panel exposes atomic slot ${slot}`)
}
for (const primitiveImport of [
  "from '@/components/ui/card'",
  "from '@/components/ui/badge'",
]) {
  assertIncludes(todayEchoStatusPanel, primitiveImport, `Today Echo status panel composes shadcn primitive ${primitiveImport}`)
}
assertIncludes(todayEchoStatusPanel, '<dl', 'Today Echo trajectory uses a semantic description list')
assertIncludes(todayEchoStatusPanel, 'aria-label="外界回声走向"', 'Today Echo trajectory exposes semantic context')
assertIncludes(todayEchoStatusPanel, "phase === 'loading'", 'Today Echo status exposes its loading state')
assertIncludes(todayEchoStatusPanel, "phase === 'error'", 'Today Echo status exposes its error state')
assert(
  (todayEchoStatusPanel.match(/variant="glass"/g) || []).length === 1,
  'Today Echo status panel must keep exactly one glass Card layer',
)
for (const slot of [
  'data-slot="creator-today-context-rail"',
  'data-slot="creator-today-context-header"',
  'data-slot="creator-today-context-phase"',
  'data-slot="creator-today-context-list"',
  'data-slot="creator-today-context-item"',
]) {
  assertIncludes(todayContextRail, slot, `Today context rail exposes atomic slot ${slot}`)
}
for (const primitiveImport of [
  "from '@/components/ui/card'",
  "from '@/components/ui/badge'",
]) {
  assertIncludes(todayContextRail, primitiveImport, `Today context rail composes shadcn primitive ${primitiveImport}`)
}
assertIncludes(todayContextRail, '<dl', 'Today context rail uses a semantic description list')
assertIncludes(todayContextRail, 'aria-label="当前创作上下文"', 'Today context rail exposes semantic context')
assertIncludes(todayContextRail, "phase === 'loading'", 'Today context rail has an explicit loading state')
assertIncludes(todayContextRail, "phase === 'error'", 'Today context rail has an explicit error state')
assert(
  (todayContextRail.match(/variant="glass"/g) || []).length === 1,
  'Today context rail must keep exactly one glass Card layer',
)
for (const slot of [
  'data-slot="creator-work-readiness-panel"',
  'data-slot="creator-work-readiness-header"',
  'data-slot="creator-work-readiness-action"',
  'data-slot="creator-work-readiness-metrics"',
  'data-slot="creator-work-readiness-metric"',
  'data-slot="creator-work-readiness-list"',
  'data-slot="creator-work-readiness-item"',
]) {
  assertIncludes(workReadinessPanel, slot, `Work readiness panel exposes atomic slot ${slot}`)
}
assertIncludes(workReadinessPanel, "from '@/components/ui/card'", 'Work readiness panel composes shadcn Card')
assertIncludes(workReadinessPanel, "from '@/components/ui/button'", 'Work readiness panel composes shadcn Button')
assertIncludes(workReadinessPanel, "from '@/components/ui/badge'", 'Work readiness panel composes shadcn Badge')
assertIncludes(workReadinessPanel, 'aria-label="作品准备概览"', 'Work readiness metrics expose semantic context')
assertIncludes(workReadinessPanel, '<dl className=', 'Work readiness metrics use a description list')
assertIncludes(workReadinessPanel, '<ul className=', 'Recent works use a semantic list')
assertIncludes(workReadinessPanel, "phase === 'error'", 'Work readiness panel has an explicit error state')
assert(
  (workReadinessPanel.match(/variant="glass"/g) || []).length === 1,
  'Work readiness ready state must keep exactly one glass Card layer',
)
assertIncludes(todayPriorityPanel, 'metricToneClass[tone]', 'Today metric tones use a component-owned semantic class map')
assertIncludes(todayPriorityPanel, 'stepStateClass[state]', 'Today route states use a component-owned semantic class map')
assertIncludes(todayRoutePanels, 'metrics={metrics}', 'Today priority wrapper passes judgment metrics into the component')
assertIncludes(todayRoutePanels, 'steps={steps}', 'Today priority wrapper passes route steps into the component')
assertIncludes(dashboard, 'readyDraftCount={readyDraftCount}', 'Today page passes publish readiness into priority function')
assertIncludes(dashboard, 'draftCount={drafts.length}', 'Today page passes draft count into priority function')
assertIncludes(dashboard, '<CreatorWorkReadinessPanel', 'Today page renders work readiness through component')
assertIncludes(dashboard, '<CreatorTodayPathPanel items={todayPathItems}', 'Today page passes path items into the atomic panel')
assertIncludes(dashboard, '<CreatorTodayEchoStatusPanel', 'Today page renders Echo trajectory through component')
assertIncludes(dashboard, '<CreatorTodayContextRail', 'Today page renders context rail through component')
assertIncludes(dashboard, "onOpenWorks={() => navigate('/creator/works')}", 'Today page owns work-readiness navigation callback')
assertIncludes(creator, '<CreatorDashboardRoute />', 'LocalCreatorApp mounts the Today route owner')
assertIncludes(dashboardRoute, 'export function CreatorDashboardRoute', 'Today route owner is extracted from LocalCreatorApp')

assertNotIncludes(todaySurface, '<table', 'Today first screen must not be a table')
assertNotIncludes(todaySurface, 'worldTemplates', 'Today must not use reader/demo universe templates')
assertNotIncludes(todaySurface, 'beacon-beyond', 'Today must not hard-code demo work ids')
assertNotIncludes(todaySurface, 'UniverseDepth', 'Today must not use Reader depth imagery')
assertNotIncludes(creator, 'function DashboardPage()', 'Today route body must not return to LocalCreatorApp')
assertNotIncludes(creator, 'function DashboardAgentPanel(', 'Today priority panel must not use the old page-local agent panel')
assertNotIncludes(creator, 'function DashboardPriorityPanel(', 'Today priority wrapper must not regress to a page-local function')
assertNotIncludes(creator, 'function TodayCategoryCard(', 'Today category cards must not regress to page-local functions')
assertNotIncludes(creator, 'function DashboardDecisionStrip(', 'Today judgment metrics must not regress to a page-local strip')
assertNotIncludes(creator, 'function TodayFlowRail(', 'Today route steps must not regress to a page-local rail')
assertNotIncludes(creator, 'function WorkReadinessPanel(', 'Work readiness must not regress to a page-local function')
assertNotIncludes(todaySurface, 'creator-agent-card mt-4', 'Today priority panel must not use the old page-local agent card shell')
assertNotIncludes(todayPriorityPanel, 'creator-today-flow', 'Today priority panel must not return to page-global flow hooks')
assertNotIncludes(todayPathPanel, '<Panel', 'Today path must not nest shadcn path items inside another glass Panel')
assertNotIncludes(todayPathPanel, 'pu-motion-lift', 'Today path items must not behave like dashboard cards')
assertNotIncludes(todayRoutePanels, 'CreatorTodayCategoryCard', 'Retired Today category-card owner must stay deleted')
assertNotIncludes(dashboardRoute, 'function TodayMetricCard(', 'Today route-local metric helper must stay deleted')
assertNotIncludes(dashboardRoute, 'LiquidGlassMetric', 'Today route must not rebuild nested glass Echo metrics')
assertNotIncludes(todayEchoStatusPanel, '<Panel', 'Today Echo status must not wrap shadcn content in another glass Panel')
assertNotIncludes(todayEchoStatusPanel, 'LiquidGlassMetric', 'Today Echo status metrics must remain flat semantic cells')
assertNotIncludes(todayEchoStatusPanel, 'pu-motion-lift', 'Today Echo status metrics must not behave like dashboard cards')
assertNotIncludes(dashboardAside, '<Panel', 'Today right rail must not rebuild stacked route-local glass Panels')
assertNotIncludes(todayContextRail, '<Panel', 'Today context rail must not wrap shadcn content in another glass Panel')
assertNotIncludes(todayContextRail, 'LiquidGlass', 'Today context rail must remain one shadcn Card layer')
assertNotIncludes(todayContextRail, 'pu-motion-lift', 'Today context items must not behave like dashboard cards')
assertNotIncludes(workReadinessPanel, 'function ReadinessMetric(', 'Work readiness metrics must not regress to nested Cards')
assertNotIncludes(workReadinessPanel, '<Panel', 'Work readiness ready state must not wrap a Card in another glass Panel')
assertNotIncludes(workReadinessPanel, 'pu-motion-lift', 'Work readiness rows must not behave like stacked dashboard cards')
assertNotIncludes(globalCss, '.creator-today-', 'Today priority layout must not return to global CSS')
assertNotIncludes(globalCss, '.creator-today-path-', 'Today path layout must stay out of global CSS')
assertNotIncludes(globalCss, '.creator-today-echo-status-', 'Today Echo status layout must stay out of global CSS')
assertNotIncludes(globalCss, '.creator-today-context-', 'Today context rail layout must stay out of global CSS')
assertNotIncludes(globalCss, '.creator-work-readiness-', 'Work readiness layout must stay out of global CSS')

console.log('[creator-m2-today] PASS')
