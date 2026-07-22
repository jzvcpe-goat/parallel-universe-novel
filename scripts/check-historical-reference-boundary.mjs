#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const registryPath = 'docs/launch/046_HISTORICAL_REFERENCE_BOUNDARY.md'
const authorityPaths = [
  'docs/product/creator-pivot-v2-contract.md',
  'docs/launch/045_CREATOR_PIVOT_NEXT_DEVELOPMENT_PLAN.md',
  'docs/launch/043_SLICE_OWNERSHIP_MATRIX.md',
]
const historicalDocuments = [
  'docs/design-system/UI_UX_DESIGN_CODE_DELIVERY_20260701.md',
  'docs/design-system/UI_UX_DESIGN_CODE_REVIEW_HANDOFF_20260701.md',
  'docs/design-system/UI_UX_REVIEW_PACKET_20260701.md',
  'docs/product/CREATOR_UI_EXECUTION_BLUEPRINT.md',
  'docs/product/LOCAL_CREATOR_UI_UX_PRODUCT_CONFIRMATION_PLAN.md',
  'docs/product/LOCAL_CREATOR_UI_UX_REVIEW_PLAN.md',
  'docs/product/LOCAL_CREATOR_UI_UX_EXECUTION_PLAN_FOR_REVIEW.md',
  'docs/product/LOCAL_CREATOR_UI_UX_BACKEND_ALIGNED_PLAN.md',
]

const failures = []

function read(path) {
  const absolute = join(root, path)
  if (!existsSync(absolute)) {
    failures.push(`${path} is missing`)
    return ''
  }
  return readFileSync(absolute, 'utf8')
}

for (const path of authorityPaths) read(path)

const registry = read(registryPath)
for (const path of historicalDocuments) {
  const body = read(path)
  const header = body.split('\n').slice(0, 10).join('\n')

  if (!header.includes('Historical reference boundary:')) {
    failures.push(`${path} is missing the historical reference boundary near its title`)
  }
  if (!header.includes('Status: `historical_pre_pivot_reference`')) {
    failures.push(`${path} is missing the machine-readable historical status near its title`)
  }
  for (const authorityPath of authorityPaths) {
    if (!header.includes(authorityPath)) {
      failures.push(`${path} does not name current authority ${authorityPath}`)
    }
  }
  if (!header.includes('Do not restore retired request-management')) {
    failures.push(`${path} does not prohibit restoring retired pre-Pivot behavior`)
  }
  if (!registry.includes(`\`${path}\``)) {
    failures.push(`${registryPath} does not classify ${path}`)
  }
}

if (!registry.includes('Historical material cannot override a later contract, owner, gate, or deletion receipt.')) {
  failures.push(`${registryPath} is missing the authority precedence rule`)
}

if (failures.length) {
  console.error('[historical-reference-boundary] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(
  `[historical-reference-boundary] PASS (${historicalDocuments.length} historical documents, ${authorityPaths.length} current authorities)`,
)
