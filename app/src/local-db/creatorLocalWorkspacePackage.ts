import type { PmfLocalDraft, PmfLocalSettingAsset } from '@/features/pmf/types'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { z } from 'zod'
import { upsertLocalAgentOperation } from './creatorLocalAgentRepository'
import { upsertLocalDraft } from './creatorLocalDraftRepository'
import { importVerifiedLongRangeThreadRecords } from './creatorLocalLongRangeThreadRepository'
import { sha256Bytes, sha256Text, stableJson, utf8Bytes } from './creatorLocalIntegrity'
import { upsertLocalPublishBundle, upsertLocalPublishReceipt } from './creatorLocalPublishRepository'
import { upsertLocalReaderSignal } from './creatorLocalReaderSignalRepository'
import {
  creatorDecisionRecordFamilies,
  isCreatorDecisionRecordFamily,
  normalizeCreatorDecisionWorkspaceRecordValue,
  readCreatorDecisionWorkspaceRecords,
  upsertCreatorDecisionWorkspaceRecord,
  type CreatorDecisionRecordFamily,
} from './creatorLocalDecisionRepository'
import {
  deleteLocalWorkspaceRecord,
  flushCreatorLocalWrites,
  upsertLocalCreativeReminderRecord,
  upsertLocalSettingAssetRecord,
} from './creatorLocalRepository'
import {
  hydrateLocalWorkspace,
  readLocalWorkspaceSnapshot,
  type LocalCreatorWorkspaceSnapshot,
} from './creatorLocalWorkspaceRepository'
import {
  readLocalWorkspaceImportReceipt,
  readLocalWorkspacePackageRecord,
  saveLocalWorkspaceImportReceipt,
  saveLocalWorkspacePackageRecord,
} from './creatorLocalWorkspacePackageRepository'
import {
  readCreatorDisplayPreferences,
  readCreatorWritingAssistPreferences,
  writeCreatorDisplayPreferences,
  writeCreatorWritingAssistPreferences,
  type CreatorDisplayPreferences,
} from './creatorLocalSettingsRepository'
import { creatorWritingAssistPreferencesSchema } from '@/features/creator-decision/schemas'
import type { CreatorWritingAssistPreferences } from '@/features/creator-decision/types'
import { DEFAULT_CREATOR_WRITING_ASSIST_PREFERENCES } from '@/features/creator-decision/writingAssistance'
import type {
  AgentOperationLog,
  CreativeReminder,
  LocalReaderSignalCache,
  LocalWorkspaceImportReceipt,
  LocalWorkspacePackageRecord,
  LocalWorkspaceRecordFamily,
  PublishBundleRecord,
  PublishReceiptRecord,
} from './schema'
import { LOCAL_SCHEMA_VERSION } from './schema'
import type { VerifiedLongRangeThreadRecord } from '@/features/creator-decision/longRangeThreadRecall'

export const LOCAL_WORKSPACE_PACKAGE_FORMAT = 'puf-local-creator-workspace-v2'

const supportedRecordFamilies = [
  'drafts',
  'writingAssets',
  'readerSignals',
  'creativeReminders',
  'verifiedLongRangeThreads',
  'publishBundles',
  'publishReceipts',
  'agentOperationLog',
  ...creatorDecisionRecordFamilies,
  'workspaceSettings',
] as const

type SupportedPackageRecordFamily = typeof supportedRecordFamilies[number]

interface WorkspaceRecordEnvelope {
  family: string
  id: string
  value: unknown
  bodyPath?: string
  bodyChecksum?: string
}

interface WorkspacePackageRecordsFile {
  schemaVersion: 1
  records: WorkspaceRecordEnvelope[]
}

const fileEntrySchema = z.object({
  byteLength: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
})

const manifestSchema = z.object({
  format: z.literal(LOCAL_WORKSPACE_PACKAGE_FORMAT),
  schemaVersion: z.literal(1),
  packageId: z.string().min(1),
  createdAt: z.string().min(1),
  sourceLocalSchemaVersion: z.number().int().positive(),
  files: z.record(z.string(), fileEntrySchema),
})

const displayPreferencesSchema = z.object({
  reduceMotion: z.boolean(),
  reduceTransparency: z.boolean(),
})

const workspaceSettingsSchema = z.object({
  displayPreferences: displayPreferencesSchema,
  writingAssistPreferences: creatorWritingAssistPreferencesSchema
    .default(DEFAULT_CREATOR_WRITING_ASSIST_PREFERENCES),
})

export function normalizeWorkspaceSettingsRecord(value: unknown) {
  return workspaceSettingsSchema.parse(value)
}

export type LocalWorkspacePackageManifest = z.infer<typeof manifestSchema>

export interface LocalWorkspacePackagePreviewItem {
  family: string
  id: string
}

export interface LocalWorkspacePackagePreview {
  packageId: string
  additions: LocalWorkspacePackagePreviewItem[]
  conflicts: LocalWorkspacePackagePreviewItem[]
  unchanged: LocalWorkspacePackagePreviewItem[]
  unsupported: LocalWorkspacePackagePreviewItem[]
}

export type LocalWorkspaceImportConflictPolicy = 'keep-local' | 'use-import'

export interface LocalWorkspacePackageBuildInput {
  createdAt?: string
  sourceLocalSchemaVersion?: number
  snapshot?: LocalCreatorWorkspaceSnapshot
  settings?: {
    displayPreferences: CreatorDisplayPreferences
    writingAssistPreferences: CreatorWritingAssistPreferences
  }
}

export interface ApplyLocalWorkspacePackageInput {
  authorConfirmed: boolean
  conflictPolicy: LocalWorkspaceImportConflictPolicy
}

function packageRecordKey(record: Pick<WorkspaceRecordEnvelope, 'family' | 'id'>) {
  return `${record.family}:${record.id}`
}

function sortPreviewItems(items: LocalWorkspacePackagePreviewItem[]) {
  return [...items].sort((left, right) => packageRecordKey(left).localeCompare(packageRecordKey(right)))
}

function draftEnvelope(draft: PmfLocalDraft, bodyPath: string, bodyChecksum: string): WorkspaceRecordEnvelope {
  return {
    family: 'drafts',
    id: draft.localDraftRef,
    bodyPath,
    bodyChecksum,
    value: {
      localDraftRef: draft.localDraftRef,
      requestId: draft.requestId,
      workId: draft.workId,
      branchId: draft.branchId,
      title: draft.title,
      updatedAt: draft.updatedAt,
    },
  }
}

function recordEnvelopesFromSnapshot(
  snapshot: LocalCreatorWorkspaceSnapshot,
  settings?: LocalWorkspacePackageBuildInput['settings'],
) {
  const records: WorkspaceRecordEnvelope[] = []
  const append = (family: string, id: string, value: unknown) => records.push({ family, id, value })
  for (const asset of snapshot.settingAssets) append('writingAssets', asset.localAssetRef, asset)
  for (const signal of snapshot.readerSignals) append('readerSignals', signal.id, signal)
  for (const reminder of snapshot.creativeReminders) append('creativeReminders', reminder.id, reminder)
  for (const thread of snapshot.verifiedLongRangeThreads) append('verifiedLongRangeThreads', thread.id, thread)
  for (const bundle of snapshot.publishBundles) append('publishBundles', bundle.id, bundle)
  for (const receipt of snapshot.publishReceipts) append('publishReceipts', receipt.id, receipt)
  for (const operation of snapshot.operationRecords) append('agentOperationLog', operation.id, operation)
  for (const conflict of snapshot.workspaceConflicts) append('workspaceConflicts', conflict.id, conflict)
  if (settings) append('workspaceSettings', 'default', settings)
  return records
}

async function packageFilesFromSnapshot(
  snapshot: LocalCreatorWorkspaceSnapshot,
  settings: NonNullable<LocalWorkspacePackageBuildInput['settings']>,
) {
  const files: Record<string, Uint8Array> = {}
  const records = recordEnvelopesFromSnapshot(snapshot, settings)
  for (const record of await readCreatorDecisionWorkspaceRecords()) records.push(record)
  for (const draft of snapshot.drafts) {
    const draftHash = (await sha256Text(draft.localDraftRef)).slice(0, 32)
    const bodyPath = `bodies/${draftHash}.md`
    const bodyChecksum = await sha256Text(draft.content)
    files[bodyPath] = utf8Bytes(draft.content)
    records.push(draftEnvelope(draft, bodyPath, bodyChecksum))
  }
  records.sort((left, right) => packageRecordKey(left).localeCompare(packageRecordKey(right)))
  files['records.json'] = strToU8(JSON.stringify({ schemaVersion: 1, records } satisfies WorkspacePackageRecordsFile, null, 2))
  for (const receipt of snapshot.migrationReceipts) {
    files[`receipts/${encodeURIComponent(receipt.id)}.json`] = strToU8(JSON.stringify(receipt, null, 2))
  }
  return files
}

async function manifestForFiles(
  files: Record<string, Uint8Array>,
  createdAt: string,
  sourceLocalSchemaVersion: number,
) {
  const entries: LocalWorkspacePackageManifest['files'] = {}
  for (const path of Object.keys(files).sort()) {
    entries[path] = {
      byteLength: files[path].byteLength,
      sha256: await sha256Bytes(files[path]),
    }
  }
  const packageId = `workspace-package:${(await sha256Text(stableJson(entries))).slice(0, 32)}`
  return {
    format: LOCAL_WORKSPACE_PACKAGE_FORMAT,
    schemaVersion: 1,
    packageId,
    createdAt,
    sourceLocalSchemaVersion,
    files: entries,
  } satisfies LocalWorkspacePackageManifest
}

export async function buildLocalWorkspacePackage({
  createdAt = new Date().toISOString(),
  sourceLocalSchemaVersion = LOCAL_SCHEMA_VERSION,
  snapshot,
  settings,
}: LocalWorkspacePackageBuildInput) {
  if (!snapshot) {
    await hydrateLocalWorkspace()
    snapshot = readLocalWorkspaceSnapshot()
  }
  settings ||= {
    displayPreferences: readCreatorDisplayPreferences(),
    writingAssistPreferences: readCreatorWritingAssistPreferences(),
  }
  const files = await packageFilesFromSnapshot(snapshot, settings)
  const manifest = await manifestForFiles(files, createdAt, sourceLocalSchemaVersion)
  files['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2))
  return {
    bytes: zipSync(files, { level: 6 }),
    manifest,
  }
}

async function parseAndVerifyLocalWorkspacePackage(bytes: Uint8Array) {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes)
  } catch {
    throw new Error('Workspace package is not a readable ZIP archive')
  }
  const manifestBytes = files['manifest.json']
  if (!manifestBytes) throw new Error('Workspace package is missing manifest.json')
  const manifest = manifestSchema.parse(JSON.parse(strFromU8(manifestBytes)))
  for (const [path, expected] of Object.entries(manifest.files)) {
    const file = files[path]
    if (!file) throw new Error(`Workspace package is missing ${path}`)
    if (file.byteLength !== expected.byteLength) throw new Error(`Workspace package byte length mismatch: ${path}`)
    if (await sha256Bytes(file) !== expected.sha256) throw new Error(`Workspace package checksum mismatch: ${path}`)
  }
  const unexpected = Object.keys(files).filter(path => path !== 'manifest.json' && !(path in manifest.files))
  if (unexpected.length) throw new Error(`Workspace package has undeclared files: ${unexpected.sort().join(', ')}`)
  const recordsBytes = files['records.json']
  if (!recordsBytes) throw new Error('Workspace package is missing records.json')
  const parsedRecords = JSON.parse(strFromU8(recordsBytes)) as WorkspacePackageRecordsFile
  if (parsedRecords.schemaVersion !== 1 || !Array.isArray(parsedRecords.records)) {
    throw new Error('Workspace records schema is unsupported')
  }
  for (const record of parsedRecords.records) {
    if (record.family !== 'drafts') continue
    if (!record.bodyPath || !record.bodyChecksum || !files[record.bodyPath]) {
      throw new Error(`Workspace draft body is incomplete: ${record.id}`)
    }
    if (await sha256Bytes(files[record.bodyPath]) !== record.bodyChecksum) {
      throw new Error(`Workspace draft body checksum mismatch: ${record.id}`)
    }
  }
  const records = parsedRecords.records.map((record) => {
    if (record.family === 'workspaceSettings') {
      return {
        ...record,
        value: normalizeWorkspaceSettingsRecord(record.value),
      }
    }
    if (isCreatorDecisionRecordFamily(record.family)) {
      return {
        ...record,
        value: normalizeCreatorDecisionWorkspaceRecordValue(record.family, record.value),
      }
    }
    return record
  })
  return { files, manifest, records }
}

async function envelopeFingerprint(record: WorkspaceRecordEnvelope) {
  return sha256Text(stableJson({
    bodyChecksum: record.bodyChecksum || null,
    family: record.family,
    id: record.id,
    value: record.value,
  }))
}

async function currentEnvelopeMap(snapshot: LocalCreatorWorkspaceSnapshot) {
  const records = recordEnvelopesFromSnapshot(snapshot, {
    displayPreferences: readCreatorDisplayPreferences(),
    writingAssistPreferences: readCreatorWritingAssistPreferences(),
  })
  for (const record of await readCreatorDecisionWorkspaceRecords()) records.push(record)
  for (const draft of snapshot.drafts) {
    records.push(draftEnvelope(draft, '', await sha256Text(draft.content)))
  }
  return new Map(records.map(record => [packageRecordKey(record), record]))
}

async function recordFingerprintMap(records: WorkspaceRecordEnvelope[]) {
  const fingerprints: Record<string, string> = {}
  for (const record of records) {
    fingerprints[packageRecordKey(record)] = await envelopeFingerprint(record)
  }
  return fingerprints
}

async function assertRecordFingerprints(
  expected: Record<string, string>,
  current: Map<string, WorkspaceRecordEnvelope>,
  operation: 'apply' | 'rollback',
) {
  for (const [key, fingerprint] of Object.entries(expected)) {
    const record = current.get(key)
    if (!record || await envelopeFingerprint(record) !== fingerprint) {
      throw new Error(`Workspace ${operation} verification failed: ${key}`)
    }
  }
}

export async function previewLocalWorkspacePackage(
  bytes: Uint8Array,
  snapshot?: LocalCreatorWorkspaceSnapshot,
): Promise<LocalWorkspacePackagePreview> {
  const parsed = await parseAndVerifyLocalWorkspacePackage(bytes)
  if (!snapshot) {
    await hydrateLocalWorkspace()
    snapshot = readLocalWorkspaceSnapshot()
  }
  const current = await currentEnvelopeMap(snapshot)
  const additions: LocalWorkspacePackagePreviewItem[] = []
  const conflicts: LocalWorkspacePackagePreviewItem[] = []
  const unchanged: LocalWorkspacePackagePreviewItem[] = []
  const unsupported: LocalWorkspacePackagePreviewItem[] = []
  for (const record of parsed.records) {
    const item = { family: record.family, id: record.id }
    if (!supportedRecordFamilies.includes(record.family as SupportedPackageRecordFamily)) {
      unsupported.push(item)
      continue
    }
    const existing = current.get(packageRecordKey(record))
    if (!existing) {
      additions.push(item)
      continue
    }
    if (await envelopeFingerprint(existing) === await envelopeFingerprint(record)) unchanged.push(item)
    else conflicts.push(item)
  }
  return {
    packageId: parsed.manifest.packageId,
    additions: sortPreviewItems(additions),
    conflicts: sortPreviewItems(conflicts),
    unchanged: sortPreviewItems(unchanged),
    unsupported: sortPreviewItems(unsupported),
  }
}

function isSupportedFamily(family: string): family is SupportedPackageRecordFamily {
  return supportedRecordFamilies.includes(family as SupportedPackageRecordFamily)
}

async function upsertPackageRecord(record: WorkspaceRecordEnvelope, files: Record<string, Uint8Array>) {
  if (!isSupportedFamily(record.family)) return
  switch (record.family) {
    case 'drafts': {
      if (!record.bodyPath) throw new Error(`Workspace draft body path missing: ${record.id}`)
      const metadata = record.value as Omit<PmfLocalDraft, 'content'>
      upsertLocalDraft({ ...metadata, content: strFromU8(files[record.bodyPath]) })
      return
    }
    case 'writingAssets':
      upsertLocalSettingAssetRecord(record.value as PmfLocalSettingAsset)
      return
    case 'readerSignals':
      upsertLocalReaderSignal(record.value as LocalReaderSignalCache)
      return
    case 'creativeReminders':
      upsertLocalCreativeReminderRecord(record.value as CreativeReminder)
      return
    case 'verifiedLongRangeThreads':
      await importVerifiedLongRangeThreadRecords({
        records: [record.value as VerifiedLongRangeThreadRecord],
        authorConfirmed: true,
      })
      return
    case 'publishBundles':
      upsertLocalPublishBundle(record.value as PublishBundleRecord)
      return
    case 'publishReceipts':
      upsertLocalPublishReceipt(record.value as PublishReceiptRecord)
      return
    case 'agentOperationLog':
      upsertLocalAgentOperation(record.value as AgentOperationLog)
      return
    case 'creationSessions':
    case 'authorIntents':
    case 'contextSnapshots':
    case 'narrativeCandidates':
    case 'sceneDrafts':
    case 'literaryReviews':
    case 'repairProposals':
    case 'canonPatches':
    case 'localCanonStates':
    case 'creationDecisionEvents':
      await upsertCreatorDecisionWorkspaceRecord(record.family as CreatorDecisionRecordFamily, record.value)
      return
    case 'workspaceSettings': {
      const settings = normalizeWorkspaceSettingsRecord(record.value)
      writeCreatorDisplayPreferences(settings.displayPreferences)
      writeCreatorWritingAssistPreferences(settings.writingAssistPreferences)
    }
  }
}

async function persistPackageBytes(
  id: string,
  kind: LocalWorkspacePackageRecord['kind'],
  bytes: Uint8Array,
  createdAt: string,
) {
  return saveLocalWorkspacePackageRecord({
    id,
    kind,
    schemaVersion: 1,
    checksum: await sha256Bytes(bytes),
    byteLength: bytes.byteLength,
    bytes,
    createdAt,
  })
}

export async function applyLocalWorkspacePackage(
  bytes: Uint8Array,
  input: ApplyLocalWorkspacePackageInput,
) {
  if (!input.authorConfirmed) throw new Error('Author confirmation is required before workspace import')
  const parsed = await parseAndVerifyLocalWorkspacePackage(bytes)
  await hydrateLocalWorkspace()
  const currentSnapshot = readLocalWorkspaceSnapshot()
  const preview = await previewLocalWorkspacePackage(bytes, currentSnapshot)
  const rollback = await buildLocalWorkspacePackage({
    snapshot: currentSnapshot,
  })
  const now = new Date().toISOString()
  const importId = `workspace-import:${crypto.randomUUID()}`
  const rollbackPackageId = `workspace-rollback:${importId}`
  await persistPackageBytes(rollbackPackageId, 'rollback', rollback.bytes, now)

  const additionKeys = new Set(preview.additions.map(packageRecordKey))
  const conflictKeys = new Set(preview.conflicts.map(packageRecordKey))
  const selectedRecords = parsed.records.filter((record) => {
    const key = packageRecordKey(record)
    return additionKeys.has(key) || (input.conflictPolicy === 'use-import' && conflictKeys.has(key))
  })
  const importRecordFingerprints = await recordFingerprintMap(selectedRecords)
  const receipt: LocalWorkspaceImportReceipt = {
    id: importId,
    packageId: parsed.manifest.packageId,
    rollbackPackageId,
    status: 'applying',
    addedCount: preview.additions.length,
    overwrittenCount: input.conflictPolicy === 'use-import' ? preview.conflicts.length : 0,
    unchangedCount: preview.unchanged.length,
    unsupportedCount: preview.unsupported.length,
    addedRecordKeys: preview.additions.map(packageRecordKey),
    overwrittenRecordKeys: input.conflictPolicy === 'use-import' ? preview.conflicts.map(packageRecordKey) : [],
    importRecordFingerprints,
    appliedAt: now,
  }
  await saveLocalWorkspaceImportReceipt(receipt)
  try {
    for (const record of selectedRecords) await upsertPackageRecord(record, parsed.files)
    await flushCreatorLocalWrites()
    await hydrateLocalWorkspace()
    await assertRecordFingerprints(
      importRecordFingerprints,
      await currentEnvelopeMap(readLocalWorkspaceSnapshot()),
      'apply',
    )
    const applied = { ...receipt, status: 'applied' as const }
    await saveLocalWorkspaceImportReceipt(applied)
    return { preview, receipt: applied }
  } catch (error) {
    await saveLocalWorkspaceImportReceipt({
      ...receipt,
      status: 'failed',
      failureCode: 'apply_failed',
    })
    throw error
  }
}

export async function readRollbackPackageForImport(receiptId: string) {
  const receipt = await readLocalWorkspaceImportReceipt(receiptId)
  if (!receipt) throw new Error(`Workspace import receipt not found: ${receiptId}`)
  const rollbackPackage = await readLocalWorkspacePackageRecord(receipt.rollbackPackageId)
  if (!rollbackPackage) throw new Error(`Workspace rollback package not found: ${receipt.rollbackPackageId}`)
  if (await sha256Bytes(rollbackPackage.bytes) !== rollbackPackage.checksum) {
    throw new Error(`Workspace rollback package checksum mismatch: ${receipt.rollbackPackageId}`)
  }
  return { receipt, rollbackPackage }
}

function parseSupportedRecordKey(key: string) {
  const separator = key.indexOf(':')
  if (separator < 1) return null
  const family = key.slice(0, separator)
  const id = key.slice(separator + 1)
  if (!id || !isSupportedFamily(family) || family === 'workspaceSettings') return null
  return { family: family as LocalWorkspaceRecordFamily, id }
}

export async function rollbackLocalWorkspaceImport(receiptId: string) {
  const { receipt, rollbackPackage } = await readRollbackPackageForImport(receiptId)
  if (!['applied', 'failed'].includes(receipt.status)) {
    throw new Error(`Workspace import is not rollback-eligible: ${receiptId}`)
  }
  const parsed = await parseAndVerifyLocalWorkspacePackage(rollbackPackage.bytes)
  await hydrateLocalWorkspace()
  const currentBeforeRollback = await currentEnvelopeMap(readLocalWorkspaceSnapshot())
  const rollbackRecords = new Map(parsed.records.map(record => [packageRecordKey(record), record]))

  for (const [key, importedFingerprint] of Object.entries(receipt.importRecordFingerprints)) {
    const current = currentBeforeRollback.get(key)
    const rollbackRecord = rollbackRecords.get(key)
    const currentFingerprint = current ? await envelopeFingerprint(current) : null
    const rollbackFingerprint = rollbackRecord ? await envelopeFingerprint(rollbackRecord) : null
    if (currentFingerprint !== importedFingerprint && currentFingerprint !== rollbackFingerprint) {
      throw new Error(`Workspace rollback conflict: ${key}`)
    }
  }

  for (const key of receipt.addedRecordKeys) {
    const record = parseSupportedRecordKey(key)
    const current = currentBeforeRollback.get(key)
    if (record && current && await envelopeFingerprint(current) === receipt.importRecordFingerprints[key]) {
      await deleteLocalWorkspaceRecord(record.family, record.id)
    }
  }
  const restoredFingerprints: Record<string, string> = {}
  for (const key of receipt.overwrittenRecordKeys) {
    const record = rollbackRecords.get(key)
    if (!record) continue
    await upsertPackageRecord(record, parsed.files)
    restoredFingerprints[key] = await envelopeFingerprint(record)
  }
  await flushCreatorLocalWrites()
  await hydrateLocalWorkspace()
  const currentAfterRollback = await currentEnvelopeMap(readLocalWorkspaceSnapshot())
  await assertRecordFingerprints(restoredFingerprints, currentAfterRollback, 'rollback')
  for (const key of receipt.addedRecordKeys) {
    if (currentAfterRollback.has(key)) throw new Error(`Workspace rollback verification failed: ${key}`)
  }

  const rolledBack: LocalWorkspaceImportReceipt = {
    ...receipt,
    status: 'rolled_back',
    rolledBackAt: new Date().toISOString(),
  }
  await saveLocalWorkspaceImportReceipt(rolledBack)
  return rolledBack
}
