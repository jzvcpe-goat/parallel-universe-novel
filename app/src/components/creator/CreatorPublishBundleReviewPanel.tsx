import { Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface CreatorPublishBundleReviewPanelProps {
  signals: string[]
  readerLocationLabel: string
  className?: string
}

export function CreatorPublishBundleReviewPanel({
  signals,
  readerLocationLabel,
  className,
}: CreatorPublishBundleReviewPanelProps) {
  return (
    <Card variant="glass" padding="sm" className={cn('creator-publish-bundle-review-panel', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={17} className="text-[var(--creator-accent)]" />
          <CardTitle className="text-base text-[var(--creator-text)]">创作助手复核</CardTitle>
        </div>
        <CardDescription className="text-[var(--creator-text-muted)]">
          发布前按读者视角看一遍：看点、承诺和入口是否一致。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 md:grid-cols-3">
        {signals.map(signal => (
          <div key={signal} className="rounded-lg border border-[var(--creator-border)] bg-[var(--creator-surface)] px-3 py-2">
            <p className="text-sm leading-6 text-[var(--creator-text-muted)]">{signal}</p>
          </div>
        ))}
        <div className="rounded-lg border border-[var(--creator-border)] bg-[var(--creator-surface)] px-3 py-2 md:col-span-3">
          <p className="text-xs text-[var(--creator-text-dim)]">读者入口</p>
          <p className="mt-1 text-sm font-semibold text-[var(--creator-text)]">{readerLocationLabel}</p>
        </div>
      </CardContent>
    </Card>
  )
}
