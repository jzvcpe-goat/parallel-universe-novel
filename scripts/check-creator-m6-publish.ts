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

function sliceBetween(body: string, start: string, end: string) {
  const startIndex = body.indexOf(start)
  if (startIndex === -1) throw new Error(`Missing section start: ${start}`)
  const endIndex = body.indexOf(end, startIndex + start.length)
  if (endIndex === -1) throw new Error(`Missing section end: ${end}`)
  return body.slice(startIndex, endIndex)
}

const creator = read('app/src/apps/creator/LocalCreatorApp.tsx')
const publishRoute = read('app/src/apps/creator/routes/CreatorPublishBundleRoute.tsx')
const publishBundleActionService = read('app/src/apps/creator/routes/creatorPublishBundleActionService.ts')
const publishBundleBrowserActionService = read('app/src/apps/creator/routes/creatorPublishBundleBrowserActionService.ts')
const publishBundleLoadService = read('app/src/apps/creator/routes/creatorPublishBundleLoadService.ts')
const publishBundleReactPatchApplier = read('app/src/apps/creator/routes/creatorPublishBundleReactPatchApplier.ts')
const publishBundleRouteController = read('app/src/apps/creator/routes/creatorPublishBundleRouteController.ts')
const publishBundleRouteViewModels = read('app/src/apps/creator/routes/creatorPublishBundleRouteViewModels.ts')
const publishBundleRouteEffectService = read('app/src/apps/creator/routes/creatorPublishBundleRouteEffectService.ts')
const publishLifecycleViewModels = read('app/src/apps/creator/routes/creatorPublishLifecycleViewModels.ts')
const authorDecisionCard = read('app/src/components/creator/CreatorAuthorDecisionCard.tsx')
const publishContextPanel = read('app/src/components/creator/CreatorPublishBundleContextPanel.tsx')
const publishImpactStrip = read('app/src/components/creator/CreatorPublishBundleImpactStrip.tsx')
const publishReviewPanel = read('app/src/components/creator/CreatorPublishBundleReviewPanel.tsx')
const data = read('app/src/lib/pmfSupabase.ts')
const publishBundleAdapter = read('app/src/features/creator-pivot/publishBundleAdapter.ts')
const css = read('app/src/index.css')
const acceptance = read('docs/harness/page-acceptance-tests.md')
const productPlan = read('docs/product/LOCAL_CREATOR_UI_UX_PRODUCT_CONFIRMATION_PLAN.md')
const blueprint = read('docs/product/CREATOR_UI_EXECUTION_BLUEPRINT.md')
const executionPlan = read('docs/product/LOCAL_CREATOR_UI_UX_EXECUTION_PLAN_FOR_REVIEW.md')
const publishFlow = read('docs/data-contracts/publish-flow.md')
const draftBoundary = read('docs/data-contracts/draft-storage-boundary.md')
const dataMap = read('docs/data-contracts/creator-data-map.md')

const publishPage = publishRoute
const publishDerivations = `${publishRoute}\n${publishBundleRouteViewModels}\n${publishLifecycleViewModels}`
const publishWrapper = sliceBetween(data, 'export async function publishBundleTransaction', 'export function requestTypeLabel')

assertIncludes(creator, "import { CreatorPublishBundleRoute } from './routes/CreatorPublishBundleRoute'", 'LocalCreatorApp imports Publish route owner')
assertIncludes(creator, "'/creator/publish': <CreatorPublishBundleRoute />", 'LocalCreatorApp mounts Publish route owner')
assertIncludes(publishPage, 'export function CreatorPublishBundleRoute', 'Publish route owner export')
assertNotIncludes(creator, 'function PublishCheckPage()', 'Publish route body must not return to LocalCreatorApp')

for (const layoutMarker of [
  'xl:grid-cols-[280px_minmax(0,1fr)_360px]',
  '私密草稿',
  '发布包确认',
  '读者可见位置',
  'CreatorPublishBundleContextPanel',
  'CreatorPublishBundleImpactStrip',
]) {
  assertIncludes(publishPage, layoutMarker, `Publish layout ${layoutMarker}`)
}
assertNotIncludes(publishPage, '>发布检查<', 'Publish route must not restore the retired Publish Check heading')

for (const dataMarker of [
  "from './creatorPublishBundleActionService'",
  "from './creatorPublishBundleBrowserActionService'",
  "from './creatorPublishBundleLoadService'",
  "from './creatorPublishBundleReactPatchApplier'",
  "from './creatorPublishBundleRouteController'",
  "from './creatorPublishBundleRouteViewModels'",
  "from './creatorPublishBundleRouteEffectService'",
  'readCreatorPublishBundleRouteRefs(location.search)',
  'readCreatorPublishBundleLocalSnapshot(routeRefs)',
  'resolveCreatorPublishBundleRouteDraftRef(routeRefs, publishBundles)',
  'resolveCreatorPublishBundleInitialActiveDraftRef(initialLocalSnapshot)',
  'applyCreatorPublishBundleLocalStatePatchToReact(',
  'applyCreatorPublishBundleContextStatePatchToReact(',
  'createCreatorPublishBundleRouteViewModel({',
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
]) {
  assertIncludes(publishPage, dataMarker, `Publish data source ${dataMarker}`)
}

for (const effectServiceMarker of [
  'export interface CreatorPublishBundleContextStatePatch',
  'export interface CreatorPublishBundleRouteEffectPort',
  'export async function runCreatorPublishBundleContextEffect',
  'export async function runCreatorPublishBundleRouteDraftRefreshEffect',
  'export async function runCreatorPublishBundleManualRefreshEffect',
  'loadContext: runCreatorPublishBundleContextLoad',
  'loadLocal: runCreatorPublishBundleLocalLoad',
  'resolveCreatorPublishBundleContextSnapshotPatch(',
  'resolveCreatorPublishBundleRouteDraftRefreshPatch(localSnapshot, routeBundleDraftId)',
  'resolveCreatorPublishBundleManualRefreshPatch(localSnapshot, nextNotice)',
]) {
  assertIncludes(publishBundleRouteEffectService, effectServiceMarker, `Publish route effect service ${effectServiceMarker}`)
}

for (const forbiddenEffectDependency of [
  "from 'react'",
  'from "react"',
  '@/components/',
  '@/local-db/creatorLocal',
  'window.',
  'document.',
  'fetch(',
]) {
  assertNotIncludes(publishBundleRouteEffectService, forbiddenEffectDependency, `Publish route effect service boundary ${forbiddenEffectDependency}`)
}

for (const routeViewModelMarker of [
  'export interface CreatorPublishBundleRouteViewModelInput',
  'export function createCreatorPublishBundleRouteViewModel',
  'const activeDraft = routeDraftRef',
  'resolveCreatorPublishBundleActiveRecord(activeDraft?.localDraftRef, publishBundles)',
  'const canPublish = canPrepareBundle && authorization?.authorized === true',
  'publishBundleInput: CreatorPublishBundleInput | null',
  'publishDecisionQuestion:',
  'publishDecisionAnswer:',
  'publishDecisionSteps:',
  'mustGates: [',
  'warningGates: [',
  'confirmGates: [',
]) {
  assertIncludes(publishBundleRouteViewModels, routeViewModelMarker, `Publish route view model ${routeViewModelMarker}`)
}

assertIncludes(publishLifecycleViewModels, 'export function resolveCreatorPublishBundleActiveRecord', 'Publish lifecycle view model owns active record selection')

for (const forbiddenRouteViewModelDependency of [
  "from 'react'",
  'from "react"',
  '@/components/',
  '@/local-db/creatorLocal',
  '@/lib/pmfSupabase',
  'window.',
  'document.',
  'fetch(',
]) {
  assertNotIncludes(publishBundleRouteViewModels, forbiddenRouteViewModelDependency, `Publish route view model boundary ${forbiddenRouteViewModelDependency}`)
}

for (const routeControllerMarker of [
  'export interface CreatorPublishBundleLocalStateSnapshot',
  'export interface CreatorPublishBundleLocalStatePatch',
  'export function resolveCreatorPublishBundleInitialActiveDraftRef',
  'export function resolveCreatorPublishBundleContextSnapshotPatch',
  'export function resolveCreatorPublishBundleRouteDraftRefreshPatch',
  'export function resolveCreatorPublishBundleManualRefreshPatch',
  '已打开发布包草稿。',
  '已打开来自今日任务的待发布初稿。',
  '没有找到这份私密草稿，请回到写作台重新进入发布包确认。',
]) {
  assertIncludes(publishBundleRouteController, routeControllerMarker, `Publish route controller ${routeControllerMarker}`)
}

for (const reactPatchMarker of [
  'export interface CreatorPublishBundleLocalStatePatchSetters',
  'export interface CreatorPublishBundleContextStatePatchSetters',
  'export function applyCreatorPublishBundleContextStatePatchToReact',
  'export function applyCreatorPublishBundleLocalStatePatchToReact',
  'setters.setActiveDraftRef(statePatch.resolveActiveDraftRef)',
]) {
  assertIncludes(publishBundleReactPatchApplier, reactPatchMarker, `Publish React patch owner ${reactPatchMarker}`)
}

for (const forbiddenControllerDependency of [
  "from 'react'",
  'from "react"',
  '@/components/',
  '@/local-db/creatorLocal',
  '@/lib/pmfSupabase',
  'window.',
  'document.',
  'fetch(',
]) {
  assertNotIncludes(publishBundleRouteController, forbiddenControllerDependency, `Publish route controller boundary ${forbiddenControllerDependency}`)
}

for (const loadServiceMarker of [
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
  'export function readCreatorPublishBundleRouteRefs',
  'export function readCreatorPublishBundleLocalSnapshot',
  'export function resolveCreatorPublishBundleRouteDraftRef',
  'export async function runCreatorPublishBundleContextLoad',
  'export async function runCreatorPublishBundleLocalLoad',
]) {
  assertIncludes(publishBundleLoadService, loadServiceMarker, `Publish load service ${loadServiceMarker}`)
}

for (const actionServiceMarker of [
  'submitBundle: publishOwnPlatformBundle',
  'export async function runCreatorPreparePublishBundle',
  'export async function runCreatorReviewPublishBundle',
  'export function runConfirmedCreatorBundleConfirmation',
  'export function runConfirmedCreatorBundleExport',
  'export function runConfirmedCreatorBundleSubmit',
  'export function importCreatorPublishBundleReceipt',
  'createCreatorAgentExecutor',
  'confirmCreatorAgentConfirmation',
]) {
  assertIncludes(publishBundleActionService, actionServiceMarker, `Publish action service ${actionServiceMarker}`)
}

for (const browserActionServiceMarker of [
  'export interface CreatorPublishBundleBrowserPort',
  'export function scheduleCreatorPublishBundleContextLoad',
  'export function scheduleCreatorPublishBundleRouteDraftRefresh',
  'export function downloadCreatorPublishBundle',
  'export async function readCreatorPublishBundleReceiptFile',
  'scheduleCreatorPublishBundleEffect(load, port, delayMs)',
]) {
  assertIncludes(publishBundleBrowserActionService, browserActionServiceMarker, `Publish browser action service ${browserActionServiceMarker}`)
}

for (const forbiddenBrowserServiceDependency of [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
]) {
  assertNotIncludes(publishBundleBrowserActionService, forbiddenBrowserServiceDependency, `Publish browser action service boundary ${forbiddenBrowserServiceDependency}`)
}

for (const publishRouteBrowserResidue of [
  'window.setTimeout',
  'window.clearTimeout',
]) {
  assertNotIncludes(publishPage, publishRouteBrowserResidue, `Publish route must delegate browser scheduling ${publishRouteBrowserResidue}`)
}

for (const gateMarker of [
  'mustGates: [',
  '作品已确定',
  '发布线已确定',
  '标题已填写',
  '正文已填写',
  '作者状态可用',
  'warningGates: [',
  '未关联外界回声',
  '正文较短',
  '标题偏长',
  'IF 支线缺少挂点',
  '支线说明待补',
  'confirmGates: [',
  '发布后读者可以看到这章内容。',
  '私密草稿仍只对作者可见。',
  'const canPublish = canPrepareBundle && authorization?.authorized === true',
]) {
  assertIncludes(publishDerivations, gateMarker, `Publish gate ${gateMarker}`)
}

assertNotIncludes(publishPage, "setActiveDraftRef('')", 'Publish route must not own missing-route-draft recovery decisions')
assertNotIncludes(publishPage, 'const routeDraft =', 'Publish route must not reconstruct route-draft recovery decisions')
assertNotIncludes(publishPage, 'const activeDraft = routeDraftRef', 'Publish route must not reconstruct active draft selection')
assertNotIncludes(publishPage, 'const mustGates =', 'Publish route must not reconstruct publish gates')
assertNotIncludes(publishPage, 'function publishBundleInput()', 'Publish route must not construct PublishBundle input')
assertNotIncludes(publishPage, 'runCreatorPublishBundleContextLoad()', 'Publish route must not invoke context load directly')
assertNotIncludes(publishPage, 'runCreatorPublishBundleLocalLoad(', 'Publish route must not invoke local load directly')
assertNotIncludes(publishPage, 'resolveCreatorPublishBundleContextSnapshotPatch(', 'Publish route must not resolve context snapshots directly')

for (const impactMarker of [
  'readerLocationLabel',
  'anchorLabel',
  'requestImpactLabel',
  'publishDecisionQuestion',
  'publishDecisionAnswer',
  'publishDecisionSteps',
  'publishReviewSignals',
  'CreatorAuthorDecisionCard',
  'CreatorPublishBundleContextPanel',
  'CreatorPublishBundleImpactStrip',
  'CreatorPublishBundleReviewPanel',
  'signals={publishReviewSignals}',
  'MetricCard label="发布作品"',
  'MetricCard label="发布线"',
  'MetricCard label="发布包状态"',
  '读者端展示位置',
  'readerWishTypeLabel(linkedRequest.request_type)',
]) {
  assertIncludes(publishDerivations, impactMarker, `Publish impact ${impactMarker}`)
}

for (const authorDecisionMarker of [
  'title="发布前最后一问"',
  'question={publishDecisionQuestion}',
  'answer={publishDecisionAnswer}',
  'steps={publishDecisionSteps}',
  'primaryLabel="回到写作台调整"',
  'secondaryLabel="刷新草稿"',
  '`/creator/editor?draft=${encodeURIComponent(activeDraft.localDraftRef)}`',
]) {
  assertIncludes(publishPage, authorDecisionMarker, `Publish author decision ${authorDecisionMarker}`)
}

for (const authorDecisionComponentMarker of [
  'export function CreatorAuthorDecisionCard',
  'data-slot="creator-author-decision-card"',
  'data-slot="creator-author-decision-question"',
  'data-slot="creator-author-decision-steps"',
  'data-slot="creator-author-decision-step"',
  'var(--creator-assistant-border)',
  'var(--creator-assistant-panel-bg)',
  'var(--creator-border)',
  '作者一问',
  '创作助手',
  'Button',
  'variant="glass"',
  'Badge variant="gold"',
]) {
  assertIncludes(authorDecisionCard, authorDecisionComponentMarker, `Author decision component ${authorDecisionComponentMarker}`)
}

for (const contextMarker of [
  'export function CreatorPublishBundleContextPanel',
  'creator-publish-bundle-context-panel',
  'creator-publish-bundle-context-row',
  'Card variant="glass"',
  'CardHeader',
  'CardContent',
  'Badge variant={requestStatusTone}',
  '去向确认',
  '确认这次公开会落在哪条故事线上，以及是否回应外界回声。',
  '外界回声',
  '发布后更新状态',
]) {
  assertIncludes(publishContextPanel, contextMarker, `Publish context component ${contextMarker}`)
}

for (const componentMarker of [
  'export function CreatorPublishBundleImpactStrip',
  'creator-publish-bundle-impact-strip',
  'Card variant="glass"',
  'CardHeader',
  'CardContent',
  'Badge variant="gold"',
  '发布影响总览',
  '先看读者会在哪里看到更新，再确认公开。',
  '读者端展示',
  '章节挂点',
  '请求影响',
  '失败保护',
  '正文留在草稿箱',
  '发布未完成时，草稿不会丢失。',
]) {
  assertIncludes(publishImpactStrip, componentMarker, `Publish impact component ${componentMarker}`)
}

for (const reviewMarker of [
  'export function CreatorPublishBundleReviewPanel',
  'creator-publish-bundle-review-panel',
  'Card variant="glass"',
  '创作助手复核',
]) {
  assertIncludes(publishReviewPanel, reviewMarker, `Publish review component ${reviewMarker}`)
}

assertNotIncludes(creator, 'function PublishImpactStrip', 'Publish impact strip must live in Creator components, not page-local helper functions.')
assertNotIncludes(publishPage, '<h2 className="text-lg font-semibold text-[var(--creator-text)]">发布影响</h2>', 'Publish destination context must not return as a page-local Panel.')
assertNotIncludes(publishPage, 'PublishAssistantReview', 'Publish review panel must live in Creator components, not page-local helper functions.')
assertNotIncludes(publishPage, 'creator-agent-card', 'Publish page must not use the old generic agent card shell.')

for (const confirmationMarker of [
  'ConfirmActionDialog',
  '确认这份发布包',
  'actionLabel="确认内容与去向"',
  'title="导出这份发布包"',
  'actionLabel="确认导出"',
  'title="提交到阅读端"',
  'actionLabel="确认提交"',
  'pendingLabel="提交中..."',
  'data-agent-action="confirm_publish_bundle"',
  'data-agent-action="export_publish_bundle"',
  'data-agent-action="submit_publish_bundle"',
  'setBundleAction(',
]) {
  assertIncludes(publishPage, confirmationMarker, `Publish confirmation ${confirmationMarker}`)
}
assertIncludes(publishBundleRouteViewModels, 'readerSummary:', 'Publish route view model owns reader summary input')

for (const failureMarker of [
  '发布未完成，正文仍保存在本机',
  '发布包也已保留',
  'result.data.replayed',
  'await refreshDrafts(',
  'if (result.ok) void loadContext()',
  'setLastPublished({',
  '发布完成',
  'result.data.receipt.createdAt',
  '等待发布回执',
]) {
  assertIncludes(publishPage, failureMarker, `Publish result state ${failureMarker}`)
}

for (const bundleAdapterMarker of [
  'export { createPublishBundle }',
  'export async function publishOwnPlatformBundle',
  'publishReceiptSchema.parse',
  "await import('@/lib/pmfSupabase')",
  'applyLocalPublishReceipt',
  'readPublishBundleLifecycle',
  'submission_outcome_unknown',
  'createOwnPlatformReceipt',
  "target: 'own-platform'",
]) {
  assertIncludes(publishBundleAdapter, bundleAdapterMarker, `Publish bundle adapter ${bundleAdapterMarker}`)
}

for (const wrapperMarker of [
  ".rpc('publish_bundle_transaction'",
  'p_bundle_id: input.bundleId',
  'p_idempotency_key: input.idempotencyKey',
  'p_content_checksum: input.contentChecksum',
  'p_target_kind: input.targetKind',
  'p_reader_request_ids: input.requestIds',
  'p_creator_client_id: getLocalCreatorClientId()',
  'isPublishTransactionResult(data)',
]) {
  assertIncludes(publishWrapper, wrapperMarker, `Publish wrapper ${wrapperMarker}`)
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
  assertNotIncludes(publishWrapper, forbiddenDirectWrite, `Publish wrapper server ownership ${forbiddenDirectWrite}`)
}

for (const docMarker of [
  'Server transaction commits after explicit confirmation:',
  'Direct browser table writes are forbidden.',
  '`chapters`',
  '`branches`',
  '`publish_events`',
  '`reader_requests.status = published`',
  'Must pass: destination, title, non-empty prose, author identity.',
  'Warning: long title, missing linked request, branch summary missing.',
  'Confirm again: publish, archive, hide, reject, clear local settings.',
  'Tell the author: `发布未完成，正文仍在草稿箱。`',
]) {
  assertIncludes(publishFlow, docMarker, `Publish flow doc ${docMarker}`)
}

for (const acceptanceMarker of [
  'Shows selected local draft, destination, line type, branch anchor, linked request, public title, prose preview, reader-facing location, and post-publish impact.',
  'Separates must-pass gates, warning gates, and confirmation gates.',
  'Publish requires confirmation, creates a publish bundle, and calls the publish-bundle adapter only after the author confirms.',
  'Successful publish writes chapter, branch/event relationships, and marks a linked request as published.',
  'Failed publish shows "发布未完成，正文仍在草稿箱。"',
]) {
  assertIncludes(acceptance, acceptanceMarker, `Publish acceptance ${acceptanceMarker}`)
}

for (const productMarker of [
  'Publish Check',
  'Selected local draft',
  'Must-pass gates',
  'Warning gates',
  'Confirmation gates',
  'publish-bundle adapter',
  'Linked request becomes published',
  '发布未完成，正文仍在草稿箱。',
]) {
  assertIncludes(productPlan + blueprint + executionPlan, productMarker, `Publish product spec ${productMarker}`)
}

assertIncludes(dataMap, '发布包确认', 'data map includes PublishBundle confirmation')
assertIncludes(dataMap, 'chapters', 'data map includes chapter write')
assertIncludes(dataMap, 'branches', 'data map includes branch write')
assertIncludes(dataMap, 'publish_events', 'data map includes publish event write')
assertIncludes(dataMap, 'reader_requests.status = published', 'data map includes request publish status')

assertIncludes(draftBoundary, 'P0 keeps draft prose local.', 'draft boundary keeps draft prose local')
assertIncludes(draftBoundary, 'Publish Check is the first moment draft prose may become public content.', 'draft boundary publish moment')
assertIncludes(css, '.creator-editor-surface', 'CSS has quiet prose preview surface')
assertNotIncludes(css, '.creator-author-decision-card', 'Author decision card must not depend on page-global CSS')
assertNotIncludes(css, '.creator-author-decision-question', 'Author decision question must not depend on page-global CSS')
assertNotIncludes(css, '.creator-author-decision-steps', 'Author decision basis must not depend on page-global CSS')

assertNotIncludes(publishPage, ".from('chapters')", 'Publish page must not write chapters directly')
assertNotIncludes(publishPage, ".from('branches')", 'Publish page must not write branches directly')
assertNotIncludes(publishPage, ".from('publish_events')", 'Publish page must not write publish events directly')
assertNotIncludes(publishPage, ".from('reader_requests')", 'Publish page must not update requests directly')
assertNotIncludes(publishPage, 'publishChapter({', 'Publish page must not call the legacy direct publish helper')
assertNotIncludes(publishPage, "from '@/local-db/creatorLocalDraftRepository'", 'Publish page must not import the local draft repository directly')
assertNotIncludes(publishPage, "from '@/local-db/creatorLocalPublishRepository'", 'Publish page must not import the local publish repository directly')
assertNotIncludes(publishPage, 'listCreatorWorks()', 'Publish page must not call work list APIs directly')
assertNotIncludes(publishPage, 'listCreatorBranches()', 'Publish page must not call branch list APIs directly')
assertNotIncludes(publishPage, 'listCreatorChapters()', 'Publish page must not call chapter list APIs directly')
assertNotIncludes(publishPage, 'listCreatorRequests()', 'Publish page must not call request list APIs directly')
assertNotIncludes(publishPage, 'publishOwnPlatformBundle({', 'Publish page must not call the publish adapter directly')
assertNotIncludes(publishPage, 'upsertLocalDraft(', 'Publish Check must not mutate private draft prose')
assertNotIncludes(publishPage, 'UniverseDepth', 'Publish Check must not use Reader depth imagery')
assertNotIncludes(publishPage, 'function PublishAuthorDecisionCard', 'Publish page must not rebuild author decision card as a page-local helper')
assertNotIncludes(publishPage, 'animate-particle-drift', 'Publish Check must not use particle background motion')
assertNotIncludes(publishPage, 'pu-bg-reader', 'Publish Check must not use Reader background assets')

console.log('[creator-m6-publish] PASS')
