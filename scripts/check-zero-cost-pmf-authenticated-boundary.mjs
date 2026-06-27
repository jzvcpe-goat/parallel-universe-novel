import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const sqlPath = 'deploy/supabase/zero_cost_pmf_loop.sql'
const sql = readFileSync(sqlPath, 'utf8')

function fail(message, details = {}) {
  const artifact = writeArtifact({
    gate: 'ZERO_COST_PMF_AUTHENTICATED_BOUNDARY',
    status: 'failed',
    message,
    ...details,
  })
  console.error(JSON.stringify({ ...artifact.report, artifactPath: artifact.path }, null, 2))
  process.exit(1)
}

function writeArtifact(report) {
  mkdirSync(join(process.cwd(), 'artifacts/runtime'), { recursive: true })
  const path = join(
    process.cwd(),
    'artifacts/runtime',
    `zero-cost-pmf-authenticated-boundary-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  )
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`)
  return { path, report }
}

function includesAll(block, needles) {
  return needles.every(needle => block.includes(needle))
}

const policyMatches = [...sql.matchAll(/create policy "([^"]+)"[\s\S]*?(?=\n\ndrop policy|$)/g)]
const policies = new Map(policyMatches.map(match => [match[1], match[0]]))

if (sql.includes('auth.role(')) {
  fail('RLS must not use auth.role(); anonymous sign-ins also use authenticated role')
}

const requiredPolicies = [
  'creator authorizations self select',
  'profiles self select',
  'profiles self upsert',
  'profiles self update',
  'published works are public',
  'creators create own works',
  'creators update own works',
  'published branches are public',
  'creators write own branches',
  'published chapters are public',
  'creators write own chapters',
  'public request status is readable',
  'readers create own requests',
  'creators update requests for own works',
  'readers vote once',
  'publish events are public trace',
  'creators write publish events for own works',
  'creators manage own clients',
  'public feature flags are readable',
]

const missingPolicies = requiredPolicies.filter(name => !policies.has(name))
if (missingPolicies.length > 0) fail('missing expected RLS policies', { missingPolicies })

const creatorPrivilegedPolicies = [
  'profiles self upsert',
  'profiles self update',
  'creators create own works',
  'creators update own works',
  'creators write own branches',
  'creators write own chapters',
  'creators update requests for own works',
  'creators write publish events for own works',
  'creators manage own clients',
]

const creatorPolicyFailures = creatorPrivilegedPolicies
  .map(name => {
    const block = policies.get(name)
    return {
      name,
      hasAuthenticatedClause: /\bto\s+authenticated\b/i.test(block),
      excludesAnonymous: block.includes("auth.jwt()) ->> 'is_anonymous'") && /not\s+coalesce/i.test(block),
      bindsToAuthUid: block.includes('(select auth.uid())'),
      requiresCreatorAuthorization:
        !['profiles self upsert', 'profiles self update'].includes(name)
        || block.includes('creator_authorizations'),
    }
  })
  .filter(
    result =>
      !result.hasAuthenticatedClause
      || !result.excludesAnonymous
      || !result.bindsToAuthUid
      || !result.requiresCreatorAuthorization,
  )

if (creatorPolicyFailures.length > 0) {
  fail('creator-privileged authenticated policies must reject anonymous users, bind ownership, and gate creator elevation through allowlist', {
    creatorPolicyFailures,
  })
}

const creatorAuthorizationPolicy = policies.get('creator authorizations self select')
if (!includesAll(creatorAuthorizationPolicy, [
  'user_id = (select auth.uid())',
  "auth.jwt()) ->> 'is_anonymous'",
  'not coalesce',
])) {
  fail('creator authorization self-select policy must only expose current non-anonymous user authorization', {
    missingNeedles: [
      'user_id = (select auth.uid())',
      "auth.jwt()) ->> 'is_anonymous'",
      'not coalesce',
    ].filter(needle => !creatorAuthorizationPolicy.includes(needle)),
  })
}

for (const name of ['profiles self upsert', 'profiles self update']) {
  const block = policies.get(name)
  if (!block.includes('creator_authorizations')) {
    fail('profile creator role elevation must require creator_authorizations allowlist', { policy: name })
  }
}

const creatorClientsPolicy = policies.get('creators manage own clients')
if (!creatorClientsPolicy.includes("p.role = 'creator'")) {
  fail('creator client heartbeat must require an existing creator profile', {
    policy: 'creators manage own clients',
  })
}

const readerRequestPolicy = policies.get('readers create own requests')
const requestWriteNeedles = [
  '(select auth.uid()) is not null',
  'reader_id = (select auth.uid())',
  "status = 'pending'",
  'vote_count = 0',
  'handled_by is null',
  'creator_client_id is null',
  'local_draft_ref is null',
  'published_chapter_id is null',
  'published_branch_id is null',
  'publish_event_id is null',
]
if (!includesAll(readerRequestPolicy, requestWriteNeedles)) {
  fail('anonymous reader request creation must be constrained to reader-owned pending requests without internal fields', {
    missingNeedles: requestWriteNeedles.filter(needle => !readerRequestPolicy.includes(needle)),
  })
}

const readerVotePolicy = policies.get('readers vote once')
if (!includesAll(readerVotePolicy, ['(select auth.uid()) is not null', 'reader_id = (select auth.uid())'])) {
  fail('anonymous reader vote policy must bind votes to auth.uid()', {
    missingNeedles: ['(select auth.uid()) is not null', 'reader_id = (select auth.uid())'].filter(
      needle => !readerVotePolicy.includes(needle),
    ),
  })
}

const publicReaderPolicies = [
  'published works are public',
  'published branches are public',
  'published chapters are public',
  'public request status is readable',
  'public feature flags are readable',
]
const publicReaderFailures = publicReaderPolicies
  .map(name => ({ name, hasAnonClause: /\bto\s+anon,\s*authenticated\b/i.test(policies.get(name)) }))
  .filter(result => !result.hasAnonClause)
if (publicReaderFailures.length > 0) {
  fail('public reader select policies must be explicit anon/authenticated policies', { publicReaderFailures })
}

const artifact = {
  gate: 'ZERO_COST_PMF_AUTHENTICATED_BOUNDARY',
  status: 'passed',
  sqlPath,
  checkedPolicyCount: policies.size,
  creatorPrivilegedPolicies,
  creatorAuthorizationPolicy: 'creator authorizations self select',
  anonymousReaderWritePolicies: ['readers create own requests', 'readers vote once'],
  publicReaderPolicies,
  principle: 'authenticated is a transport role, not proof of a trusted allowlisted creator',
}
const artifactPath = writeArtifact(artifact).path
console.log(JSON.stringify({ ...artifact, artifactPath }, null, 2))
