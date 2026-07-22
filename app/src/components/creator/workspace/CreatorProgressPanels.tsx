import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const workspaceFooterCardClass =
  'border-[var(--creator-progress-border)] bg-[var(--creator-progress-bg)] text-[var(--creator-editor-text)] [box-shadow:var(--creator-progress-shadow)]'
const workspaceFooterPanelClass =
  'rounded-2xl border border-[var(--creator-progress-border)] bg-[var(--creator-progress-row-bg)]'

export interface CreatorProgressSignal {
  label: string
  status: string
  ready?: boolean
  current?: boolean
}

export interface CreatorProgressTask {
  label: string
  status: string
  body: string
  ready?: boolean
}

export interface CreatorProgressAction {
  label: string
  hint: string
  shortcut: string
  tone: 'primary' | 'secondary'
  onClick: () => void
}

export interface CreatorEditorReadinessStripProps {
  proseCount: number
  saveStateLabel: string
  saveStateDetail: string
  destinationLabel: string
  destinationDetail: string
  requestStateLabel: string
  requestStateDetail: string
  blockers: string[]
  className?: string
}

export function CreatorEditorReadinessStrip({
  proseCount,
  saveStateLabel,
  saveStateDetail,
  destinationLabel,
  destinationDetail,
  requestStateLabel,
  requestStateDetail,
  blockers,
  className,
}: CreatorEditorReadinessStripProps) {
  const rows = [
    {
      label: '正文字数',
      value: `${proseCount} 字`,
      detail: proseCount >= 120 ? '已经能进入发布包确认。' : '建议先写到可判断的一段正文。',
    },
    {
      label: '草稿保存',
      value: saveStateLabel,
      detail: saveStateDetail,
    },
    {
      label: '发布去向',
      value: destinationLabel,
      detail: destinationDetail,
    },
    {
      label: '关联请求',
      value: requestStateLabel,
      detail: requestStateDetail,
    },
  ]

  return (
    <Card data-slot="creator-editor-readiness-strip" className={cn(workspaceFooterCardClass, className)} variant="default" padding="sm" aria-label="写作准备度">
      <CardContent className="grid gap-3 p-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant={blockers.length ? 'outline' : 'gold'}>发布前准备</Badge>
            <span className="text-xs font-black tracking-wide text-[var(--creator-text-dim)]">正文、去向和读者承诺</span>
          </div>
          <Badge variant={blockers.length ? 'outline' : 'gold'}>
            {blockers.length ? `还差 ${blockers.length} 项` : '可以检查'}
          </Badge>
        </div>

        <div className="grid gap-2 md:grid-cols-4">
          {rows.map(row => (
            <section key={row.label} data-slot="creator-editor-readiness-cell" className={cn(workspaceFooterPanelClass, 'p-3')}>
              <p className="text-xs text-[var(--creator-text-dim)]">{row.label}</p>
              <p className="mt-1 truncate text-sm font-black text-[var(--creator-editor-text)]">{row.value}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--creator-text-dim)]">{row.detail}</p>
            </section>
          ))}
        </div>

        {blockers.length ? (
          <p className="text-xs leading-5 text-[var(--creator-text-dim)]">
            还差：{blockers.join('、')}。
          </p>
        ) : (
          <p className="text-xs leading-5 text-[var(--creator-text-dim)]">
            已具备进入发布包确认的基础条件。
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export interface CreatorProgressRailProps {
  activeLabel: string
  focusCopy: string
  nextAction: string
  progress: number
  signals: CreatorProgressSignal[]
  tasks: CreatorProgressTask[]
  actions: CreatorProgressAction[]
  ready?: boolean
  className?: string
}

export function CreatorProgressRail({
  activeLabel,
  focusCopy,
  nextAction,
  progress,
  signals,
  tasks,
  actions,
  ready,
  className,
}: CreatorProgressRailProps) {
  return (
    <Card data-slot="creator-progress-rail" className={cn(workspaceFooterCardClass, className)} variant="default" padding="sm" aria-label="创作进度">
      <CardContent className="grid gap-3 p-0">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(180px,0.34fr)]">
          <section className={cn(workspaceFooterPanelClass, 'p-3')}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={ready ? 'gold' : 'outline'}>写作进度</Badge>
              <span className="text-xs font-black tracking-wide text-[var(--creator-text-dim)]">当前进展</span>
            </div>
            <strong className="mt-2 block text-base font-black text-[var(--creator-editor-text)]">{activeLabel}</strong>
            <p className="mt-1 text-xs leading-5 text-[var(--creator-text-muted)]">{focusCopy}</p>
          </section>
          <section className={cn('grid content-center p-3', workspaceFooterPanelClass)}>
            <span className="text-xs font-black tracking-wide text-[var(--creator-text-dim)]">建议动作</span>
            <strong className="mt-1 text-sm font-black leading-5 text-[var(--creator-confirm)]">{nextAction}</strong>
          </section>
        </div>

        <section className={cn(workspaceFooterPanelClass, 'p-3')}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black tracking-wide text-[var(--creator-text-dim)]">创作进度</span>
            <strong className="text-sm font-black text-[var(--creator-editor-text)]">{progress}%</strong>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--creator-editor-line)]">
            <i className="block h-full rounded-full bg-gradient-to-r from-[var(--creator-accent)] to-[var(--creator-confirm)] transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {signals.map(signal => (
              <Badge
                key={signal.label}
                className={cn(
                  'justify-start rounded-full px-2 py-1 text-[0.66rem]',
                  signal.current && 'border-[var(--creator-confirm)] text-[var(--creator-confirm)]',
                  signal.ready && !signal.current && 'border-[var(--creator-accent)] text-[var(--creator-accent)]',
                )}
                variant="outline"
              >
                {signal.label} · {signal.status}
              </Badge>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-2">
          {tasks.slice(0, 2).map(task => (
            <Badge key={task.label} className="rounded-full px-2.5 py-1 text-[0.68rem]" variant={task.ready ? 'gold' : 'outline'}>
              {task.label} · {task.status}
            </Badge>
          ))}
          <span className="min-w-0 flex-1" />
          {actions.slice(0, 3).map(action => (
            <Button
              key={action.label}
              type="button"
              variant={action.tone === 'primary' ? 'gold' : 'outline'}
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={action.onClick}
            >
              <span className="font-black">{action.shortcut}</span>
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export type CreatorMissionProgressCommand = 'complete' | 'temper' | 'question' | 'state' | 'sandbox' | 'record'

export interface CreatorMissionProgressRailProps {
  titleReady: boolean
  contentReady: boolean
  destinationReady: boolean
  hasLinkedEcho: boolean
  directionLabel: string
  onRunCommand: (command: CreatorMissionProgressCommand) => void
  onTitleCandidate: () => void
  className?: string
}

export function CreatorMissionProgressRail({
  titleReady,
  contentReady,
  destinationReady,
  hasLinkedEcho,
  directionLabel,
  onRunCommand,
  onTitleCandidate,
  className,
}: CreatorMissionProgressRailProps) {
  const reviewReady = titleReady && contentReady && destinationReady
  const signalSteps: CreatorProgressSignal[] = [
    {
      label: hasLinkedEcho ? '读者愿望' : '作品缺口',
      status: hasLinkedEcho ? '已收拢' : '已整理',
      ready: true,
      current: false,
    },
    {
      label: '本章写法',
      status: directionLabel,
      ready: true,
      current: false,
    },
    {
      label: '正文基础',
      status: contentReady ? '已具备' : '等待第一段',
      ready: contentReady,
      current: !contentReady,
    },
    {
      label: '发布判断',
      status: titleReady && contentReady ? '可审阅' : '待补齐',
      ready: titleReady && contentReady,
      current: contentReady && !titleReady,
    },
    {
      label: '去向确认',
      status: reviewReady ? '可检查' : '待确认',
      ready: reviewReady,
      current: titleReady && contentReady && !destinationReady,
    },
  ]
  const readyCount = signalSteps.filter(step => step.ready).length
  const progress = Math.round((readyCount / signalSteps.length) * 100)
  const activeLabel = !contentReady
    ? '正在形成正文'
    : !titleReady
      ? '等待补标题'
      : !destinationReady
        ? '等待定去向'
        : '等待发布包确认'
  const nextAction = !contentReady
    ? '先写出第一段正文'
    : !titleReady
      ? '补一个能被读者记住的标题'
      : !destinationReady
        ? '确认发布到主线还是 IF 支线'
        : '先看影响范围，再进入发布包确认'
  const focusCopy = hasLinkedEcho
    ? `正在把读者想看的变化整理成「${directionLabel}」。`
    : `正在从作品现有压力里整理「${directionLabel}」。`
  const tasks: CreatorProgressTask[] = [
    {
      label: '故事承诺',
      status: hasLinkedEcho ? '已对齐' : '已定位',
      body: hasLinkedEcho ? '本章会回应读者明确想看的变化。' : '没有指定请求时，先选一条最需要推进的线。',
      ready: true,
    },
    {
      label: '正文审阅',
      status: contentReady ? '可判断' : '等待正文',
      body: contentReady ? '已有正文，可以看节奏、人物和钩子是否撑住。' : '写出第一段后，再给出具体修改点。',
      ready: contentReady,
    },
    {
      label: '影响预告',
      status: titleReady && contentReady ? '可预览' : '待补齐',
      body: titleReady && contentReady ? '可以预估这章会改变哪些人物、伏笔和支线。' : '标题和正文齐了，影响才值得判断。',
      ready: titleReady && contentReady,
    },
    {
      label: '发布包确认',
      status: reviewReady ? '可进入' : '继续准备',
      body: reviewReady ? '已具备进入发布包确认的最低条件。' : '发布前必须确认正文、标题和去向。',
      ready: reviewReady,
    },
  ]
  const actions: CreatorProgressAction[] = !contentReady
    ? [
        {
          label: 'Tab 补正文',
          hint: '先形成一段候选',
          shortcut: 'Tab',
          tone: 'primary',
          onClick: () => onRunCommand('complete'),
        },
        {
          label: '追问代价',
          hint: '先问清楚人物为什么动',
          shortcut: '⌘L',
          tone: 'secondary',
          onClick: () => onRunCommand('question'),
        },
        {
          label: '看建议依据',
          hint: '回看这一章为何这样走',
          shortcut: '⌘J',
          tone: 'secondary',
          onClick: () => onRunCommand('record'),
        },
      ]
    : !titleReady
      ? [
          {
            label: '看标题候选',
            hint: '让标题对齐正文承诺',
            shortcut: '⌘K',
            tone: 'primary',
            onClick: onTitleCandidate,
          },
          {
            label: '改写语气',
            hint: '压低解释，保留画面',
            shortcut: '⌘K',
            tone: 'secondary',
            onClick: () => onRunCommand('temper'),
          },
          {
            label: '看影响',
            hint: '先看会改变哪些线',
            shortcut: '⌘I',
            tone: 'secondary',
            onClick: () => onRunCommand('state'),
          },
        ]
      : !destinationReady
        ? [
            {
              label: '看影响范围',
              hint: '决定主线还是 IF 支线',
              shortcut: '⌘I',
              tone: 'primary',
              onClick: () => onRunCommand('state'),
            },
            {
              label: '试分支',
              hint: '大改先进入试写线',
              shortcut: '⌘B',
              tone: 'secondary',
              onClick: () => onRunCommand('sandbox'),
            },
            {
              label: '看建议依据',
              hint: '确认建议是否可信',
              shortcut: '⌘J',
              tone: 'secondary',
              onClick: () => onRunCommand('record'),
            },
          ]
        : [
            {
              label: '看影响审阅',
              hint: '先看人物、伏笔和支线影响',
              shortcut: '⌘I',
              tone: 'primary',
              onClick: () => onRunCommand('state'),
            },
            {
              label: '看建议依据',
              hint: '确认本章取舍',
              shortcut: '⌘J',
              tone: 'secondary',
              onClick: () => onRunCommand('record'),
            },
            {
              label: '续写一段',
              hint: '继续补候选正文',
              shortcut: 'Tab',
              tone: 'secondary',
              onClick: () => onRunCommand('complete'),
            },
          ]

  return (
    <CreatorProgressRail
      className={className}
      activeLabel={activeLabel}
      focusCopy={focusCopy}
      nextAction={nextAction}
      progress={progress}
      signals={signalSteps}
      tasks={tasks}
      actions={actions}
      ready={reviewReady}
    />
  )
}
