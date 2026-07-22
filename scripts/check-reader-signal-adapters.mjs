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

requireAll('app/src/features/creator-pivot/externalEchoContracts.ts', [
  'ReaderSignalAdapter<TRecord',
  'ReaderRequestSignalRecord',
  'ReaderCommentSignalRecord',
  'ReaderHighlightSignalRecord',
  'ReaderReactionSignalRecord',
  'ReaderQuestionSignalRecord',
  'ReaderVoteAggregateSignalRecord',
  'completeSnapshot',
])
requireAll('app/src/features/creator-pivot/externalEchoAdapters.ts', [
  'normalizeReaderSignalBatches',
  'sourceSyncStatesFromBatches',
  'readerSignalBatchesFromRequests',
  'sourceRefs',
  'normalizedHash',
])
requireAll('app/src/features/creator-pivot/externalEchoCloudProjection.ts', [
  'CloudExternalEchoRow',
  'encodeExternalEchoCloudCursor',
  'decodeExternalEchoCloudCursor',
  'cloudExternalEchoBatch',
  'unavailableCloudExternalEchoBatch',
])
forbidAll('app/src/features/creator-pivot/externalEchoAdapters.ts', [
  'export function hashReaderSignalContent',
])
forbidAll('app/src/features/creator-pivot/externalEchoCloudProjection.ts', [
  'export interface ExternalEchoCloudCursor',
])
forbidAll('app/src/features/creator-pivot/externalEchoContracts.ts', [
  'export interface ReaderSignalSourceRecordBase',
])
requireAll('app/src/local-db/schema.ts', [
  'LOCAL_SCHEMA_VERSION = 10',
  'ReaderSignalSourceSyncState',
  'readerSignalSources',
  "visibility: 'visible' | 'hidden' | 'deleted'",
  'sourceCursor: string | null',
])
requireAll('app/src/apps/creator/routes/creatorEchoLoadService.ts', [
  'listSignalBatches',
  'cacheReaderSignals',
  'cachedEchoResult',
  "freshness: 'fresh' | 'stale' | 'offline'",
  'currentSignalSources',
])
requireAll('app/src/lib/pmfSupabase.ts', [
  "rpc('list_creator_reader_signals'",
  'decodeExternalEchoCloudCursor',
  'unavailableCloudExternalEchoBatch',
])

const fixture = spawnSync(resolve(root, 'node_modules/.bin/tsx'), ['tests/reader-signal-adapters.ts'], {
  cwd: resolve(root, 'app'),
  encoding: 'utf8',
})
if (fixture.status !== 0) failures.push(`ReaderSignal fixture failed:\n${fixture.stdout}${fixture.stderr}`)

if (failures.length) {
  console.error('ReaderSignal adapter check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('ReaderSignal adapter check passed.')
