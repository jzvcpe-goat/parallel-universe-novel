// ============================================================
// AutoDirector - 自动导演模式（阅读界面集成版）
// ============================================================
// 免费账户默认开启：用户提供想法→AI生成低偏离剧情（<30%）
// 付费账户：导演模式折叠，直接展示全部选项卡

import { useState } from 'react'
import { Button } from '@/components/primitives/Button'
import { cn } from '@/lib/utils'

interface AutoDirectorProps {
  isEnabled: boolean
  onGenerate?: (keywords: string, deviation: number) => void
}

const PRESET_TAGS = ['悬疑', '感情线', '科技感', '热血', '暗黑', '轻松搞笑', '末世', '重生', '复仇', '反转']

export function AutoDirector({ isEnabled, onGenerate }: AutoDirectorProps) {
  const [keywords, setKeywords] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [deviation, setDeviation] = useState<number | null>(null)

  if (!isEnabled) return null

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const handleGenerate = async () => {
    const input = keywords || selectedTags.join('、')
    if (!input.trim()) return
    setGenerating(true)
    setResult(null)
    setDeviation(null)

    await new Promise(r => setTimeout(r, 1200))

    const mockDeviation = Math.floor(Math.random() * 25) + 3
    setDeviation(mockDeviation)
    setResult(`基于「${input}」生成的剧情走向已准备就绪。`)
    setGenerating(false)
    onGenerate?.(input, mockDeviation)
  }

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.03] p-4 space-y-3 mb-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
        </div>
        <div>
          <h4 className="text-sm font-bold text-cyan-400">自动导演模式</h4>
          <p className="text-[10px] text-cyan-400/50">免费推演辅助 · 偏离度自动约束在30%以内</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRESET_TAGS.map(tag => (
          <button key={tag} onClick={() => toggleTag(tag)}
            className={cn('px-2.5 py-0.5 rounded-full text-[11px] border transition-all',
              selectedTags.includes(tag) ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'
            )}>{tag}</button>
        ))}
      </div>

      <div className="flex gap-2">
        <input className="flex-1 bg-slate-900/50 border border-white/5 rounded-lg py-2 px-3 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 placeholder:text-slate-600"
          placeholder="输入你想要的剧情走向..." value={keywords} onChange={e => setKeywords(e.target.value)} />
        <Button variant="generation" size="sm" loading={generating} onClick={handleGenerate}>
          {generating ? '生成中' : '生成'}
        </Button>
      </div>

      {result && deviation !== null && (
        <div className="flex items-center gap-2 px-2">
          <span className="text-[10px] px-1.5 py-px rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">偏离度 {deviation}%</span>
          <span className="text-[10px] text-emerald-400/70">{result}</span>
        </div>
      )}
    </div>
  )
}
