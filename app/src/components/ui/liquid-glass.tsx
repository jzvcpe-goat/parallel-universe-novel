import * as React from 'react'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const liquidGlassVariants = cva(
  [
    'pu-liquid-glass relative overflow-hidden border text-[var(--pu-ink-100)]',
    'transition-[border-color,box-shadow,transform,background] duration-200',
  ].join(' '),
  {
    variants: {
      tone: {
        default: '',
        quiet: 'pu-liquid-glass-quiet',
        cyan: 'pu-liquid-glass-cyan',
        gold: 'pu-liquid-glass-gold',
        danger: 'pu-liquid-glass-danger',
        paper: 'pu-liquid-glass-paper',
      },
      depth: {
        flat: 'pu-liquid-depth-flat',
        raised: 'pu-liquid-depth-raised',
        floating: 'pu-liquid-depth-floating',
      },
      radius: {
        sm: 'rounded-md',
        md: 'rounded-lg',
        lg: 'rounded-[10px]',
      },
      padding: {
        none: '',
        sm: 'p-4',
        md: 'p-5',
        lg: 'p-6',
      },
      interactive: {
        true: 'pu-liquid-interactive cursor-pointer',
        false: '',
      },
      motion: {
        none: '',
        reveal: 'pu-motion-reveal',
        drift: 'pu-motion-drift',
        pulse: 'pu-motion-pulse',
      },
    },
    defaultVariants: {
      tone: 'default',
      depth: 'raised',
      radius: 'md',
      padding: 'none',
      interactive: false,
      motion: 'none',
    },
  },
)

type LiquidGlassElement = 'section' | 'article' | 'aside' | 'div' | 'header' | 'footer' | 'nav'

export interface LiquidGlassProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof liquidGlassVariants> {
  as?: LiquidGlassElement
}

export function LiquidGlass({
  as: Comp = 'div',
  tone,
  depth,
  radius,
  padding,
  interactive,
  motion,
  className,
  ...props
}: LiquidGlassProps) {
  return (
    <Comp
      className={cn(liquidGlassVariants({ tone, depth, radius, padding, interactive, motion, className }))}
      {...props}
    />
  )
}

export function LiquidGlassHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('relative z-[1] flex flex-col gap-2 pb-4', className)} {...props} />
}

export function LiquidGlassTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('font-space text-xl font-semibold text-[var(--pu-ink-100)]', className)} {...props} />
}

export function LiquidGlassDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm leading-6 text-[var(--pu-ink-500)]', className)} {...props} />
}

export function LiquidGlassContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('relative z-[1]', className)} {...props} />
}

export function LiquidGlassFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('relative z-[1] mt-4 flex items-center border-t border-white/10 pt-4', className)}
      {...props}
    />
  )
}

export interface LiquidGlassMetricProps
  extends React.HTMLAttributes<HTMLDivElement>,
    Pick<VariantProps<typeof liquidGlassVariants>, 'tone' | 'depth' | 'motion'> {
  label: string
  value: React.ReactNode
  detail?: React.ReactNode
  valueVariant?: 'metric' | 'label'
}

export function LiquidGlassMetric({
  label,
  value,
  detail,
  valueVariant = 'metric',
  tone = 'quiet',
  depth = 'flat',
  motion = 'none',
  className,
  ...props
}: LiquidGlassMetricProps) {
  return (
    <LiquidGlass tone={tone} depth={depth} motion={motion} padding="sm" className={cn('min-w-0', className)} {...props}>
      <LiquidGlassContent>
        <p
          className={cn(
            'font-semibold text-[var(--liquid-metric-value,var(--foreground))]',
            valueVariant === 'metric'
              ? 'truncate text-2xl'
              : 'text-base leading-6 break-words',
          )}
        >
          {value}
        </p>
        <p className="mt-1 text-xs font-medium text-[var(--liquid-metric-label,var(--muted-foreground))]">{label}</p>
        {detail ? <p className="mt-2 text-xs leading-5 text-[var(--liquid-metric-detail,var(--muted-foreground))]">{detail}</p> : null}
      </LiquidGlassContent>
    </LiquidGlass>
  )
}
