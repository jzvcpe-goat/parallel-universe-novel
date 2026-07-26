import { mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'creator-checkout-'))
const checkout = path.join(temporaryRoot, '小说 创作 checkout')

try {
  symlinkSync(root, checkout, 'dir')
  const result = spawnSync(process.execPath, [
    '--preserve-symlinks-main',
    path.join(checkout, 'scripts/check-external-echo-cloud-contract.mjs'),
  ], { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'non-ASCII checkout path check failed')
  console.log('[creator-checkout-path-safety] PASS')
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true })
}
