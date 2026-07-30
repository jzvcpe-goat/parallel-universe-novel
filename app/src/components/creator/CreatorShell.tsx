import { type ReactNode, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { LogOut, Settings } from 'lucide-react'
import { WorkspaceNav } from '@/components/patterns/WorkspaceNav'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { LocalStatusPill } from './LocalStatusPill'
import { cn } from '@/lib/utils'

export interface CreatorNavItem {
  id: string
  icon: string
  label: string
  href: string
  active: boolean
}

export interface CreatorShellProps {
  navItems: CreatorNavItem[]
  isSignedIn: boolean
  isLocalSurface: boolean
  pageTitle: string
  pageDescription: string
  onNavigate: (href: string) => void
  onLogout: () => void
  focusMode?: boolean
  children: ReactNode
}

export function CreatorShell({
  navItems,
  isSignedIn,
  isLocalSurface,
  pageTitle,
  pageDescription,
  onNavigate,
  onLogout,
  focusMode = false,
  children,
}: CreatorShellProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const mainRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!mainRef.current) return
      mainRef.current.scrollTop = 0
      mainRef.current.scrollLeft = 0
    })
    return () => window.cancelAnimationFrame(frame)
  }, [location.pathname, location.search])

  return (
    <div className="creator-workbench-app flex h-screen overflow-hidden">
      {!focusMode ? (
        <WorkspaceNav
          items={navItems}
          onNavigate={onNavigate}
          brandHref="/creator"
          brandLabel="作者工作台"
          brandIcon="creatorBrand"
          brandTone="creator"
        />
      ) : null}
      <main
        ref={mainRef}
        className={cn(
          'creator-workbench-main relative min-w-0 flex-1 overflow-x-hidden',
          focusMode
            ? 'h-screen overflow-hidden'
            : 'overflow-y-auto px-4 pb-24 pt-3 md:ml-20 md:px-6 md:pb-8 md:pt-4 xl:ml-60',
        )}
      >
        <div className={cn(focusMode ? 'h-full w-full' : 'creator-workbench-page space-y-4')}>
          {!focusMode ? (
            <LiquidGlass as="header" tone="quiet" depth="floating" className="creator-workbench-topbar px-4 py-3 md:px-5">
            <div className="creator-workbench-titlebar">
              <div className="creator-workbench-titlebar-main">
                <span className="creator-workbench-eyebrow">作者工作台</span>
                <h1>{pageTitle}</h1>
                <p>{pageDescription}</p>
              </div>
              <div className="creator-workbench-titlebar-side">
                <div className="creator-workbench-boundary" aria-label="创作边界">
                  <LocalStatusPill isLocalSurface={isLocalSurface} />
                  <Badge variant="outline">确认后发布</Badge>
                </div>
                <div className="creator-workbench-titlebar-actions">
                  {isSignedIn ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => navigate('/creator/workspace')}>
                        <Settings size={16} aria-hidden="true" />
                        工作区
                      </Button>
                      <Button variant="ghost" size="sm" onClick={onLogout}>
                        <LogOut size={16} aria-hidden="true" />
                        退出
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
            </LiquidGlass>
          ) : null}
          {children}
        </div>
      </main>
    </div>
  )
}
