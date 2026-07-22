import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const creatorEmail = process.env.ZERO_COST_PMF_CREATOR_EMAIL
const creatorPassword = process.env.ZERO_COST_PMF_CREATOR_PASSWORD
const shouldRun = process.env.RUN_ZERO_COST_PMF_LIVE_EXTERNAL_ECHO === 'true'
const strict = process.env.REQUIRE_ZERO_COST_PMF_LIVE_EXTERNAL_ECHO === 'true'

function redact(value) {
  return String(value?.message || value || 'unknown error')
    .replace(/https:\/\/[a-z0-9-]+\.supabase\.co/gi, '<supabase-url>')
    .replace(/sb_publishable_[A-Za-z0-9_-]+/g, '<supabase-publishable-key>')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '<jwt-like-token>')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<email>')
}

function hash(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function step(name, status, details = {}) {
  return { name, status, ...details }
}

async function writeArtifact(artifact) {
  mkdirSync(join(process.cwd(), 'artifacts/runtime'), { recursive: true })
  const artifactPath = join(
    process.cwd(),
    'artifacts/runtime',
    `zero-cost-pmf-live-external-echo-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  )
  writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)
  return artifactPath
}

if (!shouldRun) {
  const artifact = {
    gate: 'ZERO_COST_PMF_LIVE_EXTERNAL_ECHO',
    status: 'skipped_zero_cost_pmf_live_external_echo',
    strict,
    evidence: {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasPublishableKey: Boolean(supabaseKey),
      hasCreatorEmail: Boolean(creatorEmail),
      hasCreatorPassword: Boolean(creatorPassword),
      requiresExplicitOptIn: 'RUN_ZERO_COST_PMF_LIVE_EXTERNAL_ECHO=true',
    },
    nextAction: 'Apply the WP6 and External Echo SQL deltas, then run with an allowlisted non-anonymous author session.',
  }
  const artifactPath = await writeArtifact(artifact)
  console.log(JSON.stringify({ ...artifact, artifactPath }, null, 2))
  if (strict) throw new Error('live External Echo proof requires explicit opt-in')
  process.exit(0)
}

if (!supabaseUrl || !supabaseKey || !creatorEmail || !creatorPassword) {
  const artifact = {
    gate: 'ZERO_COST_PMF_LIVE_EXTERNAL_ECHO',
    status: 'blocked_zero_cost_pmf_live_external_echo',
    strict,
    evidence: {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasPublishableKey: Boolean(supabaseKey),
      hasCreatorEmail: Boolean(creatorEmail),
      hasCreatorPassword: Boolean(creatorPassword),
    },
    nextAction: 'Provide public Supabase configuration plus ignored local credentials for one allowlisted non-anonymous author.',
  }
  const artifactPath = await writeArtifact(artifact)
  console.log(JSON.stringify({ ...artifact, artifactPath }, null, 2))
  throw new Error('live External Echo proof is missing local author configuration')
}

const author = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})
const reader = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})
const secondReader = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

const steps = []
let status = 'passed_zero_cost_pmf_live_external_echo'
let nextAction = 'WP6 publication and all four live External Echo sources are proven; temporary public content is hidden.'
const workId = `epic5-live-proof-${Date.now()}`
const branchId = `${workId}:main`
let chapterId = null
let commentId = null
let questionId = null
let workCreated = false
let authorSignedIn = false
let cleanupPassed = false

try {
  const { data: signIn, error: signInError } = await author.auth.signInWithPassword({
    email: creatorEmail,
    password: creatorPassword,
  })
  if (signInError || !signIn.user?.id || !signIn.session?.access_token) {
    throw new Error(`author sign-in blocked: ${redact(signInError || 'missing session')}`)
  }
  authorSignedIn = true
  const authorId = signIn.user.id
  const jwtPayload = JSON.parse(Buffer.from(signIn.session.access_token.split('.')[1], 'base64url').toString('utf8'))
  if (jwtPayload.is_anonymous === true) throw new Error('author session is anonymous')
  steps.push(step('non_anonymous_author_sign_in', 'passed', { userIdPrefix: authorId.slice(0, 8) }))

  const { data: authorization, error: authorizationError } = await author
    .from('creator_authorizations')
    .select('user_id')
    .eq('user_id', authorId)
    .maybeSingle()
  if (authorizationError || authorization?.user_id !== authorId) {
    throw new Error(`creator allowlist blocked: ${redact(authorizationError || 'missing authorization')}`)
  }
  steps.push(step('creator_authorization_allowlist', 'passed'))

  const { data: flags, error: flagsError } = await author
    .from('feature_flags')
    .select('key,enabled')
    .in('key', ['cloud_ai_runtime_enabled', 'reader_echo_enabled'])
  if (flagsError) throw new Error(`feature flags blocked: ${redact(flagsError)}`)
  const flagMap = new Map((flags || []).map(flag => [flag.key, flag.enabled]))
  if (flagMap.get('cloud_ai_runtime_enabled') !== false) throw new Error('cloud AI runtime must remain disabled')
  if (flagMap.get('reader_echo_enabled') !== true) throw new Error('reader echo intake is not enabled')
  steps.push(step('feature_flags', 'passed', { cloudAiRuntimeEnabled: false, readerEchoEnabled: true }))

  const { error: profileError } = await author.from('profiles').upsert({
    id: authorId,
    role: 'creator',
    display_name: 'Creator',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
  if (profileError) throw new Error(`creator profile blocked: ${redact(profileError)}`)

  const { error: workError } = await author.from('works').insert({
    id: workId,
    author_id: authorId,
    title: 'Epic 5 live proof',
    summary: 'Temporary transaction and feedback proof.',
    status: 'published',
    author_notice: 'Temporary validation content.',
  })
  if (workError) throw new Error(`temporary work create blocked: ${redact(workError)}`)
  workCreated = true
  const { error: branchError } = await author.from('branches').insert({
    id: branchId,
    work_id: workId,
    branch_type: 'main',
    title: '主线',
    status: 'published',
  })
  if (branchError) throw new Error(`temporary branch create blocked: ${redact(branchError)}`)

  const chapterContent = 'The tide clock rang once, and the harbor answered the reader.'
  const bundleId = `publish-bundle:epic5-live:${crypto.randomUUID()}`
  const contentChecksum = hash(chapterContent.trim())
  const idempotencyKey = hash(`${bundleId}:${contentChecksum}`)
  const { data: publication, error: publicationError } = await author.rpc('publish_bundle_transaction', {
    p_bundle_id: bundleId,
    p_idempotency_key: idempotencyKey,
    p_content_checksum: contentChecksum,
    p_work_id: workId,
    p_target_kind: 'mainline',
    p_chapter_title: 'Epic 5 proof chapter',
    p_content: chapterContent,
    p_branch_id: branchId,
    p_branch_title: '主线',
    p_hook_chapter_id: null,
    p_reader_request_ids: [],
    p_creator_client_id: null,
  })
  if (publicationError || publication?.status !== 'published' || !publication?.receipt?.id) {
    throw new Error(`publish transaction blocked: ${redact(publicationError || 'missing receipt')}`)
  }
  chapterId = publication.chapter?.id || null
  if (!chapterId) throw new Error('publish transaction returned no chapter')
  steps.push(step('authoritative_publication', 'passed', {
    chapterId,
    receiptId: publication.receipt.id,
    replayed: publication.replayed === true,
  }))

  const { data: readerAuth, error: readerAuthError } = await reader.auth.signInAnonymously()
  if (readerAuthError || !readerAuth.user?.id) throw new Error(`reader sign-in blocked: ${redact(readerAuthError || 'missing reader')}`)
  const { data: secondAuth, error: secondAuthError } = await secondReader.auth.signInAnonymously()
  if (secondAuthError || !secondAuth.user?.id) throw new Error(`second reader sign-in blocked: ${redact(secondAuthError || 'missing reader')}`)
  steps.push(step('anonymous_reader_sessions', 'passed'))

  const { data: comment, error: commentError } = await reader.from('reader_comments').insert({
    work_id: workId,
    branch_id: branchId,
    chapter_id: chapterId,
    comment_text: 'Why does the harbor answer now?',
    category: 'confusion',
  }).select('id,moderation_status,visibility').single()
  if (commentError || !comment?.id || comment.moderation_status !== 'pending') {
    throw new Error(`comment intake blocked: ${redact(commentError || 'unexpected comment')}`)
  }
  commentId = comment.id

  const { data: question, error: questionError } = await reader.from('reader_questions').insert({
    work_id: workId,
    branch_id: branchId,
    chapter_id: chapterId,
    question_text: 'What will answering the reader cost?',
    category: 'character',
  }).select('id,moderation_status,visibility').single()
  if (questionError || !question?.id || question.moderation_status !== 'pending') {
    throw new Error(`question intake blocked: ${redact(questionError || 'unexpected question')}`)
  }
  questionId = question.id

  const { error: highlightError } = await reader.from('reader_highlights').insert({
    work_id: workId,
    branch_id: branchId,
    chapter_id: chapterId,
    anchor_text: 'The tide clock rang once',
  })
  if (highlightError) throw new Error(`highlight intake blocked: ${redact(highlightError)}`)
  const { error: reactionError } = await reader.from('reader_reactions').insert({
    work_id: workId,
    branch_id: branchId,
    chapter_id: chapterId,
    reaction: 'want_more',
  })
  if (reactionError) throw new Error(`reaction intake blocked: ${redact(reactionError)}`)
  steps.push(step('four_reader_signal_sources', 'passed'))

  const sourceRows = []
  for (const source of ['comment', 'highlight', 'reaction', 'question']) {
    const { data, error } = await author.rpc('list_creator_reader_signals', {
      p_source: source,
      p_after_updated_at: null,
      p_after_id: '',
      p_work_id: workId,
      p_limit: 50,
    })
    if (error || !Array.isArray(data) || data.length !== 1) {
      throw new Error(`${source} Creator projection blocked: ${redact(error || 'unexpected row count')}`)
    }
    sourceRows.push({ source, id: data[0].id, visibility: data[0].visibility })
  }
  steps.push(step('creator_source_projection', 'passed', { sources: sourceRows.map(row => row.source) }))

  const { error: anonymousListError } = await reader.rpc('list_creator_reader_signals', {
    p_source: 'comment',
    p_after_updated_at: null,
    p_after_id: '',
    p_work_id: workId,
    p_limit: 50,
  })
  if (!anonymousListError) throw new Error('anonymous reader reached the Creator source projection')
  const { error: directWriteError } = await reader.from('chapters').insert({
    work_id: workId,
    branch_id: branchId,
    chapter_no: 2,
    title: 'Forbidden direct write',
    content: 'Forbidden',
    status: 'published',
  })
  if (!directWriteError) throw new Error('anonymous reader directly wrote a public chapter')
  const { error: identityReadError } = await reader.from('reader_comments').select('reader_id').eq('id', commentId)
  if (!identityReadError) throw new Error('reader identity column is publicly readable')
  steps.push(step('anonymous_and_direct_write_denial', 'passed'))

  const { data: pendingLeak, error: pendingLeakError } = await secondReader
    .from('reader_comments')
    .select('id')
    .eq('id', commentId)
  if (pendingLeakError || (pendingLeak || []).length !== 0) throw new Error('pending free text leaked to another reader')

  const { data: moderation, error: moderationError } = await author.rpc('moderate_reader_signal', {
    p_source: 'comment',
    p_signal_id: commentId,
    p_decision: 'approve',
  })
  if (moderationError || moderation?.moderation_status !== 'approved') {
    throw new Error(`comment moderation blocked: ${redact(moderationError || 'unexpected moderation result')}`)
  }
  const { error: rejectError } = await author.rpc('moderate_reader_signal', {
    p_source: 'question',
    p_signal_id: questionId,
    p_decision: 'reject',
  })
  if (rejectError) throw new Error(`question moderation blocked: ${redact(rejectError)}`)
  const { data: publicComment, error: publicCommentError } = await secondReader
    .from('reader_comments')
    .select('id,moderation_status,visibility')
    .eq('id', commentId)
    .single()
  if (publicCommentError || publicComment?.moderation_status !== 'approved') {
    throw new Error(`approved public comment blocked: ${redact(publicCommentError || 'missing approved comment')}`)
  }
  steps.push(step('moderation_and_public_projection', 'passed'))
} catch (error) {
  status = 'blocked_zero_cost_pmf_live_external_echo'
  nextAction = redact(error)
} finally {
  if (authorSignedIn && workCreated) {
    const { error: cleanupError } = await author
      .from('works')
      .update({ status: 'hidden', updated_at: new Date().toISOString() })
      .eq('id', workId)
    cleanupPassed = !cleanupError
    steps.push(step('temporary_work_hidden', cleanupPassed ? 'passed' : 'failed', {
      errorCode: cleanupError?.code || null,
    }))
    if (!cleanupPassed && status === 'passed_zero_cost_pmf_live_external_echo') {
      status = 'blocked_zero_cost_pmf_live_external_echo'
      nextAction = 'temporary live proof content could not be hidden'
    }
  }
  await Promise.all([
    author.auth.signOut(),
    reader.auth.signOut(),
    secondReader.auth.signOut(),
  ])
}

const artifact = {
  gate: 'ZERO_COST_PMF_LIVE_EXTERNAL_ECHO',
  status,
  strict,
  evidence: {
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasPublishableKey: Boolean(supabaseKey),
    hasCreatorEmail: Boolean(creatorEmail),
    hasCreatorPassword: Boolean(creatorPassword),
    workId,
    branchId,
    chapterId,
    commentId,
    questionId,
    cleanupPassed,
    steps,
    boundary: {
      cloudAiRuntimeDisabled: true,
      privateDraftBodyStored: false,
      privateCreativeReminderStored: false,
      credentialStored: false,
      agentReasoningStored: false,
      temporaryPublicWorkHidden: cleanupPassed,
    },
  },
  nextAction,
}

const artifactPath = await writeArtifact(artifact)
console.log(JSON.stringify({ ...artifact, artifactPath }, null, 2))

if (status !== 'passed_zero_cost_pmf_live_external_echo') {
  throw new Error(`live External Echo proof blocked: ${nextAction}`)
}
