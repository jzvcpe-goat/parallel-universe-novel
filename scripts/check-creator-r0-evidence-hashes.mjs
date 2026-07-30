import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const manifestPath = path.join(root, 'docs/reviews/CREATOR_MVP_R0_EVIDENCE_HASHES_20260722.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

if (manifest.schemaVersion !== 3) throw new Error('R0 evidence hash manifest must use schemaVersion 3')
for (const requiredPath of [
  'scripts/fixtures/creator-frozen-paired-quality-fixture.mts',
  'validation/story_seeds.json',
]) {
  if (!manifest.publicEvidence.some(evidence => evidence.path === requiredPath)) {
    throw new Error(`R0 evidence hash manifest is missing ${requiredPath}`)
  }
}
const reviewManifest = readFileSync(path.join(root, 'docs/reviews/CREATOR_MVP_R0_REVIEW_MANIFEST_20260722.md'), 'utf8')
if (reviewManifest.includes('Pending final hash')) {
  throw new Error('R0 review manifest must not retain pending final evidence hashes')
}
for (const evidence of manifest.publicEvidence) {
  if (evidence.path.includes('CREATOR_MVP_R0_EVIDENCE_HASHES')) {
    throw new Error('the hash manifest must not recursively hash itself')
  }
  const actual = createHash('sha256').update(readFileSync(path.join(root, evidence.path))).digest('hex')
  if (actual !== evidence.sha256) throw new Error(`stale R0 evidence hash: ${evidence.path}`)
}

console.log(`[creator-r0-evidence-hashes] PASS (${manifest.publicEvidence.length} files)`)
