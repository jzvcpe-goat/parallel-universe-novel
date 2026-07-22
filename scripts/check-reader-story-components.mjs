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

const story = read('app/src/pages/Story.tsx')
const readingToolButton = read('app/src/components/reader/ReaderReadingToolButton.tsx')
const indexPanel = read('app/src/components/reader/ReaderStoryIndexPanel.tsx')
const branchPanel = read('app/src/components/reader/ReaderStoryBranchPanel.tsx')
const progressPanel = read('app/src/components/reader/ReaderStoryProgressPanel.tsx')
const css = read('app/src/index.css')
const tokens = read('app/src/styles/parallel-universe-tokens.css')
const registry = read('app/src/design-system/registry.ts')
const pageContracts = read('app/src/design-system/page-contracts.ts')
const registryJson = read('app/src/registry/parallel-universe-ui.registry.json')
const componentsDoc = read('docs/design-system/components.md')
const acceptance = read('docs/harness/page-acceptance-tests.md')

for (const marker of [
  "import { ReaderReadingToolButton }",
  "import { ReaderStoryIndexPanel }",
  "import { ReaderStoryBranchPanel }",
  "import { ReaderStoryProgressPanel }",
  '<ReaderReadingToolButton>Aa</ReaderReadingToolButton>',
  '<ReaderReadingToolButton>目录</ReaderReadingToolButton>',
  '<ReaderReadingToolButton>书签</ReaderReadingToolButton>',
  '<ReaderStoryIndexPanel',
  '<ReaderStoryBranchPanel',
  '<ReaderStoryProgressPanel',
]) {
  assertIncludes(story, marker, `Story page composition ${marker}`)
}

for (const oldMarker of [
  '<Save size={16}',
  '<LiquidGlassMetric label="页码"',
  '<WorldlineConstellation',
  'function WorldlineMap',
  'className="world-cover world-cover-flagship',
  'shadow-[inset_0_0_60px_rgba',
  'className="reader-tool-button"',
]) {
  assertNotIncludes(story, oldMarker, `Story page must not own extracted story-rail UI ${oldMarker}`)
}

for (const marker of [
  'export function ReaderReadingToolButton',
  'type ReaderReadingToolButtonProps',
  '<Button',
  'variant="ghost"',
  'size="sm"',
  'data-reader-tool-button',
  'var(--pu-reader-tool-border)',
  'var(--pu-reader-tool-background)',
  'var(--pu-reader-tool-foreground)',
]) {
  assertIncludes(readingToolButton, marker, `ReaderReadingToolButton marker ${marker}`)
}

for (const marker of [
  '--pu-reader-tool-border:',
  '--pu-reader-tool-border-hover:',
  '--pu-reader-tool-background:',
  '--pu-reader-tool-background-hover:',
  '--pu-reader-tool-foreground:',
]) {
  assertIncludes(tokens, marker, `Reader semantic token ${marker}`)
}

assertNotIncludes(css, '.reader-tool-button', 'Reader tool button styling must not return to global CSS')

for (const marker of [
  'export function ReaderStoryIndexPanel',
  'reader-story-index-panel',
  'reader-story-index-card',
  'reader-story-cover',
  'reader-story-chapter-card',
  'reader-story-branch-map',
  'ReaderStoryBranchMap',
  'Card variant="glass"',
  'CardHeader',
  'CardContent',
  '章节阅读',
  '分支地图',
  '返回首页',
]) {
  assertIncludes(indexPanel, marker, `ReaderStoryIndexPanel marker ${marker}`)
}

for (const marker of [
  'export function ReaderStoryBranchPanel',
  'reader-story-branch-panel',
  'reader-story-branch-summary',
  'reader-story-branch-metrics',
  'Card variant="glass"',
  'CardHeader',
  'CardContent',
  '加入书架',
  '我的分支',
]) {
  assertIncludes(branchPanel, marker, `ReaderStoryBranchPanel marker ${marker}`)
}

for (const marker of [
  'export function ReaderStoryProgressPanel',
  'reader-story-progress-panel',
  'Card variant="glass"',
  'CardHeader',
  'CardContent',
  'LiquidGlassMetric',
  'WorldlineConstellation',
  '阅读进度',
  '你的选择会用于安排后续章节',
]) {
  assertIncludes(progressPanel, marker, `ReaderStoryProgressPanel marker ${marker}`)
}

for (const forbidden of ['Supabase', 'RLS', 'provider', 'fallback', '后端', '接口', 'trace', 'API key', '服务开关']) {
  assertNotIncludes(indexPanel, forbidden, `ReaderStoryIndexPanel public copy must not include ${forbidden}`)
  assertNotIncludes(branchPanel, forbidden, `ReaderStoryBranchPanel public copy must not include ${forbidden}`)
  assertNotIncludes(progressPanel, forbidden, `ReaderStoryProgressPanel public copy must not include ${forbidden}`)
}

for (const marker of [
  '.reader-story-index-panel',
  '.reader-story-index-card',
  '.reader-story-cover',
  '.reader-story-chapter-card',
  '.reader-story-branch-map',
  '.reader-story-branch-panel',
  '.reader-story-branch-summary',
  '.reader-story-branch-metrics',
  '.reader-story-progress-panel',
]) {
  assertIncludes(css, marker, `Reader story CSS marker ${marker}`)
}

for (const marker of ['ReaderReadingToolButton', 'ReaderStoryIndexPanel', 'ReaderStoryBranchPanel', 'ReaderStoryProgressPanel']) {
  assertIncludes(registry, marker, `Design-system registry includes ${marker}`)
  assertIncludes(pageContracts, marker, `Page contracts include ${marker}`)
  assertIncludes(componentsDoc, marker, `Components doc includes ${marker}`)
  assertIncludes(acceptance, marker, `Acceptance doc includes ${marker}`)
}

for (const marker of ['reader-reading-tool-button', 'reader-story-index-panel', 'reader-story-branch-panel', 'reader-story-progress-panel']) {
  assertIncludes(registryJson, marker, `Registry JSON includes ${marker}`)
}

console.log('[reader-story-components] PASS')
