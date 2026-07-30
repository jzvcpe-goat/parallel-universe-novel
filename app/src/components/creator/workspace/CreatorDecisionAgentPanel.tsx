import { useState } from 'react'
import { Compass, LockKeyhole, MessageSquareText, RefreshCcw, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import type { AuthorIntentContract, IntentQuestion } from '@/features/creator-decision/types'
import type { CreatorDecisionPhaseId } from '@/apps/creator/routes/creatorEditorViewModels'

export interface CreatorDecisionAgentPanelProps {
  phase: CreatorDecisionPhaseId
  intent: AuthorIntentContract | null
  questions: IntentQuestion[]
  canLockIntent: boolean
  hasCandidates: boolean
  hasSelectedCandidate: boolean
  hasActiveDraft: boolean
  hasReview: boolean
  hasPatch: boolean
  pending: boolean
  referenceMode: boolean
  notice: string
  onProposeIntent: (storySeed: string) => void
  onAnswerOption: (questionId: string, optionId: string) => void
  onAnswerCustom: (question: IntentQuestion, answer: string) => void
  onLockIntent: () => void
  onReopenIntent: () => void
  onSearchCandidates: () => void
  onGenerateScene: () => void
  onReviewScene: () => void
  onPrepareCanonPatch: () => void
}

function stageAction(input: Pick<CreatorDecisionAgentPanelProps,
  | 'phase'
  | 'hasCandidates'
  | 'hasSelectedCandidate'
  | 'hasActiveDraft'
  | 'hasReview'
  | 'hasPatch'
  | 'onSearchCandidates'
  | 'onGenerateScene'
  | 'onReviewScene'
  | 'onPrepareCanonPatch'
>) {
  if (input.phase === 'path' && !input.hasCandidates) {
    return { label: '比较叙事路径', description: '先生成结构候选，不写正文。', onClick: input.onSearchCandidates }
  }
  if ((input.phase === 'path' || input.phase === 'writing') && input.hasSelectedCandidate && !input.hasActiveDraft) {
    return { label: '写当前场景', description: '只生成一个场景候选，等待作者采用。', onClick: input.onGenerateScene }
  }
  if (input.phase === 'writing' && input.hasActiveDraft) {
    return { label: '审阅当前正文', description: '独立检查连续性和文学问题，并定位证据。', onClick: input.onReviewScene }
  }
  if (input.phase === 'review' && input.hasReview && !input.hasPatch) {
    return { label: '准备正史差异', description: '只提出结构化变化，不会写入主宇宙。', onClick: input.onPrepareCanonPatch }
  }
  return null
}

export function CreatorDecisionAgentPanel({
  phase,
  intent,
  questions,
  canLockIntent,
  hasCandidates,
  hasSelectedCandidate,
  hasActiveDraft,
  hasReview,
  hasPatch,
  pending,
  referenceMode,
  notice,
  onProposeIntent,
  onAnswerOption,
  onAnswerCustom,
  onLockIntent,
  onReopenIntent,
  onSearchCandidates,
  onGenerateScene,
  onReviewScene,
  onPrepareCanonPatch,
}: CreatorDecisionAgentPanelProps) {
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({})
  const [storySeed, setStorySeed] = useState('')
  const nextAction = stageAction({
    phase,
    hasCandidates,
    hasSelectedCandidate,
    hasActiveDraft,
    hasReview,
    hasPatch,
    onSearchCandidates,
    onGenerateScene,
    onReviewScene,
    onPrepareCanonPatch,
  })

  return (
    <Card variant="glass" padding="sm" className="border-[var(--creator-border)] bg-[var(--creator-surface)] text-[var(--creator-text)]">
      <CardHeader className="p-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Compass size={17} className="text-[var(--creator-accent)]" aria-hidden="true" />
              <CardTitle className="text-base text-[var(--creator-text)]">写作搭档</CardTitle>
            </div>
            <CardDescription className="mt-2 leading-5 text-[var(--creator-text-muted)]">
              先确认作者判断，再进入候选和正文。
            </CardDescription>
          </div>
          {referenceMode ? <Badge variant="outline">本机参考演练</Badge> : null}
        </div>
      </CardHeader>

      <CardContent className="mt-4 space-y-4 p-0">
        {!intent ? (
          <section className="rounded-md border border-[var(--creator-border)] bg-[var(--creator-editor-control)] p-3">
            <label htmlFor="creator-story-seed" className="text-xs font-semibold text-[var(--creator-text)]">
              故事种子
            </label>
            <Textarea
              id="creator-story-seed"
              rows={3}
              className="mt-2"
              value={storySeed}
              onChange={event => setStorySeed(event.target.value)}
              placeholder="写一个画面、异常或人物困境"
              aria-label="故事种子"
            />
            <p className="mt-2 text-xs leading-5 text-[var(--creator-text-muted)]">
              接下来只问两项关键判断，正文保持不变。
            </p>
            <Button type="button" size="sm" className="mt-3" onClick={() => onProposeIntent(storySeed)} loading={pending}>
              <MessageSquareText size={14} aria-hidden="true" />建立本章意图
            </Button>
          </section>
        ) : null}

        {intent?.status === 'draft' && questions.map(question => (
          <section key={question.id} className="rounded-md border border-[var(--creator-border)] bg-[var(--creator-editor-control)] p-3">
            <div className="flex items-center justify-between gap-2">
              <Badge variant={question.importance === 'blocking' ? 'gold' : 'outline'}>
                {question.importance === 'blocking' ? '关键问题' : '补充判断'}
              </Badge>
              <span className="text-xs text-[var(--creator-text-dim)]">最多两问</span>
            </div>
            <h3 className="mt-3 text-sm font-semibold leading-5 text-[var(--creator-text)]">{question.question}</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--creator-text-muted)]">{question.reason}</p>
            <div className="mt-3 grid gap-2">
              {question.options.map(option => (
                <Button
                  key={option.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto justify-start whitespace-normal py-2 text-left"
                  onClick={() => onAnswerOption(question.id, option.id)}
                  disabled={pending}
                >
                  <span className="grid gap-1">
                    <span>{option.label}</span>
                    <small className="font-normal leading-4 text-[var(--creator-text-muted)]">{option.consequence}</small>
                  </span>
                </Button>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              <Textarea
                rows={2}
                value={customAnswers[question.id] || ''}
                onChange={event => setCustomAnswers(current => ({ ...current, [question.id]: event.target.value }))}
                placeholder="写下你的判断"
                aria-label={`${question.question}的自定义回答`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onAnswerCustom(question, customAnswers[question.id] || '')}
                disabled={pending || !(customAnswers[question.id] || '').trim()}
              >
                采用我的回答
              </Button>
            </div>
          </section>
        ))}

        {intent?.agentAssumptions.length ? (
          <section className="rounded-md border border-[var(--creator-border)] p-3">
            <strong className="text-xs text-[var(--creator-text)]">暂定判断</strong>
            <ul className="mt-2 space-y-1 text-xs leading-5 text-[var(--creator-text-muted)]">
              {intent.agentAssumptions.map(assumption => <li key={assumption}>• {assumption}</li>)}
            </ul>
          </section>
        ) : null}

        {intent?.status === 'draft' && questions.length === 0 ? (
          <Button type="button" className="w-full" onClick={onLockIntent} disabled={!canLockIntent || pending}>
            <LockKeyhole size={14} aria-hidden="true" />锁定本章意图
          </Button>
        ) : null}

        {intent?.status === 'locked' ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-[var(--creator-confirm)] bg-[var(--creator-task-publish-bg)] p-3">
            <span className="text-xs font-semibold text-[var(--creator-text)]">本章意图已锁定</span>
            <Button type="button" variant="ghost" size="sm" onClick={onReopenIntent} disabled={pending}>
              <RefreshCcw size={13} aria-hidden="true" />重新打开
            </Button>
          </div>
        ) : null}

        {nextAction ? (
          <section className="rounded-md border border-[var(--creator-accent)] bg-[var(--creator-accent-soft)] p-3">
            <strong className="text-sm text-[var(--creator-text)]">{nextAction.label}</strong>
            <p className="mt-1 text-xs leading-5 text-[var(--creator-text-muted)]">{nextAction.description}</p>
            <Button type="button" size="sm" className="mt-3" onClick={nextAction.onClick} loading={pending}>
              <Sparkles size={14} aria-hidden="true" />{nextAction.label}
            </Button>
          </section>
        ) : null}

        <p role="status" className="border-t border-[var(--creator-border)] pt-3 text-xs leading-5 text-[var(--creator-text-muted)]">
          {notice}
        </p>
      </CardContent>
    </Card>
  )
}
