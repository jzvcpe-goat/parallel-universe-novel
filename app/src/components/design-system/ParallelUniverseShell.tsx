import * as React from 'react'
import {
  BookOpen,
  CreditCard,
  Grid2X2,
  Home,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LiquidGlass } from '@/components/ui/liquid-glass'

export type ParallelUniverseSection =
  | 'discover'
  | 'library'
  | 'reader'
  | 'member'
  | 'creator'
  | 'studio'
  | 'settings'
  | 'billing'

const railItems: Array<{ id: ParallelUniverseSection; label: string; icon: React.ReactNode }> = [
  { id: 'discover', label: '发现', icon: <Home size={18} /> },
  { id: 'reader', label: '阅读', icon: <BookOpen size={18} /> },
  { id: 'library', label: '书城', icon: <Grid2X2 size={18} /> },
  { id: 'member', label: '会员', icon: <CreditCard size={18} /> },
]

interface ParallelUniverseShellProps {
  active: ParallelUniverseSection
  title: string
  subtitle?: string
  searchPlaceholder?: string
  onNavigate?: (section: ParallelUniverseSection) => void
  children: React.ReactNode
  className?: string
}

export function ParallelUniverseShell({
  active,
  title,
  subtitle,
  searchPlaceholder = '搜索书名、类型、开场事件',
  onNavigate,
  children,
  className,
}: ParallelUniverseShellProps) {
  return (
    <div className={cn('min-h-screen bg-[var(--pu-void-900)] text-[var(--pu-ink-100)]', className)}>
      <LiquidGlass as="aside" tone="quiet" depth="flat" className="fixed inset-y-0 left-0 z-30 hidden w-[104px] rounded-none border-y-0 border-l-0 px-4 py-5 lg:block">
        <div className="mb-8 grid h-14 w-14 place-items-center rounded-lg border border-[var(--pu-cyan-500)]/35 bg-[var(--pu-panel-900)]">
          <img src="/parallel-assets/brand/parallel-universe-mark.svg" alt="平行宇宙小说" className="h-9 w-9" />
        </div>
        <nav className="space-y-3" aria-label="平行宇宙小说功能导航">
          {railItems.map(item => {
            const selected = item.id === active
            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  'grid w-full place-items-center gap-1 rounded-lg border px-2 py-2 text-xs transition-colors',
                  selected
                    ? 'border-[var(--pu-gold-300)]/45 bg-[var(--pu-gold-500)]/12 text-[var(--pu-gold-300)]'
                    : 'border-transparent text-[var(--pu-ink-500)] hover:border-[var(--pu-cyan-500)]/24 hover:bg-[rgba(69,216,255,0.08)] hover:text-[var(--pu-cyan-500)]',
                )}
                onClick={() => onNavigate?.(item.id)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </LiquidGlass>

      <div className="lg:pl-[104px]">
        <LiquidGlass as="header" tone="quiet" depth="flat" className="sticky top-0 z-20 rounded-none border-x-0 border-t-0 px-4 py-3 md:px-6">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--pu-ink-100)]">{title}</p>
              {subtitle ? <p className="mt-1 text-xs text-[var(--pu-ink-500)]">{subtitle}</p> : null}
            </div>
            <label className="flex min-w-0 items-center gap-2 rounded-lg border border-[var(--pu-line-700)] bg-[var(--pu-void-950)] px-3 py-2 text-sm text-[var(--pu-ink-500)] lg:w-[360px]">
              <Search size={15} />
              <input
                className="min-w-0 flex-1 border-0 bg-transparent text-[var(--pu-ink-100)] outline-none placeholder:text-[var(--pu-ink-650)]"
                placeholder={searchPlaceholder}
              />
            </label>
          </div>
        </LiquidGlass>
        <main className="mx-auto max-w-[1440px] px-4 py-5 md:px-6">{children}</main>
      </div>
    </div>
  )
}
