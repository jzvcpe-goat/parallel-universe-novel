import { CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PlanCardProps {
  name: string
  price: string
  description: string
  features: string[]
  highlighted?: boolean
  badge?: string
  cta?: string
  buttonVariant?: ButtonProps['variant']
  disabled?: boolean
  loading?: boolean
  testId?: string
  onSelect?: () => void
  className?: string
}

export function PlanCard({
  name,
  price,
  description,
  features,
  highlighted,
  badge,
  cta = '选择方案',
  buttonVariant,
  disabled,
  loading,
  testId,
  onSelect,
  className,
}: PlanCardProps) {
  return (
    <article className={cn('rounded-lg border bg-[var(--pu-panel-900)]/78 p-5', highlighted ? 'border-[var(--pu-gold-500)]/45 shadow-[var(--pu-shadow-gold)]' : 'border-[var(--pu-line-700)]', className)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-[var(--pu-ink-100)]">{name}</h3>
        {badge || highlighted ? <Badge variant={highlighted ? 'gold' : 'outline'}>{badge || '推荐'}</Badge> : null}
      </div>
      <p className="mt-2 text-sm text-[var(--pu-ink-500)]">{description}</p>
      <p className="mt-5 text-3xl font-bold text-[var(--pu-ink-100)]">{price}</p>
      <ul className="mt-5 space-y-3 text-sm text-[var(--pu-ink-300)]">
        {features.map(feature => (
          <li key={feature} className="flex gap-2">
            <CheckCircle2 size={16} className="mt-0.5 text-[var(--pu-teal-500)]" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        className="mt-6 w-full"
        variant={buttonVariant || (highlighted ? 'gold' : 'outline')}
        disabled={disabled}
        loading={loading}
        data-testid={testId}
        onClick={onSelect}
      >
        {cta}
      </Button>
    </article>
  )
}
