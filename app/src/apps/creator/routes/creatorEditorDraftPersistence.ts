import type { PmfLocalDraft, PmfReaderRequest } from '@/features/pmf/types'
import {
  createLocalDraftRef,
  readLocalDrafts,
  upsertLocalDraft,
} from '@/local-db/creatorLocalDraftRepository'
import { inspectLocalDraftBodyRegression } from '@/local-db/creatorLocalDraftBodyStore'
import {
  readLocalCreativeReminders,
  upsertLocalCreativeReminder,
  type PmfCreativeReminder,
} from '@/local-db/creatorLocalWritingRepository'
import { buildEditorLocalDraft } from './creatorEditorDraftController'

export interface SaveEditorDraftInput {
  activeDraftRef: string
  linkedRequest: PmfReaderRequest | null
  workId: string
  branchId: string
  chapterNumber?: number | null
  title: string
  content: string
  nowIso: string
}

export interface SaveEditorDraftResult {
  draft: PmfLocalDraft
  drafts: PmfLocalDraft[]
  creativeReminders: PmfCreativeReminder[] | null
}

export class EditorDraftHistoricalRegressionError extends Error {
  readonly matchedVersion: number

  constructor(matchedVersion: number) {
    super('The submitted manuscript matches an older local draft revision.')
    this.name = 'EditorDraftHistoricalRegressionError'
    this.matchedVersion = matchedVersion
  }
}

export function readEditorDrafts() {
  return readLocalDrafts()
}

export async function saveEditorDraft({
  activeDraftRef,
  linkedRequest,
  workId,
  branchId,
  chapterNumber,
  title,
  content,
  nowIso,
}: SaveEditorDraftInput): Promise<SaveEditorDraftResult> {
  if (activeDraftRef) {
    const regression = await inspectLocalDraftBodyRegression(activeDraftRef, content)
    if (regression.status === 'historical_regression') {
      throw new EditorDraftHistoricalRegressionError(regression.matchedVersion)
    }
  }
  const draft = buildEditorLocalDraft({
    localDraftRef: activeDraftRef || createLocalDraftRef(),
    linkedRequest,
    workId,
    branchId,
    chapterNumber,
    title,
    content,
    nowIso,
  })
  upsertLocalDraft(draft)
  let creativeReminders: PmfCreativeReminder[] | null = null
  if (linkedRequest) {
    upsertLocalCreativeReminder({
      request: linkedRequest,
      draftId: draft.localDraftRef,
      status: 'used',
    })
    creativeReminders = readLocalCreativeReminders()
  }
  return {
    draft,
    drafts: readEditorDrafts(),
    creativeReminders,
  }
}
