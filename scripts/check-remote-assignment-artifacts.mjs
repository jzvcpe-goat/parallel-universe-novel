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
import { basename, join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'
const required = process.env.CHECK_REMOTE_ASSIGNMENT_ARTIFACTS_REQUIRED === 'true'
const checkCurrentRun = process.env.CHECK_CURRENT_GITHUB_RUN_ARTIFACTS === 'true'
const source = process.env.CHECK_REMOTE_ASSIGNMENT_ARTIFACTS_SOURCE || (checkCurrentRun ? 'github' : 'local')

const specs = [
  {
    name: 'remote-assignment-schema',
    jsonPattern: /^remote-assignment-schema-.*\.json$/,
    mdPattern: null,
    exactJsonCount: 1,
    validate: validateSchemaArtifact,
  },
  {
    name: 'remote-assignment-execution-pack',
    jsonPattern: /^remote-assignment-execution-pack-.*\.json$/,
    mdPattern: /^remote-assignment-execution-pack-.*\.md$/,
    minJsonCount: 1,
    validate: validateExecutionPackArtifact,
  },
  {
    name: 'remote-assignment-fixture-gate',
    jsonPattern: /^remote-assignment-fixture-gate-.*\.json$/,
    mdPattern: null,
    exactJsonCount: 1,
    validate: validateFixtureArtifact,
  },
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

function latestLocalFiles(pattern, limit = 1) {
  if (!existsSync(artifactDir)) return []
  return readdirSync(artifactDir)
    .filter(name => pattern.test(name))
    .sort()
    .slice(-limit)
    .map(name => join(artifactDir, name))
}

function githubRun(runId) {
  return JSON.parse(run('gh', ['api', `repos/${repo}/actions/runs/${runId}`]))
}

function downloadGithubArtifact(runId, artifactName) {
  const dir = mkdtempSync(join(tmpdir(), `p93-${artifactName}-`))
  try {
    run('gh', ['run', 'download', String(runId), '--repo', repo, '--name', artifactName, '--dir', dir], {
      timeout: 60000,
    })
    return {
      dir,
      files: collectFiles(dir),
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

function validateSchemaArtifact(payload) {
  const privateMatches = scanNoPrivatePayload(payload)
  const fileNames = new Set((payload.files || []).map(file => file.name))
  const localEntry = (payload.files || []).find(file => file.name === 'local')

  assert(payload.version === 1, 'remote assignment schema artifact version must be 1')
  assert(payload.gate === 'P91_REMOTE_ASSIGNMENT_SCHEMA_GATE', 'remote assignment schema artifact gate mismatch')
  assert(payload.repository === repo, 'remote assignment schema artifact repository mismatch')
  assert(payload.assignmentPath === 'deploy/runtime-production/remote-assignment.local.json', 'remote assignment schema must target ignored local assignment path')
  assert(payload.decision !== 'remote_assignment_schema_invalid', 'remote assignment schema artifact must not be invalid')
  assert(payload.status === 'ready', 'remote assignment schema artifact must report ready schema contract')
  for (const name of ['example', 'fixture', 'local']) {
    assert(fileNames.has(name), `remote assignment schema artifact must include ${name} file status`)
  }
  assert(localEntry?.state === 'waiting_for_operator' || localEntry?.state === 'operator_assignment', 'local assignment state must be explicit')
  assert(
    [
      'remote_assignment_schema_waiting_for_local_assignment',
      'remote_assignment_schema_incomplete',
      'remote_assignment_schema_ready',
    ].includes(payload.decision),
    `remote assignment schema artifact decision is unsupported: ${payload.decision}`,
  )
  if (payload.decision === 'remote_assignment_schema_incomplete') {
    assert(localEntry?.state === 'operator_assignment', 'incomplete schema artifact must refer to an operator local assignment')
    assert(localEntry?.status === 'blocked', 'incomplete schema artifact local entry must remain blocked')
    assert(Array.isArray(payload.blockedStages) && payload.blockedStages.length > 0, 'incomplete schema artifact must include blocked stages')
  }
  assert(payload.publicBoundary?.assignmentContentsIncluded === false, 'schema artifact must not include assignment contents')
  assert(payload.publicBoundary?.containsSecrets === false, 'schema artifact must not contain secrets')
  assert(payload.publicBoundary?.containsReferenceWorkNames === false, 'schema artifact must not contain reference work names')
  assert(payload.publicBoundary?.exposesProviderPromptPlumbing === false, 'schema artifact must not expose provider prompt plumbing')
  assert(privateMatches.length === 0, `schema artifact leaked private terms: ${privateMatches.join(', ')}`)
}

function validateExecutionPackArtifact(payload) {
  const privateMatches = scanNoPrivatePayload(payload)
  const blockedStages = Array.isArray(payload.blockedStages) ? payload.blockedStages : []
  const isFixture = payload.assignmentPath === 'deploy/runtime-production/remote-assignment.fixture.json'
  const isLocal = payload.assignmentPath === 'deploy/runtime-production/remote-assignment.local.json'
  const isPlaceholderSentinel = basename(String(payload.assignmentPath || '')) === 'remote-assignment-placeholder-sentinel.fixture.json'

  assert(payload.version === 1, 'remote assignment execution pack artifact version must be 1')
  assert(payload.gate === 'P79_REMOTE_ASSIGNMENT_EXECUTION_PACK', 'remote assignment execution pack artifact gate mismatch')
  assert(payload.repository === repo, 'remote assignment execution pack artifact repository mismatch')
  assert(
    isFixture || isLocal || isPlaceholderSentinel,
    'execution pack assignment path must be fixture, ignored local assignment, or P110 placeholder sentinel fixture',
  )
  assert(
    ['assignment_execution_waiting_for_assignment', 'assignment_execution_incomplete', 'assignment_execution_pack_ready'].includes(payload.decision),
    `execution pack decision is unsupported: ${payload.decision}`,
  )
  assert(['ready', 'blocked'].includes(payload.status), `execution pack status is unsupported: ${payload.status}`)
  assert(privateMatches.length === 0, `execution pack artifact leaked private terms: ${privateMatches.join(', ')}`)

  if (payload.status === 'ready') {
    assert(payload.decision === 'assignment_execution_pack_ready', 'ready execution pack must use assignment_execution_pack_ready decision')
    assert(blockedStages.length === 0, 'ready execution pack must not have blocked stages')
    assert(Array.isArray(payload.commands?.health) && payload.commands.health.length === 2, 'ready execution pack must include API and Agent health commands')
    for (const command of [
      'check:remote-runtime-assignment-intake',
      'check:remote-origin-execution',
      'check:live-cutover-attestation',
      'check:remote-runtime-activation-control',
    ]) {
      assert(
        payload.commands?.strictGates?.some(item => String(item).includes(command)),
        `ready execution pack strict gates must include ${command}`,
      )
    }
    assert(Array.isArray(payload.commands?.rollback) && payload.commands.rollback.length >= 4, 'ready execution pack must include rollback commands')
  } else {
    assert(blockedStages.length > 0, 'blocked execution pack must explain blocked stages')
  }

  if (isFixture) {
    assert(payload.required === true, 'fixture execution pack must be strict')
    assert(payload.status === 'ready', 'fixture execution pack must be ready')
    assert(payload.services?.api?.origin === 'https://api.parallel-universe-runtime.invalid', 'fixture API origin must stay reserved .invalid domain')
    assert(payload.services?.agent?.origin === 'https://agent.parallel-universe-runtime.invalid', 'fixture Agent origin must stay reserved .invalid domain')
    assert(payload.pagesVariablesAfterHealth?.VITE_PUBLIC_RUNTIME_MODE === 'live', 'fixture execution pack must show post-health live variables only')
  }

  if (isPlaceholderSentinel) {
    assert(payload.required === false, 'placeholder sentinel execution pack must not be strict')
    assert(payload.status === 'blocked', 'placeholder sentinel execution pack must stay blocked')
    assert(payload.decision === 'assignment_execution_incomplete', 'placeholder sentinel execution pack must stay incomplete')
    for (const stage of ['api-service-id', 'agent-service-id', 'api-origin', 'agent-origin']) {
      assert(blockedStages.includes(stage), `placeholder sentinel execution pack must block ${stage}`)
    }
  }
}

function validateFixtureArtifact(payload) {
  const privateMatches = scanNoPrivatePayload(payload)

  assert(payload.status === 'passed', 'remote assignment fixture gate must pass')
  assert(payload.gate === 'P81_REMOTE_ASSIGNMENT_FIXTURE_GATE', 'remote assignment fixture gate mismatch')
  assert(payload.fixturePath === 'deploy/runtime-production/remote-assignment.fixture.json', 'fixture gate must use committed fixture path')
  assert(payload.contract?.fixtureIsNoSecret === true, 'fixture must be no-secret')
  assert(payload.contract?.fixtureOriginsAreReservedInvalidDomains === true, 'fixture origins must be reserved .invalid domains')
  assert(payload.contract?.p79StrictExecutionPack === 'assignment_execution_pack_ready', 'fixture must prove P79 strict execution pack readiness')
  assert(payload.contract?.p75HealthBoundary === 'remote_assignment_pending_health', 'fixture must preserve P75 health boundary')
  assert(payload.contract?.liveRuntimeClaimed === false, 'fixture must not claim live runtime')
  assert(payload.evidence?.p79?.status === 'passed', 'fixture gate P79 evidence must pass')
  assert(payload.evidence?.p79?.decision === 'assignment_execution_pack_ready', 'fixture gate P79 evidence decision mismatch')
  assert(payload.evidence?.p75?.decision === 'remote_assignment_pending_health', 'fixture gate P75 evidence must remain pending health')
  assert(privateMatches.length === 0, `fixture artifact leaked private terms: ${privateMatches.join(', ')}`)
}

function validateSpecFiles(spec, files) {
  const jsonFiles = files.filter(file => spec.jsonPattern.test(basename(file))).sort()
  const markdownFiles = spec.mdPattern ? files.filter(file => spec.mdPattern.test(basename(file))).sort() : []

  if (spec.exactJsonCount) {
    assert(jsonFiles.length === spec.exactJsonCount, `${spec.name} expected ${spec.exactJsonCount} JSON file(s), got ${jsonFiles.length}`)
  }
  if (spec.minJsonCount) {
    assert(jsonFiles.length >= spec.minJsonCount, `${spec.name} expected at least ${spec.minJsonCount} JSON file(s), got ${jsonFiles.length}`)
  }
  if (spec.mdPattern) {
    assert(markdownFiles.length >= 1, `${spec.name} expected at least one Markdown artifact`)
  }

  for (const file of jsonFiles) spec.validate(readJson(file))
  for (const file of markdownFiles) {
    const matches = scanNoPrivateText(readFileSync(file, 'utf8'))
    assert(matches.length === 0, `${spec.name} Markdown leaked private terms: ${matches.join(', ')}`)
  }

  return {
    artifact: spec.name,
    jsonFileCount: jsonFiles.length,
    markdownFileCount: markdownFiles.length,
  }
}

function writeAttestationArtifact(result) {
  mkdirSync(artifactDir, { recursive: true })
  const path = join(artifactDir, `remote-assignment-artifact-attestation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`)
  return path
}

let downloads = []
try {
  let runId = null
  let runUrl = null
  let expectedHeadSha = currentHead()
  let mode = 'local'
  const summaries = []

  if (source === 'github') {
    runId = String(process.env.GITHUB_RUN_ID || process.env.CHECK_GITHUB_ARTIFACTS_RUN_ID || '').trim()
    if (!runId) {
      if (required) throw new Error('GitHub artifact mode requires GITHUB_RUN_ID or CHECK_GITHUB_ARTIFACTS_RUN_ID')
      const artifactPath = writeAttestationArtifact({
        status: 'skipped',
        gate: 'P93_REMOTE_ASSIGNMENT_ARTIFACT_ATTESTATION',
        reason: 'missing_github_run_id',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
    const runInfo = githubRun(runId)
    expectedHeadSha = runInfo.head_sha
    runUrl = runInfo.html_url
    mode = 'github_current_run'
    for (const spec of specs) {
      const downloaded = downloadGithubArtifact(runId, spec.name)
      downloads.push(downloaded)
      summaries.push(validateSpecFiles(spec, downloaded.files))
    }
  } else {
    const localFilesByArtifact = new Map([
      ['remote-assignment-schema', latestLocalFiles(/^remote-assignment-schema-.*\.json$/, 1)],
      [
        'remote-assignment-execution-pack',
        [
          ...latestLocalFiles(/^remote-assignment-execution-pack-.*\.json$/, 2),
          ...latestLocalFiles(/^remote-assignment-execution-pack-.*\.md$/, 2),
        ],
      ],
      ['remote-assignment-fixture-gate', latestLocalFiles(/^remote-assignment-fixture-gate-.*\.json$/, 1)],
    ])
    for (const spec of specs) {
      const files = localFilesByArtifact.get(spec.name) || []
      if (!files.length) {
        if (required) throw new Error(`No local ${spec.name} artifact found`)
        const artifactPath = writeAttestationArtifact({
          status: 'skipped',
          gate: 'P93_REMOTE_ASSIGNMENT_ARTIFACT_ATTESTATION',
          reason: `missing_local_${spec.name}`,
          required,
        })
        console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
        process.exit(0)
      }
      summaries.push(validateSpecFiles(spec, files))
    }
  }

  assert(expectedHeadSha, 'expected head sha unavailable')
  const result = {
    version: 1,
    gate: 'P93_REMOTE_ASSIGNMENT_ARTIFACT_ATTESTATION',
    status: 'passed',
    generatedAt: new Date().toISOString(),
    repository: repo,
    mode,
    required,
    runId,
    runUrl,
    expectedHeadSha,
    artifacts: summaries,
    publicBoundary: {
      assignmentContentsIncluded: false,
      containsSecrets: false,
      containsReferenceWorkNames: false,
      exposesProviderPromptPlumbing: false,
      fixtureClaimsLiveRuntime: false,
    },
  }
  const artifactPath = writeAttestationArtifact(result)
  console.log(JSON.stringify({
    status: 'passed',
    gate: result.gate,
    mode,
    runId,
    expectedHeadSha,
    artifacts: summaries,
    artifactPath: relative(root, artifactPath),
  }, null, 2))
} finally {
  for (const downloaded of downloads) downloaded.cleanup()
}
