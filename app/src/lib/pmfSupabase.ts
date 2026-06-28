import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase'
import type {
  PmfChapter,
  PmfCreatorClient,
  PmfLocalDraft,
  PmfPublishEvent,
  PmfReaderRequest,
  PmfRequestStatus,
  PmfRequestType,
  PmfWork,
} from '@/features/pmf/types'
import { pmfMainBranchId } from '@/features/pmf/types'

const LOCAL_CREATOR_CLIENT_KEY = 'parallel-universe.local-creator.client-id'
const LOCAL_DRAFT_KEY = 'parallel-universe.local-creator.drafts'
const LOCAL_AI_SETTINGS_KEY = 'parallel-universe.local-creator.ai-settings'

export type PmfResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; code?: string }

export interface PmfStarterWorkInput {
  id: string
  title: string
  summary: string
  coverUrl?: string
  authorNotice?: string
}

export interface PmfReaderRequestInput {
  workId: string
  branchId?: string | null
  chapterId?: string | null
  requestType: PmfRequestType
  requestText: string
}

export interface PmfPublishInput {
  requestId?: string | null
  workId: string
  branchId?: string | null
  branchTitle?: string
  chapterTitle: string
  content: string
  localDraftRef: string
}

export interface LocalAiSettings {
  provider: 'manual' | 'local_endpoint' | 'openai_compatible'
  baseUrl: string
  model: string
  hasKey: boolean
}

function clientUnavailable<T>(): PmfResult<T> {
  return {
    ok: false,
    message: '同步服务暂未开启，请稍后再试。',
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

export function isLocalCreatorHost() {
  if (typeof window === 'undefined') return false
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
}

export function getLocalCreatorClientId() {
  if (typeof window === 'undefined') return randomId('creator-client')
  const existing = window.localStorage.getItem(LOCAL_CREATOR_CLIENT_KEY)
  if (existing) return existing
  const next = crypto.randomUUID()
  window.localStorage.setItem(LOCAL_CREATOR_CLIENT_KEY, next)
  return next
}

export function createLocalDraftRef() {
  return randomId('local-draft')
}

export function readLocalDrafts(): PmfLocalDraft[] {
  return readJson<PmfLocalDraft[]>(LOCAL_DRAFT_KEY, [])
}

export function upsertLocalDraft(draft: PmfLocalDraft) {
  const drafts = readLocalDrafts()
  const withoutCurrent = drafts.filter(item => item.localDraftRef !== draft.localDraftRef)
  writeJson(LOCAL_DRAFT_KEY, [draft, ...withoutCurrent].slice(0, 50))
}

export function readLocalAiSettings(): LocalAiSettings {
  return readJson<LocalAiSettings>(LOCAL_AI_SETTINGS_KEY, {
    provider: 'manual',
    baseUrl: '',
    model: '',
    hasKey: false,
  })
}

export function writeLocalAiSettings(settings: LocalAiSettings) {
  writeJson(LOCAL_AI_SETTINGS_KEY, settings)
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

export async function ensureAnonymousReader(): Promise<PmfResult<{ userId: string }>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return clientUnavailable()
  const { data: sessionData } = await supabase.auth.getSession()
  if (sessionData.session?.user?.id) {
    return { ok: true, data: { userId: sessionData.session.user.id } }
  }
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) return errorResult(error, '读者轻量身份创建失败，请刷新后再试。')
  const userId = data.user?.id
  if (!userId) return { ok: false, message: '读者轻量身份创建失败。', code: 'anonymous_user_missing' }
  return { ok: true, data: { userId } }
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
  if (profileError) return errorResult(profileError, '作者资料同步失败。')
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

  if (error) return errorResult(error, '本地创作端心跳同步失败。')
  return { ok: true, data: data as PmfCreatorClient }
}

export async function ensureStarterWork(input: PmfStarterWorkInput): Promise<PmfResult<PmfWork>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return clientUnavailable()
  const profile = await upsertCreatorProfile('本地作者')
  if (!profile.ok) return profile

  const payload = {
    id: input.id,
    author_id: profile.data.userId,
    title: input.title,
    summary: input.summary,
    cover_url: input.coverUrl || null,
    author_notice: input.authorNotice || '读者请求会同步到作者端，作者确认后再发布更新。',
    status: 'published',
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase.from('works')
    .upsert(payload, { onConflict: 'id' })
    .select('id,title,summary,cover_url,status,author_notice,updated_at')
    .single()

  if (error) return errorResult(error, '作品绑定失败，请确认当前账号拥有作品管理权限。')

  const branchId = pmfMainBranchId(input.id)
  const { error: branchError } = await supabase.from('branches').upsert({
    id: branchId,
    work_id: input.id,
    branch_type: 'main',
    title: '主线',
    summary: input.summary,
    status: 'published',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })

  if (branchError) return errorResult(branchError, '主线分支绑定失败。')
  return { ok: true, data: data as PmfWork }
}

export async function createReaderRequest(input: PmfReaderRequestInput): Promise<PmfResult<PmfReaderRequest>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase || !isSupabaseConfigured) return clientUnavailable()
  const reader = await ensureAnonymousReader()
  if (!reader.ok) return reader

  const requestText = input.requestText.trim().slice(0, 280)
  const { data, error } = await supabase.from('reader_requests')
    .insert({
      work_id: input.workId,
      branch_id: input.branchId || null,
      chapter_id: input.chapterId || null,
      request_type: input.requestType,
      request_text: requestText || defaultRequestText(input.requestType),
    })
    .select('id,work_id,branch_id,chapter_id,request_type,request_text,status,vote_count,published_chapter_id,published_branch_id,publish_event_id,created_at,updated_at')
    .single()

  if (error) return errorResult(error, '请求提交失败，请稍后再试。')
  return { ok: true, data: data as PmfReaderRequest }
}

export async function listPublicRequests(workId: string): Promise<PmfResult<PmfReaderRequest[]>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase || !isSupabaseConfigured) return clientUnavailable()
  const { data, error } = await supabase.from('reader_requests')
    .select('id,work_id,branch_id,chapter_id,request_type,request_text,status,vote_count,published_chapter_id,published_branch_id,publish_event_id,created_at,updated_at')
    .eq('work_id', workId)
    .order('vote_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(8)

  if (error) return errorResult(error, '请求状态读取失败。')
  return { ok: true, data: (data || []) as PmfReaderRequest[] }
}

export async function voteForRequest(readerRequestId: string): Promise<PmfResult<{ requestId: string }>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return clientUnavailable()
  const reader = await ensureAnonymousReader()
  if (!reader.ok) return reader
  const { error } = await supabase.from('request_votes').insert({
    reader_request_id: readerRequestId,
  })
  if (error) return errorResult(error, '投票失败；同一读者对同一请求只能投一次。')
  return { ok: true, data: { requestId: readerRequestId } }
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

  if (error) return errorResult(error, '请求队列同步失败。')
  return { ok: true, data: (data || []) as PmfReaderRequest[] }
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

export async function publishChapter(input: PmfPublishInput): Promise<PmfResult<{ chapter: PmfChapter; event: PmfPublishEvent }>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return clientUnavailable()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) return errorResult(userError, '作者身份读取失败。')
  const creatorId = userData.user?.id
  if (!creatorId) return { ok: false, message: '请先登录本地创作端。', code: 'creator_session_missing' }

  const branchId = input.branchId || pmfMainBranchId(input.workId)
  const { error: branchError } = await supabase.from('branches').upsert({
    id: branchId,
    work_id: input.workId,
    branch_type: branchId.endsWith(':main') ? 'main' : 'if',
    title: input.branchTitle || (branchId.endsWith(':main') ? '主线' : '读者请求支线'),
    summary: '由本地创作端人工确认发布。',
    status: 'published',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
  if (branchError) return errorResult(branchError, '发布分支准备失败。')

  const { data: existingChapters } = await supabase.from('chapters')
    .select('chapter_no')
    .eq('work_id', input.workId)
    .eq('branch_id', branchId)
    .order('chapter_no', { ascending: false })
    .limit(1)
  const nextChapterNo = Number(existingChapters?.[0]?.chapter_no || 0) + 1

  const { data: chapter, error: chapterError } = await supabase.from('chapters')
    .insert({
      work_id: input.workId,
      branch_id: branchId,
      chapter_no: nextChapterNo,
      title: input.chapterTitle.trim() || `第 ${nextChapterNo} 章`,
      content: input.content.trim(),
      status: 'published',
      source_request_id: input.requestId || null,
      created_by: creatorId,
      published_at: new Date().toISOString(),
    })
    .select('id,work_id,branch_id,chapter_no,title,content,status,published_at')
    .single()

  if (chapterError) return errorResult(chapterError, '章节发布失败。')

  const { data: event, error: eventError } = await supabase.from('publish_events')
    .insert({
      reader_request_id: input.requestId || null,
      work_id: input.workId,
      branch_id: branchId,
      published_chapter_id: (chapter as PmfChapter).id,
      published_branch_id: branchId,
      local_draft_ref: input.localDraftRef,
      event_type: branchId.endsWith(':main') ? 'chapter_published' : 'branch_published',
      published_by: creatorId,
    })
    .select('id,reader_request_id,work_id,branch_id,published_chapter_id,published_branch_id,local_draft_ref,event_type,created_at')
    .single()

  if (eventError) return errorResult(eventError, '发布记录写入失败。章节已创建，请稍后核对发布状态。')

  if (input.requestId) {
    const { error: requestError } = await supabase.from('reader_requests')
      .update({
        status: 'published',
        published_chapter_id: (chapter as PmfChapter).id,
        published_branch_id: branchId,
        publish_event_id: (event as PmfPublishEvent).id,
        local_draft_ref: input.localDraftRef,
        handled_by: creatorId,
        creator_client_id: getLocalCreatorClientId(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.requestId)
    if (requestError) return errorResult(requestError, '请求状态更新失败。章节已创建，请稍后刷新请求队列。')
  }

  return { ok: true, data: { chapter: chapter as PmfChapter, event: event as PmfPublishEvent } }
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

function defaultRequestText(type: PmfRequestType) {
  if (type === 'if_branch') return '想看这个选择展开成一条支线。'
  if (type === 'continue_branch') return '想继续看这条支线。'
  return '想看下一章。'
}
