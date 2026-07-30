import type {
  PmfBranch,
  PmfChapter,
  PmfCreatorClient,
  PmfFeatureFlag,
  PmfLocalDraft,
  PmfLocalSettingAsset,
  PmfLocalSettingAssetKind,
  PmfLocalSettingAssetStage,
  PmfPublishEvent,
  PmfReaderRequest,
  PmfRequestStatus,
  PmfRequestType,
  PmfWork,
} from '@/features/pmf/types'
import { pmfMainBranchId } from '@/features/pmf/types'
import { readerSignalBatchesFromRequests } from '@/features/creator-pivot/externalEchoAdapters'
import type { ReaderSignalSourceBatch } from '@/features/creator-pivot/externalEchoContracts'
import type { AgentOperationLog, CreativeReminder, LocalMigrationReceipt, LocalReaderSignalCache, LocalWorkspaceConflictRecord, PublishBundleRecord, PublishReceiptRecord } from '@/local-db/schema'
import type { VerifiedLongRangeThreadRecord } from '@/features/creator-decision/longRangeThreadRecall'

export type PmfResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; code?: string }

export interface CreatorDisplayPreferences {
  reduceMotion: boolean
  reduceTransparency: boolean
}

export interface CreatorAuthorizationStatus {
  authorized: boolean
  createdAt: string | null
}

export interface LocalCreatorWorkspaceSnapshot {
  drafts: PmfLocalDraft[]
  settingAssets: PmfLocalSettingAsset[]
  readerSignals: LocalReaderSignalCache[]
  creativeReminders: PmfCreativeReminder[]
  verifiedLongRangeThreads: VerifiedLongRangeThreadRecord[]
  publishBundles: PublishBundleRecord[]
  publishReceipts: PublishReceiptRecord[]
  operationRecords: AgentOperationLog[]
  migrationReceipts: LocalMigrationReceipt[]
  workspaceConflicts: LocalWorkspaceConflictRecord[]
}

export interface PmfPublishTransactionInput {
  bundleId: string
  idempotencyKey: string
  contentChecksum: string
  requestIds: string[]
  workId: string
  targetKind: 'mainline' | 'if-branch'
  branchId?: string | null
  branchTitle?: string
  hookChapterId?: string | null
  chapterTitle: string
  content: string
}

export interface PmfServerPublishReceipt {
  id: string
  schema_version: 1
  bundle_id: string
  destination: 'own-platform'
  status: 'published'
  idempotency_key: string
  content_checksum: string
  work_id: string
  branch_id: string
  chapter_id: string
  publish_event_id: string
  attempt: 1
  created_at: string
}

export interface PmfPublishTransactionResult {
  chapter: PmfChapter
  event: PmfPublishEvent
  receipt: PmfServerPublishReceipt
  replayed: boolean
}

export interface PmfCreateBranchInput {
  workId: string
  title: string
  summary?: string
  parentBranchId?: string | null
  parentChapterId?: string | null
}

export interface PmfCreativeReminderInput {
  request: PmfReaderRequest
  title?: string
  authorNote?: string
  draftId?: string
  status?: CreativeReminder['status']
}

export type PmfCreativeReminder = CreativeReminder

const authorId = 'qa-local-author'
const workId = 'work-fog-harbor'
const secondWorkId = 'work-silver-inn'
const debtWorkId = 'work-debt-mountains-rivers'
const aradWorkId = 'work-arad-wayfarer'
const mainBranchId = pmfMainBranchId(workId)
const ifBranchId = `${workId}:if:lantern-secret`
const secondMainBranchId = pmfMainBranchId(secondWorkId)
const debtMainBranchId = pmfMainBranchId(debtWorkId)
const aradMainBranchId = pmfMainBranchId(aradWorkId)
const startedAt = '2026-06-28T09:00:00.000Z'

const localDraftKey = 'parallel-universe.creator-qa.drafts'
const localSettingAssetKey = 'parallel-universe.creator-qa.setting-assets'
const localPreferencesKey = 'parallel-universe.creator-qa.preferences'

let works: PmfWork[] = [
  {
    id: workId,
    title: '雾港回声',
    summary: '一座被潮声改写名字的港城，读者正在等待灯塔支线的公开答案。',
    cover_url: null,
    status: 'published',
    author_notice: '本周优先处理灯塔支线和主线第二章。',
    updated_at: '2026-06-28T10:12:00.000Z',
  },
  {
    id: secondWorkId,
    title: '银砂旅店',
    summary: '旅店每晚只接待一位记得明天的人。',
    cover_url: null,
    status: 'published',
    author_notice: '支线请求达到 20 票后开启新章。',
    updated_at: '2026-06-27T19:30:00.000Z',
  },
  {
    id: debtWorkId,
    title: '借命山河',
    summary: '寿数被写进税契，沈砚秋追查皇族空账与百姓寿债的来源。',
    cover_url: null,
    status: 'published',
    author_notice: '当前只写皇城税契库这一场，不提前揭晓最初签署者。',
    updated_at: '2026-07-14T12:00:00.000Z',
  },
  {
    id: aradWorkId,
    title: '阿拉德异乡人',
    summary: '原创主角陆沉舟意外抵达阿拉德，从艾尔文防线出发，在不取代原有英雄的前提下寻找回家之路。',
    cover_url: null,
    status: 'draft',
    author_notice: '本地百章创作验证；候选优先，不公开发布。',
    updated_at: '2026-07-14T18:00:00.000Z',
  },
]

let branches: PmfBranch[] = [
  {
    id: mainBranchId,
    work_id: workId,
    parent_branch_id: null,
    parent_chapter_id: null,
    branch_type: 'main',
    title: '主线',
    summary: '沈星澜追查雾港灯塔熄灭的真相。',
    status: 'published',
    updated_at: '2026-06-28T10:12:00.000Z',
  },
  {
    id: ifBranchId,
    work_id: workId,
    parent_branch_id: mainBranchId,
    parent_chapter_id: 'chapter-fog-1',
    branch_type: 'if',
    title: '灯码未公开',
    summary: '如果沈星澜选择隐瞒灯码，幸存者会先抵达旧码头。',
    status: 'draft',
    updated_at: '2026-06-28T11:05:00.000Z',
  },
  {
    id: secondMainBranchId,
    work_id: secondWorkId,
    parent_branch_id: null,
    parent_chapter_id: null,
    branch_type: 'main',
    title: '主线',
    summary: '银砂旅店的住客不断改写同一张入住单。',
    status: 'published',
    updated_at: '2026-06-27T19:30:00.000Z',
  },
  {
    id: debtMainBranchId,
    work_id: debtWorkId,
    parent_branch_id: null,
    parent_chapter_id: null,
    branch_type: 'main',
    title: '主线',
    summary: '沈砚秋沿寿债账页追查皇族转嫁寿数的证据。',
    status: 'published',
    updated_at: '2026-07-14T12:00:00.000Z',
  },
  {
    id: aradMainBranchId,
    work_id: aradWorkId,
    parent_branch_id: null,
    parent_chapter_id: null,
    branch_type: 'main',
    title: '异乡冒险主线',
    summary: '陆沉舟从格兰之森边缘醒来，沿阿拉德、天界、魔界与神界的线索追查穿越原因。',
    status: 'draft',
    updated_at: '2026-07-14T18:00:00.000Z',
  },
]

let chapters: PmfChapter[] = [
  {
    id: 'chapter-fog-1',
    work_id: workId,
    branch_id: mainBranchId,
    chapter_no: 1,
    title: '潮钟之前',
    content: '潮钟响起前，灯塔管理员把最后一封信塞进铜盒。',
    status: 'published',
    published_at: '2026-06-27T13:24:00.000Z',
  },
  {
    id: 'chapter-fog-2',
    work_id: workId,
    branch_id: mainBranchId,
    chapter_no: 2,
    title: '无名灯码',
    content: '雾线从码头尽头折回，像有人把整座港城重新缝合。',
    status: 'published',
    published_at: '2026-06-28T09:40:00.000Z',
  },
  {
    id: 'chapter-inn-1',
    work_id: secondWorkId,
    branch_id: secondMainBranchId,
    chapter_no: 1,
    title: '第七间房',
    content: '银砂旅店只剩第七间房亮着灯。',
    status: 'published',
    published_at: '2026-06-27T19:30:00.000Z',
  },
  {
    id: 'chapter-debt-1',
    work_id: debtWorkId,
    branch_id: debtMainBranchId,
    chapter_no: 1,
    title: '寿债初账',
    content: '沈砚秋在户部旧档库替无名百姓销账，发现死者的寿数仍被写进一枚无主债印。债印只在皇族账册翻页时发热，他把账页边角藏进袖中。',
    status: 'published',
    published_at: '2026-07-12T20:00:00.000Z',
  },
  {
    id: 'chapter-debt-2',
    work_id: debtWorkId,
    branch_id: debtMainBranchId,
    chapter_no: 2,
    title: '皇族空栏',
    content: '第二夜，沈砚秋确认百姓被扣走的寿数正在填补皇族空栏。巡债使谢无咎将在子时前封库；沈砚秋必须带走母账，同时留下足以复核的抄本。',
    status: 'published',
    published_at: '2026-07-13T20:00:00.000Z',
  },
]

let requests: PmfReaderRequest[] = [
  {
    id: 'request-fog-if-1',
    work_id: workId,
    branch_id: ifBranchId,
    chapter_id: 'chapter-fog-1',
    request_type: 'if_branch',
    request_text: '想看沈星澜没有公开灯码时，幸存者会不会先找到旧码头。',
    status: 'acknowledged',
    vote_count: 31,
    published_chapter_id: null,
    published_branch_id: null,
    publish_event_id: null,
    created_at: '2026-06-28T08:20:00.000Z',
    updated_at: '2026-06-28T10:04:00.000Z',
  },
  {
    id: 'request-fog-next-1',
    work_id: workId,
    branch_id: mainBranchId,
    chapter_id: 'chapter-fog-2',
    request_type: 'next_chapter',
    request_text: '下一章想看潮钟为什么会提前响起，以及灯塔守夜人的选择。',
    status: 'in_progress',
    vote_count: 18,
    published_chapter_id: null,
    published_branch_id: null,
    publish_event_id: null,
    created_at: '2026-06-28T09:50:00.000Z',
    updated_at: '2026-06-28T11:00:00.000Z',
  },
  {
    id: 'request-inn-next-1',
    work_id: secondWorkId,
    branch_id: secondMainBranchId,
    chapter_id: 'chapter-inn-1',
    request_type: 'next_chapter',
    request_text: '想看旅店老板为什么知道每个住客明天会忘记什么。',
    status: 'pending',
    vote_count: 12,
    published_chapter_id: null,
    published_branch_id: null,
    publish_event_id: null,
    created_at: '2026-06-28T07:40:00.000Z',
    updated_at: '2026-06-28T07:40:00.000Z',
  },
  {
    id: 'request-fog-published-1',
    work_id: workId,
    branch_id: mainBranchId,
    chapter_id: 'chapter-fog-1',
    request_type: 'continue_branch',
    request_text: '想看上一段灯塔守夜人的后续。',
    status: 'published',
    vote_count: 9,
    published_chapter_id: 'chapter-fog-2',
    published_branch_id: mainBranchId,
    publish_event_id: 'event-fog-2',
    created_at: '2026-06-27T15:22:00.000Z',
    updated_at: '2026-06-28T09:40:00.000Z',
  },
  {
    id: 'request-debt-next-1',
    work_id: debtWorkId,
    branch_id: debtMainBranchId,
    chapter_id: 'chapter-debt-2',
    request_type: 'next_chapter',
    request_text: '想看沈砚秋如何在谢无咎封库前带走母账，又不让巡债使拿到百姓的寿数名单。',
    status: 'in_progress',
    vote_count: 24,
    published_chapter_id: null,
    published_branch_id: null,
    publish_event_id: null,
    created_at: '2026-07-14T08:10:00.000Z',
    updated_at: '2026-07-14T11:50:00.000Z',
  },
]

let creativeReminders: PmfCreativeReminder[] = []

const qaPublishBundles: PublishBundleRecord[] = []
const qaPublishReceipts: PublishReceiptRecord[] = []
const qaOperationRecords: AgentOperationLog[] = [
  {
    id: 'qa-operation-complete-next-beat',
    operationId: 'qa-operation-complete-next-beat',
    actionName: 'complete_next_beat',
    route: '/creator/editor',
    targetId: 'local-draft-qa-if-1',
    status: 'succeeded',
    risk: 'medium',
    createdAt: '2026-06-28T11:45:00.000Z',
    finishedAt: '2026-06-28T11:45:02.000Z',
    messageCode: 'candidate_ready',
  },
]

let publishEvents: PmfPublishEvent[] = [
  {
    id: 'event-fog-2',
    reader_request_id: 'request-fog-published-1',
    work_id: workId,
    branch_id: mainBranchId,
    published_chapter_id: 'chapter-fog-2',
    published_branch_id: mainBranchId,
    local_draft_ref: 'local-draft-qa-fog-2',
    event_type: 'chapter_published',
    created_at: '2026-06-28T09:40:00.000Z',
  },
]
const qaPublishedByIdempotency = new Map<string, PmfPublishTransactionResult>()

const defaultDrafts: PmfLocalDraft[] = [
  {
    localDraftRef: 'local-draft-qa-if-1',
    requestId: 'request-fog-if-1',
    workId,
    branchId: ifBranchId,
    title: '灯码未公开',
    content: [
      '沈星澜把灯码压在掌心时，潮声忽然停了。',
      '旧码头那边没有钟声，只有一盏没人点燃的蓝灯，像在等她承认某个更早的选择。',
      '她没有把灯码交给巡夜人，而是先走向雾里。读者等待的支线，将从这个决定开始分叉。',
    ].join('\n\n'),
    updatedAt: '2026-06-28T11:24:00.000Z',
  },
]

const defaultSettingAssets: PmfLocalSettingAsset[] = [
  {
    localAssetRef: 'local-setting-qa-character-1',
    workId,
    branchId: ifBranchId,
    kind: 'character',
    stage: 'memory',
    title: '沈星澜',
    summary: '年轻守塔人，隐瞒灯码会改变她和幸存者的信任关系。',
    detail: '她最怕把无辜的人推上海岸，但也知道灯码一旦公开会让更多人被卷入。',
    tags: ['守塔人', '选择代价'],
    updatedAt: '2026-06-28T11:40:00.000Z',
  },
  {
    localAssetRef: 'local-setting-qa-location-1',
    workId,
    branchId: ifBranchId,
    kind: 'location',
    stage: 'scene',
    title: '旧码头',
    summary: '灯码未公开时，幸存者会先抵达的支线地点。',
    detail: '潮水退去后才露出蓝灯，适合承接读者想看的 IF 支线。',
    tags: ['支线地点', '蓝灯'],
    updatedAt: '2026-06-28T11:42:00.000Z',
  },
]

function ok<T>(data: T): PmfResult<T> {
  return { ok: true, data }
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function ensureDrafts() {
  const drafts = readJson<PmfLocalDraft[] | null>(localDraftKey, null)
  if (drafts) return drafts
  writeJson(localDraftKey, defaultDrafts)
  return defaultDrafts
}

function ensureSettingAssets() {
  const assets = readJson<PmfLocalSettingAsset[] | null>(localSettingAssetKey, null)
  if (assets) return assets
  writeJson(localSettingAssetKey, defaultSettingAssets)
  return defaultSettingAssets
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function isLocalCreatorHost() {
  return true
}

export function createLocalDraftRef() {
  return newId('local-draft-qa')
}

export function readLocalDrafts(): PmfLocalDraft[] {
  return ensureDrafts()
}

export function upsertLocalDraft(draft: PmfLocalDraft) {
  const drafts = readLocalDrafts()
  writeJson(localDraftKey, [draft, ...drafts.filter(item => item.localDraftRef !== draft.localDraftRef)].slice(0, 50))
}

function reminderTypeForRequest(type: PmfRequestType): CreativeReminder['type'] {
  if (type === 'if_branch' || type === 'continue_branch') return 'branch_seed'
  return 'reader_desire'
}

function reminderTitleForRequest(type: PmfRequestType) {
  if (type === 'if_branch') return '支线火花'
  if (type === 'continue_branch') return '继续这条线'
  return '下一章愿望'
}

function reminderNoteForRequest(request: PmfReaderRequest) {
  const text = request.request_text.trim() || '读者想继续看这一段。'
  if (request.request_type === 'if_branch') return `把这条回声转成支线代价：${text}`
  if (request.request_type === 'continue_branch') return `继续处理这条线的读者期待：${text}`
  return `把读者想看的变化落成下一场戏：${text}`
}

export function readLocalCreativeReminders(filterWorkId?: string): PmfCreativeReminder[] {
  return filterWorkId ? creativeReminders.filter(reminder => reminder.workId === filterWorkId) : [...creativeReminders]
}

export function readLocalWorkspaceSnapshot(): LocalCreatorWorkspaceSnapshot {
  return {
    drafts: readLocalDrafts(),
    settingAssets: readLocalSettingAssets(),
    readerSignals: [],
    creativeReminders: readLocalCreativeReminders(),
    verifiedLongRangeThreads: [],
    publishBundles: qaPublishBundles,
    publishReceipts: qaPublishReceipts,
    operationRecords: qaOperationRecords,
    migrationReceipts: [],
    workspaceConflicts: [],
  }
}

export function upsertLocalCreativeReminder(input: PmfCreativeReminderInput): PmfCreativeReminder {
  const existing = creativeReminders.find(reminder =>
    reminder.id === `creative-reminder:request:${input.request.id}`
    || reminder.sourceSignalIds.includes(input.request.id),
  )
  const now = new Date().toISOString()
  const next: PmfCreativeReminder = {
    id: existing?.id || `creative-reminder:request:${input.request.id}`,
    workId: input.request.work_id,
    sourceSignalIds: [input.request.id],
    draftId: input.draftId || existing?.draftId,
    chapterId: input.request.chapter_id || existing?.chapterId,
    type: existing?.type || reminderTypeForRequest(input.request.request_type),
    title: input.title?.trim() || existing?.title || reminderTitleForRequest(input.request.request_type),
    authorNote: input.authorNote?.trim() || existing?.authorNote || reminderNoteForRequest(input.request),
    status: input.status || existing?.status || 'pinned',
    createdBy: existing?.createdBy || 'author',
    localOnly: true,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }
  creativeReminders = [next, ...creativeReminders.filter(reminder => reminder.id !== next.id)]
  return next
}

export function createLocalSettingAssetRef() {
  return newId('local-setting-qa')
}

export interface PmfLocalSettingAssetInput {
  workId: string
  branchId?: string | null
  kind: PmfLocalSettingAssetKind
  stage: PmfLocalSettingAssetStage
  title: string
  summary: string
  detail?: string
  tags?: string[]
}

export function readLocalSettingAssets(filterWorkId?: string): PmfLocalSettingAsset[] {
  const assets = ensureSettingAssets()
  return filterWorkId ? assets.filter(asset => asset.workId === filterWorkId) : assets
}

export function upsertLocalSettingAsset(input: PmfLocalSettingAssetInput): PmfLocalSettingAsset {
  const assets = readLocalSettingAssets()
  const normalizedTitle = input.title.trim() || '未命名设定'
  const normalizedSummary = input.summary.trim() || '待作者继续补充。'
  const existing = assets.find(asset =>
    asset.workId === input.workId
    && asset.branchId === (input.branchId || null)
    && asset.kind === input.kind
    && asset.title === normalizedTitle,
  )
  const next: PmfLocalSettingAsset = {
    localAssetRef: existing?.localAssetRef || createLocalSettingAssetRef(),
    workId: input.workId,
    branchId: input.branchId || null,
    kind: input.kind,
    stage: input.stage,
    title: normalizedTitle,
    summary: normalizedSummary,
    detail: input.detail?.trim() || normalizedSummary,
    tags: input.tags?.filter(Boolean).slice(0, 8) || [],
    updatedAt: new Date().toISOString(),
  }
  writeJson(localSettingAssetKey, [next, ...assets.filter(asset => asset.localAssetRef !== next.localAssetRef)].slice(0, 120))
  return next
}

export function readCreatorDisplayPreferences(): CreatorDisplayPreferences {
  return readJson<CreatorDisplayPreferences>(localPreferencesKey, {
    reduceMotion: false,
    reduceTransparency: false,
  })
}

export function writeCreatorDisplayPreferences(preferences: CreatorDisplayPreferences) {
  writeJson(localPreferencesKey, preferences)
}

export async function getPmfSession() {
  return {
    user: {
      id: authorId,
      email: 'author@example.test',
    },
  }
}

export async function sendCreatorMagicLink(email: string): Promise<PmfResult<{ email: string }>> {
  return ok({ email })
}

export async function signOutPmf(): Promise<void> {
  return
}

export async function upsertCreatorProfile(): Promise<PmfResult<{ userId: string }>> {
  return ok({ userId: authorId })
}

export async function syncCreatorClient(): Promise<PmfResult<PmfCreatorClient>> {
  return ok({
    id: 'creator-client-qa-local',
    creator_id: authorId,
    client_label: '本地创作端',
    app_mode: 'local',
    version: 'qa-local',
    online_status: 'online',
    last_seen_at: startedAt,
    last_sync_at: startedAt,
  })
}

export async function getCreatorAuthorizationStatus(): Promise<PmfResult<CreatorAuthorizationStatus>> {
  return ok({
    authorized: true,
    createdAt: '2026-06-26T12:00:00.000Z',
  })
}

export async function listCreatorRequests(): Promise<PmfResult<PmfReaderRequest[]>> {
  return ok([...requests])
}

export async function listCreatorEchoSourceBatches(
  currentRequests: PmfReaderRequest[] = requests,
  currentSources: import('@/local-db/schema').ReaderSignalSourceSyncState[] = [],
): Promise<PmfResult<ReaderSignalSourceBatch[]>> {
  void currentSources
  const fetchedAt = new Date().toISOString()
  const known = readerSignalBatchesFromRequests(currentRequests, fetchedAt)
  return ok([
    ...known,
    {
      source: 'comment',
      cursor: 'qa-comment-3',
      fetchedAt,
      status: 'fresh',
      completeSnapshot: true,
      records: [
        {
          source: 'comment',
          id: 'comment-fog-motive-1',
          workId: 'work-fog-harbor',
          branchId: 'branch-fog-main',
          chapterId: 'chapter-fog-07',
          text: '她为什么在这里突然相信守灯人？',
          category: 'confusion',
          visibility: 'visible',
          createdAt: '2026-06-28T16:10:00.000Z',
        },
        {
          source: 'comment',
          id: 'comment-fog-duplicate-1',
          workId: 'work-fog-harbor',
          branchId: 'branch-fog-main',
          chapterId: 'chapter-fog-07',
          text: '想看妹妹先发现真相。',
          category: 'comment',
          visibility: 'visible',
          createdAt: '2026-06-28T16:12:00.000Z',
        },
      ],
    },
    {
      source: 'highlight',
      cursor: 'qa-highlight-1',
      fetchedAt,
      status: 'fresh',
      completeSnapshot: true,
      records: [{
        source: 'highlight',
        id: 'highlight-fog-1',
        workId: 'work-fog-harbor',
        branchId: 'branch-fog-main',
        chapterId: 'chapter-fog-07',
        text: '她终于意识到，自己不是被抛弃，而是被保存。',
        anchorText: '她终于意识到',
        highlightCount: 18,
        visibility: 'visible',
        createdAt: '2026-06-28T17:00:00.000Z',
      }],
    },
    {
      source: 'reaction',
      cursor: 'qa-reaction-1',
      fetchedAt,
      status: 'fresh',
      completeSnapshot: true,
      records: [{
        source: 'reaction',
        id: 'reaction-fog-1',
        workId: 'work-fog-harbor',
        branchId: 'branch-fog-main',
        chapterId: 'chapter-fog-07',
        text: '这一幕让我很想继续看。',
        reaction: 'want_more',
        count: 9,
        visibility: 'visible',
        createdAt: '2026-06-28T17:10:00.000Z',
      }],
    },
    {
      source: 'question',
      cursor: 'qa-question-1',
      fetchedAt,
      status: 'fresh',
      completeSnapshot: true,
      records: [{
        source: 'question',
        id: 'question-fog-1',
        workId: 'work-fog-harbor',
        branchId: 'branch-fog-main',
        chapterId: 'chapter-fog-07',
        text: '妹妹知道这条规则会付出什么代价？',
        category: 'character',
        visibility: 'visible',
        createdAt: '2026-06-28T17:20:00.000Z',
      }],
    },
  ])
}

export async function listCreatorFeatureFlags(): Promise<PmfResult<PmfFeatureFlag[]>> {
  return ok([
    {
      key: 'creator_app_enabled',
      enabled: true,
      description: '作者可以处理读者请求。',
      updated_at: startedAt,
    },
    {
      key: 'reader_requests_enabled',
      enabled: true,
      description: '读者可以提交想看的方向。',
      updated_at: startedAt,
    },
    {
      key: 'reader_echo_enabled',
      enabled: true,
      description: '读者可以留下公开回声。',
      updated_at: startedAt,
    },
    {
      key: 'cloud_ai_runtime_enabled',
      enabled: false,
      description: '平台创作服务未开启。',
      updated_at: startedAt,
    },
  ])
}

export async function listCreatorWorks(): Promise<PmfResult<PmfWork[]>> {
  return ok([...works])
}

export async function listCreatorBranches(): Promise<PmfResult<PmfBranch[]>> {
  return ok([...branches])
}

export async function listCreatorChapters(): Promise<PmfResult<PmfChapter[]>> {
  return ok([...chapters])
}

export async function listCreatorPublishEvents(): Promise<PmfResult<PmfPublishEvent[]>> {
  return ok([...publishEvents])
}

export async function updateReaderRequestStatus(
  id: string,
  status: Exclude<PmfRequestStatus, 'pending'>,
): Promise<PmfResult<PmfReaderRequest>> {
  const current = requests.find(request => request.id === id)
  if (!current) return { ok: false, message: '请求不存在。', code: 'request_missing' }
  const next = {
    ...current,
    status,
    updated_at: new Date().toISOString(),
  }
  requests = requests.map(request => request.id === id ? next : request)
  return ok(next)
}

export async function updateCreatorWorkNotice(workId: string, authorNotice: string): Promise<PmfResult<PmfWork>> {
  const current = works.find(work => work.id === workId)
  if (!current) return { ok: false, message: '作品不存在。', code: 'work_missing' }
  const next = {
    ...current,
    author_notice: authorNotice,
    updated_at: new Date().toISOString(),
  }
  works = works.map(work => work.id === workId ? next : work)
  return ok(next)
}

export async function updateCreatorWorkStatus(workId: string, status: PmfWork['status']): Promise<PmfResult<PmfWork>> {
  const current = works.find(work => work.id === workId)
  if (!current) return { ok: false, message: '作品不存在。', code: 'work_missing' }
  const next = {
    ...current,
    status,
    updated_at: new Date().toISOString(),
  }
  works = works.map(work => work.id === workId ? next : work)
  return ok(next)
}

export async function createCreatorIfBranch(input: PmfCreateBranchInput): Promise<PmfResult<PmfBranch>> {
  const title = input.title.trim()
  if (!title) return { ok: false, message: '请先填写支线标题。', code: 'branch_title_missing' }
  const branch: PmfBranch = {
    id: `${input.workId}:if:${newId('qa-branch')}`,
    work_id: input.workId,
    parent_branch_id: input.parentBranchId || pmfMainBranchId(input.workId),
    parent_chapter_id: input.parentChapterId || null,
    branch_type: 'if',
    title,
    summary: input.summary?.trim() || null,
    status: 'draft',
    updated_at: new Date().toISOString(),
  }
  branches = [branch, ...branches]
  return ok(branch)
}

export async function updateCreatorBranchStatus(
  branchId: string,
  status: PmfBranch['status'],
): Promise<PmfResult<PmfBranch>> {
  const current = branches.find(branch => branch.id === branchId)
  if (!current) return { ok: false, message: '支线不存在。', code: 'branch_missing' }
  const next = {
    ...current,
    status,
    updated_at: new Date().toISOString(),
  }
  branches = branches.map(branch => branch.id === branchId ? next : branch)
  return ok(next)
}

export async function publishBundleTransaction(
  input: PmfPublishTransactionInput,
): Promise<PmfResult<PmfPublishTransactionResult>> {
  const existing = qaPublishedByIdempotency.get(input.idempotencyKey)
  if (existing) return ok({ ...existing, replayed: true })
  const branchId = input.targetKind === 'mainline'
    ? pmfMainBranchId(input.workId)
    : input.branchId || `${input.workId}:if:qa`
  const existingBranch = branches.find(branch => branch.id === branchId)
  const branch: PmfBranch = existingBranch || {
    id: branchId,
    work_id: input.workId,
    parent_branch_id: pmfMainBranchId(input.workId),
    parent_chapter_id: input.hookChapterId || null,
    branch_type: input.targetKind === 'mainline' ? 'main' : 'if',
    title: input.branchTitle || (input.targetKind === 'mainline' ? '主线' : '读者支线'),
    summary: '由作者确认后公开。',
    status: 'published',
    updated_at: new Date().toISOString(),
  }
  branches = [branch, ...branches.filter(item => item.id !== branch.id)]
  const nextChapterNo = Math.max(0, ...chapters.filter(chapter => chapter.branch_id === branchId).map(chapter => chapter.chapter_no)) + 1
  const chapter: PmfChapter = {
    id: newId('chapter-qa'),
    work_id: input.workId,
    branch_id: branchId,
    chapter_no: nextChapterNo,
    title: input.chapterTitle.trim() || `第 ${nextChapterNo} 章`,
    content: input.content.trim(),
    status: 'published',
    published_at: new Date().toISOString(),
  }
  const event: PmfPublishEvent = {
    id: newId('event-qa'),
    reader_request_id: input.requestIds[0] || null,
    work_id: input.workId,
    branch_id: branchId,
    published_chapter_id: chapter.id,
    published_branch_id: branchId,
    local_draft_ref: null,
    event_type: input.targetKind === 'mainline' ? 'chapter_published' : 'branch_published',
    created_at: new Date().toISOString(),
  }
  const receipt: PmfServerPublishReceipt = {
    id: newId('receipt-qa'),
    schema_version: 1,
    bundle_id: input.bundleId,
    destination: 'own-platform',
    status: 'published',
    idempotency_key: input.idempotencyKey,
    content_checksum: input.contentChecksum,
    work_id: input.workId,
    branch_id: branchId,
    chapter_id: chapter.id,
    publish_event_id: event.id,
    attempt: 1,
    created_at: event.created_at,
  }
  chapters = [chapter, ...chapters]
  publishEvents = [event, ...publishEvents]
  if (input.requestIds.length) {
    requests = requests.map(request => input.requestIds.includes(request.id)
      ? {
          ...request,
          status: 'published',
          published_chapter_id: chapter.id,
          published_branch_id: branchId,
          publish_event_id: event.id,
          updated_at: event.created_at,
        }
      : request)
  }
  const result = { chapter, event, receipt, replayed: false }
  qaPublishedByIdempotency.set(input.idempotencyKey, result)
  return ok(result)
}

export function requestTypeLabel(type: PmfRequestType) {
  if (type === 'if_branch') return '请求 IF 支线'
  if (type === 'continue_branch') return '请求继续这条支线'
  return '请求下一章'
}

export function requestStatusLabel(status: PmfRequestStatus) {
  if (status === 'acknowledged') return '作者已看到'
  if (status === 'in_progress') return '作者处理中'
  if (status === 'published') return '已发布'
  if (status === 'rejected') return '暂不处理'
  return '已收到'
}
