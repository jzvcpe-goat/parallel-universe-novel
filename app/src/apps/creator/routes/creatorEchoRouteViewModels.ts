import type {
  PmfBranch,
  PmfReaderRequest,
  PmfRequestStatus,
  PmfRequestType,
  PmfWork,
} from '@/features/pmf/types'
import type {
  CreativeReminder,
  LocalReaderSignalCache,
  ReaderSignalSourceSyncState,
} from '@/local-db/schema'
import {
  branchTitleFromMap,
  buildRequestClusterCounts,
  buildSelectedEchoDecisionCards,
  canMoveRequestStatus,
  canStartRequestWriting,
  requestAuthorDecision,
  requestIntentLabel,
  requestWritingQuestion,
  workTitleFromMap,
} from './creatorEchoRouteController'
import {
  buildEchoSignalViewCounts,
  buildEchoSignalViewModel,
  buildEchoSourceRows,
  buildPriorityEchoSignalAction,
  echoFreshnessLabel,
  resolvePriorityEchoSignal,
  resolveReminderForSignal,
  resolveRequestForSignal,
  resolveSelectedEchoSignal,
  resolveVisibleEchoSignals,
  type EchoReminderFilter,
  type EchoSignalSavedView,
  type EchoSignalSort,
  type EchoSourceFilter,
} from './creatorEchoSignalViewModels'
import { statusTone } from '../creatorViewHelpers'

export interface CreatorEchoRouteViewModelInput {
  branches: PmfBranch[]
  creativeReminders: CreativeReminder[]
  formatRequestStatus(status: PmfRequestStatus): string
  formatRequestType(type: PmfRequestType): string
  freshness: 'fresh' | 'stale' | 'offline'
  readerSignals: LocalReaderSignalCache[]
  reminderFilter: EchoReminderFilter
  requests: PmfReaderRequest[]
  savedView: EchoSignalSavedView
  selectedSignalId: string
  signalSources: ReaderSignalSourceSyncState[]
  sortBy: EchoSignalSort
  sourceFilter: EchoSourceFilter
  workFilter: string
  works: PmfWork[]
}

export const creatorEchoSavedViews: Array<{
  detail: string
  id: EchoSignalSavedView
  label: string
}> = [
  { id: 'all', label: '全部回声', detail: '完整列表' },
  { id: 'needs_action', label: '等待判断', detail: '尚未保存或放下' },
  { id: 'hot', label: '回应集中', detail: '多人在意的地方' },
  { id: 'writing', label: '已经保存', detail: '进入本机写作流' },
  { id: 'branch', label: '支线火花', detail: 'IF 与续写' },
  { id: 'done', label: '已经判断', detail: '已使用 / 已放下' },
]

export function createCreatorEchoRouteViewModel({
  branches,
  creativeReminders,
  formatRequestStatus,
  formatRequestType,
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
}: CreatorEchoRouteViewModelInput) {
  const workMap = new Map(works.map(work => [work.id, work]))
  const branchMap = new Map(branches.map(branch => [branch.id, branch]))
  const clusterCounts = buildRequestClusterCounts(requests)
  const viewCounts = buildEchoSignalViewCounts(readerSignals, creativeReminders)
  const visibleSignals = resolveVisibleEchoSignals(readerSignals, creativeReminders, {
    savedView,
    workFilter,
    reminderFilter,
    sourceFilter,
    sortBy,
  })
  const selectedSignal = resolveSelectedEchoSignal(visibleSignals, selectedSignalId)
  const selectedReminder = selectedSignal
    ? resolveReminderForSignal(selectedSignal, creativeReminders)
    : null
  const selectedRequest = selectedSignal
    ? resolveRequestForSignal(selectedSignal, requests)
    : null
  const prioritySignal = resolvePriorityEchoSignal(readerSignals, creativeReminders)
  const priorityReminder = prioritySignal
    ? resolveReminderForSignal(prioritySignal, creativeReminders)
    : null
  const priorityRequest = prioritySignal
    ? resolveRequestForSignal(prioritySignal, requests)
    : null
  const selectedClusterCount = selectedRequest
    ? clusterCounts.get([
        selectedRequest.work_id,
        selectedRequest.branch_id || 'main',
        selectedRequest.request_type,
        selectedRequest.request_text.trim().replace(/\s+/g, '').slice(0, 56),
      ].join('|')) || 1
    : selectedSignal?.sourceRefs.length || 0

  const selectedWritingRailRequest = selectedRequest
    ? {
        statusLabel: formatRequestStatus(selectedRequest.status),
        statusVariant: statusTone(selectedRequest.status),
        typeLabel: formatRequestType(selectedRequest.request_type),
        clusterCount: selectedClusterCount,
        intentLabel: requestIntentLabel(selectedRequest),
        requestText: selectedRequest.request_text,
        writingQuestion: requestWritingQuestion(selectedRequest),
        authorDecision: requestAuthorDecision(selectedRequest),
        workTitle: workTitleFromMap(selectedRequest.work_id, workMap),
        branchTitle: branchTitleFromMap(selectedRequest.branch_id, branchMap),
        voteLabel: `${selectedRequest.vote_count} 票`,
      }
    : null

  const visibleSignalRows = visibleSignals.map(signal => {
    const reminder = resolveReminderForSignal(signal, creativeReminders)
    return {
      signal,
      viewModel: buildEchoSignalViewModel(signal, reminder, workMap, branchMap),
    }
  })

  return {
    freshnessLabel: echoFreshnessLabel(freshness, signalSources),
    pinnedReminderCount: creativeReminders.filter(reminder => reminder.status === 'pinned').length,
    priorityClusterCount: prioritySignal?.sourceRefs.length || 0,
    priorityIsSelected: Boolean(prioritySignal && selectedSignal?.id === prioritySignal.id),
    priorityNextAction: buildPriorityEchoSignalAction(prioritySignal, priorityReminder, workMap, branchMap),
    priorityRequest,
    prioritySignal,
    savedViews: creatorEchoSavedViews,
    selectedClusterCount,
    selectedDecisionCards: buildSelectedEchoDecisionCards(selectedRequest, selectedClusterCount),
    selectedRequest,
    selectedRequestCapabilities: selectedRequest
      ? {
          canAcknowledge: canMoveRequestStatus(selectedRequest.status, 'acknowledged'),
          canCluster: selectedClusterCount > 1,
          canReject: canMoveRequestStatus(selectedRequest.status, 'rejected'),
          canStart: canStartRequestWriting(selectedRequest),
        }
      : null,
    selectedSignal,
    selectedSignalViewModel: selectedSignal
      ? buildEchoSignalViewModel(selectedSignal, selectedReminder, workMap, branchMap)
      : null,
    selectedWritingRailRequest,
    signalSortLabel: sortBy === 'heat'
      ? '按回应强度'
      : sortBy === 'newest'
        ? '按最新'
        : '按提醒状态',
    sourceRows: buildEchoSourceRows(readerSignals),
    totalVisibleSignalCount: readerSignals.filter(signal => signal.readerVisible).length,
    viewCounts,
    visibleSignalRows,
    visibleSignals,
  }
}
