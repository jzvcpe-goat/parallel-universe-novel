import {
  byNewestDraft,
  byRequestPriority,
  latestDateLabel,
  readerWishTypeLabel,
} from '../creatorViewHelpers'
import type { CreatorPrivateDraftItem } from '@/components/creator/workspace/CreatorPlanningPanels'
import type { CreatorSessionRailGroup } from '@/components/creator/workspace/CreatorStoryContextPanels'
import type {
  PmfChapter,
  PmfLocalDraft,
  PmfReaderRequest,
} from '@/features/pmf/types'

export function compactExcerpt(text: string, fallback: string) {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return fallback
  return cleaned.length > 72 ? `${cleaned.slice(0, 72)}...` : cleaned
}

export function buildEditorSessionGroups({
  activeDraftRef,
  chapters,
  drafts,
  onOpenDraft,
  onOpenRequest,
  requests,
  selectedRequestId,
}: {
  activeDraftRef: string
  chapters: PmfChapter[]
  drafts: PmfLocalDraft[]
  onOpenDraft: (draft: PmfLocalDraft) => void
  onOpenRequest: (request: PmfReaderRequest) => void
  requests: PmfReaderRequest[]
  selectedRequestId?: string | null
}): CreatorSessionRailGroup[] {
  const draftRows = [...drafts].sort(byNewestDraft).slice(0, 3)
  const requestRows = [...requests].sort(byRequestPriority).slice(0, 3)
  const chapterRows = [...chapters].sort((a, b) => b.chapter_no - a.chapter_no).slice(0, 2)

  return [
    {
      id: 'drafts',
      title: '草稿',
      emptyLabel: '暂无草稿，可以直接新建一章。',
      items: draftRows.map(draft => ({
        id: draft.localDraftRef,
        title: draft.title || '未命名章节',
        detail: latestDateLabel(draft.updatedAt),
        active: activeDraftRef === draft.localDraftRef,
        agentAction: 'open_draft',
        agentTarget: draft.localDraftRef,
        onSelect: () => onOpenDraft(draft),
      })),
    },
    {
      id: 'reader-wishes',
      title: '读者愿望',
      emptyLabel: '暂无待读者愿望，可以先写独立章节。',
      items: requestRows.map(request => ({
        id: request.id,
        title: readerWishTypeLabel(request.request_type),
        detail: compactExcerpt(request.request_text, '读者想看这一条。'),
        active: selectedRequestId === request.id,
        onSelect: () => onOpenRequest(request),
      })),
    },
    {
      id: 'chapters',
      title: '最近章节',
      emptyLabel: '还没有可参考章节。',
      items: chapterRows.map(chapter => ({
        id: chapter.id,
        title: `第 ${chapter.chapter_no} 章 · ${chapter.title}`,
        detail: latestDateLabel(chapter.published_at),
        static: true,
      })),
    },
  ]
}

export function buildEditorPrivateDraftItems({
  drafts,
  onOpenDraft,
}: {
  drafts: PmfLocalDraft[]
  onOpenDraft: (draft: PmfLocalDraft) => void
}): CreatorPrivateDraftItem[] {
  return [...drafts]
    .sort(byNewestDraft)
    .slice(0, 5)
    .map(draft => ({
      id: draft.localDraftRef,
      title: draft.title || '未命名章节',
      updatedLabel: latestDateLabel(draft.updatedAt),
      onOpen: () => onOpenDraft(draft),
    }))
}
