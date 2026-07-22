import { type ReactNode, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { getCreatorPivotRouteAliases } from './creatorRouteRegistry'
import { CreatorDashboardRoute } from './routes/CreatorDashboardRoute'
import { CreatorEchoRoute } from './routes/CreatorEchoRoute'
import { CreatorEditorRoute } from './routes/CreatorEditorRoute'
import { CreatorPublishBundleRoute } from './routes/CreatorPublishBundleRoute'
import { CreatorSettingsRoute } from './routes/CreatorSettingsRoute'
import { CreatorWorksRoute } from './routes/CreatorWorksRoute'
import {
  readCreatorSession,
  scheduleCreatorSessionRefresh,
  sendCreatorLoginLink,
  type CreatorSessionState,
} from './creatorSessionService'
import { CreatorFrame, RequireCreator } from '@/components/creator/CreatorAppFrame'
import { CreatorLoginPanel } from '@/components/creator/CreatorLoginSurfaces'

function useCreatorSession() {
  const [session, setSession] = useState<CreatorSessionState>({ status: 'loading' })

  async function refresh() {
    setSession(await readCreatorSession())
  }

  useEffect(() => {
    return scheduleCreatorSessionRefresh(refresh)
  }, [])

  return { session, refresh }
}

function LoginPage({ refreshSession }: { refreshSession: () => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState('输入作者邮箱，接收登录链接。')
  const [sending, setSending] = useState(false)

  async function sendLink() {
    if (!email.trim()) return
    setSending(true)
    const result = await sendCreatorLoginLink(email)
    setNotice(result.ok ? '登录链接已发送。完成登录后回到这里刷新状态。' : result.message)
    setSending(false)
  }

  return (
    <CreatorLoginPanel
      email={email}
      notice={notice}
      sending={sending}
      onEmailChange={setEmail}
      onSendLink={sendLink}
      onRefreshSession={refreshSession}
    />
  )
}

export default function LocalCreatorApp() {
  const { session, refresh } = useCreatorSession()
  const creatorPageElements: Record<string, ReactNode> = {
    '/creator': <CreatorDashboardRoute />,
    '/creator/requests': <CreatorEchoRoute />,
    '/creator/editor': <CreatorEditorRoute />,
    '/creator/works': <CreatorWorksRoute />,
    '/creator/publish': <CreatorPublishBundleRoute />,
    '/creator/settings': <CreatorSettingsRoute />,
  }
  const pivotRouteAliases = getCreatorPivotRouteAliases()

  return (
    <CreatorFrame session={session} refreshSession={refresh}>
      <Routes>
        <Route path="/" element={<Navigate to="/creator" replace />} />
        <Route path="/creator/login" element={<LoginPage refreshSession={refresh} />} />
        {Object.entries(creatorPageElements).map(([path, element]) => (
          <Route
            key={path}
            path={path}
            element={<RequireCreator session={session}>{element}</RequireCreator>}
          />
        ))}
        {pivotRouteAliases.map(route => (
          <Route
            key={route.href}
            path={route.href}
            element={<RequireCreator session={session}>{creatorPageElements[route.legacyHref]}</RequireCreator>}
          />
        ))}
        <Route path="*" element={<Navigate to="/creator" replace />} />
      </Routes>
    </CreatorFrame>
  )
}
