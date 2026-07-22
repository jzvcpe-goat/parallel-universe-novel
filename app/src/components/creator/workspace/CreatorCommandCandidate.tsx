import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface CreatorCommandCandidateFrameProps {
  title: string
  eyebrow: string
  onClose: () => void
  children: ReactNode
  className?: string
}

export function CreatorCommandCandidateFrame({
  title,
  eyebrow,
  onClose,
  children,
  className,
}: CreatorCommandCandidateFrameProps) {
  return (
    <Card
      className={cn('creator-command-candidate', className)}
      variant="glass"
      padding="none"
      role="complementary"
      aria-label="候选卡"
    >
      <CardHeader className="flex-row items-start justify-between gap-3 p-0">
        <div>
          <Badge variant="gold">{eyebrow}</Badge>
          <CardTitle className="mt-3 text-xl text-[var(--creator-text)]">{title}</CardTitle>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>收起</Button>
      </CardHeader>
      <CardContent className="p-0">
        {children}
      </CardContent>
    </Card>
  )
}

export interface CreatorCommandVariantModel {
  label: string
  title: string
  effect: string
  risk: string
  action: string
}

export interface CreatorCommandCandidateModel {
  id: string
  title: string
  body: string
  variants: CreatorCommandVariantModel[]
  options: string[]
  primaryLabel: string
  feedback: string
}

export type CreatorCommandCandidateApplyMode = 'insert' | 'replace' | 'branch' | 'hold'

function creatorCommandCandidateApplyMode(label: string): CreatorCommandCandidateApplyMode {
  if (label.includes('替换')) return 'replace'
  if (label.includes('插入')) return 'insert'
  if (label.includes('分支') || label.includes('视角')) return 'branch'
  return 'hold'
}

function creatorCommandApplyReceiptCopy(mode: CreatorCommandCandidateApplyMode) {
  const copies: Record<CreatorCommandCandidateApplyMode, {
    title: string
    body: string
    next: string
  }> = {
    insert: {
      title: '已送到正文区预览',
      body: '写作台会打开可插入的正文候选，确认前不会改变草稿。',
      next: '下一步：在正文区点「插入这一段」。',
    },
    replace: {
      title: '已送到正文区预览',
      body: '写作台会打开可替换的正文候选，确认前不会覆盖原段落。',
      next: '下一步：在正文区点「替换当前段落」。',
    },
    branch: {
      title: '已送到支线试写',
      body: '写作台会切到分支比较，正式剧情不会被改动。',
      next: '下一步：比较后再决定是否保留。',
    },
    hold: {
      title: '已保留判断',
      body: '当前选择先留在候选卡里，正文和正式剧情都没有变化。',
      next: '下一步：继续比较或收起候选。',
    },
  }
  return copies[mode]
}

export interface CreatorCommandCandidateSurfaceProps {
  candidate: CreatorCommandCandidateModel | null
  feedback: string
  selectedAction: string
  onChoose: (label: string) => void
  onClose: () => void
  className?: string
}

export function CreatorCommandCandidateSurface({
  candidate,
  feedback,
  selectedAction,
  onChoose,
  onClose,
  className,
}: CreatorCommandCandidateSurfaceProps) {
  if (!candidate) return null
  const selectedMode = selectedAction ? creatorCommandCandidateApplyMode(selectedAction) : null
  const receiptCopy = selectedMode ? creatorCommandApplyReceiptCopy(selectedMode) : null

  return (
    <CreatorCommandCandidateFrame
      eyebrow="候选卡"
      title={candidate.title}
      onClose={onClose}
      className={className}
    >
      <p className="mt-3 text-sm leading-6 text-[var(--creator-text-muted)]">{candidate.body}</p>
      <div className="creator-command-variant-block">
        <div className="creator-command-variant-head">
          <span>候选比较</span>
          <strong>先比较，再决定是否采用。</strong>
        </div>
        <div className="creator-command-variant-grid">
          {candidate.variants.map(variant => (
            <Button
              key={`${variant.label}-${variant.title}`}
              type="button"
              variant={variant.action === candidate.primaryLabel ? 'gold' : 'outline'}
              size="sm"
              className="creator-command-variant"
              data-agent-action="apply_suggestion"
              aria-pressed={variant.action === selectedAction}
              onClick={() => onChoose(variant.action)}
            >
              <span>{variant.label}</span>
              <strong>{variant.title}</strong>
              <small>
                <em>效果</em>
                {variant.effect}
              </small>
              <small>
                <em>风险</em>
                {variant.risk}
              </small>
              <i>{variant.action}</i>
            </Button>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {candidate.options.map(option => (
          <Button
            key={option}
            type="button"
            variant={option === candidate.primaryLabel ? 'gold' : 'outline'}
            size="sm"
            className="creator-candidate-option"
            data-agent-action="apply_suggestion"
            aria-pressed={option === selectedAction}
            onClick={() => onChoose(option)}
          >
            <span>{option}</span>
            <Badge variant={option === candidate.primaryLabel ? 'gold' : 'outline'}>
              {option === candidate.primaryLabel ? '建议' : '可选'}
            </Badge>
          </Button>
        ))}
      </div>
      {feedback ? (
        <div className="creator-command-apply-receipt">
          <p>应用路径</p>
          <div className="creator-command-apply-steps">
            <span className="is-ready">候选卡</span>
            <span className={selectedMode === 'branch' ? 'is-ready' : selectedMode === 'hold' ? '' : 'is-ready'}>
              {selectedMode === 'branch' ? '分支比较' : '正文区预览'}
            </span>
            <span>{selectedMode === 'hold' ? '稍后决定' : '作者确认'}</span>
          </div>
          <strong>{receiptCopy?.title || '当前结果'}</strong>
          <small>{feedback}</small>
          {receiptCopy ? <em>{receiptCopy.next}</em> : null}
        </div>
      ) : (
        <p className="mt-4 text-xs leading-5 text-[var(--creator-text-dim)]">
          选择只会先形成候选，不会直接改正文。
        </p>
      )}
    </CreatorCommandCandidateFrame>
  )
}
