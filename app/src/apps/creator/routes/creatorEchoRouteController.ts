import {
  type PmfBranch,
  type PmfReaderRequest,
  type PmfRequestStatus,
  type PmfWork,
} from '@/features/pmf/types'
import {
  branchTypeLabel,
  workTitleForId,
} from '../creatorViewHelpers'

export type EchoAction = 'acknowledge' | 'start' | 'reject' | 'cluster'

export function requestIntentLabel(request: PmfReaderRequest) {
  if (request.request_type === 'next_chapter') return '读者想要主线继续推进'
  if (request.request_type === 'if_branch') return '读者想看另一种选择成立'
  return '读者想继续一条已有支线'
}

function requestSceneSeed(request: PmfReaderRequest) {
  const cleaned = request.request_text.trim().replace(/[。！？!?；;，,、]+$/u, '')
  const clipped = cleaned.length > 48 ? `${cleaned.slice(0, 48)}...` : cleaned
  if (request.request_type === 'next_chapter') return `从「${clipped}」切入，先让主角做出会改变下一章的问题。`
  if (request.request_type === 'if_branch') return `从「${clipped}」切入，先写清另一种选择会失去什么。`
  return `从「${clipped}」切入，先让这条支线补上一个新的代价。`
}

export function requestAuthorDecision(request: PmfReaderRequest) {
  if (request.request_type === 'next_chapter') return '这一章要先推进真相、关系，还是场景探索？'
  if (request.request_type === 'if_branch') return '这条 IF 支线要成为短支线，还是值得继续连载？'
  return '这条支线继续写，是兑现读者期待，还是先收束风险？'
}

export function requestWritingQuestion(request: PmfReaderRequest) {
  if (request.request_type === 'next_chapter') return '这次续写最先让谁承担选择后果？'
  if (request.request_type === 'if_branch') return '如果走另一条线，谁会第一个失去原本拥有的东西？'
  return '继续这条线时，上一段承诺要先兑现还是先加压？'
}

function normalizedRequestText(text: string) {
  return text.trim().replace(/\s+/g, '').slice(0, 56)
}

function requestClusterKey(request: PmfReaderRequest) {
  return [
    request.work_id,
    request.branch_id || 'main',
    request.request_type,
    normalizedRequestText(request.request_text),
  ].join('|')
}

export function buildRequestClusterCounts(requests: PmfReaderRequest[]) {
  const counts = new Map<string, number>()
  for (const request of requests) {
    const key = requestClusterKey(request)
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return counts
}

export function workTitleFromMap(workId: string, works: Map<string, PmfWork>) {
  return works.get(workId)?.title || workTitleForId(workId)
}

export function branchTitleFromMap(branchId: string | null, branches: Map<string, PmfBranch>) {
  if (!branchId) return '主线'
  const branch = branches.get(branchId)
  return branch ? `${branchTypeLabel(branch)} · ${branch.title}` : branchId.endsWith(':main') ? '主线' : 'IF 支线'
}

export function canMoveRequestStatus(current: PmfRequestStatus, next: Exclude<PmfRequestStatus, 'pending'>) {
  if (current === 'published' || current === 'rejected') return false
  if (current === 'pending') return next === 'acknowledged'
  if (current === 'acknowledged') return next === 'in_progress' || next === 'rejected'
  if (current === 'in_progress') return next === 'rejected'
  return false
}

export function requestActionForStatus(status: Exclude<PmfRequestStatus, 'pending'>): EchoAction {
  if (status === 'acknowledged') return 'acknowledge'
  if (status === 'rejected') return 'reject'
  return 'start'
}

export function canStartRequestWriting(request: PmfReaderRequest) {
  return request.status !== 'published' && request.status !== 'rejected'
}

export function buildSelectedEchoDecisionCards(request: PmfReaderRequest | null, clusterCount: number) {
  if (!request) return null
  return [
    {
      label: '读者原话',
      title: requestIntentLabel(request),
      body: request.request_text,
      tone: 'strong' as const,
    },
    {
      label: '作者一问',
      title: '先问清楚再写',
      body: requestWritingQuestion(request),
      tone: 'strong' as const,
    },
    {
      label: '可写场景',
      title: '把愿望落成场面',
      body: requestSceneSeed(request),
      tone: 'calm' as const,
    },
    {
      label: '动笔判断',
      title: '决定这一章的承诺',
      body: requestAuthorDecision(request),
      tone: 'calm' as const,
    },
    {
      label: '相近请求',
      title: clusterCount > 1 ? `${clusterCount} 条可一起看` : '暂无同类压力',
      body: clusterCount > 1 ? '先看同类，避免把同一个愿望拆成多次重复处理。' : '当前可以单独处理这条请求。',
      tone: clusterCount > 1 ? 'strong' as const : 'quiet' as const,
    },
  ]
}
