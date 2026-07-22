import type { ReactNode } from 'react'
import { AlertCircle, Loader2, LockKeyhole, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LiquidGlass, LiquidGlassContent } from '@/components/ui/liquid-glass'

export type CreatorStateKind = 'loading' | 'empty' | 'error' | 'locked'

const stateIcon = {
  loading: Loader2,
  empty: PlusCircle,
  error: AlertCircle,
  locked: LockKeyhole,
}

export interface CreatorStatePanelProps {
  kind: CreatorStateKind
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  disabled?: boolean
  children?: ReactNode
}

export function CreatorStatePanel({
  kind,
  title,
  description,
  actionLabel,
  onAction,
  disabled,
  children,
}: CreatorStatePanelProps) {
  const Icon = stateIcon[kind]
  return (
    <LiquidGlass tone={kind === 'error' ? 'danger' : 'quiet'} depth="raised" className="creator-state-panel p-5">
      <LiquidGlassContent>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="creator-state-icon">
              <Icon size={18} className={kind === 'loading' ? 'animate-spin' : ''} />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-[var(--creator-text)]">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--creator-text-muted)]">{description}</p>
            </div>
          </div>
          {actionLabel ? (
            <Button variant="outline" onClick={onAction} disabled={disabled || !onAction}>
              {actionLabel}
            </Button>
          ) : null}
        </div>
        {children ? <div className="mt-4">{children}</div> : null}
      </LiquidGlassContent>
    </LiquidGlass>
  )
}
