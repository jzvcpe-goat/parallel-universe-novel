import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  GitBranch,
  HeartHandshake,
  Menu,
  PanelRightOpen,
  Save,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { Badge } from '@/components/primitives/Badge'
import { Button } from '@/components/primitives/Button'
import { ChoiceCard } from '@/components/design-system/ChoiceCard'
import { Panel } from '@/components/design-system/Panel'
import { ReadingPaper } from '@/components/design-system/ReadingPaper'
import { ReaderRequestPanel } from '@/apps/reader/ReaderRequestPanel'
import { runtimeApi, settingsApi, storyApi } from '@/api'
import { runtimeConfig } from '@/api/client'
import type { ReaderRuntimeSnapshot, SceneAdvanceResponse } from '@/api/runtime'
import type { SubscriptionStatus } from '@/types'
import {
  activeInstance,
  candidateScenes,
  getBranchesForTemplate,
  getChapterForTemplate,
  getTemplateById,
  isWorldTemplateId,
} from '@/features/parallel-universe/data'
import {
  branchStatusLabel,
  flagshipTemplate,
  qualityForChoice,
  simulateTimeline,
} from '@/features/parallel-universe/simulator'
import type { CandidateScene, WorldBranch, WorldChoice } from '@/features/parallel-universe/types'
import { pmfMainBranchId } from '@/features/pmf/types'

type ReaderRuntimeState = {
  mode: 'demo' | 'connecting' | 'service' | 'advancing' | 'unavailable'
  sessionId?: string
  snapshot?: ReaderRuntimeSnapshot
  advance?: SceneAdvanceResponse
  notice: string
}

type ReaderSaveState = {
  saved: boolean
  pageIndex: number
  branchId: string
  choiceId?: string
  templateTitle: string
  updatedAt: string
}

type ReaderMembershipState = {
  status: 'loading' | 'ready' | 'unavailable'
  subscription?: SubscriptionStatus
}

const READER_ACCOUNT_ID = 'web_reader_demo'

function branchTone(branch?: WorldBranch) {
  if (!branch) return 'outline'
  if (branch.status === 'canon') return 'gold'
  if (branch.status === 'active') return 'stasis'
  if (branch.status === 'candidate') return 'branch'
  return 'outline'
}

function countReadableChars(text: string) {
  return text.replace(/\s/g, '').length
}

function buildReaderPages(body: string, minChars = 520) {
  const paragraphs = body.split('\n\n').map(paragraph => paragraph.trim()).filter(Boolean)
  const pages: string[] = []
  let current: string[] = []
  let currentCount = 0

  paragraphs.forEach(paragraph => {
    const nextCount = countReadableChars(paragraph)
    if (current.length && currentCount >= minChars) {
      pages.push(current.join('\n\n'))
      current = []
      currentCount = 0
    }
    current.push(paragraph)
    currentCount += nextCount
  })

  if (current.length) pages.push(current.join('\n\n'))
  return pages.length ? pages : [body]
}

function readerSaveKey(templateId: string) {
  return `parallel-universe.reader.${templateId}`
}

function readReaderSave(templateId: string): ReaderSaveState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(readerSaveKey(templateId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ReaderSaveState>
    if (typeof parsed !== 'object' || parsed === null) return null
    return {
      saved: Boolean(parsed.saved),
      pageIndex: Number.isFinite(parsed.pageIndex) ? Math.max(0, Number(parsed.pageIndex)) : 0,
      branchId: typeof parsed.branchId === 'string' ? parsed.branchId : 'mainline',
      choiceId: typeof parsed.choiceId === 'string' ? parsed.choiceId : undefined,
      templateTitle: typeof parsed.templateTitle === 'string' ? parsed.templateTitle : '',
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

function writeReaderSave(templateId: string, state: ReaderSaveState) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(readerSaveKey(templateId), JSON.stringify(state))
  } catch {
    // Reading can continue even if the browser refuses storage.
  }
}

function readerSaveHint(saveState: ReaderSaveState | null) {
  if (!saveState) return '加入书架后，下次会从当前页继续。'
  const page = Math.max(1, saveState.pageIndex + 1)
  if (saveState.saved) return `已保存到书架，下次打开会回到第 ${page} 页。`
  return `阅读进度已保留到第 ${page} 页。`
}

function fieldAsString(source: Record<string, unknown> | null | undefined, key: string): string {
  const value = source?.[key]
  return typeof value === 'string' ? value : ''
}

function runtimeModeBadge(runtimeState: ReaderRuntimeState) {
  if (runtimeState.mode === 'connecting') return '保存中'
  if (runtimeState.mode === 'advancing') return '整理中'
  if (runtimeState.mode === 'service') return '已保存'
  if (runtimeState.mode === 'unavailable') return '本机记录'
  return '本机记录'
}

function storyMembershipLabel(membership: ReaderMembershipState) {
  const tier = membership.subscription?.effective_tier || membership.subscription?.subscription?.tier_id
  if (tier === 'play_pass') return '阅读会员'
  if (tier === 'creator_pass') return '互动会员'
  if (tier === 'studio_pass') return '书架会员'
  if (membership.status === 'loading') return '权益读取中'
  return '免费体验'
}

function storyCreditBalance(membership: ReaderMembershipState) {
  return Number(membership.subscription?.wallets?.story_credits?.balance || 0)
}

function RuntimeSyncPanel({
  runtimeState,
  saved,
  pageLabel,
  choiceLabel,
}: {
  runtimeState: ReaderRuntimeState
  saved: boolean
  pageLabel: string
  choiceLabel?: string
}) {
  const isService = runtimeState.mode === 'service' || runtimeState.mode === 'advancing'
  const qualityGate = runtimeState.advance?.quality_brake || runtimeState.snapshot?.quality_brake
  const worldline = runtimeState.snapshot?.worldline || runtimeState.advance?.raw_continue

  return (
    <section className="narrative-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CheckCircle2 className={isService ? 'text-teal-300' : 'text-[var(--ink-dim)]'} size={18} />
          <h2 className="text-lg font-semibold text-[var(--ink-paper)]">阅读进度</h2>
        </div>
        <Badge variant={isService ? 'stasis' : 'outline'}>{runtimeModeBadge(runtimeState)}</Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{runtimeState.notice}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
          <p className="text-lg font-semibold text-[var(--ink-paper)]">{pageLabel}</p>
          <p className="mt-1 text-[11px] text-[var(--ink-dim)]">页码</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
          <p className="text-lg font-semibold text-[var(--ink-paper)]">{saved ? '已加入' : '未加入'}</p>
          <p className="mt-1 text-[11px] text-[var(--ink-dim)]">书架</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
          <p className="text-lg font-semibold text-[var(--ink-paper)]">
            {choiceLabel ? '已选择' : qualityGate?.candidate_status === 'canon_ready' ? '可继续' : '待选择'}
          </p>
          <p className="mt-1 text-[11px] text-[var(--ink-dim)]">下一幕</p>
        </div>
      </div>
      {choiceLabel && <p className="mt-3 text-xs leading-5 text-[var(--ink-muted)]">已选择：{choiceLabel}</p>}
      {worldline && <p className="mt-3 text-[11px] text-[var(--ink-dim)]">你的选择会用于整理后续章节。</p>}
    </section>
  )
}

function MembershipPromptPanel({
  membership,
  onOpen,
}: {
  membership: ReaderMembershipState
  onOpen: () => void
}) {
  const label = storyMembershipLabel(membership)
  const credits = storyCreditBalance(membership)
  const isMember = Boolean(membership.subscription?.effective_tier || membership.subscription?.subscription)

  return (
    <section className="narrative-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CreditCard className="text-[var(--manuscript-gold)]" size={18} />
          <h2 className="text-lg font-semibold text-[var(--ink-paper)]">会员权益</h2>
        </div>
        <Badge variant={isMember ? 'stasis' : 'outline'}>{label}</Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
        {isMember
          ? `当前还有 ${credits} 次互动阅读额度。`
          : '当前可阅读公开章节；开通后获得更多互动阅读次数。'}
      </p>
      <Button className="mt-4 w-full" variant={isMember ? 'outline' : 'gold'} onClick={onOpen}>
        <CreditCard size={16} />
        {isMember ? '查看会员权益' : '查看会员方案'}
      </Button>
    </section>
  )
}

function UnknownWorldGate({ worldId }: { worldId: string }) {
  const navigate = useNavigate()

  return (
    <div className="narrative-page">
      <section className="cosmic-board p-6" data-world-id={worldId}>
        <div className="relative max-w-3xl">
          <Badge variant="gold">未开放宇宙</Badge>
          <h1 className="mt-4 text-4xl font-semibold text-[var(--ink-paper)]">这个世界还在孵化</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--ink-muted)]">
            这个世界暂时还没有开放阅读。你可以先进入《灯塔之外》，或回到书城继续挑选已经可以阅读的故事。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="gold" onClick={() => navigate('/story?world=beacon-beyond')}>
              <BookOpen size={16} />
              进入《灯塔之外》
            </Button>
            <Button variant="outline" onClick={() => navigate('/library')}>
              返回书城
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

function WorldlineMap({
  branches,
  activeBranchId,
  onSelect,
}: {
  branches: WorldBranch[]
  activeBranchId: string
  onSelect: (branch: WorldBranch) => void
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="relative min-h-[230px]">
        <div className="absolute left-1/2 top-10 h-[130px] w-px bg-[var(--worldline-cyan)]/25" />
        <div className="absolute left-[20%] top-[115px] h-px w-[60%] bg-[var(--worldline-cyan)]/25" />
        {branches.slice(0, 5).map((branch, index) => {
          const positions = [
            'left-1/2 top-2 -translate-x-1/2',
            'left-[10%] top-[98px]',
            'left-[43%] top-[158px]',
            'right-[10%] top-[98px]',
            'left-1/2 bottom-0 -translate-x-1/2',
          ]
          const isActive = branch.id === activeBranchId
          return (
            <button
              key={branch.id}
              type="button"
              className={`absolute ${positions[index] || positions[0]} flex flex-col items-center gap-2 text-center`}
              onClick={() => onSelect(branch)}
            >
              <span className={`worldline-node ${isActive ? 'worldline-node-active' : ''}`}>
                {index === 0 ? 'Ω' : `Ω-${index}`}
              </span>
              <span className="max-w-[92px] text-[11px] leading-4 text-[var(--ink-muted)]">{branch.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function BranchFocusPanel({
  branch,
  saved,
  saveState,
  onSave,
}: {
  branch: WorldBranch
  saved: boolean
  saveState: ReaderSaveState | null
  onSave: () => void
}) {
  const branchCode = branch.id === 'mainline' ? 'Ω-17' : branch.id === 'public-signal' ? 'Ω-17-A' : 'Ω-17-B'
  return (
    <section className="narrative-panel overflow-hidden p-5">
      <div className="relative">
        <div className="absolute -right-16 -top-24 h-52 w-52 rounded-full border border-[var(--worldline-cyan)]/15 shadow-[inset_0_0_60px_rgba(90,178,214,0.08)]" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.14em] text-[var(--ink-dim)]">我的分支</p>
            <h2 className="mt-2 text-4xl font-semibold leading-none text-[var(--ink-paper)]">{branchCode}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{branch.name}</p>
          </div>
          <Badge variant={branchTone(branch)}>{branchStatusLabel(branch)}</Badge>
        </div>

        <div className="omega-map mt-5">
          <div className="omega-node omega-node-small">Ω-15</div>
          <div className="omega-link" />
          <div className="omega-node omega-node-small">Ω-16</div>
          <div className="omega-link" />
          <div className="omega-node omega-node-active">Ω-17</div>
          <div className="omega-split">
            <span>Ω-17-A</span>
            <span>Ω-17-B</span>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-white/10 bg-black/[0.22] p-4">
          <p className="text-sm leading-6 text-[var(--ink-muted)]">{branch.summary}</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xl font-semibold text-[var(--ink-paper)]">{branch.divergence}%</p>
              <p className="text-[11px] text-[var(--ink-dim)]">分歧</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-[var(--ink-paper)]">{branch.stability}%</p>
              <p className="text-[11px] text-[var(--ink-dim)]">稳定</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-[var(--ink-paper)]">{branch.readingProgress}%</p>
              <p className="text-[11px] text-[var(--ink-dim)]">进度</p>
            </div>
          </div>
        </div>

        <Button className="mt-4 w-full" variant={saved ? 'secondary' : 'gold'} onClick={onSave}>
          <Save size={16} />
          {saved ? '已加入书架' : '加入书架'}
        </Button>
        <p className="mt-3 text-center text-xs leading-5 text-[var(--ink-dim)]">{readerSaveHint(saveState)}</p>
      </div>
    </section>
  )
}

function EventRhythmPanel({ branch, choice }: { branch: WorldBranch; choice?: WorldChoice }) {
  const timeline = simulateTimeline(branch.templateId, branch.id, choice?.id)
  return (
    <section className="narrative-panel p-5">
      <div className="flex items-center gap-2">
        <Clock3 className="text-[var(--manuscript-gold)]" size={18} />
        <h2 className="text-lg font-semibold text-[var(--ink-paper)]">剧情节奏</h2>
      </div>
      <div className="mt-4 space-y-3">
        {timeline.map((event, index) => (
          <div key={event.id} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--ink-paper)]">第 {index + 1} 拍 / {event.label}</p>
              <Badge variant={event.type === 'burst' ? 'collapse' : event.type === 'aftershock' ? 'flux' : 'outline'}>
                {event.type === 'burst' ? '爆发' : event.type === 'aftershock' ? '余波' : '平缓'}
              </Badge>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{event.description}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[var(--worldline-cyan)]" style={{ width: `${event.weight}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function StabilityDial({ score }: { score: number }) {
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - score / 100)
  return (
    <div className="stability-dial" aria-label={`故事状态 ${score}%`}>
      <svg viewBox="0 0 120 120" role="img" aria-hidden="true">
        <circle cx="60" cy="60" r={radius} className="stability-dial-track" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          className="stability-dial-value"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="stability-dial-label">
        <strong>{score}%</strong>
        <span>稳定</span>
      </div>
    </div>
  )
}

function QualityPanel({ choice }: { choice?: WorldChoice }) {
  const quality = qualityForChoice(choice)
  return (
    <section className="narrative-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-teal-300" size={18} />
          <h2 className="text-lg font-semibold text-[var(--ink-paper)]">故事状态</h2>
        </div>
        <Badge variant={quality.decision === 'pass' ? 'stasis' : 'flux'}>{quality.decision === 'pass' ? '良好' : '需关注'}</Badge>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)] xl:grid-cols-1">
        <StabilityDial score={quality.score} />
        <p className="text-sm leading-6 text-[var(--ink-muted)]">{quality.nextAction}</p>
      </div>
      <div className="mt-4 grid gap-2">
        {quality.metrics.map(metric => (
          <div key={metric.label} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--ink-paper)]">{metric.label}</span>
              <span className="text-[var(--ink-paper)]">{metric.value}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-teal-400" style={{ width: `${metric.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function CharacterMemoryPanel({ choice }: { choice?: WorldChoice }) {
  const isPublicSignal = choice?.id.includes('publish')
  const entries = choice
    ? [
        { name: '沈星澜', tag: '守夜人', text: choice.memoryWrite, delta: '+12' },
        {
          name: '陆白',
          tag: '档案官',
          text: isPublicSignal
            ? '获得可公开查证的证据，信任上升。'
            : '对沈星澜的沉默产生可见怀疑。',
          delta: isPublicSignal ? '+8' : '-6',
        },
        {
          name: '无名航海者',
          tag: '幸存者',
          text: isPublicSignal
            ? '成为多方争夺的证人，风险上升。'
            : '暂时获得时间，但身份仍未安全。',
          delta: isPublicSignal ? '+18' : '+9',
        },
      ]
    : [
        { name: '沈星澜', tag: '守夜人', text: '完成第一次选择后，这里会显示角色记忆、关系压力和下一章风险。', delta: '待定' },
        { name: '陆白', tag: '档案官', text: '你的选择会写入角色关系，不打断正文阅读。', delta: '待定' },
      ]

  return (
    <section className="narrative-panel p-5">
      <div className="flex items-center gap-2">
        <HeartHandshake className="text-[var(--worldline-cyan)]" size={18} />
        <h2 className="text-lg font-semibold text-[var(--ink-paper)]">角色记忆反馈</h2>
      </div>
      <div className="mt-4 space-y-3">
        {entries.map(entry => (
          <div key={`${entry.name}-${entry.text}`} className="character-memory-card">
            <div className="memory-avatar" aria-hidden="true">{entry.name.slice(0, 1)}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink-paper)]">{entry.name}</p>
                  <p className="text-[11px] text-[var(--ink-dim)]">{entry.tag}</p>
                </div>
                <span className="rounded-full border border-[var(--worldline-cyan)]/20 bg-[var(--worldline-cyan)]/10 px-2 py-1 text-[11px] font-semibold text-[var(--worldline-cyan)]">
                  {entry.delta}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{entry.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function TemplateStoryReader({ templateId }: { templateId: string }) {
  const navigate = useNavigate()
  const template = getTemplateById(templateId)
  const chapter = getChapterForTemplate(template.id)
  const readerPages = buildReaderPages(chapter.body)
  const branches = getBranchesForTemplate(template.id)
  const defaultBranch = branches.find(branch => branch.status === 'canon') || branches[0]
  const [initialSave] = useState(() => readReaderSave(template.id))
  const initialChoice = chapter.choices.find(choice => choice.id === initialSave?.choiceId)
  const [selectedChoice, setSelectedChoice] = useState<WorldChoice | undefined>(initialChoice)
  const [branchId, setBranchId] = useState(initialSave?.branchId || initialChoice?.branchId || defaultBranch?.id || 'mainline')
  const [pageIndex, setPageIndex] = useState(() => Math.min(initialSave?.pageIndex || 0, Math.max(readerPages.length - 1, 0)))
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const [sceneExpanded, setSceneExpanded] = useState(false)
  const [saved, setSaved] = useState(Boolean(initialSave?.saved))
  const [runtimeState, setRuntimeState] = useState<ReaderRuntimeState>(() => ({
    mode: runtimeConfig.localMode ? 'demo' : 'connecting',
    notice: runtimeConfig.localMode
      ? '你的阅读进度和选择会持续记录。'
      : '正在记录阅读进度；如果网络忙，选择也会先保留。',
  }))
  const [membership, setMembership] = useState<ReaderMembershipState>({ status: 'loading' })
  const readerPageRef = useRef<HTMLDivElement>(null)
  const safePageIndex = Math.min(pageIndex, Math.max(readerPages.length - 1, 0))
  const currentPageText = readerPages[safePageIndex] || readerPages[0] || ''
  const currentPageChars = countReadableChars(currentPageText)
  const hasPreviousPage = safePageIndex > 0
  const hasNextPage = safePageIndex < readerPages.length - 1
  const pageLabel = `${safePageIndex + 1}/${readerPages.length}`
  const displayedSaveState: ReaderSaveState | null = saved || selectedChoice || safePageIndex > 0
    ? {
        saved,
        pageIndex: safePageIndex,
        branchId,
        choiceId: selectedChoice?.id,
        templateTitle: template.title,
        updatedAt: initialSave?.updatedAt || new Date().toISOString(),
      }
    : initialSave

  useEffect(() => {
    readerPageRef.current?.scrollTo({ top: 0 })
  }, [safePageIndex])

  useEffect(() => {
    const nextState: ReaderSaveState = {
      saved,
      pageIndex: safePageIndex,
      branchId,
      choiceId: selectedChoice?.id,
      templateTitle: template.title,
      updatedAt: new Date().toISOString(),
    }
    if (saved || selectedChoice || safePageIndex > 0) {
      writeReaderSave(template.id, nextState)
    }
  }, [branchId, safePageIndex, saved, selectedChoice, template.id, template.title])

  useEffect(() => {
    let cancelled = false
    if (runtimeConfig.localMode) {
      return () => {
        cancelled = true
      }
    }

    async function connectRuntime() {
      try {
        const session = await storyApi.createSession({
          worldId: template.id,
          accountId: READER_ACCOUNT_ID,
        })
        const snapshot = await runtimeApi.getReaderSnapshot(session.session_id)
        if (cancelled) return
        setRuntimeState({
          mode: 'service',
          sessionId: session.session_id,
          snapshot,
          notice: '阅读进度已准备好，选择后会整理下一幕。',
        })
      } catch {
        if (cancelled) return
        setRuntimeState({
          mode: 'unavailable',
          notice: '选择已经记录，稍后会继续整理阅读进度。',
        })
      }
    }

    void connectRuntime()
    return () => {
      cancelled = true
    }
  }, [template.id])

  useEffect(() => {
    let cancelled = false

    async function loadMembership() {
      try {
        const subscription = await settingsApi.getSubscriptionStatus({ accountId: READER_ACCOUNT_ID })
        if (!cancelled) setMembership({ status: 'ready', subscription })
      } catch {
        if (!cancelled) setMembership({ status: 'unavailable' })
      }
    }

    void loadMembership()
    return () => {
      cancelled = true
    }
  }, [])

  const selectedBranch = branches.find(branch => branch.id === branchId) || defaultBranch
  const branch: WorldBranch = selectedBranch || {
    id: 'local-mainline',
    templateId: template.id,
    name: '开场主线',
    status: 'canon',
    tone: '开场阅读',
    summary: template.firstChoicePoint,
    divergence: 10,
    stability: 82,
    readingProgress: 18,
    diffHighlights: [template.initialEvent, template.protagonistGap, template.initialLocation],
  }
  const candidateScene: CandidateScene = (
    candidateScenes.find(scene => scene.sourceChoiceId === selectedChoice?.id)
    || candidateScenes.find(scene => scene.branchId === branch.id)
    || candidateScenes[0]
  )
  const runtimeChapterView = runtimeState.advance?.candidate_scene?.chapter_view
  const runtimeSceneTitle = fieldAsString(runtimeChapterView, 'chapterTitle')
  const runtimeSceneBody = fieldAsString(runtimeChapterView, 'body')
  const legacyDraftPrefix = '\u5019\u9009\u7247\u6bb5\uff1a'
  const nextSceneTitle = runtimeSceneTitle
    || candidateScene.title.replace(legacyDraftPrefix, '').replace('待审片段：', '')
  const nextSceneBody = runtimeSceneBody || candidateScene.body
  const memory = useMemo(
    () => selectedChoice ? [...activeInstance.memory, selectedChoice.memoryWrite] : activeInstance.memory,
    [selectedChoice],
  )

  const selectChoice = (choice: WorldChoice) => {
    setSelectedChoice(choice)
    setBranchId(choice.branchId)
    setSceneExpanded(false)
    setRightOpen(true)
    if (runtimeState.sessionId && runtimeState.mode !== 'advancing') {
      void advanceRuntimeChoice(choice, runtimeState.sessionId)
    }
  }

  const advanceRuntimeChoice = async (choice: WorldChoice, sessionId: string) => {
    setRuntimeState(previous => ({
      ...previous,
      mode: 'advancing',
      notice: '正在根据你的选择整理下一幕。',
    }))
    try {
      const advance = await runtimeApi.advanceScene({
        session_id: sessionId,
        choice_id: choice.id,
        freeform_intent: choice.label,
        account_id: READER_ACCOUNT_ID,
        worldline_id: sessionId,
        branch_id: choice.branchId,
        source_run_id: `reader-${sessionId}-${choice.id}`,
      })
      let snapshot = runtimeState.snapshot
      try {
        snapshot = await runtimeApi.getReaderSnapshot(sessionId)
      } catch {
        // Keep the just-generated candidate scene even if snapshot refresh fails.
      }
      setRuntimeState(previous => ({
        ...previous,
        mode: 'service',
        sessionId,
        snapshot,
        advance,
        notice: '下一幕已经准备好；确认前仍不会覆盖主线。',
      }))
    } catch {
      setRuntimeState(previous => ({
        ...previous,
        mode: previous.sessionId ? 'service' : 'unavailable',
        notice: '选择已经记录，稍后会继续整理阅读进度。',
      }))
    }
  }

  const leftRail = (
    <aside className="space-y-4">
      <section className="narrative-panel p-5">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="mb-4 px-0">
          <ChevronLeft size={16} />
          返回首页
        </Button>
        <div
          className="world-cover world-cover-flagship mb-4"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(5,9,18,0.08), rgba(5,9,18,0.78)), url(${template.coverImage})`,
            backgroundPosition: template.coverPosition,
          }}
        >
          <div className="absolute bottom-3 left-3 right-3 z-[1] flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-white/70">正在阅读</p>
              <p className="mt-1 text-sm font-semibold text-white">{template.title}</p>
            </div>
            <span className="rounded-full border border-white/20 bg-black/35 px-2 py-1 text-[11px] font-semibold text-white/80">
              {template.chapterCount}
            </span>
          </div>
        </div>
        <Badge variant={template.mode === 'flagship' ? 'gold' : 'outline'}>{template.subtitle}</Badge>
        <h1 className="mt-3 text-2xl font-semibold leading-tight text-[var(--ink-paper)]">{template.title}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{template.tagline}</p>
      </section>

      <section className="narrative-panel p-5">
        <div className="flex items-center gap-2">
          <BookOpen className="text-[var(--manuscript-gold)]" size={18} />
          <h2 className="text-lg font-semibold text-[var(--ink-paper)]">章节阅读</h2>
        </div>
        <div className="mt-4 rounded-lg border border-[var(--manuscript-gold)]/30 bg-[var(--manuscript-gold)]/[0.08] p-4">
          <p className="text-sm font-semibold text-[var(--ink-paper)]">{chapter.title}</p>
          <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{chapter.kicker}</p>
        </div>
      </section>

      <section className="narrative-panel p-5">
        <div className="flex items-center gap-2">
          <GitBranch className="text-[var(--worldline-cyan)]" size={18} />
          <h2 className="text-lg font-semibold text-[var(--ink-paper)]">分支地图</h2>
        </div>
        <div className="mt-4">
          <WorldlineMap
            branches={branches.length ? branches : [branch]}
            activeBranchId={branch.id}
            onSelect={nextBranch => {
              setBranchId(nextBranch.id)
              setRightOpen(true)
            }}
          />
        </div>
      </section>
    </aside>
  )

  const choiceImpactPanel = (
    <section className="narrative-panel p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="text-[var(--manuscript-gold)]" size={18} />
        <h2 className="text-lg font-semibold text-[var(--ink-paper)]">选择影响</h2>
      </div>
      <div className="mt-4 space-y-2">
        {(selectedChoice ? [
          selectedChoice.memoryWrite,
          selectedChoice.qualityGate.replace('需要校验', '后续写作要照顾'),
          '下一幕会先呈现人物关系的变化，再展开新的世界线。',
        ] : [
          '读到第一个选择点后，这里会显示你的选择怎样改变人物、记忆和下一幕。',
          '影响摘要只围绕故事本身，不打断正文阅读。',
        ]).map(item => (
          <div key={item} className="rounded-lg border border-white/10 bg-white/[0.025] p-3 text-sm leading-6 text-[var(--ink-muted)]">
            {item}
          </div>
        ))}
      </div>
    </section>
  )

  const rightRail = (
    <div className="space-y-4">
      <BranchFocusPanel branch={branch} saved={saved} saveState={displayedSaveState} onSave={() => setSaved(value => !value)} />
      <RuntimeSyncPanel
        runtimeState={runtimeState}
        saved={saved}
        pageLabel={pageLabel}
        choiceLabel={selectedChoice?.label}
      />
      <MembershipPromptPanel membership={membership} onOpen={() => navigate('/settings')} />
      {choiceImpactPanel}
      <CharacterMemoryPanel choice={selectedChoice} />
      <EventRhythmPanel branch={branch} choice={selectedChoice} />
      <QualityPanel choice={selectedChoice} />
    </div>
  )

  return (
    <div className="narrative-page space-y-5">
      <header className="reader-shell-bar flex flex-col justify-between gap-3 rounded-lg border border-white/10 bg-[#07101a]/90 p-4 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <Badge variant="gold">阅读中</Badge>
          <Badge variant="outline">{template.genre}</Badge>
          <Badge variant={storyMembershipLabel(membership) === '免费体验' ? 'outline' : 'stasis'}>
            {storyMembershipLabel(membership)}
          </Badge>
          <Badge variant={selectedChoice ? 'stasis' : 'secondary'}>{selectedChoice ? '个人宇宙已分裂' : '等待第一次选择'}</Badge>
          {saved && <Badge variant="gold">已保存</Badge>}
        </div>
        <div className="flex flex-wrap gap-2 lg:hidden">
          <Button variant="outline" size="sm" onClick={() => setLeftOpen(true)}>
            <Menu size={15} />
            索引
          </Button>
          <Button variant="outline" size="sm" onClick={() => setRightOpen(true)}>
            <PanelRightOpen size={15} />
            反馈
          </Button>
        </div>
      </header>

      <div className="reader-layout-grid">
        <div className="hidden xl:block xl:sticky xl:top-6 xl:self-start">{leftRail}</div>

        <main className="min-w-0 overflow-x-hidden">
          <ReadingPaper
            title={chapter.title}
            subtitle={chapter.kicker}
            className="reader-paper-frame w-full overflow-hidden"
            toolbar={(
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-[var(--pu-paper-muted)]">
                <span>《{template.title}》 · {chapter.title}</span>
                <div className="flex items-center gap-2">
                  <button type="button" className="reader-tool-button">Aa</button>
                  <button type="button" className="reader-tool-button">目录</button>
                  <button type="button" className="reader-tool-button">书签</button>
                </div>
              </div>
            )}
            meta={(
              <>
                <span className="rounded-full bg-[#221b13]/[0.08] px-3 py-1 text-xs font-semibold text-[#5b4630]">{template.genre}</span>
                <span className="rounded-full bg-[#221b13]/[0.08] px-3 py-1 text-xs font-semibold text-[#5b4630]">{selectedChoice ? '个人分支已生成' : '主线阅读中'}</span>
                <span className="rounded-full bg-[#221b13]/[0.08] px-3 py-1 text-xs font-semibold text-[#5b4630]">
                  第 {safePageIndex + 1} / {readerPages.length} 页
                </span>
              </>
            )}
            footer={(
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <p className="text-xs font-semibold text-[#7d6239]">
                  当前约 {currentPageChars} 字 · 可上下滚动
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!hasPreviousPage}
                    onClick={() => setPageIndex(() => Math.max(0, safePageIndex - 1))}
                  >
                    <ChevronLeft size={15} />
                    上一页
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!hasNextPage}
                    onClick={() => setPageIndex(() => Math.min(readerPages.length - 1, safePageIndex + 1))}
                  >
                    下一页
                    <ChevronRight size={15} />
                  </Button>
                </div>
              </div>
            )}
          >
            <div
              ref={readerPageRef}
              className="reader-page-scroll min-h-[500px] max-h-[min(62vh,660px)] overflow-y-auto pr-2"
            >
              <div className="break-words whitespace-pre-line text-[16px] leading-8 text-[#2f2419] [overflow-wrap:anywhere] md:text-[17px]">
                {currentPageText}
              </div>
            </div>
            {sceneExpanded && selectedChoice && (
              <div className="rounded-lg border border-[#b9975e]/45 bg-[#f7ecd1]/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7d6239]">下一幕 · {branch.name}</p>
                <h2 className="mt-2 text-xl font-semibold text-[#21170e]">{nextSceneTitle}</h2>
                <p className="mt-3 whitespace-pre-line text-[16px] leading-8 text-[#2f2419]">{nextSceneBody}</p>
              </div>
            )}
          </ReadingPaper>

          <Panel className="mt-4 w-full p-4">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <p className="text-xs tracking-[0.16em] text-[var(--ink-dim)]">读者选择点</p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--ink-paper)]">{template.firstChoicePoint}</h2>
              </div>
              {selectedChoice && (
                <Badge variant="stasis">
                  <CheckCircle2 size={13} className="mr-1" />
                  已选择：{selectedChoice.label}
                </Badge>
              )}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {chapter.choices.map(choice => (
                <ChoiceCard
                  key={choice.id}
                  title={choice.label}
                  consequence={choice.description}
                  tensionDelta={choice.tensionDelta}
                  status={choice.tensionDelta > 20 ? 'danger' : 'quiet'}
                  selected={selectedChoice?.id === choice.id}
                  note={choice.memoryWrite}
                  ctaLabel="选择这条分支"
                  testId={`story-choice-${choice.id}`}
                  onChoose={() => selectChoice(choice)}
                />
              ))}
            </div>
            {selectedChoice && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Button variant="gold" onClick={() => setSceneExpanded(true)}>
                  <Sparkles size={16} />
                  展开下一幕
                </Button>
                <Button variant="outline" onClick={() => setRightOpen(true)}>
                  <PanelRightOpen size={16} />
                  查看阅读反馈
                </Button>
              </div>
            )}
          </Panel>

          <ReaderRequestPanel
            workId={template.id}
            branchId={pmfMainBranchId(template.id)}
            titleText={template.title}
            selectedChoiceLabel={selectedChoice?.label}
          />

          <section className="mt-4 grid w-full gap-3 md:grid-cols-3">
            {memory.slice(-3).map(item => (
              <Panel key={item} tone="muted" className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <HeartHandshake size={15} className="text-[var(--worldline-cyan)]" />
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--ink-dim)]">记忆写入</p>
                </div>
                <p className="text-sm leading-6 text-[var(--ink-muted)]">{item}</p>
              </Panel>
            ))}
          </section>
        </main>

        <div className="hidden xl:block xl:sticky xl:top-6 xl:self-start">{rightRail}</div>
      </div>

      {leftOpen && (
        <div className="fixed inset-0 z-[70] bg-black/70 p-4 backdrop-blur-sm xl:hidden">
          <div className="h-full max-w-sm overflow-y-auto">
            <div className="mb-3 flex justify-end">
              <Button variant="outline" size="icon" onClick={() => setLeftOpen(false)} aria-label="关闭索引">
                <X size={16} />
              </Button>
            </div>
            {leftRail}
          </div>
        </div>
      )}

      {rightOpen && (
        <div className="fixed inset-0 z-[70] bg-black/70 p-4 backdrop-blur-sm xl:hidden">
          <div className="ml-auto h-full max-w-md overflow-y-auto">
            <div className="mb-3 flex justify-end">
              <Button variant="outline" size="icon" onClick={() => setRightOpen(false)} aria-label="关闭阅读反馈">
                <X size={16} />
              </Button>
            </div>
            {rightRail}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Story() {
  const [searchParams] = useSearchParams()
  const fallback = flagshipTemplate()
  const templateId = searchParams.get('world') || fallback.id

  if (!isWorldTemplateId(templateId)) {
    return <UnknownWorldGate worldId={templateId} />
  }

  return <TemplateStoryReader key={templateId} templateId={templateId} />
}
