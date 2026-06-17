import * as React from 'react'
import { cn } from '@/lib/utils'

interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'section' | 'article' | 'aside' | 'div'
  tone?: 'default' | 'muted' | 'gold' | 'cyan'
}

export function Panel({ as: Comp = 'section', tone = 'default', className, ...props }: PanelProps) {
  return (
    <Comp
      className={cn(
        tone === 'default' && 'pu-surface',
        tone === 'muted' && 'pu-surface-muted',
        tone === 'gold' && 'rounded-lg border border-[var(--pu-gold-500)]/28 bg-[var(--pu-gold-500)]/10',
        tone === 'cyan' && 'rounded-lg border border-[var(--pu-cyan-500)]/28 bg-[var(--pu-cyan-500)]/10',
        className,
      )}
      {...props}
    />
  )
}
