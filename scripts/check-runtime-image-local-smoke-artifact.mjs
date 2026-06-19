#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'
const required = process.env.CHECK_RUNTIME_IMAGE_LOCAL_SMOKE_ARTIFACT_REQUIRED === 'true'
const checkCurrentRun = process.env.CHECK_CURRENT_GITHUB_RUN_ARTIFACTS === 'true'
const source = process.env.CHECK_RUNTIME_IMAGE_LOCAL_SMOKE_ARTIFACT_SOURCE || (checkCurrentRun ? 'github' : 'local')
const artifactName = 'runtime-image-local-smoke'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function run(cmd, args, options = {}) {
  return execFileSync(cmd, args, {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    timeout: options.timeout || 30000,
    env: process.env,
  })
}

function currentHead() {
  if (process.env.RUNTIME_IMAGE_HEAD_SHA) return process.env.RUNTIME_IMAGE_HEAD_SHA.trim()
  try {
    return run('git', ['rev-parse', 'HEAD']).trim()
  } catch {
    return 'source-workspace-no-git'
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function collectFiles(dir) {
  const files = []
  function walk(current) {
    const stat = statSync(current)
    if (stat.isFile()) {
      files.push(current)
      return
    }
    for (const child of readdirSync(current)) walk(join(current, child))
  }
  if (existsSync(dir)) walk(dir)
  return files
}

function latestLocalSmoke() {
  if (!existsSync(artifactDir)) return null
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith('runtime-image-local-smoke-') && name.endsWith('.json'))
    .filter(name => !name.startsWith('runtime-image-local-smoke-attestation-'))
    .map(name => join(artifactDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  return files.length ? files[0] : null
}

function githubRun(runId) {
  return JSON.parse(run('gh', ['api', `repos/${repo}/actions/runs/${runId}`]))
}

function downloadGithubSmoke(runId) {
  const dir = mkdtempSync(join(tmpdir(), 'p115-runtime-image-smoke-'))
  try {
    run('gh', ['run', 'download', String(runId), '--repo', repo, '--name', artifactName, '--dir', dir], {
      timeout: 60000,
    })
    const jsonFiles = collectFiles(dir)
      .filter(file => /runtime-image-local-smoke-.*\.json$/.test(file))
      .filter(file => !/runtime-image-local-smoke-attestation-.*\.json$/.test(file))
      .sort()
    assert(jsonFiles.length === 1, `expected exactly one runtime-image-local-smoke JSON in GitHub artifact, got ${jsonFiles.length}`)
    return {
      dir,
      jsonPath: jsonFiles[0],
      cleanup: () => rmSync(dir, { recursive: true, force: true }),
    }
  } catch (error) {
    rmSync(dir, { recursive: true, force: true })
    throw error
  }
}

function scanNoPrivateTerms(payload) {
  const text = JSON.stringify(payload)
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL=(?!<)/,
    /postgres(ql)?:\/\/[^<]/i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/,
    /image-smoke-local-token/,
    /image-smoke-debug-key/,
    /NARRATIVEOS_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/,
    /MASTRA_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/,
    /NARRATIVEOS_CREATOR_API_KEY\s*[:=]\s*(?!<)/,
    /Authorization:\s*Bearer\s+(?!<shared-tool-bridge-secret>)/i,
    /system prompt/i,
    /provider prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
    /sourceRefs/,
    /source_refs/,
    /profile\.id/,
    /kernel\.id/,
    /prompt_id/,
    /prompt_version/,
    /candidateDraft"\s*:\s*\{/i,
    /"body"\s*:\s*"[^\"]{80,}"/i,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function expectedImage(service, headSha) {
  return `ghcr.io/jzvcpe-goat/parallel-universe-novel-${service}:${headSha}`
}

function validatePublicBoundary(payload) {
  const boundary = payload.publicBoundary || {}
  for (const key of [
    'credentialValues',
    'rawProviderPayloads',
    'candidateDraftBody',
    'referenceVaultMaterial',
  ]) {
    assert(boundary[key] === 'not_included', `P114 publicBoundary.${key} must be not_included`)
  }
}

function validateSmoke(payload, expectedHeadSha) {
  const privateMatches = scanNoPrivateTerms(payload)
  const sourceWorkspaceNoGit = expectedHeadSha === 'source-workspace-no-git'
  const allowedSkipDecisions = new Set([
    'docker_daemon_unavailable',
    'images_not_local',
    'container_registry_unavailable',
  ])

  assert(payload.version === 1, 'runtime image local smoke artifact version must be 1')
  assert(payload.gate === 'P114_RUNTIME_IMAGE_LOCAL_SMOKE_GATE', 'runtime image local smoke artifact gate mismatch')
  assert(privateMatches.length === 0, `runtime image local smoke artifact leaked private terms: ${privateMatches.join(', ')}`)
  assert(['passed', 'skipped', 'passed_with_source_workspace_no_git'].includes(payload.status), 'runtime image local smoke status mismatch')

  if (sourceWorkspaceNoGit) {
    assert(payload.status === 'passed_with_source_workspace_no_git', 'source workspace smoke artifact must use source no-git status')
    assert(payload.decision === 'source_workspace_no_git', 'source workspace smoke artifact decision mismatch')
    assert(payload.currentHead === null, 'source workspace smoke artifact currentHead must be null')
    assert(Object.keys(payload.images || {}).length === 0, 'source workspace smoke artifact must not invent images')
    return {
      status: payload.status,
      decision: payload.decision,
      imageCount: 0,
      workflowStatus: null,
    }
  }

  assert(payload.currentHead === expectedHeadSha, `runtime image local smoke currentHead must match expected head ${expectedHeadSha}`)
  assert(payload.imageEvidence && String(payload.imageEvidence).includes('runtime-image-publish-evidence-'), 'runtime image local smoke must point to P72 evidence')
  assert(payload.images?.api === expectedImage('api', expectedHeadSha), 'runtime image local smoke API image must match current head')
  assert(payload.images?.agent === expectedImage('agent-runtime', expectedHeadSha), 'runtime image local smoke Agent image must match current head')
  validatePublicBoundary(payload)

  if (payload.status === 'passed') {
    assert(payload.decision === 'runtime_images_local_smoke_passed', 'passed smoke artifact decision mismatch')
    assert(payload.health?.api?.status === 'ok' || payload.health?.api?.status === 'healthy', 'passed smoke artifact API health mismatch')
    assert(payload.health?.agent?.status === 'ok' || payload.health?.agent?.status === 'healthy', 'passed smoke artifact Agent health mismatch')
    assert(payload.health?.agent?.service === 'narrativeos-agent-runtime', 'passed smoke artifact Agent service mismatch')
    assert(payload.workflow?.status === 'candidate', 'passed smoke artifact workflow status mismatch')
    assert(Number(payload.workflow?.draftLength || 0) >= 200, 'passed smoke artifact draft length summary mismatch')
    assert(Number(payload.workflow?.questionCount || 0) <= 2, 'passed smoke artifact question count summary mismatch')
    assert(payload.workflow?.toolBridgeAccepted === true, 'passed smoke artifact must prove Tool Bridge acceptance')
  } else {
    assert(payload.status === 'skipped', 'non-passed smoke artifact must be skipped')
    assert(allowedSkipDecisions.has(payload.decision), `unexpected smoke skip decision: ${payload.decision}`)
    assert(Object.keys(payload.health || {}).length === 0, 'skipped smoke artifact must not include health details')
    assert(Object.keys(payload.workflow || {}).length === 0, 'skipped smoke artifact must not include workflow details')
  }

  return {
    status: payload.status,
    decision: payload.decision,
    imageCount: Object.keys(payload.images || {}).length,
    workflowStatus: payload.workflow?.status || null,
  }
}

function writeAttestation(result) {
  mkdirSync(artifactDir, { recursive: true })
  const path = join(artifactDir, `runtime-image-smoke-artifact-attestation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`)
  return path
}

let downloaded
try {
  let smokePath
  let expectedHeadSha = currentHead()
  let runId = null
  let runUrl = null
  let mode = 'local'

  if (source === 'github') {
    runId = String(process.env.GITHUB_RUN_ID || process.env.CHECK_GITHUB_ARTIFACTS_RUN_ID || '').trim()
    if (!runId) {
      if (required) throw new Error('GitHub artifact mode requires GITHUB_RUN_ID or CHECK_GITHUB_ARTIFACTS_RUN_ID')
      const artifactPath = writeAttestation({
        status: 'skipped',
        gate: 'P115_RUNTIME_IMAGE_LOCAL_SMOKE_ARTIFACT_ATTESTATION',
        reason: 'missing_github_run_id',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
    const runInfo = githubRun(runId)
    expectedHeadSha = runInfo.head_sha
    runUrl = runInfo.html_url
    downloaded = downloadGithubSmoke(runId)
    smokePath = downloaded.jsonPath
    mode = 'github_current_run'
  } else {
    smokePath = latestLocalSmoke()
    if (!smokePath) {
      if (required) throw new Error('No local runtime-image-local-smoke artifact found')
      const artifactPath = writeAttestation({
        status: 'skipped',
        gate: 'P115_RUNTIME_IMAGE_LOCAL_SMOKE_ARTIFACT_ATTESTATION',
        reason: 'missing_local_smoke_artifact',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
  }

  assert(expectedHeadSha, 'expected head sha unavailable')
  const payload = readJson(smokePath)
  if (
    source !== 'github'
    && expectedHeadSha !== 'source-workspace-no-git'
    && payload?.currentHead !== expectedHeadSha
    && !required
  ) {
    const artifactPath = writeAttestation({
      status: 'skipped',
      gate: 'P115_RUNTIME_IMAGE_LOCAL_SMOKE_ARTIFACT_ATTESTATION',
      reason: 'stale_local_smoke_artifact',
      required,
      expectedHeadSha,
      smokeHeadSha: payload?.currentHead || null,
      smokePath: relative(root, smokePath),
    })
    console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
    process.exit(0)
  }

  const validation = validateSmoke(payload, expectedHeadSha)
  const result = {
    version: 1,
    gate: 'P115_RUNTIME_IMAGE_LOCAL_SMOKE_ARTIFACT_ATTESTATION',
    generatedAt: new Date().toISOString(),
    repository: repo,
    mode,
    required,
    runId,
    runUrl,
    expectedHeadSha,
    smoke: {
      path: source === 'github' ? artifactName : relative(root, smokePath),
      gate: payload.gate,
      status: validation.status,
      decision: validation.decision,
      imageCount: validation.imageCount,
      workflowStatus: validation.workflowStatus,
    },
    redaction: {
      credentialValuesIncluded: false,
      candidateDraftBodyIncluded: false,
      rawProviderPayloadsIncluded: false,
      promptTextIncluded: false,
      referenceVaultMaterialIncluded: false,
    },
  }
  const privateMatches = scanNoPrivateTerms(result)
  assert(privateMatches.length === 0, `P115 attestation leaked private terms: ${privateMatches.join(', ')}`)
  const artifactPath = writeAttestation(result)

  console.log(JSON.stringify({
    status: 'passed',
    gate: result.gate,
    mode,
    runId,
    expectedHeadSha,
    smoke: result.smoke,
    artifactPath: relative(root, artifactPath),
  }, null, 2))
} finally {
  if (downloaded) downloaded.cleanup()
}
