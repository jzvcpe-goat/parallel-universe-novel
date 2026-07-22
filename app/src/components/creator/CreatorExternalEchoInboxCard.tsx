import { Bookmark, Check, EyeOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface CreatorExternalEchoInboxCardViewModel {
  id: string
  sourceLabel: string
  sourceSummary: string
  typeLabel: string
  workTitle: string
  branchTitle: string
  signalText: string
  anchorText?: string
  weightLabel: string
  relatedCount: number
  reminderStatus: 'suggested' | 'pinned' | 'used' | 'dismissed'
  reminderStatusLabel: string
  reminderTitle: string
  reminderNote: string
  canPin: boolean
  canDismiss: boolean
  canUse: boolean
}

export interface CreatorExternalEchoInboxCardProps {
  viewModel: CreatorExternalEchoInboxCardViewModel
  selected?: boolean
  busy?: boolean
  onSelect: () => void
  onPin: () => void
  onDismiss: () => void
  onUse: () => void
}

export function CreatorExternalEchoInboxCard({
  viewModel,
  selected,
  busy,
  onSelect,
  onPin,
  onDismiss,
  onUse,
}: CreatorExternalEchoInboxCardProps) {
  return (
    <Card
      variant="default"
      padding="none"
      role="listitem"
      aria-current={selected ? 'true' : undefined}
      aria-busy={busy || undefined}
      data-slot="creator-external-echo-card"
      data-state={selected ? 'selected' : 'idle'}
      data-busy={busy ? 'true' : 'false'}
      data-reader-signal-id={viewModel.id}
      data-reader-signal-source={viewModel.sourceLabel}
      data-reminder-status={viewModel.reminderStatus}
      className={cn('overflow-hidden rounded-md', selected && 'ring-1 ring-[var(--creator-accent)]')}
    >
      <CardHeader
        data-slot="creator-external-echo-card-header"
        className="border-b border-[var(--creator-border)] px-4 py-4"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{viewModel.sourceLabel}</Badge>
          <Badge variant="outline">{viewModel.typeLabel}</Badge>
          <Badge variant={viewModel.reminderStatus === 'pinned' ? 'gold' : 'outline'}>
            {viewModel.reminderStatusLabel}
          </Badge>
          {viewModel.relatedCount > 1 ? <Badge variant="outline">同类 {viewModel.relatedCount}</Badge> : null}
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base text-[var(--creator-text)]">{viewModel.workTitle}</CardTitle>
            <CardDescription className="text-[var(--creator-text-muted)]">
              {viewModel.branchTitle} · {viewModel.sourceSummary} · {viewModel.weightLabel}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant={selected ? 'gold' : 'outline'}
            size="sm"
            aria-pressed={selected}
            className="min-h-10 shrink-0"
            onClick={onSelect}
          >
            {selected ? '正在看' : '查看'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <figure data-slot="creator-external-echo-card-source" className="space-y-2 px-4 py-4">
          <blockquote className="border-l-2 border-[var(--creator-border-strong)] pl-3 text-sm leading-6 text-[var(--creator-text)]">
            {viewModel.signalText}
          </blockquote>
          {viewModel.anchorText ? (
            <figcaption className="text-xs leading-5 text-[var(--creator-text-dim)]">
              来自段落：{viewModel.anchorText}
            </figcaption>
          ) : null}
        </figure>
        <section
          data-slot="creator-external-echo-card-reminder"
          aria-label="本机创作提醒"
          className="space-y-1 border-t border-[var(--creator-border)] bg-[var(--creator-surface)] px-4 py-4"
        >
          <p className="text-sm font-semibold text-[var(--creator-text)]">{viewModel.reminderTitle}</p>
          <p className="text-sm leading-6 text-[var(--creator-text-muted)]">{viewModel.reminderNote}</p>
        </section>
      </CardContent>
      <CardFooter
        data-slot="creator-external-echo-card-actions"
        className="m-0 grid grid-cols-1 gap-2 border-t border-[var(--creator-border)] p-3 sm:grid-cols-3"
      >
        <Button
          type="button"
          variant="gold"
          size="sm"
          className="min-h-10 w-full"
          disabled={busy || !viewModel.canPin}
          onClick={onPin}
        >
          <Bookmark size={14} aria-hidden="true" />
          保存提醒
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-10 w-full"
          disabled={busy || !viewModel.canUse}
          onClick={onUse}
        >
          <Check size={14} aria-hidden="true" />
          已用在写作里
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-10 w-full"
          disabled={busy || !viewModel.canDismiss}
          onClick={onDismiss}
        >
          <EyeOff size={14} aria-hidden="true" />
          先放下
        </Button>
      </CardFooter>
    </Card>
  )
}
