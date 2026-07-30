#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const failures = []

function read(path) {
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) {
    failures.push(`missing ${path}`)
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

requireMarkers('app/src/features/creator-decision/longRangeThreadRecall.ts', [
  'computeLongRangeThreadSourceRevision',
  'verifiedLongRangeThreadRecordSchema',
  'buildVerifiedLongRangeThreadRecords',
  'projectVerifiedLongRangeThreadRecordsToRecallCandidates',
  "importedBy: z.literal('author-confirmed')",
  "localOnly: z.literal(true)",
  "record.status !== 'active'",
  'record.sourceRevision !== input.currentSourceRevision',
  'sourceBlock?.text.includes(record.sourceEvidenceQuote)',
  "selectionState: 'unselected'",
])
requireMarkers('app/src/apps/creator/routes/creatorEditorLongRangeRecallService.ts', [
  'buildEditorLongRangeRecallChapters',
  'computeLongRangeThreadSourceRevision',
  'loadVerifiedLongRangeThreadRecallCandidates',
  "reason: 'missing_scope'",
  "reason: 'insufficient_canon'",
  "reason: 'invalid_canon'",
])
requireMarkers('app/src/apps/creator/routes/CreatorEditorRoute.tsx', [
  'runEditorLongRangeRecallLoad',
  'longRangeThreadRecallCandidates',
  'setLongRangeThreadRecallCandidates(result.candidates)',
])
requireMarkers('app/src/local-db/creatorLocalLongRangeThreadRepository.ts', [
  'readVerifiedLongRangeThreadRecords',
  'importVerifiedLongRangeThreadRecords',
  'loadVerifiedLongRangeThreadRecallCandidates',
  'authorConfirmed',
  'flushCreatorLocalWrites',
])
requireMarkers('app/src/local-db/creatorLocalDb.ts', [
  "verifiedLongRangeThreads: 'verifiedLongRangeThreads'",
  "ensureStore(db, transaction, creatorLocalStoreNames.verifiedLongRangeThreads, 'id'",
])
requireMarkers('app/src/local-db/creatorLocalWorkspacePackage.ts', [
  "'verifiedLongRangeThreads'",
  'snapshot.verifiedLongRangeThreads',
  'importVerifiedLongRangeThreadRecords',
])
requireMarkers('scripts/browser-verified-long-range-thread-real-repository.mts', [
  'buildVerifiedLongRangeThreadRecords',
  'importVerifiedLongRangeThreadRecords',
  'loadVerifiedLongRangeThreadRecallCandidates',
  'authorConfirmed: false',
  'authorConfirmed: true',
  "deleteLocalWorkspaceRecord",
  "creator-editor-real-long-range-recall-context.v1",
  "data-recall-source-id^=\"long-range-thread:\"",
  "excludedSourceCountInContext",
  "chapter21ManuscriptReadOrChanged: false",
])

const receipt = JSON.parse(read('validation/creator-writing/verified-long-range-thread-repository-2026-07-17.json') || '{}')
if (receipt.status !== 'verified_long_range_thread_repository_roundtrip_passed') failures.push('browser receipt status must pass')
if (receipt.scope?.chapter21OrLaterAccessed !== false) failures.push('browser receipt must preserve the Chapter 20 stop line')
if (receipt.result?.rejectedWithoutAuthor !== true) failures.push('repository must reject import without author confirmation')
if (receipt.result?.durableRecordCount !== 1) failures.push('browser receipt must prove one durable IndexedDB record')
if (receipt.result?.candidateCount !== 1 || receipt.result?.candidateInitiallyUnselected !== true) {
  failures.push('browser receipt must prove one initially unselected recall candidate')
}
if (receipt.result?.staleCandidateCount !== 0) failures.push('source revision drift must exclude stale recall candidates')
if (receipt.result?.deletedCount !== 0 || receipt.result?.restoredRecordCount !== 1) {
  failures.push('workspace package must delete and restore the record in a real roundtrip')
}
if (receipt.result?.dbVersion !== 10) failures.push('browser receipt must use local schema version 10')
for (const [key, value] of Object.entries(receipt.sideEffects || {})) {
  if (value !== false) failures.push(`browser receipt side effect ${key} must remain false`)
}

const realReceipt = JSON.parse(read('validation/creator-writing/verified-long-range-thread-real-repository-2026-07-17.json') || '{}')
if (realReceipt.status !== 'real_verified_long_range_thread_repository_roundtrip_passed') {
  failures.push('real-corpus browser receipt status must pass')
}
if (realReceipt.source?.fromChapter !== 1 || realReceipt.source?.toChapter !== 20 || realReceipt.source?.chapterCount !== 20) {
  failures.push('real-corpus browser receipt must cover accepted Chapters 1-20 exactly')
}
if (realReceipt.source?.privateTextCopiedIntoReceipt !== false) {
  failures.push('real-corpus browser receipt must not copy private text')
}
if (
  realReceipt.source?.sourceCanonSeedMethod !== 'strict_current_repository'
  || realReceipt.source?.legacyFullWorkspaceApplyClaimed !== false
) {
  failures.push('real-corpus receipt must distinguish strict current-repository Canon seeding from unsupported legacy full-package apply')
}
if (!Array.isArray(realReceipt.limitations) || !realReceipt.limitations.some(item => item.includes('not claimed as a full v10 apply'))) {
  failures.push('real-corpus receipt must disclose the legacy workspace full-apply blocker')
}
if (realReceipt.result?.rejectedWithoutAuthor !== true) {
  failures.push('real-corpus import must reject missing author confirmation')
}
if (realReceipt.result?.durableRecordCount !== 13) {
  failures.push('real-corpus browser receipt must persist all 13 independently verified records')
}
const expectedStatusCounts = { active: 4, progressed: 8, fulfilled: 1, broken: 0 }
for (const [status, expected] of Object.entries(expectedStatusCounts)) {
  if (realReceipt.result?.statusCounts?.[status] !== expected) {
    failures.push(`real-corpus browser receipt status ${status} must equal ${expected}`)
  }
}
if (
  realReceipt.result?.candidateCount !== 4
  || realReceipt.result?.routeLoadOk !== true
  || realReceipt.result?.routeCandidateCount !== 4
  || realReceipt.result?.routeSourceRevisionMatches !== true
  || realReceipt.result?.candidateInitiallyUnselected !== true
  || realReceipt.result?.everyCandidateRequiresAuthorSelection !== true
) {
  failures.push('real-corpus browser receipt must expose exactly four unselected author-gated candidates through the Route loader')
}
if (realReceipt.result?.staleCandidateCount !== 0) {
  failures.push('real-corpus revision drift must fail closed')
}
if (
  !Number.isInteger(realReceipt.result?.changedEvidenceCandidateCount)
  || realReceipt.result.changedEvidenceCandidateCount >= realReceipt.result.candidateCount
) {
  failures.push('real-corpus changed source evidence must remove at least one candidate')
}
if (
  realReceipt.result?.deletedCount !== 0
  || realReceipt.result?.restoredRecordCount !== 13
  || realReceipt.result?.restoredCandidateCount !== 4
) {
  failures.push('real-corpus workspace package must restore all records and eligible candidates')
}
if (realReceipt.result?.dbVersion !== 10 || !(realReceipt.result?.packageByteLength > 0)) {
  failures.push('real-corpus roundtrip must use IndexedDB v10 and produce package bytes')
}
if (realReceipt.authorBoundary?.simulatedAuthorSelectionApplied !== false) {
  failures.push('real-corpus browser run must not simulate author selection')
}
for (const [key, value] of Object.entries(realReceipt.sideEffects || {})) {
  if (value !== false) failures.push(`real-corpus browser receipt side effect ${key} must remain false`)
}

const authorSelectionReceipt = JSON.parse(read('validation/creator-writing/verified-long-range-thread-author-selection-2026-07-18.json') || '{}')
if (
  authorSelectionReceipt.schemaVersion !== 'creator-editor-real-long-range-recall-context.v1'
  || authorSelectionReceipt.status !== 'real_long_range_thread_author_selection_to_context_passed'
) {
  failures.push('real long-range author-selection receipt must pass the current schema')
}
if (
  authorSelectionReceipt.browser !== 'Google Chrome'
  || authorSelectionReceipt.source?.fromChapter !== 1
  || authorSelectionReceipt.source?.toChapter !== 20
  || authorSelectionReceipt.source?.chapterCount !== 20
  || authorSelectionReceipt.source?.verifiedRecordCount !== 13
  || authorSelectionReceipt.source?.eligibleLongRangeCardCount !== 4
) {
  failures.push('real long-range author-selection receipt must identify Google Chrome and the exact Chapter 1-20 corpus')
}
if (
  authorSelectionReceipt.source?.sourceCanonSeedMethod !== 'strict_current_repository'
  || authorSelectionReceipt.source?.creatorCloudFacade !== 'authenticated_creator_qa_fixture'
  || authorSelectionReceipt.source?.candidateAdapter !== 'deterministic_reference'
  || authorSelectionReceipt.source?.realModelQualityClaimed !== false
  || authorSelectionReceipt.source?.privateTextCopiedIntoReceipt !== false
) {
  failures.push('real long-range author-selection receipt must disclose its repository, QA facade, adapter, and claim boundary')
}
if (
  authorSelectionReceipt.interaction?.editorRouteChapter !== 20
  || authorSelectionReceipt.interaction?.explicitCheckboxClick !== true
  || authorSelectionReceipt.interaction?.selectedLongRangeCardCount !== 1
  || authorSelectionReceipt.interaction?.unselectedLongRangeCardCount !== 3
  || authorSelectionReceipt.interaction?.selectionPersistedAcrossRefresh !== true
  || authorSelectionReceipt.interaction?.intentLocked !== true
  || authorSelectionReceipt.interaction?.candidateSearchTriggeredByAuthor !== true
  || authorSelectionReceipt.interaction?.candidateCount < 1
  || authorSelectionReceipt.interaction?.candidateCount > 3
  || authorSelectionReceipt.interaction?.candidateAutoSelected !== false
  || authorSelectionReceipt.interaction?.contextPersistedAcrossRefresh !== true
  || authorSelectionReceipt.interaction?.selectedSourceEnteredContext !== true
  || authorSelectionReceipt.interaction?.unselectedSourcesEnteredContext !== 0
) {
  failures.push('real long-range author-selection receipt must prove explicit 1-of-4 selection and exact Context inclusion')
}
if (
  authorSelectionReceipt.evidence?.matchingContextCount < 1
  || authorSelectionReceipt.evidence?.contextLongRangeSourceCount !== 1
  || authorSelectionReceipt.evidence?.sceneDraftCount !== 0
  || authorSelectionReceipt.evidence?.postStopLineCanonCount !== 0
) {
  failures.push('real long-range author-selection receipt must prove durable Context and zero prose/post-stop records')
}
for (const [key, value] of Object.entries(authorSelectionReceipt.sideEffects || {})) {
  if (value !== false) failures.push(`real long-range author-selection side effect ${key} must remain false`)
}

if (failures.length) {
  console.error('[creator-long-range-thread-repository] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[creator-long-range-thread-repository] PASS (13 real records + 1-of-4 Chrome author selection + exact Context inclusion, no prose/canon/public write)')
