import { Bell, GitBranch } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type PublishStatusTone = 'stasis' | 'destructive' | 'gold' | 'outline'

export interface CreatorPublishBundleContextPanelProps {
  workTitle: string
  branchTitle: string
  anchorLabel: string
  requestImpactLabel: string
  requestText?: string
  requestStatusLabel?: string
  requestStatusTone?: PublishStatusTone
  requestVoteCount?: number
  className?: string
}

export function CreatorPublishBundleContextPanel({
  workTitle,
  branchTitle,
  anchorLabel,
  requestImpactLabel,
  requestText,
  requestStatusLabel,
  requestStatusTone = 'outline',
  requestVoteCount,
  className,
}: CreatorPublishBundleContextPanelProps) {
  const hasLinkedRequest = Boolean(requestText)
  const rows = [
    { label: '作品', value: workTitle },
    { label: '发布线', value: branchTitle },
    { label: '挂点', value: anchorLabel },
    { label: '请求结果', value: requestImpactLabel },
  ]

  return (
    <Card variant="glass" padding="sm" className={cn('creator-publish-bundle-context-panel', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <GitBranch size={17} className="text-[var(--creator-accent)]" />
          <CardTitle className="text-base text-[var(--creator-text)]">去向确认</CardTitle>
        </div>
        <CardDescription className="text-[var(--creator-text-muted)]">
          确认这次公开会落在哪条故事线上，以及是否回应外界回声。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">
          {rows.map(row => (
            <div key={row.label} className="creator-publish-bundle-context-row rounded-lg border border-[var(--creator-border)] bg-[var(--creator-surface)] px-3 py-2">
              <p className="text-xs text-[var(--creator-text-dim)]">{row.label}</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-[var(--creator-text)]">{row.value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-[var(--creator-border)] bg-[var(--creator-surface)] px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-[var(--creator-confirm)]" />
              <p className="text-sm font-semibold text-[var(--creator-text)]">外界回声</p>
            </div>
            {hasLinkedRequest ? <Badge variant={requestStatusTone}>{requestStatusLabel || '已关联'}</Badge> : <Badge variant="outline">未关联</Badge>}
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--creator-text-muted)]">
            {requestText || '这次发布不会回应特定请求，确认它仍然符合当前作品节奏。'}
          </p>
          {hasLinkedRequest ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">{requestVoteCount ?? 0} 票</Badge>
              <Badge variant="stasis">发布后更新状态</Badge>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
