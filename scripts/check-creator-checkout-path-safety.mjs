import { mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'creator-checkout-'))
const checkout = path.join(temporaryRoot, '小说 创作 checkout')
const browserQa = path.join(checkout, 'scripts/browser-agent-action-surface.mjs')

function run(script, label) {
  const result = spawnSync(process.execPath, [
    '--preserve-symlinks-main',
    script,
  ], {
    cwd: checkout,
    encoding: 'utf8',
    env: process.env,
  })
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${label} failed in non-ASCII checkout`)
  }
  return result.stdout
}

try {
  symlinkSync(root, checkout, 'dir')
  const browserSource = readFileSync(browserQa, 'utf8')
  if (!browserSource.includes("fileURLToPath(new URL('..', import.meta.url))")) {
    throw new Error('agent-action browser QA must derive root with fileURLToPath')
  }
  if (browserSource.includes("new URL('..', import.meta.url).pathname")) {
    throw new Error('agent-action browser QA must not use URL.pathname for filesystem paths')
  }
  run(path.join(checkout, 'scripts/check-external-echo-cloud-contract.mjs'), 'external echo contract gate')
  if (process.env.CREATOR_CHECKOUT_PATH_QA === 'true') {
    const output = run(browserQa, 'agent-action browser QA')
    if (!output.includes('"consumedCandidateConfirmations": 1')) {
      throw new Error('agent-action browser QA did not prove exactly one consumed candidate confirmation')
    }
    console.log(output.trim())
  }
  console.log('[creator-checkout-path-safety] PASS')
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true })
}
