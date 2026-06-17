#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function isRemoteHttps(value) {
  return /^https:\/\//.test(value)
    && !/localhost|127\.0\.0\.1|0\.0\.0\.0|\[?::1\]?/.test(value)
    && !/example\.com/.test(value)
}

function tryGhJson(args) {
  try {
    const output = execFileSync('gh', args, {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    })
    return JSON.parse(output || '[]')
  } catch {
    return null
  }
}

function repoVariables() {
  if (process.env.CHECK_GITHUB_REPO_VARS === 'false') return { checked: false, source: 'disabled_by_env', values: {} }
  const variables = tryGhJson(['variable', 'list', '--repo', repo, '--json', 'name,value']) || []
  const values = {}
  for (const variable of variables) {
    values[String(variable.name)] = String(variable.value || '')
  }
  return { checked: true, source: 'gh_variable_list', values }
}

function envOrRepo(name, repoValues) {
  return process.env[name] || repoValues[name] || ''
}

const workflow = read('.github/workflows/pages.yml')
const p13 = read('docs/backend/P13_PUBLIC_RUNTIME_PREVIEW_CONTRACT.md')
const p16 = read('docs/backend/P16_PAGES_LIVE_RELEASE_GATE.md')
const packageJson = JSON.parse(read('package.json'))
const vars = repoVariables()

const mode = envOrRepo('VITE_PUBLIC_RUNTIME_MODE', vars.values) || 'disabled'
const apiOrigin = envOrRepo('VITE_API_ORIGIN', vars.values)
const apiBaseUrl = envOrRepo('VITE_API_BASE_URL', vars.values)
const agentOrigin = envOrRepo('VITE_AGENT_RUNTIME_BASE_URL', vars.values)
const allowFallback = process.env.VITE_ALLOW_LOCAL_CREATOR_FALLBACK || 'false'
const required = process.env.REQUIRE_PUBLIC_LIVE_CONFIG === 'true' || mode === 'live'

assert(
  workflow.includes("VITE_PUBLIC_RUNTIME_MODE: ${{ vars.VITE_PUBLIC_RUNTIME_MODE || 'disabled' }}"),
  'Pages workflow must read VITE_PUBLIC_RUNTIME_MODE from repository variables and default to disabled',
)
assert(
  workflow.includes('VITE_ALLOW_LOCAL_CREATOR_FALLBACK: false'),
  'Pages workflow must hard-disable local creator fallback',
)
assert(
  workflow.includes('REQUIRE_PUBLIC_RUNTIME=true npm run qa:live-runtime-browser'),
  'Pages workflow must run live browser QA before live public builds',
)
assert(
  p13.includes('Public live preview') && p16.includes('Required GitHub Repository Variables'),
  'P13/P16 docs must describe public live runtime configuration',
)
assert(
  packageJson.scripts['qa:live-runtime-browser'] && packageJson.scripts['check:public-runtime-preview'],
  'package scripts must expose live runtime QA and preview checks',
)

const missingForLive = []
if (mode !== 'live') missingForLive.push('VITE_PUBLIC_RUNTIME_MODE=live')
if (!isRemoteHttps(apiOrigin)) missingForLive.push('VITE_API_ORIGIN=https://<remote-api>')
if (!isRemoteHttps(agentOrigin)) missingForLive.push('VITE_AGENT_RUNTIME_BASE_URL=https://<remote-agent>')
if (apiBaseUrl && !isRemoteHttps(apiBaseUrl)) missingForLive.push('VITE_API_BASE_URL must be remote https when set')
if (allowFallback !== 'false') missingForLive.push('VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false')

if (required) {
  assert(mode === 'live', 'Live config requires VITE_PUBLIC_RUNTIME_MODE=live')
  assert(isRemoteHttps(apiOrigin), 'Live config requires remote https VITE_API_ORIGIN')
  assert(isRemoteHttps(agentOrigin), 'Live config requires remote https VITE_AGENT_RUNTIME_BASE_URL')
  if (apiBaseUrl) assert(isRemoteHttps(apiBaseUrl), 'VITE_API_BASE_URL must be remote https when set')
  assert(allowFallback === 'false', 'Live config requires VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false')
}

console.log(JSON.stringify({
  status: 'passed',
  repo,
  repoVariablesChecked: vars.checked,
  repoVariableSource: vars.source,
  mode,
  liveReady: missingForLive.length === 0,
  missingForLive,
  present: {
    VITE_PUBLIC_RUNTIME_MODE: Boolean(mode),
    VITE_API_ORIGIN: Boolean(apiOrigin),
    VITE_API_BASE_URL: Boolean(apiBaseUrl),
    VITE_AGENT_RUNTIME_BASE_URL: Boolean(agentOrigin),
  },
}, null, 2))
