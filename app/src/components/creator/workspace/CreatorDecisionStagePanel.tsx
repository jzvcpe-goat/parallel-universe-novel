import { useState } from 'react'
import { GitCompareArrows, LocateFixed, Route, ShieldCheck } from 'lucide-react'
import type {
  AuthorIntentContract,
  CanonStatePatch,
  CreationSession,
  LiteraryFinding,
  NarrativeCandidate,
  RepairProposal,
  SceneDraftResult,
} from '@/features/creator-decision/types'
import { draftTextFromBlocks } from '@/features/creator-decision/sceneDrafting'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type {
  CreatorDecisionPhaseId,
  buildAuthorIntentSummary,
  buildCanonDiffViewModel,
  buildNarrativeCandidateCards,
  groupLiteraryFindings,
} from '@/apps/creator/routes/creatorEditorViewModels'
import { literaryDimensionLabel } from '@/apps/creator/routes/creatorEditorViewModels'

type IntentSummary = NonNullable<ReturnType<typeof buildAuthorIntentSummary>>
type CandidateCard = ReturnType<typeof buildNarrativeCandidateCards>[number]
type FindingGroup = ReturnType<typeof groupLiteraryFindings>[number]
type CanonDiffItem = ReturnType<typeof buildCanonDiffViewModel>[number]

export interface CreatorDecisionStagePanelProps {
  phase: CreatorDecisionPhaseId
  session: CreationSession | null
  intent: AuthorIntentContract | null
  intentSummary: IntentSummary | null
  candidates: NarrativeCandidate[]
  candidateCards: CandidateCard[]
  previewDraft: SceneDraftResult | null
  manuscript: string
  findingGroups: FindingGroup[]
  proposedRepair: RepairProposal | null
  patch: CanonStatePatch | null
  canonDiff: CanonDiffItem[]
  pending: boolean
  onSelectCandidate: (candidateId: string) => void
  onMixCandidates: (candidateIds: [string, string]) => void
  onRejectCandidate: (candidateId: string) => void
  onAdoptDraft: () => void
  onRejectDraft: () => void
  onFocusFinding: (finding: LiteraryFinding) => void
  onProposeRepair: (findingId: string) => void
  onAcceptRepair: (repairId: string) => void
  onDismissFinding: (findingId: string) => void
  onPrepareCanonPatch: () => void
  onConfirmCanon: () => void
}

function informationModeLabel(value: NarrativeCandidate['strategyAxes']['informationMode']) {
  const labels: Record<NarrativeCandidate['strategyAxes']['informationMode'], string> = {
    direct_reveal: '直接揭示',
    delayed_reveal: '延后揭示',
    dramatic_irony: '戏剧性错位',
    false_belief: '错误信念',
    partial_reveal: '部分揭示',
  }
  return labels[value]
}

function severityBadge(severity: LiteraryFinding['severity']) {
  if (severity === 'hard_block') return 'destructive' as const
  if (severity === 'preserve') return 'gold' as const
  return 'outline' as const
}

export function CreatorDecisionStagePanel({
  phase,
  session,
  intent,
  intentSummary,
  candidates,
  candidateCards,
  previewDraft,
  manuscript,
  findingGroups,
  proposedRepair,
  patch,
  canonDiff,
  pending,
  onSelectCandidate,
  onMixCandidates,
  onRejectCandidate,
  onAdoptDraft,
  onRejectDraft,
  onFocusFinding,
  onProposeRepair,
  onAcceptRepair,
  onDismissFinding,
  onPrepareCanonPatch,
  onConfirmCanon,
}: CreatorDecisionStagePanelProps) {
  const [mixCandidateIds, setMixCandidateIds] = useState<string[]>([])
  const candidateById = new Map(candidates.map(candidate => [candidate.id, candidate]))
  const previewText = previewDraft ? draftTextFromBlocks(previewDraft.contentBlocks) : ''

  function toggleMixCandidate(candidateId: string) {
    setMixCandidateIds(current => current.includes(candidateId)
      ? current.filter(id => id !== candidateId)
      : [...current.slice(-1), candidateId])
  }

  return (
    <Card variant="glass" padding="sm" className="border-[var(--creator-border)] bg-[var(--creator-surface)] text-[var(--creator-text)]">
      <CardHeader className="p-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Route size={17} className="text-[var(--creator-accent)]" aria-hidden="true" />
              <CardTitle className="text-base text-[var(--creator-text)]">阶段工作区</CardTitle>
            </div>
            <CardDescription className="mt-2 leading-5 text-[var(--creator-text-muted)]">
              只展示当前阶段需要作者判断的内容。
            </CardDescription>
          </div>
          <Badge variant="outline">{session ? `r${session.currentDraftRevision}` : '未建立'}</Badge>
        </div>
      </CardHeader>

      <CardContent className="mt-4 space-y-4 p-0">
        {phase === 'intent' ? (
          intentSummary ? (
            <section className="space-y-3 rounded-md border border-[var(--creator-border)] bg-[var(--creator-editor-control)] p-3">
              <div className="flex items-center justify-between gap-2">
                <strong className="text-sm text-[var(--creator-text)]">本章意图</strong>
                <Badge variant={intent?.status === 'locked' ? 'gold' : 'outline'}>{intentSummary.statusLabel}</Badge>
              </div>
              <dl className="grid gap-3 text-xs">
                <div><dt className="text-[var(--creator-text-dim)]">读者最终感受</dt><dd className="mt-1 leading-5 text-[var(--creator-text)]">{intentSummary.targetEmotion}</dd></div>
                <div><dt className="text-[var(--creator-text-dim)]">本场必须改变</dt><dd className="mt-1 leading-5 text-[var(--creator-text)]">{intentSummary.mustChange}</dd></div>
                <div><dt className="text-[var(--creator-text-dim)]">人物必须选择</dt><dd className="mt-1 leading-5 text-[var(--creator-text)]">{intentSummary.actorChoice}</dd></div>
              </dl>
              {intentSummary.informationBoundary.length ? (
                <div className="border-t border-[var(--creator-border)] pt-3">
                  <strong className="text-xs text-[var(--creator-text)]">信息边界</strong>
                  <ul className="mt-2 space-y-1 text-xs leading-5 text-[var(--creator-text-muted)]">
                    {intentSummary.informationBoundary.map(item => <li key={item}>• {item}</li>)}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : (
            <p className="rounded-md border border-dashed border-[var(--creator-border)] p-3 text-xs leading-5 text-[var(--creator-text-muted)]">
              尚未建立本章意图。正文仍可继续手写和保存。
            </p>
          )
        ) : null}

        {phase === 'path' ? (
          candidateCards.length ? (
            <div className="space-y-3">
              {mixCandidateIds.length === 2 ? (
                <div className="flex items-center justify-between gap-2 rounded-md border border-[var(--creator-accent)] bg-[var(--creator-accent-soft)] p-3">
                  <p className="text-xs leading-5 text-[var(--creator-text-muted)]">融合会生成一条新的结构路径，不会改动原候选。</p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onMixCandidates(mixCandidateIds as [string, string])
                      setMixCandidateIds([])
                    }}
                    disabled={pending}
                  >
                    融合所选路径
                  </Button>
                </div>
              ) : null}
              {candidateCards.map(card => {
                const candidate = candidateById.get(card.id)
                if (!candidate) return null
                return (
                  <article
                    key={card.id}
                    className="rounded-md border border-[var(--creator-border)] bg-[var(--creator-editor-control)] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--creator-text)]">{card.title}</h3>
                        <p className="mt-1 text-xs leading-5 text-[var(--creator-text-muted)]">{card.mechanism}</p>
                      </div>
                      {card.selected ? <Badge variant="gold">已选择</Badge> : <Badge variant="outline">{card.beatCount} 节拍</Badge>}
                    </div>
                    <dl className="mt-3 grid gap-2 text-xs">
                      <div><dt className="text-[var(--creator-text-dim)]">人物选择</dt><dd className="mt-1 text-[var(--creator-text)]">{card.agency}</dd></div>
                      <div><dt className="text-[var(--creator-text-dim)]">不可逆代价</dt><dd className="mt-1 text-[var(--creator-text)]">{card.irreversibleCost}</dd></div>
                      <div><dt className="text-[var(--creator-text-dim)]">信息策略</dt><dd className="mt-1 text-[var(--creator-text)]">{informationModeLabel(candidate.strategyAxes.informationMode)}</dd></div>
                      <div><dt className="text-[var(--creator-text-dim)]">未来债务</dt><dd className="mt-1 text-[var(--creator-text)]">{card.futureDebt}</dd></div>
                    </dl>
                    <details className="mt-3 border-t border-[var(--creator-border)] pt-3 text-xs">
                      <summary className="cursor-pointer font-semibold text-[var(--creator-accent)]">沙箱预演节拍</summary>
                      <ol className="mt-2 space-y-2 text-[var(--creator-text-muted)]">
                        {candidate.beats.map(beat => <li key={beat.id}>{beat.order}. {beat.action} → {beat.consequence}</li>)}
                      </ol>
                    </details>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" size="sm" onClick={() => onSelectCandidate(card.id)} disabled={card.selected || pending}>
                        {card.selected ? '当前路径' : '选择这条路径'}
                      </Button>
                      <Button
                        type="button"
                        variant={mixCandidateIds.includes(card.id) ? 'gold' : 'outline'}
                        size="sm"
                        onClick={() => toggleMixCandidate(card.id)}
                        disabled={pending}
                      >
                        {mixCandidateIds.includes(card.id) ? '已加入混合' : '加入混合'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onRejectCandidate(card.id)}
                        disabled={card.selected || pending}
                      >
                        拒绝这条路径
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-[var(--creator-border)] p-3 text-xs leading-5 text-[var(--creator-text-muted)]">
              锁定本章意图后，路径候选会先经过硬约束和差异检查。
            </p>
          )
        ) : null}

        {previewDraft ? (
          <section className="rounded-md border border-[var(--creator-accent)] bg-[var(--creator-accent-soft)] p-3">
            <div className="flex items-center gap-2">
              <GitCompareArrows size={15} aria-hidden="true" />
              <strong className="text-sm text-[var(--creator-text)]">场景候选差异</strong>
              <Badge variant={previewDraft.status === 'stale' ? 'destructive' : 'outline'}>{previewDraft.status === 'stale' ? '仅供比较' : '等待作者决定'}</Badge>
            </div>
            <div className="mt-3 grid gap-3 text-xs">
              <div><span className="text-[var(--creator-text-dim)]">当前正文</span><p className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap leading-5 text-[var(--creator-text-muted)]">{manuscript || '当前正文为空'}</p></div>
              <div className="border-t border-[var(--creator-border)] pt-3"><span className="text-[var(--creator-text-dim)]">候选正文</span><p className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap leading-5 text-[var(--creator-text)]">{previewText}</p></div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button type="button" size="sm" onClick={onAdoptDraft} disabled={pending || previewDraft.status === 'stale'}>采用候选</Button>
              <Button type="button" variant="ghost" size="sm" onClick={onRejectDraft} disabled={pending}>保留原文</Button>
            </div>
          </section>
        ) : null}

        {phase === 'review' || findingGroups.length ? (
          <div className="space-y-4">
            {findingGroups.length ? findingGroups.map(group => (
              <section key={group.severity}>
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-xs text-[var(--creator-text)]">{group.label}</strong>
                  <Badge variant={severityBadge(group.severity)}>{group.findings.length}</Badge>
                </div>
                <div className="mt-2 space-y-2">
                  {group.findings.map(finding => (
                    <article key={finding.id} className="rounded-md border border-[var(--creator-border)] bg-[var(--creator-editor-control)] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={severityBadge(finding.severity)}>{literaryDimensionLabel(finding.dimension)}</Badge>
                        <span className="text-xs text-[var(--creator-text-dim)]">{finding.confidence === 'high' ? '高置信' : finding.confidence === 'medium' ? '中置信' : '低置信'}</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[var(--creator-text)]">{finding.diagnosis}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--creator-text-muted)]">{finding.readerImpact}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => onFocusFinding(finding)}>
                          <LocateFixed size={13} aria-hidden="true" />定位证据
                        </Button>
                        {finding.severity !== 'preserve' ? (
                          <Button type="button" variant="outline" size="sm" onClick={() => onProposeRepair(finding.id)} disabled={pending}>生成局部修改</Button>
                        ) : null}
                        {finding.severity !== 'hard_block' ? (
                          <Button type="button" variant="ghost" size="sm" onClick={() => onDismissFinding(finding.id)} disabled={pending}>忽略本次</Button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )) : (
              <p className="rounded-md border border-dashed border-[var(--creator-border)] p-3 text-xs leading-5 text-[var(--creator-text-muted)]">
                当前还没有可展示的审阅结论。
              </p>
            )}
          </div>
        ) : null}

        {proposedRepair ? (
          <section className="rounded-md border border-[var(--creator-confirm)] bg-[var(--creator-task-publish-bg)] p-3">
            <strong className="text-sm text-[var(--creator-text)]">局部修改候选</strong>
            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[var(--creator-text-muted)]">
              {proposedRepair.proposedContent || '这项建议只提供表达方向，不会自动改写。'}
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-3"
              onClick={() => onAcceptRepair(proposedRepair.id)}
              disabled={pending || proposedRepair.operation === 'offer_variants'}
            >
              采用这处修改
            </Button>
          </section>
        ) : null}

        {phase === 'canon' || patch ? (
          <section className="rounded-md border border-[var(--creator-confirm)] bg-[var(--creator-task-publish-bg)] p-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} aria-hidden="true" />
              <strong className="text-sm text-[var(--creator-text)]">主宇宙差异</strong>
            </div>
            {session?.phase === 'canon_committed' ? (
              <div className="mt-3 rounded-md border border-[var(--creator-border)] p-3 text-xs leading-5 text-[var(--creator-text-muted)]">
                已由作者确认并写入本机主宇宙 r{session.baseCanonRevision}。如需继续创作，请重新建立下一轮本章意图。
              </div>
            ) : patch ? (
              <div className="mt-3 space-y-2">
                {canonDiff.length ? canonDiff.map(item => (
                  <div key={item.id} className="rounded-md border border-[var(--creator-border)] p-2 text-xs">
                    <div className="flex items-center justify-between gap-2"><strong>{item.operation} {item.path}</strong>{item.irreversible ? <Badge variant="gold">不可逆</Badge> : null}</div>
                    <p className="mt-2 text-[var(--creator-text-muted)]">原状态：{item.before}</p>
                    <p className="mt-1 text-[var(--creator-text)]">新状态：{item.after}</p>
                    <p className="mt-1 text-[var(--creator-text-muted)]">证据 {item.evidenceCount} 处 · {item.reason}</p>
                  </div>
                )) : <p className="text-xs text-[var(--creator-text-muted)]">正文版本将进入本机主宇宙，本次没有结构状态变化。</p>}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" className="mt-2 w-full" disabled={pending}>确认正文及状态变更，写入主宇宙</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认写入本机主宇宙？</AlertDialogTitle>
                      <AlertDialogDescription>
                        这会原子保存当前接受的正文、状态差异和人工确认记录。写作搭档不能执行这一步。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>返回检查</AlertDialogCancel>
                      <AlertDialogAction asChild>
                        <Button type="button" onClick={onConfirmCanon}>确认正文及状态变更，写入主宇宙</Button>
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : (
              <Button type="button" size="sm" className="mt-3" onClick={onPrepareCanonPatch} disabled={pending}>准备主宇宙差异</Button>
            )}
          </section>
        ) : null}
      </CardContent>
    </Card>
  )
}
