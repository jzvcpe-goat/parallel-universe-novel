#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const rootDir = path.resolve(path.dirname(scriptPath), '..')
const appDir = path.join(rootDir, 'app')
const apiDir = path.join(appDir, 'src', 'api')
const dataFile = path.join(appDir, 'src', 'features', 'parallel-universe', 'data.ts')
const appRoutesFile = path.join(appDir, 'src', 'App.tsx')
const storyFile = path.join(appDir, 'src', 'pages', 'Story.tsx')
const openApiFile = path.join(rootDir, 'backend', 'openapi.json')
const pagesDir = path.join(appDir, 'src', 'pages')
const smokeScriptFile = path.join(rootDir, 'scripts', 'smoke-deployed-api.sh')

const failures = []

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function normalizePath(routePath) {
  return routePath.replace(/\{[^}/]+\}/g, '{}')
}

function toOpenApiPath(clientPath) {
  const withoutQuery = clientPath.split('?')[0]
  const replaced = withoutQuery.replace(/\$\{[^}]+\}/g, '{param}')
  return replaced.startsWith('/v1/')
    ? replaced
    : `/v1${replaced.startsWith('/') ? replaced : `/${replaced}`}`
}

function assert(condition, message) {
  if (!condition) failures.push(message)
}

const openApi = JSON.parse(readText(openApiFile))
const openApiPaths = Object.keys(openApi.paths || {})
const normalizedOpenApiPaths = new Set(openApiPaths.map(normalizePath))
const openApiPathByNormalized = new Map(openApiPaths.map(openApiPath => [normalizePath(openApiPath), openApiPath]))
const dataText = readText(dataFile)

const apiCalls = []
for (const fileName of fs.readdirSync(apiDir)) {
  if (!fileName.endsWith('.ts')) continue
  const filePath = path.join(apiDir, fileName)
  const text = readText(filePath)
  const callPattern = /api\.(get|post|put|patch|delete)<[^>]+>\(\s*(?:`([^`]+)`|'([^']+)'|"([^"]+)")/g
  for (const match of text.matchAll(callPattern)) {
    const literal = match[2] || match[3] || match[4]
    apiCalls.push({
      fileName,
      method: match[1],
      path: toOpenApiPath(literal),
    })
  }
}

for (const call of apiCalls) {
  assert(
    normalizedOpenApiPaths.has(normalizePath(call.path)),
    `API client ${call.fileName} calls ${call.path}, but backend/openapi.json does not expose it.`,
  )
}

function hasOpenApiMethod(pathValue, method) {
  const normalized = normalizePath(pathValue)
  const actualPath = openApiPathByNormalized.get(normalized)
  if (!actualPath) return false
  return Boolean(openApi.paths?.[actualPath]?.[method.toLowerCase()])
}

function apiClientCalls(fileName, pathValue, method) {
  return apiCalls.some(call => (
    call.fileName === fileName
    && normalizePath(call.path) === normalizePath(pathValue)
    && call.method === method
  ))
}

function dataIncludes(value) {
  return dataText.includes(value)
}

function pageIncludes(fileName, value) {
  return readText(path.join(pagesDir, fileName)).includes(value)
}

function smokeIncludes(value) {
  return readText(smokeScriptFile).includes(value)
}

const requiredProductContracts = [
  {
    id: 'reader-library-worlds',
    path: '/v1/reader/library/worlds',
    method: 'get',
    apiFile: 'library.ts',
    capabilitySurface: '/v1/reader/library/worlds',
    publicRoute: '/library',
  },
  {
    id: 'reader-session-create',
    path: '/v1/reader/sessions',
    method: 'post',
    apiFile: 'story.ts',
    capabilitySurface: '/v1/reader/sessions',
    pageFile: 'Story.tsx',
    pageSignal: 'storyApi.createSession',
  },
  {
    id: 'reader-continue',
    path: '/v1/reader/continue',
    method: 'post',
    apiFile: 'story.ts',
    capabilitySurface: '/v1/reader/continue',
    smokeSignal: '/reader/continue',
  },
  {
    id: 'reader-snapshot',
    path: '/v1/reader/snapshot',
    method: 'post',
    apiFile: 'runtime.ts',
    capabilitySurface: '/v1/reader/snapshot',
    pageFile: 'Story.tsx',
    pageSignal: 'runtimeApi.getReaderSnapshot',
  },
  {
    id: 'scene-advance',
    path: '/v1/scene/advance',
    method: 'post',
    apiFile: 'runtime.ts',
    capabilitySurface: '/v1/scene/advance',
    pageFile: 'Story.tsx',
    pageSignal: 'runtimeApi.advanceScene',
  },
  {
    id: 'creator-dialogue-session',
    path: '/v1/creator/dialogue/sessions',
    method: 'post',
    apiFile: 'creator.ts',
    capabilitySurface: '/v1/creator/dialogue/sessions',
    pageFile: 'Create.tsx',
    pageSignal: 'creatorApi.createDialogueSession',
  },
  {
    id: 'creator-dialogue-turn',
    path: '/v1/creator/dialogue/sessions/{session_id}/turns',
    method: 'post',
    apiFile: 'creator.ts',
    capabilitySurface: '/v1/creator/dialogue/sessions/{session_id}/turns',
    pageFile: 'Create.tsx',
    pageSignal: 'creatorApi.addDialogueTurn',
  },
  {
    id: 'market-trends',
    path: '/v1/market/trends',
    method: 'get',
    apiFile: 'market.ts',
    capabilitySurface: '/v1/market/trends',
    pageFile: 'Home.tsx',
    pageSignal: 'marketApi.getTrends',
  },
  {
    id: 'market-trends-scan',
    path: '/v1/market/trends/scan',
    method: 'post',
    apiFile: 'market.ts',
    capabilitySurface: '/v1/market/trends/scan',
    pageFile: 'Studio.tsx',
    pageSignal: 'marketApi.scanTrends',
    studioOnly: true,
  },
  {
    id: 'subscription-status',
    path: '/v1/reader/subscription',
    method: 'get',
    apiFile: 'settings.ts',
    capabilitySurface: '/v1/reader/subscription',
    pageFile: 'Account.tsx',
    pageSignal: 'loadSubscription',
  },
  {
    id: 'account-snapshot',
    path: '/v1/account/snapshot',
    method: 'get',
    apiFile: 'account.ts',
    capabilitySurface: '/v1/account/snapshot',
    pageFile: 'Account.tsx',
    pageSignal: 'accountApi.getSnapshot',
    smokeSignal: '/account/snapshot',
  },
  {
    id: 'account-merge-preview',
    path: '/v1/account/merge/preview',
    method: 'post',
    apiFile: 'account.ts',
    capabilitySurface: '/v1/account/merge/preview',
    pageFile: 'Account.tsx',
    pageSignal: 'accountApi.previewMerge',
    smokeSignal: '/account/merge/preview',
  },
  {
    id: 'account-merge-confirm',
    path: '/v1/account/merge/confirm',
    method: 'post',
    apiFile: 'account.ts',
    capabilitySurface: '/v1/account/merge/confirm',
    pageFile: 'Account.tsx',
    pageSignal: 'accountApi.confirmMerge',
    smokeSignal: '/account/merge/confirm',
  },
  {
    id: 'account-data-export',
    path: '/v1/account/data/export',
    method: 'get',
    apiFile: 'account.ts',
    capabilitySurface: '/v1/account/data/export',
    pageFile: 'Account.tsx',
    pageSignal: 'accountApi.exportData',
    smokeSignal: '/account/data/export',
  },
  {
    id: 'account-delete-preview',
    path: '/v1/account/delete/preview',
    method: 'post',
    apiFile: 'account.ts',
    capabilitySurface: '/v1/account/delete/preview',
    pageFile: 'Account.tsx',
    pageSignal: 'accountApi.previewDelete',
    smokeSignal: '/account/delete/preview',
  },
  {
    id: 'account-delete-confirm',
    path: '/v1/account/delete/confirm',
    method: 'post',
    apiFile: 'account.ts',
    capabilitySurface: '/v1/account/delete/confirm',
    pageFile: 'Account.tsx',
    pageSignal: 'accountApi.confirmDelete',
    smokeSignal: '/account/delete/confirm',
  },
  {
    id: 'checkout-start',
    path: '/v1/reader/checkout/start',
    method: 'post',
    apiFile: 'settings.ts',
    capabilitySurface: '/v1/reader/checkout/start',
    pageFile: 'Account.tsx',
    pageSignal: 'startCheckout',
  },
  {
    id: 'checkout-status',
    path: '/v1/reader/checkout/{checkout_session_id}/status',
    method: 'get',
    apiFile: 'settings.ts',
    capabilitySurface: '/v1/reader/checkout/{checkout_session_id}/status',
    pageFile: 'Account.tsx',
    pageSignal: '检查开通状态',
    smokeSignal: '/reader/checkout/{checkout_session_id}/status',
  },
  {
    id: 'checkout-return',
    path: '/v1/reader/checkout/return',
    method: 'post',
    apiFile: 'settings.ts',
    capabilitySurface: '/v1/reader/checkout/return',
    pageFile: 'Account.tsx',
    pageSignal: '检查开通状态',
    smokeSignal: '/reader/checkout/return',
  },
  {
    id: 'quality-evaluate',
    path: '/v1/quality/evaluate',
    method: 'post',
    apiFile: 'runtime.ts',
    capabilitySurface: '/v1/quality/evaluate',
    pageFile: 'Studio.tsx',
    pageSignal: 'runtimeApi.evaluateQuality',
    studioOnly: true,
  },
  {
    id: 'canon-commit',
    path: '/v1/canon/commit',
    method: 'post',
    apiFile: 'runtime.ts',
    capabilitySurface: '/v1/canon/commit',
    pageFile: 'Studio.tsx',
    pageSignal: 'runtimeApi.commitCanon',
    studioOnly: true,
  },
]

for (const contract of requiredProductContracts) {
  assert(
    hasOpenApiMethod(contract.path, contract.method),
    `Required contract ${contract.id} expects ${contract.method.toUpperCase()} ${contract.path}, but backend/openapi.json does not expose it.`,
  )
  assert(
    apiClientCalls(contract.apiFile, contract.path, contract.method),
    `Required contract ${contract.id} expects ${contract.apiFile} to call ${contract.method.toUpperCase()} ${contract.path}.`,
  )
  assert(
    dataIncludes(contract.capabilitySurface),
    `Required contract ${contract.id} is missing from capabilityAlignments.productSurface (${contract.capabilitySurface}).`,
  )
  if (contract.pageFile && contract.pageSignal) {
    assert(
      pageIncludes(contract.pageFile, contract.pageSignal),
      `Required contract ${contract.id} is not wired into ${contract.pageFile} (${contract.pageSignal}).`,
    )
  }
  if (contract.smokeSignal) {
    assert(
      smokeIncludes(contract.smokeSignal),
      `Required contract ${contract.id} must be covered by smoke-deployed-api.sh (${contract.smokeSignal}).`,
    )
  }
}

const surfacePattern = /productSurface:\s*\[([\s\S]*?)\]/g
for (const block of dataText.matchAll(surfacePattern)) {
  const surfaces = [...block[1].matchAll(/'([^']+)'|"([^"]+)"/g)].map(match => match[1] || match[2])
  for (const surface of surfaces) {
    if (!surface.startsWith('/v1/')) continue
    if (surface.includes('(planned)')) continue
    if (surface.endsWith('/*')) {
      const prefix = surface.slice(0, -1)
      assert(
        openApiPaths.some(openApiPath => openApiPath.startsWith(prefix)),
        `Capability matrix lists ${surface}, but backend/openapi.json has no matching path prefix.`,
      )
      continue
    }
    assert(
      normalizedOpenApiPaths.has(normalizePath(surface)),
      `Capability matrix lists ${surface}, but backend/openapi.json does not expose it.`,
    )
  }
}

const frontendEntries = [...dataText.matchAll(/frontendEntry:\s*'([^']+)'/g)].map(match => match[1])
const routeText = readText(appRoutesFile)
const navBlock = routeText.match(/const navItems = \[([\s\S]*?)\n\s*\]/)?.[1] || ''
const mainRoutes = [...routeText.matchAll(/<Route path="([^"]+)"/g)]
  .map(match => match[1])
  .filter(routePath => !['*', '/welcome'].includes(routePath))

for (const routePath of mainRoutes) {
  const covered = routePath === '/'
    ? frontendEntries.some(entry => entry === '/')
    : frontendEntries.some(entry => entry === routePath || entry.startsWith(`${routePath}?`) || entry.startsWith(`${routePath} `))
  assert(
    covered,
    `Frontend route ${routePath} is not represented in capabilityAlignments.frontendEntry.`,
  )
}

for (const forbiddenPublicNav of ['studio', 'settings', 'billing']) {
  assert(
    !navBlock.includes(`id: '${forbiddenPublicNav}'`),
    `Public nav must not expose backstage route id ${forbiddenPublicNav}.`,
  )
}

for (const requiredPublicNav of ['soul', 'story', 'library', 'create', 'member']) {
  assert(
    navBlock.includes(`id: '${requiredPublicNav}'`),
    `Public nav is missing required product route id ${requiredPublicNav}.`,
  )
}

const publicPageTexts = ['Home.tsx', 'Library.tsx', 'Story.tsx', 'Create.tsx', 'Account.tsx']
  .map(fileName => readText(path.join(pagesDir, fileName)))
  .join('\n')
for (const studioOnlySignal of ['marketApi.scanTrends', 'runtimeApi.evaluateQuality', 'runtimeApi.commitCanon']) {
  assert(
    !publicPageTexts.includes(studioOnlySignal),
    `Studio-only contract leaked into a public page: ${studioOnlySignal}.`,
  )
}

const unsupportedApiText = [
  readText(path.join(apiDir, 'settings.ts')),
  readText(path.join(apiDir, 'studio.ts')),
  readText(path.join(apiDir, 'soul.ts')),
].join('\n')
assert(
  unsupportedApiText.includes('completeCheckout') && unsupportedApiText.includes('/reader/checkout/return'),
  'P21 checkout confirmation must use the public return/status product contract.',
)
assert(
  !readText(path.join(apiDir, 'settings.ts')).includes('/reader/checkout/webhook'),
  'Public settings API must not call the provider webhook lifecycle endpoint.',
)
for (const unsupportedId of [
  'customer_portal_unavailable',
  'customer_export_unavailable',
  'studio_unavailable',
  'soul_unavailable',
]) {
  assert(
    unsupportedApiText.includes(unsupportedId),
    `Unsupported or second-phase capability must keep explicit unsupportedFeature boundary: ${unsupportedId}.`,
  )
}

const storyText = readText(storyFile)
assert(
  storyText.includes('UnknownWorldGate') && storyText.includes('isWorldTemplateId'),
  'Story route must keep an unknown-world gate instead of silently falling back to a playable template.',
)
assert(
  storyText.includes('CharacterMemoryPanel') && storyText.includes('EventRhythmPanel') && storyText.includes('selectChoice'),
  'Story route must keep the interactive reader loop: choice selection, event rhythm, and character memory feedback.',
)

if (failures.length) {
  console.error('Capability alignment check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Capability alignment check passed (${apiCalls.length} frontend API calls, ${openApiPaths.length} OpenAPI paths, ${mainRoutes.length} routes, ${requiredProductContracts.length} required product contracts).`)
