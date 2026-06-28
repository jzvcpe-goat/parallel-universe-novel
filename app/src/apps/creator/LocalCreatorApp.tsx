import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'
import {
  Bell,
  BookOpen,
  CheckCircle2,
  Cpu,
  Edit3,
  HeartPulse,
  LogOut,
  Radio,
  RefreshCw,
  Save,
  Send,
  Settings,
  ShieldCheck,
} from 'lucide-react'
import { Badge } from '@/components/primitives/Badge'
import { Button } from '@/components/primitives/Button'
import { Panel } from '@/components/design-system/Panel'
import { WorkspaceNav } from '@/components/patterns/WorkspaceNav'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { worldTemplates } from '@/features/parallel-universe/data'
import type { WorldTemplate } from '@/features/parallel-universe/types'
import { pmfMainBranchId, type PmfLocalDraft, type PmfReaderRequest } from '@/features/pmf/types'
import {
  createLocalDraftRef,
  ensureStarterWork,
  getPmfSession,
  isLocalCreatorHost,
  listCreatorRequests,
  publishChapter,
  readLocalAiSettings,
  readLocalDrafts,
  requestStatusLabel,
  requestTypeLabel,
  sendCreatorMagicLink,
  signOutPmf,
  syncCreatorClient,
  updateReaderRequestStatus,
  upsertCreatorProfile,
  upsertLocalDraft,
  writeLocalAiSettings,
  type LocalAiSettings,
} from '@/lib/pmfSupabase'

interface CreatorSessionState {
  status: 'loading' | 'signed_out' | 'signed_in'
  userId?: string
  email?: string
}

const starterWorks = worldTemplates.slice(0, 6)

function statusTone(status: PmfReaderRequest['status']) {
  if (status === 'published') return 'stasis'
  if (status === 'rejected') return 'destructive'
  if (status === 'in_progress') return 'gold'
  return 'outline'
}

function workTitleForId(workId: string) {
  return worldTemplates.find(template => template.id === workId)?.title || workId
}

function useCreatorSession() {
  const [session, setSession] = useState<CreatorSessionState>({ status: 'loading' })

  async function refresh() {
    const current = await getPmfSession()
    if (!current?.user?.id) {
      setSession({ status: 'signed_out' })
      return
    }
    setSession({
      status: 'signed_in',
      userId: current.user.id,
      email: current.user.email || undefined,
    })
    await upsertCreatorProfile(current.user.email || '本地作者')
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  return { session, refresh }
}

function CreatorFrame({
  session,
  refreshSession,
  children,
}: {
  session: CreatorSessionState
  refreshSession: () => Promise<void>
  children: React.ReactNode
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const activePath = location.pathname
  const isLocal = isLocalCreatorHost()
  const navItems = [
    { id: 'creator-home', icon: 'studio', label: '总览', href: '/creator' },
    { id: 'creator-requests', icon: 'settings', label: '请求队列', href: '/creator/requests' },
    { id: 'creator-editor', icon: 'create', label: '草稿发布', href: '/creator/editor' },
    { id: 'creator-settings', icon: 'member', label: '本机设置', href: '/creator/settings' },
  ]

  async function logout() {
    await signOutPmf()
    await refreshSession()
    navigate('/creator/login')
  }

  return (
    <div className="local-creator-app flex h-screen overflow-hidden bg-[var(--void)]">
      <WorkspaceNav
        items={navItems.map(item => ({ ...item, active: activePath === item.href }))}
        onNavigate={href => navigate(href)}
      />
      <main className="relative min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-24 pt-4 md:ml-20 md:p-6">
        <div className="narrative-page space-y-5">
          <header className="local-creator-topbar p-4 md:p-5">
            <div className="relative flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="gold">本地创作端</Badge>
                  <Badge variant={isLocal ? 'stasis' : 'destructive'}>{isLocal ? '本机运行' : '入口异常'}</Badge>
                  <Badge variant="outline">作者确认发布</Badge>
                </div>
                <h1 className="mt-3 text-3xl font-semibold text-[var(--ink-paper)] md:text-4xl lg:text-5xl">
                  作者本机创作台
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-muted)]">
                  作者电脑上的请求处理台：同步读者请求，在本机生成或手写草稿，人工确认后发布章节和 IF 支线。
                  授权信息、创作过程和未发布草稿都只留在作者电脑上。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {session.status === 'signed_in' ? (
                  <>
                    <Button variant="outline" onClick={() => navigate('/creator/settings')}>
                      <Settings size={16} />
                      设置
                    </Button>
                    <Button variant="ghost" onClick={logout}>
                      <LogOut size={16} />
                      退出
                    </Button>
                  </>
                ) : (
                  <Button variant="gold" onClick={() => navigate('/creator/login')}>
                    <ShieldCheck size={16} />
                    登录作者身份
                  </Button>
                )}
              </div>
            </div>
          </header>
          {children}
        </div>
      </main>
    </div>
  )
}

const localLoopCards = [
  {
    title: '读者请求',
    detail: '阅读端提交下一章、支线和续写请求，进入作者队列。',
    scope: '读者可见',
    icon: Bell,
  },
  {
    title: '本机同步',
    detail: '确认作者端在线，并同步最新的读者请求。',
    scope: '作者可见',
    icon: Radio,
  },
  {
    title: '本地草稿',
    detail: '手写或本机生成，发布前不进入公开阅读端。',
    scope: '本机保存',
    icon: Save,
  },
  {
    title: '发布回写',
    detail: '人工确认后，章节和支线会同步到阅读端。',
    scope: '公开更新',
    icon: Send,
  },
]

function LocalCreatorLoopPanel() {
  return (
    <Panel className="local-creator-loop p-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[var(--manuscript-gold)]" />
            <h2 className="text-xl font-semibold text-[var(--ink-paper)]">从请求到更新</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            这里展示读者请求从阅读端进入作者本机、再回到阅读端更新的完整流程。
            未发布内容只在本机保留，读者只会看到已确认发布的章节和支线。
          </p>
        </div>
        <Badge variant="stasis">读者请求 → 本机处理 → 阅读端更新</Badge>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        {localLoopCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div key={card.title} className="local-creator-loop-card">
              <div className="flex items-center justify-between gap-3">
                <span className="local-creator-loop-index">{index + 1}</span>
                <Icon size={17} className="text-[var(--worldline-cyan)]" />
              </div>
              <p className="mt-3 text-sm font-semibold text-[var(--ink-paper)]">{card.title}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{card.detail}</p>
              <p className="mt-3 rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-[var(--ink-dim)]">
                {card.scope}
              </p>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

function LoginPage({ refreshSession }: { refreshSession: () => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState('输入作者邮箱，接收登录链接。')
  const [sending, setSending] = useState(false)

  async function sendLink() {
    if (!email.trim()) return
    setSending(true)
    const result = await sendCreatorMagicLink(email.trim())
    setNotice(result.ok ? '登录链接已发送。打开邮件完成登录后，回到本机页面点击刷新。' : result.message)
    setSending(false)
  }

  return (
    <Panel className="p-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[var(--worldline-cyan)]" />
            <h2 className="text-xl font-semibold text-[var(--ink-paper)]">作者登录</h2>
          </div>
          <p className="mt-3 text-sm leading-7 text-[var(--ink-muted)]">
            作者端只在本机运行。登录用于确认你可以管理哪些作品，不会把本机创作设置带到公开阅读端。
          </p>
          <div className="mt-5 space-y-3">
            <Input
              type="email"
              value={email}
              placeholder="author@example.com"
              onChange={event => setEmail(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="gold" onClick={sendLink} disabled={sending}>
                <Send size={15} />
                发送登录链接
              </Button>
              <Button variant="outline" onClick={refreshSession}>
                <RefreshCw size={15} />
                我已登录，刷新状态
              </Button>
            </div>
            <p className="text-sm leading-6 text-[var(--ink-muted)]">{notice}</p>
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
          <p className="text-sm font-semibold text-[var(--ink-paper)]">本机边界</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--ink-muted)]">
            <li>模型授权信息只保存在作者电脑。</li>
            <li>草稿先保存本地，发布前必须人工确认。</li>
            <li>公网阅读端只能看到已发布章节和请求状态。</li>
          </ul>
        </div>
      </div>
    </Panel>
  )
}

function RequireCreator({ session, children }: { session: CreatorSessionState; children: React.ReactNode }) {
  if (session.status === 'loading') {
    return <Panel className="p-5 text-sm text-[var(--ink-muted)]">正在读取作者身份...</Panel>
  }
  if (session.status !== 'signed_in') return <Navigate to="/creator/login" replace />
  return <>{children}</>
}

function DashboardPage() {
  const [requests, setRequests] = useState<PmfReaderRequest[]>([])
  const [notice, setNotice] = useState('正在同步本地端状态...')
  const [clientStatus, setClientStatus] = useState('未同步')

  async function sync() {
    const heartbeat = await syncCreatorClient()
    setClientStatus(heartbeat.ok ? `在线 · ${new Date(heartbeat.data.last_seen_at).toLocaleString()}` : heartbeat.message)
    const result = await listCreatorRequests()
    if (result.ok) {
      setRequests(result.data)
      setNotice(result.data.length ? '请求队列已同步。' : '暂无待读者请求。')
    } else {
      setNotice(result.message)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void sync()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const pending = requests.filter(item => item.status === 'pending').length
  const inProgress = requests.filter(item => item.status === 'in_progress' || item.status === 'acknowledged').length
  const published = requests.filter(item => item.status === 'published').length

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-4">
        <LocalCreatorLoopPanel />
        <Panel className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <HeartPulse size={18} className="text-[var(--worldline-cyan)]" />
                <h2 className="text-xl font-semibold text-[var(--ink-paper)]">创作状态</h2>
              </div>
              <p className="mt-2 text-sm text-[var(--ink-muted)]">{notice}</p>
            </div>
            <Button variant="outline" onClick={sync}>
              <RefreshCw size={15} />
              同步
            </Button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              { label: '待处理', value: pending },
              { label: '处理中', value: inProgress },
              { label: '已发布', value: published },
            ].map(item => (
              <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
                <p className="text-2xl font-semibold text-[var(--ink-paper)]">{item.value}</p>
                <p className="mt-1 text-xs text-[var(--ink-dim)]">{item.label}</p>
              </div>
            ))}
          </div>
        </Panel>

        <StarterWorksPanel />
      </section>

      <aside className="space-y-4">
        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <Radio size={18} className="text-[var(--manuscript-gold)]" />
            <h2 className="text-lg font-semibold text-[var(--ink-paper)]">本地端心跳</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{clientStatus}</p>
        </Panel>
        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <Cpu size={18} className="text-[var(--worldline-cyan)]" />
            <h2 className="text-lg font-semibold text-[var(--ink-paper)]">生成边界</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
            当前版本不会创建云端生成任务。你可以手写正文，或在设置中配置本机模型连接后自行生成草稿。
          </p>
        </Panel>
      </aside>
    </div>
  )
}

function StarterWorksPanel() {
  const [notice, setNotice] = useState('选择一个作品绑定到当前作者，读者请求才会进入你的本地队列。')

  async function bind(template: WorldTemplate) {
    const result = await ensureStarterWork({
      id: template.id,
      title: template.title,
      summary: template.tagline,
      coverUrl: template.coverImage,
    })
    setNotice(result.ok ? `已绑定《${result.data.title}》。` : result.message)
  }

  return (
    <Panel className="p-5">
      <div className="flex items-center gap-2">
        <BookOpen size={18} className="text-[var(--manuscript-gold)]" />
        <h2 className="text-xl font-semibold text-[var(--ink-paper)]">作品绑定</h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{notice}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {starterWorks.map(template => (
          <button
            key={template.id}
            type="button"
            className="rounded-lg border border-white/10 bg-white/[0.025] p-4 text-left transition-colors hover:border-[var(--worldline-cyan)]/45"
            onClick={() => bind(template)}
          >
            <p className="text-sm font-semibold text-[var(--ink-paper)]">{template.title}</p>
            <p className="mt-1 text-xs text-[var(--ink-dim)]">{template.genre}</p>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--ink-muted)]">{template.tagline}</p>
          </button>
        ))}
      </div>
    </Panel>
  )
}

function RequestsPage() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState<PmfReaderRequest[]>([])
  const [notice, setNotice] = useState('正在同步请求队列...')

  async function load() {
    const result = await listCreatorRequests()
    if (!result.ok) {
      setNotice(result.message)
      return
    }
    setRequests(result.data)
    setNotice(result.data.length ? '请求队列已同步。' : '当前没有读者请求。')
  }

  async function setStatus(request: PmfReaderRequest, status: 'acknowledged' | 'in_progress' | 'rejected') {
    const result = await updateReaderRequestStatus(request.id, status)
    setNotice(result.ok ? `请求已更新为「${requestStatusLabel(result.data.status)}」。` : result.message)
    if (result.ok) await load()
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <Panel className="p-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-[var(--worldline-cyan)]" />
            <h2 className="text-xl font-semibold text-[var(--ink-paper)]">读者请求队列</h2>
          </div>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">{notice}</p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw size={15} />
          同步
        </Button>
      </div>
      <div className="mt-4 space-y-3">
        {requests.map(request => (
          <div key={request.id} className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={statusTone(request.status)}>{requestStatusLabel(request.status)}</Badge>
                  <Badge variant="outline">{requestTypeLabel(request.request_type)}</Badge>
                  <Badge variant="outline">{request.vote_count} 票</Badge>
                </div>
                <p className="mt-3 text-sm font-semibold text-[var(--ink-paper)]">{workTitleForId(request.work_id)}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{request.request_text}</p>
                <p className="mt-2 text-xs text-[var(--ink-dim)]">提交时间：{new Date(request.created_at).toLocaleString()}</p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button variant="ghost" size="sm" onClick={() => setStatus(request, 'acknowledged')}>已看到</Button>
                <Button variant="outline" size="sm" onClick={() => setStatus(request, 'in_progress')}>处理中</Button>
                <Button variant="gold" size="sm" onClick={() => navigate(`/creator/editor?request=${request.id}`)}>
                  <Edit3 size={14} />
                  写草稿
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setStatus(request, 'rejected')}>暂不处理</Button>
              </div>
            </div>
          </div>
        ))}
        {!requests.length && (
          <p className="rounded-lg border border-dashed border-white/10 p-6 text-sm text-[var(--ink-muted)]">
            还没有请求。请先在公网阅读端提交“想看下一章”或“想看 IF 支线”。
          </p>
        )}
      </div>
    </Panel>
  )
}

function EditorPage() {
  const location = useLocation()
  const [requests, setRequests] = useState<PmfReaderRequest[]>([])
  const [drafts, setDrafts] = useState<PmfLocalDraft[]>(() => readLocalDrafts())
  const [notice, setNotice] = useState('选择一个请求后开始写。')
  const requestId = new URLSearchParams(location.search).get('request')
  const selectedRequest = requests.find(item => item.id === requestId) || requests[0] || null
  const [title, setTitle] = useState('新章节')
  const [content, setContent] = useState('')
  const workId = selectedRequest?.work_id || starterWorks[0]?.id || 'beacon-beyond'
  const branchId = selectedRequest?.branch_id || pmfMainBranchId(workId)

  async function load() {
    const result = await listCreatorRequests()
    if (result.ok) {
      setRequests(result.data)
      setNotice(result.data.length ? '请求已同步。' : '没有请求时也可以手写并发布到已绑定作品。')
    } else {
      setNotice(result.message)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (selectedRequest && !content) {
      const timer = window.setTimeout(() => {
        setTitle(`${requestTypeLabel(selectedRequest.request_type)} · ${new Date().toLocaleDateString()}`)
        setContent(`【读者请求】${selectedRequest.request_text}\n\n这里写入作者本地生成或手写后的正文。发布前请删除这行提示。`)
      }, 0)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [content, selectedRequest])

  function saveDraft() {
    const draft: PmfLocalDraft = {
      localDraftRef: createLocalDraftRef(),
      requestId: selectedRequest?.id || null,
      workId,
      branchId,
      title,
      content,
      updatedAt: new Date().toISOString(),
    }
    upsertLocalDraft(draft)
    setDrafts(readLocalDrafts())
    setNotice('已保存本地草稿。')
  }

  async function publish() {
    if (!content.trim()) {
      setNotice('正文为空，不能发布。')
      return
    }
    const draftRef = createLocalDraftRef()
    const result = await publishChapter({
      requestId: selectedRequest?.id || null,
      workId,
      branchId,
      chapterTitle: title,
      content,
      localDraftRef: draftRef,
    })
    setNotice(result.ok ? `已发布：${result.data.chapter.title}，发布记录已生成。` : result.message)
    if (result.ok) {
      setDrafts(readLocalDrafts())
      await load()
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Panel className="p-5">
        <div className="flex items-center gap-2">
          <Edit3 size={18} className="text-[var(--worldline-cyan)]" />
          <h2 className="text-xl font-semibold text-[var(--ink-paper)]">本地草稿编辑</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
          本页只在作者电脑上使用。你可以接入本地模型，也可以直接手写；点击发布前不会写入公网阅读端。
        </p>
        <div className="mt-4 grid gap-3">
          <Input value={title} onChange={event => setTitle(event.target.value)} aria-label="章节标题" />
          <Textarea
            className="min-h-[420px] font-serif text-base leading-8"
            value={content}
            onChange={event => setContent(event.target.value)}
            aria-label="本地草稿正文"
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={saveDraft}>
              <Save size={15} />
              保存本地草稿
            </Button>
            <Button variant="gold" onClick={publish}>
              <Send size={15} />
              人工确认并发布
            </Button>
          </div>
          <p className="text-sm leading-6 text-[var(--ink-muted)]">{notice}</p>
        </div>
      </Panel>

      <aside className="space-y-4">
        <Panel className="p-5">
          <p className="text-sm font-semibold text-[var(--ink-paper)]">当前请求</p>
          {selectedRequest ? (
            <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.025] p-3">
              <Badge variant={statusTone(selectedRequest.status)}>{requestStatusLabel(selectedRequest.status)}</Badge>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{selectedRequest.request_text}</p>
              <p className="mt-2 text-xs text-[var(--ink-dim)]">提交时间：{new Date(selectedRequest.created_at).toLocaleString()}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--ink-muted)]">暂无请求。</p>
          )}
        </Panel>
        <Panel className="p-5">
          <p className="text-sm font-semibold text-[var(--ink-paper)]">本地草稿缓存</p>
          <div className="mt-3 space-y-2">
            {drafts.slice(0, 5).map(draft => (
              <button
                key={draft.localDraftRef}
                type="button"
                className="w-full rounded-lg border border-white/10 bg-white/[0.025] p-3 text-left text-xs leading-5 text-[var(--ink-muted)]"
                onClick={() => {
                  setTitle(draft.title)
                  setContent(draft.content)
                  setNotice('已打开本地草稿。')
                }}
              >
                <span className="block font-semibold text-[var(--ink-paper)]">{draft.title}</span>
                <span className="mt-1 block">{new Date(draft.updatedAt).toLocaleString()}</span>
              </button>
            ))}
            {!drafts.length && <p className="text-sm text-[var(--ink-dim)]">暂无本地草稿。</p>}
          </div>
        </Panel>
      </aside>
    </div>
  )
}

function SettingsPage() {
  const [settings, setSettings] = useState<LocalAiSettings>(() => readLocalAiSettings())
  const [notice, setNotice] = useState('本页只保存本机连接偏好，不保存授权信息明文。')

  function save() {
    writeLocalAiSettings(settings)
    setNotice('本机设置已保存。授权信息请保存在你的密码管理器或本地模型工具中。')
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel className="p-5">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-[var(--worldline-cyan)]" />
          <h2 className="text-xl font-semibold text-[var(--ink-paper)]">本机创作与同步设置</h2>
        </div>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-2 text-sm text-[var(--ink-muted)]">
            生成方式
            <select
              className="h-10 rounded-lg border border-[var(--pu-line-700)] bg-[var(--pu-void-950)] px-3 text-sm text-[var(--pu-ink-100)]"
              value={settings.provider}
              onChange={event => setSettings(previous => ({ ...previous, provider: event.target.value as LocalAiSettings['provider'] }))}
            >
              <option value="manual">手写 / 外部工具粘贴</option>
              <option value="local_endpoint">本地模型服务</option>
              <option value="openai_compatible">作者自带兼容服务</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-[var(--ink-muted)]">
            本机服务地址
            <Input value={settings.baseUrl} onChange={event => setSettings(previous => ({ ...previous, baseUrl: event.target.value }))} placeholder="http://127.0.0.1:11434 或你的本机服务地址" />
          </label>
          <label className="grid gap-2 text-sm text-[var(--ink-muted)]">
            模型名称
            <Input value={settings.model} onChange={event => setSettings(previous => ({ ...previous, model: event.target.value }))} placeholder="本机模型名称" />
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--ink-muted)]">
            <input
              type="checkbox"
              checked={settings.hasKey}
              onChange={event => setSettings(previous => ({ ...previous, hasKey: event.target.checked }))}
            />
            我已在本机工具中配置创作授权信息
          </label>
          <Button variant="gold" onClick={save}>
            <CheckCircle2 size={15} />
            保存本机设置
          </Button>
          <p className="text-sm text-[var(--ink-muted)]">{notice}</p>
        </div>
      </Panel>
      <Panel className="p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-[var(--manuscript-gold)]" />
          <h2 className="text-lg font-semibold text-[var(--ink-paper)]">发布边界</h2>
        </div>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--ink-muted)]">
          <li>公网阅读端不提供创作入口。</li>
          <li>平台只展示已发布内容、请求状态和发布记录。</li>
          <li>本机草稿、创作过程和授权信息不会上传。</li>
          <li>作者确认前，任何内容都不会公开给读者。</li>
        </ul>
      </Panel>
    </div>
  )
}

export default function LocalCreatorApp() {
  const { session, refresh } = useCreatorSession()

  return (
    <CreatorFrame session={session} refreshSession={refresh}>
      <Routes>
        <Route path="/" element={<Navigate to="/creator" replace />} />
        <Route path="/creator/login" element={<LoginPage refreshSession={refresh} />} />
        <Route path="/creator" element={<RequireCreator session={session}><DashboardPage /></RequireCreator>} />
        <Route path="/creator/requests" element={<RequireCreator session={session}><RequestsPage /></RequireCreator>} />
        <Route path="/creator/editor" element={<RequireCreator session={session}><EditorPage /></RequireCreator>} />
        <Route path="/creator/settings" element={<RequireCreator session={session}><SettingsPage /></RequireCreator>} />
        <Route path="*" element={<Navigate to="/creator" replace />} />
      </Routes>
    </CreatorFrame>
  )
}
