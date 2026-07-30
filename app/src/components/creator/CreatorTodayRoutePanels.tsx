import type { PmfLocalDraft, PmfPublishEvent, PmfReaderRequest } from '@/features/pmf/types'
import { requestTypeLabel } from '@/lib/pmfSupabase'
import { CreatorTodayPriorityPanel } from './CreatorTodayPriorityPanel'

export interface CreatorDashboardPriorityPanelProps {
  topRequest: PmfReaderRequest | null
  activeDraft: PmfLocalDraft | null
  publishCandidate: PmfLocalDraft | null
  pending: number
  inProgress: number
  draftCount: number
  readyDraftCount: number
  latestPublish: PmfPublishEvent | null
  decisionRule?: string
  onOpenRequest: () => void
  onOpenDraft: () => void
  onOpenPublish: () => void
}

function latestDateLabel(value?: string | null) {
  if (!value) return '暂无记录'
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function requestPriorityReason(request: PmfReaderRequest) {
  const voteCount = request.vote_count ?? 0
  if (voteCount >= 10) return '读者热度较高'
  if (request.status === 'in_progress') return '已经进入写作'
  if (request.status === 'acknowledged') return '已经看过'
  return '等待作者判断'
}

export function CreatorDashboardPriorityPanel({
  topRequest,
  activeDraft,
  publishCandidate,
  pending,
  inProgress,
  draftCount,
  readyDraftCount,
  latestPublish,
  decisionRule,
  onOpenRequest,
  onOpenDraft,
  onOpenPublish,
}: CreatorDashboardPriorityPanelProps) {
  const lead = publishCandidate
    ? {
        title: '先做发布前复核',
        detail: `《${publishCandidate.title}》已经接近公开，先确认读者会在哪里看到它。`,
        action: '去检查',
        onAction: onOpenPublish,
      }
    : activeDraft
      ? {
          title: '先把这一段写完',
          detail: `《${activeDraft.title}》已经有草稿，继续补到可以判断的正文长度。`,
          action: '继续写',
          onAction: onOpenDraft,
        }
      : topRequest
        ? {
            title: '先回应读者最想看的方向',
            detail: `这条「${requestTypeLabel(topRequest.request_type)}」可以先整理成一场戏，再进入写作台。`,
            action: '看这一问',
            onAction: onOpenRequest,
          }
        : {
            title: '先建立今天的写作切入点',
            detail: '没有明确请求时，建议从作品结构里挑一条最缺入口的线。',
            action: '看作品',
            onAction: onOpenRequest,
          }
  const requestCount = pending + inProgress
  const metrics = [
    {
      label: publishCandidate ? '先确认' : activeDraft ? '先续写' : topRequest ? '先判断' : '等待输入',
      value: publishCandidate
        ? publishCandidate.title
        : activeDraft
          ? activeDraft.title
          : topRequest
            ? requestTypeLabel(topRequest.request_type)
            : '暂无明确优先项',
      detail: publishCandidate
        ? '已有可发布初稿，先检查公开位置和读者视角。'
        : activeDraft
          ? '最近的私密草稿适合先推进到可发布状态。'
          : topRequest
            ? requestPriorityReason(topRequest)
            : '可以刷新请求，或直接进入写作台维护已有作品。',
      tone: 'strong' as const,
    },
    {
      label: '外界回声',
      value: `${requestCount} 条`,
      detail: `${pending} 条已收到，${inProgress} 条已看到或处理中。`,
      tone: requestCount ? 'calm' as const : 'quiet' as const,
    },
    {
      label: '发布准备',
      value: `${readyDraftCount} 份`,
      detail: latestPublish ? `最近发布：${latestDateLabel(latestPublish.created_at)}` : '暂无发布记录。',
      tone: readyDraftCount ? 'calm' as const : 'quiet' as const,
    },
  ]
  const steps = [
    {
      label: '外界回声',
      value: `${requestCount} 条`,
      detail: requestCount ? '先判断哪些值得今天处理。' : '等待新的阅读反馈。',
      state: requestCount && !activeDraft && !publishCandidate ? 'active' as const : requestCount ? 'ready' as const : 'waiting' as const,
    },
    {
      label: '私密草稿',
      value: `${draftCount} 份`,
      detail: draftCount ? '正文确认前不会公开。' : '从外界回声进入写作台开始。',
      state: activeDraft && !publishCandidate ? 'active' as const : draftCount ? 'ready' as const : 'waiting' as const,
    },
    {
      label: '发布包',
      value: `${readyDraftCount} 份`,
      detail: readyDraftCount ? '需要确认公开位置和影响。' : '等待可发布初稿。',
      state: publishCandidate ? 'active' as const : readyDraftCount ? 'ready' as const : 'waiting' as const,
    },
    {
      label: '读者更新',
      value: latestPublish ? '已有记录' : '待发布',
      detail: latestPublish ? `最近：${latestDateLabel(latestPublish.created_at)}` : '发布后读者端才会看到。',
      state: latestPublish ? 'ready' as const : 'waiting' as const,
    },
  ]

  return (
    <CreatorTodayPriorityPanel
      title={lead.title}
      description={lead.detail}
      actionLabel={lead.action}
      onAction={lead.onAction}
      metrics={metrics}
      steps={steps}
      decisionRule={decisionRule}
    />
  )
}
