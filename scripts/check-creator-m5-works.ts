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

const creator = read('app/src/apps/creator/LocalCreatorApp.tsx')
const worksRoute = read('app/src/apps/creator/routes/CreatorWorksRoute.tsx')
const worksActionFlowService = read('app/src/apps/creator/routes/creatorWorksActionFlowService.ts')
const worksActionService = read('app/src/apps/creator/routes/creatorWorksActionService.ts')
const worksBrowserActionService = read('app/src/apps/creator/routes/creatorWorksBrowserActionService.ts')
const worksLoadService = read('app/src/apps/creator/routes/creatorWorksLoadService.ts')
const worksRouteViewModels = read('app/src/apps/creator/routes/creatorWorksRouteViewModels.ts')
const authorDecisionCard = read('app/src/components/creator/CreatorAuthorDecisionCard.tsx')
const branchLineCard = read('app/src/components/creator/CreatorBranchLineCard.tsx')
const workStructureStrip = read('app/src/components/creator/CreatorWorkStructureStrip.tsx')
const data = read('app/src/lib/pmfSupabase.ts')
const css = read('app/src/index.css')
const acceptance = read('docs/harness/page-acceptance-tests.md')
const productPlan = read('docs/product/LOCAL_CREATOR_UI_UX_PRODUCT_CONFIRMATION_PLAN.md')
const blueprint = read('docs/product/CREATOR_UI_EXECUTION_BLUEPRINT.md')
const dataMap = read('docs/data-contracts/creator-data-map.md')

const worksPage = worksRoute
const structureStrip = workStructureStrip

assertIncludes(creator, "import { CreatorWorksRoute } from './routes/CreatorWorksRoute'", 'LocalCreatorApp imports Works route owner')
assertIncludes(creator, "'/creator/works': <CreatorWorksRoute />", 'LocalCreatorApp mounts Works route owner')
assertIncludes(worksPage, 'export function CreatorWorksRoute', 'Works route owner export')
assertNotIncludes(creator, 'function WorksPage()', 'Works route body must not return to LocalCreatorApp')

for (const layoutMarker of [
  '作品列表',
  '作品与支线',
  '支线详情',
  '作者公告',
  '新建 IF 支线',
  'xl:grid-cols-[280px_minmax(0,1fr)_360px]',
]) {
  assertIncludes(worksPage, layoutMarker, `Works layout ${layoutMarker}`)
}

for (const dataMarker of [
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
  'selectedWorkBranches',
  'selectedWorkChapters',
  'selectedBranchChapters',
  'selectedBranchRequests',
]) {
  assertIncludes(worksPage, dataMarker, `Works data source ${dataMarker}`)
}

for (const structureMarker of [
  'WorkStructureStrip',
  'CreatorWorkStructureStrip',
  'mainCount',
  'ifCount',
  'archivedCount',
  'openRequestCount',
  'emptyLineCount',
  'publishedChapterCount',
  '作品结构',
  '公开章节',
  '请求压力',
  '待补线索',
]) {
  assertIncludes(worksPage + structureStrip, structureMarker, `Works structure ${structureMarker}`)
}

for (const branchTreeMarker of [
  '<CreatorBranchLineCard',
  'branch={branch}',
  'selected={selectedBranch?.id === branch.id}',
  'requestCount={requestCount}',
  'chapters={branchChapters}',
  'onSelect={() => setSelectedBranchId(branch.id)}',
  'onStartWriting={() => openDraftForBranch(branch)}',
  'onArchive={() => archiveBranch(branch)}',
  'typeLabel={typeLabel}',
  'statusLabel={statusLabel}',
  'statusVariant={statusVariant}',
]) {
  assertIncludes(worksPage, branchTreeMarker, `Branch tree page handoff ${branchTreeMarker}`)
}

for (const authorDecisionMarker of [
  'CreatorAuthorDecisionCard',
  'title="这条线下一步"',
  'question={selectedBranchQuestion}',
  'answer={selectedBranchAnswer}',
  'steps={selectedBranchDecisionSteps}',
  'primaryLabel="去这条线写正文"',
  'secondaryLabel="查看外界回声"',
  'selectedBranchQuestion',
  'selectedBranchAnswer',
  'selectedBranchDecisionSteps',
]) {
  assertIncludes(worksPage, authorDecisionMarker, `Works author decision ${authorDecisionMarker}`)
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

for (const branchComponentMarker of [
  'export function CreatorBranchLineCard',
  'data-slot="creator-branch-line-card"',
  'data-line-kind={isMain',
  'before:bg-[var(--creator-confirm)]',
  'before:bg-[var(--creator-accent)]',
  "variant=\"glass\"",
  'role="listitem"',
  "aria-current={selected ? 'true' : undefined}",
  "aria-pressed={selected}",
  '查看',
  '正在看',
  'chapters.length ? chapters.map',
  '第 {chapter.chapter_no} 章 · {chapter.title}',
  '支线挂点',
  'parentChapterLabel',
  'updatedAtLabel',
  'ConfirmActionDialog',
  '确认归档支线',
  '归档后，这条支线会从主要工作列表中降权。',
]) {
  assertIncludes(branchLineCard, branchComponentMarker, `Branch line component ${branchComponentMarker}`)
}

for (const branchTreeMarker of [
  'data-slot="creator-branch-line-card"',
  'data-line-kind={isMain',
  'before:bg-[var(--creator-confirm)]',
  'before:bg-[var(--creator-accent)]',
  '第 {chapter.chapter_no} 章 · {chapter.title}',
  '支线挂点',
  'parentChapter',
  'requestCount={requestCount}',
  'typeLabel={typeLabel}',
]) {
  assertIncludes(worksPage + branchLineCard + worksRouteViewModels, branchTreeMarker, `Branch tree ${branchTreeMarker}`)
}

for (const detailMarker of [
  'selectedParentBranchLabel',
  'selectedParentChapterLabel',
  'selectedBranchUpdatedAtLabel',
  'MetricCard label="章节"',
  'MetricCard label="请求"',
  '父线：',
  '挂点：',
  '最近更新：',
  '去这条线写正文',
]) {
  assertIncludes(worksPage, detailMarker, `Branch detail ${detailMarker}`)
}

for (const viewModelMarker of [
  'export interface CreatorWorksRouteViewModelInput',
  'export interface CreatorWorksRouteViewModel',
  'export interface CreatorWorksWorkRow',
  'export interface CreatorWorksBranchRow',
  'export function createCreatorWorksRouteViewModel',
  'function requestsForBranch(',
  'const selectedWork = works.find(',
  'const selectedBranch = selectedWorkBranches.find(',
  'const selectedBranchDecisionSteps:',
  'const chaptersByBranch = new Map<string, PmfChapter[]>()',
  'const branchRows = selectedWorkBranches.map(',
  'const workRows = works.map(',
]) {
  assertIncludes(worksRouteViewModels, viewModelMarker, `Works route view model ${viewModelMarker}`)
}

for (const forbiddenViewModelDependency of [
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
  assertNotIncludes(worksRouteViewModels, forbiddenViewModelDependency, `Works route view model boundary ${forbiddenViewModelDependency}`)
}

for (const forbiddenRouteDerivation of [
  'requestCountForBranch(',
  'new Map<string, PmfChapter[]>',
  "request.status !== 'published'",
  "selectedBranch?.branch_type === 'if'",
  'branches.filter(branch => branch.work_id === work.id)',
]) {
  assertNotIncludes(worksPage, forbiddenRouteDerivation, `Works route must delegate pure derivation ${forbiddenRouteDerivation}`)
}

for (const actionMarker of [
  'runCreatorWorkNoticeFlow({',
  'runCreatorWorkHideFlow({',
  'runCreatorBranchArchiveFlow(branch)',
  'runCreatorIfBranchCreateFlow({',
  'setNotice(result.notice)',
  'if (result.reload) await load(result.reload.workId, result.reload.branchId)',
  'navigate(`/creator/editor?work=${encodeURIComponent(branch.work_id)}&branch=${encodeURIComponent(branch.id)}`)',
]) {
  assertIncludes(worksPage, actionMarker, `Works action ${actionMarker}`)
}

for (const loadServiceMarker of [
  "from '@/lib/pmfSupabase'",
  'export interface CreatorWorksLoadApiPort',
  'export interface CreatorWorksLoadInput',
  'export function resolveCreatorWorksSelection',
  'export async function runCreatorWorksLoad',
  'listWorks: listCreatorWorks',
  'listBranches: listCreatorBranches',
  'listChapters: listCreatorChapters',
  'listRequests: listCreatorRequests',
  'api.listWorks()',
  'api.listBranches()',
  'api.listChapters()',
  'api.listRequests()',
]) {
  assertIncludes(worksLoadService, loadServiceMarker, `Works load service ${loadServiceMarker}`)
}

for (const actionServiceMarker of [
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
]) {
  assertIncludes(worksActionService, actionServiceMarker, `Works action service ${actionServiceMarker}`)
}

for (const actionFlowServiceMarker of [
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
  "input.parentBranchId === 'none' ? null : input.parentBranchId",
  "input.parentChapterId === 'none' ? null : input.parentChapterId",
  'creatorFacingNotice(result.message)',
]) {
  assertIncludes(worksActionFlowService, actionFlowServiceMarker, `Works action flow service ${actionFlowServiceMarker}`)
}

for (const browserActionServiceMarker of [
  'export interface CreatorWorksBrowserPort',
  'export function scheduleCreatorWorksInitialLoad',
]) {
  assertIncludes(worksBrowserActionService, browserActionServiceMarker, `Works browser action service ${browserActionServiceMarker}`)
}

for (const forbiddenWorksRouteApiCall of [
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
]) {
  assertNotIncludes(worksPage, forbiddenWorksRouteApiCall, `Works route must delegate ${forbiddenWorksRouteApiCall}`)
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
  assertNotIncludes(worksActionFlowService, forbiddenWorksActionFlowDependency, `Works action flow boundary ${forbiddenWorksActionFlowDependency}`)
}

for (const forbiddenWorksServiceDependency of [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
]) {
  assertNotIncludes(worksBrowserActionService, forbiddenWorksServiceDependency, `Works browser action service boundary ${forbiddenWorksServiceDependency}`)
}

for (const stateMarker of [
  "const [loading, setLoading]",
  "const [workAction, setWorkAction]",
  "setWorkAction('notice')",
  "setWorkAction('hide')",
  "setWorkAction('archive')",
  "setWorkAction('create-branch')",
  'loading={loading}',
  "loading={workAction === 'notice'}",
  "loading={workAction === 'create-branch'}",
  'disabled={!selectedWork || loading || Boolean(workAction)}',
  'disabled={selectedWork.status === \'hidden\' || Boolean(workAction)}',
  "archiveDisabled={branch.branch_type === 'main' || branch.status === 'archived' || Boolean(workAction)}",
  'disabled={archiveDisabled}',
  'CreatorStatePanel kind="empty"',
]) {
  assertIncludes(worksPage + branchLineCard, stateMarker, `Works state ${stateMarker}`)
}

for (const confirmMarker of [
  '确认隐藏作品',
  '确认归档支线',
  'ConfirmActionDialog',
  'variant="destructive"',
  '隐藏后，读者将无法继续从公开入口看到这部作品。',
  '归档后，这条支线会从主要工作列表中降权。',
]) {
  assertIncludes(worksPage + branchLineCard, confirmMarker, `Works confirmation ${confirmMarker}`)
}

for (const wrapperMarker of [
  'export async function listCreatorWorks',
  'export async function listCreatorBranches',
  'export async function listCreatorChapters',
  'export async function updateCreatorWorkNotice',
  'export async function updateCreatorWorkStatus',
  'export async function createCreatorIfBranch',
  'export async function updateCreatorBranchStatus',
  ".from('works')",
  ".from('branches')",
  ".from('chapters')",
]) {
  assertIncludes(data, wrapperMarker, `Works data wrapper ${wrapperMarker}`)
}

for (const acceptanceMarker of [
  'Shows work to branch to chapter structure.',
  'Visually separates main and IF lines.',
  'Shows a work structure summary with main/IF counts, published chapter count, open request pressure, and lines needing content.',
  'Selecting a branch updates a detail panel with line type, status, chapters, request count, parent line, parent chapter, and last update.',
  'Author notice save, work hide, branch archive, and IF branch creation expose disabled/loading states.',
  'Hiding a work and archiving a branch require confirmation.',
  'Creating an IF line supports parent line and anchor chapter selection.',
]) {
  assertIncludes(acceptance, acceptanceMarker, `Works acceptance ${acceptanceMarker}`)
}

for (const productMarker of [
  'work -> branch -> chapter structure',
  'main and IF visual distinction',
  'author notice editor',
  'create IF branch',
  'hide work with confirmation',
  'archive branch with confirmation',
  'open Writing Desk with selected work/line',
]) {
  assertIncludes(productPlan, productMarker, `Works product plan ${productMarker}`)
}

for (const blueprintMarker of [
  'Work -> branch -> chapter tree.',
  'Main/IF distinction.',
  'Notice save.',
  'Hide/archive confirmations.',
  'IF branch creation and Writing Desk handoff.',
]) {
  assertIncludes(blueprint, blueprintMarker, `Works blueprint ${blueprintMarker}`)
}

assertIncludes(dataMap, '作品与支线', 'data map includes Works page')
assertIncludes(dataMap, 'works', 'data map includes works')
assertIncludes(dataMap, 'branches', 'data map includes branches')
assertIncludes(dataMap, 'chapters', 'data map includes chapters')
assertNotIncludes(css, '.creator-line-card', 'Branch line card must not depend on page-global CSS')
assertNotIncludes(css, '.creator-line-card-main', 'Main line treatment must not depend on page-global CSS')
assertNotIncludes(css, '.creator-line-card-if', 'IF line treatment must not depend on page-global CSS')
assertNotIncludes(css, '.creator-author-decision-card', 'Author decision card must not depend on page-global CSS')
assertNotIncludes(css, '.creator-author-decision-question', 'Author decision question must not depend on page-global CSS')
assertNotIncludes(css, '.creator-author-decision-steps', 'Author decision basis must not depend on page-global CSS')

assertNotIncludes(worksPage, '<table', 'Works page must not regress to table-first layout')
assertNotIncludes(worksPage, '<Card\n                key={branch.id}', 'Works page must not rebuild branch line cards as page-local Card markup')
assertNotIncludes(worksPage, 'onClick={() => setSelectedBranchId(branch.id)}', 'Works page must not use whole-card branch selection')
assertNotIncludes(worksPage, 'UniverseDepth', 'Works page must not use Reader depth imagery')
assertNotIncludes(worksPage, 'animate-particle-drift', 'Works page must not use particle background motion')
assertNotIncludes(worksPage, 'pu-bg-reader', 'Works page must not use Reader background assets')
assertNotIncludes(worksPage, 'publishChapter(', 'Works page must not publish content directly')
assertNotIncludes(worksPage, 'function WorkAuthorDecisionCard', 'Works page must not rebuild author decision card as a page-local helper')
assertNotIncludes(creator, 'function WorkStructureStrip(', 'Works page must not rebuild work structure strip as a page-local helper')

console.log('[creator-m5-works] PASS')
