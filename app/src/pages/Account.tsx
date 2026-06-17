import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Coins,
  Download,
  LogOut,
  PenLine,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react'
import { Badge } from '@/components/primitives/Badge'
import { Button } from '@/components/primitives/Button'
import { Panel } from '@/components/design-system/Panel'
import { PlanCard } from '@/components/design-system/PlanCard'
import { accountApi } from '@/api'
import { useAuth } from '@/hooks/useAuth'
import { useSettings } from '@/hooks/useSettings'
import type {
  AccountDataExportResponse,
  AccountDeleteConfirmResponse,
  AccountDeletePreviewResponse,
  AccountMergeConfirmResponse,
  AccountMergePreview,
  AccountSnapshot,
  CheckoutSession,
  SubscriptionStatus,
  SubscriptionTier,
} from '@/types'

const BROWSER_READER_ID = 'web_reader_demo'
const BROWSER_CREATOR_ID = 'web_creator'

function tierDisplayName(tierId?: string | null) {
  if (tierId === 'play_pass') return '阅读会员'
  if (tierId === 'creator_pass') return '创作会员'
  if (tierId === 'studio_pass') return '工作室会员'
  return '免费体验'
}

function tierShortDescription(tier: SubscriptionTier) {
  if (tier.tier_id === 'play_pass') return '适合持续阅读和互动选择。'
  if (tier.tier_id === 'creator_pass') return '适合边读边创作，保留更多创作额度。'
  if (tier.tier_id === 'studio_pass') return '适合团队批量运营世界和章节。'
  return tier.description
}

function moneyLabel(value: number) {
  return value > 0 ? `$${value}/月` : '免费'
}

function walletBalance(subscription: SubscriptionStatus | null, key: string) {
  return Number(subscription?.wallets?.[key]?.balance || 0)
}

function checkoutMessage(checkout: CheckoutSession | null, subscription: SubscriptionStatus | null) {
  if (subscription?.subscription?.status === 'active') return '会员已开通，阅读次数和创作额度已经刷新。'
  if (!checkout) return '选择一个方案后，会在这里看到开通请求。'
  if (checkout.status === 'completed') return '开通已完成，权益会自动刷新到账户。'
  if (checkout.status === 'expired') return '本次开通已过期，可以重新选择方案。'
  return `${tierDisplayName(checkout.tier_id)} 正在处理中，状态确认后会刷新到你的档案。`
}

export default function Account() {
  const navigate = useNavigate()
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    error: authError,
    login,
    register,
    logout,
    clearLocalSession,
    clearError,
  } = useAuth()
  const { subscription, checkout, isLoading, error, loadSubscription, startCheckout, completeCheckout } = useSettings()
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null)
  const [snapshotError, setSnapshotError] = useState<string | null>(null)
  const [mergePreview, setMergePreview] = useState<AccountMergePreview | null>(null)
  const [mergeResult, setMergeResult] = useState<AccountMergeConfirmResponse | null>(null)
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [dataExport, setDataExport] = useState<AccountDataExportResponse | null>(null)
  const [deletePreview, setDeletePreview] = useState<AccountDeletePreviewResponse | null>(null)
  const [deleteResult, setDeleteResult] = useState<AccountDeleteConfirmResponse | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [dataActionError, setDataActionError] = useState<string | null>(null)
  const [isDataBusy, setIsDataBusy] = useState(false)

  const activeAccountId = user?.accountId || BROWSER_READER_ID
  const activeCreatorId = user?.id || BROWSER_CREATOR_ID

  const loadAccountSnapshot = useCallback(async () => {
    try {
      const payload = await accountApi.getSnapshot(
        isAuthenticated
          ? undefined
          : {
              accountId: BROWSER_READER_ID,
              creatorId: BROWSER_CREATOR_ID,
            },
      )
      setSnapshot(payload)
      setSnapshotError(null)
    } catch {
      setSnapshotError('当前浏览器档案仍可使用，登录后再合并。')
    }
  }, [isAuthenticated])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      await loadSubscription(activeAccountId)
      if (!cancelled) await loadAccountSnapshot()
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [activeAccountId, loadAccountSnapshot, loadSubscription])

  const loadMergePreview = useCallback(async () => {
    if (!isAuthenticated) {
      setMergePreview(null)
      return
    }
    try {
      const payload = await accountApi.previewMerge({
        guestReaderId: BROWSER_READER_ID,
        guestCreatorId: BROWSER_CREATOR_ID,
      })
      setMergePreview(payload)
      setMergeError(null)
    } catch {
      setMergeError('暂时无法检查本机档案，可以稍后重试。')
    }
  }, [isAuthenticated])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!cancelled) await loadMergePreview()
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [loadMergePreview])

  const activeTier = subscription?.effective_tier || subscription?.subscription?.tier_id || null
  const storyCredits = walletBalance(subscription, 'story_credits')
  const studioCredits = walletBalance(subscription, 'studio_credits')
  const tiers = useMemo(() => subscription?.tiers || [], [subscription?.tiers])
  const isMember = Boolean(activeTier)
  const latestReading = snapshot?.reader_progress.latest || null
  const latestDraft = snapshot?.creator_drafts[0] || null
  const canConfirmMerge = mergePreview?.public_state === 'ready_to_merge' || mergePreview?.public_state === 'needs_review'

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearError()
    const normalizedEmail = email.trim()
    if (!normalizedEmail || !password.trim()) return
    if (authMode === 'register') {
      await register({
        username: normalizedEmail.split('@')[0] || normalizedEmail,
        email: normalizedEmail,
        password,
        displayName: displayName.trim() || normalizedEmail,
      })
    } else {
      await login({ identifier: normalizedEmail, password })
    }
    setPassword('')
  }

  const handleStartCheckout = async (tierId: string) => {
    await startCheckout(activeAccountId, tierId)
    await loadSubscription(activeAccountId)
    await loadAccountSnapshot()
  }

  const handleCompleteCheckout = async () => {
    if (!checkout) return
    await completeCheckout(activeAccountId, checkout)
    await loadSubscription(activeAccountId)
    await loadAccountSnapshot()
  }

  const handleConfirmMerge = async () => {
    setMergeError(null)
    try {
      const payload = await accountApi.confirmMerge({
        guestReaderId: BROWSER_READER_ID,
        guestCreatorId: BROWSER_CREATOR_ID,
      })
      setMergeResult(payload)
      setSnapshot(payload.snapshot)
      await loadSubscription(activeAccountId)
      await loadMergePreview()
    } catch {
      setMergeError('合并没有完成，请稍后重试。')
    }
  }

  const handleExportData = async () => {
    setDataActionError(null)
    setIsDataBusy(true)
    try {
      const payload = await accountApi.exportData()
      setDataExport(payload)
      const blob = new Blob([JSON.stringify(payload.package, null, 2)], { type: payload.content_type || 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = payload.filename || 'parallel-universe-account-export.json'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      setDataActionError('暂时无法导出账号数据，请稍后重试。')
    } finally {
      setIsDataBusy(false)
    }
  }

  const handlePreviewDelete = async () => {
    setDataActionError(null)
    setIsDataBusy(true)
    try {
      const payload = await accountApi.previewDelete()
      setDeletePreview(payload)
      setDeleteResult(null)
    } catch {
      setDataActionError('暂时无法检查删除影响，请稍后重试。')
    } finally {
      setIsDataBusy(false)
    }
  }

  const handleConfirmDelete = async () => {
    setDataActionError(null)
    setIsDataBusy(true)
    try {
      const payload = await accountApi.confirmDelete(deleteConfirmation)
      setDeleteResult(payload)
      setDeletePreview(null)
      setDataExport(null)
      setSnapshot(null)
      setMergePreview(null)
      clearLocalSession()
      setDeleteConfirmation('')
    } catch {
      setDataActionError('删除账号没有完成，请确认输入后重试。')
    } finally {
      setIsDataBusy(false)
    }
  }

  return (
    <div className="narrative-page space-y-5">
      <header className="cosmic-board p-5">
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="gold">会员中心</Badge>
              <Badge variant={isMember ? 'stasis' : 'outline'}>{isMember ? '已开通' : '免费体验'}</Badge>
              <Badge variant="outline">{isAuthenticated ? '已登录' : '本机档案'}</Badge>
            </div>
            <h1 className="mt-4 text-3xl font-semibold leading-tight text-[var(--ink-paper)] md:text-5xl">
              管理你的阅读权益
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-muted)] md:text-base">
              这里统一查看阅读次数、创作额度、阅读进度和创作草稿。本机记录可以合并到登录账号，之后继续阅读和继续创作。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="gold" onClick={() => navigate('/story')}>
                <BookOpen size={16} />
                继续阅读
              </Button>
              <Button variant="outline" onClick={() => navigate('/create')}>
                <PenLine size={16} />
                去创作
              </Button>
              <Button variant="ghost" onClick={() => loadSubscription(activeAccountId)} disabled={isLoading}>
                <RefreshCcw size={16} />
                刷新权益
              </Button>
              <Button variant="ghost" onClick={() => void loadAccountSnapshot()}>
                <RefreshCcw size={16} />
                刷新档案
              </Button>
              {isAuthenticated && (
                <Button variant="ghost" onClick={() => void logout()}>
                  <LogOut size={16} />
                  退出登录
                </Button>
              )}
            </div>
          </div>

          <Panel className="p-5">
            <p className="text-xs tracking-[0.14em] text-[var(--ink-dim)]">{isAuthenticated ? '当前账号' : '当前方案'}</p>
            <h2 className="mt-2 text-3xl font-semibold text-[var(--ink-paper)]">
              {isAuthenticated ? user?.displayName : snapshot?.membership.label || tierDisplayName(activeTier)}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
              {isAuthenticated
                ? `阅读档案保存在 ${activeAccountId}。`
                : subscription?.subscription?.status === 'active'
                  ? '会员权益可用于继续阅读和创作。'
                  : '可先阅读公开章节，开通后获得更多互动阅读次数。'}
            </p>
          </Panel>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <BookOpen className="text-[var(--worldline-cyan)]" size={18} />
            <h2 className="text-lg font-semibold text-[var(--ink-paper)]">阅读次数</h2>
          </div>
          <p className="mt-4 text-4xl font-semibold text-[var(--ink-paper)]">{storyCredits}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">用于继续阅读和生成下一幕。</p>
        </Panel>
        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="text-[var(--manuscript-gold)]" size={18} />
            <h2 className="text-lg font-semibold text-[var(--ink-paper)]">创作额度</h2>
          </div>
          <p className="mt-4 text-4xl font-semibold text-[var(--ink-paper)]">{studioCredits}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">用于创作助手和章节打磨。</p>
        </Panel>
        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-teal-300" size={18} />
            <h2 className="text-lg font-semibold text-[var(--ink-paper)]">保存状态</h2>
          </div>
          <p className="mt-4 text-2xl font-semibold text-[var(--ink-paper)]">
            {snapshot?.account.auth_state === 'signed_in' ? '已登录保存' : '当前浏览器档案'}
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            {snapshot?.account.requires_login_for_cross_device === false
              ? '你的阅读和创作记录可随账户恢复。'
              : '书架和页码会先保留在当前浏览器，登录后可合并。'}
          </p>
        </Panel>
      </section>

      <section className="narrative-panel p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <UserRound className="text-[var(--worldline-cyan)]" size={18} />
              <h2 className="text-2xl font-semibold text-[var(--ink-paper)]">账号恢复</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
              {isAuthenticated
                ? '检查当前浏览器里的阅读进度和创作草稿，确认后合并到你的账号。'
                : '先登录或注册，再把当前浏览器里的阅读进度和创作草稿合并到账号。'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {mergeResult && <Badge variant="stasis">已合并</Badge>}
            {mergePreview?.public_state === 'needs_review' && <Badge variant="gold">需要确认</Badge>}
            {mergePreview?.public_state === 'ready_to_merge' && <Badge variant="outline">发现本机档案</Badge>}
          </div>
        </div>

        {!isAuthenticated ? (
          <form className="mt-5 grid gap-4 rounded-lg border border-white/10 bg-white/[0.025] p-4 lg:grid-cols-[minmax(0,1fr)_180px]" onSubmit={handleAuthSubmit}>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-2 text-sm text-[var(--ink-muted)]">
                <span>邮箱</span>
                <input
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-[var(--ink-paper)] outline-none focus:border-[var(--worldline-cyan)]"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </label>
              {authMode === 'register' && (
                <label className="space-y-2 text-sm text-[var(--ink-muted)]">
                  <span>昵称</span>
                  <input
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-[var(--ink-paper)] outline-none focus:border-[var(--worldline-cyan)]"
                    value={displayName}
                    onChange={event => setDisplayName(event.target.value)}
                    placeholder="你的名字"
                    autoComplete="name"
                  />
                </label>
              )}
              <label className="space-y-2 text-sm text-[var(--ink-muted)]">
                <span>密码</span>
                <input
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-[var(--ink-paper)] outline-none focus:border-[var(--worldline-cyan)]"
                  type="password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="至少 8 位"
                  autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                />
              </label>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <Button type="submit" variant="gold" loading={authLoading}>
                {authMode === 'register' ? '注册并合并' : '登录后合并'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  clearError()
                  setAuthMode(authMode === 'register' ? 'login' : 'register')
                }}
              >
                {authMode === 'register' ? '已有账号' : '创建账号'}
              </Button>
            </div>
            {authError && (
              <p className="flex items-center gap-2 text-sm text-amber-200 md:col-span-3 lg:col-span-2">
                <AlertCircle size={16} />
                {authError}
              </p>
            )}
          </form>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
                <p className="text-xs tracking-[0.12em] text-[var(--ink-dim)]">阅读进度</p>
                <p className="mt-2 text-3xl font-semibold text-[var(--ink-paper)]">
                  {mergePreview?.summary.reader_progress_count ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
                <p className="text-xs tracking-[0.12em] text-[var(--ink-dim)]">创作草稿</p>
                <p className="mt-2 text-3xl font-semibold text-[var(--ink-paper)]">
                  {mergePreview?.summary.creator_draft_count ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
                <p className="text-xs tracking-[0.12em] text-[var(--ink-dim)]">保存账号</p>
                <p className="mt-2 truncate text-lg font-semibold text-[var(--ink-paper)]">{activeCreatorId}</p>
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-4">
              <p className="text-sm leading-6 text-[var(--ink-muted)]">
                {mergeResult?.message || mergeError || mergePreview?.message || '正在检查本机档案。'}
              </p>
              {mergePreview?.conflicts.length ? (
                <div className="mt-3 space-y-2">
                  {mergePreview.conflicts.map(item => (
                    <p key={`${item.type}-${item.label}`} className="text-xs leading-5 text-amber-100">
                      {item.label}：{item.resolution}
                    </p>
                  ))}
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void loadMergePreview()}>
                  检查本机档案
                </Button>
                <Button variant="gold" disabled={!canConfirmMerge} onClick={() => void handleConfirmMerge()}>
                  合并到账号
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="narrative-panel p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-teal-300" size={18} />
              <h2 className="text-2xl font-semibold text-[var(--ink-paper)]">账号与数据</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
              登录后可以导出自己的阅读进度、创作草稿和会员记录。删除账号前会先显示影响范围，需要再次确认。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {deleteResult?.public_state === 'deleted' && <Badge variant="stasis">账号已删除</Badge>}
            {dataExport && <Badge variant="outline">数据已整理</Badge>}
            {deletePreview && <Badge variant="gold">等待确认</Badge>}
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
              <p className="text-xs tracking-[0.12em] text-[var(--ink-dim)]">可导出内容</p>
              <p className="mt-3 text-lg font-semibold text-[var(--ink-paper)]">
                {dataExport
                  ? `${dataExport.summary.reader_session_count} 条阅读，${dataExport.summary.creator_draft_count} 份草稿`
                  : '阅读、创作和会员记录'}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                导出的文件只包含你的账号内容，不包含密码或登录密钥。
              </p>
              <Button className="mt-4" variant="outline" disabled={!isAuthenticated || isDataBusy} onClick={() => void handleExportData()}>
                <Download size={16} />
                导出我的数据
              </Button>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
              <p className="text-xs tracking-[0.12em] text-[var(--ink-dim)]">删除影响</p>
              <p className="mt-3 text-lg font-semibold text-[var(--ink-paper)]">
                {deletePreview
                  ? `${deletePreview.summary.reader_session_count} 条阅读，${deletePreview.summary.creator_draft_count} 份草稿`
                  : deleteResult
                    ? '账号已删除'
                    : '先查看影响范围'}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                删除会清除阅读进度和创作草稿，并退出当前登录。会员记录会按账务要求保留。
              </p>
              <Button className="mt-4" variant="ghost" disabled={!isAuthenticated || isDataBusy} onClick={() => void handlePreviewDelete()}>
                <Trash2 size={16} />
                删除账号
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/20 p-4">
            <p className="text-sm leading-6 text-[var(--ink-muted)]">
              {deleteResult?.message || dataActionError || deletePreview?.message || dataExport?.message || (isAuthenticated ? '账号数据由你自己控制。' : '登录后可以管理账号数据。')}
            </p>
            {deletePreview && !deleteResult && (
              <div className="mt-4 space-y-3">
                <div className="grid gap-2">
                  {deletePreview.consequences.map(item => (
                    <div key={item.kind} className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2 text-sm">
                      <span className="text-[var(--ink-paper)]">{item.label}</span>
                      <span className="text-[var(--ink-muted)]">{item.count}</span>
                    </div>
                  ))}
                </div>
                <label className="block space-y-2 text-sm text-[var(--ink-muted)]">
                  <span>输入“删除账号”确认</span>
                  <input
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-[var(--ink-paper)] outline-none focus:border-[var(--worldline-cyan)]"
                    value={deleteConfirmation}
                    onChange={event => setDeleteConfirmation(event.target.value)}
                    placeholder="删除账号"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => setDeletePreview(null)}>
                    取消
                  </Button>
                  <Button
                    variant="gold"
                    disabled={deleteConfirmation.trim() !== deletePreview.confirmation_required || isDataBusy}
                    onClick={() => void handleConfirmDelete()}
                  >
                    确认删除
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <BookOpen className="text-[var(--worldline-cyan)]" size={18} />
            <h2 className="text-lg font-semibold text-[var(--ink-paper)]">阅读档案</h2>
          </div>
          <p className="mt-4 text-2xl font-semibold text-[var(--ink-paper)]">
            {latestReading ? latestReading.world_title : '还没有保存的进度'}
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            {latestReading
              ? `${latestReading.chapter_title}，第 ${Math.max(1, latestReading.chapter_index + 1)} 段附近。`
              : '开始阅读后，这里会出现继续入口。'}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(latestReading ? `/story?world=${latestReading.world_id}` : '/story')}>
            继续阅读
            <ChevronRight size={16} />
          </Button>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <PenLine className="text-[var(--manuscript-gold)]" size={18} />
            <h2 className="text-lg font-semibold text-[var(--ink-paper)]">创作草稿</h2>
          </div>
          <p className="mt-4 text-2xl font-semibold text-[var(--ink-paper)]">
            {latestDraft ? latestDraft.title : '还没有创作草稿'}
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            {latestDraft
              ? `${latestDraft.turn_count} 轮对话，继续把它写成下一段。`
              : '从一句故事种子开始，创作助手会先写正文。'}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate(latestDraft ? `/create?session=${encodeURIComponent(latestDraft.session_id)}` : '/create')}
          >
            继续创作
            <ChevronRight size={16} />
          </Button>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-teal-300" size={18} />
            <h2 className="text-lg font-semibold text-[var(--ink-paper)]">跨设备恢复</h2>
          </div>
          <p className="mt-4 text-2xl font-semibold text-[var(--ink-paper)]">
            {snapshot?.account.requires_login_for_cross_device === false ? '已开启' : '待登录开启'}
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            {snapshotError || '登录后，当前浏览器里的阅读进度和创作草稿会合并到你的账户。'}
          </p>
          <Button variant="ghost" className="mt-4" onClick={() => void loadAccountSnapshot()}>
            检查档案
            <RefreshCcw size={16} />
          </Button>
        </Panel>
      </section>

      <section className="narrative-panel p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2">
              <Coins className="text-[var(--manuscript-gold)]" size={18} />
              <h2 className="text-2xl font-semibold text-[var(--ink-paper)]">选择会员方案</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
              阅读会员适合读者，创作会员适合写作者，工作室会员适合团队运营多个世界。
            </p>
          </div>
          {error && <Badge variant="collapse">{error}</Badge>}
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {tiers.map(tier => (
            <PlanCard
              key={tier.tier_id}
              name={tierDisplayName(tier.tier_id)}
              price={moneyLabel(tier.price_usd_monthly)}
              description={tierShortDescription(tier)}
              features={[`阅读次数 ${tier.monthly_story_credits}`, `创作额度 ${tier.monthly_studio_credits}`]}
              highlighted={tier.tier_id === 'play_pass'}
              badge={activeTier === tier.tier_id ? '当前方案' : undefined}
              cta={activeTier === tier.tier_id ? '已开通' : '开通这个方案'}
              buttonVariant={activeTier === tier.tier_id ? 'secondary' : tier.tier_id === 'play_pass' ? 'gold' : 'outline'}
              disabled={activeTier === tier.tier_id}
              loading={isLoading}
              testId={`start-checkout-${tier.tier_id}`}
              onSelect={() => handleStartCheckout(tier.tier_id)}
            />
          ))}
        </div>
      </section>

      <section className="narrative-panel p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-teal-300" size={18} />
              <h2 className="text-xl font-semibold text-[var(--ink-paper)]">开通进度</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{checkoutMessage(checkout, subscription)}</p>
          </div>
          {checkout && (
            <Badge variant="stasis">
              {tierDisplayName(checkout.tier_id)}
            </Badge>
          )}
        </div>
        <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.025] p-4">
          <p className="text-sm leading-6 text-[var(--ink-muted)]">
            开通后会自动刷新权益。登录后，阅读进度和创作草稿会合并到同一个账户。
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {checkout && subscription?.subscription?.status !== 'active' && (
              <Button variant="gold" loading={isLoading} onClick={() => void handleCompleteCheckout()}>
                检查开通状态
                <CheckCircle2 size={16} />
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/story')}>
              回到阅读
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
