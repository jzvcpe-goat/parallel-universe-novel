import type { ReactNode } from 'react'
import { Keyboard, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface CreatorShortcutBarProps {
  onOpenCommands: () => void
  onOpenAssistant: () => void
  className?: string
}

export function CreatorShortcutBar({ onOpenCommands, onOpenAssistant, className }: CreatorShortcutBarProps) {
  return (
    <Card className={cn('creator-shortcut-bar', className)} variant="glass" padding="none" role="navigation" aria-label="写作快捷操作">
      <Button type="button" variant="ghost" size="sm" onClick={onOpenCommands}><Keyboard size={14} /><span>⌘K 快捷创作</span></Button>
      <Button type="button" variant="ghost" size="sm" onClick={onOpenAssistant}><MessageSquare size={14} /><span>⌘L 追问</span></Button>
      <span className="creator-shortcut-hint">Tab 补下一句</span>
    </Card>
  )
}

export interface CreatorWritingWorkspaceFrameProps {
  main: ReactNode
  leftRail: ReactNode
  rightRail: ReactNode
  topRail?: ReactNode
  bottomRail?: ReactNode
  className?: string
}

export function CreatorWritingWorkspaceFrame({ main, leftRail, rightRail, topRail, bottomRail, className }: CreatorWritingWorkspaceFrameProps) {
  return (
    <div className={cn('creator-writing-workspace creator-editor-workspace grid gap-4 md:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[248px_minmax(640px,1fr)_320px]', className)}>
      {topRail ? <div className="order-0 md:col-span-2 xl:col-span-3">{topRail}</div> : null}
      <main className="order-1 min-w-0 xl:order-2">{main}</main>
      <aside className="creator-editor-left-rail order-3 space-y-4 md:col-span-2 xl:order-1 xl:col-span-1">{leftRail}</aside>
      <aside className="creator-editor-right-rail order-2 space-y-4 xl:order-3">{rightRail}</aside>
      {bottomRail ? <div className="creator-editor-bottom-rail order-4 md:col-span-2 xl:col-span-1 xl:col-start-2">{bottomRail}</div> : null}
    </div>
  )
}
