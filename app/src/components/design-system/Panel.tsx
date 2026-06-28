import * as React from 'react'
import { cn } from '@/lib/utils'
import { LiquidGlass } from '@/components/ui/liquid-glass'

interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'section' | 'article' | 'aside' | 'div'
  tone?: 'default' | 'muted' | 'gold' | 'cyan'
}

export function Panel({ as: Comp = 'section', tone = 'default', className, ...props }: PanelProps) {
  return (
    <LiquidGlass
      as={Comp}
      tone={tone === 'muted' ? 'quiet' : tone}
      depth={tone === 'muted' ? 'flat' : 'raised'}
      className={cn(className)}
      {...props}
    />
  )
}
