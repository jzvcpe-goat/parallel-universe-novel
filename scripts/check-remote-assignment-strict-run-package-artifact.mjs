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
const required = process.env.CHECK_REMOTE_ASSIGNMENT_STRICT_RUN_PACKAGE_ARTIFACT_REQUIRED === 'true'
const checkCurrentRun = process.env.CHECK_CURRENT_GITHUB_RUN_ARTIFACTS === 'true'
const source = process.env.CHECK_REMOTE_ASSIGNMENT_STRICT_RUN_PACKAGE_ARTIFACT_SOURCE || (checkCurrentRun ? 'github' : 'local')
const artifactName = 'remote-assignment-strict-run-package'
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

function latestLocalStrictRunPackage() {
  if (!existsSync(artifactDir)) return null
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith('remote-assignment-strict-run-package-') && !name.startsWith('remote-assignment-strict-run-package-attestation-') && name.endsWith('.json'))
    .sort()
  return files.length ? join(artifactDir, files[files.length - 1]) : null
}

function githubRun(runId) {
  return JSON.parse(run('gh', ['api', `repos/${repo}/actions/runs/${runId}`]))
}

function downloadGithubStrictRunPackage(runId) {
  const dir = mkdtempSync(join(tmpdir(), 'p118-strict-run-package-'))
  try {
    run('gh', ['run', 'download', String(runId), '--repo', repo, '--name', artifactName, '--dir', dir], {
      timeout: 60000,
    })
    const jsonFiles = collectFiles(dir)
      .filter(file => /remote-assignment-strict-run-package-.*\.json$/.test(file))
      .filter(file => !/remote-assignment-strict-run-package-attestation-.*\.json$/.test(file))
      .sort()
    assert(jsonFiles.length === 1, `expected exactly one strict-run JSON in GitHub artifact, got ${jsonFiles.length}`)
    const markdownFiles = collectFiles(dir)
      .filter(file => /remote-assignment-strict-run-package-.*\.md$/.test(file))
      .sort()
    assert(markdownFiles.length === 1, `expected exactly one strict-run Markdown in GitHub artifact, got ${markdownFiles.length}`)
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

function imageRef(service, headSha) {
  return `ghcr.io/jzvcpe-goat/parallel-universe-novel-${service}:${headSha}`
}

function validateStrictRunPackage(payload, markdownText, expectedHeadSha, options = {}) {
  const privateMatches = scanNoPrivateText(JSON.stringify(payload))
  const markdownPrivateMatches = scanNoPrivateText(markdownText)
  const blockedStages = Array.isArray(payload.blockedStages) ? payload.blockedStages : []
  const runtimeAssignmentEvidence = payload.upstreamEvidence?.blockerLedger?.runtimeAssignment || {}
  const currentEdgeOnlyProjection = runtimeAssignmentEvidence.runtimeMode === 'edge-only'
    && runtimeAssignmentEvidence.selectedEdgeOnlyCurrentPath === true
  const commandText = Array.isArray(payload.strictRunPackage)
    ? payload.strictRunPackage.map(item => item.command).join('\n')
    : ''
  const sourceWorkspaceNoGit = expectedHeadSha === 'source-workspace-no-git'

  assert(payload.version === 1, 'strict-run artifact version must be 1')
  assert(payload.gate === 'P118_REMOTE_ASSIGNMENT_STRICT_RUN_PACKAGE', 'strict-run artifact gate mismatch')
  assert(payload.repository === repo, 'strict-run artifact repository mismatch')
  assert(payload.headSha === expectedHeadSha, `strict-run headSha must match expected head ${expectedHeadSha}`)
  assert(payload.status === 'passed_with_operator_inputs_required', 'strict-run status mismatch')
  assert(payload.decision === 'strict_run_package_ready_waiting_for_operator_inputs', 'strict-run decision mismatch')
  assert(payload.publicReleaseBlocking === false, 'strict-run package must not block static public release')
  assert(payload.targetAssignmentPath === targetAssignmentPath, 'strict-run target assignment path mismatch')
  for (const flag of ['writesLocalAssignment', 'createsRemoteServices', 'setsGitHubVariables', 'storesProviderSecrets', 'promotesLiveRuntime', 'treatsFixtureAsReady']) {
    assert(payload[flag] === false, `strict-run package must keep ${flag}=false`)
  }
  assert(payload.boundary?.shareableWithDeploymentOperator === true, 'strict-run package must be operator-shareable')
  assert(payload.boundary?.containsSecrets === false, 'strict-run package must not contain secrets')
  assert(payload.boundary?.containsPrivateResearchTitles === false, 'strict-run package must not contain private research titles')
  assert(payload.boundary?.exposesModelProviderPlumbing === false, 'strict-run package must not expose model provider plumbing')
  assert(payload.currentImages?.api?.includes('parallel-universe-novel-api:'), 'strict-run API image ref mismatch')
  assert(payload.currentImages?.agent?.includes('parallel-universe-novel-agent-runtime:'), 'strict-run Agent image ref mismatch')
  if (!sourceWorkspaceNoGit) {
    assert(payload.currentImages.api === imageRef('api', expectedHeadSha), 'strict-run API image must match current head')
    assert(payload.currentImages.agent === imageRef('agent-runtime', expectedHeadSha), 'strict-run Agent image must match current head')
  }
  assert(Array.isArray(payload.strictRunPackage) && payload.strictRunPackage.length >= 14, 'strict-run package must include at least fourteen steps')
  for (const id of [
    'runtime-images',
    'fill-plan',
    'env-dry-run',
    'env-apply',
    'image-drift',
    'assignment-intake',
    'execution-pack',
    'origin-execution',
    'origin-provisioning',
    'live-readiness',
    'live-trace',
    'cutover',
    'activation',
    'blocker-ledger',
    'blocker-convergence',
  ]) {
    assert(payload.strictRunPackage.some(item => item.id === id), `strict-run package must include ${id}`)
  }
  for (const command of [
    'check:runtime-image-publish-evidence',
    'check:remote-assignment-fill-plan',
    'check:remote-assignment-env-dry-run',
    'apply:remote-assignment-env',
    'check:remote-assignment-image-drift',
    'check:remote-runtime-assignment-intake',
    'check:remote-assignment-execution-pack',
    'check:remote-origin-execution',
    'check:remote-origin-provisioning',
    'audit:live-runtime-readiness',
    'check:remote-live-runtime-trace',
    'check:live-cutover-attestation',
    'check:remote-runtime-activation-control',
    'check:remote-runtime-blockers',
    'check:runtime-completion-blocker-convergence',
  ]) {
    assert(commandText.includes(command), `strict-run validation sequence must include ${command}`)
  }
  const localAssignmentExists = options.localAssignmentExists
  if (localAssignmentExists === true) {
    assert(!blockedStages.includes('remote-assignment-file-present'), 'strict-run local artifact must clear only file-present blocker when local draft exists')
    assert(blockedStages.includes('remote-assignment-health-ready'), 'strict-run local artifact must keep assignment health blocked')
  } else if (localAssignmentExists === false && currentEdgeOnlyProjection) {
    assert(!blockedStages.includes('remote-assignment-file-present'), 'strict-run CI artifact must not reintroduce file-present blocker for tracked edge-only projection evidence')
    assert(blockedStages.includes('remote-assignment-health-ready'), 'strict-run CI artifact must keep edge-only Data API health blocked')
  } else if (localAssignmentExists === false) {
    assert(blockedStages.includes('remote-assignment-file-present'), 'strict-run CI artifact must preserve file-present blocker without local draft')
  } else {
    assert(
      blockedStages.includes('remote-assignment-file-present') || blockedStages.includes('remote-assignment-health-ready'),
      'strict-run artifact must preserve assignment file or health blocker according to generation environment',
    )
  }
  assert(blockedStages.includes('activation-control'), 'strict-run package must preserve activation-control blocker')
  assert(payload.upstreamEvidence?.envApply?.writesLocalAssignment === false, 'strict-run package must prove P116 did not write local assignment in check mode')
  assert(payload.upstreamEvidence?.envDryRun?.writesLocalAssignment === false, 'strict-run package must prove P117 did not write local assignment')
  assert(payload.upstreamEvidence?.imageDrift?.imageDriftDetected === false || sourceWorkspaceNoGit, 'strict-run package must prove no image drift in release mode')
  assert(privateMatches.length === 0, `strict-run artifact leaked private terms: ${privateMatches.join(', ')}`)
  assert(markdownPrivateMatches.length === 0, `strict-run Markdown leaked private terms: ${markdownPrivateMatches.join(', ')}`)
  assert(markdownText.includes('P118 Remote Assignment Strict-Run Package'), 'strict-run Markdown must have P118 title')
  assert(markdownText.includes(targetAssignmentPath), 'strict-run Markdown must include target assignment path')

  return {
    blockedStages,
    strictStepCount: payload.strictRunPackage.length,
  }
}

function writeAttestationArtifact(result) {
  mkdirSync(artifactDir, { recursive: true })
  const path = join(artifactDir, `remote-assignment-strict-run-package-attestation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`)
  return path
}

let downloaded
try {
  let strictRunPath
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
        gate: 'P118_REMOTE_ASSIGNMENT_STRICT_RUN_PACKAGE_ATTESTATION',
        reason: 'missing_github_run_id',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
    const runInfo = githubRun(runId)
    expectedHeadSha = runInfo.head_sha
    runUrl = runInfo.html_url
    downloaded = downloadGithubStrictRunPackage(runId)
    strictRunPath = downloaded.jsonPath
    markdownPath = downloaded.markdownPath
    mode = 'github_current_run'
  } else {
    strictRunPath = latestLocalStrictRunPackage()
    if (!strictRunPath) {
      if (required) throw new Error('No local remote-assignment-strict-run-package artifact found')
      const artifactPath = writeAttestationArtifact({
        status: 'skipped',
        gate: 'P118_REMOTE_ASSIGNMENT_STRICT_RUN_PACKAGE_ATTESTATION',
        reason: 'missing_local_strict_run_artifact',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
    markdownPath = strictRunPath.replace(/\.json$/, '.md')
  }

  assert(expectedHeadSha, 'expected head sha unavailable')
  assert(existsSync(markdownPath), 'strict-run Markdown artifact is missing')
  const payload = readJson(strictRunPath)
  if (source !== 'github' && payload?.headSha !== expectedHeadSha && !required) {
    const artifactPath = writeAttestationArtifact({
      status: 'skipped',
      gate: 'P118_REMOTE_ASSIGNMENT_STRICT_RUN_PACKAGE_ATTESTATION',
      reason: 'stale_local_strict_run_artifact',
      required,
      expectedHeadSha,
      strictRunHeadSha: payload?.headSha || null,
      strictRunPath: relative(root, strictRunPath),
    })
    console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
    process.exit(0)
  }

  const validation = validateStrictRunPackage(payload, readFileSync(markdownPath, 'utf8'), expectedHeadSha, {
    localAssignmentExists: source === 'github' ? null : existsSync(join(root, targetAssignmentPath)),
  })
  const result = {
    version: 1,
    gate: 'P118_REMOTE_ASSIGNMENT_STRICT_RUN_PACKAGE_ATTESTATION',
    generatedAt: new Date().toISOString(),
    repository: repo,
    mode,
    required,
    runId,
    runUrl,
    expectedHeadSha,
    strictRunPackage: {
      path: source === 'github' ? artifactName : relative(root, strictRunPath),
      decision: payload.decision,
      status: payload.status,
      targetAssignmentPath: payload.targetAssignmentPath,
      blockedStages: validation.blockedStages,
      strictStepCount: validation.strictStepCount,
    },
    publicBoundary: {
      artifactContentsIncluded: false,
      containsSecrets: false,
      containsReferenceWorkNames: false,
      exposesModelProviderPlumbing: false,
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
