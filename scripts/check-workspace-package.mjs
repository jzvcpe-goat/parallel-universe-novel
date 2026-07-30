#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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

const packageSource = requireMarkers('app/src/local-db/creatorLocalWorkspacePackage.ts', [
  "LOCAL_WORKSPACE_PACKAGE_FORMAT = 'puf-local-creator-workspace-v2'",
  'zipSync(files',
  'unzipSync(bytes)',
  "files['manifest.json']",
  "files['records.json']",
  '`bodies/${draftHash}.md`',
  '`receipts/${encodeURIComponent(receipt.id)}.json`',
  'manifestSchema.parse',
  'workspaceSettingsSchema.parse',
  'export function normalizeWorkspaceSettingsRecord',
  'sha256Bytes(file)',
  'previewLocalWorkspacePackage',
  'sortPreviewItems',
  "authorConfirmed) throw new Error('Author confirmation is required",
  "conflictPolicy === 'use-import'",
  'rollbackPackageId',
  "status: 'applying'",
  "status: 'failed'",
  'importRecordFingerprints',
  'assertRecordFingerprints',
  'Workspace rollback conflict',
  'rollbackLocalWorkspaceImport',
  "'verifiedLongRangeThreads'",
  'snapshot.verifiedLongRangeThreads',
  'importVerifiedLongRangeThreadRecords',
  'normalizeCreatorDecisionWorkspaceRecordValue',
])
requireMarkers('app/src/local-db/creatorLocalDecisionRepository.ts', [
  'export function isCreatorDecisionRecordFamily',
  'export function normalizeCreatorDecisionWorkspaceRecordValue',
  "case 'contextSnapshots'",
  'return contextSnapshotSchema.parse(value)',
])
requireMarkers('app/src/local-db/creatorLocalWorkspacePackageRepository.ts', [
  'saveLocalWorkspacePackageRecord',
  'readLocalWorkspacePackageRecord',
  'saveLocalWorkspaceImportReceipt',
  'readLocalWorkspaceImportReceipt',
])
requireMarkers('app/src/apps/creator/routes/CreatorSettingsRoute.tsx', [
  'runCreatorSettingsWorkspaceExport',
  'previewCreatorSettingsWorkspaceImport',
  'runCreatorSettingsWorkspaceImport',
])
requireMarkers('app/src/apps/creator/routes/creatorSettingsWorkspaceImportFlowService.ts', [
  'previewLocalWorkspacePackage',
  'applyLocalWorkspacePackage',
  'export async function previewCreatorSettingsWorkspaceImport',
  'export async function runCreatorSettingsWorkspaceImport',
  'authorConfirmed: true',
])
requireMarkers('app/src/components/creator/CreatorLocalWorkspacePanel.tsx', [
  'data-slot="creator-local-workspace-import-file-action"',
  'type="file"',
  '<ConfirmActionDialog',
  'value="keep-local"',
  'value="use-import"',
  'data-slot="creator-local-workspace-import-action"',
])
requireMarkers('app/src/apps/creator/routes/creatorSettingsWorkspaceExportFlowService.ts', [
  'buildWorkspacePackage: buildLocalWorkspacePackage',
  'downloadWorkspacePackage: downloadCreatorWorkspacePackage',
  'export async function runCreatorSettingsWorkspaceExport',
])
requireMarkers('app/src/apps/creator/routes/creatorSettingsBrowserActionService.ts', [
  'downloadCreatorWorkspacePackage',
  "type: 'application/zip'",
  '.pufw.zip',
])
requireMarkers('docs/data-contracts/local-creator-storage-v2.md', [
  'S4.4 workspace package and recovery acceptance',
  'manifest.json',
  'records.json',
  'bodies/*.md',
  'receipts/*.json',
  'Import preview is deterministic',
  'rollback snapshot',
])

const appPackage = JSON.parse(read('app/package.json'))
if (!appPackage.dependencies?.fflate) failures.push('app/package.json missing fflate dependency')
if (!appPackage.scripts?.['test:creator-settings-workspace-import']) failures.push('app/package.json missing workspace import flow test')

const realMigrationReceiptPath = 'validation/creator-writing/real-workspace-package-migration-2026-07-18.json'
const hasPrivateRealMigrationReceipt = existsSync(resolve(root, realMigrationReceiptPath))
const realMigrationReceipt = hasPrivateRealMigrationReceipt
  ? JSON.parse(read(realMigrationReceiptPath) || '{}')
  : null

if (realMigrationReceipt) {
  if (realMigrationReceipt.status !== 'passed') failures.push('real workspace package migration receipt must pass')
  if (realMigrationReceipt.browser !== 'Google Chrome') failures.push('real workspace package migration must run in Google Chrome')
  if (realMigrationReceipt.importedRecordCount !== 1021) failures.push('real workspace package migration must account for all 1021 records')
  if (realMigrationReceipt.restoredNonEmptyCanonChapterCount !== 20) failures.push('real workspace package migration must restore 20 non-empty Canon chapters')
  if (realMigrationReceipt.restoredHistoricalContextCount !== 25) failures.push('real workspace package migration must restore 25 historical Context records')
  if (realMigrationReceipt.legacyContextsMarkedStale !== true) failures.push('legacy Context records must remain stale after migration')
  if (realMigrationReceipt.creatorChapter20RouteRestored !== true) failures.push('real workspace package migration must restore the Chapter 20 Creator route')
  if (realMigrationReceipt.creatorChapter20CanonConfirmationVisible !== true) failures.push('Chapter 20 Canon confirmation must be visible after restore')
  if (realMigrationReceipt.nextChapterActionDisplayedButNotTriggered !== true) failures.push('Chapter 21 action must remain displayed but untriggered')
  if (realMigrationReceipt.chapter21NonEmptyCanon !== false) failures.push('real workspace migration must preserve the Chapter 20 stop line')
  if (realMigrationReceipt.generatedProse !== false || realMigrationReceipt.adoptedCandidate !== false) failures.push('real workspace migration must not generate or adopt prose')
  if (realMigrationReceipt.wroteCloud !== false || realMigrationReceipt.published !== false) failures.push('real workspace migration must not write cloud data or publish')
  if (!Array.isArray(realMigrationReceipt.chapterEvidence) || realMigrationReceipt.chapterEvidence.length !== 20) {
    failures.push('real workspace package migration must include 20 per-chapter evidence records')
  } else if (realMigrationReceipt.chapterEvidence.some(chapter => chapter.visibleCharacterCount < 2700 || !/^[a-f0-9]{64}$/.test(chapter.acceptedContentBlocksSha256 || ''))) {
    failures.push('every restored chapter must retain sufficient text and a content-block checksum')
  }
} else {
  console.log('[workspace-package] private real-workspace receipt not included in public review scope')
}

for (const forbidden of ['service_role', 'provider_response', 'cloud generation job']) {
  if (packageSource.includes(forbidden)) failures.push(`workspace package implementation must not include ${forbidden}`)
}
for (const retiredSettingMarker of ['readLocalAiSettings', 'writeLocalAiSettings', 'aiSettings:']) {
  if (packageSource.includes(retiredSettingMarker)) {
    failures.push(`workspace package must not export or restore retired tool setting ${retiredSettingMarker}`)
  }
}

if (failures.length) {
  console.error('[workspace-package] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(JSON.stringify({
  status: 'passed',
  gate: 'EPIC2_WORKSPACE_PACKAGE',
  format: 'puf-local-creator-workspace-v2',
  transport: 'zip-download-upload',
  integrity: 'sha256-per-file',
}, null, 2))
