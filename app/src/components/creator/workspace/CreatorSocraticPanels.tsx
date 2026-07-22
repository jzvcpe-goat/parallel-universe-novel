import type { ReactNode } from 'react'
import { FileText, Route as RouteIcon, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const workspaceRailCardClass =
  'border-[var(--creator-rail-border)] bg-[var(--creator-rail-bg)] text-[var(--creator-text)] shadow-none'
const workspaceAssistantCardClass =
  'border-[var(--creator-assistant-border)] bg-[var(--creator-assistant-bg)] text-[var(--creator-assistant-text)] shadow-none'
const workspacePanelClass =
  'rounded-2xl border border-[var(--creator-border)] bg-[var(--creator-editor-control)]'
export interface CreatorGuidedCoachStep {
  id: string
  label: string
  hint: string
}

export interface CreatorGuidedCoachFrameProps {
  steps: CreatorGuidedCoachStep[]
  activeStep: string
  currentLabel: string
  currentHint: string
  onStepChange: (stepId: string) => void
  question: ReactNode
  feedback?: ReactNode
  handoff: ReactNode
  guide: ReactNode
  shortcuts?: string[]
  title?: string
  badgeLabel?: string
  className?: string
}

export function CreatorGuidedCoachFrame({
  steps,
  activeStep,
  currentLabel,
  currentHint,
  onStepChange,
  question,
  feedback,
  handoff,
  guide,
  shortcuts = ['⌘K 改写', '⌘L 追问', 'Tab 补全'],
  title = '创作导师',
  badgeLabel = '跟随写作',
  className,
}: CreatorGuidedCoachFrameProps) {
  return (
    <Card
      className={cn('creator-guided-coach', className)}
      variant="glass"
      padding="sm"
      role="complementary"
      aria-label={title}
    >
      <CardHeader className="flex-row items-center justify-between gap-3 p-0">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[var(--creator-accent)]" />
          <CardTitle className="text-lg text-[var(--creator-text)]">{title}</CardTitle>
        </div>
        <Badge variant="gold">{badgeLabel}</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="mt-4 grid grid-cols-5 gap-1 rounded-xl border border-[var(--creator-border)] bg-[var(--creator-surface)] p-1">
          {steps.map(step => (
            <Button
              key={step.id}
              type="button"
              variant={activeStep === step.id ? 'gold' : 'ghost'}
              size="sm"
              className="creator-guided-step"
              aria-pressed={activeStep === step.id}
              onClick={() => onStepChange(step.id)}
            >
              {step.label}
            </Button>
          ))}
        </div>
        <div className="mt-4">
          <p className="text-xs text-[var(--creator-text-dim)]">{currentLabel}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--creator-text-muted)]">{currentHint}</p>
        </div>
        <div className="mt-4">{question}</div>
        {feedback ? <div className="mt-3">{feedback}</div> : null}
        {handoff}
        <div className="mt-4">{guide}</div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--creator-text-dim)]">
          {shortcuts.map(shortcut => (
            <Badge key={shortcut} variant="outline">{shortcut}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export type CreatorSettingAssetKind =
  | 'character'
  | 'skill'
  | 'location'
  | 'map'
  | 'faction'
  | 'item'
  | 'rule'
  | 'timeline'

export interface CreatorSettingAssetSummary {
  id: string
  kind: CreatorSettingAssetKind
  title: string
  summary: string
  stageLabel: string
  updatedLabel: string
}

export interface CreatorSocraticPlanStage {
  id: string
  label: string
  question: string
  control: string
  stateLabel: string
  assetKinds: CreatorSettingAssetKind[]
  assetCount: number
  active?: boolean
  ready?: boolean
}

const settingKindLabels: Record<CreatorSettingAssetKind, string> = {
  character: '人物',
  skill: '能力',
  location: '地点',
  map: '地图',
  faction: '势力',
  item: '物品',
  rule: '规则',
  timeline: '时间线',
}

export interface CreatorSocraticPlanBoardProps {
  stages: CreatorSocraticPlanStage[]
  activeStageId: string
  onStageSelect: (stageId: string) => void
  onCaptureAsset: (stageId: string) => void
  className?: string
}

export function CreatorSocraticPlanBoard({
  stages,
  activeStageId,
  onStageSelect,
  onCaptureAsset,
  className,
}: CreatorSocraticPlanBoardProps) {
  const activeStage = stages.find(stage => stage.id === activeStageId) || stages[0]
  const readyCount = stages.filter(stage => stage.ready || stage.assetCount > 0).length

  return (
    <Card
      className={cn(workspaceAssistantCardClass, 'overflow-hidden rounded-md', className)}
      variant="default"
      padding="none"
      role="complementary"
      aria-label="阶段控制"
      data-slot="creator-socratic-plan-board"
    >
      <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-[var(--creator-assistant-panel-border)] p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <RouteIcon size={18} className="text-[var(--creator-accent)]" />
            <CardTitle className="text-lg text-[var(--creator-assistant-text)]">阶段控制</CardTitle>
          </div>
          <CardDescription className="mt-2 text-xs leading-5 text-[var(--creator-assistant-text-muted)]">
            问答不是一次性填表；每一轮只控制一个创作阶段，并把确定的信息收进本机设定库。
          </CardDescription>
        </div>
        <Badge variant="outline">已稳住 {readyCount}/{stages.length}</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <ol
          className="divide-y divide-[var(--creator-assistant-panel-border)]"
          aria-label="创作阶段"
          data-slot="creator-socratic-stage-list"
        >
          {stages.map((stage, index) => (
            <li
              key={stage.id}
              data-slot="creator-socratic-stage"
              data-stage-id={stage.id}
              data-state={stage.id === activeStageId ? 'active' : 'idle'}
            >
              <Button
                type="button"
                variant={stage.id === activeStageId ? 'gold' : 'ghost'}
                size="sm"
                className="h-auto min-h-16 w-full justify-start gap-3 rounded-none px-4 py-3 text-left"
                aria-pressed={stage.id === activeStageId}
                onClick={() => onStageSelect(stage.id)}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current text-xs font-black">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <strong className="text-sm">{stage.label}</strong>
                    <em className="shrink-0 text-xs not-italic opacity-75">{stage.stateLabel}</em>
                  </span>
                  <small className="mt-1 block whitespace-normal text-xs leading-5 opacity-75">{stage.question}</small>
                </span>
              </Button>
            </li>
          ))}
        </ol>
      </CardContent>
      {activeStage ? (
        <CardFooter className="block border-t border-[var(--creator-assistant-panel-border)] bg-[var(--creator-assistant-panel-bg)] p-4">
          <section aria-label="当前阶段" data-slot="creator-socratic-active-stage">
            <div className="flex items-center justify-between gap-3">
              <Badge variant="gold">{activeStage.label}</Badge>
              <span className="text-xs text-[var(--creator-assistant-text-dim)]">{activeStage.assetCount} 条设定</span>
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--creator-assistant-text)]">
              {activeStage.control}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="可沉淀设定类型" data-slot="creator-socratic-asset-kinds">
              {activeStage.assetKinds.map(kind => (
                <li key={kind}><Badge variant="outline">{settingKindLabels[kind]}</Badge></li>
              ))}
            </ul>
            <Button
              type="button"
              variant="gold"
              size="sm"
              className="mt-3 min-h-10 w-full"
              onClick={() => onCaptureAsset(activeStage.id)}
              data-slot="creator-socratic-capture-action"
            >
              <FileText size={14} />
              沉淀为设定
            </Button>
          </section>
        </CardFooter>
      ) : null}
    </Card>
  )
}

export interface CreatorLocalSettingLibraryProps {
  assets: CreatorSettingAssetSummary[]
  onCreateAsset: () => void
  className?: string
}

export function CreatorLocalSettingLibrary({
  assets,
  onCreateAsset,
  className,
}: CreatorLocalSettingLibraryProps) {
  const groupedCounts = assets.reduce<Record<CreatorSettingAssetKind, number>>((counts, asset) => {
    counts[asset.kind] = (counts[asset.kind] || 0) + 1
    return counts
  }, {} as Record<CreatorSettingAssetKind, number>)
  const visibleAssets = assets.slice(0, 6)

  return (
    <Card
      className={cn('creator-local-setting-library', workspaceRailCardClass, className)}
      variant="default"
      padding="sm"
      aria-label="本机设定库"
    >
      <CardHeader className="flex-row items-start justify-between gap-3 p-0">
        <div>
          <div className="flex items-center gap-2">
            <FileText size={17} className="text-[var(--creator-accent)]" />
            <CardTitle className="text-base text-[var(--creator-text)]">本机设定库</CardTitle>
          </div>
          <CardDescription className="mt-1 text-xs leading-5 text-[var(--creator-text-muted)]">
            人物、能力、地点、地图、势力、物品、规则和时间线只跟随当前设备，发布前不会进入读者侧。
          </CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onCreateAsset}>
          <Sparkles size={14} />
          收一条
        </Button>
      </CardHeader>
      <CardContent className="mt-3 space-y-3 p-0">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(settingKindLabels) as CreatorSettingAssetKind[])
            .filter(kind => groupedCounts[kind])
            .map(kind => (
              <Badge key={kind} variant="outline">
                {settingKindLabels[kind]} {groupedCounts[kind]}
              </Badge>
            ))}
          {!assets.length ? <Badge variant="outline">等待沉淀</Badge> : null}
        </div>
        <div className="grid gap-2">
          {visibleAssets.length ? visibleAssets.map(asset => (
            <section key={asset.id} className={cn(workspacePanelClass, 'p-3')}>
              <div className="flex items-center justify-between gap-2">
                <strong className="min-w-0 truncate text-sm text-[var(--creator-text)]">{asset.title}</strong>
                <Badge variant="outline">{settingKindLabels[asset.kind]}</Badge>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--creator-text-muted)]">{asset.summary}</p>
              <div className="mt-2 flex items-center justify-between gap-2 text-[0.68rem] text-[var(--creator-text-dim)]">
                <span>{asset.stageLabel}</span>
                <span>{asset.updatedLabel}</span>
              </div>
            </section>
          )) : (
            <section className={cn(workspacePanelClass, 'p-3')}>
              <p className="text-sm font-semibold text-[var(--creator-text)]">还没有沉淀设定</p>
              <p className="mt-2 text-xs leading-5 text-[var(--creator-text-muted)]">
                回答创作问题后，可以把人物、能力、地点、地图、势力、物品、规则或时间线收入这里。
              </p>
            </section>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
