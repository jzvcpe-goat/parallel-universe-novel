import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'

import { strFromU8, unzipSync } from 'fflate'

import { localCanonStateRecordSchema } from '../app/src/features/creator-decision/schemas.ts'
import { buildCreatorRecallCandidates } from '../app/src/apps/creator/routes/creatorEditorRecallViewModels.ts'
import {
  buildVerifiedLongRangeThreadRecallCandidates,
  confirmVerifiedLongRangeThreadRecallSelection,
} from '../app/src/features/creator-decision/longRangeThreadRecall.ts'
import type { LongformContinuityChapter } from '../app/src/features/creator-decision/longformContinuity.ts'
import {
  longRangeStoryThreadReviewSchema,
  longRangeStoryThreadVerificationSchema,
} from '../app/src/features/creator-decision/longRangeStoryThreads.ts'
import type { LocalCreatorStoreName } from '../app/src/local-db/schema.ts'

type WorkspaceExport = {
  schemaVersion: number
  records: Array<{ family: LocalCreatorStoreName; value: unknown }>
}

const defaultSummary = 'validation/creator-ui/conversation-recall-2026-07-14/chapter-01-20-long-range-story-threads-reconciled-2026-07-16/summary.json'
const defaultReceipt = 'validation/creator-writing/long-range-thread-recall-projection-2026-07-17.json'
const stopLine = 20

const { values } = parseArgs({
  options: {
    workspace: { type: 'string' },
    ledger: { type: 'string' },
    summary: { type: 'string', default: defaultSummary },
    receipt: { type: 'string', default: defaultReceipt },
  },
  strict: true,
})

function required(name: keyof typeof values) {
  const value = values[name]
  if (!value) throw new Error(`Missing required --${name} argument.`)
  return value
}

function sha256(value: Uint8Array | string) {
  return createHash('sha256').update(value).digest('hex')
}

function chapterNumber(chapterId: string) {
  const match = chapterId.match(/:chapter:(\d+)$/u)
  return match ? Number(match[1]) : null
}

const workspacePath = required('workspace')
const ledgerPath = required('ledger')
const summaryPath = required('summary')
const receiptPath = required('receipt')
const [workspaceBytes, ledgerBytes, summaryBytes] = await Promise.all([
  readFile(workspacePath),
  readFile(ledgerPath),
  readFile(summaryPath),
])
const workspaceHashBefore = sha256(workspaceBytes)
const ledgerHash = sha256(ledgerBytes)
const summary = JSON.parse(summaryBytes.toString('utf8')) as {
  scope?: { workId?: string; fromChapter?: number; toChapter?: number; chapterCount?: number; workspaceArchiveSha256?: string }
  results?: { verifiedThreadCount?: number; activeRecallCandidateCount?: number }
  sideEffects?: { chapter21AccessedOrChanged?: boolean }
}
assert.ok(summary.scope?.workId)
assert.equal(summary.scope.fromChapter, 1)
assert.equal(summary.scope.toChapter, stopLine)
assert.equal(summary.scope.chapterCount, stopLine)
assert.equal(summary.scope.workspaceArchiveSha256, workspaceHashBefore)
assert.equal(summary.results?.verifiedThreadCount, 13)
assert.equal(summary.sideEffects?.chapter21AccessedOrChanged, false)

const archive = unzipSync(new Uint8Array(workspaceBytes))
const recordsBytes = archive['records.json']
assert.ok(recordsBytes, 'Workspace archive must contain records.json.')
const workspace = JSON.parse(strFromU8(recordsBytes)) as WorkspaceExport
assert.equal(workspace.schemaVersion, 1)

const canonByChapter = new Map<number, ReturnType<typeof localCanonStateRecordSchema.parse>>()
let postStopLineEmptyRecordCount = 0
for (const record of workspace.records) {
  if (record.family !== 'localCanonStates' || !record.value || typeof record.value !== 'object') continue
  const raw = record.value as { workId?: unknown; chapterId?: unknown; acceptedContentBlocks?: unknown[] }
  if (raw.workId !== summary.scope.workId || typeof raw.chapterId !== 'string') continue
  const number = chapterNumber(raw.chapterId)
  if (!number) continue
  if (number > stopLine) {
    postStopLineEmptyRecordCount += 1
    assert.equal(raw.acceptedContentBlocks?.length ?? 0, 0, 'Post-stop-line Canon records must not contain manuscript blocks.')
    continue
  }
  const canon = localCanonStateRecordSchema.parse(record.value)
  const existing = canonByChapter.get(number)
  if (!existing || canon.revision > existing.revision) canonByChapter.set(number, canon)
}

const chapters: LongformContinuityChapter[] = []
const branchIds = new Set<string>()
for (let number = 1; number <= stopLine; number += 1) {
  const canon = canonByChapter.get(number)
  assert.ok(canon, `Chapter ${number} is missing a local Canon record.`)
  assert.ok(canon.acceptedDraftRevision > 0 && canon.acceptedContentBlocks.length > 0)
  branchIds.add(canon.branchId)
  chapters.push({
    chapterNumber: number,
    chapterId: canon.chapterId,
    blocks: canon.acceptedContentBlocks.map(block => ({ id: block.id, text: block.text })),
  })
}
assert.equal(branchIds.size, 1)
const branchId = [...branchIds][0]!
const sourceRevision = Math.max(1, Number.parseInt(ledgerHash.slice(0, 8), 16))
const rawPasses = JSON.parse(ledgerBytes.toString('utf8')) as Array<{ review: unknown; verification: unknown }>
assert.equal(rawPasses.length, 2)

const candidates = rawPasses.flatMap(rawPass => {
  const review = longRangeStoryThreadReviewSchema.parse(rawPass.review)
  const verification = longRangeStoryThreadVerificationSchema.parse(rawPass.verification)
  return buildVerifiedLongRangeThreadRecallCandidates({
    workId: summary.scope!.workId!,
    branchId,
    currentChapterNo: stopLine,
    sourceRevision,
    chapters,
    review,
    verification,
  })
})
assert.equal(candidates.length, summary.results?.activeRecallCandidateCount ?? 4)
assert.ok(candidates.every(candidate => candidate.selectionState === 'unselected'))
assert.ok(candidates.every(candidate => candidate.authorSelectionRequired))
assert.ok(candidates.every(candidate => candidate.locator.kind === 'canon'))
assert.equal(new Set(candidates.map(candidate => candidate.id)).size, candidates.length)
const recallDirectory = buildCreatorRecallCandidates({
  chapters: [],
  settingAssets: [],
  linkedRequest: null,
  workId: summary.scope.workId,
  branchId,
  chapterId: `${summary.scope.workId}:chapter:${stopLine}`,
  chapterNumber: stopLine,
  longRangeThreadRecallCandidates: candidates,
})
assert.equal(recallDirectory.length, candidates.length)
assert.ok(recallDirectory.every(candidate => candidate.recommended === false))
assert.throws(() => confirmVerifiedLongRangeThreadRecallSelection({
  candidates,
  selectedCandidateIds: candidates.map(candidate => candidate.id),
  authorConfirmed: false,
}), /explicit author confirmation/u)

const groupCounts = Object.fromEntries(
  ['causal', 'character_knowledge', 'timeline', 'promise'].map(group => [
    group,
    candidates.filter(candidate => candidate.group === group).length,
  ]),
)
assert.equal(sha256(await readFile(workspacePath)), workspaceHashBefore)
const receipt = {
  schemaVersion: 1,
  status: 'real_verified_thread_recall_projection_measured_not_applied',
  completedAt: new Date().toISOString(),
  source: {
    workId: summary.scope.workId,
    branchId,
    fromChapter: 1,
    toChapter: stopLine,
    chapterCount: chapters.length,
    workspaceArchiveSha256: workspaceHashBefore,
    summarySha256: sha256(summaryBytes),
    privateLedgerSha256: ledgerHash,
    independentlyVerifiedThreadCount: summary.results?.verifiedThreadCount,
    activeRecallCandidateCount: candidates.length,
    recallDirectoryCandidateCount: recallDirectory.length,
    groupCounts,
    locatedCandidateCount: candidates.filter(candidate => candidate.locator.targetId).length,
    privateThreadTextCopiedIntoReceipt: false,
    postStopLineEmptyRecordCount,
  },
  authorBoundary: {
    allCandidatesInitiallyUnselected: true,
    explicitConfirmationRequired: true,
    simulatedAuthorSelectionApplied: false,
    contextSnapshotChanged: false,
  },
  sideEffects: {
    workspaceChanged: false,
    acceptedManuscriptChanged: false,
    canonChanged: false,
    chapter21ManuscriptReadOrChanged: false,
    localRepositoryChanged: false,
    cloudDataChanged: false,
    publicationPerformed: false,
  },
}
await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
console.log(`[creator-long-range-thread-recall-projection] PASS (${candidates.length} unselected real candidates; no application)`)
console.log(`[creator-long-range-thread-recall-projection] receipt ${receiptPath}`)
