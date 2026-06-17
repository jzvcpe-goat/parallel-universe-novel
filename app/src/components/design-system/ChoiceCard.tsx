import { ArrowRight, GitBranch } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ChoiceCardProps {
  title: string
  consequence: string
  tensionDelta?: number
  status?: 'recommended' | 'danger' | 'quiet'
  selected?: boolean
  note?: string
  ctaLabel?: string
  testId?: string
  onChoose?: () => void
  className?: string
}

export function ChoiceCard({
  title,
  consequence,
  tensionDelta,
  status = 'quiet',
  selected = false,
  note,
  ctaLabel = '写入我的世界线',
  testId,
  onChoose,
  className,
}: ChoiceCardProps) {
  const badgeVariant = status === 'recommended' ? 'gold' : status === 'danger' ? 'collapse' : 'outline'
  const Comp = onChoose ? 'button' : 'article'
  return (
    <Comp
      type={onChoose ? 'button' : undefined}
      data-testid={testId}
      onClick={onChoose}
      className={cn(
        'w-full rounded-lg border bg-[var(--pu-panel-900)]/78 p-4 text-left transition-all duration-200',
        selected
          ? 'border-[var(--pu-gold-500)]/70 bg-[var(--pu-gold-500)]/10 shadow-[var(--pu-shadow-gold)]'
          : 'border-[var(--pu-line-700)] hover:border-[var(--pu-cyan-500)]/45 hover:bg-[var(--pu-cyan-500)]/7',
        onChoose && 'cursor-pointer',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <GitBranch size={16} className="text-[var(--pu-cyan-500)]" />
          <h3 className="text-base font-semibold text-[var(--pu-ink-100)]">{title}</h3>
        </div>
        {typeof tensionDelta === 'number' ? <Badge variant={badgeVariant}>{tensionDelta > 0 ? `+${tensionDelta}` : tensionDelta}</Badge> : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--pu-ink-500)]">{consequence}</p>
      {note ? <p className="mt-3 text-xs leading-5 text-[var(--pu-ink-650)]">{note}</p> : null}
      {onChoose ? (
        <span className="mt-4 flex items-center justify-between border-t border-[var(--pu-line-700)]/70 pt-3 text-xs font-semibold text-[var(--pu-cyan-500)]">
          {selected ? '已选择' : ctaLabel}
          <ArrowRight size={15} />
        </span>
      ) : null}
    </Comp>
  )
}
