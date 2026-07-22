import { type FormEvent, type ReactNode, useState } from 'react'
import { CheckCircle2, Edit3, GitBranch, ListFilter, MessageSquare, Send, Sparkles, Wand2 } from 'lucide-react'
import type { CreatorAgentActionName } from '@/agent-surface/actions'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const workspaceAssistantCardClass =
  'border-[var(--creator-assistant-border)] bg-[var(--creator-assistant-bg)] text-[var(--creator-assistant-text)]'

export interface CreatorAssistantRow {
  label: string
  body: string
  ready?: boolean
}

export interface CreatorAssistantAction {
  label: string
  shortcut: string
  icon: ReactNode
  onClick: () => void
  hint?: string
  disabled?: boolean
  agentAction?: CreatorAgentActionName
}

export interface CreatorAgentWritingAssistantPanelProps {
  content: string
  directionLabel: string
  linkedRequestText?: string | null
  titleReady: boolean
  contentReady: boolean
  destinationReady: boolean
  notice: string
  compact?: boolean
  onComplete: () => void
  onTemper: () => void
  onQuestion: () => void
  onOpenState: () => void
  onOpenBranch: () => void
  onShowReview: () => void
  onShowRecord: () => void
  onSaveDraft: () => void
  onEnterPublishCheck: () => void
}

export function CreatorAgentWritingAssistantPanel({ content, directionLabel, linkedRequestText, titleReady, contentReady, destinationReady, notice, compact, onComplete, onTemper, onQuestion, onOpenState, onOpenBranch, onShowReview, onShowRecord, onSaveDraft, onEnterPublishCheck }: CreatorAgentWritingAssistantPanelProps) {
  const [command, setCommand] = useState('')
  const paragraph = lastCreatorMeaningfulParagraph(content)
  const readyCount = [linkedRequestText || contentReady, titleReady, contentReady, destinationReady].filter(Boolean).length
  const nextLabel = !contentReady ? '先补一段正文' : !titleReady ? '补一个章节标题' : !destinationReady ? '确定主线或 IF 支线' : '进入发布前检查'
  const taskRows: CreatorAssistantRow[] = [
    { label: linkedRequestText ? '读懂愿望' : '确定章节入口', body: linkedRequestText ? compactCreatorExcerpt(linkedRequestText, '读者愿望已选中。') : '没有愿望时，从作品当前压力继续写。', ready: Boolean(linkedRequestText) || contentReady },
    { label: '选择写法', body: directionLabel, ready: true },
    { label: '补正文', body: contentReady ? '已有可继续加工的段落。' : '先写出一个能被判断的画面。', ready: contentReady },
    { label: '看影响', body: titleReady && destinationReady ? '可以检查人物、伏笔和支线位置。' : '标题和去向补齐后再看更准确。', ready: titleReady && destinationReady },
    { label: '发布包确认', body: titleReady && contentReady && destinationReady ? '可以进入确认。' : '作者确认前不会公开。', ready: titleReady && contentReady && destinationReady },
  ]
  const executionRows: CreatorAssistantRow[] = [
    { label: '读取正文', body: paragraph ? '已拿到当前段落和章节标题。' : '等待第一段正文。', ready: Boolean(paragraph) },
    { label: '对齐读者愿望', body: linkedRequestText ? '已保留读者原话，不替作者改承诺。' : '没有挂接愿望时，只按作品当前位置建议。', ready: Boolean(linkedRequestText) },
    { label: '形成候选', body: contentReady ? '可以补下一段、改语气或追问代价。' : '先需要一个画面或开场。', ready: contentReady },
  ]
  const quickActions: CreatorAssistantAction[] = [
    { label: '续写一段', shortcut: 'Tab', hint: '接住当前段落往前写', onClick: onComplete, icon: <Wand2 size={14} />, agentAction: 'complete_next_beat' },
    { label: '压低解释', shortcut: '⌘K', hint: '把说明改成动作和细节', onClick: onTemper, icon: <Edit3 size={14} />, disabled: !contentReady, agentAction: 'rewrite_as_action' },
    { label: '追问代价', shortcut: '⌘L', hint: '帮你找下一问的冲突', onClick: onQuestion, icon: <MessageSquare size={14} />, agentAction: 'ask_socratic_question' },
    { label: '看影响', shortcut: '⌘I', hint: '检查人物、伏笔和支线', onClick: onOpenState, icon: <GitBranch size={14} />, disabled: !titleReady || !contentReady, agentAction: 'inspect_story_impact' },
  ]

  function submitCommand() {
    const text = command.trim()
    if (!text) onQuestion()
    else if (/影响|改变|状态|故事/.test(text)) onOpenState()
    else if (/支线|分支|另一条/.test(text)) onOpenBranch()
    else if (/解释|克制|画面|改写/.test(text)) onTemper()
    else onComplete()
    setCommand('')
  }

  return <CreatorAssistantDock nextLabel={nextLabel} readyLabel={`${readyCount}/4`} description="用自然语言说想改哪里，助手先给候选；采用、保存和发布都由作者确认。" currentContext={compactCreatorExcerpt(paragraph, linkedRequestText || '还没有正文。先写一个画面，或让助手给出开场候选。')} executionRows={executionRows} taskRows={taskRows} quickActions={quickActions} command={command} onCommandChange={setCommand} onCommandSubmit={submitCommand} onShowReview={onShowReview} onShowRecord={onShowRecord} onSaveDraft={onSaveDraft} onEnterPublishCheck={onEnterPublishCheck} publishDisabled={!titleReady || !contentReady || !destinationReady} notice={notice} compact={compact} />
}

function lastCreatorMeaningfulParagraph(content: string) {
  return content.split(/\n+/).map(part => part.trim()).filter(Boolean).at(-1) || ''
}

function compactCreatorExcerpt(text: string, fallback: string) {
  const cleaned = text.trim().replace(/\s+/g, ' ')
  if (!cleaned) return fallback
  return cleaned.length > 72 ? `${cleaned.slice(0, 72)}...` : cleaned
}

export interface CreatorAgentComposerProps {
  focusLabel: string
  focusReason: string
  reference: string
  command: string
  onCommandChange: (value: string) => void
  onCommandSubmit: () => void
  actions: CreatorAssistantAction[]
  compact?: boolean
  className?: string
}

export function CreatorAgentComposer({ focusLabel, focusReason, reference, command, onCommandChange, onCommandSubmit, actions, compact, className }: CreatorAgentComposerProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); onCommandSubmit() }
  return (
    <section
      data-slot="creator-agent-composer"
      data-compact={compact ? 'true' : 'false'}
      className={cn('creator-agent-composer grid min-w-0 gap-3', className)}
      aria-label="写作搭档"
    >
      <header className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles size={15} className="shrink-0 text-[var(--creator-accent)]" />
          <h4 className="truncate text-sm font-black text-[var(--creator-assistant-text)]">对本章说</h4>
        </div>
        <Badge variant="outline" className="shrink-0">{compact ? '候选待定' : '候选先停在草稿里'}</Badge>
      </header>

      <section data-slot="creator-agent-action-queue" className="creator-agent-action-queue grid gap-1.5" aria-label="下一步动作">
        <div className="flex items-center justify-between gap-3 text-xs font-black text-[var(--creator-assistant-text-dim)]">
          <span>下一步动作</span>
          <small className={cn('text-xs font-semibold', compact && 'hidden')}>可用快捷键直接执行</small>
        </div>
        <ul className="grid gap-1.5" role="list">
          {actions.map(action => (
            <li key={action.label} className={cn(action.disabled && compact && 'hidden')}>
              <Button
                type="button"
                variant={action.disabled ? 'ghost' : 'outline'}
                size="sm"
                className={cn(
                  'creator-agent-action-card h-auto min-h-10 w-full justify-between rounded-md border-[var(--creator-assistant-panel-border)] bg-[var(--creator-assistant-control)] px-3 py-2 text-left hover:bg-[var(--creator-assistant-control-strong)]',
                  compact && 'min-h-8 py-1.5',
                )}
                disabled={action.disabled}
                aria-keyshortcuts={action.shortcut}
                data-agent-action={action.agentAction}
                onClick={action.onClick}
              >
                <span className="creator-agent-action-copy grid min-w-0 gap-0.5">
                  <span className="flex min-w-0 items-center gap-2 text-[var(--creator-assistant-text)]">
                    {action.icon}
                    <strong className="truncate text-xs font-black">{action.label}</strong>
                  </span>
                  {action.hint ? <small className={cn('truncate text-xs text-[var(--creator-assistant-text-dim)]', compact && 'hidden')}>{action.hint}</small> : null}
                </span>
                <kbd className="shrink-0 font-mono text-xs font-bold text-[var(--creator-assistant-text-dim)]">{action.shortcut}</kbd>
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <Alert
        data-slot="creator-agent-focus"
        role="note"
        className={cn(
          'creator-agent-focus border-[var(--creator-assistant-panel-border)] bg-[var(--creator-assistant-panel-bg)] text-[var(--creator-assistant-text)]',
          compact && 'hidden',
        )}
      >
        <Sparkles size={15} className="text-[var(--creator-accent)]" />
        <AlertTitle className="creator-agent-focus-head flex min-w-0 items-center justify-between gap-2">
          <Badge variant="gold">现在建议</Badge>
          <strong className="truncate text-right text-xs">{focusLabel}</strong>
        </AlertTitle>
        <AlertDescription className="space-y-1.5 text-xs leading-5 text-[var(--creator-assistant-text-muted)]">
          <p>{focusReason}</p>
          <small className="line-clamp-2 text-[var(--creator-assistant-text-dim)]">参考：{reference}</small>
        </AlertDescription>
      </Alert>

      <Separator className="bg-[var(--creator-assistant-panel-border)]" />
      <form data-slot="creator-agent-command-form" className="grid gap-2" onSubmit={handleSubmit}>
        <Textarea
          value={command}
          onChange={event => onCommandChange(event.target.value)}
          aria-label="对本章说"
          placeholder="例如：把这一段压成动作；给这个选择一个更痛的代价；换一种更冷静的语气。"
          className={cn(
            'min-h-20 border-[var(--creator-assistant-panel-border)] bg-[var(--creator-assistant-input-bg)] text-sm leading-6 text-[var(--creator-assistant-text)] shadow-none placeholder:text-[var(--creator-assistant-text-dim)]',
            compact && 'max-h-[4.4rem] min-h-[3.4rem] py-2',
          )}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-[var(--creator-assistant-text-dim)]">回车换行，点击生成候选。</span>
          <Button type="submit" variant="gold" size="sm" className="min-h-10" data-agent-action="generate_candidate_from_instruction">
            <Send size={14} />{command.trim() ? '生成候选' : '按建议生成'}
          </Button>
        </div>
      </form>
    </section>
  )
}

export interface CreatorAssistantDockProps {
  nextLabel: string
  readyLabel: string
  description: string
  currentContext: string
  executionRows: CreatorAssistantRow[]
  taskRows: CreatorAssistantRow[]
  quickActions: CreatorAssistantAction[]
  command: string
  onCommandChange: (value: string) => void
  onCommandSubmit: () => void
  onShowReview: () => void
  onShowRecord: () => void
  onSaveDraft: () => void
  onEnterPublishCheck: () => void
  publishDisabled?: boolean
  notice: string
  compact?: boolean
  className?: string
}

export function CreatorAssistantDock({ nextLabel, readyLabel, description, currentContext, executionRows, taskRows, quickActions, command, onCommandChange, onCommandSubmit, onShowReview, onShowRecord, onSaveDraft, onEnterPublishCheck, publishDisabled, notice, compact, className }: CreatorAssistantDockProps) {
  return (
    <Card
      data-slot="creator-assistant-dock"
      data-compact={compact ? 'true' : 'false'}
      className={cn(
        'creator-assistant-dock max-h-[min(30rem,calc(100vh-12rem))] overflow-y-auto overscroll-contain rounded-md shadow-[var(--creator-assistant-shadow)] [scrollbar-color:var(--creator-assistant-panel-border)_transparent] [scrollbar-width:thin]',
        compact && 'is-compact max-h-[min(18rem,calc(100vh-18rem))]',
        workspaceAssistantCardClass,
        className,
      )}
      variant="default"
      padding="none"
    >
      <CardHeader data-slot="creator-assistant-header" className="border-b border-[var(--creator-assistant-panel-border)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Badge variant="gold" className="mb-2">写作助手</Badge>
            <CardTitle className="text-base text-[var(--creator-assistant-text)]">写作搭档</CardTitle>
            <CardDescription className={cn('mt-1.5 text-xs leading-5 text-[var(--creator-assistant-text-muted)]', compact && 'hidden')}>{description}</CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0">{readyLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <Tabs defaultValue="ask" className="min-w-0">
          <TabsList className="grid w-full grid-cols-2 rounded-md border border-[var(--creator-assistant-panel-border)] bg-[var(--creator-assistant-control)]">
            <TabsTrigger value="ask">对话写作</TabsTrigger>
            <TabsTrigger value="check">写作检查</TabsTrigger>
          </TabsList>
          <TabsContent value="ask" className="mt-3">
            <CreatorAgentComposer focusLabel={nextLabel} focusReason={description} reference={currentContext} command={command} onCommandChange={onCommandChange} onCommandSubmit={onCommandSubmit} actions={quickActions} compact={compact} />
          </TabsContent>
          <TabsContent value="check" className="mt-3 divide-y divide-[var(--creator-assistant-panel-border)]">
            <CreatorAssistantDetailGroup title="写作清单" aside={`${readyLabel} 已就绪`} defaultOpen><div className="grid gap-3">{taskRows.map((row, index) => <CreatorAssistantStatusRow key={row.label} row={row} index={index + 1} />)}</div></CreatorAssistantDetailGroup>
            <CreatorAssistantDetailGroup title="已参考的信息" aside="只生成候选"><div className="grid gap-2">{executionRows.map(row => <CreatorAssistantStatusRow key={row.label} row={row} />)}</div></CreatorAssistantDetailGroup>
            <CreatorAssistantDetailGroup title="最近动作"><p className="text-sm leading-7 text-[var(--creator-assistant-text-muted)]">{notice}</p></CreatorAssistantDetailGroup>
          </TabsContent>
        </Tabs>
        <CreatorAssistantSection title="候选建议" aside="先看这一件事" className={cn(compact && 'hidden')}>
          <div className="grid gap-3">
            <p className="text-xs leading-6 text-[var(--creator-assistant-text-muted)]">{currentContext}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" size="sm" className="min-h-10" data-agent-action="inspect_story_impact" onClick={onShowReview}>审阅正文</Button>
              <Button type="button" variant="outline" size="sm" className="min-h-10" data-agent-action="open_suggestion_record" onClick={onShowRecord}>看建议依据</Button>
            </div>
          </div>
        </CreatorAssistantSection>
      </CardContent>
      <CardFooter data-slot="creator-assistant-actions" className={cn('mt-0 grid grid-cols-2 gap-2 border-[var(--creator-assistant-panel-border)] p-4', compact && 'hidden')}>
        <Button type="button" variant="ghost" size="sm" className="min-h-10" data-agent-action="save_local_draft" onClick={onSaveDraft}>保存草稿</Button>
        <Button type="button" variant="gold" size="sm" className="min-h-10" data-agent-action="enter_publish_check" disabled={publishDisabled} onClick={onEnterPublishCheck}>发布包确认</Button>
      </CardFooter>
    </Card>
  )
}

function CreatorAssistantSection({ title, aside, children, className }: { title: string; aside?: string; children: ReactNode; className?: string }) {
  return <section data-slot="creator-assistant-followup" className={cn('border-t border-[var(--creator-assistant-panel-border)] pt-3', className)}><div className="mb-3 flex items-center justify-between gap-3"><strong className="text-xs font-black text-[var(--creator-assistant-text)]">{title}</strong>{aside ? <em className="text-xs not-italic text-[var(--creator-assistant-text-dim)]">{aside}</em> : null}</div>{children}</section>
}

function CreatorAssistantDetailGroup({ title, aside, children, defaultOpen }: { title: string; aside?: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  return <Collapsible open={open} onOpenChange={setOpen} data-slot="creator-assistant-detail-group"><CollapsibleTrigger asChild><Button type="button" variant="ghost" size="sm" className="h-auto min-h-10 w-full justify-between rounded-md px-2 py-3 text-left hover:bg-[var(--creator-assistant-control-strong)]"><strong className="text-xs font-black text-[var(--creator-assistant-text)]">{title}</strong><span className="inline-flex items-center gap-2 text-xs text-[var(--creator-assistant-text-dim)]">{aside ? <em className="not-italic">{aside}</em> : null}<ListFilter className={cn('transition-transform duration-150', open && 'rotate-90 text-[var(--creator-accent)]')} size={13} /></span></Button></CollapsibleTrigger><CollapsibleContent className="px-2 pb-3 pt-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1">{children}</CollapsibleContent></Collapsible>
}

function CreatorAssistantStatusRow({ row, index }: { row: CreatorAssistantRow; index?: number }) {
  return <div data-slot="creator-assistant-status-row" className="grid grid-cols-[24px_minmax(0,1fr)] items-start gap-3"><span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-black text-[var(--creator-assistant-text-dim)]', 'border-[var(--creator-assistant-panel-border)] bg-[var(--creator-assistant-control)]', row.ready && 'border-[var(--creator-confirm)] bg-[var(--creator-assistant-ready-bg)] text-[var(--creator-confirm)]')}>{row.ready ? <CheckCircle2 size={13} /> : index || null}</span><div className="min-w-0"><strong className="block text-sm font-black text-[var(--creator-assistant-text)]">{row.label}</strong><small className="mt-1 block text-xs leading-5 text-[var(--creator-assistant-text-muted)]">{row.body}</small></div></div>
}
