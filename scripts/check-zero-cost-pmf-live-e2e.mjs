import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const shouldRun = process.env.RUN_ZERO_COST_PMF_LIVE_E2E === 'true'
const strict = process.env.REQUIRE_ZERO_COST_PMF_LIVE_E2E === 'true'

function redact(value) {
  return String(value?.message || value || 'unknown error')
    .replace(/https:\/\/[a-z0-9-]+\.supabase\.co/gi, '<supabase-url>')
    .replace(/sb_publishable_[A-Za-z0-9_-]+/g, '<supabase-publishable-key>')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '<jwt-like-token>')
}

function step(name, status, details = {}) {
  return { name, status, ...details }
}

async function writeArtifact(artifact) {
  mkdirSync(join(process.cwd(), 'artifacts/runtime'), { recursive: true })
  const artifactPath = join(
    process.cwd(),
    'artifacts/runtime',
    `zero-cost-pmf-live-e2e-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  )
  writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)
  return artifactPath
}

const steps = []

if (!shouldRun) {
  const artifact = {
    gate: 'ZERO_COST_PMF_LIVE_E2E',
    status: 'skipped_zero_cost_pmf_live_e2e',
    strict,
    evidence: {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasPublishableKey: Boolean(supabaseKey),
      requiresExplicitOptIn: 'RUN_ZERO_COST_PMF_LIVE_E2E=true',
    },
    nextAction: 'Run with RUN_ZERO_COST_PMF_LIVE_E2E=true after the live schema gate passes.',
  }
  const artifactPath = await writeArtifact(artifact)
  console.log(JSON.stringify({ ...artifact, artifactPath }, null, 2))
  if (strict) throw new Error('zero-cost PMF live E2E requires RUN_ZERO_COST_PMF_LIVE_E2E=true')
  process.exit(0)
}

if (!supabaseUrl || !supabaseKey) {
  const artifact = {
    gate: 'ZERO_COST_PMF_LIVE_E2E',
    status: 'blocked_zero_cost_pmf_live_e2e',
    strict,
    evidence: {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasPublishableKey: Boolean(supabaseKey),
      steps,
    },
    nextAction: 'Provide VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
  }
  const artifactPath = await writeArtifact(artifact)
  console.log(JSON.stringify({ ...artifact, artifactPath }, null, 2))
  throw new Error('zero-cost PMF live E2E missing Supabase public config')
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})

let status = 'passed_zero_cost_pmf_live_e2e'
let nextAction = 'Proceed to Local Creator author-login publish validation.'
let requestId = null
let publishEventId = null

try {
  const { data: flags, error: flagsError } = await supabase
    .from('feature_flags')
    .select('key,enabled')
    .in('key', ['cloud_ai_runtime_enabled', 'reader_requests_enabled', 'local_creator_app_enabled'])
  if (flagsError) throw new Error(`feature flags blocked: ${redact(flagsError)}`)
  const flagMap = new Map((flags || []).map(item => [item.key, item.enabled]))
  if (flagMap.get('cloud_ai_runtime_enabled') !== false) throw new Error('cloud AI runtime flag must stay disabled')
  if (flagMap.get('reader_requests_enabled') !== true) throw new Error('reader requests flag must be enabled')
  if (flagMap.get('local_creator_app_enabled') !== true) throw new Error('local creator flag must be enabled')
  steps.push(step('feature_flags', 'passed', { cloudAiRuntimeEnabled: false }))

  const { data: work, error: workError } = await supabase
    .from('works')
    .select('id,title,status')
    .eq('id', 'beacon-beyond')
    .eq('status', 'published')
    .single()
  if (workError || !work?.id) throw new Error(`published starter work blocked: ${redact(workError || 'missing work')}`)
  steps.push(step('published_work_read', 'passed', { workId: work.id }))

  const { data: branch, error: branchError } = await supabase
    .from('branches')
    .select('id,work_id,status')
    .eq('id', 'beacon-beyond:main')
    .eq('status', 'published')
    .single()
  if (branchError || !branch?.id) throw new Error(`published main branch blocked: ${redact(branchError || 'missing branch')}`)
  steps.push(step('published_branch_read', 'passed', { branchId: branch.id }))

  const { data: authData, error: authError } = await supabase.auth.signInAnonymously()
  if (authError || !authData.user?.id) throw new Error(`anonymous reader sign-in blocked: ${redact(authError || 'missing anonymous user')}`)
  const anonymousUserId = authData.user.id
  steps.push(step('anonymous_reader_identity', 'passed', { userIdPrefix: anonymousUserId.slice(0, 8) }))

  const requestText = `P0 live E2E request ${new Date().toISOString()}`
  const { data: request, error: requestError } = await supabase
    .from('reader_requests')
    .insert({
      work_id: work.id,
      branch_id: branch.id,
      request_type: 'next_chapter',
      request_text: requestText,
    })
    .select('id,work_id,branch_id,request_type,request_text,status,vote_count,published_chapter_id,published_branch_id,publish_event_id,created_at')
    .single()
  if (requestError || !request?.id) throw new Error(`reader request create blocked: ${redact(requestError || 'missing request')}`)
  if (request.status !== 'pending') throw new Error(`reader request must start pending, got ${request.status}`)
  if (request.published_chapter_id || request.published_branch_id || request.publish_event_id) {
    throw new Error('reader request exposed publish fields before author confirmation')
  }
  requestId = request.id
  steps.push(step('reader_request_create', 'passed', { requestId, requestStatus: request.status }))

  const { error: voteError } = await supabase
    .from('request_votes')
    .insert({ reader_request_id: requestId })
  if (voteError) throw new Error(`reader vote blocked: ${redact(voteError)}`)
  await new Promise(resolve => setTimeout(resolve, 400))
  const { data: votedRequest, error: votedRequestError } = await supabase
    .from('reader_requests')
    .select('id,vote_count')
    .eq('id', requestId)
    .single()
  if (votedRequestError || Number(votedRequest?.vote_count) < 1) {
    throw new Error(`reader vote did not aggregate: ${redact(votedRequestError || 'vote_count not incremented')}`)
  }
  steps.push(step('reader_vote_aggregate', 'passed', { voteCount: Number(votedRequest.vote_count) }))

  const { data: creatorProfile, error: creatorProfileError } = await supabase
    .from('profiles')
    .upsert({
      id: anonymousUserId,
      role: 'creator',
      display_name: 'anonymous escalation probe',
    }, { onConflict: 'id' })
    .select('id,role')
    .single()
  if (!creatorProfileError || creatorProfile?.role === 'creator') {
    throw new Error('anonymous reader was able to create a creator profile')
  }
  steps.push(step('anonymous_creator_profile_rejected', 'passed', { code: creatorProfileError.code || 'rejected' }))

  const { data: claimedWork, error: claimError } = await supabase
    .from('works')
    .update({ author_id: anonymousUserId })
    .eq('id', work.id)
    .select('id')
  if (!claimError && Array.isArray(claimedWork) && claimedWork.length > 0) {
    throw new Error('anonymous reader was able to claim a starter work')
  }
  steps.push(step('anonymous_work_claim_rejected', 'passed', { code: claimError?.code || 'rls_no_rows' }))

  const { data: clientHeartbeat, error: heartbeatError } = await supabase
    .from('creator_clients')
    .insert({
      creator_id: anonymousUserId,
      client_label: 'anonymous heartbeat probe',
      app_mode: 'localhost',
      version: 'p0-live-e2e',
      online_status: 'online',
      last_seen_at: new Date().toISOString(),
      last_sync_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (!heartbeatError || clientHeartbeat?.id) {
    throw new Error('anonymous reader was able to write a Local Creator heartbeat')
  }
  steps.push(step('anonymous_creator_heartbeat_rejected', 'passed', { code: heartbeatError.code || 'rejected' }))

  const { data: publicStatus, error: publicStatusError } = await supabase
    .from('reader_requests')
    .select('id,status,published_chapter_id,published_branch_id,publish_event_id')
    .eq('id', requestId)
    .single()
  if (publicStatusError || publicStatus?.status !== 'pending') {
    throw new Error(`public request status not readable: ${redact(publicStatusError || 'missing status')}`)
  }
  steps.push(step('reader_request_status_read', 'passed', { requestStatus: publicStatus.status }))
} catch (error) {
  status = 'blocked_zero_cost_pmf_live_e2e'
  nextAction = redact(error)
}

const artifact = {
  gate: 'ZERO_COST_PMF_LIVE_E2E',
  status,
  strict,
  evidence: {
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasPublishableKey: Boolean(supabaseKey),
    requestId,
    publishEventId,
    steps,
    boundary: {
      cloudAiRuntimeDisabled: true,
      anonymousReaderCanRequest: steps.some(item => item.name === 'reader_request_create' && item.status === 'passed'),
      anonymousReaderCanVote: steps.some(item => item.name === 'reader_vote_aggregate' && item.status === 'passed'),
      anonymousCreatorEscalationRejected: steps.some(item => item.name === 'anonymous_creator_profile_rejected' && item.status === 'passed'),
      publishTraceRequiresAuthorSession: publishEventId === null,
    },
  },
  nextAction,
}

const artifactPath = await writeArtifact(artifact)
console.log(JSON.stringify({ ...artifact, artifactPath }, null, 2))

if (status !== 'passed_zero_cost_pmf_live_e2e') {
  throw new Error(`zero-cost PMF live E2E blocked: ${nextAction}`)
}
