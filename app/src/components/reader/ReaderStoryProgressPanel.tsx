import { CheckCircle2 } from 'lucide-react'
import type { BadgeProps } from '@/components/ui/badge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LiquidGlassMetric } from '@/components/ui/liquid-glass'
import { WorldlineConstellation } from '@/components/design-system/UniverseDepth'

interface ReaderStoryProgressPanelProps {
  isSavedOnline: boolean
  stateLabel: string
  stateTone: BadgeProps['variant']
  notice: string
  pageLabel: string
  saved: boolean
  nextSceneStatus: string
  choiceLabel?: string
  hasWorldline: boolean
}

export function ReaderStoryProgressPanel({
  isSavedOnline,
  stateLabel,
  stateTone,
  notice,
  pageLabel,
  saved,
  nextSceneStatus,
  choiceLabel,
  hasWorldline,
}: ReaderStoryProgressPanelProps) {
  return (
    <Card variant="glass" padding="md" className="reader-story-progress-panel pu-motion-lift">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={isSavedOnline ? 'text-[var(--pu-teal-500)]' : 'text-[var(--ink-dim)]'} size={18} />
            <CardTitle className="text-lg text-[var(--ink-paper)]">阅读进度</CardTitle>
          </div>
          <Badge variant={stateTone}>{stateLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-[var(--ink-muted)]">{notice}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <LiquidGlassMetric label="页码" value={pageLabel} valueVariant="label" className="reader-story-progress-metric text-center" />
          <LiquidGlassMetric label="书架" value={saved ? '已加入' : '未加入'} valueVariant="label" className="reader-story-progress-metric text-center" />
          <LiquidGlassMetric label="下一幕" value={nextSceneStatus} valueVariant="label" className="reader-story-progress-metric text-center" />
        </div>
        <div className="mt-4">
          <WorldlineConstellation
            activeIndex={choiceLabel ? 3 : 2}
            labels={['Q-15', 'Q-16', 'Q-17', 'IF', '新章']}
          />
        </div>
        {choiceLabel ? <p className="mt-3 text-xs leading-5 text-[var(--ink-muted)]">已选择：{choiceLabel}</p> : null}
        {hasWorldline ? <p className="mt-3 text-[11px] text-[var(--ink-dim)]">你的选择会用于安排后续章节。</p> : null}
      </CardContent>
    </Card>
  )
}
