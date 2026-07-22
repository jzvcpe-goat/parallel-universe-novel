import { type ReactNode, useState } from 'react'
import { CheckCircle2, Sparkles, Wand2 } from 'lucide-react'
import { CreatorStoryHandoffPanel } from '@/components/creator/workspace/CreatorDraftGuidancePanels'
import {
  CreatorGuidedCoachFrame,
  type CreatorGuidedCoachStep,
} from '@/components/creator/workspace/CreatorSocraticPanels'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { type PmfReaderRequest } from '@/features/pmf/types'
import type { WritingGuideStep } from './creatorEditorViewModels'
import type { ReviewDockTab } from './creatorEditorAssistantViewModels'
import {
  buildSocraticQuestion,
  type SocraticQuestion,
} from './creatorEditorSocraticViewModels'

export function SocraticQuestionCard({
  question,
  selectedChoiceId,
  customAnswer,
  onSelect,
  onCustomAnswer,
  onNext,
  onSkip,
}: {
  question: SocraticQuestion
  selectedChoiceId: string
  customAnswer: string
  onSelect: (choiceId: string) => void
  onCustomAnswer: (value: string) => void
  onNext: () => void
  onSkip: () => void
}) {
  const selectedChoice = question.choices.find(choice => choice.id === selectedChoiceId) || null
  const impactPreview = selectedChoice?.impact || (customAnswer.trim()
    ? '会按你的补充形成一个自定义方向，先作为候选，不会直接改正文。'
    : '选择一个方向后，会先显示它对本章节奏和后续写作的影响。')
  const nextPreview = selectedChoice || customAnswer.trim()
    ? question.nextLabel
    : '先选一个方向'

  return (
    <div className="creator-question-card">
      <div className="flex items-center justify-between gap-3">
        <Badge variant="gold">创作问题</Badge>
        <Badge variant="outline">追问式引导</Badge>
      </div>
      <div className="mt-4">
        <p className="text-xs text-[var(--creator-text-dim)]">问题</p>
        <h3 className="mt-1 text-base font-semibold leading-7 text-[var(--creator-text)]">{question.question}</h3>
      </div>
      <div className="mt-3 rounded-xl border border-[var(--creator-border)] bg-[var(--creator-surface)] p-3">
        <p className="text-xs text-[var(--creator-text-dim)]">为什么问这个</p>
        <p className="mt-2 text-sm leading-6 text-[var(--creator-text-muted)]">{question.why}</p>
      </div>
      <div className="mt-3 grid gap-2">
        {question.choices.map(choice => (
          <Button
            key={choice.id}
            type="button"
            variant={selectedChoiceId === choice.id ? 'gold' : 'outline'}
            size="sm"
            className="creator-question-choice"
            aria-pressed={selectedChoiceId === choice.id}
            onClick={() => onSelect(choice.id)}
          >
            <span>{choice.label}</span>
            <small>{choice.impact}</small>
          </Button>
        ))}
      </div>
      <label className="mt-3 grid gap-2 text-xs text-[var(--creator-text-dim)]">
        自定义补充
        <Textarea
          value={customAnswer}
          onChange={event => onCustomAnswer(event.target.value)}
          className="min-h-16 border-[var(--creator-border)] bg-[var(--creator-surface)] text-sm leading-6 text-[var(--creator-text)]"
          placeholder={question.customPlaceholder}
        />
      </label>
      <div className="mt-3 rounded-xl border border-[var(--creator-border)] bg-[var(--creator-surface)] p-3">
        <p className="text-xs text-[var(--creator-text-dim)]">影响预告</p>
        <p className="mt-2 text-sm leading-6 text-[var(--creator-text)]">{impactPreview}</p>
      </div>
      <div className="creator-question-next" aria-label="回答后的下一步">
        <span>
          <em>回答后会进入</em>
          <strong>{nextPreview}</strong>
        </span>
        <span>
          <em>先影响</em>
          <strong>{selectedChoice?.label || (customAnswer.trim() ? '自定义方向' : '待选择')}</strong>
        </span>
        <span>
          <em>保护边界</em>
          <strong>只形成候选</strong>
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="gold" onClick={onNext} disabled={!selectedChoice && !customAnswer.trim()}>
          <CheckCircle2 size={15} />
          {question.nextLabel}
        </Button>
        <Button variant="outline" onClick={onSkip}>{question.skipLabel}</Button>
      </div>
    </div>
  )
}

export function GuidedComposerCoach({
  activeStep,
  onStepChange,
  suggestion,
  linkedRequest,
  titleReady,
  contentReady,
  destinationReady,
  onAccept,
  onExtractSetting,
  onReviewState,
  onPreparePublish,
}: {
  activeStep: WritingGuideStep
  onStepChange: (step: WritingGuideStep) => void
  suggestion: string
  linkedRequest: PmfReaderRequest | null
  titleReady: boolean
  contentReady: boolean
  destinationReady: boolean
  onAccept: () => void
  onExtractSetting: () => void
  onReviewState: () => void
  onPreparePublish: () => void
}) {
  const [questionChoices, setQuestionChoices] = useState<Record<WritingGuideStep, string>>({
    intent: '',
    scene: '',
    draft: '',
    memory: '',
    publish: '',
  })
  const [customAnswers, setCustomAnswers] = useState<Record<WritingGuideStep, string>>({
    intent: '',
    scene: '',
    draft: '',
    memory: '',
    publish: '',
  })
  const [questionFeedback, setQuestionFeedback] = useState('')
  const steps: Array<CreatorGuidedCoachStep & { id: WritingGuideStep }> = [
    { id: 'intent', label: '意图', hint: '先判断读者为什么想看。' },
    { id: 'scene', label: '场景', hint: '把请求变成一场能开写的戏。' },
    { id: 'draft', label: '正文', hint: '用 Tab 接受下一句，随写随改。' },
    { id: 'memory', label: '设定', hint: '把人物、场景、规则沉淀下来。' },
    { id: 'publish', label: '发布', hint: '检查读者承诺和展示位置。' },
  ]
  const current = steps.find(step => step.id === activeStep) || steps[0]
  const socraticQuestion = buildSocraticQuestion(activeStep, linkedRequest)
  const selectedChoiceId = questionChoices[activeStep] || ''
  const customAnswer = customAnswers[activeStep] || ''
  const hasQuestionDirection = Boolean(selectedChoiceId || customAnswer.trim() || questionFeedback)
  const publishReady = titleReady && contentReady && destinationReady

  function chooseQuestionOption(choiceId: string) {
    setQuestionChoices(previous => ({ ...previous, [activeStep]: choiceId }))
    setQuestionFeedback('')
  }

  function updateCustomAnswer(value: string) {
    setCustomAnswers(previous => ({ ...previous, [activeStep]: value }))
    setQuestionFeedback('')
  }

  function confirmQuestionCard() {
    const selected = socraticQuestion.choices.find(choice => choice.id === selectedChoiceId)
    const answer = selected?.label || customAnswer.trim()
    setQuestionFeedback(answer ? `已把「${answer}」整理成下一步候选。` : '已保留当前问题。')
    if (activeStep === 'intent') onStepChange('scene')
    else if (activeStep === 'scene') onStepChange('draft')
    else if (activeStep === 'draft') onStepChange('memory')
    else if (activeStep === 'memory') onStepChange('publish')
  }

  function skipQuestionCard() {
    setQuestionFeedback('已暂时跳过这个问题，正文不会变化。')
  }

  const guideCards: Record<WritingGuideStep, ReactNode> = {
    intent: (
      <div className="space-y-3">
        <GuideBlock
          label="判断方式"
          body={linkedRequest ? '先把读者原话拆成：想看的人、想看的选择、想看的代价。' : '没有请求时，先从主角最不想面对的问题切入。'}
        />
      </div>
    ),
    scene: (
      <div className="space-y-3">
        <GuideBlock
          label="第一场戏"
          body={linkedRequest ? `从「${linkedRequest.request_text}」切入，让人物先面对一个不能拖延的选择。` : '先给人物一个必须立刻行动的场景，再让世界规则压上来。'}
        />
        <div className="grid gap-2">
          {['谁在场', '要失去什么', '选择会改变哪条线'].map(item => (
            <Button key={item} type="button" variant="outline" size="sm" className="justify-start gap-2 rounded-xl px-3 py-2 text-left">
              <Wand2 size={14} />
              {item}
            </Button>
          ))}
        </div>
      </div>
    ),
    draft: (
      <div className="space-y-3">
        <GuideBlock label="下一句建议" body={suggestion} />
        <Button className="w-full" variant="gold" onClick={onAccept}>
          <Wand2 size={15} />
          接受下一句
        </Button>
        <p className="text-xs leading-5 text-[var(--creator-text-dim)]">
          写正文时按 Tab 也可以接受。接受后仍然只是草稿，适合继续改。
        </p>
      </div>
    ),
    memory: (
      <div className="space-y-3">
        <GuideBlock
          label="可沉淀设定"
          body="这一段写完后，至少收一个人物动机、一个场景状态，或一条世界规则。"
        />
        <div className="grid grid-cols-2 gap-2">
          {['人物动机', '场景状态', '世界规则', '支线承诺'].map(item => (
            <Badge key={item} variant="outline" className="justify-center py-2">{item}</Badge>
          ))}
        </div>
        <Button className="w-full" variant="outline" onClick={onExtractSetting}>
          收进作品设定
        </Button>
      </div>
    ),
    publish: (
      <div className="space-y-3">
        {[
          { label: '标题', ready: titleReady },
          { label: '正文', ready: contentReady },
          { label: '发布去向', ready: destinationReady },
          { label: '读者承诺', ready: Boolean(linkedRequest) },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between rounded-lg border border-[var(--creator-border)] bg-[var(--creator-surface)] px-3 py-2 text-sm">
            <span className="text-[var(--creator-text-muted)]">{item.label}</span>
            <Badge variant={item.ready ? 'gold' : 'outline'}>{item.ready ? '完成' : '待看'}</Badge>
          </div>
        ))}
      </div>
    ),
  }

  return (
    <CreatorGuidedCoachFrame
      steps={steps}
      activeStep={activeStep}
      currentLabel={current.label}
      currentHint={current.hint}
      onStepChange={step => onStepChange(step as WritingGuideStep)}
      question={(
        <SocraticQuestionCard
          question={socraticQuestion}
          selectedChoiceId={selectedChoiceId}
          customAnswer={customAnswer}
          onSelect={chooseQuestionOption}
          onCustomAnswer={updateCustomAnswer}
          onNext={confirmQuestionCard}
          onSkip={skipQuestionCard}
        />
      )}
      feedback={questionFeedback ? (
        <div className="mt-3 rounded-xl border border-[var(--creator-border)] bg-[var(--creator-surface)] p-3">
          <p className="text-xs text-[var(--creator-text-dim)]">创作问题结果</p>
          <p className="mt-1 text-sm leading-6 text-[var(--creator-text)]">{questionFeedback}</p>
        </div>
      ) : null}
      handoff={(
        <CreatorStoryHandoffPanel
          hasQuestionDirection={hasQuestionDirection}
          contentReady={contentReady}
          publishReady={publishReady}
          activeStep={activeStep}
          onConfirmQuestion={confirmQuestionCard}
          onAcceptDraft={onAccept}
          onReviewState={onReviewState}
          onPreparePublish={onPreparePublish}
        />
      )}
      guide={guideCards[activeStep]}
    />
  )
}

function GuideBlock({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-xl border border-[var(--creator-border)] bg-[var(--creator-surface)] p-3">
      <p className="text-xs text-[var(--creator-text-dim)]">{label}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--creator-text-muted)]">{body}</p>
    </div>
  )
}

export function AuthorJudgmentHub({
  activeStep,
  reviewDockTab,
  titleReady,
  contentReady,
  destinationReady,
  linkedRequest,
  children,
}: {
  activeStep: WritingGuideStep
  reviewDockTab: ReviewDockTab
  titleReady: boolean
  contentReady: boolean
  destinationReady: boolean
  linkedRequest: PmfReaderRequest | null
  children: ReactNode
}) {
  const reviewLabel: Record<ReviewDockTab, string> = {
    review: '审阅',
    state: '影响',
    branch: '分支',
    record: '记录',
  }
  const focusLabel: Record<WritingGuideStep, string> = {
    intent: '确认读者想看什么',
    scene: '把愿望变成一场戏',
    draft: '补正文候选',
    memory: '沉淀作品设定',
    publish: '准备发布确认',
  }
  const flow = [
    {
      label: '追问',
      value: focusLabel[activeStep],
      ready: activeStep !== 'intent',
      active: activeStep === 'intent' || activeStep === 'scene',
    },
    {
      label: '队列',
      value: linkedRequest ? '回应外界回声' : '自主章节判断',
      ready: Boolean(linkedRequest) || contentReady,
      active: activeStep === 'draft' || activeStep === 'memory',
    },
    {
      label: '审阅',
      value: reviewLabel[reviewDockTab],
      ready: titleReady && contentReady && destinationReady,
      active: activeStep === 'publish' || reviewDockTab !== 'review',
    },
  ]

  return (
    <section className="creator-judgment-hub" aria-label="作者判断台">
      <div className="creator-judgment-hub-head">
        <span>
          <Sparkles size={16} />
          <strong>作者判断台</strong>
        </span>
        <em>只处理需要判断的事</em>
      </div>
      <div className="creator-judgment-hub-flow">
        {flow.map(item => (
          <span key={item.label} className={`${item.ready ? 'is-ready' : ''} ${item.active ? 'is-active' : ''}`}>
            <b>{item.label}</b>
            <small>{item.value}</small>
          </span>
        ))}
      </div>
      <div className="creator-judgment-hub-body">
        {children}
      </div>
    </section>
  )
}
