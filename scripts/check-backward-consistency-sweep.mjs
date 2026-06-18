#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')
const violations = []

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function assert(condition, message) {
  if (!condition) violations.push(message)
}

function assertIncludes(file, terms) {
  const text = read(file)
  for (const term of terms) {
    assert(text.includes(term), `${file} must include ${term}`)
  }
}

function assertExcludes(file, terms) {
  const text = read(file)
  for (const term of terms) {
    assert(!text.includes(term), `${file} must not include stale term ${term}`)
  }
}

function sourceRefsFrom(items) {
  const refs = new Set()
  for (const item of items) {
    for (const ref of item.sourceRefs || []) refs.add(String(ref))
  }
  return refs
}

function writeArtifact(status) {
  mkdirSync(artifactDir, { recursive: true })
  const artifact = {
    status,
    generatedAt: new Date().toISOString(),
    artifactContract: 'BACKWARD_CONSISTENCY_SWEEP',
    checkedAreas: [
      'GENRE_CONSTRAINT_RULES.md',
      'GENRE_KERNEL_RULES.md',
      'genre-runtime-rules.v1.json',
      'backend public projection',
      'Creator Studio and Reader public UI',
      'Quality Brake fixtures',
      'reference-work vault and public refs',
      'scan scripts and root test chain',
      'development notes and handoff docs',
    ],
    issueCount: violations.length,
    violationDetailsIncluded: false,
  }
  const path = join(artifactDir, `backward-consistency-sweep-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(path, `${JSON.stringify(artifact, null, 2)}\n`)
  return path
}

const packageJson = readJson('package.json')
const rootTest = String(packageJson.scripts.test || '')
const requiredRootCommands = [
  'npm run check:p4-document-core',
  'npm run check:p4-deprecated-case-logic',
  'npm run scan:p4-rule-source',
  'npm run check:reference-vault-access',
  'npm run scan:reference-privacy',
  'npm run check:public-projection-privacy',
  'npm run check:public-privacy-artifacts',
  'npm run check:backward-consistency-sweep',
]
for (const command of requiredRootCommands) {
  assert(rootTest.includes(command), `root npm run test must include ${command}`)
}

assert(
  packageJson.scripts['check:backward-consistency-sweep'] === 'node scripts/check-backward-consistency-sweep.mjs',
  'package.json must expose check:backward-consistency-sweep',
)
assert(
  packageJson.scripts['check:public-projection-privacy'] === 'node scripts/check-public-projection-privacy.mjs',
  'package.json must expose check:public-projection-privacy',
)
assert(
  packageJson.scripts['check:public-privacy-artifacts'] === 'node scripts/check-public-privacy-artifacts.mjs',
  'package.json must expose check:public-privacy-artifacts',
)

assertIncludes('docs/product/rules/GENRE_CONSTRAINT_RULES.md', [
  'representative works remain in the encrypted vault',
  'Source refs:',
  '`rwref_',
  'deprecated case-derived constraints are purged',
])
assertIncludes('docs/product/rules/GENRE_KERNEL_RULES.md', [
  'Representative works are private research inputs',
  'Source refs:',
  '`rwref_',
  'Do not paste representative work titles into this file',
])
assertIncludes('docs/product/rules/PRIVACY_BOUNDARY_MATRIX.md', [
  'Human rule docs',
  'Runtime registry',
  'Internal session state',
  'Public API',
  'UI',
  'Preview build',
  'Logs / fixtures / artifacts',
  'Git history',
  'Public Projection Boundary',
])

const runtimeRules = readJson('docs/product/rules/genre-runtime-rules.v1.json')
assert(runtimeRules.privacy?.representativeWorks === 'encrypted_vault_only', 'runtime privacy must keep representative works encrypted only')
assert(runtimeRules.privacy?.publicReferenceField === 'sourceRefs', 'runtime privacy public reference field must be sourceRefs')
assert(runtimeRules.documentCore?.deprecatedCasePolicy?.status === 'purged', 'deprecated case logic must stay purged')
assert(runtimeRules.documentCore?.runtimeContract?.publicSurfacePolicy === 'hide_profile_ids_kernel_ids_source_refs_provider_prompt_plumbing', 'public surface policy must hide runtime internals')
const profileRefs = sourceRefsFrom(runtimeRules.constraintProfiles || [])
const kernelRefs = sourceRefsFrom(runtimeRules.genreKernels || [])
for (const ref of [...profileRefs, ...kernelRefs]) {
  assert(/^rwref_\d{4}$/.test(ref), `runtime sourceRefs must stay anonymous: ${ref}`)
}

assertIncludes('scripts/scan-p4-rule-source.mjs', [
  'GENRE_CONSTRAINT_RULES.md table source refs',
  'GENRE_CONSTRAINT_RULES.md section source refs',
  'GENRE_KERNEL_RULES.md table source refs',
  'GENRE_KERNEL_RULES.md section source refs',
  'deprecatedCasePolicy',
])
assertIncludes('scripts/scan-reference-privacy.mjs', [
  'validateGitHistoryPrivacy',
  'validateMarkdownSourceRefs',
  'validateRuntimeSourceRefs',
  'validatePublicRuleTextNoTitleMarkers',
  'encrypted representative work title appears in public current file',
])
assertIncludes('scripts/check-public-projection-privacy.mjs', [
  'backend/src/narrativeos/services/creator_dialogue.py',
  'scripts/smoke-creator-chain.mjs',
  'strictPublicRoots',
  'redactedArtifactRoots',
  'PUBLIC_PROJECTION_PRIVACY_SKIP_BUILD',
])
assertIncludes('scripts/check-public-privacy-artifacts.mjs', [
  'P92_PUBLIC_PRIVACY_ARTIFACT_ATTESTATION',
  'reference-privacy',
  'public-projection-privacy',
  'violationCount',
  'redaction',
])

assertIncludes('backend/src/narrativeos/services/creator_dialogue.py', [
  'def _public_session',
  'def _public_turn',
  'def _public_source',
  'def _public_setting_cards',
  'public_surface',
])
assertIncludes('backend/tests/test_creator_dialogue_api.py', [
  'assert "source_refs" not in serialized',
  'assert "rwref_" not in serialized',
  'assert profile["id"] not in serialized',
  'assert expected_kernel["id"] not in serialized',
])

assertIncludes('scripts/scan-public-ui-boundary.mjs', [
  'sourceRefs',
  'source_refs',
  'profileCount',
  'kernelCount',
  'sourceLabels',
])
assertIncludes('scripts/smoke-creator-chain.mjs', [
  'assertNoPublicInternals',
  "serialized.includes('rwref_')",
  "serialized.includes('source_refs')",
])
assertExcludes('scripts/smoke-deployed-api.sh', [
  'prompt_id',
  'prompt_version',
  'imported_novel_starter_system_prompt',
])
assertIncludes('scripts/smoke-deployed-api.sh', [
  '"guide_id": "novel_starter_guide"',
])

assertIncludes('.github/workflows/pages.yml', [
  'run: npm run test',
  'PUBLIC_PROJECTION_PRIVACY_SKIP_BUILD=true npm run check:public-projection-privacy',
  'Check public privacy artifact content',
  'CHECK_PUBLIC_PRIVACY_ARTIFACTS_REQUIRED: true',
  'npm run check:public-privacy-artifacts',
  'name: public-projection-privacy',
  'path: artifacts/runtime/public-projection-privacy-*.json',
  'name: reference-privacy',
])
assertIncludes('scripts/check-github-actions-artifacts.mjs', [
  'reference-privacy',
  'public-projection-privacy',
])

assertIncludes('docs/design-system/DEVELOPMENT_NOTES.md', [
  'Public Projection Privacy Audit',
  'P82 Reference Ref Consistency Gate',
  'P4 Public Projection And FailBehavior',
  'P4 废弃特例逻辑回归门禁',
  'Backward Consistency Sweep',
  'privacy 类 release artifact',
  'redaction flags',
])
assertIncludes('docs/backend/P83_BACKWARD_CONSISTENCY_SWEEP.md', [
  '| Area | Checked | Issue Found | Fix Applied | Gate |',
  'GENRE_CONSTRAINT_RULES.md',
  'GENRE_KERNEL_RULES.md',
  'Public Projection Privacy Audit',
  'check:public-privacy-artifacts',
  'P92',
])

for (const requiredFile of [
  'backend/tests/fixtures/romance_world_bible.json',
  'backend/tests/benchmark_baseline.json',
  'backend/tests/long_route_benchmark_baseline.json',
]) {
  assert(existsSync(join(root, requiredFile)), `${requiredFile} must exist for fixture/backward sweep coverage`)
}

const artifactPath = writeArtifact(violations.length ? 'failed' : 'passed')

if (violations.length) {
  console.error(`backward consistency sweep failed (${violations.length}); artifact: ${relative(root, artifactPath)}`)
  for (const violation of violations.slice(0, 80)) console.error(`- ${violation}`)
  if (violations.length > 80) console.error(`... ${violations.length - 80} more`)
  process.exit(1)
}

console.log(JSON.stringify({
  status: 'passed',
  artifact: relative(root, artifactPath),
  checkedAreas: 9,
}, null, 2))
