const { existsSync, readFileSync } = require('node:fs')
const { resolve } = require('node:path')

const root = resolve(__dirname, '..')
const failures: string[] = []

function read(path: string) {
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) throw new Error(`Missing required file: ${path}`)
  return readFileSync(absolute, 'utf8')
}

function requireAll(path: string, markers: string[]) {
  const source = read(path)
  for (const marker of markers) {
    if (!source.includes(marker)) failures.push(`${path} missing ${JSON.stringify(marker)}`)
  }
  return source
}

function forbidAll(path: string, markers: string[]) {
  const source = read(path)
  for (const marker of markers) {
    if (source.includes(marker)) failures.push(`${path} must not include ${JSON.stringify(marker)}`)
  }
}

const route = requireAll('app/src/apps/creator/routes/CreatorEchoRoute.tsx', [
  'CreatorExternalEchoInboxCard',
  'CreatorExternalEchoDetailPanel',
  "from './creatorEchoRouteViewModels'",
  'createCreatorEchoRouteViewModel({',
  'runCreatorEchoReminderAction',
  'scheduleCreatorEchoVisibilityRefresh',
  'subscribeCreatorEchoWorkspaceRefresh',
  '外界回声',
  '回声来源',
  '提醒状态',
  '本机提醒',
])

requireAll('app/src/apps/creator/routes/creatorEchoLoadService.ts', [
  'CreatorEchoLoadApiPort',
  'CreatorEchoLoadLocalPort',
  'listSignalBatches',
  'cacheReaderSignals',
  'suggestCreativeReminders',
  'cachedEchoResult',
  'readCreatorEchoLocalSnapshot',
  "freshness: 'fresh' | 'stale' | 'offline'",
])

requireAll('app/src/apps/creator/routes/creatorEchoActionService.ts', [
  'runCreatorEchoStatusUpdate',
  'runCreatorEchoStartWriting',
  'runCreatorEchoReminderAction',
  "status: 'pinned' | 'used' | 'dismissed'",
  'updateLocalCreativeReminder',
  'creatorFacingNotice(result.message)',
  'notice: `回声已更新为「${requestStatusLabel(result.data.status)}」。`',
  'notice: `创作提醒已更新为「${creativeReminderStatusLabel(updated.status)}」。`',
])

forbidAll('app/src/apps/creator/routes/CreatorEchoRoute.tsx', [
  '回声已更新为「${requestStatusLabel(',
  '创作提醒已更新为「${creativeReminderStatusLabel(',
])

requireAll('app/src/apps/creator/routes/creatorEchoBrowserActionService.ts', [
  'scheduleCreatorEchoInitialLoad',
  'scheduleCreatorEchoVisibilityRefresh',
  'subscribeCreatorEchoWorkspaceRefresh',
  "family === 'creativeReminders'",
  "family === 'readerSignals'",
  "family === 'readerSignalSources'",
])

requireAll('app/src/apps/creator/routes/creatorEchoSignalViewModels.ts', [
  'resolveVisibleEchoSignals',
  'buildEchoSignalViewCounts',
  'buildEchoSourceRows',
  'resolvePriorityEchoSignal',
  'buildEchoSignalViewModel',
  'buildPriorityEchoSignalAction',
])

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

requireAll('app/src/components/creator/CreatorExternalEchoInboxCard.tsx', [
  'Card',
  'Badge',
  'Button',
  'CardFooter',
  'data-slot="creator-external-echo-card"',
  'data-slot="creator-external-echo-card-source"',
  'data-slot="creator-external-echo-card-reminder"',
  'data-slot="creator-external-echo-card-actions"',
  '<figure',
  '<section',
  'data-reader-signal-id',
  'data-reader-signal-source',
  'data-reminder-status',
  '保存提醒',
  '已用在写作里',
  '先放下',
])

requireAll('app/src/components/creator/CreatorExternalEchoDetailPanel.tsx', [
  'Alert',
  'CardFooter',
  'data-slot="creator-external-echo-detail"',
  'data-slot="creator-external-echo-detail-context"',
  'data-slot="creator-external-echo-detail-source"',
  'data-slot="creator-external-echo-detail-reminder"',
  'data-slot="creator-external-echo-detail-actions"',
  'data-slot="creator-external-echo-detail-empty"',
  '<dl',
  '<figure',
  '<section',
  '读者原话保持公开来源；你的判断只保存在本机。',
  '读者回声',
  '本机判断',
])

forbidAll('app/src/components/creator/CreatorExternalEchoInboxCard.tsx', [
  'CreatorActionBar',
  "className={cn('creator-external-echo-card'",
])
forbidAll('app/src/components/creator/CreatorExternalEchoDetailPanel.tsx', [
  'CreatorActionBar',
  'CreatorStatePanel',
  'className="creator-external-echo-detail"',
])

requireAll('app/src/features/creator-pivot/externalEchoContracts.ts', [
  'ReaderSignalAdapter<TRecord',
  'ReaderSignalSourceBatch',
  'completeSnapshot',
])
requireAll('app/src/features/creator-pivot/externalEchoAdapters.ts', [
  'normalizeReaderSignalBatches',
  'sourceSyncStatesFromBatches',
  'readerSignalBatchesFromRequests',
])
requireAll('app/src/features/creator-pivot/creativeReminderEngine.ts', [
  'buildCreativeReminderSuggestions',
  'applyCreativeReminderAuthorUpdate',
  'localOnly: true',
])
requireAll('app/src/local-db/creatorLocalReaderSignalRepository.ts', [
  'cacheReaderSignalBatches',
  'readLocalReaderSignalSources',
  'reconcileCompleteSnapshots',
  'upsertLocalReaderSignalSourceRecord',
])
requireAll('app/src/local-db/creatorLocalWritingRepository.ts', [
  'suggestLocalCreativeReminders',
  'updateLocalCreativeReminder',
])

forbidAll('app/src/apps/creator/routes/CreatorEchoRoute.tsx', [
  'listCreatorRequests()',
  'listCreatorEchoSourceBatches(',
  'cacheReaderSignalBatches(',
  'upsertLocalReaderSignalRecord(',
  'upsertLocalCreativeReminderRecord(',
  'window.open',
  'window.setInterval',
  '<CreatorEchoQueueCard',
  '<CreatorRequestQueueCard',
  '<table',
  'buildRequestClusterCounts(requests)',
  'resolveVisibleEchoSignals(readerSignals, creativeReminders, {',
  'resolveReminderForSignal(',
  'resolveRequestForSignal(',
  'const savedViews:',
  'new Map(works.map(',
])

forbidAll('app/src/apps/creator/routes/creatorEchoRouteViewModels.ts', [
  "from 'react'",
  'lucide-react',
  '@/components/',
  '@/lib/pmfSupabase',
  "from '@/local-db/creator",
  'window.',
  'document.',
  'fetch(',
  'navigate(',
])

forbidAll('app/src/features/creator-pivot/externalEchoAdapters.ts', [
  "from 'react'",
  '@/components/',
  '@/lib/pmfSupabase',
  'window.',
  'localStorage',
])
forbidAll('app/src/features/creator-pivot/creativeReminderEngine.ts', [
  "from 'react'",
  '@/components/',
  '@/lib/pmfSupabase',
  'window.',
  'localStorage',
])

if (!route.includes('{selectedRequest ? (')) {
  failures.push('request-specific status actions must remain conditional on a normalized request source')
}

if (failures.length) {
  console.error('[creator-m3-requests] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[creator-m3-requests] PASS')
