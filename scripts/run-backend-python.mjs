#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const candidates = [
  process.env.PYTHON_BIN,
  resolve(root, 'backend/.venv/bin/python'),
  'python3.11',
  'python3',
  'python',
].filter(Boolean);

function canRun(command) {
  if (command.startsWith('/')) {
    if (!existsSync(command)) return false;
  }
  const result = spawnSync(command, [
    '-c',
    'import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)',
  ], { stdio: 'ignore' });
  return result.status === 0;
}

const python = candidates.find(canRun);

if (!python) {
  console.error('No Python 3.11+ runtime found. Run `npm run setup:api`, create backend/.venv with Python 3.11+, install python3.11, or set PYTHON_BIN.');
  process.exit(1);
}

const result = spawnSync(python, process.argv.slice(2), {
  cwd: root,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
