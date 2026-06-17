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

function isRemoteHttps(value) {
  return /^https:\/\//.test(value)
    && !/localhost|127\.0\.0\.1|0\.0\.0\.0|\[?::1\]?/.test(value)
    && !/example\.com/.test(value)
}

const creatorApi = read('app/src/api/creator.ts')
const createPage = read('app/src/pages/Create.tsx')
const workflow = read('.github/workflows/pages.yml')
const pagesQa = read('scripts/browser-pages-preview-e2e.mjs')
const envExample = read('app/.env.example')
const contract = read('docs/backend/P13_PUBLIC_RUNTIME_PREVIEW_CONTRACT.md')
const packageJson = JSON.parse(read('package.json'))

assert(
  creatorApi.includes('getCreatorRuntimeAvailability'),
  'Creator API must expose a runtime availability helper instead of relying on fetch failures',
)
assert(
  !creatorApi.includes("import.meta.env.VITE_AGENT_RUNTIME_BASE_URL || 'http://127.0.0.1:4111'"),
  'Public agent runtime must not default to localhost in production builds',
)
assert(
  creatorApi.includes("mode: 'remote'") && creatorApi.includes("mode: 'local_default'"),
  'Creator runtime helper must distinguish remote and local runtime modes',
)
assert(
  creatorApi.includes("!import.meta.env.DEV && publicRuntimeMode === 'disabled'"),
  'Explicit disabled public runtime mode must override localhost production preview builds',
)
assert(
  createPage.includes('创作服务待连接') && createPage.includes('创作服务可用'),
  'Creator page must present runtime connection as product-facing status',
)
assert(
  workflow.includes("VITE_PUBLIC_RUNTIME_MODE: ${{ vars.VITE_PUBLIC_RUNTIME_MODE || 'disabled' }}"),
  'GitHub Pages workflow must make public runtime mode configurable while defaulting to disabled',
)
assert(
  workflow.includes('VITE_ALLOW_LOCAL_CREATOR_FALLBACK: false'),
  'GitHub Pages workflow must explicitly disable local creator fallback',
)
assert(
  workflow.includes('VITE_AGENT_RUNTIME_BASE_URL: ${{ vars.VITE_AGENT_RUNTIME_BASE_URL }}')
    && workflow.includes('VITE_API_ORIGIN: ${{ vars.VITE_API_ORIGIN }}'),
  'GitHub Pages workflow must use repo variables for remote runtime URLs',
)
assert(
  workflow.includes('Gate public runtime release mode')
    && workflow.includes('REQUIRE_PUBLIC_RUNTIME=true npm run qa:live-runtime-browser'),
  'GitHub Pages workflow must gate live mode with live browser QA',
)
assert(
  pagesQa.includes("VITE_PUBLIC_RUNTIME_MODE: 'disabled'")
    && pagesQa.includes("VITE_ALLOW_LOCAL_CREATOR_FALLBACK: 'false'"),
  'Static pages QA must simulate the disabled public runtime boundary',
)
assert(
  envExample.includes('VITE_AGENT_RUNTIME_BASE_URL')
    && envExample.includes('VITE_PUBLIC_RUNTIME_MODE')
    && envExample.includes('VITE_ALLOW_LOCAL_CREATOR_FALLBACK'),
  'app/.env.example must document runtime preview variables',
)
assert(
  packageJson.scripts['check:public-runtime-preview'] === 'node scripts/check-public-runtime-preview.mjs',
  'package.json must expose check:public-runtime-preview',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:public-runtime-preview'),
  'npm run test must include check:public-runtime-preview',
)
assert(
  contract.includes('GitHub Pages') && contract.includes('candidate') && contract.includes('Idempotency-Key'),
  'P13 contract must document GitHub Pages boundary, candidate status, and idempotent runtime writes',
)

if (process.env.REQUIRE_PUBLIC_RUNTIME === 'true') {
  assert(
    isRemoteHttps(process.env.VITE_AGENT_RUNTIME_BASE_URL || ''),
    'REQUIRE_PUBLIC_RUNTIME=true requires VITE_AGENT_RUNTIME_BASE_URL to be a remote https URL',
  )
  assert(
    isRemoteHttps(process.env.VITE_API_ORIGIN || ''),
    'REQUIRE_PUBLIC_RUNTIME=true requires VITE_API_ORIGIN to be a remote https URL',
  )
  assert(
    process.env.VITE_ALLOW_LOCAL_CREATOR_FALLBACK === 'false',
    'REQUIRE_PUBLIC_RUNTIME=true requires VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false',
  )
}

console.log(JSON.stringify({
  status: 'passed',
  checked: [
    'app/src/api/creator.ts',
    'app/src/pages/Create.tsx',
    '.github/workflows/pages.yml',
    'scripts/browser-pages-preview-e2e.mjs',
    'app/.env.example',
    'docs/backend/P13_PUBLIC_RUNTIME_PREVIEW_CONTRACT.md',
  ],
  remoteRuntimeRequired: process.env.REQUIRE_PUBLIC_RUNTIME === 'true',
}, null, 2))
