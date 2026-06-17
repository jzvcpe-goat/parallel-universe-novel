import { Sparkles } from 'lucide-react'

export interface CreatorReasoningStep {
  label: string
  prompt: string
  outcome: string
  source: string
  tone: 'manual' | 'remembered' | 'guide'
}

interface CreatorReasoningMapProps {
  steps: CreatorReasoningStep[]
  active?: boolean
}

function toneClass(tone: CreatorReasoningStep['tone']) {
  if (tone === 'manual') return 'creator-reasoning-source-manual'
  if (tone === 'remembered') return 'creator-reasoning-source-remembered'
  return 'creator-reasoning-source-guide'
}

export function CreatorReasoningMap({ steps, active = false }: CreatorReasoningMapProps) {
  return (
    <section className="creator-reasoning-map" data-testid="creator-reasoning-map">
      <div className="creator-reasoning-head">
        <div className="creator-reasoning-icon">
          <Sparkles size={18} />
        </div>
        <div>
          <p className="text-xs tracking-[0.16em] text-[var(--ink-dim)]">创作脉络</p>
          <h3 className="text-lg font-semibold text-[var(--ink-paper)]">
            {active ? '我会按这些线索继续扩写' : '一句话会先长成这些线索'}
          </h3>
        </div>
      </div>
      <div className="creator-reasoning-steps">
        {steps.map((step, index) => (
          <article key={step.label} className="creator-reasoning-step">
            <div className="creator-reasoning-step-top">
              <span className="creator-reasoning-index">{index + 1}</span>
              <div>
                <h4>{step.label}</h4>
                <p>{step.prompt}</p>
              </div>
            </div>
            <p className="creator-reasoning-outcome">{step.outcome}</p>
            <span className={`creator-reasoning-source ${toneClass(step.tone)}`}>{step.source}</span>
          </article>
        ))}
      </div>
    </section>
  )
}
