#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const authSessionStoragePath = 'app/src/lib/authSessionStorage.ts'
const retiredGenericStoragePath = 'app/src/lib/storage.ts'
const allowlist = [
  'app/src/local-db/legacyLocalStorageMigration.ts',
  authSessionStoragePath,
  'app/src/pages/Story.tsx',
  'app/src/__fixtures__/pmfSupabase.creator-qa.ts',
  'scripts/check-local-db-schema.mjs',
]
const failures = []

function walk(path, files = []) {
  const absolute = join(root, path)
  if (!existsSync(absolute)) return files
  const stat = statSync(absolute)
  if (stat.isFile()) {
    files.push(path)
    return files
  }
  for (const entry of readdirSync(absolute)) {
    if (entry === 'node_modules' || entry === '.git' || entry.startsWith('dist')) continue
    walk(join(path, entry), files)
  }
  return files
}

const files = [
  ...walk('app/src'),
].filter((path) => /\.(tsx?|mjs)$/.test(path))

if (existsSync(join(root, retiredGenericStoragePath))) {
  failures.push(`${retiredGenericStoragePath} is retired; auth tokens must use ${authSessionStoragePath}`)
}

for (const path of files) {
  const body = readFileSync(join(root, path), 'utf8')
  if (!allowlist.includes(path) && /\b(?:window\.)?localStorage\b/.test(body)) {
    failures.push(`${path} uses localStorage outside the classified legacy/migration boundary`)
  }
  if (path !== authSessionStoragePath && /\bqi_(?:token|refresh)\b/.test(body)) {
    failures.push(`${path} references auth-session storage keys outside ${authSessionStoragePath}`)
  }
  if (/(?:from\s+|import\s*\()\s*['"][^'"]*\/lib\/storage['"]/.test(body)) {
    failures.push(`${path} imports the retired generic auth storage owner`)
  }
}

const authSessionStorage = existsSync(join(root, authSessionStoragePath))
  ? readFileSync(join(root, authSessionStoragePath), 'utf8')
  : ''
if (!authSessionStorage) failures.push(`Missing ${authSessionStoragePath}`)
for (const marker of ['qi_token', 'qi_refresh', 'getAccessToken', 'setAccessToken', 'clear']) {
  if (!authSessionStorage.includes(marker)) {
    failures.push(`${authSessionStoragePath} is missing auth-session owner marker ${marker}`)
  }
}

const apiClient = readFileSync(join(root, 'app/src/api/client.ts'), 'utf8')
if (!apiClient.includes("from '@/lib/authSessionStorage'") || !apiClient.includes('authSessionStorage.getAccessToken()')) {
  failures.push('app/src/api/client.ts must read bearer tokens through authSessionStorage')
}

const authContext = readFileSync(join(root, 'app/src/context/AuthContext.tsx'), 'utf8')
for (const marker of [
  "from '@/lib/authSessionStorage'",
  'authSessionStorage.getAccessToken()',
  'authSessionStorage.setAccessToken(',
  'authSessionStorage.clear()',
]) {
  if (!authContext.includes(marker)) failures.push(`AuthContext auth-session ownership missing ${marker}`)
}

if (failures.length) {
  console.error('[no-localstorage-outside-migration] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[no-localstorage-outside-migration] PASS (${files.length} files scanned)`)
