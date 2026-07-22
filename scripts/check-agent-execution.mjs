#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const failures = []

function read(path) {
  return readFileSync(resolve(root, path), 'utf8')
}

function requireAll(path, markers) {
  const source = read(path)
  for (const marker of markers) {
    if (!source.includes(marker)) failures.push(`${path} missing ${marker}`)
  }
}

function forbidAll(path, markers) {
  const source = read(path)
  for (const marker of markers) {
    if (source.includes(marker)) failures.push(`${path} must not expose ${marker}`)
  }
}

requireAll('app/src/agent-surface/contracts.ts', [
  'creatorAgentActionSchemas',
  'satisfies Record<CreatorAgentActionName',
  "confirm_publish_bundle",
  "submit_publish_bundle",
])
requireAll('app/src/agent-surface/executor.ts', [
  "status: 'requested'",
  "status: 'awaiting_confirmation'",
  "status: 'started'",
  "status: 'succeeded'",
  "status: 'failed'",
  "status: 'blocked'",
  'consumeConfirmation',
  'inputHash',
])
requireAll('app/src/agent-surface/confirmation.ts', [
  'operationId',
  'actionName',
  'targetId',
  'inputHash',
  'expiresAt',
  "status: 'confirmed'",
])
forbidAll('app/src/agent-surface/confirmation.ts', [
  'export type UpdateCreatorAgentConfirmationResult',
])
forbidAll('app/src/agent-surface/executor.ts', [
  'export type CreatorAgentActionHandler<',
  'export interface CreatorAgentExecutorRequest',
  'export type CreatorAgentExecutorResult',
])
forbidAll('app/src/agent-surface/operationFlow.ts', [
  'export interface CreatorCommandCandidateStartInput',
])
forbidAll('app/src/agent-surface/operationLog.ts', [
  'export function createCreatorAgentOperationEvent',
])
requireAll('app/src/local-db/schema.ts', [
  'LOCAL_SCHEMA_VERSION = 10',
  'AgentConfirmationReceipt',
  'agentConfirmations',
  "'cancelled_by_author'",
])
requireAll('app/src/apps/creator/routes/CreatorEditorRoute.tsx', [
  'runEditorDraftSaveThroughAgent',
  'runEditorPublishCheckThroughAgent',
])
requireAll('app/src/components/creator/CreatorAppFrame.tsx', [
  'executeCreatorCommandCandidateStartFlow',
  'executeCreatorCommandCandidateApplyFlow',
  'recordCreatorCommandCandidateCancellation',
])
requireAll('app/src/apps/creator/routes/creatorPublishBundleActionService.ts', [
  'runConfirmedCreatorBundleConfirmation',
  'runConfirmedCreatorBundleSubmit',
  'createCreatorAgentExecutor',
  'confirmCreatorAgentConfirmation',
])

const publishRoute = read('app/src/apps/creator/routes/CreatorPublishBundleRoute.tsx')
if (publishRoute.includes('runCreatorPublishBundle(')) {
  failures.push('CreatorPublishBundleRoute must not bypass durable confirmation receipts')
}

const manifest = JSON.parse(read('app/public/creator/agent-manifest.json'))
if (manifest.schemaVersion !== 2) failures.push('agent manifest must use schemaVersion 2')
const manifestContracts = manifest.actionContracts || []
const actionNames = new Set(manifestContracts.map(contract => contract.name))
if (actionNames.size !== manifestContracts.length) failures.push('agent manifest action names must be unique')
const actionSource = read('app/src/agent-surface/actions.ts')
const declaredActionNames = new Set(
  [...actionSource.matchAll(/\bname:\s*'([^']+)'/gu)].map(match => match[1]),
)
for (const actionName of declaredActionNames) {
  if (!actionNames.has(actionName)) failures.push(`agent manifest missing declared action ${actionName}`)
}
for (const actionName of actionNames) {
  if (!declaredActionNames.has(actionName)) failures.push(`agent manifest exposes undeclared action ${actionName}`)
}
for (const highRiskName of ['export_publish_bundle', 'confirm_publish_bundle', 'submit_publish_bundle']) {
  const contract = manifest.actionContracts?.find(item => item.name === highRiskName)
  if (contract?.risk !== 'high' || contract?.requiresAuthorConfirmation !== true) {
    failures.push(`${highRiskName} must remain high risk and author confirmed in manifest`)
  }
}

const fixture = spawnSync(resolve(root, 'node_modules/.bin/tsx'), ['tests/agent-execution.ts'], {
  cwd: resolve(root, 'app'),
  encoding: 'utf8',
})
if (fixture.status !== 0) {
  failures.push(`agent execution fixture failed:\n${fixture.stdout}${fixture.stderr}`)
}

if (failures.length) {
  console.error('Agent execution protocol check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Agent execution protocol check passed.')
