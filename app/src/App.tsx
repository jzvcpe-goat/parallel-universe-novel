// ============================================================
// App - 平行宇宙小说网页版路由入口
// ============================================================
// 路由：读者优先，旧 welcome 入口收敛到新版商业首页

import { Navigate, Routes, Route, useLocation, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { WorkspaceNav } from '@/components/patterns/WorkspaceNav'
import Home from '@/pages/Home'
import Story from '@/pages/Story'
import Library from '@/pages/Library'
import Create from '@/pages/Create'
import Studio from '@/pages/Studio'
import Account from '@/pages/Account'
import { ErrorBoundary } from '@/components/patterns/ErrorBoundary'

function AppLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  const getActiveId = () => {
    const path = location.pathname
    if (path === '/') return 'soul'
    if (path.startsWith('/story')) return 'story'
    if (path.startsWith('/library')) return 'library'
    if (path.startsWith('/create')) return 'create'
    if (path.startsWith('/settings')) return 'member'
    return 'soul'
  }

  const activeId = getActiveId()

  const navItems = [
    { id: 'soul', icon: 'soul', label: t('nav.soul'), href: '/' },
    { id: 'story', icon: 'story', label: t('nav.story'), href: '/story' },
    { id: 'library', icon: 'library', label: t('nav.library'), href: '/library' },
    { id: 'create', icon: 'create', label: t('nav.create'), href: '/create' },
    { id: 'member', icon: 'member', label: '会员', href: '/settings' },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--void)]">
      <WorkspaceNav
        items={navItems.map(item => ({
          ...item,
          active: item.id === activeId,
        }))}
        onNavigate={href => navigate(href)}
      />
      <main className="relative min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-24 pt-4 md:ml-20 md:p-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/welcome" element={<Home />} />
          <Route path="/story" element={<Story />} />
          <Route path="/library" element={<Library />} />
          <Route path="/create" element={<Create />} />
          <Route path="/settings" element={<Account />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppLayout />
    </ErrorBoundary>
  )
}
