#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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
  return source
}

function forbidAll(path, markers) {
  const source = read(path)
  for (const marker of markers) {
    if (source.includes(marker)) failures.push(`${path} must not contain ${marker}`)
  }
}

const schema = requireAll('app/src/features/creator-pivot/publishBundleSchema.ts', [
  'publishBundleSchema',
  'publishReceiptSchema',
  'publishSha256Schema',
  "algorithm: z.literal('SHA-256')",
  'idempotencyKey: publishSha256Schema',
  'contentChecksum: publishSha256Schema',
  'attempt: z.number().int().positive()',
  'superRefine',
])

const packageOwner = requireAll('app/src/features/creator-pivot/publishBundlePackage.ts', [
  'export interface CreatorPublishBundleInput',
  'createPublishBundle',
  'preparePublishBundlePackage',
  'buildPublishBundlePackage',
  'parsePublishBundlePackage',
  'confirmPublishBundleManifest',
  "confirmed: false",
  'sha256Text',
  'sha256Bytes',
  'publish-bundle.json',
  'body.md',
  'reader-summary.md',
  'external-copy/markdown.md',
  'external-copy/plain-text.txt',
])
forbidAll('app/src/features/creator-pivot/publishBundlePackage.ts', [
  '@/lib/pmfSupabase',
  'PmfPublishInput',
  'extends PmfPublishInput',
])

const lifecycle = requireAll('app/src/features/creator-pivot/publishBundleLifecycle.ts', [
  'prepareLocalPublishBundle',
  'reviewLocalPublishBundle',
  'confirmLocalPublishBundle',
  'markLocalPublishBundleExported',
  'importLocalPublishBundlePackage',
  'applyLocalPublishReceipt',
  "status: 'reviewed'",
  "status: 'author_confirmed'",
  "status: 'exported'",
])
for (const forbidden of ['react', 'window.', 'document.', 'publishChapter', '@/lib/pmfSupabase']) {
  if (lifecycle.includes(forbidden)) failures.push(`publishBundleLifecycle.ts must stay local/domain-owned without ${forbidden}`)
}

const adapter = requireAll('app/src/features/creator-pivot/publishBundleAdapter.ts', [
  'publishOwnPlatformBundle',
  'readPublishBundleLifecycle',
  'applyLocalPublishReceipt',
  'submission_pending_recovery',
  'submission_needs_manual_action',
  'submission_outcome_unknown',
  'idempotencyKey',
  "status === 'published'",
  "await import('@/lib/pmfSupabase')",
])
for (const forbidden of ['upsertLocalPublishBundle', 'upsertLocalPublishReceipt', "status: 'ready'", 'confirmed: true']) {
  if (adapter.includes(forbidden)) failures.push(`publishBundleAdapter.ts must delegate lifecycle persistence instead of ${forbidden}`)
}

requireAll('app/src/local-db/creatorLocalPublishRepository.ts', [
  'persistLocalPublishBundle',
  'persistLocalPublishReceipt',
  'persistLocalPublishBundlePackage',
  'readLocalPublishBundlePackage',
  "kind: 'publish-bundle'",
  'sha256Bytes',
])

requireAll('app/src/local-db/schema.ts', [
  "'reviewed'",
  "'author_confirmed'",
  "'needs_manual_action'",
  'packageRecordId?: string',
  'idempotencyKey?: string',
  "kind: 'rollback' | 'export' | 'publish-bundle'",
])

const actionService = requireAll('app/src/apps/creator/routes/creatorPublishBundleActionService.ts', [
  'runCreatorPreparePublishBundle',
  'runCreatorReviewPublishBundle',
  'runConfirmedCreatorBundleConfirmation',
  'runConfirmedCreatorBundleExport',
  'runConfirmedCreatorBundleSubmit',
  'importCreatorPublishBundleReceipt',
  'createCreatorAgentExecutor',
  'confirmCreatorAgentConfirmation',
])

const publishRoute = requireAll('app/src/apps/creator/routes/CreatorPublishBundleRoute.tsx', [
  'data-agent-action="prepare_publish_bundle"',
  'data-agent-action="review_publish_bundle"',
  'data-agent-action="confirm_publish_bundle"',
  'data-agent-action="export_publish_bundle"',
  'data-agent-action="submit_publish_bundle"',
  'runCreatorPreparePublishBundle',
  'runCreatorReviewPublishBundle',
  'runConfirmedCreatorBundleConfirmation',
  'runConfirmedCreatorBundleExport',
  'runConfirmedCreatorBundleSubmit',
])
for (const forbidden of [
  'publishChapter(',
  'publishOwnPlatformBundle(',
  'prepareLocalPublishBundle(',
  'confirmLocalPublishBundle(',
  'applyLocalPublishReceipt(',
]) {
  if (publishRoute.includes(forbidden)) failures.push(`CreatorPublishBundleRoute must delegate lifecycle work instead of ${forbidden}`)
}

const draftHandoff = requireAll('app/src/features/creator-pivot/publishBundleDraftHandoff.ts', [
  'publishBundleDraftQueryKey',
  'legacyPublishDraftQueryKey',
  'createPublishBundleDraftRecord',
  'resolvePublishBundleDraftRouteRef',
  "status: 'draft'",
])
if (draftHandoff.includes("status: 'ready'")) failures.push('publish bundle handoff must not create ready bundles')
forbidAll('app/src/features/creator-pivot/publishBundleDraftHandoff.ts', [
  'export const publishBundleDraftIdPrefix',
  'export interface ResolvePublishBundleDraftRouteInput',
])

requireAll('app/src/apps/creator/routes/creatorPublishBundleLoadService.ts', [
  'runCreatorPublishBundleLocalLoad',
  'readPublishReceipts: readLocalPublishReceipts',
  'hydrate: hydrateLocalWorkspace',
])

requireAll('app/src/apps/creator/routes/creatorPublishLifecycleViewModels.ts', [
  'resolveCreatorPublishBundleActiveRecord',
  'createPublishBundleLifecycleViewModel',
])

requireAll('app/src/apps/creator/routes/creatorPublishBundleRouteViewModels.ts', [
  'createCreatorPublishBundleRouteViewModel',
  'publishBundleInput: CreatorPublishBundleInput | null',
  'resolveCreatorPublishBundleActiveRecord(activeDraft?.localDraftRef, publishBundles)',
])

const dataAdapter = requireAll('app/src/lib/pmfSupabase.ts', [
  'export async function publishBundleTransaction',
  ".rpc('publish_bundle_transaction'",
  'p_bundle_id: input.bundleId',
  'p_idempotency_key: input.idempotencyKey',
  'p_content_checksum: input.contentChecksum',
  'p_reader_request_ids: input.requestIds',
])
if (dataAdapter.includes('export async function publishChapter')) {
  failures.push('legacy browser-owned publishChapter must be retired after WP6 cutover')
}

requireAll('docs/data-contracts/publish-bundle-v2.md', [
  'Prepare does not publish',
  'SHA-256',
  'author_confirmed',
  'needs_manual_action',
  'P0 does not claim automated external platform publishing',
  '## Server-Owned Publish Transaction',
])

if (!schema.includes("confirmed: z.boolean()") || !packageOwner.includes('confirmed: false')) {
  failures.push('createPublishBundle must produce an explicitly unconfirmed manifest')
}
if (!actionService.includes("actionName: 'submit_publish_bundle'")) {
  failures.push('public submission must have its own confirmed Agent action')
}

if (failures.length) {
  console.error('[publish-bundle-schema] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[publish-bundle-schema] PASS')
