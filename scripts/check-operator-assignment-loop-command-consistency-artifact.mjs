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
const required = process.env.CHECK_OPERATOR_ASSIGNMENT_LOOP_COMMAND_CONSISTENCY_ARTIFACT_REQUIRED === 'true'
const checkCurrentRun = process.env.CHECK_CURRENT_GITHUB_RUN_ARTIFACTS === 'true'
const source = process.env.CHECK_OPERATOR_ASSIGNMENT_LOOP_COMMAND_CONSISTENCY_ARTIFACT_SOURCE || (checkCurrentRun ? 'github' : 'local')
const artifactName = 'operator-assignment-loop-command-consistency'

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

function latestLocalCommandConsistency() {
  if (!existsSync(artifactDir)) return null
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith('operator-assignment-loop-command-consistency-') && name.endsWith('.json'))
    .filter(name => !name.startsWith('operator-assignment-loop-command-consistency-attestation-'))
    .map(name => join(artifactDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  return files.length ? files[0] : null
}

function githubRun(runId) {
  return JSON.parse(run('gh', ['api', `repos/${repo}/actions/runs/${runId}`]))
}

function downloadGithubCommandConsistency(runId) {
  const dir = mkdtempSync(join(tmpdir(), 'p131-command-consistency-'))
  try {
    run('gh', ['run', 'download', String(runId), '--repo', repo, '--name', artifactName, '--dir', dir], {
      timeout: 60000,
    })
    const jsonFiles = collectFiles(dir)
      .filter(file => /operator-assignment-loop-command-consistency-.*\.json$/.test(file))
      .filter(file => !/operator-assignment-loop-command-consistency-attestation-.*\.json$/.test(file))
      .sort()
    assert(jsonFiles.length === 1, `expected exactly one P130 JSON in GitHub artifact, got ${jsonFiles.length}`)
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

function assertRuntimeArtifactPointer(value, label) {
  assert(typeof value === 'string' && value.startsWith('artifacts/runtime/'), `${label} must point to a runtime artifact`)
  assert(value.endsWith('.json'), `${label} must point to a JSON artifact`)
}

function validateCommandConsistency(payload) {
  const privateMatches = scanNoPrivateTerms(payload)
  assert(payload.version === 1, 'P130 artifact version must be 1')
  assert(payload.gate === 'P130_OPERATOR_ASSIGNMENT_LOOP_COMMAND_CONSISTENCY', 'P130 artifact gate mismatch')
  assert(payload.status === 'passed', 'P130 artifact status mismatch')
  assert(payload.checkedGoal === 'operator-assignment-evidence-intake', 'P130 checked goal mismatch')
  assert(payload.commandProfile === 'edge-only-runtime-assignment-compiler', 'P130 command profile mismatch')
  assert(payload.commandCount === 10, 'P130 must verify exactly ten edge-only operator handoff commands')
  assert(payload.legacyFragmentCount === 1, 'P130 legacy fragment count mismatch')
  assertRuntimeArtifactPointer(payload.sourceStrictRunArtifact, 'sourceStrictRunArtifact')
  assertRuntimeArtifactPointer(payload.sourceReadinessPacketArtifact, 'sourceReadinessPacketArtifact')
  assertRuntimeArtifactPointer(payload.sourceLedgerArtifact, 'sourceLedgerArtifact')

  for (const key of [
    'writesLocalAssignment',
    'createsRemoteServices',
    'setsGitHubVariables',
    'storesProviderSecrets',
    'promotesLiveRuntime',
    'emitsConcreteServiceIds',
    'emitsConcreteOrigins',
    'emitsPromptPlumbing',
    'emitsPrivateTitleMaterial',
  ]) {
    assert(payload.boundaries?.[key] === false, `P130 boundaries.${key} must be false`)
  }

  assert(privateMatches.length === 0, `P130 command consistency artifact leaked private terms: ${privateMatches.join(', ')}`)

  return {
    status: payload.status,
    checkedGoal: payload.checkedGoal,
    commandCount: payload.commandCount,
    legacyFragmentCount: payload.legacyFragmentCount,
  }
}

function writeAttestation(result) {
  mkdirSync(artifactDir, { recursive: true })
  const path = join(artifactDir, `operator-assignment-loop-command-consistency-attestation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`)
  return path
}

let downloaded
try {
  let packetPath
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
        gate: 'P131_OPERATOR_ASSIGNMENT_COMMAND_CONSISTENCY_ARTIFACT_ATTESTATION',
        reason: 'missing_github_run_id',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
    const runInfo = githubRun(runId)
    expectedHeadSha = runInfo.head_sha
    runUrl = runInfo.html_url
    downloaded = downloadGithubCommandConsistency(runId)
    packetPath = downloaded.jsonPath
    mode = 'github_current_run'
  } else {
    packetPath = latestLocalCommandConsistency()
    if (!packetPath) {
      if (required) throw new Error('No local operator-assignment-loop-command-consistency artifact found')
      const artifactPath = writeAttestation({
        status: 'skipped',
        gate: 'P131_OPERATOR_ASSIGNMENT_COMMAND_CONSISTENCY_ARTIFACT_ATTESTATION',
        reason: 'missing_local_command_consistency_artifact',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
  }

  assert(expectedHeadSha, 'expected head sha unavailable')
  const payload = readJson(packetPath)
  const validation = validateCommandConsistency(payload)
  const result = {
    version: 1,
    gate: 'P131_OPERATOR_ASSIGNMENT_COMMAND_CONSISTENCY_ARTIFACT_ATTESTATION',
    generatedAt: new Date().toISOString(),
    repository: repo,
    mode,
    required,
    runId,
    runUrl,
    expectedHeadSha,
    packet: {
      path: source === 'github' ? artifactName : relative(root, packetPath),
      sourceStrictRunArtifact: payload.sourceStrictRunArtifact,
      sourceReadinessPacketArtifact: payload.sourceReadinessPacketArtifact,
      sourceLedgerArtifact: payload.sourceLedgerArtifact,
      ...validation,
    },
    publicReleaseBlocking: false,
    boundary: {
      downloadedContentChecked: source === 'github',
      containsSecrets: false,
      containsPrivateResearchMaterial: false,
      exposesProviderPlumbing: false,
      containsCandidateText: false,
      writesLocalAssignment: false,
      createsRemoteServices: false,
      setsGitHubVariables: false,
      promotesLiveRuntime: false,
    },
  }
  const artifactPath = writeAttestation(result)
  console.log(JSON.stringify({
    status: result.packet.status,
    gate: result.gate,
    mode,
    runId,
    checkedGoal: validation.checkedGoal,
    commandCount: validation.commandCount,
    artifactPath: relative(root, artifactPath),
  }, null, 2))
} finally {
  downloaded?.cleanup?.()
}
