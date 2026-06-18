#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts', 'runtime')
const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'
const required = process.env.CHECK_PUBLIC_PRIVACY_ARTIFACTS_REQUIRED === 'true'
const checkCurrentRun = process.env.CHECK_CURRENT_GITHUB_RUN_ARTIFACTS === 'true'
const source = process.env.CHECK_PUBLIC_PRIVACY_ARTIFACTS_SOURCE || (checkCurrentRun ? 'github' : 'local')

const artifactSpecs = [
  {
    name: 'reference-privacy',
    filePattern: /^reference-privacy-.*\.json$/,
    contract: 'P80_REFERENCE_PRIVACY_ARTIFACT_GATE',
    validate: validateReferencePrivacy,
  },
  {
    name: 'public-projection-privacy',
    filePattern: /^public-projection-privacy-.*\.json$/,
    contract: 'PUBLIC_PROJECTION_PRIVACY_AUDIT',
    validate: validatePublicProjectionPrivacy,
  },
]

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function run(cmd, args, options = {}) {
  return execFileSync(cmd, args, {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    timeout: options.timeout || 30000,
    env: process.env,
  })
}

function currentHead() {
  try {
    return run('git', ['rev-parse', 'HEAD']).trim()
  } catch {
    return ''
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function collectFiles(dir) {
  const files = []
  function walk(current) {
    const stat = statSync(current)
    if (stat.isFile()) {
      files.push(current)
      return
    }
    for (const child of readdirSync(current)) walk(join(current, child))
  }
  if (existsSync(dir)) walk(dir)
  return files
}

function latestLocalFiles(pattern) {
  if (!existsSync(artifactDir)) return []
  const candidates = readdirSync(artifactDir)
    .filter(name => pattern.test(name))
    .map(name => join(artifactDir, name))
    .sort()
  return candidates.length ? [candidates[candidates.length - 1]] : []
}

function githubRun(runId) {
  return JSON.parse(run('gh', ['api', `repos/${repo}/actions/runs/${runId}`]))
}

function downloadArtifact(runId, spec) {
  const dir = mkdtempSync(join(tmpdir(), `p92-${spec.name}-`))
  try {
    run('gh', ['run', 'download', String(runId), '--repo', repo, '--name', spec.name, '--dir', dir], {
      timeout: 60000,
    })
    const jsonFiles = collectFiles(dir).filter(file => spec.filePattern.test(file.split('/').pop() || '')).sort()
    assert(jsonFiles.length > 0, `expected at least one ${spec.name} JSON in GitHub artifact`)
    return {
      dir,
      files: jsonFiles,
      cleanup: () => rmSync(dir, { recursive: true, force: true }),
    }
  } catch (error) {
    rmSync(dir, { recursive: true, force: true })
    throw error
  }
}

function scanNoPrivatePayload(payload, label) {
  const text = JSON.stringify(payload)
  const forbidden = [
    /《[^》]+》/,
    /sk-[A-Za-z0-9_-]{10,}/,
    /DATABASE_URL=(?!<)/,
    /postgres(ql)?:\/\/[^<]/i,
    /BEGIN (RSA|OPENSSH|PRIVATE) KEY/,
    /reference-work-vault\.key/i,
    /raw provider request|provider prompt payload/i,
    /"violationDetailsIncluded"\s*:\s*true/i,
    /"(titles|authors|decryptedMappings|keyValues|representativeNames|sourceRefMappings|promptText|providerPayload|vaultMetadata)Included"\s*:\s*true/i,
    /"decryptedMappingsIncluded"\s*:\s*true/i,
    /"plaintextMappingsIncluded"\s*:\s*true/i,
    /"violations"\s*:\s*\[/i,
    /"violationDetails"\s*:\s*\[/i,
    /"workTitle"\s*:/i,
    /"authorName"\s*:/i,
    /"representativeWorkTitle"\s*:/i,
  ]
  const matches = forbidden.filter(pattern => pattern.test(text)).map(String)
  assert(matches.length === 0, `${label} leaked private payload markers: ${matches.join(', ')}`)
}

function validateReferencePrivacy(payload, label) {
  assert(payload.status === 'passed', `${label} must be passed`)
  assert(payload.artifactContract === 'P80_REFERENCE_PRIVACY_ARTIFACT_GATE', `${label} contract mismatch`)
  assert(payload.publicBoundary?.representativeWorks === 'encrypted_vault_only', `${label} representative work boundary mismatch`)
  assert(payload.publicBoundary?.publicReferenceField === 'sourceRefs', `${label} public reference field mismatch`)
  assert(Number(payload.publicBoundary?.publicRefCount || 0) > 0, `${label} public ref count must be positive`)
  for (const key of [
    'vaultShape',
    'publicRefsAnonymousOnly',
    'runtimeSourceRefsAnonymousOnly',
    'publicRuleTextNoTitleMarkers',
    'noCommittedVaultKey',
    'currentFilesAgainstVault',
    'gitHistoryPrivacy',
  ]) {
    assert(payload.checks?.[key] === true, `${label} check ${key} must be true`)
  }
  assert(payload.scanStats?.violationCount === 0, `${label} violation count must be 0`)
  assert(payload.scanStats?.currentFilesScanned > 0, `${label} must scan current files`)
  assert(payload.scanStats?.trackedTextFilesScanned > 0, `${label} must scan tracked text files`)
  assert(payload.redaction?.violationDetailsIncluded === false, `${label} must not include violation details`)
  assert(payload.redaction?.titlesIncluded === false, `${label} must not include titles`)
  assert(payload.redaction?.authorsIncluded === false, `${label} must not include authors`)
  assert(payload.redaction?.decryptedMappingsIncluded === false, `${label} must not include decrypted mappings`)
  assert(payload.redaction?.keyValuesIncluded === false, `${label} must not include key values`)
  scanNoPrivatePayload(payload, label)
}

function validatePublicProjectionPrivacy(payload, label) {
  assert(payload.status === 'passed', `${label} must be passed`)
  assert(payload.artifactContract === 'PUBLIC_PROJECTION_PRIVACY_AUDIT', `${label} contract mismatch`)
  assert(payload.boundary === 'Public Projection Boundary', `${label} boundary mismatch`)
  for (const key of [
    'matrixPresent',
    'frontendPreviewBuilt',
    'publicUiBoundaryScan',
    'referencePrivacyScan',
    'runtimeRuleSourceScan',
    'vaultAccessGate',
  ]) {
    assert(payload.checks?.[key] === true, `${label} check ${key} must be true`)
  }
  assert(payload.violationCount === 0, `${label} violation count must be 0`)
  assert(payload.scanStats?.strictPublicFilesScanned > 0, `${label} must scan strict public files`)
  assert(payload.scanStats?.redactedArtifactFilesScanned > 0, `${label} must scan redacted artifacts`)
  assert(payload.redaction?.violationDetailsIncluded === false, `${label} must not include violation details`)
  assert(payload.redaction?.representativeNamesIncluded === false, `${label} must not include representative names`)
  assert(payload.redaction?.sourceRefMappingsIncluded === false, `${label} must not include source ref mappings`)
  assert(payload.redaction?.promptTextIncluded === false, `${label} must not include prompt text`)
  assert(payload.redaction?.providerPayloadIncluded === false, `${label} must not include provider payloads`)
  assert(payload.redaction?.vaultMetadataIncluded === false, `${label} must not include vault metadata`)
  scanNoPrivatePayload(payload, label)
}

function writeAttestation(result) {
  mkdirSync(artifactDir, { recursive: true })
  const path = join(artifactDir, `public-privacy-artifact-attestation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`)
  return path
}

const downloads = []
try {
  let runId = null
  let runUrl = null
  let expectedHeadSha = source === 'github' ? '' : currentHead()
  const results = []

  if (source === 'github') {
    runId = String(process.env.GITHUB_RUN_ID || process.env.CHECK_GITHUB_ARTIFACTS_RUN_ID || '').trim()
    if (!runId) {
      if (required) throw new Error('GitHub artifact mode requires GITHUB_RUN_ID or CHECK_GITHUB_ARTIFACTS_RUN_ID')
      const artifactPath = writeAttestation({
        status: 'skipped',
        gate: 'P92_PUBLIC_PRIVACY_ARTIFACT_ATTESTATION',
        reason: 'missing_github_run_id',
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }
    const runInfo = githubRun(runId)
    expectedHeadSha = runInfo.head_sha
    runUrl = runInfo.html_url
  }

  for (const spec of artifactSpecs) {
    const files = source === 'github'
      ? (() => {
          const downloaded = downloadArtifact(runId, spec)
          downloads.push(downloaded)
          return downloaded.files
        })()
      : latestLocalFiles(spec.filePattern)

    if (!files.length) {
      if (required) throw new Error(`No ${spec.name} artifact JSON found`)
      const artifactPath = writeAttestation({
        status: 'skipped',
        gate: 'P92_PUBLIC_PRIVACY_ARTIFACT_ATTESTATION',
        reason: `missing_${spec.name}_artifact`,
        required,
      })
      console.log(JSON.stringify({ status: 'skipped', artifactPath: relative(root, artifactPath) }, null, 2))
      process.exit(0)
    }

    for (const file of files) {
      const payload = readJson(file)
      spec.validate(payload, `${spec.name}:${relative(root, file)}`)
    }

    results.push({
      artifact: spec.name,
      contract: spec.contract,
      fileCount: files.length,
    })
  }

  const artifactPath = writeAttestation({
    status: 'passed',
    gate: 'P92_PUBLIC_PRIVACY_ARTIFACT_ATTESTATION',
    mode: source === 'github' ? 'github_current_run' : 'local',
    runId,
    runUrl,
    expectedHeadSha,
    artifacts: results,
    redaction: {
      violationDetailsIncluded: false,
      representativeNamesIncluded: false,
      sourceRefMappingsIncluded: false,
      promptTextIncluded: false,
      providerPayloadIncluded: false,
      vaultMetadataIncluded: false,
    },
  })

  console.log(JSON.stringify({
    status: 'passed',
    gate: 'P92_PUBLIC_PRIVACY_ARTIFACT_ATTESTATION',
    mode: source === 'github' ? 'github_current_run' : 'local',
    runId,
    expectedHeadSha,
    artifacts: results,
    artifactPath: relative(root, artifactPath),
  }, null, 2))
} finally {
  for (const downloaded of downloads) downloaded.cleanup()
}
