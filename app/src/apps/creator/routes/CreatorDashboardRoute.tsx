import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { CreatorTodayContextRail } from '@/components/creator/CreatorTodayContextRail'
import {
  CreatorTodayNextStepsPanel,
  type CreatorTodayNextStep,
} from '@/components/creator/CreatorTodayNextStepsPanel'
import { CreatorDashboardPriorityPanel } from '@/components/creator/CreatorTodayRoutePanels'
import { CreatorTodayEchoStatusPanel } from '@/components/creator/CreatorTodayEchoStatusPanel'
import { CreatorTodayPathPanel } from '@/components/creator/CreatorTodayPathPanel'
import { CreatorWorkReadinessPanel } from '@/components/creator/CreatorWorkReadinessPanel'
import { publishBundleDraftTargetPathForLocalDraftRef } from '@/features/creator-pivot/publishBundleDraftHandoff'
import {
  type PmfBranch,
  type PmfChapter,
  type PmfLocalDraft,
  type PmfPublishEvent,
  type PmfReaderRequest,
  type PmfWork,
} from '@/features/pmf/types'
import {
  requestTypeLabel,
} from '@/lib/pmfSupabase'
import {
  readCreatorDashboardLocalSnapshot,
} from './creatorDashboardLoadService'
import { scheduleCreatorDashboardInitialLoad } from './creatorDashboardBrowserActionService'
import { applyCreatorDashboardRouteStatePatchToReact } from './creatorDashboardReactPatchApplier'
import {
  runCreatorDashboardSyncEffect,
  type CreatorDashboardPhase,
} from './creatorDashboardRouteEffectService'
import {
  branchTypeLabel,
  echoProgressLabel,
  latestDateLabel,
  requestPriorityReason,
} from '../creatorViewHelpers'
import { createCreatorDashboardRouteViewModel } from './creatorDashboardRouteViewModels'

export function CreatorDashboardRoute() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<CreatorDashboardPhase>('loading')
  const [refreshing, setRefreshing] = useState(false)
  const [requests, setRequests] = useState<PmfReaderRequest[]>([])
  const [drafts, setDrafts] = useState<PmfLocalDraft[]>(() => readCreatorDashboardLocalSnapshot().drafts)
  const [works, setWorks] = useState<PmfWork[]>([])
  const [branches, setBranches] = useState<PmfBranch[]>([])
  const [chapters, setChapters] = useState<PmfChapter[]>([])
  const [publishEvents, setPublishEvents] = useState<PmfPublishEvent[]>([])
  const [notice, setNotice] = useState('正在读取今天的写作线索...')
  const [clientStatus, setClientStatus] = useState('等待刷新')

  async function sync() {
    setRefreshing(true)
    const statePatch = await runCreatorDashboardSyncEffect()
    applyCreatorDashboardRouteStatePatchToReact(statePatch, {
      setBranches,
      setChapters,
      setClientStatus,
      setDrafts,
      setNotice,
      setPhase,
      setPublishEvents,
      setRequests,
      setWorks,
    })
    setRefreshing(false)
  }

  useEffect(() => {
    return scheduleCreatorDashboardInitialLoad(sync)
  }, [])

  const {
    activeBranches,
    activeDraft,
    inProgress,
    latestPublish,
    latestWork,
    pending,
    publishCandidate,
    published,
    publishedChapters,
    readyDraftCount,
    rejected,
    topRequest,
  } = createCreatorDashboardRouteViewModel({
    branches,
    chapters,
    drafts,
    publishEvents,
    requests,
    works,
  })
  const todayPathItems = [
    {
      id: 'external-echo',
      label: '外界回声',
      title: '值得回应的反馈',
      value: pending + inProgress,
      detail: `${pending} 条已收到，${inProgress} 条已看到或处理中。`,
      actionLabel: '打开回声',
      onAction: () => navigate('/creator/requests'),
      disabled: phase === 'loading',
    },
    {
      id: 'private-drafts',
      label: '私密草稿',
      title: '仅作者可见',
      value: drafts.length,
      detail: activeDraft ? `最近：${activeDraft.title}` : '暂无私密草稿。',
      actionLabel: '进入写作台',
      onAction: () => navigate('/creator/editor'),
      disabled: phase === 'loading',
    },
    {
      id: 'publish-bundles',
      label: '发布包',
      title: '等待人工确认',
      value: readyDraftCount,
      detail: latestPublish ? `最近发布：${latestDateLabel(latestPublish.created_at)}` : '暂无发布记录。',
      actionLabel: '打开发布包',
      onAction: () => navigate('/creator/publish'),
      disabled: !readyDraftCount || phase === 'loading',
    },
    {
      id: 'works-and-branches',
      label: '作品与支线',
      title: '结构概况',
      value: works.length,
      detail: `${activeBranches} 条线，${publishedChapters} 个已发布章节。`,
      actionLabel: '查看作品',
      onAction: () => navigate('/creator/works'),
      disabled: phase === 'loading',
    },
  ]
  const latestBranch = branches[0] || null
  const todayContextWork = latestWork
    ? {
      summary: latestWork.summary || '等待作品说明更新。',
      title: latestWork.title,
      updatedLabel: latestDateLabel(latestWork.updated_at),
    }
    : null
  const todayContextBranch = latestBranch
    ? {
      isMain: latestBranch.branch_type === 'main',
      title: latestBranch.title,
      typeLabel: branchTypeLabel(latestBranch),
      updatedLabel: latestDateLabel(latestBranch.updated_at),
    }
    : null
  const nextSteps: CreatorTodayNextStep[] = [
    {
      id: 'external-echo',
      tone: 'echo',
      priority: topRequest ? 'primary' : 'normal',
      label: '最值得回应的一问',
      title: topRequest ? requestTypeLabel(topRequest.request_type) : '等待外界回声',
      description: topRequest ? topRequest.request_text : '有外界回声后，会按热度、状态和时间出现在这里。',
      meta: topRequest ? `${requestPriorityReason(topRequest)} · ${echoProgressLabel(topRequest.status)}` : '暂无等待判断的回声',
      actionLabel: topRequest ? '带着这一问去写' : '查看回声',
      onAction: () => navigate(topRequest ? `/creator/editor?request=${topRequest.id}` : '/creator/requests'),
      disabled: phase === 'loading',
    },
    {
      id: 'private-draft',
      tone: 'draft',
      priority: activeDraft ? 'primary' : 'normal',
      label: '正在写的一条',
      title: activeDraft ? activeDraft.title : '暂无私密草稿',
      description: activeDraft ? '这份正文仍在草稿箱，确认前不会公开。' : '从外界回声进入写作台后，可以保存私密草稿。',
      meta: activeDraft ? latestDateLabel(activeDraft.updatedAt) : '写作台未保存内容',
      actionLabel: activeDraft ? '继续写' : '进入写作台',
      onAction: () => navigate(activeDraft ? `/creator/editor?draft=${encodeURIComponent(activeDraft.localDraftRef)}` : '/creator/editor'),
      disabled: phase === 'loading',
    },
    {
      id: 'publish-bundle',
      tone: 'publish',
      priority: publishCandidate ? 'primary' : 'muted',
      label: '需要确认发布',
      title: publishCandidate ? publishCandidate.title : '暂无待发布内容',
      description: publishCandidate ? '发布包确认前请核对章节归属、公开标题和读者视角。' : '草稿达到可发布状态后，会进入发布包确认。',
      meta: publishCandidate ? '人工确认后公开' : '等待正文',
      actionLabel: publishCandidate ? '确认发布包' : '暂不可用',
      onAction: () => navigate(publishCandidate ? publishBundleDraftTargetPathForLocalDraftRef(publishCandidate.localDraftRef) : '/creator/publish'),
      disabled: !publishCandidate || phase === 'loading',
    },
  ]

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-4">
        <CreatorTodayNextStepsPanel
          phase={phase}
          notice={notice}
          refreshing={refreshing}
          items={nextSteps}
          onRefresh={sync}
        />

        <CreatorDashboardPriorityPanel
          topRequest={topRequest}
          activeDraft={activeDraft}
          publishCandidate={publishCandidate}
          pending={pending}
          inProgress={inProgress}
          draftCount={drafts.length}
          readyDraftCount={readyDraftCount}
          latestPublish={latestPublish}
          decisionRule="先续写处理中回声，其次回应已看过的回声，再按票数和提交时间判断。"
          onOpenRequest={() => navigate(topRequest ? `/creator/requests` : '/creator/works')}
          onOpenDraft={() => navigate(activeDraft ? `/creator/editor?draft=${encodeURIComponent(activeDraft.localDraftRef)}` : '/creator/editor')}
          onOpenPublish={() => navigate(publishCandidate ? publishBundleDraftTargetPathForLocalDraftRef(publishCandidate.localDraftRef) : '/creator/publish')}
        />

        <CreatorTodayPathPanel items={todayPathItems} busy={phase === 'loading'} />

        <CreatorTodayEchoStatusPanel
          phase={phase}
          pending={pending}
          inProgress={inProgress}
          published={published}
          rejected={rejected}
        />

        <CreatorWorkReadinessPanel
          phase={phase}
          works={works}
          branches={branches}
          chapters={chapters}
          requests={requests}
          onOpenWorks={() => navigate('/creator/works')}
        />
      </section>

      <aside
        data-slot="creator-today-context-column"
        className="space-y-4 xl:sticky xl:top-4 xl:self-start"
      >
        <CreatorTodayContextRail
          phase={phase}
          clientStatus={clientStatus}
          work={todayContextWork}
          branch={todayContextBranch}
        />
      </aside>
    </div>
  )
}
