#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const candidates = [
  resolve(root, 'backend/.venv/bin/python'),
  'python3',
  'python',
];

function canRun(command) {
  if (command.startsWith('/')) {
    return existsSync(command);
  }
  const result = spawnSync(command, ['--version'], { stdio: 'ignore' });
  return result.status === 0;
}

const python = candidates.find(canRun);

if (!python) {
  console.error('No Python runtime found. Create backend/.venv or install python3.');
  process.exit(1);
}

const result = spawnSync(python, process.argv.slice(2), {
  cwd: root,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
