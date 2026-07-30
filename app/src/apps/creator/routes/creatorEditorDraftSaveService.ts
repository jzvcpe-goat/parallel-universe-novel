import type { PmfLocalDraft, PmfReaderRequest } from '@/features/pmf/types'
import {
  resolveEditorDraftSaveBlocker,
  type EditorDraftSaveReadiness,
} from './creatorEditorDraftController'
import {
  EditorDraftHistoricalRegressionError,
  saveEditorDraft,
  type SaveEditorDraftInput,
  type SaveEditorDraftResult,
} from './creatorEditorDraftPersistence'

export interface EditorDraftPersistencePort {
  save(input: SaveEditorDraftInput): Promise<SaveEditorDraftResult>
}

export interface RunEditorDraftSaveInput {
  activeDraftRef: string
  branchId: string
  chapterNumber?: number | null
  content: string
  linkedRequest: PmfReaderRequest | null
  readiness: EditorDraftSaveReadiness
  title: string
  workId: string
}

export type RunEditorDraftSaveResult =
  | {
    ok: false
    notice: string
  }
  | {
    ok: true
    creativeReminders: SaveEditorDraftResult['creativeReminders']
    draft: PmfLocalDraft
    drafts: PmfLocalDraft[]
    notice: string
  }

const defaultEditorDraftPersistencePort: EditorDraftPersistencePort = {
  save: saveEditorDraft,
}

export async function runEditorDraftSave(
  {
    activeDraftRef,
    branchId,
    chapterNumber,
    content,
    linkedRequest,
    readiness,
    title,
    workId,
  }: RunEditorDraftSaveInput,
  persistence: EditorDraftPersistencePort = defaultEditorDraftPersistencePort,
): Promise<RunEditorDraftSaveResult> {
  const blocker = resolveEditorDraftSaveBlocker(readiness)
  if (blocker) return { ok: false, notice: blocker.notice }

  let result: SaveEditorDraftResult
  try {
    result = await persistence.save({
      activeDraftRef,
      linkedRequest,
      workId,
      branchId,
      chapterNumber,
      title,
      content,
      nowIso: new Date().toISOString(),
    })
  } catch (error) {
    if (error instanceof EditorDraftHistoricalRegressionError) {
      return {
        ok: false,
        notice: `检测到正文与较早的本机版本 r${error.matchedVersion} 完全相同；为避免覆盖新修改，本次未保存。`,
      }
    }
    throw error
  }

  return {
    ok: true,
    creativeReminders: result.creativeReminders,
    draft: result.draft,
    drafts: result.drafts,
    notice: '已保存私密草稿。',
  }
}
