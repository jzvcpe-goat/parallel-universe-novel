import type { PmfLocalDraft } from '@/features/pmf/types'
import { readEditorDrafts } from './creatorEditorDraftPersistence'

export interface EditorDraftLoadPersistencePort {
  readAll(): PmfLocalDraft[]
}

interface RunEditorDraftLoadResult {
  drafts: PmfLocalDraft[]
}

const defaultEditorDraftLoadPersistencePort: EditorDraftLoadPersistencePort = {
  readAll: readEditorDrafts,
}

export function runEditorDraftLoad(
  persistence: EditorDraftLoadPersistencePort = defaultEditorDraftLoadPersistencePort,
): RunEditorDraftLoadResult {
  return {
    drafts: persistence.readAll(),
  }
}
