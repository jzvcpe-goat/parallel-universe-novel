#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'
const publicUrl = process.env.PUBLIC_CREATOR_URL || 'https://jzvcpe-goat.github.io/parallel-universe-novel/'
const required = process.env.REQUIRE_LIVE_ROLLBACK_REHEARSED === 'true'

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertContains(file, terms) {
  const body = read(file)
  for (const term of terms) assert(body.includes(term), `${file} must include ${term}`)
}

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function tryGhVariables() {
  if (process.env.CHECK_GITHUB_REPO_VARS === 'false') {
    return { checked: false, source: 'disabled_by_env', values: {} }
  }
  try {
    const output = execFileSync('gh', ['variable', 'list', '--repo', repo, '--json', 'name,value'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
      timeout: 8000,
    })
    const values = {}
    for (const item of JSON.parse(output || '[]')) values[String(item.name)] = String(item.value || '')
    return { checked: true, source: 'gh_variable_list', values }
  } catch {
    if (process.env.GITHUB_ACTIONS === 'true') {
      return {
        checked: true,
        source: 'github_actions_vars_context',
        values: {
          VITE_PUBLIC_RUNTIME_MODE: process.env.VITE_PUBLIC_RUNTIME_MODE || '',
          VITE_API_ORIGIN: process.env.VITE_API_ORIGIN || '',
          VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || '',
          VITE_AGENT_RUNTIME_BASE_URL: process.env.VITE_AGENT_RUNTIME_BASE_URL || '',
        },
      }
    }
    return { checked: false, source: 'not_checked', values: {} }
  }
}

function envOrRepo(name, repoValues) {
  return normalizeOrigin(process.env[name] || repoValues[name] || '')
}

function latestArtifact(prefix) {
  if (!existsSync(artifactDir)) return null
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .sort()
  if (files.length === 0) return null
  const path = join(artifactDir, files[files.length - 1])
  try {
    return { path, payload: JSON.parse(readFileSync(path, 'utf8')) }
  } catch {
    return { path, payload: null }
  }
}

function stage(id, passed, detail, nextAction) {
  return {
    id,
    status: passed ? 'ready' : 'blocked',
    detail,
    nextAction,
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
    /system prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

async function fetchPublicHead(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), Number(process.env.LIVE_ROLLBACK_PUBLIC_TIMEOUT_MS || 10000))
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    })
    return {
      status: response.ok ? 'passed' : 'failed',
      httpStatus: response.status,
      url,
    }
  } catch (error) {
    return {
      status: 'failed',
      url,
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    clearTimeout(timer)
  }
}

function commandSet(commands) {
  return new Set((commands || []).map(command => String(command)))
}

const requiredFiles = [
  'deploy/runtime-production/service-manifest.json',
  'deploy/runtime-production/origin-execution-plan.json',
  'docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md',
  'docs/backend/P73_REMOTE_RUNTIME_ORIGIN_EXECUTION_GATE.md',
  'docs/backend/P74_REMOTE_RUNTIME_OPERATOR_HANDOFF.md',
  'docs/backend/P76_LIVE_CUTOVER_ATTESTATION_GATE.md',
  'docs/backend/P77_LIVE_ROLLBACK_REHEARSAL_GATE.md',
  'scripts/check-public-live-config.mjs',
  'scripts/check-public-runtime-preview.mjs',
  'scripts/check-github-actions-artifacts.mjs',
  '.github/workflows/pages.yml',
]

for (const file of requiredFiles) assert(existsSync(join(root, file)), `missing live rollback rehearsal file: ${file}`)

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:live-rollback-rehearsal'] === 'node scripts/check-live-rollback-rehearsal.mjs',
  'package.json must expose check:live-rollback-rehearsal',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:live-rollback-rehearsal'),
  'root npm run test must include check:live-rollback-rehearsal',
)

const serviceManifest = readJson('deploy/runtime-production/service-manifest.json')
const originPlan = readJson('deploy/runtime-production/origin-execution-plan.json')
const serviceRollback = commandSet(serviceManifest.rollbackCommands)
const originRollback = commandSet(originPlan.rollbackCommands)
const rollbackCommands = Array.from(new Set([
  ...(serviceManifest.rollbackCommands || []),
  ...(originPlan.rollbackCommands || []),
]))

assertContains('docs/backend/P77_LIVE_ROLLBACK_REHEARSAL_GATE.md', [
  'P77 Live Rollback Rehearsal Gate',
  'check:live-rollback-rehearsal',
  'live_rollback_static_preview_verified',
  'live_rollback_execution_unconfirmed',
  'live_rollback_rehearsed',
  'REQUIRE_LIVE_ROLLBACK_REHEARSED=true',
])
assertContains('docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md', [
  'Fast rollback to static preview',
  'gh variable set VITE_PUBLIC_RUNTIME_MODE --repo jzvcpe-goat/parallel-universe-novel --body disabled',
  'npm run check:live-rollback-rehearsal',
])
assertContains('.github/workflows/pages.yml', [
  'npm run check:live-rollback-rehearsal',
  'Upload live rollback rehearsal',
  'artifacts/runtime/live-rollback-rehearsal-*.json',
])

const repoVariables = tryGhVariables()
const mode = envOrRepo('VITE_PUBLIC_RUNTIME_MODE', repoVariables.values) || 'disabled'
const apiOrigin = envOrRepo('VITE_API_ORIGIN', repoVariables.values)
const apiBaseUrl = envOrRepo('VITE_API_BASE_URL', repoVariables.values)
const agentOrigin = envOrRepo('VITE_AGENT_RUNTIME_BASE_URL', repoVariables.values)
const rollbackOwner = String(process.env.ROLLBACK_OWNER_ID || repoVariables.values.ROLLBACK_OWNER_ID || '').trim()
const rollbackConfirmed = String(process.env.ROLLBACK_REHEARSAL_CONFIRMED || '').toLowerCase() === 'true'
const rollbackRunId = String(process.env.ROLLBACK_GITHUB_RUN_ID || '').trim()

const latestP76 = latestArtifact('live-cutover-attestation-')
const publicHead = await fetchPublicHead(publicUrl)

const requiredRollbackCommands = [
  'gh variable set VITE_PUBLIC_RUNTIME_MODE --repo jzvcpe-goat/parallel-universe-novel --body disabled',
  'gh variable delete VITE_API_ORIGIN --repo jzvcpe-goat/parallel-universe-novel --confirm',
  'gh variable delete VITE_AGENT_RUNTIME_BASE_URL --repo jzvcpe-goat/parallel-universe-novel --confirm',
  'gh workflow run "Deploy Creator Studio Preview" --repo jzvcpe-goat/parallel-universe-novel',
]

const hasRollbackCommands = requiredRollbackCommands.every(command => rollbackCommands.includes(command))
const staticPreviewSafe = mode !== 'live'
const originsClearedOrDisabled = mode !== 'live' || (!apiOrigin && !apiBaseUrl && !agentOrigin)
const ownerReady = Boolean(rollbackOwner)
const executionConfirmed = rollbackConfirmed && ownerReady && Boolean(rollbackRunId)

const stages = [
  stage('service-manifest-rollback-present', serviceRollback.has(requiredRollbackCommands[0]), 'service manifest disables public live mode', 'Keep service manifest rollback command in sync.'),
  stage('origin-plan-rollback-present', hasRollbackCommands, JSON.stringify(requiredRollbackCommands), 'Origin execution plan must include disable, origin cleanup and Pages redeploy commands.'),
  stage('public-mode-disabled-or-ready-to-disable', staticPreviewSafe, `current=${mode}`, 'Set VITE_PUBLIC_RUNTIME_MODE=disabled to roll back public runtime.'),
  stage('origin-vars-cleared-or-non-live', originsClearedOrDisabled, JSON.stringify({ apiOrigin: Boolean(apiOrigin), apiBaseUrl: Boolean(apiBaseUrl), agentOrigin: Boolean(agentOrigin) }), 'Delete remote origin variables when a live host is unsafe or compromised.'),
  stage('public-url-reachable', publicHead.status === 'passed', JSON.stringify(publicHead), 'Confirm GitHub Pages still serves the static preview after rollback.'),
  stage('cutover-artifact-linked', Boolean(latestP76), latestP76?.path || 'missing P76 artifact', 'Run check:live-cutover-attestation before rollback rehearsal.'),
  stage('rollback-owner-present', ownerReady || !required, rollbackOwner ? 'provided' : 'missing ROLLBACK_OWNER_ID', 'Assign a rollback owner before a real live rollback.'),
  stage('rollback-execution-confirmed', executionConfirmed || !required, rollbackConfirmed ? `run=${rollbackRunId || 'missing'}` : 'not confirmed', 'For strict rehearsal, set ROLLBACK_REHEARSAL_CONFIRMED=true and ROLLBACK_GITHUB_RUN_ID.'),
]

const blockedStages = stages.filter(item => item.status !== 'ready').map(item => item.id)
let decision = 'live_rollback_rehearsed'
if (!executionConfirmed) decision = 'live_rollback_execution_unconfirmed'
if (hasRollbackCommands && staticPreviewSafe && publicHead.status === 'passed' && !required) {
  decision = 'live_rollback_static_preview_verified'
}

const artifact = {
  version: 1,
  gate: 'P77_LIVE_ROLLBACK_REHEARSAL_GATE',
  generatedAt: new Date().toISOString(),
  repository: repo,
  required,
  decision,
  status: decision === 'live_rollback_rehearsed' || decision === 'live_rollback_static_preview_verified' ? 'ready' : 'blocked',
  publicUrl,
  publicHead,
  rollbackOwnerPresent: ownerReady,
  rollbackRunId: rollbackRunId || null,
  repoVariables: {
    checked: repoVariables.checked,
    source: repoVariables.source,
    present: {
      VITE_PUBLIC_RUNTIME_MODE: Boolean(repoVariables.values.VITE_PUBLIC_RUNTIME_MODE),
      VITE_API_ORIGIN: Boolean(repoVariables.values.VITE_API_ORIGIN),
      VITE_API_BASE_URL: Boolean(repoVariables.values.VITE_API_BASE_URL),
      VITE_AGENT_RUNTIME_BASE_URL: Boolean(repoVariables.values.VITE_AGENT_RUNTIME_BASE_URL),
      ROLLBACK_OWNER_ID: Boolean(repoVariables.values.ROLLBACK_OWNER_ID),
    },
  },
  publicRuntime: {
    mode,
    apiOriginPresent: Boolean(apiOrigin),
    apiBaseUrlPresent: Boolean(apiBaseUrl),
    agentOriginPresent: Boolean(agentOrigin),
  },
  evidence: {
    p76: latestP76 ? { path: latestP76.path, decision: latestP76.payload?.decision || null } : null,
  },
  rollbackCommands,
  stages,
  blockedStages,
  nextCommands: {
    disablePublicRuntime: requiredRollbackCommands[0],
    deleteApiOrigin: requiredRollbackCommands[1],
    deleteAgentOrigin: requiredRollbackCommands[2],
    redeployPages: requiredRollbackCommands[3],
    verifyDisabledConfig: 'VITE_PUBLIC_RUNTIME_MODE=disabled npm run check:public-live-config',
    verifyStaticPreview: 'npm run check:public-runtime-preview',
    strictRehearsal: 'ROLLBACK_OWNER_ID=<owner> ROLLBACK_REHEARSAL_CONFIRMED=true ROLLBACK_GITHUB_RUN_ID=<pages-run-id> REQUIRE_LIVE_ROLLBACK_REHEARSED=true npm run check:live-rollback-rehearsal',
  },
}

const privateMatches = scanNoPrivateTerms(artifact)
assert(privateMatches.length === 0, `live rollback rehearsal artifact leaks private terms: ${privateMatches.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `live-rollback-rehearsal-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

if (required && artifact.status !== 'ready') {
  throw new Error(`live rollback rehearsal is not confirmed: ${blockedStages.join(', ')}`)
}

console.log(JSON.stringify({
  status: artifact.status === 'ready' ? 'passed' : 'passed_with_rollback_blockers',
  gate: artifact.gate,
  decision,
  blockedStages,
  artifactPath,
}, null, 2))
