#!/usr/bin/env node

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const checks = [
  ['author-direction prose trial', 'check:creator-author-direction-prose-trial', ['validation/creator-ui/author-direction-prose-real-trial-2026-07-16/summary.json']],
  ['manual-recall adherence trial', 'check:creator-manual-recall-adherence-real-trial', ['validation/creator-ui/manual-recall-adherence-real-trial-2026-07-18/summary.json']],
  ['paired-quality trial', 'check:creator-frozen-paired-quality-trial', ['validation/creator-ui/frozen-paired-quality-real-trial-2026-07-16/summary.json']],
  ['paired-quality campaign', 'check:creator-frozen-paired-quality-campaign', ['validation/creator-ui/frozen-paired-quality-multi-seed-real-campaign-2026-07-16/summary.json']],
  ['six-seed paired-quality campaign', 'check:creator-frozen-paired-quality-six-seed-campaign', ['validation/creator-ui/frozen-paired-quality-six-seed-real-campaign-2026-07-16/summary.json']],
  ['literary-repair campaign', 'check:creator-frozen-paired-quality-literary-repair-campaign', ['validation/creator-ui/frozen-paired-quality-six-seed-literary-repair-rerun-2026-07-16/summary.json']],
  ['prose-economy campaign', 'check:creator-frozen-paired-quality-prose-economy-campaign', ['validation/creator-ui/frozen-paired-quality-six-seed-prose-economy-rerun-2026-07-17/summary.json']],
  ['focused-review trial', 'check:creator-frozen-paired-quality-focused-review-trial', ['validation/creator-ui/frozen-paired-quality-six-seed-focused-review-rerun-2026-07-17/trials/04-frozen-original-glass-lung-endurance-v1.json']],
  ['floodgate structure rerun', 'check:creator-floodgate-structure-review-rerun', ['validation/creator-ui/frozen-paired-quality-floodgate-structure-review-rerun-2026-07-18/summary.json']],
  ['paired-verification revision trial', 'check:creator-paired-verification-revision-real-trial', ['validation/creator-ui/frozen-paired-quality-verifier-evidence-revision-real-trial-2026-07-18/summary.json']],
  ['writing capability evidence', 'check:creator-writing-capability-evidence', ['validation/creator-writing/capability-evidence-audit-2026-07-17.json']],
  ['literary-value evidence', 'check:creator-literary-value-evidence', ['validation/creator-writing/literary-value-evidence-real-workspace-2026-07-21.json']],
]

let measured = 0
let notMeasured = 0

for (const [label, command, receipts] of checks) {
  const present = receipts.filter(receipt => existsSync(resolve(root, receipt)))
  if (present.length === 0) {
    notMeasured += 1
    console.log(`[creator-private-evidence] NOT_MEASURED ${label} (private receipt excluded from checkout)`)
    continue
  }
  if (present.length !== receipts.length) {
    console.error(`[creator-private-evidence] FAIL ${label} (partial private receipt set)`)
    process.exit(1)
  }

  const result = spawnSync('npm', ['run', command], { cwd: root, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
  measured += 1
}

console.log(`[creator-private-evidence] PASS (${measured} measured; ${notMeasured} NOT_MEASURED)`)
