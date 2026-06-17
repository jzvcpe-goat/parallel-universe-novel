import { Loader2, Send, Sparkles } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CreatorConversationPanelProps {
  value: string
  notice: string
  examples: string[]
  loading?: boolean
  title?: string
  description?: string
  placeholder?: string
  submitLabel?: string
  className?: string
  onChange: (value: string) => void
  onSubmit: () => void
  onUseExample: (example: string) => void
}

export function CreatorConversationPanel({
  value,
  notice,
  examples,
  loading = false,
  title = '先别整理设定。我们从一句话开始。',
  description = '你可以说一个画面、一个秘密、一个选择，或者一个想让读者翻页的异常。我会先写开场，再问最关键的问题。',
  placeholder = '说一句故事种子，或者直接描述一个画面。比如：边城收到一封互相矛盾的密诏。',
  submitLabel = '开始创作',
  className,
  onChange,
  onSubmit,
  onUseExample,
}: CreatorConversationPanelProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      onSubmit()
    }
  }

  return (
    <div className={cn('creator-empty creator-empty-dialogue', className)} data-testid="creator-conversation-panel">
      <article className="creator-coach-message">
        <div className="creator-coach-avatar">
          <Sparkles size={22} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-dim)]">创作助手</p>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </article>

      <div className="creator-first-composer">
        <textarea
          value={value}
          onChange={event => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={3}
        />
        <div className="creator-first-composer-actions">
          <p className="text-xs leading-5 text-[var(--ink-dim)]">{notice}</p>
          <Button variant="gold" onClick={onSubmit} disabled={!value.trim() || loading}>
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            {submitLabel}
          </Button>
        </div>
      </div>

      <p className="creator-seed-label text-xs tracking-[0.12em] text-[var(--ink-dim)]">可以这样开始</p>
      <div className="creator-seed-examples">
        {examples.map(example => (
          <button
            key={example}
            type="button"
            onClick={() => onUseExample(example)}
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  )
}
