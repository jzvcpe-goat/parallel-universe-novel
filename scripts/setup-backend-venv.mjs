#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const backendDir = resolve(root, 'backend')
const venvPython = resolve(backendDir, '.venv/bin/python')
const requirements = resolve(backendDir, 'requirements.txt')

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    ...options,
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function canRun(command) {
  const result = spawnSync(command, [
    '-c',
    'import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)',
  ], { stdio: 'ignore' })
  return result.status === 0
}

const python = [process.env.PYTHON_BIN, 'python3.11', 'python3', 'python']
  .filter(Boolean)
  .find(canRun)

if (!python) {
  console.error('No Python runtime found. Install Python 3.11+ or set PYTHON_BIN.')
  process.exit(1)
}

if (!existsSync(venvPython) || !canRun(venvPython)) {
  run(python, ['-m', 'venv', '--clear', resolve(backendDir, '.venv')])
}

run(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip'])
run(venvPython, ['-m', 'pip', 'install', '-r', requirements])
