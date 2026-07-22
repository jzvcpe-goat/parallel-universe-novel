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

function assertBefore(body: string, first: string, second: string, label: string) {
  const firstIndex = body.indexOf(first)
  const secondIndex = body.indexOf(second)
  if (firstIndex === -1) throw new Error(`${label}: missing first marker ${JSON.stringify(first)}`)
  if (secondIndex === -1) throw new Error(`${label}: missing second marker ${JSON.stringify(second)}`)
  if (firstIndex > secondIndex) {
    throw new Error(`${label}: expected ${JSON.stringify(first)} before ${JSON.stringify(second)}`)
  }
}

function assertPureController(body: string, label: string) {
  for (const forbidden of [
    'from \'react\'',
    'from "react"',
    '@/components/',
    '@/lib/pmfSupabase',
    'window.',
    'document.',
    'localStorage',
    'indexedDB',
    'fetch(',
    'publishChapter(',
    'upsertLocalDraft(',
    'upsertLocalCreativeReminder(',
    'navigate(',
  ]) {
    assertNotIncludes(body, forbidden, `${label} must stay a pure decision controller`)
  }
}

function sliceBetween(body: string, start: string, end: string) {
  const startIndex = body.indexOf(start)
  if (startIndex === -1) throw new Error(`Missing section start: ${start}`)
  const endIndex = body.indexOf(end, startIndex + start.length)
  if (endIndex === -1) throw new Error(`Missing section end: ${end}`)
  return body.slice(startIndex, endIndex)
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

const creator = read('app/src/apps/creator/LocalCreatorApp.tsx')
const editorRoute = read('app/src/apps/creator/routes/CreatorEditorRoute.tsx')
const editorManuscript = read('app/src/apps/creator/routes/CreatorEditorManuscriptStage.tsx')
const editorController = read('app/src/apps/creator/routes/creatorEditorRouteController.ts')
const editorCommandController = read('app/src/apps/creator/routes/creatorEditorCommandController.ts')
const editorAssistantController = read('app/src/apps/creator/routes/creatorEditorAssistantController.ts')
const editorSelectionController = read('app/src/apps/creator/routes/creatorEditorSelectionController.ts')
const editorCommandEventService = read('app/src/apps/creator/routes/creatorEditorCommandEventService.ts')
const editorCommandPatchController = read('app/src/apps/creator/routes/creatorEditorCommandPatchController.ts')
const editorCommandFlowService = read('app/src/apps/creator/routes/creatorEditorCommandFlowService.ts')
const editorActionInputController = read('app/src/apps/creator/routes/creatorEditorActionInputController.ts')
const editorCandidateController = read('app/src/apps/creator/routes/creatorEditorCandidateController.ts')
const editorCandidatePatchController = read('app/src/apps/creator/routes/creatorEditorCandidatePatchController.ts')
const editorDraftController = read('app/src/apps/creator/routes/creatorEditorDraftController.ts')
const editorDraftActionController = read('app/src/apps/creator/routes/creatorEditorDraftActionController.ts')
const editorDraftActionService = read('app/src/apps/creator/routes/creatorEditorDraftActionService.ts')
const editorDraftActionFlowService = read('app/src/apps/creator/routes/creatorEditorDraftActionFlowService.ts')
const editorDraftSubmitFlowService = read('app/src/apps/creator/routes/creatorEditorDraftSubmitFlowService.ts')
const editorAgentExecutionService = read('app/src/apps/creator/routes/creatorEditorAgentExecutionService.ts')
const editorDraftActionResetService = read('app/src/apps/creator/routes/creatorEditorDraftActionResetService.ts')
const editorDraftPatchController = read('app/src/apps/creator/routes/creatorEditorDraftPatchController.ts')
const editorStartupPatchController = read('app/src/apps/creator/routes/creatorEditorStartupPatchController.ts')
const editorStartupDataPatchController = read('app/src/apps/creator/routes/creatorEditorStartupDataPatchController.ts')
const editorReactPatchApplier = read('app/src/apps/creator/routes/creatorEditorReactPatchApplier.ts')
const editorUserActionController = read('app/src/apps/creator/routes/creatorEditorUserActionController.ts')
const editorDraftPersistence = read('app/src/apps/creator/routes/creatorEditorDraftPersistence.ts')
const editorDraftLoadService = read('app/src/apps/creator/routes/creatorEditorDraftLoadService.ts')
const editorDraftSaveService = read('app/src/apps/creator/routes/creatorEditorDraftSaveService.ts')
const editorPublishHandoffController = read('app/src/apps/creator/routes/creatorEditorPublishHandoffController.ts')
const editorPublishHandoffService = read('app/src/apps/creator/routes/creatorEditorPublishHandoffService.ts')
const editorPublishCheckService = read('app/src/apps/creator/routes/creatorEditorPublishCheckService.ts')
const publishBundleDraftHandoff = read('app/src/features/creator-pivot/publishBundleDraftHandoff.ts')
const editorReminderService = read('app/src/apps/creator/routes/creatorEditorReminderService.ts')
const editorSettingAssetController = read('app/src/apps/creator/routes/creatorEditorSettingAssetController.ts')
const editorSettingAssetService = read('app/src/apps/creator/routes/creatorEditorSettingAssetService.ts')
const editorSettingAssetPatchController = read('app/src/apps/creator/routes/creatorEditorSettingAssetPatchController.ts')
const editorSettingAssetSubmitFlowService = read('app/src/apps/creator/routes/creatorEditorSettingAssetSubmitFlowService.ts')
const editorStartupEffectService = read('app/src/apps/creator/routes/creatorEditorStartupEffectService.ts')
const editorStartupLoadService = read('app/src/apps/creator/routes/creatorEditorStartupLoadService.ts')
const editorGuidance = read('app/src/apps/creator/routes/CreatorEditorGuidance.tsx')
const editorRails = read('app/src/apps/creator/routes/CreatorEditorRails.tsx')
const editorDestinationController = read('app/src/apps/creator/routes/creatorEditorDestinationController.ts')
const editorWorkspaceViewModelController = read('app/src/apps/creator/routes/creatorEditorWorkspaceViewModelController.ts')
const editorViewModels = read('app/src/apps/creator/routes/creatorEditorViewModels.ts')
const editorSocraticViewModels = read('app/src/apps/creator/routes/creatorEditorSocraticViewModels.ts')
const editorAssistantViewModels = read('app/src/apps/creator/routes/creatorEditorAssistantViewModels.ts')
const editorSessionViewModels = read('app/src/apps/creator/routes/creatorEditorSessionViewModels.ts')
const editorQualityViewModels = read('app/src/apps/creator/routes/creatorEditorQualityViewModels.ts')
const editorReviewImpactViewModels = read('app/src/apps/creator/routes/creatorEditorReviewImpactViewModels.tsx')
const editorStoryMapViewModels = read('app/src/apps/creator/routes/creatorEditorStoryMapViewModels.tsx')
const editorInlineReviewViewModels = read('app/src/apps/creator/routes/creatorEditorInlineReviewViewModels.ts')
const creatorAppFrame = read('app/src/components/creator/CreatorAppFrame.tsx')
const creatorShell = read('app/src/components/creator/CreatorShell.tsx')
const destinationPanels = read('app/src/components/creator/workspace/CreatorDestinationPanels.tsx')
const commitPanels = read('app/src/components/creator/workspace/CreatorCommitPanels.tsx')
const storyContextPanels = read('app/src/components/creator/workspace/CreatorStoryContextPanels.tsx')
const socraticPanels = read('app/src/components/creator/workspace/CreatorSocraticPanels.tsx')
const assistantSidecar = read('app/src/components/creator/workspace/CreatorAssistantSidecar.tsx')
const commandPalette = read('app/src/components/creator/workspace/CreatorCommandPalette.tsx')
const commandCandidate = read('app/src/components/creator/workspace/CreatorCommandCandidate.tsx')
const reviewDock = read('app/src/components/creator/workspace/CreatorReviewDock.tsx')
const qualityPanels = read('app/src/components/creator/workspace/CreatorQualityPanels.tsx')
const impactPanels = read('app/src/components/creator/workspace/CreatorImpactPanels.tsx')
const inlineReviewPanels = read('app/src/components/creator/workspace/CreatorInlineReviewPanels.tsx')
const progressPanels = read('app/src/components/creator/workspace/CreatorProgressPanels.tsx')
const draftGuidancePanels = read('app/src/components/creator/workspace/CreatorDraftGuidancePanels.tsx')
const planningPanels = read('app/src/components/creator/workspace/CreatorPlanningPanels.tsx')
const decisionPanels = read('app/src/components/creator/workspace/CreatorDecisionPanels.tsx')
const inlineAssistantPanels = read('app/src/components/creator/workspace/CreatorInlineAssistantPanels.tsx')
const agentAssistantPanels = read('app/src/components/creator/workspace/CreatorAgentAssistantPanels.tsx')
const conversationWorkspace = read('app/src/components/creator/workspace/CreatorConversationWorkspace.tsx')
const conversationTimeline = read('app/src/components/creator/workspace/CreatorConversationTimeline.tsx')
const recallRail = read('app/src/components/creator/workspace/CreatorRecallRail.tsx')
const recallViewModels = read('app/src/apps/creator/routes/creatorEditorRecallViewModels.ts')
const conversationSettingService = read('app/src/apps/creator/routes/creatorEditorConversationSettingService.ts')
const conversationReviewService = read('app/src/apps/creator/routes/creatorEditorConversationReviewService.ts')
const nextChapterService = read('app/src/apps/creator/routes/creatorEditorNextChapterService.ts')
const nextChapterServiceTest = read('app/tests/creator-next-chapter-service.ts')
const nextChapterQualityGate = read('app/src/features/creator-decision/nextChapterQualityGate.ts')
const decisionContextAdapter = read('app/src/apps/creator/routes/creatorEditorDecisionContextAdapter.ts')
const workspaceShell = read('app/src/components/creator/workspace/CreatorWorkspaceShell.tsx')
const data = read('app/src/lib/pmfSupabase.ts')
const localSettingAssetRepository = read('app/src/local-db/creatorLocalSettingAssetRepository.ts')
const localDraftRepository = read('app/src/local-db/creatorLocalDraftRepository.ts')
const localWritingRepository = read('app/src/local-db/creatorLocalWritingRepository.ts')
const localWorkspaceRepository = read('app/src/local-db/creatorLocalWorkspaceRepository.ts')
const css = read('app/src/index.css')
const tokenCss = read('app/src/styles/parallel-universe-tokens.css')
const acceptance = read('docs/harness/page-acceptance-tests.md')
const draftBoundary = read('docs/data-contracts/draft-storage-boundary.md')
const dataMap = read('docs/data-contracts/creator-data-map.md')
const authenticatedBrowserQa = read('scripts/browser-local-creator-authenticated-routes.mjs')

const editorPage = editorRoute
const canonicalConversationalEditor = editorRoute.includes('CreatorConversationWorkspace')
const editorMain = editorManuscript
const editorRightRail = sliceBetween(editorRails, 'export function CreatorEditorRightRail', 'export interface CreatorEditorBottomRailProps')
const workspaceFrame = workspaceShell
const agentComposer = sliceBetween(agentAssistantPanels, 'export function CreatorAgentComposer', 'export interface CreatorAssistantDockProps')
const assistantDock = sliceBetween(agentAssistantPanels, 'export function CreatorAssistantDock', 'function CreatorAssistantSection')
const editorAssistPanel = sliceBetween(inlineAssistantPanels, 'export function CreatorEditorAssistPanel', 'export interface CreatorGhostCompletionPanel')
const collapsibleOutline = sliceBetween(planningPanels, 'export function CreatorCollapsibleOutline', 'export interface CreatorChapterGoalBrief')
const workspaceComponentSurface = `${workspaceShell}\n${destinationPanels}\n${commitPanels}\n${storyContextPanels}\n${socraticPanels}\n${assistantSidecar}\n${commandPalette}\n${commandCandidate}\n${reviewDock}\n${qualityPanels}\n${impactPanels}\n${inlineReviewPanels}\n${progressPanels}\n${draftGuidancePanels}\n${planningPanels}\n${decisionPanels}\n${inlineAssistantPanels}\n${agentAssistantPanels}`
const editorContractSurface = `${editorPage}\n${editorManuscript}\n${editorController}\n${editorCommandController}\n${editorAssistantController}\n${editorSelectionController}\n${editorCommandEventService}\n${editorCommandPatchController}\n${editorCommandFlowService}\n${editorActionInputController}\n${editorCandidateController}\n${editorCandidatePatchController}\n${editorDraftController}\n${editorDraftActionController}\n${editorDraftActionService}\n${editorDraftActionFlowService}\n${editorDraftSubmitFlowService}\n${editorAgentExecutionService}\n${editorDraftActionResetService}\n${editorDraftPatchController}\n${editorStartupPatchController}\n${editorStartupDataPatchController}\n${editorReactPatchApplier}\n${editorUserActionController}\n${editorStartupEffectService}\n${editorStartupLoadService}\n${editorDraftPersistence}\n${editorDraftLoadService}\n${editorDraftSaveService}\n${editorPublishHandoffController}\n${editorPublishHandoffService}\n${editorPublishCheckService}\n${publishBundleDraftHandoff}\n${editorReminderService}\n${editorSettingAssetController}\n${editorSettingAssetService}\n${editorSettingAssetPatchController}\n${editorSettingAssetSubmitFlowService}\n${editorDestinationController}\n${editorWorkspaceViewModelController}\n${editorGuidance}\n${editorRails}\n${editorViewModels}\n${editorSocraticViewModels}\n${editorAssistantViewModels}\n${editorSessionViewModels}\n${editorQualityViewModels}\n${editorReviewImpactViewModels}\n${editorStoryMapViewModels}\n${editorInlineReviewViewModels}\n${creator}\n${creatorAppFrame}\n${workspaceComponentSurface}\n${localWritingRepository}`
const conversationalEditorContractSurface = `${editorRoute}\n${conversationWorkspace}\n${conversationTimeline}\n${recallRail}\n${recallViewModels}\n${conversationSettingService}\n${conversationReviewService}\n${decisionContextAdapter}`

assertIncludes(
  editorRails,
  "from '@/components/creator/workspace/CreatorDestinationPanels'",
  'Creator editor rails must consume the extracted destination panel owner',
)
assertIncludes(destinationPanels, 'export function CreatorDestinationPanel', 'Destination panel owner exports destination component')
assertIncludes(destinationPanels, 'export function CreatorBundleReadinessPanel', 'Destination panel owner exports bundle readiness component')
assertIncludes(
  editorRails,
  "from '@/components/creator/workspace/CreatorCommitPanels'",
  'Creator editor rails must consume the extracted commit panel owner',
)
assertIncludes(commitPanels, 'export function CreatorAuthorStatusPanel', 'Commit panel owner exports author status component')
assertIncludes(commitPanels, 'export function CreatorCanonCommitBar', 'Commit panel owner exports canon component')
assertIncludes(
  editorRails,
  "from '@/components/creator/workspace/CreatorStoryContextPanels'",
  'Creator editor rails must consume the extracted story context owner',
)
assertIncludes(
  editorStoryMapViewModels,
  "from '@/components/creator/workspace/CreatorStoryContextPanels'",
  'Creator editor story-map view models must consume story context types from their owner',
)
for (const marker of [
  'export function CreatorSessionRail',
  'export function CreatorStoryMap',
  'export function CreatorReaderWishPanel',
]) {
  assertIncludes(storyContextPanels, marker, `Story context owner ${marker}`)
}
for (const marker of [
  '[box-shadow:var(--creator-rail-shadow)]',
  'data-slot="creator-session-panel"',
  'data-slot="creator-session-group"',
  'data-slot="creator-session-row"',
  'data-slot="creator-session-empty"',
  'data-slot="creator-story-map"',
  'data-slot="creator-story-map-row"',
  'data-slot="creator-story-map-icon"',
  'data-slot="creator-reader-wish-panel"',
  'line-clamp-2',
  'truncate text-[0.84rem]',
  'data-agent-action={item.agentAction}',
]) {
  assertIncludes(storyContextPanels, marker, `Story context atomic owner ${marker}`)
}
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
  assertNotIncludes(css, retiredStoryContextSelector, `Story context styling must stay component-owned instead of ${retiredStoryContextSelector}`)
}
for (const marker of [
  'export function CreatorGuidedCoachFrame',
  'export function CreatorSocraticPlanBoard',
  'export function CreatorLocalSettingLibrary',
]) {
  assertIncludes(socraticPanels, marker, `Socratic panel owner ${marker}`)
}
const socraticPlanBoardSection = sliceBetween(
  socraticPanels,
  'export function CreatorSocraticPlanBoard',
  'export interface CreatorLocalSettingLibraryProps',
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
  'aria-pressed={stage.id === activeStageId}',
  'onStageSelect(stage.id)',
  'onCaptureAsset(activeStage.id)',
]) {
  assertIncludes(socraticPlanBoardSection, marker, `Socratic plan board atomic owner ${marker}`)
}
if ((socraticPlanBoardSection.match(/<Card\b/g) || []).length !== 1) {
  throw new Error('Socratic plan board must own exactly one shadcn Card surface')
}
for (const forbidden of [
  'variant="glass"',
  'rounded-2xl',
  'workspaceAssistantPanelClass',
  "cn('creator-socratic-plan-board'",
]) {
  assertNotIncludes(socraticPlanBoardSection, forbidden, `Socratic plan board must stay flat and component-owned: ${forbidden}`)
}
assertIncludes(editorGuidance, "from '@/components/creator/workspace/CreatorSocraticPanels'", 'Editor guidance consumes the Socratic panel owner directly')
assertIncludes(editorRails, "from '@/components/creator/workspace/CreatorSocraticPanels'", 'Editor rails consume the Socratic panel owner directly')
assertIncludes(editorSocraticViewModels, "from '@/components/creator/workspace/CreatorSocraticPanels'", 'Socratic view models consume the Socratic panel contracts directly')
for (const marker of [
  'export function CreatorAssistantSidecarFrame',
  'export function CreatorAssistantSidecarSurface',
]) {
  assertIncludes(assistantSidecar, marker, `Assistant sidecar owner ${marker}`)
}
assertIncludes(creatorAppFrame, "from '@/components/creator/workspace/CreatorAssistantSidecar'", 'Creator frame consumes the assistant sidecar owner directly')
for (const [owner, markers] of [
  [commandPalette, ['export function CreatorCommandCenterFrame', 'export function CreatorCommandPaletteSurface']],
  [commandCandidate, ['export function CreatorCommandCandidateFrame', 'export function CreatorCommandCandidateSurface']],
] as const) {
  for (const marker of markers) {
    assertIncludes(owner, marker, `Command surface owner ${marker}`)
  }
}
for (const commandPaletteSlot of [
  'data-slot="creator-command-overlay"',
  'data-slot="creator-command-panel"',
  'data-slot="creator-command-header"',
  'data-slot="creator-command-content"',
  'data-slot="creator-command-intent-summary"',
  'data-slot="creator-command-intent-item"',
  'data-slot="creator-command-context"',
  'data-slot="creator-command-context-item"',
  'data-slot="creator-command-examples"',
  'data-slot="creator-command-input"',
  'data-slot="creator-command-suggestions"',
  'data-slot="creator-command-list"',
  'data-slot="creator-command-item"',
]) {
  assertIncludes(commandPalette, commandPaletteSlot, `Command palette exposes atomic slot ${commandPaletteSlot}`)
}
for (const commandPaletteContract of [
  '@/components/ui/card',
  '@/components/ui/button',
  '@/components/ui/badge',
  '@/components/ui/input',
  "import { createPortal } from 'react-dom'",
  '<dl',
  '<ul',
  'max-[720px]:grid-cols-1',
  '[[data-creator-transparency=reduced]_&]:[background:var(--creator-command-solid-bg)]',
]) {
  assertIncludes(commandPalette, commandPaletteContract, `Command palette owns shadcn/semantic contract ${commandPaletteContract}`)
}
for (const commandPaletteToken of [
  '--creator-command-overlay-bg:',
  '--creator-command-overlay-solid-bg:',
  '--creator-command-solid-bg:',
  '--creator-command-inset-solid-bg:',
]) {
  assertIncludes(tokenCss, commandPaletteToken, `Command palette token layer owns ${commandPaletteToken}`)
}
assertIncludes(creatorAppFrame, "from '@/components/creator/workspace/CreatorCommandPalette'", 'Creator frame consumes the command palette owner directly')
assertIncludes(creatorAppFrame, "from '@/components/creator/workspace/CreatorCommandCandidate'", 'Creator frame consumes the command candidate owner directly')
for (const [owner, markers] of [
  [reviewDock, ['export function CreatorReviewDockFrame', 'export function CreatorReviewCommandBar', 'export function CreatorCreativeReviewDock']],
  [qualityPanels, ['export function CreatorQualityIssueCard']],
  [impactPanels, ['export function CreatorStateDiffPanel', 'export function CreatorBranchSandboxPanel', 'export function CreatorFlightRecorderPanel']],
] as const) {
  for (const marker of markers) {
    assertIncludes(owner, marker, `Review component owner ${marker}`)
  }
}
for (const marker of [
  "import { Card } from '@/components/ui/card'",
  'data-slot="creator-quality-review"',
  'data-slot="creator-quality-metric"',
  'data-slot="creator-quality-issue"',
  'data-slot="creator-quality-fix-action"',
  'severityRailVariants',
  'bg-[var(--creator-surface-strong)]',
]) {
  assertIncludes(qualityPanels, marker, `Quality card atomic owner ${marker}`)
}
assertNotIncludes(qualityPanels, 'className="creator-quality-', 'Quality card must not depend on page-global creator-quality classes')
for (const retiredQualitySelector of [
  '.creator-quality-review',
  '.creator-quality-head',
  '.creator-quality-kicker',
  '.creator-quality-summary',
  '.creator-quality-list',
  '.creator-quality-issue',
  '.creator-quality-evidence-grid',
  '.creator-quality-fix-list',
  '.creator-quality-fix-title',
  '.creator-quality-fix-action',
  '.creator-quality-fix-copy',
  '.creator-quality-pass',
  '.creator-quality-explain',
]) {
  assertNotIncludes(css, retiredQualitySelector, `Quality card styling must stay component-owned instead of ${retiredQualitySelector}`)
}
assertIncludes(editorRails, "from '@/components/creator/workspace/CreatorReviewDock'", 'Editor rails consume the review dock owner directly')
if (!canonicalConversationalEditor) {
  assertIncludes(editorPage, "from '@/components/creator/workspace/CreatorImpactPanels'", 'Legacy editor route consumes retained impact panels directly')
}
assertIncludes(editorQualityViewModels, "from '@/components/creator/workspace/CreatorQualityPanels'", 'Quality view models consume quality contracts directly')
assertIncludes(editorReviewImpactViewModels, "from '@/components/creator/workspace/CreatorImpactPanels'", 'Review impact view models consume impact contracts directly')
assertIncludes(reviewDock, "from './CreatorQualityPanels'", 'Review dock composes the quality owner directly')
assertIncludes(reviewDock, "from './CreatorImpactPanels'", 'Review dock composes the impact owner directly')
for (const [owner, label] of [
  [commitPanels, 'commit panels'],
  [commandPalette, 'command palette'],
  [reviewDock, 'review dock'],
  [planningPanels, 'planning panels'],
  [decisionPanels, 'decision panels'],
  [agentAssistantPanels, 'Agent assistant panels'],
  [editorReviewImpactViewModels, 'review impact view models'],
] as const) {
  assertIncludes(owner, '发布包', `${label} must name the current PublishBundle object`)
  assertNotIncludes(owner, '发布检查', `${label} must not retain retired publish-check framing`)
}
assertIncludes(agentAssistantPanels, 'data-agent-action="enter_publish_check"', 'Agent assistant keeps the stable compatibility action id')
const visibleEditorCopy = visibleFragments(`${editorPage}\n${editorManuscript}\n${editorRails}`).join('\n')

assertPureController(editorController, 'creatorEditorRouteController')
assertPureController(editorCommandController, 'creatorEditorCommandController')
assertPureController(editorAssistantController, 'creatorEditorAssistantController')
assertPureController(editorSelectionController, 'creatorEditorSelectionController')
assertPureController(editorCommandPatchController, 'creatorEditorCommandPatchController')
assertPureController(editorCommandFlowService, 'creatorEditorCommandFlowService')
assertPureController(editorActionInputController, 'creatorEditorActionInputController')
assertPureController(editorCandidateController, 'creatorEditorCandidateController')
assertPureController(editorCandidatePatchController, 'creatorEditorCandidatePatchController')
assertPureController(editorDraftController, 'creatorEditorDraftController')
assertPureController(editorDraftActionController, 'creatorEditorDraftActionController')
assertPureController(editorDraftSubmitFlowService, 'creatorEditorDraftSubmitFlowService')
assertPureController(editorAgentExecutionService, 'creatorEditorAgentExecutionService')
assertPureController(editorDraftPatchController, 'creatorEditorDraftPatchController')
assertPureController(editorStartupPatchController, 'creatorEditorStartupPatchController')
assertPureController(editorStartupDataPatchController, 'creatorEditorStartupDataPatchController')
assertPureController(editorUserActionController, 'creatorEditorUserActionController')

for (const [owner, label, ownerPrivateTypes] of [
  [editorController, 'route controller', ['CreatorEditorCreativeReminderRef', 'CreatorEditorBootstrapInput', 'CreatorEditorDraftRestore', 'CreatorEditorRequestSeed', 'CreatorEditorRouteBranchRestore']],
  [editorDraftController, 'draft controller', ['EditorDraftSaveBlocker', 'BuildEditorLocalDraftInput']],
  [editorSettingAssetController, 'setting-asset controller', ['EditorSettingAssetDraft', 'EditorSettingAssetDraftResolution']],
  [editorSelectionController, 'selection controller', ['ResolveEditorSelectedRequestInput']],
  [editorUserActionController, 'user-action controller', ['ResolveAssistantSuggestionAcceptanceInput']],
] as const) {
  for (const ownerPrivateType of ownerPrivateTypes) {
    assertNotIncludes(owner, `export interface ${ownerPrivateType} {`, `${label} interface must stay owner-private: ${ownerPrivateType}`)
    assertNotIncludes(owner, `export type ${ownerPrivateType} =`, `${label} type must stay owner-private: ${ownerPrivateType}`)
  }
}

for (const [owner, label, ownerPrivateTypes] of [
  [editorAgentExecutionService, 'Agent execution service', ['EditorAgentExecutionResult']],
  [editorCommandEventService, 'command event service', ['EditorCommandEventContext']],
  [editorCommandFlowService, 'command flow service', ['ResolveEditorCommandPatchFlowInput']],
  [editorDraftActionFlowService, 'draft action flow service', ['RunEditorManualDraftActionFlowInput', 'RunEditorManualDraftActionFlowResult', 'RunEditorPublishCheckFlowInput', 'RunEditorPublishCheckFlowResult']],
  [editorDraftActionService, 'draft action service', ['RunEditorDraftActionResult']],
  [editorDraftLoadService, 'draft load service', ['RunEditorDraftLoadResult']],
  [editorReminderService, 'reminder service', ['RunEditorReminderLoadResult', 'RunEditorReminderBootstrapInput']],
  [editorSettingAssetService, 'setting-asset service', ['RunEditorSettingAssetLoadResult']],
  [editorStartupEffectService, 'startup effect service', ['CancelEditorStartupEffect', 'EditorStartupEffectCurrentState', 'RunEditorStartupEffectInput']],
  [editorStartupLoadService, 'startup load service', ['EditorStartupLocalSnapshot']],
] as const) {
  for (const ownerPrivateType of ownerPrivateTypes) {
    assertNotIncludes(owner, `export interface ${ownerPrivateType}`, `${label} interface must stay owner-private: ${ownerPrivateType}`)
    assertNotIncludes(owner, `export type ${ownerPrivateType}`, `${label} type must stay owner-private: ${ownerPrivateType}`)
  }
}
assertPureController(editorPublishHandoffController, 'creatorEditorPublishHandoffController')
assertPureController(editorSettingAssetController, 'creatorEditorSettingAssetController')
assertPureController(editorSettingAssetPatchController, 'creatorEditorSettingAssetPatchController')
assertPureController(editorSettingAssetSubmitFlowService, 'creatorEditorSettingAssetSubmitFlowService')
assertPureController(editorDestinationController, 'creatorEditorDestinationController')
assertPureController(editorWorkspaceViewModelController, 'creatorEditorWorkspaceViewModelController')
for (const forbidden of [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'window.',
  'document.',
  'localStorage',
  'indexedDB',
  'fetch(',
  'publishChapter(',
  'navigate(',
]) {
  assertNotIncludes(editorDraftPersistence, forbidden, 'creatorEditorDraftPersistence must stay a local-draft adapter, not a UI/runtime owner')
  assertNotIncludes(editorDraftLoadService, forbidden, 'creatorEditorDraftLoadService must stay a draft load service, not a UI/runtime owner')
  assertNotIncludes(editorDraftSaveService, forbidden, 'creatorEditorDraftSaveService must stay a draft save service, not a UI/runtime owner')
  assertNotIncludes(editorDraftActionService, forbidden, 'creatorEditorDraftActionService must stay a draft action service, not a UI/runtime owner')
  assertNotIncludes(editorReminderService, forbidden, 'creatorEditorReminderService must stay a reminder service, not a UI/runtime owner')
  assertNotIncludes(editorSettingAssetService, forbidden, 'creatorEditorSettingAssetService must stay a setting-asset service, not a UI/runtime owner')
  assertNotIncludes(editorStartupLoadService, forbidden, 'creatorEditorStartupLoadService must stay a startup load service, not a UI/runtime owner')
}
for (const forbidden of [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'localStorage',
  'indexedDB',
  'fetch(',
  'publishChapter(',
  'navigate(',
  'upsertLocalDraft(',
]) {
  assertNotIncludes(editorStartupEffectService, forbidden, 'creatorEditorStartupEffectService must stay a startup effect service, not a UI/storage owner')
  assertNotIncludes(editorReactPatchApplier, forbidden, 'creatorEditorReactPatchApplier must stay a React patch applier, not a UI/storage owner')
}
for (const forbidden of [
  'from \'react\'',
  'from "react"',
  '@/components/',
  'localStorage',
  'indexedDB',
  'fetch(',
  'publishChapter(',
  'navigate(',
]) {
  assertNotIncludes(editorCommandEventService, forbidden, 'creatorEditorCommandEventService must stay a command-event service, not a UI/storage owner')
}

assertIncludes(creator, '<CreatorEditorRoute />', 'LocalCreatorApp must mount the extracted editor route owner')
assertNotIncludes(creator, 'function EditorPage()', 'LocalCreatorApp must not own the editor page after route-owner extraction')
assertIncludes(editorRoute, 'export function CreatorEditorRoute()', 'Creator editor route owner must export CreatorEditorRoute')
assertIncludes(editorRoute, "from '@/components/creator/workspace/CreatorConversationWorkspace'", 'Creator editor route must consume the canonical conversation workspace')
assertIncludes(editorRoute, "from './creatorEditorRecallViewModels'", 'Creator editor route must consume the manual recall adapter')
assertIncludes(editorRoute, "from './creatorEditorConversationSettingService'", 'Creator editor route must consume the conversation setting detour')
assertIncludes(editorRoute, 'evaluateNextChapterQualityGate', 'Creator editor route must evaluate next-chapter quality readiness')
assertIncludes(editorRoute, 'nextChapterBlockedReason={nextChapterBlockedReason}', 'Creator editor route must expose the quality blocker to the conversation timeline')
assertIncludes(nextChapterService, 'evaluateNextChapterQualityGate({', 'Next-chapter persistence service must enforce the same quality gate')
assertIncludes(nextChapterService, "throw new CreationDecisionError(", 'Blocked next-chapter persistence must fail before creating the next chapter')
assertIncludes(nextChapterService, 'ports: PrepareEditorNextChapterPorts = defaultPrepareEditorNextChapterPorts', 'Next-chapter service must expose replaceable side-effect ports for runtime isolation tests')
assertBefore(nextChapterService, 'if (!qualityGate.allowed)', 'ports.saveDraft({', 'Next-chapter quality gate must run before draft persistence')
assertBefore(nextChapterService, 'if (!qualityGate.allowed)', 'ports.loadCanonState(', 'Next-chapter quality gate must run before Canon repository access')
assertIncludes(nextChapterServiceTest, 'saveDraft: 0', 'Next-chapter runtime test must prove blocked draft persistence stays at zero')
assertIncludes(nextChapterServiceTest, 'loadCanonState: 0', 'Next-chapter runtime test must prove blocked Canon reads stay at zero')
assertIncludes(nextChapterServiceTest, 'saveCanonState: 0', 'Next-chapter runtime test must prove blocked Canon writes stay at zero')
assertIncludes(nextChapterQualityGate, "code: 'pending_repair_decision'", 'Next-chapter gate must stop unresolved author repair decisions')
assertIncludes(nextChapterQualityGate, "code: 'active_hard_block'", 'Next-chapter gate must stop active hard literary findings')
assertIncludes(conversationTimeline, "aria-describedby={props.nextChapterBlockedReason ? 'creator-next-chapter-blocker' : undefined}", 'Disabled next-chapter action must explain its quality blocker')
for (const retiredRouteComposition of [
  "from './CreatorEditorGuidance'",
  "from './CreatorEditorManuscriptStage'",
  "from './CreatorEditorRails'",
  "from '@/components/creator/workspace/CreatorWorkspaceShell'",
  "from '@/components/creator/workspace/CreatorImpactPanels'",
  "from '@/components/creator/workspace/CreatorProgressPanels'",
  "from '@/components/creator/workspace/CreatorInlineReviewPanels'",
  "from '@/components/creator/workspace/CreatorDraftGuidancePanels'",
  "from '@/components/creator/workspace/CreatorPlanningPanels'",
]) {
  assertNotIncludes(editorRoute, retiredRouteComposition, `Canonical conversation route must not restore legacy multi-rail composition ${retiredRouteComposition}`)
}
for (const conversationalMarker of [
  'export function CreatorConversationWorkspace',
  '<CreatorConversationTimeline',
  '<CreatorRecallRail',
  'data-slot="creator-conversation-input"',
  'aria-label="给创作伙伴的输入"',
  '每轮只确认一件事',
  'export function CreatorConversationTimeline',
  '这轮只确认一件事',
  '尚未写入正文',
  '不提供综合文学分',
  '<AlertDialog>',
  'export function CreatorRecallRail',
  'creatorRecallGroupLabels',
  'candidate.whyNow',
  'candidate.locator.label',
  '选择已应用',
  'onApply(nextIds)',
  'manualRecallItems',
  'includedReason: `manual_recall:${item.group}`',
  'runConversationSettingCapture(',
  'recognizeCreatorConversationReviewCommand(',
  'void decision.actions.reviewDraft(reviewCommand.focusDimensions)',
  'submittedMessages={submittedMessages}',
]) {
  assertIncludes(conversationalEditorContractSurface, conversationalMarker, `Conversational editor contract ${conversationalMarker}`)
}
for (const forbiddenDependency of ['react', '@/components/', 'window.', 'localStorage', 'fetch(', 'supabase']) {
  assertNotIncludes(conversationReviewService, forbiddenDependency, `Conversation review routing must stay pure of ${forbiddenDependency}`)
}
for (const reviewWorkflowMarker of [
  'focusDimensions: LiteraryDimension[]',
  'const DIMENSION_SIGNALS',
  "['continuity', /(因果|连续性|前后矛盾|衔接)/]",
  'focusDimensions: DIMENSION_SIGNALS',
  "props.referenceMode ? '本机规则检查' : '独立审阅'",
]) {
  assertIncludes(conversationalEditorContractSurface, reviewWorkflowMarker, `Conversation review workflow ${reviewWorkflowMarker}`)
}
assertNotIncludes(conversationWorkspace, '<Card', 'Focused conversation workspace must not restore a dashboard card wall')
assertIncludes(
  conversationWorkspace,
  "if (!props.intent || props.intent.status === 'draft')",
  'A reopened draft intent must route the next author message back through intent proposal instead of ignoring the correction',
)
assertNotIncludes(conversationTimeline, 'score', 'Conversation timeline must not expose a composite literary score')
assertIncludes(editorStartupEffectService, "from './creatorEditorRouteController'", 'Creator editor startup effect service must consume extracted route controller helpers')
for (const routeCommandControllerImportResidue of [
  "from './creatorEditorAssistantController'",
  "from './creatorEditorCommandController'",
  "from './creatorEditorCommandEventService'",
  "from './creatorEditorCommandPatchController'",
  "from './creatorEditorCandidateController'",
  "from './creatorEditorCandidatePatchController'",
  "from './creatorEditorUserActionController'",
]) {
  assertNotIncludes(editorRoute, routeCommandControllerImportResidue, `Creator editor route must enter command/candidate/user-action helpers through creatorEditorCommandFlowService instead of ${routeCommandControllerImportResidue}`)
}
assertIncludes(editorRoute, "from './creatorEditorReactPatchApplier'", 'Creator editor route must consume extracted React patch applier')
assertIncludes(editorRoute, "from './creatorEditorRouteController'", 'Creator editor route must consume the route-query controller')
assertIncludes(editorRoute, 'readCreatorEditorRouteQuery(location.search)', 'Creator editor route must delegate route-query parsing')
assertIncludes(editorController, 'export function readCreatorEditorRouteQuery', 'Creator editor route controller owns route-query parsing')
for (const routeQueryResidue of [
  'new URLSearchParams(',
  "searchParams.get('request')",
  "searchParams.get('draft')",
  "searchParams.get('work')",
  "searchParams.get('branch')",
]) {
  assertNotIncludes(editorRoute, routeQueryResidue, `Creator editor route must not parse query seeds directly: ${routeQueryResidue}`)
}
assertIncludes(editorRoute, "from './creatorEditorAgentExecutionService'", 'Creator editor route must consume Agent-owned draft execution service')
assertNotIncludes(editorRoute, "from './creatorEditorDraftActionFlowService'", 'Creator editor route must enter save/publish through creatorEditorAgentExecutionService')
assertNotIncludes(editorRoute, "from './creatorEditorDraftActionService'", 'Creator editor route must enter manual save through creatorEditorAgentExecutionService')
assertNotIncludes(editorRoute, "from './creatorEditorDraftActionResetService'", 'Creator editor route must not schedule draft-action resets directly')
assertNotIncludes(editorRoute, "from './creatorEditorPublishCheckService'", 'Creator editor route must enter publish check through creatorEditorAgentExecutionService')
assertNotIncludes(editorRoute, "from './creatorEditorSettingAssetService'", 'Creator editor route must enter setting capture through creatorEditorSettingAssetSubmitFlowService')
assertNotIncludes(editorRoute, "from './creatorEditorSettingAssetPatchController'", 'Creator editor route must enter setting capture patching through creatorEditorSettingAssetSubmitFlowService')
assertNotIncludes(editorRoute, "from './creatorEditorActionInputController'", 'Creator editor route must not import action input construction directly')
assertIncludes(editorRoute, "from './creatorEditorStartupEffectService'", 'Creator editor route must consume extracted startup effect service')
assertIncludes(editorRoute, "from './creatorEditorStartupDataPatchController'", 'Creator editor route must consume extracted startup data patch controller')
assertIncludes(editorRoute, "from './creatorEditorStartupLoadService'", 'Creator editor route must consume extracted startup load service')
assertIncludes(editorRoute, "from './creatorEditorSelectionController'", 'Creator editor route must consume extracted selection controller helpers')
assertIncludes(editorRoute, "from './creatorEditorViewModels'", 'Creator editor route must consume extracted editor view-model builders')
assertIncludes(editorRails, "import type { CreativeReminder } from '@/local-db/schema'", 'Editor rails consume the neutral local CreativeReminder contract')
assertNotIncludes(editorRails, 'type PmfCreativeReminder', 'Editor rails must not consume CreativeReminder through the cloud facade')
for (const extractedComponent of [
  'function SocraticQuestionCard',
  'function GuidedComposerCoach',
  'function AuthorJudgmentHub',
]) {
  assertNotIncludes(editorRoute, extractedComponent, `Creator editor route must not re-own extracted component ${extractedComponent}`)
  assertIncludes(editorGuidance, `export ${extractedComponent}`, `Creator editor guidance module must own ${extractedComponent}`)
}
assertNotIncludes(editorRoute, 'function draftTitleFromRequest', 'Creator editor route must not re-own draft title construction')
assertIncludes(editorViewModels, 'export function draftTitleFromRequest', 'Core editor view-model module must own draft title construction')
for (const socraticBuilder of [
  'function buildSocraticQuestion',
  'function writingGuideStepLabel',
  'function settingAssetKindLabel',
  'function planStageAssetKinds',
  'function defaultSettingKindForStage',
  'function settingAssetSummary',
  'function buildSocraticPlanStages',
  'function chapterPlannerGoalBriefs',
  'function chapterPlannerDirections',
]) {
  assertNotIncludes(editorRoute, socraticBuilder, `Creator editor route must not re-own Socratic builder ${socraticBuilder}`)
  assertIncludes(editorSocraticViewModels, `export ${socraticBuilder}`, `Socratic editor view-model owner must own ${socraticBuilder}`)
  assertNotIncludes(editorViewModels, `export ${socraticBuilder}`, `Core editor view-model module must not own ${socraticBuilder}`)
}
for (const plannerDataMarker of [
  'export interface ChapterPlannerGoalBriefInput',
  'settingAssets: PmfLocalSettingAsset[]',
  'function plannerAssetTitles(',
  'function assetHasTag(',
  "value: characterTitles || '尚未保存本章人物'",
  "value: foreshadowingTitles || '尚未标记本章伏笔'",
  "value: heldBackTitles || '尚未标记保留信息'",
]) {
  assertIncludes(editorSocraticViewModels, plannerDataMarker, `Chapter planner derives truthful local context ${plannerDataMarker}`)
}
for (const retiredPlannerFixture of [
  '沈星澜、守塔人、幸存者',
  '主角、阻拦者、见证者',
  '灯塔、支线、选择代价',
  '真正原因、最终身份、支线结局',
  '先回应请求',
]) {
  assertNotIncludes(editorSocraticViewModels, retiredPlannerFixture, `Chapter planner must not ship fixture copy ${retiredPlannerFixture}`)
}
assertIncludes(editorManuscript, 'settingAssets: PmfLocalSettingAsset[]', 'Manuscript stage receives current local setting assets')
assertIncludes(
  editorManuscript,
  'chapterPlannerGoalBriefs({ linkedRequest: selectedRequest, settingAssets })',
  'Chapter planner consumes the current request and local setting assets',
)
assertIncludes(editorRoute, 'settingAssets={currentSettingAssets}', 'Editor route passes current-work setting assets to the conversation timeline')
for (const assistantBuilder of [
  'function buildEditorCompletion',
  'function buildEditorAssistCandidate',
  'function workspaceAssistCandidate',
  'function workspaceAssistFocus',
  'function workspaceAssistCurrentFocus',
  'function workspaceAssistProgress',
  'function ghostCompletionTitle',
  'function ghostCompletionMeta',
  'function writingCommandItems',
]) {
  assertNotIncludes(editorRoute, assistantBuilder, `Creator editor route must not re-own assistant builder ${assistantBuilder}`)
  assertIncludes(editorAssistantViewModels, `export ${assistantBuilder}`, `Assistant editor view-model owner must own ${assistantBuilder}`)
  assertNotIncludes(editorViewModels, `export ${assistantBuilder}`, `Core editor view-model module must not own ${assistantBuilder}`)
}
for (const forbiddenViewModelDependency of [
  "from 'react'",
  'lucide-react',
  'window.',
  'document.',
  'localStorage',
  'indexedDB',
  'fetch(',
  '@/lib/pmfSupabase',
]) {
  assertNotIncludes(editorSocraticViewModels, forbiddenViewModelDependency, 'Socratic editor view-model owner must stay pure')
  assertNotIncludes(editorAssistantViewModels, forbiddenViewModelDependency, 'Assistant editor view-model owner must stay pure')
}
for (const coreViewModelResidue of [
  'SocraticQuestion',
  'EditorAssistAction',
  'WritingCommandId',
  'ReviewDockTab',
  'EditorAssistCandidate',
  'lucide-react',
  'ReactNode',
]) {
  assertNotIncludes(editorViewModels, coreViewModelResidue, `Core editor view-model module must not regain ${coreViewModelResidue}`)
}
assertIncludes(editorWorkspaceViewModelController, "from './creatorEditorSocraticViewModels'", 'Workspace view-model controller must consume the Socratic owner directly')
assertIncludes(editorWorkspaceViewModelController, "from './creatorEditorAssistantViewModels'", 'Workspace view-model controller must consume the assistant owner directly')
assertIncludes(editorGuidance, "from './creatorEditorSocraticViewModels'", 'Editor guidance must consume the Socratic owner directly')
assertIncludes(editorManuscript, "from './creatorEditorAssistantViewModels'", 'Editor manuscript must consume the assistant owner directly')
assertIncludes(editorManuscript, "from './creatorEditorSocraticViewModels'", 'Editor manuscript must consume the Socratic owner directly')
assertIncludes(editorRails, "from './creatorEditorAssistantViewModels'", 'Editor rails must consume the assistant owner directly')
assertIncludes(editorCommandPatchController, "from './creatorEditorAssistantViewModels'", 'Command patch controller must consume the assistant owner directly')
for (const reviewImpactBuilder of [
  'function buildStateDiffViewModel',
  'function buildBranchSandboxViewModel',
  'function buildFlightRecorderViewModel',
]) {
  assertNotIncludes(editorRoute, reviewImpactBuilder, `Creator editor route must not re-own extracted builder ${reviewImpactBuilder}`)
  assertIncludes(editorReviewImpactViewModels, `export ${reviewImpactBuilder}`, `Creator editor review impact view-model owner must own ${reviewImpactBuilder}`)
  assertNotIncludes(editorViewModels, `export ${reviewImpactBuilder}`, `Legacy editor view-model aggregator must not own ${reviewImpactBuilder}`)
}
assertIncludes(
  editorWorkspaceViewModelController,
  "from './creatorEditorReviewImpactViewModels'",
  'Creator workspace view-model controller must consume the extracted review impact owner',
)
for (const forbiddenReviewImpactDependency of [
  "from 'react'",
  'window.',
  'document.',
  'localStorage',
  'indexedDB',
  'fetch(',
  '@/lib/pmfSupabase',
]) {
  assertNotIncludes(editorReviewImpactViewModels, forbiddenReviewImpactDependency, `Creator editor review impact view models must stay free of ${forbiddenReviewImpactDependency}`)
}
assertIncludes(editorStoryMapViewModels, 'export function storyMapTokens', 'Creator editor story-map owner exports token extractor')
assertIncludes(editorStoryMapViewModels, 'export function buildStoryMapItems', 'Creator editor story-map owner exports story-map builder')
assertIncludes(
  editorWorkspaceViewModelController,
  "from './creatorEditorStoryMapViewModels'",
  'Creator workspace view-model controller must consume the extracted story-map owner',
)
assertNotIncludes(editorViewModels, 'export function storyMapTokens', 'Legacy editor view-model aggregator must not own story-map token extraction')
assertNotIncludes(editorViewModels, 'export function buildStoryMapItems', 'Legacy editor view-model aggregator must not own story-map construction')
assertIncludes(editorInlineReviewViewModels, 'export function buildInlineReviewItems', 'Creator editor inline-review owner exports inline review builder')
assertIncludes(
  editorManuscript,
  "from './creatorEditorInlineReviewViewModels'",
  'Creator editor manuscript stage must consume the extracted inline-review owner',
)
assertNotIncludes(editorViewModels, 'export function buildInlineReviewItems', 'Legacy editor view-model aggregator must not own inline review construction')
for (const forbiddenExtractedViewModelDependency of [
  "from 'react'",
  'window.',
  'document.',
  'localStorage',
  'indexedDB',
  'fetch(',
  '@/lib/pmfSupabase',
]) {
  assertNotIncludes(editorStoryMapViewModels, forbiddenExtractedViewModelDependency, `Creator editor story-map view models must stay free of ${forbiddenExtractedViewModelDependency}`)
  assertNotIncludes(editorInlineReviewViewModels, forbiddenExtractedViewModelDependency, `Creator editor inline-review view models must stay free of ${forbiddenExtractedViewModelDependency}`)
}
assertNotIncludes(editorInlineReviewViewModels, 'lucide-react', 'Creator editor inline-review view models must stay icon-free')
assertNotIncludes(editorViewModels, 'lucide-react', 'Legacy editor view-model aggregator must no longer own JSX icon data')
for (const sessionBuilder of [
  'function buildEditorSessionGroups',
  'function buildEditorPrivateDraftItems',
]) {
  assertNotIncludes(editorRoute, sessionBuilder, `Creator editor route must not re-own extracted builder ${sessionBuilder}`)
  assertIncludes(editorSessionViewModels, `export ${sessionBuilder}`, `Creator editor session view-model module must own ${sessionBuilder}`)
  assertNotIncludes(editorViewModels, `export ${sessionBuilder}`, `Legacy editor view-model aggregator must not own ${sessionBuilder}`)
}
assertIncludes(editorViewModels, "import { compactExcerpt } from './creatorEditorSessionViewModels'", 'Core editor view models consume only the compact excerpt helper from the session owner')
assertNotIncludes(editorViewModels, 'buildEditorSessionGroups', 'Core editor view models must not re-export the session group builder')
assertNotIncludes(editorViewModels, 'buildEditorPrivateDraftItems', 'Core editor view models must not re-export the private-draft builder')
for (const forbiddenSessionViewModelDependency of [
  "from 'react'",
  'window.',
  'document.',
  'localStorage',
  'indexedDB',
  'fetch(',
  '@/lib/pmfSupabase',
]) {
  assertNotIncludes(editorSessionViewModels, forbiddenSessionViewModelDependency, `Creator editor session view models must stay pure of ${forbiddenSessionViewModelDependency}`)
}
assertIncludes(
  editorWorkspaceViewModelController,
  "from './creatorEditorQualityViewModels'",
  'Creator workspace view-model controller must consume the extracted quality view-model owner',
)
assertIncludes(editorQualityViewModels, 'export function buildQualityIssues', 'Creator editor quality view-model owner exports quality issue builder')
assertNotIncludes(editorViewModels, "from './creatorEditorQualityViewModels'", 'Core editor view models must not aggregate the quality owner')
assertNotIncludes(editorViewModels, 'buildQualityIssues', 'Core editor view models must not own or re-export the quality issue builder')
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
  assertNotIncludes(editorQualityViewModels, forbiddenQualityViewModelDependency, `Creator editor quality view models must stay pure of ${forbiddenQualityViewModelDependency}`)
}
for (const assistantControllerMarker of [
  'export function resolveWritingCommand',
  'export function resolveEditorAssistAction',
  'export function resolveEditorShortcut',
  'export function resolveReviewFix',
  'export interface CreatorEditorShortcutInput',
]) {
  assertIncludes(editorAssistantController, assistantControllerMarker, `Creator editor assistant controller ${assistantControllerMarker}`)
}
for (const selectionControllerMarker of [
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
]) {
  assertIncludes(editorSelectionController, selectionControllerMarker, `Creator editor selection controller ${selectionControllerMarker}`)
}
for (const commandControllerMarker of [
  'export interface CreatorEditorCommandPatch',
  'export function resolveBranchExperimentDecision',
  'export function resolveStoryFlowStage',
]) {
  assertIncludes(editorCommandController, commandControllerMarker, `Creator editor command controller ${commandControllerMarker}`)
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
  assertNotIncludes(editorCommandController, commandControllerResidue, `creatorEditorCommandController must delegate assistant/selection responsibilities instead of ${commandControllerResidue}`)
}
for (const routeCommandSemanticResidue of [
  '本章目标已按',
  '继续写正文；按 Tab 可以接受下一句建议。',
  '正文会围绕这个方向继续。',
  'assistAction: action',
  'notice: noticeOverride',
]) {
  assertNotIncludes(editorRoute, routeCommandSemanticResidue, `Creator editor route must delegate command semantics to creatorEditorCommandController instead of ${routeCommandSemanticResidue}`)
}
for (const commandPatchControllerMarker of [
  'export interface CreatorEditorCommandStatePatch',
  'export function resolveEditorCommandStatePatch',
  'export function resolveEditorCommandCandidateStatePatch',
  'resolution: CreatorEditorCandidateApplyResolution | null',
  'buildEditorAssistCandidate({',
  'noticeForAssistAction(patch.assistAction)',
  'primaryLabel: primaryLabel || candidate.primaryLabel',
]) {
  assertIncludes(editorCommandPatchController, commandPatchControllerMarker, `Creator editor command patch controller ${commandPatchControllerMarker}`)
}
for (const candidateControllerMarker of [
  'export function resolveCommandCandidateApply',
  'export function resolveEditorAssistCandidateAdoption',
  'export function resolveEditorAssistCandidateBranch',
]) {
  assertIncludes(editorCandidateController, candidateControllerMarker, `Creator editor candidate controller ${candidateControllerMarker}`)
}
for (const candidatePatchControllerMarker of [
  'export interface CreatorEditorCandidateStatePatch',
  'export function resolveEditorCandidateAdoptionStatePatch',
  'export function resolveEditorCandidateBranchStatePatch',
  'clearEditorAssistCandidate: resolution.clearCandidate ? true : undefined',
  'commandPatch,',
]) {
  assertIncludes(editorCandidatePatchController, candidatePatchControllerMarker, `Creator editor candidate patch controller ${candidatePatchControllerMarker}`)
}
for (const startupPatchControllerMarker of [
  'export interface CreatorEditorStartupStatePatch',
  'export function resolveEditorStartupStatePatch',
  'selectedWorkId: bootstrap.defaultDraft?.workId || currentSelectedWorkId || bootstrap.nextWorkId',
  'currentTitle === \'新章节\'',
  'currentBranchTitle === \'读者 IF 支线\' || currentBranchTitle === \'主线\'',
]) {
  assertIncludes(editorStartupPatchController, startupPatchControllerMarker, `Creator editor startup patch controller ${startupPatchControllerMarker}`)
}
for (const userActionControllerMarker of [
  'export interface CreatorEditorUserActionStatePatch',
  'export function resolveAssistantSuggestionAcceptance',
  'export function resolveEditorAssistDismissal',
  'export function resolveGuideStepSelection',
  'export function resolveKeepAsIfBranchAction',
  'writingGuideStepLabel(nextStep)',
  "guideStep: 'draft'",
  "publishMode: 'if'",
]) {
  assertIncludes(editorUserActionController, userActionControllerMarker, `Creator editor user action controller ${userActionControllerMarker}`)
}
for (const routeStartupDecisionResidue of [
  'bootstrap.draftRestore',
  'bootstrap.routeBranchRestore',
  'bootstrap.requestSeed',
  'previous === \'新章节\'',
  'previous === \'读者 IF 支线\'',
]) {
  assertNotIncludes(editorRoute, routeStartupDecisionResidue, `Creator editor route must map startup state through creatorEditorStartupPatchController instead of ${routeStartupDecisionResidue}`)
}
for (const draftControllerMarker of [
  'export function resolveEditorDraftSaveBlocker',
  'export function buildEditorLocalDraft',
  'export function resolveEditorDraftOpen',
  'export function resolveFreshEditorDraft',
]) {
  assertIncludes(editorDraftController, draftControllerMarker, `Creator editor draft controller ${draftControllerMarker}`)
}
for (const draftActionControllerMarker of [
  'export const editorDraftActionResetDelayMs',
  'export type EditorDraftSaveResultPatch',
  'export function resolveEditorDraftSaveResultPatch',
  'activeDraftRef: result.draft.localDraftRef',
  'notice: result.notice',
]) {
  assertIncludes(editorDraftActionController, draftActionControllerMarker, `Creator editor draft action controller ${draftActionControllerMarker}`)
}
for (const draftActionServiceMarker of [
  'export type EditorDraftActionKind',
  'export async function runEditorDraftAction',
  'runEditorDraftSave(saveInput)',
  'resolveEditorDraftSaveStatePatch(resolveEditorDraftSaveResultPatch(result))',
  'statePatch.ok ? statePatch.draft || null : null',
]) {
  assertIncludes(editorDraftActionService, draftActionServiceMarker, `Creator editor draft action service ${draftActionServiceMarker}`)
}
for (const draftActionFlowServiceMarker of [
  'export interface EditorDraftActionFlowResetPort',
  'export async function runEditorManualDraftActionFlow',
  'export async function runEditorPublishCheckFlow',
  'runEditorDraftAction(input)',
  'runEditorPublishCheckAction(input)',
  'resetPort.scheduleReset(resetDraftAction)',
]) {
  assertIncludes(editorDraftActionFlowService, draftActionFlowServiceMarker, `Creator editor draft action flow service ${draftActionFlowServiceMarker}`)
}
for (const draftSubmitFlowServiceMarker of [
  'export interface EditorDraftSubmitContext',
  'export async function runEditorManualDraftSubmitFlow',
  'export async function runEditorPublishCheckSubmitFlow',
  'buildEditorDraftActionInput({',
  'buildEditorPublishCheckInput(context)',
  'runEditorManualDraftActionFlow({',
  'runEditorPublishCheckFlow({',
]) {
  assertIncludes(editorDraftSubmitFlowService, draftSubmitFlowServiceMarker, `Creator editor draft submit flow service ${draftSubmitFlowServiceMarker}`)
}
for (const draftActionResetServiceMarker of [
  'export interface EditorDraftActionResetPort',
  'export function scheduleEditorDraftActionReset',
  'editorDraftActionResetDelayMs',
  'port.scheduleReset(reset, editorDraftActionResetDelayMs)',
]) {
  assertIncludes(editorDraftActionResetService, draftActionResetServiceMarker, `Creator editor draft action reset service ${draftActionResetServiceMarker}`)
}
for (const draftPatchControllerMarker of [
  'export interface CreatorEditorDraftStatePatch',
  'export function resolveEditorDraftSaveStatePatch',
  'export function resolveEditorDraftOpenStatePatch',
  'export function resolveEditorFreshDraftStatePatch',
  'activeDraftRef: patch.activeDraftRef',
  'clearEditorAssistCandidate: patch.clearEditorAssistCandidate',
]) {
  assertIncludes(editorDraftPatchController, draftPatchControllerMarker, `Creator editor draft patch controller ${draftPatchControllerMarker}`)
}
for (const routeDraftPatchResidue of [
  'setActiveDraftRef(patch.activeDraftRef)',
  'setDrafts(patch.drafts)',
  'setTitle(patch.title)',
  'setContent(patch.content)',
  'setSelectedWorkId(patch.selectedWorkId)',
  'setPublishMode(patch.publishMode)',
  'setSelectedIfBranchId(patch.selectedIfBranchId)',
]) {
  assertNotIncludes(editorRoute, routeDraftPatchResidue, `Creator editor route must apply draft state through creatorEditorDraftPatchController instead of ${routeDraftPatchResidue}`)
}
for (const routeStartupDataPatchResidue of [
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
  assertNotIncludes(editorRoute, routeStartupDataPatchResidue, `Creator editor route must apply startup data through creatorEditorStartupDataPatchController instead of ${routeStartupDataPatchResidue}`)
}
for (const routeSelectionResidue of [
  'requests.find(item => item.status ===',
  'creativeReminders.find(reminder => reminder.sourceSignalIds.includes(selectedRequest.id))',
]) {
  assertNotIncludes(editorRoute, routeSelectionResidue, `Creator editor route must resolve current request/reminder through creatorEditorSelectionController instead of ${routeSelectionResidue}`)
}
for (const draftPersistenceMarker of [
  'export function readEditorDrafts',
  'export async function saveEditorDraft',
  "from '@/local-db/creatorLocalDraftRepository'",
  "from '@/local-db/creatorLocalWritingRepository'",
  'createLocalDraftRef()',
  'upsertLocalDraft(draft)',
  'upsertLocalCreativeReminder({',
  'readLocalCreativeReminders()',
  'inspectLocalDraftBodyRegression(activeDraftRef, content)',
  "regression.status === 'historical_regression'",
  'throw new EditorDraftHistoricalRegressionError(regression.matchedVersion)',
]) {
  assertIncludes(editorDraftPersistence, draftPersistenceMarker, `Creator editor draft persistence ${draftPersistenceMarker}`)
}
assertNotIncludes(editorDraftPersistence, "@/lib/pmfSupabase", 'Creator editor draft persistence must use local draft/writing repositories instead of the Supabase facade')
for (const draftSaveServiceMarker of [
  'export interface EditorDraftPersistencePort',
  'export async function runEditorDraftSave',
  'resolveEditorDraftSaveBlocker(readiness)',
  'persistence.save({',
  'error instanceof EditorDraftHistoricalRegressionError',
  '为避免覆盖新修改，本次未保存',
  'nowIso: new Date().toISOString()',
  "notice: '已保存私密草稿。'",
]) {
  assertIncludes(editorDraftSaveService, draftSaveServiceMarker, `Creator editor draft save service ${draftSaveServiceMarker}`)
}
for (const draftLoadServiceMarker of [
  'export interface EditorDraftLoadPersistencePort',
  'export function runEditorDraftLoad',
  'readAll: readEditorDrafts',
  'persistence.readAll()',
]) {
  assertIncludes(editorDraftLoadService, draftLoadServiceMarker, `Creator editor draft load service ${draftLoadServiceMarker}`)
}
for (const reminderServiceMarker of [
  'export interface EditorReminderPersistencePort',
  'export function runEditorReminderLoad',
  'export function runEditorReminderBootstrap',
  "from '@/local-db/creatorLocalWritingRepository'",
  'readAll: readLocalCreativeReminders',
  'upsert: upsertLocalCreativeReminder',
  'persistence.upsert({',
  'persistence.readAll()',
]) {
  assertIncludes(editorReminderService, reminderServiceMarker, `Creator editor reminder service ${reminderServiceMarker}`)
}
assertNotIncludes(editorReminderService, "@/lib/pmfSupabase", 'Creator editor reminder service must use the local writing repository instead of the Supabase facade')
for (const publishHandoffMarker of [
  'export function resolveEditorPublishHandoff',
  "kind: 'publish-bundle-draft-handoff'",
  'createPublishBundleDraftRecord(draft, nowIso)',
  'publishBundleDraftTargetPathForLocalDraftRef(draft.localDraftRef)',
]) {
  assertIncludes(editorPublishHandoffController, publishHandoffMarker, `Creator editor publish handoff ${publishHandoffMarker}`)
}
assertNotIncludes(editorPublishHandoffController, '/creator/publish?draft=', 'Creator editor publish handoff controller must not create legacy draft query links')
for (const publishHandoffServiceMarker of [
  'export interface EditorPublishHandoffPersistencePort',
  'export function prepareEditorPublishHandoff',
  "from '@/local-db/creatorLocalPublishRepository'",
  'saveBundleDraft: upsertLocalPublishBundle',
  'persistence.saveBundleDraft(handoff.bundleDraft)',
]) {
  assertIncludes(editorPublishHandoffService, publishHandoffServiceMarker, `Creator editor publish handoff service ${publishHandoffServiceMarker}`)
}
for (const publishCheckServiceMarker of [
  'export type RunEditorPublishCheckInput',
  'export interface RunEditorPublishCheckResult',
  'export async function runEditorPublishCheckAction',
  "action: 'publish'",
  'prepareEditorPublishHandoff(result.draft',
  'handoff: null',
]) {
  assertIncludes(editorPublishCheckService, publishCheckServiceMarker, `Creator editor publish check service ${publishCheckServiceMarker}`)
}
for (const publishBundleDraftMarker of [
  'publishBundleDraftQueryKey',
  'legacyPublishDraftQueryKey',
  'createPublishBundleDraftId',
  'createPublishBundleDraftRecord',
  'resolvePublishBundleDraftRouteRef',
  'localDraftRefFromPublishBundleDraftId(bundleDraftId)',
]) {
  assertIncludes(publishBundleDraftHandoff, publishBundleDraftMarker, `Creator editor publish bundle draft handoff ${publishBundleDraftMarker}`)
}
for (const settingAssetControllerMarker of [
  'export function resolveEditorSettingAssetDraft',
  'defaultSettingKindForStage(guideStep)',
  'compactExcerpt(linkedRequestText,',
  'chapterDirectionLabel(chapterDirection)',
]) {
  assertIncludes(editorSettingAssetController, settingAssetControllerMarker, `Creator editor setting asset controller ${settingAssetControllerMarker}`)
}
for (const settingAssetServiceMarker of [
  'export interface EditorSettingAssetLoadPersistencePort',
  'export interface EditorSettingAssetPersistencePort',
  'export function runEditorSettingAssetLoad',
  'export function runEditorSettingAssetCapture',
  "from '@/local-db/creatorLocalSettingAssetRepository'",
  'readAll: readLocalSettingAssets',
  'persistence.readAll()',
  'resolveEditorSettingAssetDraft(input)',
  'persistence.save(draft.assetInput)',
  'settingAssets: persistence.readAll()',
]) {
  assertIncludes(editorSettingAssetService, settingAssetServiceMarker, `Creator editor setting asset service ${settingAssetServiceMarker}`)
}
assertNotIncludes(editorSettingAssetService, "@/lib/pmfSupabase", 'Creator editor setting asset service must use the local setting asset repository instead of the Supabase facade')
for (const settingAssetPatchControllerMarker of [
  'export interface CreatorEditorSettingAssetStatePatch',
  'export function resolveEditorSettingAssetStatePatch',
  'settingAssets: result.settingAssets',
  'guideStep: result.nextGuideStep',
]) {
  assertIncludes(editorSettingAssetPatchController, settingAssetPatchControllerMarker, `Creator editor setting asset patch controller ${settingAssetPatchControllerMarker}`)
}
for (const settingAssetSubmitFlowMarker of [
  'export interface EditorSettingAssetSubmitContext',
  'export type EditorSettingAssetSubmitStatePatch',
  'export function runEditorSettingAssetSubmitFlow',
  'runEditorSettingAssetCapture(buildEditorSettingCaptureInput(context))',
  'return resolveEditorSettingAssetStatePatch(result)',
]) {
  assertIncludes(editorSettingAssetSubmitFlowService, settingAssetSubmitFlowMarker, `Creator editor setting asset submit flow ${settingAssetSubmitFlowMarker}`)
}
for (const startupLoadServiceMarker of [
  "import type { CreativeReminder } from '@/local-db/schema'",
  'export interface EditorStartupLoadApiPort',
  'export function readEditorStartupLocalSnapshot',
  'export async function runEditorStartupLoad',
  'api.listRequests()',
  'api.listWorks()',
  'api.listBranches()',
  'api.listChapters()',
  'api.getAuthorization()',
  'readEditorStartupLocalSnapshot()',
]) {
  assertIncludes(editorStartupLoadService, startupLoadServiceMarker, `Creator editor startup load service ${startupLoadServiceMarker}`)
}
assertNotIncludes(editorStartupLoadService, 'type PmfCreativeReminder', 'Creator editor startup load must not consume a local reminder type through the cloud facade')
for (const startupEffectServiceMarker of [
  'export const editorStartupEffectDelayMs',
  'export interface EditorStartupEffectTimerPort',
  'export function scheduleEditorStartupEffect',
  'export async function runEditorStartupEffect',
  'port.scheduleStartup(startup, editorStartupEffectDelayMs)',
  'const startupLoad = await loadStartup()',
  'resolveEditorRouteBootstrap({',
  'runEditorReminderBootstrap({',
  'resolveEditorStartupStatePatch({',
]) {
  assertIncludes(editorStartupEffectService, startupEffectServiceMarker, `Creator editor startup effect service ${startupEffectServiceMarker}`)
}
for (const startupDataPatchControllerMarker of [
  'export interface CreatorEditorStartupDataPatch',
  'export function resolveEditorStartupDataPatch',
  'drafts: result.startupLoad.drafts',
  'settingAssets: result.startupLoad.settingAssets',
  'creativeReminders: result.creativeReminders',
]) {
  assertIncludes(editorStartupDataPatchController, startupDataPatchControllerMarker, `Creator editor startup data patch controller ${startupDataPatchControllerMarker}`)
}
for (const reactPatchApplierMarker of [
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
  'setters.setSelectedWorkId(statePatch.selectedWorkId)',
  'setters.setRequests(dataPatch.requests)',
  'setters.setCreativeReminders(dataPatch.creativeReminders)',
  'if (statePatch.commandPatch) setters.applyCommandPatch(statePatch.commandPatch)',
  'if (statePatch.clearEditorAssistCandidate) setters.setEditorAssistCandidate(null)',
  'if (statePatch.clearActiveWritingCommand) setters.setActiveWritingCommand(null)',
  'if (statePatch.editorAssistCandidate !== undefined) setters.setEditorAssistCandidate(statePatch.editorAssistCandidate)',
  'if (statePatch.publishMode) setters.setPublishMode(statePatch.publishMode)',
  'if (statePatch.settingAssets) setters.setSettingAssets(statePatch.settingAssets)',
]) {
  assertIncludes(editorReactPatchApplier, reactPatchApplierMarker, `Creator editor React patch applier ${reactPatchApplierMarker}`)
}
for (const commandEventServiceMarker of [
  'export const editorCommandCandidateApplyEventName',
  'export interface EditorCommandEventTarget',
  'export function bindEditorCommandCandidateApply',
  'export function bindEditorShortcut',
  "from './creatorEditorAssistantController'",
  'resolveCommandCandidateApply(detail)',
  'resolveEditorCommandCandidateStatePatch({',
  'resolveEditorShortcut({',
  'resolveEditorCommandStatePatch({',
  "target.addEventListener('keydown', handleEditorShortcut, { capture: true })",
]) {
  assertIncludes(editorCommandEventService, commandEventServiceMarker, `Creator editor command event service ${commandEventServiceMarker}`)
}
for (const commandFlowServiceMarker of [
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
]) {
  assertIncludes(editorCommandFlowService, commandFlowServiceMarker, `Creator editor command flow service ${commandFlowServiceMarker}`)
}
assertIncludes(editorRoute, 'runEditorPublishCheckThroughAgent({', 'Creator editor route must enter publish check through Agent execution service')
assertIncludes(editorRoute, 'navigate(handoff.targetPath)', 'Creator editor route must navigate through publish handoff target')
assertNotIncludes(editorRoute, '`/creator/publish?draft=${encodeURIComponent', 'Creator editor route must not build publish handoff URLs directly')
assertNotIncludes(editorRoute, 'prepareEditorPublishHandoff(', 'Creator editor route must not prepare publish handoff directly')
assertNotIncludes(editorRoute, "saveDraft('publish')", 'Creator editor route must not chain publish-check through the manual save wrapper')
assertNotIncludes(editorRoute, 'upsertLocalPublishBundleRecord', 'Creator editor route must not persist publish bundle drafts directly')
if (!canonicalConversationalEditor) {
  for (const routeCommandConsumptionMarker of [
    'const editorCommandFlowContext = useMemo<EditorCommandFlowContext>',
    'resolveEditorCommandPatchFlow({',
    'bindEditorCommandCandidateApplyFlow({',
    'bindEditorShortcutFlow({',
    'applyEditorCommandStatePatchToReact',
    'applyEditorCandidateStatePatchToReact',
    'applyEditorDraftStatePatchToReact',
    'applyEditorStartupStatePatchToReact',
    'applyEditorUserActionStatePatchToReact',
    'runEditorAssistCandidateAdoptionThroughAgent({',
    'resolveEditorAssistCandidateBranchFlow()',
    'resolveEditorAssistantSuggestionAcceptanceFlow({',
    'resolveEditorAssistDismissalFlow()',
    'resolveEditorGuideStepSelectionFlow(nextStep)',
    'resolveEditorKeepAsIfBranchFlow()',
    'runEditorWritingCommandThroughAgent({',
    'runEditorReviewFixFlow({',
    'runEditorBranchExperimentFlow({',
    'runEditorStoryFlowStageFlow({',
    'runEditorAssistActionFlow({',
    'runEditorChapterDirectionSelectionFlow({',
    'runEditorChapterGoalConfirmationFlow({',
    'runEditorDraftGuideContinuationFlow(editorCommandFlowContext)',
  ]) {
    assertIncludes(editorRoute, routeCommandConsumptionMarker, `Legacy Creator editor route command consumption ${routeCommandConsumptionMarker}`)
  }
}
for (const routeCommandFlowResidue of [
  'resolveWritingCommand(command)',
  'resolveReviewFix(label)',
  'resolveEditorAssistAction(action, noticeOverride)',
  'resolveBranchExperimentDecision(label, decision)',
  'resolveStoryFlowStage(stage)',
  'resolveEditorCommandStatePatch({',
  'bindEditorCommandCandidateApply({',
  'bindEditorShortcut({',
  'resolveEditorAssistCandidateAdoption(editorAssistCandidate, content)',
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
  assertNotIncludes(editorRoute, routeCommandFlowResidue, `Creator editor route must use creatorEditorCommandFlowService instead of ${routeCommandFlowResidue}`)
}
for (const routeCommandEventResidue of [
  'resolveCommandCandidateApply(detail)',
  'resolveEditorCommandCandidateStatePatch({',
  'resolveEditorShortcut({',
  "window.addEventListener('keydown'",
  "window.addEventListener('creator-command-candidate-apply'",
  "window.removeEventListener('keydown'",
  "window.removeEventListener('creator-command-candidate-apply'",
]) {
  assertNotIncludes(editorRoute, routeCommandEventResidue, `Creator editor route must delegate command event ${routeCommandEventResidue}`)
}
for (const routeCommandCandidateResidue of [
  'candidateTitle: resolution.candidateTitle',
  'assistAction: resolution.candidateAction',
  'guideStep: resolution.guideStep',
  'publishMode: resolution.publishMode',
  'reviewDockTab: resolution.reviewDockTab',
  'primaryLabel: resolution.primaryLabel',
]) {
  assertNotIncludes(editorRoute, routeCommandCandidateResidue, `Creator editor route must map command-candidate state through creatorEditorCommandPatchController instead of ${routeCommandCandidateResidue}`)
}
assertNotIncludes(editorRoute, 'function applyShortcutCommandPatch', 'Creator editor route must not keep a shortcut-only command patch branch')
assertNotIncludes(editorRoute, 'buildEditorAssistCandidate({', 'Creator editor route must not directly construct assist candidates')
assertNotIncludes(editorRoute, 'typeof resolution.title', 'Creator editor route must not directly interpret candidate adoption title patches')
assertNotIncludes(editorRoute, 'typeof resolution.content', 'Creator editor route must not directly interpret candidate adoption content patches')
assertNotIncludes(editorRoute, 'resolution.clearCandidate', 'Creator editor route must not directly interpret candidate clearing')
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
  ...(!canonicalConversationalEditor ? [
    'setSettingAssets(result.settingAssets)',
    'setGuideStep(result.nextGuideStep)',
  ] : []),
]) {
  assertNotIncludes(editorRoute, routeStatePatchResidue, `Creator editor route must apply state patches through creatorEditorReactPatchApplier instead of ${routeStatePatchResidue}`)
}
for (const commandLogicLeak of [
  "detail.candidateId === 'rewrite-tone'",
  "detail.candidateId === 'socratic-question'",
  "editorAssistCandidate.primaryLabel === '替换当前段落'",
]) {
  assertNotIncludes(editorRoute, commandLogicLeak, `Creator editor route must not re-own command/candidate decision ${commandLogicLeak}`)
}
for (const userActionResidue of [
  'setContent(previous =>',
  "setPublishMode('if')",
  "setNotice('已补入创作助手建议；可以继续改写。')",
  "setNotice('候选已收起，正文没有变化。')",
  'writingGuideStepLabel(nextStep)',
]) {
  assertNotIncludes(editorRoute, userActionResidue, `Creator editor route must delegate direct user-action semantics to creatorEditorUserActionController instead of ${userActionResidue}`)
}

assertBefore(
  workspaceFrame,
  '<main className="order-1 min-w-0 xl:order-2">',
  '<aside className="creator-editor-left-rail order-3 space-y-4 md:col-span-2 xl:order-1 xl:col-span-1">',
  'Creator workspace frame source order must put the writing surface before side records',
)

for (const shellMarker of [
  'const mainRef = useRef<HTMLElement | null>(null)',
  'useLocation()',
  'mainRef.current.scrollTop = 0',
  'mainRef.current.scrollLeft = 0',
  'ref={mainRef}',
  'creator-workbench-main',
  'aria-label="创作边界"',
  '<LocalStatusPill isLocalSurface={isLocalSurface} />',
  '<Badge variant="outline">确认后发布</Badge>',
]) {
  assertIncludes(creatorShell, shellMarker, `Creator shell route scroll reset ${shellMarker}`)
}
assertNotIncludes(
  creatorShell,
  '<Badge variant="gold">作者端</Badge>',
  'Creator shell topbar should not repeat the product surface as a status badge',
)

for (const layoutMarker of [
  'xl:grid-cols-[248px_minmax(640px,1fr)_320px]',
  'md:grid-cols-[minmax(0,1fr)_280px]',
  'creator-editor-left-rail order-3',
  'md:col-span-2',
  '<main className="order-1 min-w-0 xl:order-2">',
  'creator-editor-right-rail order-2',
  'xl:order-3',
  'creator-editor-bottom-rail order-4 md:col-span-2 xl:col-span-1 xl:col-start-2',
  'creator-editor-left-rail',
  'creator-writing-workspace',
  'creator-editor-paper',
  'creator-editor-paper-top',
  'creator-editor-prose-stack',
  'creator-editor-direction-strip',
  'creator-editor-direction-choice',
  'data-slot="creator-flow-stepper"',
  'creator-collapsible-outline',
  'data-slot="creator-session-panel"',
  'railCardClass',
  'data-slot="creator-story-map"',
  'data-slot="creator-reader-wish-panel"',
  '<CreatorSessionRail',
  '<CreatorStoryMap',
  '<CreatorReaderWishPanel',
  '<CreatorAuthorStatusPanel',
  '<CreatorDestinationPanel',
  '<CreatorBundleReadinessPanel',
  '<CreatorCanonCommitBar',
  '<CreatorPrivateDraftPanel',
  '<CreatorShortcutBar',
  '<CreatorCreativeReviewDock',
  '<CreatorStateDiffPanel',
  '<CreatorBranchSandboxPanel',
  '<CreatorFlightRecorderPanel',
  '<CreatorEditorCursorAssistBar',
  '<CreatorParagraphJudgmentPanel',
  '<CreatorInlineAssistBar',
  '<CreatorEditorReadinessStrip',
  'data-slot="creator-assistant-dock"',
  'workspaceAssistantCardClass',
  'creator-decision-queue',
  'data-slot="creator-progress-rail"',
  'creator-inline-assist-bar',
  'creator-inline-assist-action',
  'creator-review-dock',
  '创作记录',
  '故事地图',
  '读者愿望',
  '章节标题',
  '章节正文',
  'draftTitleFromRequest',
  'readerWishTypeLabel',
  '写作助手',
  '现在建议',
  '写作搭档',
  'creator-agent-focus',
  'creator-agent-focus-head',
  '章节流程',
  '章节大纲',
  '候选建议',
  'CreatorAgentComposer',
  'CreatorAgentWritingAssistantPanel',
  '对话写作',
  '对本章说',
  '按建议生成',
  '参考：',
  '写作检查',
  '写作清单',
  '已参考的信息',
  'CreatorAssistantDetailGroup',
  'creator-assistant-detail-group',
  'CollapsibleTrigger asChild',
  '决策队列',
  '写作准备度',
  'data-slot="creator-editor-readiness-strip"',
  '创作进度',
  '只入草稿',
  '输入想法，或选下面动作',
  '生成候选',
  '先让第一段正文成形',
  '续写候选',
  '正文候选',
  '建议正文',
  '采纳后影响',
  '审阅正文',
  '看建议依据',
  '保存草稿',
  '发布检查',
  '发布去向',
  'creator-destination-field',
  'creator-destination-control',
  '发布准备',
  'CreatorBundleReadinessPanel',
  'CreatorCanonCommitBar',
  'data-slot="creator-bundle-readiness-panel"',
  'data-slot="creator-bundle-readiness-list"',
  '私密草稿',
]) {
  assertIncludes(editorContractSurface, layoutMarker, `Creator editor product layout ${layoutMarker}`)
}
assertBefore(
  editorMain,
  'creator-editor-prose-stack',
  '<CreatorNextBestActionCard',
  'Creator editor must put the title/prose writing stack before next-best-action coaching',
)
assertIncludes(
  editorMain,
  '!contentReady ? (',
  'Creator editor should hide next-best-action coaching once prose is ready and publish confirmation takes over',
)
assertIncludes(
  editorContractSurface,
  'draftTitleFromRequest(',
  'Creator editor should derive request-start draft titles from story context instead of request-type labels',
)
assertIncludes(
  editorContractSurface,
  'readerWishTypeLabel(',
  'Creator editor should render reader intent labels as writing wishes instead of request queue types',
)
assertNotIncludes(
  editorPage,
  'requestTypeLabel(',
  'Creator editor must not render request queue type labels inside the writing desk',
)
assertNotIncludes(
  editorPage,
  '`${requestTypeLabel(nextRequest.request_type)} · ${new Date().toLocaleDateString()}`',
  'Creator editor must not default manuscript titles to request-type plus date labels',
)
assertBefore(
  editorMain,
  '<CreatorInlineAssistBar',
  '<div className="creator-editor-prose-stack',
  'Creator editor must place the inline next-step assist close to the manuscript before the prose stack',
)
assertBefore(
  editorMain,
  'creator-editor-prose-stack',
  '<CreatorCollapsibleOutline title="章节大纲"',
  'Creator editor must put the title/prose writing stack before the collapsible chapter outline',
)
assertBefore(
  editorMain,
  '<CreatorEditorReviewRail',
  '<Textarea',
  'Inline review rail must render before the prose textarea instead of overlaying the manuscript text',
)
assertBefore(
  editorAssistPanel,
  '建议正文',
  '当前焦点',
  'Creator editor assistant should show the generated prose candidate before process context',
)
assertBefore(
  editorAssistPanel,
  '采纳方式',
  'creator-editor-assist-impact',
  'Creator editor assistant should show adoption control before impact explanation',
)
assertBefore(
  editorAssistPanel,
  '采纳方式',
  'creator-editor-assist-choice-row',
  'Creator editor assistant should explain adoption before action buttons',
)
for (const adoptionMarker of [
  'adoptionPlan?: CreatorAssistImpactRow[]',
  'candidate.adoptionPlan?.length',
  'creator-editor-assist-adoption',
  'role="region"',
  'aria-live="polite"',
  'aria-label={`候选审阅：${candidate.title}`}',
  'tabIndex={-1}',
  'aria-label="采纳方式"',
  '插入正文后方',
  '追加到当前正文后，仍停在草稿。',
  '替换当前段落',
  '只替换当前段落，原文不会公开。',
  '采用标题',
  '只改私密草稿标题。',
  '先回答问题',
  '不写正文，先把下一问放进判断。',
  'IF 支线候选',
  '不改主线，先作为支线试写。',
]) {
  assertIncludes(editorContractSurface, adoptionMarker, `Creator candidate adoption plan ${adoptionMarker}`)
}
for (const collapsibleMarker of [
  'export function CreatorCollapsibleOutline',
  '<Collapsible',
  '<CollapsibleTrigger asChild>',
  '<CollapsibleContent',
  'aria-expanded={open}',
]) {
  assertIncludes(collapsibleOutline, collapsibleMarker, `Creator collapsible outline uses shadcn/Radix ${collapsibleMarker}`)
}
assertNotIncludes(
  collapsibleOutline,
  '<details',
  'Creator collapsible outline must not use native details',
)
assertNotIncludes(
  collapsibleOutline,
  '<summary',
  'Creator collapsible outline must not use native summary',
)
assertNotIncludes(editorContractSurface, "shortcut: '/state'", 'Creator editor must not expose slash-style state commands.')
assertNotIncludes(editorContractSurface, "shortcut: '/if'", 'Creator editor must not expose slash-style branch commands.')
assertNotIncludes(editorContractSurface, "shortcut: '/why'", 'Creator editor must not expose slash-style rationale commands.')

for (const agentMarker of [
  '用自然语言说想改哪里，助手先给候选',
  '贴着正文发生',
  '候选先停在草稿里',
  '采用、保存和发布都由作者确认',
  '作者确认前不会公开',
  '续写一段',
  '压低解释',
  '追问代价',
  '看影响',
  'IF 支线',
  'CreatorGhostCompletionPanel',
  'CreatorEditorAssistPanel',
  'CreatorChapterPlannerPanel',
  'CreatorWritingCommandShelf',
  'CreatorAssistantDetailGroup',
  'CreatorInlineReviewPanel',
  'CreatorEditorReviewRail',
  'CreatorCreativeReviewDock',
  'CreatorQualityIssueCard',
  'CreatorReviewCommandBar',
  '对助手说：补一段、压低解释、看影响',
  '候选先进草稿',
  '补写一段',
  '压低解释',
  '支线试写',
  'CanonCommitBar',
  'CreatorEditorDecisionQueuePanel',
  'CreatorMissionProgressRail',
  'StoryFlowRail',
  'CreatorFlowStepper',
  'CreatorAssistantDock',
  'CreatorEditorDecisionQueuePanel',
  'CreatorDecisionQueue',
  'CreatorProgressRail',
  'CreatorInlineAssistBar',
  'CreatorSessionRail',
  'CreatorStoryMap',
  'CreatorReaderWishPanel',
  'CreatorAuthorStatusPanel',
  'CreatorDestinationPanel',
  'summary: string',
  'defaultOpen?: boolean',
  'data-slot="creator-destination-panel"',
  'data-slot="creator-destination-header"',
  'data-slot="creator-destination-description"',
  'data-slot="creator-destination-summary"',
  'data-slot="creator-destination-toggle"',
  'data-slot="creator-destination-content"',
  'data-slot="creator-destination-body"',
  '草稿去向',
  '当前去向',
  '修改去向',
  'Collapsible open={open} onOpenChange={setOpen}',
  '<CollapsibleTrigger asChild>',
  '<CollapsibleContent data-slot="creator-destination-content"',
  'CreatorPrivateDraftPanel',
  'CreatorShortcutBar',
  'CreatorWritingWorkspaceFrame',
  'export function CreatorInlineAssistBar',
  'CreatorReviewDockFrame',
  'CreatorReviewCommandBar',
  'CreatorStateDiffPanel',
  'CreatorBranchSandboxPanel',
  'CreatorFlightRecorderPanel',
  'CreatorParagraphJudgmentFrame',
  'CreatorEditorCursorAssistBar',
  'CreatorParagraphJudgmentPanel',
  'CreatorStoryFlowRail',
]) {
  assertIncludes(editorContractSurface, agentMarker, `Creator editor assistant affordance ${agentMarker}`)
}

for (const dataMarker of [
  'readEditorStartupLocalSnapshot()',
  'scheduleEditorStartupEffect(() => {',
  'runEditorStartupEffect({',
  'resolveEditorStartupDataPatch(startupResult)',
  'applyEditorStartupDataPatchToReact',
]) {
  assertIncludes(editorPage, dataMarker, `Editor data source ${dataMarker}`)
}
for (const startupLoadMarker of [
  'listCreatorRequests',
  'listCreatorWorks',
  'listCreatorBranches',
  'listCreatorChapters',
  'getCreatorAuthorizationStatus',
  'runEditorDraftLoad().drafts',
  'runEditorReminderLoad().creativeReminders',
  'runEditorSettingAssetLoad().settingAssets',
]) {
  assertIncludes(editorStartupLoadService, startupLoadMarker, `Editor startup load source ${startupLoadMarker}`)
}
assertNotIncludes(editorPage, 'upsertLocalDraft(', 'Editor route must save drafts through creatorEditorDraftPersistence')
assertNotIncludes(editorPage, 'createLocalDraftRef(', 'Editor route must not create draft refs directly')
assertNotIncludes(editorPage, 'readLocalDrafts(', 'Editor route must read drafts through creatorEditorDraftPersistence')
assertNotIncludes(editorPage, 'readEditorDrafts()', 'Editor route must load drafts through creatorEditorDraftLoadService')
assertNotIncludes(editorPage, 'readLocalCreativeReminders()', 'Editor route must load reminders through creatorEditorReminderService')
assertNotIncludes(editorPage, 'upsertLocalCreativeReminder({', 'Editor route must write reminders through creatorEditorReminderService')
assertNotIncludes(editorPage, 'saveEditorDraft({', 'Editor route must save drafts through creatorEditorDraftSaveService')
assertNotIncludes(editorPage, 'runEditorDraftSave({', 'Editor route must save drafts through creatorEditorDraftActionService')
assertNotIncludes(editorPage, 'resolveEditorDraftSaveResultPatch(result)', 'Editor route must map save results through creatorEditorDraftActionService')
assertNotIncludes(editorPage, 'resolveEditorDraftSaveStatePatch(resolveEditorDraftSaveResultPatch(result))', 'Editor route must map save state through creatorEditorDraftActionService')
assertNotIncludes(editorPage, 'resolveEditorDraftSaveBlocker({', 'Editor route must delegate save blockers to creatorEditorDraftSaveService')
assertNotIncludes(editorPage, 'resolveEditorAutosaveDecision(', 'Editor route must not enable unapproved implicit autosave')
assertNotIncludes(editorPage, 'editorAutosaveDebounceMs', 'Editor route must not own unapproved autosave debounce timing')
assertNotIncludes(editorPage, 'window.setTimeout(() => saveDraft', 'Editor route must not schedule draft autosave directly')
assertNotIncludes(editorPage, "saveDraft('autosave'", 'Editor route must not add implicit autosave writes')
assertNotIncludes(editorPage, 'editorDraftActionResetDelayMs', 'Editor route must schedule draft-action resets through creatorEditorDraftActionResetService')
assertNotIncludes(editorPage, 'window.setTimeout(() => setDraftAction(null)', 'Editor route must not own draft-action reset timers')
assertNotIncludes(editorPage, 'listCreatorRequests()', 'Editor route must load startup API data through creatorEditorStartupLoadService')
assertNotIncludes(editorPage, 'listCreatorWorks()', 'Editor route must load startup API data through creatorEditorStartupLoadService')
assertNotIncludes(editorPage, 'listCreatorBranches()', 'Editor route must load startup API data through creatorEditorStartupLoadService')
assertNotIncludes(editorPage, 'listCreatorChapters()', 'Editor route must load startup API data through creatorEditorStartupLoadService')
assertNotIncludes(editorPage, 'getCreatorAuthorizationStatus()', 'Editor route must load authorization through creatorEditorStartupLoadService')
assertNotIncludes(editorPage, 'runEditorDraftLoad().drafts', 'Editor route must load startup drafts through creatorEditorStartupLoadService')
assertNotIncludes(editorPage, 'runEditorReminderLoad().creativeReminders', 'Editor route must load startup reminders through creatorEditorStartupLoadService')
assertNotIncludes(editorPage, 'runEditorSettingAssetLoad().settingAssets', 'Editor route must load startup setting assets through creatorEditorStartupLoadService')
assertNotIncludes(editorPage, 'runEditorStartupLoad()', 'Editor route must load startup through creatorEditorStartupEffectService')
assertNotIncludes(editorPage, 'resolveEditorRouteBootstrap({', 'Editor route must bootstrap startup through creatorEditorStartupEffectService')
assertNotIncludes(editorPage, 'resolveEditorStartupStatePatch({', 'Editor route must map startup state through creatorEditorStartupEffectService')
assertNotIncludes(editorPage, 'runEditorReminderBootstrap({', 'Editor route must bootstrap reminders through creatorEditorStartupEffectService')
assertNotIncludes(editorPage, 'window.setTimeout(() => {', 'Editor route must schedule startup through creatorEditorStartupEffectService')
assertNotIncludes(editorPage, 'window.clearTimeout(timer)', 'Editor route must cancel startup through creatorEditorStartupEffectService')
assertNotIncludes(editorPage, 'readLocalSettingAssets()', 'Editor route must load setting assets through creatorEditorSettingAssetService')
assertNotIncludes(editorPage, 'upsertLocalSettingAsset({', 'Editor route must save setting assets through creatorEditorSettingAssetService')
assertNotIncludes(editorPage, 'defaultSettingKindForStage(guideStep)', 'Editor route must delegate setting kind decisions to creatorEditorSettingAssetController')
assertNotIncludes(editorPage, 'settingAssetKindLabel(kind)', 'Editor route must delegate setting labels to creatorEditorSettingAssetController')

for (const routeViewModelResidue of [
  'const draftRows =',
  'const requestRows =',
  'const chapterRows =',
  '.sort(byNewestDraft)',
  '.sort(byRequestPriority)',
  'readerWishTypeLabel(request.request_type)',
  'latestDateLabel(draft.updatedAt)',
  'latestDateLabel(chapter.published_at)',
  "'读者想看这一条。'",
]) {
  assertNotIncludes(editorPage, routeViewModelResidue, `Editor route must delegate session/private-draft view-model construction instead of ${routeViewModelResidue}`)
}

for (const editorViewModelMarker of [
  'export function buildEditorSessionGroups',
  'export function buildEditorPrivateDraftItems',
  '.sort(byNewestDraft)',
  '.sort(byRequestPriority)',
  'readerWishTypeLabel(request.request_type)',
  'latestDateLabel(draft.updatedAt)',
  'latestDateLabel(chapter.published_at)',
]) {
  assertIncludes(editorSessionViewModels, editorViewModelMarker, `Editor session view-model module must own session/private-draft builder marker ${editorViewModelMarker}`)
}

for (const routeContextMarker of [
  "searchParams.get('request')",
  "searchParams.get('draft')",
  "searchParams.get('work')",
  "searchParams.get('branch')",
  'const routeDraft = routeDraftRef',
  'activeDraftRef: defaultDraft.localDraftRef',
  'runEditorStartupEffect({',
  'resolveEditorStartupStatePatch({',
  'resolveEditorStartupDataPatch(startupResult)',
  'applyEditorStartupDataPatchToReact',
  'applyEditorStartupStatePatch',
	  'const notice = defaultDraft',
	  'resolveEditorSelectedRequest({',
	  'resolveEditorDestinationContext({',
	  'runEditorDraftSaveThroughAgent({',
	  'runEditorPublishCheckThroughAgent({',
  'creativeReminders: result.creativeReminders',
  'runEditorReminderBootstrap({',
  'creativeReminders.some(reminder => reminder.sourceSignalIds.includes(nextRequest.id))',
  "nextRequest.status === 'in_progress' ? 'pinned' : 'suggested'",
]) {
  assertIncludes(editorContractSurface, routeContextMarker, `Editor route restore ${routeContextMarker}`)
}

for (const destinationControllerMarker of [
  'export interface EditorDestinationControllerInput',
  'export function branchIdForPublish',
  'export function resolveEditorDestinationContext',
  'const workMap = new Map(works.map(work => [work.id, work]))',
  'const branchMap = new Map(branches.map(branch => [branch.id, branch]))',
  'const currentWorkBranches = branches.filter(branch => branch.work_id === selectedWorkId)',
  'const currentWorkChapters = chapters.filter(chapter => chapter.work_id === selectedWorkId)',
  'const mainBranch = currentWorkBranches.find(branch => branch.branch_type === \'main\') || null',
  'const ifBranches = currentWorkBranches.filter(branch => branch.branch_type !== \'main\')',
  'mainBranch?.id || pmfMainBranchId(selectedWorkId)',
  'branchIdForPublish(selectedWorkId, \'if\', selectedRequest)',
	  'const titleReady = Boolean(title.trim())',
	  'const contentReady = Boolean(content.trim())',
	  'const destinationReady = Boolean(selectedWorkId && resolvedBranchId)',
	  'const authorReady = authorization?.authorized === true',
	  'const canSaveDraft = authorReady && titleReady && contentReady && destinationReady',
	  'const canEnterPublishCheck = canSaveDraft',
	  'editorBlockers',
	]) {
  assertIncludes(editorDestinationController, destinationControllerMarker, `Editor destination controller ${destinationControllerMarker}`)
}
for (const routeDestinationResidue of [
  'new Map(works.map(work => [work.id, work]))',
  'new Map(branches.map(branch => [branch.id, branch]))',
  'branches.filter(branch => branch.work_id === selectedWorkId)',
  'chapters.filter(chapter => chapter.work_id === selectedWorkId)',
  'currentWorkBranches.find(branch => branch.branch_type === \'main\')',
  'currentWorkBranches.filter(branch => branch.branch_type !== \'main\')',
  'pmfMainBranchId(selectedWorkId)',
  'branchIdForPublish(selectedWorkId, \'if\', selectedRequest)',
  'const titleReady = Boolean(title.trim())',
  'const contentReady = Boolean(content.trim())',
  'const destinationReady = Boolean(selectedWorkId && resolvedBranchId)',
  'const authorReady = authorization?.authorized === true',
  'const canSaveDraft = authorReady && titleReady && contentReady && destinationReady',
  'const canEnterPublishCheck = canSaveDraft',
  'settingAssets.filter(asset => asset.workId === selectedWorkId)',
  'currentSettingAssets.map(settingAssetSummary)',
  'const ifBranchOptions = [',
]) {
  assertNotIncludes(editorPage, routeDestinationResidue, `Editor route must delegate destination/readiness derivation instead of ${routeDestinationResidue}`)
}
for (const workspaceViewModelMarker of [
  'export interface EditorWorkspaceViewModelInput',
  'export function buildEditorWorkspaceViewModel',
  'const assistantSuggestion = buildEditorCompletion(selectedRequest, content)',
  'const socraticPlanStages = buildSocraticPlanStages({',
  'const storyMapItems = buildStoryMapItems({',
  'const reviewQualityIssues = buildQualityIssues({',
  'const reviewStateDiff = buildStateDiffViewModel({',
  'const reviewBranchSandbox = buildBranchSandboxViewModel({',
  'const reviewFlightRecorder = buildFlightRecorderViewModel({',
]) {
  assertIncludes(editorWorkspaceViewModelController, workspaceViewModelMarker, `Editor workspace view-model controller ${workspaceViewModelMarker}`)
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
  assertNotIncludes(editorPage, routeWorkspaceViewModelResidue, `Editor route must delegate review/story-map view-model construction instead of ${routeWorkspaceViewModelResidue}`)
}
for (const actionInputMarker of [
  'export interface EditorActionReadiness',
  'export function buildEditorDraftActionInput',
  'export function buildEditorPublishCheckInput',
  'export function buildEditorSettingCaptureInput',
  'workId: selectedWorkId',
  'branchId: resolvedBranchId',
  'branchId: resolvedBranchId || null',
  'destinationLabel: editorDestinationLabel',
]) {
  assertIncludes(editorActionInputController, actionInputMarker, `Editor action-input controller ${actionInputMarker}`)
}
for (const ownerPrivateInput of ['EditorActionContextInput', 'EditorSettingCaptureInput']) {
  assertNotIncludes(
    editorActionInputController,
    `export interface ${ownerPrivateInput}`,
    `Editor action-input controller type must stay owner-private: ${ownerPrivateInput}`,
  )
}
if (!canonicalConversationalEditor) {
  for (const routeActionInputResidue of [
    'workId: selectedWorkId',
    'branchId: resolvedBranchId',
    'branchId: resolvedBranchId || null',
    'workTitle: selectedWork?.title ||',
    'destinationLabel: editorDestinationLabel',
    'linkedRequestText: selectedRequest?.request_text || null',
  ]) {
    assertNotIncludes(editorPage, routeActionInputResidue, `Legacy editor route must delegate service input construction instead of ${routeActionInputResidue}`)
  }
}
assertIncludes(progressPanels, 'export function CreatorEditorReadinessStrip', 'Progress panel owner must export editor readiness strip')
assertIncludes(progressPanels, 'creator-editor-readiness-strip', 'Progress panel owner must expose editor readiness QA selector')
assertIncludes(editorManuscript, "from '@/components/creator/workspace/CreatorProgressPanels'", 'Editor manuscript imports readiness owner directly')
assertNotIncludes(editorPage, 'function EditorReadinessStrip', 'Editor readiness strip must not return as a page-local function')
assertIncludes(agentAssistantPanels, 'export function CreatorAgentWritingAssistantPanel', 'Agent assistant owner must export editor assistant wrapper')
assertIncludes(editorRails, '<CreatorAgentWritingAssistantPanel', 'Editor rail module must mount the workspace assistant wrapper')
assertNotIncludes(editorPage, 'function AgentWritingAssistantPanel', 'Editor assistant wrapper must not return as a page-local function')
assertIncludes(decisionPanels, 'export function CreatorEditorDecisionQueuePanel', 'Decision owner must export editor decision queue wrapper')
assertIncludes(decisionPanels, 'export function CreatorDecisionQueue', 'Decision owner must export lower-level decision queue')
assertIncludes(editorRails, "from '@/components/creator/workspace/CreatorDecisionPanels'", 'Editor rails import decision owner directly')
for (const inlineAssistantExport of [
  'export function CreatorEditorAssistPanel',
  'export function CreatorGhostCompletionPanel',
  'export function CreatorInlineAssistBar',
  'export function CreatorWritingCommandShelf',
]) {
  assertIncludes(inlineAssistantPanels, inlineAssistantExport, `Inline assistant owner ${inlineAssistantExport}`)
}
assertIncludes(editorRails, "from '@/components/creator/workspace/CreatorInlineAssistantPanels'", 'Editor rails import inline assistant owner directly')
assertIncludes(editorManuscript, "from '@/components/creator/workspace/CreatorInlineAssistantPanels'", 'Editor manuscript imports inline assistant owner directly')
assertIncludes(editorAssistantViewModels, "from '@/components/creator/workspace/CreatorInlineAssistantPanels'", 'Assistant view models import inline assistant contracts directly')
for (const agentAssistantExport of [
  'export function CreatorAgentWritingAssistantPanel',
  'export function CreatorAgentComposer',
  'export function CreatorAssistantDock',
]) {
  assertIncludes(agentAssistantPanels, agentAssistantExport, `Agent assistant owner ${agentAssistantExport}`)
}
for (const agentAssistantAtomicMarker of [
  "from '@/components/ui/alert'",
  "from '@/components/ui/card'",
  "from '@/components/ui/collapsible'",
  "from '@/components/ui/separator'",
  "from '@/components/ui/tabs'",
  "from '@/components/ui/textarea'",
  'data-slot="creator-assistant-dock"',
  'data-slot="creator-assistant-header"',
  'data-slot="creator-agent-composer"',
  'data-slot="creator-agent-action-queue"',
  'data-slot="creator-agent-focus"',
  'data-slot="creator-agent-command-form"',
  'data-slot="creator-assistant-followup"',
  'data-slot="creator-assistant-actions"',
  'data-slot="creator-assistant-detail-group"',
  'data-slot="creator-assistant-status-row"',
  '<ul className="grid gap-1.5" role="list">',
  '<kbd',
  'role="note"',
  'variant="default"',
  'padding="none"',
  'rounded-md',
]) {
  assertIncludes(agentAssistantPanels, agentAssistantAtomicMarker, `Agent assistant atomic owner ${agentAssistantAtomicMarker}`)
}
if ((agentAssistantPanels.match(/<Card(?=[\s>])/g) || []).length !== 1) {
  throw new Error('Agent assistant owner must keep exactly one shadcn Card root')
}
assertNotIncludes(agentAssistantPanels, 'rounded-2xl', 'Agent assistant controls must keep radii at eight pixels or below')
assertNotIncludes(agentAssistantPanels, 'variant="glass"', 'Agent assistant owner must not add liquid-glass pseudo layers')
assertNotIncludes(css, '.creator-editor-workspace .creator-assistant-', 'Agent assistant owner must not depend on page-global CSS')
assertNotIncludes(css, '.creator-editor-workspace .creator-agent-', 'Agent composer must not depend on page-global CSS')
assertIncludes(editorRails, "from '@/components/creator/workspace/CreatorAgentAssistantPanels'", 'Editor rails import Agent assistant owner directly')
for (const destinationAtomicMarker of [
  'data-slot="creator-destination-panel"',
  'data-slot="creator-destination-header"',
  'data-slot="creator-destination-description"',
  'data-slot="creator-destination-summary"',
  'data-slot="creator-destination-toggle"',
  'data-slot="creator-destination-content"',
  'data-slot="creator-destination-body"',
  'data-slot="creator-bundle-readiness-panel"',
  'data-slot="creator-bundle-readiness-list"',
  'data-slot="creator-bundle-readiness-row"',
  'data-slot="creator-bundle-readiness-action"',
  'max-xl:grid-cols-2',
  'max-xl:flex max-xl:flex-wrap',
  'max-xl:border-[var(--creator-readiness-chip-border)]',
  'bg-[var(--creator-rail-bg)]',
]) {
  assertIncludes(destinationPanels, destinationAtomicMarker, `Destination/readiness atomic owner ${destinationAtomicMarker}`)
}
for (const retiredDestinationSelector of [
  '.creator-editor-right-rail .creator-destination-panel',
  '.creator-editor-right-rail .creator-destination-summary',
  '.creator-editor-right-rail .creator-destination-toggle',
  '.creator-editor-right-rail .creator-publish-readiness-panel',
  '.creator-editor-right-rail .creator-publish-readiness-list',
  '.creator-editor-right-rail .creator-publish-readiness-row',
]) {
  assertNotIncludes(css, retiredDestinationSelector, `Destination/readiness styling must stay component-owned instead of ${retiredDestinationSelector}`)
}
assertIncludes(tokenCss, '--creator-readiness-chip-border:', 'Destination/readiness owner uses a semantic chip-border token')
assertIncludes(workspaceShell, 'export function CreatorShortcutBar', 'Workspace shell owner exports shortcut bar')
assertIncludes(workspaceShell, 'export function CreatorWritingWorkspaceFrame', 'Workspace shell owner exports writing workspace frame')
assertIncludes(creatorAppFrame, "from '@/components/creator/workspace/CreatorWorkspaceShell'", 'Creator App Frame imports shortcut owner directly')
assertIncludes(editorRails, '<CreatorEditorDecisionQueuePanel', 'Editor rail module must mount the workspace decision queue wrapper')
assertNotIncludes(editorPage, 'function DecisionQueuePanel', 'Editor decision queue wrapper must not return as a page-local function')
assertIncludes(inlineReviewPanels, 'export function CreatorInlineReviewPanel', 'Inline review owner must export review panel')
assertIncludes(inlineReviewPanels, 'export function CreatorEditorReviewRail', 'Inline review owner must export review rail')
for (const inlineReviewAtomicMarker of [
  "import { Card, CardContent } from '@/components/ui/card'",
  'data-slot="creator-inline-review"',
  'data-slot="creator-inline-review-list"',
  'data-slot="creator-inline-review-marker"',
  'data-slot="creator-inline-review-action"',
  'data-slot="creator-editor-review-rail"',
  'data-slot="creator-editor-review-title"',
  'data-slot="creator-editor-review-list"',
  'data-slot="creator-editor-review-dot"',
  'variant="glass"',
  '[&::-webkit-scrollbar]:hidden',
]) {
  assertIncludes(inlineReviewPanels, inlineReviewAtomicMarker, `Inline review atomic owner ${inlineReviewAtomicMarker}`)
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
  assertNotIncludes(css, retiredInlineReviewSelector, `Inline review styling must stay component-owned instead of ${retiredInlineReviewSelector}`)
}
assertIncludes(editorManuscript, "from '@/components/creator/workspace/CreatorInlineReviewPanels'", 'Editor manuscript imports inline review owner directly')
assertIncludes(editorManuscript, '<CreatorEditorReviewRail', 'Editor manuscript stage must mount the workspace review rail')
assertNotIncludes(editorPage, 'function InlineReviewPanel', 'Inline review panel must not return as a page-local function')
assertNotIncludes(editorPage, 'function EditorReviewRail', 'Editor review rail must not return as a page-local function')
assertIncludes(progressPanels, 'export function CreatorProgressRail', 'Progress panel owner must export progress rail')
assertIncludes(progressPanels, 'export function CreatorMissionProgressRail', 'Progress panel owner must export mission progress rail')
assertIncludes(progressPanels, 'data-slot="creator-editor-readiness-strip"', 'Progress panel owner must expose a stable readiness slot')
assertIncludes(progressPanels, 'data-slot="creator-progress-rail"', 'Progress panel owner must expose a stable progress slot')
assertIncludes(progressPanels, '[box-shadow:var(--creator-progress-shadow)]', 'Progress panel owner must own the semantic footer shadow')
assertNotIncludes(progressPanels, '发布检查', 'Progress panel owner must describe the PublishBundle confirmation object')
assertIncludes(editorRails, "from '@/components/creator/workspace/CreatorProgressPanels'", 'Editor rails import progress owner directly')
for (const guidanceExport of [
  'export function CreatorParagraphJudgmentFrame',
  'export function CreatorEditorCursorAssistBar',
  'export function CreatorParagraphJudgmentPanel',
  'export function CreatorStoryHandoffPanel',
]) {
  assertIncludes(draftGuidancePanels, guidanceExport, `Draft guidance owner ${guidanceExport}`)
}
assertIncludes(editorManuscript, "from '@/components/creator/workspace/CreatorDraftGuidancePanels'", 'Editor manuscript imports draft guidance owner directly')
assertIncludes(editorGuidance, "from '@/components/creator/workspace/CreatorDraftGuidancePanels'", 'Editor guidance imports story handoff owner directly')
for (const planningExport of [
  'export function CreatorStoryFlowRail',
  'export function CreatorFlowStepper',
  'export function CreatorPrivateDraftPanel',
  'export function CreatorNextActionPanel',
  'export function CreatorNextBestActionCard',
  'export function CreatorCollapsibleOutline',
  'export function CreatorChapterPlannerPanel',
]) {
  assertIncludes(planningPanels, planningExport, `Planning owner ${planningExport}`)
}
for (const flowStepperAtomicMarker of [
  'data-slot="creator-flow-stepper"',
  'data-slot="creator-flow-stepper-header"',
  'data-slot="creator-flow-current"',
  'data-slot="creator-flow-track"',
  'data-slot="creator-flow-step"',
  '[scrollbar-width:thin]',
  '[&::-webkit-scrollbar]:h-1.5',
  '[&::-webkit-scrollbar-thumb]:bg-[var(--creator-editor-line)]',
  'max-xl:hidden',
]) {
  assertIncludes(planningPanels, flowStepperAtomicMarker, `Flow stepper atomic owner ${flowStepperAtomicMarker}`)
}
for (const retiredFlowClass of [
  "className={cn('creator-flow-stepper",
  'className="creator-flow-stepper-head',
  'className="creator-flow-current',
  'className="creator-flow-track',
  "'creator-flow-step-card",
]) {
  assertNotIncludes(planningPanels, retiredFlowClass, `Flow stepper must not depend on retired page-global class ${retiredFlowClass}`)
}
for (const retiredFlowSelector of ['.creator-flow-stepper', '.creator-flow-track']) {
  assertNotIncludes(css, retiredFlowSelector, `Flow stepper styling must stay component-owned instead of ${retiredFlowSelector}`)
}
for (const chapterPlannerAtomicMarker of [
  'data-slot="creator-chapter-planner"',
  'data-slot="creator-chapter-goal"',
  'data-slot="creator-chapter-goal-item"',
  'data-slot="creator-direction-option"',
  'data-slot="creator-direction-impact"',
  '<ol className="grid gap-2 md:grid-cols-2"',
  '<dl className="mt-auto grid w-full gap-2 pt-1 text-xs leading-5"',
  'bg-[var(--creator-editor-control-strong)]',
]) {
  assertIncludes(planningPanels, chapterPlannerAtomicMarker, `Chapter planner atomic owner ${chapterPlannerAtomicMarker}`)
}
for (const retiredChapterPlannerClass of [
  'className="creator-chapter-goal-',
  'className="creator-flow-index"',
  'className="creator-direction-label"',
  'className="creator-direction-card"',
  'className="creator-direction-kicker"',
  'className="creator-direction-summary"',
  'className="creator-direction-promise"',
  'className="creator-direction-impact"',
]) {
  assertNotIncludes(planningPanels, retiredChapterPlannerClass, `Chapter planner must not depend on retired page-global class ${retiredChapterPlannerClass}`)
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
  assertNotIncludes(css, retiredChapterPlannerSelector, `Chapter planner styling must stay component-owned instead of ${retiredChapterPlannerSelector}`)
}
assertIncludes(editorManuscript, "from '@/components/creator/workspace/CreatorPlanningPanels'", 'Editor manuscript imports planning owner directly')
assertIncludes(editorRails, "from '@/components/creator/workspace/CreatorPlanningPanels'", 'Editor rails import planning owner directly')
assertIncludes(editorSocraticViewModels, "from '@/components/creator/workspace/CreatorPlanningPanels'", 'Socratic view models import planning contracts directly')
assertIncludes(editorSessionViewModels, "from '@/components/creator/workspace/CreatorPlanningPanels'", 'Session view models import private draft contract directly')

for (const localDraftMarker of [
  'saveEditorDraft({',
  'runEditorDraftLoad().drafts',
  'resolveEditorDraftSaveResultPatch(result)',
  'editorDraftActionResetDelayMs',
  'activeDraftRef,',
  'localDraftRef: activeDraftRef || createLocalDraftRef()',
  'runEditorManualDraftActionFlow({',
  'runEditorDraftAction(input)',
  'runEditorDraftSave(saveInput)',
  'resolveEditorDraftSaveBlocker(readiness)',
  'resolveEditorDraftOpen(draft)',
  'resolveFreshEditorDraft()',
  'requestId: linkedRequest?.id || null',
  'workId: selectedWorkId',
  'workId,',
  'branchId: resolvedBranchId',
  'branchId,',
  'content,',
  'nowIso: new Date().toISOString()',
  'updatedAt: nowIso',
  'draftId: draft.localDraftRef',
  "status: 'used'",
  'resolveEditorDraftSaveStatePatch(resolveEditorDraftSaveResultPatch(result))',
  'applyEditorDraftStatePatch(result.statePatch)',
	  '已保存私密草稿。',
	  '保存后只会出现在当前设备。',
	]) {
  const source = editorContractSurface
	  assertIncludes(source, localDraftMarker, `Editor local draft ${localDraftMarker}`)
	}

for (const localSettingAssetMarker of [
  'runEditorSettingAssetLoad().settingAssets',
  'runConversationSettingCapture(',
  'runEditorSettingAssetCapture(buildEditorSettingCaptureInput(context))',
  'resolveEditorSettingAssetDraft(input)',
  'persistence.save(draft.assetInput)',
  'resolveEditorSettingAssetStatePatch(result)',
  'export function applyEditorSettingAssetStatePatchToReact(',
  '已收进本机设定库',
]) {
  assertIncludes(`${editorContractSurface}\n${conversationSettingService}`, localSettingAssetMarker, `Editor local setting asset ${localSettingAssetMarker}`)
}

for (const actionMarker of [
  'saveDisabled={!canSaveDraft || Boolean(draftAction)}',
  "saveLoading={loading || draftAction === 'save'}",
  'publishDisabled={!canEnterPublishCheck || Boolean(draftAction)}',
  "publishLoading={loading || draftAction === 'publish'}",
  '只保存草稿',
  '进入发布检查',
  'runEditorPublishCheckFlow({',
  'runEditorPublishCheckAction(input)',
  'navigate(handoff.targetPath)',
]) {
  assertIncludes(editorContractSurface, actionMarker, `Editor action ${actionMarker}`)
}

for (const shadcnStructureMarker of [
  '<CreatorAssistantDock',
  '<CreatorShortcutBar',
  '<CreatorEditorDecisionQueuePanel',
  '<CreatorDecisionQueue',
  '<CreatorMissionProgressRail',
  '<CreatorProgressRail',
  '<CreatorFlowStepper',
  "className={cn('creator-shortcut-bar', className)}",
  '<Button type="button" variant="ghost" size="sm" onClick={onOpenCommands}>',
  '<Button type="button" variant="ghost" size="sm" onClick={onOpenAssistant}>',
  'variant={chapterDirection === direction ? \'gold\' : \'outline\'}',
  'aria-pressed={chapterDirection === direction}',
  'creator-editor-direction-choice',
  'variant={action.active ? \'gold\' : \'outline\'}',
  'aria-pressed={action.active}',
  'creator-editor-cursor-action',
  'creator-editor-cursor-shortcut',
  "variant={action.primary ? 'gold' : 'outline'}",
  'creator-editor-assist-action',
  'creator-editor-assist-action-copy',
  'creator-editor-assist-shortcut',
  '<CreatorAgentWritingAssistantPanel',
  '<CreatorCollapsibleOutline title="快捷动作" description="可选">',
  'className="creator-editor-assist-panel-rail"',
  'actions={[]}',
  'creator-editor-assist-focus-grid',
  'className="creator-paragraph-action"',
  '续写候选',
  '追问代价',
  '试分支',
  "variant={selectedChoiceId === choice.id ? 'gold' : 'outline'}",
  'className="creator-question-choice"',
  'aria-pressed={selectedChoiceId === choice.id}',
  'className="creator-canon-choice-action"',
  "<Collapsible className={cn('creator-canon-bar'",
  '<CollapsibleTrigger asChild>',
  '<CollapsibleContent className="creator-canon-detail-content">',
  'creator-canon-summary',
  'creator-canon-primary-actions',
  'creator-canon-detail-trigger',
  '详细处理',
  '更多处理方式',
  'data-slot="creator-command-example"',
  'data-slot="creator-command-suggestion"',
  'data-slot="creator-command-item"',
  "variant={variant.action === candidate.primaryLabel ? 'gold' : 'outline'}",
  'className="creator-command-variant"',
  'aria-pressed={variant.action === selectedAction}',
  "variant={option === candidate.primaryLabel ? 'gold' : 'outline'}",
  'className="creator-candidate-option"',
  'aria-pressed={option === selectedAction}',
  'className="creator-assistant-chip"',
  'aria-pressed={selectedNextValue === item}',
  'className="justify-start gap-2 rounded-xl px-3 py-2 text-left"',
  'className="creator-guided-step"',
  'aria-pressed={activeStep === step.id}',
  'className="creator-story-handoff-step"',
  'data-slot="creator-direction-option"',
  'aria-pressed={selected}',
  'className="creator-writing-command-chip"',
  'aria-pressed={activeCommand === command.id}',
  'data-slot="creator-session-row"',
  'aria-pressed={item.active}',
  'data-slot="creator-inline-review-marker"',
  'className="creator-editor-ghost-badge"',
  'className="creator-editor-ghost-body mt-2 p-0"',
  'className="creator-editor-ghost-suggestion"',
  'className="creator-editor-ghost-action"',
  'variant={needsAttention ? \'outline\' : \'gold\'}',
  'aria-pressed={needsAttention}',
  'data-slot="creator-editor-review-dot"',
  'className="creator-review-current-action"',
  'data-slot="creator-quality-fix-action"',
  "variant={index === 0 ? 'gold' : 'outline'}",
  'data-slot="creator-quality-issue"',
  'className="creator-sandbox-decision-action"',
  "onDecide(card.label, 'merge')",
  "onDecide(card.label, 'keep')",
  "onDecide(card.label, 'discard')",
  'onDecide={onDecideBranchExperiment}',
  'variant="gold"',
  'variant="outline"',
  'creator-shortcut-hint',
  'data-slot="creator-flow-current"',
  'data-slot="creator-flow-track"',
  'data-slot="creator-flow-step"',
  'aria-label="章节步骤导航"',
  '<Card',
  '<CardHeader className="p-0">',
  'data-slot="creator-assistant-dock"',
  'max-h-[min(30rem,calc(100vh-12rem))]',
  'data-compact={compact ? \'true\' : \'false\'}',
  'creator-writing-command-shelf\', workspaceAssistantCardClass, className)} variant="default"',
  'data-slot="creator-progress-rail" className={cn(workspaceFooterCardClass, className)} variant="default" padding="sm"',
  'workspaceFooterPanelClass',
  'creator-inline-assist-bar',
  'workspaceInlineAssistCardClass',
  'creator-inline-assist-copy',
  'creator-inline-assist-meta',
  'creator-inline-assist-actions',
  'creator-inline-assist-action',
  '<CardTitle className="text-base text-[var(--creator-assistant-text)]">',
  'data-slot="creator-assistant-header"',
  'export function CreatorAgentComposer',
  'export function CreatorAgentWritingAssistantPanel',
  'focusLabel: string',
  'focusReason: string',
  'reference: string',
  'compact?: boolean',
  'aria-label="写作搭档"',
  'data-slot="creator-agent-composer"',
  'creator-agent-focus',
  'creator-agent-focus-head',
  'creator-agent-action-queue',
  'creator-agent-action-card',
  'creator-assistant-followup',
  'data-slot="creator-assistant-actions"',
  'commandBar?: ReactNode',
  'creator-review-command-bar',
  'creator-review-command-input',
  'creator-review-command-submit',
  'creator-review-command-suggestions',
  'creator-review-command-suggestion',
  'creator-agent-action-copy',
  '下一步动作',
  '可用快捷键直接执行',
  '<Tabs defaultValue="ask" className="min-w-0">',
  '<TabsList className="grid w-full grid-cols-2',
  '<TabsTrigger value="ask">对话写作</TabsTrigger>',
  '<TabsTrigger value="check">写作检查</TabsTrigger>',
  '<TabsContent value="ask"',
  '<TabsContent value="check"',
  'export function CreatorReviewCommandBar',
  '<Button',
  '<Textarea',
  '<Input',
]) {
  assertIncludes(editorContractSurface, shadcnStructureMarker, `Creator editor shadcn structure ${shadcnStructureMarker}`)
}

for (const compactOwnerMarker of [
  "compact && 'is-compact max-h-[min(18rem,calc(100vh-18rem))]'",
  "compact && 'min-h-8 py-1.5'",
  "compact && 'max-h-[4.4rem] min-h-[3.4rem] py-2'",
  "compact && 'hidden'",
]) {
  assertIncludes(agentAssistantPanels, compactOwnerMarker, `Creator assistant compact owner ${compactOwnerMarker}`)
}

for (const compactCssMarker of [
  '.creator-editor-workspace .creator-review-command-bar',
  '.creator-editor-workspace .creator-review-command-row',
  '.creator-editor-workspace .creator-review-command-input',
  '.creator-editor-workspace .creator-review-command-submit',
  '.creator-editor-workspace .creator-review-command-suggestions',
  '.creator-editor-workspace .creator-review-command-suggestion',
  '.creator-editor-right-rail .creator-editor-assist-panel-rail .creator-editor-assist-candidate blockquote',
  '@keyframes creatorEditorCandidateIn',
  '@keyframes creatorEditorAdoptionIn',
  '@media (prefers-reduced-motion: reduce)',
]) {
  assertIncludes(css, compactCssMarker, `Creator assistant compact CSS ${compactCssMarker}`)
}
assertNotIncludes(
  css,
  '.creator-editor-workspace .creator-agent-composer.is-compact form {\n    display: none;',
  'Compact assistant must keep a natural-language command form visible',
)
assertNotIncludes(
  css,
  '.creator-editor-workspace .creator-review-command-suggestions button',
  'Review command suggestions must use named shadcn Button classes',
)

for (const actionHintMarker of [
  "hint: '接住当前段落往前写'",
  "hint: '把说明改成动作和细节'",
  "hint: '帮你找下一问的冲突'",
  "hint: '检查人物、伏笔和支线'",
  "label: '看影响审阅'",
  "hint: '先看人物、伏笔和支线影响'",
]) {
  assertIncludes(editorContractSurface, actionHintMarker, `Creator editor assistant action hint ${actionHintMarker}`)
}
assertNotIncludes(
  editorContractSurface,
  "label: '进入发布判断'",
  'Creator editor shortcut should open impact review, not imply direct publish judgment',
)

for (const shortcutHandlerMarker of [
  'const handleEditorShortcut',
  'keyboardEvent.metaKey || keyboardEvent.ctrlKey',
  'keyboardEvent.key.toLowerCase()',
  'resolveEditorShortcut({',
  'resolveEditorCommandStatePatch({',
  'keyboardEvent.stopPropagation()',
  "target.addEventListener('keydown', handleEditorShortcut, { capture: true })",
]) {
  assertIncludes(editorCommandEventService, shortcutHandlerMarker, `Creator editor local writing shortcut handler ${shortcutHandlerMarker}`)
}
for (const shortcutMeaningMarker of [
  "activeWritingCommand: 'temper'",
  "assistAction: 'temper'",
  "activeWritingCommand: 'question'",
  "assistAction: 'question'",
  "activeWritingCommand: 'state'",
  "reviewDockTab: 'state'",
]) {
  assertIncludes(editorAssistantController, shortcutMeaningMarker, `Creator editor shortcut meaning ${shortcutMeaningMarker}`)
}

for (const keyboardQaMarker of [
  'await authorRecallCheckbox.click()',
  "page.keyboard.press('Tab')",
  "'/creator/editor Tab from a recall checkbox must reach its source locator action'",
  'page.keyboard.type(storySeed)',
  "page.keyboard.press('Enter')",
  "'/creator/editor Google Chrome keyboard input must preserve the full natural-language seed'",
]) {
  assertIncludes(authenticatedBrowserQa, keyboardQaMarker, `Creator editor keyboard browser QA ${keyboardQaMarker}`)
}
assertNotIncludes(
  conversationWorkspace,
  "key={props.appliedRecallIds.join('|')}",
  'Creator recall selection must not remount the rail and discard keyboard focus',
)

assertIncludes(agentAssistantPanels, 'creator-agent-action-card h-auto min-h-10', 'Creator editor assistant actions own a stable minimum target locally')
assertIncludes(agentAssistantPanels, 'creator-agent-action-copy grid min-w-0', 'Creator editor assistant action copy owns containment locally')

for (const reviewCommandMarker of [
  'const [reviewCommand, setReviewCommand] = useState',
  'function runReviewCommand',
  "onTabChange('branch')",
  "onTabChange('state')",
  "onTabChange('record')",
  "onApplyReviewFix('生成标题候选')",
  "onApplyReviewFix('让语气更克制')",
  "onApplyReviewFix(contentReady ? '补写下一段' : '补写开场')",
  '<CreatorReviewCommandBar',
  'onValueChange={setReviewCommand}',
  'onSubmit={runReviewCommand}',
]) {
  assertIncludes(editorContractSurface, reviewCommandMarker, `Creator review natural-language command ${reviewCommandMarker}`)
}

assertBefore(
  editorRightRail,
  '<CreatorEditorAssistPanel',
  '<CreatorAgentWritingAssistantPanel',
  'Creator editor right rail should show generated candidates before the semi-resident writing assistant',
)
assertBefore(
  agentComposer,
  'creator-agent-action-queue',
  'creator-agent-focus',
  'Creator agent composer should show executable next-step actions before the guided focus card',
)
assertBefore(
  agentComposer,
  'creator-agent-action-queue',
  '<Textarea',
  'Creator agent composer should make executable next-step actions visible before the freeform input',
)
assertBefore(
  agentComposer,
  'creator-agent-focus',
  '<form',
  'Creator agent composer should keep the focus card above the command form',
)
assertBefore(
  assistantDock,
  '<CreatorAgentComposer',
  '<CreatorAssistantSection title="候选建议"',
  'Creator assistant dock should make natural-language writing input visible before process advice',
)
assertBefore(
  editorRightRail,
  '<CreatorAgentWritingAssistantPanel',
  '<CreatorWritingCommandShelf',
  'Creator editor right rail should lead with the writing assistant before optional command shortcuts',
)
assertBefore(
  editorRightRail,
  '<CreatorAgentWritingAssistantPanel',
  '<CreatorDestinationPanel',
  'Creator editor right rail should prioritize author assistance before publish destination controls',
)
assertBefore(
  editorRightRail,
  '<CreatorWritingCommandShelf',
  '<CreatorDestinationPanel',
  'Creator editor right rail should keep optional writing shortcuts before destination decisions',
)
assertBefore(
  editorRightRail,
  '<CreatorDestinationPanel',
  '<CreatorBundleReadinessPanel',
  'Creator editor right rail should keep destination decisions before publish readiness',
)
assertBefore(
  editorRightRail,
  '<CreatorEditorAssistPanel',
  '<CreatorBundleReadinessPanel',
  'Creator editor right rail should show active candidates before publish readiness',
)
assertBefore(
  editorRightRail,
  '<CreatorAgentWritingAssistantPanel',
  '<CreatorBundleReadinessPanel',
  'Creator editor right rail should keep assistant guidance before publish readiness',
)
assertNotIncludes(
  editorMain,
  '<CreatorWritingCommandShelf',
  'Creator editor manuscript column must not contain the writing command shelf',
)
assertNotIncludes(
  editorMain,
  '<CreatorEditorAssistPanel',
  'Creator editor manuscript column must not contain the active candidate panel',
)
for (const rightRailCssMarker of [
  '.creator-editor-right-rail .creator-writing-command-shelf',
  '.creator-editor-right-rail .creator-writing-command-shelf {\n    position: relative;',
  'top: auto;',
  'z-index: auto;',
  '.creator-editor-right-rail .creator-writing-command-head',
  '.creator-editor-right-rail .creator-writing-command-badge',
  '.creator-editor-right-rail .creator-writing-command-list',
  '.creator-editor-right-rail .creator-writing-command-chip',
  '.creator-editor-right-rail .creator-writing-command-shelf > *',
  'overflow: hidden',
  'min-width: 0',
  'grid-template-columns: minmax(0, 1fr)',
  'max-height: 4.05rem',
  'overflow-x: hidden',
  'overflow-y: auto',
  'overscroll-behavior-y: contain',
  'scrollbar-width: thin',
  'width: 100%',
  '.creator-editor-right-rail .creator-editor-assist-panel-rail',
  'max-height: min(620px, calc(100vh - 7rem))',
  'scrollbar-gutter: stable',
  'height: 2rem;',
  '.creator-inline-assist-bar',
  '.creator-inline-assist-action',
]) {
  assertIncludes(css, rightRailCssMarker, `Creator editor right rail CSS ${rightRailCssMarker}`)
}

for (const localDraftMarker of [
  "from './creatorLocalRepository'",
  'readLocalDraftRecords()',
  'upsertLocalDraftRecord(draft)',
  'export function readLocalDrafts',
  'export function upsertLocalDraft',
  'export function createLocalDraftRef',
]) {
  assertIncludes(localDraftRepository, localDraftMarker, `Local draft repository boundary ${localDraftMarker}`)
}
assertNotIncludes(localDraftRepository, "@/lib/pmfSupabase", 'Local draft repository must not import the Supabase facade')
for (const localStorageMarker of [
  "from './creatorLocalRepository'",
  'export function readLocalCreativeReminders',
  'export function upsertLocalCreativeReminder',
]) {
  assertIncludes(localWritingRepository, localStorageMarker, `Local writing repository boundary ${localStorageMarker}`)
}
for (const localSettingAssetMarker of [
  "from './creatorLocalRepository'",
  'export interface PmfLocalSettingAssetInput',
  'export function createLocalSettingAssetRef',
  'export function readLocalSettingAssets',
  'export function upsertLocalSettingAsset',
  'readLocalSettingAssetRecords(workId)',
  'upsertLocalSettingAssetRecord(next)',
  'normalizedTitle',
  'normalizedSummary',
]) {
  assertIncludes(localSettingAssetRepository, localSettingAssetMarker, `Local setting asset repository boundary ${localSettingAssetMarker}`)
}
assertNotIncludes(localSettingAssetRepository, "@/lib/pmfSupabase", 'Local setting asset repository must not import the Supabase facade')

for (const localWorkspaceMarker of [
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
]) {
  assertIncludes(localWorkspaceRepository, localWorkspaceMarker, `Local workspace repository boundary ${localWorkspaceMarker}`)
}
assertNotIncludes(localWorkspaceRepository, "@/lib/pmfSupabase", 'Local workspace repository must not import the Supabase facade')

for (const forbiddenFacadeMarker of [
  "from '@/local-db/creatorLocalDraftRepository'",
  "from '@/local-db/creatorLocalWritingRepository'",
  "from '@/local-db/creatorLocalSettingAssetRepository'",
  "from '@/local-db/creatorLocalWorkspaceRepository'",
  'export function createLocalDraftRef',
  'export function readLocalDrafts',
  'export function upsertLocalDraft',
  'export function readLocalCreativeReminders',
  'export function upsertLocalCreativeReminder',
  'export function createLocalSettingAssetRef',
  'export function readLocalSettingAssets',
  'export function upsertLocalSettingAsset',
  'export function readLocalWorkspaceSnapshot',
]) {
  assertNotIncludes(data, forbiddenFacadeMarker, `Supabase facade must not expose local writing ownership ${forbiddenFacadeMarker}`)
}

for (const docMarker of [
  'Three columns: request context, quiet editor, destination rail.',
  'Saves private prose locally.',
  'Save and publish handoff are disabled until author status, destination, title, and prose are ready.',
  'Accepts a draft route context and restores title, prose, work, branch, linked request, and publish direction.',
]) {
  assertIncludes(acceptance, docMarker, `Editor acceptance ${docMarker}`)
}

assertIncludes(draftBoundary, 'P0 keeps draft prose local.', 'draft boundary local prose')
assertIncludes(draftBoundary, 'Forbidden cloud fields before publish:', 'draft boundary forbidden cloud fields')
assertIncludes(draftBoundary, 'draft prose body', 'draft boundary names draft prose body as forbidden')
assertIncludes(dataMap, 'local private drafts', 'data map includes local private drafts')
assertIncludes(dataMap, 'creator_authorizations', 'data map includes author authorization for editor')

for (const cssMarker of [
  '.creator-editor-workspace',
  'overflow: visible;',
  '.creator-editor-paper',
  '.creator-editor-paper-top',
  '.creator-editor-direction-strip',
  '.creator-editor-direction-choice',
  '.creator-editor-assist-panel',
  '.creator-editor-cursor-actions',
  '.creator-editor-cursor-action',
  '.creator-editor-cursor-shortcut',
  '.creator-editor-assist-action',
  '.creator-editor-assist-action-copy',
  '.creator-editor-assist-shortcut',
  '.creator-paragraph-action',
  '.creator-question-choice',
  ".creator-question-choice[aria-pressed='true'] small",
  '.creator-canon-choice-action',
  '.creator-canon-summary',
  '.creator-canon-primary-actions',
  '.creator-canon-detail-trigger',
  '.creator-canon-detail-content',
  '.creator-command-variant',
  '.creator-candidate-option',
  '.creator-assistant-chip',
  '.creator-guided-step',
  '.creator-story-handoff-step',
  '.creator-writing-command-chip',
  '.creator-editor-ghost-badge',
  '.creator-editor-ghost-body',
  '.creator-editor-ghost-suggestion',
  '.creator-editor-ghost-action',
  'padding-bottom: 6.6rem;',
  '-webkit-line-clamp: 2;',
  'max-height: 2.4rem;',
  '.creator-review-current-action',
  '.creator-sandbox-decision-action',
  '.creator-review-dock',
  '.creator-editor-surface',
  'var(--creator-editor-bg);',
]) {
  assertIncludes(css, cssMarker, `Creator editor CSS ${cssMarker}`)
}

for (const tokenMarker of [
  '--creator-inline-assist-bg:',
  '--creator-progress-bg:',
  '--creator-progress-row-bg:',
  '--creator-assistant-panel-bg:',
  '--creator-assistant-text:',
]) {
  assertIncludes(tokenCss, tokenMarker, `Creator editor token ownership ${tokenMarker}`)
  assertNotIncludes(css, tokenMarker, `Creator editor token must not be defined in structural CSS ${tokenMarker}`)
}

assertNotIncludes(css, '.creator-editor-direction-strip button', 'Direction selector must not use raw button CSS')
assertNotIncludes(css, '.creator-editor-right-rail .creator-destination-field:first-child', 'Right-rail destination should not make the work field consume a full row')
assertNotIncludes(css, '.creator-editor-cursor-actions button', 'Cursor assistant actions must not use raw button CSS')
assertNotIncludes(css, '.creator-editor-assist-actions button', 'Semi-resident assist actions must not use raw button CSS')
assertNotIncludes(css, '.creator-editor-ghost-actions button', 'Ghost completion actions must use named shadcn Button classes')
assertNotIncludes(css, 'padding-bottom: 9.2rem;', 'Ghost completion should not reserve the old tall card space in the editor')
assertNotIncludes(css, '.creator-editor-assist-actions button:hover', 'Semi-resident assist hover state must come from Button variants')
assertNotIncludes(css, '.creator-editor-assist-actions button > em', 'Semi-resident assist shortcut styling must use a named element class')
assertNotIncludes(editorPage, "className={action.active ? 'is-active' : ''}", 'Cursor assistant actions must use shadcn Button variants instead of active classes')
assertNotIncludes(editorPage, "className={`creator-editor-review-dot ${needsAttention ? 'needs-attention' : 'is-ready'}`}", 'Inline review rail must use shadcn Button variants instead of ready/attention classes')
assertNotIncludes(css, '.creator-editor-review-dot:hover', 'Inline review rail hover state must come from Button variants')
assertNotIncludes(css, '.creator-editor-review-dot.needs-attention', 'Inline review rail attention state must come from Button variants')
assertNotIncludes(css, '.creator-editor-review-dot.is-ready', 'Inline review rail ready state must come from Button variants')
assertNotIncludes(css, 'position: absolute;\n    top: 0.85rem;\n    right: 0.72rem;', 'Inline review rail must not return to an overlay that covers prose text')
assertNotIncludes(css, '.creator-review-current-actions button', 'Current judgment actions must not use raw button CSS')
assertNotIncludes(css, '.creator-review-current-actions button.is-primary', 'Current judgment primary action must come from Button variants')
assertNotIncludes(editorPage, 'className="is-primary"', 'Current judgment primary action must not use a raw active class')
assertNotIncludes(css, '.creator-quality-fix-list button', 'Quality fix actions must not use raw button CSS')
assertNotIncludes(css, '.creator-quality-fix-list button:hover', 'Quality fix hover state must come from Button variants')
assertNotIncludes(css, '.creator-editor-workspace .creator-progress-rail', 'Progress rail styling must stay component-owned')
assertNotIncludes(css, '.creator-sandbox-decisions button', 'Branch sandbox decisions must not use raw button CSS')
assertNotIncludes(css, '.creator-sandbox-decisions button:hover', 'Branch sandbox hover state must come from Button variants')
assertNotIncludes(css, '.creator-paragraph-actions button', 'Paragraph judgment actions must not use raw button CSS')
assertNotIncludes(css, '.creator-paragraph-actions button:hover', 'Paragraph judgment hover state must come from Button variants')
assertNotIncludes(css, '.creator-paragraph-actions button:disabled', 'Paragraph judgment disabled state must come from Button variants')
assertNotIncludes(css, 'creator-agent-card', 'Creator editor CSS must not keep the old generic agent-card selector')
assertNotIncludes(editorPage, "className={`creator-question-choice ${selectedChoiceId === choice.id ? 'is-selected' : ''}`}", 'Socratic question choices must use Button variants instead of selected classes')
assertNotIncludes(css, '.creator-question-choice.is-selected', 'Socratic question selected state must come from Button variants')
assertNotIncludes(css, '.creator-question-choice:hover', 'Socratic question hover state must come from Button variants')
assertNotIncludes(css, '.creator-canon-choice-row button', 'Canon choice actions must not target raw button elements')
assertNotIncludes(editorPage, 'function CanonCommitBar', 'Canon confirmation must live in CreatorCanonCommitBar, not the editor page')
assertNotIncludes(editorPage, '<div className="creator-canon-bar" aria-label="正式剧情确认">', 'Canon confirmation must use shadcn/Radix Collapsible instead of a permanently expanded div')
assertNotIncludes(css, '.creator-command-examples button', 'Command examples must not target raw button elements')
assertNotIncludes(css, '.creator-command-examples button:hover', 'Command example hover state must come from Button variants')
assertNotIncludes(css, '.creator-command-suggestions button', 'Command suggestions must not target raw button elements')
assertNotIncludes(css, '.creator-command-suggestions button:hover', 'Command suggestion hover state must come from Button variants')
assertNotIncludes(css, '.creator-command-item:hover', 'Command item hover state must come from Button variants')
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
  assertNotIncludes(css, retiredCommandPaletteSelector, `Command palette global selector must stay retired: ${retiredCommandPaletteSelector}`)
}
assertNotIncludes(editorPage, "className={`creator-command-variant ${variant.action === candidate.primaryLabel ? 'is-primary' : ''}`}", 'Command variants must use Button variants instead of primary classes')
assertNotIncludes(editorPage, "className={`creator-candidate-option ${option === candidate.primaryLabel ? 'is-primary' : ''}`}", 'Candidate options must use Button variants instead of primary classes')
assertNotIncludes(css, '.creator-command-variant:hover', 'Command variant hover state must come from Button variants')
assertNotIncludes(css, '.creator-command-variant.is-primary', 'Command variant primary state must come from Button variants')
assertNotIncludes(css, '.creator-candidate-option:hover', 'Candidate option hover state must come from Button variants')
assertNotIncludes(css, '.creator-candidate-option.is-primary', 'Candidate option primary state must come from Button variants')
assertNotIncludes(editorPage, "className={`creator-assistant-chip ${selectedNextValue === item ? 'is-selected' : ''}`}", 'Assistant chips must use Button variants instead of selected classes')
assertNotIncludes(css, '.creator-assistant-chip:hover', 'Assistant chip hover state must come from Button variants')
assertNotIncludes(css, '.creator-assistant-chip.is-selected', 'Assistant chip selected state must come from Button variants')
assertNotIncludes(editorPage, 'className="creator-guided-pill">', 'Guided scene pills must be shadcn Buttons')
assertNotIncludes(editorPage, "className={`creator-guided-step ${activeStep === step.id ? 'is-active' : ''}`}", 'Guided steps must use Button variants instead of active classes')
assertNotIncludes(css, '.creator-guided-step:hover', 'Guided step hover state must come from Button variants')
assertNotIncludes(css, '.creator-guided-step.is-active', 'Guided step active state must come from Button variants')
assertNotIncludes(css, '.creator-guided-pill:hover', 'Guided pill hover state must come from Button variants')
assertNotIncludes(editorPage, "className={`creator-story-handoff-step ${step.ready ? 'is-ready' : ''} ${activeStep === step.id ? 'is-active' : ''}`}", 'Story handoff steps must use Button variants instead of ready/active classes')
assertNotIncludes(editorPage, 'function StoryHandoffPanel(', 'Story handoff must live in the workspace component system, not the page file')
assertNotIncludes(css, '.creator-story-handoff-step:hover', 'Story handoff hover state must come from Button variants')
assertNotIncludes(css, '.creator-story-handoff-step.is-active', 'Story handoff active state must come from Button variants')
assertNotIncludes(css, '.creator-story-handoff-step.is-ready', 'Story handoff ready state must come from Button variants')
assertNotIncludes(editorPage, "className={`creator-direction-card ${direction === item.id ? 'is-active' : ''}`}", 'Direction cards must use Button variants instead of active classes')
assertNotIncludes(css, '.creator-direction-card:hover', 'Direction card hover state must come from Button variants')
assertNotIncludes(css, '.creator-direction-card.is-active', 'Direction card active state must come from Button variants')
assertNotIncludes(editorPage, "className={`creator-writing-command-chip ${activeCommand === command.id ? 'is-active' : ''}`}", 'Writing command chips must use Button variants instead of active classes')
assertNotIncludes(css, '.creator-writing-command-chip:hover', 'Writing command hover state must come from Button variants')
assertNotIncludes(css, '.creator-writing-command-chip.is-active', 'Writing command active state must come from Button variants')
assertNotIncludes(editorPage, "className={`creator-session-row ${activeDraftRef === draft.localDraftRef ? 'is-active' : ''}`}", 'Draft session rows must use Button variants instead of active classes')
assertNotIncludes(editorPage, "className={`creator-session-row ${selectedRequest?.id === request.id ? 'is-active' : ''}`}", 'Request session rows must use Button variants instead of active classes')
assertNotIncludes(editorPage, 'function StoryMapPanel(', 'Story map must live in the workspace component system, not the page file')
assertNotIncludes(editorPage, 'function CreatorSessionListPanel(', 'Session rail must live in the workspace component system, not the page file')
assertNotIncludes(editorPage, '<h2 className="text-lg font-semibold text-[var(--creator-text)]">作者状态</h2>', 'Author status panel must live in the workspace component system, not a page-local Panel')
assertNotIncludes(editorPage, '<h2 className="text-lg font-semibold text-[var(--creator-text)]">发布去向</h2>', 'Destination panel must live in the workspace component system, not a page-local Panel')
assertNotIncludes(editorPage, '<h2 className="text-lg font-semibold text-[var(--creator-text)]">私密草稿</h2>', 'Private draft panel must live in the workspace component system, not a page-local Panel')
assertNotIncludes(css, '.creator-session-row:not(.is-static):hover', 'Session row hover state must come from Button variants')
assertNotIncludes(css, '.creator-session-row.is-active', 'Session row active state must come from Button variants')
assertNotIncludes(css, '.creator-inline-marker:hover', 'Inline marker hover state must come from Button variants')
assertNotIncludes(editorPage, 'function AutopilotCheckpointPanel', 'Unused autopilot checkpoint panel must not return to the editor page')
assertNotIncludes(editorPage, 'AutopilotCheckpointPanel', 'Unused autopilot checkpoint symbol must not return to retained editor panels')
assertNotIncludes(editorPage, 'creator-autopilot-panel', 'Unused autopilot checkpoint shell must not return to the editor page')
assertNotIncludes(editorPage, 'creator-autopilot-choice', 'Unused autopilot checkpoint actions must not return to the editor page')
assertNotIncludes(css, 'creator-autopilot-', 'Unused autopilot checkpoint CSS must not return')
assertNotIncludes(css, '.creator-decision-next-action button', 'Decision queue next action must remain inside the shadcn workspace component')
assertNotIncludes(css, '.creator-decision-options button', 'Decision queue options must remain inside the shadcn workspace component')
assertNotIncludes(css, '.creator-decision-card.is-ready', 'Decision queue ready state must come from workspace panel composition')
assertNotIncludes(css, '.creator-decision-card.is-high', 'Decision queue priority state must come from workspace panel composition')

for (const deprecatedClass of [
  'creator-agent-workbench',
  'creator-decision-panel',
  'creator-mission-rail',
  'creator-story-flow-rail',
  'creator-chapter-builder-disclosure',
  'creator-agent-execution-list',
  'creator-agent-task-list',
  'creator-agent-command-box',
]) {
  assertNotIncludes(editorPage, deprecatedClass, `Creator editor must use workspace component contract, not old page class ${deprecatedClass}`)
}

for (const componentMarker of [
  'export function CreatorFlowStepper',
  'export function CreatorWritingWorkspaceFrame',
  'export function CreatorShortcutBar',
  'export function CreatorCommandCenterFrame',
  'export function CreatorAssistantSidecarFrame',
  'export function CreatorCommandCandidateFrame',
  'export function CreatorGuidedCoachFrame',
  'export function CreatorStoryHandoffPanel',
  'export function CreatorReviewDockFrame',
  'export function CreatorCreativeReviewDock',
  'export function CreatorQualityIssueCard',
  'export function CreatorStateDiffPanel',
  'export function CreatorBranchSandboxPanel',
  'export function CreatorFlightRecorderPanel',
  'export function CreatorParagraphJudgmentFrame',
  'export function CreatorEditorCursorAssistBar',
  'export function CreatorParagraphJudgmentPanel',
  'export function CreatorStoryFlowRail',
  'export function CreatorNextBestActionCard',
  '已就绪 {readyCount}/{steps.length}',
  '当前焦点',
  '第 {activeIndex + 1} 步',
  'data-slot="creator-flow-track"',
  'data-slot="creator-flow-step"',
  '<Button',
  'variant="ghost"',
  "aria-current={step.active ? 'step' : undefined}",
  'export function CreatorAgentWritingAssistantPanel',
  'export function CreatorAssistantDock',
  'export function CreatorEditorDecisionQueuePanel',
  'export function CreatorDecisionQueue',
  'export function CreatorInlineReviewPanel',
  'export function CreatorEditorReviewRail',
  'export function CreatorProgressRail',
  'export function CreatorMissionProgressRail',
  'export function CreatorSessionRail',
  'export function CreatorStoryMap',
  'export function CreatorReaderWishPanel',
  'export function CreatorAuthorStatusPanel',
  'export function CreatorDestinationPanel',
  'export function CreatorBundleReadinessPanel',
  'export function CreatorCanonCommitBar',
  'export function CreatorPrivateDraftPanel',
  'data-slot="creator-command-overlay"',
  'creator-assistant-sidecar',
  'creator-command-candidate',
  'creator-guided-coach',
  'creator-review-dock',
  'creator-paragraph-judgment',
  "variant=\"glass\"",
  "variant=\"gold\"",
  '<Textarea',
  '<Button',
]) {
  assertIncludes(workspaceComponentSurface, componentMarker, `Creator workspace component system ${componentMarker}`)
}
assertNotIncludes(editorPage, 'function CreatorShortcutBar(', 'Shortcut bar must live in the workspace component system, not the page file')
assertNotIncludes(editorPage, 'creator-writing-workspace creator-editor-workspace grid gap-4', 'Writing workspace grid must live in the workspace frame, not the page file')
assertIncludes(creatorAppFrame, '<CreatorCommandPaletteSurface', 'Creator command palette must use the workspace command palette surface')
assertIncludes(creatorAppFrame, '<CreatorAssistantSidecarSurface', 'Creator assistant sidecar must use the workspace assistant sidecar surface')
assertIncludes(creatorAppFrame, '<CreatorCommandCandidateSurface', 'Creator command candidate must use the workspace candidate surface')
assertIncludes(commandPalette, '<CreatorCommandCenterFrame', 'Creator command palette surface must compose its owned command center frame')
assertIncludes(assistantSidecar, '<CreatorAssistantSidecarFrame', 'Creator assistant sidecar surface must compose its owned frame')
assertIncludes(commandCandidate, '<CreatorCommandCandidateFrame', 'Creator command candidate surface must compose its owned candidate frame')
assertIncludes(editorGuidance, '<CreatorGuidedCoachFrame', 'Creator guided coach must use the workspace guided coach frame')
assertIncludes(editorManuscript, '<CreatorNextBestActionCard', 'Creator next-best action card must use the workspace component')
assertNotIncludes(editorPage, 'function NextBestActionCard', 'Creator next-best action card must not be page-local')
assertIncludes(editorRails, '<CreatorCreativeReviewDock', 'Creator rail module must use the workspace review dock assembly')
assertNotIncludes(editorPage, 'function CreativeReviewDock', 'Creator review dock assembly must not be page-local')
assertNotIncludes(editorPage, 'function QualityIssueCard', 'Creator quality issue card must not be page-local')
assertIncludes(reviewDock, '<CreatorStateDiffPanel', 'Creator review dock assembly must compose the impact state diff panel')
assertIncludes(reviewDock, '<CreatorBranchSandboxPanel', 'Creator review dock assembly must compose the impact branch sandbox panel')
assertIncludes(reviewDock, '<CreatorFlightRecorderPanel', 'Creator review dock assembly must compose the impact flight recorder panel')
assertIncludes(editorManuscript, 'CreatorEditorCursorAssistBar', 'Creator cursor assist must use the workspace cursor assist bar')
assertIncludes(editorManuscript, 'CreatorParagraphJudgmentPanel', 'Creator paragraph judgment must use the workspace paragraph judgment panel')
assertIncludes(editorManuscript, '<CreatorStoryFlowRail', 'Creator story flow must use the workspace story flow rail')
assertNotIncludes(editorPage, 'function EditorCursorAssistBar', 'Cursor assist bar must not return as a page-local function')
assertNotIncludes(editorPage, 'function ParagraphJudgmentPanel', 'Paragraph judgment panel must not return as a page-local function')
assertNotIncludes(editorPage, 'function StoryFlowRail', 'Story flow rail must not return as a page-local function')
assertNotIncludes(editorPage, 'function StateDiffPanel', 'State diff panel must not return as a page-local function')
assertNotIncludes(editorPage, 'function BranchSandboxPanel', 'Branch sandbox panel must not return as a page-local function')
assertNotIncludes(editorPage, 'function FlightRecorderPanel', 'Flight recorder panel must not return as a page-local function')
assertNotIncludes(creator, '<div className="creator-command-overlay"', 'Command overlay shell must live in workspace components, not the page file')
assertNotIncludes(creator, '<aside className="creator-assistant-sidecar"', 'Assistant sidecar shell must live in workspace components, not the page file')
assertNotIncludes(creator, '<aside className="creator-command-candidate"', 'Command candidate shell must live in workspace components, not the page file')
assertNotIncludes(editorPage, 'creator-agent-card creator-guided-coach', 'Guided coach shell must live in workspace components, not the page file')
assertNotIncludes(editorPage, 'creator-agent-card creator-review-dock', 'Review dock shell must live in workspace components, not the page file')
assertNotIncludes(editorPage, 'creator-agent-card creator-paragraph-judgment', 'Paragraph judgment shell must live in workspace components, not the page file')
assertIncludes(editorContractSurface, '质量问题卡', 'Creator editor quality guidance must use productized quality issue card copy')
assertNotIncludes(visibleEditorCopy, '质量审阅', 'Creator editor must not expose old quality review process copy')
assertNotIncludes(visibleEditorCopy, '审阅建议', 'Creator editor must not expose old generic review suggestion copy')

for (const deprecatedVisibleTerm of [
  '创作地图',
  '写作陪跑',
  '创作指令带',
  '创作指令',
  '推荐指令',
  '没有匹配的指令',
  '⌘K 指令',
  '先做：',
  '执行过程',
  '任务列表',
  '告诉写作助手',
  '状态变化',
  '形成过程',
  '分支实验',
  '沙盒',
  '实验线',
  '正史',
  '本章方向',
  '当前步骤',
  '写前准备',
  '修复卡',
]) {
  assertNotIncludes(editorPage, deprecatedVisibleTerm, `Creator editor deprecated visible term ${deprecatedVisibleTerm}`)
}

for (const internalTerm of [
  'Supabase',
  'trace',
  'provider',
  'fallback',
  'API key',
  '后端',
  '接口',
  '同步',
  '回写',
  'localhost',
]) {
  assertNotIncludes(visibleEditorCopy, internalTerm, `Creator editor internal term ${internalTerm}`)
}

assertNotIncludes(editorPage, 'publishChapter(', 'Writing Desk must not directly publish')
assertNotIncludes(editorPage, ".from('chapters')", 'Writing Desk must not directly write chapters')
assertNotIncludes(editorPage, ".from('publish_events')", 'Writing Desk must not directly write publish events')
assertNotIncludes(editorPage, ".from('reader_requests')", 'Writing Desk must not directly update request records')
assertNotIncludes(editorMain, 'variant="glass"', 'Editor body must not use glass card treatment')
assertNotIncludes(editorMain, 'pu-liquid-glass', 'Editor body must not use liquid glass')
assertNotIncludes(
  editorPage,
  'creator-writing-command-shelf\', workspaceAssistantCardClass, className)} variant="glass"',
  'Creator writing command shelf must stay a flat shadcn command surface, not a liquid-glass layer',
)
assertNotIncludes(
  agentAssistantPanels,
  'variant="glass"',
  'Creator assistant dock must stay a flat shadcn card, not a liquid-glass layer',
)
assertNotIncludes(
  progressPanels,
  'workspaceGlassCardClass',
  'Creator progress rail must use footer tokens instead of the generic glass card token',
)
assertNotIncludes(editorPage, 'function MissionProgressRail', 'Mission progress rail must not return as a page-local function')
assertNotIncludes(editorPage, 'UniverseDepth', 'Writing Desk must not use Reader depth imagery')
assertNotIncludes(editorPage, 'animate-particle-drift', 'Writing Desk must not use particle background motion')
assertNotIncludes(editorPage, 'pu-bg-reader', 'Writing Desk must not use Reader background assets')

console.log('[creator-m4-editor] PASS')
