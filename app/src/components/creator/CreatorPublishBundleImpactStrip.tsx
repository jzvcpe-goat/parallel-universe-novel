import { GitBranch, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface CreatorPublishBundleImpactStripProps {
  readerLocationLabel: string
  anchorLabel: string
  requestImpactLabel: string
  className?: string
}

export function CreatorPublishBundleImpactStrip({
  readerLocationLabel,
  anchorLabel,
  requestImpactLabel,
  className,
}: CreatorPublishBundleImpactStripProps) {
  const rows = [
    {
      label: '读者端展示',
      value: readerLocationLabel,
      detail: '确认发布后，读者会在这里看到更新。',
      tone: 'gold' as const,
    },
    {
      label: '章节挂点',
      value: anchorLabel,
      detail: '用于判断这章接在哪条线上。',
      tone: 'outline' as const,
    },
    {
      label: '请求影响',
      value: requestImpactLabel,
      detail: '有关联请求时，会更新读者看到的状态。',
      tone: 'stasis' as const,
    },
    {
      label: '失败保护',
      value: '正文留在草稿箱',
      detail: '发布未完成时，草稿不会丢失。',
      tone: 'outline' as const,
    },
  ]

  return (
    <Card variant="glass" padding="sm" className={cn('creator-publish-bundle-impact-strip', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={17} className="text-[var(--creator-accent)]" />
            <CardTitle className="text-base text-[var(--creator-text)]">发布影响总览</CardTitle>
          </div>
          <Badge variant="gold">确认前</Badge>
        </div>
        <CardDescription className="text-[var(--creator-text-muted)]">
          先看读者会在哪里看到更新，再确认公开。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 md:grid-cols-2">
        {rows.map(row => (
          <div key={row.label} className="rounded-lg border border-[var(--creator-border)] bg-[var(--creator-surface)] px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-[var(--creator-text-dim)]">{row.label}</p>
              <Badge variant={row.tone}>
                <GitBranch size={12} />
                {row.label === '失败保护' ? '保留' : '可见'}
              </Badge>
            </div>
            <p className="mt-1 line-clamp-2 text-sm font-semibold text-[var(--creator-text)]">{row.value}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--creator-text-muted)]">{row.detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
