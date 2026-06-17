import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type SettingCardSource = 'manual' | 'template' | 'derived'

interface SettingCardProps {
  title: string
  description: string
  source: SettingCardSource
  items?: string[]
  className?: string
}

const sourceLabel: Record<SettingCardSource, string> = {
  manual: '需要你确认',
  template: '平台预置',
  derived: '已从正文沉淀',
}

export function SettingCard({ title, description, source, items = [], className }: SettingCardProps) {
  return (
    <article className={cn('rounded-lg border border-[var(--pu-line-700)] bg-[var(--pu-panel-900)]/78 p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-[var(--pu-ink-100)]">{title}</h3>
        <Badge variant={source === 'manual' ? 'gold' : source === 'template' ? 'stasis' : 'outline'}>{sourceLabel[source]}</Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--pu-ink-500)]">{description}</p>
      {items.length ? (
        <ul className="mt-4 space-y-2 text-sm text-[var(--pu-ink-300)]">
          {items.map(item => <li key={item}>• {item}</li>)}
        </ul>
      ) : null}
    </article>
  )
}
