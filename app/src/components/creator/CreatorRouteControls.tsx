import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LiquidGlassMetric } from '@/components/ui/liquid-glass'

export type CreatorSelectOption<T extends string> = {
  value: T
  label: string
}

export function CreatorSelect<T extends string>({
  value,
  onValueChange,
  options,
  placeholder,
  className,
}: {
  value: T
  onValueChange: (value: T) => void
  options: CreatorSelectOption<T>[]
  placeholder?: string
  className?: string
}) {
  return (
    <Select value={value} onValueChange={nextValue => onValueChange(nextValue as T)}>
      <SelectTrigger className={className || 'h-10 border-[var(--creator-border)] bg-[var(--creator-surface)] text-[var(--creator-text)]'}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="border-[var(--creator-border)] bg-[var(--creator-surface-strong)] text-[var(--creator-text)]">
        {options.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function MetricCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  const isMetricValue = typeof value === 'number' || /^[\d.,%kK万+/\s-]+$/.test(String(value))
  return (
    <LiquidGlassMetric
      label={label}
      value={value}
      detail={detail}
      valueVariant={isMetricValue ? 'metric' : 'label'}
      className="pu-motion-lift"
    />
  )
}
