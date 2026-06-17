// ============================================================
// ErrorState - 错误状态展示
// ============================================================
// 显示API错误信息，提供重试按钮

import { cn } from '@/lib/utils'
import { Button } from '@/components/primitives/Button'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({ message = '量子场扰动，连接暂时中断', onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-20 gap-4', className)}>
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      </div>
      <p className="text-sm text-slate-400">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mr-1"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
          重试同步
        </Button>
      )}
    </div>
  )
}
