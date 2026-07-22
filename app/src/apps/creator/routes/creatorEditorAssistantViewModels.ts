import { readerWishTypeLabel } from '../creatorViewHelpers'
import type {
  CreatorEditorAssistCandidate as CreatorWorkspaceAssistCandidate,
  CreatorEditorAssistFocus,
  CreatorEditorAssistProgress,
  CreatorWritingCommandItem,
} from '@/components/creator/workspace/CreatorInlineAssistantPanels'
import type { CreatorReviewDockTabId } from '@/components/creator/workspace/CreatorReviewDock'
import type { PmfReaderRequest } from '@/features/pmf/types'
import {
  chapterDirectionLabel,
  type ChapterDirectionId,
  type WritingGuideStep,
} from './creatorEditorViewModels'

export type EditorAssistAction = 'complete' | 'temper' | 'question' | 'hook' | 'title'
export type WritingCommandId = 'complete' | 'temper' | 'question' | 'state' | 'sandbox' | 'record'
export type ReviewDockTab = CreatorReviewDockTabId
export type EditorAssistCandidate = {
  id: EditorAssistAction
  title: string
  reason: string
  preview: string
  primaryLabel: string
  impactPreview: Array<{
    label: string
    value: string
  }>
}

export function buildEditorCompletion(request: PmfReaderRequest | null, content: string) {
  if (content.trim().length < 20) {
    if (request?.request_text) {
      const requestSeed = request.request_text.trim().replace(/[。！？!?；;，,、]+$/u, '')
      return `他没有立刻回答，而是先看向那条请求背后的裂缝：${requestSeed}。这一刻，真正逼近他的不是答案，而是必须做出选择的代价。`
    }
    return '他停在门前，听见风里传来第二个名字。那不是召唤，而是一种提醒：如果继续向前，旧答案会失效。'
  }
  if (request?.request_type === 'if_branch') {
    return '如果这一次选择走向另一条线，代价必须先落到一个具体的人身上。否则支线只会像旁枝，而不会像命运。'
  }
  if (request?.request_type === 'continue_branch') {
    return '上一段留下的承诺不能只靠解释收束，它需要一个新的动作来证明人物已经变了。'
  }
  return '下一段可以先不解释规则，而是让人物用一个错误判断撞上规则。读者会跟着代价理解世界。'
}

export function buildEditorAssistCandidate({
  action,
  suggestion,
  content,
  direction,
  linkedRequest,
}: {
  action: EditorAssistAction
  suggestion: string
  content: string
  direction: ChapterDirectionId
  linkedRequest: PmfReaderRequest | null
}): EditorAssistCandidate {
  const lastLine = content.trim().split(/\n+/).filter(Boolean).at(-1) || ''
  const requestFocus = linkedRequest?.request_text || `本章选择了「${chapterDirectionLabel(direction)}」`

  if (action === 'temper') {
    return {
      id: action,
      title: '更克制的写法',
      reason: '把解释压低，让动作和细节承担情绪。',
      preview: lastLine
        ? `他没有立刻回答，只把刚才那句话压回喉咙里。那一瞬间，${lastLine.slice(0, 28)}像被重新放进了更暗的地方。`
        : '他没有急着解释，只把灯移近了一寸。纸页上的字没有变，屋里的每个人却都明白，有些答案已经来得太晚。',
      primaryLabel: '插入这一段',
      impactPreview: [
        { label: '正文节奏', value: '解释减少，画面更重。' },
        { label: '人物状态', value: '情绪压低，行动承担表达。' },
        { label: '读者承诺', value: '保留疑问，不提前说明答案。' },
      ],
    }
  }

  if (action === 'question') {
    return {
      id: action,
      title: '关键追问',
      reason: '先逼近这场戏必须付出的代价，再继续写会更稳。',
      preview: `这场戏真正不能省掉的代价是什么？围绕「${requestFocus}」，让人物失去一样能被读者立刻感知的东西。`,
      primaryLabel: '放入追问',
      impactPreview: [
        { label: '人物动机', value: '先确认人物愿意付出什么。' },
        { label: '支线代价', value: '避免只换选择、不换后果。' },
        { label: '下一步', value: '回答后再生成正文候选。' },
      ],
    }
  }

  if (action === 'hook') {
    return {
      id: action,
      title: '结尾钩子候选',
      reason: '段尾只补一个新变化，不提前解释答案。',
      preview: '可就在他准备相信这一切时，门外传来了第二个答案。',
      primaryLabel: '插入钩子',
      impactPreview: [
        { label: '段尾张力', value: '增加继续阅读的悬念。' },
        { label: '解释密度', value: '只给变化，不给答案。' },
        { label: '读者承诺', value: '把下一段的问题露出来。' },
      ],
    }
  }

  if (action === 'title') {
    const directionLabel = chapterDirectionLabel(direction)
    const titleSeed = linkedRequest?.request_type === 'if_branch'
      ? '另一条路'
      : direction === 'reveal'
        ? '第二个答案'
        : direction === 'branch'
          ? '另一条路'
          : '命运裂口'
    return {
      id: action,
      title: '标题候选',
      reason: '标题先贴住本章最重要的异常或选择，避免只像工作标题。',
      preview: `${directionLabel}：${titleSeed}`,
      primaryLabel: '采用标题',
      impactPreview: [
        { label: '读者预期', value: '先感到本章要解决什么。' },
        { label: '写法方向', value: directionLabel },
        { label: '采用后', value: '只改私密草稿标题。' },
      ],
    }
  }

  return {
    id: action,
    title: '下一段候选',
    reason: '顺着当前段落继续推进，但先停在候选里等作者确认。',
    preview: suggestion,
    primaryLabel: '插入这一段',
    impactPreview: [
      { label: '本章写法', value: chapterDirectionLabel(direction) },
      { label: linkedRequest ? '读者愿望' : '章节入口', value: linkedRequest ? '继续回应当前请求。' : '继续当前作品线。' },
      { label: '采用后', value: '只进入私密草稿。' },
    ],
  }
}

export function workspaceAssistCandidate(candidate: EditorAssistCandidate | null): CreatorWorkspaceAssistCandidate | null {
  if (!candidate) return null
  const allowBranch = candidate.id !== 'question' && candidate.id !== 'title'
  const adoptionPlan = [
    candidate.id === 'question'
      ? { label: '先回答问题', value: '不写正文，先把下一问放进判断。' }
      : candidate.id === 'title'
        ? { label: '采用标题', value: '只改私密草稿标题。' }
        : candidate.primaryLabel === '替换当前段落'
          ? { label: '替换当前段落', value: '只替换当前段落，原文不会公开。' }
          : { label: '插入正文后方', value: '追加到当前正文后，仍停在草稿。' },
    ...(allowBranch ? [{ label: 'IF 支线候选', value: '不改主线，先作为支线试写。' }] : []),
  ]
  return { ...candidate, adoptionPlan, allowBranch }
}

export function workspaceAssistFocus({
  direction,
  linkedRequest,
  activeStep,
}: {
  direction: ChapterDirectionId
  linkedRequest: PmfReaderRequest | null
  activeStep: WritingGuideStep
}): CreatorEditorAssistFocus[] {
  const guideStepLabel: Record<WritingGuideStep, string> = {
    intent: '判断读者想看什么',
    scene: '整理第一场戏',
    draft: '补正文候选',
    memory: '沉淀作品设定',
    publish: '准备发布包',
  }
  return [
    { label: '读者愿望', value: linkedRequest ? readerWishTypeLabel(linkedRequest.request_type) : '独立章节' },
    { label: '本章写法', value: chapterDirectionLabel(direction) },
    { label: '当前进度', value: guideStepLabel[activeStep] },
  ]
}

export function workspaceAssistCurrentFocus({
  titleReady,
  contentReady,
  destinationReady,
}: {
  titleReady: boolean
  contentReady: boolean
  destinationReady: boolean
}) {
  return !contentReady
    ? '先写出一段可读正文'
    : !titleReady
      ? '把标题和正文对齐'
      : !destinationReady
        ? '确认主线或 IF 支线'
        : '检查是否可以进入发布'
}

export function workspaceAssistProgress({
  linkedRequest,
  contentReady,
  titleReady,
  destinationReady,
  activeStep,
}: {
  linkedRequest: PmfReaderRequest | null
  contentReady: boolean
  titleReady: boolean
  destinationReady: boolean
  activeStep: WritingGuideStep
}): CreatorEditorAssistProgress[] {
  return [
    { label: '读懂请求', ready: Boolean(linkedRequest), active: activeStep === 'intent' },
    { label: '定本章写法', ready: true, active: activeStep === 'scene' },
    { label: '补正文候选', ready: contentReady, active: activeStep === 'draft' },
    { label: '看作者判断', ready: titleReady && contentReady && destinationReady, active: activeStep === 'publish' },
  ]
}

export function ghostCompletionTitle(contentReady: boolean) {
  return contentReady ? '下一句候选' : '开场候选'
}

export function ghostCompletionMeta({
  linkedRequest,
  direction,
}: {
  linkedRequest: PmfReaderRequest | null
  direction: ChapterDirectionId
}) {
  const contextLabel = linkedRequest ? readerWishTypeLabel(linkedRequest.request_type) : '自主更新'
  return [chapterDirectionLabel(direction), contextLabel, '只进入草稿']
}

export function writingCommandItems({
  contentReady,
  titleReady,
  destinationReady,
}: {
  contentReady: boolean
  titleReady: boolean
  destinationReady: boolean
}): CreatorWritingCommandItem[] {
  return [
    {
      id: 'complete',
      label: '续写一段',
      hint: contentReady ? '顺着当前段落补一个候选' : '先写出第一段正文候选',
      shortcut: 'Tab',
      state: contentReady ? '可续写' : '先起稿',
      agentAction: 'complete_next_beat',
    },
    {
      id: 'temper',
      label: '压低解释',
      hint: '把说明改成动作和细节',
      shortcut: '⌘K',
      state: contentReady ? '可改写' : '等正文',
      agentAction: 'rewrite_as_action',
    },
    {
      id: 'question',
      label: '追问代价',
      hint: '问清人物为什么必须行动',
      shortcut: '⌘L',
      state: '可追问',
      agentAction: 'ask_socratic_question',
    },
    {
      id: 'state',
      label: '看影响',
      hint: titleReady && destinationReady ? '查看这章会改变什么' : '补齐标题和去向后更准确',
      shortcut: '⌘I',
      state: titleReady && destinationReady ? '可检查' : '待补齐',
      agentAction: 'inspect_story_impact',
    },
    {
      id: 'sandbox',
      label: '试分支',
      hint: '把大改先放进支线试写比较',
      shortcut: '⌘B',
      state: '先比较',
      agentAction: 'branch_sandbox',
    },
    {
      id: 'record',
      label: '看建议依据',
      hint: '回看本章为什么这样建议',
      shortcut: '⌘J',
      state: '可展开',
      agentAction: 'open_suggestion_record',
    },
  ]
}
