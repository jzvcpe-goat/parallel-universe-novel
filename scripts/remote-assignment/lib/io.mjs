import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

export async function readJson(filePath) {
  const raw = await readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

export async function maybeReadJson(filePath) {
  if (!existsSync(filePath)) return null
  return readJson(filePath)
}

export async function writeJson(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

export async function writeText(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, value, 'utf8')
}

export function nowIso() {
  return new Date().toISOString()
}

export function repoRoot() {
  return resolve(new URL('../../..', import.meta.url).pathname)
}

export function defaultPaths() {
  const root = repoRoot()
  const base = join(root, 'deploy/runtime-production')
  const generated = join(base, 'generated')
  return {
    root,
    base,
    generated,
    intent: join(base, 'runtime-assignment.intent.local.json'),
    intentExample: join(base, 'runtime-assignment.intent.example.json'),
    contract: join(generated, 'remote-assignment.contract.json'),
    legacyEnvGenerated: join(generated, 'remote-assignment.legacy.env'),
    legacyEnvLocal: join(base, 'remote-assignment.env.local'),
    evidence: join(generated, 'operator-assignment-evidence.md'),
    ledgerPatch: join(generated, 'loop-next-goal-ledger.patch.json'),
    healthRequest: join(generated, 'remote-health-evidence.request.json'),
    healthResult: join(generated, 'remote-health-evidence.result.json'),
  }
}
