import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Bell,
  BookOpen,
  ListFilter,
  RefreshCw,
} from 'lucide-react'
import { Panel } from '@/components/design-system/Panel'
import { CreatorExternalEchoDetailPanel } from '@/components/creator/CreatorExternalEchoDetailPanel'
import { CreatorExternalEchoInboxCard } from '@/components/creator/CreatorExternalEchoInboxCard'
import {
  CreatorEchoDecisionPanel,
  CreatorEchoNextActionPanel,
  CreatorEchoStatusStrip,
  CreatorEchoWritingRail,
} from '@/components/creator/CreatorEchoPanels'
import { CreatorSelect } from '@/components/creator/CreatorRouteControls'
import { CreatorStatePanel } from '@/components/creator/CreatorStatePanel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  type PmfBranch,
  type PmfReaderRequest,
  type PmfWork,
} from '@/features/pmf/types'
import {
  requestStatusLabel,
  requestTypeLabel,
} from '@/lib/pmfSupabase'
import type { PmfCreativeReminder } from '@/local-db/creatorLocalWritingRepository'
import type { LocalReaderSignalCache, ReaderSignalSourceSyncState } from '@/local-db/schema'
import {
  runCreatorEchoReminderAction,
  runCreatorEchoStartWriting,
  runCreatorEchoStatusUpdate,
} from './creatorEchoActionService'
import {
  openCreatorEchoReaderPerspective,
  scheduleCreatorEchoActionReset,
  scheduleCreatorEchoInitialLoad,
  scheduleCreatorEchoVisibilityRefresh,
  subscribeCreatorEchoWorkspaceRefresh,
} from './creatorEchoBrowserActionService'
import { readCreatorEchoLocalSnapshot, runCreatorEchoLoad } from './creatorEchoLoadService'
import {
  requestActionForStatus,
  type EchoAction,
} from './creatorEchoRouteController'
import {
  readerSignalSourceLabel,
  type EchoReminderFilter,
  type EchoSignalSavedView,
  type EchoSignalSort,
  type EchoSourceFilter,
} from './creatorEchoSignalViewModels'
import { createCreatorEchoRouteViewModel } from './creatorEchoRouteViewModels'
import { creatorFacingNotice } from '../creatorViewHelpers'

export function CreatorEchoRoute() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState<PmfReaderRequest[]>([])
  const [works, setWorks] = useState<PmfWork[]>([])
  const [branches, setBranches] = useState<PmfBranch[]>([])
  const [readerSignals, setReaderSignals] = useState<LocalReaderSignalCache[]>([])
  const [signalSources, setSignalSources] = useState<ReaderSignalSourceSyncState[]>([])
  const [creativeReminders, setCreativeReminders] = useState<PmfCreativeReminder[]>([])
  const [freshness, setFreshness] = useState<'fresh' | 'stale' | 'offline'>('stale')
  const [notice, setNotice] = useState('正在刷新读者想看的方向...')
  const [loading, setLoading] = useState(true)
  const [selectedSignalId, setSelectedSignalId] = useState('')
  const [savedView, setSavedView] = useState<EchoSignalSavedView>('all')
  const [workFilter, setWorkFilter] = useState('all')
  const [reminderFilter, setReminderFilter] = useState<EchoReminderFilter>('all')
  const [sourceFilter, setSourceFilter] = useState<EchoSourceFilter>('all')
  const [sortBy, setSortBy] = useState<EchoSignalSort>('heat')
  const [actionPending, setActionPending] = useState<{ requestId: string; action: EchoAction } | null>(null)
  const [reminderPending, setReminderPending] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await runCreatorEchoLoad()
    if (result.ok) {
      setWorks(result.works)
      setBranches(result.branches)
      setRequests(result.requests)
      setReaderSignals(result.readerSignals)
      setSignalSources(result.signalSources)
      setCreativeReminders(result.creativeReminders)
      setFreshness(result.freshness)
      setSelectedSignalId(previous => previous || result.readerSignals[0]?.id || '')
      setNotice(result.notice)
    } else {
      setNotice(creatorFacingNotice(result.notice))
    }
    setLoading(false)
  }, [])

  const refreshLocalEcho = useCallback(() => {
    const snapshot = readCreatorEchoLocalSnapshot()
    setReaderSignals(snapshot.readerSignals)
    setSignalSources(snapshot.signalSources)
    setCreativeReminders(snapshot.creativeReminders)
  }, [])

  function requestActionPending(requestId: string, action?: EchoAction) {
    if (!actionPending || actionPending.requestId !== requestId) return false
    return action ? actionPending.action === action : true
  }

  async function setStatus(request: PmfReaderRequest, status: 'acknowledged' | 'in_progress' | 'rejected') {
    const action = requestActionForStatus(status)
    setActionPending({ requestId: request.id, action })
    try {
      const result = await runCreatorEchoStatusUpdate(request, status)
      setNotice(result.notice)
      if (result.ok) {
        await load()
        return result.request
      }
      return null
    } finally {
      setActionPending(null)
    }
  }

  async function startWriting(request: PmfReaderRequest) {
    setActionPending({ requestId: request.id, action: 'start' })
    try {
      const result = await runCreatorEchoStartWriting(request)
      if (!result.ok) {
        setNotice(result.notice)
        return
      }
      setCreativeReminders(result.creativeReminders)
      await load()
      navigate(`/creator/editor?request=${request.id}`)
    } finally {
      setActionPending(null)
    }
  }

  async function updateReminder(signal: LocalReaderSignalCache, status: 'pinned' | 'used' | 'dismissed') {
    setReminderPending(signal.id)
    try {
      const result = await runCreatorEchoReminderAction(signal, status)
      if (result.ok) {
        setCreativeReminders(result.creativeReminders)
      }
      setNotice(result.notice)
    } finally {
      scheduleCreatorEchoActionReset(() => setReminderPending(null))
    }
  }

  function showSimilarSignal(signal: LocalReaderSignalCache) {
    setSourceFilter(signal.source)
    setSavedView('all')
    setSelectedSignalId(signal.id)
    setNotice(`当前只看「${readerSignalSourceLabel(signal.source)}」来源。`)
  }

  function openReaderPerspective(request: PmfReaderRequest) {
    const result = openCreatorEchoReaderPerspective(
      request.work_id,
      String(import.meta.env.VITE_PUBLIC_READER_URL || ''),
    )
    if (!result.ok) setNotice(result.notice)
  }

  useEffect(() => {
    const cleanupInitial = scheduleCreatorEchoInitialLoad(load)
    const cleanupRefresh = scheduleCreatorEchoVisibilityRefresh(load)
    const cleanupWorkspace = subscribeCreatorEchoWorkspaceRefresh(refreshLocalEcho)
    return () => {
      cleanupInitial()
      cleanupRefresh()
      cleanupWorkspace()
    }
  }, [load, refreshLocalEcho])

  const {
    freshnessLabel,
    pinnedReminderCount,
    priorityClusterCount,
    priorityIsSelected,
    priorityNextAction,
    priorityRequest,
    prioritySignal,
    savedViews,
    selectedClusterCount,
    selectedDecisionCards,
    selectedRequest,
    selectedRequestCapabilities,
    selectedSignal,
    selectedSignalViewModel,
    selectedWritingRailRequest,
    signalSortLabel,
    sourceRows,
    totalVisibleSignalCount,
    viewCounts,
    visibleSignalRows,
    visibleSignals,
  } = useMemo(() => createCreatorEchoRouteViewModel({
    branches,
    creativeReminders,
    formatRequestStatus: requestStatusLabel,
    formatRequestType: requestTypeLabel,
    freshness,
    readerSignals,
    reminderFilter,
    requests,
    savedView,
    selectedSignalId,
    signalSources,
    sortBy,
    sourceFilter,
    workFilter,
    works,
  }), [
    branches,
    creativeReminders,
    freshness,
    readerSignals,
    reminderFilter,
    requests,
    savedView,
    selectedSignalId,
    signalSources,
    sortBy,
    sourceFilter,
    workFilter,
    works,
  ])

  return (
    <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_340px]">
      <aside className="space-y-4">
        <Panel className="p-4" motion="reveal">
          <div className="flex items-center gap-2">
            <ListFilter size={17} className="text-[var(--creator-accent)]" />
            <h2 className="text-base font-semibold text-[var(--creator-text)]">保存视图</h2>
          </div>
          <div className="mt-3 grid gap-2">
            {savedViews.map(view => (
              <Button
                key={view.id}
                variant={savedView === view.id ? 'gold' : 'outline'}
                className="h-auto w-full justify-between gap-3 px-3 py-3 text-left"
                onClick={() => setSavedView(view.id)}
              >
                <span>
                  <span className="block text-sm font-semibold">{view.label}</span>
                  <span className="block text-xs opacity-70">{view.detail}</span>
                </span>
                <Badge variant="outline">{viewCounts[view.id]}</Badge>
              </Button>
            ))}
          </div>
        </Panel>
        <Panel className="p-4" motion="reveal">
          <div className="flex items-center gap-2">
            <BookOpen size={17} className="text-[var(--creator-accent)]" />
            <h2 className="text-base font-semibold text-[var(--creator-text)]">筛选</h2>
          </div>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-2 text-xs text-[var(--creator-text-dim)]">
              作品
              <CreatorSelect
                value={workFilter}
                onValueChange={setWorkFilter}
                options={[
                  { value: 'all', label: '全部作品' },
                  ...works.map(work => ({ value: work.id, label: work.title })),
                ]}
              />
            </label>
            <label className="grid gap-2 text-xs text-[var(--creator-text-dim)]">
              提醒状态
              <CreatorSelect
                value={reminderFilter}
                onValueChange={setReminderFilter}
                options={[
                  { value: 'all', label: '全部状态' },
                  { value: 'suggested', label: '等待判断' },
                  { value: 'pinned', label: '已经保存' },
                  { value: 'used', label: '已用于写作' },
                  { value: 'dismissed', label: '已经放下' },
                ]}
              />
            </label>
            <label className="grid gap-2 text-xs text-[var(--creator-text-dim)]">
              回声来源
              <CreatorSelect
                value={sourceFilter}
                onValueChange={setSourceFilter}
                options={[
                  { value: 'all', label: '全部来源' },
                  { value: 'request', label: '想看' },
                  { value: 'comment', label: '留言' },
                  { value: 'highlight', label: '高亮' },
                  { value: 'reaction', label: '反应' },
                  { value: 'question', label: '追问' },
                  { value: 'vote_aggregate', label: '支持' },
                ]}
              />
            </label>
            <label className="grid gap-2 text-xs text-[var(--creator-text-dim)]">
              排序
              <CreatorSelect
                value={sortBy}
                onValueChange={setSortBy}
                options={[
                  { value: 'heat', label: '按回应强度' },
                  { value: 'newest', label: '按最新' },
                  { value: 'status', label: '按提醒状态' },
                ]}
              />
            </label>
          </div>
        </Panel>
      </aside>

      <Panel className="min-w-0 p-5" motion="reveal">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-[var(--creator-accent)]" />
              <h2 className="text-xl font-semibold text-[var(--creator-text)]">外界回声</h2>
            </div>
            <p className="mt-2 text-sm text-[var(--creator-text-muted)]">{notice}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">本机提醒 {pinnedReminderCount}</Badge>
            <Badge variant="outline">{freshnessLabel}</Badge>
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw size={15} />
              {loading ? '读取中...' : '刷新'}
            </Button>
          </div>
        </div>
        <CreatorEchoStatusStrip
          rows={sourceRows}
          visibleCount={visibleSignals.length}
          totalCount={totalVisibleSignalCount}
          sortLabel={signalSortLabel}
          className="mt-4"
        />
        <CreatorEchoNextActionPanel
          action={priorityNextAction}
          clusterCount={priorityClusterCount}
          isSelected={priorityIsSelected}
          onSelect={() => {
            if (prioritySignal) setSelectedSignalId(prioritySignal.id)
          }}
          onStart={() => {
            if (!prioritySignal) return
            if (priorityRequest) void startWriting(priorityRequest)
            else void updateReminder(prioritySignal, 'pinned')
          }}
          onCluster={() => {
            if (prioritySignal) showSimilarSignal(prioritySignal)
          }}
        />
        <div className="mt-4">
          {loading ? (
            <CreatorStatePanel kind="loading" title="正在读取回声" description="读取完成后会显示外界回声。" />
          ) : visibleSignals.length ? (
            <ScrollArea className="max-h-[720px] pr-3">
              <div className="space-y-3" role="list" aria-label="外界回声收件箱">
                {visibleSignalRows.map(({ signal, viewModel }) => {
                  const isBusy = reminderPending === signal.id
                  return (
                    <CreatorExternalEchoInboxCard
                      key={signal.id}
                      viewModel={viewModel}
                      selected={selectedSignal?.id === signal.id}
                      busy={isBusy}
                      onSelect={() => setSelectedSignalId(signal.id)}
                      onPin={() => void updateReminder(signal, 'pinned')}
                      onUse={() => void updateReminder(signal, 'used')}
                      onDismiss={() => void updateReminder(signal, 'dismissed')}
                    />
                  )
                })}
              </div>
            </ScrollArea>
          ) : (
            <CreatorStatePanel
              kind="empty"
              title="当前视图没有回声"
              description="可以切换保存视图或筛选条件，也可以等待读者留下新的反馈。"
              actionLabel="显示全部"
              onAction={() => {
                setSavedView('all')
                setWorkFilter('all')
                setReminderFilter('all')
                setSourceFilter('all')
              }}
            />
          )}
        </div>
      </Panel>

      <aside className="space-y-4">
        <CreatorExternalEchoDetailPanel
          viewModel={selectedSignalViewModel}
          busy={Boolean(selectedSignal && reminderPending === selectedSignal.id)}
          onPin={() => {
            if (selectedSignal) void updateReminder(selectedSignal, 'pinned')
          }}
          onUse={() => {
            if (selectedSignal) void updateReminder(selectedSignal, 'used')
          }}
          onDismiss={() => {
            if (selectedSignal) void updateReminder(selectedSignal, 'dismissed')
          }}
        />
        {selectedRequest ? (
          <>
            <CreatorEchoDecisionPanel
              cards={selectedDecisionCards}
              clusterCount={selectedClusterCount}
              onStart={() => void startWriting(selectedRequest)}
              onCluster={() => {
                if (selectedSignal) showSimilarSignal(selectedSignal)
              }}
            />
            <CreatorEchoWritingRail
              request={selectedWritingRailRequest}
              busy={requestActionPending(selectedRequest.id)}
              acknowledgePending={requestActionPending(selectedRequest.id, 'acknowledge')}
              startPending={requestActionPending(selectedRequest.id, 'start')}
              clusterPending={requestActionPending(selectedRequest.id, 'cluster')}
              rejectPending={requestActionPending(selectedRequest.id, 'reject')}
              canAcknowledge={selectedRequestCapabilities?.canAcknowledge ?? false}
              canStart={selectedRequestCapabilities?.canStart ?? false}
              canCluster={selectedRequestCapabilities?.canCluster ?? false}
              canReject={selectedRequestCapabilities?.canReject ?? false}
              onAcknowledge={() => void setStatus(selectedRequest, 'acknowledged')}
              onStart={() => void startWriting(selectedRequest)}
              onCluster={() => {
                if (selectedSignal) showSimilarSignal(selectedSignal)
              }}
              onOpenReader={() => openReaderPerspective(selectedRequest)}
              onReject={async () => {
                await setStatus(selectedRequest, 'rejected')
              }}
            />
          </>
        ) : null}
      </aside>
    </div>
  )
}
