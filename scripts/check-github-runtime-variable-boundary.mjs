#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'
const artifactDir = join(root, 'artifacts', 'runtime')

const allowedRuntimeVariables = new Set([
  'VITE_PUBLIC_RUNTIME_MODE',
  'VITE_API_ORIGIN',
  'VITE_API_BASE_URL',
  'VITE_AGENT_RUNTIME_BASE_URL',
  'REMOTE_API_SERVICE_ID',
  'REMOTE_AGENT_SERVICE_ID',
  'REMOTE_API_SECRETS_CONFIGURED',
  'REMOTE_AGENT_SECRETS_CONFIGURED',
])

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertIncludes(file, terms) {
  const body = read(file)
  for (const term of terms) assert(body.includes(term), `${file} must include ${term}`)
}

function tryGhVariables() {
  if (process.env.CHECK_GITHUB_REPO_VARS === 'false') return { checked: false, source: 'disabled_by_env', variables: [] }
  try {
    const output = execFileSync('gh', ['variable', 'list', '--repo', repo, '--json', 'name,value,updatedAt'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 30000,
    })
    return {
      checked: true,
      source: 'gh_variable_list',
      variables: JSON.parse(output || '[]').map(item => ({
        name: String(item.name || ''),
        value: String(item.value || ''),
        updatedAt: item.updatedAt || null,
      })),
    }
  } catch {
    return { checked: false, source: 'gh_unavailable', variables: [] }
  }
}

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function isPlaceholder(value) {
  return /<.+>/.test(String(value || ''))
}

function isRemoteHttps(value) {
  const normalized = normalizeOrigin(value)
  return /^https:\/\//.test(normalized)
    && !/localhost|127\.0\.0\.1|0\.0\.0\.0|\[?::1\]?/.test(normalized)
    && !/example\.com/.test(normalized)
    && !/\.invalid(\/|$)/.test(normalized)
    && !isPlaceholder(normalized)
}

function secretValueMatches(value) {
  const text = String(value || '')
  const patterns = [
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL=/i,
    /postgres(ql)?:\/\/[^<]/i,
    /mysql:\/\/[^<]/i,
    /mongodb(\+srv)?:\/\/[^<]/i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/,
    /Authorization:\s*Bearer\s+/i,
    /\bBearer\s+[A-Za-z0-9._-]{12,}/i,
    /NARRATIVEOS_TOOL_BRIDGE_TOKEN=/,
    /MASTRA_TOOL_BRIDGE_TOKEN=/,
    /OPENAI_API_KEY=/i,
    /DEEPSEEK_API_KEY=/i,
    /MOONSHOT_API_KEY=/i,
    /KIMI_API_KEY=/i,
    /ANTHROPIC_API_KEY=/i,
  ]
  return patterns.filter(pattern => pattern.test(text)).map(pattern => String(pattern))
}

function secretNameReason(name) {
  if (allowedRuntimeVariables.has(name)) return null
  if (/(DATABASE|PASSWORD|PRIVATE|TOKEN|API_KEY|OPENAI|DEEPSEEK|MOONSHOT|KIMI|ANTHROPIC|SECRET)/i.test(name)) {
    return 'secret_like_repository_variable_name'
  }
  return null
}

function validateVariable(variable) {
  const issues = []
  const { name, value } = variable
  const nameReason = secretNameReason(name)
  if (nameReason) issues.push(nameReason)
  if (/^(VITE_|REMOTE_)/.test(name) && !allowedRuntimeVariables.has(name)) issues.push('unknown_runtime_variable_name')
  const secretMatches = secretValueMatches(value)
  for (const match of secretMatches) issues.push(`secret_like_value:${match}`)

  if (allowedRuntimeVariables.has(name)) {
    if (name === 'VITE_PUBLIC_RUNTIME_MODE' && !['disabled', 'live'].includes(value)) issues.push('invalid_runtime_mode')
    if (['VITE_API_ORIGIN', 'VITE_API_BASE_URL', 'VITE_AGENT_RUNTIME_BASE_URL'].includes(name) && value && !isRemoteHttps(value)) issues.push('invalid_public_https_origin')
    if (['REMOTE_API_SERVICE_ID', 'REMOTE_AGENT_SERVICE_ID'].includes(name) && isPlaceholder(value)) issues.push('placeholder_service_id')
    if (['REMOTE_API_SECRETS_CONFIGURED', 'REMOTE_AGENT_SECRETS_CONFIGURED'].includes(name) && value && !['true', 'false'].includes(value)) issues.push('invalid_secret_store_flag')
  }
  return issues
}

const requiredFiles = [
  '.github/workflows/pages.yml',
  'docs/backend/P16_PAGES_LIVE_RELEASE_GATE.md',
  'docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md',
  'docs/backend/P76_LIVE_CUTOVER_ATTESTATION_GATE.md',
  'docs/backend/P109_GITHUB_RUNTIME_VARIABLE_BOUNDARY_GUARD.md',
  'package.json',
]
for (const file of requiredFiles) assert(existsSync(join(root, file)), `missing P109 boundary file: ${file}`)

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:github-runtime-variable-boundary'] === 'node scripts/check-github-runtime-variable-boundary.mjs',
  'package.json must expose check:github-runtime-variable-boundary',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:github-runtime-variable-boundary'),
  'root npm run test must include check:github-runtime-variable-boundary',
)

assertIncludes('.github/workflows/pages.yml', [
  'VITE_PUBLIC_RUNTIME_MODE',
  'VITE_API_ORIGIN',
  'VITE_AGENT_RUNTIME_BASE_URL',
  'REMOTE_API_SERVICE_ID',
  'REMOTE_AGENT_SERVICE_ID',
  'REMOTE_API_SECRETS_CONFIGURED',
  'REMOTE_AGENT_SECRETS_CONFIGURED',
])
assertIncludes('docs/backend/P16_PAGES_LIVE_RELEASE_GATE.md', [
  'P109 GitHub Runtime Variable Boundary Guard',
  'Do not put database URLs, Tool Bridge token values, model keys, private keys or provider API tokens in repository variables.',
])
assertIncludes('docs/backend/P20_REMOTE_RUNTIME_ACTIVATION_RUNBOOK.md', [
  'P109 GitHub Runtime Variable Boundary Guard',
  'never store database URLs, Tool Bridge token values, model keys or provider API tokens in repository variables',
])
assertIncludes('docs/backend/P76_LIVE_CUTOVER_ATTESTATION_GATE.md', [
  'P109 GitHub Runtime Variable Boundary Guard',
  'must not contain database URLs, Tool Bridge token values, model keys, private keys, provider API tokens',
])

const repoVars = tryGhVariables()
const checkedVariables = repoVars.variables.map(variable => ({
  name: variable.name,
  issues: validateVariable(variable),
}))
const issues = checkedVariables.flatMap(variable => variable.issues.map(issue => ({ name: variable.name, issue })))

const values = Object.fromEntries(repoVars.variables.map(variable => [variable.name, variable.value]))
if (values.VITE_PUBLIC_RUNTIME_MODE === 'live') {
  for (const required of ['VITE_API_ORIGIN', 'VITE_AGENT_RUNTIME_BASE_URL', 'REMOTE_API_SERVICE_ID', 'REMOTE_AGENT_SERVICE_ID', 'REMOTE_API_SECRETS_CONFIGURED', 'REMOTE_AGENT_SECRETS_CONFIGURED']) {
    if (!values[required]) issues.push({ name: required, issue: 'required_for_live_runtime' })
  }
  if (values.REMOTE_API_SECRETS_CONFIGURED !== 'true') issues.push({ name: 'REMOTE_API_SECRETS_CONFIGURED', issue: 'must_be_true_for_live_runtime' })
  if (values.REMOTE_AGENT_SECRETS_CONFIGURED !== 'true') issues.push({ name: 'REMOTE_AGENT_SECRETS_CONFIGURED', issue: 'must_be_true_for_live_runtime' })
}

const artifact = {
  status: issues.length ? 'blocked' : 'passed',
  gate: 'P109_GITHUB_RUNTIME_VARIABLE_BOUNDARY_GUARD',
  generatedAt: new Date().toISOString(),
  repo,
  repoVariablesChecked: repoVars.checked,
  repoVariableSource: repoVars.source,
  allowedRuntimeVariables: [...allowedRuntimeVariables],
  checkedVariableCount: repoVars.variables.length,
  presentRuntimeVariables: repoVars.variables
    .filter(variable => allowedRuntimeVariables.has(variable.name))
    .map(variable => variable.name)
    .sort(),
  issueCount: issues.length,
  issues,
}

assert(secretValueMatches(JSON.stringify(artifact)).length === 0, 'P109 artifact must not contain secret-like values')

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `github-runtime-variable-boundary-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

if (issues.length) throw new Error(`GitHub runtime variable boundary failed: ${issues.map(issue => `${issue.name}:${issue.issue}`).join(', ')}`)

console.log(JSON.stringify({
  status: 'passed',
  gate: artifact.gate,
  repoVariablesChecked: artifact.repoVariablesChecked,
  repoVariableSource: artifact.repoVariableSource,
  checkedVariableCount: artifact.checkedVariableCount,
  presentRuntimeVariables: artifact.presentRuntimeVariables,
  artifactPath,
}, null, 2))
