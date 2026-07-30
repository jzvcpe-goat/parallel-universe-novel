import { Clock3, LocateFixed, Sparkles, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { AdvisoryCraftFinding } from '@/features/creator-decision/types'
import { creatorWritingAssistLensLabel } from './creatorWritingAssistCopy'

export interface CreatorWritingAssistFindingCardProps {
  finding: AdvisoryCraftFinding
  pending: boolean
  remainingCount: number
  onFocus: (finding: AdvisoryCraftFinding) => void
  onProposeRepair: (findingId: string) => void
  onDefer: (findingId: string) => void
  onDismiss: (findingId: string) => void
}

export function CreatorWritingAssistFindingCard({
  finding,
  pending,
  remainingCount,
  onFocus,
  onProposeRepair,
  onDefer,
  onDismiss,
}: CreatorWritingAssistFindingCardProps) {
  return (
    <section
      className="border-y border-[var(--creator-border)] py-4"
      aria-live="polite"
      data-slot="creator-writing-assist-finding"
      data-advisory-lens={finding.lensId}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={finding.severity === 'preserve' ? 'outline' : 'gold'}>
          {creatorWritingAssistLensLabel(finding.lensId)}
        </Badge>
        <span className="text-xs text-[var(--creator-text-muted)]">证据 {finding.evidence.length} 处</span>
        {remainingCount > 0 ? <span className="text-xs text-[var(--creator-text-dim)]">另有 {remainingCount} 条，处理后再看</span> : null}
      </div>
      <p className="mt-2 text-[17px] leading-7 text-[var(--creator-text)]">{finding.diagnosis}</p>
      <p className="mt-1 text-sm leading-6 text-[var(--creator-text-muted)]">阅读效果假设：{finding.readerEffectHypothesis}</p>
      <p className="mt-1 text-sm leading-6 text-[var(--creator-text-muted)]">最小尝试：{finding.smallestExperiment}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--creator-text-dim)]">取舍：{finding.authorTradeoff}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => onFocus(finding)}>
          <LocateFixed size={13} aria-hidden="true" />定位原文
        </Button>
        {finding.severity === 'revision_candidate' && finding.verification === 'verified' ? (
          <Button type="button" size="sm" onClick={() => onProposeRepair(finding.id)} disabled={pending}>
            <Sparkles size={13} aria-hidden="true" />看一个局部方案
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="sm" onClick={() => onDefer(finding.id)} disabled={pending}>
          <Clock3 size={13} aria-hidden="true" />稍后处理
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onDismiss(finding.id)} disabled={pending}>
          <X size={13} aria-hidden="true" />保持原文
        </Button>
      </div>
    </section>
  )
}
