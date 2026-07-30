import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function pathFor(path: string) {
  return resolve(root, path)
}

function read(path: string) {
  const absolute = pathFor(path)
  if (!existsSync(absolute)) throw new Error(`Missing required file: ${path}`)
  return readFileSync(absolute, 'utf8')
}

function assert(condition: boolean, label: string) {
  if (!condition) throw new Error(label)
}

function assertIncludes(body: string, needle: string, label: string) {
  assert(body.includes(needle), `${label}: expected to include ${JSON.stringify(needle)}`)
}

const requiredDocs = [
  'AGENTS.md',
  'docs/product/creator-ui-vision.md',
  'docs/product/creator-user-flows.md',
  'docs/product/ui-copy-dictionary.md',
  'docs/product/banned-ui-terms.md',
  'docs/design-system/tokens.md',
  'docs/design-system/components.md',
  'docs/design-system/liquid-glass.md',
  'docs/design-system/motion.md',
  'docs/design-system/accessibility.md',
  'docs/data-contracts/creator-data-map.md',
  'docs/data-contracts/request-status-machine.md',
  'docs/data-contracts/publish-flow.md',
  'docs/data-contracts/draft-storage-boundary.md',
  'docs/harness/implementation-rules.md',
  'docs/harness/page-acceptance-tests.md',
  'docs/harness/component-dod.md',
  'docs/harness/visual-regression-checklist.md',
  'docs/harness/creator-ui-m8-qa-20260628.md',
  'docs/harness/creator-ui-requirement-audit-20260628.md',
]

const requiredScripts = [
  'scripts/check-ui-copy.ts',
  'scripts/check-design-tokens.ts',
  'scripts/check-no-mock-data.ts',
  'scripts/check-creator-m0-m1-baseline.ts',
  'scripts/check-creator-m2-today.ts',
  'scripts/check-creator-m3-requests.ts',
  'scripts/check-creator-m4-editor.ts',
  'scripts/check-creator-m5-works.ts',
  'scripts/check-creator-m6-publish.ts',
  'scripts/check-creator-m7-settings.ts',
  'scripts/check-creator-ui-contract.ts',
  'scripts/check-creator-author-flow-contract.ts',
  'scripts/browser-local-creator-routes.mjs',
  'scripts/browser-local-creator-authenticated-routes.mjs',
]

for (const file of [...requiredDocs, ...requiredScripts]) {
  assert(existsSync(pathFor(file)), `missing M8 artifact: ${file}`)
}

const packageJson = read('package.json')
const qaRecord = read('docs/harness/creator-ui-m8-qa-20260628.md')
const requirementAudit = read('docs/harness/creator-ui-requirement-audit-20260628.md')
const visualChecklist = read('docs/harness/visual-regression-checklist.md')
const pageAcceptance = read('docs/harness/page-acceptance-tests.md')

for (const script of [
  'check:ui-copy',
  'check:design-tokens',
  'check:no-mock-data',
  'check:creator-m0-m1-baseline',
  'check:creator-m2-today',
  'check:creator-m3-requests',
  'check:creator-m4-editor',
  'check:creator-m5-works',
  'check:creator-m6-publish',
  'check:creator-m7-settings',
  'check:creator-ui-contract',
  'check:creator-author-flow-contract',
  'qa:local-creator-routes',
  'qa:local-creator-authenticated-routes',
]) {
  assertIncludes(packageJson, `"${script}"`, `package script ${script}`)
}

for (const milestone of [
  'M0/M1',
  'M2',
  'M3',
  'M4',
  'M5',
  'M6',
  'M7',
]) {
  assertIncludes(qaRecord, milestone, `QA record includes ${milestone}`)
}

for (const command of [
  'npm run test:creator',
  'npm run build:creator',
  'npm run check:public-reader-bundle-boundary',
  'npm run qa:local-creator-routes',
  'npm run qa:local-creator-authenticated-routes',
  'npm run check:creator-m6-publish',
  'npm run check:creator-m7-settings',
]) {
  assertIncludes(qaRecord + requirementAudit, command, `M8 docs include command ${command}`)
}

for (const route of [
  '/creator/login',
  '/creator',
  '/creator/requests',
  '/creator/editor',
  '/creator/works',
  '/creator/publish',
  '/creator/settings',
]) {
  assertIncludes(visualChecklist + requirementAudit, route, `visual audit route ${route}`)
}

for (const screenshot of [
  'artifacts/visual-qa/local-creator-authenticated/creator-1782714906074.png',
  'artifacts/visual-qa/local-creator-authenticated/creator-requests-1782714907031.png',
  'artifacts/visual-qa/local-creator-authenticated/creator-editor-1782714907473.png',
  'artifacts/visual-qa/local-creator-authenticated/creator-works-1782714907890.png',
  'artifacts/visual-qa/local-creator-authenticated/creator-publish-1782714908330.png',
  'artifacts/visual-qa/local-creator-authenticated/creator-settings-1782714908780.png',
  'artifacts/visual-qa/local-creator/creator-login-1782714976168.png',
  'artifacts/visual-qa/local-creator/creator-1782714977100.png',
  'artifacts/visual-qa/local-creator/creator-requests-1782714977302.png',
  'artifacts/visual-qa/local-creator/creator-editor-1782714977485.png',
  'artifacts/visual-qa/local-creator/creator-works-1782714977661.png',
  'artifacts/visual-qa/local-creator/creator-publish-1782714977846.png',
  'artifacts/visual-qa/local-creator/creator-settings-1782714978041.png',
]) {
  assertIncludes(qaRecord, screenshot, `QA record includes screenshot ${screenshot}`)
  assert(existsSync(pathFor(screenshot)), `screenshot evidence missing: ${screenshot}`)
}

for (const page of ['今日', '外界回声', '写作台', '作品与支线', '发布检查', '本机工作区']) {
  assertIncludes(pageAcceptance + requirementAudit, page, `acceptance/audit covers ${page}`)
}

for (const boundary of [
  'No engineering vocabulary in product UI',
  'Reader visual separation',
  'No fake permanent merge without merge columns',
  'Draft body remains local and can enter publish check',
  'Publishes only after explicit confirmation',
  'Credential state only, no plaintext',
]) {
  assertIncludes(requirementAudit, boundary, `requirement audit covers ${boundary}`)
}

assert(!existsSync(pathFor('app/dist-creator-qa')), 'QA temporary build directory must be cleaned: app/dist-creator-qa')

console.log('[creator-m8-qa] PASS')
