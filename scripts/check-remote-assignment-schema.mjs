#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'
const defaultAssignmentPath = 'deploy/runtime-production/remote-assignment.local.json'
const assignmentPath = process.env.REMOTE_RUNTIME_ASSIGNMENT_FILE || defaultAssignmentPath
const required = process.env.REQUIRE_REMOTE_ASSIGNMENT_SCHEMA_READY === 'true'

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function runtimePath(path) {
  return String(path || '').startsWith('/') ? String(path) : join(root, path)
}

function maybeReadJson(rel) {
  const path = runtimePath(rel)
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf8'))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function isPlaceholder(value) {
  const text = String(value || '').trim()
  return /<.+>/.test(text)
    || /\bFILL_[A-Z0-9_]+\b/i.test(text)
    || /\bREPLACE_ME\b/i.test(text)
    || /\bYOUR[_-][A-Z0-9_-]+\b/i.test(text)
    || /\bTODO[_-][A-Z0-9_-]+\b/i.test(text)
}

function isProvided(value) {
  return Boolean(String(value || '').trim()) && !isPlaceholder(value)
}

function isRemoteHttps(value, { allowInvalid = false } = {}) {
  const normalized = normalizeOrigin(value)
  return /^https:\/\//.test(normalized)
    && !/localhost|127\.0\.0\.1|0\.0\.0\.0|\[?::1\]?/.test(normalized)
    && !/example\.com/.test(normalized)
    && (allowInvalid || !/\.invalid(\/|$)/.test(normalized))
    && !isPlaceholder(normalized)
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

function expectedImage(serviceManifest, id) {
  const service = serviceManifest.services.find(item => item.id === id)
  assert(service, `service manifest missing ${id}`)
  return service.imageName
}

function unexpectedKeys(object, allowed) {
  return Object.keys(object || {}).filter(key => !allowed.includes(key))
}

function checkShape(name, assignment, serviceManifest, options = {}) {
  const allowPlaceholders = options.allowPlaceholders === true
  const allowInvalid = options.allowInvalid === true
  const requireReadyFields = options.requireReadyFields === true
  const issues = []

  function add(condition, id, detail) {
    if (!condition) issues.push({ id, detail })
  }

  add(assignment && typeof assignment === 'object' && !Array.isArray(assignment), `${name}-object`, 'Assignment must be a JSON object.')
  if (!assignment || typeof assignment !== 'object' || Array.isArray(assignment)) return issues

  add(unexpectedKeys(assignment, ['version', 'gate', 'repository', 'hostTargetProfile', 'operator', 'services', 'pagesVariablesAfterHealth', 'notes']).length === 0, `${name}-top-level-keys`, 'Assignment has unsupported top-level keys.')
  add(assignment.version === 1, `${name}-version`, 'version must be 1.')
  add(assignment.gate === 'P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE', `${name}-gate`, 'gate must be P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE.')
  add(assignment.repository === repo, `${name}-repository`, `repository must be ${repo}.`)
  add(assignment.hostTargetProfile === serviceManifest.hostTargetProfile, `${name}-host-target`, `hostTargetProfile must be ${serviceManifest.hostTargetProfile}.`)

  const operator = assignment.operator || {}
  add(unexpectedKeys(operator, ['owner', 'provider', 'environment']).length === 0, `${name}-operator-keys`, 'operator has unsupported keys.')
  for (const field of ['owner', 'provider', 'environment']) {
    const value = operator[field]
    add(typeof value === 'string' && value.trim().length > 0, `${name}-operator-${field}`, `operator.${field} must be a non-empty string.`)
    if (requireReadyFields) add(isProvided(value), `${name}-operator-${field}-provided`, `operator.${field} must be filled before execution.`)
  }

  const services = assignment.services || {}
  add(unexpectedKeys(services, ['api', 'agent']).length === 0, `${name}-service-keys`, 'services must contain only api and agent.')
  for (const serviceId of ['api', 'agent']) {
    const service = services[serviceId] || {}
    const allowedKeys = serviceId === 'agent'
      ? ['serviceId', 'origin', 'image', 'providerSecretsConfigured', 'healthPath', 'dependsOn']
      : ['serviceId', 'origin', 'image', 'providerSecretsConfigured', 'healthPath']
    add(unexpectedKeys(service, allowedKeys).length === 0, `${name}-${serviceId}-keys`, `${serviceId} has unsupported keys.`)
    add(typeof service.serviceId === 'string' && service.serviceId.trim().length > 0, `${name}-${serviceId}-service-id`, `${serviceId}.serviceId must be a non-empty string.`)
    add(typeof service.origin === 'string' && service.origin.trim().length > 0, `${name}-${serviceId}-origin`, `${serviceId}.origin must be a non-empty string.`)
    add(typeof service.image === 'string' && service.image.startsWith(expectedImage(serviceManifest, serviceId)), `${name}-${serviceId}-image`, `${serviceId}.image must use the service manifest GHCR image.`)
    add(typeof service.providerSecretsConfigured === 'boolean', `${name}-${serviceId}-provider-secrets-flag`, `${serviceId}.providerSecretsConfigured must be boolean.`)
    add(typeof service.healthPath === 'string' && service.healthPath.startsWith('/'), `${name}-${serviceId}-health-path`, `${serviceId}.healthPath must start with /.`)
    if (serviceId === 'agent') add(Array.isArray(service.dependsOn) && service.dependsOn.includes('api'), `${name}-agent-depends-on-api`, 'agent.dependsOn must include api.')
    if (!allowPlaceholders) {
      add(isProvided(service.serviceId), `${name}-${serviceId}-service-id-provided`, `${serviceId}.serviceId must be filled.`)
      add(isRemoteHttps(service.origin, { allowInvalid }), `${name}-${serviceId}-remote-origin`, `${serviceId}.origin must be remote HTTPS${allowInvalid ? '' : ' and not .invalid'}.`)
    }
    if (requireReadyFields) add(service.providerSecretsConfigured === true, `${name}-${serviceId}-provider-secrets-ready`, `${serviceId}.providerSecretsConfigured must be true before execution.`)
  }

  const pages = assignment.pagesVariablesAfterHealth || {}
  add(unexpectedKeys(pages, ['VITE_PUBLIC_RUNTIME_MODE', 'VITE_API_ORIGIN', 'VITE_API_BASE_URL', 'VITE_AGENT_RUNTIME_BASE_URL']).length === 0, `${name}-pages-keys`, 'pagesVariablesAfterHealth has unsupported keys.')
  add(pages.VITE_PUBLIC_RUNTIME_MODE === 'live', `${name}-pages-live-mode`, 'VITE_PUBLIC_RUNTIME_MODE must be live.')
  add(typeof pages.VITE_API_ORIGIN === 'string' && pages.VITE_API_ORIGIN.trim().length > 0, `${name}-pages-api-origin`, 'VITE_API_ORIGIN must be present.')
  add(typeof pages.VITE_API_BASE_URL === 'string' && pages.VITE_API_BASE_URL.trim().length > 0, `${name}-pages-api-base-url`, 'VITE_API_BASE_URL must be present.')
  add(typeof pages.VITE_AGENT_RUNTIME_BASE_URL === 'string' && pages.VITE_AGENT_RUNTIME_BASE_URL.trim().length > 0, `${name}-pages-agent-origin`, 'VITE_AGENT_RUNTIME_BASE_URL must be present.')
  if (!allowPlaceholders) {
    const apiOrigin = normalizeOrigin(services.api?.origin)
    const agentOrigin = normalizeOrigin(services.agent?.origin)
    add(normalizeOrigin(pages.VITE_API_ORIGIN) === apiOrigin, `${name}-pages-api-origin-match`, 'VITE_API_ORIGIN must match services.api.origin.')
    add(normalizeOrigin(pages.VITE_AGENT_RUNTIME_BASE_URL) === agentOrigin, `${name}-pages-agent-origin-match`, 'VITE_AGENT_RUNTIME_BASE_URL must match services.agent.origin.')
    add(normalizeOrigin(pages.VITE_API_BASE_URL).startsWith(`${apiOrigin}/`), `${name}-pages-api-base-url-match`, 'VITE_API_BASE_URL must be under services.api.origin.')
  }

  const privateTerms = scanNoPrivateTerms(assignment)
  for (const pattern of privateTerms) issues.push({ id: `${name}-private-term`, detail: `Private term matched ${pattern}` })
  return issues
}

function summarize(name, path, assignment, issues, state) {
  return {
    name,
    path,
    status: issues.length ? 'blocked' : 'ready',
    state,
    issueCount: issues.length,
    issues: issues.map(item => item.id),
  }
}

const requiredFiles = [
  'deploy/runtime-production/remote-assignment.schema.json',
  'deploy/runtime-production/remote-assignment.example.json',
  'deploy/runtime-production/remote-assignment.fixture.json',
  'deploy/runtime-production/service-manifest.json',
  'docs/backend/P75_REMOTE_RUNTIME_ASSIGNMENT_INTAKE.md',
  'docs/backend/P79_REMOTE_ASSIGNMENT_EXECUTION_PACK.md',
  'docs/backend/P91_REMOTE_ASSIGNMENT_SCHEMA_GATE.md',
]
for (const file of requiredFiles) assert(existsSync(join(root, file)), `missing assignment schema file: ${file}`)

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:remote-assignment-schema'] === 'node scripts/check-remote-assignment-schema.mjs',
  'package.json must expose check:remote-assignment-schema',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:remote-assignment-schema'),
  'root npm run test must include check:remote-assignment-schema',
)

const schema = readJson('deploy/runtime-production/remote-assignment.schema.json')
assert(schema.title === 'Parallel Universe Novel Remote Runtime Assignment', 'remote assignment schema title mismatch')
assert(schema.properties?.services?.properties?.api, 'schema must define services.api')
assert(schema.properties?.services?.properties?.agent, 'schema must define services.agent')
assert(JSON.stringify(schema).includes('providerSecretsConfigured'), 'schema must include providerSecretsConfigured')
assert(scanNoPrivateTerms(schema).length === 0, 'schema must not contain private terms')

const serviceManifest = readJson('deploy/runtime-production/service-manifest.json')
const example = readJson('deploy/runtime-production/remote-assignment.example.json')
const fixture = readJson('deploy/runtime-production/remote-assignment.fixture.json')
const local = maybeReadJson(assignmentPath)

const exampleIssues = checkShape('example', example, serviceManifest, { allowPlaceholders: true })
const fixtureIssues = checkShape('fixture', fixture, serviceManifest, { allowInvalid: true, requireReadyFields: true })
const localIssues = local
  ? checkShape('local', local, serviceManifest, { requireReadyFields: true })
  : [{ id: 'local-assignment-file-present', detail: `${assignmentPath} does not exist yet.` }]
const localReadinessIssues = localIssues.filter(item =>
  /^local-(api|agent)-(service-id-provided|remote-origin|provider-secrets-ready)$/.test(item.id)
    || /^local-operator-(owner|provider)-provided$/.test(item.id),
)
const localHardIssues = local
  ? localIssues.filter(item => !localReadinessIssues.includes(item))
  : []

const files = [
  summarize('example', 'deploy/runtime-production/remote-assignment.example.json', example, exampleIssues, 'template'),
  summarize('fixture', 'deploy/runtime-production/remote-assignment.fixture.json', fixture, fixtureIssues, 'contract_fixture'),
  summarize('local', assignmentPath, local, localIssues, local ? 'operator_assignment' : 'waiting_for_operator'),
]
const hardIssues = [...exampleIssues, ...fixtureIssues]
if (localHardIssues.length) hardIssues.push(...localHardIssues)
const blockedStages = hardIssues.map(item => item.id)
const decision = hardIssues.length
  ? 'remote_assignment_schema_invalid'
  : local
    ? localReadinessIssues.length
      ? 'remote_assignment_schema_incomplete'
      : 'remote_assignment_schema_ready'
    : 'remote_assignment_schema_waiting_for_local_assignment'

const artifact = {
  version: 1,
  gate: 'P91_REMOTE_ASSIGNMENT_SCHEMA_GATE',
  generatedAt: new Date().toISOString(),
  repository: repo,
  required,
  decision,
  status: hardIssues.length ? 'blocked' : 'ready',
  assignmentPath,
  blockedStages: hardIssues.length ? blockedStages : localReadinessIssues.map(item => item.id),
  files,
  publicBoundary: {
    assignmentContentsIncluded: false,
    containsSecrets: false,
    containsReferenceWorkNames: false,
    exposesProviderPromptPlumbing: false,
  },
}

const artifactPrivateHits = scanNoPrivateTerms(artifact)
assert(artifactPrivateHits.length === 0, `schema artifact leaks private terms: ${artifactPrivateHits.join(', ')}`)

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `remote-assignment-schema-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

if (required && artifact.decision !== 'remote_assignment_schema_ready') {
  throw new Error(`remote assignment schema is not ready: ${artifact.blockedStages.join(', ') || 'local assignment missing'}`)
}

console.log(JSON.stringify({
  status: artifact.decision === 'remote_assignment_schema_ready' ? 'passed' : 'passed_waiting_for_operator_assignment',
  gate: artifact.gate,
  decision,
  blockedStages: artifact.blockedStages,
  artifactPath,
}, null, 2))
