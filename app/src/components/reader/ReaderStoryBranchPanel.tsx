import { Save } from 'lucide-react'
import type { BadgeProps } from '@/components/ui/badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ReaderStoryBranchPanelProps {
  branchCode: string
  branchName: string
  statusLabel: string
  statusTone: BadgeProps['variant']
  summary: string
  divergence: number
  stability: number
  readingProgress: number
  saved: boolean
  saveHint: string
  onToggleSave: () => void
}

export function ReaderStoryBranchPanel({
  branchCode,
  branchName,
  statusLabel,
  statusTone,
  summary,
  divergence,
  stability,
  readingProgress,
  saved,
  saveHint,
  onToggleSave,
}: ReaderStoryBranchPanelProps) {
  const metrics = [
    { label: '分歧', value: divergence },
    { label: '稳定', value: stability },
    { label: '进度', value: readingProgress },
  ]

  return (
    <Card variant="glass" padding="md" className="reader-story-branch-panel pu-motion-lift">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-[var(--ink-dim)]">我的分支</p>
            <CardTitle className="mt-2 text-4xl leading-none text-[var(--ink-paper)]">{branchCode}</CardTitle>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{branchName}</p>
          </div>
          <Badge variant={statusTone}>{statusLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="omega-map">
          <div className="omega-node omega-node-small">Ω-15</div>
          <div className="omega-link" />
          <div className="omega-node omega-node-small">Ω-16</div>
          <div className="omega-link" />
          <div className="omega-node omega-node-active">Ω-17</div>
          <div className="omega-split">
            <span>Ω-17-A</span>
            <span>Ω-17-B</span>
          </div>
        </div>

        <div className="reader-story-branch-summary">
          <p className="text-sm leading-6 text-[var(--ink-muted)]">{summary}</p>
          <div className="reader-story-branch-metrics">
            {metrics.map(metric => (
              <div key={metric.label}>
                <p className="text-xl font-semibold text-[var(--ink-paper)]">{metric.value}%</p>
                <p className="text-[11px] text-[var(--ink-dim)]">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>

        <Button className="pu-motion-lift mt-4 w-full" variant={saved ? 'secondary' : 'gold'} onClick={onToggleSave}>
          <Save className="h-4 w-4" />
          {saved ? '已加入书架' : '加入书架'}
        </Button>
        <p className="mt-3 text-center text-xs leading-5 text-[var(--ink-dim)]">{saveHint}</p>
      </CardContent>
    </Card>
  )
}
