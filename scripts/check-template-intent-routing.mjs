#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const code = `
  import { inferTemplateIdFromStorySeed, marketTrendFallback } from './app/src/features/market/trends.ts';

  const cases = [
    ['现代悬疑旧案，主角拿到一份矛盾证据。', 'rain-bridge'],
    ['都市谜案从一段雨夜录像开始。', 'rain-bridge'],
    ['我想写系统流，任务每次都会收走一段记忆。', 'echo-ledger'],
    ['玄幻悬疑，灯塔和古契牵出失落王朝。', 'beacon-beyond'],
    ['历史架空，边城收到一封密诏。', 'frontier-edict'],
  ];

  for (const [seed, expected] of cases) {
    const actual = inferTemplateIdFromStorySeed(seed, marketTrendFallback, 'beacon-beyond');
    if (actual !== expected) {
      throw new Error(\`intent routing failed: \${seed} expected \${expected} got \${actual}\`);
    }
  }
`

const result = spawnSync(resolve(root, 'node_modules/.bin/tsx'), ['--eval', code], {
  cwd: root,
  stdio: 'inherit',
})

process.exit(result.status ?? 1)
