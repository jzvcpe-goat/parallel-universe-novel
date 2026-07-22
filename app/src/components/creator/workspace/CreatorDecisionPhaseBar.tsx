import { Check, Circle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { CreatorDecisionPhaseId } from '@/apps/creator/routes/creatorEditorViewModels'

export interface CreatorDecisionPhaseItem {
  id: CreatorDecisionPhaseId
  label: string
  state: 'complete' | 'active' | 'upcoming'
}

export interface CreatorDecisionPhaseBarProps {
  items: CreatorDecisionPhaseItem[]
  branchLabel: string
  canonRevision: number
  draftRevision: number
  hasUncommittedChanges: boolean
}

export function CreatorDecisionPhaseBar({
  items,
  branchLabel,
  canonRevision,
  draftRevision,
  hasUncommittedChanges,
}: CreatorDecisionPhaseBarProps) {
  return (
    <Card
      variant="glass"
      padding="sm"
      className="border-[var(--creator-border)] bg-[var(--creator-surface)] text-[var(--creator-text)]"
      aria-label="创作决策阶段"
    >
      <div className="flex flex-col gap-3">
        <ol className="grid min-w-0 grid-cols-5 gap-1" aria-label="意图到正史的阶段">
          {items.map((item, index) => (
            <li
              key={item.id}
              aria-current={item.state === 'active' ? 'step' : undefined}
              className={cn(
                'flex min-w-0 items-center gap-1.5 rounded-md border px-2 py-2 text-xs font-semibold',
                item.state === 'active' && 'border-[var(--creator-accent)] bg-[var(--creator-accent-soft)] text-[var(--creator-text)]',
                item.state === 'complete' && 'border-[var(--creator-confirm)] bg-[var(--creator-task-publish-bg)] text-[var(--creator-text)]',
                item.state === 'upcoming' && 'border-[var(--creator-border)] text-[var(--creator-text-dim)]',
              )}
            >
              {item.state === 'complete' ? <Check size={13} aria-hidden="true" /> : <Circle size={10} aria-hidden="true" />}
              <span className="truncate">{item.label}</span>
              {index < items.length - 1 ? <span className="sr-only">，下一步</span> : null}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--creator-text-muted)]">
          <Badge variant="outline">{branchLabel}</Badge>
          <span>主宇宙 r{canonRevision}</span>
          <span>草稿 r{draftRevision}</span>
          <Badge variant={hasUncommittedChanges ? 'gold' : 'outline'}>
            {hasUncommittedChanges ? '有未提交变化' : '已对齐'}
          </Badge>
        </div>
      </div>
    </Card>
  )
}
