import type { PmfLocalDraft } from '@/features/pmf/types'
import { buildCanonCommitResult } from '@/features/creator-decision/canonPatch'
import { buildHistoricalStateBackfillCommitResult } from '@/features/creator-decision/historicalStateBackfill'
import {
  authorIntentContractSchema,
  canonPatchRecordSchema,
  canonStatePatchSchema,
  contextSnapshotSchema,
  creationDecisionEventSchema,
  creationSessionSchema,
  historicalStateBackfillProposalSchema,
  literaryReviewSchema,
  localCanonStateRecordSchema,
  narrativeCandidateSchema,
  repairProposalSchema,
  sceneDraftResultSchema,
} from '@/features/creator-decision/schemas'
import {
  createCreationSession,
  creationDecisionEvent,
} from '@/features/creator-decision/stateMachine'
import type {
  AuthorIntentContract,
  CanonCommitInput,
  CanonCommitResult,
  CanonStatePatch,
  ContextSnapshot,
  CreationDecisionEvent,
  CreationDecisionRepository,
  CreationDecisionSnapshot,
  CreationSession,
  HistoricalStateBackfillCommitInput,
  HistoricalStateBackfillCommitResult,
  HistoricalStateBackfillProposal,
  LiteraryReview,
  LocalCanonStateRecord,
  NarrativeCandidate,
  RepairProposal,
  SceneDraftResult,
} from '@/features/creator-decision/types'
import {
  creatorLocalStoreNames,
  openCreatorDb,
  readAllFromCreatorStore,
  readAllFromCreatorStoreByIndex,
  requestToPromise,
  transactionDone,
} from './creatorLocalDb'
import {
  migratePersistedCanonPatchRecord,
  migratePersistedSceneDraftRecord,
} from './creatorDecisionRecordMigration'
import {
  getLocalWorkspaceWriterId,
  publishLocalWorkspaceChange,
  withLocalWorkspaceWriteLock,
} from './creatorLocalWorkspaceCoordination'
import type {
  LocalWorkspaceRecordFamily,
  LocalWorkspaceRevision,
} from './schema'

export type DecisionRecord =
  | AuthorIntentContract
  | CanonStatePatch
  | ContextSnapshot
  | CreationDecisionEvent
  | CreationSession
  | HistoricalStateBackfillProposal
  | LiteraryReview
  | LocalCanonStateRecord
  | NarrativeCandidate
  | RepairProposal
  | SceneDraftResult

export const creatorDecisionRecordFamilies = [
  'creationSessions',
  'authorIntents',
  'contextSnapshots',
  'narrativeCandidates',
  'sceneDrafts',
  'literaryReviews',
  'repairProposals',
  'canonPatches',
  'localCanonStates',
  'creationDecisionEvents',
] as const

export type CreatorDecisionRecordFamily = typeof creatorDecisionRecordFamilies[number]

export function isCreatorDecisionRecordFamily(
  family: string,
): family is CreatorDecisionRecordFamily {
  return creatorDecisionRecordFamilies.includes(family as CreatorDecisionRecordFamily)
}

export function normalizeCreatorDecisionWorkspaceRecordValue(
  family: CreatorDecisionRecordFamily,
  value: unknown,
): DecisionRecord {
  switch (family) {
    case 'creationSessions':
      return creationSessionSchema.parse(value)
    case 'authorIntents':
      return authorIntentContractSchema.parse(value)
    case 'contextSnapshots':
      return contextSnapshotSchema.parse(value)
    case 'narrativeCandidates':
      return narrativeCandidateSchema.parse(value)
    case 'sceneDrafts':
      return parsePersistedSceneDraft(value)
    case 'literaryReviews':
      return literaryReviewSchema.parse(value)
    case 'repairProposals':
      return repairProposalSchema.parse(value)
    case 'canonPatches':
      return parsePersistedCanonPatchRecord(value)
    case 'localCanonStates':
      return localCanonStateRecordSchema.parse(value)
    case 'creationDecisionEvents':
      return creationDecisionEventSchema.parse(value)
  }
}

export interface CreatorDecisionRecordEnvelope {
  family: CreatorDecisionRecordFamily
  id: string
  value: DecisionRecord
}

const REVISION_STORE = creatorLocalStoreNames.workspaceRevisions

function workspaceRevisionId(recordFamily: LocalWorkspaceRecordFamily, recordId: string) {
  return `${recordFamily}:${recordId}`
}

export function localCanonStateId(workId: string, chapterId: string) {
  return `local-canon:${workId}:${chapterId}`
}

async function readAllRecords<T>(
  storeName: string,
  parse: (value: unknown) => T,
): Promise<T[]> {
  const db = await openCreatorDb()
  try {
    const records = await readAllFromCreatorStore<unknown>(db, storeName)
    return records.map(parse)
  } finally {
    db.close()
  }
}

async function readAllRecordsByIndex<T>(
  storeName: string,
  indexName: string,
  indexValue: IDBValidKey,
  parse: (value: unknown) => T,
): Promise<T[]> {
  const db = await openCreatorDb()
  try {
    const records = await readAllFromCreatorStoreByIndex<unknown>(
      db,
      storeName,
      indexName,
      indexValue,
    )
    return records.map(parse)
  } finally {
    db.close()
  }
}

function parsePersistedSceneDraft(value: unknown) {
  return sceneDraftResultSchema.parse(migratePersistedSceneDraftRecord(value))
}

function parsePersistedCanonPatchRecord(value: unknown) {
  return canonPatchRecordSchema.parse(migratePersistedCanonPatchRecord(value))
}

function isCanonStatePatch(
  record: CanonStatePatch | HistoricalStateBackfillProposal,
): record is CanonStatePatch {
  return record.schemaVersion === 'canon-state-patch.v1'
}

function isHistoricalStateBackfill(
  record: CanonStatePatch | HistoricalStateBackfillProposal,
): record is HistoricalStateBackfillProposal {
  return record.schemaVersion === 'historical-state-backfill.v1'
}

async function readRecord<T>(
  storeName: string,
  recordId: string,
  parse: (value: unknown) => T,
): Promise<T | null> {
  const db = await openCreatorDb()
  try {
    const transaction = db.transaction(storeName, 'readonly')
    const value = await requestToPromise<unknown>(transaction.objectStore(storeName).get(recordId))
    await transactionDone(transaction)
    return value === undefined ? null : parse(value)
  } finally {
    db.close()
  }
}

async function putDecisionRecord(
  recordFamily: LocalWorkspaceRecordFamily,
  recordId: string,
  record: DecisionRecord,
) {
  await withLocalWorkspaceWriteLock(recordFamily, recordId, async () => {
    const db = await openCreatorDb()
    let version = 1
    try {
      const transaction = db.transaction([recordFamily, REVISION_STORE], 'readwrite')
      const revisionStore = transaction.objectStore(REVISION_STORE)
      const revisionId = workspaceRevisionId(recordFamily, recordId)
      const current = await requestToPromise<LocalWorkspaceRevision | undefined>(revisionStore.get(revisionId))
      version = (current?.version || 0) + 1
      transaction.objectStore(recordFamily).put(record)
      revisionStore.put({
        id: revisionId,
        recordFamily,
        recordId,
        version,
        writerId: getLocalWorkspaceWriterId(),
        updatedAt: new Date().toISOString(),
      } satisfies LocalWorkspaceRevision)
      await transactionDone(transaction)
    } finally {
      db.close()
    }
    publishLocalWorkspaceChange({
      kind: 'record_committed',
      recordFamily,
      recordId,
      version,
    })
  })
}

function bySession<T extends { sessionId: string }>(records: T[], sessionId: string) {
  return records.filter(record => record.sessionId === sessionId)
}

function sortByRevision<T extends { revision: number }>(records: T[]) {
  return [...records].sort((left, right) => left.revision - right.revision)
}

function sortEvents(records: CreationDecisionEvent[]) {
  return [...records].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
}

export class IndexedDbCreationDecisionRepository implements CreationDecisionRepository {
  loadSession(id: string) {
    return readRecord(creatorLocalStoreNames.creationSessions, id, value => creationSessionSchema.parse(value))
  }

  async loadSessionSnapshot(id: string): Promise<CreationDecisionSnapshot | null> {
    const session = await this.loadSession(id)
    if (!session) return null
    const [intents, contexts, candidates, drafts, reviews, repairs, patches, canon, events] = await Promise.all([
      this.listIntents(id),
      this.listContexts(id),
      this.listCandidates(id),
      this.listDrafts(id),
      this.listReviews(id),
      this.listRepairs(id),
      this.listCanonPatches(id),
      this.loadCanonState(session.workId, session.chapterId),
      this.listEvents(id),
    ])
    return { session, intents, contexts, candidates, drafts, reviews, repairs, patches, canon, events }
  }

  async saveSession(session: CreationSession) {
    const record = creationSessionSchema.parse(session)
    await putDecisionRecord('creationSessions', record.id, record)
  }

  async saveIntent(intent: AuthorIntentContract) {
    const record = authorIntentContractSchema.parse(intent)
    await putDecisionRecord('authorIntents', record.id, record)
  }

  async listIntents(sessionId: string) {
    return sortByRevision(await readAllRecordsByIndex(
      creatorLocalStoreNames.authorIntents,
      'sessionId',
      sessionId,
      value => authorIntentContractSchema.parse(value),
    ))
  }

  async saveContext(context: ContextSnapshot) {
    const record = contextSnapshotSchema.parse(context)
    await putDecisionRecord('contextSnapshots', record.id, record)
  }

  async listContexts(sessionId: string) {
    return readAllRecordsByIndex(
      creatorLocalStoreNames.contextSnapshots,
      'sessionId',
      sessionId,
      value => contextSnapshotSchema.parse(value),
    )
  }

  async saveCandidates(candidates: NarrativeCandidate[]) {
    for (const candidate of candidates) {
      const record = narrativeCandidateSchema.parse(candidate)
      await putDecisionRecord('narrativeCandidates', record.id, record)
    }
  }

  async listCandidates(sessionId: string) {
    return sortByRevision(await readAllRecordsByIndex(
      creatorLocalStoreNames.narrativeCandidates,
      'sessionId',
      sessionId,
      value => narrativeCandidateSchema.parse(value),
    ))
  }

  async saveDraft(draft: SceneDraftResult) {
    const record = sceneDraftResultSchema.parse(draft)
    await putDecisionRecord('sceneDrafts', record.draftId, record)
  }

  async listDrafts(sessionId: string) {
    return sortByRevision(await readAllRecordsByIndex(
      creatorLocalStoreNames.sceneDrafts,
      'sessionId',
      sessionId,
      parsePersistedSceneDraft,
    ))
  }

  async saveReview(review: LiteraryReview) {
    const record = literaryReviewSchema.parse(review)
    await putDecisionRecord('literaryReviews', record.id, record)
  }

  async listReviews(sessionId: string) {
    return readAllRecordsByIndex(
      creatorLocalStoreNames.literaryReviews,
      'sessionId',
      sessionId,
      value => literaryReviewSchema.parse(value),
    )
  }

  async saveRepair(repair: RepairProposal) {
    const record = repairProposalSchema.parse(repair)
    await putDecisionRecord('repairProposals', record.id, record)
  }

  async listRepairs(sessionId: string) {
    const reviewIds = (await this.listReviews(sessionId)).map(review => review.id)
    const repairs = await Promise.all(reviewIds.map(reviewId => readAllRecordsByIndex(
      creatorLocalStoreNames.repairProposals,
      'reviewId',
      reviewId,
      value => repairProposalSchema.parse(value),
    )))
    return repairs.flat()
  }

  async saveCanonPatch(patch: CanonStatePatch) {
    const record = canonStatePatchSchema.parse(patch)
    await putDecisionRecord('canonPatches', record.id, record)
  }

  async listCanonPatches(sessionId: string) {
    const records = await readAllRecordsByIndex(
      creatorLocalStoreNames.canonPatches,
      'sessionId',
      sessionId,
      parsePersistedCanonPatchRecord,
    )
    return records.filter(isCanonStatePatch)
  }

  async saveHistoricalStateBackfill(proposal: HistoricalStateBackfillProposal) {
    const record = historicalStateBackfillProposalSchema.parse(proposal)
    await putDecisionRecord('canonPatches', record.id, record)
  }

  async listHistoricalStateBackfills(sessionId: string) {
    const records = await readAllRecordsByIndex(
      creatorLocalStoreNames.canonPatches,
      'sessionId',
      sessionId,
      parsePersistedCanonPatchRecord,
    )
    return records.filter(isHistoricalStateBackfill)
  }

  loadCanonState(workId: string, chapterId: string) {
    return readRecord(
      creatorLocalStoreNames.localCanonStates,
      localCanonStateId(workId, chapterId),
      value => localCanonStateRecordSchema.parse(value),
    )
  }

  async saveCanonState(canon: LocalCanonStateRecord) {
    const record = localCanonStateRecordSchema.parse(canon)
    await putDecisionRecord('localCanonStates', record.id, record)
  }

  async appendEvent(event: CreationDecisionEvent) {
    const record = creationDecisionEventSchema.parse(event)
    await putDecisionRecord('creationDecisionEvents', record.id, record)
  }

  async listEvents(sessionId: string) {
    return sortEvents(await readAllRecordsByIndex(
      creatorLocalStoreNames.creationDecisionEvents,
      'sessionId',
      sessionId,
      value => creationDecisionEventSchema.parse(value),
    ))
  }

  async commitCanon(input: CanonCommitInput): Promise<CanonCommitResult> {
    const canonId = localCanonStateId(input.session.workId, input.session.chapterId)
    return withLocalWorkspaceWriteLock('localCanonStates', canonId, async () => {
      const db = await openCreatorDb()
      const stores = [
        creatorLocalStoreNames.sceneDrafts,
        creatorLocalStoreNames.canonPatches,
        creatorLocalStoreNames.localCanonStates,
        creatorLocalStoreNames.creationSessions,
        creatorLocalStoreNames.creationDecisionEvents,
        REVISION_STORE,
      ]
      const transaction = db.transaction(stores, 'readwrite')
      try {
        const storedCanonValue = await requestToPromise<unknown>(
          transaction.objectStore(creatorLocalStoreNames.localCanonStates).get(canonId),
        )
        const currentCanon = storedCanonValue === undefined
          ? null
          : localCanonStateRecordSchema.parse(storedCanonValue)
        const result = buildCanonCommitResult({ ...input, currentCanon })
        const records: Array<{
          family: LocalWorkspaceRecordFamily
          id: string
          value: DecisionRecord
        }> = [
          { family: 'sceneDrafts', id: input.draft.draftId, value: sceneDraftResultSchema.parse(input.draft) },
          { family: 'canonPatches', id: result.patch.id, value: canonStatePatchSchema.parse(result.patch) },
          { family: 'localCanonStates', id: result.canon.id, value: localCanonStateRecordSchema.parse(result.canon) },
          { family: 'creationSessions', id: result.session.id, value: creationSessionSchema.parse(result.session) },
          { family: 'creationDecisionEvents', id: result.confirmationEvent.id, value: creationDecisionEventSchema.parse(result.confirmationEvent) },
          { family: 'creationDecisionEvents', id: result.event.id, value: creationDecisionEventSchema.parse(result.event) },
        ]
        const revisionStore = transaction.objectStore(REVISION_STORE)
        const currentRevisions = await Promise.all(records.map(record => requestToPromise<LocalWorkspaceRevision | undefined>(
          revisionStore.get(workspaceRevisionId(record.family, record.id)),
        )))
        const now = input.confirmedAt
        const writerId = getLocalWorkspaceWriterId()
        const versions = records.map((record, index) => {
          const version = (currentRevisions[index]?.version || 0) + 1
          transaction.objectStore(record.family).put(record.value)
          revisionStore.put({
            id: workspaceRevisionId(record.family, record.id),
            recordFamily: record.family,
            recordId: record.id,
            version,
            writerId,
            updatedAt: now,
          } satisfies LocalWorkspaceRevision)
          return version
        })
        await transactionDone(transaction)
        records.forEach((record, index) => publishLocalWorkspaceChange({
          kind: 'record_committed',
          recordFamily: record.family,
          recordId: record.id,
          version: versions[index],
        }))
        return result
      } catch (error) {
        try {
          transaction.abort()
        } catch {
          // The transaction may already have completed or aborted.
        }
        throw error
      } finally {
        db.close()
      }
    })
  }

  async commitHistoricalStateBackfill(
    input: HistoricalStateBackfillCommitInput,
  ): Promise<HistoricalStateBackfillCommitResult> {
    const canonId = input.proposal.canonId
    return withLocalWorkspaceWriteLock('localCanonStates', canonId, async () => {
      const db = await openCreatorDb()
      const stores = [
        creatorLocalStoreNames.canonPatches,
        creatorLocalStoreNames.localCanonStates,
        creatorLocalStoreNames.creationDecisionEvents,
        REVISION_STORE,
      ]
      const transaction = db.transaction(stores, 'readwrite')
      try {
        const storedCanonValue = await requestToPromise<unknown>(
          transaction.objectStore(creatorLocalStoreNames.localCanonStates).get(canonId),
        )
        const currentCanon = storedCanonValue === undefined
          ? null
          : localCanonStateRecordSchema.parse(storedCanonValue)
        const result = buildHistoricalStateBackfillCommitResult({
          ...input,
          currentCanon,
        })
        const records: Array<{
          family: LocalWorkspaceRecordFamily
          id: string
          value: DecisionRecord
        }> = [
          {
            family: 'canonPatches',
            id: result.proposal.id,
            value: historicalStateBackfillProposalSchema.parse(result.proposal),
          },
          {
            family: 'localCanonStates',
            id: result.canon.id,
            value: localCanonStateRecordSchema.parse(result.canon),
          },
          {
            family: 'creationDecisionEvents',
            id: result.confirmationEvent.id,
            value: creationDecisionEventSchema.parse(result.confirmationEvent),
          },
          {
            family: 'creationDecisionEvents',
            id: result.event.id,
            value: creationDecisionEventSchema.parse(result.event),
          },
        ]
        const revisionStore = transaction.objectStore(REVISION_STORE)
        const currentRevisions = await Promise.all(records.map(record => requestToPromise<LocalWorkspaceRevision | undefined>(
          revisionStore.get(workspaceRevisionId(record.family, record.id)),
        )))
        const writerId = getLocalWorkspaceWriterId()
        const versions = records.map((record, index) => {
          const version = (currentRevisions[index]?.version || 0) + 1
          transaction.objectStore(record.family).put(record.value)
          revisionStore.put({
            id: workspaceRevisionId(record.family, record.id),
            recordFamily: record.family,
            recordId: record.id,
            version,
            writerId,
            updatedAt: input.confirmedAt,
          } satisfies LocalWorkspaceRevision)
          return version
        })
        await transactionDone(transaction)
        records.forEach((record, index) => publishLocalWorkspaceChange({
          kind: 'record_committed',
          recordFamily: record.family,
          recordId: record.id,
          version: versions[index],
        }))
        return result
      } catch (error) {
        try {
          transaction.abort()
        } catch {
          // The transaction may already have completed or aborted.
        }
        throw error
      } finally {
        db.close()
      }
    })
  }
}

export async function readCreatorDecisionWorkspaceRecords(): Promise<CreatorDecisionRecordEnvelope[]> {
  const groups = await Promise.all([
    readAllRecords(creatorLocalStoreNames.creationSessions, value => creationSessionSchema.parse(value))
      .then(records => records.map(value => ({ family: 'creationSessions' as const, id: value.id, value }))),
    readAllRecords(creatorLocalStoreNames.authorIntents, value => authorIntentContractSchema.parse(value))
      .then(records => records.map(value => ({ family: 'authorIntents' as const, id: value.id, value }))),
    readAllRecords(creatorLocalStoreNames.contextSnapshots, value => contextSnapshotSchema.parse(value))
      .then(records => records.map(value => ({ family: 'contextSnapshots' as const, id: value.id, value }))),
    readAllRecords(creatorLocalStoreNames.narrativeCandidates, value => narrativeCandidateSchema.parse(value))
      .then(records => records.map(value => ({ family: 'narrativeCandidates' as const, id: value.id, value }))),
    readAllRecords(creatorLocalStoreNames.sceneDrafts, parsePersistedSceneDraft)
      .then(records => records.map(value => ({ family: 'sceneDrafts' as const, id: value.draftId, value }))),
    readAllRecords(creatorLocalStoreNames.literaryReviews, value => literaryReviewSchema.parse(value))
      .then(records => records.map(value => ({ family: 'literaryReviews' as const, id: value.id, value }))),
    readAllRecords(creatorLocalStoreNames.repairProposals, value => repairProposalSchema.parse(value))
      .then(records => records.map(value => ({ family: 'repairProposals' as const, id: value.id, value }))),
    readAllRecords(creatorLocalStoreNames.canonPatches, parsePersistedCanonPatchRecord)
      .then(records => records.map(value => ({ family: 'canonPatches' as const, id: value.id, value }))),
    readAllRecords(creatorLocalStoreNames.localCanonStates, value => localCanonStateRecordSchema.parse(value))
      .then(records => records.map(value => ({ family: 'localCanonStates' as const, id: value.id, value }))),
    readAllRecords(creatorLocalStoreNames.creationDecisionEvents, value => creationDecisionEventSchema.parse(value))
      .then(records => records.map(value => ({ family: 'creationDecisionEvents' as const, id: value.id, value }))),
  ])
  return groups.flat()
}

export async function readCreatorHistoricalStateBackfillsForWork(workId: string) {
  const records = await readAllRecordsByIndex(
    creatorLocalStoreNames.canonPatches,
    'workId',
    workId,
    parsePersistedCanonPatchRecord,
  )
  return records.filter(isHistoricalStateBackfill)
}

export async function upsertCreatorDecisionWorkspaceRecord(
  family: CreatorDecisionRecordFamily,
  value: unknown,
) {
  switch (family) {
    case 'creationSessions': {
      const record = creationSessionSchema.parse(value)
      return putDecisionRecord(family, record.id, record)
    }
    case 'authorIntents': {
      const record = authorIntentContractSchema.parse(value)
      return putDecisionRecord(family, record.id, record)
    }
    case 'contextSnapshots': {
      const record = contextSnapshotSchema.parse(value)
      return putDecisionRecord(family, record.id, record)
    }
    case 'narrativeCandidates': {
      const record = narrativeCandidateSchema.parse(value)
      return putDecisionRecord(family, record.id, record)
    }
    case 'sceneDrafts': {
      const record = parsePersistedSceneDraft(value)
      return putDecisionRecord(family, record.draftId, record)
    }
    case 'literaryReviews': {
      const record = literaryReviewSchema.parse(value)
      return putDecisionRecord(family, record.id, record)
    }
    case 'repairProposals': {
      const record = repairProposalSchema.parse(value)
      return putDecisionRecord(family, record.id, record)
    }
    case 'canonPatches': {
      const record = parsePersistedCanonPatchRecord(value)
      return putDecisionRecord(family, record.id, record)
    }
    case 'localCanonStates': {
      const record = localCanonStateRecordSchema.parse(value)
      return putDecisionRecord(family, record.id, record)
    }
    case 'creationDecisionEvents': {
      const record = creationDecisionEventSchema.parse(value)
      return putDecisionRecord(family, record.id, record)
    }
  }
}

export class MemoryCreationDecisionRepository implements CreationDecisionRepository {
  private sessions = new Map<string, CreationSession>()
  private intents = new Map<string, AuthorIntentContract>()
  private contexts = new Map<string, ContextSnapshot>()
  private candidates = new Map<string, NarrativeCandidate>()
  private drafts = new Map<string, SceneDraftResult>()
  private reviews = new Map<string, LiteraryReview>()
  private repairs = new Map<string, RepairProposal>()
  private patches = new Map<string, CanonStatePatch>()
  private historicalStateBackfills = new Map<string, HistoricalStateBackfillProposal>()
  private canonStates = new Map<string, LocalCanonStateRecord>()
  private events = new Map<string, CreationDecisionEvent>()

  async loadSession(id: string) {
    return this.sessions.get(id) || null
  }

  async loadSessionSnapshot(id: string): Promise<CreationDecisionSnapshot | null> {
    const session = await this.loadSession(id)
    if (!session) return null
    return {
      session,
      intents: await this.listIntents(id),
      contexts: await this.listContexts(id),
      candidates: await this.listCandidates(id),
      drafts: await this.listDrafts(id),
      reviews: await this.listReviews(id),
      repairs: await this.listRepairs(id),
      patches: await this.listCanonPatches(id),
      canon: await this.loadCanonState(session.workId, session.chapterId),
      events: await this.listEvents(id),
    }
  }

  async saveSession(session: CreationSession) {
    const record = creationSessionSchema.parse(session)
    this.sessions.set(record.id, record)
  }

  async saveIntent(intent: AuthorIntentContract) {
    const record = authorIntentContractSchema.parse(intent)
    this.intents.set(record.id, record)
  }

  async listIntents(sessionId: string) {
    return sortByRevision(bySession([...this.intents.values()], sessionId))
  }

  async saveContext(context: ContextSnapshot) {
    const record = contextSnapshotSchema.parse(context)
    this.contexts.set(record.id, record)
  }

  async listContexts(sessionId: string) {
    return bySession([...this.contexts.values()], sessionId)
  }

  async saveCandidates(candidates: NarrativeCandidate[]) {
    for (const candidate of candidates) {
      const record = narrativeCandidateSchema.parse(candidate)
      this.candidates.set(record.id, record)
    }
  }

  async listCandidates(sessionId: string) {
    return sortByRevision(bySession([...this.candidates.values()], sessionId))
  }

  async saveDraft(draft: SceneDraftResult) {
    const record = sceneDraftResultSchema.parse(draft)
    this.drafts.set(record.draftId, record)
  }

  async listDrafts(sessionId: string) {
    return sortByRevision(bySession([...this.drafts.values()], sessionId))
  }

  async saveReview(review: LiteraryReview) {
    const record = literaryReviewSchema.parse(review)
    this.reviews.set(record.id, record)
  }

  async listReviews(sessionId: string) {
    return bySession([...this.reviews.values()], sessionId)
  }

  async saveRepair(repair: RepairProposal) {
    const record = repairProposalSchema.parse(repair)
    this.repairs.set(record.id, record)
  }

  async listRepairs(sessionId: string) {
    const reviewIds = new Set((await this.listReviews(sessionId)).map(review => review.id))
    return [...this.repairs.values()].filter(repair => reviewIds.has(repair.reviewId))
  }

  async saveCanonPatch(patch: CanonStatePatch) {
    const record = canonStatePatchSchema.parse(patch)
    this.patches.set(record.id, record)
  }

  async listCanonPatches(sessionId: string) {
    return bySession([...this.patches.values()], sessionId)
  }

  async saveHistoricalStateBackfill(proposal: HistoricalStateBackfillProposal) {
    const record = historicalStateBackfillProposalSchema.parse(proposal)
    this.historicalStateBackfills.set(record.id, record)
  }

  async listHistoricalStateBackfills(sessionId: string) {
    return bySession([...this.historicalStateBackfills.values()], sessionId)
  }

  async loadCanonState(workId: string, chapterId: string) {
    return this.canonStates.get(localCanonStateId(workId, chapterId)) || null
  }

  async saveCanonState(canon: LocalCanonStateRecord) {
    const record = localCanonStateRecordSchema.parse(canon)
    this.canonStates.set(record.id, record)
  }

  async appendEvent(event: CreationDecisionEvent) {
    const record = creationDecisionEventSchema.parse(event)
    this.events.set(record.id, record)
  }

  async listEvents(sessionId: string) {
    return sortEvents(bySession([...this.events.values()], sessionId))
  }

  async commitCanon(input: CanonCommitInput) {
    const currentCanon = await this.loadCanonState(input.session.workId, input.session.chapterId)
    const result = buildCanonCommitResult({ ...input, currentCanon })
    this.drafts.set(input.draft.draftId, input.draft)
    this.patches.set(result.patch.id, result.patch)
    this.canonStates.set(result.canon.id, result.canon)
    this.sessions.set(result.session.id, result.session)
    this.events.set(result.confirmationEvent.id, result.confirmationEvent)
    this.events.set(result.event.id, result.event)
    return result
  }

  async commitHistoricalStateBackfill(input: HistoricalStateBackfillCommitInput) {
    const currentCanon = await this.loadCanonState(input.proposal.workId, input.proposal.chapterId)
    const result = buildHistoricalStateBackfillCommitResult({ ...input, currentCanon })
    this.historicalStateBackfills.set(result.proposal.id, result.proposal)
    this.canonStates.set(result.canon.id, result.canon)
    this.events.set(result.confirmationEvent.id, result.confirmationEvent)
    this.events.set(result.event.id, result.event)
    return result
  }
}

export async function migrateLegacyDraftToCreationSession(input: {
  draft: PmfLocalDraft
  repository: CreationDecisionRepository
  chapterId?: string
  sceneId?: string | null
  baseCanonRevision?: number
}) {
  const sessionId = `creation-session:legacy:${input.draft.localDraftRef}`
  const existing = await input.repository.loadSession(sessionId)
  if (existing) return existing
  const session = createCreationSession({
    id: sessionId,
    workId: input.draft.workId,
    chapterId: input.chapterId || `local-chapter:${input.draft.localDraftRef}`,
    sceneId: input.sceneId,
    branchId: input.draft.branchId,
    baseCanonRevision: input.baseCanonRevision || 0,
    now: input.draft.updatedAt,
  })
  await input.repository.saveSession(session)
  await input.repository.appendEvent(creationDecisionEvent({
    sessionId: session.id,
    type: 'session_started',
    actor: 'system',
    sourceRevision: 0,
    payload: {
      migration: 'legacy-local-draft',
      localDraftRef: input.draft.localDraftRef,
      createdIntent: false,
    },
    occurredAt: input.draft.updatedAt,
  }))
  return session
}

export const creatorLocalDecisionRepository = new IndexedDbCreationDecisionRepository()
