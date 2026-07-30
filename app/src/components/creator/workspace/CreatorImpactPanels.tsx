import type { ReactNode } from 'react'
import { GitBranch, ListFilter, Plus } from 'lucide-react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const workspaceAssistantCardClass =
  'border-[var(--creator-assistant-border)] bg-[var(--creator-assistant-bg)] text-[var(--creator-assistant-text)] shadow-none'
const reducedTransparencyClass =
  '[@media(prefers-reduced-transparency:reduce)]:bg-[var(--creator-surface-strong)] [[data-creator-transparency=reduced]_&]:bg-[var(--creator-surface-strong)]'
const stateSummarySurfaceClass =
  'min-h-16 rounded-[14px] border border-[var(--creator-border)] bg-[var(--creator-state-summary-bg)] p-[0.72rem] text-[0.78rem] font-extrabold leading-[1.35] text-[var(--creator-text)]'
const stateImpactSurfaceClass =
  "relative overflow-hidden rounded-2xl border border-[var(--creator-border)] bg-[var(--creator-state-impact-bg)] p-[0.86rem] [box-shadow:var(--creator-state-impact-shadow)] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-[var(--creator-accent)] before:content-[''] before:opacity-[0.78]"
const stateRiskSurfaceClass =
  'mt-[0.78rem] flex items-start gap-[0.55rem] rounded-[13px] border border-[var(--creator-border)] bg-[var(--creator-editor-control)] p-[0.55rem]'
const stateActionSurfaceClass =
  'flex items-center justify-between gap-3 rounded-[15px] border border-[var(--creator-accent)] bg-[var(--creator-state-action-bg)] px-[0.85rem] py-[0.78rem] max-[720px]:flex-col max-[720px]:items-start'

export interface CreatorStateDiffSummaryItem {
  label: string
  value: string
}

export interface CreatorStateDiffImpactCard {
  label: string
  icon?: ReactNode
  before: string
  after: string
  risk: string
  tone: 'calm' | 'warm' | 'strong'
}

export interface CreatorStateDiffPanelProps {
  summaryItems: CreatorStateDiffSummaryItem[]
  impactCards: CreatorStateDiffImpactCard[]
  statusLabel: string
  statusVariant?: BadgeProps['variant']
  actionCopy: string
  title?: string
  kicker?: string
  className?: string
}

export function CreatorStateDiffPanel({
  summaryItems,
  impactCards,
  statusLabel,
  statusVariant = 'outline',
  actionCopy,
  title = '本次更新会改变什么',
  kicker = '发布前影响',
  className,
}: CreatorStateDiffPanelProps) {
  return (
    <Card
      data-slot="creator-state-diff"
      className={cn(workspaceAssistantCardClass, 'grid gap-4', className)}
      variant="glass"
      padding="sm"
      role="complementary"
      aria-label={title}
    >
      <CardHeader data-slot="creator-state-diff-header" className="flex-row items-start justify-between gap-3 p-0 max-[720px]:flex-col">
        <div className="flex items-center gap-2">
          <GitBranch size={18} className="text-[var(--creator-accent)]" />
          <div>
            <p data-slot="creator-state-diff-kicker" className="mb-[0.1rem] text-[0.68rem] font-black tracking-[0.08em] text-[var(--creator-accent)]">
              {kicker}
            </p>
            <CardTitle className="text-lg text-[var(--creator-assistant-text)]">{title}</CardTitle>
          </div>
        </div>
        <Badge variant={statusVariant}>{statusLabel}</Badge>
      </CardHeader>

      <CardContent className="p-0">
        <dl data-slot="creator-state-summary" className="grid grid-cols-3 gap-[0.55rem] max-[720px]:grid-cols-1" aria-label="影响摘要">
          {summaryItems.map(item => (
            <div key={item.label} data-slot="creator-state-summary-item" className={cn(stateSummarySurfaceClass, reducedTransparencyClass)}>
              <dt className="mb-[0.28rem] text-[0.66rem] font-black text-[var(--creator-text-dim)]">{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>

        <div data-slot="creator-state-impact-list" className="mt-4 grid gap-[0.65rem]">
          {impactCards.map(card => (
            <article
              key={card.label}
              data-slot="creator-state-impact-card"
              data-tone={card.tone}
              className={cn(
                stateImpactSurfaceClass,
                reducedTransparencyClass,
                card.tone === 'strong' && 'border-[var(--creator-accent)] bg-[var(--creator-state-impact-strong-bg)]',
                card.tone === 'warm' && 'before:bg-[var(--creator-confirm)]',
              )}
            >
              <div data-slot="creator-state-impact-title" className="flex items-center gap-[0.55rem]">
                <span className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-[10px] border border-[var(--creator-border)] bg-[var(--creator-accent-soft)] text-[var(--creator-accent)]">
                  {card.icon}
                </span>
                <strong className="text-[0.9rem] font-black text-[var(--creator-text)]">{card.label}</strong>
              </div>
              <dl data-slot="creator-state-before-after" className="mt-[0.72rem] grid gap-2">
                <div className="grid grid-cols-[4.2rem_1fr] gap-[0.55rem] text-[0.78rem] leading-[1.55] text-[var(--creator-text-muted)] max-[720px]:grid-cols-1">
                  <dt className="font-black text-[var(--creator-text-dim)]">现在</dt>
                  <dd>{card.before}</dd>
                </div>
                <div className="grid grid-cols-[4.2rem_1fr] gap-[0.55rem] text-[0.78rem] leading-[1.55] text-[var(--creator-text-muted)] max-[720px]:grid-cols-1">
                  <dt className="font-black text-[var(--creator-text-dim)]">发布后</dt>
                  <dd>{card.after}</dd>
                </div>
              </dl>
              <div data-slot="creator-state-risk" className={cn(stateRiskSurfaceClass, reducedTransparencyClass)}>
                <Badge variant={card.tone === 'strong' ? 'outline' : 'gold'}>{card.tone === 'strong' ? '先看' : '稳定'}</Badge>
                <span className="text-[0.72rem] leading-[1.55] text-[var(--creator-text-muted)]">{card.risk}</span>
              </div>
            </article>
          ))}
        </div>

        <div data-slot="creator-state-action" className={cn(stateActionSurfaceClass, reducedTransparencyClass)}>
          <span className="whitespace-nowrap text-[0.7rem] font-black text-[var(--creator-accent)]">建议动作</span>
          <strong className="text-right text-[0.82rem] font-black leading-[1.5] text-[var(--creator-text)] max-[720px]:text-left">{actionCopy}</strong>
        </div>
      </CardContent>
    </Card>
  )
}

export type CreatorBranchSandboxDecision = 'merge' | 'keep' | 'discard'

export interface CreatorBranchSandboxFocusRow {
  label: string
  value: string
}

export interface CreatorBranchSandboxBaseline {
  label: string
  title: string
  body: string
}

export interface CreatorBranchSandboxCard {
  key: string
  label: string
  question: string
  summary: string
  upside: string
  risk: string
  impact: string
  keepIf: string
  dropIf: string
  verdict: string
  verdictVariant?: BadgeProps['variant']
  action: string
}

export interface CreatorBranchSandboxPanelProps {
  question: string
  focusRows: CreatorBranchSandboxFocusRow[]
  baseline: CreatorBranchSandboxBaseline
  cards: CreatorBranchSandboxCard[]
  footerCopy: string
  title?: string
  description?: string
  onDecide: (label: string, decision: CreatorBranchSandboxDecision) => void
  className?: string
}

export function CreatorBranchSandboxPanel({
  question,
  focusRows,
  baseline,
  cards,
  footerCopy,
  title = '支线试写',
  description = '大改先进入试写比较。作者确认前，不会改变主线，也不会影响读者正在看的章节。',
  onDecide,
  className,
}: CreatorBranchSandboxPanelProps) {
  return (
    <Card
      className={cn('creator-branch-sandbox', workspaceAssistantCardClass, className)}
      variant="glass"
      padding="sm"
      role="complementary"
      aria-label={title}
    >
      <CardHeader className="flex-row items-start justify-between gap-3 p-0">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch size={18} className="text-[var(--creator-accent)]" />
            <CardTitle className="text-lg text-[var(--creator-assistant-text)]">{title}</CardTitle>
          </div>
          <CardDescription className="mt-2 text-sm leading-6 text-[var(--creator-assistant-text-muted)]">
            {description}
          </CardDescription>
        </div>
        <Badge variant="outline">先比较</Badge>
      </CardHeader>

      <CardContent className="p-0">
        <Card variant="default" padding="sm" className="creator-branch-judgment-card">
          <CardHeader className="p-0">
            <Badge variant="gold" className="justify-self-start">只判断一件事</Badge>
            <CardTitle className="text-[0.95rem] leading-snug text-[var(--creator-text)]">{question}</CardTitle>
            <CardDescription className="text-[0.75rem] leading-6 text-[var(--creator-text-muted)]">
              先比较代价、视角和异常是否真的让故事更有张力；不值得就直接放弃。
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="creator-branch-judgment-grid">
              {focusRows.map(row => (
                <span key={row.label}>
                  <em>{row.label}</em>
                  {row.value}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="creator-branch-baseline mt-4">
          <Badge variant="gold">{baseline.label}</Badge>
          <div>
            <strong>{baseline.title}</strong>
            <small>{baseline.body}</small>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {cards.map(card => (
            <Card key={card.key} variant="default" padding="sm" className="creator-sandbox-card">
              <span className="creator-sandbox-main">
                <span className="creator-sandbox-kicker">试写 {card.key}</span>
                <strong>{card.label}</strong>
                <b>{card.question}</b>
                <small>{card.summary}</small>
                <span className="creator-sandbox-impact">
                  <em>优点：{card.upside}</em>
                  <em>风险：{card.risk}</em>
                  <em>影响：{card.impact}</em>
                </span>
                <span className="creator-sandbox-judgment">
                  <em>采用条件：{card.keepIf}</em>
                  <em>放弃理由：{card.dropIf}</em>
                </span>
              </span>
              <span className="creator-sandbox-side">
                <Badge variant={card.verdictVariant || 'outline'}>{card.verdict}</Badge>
                <span className="creator-sandbox-action">
                  <Plus size={13} />
                  {card.action}
                </span>
              </span>
              <span className="creator-sandbox-decisions" aria-label={`${card.label}处理方式`}>
                <Button
                  type="button"
                  variant="gold"
                  size="sm"
                  className="creator-sandbox-decision-action"
                  onClick={() => onDecide(card.label, 'merge')}
                >
                  采用到主线
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="creator-sandbox-decision-action"
                  onClick={() => onDecide(card.label, 'keep')}
                >
                  保留为 IF
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="creator-sandbox-decision-action"
                  onClick={() => onDecide(card.label, 'discard')}
                >
                  放弃
                </Button>
              </span>
            </Card>
          ))}
        </div>

        <div className="creator-branch-sandbox-footer">
          <Badge variant="outline">先比较</Badge>
          <span>{footerCopy}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export interface CreatorFlightTrustRow {
  label: string
  value: string
  ready: boolean
}

export interface CreatorFlightSummaryCard {
  label: string
  value: string
  detail: string
}

export interface CreatorFlightStepRow {
  label: string
  body: string
  ready: boolean
}

export interface CreatorFlightResultRow {
  label: string
  value: string
}

export interface CreatorFlightChoiceRecord {
  id: string
  label: string
  reason: string
  verdict: string
  outcome: string
  selected: boolean
}

export interface CreatorFlightRecorderPanelProps {
  trustQuestion: string
  trustStatusLabel: string
  trustStatusVariant?: BadgeProps['variant']
  trustRows: CreatorFlightTrustRow[]
  summaryCards: CreatorFlightSummaryCard[]
  stepRows: CreatorFlightStepRow[]
  resultRows: CreatorFlightResultRow[]
  choiceRecords: CreatorFlightChoiceRecord[]
  title?: string
  badgeLabel?: string
  lede?: string
  checkpointTitle?: string
  checkpointCopy?: string
  className?: string
}

export function CreatorFlightRecorderPanel({
  trustQuestion,
  trustStatusLabel,
  trustStatusVariant = 'outline',
  trustRows,
  summaryCards,
  stepRows,
  resultRows,
  choiceRecords,
  title = '建议依据',
  badgeLabel = '本章建议从哪里来？',
  lede = '这里只回看创作判断：读者愿望、章节目标、写法取舍、正文状态和发布前确认。',
  checkpointTitle = '写作确认点',
  checkpointCopy = '每完成一章都会停下确认；作者确认前不会公开。',
  className,
}: CreatorFlightRecorderPanelProps) {
  return (
    <Card
      className={cn('creator-flight-recorder', workspaceAssistantCardClass, className)}
      variant="glass"
      padding="sm"
      role="complementary"
      aria-label={title}
    >
      <CardHeader className="creator-flight-head flex-row items-center justify-between gap-3 p-0">
        <span>
          <ListFilter size={18} />
          <CardTitle className="text-lg text-[var(--creator-assistant-text)]">{title}</CardTitle>
        </span>
        <Badge variant="outline">{badgeLabel}</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <p className="creator-flight-lede">{lede}</p>
        <Card variant="default" padding="sm" className="creator-flight-judgment-card">
          <CardHeader className="p-0">
            <Badge variant={trustStatusVariant} className="justify-self-start">可信度判断</Badge>
            <CardTitle className="text-[0.95rem] leading-snug text-[var(--creator-text)]">{trustQuestion}</CardTitle>
            <CardDescription className="text-[0.75rem] leading-6 text-[var(--creator-text-muted)]">
              {trustStatusLabel}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="creator-flight-trust-grid">
              {trustRows.map(row => (
                <span key={row.label} className={row.ready ? 'is-ready' : ''}>
                  <em>{row.label}</em>
                  {row.value}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="creator-flight-summary">
          {summaryCards.map(card => (
            <div key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.detail}</small>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {stepRows.map((row, index) => (
            <div key={row.label} className={`creator-flight-row ${row.ready ? 'is-ready' : ''}`}>
              <span>{index + 1}</span>
              <div>
                <strong>{row.label}</strong>
                <small>{row.body}</small>
              </div>
            </div>
          ))}
        </div>

        <div className="creator-flight-result">
          {resultRows.map(row => (
            <span key={row.label}>
              <b>{row.label}</b>
              <small>{row.value}</small>
            </span>
          ))}
        </div>

        <div className="creator-flight-compare">
          <div className="creator-flight-compare-head">
            <strong>为什么这样建议？</strong>
            <Badge variant="outline">写法比较</Badge>
          </div>
          <div className="mt-3 grid gap-2">
            {choiceRecords.map(item => (
              <div key={item.id} className={`creator-flight-choice ${item.selected ? 'is-selected' : ''}`}>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.reason}</small>
                  <em>{item.outcome}</em>
                </span>
                <Badge variant={item.selected ? 'gold' : 'outline'}>{item.verdict}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-[var(--creator-border)] bg-[var(--creator-surface)] p-3">
          <p className="text-sm font-semibold text-[var(--creator-text)]">{checkpointTitle}</p>
          <p className="mt-2 text-xs leading-5 text-[var(--creator-text-muted)]">{checkpointCopy}</p>
        </div>
      </CardContent>
    </Card>
  )
}
