import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'
import {
  Bell,
  BookOpen,
  CheckCircle2,
  Cpu,
  Edit3,
  GitBranch,
  HeartPulse,
  ListFilter,
  LogOut,
  Megaphone,
  Radio,
  RefreshCw,
  Save,
  Send,
  Settings,
  ShieldCheck,
} from 'lucide-react'
import { Panel } from '@/components/design-system/Panel'
import { WorkspaceNav } from '@/components/patterns/WorkspaceNav'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LiquidGlass, LiquidGlassMetric } from '@/components/ui/liquid-glass'
import { worldTemplates } from '@/features/parallel-universe/data'
import type { WorldTemplate } from '@/features/parallel-universe/types'
import { pmfMainBranchId, type PmfLocalDraft, type PmfReaderRequest, type PmfRequestStatus, type PmfRequestType } from '@/features/pmf/types'
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
type RequestStatusFilter = 'all' | PmfRequestStatus
type RequestTypeFilter = 'all' | PmfRequestType
type RequestSort = 'heat' | 'newest' | 'status'
type PublishMode = 'main' | 'if'
type SelectOption<T extends string> = {
  value: T
  label: string
}

function CreatorSelect<T extends string>({
  value,
  onValueChange,
  options,
  placeholder,
  className,
}: {
  value: T
  onValueChange: (value: T) => void
  options: SelectOption<T>[]
  placeholder?: string
  className?: string
}) {
  return (
    <Select value={value} onValueChange={nextValue => onValueChange(nextValue as T)}>
      <SelectTrigger className={className || 'h-10 border-[var(--pu-line-700)] bg-[var(--pu-void-950)] text-[var(--pu-ink-100)]'}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="border-[var(--pu-line-700)] bg-[var(--pu-panel-900)] text-[var(--pu-ink-100)]">
        {options.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function MetricCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <LiquidGlassMetric label={label} value={value} detail={detail} />
  )
}

function statusTone(status: PmfReaderRequest['status']) {
  if (status === 'published') return 'stasis'
  if (status === 'rejected') return 'destructive'
  if (status === 'in_progress') return 'gold'
  return 'outline'
}

function workTitleForId(workId: string) {
  return worldTemplates.find(template => template.id === workId)?.title || workId
}

function workSummaryForId(workId: string) {
  return worldTemplates.find(template => template.id === workId)?.audiencePromise || '等待作者补充作品说明。'
}

function requestActionHint(request: PmfReaderRequest) {
  if (request.status === 'published') return '已经更新，可复盘回访。'
  if (request.status === 'rejected') return '已暂缓，可在公告里解释节奏。'
  if (request.status === 'in_progress') return '建议进入草稿页继续处理。'
  if (request.request_type === 'if_branch') return '适合先确定支线挂点和第一章标题。'
  if (request.request_type === 'continue_branch') return '适合补足上一段的承诺和收束。'
  return '适合直接起下一章。'
}

function branchIdForPublish(workId: string, mode: PublishMode, request: PmfReaderRequest | null) {
  if (mode === 'main') return pmfMainBranchId(workId)
  if (request?.branch_id && !request.branch_id.endsWith(':main')) return request.branch_id
  const suffix = (request?.id || 'manual').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 18) || 'manual'
  return `${workId}:if:${suffix}`
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
    { id: 'creator-works', icon: 'library', label: '作品支线', href: '/creator/works' },
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
          <LiquidGlass as="header" tone="cyan" depth="floating" className="local-creator-topbar p-4 md:p-5">
            <div className="relative flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="gold">本地创作端</Badge>
                  <Badge variant={isLocal ? 'stasis' : 'destructive'}>{isLocal ? '本机运行' : '请在本机打开'}</Badge>
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
          </LiquidGlass>
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
    detail: '手写或本机生成，发布前不进入读者阅读端。',
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
            作者端只在本机运行。登录用于确认你可以管理哪些作品，不会把本机创作设置带到读者阅读端。
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
        <Card variant="glass" padding="sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">本机规则</CardTitle>
            <CardDescription>作者端只保留必要的发布边界。</CardDescription>
          </CardHeader>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--ink-muted)]">
            <li>模型授权信息只保存在作者电脑。</li>
            <li>草稿先保存本地，发布前必须人工确认。</li>
            <li>读者阅读端只能看到已发布章节和请求状态。</li>
          </ul>
        </Card>
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
              { label: '待处理', value: pending, detail: '需要确认是否进入写作。' },
              { label: '处理中', value: inProgress, detail: '已经进入作者工作流。' },
              { label: '已发布', value: published, detail: '读者端可以看到更新。' },
            ].map(item => <MetricCard key={item.label} {...item} />)}
          </div>
        </Panel>

        <StarterWorksPanel />
      </section>

      <aside className="space-y-4">
        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <Radio size={18} className="text-[var(--manuscript-gold)]" />
            <h2 className="text-lg font-semibold text-[var(--ink-paper)]">连接状态</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{clientStatus}</p>
        </Panel>
        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <Cpu size={18} className="text-[var(--worldline-cyan)]" />
            <h2 className="text-lg font-semibold text-[var(--ink-paper)]">生成边界</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
            当前版本只在作者电脑上写作。你可以手写正文，也可以在本机工具里生成后粘贴到草稿。
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
          <Card key={template.id} variant="glass" padding="sm">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{template.title}</CardTitle>
                  <CardDescription>{template.genre}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => bind(template)}>
                  绑定
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="line-clamp-2 text-xs leading-5 text-[var(--ink-muted)]">{template.tagline}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </Panel>
  )
}

function WorksPage() {
  const [notice, setNotice] = useState('选择作品，补充给读者看的更新说明。')
  const [authorNotices, setAuthorNotices] = useState<Record<string, string>>(() => Object.fromEntries(
    starterWorks.map(template => [
      template.id,
      `本周优先处理《${template.title}》的高热请求。IF 支线会在作者确认后开放。`,
    ]),
  ))

  async function bindWithNotice(template: WorldTemplate) {
    const result = await ensureStarterWork({
      id: template.id,
      title: template.title,
      summary: template.tagline,
      coverUrl: template.coverImage,
      authorNotice: authorNotices[template.id],
    })
    setNotice(result.ok ? `《${result.data.title}》已准备接收读者请求。` : result.message)
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="space-y-3">
        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-[var(--manuscript-gold)]" />
            <h2 className="text-xl font-semibold text-[var(--ink-paper)]">作品与支线</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{notice}</p>
        </Panel>
        {starterWorks.map(template => (
          <Panel key={template.id} className="p-5">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="gold">{template.genre}</Badge>
                  <Badge variant="outline">{template.choiceCount} 个选择</Badge>
                  <Badge variant="outline">{template.chapterCount}</Badge>
                </div>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--ink-paper)]">{template.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{template.tagline}</p>
                <div className="mt-4 grid gap-2 md:grid-cols-3">
                  <MetricCard label="主线" value="默认连载线" />
                  <MetricCard label="IF 支线" value="按请求开放" />
                  <MetricCard label="发布方式" value="确认后公开" />
                </div>
              </div>
              <Button variant="gold" onClick={() => bindWithNotice(template)}>
                <CheckCircle2 size={15} />
                启用作品
              </Button>
            </div>
            <label className="mt-4 grid gap-2 text-sm text-[var(--ink-muted)]">
              作者公告
              <Textarea
                className="min-h-[92px]"
                value={authorNotices[template.id] || ''}
                onChange={event => setAuthorNotices(previous => ({ ...previous, [template.id]: event.target.value }))}
              />
            </label>
          </Panel>
        ))}
      </section>
      <aside className="space-y-4">
        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-[var(--worldline-cyan)]" />
            <h2 className="text-lg font-semibold text-[var(--ink-paper)]">公告怎么用</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
            公告用来告诉读者本周更新节奏、优先处理的支线和暂缓原因。它是作者运营作品的入口，不是使用说明书。
          </p>
        </Panel>
        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <GitBranch size={18} className="text-[var(--manuscript-gold)]" />
            <h2 className="text-lg font-semibold text-[var(--ink-paper)]">支线规则</h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--ink-muted)]">
            <li>主线用于正常连载。</li>
            <li>IF 支线来自读者请求或作者主动开放。</li>
            <li>发布前可以保存本机草稿，发布后读者端才会看到更新。</li>
          </ul>
        </Panel>
      </aside>
    </div>
  )
}

function RequestsPage() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState<PmfReaderRequest[]>([])
  const [notice, setNotice] = useState('正在同步请求队列...')
  const [statusFilter, setStatusFilter] = useState<RequestStatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<RequestTypeFilter>('all')
  const [sortBy, setSortBy] = useState<RequestSort>('heat')

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

  const visibleRequests = useMemo(() => {
    const filtered = requests.filter(request => {
      const statusMatched = statusFilter === 'all' || request.status === statusFilter
      const typeMatched = typeFilter === 'all' || request.request_type === typeFilter
      return statusMatched && typeMatched
    })
    return [...filtered].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortBy === 'status') return requestStatusLabel(a.status).localeCompare(requestStatusLabel(b.status), 'zh-Hans-CN')
      return b.vote_count - a.vote_count || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [requests, sortBy, statusFilter, typeFilter])

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
      <Card variant="glass" padding="sm" className="mt-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--ink-paper)]">
          <ListFilter size={16} className="text-[var(--worldline-cyan)]" />
          先处理最有价值的请求
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <label className="grid gap-2 text-xs text-[var(--ink-dim)]">
            处理状态
            <CreatorSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={[
                { value: 'all', label: '全部状态' },
                { value: 'pending', label: '已收到' },
                { value: 'acknowledged', label: '作者已看到' },
                { value: 'in_progress', label: '作者处理中' },
                { value: 'published', label: '已发布' },
                { value: 'rejected', label: '暂不处理' },
              ]}
            />
          </label>
          <label className="grid gap-2 text-xs text-[var(--ink-dim)]">
            请求类型
            <CreatorSelect
              value={typeFilter}
              onValueChange={setTypeFilter}
              options={[
                { value: 'all', label: '全部类型' },
                { value: 'next_chapter', label: '请求下一章' },
                { value: 'if_branch', label: '请求 IF 支线' },
                { value: 'continue_branch', label: '请求继续这条支线' },
              ]}
            />
          </label>
          <label className="grid gap-2 text-xs text-[var(--ink-dim)]">
            排序
            <CreatorSelect
              value={sortBy}
              onValueChange={setSortBy}
              options={[
                { value: 'heat', label: '按热度' },
                { value: 'newest', label: '按最新' },
                { value: 'status', label: '按状态' },
              ]}
            />
          </label>
        </div>
      </Card>
      <Card variant="glass" padding="none" className="mt-4 overflow-hidden">
        {visibleRequests.length ? (
          <ScrollArea className="max-h-[620px]">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="w-[24%] px-4 text-[var(--ink-dim)]">作品</TableHead>
                  <TableHead className="w-[34%] text-[var(--ink-dim)]">请求内容</TableHead>
                  <TableHead className="text-[var(--ink-dim)]">状态</TableHead>
                  <TableHead className="text-[var(--ink-dim)]">热度</TableHead>
                  <TableHead className="text-right text-[var(--ink-dim)]">处理</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRequests.map(request => (
                  <TableRow key={request.id} className="border-white/10 hover:bg-white/[0.035]">
                    <TableCell className="px-4 align-top">
                      <p className="text-sm font-semibold text-[var(--ink-paper)]">{workTitleForId(request.work_id)}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--ink-dim)]">{workSummaryForId(request.work_id)}</p>
                      <p className="mt-2 text-[11px] text-[var(--ink-dim)]">{new Date(request.created_at).toLocaleString()}</p>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{requestTypeLabel(request.request_type)}</Badge>
                        <Badge variant={statusTone(request.status)}>{requestStatusLabel(request.status)}</Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{request.request_text}</p>
                      <p className="mt-2 text-xs leading-5 text-[var(--ink-dim)]">{requestActionHint(request)}</p>
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant={statusTone(request.status)}>{requestStatusLabel(request.status)}</Badge>
                    </TableCell>
                    <TableCell className="align-top text-sm font-semibold text-[var(--ink-paper)]">{request.vote_count} 票</TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setStatus(request, 'acknowledged')}>已看到</Button>
                        <Button variant="outline" size="sm" onClick={() => setStatus(request, 'in_progress')}>处理中</Button>
                        <Button variant="gold" size="sm" onClick={() => navigate(`/creator/editor?request=${request.id}`)}>
                          <Edit3 size={14} />
                          写草稿
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setStatus(request, 'rejected')}>暂缓</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <Alert className="border-dashed border-white/10 bg-transparent text-[var(--ink-muted)]">
            <Bell className="h-4 w-4" />
            <AlertTitle>当前筛选下没有请求</AlertTitle>
            <AlertDescription>可以切回全部状态，或先在读者阅读端提交“想看下一章”“想看 IF 支线”。</AlertDescription>
          </Alert>
        )}
      </Card>
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
  const [publishMode, setPublishMode] = useState<PublishMode>('main')
  const [branchTitle, setBranchTitle] = useState('读者 IF 支线')
  const workId = selectedRequest?.work_id || starterWorks[0]?.id || 'beacon-beyond'
  const branchId = branchIdForPublish(workId, publishMode, selectedRequest)

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
        setPublishMode(selectedRequest.request_type === 'next_chapter' ? 'main' : 'if')
        setBranchTitle(selectedRequest.request_type === 'next_chapter' ? '主线' : `${workTitleForId(selectedRequest.work_id)} · IF 支线`)
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
      branchTitle: publishMode === 'main' ? '主线' : branchTitle,
      chapterTitle: title,
      content,
      localDraftRef: draftRef,
    })
    setNotice(result.ok ? `已发布：${result.data.chapter.title}，读者阅读端可以看到更新。` : result.message)
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
          本页只在作者电脑上使用。你可以接入本地模型，也可以直接手写；点击发布前不会进入读者阅读端。
          </p>
        <Tabs defaultValue="draft" className="mt-4">
          <TabsList className="bg-[var(--pu-panel-850)] text-[var(--ink-muted)]">
            <TabsTrigger value="draft">正文草稿</TabsTrigger>
            <TabsTrigger value="publish">发布确认</TabsTrigger>
          </TabsList>
          <TabsContent value="draft" className="mt-4 space-y-3">
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
          </TabsContent>
          <TabsContent value="publish" className="mt-4 space-y-3">
            <Alert className="border-[var(--pu-gold-500)]/30 bg-[var(--pu-gold-500)]/10 text-[var(--ink-paper)]">
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>发布前确认</AlertTitle>
              <AlertDescription>只有点击“人工确认并发布”后，读者端才会看到章节或 IF 支线更新。</AlertDescription>
            </Alert>
            <div className="grid gap-3 md:grid-cols-2">
              <MetricCard label="发布作品" value={workTitleForId(workId)} />
              <MetricCard label="发布线" value={publishMode === 'main' ? '主线连载' : branchTitle} />
            </div>
            <Button variant="gold" onClick={publish}>
              <Send size={15} />
              人工确认并发布
            </Button>
          </TabsContent>
        </Tabs>
        <Separator className="my-4 bg-white/10" />
        <p className="text-sm leading-6 text-[var(--ink-muted)]">{notice}</p>
      </Panel>

      <aside className="space-y-4">
        <Panel className="p-5">
          <p className="text-sm font-semibold text-[var(--ink-paper)]">发布去向</p>
          <div className="mt-3 grid gap-2">
            <label className="grid gap-2 text-xs text-[var(--ink-dim)]">
              作品
              <Input value={workTitleForId(workId)} readOnly aria-label="发布作品" />
            </label>
            <label className="grid gap-2 text-xs text-[var(--ink-dim)]">
              章节去向
              <CreatorSelect
                value={publishMode}
                onValueChange={setPublishMode}
                options={[
                  { value: 'main', label: '主线连载' },
                  { value: 'if', label: 'IF 支线' },
                ]}
              />
            </label>
            {publishMode === 'if' && (
              <label className="grid gap-2 text-xs text-[var(--ink-dim)]">
                支线标题
                <Input value={branchTitle} onChange={event => setBranchTitle(event.target.value)} aria-label="支线标题" />
              </label>
            )}
          </div>
        </Panel>
        <Panel className="p-5">
          <p className="text-sm font-semibold text-[var(--ink-paper)]">当前请求</p>
          {selectedRequest ? (
            <Card variant="glass" padding="sm" className="mt-3">
              <Badge variant={statusTone(selectedRequest.status)}>{requestStatusLabel(selectedRequest.status)}</Badge>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{selectedRequest.request_text}</p>
              <p className="mt-2 text-xs text-[var(--ink-dim)]">提交时间：{new Date(selectedRequest.created_at).toLocaleString()}</p>
            </Card>
          ) : (
            <p className="mt-3 text-sm text-[var(--ink-muted)]">暂无请求。</p>
          )}
        </Panel>
        <Panel className="p-5">
          <p className="text-sm font-semibold text-[var(--ink-paper)]">本地草稿缓存</p>
          <div className="mt-3 space-y-2">
            {drafts.slice(0, 5).map(draft => (
              <Card key={draft.localDraftRef} variant="glass" padding="sm">
                <p className="text-sm font-semibold text-[var(--ink-paper)]">{draft.title}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{new Date(draft.updatedAt).toLocaleString()}</p>
                <Button
                  className="mt-3"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTitle(draft.title)
                    setContent(draft.content)
                    setNotice('已打开本地草稿。')
                  }}
                >
                  打开草稿
                </Button>
              </Card>
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
            <CreatorSelect
              value={settings.provider}
              onValueChange={provider => setSettings(previous => ({ ...previous, provider: provider as LocalAiSettings['provider'] }))}
              options={[
                { value: 'manual', label: '手写 / 外部工具粘贴' },
                { value: 'local_endpoint', label: '本地模型服务' },
                { value: 'openai_compatible', label: '作者自带兼容服务' },
              ]}
            />
          </label>
          <label className="grid gap-2 text-sm text-[var(--ink-muted)]">
            本机服务地址
            <Input value={settings.baseUrl} onChange={event => setSettings(previous => ({ ...previous, baseUrl: event.target.value }))} placeholder="http://127.0.0.1:11434 或你的本机服务地址" />
          </label>
          <label className="grid gap-2 text-sm text-[var(--ink-muted)]">
            模型名称
            <Input value={settings.model} onChange={event => setSettings(previous => ({ ...previous, model: event.target.value }))} placeholder="本机模型名称" />
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.025] p-3 text-sm text-[var(--ink-muted)]">
            <Checkbox
              checked={settings.hasKey}
              onCheckedChange={checked => setSettings(previous => ({ ...previous, hasKey: checked === true }))}
            />
            <span>我已在本机工具中配置创作授权信息</span>
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
          <h2 className="text-lg font-semibold text-[var(--ink-paper)]">发布规则</h2>
        </div>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--ink-muted)]">
          <li>读者阅读端不提供创作入口。</li>
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
        <Route path="/creator/works" element={<RequireCreator session={session}><WorksPage /></RequireCreator>} />
        <Route path="/creator/settings" element={<RequireCreator session={session}><SettingsPage /></RequireCreator>} />
        <Route path="*" element={<Navigate to="/creator" replace />} />
      </Routes>
    </CreatorFrame>
  )
}
