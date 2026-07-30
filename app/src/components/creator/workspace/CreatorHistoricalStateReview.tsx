import { ChevronDown, ShieldCheck, X } from 'lucide-react'
import type { CreatorHistoricalStateReviewItem } from '@/apps/creator/routes/creatorHistoricalStateReviewService'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

export interface CreatorHistoricalStateReviewProps {
  items: CreatorHistoricalStateReviewItem[]
  busyProposalId: string | null
  disabled?: boolean
  onConfirm: (item: CreatorHistoricalStateReviewItem) => void
  onReject: (item: CreatorHistoricalStateReviewItem) => void
}

export function CreatorHistoricalStateReview({
  items,
  busyProposalId,
  disabled = false,
  onConfirm,
  onReject,
}: CreatorHistoricalStateReviewProps) {
  return (
    <div className="divide-y divide-[var(--creator-border)] border-y border-[var(--creator-border)]" data-slot="creator-historical-state-review">
      {items.map(item => {
        const busy = busyProposalId === item.proposal.id
        const chapterLabel = item.chapterNumber ? `第 ${item.chapterNumber} 章` : '历史章节'
        return (
          <article key={item.proposal.id} className="py-4" data-proposal-id={item.proposal.id}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{chapterLabel}</Badge>
              <span className="text-sm text-[var(--creator-text-muted)]">{item.operationReviews.length} 条状态候选</span>
              <Badge variant={item.canConfirm ? 'gold' : 'destructive'}>
                {item.canConfirm ? '等待作者确认' : '需要重新核对'}
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--creator-text-muted)]">
              只补齐人物所知、因果、时间线或伏笔记录，不改动这一章正文。
            </p>
            {item.blockingNotice ? (
              <p role="alert" className="mt-2 text-sm leading-6 text-[var(--creator-danger)]">{item.blockingNotice}</p>
            ) : null}

            <Collapsible className="mt-3">
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" size="sm">
                  <ChevronDown size={13} aria-hidden="true" />查看正文证据
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-4" data-slot="creator-historical-state-evidence">
                {item.operationReviews.map(operation => (
                  <div key={operation.id} className="border-l-2 border-[var(--creator-border-strong)] pl-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm text-[var(--creator-text)]">{operation.label}</strong>
                      {operation.irreversible ? <Badge variant="outline">已发生事实</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-[var(--creator-text-muted)]">{operation.reason}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--creator-text)]">记录为：{operation.valueSummary}</p>
                    <div className="mt-2 space-y-2">
                      {operation.evidenceQuotes.map((quote, index) => (
                        <blockquote key={`${operation.id}:evidence:${index}`} className="border-l border-[var(--creator-accent)] pl-3 text-sm leading-6 text-[var(--creator-text-muted)]">
                          {quote}
                        </blockquote>
                      ))}
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>

            <div className="mt-4 flex flex-wrap gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    disabled={disabled || !item.canConfirm || Boolean(busyProposalId)}
                    loading={busy}
                    data-agent-action="confirm_historical_state_candidate"
                    data-agent-risk="high"
                    data-agent-target={item.proposal.id}
                  >
                    <ShieldCheck size={14} aria-hidden="true" />确认写入本机状态
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认 {chapterLabel} 的状态候选？</AlertDialogTitle>
                    <AlertDialogDescription>
                      这会把已定位的状态变化写入本机主宇宙，供后续章节召回；历史正文不会改变。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>返回看证据</AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button type="button" onClick={() => onConfirm(item)}>确认写入</Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={disabled || Boolean(busyProposalId)}
                    data-agent-action="reject_historical_state_candidate"
                    data-agent-risk="high"
                    data-agent-target={item.proposal.id}
                  >
                    <X size={14} aria-hidden="true" />拒绝候选
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>拒绝 {chapterLabel} 的状态候选？</AlertDialogTitle>
                    <AlertDialogDescription>
                      这条候选会退出待确认列表，历史正文和本机主宇宙都不会改变。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>继续审阅</AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button type="button" variant="destructive" onClick={() => onReject(item)}>确认拒绝</Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </article>
        )
      })}
    </div>
  )
}
