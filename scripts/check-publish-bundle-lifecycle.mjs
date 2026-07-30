#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const failures = []

function read(path) {
  return readFileSync(resolve(root, path), 'utf8')
}

const lifecycle = read('app/src/features/creator-pivot/publishBundleLifecycle.ts')
const adapter = read('app/src/features/creator-pivot/publishBundleAdapter.ts')
const route = read('app/src/apps/creator/routes/CreatorPublishBundleRoute.tsx')

for (const marker of [
  'prepareLocalPublishBundle',
  'reviewLocalPublishBundle',
  'confirmLocalPublishBundle',
  'markLocalPublishBundleExported',
  'importLocalPublishBundlePackage',
  'applyLocalPublishReceipt',
  "status: 'reviewed'",
  "status: 'author_confirmed'",
  "status: 'exported'",
]) {
  if (!lifecycle.includes(marker)) failures.push(`lifecycle owner missing ${marker}`)
}
for (const marker of [
  'submission_pending_recovery',
  'submission_needs_manual_action',
  'submission_outcome_unknown',
  "existingReceiptRecord?.status === 'published'",
  'attemptCount',
]) {
  if (!adapter.includes(marker)) failures.push(`submission adapter missing ${marker}`)
}
for (const action of [
  'prepare_publish_bundle',
  'review_publish_bundle',
  'confirm_publish_bundle',
  'export_publish_bundle',
  'submit_publish_bundle',
]) {
  if (!route.includes(`data-agent-action="${action}"`)) failures.push(`Publish route missing ${action} surface`)
}
if (route.includes('publishChapter(')) failures.push('Publish route must not call the direct publish helper')

const fixture = spawnSync(resolve(root, 'node_modules/.bin/tsx'), ['tests/publish-bundle-lifecycle.ts'], {
  cwd: resolve(root, 'app'),
  encoding: 'utf8',
})
if (fixture.status !== 0) failures.push(`PublishBundle lifecycle fixture failed:\n${fixture.stdout}${fixture.stderr}`)

if (failures.length) {
  console.error('[publish-bundle-lifecycle] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[publish-bundle-lifecycle] PASS')
