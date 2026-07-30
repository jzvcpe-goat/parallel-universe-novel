import type { AgentActionContract } from '@/agent-surface/actions'
import type { PmfCreatorClient, PmfFeatureFlag } from '@/features/pmf/types'
import type {
  CreatorAuthorizationStatus,
  LocalCreatorWorkspaceSnapshot,
} from './creatorSettingsLoadService'
import { latestDateLabel } from '../creatorViewHelpers'

export type CreatorSettingsPhase = 'loading' | 'ready' | 'error'

export interface CreatorSettingsRouteViewModelInput {
  actions: readonly AgentActionContract[]
  authorization: CreatorAuthorizationStatus | null
  client: PmfCreatorClient | null
  flags: PmfFeatureFlag[]
  isLocalSurface: boolean
  phase: CreatorSettingsPhase
  workspaceSnapshot: LocalCreatorWorkspaceSnapshot
}

export interface CreatorSettingsStatusItem {
  label: string
  value: string
}

export interface CreatorSettingsReadinessItem extends CreatorSettingsStatusItem {
  ready: boolean
}

export interface CreatorSettingsFlagItem extends CreatorSettingsStatusItem {
  enabled?: boolean
  key: string
}

interface CreatorSettingsWorkspaceSummaryItem extends CreatorSettingsStatusItem {
  detail: string
}

interface CreatorSettingsOperationItem {
  detail: string
  id: string
  label: string
  status: string
}

interface CreatorSettingsPermissionItem extends CreatorSettingsStatusItem {
  detail: string
}

export interface CreatorSettingsRouteViewModel {
  authorReady: boolean
  creatorEnabled: boolean
  operationItems: CreatorSettingsOperationItem[]
  permissionItems: CreatorSettingsPermissionItem[]
  platformCreationClosed: boolean
  readerRequestsEnabled: boolean
  readinessItems: CreatorSettingsReadinessItem[]
  settingsFlagItems: CreatorSettingsFlagItem[]
  settingsPromises: string[]
  settingsStatusItems: CreatorSettingsStatusItem[]
  workspaceRecordCount: number
  workspaceSummaryItems: CreatorSettingsWorkspaceSummaryItem[]
}

function flagLabel(key: string) {
  if (key === 'reader_requests_enabled') return '外界回声'
  if (key === 'creator_app_enabled') return '作者工作台'
  if (key === 'cloud_ai_runtime_enabled') return '公开自动写作'
  return '作品能力'
}

function operationStatusLabel(status: string) {
  if (status === 'succeeded') return '已完成'
  if (status === 'failed') return '未完成'
  if (status === 'blocked') return '已阻止'
  if (status === 'cancelled_by_author') return '已取消'
  return '进行中'
}

export function createCreatorSettingsRouteViewModel({
  actions,
  authorization,
  client,
  flags,
  isLocalSurface,
  phase,
  workspaceSnapshot,
}: CreatorSettingsRouteViewModelInput): CreatorSettingsRouteViewModel {
  const flagMap = new Map(flags.map(flag => [flag.key, flag]))
  const flagState = (key: string) => {
    const flag = flagMap.get(key)
    if (!flag) return '未读取'
    return flag.enabled ? '已开启' : '已关闭'
  }

  const authorReady = Boolean(authorization?.authorized)
  const creatorEnabled = flagMap.get('creator_app_enabled')?.enabled === true
  const readerRequestsEnabled = flagMap.get('reader_requests_enabled')?.enabled === true
  const platformCreationClosed = flagMap.get('cloud_ai_runtime_enabled')?.enabled === false
  const creatorClientVersion = client?.version && client.version.includes('qa')
    ? '内测版'
    : client?.version || '未读取'

  const readinessItems: CreatorSettingsReadinessItem[] = [
    { label: '作者身份', value: authorReady ? '已开通' : '未开通', ready: authorReady },
    { label: '创作设备', value: isLocalSurface ? '当前设备' : '请回到创作设备', ready: isLocalSurface },
    { label: '工作台状态', value: flagState('creator_app_enabled'), ready: creatorEnabled },
    { label: '外界回声', value: flagState('reader_requests_enabled'), ready: readerRequestsEnabled },
    { label: '公开自动写作', value: flagState('cloud_ai_runtime_enabled'), ready: platformCreationClosed },
  ]

  const settingsStatusItems: CreatorSettingsStatusItem[] = [
    { label: '当前设备', value: isLocalSurface ? '可用' : '请回到创作设备' },
    { label: '在线状态', value: client?.online_status === 'online' ? '在线' : phase === 'loading' ? '读取中' : '未读取' },
    { label: '最近读取', value: latestDateLabel(client?.last_sync_at || client?.last_seen_at || null) },
    { label: '工作台版本', value: creatorClientVersion },
  ]

  const settingsFlagItems: CreatorSettingsFlagItem[] = [
    'reader_requests_enabled',
    'creator_app_enabled',
    'cloud_ai_runtime_enabled',
  ].map(key => ({
    enabled: flagMap.get(key)?.enabled,
    key,
    label: flagLabel(key),
    value: flagState(key),
  }))

  const settingsPromises = [
    '读者阅读端不提供创作入口。',
    '平台只展示已发布内容、请求状态和发布记录。',
    '草稿、写作过程和本机资料不会自动公开。',
    '作者确认前，任何内容都不会公开给读者。',
  ]

  const workspaceSummaryItems: CreatorSettingsWorkspaceSummaryItem[] = [
    { label: '私密草稿', value: String(workspaceSnapshot.drafts.length), detail: '还没有进入发布包的正文。' },
    { label: '设定资料', value: String(workspaceSnapshot.settingAssets.length), detail: '人物、能力、地点和规则等资料。' },
    { label: '回声缓存', value: String(workspaceSnapshot.readerSignals.length), detail: '最近从阅读端带回的写作信号。' },
    { label: '创作提醒', value: String(workspaceSnapshot.creativeReminders.length), detail: '由外界回声沉淀的写作入口。' },
    { label: '发布包', value: String(workspaceSnapshot.publishBundles.length), detail: '等待确认或已经提交的发布材料。' },
    { label: '发布回执', value: String(workspaceSnapshot.publishReceipts.length), detail: '发布后留给作者核对的结果。' },
    { label: '操作记录', value: String(workspaceSnapshot.operationRecords.length), detail: '作者触发的助手动作。' },
  ]
  const workspaceRecordCount = workspaceSummaryItems.reduce(
    (total, item) => total + Number(item.value),
    0,
  )

  const operationItems = workspaceSnapshot.operationRecords.slice(0, 4).map(record => {
    const action = actions.find(item => item.name === record.actionName)
    return {
      detail: record.message || latestDateLabel(record.finishedAt || record.createdAt),
      id: record.id,
      label: action?.label || '作者助手动作',
      status: operationStatusLabel(record.status),
    }
  })

  const permissionItems: CreatorSettingsPermissionItem[] = [
    {
      label: '读取当前正文',
      value: `${actions.filter(action => action.readsPrivateDraftBody).length} 项`,
      detail: '用于续写、改写、追问和影响判断，只在作者触发时读取当前草稿上下文。',
    },
    {
      label: '写入本机资料',
      value: `${actions.filter(action => action.writesLocalData).length} 项`,
      detail: '用于保存草稿、创作提醒、设定资料和发布包，不会直接公开。',
    },
    {
      label: '公开发布',
      value: '需确认',
      detail: '只有发布包确认动作会影响读者端，且必须由作者二次确认。',
    },
  ]

  return {
    authorReady,
    creatorEnabled,
    operationItems,
    permissionItems,
    platformCreationClosed,
    readerRequestsEnabled,
    readinessItems,
    settingsFlagItems,
    settingsPromises,
    settingsStatusItems,
    workspaceRecordCount,
    workspaceSummaryItems,
  }
}
