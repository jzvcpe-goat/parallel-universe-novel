import { Sparkles, Wand2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface CreatorEchoChip {
  label: string
  value: string
}

export interface CreatorEchoBriefItem {
  label: string
  value: string
}

export interface CreatorEchoNextAction {
  intentLabel: string
  readerQuote: string
  priorityReason: string
  chips: CreatorEchoChip[]
  writingBrief: CreatorEchoBriefItem[]
}

export interface CreatorEchoDecisionCard {
  label: string
  title: string
  body: string
  tone?: 'strong' | 'calm' | 'quiet'
}

export interface CreatorEchoNextActionPanelProps {
  action: CreatorEchoNextAction | null
  clusterCount: number
  isSelected: boolean
  onSelect: () => void
  onStart: () => void
  onCluster: () => void
  className?: string
}

export interface CreatorEchoDecisionPanelProps {
  cards: CreatorEchoDecisionCard[] | null
  clusterCount: number
  onStart: () => void
  onCluster: () => void
  className?: string
}

const echoNextActionSemantics = ['作者一问', '可写场景', '马上做'] as const
const echoDecisionSemantics = ['读者原话', '作者一问', '可写场景', '动笔判断', '相近请求'] as const

export function CreatorEchoNextActionPanel({
  action,
  clusterCount,
  isSelected,
  onSelect,
  onStart,
  onCluster,
  className,
}: CreatorEchoNextActionPanelProps) {
  if (!action) {
    return (
      <Card
        variant="default"
        padding="md"
        data-slot="creator-echo-next-action"
        data-state="empty"
        className={cn(
          'rounded-md border-[var(--creator-border)] bg-[var(--creator-surface)] text-[var(--creator-text)]',
          className,
        )}
      >
        <CardHeader className="pb-0">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[var(--creator-accent)]" aria-hidden="true" />
            <Badge variant="outline">今天先写</Badge>
          </div>
          <CardTitle className="text-lg text-[var(--creator-text)]">等待新的读者愿望</CardTitle>
          <CardDescription className="max-w-2xl leading-6 text-[var(--creator-text-muted)]">
            当前没有可处理回声。可以刷新，或回到作品结构里主动选择一条线推进。
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card
      variant="default"
      padding="none"
      data-slot="creator-echo-next-action"
      data-state="ready"
      className={cn(
        'overflow-hidden rounded-md border-[var(--creator-border-strong)] bg-[var(--creator-surface)] text-[var(--creator-text)]',
        className,
      )}
    >
      <CardHeader data-slot="creator-echo-next-action-header" className="p-4 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[var(--creator-accent)]" aria-hidden="true" />
            <Badge variant="gold">今天先写</Badge>
          </div>
          <span className="text-xs font-semibold leading-5 text-[var(--creator-text-dim)]">
            {action.priorityReason}
          </span>
        </div>
        <CardTitle className="text-lg leading-7 text-[var(--creator-text)]">{action.intentLabel}</CardTitle>
      </CardHeader>

      <CardContent className="grid gap-4 px-4 pb-4">
        <figure
          data-slot="creator-echo-next-action-quote"
          className="border-l-2 border-[var(--creator-confirm)] pl-3"
        >
          <figcaption className="text-xs font-bold text-[var(--creator-confirm)]">读者原话</figcaption>
          <blockquote className="mt-1 text-sm leading-6 text-[var(--creator-text)]">
            “{action.readerQuote}”
          </blockquote>
        </figure>

        <dl
          data-slot="creator-echo-next-action-context"
          className="grid gap-2 sm:grid-cols-3"
          aria-label="当前回声上下文"
        >
          {action.chips.map(chip => (
            <div
              key={chip.label}
              className="min-w-0 rounded-md border border-[var(--creator-border)] bg-[var(--creator-surface-strong)] p-3"
            >
              <dt className="text-xs font-semibold text-[var(--creator-text-dim)]">{chip.label}</dt>
              <dd className="mt-1 truncate text-sm font-bold text-[var(--creator-text)]" title={chip.value}>
                {chip.value}
              </dd>
            </div>
          ))}
        </dl>

        <ol
          data-slot="creator-echo-next-action-path"
          className="grid gap-2 lg:grid-cols-3"
          aria-label={`写作判断：${echoNextActionSemantics.join(' / ')}`}
        >
          {action.writingBrief.map((item, index) => (
            <li
              key={item.label}
              className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] gap-2 rounded-md border border-[var(--creator-border)] bg-[var(--creator-surface-strong)] p-3"
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--creator-accent-soft)] text-xs font-bold text-[var(--creator-accent)]"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <span className="min-w-0">
                <small className="block text-xs font-bold text-[var(--creator-text-dim)]">{item.label}</small>
                <b className="mt-1 block text-sm leading-6 text-[var(--creator-text)]">{item.value}</b>
              </span>
            </li>
          ))}
        </ol>
      </CardContent>

      <CardFooter
        data-slot="creator-echo-next-action-actions"
        className="m-0 grid gap-3 border-[var(--creator-border)] bg-[var(--creator-surface-strong)] p-4 lg:grid-cols-[minmax(0,1fr)_minmax(25rem,auto)]"
      >
        <div className="min-w-0">
          <span className="text-xs font-bold text-[var(--creator-text-dim)]">下一步</span>
          <strong className="mt-1 block text-sm text-[var(--creator-text)]">带着这一问进入正文</strong>
          <p className="mt-1 text-xs leading-5 text-[var(--creator-text-muted)]">只打开写作台，正文仍由作者确认。</p>
        </div>
        <div className="grid w-full gap-2 sm:grid-cols-3">
          <Button type="button" className="w-full" variant="gold" onClick={onStart}>
            <Wand2 size={15} aria-hidden="true" />
            带着这一问去写
          </Button>
          <Button type="button" className="w-full" variant="outline" onClick={onCluster} disabled={clusterCount <= 1}>
            只看同类回声
          </Button>
          <Button type="button" className="w-full" variant="ghost" onClick={onSelect} disabled={isSelected}>
            {isSelected ? '已选中' : '选中这条'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

export function CreatorEchoDecisionPanel({
  cards,
  clusterCount,
  onStart,
  onCluster,
  className,
}: CreatorEchoDecisionPanelProps) {
  if (!cards) {
    return (
      <Card variant="glass" padding="sm" className={cn('creator-echo-decision-panel', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--creator-accent)]" />
            <CardTitle className="text-base text-[var(--creator-text)]">动笔前判断</CardTitle>
          </div>
          <CardDescription className="text-[var(--creator-text-muted)]">
            选中请求后，这里会把读者愿望、可写场景和作者需要决定的问题放到一起。
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card variant="glass" padding="sm" className={cn('creator-echo-decision-panel', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[var(--creator-accent)]" />
          <CardTitle className="text-base text-[var(--creator-text)]">动笔前判断</CardTitle>
        </div>
        <CardDescription className="text-[var(--creator-text-muted)]">
          先把读者愿望变成一个作者问题，再进入正文。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="creator-echo-decision-stack" aria-label={`动笔前判断：${echoDecisionSemantics.join(' / ')}`}>
          {cards.map(card => (
            <div key={card.label} className={`creator-echo-decision-card ${card.tone || 'quiet'}`}>
              <span>{card.label}</span>
              <strong>{card.title}</strong>
              <p>{card.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2">
          <Button variant="gold" onClick={onStart}>
            <Wand2 size={15} />
            带着这一问去写
          </Button>
          <Button variant="outline" onClick={onCluster} disabled={clusterCount <= 1}>
            只看同类回声
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
