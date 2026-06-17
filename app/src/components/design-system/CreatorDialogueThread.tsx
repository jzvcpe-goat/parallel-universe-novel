import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

type CreatorTurn = Record<string, unknown>

interface CreatorDialogueThreadProps {
  turns: CreatorTurn[]
  questions: string[]
  value: string
  notice?: string
  loading?: boolean
  onChange: (value: string) => void
  onSubmit: () => void
  onUseQuestion: (question: string) => void
}

function turnRole(turn: CreatorTurn) {
  return String(turn.role || '')
}

function turnContent(turn: CreatorTurn) {
  return String(turn.content || turn.story_text || turn.message || '').trim()
}

function assistantLead(turn: CreatorTurn) {
  const storyText = String(turn.story_text || '').trim()
  const message = String(turn.message || '').trim()
  return storyText && message ? message : ''
}

export function CreatorDialogueThread({
  turns,
  questions,
  value,
  notice,
  loading = false,
  onChange,
  onSubmit,
  onUseQuestion,
}: CreatorDialogueThreadProps) {
  return (
    <div className="creator-dialogue-flow" data-testid="creator-dialogue-thread">
      <div className="creator-thread creator-thread-active">
        {turns.map((turn, index) => {
          const role = turnRole(turn)
          const content = turnContent(turn)
          const lead = role === 'assistant' ? assistantLead(turn) : ''
          if (!content) return null

          return (
            <article key={`${role}-${index}`} className={role === 'user' ? 'creator-message-user' : 'creator-message-ai'}>
              <p className="creator-message-label">
                {role === 'user' ? '你说' : content.length > 120 ? '开场正文' : '创作助手'}
              </p>
              {lead ? <p className="creator-assistant-lead">{lead}</p> : null}
              <div className={role === 'assistant' && content.length > 120 ? 'creator-draft-paper' : 'creator-message-body'}>
                {content}
              </div>
            </article>
          )
        })}
      </div>

      {questions.length ? (
        <section className="creator-questions">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-dim)]">我只追问最关键的两件事</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {questions.slice(0, 2).map(question => (
              <button
                key={question}
                type="button"
                className="creator-question-button"
                onClick={() => onUseQuestion(question)}
              >
                {question}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="creator-composer">
        <textarea
          value={value}
          onChange={event => onChange(event.target.value)}
          onKeyDown={event => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              onSubmit()
            }
          }}
          placeholder="回答上面的问题，或者直接说下一段要发生什么。Command/Ctrl + Enter 发送。"
          rows={4}
        />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-xs leading-5 text-[var(--ink-dim)]">
            {notice || '不用整理设定。直接回答，下一段会把你的选择写进去。'}
          </p>
          <Button variant="gold" onClick={onSubmit} disabled={!value.trim() || loading}>
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            继续写下一段
          </Button>
        </div>
      </div>
    </div>
  )
}
