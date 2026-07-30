import { Bookmark, Check, EyeOff, Radio } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import type { CreatorExternalEchoInboxCardViewModel } from './CreatorExternalEchoInboxCard'

export interface CreatorExternalEchoDetailPanelProps {
  viewModel: CreatorExternalEchoInboxCardViewModel | null
  busy?: boolean
  onPin: () => void
  onDismiss: () => void
  onUse: () => void
}

export function CreatorExternalEchoDetailPanel({
  viewModel,
  busy,
  onPin,
  onDismiss,
  onUse,
}: CreatorExternalEchoDetailPanelProps) {
  return (
    <Card
      variant="glass"
      padding="none"
      aria-busy={busy || undefined}
      data-slot="creator-external-echo-detail"
      data-state={viewModel ? 'ready' : 'empty'}
      data-busy={busy ? 'true' : 'false'}
      className="overflow-hidden rounded-md"
    >
      <CardHeader className="border-b border-[var(--creator-border)] px-4 py-4">
        <div className="flex items-center gap-2">
          <Radio size={18} aria-hidden="true" className="text-[var(--creator-accent)]" />
          <CardTitle className="text-base text-[var(--creator-text)]">创作提醒</CardTitle>
        </div>
        <CardDescription className="text-[var(--creator-text-muted)]">
          读者原话保持公开来源；你的判断只保存在本机。
        </CardDescription>
      </CardHeader>
      {viewModel ? (
        <>
          <CardContent className="p-0">
            <dl
              data-slot="creator-external-echo-detail-context"
              className="grid grid-cols-2 gap-x-3 gap-y-2 border-b border-[var(--creator-border)] px-4 py-3 text-xs"
            >
              <div className="min-w-0">
                <dt className="text-[var(--creator-text-dim)]">作品</dt>
                <dd className="mt-1 truncate font-medium text-[var(--creator-text)]">{viewModel.workTitle}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[var(--creator-text-dim)]">分支</dt>
                <dd className="mt-1 truncate font-medium text-[var(--creator-text)]">{viewModel.branchTitle}</dd>
              </div>
              <div className="col-span-2 flex items-center justify-between gap-3">
                <dt className="text-[var(--creator-text-dim)]">回声强度</dt>
                <dd className="font-medium text-[var(--creator-text)]">{viewModel.weightLabel}</dd>
              </div>
            </dl>
            <figure data-slot="creator-external-echo-detail-source" className="space-y-3 px-4 py-4">
              <figcaption className="flex flex-wrap items-center gap-2">
                <span className="mr-auto text-xs text-[var(--creator-text-dim)]">读者回声</span>
                <Badge variant="outline">{viewModel.sourceLabel}</Badge>
                <Badge variant="outline">{viewModel.typeLabel}</Badge>
              </figcaption>
              <blockquote className="text-sm leading-6 text-[var(--creator-text)]">{viewModel.signalText}</blockquote>
            </figure>
            <section
              data-slot="creator-external-echo-detail-reminder"
              aria-label="本机判断"
              className="space-y-2 border-t border-[var(--creator-border)] bg-[var(--creator-surface)] px-4 py-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-[var(--creator-text-dim)]">本机判断</p>
                <Badge variant={viewModel.reminderStatus === 'pinned' ? 'gold' : 'outline'}>
                  {viewModel.reminderStatusLabel}
                </Badge>
              </div>
              <p className="text-sm font-semibold text-[var(--creator-text)]">{viewModel.reminderTitle}</p>
              <p className="text-sm leading-6 text-[var(--creator-text-muted)]">{viewModel.reminderNote}</p>
            </section>
          </CardContent>
          <CardFooter
            data-slot="creator-external-echo-detail-actions"
            className="m-0 grid grid-cols-2 gap-2 border-t border-[var(--creator-border)] p-3"
          >
            <Button
              type="button"
              variant="gold"
              size="sm"
              className="min-h-10 w-full"
              disabled={busy || !viewModel.canPin}
              onClick={onPin}
            >
              <Bookmark size={14} aria-hidden="true" />
              保存提醒
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-10 w-full"
              disabled={busy || !viewModel.canUse}
              onClick={onUse}
            >
              <Check size={14} aria-hidden="true" />
              已用在写作里
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="col-span-2 min-h-10 w-full"
              disabled={busy || !viewModel.canDismiss}
              onClick={onDismiss}
            >
              <EyeOff size={14} aria-hidden="true" />
              先放下
            </Button>
          </CardFooter>
        </>
      ) : (
        <CardContent className="p-4">
          <Alert data-slot="creator-external-echo-detail-empty" className="border-[var(--creator-border)] bg-[var(--creator-surface)]">
            <Radio size={16} aria-hidden="true" />
            <AlertTitle className="text-[var(--creator-text)]">请选择回声</AlertTitle>
            <AlertDescription className="text-[var(--creator-text-muted)]">
              选中外界回声后，会在这里显示本机创作提醒。
            </AlertDescription>
          </Alert>
        </CardContent>
      )}
    </Card>
  )
}
