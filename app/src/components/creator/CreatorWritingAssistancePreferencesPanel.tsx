import { RotateCcw, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type {
  AdvisoryLensId,
  CreatorWritingAssistPreferences,
} from '@/features/creator-decision/types'
import { cn } from '@/lib/utils'
import { creatorWritingAssistLensLabel } from './workspace/creatorWritingAssistCopy'

const availableLensIds: AdvisoryLensId[] = [
  'pov_focalization',
  'dialogue_subtext',
  'prose_rhythm',
  'ending_payoff',
]

export interface CreatorWritingAssistancePreferencesPanelProps {
  preferences: CreatorWritingAssistPreferences
  saving: boolean
  clearing: boolean
  onChange: (preferences: CreatorWritingAssistPreferences) => void
  onSave: () => void
  onClear: () => void
  className?: string
}

export function CreatorWritingAssistancePreferencesPanel({
  preferences,
  saving,
  clearing,
  onChange,
  onSave,
  onClear,
  className,
}: CreatorWritingAssistancePreferencesPanelProps) {
  function toggleLens(lensId: AdvisoryLensId, checked: boolean) {
    const current = preferences.projectLensIds.filter((item): item is AdvisoryLensId => (
      availableLensIds.includes(item as AdvisoryLensId)
    ))
    const projectLensIds = checked
      ? [...new Set([...current, lensId])].slice(0, 2)
      : current.filter(item => item !== lensId)
    onChange({ ...preferences, projectLensIds })
  }

  return (
    <section
      className={cn('border-y border-[var(--creator-border)] py-5', className)}
      aria-labelledby="creator-writing-assistance-title"
      data-slot="creator-writing-assistance-preferences"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 id="creator-writing-assistance-title" className="text-base font-semibold text-[var(--creator-text)]">写作建议</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--creator-text-muted)]">
            只在正文完成后的自然检查点出现；不会自动改写，也不会影响正文确认。
          </p>
        </div>
        <label className="flex items-center gap-3 text-sm text-[var(--creator-text)]">
          <Checkbox
            checked={preferences.enabled}
            onCheckedChange={checked => onChange({ ...preferences, enabled: checked === true })}
          />
          <span>{preferences.enabled ? '已开启' : '已关闭'}</span>
        </label>
      </div>

      {preferences.enabled ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="写作建议方式">
            <Button
              type="button"
              size="sm"
              variant={preferences.selectionMode === 'recommended' ? 'gold' : 'outline'}
              aria-pressed={preferences.selectionMode === 'recommended'}
              onClick={() => onChange({ ...preferences, selectionMode: 'recommended' })}
            >
              按本章推荐
            </Button>
            <Button
              type="button"
              size="sm"
              variant={preferences.selectionMode === 'custom' ? 'gold' : 'outline'}
              aria-pressed={preferences.selectionMode === 'custom'}
              onClick={() => onChange({ ...preferences, selectionMode: 'custom' })}
            >
              自己选择
            </Button>
          </div>

          {preferences.selectionMode === 'custom' ? (
            <fieldset>
              <legend className="text-sm font-medium text-[var(--creator-text)]">本章最多关注两项</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {availableLensIds.map(lensId => {
                  const checked = preferences.projectLensIds.includes(lensId)
                  const selectedCount = preferences.projectLensIds.filter(item => availableLensIds.includes(item as AdvisoryLensId)).length
                  return (
                    <label key={lensId} className="flex items-center gap-3 text-sm text-[var(--creator-text-muted)]">
                      <Checkbox
                        checked={checked}
                        disabled={!checked && selectedCount >= 2}
                        onCheckedChange={value => toggleLens(lensId, value === true)}
                      />
                      <span>{creatorWritingAssistLensLabel(lensId)}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={onSave} disabled={saving || clearing} loading={saving}>
          <Save size={14} aria-hidden="true" />{saving ? '保存中...' : '保存写作建议'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={saving || clearing}>
          <RotateCcw size={14} aria-hidden="true" />{clearing ? '重置中...' : '恢复默认'}
        </Button>
      </div>
    </section>
  )
}
