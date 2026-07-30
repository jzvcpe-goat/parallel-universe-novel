#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const productionTargets = [
  'app/src/apps/creator',
  'app/src/components/creator',
  'app/src/lib/pmfSupabase.ts',
]

const fixturePath = 'app/src/__fixtures__/pmfSupabase.creator-qa.ts'
const viteConfigPath = 'app/vite.config.ts'

const bannedPatterns = [
  {
    pattern: /__fixtures__/,
    reason: 'Production Creator code must not import QA fixtures directly.',
  },
  {
    pattern: /\bmock\b|\bdemo\b|\bsample\b|\bhardcoded\b/i,
    reason: 'Production Creator code must not depend on mock/demo/sample/hardcoded data.',
  },
  {
    pattern: /request-fog-|work-fog-|work-silver-|chapter-fog-|chapter-inn-|event-fog-|qa-local-author|creator-client-qa|creator-qa/i,
    reason: 'Production Creator code must not contain QA fixture ids.',
  },
  {
    pattern: /const\s+\w+\s*:\s*Pmf(ReaderRequest|Work|Branch|Chapter|PublishEvent)\[\]\s*=\s*\[/,
    reason: 'Production Creator code must not define typed fixture arrays.',
  },
]

function collectFiles(path) {
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) return []
  const stat = statSync(absolute)
  if (stat.isFile()) return [absolute]
  return readdirSync(absolute)
    .flatMap(name => collectFiles(join(path, name)))
    .filter(file => /\.(tsx?|jsx?|mjs)$/.test(file))
}

const findings = []

for (const file of productionTargets.flatMap(collectFiles)) {
  const rel = relative(root, file)
  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  lines.forEach((line, index) => {
    for (const banned of bannedPatterns) {
      if (banned.pattern.test(line)) {
        findings.push({
          file: rel,
          line: index + 1,
          reason: banned.reason,
          text: line.trim(),
        })
      }
    }
  })
}

if (!existsSync(resolve(root, fixturePath))) {
  findings.push({
    file: fixturePath,
    line: 0,
    reason: 'QA fixture adapter must stay isolated in app/src/__fixtures__.',
    text: 'Missing creator QA fixture adapter.',
  })
}

const viteConfig = readFileSync(resolve(root, viteConfigPath), 'utf8')
for (const required of [
  "mode === 'creator-qa'",
  '@/lib/pmfSupabase',
  './src/__fixtures__/pmfSupabase.creator-qa.ts',
]) {
  if (!viteConfig.includes(required)) {
    findings.push({
      file: viteConfigPath,
      line: 0,
      reason: 'Creator QA fixture alias must be limited to creator-qa mode.',
      text: `Missing ${required}`,
    })
  }
}

const qaAliasIndex = viteConfig.indexOf("mode === 'creator-qa'")
const fixtureAliasIndex = viteConfig.indexOf('./src/__fixtures__/pmfSupabase.creator-qa.ts')
if (qaAliasIndex === -1 || fixtureAliasIndex === -1 || fixtureAliasIndex < qaAliasIndex) {
  findings.push({
    file: viteConfigPath,
    line: 0,
    reason: 'Fixture alias must be gated behind creator-qa mode.',
    text: 'Fixture alias appears outside the creator-qa branch.',
  })
}

if (findings.length) {
  console.error('[no-production-mock-data] Production fixture boundary violations found')
  for (const finding of findings) {
    const location = finding.line > 0 ? `${finding.file}:${finding.line}` : finding.file
    console.error(`${location} ${finding.reason} :: ${finding.text}`)
  }
  process.exit(1)
}

console.log(`[no-production-mock-data] PASS (${productionTargets.length} production target groups)`)
