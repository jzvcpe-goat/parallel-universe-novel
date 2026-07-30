import {
  creatorLocalMetaKeys,
  type CreatorLocalMetaKey,
} from '@/local-db/schema'
import {
  readLocalMetaValue,
  upsertLocalMetaValue,
} from '@/local-db/creatorLocalRepository'

const CURRENT_SCHEMA_VERSION = 1
const MAX_SCOPES = 100
const MAX_IDS_PER_SCOPE = 12

interface StoredRecallScope {
  ids: string[]
  updatedAt: string
}

interface StoredRecallSelections {
  schemaVersion: 1
  scopes: Record<string, StoredRecallScope>
}

export type CreatorEditorRecallSelections = Record<string, string[]>

export interface CreatorEditorRecallSelectionPort {
  read<T>(key: CreatorLocalMetaKey, defaultValue: T): T
  write<T>(key: CreatorLocalMetaKey, value: T): T
}

export interface CreatorEditorRecallScopeInput {
  workId: string
  branchId: string
  routeChapterNumber?: number | null
  activeDraftRef?: string | null
  selectedRequestId?: string | null
}

const defaultRecallSelectionPort: CreatorEditorRecallSelectionPort = {
  read: readLocalMetaValue,
  write: upsertLocalMetaValue,
}

function normalizedIds(ids: string[]) {
  return [...new Set(ids.map(id => id.trim()).filter(Boolean))].slice(0, MAX_IDS_PER_SCOPE)
}

export function buildEditorRecallSelectionScope({
  workId,
  branchId,
  routeChapterNumber,
  activeDraftRef,
  selectedRequestId,
}: CreatorEditorRecallScopeInput) {
  const chapterScope = Number.isInteger(routeChapterNumber) && Number(routeChapterNumber) > 0
    ? `chapter:${Number(routeChapterNumber)}`
    : null
  const itemScope = chapterScope
    || activeDraftRef?.trim()
    || selectedRequestId?.trim()
    || 'new'
  return `${workId.trim()}:${branchId.trim()}:${itemScope}`
}

function isStoredScope(value: unknown): value is StoredRecallScope {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<StoredRecallScope>
  return Array.isArray(candidate.ids)
    && candidate.ids.every(id => typeof id === 'string')
    && typeof candidate.updatedAt === 'string'
}

function readStoredSelections(port: CreatorEditorRecallSelectionPort): StoredRecallSelections {
  const stored = port.read<unknown>(creatorLocalMetaKeys.manualRecallSelections, null)
  if (!stored || typeof stored !== 'object') {
    return { schemaVersion: CURRENT_SCHEMA_VERSION, scopes: {} }
  }
  const candidate = stored as Partial<StoredRecallSelections>
  if (candidate.schemaVersion !== CURRENT_SCHEMA_VERSION || !candidate.scopes) {
    return { schemaVersion: CURRENT_SCHEMA_VERSION, scopes: {} }
  }
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    scopes: Object.fromEntries(
      Object.entries(candidate.scopes)
        .filter((entry): entry is [string, StoredRecallScope] => Boolean(entry[0]) && isStoredScope(entry[1]))
        .map(([scope, value]) => [scope, { ...value, ids: normalizedIds(value.ids) }]),
    ),
  }
}

export function readEditorRecallSelections(
  port: CreatorEditorRecallSelectionPort = defaultRecallSelectionPort,
): CreatorEditorRecallSelections {
  const stored = readStoredSelections(port)
  return Object.fromEntries(
    Object.entries(stored.scopes).map(([scope, value]) => [scope, [...value.ids]]),
  )
}

export function writeEditorRecallSelection(
  scope: string,
  ids: string[],
  port: CreatorEditorRecallSelectionPort = defaultRecallSelectionPort,
  now = new Date().toISOString(),
): CreatorEditorRecallSelections {
  const normalizedScope = scope.trim()
  if (!normalizedScope) return readEditorRecallSelections(port)

  const stored = readStoredSelections(port)
  const scopes = {
    ...stored.scopes,
    [normalizedScope]: {
      ids: normalizedIds(ids),
      updatedAt: now,
    },
  }
  const limitedScopes = Object.fromEntries(
    Object.entries(scopes)
      .sort((left, right) => right[1].updatedAt.localeCompare(left[1].updatedAt))
      .slice(0, MAX_SCOPES),
  )
  const next: StoredRecallSelections = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    scopes: limitedScopes,
  }
  port.write(creatorLocalMetaKeys.manualRecallSelections, next)
  return Object.fromEntries(
    Object.entries(next.scopes).map(([storedScope, value]) => [storedScope, [...value.ids]]),
  )
}
