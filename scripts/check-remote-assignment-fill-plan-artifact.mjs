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
const required = process.env.CHECK_REMOTE_ASSIGNMENT_FILL_PLAN_ARTIFACT_REQUIRED === 'true'
const checkCurrentRun = process.env.CHECK_CURRENT_GITHUB_RUN_ARTIFACTS === 'true'
const source = process.env.CHECK_REMOTE_ASSIGNMENT_FILL_PLAN_ARTIFACT_SOURCE || (checkCurrentRun ? 'github' : 'local')
const artifactName = 'remote-assignment-fill-plan'
const targetAssignmentPath = 'deploy/runtime-production/remote-assignment.local.json'

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

function latestLocalFillPlan() {
  if (!existsSync(artifactDir)) return null
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith('remote-assignment-fill-plan-') && !name.startsWith('remote-assignment-fill-plan-attestation-') && name.endsWith('.json'))
    .sort()
  return files.length ? join(artifactDir, files[files.length - 1]) : null
}

function githubRun(runId) {
  return JSON.parse(run('gh', ['api', `repos/${repo}/actions/runs/${runId}`]))
}

function downloadGithubFillPlan(runId) {
  const dir = mkdtempSync(join(tmpdir(), 'p106-remote-fill-plan-'))
  try {
    run('gh', ['run', 'download', String(runId), '--repo', repo, '--name', artifactName, '--dir', dir], {
      timeout: 60000,
    })
    const jsonFiles = collectFiles(dir)
      .filter(file => /remote-assignment-fill-plan-.*\.json$/.test(file))
      .filter(file => !/remote-assignment-fill-plan-attestation-.*\.json$/.test(file))
      .sort()
    assert(jsonFiles.length === 1, `expected exactly one fill-plan JSON in GitHub artifact, got ${jsonFiles.length}`)
    const markdownFiles = collectFiles(dir)
      .filter(file => /remote-assignment-fill-plan-.*\.md$/.test(file))
      .sort()
    assert(markdownFiles.length === 1, `expected exactly one fill-plan Markdown in GitHub artifact, got ${markdownFiles.length}`)
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

function scanNoPrivateText(text) {
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL=(?!<)/,
    /postgres(ql)?:\/\/[^<]/i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/,
    /dev-local-token/,
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
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function scanNoPrivatePayload(payload) {
  return scanNoPrivateText(JSON.stringify(payload))
}

function imageRef(service, headSha) {
  return `ghcr.io/jzvcpe-goat/parallel-universe-novel-${service}:${headSha}`
}

function validateFillPlan(payload, markdownText, expectedHeadSha, options = {}) {
  const privateMatches = scanNoPrivatePayload(payload)
  const markdownPrivateMatches = scanNoPrivateText(markdownText)
  const blockedStages = Array.isArray(payload.upstreamEvidence?.blockerLedger?.blockedStages)
    ? payload.upstreamEvidence.blockerLedger.blockedStages
    : []
  const fillPlanIds = new Set((payload.fillPlan || []).map(item => item.id))
  const validationText = Array.isArray(payload.validationSequence) ? payload.validationSequence.join('\n') : ''
  const sourceWorkspaceNoGit = expectedHeadSha === 'source-workspace-no-git'

  assert(payload.version === 1, 'fill-plan artifact version must be 1')
  assert(payload.gate === 'P105_REMOTE_ASSIGNMENT_FILL_PLAN_GATE', 'fill-plan artifact gate mismatch')
  assert(payload.repository === repo, 'fill-plan artifact repository mismatch')
  assert(payload.headSha === expectedHeadSha, `fill-plan headSha must match expected head ${expectedHeadSha}`)
  assert(payload.status === 'passed_with_operator_inputs_required', 'fill-plan status mismatch')
  assert(payload.decision === 'remote_assignment_fill_plan_ready', 'fill-plan decision mismatch')
  assert(payload.publicReleaseBlocking === false, 'fill-plan must not block public static release')
  assert(payload.targetAssignmentPath === targetAssignmentPath, 'fill-plan target assignment path mismatch')
  assert(payload.writesLocalAssignment === false, 'fill-plan must not write local assignment')
  assert(payload.createsRemoteServices === false, 'fill-plan must not create remote services')
  assert(payload.setsGitHubVariables === false, 'fill-plan must not set GitHub variables')
  assert(payload.promotesLiveRuntime === false, 'fill-plan must not promote live runtime')
  assert(payload.treatsFixtureAsReady === false, 'fill-plan must not treat fixture as ready')
  assert(payload.boundary?.shareableWithDeploymentOperator === true, 'fill-plan must be shareable with deployment operator')
  assert(payload.boundary?.containsSecrets === false, 'fill-plan must not contain secrets')
  assert(payload.boundary?.containsPrivateResearchTitles === false, 'fill-plan must not contain private research titles')
  assert(payload.boundary?.exposesProviderPromptPlumbing === false, 'fill-plan must not expose provider prompt plumbing')
  assert(payload.currentImages?.api?.includes('parallel-universe-novel-api:'), 'fill-plan API image ref mismatch')
  assert(payload.currentImages?.agent?.includes('parallel-universe-novel-agent-runtime:'), 'fill-plan Agent image ref mismatch')
  if (!sourceWorkspaceNoGit) {
    assert(payload.currentImages.api === imageRef('api', expectedHeadSha), 'fill-plan API image must match current head')
    assert(payload.currentImages.agent === imageRef('agent-runtime', expectedHeadSha), 'fill-plan Agent image must match current head')
  }
  assert(Array.isArray(payload.fillPlan) && payload.fillPlan.length >= 6, 'fill-plan must include at least six fill areas')
  for (const id of [
    'deployment-owner',
    'api-service',
    'agent-service',
    'origin-execution',
    'pages-runtime-vars',
    'activation-control',
  ]) {
    assert(fillPlanIds.has(id), `fill-plan must include ${id}`)
  }
  assert(Array.isArray(payload.validationSequence) && payload.validationSequence.length >= 8, 'fill-plan validation sequence is too short')
  for (const command of [
    'check:remote-assignment-schema',
    'check:remote-assignment-env-dry-run',
    'check:remote-runtime-assignment-intake',
    'check:remote-assignment-execution-pack',
    'check:remote-origin-execution',
    'check:remote-origin-provisioning',
    'audit:live-runtime-readiness',
    'check:live-cutover-attestation',
    'check:remote-runtime-activation-control',
    'check:remote-runtime-blockers',
  ]) {
    assert(validationText.includes(command), `fill-plan validation sequence must include ${command}`)
  }
  const localAssignmentExists = options.localAssignmentExists
  if (localAssignmentExists === true) {
    assert(!blockedStages.includes('remote-assignment-file-present'), 'fill-plan must clear only the file-present blocker when a local assignment draft exists')
    assert(blockedStages.includes('remote-assignment-health-ready'), 'fill-plan must preserve assignment health blocker until operator input is complete')
  } else if (localAssignmentExists === false) {
    assert(blockedStages.includes('remote-assignment-file-present'), 'fill-plan must preserve the remote assignment file blocker until operator input exists')
  } else {
    assert(
      blockedStages.includes('remote-assignment-file-present') || blockedStages.includes('remote-assignment-health-ready'),
      'fill-plan must preserve either file-present or assignment-health blocker according to the artifact generation environment',
    )
  }
  assert(blockedStages.includes('activation-control'), 'fill-plan must preserve activation-control blocker')
  if (sourceWorkspaceNoGit) {
    assert(blockedStages.includes('runtime-images-published'), 'source workspace fill-plan must keep runtime images blocked')
    assert(blockedStages.includes('handoff-artifact-content'), 'source workspace fill-plan must keep handoff content blocked')
  } else {
    assert(!blockedStages.includes('runtime-images-published'), 'release fill-plan must not keep runtime images blocked')
    assert(!blockedStages.includes('handoff-artifact-content'), 'release fill-plan must not keep handoff content blocked')
  }
  assert(privateMatches.length === 0, `fill-plan artifact leaked private terms: ${privateMatches.join(', ')}`)
  assert(markdownPrivateMatches.length === 0, `fill-plan Markdown leaked private terms: ${markdownPrivateMatches.join(', ')}`)
  assert(markdownText.includes('P105 Remote Assignment Fill Plan'), 'fill-plan Markdown must have P105 title')
  assert(markdownText.includes(targetAssignmentPath), 'fill-plan Markdown must include target assignment path')

  return {
    blockedStages,
    fillPlanCount: payload.fillPlan.length,
    validationCommandCount: payload.validationSequence.length,
  }
}

function writeAttestationArtifact(result) {
  mkdirSync(artifactDir, { recursive: true })
  const path = join(artifactDir, `remote-assignment-fill-plan-attestation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`)
  return path
}

let downloaded
try {
  let fillPlanPath
  let markdownPath
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
        gate: 'P106_REMOTE_ASSIGNMENT_FILL_PLAN_ARTIFACT_ATTESTATION',
        reason: 'missing_github_run_id',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
    const runInfo = githubRun(runId)
    expectedHeadSha = runInfo.head_sha
    runUrl = runInfo.html_url
    downloaded = downloadGithubFillPlan(runId)
    fillPlanPath = downloaded.jsonPath
    markdownPath = downloaded.markdownPath
    mode = 'github_current_run'
  } else {
    fillPlanPath = latestLocalFillPlan()
    if (!fillPlanPath) {
      if (required) throw new Error('No local remote-assignment-fill-plan artifact found')
      const artifactPath = writeAttestationArtifact({
        status: 'skipped',
        gate: 'P106_REMOTE_ASSIGNMENT_FILL_PLAN_ARTIFACT_ATTESTATION',
        reason: 'missing_local_fill_plan_artifact',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
    markdownPath = fillPlanPath.replace(/\.json$/, '.md')
  }

  assert(expectedHeadSha, 'expected head sha unavailable')
  assert(existsSync(markdownPath), 'fill-plan Markdown artifact is missing')
  const payload = readJson(fillPlanPath)
  if (source !== 'github' && payload?.headSha !== expectedHeadSha && !required) {
    const artifactPath = writeAttestationArtifact({
      status: 'skipped',
      gate: 'P106_REMOTE_ASSIGNMENT_FILL_PLAN_ARTIFACT_ATTESTATION',
      reason: 'stale_local_fill_plan_artifact',
      required,
      expectedHeadSha,
      fillPlanHeadSha: payload?.headSha || null,
      fillPlanPath: relative(root, fillPlanPath),
    })
    console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
    process.exit(0)
  }

  const validation = validateFillPlan(payload, readFileSync(markdownPath, 'utf8'), expectedHeadSha, {
    localAssignmentExists: source === 'github' ? null : existsSync(join(root, targetAssignmentPath)),
  })
  const result = {
    version: 1,
    gate: 'P106_REMOTE_ASSIGNMENT_FILL_PLAN_ARTIFACT_ATTESTATION',
    generatedAt: new Date().toISOString(),
    repository: repo,
    mode,
    required,
    runId,
    runUrl,
    expectedHeadSha,
    fillPlan: {
      path: source === 'github' ? artifactName : relative(root, fillPlanPath),
      decision: payload.decision,
      status: payload.status,
      targetAssignmentPath: payload.targetAssignmentPath,
      blockedStages: validation.blockedStages,
      fillPlanCount: validation.fillPlanCount,
      validationCommandCount: validation.validationCommandCount,
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
    status: 'passed_with_operator_inputs_required',
    gate: result.gate,
    mode,
    runId,
    expectedHeadSha,
    decision: payload.decision,
    blockedStages: validation.blockedStages,
    artifactPath: relative(root, artifactPath),
  }, null, 2))
} finally {
  if (downloaded) downloaded.cleanup()
}
