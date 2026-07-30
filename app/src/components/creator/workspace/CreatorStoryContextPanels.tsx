import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const railCardClass =
  'border-[var(--creator-rail-border)] bg-[var(--creator-rail-bg)] text-[var(--creator-text)] [box-shadow:var(--creator-rail-shadow)]'
const panelClass =
  'rounded-2xl border border-[var(--creator-border)] bg-[var(--creator-editor-control)]'
const panelStrongClass =
  'rounded-2xl border border-[var(--creator-border-strong)] bg-[var(--creator-editor-control-strong)]'
const sessionRowClass =
  'grid h-auto w-full max-w-full min-w-0 gap-1 overflow-hidden whitespace-normal rounded-xl px-3 py-2.5 text-left'
const sessionTitleClass =
  'block min-w-0 truncate text-[0.84rem] font-black leading-[1.35] text-[var(--creator-editor-text)]'
const sessionDetailClass =
  'line-clamp-2 min-w-0 max-h-[2.4rem] text-[0.74rem] leading-[1.55] text-[var(--creator-text-muted)]'

export interface CreatorSessionRailItem {
  id: string
  title: string
  detail: string
  active?: boolean
  static?: boolean
  onSelect?: () => void
  agentAction?: 'open_draft'
  agentTarget?: string
}

export interface CreatorSessionRailGroup {
  id: string
  title: string
  items: CreatorSessionRailItem[]
  emptyLabel?: string
}

export interface CreatorSessionRailProps {
  title: string
  description: string
  actionLabel: string
  actionIcon?: ReactNode
  groups: CreatorSessionRailGroup[]
  onAction: () => void
  className?: string
}

export function CreatorSessionRail({
  title,
  description,
  actionLabel,
  actionIcon,
  groups,
  onAction,
  className,
}: CreatorSessionRailProps) {
  return (
    <Card data-slot="creator-session-panel" className={cn(railCardClass, className)} variant="default" padding="sm">
      <CardHeader className="p-0">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base text-[var(--creator-text)]">{title}</CardTitle>
            <CardDescription className="mt-1 text-xs text-[var(--creator-text-muted)]">
              {description}
            </CardDescription>
          </div>
          <Button type="button" variant="gold" size="sm" onClick={onAction}>
            {actionIcon}
            {actionLabel}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="mt-3 space-y-3 p-0">
        {groups.map(group => (
          <section key={group.id} className="grid gap-2" data-slot="creator-session-group">
            <div className="text-[0.72rem] font-black tracking-normal text-[var(--creator-text-dim)]" data-slot="creator-session-group-title">
              {group.title}
            </div>
            {group.items.length ? group.items.map(item => (
              item.static ? (
                <div key={item.id} className={sessionRowClass} data-slot="creator-session-row" data-static="true">
                  <strong className={sessionTitleClass}>{item.title}</strong>
                  <span className={sessionDetailClass}>{item.detail}</span>
                </div>
              ) : (
                <Button
                  key={item.id}
                  type="button"
                  variant={item.active ? 'gold' : 'outline'}
                  size="sm"
                  className={sessionRowClass}
                  data-slot="creator-session-row"
                  aria-pressed={item.active}
                  data-agent-action={item.agentAction}
                  data-agent-risk={item.agentAction ? 'low' : undefined}
                  data-agent-target={item.agentTarget}
                  onClick={item.onSelect}
                >
                  <strong className={sessionTitleClass}>{item.title}</strong>
                  <span className={sessionDetailClass}>{item.detail}</span>
                </Button>
              )
            )) : (
              <p className="text-[0.74rem] leading-[1.55] text-[var(--creator-text-muted)]" data-slot="creator-session-empty">
                {group.emptyLabel || '暂无内容。'}
              </p>
            )}
          </section>
        ))}
      </CardContent>
    </Card>
  )
}

export interface CreatorStoryMapItem {
  id: string
  icon: ReactNode
  label: string
  value: string
  detail: string
}

export interface CreatorStoryMapProps {
  title: string
  badgeLabel: string
  items: CreatorStoryMapItem[]
  className?: string
}

export function CreatorStoryMap({ title, badgeLabel, items, className }: CreatorStoryMapProps) {
  return (
    <Card data-slot="creator-story-map" className={cn(railCardClass, className)} variant="default" padding="sm">
      <CardHeader className="flex-row items-center justify-between gap-3 p-0">
        <div className="flex items-center gap-2">
          {items[0]?.icon ? <span className="text-[var(--creator-accent)]">{items[0].icon}</span> : null}
          <CardTitle className="text-base text-[var(--creator-text)]">{title}</CardTitle>
        </div>
        <Badge variant="outline">{badgeLabel}</Badge>
      </CardHeader>
      <CardContent className="mt-3 space-y-2 p-0">
        {items.map(row => (
          <section
            key={row.id}
            className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 rounded-xl border border-[var(--creator-rail-row-border)] bg-[var(--creator-rail-row-bg)] p-2.5"
            data-slot="creator-story-map-row"
          >
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--creator-border)] bg-[var(--creator-accent-soft)] text-[var(--creator-accent)]"
              data-slot="creator-story-map-icon"
            >
              {row.icon}
            </span>
            <span className="min-w-0">
              <span className="flex items-center justify-between gap-2">
                <strong className="text-[0.78rem] font-black text-[var(--creator-text)]">{row.label}</strong>
                <em className="min-w-0 truncate text-right text-[0.8rem] font-black not-italic text-[var(--creator-text)]">{row.value}</em>
              </span>
              <span className="mt-1.5 block text-[0.72rem] leading-[1.55] text-[var(--creator-text-muted)]">{row.detail}</span>
            </span>
          </section>
        ))}
      </CardContent>
    </Card>
  )
}

export interface CreatorReaderWishPanelProps {
  title: string
  statusLabel?: string
  statusVariant?: BadgeProps['variant']
  typeLabel?: string
  workTitle?: string
  requestText?: string
  heatValue?: string | number
  statusValue?: string
  submittedAt?: string
  anchorTitle?: string
  emptyTitle: string
  emptyDescription: string
  className?: string
}

export function CreatorReaderWishPanel({
  title,
  statusLabel,
  statusVariant = 'outline',
  typeLabel,
  workTitle,
  requestText,
  heatValue,
  statusValue,
  submittedAt,
  anchorTitle,
  emptyTitle,
  emptyDescription,
  className,
}: CreatorReaderWishPanelProps) {
  const hasWish = Boolean(requestText)

  return (
    <Card data-slot="creator-reader-wish-panel" className={cn(railCardClass, className)} variant="default" padding="sm">
      <CardHeader className="p-0">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[var(--creator-accent)]" />
          <CardTitle className="text-base text-[var(--creator-text)]">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="mt-3 p-0">
        {hasWish ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {statusLabel ? <Badge variant={statusVariant}>{statusLabel}</Badge> : null}
              {typeLabel ? <Badge variant="outline">{typeLabel}</Badge> : null}
            </div>
            {workTitle ? (
              <section className={cn(panelClass, 'p-3')}>
                <span className="text-xs font-bold text-[var(--creator-text-dim)]">来自作品</span>
                <strong className="mt-1 block text-base font-black text-[var(--creator-text)]">{workTitle}</strong>
              </section>
            ) : null}
            <section className={cn(panelStrongClass, 'p-3')}>
              <span className="text-xs font-bold text-[var(--creator-text-dim)]">读者想看的变化</span>
              <p className="mt-2 text-sm leading-6 text-[var(--creator-text-muted)]">{requestText}</p>
            </section>
            <div className="grid grid-cols-2 gap-3">
              <CreatorReaderWishMetric label="热度" value={heatValue ?? 0} detail="读者投票" />
              <CreatorReaderWishMetric label="状态" value={statusValue || statusLabel || '已收到'} />
            </div>
            {submittedAt ? (
              <p className="text-xs leading-5 text-[var(--creator-text-dim)]">提交时间：{submittedAt}</p>
            ) : null}
            {anchorTitle ? (
              <section className={cn(panelClass, 'p-3')}>
                <span className="text-xs font-bold text-[var(--creator-text-dim)]">请求挂点</span>
                <strong className="mt-1 block text-sm font-black text-[var(--creator-text)]">{anchorTitle}</strong>
              </section>
            ) : null}
          </div>
        ) : (
          <section className={cn(panelClass, 'p-4')}>
            <strong className="block text-sm font-black text-[var(--creator-text)]">{emptyTitle}</strong>
            <p className="mt-2 text-sm leading-6 text-[var(--creator-text-muted)]">{emptyDescription}</p>
          </section>
        )}
      </CardContent>
    </Card>
  )
}

function CreatorReaderWishMetric({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <section className={cn(panelClass, 'min-h-20 p-3')}>
      <span className="text-xs font-bold text-[var(--creator-text-dim)]">{label}</span>
      <strong className="mt-2 block text-lg font-black text-[var(--creator-text)]">{value}</strong>
      {detail ? <small className="mt-1 block text-xs text-[var(--creator-text-muted)]">{detail}</small> : null}
    </section>
  )
}
