import type { ReactNode } from 'react'
import { Edit3, GitBranch, HeartPulse, MessageSquare, Plus, Wand2 } from 'lucide-react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const workspaceGlassCardClass =
  'border-[var(--creator-border)] bg-[var(--creator-surface)] text-[var(--creator-text)]'

export interface CreatorParagraphFocusRow {
  label: string
  value: string
}

export interface CreatorParagraphJudgmentAction {
  label: string
  icon?: ReactNode
  variant?: 'gold' | 'outline' | 'ghost'
  disabled?: boolean
  onClick: () => void
}

export interface CreatorParagraphJudgmentFrameProps {
  title?: string
  description?: string
  statusLabel: string
  statusVariant?: BadgeProps['variant']
  excerpt: string
  focusRows: CreatorParagraphFocusRow[]
  adviceLabel?: string
  advice: string
  actions: CreatorParagraphJudgmentAction[]
  className?: string
}

export function CreatorParagraphJudgmentFrame({
  title = '当前段落判断',
  description = '先看这一段在故事里负责什么，再决定补写、压解释还是开分支。',
  statusLabel,
  statusVariant = 'outline',
  excerpt,
  focusRows,
  adviceLabel = '建议下一步',
  advice,
  actions,
  className,
}: CreatorParagraphJudgmentFrameProps) {
  return (
    <Card
      className={cn('creator-paragraph-judgment', workspaceGlassCardClass, className)}
      variant="glass"
      padding="sm"
      role="complementary"
      aria-label={title}
    >
      <CardHeader className="flex-row items-start justify-between gap-3 p-0">
        <div>
          <div className="flex items-center gap-2">
            <HeartPulse size={18} className="text-[var(--creator-confirm)]" />
            <CardTitle className="text-lg text-[var(--creator-text)]">{title}</CardTitle>
          </div>
          <CardDescription className="mt-2 text-sm leading-6 text-[var(--creator-text-muted)]">
            {description}
          </CardDescription>
        </div>
        <Badge variant={statusVariant}>{statusLabel}</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <blockquote className="creator-paragraph-excerpt">
          {excerpt}
        </blockquote>

        <div className="creator-paragraph-focus">
          {focusRows.map(row => (
            <span key={row.label}>
              <em>{row.label}</em>
              <strong>{row.value}</strong>
            </span>
          ))}
        </div>

        <div className="creator-paragraph-advice">
          <span>{adviceLabel}</span>
          <p>{advice}</p>
        </div>

        <div className="creator-paragraph-actions">
          {actions.map(action => (
            <Button
              key={action.label}
              type="button"
              variant={action.variant || 'outline'}
              size="sm"
              className="creator-paragraph-action"
              disabled={action.disabled}
              onClick={action.onClick}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export type CreatorEditorCursorAssistCommand = 'complete' | 'question' | 'temper' | 'state' | null

function lastMeaningfulParagraph(content: string) {
  return content.trim().split(/\n{2,}|\n/).map(item => item.trim()).filter(Boolean).at(-1) || ''
}

function compactWorkspaceExcerpt(text: string, fallback: string) {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return fallback
  return cleaned.length > 72 ? `${cleaned.slice(0, 72)}...` : cleaned
}

export interface CreatorEditorCursorAssistBarProps {
  content: string
  directionLabel: string
  readerWishLabel: string
  activeCommand: CreatorEditorCursorAssistCommand
  onComplete: () => void
  onQuestion: () => void
  onTemper: () => void
  onOpenState: () => void
}

export function CreatorEditorCursorAssistBar({
  content,
  directionLabel,
  readerWishLabel,
  activeCommand,
  onComplete,
  onQuestion,
  onTemper,
  onOpenState,
}: CreatorEditorCursorAssistBarProps) {
  const paragraph = lastMeaningfulParagraph(content)
  const hasParagraph = Boolean(paragraph)
  const paragraphJob = !hasParagraph
    ? '等待第一段'
    : /[？?]/.test(paragraph)
      ? '疑问正在形成'
      : /却|但|可是|然而|只是/.test(paragraph)
        ? '反差正在形成'
        : paragraph.length < 90
          ? '动作还可以更清楚'
          : '可以看影响范围'
  const chips = [
    {
      label: '本章写法',
      value: directionLabel,
    },
    {
      label: '读者承诺',
      value: readerWishLabel,
    },
    {
      label: '当前判断',
      value: paragraphJob,
    },
  ]
  const actions: Array<{
    label: string
    shortcut: string
    active: boolean
    disabled?: boolean
    onClick: () => void
  }> = [
    {
      label: '补下一句',
      shortcut: 'Tab',
      active: activeCommand === 'complete',
      onClick: onComplete,
    },
    {
      label: '追问代价',
      shortcut: '⌘L',
      active: activeCommand === 'question',
      onClick: onQuestion,
    },
    {
      label: '改写语气',
      shortcut: '⌘K',
      active: activeCommand === 'temper',
      disabled: !hasParagraph,
      onClick: onTemper,
    },
    {
      label: '看影响',
      shortcut: '⌘I',
      active: activeCommand === 'state',
      onClick: onOpenState,
    },
  ]

  return (
    <div className="creator-editor-cursor-assist" aria-label="当前光标辅助">
      <div className="creator-editor-cursor-copy">
        <span>当前光标处</span>
        <strong>{compactWorkspaceExcerpt(paragraph, '先写一个画面、一个动作，或者直接让系统给出开场候选。')}</strong>
        <p>先生成候选，不直接改正文；采用后仍然只进入草稿。</p>
      </div>
      <div className="creator-editor-cursor-context">
        {chips.map(chip => (
          <span key={chip.label}>
            <em>{chip.label}</em>
            {chip.value}
          </span>
        ))}
      </div>
      <div className="creator-editor-cursor-actions">
        {actions.map(action => (
          <Button
            key={action.label}
            type="button"
            variant={action.active ? 'gold' : 'outline'}
            size="sm"
            className="creator-editor-cursor-action"
            aria-pressed={action.active}
            disabled={action.disabled}
            onClick={action.onClick}
          >
            <span className="creator-editor-cursor-shortcut">{action.shortcut}</span>
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

export interface CreatorParagraphJudgmentPanelProps {
  content: string
  directionLabel: string
  hasLinkedEcho: boolean
  titleReady: boolean
  destinationReady: boolean
  onComplete: () => void
  onTemper: () => void
  onQuestion: () => void
  onOpenState: () => void
  onOpenBranch: () => void
}

export function CreatorParagraphJudgmentPanel({
  content,
  directionLabel,
  hasLinkedEcho,
  titleReady,
  destinationReady,
  onComplete,
  onTemper,
  onQuestion,
  onOpenState,
  onOpenBranch,
}: CreatorParagraphJudgmentPanelProps) {
  const paragraph = lastMeaningfulParagraph(content)
  const hasParagraph = Boolean(paragraph)
  const hasQuestionHook = /[？?]/.test(paragraph)
  const hasContrast = /却|但|可是|然而|只是/.test(paragraph)
  const currentJob = !hasParagraph
    ? '等待第一段正文'
    : hasQuestionHook
      ? '正在制造疑问'
      : hasContrast
        ? '正在制造反差'
        : paragraph.length < 90
          ? '正在搭开场动作'
          : '正在承接本章压力'
  const nextAdvice = !hasParagraph
    ? '先写一个画面、一个动作或一个不能拖延的选择。'
    : hasQuestionHook
      ? '下一步适合给疑问一个可感知后果，不要立刻解释答案。'
      : hasContrast
        ? '下一步适合补人物反应，让反差落到行动上。'
        : paragraph.length < 90
          ? '下一步适合补一个阻碍或代价，让段落不只是设定。'
          : '下一步适合检查影响范围，避免支线和主线目标混在一起。'
  const focusRows = [
    {
      label: '正在承担',
      value: currentJob,
    },
    {
      label: '本章写法',
      value: directionLabel,
    },
    {
      label: '读者承诺',
      value: hasLinkedEcho ? '回应当前回声' : '自主章节',
    },
  ]
  const paragraphActions: CreatorParagraphJudgmentAction[] = [
    {
      label: '续写候选',
      variant: 'gold',
      icon: <Wand2 size={14} />,
      onClick: onComplete,
    },
    {
      label: '压低解释',
      variant: 'outline',
      icon: <Edit3 size={14} />,
      disabled: !hasParagraph,
      onClick: onTemper,
    },
    {
      label: '追问代价',
      variant: 'outline',
      icon: <MessageSquare size={14} />,
      onClick: onQuestion,
    },
    {
      label: '看影响',
      variant: 'outline',
      icon: <GitBranch size={14} />,
      disabled: !titleReady || !destinationReady,
      onClick: onOpenState,
    },
    {
      label: '试分支',
      variant: 'ghost',
      icon: <Plus size={14} />,
      onClick: onOpenBranch,
    },
  ]

  return (
    <CreatorParagraphJudgmentFrame
      statusLabel={hasParagraph ? '可判断' : '待起笔'}
      statusVariant={hasParagraph ? 'gold' : 'outline'}
      excerpt={compactWorkspaceExcerpt(paragraph, '还没有正文。可以先写一个画面，或者点“续写一段”生成候选。')}
      focusRows={focusRows}
      advice={nextAdvice}
      actions={paragraphActions}
    />
  )
}

export interface CreatorStoryHandoffPanelProps {
  hasQuestionDirection: boolean
  contentReady: boolean
  publishReady: boolean
  activeStep: string
  onConfirmQuestion: () => void
  onAcceptDraft: () => void
  onReviewState: () => void
  onPreparePublish: () => void
}

export function CreatorStoryHandoffPanel({
  hasQuestionDirection,
  contentReady,
  publishReady,
  activeStep,
  onConfirmQuestion,
  onAcceptDraft,
  onReviewState,
  onPreparePublish,
}: CreatorStoryHandoffPanelProps) {
  const handoffSteps = [
    {
      id: 'intent',
      label: '创作问题',
      state: hasQuestionDirection ? '已形成方向' : '先选方向',
      ready: hasQuestionDirection,
      action: hasQuestionDirection ? '继续下一步' : '确认判断',
      onClick: onConfirmQuestion,
    },
    {
      id: 'draft',
      label: '正文候选',
      state: contentReady ? '已有正文' : '等待第一段',
      ready: contentReady,
      action: contentReady ? '继续补写' : '接受候选',
      onClick: onAcceptDraft,
    },
    {
      id: 'memory',
      label: '故事影响',
      state: publishReady ? '可以查看' : '先补齐草稿',
      ready: publishReady,
      action: '看影响',
      onClick: onReviewState,
    },
    {
      id: 'publish',
      label: '发布确认',
      state: publishReady ? '可以准备' : '等待条件',
      ready: publishReady,
      action: '准备确认',
      onClick: onPreparePublish,
    },
  ]

  return (
    <div className="creator-story-handoff" aria-label="创作接力">
      <div className="creator-story-handoff-head">
        <span>创作接力</span>
        <em>问题 → 正文 → 状态 → 确认</em>
      </div>
      <div className="creator-story-handoff-track">
        {handoffSteps.map((step, index) => (
          <Button
            key={step.label}
            type="button"
            variant={activeStep === step.id ? 'gold' : step.ready ? 'outline' : 'ghost'}
            size="sm"
            className="creator-story-handoff-step"
            aria-pressed={activeStep === step.id}
            onClick={step.onClick}
          >
            <i>{index + 1}</i>
            <span>
              <strong>{step.label}</strong>
              <small>{step.state}</small>
            </span>
            <em>{step.action}</em>
          </Button>
        ))}
      </div>
    </div>
  )
}
