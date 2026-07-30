export const LOCAL_DB_NAME = 'puf_creator_workspace'

export const LOCAL_SCHEMA_VERSION = 10

export const localDbStores = {
  meta: 'key',
  drafts: 'localDraftRef, workId, branchId, updatedAt',
  draftBodies: 'id, draftId, status, updatedAt',
  writingAssets: 'localAssetRef, workId, kind, stage, updatedAt',
  readerSignals: 'id, cloudId, workId, chapterId, sourceType, cloudCreatedAt',
  readerSignalSources: 'source, status, fetchedAt, updatedAt',
  creativeReminders: 'id, workId, draftId, type, status, updatedAt',
  verifiedLongRangeThreads: 'id, workId, branchId, threadId, status, sourceChapter, updatedAt',
  publishBundles: 'id, draftId, workId, target, status, updatedAt',
  publishReceipts: 'id, bundleId, target, status, receivedAt',
  agentOperationLog: 'id, operationId, actionName, status, createdAt',
  agentConfirmations: 'id, operationId, actionName, targetId, status, expiresAt, createdAt',
  migrations: 'id, version, source, status, appliedAt',
  workspaceRevisions: 'id, recordFamily, recordId, version, updatedAt',
  workspaceConflicts: 'id, recordFamily, recordId, status, createdAt',
  workspacePackages: 'id, kind, createdAt',
  workspaceImports: 'id, packageId, status, appliedAt',
  creationSessions: 'id, workId, chapterId, phase, updatedAt',
  authorIntents: 'id, sessionId, status, revision, createdAt',
  contextSnapshots: 'id, sessionId, status, canonRevision, intentRevision, createdAt',
  narrativeCandidates: 'id, sessionId, status, intentRevision, revision',
  sceneDrafts: 'draftId, sessionId, status, revision, createdAt',
  literaryReviews: 'id, sessionId, draftId, status, createdAt',
  repairProposals: 'id, reviewId, findingId, status',
  canonPatches: 'id, sessionId, workId, chapterId, status',
  localCanonStates: 'id, workId, chapterId, revision, committedAt',
  creationDecisionEvents: 'id, sessionId, type, actor, occurredAt',
} as const

export const creatorLocalMetaKeys = {
  clientId: 'creator-client-id',
  aiSettings: 'ai-settings',
  displayPreferences: 'display-preferences',
  writingAssistPreferences: 'writing-assist-preferences',
  manualRecallSelections: 'manual-recall-selections',
} as const

export type CreatorLocalMetaKey = typeof creatorLocalMetaKeys[keyof typeof creatorLocalMetaKeys]

export type LocalMigrationRecordCounts = {
  drafts: number
  meta: number
  settingAssets: number
}

export type LocalMigrationReceipt = {
  id: string
  version: number
  source: 'legacy-local-storage' | 'workspace-import'
  status: 'applied'
  conflictPolicy: 'indexeddb-wins'
  sourceRecordCounts: LocalMigrationRecordCounts
  importedRecordCounts: LocalMigrationRecordCounts
  preservedConflictCounts: LocalMigrationRecordCounts
  appliedAt: string
}

export type LocalWorkspaceRecordFamily =
  | 'drafts'
  | 'writingAssets'
  | 'meta'
  | 'readerSignals'
  | 'readerSignalSources'
  | 'creativeReminders'
  | 'verifiedLongRangeThreads'
  | 'publishBundles'
  | 'publishReceipts'
  | 'agentOperationLog'
  | 'creationSessions'
  | 'authorIntents'
  | 'contextSnapshots'
  | 'narrativeCandidates'
  | 'sceneDrafts'
  | 'literaryReviews'
  | 'repairProposals'
  | 'canonPatches'
  | 'localCanonStates'
  | 'creationDecisionEvents'

export type LocalWorkspaceRevision = {
  id: string
  recordFamily: LocalWorkspaceRecordFamily
  recordId: string
  version: number
  writerId: string
  updatedAt: string
}

export type LocalWorkspaceConflictRecord = {
  id: string
  recordFamily: LocalWorkspaceRecordFamily
  recordId: string
  expectedVersion: number
  actualVersion: number
  writerId: string
  incomingRecord: unknown
  status: 'open' | 'resolved' | 'dismissed'
  createdAt: string
}

export type LocalDraftBodyRecord = {
  id: string
  draftId: string
  content: string
  format: 'markdown'
  checksum: string
  byteLength: number
  version: number
  status: 'staged' | 'ready' | 'history'
  updatedAt: string
}

export type LocalDraftRecord = {
  localDraftRef: string
  requestId: string | null
  workId: string
  branchId: string
  chapterNumber?: number | null
  title: string
  bodyStorage: {
    kind: 'opfs' | 'indexeddb'
    path: string | null
    tableId: string
    format: 'markdown'
  }
  bodyChecksum: string
  bodyByteLength: number
  bodyVersion: number
  updatedAt: string
}

export type LocalWorkspacePackageRecord = {
  id: string
  kind: 'rollback' | 'export' | 'publish-bundle'
  schemaVersion: 1
  checksum: string
  byteLength: number
  bytes: Uint8Array
  createdAt: string
}

export type LocalWorkspaceImportReceipt = {
  id: string
  packageId: string
  rollbackPackageId: string
  status: 'applying' | 'applied' | 'failed' | 'rolled_back'
  addedCount: number
  overwrittenCount: number
  unchangedCount: number
  unsupportedCount: number
  addedRecordKeys: string[]
  overwrittenRecordKeys: string[]
  importRecordFingerprints: Record<string, string>
  appliedAt: string
  rolledBackAt?: string
  failureCode?: 'apply_failed'
}

export type LocalWritingAssetKind =
  | 'character'
  | 'skill'
  | 'location'
  | 'map'
  | 'faction'
  | 'item'
  | 'rule'
  | 'timeline'

export type LocalWritingAssetStage =
  | 'intent'
  | 'scene'
  | 'draft'
  | 'memory'
  | 'publish'

export type LocalWritingAsset = {
  localAssetRef: string
  workId: string
  branchId: string | null
  kind: LocalWritingAssetKind
  stage: LocalWritingAssetStage
  title: string
  summary: string
  detail: string
  tags: string[]
  updatedAt: string
}

export type LocalCharacterArcFields = {
  desire?: string
  fear?: string
  wound?: string
  defense?: string
  relationshipPressure?: string
  growthOpportunity?: string
  falseBelief?: string
  costOfChoice?: string
}

export type ReaderSignalAdapterSource =
  | 'request'
  | 'comment'
  | 'highlight'
  | 'reaction'
  | 'question'
  | 'vote_aggregate'

export type ReaderSignalSourceRef = {
  source: ReaderSignalAdapterSource
  cloudId: string
  visibility: 'visible' | 'hidden' | 'deleted'
}

export type LocalReaderSignalCache = {
  id: string
  cloudId: string
  source: ReaderSignalAdapterSource
  sourceRefs: ReaderSignalSourceRef[]
  workId: string
  branchId?: string
  chapterId?: string
  sourceType:
    | 'comment'
    | 'highlight'
    | 'request'
    | 'vote'
    | 'reaction'
    | 'question'
    | 'confusion'
    | 'branch_wish'
    | 'continuity_note'
  rawText: string
  anchorText?: string
  readerVisible: boolean
  visibility: 'visible' | 'hidden' | 'deleted'
  tombstonedAt?: string
  cloudCreatedAt: string
  sourceUpdatedAt?: string
  sourceCursor: string | null
  fetchedAt: string
  normalizedHash: string
  weight: number
}

export type ReaderSignalSourceSyncState = {
  source: ReaderSignalAdapterSource
  cursor: string | null
  status: 'fresh' | 'stale' | 'offline' | 'error'
  fetchedAt: string
  lastSuccessfulAt?: string
  errorCode?: string
  recordCount: number
  updatedAt: string
}

export type CreativeReminder = {
  id: string
  workId: string
  sourceSignalIds: string[]
  draftId?: string
  chapterId?: string
  type:
    | 'reader_confusion'
    | 'reader_desire'
    | 'branch_seed'
    | 'scene_pressure'
    | 'character_question'
    | 'foreshadowing_recall'
    | 'pacing_warning'
  title: string
  authorNote: string
  status: 'suggested' | 'pinned' | 'used' | 'dismissed'
  createdBy: 'rule-engine' | 'author' | 'agent-suggestion'
  localOnly: true
  createdAt: string
  updatedAt: string
}

export type PublishBundleRecord = {
  id: string
  draftId: string
  workId: string
  branchId?: string
  target: 'own-platform' | 'external-platform' | 'manual-export'
  status:
    | 'draft'
    | 'reviewed'
    | 'author_confirmed'
    | 'exported'
    | 'submitted'
    | 'published'
    | 'failed'
    | 'needs_manual_action'
    /** @deprecated Read-only compatibility for records created before WP5. */
    | 'ready'
  manifestPath: string
  bodyPath: string
  checksum: string
  packageRecordId?: string
  idempotencyKey?: string
  reviewedAt?: string
  authorConfirmedAt?: string
  exportedAt?: string
  submittedAt?: string
  publishedAt?: string
  attemptCount?: number
  lastErrorCode?: string
  receiptIds: string[]
  createdAt: string
  updatedAt: string
}

export type PublishReceiptRecord = {
  id: string
  bundleId: string
  target: string
  status: 'submitted' | 'published' | 'failed' | 'needs_manual_action'
  idempotencyKey?: string
  contentChecksum?: string
  attempt?: number
  targetUrl?: string
  externalId?: string
  message?: string
  receivedAt: string
}

export type AgentOperationLog = {
  id: string
  operationId: string
  actionName: string
  route: string
  targetId?: string
  status:
    | 'requested'
    | 'awaiting_confirmation'
    | 'started'
    | 'succeeded'
    | 'failed'
    | 'blocked'
    | 'cancelled_by_author'
  risk: 'low' | 'medium' | 'high'
  inputHash?: string
  confirmationReceiptId?: string
  createdAt: string
  finishedAt?: string
  messageCode?: string
  /** @deprecated Read-only compatibility for records created before WP3. */
  message?: string
}

export type AgentConfirmationReceipt = {
  id: string
  operationId: string
  actionName: string
  targetId: string
  inputHash: string
  status: 'pending' | 'confirmed' | 'consumed' | 'cancelled' | 'expired'
  createdAt: string
  expiresAt: string
  confirmedAt?: string
  consumedAt?: string
  cancelledAt?: string
}
