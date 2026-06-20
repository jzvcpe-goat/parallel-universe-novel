#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import {
  OPERATOR_ASSIGNMENT_ENV_FILE_KEY,
  loadOperatorAssignmentEnvFile,
  redactedOperatorEnvFileSummary,
} from './operator-assignment-env-file.mjs'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')
const required = process.env.REQUIRE_REMOTE_ASSIGNMENT_ENV_DRY_RUN_READY === 'true'
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'

const fullRemoteAssignmentEnvKeys = [
  'REMOTE_OPERATOR_OWNER',
  'REMOTE_OPERATOR_PROVIDER',
  'REMOTE_API_SERVICE_ID',
  'REMOTE_AGENT_SERVICE_ID',
  'REMOTE_API_ORIGIN',
  'REMOTE_AGENT_ORIGIN',
]

const edgeOnlyAssignmentEnvKeys = [
  'REMOTE_RUNTIME_MODE',
  'REMOTE_OPERATOR_OWNER',
  'REMOTE_OPERATOR_PROVIDER',
  'REMOTE_API_SERVICE_ID',
  'REMOTE_API_ORIGIN',
  'REMOTE_AGENT_REMOTE_REQUIRED',
  'REMOTE_AI_GENERATION_CLOUD_RUNTIME',
  'REMOTE_READER_CAN_TRIGGER_AI',
]

const fullRemoteSecretConfirmationEnvKeys = [
  'REMOTE_API_SECRETS_CONFIGURED',
  'REMOTE_AGENT_SECRETS_CONFIGURED',
]

const edgeOnlySecretConfirmationEnvKeys = [
  'REMOTE_API_SECRETS_CONFIGURED',
  'REMOTE_AGENT_SECRETS_CONFIGURED',
]

const legacyRequiredEnvKeys = [...fullRemoteAssignmentEnvKeys, ...fullRemoteSecretConfirmationEnvKeys]
const optionalEnvKeys = [
  'REMOTE_RUNTIME_ENVIRONMENT',
  'REMOTE_RUNTIME_MODE',
  'REMOTE_FRONTEND_SERVICE_ID',
  'REMOTE_FRONTEND_ORIGIN',
  'REMOTE_FRONTEND_SECRETS_CONFIGURED',
  'REMOTE_AGENT_REMOTE_REQUIRED',
  'REMOTE_AGENT_LOCATION',
  'REMOTE_AI_GENERATION_CLOUD_RUNTIME',
  'REMOTE_READER_CAN_TRIGGER_AI',
  'REMOTE_AGENT_ABSENCE_REASON',
]

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function currentHead() {
  if (process.env.RUNTIME_IMAGE_HEAD_SHA) return process.env.RUNTIME_IMAGE_HEAD_SHA.trim()
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 8000,
    }).trim()
  } catch {
    return 'source-workspace-no-git'
  }
}

function latestArtifact(prefix, predicate = null) {
  if (!existsSync(artifactDir)) return null
  const files = readdirSync(artifactDir)
    .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
    .map(name => join(artifactDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  for (const file of files) {
    const payload = JSON.parse(readFileSync(file, 'utf8'))
    if (!predicate || predicate(payload)) return { file, payload }
  }
  return null
}

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function isPlaceholder(value) {
  const text = String(value || '').trim()
  return /<[^>]+>/.test(text)
    || /\bFILL_[A-Z0-9_]+\b/i.test(text)
    || /\bREPLACE_ME\b/i.test(text)
    || /\bYOUR[_-][A-Z0-9_-]+\b/i.test(text)
    || /\bTODO[_-][A-Z0-9_-]+\b/i.test(text)
}

function forbiddenValueMatches(value) {
  const text = String(value || '')
  const forbidden = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL/i,
    /postgres(ql)?:\/\//i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/i,
    /NARRATIVEOS_TOOL_BRIDGE_TOKEN/i,
    /MASTRA_TOOL_BRIDGE_TOKEN/i,
    /NARRATIVEOS_CREATOR_API_KEY/i,
    /Authorization:\s*Bearer/i,
    /system prompt/i,
    /provider prompt/i,
    /rawState/i,
    /reference-work-vault/i,
    /representative work/i,
    /sourceRefs/i,
    /profile\.id/i,
    /kernel\.id/i,
    /prompt_id/i,
    /prompt_version/i,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function validateTextValue(key, value) {
  assert(typeof value === 'string' && value.trim().length > 0, `${key} is required`)
  assert(!isPlaceholder(value), `${key} must not be a placeholder`)
  assert(!/\s/.test(value.trim()), `${key} must not contain whitespace`)
  const hits = forbiddenValueMatches(value)
  assert(hits.length === 0, `${key} looks like secret or private material: ${hits.join(', ')}`)
  return value.trim()
}

function isRemoteHttpsOrigin(value) {
  const normalized = normalizeOrigin(value)
  try {
    const url = new URL(normalized)
    return url.protocol === 'https:'
      && url.pathname === '/'
      && !url.search
      && !url.hash
      && !/localhost|127\.0\.0\.1|0\.0\.0\.0|\[?::1\]?/.test(url.hostname)
      && !/\.invalid$/i.test(url.hostname)
      && !/example\.com$/i.test(url.hostname)
      && !isPlaceholder(normalized)
  } catch {
    return false
  }
}

function parseBool(value, key) {
  if (value === 'true') return true
  if (value === 'false') return false
  throw new Error(`${key} must be exactly true or false`)
}

function parseBoolExpected(env, key, expected) {
  const actual = parseBool(String(env[key] ?? '').trim(), key)
  assert(actual === expected, `${key} must be ${expected}`)
  return actual
}

function runtimeMode(env) {
  const mode = String(env.REMOTE_RUNTIME_MODE || '').trim()
  if (!mode) return 'full-remote'
  assert(['edge-only', 'hybrid', 'full-remote'].includes(mode), 'REMOTE_RUNTIME_MODE must be edge-only, hybrid, or full-remote')
  return mode
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
    /profile\.id/,
    /kernel\.id/,
    /prompt_id/,
    /prompt_version/,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function assertIncludes(file, terms) {
  const body = read(file)
  for (const term of terms) assert(body.includes(term), `${file} must include ${term}`)
}

function assertWiring() {
  for (const file of [
    '.gitignore',
    'deploy/runtime-production/remote-assignment.schema.json',
    'deploy/runtime-production/remote-assignment.example.json',
    'scripts/operator-assignment-env-file.mjs',
    'docs/backend/P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE.md',
    'docs/backend/P105_REMOTE_ASSIGNMENT_FILL_PLAN_GATE.md',
	    'docs/backend/P116_REMOTE_ASSIGNMENT_ENV_APPLY_GATE.md',
	    'docs/backend/P117_REMOTE_ASSIGNMENT_ENV_DRY_RUN_GATE.md',
	    'docs/backend/P138_REMOTE_ASSIGNMENT_COMPILER_V3.md',
	    'scripts/apply-remote-assignment-env.mjs',
	    'scripts/check-remote-assignment-env-dry-run.mjs',
  ]) {
    assert(existsSync(join(root, file)), `missing P117 prerequisite: ${file}`)
  }

  const packageJson = readJson('package.json')
  assert(
    packageJson.scripts['check:remote-assignment-env-dry-run'] === 'node scripts/check-remote-assignment-env-dry-run.mjs',
    'package.json must expose check:remote-assignment-env-dry-run',
  )
  assert(
    String(packageJson.scripts.test || '').includes('npm run check:remote-assignment-env-dry-run'),
    'root npm run test must include check:remote-assignment-env-dry-run',
  )

  const gitignore = read('.gitignore')
  assert(gitignore.includes('deploy/runtime-production/remote-assignment.local.json'), 'local assignment must be ignored by Git')
  assert(gitignore.includes('deploy/runtime-production/remote-assignment.*.local.json'), 'local assignment glob must be ignored by Git')

  assertIncludes('docs/backend/P117_REMOTE_ASSIGNMENT_ENV_DRY_RUN_GATE.md', [
    'P117 Remote Assignment Env Dry-Run Gate',
    'check:remote-assignment-env-dry-run',
    'does not write',
    'REMOTE_ASSIGNMENT_ENV_FILE',
    'REMOTE_API_ORIGIN',
    'REMOTE_AGENT_ORIGIN',
  ])
	  assertIncludes('docs/backend/P116_REMOTE_ASSIGNMENT_ENV_APPLY_GATE.md', [
	    'P117',
	    'REMOTE_RUNTIME_ENVIRONMENT',
	  ])
  assertIncludes('docs/backend/P138_REMOTE_ASSIGNMENT_COMPILER_V3.md', [
    'REMOTE_RUNTIME_MODE=edge-only',
    'remote-health:check',
  ])
	}

function envSummary(env) {
  const mode = runtimeMode(env)
  const isEdgeOnly = mode === 'edge-only'
  const assignmentEnvKeys = isEdgeOnly ? edgeOnlyAssignmentEnvKeys : fullRemoteAssignmentEnvKeys
  const secretConfirmationEnvKeys = isEdgeOnly ? edgeOnlySecretConfirmationEnvKeys : fullRemoteSecretConfirmationEnvKeys
  const requiredEnvKeys = isEdgeOnly
    ? [...edgeOnlyAssignmentEnvKeys, ...edgeOnlySecretConfirmationEnvKeys]
    : legacyRequiredEnvKeys
  const allKnownKeys = Array.from(new Set([...legacyRequiredEnvKeys, ...edgeOnlyAssignmentEnvKeys, ...edgeOnlySecretConfirmationEnvKeys, ...optionalEnvKeys]))
  const providedKnown = allKnownKeys.filter(key => env[key] != null && String(env[key]).trim() !== '')
  const providedAssignment = assignmentEnvKeys.filter(key => env[key] != null && String(env[key]).trim() !== '')
  const providedSecretConfirmations = secretConfirmationEnvKeys.filter(key => env[key] != null && String(env[key]).trim() !== '')
  const providedOptional = optionalEnvKeys.filter(key => env[key] != null && String(env[key]).trim() !== '')
  const missingAssignment = assignmentEnvKeys.filter(key => !providedAssignment.includes(key))
  const missingSecretConfirmations = secretConfirmationEnvKeys.filter(key => !providedSecretConfirmations.includes(key))
  const operatorIntentPresent = providedKnown.length > 0
  return {
    runtimeMode: mode,
    requiredEnvKeys,
    providedRequired: [...providedAssignment, ...providedSecretConfirmations],
    providedAssignment,
    providedSecretConfirmations,
    providedOptional,
    missingRequired: [...missingAssignment, ...missingSecretConfirmations],
    missingAssignment,
    missingSecretConfirmations,
    operatorIntentPresent,
  }
}

function validateOperatorEnv(summary, env) {
  if (!summary.operatorIntentPresent) {
    return {
      mode: 'waiting_for_operator_env',
      decision: 'operator_env_not_supplied',
      strictReady: false,
      originShape: null,
      providerSecretConfirmations: {
        api: false,
        agent: false,
      },
    }
  }

  assert(summary.missingAssignment.length === 0, `partial operator env supplied; missing: ${summary.missingAssignment.join(', ')}`)
  assert(summary.missingSecretConfirmations.length === 0, `partial operator env supplied; missing: ${summary.missingSecretConfirmations.join(', ')}`)

  const owner = validateTextValue('REMOTE_OPERATOR_OWNER', env.REMOTE_OPERATOR_OWNER)
  const provider = validateTextValue('REMOTE_OPERATOR_PROVIDER', env.REMOTE_OPERATOR_PROVIDER)
  const environment = String(env.REMOTE_RUNTIME_ENVIRONMENT || 'preview-or-production').trim()
  assert(environment.length > 0 && !isPlaceholder(environment), 'REMOTE_RUNTIME_ENVIRONMENT must not be empty or placeholder')
  assert(forbiddenValueMatches(environment).length === 0, 'REMOTE_RUNTIME_ENVIRONMENT looks like secret or private material')
  validateTextValue('REMOTE_API_SERVICE_ID', env.REMOTE_API_SERVICE_ID)
  const apiOrigin = normalizeOrigin(env.REMOTE_API_ORIGIN)
  assert(isRemoteHttpsOrigin(apiOrigin), 'REMOTE_API_ORIGIN must be a remote HTTPS origin without path, query, hash, localhost, .invalid or placeholders')
  for (const [key, value] of Object.entries({ REMOTE_API_ORIGIN: apiOrigin })) {
    const hits = forbiddenValueMatches(value)
    assert(hits.length === 0, `${key} looks like secret or private material: ${hits.join(', ')}`)
  }
  const apiSecrets = parseBool(env.REMOTE_API_SECRETS_CONFIGURED || 'false', 'REMOTE_API_SECRETS_CONFIGURED')
  const mode = summary.runtimeMode

  if (mode === 'edge-only') {
    parseBoolExpected(env, 'REMOTE_AGENT_REMOTE_REQUIRED', false)
    parseBoolExpected(env, 'REMOTE_AI_GENERATION_CLOUD_RUNTIME', false)
    parseBoolExpected(env, 'REMOTE_READER_CAN_TRIGGER_AI', false)
    const agentServiceId = String(env.REMOTE_AGENT_SERVICE_ID || '').trim()
    const agentOrigin = String(env.REMOTE_AGENT_ORIGIN || '').trim()
    assert(agentServiceId === '', 'REMOTE_AGENT_SERVICE_ID must be empty for edge-only runtime')
    assert(agentOrigin === '', 'REMOTE_AGENT_ORIGIN must be empty for edge-only runtime')
    const agentSecrets = parseBool(env.REMOTE_AGENT_SECRETS_CONFIGURED || 'false', 'REMOTE_AGENT_SECRETS_CONFIGURED')
    assert(agentSecrets === false, 'REMOTE_AGENT_SECRETS_CONFIGURED must be false for edge-only runtime')
    const strictReady = apiSecrets

    return {
      mode: strictReady ? 'operator_env_ready_for_edge_only_contract' : 'operator_env_valid_but_missing_secret_confirmation',
      decision: strictReady ? 'operator_env_ready_for_runtime_contract' : 'operator_env_waiting_for_secret_store_confirmation',
      strictReady,
      runtimeMode: mode,
      originShape: {
        apiRemoteHttps: true,
        agentRemoteHttps: false,
        distinctOrigins: null,
        agentAbsenceExpected: true,
      },
      providerSecretConfirmations: {
        api: apiSecrets,
        agent: false,
      },
      validatedFields: {
        operatorOwner: Boolean(owner),
        operatorProvider: Boolean(provider),
        runtimeEnvironment: Boolean(environment),
        runtimeMode: true,
        apiServiceId: true,
        agentServiceId: false,
        apiOrigin: true,
        agentOrigin: false,
      },
    }
  }

  validateTextValue('REMOTE_AGENT_SERVICE_ID', env.REMOTE_AGENT_SERVICE_ID)
  const agentOrigin = normalizeOrigin(env.REMOTE_AGENT_ORIGIN)
  assert(isRemoteHttpsOrigin(agentOrigin), 'REMOTE_AGENT_ORIGIN must be a remote HTTPS origin without path, query, hash, localhost, .invalid or placeholders')
  assert(apiOrigin !== agentOrigin, 'REMOTE_API_ORIGIN and REMOTE_AGENT_ORIGIN must be separate service origins')
  const agentOriginHits = forbiddenValueMatches(agentOrigin)
  assert(agentOriginHits.length === 0, `REMOTE_AGENT_ORIGIN looks like secret or private material: ${agentOriginHits.join(', ')}`)
  if (mode !== 'full-remote') parseBoolExpected(env, 'REMOTE_AGENT_REMOTE_REQUIRED', true)
  const agentSecrets = parseBool(env.REMOTE_AGENT_SECRETS_CONFIGURED || 'false', 'REMOTE_AGENT_SECRETS_CONFIGURED')
  const strictReady = apiSecrets && agentSecrets

  return {
    mode: strictReady ? 'operator_env_ready_for_apply' : 'operator_env_valid_but_missing_secret_confirmation',
    decision: strictReady ? 'operator_env_ready_for_p116_apply' : 'operator_env_waiting_for_secret_store_confirmation',
    strictReady,
    runtimeMode: mode,
    originShape: {
      apiRemoteHttps: true,
      agentRemoteHttps: true,
      distinctOrigins: true,
    },
    providerSecretConfirmations: {
      api: apiSecrets,
      agent: agentSecrets,
    },
    validatedFields: {
      operatorOwner: Boolean(owner),
      operatorProvider: Boolean(provider),
      runtimeEnvironment: Boolean(environment),
      apiServiceId: true,
      agentServiceId: true,
      apiOrigin: true,
      agentOrigin: true,
    },
  }
}

function currentImages(head) {
  if (head === 'source-workspace-no-git') return { imageEvidence: null, apiImageCurrent: false, agentImageCurrent: false }
  const evidence = latestArtifact('runtime-image-publish-evidence-', payload =>
    payload.status === 'passed'
      && payload.headSha === head
      && Array.isArray(payload.images)
      && payload.images.length >= 2,
  )
  assert(evidence, `missing current-head P72 image evidence for ${head}; run npm run check:runtime-image-publish-evidence first`)
  const apiImage = evidence.payload.images.find(item => String(item).includes('/parallel-universe-novel-api:'))
  const agentImage = evidence.payload.images.find(item => String(item).includes('/parallel-universe-novel-agent-runtime:'))
  assert(apiImage && apiImage.includes(head), 'P72 evidence must include current API image')
  assert(agentImage && agentImage.includes(head), 'P72 evidence must include current Agent Runtime image')
  return {
    imageEvidence: relative(root, evidence.file),
    apiImageCurrent: true,
    agentImageCurrent: true,
  }
}

function writeArtifact(payload) {
  mkdirSync(artifactDir, { recursive: true })
  const path = join(artifactDir, `remote-assignment-env-dry-run-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`)
  return path
}

assertWiring()

const head = currentHead()
const envFile = loadOperatorAssignmentEnvFile({
  root,
  allowedKeys: Array.from(new Set([...legacyRequiredEnvKeys, ...edgeOnlyAssignmentEnvKeys, ...edgeOnlySecretConfirmationEnvKeys, ...optionalEnvKeys])),
})
const summary = envSummary(envFile.effectiveEnv)
const validation = validateOperatorEnv(summary, envFile.effectiveEnv)
const images = currentImages(head)
const targetPath = 'deploy/runtime-production/remote-assignment.local.json'

const artifact = {
  version: 1,
  gate: 'P117_REMOTE_ASSIGNMENT_ENV_DRY_RUN_GATE',
  status: validation.strictReady
    ? 'passed_operator_env_ready'
    : validation.mode === 'waiting_for_operator_env'
      ? 'passed_waiting_for_operator_env'
      : 'passed_with_operator_env_followup_required',
  decision: validation.decision,
  generatedAt: new Date().toISOString(),
  repository: repo,
  currentHead: head,
  imageEvidence: images.imageEvidence,
  targetPath,
  operatorEnvFile: redactedOperatorEnvFileSummary(envFile),
  writesLocalAssignment: false,
  createsRemoteServices: false,
  setsGitHubVariables: false,
  storesProviderSecrets: false,
  promotesLiveRuntime: false,
  requiredEnvKeys: summary.requiredEnvKeys,
  optionalEnvKeys,
  providedRequiredCount: summary.providedRequired.length,
  missingRequiredKeys: summary.missingRequired,
  originShape: validation.originShape,
  runtimeMode: validation.runtimeMode || summary.runtimeMode,
  providerSecretConfirmations: validation.providerSecretConfirmations,
  redaction: {
    serviceIdsIncluded: false,
    originsIncluded: false,
    providerSecretsIncluded: false,
    providerTokensIncluded: false,
    promptPlumbingIncluded: false,
    referenceVaultIncluded: false,
  },
  p116ApplyPreflight: {
    readyForApply: validation.strictReady && summary.runtimeMode !== 'edge-only',
    readyForRuntimeContract: validation.strictReady && summary.runtimeMode === 'edge-only',
    applyCommand: summary.runtimeMode === 'edge-only'
      ? 'npm run remote-assignment:prepare'
      : envFile.loaded
        ? `${OPERATOR_ASSIGNMENT_ENV_FILE_KEY}=${envFile.relPath} REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true npm run apply:remote-assignment-env`
        : 'REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true npm run apply:remote-assignment-env',
  },
  nextCommands: validation.strictReady
    ? summary.runtimeMode === 'edge-only'
      ? [
          'npm run remote-assignment:prepare',
          'npm run check:remote-runtime-assignment-intake',
          'npm run remote-health:check',
        ]
      : [
          envFile.loaded
            ? `${OPERATOR_ASSIGNMENT_ENV_FILE_KEY}=${envFile.relPath} REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true npm run apply:remote-assignment-env`
            : 'REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true npm run apply:remote-assignment-env',
          'npm run check:remote-runtime-assignment-intake',
          'REQUIRE_REMOTE_ASSIGNMENT_READY=true npm run check:remote-runtime-assignment-intake',
        ]
    : [
        'Fill all required REMOTE_* environment variables outside Git.',
        envFile.loaded
          ? `${OPERATOR_ASSIGNMENT_ENV_FILE_KEY}=${envFile.relPath} npm run check:remote-assignment-env-dry-run`
          : 'npm run check:remote-assignment-env-dry-run',
        envFile.loaded
          ? `${OPERATOR_ASSIGNMENT_ENV_FILE_KEY}=${envFile.relPath} REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true npm run apply:remote-assignment-env`
          : 'REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true npm run apply:remote-assignment-env',
      ],
}

const privateHits = scanNoPrivateTerms(artifact)
assert(privateHits.length === 0, `P117 artifact leaked private terms: ${privateHits.join(', ')}`)
if (required && !validation.strictReady) {
  throw new Error(`P117 dry-run is not ready for apply: ${artifact.decision}`)
}

const artifactPath = writeArtifact(artifact)
console.log(JSON.stringify({
  status: artifact.status,
  gate: artifact.gate,
  decision: artifact.decision,
  currentHead: artifact.currentHead,
  writesLocalAssignment: false,
  readyForApply: validation.strictReady && summary.runtimeMode !== 'edge-only',
  readyForRuntimeContract: validation.strictReady && summary.runtimeMode === 'edge-only',
  operatorEnvFileLoaded: envFile.loaded,
  missingRequiredKeys: summary.missingRequired,
  artifactPath: relative(root, artifactPath),
}, null, 2))
