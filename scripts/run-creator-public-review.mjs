#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

const commands = [
  ['npm', ['--prefix', 'app', 'run', 'lint']],
  ['npm', ['--prefix', 'app', 'run', 'test:creator-decision-domain']],
  ['npm', ['--prefix', 'app', 'run', 'test:creator-writing-quality-depth']],
  ['npm', ['--prefix', 'app', 'run', 'test:creator-literary-value-evidence']],
  ['npm', ['run', 'test:creator-working-agent-roles']],
  ['npm', ['run', 'test:creator-rag-bootstrap']],
  ['npm', ['run', 'test:creator-rag-benchmark-evaluator']],
  ['npm', ['run', 'test:creator-rag-lancedb-wiring']],
  ['npm', ['run', 'test:creator-conversation-recall']],
  ['npm', ['run', 'test:creator-longform-continuity']],
  ['npm', ['run', 'test:creator-long-range-story-threads']],
  ['npm', ['--prefix', 'app', 'run', 'test:creator-long-range-thread-recall']],
  ['npm', ['run', 'check:ui-copy']],
  ['npm', ['run', 'check:creator-product-boundary']],
  ['npm', ['run', 'check:creator-doc-copy-consistency']],
  ['npm', ['run', 'check:pivot']],
  ['npm', ['run', 'check:creator-decision-workbench']],
  ['npm', ['run', 'check:design-tokens']],
  ['npm', ['run', 'check:design-system-boundary']],
  ['npm', ['run', 'check:no-mock-data']],
  ['npm', ['run', 'check:no-production-mock-data']],
  ['npm', ['run', 'check:creator-data-map']],
]

for (const [command, args] of commands) {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log('[creator-public-review] PASS')
