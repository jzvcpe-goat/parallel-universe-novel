import type { PmfBranch, PmfReaderRequest, PmfWork } from '@/features/pmf/types'
import type {
  CreativeReminder,
  LocalReaderSignalCache,
  ReaderSignalAdapterSource,
  ReaderSignalSourceSyncState,
} from '@/local-db/schema'
import { branchTitleFromMap, workTitleFromMap } from './creatorEchoRouteController'

export type EchoReminderFilter = 'all' | CreativeReminder['status']
export type EchoSourceFilter = 'all' | ReaderSignalAdapterSource
export type EchoSignalSort = 'heat' | 'newest' | 'status'
export type EchoSignalSavedView = 'all' | 'needs_action' | 'hot' | 'writing' | 'branch' | 'done'

interface EchoSignalFilterState {
  savedView: EchoSignalSavedView
  workFilter: string
  reminderFilter: EchoReminderFilter
  sourceFilter: EchoSourceFilter
  sortBy: EchoSignalSort
}

const sourceLabels: Record<ReaderSignalAdapterSource, string> = {
  request: '想看',
  comment: '留言',
  highlight: '高亮',
  reaction: '反应',
  question: '追问',
  vote_aggregate: '支持',
}

const typeLabels: Record<LocalReaderSignalCache['sourceType'], string> = {
  comment: '读者留言',
  highlight: '被记住的句子',
  request: '下一章期待',
  vote: '读者支持',
  reaction: '场面反应',
  question: '人物追问',
  confusion: '理解断点',
  branch_wish: '支线火花',
  continuity_note: '连续性提醒',
}

const reminderStatusLabels: Record<CreativeReminder['status'], string> = {
  suggested: '等待判断',
  pinned: '已保存',
  used: '已用于写作',
  dismissed: '已放下',
}

const reminderStatusRank: Record<CreativeReminder['status'], number> = {
  suggested: 1,
  pinned: 2,
  used: 3,
  dismissed: 4,
}

export function readerSignalSourceLabel(source: ReaderSignalAdapterSource) {
  return sourceLabels[source]
}

export function creativeReminderStatusLabel(status: CreativeReminder['status']) {
  return reminderStatusLabels[status]
}

export function resolveReminderForSignal(
  signal: LocalReaderSignalCache,
  reminders: CreativeReminder[],
) {
  return reminders.find(reminder =>
    reminder.sourceSignalIds.includes(signal.id)
    || signal.sourceRefs.some(ref => reminder.sourceSignalIds.includes(ref.cloudId)),
  ) || null
}

export function resolveRequestForSignal(
  signal: LocalReaderSignalCache,
  requests: PmfReaderRequest[],
) {
  const requestId = signal.sourceRefs.find(ref => ref.source === 'request')?.cloudId
  return requestId ? requests.find(request => request.id === requestId) || null : null
}

function savedViewMatches(
  signal: LocalReaderSignalCache,
  reminder: CreativeReminder | null,
  view: EchoSignalSavedView,
) {
  if (view === 'needs_action') return reminder?.status === 'suggested'
  if (view === 'hot') return signal.weight >= 3
  if (view === 'writing') return reminder?.status === 'pinned'
  if (view === 'branch') return reminder?.type === 'branch_seed'
  if (view === 'done') return reminder?.status === 'used' || reminder?.status === 'dismissed'
  return true
}

export function resolveVisibleEchoSignals(
  signals: LocalReaderSignalCache[],
  reminders: CreativeReminder[],
  filters: EchoSignalFilterState,
) {
  const visible = signals.filter(signal => {
    if (!signal.readerVisible || signal.visibility !== 'visible') return false
    const reminder = resolveReminderForSignal(signal, reminders)
    return savedViewMatches(signal, reminder, filters.savedView)
      && (filters.workFilter === 'all' || signal.workId === filters.workFilter)
      && (filters.reminderFilter === 'all' || reminder?.status === filters.reminderFilter)
      && (filters.sourceFilter === 'all' || signal.sourceRefs.some(ref => ref.source === filters.sourceFilter))
  })
  return [...visible].sort((left, right) => {
    if (filters.sortBy === 'newest') return right.cloudCreatedAt.localeCompare(left.cloudCreatedAt)
    if (filters.sortBy === 'status') {
      const leftStatus = resolveReminderForSignal(left, reminders)?.status || 'suggested'
      const rightStatus = resolveReminderForSignal(right, reminders)?.status || 'suggested'
      return reminderStatusRank[leftStatus] - reminderStatusRank[rightStatus]
    }
    return right.weight - left.weight || right.cloudCreatedAt.localeCompare(left.cloudCreatedAt)
  })
}

export function buildEchoSignalViewCounts(
  signals: LocalReaderSignalCache[],
  reminders: CreativeReminder[],
) {
  const entries: EchoSignalSavedView[] = ['all', 'needs_action', 'hot', 'writing', 'branch', 'done']
  return Object.fromEntries(entries.map(view => [
    view,
    signals.filter(signal => signal.readerVisible && savedViewMatches(
      signal,
      resolveReminderForSignal(signal, reminders),
      view,
    )).length,
  ])) as Record<EchoSignalSavedView, number>
}

export function buildEchoSourceRows(signals: LocalReaderSignalCache[]) {
  const sources: ReaderSignalAdapterSource[] = ['request', 'comment', 'highlight', 'reaction', 'question', 'vote_aggregate']
  return sources.map(source => ({
    label: sourceLabels[source],
    value: signals.filter(signal => signal.sourceRefs.some(ref => ref.source === source)).length,
  }))
}

export function resolveSelectedEchoSignal(
  signals: LocalReaderSignalCache[],
  selectedSignalId: string,
) {
  return signals.find(signal => signal.id === selectedSignalId) || signals[0] || null
}

export function resolvePriorityEchoSignal(
  signals: LocalReaderSignalCache[],
  reminders: CreativeReminder[],
) {
  return [...signals]
    .filter(signal => signal.readerVisible && resolveReminderForSignal(signal, reminders)?.status !== 'dismissed')
    .sort((left, right) => right.weight - left.weight || right.cloudCreatedAt.localeCompare(left.cloudCreatedAt))[0] || null
}

export function buildEchoSignalViewModel(
  signal: LocalReaderSignalCache,
  reminder: CreativeReminder | null,
  works: Map<string, PmfWork>,
  branches: Map<string, PmfBranch>,
) {
  const reminderStatus = reminder?.status || 'suggested'
  return {
    id: signal.id,
    sourceLabel: sourceLabels[signal.source],
    sourceSummary: signal.sourceRefs.map(ref => sourceLabels[ref.source]).filter((label, index, labels) => labels.indexOf(label) === index).join(' · '),
    typeLabel: typeLabels[signal.sourceType],
    workTitle: workTitleFromMap(signal.workId, works),
    branchTitle: branchTitleFromMap(signal.branchId || null, branches),
    signalText: signal.rawText,
    anchorText: signal.anchorText,
    weightLabel: signal.weight > 1 ? `${signal.weight} 次回应` : '1 次回应',
    relatedCount: signal.sourceRefs.length,
    reminderId: reminder?.id || null,
    reminderStatus,
    reminderStatusLabel: reminderStatusLabels[reminderStatus],
    reminderTitle: reminder?.title || '等待判断',
    reminderNote: reminder?.authorNote || '先判断这条回声对当前创作是否有用。',
    canPin: reminderStatus === 'suggested' || reminderStatus === 'dismissed',
    canDismiss: reminderStatus !== 'dismissed' && reminderStatus !== 'used',
    canUse: reminderStatus === 'pinned',
  }
}

export function buildPriorityEchoSignalAction(
  signal: LocalReaderSignalCache | null,
  reminder: CreativeReminder | null,
  works: Map<string, PmfWork>,
  branches: Map<string, PmfBranch>,
) {
  if (!signal) return null
  return {
    intentLabel: reminder?.title || typeLabels[signal.sourceType],
    readerQuote: signal.rawText,
    priorityReason: `${sourceLabels[signal.source]} · ${signal.weight > 1 ? `${signal.weight} 次回应` : '新的回声'}`,
    chips: [
      { label: '作品', value: workTitleFromMap(signal.workId, works) },
      { label: '发布线', value: branchTitleFromMap(signal.branchId || null, branches) },
      { label: '来源', value: signal.sourceRefs.map(ref => sourceLabels[ref.source]).filter((label, index, labels) => labels.indexOf(label) === index).join(' · ') },
    ],
    writingBrief: [
      { label: '作者一问', value: reminder?.authorNote || '这条回声对当前作品最有用的部分是什么？' },
      { label: '可写场景', value: signal.sourceType === 'branch_wish' ? '先写另一种选择带来的第一份损失。' : '把读者反应落到下一次人物选择。' },
      { label: '马上做', value: reminder?.status === 'pinned' ? '把提醒带进当前草稿。' : '先保存为本机创作提醒。' },
    ],
  }
}

export function echoFreshnessLabel(
  freshness: 'fresh' | 'stale' | 'offline',
  sources: ReaderSignalSourceSyncState[],
) {
  if (freshness === 'offline') return '本机最近保存'
  if (freshness === 'stale') return '等待下一次刷新'
  const latest = sources.reduce((value, source) => source.fetchedAt > value ? source.fetchedAt : value, '')
  return latest ? '刚刚更新' : '尚未读取'
}
