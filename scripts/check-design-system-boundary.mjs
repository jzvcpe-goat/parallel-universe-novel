import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const appRoot = join(root, 'app')
const failures = []

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

function assert(condition, message) {
  if (!condition) failures.push(message)
}

const appText = read('app/src/App.tsx')
const navBlock = appText.match(/const navItems = \[([\s\S]*?)\n\s*\]/)?.[1] || ''
const publicNavLabels = ['soul', 'story', 'library', 'member']
const backstageNavLabels = ['create', 'studio', 'settings', 'billing']

for (const id of publicNavLabels) {
  assert(navBlock.includes(`id: '${id}'`), `App public nav is missing ${id}.`)
}
for (const id of backstageNavLabels) {
  assert(!navBlock.includes(`id: '${id}'`), `App public nav must not include backstage item ${id}.`)
}

const shellText = read('app/src/components/design-system/ParallelUniverseShell.tsx')
const railBlock = shellText.match(/const railItems:[\s\S]*?= \[([\s\S]*?)\n\]/)?.[1] || ''
for (const label of ['发现', '阅读', '书城', '会员']) {
  assert(railBlock.includes(`label: '${label}'`), `ParallelUniverseShell public rail is missing ${label}.`)
}
for (const label of ['创作', '创作室', '设置', '支付']) {
  assert(!railBlock.includes(`label: '${label}'`), `ParallelUniverseShell public rail must not include ${label}.`)
}

const registryText = read('app/src/design-system/registry.ts')
assert(
  registryText.includes("requiredRailOrder: ['发现', '阅读', '书城', '会员']"),
  'Design-system registry must declare the current public rail order.',
)
assert(
  !registryText.includes("requiredRailOrder: ['发现', '书库', '阅读', '创作', '创作室', '设置', '支付']"),
  'Design-system registry still contains the old seven-item rail contract.',
)
assert(
  registryText.includes('CreatorConversationPanel'),
  'Design-system registry must include CreatorConversationPanel.',
)
assert(
  registryText.includes('LiquidGlass') && registryText.includes('@/components/ui/liquid-glass'),
  'Design-system registry must include the shadcn-compatible LiquidGlass primitive.',
)
for (const pattern of ['CreatorDialogueThread', 'CreatorReasoningMap', 'CreatorStoryNotes']) {
  assert(
    registryText.includes(pattern),
    `Design-system registry must include ${pattern}.`,
  )
}
for (const pattern of ['TopicFilterBar', 'RankedWorldList']) {
  assert(
    registryText.includes(pattern),
    `Design-system registry must include ${pattern}.`,
  )
}
for (const pattern of ['StudioTrendOpsPanel', 'CapabilityMapPanel']) {
  assert(
    registryText.includes(pattern),
    `Design-system registry must include ${pattern}.`,
  )
}

const pageContractsText = read('app/src/design-system/page-contracts.ts')
assert(
  pageContractsText.includes("'CreatorConversationPanel'"),
  'Page contracts must include CreatorConversationPanel as a creator pattern.',
)
for (const pattern of ["'CreatorDialogueThread'", "'CreatorReasoningMap'", "'CreatorStoryNotes'"]) {
  assert(
    pageContractsText.includes(pattern),
    `Page contracts must include ${pattern} as a creator pattern.`,
  )
}
for (const pattern of ["'TopicFilterBar'", "'RankedWorldList'"]) {
  assert(
    pageContractsText.includes(pattern),
    `Page contracts must include ${pattern} as a discover/library pattern.`,
  )
}
for (const pattern of ["'StudioTrendOpsPanel'", "'CapabilityMapPanel'"]) {
  assert(
    pageContractsText.includes(pattern),
    `Page contracts must include ${pattern} as a studio pattern.`,
  )
}
assert(
  pageContractsText.includes('普通用户主导航只保留发现、阅读、书城、会员'),
  'Page contracts must document the public navigation boundary.',
)
assert(
  pageContractsText.includes('LiquidGlass') && pageContractsText.includes('页面不得手写新的玻璃面板体系'),
  'Page contracts must document the LiquidGlass component boundary.',
)

const registryJsonPath = join(root, 'app/src/registry/parallel-universe-ui.registry.json')
const registryJson = JSON.parse(readFileSync(registryJsonPath, 'utf8'))
assert(
  registryJson.items?.some(item => item.name === 'creator-conversation-panel'),
  'shadcn registry JSON must export creator-conversation-panel.',
)
assert(
  registryJson.items?.some(item => item.name === 'liquid-glass'),
  'shadcn registry JSON must export liquid-glass.',
)
for (const itemName of ['creator-dialogue-thread', 'creator-reasoning-map', 'creator-story-notes']) {
  assert(
    registryJson.items?.some(item => item.name === itemName),
    `shadcn registry JSON must export ${itemName}.`,
  )
}
for (const itemName of ['topic-filter-bar', 'ranked-world-list']) {
  assert(
    registryJson.items?.some(item => item.name === itemName),
    `shadcn registry JSON must export ${itemName}.`,
  )
}
for (const itemName of ['studio-trend-ops-panel', 'capability-map-panel']) {
  assert(
    registryJson.items?.some(item => item.name === itemName),
    `shadcn registry JSON must export ${itemName}.`,
  )
}

const createText = read('app/src/pages/Create.tsx')
assert(
  createText.includes('CreatorConversationPanel'),
  'Create page must use CreatorConversationPanel instead of hand-rolling the empty creator card.',
)
for (const pattern of ['CreatorDialogueThread', 'CreatorReasoningMap', 'CreatorStoryNotes']) {
  assert(
    createText.includes(pattern),
    `Create page must use ${pattern} for the submitted creator experience.`,
  )
}
for (const staleSnippet of ['<div className="creator-empty creator-empty-dialogue">', '<article className="creator-coach-message">']) {
  assert(
    !createText.includes(staleSnippet),
    `Create page still hand-rolls creator empty state: ${staleSnippet}`,
  )
}
for (const internalTerm of ['系统从正文提取', '底盘预设', '人物系统', '场景系统', '世界规则系统', '从正文提取', '绑定']) {
  assert(
    !createText.includes(internalTerm),
    `Create page must not expose internal creator terminology: ${internalTerm}`,
  )
}
for (const adaptiveCreatorPattern of ['inferTemplateIdFromStorySeed', 'writingToneForTrend']) {
  assert(
    createText.includes(adaptiveCreatorPattern),
    `Create page must keep adaptive creator direction helper: ${adaptiveCreatorPattern}`,
  )
}

const homeText = read('app/src/pages/Home.tsx')
const libraryText = read('app/src/pages/Library.tsx')
for (const [fileLabel, body] of [['Home', homeText], ['Library', libraryText]]) {
  for (const pattern of ['TopicFilterBar', 'RankedWorldList']) {
    assert(
      body.includes(pattern),
      `${fileLabel} page must use shared ${pattern} instead of page-local duplicated list UI.`,
    )
  }
}

const accountText = read('app/src/pages/Account.tsx')
assert(
  accountText.includes('PlanCard'),
  'Account membership page must use PlanCard instead of hand-rolling tier cards.',
)
for (const required of ['completeCheckout', '检查开通状态', '刷新权益']) {
  assert(
    accountText.includes(required),
    `Account membership page must keep P21 checkout status and refresh behavior: ${required}`,
  )
}
for (const required of ['accountApi.getSnapshot', '阅读档案', '读者请求', '跨设备恢复']) {
  assert(
    accountText.includes(required),
    `Account membership page must keep P20 account snapshot behavior: ${required}`,
  )
}
assert(
  !accountText.includes('function TierCard'),
  'Account membership page must not reintroduce page-local tier cards.',
)

const marketTrendText = read('app/src/features/market/trends.ts')
for (const adaptiveCreatorExport of ['export function inferTemplateIdFromStorySeed', 'export function writingToneForTrend']) {
  assert(
    marketTrendText.includes(adaptiveCreatorExport),
    `Market trends must keep adaptive creator export: ${adaptiveCreatorExport}`,
  )
}

const studioText = read('app/src/pages/Studio.tsx')
for (const required of ['marketApi.scanTrends', 'StudioTrendOpsPanel', 'CapabilityMapPanel', 'capabilityAlignments', 'quality_gate.summary', 'quality_gate.blockers', 'quality_gate.warnings', 'quality_gate.suggested_fixes']) {
  assert(
    studioText.includes(required),
    `Studio must keep internal ops capability boundary and trend refresh control: ${required}`,
  )
}
const runtimeApiText = read('app/src/api/runtime.ts')
for (const required of ['QualityGateScores', 'QualityGateIssue', 'public_safe_message', 'studio_debug', 'release_decision', 'canon_commit_readiness']) {
  assert(
    runtimeApiText.includes(required),
    `Runtime API types must keep the P17 QualityGateResult field: ${required}`,
  )
}
const studioTrendOpsText = read('app/src/components/design-system/StudioTrendOpsPanel.tsx')
for (const required of ['market-scan-weekly', 'market-scan-monthly', '题材扫描合同', 'payload.function_call.name', '来源健康', '扫描审计', '模板影响', 'payload.ops']) {
  assert(
    studioTrendOpsText.includes(required),
    `StudioTrendOpsPanel must keep trend refresh and scan-contract surface: ${required}`,
  )
}
const capabilityMapText = read('app/src/components/design-system/CapabilityMapPanel.tsx')
for (const required of ['入口与服务对应关系', '已接服务合同', '仅工作台可见']) {
  assert(
    capabilityMapText.includes(required),
    `CapabilityMapPanel must keep internal capability mapping surface: ${required}`,
  )
}

for (const file of [
  'app/src/components/design-system/CreatorDialogueThread.tsx',
  'app/src/components/design-system/CreatorReasoningMap.tsx',
  'app/src/components/design-system/CreatorStoryNotes.tsx',
]) {
  const body = read(file)
  for (const internalTerm of ['system prompt', 'System Prompt', '系统从正文提取', '底盘预设', '从正文提取', '绑定', '原始思维链']) {
    assert(!body.includes(internalTerm), `${relative(appRoot, join(root, file))} exposes internal creator terminology: ${internalTerm}`)
  }
}

const styleText = read('app/src/index.css')
const tokenText = read('app/src/styles/parallel-universe-tokens.css')
const panelText = read('app/src/components/design-system/Panel.tsx')
const liquidGlassPath = join(root, 'app/src/components/ui/liquid-glass.tsx')
assert(
  existsSync(liquidGlassPath),
  'LiquidGlass component file must exist.',
)
assert(
  panelText.includes('LiquidGlass') && !panelText.includes('pu-surface') && !panelText.includes('bg-[var(--pu-cyan-500)]/10'),
  'Panel must compose LiquidGlass instead of hand-rolling glass surface classes.',
)
for (const required of ['.pu-liquid-glass', '.pu-liquid-glass-cyan', '.pu-liquid-depth-floating', '.pu-liquid-interactive']) {
  assert(tokenText.includes(required), `Parallel universe tokens must include LiquidGlass style hook: ${required}`)
}
assert(
  styleText.includes('.creator-thread-empty') && styleText.includes('overflow: visible'),
  'Creator empty-state layout must use natural page flow instead of nested clipping scroll.',
)
assert(
  styleText.includes('.creator-thread-active') && styleText.includes('overflow-y: auto'),
  'Creator active conversation thread should keep scroll behavior after a session exists.',
)

const docsPath = join(root, 'docs/design-system/DEVELOPMENT_NOTES.md')
assert(
  existsSync(docsPath),
  'Design-system development notes must exist.',
)
if (existsSync(docsPath)) {
  const docsText = readFileSync(docsPath, 'utf8')
	for (const required of ['2026-06-12', '/create', 'CreatorConversationPanel', 'CreatorReasoningMap', '普通用户主导航', '页面自然滚动', '自然语言对话', '创作脉络', '故事笔记', 'Vite + React + TypeScript', '子 agent 审批', '坚决不做重复开发', 'P16 热门题材扫描要有适配器边界', 'MarketTrendSourceAdapter', 'P17 质量检查必须分层组合', 'QualityGateResult', 'production_gate', 'P18 支付完成与账号同步', '预览闭环和生产回调', 'P19 发布候选', 'NARRATIVEOS_ALLOWED_ORIGIN_REGEX', 'RC preview', 'P20 账号快照', '/v1/account/snapshot', '跨设备恢复不能伪装完成', 'P21 生产支付硬化', '/v1/reader/checkout/return', 'provider callback 单独走', 'HMAC 验签', 'P22 账号合并', '/v1/account/merge/preview', '/v1/account/merge/confirm', '发现本机档案', '合并到账号', 'P23 账号数据治理', '/v1/account/data/export', '/v1/account/delete/preview', '/v1/account/delete/confirm', '导出我的数据', '删除账号', '账号已删除', 'P24 上线验收', 'scripts/check-launch-readiness.sh', 'package-vercel-preview.sh', 'package-vercel-backend-api.sh', 'production blocker', 'artifacts/visual-qa/p24-launch-routes', 'P25 部署执行', 'preview / staging deployment rehearsal', 'artifacts/integration/p25-deployment-execution', 'restore dry-run', 'recovery drill', 'P26 生产发布门禁', 'public production release gate', 'decision: blocked', 'check-production-release-gate.mjs', 'X-Content-Type-Options', 'P27 blocked launch handoff', 'check-blocked-launch-handoff.mjs', 'public_paid_production_launch: blocked', '单一可传输交付物', 'P28 blocked launch review', 'owner card', 'production resource intake', 'check-launch-review-intake.mjs', 'P29 blocked launch governance dashboard', 'evidence ledger', 'check-blocked-launch-governance.mjs', 'P30 owner escalation', 'escalation matrix', 'check-owner-escalation.mjs', 'P31 acceptance artifact template pack', 'p31-acceptance-templates', 'check-acceptance-templates.mjs', 'P32 acceptance artifact intake validator', 'missing artifacts are not a script failure', 'check-acceptance-intake.mjs', 'P33 external owner follow-up log', 'waiting_on_owner', 'check-owner-follow-up.mjs']) {
    assert(docsText.includes(required), `Development notes are missing required learning: ${required}`)
  }
}

const designSystemPlanPath = join(root, 'docs/design-system/SHADCN_UI_DESIGN_SYSTEM_PLAN.md')
if (existsSync(designSystemPlanPath)) {
  const planText = readFileSync(designSystemPlanPath, 'utf8')
  for (const required of ['Frontend source of truth', 'Vite + React + TypeScript', 'subagent approval review', 'Avoid duplicate development']) {
    assert(planText.includes(required), `Design-system plan is missing frontend source-of-truth rule: ${required}`)
  }
}

const readerCreatorFiles = [
  'app/src/pages/Home.tsx',
  'app/src/pages/Library.tsx',
  'app/src/pages/Story.tsx',
  'app/src/pages/Create.tsx',
]
const staleReaderTerms = ['后端', 'PRD', 'OpenAPI', '时间织机', '创作室', '作者入口', '写作专区', '主宇宙模板']
for (const file of readerCreatorFiles) {
  const body = read(file)
  for (const term of staleReaderTerms) {
    assert(!body.includes(term), `${relative(appRoot, join(root, file))} contains stale public-surface term: ${term}`)
  }
}

if (failures.length) {
  console.error('[design-system-boundary] failed')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[design-system-boundary] PASS')
