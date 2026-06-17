// ============================================================
// DeviationGauge - 偏离度仪表盘
// ============================================================
// 对照Design.md规范实现
// 显示总偏离度分数 + 三维拆解(角色/情节/主题) + IF分支计数

import { cn } from '@/lib/utils'
import type { DeviationAnalysis } from '@/types'

interface DeviationGaugeProps {
  analysis: DeviationAnalysis
  size?: 'sm' | 'md' | 'lg'
  showBreakdown?: boolean
  className?: string
}

export function DeviationGauge({ analysis, size = 'md', showBreakdown = false, className }: DeviationGaugeProps) {
  const sizeMap = { sm: 80, md: 120, lg: 160 }
  const dim = sizeMap[size]
  const stroke = size === 'sm' ? 6 : size === 'md' ? 8 : 10
  const radius = (dim - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (analysis.totalScore / 100) * circumference

  const score = analysis.totalScore
  const color = score < 30 ? '#14b8a6' : score < 70 ? '#f59e0b' : '#f43f5e'
  const colorEnd = score < 30 ? '#0d9488' : score < 70 ? '#ea580c' : '#dc2626'
  const textColor = score < 30 ? 'text-teal-400' : score < 70 ? 'text-amber-400' : 'text-rose-400'

  return (
    <div className={cn('relative flex flex-col items-center', className)}>
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg className="transform -rotate-90" width={dim} height={dim}>
          <circle cx={dim / 2} cy={dim / 2} r={radius} fill="none" stroke="rgba(30, 38, 66, 0.8)" strokeWidth={stroke} />
          <circle
            cx={dim / 2} cy={dim / 2} r={radius} fill="none"
            stroke="url(#deviationGradient)" strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
          <defs>
            <linearGradient id="deviationGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={colorEnd} />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-space font-bold tabular-nums', size === 'sm' ? 'text-lg' : size === 'md' ? 'text-2xl' : 'text-3xl', textColor)}>
            {analysis.totalScore}
          </span>
          <span className={cn('text-[10px] text-slate-600 uppercase tracking-wider', size === 'lg' && 'text-xs')}>
            偏离度
          </span>
        </div>
      </div>

      {showBreakdown && (
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <div className="space-y-1">
            <div className="text-[10px] text-slate-600 uppercase">角色</div>
            <div className="text-sm font-medium text-teal-400">{analysis.breakdown.character}%</div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] text-slate-600 uppercase">情节</div>
            <div className="text-sm font-medium text-amber-400">{analysis.breakdown.plot}%</div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] text-slate-600 uppercase">主题</div>
            <div className="text-sm font-medium text-rose-400">{analysis.breakdown.theme}%</div>
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500">
        <span>IF线: {analysis.ifBranchCount}</span>
        <span>平行世界: {analysis.parallelWorlds}</span>
      </div>
    </div>
  )
}
