import { ListFilter, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const workspaceGlassCardClass =
  'border-[var(--creator-border)] bg-[var(--creator-surface)] text-[var(--creator-text)]'
const workspacePanelClass =
  'rounded-2xl border border-[var(--creator-border)] bg-[var(--creator-editor-control)]'
const workspacePanelStrongClass =
  'rounded-2xl border border-[var(--creator-border-strong)] bg-[var(--creator-editor-control-strong)]'
const workspaceAccentPanelClass =
  'border-[var(--creator-accent)] bg-[var(--creator-accent-soft)]'
const workspaceConfirmPanelClass =
  'border-[var(--creator-confirm)] bg-[var(--creator-task-publish-bg)]'
const workspaceInteractivePanelClass =
  'transition hover:-translate-y-0.5 hover:border-[var(--creator-accent)] hover:bg-[var(--creator-accent-soft)]'

export interface CreatorDecisionOption {
  label: string
  impact: string
  onClick: () => void
}

export interface CreatorDecisionCard {
  kind: string
  title: string
  summary: string
  why: string
  ready?: boolean
  priority: 'high' | 'medium' | 'low'
  options: CreatorDecisionOption[]
}

export interface CreatorNextDecision {
  label: string
  title: string
  summary: string
  actionLabel: string
  onClick: () => void
}

export interface CreatorDecisionQueueProps {
  readyLabel: string
  nextAction: CreatorNextDecision
  cards: CreatorDecisionCard[]
  className?: string
}

export interface CreatorEditorDecisionQueuePanelProps {
  titleReady: boolean
  contentReady: boolean
  destinationReady: boolean
  hasLinkedRequest: boolean
  directionLabel: string
  onFocusDraft: () => void
  onFocusPublish: () => void
  onAskQuestion: () => void
  onFixDraft: () => void
  onOpenState: () => void
  onOpenBranch: () => void
  className?: string
}

export function CreatorEditorDecisionQueuePanel({
  titleReady,
  contentReady,
  destinationReady,
  hasLinkedRequest,
  directionLabel,
  onFocusDraft,
  onFocusPublish,
  onAskQuestion,
  onFixDraft,
  onOpenState,
  onOpenBranch,
  className,
}: CreatorEditorDecisionQueuePanelProps) {
  const cards: CreatorDecisionCard[] = [
    {
      kind: '创作问题',
      title: hasLinkedRequest ? '读者真正想看的是什么？' : '这一章先承诺什么？',
      summary: hasLinkedRequest ? '先把读者原话拆成想看的人、选择和代价。' : `当前是${directionLabel}，需要先明确本章最想让读者追问的点。`,
      why: '问题先定下来，正文候选才不会散成设定说明。',
      ready: hasLinkedRequest,
      priority: hasLinkedRequest ? 'low' : 'high',
      options: [
        { label: '回答问题', impact: '把判断收进下一步候选。', onClick: onAskQuestion },
        { label: '调整方向', impact: '重新选择本章推进方式。', onClick: onFocusDraft },
      ],
    },
    {
      kind: '修复建议',
      title: contentReady ? '先修正文里最弱的一处' : '先写出可判断的一段',
      summary: contentReady ? '已有正文，可以先看段落力度、尾钩和读者承诺。' : '没有正文时，修复动作会先变成候选，不会改动草稿。',
      why: contentReady ? '修复要贴着正文发生，不能停留在抽象建议。' : '先有一段，后面的审阅、故事影响和发布包确认才有对象。',
      ready: contentReady,
      priority: contentReady ? 'medium' : 'high',
      options: [
        { label: contentReady ? '补强段落' : '续写候选', impact: '生成一段可采用的候选。', onClick: onFixDraft },
        { label: '试分支', impact: '大改先进支线试写比较。', onClick: onOpenBranch },
      ],
    },
    {
      kind: '发布判断',
      title: titleReady && destinationReady ? '进入发布前确认' : '发布前还缺关键信息',
      summary: titleReady && destinationReady ? '标题和去向已具备，可以查看这章会改变什么。' : '发布前需要补齐标题和主线/IF 支线去向。',
      why: '作者确认前，更新只应该停留在草稿或支线候选里。',
      ready: destinationReady && titleReady,
      priority: titleReady && destinationReady ? 'medium' : 'high',
      options: [
        { label: '看影响', impact: '查看人物、读者已知和世界线位置。', onClick: onOpenState },
        { label: '确认发布包', impact: '只进入确认，不直接公开。', onClick: onFocusPublish },
      ],
    },
  ]
  const readyCount = cards.filter(card => card.ready).length
  const nextAction: CreatorNextDecision = !hasLinkedRequest
    ? { label: '现在先做', title: '先问清这一章要兑现什么', summary: '没有外界回声时，先把本章最想让读者追问的点定下来。', actionLabel: '回答问题', onClick: onAskQuestion }
    : !contentReady
      ? { label: '现在先做', title: '先写出一段可判断正文', summary: '有读者愿望但还没有正文，先生成一段候选，再做审阅和修复。', actionLabel: '续写候选', onClick: onFixDraft }
      : !titleReady || !destinationReady
        ? { label: '现在先做', title: '补齐发布前关键信息', summary: '正文已有基础，先确认标题和去向，再看故事影响。', actionLabel: '确认发布包', onClick: onFocusPublish }
        : { label: '现在先做', title: '查看这章会改变什么', summary: '进入发布前，先看人物、读者已知和世界线位置是否一致。', actionLabel: '看影响', onClick: onOpenState }

  return <CreatorDecisionQueue readyLabel={`${readyCount}/${cards.length}`} nextAction={nextAction} cards={cards} className={className} />
}

export function CreatorDecisionQueue({ readyLabel, nextAction, cards, className }: CreatorDecisionQueueProps) {
  return (
    <Card className={cn('creator-decision-queue', workspaceGlassCardClass, className)} variant="glass" padding="md">
      <CardHeader className="p-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><ListFilter size={18} className="text-[var(--creator-accent)]" /><CardTitle className="text-lg text-[var(--creator-text)]">决策队列</CardTitle></div>
            <CardDescription className="mt-2 text-sm leading-6 text-[var(--creator-text-muted)]">把问题、修复和发布分开处理；每次只推进一个明确决定。</CardDescription>
          </div>
          <Badge variant="outline">{readyLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="mt-4 space-y-4 p-0">
        <section className={cn(workspacePanelStrongClass, 'p-3.5')}>
          <div className="flex items-center justify-between gap-3"><Badge variant="gold">{nextAction.label}</Badge><em className="text-xs not-italic text-[var(--creator-text-dim)]">下一步动作</em></div>
          <h3 className="mt-3 text-base font-black text-[var(--creator-text)]">{nextAction.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--creator-text-muted)]">{nextAction.summary}</p>
          <Button type="button" variant="gold" size="sm" className="mt-3" onClick={nextAction.onClick}><Sparkles size={14} />{nextAction.actionLabel}</Button>
        </section>
        <div className="flex items-center justify-between gap-3 text-xs font-black text-[var(--creator-text-muted)]"><span>队列优先级</span><em className="not-italic text-[var(--creator-text-dim)]">逐张处理，不自动改正文</em></div>
        <div className="grid gap-3">
          {cards.map((card, index) => (
            <article key={card.kind} className={cn('p-3.5', workspacePanelClass, workspaceInteractivePanelClass, card.ready && workspaceConfirmPanelClass, card.priority === 'high' && workspaceAccentPanelClass)}>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-[var(--creator-border)] text-[0.66rem] font-black text-[var(--creator-accent)]">{String(index + 1).padStart(2, '0')}</span>
                <Badge variant={card.ready ? 'gold' : 'outline'}>{card.kind}</Badge>
                <span className="ml-auto text-xs font-bold text-[var(--creator-text-dim)]">{card.ready ? '可推进' : '待判断'}</span>
              </div>
              <h3 className="mt-3 text-sm font-black leading-5 text-[var(--creator-text)]">{card.title}</h3>
              <p className="mt-2 text-xs leading-5 text-[var(--creator-text-muted)]">{card.summary}</p>
              <div className="mt-3 border-l-2 border-[var(--creator-accent)] pl-3"><strong className="block text-xs font-black text-[var(--creator-accent)]">为什么重要</strong><span className="mt-1 block text-xs leading-5 text-[var(--creator-text-muted)]">{card.why}</span></div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {card.options.map(option => (
                  <Button key={option.label} type="button" variant="outline" size="sm" className="h-auto justify-start whitespace-normal py-2 text-left" onClick={option.onClick}>
                    <span className="grid gap-1"><span>{option.label}</span><small className="text-[0.68rem] font-medium leading-4 opacity-75">{option.impact}</small></span>
                  </Button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
