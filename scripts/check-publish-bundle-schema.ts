#!/usr/bin/env node

// Stable TypeScript entrypoint; the mature gate implementation remains single-owned in the MJS module.
const { runGovernanceGate } = require('./run-governance-gate.ts')

runGovernanceGate('check-publish-bundle-schema.mjs')
