import { GitBranch, Save, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

const statusCardClass =
  'border-[var(--creator-border)] bg-[var(--creator-surface)] text-[var(--creator-text)]'
const panelClass =
  'rounded-2xl border border-[var(--creator-border)] bg-[var(--creator-editor-control)]'
const panelStrongClass =
  'rounded-2xl border border-[var(--creator-border-strong)] bg-[var(--creator-editor-control-strong)]'

export interface CreatorAuthorStatusPanelProps {
  title: string
  stateLabel: string
  boundaryCopy: string
  ready?: boolean
  openedAt?: string
  className?: string
}

export function CreatorAuthorStatusPanel({
  title,
  stateLabel,
  boundaryCopy,
  ready,
  openedAt,
  className,
}: CreatorAuthorStatusPanelProps) {
  return (
    <Card className={cn('creator-author-status-panel', statusCardClass, className)} variant="glass" padding="md">
      <CardHeader className="p-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[var(--creator-confirm)]" />
            <CardTitle className="text-lg text-[var(--creator-text)]">{title}</CardTitle>
          </div>
          <Badge variant={ready ? 'stasis' : 'outline'}>{ready ? '可写作' : '待确认'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="mt-4 space-y-3 p-0">
        <section className={cn(panelStrongClass, 'p-3')}>
          <span className="text-xs font-bold text-[var(--creator-text-dim)]">当前状态</span>
          <strong className="mt-1 block text-sm font-black text-[var(--creator-text)]">{stateLabel}</strong>
        </section>
        <section className={cn(panelClass, 'p-3')}>
          <p className="text-sm leading-6 text-[var(--creator-text-muted)]">{boundaryCopy}</p>
        </section>
        {openedAt ? (
          <p className="text-xs leading-5 text-[var(--creator-text-dim)]">开通时间：{openedAt}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export interface CreatorCanonCommitBarProps {
  titleReady: boolean
  contentReady: boolean
  destinationReady: boolean
  hasLinkedEcho: boolean
  directionLabel: string
  destinationLabel: string
  blockers: string[]
  saveDisabled: boolean
  publishDisabled: boolean
  saveLoading: boolean
  publishLoading: boolean
  saveLabel: string
  publishLabel: string
  onSaveDraft: () => void
  onKeepBranch: () => void
  onEnterPublishCheck: () => void
  className?: string
}

export function CreatorCanonCommitBar({
  titleReady,
  contentReady,
  destinationReady,
  hasLinkedEcho,
  directionLabel,
  destinationLabel,
  blockers,
  saveDisabled,
  publishDisabled,
  saveLoading,
  publishLoading,
  saveLabel,
  publishLabel,
  onSaveDraft,
  onKeepBranch,
  onEnterPublishCheck,
  className,
}: CreatorCanonCommitBarProps) {
  const ready = titleReady && contentReady && destinationReady
  const missingLabel = blockers.join('、') || '必要信息'
  const commitmentLabel = hasLinkedEcho ? '回应读者愿望' : '自主推进'
  const impactRows = [
    { label: '正文', value: contentReady ? '可审阅' : '待补正文', ready: contentReady },
    { label: '去向', value: destinationReady ? destinationLabel : '待选择', ready: destinationReady },
    { label: '回声', value: commitmentLabel, ready: true },
    { label: '方向', value: directionLabel, ready: true },
  ]
  const decisionRows = [
    {
      label: '发布前决定',
      title: ready ? '确认这条世界线成为正式剧情' : '先补齐缺少的内容',
      body: ready
        ? '标题、正文和去向已经具备；下一步进入发布包确认，仍需人工确认。'
        : `还差：${missingLabel}。先保持在草稿区，不进入公开流程。`,
      ready,
    },
    {
      label: '读者承诺',
      title: hasLinkedEcho ? '这章会回应一条读者愿望' : '这章由作者主动推进',
      body: hasLinkedEcho
        ? '发布包会保留愿望来源，方便读者看到这次更新回应了什么。'
        : '没有关联愿望时，建议先确认本章承诺足够清楚。',
      ready: hasLinkedEcho,
    },
    {
      label: '下一章接力',
      title: '下一章仍会停下确认',
      body: '进入发布包确认不等于连续公开；每章都先审阅、看影响，再由作者决定。',
      ready: true,
    },
  ]
  const choiceRows = [
    {
      label: '只保存草稿',
      body: '暂不改变读者看到的内容，适合继续打磨。',
      icon: <Save size={15} />,
      action: onSaveDraft,
      disabled: saveDisabled,
      loading: saveLoading,
      buttonLabel: saveLabel,
      variant: 'outline' as const,
    },
    {
      label: '保留为 IF 支线',
      body: '把这次走向放入分支候选，先不影响主线。',
      icon: <GitBranch size={15} />,
      action: onKeepBranch,
      disabled: !contentReady || saveLoading || publishLoading,
      loading: false,
      buttonLabel: '保留为 IF 支线',
      variant: 'outline' as const,
    },
    {
      label: '发布到主线',
      body: '进入发布包确认，确认后才会成为正式剧情。',
      icon: <ShieldCheck size={15} />,
      action: onEnterPublishCheck,
      disabled: publishDisabled,
      loading: publishLoading,
      buttonLabel: publishLabel,
      variant: 'gold' as const,
    },
  ]

  return (
    <Collapsible className={cn('creator-canon-bar', className)} aria-label="正式剧情确认">
      <div className="creator-canon-summary">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={ready ? 'gold' : 'outline'}>正式剧情确认</Badge>
            <Badge variant="outline">{ready ? '可以进入发布包确认' : `还差 ${blockers.length || 1} 项`}</Badge>
          </div>
          <h3 className="mt-3 text-base font-semibold text-[var(--creator-editor-text)]">
            {ready ? '发布到主线前先确认' : '先把正文、标题和去向补齐'}
          </h3>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--creator-text-muted)]">
            {ready
              ? '正文、标题和去向都具备了。进入发布包确认前，可以先看详细影响。'
              : `还差：${missingLabel}。先保持在草稿区，不进入公开流程。`}
          </p>
          <div className="creator-canon-impact mt-3">
            {impactRows.map(row => (
              <span key={row.label} className={row.ready ? 'is-ready' : ''}>
                <strong>{row.label}</strong>
                {row.value}
              </span>
            ))}
          </div>
        </div>
        <div className="creator-canon-primary-actions">
          <Button variant="outline" size="sm" className="creator-canon-choice-action" onClick={onSaveDraft} disabled={saveDisabled} loading={saveLoading}>
            <Save size={15} />
            {saveLabel}
          </Button>
          <Button variant="gold" size="sm" className="creator-canon-choice-action" onClick={onEnterPublishCheck} disabled={publishDisabled} loading={publishLoading}>
            <ShieldCheck size={15} />
            {publishLabel}
          </Button>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="creator-canon-detail-trigger">详细处理</Button>
          </CollapsibleTrigger>
        </div>
      </div>

      <CollapsibleContent className="creator-canon-detail-content">
        <div className="creator-canon-decision-grid">
          {decisionRows.map(row => (
            <article key={row.label} className={`creator-canon-decision-row ${row.ready ? 'is-ready' : 'needs-attention'}`}>
              <span>{row.label}</span>
              <strong>{row.title}</strong>
              <small>{row.body}</small>
            </article>
          ))}
        </div>
        <div className="creator-canon-actions">
          <div className="creator-canon-choice-grid">
            <p className="creator-canon-choice-title">更多处理方式</p>
            {choiceRows.map(choice => (
              <div key={choice.label} className={`creator-canon-choice-row is-${choice.variant}`}>
                <span>
                  <strong>{choice.label}</strong>
                  <small>{choice.body}</small>
                </span>
                <Button variant={choice.variant} className="creator-canon-choice-action" onClick={choice.action} disabled={choice.disabled} loading={choice.loading}>
                  {choice.icon}
                  {choice.buttonLabel}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
