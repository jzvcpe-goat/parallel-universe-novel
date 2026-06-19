#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:net'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const required = process.env.REQUIRE_RUNTIME_IMAGE_LOCAL_SMOKE === 'true'
const allowPull = required || process.env.RUNTIME_IMAGE_LOCAL_SMOKE_PULL === 'true'
const pullTimeoutMs = Number.parseInt(process.env.RUNTIME_IMAGE_LOCAL_SMOKE_PULL_TIMEOUT_MS || '600000', 10)
const token = 'image-smoke-local-token'
const debugKey = 'image-smoke-debug-key'
const runId = `pun-image-smoke-${Date.now()}`

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function command(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: root,
    env: { ...process.env, ...(options.env || {}) },
    stdio: options.stdio || ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    timeout: options.timeout || 30000,
  })
}

function errorText(error) {
  return [
    error instanceof Error ? error.message : String(error),
    typeof error === 'object' && error && 'stdout' in error ? String(error.stdout || '') : '',
    typeof error === 'object' && error && 'stderr' in error ? String(error.stderr || '') : '',
  ].join('\n')
}

function isRegistryUnavailable(error) {
  return /registry-1\.docker\.io|ghcr\.io|denied|unauthorized|TLS handshake timeout|i\/o timeout|EOF|failed to do request|network|timed out|timeout|ETIMEDOUT/i
    .test(errorText(error))
}

function currentHead() {
  if (process.env.RUNTIME_IMAGE_HEAD_SHA) return process.env.RUNTIME_IMAGE_HEAD_SHA.trim()
  try {
    return command('git', ['rev-parse', 'HEAD']).trim()
  } catch {
    return ''
  }
}

function latestRuntimeImageEvidence(head) {
  if (!existsSync(artifactDir)) return null
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith('runtime-image-publish-evidence-') && name.endsWith('.json'))
    .map(name => join(artifactDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)

  for (const file of files) {
    const payload = JSON.parse(readFileSync(file, 'utf8'))
    if (payload.status === 'passed' && payload.headSha === head && Array.isArray(payload.images)) {
      return { file, payload }
    }
  }
  return null
}

function imageFor(payload, service) {
  const fragment = service === 'api'
    ? '/parallel-universe-novel-api:'
    : '/parallel-universe-novel-agent-runtime:'
  return (payload.images || []).find(item => String(item).includes(fragment)) || null
}

function dockerAvailable() {
  try {
    command('docker', ['info'], { timeout: 15000 })
    return true
  } catch {
    return false
  }
}

function docker(args, options = {}) {
  return command('docker', args, {
    timeout: options.timeout || 120000,
    stdio: options.stdio || ['ignore', 'pipe', 'pipe'],
  })
}

function imageExists(image) {
  try {
    docker(['image', 'inspect', image], { timeout: 15000 })
    return true
  } catch {
    return false
  }
}

function pullImage(image) {
  docker(['pull', image], { timeout: Number.isFinite(pullTimeoutMs) && pullTimeoutMs > 0 ? pullTimeoutMs : 600000 })
}

function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close(() => resolvePort(port))
    })
  })
}

async function fetchJson(url, timeoutMs = 5000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    const text = await response.text()
    let payload = null
    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      payload = { raw: text.slice(0, 160) }
    }
    if (!response.ok) throw new Error(`${url} failed ${response.status}: ${JSON.stringify(payload)}`)
    return payload
  } finally {
    clearTimeout(timer)
  }
}

async function waitForJson(url, timeoutMs = 120000) {
  const started = Date.now()
  let lastError = ''
  while (Date.now() - started < timeoutMs) {
    try {
      return await fetchJson(url)
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    await delay(1000)
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}`)
}

async function postJson(url, payload, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(payload),
  })
  const text = await response.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text.slice(0, 160) }
  }
  if (!response.ok) throw new Error(`${url} failed ${response.status}: ${JSON.stringify(body)}`)
  return body
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
    /NARRATIVEOS_TOOL_BRIDGE_TOKEN=(?!<)/,
    /MASTRA_TOOL_BRIDGE_TOKEN=(?!<)/,
    /system prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
    /sourceRefs/,
    /profile\.id/,
    /kernel\.id/,
    /candidateDraft"\s*:\s*\{/i,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function writeArtifact(payload) {
  mkdirSync(artifactDir, { recursive: true })
  const artifactPath = join(artifactDir, `runtime-image-local-smoke-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(artifactPath, `${JSON.stringify(payload, null, 2)}\n`)
  return artifactPath
}

function publicOutput(payload, artifactPath) {
  return {
    status: payload.status,
    gate: payload.gate,
    decision: payload.decision,
    currentHead: payload.currentHead,
    images: payload.images,
    health: payload.health,
    workflow: payload.workflow,
    artifactPath: relative(root, artifactPath),
  }
}

function validateWiring() {
  const packageJson = readJson('package.json')
  for (const file of [
    'package.json',
    'docs/backend/P72_RUNTIME_IMAGE_PUBLISH_EVIDENCE_GATE.md',
    'docs/backend/P113_REMOTE_ASSIGNMENT_IMAGE_DRIFT_GATE.md',
    'docs/backend/P114_RUNTIME_IMAGE_LOCAL_SMOKE_GATE.md',
    'scripts/check-runtime-image-local-smoke.mjs',
  ]) {
    assert(existsSync(join(root, file)), `missing P114 prerequisite: ${file}`)
  }
  assert(
    packageJson.scripts['check:runtime-image-local-smoke'] === 'node scripts/check-runtime-image-local-smoke.mjs',
    'package.json must expose check:runtime-image-local-smoke',
  )
  assert(
    String(packageJson.scripts.test || '').includes('npm run check:runtime-image-local-smoke'),
    'root npm run test must include check:runtime-image-local-smoke',
  )
}

async function runSmoke({ apiImage, agentImage }) {
  const apiPort = await freePort()
  const agentPort = await freePort()
  const network = `${runId}-net`
  const apiName = `${runId}-api`
  const agentName = `${runId}-agent`
  let networkCreated = false
  let apiStarted = false
  let agentStarted = false

  try {
    docker(['network', 'create', network])
    networkCreated = true
    docker([
      'run',
      '-d',
      '--pull=never',
      '--name', apiName,
      '--network', network,
      '--network-alias', 'api',
      '-p', `${apiPort}:8787`,
      '-e', 'DATABASE_URL=sqlite:////tmp/narrativeos_image_smoke.db',
      '-e', 'NARRATIVEOS_DEPLOY_ENV=local',
      '-e', 'NARRATIVEOS_ALLOWED_ORIGINS=http://127.0.0.1:5173,https://jzvcpe-goat.github.io',
      '-e', `NARRATIVEOS_TOOL_BRIDGE_TOKEN=${token}`,
      '-e', 'NARRATIVEOS_CREATOR_DIALOGUE_DIR=/tmp/creator_dialogue_sessions',
      '-e', 'NARRATIVEOS_CANON_LEDGER_DIR=/tmp/canon_commit_ledger',
      apiImage,
    ])
    apiStarted = true
    docker([
      'run',
      '-d',
      '--pull=never',
      '--name', agentName,
      '--network', network,
      '-p', `${agentPort}:4111`,
      '-e', 'MASTRA_HOST=0.0.0.0',
      '-e', 'MASTRA_PORT=4111',
      '-e', 'NARRATIVEOS_DEPLOY_ENV=local',
      '-e', 'MASTRA_TOOL_BRIDGE_BASE_URL=http://api:8787',
      '-e', `MASTRA_TOOL_BRIDGE_TOKEN=${token}`,
      '-e', 'MASTRA_ALLOWED_ORIGINS=http://127.0.0.1:5173,https://jzvcpe-goat.github.io',
      '-e', `MASTRA_DEBUG_RESPONSE_KEY=${debugKey}`,
      agentImage,
    ])
    agentStarted = true

    const apiHealth = await waitForJson(`http://127.0.0.1:${apiPort}/health`)
    const agentHealth = await waitForJson(`http://127.0.0.1:${agentPort}/health`)
    assert(apiHealth.status === 'ok' || apiHealth.status === 'healthy', 'API image health must be ok')
    assert(agentHealth.status === 'ok' || agentHealth.status === 'healthy', 'Agent image health must be ok')
    assert(agentHealth.service === 'narrativeos-agent-runtime', 'Agent image health must identify narrativeos-agent-runtime')

    const created = await postJson(
      `http://127.0.0.1:${agentPort}/v1/workflows/socratic-create`,
      {
        seed: '一座雾港灯塔在无月夜重新亮起，守灯人必须判断该公开真相，还是先救下唯一幸存者。',
        genre: '玄幻悬疑',
        creatorId: 'image_smoke_author',
        context: {
          story_direction: {
            label: '玄幻悬疑',
            keywords: '玄幻悬疑 灯塔 古契 选择代价',
          },
        },
      },
      { 'X-NarrativeOS-Debug-Key': debugKey },
    )

    const draftLength = String(created.candidateDraft?.body || '').length
    assert(created.candidateDraft?.status === 'candidate', 'image workflow must return candidate draft')
    assert(draftLength >= 200, 'image workflow candidate must be readable')
    assert(Array.isArray(created.questions) && created.questions.length <= 2, 'image workflow must ask at most two questions')
    assert(
      (created.runTrace || []).some(item => item.step === 'tool_bridge.socratic_turn' && item.status === 'ok'),
      'image workflow must call FastAPI Tool Bridge',
    )

    return {
      status: 'passed',
      ports: { api: apiPort, agent: agentPort },
      health: {
        api: { status: apiHealth.status },
        agent: { status: agentHealth.status, service: agentHealth.service },
      },
      workflow: {
        status: created.candidateDraft.status,
        draftLength,
        questionCount: created.questions.length,
        toolBridgeAccepted: true,
      },
    }
  } catch (error) {
    for (const [name, started] of [[apiName, apiStarted], [agentName, agentStarted]]) {
      if (!started) continue
      try {
        const logs = docker(['logs', '--tail', '140', name], { timeout: 60000 })
        process.stderr.write(`\n--- ${name} logs ---\n${logs}\n--- end ${name} logs ---\n`)
      } catch (logError) {
        process.stderr.write(`log collection failed for ${name}: ${errorText(logError)}\n`)
      }
    }
    throw error
  } finally {
    for (const name of [agentName, apiName]) {
      try {
        docker(['rm', '-f', name], { timeout: 60000, stdio: ['ignore', 'ignore', 'ignore'] })
      } catch {
        // best-effort cleanup
      }
    }
    if (networkCreated) {
      try {
        docker(['network', 'rm', network], { timeout: 60000, stdio: ['ignore', 'ignore', 'ignore'] })
      } catch {
        // best-effort cleanup
      }
    }
  }
}

validateWiring()

const head = currentHead()
if (!head) {
  const artifact = {
    version: 1,
    gate: 'P114_RUNTIME_IMAGE_LOCAL_SMOKE_GATE',
    status: 'passed_with_source_workspace_no_git',
    generatedAt: new Date().toISOString(),
    currentHead: null,
    decision: 'source_workspace_no_git',
    images: {},
    health: {},
    workflow: {},
  }
  const artifactPath = writeArtifact(artifact)
  console.log(JSON.stringify(publicOutput(artifact, artifactPath), null, 2))
  process.exit(0)
}

const evidence = latestRuntimeImageEvidence(head)
assert(evidence, `missing current-head P72 image evidence for ${head}; run npm run check:runtime-image-publish-evidence`)
const apiImage = imageFor(evidence.payload, 'api')
const agentImage = imageFor(evidence.payload, 'agent')
assert(apiImage, 'current P72 evidence missing API image')
assert(agentImage, 'current P72 evidence missing Agent Runtime image')

let decision = 'runtime_images_not_local'
let status = 'skipped'
let health = {}
let workflow = {}
let ports = {}
let skipReason = null

if (!dockerAvailable()) {
  skipReason = 'docker_daemon_unavailable'
} else {
  const missing = [apiImage, agentImage].filter(image => !imageExists(image))
  if (missing.length && allowPull) {
    try {
      for (const image of missing) pullImage(image)
    } catch (error) {
      if (!isRegistryUnavailable(error)) throw error
      skipReason = 'container_registry_unavailable'
    }
  } else if (missing.length) {
    skipReason = 'images_not_local'
  }

  if (!skipReason) {
    const smoke = await runSmoke({ apiImage, agentImage })
    status = smoke.status
    decision = 'runtime_images_local_smoke_passed'
    health = smoke.health
    workflow = smoke.workflow
    ports = smoke.ports
  }
}

if (skipReason) {
  decision = skipReason
  status = 'skipped'
}

const artifact = {
  version: 1,
  gate: 'P114_RUNTIME_IMAGE_LOCAL_SMOKE_GATE',
  status,
  generatedAt: new Date().toISOString(),
  currentHead: head,
  imageEvidence: relative(root, evidence.file),
  decision,
  strictRequired: required,
  pullAllowed: allowPull,
  pullTimeoutMs: allowPull ? pullTimeoutMs : null,
  images: {
    api: apiImage,
    agent: agentImage,
  },
  ports,
  health,
  workflow,
  publicBoundary: {
    credentialValues: 'not_included',
    rawProviderPayloads: 'not_included',
    candidateDraftBody: 'not_included',
    referenceVaultMaterial: 'not_included',
  },
  nextCommand: status === 'passed'
    ? 'REMOTE_RUNTIME_ASSIGNMENT_FILE=deploy/runtime-production/remote-assignment.local.json npm run check:remote-runtime-assignment-intake'
    : 'REQUIRE_RUNTIME_IMAGE_LOCAL_SMOKE=true RUNTIME_IMAGE_LOCAL_SMOKE_PULL=true npm run check:runtime-image-local-smoke',
}

const privateViolations = scanNoPrivateTerms(artifact)
assert(privateViolations.length === 0, `P114 artifact privacy violations: ${privateViolations.join(', ')}`)
const artifactPath = writeArtifact(artifact)
console.log(JSON.stringify(publicOutput(artifact, artifactPath), null, 2))

if (required && status !== 'passed') {
  throw new Error(`Runtime image local smoke did not pass: ${decision}`)
}
