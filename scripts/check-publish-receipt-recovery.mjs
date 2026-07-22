#!/usr/bin/env node
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const fixture = spawnSync(resolve(root, 'node_modules/.bin/tsx'), ['tests/publish-receipt-recovery.ts'], {
  cwd: resolve(root, 'app'),
  encoding: 'utf8',
})

if (fixture.status !== 0) {
  console.error('[publish-receipt-recovery] FAIL')
  process.stderr.write(`${fixture.stdout}${fixture.stderr}`)
  process.exit(1)
}

console.log('[publish-receipt-recovery] PASS')
