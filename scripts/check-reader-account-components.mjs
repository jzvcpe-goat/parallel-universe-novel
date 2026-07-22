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

const accountPage = read('app/src/pages/Account.tsx')
const heroCard = read('app/src/components/reader/ReaderAccountHeroCard.tsx')
const entitlementGrid = read('app/src/components/reader/ReaderEntitlementSummaryGrid.tsx')
const mergePanel = read('app/src/components/reader/ReaderAccountMergePanel.tsx')
const accountGrid = read('app/src/components/reader/ReaderAccountStatusGrid.tsx')
const dataPanel = read('app/src/components/reader/ReaderDataControlPanel.tsx')
const checkoutPanel = read('app/src/components/reader/ReaderCheckoutProgressPanel.tsx')
const membershipPanel = read('app/src/components/reader/ReaderMembershipPlanPanel.tsx')
const accountSurface = accountPage + heroCard + mergePanel + dataPanel + checkoutPanel + membershipPanel
const css = read('app/src/index.css')
const registry = read('app/src/design-system/registry.ts')
const pageContracts = read('app/src/design-system/page-contracts.ts')
const registryJson = read('app/src/registry/parallel-universe-ui.registry.json')
const componentsDoc = read('docs/design-system/components.md')

for (const marker of [
  "import { ReaderAccountStatusGrid }",
  "import { ReaderAccountHeroCard }",
  "import { ReaderCheckoutProgressPanel }",
  "import { ReaderMembershipPlanPanel }",
  "import { ReaderEntitlementSummaryGrid }",
  "import { ReaderAccountMergePanel }",
  "import { ReaderDataControlPanel }",
  '<ReaderAccountHeroCard',
  '<ReaderAccountMergePanel',
  '<ReaderAccountStatusGrid cards={readerAccountCards} />',
  '<ReaderEntitlementSummaryGrid cards={entitlementSummaryCards} />',
  '<ReaderDataControlPanel',
  '<ReaderCheckoutProgressPanel',
  '<ReaderMembershipPlanPanel',
  'entitlementSummaryCards',
  'readerAccountCards',
  '请求失败\\s*\\(\\d{3}\\)|http_\\d{3}|status\\s*\\d{3}',
  '当前开通请求暂时不可用，请稍后再试。',
]) {
  assertIncludes(accountPage, marker, `Account page marker ${marker}`)
}

for (const marker of ['阅读、互动和会员记录', '条互动']) {
  assertIncludes(accountSurface, marker, `Account Reader copy marker ${marker}`)
}

for (const oldCopy of [
  '阅读、创作和会员记录',
  '阅读、创作',
  '份草稿',
  '创作草稿',
  '创作记录',
  '后续会收敛为请求状态',
]) {
  assertNotIncludes(accountPage, oldCopy, `Account public copy must not keep Creator/draft wording ${oldCopy}`)
}

for (const oldMarkup of [
  '<Panel className="p-5">',
  "<p className=\"text-xs tracking-[0.14em] text-[var(--ink-dim)]\">{isAuthenticated ? '当前账号' : '当前方案'}</p>",
  '<section className="grid gap-4 md:grid-cols-3">',
  '<h2 className="text-lg font-semibold text-[var(--ink-paper)]">阅读次数</h2>',
  '<h2 className="text-lg font-semibold text-[var(--ink-paper)]">互动请求</h2>',
  '<h2 className="text-lg font-semibold text-[var(--ink-paper)]">保存状态</h2>',
  '<h2 className="text-2xl font-semibold text-[var(--ink-paper)]">账号恢复</h2>',
  'className="mt-5 grid gap-4 rounded-lg border border-white/10 bg-white/[0.025] p-4 lg:grid-cols-[minmax(0,1fr)_180px]"',
  '<p className="text-xs tracking-[0.12em] text-[var(--ink-dim)]">保存账号</p>',
  '<div className="rounded-lg border border-white/10 bg-black/20 p-4">',
  '<h2 className="text-2xl font-semibold text-[var(--ink-paper)]">账号与数据</h2>',
  '<h2 className="text-xl font-semibold text-[var(--ink-paper)]">开通进度</h2>',
  '<div className="mt-4 rounded-lg border border-white/10 bg-white/[0.025] p-4">',
  '<PlanCard',
  "import { PlanCard }",
  '<input\n                    className="w-full rounded-lg border border-white/10 bg-black/20',
  '<div key={item.kind} className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2 text-sm">',
]) {
  assertNotIncludes(accountPage, oldMarkup, `Account page must not rebuild account panels locally ${oldMarkup}`)
}

for (const marker of [
  'export function ReaderAccountHeroCard',
  'reader-account-hero-card',
  'reader-account-hero-icon',
  'variant="glass"',
  'CardHeader',
  'CardContent',
  'Badge',
  '当前账号',
  '当前方案',
]) {
  assertIncludes(heroCard + accountPage, marker, `ReaderAccountHeroCard marker ${marker}`)
}

for (const forbidden of ['Panel', 'rounded-lg border border-white/10 bg-white/[0.025]']) {
  assertNotIncludes(heroCard, forbidden, `ReaderAccountHeroCard must use shadcn Card, not old Panel/card markup ${forbidden}`)
}

for (const marker of [
  'export function ReaderEntitlementSummaryGrid',
  'reader-entitlement-summary-grid',
  'reader-entitlement-summary-card',
  'variant="glass"',
  'CardHeader',
  'CardContent',
  'Badge',
]) {
  assertIncludes(entitlementGrid, marker, `ReaderEntitlementSummaryGrid marker ${marker}`)
}

for (const marker of ['阅读次数', '互动请求', '保存状态']) {
  assertIncludes(accountPage, marker, `Account page supplies entitlement summary copy ${marker}`)
}

for (const forbidden of ['Panel', 'rounded-lg border border-white/10 bg-white/[0.025]']) {
  assertNotIncludes(entitlementGrid, forbidden, `ReaderEntitlementSummaryGrid must use shadcn Card, not old Panel/card markup ${forbidden}`)
}

for (const marker of [
  'export function ReaderAccountMergePanel',
  'reader-account-merge-panel',
  'reader-account-merge-shell',
  'reader-account-auth-form',
  'reader-account-auth-card',
  'reader-account-merge-stat',
  'reader-account-merge-actions',
  'variant="glass"',
  'CardHeader',
  'CardContent',
  'Badge',
  'Button',
  'Input',
  'Label',
  '账号恢复',
  '登录后合并',
  '检查浏览器档案',
  '合并到账号',
]) {
  assertIncludes(mergePanel, marker, `ReaderAccountMergePanel marker ${marker}`)
}

for (const forbidden of ['<input', 'rounded-lg border border-white/10 bg-white/[0.025]', 'rounded-lg border border-white/10 bg-black/20']) {
  assertNotIncludes(mergePanel, forbidden, `ReaderAccountMergePanel must use shadcn primitives, not page-local form/card markup ${forbidden}`)
}

for (const marker of [
  'export function ReaderAccountStatusGrid',
  'reader-account-status-grid',
  'reader-account-status-card',
  'variant="glass"',
  'CardHeader',
  'CardContent',
  'Badge',
  'Button',
  '阅读进度',
  '读者愿望',
  '档案恢复',
]) {
  assertIncludes(accountGrid, marker, `ReaderAccountStatusGrid marker ${marker}`)
}

for (const marker of [
  'export function ReaderDataControlPanel',
  'reader-data-control-panel',
  'reader-data-control-shell',
  'reader-data-action-card',
  'reader-data-confirm-card',
  'variant="glass"',
  'CardHeader',
  'CardContent',
  'Badge',
  'Button',
  'Input',
  '可导出内容',
  '删除影响',
  '输入“删除账号”确认',
]) {
  assertIncludes(dataPanel, marker, `ReaderDataControlPanel marker ${marker}`)
}

for (const forbidden of ['<input', 'rounded-lg border border-white/10 bg-black/20 px-3 py-3']) {
  assertNotIncludes(dataPanel, forbidden, `ReaderDataControlPanel must use shadcn Input, not raw local input ${forbidden}`)
}

for (const marker of [
  'export function ReaderCheckoutProgressPanel',
  'reader-checkout-progress-panel',
  'reader-checkout-progress-card',
  'reader-checkout-progress-note',
  'variant="glass"',
  'CardHeader',
  'CardContent',
  'CardDescription',
  'Badge',
  'Button',
  '开通进度',
  '检查开通状态',
  '回到阅读',
]) {
  assertIncludes(checkoutPanel, marker, `ReaderCheckoutProgressPanel marker ${marker}`)
}

for (const forbidden of ['narrative-panel', 'rounded-lg border border-white/10 bg-white/[0.025]']) {
  assertNotIncludes(checkoutPanel, forbidden, `ReaderCheckoutProgressPanel must use shadcn Card, not old progress panel markup ${forbidden}`)
}

for (const marker of [
  'export function ReaderMembershipPlanPanel',
  'reader-membership-plan-panel',
  'reader-membership-plan-card',
  'reader-membership-plan-grid',
  'reader-membership-plan-empty',
  'variant="glass"',
  'CardHeader',
  'CardContent',
  'CardDescription',
  'Badge',
  'PlanCard',
  '选择会员方案',
  '阅读会员适合追更读者',
  '会员方案暂时不可用',
]) {
  assertIncludes(membershipPanel, marker, `ReaderMembershipPlanPanel marker ${marker}`)
}

for (const forbidden of ['narrative-panel', '<section className="narrative-panel p-5">']) {
  assertNotIncludes(membershipPanel, forbidden, `ReaderMembershipPlanPanel must own a shadcn Card shell, not old membership section markup ${forbidden}`)
}

for (const marker of [
  '.reader-account-hero-card',
  '.reader-account-hero-icon',
  '.reader-checkout-progress-card',
  '.reader-checkout-progress-note',
  '.reader-membership-plan-card',
  '.reader-membership-plan-grid',
  '.reader-membership-plan-empty',
  '.reader-account-status-grid',
  '.reader-account-status-card',
]) {
  assertIncludes(css, marker, `Reader account CSS marker ${marker}`)
}

for (const marker of ['ReaderAccountHeroCard', 'reader-account-hero-card', 'ReaderEntitlementSummaryGrid', 'reader-entitlement-summary-grid', 'ReaderAccountMergePanel', 'reader-account-merge-panel', 'ReaderAccountStatusGrid', 'reader-account-status-grid', 'ReaderDataControlPanel', 'reader-data-control-panel', 'ReaderCheckoutProgressPanel', 'reader-checkout-progress-panel', 'ReaderMembershipPlanPanel', 'reader-membership-plan-panel']) {
  assertIncludes(registry, 'ReaderAccountHeroCard', 'Design-system registry includes ReaderAccountHeroCard')
  assertIncludes(registry, 'ReaderEntitlementSummaryGrid', 'Design-system registry includes ReaderEntitlementSummaryGrid')
  assertIncludes(registry, 'ReaderAccountMergePanel', 'Design-system registry includes ReaderAccountMergePanel')
  assertIncludes(registry, 'ReaderAccountStatusGrid', 'Design-system registry includes ReaderAccountStatusGrid')
  assertIncludes(registry, 'ReaderDataControlPanel', 'Design-system registry includes ReaderDataControlPanel')
  assertIncludes(registry, 'ReaderCheckoutProgressPanel', 'Design-system registry includes ReaderCheckoutProgressPanel')
  assertIncludes(registry, 'ReaderMembershipPlanPanel', 'Design-system registry includes ReaderMembershipPlanPanel')
  assertIncludes(pageContracts, 'ReaderAccountHeroCard', 'Page contracts include ReaderAccountHeroCard')
  assertIncludes(pageContracts, 'ReaderEntitlementSummaryGrid', 'Page contracts include ReaderEntitlementSummaryGrid')
  assertIncludes(pageContracts, 'ReaderAccountMergePanel', 'Page contracts include ReaderAccountMergePanel')
  assertIncludes(pageContracts, 'ReaderAccountStatusGrid', 'Page contracts include ReaderAccountStatusGrid')
  assertIncludes(pageContracts, 'ReaderDataControlPanel', 'Page contracts include ReaderDataControlPanel')
  assertIncludes(pageContracts, 'ReaderCheckoutProgressPanel', 'Page contracts include ReaderCheckoutProgressPanel')
  assertIncludes(pageContracts, 'ReaderMembershipPlanPanel', 'Page contracts include ReaderMembershipPlanPanel')
  assertIncludes(registryJson, 'reader-account-hero-card', 'Registry JSON includes reader-account-hero-card')
  assertIncludes(registryJson, 'reader-entitlement-summary-grid', 'Registry JSON includes reader-entitlement-summary-grid')
  assertIncludes(registryJson, 'reader-account-merge-panel', 'Registry JSON includes reader-account-merge-panel')
  assertIncludes(registryJson, 'reader-account-status-grid', 'Registry JSON includes reader-account-status-grid')
  assertIncludes(registryJson, 'reader-data-control-panel', 'Registry JSON includes reader-data-control-panel')
  assertIncludes(registryJson, 'reader-checkout-progress-panel', 'Registry JSON includes reader-checkout-progress-panel')
  assertIncludes(registryJson, 'reader-membership-plan-panel', 'Registry JSON includes reader-membership-plan-panel')
  assertIncludes(componentsDoc, 'ReaderAccountHeroCard', 'Components doc includes ReaderAccountHeroCard')
  assertIncludes(componentsDoc, 'ReaderEntitlementSummaryGrid', 'Components doc includes ReaderEntitlementSummaryGrid')
  assertIncludes(componentsDoc, 'ReaderAccountMergePanel', 'Components doc includes ReaderAccountMergePanel')
  assertIncludes(componentsDoc, 'ReaderAccountStatusGrid', 'Components doc includes ReaderAccountStatusGrid')
  assertIncludes(componentsDoc, 'ReaderDataControlPanel', 'Components doc includes ReaderDataControlPanel')
  assertIncludes(componentsDoc, 'ReaderCheckoutProgressPanel', 'Components doc includes ReaderCheckoutProgressPanel')
  assertIncludes(componentsDoc, 'ReaderMembershipPlanPanel', 'Components doc includes ReaderMembershipPlanPanel')
  assertIncludes(accountPage + heroCard + entitlementGrid + mergePanel + accountGrid + dataPanel + checkoutPanel + membershipPanel + registry + pageContracts + registryJson + componentsDoc, marker, `Reader account design-system marker ${marker}`)
}

console.log('[reader-account-components] PASS')
