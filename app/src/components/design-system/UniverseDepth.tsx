import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type UniverseDepthVariant = 'reader' | 'story' | 'creator'

interface UniverseDepthProps extends HTMLAttributes<HTMLDivElement> {
  variant?: UniverseDepthVariant
  children: ReactNode
  orbit?: boolean
}

export function UniverseDepth({
  variant = 'reader',
  orbit = true,
  className,
  children,
  ...props
}: UniverseDepthProps) {
  return (
    <div
      className={cn('pu-depth-stage', `pu-depth-stage-${variant}`, className)}
      {...props}
    >
      {orbit ? <div className="pu-orbit-field" aria-hidden="true" /> : null}
      {children}
    </div>
  )
}

interface WorldlineConstellationProps extends HTMLAttributes<HTMLDivElement> {
  activeIndex?: number
  labels?: string[]
}

export function WorldlineConstellation({
  activeIndex = 2,
  labels = ['入场', '分歧', '现在', '支线', '回响'],
  className,
  ...props
}: WorldlineConstellationProps) {
  return (
    <div className={cn('worldline-constellation', className)} {...props}>
      <div className="worldline-constellation-line" aria-hidden="true" />
      {labels.map((label, index) => (
        <span
          key={`${label}-${index}`}
          className={cn(
            'worldline-node',
            index === activeIndex && 'worldline-node-active pu-branch-pulse',
          )}
        >
          <span>{label}</span>
        </span>
      ))}
    </div>
  )
}
