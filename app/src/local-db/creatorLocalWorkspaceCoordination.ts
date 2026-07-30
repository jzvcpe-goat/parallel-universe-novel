import type { LocalWorkspaceRecordFamily } from './schema'

export const LOCAL_WORKSPACE_ID = 'default'
export const LOCAL_WORKSPACE_CHANNEL_NAME = 'puf_creator_workspace_changes_v1'
export const LOCAL_WORKSPACE_REHYDRATED_EVENT = 'puf:local-workspace-rehydrated'

export type LocalWorkspaceChangeKind = 'record_committed' | 'record_deleted' | 'conflict_created'

export interface LocalWorkspaceChangeEvent {
  schemaVersion: 1
  workspaceId: typeof LOCAL_WORKSPACE_ID
  sourceId: string
  kind: LocalWorkspaceChangeKind
  recordFamily: LocalWorkspaceRecordFamily
  recordId: string
  version: number
  occurredAt: string
}

interface LockManagerLike {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>
}

type ChangeListener = (event: LocalWorkspaceChangeEvent) => void
type ResumeListener = () => void

const changeListeners = new Set<ChangeListener>()
const resumeListeners = new Set<ResumeListener>()

let channel: BroadcastChannel | null = null
let resumeListenersInstalled = false

function randomId(prefix: string) {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}:${id}`
}

const writerId = randomId('creator-tab')

function isRecordFamily(value: unknown): value is LocalWorkspaceRecordFamily {
  return [
    'drafts',
    'writingAssets',
    'meta',
    'readerSignals',
    'readerSignalSources',
    'creativeReminders',
    'verifiedLongRangeThreads',
    'publishBundles',
    'publishReceipts',
    'agentOperationLog',
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
  ].includes(String(value))
}

function isWorkspaceChangeEvent(value: unknown): value is LocalWorkspaceChangeEvent {
  if (!value || typeof value !== 'object') return false
  const event = value as Partial<LocalWorkspaceChangeEvent>
  return event.schemaVersion === 1
    && event.workspaceId === LOCAL_WORKSPACE_ID
    && typeof event.sourceId === 'string'
    && ['record_committed', 'record_deleted', 'conflict_created'].includes(String(event.kind))
    && isRecordFamily(event.recordFamily)
    && typeof event.recordId === 'string'
    && typeof event.version === 'number'
    && typeof event.occurredAt === 'string'
}

function emitRemoteChange(event: LocalWorkspaceChangeEvent) {
  for (const listener of changeListeners) listener(event)
}

function ensureBroadcastChannel() {
  if (channel || typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return channel
  channel = new BroadcastChannel(LOCAL_WORKSPACE_CHANNEL_NAME)
  channel.addEventListener('message', (message) => {
    if (!isWorkspaceChangeEvent(message.data)) return
    if (message.data.sourceId === writerId) return
    emitRemoteChange(message.data)
  })
  return channel
}

function emitResume() {
  for (const listener of resumeListeners) listener()
}

function ensureResumeListeners() {
  if (resumeListenersInstalled || typeof window === 'undefined' || typeof document === 'undefined') return
  resumeListenersInstalled = true
  window.addEventListener('focus', emitResume)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') emitResume()
  })
}

function getLockManager(): LockManagerLike | null {
  if (typeof navigator === 'undefined') return null
  return (navigator as Navigator & { locks?: LockManagerLike }).locks || null
}

export function getLocalWorkspaceWriterId() {
  return writerId
}

export function localWorkspaceLockName(recordFamily: LocalWorkspaceRecordFamily, recordId: string) {
  return `puf:creator-workspace:${LOCAL_WORKSPACE_ID}:${recordFamily}:${encodeURIComponent(recordId)}`
}

export async function withLocalWorkspaceWriteLock<T>(
  recordFamily: LocalWorkspaceRecordFamily,
  recordId: string,
  work: () => Promise<T>,
): Promise<T> {
  const locks = getLockManager()
  if (!locks) return work()
  return locks.request(localWorkspaceLockName(recordFamily, recordId), work)
}

export function publishLocalWorkspaceChange(
  event: Omit<LocalWorkspaceChangeEvent, 'schemaVersion' | 'workspaceId' | 'sourceId' | 'occurredAt'>,
) {
  const message: LocalWorkspaceChangeEvent = {
    schemaVersion: 1,
    workspaceId: LOCAL_WORKSPACE_ID,
    sourceId: writerId,
    occurredAt: new Date().toISOString(),
    ...event,
  }
  ensureBroadcastChannel()?.postMessage(message)
  return message
}

export function subscribeToLocalWorkspaceChanges(listener: ChangeListener) {
  changeListeners.add(listener)
  ensureBroadcastChannel()
  return () => changeListeners.delete(listener)
}

export function subscribeToLocalWorkspaceResume(listener: ResumeListener) {
  resumeListeners.add(listener)
  ensureResumeListeners()
  return () => resumeListeners.delete(listener)
}

export function dispatchLocalWorkspaceRehydrated(event: LocalWorkspaceChangeEvent) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(LOCAL_WORKSPACE_REHYDRATED_EVENT, {
    detail: event,
  }))
}
