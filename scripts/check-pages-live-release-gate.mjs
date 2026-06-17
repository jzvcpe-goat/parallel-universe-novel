#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const workflow = read('.github/workflows/pages.yml')
const p16Doc = read('docs/backend/P16_PAGES_LIVE_RELEASE_GATE.md')
const p15Doc = read('docs/backend/P15_LIVE_RUNTIME_SMOKE_CONTRACT.md')
const packageJson = JSON.parse(read('package.json'))
const node24ActionVersions = [
  'actions/checkout@v6',
  'actions/setup-node@v6',
  'actions/setup-python@v6',
  'actions/upload-artifact@v7',
  'actions/configure-pages@v6',
  'actions/upload-pages-artifact@v5',
  'actions/deploy-pages@v5',
]

for (const action of node24ActionVersions) {
  assert(
    workflow.includes(action),
    `Pages workflow must use Node 24-compatible action ${action}`,
  )
}

assert(
  workflow.includes('Gate public runtime release mode'),
  'Pages workflow must include an explicit public runtime release gate step',
)
assert(
  workflow.includes("VITE_PUBLIC_RUNTIME_MODE: ${{ vars.VITE_PUBLIC_RUNTIME_MODE || 'disabled' }}"),
  'Pages workflow must default public runtime mode to disabled through GitHub vars',
)
assert(
  workflow.includes('actions: read')
    && workflow.includes('GH_TOKEN: ${{ github.token }}'),
  'Pages workflow must grant GH_TOKEN actions read access so readiness ledgers can audit GitHub repository variables',
)
assert(
  workflow.includes('Run runtime checks')
    && workflow.includes('VITE_API_ORIGIN: ${{ vars.VITE_API_ORIGIN }}')
    && workflow.includes('VITE_AGENT_RUNTIME_BASE_URL: ${{ vars.VITE_AGENT_RUNTIME_BASE_URL }}'),
  'Run runtime checks must receive the same GitHub vars context used by the release gate',
)
assert(
  workflow.includes('Install browser QA dependencies')
    && workflow.includes('npx playwright install chromium')
    && workflow.includes('Run local live runtime browser QA')
    && workflow.includes('npm run qa:live-runtime-local')
    && workflow.indexOf('Run local live runtime browser QA') < workflow.indexOf('Gate public runtime release mode'),
  'Pages workflow must run local live-mode browser QA before the public runtime release gate',
)
assert(
  packageJson.devDependencies?.playwright,
  'package.json must keep Playwright as a controlled devDependency instead of installing it ad hoc in CI',
)
assert(
  workflow.includes('VITE_API_ORIGIN: ${{ vars.VITE_API_ORIGIN }}')
    && workflow.includes('VITE_AGENT_RUNTIME_BASE_URL: ${{ vars.VITE_AGENT_RUNTIME_BASE_URL }}'),
  'Pages workflow must source remote API and Agent URLs from GitHub vars',
)
assert(
  workflow.includes('if [ "$VITE_PUBLIC_RUNTIME_MODE" = "live" ]; then')
    && workflow.includes('REQUIRE_PUBLIC_RUNTIME=true npm run check:public-runtime-preview')
    && workflow.includes('REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness')
    && workflow.includes('REQUIRE_PUBLIC_RUNTIME=true npm run qa:live-runtime-browser'),
  'Pages workflow must require live checks, readiness ledger, and browser smoke before any live public build',
)
assert(
  workflow.includes('npm run audit:live-runtime-readiness')
    && workflow.indexOf('npm run audit:live-runtime-readiness') < workflow.indexOf('Build Creator Studio'),
  'Pages workflow must generate the readiness ledger before the Creator Studio build step',
)
assert(
  workflow.includes('Upload runtime readiness ledger')
    && workflow.includes('if: always()')
    && workflow.includes('actions/upload-artifact@v7')
    && workflow.includes('artifacts/runtime/live-runtime-readiness-*.json')
    && workflow.indexOf('Upload runtime readiness ledger') > workflow.indexOf('Gate public runtime release mode'),
  'Pages workflow must upload the readiness ledger artifact after the runtime gate, including failed live gates',
)
assert(
  workflow.includes('VITE_ALLOW_LOCAL_CREATOR_FALLBACK: false'),
  'Pages workflow must always disable local creator fallback for public builds',
)
assert(
  workflow.indexOf('Gate public runtime release mode') < workflow.indexOf('Build Creator Studio'),
  'Runtime release gate must run before the Creator Studio build step',
)
assert(
  packageJson.scripts['check:pages-live-release-gate'] === 'node scripts/check-pages-live-release-gate.mjs',
  'package.json must expose check:pages-live-release-gate',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:pages-live-release-gate'),
  'npm run test must include check:pages-live-release-gate',
)
assert(
  p16Doc.includes('VITE_PUBLIC_RUNTIME_MODE=live')
    && p16Doc.includes('qa:live-runtime-browser')
    && p16Doc.includes('qa:live-runtime-local')
    && p16Doc.includes('GitHub repository variables'),
  'P16 doc must describe the live release gate and required GitHub vars',
)
assert(
  p15Doc.includes('P15 proves those deployed units actually satisfy the Creator Studio product flow.'),
  'P15 doc must remain the browser-level proof consumed by the P16 release gate',
)

console.log(JSON.stringify({
  status: 'passed',
  checked: [
    '.github/workflows/pages.yml',
    'docs/backend/P16_PAGES_LIVE_RELEASE_GATE.md',
    'package.json',
  ],
  defaultMode: 'disabled',
  readinessLedger: 'audit:live-runtime-readiness',
  ledgerArtifact: 'runtime-readiness-ledger',
  liveModeGate: 'qa:live-runtime-browser',
  actionsRuntime: 'node24',
}, null, 2))
