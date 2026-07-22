import type { PmfReaderRequest } from '@/features/pmf/types'
import {
  chapterDirectionLabel,
  type ChapterDirectionId,
} from './creatorEditorViewModels'

export function buildInlineReviewItems({
  content,
  title,
  linkedRequest,
  direction,
}: {
  content: string
  title: string
  linkedRequest: PmfReaderRequest | null
  direction: ChapterDirectionId
}) {
  const hasQuestionHook = /[？?]/.test(content) || content.includes('却') || content.includes('但是')
  return [
    {
      label: '开场承诺',
      locus: '段首',
      status: linkedRequest ? '已对齐' : '待确认',
      body: linkedRequest
        ? '这一章已经围绕读者想看的方向展开。'
        : '如果是自主更新，建议先明确这一章要让读者期待什么。',
      action: linkedRequest ? '保留' : '补一句承诺',
    },
    {
      label: '段落力度',
      locus: '正文',
      status: content.trim().length >= 180 ? '稳定' : '可加强',
      body: content.trim().length >= 180
        ? '正文长度已经足够进入发布包确认。'
        : '当前段落还像开场笔记，可以再补一个动作、一个阻碍和一个代价。',
      action: '补一段',
    },
    {
      label: '结尾钩子',
      locus: '段尾',
      status: hasQuestionHook ? '有效' : '待加强',
      body: hasQuestionHook
        ? '结尾已经留下继续阅读的张力。'
        : `按「${chapterDirectionLabel(direction)}」补一个没有立刻解释的变化。`,
      action: '加钩子',
    },
    {
      label: '标题匹配',
      locus: '标题',
      status: title.trim().length > 2 ? '可用' : '待命名',
      body: title.trim().length > 2
        ? '标题已经可以进入发布包确认。'
        : '标题最好直接指向本章最重要的异常或选择。',
      action: '换标题',
    },
  ]
}
