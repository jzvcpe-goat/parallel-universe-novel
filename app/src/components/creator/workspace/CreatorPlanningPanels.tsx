import { type ReactNode, useState } from 'react'
import { CheckCircle2, FileText, ListFilter, Route as RouteIcon, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

const workspaceEditorCardClass =
  'border-[var(--creator-border)] bg-[var(--creator-editor-bg)] text-[var(--creator-editor-text)] shadow-none'
const workspaceGlassCardClass =
  'border-[var(--creator-border)] bg-[var(--creator-surface)] text-[var(--creator-text)]'
const workspacePanelClass =
  'rounded-2xl border border-[var(--creator-border)] bg-[var(--creator-editor-control)]'
const workspaceAccentPanelClass =
  'border-[var(--creator-accent)] bg-[var(--creator-accent-soft)]'
const workspaceInteractivePanelClass =
  'transition hover:-translate-y-0.5 hover:border-[var(--creator-accent)] hover:bg-[var(--creator-accent-soft)]'
const workspaceDividerClass = 'border-[var(--creator-editor-line)]'

export interface CreatorFlowStep {
  id: string
  label: string
  hint: string
  ready?: boolean
  active?: boolean
}

export type CreatorStoryFlowStageId = 'seed' | 'shape' | 'plan' | 'draft' | 'review' | 'repair' | 'commit' | 'continue'
export type CreatorStoryFlowActiveStep = 'intent' | 'scene' | 'draft' | 'memory' | 'publish'

export interface CreatorStoryFlowRailProps {
  activeStep: CreatorStoryFlowActiveStep
  titleReady: boolean
  contentReady: boolean
  destinationReady: boolean
  hasLinkedEcho: boolean
  onStageSelect: (stage: CreatorStoryFlowStageId) => void
  className?: string
}

export function CreatorStoryFlowRail({
  activeStep,
  titleReady,
  contentReady,
  destinationReady,
  hasLinkedEcho,
  onStageSelect,
  className,
}: CreatorStoryFlowRailProps) {
  const activeStage: CreatorStoryFlowStageId = activeStep === 'intent'
    ? 'seed'
    : activeStep === 'scene'
      ? 'plan'
      : activeStep === 'draft'
        ? 'draft'
        : activeStep === 'memory'
          ? 'review'
          : 'commit'
  const stages: CreatorFlowStep[] = [
    { id: 'seed', label: '故事种子', hint: hasLinkedEcho ? '外界回声已接入' : '先定读者追问', ready: hasLinkedEcho },
    { id: 'shape', label: '结构成型', hint: '拆成场景与代价', ready: hasLinkedEcho || activeStep !== 'intent' },
    { id: 'plan', label: '章节规划', hint: '确认本章写法', ready: true },
    { id: 'draft', label: '正文生成', hint: contentReady ? '已有正文' : '等待第一段', ready: contentReady },
    { id: 'review', label: '质量问题卡', hint: contentReady ? '可看问题' : '先有正文', ready: contentReady },
    { id: 'repair', label: '修复调整', hint: contentReady ? '可生成候选' : '先补一段', ready: contentReady },
    { id: 'commit', label: '发布确认', hint: titleReady && destinationReady ? '可看影响' : '补齐标题去向', ready: titleReady && contentReady && destinationReady },
    { id: 'continue', label: '继续创作', hint: titleReady && contentReady && destinationReady ? '进入下一步' : '完成当前章', ready: titleReady && contentReady && destinationReady },
  ].map(stage => ({ ...stage, active: activeStage === stage.id }))

  return <CreatorFlowStepper className={className} steps={stages} onStepSelect={stage => onStageSelect(stage as CreatorStoryFlowStageId)} />
}

export interface CreatorFlowStepperProps {
  steps: CreatorFlowStep[]
  onStepSelect: (id: string) => void
  className?: string
}

export function CreatorFlowStepper({ steps, onStepSelect, className }: CreatorFlowStepperProps) {
  const activeIndex = Math.max(0, steps.findIndex(step => step.active))
  const activeStep = steps[activeIndex] || steps[0]
  const readyCount = steps.filter(step => step.ready).length

  return (
    <Card
      variant="glass"
      padding="none"
      className={cn('p-2.5 max-xl:p-[0.7rem]', workspaceEditorCardClass, className)}
      aria-label="章节创作流程"
      data-slot="creator-flow-stepper"
    >
      <CardHeader className="flex-row items-center justify-between gap-3 p-0 pb-1.5" data-slot="creator-flow-stepper-header">
        <div className="flex items-center gap-2">
          <RouteIcon size={16} className="text-[var(--creator-accent)]" />
          <CardTitle className="text-sm text-[var(--creator-editor-text)]">章节流程</CardTitle>
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2" data-slot="creator-flow-current">
          <Badge variant="outline">已就绪 {readyCount}/{steps.length}</Badge>
          <CardDescription className="line-clamp-1 min-w-0 text-right text-xs font-semibold text-[var(--creator-text-dim)]">
            第 {activeIndex + 1} 步 · {activeStep?.label || '继续写作'} · {activeStep?.hint || '继续写作'}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div
          className="-mx-[0.08rem] flex gap-1.5 overflow-x-auto px-[0.08rem] pb-0.5 [scrollbar-color:var(--creator-accent)_var(--creator-editor-control)] [scrollbar-width:thin] max-xl:hidden [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--creator-editor-line)] [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-[var(--creator-editor-control)] hover:[&::-webkit-scrollbar-thumb]:bg-[var(--creator-accent)]"
          aria-label="章节步骤导航"
          data-slot="creator-flow-track"
        >
          {steps.map((step, index) => (
            <Button
              key={step.id}
              type="button"
              variant="ghost"
              onClick={() => onStepSelect(step.id)}
              aria-current={step.active ? 'step' : undefined}
              className={cn(
                'inline-flex h-8 min-w-20 justify-start gap-1.5 rounded-full px-2.5 py-1 text-left text-[var(--creator-text-muted)] shadow-none',
                workspacePanelClass,
                workspaceInteractivePanelClass,
                step.ready && 'text-[var(--creator-editor-text)]',
                step.active && workspaceAccentPanelClass,
              )}
              data-slot="creator-flow-step"
            >
              <span className={cn('inline-flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-full border border-current text-[0.62rem] font-black', step.active && 'border-[var(--creator-accent)] bg-[var(--creator-accent)] text-[var(--creator-bg)]')}>
                {index + 1}
              </span>
              <span className="line-clamp-1 text-xs font-black leading-4">{step.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export interface CreatorPrivateDraftItem {
  id: string
  title: string
  updatedLabel: string
  onOpen: () => void
}

export interface CreatorPrivateDraftPanelProps {
  title: string
  items: CreatorPrivateDraftItem[]
  emptyTitle: string
  emptyDescription: string
  className?: string
}

export function CreatorPrivateDraftPanel({ title, items, emptyTitle, emptyDescription, className }: CreatorPrivateDraftPanelProps) {
  return (
    <Card className={cn('creator-private-draft-panel', workspaceGlassCardClass, className)} variant="glass" padding="md">
      <CardHeader className="p-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[var(--creator-accent)]" />
            <CardTitle className="text-lg text-[var(--creator-text)]">{title}</CardTitle>
          </div>
          <Badge variant="outline">{items.length ? `${items.length} 篇` : '空'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="mt-4 p-0">
        {items.length ? (
          <div className="grid gap-2">
            {items.map(item => (
              <Button
                key={item.id}
                type="button"
                variant="outline"
                size="sm"
                className="creator-private-draft-row h-auto justify-start whitespace-normal py-3 text-left"
                data-agent-action="open_draft"
                data-agent-risk="low"
                data-agent-target={item.id}
                onClick={item.onOpen}
              >
                <span className="grid gap-1">
                  <strong className="text-sm leading-5">{item.title}</strong>
                  <small className="text-xs leading-5 opacity-75">{item.updatedLabel}</small>
                </span>
              </Button>
            ))}
          </div>
        ) : (
          <section className={cn(workspacePanelClass, 'p-4')}>
            <strong className="block text-sm font-black text-[var(--creator-text)]">{emptyTitle}</strong>
            <p className="mt-2 text-xs leading-5 text-[var(--creator-text-muted)]">{emptyDescription}</p>
          </section>
        )}
      </CardContent>
    </Card>
  )
}

export interface CreatorNextActionPanelProps {
  eyebrow: string
  directionLabel: string
  title: string
  description: string
  confirmLabel: string
  continueLabel: string
  onConfirm: () => void
  onContinue: () => void
  className?: string
}

export function CreatorNextActionPanel({ eyebrow, directionLabel, title, description, confirmLabel, continueLabel, onConfirm, onContinue, className }: CreatorNextActionPanelProps) {
  return (
    <Card variant="glass" padding="md" className={cn('creator-next-action-panel mt-4', workspaceEditorCardClass, className)}>
      <CardContent className="flex flex-col gap-4 p-0 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="gold">{eyebrow}</Badge>
            <Badge variant="outline">{directionLabel}</Badge>
          </div>
          <h3 className="mt-3 text-xl font-semibold text-[var(--creator-editor-text)]">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--creator-text-muted)]">{description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" onClick={onConfirm}><CheckCircle2 size={15} />{confirmLabel}</Button>
          <Button variant="gold" onClick={onContinue}><Sparkles size={15} />{continueLabel}</Button>
        </div>
      </CardContent>
    </Card>
  )
}

export interface CreatorNextBestActionCardProps {
  hasLinkedEcho: boolean
  contentReady: boolean
  directionLabel: string
  onConfirmGoal: () => void
  onContinueDraft: () => void
  className?: string
}

export function CreatorNextBestActionCard({ hasLinkedEcho, contentReady, directionLabel, onConfirmGoal, onContinueDraft, className }: CreatorNextBestActionCardProps) {
  const description = contentReady
    ? '正文已有基础，可以先看读者承诺和故事影响，再进入发布包确认。'
    : hasLinkedEcho
      ? '先把读者想看的选择写成一场戏，再让人物承担一个明确代价。'
      : '先给这一章定一个目标，再写第一段正文。'

  return (
    <CreatorNextActionPanel
      eyebrow="现在建议"
      directionLabel={directionLabel}
      title={contentReady ? '先做发布前检查' : '先确定本章要兑现什么'}
      description={description}
      confirmLabel="确认目标"
      continueLabel="继续正文"
      onConfirm={onConfirmGoal}
      onContinue={onContinueDraft}
      className={className}
    />
  )
}

export interface CreatorCollapsibleOutlineProps {
  title: string
  description: string
  children: ReactNode
  className?: string
}

export function CreatorCollapsibleOutline({ title, description, children, className }: CreatorCollapsibleOutlineProps) {
  const [open, setOpen] = useState(false)
  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn('creator-collapsible-outline mt-3 overflow-hidden text-[var(--creator-editor-text)]', workspacePanelClass, className)}>
      <CollapsibleTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-auto w-full justify-between gap-4 rounded-none px-4 py-3 text-left hover:bg-[var(--creator-accent-soft)]" aria-expanded={open}>
          <span className="text-sm font-black">{title}</span>
          <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--creator-text-muted)]">
            {description}
            <ListFilter className={cn('creator-assistant-detail-icon', open && 'is-open')} size={13} />
          </span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className={cn('border-t p-3', workspaceDividerClass)}>{children}</CollapsibleContent>
    </Collapsible>
  )
}

export interface CreatorChapterGoalBrief {
  label: string
  value: string
  detail: string
}

export interface CreatorChapterDirectionOption {
  id: string
  label: string
  title: string
  summary: string
  strength: string
  risk: string
  bestFor: string
  promise: string
}

export interface CreatorChapterPlannerPanelProps {
  goalBriefs: CreatorChapterGoalBrief[]
  directions: CreatorChapterDirectionOption[]
  selectedDirection: string
  onDirectionChange: (directionId: string) => void
  onConfirmGoal: () => void
  onAdjustGoal: () => void
  onReplan: () => void
  className?: string
}

export function CreatorChapterPlannerPanel({ goalBriefs, directions, selectedDirection, onDirectionChange, onConfirmGoal, onAdjustGoal, onReplan, className }: CreatorChapterPlannerPanelProps) {
  return (
    <Card
      className={cn(workspaceGlassCardClass, className)}
      variant="glass"
      padding="md"
      data-slot="creator-chapter-planner"
    >
      <CardHeader className="p-0">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div><Badge variant="outline">本章写法</Badge><CardTitle className="mt-3 text-lg text-[var(--creator-editor-text)]">先定目标，再写正文</CardTitle></div>
          <CardDescription className="max-w-md text-[var(--creator-text-muted)]">选择一种写法，正文候选会按这个方向展开。</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="mt-4 space-y-4 p-0">
        <section
          className={cn(workspacePanelClass, 'grid gap-3 p-3')}
          aria-label="本章目标"
          data-slot="creator-chapter-goal"
        >
          <div className="flex flex-wrap items-center justify-between gap-2" data-slot="creator-chapter-goal-header">
            <span className="inline-flex items-center gap-2 text-sm font-black text-[var(--creator-editor-text)]">
              <FileText size={15} className="text-[var(--creator-confirm)]" />
              本章目标
            </span>
            <p className="text-xs font-semibold text-[var(--creator-text-dim)]">先确认目标，再进入写法候选</p>
          </div>
          <ol className="grid gap-2 md:grid-cols-2" data-slot="creator-chapter-goal-list">
            {goalBriefs.map((goal, index) => (
              <li
                key={goal.label}
                className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 rounded-xl border border-[var(--creator-editor-line)] bg-[var(--creator-editor-control-strong)] p-3 text-[var(--creator-editor-text)]"
                data-slot="creator-chapter-goal-item"
              >
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-lg border border-[var(--creator-accent)] bg-[var(--creator-accent-soft)] text-xs font-black text-[var(--creator-accent)]">
                  {index + 1}
                </span>
                <span className="grid min-w-0 gap-1">
                  <span className="text-xs font-black text-[var(--creator-accent)]">{goal.label}</span>
                  <strong className="text-sm leading-5 text-[var(--creator-editor-text)]">{goal.value}</strong>
                  <span className="text-xs font-semibold leading-5 text-[var(--creator-text-dim)]">{goal.detail}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-2" data-slot="creator-chapter-goal-actions">
            <Button type="button" variant="gold" size="sm" onClick={onConfirmGoal}>确认这个目标</Button>
            <Button type="button" variant="outline" size="sm" onClick={onAdjustGoal}>调整目标</Button>
            <Button type="button" variant="ghost" size="sm" onClick={onReplan}>重新规划</Button>
          </div>
        </section>
        <Badge className="w-fit gap-2" variant="outline" data-slot="creator-direction-label">
          <Sparkles size={14} />
          写法候选
        </Badge>
        <div className="grid gap-3 md:grid-cols-3" data-slot="creator-direction-list">
          {directions.map(item => {
            const selected = selectedDirection === item.id
            return (
              <Button
                key={item.id}
                type="button"
                variant={selected ? 'gold' : 'outline'}
                size="sm"
                className="grid h-auto min-h-[13.75rem] content-start items-start justify-items-stretch gap-2 whitespace-normal rounded-xl p-4 text-left"
                aria-pressed={selected}
                onClick={() => onDirectionChange(item.id)}
                data-slot="creator-direction-option"
              >
                <span className={cn('text-xs font-black', selected ? 'text-[var(--creator-editor-text)]' : 'text-[var(--creator-accent)]')}>
                  {item.label} · {item.bestFor}
                </span>
                <strong className="text-base text-[var(--creator-editor-text)]">{item.title}</strong>
                <span className="text-sm font-medium leading-6 text-[var(--creator-text-muted)]">{item.summary}</span>
                <Badge
                  className={cn('w-fit whitespace-normal text-left', selected && 'border-[var(--creator-editor-text)] text-[var(--creator-editor-text)]')}
                  variant="outline"
                >
                  {item.promise}
                </Badge>
                <dl className="mt-auto grid w-full gap-2 pt-1 text-xs leading-5" data-slot="creator-direction-impact">
                  <div className="grid gap-1 rounded-lg border border-[var(--creator-editor-line)] bg-[var(--creator-editor-control)] px-3 py-2">
                    <dt className="font-black text-[var(--creator-editor-text)]">优点</dt>
                    <dd className="text-[var(--creator-text-muted)]">{item.strength}</dd>
                  </div>
                  <div className="grid gap-1 rounded-lg border border-[var(--creator-editor-line)] bg-[var(--creator-editor-control)] px-3 py-2">
                    <dt className="font-black text-[var(--creator-editor-text)]">风险</dt>
                    <dd className="text-[var(--creator-text-muted)]">{item.risk}</dd>
                  </div>
                </dl>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
