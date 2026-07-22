import { type FormEvent, type ReactNode, useState } from 'react'
import { MessageSquare, ShieldCheck, Sparkles, Wand2 } from 'lucide-react'
import type { CreatorAgentActionName } from '@/agent-surface/actions'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  CreatorBranchSandboxPanel,
  CreatorFlightRecorderPanel,
  CreatorStateDiffPanel,
  type CreatorBranchSandboxBaseline,
  type CreatorBranchSandboxCard,
  type CreatorBranchSandboxFocusRow,
  type CreatorFlightChoiceRecord,
  type CreatorFlightResultRow,
  type CreatorFlightStepRow,
  type CreatorFlightSummaryCard,
  type CreatorFlightTrustRow,
  type CreatorStateDiffImpactCard,
  type CreatorStateDiffSummaryItem,
} from './CreatorImpactPanels'
import { CreatorQualityIssueCard, type CreatorQualityIssue } from './CreatorQualityPanels'

const workspaceAssistantCardClass =
  'border-[var(--creator-assistant-border)] bg-[var(--creator-assistant-bg)] text-[var(--creator-assistant-text)] shadow-none'
const workspaceAssistantPanelClass =
  'rounded-2xl border border-[var(--creator-assistant-panel-border)] bg-[var(--creator-assistant-panel-bg)]'

export interface CreatorReviewDockTab {
  id: string
  label: string
  content: ReactNode
  className?: string
}

export interface CreatorReviewDockInsight {
  badge: string
  title: string
  body: string
  focus: string
  why: string
  next: string
  primaryAction: string
  secondaryAction: string
  onPrimaryAction: () => void
  onSecondaryAction: () => void
}

export interface CreatorReviewDockFrameProps {
  tabs: CreatorReviewDockTab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  insight: CreatorReviewDockInsight
  commandBar?: ReactNode
  title?: string
  statusLabel?: string
  className?: string
}

export function CreatorReviewDockFrame({
  tabs,
  activeTab,
  onTabChange,
  insight,
  commandBar,
  title = '写作助手',
  statusLabel = '待判断',
  className,
}: CreatorReviewDockFrameProps) {
  return (
    <Card
      className={cn('creator-review-dock', workspaceAssistantCardClass, className)}
      variant="glass"
      padding="sm"
      role="complementary"
      aria-label={title}
    >
      <CardHeader className="flex-row items-center justify-between gap-3 p-0">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-[var(--creator-confirm)]" />
          <CardTitle className="text-lg text-[var(--creator-assistant-text)]">{title}</CardTitle>
        </div>
        <Badge variant="outline">{statusLabel}</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <section className="creator-review-current-card" aria-label="当前写作判断">
          <div className="creator-review-current-head">
            <Badge className="creator-review-current-badge" variant="gold">{insight.badge}</Badge>
            <strong>{insight.title}</strong>
          </div>
          <p>{insight.body}</p>
          <div className="creator-review-current-grid">
            <span>
              <em>当前看点</em>
              {insight.focus}
            </span>
            <span>
              <em>为什么重要</em>
              {insight.why}
            </span>
            <span>
              <em>下一步</em>
              {insight.next}
            </span>
          </div>
          <div className="creator-review-current-actions">
            <Button
              type="button"
              variant="gold"
              size="sm"
              className="creator-review-current-action"
              onClick={insight.onPrimaryAction}
            >
              {insight.primaryAction}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="creator-review-current-action"
              onClick={insight.onSecondaryAction}
            >
              {insight.secondaryAction}
            </Button>
          </div>
        </section>

        {commandBar ? <div className="mt-3">{commandBar}</div> : null}

        <Tabs value={activeTab} onValueChange={onTabChange} className="mt-4 w-full">
          <TabsList className="creator-review-tabs grid w-full grid-cols-4">
            {tabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>
          {tabs.map(tab => (
            <TabsContent key={tab.id} value={tab.id} className={cn('mt-4', tab.className)}>
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}

export interface CreatorReviewCommandSuggestion {
  label: string
  onSelect: () => void
  agentAction?: CreatorAgentActionName
}

export interface CreatorReviewCommandBarProps {
  value: string
  onValueChange: (value: string) => void
  onSubmit: () => void
  suggestions: CreatorReviewCommandSuggestion[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function CreatorReviewCommandBar({
  value,
  onValueChange,
  onSubmit,
  suggestions,
  placeholder = '对助手说：补一段、压低解释、看影响，或先放进支线试写。',
  disabled,
  className,
}: CreatorReviewCommandBarProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled) return
    onSubmit()
  }

  return (
    <form
      className={cn('creator-review-command-bar', workspaceAssistantPanelClass, className)}
      aria-label="对写作助手说"
      onSubmit={handleSubmit}
    >
      <div className="creator-review-command-head">
        <span>
          <MessageSquare size={14} />
          对助手说
        </span>
        <Badge variant="outline">候选先进草稿</Badge>
      </div>
      <div className="creator-review-command-row">
        <Input
          value={value}
          disabled={disabled}
          aria-label="对写作助手说"
          placeholder={placeholder}
          className="creator-review-command-input"
          onChange={event => onValueChange(event.target.value)}
        />
        <Button
          type="submit"
          variant="gold"
          size="sm"
          className="creator-review-command-submit"
          data-agent-action="generate_candidate_from_instruction"
          disabled={disabled}
        >
          <Sparkles size={14} />
          生成候选
        </Button>
      </div>
      <div className="creator-review-command-suggestions" aria-label="常用写作指令">
        {suggestions.map(suggestion => (
          <Button
            key={suggestion.label}
            type="button"
            variant="ghost"
            size="sm"
            className="creator-review-command-suggestion"
            data-agent-action={suggestion.agentAction}
            disabled={disabled}
            onClick={suggestion.onSelect}
          >
            {suggestion.label}
          </Button>
        ))}
      </div>
    </form>
  )
}

export type CreatorReviewDockTabId = 'review' | 'state' | 'branch' | 'record'

export interface CreatorCreativeReviewDockProps {
  title: string
  destinationReady: boolean
  hasLinkedEcho: boolean
  titleReady: boolean
  contentReady: boolean
  activeTab: CreatorReviewDockTabId
  qualityIssues: CreatorQualityIssue[]
  stateDiff: {
    summaryItems: CreatorStateDiffSummaryItem[]
    impactCards: CreatorStateDiffImpactCard[]
    statusLabel: string
    statusVariant: BadgeProps['variant']
    actionCopy: string
  }
  branchSandbox: {
    question: string
    focusRows: CreatorBranchSandboxFocusRow[]
    baseline: CreatorBranchSandboxBaseline
    cards: CreatorBranchSandboxCard[]
    footerCopy: string
  }
  flightRecorder: {
    trustQuestion: string
    trustStatusLabel: string
    trustStatusVariant: BadgeProps['variant']
    trustRows: CreatorFlightTrustRow[]
    summaryCards: CreatorFlightSummaryCard[]
    stepRows: CreatorFlightStepRow[]
    resultRows: CreatorFlightResultRow[]
    choiceRecords: CreatorFlightChoiceRecord[]
  }
  onApplyReviewFix: (label: string) => void
  onDecideBranchExperiment: (label: string, decision: 'merge' | 'keep' | 'discard') => void
  onTabChange: (tab: CreatorReviewDockTabId) => void
  className?: string
}

export function CreatorCreativeReviewDock({
  title,
  destinationReady,
  hasLinkedEcho,
  titleReady,
  contentReady,
  activeTab,
  qualityIssues,
  stateDiff,
  branchSandbox,
  flightRecorder,
  onApplyReviewFix,
  onDecideBranchExperiment,
  onTabChange,
  className,
}: CreatorCreativeReviewDockProps) {
  const [reviewCommand, setReviewCommand] = useState('')

  function runReviewCommand(commandText = reviewCommand) {
    const text = commandText.trim()
    if (!text) {
      onApplyReviewFix(contentReady ? '补写下一段' : '补写开场')
      return
    }
    if (/支线|分支|另一条|换视角|旁支/.test(text)) {
      onTabChange('branch')
      setReviewCommand('')
      return
    }
    if (/影响|改变|关系|伏笔|读者已知|状态/.test(text)) {
      onTabChange('state')
      setReviewCommand('')
      return
    }
    if (/依据|为什么|来源|可信|理由/.test(text)) {
      onTabChange('record')
      setReviewCommand('')
      return
    }
    if (/标题|名字|目录/.test(text)) {
      onApplyReviewFix('生成标题候选')
      setReviewCommand('')
      return
    }
    if (/改写|语气|克制|解释|压低|动作/.test(text)) {
      onApplyReviewFix('让语气更克制')
      setReviewCommand('')
      return
    }
    onApplyReviewFix(contentReady ? '补写下一段' : '补写开场')
    setReviewCommand('')
  }

  function chooseReviewCommand(commandText: string) {
    setReviewCommand(commandText)
    runReviewCommand(commandText)
  }

  const reviewCue = (() => {
    if (!contentReady) return {
      badge: '当前判断', title: '先让正文成形',
      body: '还没有可审段落时，右侧只保留方向提醒。先补一段正文，再判断质量、影响和分支。',
      focus: '正文基础', why: hasLinkedEcho ? '读者愿望需要变成可读场景。' : '没有正文就无法判断节奏和钩子。',
      next: '补写一段', primaryTab: 'review' as const, primaryAction: '看审阅', secondaryTab: 'record' as const, secondaryAction: '看建议依据',
    }
    if (!titleReady) return {
      badge: '当前判断', title: '先给这一章一个记忆点',
      body: '正文已经有了，但标题还没有承担读者记忆点。先处理标题，再看故事影响。',
      focus: '章节标题', why: '标题会决定读者如何记住这一章。', next: '生成标题候选',
      primaryTab: 'review' as const, primaryAction: '看审阅', secondaryTab: 'state' as const, secondaryAction: '看影响',
    }
    if (!destinationReady) return {
      badge: '当前判断', title: '先决定发布到哪条线',
      body: '标题和正文已经具备，现在最重要的是确认它进入主线，还是作为 IF 支线候选。',
      focus: '发布去向', why: '去向不清时，后续章节和读者期待都会变散。', next: '确认主线或支线',
      primaryTab: 'state' as const, primaryAction: '看影响', secondaryTab: 'branch' as const, secondaryAction: '试分支',
    }
    if (activeTab === 'branch') return {
      badge: '分支判断', title: '大改先放进支线试写',
      body: '如果这一章想换视角、换选择或保留异常，先在支线里比较，不直接动主线。',
      focus: '分支安全', why: '作者可以大胆试错，同时保留正式剧情的稳定性。', next: '比较三条试写',
      primaryTab: 'branch' as const, primaryAction: '继续比较', secondaryTab: 'state' as const, secondaryAction: '看影响',
    }
    if (activeTab === 'record') return {
      badge: '依据判断', title: '先看建议从哪里来',
      body: '这里回看读者愿望、章节目标和方向取舍，帮助作者判断这次建议是否可信。',
      focus: '建议依据', why: '知道取舍理由，作者才敢采用或推翻。', next: '确认取舍',
      primaryTab: 'record' as const, primaryAction: '继续查看', secondaryTab: 'review' as const, secondaryAction: '回到审阅',
    }
    if (activeTab === 'state') return {
      badge: '发布判断', title: '先看这章会改变什么',
      body: '进入发布包确认前，先确认人物目标、关系温度、伏笔承诺和读者已知有没有被改变。',
      focus: '故事影响', why: '看清影响后，作者再决定是否进入正式剧情。', next: '确认影响范围',
      primaryTab: 'state' as const, primaryAction: '继续看影响', secondaryTab: 'review' as const, secondaryAction: '回到审阅',
    }
    return {
      badge: '当前判断', title: '先处理影响阅读的点',
      body: '右侧只放需要作者判断的事：质量问题卡、故事影响、支线试写和建议依据。',
      focus: hasLinkedEcho ? '回应读者愿望' : '稳住本章承诺',
      why: '把问题、修复和发布分开处理，正文不会被自动改动。', next: '先看质量问题',
      primaryTab: 'review' as const, primaryAction: '看问题卡', secondaryTab: 'state' as const, secondaryAction: '看影响',
    }
  })()

  const reviewTabs: CreatorReviewDockTab[] = [
    {
      id: 'review', label: '问题卡', className: 'space-y-4',
      content: (
        <>
          <CreatorQualityIssueCard title={title} destinationReady={destinationReady} issues={qualityIssues} onApplyFix={onApplyReviewFix} />
          <Button className="w-full" variant="outline" onClick={() => onApplyReviewFix('补写下一段')}>
            <Wand2 size={15} />
            继续补写一段
          </Button>
        </>
      ),
    },
    {
      id: 'state', label: '故事影响',
      content: <CreatorStateDiffPanel {...stateDiff} />,
    },
    {
      id: 'branch', label: '支线试写',
      content: <CreatorBranchSandboxPanel {...branchSandbox} onDecide={onDecideBranchExperiment} />,
    },
    {
      id: 'record', label: '建议依据',
      content: <CreatorFlightRecorderPanel {...flightRecorder} />,
    },
  ]

  return (
    <CreatorReviewDockFrame
      className={className}
      tabs={reviewTabs}
      activeTab={activeTab}
      onTabChange={value => onTabChange(value as CreatorReviewDockTabId)}
      commandBar={(
        <CreatorReviewCommandBar
          value={reviewCommand}
          onValueChange={setReviewCommand}
          onSubmit={runReviewCommand}
          suggestions={[
            { label: '补写一段', agentAction: 'complete_next_beat', onSelect: () => chooseReviewCommand('补写一段') },
            { label: '压低解释', agentAction: 'rewrite_as_action', onSelect: () => chooseReviewCommand('压低解释') },
            { label: '看影响', agentAction: 'inspect_story_impact', onSelect: () => chooseReviewCommand('看影响') },
            { label: '支线试写', agentAction: 'branch_sandbox', onSelect: () => chooseReviewCommand('支线试写') },
          ]}
        />
      )}
      insight={{
        badge: reviewCue.badge,
        title: reviewCue.title,
        body: reviewCue.body,
        focus: reviewCue.focus,
        why: reviewCue.why,
        next: reviewCue.next,
        primaryAction: reviewCue.primaryAction,
        secondaryAction: reviewCue.secondaryAction,
        onPrimaryAction: () => onTabChange(reviewCue.primaryTab),
        onSecondaryAction: () => onTabChange(reviewCue.secondaryTab),
      }}
    />
  )
}
