#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

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

function requireMarkers(path, markers) {
  const source = read(path)
  for (const marker of markers) {
    if (!source.includes(marker)) failures.push(`${path} missing ${marker}`)
  }
  return source
}

const integrityUrl = pathToFileURL(resolve(root, 'app/src/local-db/creatorLocalIntegrity.ts')).href
const { sha256Text, utf8ByteLength } = await import(integrityUrl)
if (await sha256Text('abc') !== 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad') {
  failures.push('SHA-256 helper does not match the standard abc digest')
}
if (utf8ByteLength('创作') !== 6) failures.push('UTF-8 byte length helper must count encoded bytes')

const schema = requireMarkers('app/src/local-db/schema.ts', [
  'LOCAL_SCHEMA_VERSION = 10',
  "draftBodies: 'id, draftId, status, updatedAt'",
  "workspacePackages: 'id, kind, createdAt'",
  "workspaceImports: 'id, packageId, status, appliedAt'",
  'LocalDraftBodyRecord',
  "status: 'staged' | 'ready' | 'history'",
  'bodyChecksum: string',
  'bodyByteLength: number',
  'bodyVersion: number',
])
const bodyStore = requireMarkers('app/src/local-db/creatorLocalDraftBodyStore.ts', [
  'navigator.storage.getDirectory()',
  'prepareLocalDraftBody',
  'writeStagedRecoveryRecord',
  'preferredStorageKind',
  'draftMetadataFromPreparedBody',
  'readLocalDraftBody',
  'readLocalDraftBodyRecoveryRecords',
  'LOCAL_DRAFT_BODY_HISTORY_LIMIT = 5',
  'inspectLocalDraftBodyRegression',
  "status: 'historical_regression'",
  'sha256Text(content)',
  "source: 'indexeddb' as const",
])
const repository = requireMarkers('app/src/local-db/creatorLocalRepository.ts', [
  'queueCoordinatedDraftPut',
  'commitDraftWithRevision',
  'migrateInlineDraftRecord',
  'draftMetadataFromPreparedBody',
  'transaction.objectStore(DRAFT_STORE).put(metadata)',
  'bodyStore.put(prepared.readyRecord)',
  'historicalDraftBodyId(draft.localDraftRef, currentBody.version)',
  'retainedHistory.slice(LOCAL_DRAFT_BODY_HISTORY_LIMIT)',
  'bodyStore.delete(prepared.stagingId)',
  'restoreCreatorLocalDrafts',
  'flushCreatorLocalWrites',
])
const draftHydration = requireMarkers('app/src/local-db/creatorLocalDraftHydration.ts', [
  'export async function restoreCreatorLocalDrafts',
  'readLocalDraftBody(record, bodyMap.get(record.bodyStorage.tableId))',
  "body.status === 'staged'",
  'content: stagedRecovery.content',
])
if (repository.includes('async function restoreStoredDrafts') || repository.includes('function isLocalDraftRecord')) {
  failures.push('creatorLocalRepository.ts must delegate draft-body hydration to creatorLocalDraftHydration.ts')
}
requireMarkers('app/src/local-db/creatorLocalDb.ts', [
  "draftBodies: 'draftBodies'",
  "workspacePackages: 'workspacePackages'",
  "workspaceImports: 'workspaceImports'",
  "ensureStore(db, transaction, creatorLocalStoreNames.draftBodies, 'id', ['draftId', 'status', 'updatedAt'])",
])
requireMarkers('docs/data-contracts/local-creator-storage-v2.md', [
  'S4.3 draft-body ownership acceptance',
  'OPFS is the preferred body store',
  '`draftBodies` remains the universal recovery copy',
  'SHA-256',
  'staged body',
  'same-tab historical-body rejection',
])

for (const [path, source] of [
  ['schema.ts', schema],
  ['creatorLocalDraftBodyStore.ts', bodyStore],
  ['creatorLocalRepository.ts', repository],
  ['creatorLocalDraftHydration.ts', draftHydration],
]) {
  for (const forbidden of ['localStorage', 'getSupabaseBrowserClient', 'service_role', 'provider_response']) {
    if (source.includes(forbidden)) failures.push(`${path} must not include ${forbidden}`)
  }
}

if (failures.length) {
  console.error('[local-body-storage] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(JSON.stringify({
  status: 'passed',
  gate: 'EPIC2_LOCAL_BODY_STORAGE',
  schemaVersion: 10,
  integrity: 'sha256',
  preferred: 'opfs',
  fallback: 'indexeddb',
}, null, 2))
