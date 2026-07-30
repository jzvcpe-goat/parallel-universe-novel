import type { PmfLocalDraft } from '@/features/pmf/types'
import {
  readLocalDraftRecords,
  upsertLocalDraftRecord,
} from './creatorLocalRepository'

function randomId(prefix: string) {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}:${id}`
}

export function createLocalDraftRef() {
  return randomId('local-draft')
}

export function readLocalDrafts(): PmfLocalDraft[] {
  return readLocalDraftRecords()
}

export function upsertLocalDraft(draft: PmfLocalDraft) {
  upsertLocalDraftRecord(draft)
}
