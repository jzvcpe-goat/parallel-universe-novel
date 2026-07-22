import { Radio } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export interface CreatorTodayEchoStatusPanelProps {
  phase: 'loading' | 'ready' | 'error'
  pending: number
  inProgress: number
  published: number
  rejected: number
}

export function CreatorTodayEchoStatusPanel({
  phase,
  pending,
  inProgress,
  published,
  rejected,
}: CreatorTodayEchoStatusPanelProps) {
  const metrics = [
    {
      id: 'waiting',
      label: '等待判断',
      value: pending,
      detail: '尚未决定是否转为创作方向。',
    },
    {
      id: 'writing',
      label: '进入创作',
      value: inProgress,
      detail: '已经看过，或正在写成正文。',
    },
    {
      id: 'answered',
      label: '公开回应',
      value: published,
      detail: '已经通过章节或支线更新。',
    },
  ]
  const phaseLabel = phase === 'loading'
    ? '正在读取'
    : phase === 'error'
      ? '暂时不可用'
      : `暂不采用 ${rejected} 条`

  return (
    <Card
      variant="glass"
      padding="none"
      data-slot="creator-today-echo-status-panel"
      data-state={phase}
      className="pu-motion-reveal overflow-hidden"
      aria-labelledby="creator-today-echo-status-title"
      aria-busy={phase === 'loading'}
    >
      <CardHeader data-slot="creator-today-echo-status-header" className="p-5 pb-4 md:p-6 md:pb-5">
        <div className="flex items-start justify-between gap-4 max-[560px]:flex-col">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--creator-border)] bg-[var(--creator-accent-soft)] text-[var(--creator-accent)]">
              <Radio size={17} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <CardTitle id="creator-today-echo-status-title" className="text-lg text-[var(--creator-text)]">
                回声走向
              </CardTitle>
              <CardDescription className="mt-2 max-w-3xl leading-6 text-[var(--creator-text-muted)]">
                看清哪些反馈仍在等待判断、已经进入创作，哪些已在公开内容里得到回应。
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            data-slot="creator-today-echo-status-phase"
            className="shrink-0"
            aria-live="polite"
          >
            {phaseLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="border-t border-[var(--creator-border)] p-0">
        <dl
          data-slot="creator-today-echo-status-metrics"
          className="grid md:grid-cols-3"
          aria-label="外界回声走向"
        >
          {metrics.map(metric => (
            <div
              key={metric.id}
              data-slot="creator-today-echo-status-metric"
              className="grid min-w-0 gap-1 border-t border-[var(--creator-border)] bg-[var(--creator-surface)] p-4 first:border-t-0 md:border-l md:border-t-0 md:p-5 md:first:border-l-0"
            >
              <dt className="text-xs font-semibold text-[var(--creator-text-dim)]">{metric.label}</dt>
              <dd
                data-slot="creator-today-echo-status-value"
                className="text-2xl font-semibold leading-8 text-[var(--creator-text)]"
              >
                {phase === 'loading' ? '—' : metric.value}
              </dd>
              <dd className="text-xs leading-5 text-[var(--creator-text-muted)]">
                {phase === 'error' ? '这次读取没有完成，本机创作内容不受影响。' : metric.detail}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
