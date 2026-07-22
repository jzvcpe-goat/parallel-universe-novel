import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const failures: string[] = []

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

function assert(condition: boolean, message: string) {
  if (!condition) failures.push(message)
}

const css = read('app/src/index.css')
const tokens = read('app/src/styles/parallel-universe-tokens.css')
const creator = read('app/src/apps/creator/LocalCreatorApp.tsx')
const creatorProgressPanels = read('app/src/components/creator/workspace/CreatorProgressPanels.tsx')
const creatorAgentAssistantPanels = read('app/src/components/creator/workspace/CreatorAgentAssistantPanels.tsx')
const creatorComponents = [
  'app/src/components/creator/CreatorShell.tsx',
  'app/src/components/creator/CreatorTodayNextStepsPanel.tsx',
  'app/src/components/creator/CreatorStatePanel.tsx',
  'app/src/components/creator/CreatorActionBar.tsx',
  'app/src/components/creator/ConfirmActionDialog.tsx',
  'app/src/components/creator/LocalStatusPill.tsx',
].map(read).join('\n')
const registry = read('app/src/design-system/registry.ts')
const pageContracts = read('app/src/design-system/page-contracts.ts')
const creatorSurfaceSource = `${creator}\n${creatorComponents}\n${creatorAgentAssistantPanels}`
const liquidGlass = read('app/src/components/ui/liquid-glass.tsx')

const requiredTokens = [
  '--creator-bg',
  '--creator-surface',
  '--creator-surface-strong',
  '--creator-border',
  '--creator-border-strong',
  '--creator-text',
  '--creator-text-muted',
  '--creator-text-dim',
  '--creator-accent',
  '--creator-accent-soft',
  '--creator-confirm',
  '--creator-danger',
  '--creator-editor-bg',
  '--creator-editor-text',
  '--creator-workbench-frame',
  '--creator-workbench-frame-rim',
  '--creator-workbench-frame-rim-strong',
  '--creator-workbench-frame-glow',
  '--creator-assistant-bg',
  '--creator-assistant-border',
  '--creator-assistant-panel-bg',
  '--creator-assistant-panel-border',
  '--creator-assistant-control',
  '--creator-assistant-control-strong',
  '--creator-assistant-ready-bg',
  '--creator-assistant-input-bg',
  '--creator-assistant-text',
  '--creator-assistant-text-muted',
  '--creator-assistant-text-dim',
  '--creator-assistant-shadow',
  '--creator-progress-bg',
  '--creator-progress-row-bg',
  '--creator-progress-border',
  '--creator-progress-shadow',
  '--creator-inline-assist-bg',
  '--creator-inline-assist-border',
  '--creator-inline-assist-shadow',
  '--creator-readiness-chip-border',
  '--creator-command-overlay-bg',
  '--creator-command-overlay-solid-bg',
  '--creator-command-solid-bg',
  '--creator-command-inset-solid-bg',
]

const tokenLayerEssentials = [
  '--void',
  '--ink-paper',
  '--manuscript-gold',
  '--worldline-cyan',
  '--story-cyan',
  '--background',
  '--foreground',
  '--radius',
  '--creator-workbench-paper',
  '--creator-progress-bg',
  '--creator-inline-assist-bg',
]

for (const token of requiredTokens) {
  assert(css.includes(token) || tokens.includes(token), `Missing Creator token ${token}`)
}

for (const token of tokenLayerEssentials) {
  assert(tokens.includes(`${token}:`), `Token layer must own ${token}`)
}

const misplacedSystemTokenDefinitions = css.match(
  /^\s+--(?:void(?:-[a-z0-9-]+)?|ink-[a-z0-9-]+|manuscript-[a-z0-9-]+|worldline-[a-z0-9-]+|rain-[a-z0-9-]+|deep-[a-z0-9-]+|story-[a-z0-9-]+|deviation-[a-z0-9-]+|creator-[a-z0-9-]+|liquid-metric-[a-z0-9-]+|background|foreground|card(?:-foreground)?|popover(?:-foreground)?|primary(?:-foreground)?|secondary(?:-foreground)?|muted(?:-foreground)?|accent(?:-foreground)?|destructive(?:-foreground)?|border|input|ring|radius)\s*:/gm,
) ?? []

assert(
  misplacedSystemTokenDefinitions.length === 0,
  `System token definitions must live in parallel-universe-tokens.css, found in index.css: ${misplacedSystemTokenDefinitions.join(', ')}`,
)
assert(tokens.includes('.creator-workbench-app {'), 'Token layer must own Creator workbench theme overrides.')
assert(tokens.includes('.creator-editor-workspace {'), 'Token layer must own Writing Desk semantic overrides.')

assert(!creator.includes('UniverseDepth'), 'Creator app must not import or render UniverseDepth.')
assert(!creator.includes('variant="creator"'), 'Creator app must not use Reader depth stage variants.')
assert(!creator.includes('narrative-page'), 'Creator app must not use Reader narrative-page shell class.')
assert(!creatorSurfaceSource.includes('var(--ink-'), 'Creator surfaces must not use Reader ink tokens.')
assert(!creatorSurfaceSource.includes('var(--worldline-'), 'Creator surfaces must not use Reader worldline tokens.')
assert(!creatorSurfaceSource.includes('var(--manuscript-'), 'Creator surfaces must not use Reader manuscript tokens.')
assert(!liquidGlass.includes('var(--ink-'), 'LiquidGlass shared primitives must not depend on Reader ink tokens.')
assert(!liquidGlass.includes('var(--worldline-'), 'LiquidGlass shared primitives must not depend on Reader worldline tokens.')
assert(!liquidGlass.includes('var(--manuscript-'), 'LiquidGlass shared primitives must not depend on Reader manuscript tokens.')
assert(!css.includes('var(--pu-bg-creator-workbench)'), 'Creator CSS must not use Image2 planet background token.')
assert(!tokens.includes('--pu-bg-creator-workbench'), 'Creator planet background token must not exist.')
assert(!tokens.includes('pu-depth-stage-creator'), 'Creator depth-stage class must not exist.')
assert(!registry.includes("surfaces: ['discover', 'library', 'reader', 'creator'"), 'UniverseDepth registry must not include Creator.')
assert(pageContracts.includes("route: '/creator'"), 'Creator page contract must point to the local Creator route.')
assert(!pageContracts.includes("route: '/create'"), 'Creator page contract must not point to the retired public create route.')
assert(!creator.includes('/parallel-assets/backgrounds'), 'Creator app must not reference generated background assets.')
assert(!creator.includes('bg-[#'), 'Creator business components must not hard-code hex colors.')
assert(css.includes('var(--creator-workbench-frame)'), 'Creator editor workspace must use the semantic workbench frame token.')
assert(css.includes('var(--creator-workbench-frame-rim)'), 'Creator editor workspace must use the semantic workbench rim token.')
assert(!css.includes('.creator-editor-workspace .creator-assistant-'), 'Creator assistant dock must not depend on page-global CSS.')
assert(!css.includes('.creator-editor-workspace .creator-agent-'), 'Creator agent composer must not depend on page-global CSS.')
assert(creatorAgentAssistantPanels.includes('bg-[var(--creator-assistant-bg)]'), 'Creator assistant dock must own the semantic assistant background token.')
assert(creatorAgentAssistantPanels.includes('border-[var(--creator-assistant-border)]'), 'Creator assistant dock must own the semantic assistant border token.')
assert(creatorAgentAssistantPanels.includes('shadow-[var(--creator-assistant-shadow)]'), 'Creator assistant dock must own the semantic assistant shadow token.')
assert(!creatorAgentAssistantPanels.includes('variant="glass"'), 'Creator assistant dock must not depend on liquid-glass pseudo layers.')
assert(!css.includes('.creator-editor-workspace .creator-progress-rail'), 'Creator progress rail must not depend on page-global CSS.')
assert(creatorProgressPanels.includes('bg-[var(--creator-progress-bg)]'), 'Creator progress rail must own the semantic footer background token.')
assert(creatorProgressPanels.includes('[box-shadow:var(--creator-progress-shadow)]'), 'Creator progress rail must own the semantic footer shadow token.')
assert(css.includes('.creator-inline-assist-bar'), 'Creator inline assist bar must have a tokenized component selector.')
assert(css.includes('var(--creator-inline-assist-bg)'), 'Creator inline assist bar must use the semantic assist background token.')

if (failures.length) {
  console.error('[design-tokens] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[design-tokens] PASS')
