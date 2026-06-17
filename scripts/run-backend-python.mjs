#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const candidates = [
  process.env.PYTHON_BIN,
  resolve(root, 'backend/.venv/bin/python'),
  'python3',
  'python',
].filter(Boolean);

function canRun(command) {
  if (command.startsWith('/')) {
    return existsSync(command);
  }
  const result = spawnSync(command, ['--version'], { stdio: 'ignore' });
  return result.status === 0;
}

const python = candidates.find(canRun);

if (!python) {
  console.error('No Python runtime found. Run `npm run setup:api`, create backend/.venv, install python3, or set PYTHON_BIN.');
  process.exit(1);
}

const result = spawnSync(python, process.argv.slice(2), {
  cwd: root,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
