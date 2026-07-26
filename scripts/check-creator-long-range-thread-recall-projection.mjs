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

function expect(condition, message) {
  if (!condition) failures.push(message)
}

const receiptPath = 'validation/creator-writing/long-range-thread-recall-projection-2026-07-17.json'
const receiptAbsolutePath = resolve(root, receiptPath)
const hasMeasuredReceipt = existsSync(receiptAbsolutePath)

// Real longform receipts are intentionally gitignored because they are derived
// from private local Canon material. Their absence is not a green measurement.
if (hasMeasuredReceipt) {
  const receipt = JSON.parse(readFileSync(receiptAbsolutePath, 'utf8'))
  expect(receipt.status === 'real_verified_thread_recall_projection_measured_not_applied', 'receipt must remain measured and not applied')
  expect(receipt.source?.fromChapter === 1 && receipt.source?.toChapter === 20, 'receipt must cover only Chapters 1-20')
  expect(receipt.source?.independentlyVerifiedThreadCount === 13, 'receipt must retain 13 independently verified threads')
  expect(receipt.source?.activeRecallCandidateCount === 4, 'receipt must retain 4 active recall candidates')
  expect(receipt.source?.recallDirectoryCandidateCount === 4, 'all real candidates must enter the manual recall directory')
  expect(receipt.source?.locatedCandidateCount === 4, 'all real candidates must retain a Canon locator')
  expect(receipt.source?.privateThreadTextCopiedIntoReceipt === false, 'receipt must not copy private thread text')
  expect(receipt.authorBoundary?.allCandidatesInitiallyUnselected === true, 'all candidates must begin unselected')
  expect(receipt.authorBoundary?.explicitConfirmationRequired === true, 'explicit author confirmation must be required')
  expect(receipt.authorBoundary?.simulatedAuthorSelectionApplied === false, 'validation must not simulate an author selection')
  expect(receipt.authorBoundary?.contextSnapshotChanged === false, 'validation must not change Context Snapshot')
  for (const key of [
    'workspaceChanged',
    'acceptedManuscriptChanged',
    'canonChanged',
    'chapter21ManuscriptReadOrChanged',
    'localRepositoryChanged',
    'cloudDataChanged',
    'publicationPerformed',
  ]) {
    expect(receipt.sideEffects?.[key] === false, `${key} must remain false`)
  }
}

const domainSource = read('app/src/features/creator-decision/longRangeThreadRecall.ts')
for (const marker of [
  'validateLongRangeStoryThreadReview',
  'validateLongRangeStoryThreadVerification',
  "selectionState: 'unselected'",
  'authorSelectionRequired: true',
  'explicit author confirmation',
  'cannot come from the current or a future chapter',
]) {
  expect(domainSource.includes(marker), `long-range thread recall domain missing ${marker}`)
}
const directorySource = read('app/src/apps/creator/routes/creatorEditorRecallViewModels.ts')
for (const marker of [
  'longRangeThreadRecallCandidates',
  'candidate.workId === input.workId',
  'candidate.branchId === input.branchId',
  'candidate.sourceChapter < input.chapterNumber',
  'recommended: false',
]) {
  expect(directorySource.includes(marker), `manual recall directory missing ${marker}`)
}

if (failures.length > 0) {
  console.error('[creator-long-range-thread-recall-projection] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

if (hasMeasuredReceipt) {
  console.log('[creator-long-range-thread-recall-projection] PASS (4 real candidates, all unselected and directory-visible)')
} else {
  console.log('[creator-long-range-thread-recall-projection] NOT_MEASURED (private receipt excluded; domain and directory contracts passed)')
}
