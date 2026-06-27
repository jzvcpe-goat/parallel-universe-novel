import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const distDir = path.join(root, 'app/dist')

function collectFiles(dir) {
  if (!fs.existsSync(dir)) return []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  return entries.flatMap(entry => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) return collectFiles(fullPath)
    return fullPath
  })
}

if (process.env.PUBLIC_READER_BUNDLE_SKIP_BUILD !== 'true') {
  const result = spawnSync('npm', ['--prefix', 'app', 'run', 'build:reader'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

const bundleFiles = collectFiles(distDir).filter(file => /\.(?:js|html|css)$/.test(file))
if (!bundleFiles.length) {
  throw new Error('app/dist has no built Reader bundle files to scan')
}

const forbidden = [
  'Local Creator App',
  'creator_clients',
  'LOCAL_AI_SETTINGS_KEY',
  'parallel-universe.local-creator',
  '模型 key',
  'provider response',
  '发布章节',
  '读者请求队列',
  '请求队列',
  '/creator/login',
  '/creator/requests',
  '/creator/editor',
  '/creator/settings',
]

const offenders = []
for (const file of bundleFiles) {
  const body = fs.readFileSync(file, 'utf8')
  for (const marker of forbidden) {
    if (body.includes(marker)) {
      offenders.push({
        file: path.relative(root, file),
        marker,
      })
    }
  }
}

if (offenders.length) {
  console.error('[public-reader-bundle-boundary] Creator-only markers leaked into Reader bundle:')
  for (const offender of offenders) {
    console.error(`- ${offender.file}: ${offender.marker}`)
  }
  process.exit(1)
}

console.log(`public Reader bundle boundary passed (${bundleFiles.length} files scanned)`)
