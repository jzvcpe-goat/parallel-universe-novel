import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const appRoot = join(root, 'app')
const failures = []

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

function assert(condition, message) {
  if (!condition) failures.push(message)
}

const appText = read('app/src/App.tsx')
const navBlock = appText.match(/const navItems = \[([\s\S]*?)\n\s*\]/)?.[1] || ''
const publicNavLabels = ['soul', 'story', 'library', 'member']
const backstageNavLabels = ['create', 'studio', 'settings', 'billing']

for (const id of publicNavLabels) {
  assert(navBlock.includes(`id: '${id}'`), `App public nav is missing ${id}.`)
}
for (const id of backstageNavLabels) {
  assert(!navBlock.includes(`id: '${id}'`), `App public nav must not include backstage item ${id}.`)
}

const shellText = read('app/src/components/design-system/ParallelUniverseShell.tsx')
const railBlock = shellText.match(/const railItems:[\s\S]*?= \[([\s\S]*?)\n\]/)?.[1] || ''
for (const label of ['发现', '阅读', '书城', '会员']) {
  assert(railBlock.includes(`label: '${label}'`), `ParallelUniverseShell public rail is missing ${label}.`)
}
for (const label of ['创作', '创作室', '设置', '支付']) {
  assert(!railBlock.includes(`label: '${label}'`), `ParallelUniverseShell public rail must not include ${label}.`)
}

const registryText = read('app/src/design-system/registry.ts')
assert(
  registryText.includes("requiredRailOrder: ['发现', '阅读', '书城', '会员']"),
  'Design-system registry must declare the current public rail order.',
)
assert(
  !registryText.includes("requiredRailOrder: ['发现', '书库', '阅读', '创作', '创作室', '设置', '支付']"),
  'Design-system registry still contains the old seven-item rail contract.',
)
assert(
  registryText.includes('CreatorShell'),
  'Design-system registry must include CreatorShell.',
)
assert(
  registryText.includes('LiquidGlass') && registryText.includes('@/components/ui/liquid-glass'),
  'Design-system registry must include the shadcn-compatible LiquidGlass primitive.',
)
assert(
  registryText.includes('UniverseDepth') && registryText.includes('WorldlineConstellation'),
  'Design-system registry must include Image2-backed depth and worldline patterns.',
)
for (const pattern of [
  'CreatorShortcutBar',
  'CreatorTodayNextStepsPanel',
  'CreatorStatePanel',
  'CreatorActionBar',
  'CreatorTodayPriorityPanel',
  'CreatorDashboardPriorityPanel',
  'CreatorTodayPathPanel',
  'CreatorTodayEchoStatusPanel',
  'CreatorTodayContextRail',
  'CreatorExternalEchoInboxCard',
  'CreatorExternalEchoDetailPanel',
  'CreatorEchoQueueCard',
  'CreatorEchoStatusStrip',
  'CreatorEchoNextActionPanel',
  'CreatorEchoDecisionPanel',
  'CreatorEchoWritingRail',
  'CreatorWorkStructureStrip',
  'CreatorBranchLineCard',
  'CreatorPublishBundleContextPanel',
  'CreatorPublishBundleImpactStrip',
  'CreatorPublishBundleReviewPanel',
  'CreatorSettingsBoundaryStrip',
  'CreatorLocalWorkspacePanel',
  'CreatorWorkspacePreferencesPanel',
  'CreatorSettingsStatusRail',
  'ConfirmActionDialog',
  'LocalStatusPill',
]) {
  assert(
    registryText.includes(pattern),
    `Design-system registry must include ${pattern}.`,
  )
}
for (const pattern of [
  'CreatorShortcutBar',
  'CreatorWritingWorkspaceFrame',
  'CreatorCommandCenterFrame',
  'CreatorAssistantSidecarFrame',
  'CreatorCommandCandidateFrame',
  'CreatorGuidedCoachFrame',
  'CreatorStoryHandoffPanel',
  'CreatorReviewDockFrame',
  'CreatorCreativeReviewDock',
  'CreatorQualityIssueCard',
  'CreatorStateDiffPanel',
  'CreatorBranchSandboxPanel',
  'CreatorFlightRecorderPanel',
  'CreatorParagraphJudgmentFrame',
  'CreatorEditorCursorAssistBar',
  'CreatorParagraphJudgmentPanel',
  'CreatorStoryFlowRail',
  'CreatorFlowStepper',
  'CreatorNextActionPanel',
  'CreatorNextBestActionCard',
  'CreatorCollapsibleOutline',
  'CreatorAgentComposer',
  'CreatorAgentWritingAssistantPanel',
  'CreatorAssistantDock',
  'CreatorDecisionQueue',
  'CreatorEditorDecisionQueuePanel',
  'CreatorProgressRail',
  'CreatorMissionProgressRail',
  'CreatorSessionRail',
  'CreatorStoryMap',
  'CreatorReaderWishPanel',
  'CreatorAuthorStatusPanel',
  'CreatorDestinationPanel',
  'CreatorBundleReadinessPanel',
  'CreatorCanonCommitBar',
  'CreatorPrivateDraftPanel',
]) {
  assert(
    registryText.includes(pattern),
    `Design-system registry must include Creator workspace pattern ${pattern}.`,
  )
}
for (const pattern of ['TopicFilterBar', 'RankedWorldList', 'ReaderRequestComposer', 'ReaderHotRequestList', 'ReaderStoryIndexPanel', 'ReaderStoryBranchPanel', 'ReaderStoryProgressPanel', 'ReaderAccountHeroCard', 'ReaderEntitlementSummaryGrid', 'ReaderAccountMergePanel', 'ReaderAccountStatusGrid', 'ReaderDataControlPanel', 'ReaderCheckoutProgressPanel', 'ReaderMembershipPlanPanel']) {
  assert(
    registryText.includes(pattern),
    `Design-system registry must include ${pattern}.`,
  )
}
for (const pattern of ['StudioTrendOpsPanel', 'CapabilityMapPanel']) {
  assert(
    registryText.includes(pattern),
    `Design-system registry must include ${pattern}.`,
  )
}

const pageContractsText = read('app/src/design-system/page-contracts.ts')
assert(
  pageContractsText.includes("'CreatorShell'"),
  'Page contracts must include CreatorShell as a creator pattern.',
)
for (const pattern of [
  "'CreatorTodayNextStepsPanel'",
  "'CreatorStatePanel'",
  "'CreatorActionBar'",
  "'CreatorTodayPriorityPanel'",
  "'CreatorDashboardPriorityPanel'",
  "'CreatorTodayPathPanel'",
  "'CreatorTodayEchoStatusPanel'",
  "'CreatorTodayContextRail'",
  "'CreatorEchoQueueCard'",
  "'CreatorEchoStatusStrip'",
  "'CreatorEchoNextActionPanel'",
  "'CreatorEchoDecisionPanel'",
  "'CreatorEchoWritingRail'",
  "'CreatorWorkStructureStrip'",
  "'CreatorBranchLineCard'",
  "'CreatorPublishBundleContextPanel'",
  "'CreatorPublishBundleImpactStrip'",
  "'CreatorPublishBundleReviewPanel'",
  "'CreatorLocalWorkspacePanel'",
  "'CreatorWorkspacePreferencesPanel'",
  "'CreatorSettingsStatusRail'",
  "'ConfirmActionDialog'",
  "'LocalStatusPill'",
]) {
  assert(
    pageContractsText.includes(pattern),
    `Page contracts must include ${pattern} as a creator pattern.`,
  )
}
for (const pattern of [
  "'CreatorShortcutBar'",
  "'CreatorWritingWorkspaceFrame'",
  "'CreatorCommandCenterFrame'",
  "'CreatorAssistantSidecarFrame'",
  "'CreatorCommandCandidateFrame'",
  "'CreatorGuidedCoachFrame'",
  "'CreatorStoryHandoffPanel'",
  "'CreatorReviewDockFrame'",
  "'CreatorCreativeReviewDock'",
  "'CreatorQualityIssueCard'",
  "'CreatorStateDiffPanel'",
  "'CreatorBranchSandboxPanel'",
  "'CreatorFlightRecorderPanel'",
  "'CreatorParagraphJudgmentFrame'",
  "'CreatorEditorCursorAssistBar'",
  "'CreatorParagraphJudgmentPanel'",
  "'CreatorStoryFlowRail'",
  "'CreatorFlowStepper'",
  "'CreatorNextActionPanel'",
  "'CreatorNextBestActionCard'",
  "'CreatorCollapsibleOutline'",
  "'CreatorAgentComposer'",
  "'CreatorAgentWritingAssistantPanel'",
  "'CreatorAssistantDock'",
  "'CreatorDecisionQueue'",
  "'CreatorEditorDecisionQueuePanel'",
  "'CreatorProgressRail'",
  "'CreatorMissionProgressRail'",
  "'CreatorSessionRail'",
  "'CreatorStoryMap'",
  "'CreatorReaderWishPanel'",
  "'CreatorAuthorStatusPanel'",
  "'CreatorDestinationPanel'",
  "'CreatorBundleReadinessPanel'",
  "'CreatorCanonCommitBar'",
  "'CreatorPrivateDraftPanel'",
]) {
  assert(
    pageContractsText.includes(pattern),
    `Page contracts must include ${pattern} as a creator workspace pattern.`,
  )
}
for (const pattern of ["'TopicFilterBar'", "'RankedWorldList'", "'ReaderRequestComposer'", "'ReaderHotRequestList'", "'ReaderStoryIndexPanel'", "'ReaderStoryBranchPanel'", "'ReaderStoryProgressPanel'", "'ReaderAccountHeroCard'", "'ReaderEntitlementSummaryGrid'", "'ReaderAccountMergePanel'", "'ReaderAccountStatusGrid'", "'ReaderDataControlPanel'", "'ReaderCheckoutProgressPanel'", "'ReaderMembershipPlanPanel'"]) {
  assert(
    pageContractsText.includes(pattern),
    `Page contracts must include ${pattern} as a reader pattern.`,
  )
}
for (const pattern of ["'StudioTrendOpsPanel'", "'CapabilityMapPanel'"]) {
  assert(
    pageContractsText.includes(pattern),
    `Page contracts must include ${pattern} as a studio pattern.`,
  )
}
assert(
  pageContractsText.includes('普通用户主导航只保留发现、阅读、书城、会员'),
  'Page contracts must document the public navigation boundary.',
)
assert(
  pageContractsText.includes('LiquidGlass') && pageContractsText.includes('页面不得手写新的玻璃面板体系'),
  'Page contracts must document the LiquidGlass component boundary.',
)

const componentStateMatrixText = read('docs/harness/creator-component-state-matrix.md')
for (const pattern of [
  'CreatorShell',
  'CreatorActionBar',
  'CreatorTodayNextStepsPanel',
  'CreatorEchoQueueCard',
  'CreatorEchoStatusStrip',
  'CreatorEchoNextActionPanel',
  'CreatorEchoDecisionPanel',
  'CreatorEchoWritingRail',
  'CreatorBranchLineCard',
  'CreatorPublishBundleContextPanel',
  'CreatorPublishBundleImpactStrip',
  'CreatorLocalWorkspacePanel',
  'CreatorWorkspacePreferencesPanel',
  'CreatorSettingsStatusRail',
  'CreatorStatePanel',
  'ConfirmActionDialog',
  'LocalStatusPill',
  'CreatorShortcutBar',
  'CreatorWritingWorkspaceFrame',
  'CreatorCommandCenterFrame',
  'CreatorAssistantSidecarFrame',
  'CreatorCommandCandidateFrame',
  'CreatorGuidedCoachFrame',
  'CreatorStoryHandoffPanel',
  'CreatorReviewDockFrame',
  'CreatorCreativeReviewDock',
  'CreatorQualityIssueCard',
  'CreatorStateDiffPanel',
  'CreatorBranchSandboxPanel',
  'CreatorFlightRecorderPanel',
  'CreatorParagraphJudgmentFrame',
  'CreatorEditorCursorAssistBar',
  'CreatorParagraphJudgmentPanel',
  'CreatorStoryFlowRail',
  'CreatorFlowStepper',
  'CreatorNextActionPanel',
  'CreatorNextBestActionCard',
  'CreatorCollapsibleOutline',
  'CreatorChapterPlannerPanel',
  'CreatorEditorAssistPanel',
  'CreatorGhostCompletionPanel',
  'CreatorInlineReviewPanel',
  'CreatorEditorReviewRail',
  'CreatorWritingCommandShelf',
  'CreatorAgentComposer',
  'CreatorAgentWritingAssistantPanel',
  'CreatorAssistantDock',
  'CreatorDecisionQueue',
  'CreatorEditorDecisionQueuePanel',
  'CreatorProgressRail',
  'CreatorMissionProgressRail',
  'CreatorSessionRail',
  'CreatorStoryMap',
  'CreatorReaderWishPanel',
  'CreatorAuthorStatusPanel',
  'CreatorDestinationPanel',
  'CreatorBundleReadinessPanel',
  'CreatorCanonCommitBar',
  'CreatorPrivateDraftPanel',
]) {
  assert(
    componentStateMatrixText.includes(`| \`${pattern}\``),
    `Creator component state matrix must include ${pattern}.`,
  )
}
assert(
  componentStateMatrixText.includes('CreatorAgentComposer') && componentStateMatrixText.includes('Natural-language writing partner composer'),
  'Creator component state matrix must document CreatorAgentComposer as the writing partner composer.',
)

const shadcnPlanText = read('docs/design-system/SHADCN_UI_DESIGN_SYSTEM_PLAN.md')
for (const pattern of ['CreatorShell', 'CreatorEchoQueueCard', 'CreatorWritingWorkspaceFrame', 'CreatorAgentComposer', 'CreatorAgentWritingAssistantPanel', 'CreatorAssistantDock', 'CreatorInlineReviewPanel', 'CreatorEditorReviewRail', 'CreatorEditorDecisionQueuePanel']) {
  assert(
    shadcnPlanText.includes(pattern),
    `shadcn design-system plan must document the current Creator pattern ${pattern}.`,
  )
}
for (const staleSnippet of [
  'CreatorConversationPanel.tsx',
  'CreatorDialogueThread.tsx',
  'CreatorReasoningMap.tsx',
  'CreatorStoryNotes.tsx',
  '/create                   1440x900',
  '<legacy-integration-harness>/app',
  'npm run check:copy-boundary',
  'npm run check:design-system',
  'npm --prefix app run check:alignment',
]) {
  assert(
    !shadcnPlanText.includes(staleSnippet),
    `shadcn design-system plan must not retain stale Creator instruction: ${staleSnippet}`,
  )
}

const registryJsonPath = join(root, 'app/src/registry/parallel-universe-ui.registry.json')
const registryJson = JSON.parse(readFileSync(registryJsonPath, 'utf8'))
assert(
  registryJson.items?.some(item => item.name === 'creator-shell'),
  'shadcn registry JSON must export creator-shell.',
)
assert(
  registryJson.items?.some(item => item.name === 'liquid-glass'),
  'shadcn registry JSON must export liquid-glass.',
)
assert(
  registryJson.items?.some(item => item.name === 'universe-depth'),
  'shadcn registry JSON must export universe-depth.',
)
for (const itemName of ['creator-today-next-steps-panel', 'creator-state-panel', 'creator-action-bar', 'creator-today-route-panels', 'creator-work-structure-strip', 'creator-echo-queue-card', 'creator-echo-writing-rail', 'creator-echo-status-strip', 'creator-echo-decision-panels', 'creator-publish-bundle-context-panel', 'creator-publish-bundle-impact-strip', 'creator-publish-bundle-review-panel', 'creator-local-workspace-panel', 'creator-workspace-preferences-panel', 'creator-settings-status-rail', 'confirm-action-dialog', 'local-status-pill']) {
  assert(
    registryJson.items?.some(item => item.name === itemName),
    `shadcn registry JSON must export ${itemName}.`,
  )
}
assert(
  registryJson.items?.some(item => item.name === 'creator-writing-workspace'),
  'shadcn registry JSON must export creator-writing-workspace.',
)
for (const itemName of ['topic-filter-bar', 'ranked-world-list', 'reader-request-composer', 'reader-hot-request-list', 'reader-reading-tool-button', 'reader-story-index-panel', 'reader-story-branch-panel', 'reader-story-progress-panel', 'reader-account-hero-card', 'reader-entitlement-summary-grid', 'reader-account-merge-panel', 'reader-account-status-grid', 'reader-data-control-panel', 'reader-checkout-progress-panel', 'reader-membership-plan-panel']) {
  assert(
    registryJson.items?.some(item => item.name === itemName),
    `shadcn registry JSON must export ${itemName}.`,
  )
}
for (const itemName of ['studio-trend-ops-panel', 'capability-map-panel']) {
  assert(
    registryJson.items?.some(item => item.name === itemName),
    `shadcn registry JSON must export ${itemName}.`,
  )
}

const creatorText = read('app/src/apps/creator/LocalCreatorApp.tsx')
const creatorDashboardRouteText = read('app/src/apps/creator/routes/CreatorDashboardRoute.tsx')
const creatorEchoRouteText = read('app/src/apps/creator/routes/CreatorEchoRoute.tsx')
const creatorPublishBundleRouteText = read('app/src/apps/creator/routes/CreatorPublishBundleRoute.tsx')
const creatorWorksRouteText = read('app/src/apps/creator/routes/CreatorWorksRoute.tsx')
const creatorSettingsRouteText = read('app/src/apps/creator/routes/CreatorSettingsRoute.tsx')
const creatorRouteSurfaceText = `${creatorText}\n${creatorDashboardRouteText}\n${creatorEchoRouteText}\n${creatorWorksRouteText}\n${creatorPublishBundleRouteText}\n${creatorSettingsRouteText}`
const creatorAppFrameText = read('app/src/components/creator/CreatorAppFrame.tsx')
const creatorRouteRegistryText = read('app/src/apps/creator/creatorRouteRegistry.ts')
const creatorExternalEchoInboxCardText = read('app/src/components/creator/CreatorExternalEchoInboxCard.tsx')
const creatorExternalEchoDetailPanelText = read('app/src/components/creator/CreatorExternalEchoDetailPanel.tsx')
const creatorEchoQueueCardText = read('app/src/components/creator/CreatorEchoQueueCard.tsx')
const creatorEchoStatusStripText = read('app/src/components/creator/CreatorEchoStatusStrip.tsx')
const creatorEchoDecisionPanelsText = read('app/src/components/creator/CreatorEchoDecisionPanels.tsx')
const creatorEchoWritingRailText = read('app/src/components/creator/CreatorEchoWritingRail.tsx')
const creatorEchoPanelsText = read('app/src/components/creator/CreatorEchoPanels.tsx')
const creatorPublishContextPanelText = read('app/src/components/creator/CreatorPublishBundleContextPanel.tsx')
const creatorPublishImpactStripText = read('app/src/components/creator/CreatorPublishBundleImpactStrip.tsx')
const creatorSettingsBoundaryStripText = read('app/src/components/creator/CreatorSettingsBoundaryStrip.tsx')
const creatorLocalWorkspacePanelText = read('app/src/components/creator/CreatorLocalWorkspacePanel.tsx')
const creatorWorkspacePreferencesPanelText = read('app/src/components/creator/CreatorWorkspacePreferencesPanel.tsx')
const creatorSettingsStatusRailText = read('app/src/components/creator/CreatorSettingsStatusRail.tsx')
const workspaceNavText = read('app/src/components/patterns/WorkspaceNav.tsx')
const creatorShellText = read('app/src/components/creator/CreatorShell.tsx')
assert(
  creatorText.includes('CreatorFrame') && creatorAppFrameText.includes('CreatorShell'),
  'Local Creator App must use the extracted CreatorFrame and CreatorShell instead of hand-rolling the author shell.',
)
for (const pattern of ['CreatorTodayNextStepsPanel', 'CreatorStatePanel', 'CreatorActionBar', 'CreatorEchoStatusStrip', 'CreatorEchoNextActionPanel', 'CreatorEchoDecisionPanel', 'CreatorEchoWritingRail', 'CreatorPublishBundleContextPanel', 'CreatorPublishBundleImpactStrip', 'CreatorLocalWorkspacePanel', 'CreatorWorkspacePreferencesPanel', 'CreatorSettingsStatusRail', 'ConfirmActionDialog']) {
  assert(
    creatorRouteSurfaceText.includes(pattern),
    `Creator route surface must use ${pattern} for the author workbench.`,
  )
}
for (const legacyPattern of ['<CreatorRequestStatusStrip', '<CreatorRequestNextActionPanel', '<CreatorRequestDecisionPanel', '<CreatorRequestWritingRail']) {
  assert(
    !creatorText.includes(legacyPattern),
    `Local Creator App must not directly mount legacy request component ${legacyPattern}.`,
  )
}
for (const required of [
  "from './CreatorEchoQueueCard'",
  "from './CreatorEchoStatusStrip'",
  "from './CreatorEchoDecisionPanels'",
  "from './CreatorEchoWritingRail'",
]) {
  assert(
    creatorEchoPanelsText.includes(required),
    `CreatorEchoPanels must keep External Echo export structure: ${required}`,
  )
}
for (const required of [
  'export function CreatorEchoStatusStrip',
  'data-slot="creator-echo-status-strip"',
  'data-slot="creator-echo-status-content"',
  'data-slot="creator-echo-status-grid"',
  'data-slot="creator-echo-status-chip"',
  'data-slot="creator-echo-status-meta"',
  'variant="glass"',
  'color-mix(in_oklab,var(--creator-border)_84%,transparent)',
  'color-mix(in_oklab,var(--creator-surface-strong)_86%,transparent)',
  'Badge variant="outline"',
  '当前显示',
  '外界回声概况',
  '当前回声视图',
]) {
  assert(
    creatorEchoStatusStripText.includes(required),
    `CreatorEchoStatusStrip must keep design-system structure: ${required}`,
  )
}
assert(
  !creatorText.includes('function RequestQueueStatusStrip'),
  'Request status strip must not return to page-local markup.',
)
for (const required of [
  'export function CreatorExternalEchoInboxCard',
  'data-slot="creator-external-echo-card"',
  'data-slot="creator-external-echo-card-source"',
  'data-slot="creator-external-echo-card-reminder"',
  'data-slot="creator-external-echo-card-actions"',
  'CardFooter',
  '<figure',
  '<section',
]) {
  assert(
    creatorExternalEchoInboxCardText.includes(required),
    `CreatorExternalEchoInboxCard must keep atomic design-system structure: ${required}`,
  )
}
for (const forbidden of ['CreatorActionBar', "className={cn('creator-external-echo-card'"]) {
  assert(
    !creatorExternalEchoInboxCardText.includes(forbidden),
    `CreatorExternalEchoInboxCard must not restore nested glass or retired CSS hook: ${forbidden}`,
  )
}
for (const required of [
  'export function CreatorExternalEchoDetailPanel',
  'data-slot="creator-external-echo-detail"',
  'data-slot="creator-external-echo-detail-context"',
  'data-slot="creator-external-echo-detail-source"',
  'data-slot="creator-external-echo-detail-reminder"',
  'data-slot="creator-external-echo-detail-actions"',
  'data-slot="creator-external-echo-detail-empty"',
  'CardFooter',
  '<Alert',
  '<dl',
  '<figure',
  '<section',
]) {
  assert(
    creatorExternalEchoDetailPanelText.includes(required),
    `CreatorExternalEchoDetailPanel must keep atomic design-system structure: ${required}`,
  )
}
for (const forbidden of ['CreatorActionBar', 'CreatorStatePanel', 'className="creator-external-echo-detail"']) {
  assert(
    !creatorExternalEchoDetailPanelText.includes(forbidden),
    `CreatorExternalEchoDetailPanel must not restore nested glass or retired CSS hook: ${forbidden}`,
  )
}
for (const required of [
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
]) {
  assert(
    creatorSettingsBoundaryStripText.includes(required),
    `CreatorSettingsBoundaryStrip must keep atomic design-system structure: ${required}`,
  )
}
for (const forbidden of ['variant="glass"', 'pu-motion-lift', '<CardHeader', '<CardTitle', '<CardDescription']) {
  assert(
    !creatorSettingsBoundaryStripText.includes(forbidden),
    `CreatorSettingsBoundaryStrip must not restore nested glass card-wall presentation: ${forbidden}`,
  )
}
for (const required of [
  'export function CreatorEchoNextActionPanel',
  'export function CreatorEchoDecisionPanel',
  'data-slot="creator-echo-next-action"',
  'data-slot="creator-echo-next-action-quote"',
  'data-slot="creator-echo-next-action-context"',
  'data-slot="creator-echo-next-action-path"',
  'data-slot="creator-echo-next-action-actions"',
  'creator-echo-decision-panel',
  'creator-echo-decision-stack',
  'CardFooter',
  '<figure',
  '<dl',
  '<ol',
  '<Card',
  'variant="glass"',
  'Badge variant="gold"',
  '<Button',
  '今天先写',
  '动笔前判断',
]) {
  assert(
    creatorEchoDecisionPanelsText.includes(required),
    `CreatorEchoDecisionPanels must keep design-system structure: ${required}`,
  )
}
for (const staleRequestFunction of [
  'function RequestNextBestActionPanel',
  'function RequestDecisionQueuePanel',
]) {
  assert(
    !creatorText.includes(staleRequestFunction),
    `Request assist panels must not return to page-local markup: ${staleRequestFunction}`,
  )
}
for (const required of [
  'export function CreatorEchoWritingRail',
  'creator-echo-writing-rail',
  'creator-echo-processing-order',
  'Card variant="glass"',
  'ConfirmActionDialog',
  'CreatorActionBar',
  '写作入口',
  '处理顺序',
]) {
  assert(
    creatorEchoWritingRailText.includes(required),
    `CreatorEchoWritingRail must keep design-system structure: ${required}`,
  )
}
for (const staleRequestRail of [
  '<h2 className="text-lg font-semibold text-[var(--creator-text)]">写作入口</h2>',
  '<h2 className="text-lg font-semibold text-[var(--creator-text)]">处理顺序</h2>',
]) {
  assert(
    !creatorText.includes(staleRequestRail),
    `Request writing rail must not return to page-local markup: ${staleRequestRail}`,
  )
}
for (const required of [
  'export function CreatorPublishBundleContextPanel',
  'creator-publish-bundle-context-panel',
  'Card variant="glass"',
  'Badge variant={requestStatusTone}',
  '去向确认',
]) {
  assert(
    creatorPublishContextPanelText.includes(required),
    `CreatorPublishBundleContextPanel must keep design-system structure: ${required}`,
  )
}
for (const required of [
  'export function CreatorPublishBundleImpactStrip',
  'creator-publish-bundle-impact-strip',
  'Card variant="glass"',
  'Badge variant="gold"',
  '发布影响总览',
]) {
  assert(
    creatorPublishImpactStripText.includes(required),
    `CreatorPublishBundleImpactStrip must keep design-system structure: ${required}`,
  )
}
for (const required of [
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
  'data-slot="creator-local-workspace-permission-list"',
  'data-slot="creator-local-workspace-operation-list"',
  'data-slot="creator-local-workspace-backup-actions"',
  '<dl',
  '<ul',
  '<ol',
  '本机保存',
  '导出备份',
  '助手权限',
  '操作记录',
]) {
  assert(
    creatorLocalWorkspacePanelText.includes(required),
    `CreatorLocalWorkspacePanel must keep design-system structure: ${required}`,
  )
}
assert(
  [...creatorLocalWorkspacePanelText.matchAll(/<Card(?:\s|>)/g)].length === 1,
  'CreatorLocalWorkspacePanel must keep exactly one shadcn Card owner.',
)
for (const forbidden of ['rounded-lg', 'rounded-xl', 'pu-motion-lift']) {
  assert(
    !creatorLocalWorkspacePanelText.includes(forbidden),
    `CreatorLocalWorkspacePanel must not restore card-wall presentation: ${forbidden}`,
  )
}
for (const required of [
  'export function CreatorWorkspacePreferencesPanel',
  'creator-workspace-preferences-panel',
  'Card variant="glass"',
  'Checkbox',
  'ConfirmActionDialog',
  '显示偏好',
  '重置显示偏好',
]) {
  assert(
    creatorWorkspacePreferencesPanelText.includes(required),
    `CreatorWorkspacePreferencesPanel must keep design-system structure: ${required}`,
  )
}
for (const required of [
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
  'data-slot="creator-settings-readiness-list"',
  'data-slot="creator-settings-boundary-state-list"',
  'data-slot="creator-settings-promise-list"',
  '<dl',
  '<ul',
  '当前状态',
  '工作台准备度',
  '公开边界',
  '发布承诺',
]) {
  assert(
    creatorSettingsStatusRailText.includes(required),
    `CreatorSettingsStatusRail must keep design-system structure: ${required}`,
  )
}
assert(
  [...creatorSettingsStatusRailText.matchAll(/<Card(?:\s|>)/g)].length === 1,
  'CreatorSettingsStatusRail must keep exactly one shadcn Card owner.',
)
for (const forbidden of ['rounded-lg', 'rounded-xl', 'pu-motion-lift']) {
  assert(
    !creatorSettingsStatusRailText.includes(forbidden),
    `CreatorSettingsStatusRail must not restore card-wall presentation: ${forbidden}`,
  )
}
assert(
  !creatorText.includes('function PublishImpactStrip'),
  'Publish impact strip must not return to page-local markup.',
)
for (const staleSettingsRail of [
  '<h2 className="text-lg font-semibold text-[var(--creator-text)]">当前状态</h2>',
  '<h2 className="text-lg font-semibold text-[var(--creator-text)]">工作台准备度</h2>',
  '<h2 className="text-lg font-semibold text-[var(--creator-text)]">公开边界</h2>',
  '<h2 className="text-lg font-semibold text-[var(--creator-text)]">发布承诺</h2>',
]) {
  assert(
    !creatorText.includes(staleSettingsRail),
    `Settings status rail must not return to page-local markup: ${staleSettingsRail}`,
  )
}
for (const staleSnippet of ['CreatorConversationPanel', 'CreatorDialogueThread', 'CreatorReasoningMap', 'CreatorStoryNotes']) {
  assert(
    !creatorText.includes(staleSnippet),
    `Local Creator App must not depend on retired creator interview pattern: ${staleSnippet}`,
  )
}
for (const internalTerm of ['系统从正文提取', '底盘预设', '人物系统', '场景系统', '世界规则系统', '从正文提取', '绑定', '行星景深', '星云', '粒子']) {
  assert(
    !creatorText.includes(internalTerm),
    `Local Creator App must not expose internal or reader-visual terminology: ${internalTerm}`,
  )
}
for (const creatorPattern of ['今日创作路径', '外界回声', '灵感到正文', '本机写作智库', '写作台', '发布包', '本机工作区']) {
  assert(
    creatorRouteRegistryText.includes(creatorPattern),
    `Creator route registry must keep Pivot V2 author workflow surface: ${creatorPattern}`,
  )
}
for (const icon of ['creatorHome', 'creatorInbox', 'creatorSpark', 'creatorWrite', 'creatorWorks', 'creatorPublish', 'creatorSettings']) {
  assert(
    workspaceNavText.includes(`${icon}:`) && creatorRouteRegistryText.includes(icon),
    `WorkspaceNav and Creator route registry must keep dedicated Creator nav icon ${icon}.`,
  )
}
assert(
  workspaceNavText.includes('creatorBrand:') && creatorShellText.includes('brandIcon="creatorBrand"'),
  'WorkspaceNav and CreatorShell must keep a dedicated Creator brand icon.',
)

const homeText = read('app/src/pages/Home.tsx')
const libraryText = read('app/src/pages/Library.tsx')
for (const [fileLabel, body] of [['Home', homeText], ['Library', libraryText]]) {
  for (const pattern of ['TopicFilterBar', 'RankedWorldList']) {
    assert(
      body.includes(pattern),
      `${fileLabel} page must use shared ${pattern} instead of page-local duplicated list UI.`,
    )
  }
}

const accountText = read('app/src/pages/Account.tsx')
const readerCheckoutProgressPanelText = read('app/src/components/reader/ReaderCheckoutProgressPanel.tsx')
const readerMembershipPlanPanelText = read('app/src/components/reader/ReaderMembershipPlanPanel.tsx')
const accountUiText = accountText + readerCheckoutProgressPanelText + readerMembershipPlanPanelText
assert(
  accountUiText.includes('PlanCard'),
  'Account membership page must use PlanCard through a Reader membership component instead of hand-rolling tier cards.',
)
assert(
  accountText.includes('ReaderAccountHeroCard'),
  'Account membership page must use ReaderAccountHeroCard for the first-viewport account/plan summary.',
)
assert(
  accountText.includes('ReaderEntitlementSummaryGrid'),
  'Account membership page must use ReaderEntitlementSummaryGrid for entitlement summary cards.',
)
assert(
  accountText.includes('ReaderAccountMergePanel'),
  'Account membership page must use ReaderAccountMergePanel for login and account recovery.',
)
assert(
  accountText.includes('ReaderAccountStatusGrid'),
  'Account membership page must use ReaderAccountStatusGrid for reader status cards.',
)
assert(
  accountText.includes('ReaderDataControlPanel'),
  'Account membership page must use ReaderDataControlPanel for account data governance.',
)
assert(
  accountText.includes('ReaderCheckoutProgressPanel'),
  'Account membership page must use ReaderCheckoutProgressPanel for checkout progress and status refresh actions.',
)
assert(
  accountText.includes('ReaderMembershipPlanPanel'),
  'Account membership page must use ReaderMembershipPlanPanel for membership plan selection.',
)
for (const required of ['completeCheckout', '检查开通状态', '刷新权益']) {
  assert(
    accountUiText.includes(required),
    `Account membership page must keep P21 checkout status and refresh behavior: ${required}`,
  )
}
for (const required of ['accountApi.getSnapshot', '阅读档案', '读者请求', '跨设备恢复']) {
  assert(
    accountText.includes(required),
    `Account membership page must keep P20 account snapshot behavior: ${required}`,
  )
}
assert(
  !accountText.includes('function TierCard'),
  'Account membership page must not reintroduce page-local tier cards.',
)
for (const forbidden of ['阅读、创作和会员记录', '份草稿', '创作草稿', '创作记录']) {
  assert(
    !accountText.includes(forbidden),
    `Account membership page must keep Reader-facing account copy: ${forbidden}`,
  )
}

const marketTrendText = read('app/src/features/market/trends.ts')
for (const adaptiveCreatorExport of ['export function inferTemplateIdFromStorySeed', 'export function writingToneForTrend']) {
  assert(
    marketTrendText.includes(adaptiveCreatorExport),
    `Market trends must keep adaptive creator export: ${adaptiveCreatorExport}`,
  )
}

const studioText = read('app/src/features/internal-ops/StudioOpsSurface.tsx')
for (const required of ['marketApi.scanTrends', 'StudioTrendOpsPanel', 'CapabilityMapPanel', 'capabilityAlignments', 'quality_gate.summary', 'quality_gate.blockers', 'quality_gate.warnings', 'quality_gate.suggested_fixes']) {
  assert(
    studioText.includes(required),
    `Studio must keep internal ops capability boundary and trend refresh control: ${required}`,
  )
}
const runtimeApiText = read('app/src/api/runtime.ts')
for (const required of ['QualityGateScores', 'QualityGateIssue', 'public_safe_message', 'studio_debug', 'release_decision', 'canon_commit_readiness']) {
  assert(
    runtimeApiText.includes(required),
    `Runtime API types must keep the P17 QualityGateResult field: ${required}`,
  )
}
const studioTrendOpsText = read('app/src/components/design-system/StudioTrendOpsPanel.tsx')
for (const required of ['market-scan-weekly', 'market-scan-monthly', '题材扫描合同', 'payload.function_call.name', '来源健康', '扫描审计', '模板影响', 'payload.ops']) {
  assert(
    studioTrendOpsText.includes(required),
    `StudioTrendOpsPanel must keep trend refresh and scan-contract surface: ${required}`,
  )
}
const capabilityMapText = read('app/src/components/design-system/CapabilityMapPanel.tsx')
for (const required of ['入口与服务对应关系', '已接服务合同', '仅工作台可见']) {
  assert(
    capabilityMapText.includes(required),
    `CapabilityMapPanel must keep internal capability mapping surface: ${required}`,
  )
}

for (const file of [
  'app/src/components/creator/CreatorShell.tsx',
  'app/src/components/creator/CreatorTodayNextStepsPanel.tsx',
  'app/src/components/creator/CreatorStatePanel.tsx',
  'app/src/components/creator/CreatorActionBar.tsx',
  'app/src/components/creator/CreatorTodayPriorityPanel.tsx',
  'app/src/components/creator/CreatorTodayRoutePanels.tsx',
  'app/src/components/creator/CreatorWorkStructureStrip.tsx',
  'app/src/components/creator/CreatorEchoQueueCard.tsx',
  'app/src/components/creator/CreatorEchoStatusStrip.tsx',
  'app/src/components/creator/CreatorEchoDecisionPanels.tsx',
  'app/src/components/creator/CreatorEchoWritingRail.tsx',
  'app/src/components/creator/CreatorSettingsStatusRail.tsx',
  'app/src/components/creator/ConfirmActionDialog.tsx',
  'app/src/components/creator/LocalStatusPill.tsx',
  'app/src/components/creator/workspace/CreatorDestinationPanels.tsx',
  'app/src/components/creator/workspace/CreatorCommitPanels.tsx',
  'app/src/components/creator/workspace/CreatorStoryContextPanels.tsx',
  'app/src/components/creator/workspace/CreatorSocraticPanels.tsx',
  'app/src/components/creator/workspace/CreatorAssistantSidecar.tsx',
  'app/src/components/creator/workspace/CreatorCommandPalette.tsx',
  'app/src/components/creator/workspace/CreatorCommandCandidate.tsx',
  'app/src/components/creator/workspace/CreatorReviewDock.tsx',
  'app/src/components/creator/workspace/CreatorQualityPanels.tsx',
  'app/src/components/creator/workspace/CreatorImpactPanels.tsx',
  'app/src/components/creator/workspace/CreatorInlineReviewPanels.tsx',
  'app/src/components/creator/workspace/CreatorProgressPanels.tsx',
  'app/src/components/creator/workspace/CreatorDraftGuidancePanels.tsx',
  'app/src/components/creator/workspace/CreatorPlanningPanels.tsx',
  'app/src/components/creator/workspace/CreatorDecisionPanels.tsx',
  'app/src/components/creator/workspace/CreatorInlineAssistantPanels.tsx',
  'app/src/components/creator/workspace/CreatorAgentAssistantPanels.tsx',
  'app/src/components/creator/workspace/CreatorWorkspaceShell.tsx',
]) {
  const body = read(file)
  for (const internalTerm of ['system prompt', 'System Prompt', '系统从正文提取', '底盘预设', '从正文提取', '绑定', '原始思维链', '行星景深', '星云', '粒子']) {
    assert(!body.includes(internalTerm), `${relative(appRoot, join(root, file))} exposes internal creator terminology: ${internalTerm}`)
  }
}

const creatorDestinationPanelsText = read('app/src/components/creator/workspace/CreatorDestinationPanels.tsx')
const creatorCommitPanelsText = read('app/src/components/creator/workspace/CreatorCommitPanels.tsx')
const creatorStoryContextPanelsText = read('app/src/components/creator/workspace/CreatorStoryContextPanels.tsx')
const creatorSocraticPanelsText = read('app/src/components/creator/workspace/CreatorSocraticPanels.tsx')
const creatorAssistantSidecarText = read('app/src/components/creator/workspace/CreatorAssistantSidecar.tsx')
const creatorCommandPaletteText = read('app/src/components/creator/workspace/CreatorCommandPalette.tsx')
const creatorCommandCandidateText = read('app/src/components/creator/workspace/CreatorCommandCandidate.tsx')
const creatorReviewDockText = read('app/src/components/creator/workspace/CreatorReviewDock.tsx')
const creatorQualityPanelsText = read('app/src/components/creator/workspace/CreatorQualityPanels.tsx')
const creatorImpactPanelsText = read('app/src/components/creator/workspace/CreatorImpactPanels.tsx')
const creatorInlineReviewPanelsText = read('app/src/components/creator/workspace/CreatorInlineReviewPanels.tsx')
const creatorProgressPanelsText = read('app/src/components/creator/workspace/CreatorProgressPanels.tsx')
const creatorDraftGuidancePanelsText = read('app/src/components/creator/workspace/CreatorDraftGuidancePanels.tsx')
const creatorPlanningPanelsText = read('app/src/components/creator/workspace/CreatorPlanningPanels.tsx')
const creatorDecisionPanelsText = read('app/src/components/creator/workspace/CreatorDecisionPanels.tsx')
const creatorInlineAssistantPanelsText = read('app/src/components/creator/workspace/CreatorInlineAssistantPanels.tsx')
const creatorAgentAssistantPanelsText = read('app/src/components/creator/workspace/CreatorAgentAssistantPanels.tsx')
const creatorWorkspaceShellText = read('app/src/components/creator/workspace/CreatorWorkspaceShell.tsx')
const creatorWorkspaceSystemText = `${creatorWorkspaceShellText}\n${creatorDestinationPanelsText}\n${creatorCommitPanelsText}\n${creatorStoryContextPanelsText}\n${creatorSocraticPanelsText}\n${creatorAssistantSidecarText}\n${creatorCommandPaletteText}\n${creatorCommandCandidateText}\n${creatorReviewDockText}\n${creatorQualityPanelsText}\n${creatorImpactPanelsText}\n${creatorInlineReviewPanelsText}\n${creatorProgressPanelsText}\n${creatorDraftGuidancePanelsText}\n${creatorPlanningPanelsText}\n${creatorDecisionPanelsText}\n${creatorInlineAssistantPanelsText}\n${creatorAgentAssistantPanelsText}`
const creatorBranchLineCardText = read('app/src/components/creator/CreatorBranchLineCard.tsx')
for (const marker of [
  'data-slot="creator-socratic-plan-board"',
  'data-slot="creator-socratic-stage-list"',
  'data-slot="creator-socratic-stage"',
  'data-slot="creator-socratic-active-stage"',
  'data-slot="creator-socratic-asset-kinds"',
  'data-slot="creator-socratic-capture-action"',
]) {
  assert(
    creatorSocraticPanelsText.includes(marker),
    `Creator Socratic plan board must expose component-owned slot ${marker}.`,
  )
}
assert(
  !read('app/src/index.css').includes('.creator-socratic-plan-board'),
  'Creator Socratic plan board must not depend on page-global CSS hooks.',
)
assert(
  registryText.includes("{ name: 'CreatorQualityIssueCard', path: '@/components/creator/workspace/CreatorQualityPanels', surfaces: ['creator'], uses: ['Card', 'Button', 'Badge'] }"),
  'Design-system registry must declare the quality card shadcn composition.',
)
assert(
  registryText.includes("{ name: 'CreatorChapterPlannerPanel', path: '@/components/creator/workspace/CreatorPlanningPanels', surfaces: ['creator'], uses: ['Card', 'Button', 'Badge'] }"),
  'Design-system registry must declare the chapter planner shadcn composition.',
)
assert(
  registryText.includes("{ name: 'CreatorInlineReviewPanel', path: '@/components/creator/workspace/CreatorInlineReviewPanels', surfaces: ['creator'], uses: ['Card', 'Button', 'Badge'] }"),
  'Design-system registry must declare the inline review shadcn composition.',
)
assert(
  registryText.includes("{ name: 'CreatorEditorReviewRail', path: '@/components/creator/workspace/CreatorInlineReviewPanels', surfaces: ['creator'], uses: ['Card', 'Button'] }"),
  'Design-system registry must declare the review rail shadcn composition.',
)
for (const marker of [
  "import { Card } from '@/components/ui/card'",
  'data-slot="creator-quality-review"',
  'data-slot="creator-quality-issue"',
  'data-slot="creator-quality-fix-action"',
]) {
  assert(creatorQualityPanelsText.includes(marker), `Creator quality card must keep atomic marker ${marker}.`)
}
for (const marker of [
  'data-slot="creator-editor-readiness-strip"',
  'data-slot="creator-progress-rail"',
  '[box-shadow:var(--creator-progress-shadow)]',
]) {
  assert(creatorProgressPanelsText.includes(marker), `Creator progress owner must keep atomic marker ${marker}.`)
}
for (const marker of [
  'data-slot="creator-chapter-planner"',
  'data-slot="creator-chapter-goal"',
  'data-slot="creator-chapter-goal-item"',
  'data-slot="creator-direction-option"',
  'data-slot="creator-direction-impact"',
]) {
  assert(creatorPlanningPanelsText.includes(marker), `Creator chapter planner must keep atomic marker ${marker}.`)
}
for (const marker of [
  'data-slot="creator-flow-stepper"',
  'data-slot="creator-flow-track"',
  'data-slot="creator-flow-step"',
  '[scrollbar-width:thin]',
  'max-xl:hidden',
]) {
  assert(creatorPlanningPanelsText.includes(marker), `Creator flow stepper must keep atomic marker ${marker}.`)
}
for (const marker of [
  '[box-shadow:var(--creator-rail-shadow)]',
  'data-slot="creator-session-panel"',
  'data-slot="creator-session-row"',
  'data-slot="creator-story-map"',
  'data-slot="creator-story-map-row"',
  'data-slot="creator-reader-wish-panel"',
  'line-clamp-2',
]) {
  assert(creatorStoryContextPanelsText.includes(marker), `Creator story context must keep atomic marker ${marker}.`)
}
for (const marker of [
  "import { Card, CardContent } from '@/components/ui/card'",
  'data-slot="creator-inline-review"',
  'data-slot="creator-inline-review-marker"',
  'data-slot="creator-editor-review-rail"',
  'data-slot="creator-editor-review-dot"',
  'variant="glass"',
]) {
  assert(creatorInlineReviewPanelsText.includes(marker), `Creator inline review must keep atomic marker ${marker}.`)
}
for (const pattern of [
  'export function CreatorShortcutBar',
  'export function CreatorWritingWorkspaceFrame',
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
  'export function CreatorFlowStepper',
  'export function CreatorNextActionPanel',
  'export function CreatorNextBestActionCard',
  'export function CreatorCollapsibleOutline',
  'export function CreatorInlineReviewPanel',
  'export function CreatorEditorReviewRail',
  'export function CreatorAgentComposer',
  'export function CreatorAgentWritingAssistantPanel',
  'export function CreatorAssistantDock',
  'export function CreatorDecisionQueue',
  'export function CreatorEditorDecisionQueuePanel',
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
]) {
  assert(
    creatorWorkspaceSystemText.includes(pattern),
    `Creator workspace must export ${pattern}.`,
  )
}
for (const primitive of [
  "@/components/ui/badge",
  "@/components/ui/button",
  "@/components/ui/card",
  "@/components/ui/textarea",
]) {
  assert(
    creatorWorkspaceSystemText.includes(primitive),
    `Creator workspace owner set must compose shadcn primitive ${primitive}.`,
  )
}
for (const echoQueueMarker of [
  'export function CreatorEchoQueueCard',
  '@/components/ui/card',
  '@/components/ui/badge',
  'creator-echo-queue-card',
  'creator-echo-queue-judgment',
]) {
  assert(
    creatorEchoQueueCardText.includes(echoQueueMarker),
    `Creator Echo queue card must include ${echoQueueMarker}.`,
  )
}
for (const branchLineMarker of [
  'export function CreatorBranchLineCard',
  '@/components/ui/card',
  '@/components/ui/badge',
  '@/components/ui/button',
  'ConfirmActionDialog',
  'data-slot="creator-branch-line-card"',
  'data-line-kind={isMain',
  'before:bg-[var(--creator-confirm)]',
  'before:bg-[var(--creator-accent)]',
]) {
  assert(
    creatorBranchLineCardText.includes(branchLineMarker),
    `Creator branch line card must include ${branchLineMarker}.`,
  )
}
for (const token of [
  '--creator-border',
  '--creator-surface',
  '--creator-editor-bg',
  '--creator-editor-control',
  '--creator-accent-soft',
  '--creator-confirm',
  '--creator-readiness-chip-border',
  '--creator-command-overlay-bg',
  '--creator-command-overlay-solid-bg',
  '--creator-command-solid-bg',
  '--creator-command-inset-solid-bg',
]) {
  assert(
    creatorWorkspaceSystemText.includes(token),
    `Creator workspace must use semantic Creator token ${token}.`,
  )
}
for (const forbidden of [
  'rgba(',
  'bg-white/',
  'text-[#',
  'border-[#',
]) {
  assert(
    !creatorWorkspaceSystemText.includes(forbidden),
    `Creator workspace must not bypass design tokens with ${forbidden}.`,
  )
}
assert(
  !/#[0-9a-fA-F]{3,8}/.test(creatorWorkspaceSystemText),
  'Creator workspace must not use literal hex colors.',
)

const styleText = read('app/src/index.css')
const tokenText = read('app/src/styles/parallel-universe-tokens.css')
assert(
  !styleText.includes('.creator-settings-status-'),
  'CreatorSettingsStatusRail must not depend on page-global CSS hooks.',
)
for (const commandPaletteToken of [
  '--creator-command-overlay-bg:',
  '--creator-command-overlay-solid-bg:',
  '--creator-command-solid-bg:',
  '--creator-command-inset-solid-bg:',
]) {
  assert(tokenText.includes(commandPaletteToken), `Command palette token layer must own ${commandPaletteToken}`)
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
  assert(!styleText.includes(retiredCommandPaletteSelector), `Command palette global selector must stay retired: ${retiredCommandPaletteSelector}`)
}
const panelText = read('app/src/components/design-system/Panel.tsx')
const liquidGlassPath = join(root, 'app/src/components/ui/liquid-glass.tsx')
assert(
  existsSync(liquidGlassPath),
  'LiquidGlass component file must exist.',
)
assert(
  panelText.includes('LiquidGlass') && !panelText.includes('pu-surface') && !panelText.includes('bg-[var(--pu-cyan-500)]/10'),
  'Panel must compose LiquidGlass instead of hand-rolling glass surface classes.',
)
for (const required of ['.pu-liquid-glass', '.pu-liquid-glass-cyan', '.pu-liquid-depth-floating', '.pu-liquid-interactive']) {
  assert(tokenText.includes(required), `Parallel universe tokens must include LiquidGlass style hook: ${required}`)
}
for (const required of ['.pu-motion-reveal', '.pu-motion-lift', '.pu-motion-pulse', 'prefers-reduced-motion: reduce']) {
  assert(tokenText.includes(required), `Parallel universe tokens must include motion boundary hook: ${required}`)
}
for (const required of ['--pu-bg-reader-gateway', '--pu-bg-story-reader', '.pu-depth-stage', '.pu-orbit-field', '.pu-branch-pulse']) {
  assert(tokenText.includes(required), `Parallel universe tokens must include Image2 depth-system hook: ${required}`)
}
assert(!tokenText.includes('--pu-bg-creator-workbench'), 'Creator workbench must not keep an Image2 planet background token.')
const liquidGlassText = read('app/src/components/ui/liquid-glass.tsx')
assert(
  liquidGlassText.includes('motion:') && liquidGlassText.includes('pu-motion-reveal'),
  'LiquidGlass must expose motion variants instead of page-local animation systems.',
)
const universeDepthText = read('app/src/components/design-system/UniverseDepth.tsx')
assert(
  universeDepthText.includes('UniverseDepth') && universeDepthText.includes('WorldlineConstellation'),
  'UniverseDepth component must expose planetary stage and worldline constellation exports.',
)
assert(
  styleText.includes('.creator-workbench-app')
    && tokenText.includes('.creator-workbench-app {')
    && tokenText.includes('--creator-bg:')
    && !styleText.includes('--creator-bg:'),
  'Creator workbench layout must consume tokens owned by the dedicated token layer.',
)
assert(
  styleText.includes("data-creator-motion='reduced'") && styleText.includes("data-creator-transparency='reduced'"),
  'Creator workbench must expose reduced motion and reduced transparency CSS hooks.',
)

const docsPath = join(root, 'docs/design-system/DEVELOPMENT_NOTES.md')
assert(
  existsSync(docsPath),
  'Design-system development notes must exist.',
)
if (existsSync(docsPath)) {
  const docsText = readFileSync(docsPath, 'utf8')
	for (const required of ['2026-06-12', '/create', 'CreatorConversationPanel', 'CreatorReasoningMap', '普通用户主导航', '页面自然滚动', '自然语言对话', '创作脉络', '故事笔记', 'Vite + React + TypeScript', '子 agent 审批', '坚决不做重复开发', 'P16 热门题材扫描要有适配器边界', 'MarketTrendSourceAdapter', 'P17 质量检查必须分层组合', 'QualityGateResult', 'production_gate', 'P18 支付完成与账号同步', '预览闭环和生产回调', 'P19 发布候选', 'NARRATIVEOS_ALLOWED_ORIGIN_REGEX', 'RC preview', 'P20 账号快照', '/v1/account/snapshot', '跨设备恢复不能伪装完成', 'P21 生产支付硬化', '/v1/reader/checkout/return', 'provider callback 单独走', 'HMAC 验签', 'P22 账号合并', '/v1/account/merge/preview', '/v1/account/merge/confirm', '发现本机档案', '合并到账号', 'P23 账号数据治理', '/v1/account/data/export', '/v1/account/delete/preview', '/v1/account/delete/confirm', '导出我的数据', '删除账号', '账号已删除', 'P24 上线验收', 'scripts/check-launch-readiness.sh', 'package-vercel-preview.sh', 'package-vercel-backend-api.sh', 'production blocker', 'artifacts/visual-qa/p24-launch-routes', 'P25 部署执行', 'preview / staging deployment rehearsal', 'artifacts/integration/p25-deployment-execution', 'restore dry-run', 'recovery drill', 'P26 生产发布门禁', 'public production release gate', 'decision: blocked', 'check-production-release-gate.mjs', 'X-Content-Type-Options', 'P27 blocked launch handoff', 'check-blocked-launch-handoff.mjs', 'public_paid_production_launch: blocked', '单一可传输交付物', 'P28 blocked launch review', 'owner card', 'production resource intake', 'check-launch-review-intake.mjs', 'P29 blocked launch governance dashboard', 'evidence ledger', 'check-blocked-launch-governance.mjs', 'P30 owner escalation', 'escalation matrix', 'check-owner-escalation.mjs', 'P31 acceptance artifact template pack', 'p31-acceptance-templates', 'check-acceptance-templates.mjs', 'P32 acceptance artifact intake validator', 'missing artifacts are not a script failure', 'check-acceptance-intake.mjs', 'P33 external owner follow-up log', 'waiting_on_owner', 'check-owner-follow-up.mjs']) {
    assert(docsText.includes(required), `Development notes are missing required learning: ${required}`)
  }
  for (const required of ['Shadcn Motion Polish', 'LiquidGlass motion variants', 'prefers-reduced-motion']) {
    assert(docsText.includes(required), `Development notes are missing motion-system learning: ${required}`)
  }
}

const designSystemPlanPath = join(root, 'docs/design-system/SHADCN_UI_DESIGN_SYSTEM_PLAN.md')
if (existsSync(designSystemPlanPath)) {
  const planText = readFileSync(designSystemPlanPath, 'utf8')
  for (const required of ['Frontend source of truth', 'Vite + React + TypeScript', 'subagent approval review', 'Avoid duplicate development']) {
    assert(planText.includes(required), `Design-system plan is missing frontend source-of-truth rule: ${required}`)
  }
}

const readerCreatorFiles = [
  'app/src/pages/Home.tsx',
  'app/src/pages/Library.tsx',
  'app/src/pages/Story.tsx',
  'app/src/pages/Create.tsx',
]
const staleReaderTerms = ['后端', 'PRD', 'OpenAPI', '时间织机', '创作室', '作者入口', '写作专区', '主宇宙模板']
for (const file of readerCreatorFiles) {
  const body = read(file)
  for (const term of staleReaderTerms) {
    assert(!body.includes(term), `${relative(appRoot, join(root, file))} contains stale public-surface term: ${term}`)
  }
}

if (failures.length) {
  console.error('[design-system-boundary] failed')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[design-system-boundary] PASS')
