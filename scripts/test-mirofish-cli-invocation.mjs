#!/usr/bin/env node

import assert from 'node:assert/strict'
import {
  isMiroFishConfigured,
  resolveMiroFishInvocation,
} from './mirofish-cli-invocation.mjs'

const executable = resolveMiroFishInvocation({
  PUF_MIROFISH_COMMAND: '/opt/mirofish/bin/mirofish',
})
assert.deepEqual(executable, {
  command: '/opt/mirofish/bin/mirofish',
  argsPrefix: [],
  mode: 'executable',
  projectPath: null,
})

const sourceProject = resolveMiroFishInvocation({
  PUF_MIROFISH_PROJECT: '/opt/upstream/mirofish-cli',
  PUF_MIROFISH_UV_COMMAND: '/opt/uv/bin/uv',
})
assert.deepEqual(sourceProject, {
  command: '/opt/uv/bin/uv',
  argsPrefix: [
    'run',
    '--project',
    '/opt/upstream/mirofish-cli',
    'mirofish',
  ],
  mode: 'source_project',
  projectPath: '/opt/upstream/mirofish-cli',
})

assert.equal(isMiroFishConfigured({}), false)
assert.equal(isMiroFishConfigured({ PUF_MIROFISH_COMMAND: 'mirofish' }), true)
assert.equal(isMiroFishConfigured({ PUF_MIROFISH_PROJECT: '/opt/upstream/mirofish-cli' }), true)

console.log('[mirofish-cli-invocation] PASS')
