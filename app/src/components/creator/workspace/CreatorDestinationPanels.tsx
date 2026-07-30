import { type ReactNode, useState } from 'react'
import { CheckCircle2, GitBranch, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

const destinationCardClass =
  'border-[var(--creator-rail-border)] bg-[var(--creator-rail-bg)] text-[var(--creator-text)] shadow-none'
const readinessCardClass =
  'border-[var(--creator-border)] bg-[var(--creator-surface)] text-[var(--creator-text)]'
const panelClass =
  'rounded-2xl border border-[var(--creator-border)] bg-[var(--creator-editor-control)]'
const panelStrongClass =
  'rounded-2xl border border-[var(--creator-border-strong)] bg-[var(--creator-editor-control-strong)]'

export interface CreatorDestinationPanelProps {
  title: string
  description: string
  summary: string
  children: ReactNode
  className?: string
  defaultOpen?: boolean
}

export function CreatorDestinationPanel({
  title,
  description,
  summary,
  children,
  className,
  defaultOpen = false,
}: CreatorDestinationPanelProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Card
      data-slot="creator-destination-panel"
      className={cn(destinationCardClass, 'max-xl:p-[0.58rem]', className)}
      variant="default"
      padding="sm"
    >
      <CardHeader data-slot="creator-destination-header" className="p-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <GitBranch size={18} className="mt-0.5 shrink-0 text-[var(--creator-accent)] max-xl:size-[0.86rem]" />
            <div className="min-w-0">
              <CardTitle className="text-base text-[var(--creator-text)] max-xl:text-[0.82rem]">{title}</CardTitle>
              <CardDescription
                data-slot="creator-destination-description"
                className="mt-1 text-xs leading-5 text-[var(--creator-text-muted)] max-xl:hidden"
              >
                {description}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline">草稿去向</Badge>
        </div>
      </CardHeader>
      <CardContent className="mt-3 p-0">
        <div
          data-slot="creator-destination-summary"
          className={cn(panelStrongClass, 'max-xl:grid max-xl:gap-[0.16rem] max-xl:px-[0.56rem] max-xl:py-[0.48rem]')}
        >
          <span className="max-xl:text-[0.62rem] max-xl:font-extrabold max-xl:leading-[1.2] max-xl:text-[var(--creator-text-dim)]">
            当前去向
          </span>
          <strong className="max-xl:text-[0.76rem] max-xl:leading-[1.35] max-xl:text-[var(--creator-text)]">{summary}</strong>
        </div>
        <Collapsible open={open} onOpenChange={setOpen} data-slot="creator-destination-collapsible">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-slot="creator-destination-toggle"
              className="max-xl:mt-[0.38rem] max-xl:h-[1.95rem] max-xl:w-full"
            >
              {open ? '收起修改' : '修改去向'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent data-slot="creator-destination-content" className="max-xl:mt-[0.38rem]">
            <section
              data-slot="creator-destination-body"
              className={cn(
                panelClass,
                'grid gap-3 p-3 max-xl:grid-cols-2 max-xl:gap-[0.34rem] max-xl:p-[0.42rem]',
                'max-xl:[&_label]:min-w-0 max-xl:[&_label]:gap-[0.18rem] max-xl:[&_label]:text-[0.64rem] max-xl:[&_label]:leading-[1.2]',
                'max-xl:[&_label:has(input)]:col-span-full',
                'max-xl:[&_label>button]:h-8 max-xl:[&_label>button]:min-w-0 max-xl:[&_label>button]:px-[0.46rem] max-xl:[&_label>button]:text-[0.72rem]',
                'max-xl:[&_label>input]:h-8 max-xl:[&_label>input]:min-w-0 max-xl:[&_label>input]:px-[0.46rem] max-xl:[&_label>input]:text-[0.72rem]',
              )}
            >
              {children}
            </section>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

export interface CreatorBundleReadinessItem {
  label: string
  detail: string
  ready: boolean
}

export interface CreatorBundleReadinessPanelProps {
  title: string
  statusLabel: string
  summary: string
  items: CreatorBundleReadinessItem[]
  actionLabel: string
  actionDisabled?: boolean
  onAction: () => void
  className?: string
}

export function CreatorBundleReadinessPanel({
  title,
  statusLabel,
  summary,
  items,
  actionLabel,
  actionDisabled,
  onAction,
  className,
}: CreatorBundleReadinessPanelProps) {
  const readyCount = items.filter(item => item.ready).length

  return (
    <Card
      data-slot="creator-bundle-readiness-panel"
      className={cn(readinessCardClass, 'max-xl:p-[0.72rem]', className)}
      variant="glass"
      padding="md"
    >
      <CardHeader data-slot="creator-bundle-readiness-header" className="p-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[var(--creator-confirm)]" />
            <div className="min-w-0">
              <CardTitle className="text-base text-[var(--creator-text)] max-xl:text-[0.92rem]">{title}</CardTitle>
              <CardDescription
                data-slot="creator-bundle-readiness-summary"
                className="mt-1 text-xs leading-5 text-[var(--creator-text-muted)] max-xl:hidden"
              >
                {summary}
              </CardDescription>
            </div>
          </div>
          <Badge variant={readyCount === items.length ? 'gold' : 'outline'}>{statusLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent data-slot="creator-bundle-readiness-content" className="mt-3 p-0 max-xl:mt-2">
        <div
          data-slot="creator-bundle-readiness-list"
          className={cn(panelClass, 'grid gap-2 p-2.5 max-xl:flex max-xl:flex-wrap max-xl:items-center max-xl:gap-[0.34rem] max-xl:p-2')}
        >
          {items.map(item => (
            <div
              key={item.label}
              data-slot="creator-bundle-readiness-row"
              className="grid grid-cols-[18px_1fr] gap-2 max-xl:inline-flex max-xl:max-w-full max-xl:items-center max-xl:gap-[0.32rem] max-xl:rounded-full max-xl:border max-xl:border-[var(--creator-readiness-chip-border)] max-xl:px-[0.42rem] max-xl:py-[0.24rem]"
            >
              <span
                className={cn(
                  'mt-0.5 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border text-[0.62rem] max-xl:mt-0',
                  item.ready
                    ? 'border-[var(--creator-confirm)] bg-[var(--creator-assistant-ready-bg)] text-[var(--creator-confirm)]'
                    : 'border-[var(--creator-border)] bg-[var(--creator-surface)] text-[var(--creator-text-dim)]',
                )}
                aria-hidden="true"
              >
                {item.ready ? <CheckCircle2 size={11} /> : null}
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-xs font-black text-[var(--creator-text)] max-xl:text-[0.68rem]">{item.label}</strong>
                <small className="mt-0.5 block line-clamp-2 text-[0.68rem] leading-4 text-[var(--creator-text-dim)] max-xl:hidden">
                  {item.detail}
                </small>
              </span>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="gold"
          size="sm"
          data-slot="creator-bundle-readiness-action"
          className="mt-2 w-full max-xl:mt-[0.46rem] max-xl:h-8"
          disabled={actionDisabled}
          onClick={onAction}
        >
          <ShieldCheck size={14} />
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  )
}
