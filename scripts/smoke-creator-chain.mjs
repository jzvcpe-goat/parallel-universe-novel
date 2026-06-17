#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'node:net'

const root = resolve(new URL('..', import.meta.url).pathname)
const tempDir = mkdtempSync(join(tmpdir(), 'narrativeos-creator-smoke-'))
const children = []
const logs = []
const runtimeRules = JSON.parse(readFileSync(join(root, 'docs/product/rules/genre-runtime-rules.v1.json'), 'utf8'))
const smokeProfile = runtimeRules.constraintProfiles.find(profile => (
  profile.signalTerms?.length && profile.entryModeSignals?.length && profile.toneSignals?.length
)) || runtimeRules.constraintProfiles[0]
const smokeKernel = smokeProfile ? runtimeRules.genreKernels.find(kernel => (
  kernel.compatibleProfiles || []
).includes(smokeProfile.id)) : undefined

const blockedPublicTerms = [
  'system prompt',
  'provider',
  'fallback',
  'rawHash',
  'StateVector',
  'AgentRun',
  'CHANGES JSON',
  'canon_written',
  'branch_written',
]

function logLine(prefix, chunk) {
  const text = chunk.toString()
  logs.push(`${prefix} ${text}`)
  if (process.env.SMOKE_VERBOSE) process.stderr.write(`${prefix} ${text}`)
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

function start(name, command, args, env) {
  const child = spawn(command, args, {
    cwd: root,
    env: {
      ...process.env,
      ...env,
    },
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', chunk => logLine(`[${name}]`, chunk))
  child.stderr.on('data', chunk => logLine(`[${name}:err]`, chunk))
  child.on('exit', code => {
    if (code !== null && code !== 0) logs.push(`[${name}] exited ${code}`)
  })
  children.push(child)
  return child
}

async function waitForJson(url, timeoutMs = 30000) {
  const started = Date.now()
  let lastError = ''
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return response.json()
      lastError = `http_${response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    await delay(350)
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}`)
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`${url} failed ${response.status}: ${text}`)
  }
  return JSON.parse(text)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function firstText(values, fallback) {
  return values?.find(value => String(value || '').trim().length > 0) || fallback
}

function seedForProfile(profile) {
  const signal = firstText(profile.signalTerms, profile.displayName)
  const entry = firstText(profile.entryModeSignals, '一个必须立刻处理的开场事件')
  const tone = firstText(profile.toneSignals, '选择代价')
  return `我想写${profile.displayName}，从${entry}开始，${signal}和${tone}会把人物推到选择前。`
}

function assertRuntimeRuleHandshake(agentRules, fastapiRules) {
  assert(agentRules && typeof agentRules === 'object', 'agent health must expose runtime rule metadata')
  assert(fastapiRules && typeof fastapiRules === 'object', 'FastAPI creator dialogue must expose runtime rule metadata')
  assert(agentRules.version === fastapiRules.version, 'agent and FastAPI rule versions must match')
  assert(agentRules.source === fastapiRules.source, 'agent and FastAPI rule sources must match')
  assert(agentRules.profileCount === fastapiRules.profile_count, 'agent and FastAPI profile counts must match')
  assert(agentRules.kernelCount === fastapiRules.kernel_count, 'agent and FastAPI kernel counts must match')
  assert(
    agentRules.privacy?.representativeWorks === fastapiRules.privacy?.representative_works,
    'agent and FastAPI representative work privacy policies must match',
  )
  assert(
    agentRules.privacy?.publicReferenceField === fastapiRules.privacy?.public_reference_field,
    'agent and FastAPI public reference privacy fields must match',
  )
}

function assertPublicCopy(value, path = 'payload') {
  if (value == null) return
  if (typeof value === 'string') {
    for (const term of blockedPublicTerms) {
      assert(!value.includes(term), `${path} leaks internal term: ${term}`)
    }
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertPublicCopy(item, `${path}[${index}]`))
    return
  }
  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      assertPublicCopy(child, `${path}.${key}`)
    }
  }
}

function shutdown() {
  for (const child of children) {
    if (child.killed) continue
    try {
      if (process.platform === 'win32') {
        child.kill('SIGTERM')
      } else {
        process.kill(-child.pid, 'SIGTERM')
      }
    } catch {
      child.kill('SIGTERM')
    }
  }
  rmSync(tempDir, { recursive: true, force: true })
}

process.on('SIGINT', () => {
  shutdown()
  process.exit(130)
})
process.on('SIGTERM', () => {
  shutdown()
  process.exit(143)
})

try {
  const apiPort = await freePort()
  const agentPort = await freePort()
  const apiBaseUrl = `http://127.0.0.1:${apiPort}`
  const agentBaseUrl = `http://127.0.0.1:${agentPort}`

  start('api', 'node', [
    'scripts/run-backend-python.mjs',
    '-m',
    'uvicorn',
    'narrativeos.api.app_factory:create_app',
    '--factory',
    '--app-dir',
    'backend/src',
    '--host',
    '127.0.0.1',
    '--port',
    String(apiPort),
  ], {
    DATABASE_URL: `sqlite:///${join(tempDir, 'creator-smoke.db')}`,
    NARRATIVEOS_CREATOR_DIALOGUE_DIR: join(tempDir, 'creator_dialogue_sessions'),
  })

  await waitForJson(`${apiBaseUrl}/health`)

  start('agents', 'npm', ['--workspace', '@narrativeos/agent-runtime', 'run', 'dev'], {
    MASTRA_HOST: '127.0.0.1',
    MASTRA_PORT: String(agentPort),
    MASTRA_TOOL_BRIDGE_BASE_URL: apiBaseUrl,
  })

  const agentHealth = await waitForJson(`${agentBaseUrl}/health`)
  assert(agentHealth.runtimeRules?.version >= 2, 'agent health must expose shared runtime rule version')
  assert(smokeProfile, 'runtime rule JSON must contain at least one profile for smoke')
  assert(smokeKernel, `${smokeProfile.id} must have a compatible smoke kernel`)

  const creatorDialogue = await postJson(`${apiBaseUrl}/v1/creator/dialogue/sessions`, {
    creator_id: 'smoke_author',
    seed: seedForProfile(smokeProfile),
    genre: smokeProfile.displayName,
    context: {
      story_direction: {
        label: smokeProfile.displayName,
        keywords: [
          smokeProfile.displayName,
          firstText(smokeProfile.signalTerms, smokeProfile.displayName),
          firstText(smokeProfile.entryModeSignals, smokeProfile.displayName),
        ].join(' '),
      },
    },
  })
  assertRuntimeRuleHandshake(
    agentHealth.runtimeRules,
    creatorDialogue.setting_cards?.genre_constraint_facts?.runtime_rules,
  )

  const seed = seedForProfile(smokeProfile)
  const createPayload = {
    seed,
    genre: smokeProfile.displayName,
    creatorId: 'smoke_author',
    context: {
      story_direction: {
        label: smokeProfile.displayName,
        tone: firstText(smokeProfile.toneSignals, smokeProfile.displayName),
        keywords: [
          smokeProfile.displayName,
          firstText(smokeProfile.signalTerms, smokeProfile.displayName),
          firstText(smokeProfile.entryModeSignals, smokeProfile.displayName),
        ].join(' '),
      },
      main_universe_template: {
        title: `${smokeProfile.displayName}开场`,
        genre: smokeProfile.displayName,
      },
    },
  }

  const created = await postJson(`${agentBaseUrl}/v1/workflows/socratic-create`, createPayload)
  assert(created.candidateDraft?.status === 'candidate', 'candidate draft status must be candidate')
  assert(String(created.candidateDraft?.body || '').length >= 200, 'candidate draft must contain a readable opening')
  assert(Array.isArray(created.questions) && created.questions.length <= 2, 'workflow must ask at most two questions')
  assert(
    (created.activeConstraints || []).some(item => item.profileId === smokeProfile.id),
    `selected document genre must activate ${smokeProfile.id} constraints`,
  )
  assert(
    created.activeConstraints?.[0]?.profileId === smokeProfile.id,
    `selected document genre must make ${smokeProfile.id} the primary active constraint`,
  )
  assert(
    (created.activeKernels || []).some(item => item.kernelId === smokeKernel.id),
    `selected document genre must activate ${smokeKernel.id}`,
  )
  assert(
    created.activeKernels?.[0]?.kernelId === smokeKernel.id,
    `selected document genre must make ${smokeKernel.id} the primary active kernel`,
  )
  assert(
    (created.runTrace || []).some(item => item.step === 'tool_bridge.socratic_turn' && item.status === 'ok'),
    'socratic create must use FastAPI Tool Bridge',
  )
  assert(
    !String(created.candidateDraft?.body || '').includes('本轮节拍'),
    'candidate draft must not expose beat-plan scaffolding',
  )
  assert(
    !String(created.candidateDraft?.body || '').includes(' -> '),
    'candidate draft must not expose planning delimiters',
  )
  assertPublicCopy({
    candidateDraft: created.candidateDraft,
    questions: created.questions,
  }, 'socraticCreate.publicCopy')

  const quality = await postJson(`${agentBaseUrl}/v1/workflows/quality-brake`, {
    ...createPayload,
    sessionId: created.sessionId,
    projectId: created.projectId,
    context: {
      ...createPayload.context,
      mastra_local_output: created,
    },
  })

  assert(['checked', 'repair_suggested'].includes(quality.status), 'quality workflow must return a usable status')
  assert(quality.revisedCandidate?.status === 'candidate', 'quality workflow must keep revised text as candidate')
  assert(quality.writeback?.canon_written === false, 'quality workflow must not write canon')
  assert(quality.writeback?.branch_written === false, 'quality workflow must not write branch')
  assert(
    (quality.runTrace || []).some(item => item.step === 'fastapi.quality_check' && item.status === 'ok'),
    'quality workflow must be accepted by FastAPI Tool Bridge',
  )
  assertPublicCopy({
    revisedCandidate: quality.revisedCandidate,
    repairPlan: quality.repairPlan,
  }, 'qualityBrake.publicCopy')

  const preview = await postJson(`${agentBaseUrl}/v1/workflows/state-preview`, {
    ...createPayload,
    sessionId: created.sessionId,
    projectId: created.projectId,
    context: {
      ...createPayload.context,
      mastra_local_output: created,
    },
  })

  assert(preview.status === 'preview_only', 'state preview must remain preview_only')
  assert(Array.isArray(preview.stateDeltaCandidate) && preview.stateDeltaCandidate.length > 0, 'state preview must return candidate state deltas')
  assert(preview.writeback?.canon_written === false, 'state preview must not write canon')
  assert(preview.writeback?.branch_written === false, 'state preview must not write branch')
  assert(
    (preview.runTrace || []).some(item => item.step === 'fastapi.state_preview' && item.status === 'ok'),
    'state preview must be accepted by FastAPI Tool Bridge',
  )

  console.log(JSON.stringify({
    status: 'passed',
    api: apiBaseUrl,
    agents: agentBaseUrl,
    runId: created.runId,
    projectId: created.projectId,
    sessionId: created.sessionId,
    activeConstraints: created.activeConstraints.map(item => item.profileId),
    activeKernels: created.activeKernels.map(item => item.kernelId),
    qualityStatus: quality.status,
    stateDeltaCount: preview.stateDeltaCandidate.length,
    writeback: preview.writeback,
  }, null, 2))
} catch (error) {
  console.error('creator chain smoke failed')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  console.error(logs.slice(-80).join('\n'))
  process.exitCode = 1
} finally {
  shutdown()
}
