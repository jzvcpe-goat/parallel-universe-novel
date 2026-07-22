import type { ReactNode } from 'react'
import {
  BookOpen,
  CreditCard,
  Feather,
  FolderOpen,
  GitBranch,
  Home,
  Inbox,
  LibraryBig,
  LayoutDashboard,
  Lightbulb,
  MessageCircle,
  PenLine,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
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
  brandHref?: string
  brandLabel?: string
  brandIcon?: string
  brandTone?: 'reader' | 'creator'
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
  creatorHome: <Home size={22} />,
  creatorInbox: <Inbox size={22} />,
  creatorSpark: <Lightbulb size={22} />,
  creatorWrite: <PenLine size={22} />,
  creatorWorks: <FolderOpen size={22} />,
  creatorPublish: <ShieldCheck size={22} />,
  creatorSettings: <SlidersHorizontal size={22} />,
  creatorBrand: <Send size={22} />,
  readerBrand: <Sparkles size={22} />,
  appSettings: <Settings size={22} />,
}

export function WorkspaceNav({
  items,
  onNavigate,
  className,
  brandHref = '/',
  brandLabel = '平行宇宙小说',
  brandIcon,
  brandTone = 'reader',
}: WorkspaceNavProps) {
  return (
    <nav
      className={cn(
        'workspace-nav fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t px-2 md:bottom-auto md:right-auto md:top-0 md:h-full md:flex-col md:justify-start md:border-r md:border-t-0',
        brandTone === 'creator'
          ? 'workspace-nav-creator border-[var(--creator-nav-border)] bg-[var(--creator-nav-bg)] md:w-20 md:px-0 md:py-4 xl:w-60 xl:px-3'
          : 'workspace-nav-reader border-[var(--pu-line-700)]/70 bg-[var(--pu-void-950)]/[0.94] backdrop-blur-xl md:w-20 md:px-0 md:py-7',
        className,
      )}
      aria-label={brandTone === 'creator' ? '创作工作区导航' : '阅读导航'}
    >
      <button
        type="button"
        className={cn(
          'hidden h-12 items-center rounded-lg border md:flex',
          brandTone === 'creator'
            ? 'mb-6 w-12 justify-center border-transparent bg-transparent text-[var(--creator-nav-active-text)] hover:bg-[var(--creator-nav-hover-bg)] xl:w-full xl:justify-start xl:gap-3 xl:px-3'
            : 'mb-9 w-12 justify-center border-[var(--pu-gold-500)]/30 bg-[var(--pu-gold-500)]/10 text-[var(--pu-gold-300)] shadow-[var(--pu-shadow-gold)]',
        )}
        onClick={() => onNavigate?.(brandHref)}
        title={brandLabel}
      >
        {brandIcon ? (
          <span aria-hidden="true">{icons[brandIcon] || icons.create}</span>
        ) : (
          <img src="/parallel-assets/brand/parallel-universe-mark.svg" alt="" className="h-8 w-8" aria-hidden="true" />
        )}
        {brandTone === 'creator' ? (
          <span className="hidden min-w-0 text-left xl:block">
            <span className="block truncate text-sm font-semibold">{brandLabel}</span>
            <span className="block truncate text-xs font-normal text-[var(--creator-nav-muted)]">本机创作空间</span>
          </span>
        ) : null}
      </button>

      <div
        className={cn(
          'flex w-full items-center justify-around md:flex-1 md:flex-col md:justify-start',
          brandTone === 'creator' ? 'md:gap-1' : 'md:gap-5',
        )}
      >
        {items.map(item => (
          <button
            key={item.id}
            className={cn(
              'group relative flex h-11 w-11 items-center justify-center rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              brandTone === 'creator'
                ? cn(
                    'focus-visible:ring-[var(--creator-accent)] md:h-10 md:w-11 xl:w-full xl:justify-start xl:gap-3 xl:px-3',
                    item.active
                      ? 'bg-[var(--creator-nav-active-bg)] text-[var(--creator-nav-active-text)]'
                      : 'text-[var(--creator-nav-text)] hover:bg-[var(--creator-nav-hover-bg)] hover:text-[var(--creator-nav-active-text)]',
                  )
                : item.active
                  ? 'border border-[var(--pu-gold-500)]/35 bg-[var(--pu-gold-500)]/[0.12] text-[var(--pu-gold-300)] focus-visible:ring-[var(--pu-cyan-500)]'
                  : 'text-[var(--pu-ink-500)] hover:bg-[var(--pu-cyan-500)]/[0.08] hover:text-[var(--pu-ink-100)] focus-visible:ring-[var(--pu-cyan-500)]',
            )}
            onClick={() => onNavigate?.(item.href)}
            title={item.label}
            type="button"
            aria-current={item.active ? 'page' : undefined}
          >
            {icons[item.icon] || icons.settings}
            {brandTone === 'creator' ? (
              <span className="hidden min-w-0 truncate text-sm font-medium xl:block">{item.label}</span>
            ) : null}
            <span
              className={cn(
                'pointer-events-none absolute bottom-12 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] opacity-0 shadow-xl transition-opacity group-hover:opacity-100 md:bottom-auto md:left-14 md:top-1/2 md:-translate-x-0 md:-translate-y-1/2',
                brandTone === 'creator'
                  ? 'border-[var(--creator-nav-border)] bg-[var(--creator-nav-bg)] text-[var(--creator-nav-active-text)] xl:hidden'
                  : 'border-[var(--pu-line-700)] bg-[var(--pu-panel-900)] text-[var(--pu-ink-100)]',
              )}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}
