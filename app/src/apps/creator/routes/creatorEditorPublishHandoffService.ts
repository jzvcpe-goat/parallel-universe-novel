import type { PmfLocalDraft } from '@/features/pmf/types'
import { upsertLocalPublishBundle } from '@/local-db/creatorLocalPublishRepository'
import type { PublishBundleRecord } from '@/local-db/schema'
import {
  resolveEditorPublishHandoff,
  type EditorPublishHandoff,
} from './creatorEditorPublishHandoffController'

export interface EditorPublishHandoffPersistencePort {
  saveBundleDraft(bundleDraft: PublishBundleRecord): void
}

const defaultEditorPublishHandoffPersistencePort: EditorPublishHandoffPersistencePort = {
  saveBundleDraft: upsertLocalPublishBundle,
}

export function prepareEditorPublishHandoff(
  draft: PmfLocalDraft,
  persistence: EditorPublishHandoffPersistencePort = defaultEditorPublishHandoffPersistencePort,
): EditorPublishHandoff {
  const handoff = resolveEditorPublishHandoff(draft)
  persistence.saveBundleDraft(handoff.bundleDraft)
  return handoff
}
