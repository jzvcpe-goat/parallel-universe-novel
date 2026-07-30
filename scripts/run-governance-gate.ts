#!/usr/bin/env node

const { spawnSync } = require('node:child_process')
const { resolve } = require('node:path')

function runGovernanceGate(relativeModulePath: string) {
  const result = spawnSync(process.execPath, [resolve(__dirname, relativeModulePath)], {
    stdio: 'inherit',
  })

  if (result.error) {
    console.error(`[governance-gate] unable to run ${relativeModulePath}: ${result.error.message}`)
    process.exit(1)
  }

  process.exit(result.status ?? 1)
}

module.exports = { runGovernanceGate }
