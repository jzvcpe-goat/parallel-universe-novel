import { type ReactNode, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Sparkles, X } from 'lucide-react'
import type { CreatorAgentActionName } from '@/agent-surface/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const reducedOverlayClass =
  '[@media(prefers-reduced-transparency:reduce)]:[background:var(--creator-command-overlay-solid-bg)] [@media(prefers-reduced-transparency:reduce)]:[backdrop-filter:none] [@media(prefers-reduced-transparency:reduce)]:[-webkit-backdrop-filter:none] [[data-creator-transparency=reduced]_&]:[background:var(--creator-command-overlay-solid-bg)] [[data-creator-transparency=reduced]_&]:[backdrop-filter:none] [[data-creator-transparency=reduced]_&]:[-webkit-backdrop-filter:none]'
const reducedPanelClass =
  '[@media(prefers-reduced-transparency:reduce)]:[background:var(--creator-command-solid-bg)] [@media(prefers-reduced-transparency:reduce)]:[backdrop-filter:none] [@media(prefers-reduced-transparency:reduce)]:[-webkit-backdrop-filter:none] [[data-creator-transparency=reduced]_&]:[background:var(--creator-command-solid-bg)] [[data-creator-transparency=reduced]_&]:[backdrop-filter:none] [[data-creator-transparency=reduced]_&]:[-webkit-backdrop-filter:none]'
const commandInsetClass =
  'rounded-lg border border-[var(--creator-assistant-panel-border)] bg-[var(--creator-assistant-panel-bg)] [@media(prefers-reduced-transparency:reduce)]:[background:var(--creator-command-inset-solid-bg)] [[data-creator-transparency=reduced]_&]:[background:var(--creator-command-inset-solid-bg)]'
const commandStrongInsetClass =
  'rounded-lg border border-[color-mix(in_oklab,var(--creator-confirm)_24%,var(--creator-assistant-panel-border))] [background:var(--creator-assistant-ready-bg)] [@media(prefers-reduced-transparency:reduce)]:[background:var(--creator-command-inset-solid-bg)] [[data-creator-transparency=reduced]_&]:[background:var(--creator-command-inset-solid-bg)]'

export interface CreatorCommandCenterFrameProps {
  title: string
  description: string
  icon?: ReactNode
  closeLabel?: string
  onClose: () => void
  children: ReactNode
  className?: string
}

export function CreatorCommandCenterFrame({
  title,
  description,
  icon,
  closeLabel = 'Esc',
  onClose,
  children,
  className,
}: CreatorCommandCenterFrameProps) {
  const titleId = useId()
  const descriptionId = useId()

  return createPortal(
    <div
      data-slot="creator-command-overlay"
      className={cn(
        'fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto px-4 py-[8vh] [background:var(--creator-command-overlay-bg)] [backdrop-filter:blur(10px)] [-webkit-backdrop-filter:blur(10px)] max-[720px]:p-3',
        reducedOverlayClass,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <Card
        data-slot="creator-command-panel"
        className={cn(
          'max-h-[84vh] w-[min(720px,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-[8px] border-[var(--creator-assistant-border)] [background:var(--creator-assistant-bg)] p-4 text-[var(--creator-assistant-text)] shadow-[var(--creator-assistant-shadow)] max-[720px]:max-h-[calc(100dvh-1.5rem)] max-[720px]:w-full max-[720px]:p-3',
          reducedPanelClass,
          className,
        )}
        variant="glass"
        padding="none"
      >
        <CardHeader data-slot="creator-command-header" className="flex-row items-start justify-between gap-3 p-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {icon ? <span className="text-[var(--creator-accent)]">{icon}</span> : null}
              <CardTitle id={titleId} className="text-lg text-[var(--creator-assistant-text)]">{title}</CardTitle>
            </div>
            <CardDescription id={descriptionId} className="mt-1.5 text-sm leading-6 text-[var(--creator-assistant-text-muted)]">
              {description}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-[var(--creator-assistant-text-muted)]"
            aria-label={`关闭快捷创作（${closeLabel}）`}
            title={`关闭（${closeLabel}）`}
            onClick={onClose}
          >
            <X size={16} />
          </Button>
        </CardHeader>
        <CardContent data-slot="creator-command-content" className="p-0">
          {children}
        </CardContent>
      </Card>
    </div>,
    document.body,
  )
}

export interface CreatorCommandSurfaceItem {
  id: string
  label: string
  shortcut: string
  detail: string
  href?: string
  agentAction: CreatorAgentActionName
}

export interface CreatorCommandContextCopy {
  focus: string
  output: string
  guard: string
  examples: string[]
}

function creatorCommandMatchesQuery(
  command: CreatorCommandSurfaceItem,
  query: string,
  intentKeywords: Record<string, string[]>,
) {
  if (!query) return true
  const haystack = `${command.label}${command.detail}${command.shortcut}`.toLowerCase()
  if (haystack.includes(query)) return true
  return (intentKeywords[command.id] || []).some(keyword => query.includes(keyword.toLowerCase()))
}

export interface CreatorCommandPaletteSurfaceProps {
  scopeLabel: string
  commands: CreatorCommandSurfaceItem[]
  intentKeywords: Record<string, string[]>
  commandContext: CreatorCommandContextCopy
  onClose: () => void
  onNavigate: (href: string) => void
  onRunCommand: (command: CreatorCommandSurfaceItem) => void
  className?: string
}

export function CreatorCommandPaletteSurface({
  scopeLabel,
  commands,
  intentKeywords,
  commandContext,
  onClose,
  onNavigate,
  onRunCommand,
  className,
}: CreatorCommandPaletteSurfaceProps) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const matchedCommands = normalizedQuery
    ? commands.filter(command => creatorCommandMatchesQuery(command, normalizedQuery, intentKeywords))
    : commands
  const visibleCommands = matchedCommands.length ? matchedCommands : commands
  const primaryCommand = visibleCommands[0] || commands[0] || null

  function run(command: CreatorCommandSurfaceItem) {
    if (command.href) onNavigate(command.href)
    onRunCommand(command)
    onClose()
  }

  return (
    <CreatorCommandCenterFrame
      title="一句话说需求"
      description="像和写作搭档说话：补段落、追问人物、整理设定或检查读者承诺。这里只生成候选卡，采用前不会改正文。"
      icon={<Sparkles size={18} />}
      onClose={onClose}
      className={className}
    >
      <dl
        data-slot="creator-command-intent-summary"
        className="mt-4 grid grid-cols-3 gap-2.5 max-[720px]:grid-cols-1"
        aria-label="当前创作意图"
      >
        {[
          ['当前焦点', commandContext.focus],
          ['输出形式', commandContext.output],
          ['保护边界', commandContext.guard],
        ].map(([label, value]) => (
          <div key={label} data-slot="creator-command-intent-item" className={cn(commandStrongInsetClass, 'grid min-h-[72px] gap-1 p-3')}>
            <dt className="text-[0.68rem] font-black text-[var(--creator-accent)]">{label}</dt>
            <dd className="text-[0.82rem] font-black leading-5 text-[var(--creator-assistant-text)]">{value}</dd>
          </div>
        ))}
      </dl>
      <dl data-slot="creator-command-context" className="mt-2.5 grid grid-cols-3 gap-2.5 max-[720px]:grid-cols-1">
        {[
          ['当前页面', scopeLabel],
          ['默认动作', primaryCommand?.label || '等待指令'],
          ['执行方式', 'Enter 生成候选'],
        ].map(([label, value]) => (
          <div key={label} data-slot="creator-command-context-item" className={cn(commandInsetClass, 'grid min-w-0 gap-1 px-3 py-2.5')}>
            <dt className="text-[0.66rem] font-bold text-[var(--creator-assistant-text-dim)]">{label}</dt>
            <dd className="truncate text-[0.82rem] font-extrabold text-[var(--creator-assistant-text)]" title={value}>{value}</dd>
          </div>
        ))}
      </dl>
      <section data-slot="creator-command-examples" className={cn(commandInsetClass, 'mt-3 grid gap-2 p-3')} aria-label="可以这样说">
        <h3 className="text-[0.68rem] font-black text-[var(--creator-accent)]">可以这样说</h3>
        <div className="flex flex-wrap gap-2">
          {commandContext.examples.map(example => (
            <Button
              key={example}
              type="button"
              variant="outline"
              size="sm"
              data-slot="creator-command-example"
              className="h-auto min-h-8 whitespace-normal px-2.5 py-1.5 text-left text-xs"
              onClick={() => setQuery(example)}
            >
              {example}
            </Button>
          ))}
        </div>
      </section>
      <Input
        data-slot="creator-command-input"
        autoFocus
        aria-label="写作想法输入"
        value={query}
        onChange={event => setQuery(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Escape') onClose()
          if (event.key === 'Enter' && visibleCommands[0]) run(visibleCommands[0])
        }}
        className="mt-3 h-11 border-[var(--creator-assistant-panel-border)] bg-[var(--creator-assistant-input-bg)] text-[var(--creator-assistant-text)] placeholder:text-[var(--creator-assistant-text-dim)]"
        placeholder="直接说：补下一段、这段像说明书、追问人物动机、看影响..."
      />
      <section data-slot="creator-command-suggestion-group" className="mt-3 grid gap-2">
        <h3 className="text-[0.68rem] font-extrabold text-[var(--creator-assistant-text-dim)]">推荐写法</h3>
        <div data-slot="creator-command-suggestions" className="flex flex-wrap gap-2" aria-label="推荐写法">
          {commands.slice(0, 4).map(command => (
            <Button
              key={command.id}
              type="button"
              variant="outline"
              size="sm"
              data-slot="creator-command-suggestion"
              className="h-auto min-h-8 whitespace-normal px-2.5 py-1.5 text-xs"
              data-agent-action={command.agentAction}
              onClick={() => setQuery(command.label)}
            >
              {command.label}
            </Button>
          ))}
        </div>
      </section>
      <ul data-slot="creator-command-list" className="mt-3 grid gap-2" aria-label="可用创作动作">
        {visibleCommands.map(command => (
          <li key={command.id}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-slot="creator-command-item"
              className="h-auto min-h-[68px] w-full items-center justify-between gap-4 whitespace-normal rounded-lg p-3 text-left"
              data-agent-action={command.agentAction}
              onClick={() => run(command)}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[var(--creator-assistant-text)]">{command.label}</span>
                <span className="mt-1 block text-xs leading-5 text-[var(--creator-assistant-text-muted)]">{command.detail}</span>
              </span>
              <Badge variant="outline" className="shrink-0">{command.shortcut}</Badge>
            </Button>
          </li>
        ))}
        {!visibleCommands.length ? (
          <li data-slot="creator-command-empty" className={cn(commandInsetClass, 'border-dashed p-3')}>
            <p className="text-sm font-extrabold text-[var(--creator-assistant-text)]">没有匹配的写法。</p>
            <span className="mt-1 block text-xs leading-5 text-[var(--creator-assistant-text-dim)]">可以试试：补下一句、追问、分支、发布包确认。</span>
          </li>
        ) : null}
      </ul>
    </CreatorCommandCenterFrame>
  )
}
