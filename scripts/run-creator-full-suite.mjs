#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

const commands = [
  'npm --prefix app run lint',
  'npm --prefix app run test:creator-decision-domain',
  'npm --prefix app run test:creator-writing-quality-depth',
  'npm --prefix app run test:creator-literary-value-evidence',
  'npm run test:creator-manual-recall-adherence',
  'npm run test:creator-working-agent-roles',
  'npm run test:creator-rag-bootstrap',
  'npm run test:creator-rag-benchmark-evaluator',
  'npm run test:creator-rag-lancedb-wiring',
  'npm run check:creator-rag-bootstrap',
  'npm run test:creator-conversation-recall',
  'npm run test:creator-longform-continuity',
  'npm run test:creator-long-range-story-threads',
  'npm --prefix app run test:creator-long-range-thread-recall',
  'npm run check:creator-long-range-thread-recall-projection',
  'npm run test:creator-paired-literary-comparison',
  'npm run test:creator-paired-quality-campaign',
  'npm run test:creator-historical-state-review',
  'npm run test:creator-next-chapter-service',
  'npm run test:creator-editor-stale-draft-guard',
  'npm run check:ui-copy',
  'npm run check:creator-product-boundary',
  'npm run check:creator-doc-copy-consistency',
  'npm run check:pivot',
  'npm run check:creator-decision-workbench',
  'npm run check:creator-private-evidence',
  'npm run check:design-tokens',
  'npm run check:design-system-boundary',
  'npm run check:no-mock-data',
  'npm run check:no-production-mock-data',
  'npm run check:creator-data-map',
  'npm run check:creator-socratic-setting-assets',
  'npm run check:reader-request-components',
  'npm run check:reader-account-components',
  'npm run check:reader-story-components',
  'npm run check:creator-m0-m1-baseline',
  'npm run check:creator-m2-today',
  'npm run check:creator-m3-requests',
  'npm run check:creator-m4-editor',
  'npm run check:creator-m5-works',
  'npm run check:creator-m6-publish',
  'npm run check:creator-m7-settings',
  'npm run check:creator-ui-contract',
  'npm run check:creator-author-flow-contract',
  'npm run check:reader-creator-copy-boundary',
]

for (const command of commands) {
  const result = spawnSync(command, { shell: true, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log(`[creator-full-suite] PASS (${commands.length} commands)`)
