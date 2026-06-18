#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')
const matrixPath = join(root, 'docs/product/rules/PRIVACY_BOUNDARY_MATRIX.md')
const packagePath = join(root, 'package.json')

const strictPublicRoots = [
  'app/dist',
  'playwright-report',
  'test-results',
  'app/test-results',
  'packages/agent-runtime/test-results',
]

const redactedArtifactRoots = [
  'artifacts/runtime',
  'backend/tests/fixtures',
  'packages/agent-runtime/fixtures',
]

const binaryExtensions = new Set([
  '.avif',
  '.gif',
  '.ico',
  '.jpeg',
  '.jpg',
  '.pdf',
  '.png',
  '.webp',
  '.woff',
  '.woff2',
  '.zip',
])

const commandResults = []
const violations = []

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function tail(value, limit = 1600) {
  const text = String(value || '')
  return text.length > limit ? text.slice(-limit) : text
}

function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length
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

function run(label, command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  })
  commandResults.push({
    label,
    command: [command, ...args].join(' '),
    status: result.status ?? 1,
    stdoutTail: tail(result.stdout),
    stderrTail: tail(result.stderr),
  })
  if (result.status !== 0) {
    violations.push(`${label} failed with status ${result.status ?? 'unknown'}`)
  }
}

function collectFiles(rootRel) {
  const start = join(root, rootRel)
  if (!existsSync(start)) return []
  const files = []
  function walk(current) {
    const stat = statSync(current)
    if (stat.isFile()) {
      files.push(current)
      return
    }
    for (const child of readdirSync(current)) {
      if (['node_modules', '.git'].includes(child)) continue
      walk(join(current, child))
    }
  }
  walk(start)
  return files.filter(file => !binaryExtensions.has(extname(file).toLowerCase()))
}

function scanFiles(rootRels, patterns, label) {
  const files = rootRels.flatMap(collectFiles)
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    for (const check of patterns) {
      const match = text.match(check.pattern)
      if (match?.index !== undefined) {
        violations.push(`${relative(root, file)}:${lineNumber(text, match.index)} ${label}: ${check.message}`)
      }
    }
  }
  return files.length
}

function writeArtifact(status, counts) {
  mkdirSync(artifactDir, { recursive: true })
  const artifact = {
    status,
    generatedAt: new Date().toISOString(),
    artifactContract: 'PUBLIC_PROJECTION_PRIVACY_AUDIT',
    boundary: 'Public Projection Boundary',
    checks: {
      matrixPresent: existsSync(matrixPath),
      frontendPreviewBuilt: commandResults.some(item => item.label === 'frontend preview build' && item.status === 0),
      publicUiBoundaryScan: commandResults.some(item => item.label === 'public UI boundary scan' && item.status === 0),
      referencePrivacyScan: commandResults.some(item => item.label === 'reference privacy scan' && item.status === 0),
      runtimeRuleSourceScan: commandResults.some(item => item.label === 'runtime rule source scan' && item.status === 0),
      vaultAccessGate: commandResults.some(item => item.label === 'reference vault access gate' && item.status === 0),
    },
    scanStats: counts,
    commandResults: commandResults.map(item => ({
      label: item.label,
      command: item.command,
      status: item.status,
    })),
    redaction: {
      violationDetailsIncluded: false,
      representativeNamesIncluded: false,
      sourceRefMappingsIncluded: false,
      promptTextIncluded: false,
      providerPayloadIncluded: false,
      vaultMetadataIncluded: false,
    },
    violationCount: violations.length,
  }
  const artifactPath = join(artifactDir, `public-projection-privacy-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)
  return artifactPath
}

assert(existsSync(matrixPath), 'docs/product/rules/PRIVACY_BOUNDARY_MATRIX.md must exist')
assertIncludes('docs/product/rules/PRIVACY_BOUNDARY_MATRIX.md', [
  'Document-Core Boundary',
  'Runtime Registry Boundary',
  'Reference Work Privacy Boundary',
  'Public Projection Boundary',
  'Deprecated Case Logic Guard',
  'Quality Brake Mapping',
  'Human rule docs',
  'Runtime registry',
  'Internal session state',
  'Public API',
  'UI',
  'Preview build',
  'Logs / fixtures / artifacts',
  'Git history',
  'representative work names',
  'sourceRefs',
  '`rwref_*` to plaintext mapping',
  'profile.id',
  'kernel.id',
  'provider prompt plumbing',
  'vault metadata',
  'deprecated case logic',
  'The encrypted representative-work vault must not be CI-decryptable by default',
])

const packageJson = readJson('package.json')
assert(
  packageJson.scripts['check:public-projection-privacy'] === 'node scripts/check-public-projection-privacy.mjs',
  'package.json must expose check:public-projection-privacy',
)
assert(
  String(packageJson.scripts.test || '').includes('npm run check:public-projection-privacy'),
  'root npm run test must include check:public-projection-privacy',
)

assertIncludes('backend/src/narrativeos/services/creator_dialogue.py', [
  'def _public_session',
  'def _public_turn',
  'def _public_source',
  'projected.pop("model_status", None)',
  'projected.pop("harness_trace", None)',
  '"guide_contract"',
])
assertIncludes('backend/tests/test_creator_dialogue_api.py', [
  'source_evidence',
  'source_refs',
  'rwref_',
  'profile["id"]',
  'expected_kernel["id"]',
  'assert "model_status" not in payload["assistant"]',
  'assert "harness_trace" not in payload["assistant"]',
  '"prompt_contract"',
])
assertIncludes('packages/agent-runtime/src/workflows.test.ts', [
  'public socratic projection hides runtime internals',
  'runtimeArtifact',
  'sourceRefs',
  'kernelId',
  'profileId',
])
assertIncludes('scripts/smoke-creator-chain.mjs', [
  'assertNoPublicInternals',
  'publicCreated',
  'publicQuality',
  'publicPreview',
  "serialized.includes('rwref_')",
  "serialized.includes('source_refs')",
])
assertIncludes('scripts/scan-public-ui-boundary.mjs', [
  'sourceRefs',
  'source_refs',
  'runtime_rules',
])
assertIncludes('scripts/scan-reference-privacy.mjs', [
  'validateGitHistoryPrivacy',
  'app/dist',
  'artifacts/runtime',
  'decryptedVaultScan',
])
assertIncludes('scripts/scan-p4-rule-source.mjs', [
  'deprecatedCasePolicy',
  'sourceRefs',
  'section source refs',
])

run('frontend preview build', 'npm', ['--prefix', 'app', 'run', 'build'])
run('public UI boundary scan', 'npm', ['run', 'scan:public-ui-boundary'])
run('runtime rule source scan', 'npm', ['run', 'scan:p4-rule-source'])
run('reference vault access gate', 'npm', ['run', 'check:reference-vault-access'])
run('reference privacy scan', 'npm', ['run', 'scan:reference-privacy'])

const strictPublicFilesScanned = scanFiles(strictPublicRoots, [
  { pattern: /\bsourceRefs\b|\bsource_refs\b/, message: 'must not expose source reference fields' },
  { pattern: /\brwref_\d{4}\b/, message: 'must not expose anonymous reference ids in public projection output' },
  { pattern: /\bprofile\.id\b|\bprofile_id\b/, message: 'must not expose runtime profile ids' },
  { pattern: /\bkernel\.id\b|\bkernel_id\b/, message: 'must not expose runtime kernel ids' },
  { pattern: /\bruntime_rules\b/, message: 'must not expose raw runtime rules' },
  { pattern: /\bsource_labels\b|\bsourceLabels\b/, message: 'must not expose source labels' },
  { pattern: /\bprompt_id\b|\bprompt_contract\b|\bsystem_prompt\b|\bimported_novel_starter_system_prompt\b/, message: 'must not expose prompt plumbing' },
  { pattern: /\brepresentativeWorkTitle\b|\bworkTitle\b|\bauthorName\b/, message: 'must not expose representative work metadata fields' },
  { pattern: /provider[_ -]?prompt|raw provider request/i, message: 'must not expose provider prompt plumbing' },
  { pattern: /vault metadata|decrypted vault|reference-work-vault\.key/i, message: 'must not expose vault metadata' },
], 'strict public projection scan')

const redactedArtifactFilesScanned = scanFiles(redactedArtifactRoots, [
  { pattern: /\brwref_\d{4}\b.{0,160}(《|workTitle|representativeWorkTitle|authorName|作者名|作品名|书名)/, message: 'must not map anonymous refs to plaintext works' },
  { pattern: /\brepresentativeWorkTitle\b|\bworkTitle\b|\bauthorName\b/, message: 'must not expose representative work metadata fields' },
  { pattern: /"decryptedMappingsIncluded"\s*:\s*true|"plaintextMappingsIncluded"\s*:\s*true/i, message: 'must not expose plaintext mapping payloads' },
  { pattern: /decrypted[_ -]?mapping\s*[:=]\s*(?!false\b|null\b|0\b)/i, message: 'must not expose decrypted mapping payloads' },
  { pattern: /plaintext[_ -]?mapping\s*[:=]\s*(?!false\b|null\b|0\b)/i, message: 'must not expose plaintext mapping payloads' },
  { pattern: /raw provider request|provider prompt payload/i, message: 'must not expose raw provider prompt payloads' },
  { pattern: /REFERENCE_WORK_VAULT_KEY\s*[:=]\s*["']?[A-Za-z0-9+/=]{24,}/, message: 'must not expose concrete vault key values' },
], 'redacted artifact scan')

const artifactPath = writeArtifact(violations.length ? 'failed' : 'passed', {
  strictPublicRoots,
  redactedArtifactRoots,
  strictPublicFilesScanned,
  redactedArtifactFilesScanned,
})

if (violations.length) {
  console.error(`public projection privacy audit failed (${violations.length}); artifact: ${relative(root, artifactPath)}`)
  for (const violation of violations.slice(0, 80)) console.error(`- ${violation}`)
  if (violations.length > 80) console.error(`... ${violations.length - 80} more`)
  process.exit(1)
}

console.log(JSON.stringify({
  status: 'passed',
  artifact: relative(root, artifactPath),
  strictPublicFilesScanned,
  redactedArtifactFilesScanned,
}, null, 2))
