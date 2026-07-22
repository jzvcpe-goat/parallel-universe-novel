import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface CreatorEchoStatusRow {
  label: string
  value: number
}

export interface CreatorEchoStatusStripProps {
  rows: CreatorEchoStatusRow[]
  visibleCount: number
  totalCount: number
  sortLabel: string
  overviewLabel?: string
  metaLabel?: string
  visibleLabel?: string
  className?: string
}

export function CreatorEchoStatusStrip({
  rows,
  visibleCount,
  totalCount,
  sortLabel,
  overviewLabel = '外界回声概况',
  metaLabel = '当前回声视图',
  visibleLabel = '当前显示',
  className,
}: CreatorEchoStatusStripProps) {
  return (
    <Card
      variant="glass"
      padding="sm"
      data-slot="creator-echo-status-strip"
      className={cn('mt-4', className)}
    >
      <CardContent
        data-slot="creator-echo-status-content"
        className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center"
      >
        <div
          data-slot="creator-echo-status-grid"
          className="grid grid-cols-2 gap-2 sm:grid-cols-5 xl:flex-1"
          aria-label={overviewLabel}
        >
          {rows.map(row => (
            <span
              key={row.label}
              data-slot="creator-echo-status-chip"
              className="min-w-0 rounded-xl border border-[color-mix(in_oklab,var(--creator-border)_84%,transparent)] bg-[color-mix(in_oklab,var(--creator-surface-strong)_86%,transparent)] px-[0.72rem] py-[0.58rem]"
            >
              <small className="block text-[0.68rem] font-[800] text-[var(--creator-text-dim)]">{row.label}</small>
              <b className="mt-[0.14rem] block text-base font-black leading-[1.2] text-[var(--creator-text)]">{row.value}</b>
            </span>
          ))}
        </div>
        <div data-slot="creator-echo-status-meta" className="flex flex-wrap gap-2" aria-label={metaLabel}>
          <Badge variant="outline">{visibleLabel} {visibleCount} / {totalCount}</Badge>
          <Badge variant="outline">{sortLabel}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}
