interface CreatorStoryNote {
  label: string
  value: string
  source: string
  tone: 'manual' | 'remembered' | 'guide'
}

interface CreatorStoryNotesProps {
  notes: CreatorStoryNote[]
}

function sourceClass(tone: CreatorStoryNote['tone']) {
  if (tone === 'manual') return 'creator-memory-source-manual'
  if (tone === 'remembered') return 'creator-memory-source-remembered'
  return 'creator-memory-source-guide'
}

export function CreatorStoryNotes({ notes }: CreatorStoryNotesProps) {
  return (
    <section className="narrative-panel creator-context-card p-5" data-testid="creator-story-notes">
      <h2 className="text-lg font-semibold text-[var(--ink-paper)]">故事笔记</h2>
      <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
        我会记住已经说过和已经写出的线索，后面续写时保持人物、场景和规则一致。
      </p>
      <div className="mt-4 space-y-2">
        {notes.map(item => (
          <div key={item.label} className="creator-memory-card">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--ink-paper)]">{item.label}</p>
              <span className={`creator-memory-source ${sourceClass(item.tone)}`}>
                {item.source}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
