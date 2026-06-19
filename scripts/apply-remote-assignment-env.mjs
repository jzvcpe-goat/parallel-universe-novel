#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import {
  loadOperatorAssignmentEnvFile,
  redactedOperatorEnvFileSummary,
} from './operator-assignment-env-file.mjs'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')
const targetRel = process.env.REMOTE_RUNTIME_ASSIGNMENT_FILE || 'deploy/runtime-production/remote-assignment.local.json'
const targetPath = join(root, targetRel)
const checkOnly = process.argv.includes('--check') || process.env.REMOTE_ASSIGNMENT_ENV_APPLY_CHECK === 'true'
const confirm = process.argv.includes('--confirm') || process.env.REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM === 'true'
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'

const envSpec = {
  REMOTE_OPERATOR_OWNER: 'operator owner',
  REMOTE_OPERATOR_PROVIDER: 'hosting provider',
  REMOTE_API_SERVICE_ID: 'API service id',
  REMOTE_AGENT_SERVICE_ID: 'Agent service id',
  REMOTE_API_ORIGIN: 'API HTTPS origin',
  REMOTE_AGENT_ORIGIN: 'Agent HTTPS origin',
  REMOTE_API_SECRETS_CONFIGURED: 'API provider secret-store confirmation',
  REMOTE_AGENT_SECRETS_CONFIGURED: 'Agent provider secret-store confirmation',
}

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function readJsonPath(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
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
    return ''
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

function imageFor(payload, service) {
  const fragment = service === 'api'
    ? '/parallel-universe-novel-api:'
    : '/parallel-universe-novel-agent-runtime:'
  return (payload.images || []).find(item => String(item).includes(fragment)) || null
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

function readOperatorEnv() {
  const envFile = loadOperatorAssignmentEnvFile({
    root,
    allowedKeys: [...Object.keys(envSpec), 'REMOTE_RUNTIME_ENVIRONMENT'],
  })
  const effectiveEnv = envFile.effectiveEnv
  const missing = Object.keys(envSpec).filter(key => effectiveEnv[key] == null || String(effectiveEnv[key]).trim() === '')
  assert(missing.length === 0, `missing operator env vars: ${missing.join(', ')}`)
  const owner = validateTextValue('REMOTE_OPERATOR_OWNER', effectiveEnv.REMOTE_OPERATOR_OWNER)
  const provider = validateTextValue('REMOTE_OPERATOR_PROVIDER', effectiveEnv.REMOTE_OPERATOR_PROVIDER)
  const environment = String(effectiveEnv.REMOTE_RUNTIME_ENVIRONMENT || 'preview-or-production').trim()
  assert(environment.length > 0 && !isPlaceholder(environment), 'REMOTE_RUNTIME_ENVIRONMENT must not be empty or placeholder')
  assert(forbiddenValueMatches(environment).length === 0, 'REMOTE_RUNTIME_ENVIRONMENT looks like secret or private material')

  const apiServiceId = validateTextValue('REMOTE_API_SERVICE_ID', effectiveEnv.REMOTE_API_SERVICE_ID)
  const agentServiceId = validateTextValue('REMOTE_AGENT_SERVICE_ID', effectiveEnv.REMOTE_AGENT_SERVICE_ID)
  const apiOrigin = normalizeOrigin(effectiveEnv.REMOTE_API_ORIGIN)
  const agentOrigin = normalizeOrigin(effectiveEnv.REMOTE_AGENT_ORIGIN)
  assert(isRemoteHttpsOrigin(apiOrigin), 'REMOTE_API_ORIGIN must be a remote HTTPS origin without path, query, hash, localhost, .invalid or placeholders')
  assert(isRemoteHttpsOrigin(agentOrigin), 'REMOTE_AGENT_ORIGIN must be a remote HTTPS origin without path, query, hash, localhost, .invalid or placeholders')
  assert(apiOrigin !== agentOrigin, 'REMOTE_API_ORIGIN and REMOTE_AGENT_ORIGIN must be separate service origins')
  for (const [key, value] of Object.entries({ REMOTE_API_ORIGIN: apiOrigin, REMOTE_AGENT_ORIGIN: agentOrigin })) {
    const hits = forbiddenValueMatches(value)
    assert(hits.length === 0, `${key} looks like secret or private material: ${hits.join(', ')}`)
  }

  return {
    owner,
    provider,
    environment,
    apiServiceId,
    agentServiceId,
    apiOrigin,
    agentOrigin,
    apiProviderSecretsConfigured: parseBool(effectiveEnv.REMOTE_API_SECRETS_CONFIGURED, 'REMOTE_API_SECRETS_CONFIGURED'),
    agentProviderSecretsConfigured: parseBool(effectiveEnv.REMOTE_AGENT_SECRETS_CONFIGURED, 'REMOTE_AGENT_SECRETS_CONFIGURED'),
    operatorEnvFile: redactedOperatorEnvFileSummary(envFile),
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
    /profile\.id/,
    /kernel\.id/,
    /prompt_id/,
    /prompt_version/,
  ]
  return forbidden.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function assertWiring() {
  for (const file of [
    '.gitignore',
    'deploy/runtime-production/service-manifest.json',
    'deploy/runtime-production/remote-assignment.schema.json',
    'scripts/operator-assignment-env-file.mjs',
    'docs/backend/P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE.md',
    'docs/backend/P112_REMOTE_ASSIGNMENT_LOCAL_DRAFT_PREPARATION.md',
    'docs/backend/P116_REMOTE_ASSIGNMENT_ENV_APPLY_GATE.md',
    'scripts/apply-remote-assignment-env.mjs',
  ]) {
    assert(existsSync(join(root, file)), `missing P116 prerequisite: ${file}`)
  }

  const packageJson = readJson('package.json')
  assert(packageJson.scripts['apply:remote-assignment-env'] === 'node scripts/apply-remote-assignment-env.mjs', 'package.json must expose apply:remote-assignment-env')
  assert(packageJson.scripts['check:remote-assignment-env-apply'] === 'node scripts/apply-remote-assignment-env.mjs --check', 'package.json must expose check:remote-assignment-env-apply')
  assert(String(packageJson.scripts.test || '').includes('npm run check:remote-assignment-env-apply'), 'root npm run test must include check:remote-assignment-env-apply')

  const gitignore = read('.gitignore')
  assert(gitignore.includes('deploy/runtime-production/remote-assignment.local.json'), 'local assignment must be ignored by Git')
  assert(gitignore.includes('deploy/runtime-production/remote-assignment.*.local.json'), 'local assignment glob must be ignored by Git')

  for (const [file, terms] of [
    ['docs/backend/P116_REMOTE_ASSIGNMENT_ENV_APPLY_GATE.md', [
      'P116 Remote Assignment Env Apply Gate',
      'apply:remote-assignment-env',
      'check:remote-assignment-env-apply',
      'REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true',
      'REMOTE_ASSIGNMENT_ENV_FILE',
      'REMOTE_API_ORIGIN',
      'REMOTE_AGENT_ORIGIN',
      'provider secret store',
    ]],
    ['docs/backend/P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE.md', [
      'apply:remote-assignment-env',
      'REMOTE_OPERATOR_OWNER',
      'REMOTE_API_SERVICE_ID',
    ]],
    ['docs/backend/P112_REMOTE_ASSIGNMENT_LOCAL_DRAFT_PREPARATION.md', [
      'P116',
      'apply:remote-assignment-env',
    ]],
  ]) {
    const body = read(file)
    for (const term of terms) assert(body.includes(term), `${file} must include ${term}`)
  }
}

function currentImages() {
  const head = currentHead()
  if (!head) return { head: '', evidence: null, apiImage: null, agentImage: null }
  const evidence = latestArtifact('runtime-image-publish-evidence-', payload =>
    payload.status === 'passed'
      && payload.headSha === head
      && Array.isArray(payload.images)
      && payload.images.length >= 2,
  )
  assert(evidence, `missing current-head P72 image evidence for ${head}; run npm run check:runtime-image-publish-evidence first`)
  const apiImage = imageFor(evidence.payload, 'api')
  const agentImage = imageFor(evidence.payload, 'agent')
  assert(apiImage, 'current runtime image evidence missing API image')
  assert(agentImage, 'current runtime image evidence missing Agent Runtime image')
  return { head, evidence, apiImage, agentImage }
}

function applyAssignment(base, inputs, images) {
  assert(base.version === 1, 'assignment version must be 1')
  assert(base.gate === 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE', 'assignment gate must remain P75')
  assert(base.repository === repo, `assignment repository must be ${repo}`)
  assert(base.hostTargetProfile === 'docker-compatible-two-service-paas', 'assignment host target mismatch')

  return {
    ...base,
    operator: {
      owner: inputs.owner,
      provider: inputs.provider,
      environment: inputs.environment,
    },
    services: {
      api: {
        ...(base.services?.api || {}),
        serviceId: inputs.apiServiceId,
        origin: inputs.apiOrigin,
        image: images.apiImage,
        providerSecretsConfigured: inputs.apiProviderSecretsConfigured,
        healthPath: '/health',
      },
      agent: {
        ...(base.services?.agent || {}),
        serviceId: inputs.agentServiceId,
        origin: inputs.agentOrigin,
        image: images.agentImage,
        providerSecretsConfigured: inputs.agentProviderSecretsConfigured,
        healthPath: '/health',
        dependsOn: ['api'],
      },
    },
    pagesVariablesAfterHealth: {
      VITE_PUBLIC_RUNTIME_MODE: 'live',
      VITE_API_ORIGIN: inputs.apiOrigin,
      VITE_API_BASE_URL: `${inputs.apiOrigin}/v1`,
      VITE_AGENT_RUNTIME_BASE_URL: inputs.agentOrigin,
    },
    notes: [
      'Applied by P116 from non-secret operator environment variables.',
      'Secret values must remain in provider secret stores only.',
      'Run P75 strict mode after health endpoints are reachable.',
    ],
  }
}

function validateAppliedAssignment(assignment, images) {
  assert(assignment.services.api.image === images.apiImage, 'applied API image must match current P72 evidence')
  assert(assignment.services.agent.image === images.agentImage, 'applied Agent image must match current P72 evidence')
  assert(isRemoteHttpsOrigin(assignment.services.api.origin), 'applied API origin must be remote HTTPS')
  assert(isRemoteHttpsOrigin(assignment.services.agent.origin), 'applied Agent origin must be remote HTTPS')
  assert(assignment.pagesVariablesAfterHealth.VITE_API_ORIGIN === assignment.services.api.origin, 'Pages API origin must match assignment API origin')
  assert(assignment.pagesVariablesAfterHealth.VITE_API_BASE_URL === `${assignment.services.api.origin}/v1`, 'Pages API base URL must match assignment API origin')
  assert(assignment.pagesVariablesAfterHealth.VITE_AGENT_RUNTIME_BASE_URL === assignment.services.agent.origin, 'Pages Agent origin must match assignment Agent origin')
  assert(Array.isArray(assignment.services.agent.dependsOn) && assignment.services.agent.dependsOn.includes('api'), 'Agent must depend on API')
  const privateHits = scanNoPrivateTerms(assignment)
  assert(privateHits.length === 0, `applied assignment leaked private terms: ${privateHits.join(', ')}`)
}

function writeArtifact(payload) {
  mkdirSync(artifactDir, { recursive: true })
  const path = join(artifactDir, `remote-assignment-env-apply-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`)
  return path
}

assertWiring()

const images = currentImages()
if (!images.head) {
  if (checkOnly) {
    const artifactPath = writeArtifact({
      version: 1,
      gate: 'P116_REMOTE_ASSIGNMENT_ENV_APPLY_GATE',
      status: 'passed_with_source_workspace_no_git',
      mode: 'check',
      generatedAt: new Date().toISOString(),
      targetPath: targetRel,
      writesLocalAssignment: false,
      requiredEnvKeys: Object.keys(envSpec),
    })
    console.log(JSON.stringify({ status: 'passed_with_source_workspace_no_git', artifactPath: relative(root, artifactPath) }, null, 2))
    process.exit(0)
  }
  throw new Error('missing git head; run from release repo or set RUNTIME_IMAGE_HEAD_SHA before applying remote assignment env')
}

if (checkOnly) {
  const artifactPath = writeArtifact({
    version: 1,
    gate: 'P116_REMOTE_ASSIGNMENT_ENV_APPLY_GATE',
    status: 'passed',
    mode: 'check',
    generatedAt: new Date().toISOString(),
    targetPath: targetRel,
    currentHead: images.head,
    imageEvidence: relative(root, images.evidence.file),
    writesLocalAssignment: false,
    requiredEnvKeys: Object.keys(envSpec),
  })
  console.log(JSON.stringify({
    status: 'passed',
    gate: 'P116_REMOTE_ASSIGNMENT_ENV_APPLY_GATE',
    mode: 'check',
    targetPath: targetRel,
    writesLocalAssignment: false,
    artifactPath: relative(root, artifactPath),
  }, null, 2))
  process.exit(0)
}

assert(confirm, 'apply mode requires REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true or --confirm')
assert(existsSync(targetPath), `${targetRel} does not exist; run npm run prepare:remote-assignment-local first`)

const inputs = readOperatorEnv()
const base = readJsonPath(targetPath)
const applied = applyAssignment(base, inputs, images)
validateAppliedAssignment(applied, images)

mkdirSync(dirname(targetPath), { recursive: true })
writeFileSync(targetPath, `${JSON.stringify(applied, null, 2)}\n`)

const artifactPayload = {
  version: 1,
  gate: 'P116_REMOTE_ASSIGNMENT_ENV_APPLY_GATE',
  status: 'passed',
  mode: 'applied',
  generatedAt: new Date().toISOString(),
  targetPath: targetRel,
  currentHead: images.head,
  imageEvidence: relative(root, images.evidence.file),
  operatorEnvFile: inputs.operatorEnvFile,
  writesLocalAssignment: true,
  appliedFields: {
    operatorOwner: true,
    operatorProvider: true,
    runtimeEnvironment: true,
    apiServiceId: true,
    agentServiceId: true,
    apiOrigin: true,
    agentOrigin: true,
    apiProviderSecretsConfigured: inputs.apiProviderSecretsConfigured,
    agentProviderSecretsConfigured: inputs.agentProviderSecretsConfigured,
  },
  redaction: {
    serviceIdsIncluded: false,
    originsIncluded: false,
    secretValuesIncluded: false,
    providerTokensIncluded: false,
  },
  nextCommands: [
    'npm run check:remote-runtime-assignment-intake',
    'REQUIRE_REMOTE_ASSIGNMENT_READY=true npm run check:remote-runtime-assignment-intake',
    'REQUIRE_REMOTE_ORIGIN_EXECUTED=true npm run check:remote-origin-execution',
  ],
}
const privateHits = scanNoPrivateTerms(artifactPayload)
assert(privateHits.length === 0, `P116 artifact leaked private terms: ${privateHits.join(', ')}`)
const artifactPath = writeArtifact(artifactPayload)

console.log(JSON.stringify({
  status: 'passed',
  gate: 'P116_REMOTE_ASSIGNMENT_ENV_APPLY_GATE',
  mode: 'applied',
  targetPath: targetRel,
  currentHead: images.head,
  writesLocalAssignment: true,
  artifactPath: relative(root, artifactPath),
  nextCommand: 'npm run check:remote-runtime-assignment-intake',
}, null, 2))
