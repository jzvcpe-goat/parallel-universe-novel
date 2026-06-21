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
const required = process.env.CHECK_EDGE_ONLY_OPERATOR_EVIDENCE_PACKET_ARTIFACT_REQUIRED === 'true'
const checkCurrentRun = process.env.CHECK_CURRENT_GITHUB_RUN_ARTIFACTS === 'true'
const source = process.env.CHECK_EDGE_ONLY_OPERATOR_EVIDENCE_PACKET_ARTIFACT_SOURCE || (checkCurrentRun ? 'github' : 'local')
const artifactName = 'edge-only-operator-evidence-packet'
const localEnvRel = 'deploy/runtime-production/runtime-assignment.intent.env.local'

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
    .filter(name => name.startsWith('edge-only-operator-evidence-packet-') && !name.startsWith('edge-only-operator-evidence-packet-attestation-') && name.endsWith('.json'))
    .sort()
  return files.length ? join(artifactDir, files[files.length - 1]) : null
}

function githubRun(runId) {
  return JSON.parse(run('gh', ['api', `repos/${repo}/actions/runs/${runId}`]))
}

function downloadGithubPacket(runId) {
  const dir = mkdtempSync(join(tmpdir(), 'p147-edge-only-packet-'))
  try {
    run('gh', ['run', 'download', String(runId), '--repo', repo, '--name', artifactName, '--dir', dir], {
      timeout: 60000,
    })
    const jsonFiles = collectFiles(dir)
      .filter(file => /edge-only-operator-evidence-packet-.*\.json$/.test(file))
      .filter(file => !/edge-only-operator-evidence-packet-attestation-.*\.json$/.test(file))
      .sort()
    assert(jsonFiles.length === 1, `expected exactly one P147 JSON in GitHub artifact, got ${jsonFiles.length}`)
    const markdownFiles = collectFiles(dir)
      .filter(file => /edge-only-operator-evidence-packet-.*\.md$/.test(file))
      .sort()
    assert(markdownFiles.length === 1, `expected exactly one P147 Markdown in GitHub artifact, got ${markdownFiles.length}`)
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
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/i,
    /SUPABASE_SERVICE_ROLE/i,
    /SERVICE_ROLE_KEY/i,
    /SUPABASE_SECRET_KEY/i,
    /SUPABASE_WRITER_PASSWORD/i,
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
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function validatePacket(payload, markdownText, expectedHeadSha) {
  const privateMatches = scanNoPrivateText(JSON.stringify(payload))
  const markdownPrivateMatches = scanNoPrivateText(markdownText)
  const requiredKeys = new Set((payload.requiredEvidence || []).map(item => item.key))
  const stepCommands = (payload.operatorSteps || []).map(step => step.command).join('\n')

  assert(payload.version === 1, 'P147 packet version must be 1')
  assert(payload.gate === 'P147_EDGE_ONLY_OPERATOR_EVIDENCE_PACKET', 'P147 packet gate mismatch')
  assert(payload.repository === repo, 'P147 repository mismatch')
  assert(payload.headSha === expectedHeadSha, `P147 headSha must match expected head ${expectedHeadSha}`)
  assert(payload.status === 'passed_waiting_for_edge_only_operator_evidence', 'P147 status mismatch')
  assert(payload.decision === 'edge_only_operator_packet_ready_waiting_for_data_api_evidence', 'P147 decision mismatch')
  assert(payload.runtimeTopology === 'edge-only-preferred', 'P147 runtime topology mismatch')
  assert(payload.localEnvPath === localEnvRel, 'P147 local env path mismatch')
  assert(Array.isArray(payload.blockedStages), 'P147 blockedStages must be an array')
  assert(payload.blockedStages.some(stage => String(stage).startsWith('data-api-')), 'P147 must preserve Data API blockers')
  assert(!payload.blockedStages.some(stage => /^agent-/i.test(stage)), 'P147 must not expose legacy remote Agent blockers as primary path')
  assert(payload.legacyFullRemoteEnv?.primaryEvidence === false, 'P147 must not use legacy full-remote env as primary evidence')
  assert(payload.legacyFullRemoteEnv?.valuesIncluded === false, 'P147 must not include legacy env values')
  assert(payload.localIntentEnv?.valuesIncluded === false, 'P147 must not include local intent env values')

  for (const key of [
    'RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID or SUPABASE_PROJECT_REF',
    'RUNTIME_ASSIGNMENT_DATA_API_ORIGIN or SUPABASE_URL',
    'RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED',
    'VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY',
    'health_probe reader row',
  ]) {
    assert(requiredKeys.has(key), `P147 missing required evidence ${key}`)
  }
  assert(![...requiredKeys].some(key => key.includes('REMOTE_AGENT')), 'P147 must not require REMOTE_AGENT evidence')

  for (const fragment of [
    'npm run prepare:runtime-assignment-intent-env-local',
    `RUNTIME_ASSIGNMENT_INTENT_ENV_FILE=${localEnvRel} RUNTIME_ASSIGNMENT_INTENT_FORCE=true npm run prepare:runtime-assignment-intent`,
    'npm run remote-assignment:prepare',
    'npm run check:remote-runtime-assignment-intake',
    'npm run remote-health:check',
    'npm run check:remote-operator-return-intake && npm run check:loop-next-goal-ledger',
  ]) {
    assert(stepCommands.includes(fragment), `P147 operator steps must include ${fragment}`)
  }
  assert(!stepCommands.includes('apply:remote-assignment-env'), 'P147 primary sequence must not use legacy full-remote env apply')

  for (const flag of [
    'writesLocalAssignment',
    'createsRemoteServices',
    'setsGitHubVariables',
    'storesProviderSecrets',
    'storesSupabaseKeys',
    'promotesLiveRuntime',
    'treatsLegacyFullRemoteEnvAsPrimary',
    'requiresRemoteAgentRuntime',
    'containsSecrets',
    'containsPrivateResearchMaterial',
    'exposesProviderPlumbing',
    'containsCandidateText',
  ]) {
    assert(payload.boundary?.[flag] === false, `P147 boundary.${flag} must be false`)
  }
  assert(payload.sourceEvidence?.operatorAssignmentEvidenceIntake?.gate === 'P123_OPERATOR_ASSIGNMENT_EVIDENCE_INTAKE', 'P147 must cite P123')
  assert(payload.sourceEvidence?.intentEnvTemplate?.gate === 'P146_EDGE_ONLY_INTENT_ENV_TEMPLATE_GATE', 'P147 must cite P146')
  assert(payload.nextCommand === `RUNTIME_ASSIGNMENT_INTENT_ENV_FILE=${localEnvRel} RUNTIME_ASSIGNMENT_INTENT_FORCE=true npm run prepare:runtime-assignment-intent`, 'P147 next command mismatch')
  assert(privateMatches.length === 0, `P147 packet leaked private terms: ${privateMatches.join(', ')}`)
  assert(markdownPrivateMatches.length === 0, `P147 Markdown leaked private terms: ${markdownPrivateMatches.join(', ')}`)
  assert(markdownText.includes('P147 Edge-Only Operator Evidence Packet'), 'P147 Markdown title mismatch')
  assert(markdownText.includes(localEnvRel), 'P147 Markdown must include local env path')

  return {
    blockedStages: payload.blockedStages,
    localIntentEnvPresent: Boolean(payload.localIntentEnv?.present),
    requiredEvidenceCount: payload.requiredEvidence.length,
  }
}

function writeAttestationArtifact(result) {
  mkdirSync(artifactDir, { recursive: true })
  const path = join(artifactDir, `edge-only-operator-evidence-packet-attestation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`)
  return path
}

let downloaded
try {
  let packetPath
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
        gate: 'P147_EDGE_ONLY_OPERATOR_EVIDENCE_PACKET_ATTESTATION',
        reason: 'missing_github_run_id',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
    const runInfo = githubRun(runId)
    expectedHeadSha = runInfo.head_sha
    runUrl = runInfo.html_url
    downloaded = downloadGithubPacket(runId)
    packetPath = downloaded.jsonPath
    markdownPath = downloaded.markdownPath
    mode = 'github_current_run'
  } else {
    packetPath = latestLocalPacket()
    if (!packetPath) {
      if (required) throw new Error('No local edge-only-operator-evidence-packet artifact found')
      const artifactPath = writeAttestationArtifact({
        status: 'skipped',
        gate: 'P147_EDGE_ONLY_OPERATOR_EVIDENCE_PACKET_ATTESTATION',
        reason: 'missing_local_packet',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
    markdownPath = packetPath.replace(/\.json$/, '.md')
    assert(existsSync(markdownPath), 'P147 local Markdown artifact is missing')
  }

  const payload = JSON.parse(readFileSync(packetPath, 'utf8'))
  const markdownText = readFileSync(markdownPath, 'utf8')
  const summary = validatePacket(payload, markdownText, expectedHeadSha)
  const artifactPayload = {
    version: 1,
    gate: 'P147_EDGE_ONLY_OPERATOR_EVIDENCE_PACKET_ATTESTATION',
    status: payload.status,
    mode,
    runId,
    runUrl,
    expectedHeadSha,
    decision: payload.decision,
    runtimeTopology: payload.runtimeTopology,
    blockedStages: summary.blockedStages,
    requiredEvidenceCount: summary.requiredEvidenceCount,
    localIntentEnvPresent: summary.localIntentEnvPresent,
    sourcePacket: {
      jsonFile: relative(root, packetPath),
      markdownFile: relative(root, markdownPath),
    },
    boundary: {
      containsSecrets: false,
      containsPrivateResearchMaterial: false,
      exposesProviderPlumbing: false,
      requiresRemoteAgentRuntime: false,
    },
  }
  const privateMatches = scanNoPrivateText(JSON.stringify(artifactPayload))
  assert(privateMatches.length === 0, `P147 attestation leaked private terms: ${privateMatches.join(', ')}`)
  const artifactPath = writeAttestationArtifact(artifactPayload)
  console.log(JSON.stringify({
    status: artifactPayload.status,
    gate: artifactPayload.gate,
    mode,
    runId,
    runtimeTopology: artifactPayload.runtimeTopology,
    blockedStages: artifactPayload.blockedStages,
    artifactPath: relative(root, artifactPath),
  }, null, 2))
} finally {
  if (downloaded) downloaded.cleanup()
}
