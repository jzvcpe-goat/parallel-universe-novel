import type { ReactNode } from 'react'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { cn } from '@/lib/utils'

export interface CreatorActionBarProps {
  children: ReactNode
  className?: string
}

export function CreatorActionBar({ children, className }: CreatorActionBarProps) {
  return (
    <LiquidGlass tone="quiet" depth="flat" className={cn('creator-action-bar flex flex-wrap items-center gap-2 p-3', className)}>
      {children}
    </LiquidGlass>
  )
}
