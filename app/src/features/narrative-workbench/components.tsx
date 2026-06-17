import { useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  CornerDownRight,
  FileText,
  GitBranch,
  Layers3,
  ListChecks,
  Lock,
  Map,
  MessageCircle,
  PenLine,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  Workflow,
} from 'lucide-react'
import { Badge } from '@/components/primitives/Badge'
import { Button } from '@/components/primitives/Button'
import { cn } from '@/lib/utils'
import type {
  CreativeStepId,
  ForeshadowHook,
  NexusCandidate,
  PrototypeHero,
  PrototypeScript,
  WorldlineBranch,
} from './types'

export interface AgentRunStep {
  id: string
  label: string
  detail: string
  status: 'done' | 'active' | 'waiting' | 'blocked'
}

export interface CommandAction {
  label: string
  onClick: () => void
  variant?: 'gold' | 'outline' | 'secondary' | 'ghost'
  disabled?: boolean
}

interface MeterProps {
  label: string
  value: number
  tone?: 'gold' | 'cyan' | 'rose' | 'teal'
}

const meterToneClass: Record<NonNullable<MeterProps['tone']>, string> = {
  gold: 'bg-[var(--manuscript-gold)]',
  cyan: 'bg-[var(--worldline-cyan)]',
  rose: 'bg-rose-400',
  teal: 'bg-emerald-400',
}

export function Meter({ label, value, tone = 'cyan' }: MeterProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs text-[var(--ink-muted)]">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <div className={cn('h-full rounded-full', meterToneClass[tone])} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  )
}

function runStepIcon(status: AgentRunStep['status']) {
  if (status === 'done') return <CheckCircle2 size={15} />
  if (status === 'active') return <CircleDot size={15} />
  if (status === 'blocked') return <AlertTriangle size={15} />
  return <Lock size={15} />
}

function runStepTone(status: AgentRunStep['status']) {
  if (status === 'done') return 'border-emerald-400/35 bg-emerald-400/10 text-emerald-300'
  if (status === 'active') return 'border-[var(--worldline-cyan)]/45 bg-[var(--worldline-cyan)]/10 text-[var(--worldline-cyan)]'
  if (status === 'blocked') return 'border-rose-400/35 bg-rose-400/10 text-rose-300'
  return 'border-white/10 bg-white/[0.025] text-[var(--ink-muted)]'
}

export function AgentRunPanel({
  eyebrow = '创作流程',
  title,
  objective,
  steps,
}: {
  eyebrow?: string
  title: string
  objective: string
  steps: AgentRunStep[]
}) {
  return (
    <section className="narrative-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-[var(--ink-dim)]">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--ink-paper)]">{title}</h2>
        </div>
        <Workflow className="text-[var(--worldline-cyan)]" size={20} />
      </div>
      <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
        <p className="text-xs uppercase text-[var(--ink-dim)]">Current objective</p>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-paper)]">{objective}</p>
      </div>
      <div className="mt-4 space-y-2">
        {steps.map(step => (
          <div key={step.id} className="grid grid-cols-[26px_minmax(0,1fr)] gap-3">
            <div className={cn('mt-0.5 flex h-6 w-6 items-center justify-center rounded-md border', runStepTone(step.status))}>
              {runStepIcon(step.status)}
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[var(--ink-paper)]">{step.label}</p>
                <span className="text-[11px] uppercase text-[var(--ink-dim)]">{step.status}</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{step.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function TaskBriefPanel({
  script,
  activeBranch,
}: {
  script: PrototypeScript
  activeBranch: WorldlineBranch
}) {
  return (
    <section className="narrative-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-[var(--ink-dim)]">Task brief</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--ink-paper)]">当前任务</h2>
        </div>
        <ClipboardCheck className="text-[var(--manuscript-gold)]" size={20} />
      </div>
      <div className="mt-4 grid gap-3">
        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
          <p className="text-xs text-[var(--ink-dim)]">剧本</p>
          <p className="mt-1 text-sm font-semibold text-[var(--ink-paper)]">{script.title}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{script.genre} / {script.style}</p>
        </div>
        <div className="rounded-lg border border-[var(--worldline-cyan)]/25 bg-[var(--worldline-cyan)]/[0.08] p-3">
          <p className="text-xs text-[var(--ink-dim)]">观测世界线</p>
          <p className="mt-1 text-sm font-semibold text-[var(--ink-paper)]">{activeBranch.name}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{activeBranch.summary}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
          <p className="text-xs text-[var(--ink-dim)]">作者目标</p>
          <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{script.authorGoal}</p>
        </div>
      </div>
    </section>
  )
}

export function CommandComposer({
  label = '给创作代理下一步',
  value,
  onChange,
  placeholder,
  actions,
  helper,
}: {
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  actions: CommandAction[]
  helper?: string
}) {
  return (
    <section className="command-surface">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-paper)]">
          <MessageCircle size={16} className="text-[var(--worldline-cyan)]" />
          {label}
        </div>
        <Badge variant="outline">local demo</Badge>
      </div>
      <div className="p-3">
        <textarea
          className="narrative-input min-h-24 w-full resize-y"
          value={value}
          placeholder={placeholder}
          onChange={event => onChange(event.target.value)}
        />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-xs leading-5 text-[var(--ink-muted)]">
            <CornerDownRight size={14} className="text-[var(--manuscript-gold)]" />
            {helper || '这是一条本地原型命令，不会伪造真实 AI 生成。'}
          </p>
          <div className="flex flex-wrap gap-2">
            {actions.map(action => (
              <Button
                key={action.label}
                type="button"
                size="sm"
                variant={action.variant || 'outline'}
                disabled={action.disabled}
                onClick={action.onClick}
              >
                {action.variant === 'gold' && <Send size={14} />}
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export function ArtifactPreview({
  script,
  activeBranch,
  onOpenStory,
}: {
  script: PrototypeScript
  activeBranch: WorldlineBranch
  onOpenStory: () => void
}) {
  const chapter = script.chapters[0]

  return (
    <section className="narrative-panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-paper)]">
          <FileText size={16} className="text-[var(--manuscript-gold)]" />
          当前产物
        </div>
        <Badge variant={activeBranch.status === 'unstable' ? 'destructive' : 'gold'}>{activeBranch.tone}</Badge>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="manuscript-paper min-h-[280px] p-6">
          <p className="text-xs uppercase tracking-[0.12em] text-[#7a6a4f]">{chapter.subtitle}</p>
          <h3 className="mt-2 text-2xl font-semibold text-[#211b14]">{chapter.title}</h3>
          <p className="mt-5 line-clamp-6 whitespace-pre-line text-base leading-8 text-[#2b2419]">{chapter.body}</p>
        </div>
        <div className="space-y-3">
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="text-xs text-[var(--ink-dim)]">分支摘要</p>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{activeBranch.summary}</p>
          </div>
          <Meter label="稳定度" value={activeBranch.stability} tone="gold" />
          <Meter label="分歧度" value={activeBranch.divergence} tone="cyan" />
          <Button className="w-full" variant="gold" onClick={onOpenStory}>
            <BookOpen size={16} />
            打开工作台
          </Button>
        </div>
      </div>
    </section>
  )
}

function statusLabel(status: WorldlineBranch['status']) {
  if (status === 'main') return '主线'
  if (status === 'active') return '可观测'
  if (status === 'unstable') return '高分歧'
  return '待接入'
}

function statusIcon(status: WorldlineBranch['status']) {
  if (status === 'locked') return <Lock size={14} />
  if (status === 'unstable') return <AlertTriangle size={14} />
  if (status === 'active') return <CircleDot size={14} />
  return <CheckCircle2 size={14} />
}

export function WorldlineNavigator({
  branches,
  activeBranchId,
  onSelectBranch,
}: {
  branches: WorldlineBranch[]
  activeBranchId: string
  onSelectBranch: (branchId: string) => void
}) {
  return (
    <section className="narrative-panel p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-[var(--ink-dim)]">Worldline</p>
          <h2 className="text-lg font-semibold text-[var(--ink-paper)]">世界线状态</h2>
        </div>
        <GitBranch className="text-[var(--worldline-cyan)]" size={20} />
      </div>
      <div className="space-y-3">
        {branches.map(branch => {
          const isActive = branch.id === activeBranchId
          return (
            <button
              key={branch.id}
              type="button"
              className={cn(
                'w-full rounded-lg border p-3 text-left transition-all',
                isActive
                  ? 'border-[var(--worldline-cyan)]/60 bg-[var(--worldline-cyan)]/10 shadow-[0_0_28px_rgba(90,178,214,0.16)]'
                  : 'border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.045]',
              )}
              onClick={() => onSelectBranch(branch.id)}
              disabled={branch.status === 'locked'}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-paper)]">
                  {statusIcon(branch.status)}
                  {branch.name}
                </span>
                <span className="text-[11px] text-[var(--ink-muted)]">{statusLabel(branch.status)}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--ink-muted)]">{branch.summary}</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Meter label="稳定度" value={branch.stability} tone={branch.status === 'unstable' ? 'rose' : 'gold'} />
                <Meter label="分歧度" value={branch.divergence} tone="cyan" />
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function NexusCandidateList({
  candidates,
  activeBranchId,
}: {
  candidates: NexusCandidate[]
  activeBranchId: string
}) {
  return (
    <section className="narrative-panel p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-[var(--ink-dim)]">Nexus Engine</p>
          <h2 className="text-lg font-semibold text-[var(--ink-paper)]">分歧点</h2>
        </div>
        <Sparkles className="text-[var(--manuscript-gold)]" size={20} />
      </div>
      <div className="space-y-3">
        {candidates.map(candidate => {
          const linked = candidate.branchIds.includes(activeBranchId)
          return (
            <div key={candidate.id} className={cn('rounded-lg border p-3', linked ? 'border-[var(--manuscript-gold)]/45 bg-[var(--manuscript-gold)]/[0.08]' : 'border-white/10 bg-white/[0.025]')}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--ink-paper)]">{candidate.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{candidate.sourceBeat}</p>
                </div>
                <Badge variant={candidate.status === 'selected' ? 'gold' : 'outline'}>
                  {candidate.status === 'selected' ? '已选' : candidate.status === 'suggested' ? '建议' : '观测'}
                </Badge>
              </div>
              <Meter label="butterfly index" value={Math.round(candidate.butterflyIndex * 100)} tone={candidate.butterflyIndex > 0.7 ? 'rose' : 'gold'} />
              <div className="mt-3 flex flex-wrap gap-1.5">
                {candidate.downstreamEffects.map(effect => (
                  <span key={effect} className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-[var(--ink-muted)]">
                    {effect}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function ManuscriptReader({
  script,
  activeBranch,
}: {
  script: PrototypeScript
  activeBranch: WorldlineBranch
}) {
  const chapter = script.chapters[0]
  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs uppercase text-[var(--ink-dim)]">Manuscript</p>
          <h1 className="text-2xl font-semibold text-[var(--ink-paper)] md:text-3xl">{chapter.title}</h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">{chapter.subtitle} / {activeBranch.name}</p>
        </div>
        <Badge variant={activeBranch.status === 'unstable' ? 'destructive' : 'gold'}>
          {activeBranch.tone}
        </Badge>
      </div>
      <article className="manuscript-paper min-h-[420px] p-7 md:p-10">
        <p className="mb-8 text-sm text-[#6d604a]">当前世界线：{activeBranch.summary}</p>
        <div className="whitespace-pre-line text-lg leading-9 text-[#211b14] md:text-xl md:leading-10">
          {chapter.body}
        </div>
      </article>
    </section>
  )
}

export function CreativeComposer({
  script,
  onUpdateStep,
}: {
  script: PrototypeScript
  onUpdateStep: (stepId: CreativeStepId, draft: string) => void
}) {
  const [activeStepId, setActiveStepId] = useState<CreativeStepId>('scene')
  const activeStep = script.creativeSteps.find(step => step.id === activeStepId) || script.creativeSteps[0]

  return (
    <section className="narrative-panel p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-[var(--ink-dim)]">Four-step writing</p>
          <h2 className="text-lg font-semibold text-[var(--ink-paper)]">四步写作</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="stasis">自动保存</Badge>
          <PenLine className="text-[var(--manuscript-gold)]" size={20} />
        </div>
      </div>
      <div role="tablist" aria-label="四步写作步骤" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {script.creativeSteps.map(step => (
          <button
            key={step.id}
            type="button"
            role="tab"
            aria-selected={step.id === activeStepId}
            className={cn(
              'rounded-lg border px-3 py-2 text-left text-sm transition-all',
              step.id === activeStepId
                ? 'border-[var(--manuscript-gold)]/55 bg-[var(--manuscript-gold)]/10 text-[var(--ink-paper)]'
                : 'border-white/10 bg-white/[0.025] text-[var(--ink-muted)] hover:border-white/20',
            )}
            onClick={() => setActiveStepId(step.id)}
          >
            {step.label}
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <p className="text-sm font-semibold text-[var(--ink-paper)]">{activeStep.prompt}</p>
          <Badge variant="outline">{activeStep.label}</Badge>
        </div>
        <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{activeStep.helper}</p>
        <textarea
          className="narrative-input mt-4 min-h-28 w-full resize-y"
          value={activeStep.draft}
          onChange={event => onUpdateStep(activeStep.id, event.target.value)}
        />
      </div>
    </section>
  )
}

export function SocraticSeedPanel({ script }: { script: PrototypeScript }) {
  const prompts = [
    { label: '人物关系', value: script.relationshipMatrix },
    { label: '核心冲突', value: script.coreConflict },
    { label: '世界规则', value: script.world },
  ]

  return (
    <section className="narrative-panel p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-[var(--ink-dim)]">Socratic seeds</p>
          <h2 className="text-lg font-semibold text-[var(--ink-paper)]">对话种子</h2>
        </div>
        <MessageCircle className="text-[var(--worldline-cyan)]" size={20} />
      </div>
      <div className="space-y-3">
        {prompts.map(prompt => (
          <div key={prompt.label} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
            <p className="text-xs text-[var(--ink-dim)]">{prompt.label}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">{prompt.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function ForeshadowPanel({ hooks }: { hooks: ForeshadowHook[] }) {
  return (
    <section className="narrative-panel p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-[var(--ink-dim)]">Promise ledger</p>
          <h2 className="text-lg font-semibold text-[var(--ink-paper)]">伏笔</h2>
        </div>
        <ListChecks className="text-[var(--manuscript-gold)]" size={20} />
      </div>
      <div className="space-y-3">
        {hooks.map(hook => (
          <div key={hook.id} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[var(--ink-paper)]">{hook.label}</h3>
              <Badge variant={hook.status === 'triggered' ? 'stasis' : hook.status === 'planted' ? 'gold' : 'outline'}>
                {hook.status === 'triggered' ? '触发' : hook.status === 'planted' ? '已埋' : '待埋'}
              </Badge>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{hook.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function HeroSheet({ hero }: { hero: PrototypeHero }) {
  return (
    <section className="narrative-panel p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-[var(--ink-dim)]">主角档案</p>
          <h2 className="text-lg font-semibold text-[var(--ink-paper)]">{hero.name}</h2>
          <p className="mt-1 text-xs text-[var(--ink-muted)]">{hero.title}</p>
        </div>
        <UserRound className="text-[var(--worldline-cyan)]" size={20} />
      </div>
      <div className="grid gap-3">
        <Meter label="专注" value={hero.focus} tone="gold" />
        <Meter label="直觉" value={hero.intuition} tone="cyan" />
        <Meter label="勇气" value={hero.courage} tone="teal" />
      </div>
      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.025] p-3">
        <p className="text-xs text-[var(--ink-dim)]">Lv.{hero.level} 装备</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {hero.inventory.map(item => (
            <span key={item} className="rounded-md border border-white/10 px-2 py-1 text-xs text-[var(--ink-muted)]">
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

export function MultiverseDiff({ branch }: { branch: WorldlineBranch }) {
  return (
    <section className="narrative-panel p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-[var(--ink-dim)]">Multiverse Diff</p>
          <h2 className="text-lg font-semibold text-[var(--ink-paper)]">宇宙差异</h2>
        </div>
        <Layers3 className="text-[var(--worldline-cyan)]" size={20} />
      </div>
      <div className="space-y-2">
        {branch.diffHighlights.map(highlight => (
          <div key={highlight} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-sm text-[var(--ink-muted)]">
            <ChevronRight size={14} className="text-[var(--manuscript-gold)]" />
            {highlight}
          </div>
        ))}
      </div>
    </section>
  )
}

export function CapabilityRail() {
  const capabilities = [
    {
      label: '学习系统',
      value: 'shadow visual',
      icon: Brain,
      description: '仅展示学习/审核门禁状态，不阻断创作流。',
    },
    {
      label: '发布审核',
      value: 'manual gate',
      icon: ShieldCheck,
      description: '真实发布仍等待后端商业化能力补齐。',
    },
    {
      label: '世界线生成',
      value: 'demo mode',
      icon: Map,
      description: '当前为本地可演示分支，未调用 AI 生成接口。',
    },
  ]

  return (
    <section className="grid gap-3 md:grid-cols-3">
      {capabilities.map(item => {
        const Icon = item.icon
        return (
          <div key={item.label} className="narrative-panel p-4">
            <div className="flex items-center justify-between gap-3">
              <Icon className="text-[var(--worldline-cyan)]" size={20} />
              <Badge variant="outline">{item.value}</Badge>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-[var(--ink-paper)]">{item.label}</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{item.description}</p>
          </div>
        )
      })}
    </section>
  )
}

export function QuickActionCard({
  title,
  description,
  icon,
  action,
}: {
  title: string
  description: string
  icon: 'book' | 'branch' | 'write'
  action: () => void
}) {
  const icons = {
    book: BookOpen,
    branch: GitBranch,
    write: PenLine,
  }
  const Icon = icons[icon]

  return (
    <button type="button" className="narrative-panel group p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--manuscript-gold)]/35" onClick={action}>
      <Icon className="text-[var(--manuscript-gold)]" size={22} />
      <h3 className="mt-4 text-lg font-semibold text-[var(--ink-paper)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{description}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--worldline-cyan)]">
        进入 <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
      </span>
    </button>
  )
}

export function EmptyUnavailableState({ title, message }: { title: string; message: string }) {
  return (
    <div className="narrative-panel p-5">
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 text-[var(--ink-dim)]" size={18} />
        <div>
          <h3 className="text-sm font-semibold text-[var(--ink-paper)]">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">{message}</p>
        </div>
      </div>
    </div>
  )
}
