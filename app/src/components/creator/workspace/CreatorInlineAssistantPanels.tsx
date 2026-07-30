import { type ReactNode, useState } from 'react'
import { CheckCircle2, FileText, GitBranch, Keyboard, MessageSquare, Sparkles } from 'lucide-react'
import type { CreatorAgentActionName } from '@/agent-surface/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const workspaceAssistantCardClass =
  'border-[var(--creator-assistant-border)] bg-[var(--creator-assistant-bg)] text-[var(--creator-assistant-text)] shadow-none'
const workspaceAssistantPanelClass =
  'rounded-2xl border border-[var(--creator-assistant-panel-border)] bg-[var(--creator-assistant-panel-bg)]'
const workspacePanelClass =
  'rounded-2xl border border-[var(--creator-border)] bg-[var(--creator-editor-control)]'
const workspaceInlineAssistCardClass =
  'border-[var(--creator-inline-assist-border)] bg-[var(--creator-inline-assist-bg)] text-[var(--creator-editor-text)] shadow-none'

export interface CreatorAssistImpactRow {
  label: string
  value: string
}

export interface CreatorEditorAssistCandidate {
  id: string
  title: string
  reason: string
  preview: string
  primaryLabel: string
  impactPreview: CreatorAssistImpactRow[]
  adoptionPlan?: CreatorAssistImpactRow[]
  allowBranch?: boolean
}

export interface CreatorEditorAssistFocus {
  label: string
  value: string
}

export interface CreatorEditorAssistProgress {
  label: string
  ready?: boolean
  active?: boolean
}

export interface CreatorEditorAssistAction {
  label: string
  hint: string
  shortcut: string
  icon: ReactNode
  primary?: boolean
  onClick: () => void
}

export interface CreatorEditorAssistPanelProps {
  candidate: CreatorEditorAssistCandidate | null
  currentFocus: string
  focusItems: CreatorEditorAssistFocus[]
  progressItems: CreatorEditorAssistProgress[]
  actions: CreatorEditorAssistAction[]
  onApply: () => void
  onKeepBranch: () => void
  onDismiss: () => void
  className?: string
}

export function CreatorEditorAssistPanel({ candidate, currentFocus, focusItems, progressItems, actions, onApply, onKeepBranch, onDismiss, className }: CreatorEditorAssistPanelProps) {
  return (
    <Card className={cn('creator-editor-assist-panel', workspaceAssistantCardClass, className)} variant="glass" padding="sm" aria-label="行文助手">
      <CardHeader className="flex-row items-start justify-between gap-3 p-0">
        <div><div className="flex items-center gap-2"><Sparkles size={16} className="text-[var(--creator-confirm)]" /><CardTitle className="text-base text-[var(--creator-assistant-text)]">行文助手</CardTitle></div><CardDescription className="mt-2 text-sm leading-6 text-[var(--creator-assistant-text-muted)]">候选建议只会进入草稿，采用前不会改正文。</CardDescription></div>
        <Badge variant="outline">{candidate ? '正文候选' : '待生成'}</Badge>
      </CardHeader>
      <CardContent className="mt-4 space-y-4 p-0">
        {candidate ? (
          <section className="creator-editor-assist-candidate" role="region" aria-live="polite" aria-label={`候选审阅：${candidate.title}`} tabIndex={-1}>
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"><div><Badge variant="gold">建议正文</Badge><h3>{candidate.title}</h3><p>{candidate.reason}</p></div><Button variant="ghost" size="sm" onClick={onDismiss}>收起</Button></div>
            {candidate.adoptionPlan?.length ? <div className="creator-editor-assist-adoption" aria-label="采纳方式"><b>采纳方式</b>{candidate.adoptionPlan.map(item => <span key={item.label} className="creator-editor-assist-adoption-row"><Badge variant={item.label.includes('支线') ? 'outline' : 'gold'}>{item.label}</Badge><small>{item.value}</small></span>)}</div> : null}
            <blockquote>{candidate.preview}</blockquote>
            <div className="creator-editor-assist-impact"><b>采纳后影响</b>{candidate.impactPreview.map(item => <span key={item.label}><em>{item.label}</em>{item.value}</span>)}</div>
            <div className="creator-editor-assist-choice-row">
              <Button variant="gold" onClick={onApply}><CheckCircle2 size={15} />{candidate.primaryLabel}</Button>
              {candidate.allowBranch ? <Button variant="outline" onClick={onKeepBranch}><GitBranch size={15} />保留为支线候选</Button> : null}
              <Button variant="ghost" onClick={onDismiss}>暂不采用</Button>
            </div>
          </section>
        ) : <p className="creator-editor-assist-empty text-sm leading-6 text-[var(--creator-assistant-text-muted)]">写到卡住时，用上面的动作生成正文候选；采用前先看作者判断，正文不会自动变化。</p>}

        {!candidate ? <><section className={cn(workspaceAssistantPanelClass, 'p-3.5')}><p className="text-xs text-[var(--creator-assistant-text-dim)]">当前焦点</p><strong className="mt-1 block text-sm text-[var(--creator-assistant-text)]">{currentFocus}</strong><div className="creator-editor-assist-focus-grid mt-3 grid gap-2 md:grid-cols-3">{focusItems.map(item => <span key={item.label} className="rounded-xl border border-[var(--creator-assistant-panel-border)] bg-[var(--creator-assistant-control)] px-3 py-2 text-xs text-[var(--creator-assistant-text-muted)]"><em className="mb-1 block not-italic text-[var(--creator-assistant-text-dim)]">{item.label}</em>{item.value}</span>)}</div></section><section className={cn(workspaceAssistantPanelClass, 'p-3.5')}><div className="mb-3 flex items-center justify-between gap-3"><strong className="text-xs text-[var(--creator-assistant-text)]">创作进度</strong><em className="text-xs not-italic text-[var(--creator-assistant-text-dim)]">贴着正文发生</em></div><div className="creator-editor-companion-progress">{progressItems.map(item => <span key={item.label} className={`${item.ready ? 'is-ready' : ''} ${item.active ? 'is-active' : ''}`}>{item.label}</span>)}</div></section></> : null}

        {!candidate && actions.length ? <div className="creator-editor-assist-actions">{actions.map(action => <Button key={action.label} type="button" variant={action.primary ? 'gold' : 'outline'} size="sm" className="creator-editor-assist-action" aria-keyshortcuts={action.shortcut} onClick={action.onClick}>{action.icon}<span className="creator-editor-assist-action-copy"><strong>{action.label}</strong><small>{action.hint}</small></span><em className="creator-editor-assist-shortcut">{action.shortcut}</em></Button>)}</div> : null}
      </CardContent>
    </Card>
  )
}

export interface CreatorGhostCompletionPanelProps {
  title: string
  suggestion: string
  meta: string[]
  onAccept: () => void
  onQuestion: () => void
  onTemper: () => void
  className?: string
}

export function CreatorGhostCompletionPanel({ title, suggestion, meta, onAccept, onQuestion, onTemper, className }: CreatorGhostCompletionPanelProps) {
  return (
    <Card className={cn('creator-editor-ghost-completion', workspacePanelClass, className)} variant="glass" padding="sm" aria-label="下一句候选">
      <CardHeader className="creator-editor-ghost-head flex-row items-center justify-between gap-3 p-0"><div className="flex items-center gap-2"><Sparkles size={14} className="text-[var(--creator-confirm)]" /><CardTitle className="text-sm text-[var(--creator-editor-text)]">{title}</CardTitle></div><Badge className="creator-editor-ghost-badge" variant="outline">Tab 补全</Badge></CardHeader>
      <CardContent className="creator-editor-ghost-body mt-2 p-0"><p className="creator-editor-ghost-suggestion">{suggestion}</p><div className="creator-editor-ghost-meta">{meta.map(item => <span key={item}>{item}</span>)}</div><div className="creator-editor-ghost-actions"><Button className="creator-editor-ghost-action" variant="gold" size="sm" onClick={onAccept}><CheckCircle2 size={14} />Tab 接受</Button><Button className="creator-editor-ghost-action" variant="outline" size="sm" onClick={onQuestion}><MessageSquare size={14} />追问代价</Button><Button className="creator-editor-ghost-action" variant="ghost" size="sm" onClick={onTemper}><FileText size={14} />改写语气</Button></div></CardContent>
    </Card>
  )
}

export interface CreatorInlineAssistAction {
  label: string
  hint: string
  shortcut: string
  tone: 'primary' | 'secondary'
  icon: ReactNode
  disabled?: boolean
  onClick: () => void
}

export interface CreatorInlineAssistBarProps {
  eyebrow: string
  title: string
  body: string
  meta: string[]
  actions: CreatorInlineAssistAction[]
  className?: string
}

export function CreatorInlineAssistBar({ eyebrow, title, body, meta, actions, className }: CreatorInlineAssistBarProps) {
  return (
    <Card className={cn('creator-inline-assist-bar', workspaceInlineAssistCardClass, className)} variant="default" padding="sm">
      <CardContent className="grid gap-3 p-0 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div className="creator-inline-assist-copy"><Badge variant="gold">{eyebrow}</Badge><div><h3>{title}</h3><p>{body}</p></div><div className="creator-inline-assist-meta">{meta.map(item => <span key={item}>{item}</span>)}</div></div><div className="creator-inline-assist-actions">{actions.map(action => <Button key={action.label} type="button" variant={action.tone === 'primary' ? 'gold' : 'outline'} size="sm" className="creator-inline-assist-action" disabled={action.disabled} aria-keyshortcuts={action.shortcut} onClick={action.onClick}>{action.icon}<span><strong>{action.label}</strong><small>{action.hint}</small></span><em>{action.shortcut}</em></Button>)}</div></CardContent>
    </Card>
  )
}

export interface CreatorWritingCommandItem {
  id: string
  label: string
  hint: string
  shortcut: string
  state: string
  agentAction?: CreatorAgentActionName
}

export interface CreatorWritingCommandShelfProps {
  commands: CreatorWritingCommandItem[]
  activeCommand: string | null
  onRun: (commandId: string) => void
  className?: string
}

export function CreatorWritingCommandShelf({ commands, activeCommand, onRun, className }: CreatorWritingCommandShelfProps) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const visibleCommands = commands.filter(command => !normalizedQuery || `${command.label}${command.hint}${command.shortcut}${command.state}`.toLowerCase().includes(normalizedQuery))
  const primaryCommand = visibleCommands[0] || commands[0]

  return (
    <Card className={cn('creator-writing-command-shelf', workspaceAssistantCardClass, className)} variant="default" padding="sm" aria-label="快捷创作">
      <CardHeader className="creator-writing-command-head flex-row items-center justify-between gap-2 p-0"><div className="flex items-center gap-2"><Keyboard size={15} className="text-[var(--creator-accent)]" /><CardTitle className="text-sm text-[var(--creator-assistant-text)]">快捷创作</CardTitle></div><Badge className="creator-writing-command-badge" variant="outline">只入草稿</Badge></CardHeader>
      <CardContent className="mt-2 space-y-2 p-0">
        <form className="creator-writing-command-input" onSubmit={event => { event.preventDefault(); if (!primaryCommand) return; onRun(primaryCommand.id); setQuery('') }}><Input value={query} onChange={event => setQuery(event.target.value)} aria-label="快捷创作输入" placeholder="输入想法，或选下面动作" /><Button type="submit" variant="outline" size="sm" data-agent-action={primaryCommand?.agentAction}>生成</Button></form>
        <div className="creator-writing-command-list">{visibleCommands.map(command => <Button key={command.id} type="button" variant={activeCommand === command.id ? 'gold' : 'outline'} size="sm" className="creator-writing-command-chip" aria-pressed={activeCommand === command.id} data-agent-action={command.agentAction} onClick={() => onRun(command.id)}><span><strong>{command.label}</strong><small>{command.hint}</small></span><em>{command.shortcut}</em><i>{command.state}</i></Button>)}</div>
      </CardContent>
    </Card>
  )
}
