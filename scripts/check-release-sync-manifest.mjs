#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const manifestPath = join(root, 'docs/baseline/RELEASE_SYNC_MANIFEST.json')

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const manifest = readJson(manifestPath)
const isSource = root.includes(manifest.sourceRootMarker)
const isRelease = root.includes(manifest.releaseRootMarker)
const sourceRoot = root.replace(manifest.releaseRootMarker, manifest.sourceRootMarker)

assert(manifest.version === 1, 'release sync manifest version must be 1')
assert(Array.isArray(manifest.syncAsIs) && manifest.syncAsIs.length > 0, 'syncAsIs must list reusable files')
assert(Array.isArray(manifest.managedWithReleaseOverrides), 'managedWithReleaseOverrides must be present')
assert(Array.isArray(manifest.releaseOnly), 'releaseOnly must be present')

const syncSet = new Set(manifest.syncAsIs)
assert(syncSet.size === manifest.syncAsIs.length, 'syncAsIs must not contain duplicate files')

for (const rel of manifest.syncAsIs) {
  assert(existsSync(join(root, rel)), `manifest syncAsIs file missing in current root: ${rel}`)
}

for (const entry of manifest.managedWithReleaseOverrides) {
  assert(!syncSet.has(entry.file), `${entry.file} must not be listed in syncAsIs because it has release overrides`)
  const pkg = readJson(join(root, entry.file))
  const expected = isRelease ? entry.releaseJson : isSource ? entry.sourceJson : null
  if (!expected) continue
  for (const [key, value] of Object.entries(expected)) {
    assert(pkg[key] === value, `${entry.file} expected ${key}=${value}, got ${pkg[key]}`)
  }
}

if (isRelease) {
  for (const rel of manifest.releaseOnly) {
    assert(existsSync(join(root, rel)), `manifest releaseOnly file missing in release root: ${rel}`)
  }
}

if (isRelease && existsSync(sourceRoot)) {
  for (const rel of manifest.syncAsIs) {
    const sourcePath = join(sourceRoot, rel)
    const releasePath = join(root, rel)
    assert(existsSync(sourcePath), `source syncAsIs file missing: ${rel}`)
    const sourceText = readFileSync(sourcePath, 'utf8')
    const releaseText = readFileSync(releasePath, 'utf8')
    assert(sourceText === releaseText, `release syncAsIs file differs from source: ${rel}`)
  }
}

console.log(JSON.stringify({
  status: 'passed',
  mode: isRelease ? 'release' : isSource ? 'source' : 'unknown',
  syncAsIsCount: manifest.syncAsIs.length,
  releaseOverrideCount: manifest.managedWithReleaseOverrides.length,
}, null, 2))
