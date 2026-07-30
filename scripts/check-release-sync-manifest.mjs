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

assert(manifest.version === 2, 'release sync manifest version must be 2')
assert(Array.isArray(manifest.syncAsIs) && manifest.syncAsIs.length > 0, 'syncAsIs must list reusable files')
assert(Array.isArray(manifest.releaseAuthoritative), 'releaseAuthoritative must be present')
assert(Array.isArray(manifest.managedWithReleaseOverrides), 'managedWithReleaseOverrides must be present')
assert(Array.isArray(manifest.releaseOnly), 'releaseOnly must be present')

const syncSet = new Set(manifest.syncAsIs)
assert(syncSet.size === manifest.syncAsIs.length, 'syncAsIs must not contain duplicate files')
const releaseAuthoritativeFiles = manifest.releaseAuthoritative.map((entry) => entry.file)
const releaseAuthoritativeSet = new Set(releaseAuthoritativeFiles)
assert(releaseAuthoritativeSet.size === releaseAuthoritativeFiles.length, 'releaseAuthoritative must not contain duplicate files')

for (const entry of manifest.releaseAuthoritative) {
  assert(typeof entry.file === 'string' && entry.file.length > 0, 'releaseAuthoritative entry must have a file')
  assert(typeof entry.reason === 'string' && entry.reason.length > 0, `${entry.file} releaseAuthoritative entry must have a reason`)
  assert(!syncSet.has(entry.file), `${entry.file} must not be listed in both syncAsIs and releaseAuthoritative`)
  assert(!manifest.releaseOnly.includes(entry.file), `${entry.file} must not be listed in both releaseOnly and releaseAuthoritative`)
}

for (const rel of manifest.syncAsIs) {
  assert(existsSync(join(root, rel)), `manifest syncAsIs file missing in current root: ${rel}`)
}

for (const entry of manifest.managedWithReleaseOverrides) {
  assert(!syncSet.has(entry.file), `${entry.file} must not be listed in syncAsIs because it has release overrides`)
  assert(!releaseAuthoritativeSet.has(entry.file), `${entry.file} must not be listed in releaseAuthoritative because it has managed release overrides`)
  const pkg = readJson(join(root, entry.file))
  const expected = isRelease ? entry.releaseJson : isSource ? entry.sourceJson : null
  if (!expected) continue
  for (const [key, value] of Object.entries(expected)) {
    assert(pkg[key] === value, `${entry.file} expected ${key}=${value}, got ${pkg[key]}`)
  }
}

if (isRelease) {
  for (const entry of manifest.releaseAuthoritative) {
    assert(existsSync(join(root, entry.file)), `manifest releaseAuthoritative file missing in release root: ${entry.file}`)
  }
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
  for (const entry of manifest.managedWithReleaseOverrides) {
    const sourcePath = join(sourceRoot, entry.file)
    assert(existsSync(sourcePath), `source managed file missing: ${entry.file}`)
    const sourceJson = readJson(sourcePath)
    for (const [key, value] of Object.entries(entry.sourceJson || {})) {
      assert(
        sourceJson[key] === value,
        `source managed file ${entry.file} expected ${key}=${value}, got ${sourceJson[key]}`,
      )
    }
  }
}

console.log(JSON.stringify({
  status: 'passed',
  mode: isRelease ? 'release' : isSource ? 'source' : 'unknown',
  syncAsIsCount: manifest.syncAsIs.length,
  releaseAuthoritativeCount: manifest.releaseAuthoritative.length,
  releaseOverrideCount: manifest.managedWithReleaseOverrides.length,
}, null, 2))
