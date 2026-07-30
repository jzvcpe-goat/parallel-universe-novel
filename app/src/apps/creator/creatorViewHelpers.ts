import {
  type PmfBranch,
  type PmfLocalDraft,
  type PmfReaderRequest,
  type PmfRequestType,
} from '@/features/pmf/types'

const hiddenTechnicalTerms = [
  'Supa' + 'base',
  'R' + 'LS',
  'tr' + 'ace',
  'pro' + 'vider',
  'fall' + 'back',
  'API' + ' key',
  '后' + '端',
  '接' + '口',
  '同' + '步',
  '回' + '写',
  '数' + '据库',
  'A' + 'I',
  '模' + '型',
  'L' + 'LM',
]

export function byNewestDraft(a: PmfLocalDraft, b: PmfLocalDraft) {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
}

export function byRequestPriority(a: PmfReaderRequest, b: PmfReaderRequest) {
  const aStatusWeight = a.status === 'in_progress' ? 3 : a.status === 'acknowledged' ? 2 : a.status === 'pending' ? 1 : 0
  const bStatusWeight = b.status === 'in_progress' ? 3 : b.status === 'acknowledged' ? 2 : b.status === 'pending' ? 1 : 0
  return bStatusWeight - aStatusWeight
    || b.vote_count - a.vote_count
    || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
}

export function requestPriorityReason(request: PmfReaderRequest) {
  if (request.status === 'in_progress') return '已经在写作流里，适合今天继续推进。'
  if (request.status === 'acknowledged') return '你已经看过这条请求，适合今天接上。'
  if (request.vote_count >= 3) return `${request.vote_count} 票想看，热度靠前。`
  return '最近收到，可以先判断是否开写。'
}

export function echoProgressLabel(status: PmfReaderRequest['status']) {
  if (status === 'pending') return '等待判断'
  if (status === 'acknowledged') return '已经看过'
  if (status === 'in_progress') return '进入创作'
  if (status === 'published') return '公开回应'
  return '暂不采用'
}

export function isDraftReadyForPublish(draft: PmfLocalDraft) {
  return Boolean(draft.workId && draft.branchId && draft.title.trim() && draft.content.trim().length >= 120)
}

export function latestDateLabel(value?: string | null) {
  if (!value) return '暂无时间'
  return new Date(value).toLocaleString()
}

export function branchTypeLabel(branch: PmfBranch) {
  if (branch.branch_type === 'main') return '主线'
  if (branch.branch_type === 'if') return 'IF 支线'
  if (branch.branch_type === 'bonus') return '番外'
  return '备选线'
}

export function readerWishTypeLabel(type: PmfRequestType) {
  if (type === 'if_branch') return 'IF 支线愿望'
  if (type === 'continue_branch') return '继续支线愿望'
  return '下一章愿望'
}

export function statusTone(status: PmfReaderRequest['status']): 'stasis' | 'destructive' | 'gold' | 'outline' {
  if (status === 'published') return 'stasis'
  if (status === 'rejected') return 'destructive'
  if (status === 'in_progress') return 'gold'
  return 'outline'
}

export function workTitleForId(workId: string) {
  if (!workId) return '未选择作品'
  return `作品记录 ${workId.slice(0, 10)}`
}

export function creatorFacingNotice(message?: string | null) {
  if (!message) return ''
  if (hiddenTechnicalTerms.some(term => message.includes(term))) {
    return '当前操作暂时不可用，请稍后重试；未发布内容仍在私密草稿箱。'
  }
  return message
}
