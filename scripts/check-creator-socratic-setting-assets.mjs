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

const types = assertIncludes('app/src/features/pmf/types.ts', [
  'PmfLocalSettingAssetKind',
  'PmfLocalSettingAssetStage',
  'PmfLocalSettingAsset',
  'character',
  'skill',
  'location',
  'map',
  'faction',
  'item',
  'rule',
  'timeline',
])

const adapter = read('app/src/lib/pmfSupabase.ts')
for (const forbiddenFacadeMarker of [
  'PmfLocalSettingAssetInput',
  'createLocalSettingAssetRef',
  'readLocalSettingAssets',
  'upsertLocalSettingAsset',
  "from '@/local-db/creatorLocalSettingAssetRepository'",
]) {
  assert(!adapter.includes(forbiddenFacadeMarker), `Supabase facade must not expose local setting-asset ownership: ${forbiddenFacadeMarker}`)
}

const localRepository = assertIncludes('app/src/local-db/creatorLocalRepository.ts', [
  'readLocalSettingAssetRecords',
  'upsertLocalSettingAssetRecord',
  'writingAssets: SETTING_ASSET_STORE',
])

assertIncludes('app/src/local-db/creatorLocalDb.ts', [
  'window.indexedDB.open',
  "writingAssets: 'writingAssets'",
])

const localSettingAssetRepository = assertIncludes('app/src/local-db/creatorLocalSettingAssetRepository.ts', [
  'PmfLocalSettingAssetInput',
  'createLocalSettingAssetRef',
  'readLocalSettingAssets',
  'upsertLocalSettingAsset',
  'readLocalSettingAssetRecords',
  'upsertLocalSettingAssetRecord',
  'normalizedTitle',
  'normalizedSummary',
])

const fixture = assertIncludes('app/src/__fixtures__/pmfSupabase.creator-qa.ts', [
  'defaultSettingAssets',
  'ensureSettingAssets',
  'readLocalSettingAssets',
  'upsertLocalSettingAsset',
])

const socraticPanels = assertIncludes('app/src/components/creator/workspace/CreatorSocraticPanels.tsx', [
  'CreatorSocraticPlanBoard',
  'CreatorLocalSettingLibrary',
  '阶段控制',
  '本机设定库',
  '沉淀为设定',
  '人物',
  '能力',
  '地点',
  '地图',
  '势力',
  '物品',
  '规则',
  '时间线',
  '人物、能力、地点、地图、势力、物品、规则和时间线只跟随当前设备',
  '<Card',
  '<Button',
  '<Badge',
])
for (const marker of [
  'export function CreatorSocraticPlanBoard',
  'export function CreatorLocalSettingLibrary',
]) {
  assert(socraticPanels.includes(marker), `CreatorSocraticPanels.tsx must own ${marker}`)
}

const creatorRoute = assertIncludes('app/src/apps/creator/routes/CreatorEditorRoute.tsx', [
  'settingAssets',
  'currentSettingAssets',
])
const canonicalConversationalEditor = creatorRoute.includes('CreatorConversationWorkspace')
if (canonicalConversationalEditor) {
  for (const marker of [
    "from './creatorEditorConversationSettingService'",
    'runConversationSettingCapture({',
    'captureConversationSetting',
    'onCaptureSetting={captureConversationSetting}',
    'setSettingAssets(result.settingAssets)',
  ]) {
    assert(creatorRoute.includes(marker), `CreatorEditorRoute.tsx missing conversational setting marker ${marker}`)
  }
  for (const legacyRouteMarker of [
    'runEditorSettingAssetSubmitFlow',
    'buildEditorWorkspaceViewModel({',
    'extractSettingHint',
  ]) {
    assert(!creatorRoute.includes(legacyRouteMarker), `CreatorEditorRoute.tsx must not remount legacy setting form marker ${legacyRouteMarker}`)
  }
} else {
  for (const marker of [
    'runEditorSettingAssetSubmitFlow',
    'buildEditorWorkspaceViewModel({',
    'extractSettingHint',
  ]) {
    assert(creatorRoute.includes(marker), `CreatorEditorRoute.tsx missing legacy setting marker ${marker}`)
  }
}
const conversationSettingService = assertIncludes('app/src/apps/creator/routes/creatorEditorConversationSettingService.ts', [
  'runConversationSettingCapture',
  "from '@/local-db/creatorLocalSettingAssetRepository'",
  'upsertLocalSettingAsset',
  'recognized: false',
  "label: '人物'",
  "label: '地点'",
  "label: '规则'",
  "label: '伏笔'",
])
assert(!conversationSettingService.includes("@/lib/pmfSupabase"), 'Conversation setting capture must stay local-first')
const conversationTimeline = assertIncludes('app/src/components/creator/workspace/CreatorConversationTimeline.tsx', [
  '已保存到本机写作智库',
  'props.settingAssets',
])
assert(!conversationTimeline.includes('upsertLocalSettingAsset'), 'Conversation timeline must render route-owned setting data without writing it')
const workspaceViewModelController = assertIncludes('app/src/apps/creator/routes/creatorEditorWorkspaceViewModelController.ts', [
  'buildSocraticPlanStages',
  'assets: settingAssets',
])
const userActionController = assertIncludes('app/src/apps/creator/routes/creatorEditorUserActionController.ts', [
  'resolveGuideStepSelection',
  'writingGuideStepLabel(nextStep)',
  '已切到',
])
assert(!creatorRoute.includes('writingGuideStepLabel(nextStep)'), 'CreatorEditorRoute.tsx must route guide-step copy through creatorEditorUserActionController')
const startupLoadService = assertIncludes('app/src/apps/creator/routes/creatorEditorStartupLoadService.ts', [
  'runEditorSettingAssetLoad',
  'readEditorStartupLocalSnapshot',
  'settingAssets: runEditorSettingAssetLoad().settingAssets',
])
const settingAssetController = assertIncludes('app/src/apps/creator/routes/creatorEditorSettingAssetController.ts', [
  'resolveEditorSettingAssetDraft',
  'defaultSettingKindForStage',
  'settingAssetKindLabel',
])
const settingAssetService = assertIncludes('app/src/apps/creator/routes/creatorEditorSettingAssetService.ts', [
  'EditorSettingAssetLoadPersistencePort',
  'runEditorSettingAssetLoad',
  'runEditorSettingAssetCapture',
  "from '@/local-db/creatorLocalSettingAssetRepository'",
  'upsertLocalSettingAsset',
  'readLocalSettingAssets',
  'persistence.readAll()',
  '已收进本机设定库',
])
assert(!settingAssetService.includes("@/lib/pmfSupabase"), 'Setting asset service must use creatorLocalSettingAssetRepository instead of the Supabase facade')
const settingAssetSubmitFlowService = assertIncludes('app/src/apps/creator/routes/creatorEditorSettingAssetSubmitFlowService.ts', [
  'runEditorSettingAssetSubmitFlow',
  'buildEditorSettingCaptureInput(context)',
  'runEditorSettingAssetCapture',
  'resolveEditorSettingAssetStatePatch(result)',
])
const creatorRails = assertIncludes('app/src/apps/creator/routes/CreatorEditorRails.tsx', [
  '<CreatorSocraticPlanBoard',
  '<CreatorLocalSettingLibrary',
])
const creator = `${creatorRoute}\n${conversationSettingService}\n${conversationTimeline}\n${workspaceViewModelController}\n${userActionController}\n${startupLoadService}\n${settingAssetController}\n${settingAssetService}\n${settingAssetSubmitFlowService}\n${creatorRails}`

assertIncludes('app/src/design-system/registry.ts', [
  'CreatorSocraticPlanBoard',
  'CreatorLocalSettingLibrary',
  'CreatorConversationTimeline',
])

assertIncludes('app/src/design-system/page-contracts.ts', [
  'CreatorSocraticPlanBoard',
  'CreatorLocalSettingLibrary',
  'CreatorConversationTimeline',
])

assertIncludes('docs/data-contracts/draft-storage-boundary.md', [
  'Local setting library',
  'Creator-side story bible assets are local-first in P0',
  'setting-asset load boundary',
])

assertIncludes('docs/data-contracts/creator-data-map.md', [
  'local setting assets',
  '人物、能力、地点、地图、势力、物品、规则、时间线',
])

for (const forbidden of [
  "from('creator_setting_assets')",
  'creator_setting_assets',
  'provider_response',
  'service_role',
  'api_key',
  '物件',
  '时间点',
]) {
  assert(!adapter.includes(forbidden), `Local setting assets must not use cloud adapter term: ${forbidden}`)
  assert(!fixture.includes(forbidden), `Creator QA fixture must not use forbidden term: ${forbidden}`)
  assert(!socraticPanels.includes(forbidden), `Creator Socratic panels must not render forbidden term: ${forbidden}`)
  assert(!creator.includes(forbidden), `Creator app must not render forbidden term: ${forbidden}`)
  assert(!localSettingAssetRepository.includes(forbidden), `Local setting asset repository must not use cloud adapter term: ${forbidden}`)
}
assert(!creatorRoute.includes('readLocalSettingAssets()'), 'Creator editor route must load setting assets through creatorEditorSettingAssetService')
assert(!creatorRoute.includes('runEditorSettingAssetCapture'), 'Creator editor route must capture setting assets through creatorEditorSettingAssetSubmitFlowService')
assert(!creatorRoute.includes('resolveEditorSettingAssetStatePatch'), 'Creator editor route must apply setting asset patches returned by creatorEditorSettingAssetSubmitFlowService')

for (const localOnlyMarker of [
  'PmfLocalSettingAsset',
  'readLocalSettingAssets',
  'upsertLocalSettingAsset',
]) {
  assert(types.includes(localOnlyMarker) || localSettingAssetRepository.includes(localOnlyMarker), `Missing local-only marker ${localOnlyMarker}`)
}

console.log('[creator-socratic-setting-assets] PASS')
