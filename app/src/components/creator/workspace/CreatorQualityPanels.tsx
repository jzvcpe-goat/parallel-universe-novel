import { ShieldCheck } from 'lucide-react'
import { cva } from 'class-variance-authority'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface CreatorQualityIssueFix {
  id: string
  label: string
  result: string
}

export interface CreatorQualityIssue {
  id: string
  severity: 'suggestion' | 'warning' | 'blocker'
  title: string
  evidence: string
  impact: string
  fixes: CreatorQualityIssueFix[]
}

export interface CreatorQualityIssueCardProps {
  title: string
  destinationReady: boolean
  issues: CreatorQualityIssue[]
  onApplyFix: (label: string) => void
  className?: string
}

const severityRailVariants = cva('absolute inset-y-0 left-0 w-1', {
  variants: {
    severity: {
      blocker: 'bg-[var(--creator-danger)]',
      warning: 'bg-[var(--creator-confirm)]',
      suggestion: 'bg-[var(--creator-accent)]',
    },
  },
  defaultVariants: {
    severity: 'suggestion',
  },
})

export function CreatorQualityIssueCard({
  title,
  destinationReady,
  issues,
  onApplyFix,
  className,
}: CreatorQualityIssueCardProps) {
  const blockerCount = issues.filter(issue => issue.severity === 'blocker').length
  const warningCount = issues.filter(issue => issue.severity === 'warning').length
  const conclusion = blockerCount
    ? '暂不能进入发布'
    : issues.length
      ? '先处理关键建议'
      : '可以进入发布包确认'
  const severityLabel: Record<CreatorQualityIssue['severity'], string> = {
    blocker: '阻断',
    warning: '提醒',
    suggestion: '解释',
  }

  return (
    <section aria-label="质量问题卡" data-slot="creator-quality-review" className={cn('grid gap-3.5', className)}>
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-[var(--creator-confirm)]" />
          <div>
            <p className="mb-px text-xs font-black tracking-normal text-[var(--creator-confirm)]">质量问题卡</p>
            <h2 className="text-base font-semibold text-[var(--creator-text)]">先处理会影响读者体验的地方</h2>
          </div>
        </div>
        <Badge className="w-fit" variant={blockerCount ? 'outline' : 'gold'}>{conclusion}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-2" aria-label="质量问题摘要">
        {[
          { label: '阻断', value: blockerCount },
          { label: '提醒', value: warningCount },
          { label: '可处理', value: issues.length || 1 },
        ].map(metric => (
          <Card
            key={metric.label}
            data-slot="creator-quality-metric"
            variant="default"
            padding="none"
            className="min-w-0 border-[var(--creator-border)] bg-[var(--creator-surface-strong)] p-3 text-base font-black leading-tight text-[var(--creator-text)] shadow-none"
          >
            <strong className="mb-1 block text-xs font-black text-[var(--creator-text-dim)]">{metric.label}</strong>
            {metric.value}
          </Card>
        ))}
      </div>

      {issues.length ? (
        <div className="grid gap-3" data-slot="creator-quality-list">
          {issues.map(issue => (
            <Card
              key={issue.id}
              role="article"
              aria-label={issue.title}
              data-slot="creator-quality-issue"
              variant="default"
              padding="sm"
              className="relative overflow-hidden border-[var(--creator-border)] bg-[var(--creator-surface-strong)] text-[var(--creator-text)] shadow-none"
            >
              <span aria-hidden="true" className={severityRailVariants({ severity: issue.severity })} />
              <div className="flex items-center gap-2">
                <Badge variant={issue.severity === 'blocker' ? 'outline' : 'gold'}>{severityLabel[issue.severity]}</Badge>
                <h3 className="text-sm font-black text-[var(--creator-text)]">{issue.title}</h3>
              </div>
              <dl className="mt-3 grid gap-2 text-sm leading-6 text-[var(--creator-text-muted)]">
                {[
                  { label: '证据', value: issue.evidence },
                  { label: '影响', value: issue.impact },
                ].map(item => (
                  <div key={item.label} className="grid gap-1 border-t border-[var(--creator-editor-line)] pt-2 first:border-t-0 first:pt-0">
                    <dt className="text-xs font-black text-[var(--creator-accent)]">{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
              <h4 className="mt-3 text-xs font-black tracking-normal text-[var(--creator-text-dim)]">修复方案</h4>
              <div className="mt-2 grid gap-2">
                {issue.fixes.map((fix, index) => (
                  <Button
                    key={fix.id}
                    type="button"
                    variant={index === 0 ? 'gold' : 'outline'}
                    size="sm"
                    data-slot="creator-quality-fix-action"
                    className="h-auto min-h-12 w-full justify-start whitespace-normal px-3 py-2.5 text-left"
                    onClick={() => onApplyFix(fix.label)}
                  >
                    <span className="flex w-full min-w-0 flex-col items-start gap-1">
                      <strong className="text-sm font-black">{fix.label}</strong>
                      <small className="text-left text-xs leading-5 opacity-70">{fix.result}</small>
                    </span>
                  </Button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card
          data-slot="creator-quality-pass"
          variant="default"
          padding="sm"
          className="flex items-start gap-2 border-[var(--creator-border)] bg-[var(--creator-surface-strong)] text-sm leading-6 text-[var(--creator-text-muted)] shadow-none"
        >
          <Badge variant="gold">通过</Badge>
          <span className="min-w-0">
            <strong className="block font-black text-[var(--creator-text)]">这一章可以进入发布包确认。</strong>
            {title.trim() && destinationReady ? '标题、正文和发布位置都已经具备，下一步只需要确认故事影响。' : '正文基础已经具备，下一步补齐标题和发布去向。'}
          </span>
        </Card>
      )}

      <Card
        data-slot="creator-quality-explanation"
        variant="default"
        padding="sm"
        className="grid gap-1 border-[var(--creator-border)] bg-[var(--creator-surface-strong)] text-sm leading-6 text-[var(--creator-text-muted)] shadow-none"
      >
        <strong className="font-black text-[var(--creator-text)]">为什么这样建议？</strong>
        <span>问题卡只看会影响读者体验的地方：能不能读、写到哪条线、是否兑现承诺、是否留下继续看的理由。</span>
      </Card>
    </section>
  )
}
