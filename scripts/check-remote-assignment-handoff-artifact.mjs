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
import { join, relative, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'
const required = process.env.CHECK_REMOTE_ASSIGNMENT_HANDOFF_ARTIFACT_REQUIRED === 'true'
const readyRequired = process.env.REQUIRE_REMOTE_ASSIGNMENT_HANDOFF_ARTIFACT_READY === 'true'
const checkCurrentRun = process.env.CHECK_CURRENT_GITHUB_RUN_ARTIFACTS === 'true'
const source = process.env.CHECK_REMOTE_ASSIGNMENT_HANDOFF_ARTIFACT_SOURCE || (checkCurrentRun ? 'github' : 'local')
const artifactName = 'remote-assignment-handoff'

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
    return ''
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

function latestLocalHandoff() {
  if (!existsSync(artifactDir)) return null
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith('remote-assignment-handoff-') && !name.startsWith('remote-assignment-handoff-attestation-') && name.endsWith('.json'))
    .sort()
  return files.length ? join(artifactDir, files[files.length - 1]) : null
}

function githubRun(runId) {
  return JSON.parse(run('gh', ['api', `repos/${repo}/actions/runs/${runId}`]))
}

function downloadGithubHandoff(runId) {
  const dir = mkdtempSync(join(tmpdir(), 'p89-remote-handoff-'))
  try {
    run('gh', ['run', 'download', String(runId), '--repo', repo, '--name', artifactName, '--dir', dir], {
      timeout: 60000,
    })
    const jsonFiles = collectFiles(dir)
      .filter(file => /remote-assignment-handoff-.*\.json$/.test(file))
      .filter(file => !/remote-assignment-handoff-attestation-.*\.json$/.test(file))
      .sort()
    assert(jsonFiles.length === 1, `expected exactly one handoff JSON in GitHub artifact, got ${jsonFiles.length}`)
    const markdownFiles = collectFiles(dir)
      .filter(file => /remote-assignment-handoff-.*\.md$/.test(file))
      .sort()
    assert(markdownFiles.length === 1, `expected exactly one handoff Markdown in GitHub artifact, got ${markdownFiles.length}`)
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

function imageRef(service, headSha) {
  return `ghcr.io/jzvcpe-goat/parallel-universe-novel-${service}:${headSha}`
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

function validateHandoff(payload, expectedHeadSha, mode) {
  const expectedApiImage = imageRef('api', expectedHeadSha)
  const expectedAgentImage = imageRef('agent-runtime', expectedHeadSha)
  const privateMatches = scanNoPrivateTerms(payload)
  const blockedStages = Array.isArray(payload.blockedStages) ? payload.blockedStages : []
  const ready = payload.status === 'ready' && payload.decision === 'assignment_handoff_ready_for_operator'

  assert(payload.version === 1, 'handoff artifact version must be 1')
  assert(payload.gate === 'P87_REMOTE_ASSIGNMENT_HANDOFF', 'handoff artifact gate mismatch')
  assert(payload.repository === repo, 'handoff artifact repository mismatch')
  assert(payload.headSha === expectedHeadSha, `handoff headSha must match expected head ${expectedHeadSha}`)
  assert(payload.images?.api === expectedApiImage, 'handoff API image must match current head')
  assert(payload.images?.agent === expectedAgentImage, 'handoff Agent image must match current head')
  assert(payload.assignmentTemplate?.services?.api?.image === expectedApiImage, 'assignment template API image must match current head')
  assert(payload.assignmentTemplate?.services?.agent?.image === expectedAgentImage, 'assignment template Agent image must match current head')
  assert(payload.assignmentTemplate?.services?.agent?.dependsOn?.includes('api'), 'assignment template Agent must depend on API')
  assert(payload.publicBoundary?.writesLocalAssignmentFile === false, 'handoff must not write local assignment file')
  assert(payload.publicBoundary?.treatsFixtureAsReady === false, 'handoff must not treat fixture as ready')
  assert(payload.publicBoundary?.containsSecrets === false, 'handoff must not contain secrets')
  assert(payload.publicBoundary?.containsReferenceWorkNames === false, 'handoff must not contain reference work names')
  assert(payload.publicBoundary?.exposesProviderPromptPlumbing === false, 'handoff must not expose provider prompt plumbing')
  assert(privateMatches.length === 0, `handoff artifact leaked private terms: ${privateMatches.join(', ')}`)
  assert(Array.isArray(payload.validationCommands) && payload.validationCommands.length >= 8, 'handoff must include validation commands')
  for (const requiredCommand of [
    'check:runtime-image-publish-evidence',
    'check:remote-runtime-assignment-intake',
    'check:remote-assignment-execution-pack',
    'check:remote-origin-execution',
    'check:remote-origin-provisioning',
    'audit:live-runtime-readiness',
    'check:live-cutover-attestation',
    'check:remote-runtime-activation-control',
  ]) {
    assert(
      payload.validationCommands.some(command => command.includes(requiredCommand)),
      `handoff validation commands must include ${requiredCommand}`,
    )
  }

  if (ready) {
    assert(payload.sourceEvidence?.imagePublishEvidence?.headSha === expectedHeadSha, 'ready P72 source evidence headSha must match handoff head')
    assert(payload.sourceEvidence?.imagePublishEvidence?.status === 'passed', 'ready P72 source evidence must be passed')
  } else {
    assert(payload.status === 'blocked', 'non-ready handoff artifact must report blocked status')
    assert(payload.decision === 'assignment_handoff_waiting_for_images', 'non-ready handoff artifact must wait for image evidence')
    assert(
      blockedStages.includes('runtime-image-evidence-current-head')
        || blockedStages.includes('runtime-image-evidence-ready'),
      `non-ready handoff artifact must explain image-evidence blocker, got: ${blockedStages.join(', ')}`,
    )
  }

  if (readyRequired) {
    assert(ready, `handoff artifact is not ready in strict ${mode} mode: ${blockedStages.join(', ')}`)
  }

  return {
    ready,
    blockedStages,
    expectedApiImage,
    expectedAgentImage,
  }
}

function writeAttestationArtifact(result) {
  mkdirSync(artifactDir, { recursive: true })
  const path = join(artifactDir, `remote-handoff-artifact-attestation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`)
  return path
}

let downloaded
try {
  let handoffPath
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
        gate: 'P89_REMOTE_ASSIGNMENT_HANDOFF_ARTIFACT_ATTESTATION',
        reason: 'missing_github_run_id',
        required,
        readyRequired,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
    const runInfo = githubRun(runId)
    expectedHeadSha = runInfo.head_sha
    runUrl = runInfo.html_url
    downloaded = downloadGithubHandoff(runId)
    handoffPath = downloaded.jsonPath
    mode = 'github_current_run'
  } else {
    handoffPath = latestLocalHandoff()
    if (!handoffPath) {
      if (required) throw new Error('No local remote-assignment-handoff artifact found')
      const artifactPath = writeAttestationArtifact({
        status: 'skipped',
        gate: 'P89_REMOTE_ASSIGNMENT_HANDOFF_ARTIFACT_ATTESTATION',
        reason: 'missing_local_handoff_artifact',
        required,
        readyRequired,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
  }

  assert(expectedHeadSha, 'expected head sha unavailable')
  const payload = readJson(handoffPath)
  if (source !== 'github' && payload?.headSha !== expectedHeadSha && !required && !readyRequired) {
    const artifactPath = writeAttestationArtifact({
      status: 'skipped',
      gate: 'P89_REMOTE_ASSIGNMENT_HANDOFF_ARTIFACT_ATTESTATION',
      reason: 'stale_local_handoff_artifact',
      required,
      readyRequired,
      expectedHeadSha,
      handoffHeadSha: payload?.headSha || null,
      handoffPath: relative(root, handoffPath),
    })
    console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
    process.exit(0)
  }
  const validation = validateHandoff(payload, expectedHeadSha, mode)
  const result = {
    version: 1,
    gate: 'P89_REMOTE_ASSIGNMENT_HANDOFF_ARTIFACT_ATTESTATION',
    generatedAt: new Date().toISOString(),
    repository: repo,
    mode,
    required,
    readyRequired,
    runId,
    runUrl,
    expectedHeadSha,
    handoff: {
      path: source === 'github' ? artifactName : relative(root, handoffPath),
      status: payload.status,
      decision: payload.decision,
      blockedStages: validation.blockedStages,
      sourceEvidenceHeadSha: payload.sourceEvidence?.imagePublishEvidence?.headSha || null,
      images: payload.images,
    },
    publicBoundary: {
      violationDetailsIncluded: false,
      artifactContentsIncluded: false,
      containsSecrets: false,
      containsReferenceWorkNames: false,
      exposesProviderPromptPlumbing: false,
    },
  }
  const artifactPath = writeAttestationArtifact(result)
  console.log(JSON.stringify({
    status: validation.ready ? 'passed' : 'passed_with_handoff_artifact_blockers',
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
