#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const scriptPath = 'scripts/browser-live-runtime-e2e.mjs'
const localScriptPath = 'scripts/browser-live-runtime-local-e2e.mjs'
assert(existsSync(join(root, scriptPath)), `missing ${scriptPath}`)
assert(existsSync(join(root, localScriptPath)), `missing ${localScriptPath}`)

const liveQa = read(scriptPath)
const localLiveQa = read(localScriptPath)
const p15Doc = read('docs/backend/P15_LIVE_RUNTIME_SMOKE_CONTRACT.md')
const p13Doc = read('docs/backend/P13_PUBLIC_RUNTIME_PREVIEW_CONTRACT.md')
const p14Doc = read('docs/backend/P14_REMOTE_RUNTIME_DEPLOYMENT_PACKAGE.md')
const packageJson = JSON.parse(read('package.json'))

assert(
  liveQa.includes('REQUIRE_PUBLIC_RUNTIME')
    && liveQa.includes('LIVE_RUNTIME_SMOKE_REQUIRED')
    && liveQa.includes("status: 'skipped'"),
  'Live runtime QA must be env-gated and skippable when remote URLs are absent',
)
assert(
  liveQa.includes("VITE_PUBLIC_RUNTIME_MODE: 'live'")
    && liveQa.includes("VITE_ALLOW_LOCAL_CREATOR_FALLBACK: 'false'")
    && liveQa.includes('VITE_AGENT_RUNTIME_BASE_URL: agentOrigin'),
  'Live runtime QA must build the frontend in live mode with local fallback disabled',
)
assert(
  liveQa.includes("`${apiOrigin}/health`")
    && liveQa.includes("`${agentOrigin}/health`"),
  'Live runtime QA must check both API and Agent health before browser submission',
)
assert(
  liveQa.includes('/v1/workflows/socratic-create')
    && liveQa.includes('preflightSocraticCreate')
    && liveQa.includes("candidateDraft?.status === 'candidate'")
    && liveQa.includes("responseMode === 'public'"),
  'Live runtime QA must directly preflight the public Socratic workflow before browser submission',
)
assert(
  liveQa.includes("page.getByText('创作服务可用')")
    && liveQa.includes('creator-dialogue-thread')
    && liveQa.includes('draftLength >= 300')
    && liveQa.includes('questionCount <= 2'),
  'Live runtime QA must verify public creator status, returned draft length, and question count',
)
assert(
  liveQa.includes('system prompt')
    && liveQa.includes('provider')
    && liveQa.includes('fallback')
    && liveQa.includes('AgentRun')
    && liveQa.includes('runtimeArtifact')
    && liveQa.includes('sourceRefs')
    && liveQa.includes('sourceLabels')
    && liveQa.includes('runTrace')
    && liveQa.includes('ledger'),
  'Live runtime QA must scan public workflow response and browser text for internal term leaks',
)
assert(
  packageJson.scripts['qa:live-runtime-browser'] === 'node scripts/browser-live-runtime-e2e.mjs',
  'package.json must expose qa:live-runtime-browser',
)
assert(
  packageJson.scripts['qa:live-runtime-local'] === 'node scripts/browser-live-runtime-local-e2e.mjs',
  'package.json must expose qa:live-runtime-local',
)
assert(
  packageJson.scripts['check:live-runtime-smoke'] === 'node scripts/check-live-runtime-smoke-contract.mjs',
  'package.json must expose check:live-runtime-smoke',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:live-runtime-smoke'),
  'npm run test must include check:live-runtime-smoke',
)
assert(
  p15Doc.includes('qa:live-runtime-browser')
    && p15Doc.includes('qa:live-runtime-local')
    && p15Doc.includes('REQUIRE_PUBLIC_RUNTIME=true')
    && p15Doc.includes('candidate')
    && p15Doc.includes('0-2')
    && p15Doc.includes('/v1/workflows/socratic-create')
    && p15Doc.includes('direct workflow preflight'),
  'P15 contract doc must describe the direct workflow preflight, live browser smoke, and acceptance boundary',
)
assert(
  localLiveQa.includes('ALLOW_INSECURE_RUNTIME_SMOKE')
    && localLiveQa.includes('REQUIRE_PUBLIC_RUNTIME')
    && localLiveQa.includes('VITE_ALLOW_LOCAL_CREATOR_FALLBACK')
    && localLiveQa.includes('scripts/browser-live-runtime-e2e.mjs')
    && localLiveQa.includes('MASTRA_TOOL_BRIDGE_BASE_URL')
    && localLiveQa.includes('backendPythonEnv')
    && localLiveQa.includes('PLAYWRIGHT_MODULE_PATH')
    && localLiveQa.includes('PLAYWRIGHT_CHROMIUM_EXECUTABLE'),
  'Local live runtime QA must run the same live browser script against local API and Agent services',
)
assert(
  p13Doc.includes('Add live browser QA against the remote preview')
    || p13Doc.includes('qa:live-runtime-browser'),
  'P13 contract must point forward to the live browser QA',
)
assert(
  p14Doc.includes('qa:live-runtime-browser'),
  'P14 deployment package must link deployment output to live runtime QA',
)

console.log(JSON.stringify({
  status: 'passed',
  checked: [
    scriptPath,
    localScriptPath,
    'docs/backend/P15_LIVE_RUNTIME_SMOKE_CONTRACT.md',
    'package.json',
  ],
}, null, 2))
