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
const settingsRoute = read('app/src/apps/creator/routes/CreatorSettingsRoute.tsx')
const settingsLoadService = read('app/src/apps/creator/routes/creatorSettingsLoadService.ts')
const settingsHydrationService = read('app/src/apps/creator/routes/creatorSettingsHydrationService.ts')
const settingsActionService = read('app/src/apps/creator/routes/creatorSettingsActionService.ts')
const settingsBrowserActionService = read('app/src/apps/creator/routes/creatorSettingsBrowserActionService.ts')
const settingsRouteViewModels = read('app/src/apps/creator/routes/creatorSettingsRouteViewModels.ts')
const settingsWorkspaceExportFlowService = read('app/src/apps/creator/routes/creatorSettingsWorkspaceExportFlowService.ts')
const data = read('app/src/lib/pmfSupabase.ts')
const localSettingsRepository = read('app/src/local-db/creatorLocalSettingsRepository.ts')
const legacyToolSettings = read('app/src/local-db/legacyCreatorToolSettings.ts')
const localWorkspaceRepository = read('app/src/local-db/creatorLocalWorkspaceRepository.ts')
const localWorkspacePackage = read('app/src/local-db/creatorLocalWorkspacePackage.ts')
const types = read('app/src/features/pmf/types.ts')
const css = read('app/src/index.css')
const acceptance = read('docs/harness/page-acceptance-tests.md')
const productPlan = read('docs/product/LOCAL_CREATOR_UI_UX_PRODUCT_CONFIRMATION_PLAN.md')
const blueprint = read('docs/product/CREATOR_UI_EXECUTION_BLUEPRINT.md')
const executionPlan = read('docs/product/LOCAL_CREATOR_UI_UX_EXECUTION_PLAN_FOR_REVIEW.md')
const dataMap = read('docs/data-contracts/creator-data-map.md')
const settingsBoundaryComponent = read('app/src/components/creator/CreatorSettingsBoundaryStrip.tsx')
const localWorkspaceComponent = read('app/src/components/creator/CreatorLocalWorkspacePanel.tsx')
const workspacePreferencesComponent = read('app/src/components/creator/CreatorWorkspacePreferencesPanel.tsx')
const settingsStatusRailComponent = read('app/src/components/creator/CreatorSettingsStatusRail.tsx')

const settingsPage = settingsRoute
const settingsContractSurface = `${settingsPage}\n${settingsLoadService}\n${settingsHydrationService}\n${settingsActionService}\n${settingsBrowserActionService}\n${settingsRouteViewModels}\n${settingsWorkspaceExportFlowService}\n${localWorkspacePackage}\n${creator}\n${settingsBoundaryComponent}\n${localWorkspaceComponent}\n${workspacePreferencesComponent}\n${settingsStatusRailComponent}`

assertIncludes(creator, '<CreatorSettingsRoute />', 'LocalCreatorApp mounts the Settings route owner')
assertIncludes(settingsRoute, 'export function CreatorSettingsRoute', 'Settings route owner is extracted from LocalCreatorApp')
assertNotIncludes(creator, 'function SettingsPage()', 'Settings route body must not return to LocalCreatorApp')

for (const layoutMarker of [
  'xl:grid-cols-[minmax(0,1fr)_380px]',
  '本机工作区',
  '本机保存',
  '导出备份',
  '助手权限',
  '操作记录',
  '本机记录',
  '备份恢复',
  '当前状态',
  '显示偏好',
  '重置偏好',
  '工作台准备度',
  'CreatorSettingsBoundaryStrip',
  'CreatorLocalWorkspacePanel',
  'CreatorWorkspacePreferencesPanel',
  'CreatorSettingsStatusRail',
]) {
  assertIncludes(settingsContractSurface, layoutMarker, `Settings layout ${layoutMarker}`)
}

for (const boundaryMarker of [
  'export function CreatorSettingsBoundaryStrip',
  'workspaceRecordCount',
  'workspacePortable',
  'isCreatorDevice',
  'variant="default"',
  'padding="none"',
  'CardContent',
  'data-slot="creator-settings-boundary-strip"',
  'data-slot="creator-settings-boundary-list"',
  'data-slot="creator-settings-boundary-item"',
  'data-slot="creator-settings-boundary-status"',
  'data-slot="creator-settings-boundary-value"',
  'data-slot="creator-settings-boundary-detail"',
  'data-state={row.ready ? \'ready\' : \'pending\'}',
  '<dl',
  '<dt',
  '<dd',
  '本机记录',
  '备份恢复',
  '创作设备',
  '公开规则',
  '草稿、设定和创作判断保留在本机工作区。',
  '读者只能看到已发布内容和请求状态。',
]) {
  assertIncludes(settingsBoundaryComponent, boundaryMarker, `Settings boundary component ${boundaryMarker}`)
}

const settingsBoundaryCardCount = settingsBoundaryComponent.match(/<Card(?:\s|>)/g)?.length ?? 0
if (settingsBoundaryCardCount !== 1) {
  throw new Error(`Settings boundary component must own exactly one shadcn Card, found ${settingsBoundaryCardCount}`)
}
for (const forbiddenBoundaryPattern of [
  'variant="glass"',
  'pu-motion-lift',
  '<CardHeader',
  '<CardTitle',
  '<CardDescription',
]) {
  assertNotIncludes(
    settingsBoundaryComponent,
    forbiddenBoundaryPattern,
    `Settings boundary component must stay one solid semantic status band ${forbiddenBoundaryPattern}`,
  )
}
assertNotIncludes(css, '.creator-settings-boundary-', 'Settings boundary presentation must stay out of page-global CSS')

for (const dataMarker of [
  "from './creatorSettingsActionService'",
  "from './creatorSettingsBrowserActionService'",
  "from './creatorSettingsLoadService'",
  "from './creatorSettingsRouteViewModels'",
  "from './creatorSettingsWorkspaceExportFlowService'",
  'readCreatorSettingsLocalSnapshot',
  'runCreatorSettingsLoad',
  'createCreatorSettingsRouteViewModel({',
  'applyCreatorSettingsDisplayPreferences(preferences)',
  'runCreatorSettingsWorkspaceExport(preferences)',
  'saveCreatorWorkspacePreferences(preferences)',
  'clearCreatorWorkspacePreferences()',
  'scheduleCreatorSettingsActionReset(',
  'setClient(result.client)',
  'setAuthorization(result.authorization)',
  'setFlags(result.flags)',
]) {
  assertIncludes(settingsPage, dataMarker, `Settings route delegation ${dataMarker}`)
}

for (const viewModelMarker of [
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
]) {
  assertIncludes(settingsRouteViewModels, viewModelMarker, `Settings route view model ${viewModelMarker}`)
}

for (const privateLeafType of [
  'CreatorSettingsWorkspaceSummaryItem',
  'CreatorSettingsOperationItem',
  'CreatorSettingsPermissionItem',
]) {
  assertNotIncludes(
    settingsRouteViewModels,
    `export interface ${privateLeafType}`,
    `Settings route view-model leaf type must stay owner-private: ${privateLeafType}`,
  )
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
  assertNotIncludes(settingsRouteViewModels, forbiddenViewModelDependency, `Settings route view model boundary ${forbiddenViewModelDependency}`)
}

for (const loadServiceMarker of [
  "from '@/local-db/creatorLocalSettingsRepository'",
  "from '@/local-db/creatorLocalWorkspaceRepository'",
  "from '@/lib/pmfSupabase'",
  'export interface CreatorSettingsLoadApiPort',
  'export interface CreatorSettingsLocalReadPort',
  'export function readCreatorSettingsLocalSnapshot',
  'export async function runCreatorSettingsLoad',
  'readDisplayPreferences: readCreatorDisplayPreferences',
  'hydrateWorkspace: hydrateLocalWorkspace',
  'readWorkspaceSnapshot: readLocalWorkspaceSnapshot',
  'readHydratedCreatorSettingsLocalState(local)',
  'syncClient: syncCreatorClient',
  'getAuthorizationStatus: getCreatorAuthorizationStatus',
  'listFeatureFlags: listCreatorFeatureFlags',
]) {
  assertIncludes(settingsLoadService, loadServiceMarker, `Settings load service ${loadServiceMarker}`)
}

for (const hydrationServiceMarker of [
  'export interface CreatorSettingsHydrationPort',
  'export async function readHydratedCreatorSettingsLocalState',
  'await local.hydrateWorkspace()',
  'local.readDisplayPreferences()',
  'local.readWritingAssistPreferences()',
  'local.readWorkspaceSnapshot()',
]) {
  assertIncludes(settingsHydrationService, hydrationServiceMarker, `Settings hydration service ${hydrationServiceMarker}`)
}

for (const actionServiceMarker of [
  "from '@/local-db/creatorLocalSettingsRepository'",
  "from '@/local-db/creatorLocalWorkspaceRepository'",
  'export function saveCreatorWorkspacePreferences',
  'export function clearCreatorWorkspacePreferences',
  'export async function readCreatorSettingsWorkspaceSnapshot',
  'writeCreatorDisplayPreferences',
  'readLocalWorkspaceSnapshot',
  'hydrateWorkspace: hydrateLocalWorkspace',
  'await port.hydrateWorkspace()',
]) {
  assertIncludes(settingsActionService, actionServiceMarker, `Settings action service ${actionServiceMarker}`)
}

for (const browserActionServiceMarker of [
  'export interface CreatorSettingsBrowserPort',
  'export interface CreatorSettingsBrowserTimerPort',
  'export function applyCreatorSettingsDisplayPreferences',
  'export function downloadCreatorWorkspacePackage',
  'export function scheduleCreatorSettingsActionReset',
  'export function scheduleCreatorSettingsRouteEffect',
  'document.documentElement.dataset',
  'document.createElement',
  'URL.createObjectURL',
  'URL.revokeObjectURL',
  'new Blob',
  'window.setTimeout',
  'window.clearTimeout',
]) {
  assertIncludes(settingsBrowserActionService, browserActionServiceMarker, `Settings browser action service ${browserActionServiceMarker}`)
}

for (const workspaceExportFlowMarker of [
  'export interface CreatorSettingsWorkspaceExportFlowPort',
  'export async function runCreatorSettingsWorkspaceExport',
  'readWorkspaceSnapshot: readCreatorSettingsWorkspaceSnapshot',
  'buildWorkspacePackage: buildLocalWorkspacePackage',
  'downloadWorkspacePackage: downloadCreatorWorkspacePackage',
  'nowIso: () => new Date().toISOString()',
  'const snapshot = await port.readWorkspaceSnapshot()',
  'const exportedAt = port.nowIso()',
  'const workspacePackage = await port.buildWorkspacePackage({',
  'const downloaded = port.downloadWorkspacePackage(workspacePackage.bytes, exportedAt)',
  '本机工作区备份已导出。导入恢复前仍需要作者确认。',
  '当前环境暂不能下载备份。',
]) {
  assertIncludes(settingsWorkspaceExportFlowService, workspaceExportFlowMarker, `Settings workspace export flow ${workspaceExportFlowMarker}`)
}

for (const forbiddenRouteDataCall of [
  "from '@/local-db/creatorLocalSettingsRepository'",
  "from '@/local-db/creatorLocalWorkspaceRepository'",
  "from '@/lib/pmfSupabase'",
  'readLocalAiSettings()',
  'readCreatorDisplayPreferences()',
  'readLocalWorkspaceSnapshot()',
  'setWorkspaceSnapshot(readLocalWorkspaceSnapshot())',
  'writeLocalAiSettings(',
  'writeCreatorDisplayPreferences(',
  'syncCreatorClient()',
  'getCreatorAuthorizationStatus()',
  'listCreatorFeatureFlags()',
  'fetch(',
  'new AbortController()',
  'window.setTimeout',
  'window.clearTimeout',
  'document.',
  'URL.createObjectURL',
  'URL.revokeObjectURL',
  'new Blob',
  "from '@/local-db/creatorLocalWorkspacePackage'",
  'buildLocalWorkspacePackage({',
  'readCreatorSettingsWorkspaceSnapshot()',
  'downloadCreatorWorkspacePackage(',
  'new Date(',
]) {
  assertNotIncludes(settingsPage, forbiddenRouteDataCall, `Settings route must delegate ${forbiddenRouteDataCall}`)
}

for (const forbiddenServiceDependency of [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'navigate(',
]) {
  assertNotIncludes(settingsLoadService, forbiddenServiceDependency, `Settings load service boundary ${forbiddenServiceDependency}`)
  assertNotIncludes(settingsActionService, forbiddenServiceDependency, `Settings action service boundary ${forbiddenServiceDependency}`)
  assertNotIncludes(settingsBrowserActionService, forbiddenServiceDependency, `Settings browser action service boundary ${forbiddenServiceDependency}`)
  assertNotIncludes(settingsWorkspaceExportFlowService, forbiddenServiceDependency, `Settings workspace export flow boundary ${forbiddenServiceDependency}`)
}

for (const forbiddenWorkspaceExportFlowDependency of [
  'window.',
  'document.',
  'localStorage',
  'fetch(',
  '@/lib/pmfSupabase',
]) {
  assertNotIncludes(settingsWorkspaceExportFlowService, forbiddenWorkspaceExportFlowDependency, `Settings workspace export flow direct dependency ${forbiddenWorkspaceExportFlowDependency}`)
}

for (const retiredActionServiceBrowserOwnership of [
  'CreatorSettingsActionResetPort',
  'scheduleCreatorSettingsActionReset',
  'scheduleCreatorSettingsRouteEffect',
  'window.',
]) {
  assertNotIncludes(settingsActionService, retiredActionServiceBrowserOwnership, `Settings action service must not own browser scheduling ${retiredActionServiceBrowserOwnership}`)
}

for (const localPreferenceMarker of [
  'applyCreatorSettingsDisplayPreferences(preferences)',
  'dataset.creatorMotion',
  "preferences.reduceMotion ? 'reduced' : 'normal'",
  'dataset.creatorTransparency',
  "preferences.reduceTransparency ? 'reduced' : 'normal'",
  '减少动态效果',
  '减少透明效果',
  'setPreferences(result.preferences)',
]) {
  assertIncludes(settingsPage + settingsBrowserActionService + workspacePreferencesComponent, localPreferenceMarker, `Settings display preference ${localPreferenceMarker}`)
}

for (const preferencePanelMarker of [
  'export function CreatorWorkspacePreferencesPanel',
  'creator-workspace-preferences-panel',
  'Card variant="glass"',
  'Checkbox',
  'ConfirmActionDialog',
  '减少动态效果',
  '减少透明效果',
  '重置显示偏好',
  'onClearPreferences',
]) {
  assertIncludes(settingsContractSurface, preferencePanelMarker, `Settings preference panel ${preferencePanelMarker}`)
}

for (const retiredToolSetupMarker of [
  '本地创作服务',
  '自带创作服务',
  '创作服务入口',
  '检查服务',
  '凭据状态',
  'hasAccessConfigured',
  'checkCreatorSettingsServiceConnection',
  'CreatorSettingsToolPanel',
]) {
  assertNotIncludes(settingsContractSurface, retiredToolSetupMarker, `Retired author-facing tool setup ${retiredToolSetupMarker}`)
}

for (const statusRailMarker of [
  'export function CreatorSettingsStatusRail',
  'creator-settings-status-rail',
  '<Card',
  'variant="glass"',
  'padding="none"',
  'Separator',
  '<Badge',
  'variant={item.ready ? \'stasis\' : \'outline\'}',
  'data-slot="creator-settings-status-card"',
  'data-slot="creator-settings-status-list"',
  'data-slot="creator-settings-status-item"',
  'data-slot="creator-settings-status-value"',
  'data-slot="creator-settings-readiness-section"',
  'data-slot="creator-settings-readiness-list"',
  'data-slot="creator-settings-readiness-item"',
  'data-slot="creator-settings-readiness-status"',
  'data-slot="creator-settings-boundary-section"',
  'data-slot="creator-settings-boundary-state-list"',
  'data-slot="creator-settings-boundary-state-item"',
  'data-slot="creator-settings-boundary-state-value"',
  'data-slot="creator-settings-promise-section"',
  'data-slot="creator-settings-promise-list"',
  'data-slot="creator-settings-promise-item"',
  '<dl',
  '<ul',
  '当前状态',
  '工作台准备度',
  '公开边界',
  '发布承诺',
  'statusItems',
  'readinessItems',
  'flagItems',
  'promises',
]) {
  assertIncludes(settingsContractSurface, statusRailMarker, `Settings status rail ${statusRailMarker}`)
}
if ([...settingsStatusRailComponent.matchAll(/<Card(?:\s|>)/g)].length !== 1) {
  throw new Error('Settings status rail must keep exactly one shadcn Card owner')
}
for (const forbiddenStatusRailPresentation of ['rounded-lg', 'rounded-xl', 'pu-motion-lift']) {
  assertNotIncludes(
    settingsStatusRailComponent,
    forbiddenStatusRailPresentation,
    `Settings status rail must not restore card-wall presentation ${forbiddenStatusRailPresentation}`,
  )
}

for (const workspaceMarker of [
  'export function CreatorLocalWorkspacePanel',
  'creator-local-workspace-panel',
  'padding="none"',
  'CardFooter',
  'AlertTitle',
  'Separator',
  'summaryItems',
  'operationItems',
  'permissionItems',
  'onExportWorkspace',
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
  '草稿、设定和发布包先留在当前设备',
  '导出备份',
  '导入备份',
  '助手权限',
  '操作记录',
  'readLocalWorkspaceSnapshot',
  'exportLocalWorkspaceBackup',
  'puf-local-creator-workspace-v2',
  'manifest.json',
  'records.json',
  'importRecordFingerprints',
  '工作区备份已导出',
]) {
  assertIncludes(settingsContractSurface, workspaceMarker, `Settings local workspace ${workspaceMarker}`)
}
const localWorkspaceCardCount = [...localWorkspaceComponent.matchAll(/<Card(?:\s|>)/g)].length
if (localWorkspaceCardCount !== 1) {
  throw new Error(`Settings local workspace must keep exactly one Card owner; found ${localWorkspaceCardCount}`)
}
for (const forbiddenWorkspacePresentation of ['rounded-lg', 'rounded-xl', 'pu-motion-lift']) {
  assertNotIncludes(
    localWorkspaceComponent,
    forbiddenWorkspacePresentation,
    `Settings local workspace must not restore card-wall presentation ${forbiddenWorkspacePresentation}`,
  )
}
assertNotIncludes(css, '.creator-local-workspace-', 'Settings local workspace must not add page-global CSS hooks')

for (const stateMarker of [
  "const [phase, setPhase] = useState<CreatorSettingsPhase>('loading')",
  'const [workspaceSnapshot, setWorkspaceSnapshot] = useState<LocalCreatorWorkspaceSnapshot>(() => initialLocalSnapshot.workspaceSnapshot)',
  "const [saving, setSaving] = useState(false)",
  "const [clearing, setClearing] = useState(false)",
  "setPhase('error')",
  "setPhase('ready')",
  'setNotice(result.notice)',
  'disabled={phase === \'loading\' || saving || clearing}',
  'disabled={saving || clearing}',
  'loading={saving}',
]) {
  assertIncludes(settingsPage, stateMarker, `Settings state ${stateMarker}`)
}

for (const clearMarker of [
  'function clearDisplayPreferences()',
  'setClearing(true)',
  'const result = clearCreatorWorkspacePreferences()',
  'setNotice(result.notice)',
  'ConfirmActionDialog',
  'title="重置显示偏好"',
  'description="这会恢复当前设备的默认显示方式。草稿、设定、备份和已发布内容不受影响。"',
  'actionLabel="确认重置"',
  'pendingLabel="重置中..."',
  'variant="destructive"',
  'onConfirm={onClearPreferences}',
]) {
  assertIncludes(settingsPage + workspacePreferencesComponent, clearMarker, `Settings clear confirmation ${clearMarker}`)
}

assertNotIncludes(settingsContractSurface, '预览版', 'Settings must not expose preview/build-flavored copy to authors')

for (const featureFlagMarker of [
  'flagLabel',
  'reader_requests_enabled',
  'creator_app_enabled',
  'cloud_ai_runtime_enabled',
  'flagState',
  'readinessItems',
  '作者身份',
  '创作设备',
  '工作台状态',
  '外界回声',
]) {
  assertIncludes(settingsPage + settingsRouteViewModels, featureFlagMarker, `Settings feature/readiness ${featureFlagMarker}`)
}

for (const forbiddenRouteDerivation of [
  'const flagMap = new Map(',
  'function flagLabel(',
  'function flagState(',
  'workspaceSnapshot.operationRecords.slice(',
  'workspaceSummaryItems.reduce(',
  'creatorAgentActions.filter(',
]) {
  assertNotIncludes(settingsPage, forbiddenRouteDerivation, `Settings route must delegate pure derivation ${forbiddenRouteDerivation}`)
}

for (const wrapperMarker of [
  "from '@/local-db/creatorLocalSettingsRepository'",
  'getLocalSettingsCreatorClientId()',
  'export async function syncCreatorClient',
  ".from('creator_clients')",
  'export async function listCreatorFeatureFlags',
  ".from('feature_flags')",
]) {
  assertIncludes(data, wrapperMarker, `Settings data wrapper ${wrapperMarker}`)
}

for (const forbiddenFacadeMarker of [
  'export function isLocalCreatorHost',
  'export function getLocalCreatorClientId',
  'export function readCreatorDisplayPreferences',
  'export function writeCreatorDisplayPreferences',
  "from '@/local-db/creatorLocalWorkspaceRepository'",
  'export function readLocalWorkspaceSnapshot',
]) {
  assertNotIncludes(data, forbiddenFacadeMarker, `Settings local ownership must stay outside Supabase facade ${forbiddenFacadeMarker}`)
}

for (const localSettingsMarker of [
  'export interface CreatorDisplayPreferences',
  'export function isLocalCreatorHost',
  'export function getLocalCreatorClientId',
  'export function readCreatorDisplayPreferences',
  'export function writeCreatorDisplayPreferences',
  'creatorLocalMetaKeys.displayPreferences',
  'readLocalMetaValue',
  'upsertLocalMetaValue',
]) {
  assertIncludes(localSettingsRepository, localSettingsMarker, `Local settings repository ${localSettingsMarker}`)
}
assertNotIncludes(localSettingsRepository, "@/lib/pmfSupabase", 'Local settings repository must not import the Supabase facade')
assertIncludes(legacyToolSettings, 'export function readLegacyCreatorToolSettings', 'Legacy tool settings keep one read-only cleanup owner')
assertIncludes(legacyToolSettings, 'creatorLocalMetaKeys.aiSettings', 'Legacy tool settings read the historical local meta key')
assertNotIncludes(legacyToolSettings, 'upsertLocalMetaValue', 'Legacy tool settings owner must stay read-only')
assertNotIncludes(data, 'readLocalAiSettings', 'Supabase facade must not expose retired local tool settings')
assertNotIncludes(data, 'writeLocalAiSettings', 'Supabase facade must not expose retired local tool setting writes')

for (const workspaceRepositoryMarker of [
  "from './creatorLocalAgentRepository'",
  "from './creatorLocalMigrationRepository'",
  'export interface LocalCreatorWorkspaceSnapshot',
  'export function readLocalWorkspaceSnapshot',
  'export function hydrateLocalWorkspace',
  'drafts: readLocalDrafts()',
  'settingAssets: readLocalSettingAssets()',
  'creativeReminders: readLocalCreativeReminders()',
  "from './creatorLocalPublishRepository'",
  'publishBundles: readLocalPublishBundles()',
  'publishReceipts: readLocalPublishReceipts()',
  'operationRecords: readLocalAgentOperations(20)',
  'migrationReceipts: readLocalMigrationReceipts()',
]) {
  assertIncludes(localWorkspaceRepository, workspaceRepositoryMarker, `Local workspace repository ${workspaceRepositoryMarker}`)
}

for (const typeMarker of [
  'export interface PmfCreatorClient',
  'export interface PmfFeatureFlag',
  "app_mode: 'local'",
  "online_status: 'online' | 'offline'",
  'last_sync_at',
]) {
  assertIncludes(types, typeMarker, `Settings type ${typeMarker}`)
}

for (const acceptanceMarker of [
  'Uses the title 本机工作区.',
  'Shows local workspace backup export, assistant permissions, and operation records.',
  'Shows local records, backup/recovery, local status, and display preferences.',
  'Shows a boundary summary covering local records, workspace portability, local device boundary, and public content boundary.',
  'Does not expose model, provider, service-address, or credential configuration.',
  'Save and reset display preferences expose in-progress states.',
  'Resetting display preferences requires confirmation and does not affect drafts, writing assets, backups, or published content.',
]) {
  assertIncludes(acceptance, acceptanceMarker, `Settings acceptance ${acceptanceMarker}`)
}

for (const productMarker of [
  'Required sections:',
  '本机保存',
  '备份恢复',
  '助手权限',
  '操作记录',
  '当前状态',
  '显示偏好',
  'export a versioned workspace backup',
  'reset display preferences with confirmation',
  'reduce motion',
  'reduce transparency',
  'do not expose as an author setting',
  'do not collect or display',
]) {
  assertIncludes((productPlan + blueprint + executionPlan).toLowerCase(), productMarker.toLowerCase(), `Settings product spec ${productMarker}`)
}

assertIncludes(dataMap, '创作设置', 'data map includes Settings')
assertIncludes(dataMap, '本机工作区', 'data map includes Local Workspace')
assertIncludes(dataMap, 'creator_clients', 'data map includes creator client reads')
assertIncludes(dataMap, 'feature_flags', 'data map includes feature flag reads')
assertIncludes(dataMap, 'display preferences', 'data map includes display preferences')
assertIncludes(dataMap, 'readLocalWorkspaceSnapshot', 'data map includes local workspace snapshot')
assertIncludes(css, "[data-creator-motion='reduced']", 'CSS supports reduced motion')
assertIncludes(css, "[data-creator-transparency='reduced']", 'CSS supports reduced transparency')

assertNotIncludes(settingsPage, 'API key', 'Settings UI must not say API key')
assertNotIncludes(settingsPage, 'apiKey', 'Settings UI must not store an apiKey field')
assertNotIncludes(settingsPage, 'secret', 'Settings UI must not expose secret fields')
assertNotIncludes(settingsPage, 'token', 'Settings UI must not expose token fields')
assertNotIncludes(settingsPage, '凭证', 'Settings UI must not expose credential-like terminology')
assertNotIncludes(settingsPage, '访问凭证', 'Settings UI must not expose access-credential wording')
assertNotIncludes(settingsPage, '服务地址', 'Settings UI must not expose service-address terminology')
assertNotIncludes(settingsPage, '服务名称', 'Settings UI must not expose service-name terminology')
assertNotIncludes(settingsPage, 'http://127.0.0.1', 'Settings UI must not show localhost examples')
assertNotIncludes(settingsPage, 'qa-local', 'Settings UI must not show QA version labels')
assertNotIncludes(settingsPage, 'type="password"', 'P0 Settings must not collect visible credential values')
assertNotIncludes(settingsContractSurface, 'provider', 'Local Workspace product surface must not expose provider setup')
assertNotIncludes(settingsContractSurface, 'baseUrl', 'Local Workspace product surface must not expose a service URL')
assertNotIncludes(settingsContractSurface, 'model', 'Local Workspace product surface must not expose model setup')
assertNotIncludes(settingsContractSurface, 'hasKey', 'Local Workspace product surface must not expose credential-state setup')
assertNotIncludes(settingsPage, 'UniverseDepth', 'Settings must not use Reader depth imagery')
assertNotIncludes(settingsPage, 'animate-particle-drift', 'Settings must not use particle background motion')
assertNotIncludes(settingsPage, 'pu-bg-reader', 'Settings must not use Reader background assets')
assertNotIncludes(settingsPage, 'function SettingsBoundaryStrip', 'Settings boundary strip must live in Creator component layer')
assertNotIncludes(settingsPage, '<h2 className="text-lg font-semibold text-[var(--creator-text)]">当前状态</h2>', 'Settings status rail must live in Creator component layer')
assertNotIncludes(settingsPage, '<h2 className="text-lg font-semibold text-[var(--creator-text)]">工作台准备度</h2>', 'Settings readiness rail must live in Creator component layer')
assertNotIncludes(settingsPage, '<h2 className="text-lg font-semibold text-[var(--creator-text)]">公开边界</h2>', 'Settings public-boundary rail must live in Creator component layer')
assertNotIncludes(settingsPage, '<h2 className="text-lg font-semibold text-[var(--creator-text)]">发布承诺</h2>', 'Settings promise rail must live in Creator component layer')

console.log('[creator-m7-settings] PASS')
