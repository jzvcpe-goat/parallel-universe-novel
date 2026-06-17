import { ArrowRight, BookOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BookCardProps {
  title: string
  genre: string
  hook: string
  cover?: string
  reads?: string
  choices?: number
  status?: 'flagship' | 'template' | 'updated' | 'locked'
  ctaLabel?: string
  onOpen?: () => void
  className?: string
}

export function BookCard({
  title,
  genre,
  hook,
  cover,
  reads,
  choices,
  status = 'template',
  ctaLabel = '开始阅读',
  onOpen,
  className,
}: BookCardProps) {
  return (
    <article className={cn('grid gap-4 rounded-lg border border-[var(--pu-line-700)] bg-[var(--pu-panel-900)]/78 p-4 md:grid-cols-[112px_minmax(0,1fr)]', className)}>
      <div className="aspect-[3/4] overflow-hidden rounded-lg border border-[var(--pu-line-700)] bg-[var(--pu-void-950)]">
        {cover ? <img src={cover} alt={`${title} 封面`} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[var(--pu-cyan-500)]"><BookOpen /></div>}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status === 'flagship' ? 'gold' : status === 'updated' ? 'stasis' : status === 'locked' ? 'secondary' : 'outline'}>{genre}</Badge>
          {choices ? <Badge variant="secondary">{choices} 个选择</Badge> : null}
        </div>
        <h3 className="mt-3 truncate text-xl font-semibold text-[var(--pu-ink-100)]">{title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--pu-ink-500)]">{hook}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[var(--pu-ink-650)]">{reads ? `${reads} 阅读` : '可试读'}</span>
          <Button size="sm" variant={status === 'flagship' ? 'gold' : 'outline'} onClick={onOpen}>
            {ctaLabel}
            <ArrowRight size={14} />
          </Button>
        </div>
      </div>
    </article>
  )
}
