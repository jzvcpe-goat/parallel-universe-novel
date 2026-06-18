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
const required = process.env.CHECK_REMOTE_RUNTIME_BLOCKERS_ARTIFACT_REQUIRED === 'true'
const checkCurrentRun = process.env.CHECK_CURRENT_GITHUB_RUN_ARTIFACTS === 'true'
const source = process.env.CHECK_REMOTE_RUNTIME_BLOCKERS_ARTIFACT_SOURCE || (checkCurrentRun ? 'github' : 'local')
const artifactName = 'remote-runtime-blockers'

const expectedStageIds = [
  'runtime-images-published',
  'remote-assignment-file-present',
  'remote-assignment-health-ready',
  'remote-origin-executed',
  'remote-origin-provisioned',
  'live-readiness',
  'remote-live-trace',
  'live-cutover-attested',
  'rollback-rehearsed',
  'privacy-release-evidence',
  'assignment-fixture-contract',
  'handoff-artifact-content',
  'activation-control',
]

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

function latestLocalBlockers() {
  if (!existsSync(artifactDir)) return null
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith('remote-runtime-blockers-') && name.endsWith('.json'))
    .sort()
  return files.length ? join(artifactDir, files[files.length - 1]) : null
}

function githubRun(runId) {
  return JSON.parse(run('gh', ['api', `repos/${repo}/actions/runs/${runId}`]))
}

function downloadGithubBlockers(runId) {
  const dir = mkdtempSync(join(tmpdir(), 'p90-remote-blockers-'))
  try {
    run('gh', ['run', 'download', String(runId), '--repo', repo, '--name', artifactName, '--dir', dir], {
      timeout: 60000,
    })
    const jsonFiles = collectFiles(dir)
      .filter(file => /remote-runtime-blockers-.*\.json$/.test(file))
      .sort()
    assert(jsonFiles.length === 1, `expected exactly one blocker JSON in GitHub artifact, got ${jsonFiles.length}`)
    const markdownFiles = collectFiles(dir)
      .filter(file => /remote-runtime-blockers-.*\.md$/.test(file))
      .sort()
    assert(markdownFiles.length === 1, `expected exactly one blocker Markdown in GitHub artifact, got ${markdownFiles.length}`)
    return {
      dir,
      jsonPath: jsonFiles[0],
      markdownPath: markdownFiles[0],
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
    /dev-local-token/,
    /NARRATIVEOS_TOOL_BRIDGE_TOKEN=(?!<)/,
    /MASTRA_TOOL_BRIDGE_TOKEN=(?!<)/,
    /NARRATIVEOS_CREATOR_API_KEY=(?!<)/,
    /Authorization:\s*Bearer\s+(?!<shared-tool-bridge-secret>)/i,
    /system prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
    /sourceRefs/,
    /profile\.id/,
    /kernel\.id/,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function stageIds(payload) {
  return Array.isArray(payload.stages) ? payload.stages.map(stage => stage.id).filter(Boolean) : []
}

function blockedStageIds(payload) {
  return Array.isArray(payload.stages)
    ? payload.stages.filter(stage => stage.status !== 'ready').map(stage => stage.id)
    : []
}

function validateBlockers(payload, expectedHeadSha) {
  const ids = stageIds(payload)
  const blockedIds = blockedStageIds(payload)
  const missingStages = expectedStageIds.filter(id => !ids.includes(id))
  const duplicateStages = ids.filter((id, index) => ids.indexOf(id) !== index)
  const privateMatches = scanNoPrivateTerms(payload)
  const sourceWorkspaceNoGit = expectedHeadSha === 'source-workspace-no-git'

  assert(payload.version === 1, 'blocker artifact version must be 1')
  assert(payload.gate === 'P85_REMOTE_RUNTIME_BLOCKER_NORMALIZATION', 'blocker artifact gate mismatch')
  assert(payload.repository === repo, 'blocker artifact repository mismatch')
  assert(payload.headSha === expectedHeadSha, `blocker headSha must match expected head ${expectedHeadSha}`)
  assert(missingStages.length === 0, `blocker artifact missing normalized stages: ${missingStages.join(', ')}`)
  assert(duplicateStages.length === 0, `blocker artifact has duplicate stages: ${duplicateStages.join(', ')}`)
  assert(privateMatches.length === 0, `blocker artifact leaked private terms: ${privateMatches.join(', ')}`)
  if (sourceWorkspaceNoGit) {
    assert(blockedIds.includes('runtime-images-published'), 'source workspace without git must keep runtime images blocked')
    assert(blockedIds.includes('handoff-artifact-content'), 'source workspace without git must keep handoff content blocked')
  } else {
    assert(payload.sourceEvidence?.imagePublishEvidence?.headSha === expectedHeadSha, 'P72 source evidence headSha must match blocker artifact head')
    assert(payload.sourceEvidence?.imagePublishEvidence?.status === 'passed', 'P72 source evidence must be passed')
    assert(
      payload.sourceEvidence?.handoffArtifact?.status === 'passed'
        || payload.sourceEvidence?.handoffArtifact?.decision === 'assignment_handoff_ready_for_operator',
      'P89 handoff artifact attestation must be passed',
    )
  }
  assert(payload.sourceEvidence?.handoffArtifact?.expectedHeadSha === expectedHeadSha, 'P89 handoff artifact head must match blocker artifact head')
  if (!sourceWorkspaceNoGit) assert(!blockedIds.includes('runtime-images-published'), 'P90 must not report current runtime images as blocked')
  assert(!blockedIds.includes('privacy-release-evidence'), 'P90 must not report privacy release evidence as blocked')
  assert(!blockedIds.includes('assignment-fixture-contract'), 'P90 must not report assignment fixture contract as blocked')
  if (!sourceWorkspaceNoGit) assert(!blockedIds.includes('handoff-artifact-content'), 'P90 must not report handoff artifact content as blocked')

  if (payload.status === 'ready') {
    assert(payload.decision === 'remote_runtime_ready_for_strict_cutover', 'ready artifact decision mismatch')
    assert(payload.blockerCount === 0, 'ready artifact blockerCount must be 0')
    assert(blockedIds.length === 0, 'ready artifact must have no blocked stages')
  } else {
    assert(payload.status === 'blocked', 'non-ready blocker artifact must report blocked status')
    assert(payload.decision === 'remote_runtime_waiting_for_operator_inputs', 'blocked artifact decision mismatch')
    assert(payload.blockerCount === blockedIds.length, 'blocked artifact blockerCount must match blocked stages')
    assert(blockedIds.length > 0, 'blocked artifact must include at least one blocked stage')
  }

  return {
    blockedIds,
    status: payload.status,
    decision: payload.decision,
  }
}

function writeAttestationArtifact(result) {
  mkdirSync(artifactDir, { recursive: true })
  const path = join(artifactDir, `remote-blocker-artifact-attestation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`)
  return path
}

let downloaded
try {
  let blockersPath
  let expectedHeadSha = currentHead()
  let runId = null
  let runUrl = null
  let mode = 'local'

  if (source === 'github') {
    runId = String(process.env.GITHUB_RUN_ID || process.env.CHECK_GITHUB_ARTIFACTS_RUN_ID || '').trim()
    if (!runId) {
      if (required) throw new Error('GitHub artifact mode requires GITHUB_RUN_ID or CHECK_GITHUB_ARTIFACTS_RUN_ID')
      const artifactPath = writeAttestationArtifact({
        status: 'skipped',
        gate: 'P90_REMOTE_RUNTIME_BLOCKER_ARTIFACT_ATTESTATION',
        reason: 'missing_github_run_id',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
    const runInfo = githubRun(runId)
    expectedHeadSha = runInfo.head_sha
    runUrl = runInfo.html_url
    downloaded = downloadGithubBlockers(runId)
    blockersPath = downloaded.jsonPath
    mode = 'github_current_run'
  } else {
    blockersPath = latestLocalBlockers()
    if (!blockersPath) {
      if (required) throw new Error('No local remote-runtime-blockers artifact found')
      const artifactPath = writeAttestationArtifact({
        status: 'skipped',
        gate: 'P90_REMOTE_RUNTIME_BLOCKER_ARTIFACT_ATTESTATION',
        reason: 'missing_local_blocker_artifact',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
  }

  assert(expectedHeadSha, 'expected head sha unavailable')
  const payload = readJson(blockersPath)
  if (source !== 'github' && payload?.headSha !== expectedHeadSha && !required) {
    const artifactPath = writeAttestationArtifact({
      status: 'skipped',
      gate: 'P90_REMOTE_RUNTIME_BLOCKER_ARTIFACT_ATTESTATION',
      reason: 'stale_local_blocker_artifact',
      required,
      expectedHeadSha,
      blockerHeadSha: payload?.headSha || null,
      blockersPath: relative(root, blockersPath),
    })
    console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
    process.exit(0)
  }

  const validation = validateBlockers(payload, expectedHeadSha)
  const result = {
    version: 1,
    gate: 'P90_REMOTE_RUNTIME_BLOCKER_ARTIFACT_ATTESTATION',
    generatedAt: new Date().toISOString(),
    repository: repo,
    mode,
    required,
    runId,
    runUrl,
    expectedHeadSha,
    blockers: {
      path: source === 'github' ? artifactName : relative(root, blockersPath),
      status: validation.status,
      decision: validation.decision,
      blockerCount: validation.blockedIds.length,
      blockedStages: validation.blockedIds,
      sourceEvidence: payload.sourceEvidence,
    },
    publicBoundary: {
      artifactContentsIncluded: false,
      containsSecrets: false,
      containsReferenceWorkNames: false,
      exposesProviderPromptPlumbing: false,
    },
  }
  const artifactPath = writeAttestationArtifact(result)
  console.log(JSON.stringify({
    status: validation.status === 'ready' ? 'passed' : 'passed_with_remote_runtime_blockers',
    gate: result.gate,
    mode,
    runId,
    expectedHeadSha,
    decision: validation.decision,
    blockerCount: validation.blockedIds.length,
    blockedStages: validation.blockedIds,
    artifactPath: relative(root, artifactPath),
  }, null, 2))
} finally {
  if (downloaded) downloaded.cleanup()
}
