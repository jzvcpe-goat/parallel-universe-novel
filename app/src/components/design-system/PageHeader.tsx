import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  tags?: string[]
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ eyebrow, title, description, tags = [], actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-4 rounded-lg border border-[var(--pu-line-700)] bg-[var(--pu-panel-900)]/72 p-5 md:flex-row md:items-end md:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--pu-ink-650)]">{eyebrow}</p> : null}
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[var(--pu-ink-100)] md:text-5xl">{title}</h1>
        {description ? <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--pu-ink-500)]">{description}</p> : null}
        {tags.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <Badge key={tag} variant={index === 0 ? 'gold' : 'outline'}>{tag}</Badge>
            ))}
          </div>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  )
}
