import {
  ArrowRight,
  CircleAlert,
  HeartPulse,
  MessageSquareText,
  PackageCheck,
  PenLine,
  RefreshCw,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type CreatorTodayNextStepTone = 'echo' | 'draft' | 'publish'

export interface CreatorTodayNextStep {
  id: string
  tone: CreatorTodayNextStepTone
  priority?: 'primary' | 'normal' | 'muted'
  label: string
  title: string
  description: string
  meta: string
  actionLabel: string
  onAction: () => void
  disabled?: boolean
}

export interface CreatorTodayNextStepsPanelProps {
  phase: 'loading' | 'ready' | 'error'
  notice: string
  refreshing: boolean
  items: CreatorTodayNextStep[]
  onRefresh: () => void
}

const toneIcon = {
  echo: MessageSquareText,
  draft: PenLine,
  publish: PackageCheck,
}

const toneIconClass: Record<CreatorTodayNextStepTone, string> = {
  echo: 'border-[var(--creator-accent)] bg-[var(--creator-accent-soft)] text-[var(--creator-accent)]',
  draft: 'border-[var(--creator-border-strong)] bg-[var(--creator-surface)] text-[var(--creator-text-muted)]',
  publish: 'border-[var(--creator-confirm)] bg-[var(--creator-surface-strong)] text-[var(--creator-confirm)]',
}

const priorityClass: Record<NonNullable<CreatorTodayNextStep['priority']>, string> = {
  primary: 'bg-[var(--creator-surface-strong)]',
  normal: 'bg-transparent',
  muted: 'bg-[var(--creator-surface)] opacity-80',
}

export function CreatorTodayNextStepsPanel({
  phase,
  notice,
  refreshing,
  items,
  onRefresh,
}: CreatorTodayNextStepsPanelProps) {
  const busy = phase === 'loading' || refreshing

  return (
    <Card
      variant="glass"
      padding="none"
      data-slot="creator-today-next-steps-panel"
      className="overflow-hidden"
      role="region"
      aria-labelledby="creator-today-next-steps-title"
      aria-busy={busy}
    >
      <CardHeader data-slot="creator-today-next-steps-header" className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 max-[720px]:flex-col">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--creator-border)] bg-[var(--creator-accent-soft)] text-[var(--creator-accent)]">
                <HeartPulse size={17} aria-hidden="true" />
              </span>
              <CardTitle id="creator-today-next-steps-title" className="text-lg text-[var(--creator-text)]">
                今天最值得推进的 3 件事
              </CardTitle>
            </div>
            <CardDescription className="mt-3 max-w-2xl leading-6 text-[var(--creator-text-muted)]">
              {notice}
            </CardDescription>
          </div>
          <Button variant="outline" onClick={onRefresh} disabled={busy} className="shrink-0">
            <RefreshCw size={15} aria-hidden="true" />
            {busy ? '读取中...' : '刷新'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="border-t border-[var(--creator-border)] p-0">
        {phase === 'error' ? (
          <div className="border-b border-[var(--creator-border)] p-4 md:px-6">
            <Alert
              variant="destructive"
              data-slot="creator-today-next-steps-error"
              className="border-[var(--creator-danger)] bg-[var(--creator-surface)] text-[var(--creator-danger)]"
            >
              <CircleAlert size={16} aria-hidden="true" />
              <AlertTitle>写作线索读取失败</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-3 max-[720px]:items-start max-[720px]:flex-col">
                <p className="text-[var(--creator-text-muted)]">可以稍后重试；草稿箱内容不会丢失。</p>
                <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
                  重试
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        {items.length ? (
          <ol
            data-slot="creator-today-next-steps-list"
            className="grid divide-y divide-[var(--creator-border)] lg:grid-cols-3 lg:divide-x lg:divide-y-0"
          >
            {items.map(item => {
              const Icon = toneIcon[item.tone]
              const priority = item.priority || 'normal'
              return (
                <li
                  key={item.id}
                  data-slot="creator-today-next-step"
                  data-tone={item.tone}
                  data-priority={priority}
                  className={cn('grid min-w-0 content-between gap-5 p-5 lg:min-h-64 md:p-6', priorityClass[priority])}
                >
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border', toneIconClass[item.tone])}>
                        <Icon size={17} aria-hidden="true" />
                      </span>
                      <Badge variant={item.tone === 'publish' ? 'gold' : 'outline'}>{item.label}</Badge>
                    </div>
                    <h3 className="mt-4 text-base font-semibold leading-6 text-[var(--creator-text)]">{item.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--creator-text-muted)]">{item.description}</p>
                    <p className="mt-3 text-xs leading-5 text-[var(--creator-text-dim)]">{item.meta}</p>
                  </div>
                  <Button
                    data-slot="creator-today-next-step-action"
                    variant={item.tone === 'publish' && priority === 'primary' ? 'gold' : 'outline'}
                    onClick={item.onAction}
                    disabled={item.disabled || busy}
                    className="w-full justify-between whitespace-normal text-left"
                  >
                    <span>{busy ? '读取中...' : item.actionLabel}</span>
                    <ArrowRight size={15} className="shrink-0" aria-hidden="true" />
                  </Button>
                </li>
              )
            })}
          </ol>
        ) : (
          <div data-slot="creator-today-next-steps-empty" className="p-5 text-sm text-[var(--creator-text-muted)] md:p-6">
            还没有可推进的创作线索。
          </div>
        )}
      </CardContent>
    </Card>
  )
}
