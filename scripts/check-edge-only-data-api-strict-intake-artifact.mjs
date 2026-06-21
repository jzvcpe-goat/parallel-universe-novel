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
const artifactName = 'edge-only-data-api-strict-intake'
const gate = 'P155_EDGE_ONLY_DATA_API_STRICT_INTAKE_ARTIFACT_ATTESTATION'
const sourceGate = 'P151_EDGE_ONLY_DATA_API_STRICT_INTAKE'
const required = process.env.CHECK_EDGE_ONLY_DATA_API_STRICT_INTAKE_ARTIFACT_REQUIRED === 'true'
const checkCurrentRun = process.env.CHECK_CURRENT_GITHUB_RUN_ARTIFACTS === 'true'
const source = process.env.CHECK_EDGE_ONLY_DATA_API_STRICT_INTAKE_ARTIFACT_SOURCE || (checkCurrentRun ? 'github' : 'local')
const sealedStrictCommand = 'npm run prepare:edge-only-data-api-strict-intake'
const expandedStrictCommand = 'RUN_EDGE_ONLY_DATA_API_STRICT_INTAKE_CHAIN=true RUN_EDGE_ONLY_DATA_API_REMOTE_HEALTH_CHECK=true REQUIRE_EDGE_ONLY_DATA_API_STRICT_INTAKE_READY=true npm run check:edge-only-data-api-strict-intake'

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
  try {
    return run('git', ['rev-parse', 'HEAD']).trim()
  } catch {
    return 'source-workspace-no-git'
  }
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

function latestLocalPacket() {
  if (!existsSync(artifactDir)) return null
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith('edge-only-data-api-strict-intake-') && !name.startsWith('edge-only-data-api-strict-intake-attestation-') && name.endsWith('.json'))
    .sort()
  return files.length ? join(artifactDir, files[files.length - 1]) : null
}

function githubRun(runId) {
  return JSON.parse(run('gh', ['api', `repos/${repo}/actions/runs/${runId}`]))
}

function downloadGithubPacket(runId) {
  const dir = mkdtempSync(join(tmpdir(), 'p155-data-api-strict-intake-'))
  try {
    run('gh', ['run', 'download', String(runId), '--repo', repo, '--name', artifactName, '--dir', dir], {
      timeout: 60000,
    })
    const jsonFiles = collectFiles(dir)
      .filter(file => /edge-only-data-api-strict-intake-.*\.json$/.test(file))
      .filter(file => !/edge-only-data-api-strict-intake-attestation-.*\.json$/.test(file))
      .sort()
    assert(jsonFiles.length >= 1, `expected at least one P151 JSON in GitHub artifact, got ${jsonFiles.length}`)
    const jsonPath = jsonFiles
      .map(file => {
        let payload = {}
        try {
          payload = JSON.parse(readFileSync(file, 'utf8'))
        } catch {
          payload = {}
        }
        return {
          file,
          generatedAt: String(payload.generatedAt || ''),
          gate: payload.gate || null,
        }
      })
      .filter(candidate => candidate.gate === sourceGate)
      .sort((left, right) => {
        const byGeneratedAt = left.generatedAt.localeCompare(right.generatedAt)
        if (byGeneratedAt !== 0) return byGeneratedAt
        return left.file.localeCompare(right.file)
      })
      .at(-1)?.file
    assert(jsonPath, 'expected at least one P151 source-gate JSON in GitHub artifact')
    return {
      dir,
      jsonPath,
      cleanup: () => rmSync(dir, { recursive: true, force: true }),
    }
  } catch (error) {
    rmSync(dir, { recursive: true, force: true })
    throw error
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function scanNoPrivateText(text) {
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL=(?!<)/,
    /postgres(ql)?:\/\/[^<]/i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/i,
    /SUPABASE_SERVICE_ROLE/i,
    /SERVICE_ROLE_KEY/i,
    /SUPABASE_SECRET_KEY/i,
    /SUPABASE_WRITER_PASSWORD/i,
    /WRITER_PASSWORD\s*[:=]\s*(?!false|<)/i,
    /OPENAI_API_KEY/i,
    /DEEPSEEK_API_KEY/i,
    /MOONSHOT_API_KEY/i,
    /KIMI_API_KEY/i,
    /ANTHROPIC_API_KEY/i,
    /NARRATIVEOS_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/i,
    /MASTRA_TOOL_BRIDGE_TOKEN\s*[:=]\s*(?!<)/i,
    /Authorization:\s*Bearer/i,
    /system prompt/i,
    /provider prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
    /sourceRefs/i,
    /source_refs/i,
    /profile\.id/i,
    /kernel\.id/i,
    /prompt_id/i,
    /prompt_version/i,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(String)
}

function validatePacket(payload, expectedHeadSha) {
  const privateMatches = scanNoPrivateText(JSON.stringify(payload))
  assert(privateMatches.length === 0, `P151 artifact leaked private terms: ${privateMatches.join(', ')}`)
  assert(payload.version === 1, 'P151 artifact version must be 1')
  assert(payload.gate === sourceGate, 'P151 artifact gate mismatch')
  assert(payload.repository === repo, 'P151 artifact repository mismatch')
  assert(payload.headSha === expectedHeadSha, `P151 headSha must match expected head ${expectedHeadSha}`)
  assert(['passed', 'passed_waiting_for_edge_only_data_api_strict_intake'].includes(payload.status), 'P151 artifact status mismatch')
  assert(['edge_only_data_api_strict_intake_ready', 'edge_only_data_api_strict_intake_waiting_for_operator_input'].includes(payload.decision), 'P151 decision mismatch')
  assert(payload.sealedStrictCommand === sealedStrictCommand, 'P151 sealed strict command mismatch')
  assert(payload.expandedStrictCommand === expandedStrictCommand, 'P151 expanded strict command mismatch')
  assert(payload.nextStrictCommand === sealedStrictCommand, 'P151 next strict command mismatch')
  assert(Array.isArray(payload.missingStages), 'P151 missingStages must be an array')
  assert(Array.isArray(payload.chainFailures), 'P151 chainFailures must be an array')
  assert(payload.localIntentEnv?.valuesIncluded === false, 'P151 local intent env values must be redacted')
  assert(payload.dataApi?.valuesIncluded === false, 'P151 Data API values must be redacted')
  assert(payload.publishableKey?.valuesIncluded === false, 'P151 publishable key values must be redacted')
  assert(payload.preparedIntent?.valuesIncluded === false, 'P151 prepared intent values must be redacted')
  assert(payload.compiledContract?.valuesIncluded === false, 'P151 compiled contract values must be redacted')
  assert(payload.healthEvidence?.valuesIncluded === false, 'P151 health evidence values must be redacted')
  assert(payload.gates?.p145?.valuesIncluded === false || payload.gates?.p145?.present === false, 'P151 P145 gate summary values must be redacted')
  assert(payload.gates?.p150?.valuesIncluded === false || payload.gates?.p150?.present === false, 'P151 P150 gate summary values must be redacted')
  assert(payload.gates?.p75?.valuesIncluded === false || payload.gates?.p75?.present === false, 'P151 P75 gate summary values must be redacted')
  assert(payload.gates?.p121?.valuesIncluded === false || payload.gates?.p121?.present === false, 'P151 P121 gate summary values must be redacted')

  for (const flag of [
    'createsRemoteServices',
    'setsGitHubVariables',
    'writesCanon',
    'promotesLiveRuntime',
    'storesProviderSecrets',
    'storesServiceRoleKey',
    'storesWriterPassword',
    'requiresRemoteAgent',
    'valuesIncluded',
  ]) {
    assert(payload.boundary?.[flag] === false, `P151 boundary.${flag} must be false`)
  }

  if (payload.status === 'passed') {
    assert(payload.missingStages.length === 0, 'ready P151 artifact must have no missing stages')
  } else {
    assert(payload.missingStages.length > 0, 'waiting P151 artifact must keep missing stages')
    assert(payload.decision === 'edge_only_data_api_strict_intake_waiting_for_operator_input', 'waiting P151 decision mismatch')
  }

  return {
    status: payload.status,
    decision: payload.decision,
    missingStages: payload.missingStages,
    chainFailureCount: payload.chainFailures.length,
  }
}

function writeAttestation(result) {
  mkdirSync(artifactDir, { recursive: true })
  const path = join(artifactDir, `edge-only-data-api-strict-intake-attestation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`)
  return path
}

let downloaded
try {
  let packetPath
  let expectedHeadSha = currentHead()
  let runId = null
  let mode = 'local'

  if (source === 'github') {
    runId = String(process.env.GITHUB_RUN_ID || process.env.CHECK_GITHUB_ARTIFACTS_RUN_ID || '').trim()
    if (!runId) {
      if (required) throw new Error('GitHub artifact mode requires GITHUB_RUN_ID or CHECK_GITHUB_ARTIFACTS_RUN_ID')
      const artifactPath = writeAttestation({
        status: 'skipped',
        gate,
        reason: 'missing_github_run_id',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
    const runInfo = githubRun(runId)
    expectedHeadSha = runInfo.head_sha
    downloaded = downloadGithubPacket(runId)
    packetPath = downloaded.jsonPath
    mode = 'github_current_run'
  } else {
    packetPath = latestLocalPacket()
    if (!packetPath) {
      if (required) throw new Error('No local edge-only Data API strict intake artifact found')
      const artifactPath = writeAttestation({
        status: 'skipped',
        gate,
        reason: 'missing_local_packet_artifact',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
  }

  const payload = readJson(packetPath)
  if (source !== 'github' && payload?.headSha !== expectedHeadSha && !required) {
    const artifactPath = writeAttestation({
      version: 1,
      gate,
      generatedAt: new Date().toISOString(),
      status: 'skipped',
      mode,
      reason: 'latest_local_p151_artifact_is_for_an_older_head',
      expectedHeadSha,
      artifactHeadSha: payload?.headSha || null,
      required,
    })
    console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
    process.exit(0)
  }

  const validation = validatePacket(payload, expectedHeadSha)
  const result = {
    version: 1,
    gate,
    generatedAt: new Date().toISOString(),
    status: validation.status,
    mode,
    runId,
    expectedHeadSha,
    sourceArtifactGate: payload.gate,
    sourceArtifactStatus: payload.status,
    sourceArtifactDecision: payload.decision,
    missingStages: validation.missingStages,
    chainFailureCount: validation.chainFailureCount,
    artifactRedacted: true,
  }
  const artifactPath = writeAttestation(result)
  console.log(JSON.stringify({
    status: result.status,
    gate,
    mode,
    runId,
    missingStageCount: result.missingStages.length,
    artifactPath: relative(root, artifactPath),
  }, null, 2))
} finally {
  if (downloaded) downloaded.cleanup()
}
