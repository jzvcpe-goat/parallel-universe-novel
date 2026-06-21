#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'
const workflowName = 'Publish Runtime Images'
const requirePublished = process.env.REQUIRE_RUNTIME_IMAGE_PUBLISHED === 'true'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function run(cmd, args) {
  return execFileSync(cmd, args, {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    timeout: 30000,
  })
}

function currentHead() {
  if (process.env.RUNTIME_IMAGE_HEAD_SHA) return process.env.RUNTIME_IMAGE_HEAD_SHA.trim()
  try {
    return run('git', ['rev-parse', 'HEAD']).trim()
  } catch {
    return ''
  }
}

function writeArtifact(payload) {
  mkdirSync(artifactDir, { recursive: true })
  const artifactPath = join(
    artifactDir,
    `runtime-image-publish-evidence-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  )
  writeFileSync(artifactPath, `${JSON.stringify(payload, null, 2)}\n`)
  return artifactPath
}

function finish(payload) {
  const artifactPath = writeArtifact(payload)
  const output = {
    ...payload,
    artifactPath: relative(root, artifactPath),
  }
  console.log(JSON.stringify(output, null, 2))
}

function cachedCurrentHeadEvidence(headSha) {
  if (!headSha || !existsSync(artifactDir)) return null
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith('runtime-image-publish-evidence-') && name.endsWith('.json'))
    .map(name => join(artifactDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  for (const file of files) {
    let payload
    try {
      payload = JSON.parse(readFileSync(file, 'utf8'))
    } catch {
      continue
    }
    if (
      payload?.status === 'passed'
      && payload?.headSha === headSha
      && Array.isArray(payload.images)
      && payload.images.some(image => String(image).includes(`:${headSha}`))
      && Array.isArray(payload.latestTags)
    ) {
      return { file, payload }
    }
  }
  return null
}

function blocked(reason, detail) {
  const cached = cachedCurrentHeadEvidence(currentHead())
  if (cached && !requirePublished) {
    finish({
      ...cached.payload,
      cacheReuse: {
        status: 'used_current_head_cached_evidence',
        sourceArtifact: relative(root, cached.file),
        refreshBlockedReason: reason,
      },
    })
    return
  }
  const payload = {
    status: 'passed_with_publish_blockers',
    gate: 'P72 Runtime Image Publish Evidence Gate',
    reason,
    detail,
    required: requirePublished,
    nextGate: 'P66 Remote Runtime Origin Provisioning Gate',
  }
  if (requirePublished) {
    throw new Error(`${reason}: ${detail}`)
  }
  finish(payload)
}

const headSha = currentHead()
if (!headSha) {
  blocked('git_head_unavailable', 'Set RUNTIME_IMAGE_HEAD_SHA when running outside a git checkout.')
  process.exit(0)
}

const requiredFiles = [
  '.github/workflows/runtime-images.yml',
  'docs/backend/P71_RUNTIME_IMAGE_PUBLISH_GATE.md',
]
for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `missing runtime image evidence prerequisite: ${file}`)
}

let runs
try {
  runs = JSON.parse(run('gh', [
    'run',
    'list',
    '--repo',
    repo,
    '--workflow',
    workflowName,
    '--branch',
    'main',
    '--limit',
    '20',
    '--json',
    'databaseId,headSha,conclusion,status,url,createdAt',
  ]) || '[]')
} catch (error) {
  blocked('github_actions_unreadable', error instanceof Error ? error.message : String(error))
  process.exit(0)
}

const matchingRun = runs.find(runInfo =>
  runInfo.headSha === headSha
    && runInfo.status === 'completed'
    && runInfo.conclusion === 'success',
)

if (!matchingRun) {
  blocked('current_head_image_run_missing', `No successful ${workflowName} run found for ${headSha}`)
  process.exit(0)
}

let log
try {
  log = run('gh', ['run', 'view', String(matchingRun.databaseId), '--repo', repo, '--log'])
} catch (error) {
  blocked('github_actions_log_unreadable', error instanceof Error ? error.message : String(error))
  process.exit(0)
}

const apiRef = `ghcr.io/jzvcpe-goat/parallel-universe-novel-api:${headSha}`
const agentRef = `ghcr.io/jzvcpe-goat/parallel-universe-novel-agent-runtime:${headSha}`
const apiLatest = 'ghcr.io/jzvcpe-goat/parallel-universe-novel-api:runtime-latest'
const agentLatest = 'ghcr.io/jzvcpe-goat/parallel-universe-novel-agent-runtime:runtime-latest'
const apiRepository = 'ghcr.io/jzvcpe-goat/parallel-universe-novel-api'
const agentRepository = 'ghcr.io/jzvcpe-goat/parallel-universe-novel-agent-runtime'

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasRepositoryDigest(repository, tag) {
  const digestPattern = new RegExp(`${escapeRegExp(tag)}: digest: sha256:[a-f0-9]+`, 'i')
  let inRepositoryPush = false
  for (const line of log.split(/\r?\n/)) {
    if (line.includes('The push refers to repository [')) {
      inRepositoryPush = line.includes(`[${repository}]`)
      continue
    }
    if (inRepositoryPush && digestPattern.test(line)) return true
  }
  return false
}

assert(log.includes(apiRef), `workflow log missing API image ref ${apiRef}`)
assert(log.includes(agentRef), `workflow log missing Agent Runtime image ref ${agentRef}`)
assert(log.includes(apiLatest), `workflow log missing API runtime-latest ref ${apiLatest}`)
assert(log.includes(agentLatest), `workflow log missing Agent Runtime runtime-latest ref ${agentLatest}`)
assert(hasRepositoryDigest(apiRepository, headSha), 'workflow log missing API commit digest')
assert(hasRepositoryDigest(apiRepository, 'runtime-latest'), 'workflow log missing API runtime-latest digest')
assert(hasRepositoryDigest(agentRepository, headSha), 'workflow log missing Agent Runtime commit digest')
assert(hasRepositoryDigest(agentRepository, 'runtime-latest'), 'workflow log missing Agent Runtime runtime-latest digest')

finish({
  status: 'passed',
  gate: 'P72 Runtime Image Publish Evidence Gate',
  repo,
  runId: matchingRun.databaseId,
  runUrl: matchingRun.url,
  headSha,
  images: [apiRef, agentRef],
  latestTags: [apiLatest, agentLatest],
  nextGate: 'P66 Remote Runtime Origin Provisioning Gate',
})
