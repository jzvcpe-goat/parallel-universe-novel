import { HeartPulse } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface CreatorInlineReviewItem {
  label: string
  locus: string
  status: string
  body: string
  action: string
}

export interface CreatorInlineReviewPanelProps {
  items: CreatorInlineReviewItem[]
  onApplyFix: (label: string) => void
  className?: string
}

export function CreatorInlineReviewPanel({ items, onApplyFix, className }: CreatorInlineReviewPanelProps) {
  return (
    <Card
      data-slot="creator-inline-review"
      variant="default"
      padding="sm"
      className={cn(
        'border-[var(--creator-border)] bg-[var(--creator-surface-strong)] text-[var(--creator-editor-text)] shadow-none',
        className,
      )}
      aria-label="正文诊断"
    >
      <CardContent className="grid gap-3 p-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <HeartPulse size={16} className="text-[var(--creator-confirm)]" />
            <h3 className="text-sm font-semibold text-[var(--creator-editor-text)]">正文诊断</h3>
          </div>
          <Badge variant="outline">点击修复</Badge>
        </div>
        <div className="grid gap-2 md:grid-cols-2" data-slot="creator-inline-review-list">
          {items.map(item => {
            const needsAttention = item.status.includes('待') || item.status.includes('可')
            return (
              <Button
                key={item.label}
                type="button"
                variant={needsAttention ? 'outline' : 'gold'}
                size="sm"
                data-slot="creator-inline-review-marker"
                className="h-auto min-h-[82px] items-start justify-between gap-3.5 whitespace-normal rounded-xl p-3 text-left"
                onClick={() => onApplyFix(item.action)}
              >
                <span className="min-w-0 flex-1">
                  <Badge
                    variant="outline"
                    className="w-fit border-[var(--creator-border)] bg-[var(--creator-accent-soft)] px-2 py-0.5 text-[0.62rem] font-black text-[var(--creator-accent)]"
                  >
                    {item.locus}
                  </Badge>
                  <strong className="mt-1.5 block text-sm font-black text-[var(--creator-editor-text)]">{item.label}</strong>
                  <small className="mt-1 block text-xs leading-6 text-[var(--creator-text-muted)]">{item.body}</small>
                </span>
                <span className="grid min-w-[5.8rem] shrink-0 justify-items-end gap-1.5" data-slot="creator-inline-review-action">
                  <Badge variant={needsAttention ? 'outline' : 'gold'}>
                    {item.status}
                  </Badge>
                  <span className="whitespace-nowrap text-[0.65rem] font-black text-[var(--creator-text-dim)]">打开修复建议</span>
                </span>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export interface CreatorEditorReviewRailProps {
  items: CreatorInlineReviewItem[]
  onApplyFix: (label: string) => void
  className?: string
}

export function CreatorEditorReviewRail({ items, onApplyFix, className }: CreatorEditorReviewRailProps) {
  return (
    <Card
      data-slot="creator-editor-review-rail"
      variant="glass"
      padding="none"
      className={cn(
        'relative z-[1] mb-2.5 flex w-full items-center gap-2 rounded-2xl px-2 py-1.5 text-[var(--creator-editor-text)] max-[720px]:static max-[720px]:mb-[0.65rem]',
        className,
      )}
      aria-label="正文右缘审阅标尺"
    >
      <div className="flex min-w-max items-center gap-1 text-[0.58rem] font-black text-[var(--creator-text-dim)]" data-slot="creator-editor-review-title">
        <HeartPulse size={13} className="text-[var(--creator-confirm)]" />
        <span>行内审阅</span>
      </div>
      <div
        className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-slot="creator-editor-review-list"
      >
        {items.map(item => {
          const needsAttention = item.status.includes('待') || item.status.includes('可')
          const shortLabel = inlineReviewShortLabel(item.label)
          return (
            <Button
              key={item.label}
              type="button"
              variant={needsAttention ? 'outline' : 'gold'}
              size="sm"
              data-slot="creator-editor-review-dot"
              className="relative inline-grid h-auto min-h-[34px] min-w-[5.25rem] grid-cols-[1.34rem_minmax(0,1fr)] justify-items-start gap-x-1 gap-y-0 rounded-full px-1.5 py-1 text-left shadow-none"
              aria-pressed={needsAttention}
              aria-label={`${item.locus} ${item.label} ${item.status}，打开修复建议`}
              title={`${item.locus} · ${item.label} · ${item.status}`}
              onClick={() => onApplyFix(item.action)}
            >
              <em className="row-span-2 inline-flex min-h-[1.34rem] min-w-[1.34rem] items-center justify-center rounded-full border border-[var(--creator-border)] bg-[var(--creator-accent-soft)] text-[0.52rem] font-black not-italic leading-none text-[var(--creator-accent)]">
                {item.locus}
              </em>
              <span className="text-[0.64rem] font-black leading-[1.15]">{shortLabel}</span>
              <small className="text-[0.58rem] font-bold leading-[1.1] text-[var(--creator-text-dim)]">{item.status}</small>
            </Button>
          )
        })}
      </div>
    </Card>
  )
}

function inlineReviewShortLabel(label: string) {
  if (label.includes('开场')) return '开场'
  if (label.includes('段落')) return '力度'
  if (label.includes('结尾')) return '尾钩'
  if (label.includes('标题')) return '标题'
  return label.slice(0, 2)
}
