#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const failures = []

function read(path) {
  return readFileSync(resolve(root, path), 'utf8')
}

function fail(message) {
  failures.push(message)
}

const actionsSource = read('app/src/agent-surface/actions.ts')
const operationLogSource = read('app/src/agent-surface/operationLog.ts')
const operationFlowSource = read('app/src/agent-surface/operationFlow.ts')
const manifest = JSON.parse(read('app/public/creator/agent-manifest.json'))
const assistantSidecarSource = read('app/src/components/creator/workspace/CreatorAssistantSidecar.tsx')
const commandPaletteSource = read('app/src/components/creator/workspace/CreatorCommandPalette.tsx')
const commandCandidateSource = read('app/src/components/creator/workspace/CreatorCommandCandidate.tsx')
const reviewDockSource = read('app/src/components/creator/workspace/CreatorReviewDock.tsx')
const inlineAssistantPanelsSource = read('app/src/components/creator/workspace/CreatorInlineAssistantPanels.tsx')
const agentAssistantPanelsSource = read('app/src/components/creator/workspace/CreatorAgentAssistantPanels.tsx')
const conversationTimelineSource = read('app/src/components/creator/workspace/CreatorConversationTimeline.tsx')
const historicalStateReviewSource = read('app/src/components/creator/workspace/CreatorHistoricalStateReview.tsx')
const characterRehearsalSource = read('app/src/components/creator/workspace/CreatorCharacterRehearsalCandidate.tsx')
const conversationWorkspaceSource = read('app/src/components/creator/workspace/CreatorConversationWorkspace.tsx')
const localCreatorSource = read('app/src/apps/creator/LocalCreatorApp.tsx')
const editorRouteSource = read('app/src/apps/creator/routes/CreatorEditorRoute.tsx')
const editorManuscriptSource = read('app/src/apps/creator/routes/CreatorEditorManuscriptStage.tsx')
const editorViewModelsSource = read('app/src/apps/creator/routes/creatorEditorViewModels.ts')
const editorSocraticViewModelsSource = read('app/src/apps/creator/routes/creatorEditorSocraticViewModels.ts')
const editorAssistantViewModelsSource = read('app/src/apps/creator/routes/creatorEditorAssistantViewModels.ts')
const creatorFrameSource = read('app/src/components/creator/CreatorAppFrame.tsx')
const creatorCommandCandidateServiceSource = read('app/src/components/creator/creatorCommandCandidateService.ts')
const browserQaSource = read('scripts/browser-agent-action-surface.mjs')
const protocolDoc = read('docs/agent-protocol/creator-agent-action-surface.md')
const editorAgentSurfaceSource = `${editorRouteSource}\n${editorManuscriptSource}\n${editorViewModelsSource}\n${editorSocraticViewModelsSource}\n${editorAssistantViewModelsSource}`
const creatorAgentComponentSurface = `${assistantSidecarSource}\n${commandPaletteSource}\n${commandCandidateSource}\n${reviewDockSource}\n${inlineAssistantPanelsSource}\n${agentAssistantPanelsSource}\n${conversationTimelineSource}\n${historicalStateReviewSource}\n${characterRehearsalSource}\n${conversationWorkspaceSource}`

const requiredActions = [
  'open_draft',
  'start_inspiration',
  'pin_reminder',
  'apply_suggestion',
  'select_priority_request',
  'convert_echo_to_scene',
  'generate_candidate_from_instruction',
  'complete_next_beat',
  'rewrite_as_action',
  'ask_socratic_question',
  'extract_setting_asset',
  'branch_sandbox',
  'inspect_story_impact',
  'open_suggestion_record',
  'save_local_draft',
  'edit_local_manuscript',
  'start_next_local_chapter',
  'import_historical_state_candidate',
  'start_character_rehearsal',
  'save_character_rehearsal_card',
  'save_character_rehearsal_setting',
  'confirm_historical_state_candidate',
  'reject_historical_state_candidate',
  'enter_publish_check',
  'prepare_publish_bundle',
  'review_publish_bundle',
  'check_reader_promise',
  'export_publish_bundle',
  'confirm_publish_bundle',
  'submit_publish_bundle',
]

const declaredActions = new Set(
  [...actionsSource.matchAll(/name: '([^']+)'/g)].map((match) => match[1]),
)

if (declaredActions.size !== requiredActions.length) fail(`Creator Agent action registry must contain the current ${requiredActions.length} contracts, found ${declaredActions.size}`)
if (manifest.actionContracts?.length !== requiredActions.length) fail(`Agent manifest must contain the current ${requiredActions.length} action contracts, found ${manifest.actionContracts?.length || 0}`)

for (const action of requiredActions) {
  if (!declaredActions.has(action)) fail(`actions.ts missing ${action}`)
}

for (const blocked of [
  'publish_without_author_confirmation',
  'overwrite_published_canon',
  'upload_private_draft_body',
  'read_credentials',
]) {
  if (!actionsSource.includes(`'${blocked}'`)) fail(`actions.ts missing blocked action ${blocked}`)
  if (!manifest.blockedActions?.includes(blocked)) fail(`agent manifest missing blocked action ${blocked}`)
}

for (const highRisk of [
  'confirm_historical_state_candidate',
  'reject_historical_state_candidate',
  'export_publish_bundle',
  'confirm_publish_bundle',
  'submit_publish_bundle',
]) {
  const index = actionsSource.indexOf(`name: '${highRisk}'`)
  const chunk = actionsSource.slice(index, index + 420)
  if (index === -1 || !chunk.includes("risk: 'high'")) fail(`${highRisk} must be high risk`)
  if (index === -1 || !chunk.includes('requiresAuthorConfirmation: true')) fail(`${highRisk} must require author confirmation`)
}

for (const rehearsalAction of [
  'start_character_rehearsal',
  'save_character_rehearsal_card',
  'save_character_rehearsal_setting',
]) {
  const index = actionsSource.indexOf(`name: '${rehearsalAction}'`)
  const chunk = actionsSource.slice(index, index + 420)
  if (index === -1 || !chunk.includes('requiresAuthorConfirmation: true')) {
    fail(`${rehearsalAction} must require author confirmation`)
  }
}

const manifestActions = new Set()
for (const route of manifest.routes || []) {
  if (!route.path || !route.purpose) fail('manifest route missing path or purpose')
  for (const action of route.actions || []) manifestActions.add(action)
}

const writingDeskRoute = (manifest.routes || []).find(route => route.id === 'writing-desk')
if (writingDeskRoute?.readinessSelector !== '[data-agent-workspace-state="ready"][data-agent-ready="true"]') {
  fail('writing-desk manifest must require the restored ready workspace selector before reading or acting')
}

for (const action of manifestActions) {
  if (!declaredActions.has(action)) fail(`manifest action ${action} is not declared in action contract`)
}

for (const action of declaredActions) {
  if (!manifestActions.has(action)) fail(`declared action ${action} is missing from agent manifest routes`)
}

for (const snippet of [
  'CreatorCommandPaletteSurface',
  'CreatorAssistantSidecarSurface',
  'CreatorCommandCandidateSurface',
  'data-agent-action={command.agentAction}',
  'data-agent-action={action.agentAction}',
  'data-agent-action={suggestion.agentAction}',
  'data-agent-action="apply_suggestion"',
  'data-agent-action="generate_candidate_from_instruction"',
  'data-agent-action="inspect_story_impact"',
  'data-agent-action="open_suggestion_record"',
  'data-agent-action="save_local_draft"',
  'data-agent-action="edit_local_manuscript"',
  'data-agent-action="import_historical_state_candidate"',
  'data-agent-action="start_character_rehearsal"',
  'action="save_character_rehearsal_card"',
  'action="save_character_rehearsal_setting"',
  'data-agent-action="confirm_historical_state_candidate"',
  'data-agent-action="reject_historical_state_candidate"',
  'data-agent-action="enter_publish_check"',
]) {
  if (!creatorAgentComponentSurface.includes(snippet)) fail(`Creator agent component surface missing ${snippet}`)
}
for (const snippet of [
  "const workspaceRestoring = props.loading || props.pendingAction === 'initialize'",
  "const workspaceState = workspaceRestoring ? 'restoring' : props.pending ? 'busy' : 'ready'",
  'data-agent-workspace-state={workspaceState}',
  "data-agent-ready={workspaceState === 'ready' ? 'true' : 'false'}",
  "aria-busy={workspaceState !== 'ready'}",
  'pending={props.pending || workspaceRestoring}',
  'disabled={props.pending || workspaceRestoring}',
  '正在恢复本机创作状态…',
]) {
  if (!conversationWorkspaceSource.includes(snippet)) fail(`Creator conversation workspace missing readiness boundary ${snippet}`)
}
for (const snippet of [
  'disabled?: boolean',
  'disabled={disabled || !item.canConfirm || Boolean(busyProposalId)}',
  'disabled={disabled || Boolean(busyProposalId)}',
]) {
  if (!historicalStateReviewSource.includes(snippet)) fail(`Historical state review must stay blocked during workspace restore: ${snippet}`)
}
if (!agentAssistantPanelsSource.includes('>发布包确认</Button>')) fail('Agent assistant publish handoff must use PublishBundle confirmation language')
if (agentAssistantPanelsSource.includes('>发布检查</Button>')) fail('Agent assistant publish handoff must not expose retired publish-check wording')

for (const marker of ['export function CreatorAssistantSidecarFrame', 'export function CreatorAssistantSidecarSurface']) {
  if (!assistantSidecarSource.includes(marker)) fail(`CreatorAssistantSidecar missing ${marker}`)
}
if (!creatorFrameSource.includes("from '@/components/creator/workspace/CreatorAssistantSidecar'")) fail('CreatorAppFrame must consume the sidecar owner directly')
if (!creatorCommandCandidateServiceSource.includes("from '@/components/creator/workspace/CreatorAssistantSidecar'")) fail('creatorCommandCandidateService must consume the sidecar scope contract directly')
for (const marker of ['export function CreatorCommandCenterFrame', 'export function CreatorCommandPaletteSurface']) {
  if (!commandPaletteSource.includes(marker)) fail(`CreatorCommandPalette missing ${marker}`)
}
for (const marker of ['export function CreatorCommandCandidateFrame', 'export function CreatorCommandCandidateSurface']) {
  if (!commandCandidateSource.includes(marker)) fail(`CreatorCommandCandidate missing ${marker}`)
}
if (!creatorFrameSource.includes("from '@/components/creator/workspace/CreatorCommandPalette'")) fail('CreatorAppFrame must consume the command palette owner directly')
if (!creatorFrameSource.includes("from '@/components/creator/workspace/CreatorCommandCandidate'")) fail('CreatorAppFrame must consume the command candidate owner directly')
if (!creatorCommandCandidateServiceSource.includes("from '@/components/creator/workspace/CreatorCommandPalette'")) fail('creatorCommandCandidateService must consume command contracts from the palette owner')
if (!creatorCommandCandidateServiceSource.includes("from '@/components/creator/workspace/CreatorCommandCandidate'")) fail('creatorCommandCandidateService must consume candidate contracts from the candidate owner')

for (const snippet of [
  "agentAction: 'select_priority_request'",
  "agentAction: 'convert_echo_to_scene'",
  "agentAction: 'complete_next_beat'",
  "agentAction: 'rewrite_as_action'",
  "agentAction: 'ask_socratic_question'",
  "agentAction: 'extract_setting_asset'",
  "agentAction: 'branch_sandbox'",
  "agentAction: 'inspect_story_impact'",
  "agentAction: 'open_suggestion_record'",
  "agentAction: 'check_reader_promise'",
  'export const creatorAssistantCommands',
  'export function assistantScopeForPath',
  'export function commandsForScope',
  'export function commandCandidateApplyMode',
  'export function resolveCommandCandidateOption',
  'const commandCandidateCancellationLabels = new Set([',
  "feedback: '已暂存当前判断；正文没有变化。'",
  'export const commandIntentKeywords',
  'export function assistantScopeLabel',
  'export function commandContextForScope',
  'function commandCandidateVariants',
  'export function commandCandidateFor',
]) {
  if (!creatorCommandCandidateServiceSource.includes(snippet)) fail(`creatorCommandCandidateService missing ${snippet}`)
}

for (const forbidden of [
  'recordCreatorAgentOperation',
  'recordCreatorCommandCandidateStartFlow',
  'recordCreatorCommandCandidateApplyFlow',
  'useState',
  'useEffect',
  '<CreatorCommand',
  'window.',
  'document.',
  'localStorage',
  '@/local-db/',
  'publishChapter',
]) {
  if (creatorCommandCandidateServiceSource.includes(forbidden)) fail(`creatorCommandCandidateService must stay pure command/candidate mapping without ${forbidden}`)
}

for (const snippet of [
  'CreatorCommandPaletteSurface',
  'CreatorAssistantSidecarSurface',
  'CreatorCommandCandidateSurface',
  'executeCreatorCommandCandidateStartFlow',
  'executeCreatorCommandCandidateApplyFlow',
  'confirmCreatorCommandCandidateApplyFlow',
  'recordCreatorCommandCandidateCancellation',
  'assistantScopeForPath',
  'assistantScopeLabel',
  'resolveCommandCandidateOption',
  'commandCandidateFor',
  'commandContextForScope',
  'commandIntentKeywords',
  'commandsForScope',
  'actionName: command.agentAction',
  'candidateId: candidate.id',
]) {
  if (!creatorFrameSource.includes(snippet)) fail(`CreatorAppFrame missing ${snippet}`)
}

for (const forbidden of [
  'recordCreatorAgentOperation',
  'const creatorAssistantCommands',
  'function assistantScopeForPath',
  'function commandsForScope',
  'function commandCandidateApplyMode',
  'const commandIntentKeywords',
  'function assistantScopeLabel',
  'function commandContextForScope',
  'function commandCandidateVariants',
  'function commandCandidateFor',
  'const closeLabels',
  "setCandidateFeedback('已暂存当前判断；正文没有变化。')",
  "agentAction: 'select_priority_request'",
  "agentAction: 'convert_echo_to_scene'",
  "agentAction: 'complete_next_beat'",
  "agentAction: 'rewrite_as_action'",
  "agentAction: 'ask_socratic_question'",
  "agentAction: 'extract_setting_asset'",
  "agentAction: 'branch_sandbox'",
  "agentAction: 'inspect_story_impact'",
  "agentAction: 'open_suggestion_record'",
  "agentAction: 'check_reader_promise'",
  "actionName: 'apply_suggestion'",
  "status: 'started'",
  "status: 'succeeded'",
]) {
  if (creatorFrameSource.includes(forbidden)) fail(`CreatorAppFrame must delegate command registry/candidate generation and operation-log payloads instead of ${forbidden}`)
}
if (creatorFrameSource.includes('commandCandidateApplyMode(')) {
  fail('CreatorAppFrame must consume the typed candidate option decision instead of resolving apply mode directly')
}
if (!browserQaSource.includes('[data-slot="creator-command-item"][data-agent-action="complete_next_beat"]')) {
  fail('Agent browser QA must target the current command item data-slot contract')
}
if (browserQaSource.includes('.creator-command-item')) {
  fail('Agent browser QA must not depend on the retired command item class')
}

for (const snippet of [
  "agentAction: 'complete_next_beat'",
  "agentAction: 'rewrite_as_action'",
  "agentAction: 'ask_socratic_question'",
  "agentAction: 'branch_sandbox'",
  "agentAction: 'inspect_story_impact'",
  "agentAction: 'open_suggestion_record'",
]) {
  if (!editorAgentSurfaceSource.includes(snippet)) fail(`Creator editor surface missing editor view-model action ${snippet}`)
}

for (const snippet of [
  'confirmCreatorCommandCandidateApplyFlow',
  'executeCreatorCommandCandidateStartFlow',
  'executeCreatorCommandCandidateApplyFlow',
  'recordCreatorCommandCandidateCancellation',
  'createCreatorAgentExecutor',
  'recordCreatorAgentOperationEvent',
  'CreatorAgentActionName',
  'actionName,',
  "actionName: 'apply_suggestion'",
  "status: 'cancelled_by_author'",
]) {
  if (!operationFlowSource.includes(snippet)) fail(`operationFlow.ts missing ${snippet}`)
}

for (const forbidden of [
  '@/local-db/',
  'upsertLocalAgentOperation',
  'window.',
  'document.',
  'localStorage',
]) {
  if (operationFlowSource.includes(forbidden)) fail(`operationFlow.ts must compose agent operation flows without owning local storage/repository access: ${forbidden}`)
}

for (const snippet of [
  'recordCreatorAgentOperation',
  "from '@/local-db/creatorLocalAgentRepository'",
  'upsertLocalAgentOperation',
  'CreatorAgentActionName',
  'creatorAgentActions.find',
  'risk: action?.risk',
]) {
  if (!operationLogSource.includes(snippet)) fail(`operationLog.ts missing ${snippet}`)
}

for (const snippet of [
  'S5 Wired Action Surface',
  'data-agent-action',
  'select_priority_request',
  'generate_candidate_from_instruction',
  'enter_publish_check',
  'lifecycle events',
]) {
  if (!protocolDoc.includes(snippet)) fail(`agent protocol doc missing ${snippet}`)
}

if (failures.length) {
  console.error('[agent-surface] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[agent-surface] PASS (${manifestActions.size} manifest actions)`)
