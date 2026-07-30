import { BookOpen, GitBranch, HeartPulse, ListFilter, Radio } from 'lucide-react'
import type { CreatorStoryMapItem } from '@/components/creator/workspace/CreatorStoryContextPanels'
import type {
  PmfBranch,
  PmfChapter,
  PmfLocalDraft,
  PmfReaderRequest,
  PmfWork,
} from '@/features/pmf/types'
import {
  chapterDirectionLabel,
  type ChapterDirectionId,
} from './creatorEditorViewModels'

export function storyMapTokens(source: string, candidates: string[], fallback: string) {
  const hits = candidates.filter(item => source.includes(item))
  return hits.length ? hits.slice(0, 4) : [fallback]
}

export function buildStoryMapItems({
  work,
  branch,
  latestChapter,
  requestChapter,
  linkedRequest,
  activeDraft,
  content,
  direction,
  branchCount,
  chapterCount,
}: {
  work: PmfWork | null
  branch: PmfBranch | null
  latestChapter: PmfChapter | null
  requestChapter: PmfChapter | null
  linkedRequest: PmfReaderRequest | null
  activeDraft: PmfLocalDraft | null
  content: string
  direction: ChapterDirectionId
  branchCount: number
  chapterCount: number
}): CreatorStoryMapItem[] {
  const storySource = [
    work?.title,
    work?.summary,
    branch?.title,
    branch?.summary,
    latestChapter?.title,
    latestChapter?.content,
    requestChapter?.title,
    requestChapter?.content,
    linkedRequest?.request_text,
    activeDraft?.title,
    content,
  ].filter(Boolean).join(' ')
  const characters = storyMapTokens(
    storySource,
    ['沈星澜', '陆白', '守塔人', '档案官', '无名航海者', '归航者', '幸存者', '来信人'],
    content.trim() ? '新出场人物待确认' : '等待正文出现人物',
  )
  const hooks = storyMapTokens(
    storySource,
    ['灯塔', '罗盘', '档案', '密信', '雨夜', '契书', '真相', '失踪者', '支线', '选择', '代价'],
    chapterDirectionLabel(direction),
  )
  const chapterAnchor = requestChapter || latestChapter
  const chapterLabel = chapterAnchor
    ? `第 ${chapterAnchor.chapter_no} 章`
    : activeDraft
      ? '当前草稿'
      : '新章节'
  const timeLabel = latestChapter
    ? `接在第 ${latestChapter.chapter_no} 章之后`
    : requestChapter
      ? `从第 ${requestChapter.chapter_no} 章分出`
      : '等待章节挂点'

  return [
    {
      id: 'work',
      icon: <BookOpen size={15} />,
      label: '作品',
      value: work?.title || '未选择作品',
      detail: work ? `${chapterCount} 章 / ${branchCount} 条线` : '先选择作品和章节去向。',
    },
    {
      id: 'chapter',
      icon: <ListFilter size={15} />,
      label: '章节',
      value: chapterLabel,
      detail: chapterAnchor?.title || activeDraft?.title || '这一章尚未形成公开标题。',
    },
    {
      id: 'characters',
      icon: <HeartPulse size={15} />,
      label: '人物',
      value: characters.join('、'),
      detail: '只展示当前章节已经露出的角色线索。',
    },
    {
      id: 'hooks',
      icon: <GitBranch size={15} />,
      label: '伏笔',
      value: hooks.join('、'),
      detail: '写作台会提醒哪些线索适合继续推进。',
    },
    {
      id: 'time',
      icon: <Radio size={15} />,
      label: '时间位置',
      value: timeLabel,
      detail: branch?.title || '先确定主线或 IF 支线。',
    },
  ]
}
