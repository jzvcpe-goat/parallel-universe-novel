import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const creatorEmail = process.env.ZERO_COST_PMF_CREATOR_EMAIL
const creatorPassword = process.env.ZERO_COST_PMF_CREATOR_PASSWORD
const shouldRun = process.env.RUN_ZERO_COST_PMF_LIVE_AUTHOR_TRACE === 'true'
const strict = process.env.REQUIRE_ZERO_COST_PMF_LIVE_AUTHOR_TRACE === 'true'

function redact(value) {
  return String(value?.message || value || 'unknown error')
    .replace(/https:\/\/[a-z0-9-]+\.supabase\.co/gi, '<supabase-url>')
    .replace(/sb_publishable_[A-Za-z0-9_-]+/g, '<supabase-publishable-key>')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '<jwt-like-token>')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<email>')
}

function step(name, status, details = {}) {
  return { name, status, ...details }
}

function randomUuid() {
  return globalThis.crypto.randomUUID()
}

function decodeJwtPayload(token) {
  const payload = token?.split('.')?.[1]
  if (!payload) return {}
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'))
  } catch {
    return {}
  }
}

async function writeArtifact(artifact) {
  mkdirSync(join(process.cwd(), 'artifacts/runtime'), { recursive: true })
  const artifactPath = join(
    process.cwd(),
    'artifacts/runtime',
    `zero-cost-pmf-live-author-trace-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  )
  writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)
  return artifactPath
}

const steps = []

if (!shouldRun) {
  const artifact = {
    gate: 'ZERO_COST_PMF_LIVE_AUTHOR_TRACE',
    status: 'skipped_zero_cost_pmf_live_author_trace',
    strict,
    evidence: {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasPublishableKey: Boolean(supabaseKey),
      hasCreatorEmail: Boolean(creatorEmail),
      hasCreatorPassword: Boolean(creatorPassword),
      requiresExplicitOptIn: 'RUN_ZERO_COST_PMF_LIVE_AUTHOR_TRACE=true',
    },
    nextAction: 'Run with a non-anonymous, allowlisted Local Creator author session after the anonymous reader E2E passes.',
  }
  const artifactPath = await writeArtifact(artifact)
  console.log(JSON.stringify({ ...artifact, artifactPath }, null, 2))
  if (strict) throw new Error('zero-cost PMF live author trace requires RUN_ZERO_COST_PMF_LIVE_AUTHOR_TRACE=true')
  process.exit(0)
}

if (!supabaseUrl || !supabaseKey || !creatorEmail || !creatorPassword) {
  const artifact = {
    gate: 'ZERO_COST_PMF_LIVE_AUTHOR_TRACE',
    status: 'blocked_zero_cost_pmf_live_author_trace',
    strict,
    evidence: {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasPublishableKey: Boolean(supabaseKey),
      hasCreatorEmail: Boolean(creatorEmail),
      hasCreatorPassword: Boolean(creatorPassword),
      steps,
    },
    nextAction: 'Provide VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, ZERO_COST_PMF_CREATOR_EMAIL and ZERO_COST_PMF_CREATOR_PASSWORD from a local ignored env file; the signed-in author must also exist in creator_authorizations.',
  }
  const artifactPath = await writeArtifact(artifact)
  console.log(JSON.stringify({ ...artifact, artifactPath }, null, 2))
  throw new Error('zero-cost PMF live author trace missing local author config')
}

const author = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})
const reader = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})

let status = 'passed_zero_cost_pmf_live_author_trace'
let nextAction = 'Reader request to Local Creator publish trace is live-proven.'
let requestId = null
let publishEventId = null
let publishedChapterId = null
let workId = `p0-author-trace-${Date.now()}`
let branchId = `${workId}:main`

try {
  const { data: flags, error: flagsError } = await author
    .from('feature_flags')
    .select('key,enabled')
    .in('key', ['cloud_ai_runtime_enabled', 'reader_requests_enabled', 'local_creator_app_enabled'])
  if (flagsError) throw new Error(`feature flags blocked: ${redact(flagsError)}`)
  const flagMap = new Map((flags || []).map(item => [item.key, item.enabled]))
  if (flagMap.get('cloud_ai_runtime_enabled') !== false) throw new Error('cloud AI runtime flag must stay disabled')
  if (flagMap.get('reader_requests_enabled') !== true) throw new Error('reader requests flag must be enabled')
  if (flagMap.get('local_creator_app_enabled') !== true) throw new Error('local creator flag must be enabled')
  steps.push(step('feature_flags', 'passed', { cloudAiRuntimeEnabled: false }))

  const { data: signIn, error: signInError } = await author.auth.signInWithPassword({
    email: creatorEmail,
    password: creatorPassword,
  })
  if (signInError || !signIn.session?.access_token || !signIn.user?.id) {
    throw new Error(`non-anonymous author sign-in blocked: ${redact(signInError || 'missing author session')}`)
  }
  const jwt = decodeJwtPayload(signIn.session.access_token)
  if (jwt.is_anonymous === true) throw new Error('author session is still anonymous')
  const creatorId = signIn.user.id
  steps.push(step('non_anonymous_author_sign_in', 'passed', { userIdPrefix: creatorId.slice(0, 8), isAnonymous: false }))

  const { data: authorization, error: authorizationError } = await author
    .from('creator_authorizations')
    .select('user_id')
    .eq('user_id', creatorId)
    .maybeSingle()
  if (authorizationError || authorization?.user_id !== creatorId) {
    throw new Error(`creator author allowlist missing: ${redact(authorizationError || 'author account is not authorized for Local Creator')}`)
  }
  steps.push(step('creator_authorization_allowlist', 'passed'))

  const { error: profileError } = await author.from('profiles').upsert({
    id: creatorId,
    role: 'creator',
    display_name: 'P0 Local Creator',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
  if (profileError) throw new Error(`creator profile upsert blocked: ${redact(profileError)}`)
  steps.push(step('creator_profile_upsert', 'passed'))

  const creatorClientId = randomUuid()
  const { error: heartbeatError } = await author.from('creator_clients').insert({
    id: creatorClientId,
    creator_id: creatorId,
    client_label: 'P0 live author trace',
    app_mode: 'localhost',
    version: 'p0-live-author-trace',
    online_status: 'online',
    last_seen_at: new Date().toISOString(),
    last_sync_at: new Date().toISOString(),
  })
  if (heartbeatError) throw new Error(`creator heartbeat blocked: ${redact(heartbeatError)}`)
  steps.push(step('creator_client_heartbeat', 'passed', { clientIdPrefix: creatorClientId.slice(0, 8) }))

  const { error: workError } = await author.from('works').insert({
    id: workId,
    author_id: creatorId,
    title: 'P0 Live Author Trace',
    summary: 'Temporary live trace work for zero-cost PMF validation.',
    status: 'published',
    author_notice: 'This work exists only for live P0 trace validation.',
    updated_at: new Date().toISOString(),
  })
  if (workError) throw new Error(`author work create blocked: ${redact(workError)}`)

  const { error: branchError } = await author.from('branches').insert({
    id: branchId,
    work_id: workId,
    branch_type: 'main',
    title: '主线',
    summary: 'Live trace branch.',
    status: 'published',
    updated_at: new Date().toISOString(),
  })
  if (branchError) throw new Error(`author branch create blocked: ${redact(branchError)}`)
  steps.push(step('author_work_branch_published', 'passed', { workId, branchId }))

  const { data: readerAuth, error: readerAuthError } = await reader.auth.signInAnonymously()
  if (readerAuthError || !readerAuth.user?.id) throw new Error(`anonymous reader sign-in blocked: ${redact(readerAuthError || 'missing reader user')}`)
  steps.push(step('anonymous_reader_identity', 'passed', { userIdPrefix: readerAuth.user.id.slice(0, 8) }))

  const { data: request, error: requestError } = await reader.from('reader_requests')
    .insert({
      work_id: workId,
      branch_id: branchId,
      request_type: 'next_chapter',
      request_text: `P0 author trace request ${new Date().toISOString()}`,
    })
    .select('id,status')
    .single()
  if (requestError || !request?.id) throw new Error(`reader request create blocked: ${redact(requestError || 'missing request')}`)
  requestId = request.id
  steps.push(step('reader_request_create', 'passed', { requestId, requestStatus: request.status }))

  const { data: syncedRequest, error: syncError } = await author.from('reader_requests')
    .select('id,status,work_id,branch_id,request_type,vote_count')
    .eq('id', requestId)
    .single()
  if (syncError || syncedRequest?.id !== requestId) throw new Error(`local creator request sync blocked: ${redact(syncError || 'missing request')}`)
  steps.push(step('local_creator_request_sync', 'passed', { requestStatus: syncedRequest.status }))

  const { error: inProgressError } = await author.from('reader_requests')
    .update({
      status: 'in_progress',
      handled_by: creatorId,
      creator_client_id: creatorClientId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
  if (inProgressError) throw new Error(`creator request status update blocked: ${redact(inProgressError)}`)
  steps.push(step('creator_request_in_progress', 'passed'))

  const localDraftRef = `local:${creatorClientId}:${randomUuid()}`
  const { data: chapter, error: chapterError } = await author.from('chapters')
    .insert({
      work_id: workId,
      branch_id: branchId,
      chapter_no: 1,
      title: 'P0 Trace Chapter',
      content: 'This chapter was manually confirmed by the Local Creator App live author trace gate.',
      status: 'published',
      source_request_id: requestId,
      created_by: creatorId,
      published_at: new Date().toISOString(),
    })
    .select('id,work_id,branch_id,chapter_no,title,status,published_at')
    .single()
  if (chapterError || !chapter?.id) throw new Error(`chapter publish blocked: ${redact(chapterError || 'missing chapter')}`)
  publishedChapterId = chapter.id
  steps.push(step('chapter_published', 'passed', { chapterId: publishedChapterId, chapterNo: chapter.chapter_no }))

  const { data: event, error: eventError } = await author.from('publish_events')
    .insert({
      reader_request_id: requestId,
      work_id: workId,
      branch_id: branchId,
      published_chapter_id: publishedChapterId,
      published_branch_id: branchId,
      local_draft_ref: localDraftRef,
      event_type: 'chapter_published',
      published_by: creatorId,
    })
    .select('id,reader_request_id,work_id,branch_id,published_chapter_id,published_branch_id,local_draft_ref,event_type,created_at')
    .single()
  if (eventError || !event?.id) throw new Error(`publish event blocked: ${redact(eventError || 'missing event')}`)
  publishEventId = event.id
  steps.push(step('publish_event_written', 'passed', { publishEventId, localDraftRefPresent: Boolean(event.local_draft_ref) }))

  const { error: requestPublishError } = await author.from('reader_requests')
    .update({
      status: 'published',
      published_chapter_id: publishedChapterId,
      published_branch_id: branchId,
      publish_event_id: publishEventId,
      local_draft_ref: localDraftRef,
      handled_by: creatorId,
      creator_client_id: creatorClientId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
  if (requestPublishError) throw new Error(`request publish writeback blocked: ${redact(requestPublishError)}`)
  steps.push(step('request_publish_writeback', 'passed'))

  const { data: readerStatus, error: readerStatusError } = await reader.from('reader_requests')
    .select('id,status,published_chapter_id,published_branch_id,publish_event_id')
    .eq('id', requestId)
    .single()
  if (readerStatusError || readerStatus?.status !== 'published' || readerStatus?.published_chapter_id !== publishedChapterId) {
    throw new Error(`reader request status did not publish: ${redact(readerStatusError || 'unexpected reader status')}`)
  }
  steps.push(step('reader_sees_published_request', 'passed', { requestStatus: readerStatus.status }))

  const { data: readerChapter, error: readerChapterError } = await reader.from('chapters')
    .select('id,status,title')
    .eq('id', publishedChapterId)
    .single()
  if (readerChapterError || readerChapter?.status !== 'published') {
    throw new Error(`reader cannot read published chapter: ${redact(readerChapterError || 'missing chapter')}`)
  }
  steps.push(step('reader_sees_published_chapter', 'passed', { chapterId: readerChapter.id }))

  const { data: authorTrace, error: authorTraceError } = await author.from('publish_events')
    .select('id,reader_request_id,published_chapter_id,local_draft_ref')
    .eq('id', publishEventId)
    .single()
  if (authorTraceError || authorTrace?.reader_request_id !== requestId || authorTrace?.published_chapter_id !== publishedChapterId) {
    throw new Error(`author publish trace not readable: ${redact(authorTraceError || 'trace mismatch')}`)
  }
  steps.push(step('author_publish_trace_read', 'passed'))
} catch (error) {
  status = 'blocked_zero_cost_pmf_live_author_trace'
  nextAction = redact(error)
}

const artifact = {
  gate: 'ZERO_COST_PMF_LIVE_AUTHOR_TRACE',
  status,
  strict,
  evidence: {
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasPublishableKey: Boolean(supabaseKey),
    hasCreatorEmail: Boolean(creatorEmail),
    hasCreatorPassword: Boolean(creatorPassword),
    workId,
    branchId,
    requestId,
    publishEventId,
    publishedChapterId,
    steps,
    boundary: {
      cloudAiRuntimeDisabled: true,
      authorSessionMustBeNonAnonymous: steps.some(item => item.name === 'non_anonymous_author_sign_in' && item.isAnonymous === false),
      authorMustBeAllowlisted: steps.some(item => item.name === 'creator_authorization_allowlist' && item.status === 'passed'),
      localCreatorHeartbeatWritten: steps.some(item => item.name === 'creator_client_heartbeat' && item.status === 'passed'),
      readerRequestSyncedToCreator: steps.some(item => item.name === 'local_creator_request_sync' && item.status === 'passed'),
      publishTraceWritten: steps.some(item => item.name === 'publish_event_written' && item.status === 'passed'),
      readerCanSeePublishedChapter: steps.some(item => item.name === 'reader_sees_published_chapter' && item.status === 'passed'),
    },
  },
  nextAction,
}

const artifactPath = await writeArtifact(artifact)
console.log(JSON.stringify({ ...artifact, artifactPath }, null, 2))

if (status !== 'passed_zero_cost_pmf_live_author_trace') {
  throw new Error(`zero-cost PMF live author trace blocked: ${nextAction}`)
}
