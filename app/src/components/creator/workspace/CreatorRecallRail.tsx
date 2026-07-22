import { useEffect, useMemo, useState } from 'react'
import { Check, LocateFixed, PanelRightClose } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  creatorRecallGroupLabels,
  type CreatorRecallCandidate,
} from '@/apps/creator/routes/creatorEditorRecallViewModels'
import type { ManualRecallGroup } from '@/features/creator-decision/types'

const groupOrder: ManualRecallGroup[] = [
  'causal',
  'character_knowledge',
  'timeline',
  'promise',
]

export interface CreatorRecallRailProps {
  candidates: CreatorRecallCandidate[]
  appliedIds: string[]
  contextSourceIds: string[]
  disabled?: boolean
  onApply: (ids: string[]) => void
  onClose: () => void
}

export function CreatorRecallRail({
  candidates,
  appliedIds,
  contextSourceIds,
  disabled = false,
  onApply,
  onClose,
}: CreatorRecallRailProps) {
  const [draftIds, setDraftIds] = useState(appliedIds)
  const [locatedId, setLocatedId] = useState<string | null>(null)

  const selectedCandidates = useMemo(() => {
    const selected = new Set(draftIds)
    return candidates.filter(candidate => selected.has(candidate.id))
  }, [candidates, draftIds])
  const contextSet = useMemo(() => new Set(contextSourceIds), [contextSourceIds])
  const contextCharacters = selectedCandidates.reduce((total, item) => total + item.statement.length, 0)
  const contextShare = Math.min(100, Math.round((contextCharacters / 6000) * 100))

  useEffect(() => {
    setDraftIds(appliedIds)
  }, [appliedIds])

  function toggle(candidateId: string, checked: boolean) {
    const nextIds = checked
      ? Array.from(new Set([...draftIds, candidateId]))
      : draftIds.filter(id => id !== candidateId)
    setDraftIds(nextIds)
    onApply(nextIds)
  }

  return (
    <aside
      className="flex h-full min-h-0 w-full flex-col border-l border-[var(--creator-border)] bg-[var(--creator-surface)] text-[var(--creator-text)]"
      data-slot="creator-recall-rail"
    >
      <div
        className="flex items-start justify-between gap-3 border-b border-[var(--creator-border)] px-4 py-4"
        data-slot="creator-recall-header"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">本章召回</h2>
            <Badge variant="outline">手动选择</Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-[var(--creator-text-muted)]">
            只带入这轮真正需要的因果、知识与承诺。
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="收起本章召回">
          <PanelRightClose size={16} aria-hidden="true" />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 px-4 py-4">
          {candidates.length ? groupOrder.map(group => {
            const items = candidates.filter(candidate => candidate.group === group)
            if (!items.length) return null
            return (
              <section
                key={group}
                aria-labelledby={`creator-recall-${group}`}
                data-slot="creator-recall-group"
                data-recall-group={group}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 id={`creator-recall-${group}`} className="text-base font-semibold text-[var(--creator-text-dim)]">
                    {creatorRecallGroupLabels[group]}
                  </h3>
                  <span className="text-xs text-[var(--creator-text-muted)]">{items.length}</span>
                </div>
                <div className="divide-y divide-[var(--creator-border)] border-y border-[var(--creator-border)]">
                  {items.map(candidate => {
                    const checked = draftIds.includes(candidate.id)
                    const isInContext = contextSet.has(candidate.sourceId)
                    const located = locatedId === candidate.id
                    return (
                      <div
                        key={candidate.id}
                        className={cn('py-3', checked && 'bg-[var(--creator-accent-soft)]')}
                        data-slot="creator-recall-item"
                        data-recall-id={candidate.id}
                        data-recall-source-id={candidate.sourceId}
                        data-recall-in-context={isInContext ? 'true' : 'false'}
                      >
                        <div className="flex items-start gap-3 px-2">
                          <Checkbox
                            id={candidate.id}
                            checked={checked}
                            onCheckedChange={value => toggle(candidate.id, value === true)}
                            disabled={disabled}
                            className="mt-0.5 border-[var(--creator-accent)] data-[state=checked]:bg-[var(--creator-accent)] data-[state=checked]:text-[var(--creator-accent-foreground)]"
                            aria-label={`选择召回：${candidate.sourceLabel}`}
                          />
                          <label htmlFor={candidate.id} className="min-w-0 flex-1 cursor-pointer">
                            <span className="flex items-center gap-2 text-[15px] font-semibold text-[var(--creator-text)]">
                              <span className="truncate">{candidate.sourceLabel}</span>
                              {isInContext ? <Check size={12} className="shrink-0 text-[var(--creator-confirm)]" aria-label="已写入当前上下文" /> : null}
                            </span>
                            <span className="mt-1 block text-sm leading-6 text-[var(--creator-text-muted)]">
                              {candidate.statement}
                            </span>
                            <span className="mt-1 block text-sm leading-6 text-[var(--creator-text-dim)]">
                              此刻需要：{candidate.whyNow}
                            </span>
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() => setLocatedId(current => current === candidate.id ? null : candidate.id)}
                            aria-label={candidate.locator.label}
                            aria-expanded={located}
                          >
                            <LocateFixed size={14} aria-hidden="true" />
                          </Button>
                        </div>
                        {located ? (
                          <p className="mx-9 mt-2 border-l border-[var(--creator-accent)] pl-3 text-xs leading-5 text-[var(--creator-text-muted)]">
                            {candidate.locator.label} · 来源版本 {candidate.sourceRevision}
                          </p>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          }) : (
            <div className="border-y border-dashed border-[var(--creator-border)] py-8 text-center">
              <p className="text-sm text-[var(--creator-text)]">还没有可召回的创作记忆</p>
              <p className="mt-2 text-xs leading-5 text-[var(--creator-text-muted)]">
                已发布章节、人物卡、时间线和伏笔会在这里出现。
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      <div
        className="border-t border-[var(--creator-border)] bg-[var(--creator-surface-strong)] px-4 py-4"
        data-slot="creator-recall-footer"
      >
        <div className="flex items-center justify-between gap-3 text-xs text-[var(--creator-text-muted)]">
          <span>已选 {selectedCandidates.length} 条</span>
          <span>约占本轮上下文 {contextShare}%</span>
        </div>
        <div className="mt-2 grid grid-cols-10 gap-1" aria-hidden="true">
          {Array.from({ length: 10 }, (_, index) => (
            <span
              key={index}
              className={cn(
                'h-1 rounded-full',
                index < Math.ceil(contextShare / 10)
                  ? 'bg-[var(--creator-accent)]'
                  : 'bg-[var(--creator-editor-control)]',
              )}
            />
          ))}
        </div>
        <div
          className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-[var(--creator-confirm)]"
          data-slot="creator-recall-apply"
          aria-live="polite"
        >
          <Check size={14} aria-hidden="true" />
          <span>选择已应用</span>
        </div>
        <p className="mt-2 text-center text-xs leading-5 text-[var(--creator-text-dim)]">
          只影响下一次路径比较，不改正文或正史。
        </p>
      </div>
    </aside>
  )
}
