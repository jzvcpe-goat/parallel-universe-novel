#!/usr/bin/env node

import { spawn } from 'node:child_process'

const commands = [
  ['npm', ['run', 'dev:infra']],
  ['npm', ['run', 'dev:api']],
  ['npm', ['run', 'dev:agents']],
  ['npm', ['run', 'dev:creator']],
]

const children = []

for (const [cmd, args] of commands) {
  const child = spawn(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  children.push(child)
}

function shutdown() {
  for (const child of children) child.kill('SIGTERM')
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

