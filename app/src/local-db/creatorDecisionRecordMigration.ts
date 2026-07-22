import { normalizePersistedCharacterStatePath } from '@/features/creator-decision/characterState'

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function migratePersistedPatchOperation(value: unknown) {
  if (!isRecord(value) || typeof value.path !== 'string') return value
  const path = normalizePersistedCharacterStatePath(value.path)
  return path === value.path ? value : { ...value, path }
}

function migrateOperationList(value: unknown) {
  return Array.isArray(value) ? value.map(migratePersistedPatchOperation) : value
}

export function migratePersistedSceneDraftRecord(value: unknown) {
  if (!isRecord(value)) return value
  return {
    ...value,
    observedStateChanges: migrateOperationList(value.observedStateChanges),
  }
}

export function migratePersistedCanonPatchRecord(value: unknown) {
  if (!isRecord(value)) return value
  return {
    ...value,
    operations: migrateOperationList(value.operations),
  }
}
