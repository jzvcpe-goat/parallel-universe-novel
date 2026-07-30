import { ArrowRight, ListFilter } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export interface CreatorTodayPathItem {
  id: string
  label: string
  title: string
  value: string | number
  detail: string
  actionLabel: string
  disabled?: boolean
  onAction: () => void
}

export interface CreatorTodayPathPanelProps {
  items: CreatorTodayPathItem[]
  busy?: boolean
}

export function CreatorTodayPathPanel({ items, busy = false }: CreatorTodayPathPanelProps) {
  return (
    <Card
      variant="glass"
      padding="none"
      data-slot="creator-today-path-panel"
      className="pu-motion-reveal overflow-hidden"
      aria-labelledby="creator-today-path-title"
      aria-busy={busy}
    >
      <CardHeader data-slot="creator-today-path-header" className="p-5 pb-4 md:p-6 md:pb-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--creator-border)] bg-[var(--creator-accent-soft)] text-[var(--creator-accent)]">
            <ListFilter size={17} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <CardTitle id="creator-today-path-title" className="text-lg text-[var(--creator-text)]">
              今日创作路径
            </CardTitle>
            <CardDescription className="mt-2 max-w-3xl leading-6 text-[var(--creator-text-muted)]">
              从外界回声、私密草稿、发布包和作品结构中，找到今天的下一步。
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="border-t border-[var(--creator-border)] p-0">
        <ol data-slot="creator-today-path-list" className="grid md:grid-cols-2 xl:grid-cols-4">
          {items.map(item => (
            <li
              key={item.id}
              data-slot="creator-today-path-item"
              className="flex min-w-0 flex-col gap-3 border-t border-[var(--creator-border)] p-4 first:border-t-0 md:p-5 md:[&:nth-child(2)]:border-t-0 md:[&:nth-child(2n)]:border-l xl:border-l xl:border-t-0 xl:first:border-l-0"
            >
              <div className="flex items-start justify-between gap-3">
                <Badge variant="outline">{item.label}</Badge>
                <span
                  data-slot="creator-today-path-value"
                  className="shrink-0 text-2xl font-semibold leading-7 text-[var(--creator-text)]"
                >
                  {item.value}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold leading-5 text-[var(--creator-text)]">{item.title}</h3>
                <p className="mt-1 text-xs leading-5 text-[var(--creator-text-muted)]">{item.detail}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={item.disabled}
                onClick={item.onAction}
                data-slot="creator-today-path-action"
                className="min-h-10 w-full justify-between"
              >
                <span>{item.actionLabel}</span>
                <ArrowRight size={14} aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
