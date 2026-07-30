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
  if (!body.includes(needle)) throw new Error(`${label}: expected ${JSON.stringify(needle)}`)
}

function assertNotIncludes(body, needle, label) {
  if (body.includes(needle)) throw new Error(`${label}: must not include ${JSON.stringify(needle)}`)
}

const copyDictionary = read('docs/product/ui-copy-dictionary.md')
const creatorFlows = read('docs/product/creator-user-flows.md')
const blueprint = read('docs/product/CREATOR_UI_EXECUTION_BLUEPRINT.md')
const settingsGate = read('scripts/check-creator-m7-settings.ts')
const uiContractGate = read('scripts/check-creator-ui-contract.ts')
const browserGate = read('scripts/browser-local-creator-authenticated-routes.mjs')
const creator = read('app/src/apps/creator/LocalCreatorApp.tsx')

for (const [body, label] of [
  [copyDictionary, 'UI copy dictionary'],
  [creatorFlows, 'Creator user flows'],
  [blueprint, 'Creator execution blueprint'],
]) {
  for (const stale of [
    '本地创作台',
    '私人写作服务',
    '私人写作工具',
    '访问状态',
    '写作工具来源',
    '访问凭证',
    '| API key | 凭据 |',
  ]) {
    assertNotIncludes(body, stale, `${label} current Creator terminology`)
  }
}

assertIncludes(copyDictionary, '| AI / 模型 / LLM | Describe the author action; do not expose model setup |', 'UI copy dictionary model-setup boundary')
assertIncludes(copyDictionary, '| API key | Never collect or display in product UI |', 'UI copy dictionary credential boundary')
assertIncludes(copyDictionary, '| Provider | Never expose as a Local Workspace setting |', 'UI copy dictionary provider boundary')

assertIncludes(creatorFlows, 'Author opens the author workbench on their own device.', 'Creator user flows device-owned opening')
assertIncludes(creatorFlows, 'Author reviews local records, backup/recovery state, assistant permissions, and recent operations.', 'Creator user flows Local Workspace wording')
assertIncludes(creatorFlows, 'Model, provider, service-address, and credential setup are not exposed as a product workflow.', 'Creator user flows retired setup boundary')

assertIncludes(blueprint, 'Creator is an author-owned workbench', 'Creator blueprint author-owned definition')
assertIncludes(blueprint, 'No hosted author access material.', 'Creator blueprint access boundary wording')
assertIncludes(blueprint, '| Creator surface name | 作者工作台 |', 'Creator blueprint product name')

assertNotIncludes(creator, '访问凭证', 'Creator product source must not use credential-like visible wording')
assertNotIncludes(creator, '凭证', 'Creator product source must not use credential-like wording')

for (const [body, label] of [
  [settingsGate, 'Settings gate'],
  [uiContractGate, 'Creator UI contract gate'],
]) {
  assertIncludes(body, '凭证', `${label} must guard against credential-like wording`)
}

assertIncludes(browserGate, '访问凭证', 'Browser gate must block credential-like visible wording')

console.log('[creator-doc-copy-consistency] PASS')
