#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const failures = []

function requireAll(path, markers) {
  const source = readFileSync(resolve(root, path), 'utf8')
  for (const marker of markers) {
    if (!source.includes(marker)) failures.push(`${path} missing ${marker}`)
  }
}

function forbidAll(path, markers) {
  const source = readFileSync(resolve(root, path), 'utf8')
  for (const marker of markers) {
    if (source.includes(marker)) failures.push(`${path} must not expose ${marker}`)
  }
}

requireAll('app/src/features/creator-pivot/creativeReminderEngine.ts', [
  'buildCreativeReminderSuggestions',
  'applyCreativeReminderAuthorUpdate',
  "status: current?.status || 'suggested'",
  "createdBy: current?.createdBy || 'rule-engine'",
  'localOnly: true',
])
forbidAll('app/src/features/creator-pivot/creativeReminderEngine.ts', [
  'export function reminderSourceIds',
])
requireAll('app/src/local-db/creatorLocalWritingRepository.ts', [
  'suggestLocalCreativeReminders',
  'updateLocalCreativeReminder',
  'upsertLocalCreativeReminderRecord',
])
requireAll('app/src/apps/creator/routes/creatorEchoActionService.ts', [
  'runCreatorEchoReminderAction',
  "status: 'pinned' | 'used' | 'dismissed'",
])
requireAll('app/src/apps/creator/routes/CreatorEchoRoute.tsx', [
  'CreatorExternalEchoInboxCard',
  'CreatorExternalEchoDetailPanel',
  'runCreatorEchoReminderAction',
])

const fixture = spawnSync(resolve(root, 'node_modules/.bin/tsx'), ['tests/creative-reminder-flow.ts'], {
  cwd: resolve(root, 'app'),
  encoding: 'utf8',
})
if (fixture.status !== 0) failures.push(`CreativeReminder fixture failed:\n${fixture.stdout}${fixture.stderr}`)

if (failures.length) {
  console.error('CreativeReminder flow check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('CreativeReminder flow check passed.')
