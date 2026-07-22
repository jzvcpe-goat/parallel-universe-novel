import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase'
import {
  getLocalCreatorClientId as getLocalSettingsCreatorClientId,
} from '@/local-db/creatorLocalSettingsRepository'
import type {
  PmfBranch,
  PmfChapter,
  PmfCreatorClient,
  PmfFeatureFlag,
  PmfPublishEvent,
  PmfReaderRequest,
  PmfRequestStatus,
  PmfRequestType,
  PmfWork,
} from '@/features/pmf/types'
import { pmfMainBranchId } from '@/features/pmf/types'
import { readerSignalBatchesFromRequests } from '@/features/creator-pivot/externalEchoAdapters'
import type { ReaderSignalSourceBatch } from '@/features/creator-pivot/externalEchoContracts'
import {
  cloudExternalEchoBatch,
  decodeExternalEchoCloudCursor,
  unavailableCloudExternalEchoBatch,
  type CloudExternalEchoRow,
  type CloudExternalEchoSource,
} from '@/features/creator-pivot/externalEchoCloudProjection'
import type { ReaderSignalSourceSyncState } from '@/local-db/schema'

export type PmfResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; code?: string }

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

export interface CreatorAuthorizationStatus {
  authorized: boolean
  createdAt: string | null
}

function clientUnavailable<T>(): PmfResult<T> {
  return {
    ok: false,
    message: '作品记录暂时不可用，请稍后再试。',
    code: 'supabase_unconfigured',
  }
}

function errorResult<T>(error: unknown, fallback: string): PmfResult<T> {
  const maybeError = error as { message?: string; code?: string }
  return {
    ok: false,
    message: maybeError?.message || fallback,
    code: maybeError?.code,
  }
}

function randomId(prefix: string) {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}:${id}`
}

function getLocalCreatorClientId() {
  return getLocalSettingsCreatorClientId()
}

export async function getPmfSession() {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function sendCreatorMagicLink(email: string): Promise<PmfResult<{ email: string }>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return clientUnavailable()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })
  if (error) return errorResult(error, '登录链接发送失败。')
  return { ok: true, data: { email } }
}

export async function signOutPmf(): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function upsertCreatorProfile(displayName: string): Promise<PmfResult<{ userId: string }>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return clientUnavailable()
  const { data, error } = await supabase.auth.getUser()
  if (error) return errorResult(error, '作者身份读取失败。')
  const userId = data.user?.id
  if (!userId) return { ok: false, message: '请先登录本地创作端。', code: 'creator_session_missing' }
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    role: 'creator',
    display_name: displayName || data.user.email || '本地作者',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
  if (profileError) return errorResult(profileError, '作者资料保存失败。')
  return { ok: true, data: { userId } }
}

export async function syncCreatorClient(clientLabel = 'Creator App'): Promise<PmfResult<PmfCreatorClient>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return clientUnavailable()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) return errorResult(userError, '作者身份读取失败。')
  const creatorId = userData.user?.id
  if (!creatorId) return { ok: false, message: '请先登录本地创作端。', code: 'creator_session_missing' }

  const now = new Date().toISOString()
  const { data, error } = await supabase.from('creator_clients')
    .upsert({
      id: getLocalCreatorClientId(),
      creator_id: creatorId,
      client_label: clientLabel,
      app_mode: 'local',
      version: import.meta.env.VITE_APP_VERSION || 'local-v1',
      online_status: 'online',
      last_seen_at: now,
      last_sync_at: now,
    }, { onConflict: 'id' })
    .select('id,creator_id,client_label,app_mode,version,online_status,last_seen_at,last_sync_at')
    .single()

  if (error) return errorResult(error, '本机状态保存失败。')
  return { ok: true, data: data as PmfCreatorClient }
}

export async function getCreatorAuthorizationStatus(): Promise<PmfResult<CreatorAuthorizationStatus>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return clientUnavailable()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) return errorResult(userError, '作者身份读取失败。')
  const userId = userData.user?.id
  if (!userId) return { ok: false, message: '请先登录本地创作端。', code: 'creator_session_missing' }

  const { data, error } = await supabase.from('creator_authorizations')
    .select('user_id,created_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return errorResult(error, '作者权限读取失败。')
  return {
    ok: true,
    data: {
      authorized: Boolean(data?.user_id),
      createdAt: data?.created_at || null,
    },
  }
}

export async function listCreatorRequests(): Promise<PmfResult<PmfReaderRequest[]>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return clientUnavailable()
  const heartbeat = await syncCreatorClient()
  if (!heartbeat.ok) return heartbeat
  const { data, error } = await supabase.from('reader_requests')
    .select('id,work_id,branch_id,chapter_id,request_type,request_text,status,vote_count,published_chapter_id,published_branch_id,publish_event_id,created_at,updated_at')
    .order('vote_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return errorResult(error, '外界回声读取失败。')
  return { ok: true, data: (data || []) as PmfReaderRequest[] }
}

export async function listCreatorEchoSourceBatches(
  currentRequests?: PmfReaderRequest[],
  currentSources: ReaderSignalSourceSyncState[] = [],
): Promise<PmfResult<ReaderSignalSourceBatch[]>> {
  const requestResult = currentRequests
    ? { ok: true as const, data: currentRequests }
    : await listCreatorRequests()
  if (!requestResult.ok) return requestResult

  const requestBatches = readerSignalBatchesFromRequests(requestResult.data)
  const supabase = getSupabaseBrowserClient()
  if (!supabase || !isSupabaseConfigured) return { ok: true, data: requestBatches }

  const fetchedAt = new Date().toISOString()
  const sourceCursor = new Map(currentSources.map(source => [source.source, source.cursor]))
  const sources: CloudExternalEchoSource[] = ['comment', 'highlight', 'reaction', 'question']
  const cloudBatches = await Promise.all(sources.map(async source => {
    const previousCursor = sourceCursor.get(source) || null
    const cursor = decodeExternalEchoCloudCursor(previousCursor)
    const { data, error } = await supabase.rpc('list_creator_reader_signals', {
      p_source: source,
      p_after_updated_at: cursor?.updatedAt || null,
      p_after_id: cursor?.id || '',
      p_work_id: null,
      p_limit: 500,
    })
    if (error) {
      return unavailableCloudExternalEchoBatch(
        source,
        fetchedAt,
        previousCursor,
        error.code || 'reader_signal_source_unavailable',
      )
    }
    return cloudExternalEchoBatch(
      source,
      (data || []) as CloudExternalEchoRow[],
      fetchedAt,
      previousCursor,
    )
  }))

  return { ok: true, data: [...requestBatches, ...cloudBatches] }
}

export async function listCreatorFeatureFlags(): Promise<PmfResult<PmfFeatureFlag[]>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return clientUnavailable()
  const { data, error } = await supabase.from('feature_flags')
    .select('key,enabled,description,updated_at')
    .in('key', ['reader_requests_enabled', 'reader_echo_enabled', 'creator_app_enabled', 'cloud_ai_runtime_enabled'])
    .order('key', { ascending: true })

  if (error) return errorResult(error, '创作开关读取失败。')
  return { ok: true, data: (data || []) as PmfFeatureFlag[] }
}

export async function listCreatorWorks(): Promise<PmfResult<PmfWork[]>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return clientUnavailable()
  const { data, error } = await supabase.from('works')
    .select('id,title,summary,cover_url,status,author_notice,updated_at')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(50)

  if (error) return errorResult(error, '作品记录读取失败。')
  return { ok: true, data: (data || []) as PmfWork[] }
}

export async function listCreatorBranches(): Promise<PmfResult<PmfBranch[]>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return clientUnavailable()
  const { data, error } = await supabase.from('branches')
    .select('id,work_id,parent_branch_id,parent_chapter_id,branch_type,title,summary,status,updated_at')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(100)

  if (error) return errorResult(error, '支线记录读取失败。')
  return { ok: true, data: (data || []) as PmfBranch[] }
}

export async function updateCreatorWorkNotice(workId: string, authorNotice: string): Promise<PmfResult<PmfWork>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return clientUnavailable()
  const { data, error } = await supabase.from('works')
    .update({
      author_notice: authorNotice.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workId)
    .select('id,title,summary,cover_url,status,author_notice,updated_at')
    .single()

  if (error) return errorResult(error, '作者公告保存失败。')
  return { ok: true, data: data as PmfWork }
}

export async function updateCreatorWorkStatus(workId: string, status: PmfWork['status']): Promise<PmfResult<PmfWork>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return clientUnavailable()
  const { data, error } = await supabase.from('works')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workId)
    .select('id,title,summary,cover_url,status,author_notice,updated_at')
    .single()

  if (error) return errorResult(error, '作品状态保存失败。')
  return { ok: true, data: data as PmfWork }
}

export async function createCreatorIfBranch(input: PmfCreateBranchInput): Promise<PmfResult<PmfBranch>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return clientUnavailable()
  const title = input.title.trim()
  if (!title) return { ok: false, message: '请先填写支线标题。', code: 'branch_title_missing' }
  const suffix = randomId('branch').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 22)
  const branchId = `${input.workId}:if:${suffix}`
  const { data, error } = await supabase.from('branches')
    .insert({
      id: branchId,
      work_id: input.workId,
      parent_branch_id: input.parentBranchId || pmfMainBranchId(input.workId),
      parent_chapter_id: input.parentChapterId || null,
      branch_type: 'if',
      title,
      summary: input.summary?.trim() || null,
      status: 'draft',
      updated_at: new Date().toISOString(),
    })
    .select('id,work_id,parent_branch_id,parent_chapter_id,branch_type,title,summary,status,updated_at')
    .single()

  if (error) return errorResult(error, '新支线创建失败。')
  return { ok: true, data: data as PmfBranch }
}

export async function updateCreatorBranchStatus(branchId: string, status: PmfBranch['status']): Promise<PmfResult<PmfBranch>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return clientUnavailable()
  const { data, error } = await supabase.from('branches')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', branchId)
    .select('id,work_id,parent_branch_id,parent_chapter_id,branch_type,title,summary,status,updated_at')
    .single()

  if (error) return errorResult(error, '支线状态保存失败。')
  return { ok: true, data: data as PmfBranch }
}

export async function listCreatorChapters(): Promise<PmfResult<PmfChapter[]>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return clientUnavailable()
  const { data, error } = await supabase.from('chapters')
    .select('id,work_id,branch_id,chapter_no,title,content,status,published_at')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(100)

  if (error) return errorResult(error, '章节记录读取失败。')
  return { ok: true, data: (data || []) as PmfChapter[] }
}

export async function listCreatorPublishEvents(): Promise<PmfResult<PmfPublishEvent[]>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return clientUnavailable()
  const { data, error } = await supabase.from('publish_events')
    .select('id,reader_request_id,work_id,branch_id,published_chapter_id,published_branch_id,local_draft_ref,event_type,created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return errorResult(error, '发布记录读取失败。')
  return { ok: true, data: (data || []) as PmfPublishEvent[] }
}

export async function updateReaderRequestStatus(id: string, status: Exclude<PmfRequestStatus, 'pending'>): Promise<PmfResult<PmfReaderRequest>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return clientUnavailable()
  const { data, error } = await supabase.from('reader_requests')
    .update({
      status,
      handled_by: (await supabase.auth.getUser()).data.user?.id,
      creator_client_id: getLocalCreatorClientId(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id,work_id,branch_id,chapter_id,request_type,request_text,status,vote_count,published_chapter_id,published_branch_id,publish_event_id,created_at,updated_at')
    .single()

  if (error) return errorResult(error, '请求状态更新失败。')
  return { ok: true, data: data as PmfReaderRequest }
}

const publishTransactionMessages: Record<string, string> = {
  publish_session_required: '请先登录本地创作端。',
  publish_anonymous_forbidden: '当前身份不能发布作品，请使用已授权的作者账号。',
  publish_authorization_required: '当前账号尚未获得作品发布权限。',
  publish_work_forbidden: '当前账号不能向这个作品发布内容。',
  publish_bundle_invalid: '发布包记录不完整，请重新确认后再试。',
  publish_idempotency_invalid: '发布包校验未通过，请重新生成发布包。',
  publish_checksum_invalid: '正文校验未通过，请重新生成发布包。',
  publish_checksum_mismatch: '正文与已确认的发布包不一致，请重新确认。',
  publish_chapter_title_invalid: '请填写有效的章节标题。',
  publish_content_invalid: '请填写正文后再发布。',
  publish_target_invalid: '发布去向不完整，请重新选择。',
  publish_mainline_target_invalid: '主线发布去向不一致，请重新确认。',
  publish_mainline_hook_forbidden: '主线章节不能设置支线挂点。',
  publish_if_branch_target_invalid: '请为 IF 支线选择有效的发布去向。',
  publish_if_branch_title_invalid: '请填写 IF 支线标题。',
  publish_request_ids_invalid: '关联的读者回声无效，请刷新后再试。',
  publish_request_ids_duplicate: '关联的读者回声存在重复，请刷新后再试。',
  publish_idempotency_conflict: '这个发布包与已有发布记录不一致，请停止重试并核对记录。',
  publish_hook_chapter_invalid: '支线挂点已变化，请重新选择。',
  publish_linked_request_invalid: '关联的读者回声已变化，请刷新后再发布。',
  publish_creator_client_invalid: '本机创作端状态已变化，请重新进入后再发布。',
  publish_branch_conflict: '目标支线已变化，请刷新作品结构后再发布。',
  publish_branch_hook_conflict: '支线挂点与当前作品结构不一致，请重新确认。',
}

function publishTransactionError<T>(error: unknown): PmfResult<T> {
  const maybeError = error as { message?: string; code?: string }
  const serverCode = maybeError?.message?.trim() || 'publish_transaction_failed'
  return {
    ok: false,
    code: serverCode,
    message: publishTransactionMessages[serverCode] || '发布未完成，正文仍保存在本机。',
  }
}

function isPublishTransactionResult(value: unknown): value is {
  chapter: PmfChapter
  event: PmfPublishEvent
  receipt: PmfServerPublishReceipt
  replayed: boolean
} {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  const chapter = candidate.chapter as Record<string, unknown> | undefined
  const event = candidate.event as Record<string, unknown> | undefined
  const receipt = candidate.receipt as Record<string, unknown> | undefined
  return candidate.status === 'published'
    && typeof candidate.replayed === 'boolean'
    && typeof chapter?.id === 'string'
    && typeof event?.id === 'string'
    && typeof receipt?.id === 'string'
    && receipt.status === 'published'
    && receipt.destination === 'own-platform'
}

export async function publishBundleTransaction(
  input: PmfPublishTransactionInput,
): Promise<PmfResult<PmfPublishTransactionResult>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return clientUnavailable()
  const { data, error } = await supabase.rpc('publish_bundle_transaction', {
    p_bundle_id: input.bundleId,
    p_idempotency_key: input.idempotencyKey,
    p_content_checksum: input.contentChecksum,
    p_work_id: input.workId,
    p_target_kind: input.targetKind,
    p_chapter_title: input.chapterTitle,
    p_content: input.content,
    p_branch_id: input.branchId || null,
    p_branch_title: input.branchTitle || null,
    p_hook_chapter_id: input.hookChapterId || null,
    p_reader_request_ids: input.requestIds,
    p_creator_client_id: getLocalCreatorClientId(),
  })
  if (error) return publishTransactionError(error)
  if (!isPublishTransactionResult(data)) {
    return {
      ok: false,
      code: 'publish_receipt_invalid',
      message: '发布结果无法确认，正文仍保存在本机，请先核对阅读端。',
    }
  }
  return {
    ok: true,
    data: {
      chapter: data.chapter,
      event: data.event,
      receipt: data.receipt,
      replayed: data.replayed,
    },
  }
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
