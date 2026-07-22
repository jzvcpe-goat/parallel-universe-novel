import { Eye, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { WritingAssistRecommendation } from '@/features/creator-decision/types'
import { creatorWritingAssistLensLabel } from './creatorWritingAssistCopy'

export interface CreatorWritingAssistRecommendationCardProps {
  recommendation: WritingAssistRecommendation
  pending: boolean
  onReview: (lensIds: WritingAssistRecommendation['lensIds']) => void
  onDismiss: () => void
}

export function CreatorWritingAssistRecommendationCard({
  recommendation,
  pending,
  onReview,
  onDismiss,
}: CreatorWritingAssistRecommendationCardProps) {
  return (
    <section
      className="border-y border-[var(--creator-border)] py-4"
      aria-live="polite"
      data-slot="creator-writing-assist-recommendation"
      data-recommendation-revision={recommendation.draftRevision}
    >
      <div className="flex flex-wrap items-center gap-2">
        <strong className="text-base text-[var(--creator-text)]">这次可以重点看看</strong>
        {recommendation.lensIds.map(lensId => (
          <Badge key={lensId} variant="outline">{creatorWritingAssistLensLabel(lensId)}</Badge>
        ))}
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--creator-text-muted)]">
        这是当前正文和本章召回形成的临时建议。不会自动修改，也不会影响正文确认。
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => onReview(recommendation.lensIds)} disabled={pending}>
          <Eye size={14} aria-hidden="true" />按建议看看
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDismiss} disabled={pending}>
          <X size={14} aria-hidden="true" />本次不用
        </Button>
      </div>
    </section>
  )
}
