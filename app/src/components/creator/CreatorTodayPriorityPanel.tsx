import { ArrowRight, Compass, Wand2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface CreatorTodayFlowMetric {
  label: string
  value: string
  detail: string
  tone?: 'strong' | 'calm' | 'quiet'
}

export interface CreatorTodayFlowStep {
  label: string
  value: string
  detail: string
  state?: 'active' | 'ready' | 'waiting'
}

export interface CreatorTodayPriorityPanelProps {
  title: string
  description: string
  actionLabel: string
  onAction: () => void
  metrics?: CreatorTodayFlowMetric[]
  steps?: CreatorTodayFlowStep[]
  decisionRule?: string
  shortcutLabel?: string
  className?: string
}

const metricToneClass: Record<NonNullable<CreatorTodayFlowMetric['tone']>, string> = {
  strong: 'bg-[var(--creator-surface-strong)]',
  calm: 'bg-[var(--creator-accent-soft)]',
  quiet: 'bg-[var(--creator-surface)]',
}

const stepStateClass: Record<NonNullable<CreatorTodayFlowStep['state']>, string> = {
  active: 'border-[var(--creator-confirm)] bg-[var(--creator-surface-strong)]',
  ready: 'border-[var(--creator-accent)] bg-[var(--creator-accent-soft)]',
  waiting: 'border-[var(--creator-border)] bg-transparent',
}

export function CreatorTodayPriorityPanel({
  title,
  description,
  actionLabel,
  onAction,
  metrics = [],
  steps = [],
  decisionRule,
  shortcutLabel = 'Tab 续句 · ⌘K 改写',
  className,
}: CreatorTodayPriorityPanelProps) {
  return (
    <Card
      variant="glass"
      padding="none"
      data-slot="creator-today-priority-panel"
      className={cn('overflow-hidden', className)}
      aria-label="今日写作判断"
    >
      <CardHeader data-slot="creator-today-header" className="p-5 pb-4 md:p-6 md:pb-5">
        <div className="flex items-start justify-between gap-4 max-[720px]:flex-col">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--creator-border)] bg-[var(--creator-accent-soft)] text-[var(--creator-accent)]">
                <Compass size={17} aria-hidden="true" />
              </span>
              <CardTitle className="text-lg text-[var(--creator-text)]">今日写作判断</CardTitle>
            </div>
            <CardDescription className="mt-3 max-w-2xl leading-6 text-[var(--creator-text-muted)]">
              先确定最值得回应的一步，再沿着外界回声、正文、发布包继续推进。
            </CardDescription>
          </div>
          <Badge variant="gold" className="shrink-0">{shortcutLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent
        data-slot="creator-today-content"
        className="grid gap-5 border-t border-[var(--creator-border)] p-5 md:p-6"
      >
        <section
          data-slot="creator-today-focus"
          className="grid items-stretch gap-4 border-l-2 border-[var(--creator-accent)] pl-4 lg:grid-cols-[minmax(0,1fr)_minmax(164px,220px)]"
          aria-label="现在先做"
        >
          <div className="min-w-0 self-center">
            <div className="flex items-center gap-2">
              <Wand2 size={15} className="text-[var(--creator-accent)]" aria-hidden="true" />
              <Badge variant="outline">现在先做</Badge>
            </div>
            <p className="mt-3 text-base font-semibold leading-6 text-[var(--creator-text)]">{title}</p>
            <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-[var(--creator-text-muted)]">{description}</p>
          </div>
          <Button
            variant="gold"
            onClick={onAction}
            data-slot="creator-today-primary-action"
            className="min-h-12 w-full justify-between self-stretch whitespace-normal px-4 text-left"
          >
            <span>{actionLabel}</span>
            <ArrowRight size={16} className="shrink-0" aria-hidden="true" />
          </Button>
        </section>
        {decisionRule ? (
          <p
            data-slot="creator-today-decision-rule"
            className="border-l-2 border-[var(--creator-confirm)] bg-[var(--creator-surface)] px-4 py-3 text-sm leading-6 text-[var(--creator-text-muted)]"
          >
            <span className="font-semibold text-[var(--creator-text)]">判断顺序：</span>
            {decisionRule}
          </p>
        ) : null}
        {metrics.length ? (
          <section data-slot="creator-today-metrics" aria-label="今日判断依据">
            <p className="mb-2 text-xs font-semibold text-[var(--creator-text-dim)]">今日判断依据</p>
            <dl className="grid overflow-hidden rounded-lg border border-[var(--creator-border)] sm:grid-cols-3">
              {metrics.map(metric => {
                const tone = metric.tone || 'quiet'
                return (
                  <div
                    key={metric.label}
                    data-slot="creator-today-metric"
                    data-tone={tone}
                    className={cn(
                      'grid min-w-0 gap-1 border-t border-[var(--creator-border)] p-3 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0',
                      metricToneClass[tone],
                    )}
                  >
                    <dt className="text-xs font-semibold text-[var(--creator-text-dim)]">{metric.label}</dt>
                    <dd className="truncate text-sm font-semibold leading-5 text-[var(--creator-text)]">{metric.value}</dd>
                    <dd className="line-clamp-2 text-xs leading-5 text-[var(--creator-text-muted)]">{metric.detail}</dd>
                  </div>
                )
              })}
            </dl>
          </section>
        ) : null}
        {steps.length ? (
          <section data-slot="creator-today-route" aria-label="今日写作路线">
            <p className="mb-2 text-xs font-semibold text-[var(--creator-text-dim)]">今日写作路线</p>
            <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {steps.map((step, index) => {
                const state = step.state || 'waiting'
                return (
                  <li
                    key={step.label}
                    data-slot="creator-today-route-step"
                    data-state={state}
                    className={cn('grid min-h-28 min-w-0 content-start gap-2 border-l-2 px-3 py-2', stepStateClass[state])}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={state === 'active' ? 'gold' : 'outline'}>{index + 1}</Badge>
                      <span className="text-xs font-semibold text-[var(--creator-text-dim)]">{step.label}</span>
                    </div>
                    <p className="line-clamp-2 text-sm font-semibold leading-5 text-[var(--creator-text)]">{step.value}</p>
                    <p className="line-clamp-2 text-xs leading-5 text-[var(--creator-text-muted)]">{step.detail}</p>
                  </li>
                )
              })}
            </ol>
          </section>
        ) : null}
      </CardContent>
    </Card>
  )
}
