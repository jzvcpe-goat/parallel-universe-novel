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
const required = process.env.CHECK_NARRATIVE_OKF_RELEASE_ARTIFACTS_REQUIRED === 'true'
const checkCurrentRun = process.env.CHECK_CURRENT_GITHUB_RUN_ARTIFACTS === 'true'
const source = process.env.CHECK_NARRATIVE_OKF_RELEASE_ARTIFACTS_SOURCE || (checkCurrentRun ? 'github' : 'local')

const artifactSpecs = [
  {
    name: 'narrative-okf-knowledge-layer',
    filePattern: /^narrative-okf-knowledge-layer-.*\.json$/,
    contract: 'P165_NARRATIVE_OKF_KNOWLEDGE_LAYER',
    validate: validateKnowledgeLayer,
  },
  {
    name: 'narrative-okf-runtime-consumption',
    filePattern: /^narrative-okf-runtime-consumption-.*\.json$/,
    contract: 'P166_NARRATIVE_OKF_RUNTIME_CONSUMPTION',
    validate: validateRuntimeConsumption,
  },
  {
    name: 'okf-runtime-image-context',
    filePattern: /^okf-runtime-image-context-.*\.json$/,
    contract: 'P167_OKF_RUNTIME_IMAGE_CONTEXT',
    validate: validateRuntimeImageContext,
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
    return 'source-workspace-no-git'
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
  const dir = mkdtempSync(join(tmpdir(), `p176-${spec.name}-`))
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
    /system prompt/i,
    /"body"\s*:/i,
    /"source_authority"\s*:/i,
    /"sourceAuthority"\s*:/i,
    /"sourceRefs"\s*:/i,
    /"source_refs"\s*:/i,
    /"representativeNames"\s*:/i,
    /"decryptedMappings"\s*:/i,
    /"workTitle"\s*:/i,
    /"authorName"\s*:/i,
    /"representativeWorkTitle"\s*:/i,
  ]
  const matches = forbidden.filter(pattern => pattern.test(text)).map(String)
  assert(matches.length === 0, `${label} leaked private/internal payload markers: ${matches.join(', ')}`)
}

function validateKnowledgeLayer(payload, label) {
  assert(payload.status === 'passed', `${label} must be passed`)
  assert(payload.gate === 'P165_NARRATIVE_OKF_KNOWLEDGE_LAYER', `${label} gate mismatch`)
  assert(Array.isArray(payload.checkedCards), `${label} must include checkedCards`)
  assert(payload.checkedCards.length === 7, `${label} must attest seven OKF cards`)
  assert(payload.runtimeTruth === 'docs/product/rules/genre-runtime-rules.v1.json', `${label} runtime truth mismatch`)
  for (const key of [
    'rewritesRuntimeRules',
    'exposesRepresentativeWorkNames',
    'changesPublicProjection',
    'changesCanonState',
    'deploysRemoteServices',
  ]) {
    assert(payload.boundary?.[key] === false, `${label} boundary ${key} must be false`)
  }
  scanNoPrivatePayload(payload, label)
}

function validateRuntimeConsumption(payload, label) {
  assert(payload.status === 'passed', `${label} must be passed`)
  assert(payload.gate === 'P166_NARRATIVE_OKF_RUNTIME_CONSUMPTION', `${label} gate mismatch`)
  assert(payload.checkedCardCount === 7, `${label} must attest seven OKF cards`)
  assert(payload.workflowCarriesInternalOkfKnowledge === true, `${label} must carry internal OKF knowledge`)
  assert(payload.publicProjectionHidesOkfKnowledge === true, `${label} public projection must hide OKF knowledge`)
  assert(payload.runtimeMetaExposesOnlySafeSummary === true, `${label} runtime meta must expose only safe summary`)
  assert(payload.boundary?.fastApiBusinessFactOwner === true, `${label} must preserve FastAPI sovereignty`)
  for (const key of [
    'rewritesRuntimeRules',
    'writesCanon',
    'exposesRepresentativeWorkNames',
    'exposesSourceAuthorityToPublicProjection',
    'deploysRemoteServices',
  ]) {
    assert(payload.boundary?.[key] === false, `${label} boundary ${key} must be false`)
  }
  scanNoPrivatePayload(payload, label)
}

function validateRuntimeImageContext(payload, label) {
  assert(payload.status === 'passed', `${label} must be passed`)
  assert(payload.gate === 'P167_OKF_RUNTIME_IMAGE_CONTEXT', `${label} gate mismatch`)
  for (const key of [
    'agentDockerfileCopiesOkfKnowledge',
    'runtimePreviewComposeRequiresOkfImageContext',
    'deployReadinessRequiresOkfImageContext',
    'remoteHostTargetRequiresOkfImageContext',
    'rootTestOrderSealed',
  ]) {
    assert(payload.checked?.[key] === true, `${label} check ${key} must be true`)
  }
  assert(payload.boundary?.copiesPublicSafeOkfCardsOnly === true, `${label} must copy public-safe OKF cards only`)
  for (const key of [
    'copiesEncryptedReferenceVaultKey',
    'exposesRepresentativeWorkNames',
    'changesRuntimeRuleTruth',
    'createsRemoteServices',
    'writesCanon',
  ]) {
    assert(payload.boundary?.[key] === false, `${label} boundary ${key} must be false`)
  }
  scanNoPrivatePayload(payload, label)
}

function writeAttestation(result) {
  mkdirSync(artifactDir, { recursive: true })
  const path = join(artifactDir, `narrative-okf-release-artifacts-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
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
        gate: 'P176_NARRATIVE_OKF_RELEASE_ARTIFACT_ATTESTATION',
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
        gate: 'P176_NARRATIVE_OKF_RELEASE_ARTIFACT_ATTESTATION',
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
    gate: 'P176_NARRATIVE_OKF_RELEASE_ARTIFACT_ATTESTATION',
    mode: source === 'github' ? 'github_current_run' : 'local',
    runId,
    runUrl,
    expectedHeadSha,
    artifacts: results,
    redaction: {
      cardBodiesIncluded: false,
      sourceAuthorityIncluded: false,
      representativeNamesIncluded: false,
      sourceRefMappingsIncluded: false,
      providerPayloadIncluded: false,
      promptTextIncluded: false,
    },
  })

  console.log(JSON.stringify({
    status: 'passed',
    gate: 'P176_NARRATIVE_OKF_RELEASE_ARTIFACT_ATTESTATION',
    mode: source === 'github' ? 'github_current_run' : 'local',
    runId,
    expectedHeadSha,
    artifacts: results,
    artifactPath: relative(root, artifactPath),
  }, null, 2))
} finally {
  for (const downloaded of downloads) downloaded.cleanup()
}
