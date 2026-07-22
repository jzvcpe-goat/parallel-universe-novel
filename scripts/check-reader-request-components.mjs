import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function read(path) {
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) throw new Error(`Missing required file: ${path}`)
  return readFileSync(absolute, 'utf8')
}

function assertIncludes(body, needle, label) {
  if (!body.includes(needle)) {
    throw new Error(`${label}: expected to include ${JSON.stringify(needle)}`)
  }
}

function assertNotIncludes(body, needle, label) {
  if (body.includes(needle)) {
    throw new Error(`${label}: must not include ${JSON.stringify(needle)}`)
  }
}

const readerPanel = read('app/src/apps/reader/ReaderRequestPanel.tsx')
const composer = read('app/src/components/reader/ReaderRequestComposer.tsx')
const hotList = read('app/src/components/reader/ReaderHotRequestList.tsx')
const readerApi = read('app/src/lib/pmfSupabaseReader.ts')
const css = read('app/src/index.css')
const registry = read('app/src/design-system/registry.ts')
const pageContracts = read('app/src/design-system/page-contracts.ts')
const registryJson = read('app/src/registry/parallel-universe-ui.registry.json')
const componentsDoc = read('docs/design-system/components.md')
const acceptance = read('docs/harness/page-acceptance-tests.md')

for (const marker of [
  "import { ReaderRequestComposer }",
  "import { ReaderHotRequestList }",
  '<ReaderRequestComposer',
  '<ReaderHotRequestList',
]) {
  assertIncludes(readerPanel, marker, `ReaderRequestPanel composition ${marker}`)
}

for (const oldMarker of [
  '<Card variant="glass" padding="sm" className="pu-motion-lift">',
  '<Card key={item.id}',
  'CardContent',
  'CardHeader',
  'CardTitle',
  'TabsList',
  'Textarea',
]) {
  assertNotIncludes(readerPanel, oldMarker, `ReaderRequestPanel must not own extracted request UI ${oldMarker}`)
}

for (const marker of [
  'export function ReaderRequestComposer',
  'ReaderRequestFlowStep',
  'ReaderRequestStatusNote',
  'reader-request-composer-card',
  'reader-request-flow',
  'reader-request-status-note',
  'reader-request-status-note-unavailable',
  '请求会如何影响更新',
  'Card variant="glass"',
  'AlertTitle',
  'AlertDescription',
  'TabsList',
  'Textarea',
  '发送请求',
  '暂未开放',
]) {
  assertIncludes(composer, marker, `ReaderRequestComposer marker ${marker}`)
}

for (const marker of [
  '作者暂未开放读者请求',
  'disabled={requestAccess !==',
  '请求尚未开放',
  '开放后，这里会显示读者最想看的更新方向。',
  'failedStatus',
]) {
  assertIncludes(readerPanel, marker, `ReaderRequestPanel product-state marker ${marker}`)
}

for (const bannedMarker of [
  '请求服务尚未开启',
  'RLS',
  'provider',
  'API key',
]) {
  assertNotIncludes(composer, bannedMarker, `ReaderRequestComposer public copy must not include ${bannedMarker}`)
  assertNotIncludes(hotList, bannedMarker, `ReaderHotRequestList public copy must not include ${bannedMarker}`)
}

assertIncludes(readerApi, "message: '作者暂未开放读者请求。'", 'Reader API unavailable copy must stay product-safe')
assertIncludes(readerApi, 'message: fallback', 'Reader API errors must use product-safe fallback copy')
assertNotIncludes(readerApi, 'maybeError?.message || fallback', 'Reader API must not pass lower-level error messages to public UI')

for (const marker of [
  'export function ReaderHotRequestList',
  'emptyTitle',
  'emptyDescription',
  'reader-hot-request-list',
  'reader-hot-request-stack',
  'reader-hot-request-row',
  '正在升温的读者请求',
  'Card variant="glass"',
  'Badge',
  'Button',
  'Alert',
  '暂无请求',
]) {
  assertIncludes(hotList, marker, `ReaderHotRequestList marker ${marker}`)
}

assertNotIncludes(hotList, '<Card key={item.id}', 'Hot requests must render as rows, not nested cards')

for (const marker of [
  '.reader-request-composer-card',
  '.reader-request-status-note',
  '.reader-request-status-note-unavailable',
  '.reader-hot-request-list',
  '.reader-hot-request-stack',
  '.reader-hot-request-row',
]) {
  assertIncludes(css, marker, `Reader request CSS marker ${marker}`)
}

for (const marker of ['ReaderRequestComposer', 'ReaderHotRequestList']) {
  assertIncludes(registry, marker, `Design-system registry includes ${marker}`)
  assertIncludes(pageContracts, marker, `Page contracts include ${marker}`)
  assertIncludes(componentsDoc, marker, `Components doc includes ${marker}`)
  assertIncludes(acceptance, marker, `Acceptance doc includes ${marker}`)
}

for (const marker of ['reader-request-composer', 'reader-hot-request-list']) {
  assertIncludes(registryJson, marker, `Registry JSON includes ${marker}`)
}

console.log('[reader-request-components] PASS')
