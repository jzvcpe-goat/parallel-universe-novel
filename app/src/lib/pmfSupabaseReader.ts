import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase'
import type {
  PmfReaderRequest,
  PmfRequestStatus,
  PmfRequestType,
} from '@/features/pmf/types'

export type PmfReaderResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; code?: string }

export interface PmfReaderRequestInput {
  workId: string
  branchId?: string | null
  chapterId?: string | null
  requestType: PmfRequestType
  requestText: string
}

function clientUnavailable<T>(): PmfReaderResult<T> {
  return {
    ok: false,
    message: '请求服务尚未开启，请稍后再试。',
    code: 'supabase_unconfigured',
  }
}

function errorResult<T>(error: unknown, fallback: string): PmfReaderResult<T> {
  const maybeError = error as { message?: string; code?: string }
  return {
    ok: false,
    message: maybeError?.message || fallback,
    code: maybeError?.code,
  }
}

async function ensureAnonymousReader(): Promise<PmfReaderResult<{ userId: string }>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return clientUnavailable()
  const { data: sessionData } = await supabase.auth.getSession()
  if (sessionData.session?.user?.id) {
    return { ok: true, data: { userId: sessionData.session.user.id } }
  }
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) return errorResult(error, '请求身份创建失败，请稍后再试。')
  const userId = data.user?.id
  if (!userId) return { ok: false, message: '请求身份创建失败。', code: 'anonymous_user_missing' }
  return { ok: true, data: { userId } }
}

export async function createReaderRequest(input: PmfReaderRequestInput): Promise<PmfReaderResult<PmfReaderRequest>> {
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

export async function listPublicRequests(workId: string): Promise<PmfReaderResult<PmfReaderRequest[]>> {
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

export async function voteForRequest(readerRequestId: string): Promise<PmfReaderResult<{ requestId: string }>> {
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
