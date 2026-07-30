import { type ReactNode } from 'react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface CreatorEchoQueueCardProps {
  selected?: boolean
  typeLabel: string
  statusLabel: string
  statusVariant?: BadgeProps['variant']
  clusterCount?: number
  workTitle: string
  branchTitle: string
  createdAtLabel: string
  requestText: string
  actionHint: string
  voteLabel: string
  intentLabel: string
  sceneSeed: string
  authorDecision: string
  writingQuestion: string
  nextStep: string
  children: ReactNode
  onSelect: () => void
}

export function CreatorEchoQueueCard({
  selected,
  typeLabel,
  statusLabel,
  statusVariant,
  clusterCount = 1,
  workTitle,
  branchTitle,
  createdAtLabel,
  requestText,
  actionHint,
  voteLabel,
  intentLabel,
  sceneSeed,
  authorDecision,
  writingQuestion,
  nextStep,
  children,
  onSelect,
}: CreatorEchoQueueCardProps) {
  return (
    <Card
      variant="default"
      padding="sm"
      role="listitem"
      aria-current={selected ? 'true' : undefined}
      className={cn('creator-echo-queue-card', selected && 'is-selected')}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{typeLabel}</Badge>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
          {clusterCount > 1 ? <Badge variant="gold">同类 {clusterCount}</Badge> : null}
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg text-[var(--creator-text)]">{workTitle}</CardTitle>
            <CardDescription className="text-[var(--creator-text-muted)]">
              {branchTitle} · {createdAtLabel}
            </CardDescription>
          </div>
          <Button
            type="button"
            className="creator-echo-card-select shrink-0"
            variant={selected ? 'gold' : 'outline'}
            size="sm"
            aria-pressed={selected}
            onClick={onSelect}
          >
            {selected ? '正在看' : '查看'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="creator-echo-queue-quote">{requestText}</p>
        <div className="creator-echo-queue-flow" aria-label="写作判断链">
          <span>
            <small>读者愿望</small>
            <b>{intentLabel}</b>
          </span>
          <span>
            <small>可写场景</small>
            <b>{sceneSeed}</b>
          </span>
          <span>
            <small>作者一问</small>
            <b>{writingQuestion}</b>
          </span>
        </div>
        <div className="creator-echo-queue-judgment" aria-label="作者判断">
          <span>
            <small>动笔判断</small>
            <b>{authorDecision}</b>
          </span>
          <span>
            <small>马上做</small>
            <b>{nextStep}</b>
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--creator-text-dim)]">{actionHint}</p>
          <span className="text-sm font-semibold text-[var(--creator-text)]">{voteLabel}</span>
        </div>
        {children}
      </CardContent>
    </Card>
  )
}
