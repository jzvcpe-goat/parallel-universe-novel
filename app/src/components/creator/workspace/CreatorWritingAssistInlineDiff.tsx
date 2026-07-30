import { Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { RepairProposal, SceneDraftResult } from '@/features/creator-decision/types'

export interface CreatorWritingAssistInlineDiffProps {
  repair: RepairProposal
  draft: SceneDraftResult | null
  pending: boolean
  onAccept: (repairId: string) => void
  onReject: (repairId: string) => void
}

export function CreatorWritingAssistInlineDiff({
  repair,
  draft,
  pending,
  onAccept,
  onReject,
}: CreatorWritingAssistInlineDiffProps) {
  const sourceBlock = draft?.contentBlocks.find(block => block.id === repair.targetBlockIds[0]) || null
  const isAdvisory = repair.findingSource?.kind === 'advisory_lens'

  if (repair.operation === 'offer_variants') {
    return (
      <section className="space-y-3" data-slot="creator-writing-assist-inline-diff" data-repair-source={isAdvisory ? 'advisory' : 'existing'}>
        <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--creator-text)]">
          {repair.proposedContent || '这项建议只提供表达方向，不会自动改写正文。'}
        </p>
        <p className="text-xs leading-5 text-[var(--creator-text-muted)]">跨段建议只作参考，不能作为正文候选直接采用。</p>
        <Button type="button" variant="ghost" size="sm" onClick={() => onReject(repair.id)} disabled={pending}>
          <X size={13} aria-hidden="true" />不采用
        </Button>
      </section>
    )
  }

  return (
    <section className="space-y-4" data-slot="creator-writing-assist-inline-diff" data-repair-source={isAdvisory ? 'advisory' : 'existing'}>
      <p className="text-sm leading-6 text-[var(--creator-text-muted)]">
        只比较证据所在的一段。候选尚未写入正文。
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="min-w-0 border-l-2 border-[var(--creator-border)] pl-4">
          <Badge variant="outline">原文</Badge>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--creator-text-muted)]">
            {sourceBlock?.text || '原文已变化，请放弃候选并重新检查。'}
          </p>
        </div>
        <div className="min-w-0 border-l-2 border-[var(--creator-accent)] pl-4">
          <Badge variant="gold">局部候选</Badge>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--creator-text)]">
            {repair.proposedContent}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => onAccept(repair.id)} disabled={pending || !sourceBlock}>
          <Check size={13} aria-hidden="true" />采用这一处修改
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onReject(repair.id)} disabled={pending}>
          <X size={13} aria-hidden="true" />不采用
        </Button>
      </div>
    </section>
  )
}
