// ============================================================
// DemoNotice - 演示模式提示条
// ============================================================
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface DemoNoticeProps {
  className?: string
}

export function DemoNotice({ className }: DemoNoticeProps) {
  const { t } = useTranslation()
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div className={cn('flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm', className)}>
      <span className="text-amber-400 shrink-0 font-bold">{t('common.demoMode')}</span>
      <span className="text-amber-400/70 flex-1">{t('common.demoNotice')}</span>
      <button
        className="text-amber-400/50 hover:text-amber-400 transition-colors text-xs shrink-0"
        onClick={() => setDismissed(true)}
      >
        ✕
      </button>
    </div>
  )
}
