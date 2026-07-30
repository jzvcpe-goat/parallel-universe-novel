#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs'
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

function collectSourceFiles(path) {
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) return []

  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = `${path}/${entry.name}`
    if (entry.isDirectory()) return collectSourceFiles(child)
    if (!entry.isFile() || !/\.[cm]?[jt]sx?$/.test(entry.name)) return []
    return [child]
  })
}

function forbidPatterns(path, patterns) {
  const body = read(path)
  for (const [pattern, description] of patterns) {
    if (pattern.test(body)) failures.push(`${path} must not contain ${description}`)
  }
}

requireAll('docs/launch/000_MASTER_COMMERCIALIZATION_ROADMAP.md', [
  'Reader Web',
  'Local Creator App',
  'Creator Pivot V2',
  'Document Set',
  '040_LEGACY_REFINEMENT_DELETION_PLAN.md',
  '041_EXISTING_PROJECT_SLICING_PLAN.md',
  '042_LEGACY_INVENTORY.md',
  '043_SLICE_OWNERSHIP_MATRIX.md',
  '044_EPIC_1_SLICE_CLOSEOUT_EPIC_2_READINESS.md',
  '045_CREATOR_PIVOT_NEXT_DEVELOPMENT_PLAN.md',
  '050_CUTOVER_ROLLBACK_PLAN.md',
  '060_ACCEPTANCE_GATES_MATRIX.md',
  'No new Creator IA rebuild is accepted',
  'WP6 Server-Owned Publish Transaction',
  'Applications Project Placement',
  'Epic 0',
  'Epic 1',
  'Epic 2',
  'Epic 3',
  'Epic 4',
  'Epic 5',
  'Epic 6',
  'Epic 7',
  'Pivot Governance',
  'Legacy Refinement',
  'Local Creator Architecture',
  'External Echo',
  'Creator UI Pivot',
  'Backend Security',
  'Payment Entitlements',
  'Production Launch',
  'Current Epic Status',
  'Entry blocked',
  'Promotion is one-way through evidence',
  'Creator Pivot / Local UI / Agent Plan',
  'Backend / Database / Security Plan',
  'Payment / Production Launch Plan',
  'Legacy Refinement / Deletion Plan',
  'Rednote / Yuzhou research',
  'local DB + agent surface',
  'ReaderSignal -> CreativeReminder',
  'backend publish transaction',
  'First-Round Change Lock',
  'WP4 application/local slice is accepted',
  'WP5 PublishBundle lifecycle passed',
])

requireAll('docs/launch/010_CREATOR_PIVOT_LOCAL_UI_AGENT_PLAN.md', [
  'localhost writing operating system',
  'Pre-pivot skeleton',
  'Pivot V2 target skeleton',
  'External Echo',
  'Publish bundle',
  'working agent',
  'Reuse Rule',
  'Epic 2: Local Creator Architecture',
  'Epic 3: External Echo',
  'Epic 4: Creator UI Pivot',
  'IndexedDB And OPFS Strategy',
  'Agent Manifest And Operable UI',
  'Atomic UI Contract',
  'WP6 server-owned publish transaction is now repository-accepted',
  'Live Supabase application and strict receipt proof remain explicitly deferred',
])

forbidPatterns('docs/launch/010_CREATOR_PIVOT_LOCAL_UI_AGENT_PLAN.md', [
  [/The immediate downstream slice is WP6 server-owned publish transaction/, 'stale pre-WP6 next-slice claim'],
])

requireAll('docs/launch/020_BACKEND_DATABASE_SECURITY_PLAN.md', [
  'cloud boundary',
  'Published works, branches, and chapters',
  'Draft prose',
  'Author model credentials',
  'Cloud AI generation remains disabled for P0',
  'Related Gates',
  'Epic 5: Backend Security',
  'ReaderSignal Model',
  'Publish Transaction',
  'RLS Responsibility Matrix',
  'Forbidden Cloud Data',
])

requireAll('docs/launch/030_PAYMENT_PRODUCTION_LAUNCH_PLAN.md', [
  'Payment is not a P0 dependency',
  'zero-cost PMF validation',
  'Payment-Adjacent Product Signals',
  'Production Readiness Boundary',
  'Deferred Scope',
  'Epic 6: Payment Entitlements',
  'Epic 7: Production Launch',
  'Payment State Machine',
  'Rollout Sequence',
  'Commercial Launch Acceptance',
])

requireAll('docs/launch/040_LEGACY_REFINEMENT_DELETION_PLAN.md', [
  'cut, classify, purify, isolate',
  'not a new UI design document',
  'Preserve',
  'Extract',
  'Adapt',
  'Deprecate',
  'Delete',
  'Yuzhou/one-stop-writing research',
  'local writing operating system',
  '<repository-root>',
  '<legacy-static-ui-reference>',
  '<legacy-novel-package>',
  'Epic 1: Legacy Refinement',
  'Deletion Preconditions',
])

requireAll('docs/launch/041_EXISTING_PROJECT_SLICING_PLAN.md', [
  'not a UI redesign brief',
  'S0. Freeze Source Of Truth',
  'S1. Legacy Inventory',
  'S2. Gates First',
  'S9. Delete Old Code',
  'first-round deliverable is limited to launch docs',
  'check:slicing',
  'check:legacy-imports',
])

requireAll('docs/launch/042_LEGACY_INVENTORY.md', [
  '## Classification Report',
  '## Research-Informed Capability Extraction',
  'Yuzhou research input is applied as a slicing rule',
  'LocalCreatorApp.tsx',
  'CreatorWritingWorkspace.tsx',
  'CreatorDestinationPanels.tsx',
  'CreatorCommitPanels.tsx',
  'CreatorStoryContextPanels.tsx',
  'CreatorSocraticPanels.tsx',
  'CreatorAssistantSidecar.tsx',
  'CreatorCommandPalette.tsx',
  'CreatorCommandCandidate.tsx',
  'CreatorReviewDock.tsx',
  'CreatorQualityPanels.tsx',
  'CreatorImpactPanels.tsx',
  'CreatorInlineReviewPanels.tsx',
  'CreatorProgressPanels.tsx',
  'CreatorDraftGuidancePanels.tsx',
  'CreatorPlanningPanels.tsx',
  'CreatorDecisionPanels.tsx',
  'CreatorInlineAssistantPanels.tsx',
  'CreatorAgentAssistantPanels.tsx',
  'CreatorWorkspaceShell.tsx',
  'creatorEditorSessionViewModels.ts',
  'creatorEditorViewModels.ts',
  'creatorEditorSocraticViewModels.ts',
  'creatorEditorAssistantViewModels.ts',
  'creatorEditorQualityViewModels.ts',
  'creatorEditorReviewImpactViewModels.tsx',
  'creatorEditorStoryMapViewModels.tsx',
  'creatorEditorInlineReviewViewModels.ts',
  'creatorLocalMigrationPlan.ts',
  'creatorLocalMigrationRepository.ts',
  'app/src/index.css',
  'Removed Creator request component paths',
  'Creator Echo component owners',
  'CreatorEchoQueueCard.tsx',
  'CreatorEchoStatusStrip.tsx',
  'CreatorEchoDecisionPanels.tsx',
  'CreatorEchoWritingRail.tsx',
  'Creator PublishBundle component owners',
  'CreatorPublishBundleContextPanel.tsx',
  'CreatorPublishBundleImpactStrip.tsx',
  'CreatorPublishBundleReviewPanel.tsx',
  'CreatorPublishBundlePanels.tsx',
  'publishBundleTransaction()',
  'publish_bundle_transaction',
  'localStorage',
  '<legacy-integration-harness>',
  '<legacy-static-ui-reference>',
  '<legacy-novel-package>',
])

requireAll('docs/launch/043_SLICE_OWNERSHIP_MATRIX.md', [
  'Current Compatibility Allowlist',
  'Forbidden Imports',
  'External Echo',
  'PublishBundle',
  'PublishBundle component ownership',
  'IndexedDB schema v10',
  'One-way legacy migration planner',
  'Local migration receipt repository',
])

requireAll('docs/launch/044_EPIC_1_SLICE_CLOSEOUT_EPIC_2_READINESS.md', [
  'closes one evidence-backed Epic 1 deletion slice',
  'does not close all of Epic 1',
  'Epic 1 Remaining Work',
  'One-way local migration',
  'Epic 2 Local Creator Architecture is accepted on 2026-07-10',
  'Creator UI IA refactor remains blocked',
  'Renaming navigation or pages is not evidence',
  'Next dependency-ordered slice',
  'The repository next-slice marker has advanced past WP6',
  'live External Echo / strict Supabase evidence',
])

forbidPatterns('docs/launch/044_EPIC_1_SLICE_CLOSEOUT_EPIC_2_READINESS.md', [
  [/The next slice is WP6 Server-Owned Publish Transaction/, 'stale pre-WP6 next-slice claim'],
  [/`publishChapter\(\)` remains dynamically isolated inside the application adapter/, 'stale pre-WP6 publish adapter claim'],
])

requireAll('docs/launch/045_CREATOR_PIVOT_NEXT_DEVELOPMENT_PLAN.md', [
  'not a second UI redesign brief',
  '<unrelated-project>',
  'Current-State Correction',
  'Cross-Tab Workspace Coordination',
  'Draft Body Ownership, OPFS, And Workspace Recovery',
  'Agent Action Execution And Author Control',
  'Multi-Source External Echo',
  'PublishBundle Lifecycle And Recovery',
  'Server-Owned Publish Transaction',
  'Creator IA And Atomic UI Cutover',
  'Legacy Retirement',
  'Immediate Next Goal',
  'check:local-coordination',
  'qa:local-db-cross-tab',
])

requireAll('docs/launch/050_CUTOVER_ROLLBACK_PLAN.md', [
  'Creator Pivot V2 must be cut over',
  'Feature flags stay off by default during slicing',
  'Rollback Units',
  'Creator route registry',
  'External Echo',
  'Publish bundle',
  'Release Branch Rule',
  'Local Schema Rollback Rule',
  'Never downgrade or delete the local database',
])

requireAll('docs/launch/060_ACCEPTANCE_GATES_MATRIX.md', [
  'Classification phase',
  'Deletion phase',
  'check:no-old-request-framing',
  'check:no-localstorage-outside-migration',
  'check:pivot',
])

requireAll('app/src/features/creator-pivot/featureFlags.ts', [
  'creatorPivotV2: false',
  'creatorEcho: false',
  'localWritingLibrary: false',
  'publishBundles: false',
  'agentSurface: false',
  'stuckRescue: false',
  'localDataV2: false',
  'creatorIaV2: false',
  'backendPublishTransaction: false',
  'paymentEntitlements: false',
  'productionLaunch: false',
  'CreatorPivotEpicId',
  'CreatorPivotWorkstream',
])

const creatorPivotFeatureFlagPath = 'app/src/features/creator-pivot/featureFlags.ts'
for (const path of collectSourceFiles('app/src')) {
  if (path === creatorPivotFeatureFlagPath) continue
  forbidPatterns(path, [
    [/@\/features\/creator-pivot\/featureFlags|creator-pivot\/featureFlags/, 'premature Creator Pivot governance-flag runtime import'],
    [/\b(?:isCreatorPivotFeatureEnabled|creatorPivotFeatureFlags|creatorPivotFeatureFlagMetadata)\b/, 'premature Creator Pivot governance-flag runtime use'],
  ])
}

requireAll('docs/launch/041_EXISTING_PROJECT_SLICING_PLAN.md', [
  'governance-only during S0-S8',
])
requireAll('docs/launch/050_CUTOVER_ROLLBACK_PLAN.md', [
  'not a runtime cutover switch',
  'registry code rollback',
])
requireAll('docs/product/creator-pivot-v2-contract.md', [
  'governance metadata, not a runtime cutover switch',
])

const retiredWorkspaceCompatibilityPath = 'app/src/components/creator/workspace/CreatorWritingWorkspace.tsx'
const retiredPublishBrowserActionServicePath = 'app/src/apps/creator/routes/creatorPublishBrowserActionService.ts'
const retiredPublishActionServicePath = 'app/src/apps/creator/routes/creatorPublishActionService.ts'
const retiredPublishLoadServicePath = 'app/src/apps/creator/routes/creatorPublishLoadService.ts'
const retiredPublishRoutePath = 'app/src/apps/creator/routes/CreatorPublishRoute.tsx'
const retiredEditorAutosavePlaceholderPath = 'app/src/apps/creator/routes/creatorEditorAutosaveService.ts'
const retiredCreatorTaskCardPath = 'app/src/components/creator/CreatorTaskCard.tsx'

if (existsSync(resolve(root, retiredWorkspaceCompatibilityPath))) {
  failures.push(`Retired legacy workspace barrel must stay deleted: ${retiredWorkspaceCompatibilityPath}`)
}

if (existsSync(resolve(root, retiredPublishBrowserActionServicePath))) {
  failures.push(`Retired publish browser service identity must stay deleted: ${retiredPublishBrowserActionServicePath}`)
}

for (const path of [retiredPublishActionServicePath, retiredPublishLoadServicePath]) {
  if (existsSync(resolve(root, path))) {
    failures.push(`Retired publish service identity must stay deleted: ${path}`)
  }
}

if (existsSync(resolve(root, retiredPublishRoutePath))) {
  failures.push(`Retired publish route identity must stay deleted: ${retiredPublishRoutePath}`)
}

if (existsSync(resolve(root, retiredEditorAutosavePlaceholderPath))) {
  failures.push(`Zero-consumer disabled autosave placeholder must stay deleted: ${retiredEditorAutosavePlaceholderPath}`)
}

if (existsSync(resolve(root, retiredCreatorTaskCardPath))) {
  failures.push(`Retired nested Today task-card owner must stay deleted: ${retiredCreatorTaskCardPath}`)
}

requireAll('app/src/apps/creator/routes/CreatorPublishBundleRoute.tsx', [
  'export function CreatorPublishBundleRoute',
])

requireAll('app/src/apps/creator/routes/creatorPublishBundleBrowserActionService.ts', [
  'export interface CreatorPublishBundleBrowserPort',
  'export function scheduleCreatorPublishBundleContextLoad',
  'export function scheduleCreatorPublishBundleRouteDraftRefresh',
  'export function downloadCreatorPublishBundle',
  'export async function readCreatorPublishBundleReceiptFile',
])

requireAll('app/src/apps/creator/routes/creatorPublishBundleActionService.ts', [
  'export interface CreatorPublishBundleSubmitPort',
  'export interface CreatorPublishBundleAuthorConfirmation',
  'export async function runCreatorPreparePublishBundle',
  'export function importCreatorPublishBundleReceipt',
])

requireAll('app/src/apps/creator/routes/creatorPublishBundleLoadService.ts', [
  'export interface CreatorPublishBundleContextApiPort',
  'export interface CreatorPublishBundleLocalReadPort',
  'export function readCreatorPublishBundleRouteRefs',
  'export async function runCreatorPublishBundleContextLoad',
])

requireAll('app/src/apps/creator/routes/creatorPublishBundleRouteController.ts', [
  'export interface CreatorPublishBundleLocalStateSnapshot',
  'export interface CreatorPublishBundleLocalStatePatch',
  'export function resolveCreatorPublishBundleInitialActiveDraftRef',
  'export function resolveCreatorPublishBundleContextSnapshotPatch',
  'export function resolveCreatorPublishBundleRouteDraftRefreshPatch',
  'export function resolveCreatorPublishBundleManualRefreshPatch',
])

requireAll('app/src/apps/creator/routes/creatorPublishBundleReactPatchApplier.ts', [
  'export interface CreatorPublishBundleLocalStatePatchSetters',
  'export function applyCreatorPublishBundleLocalStatePatchToReact',
])

requireAll('app/src/apps/creator/routes/creatorPublishBundleRouteViewModels.ts', [
  'export interface CreatorPublishBundleRouteViewModelInput',
  'export function createCreatorPublishBundleRouteViewModel',
  'publishBundleInput: CreatorPublishBundleInput | null',
])

requireAll('app/src/apps/creator/routes/creatorPublishBundleRouteEffectService.ts', [
  'export interface CreatorPublishBundleContextStatePatch',
  'export interface CreatorPublishBundleRouteEffectPort',
  'export async function runCreatorPublishBundleContextEffect',
  'export async function runCreatorPublishBundleRouteDraftRefreshEffect',
  'export async function runCreatorPublishBundleManualRefreshEffect',
])

requireAll('app/src/apps/creator/routes/creatorPublishLifecycleViewModels.ts', [
  'export function resolveCreatorPublishBundleActiveRecord',
  'export function createPublishBundleLifecycleViewModel',
])

forbidPatterns('app/src/apps/creator/routes/creatorPublishBundleRouteController.ts', [
  [/from ['"]react['"]/, 'React dependency'],
  [/@\/components\//, 'UI component dependency'],
  [/@\/local-db\/creatorLocal/, 'local repository dependency'],
  [/@\/lib\/pmfSupabase/, 'Supabase dependency'],
  [/\b(?:window|document)\./, 'browser global dependency'],
  [/\bfetch\s*\(/, 'network dependency'],
])

forbidPatterns('app/src/apps/creator/routes/creatorPublishBundleRouteViewModels.ts', [
  [/from ['"]react['"]/, 'React dependency'],
  [/@\/components\//, 'UI component dependency'],
  [/@\/local-db\/creatorLocal/, 'local repository dependency'],
  [/@\/lib\/pmfSupabase/, 'Supabase dependency'],
  [/\b(?:window|document)\./, 'browser global dependency'],
  [/\bfetch\s*\(/, 'network dependency'],
])

forbidPatterns('app/src/apps/creator/routes/creatorPublishBundleRouteEffectService.ts', [
  [/from ['"]react['"]/, 'React dependency'],
  [/@\/components\//, 'UI component dependency'],
  [/@\/local-db\/creatorLocal/, 'direct local repository dependency'],
  [/\b(?:window|document)\./, 'browser global dependency'],
  [/\bfetch\s*\(/, 'network dependency'],
])

forbidPatterns('app/src/apps/creator/routes/CreatorPublishBundleRoute.tsx', [
  [/const activeDraft = routeDraftRef/, 'active draft selection logic'],
  [/const mustGates =/, 'publish gate derivation'],
  [/function publishBundleInput\(\)/, 'PublishBundle input construction'],
  [/runCreatorPublishBundleContextLoad\(\)/, 'direct context load invocation'],
  [/runCreatorPublishBundleLocalLoad\(/, 'direct local load invocation'],
])

for (const [path, exports] of [
  ['app/src/components/creator/workspace/CreatorWorkspaceShell.tsx', ['export function CreatorShortcutBar', 'export function CreatorWritingWorkspaceFrame']],
  ['app/src/components/creator/workspace/CreatorDestinationPanels.tsx', ['export function CreatorDestinationPanel', 'export function CreatorBundleReadinessPanel']],
  ['app/src/components/creator/workspace/CreatorSocraticPanels.tsx', ['export function CreatorGuidedCoachFrame', 'export function CreatorSocraticPlanBoard', 'export function CreatorLocalSettingLibrary']],
  ['app/src/components/creator/workspace/CreatorAssistantSidecar.tsx', ['export function CreatorAssistantSidecarFrame', 'export function CreatorAssistantSidecarSurface']],
  ['app/src/components/creator/workspace/CreatorCommandPalette.tsx', ['export function CreatorCommandCenterFrame', 'export function CreatorCommandPaletteSurface']],
  ['app/src/components/creator/workspace/CreatorCommandCandidate.tsx', ['export function CreatorCommandCandidateFrame', 'export function CreatorCommandCandidateSurface']],
  ['app/src/components/creator/workspace/CreatorReviewDock.tsx', ['export function CreatorReviewDockFrame', 'export function CreatorReviewCommandBar', 'export function CreatorCreativeReviewDock']],
  ['app/src/components/creator/workspace/CreatorPlanningPanels.tsx', ['export function CreatorStoryFlowRail', 'export function CreatorChapterPlannerPanel']],
  ['app/src/components/creator/workspace/CreatorInlineAssistantPanels.tsx', ['export function CreatorEditorAssistPanel', 'export function CreatorInlineAssistBar', 'export function CreatorWritingCommandShelf']],
  ['app/src/components/creator/workspace/CreatorAgentAssistantPanels.tsx', ['export function CreatorAgentWritingAssistantPanel', 'export function CreatorAgentComposer', 'export function CreatorAssistantDock']],
]) {
  requireAll(path, exports)
}
requireAll('app/src/components/creator/workspace/CreatorSocraticPanels.tsx', [
  'data-slot="creator-socratic-plan-board"',
  'data-slot="creator-socratic-stage-list"',
  'data-slot="creator-socratic-stage"',
  'data-slot="creator-socratic-active-stage"',
  'data-slot="creator-socratic-asset-kinds"',
  'data-slot="creator-socratic-capture-action"',
])

for (const path of collectSourceFiles('app/src')) {
  const body = read(path)
  if (/(?:from\s+|import\s*\()\s*['"][^'"]*CreatorWritingWorkspace['"]/.test(body)) {
    failures.push(`${path} imports the retired CreatorWritingWorkspace compatibility barrel`)
  }
  if (/\bCreatorPublishReadiness(?:Panel|Item|PanelProps)\b/.test(body)) {
    failures.push(`${path} contains the retired CreatorPublishReadiness identifier family`)
  }
  if (/\b(?:CreatorPublishBrowserPort|scheduleCreatorPublishEffect|scheduleCreatorPublishContextLoad|scheduleCreatorPublishRouteDraftRefresh|readCreatorPublishReceiptFile)\b/.test(body)) {
    failures.push(`${path} contains a retired CreatorPublish browser-service identifier`)
  }
  if (/\b(?:CreatorPublishContextApiPort|CreatorPublishLocalReadPort|CreatorPublishRouteRefInput|CreatorPublishLocalSnapshot|RunCreatorPublishContextLoadResult|readCreatorPublishRouteRefs|resolveCreatorPublishRouteDraftRef|readCreatorPublishLocalSnapshot|runCreatorPublishLocalLoad|resolveCreatorPublishActiveBundle|runCreatorPublishContextLoad|CreatorPublishSubmitPort|CreatorPublishAuthorConfirmation|importCreatorPublishReceipt)\b/.test(body)) {
    failures.push(`${path} contains a retired CreatorPublish load/action-service identifier`)
  }
  if (/\bCreatorPublishRoute\b/.test(body)) {
    failures.push(`${path} contains the retired CreatorPublishRoute identity`)
  }
  if (/\b(?:editorAutosaveDebounceMs|EditorAutosave(?:Mode|DisabledReason|Policy|Candidate|Decision)|resolveEditorAutosave(?:Policy|Decision))\b/.test(body)) {
    failures.push(`${path} contains a retired disabled-autosave placeholder identifier`)
  }
}

const retiredRequestComponentPaths = [
  'app/src/components/creator/CreatorRequestQueueCard.tsx',
  'app/src/components/creator/CreatorRequestStatusStrip.tsx',
  'app/src/components/creator/CreatorRequestDecisionPanels.tsx',
  'app/src/components/creator/CreatorRequestWritingRail.tsx',
]

for (const path of retiredRequestComponentPaths) {
  if (existsSync(resolve(root, path))) failures.push(`Retired legacy request component must stay deleted: ${path}`)
}

const retiredSettingsToolPath = 'app/src/components/creator/CreatorSettingsToolPanel.tsx'
if (existsSync(resolve(root, retiredSettingsToolPath))) {
  failures.push(`Retired author-facing tool settings component must stay deleted: ${retiredSettingsToolPath}`)
}

const retiredStudioPagePath = 'app/src/pages/Studio.tsx'
const retiredWelcomePagePath = 'app/src/pages/Welcome.tsx'
const internalStudioOpsSurfacePath = 'app/src/features/internal-ops/StudioOpsSurface.tsx'

if (existsSync(resolve(root, retiredStudioPagePath))) {
  failures.push(`Retired routed Studio page must stay deleted: ${retiredStudioPagePath}`)
}

if (existsSync(resolve(root, retiredWelcomePagePath))) {
  failures.push(`Retired zero-consumer Welcome page must stay deleted: ${retiredWelcomePagePath}`)
}

const readerApp = read('app/src/App.tsx')
if (!/<Route\s+path=["']\/welcome["']\s+element=\{<Home\s*\/>\}\s*\/>/.test(readerApp)) {
  failures.push('Reader /welcome compatibility route must remain owned by the current Home surface')
}
if (/(?:from\s+|import\s*\()\s*['"][^'"]*pages\/Welcome['"]/.test(readerApp)) {
  failures.push('Reader app must not import the retired Welcome page')
}

requireAll(internalStudioOpsSurfacePath, [
  'export function StudioOpsSurface',
  'marketApi.scanTrends',
  'runtimeApi.evaluateQuality',
  'runtimeApi.commitCanon',
  'StudioTrendOpsPanel',
  'CapabilityMapPanel',
])
forbidPatterns(internalStudioOpsSurfacePath, [
  [/export default/, 'default page export on the internal Studio ops contract'],
])

requireAll('app/src/components/creator/CreatorWorkspacePreferencesPanel.tsx', [
  'export function CreatorWorkspacePreferencesPanel',
  'creator-workspace-preferences-panel',
  'ConfirmActionDialog',
])
requireAll('app/src/components/creator/CreatorLocalWorkspacePanel.tsx', [
  'export function CreatorLocalWorkspacePanel',
  '<Card',
  'variant="glass"',
  'padding="none"',
  'CardFooter',
  'AlertTitle',
  'Separator',
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
  '<dl',
  '<ul',
  '<ol',
])
forbidPatterns('app/src/components/creator/CreatorLocalWorkspacePanel.tsx', [
  [/rounded-(?:lg|xl)/, 'nested rounded card-wall presentation in Local Workspace'],
  [/pu-motion-lift/, 'decorative lift motion in Local Workspace'],
])
requireAll('app/src/components/creator/CreatorSettingsStatusRail.tsx', [
  'export function CreatorSettingsStatusRail',
  '<Card',
  'variant="glass"',
  'padding="none"',
  'Separator',
  'data-slot="creator-settings-status-rail"',
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
])
forbidPatterns('app/src/components/creator/CreatorSettingsStatusRail.tsx', [
  [/rounded-(?:lg|xl)/, 'nested rounded card-wall presentation in Settings status rail'],
  [/pu-motion-lift/, 'decorative lift motion in Settings status rail'],
])
requireAll('app/src/components/creator/CreatorSettingsBoundaryStrip.tsx', [
  'export function CreatorSettingsBoundaryStrip',
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
])
forbidPatterns('app/src/components/creator/CreatorSettingsBoundaryStrip.tsx', [
  [/variant=["']glass["']/, 'nested glass in the Local Workspace boundary strip'],
  [/pu-motion-lift/, 'decorative lift motion in the Local Workspace boundary strip'],
  [/<Card(?:Header|Title|Description)\b/, 'four-card wall structure in the Local Workspace boundary strip'],
])
requireAll('app/src/local-db/legacyCreatorToolSettings.ts', [
  'export function readLegacyCreatorToolSettings',
  'creatorLocalMetaKeys.aiSettings',
])
forbidPatterns('app/src/local-db/legacyCreatorToolSettings.ts', [
  [/upsertLocalMetaValue|writeLegacyCreatorToolSettings/, 'legacy tool-setting write ownership'],
])
for (const path of [
  'app/src/apps/creator/routes/CreatorSettingsRoute.tsx',
  'app/src/components/creator/CreatorAppFrame.tsx',
  'app/src/components/creator/CreatorSettingsBoundaryStrip.tsx',
  'app/src/components/creator/CreatorWorkspacePreferencesPanel.tsx',
]) {
  forbidPatterns(path, [
    [/本地创作服务|自带创作服务|创作服务入口|凭据状态|检查服务/, 'retired author-facing tool settings copy'],
    [/CreatorSettingsToolPanel|checkCreatorSettingsServiceConnection/, 'retired author-facing tool settings owner'],
  ])
}

const retiredPrototypePersistencePaths = [
  'app/src/features/narrative-workbench/usePrototypeScripts.ts',
  'app/src/features/narrative-workbench/useWorkbenchScripts.ts',
]

for (const path of retiredPrototypePersistencePaths) {
  if (existsSync(resolve(root, path))) failures.push(`Retired prototype persistence owner must stay deleted: ${path}`)
}

const retiredNarrativeWorkbenchPath = 'app/src/features/narrative-workbench'
if (existsSync(resolve(root, retiredNarrativeWorkbenchPath))) {
  failures.push(`Zero-consumer narrative workbench prototype must stay deleted: ${retiredNarrativeWorkbenchPath}`)
}

forbidPatterns('app/src/index.css', [
  [/\.narrative-input\b/, 'retired narrative workbench input selector'],
])

const retiredPrototypePatternPaths = [
  'app/src/components/patterns/AuthModal.tsx',
  'app/src/components/patterns/DemoNotice.tsx',
  'app/src/components/patterns/FeatureUnavailable.tsx',
  'app/src/components/patterns/LoadingState.tsx',
  'app/src/components/primitives/Card.ts',
]

for (const path of retiredPrototypePatternPaths) {
  if (existsSync(resolve(root, path))) failures.push(`Zero-consumer prototype pattern must stay deleted: ${path}`)
}

const retiredTokenPrototypePaths = [
  'app/src/components/tokens/AutoDirector.tsx',
  'app/src/components/tokens/BranchCanvas.tsx',
  'app/src/components/tokens/DeviationGauge.tsx',
  'app/src/components/tokens/QuantumField.tsx',
  'app/src/components/tokens/SoulRadar.tsx',
  'app/Fix_Verification_Report.md',
]

for (const path of retiredTokenPrototypePaths) {
  if (existsSync(resolve(root, path))) failures.push(`Zero-consumer token prototype must stay deleted: ${path}`)
}

const retiredTokenPrototypeDirectory = 'app/src/components/tokens'
if (existsSync(resolve(root, retiredTokenPrototypeDirectory))) {
  failures.push(`Zero-consumer token prototype directory must stay deleted: ${retiredTokenPrototypeDirectory}`)
}

forbidPatterns('app/src/index.css', [
  [/@keyframes\s+(?:particle-drift|node-pulse)\b/, 'retired token-prototype animation'],
  [/\.animate-(?:particle-drift|node-pulse)\b/, 'retired token-prototype animation selector'],
])
forbidPatterns('app/src/styles/parallel-universe-tokens.css', [
  [/--deviation-(?:low|mid|high)\s*:/, 'retired unowned deviation token'],
])

const retiredGenericAuthStoragePath = 'app/src/lib/storage.ts'
if (existsSync(resolve(root, retiredGenericAuthStoragePath))) {
  failures.push(`Retired generic auth storage owner must stay deleted: ${retiredGenericAuthStoragePath}`)
}

const retiredDesignVariantMetadataPath = 'app/src/design-system/variants.ts'
if (existsSync(resolve(root, retiredDesignVariantMetadataPath))) {
  failures.push(`Duplicate design-system variant metadata must stay deleted: ${retiredDesignVariantMetadataPath}`)
}

requireAll('app/src/components/ui/button-variants.ts', ['export const buttonVariants = cva'])
requireAll('app/src/components/ui/badge-variants.ts', ['export const badgeVariants = cva'])
requireAll('app/src/components/ui/card-variants.ts', ['export const cardVariants = cva'])

const retiredRealtimePrototypePaths = [
  'app/src/lib/errorSurface.ts',
  'app/src/lib/realtime.ts',
  'app/src/lib/realtime.test.ts',
]
for (const path of retiredRealtimePrototypePaths) {
  if (existsSync(resolve(root, path))) failures.push(`Zero-consumer realtime/error prototype must stay deleted: ${path}`)
}

const retiredHookApiShimPaths = [
  'app/src/hooks/useLibrary.ts',
  'app/src/hooks/useShowcase.ts',
  'app/src/hooks/useSoul.ts',
  'app/src/hooks/useStory.ts',
  'app/src/hooks/useStudio.ts',
  'app/src/api/library.ts',
  'app/src/api/soul.ts',
  'app/src/api/studio.ts',
]
for (const path of retiredHookApiShimPaths) {
  if (existsSync(resolve(root, path))) failures.push(`Zero-consumer Hook/API shim must stay deleted: ${path}`)
}

requireAll('app/src/i18n.ts', [
  "soul: '发现'",
  "story: '阅读'",
  "library: '书城'",
])
forbidPatterns('app/src/i18n.ts', [
  [/\b(?:app|auth|home|storyImport|story|library|showcase|studio|settings|common):\s*\{/, 'unconsumed legacy i18n namespace'],
  [/AI实时生成|上传你自己的故事文本|AI\+人工双重审核|暗物质充值|节点画布|提交作品/, 'retired product-positioning copy in i18n resources'],
])

requireAll('app/src/lib/authSessionStorage.ts', [
  'export const authSessionStorage',
  'getAccessToken',
  'setAccessToken',
  'clear',
])

requireAll('app/src/apps/creator/routes/creatorEditorActionInputController.ts', [
  'export function buildEditorDraftActionInput',
  'export function buildEditorPublishCheckInput',
  'export function buildEditorSettingCaptureInput',
])
forbidPatterns('app/src/apps/creator/routes/creatorEditorActionInputController.ts', [
  [/export interface Editor(?:ActionContext|SettingCapture)Input\b/, 'unconsumed public Editor action-input type'],
])
forbidPatterns('app/src/apps/creator/routes/creatorEditorRouteController.ts', [
  [/export interface CreatorEditor(?:CreativeReminderRef|BootstrapInput|DraftRestore|RequestSeed|RouteBranchRestore)\b/, 'unconsumed public Editor route-controller leaf type'],
])
forbidPatterns('app/src/apps/creator/routes/creatorEditorDraftController.ts', [
  [/export interface (?:EditorDraftSaveBlocker|BuildEditorLocalDraftInput)\b/, 'unconsumed public Editor draft-controller leaf type'],
])
forbidPatterns('app/src/apps/creator/routes/creatorEditorSettingAssetController.ts', [
  [/export (?:interface|type) EditorSettingAssetDraft(?:Resolution)?\b/, 'unconsumed public Editor setting-asset leaf type'],
])
forbidPatterns('app/src/apps/creator/routes/creatorEditorSelectionController.ts', [
  [/export interface ResolveEditorSelectedRequestInput\b/, 'unconsumed public Editor selection-input type'],
])
forbidPatterns('app/src/apps/creator/routes/creatorEditorUserActionController.ts', [
  [/export interface ResolveAssistantSuggestionAcceptanceInput\b/, 'unconsumed public Editor user-action input type'],
])
forbidPatterns('app/src/apps/creator/routes/creatorEditorAgentExecutionService.ts', [
  [/export interface EditorAgentExecutionResult\b/, 'unconsumed public Editor Agent-execution result type'],
])
forbidPatterns('app/src/apps/creator/routes/creatorEditorCommandEventService.ts', [
  [/export interface EditorCommandEventContext\b/, 'unconsumed public Editor command-event context type'],
])
forbidPatterns('app/src/apps/creator/routes/creatorEditorCommandFlowService.ts', [
  [/export interface ResolveEditorCommandPatchFlowInput\b/, 'unconsumed public Editor command-flow input type'],
])
forbidPatterns('app/src/apps/creator/routes/creatorEditorDraftActionFlowService.ts', [
  [/export interface RunEditor(?:ManualDraftAction|PublishCheck)Flow(?:Input|Result)\b/, 'unconsumed public Editor draft-action flow type'],
])
forbidPatterns('app/src/apps/creator/routes/creatorEditorDraftActionService.ts', [
  [/export interface RunEditorDraftActionResult\b/, 'unconsumed public Editor draft-action result type'],
])
forbidPatterns('app/src/apps/creator/routes/creatorEditorDraftLoadService.ts', [
  [/export interface RunEditorDraftLoadResult\b/, 'unconsumed public Editor draft-load result type'],
])
forbidPatterns('app/src/apps/creator/routes/creatorEditorReminderService.ts', [
  [/export interface RunEditorReminder(?:LoadResult|BootstrapInput)\b/, 'unconsumed public Editor reminder service type'],
])
forbidPatterns('app/src/apps/creator/routes/creatorEditorSettingAssetService.ts', [
  [/export interface RunEditorSettingAssetLoadResult\b/, 'unconsumed public Editor setting-asset load result type'],
])
forbidPatterns('app/src/apps/creator/routes/creatorEditorStartupEffectService.ts', [
  [/export (?:interface|type) (?:CancelEditorStartupEffect|EditorStartupEffectCurrentState|RunEditorStartupEffectInput)\b/, 'unconsumed public Editor startup-effect type'],
])
forbidPatterns('app/src/apps/creator/routes/creatorEditorStartupLoadService.ts', [
  [/export interface EditorStartupLocalSnapshot\b/, 'unconsumed public Editor startup local-snapshot type'],
  [/type PmfCreativeReminder\b/, 'local reminder type imported through the cloud facade'],
])
forbidPatterns('app/src/apps/creator/routes/creatorEditorStartupPatchController.ts', [
  [/export interface CreatorEditorStartupPatchInput\b/, 'unconsumed public Editor startup-patch input type'],
])
forbidPatterns('app/src/apps/creator/routes/creatorEditorCommandPatchController.ts', [
  [/export interface ResolveEditorCommand(?:Candidate)?StatePatchInput\b/, 'unconsumed public Editor command-patch input type'],
])
forbidPatterns('app/src/apps/creator/routes/creatorEditorDestinationController.ts', [
  [/export interface EditorIfBranchOption\b/, 'unconsumed public Editor IF-branch option type'],
])
forbidPatterns('app/src/apps/creator/routes/creatorEditorSocraticViewModels.ts', [
  [/export type SocraticQuestionChoice\b/, 'unconsumed public Editor Socratic choice type'],
])
forbidPatterns('app/src/apps/creator/routes/creatorWorksLoadService.ts', [
  [/export interface CreatorWorksSelectionPatch\b/, 'unconsumed public Works selection-patch type'],
])
forbidPatterns('app/src/apps/creator/routes/creatorWorksRouteViewModels.ts', [
  [/export interface CreatorWorksDecisionStep\b/, 'unconsumed public Works decision-step type'],
])
forbidPatterns('app/src/agent-surface/confirmation.ts', [
  [/export type UpdateCreatorAgentConfirmationResult\b/, 'unconsumed public Agent confirmation-result type'],
])
forbidPatterns('app/src/agent-surface/executor.ts', [
  [/export type CreatorAgentActionHandler\b/, 'unconsumed public Agent handler leaf type'],
  [/export interface CreatorAgentExecutorRequest\b/, 'unconsumed public Agent executor-request type'],
  [/export type CreatorAgentExecutorResult\b/, 'unconsumed public Agent executor-result type'],
])
forbidPatterns('app/src/agent-surface/operationFlow.ts', [
  [/export interface CreatorCommandCandidateStartInput\b/, 'unconsumed public Agent candidate-start input type'],
])
forbidPatterns('app/src/agent-surface/operationLog.ts', [
  [/export function createCreatorAgentOperationEvent\b/, 'unconsumed public Agent operation-event constructor'],
])
forbidPatterns('app/src/features/creator-pivot/creativeReminderEngine.ts', [
  [/export function reminderSourceIds\b/, 'unconsumed public CreativeReminder source-id helper'],
])
forbidPatterns('app/src/features/creator-pivot/externalEchoAdapters.ts', [
  [/export function hashReaderSignalContent\b/, 'unconsumed public ReaderSignal hash helper'],
])
forbidPatterns('app/src/features/creator-pivot/externalEchoCloudProjection.ts', [
  [/export interface ExternalEchoCloudCursor\b/, 'unconsumed public External Echo cursor leaf type'],
])
forbidPatterns('app/src/features/creator-pivot/externalEchoContracts.ts', [
  [/export interface ReaderSignalSourceRecordBase\b/, 'unconsumed public ReaderSignal base-record type'],
])
forbidPatterns('app/src/features/creator-pivot/publishBundleDraftHandoff.ts', [
  [/export const publishBundleDraftIdPrefix\b/, 'unconsumed public PublishBundle draft-id prefix'],
  [/export interface ResolvePublishBundleDraftRouteInput\b/, 'unconsumed public PublishBundle route-resolution input type'],
])
requireAll('app/src/components/creator/CreatorEchoQueueCard.tsx', ['export function CreatorEchoQueueCard'])
requireAll('app/src/components/creator/CreatorEchoStatusStrip.tsx', ['export function CreatorEchoStatusStrip'])
requireAll('app/src/components/creator/CreatorEchoDecisionPanels.tsx', [
  'export function CreatorEchoNextActionPanel',
  'export function CreatorEchoDecisionPanel',
])
requireAll('app/src/components/creator/CreatorEchoWritingRail.tsx', ['export function CreatorEchoWritingRail'])
requireAll('app/src/apps/creator/routes/creatorEchoRouteViewModels.ts', [
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
forbidPatterns('app/src/apps/creator/routes/creatorEchoRouteViewModels.ts', [
  [/from ['"]react['"]/, 'React dependency in External Echo route view model'],
  [/lucide-react/, 'icon dependency in External Echo route view model'],
  [/@\/components\//, 'UI dependency in External Echo route view model'],
  [/@\/lib\/pmfSupabase/, 'Supabase dependency in External Echo route view model'],
  [/from ['"]@\/local-db\/creator/, 'repository dependency in External Echo route view model'],
  [/\b(?:window|document)\./, 'browser dependency in External Echo route view model'],
  [/\bfetch\s*\(/, 'network dependency in External Echo route view model'],
  [/\bnavigate\s*\(/, 'navigation dependency in External Echo route view model'],
])
forbidPatterns('app/src/apps/creator/routes/CreatorEchoRoute.tsx', [
  [/buildRequestClusterCounts\(requests\)/, 'External Echo route rebuilding cluster counts'],
  [/resolveVisibleEchoSignals\(readerSignals, creativeReminders/, 'External Echo route rebuilding filtered signals'],
  [/resolve(?:Reminder|Request)ForSignal\(/, 'External Echo route rebuilding signal associations'],
  [/const savedViews:/, 'External Echo route rebuilding saved-view metadata'],
  [/new Map\(works\.map\(/, 'External Echo route rebuilding work maps'],
  [/回声已更新为「\$\{requestStatusLabel\(/, 'External Echo route rebuilding request action result copy'],
  [/创作提醒已更新为「\$\{creativeReminderStatusLabel\(/, 'External Echo route rebuilding reminder action result copy'],
])
requireAll('app/src/apps/creator/routes/creatorEchoActionService.ts', [
  'creatorFacingNotice(result.message)',
  'notice: `回声已更新为「${requestStatusLabel(result.data.status)}」。`',
  'notice: `创作提醒已更新为「${creativeReminderStatusLabel(updated.status)}」。`',
])
requireAll('app/src/apps/creator/routes/creatorDashboardRouteViewModels.ts', [
  'export interface CreatorDashboardRouteViewModelInput',
  'export interface CreatorDashboardRouteViewModel',
  'export function createCreatorDashboardRouteViewModel',
])
forbidPatterns('app/src/apps/creator/routes/creatorDashboardRouteViewModels.ts', [
  [/from ['"]react['"]/, 'React dependency in Today route view model'],
  [/@\/components\//, 'UI dependency in Today route view model'],
  [/@\/local-db\//, 'repository dependency in Today route view model'],
  [/@\/lib\/pmfSupabase/, 'Supabase dependency in Today route view model'],
  [/\b(?:window|document)\./, 'browser dependency in Today route view model'],
  [/\bfetch\s*\(/, 'network dependency in Today route view model'],
])
forbidPatterns('app/src/apps/creator/routes/CreatorDashboardRoute.tsx', [
  [/\b(?:byNewestDraft|byRequestPriority|isDraftReadyForPublish)\b/, 'Today route rebuilding pure priority decisions'],
  [/<aside className="space-y-4">[\s\S]*?<Panel/, 'Today route rebuilding stacked context Panels'],
])
requireAll('app/src/components/creator/CreatorTodayContextRail.tsx', [
  'export function CreatorTodayContextRail',
  'data-slot="creator-today-context-rail"',
  'data-slot="creator-today-context-list"',
  'aria-label="当前创作上下文"',
])
forbidPatterns('app/src/components/creator/CreatorTodayContextRail.tsx', [
  [/<Panel/, 'nested generic Panel in Today context rail'],
  [/LiquidGlass/, 'direct LiquidGlass composition in Today context rail'],
  [/pu-motion-lift/, 'dashboard-card lift behavior in Today context rail'],
])

requireAll('app/src/apps/creator/routes/creatorWorksRouteViewModels.ts', [
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
requireAll('app/src/apps/creator/routes/creatorWorksActionFlowService.ts', [
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
forbidPatterns('app/src/apps/creator/routes/creatorWorksActionFlowService.ts', [
  [/from ['"]react['"]/, 'React dependency in Works action flow'],
  [/lucide-react/, 'icon dependency in Works action flow'],
  [/@\/components\//, 'UI dependency in Works action flow'],
  [/@\/local-db\//, 'repository dependency in Works action flow'],
  [/@\/lib\/pmfSupabase/, 'Supabase dependency in Works action flow'],
  [/\b(?:window|document)\./, 'browser dependency in Works action flow'],
  [/\bfetch\s*\(/, 'network dependency in Works action flow'],
  [/\bnavigate\s*\(/, 'navigation dependency in Works action flow'],
])
forbidPatterns('app/src/apps/creator/routes/creatorWorksRouteViewModels.ts', [
  [/from ['"]react['"]/, 'React dependency in Works route view model'],
  [/lucide-react/, 'icon dependency in Works route view model'],
  [/@\/components\//, 'UI dependency in Works route view model'],
  [/@\/local-db\//, 'repository dependency in Works route view model'],
  [/@\/lib\/pmfSupabase/, 'Supabase dependency in Works route view model'],
  [/\b(?:window|document)\./, 'browser dependency in Works route view model'],
  [/\bfetch\s*\(/, 'network dependency in Works route view model'],
  [/\bnavigate\s*\(/, 'navigation dependency in Works route view model'],
])
forbidPatterns('app/src/apps/creator/routes/CreatorWorksRoute.tsx', [
  [/\brequestCountForBranch\s*\(/, 'Works route rebuilding branch request counts'],
  [/new Map<string, PmfChapter\[\]>/, 'Works route rebuilding chapter groups'],
  [/request\.status !== ['"]published['"]/, 'Works route rebuilding open-request counts'],
  [/selectedBranch\?\.branch_type === ['"]if['"]/, 'Works route rebuilding branch guidance'],
  [/branches\.filter\(branch => branch\.work_id === work\.id\)/, 'Works route rebuilding manual work selection'],
  [/\brunCreatorWorkNoticeSave\s*\(/, 'Works route calling lower notice action'],
  [/\brunCreatorWorkHide\s*\(/, 'Works route calling lower hide action'],
  [/\brunCreatorBranchArchive\s*\(/, 'Works route calling lower archive action'],
  [/\brunCreatorIfBranchCreate\s*\(/, 'Works route calling lower IF branch action'],
])

requireAll('app/src/apps/creator/routes/creatorSettingsRouteViewModels.ts', [
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
requireAll('app/src/apps/creator/routes/creatorSettingsBrowserActionService.ts', [
  'export interface CreatorSettingsBrowserPort',
  'export interface CreatorSettingsBrowserTimerPort',
  'export function applyCreatorSettingsDisplayPreferences',
  'export function downloadCreatorWorkspacePackage',
  'export function scheduleCreatorSettingsActionReset',
  'export function scheduleCreatorSettingsRouteEffect',
])
requireAll('app/src/apps/creator/routes/creatorSettingsWorkspaceExportFlowService.ts', [
  'export interface CreatorSettingsWorkspaceExportFlowPort',
  'export async function runCreatorSettingsWorkspaceExport',
  'readWorkspaceSnapshot: readCreatorSettingsWorkspaceSnapshot',
  'buildWorkspacePackage: buildLocalWorkspacePackage',
  'downloadWorkspacePackage: downloadCreatorWorkspacePackage',
])
forbidPatterns('app/src/apps/creator/routes/creatorSettingsActionService.ts', [
  [/CreatorSettingsActionResetPort/, 'browser timer port in Settings action service'],
  [/scheduleCreatorSettings(?:ActionReset|RouteEffect)/, 'browser scheduler in Settings action service'],
  [/\bwindow\./, 'browser dependency in Settings action service'],
])
forbidPatterns('app/src/apps/creator/routes/creatorSettingsRouteViewModels.ts', [
  [/export interface CreatorSettings(?:WorkspaceSummary|Operation|Permission)Item\b/, 'unconsumed public Settings leaf view-model type'],
  [/from ['"]react['"]/, 'React dependency in Settings route view model'],
  [/lucide-react/, 'icon dependency in Settings route view model'],
  [/@\/components\//, 'UI dependency in Settings route view model'],
  [/@\/local-db\//, 'repository dependency in Settings route view model'],
  [/@\/lib\/pmfSupabase/, 'Supabase dependency in Settings route view model'],
  [/\b(?:window|document)\./, 'browser dependency in Settings route view model'],
  [/\bfetch\s*\(/, 'network dependency in Settings route view model'],
  [/\bnavigate\s*\(/, 'navigation dependency in Settings route view model'],
])
forbidPatterns('app/src/apps/creator/routes/CreatorSettingsRoute.tsx', [
  [/const flagMap = new Map\(/, 'Settings route rebuilding feature-flag map'],
  [/function flag(?:Label|State)\(/, 'Settings route rebuilding feature-flag labels'],
  [/workspaceSnapshot\.operationRecords\.slice\(/, 'Settings route rebuilding operation rows'],
  [/workspaceSummaryItems\.reduce\(/, 'Settings route rebuilding workspace counts'],
  [/creatorAgentActions\.filter\(/, 'Settings route rebuilding Agent permission counts'],
  [/\bbuildLocalWorkspacePackage\s*\(/, 'Settings route building workspace packages directly'],
  [/\breadCreatorSettingsWorkspaceSnapshot\s*\(/, 'Settings route reading export snapshots directly'],
  [/\bdownloadCreatorWorkspacePackage\s*\(/, 'Settings route downloading workspace packages directly'],
  [/\bnew Date\s*\(/, 'Settings route owning export clock'],
])
forbidPatterns('app/src/apps/creator/routes/creatorSettingsWorkspaceExportFlowService.ts', [
  [/from ['"]react['"]/, 'React dependency in Settings workspace export flow'],
  [/@\/components\//, 'UI dependency in Settings workspace export flow'],
  [/\b(?:window|document)\./, 'direct browser dependency in Settings workspace export flow'],
  [/\bfetch\s*\(/, 'network dependency in Settings workspace export flow'],
  [/\bnavigate\s*\(/, 'navigation dependency in Settings workspace export flow'],
  [/@\/lib\/pmfSupabase/, 'Supabase dependency in Settings workspace export flow'],
])

const retiredPublishComponentPaths = [
  'app/src/components/creator/CreatorPublishContextPanel.tsx',
  'app/src/components/creator/CreatorPublishImpactStrip.tsx',
  'app/src/components/creator/CreatorPublishReviewPanel.tsx',
]

for (const path of retiredPublishComponentPaths) {
  if (existsSync(resolve(root, path))) failures.push(`Retired legacy publish component must stay deleted: ${path}`)
}

requireAll('app/src/components/creator/CreatorPublishBundleContextPanel.tsx', ['export function CreatorPublishBundleContextPanel'])
requireAll('app/src/components/creator/CreatorPublishBundleImpactStrip.tsx', ['export function CreatorPublishBundleImpactStrip'])
requireAll('app/src/components/creator/CreatorPublishBundleReviewPanel.tsx', ['export function CreatorPublishBundleReviewPanel'])
requireAll('app/src/components/creator/CreatorPublishBundlePanels.tsx', [
  "from './CreatorPublishBundleContextPanel'",
  "from './CreatorPublishBundleImpactStrip'",
  "from './CreatorPublishBundleReviewPanel'",
])

for (const path of [
  'app/src/components/creator/CreatorPublishBundleContextPanel.tsx',
  'app/src/components/creator/CreatorPublishBundleImpactStrip.tsx',
  'app/src/components/creator/CreatorPublishBundleReviewPanel.tsx',
  'app/src/index.css',
]) {
  forbidPatterns(path, [[/creator-publish-(?:context-panel|context-row|impact-strip|review-panel)/, 'legacy creator-publish DOM/CSS hooks']])
}

for (const path of [
  'app/src/components/creator/CreatorEchoQueueCard.tsx',
  'app/src/components/creator/CreatorEchoStatusStrip.tsx',
  'app/src/components/creator/CreatorEchoDecisionPanels.tsx',
  'app/src/components/creator/CreatorEchoWritingRail.tsx',
  'app/src/index.css',
]) {
  forbidPatterns(path, [[/creator-request-[a-z0-9-]+/, 'legacy creator-request CSS hooks']])
}

forbidPatterns('app/src/components/creator/CreatorExternalEchoInboxCard.tsx', [
  [/CreatorActionBar/, 'nested glass action owner in canonical External Echo inbox card'],
  [/className=\{cn\(['"]creator-external-echo-card/, 'retired External Echo inbox CSS hook'],
])
forbidPatterns('app/src/components/creator/CreatorExternalEchoDetailPanel.tsx', [
  [/CreatorActionBar/, 'nested glass action owner in canonical External Echo detail'],
  [/CreatorStatePanel/, 'nested glass state owner in canonical External Echo detail'],
  [/className=['"]creator-external-echo-detail['"]/, 'retired External Echo detail CSS hook'],
])

const retiredGlobalCssHookPatterns = [
  [/creator-continuation-(?:handoff|head|grid|card)/, 'orphaned Writing Desk continuation CSS hooks'],
  [/creator-editor-(?:assist-head|companion-(?:focus|tags|progress-wrap))/, 'orphaned Writing Desk assistant CSS hooks'],
  [/creator-(?:socratic-row|followup-chip|flow-card|flow-mini)/, 'orphaned Creator conversation/flow CSS hooks'],
  [/reader-toolbar/, 'orphaned Reader toolbar CSS hook'],
  [/(?<!data-)reader-tool-button/, 'retired global Reader tool-button CSS hook'],
  [/(?:book-reco-(?:card|cover)|library-(?:book-row|cover))/, 'orphaned Reader recommendation/library CSS hooks'],
  [/(?<!--)(?:story-card|glass-panel|glow-text-cyan|deviation-(?:low|mid|high)|text-gradient-story)/, 'orphaned generic narrative CSS hooks'],
  [/(?:animation-delay-(?:100|200|300|400|500)|animate-fade-in-up|fade-in-up)/, 'orphaned animation utility CSS hooks'],
  [/\blocal-creator-(?:app|topbar)\b/, 'retired Local Creator shell CSS aliases'],
  [/(?:author-entry-card|phone-(?:shell|screen)|world-(?:cover(?:-flagship)?|mini-(?:card|thumb))|codex-strip|rain-hero)/, 'orphaned presentation-prototype CSS hooks'],
  [/\.choice-card(?:-active)?\b/, 'retired global ChoiceCard CSS selectors'],
  [/\.(?:command-surface|tour-highlight|manuscript-paper)\b/, 'orphaned command, tour, or manuscript prototype CSS selectors'],
  [/\.creator-quality-(?:review|head|kicker|summary|list|issue|evidence-grid|fix-list|fix-title|fix-action|fix-copy|pass|explain)\b/, 'retired global Creator quality-card CSS selectors'],
  [/\.creator-editor-workspace\s+\.creator-progress-rail\b/, 'retired page-global Creator progress-rail selector'],
  [/\.creator-(?:chapter-goal-(?:card|head|actions|grid|item)|flow-index|direction-(?:label|card|kicker|summary|promise|impact))\b/, 'retired global Creator chapter-planner CSS selectors'],
  [/\.creator-flow-(?:stepper|track)\b/, 'retired global Creator flow-stepper CSS selectors'],
  [/\.creator-(?:inline-(?:review|marker(?:-action)?)|editor-review-(?:rail(?:-(?:title|list))?|dot))\b/, 'retired global Creator inline-review CSS selectors'],
  [/\.creator-(?:session-(?:panel|group|group-title|row|empty)|story-map(?:-row|-icon)?|reader-wish-panel)\b/, 'retired global Creator story-context CSS selectors'],
  [/\.creator-(?:destination-(?:panel(?:-(?:header|description|content|body))?|summary|toggle|field(?:-wide)?|control)|publish-readiness-(?:panel|summary|content|list|row))\b/, 'retired global Creator destination/readiness CSS selectors'],
  [/\.creator-command-(?:overlay|panel|brief|context|examples?|suggestion(?:-group|s)?|item|empty)\b/, 'retired global Creator command-palette CSS selectors'],
  [/\.creator-author-decision-(?:card|question|steps)\b/, 'retired global Creator author-decision CSS selectors'],
  [/\.creator-line-card(?:-(?:main|if))?\b/, 'retired global Creator branch-line CSS selectors'],
  [/\.creator-echo-status-(?:strip(?:-content)?|grid|chip|meta)\b/, 'retired global External Echo status-strip CSS selectors'],
  [/\.creator-echo-next-action\b/, 'retired global External Echo next-action root CSS selector'],
  [/\bcreator-echo-(?:next-(?:copy|detail|chips|actions)|quote-label|reader-quote|writing-brief)\b/, 'retired global External Echo next-action CSS hooks'],
  [/\.creator-external-echo-(?:card|detail)\b/, 'retired canonical External Echo card/detail CSS selectors'],
  [/\.creator-today-(?:priority-panel|flow(?:-[a-z-]+)?)\b/, 'retired global Today priority CSS selectors'],
  [/\.creator-task-(?:card(?:-[a-z-]+)?|icon)\b/, 'retired global Today task-card CSS selectors'],
  [/\.creator-today-path-(?:panel|header|list|item|value|action)\b/, 'forbidden page-global Creator Today path CSS selectors'],
  [/\.creator-today-echo-status-(?:panel|header|phase|metrics?|value)\b/, 'forbidden page-global Creator Today Echo status CSS selectors'],
  [/\.creator-today-context-(?:rail|header|phase|list|item)\b/, 'forbidden page-global Creator Today context rail CSS selectors'],
  [/\.creator-work-readiness-(?:panel|header|action|metrics?|list|item)\b/, 'forbidden page-global Creator work-readiness CSS selectors'],
  [/\.creator-settings-boundary-(?:strip|list|item|status|value|detail)\b/, 'forbidden page-global Local Workspace boundary CSS selectors'],
  [/\.creator-local-workspace-(?:panel|summary|permission|operation|backup|export|import)(?:-[a-z-]+)?\b/, 'forbidden page-global Local Workspace panel CSS selectors'],
  [/\.creator-settings-status-(?:rail|card|list|item|value|readiness|boundary|promise)(?:-[a-z-]+)?\b/, 'forbidden page-global Settings status rail CSS selectors'],
  [/\blocal-creator-loop(?:-[a-z-]+)?\b/, 'retired static Today loop CSS hooks'],
  [/\.creator-next-action\s*\{/, 'orphaned Creator next-action CSS selector'],
]

forbidPatterns('app/src/index.css', retiredGlobalCssHookPatterns)
forbidPatterns('app/src/styles/parallel-universe-tokens.css', [
  [/\blocal-creator-(?:app|topbar)\b/, 'retired Local Creator shell token aliases'],
])

forbidPatterns('app/src/lib/adapters.ts', [
  [/(?:WORLD_COVERS|coverImageForWorld|buildChapterViewFromReplay)/, 'retired zero-consumer Reader replay/cover adapter'],
  [/export function (?:isEmailLike|normalizeMembershipTier|availableCreditBalance)\b/, 'unconsumed public identity/membership helper'],
])

forbidPatterns('app/src/components/creator/creatorFrameBoundaryService.ts', [
  [/export interface CreatorFrameShortcutHandlers\b/, 'unconsumed public Creator frame shortcut-handler type'],
])

forbidPatterns('app/src/lib/utils.ts', [
  [/(?:getDeviationColor|formatNumber|formatDate|formatRelative)/, 'retired zero-consumer frontend utility'],
])

forbidPatterns('app/src/types/index.ts', [
  [
    /\b(?:AuthVerificationResponse|CustomerPortalResponse|CustomerExportPayload|AuditExportResponse|FeatureAvailability|DeviationAnalysis|SoulDimension|StudioNode|NodeConnection|MembershipPlan|InkPackage)\b/,
    'retired zero-consumer frontend compatibility type',
  ],
])

forbidPatterns('app/src/api/client.ts', [
  [/\b(?:checkBackend|getBackendStatus|resetBackendStatus)\b/, 'retired zero-consumer backend-status probe or cache hook'],
])

requireAll('app/src/api/index.ts', [
  "export { authApi } from './auth'",
  "export { accountApi } from './account'",
  "export { storyApi } from './story'",
  "export { settingsApi } from './settings'",
  "export { runtimeApi } from './runtime'",
])

forbidPatterns('app/src/api/index.ts', [
  [/from ['"]\.\/client['"]/, 'low-level client compatibility re-export'],
  [/from ['"]\.\/creator['"]/, 'Creator compatibility re-export'],
  [/from ['"]\.\/market['"]/, 'Market compatibility re-export'],
  [/\bCommercialBlueprint(?:Request|Response)\b/, 'Commercial Blueprint compatibility type re-export'],
])

forbidPatterns('app/src/lib/supabase.ts', [
  [/\b(?:ReaderHealthProbe|readReaderHealthProbe)\b|from\(['"]health_probe['"]\)/, 'retired zero-consumer Reader health probe'],
])

forbidPatterns('app/src/lib/pmfSupabase.ts', [
  [/\b(?:PmfStarterWorkInput|ensureStarterWork)\b/, 'retired browser-owned starter-work seed path'],
  [/\b(?:PmfReaderRequestInput|ensureAnonymousReader|createReaderRequest|listPublicRequests|voteForRequest|defaultRequestText)\b/, 'retired duplicate Reader write path in the Creator/cloud facade'],
  [/\.auth\.signInAnonymously\(/, 'Reader anonymous-auth ownership in the Creator/cloud facade'],
  [/@\/local-db\/(?:creatorLocalDraftRepository|creatorLocalSettingAssetRepository|creatorLocalWorkspaceRepository)/, 'local workspace compatibility implementation ownership in the Creator/cloud facade'],
  [/\b(?:readLocalWritingCreativeReminders|upsertLocalWritingCreativeReminder)\b/, 'local reminder implementation ownership in the Creator/cloud facade'],
  [/export type \{[^}]*\b(?:PmfCreativeReminder|PmfCreativeReminderInput|PmfLocalSettingAssetInput|LocalCreatorWorkspaceSnapshot|CreatorDisplayPreferences)\b[^}]*\}/, 'local repository compatibility type re-export'],
  [/export function (?:isLocalCreatorHost|getLocalCreatorClientId|createLocalDraftRef|readLocalDrafts|upsertLocalDraft|createLocalSettingAssetRef|readLocalSettingAssets|upsertLocalSettingAsset|readLocalCreativeReminders|upsertLocalCreativeReminder|readLocalWorkspaceSnapshot|readCreatorDisplayPreferences|writeCreatorDisplayPreferences)\b/, 'retired local repository compatibility wrapper'],
])

forbidPatterns('app/src/features/parallel-universe/simulator.ts', [
  [/\bbuildHarnessStatus\b/, 'retired zero-consumer Reader harness status builder'],
])

forbidPatterns('app/src/features/creator-pivot/externalEchoAdapters.ts', [
  [/\breaderSignalAdapters\b/, 'retired zero-consumer External Echo adapter registry'],
])

forbidPatterns('app/src/local-db/creatorLocalAgentExecutionRepository.ts', [
  [/\breadLocalAgentOperationEvents\b/, 'retired zero-consumer Agent operation-event reader'],
])

forbidPatterns('app/src/local-db/legacyLocalStorageMigration.ts', [
  [/\blegacyLocalStorageMigrationKeys\b/, 'retired zero-consumer legacy storage-key export'],
])

forbidPatterns('app/src/lib/pmfSupabase.ts', [
  [/\bPmfPublishInput\b/, 'retired direct-publish input contract'],
])

forbidPatterns('app/src/__fixtures__/pmfSupabase.creator-qa.ts', [
  [/\bPmfPublishInput\b/, 'retired direct-publish fixture input contract'],
])

forbidPatterns('app/src/features/creator-pivot/publishBundlePackage.ts', [
  [/(?:@\/lib\/pmfSupabase|\bPmfPublishInput\b)/, 'cloud-facade dependency in the local PublishBundle package owner'],
])

requireAll('app/src/local-db/creatorLocalLegacyMigrationApplier.ts', [
  'export async function applyCreatorLocalLegacyMigrationPlan',
  'migrationStore.put(plan.receipt)',
  'await transactionDone(transaction)',
])

requireAll('app/src/local-db/creatorLocalDraftHydration.ts', [
  'export async function restoreCreatorLocalDrafts',
  'readLocalDraftBody(record, bodyMap.get(record.bodyStorage.tableId))',
  "body.status === 'staged'",
])

forbidPatterns('app/src/local-db/creatorLocalRepository.ts', [
  [/async function applyLegacyMigrationPlan/, 'repository-owned legacy migration transaction implementation'],
  [/async function restoreStoredDrafts|function isLocalDraftRecord/, 'repository-owned draft hydration implementation'],
])

for (const path of collectSourceFiles('app/src')) {
  const body = read(path)
  if (/\bCreatorLocalLoopPanel\b/.test(body)) {
    failures.push(`${path} restores the retired static Today loop owner`)
  }
  if (/(?:from\s+|import\s*\()\s*['"][^'"]*CreatorTaskCard['"]/.test(body)) {
    failures.push(`${path} imports the retired nested Today task-card component`)
  }
  if (/(?:from\s+|import\s*\()\s*['"][^'"]*CreatorRequest(?:QueueCard|StatusStrip|DecisionPanels|WritingRail)['"]/.test(body)) {
    failures.push(`${path} imports a deprecated CreatorRequest compatibility component`)
  }
  if (/(?:from\s+|import\s*\()\s*['"][^'"]*CreatorPublish(?:ContextPanel|ImpactStrip|ReviewPanel)['"]/.test(body)) {
    failures.push(`${path} imports a deprecated CreatorPublish compatibility component`)
  }
  if (/(?:from\s+|import\s*\()\s*['"][^'"]*CreatorSettingsToolPanel['"]/.test(body)) {
    failures.push(`${path} imports the retired author-facing tool settings component`)
  }
  if (path !== internalStudioOpsSurfacePath && /(?:from\s+|import\s*\()\s*['"][^'"]*internal-ops\/StudioOpsSurface['"]/.test(body)) {
    failures.push(`${path} imports the unrouted internal Studio ops contract`)
  }
  if (/(?:from\s+|import\s*\()\s*['"][^'"]*lib\/(?:realtime|errorSurface)['"]/.test(body)) {
    failures.push(`${path} imports a retired realtime/error prototype owner`)
  }
  if (/(?:from\s+|import\s*\()\s*['"][^'"]*design-system\/variants['"]/.test(body)) {
    failures.push(`${path} imports retired duplicate design-system variant metadata`)
  }
  if (/\[integration-harness:ws\]|ERROR_SURFACE_MATRIX/.test(body)) {
    failures.push(`${path} restores a retired realtime/error prototype marker`)
  }
  if (/(?:from\s+|import\s*\()\s*['"][^'"]*(?:hooks\/(?:useLibrary|useShowcase|useSoul|useStory|useStudio)|api\/(?:library|soul|studio))['"]/.test(body)) {
    failures.push(`${path} imports a retired Hook/API shim`)
  }
  if (/Public sharing service is outside this reader prototype|Profile backend not available|Canvas authoring backend not available|(?:soul|studio)_unavailable/.test(body)) {
    failures.push(`${path} restores retired Hook/API shim copy`)
  }
  for (const [pattern, description] of retiredGlobalCssHookPatterns) {
    if (pattern.test(body)) failures.push(`${path} must not contain ${description}`)
  }
}

requireAll('scripts/run-governance-gate.ts', [
  'function runGovernanceGate',
  'spawnSync',
  'module.exports = { runGovernanceGate }',
])

requireAll('scripts/check-local-domain-boundary.mjs', [
  "'app/src/agent-surface'",
  "'app/src/features/creator-pivot'",
  "'app/src/local-db'",
  "const cloudAdapterPath = 'app/src/features/creator-pivot/publishBundleAdapter.ts'",
  'cloudDependencyPattern',
  'directNetworkPatterns',
  '[local-domain-boundary] PASS',
])

for (const [path, delegatedOwner] of [
  ['scripts/check-legacy-imports.ts', "runGovernanceGate('check-legacy-imports.mjs')"],
  ['scripts/check-no-old-request-framing.ts', "runGovernanceGate('check-no-old-request-framing.mjs')"],
  ['scripts/check-no-localstorage-outside-migration.ts', "runGovernanceGate('check-no-localstorage-outside-migration.mjs')"],
  ['scripts/check-publish-bundle-schema.ts', "runGovernanceGate('check-publish-bundle-schema.mjs')"],
]) {
  requireAll(path, ['runGovernanceGate', delegatedOwner])
}

requireAll('package.json', [
  'node --experimental-strip-types scripts/check-legacy-imports.ts',
  'node --experimental-strip-types scripts/check-no-old-request-framing.ts',
  'node --experimental-strip-types scripts/check-no-localstorage-outside-migration.ts',
  'node --experimental-strip-types scripts/check-publish-bundle-schema.ts',
  'node --experimental-strip-types scripts/check-local-migration-fixture.mjs',
  '"check:pivot"',
  '"check:local-domain-boundary"',
  '"qa:local-db-migration"',
])

requireAll('AGENTS.md', [
  'Creator Pivot V2 Rules',
  'Do not redesign Creator pages before the relevant contract',
])

if (failures.length) {
  console.error('[slicing] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[slicing] PASS')
