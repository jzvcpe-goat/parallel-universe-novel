// ============================================================
// LoadingState - 加载状态展示
// ============================================================
// 量子主题加载动画

import { cn } from '@/lib/utils'

interface LoadingStateProps {
  message?: string
  className?: string
}

export function LoadingState({ message = '量子场同步中...', className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-20 gap-4', className)}>
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
        <div className="absolute inset-0 rounded-full border-2 border-t-cyan-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        <div className="absolute inset-2 rounded-full border-2 border-violet-500/20" />
        <div className="absolute inset-2 rounded-full border-2 border-t-transparent border-r-violet-400 border-b-transparent border-l-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
      </div>
      <p className="text-sm text-slate-500 animate-pulse">{message}</p>
    </div>
  )
}
