import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const targets = [
  'app/src/apps/creator',
  'app/src/components/creator',
]

const bannedPatterns = [
  {
    pattern: /features\/parallel-universe\/data/,
    reason: 'Creator must not use Reader/demo universe fixtures as production data.',
  },
  {
    pattern: /\bworldTemplates\b/,
    reason: 'Creator must read works/branches/chapters through the Creator data layer.',
  },
  {
    pattern: /\bbeacon-beyond\b|\brain-bridge\b|\bjade-contract\b/,
    reason: 'Creator must not hard-code starter work ids in production UI.',
  },
]

type Finding = {
  file: string
  line: number
  reason: string
  text: string
}

function collectFiles(path: string): string[] {
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) return []
  const stat = statSync(absolute)
  if (stat.isFile()) return [absolute]
  return readdirSync(absolute)
    .flatMap(name => collectFiles(join(path, name)))
    .filter(file => /\.(tsx?|jsx?)$/.test(file))
}

const findings: Finding[] = []

for (const file of targets.flatMap(collectFiles)) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  lines.forEach((line, index) => {
    for (const banned of bannedPatterns) {
      if (banned.pattern.test(line)) {
        findings.push({
          file: relative(root, file),
          line: index + 1,
          reason: banned.reason,
          text: line.trim(),
        })
      }
    }
  })
}

if (findings.length) {
  console.error('[no-mock-data] Creator production mock data references found')
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} ${finding.reason} :: ${finding.text}`)
  }
  process.exit(1)
}

console.log(`[no-mock-data] PASS (${targets.length} target groups)`)
