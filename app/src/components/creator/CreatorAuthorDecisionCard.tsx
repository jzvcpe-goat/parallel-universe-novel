import { Sparkles } from 'lucide-react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface CreatorAuthorDecisionStep {
  label: string
  value: string
  tone?: BadgeProps['variant']
}

export interface CreatorAuthorDecisionCardProps {
  title: string
  question: string
  answer: string
  steps: CreatorAuthorDecisionStep[]
  primaryLabel: string
  secondaryLabel?: string
  onPrimary: () => void
  onSecondary?: () => void
  primaryDisabled?: boolean
  secondaryDisabled?: boolean
  className?: string
}

export function CreatorAuthorDecisionCard({
  title,
  question,
  answer,
  steps,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  primaryDisabled,
  secondaryDisabled,
  className,
}: CreatorAuthorDecisionCardProps) {
  return (
    <Card
      variant="glass"
      padding="sm"
      data-slot="creator-author-decision-card"
      className={cn(
        'relative overflow-hidden border-[var(--creator-assistant-border)] bg-[linear-gradient(150deg,color-mix(in_srgb,var(--creator-assistant-bg)_92%,transparent),color-mix(in_srgb,var(--creator-surface)_86%,transparent)),var(--creator-assistant-bg)] text-[var(--creator-text)] shadow-[var(--creator-shadow-soft)] before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(90deg,color-mix(in_srgb,var(--creator-accent)_22%,transparent),transparent_42%),linear-gradient(180deg,color-mix(in_srgb,var(--creator-confirm)_10%,transparent),transparent_48%)] before:opacity-[0.38] before:content-[""] [&>*]:relative',
        className,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={17} className="text-[var(--creator-accent)]" />
            <CardTitle className="text-base text-[var(--creator-text)]">{title}</CardTitle>
          </div>
          <Badge variant="gold">创作助手</Badge>
        </div>
        <CardDescription className="text-[var(--creator-text-muted)]">
          先把信息变成一个作者判断，再决定下一步。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <section
          data-slot="creator-author-decision-question"
          className="grid gap-[0.55rem] rounded-2xl border border-[var(--creator-assistant-panel-border)] bg-[var(--creator-assistant-panel-bg)] p-[0.9rem]"
          aria-label="作者一问"
        >
          <Badge variant="outline">作者一问</Badge>
          <strong className="text-[0.98rem] leading-[1.55] text-[var(--creator-text)]">{question}</strong>
          <p className="text-sm leading-[1.7] text-[var(--creator-text-muted)]">{answer}</p>
        </section>

        <div data-slot="creator-author-decision-steps" className="grid gap-2" aria-label="创作助手判断依据">
          {steps.map(step => (
            <span
              key={step.label}
              data-slot="creator-author-decision-step"
              className="grid grid-cols-[minmax(5rem,max-content)_minmax(0,1fr)] items-center gap-3 rounded-[0.85rem] border border-[var(--creator-border)] bg-[var(--creator-surface)] px-3 py-[0.65rem]"
            >
              <Badge variant={step.tone || 'outline'}>{step.label}</Badge>
              <b className="min-w-0 text-[0.88rem] leading-[1.45] text-[var(--creator-text)]">{step.value}</b>
            </span>
          ))}
        </div>

        <div className="grid gap-2">
          <Button type="button" variant="gold" onClick={onPrimary} disabled={primaryDisabled}>
            <Sparkles size={15} />
            {primaryLabel}
          </Button>
          {secondaryLabel && onSecondary ? (
            <Button type="button" variant="outline" onClick={onSecondary} disabled={secondaryDisabled}>
              {secondaryLabel}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
