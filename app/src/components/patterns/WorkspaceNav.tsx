import type { ReactNode } from 'react'
import {
  BookOpen,
  CreditCard,
  Feather,
  GitBranch,
  LibraryBig,
  LayoutDashboard,
  MessageCircle,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  id: string
  icon: string
  label: string
  href: string
  active?: boolean
}

interface WorkspaceNavProps {
  items: NavItem[]
  onNavigate?: (href: string) => void
  className?: string
}

const icons: Record<string, ReactNode> = {
  soul: <LayoutDashboard size={22} />,
  story: <BookOpen size={22} />,
  library: <LibraryBig size={22} />,
  create: <Feather size={22} />,
  member: <CreditCard size={22} />,
  showcase: <GitBranch size={22} />,
  studio: <Sparkles size={22} />,
  settings: <MessageCircle size={22} />,
}

export function WorkspaceNav({ items, onNavigate, className }: WorkspaceNavProps) {
  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-[var(--pu-line-700)]/70 bg-[var(--pu-void-950)]/[0.94] px-2 backdrop-blur-xl md:bottom-auto md:right-auto md:top-0 md:h-full md:w-20 md:flex-col md:justify-start md:border-r md:border-t-0 md:px-0 md:py-7',
        className,
      )}
    >
      <button
        type="button"
        className="hidden h-12 w-12 items-center justify-center rounded-lg border border-[var(--pu-gold-500)]/30 bg-[var(--pu-gold-500)]/10 text-[var(--pu-gold-300)] shadow-[var(--pu-shadow-gold)] md:mb-9 md:flex"
        onClick={() => onNavigate?.('/')}
        title="平行宇宙小说"
      >
        <img src="/parallel-assets/brand/parallel-universe-mark.svg" alt="" className="h-8 w-8" aria-hidden="true" />
      </button>

      <div className="flex w-full items-center justify-around md:flex-1 md:flex-col md:justify-start md:gap-5">
        {items.map(item => (
          <button
            key={item.id}
            className={cn(
              'group relative flex h-11 w-11 items-center justify-center rounded-lg transition-all duration-200',
              item.active
                ? 'border border-[var(--pu-gold-500)]/35 bg-[var(--pu-gold-500)]/[0.12] text-[var(--pu-gold-300)]'
                : 'text-[var(--pu-ink-500)] hover:bg-[var(--pu-cyan-500)]/[0.08] hover:text-[var(--pu-ink-100)]',
            )}
            onClick={() => onNavigate?.(item.href)}
            title={item.label}
            type="button"
          >
            {icons[item.icon] || icons.settings}
            <span className="pointer-events-none absolute bottom-12 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-[var(--pu-line-700)] bg-[var(--pu-panel-900)] px-2 py-1 text-[11px] text-[var(--pu-ink-100)] opacity-0 shadow-xl transition-opacity group-hover:opacity-100 md:bottom-auto md:left-14 md:top-1/2 md:-translate-x-0 md:-translate-y-1/2">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}
